#!/usr/bin/env bash
# ============================================================================
# WERA'S CATALOG PHOTOS — FROM THE OWNER'S FOLDERS INTO THE APP. Plan task `8o`.
#
#   bash docs/runbooks/catalog-photos.sh            # the local database (default)
#   bash docs/runbooks/catalog-photos.sh --linked   # the hosted project — the shop
#   bash docs/runbooks/catalog-photos.sh --linked ~/somewhere/else
#
# His ruling of 2026-10-18: *"I'll gather the photos myself and put them in a set
# of folders for you to grab them and scale them as needed for the app."* The
# folders are `~/RetailerToolDev/wera-fotos/<Giro>/<Pasillo>/<codigo>.<ext>`
# (`LEEME.md` there); the file's name is the product's `codigo`, which is
# `catalogo.product.code` and every shop's `template_code`.
#
# For each photo: the middle square, upright, 720 and 160 px, 70 % JPEG, NO
# METADATA (`catalog-photos.swift` — `sips` would carry where a photo was taken
# into a bucket every shop reads); then both files into the bucket `catalogo` at
# `<codigo>/<hash>/` with the service role; then `catalogo.product.image_path` set
# to `<codigo>/<hash>`, every row in one statement. Every shop that imported
# the product shows it on its next catalog read (`0063`'s `catalog_image_path`).
#
# ⚠️ THE HASH IS OF THE 720 FILE, so a photo he replaces gets a new path and no
# phone that kept the old one can show it under the new name; a photo already
# up under the same path is skipped. Run it as often as he adds photos.
# ⚠️ A FILE WHOSE NAME IS NOT A `codigo` IN THE CATALOG IS LISTED AND SKIPPED,
# never guessed at.
# ⚠️ `--linked` WRITES TO THE SHOP: Storage and `catalogo.product`. It is the
# owner's to run, or a session's with his word.
# ============================================================================
set -uo pipefail

TARGET=--local
if [[ "${1:-}" == "--linked" ]]; then TARGET=--linked; shift; fi
FOLDER="${1:-$HOME/RetailerToolDev/wera-fotos}"
[[ -d "$FOLDER" ]] || { echo "FAIL: no folder $FOLDER"; exit 1; }
[[ -r supabase/config.toml ]] || { echo "FAIL: run this from the repository root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "compiling the scaler…"
swiftc -O -o "$WORK/scale" docs/runbooks/catalog-photos.swift || { echo "FAIL: could not compile catalog-photos.swift"; exit 1; }

if [[ "$TARGET" == --local ]]; then
  STATUS="$(supabase status -o env 2>/dev/null)"
  API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
  SERVICE="$(sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
else
  REF="$(cat supabase/.temp/project-ref 2>/dev/null)"
  [[ -n "$REF" ]] || { echo "FAIL: no linked project (supabase/.temp/project-ref)"; exit 1; }
  API_URL="https://$REF.supabase.co"
  # ⚠️ READ INTO A VARIABLE AND NEVER PRINTED.
  SERVICE="$(supabase projects api-keys --project-ref "$REF" -o json 2>/dev/null \
    | python3 -I -c 'import json,sys;print(next(k["api_key"] for k in json.load(sys.stdin) if k.get("name")=="service_role"))' 2>/dev/null)"
fi
[[ -n "$API_URL" && -n "$SERVICE" ]] || { echo "FAIL: no API address or service key for $TARGET"; exit 1; }

query() { supabase db query "$TARGET" "$1" -o csv 2>/dev/null; }

# codigo|image_path for every product in the template.
query "select code || '|' || coalesce(image_path, '') as r from catalogo.product" | tail -n +2 > "$WORK/known"
[[ -s "$WORK/known" ]] || { echo "FAIL: could not read catalogo.product on $TARGET"; exit 1; }

up() { # object-path file -> HTTP status; 409 (already there) counts as up
  local code
  code="$(curl -s -o "$WORK/up.body" -w '%{http_code}' -X POST "$API_URL/storage/v1/object/catalogo/$1" \
    -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -H 'Content-Type: image/jpeg' \
    --data-binary @"$2")"
  if [[ "$code" == 400 ]] && grep -q '"statusCode":"409"' "$WORK/up.body"; then code=409; fi
  echo "$code"
}

: > "$WORK/updates.sql"
sent=0; same=0; unknown=0; failed=0
while IFS= read -r -d '' photo; do
  name="$(basename "$photo")"
  code="$(tr '[:upper:]' '[:lower:]' <<< "${name%.*}")"
  current="$(grep -m1 "^$code|" "$WORK/known" | cut -d'|' -f2)"
  if ! grep -q "^$code|" "$WORK/known"; then
    echo "  ?     $name — no product with codigo '$code' in the catalog; skipped"
    unknown=$((unknown+1)); continue
  fi
  out="$WORK/scaled/$code"
  sizes="$("$WORK/scale" "$photo" "$out" 2>&1)" || { echo "  FAIL  $name — $sizes"; failed=$((failed+1)); continue; }
  hash="$(shasum -a 256 "$out/720.jpg" | cut -c1-8)"
  path="$code/$hash"
  if [[ "$current" == "$path" ]]; then same=$((same+1)); continue; fi
  a="$(up "$path/720.jpg" "$out/720.jpg")"; b="$(up "$path/160.jpg" "$out/160.jpg")"
  if [[ "$a" =~ ^(200|409)$ && "$b" =~ ^(200|409)$ ]]; then
    echo "('$code', '$path')" >> "$WORK/updates.sql"
    read -r large thumb <<< "$sizes"
    echo "  ok    $code → $path ($((large / 1024)) KB, $((thumb / 1024)) KB)"
    sent=$((sent+1))
  else
    echo "  FAIL  $code — upload answered $a and $b: $(head -c 160 "$WORK/up.body")"
    failed=$((failed+1))
  fi
done < <(find "$FOLDER" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.heic' \) -print0 | sort -z)

if (( sent > 0 )); then
  # ⚠️ ONE STATEMENT, so every row lands or none does — and because the CLI
  # sends a file as ONE prepared statement and refuses two (measured locally).
  { echo "update catalogo.product p set image_path = v.path from (values"
    paste -sd, "$WORK/updates.sql"
    echo ") as v(code, path) where p.code = v.code"; } > "$WORK/apply.sql"
  if ! supabase db query "$TARGET" -f "$WORK/apply.sql" > /dev/null 2>"$WORK/apply.err"; then
    echo "FAIL: the photos are up but the catalog was not pointed at them — $(head -c 300 "$WORK/apply.err")"
    exit 1
  fi
  # ⚠️ READ BACK, not assumed.
  landed="$(query "select count(*) as n from catalogo.product where image_path is not null" | tail -1)"
  echo
  echo "catalogo.product now names $landed photo(s) on $TARGET."
fi
echo "$sent new, $same already up, $unknown not in the catalog, $failed failed."
(( failed == 0 ))

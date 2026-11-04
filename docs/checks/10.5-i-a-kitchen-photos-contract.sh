#!/usr/bin/env bash
# ============================================================================
# 10.5-i-a — ARE THE BUCKET `cocina`'S WALLS REAL, OVER A REAL STORAGE API AND
# A REAL POSTGREST?
#
# `0076` makes the bucket where a kitchen's cover, logo and dish photos live.
# The owner's ruling of 2026-11-01 sets its walls — written by the kitchen's
# owner and managers in her own folder, read by anyone signed in, never by
# anyone signed out — and `0076` keeps two promises of its own: only while the
# kitchen exists (Wera's aviso promises a deleted shop's photos leave
# everyone's reach at once), and pictures only. A policy's text is not its
# behaviour, so this drives Storage as each person would:
#
#    1. the bucket as Storage reports it: private, 2 MB a file, JPEG/PNG/WebP;
#    2. the owner puts both files of a picture into her folder (again: 409);
#    3. a manager puts one;
#    4. the cook may not;
#    5. everyone signed in reads it — the owner, the cook, a shop's owner, a
#       neighbour who belongs to nothing, another kitchen's owner — byte for byte;
#    6. nobody signed out reads it, by the private path or the public one;
#    7. a shop's owner puts none, in her shop's folder or the kitchen's;
#    8. a neighbour puts none, in a folder of her own or the kitchen's;
#    9. another kitchen's owner puts none in this kitchen's folder, and one in hers;
#   10. nothing is overwritten: an upsert and an update are refused, the bytes stay;
#   11. nothing is deleted: the owner's delete leaves the file as it was;
#   12. pictures only: a page is refused, and so is a file over 2 MB;
#   13. her page and her dish point at the picture, and never at another kitchen's;
#   14. ⚠️ another kitchen's owner deletes her account: her photo leaves the
#       neighbour's reach at once, and waits in the bucket for the hand that
#       deletes it within 30 days.
#
#   bash docs/checks/10.5-i-a-kitchen-photos-contract.sh
#
# ⚠️ NO APP NAMES THE BUCKET YET. Wera Cocina's page is `10.5-ii`, which moves the
# three names below into its own module and this check to reading them there,
# as `8o-photos-contract.sh` reads Wera's.
#
# ⚠️ TOKENS ARE SIGNED HERE WITH THE LOCAL JWT SECRET, as the auth server signs
# its own: six people a run, nine runs in the falsifier, and the job's other
# checks share the auth server's limit of 30 sign-ups and sign-ins per five
# minutes. Each person is made through the auth server's admin door, so each is
# a real row in `auth.users`; Storage's policies read the token's `sub` and role.
#
# ⚠️ THIS NEEDS STORAGE RUNNING — the CI job that runs it starts `storage-api`
# before the reset, or `0076` finds no `storage.buckets` and makes no bucket.
# ============================================================================
set -uo pipefail

BUCKET='cocina'
COVER_COLUMN='cover_path'
DISH_COLUMN='image_path'

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
ANON="$(sed -n 's/^ANON_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
SERVICE="$(sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
SECRET="$(sed -n 's/^JWT_SECRET="\(.*\)"$/\1/p' <<< "$STATUS")"
DB_URL="$(sed -n 's/^DB_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" || -z "$SERVICE" || -z "$SECRET" || -z "$ANON" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` and \`supabase db reset\` from the root."
  exit 1
fi
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

ask_db() { # sql -> its one value, as the database's owner
  if command -v psql > /dev/null; then
    psql "$DB_URL" -At -v ON_ERROR_STOP=1 -c "$1"
  else
    docker exec -i "$(docker ps --format '{{.Names}}' | grep -m1 '^supabase_db_')" \
      psql -U postgres -At -v ON_ERROR_STOP=1 -c "$1"
  fi
}

pick()  { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
uuid()   { python3 -c 'import uuid;print(uuid.uuid4())'; }

MINT='
import base64, hashlib, hmac, json, sys, time
b = lambda d: base64.urlsafe_b64encode(d).rstrip(b"=").decode()
now = int(time.time())
h = b(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
p = b(json.dumps({"sub": sys.argv[2], "role": "authenticated", "aud": "authenticated",
                  "iat": now, "exp": now + 3600}).encode())
print(h + "." + p + "." + b(hmac.new(sys.argv[1].encode(), (h + "." + p).encode(), hashlib.sha256).digest()))
'
PERSON_ID=""
person() { # email full-name -> sets PERSON_ID, and prints a token for that person
  local out
  out="$(curl -s -X POST "$API_URL/auth/v1/admin/users" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"fotos-cocina-123\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"$2\"}}")"
  PERSON_ID="$(pick id "$out")"
  [[ -n "$PERSON_ID" ]] || { echo "FAIL: the auth server would not make $1 — $out" >&2; return 1; }
}
token() { python3 -c "$MINT" "$SECRET" "$1"; }

api() { # method path body token -> body, then the HTTP status on the last line
  local auth="X-Empty: 1"
  [[ -n "${4:-}" ]] && auth="Authorization: Bearer $4"
  curl -s -w $'\n%{http_code}' -X "$1" "$API_URL$2" -H "apikey: $KEY" -H "$auth" \
    -H 'Content-Type: application/json' -d "$3"
}
put() { # object-path file token [content-type] [extra-header] [method] -> body, then the status
  curl -s -w $'\n%{http_code}' -X "${6:-POST}" "$API_URL/storage/v1/object/$BUCKET/$1" \
    -H "apikey: $KEY" -H "Authorization: Bearer $3" -H "Content-Type: ${4:-image/jpeg}" \
    -H "${5:-X-Empty: 1}" --data-binary @"$2"
}
reads() { # object-path token [file] -> the HTTP status of a signed-in read
  curl -s -o "${3:-/dev/null}" -w '%{http_code}' "$API_URL/storage/v1/object/authenticated/$BUCKET/$1" \
    -H "apikey: $KEY" -H "Authorization: Bearer $2"
}
refused() { # body+status -> true when Storage refused the write on a policy or a limit
  local s; s="$(status "$1")"
  [[ "$s" =~ ^4[0-9][0-9]$ ]] && [[ "$(body "$1")" == *"row-level security"* || "$(body "$1")" == *"Unauthorized"* ]]
}

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
printf '\xff\xd8\xff\xe0 10.5-i-a large \xff\xd9' > "$SCRATCH/720.jpg"
printf '\xff\xd8\xff\xe0 10.5-i-a thumb \xff\xd9' > "$SCRATCH/160.jpg"
printf '\xff\xd8\xff\xe0 10.5-i-a other \xff\xd9' > "$SCRATCH/otra.jpg"
printf '<!doctype html><title>no</title>' > "$SCRATCH/pagina.html"
python3 -c 'import sys;sys.stdout.buffer.write(b"\xff\xd8\xff\xe0" + b"\0" * (2 * 1024 * 1024 + 16))' > "$SCRATCH/grande.jpg"

# --- the people: a kitchen's owner, a manager, a cook; a shop's owner; a neighbour; another kitchen
STAMP="$$-$(date +%s)"
person "fonda-fotos-$STAMP@example.com" "Fonda Fotos"           || exit 1; FONDA_ID="$PERSON_ID";    FONDA="$(token "$PERSON_ID")"
person "gerente-fotos-$STAMP@example.com" "Gerente Fotos"       || exit 1; GERENTE_ID="$PERSON_ID";  GERENTE="$(token "$PERSON_ID")"
person "cocinera-fotos-$STAMP@example.com" "Cocinera Fotos"     || exit 1; COCINERA_ID="$PERSON_ID"; COCINERA="$(token "$PERSON_ID")"
person "tendera-fotos-$STAMP@example.com" "Tendera Fotos"       || exit 1; TENDERA="$(token "$PERSON_ID")"
person "vecina-fotos-$STAMP@example.com" "Vecina Fotos"         || exit 1; VECINA_ID="$PERSON_ID";   VECINA="$(token "$PERSON_ID")"
person "otra-fotos-$STAMP@example.com" "Otra Fotos"             || exit 1; OTRA="$(token "$PERSON_ID")"

KITCHEN_NAME="Fonda Contrato $STAMP"
OTHER_NAME="Fonda Otra Contrato $STAMP"
made() { # token body -> the business id
  local out; out="$(api POST /rest/v1/rpc/onboard_workspace "$2" "$1")"
  [[ "$(status "$out")" == "200" ]] || { echo "FAIL: could not make a business — $(body "$out")" >&2; return 1; }
  body "$out" | tr -d '"'
}
WS_C="$(made "$FONDA" "{\"p_display_name\":\"$KITCHEN_NAME\",\"p_kind\":\"cocina\"}")" || exit 1
WS_T="$(made "$TENDERA" '{"p_display_name":"Abarrotes Contrato Fotos"}')" || exit 1
WS_O="$(made "$OTRA" "{\"p_display_name\":\"$OTHER_NAME\",\"p_kind\":\"cocina\"}")" || exit 1
LOC_C="$(ask_db "select id from public.location where workspace_id = '$WS_C'")"
ask_db "insert into public.workspace_member (workspace_id, user_id, role, display_name) values
          ('$WS_C', '$GERENTE_ID', 'manager', 'Gerente Fotos'), ('$WS_C', '$COCINERA_ID', 'staff', 'Cocinera Fotos')" > /dev/null
ask_db "insert into public.member_location (workspace_id, member_id, location_id)
          select '$WS_C', id, '$LOC_C' from public.workspace_member where workspace_id = '$WS_C' and user_id = '$COCINERA_ID'" > /dev/null
[[ -n "$WS_C" && -n "$WS_T" && -n "$WS_O" && -n "$LOC_C" ]] || { echo "FAIL: could not build the fixture"; exit 1; }

# --- 1. the bucket, as Storage reports it --------------------------------------------
note
B="$(curl -s "$API_URL/storage/v1/bucket/$BUCKET" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE")"
B_SHAPE="$(python3 -c '
import sys, json
d = json.load(sys.stdin)
print(d.get("public"), d.get("file_size_limit"), ",".join(sorted(d.get("allowed_mime_types") or [])))' <<< "$B" 2>/dev/null)"
if [[ "$B_SHAPE" == "False 2097152 image/jpeg,image/png,image/webp" ]]; then
  ok "the bucket $BUCKET is private, takes 2 MB a file, and JPEG, PNG or WebP alone"
else
  fail "the bucket $BUCKET reads '$B_SHAPE' — expected 'False 2097152 image/jpeg,image/png,image/webp' ($(head -c 200 <<< "$B"))"
  echo '      "Bucket not found" is Storage not started before the reset, or 0076 not applied.'
fi

# --- 2. the owner puts both files of a picture into her kitchen's folder -------------
PIC="$WS_C/$(uuid)"
note
UP_L="$(put "$PIC/720.jpg" "$SCRATCH/720.jpg" "$FONDA")"
UP_T="$(put "$PIC/160.jpg" "$SCRATCH/160.jpg" "$FONDA")"
DUP="$(put "$PIC/160.jpg" "$SCRATCH/160.jpg" "$FONDA")"
if [[ "$(status "$UP_L")" == "200" && "$(status "$UP_T")" == "200" && "$(pick statusCode "$(body "$DUP")")" == "409" ]]; then
  ok "the owner puts 720.jpg and 160.jpg into $BUCKET under her kitchen; the same file again is a 409"
else
  fail "the owner's upload answered $(status "$UP_L") $(body "$UP_L" | head -c 200); the small one $(status "$UP_T"); again $(body "$DUP" | head -c 120)"
  echo '      A 403 is the fence refusing a kitchen its own folder.'
fi

# --- 3. a manager puts one -------------------------------------------------------------
note
MGR_PIC="$WS_C/$(uuid)"
UP_M="$(put "$MGR_PIC/720.jpg" "$SCRATCH/720.jpg" "$GERENTE")"
if [[ "$(status "$UP_M")" == "200" ]]; then
  ok "a manager of the kitchen puts one into its folder"
else
  fail "the manager's upload answered $(status "$UP_M") $(body "$UP_M" | head -c 200) — the ruling gives the owner and managers the folder"
fi

# --- 4. the cook may not ---------------------------------------------------------------
note
UP_S="$(put "$WS_C/$(uuid)/720.jpg" "$SCRATCH/720.jpg" "$COCINERA")"
if refused "$UP_S"; then
  ok "the cook may not put one there ($(status "$UP_S"), row-level security)"
else
  fail "the cook's upload answered $(status "$UP_S") $(body "$UP_S" | head -c 160) — only the owner and managers write"
fi

# --- 5. everyone signed in reads it, byte for byte ------------------------------------
note
R_FONDA="$(reads "$PIC/720.jpg" "$FONDA")"
R_COCINERA="$(reads "$PIC/160.jpg" "$COCINERA")"
R_TENDERA="$(reads "$PIC/720.jpg" "$TENDERA")"
R_VECINA="$(reads "$PIC/720.jpg" "$VECINA" "$SCRATCH/vecina.jpg")"
R_OTRA="$(reads "$PIC/160.jpg" "$OTRA")"
if [[ "$R_FONDA $R_COCINERA $R_TENDERA $R_VECINA $R_OTRA" == "200 200 200 200 200" ]] && cmp -s "$SCRATCH/vecina.jpg" "$SCRATCH/720.jpg"; then
  ok "the owner, the cook, a shop's owner, a neighbour and another kitchen's owner read it — the neighbour's copy byte for byte"
else
  fail "the reads answered owner $R_FONDA, cook $R_COCINERA, shop $R_TENDERA, neighbour $R_VECINA, other kitchen $R_OTRA (or the neighbour's bytes differ)"
fi

# --- 6. nobody signed out reads it -----------------------------------------------------
note
S_NONE="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/storage/v1/object/authenticated/$BUCKET/$PIC/720.jpg" -H "apikey: $KEY")"
S_ANON="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/storage/v1/object/authenticated/$BUCKET/$PIC/720.jpg" -H "apikey: $KEY" -H "Authorization: Bearer $ANON")"
S_PUBLIC="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/storage/v1/object/public/$BUCKET/$PIC/720.jpg")"
if [[ "$S_NONE" =~ ^(400|401|403|404)$ && "$S_ANON" =~ ^(400|401|403|404)$ && "$S_PUBLIC" =~ ^(400|401|403|404)$ ]]; then
  ok "nobody signed out reads it — no token $S_NONE, the anon key $S_ANON, the public path $S_PUBLIC"
else
  fail "a signed-out read answered: no token $S_NONE, the anon key $S_ANON, the public path $S_PUBLIC — the ruling: never by anyone signed out"
fi

# --- 7. a shop's owner puts none ---------------------------------------------------------
note
T_OWN="$(put "$WS_T/$(uuid)/720.jpg" "$SCRATCH/720.jpg" "$TENDERA")"
T_KIT="$(put "$WS_C/$(uuid)/720.jpg" "$SCRATCH/720.jpg" "$TENDERA")"
if refused "$T_OWN" && refused "$T_KIT"; then
  ok "a shop's owner puts none — not in her shop's folder ($(status "$T_OWN")), not in the kitchen's ($(status "$T_KIT"))"
else
  fail "a shop's owner's upload answered $(status "$T_OWN") into her shop's folder, $(status "$T_KIT") into the kitchen's — the folder must be a kitchen's, and hers"
fi

# --- 8. a neighbour puts none --------------------------------------------------------------
note
V_OWN="$(put "$VECINA_ID/$(uuid)/720.jpg" "$SCRATCH/720.jpg" "$VECINA")"
V_KIT="$(put "$WS_C/$(uuid)/720.jpg" "$SCRATCH/720.jpg" "$VECINA")"
if refused "$V_OWN" && refused "$V_KIT"; then
  ok "a neighbour puts none — not in a folder of her own ($(status "$V_OWN")), not in the kitchen's ($(status "$V_KIT"))"
else
  fail "a neighbour's upload answered $(status "$V_OWN") into her own folder, $(status "$V_KIT") into the kitchen's"
fi

# --- 9. another kitchen's owner: not in this kitchen's folder, and in hers ----------------
note
OTHER_PIC="$WS_O/$(uuid)"
O_KIT="$(put "$WS_C/$(uuid)/720.jpg" "$SCRATCH/otra.jpg" "$OTRA")"
O_OWN="$(put "$OTHER_PIC/720.jpg" "$SCRATCH/otra.jpg" "$OTRA")"
if refused "$O_KIT" && [[ "$(status "$O_OWN")" == "200" ]]; then
  ok "another kitchen's owner puts none in this kitchen's folder ($(status "$O_KIT")), and one in her own"
else
  fail "another kitchen's owner answered $(status "$O_KIT") into this kitchen's folder and $(status "$O_OWN") into hers $(body "$O_OWN" | head -c 120)"
fi

# --- 10. nothing is overwritten -----------------------------------------------------------
note
UPSERT="$(put "$PIC/720.jpg" "$SCRATCH/otra.jpg" "$FONDA" image/jpeg 'x-upsert: true')"
UPDATE="$(put "$PIC/720.jpg" "$SCRATCH/otra.jpg" "$FONDA" image/jpeg 'X-Empty: 1' PUT)"
AFTER="$(reads "$PIC/720.jpg" "$FONDA" "$SCRATCH/after.jpg")"
if [[ ! "$(status "$UPSERT")" =~ ^2 && ! "$(status "$UPDATE")" =~ ^2 && "$AFTER" == "200" ]] && cmp -s "$SCRATCH/after.jpg" "$SCRATCH/720.jpg"; then
  ok "nothing is overwritten — her upsert ($(status "$UPSERT")) and update ($(status "$UPDATE")) refused, the bytes as they were"
else
  fail "an overwrite answered upsert $(status "$UPSERT"), update $(status "$UPDATE"); the read after $AFTER (or its bytes changed) — a new photo is a new path"
fi

# --- 11. nothing is deleted -----------------------------------------------------------------
note
DEL_ONE="$(curl -s -w $'\n%{http_code}' -X DELETE "$API_URL/storage/v1/object/$BUCKET/$PIC/160.jpg" \
  -H "apikey: $KEY" -H "Authorization: Bearer $FONDA")"
DEL_MANY="$(curl -s -w $'\n%{http_code}' -X DELETE "$API_URL/storage/v1/object/$BUCKET" \
  -H "apikey: $KEY" -H "Authorization: Bearer $FONDA" -H 'Content-Type: application/json' \
  -d "{\"prefixes\":[\"$PIC/160.jpg\",\"$PIC/720.jpg\"]}")"
STILL_T="$(reads "$PIC/160.jpg" "$FONDA" "$SCRATCH/still.jpg")"
STILL_L="$(reads "$PIC/720.jpg" "$VECINA")"
if [[ "$STILL_T" == "200" && "$STILL_L" == "200" ]] && cmp -s "$SCRATCH/still.jpg" "$SCRATCH/160.jpg"; then
  ok "nothing is deleted — after her two deletes ($(status "$DEL_ONE"), $(status "$DEL_MANY") $(body "$DEL_MANY" | head -c 40)) both files still read"
else
  fail "after her deletes ($(status "$DEL_ONE") $(body "$DEL_ONE" | head -c 80); $(status "$DEL_MANY") $(body "$DEL_MANY" | head -c 80)) the files read $STILL_T and $STILL_L"
fi

# --- 12. pictures only -------------------------------------------------------------------------
note
HTML_PATH="$WS_C/$(uuid)/index.html"
BIG_PATH="$WS_C/$(uuid)/720.jpg"
HTML="$(put "$HTML_PATH" "$SCRATCH/pagina.html" "$FONDA" text/html)"
BIG="$(put "$BIG_PATH" "$SCRATCH/grande.jpg" "$FONDA")"
HTML_READ="$(reads "$HTML_PATH" "$FONDA")"
BIG_READ="$(reads "$BIG_PATH" "$FONDA")"
if [[ "$(status "$HTML")" =~ ^4 && "$(status "$BIG")" =~ ^4 && "$HTML_READ" =~ ^(400|404)$ && "$BIG_READ" =~ ^(400|404)$ ]]; then
  ok "pictures only — a page is refused ($(status "$HTML")), and so is a file over 2 MB ($(status "$BIG")); neither is stored"
else
  fail "a page answered $(status "$HTML") $(body "$HTML" | head -c 120) (read $HTML_READ); a 2 MB file $(status "$BIG") $(body "$BIG" | head -c 120) (read $BIG_READ)"
fi

# --- 13. her page and her dish point at the picture, and never at another kitchen's -----------
note
PAGE="$(api POST /rest/v1/rpc/set_kitchen_page \
  "{\"p_workspace_id\":\"$WS_C\",\"p_page\":{\"$COVER_COLUMN\":\"$PIC\",\"color\":\"nopal\"}}" "$FONDA")"
WRONG="$(api POST /rest/v1/rpc/set_kitchen_page \
  "{\"p_workspace_id\":\"$WS_C\",\"p_page\":{\"$COVER_COLUMN\":\"$OTHER_PIC\"}}" "$GERENTE")"
LISTING="$(uuid)"
DISH="$(api POST /rest/v1/rpc/publish_listing "$(python3 -c '
import json, sys
from datetime import datetime, timedelta, timezone
now = datetime.now(timezone.utc)
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2],
                  "p_pickup_start": (now + timedelta(hours=1)).isoformat(),
                  "p_pickup_end": (now + timedelta(hours=3)).isoformat(),
                  "p_lines": [{"name": "Comida corrida", "unit_price": "65.00", "quantity": 4,
                               sys.argv[4]: sys.argv[3]}]}))' \
  "$LISTING" "$LOC_C" "$MGR_PIC" "$DISH_COLUMN")" "$GERENTE")"
DISH_HELD="$(ask_db "select $DISH_COLUMN from public.listing_line where listing_id = '$LISTING'")"
if [[ "$(status "$PAGE")" == "200" && "$(pick "$COVER_COLUMN" "$(body "$PAGE")")" == "$PIC" \
      && "$(status "$WRONG")" == "400" && "$(pick code "$(body "$WRONG")")" == "22023" \
      && "$(status "$DISH")" == "200" && "$DISH_HELD" == "$MGR_PIC" ]]; then
  ok "her page's cover and a dish point at pictures in her folder; another kitchen's picture is 400 22023"
else
  fail "the page answered $(status "$PAGE") $(body "$PAGE" | head -c 160); another kitchen's picture $(status "$WRONG") $(body "$WRONG" | head -c 120); the dish $(status "$DISH") $(body "$DISH" | head -c 160), holding '$DISH_HELD'"
fi

# --- 14. ⚠️ gone with her kitchen: out of everyone's reach at once ------------------------------
note
BEFORE="$(reads "$OTHER_PIC/720.jpg" "$VECINA")"
GONE="$(api POST /rest/v1/rpc/delete_my_account "{\"p_business_names\":[\"$OTHER_NAME\"]}" "$OTRA")"
AFTER_GONE="$(reads "$OTHER_PIC/720.jpg" "$VECINA")"
KEPT="$(ask_db "select count(*) from storage.objects where bucket_id = '$BUCKET' and name like '$WS_O/%'")"
if [[ "$BEFORE" == "200" && "$(status "$GONE")" == "200" && "$AFTER_GONE" =~ ^(400|404)$ && "$KEPT" == "1" ]]; then
  ok "another kitchen's owner deletes her account: the neighbour read her photo ($BEFORE), and at once cannot ($AFTER_GONE); the file waits for the hand that deletes it"
else
  fail "her photo read $BEFORE before, the deletion answered $(status "$GONE") $(body "$GONE" | head -c 120), the neighbour's read after $AFTER_GONE, files kept $KEPT"
  echo '      A 200 after the deletion is a read wall that asks for an account and not for a kitchen that exists.'
fi

echo
if (( fails == 0 && ran < 14 )); then
  echo "FAIL: only $ran assertion groups ran, expected 14 — this check asserted almost nothing."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — the bucket $BUCKET holds 0076's walls over the real APIs:"
  echo "a kitchen's owner and managers write in her folder, anyone signed in reads while the"
  echo "kitchen exists, nobody signed out, pictures only, and nothing overwritten or deleted."
  exit 0
fi
echo "$ran group(s) ran, $fails failed."
exit 1

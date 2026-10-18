#!/usr/bin/env bash
# ============================================================================
# 8o — CAN `8o-photos-contract.sh` STILL FAIL? Each fixture breaks ONE thing and
# the check must go red FOR THAT REASON (the output is matched, not the exit
# code). Four break a name the app declares, in a COPY of its module — never the
# working tree ([[falsifier-must-not-mutate-what-the-check-reads]]); two break a
# policy of `0063`'s, read back out of `pg_policies` and restored in a `trap`.
#
#   bash docs/checks/8o-photos-contract-falsify.sh
# ============================================================================
set -uo pipefail

CHECK="docs/checks/8o-photos-contract.sh"
PHOTOS="app/src/api/photos.ts"
CATALOG="app/src/api/catalog.ts"
[[ -r "$CHECK" && -r "$PHOTOS" && -r "$CATALOG" ]] || { echo "FAIL: run this from the repository root"; exit 1; }
SCRATCH="$(mktemp -d)"

DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep -m1 '^supabase_db_')"
ask() { docker exec -i "$DB_CONTAINER" psql -U postgres -At -v ON_ERROR_STOP=1 -c "$1" 2>&1 | tr -d '\r'; }

policy() { # name -> "using" text of that storage policy
  ask "select coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') from pg_policy pol join pg_class c on c.oid = pol.polrelid where c.relname = 'objects' and pol.polname = '$1';"
}
CATALOGO_USING="$(policy catalogo_select)"
PRODUCTO_USING="$(policy producto_select)"
if [[ "$CATALOGO_USING" != *catalogo* || "$PRODUCTO_USING" != *photo_folder_ok* ]]; then
  echo "FAIL: could not read 0063's two read policies out of the applied catalog —"
  echo "      catalogo_select: '${CATALOGO_USING:0:80}', producto_select: '${PRODUCTO_USING:0:80}'."
  echo "      Is Storage running, and was it running before the reset?"
  exit 1
fi

restore() {
  ask "drop policy if exists catalogo_select on storage.objects;" > /dev/null
  ask "create policy catalogo_select on storage.objects for select to authenticated using ($CATALOGO_USING);" > /dev/null
  ask "drop policy if exists producto_select on storage.objects;" > /dev/null
  ask "create policy producto_select on storage.objects for select to authenticated using ($PRODUCTO_USING);" > /dev/null
  local back
  back="$(ask "select count(*) from pg_policy where polname in ('catalogo_select', 'producto_select');")"
  if [[ "$back" != "2" ]]; then
    echo "FAIL: THE RESTORE DID NOT PUT BOTH READ POLICIES BACK (found $back). Stopping."
    exit 1
  fi
}
trap 'restore; rm -rf "$SCRATCH"' EXIT INT TERM

passed=0
failed=0

run() { # name expected-reason-regex [photos] [catalog]
  local name="$1" reason="$2" out rc
  out="$(bash "$CHECK" "${3:-$PHOTOS}" "${4:-$CATALOG}" 2>&1)"; rc=$?
  if (( rc != 0 )) && grep -Eq "$reason" <<< "$out"; then
    echo "  ok    $name — red, for the reason"; passed=$((passed+1))
  else
    echo "FAIL: $name — rc=$rc, and the output did not match /$reason/:"
    grep -E '^FAIL' <<< "$out" | head -3
    failed=$((failed+1))
  fi
}

mutate() { # name source sed-expression -> path of the copy
  local copy="$SCRATCH/$1-$(basename "$2")"
  sed "$3" "$2" > "$copy"
  if cmp -s "$copy" "$2"; then echo "BROKEN FIXTURE $1: the mutation changed nothing" >&2; fi
  echo "$copy"
}

# The control: the tree as it is.
out="$(bash "$CHECK" 2>&1)"
if [[ $? -eq 0 ]]; then echo "  ok    control — green on the tree as it is"; passed=$((passed+1))
else echo "FAIL: control — the check is red on the tree as it is"; grep -E '^FAIL' <<< "$out" | head -3; failed=$((failed+1)); fi

# The shop's bucket misnamed: every upload of a product photo is a 400 *Bucket not found*.
run shop-bucket 'the photo upload answered 400' \
  "$(mutate shop-bucket "$PHOTOS" "s/^export const SHOP_PHOTO_BUCKET = 'producto';/export const SHOP_PHOTO_BUCKET = 'productos';/")"

# Wera's bucket misnamed: the phone asks for every catalog photo where there is none.
run catalog-bucket "Wera's upload answered 400" \
  "$(mutate catalog-bucket "$PHOTOS" "s/^export const CATALOG_PHOTO_BUCKET = 'catalogo';/export const CATALOG_PHOTO_BUCKET = 'catalog';/")"

# The shop's column misnamed in the patch AND the read: PostgREST answers 400 42703.
run image-column 'pointing her product at the photo answered 400' \
  "$(mutate image-column "$PHOTOS" "s/^export const IMAGE_PATH_COLUMN = 'image_path';/export const IMAGE_PATH_COLUMN = 'photo_path';/")" \
  "$(mutate image-column "$CATALOG" "s/,image_path,catalog_image_path';/,photo_path,catalog_image_path';/")"

# Wera's column dropped from the catalog read: every imported product wears initials for ever.
run read-drops-wera 'does not ask for catalog_image_path' \
  "$PHOTOS" "$(mutate read-drops-wera "$CATALOG" "s/,image_path,catalog_image_path';/,image_path';/")"

# ⚠️ `0063`'s read on Wera's bucket dropped — the edit somebody makes to "tighten"
# a bucket every shop reads. No screen goes red: the photos just never arrive.
ask "drop policy if exists catalogo_select on storage.objects;" > /dev/null
run no-catalog-read 'the shop.s read of Wera.s photo answered 4'
restore

# ⚠️ The shop's photos opened to every signed-in person — `photo_folder_ok`
# dropped from the read. Every screen still works; the next shop reads them.
ask "drop policy if exists producto_select on storage.objects;" > /dev/null
ask "create policy producto_select on storage.objects for select to authenticated using (bucket_id = 'producto');" > /dev/null
run shop-read-open 'another shop read 200'
restore

echo
if (( failed == 0 && passed == 7 )); then
  echo "all 7 fixtures behaved as recorded — the contract check goes red on every defect it names."
  exit 0
fi
echo "$failed of $((passed + failed)) fixtures misbehaved."
exit 1

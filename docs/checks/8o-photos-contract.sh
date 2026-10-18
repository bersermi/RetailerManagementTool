#!/usr/bin/env bash
# ============================================================================
# 8o — DO THE APP'S PRODUCT PHOTOS REACH `0063` OVER A REAL POSTGREST AND A
# REAL STORAGE API?
#
# `app/src/api/photos.ts` names the two buckets, the shop's own column and
# Wera's computed one; `app/src/api/catalog.ts` asks for both in the catalog
# read. A typecheck has never read a migration, and a misnamed bucket is a 400
# *Bucket not found* that the phone turns into a product with initials for
# ever — which looks exactly like a product nobody photographed. So this check
# reads the names OUT OF THE APP and drives them the way a phone would:
#
#   * the owner puts both files of a photo into `producto` under her shop's
#     folder (a second time: 409, which the app's retry takes as done), points
#     her own product at it, and reads it back in the catalog read and from
#     Storage;
#   * a cashier of the shop reads it and may not put one there (RLS);
#   * another shop may do neither — and a path into that shop's folder is
#     refused by the row itself (23514);
#   * Wera puts a photo into `catalogo` (the service role), the template row
#     names it, and the shop's imported copy carries it as `catalog_image_path`;
#     every signed-in person reads it, and nobody but Wera writes there;
#   * and the lock: giving Wera's product a photo of the shop's is 400 23001.
#
#   bash docs/checks/8o-photos-contract.sh [photos.ts] [catalog.ts]
#
# ⚠️ THIS NEEDS STORAGE RUNNING — the CI job that runs it starts `storage-api`
# before the reset, or `0063` finds no `storage.buckets` and skips both buckets.
# ============================================================================
set -uo pipefail

PHOTOS="${1:-app/src/api/photos.ts}"
CATALOG="${2:-app/src/api/catalog.ts}"
[[ -r "$PHOTOS" && -r "$CATALOG" ]] || { echo "FAIL: cannot read $PHOTOS or $CATALOG"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }

CATALOG_BUCKET="$(str CATALOG_PHOTO_BUCKET "$PHOTOS")"
SHOP_BUCKET="$(str SHOP_PHOTO_BUCKET "$PHOTOS")"
IMAGE_COLUMN="$(str IMAGE_PATH_COLUMN "$PHOTOS")"
CATALOG_COLUMN="$(str CATALOG_IMAGE_COLUMN "$PHOTOS")"
PHOTO_TYPE="$(str PRODUCT_PHOTO_TYPE "$PHOTOS")"
VARIANT_COLUMNS="$(str VARIANT_COLUMNS "$CATALOG")"

note
for name in CATALOG_BUCKET SHOP_BUCKET IMAGE_COLUMN CATALOG_COLUMN PHOTO_TYPE VARIANT_COLUMNS; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app — this check would assert nothing"
    exit 1
  fi
done
for column in "$IMAGE_COLUMN" "$CATALOG_COLUMN"; do
  case ",$VARIANT_COLUMNS," in
    *",$column,"*) ;;
    *) fail "the catalog read ($VARIANT_COLUMNS) does not ask for $column — no row would ever carry that picture"; exit 1 ;;
  esac
done
ok "read from the app: buckets $SHOP_BUCKET and $CATALOG_BUCKET; the read asks for $IMAGE_COLUMN and $CATALOG_COLUMN"

STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
SERVICE="$(sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
DB_URL="$(sed -n 's/^DB_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" || -z "$SERVICE" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` and \`supabase db reset\` from the root."
  exit 1
fi
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

TOKEN=""
api() { # method path body [extra-header] -> body, then the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" extra="${4:-X-Empty: 1}" auth="X-Empty: 1"
  [[ -n "$TOKEN" ]] && auth="Authorization: Bearer $TOKEN"
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth" \
      -H "$extra" -H 'Content-Type: application/json' -d "$body"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth" -H "$extra"
  fi
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
first()  { python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0].get('$1','') if isinstance(r,list) and r else '')" <<< "$2" 2>/dev/null; }
count()  { python3 -c "import sys,json;r=json.load(sys.stdin);print(len(r) if isinstance(r,list) else -1)" <<< "$1" 2>/dev/null; }

as_owner_of_db() { # sql -> runs it as the database owner
  if command -v psql > /dev/null; then
    psql "$DB_URL" -q -v ON_ERROR_STOP=1 -c "$1" > /dev/null
  else
    docker exec -i "$(docker ps --format '{{.Names}}' | grep -m1 '^supabase_db_')" \
      psql -U postgres -q -v ON_ERROR_STOP=1 -c "$1" > /dev/null
  fi
}

PASSWORD="photos-8o-123"
signup() { # email full-name -> sets TOKEN, USER_ID
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup \
      "{\"email\":\"$1\",\"password\":\"$PASSWORD\",\"data\":{\"full_name\":\"$2\"}}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    USER_ID="$(python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('id',''))" <<< "$(body "$out")" 2>/dev/null)"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  echo "      GoTrue rate-limits signup and answers with an EMPTY BODY when it does."
  exit 1
}
uuid() { python3 -c 'import uuid;print(uuid.uuid4())'; }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
printf '\xff\xd8\xff\xe0 8o large \xff\xd9' > "$SCRATCH/720.jpg"
printf '\xff\xd8\xff\xe0 8o thumb \xff\xd9' > "$SCRATCH/160.jpg"

put() { # bucket object-path file [token] -> body, then the HTTP status on the last line
  curl -s -w $'\n%{http_code}' -X POST "$API_URL/storage/v1/object/$1/$2" \
    -H "apikey: ${5:-$KEY}" -H "Authorization: Bearer ${4:-$TOKEN}" -H "Content-Type: $PHOTO_TYPE" \
    --data-binary @"$3"
}
get() { # bucket object-path -> the HTTP status
  curl -s -o /dev/null -w '%{http_code}' "$API_URL/storage/v1/object/authenticated/$1/$2" \
    -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN"
}

# --- the shop, its own product, and the cashier ------------------------------
STAMP="$$-$(date +%s)"
signup "fotos-cajera-$STAMP@example.com" "Cajera Fotos"
STAFF_TOKEN="$TOKEN"; STAFF_ID="$USER_ID"
signup "fotos-$STAMP@example.com" "Dueña Fotos"
OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  "{\"p_display_name\":\"Abarrotes Contrato 8o\",\"p_prices_include_tax\":true,\"p_location_name\":null}")"
WS="$(body "$CREATED" | tr -d '"')"
[[ -n "$WS" && "$(status "$CREATED")" == "200" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }
as_owner_of_db "insert into public.workspace_member (workspace_id, user_id, role, display_name) values ('$WS', '$STAFF_ID', 'staff', 'Cajera Fotos')"

FAM_BODY="$(python3 -c 'import json,sys;print(json.dumps({"workspace_id":sys.argv[1],"name":"Antojitos 8o"}))' "$WS")"
FAM="$(first id "$(body "$(api POST '/rest/v1/product_family?select=id' "$FAM_BODY" 'Prefer: return=representation')")")"
VAR_BODY="$(python3 -c '
import json,sys
print(json.dumps({"workspace_id":sys.argv[1],"family_id":sys.argv[2],"name":"Tamal de rajas 8o",
  "base_unit_code":"pza","purchase_unit_code":"pza","sell_unit_code":"pza","price_unit_code":"pza"}))' "$WS" "$FAM")"
MINE="$(first id "$(body "$(api POST '/rest/v1/product_variant?select=id' "$VAR_BODY" 'Prefer: return=representation')")")"
[[ -n "$FAM" && -n "$MINE" ]] || { echo "FAIL: could not build the fixture (fam=$FAM var=$MINE)"; exit 1; }

# --- 1. the owner's photo goes up, both files --------------------------------
PATH_MINE="$WS/$(uuid)"
note
UP_L="$(put "$SHOP_BUCKET" "$PATH_MINE/720.jpg" "$SCRATCH/720.jpg")"
UP_T="$(put "$SHOP_BUCKET" "$PATH_MINE/160.jpg" "$SCRATCH/160.jpg")"
DUP="$(put "$SHOP_BUCKET" "$PATH_MINE/160.jpg" "$SCRATCH/160.jpg")"
if [[ "$(status "$UP_L")" == "200" && "$(status "$UP_T")" == "200" && "$(pick statusCode "$(body "$DUP")")" == "409" ]]; then
  ok "the owner puts 720.jpg and 160.jpg into $SHOP_BUCKET under her shop; the same file again is a 409 duplicate"
else
  fail "the photo upload answered $(status "$UP_L") $(body "$UP_L" | head -c 200); the small one $(status "$UP_T"); again $(body "$DUP" | head -c 120)"
  echo '      A 400 "Bucket not found" is a bucket the app misnames, or Storage not started;'
  echo '      a 403 is the fence refusing the shop its own folder.'
fi

# --- 2. her product carries it, and the catalog read brings it back ----------
note
PATCHED="$(api PATCH "/rest/v1/product_variant?id=eq.$MINE&select=$VARIANT_COLUMNS" \
  "{\"$IMAGE_COLUMN\":\"$PATH_MINE\"}" 'Prefer: return=representation')"
READ="$(api GET "/rest/v1/product_variant?select=$VARIANT_COLUMNS&id=eq.$MINE")"
if [[ "$(status "$PATCHED")" == "200" && "$(count "$(body "$PATCHED")")" == "1" \
      && "$(status "$READ")" == "200" && "$(first "$IMAGE_COLUMN" "$(body "$READ")")" == "$PATH_MINE" \
      && "$(first "$CATALOG_COLUMN" "$(body "$READ")")" == "None" ]]; then
  ok "her own product carries the photo ($IMAGE_COLUMN), and the catalog read brings it back with no $CATALOG_COLUMN"
else
  fail "pointing her product at the photo answered $(status "$PATCHED") $(body "$PATCHED" | head -c 200); the read $(status "$READ") $(body "$READ" | head -c 300)"
fi

# --- 3. a path into another shop's folder is refused by the row ---------------
note
ELSEWHERE="$(api PATCH "/rest/v1/product_variant?id=eq.$MINE&select=id" \
  "{\"$IMAGE_COLUMN\":\"$(uuid)/$(uuid)\"}")"
if [[ "$(status "$ELSEWHERE")" == "400" && "$(pick code "$(body "$ELSEWHERE")")" == "23514" ]]; then
  ok "a path whose first folder is not her shop is refused by the row — 400 23514"
else
  fail "a path into another folder answered $(status "$ELSEWHERE") $(body "$ELSEWHERE" | head -c 200) — expected 400 23514"
fi

# --- 4. the owner and the cashier read it; the cashier cannot put one --------
note
OWNER_READS="$(get "$SHOP_BUCKET" "$PATH_MINE/160.jpg")"
TOKEN="$STAFF_TOKEN"
STAFF_READS="$(get "$SHOP_BUCKET" "$PATH_MINE/720.jpg")"
STAFF_PUT="$(put "$SHOP_BUCKET" "$WS/$(uuid)/160.jpg" "$SCRATCH/160.jpg")"
TOKEN="$OWNER_TOKEN"
if [[ "$OWNER_READS" == "200" && "$STAFF_READS" == "200" \
      && "$(status "$STAFF_PUT")" =~ ^(400|403)$ && "$(body "$STAFF_PUT")" == *"row-level security"* ]]; then
  ok "the owner and the cashier read the shop's photo; the cashier may not put one there ($(status "$STAFF_PUT"), RLS)"
else
  fail "the owner read $OWNER_READS, the cashier read $STAFF_READS, the cashier's upload $(status "$STAFF_PUT") $(body "$STAFF_PUT" | head -c 160)"
fi

# --- 5. Wera's photo: the service role writes it, the template names it -------
CODE="zz8o-cola-$$"
HASH="$(python3 -c 'import secrets;print(secrets.token_hex(4))')"
as_owner_of_db "insert into catalogo.family (code, name) values ('$CODE', 'Refrescos 8o $$')"
as_owner_of_db "insert into catalogo.product (code, family_code, name, base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code) values ('$CODE', '$CODE', 'Cola 8o $$', 'pza', 'pza', 'pza', 'pza')"
WERA_FAM="$(first id "$(body "$(api POST '/rest/v1/product_family?select=id' \
  "$(python3 -c 'import json,sys;print(json.dumps({"workspace_id":sys.argv[1],"name":"Refrescos 8o"}))' "$WS")" \
  'Prefer: return=representation')")")"
WERA="$(uuid)"
as_owner_of_db "insert into public.product_variant (id, workspace_id, family_id, name, base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code, is_prebuilt, template_code) values ('$WERA', '$WS', '$WERA_FAM', 'Cola 8o', 'pza','pza','pza','pza', true, '$CODE')"

note
W_L="$(put "$CATALOG_BUCKET" "$CODE/$HASH/720.jpg" "$SCRATCH/720.jpg" "$SERVICE" "$SERVICE")"
W_T="$(put "$CATALOG_BUCKET" "$CODE/$HASH/160.jpg" "$SCRATCH/160.jpg" "$SERVICE" "$SERVICE")"
as_owner_of_db "update catalogo.product set image_path = '$CODE/$HASH' where code = '$CODE'"
CARRIED="$(first "$CATALOG_COLUMN" "$(body "$(api GET "/rest/v1/product_variant?select=$VARIANT_COLUMNS&id=eq.$WERA")")")"
if [[ "$(status "$W_L")" == "200" && "$(status "$W_T")" == "200" && "$CARRIED" == "$CODE/$HASH" ]]; then
  ok "Wera's photo goes into $CATALOG_BUCKET by the service role, and the shop's imported copy carries it as $CATALOG_COLUMN"
else
  fail "Wera's upload answered $(status "$W_L") $(body "$W_L" | head -c 160); the copy carries '$CARRIED' — expected '$CODE/$HASH'"
  echo "      An empty $CATALOG_COLUMN is the computed column missing or misnamed (0063's"
  echo "      catalog_image_path), or a template code that does not travel."
fi

# --- 6. every signed-in person reads Wera's; nobody but Wera writes there ----
note
OWNER_W="$(get "$CATALOG_BUCKET" "$CODE/$HASH/160.jpg")"
OWNER_PUT_W="$(put "$CATALOG_BUCKET" "$CODE/$(uuid)/160.jpg" "$SCRATCH/160.jpg")"
if [[ "$OWNER_W" == "200" && "$(status "$OWNER_PUT_W")" =~ ^(400|403)$ && "$(body "$OWNER_PUT_W")" == *"row-level security"* ]]; then
  ok "the shop reads Wera's photo, and may not put one into $CATALOG_BUCKET ($(status "$OWNER_PUT_W"), RLS)"
else
  fail "the shop's read of Wera's photo answered $OWNER_W; its upload there $(status "$OWNER_PUT_W") $(body "$OWNER_PUT_W" | head -c 160)"
fi

# --- 7. the lock: Wera's product never takes a photo of the shop's ----------
note
LOCKED="$(api PATCH "/rest/v1/product_variant?id=eq.$WERA&select=id" "{\"$IMAGE_COLUMN\":\"$PATH_MINE\"}")"
if [[ "$(status "$LOCKED")" == "400" && "$(pick code "$(body "$LOCKED")")" == "23001" ]]; then
  ok "giving Wera's product a photo of the shop's is refused — 400 23001 (product_variant_wera_keeps)"
else
  fail "a photo on Wera's product answered $(status "$LOCKED") $(body "$LOCKED" | head -c 200) — expected 400 23001"
fi

# --- 8. another shop: neither the shop's photo nor a place in its folder -----
note
signup "otra-fotos-$STAMP@example.com" "Otra Fotos"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Otra 8o","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
PEEK="$(get "$SHOP_BUCKET" "$PATH_MINE/160.jpg")"
THEIRS="$(put "$SHOP_BUCKET" "$WS/$(uuid)/160.jpg" "$SCRATCH/160.jpg")"
STILL_WERA="$(get "$CATALOG_BUCKET" "$CODE/$HASH/720.jpg")"
if [[ "$PEEK" =~ ^(400|404)$ && "$(status "$THEIRS")" =~ ^(400|403)$ && "$(body "$THEIRS")" == *"row-level security"* \
      && "$STILL_WERA" == "200" ]]; then
  ok "another shop reads none of this shop's photos ($PEEK) and puts none in its folder ($(status "$THEIRS")) — and reads Wera's"
else
  fail "another shop read $PEEK, uploaded $(status "$THEIRS") $(body "$THEIRS" | head -c 120), read Wera's $STILL_WERA"
fi

as_owner_of_db "delete from catalogo.product where code = '$CODE'"
as_owner_of_db "delete from catalogo.family where code = '$CODE'"

echo
if (( fails == 0 && ran < 9 )); then
  echo "FAIL: only $ran assertion groups ran, expected 9 — this check asserted almost nothing."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — the app's names reach 0063: the shop's own photo"
  echo "in $SHOP_BUCKET, read by its members and written by its owner; Wera's in $CATALOG_BUCKET,"
  echo "carried to every shop's copy and written by Wera alone; and Wera's product locked."
  exit 0
fi
echo "$ran group(s) ran, $fails failed."
exit 1

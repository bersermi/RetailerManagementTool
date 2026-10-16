#!/usr/bin/env bash
# ============================================================================
# 8k — DOES THE APP'S TE LO COMPRO REACH `0058` AND `0059` OVER A REAL POSTGREST?
#
# `app/src/api/collection.ts` names everything the database declares: the
# store's address columns, `collection_reaches`, `request_collection` and its
# `p_` arguments, `cancel_collection_request`, the request's columns and the
# three refusal codes. A typecheck has never read a migration, and PostgREST
# matches an RPC by its argument NAMES — a renamed one is a 404 PGRST202, the
# function not found rather than refused. So this check reads the names OUT OF
# THE APP and sends them to a reset local database, the way a phone would.
#
#   bash docs/checks/8k-collection-contract.sh [collection.ts]
#
# ⚠️ A CUSTOM SQLSTATE ARRIVES AS AN HTTP 400 (measured for TD003 on 2026-09-26),
# so TD008, TD009 and TD010 are asserted as 400 with their code in the body.
# ============================================================================
set -uo pipefail

CONTRACT="${1:-app/src/api/collection.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
args_of() { # interface-name -> its p_ names, comma-joined, in declaration order
  awk -v want="export interface $1 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$CONTRACT" \
    | sed -n 's/^ *readonly \(p_[a-z_]*\):.*/\1/p' | paste -sd, -
}

REACHES="$(str COLLECTION_REACHES "$CONTRACT")"
REQUEST="$(str REQUEST_COLLECTION "$CONTRACT")"
CANCEL="$(str CANCEL_COLLECTION "$CONTRACT")"
ADDRESS_COLUMNS="$(str STORE_ADDRESS_COLUMNS "$CONTRACT")"
NO_ADDRESS="$(str NO_ADDRESS_CODE "$CONTRACT")"
OUTSIDE="$(str OUTSIDE_AREA_CODE "$CONTRACT")"
TOO_LATE="$(str TOO_LATE_TO_CANCEL_CODE "$CONTRACT")"
REACHES_ARGS="$(args_of ReachesArgs)"
REQUEST_ARGS="$(args_of RequestCollectionArgs)"
CANCEL_ARGS="$(args_of CancelCollectionArgs)"
# The request's columns are on two lines in the module; join what follows `=`.
COLLECTION_COLUMNS="$(awk '/^export const COLLECTION_COLUMNS =/{f=1} f{print} f&&/;$/{exit}' "$CONTRACT" \
  | tr -d '\n' | sed -n "s/.*'\([^']*\)';.*/\1/p")"

note
for name in REACHES REQUEST CANCEL ADDRESS_COLUMNS NO_ADDRESS OUTSIDE TOO_LATE \
            REACHES_ARGS REQUEST_ARGS CANCEL_ARGS COLLECTION_COLUMNS; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app — this check would assert nothing"
    exit 1
  fi
done
ok "read from the app: $REQUEST($REQUEST_ARGS), $CANCEL($CANCEL_ARGS), $REACHES($REACHES_ARGS)"

STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
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
first()  { python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['$1'] if isinstance(r,list) and r else '')" <<< "$2" 2>/dev/null; }
count()  { python3 -c "import sys,json;r=json.load(sys.stdin);print(len(r) if isinstance(r,list) else -1)" <<< "$1" 2>/dev/null; }

PASSWORD="collection-8k-123"
signup() { # email full-name -> sets TOKEN
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup \
      "{\"email\":\"$1\",\"password\":\"$PASSWORD\",\"data\":{\"full_name\":\"$2\"}}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  echo "      GoTrue rate-limits signup and answers with an EMPTY BODY when it does."
  exit 1
}

# Bodies are built by python, keyed by the APP's argument names — never typed here.
by_names() { # names-csv value1 value2 ... -> a JSON object
  python3 - "$@" <<'PY'
import json, sys
names = sys.argv[1].split(",")
values = [json.loads(v) for v in sys.argv[2:]]
print(json.dumps(dict(zip(names, values))))
PY
}

STAMP="$$-$(date +%s)"
signup "recoger-$STAMP@example.com" "Dueña Recoger"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  "{\"p_display_name\":\"Tienda Contrato 8k\",\"p_prices_include_tax\":true,\"p_location_name\":null}")"
WS="$(body "$CREATED" | tr -d '"')"
[[ -n "$WS" && "$(status "$CREATED")" == "200" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }
LOC="$(first id "$(body "$(api GET '/rest/v1/location?select=id')")")"

FAM_BODY="$(python3 -c 'import json,sys;print(json.dumps({"workspace_id":sys.argv[1],"name":"Pollo 8k"}))' "$WS")"
FAM="$(first id "$(body "$(api POST '/rest/v1/product_family?select=id' "$FAM_BODY" 'Prefer: return=representation')")")"
VAR_BODY="$(python3 -c '
import json,sys
print(json.dumps({"workspace_id":sys.argv[1],"family_id":sys.argv[2],"name":"Pechuga 8k",
  "base_unit_code":"g","purchase_unit_code":"kg","sell_unit_code":"kg","price_unit_code":"kg"}))' "$WS" "$FAM")"
VAR="$(first id "$(body "$(api POST '/rest/v1/product_variant?select=id' "$VAR_BODY" 'Prefer: return=representation')")")"
[[ -n "$LOC" && -n "$FAM" && -n "$VAR" ]] || { echo "FAIL: could not build the fixture (loc=$LOC fam=$FAM var=$VAR)"; exit 1; }

REQ_ID="$(python3 -c 'import uuid;print(uuid.uuid4())')"
TOMORROW="$(python3 -c 'import datetime;print(datetime.date.today()+datetime.timedelta(days=1))')"
LINES="$(python3 -c '
import json,sys
print(json.dumps([{"variant_id":sys.argv[1],"qty_display":"2.5","qty_display_unit":"kg",
  "condition":"por caducar","packaging":"cerrado","keeping":"refrigerado","expiry_date":None}]))' "$VAR")"
REQUEST_BODY="$(by_names "$REQUEST_ARGS" "\"$REQ_ID\"" "\"$LOC\"" "\"$TOMORROW\"" '"09:00"' '"09:15"' "$LINES" '[]' 'null')"

# ---- 1. the area's door -------------------------------------------------------
note
ANON="$(TOKEN="" api POST "/rest/v1/rpc/$REACHES" "$(by_names "$REACHES_ARGS" '"06400"')")"
IN="$(api POST "/rest/v1/rpc/$REACHES" "$(by_names "$REACHES_ARGS" '"06400"')")"
OUT="$(api POST "/rest/v1/rpc/$REACHES" "$(by_names "$REACHES_ARGS" '"06500"')")"
if [[ "$(status "$ANON")" == "401" && "$(body "$IN")" == "true" && "$(body "$OUT")" == "false" ]]; then
  ok "$REACHES: closed to an anonymous caller (401); 06400 true, 06500 false"
else
  fail "$REACHES answered anon $(status "$ANON"), 06400 $(body "$IN"), 06500 $(body "$OUT")"
fi

# ---- 2. no address, then outside the area ------------------------------------
note
NOADDR="$(api POST "/rest/v1/rpc/$REQUEST" "$REQUEST_BODY")"
if [[ "$(status "$NOADDR")" == "400" && "$(pick code "$(body "$NOADDR")")" == "$NO_ADDRESS" ]]; then
  ok "a store with no address: 400 $NO_ADDRESS"
else
  fail "a store with no address answered $(status "$NOADDR") $(body "$NOADDR") — expected 400 $NO_ADDRESS"
fi

note
PATCH="$(python3 -c '
import json
print(json.dumps({"street":"Sabino","street_number":"120","colonia":None,
                  "city":"Ciudad de México","postal_code":"06500"}))')"
SAVED="$(api PATCH "/rest/v1/location?id=eq.$LOC&select=id" "$PATCH" 'Prefer: return=representation')"
READ="$(api GET "/rest/v1/location?select=$ADDRESS_COLUMNS&id=eq.$LOC")"
if [[ "$(status "$SAVED")" == "200" && "$(count "$(body "$SAVED")")" == "1" \
      && "$(status "$READ")" == "200" && "$(first postal_code "$(body "$READ")")" == "06500" ]]; then
  ok "the owner writes the store's address, and the app's column list reads it back"
else
  fail "address write $(status "$SAVED") $(body "$SAVED"); read $(status "$READ") $(body "$READ")"
fi

note
OUTSIDE_R="$(api POST "/rest/v1/rpc/$REQUEST" "$REQUEST_BODY")"
if [[ "$(status "$OUTSIDE_R")" == "400" && "$(pick code "$(body "$OUTSIDE_R")")" == "$OUTSIDE" ]]; then
  ok "a store outside the area: 400 $OUTSIDE"
else
  fail "a store outside the area answered $(status "$OUTSIDE_R") $(body "$OUTSIDE_R") — expected 400 $OUTSIDE"
fi

# ---- 3. the request, read back, called off ------------------------------------
api PATCH "/rest/v1/location?id=eq.$LOC" '{"postal_code":"06400"}' > /dev/null
note
SENT="$(api POST "/rest/v1/rpc/$REQUEST" "$REQUEST_BODY")"
LIST="$(api GET "/rest/v1/collection_request?select=$COLLECTION_COLUMNS")"
LINE_NAME="$(python3 -c '
import json,sys
r=json.loads(sys.stdin.read())
print(r[0]["lines"][0]["variant_name"] if isinstance(r,list) and r else "")' <<< "$(body "$LIST")" 2>/dev/null)"
if [[ "$(status "$SENT")" == "200" && "$(pick status "$(body "$SENT")")" == "enviada" \
      && "$(status "$LIST")" == "200" && "$(count "$(body "$LIST")")" == "1" \
      && "$(first window_start "$(body "$LIST")")" == "09:00:00" \
      && "$LINE_NAME" == "Pechuga 8k" ]]; then
  ok "the request lands enviada; the app's columns read it back, HH:MM:SS and the name copied in"
else
  fail "request $(status "$SENT") $(body "$SENT"); list $(status "$LIST") $(body "$LIST")"
fi

note
AGAIN="$(api POST "/rest/v1/rpc/$REQUEST" "$REQUEST_BODY")"
if [[ "$(status "$AGAIN")" == "200" && "$(pick already_recorded "$(body "$AGAIN")")" == "True" ]]; then
  ok "the same request sent again is that request (already_recorded)"
else
  fail "a retry answered $(status "$AGAIN") $(body "$AGAIN")"
fi

note
CANCELLED="$(api POST "/rest/v1/rpc/$CANCEL" "$(by_names "$CANCEL_ARGS" "\"$REQ_ID\"")")"
if [[ "$(status "$CANCELLED")" == "200" && "$(pick status "$(body "$CANCELLED")")" == "cancelada" ]]; then
  ok "$CANCEL: 200 cancelada"
else
  fail "$CANCEL answered $(status "$CANCELLED") $(body "$CANCELLED")"
fi

# ⚠️ TD010 needs a request Wera has moved on, and only the service role moves
# one — so it is driven from SQL, the way the owner moves it in the dashboard.
note
REQ2="$(python3 -c 'import uuid;print(uuid.uuid4())')"
REQUEST_BODY2="$(by_names "$REQUEST_ARGS" "\"$REQ2\"" "\"$LOC\"" "\"$TOMORROW\"" '"11:00"' '"11:15"' "$LINES" '[]' '"Tocar el timbre"')"
api POST "/rest/v1/rpc/$REQUEST" "$REQUEST_BODY2" > /dev/null
DB_URL="$(sed -n 's/^DB_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
if command -v psql > /dev/null; then
  psql "$DB_URL" -q -c "update public.collection_request set status = 'confirmada' where id = '$REQ2'" > /dev/null
else
  docker exec -i "$(docker ps --format '{{.Names}}' | grep -m1 '^supabase_db_')" \
    psql -U postgres -q -c "update public.collection_request set status = 'confirmada' where id = '$REQ2'" > /dev/null
fi
LATE="$(api POST "/rest/v1/rpc/$CANCEL" "$(by_names "$CANCEL_ARGS" "\"$REQ2\"")")"
if [[ "$(status "$LATE")" == "400" && "$(pick code "$(body "$LATE")")" == "$TOO_LATE" ]]; then
  ok "a request Wera has confirmed: 400 $TOO_LATE"
else
  fail "cancelling a confirmed request answered $(status "$LATE") $(body "$LATE") — expected 400 $TOO_LATE"
fi

echo
if (( fails == 0 && ran < 9 )); then
  echo "FAIL: only $ran assertion groups ran, expected 9 — this check asserted almost nothing."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — the app's names reach 0058 and 0059: the area,"
  echo "the address, a request sent, read back, retried and called off, and the three refusals."
  exit 0
fi
echo "$ran group(s) ran, $fails failed."
exit 1

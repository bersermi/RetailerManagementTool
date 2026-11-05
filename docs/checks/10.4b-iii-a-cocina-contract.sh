#!/usr/bin/env bash
# 10.4b-iii-a-cocina-contract — does Wera Cocina's data layer still describe the
# schema, does it open kitchens and nothing else, and does making one land on the
# kitchen and never on her shop?
#
# WHY THIS EXISTS. `cocina/src/api/kitchen.ts` and `cocina/src/api/place.ts` are
# Cocina's claims about the applied schema: tables, columns, filters, orders, and
# the names of the functions and arguments a kitchen is made through. A misspelt
# one is a 400 or a 404 on the phone that the typecheck, the suite and the
# bundler all pass over. And two filters carry the walls' gap: the walls let a
# login read every business she belongs to (`my_workspaces()`, `my_locations()`),
# so only the filter on the kind keeps Wera's shops out of Cocina (`0072`,
# ADR-035 §2.3), and only the filter on the kitchen keeps a shop's STORE out of
# her kitchen's place — without it, a shop's owner who makes a kitchen here would
# have her kitchen's address and pin written onto her shop (`10.4b-ii`'s defect,
# one app over). And `cocina/src/auth/credentials.ts` names the key a person's
# name is stored under at sign-up, which the database reads when she makes a
# business (`auth_full_name`, `0034`). And `cocina/src/api/account.ts`
# (`10.4b-iii-c`) names her way out: the read that says what goes with her
# account, and the deletion's function and argument — and, since `10.5-iii-c`,
# her kitchen deleted alone (`0077`): the function, its two arguments, and the
# refusal the app reads as *not hers alone*.
#
# ⚠️ AND ITACATE'S WAY OUT (`10.5-iii-b`), THE FIRST MODULE IN `itacate/src/api/`
# THAT NAMES THE SCHEMA. Itacate deletes an account as Wera Cocina does — the
# owner's ruling of 2026-11-04 — so `itacate/src/api/account.ts` sends the same
# read and the same body. Group 1 holds each of its eight names to Wera Cocina's
# BEFORE anything is sent, so every request groups 14 and 18–21 make is Itacate's too:
# one check over one shared engine, not a copy of it (the owner's rule of
# 2026-09-19). Itacate's own case — a neighbour, who owns nothing and sends an
# empty list — needs no sign-up here: `0053`'s suite deletes a login with no
# business it owns (its section 2), `5R-k-apple-revoke-contract.sh` deletes one
# over HTTP (its group 12), and group 20 below shows PostgREST hands `[]` to
# `delete_my_account`.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST, as ONE login
# that owns a shop and then makes kitchens — so every group asks as the kitchen's
# owner AND as a shop's:
#   1. The claim is read OUT OF THOSE FILES — nothing is retyped here — and
#      Itacate's deletion names are Wera Cocina's, each one.  (`10.5-iii-b`)
#   2. A fonda signs up by the email door as Cocina does, her name under that key,
#      and gets a session at once (confirmations off, as on the hosted project).
#   3. With no business, the app's read answers 200 and `[]` — the landing.
#   4. She makes a shop as every Wera build does: the unfiltered read returns it
#      (the walls' answer, so the next assertion is not vacuous) and the app's
#      read is still `[]` — a shop's owner who opens Cocina lands where a kitchen
#      is made, and never in her shop.
#   5. She makes a kitchen as Cocina does — the app's function and argument names
#      (`10.4b-iii-b`): the app's read is that kitchen alone, with exactly the
#      columns it asks for.
#   6. A second kitchen: both, the first-made first — the one the app opens.
#   7. The name she typed is on her kitchen membership — the key, end to end.
#   8. The kitchens' trades, through the app's door: codes and names, none of them
#      a shop's giro.                                            (`10.4b-iii-b`, 8–12)
#   9. Her trade, by the app's update on her kitchen: the row comes back, the trade
#      reads back, her shop's is untouched — and a shop's giro is refused.
#  10. Her kitchen's place, by the app's read: one row, the kitchen's own, with
#      exactly its columns — where the unfiltered read's first row is her SHOP's
#      store, so the filter is what keeps it out; the second kitchen has its own.
#  11. Her address, through the app's door and names: reads back as sent, the
#      empty colonia as none; her shop's store still has none.
#  12. Her pin and its line, likewise: six decimals as sent, the line as sent, a
#      blank line none; her shop's store still has no pin. And since `10.4h`
#      (address first, `0075`): her line alone, by the app's door and names,
#      leaves her pin; her pin cleared leaves her line; her line saved with no
#      pin reads back; her shop's store is still untouched. And since
#      `10.5-i-b-ii` (`0078`): Google's point for her address, by the app's door
#      and names, reads back through the app's own place read — six decimals, the
#      place's ID as sent, stamped by the database at that moment in the shape the
#      app reads; without an ID, none; refused on her SHOP's store (`TD013`),
#      which keeps none; and ⚠️ a new address through the app's door clears it —
#      the reason the app always writes it last — and written after, it stays.
#  13. Signed out: no business, no place, no trades, no pin set, no line set, no
#      pin cleared, no Google point set and no kitchen deleted.
#  14. What goes with her account, by the app's owners read: her shop and her two
#      kitchens, each with her as its only owner and its kind.  (`10.4b-iii-c`, 14–21)
#  15. Her second kitchen alone, by the app's names, a wrong name: 400 `TD007`,
#      and all three businesses still there.                      (`10.5-iii-c`, 15–17)
#  16. Her SHOP through the kitchen's door, its right name: 400, her shop still
#      there — a shop goes only with its owner's account.
#  17. Her second kitchen's name in another case and spacing: 200, that kitchen
#      gone and only it — her shop and her first kitchen there, her login still
#      signed in, the app's read her first kitchen alone; and the same call again
#      is the refusal the app reads as *not hers alone*.
#  18. The account's deletion as the app sends it, her shop's name missing: 400
#      `TD007`, and both businesses still there.
#  19. Every name, in any case and spacing: 200 {2 deleted, 0 left}, neither left
#      in the database, and her login gone.
#  20. A shop's owner who opens Cocina with no kitchen: the read names her shop as
#      a shop; an empty list — a screen that thought nothing goes — is refused
#      `TD007`, and her shop stays.
#  21. Her shop's name: 200 {1 deleted, 0 left}, her shop gone, her login gone.
#
# ⚠️ WHETHER A BUSINESS IS GONE IS ASKED OF THE DATABASE ITSELF (`supabase db
# query --local`, as the superuser, groups 15–21): read as her, a deleted login
# sees nothing whether or not anything was deleted.
#
# ⚠️ WHAT IT DOES NOT ASSERT: Google's and Apple's sign-ins. Neither runs on this
# stack (both providers are off in `supabase/config.toml`), Apple's needs a token
# Apple signed, and Google's needs the hosted redirect list — the owner's phones,
# plan `10.4b-iii-a`'s look. Nor the map: where her tap lands is the phone's, and
# `cocina/test/mapa.test.ts` pins the arithmetic.
#
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.4b-iii-a-cocina-contract.sh
# With: $1 a copy of kitchen.ts, $2 of credentials.ts, $3 of place.ts, $4 of
#       account.ts and $5 of Itacate's account.ts — how the falsifier points it
#       at a broken one.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

KITCHEN_TS="${1:-cocina/src/api/kitchen.ts}"
CREDENTIALS_TS="${2:-cocina/src/auth/credentials.ts}"
PLACE_TS="${3:-cocina/src/api/place.ts}"
ACCOUNT_TS="${4:-cocina/src/api/account.ts}"
ITACATE_ACCOUNT_TS="${5:-itacate/src/api/account.ts}"
for f in "$KITCHEN_TS" "$CREDENTIALS_TS" "$PLACE_TS" "$ACCOUNT_TS" "$ITACATE_ACCOUNT_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the app's own claim, read out of its source ------------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
TABLE="$(const WORKSPACE_TABLE "$KITCHEN_TS")"
COLUMNS="$(const KITCHEN_COLUMNS "$KITCHEN_TS")"
KIND_COL="$(const KIND_COLUMN "$KITCHEN_TS")"
KIND="$(const COCINA_KIND "$KITCHEN_TS")"
ORDER_COLS="$(const KITCHEN_ORDER "$KITCHEN_TS")"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"
# `10.4b-iii-b`: making her kitchen — the functions, their argument names (read out
# of the app's interfaces, in declaration order), her trade's column, her place.
args_of() { # file interface -> its p_ names, comma-joined, in declaration order
  awk -v want="export interface $2 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n 's/^ *readonly \(p_[a-z_]*\):.*/\1/p' | paste -sd, -
}
ONBOARD="$(const ONBOARD_WORKSPACE "$KITCHEN_TS")"
ONBOARD_ARGS="$(args_of "$KITCHEN_TS" OnboardArgs)"
GIROS_RPC="$(const KITCHEN_GIROS "$KITCHEN_TS")"
GIRO_COL="$(const GIRO_COLUMN "$KITCHEN_TS")"
PLACE_TABLE="$(const PLACE_TABLE "$PLACE_TS")"
PLACE_COLUMNS="$(const PLACE_COLUMNS "$PLACE_TS")"
PLACE_OWNER="$(const PLACE_OWNER_COLUMN "$PLACE_TS")"
PLACE_ACTIVE="$(const PLACE_ACTIVE_COLUMN "$PLACE_TS")"
PLACE_ORDER_COLS="$(const PLACE_ORDER "$PLACE_TS")"
SET_ADDRESS="$(const SET_STORE_ADDRESS "$PLACE_TS")"
SET_ADDRESS_ARGS="$(args_of "$PLACE_TS" SetStoreAddressArgs)"
SET_PIN="$(const SET_STORE_PIN "$PLACE_TS")"
SET_PIN_ARGS="$(args_of "$PLACE_TS" SetStorePinArgs)"
# `10.4h`: her line with no pin, and her pin cleared (`0075`).
SET_LINE="$(const SET_STORE_DIRECTIONS "$PLACE_TS")"
SET_LINE_ARGS="$(args_of "$PLACE_TS" SetStoreDirectionsArgs)"
CLEAR_PIN="$(const CLEAR_STORE_PIN "$PLACE_TS")"
CLEAR_PIN_ARGS="$(args_of "$PLACE_TS" ClearStorePinArgs)"
# `10.5-i-b-ii`: Google's point for her address, a 30-day copy (`0078`).
SET_GOOGLE="$(const SET_GOOGLE_POINT "$PLACE_TS")"
SET_GOOGLE_ARGS="$(args_of "$PLACE_TS" SetGooglePointArgs)"
# `10.4b-iii-c`: her way out — what goes with her account, and the deletion.
OWNERS_TABLE="$(const OWNERS_TABLE "$ACCOUNT_TS")"
OWNER_COLUMNS="$(const OWNER_COLUMNS "$ACCOUNT_TS")"
OWNER_ROLE_COL="$(const OWNER_ROLE_COLUMN "$ACCOUNT_TS")"
OWNER_ROLE="$(const OWNER_ROLE "$ACCOUNT_TS")"
OWNER_ACTIVE_COL="$(const OWNER_ACTIVE_COLUMN "$ACCOUNT_TS")"
DELETE_RPC="$(const DELETE_MY_ACCOUNT "$ACCOUNT_TS")"
DELETE_ARGS="$(args_of "$ACCOUNT_TS" DeleteArgs)"
MISMATCH="$(const NAME_MISMATCH_CODE "$ACCOUNT_TS")"
# `10.5-iii-c`: her kitchen deleted alone, her login kept (`0077`).
KDELETE_RPC="$(const DELETE_MY_BUSINESS "$ACCOUNT_TS")"
KDELETE_ARGS="$(args_of "$ACCOUNT_TS" DeleteBusinessArgs)"
NOT_HERS="$(const NOT_HERS_ALONE_CODE "$ACCOUNT_TS")"

for pair in "WORKSPACE_TABLE:$TABLE" "KITCHEN_COLUMNS:$COLUMNS" "KIND_COLUMN:$KIND_COL" \
            "COCINA_KIND:$KIND" "KITCHEN_ORDER:$ORDER_COLS" "FULL_NAME_KEY:$NAME_KEY" \
            "ONBOARD_WORKSPACE:$ONBOARD" "OnboardArgs:$ONBOARD_ARGS" "KITCHEN_GIROS:$GIROS_RPC" \
            "GIRO_COLUMN:$GIRO_COL" "PLACE_TABLE:$PLACE_TABLE" "PLACE_COLUMNS:$PLACE_COLUMNS" \
            "PLACE_OWNER_COLUMN:$PLACE_OWNER" "PLACE_ACTIVE_COLUMN:$PLACE_ACTIVE" "PLACE_ORDER:$PLACE_ORDER_COLS" \
            "SET_STORE_ADDRESS:$SET_ADDRESS" "SetStoreAddressArgs:$SET_ADDRESS_ARGS" \
            "SET_STORE_PIN:$SET_PIN" "SetStorePinArgs:$SET_PIN_ARGS" \
            "SET_STORE_DIRECTIONS:$SET_LINE" "SetStoreDirectionsArgs:$SET_LINE_ARGS" \
            "CLEAR_STORE_PIN:$CLEAR_PIN" "ClearStorePinArgs:$CLEAR_PIN_ARGS" \
            "SET_GOOGLE_POINT:$SET_GOOGLE" "SetGooglePointArgs:$SET_GOOGLE_ARGS" \
            "OWNERS_TABLE:$OWNERS_TABLE" "OWNER_COLUMNS:$OWNER_COLUMNS" "OWNER_ROLE_COLUMN:$OWNER_ROLE_COL" \
            "OWNER_ROLE:$OWNER_ROLE" "OWNER_ACTIVE_COLUMN:$OWNER_ACTIVE_COL" "DELETE_MY_ACCOUNT:$DELETE_RPC" \
            "DeleteArgs:$DELETE_ARGS" "NAME_MISMATCH_CODE:$MISMATCH" \
            "DELETE_MY_BUSINESS:$KDELETE_RPC" "DeleteBusinessArgs:$KDELETE_ARGS" "NOT_HERS_ALONE_CODE:$NOT_HERS"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the app's source"
    echo "      This check asserts the app's own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
# `10.5-iii-b`: Itacate's way out, name by name against Wera Cocina's. ⚠️ FATAL,
# and before any request: groups 14 and 18–21 speak for Itacate only while every name is
# the same, and a difference is a request no group here has sent.
itacate_names=0
for pair in "OWNERS_TABLE:$OWNERS_TABLE" "OWNER_COLUMNS:$OWNER_COLUMNS" "OWNER_ROLE_COLUMN:$OWNER_ROLE_COL" \
            "OWNER_ROLE:$OWNER_ROLE" "OWNER_ACTIVE_COLUMN:$OWNER_ACTIVE_COL" "DELETE_MY_ACCOUNT:$DELETE_RPC" \
            "NAME_MISMATCH_CODE:$MISMATCH"; do
  ours="$(const "${pair%%:*}" "$ITACATE_ACCOUNT_TS")"
  if [[ "$ours" != "${pair#*:}" ]]; then
    echo "FAIL: Itacate's ${pair%%:*} is '$ours' and Wera Cocina's '${pair#*:}' — one deletion, so one spelling;"
    echo "      every request below is Wera Cocina's, and Itacate's would be one this check never sent."
    exit 1
  fi
  itacate_names=$((itacate_names+1))
done
ITACATE_DELETE_ARGS="$(args_of "$ITACATE_ACCOUNT_TS" DeleteArgs)"
if [[ "$ITACATE_DELETE_ARGS" != "$DELETE_ARGS" ]]; then
  echo "FAIL: Itacate's DeleteArgs is '$ITACATE_DELETE_ARGS' and Wera Cocina's '$DELETE_ARGS' — one deletion, so one body;"
  echo "      every request below is Wera Cocina's, and Itacate's would be one this check never sent."
  exit 1
fi
itacate_names=$((itacate_names+1))
# The order as supabase-js sends it: `.order(c)` once per column, each ascending.
ORDER="$(tr ',' '\n' <<< "$ORDER_COLS" | sed 's/$/.asc/' | paste -sd, -)"
APP_READ="/rest/v1/$TABLE?select=$COLUMNS&$KIND_COL=eq.$KIND&order=$ORDER"
# Her kitchen's place, as `firstPlace` asks: filtered on the kitchen, active, ordered, one row.
PLACE_ORDER="$(tr ',' '\n' <<< "$PLACE_ORDER_COLS" | sed 's/$/.asc/' | paste -sd, -)"
place_read() { echo "/rest/v1/$PLACE_TABLE?select=$PLACE_COLUMNS&$PLACE_OWNER=eq.$1&$PLACE_ACTIVE=eq.true&order=$PLACE_ORDER&limit=1"; }
ok "read from the app: $TABLE?select=$COLUMNS, $KIND_COL = $KIND, ordered by $ORDER_COLS; the name under $NAME_KEY"
ok "and to make one: $ONBOARD($ONBOARD_ARGS), $GIROS_RPC(), $GIRO_COL; $PLACE_TABLE by $PLACE_OWNER; $SET_ADDRESS($SET_ADDRESS_ARGS); $SET_PIN($SET_PIN_ARGS); $SET_LINE($SET_LINE_ARGS); $CLEAR_PIN($CLEAR_PIN_ARGS); $SET_GOOGLE($SET_GOOGLE_ARGS)"
ok "and her way out: $OWNERS_TABLE?select=$OWNER_COLUMNS where $OWNER_ROLE_COL = $OWNER_ROLE and $OWNER_ACTIVE_COL; $DELETE_RPC($DELETE_ARGS), refused $MISMATCH"
ok "and her kitchen alone: $KDELETE_RPC($KDELETE_ARGS), refused $MISMATCH for a name and $NOT_HERS for a kitchen not hers alone"
ok "and Itacate's way out sends the same, all $itacate_names names read out of $ITACATE_ACCOUNT_TS — every deletion below is Itacate's too"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)"
  echo "      from the repository root — \`supabase status\` needs the project directory."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE, which bypasses RLS: "the shop
# stays out" would then be true of nobody.
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

TOKEN=""
api() { # method path [body] [extra header] [extra header] -> body, with the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" auth="${TOKEN:-}"
  local h1="${4:-X-Empty-1: 1}" h2="${5:-X-Empty-2: 1}"
  if [[ -n "$auth" ]]; then auth="Authorization: Bearer $auth"; else auth="X-Empty: 1"; fi
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" \
      -H "apikey: $KEY" -H "$auth" -H 'Content-Type: application/json' -H "$h1" -H "$h2" -d "$body"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth" -H "$h1" -H "$h2"
  fi
}
# A body keyed by the APP's argument names, in their order — never typed here.
by_names() { # names-csv json-value1 json-value2 ... -> a JSON object
  python3 -c 'import json,sys; n=sys.argv[1].split(","); print(json.dumps(dict(zip(n,[json.loads(v) for v in sys.argv[2:]]))))' "$@"
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }

STAMP="$$-$(date +%s)"
NAME="Doña Prueba $STAMP"

# --- 2. she signs up as Cocina does ----------------------------------------
# ⚠️ THE BODY IS BUILT BY ONE SCRIPT IN ITS OWN STEP: the name carries an
# accent and the key comes from the app, and a heredoc inside `$( )` is where
# bash 3.2 loses an apostrophe (a memory of this repository).
python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": "cocina-probe-123", "data": {sys.argv[2]: sys.argv[3]}}))' \
  "cocina-$STAMP@example.com" "$NAME_KEY" "$NAME" > "$SCRATCH/signup.json"
# ⚠️ RETRIED: GoTrue rate-limits sign-ups and answers a limited one with an EMPTY
# body rather than a 429 — which looks exactly like a broken harness.
for try in 1 2 3 4 5 6; do
  out="$(TOKEN="" api POST /auth/v1/signup "$(cat "$SCRATCH/signup.json")")"
  TOKEN="$(pick access_token "$(body "$out")")"
  [[ -n "$TOKEN" ]] && break
  sleep 10
done
if [[ -z "$TOKEN" ]]; then
  fail "a sign-up by the email door got no session — $(status "$out") $(body "$out" | head -c 200)"
  exit 1
fi
UID_="$(pick id "$(body "$(api GET /auth/v1/user)")")"
ok "a fonda signs up by the email door, her name under $NAME_KEY, and is signed in at once"

# The app's read, as a verdict: `kitchens <expected ids, comma-separated, in order>`.
cat > "$SCRATCH/verdict.py" <<'PY'
import json, sys
status, path, expected, columns = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
try:
    rows = json.load(open(path))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if status != '200' or not isinstance(rows, list):
    print("the app's read answered %s %s" % (status, json.dumps(rows)[:200])); raise SystemExit
want = [i for i in expected.split(',') if i]
got = [r.get('id') for r in rows]
if got != want:
    print('the read returned %s, expected %s' % (got, want)); raise SystemExit
asked = set(columns.split(','))
for r in rows:
    if set(r) != asked:
        print('a row carried %s, the app asks for %s' % (sorted(r), sorted(asked))); raise SystemExit
print('OK')
PY
app_read() { # expected-ids -> "OK" or why not
  local out; out="$(api GET "$APP_READ")"
  body "$out" > "$SCRATCH/read.json"
  python3 "$SCRATCH/verdict.py" "$(status "$out")" "$SCRATCH/read.json" "$1" "$COLUMNS"
}

# --- 3. no business yet ----------------------------------------------------
v="$(app_read "")"
if [[ "$v" == OK ]]; then ok "with no business, the app's read is [] — she lands where a kitchen is made"
else fail "with no business: $v"; fi

# --- 4. a shop, as every Wera build makes one -------------------------------
SHOP="$(body "$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Tienda de la fonda","p_prices_include_tax":true,"p_location_name":null}')" | tr -d '"')"
[[ "$SHOP" =~ ^[0-9a-f-]{36}$ ]] || { fail "could not make the shop: $SHOP"; exit 1; }
EVERY="$(body "$(api GET "/rest/v1/$TABLE?select=id")")"
if grep -c "$SHOP" <<< "$EVERY" > /dev/null; then
  v="$(app_read "")"
  if [[ "$v" == OK ]]; then ok "the walls show her shop, and the app's read keeps it out — a shop's owner lands where a kitchen is made"
  else fail "with a shop: $v — a shop's owner would be in her shop in the kitchens' app"; fi
else
  fail "the unfiltered read does not show her shop ($EVERY), so the filter is not what keeps it out"
fi

# --- 5. her kitchen, as Cocina makes it -------------------------------------
# ⚠️ BY THE APP'S NAMES (`OnboardArgs`), in its order: the kitchen's name, then the kind.
KITCHEN="$(body "$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" '"Zona de la fonda"' "\"$KIND\"")")" | tr -d '"')"
[[ "$KITCHEN" =~ ^[0-9a-f-]{36}$ ]] || { fail "could not make the kitchen as the app does, $ONBOARD($ONBOARD_ARGS): $KITCHEN"; exit 1; }
v="$(app_read "$KITCHEN")"
if [[ "$v" == OK ]]; then ok "with a shop and a kitchen, the app's read is the kitchen alone, with exactly $COLUMNS"
else fail "with a shop and a kitchen: $v"; fi

# --- 6. a second kitchen: the first-made opens -------------------------------
# ⚠️ ITS NAME SORTS BEFORE THE FIRST ONE'S, so an order by name — or by nothing,
# when the heap happens to agree with the alphabet — cannot pass for the order
# by creation. A second apart, so the two times differ.
sleep 1
SECOND="$(body "$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" '"Antojitos, segunda cocina"' "\"$KIND\"")")" | tr -d '"')"
[[ "$SECOND" =~ ^[0-9a-f-]{36}$ ]] || { fail "could not make the second kitchen: $SECOND"; exit 1; }
v="$(app_read "$KITCHEN,$SECOND")"
if [[ "$v" == OK ]]; then ok "with two kitchens, both, the first-made first — the one the app opens"
else fail "with two kitchens: $v"; fi

# --- 7. the name she typed reached her membership ----------------------------
MEMBER="$(body "$(api GET "/rest/v1/workspace_member?select=display_name&workspace_id=eq.$KITCHEN&user_id=eq.$UID_")")"
python3 -c 'import json,sys; rows=json.loads(sys.argv[1]); raise SystemExit(0 if rows and rows[0].get("display_name")==sys.argv[2] else 1)' \
  "$MEMBER" "$NAME" 2>/dev/null
if [[ $? -eq 0 ]]; then ok "the name typed at Crear cuenta is on her kitchen membership — $NAME_KEY is the key the database reads"
else fail "her kitchen membership carries $MEMBER, not \"$NAME\" — the name was stored under a key the database does not read"; fi

# =============================================================================
# `10.4b-iii-b` — SHE MAKES HER KITCHEN. Every name below is the app's, and every
# group also asks of her SHOP, which she owns too: nothing written here may land
# on it.
# =============================================================================

# Verdicts are one python file, a function per question: `verdict <question> <args…>`.
cat > "$SCRATCH/kitchen.py" <<'PY'
import json, sys

def load(path):
    try:
        return json.load(open(path))
    except Exception as exc:
        print('unreadable: %s' % exc); raise SystemExit

def giros(status, path, template_path):
    rows = load(path)
    if status != '200' or not isinstance(rows, list):
        print("the trades' door answered %s %s" % (status, json.dumps(rows)[:160])); return
    if not rows:
        print("the trades' door answered an empty list"); return
    shops = {t.get('code') for t in load(template_path).get('tags', []) if t.get('kind') == 'giro'}
    for r in rows:
        if not isinstance(r, dict) or set(r) != {'code', 'label'}:
            print('a trade came as %s, not {code, label}' % json.dumps(r)[:120]); return
        if not str(r['code']).startswith('giro-') or not str(r['label']).strip():
            print('a trade has no giro code or no name: %s' % json.dumps(r)); return
        if r['code'] in shops:
            print("a shop's giro is among the kitchens' trades: %s" % r['code']); return
    if not shops:
        print("Wera's template returned no giro, so 'none is a shop's' would be vacuous"); return
    print('OK %d %s %s' % (len(rows), rows[0]['code'], sorted(shops)[0]))

def place(status, path, columns, want_name, not_ids):
    rows = load(path)
    if status != '200' or not isinstance(rows, list):
        print("the app's place read answered %s %s" % (status, json.dumps(rows)[:160])); return
    if len(rows) != 1:
        print("the app's place read for the kitchen returned %d rows, expected its one place" % len(rows)); return
    r = rows[0]
    if set(r) != set(columns.split(',')):
        print('the place carried %s, the app asks for %s' % (sorted(r), sorted(columns.split(',')))); return
    if r.get('id') in [i for i in not_ids.split(',') if i]:
        print("the app's place read returned %s — her SHOP's store or another kitchen's place, not this kitchen's" % r.get('id')); return
    if r.get('name') != want_name:
        print("the place is named %r, not after the kitchen (%r)" % (r.get('name'), want_name)); return
    print('OK %s' % r['id'])

def fields(status, path, want_json):
    rows = load(path)
    if status != '200' or not isinstance(rows, list) or len(rows) != 1:
        print('the read back answered %s %s' % (status, json.dumps(rows)[:160])); return
    want, got = json.loads(want_json), rows[0]
    for key, value in want.items():
        have = got.get(key)
        if isinstance(value, float) and isinstance(have, (int, float)):
            same = round(have, 6) == round(value, 6)
        else:
            same = have == value
        if not same:
            print('%s reads back %r, sent %r' % (key, have, value)); return
    print('OK')

def stamped(status, path, want_json, sent_at):
    # `10.5-i-b-ii`: Google's point as sent, and its moment the database's — in the
    # shape the app reads (`instantFrom`), within two minutes of the call.
    import datetime, re
    rows = load(path)
    if status != '200' or not isinstance(rows, list) or len(rows) != 1:
        print('the read back answered %s %s' % (status, json.dumps(rows)[:160])); return
    want, got = json.loads(want_json), rows[0]
    for key, value in want.items():
        have = got.get(key)
        same = round(have, 6) == round(value, 6) if isinstance(value, float) and isinstance(have, (int, float)) else have == value
        if not same:
            print('%s reads back %r, sent %r' % (key, have, value)); return
    at = got.get('google_at')
    if not isinstance(at, str) or not re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}:\d{2}|Z)$', at):
        print('google_at reads back %r, not a moment in the shape the app reads' % (at,)); return
    moment = datetime.datetime.fromisoformat(at.replace('Z', '+00:00')).timestamp()
    if abs(moment - float(sent_at)) > 120:
        print('google_at reads back %s, not the moment it was written' % at); return
    print('OK %s' % at)

globals()[sys.argv[1]](*sys.argv[2:])
PY
verdict() { python3 "$SCRATCH/kitchen.py" "$@"; }
read_back() { # path want-json -> "OK" or why not
  local out; out="$(api GET "$1")"
  body "$out" > "$SCRATCH/back.json"
  verdict fields "$(status "$out")" "$SCRATCH/back.json" "$2"
}

# --- 8. the kitchens' trades, through the app's door --------------------------
out="$(api POST "/rest/v1/rpc/$GIROS_RPC" '{}')"
body "$out" > "$SCRATCH/giros.json"
body "$(api POST /rest/v1/rpc/catalog_template '{}')" > "$SCRATCH/template.json"
v="$(verdict giros "$(status "$out")" "$SCRATCH/giros.json" "$SCRATCH/template.json")"
TRADE="" SHOP_GIRO=""
if [[ "$v" == OK* ]]; then
  read -r _ TRADES TRADE SHOP_GIRO <<< "$v"
  ok "$GIROS_RPC() answers $TRADES trades as {code, label}, none of them a shop's giro"
else
  fail "the kitchens' trades: $v"
fi

# --- 9. her trade, by the app's update on her kitchen --------------------------
# ⚠️ AS SUPABASE-JS SENDS `.update().eq('id').select('id').single()`: the row asked
# back as one object, so a refusal is a 406, never a 200 that looks saved.
if [[ -n "$TRADE" ]]; then
  out="$(api PATCH "/rest/v1/$TABLE?id=eq.$KITCHEN&select=id" "$(by_names "$GIRO_COL" "\"$TRADE\"")" \
    'Prefer: return=representation' 'Accept: application/vnd.pgrst.object+json')"
  if [[ "$(status "$out")" != 200 ]] || ! grep -c "$KITCHEN" <<< "$(body "$out")" > /dev/null; then
    fail "the app's trade update answered $(status "$out") $(body "$out" | head -c 200)"
  else
    v1="$(read_back "/rest/v1/$TABLE?select=$GIRO_COL&id=eq.$KITCHEN" "{\"$GIRO_COL\": \"$TRADE\"}")"
    v2="$(read_back "/rest/v1/$TABLE?select=$GIRO_COL&id=eq.$SHOP" "{\"$GIRO_COL\": null}")"
    out="$(api PATCH "/rest/v1/$TABLE?id=eq.$KITCHEN&select=id" "$(by_names "$GIRO_COL" "\"$SHOP_GIRO\"")" \
      'Prefer: return=representation' 'Accept: application/vnd.pgrst.object+json')"
    if [[ "$v1" != OK ]]; then fail "her kitchen's trade: $v1"
    elif [[ "$v2" != OK ]]; then fail "her SHOP's trade changed when her kitchen's was written: $v2"
    elif [[ "$(status "$out")" != 400 ]] || ! grep -c '23514' <<< "$(body "$out")" > /dev/null; then
      fail "a shop's giro ($SHOP_GIRO) on her kitchen answered $(status "$out"), not 400 23514: $(body "$out" | head -c 160)"
    else ok "her trade is written on her kitchen by $GIRO_COL and reads back; her shop's is untouched; a shop's giro is refused (23514)"; fi
  fi
else
  fail "her trade: no trade to write — the trades' door gave none"
fi

# --- 10. her kitchen's place, by the app's read ---------------------------------
# ⚠️ NOT VACUOUS: the same read WITHOUT the kitchen's filter starts with her SHOP's
# store — made first — so a read that lost the filter would write her kitchen's
# address and pin onto her shop.
SHOP_STORE="$(body "$(api GET "/rest/v1/$PLACE_TABLE?select=id&$PLACE_OWNER=eq.$SHOP")" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin); print(r[0]["id"] if isinstance(r,list) and r else "")' 2>/dev/null)"
FIRST_SEEN="$(body "$(api GET "/rest/v1/$PLACE_TABLE?select=id&$PLACE_ACTIVE=eq.true&order=$PLACE_ORDER&limit=1")" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin); print(r[0]["id"] if isinstance(r,list) and r else "")' 2>/dev/null)"
out="$(api GET "$(place_read "$KITCHEN")")"
body "$out" > "$SCRATCH/place.json"
v="$(verdict place "$(status "$out")" "$SCRATCH/place.json" "$PLACE_COLUMNS" "Zona de la fonda" "$SHOP_STORE")"
PLACE_ID=""
if [[ "$v" == OK* ]]; then
  PLACE_ID="${v#OK }"
  out="$(api GET "$(place_read "$SECOND")")"
  body "$out" > "$SCRATCH/second.json"
  v2="$(verdict place "$(status "$out")" "$SCRATCH/second.json" "$PLACE_COLUMNS" "Antojitos, segunda cocina" "$SHOP_STORE,$PLACE_ID")"
  if [[ -z "$SHOP_STORE" || "$FIRST_SEEN" != "$SHOP_STORE" ]]; then
    fail "the unfiltered read's first place is $FIRST_SEEN, not her shop's store ($SHOP_STORE) — the filter is not shown to be what keeps it out"
  elif [[ "$v2" != OK* ]]; then fail "the second kitchen's place: $v2"
  else ok "the app's place read is her kitchen's own place, with exactly $PLACE_COLUMNS — unfiltered, the first is her shop's store"; fi
else
  fail "her kitchen's place: $v"
fi
[[ -n "$PLACE_ID" ]] || { echo; echo "$((fails)) assertion group(s) failed — no place to write her address and pin to."; exit 1; }

# --- 11. her address, through the app's door and names --------------------------
out="$(api POST "/rest/v1/rpc/$SET_ADDRESS" \
  "$(by_names "$SET_ADDRESS_ARGS" "\"$PLACE_ID\"" '"Fresno"' '"45"' 'null' '"Cuauhtémoc"' '"06400"')")"
if [[ "$(status "$out")" != 200 && "$(status "$out")" != 204 ]]; then
  fail "her address, $SET_ADDRESS($SET_ADDRESS_ARGS), answered $(status "$out") $(body "$out" | head -c 200)"
else
  v1="$(read_back "$(place_read "$KITCHEN")" '{"street":"Fresno","street_number":"45","colonia":null,"city":"Cuauhtémoc","postal_code":"06400"}')"
  v2="$(read_back "/rest/v1/$PLACE_TABLE?select=street,city,postal_code&id=eq.$SHOP_STORE" '{"street":null,"city":null,"postal_code":null}')"
  if [[ "$v1" != OK ]]; then fail "her address: $v1"
  elif [[ "$v2" != OK ]]; then fail "her SHOP's store got an address when her kitchen's was written: $v2"
  else ok "her address goes through $SET_ADDRESS and reads back as sent, the empty colonia as none; her shop's store has none"; fi
fi

# --- 12. her pin and its line, through the app's door and names -----------------
out="$(api POST "/rest/v1/rpc/$SET_PIN" \
  "$(by_names "$SET_PIN_ARGS" "\"$PLACE_ID\"" '19.451234' '-99.159876' '"Portón verde, junto a la farmacia"')")"
if [[ "$(status "$out")" != 200 && "$(status "$out")" != 204 ]]; then
  fail "her pin, $SET_PIN($SET_PIN_ARGS), answered $(status "$out") $(body "$out" | head -c 200)"
else
  v1="$(read_back "$(place_read "$KITCHEN")" '{"pin_lat":19.451234,"pin_lng":-99.159876,"directions":"Portón verde, junto a la farmacia"}')"
  out="$(api POST "/rest/v1/rpc/$SET_PIN" "$(by_names "$SET_PIN_ARGS" "\"$PLACE_ID\"" '19.451234' '-99.159876' 'null')")"
  v2="$(read_back "$(place_read "$KITCHEN")" '{"pin_lat":19.451234,"pin_lng":-99.159876,"directions":null}')"
  v3="$(read_back "/rest/v1/$PLACE_TABLE?select=pin_lat,pin_lng,directions&id=eq.$SHOP_STORE" '{"pin_lat":null,"pin_lng":null,"directions":null}')"
  if [[ "$v1" != OK ]]; then fail "her pin: $v1"
  elif [[ "$v2" != OK ]]; then fail "her pin with no line of directions: $v2"
  elif [[ "$v3" != OK ]]; then fail "her SHOP's store got a pin when her kitchen's was set: $v3"
  else ok "her pin goes through $SET_PIN and reads back to six decimals with its line, a blank line as none; her shop's store has no pin"; fi
fi

# `10.4h` — address first (`0075`): her line alone leaves her pin; her pin cleared
# leaves her line; her line with no pin reads back; her shop's store untouched.
out="$(api POST "/rest/v1/rpc/$SET_LINE" "$(by_names "$SET_LINE_ARGS" "\"$PLACE_ID\"" '"Portón verde, junto a la farmacia"')")"
if [[ "$(status "$out")" != 200 && "$(status "$out")" != 204 ]]; then
  fail "her line, $SET_LINE($SET_LINE_ARGS), answered $(status "$out") $(body "$out" | head -c 200)"
else
  v1="$(read_back "$(place_read "$KITCHEN")" '{"pin_lat":19.451234,"pin_lng":-99.159876,"directions":"Portón verde, junto a la farmacia"}')"
  out="$(api POST "/rest/v1/rpc/$CLEAR_PIN" "$(by_names "$CLEAR_PIN_ARGS" "\"$PLACE_ID\"")")"
  if [[ "$(status "$out")" != 200 && "$(status "$out")" != 204 ]]; then
    fail "her pin cleared, $CLEAR_PIN($CLEAR_PIN_ARGS), answered $(status "$out") $(body "$out" | head -c 200)"
  else
    v2="$(read_back "$(place_read "$KITCHEN")" '{"pin_lat":null,"pin_lng":null,"directions":"Portón verde, junto a la farmacia"}')"
    out="$(api POST "/rest/v1/rpc/$SET_LINE" "$(by_names "$SET_LINE_ARGS" "\"$PLACE_ID\"" '"Junto al mercado"')")"
    v3="$(read_back "$(place_read "$KITCHEN")" '{"pin_lat":null,"pin_lng":null,"directions":"Junto al mercado"}')"
    v4="$(read_back "/rest/v1/$PLACE_TABLE?select=pin_lat,pin_lng,directions&id=eq.$SHOP_STORE" '{"pin_lat":null,"pin_lng":null,"directions":null}')"
    if [[ "$v1" != OK ]]; then fail "her line alone, with her pin there: $v1"
    elif [[ "$v2" != OK ]]; then fail "her pin cleared: $v2"
    elif [[ "$v3" != OK ]]; then fail "her line with no pin: $v3"
    elif [[ "$v4" != OK ]]; then fail "her SHOP's store changed when her kitchen's line or pin did: $v4"
    else ok "her line goes through $SET_LINE and leaves her pin; $CLEAR_PIN clears her pin and leaves her line; her line with no pin reads back; her shop's store untouched"; fi
  fi
fi

# `10.5-i-b-ii` — Google's point for her address (`0078`), by the app's door and
# names, read back through the APP'S OWN place read (`PLACE_COLUMNS` carries the four
# columns): stamped by the database; none on her shop's store; and cleared by a new
# address — which is why the app writes it last.
google_read() { # want-json -> "OK <moment>" or why not
  local out; out="$(api GET "$(place_read "$KITCHEN")")"
  body "$out" > "$SCRATCH/google.json"
  verdict stamped "$(status "$out")" "$SCRATCH/google.json" "$1" "$SENT_AT"
}
SENT_AT="$(date +%s)"
out="$(api POST "/rest/v1/rpc/$SET_GOOGLE" "$(by_names "$SET_GOOGLE_ARGS" "\"$PLACE_ID\"" '19.451332' '-99.160113' '"ChIJ-contrato-45"')")"
if [[ "$(status "$out")" != 200 && "$(status "$out")" != 204 ]]; then
  fail "her Google point, $SET_GOOGLE($SET_GOOGLE_ARGS), answered $(status "$out") $(body "$out" | head -c 200)"
else
  v1="$(google_read '{"google_lat":19.451332,"google_lng":-99.160113,"google_place_id":"ChIJ-contrato-45"}')"
  SENT_AT="$(date +%s)"
  api POST "/rest/v1/rpc/$SET_GOOGLE" "$(by_names "$SET_GOOGLE_ARGS" "\"$PLACE_ID\"" '19.451401' '-99.160002' 'null')" > /dev/null
  v2="$(google_read '{"google_lat":19.451401,"google_lng":-99.160002,"google_place_id":null}')"
  shop_out="$(api POST "/rest/v1/rpc/$SET_GOOGLE" "$(by_names "$SET_GOOGLE_ARGS" "\"$SHOP_STORE\"" '19.4' '-99.1' '"ChIJ-tienda"')")"
  v3="$(read_back "/rest/v1/$PLACE_TABLE?select=google_lat,google_place_id,google_at&id=eq.$SHOP_STORE" '{"google_lat":null,"google_place_id":null,"google_at":null}')"
  # ⚠️ The order the app follows: a new address first — it clears the copy — then the copy for it.
  api POST "/rest/v1/rpc/$SET_ADDRESS" "$(by_names "$SET_ADDRESS_ARGS" "\"$PLACE_ID\"" '"Fresno"' '"47"' 'null' '"Cuauhtémoc"' '"06400"')" > /dev/null
  v4="$(read_back "$(place_read "$KITCHEN")" '{"street_number":"47","google_lat":null,"google_lng":null,"google_place_id":null,"google_at":null}')"
  SENT_AT="$(date +%s)"
  api POST "/rest/v1/rpc/$SET_GOOGLE" "$(by_names "$SET_GOOGLE_ARGS" "\"$PLACE_ID\"" '19.451288' '-99.160071' '"ChIJ-contrato-47"')" > /dev/null
  v5="$(google_read '{"street_number":"47","google_lat":19.451288,"google_lng":-99.160071,"google_place_id":"ChIJ-contrato-47"}')"
  if [[ "$v1" != OK* ]]; then fail "her Google point: $v1"
  elif [[ "$v2" != OK* ]]; then fail "her Google point with no ID: $v2"
  elif [[ "$(status "$shop_out")" != 400 || "$(pick code "$(body "$shop_out")")" != TD013 ]]; then
    fail "her Google point on her SHOP's store answered $(status "$shop_out") $(body "$shop_out" | head -c 160), not 400 TD013 — a shop is never drawn on Itacate's map"
  elif [[ "$v3" != OK ]]; then fail "her SHOP's store got a Google point: $v3"
  elif [[ "$v4" != OK ]]; then fail "a new address did not clear Google's point — written first, the app's copy would outlive the address it was for: $v4"
  elif [[ "$v5" != OK* ]]; then fail "her Google point written after her new address: $v5"
  else ok "her Google point goes through $SET_GOOGLE and reads back through the app's place read to six decimals with its ID, stamped by the database (${v1#OK }); with no ID, none; refused on her shop's store (TD013), which keeps none; a new address clears it, and written after the address it stays"; fi
fi

# --- 13. signed out, nothing ----------------------------------------------------
out="$(TOKEN="" api GET "$APP_READ")"
place_out="$(TOKEN="" api GET "$(place_read "$KITCHEN")")"
giros_out="$(TOKEN="" api POST "/rest/v1/rpc/$GIROS_RPC" '{}')"
pin_out="$(TOKEN="" api POST "/rest/v1/rpc/$SET_PIN" "$(by_names "$SET_PIN_ARGS" "\"$PLACE_ID\"" '19.4' '-99.1' 'null')")"
line_out="$(TOKEN="" api POST "/rest/v1/rpc/$SET_LINE" "$(by_names "$SET_LINE_ARGS" "\"$PLACE_ID\"" '"Otra"')")"
clear_out="$(TOKEN="" api POST "/rest/v1/rpc/$CLEAR_PIN" "$(by_names "$CLEAR_PIN_ARGS" "\"$PLACE_ID\"")")"
google_out="$(TOKEN="" api POST "/rest/v1/rpc/$SET_GOOGLE" "$(by_names "$SET_GOOGLE_ARGS" "\"$PLACE_ID\"" '19.4' '-99.1' 'null')")"
kdel_out="$(TOKEN="" api POST "/rest/v1/rpc/$KDELETE_RPC" "$(by_names "$KDELETE_ARGS" "\"$SECOND\"" '"Antojitos, segunda cocina"')")"
if grep -c '"id"' <<< "$(body "$out")" > /dev/null; then
  fail "signed out, the read returned businesses: $(body "$out" | head -c 200)"
elif grep -c '"id"' <<< "$(body "$place_out")" > /dev/null; then
  fail "signed out, the place read returned her place: $(body "$place_out" | head -c 200)"
elif [[ "$(status "$giros_out")" == 2* || "$(status "$pin_out")" == 2* || "$(status "$line_out")" == 2* || "$(status "$clear_out")" == 2* || "$(status "$google_out")" == 2* || "$(status "$kdel_out")" == 2* ]]; then
  fail "signed out, the trades answered $(status "$giros_out"), the pin $(status "$pin_out"), the line $(status "$line_out"), the clearing $(status "$clear_out"), Google's point $(status "$google_out") and the kitchen's deletion $(status "$kdel_out") — nothing is reachable without an account"
else
  ok "signed out: no business ($(status "$out")), no place ($(status "$place_out")), no trades ($(status "$giros_out")), no pin set ($(status "$pin_out")), no line set ($(status "$line_out")), no pin cleared ($(status "$clear_out")), no Google point set ($(status "$google_out")), no kitchen deleted ($(status "$kdel_out"))"
fi

# =============================================================================
# `10.4b-iii-c` — HER WAY OUT. What goes with her account and the deletion, by the
# app's names: first as this login — a shop and two kitchens, all hers alone —
# then as a shop's owner who opens Cocina and never makes a kitchen.
# =============================================================================
OWNERS_READ="/rest/v1/$OWNERS_TABLE?select=$OWNER_COLUMNS&$OWNER_ROLE_COL=eq.$OWNER_ROLE&$OWNER_ACTIVE_COL=eq.true"
# How many of these businesses the database still holds, asked as the superuser.
exists() { # ids-csv -> a count
  local list
  list="$(tr ',' '\n' <<< "$1" | sed "s/.*/'&'/" | paste -sd, -)"
  supabase db query --local -o csv "select count(*)::int from public.workspace where id in ($list)" 2>/dev/null | tail -1
}
cat > "$SCRATCH/owners.py" <<'OWNERS'
import json, sys
status, path, me, expected = sys.argv[1], sys.argv[2], sys.argv[3], json.loads(sys.argv[4])
try:
    rows = json.load(open(path))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if status != '200' or not isinstance(rows, list):
    print("the app's owners read answered %s %s" % (status, json.dumps(rows)[:200])); raise SystemExit
by = {}
for r in rows:
    if not isinstance(r, dict) or set(r) != {'workspace_id', 'user_id', 'workspace'}:
        print('an owner row came as %s' % json.dumps(r)[:160]); raise SystemExit
    if not isinstance(r['workspace'], dict) or set(r['workspace']) != {'display_name', 'kind'}:
        print('an owner row embedded %s, not {display_name, kind}' % json.dumps(r['workspace'])); raise SystemExit
    by.setdefault(r['workspace_id'], []).append(r)
if set(by) != set(expected):
    print('the owners read named businesses %s, expected %s' % (sorted(by), sorted(expected))); raise SystemExit
for wid, (name, kind) in expected.items():
    owners = [g['user_id'] for g in by[wid]]
    if owners != [me]:
        print('business %s came back with owners %s, expected her alone' % (wid, owners)); raise SystemExit
    ws = by[wid][0]['workspace']
    if ws != {'display_name': name, 'kind': kind}:
        print('business %s came back as %s, expected %s' % (wid, ws, {'display_name': name, 'kind': kind})); raise SystemExit
print('OK')
OWNERS
owners_read() { # user-id expected-json -> "OK" or why not
  local out; out="$(api GET "$OWNERS_READ")"
  body "$out" > "$SCRATCH/owners.json"
  python3 "$SCRATCH/owners.py" "$(status "$out")" "$SCRATCH/owners.json" "$1" "$2"
}
expect() { python3 -c 'import json,sys; a=sys.argv[1:]; print(json.dumps({a[i]: [a[i+1], a[i+2]] for i in range(0, len(a), 3)}))' "$@"; }

# --- 14. what goes with her account, as the app reads it -------------------------
v="$(owners_read "$UID_" "$(expect "$SHOP" "Tienda de la fonda" tienda "$KITCHEN" "Zona de la fonda" cocina "$SECOND" "Antojitos, segunda cocina" cocina)")"
if [[ "$v" == OK ]]; then ok "the app's owners read names her shop and her two kitchens, each with her as its only owner and its kind — what goes with her account"
else fail "what goes with her account: $v"; fi

# =============================================================================
# `10.5-iii-c` — HER KITCHEN DELETED ALONE (`0077`), by the app's names: her second
# kitchen goes, and only it; her login, her shop and her first kitchen stay.
# =============================================================================

# --- 15. her second kitchen alone, a wrong name: refused, and nothing goes ------
HELD="$(exists "$SHOP,$KITCHEN,$SECOND")"
out="$(api POST "/rest/v1/rpc/$KDELETE_RPC" "$(by_names "$KDELETE_ARGS" "\"$SECOND\"" '"Antojitos, tercera cocina"')")"
STILL="$(exists "$SHOP,$KITCHEN,$SECOND")"
if [[ "$HELD" != 3 ]]; then
  fail "before any deletion the database holds '$HELD' of her three businesses — the observer cannot see them"
elif [[ "$(status "$out")" == 400 && "$(pick code "$(body "$out")")" == "$MISMATCH" && "$STILL" == 3 ]]; then
  ok "$KDELETE_RPC($KDELETE_ARGS) for her second kitchen with a wrong name: 400 $MISMATCH, and all three businesses are still there"
else
  fail "her kitchen alone with a wrong name answered $(status "$out") $(body "$out" | head -c 200); the database holds $STILL of 3"
fi

# --- 16. her shop through the kitchen's door: refused, and it stays ---------------
out="$(api POST "/rest/v1/rpc/$KDELETE_RPC" "$(by_names "$KDELETE_ARGS" "\"$SHOP\"" '"Tienda de la fonda"')")"
if [[ "$(status "$out")" == 400 && "$(exists "$SHOP,$KITCHEN,$SECOND")" == 3 ]]; then
  ok "her shop through the kitchen's door, its right name: 400 $(pick code "$(body "$out")") — a shop goes only with its owner's account — and all three are still there"
else
  fail "her shop through the kitchen's door answered $(status "$out") $(body "$out" | head -c 200); the database holds $(exists "$SHOP,$KITCHEN,$SECOND") of 3"
fi

# --- 17. her second kitchen's name: it goes, alone, and she is still signed in ----
out="$(api POST "/rest/v1/rpc/$KDELETE_RPC" "$(by_names "$KDELETE_ARGS" "\"$SECOND\"" '"  ANTOJITOS,   segunda cocina "')")"
GONE="$(exists "$SECOND")"
KEPT="$(exists "$SHOP,$KITCHEN")"
WHO="$(status "$(api GET /auth/v1/user)")"
v="$(app_read "$KITCHEN")"
again="$(api POST "/rest/v1/rpc/$KDELETE_RPC" "$(by_names "$KDELETE_ARGS" "\"$SECOND\"" '"Antojitos, segunda cocina"')")"
if [[ "$(status "$out")" == 200 && "$(pick business_deleted "$(body "$out")")" == "$SECOND" && "$GONE" == 0 && "$KEPT" == 2 \
      && "$WHO" == 200 && "$v" == OK && "$(status "$again")" == 400 && "$(pick code "$(body "$again")")" == "$NOT_HERS" ]]; then
  ok "her second kitchen's name, in another case and spacing: 200, that kitchen gone and only it — her shop and her first kitchen there, her login still signed in ($WHO), the app's read her first kitchen alone; the same call again 400 $NOT_HERS"
else
  fail "her kitchen alone answered $(status "$out") $(body "$out" | head -c 200); the second kitchen left: $GONE; her shop and first kitchen: $KEPT of 2; her login answers $WHO; the app's read: $v; the same call again: $(status "$again") $(body "$again" | head -c 120)"
fi

# --- 18. the account, a name missing: refused, and nothing goes -------------------
HELD="$(exists "$SHOP,$KITCHEN")"
out="$(api POST "/rest/v1/rpc/$DELETE_RPC" "$(by_names "$DELETE_ARGS" '["Zona de la fonda"]')")"
STILL="$(exists "$SHOP,$KITCHEN")"
if [[ "$HELD" != 2 ]]; then
  fail "before her account's deletion the database holds '$HELD' of her two businesses — the observer cannot see them"
elif [[ "$(status "$out")" == 400 && "$(pick code "$(body "$out")")" == "$MISMATCH" && "$STILL" == 2 ]]; then
  ok "$DELETE_RPC($DELETE_ARGS) with her shop's name missing: 400 $MISMATCH, and both businesses are still there"
else
  fail "the deletion with a name missing answered $(status "$out") $(body "$out" | head -c 200); the database holds $STILL of 2"
fi

# --- 19. every name, as she might type them: both go, and her login ---------------
out="$(api POST "/rest/v1/rpc/$DELETE_RPC" "$(by_names "$DELETE_ARGS" '["  zona de la FONDA", "TIENDA DE LA FONDA"]')")"
LEFT="$(exists "$SHOP,$KITCHEN")"
WHO="$(status "$(api GET /auth/v1/user)")"
if [[ "$(status "$out")" == 200 && "$(pick shops_deleted "$(body "$out")")" == 2 && "$(pick shops_left "$(body "$out")")" == 0 \
      && "$LEFT" == 0 && "$WHO" != 200 ]]; then
  ok "every name, in any case and spacing: 200 {2 deleted, 0 left}; the database holds neither, and her login is gone ($WHO)"
else
  fail "the deletion with every name answered $(status "$out") $(body "$out" | head -c 200); the database holds $LEFT of 2; her login answers $WHO"
fi

# --- 20–21. a shop's owner who opens Cocina and never makes a kitchen --------------
python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": "cocina-probe-123", "data": {sys.argv[2]: sys.argv[3]}}))' \
  "cocina-tienda-$STAMP@example.com" "$NAME_KEY" "Dueña de Tienda" > "$SCRATCH/signup-shop.json"
TOKEN=""
for try in 1 2 3 4 5 6; do
  out="$(TOKEN="" api POST /auth/v1/signup "$(cat "$SCRATCH/signup-shop.json")")"
  TOKEN="$(pick access_token "$(body "$out")")"
  [[ -n "$TOKEN" ]] && break
  sleep 10
done
if [[ -z "$TOKEN" ]]; then
  fail "a shop's owner's sign-up got no session — $(status "$out") $(body "$out" | head -c 200)"
else
  SHOP_UID="$(pick id "$(body "$(api GET /auth/v1/user)")")"
  HER_SHOP="$(body "$(api POST /rest/v1/rpc/onboard_workspace \
    '{"p_display_name":"Tienda de Lupe","p_prices_include_tax":true,"p_location_name":null}')" | tr -d '"')"
  if [[ ! "$HER_SHOP" =~ ^[0-9a-f-]{36}$ ]]; then
    fail "could not make the shop's owner's shop: $HER_SHOP"
  else
    v="$(owners_read "$SHOP_UID" "$(expect "$HER_SHOP" "Tienda de Lupe" tienda)")"
    out="$(api POST "/rest/v1/rpc/$DELETE_RPC" "$(by_names "$DELETE_ARGS" '[]')")"
    if [[ "$v" != OK ]]; then fail "a shop's owner, what goes with her account: $v"
    elif [[ "$(status "$out")" != 400 || "$(pick code "$(body "$out")")" != "$MISMATCH" || "$(exists "$HER_SHOP")" != 1 ]]; then
      fail "an empty list from a shop's owner answered $(status "$out") $(body "$out" | head -c 160) — her shop must stay"
    else
      ok "a shop's owner with no kitchen: the read names her shop as a shop, and an empty list — a screen that thought nothing goes — is 400 $MISMATCH, her shop still there"
    fi

    out="$(api POST "/rest/v1/rpc/$DELETE_RPC" "$(by_names "$DELETE_ARGS" '["tienda de LUPE"]')")"
    LEFT="$(exists "$HER_SHOP")"
    WHO="$(status "$(api GET /auth/v1/user)")"
    if [[ "$(status "$out")" == 200 && "$(pick shops_deleted "$(body "$out")")" == 1 && "$(pick shops_left "$(body "$out")")" == 0 \
          && "$LEFT" == 0 && "$WHO" != 200 ]]; then
      ok "her shop's name, typed in Cocina: 200 {1 deleted, 0 left}; her shop is gone, and her login ($WHO)"
    else
      fail "the shop's owner's deletion answered $(status "$out") $(body "$out" | head -c 200); the database holds $LEFT of 1; her login answers $WHO"
    fi
  fi
fi

echo
if (( fails > 0 )); then
  echo "$fails assertion group(s) failed."
  exit 1
fi
echo "all 21 assertion groups passed — Wera Cocina's kitchen read is one the database answers, it opens"
echo "kitchens only and the first-made first, the name typed at sign-up reaches her membership, her"
echo "kitchen is made, given its trade, its address and its pin on its own place — never on her shop —"
echo "her line is saved without a pin and her pin cleared without her line (10.4h), Google's point for her"
echo "address is kept by its one door, stamped by the database and cleared by a new address (10.5-i-b-ii), one kitchen goes"
echo "alone after its name with her login and her other businesses kept, never her shop (10.5-iii-c),"
echo "and her account goes only with every business she alone owns named, a shop of hers included —"
echo "by the names Itacate's way out sends too (10.5-iii-b)."

#!/usr/bin/env bash
# 10.4b-iii-a-cocina-contract — does Wera Cocina's data layer still describe the
# schema, and does it open kitchens and nothing else?
#
# WHY THIS EXISTS. `cocina/src/api/kitchen.ts` is Cocina's first claim about the
# applied schema: a table, three columns, a filter on the account's kind and an
# order. A misspelt column or kind is a 400 on the phone that the typecheck, the
# suite and the bundler all pass over, and a filter on the wrong kind opens a
# shop's owner's SHOP in the kitchens' app — the walls let a login read every
# business she belongs to (`my_workspaces()`), so only the filter keeps Wera's
# shops out (`0072`, ADR-035 §2.3). And `cocina/src/auth/credentials.ts` names
# the key a person's name is stored under at sign-up, which the database reads
# when she makes a business (`auth_full_name`, `0034`).
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF THOSE TWO FILES — nothing is retyped here.
#   2. A fonda signs up by the email door as Cocina does, her name under that key,
#      and gets a session at once (confirmations off, as on the hosted project).
#   3. With no business, the app's read answers 200 and `[]` — the landing.
#   4. She makes a shop as every Wera build does: the unfiltered read returns it
#      (the walls' answer, so the next assertion is not vacuous) and the app's
#      read is still `[]` — a shop's owner who opens Cocina lands where a kitchen
#      is made, and never in her shop.
#   5. She makes a kitchen as Cocina will (`p_kind => 'cocina'`): the app's read is
#      that kitchen alone, with exactly the columns it asks for.
#   6. A second kitchen: both, the first-made first — the one the app opens.
#   7. The name she typed is on her kitchen membership — the key, end to end.
#   8. Signed out, the read returns no business at all.
#
# ⚠️ WHAT IT DOES NOT ASSERT: Google's and Apple's sign-ins. Neither runs on this
# stack (both providers are off in `supabase/config.toml`), Apple's needs a token
# Apple signed, and Google's needs the hosted redirect list — the owner's phones,
# plan `10.4b-iii-a`'s look.
#
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.4b-iii-a-cocina-contract.sh
# With: $1 a copy of kitchen.ts and $2 a copy of credentials.ts — how the falsifier
#       points it at a broken one.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

KITCHEN_TS="${1:-cocina/src/api/kitchen.ts}"
CREDENTIALS_TS="${2:-cocina/src/auth/credentials.ts}"
for f in "$KITCHEN_TS" "$CREDENTIALS_TS"; do
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

for pair in "WORKSPACE_TABLE:$TABLE" "KITCHEN_COLUMNS:$COLUMNS" "KIND_COLUMN:$KIND_COL" \
            "COCINA_KIND:$KIND" "KITCHEN_ORDER:$ORDER_COLS" "FULL_NAME_KEY:$NAME_KEY"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the app's source"
    echo "      This check asserts the app's own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
# The order as supabase-js sends it: `.order(c)` once per column, each ascending.
ORDER="$(tr ',' '\n' <<< "$ORDER_COLS" | sed 's/$/.asc/' | paste -sd, -)"
APP_READ="/rest/v1/$TABLE?select=$COLUMNS&$KIND_COL=eq.$KIND&order=$ORDER"
ok "read from the app: $TABLE?select=$COLUMNS, $KIND_COL = $KIND, ordered by $ORDER_COLS; the name under $NAME_KEY"

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
api() { # method path body -> body, with the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" auth="${TOKEN:-}"
  if [[ -n "$auth" ]]; then auth="Authorization: Bearer $auth"; else auth="X-Empty: 1"; fi
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" \
      -H "apikey: $KEY" -H "$auth" -H 'Content-Type: application/json' -d "$body"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth"
  fi
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

# --- 5. her kitchen, as Cocina will make it ---------------------------------
KITCHEN="$(body "$(api POST /rest/v1/rpc/onboard_workspace '{"p_display_name":"Zona de la fonda","p_kind":"cocina"}')" | tr -d '"')"
[[ "$KITCHEN" =~ ^[0-9a-f-]{36}$ ]] || { fail "could not make the kitchen: $KITCHEN"; exit 1; }
v="$(app_read "$KITCHEN")"
if [[ "$v" == OK ]]; then ok "with a shop and a kitchen, the app's read is the kitchen alone, with exactly $COLUMNS"
else fail "with a shop and a kitchen: $v"; fi

# --- 6. a second kitchen: the first-made opens -------------------------------
# ⚠️ ITS NAME SORTS BEFORE THE FIRST ONE'S, so an order by name — or by nothing,
# when the heap happens to agree with the alphabet — cannot pass for the order
# by creation. A second apart, so the two times differ.
sleep 1
SECOND="$(body "$(api POST /rest/v1/rpc/onboard_workspace '{"p_display_name":"Antojitos, segunda cocina","p_kind":"cocina"}')" | tr -d '"')"
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

# --- 8. signed out, nothing ---------------------------------------------------
out="$(TOKEN="" api GET "$APP_READ")"
if grep -c '"id"' <<< "$(body "$out")" > /dev/null; then
  fail "signed out, the read returned businesses: $(body "$out" | head -c 200)"
else
  ok "signed out, the read returns no business ($(status "$out"))"
fi

echo
if (( fails > 0 )); then
  echo "$fails assertion group(s) failed."
  exit 1
fi
echo "all 8 assertion groups passed — Wera Cocina's kitchen read is one the database answers,"
echo "it opens kitchens only and the first-made first, and the name typed at sign-up reaches her membership."

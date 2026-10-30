#!/usr/bin/env bash
# ============================================================================
# 5R-c — account deletion, held to a real PostgREST
# ============================================================================
# docs/PLAN.md task `5R-c`. ADR-035 §2.7. Migration `0053`.
#
#   supabase start && supabase db reset
#   bash docs/checks/5R-c-account-deletion-contract.sh [account.ts] [members.ts]
#
# `app/src/api/account.ts` names one RPC, its two `p_` arguments, one refusal
# code, and (since `10.4b-i`) the read that says which businesses go with the
# account. No typecheck has ever read `0053` or `0073`, so this file reads those
# strings OUT OF THE APP and puts them in front of a reset database, over HTTP,
# as the phone would.
#
# WHAT IT ASSERTS, each measured on the wire:
#   1. the app's constants are readable (or this check would assert nothing);
#   2. an anonymous caller is refused (401 42501);
#   3. a cashier deletes: 200 {shops_deleted 0, shops_left 1}; the owner then
#      reads her membership through MEMBER_COLUMNS as INACTIVE with her name —
#      which is what `whoOf` turns into "(ex-miembro)";
#   4. ⚠️ her token, still valid, reads no shop; and her password no longer
#      signs her in;
#   5. ⚠️⚠️ the only owner with the WRONG name: the app's code (TD007) arrives,
#      and as HTTP 400 — a custom SQLSTATE is not a privilege error to
#      PostgREST — and the shop is still there afterwards;
#   6. the only owner with the right name: 200 {1, 0}, and the shop is gone.
#   7. `0073` (plan `10.4b-i`): a person who alone owns a shop AND a kitchen —
#      the app's owners read (`OWNERS_TABLE`, `OWNER_COLUMNS`, `OWNER_ROLE`)
#      returns both, each with her as its only owner and with its kind;
#   8. ⚠️⚠️ the body every Wera build before `0073` sends — her shop's name in
#      the old argument — is refused `TD007`, and both businesses are still
#      there: one name never deletes a kitchen nobody named;
#   9. the app's body for her — one name per business in the new list — is
#      200 {2, 0}, and both are gone.
#
# ⚠️ AND WHAT IT CANNOT CLAIM: which warning the screen draws, and how it looks
# (R9). That is `app/test/api-account.test.ts` for the decision, and the
# owner's phone for the look.
# ============================================================================

set -uo pipefail

CONTRACT="${1:-app/src/api/account.ts}"
MEMBERS="${2:-app/src/api/members.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }
[[ -r "$MEMBERS" ]] || { echo "FAIL: cannot read $MEMBERS"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }

DELETE_RPC="$(str DELETE_MY_ACCOUNT "$CONTRACT")"
MISMATCH="$(str NAME_MISMATCH_CODE "$CONTRACT")"
MEMBER_COLUMNS="$(str MEMBER_COLUMNS "$MEMBERS")"
ARG_NAMES="$(awk '/^export interface DeleteArgs/{f=1;next} f&&/^}/{exit} f' "$CONTRACT" \
  | sed -n 's/^ *readonly \(p_[a-z_]*\)?\{0,1\}:.*/\1/p' | paste -sd, -)"
OLD_ARG="${ARG_NAMES%%,*}"
LIST_ARG="${ARG_NAMES#*,}"
OWNERS_TABLE="$(str OWNERS_TABLE "$CONTRACT")"
OWNER_COLUMNS="$(str OWNER_COLUMNS "$CONTRACT")"
OWNER_ROLE="$(str OWNER_ROLE "$CONTRACT")"

note
for name in DELETE_RPC MISMATCH MEMBER_COLUMNS ARG_NAMES OWNERS_TABLE OWNER_COLUMNS OWNER_ROLE; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app — this check would assert nothing"
    exit 1
  fi
done
if [[ "$ARG_NAMES" != "p_shop_name,p_business_names" ]]; then
  fail "DeleteArgs names '$ARG_NAMES'; 0073 declares p_shop_name,p_business_names."
  echo "      PostgREST matches an RPC by its argument NAMES, so a renamed one is a"
  echo "      404 PGRST202 — the function is not found, rather than refused."
else
  ok "read from the app: $DELETE_RPC($ARG_NAMES), refusal $MISMATCH; owners from $OWNERS_TABLE [$OWNER_COLUMNS] where role=$OWNER_ROLE"
fi

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

PASSWORD="account-5rc-123"
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

delete_body() { # name-or-empty -> the JSON body, keyed by the app's FIRST argument name
  python3 -c '
import json, sys
v = sys.argv[2] if sys.argv[2] != "" else None
print(json.dumps({sys.argv[1]: v}))' "$OLD_ARG" "$1"
}
list_body() { # name... -> the body the app sends when more than one business goes
  python3 -c '
import json, sys
print(json.dumps({sys.argv[1]: None, sys.argv[2]: sys.argv[3:]}))' "$OLD_ARG" "$LIST_ARG" "$@"
}

STAMP="$$-$(date +%s)"
OWNER_EMAIL="cuenta-owner-$STAMP@example.com"
STAFF_EMAIL="cuenta-staff-$STAMP@example.com"
SHOP="Tienda Contrato 5R-c"

note
ANON="$(TOKEN="" api POST "/rest/v1/rpc/$DELETE_RPC" "$(delete_body '')")"
if [[ "$(status "$ANON")" == "401" && "$(pick code "$(body "$ANON")")" == "42501" ]]; then
  ok "an anonymous caller is refused — 401 42501"
else
  fail "an anonymous $DELETE_RPC answered $(status "$ANON") $(body "$ANON") — expected 401 42501"
fi

signup "$OWNER_EMAIL" "Dueña Contrato"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  "{\"p_display_name\":\"$SHOP\",\"p_prices_include_tax\":true,\"p_location_name\":null}")"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" && "$(status "$CREATED")" == "200" ]] \
  || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

LOCATION_ID="$(first id "$(body "$(api GET '/rest/v1/location?select=id')")")"
INVITE="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "$STAFF_EMAIL" "$LOCATION_ID")"
INVITE_TOKEN="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$INVITE")")")"
[[ -n "$INVITE_TOKEN" ]] || { echo "FAIL: create_invite returned no token for the cashier"; exit 1; }
signup "$STAFF_EMAIL" "Cajera Contrato"; STAFF_TOKEN="$TOKEN"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$INVITE_TOKEN\"}" > /dev/null
STAFF_ID="$(python3 -c '
import base64, json, sys
p = sys.argv[1].split(".")[1]; p += "=" * (-len(p) % 4)
print(json.loads(base64.urlsafe_b64decode(p))["sub"])' "$STAFF_TOKEN")"

note
TOKEN="$STAFF_TOKEN"
GONE="$(api POST "/rest/v1/rpc/$DELETE_RPC" "$(delete_body '')")"
if [[ "$(status "$GONE")" == "200" \
      && "$(pick shops_deleted "$(body "$GONE")")" == "0" \
      && "$(pick shops_left "$(body "$GONE")")" == "1" ]]; then
  ok "a cashier deletes her account: 200 {shops_deleted: 0, shops_left: 1}"
else
  fail "the cashier's deletion answered $(status "$GONE") $(body "$GONE")"
fi

note
TOKEN="$OWNER_TOKEN"
ROW="$(api GET "/rest/v1/workspace_member?select=$MEMBER_COLUMNS&user_id=eq.$STAFF_ID")"
if [[ "$(first is_active "$(body "$ROW")")" == "False" \
      && "$(first display_name "$(body "$ROW")")" == "Cajera Contrato" ]]; then
  ok "the owner reads her as a former member through MEMBER_COLUMNS: inactive, name kept"
else
  fail "her membership read back as $(status "$ROW") $(body "$ROW")"
fi

note
TOKEN="$STAFF_TOKEN"
SHOPS="$(api GET '/rest/v1/workspace?select=id')"
LOGIN="$(TOKEN="" api POST '/auth/v1/token?grant_type=password' \
  "{\"email\":\"$STAFF_EMAIL\",\"password\":\"$PASSWORD\"}")"
if [[ "$(count "$(body "$SHOPS")")" == "0" && -z "$(pick access_token "$(body "$LOGIN")")" ]]; then
  ok "her still-valid token reads no shop, and her password signs nobody in ($(status "$LOGIN"))"
else
  fail "after deletion: shops $(body "$SHOPS"); sign-in $(status "$LOGIN") $(body "$LOGIN" | head -c 160)"
fi

note
TOKEN="$OWNER_TOKEN"
WRONG="$(api POST "/rest/v1/rpc/$DELETE_RPC" "$(delete_body 'Otra tienda')")"
STILL="$(api GET "/rest/v1/workspace?select=id&id=eq.$WORKSPACE_ID")"
if [[ "$(status "$WRONG")" == "400" && "$(pick code "$(body "$WRONG")")" == "$MISMATCH" \
      && "$(count "$(body "$STILL")")" == "1" ]]; then
  ok "the only owner with the wrong name: 400 $MISMATCH, and the shop is still there"
else
  fail "the wrong name answered $(status "$WRONG") $(body "$WRONG"); shop read $(body "$STILL")"
fi

note
RIGHT="$(api POST "/rest/v1/rpc/$DELETE_RPC" "$(delete_body '  tienda contrato 5r-c ')")"
AFTER="$(api GET "/rest/v1/workspace?select=id&id=eq.$WORKSPACE_ID")"
if [[ "$(status "$RIGHT")" == "200" \
      && "$(pick shops_deleted "$(body "$RIGHT")")" == "1" \
      && "$(pick shops_left "$(body "$RIGHT")")" == "0" \
      && "$(count "$(body "$AFTER")")" == "0" ]]; then
  ok "the only owner with the name (any case, any spacing): 200 {1, 0}, and the shop is gone"
else
  fail "the right name answered $(status "$RIGHT") $(body "$RIGHT"); shop read $(body "$AFTER")"
fi

# --- 7–9. `0073`: a shop AND a kitchen, both hers alone ----------------------
TWO_EMAIL="cuenta-dos-$STAMP@example.com"
signup "$TWO_EMAIL" "Dueña de Dos"; TWO_TOKEN="$TOKEN"
TWO_SHOP="Tienda Dos 5R-c"; TWO_KITCHEN="Cocina Dos 5R-c"
# ⚠️ EACH BODY ON ITS OWN LINE: JSON written inline inside a NESTED `$( )` loses
# its quoting and PostgREST answers PGRST102 (`5c-ii-a`'s trap, met again here).
SHOP_BODY="$(python3 -c 'import json,sys; print(json.dumps({"p_display_name": sys.argv[1]}))' "$TWO_SHOP")"
KITCHEN_BODY="$(python3 -c 'import json,sys; print(json.dumps({"p_display_name": sys.argv[1], "p_kind": "cocina"}))' "$TWO_KITCHEN")"
MADE="$(api POST /rest/v1/rpc/onboard_workspace "$SHOP_BODY")"
SHOP_ID="$(body "$MADE" | tr -d '"')"
MADE="$(api POST /rest/v1/rpc/onboard_workspace "$KITCHEN_BODY")"
KITCHEN_ID="$(body "$MADE" | tr -d '"')"
UUID='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
[[ "$SHOP_ID" =~ $UUID && "$KITCHEN_ID" =~ $UUID ]] \
  || { echo "FAIL: could not make her shop and her kitchen — '$SHOP_ID' '$KITCHEN_ID'"; exit 1; }
TWO_ID="$(python3 -c '
import base64, json, sys
p = sys.argv[1].split(".")[1]; p += "=" * (-len(p) % 4)
print(json.loads(base64.urlsafe_b64decode(p))["sub"])' "$TWO_TOKEN")"

note
OWNERS="$(api GET "/rest/v1/$OWNERS_TABLE?select=$OWNER_COLUMNS&role=eq.$OWNER_ROLE&is_active=eq.true")"
VERDICT="$(python3 -c '
import json, sys
status, raw, me, shop, kitchen, shop_name, kitchen_name = sys.argv[1:8]
if status != "200":
    print("HTTP %s %s" % (status, raw[:160])); raise SystemExit
rows = json.loads(raw)
mine = {}
for r in rows:
    mine.setdefault(r.get("workspace_id"), []).append(r)
want = {shop: (shop_name, "tienda"), kitchen: (kitchen_name, "cocina")}
for wid, (name, kind) in want.items():
    got = mine.get(wid, [])
    if len(got) != 1 or got[0].get("user_id") != me:
        print("business %s came back with owners %r" % (wid, [g.get("user_id") for g in got])); raise SystemExit
    ws = got[0].get("workspace") or {}
    if ws.get("display_name") != name or ws.get("kind") != kind:
        print("business %s came back as %r" % (wid, ws)); raise SystemExit
print("ok")' "$(status "$OWNERS")" "$(body "$OWNERS")" "$TWO_ID" "$SHOP_ID" "$KITCHEN_ID" "$TWO_SHOP" "$TWO_KITCHEN")"
if [[ "$VERDICT" == "ok" ]]; then
  ok "the owners read returns her shop and her kitchen, each with her as its only owner and its kind"
else
  fail "the owners read is not what businessesThatGo needs: $VERDICT"
fi

note
OLD="$(api POST "/rest/v1/rpc/$DELETE_RPC" "$(delete_body "$TWO_SHOP")")"
BOTH="$(api GET "/rest/v1/workspace?select=id&id=in.($SHOP_ID,$KITCHEN_ID)")"
if [[ "$(status "$OLD")" == "400" && "$(pick code "$(body "$OLD")")" == "$MISMATCH" \
      && "$(count "$(body "$BOTH")")" == "2" ]]; then
  ok "an old build's body — her shop's name alone — is 400 $MISMATCH, and both businesses are still there"
else
  fail "the old body answered $(status "$OLD") $(body "$OLD"); businesses read $(body "$BOTH")"
fi

note
NEW="$(api POST "/rest/v1/rpc/$DELETE_RPC" "$(list_body "$TWO_SHOP" " cocina DOS 5r-c")")"
GONE_BOTH="$(api GET "/rest/v1/workspace?select=id&id=in.($SHOP_ID,$KITCHEN_ID)")"
if [[ "$(status "$NEW")" == "200" \
      && "$(pick shops_deleted "$(body "$NEW")")" == "2" \
      && "$(pick shops_left "$(body "$NEW")")" == "0" \
      && "$(count "$(body "$GONE_BOTH")")" == "0" ]]; then
  ok "the app's body — a name for each business in $LIST_ARG — is 200 {2, 0}, and both are gone"
else
  fail "the list body answered $(status "$NEW") $(body "$NEW"); businesses read $(body "$GONE_BOTH")"
fi

echo
if (( fails == 0 && ran < 10 )); then
  echo "FAIL: only $ran assertion groups ran, expected 10 — this check asserted almost nothing."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — the app's names reach 0053 and 0073, a cashier"
  echo "leaves a named former member behind, a shop goes only with its name typed, and"
  echo "a shop and a kitchen go only with both names."
  exit 0
fi
echo "$ran group(s) ran, $fails failed."
exit 1

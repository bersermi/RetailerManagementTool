#!/usr/bin/env bash
# ============================================================================
# 5R-c — account deletion, held to a real PostgREST
# ============================================================================
# docs/PLAN.md task `5R-c`. ADR-035 §2.7. Migration `0053`.
#
#   supabase start && supabase db reset
#   bash docs/checks/5R-c-account-deletion-contract.sh [account.ts] [members.ts]
#
# `app/src/api/account.ts` names one RPC, one `p_` argument and one refusal
# code. No typecheck has ever read `0053`, so this file reads those strings OUT
# OF THE APP and puts them in front of a reset database, over HTTP, as the phone
# would.
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
  | sed -n 's/^ *readonly \(p_[a-z_]*\):.*/\1/p' | paste -sd, -)"

note
for name in DELETE_RPC MISMATCH MEMBER_COLUMNS ARG_NAMES; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app — this check would assert nothing"
    exit 1
  fi
done
if [[ "$ARG_NAMES" != "p_shop_name" ]]; then
  fail "DeleteArgs names '$ARG_NAMES'; 0053 declares p_shop_name."
  echo "      PostgREST matches an RPC by its argument NAMES, so a renamed one is a"
  echo "      404 PGRST202 — the function is not found, rather than refused."
else
  ok "read from the app: $DELETE_RPC($ARG_NAMES), refusal $MISMATCH"
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

delete_body() { # name-or-empty -> the JSON body, keyed by the app's argument name
  python3 -c '
import json, sys
v = sys.argv[2] if sys.argv[2] != "" else None
print(json.dumps({sys.argv[1]: v}))' "$ARG_NAMES" "$1"
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

echo
if (( fails == 0 && ran < 7 )); then
  echo "FAIL: only $ran assertion groups ran, expected 7 — this check asserted almost nothing."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — the app's names reach 0053, a cashier leaves a"
  echo "named former member behind, and a shop goes only with its name typed."
  exit 0
fi
echo "$ran group(s) ran, $fails failed."
exit 1

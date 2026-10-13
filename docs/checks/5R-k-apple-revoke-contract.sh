#!/usr/bin/env bash
# ============================================================================
# 5R-k — the function that tells Apple, held to the real edge runtime
# ============================================================================
# docs/PLAN.md task `5R-k`. ADR-035's amendment of 2026-10-13.
#
#   supabase start && supabase db reset
#   bash docs/checks/5R-k-apple-revoke-contract.sh [account.ts] [index.ts]
#
# `app/src/api/account.ts` names one Edge Function and the one key of its body.
# `supabase/functions/apple-revoke/index.ts` is that function. Nothing else in
# this repository runs it: no typecheck reads it and no suite can load it. So
# this file SERVES it in the runtime Supabase deploys it to, reads the app's
# two strings out of the app, and plays Apple with a stand-in that holds the
# matching public key (`docs/checks/lib/5R-k-apple-stand-in.mjs`).
#
# WHAT IT ASSERTS, each measured on the wire:
#   1. the app's constants and the function's build number are readable;
#   2. GET answers with no session: the build the file declares, configured;
#   3. no token, and a token nobody issued: 401, and Apple hears nothing;
#   4. a login with NO Apple link: 409, and Apple hears nothing;
#   5. a body under any other key than the app's: 400, and Apple hears nothing;
#   6. ⚠️⚠️ a login WITH an Apple link, the app's body: 200; Apple received
#      exactly two calls, the trade and then the revoke; the revoke carries the
#      refresh token the trade returned; and BOTH client secrets verify against
#      the public half of the key the function was given, naming the team, the
#      key id, the bundle id and Apple as audience, good for five minutes;
#   7. ⚠️ a code that belongs to ANOTHER Apple account: 409, traded, NOT revoked;
#   8. a code Apple refuses: 502, and no revoke;
#   9. ⚠️ the token of an account already deleted — still validly signed — is
#      refused. This is why `verify_jwt` is off and the function asks the auth
#      server itself;
#  10. with its secrets missing: GET says so, the call is 503, Apple hears
#      nothing. The app deletes the account regardless.
#
# ⚠️ AND WHAT IT CANNOT CLAIM. That Apple accepts what this function sends: the
# stand-in is this repository's reading of Apple's documentation, not Apple.
# That the function is DEPLOYED, or holds the owner's real key:
# `5R-k-function-deployed.sh` reads the first, and only a real deletion from an
# iPhone proves the second. That the app calls it at the right moment (R9):
# `app/test/apple.test.ts` holds the decision, the owner's phone the rest.
# ============================================================================

set -uo pipefail

CONTRACT="${1:-app/src/api/account.ts}"
FUNCTION="${2:-supabase/functions/apple-revoke/index.ts}"
MODE="${APPLE_STAND_IN_MODE:-honest}"
STAND_IN="docs/checks/lib/5R-k-apple-stand-in.mjs"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }
[[ -r "$FUNCTION" ]] || { echo "FAIL: cannot read $FUNCTION"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }

NAME="$(str APPLE_REVOKE "$CONTRACT")"
BODY_KEY="$(awk '/^export interface RevokeBody/{f=1;next} f&&/^}/{exit} f' "$CONTRACT" \
  | sed -n 's/^ *readonly \([a-z_A-Z]*\):.*/\1/p' | paste -sd, -)"
BUILD="$(sed -n 's/^export const BUILD = \([0-9][0-9]*\);.*/\1/p' "$FUNCTION" | head -1)"

note
for name in NAME BODY_KEY BUILD; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name — this check would assert nothing"
    exit 1
  fi
done
ok "read from the app: $NAME({$BODY_KEY}); from the function: build $BUILD"

# Asked of the tree before anything is served: a name with no directory would
# otherwise be ninety seconds of waiting for a function that cannot answer.
if [[ ! -r "supabase/functions/$NAME/index.ts" ]]; then
  fail "the app names the function '$NAME', and supabase/functions/ has no such function."
  echo "      The call would be a 404 on a phone: the deletion goes ahead and Apple is never told."
  exit 1
fi

STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` and \`supabase db reset\` from the root."
  exit 1
fi

SCRATCH="$(mktemp -d)"
PORT=54971
APPLE="http://127.0.0.1:$PORT"
SERVE_PID=""
STAND_IN_PID=""
stop_serving() {
  [[ -n "$SERVE_PID" ]] && kill "$SERVE_PID" 2>/dev/null
  SERVE_PID=""
  # The CLI leaves its runtime container up when it is killed, and the next
  # serve would otherwise answer with the old environment.
  docker ps -q --filter 'name=supabase_edge_runtime' 2>/dev/null | xargs docker rm -f >/dev/null 2>&1
}
cleanup() {
  stop_serving
  [[ -n "$STAND_IN_PID" ]] && kill "$STAND_IN_PID" 2>/dev/null
  rm -rf "$SCRATCH"
}
trap cleanup EXIT

node "$STAND_IN" "$PORT" "$SCRATCH/key.pem" "$MODE" > "$SCRATCH/stand-in.log" 2>&1 &
STAND_IN_PID=$!
disown "$STAND_IN_PID" 2>/dev/null
for _ in $(seq 1 40); do
  [[ "$(curl -s -o /dev/null -w '%{http_code}' "$APPLE/__log")" == "200" && -s "$SCRATCH/key.pem" ]] && break
  sleep 0.25
done
if [[ "$(curl -s -o /dev/null -w '%{http_code}' "$APPLE/__log")" != "200" ]]; then
  echo "FAIL: the stand-in for Apple did not start — $(head -3 "$SCRATCH/stand-in.log")"
  exit 1
fi

# The function's secrets. ⚠️ The key goes in on ONE line, its line breaks
# written as the two characters \n: that is one of the ways a real .p8 reaches
# a secret, and the function has to read it.
python3 - "$SCRATCH" "$PORT" <<'PY'
import pathlib, sys
scratch = pathlib.Path(sys.argv[1])
pem = (scratch / "key.pem").read_text().strip().replace("\n", "\\n")
base = "APPLE_BASE_URL=http://host.docker.internal:" + sys.argv[2] + "\n"
(scratch / "env").write_text(
    "APPLE_TEAM_ID=TEAMTEST01\nAPPLE_KEY_ID=KEYTEST001\n"
    + 'APPLE_PRIVATE_KEY="' + pem + '"\n' + base)
(scratch / "env-empty").write_text(base)
PY

serve() { # env-file -> waits until the function answers
  stop_serving
  supabase functions serve --env-file "$1" > "$SCRATCH/serve.log" 2>&1 &
  SERVE_PID=$!
  disown "$SERVE_PID" 2>/dev/null
  local try
  for try in $(seq 1 90); do
    [[ "$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/functions/v1/$NAME")" == "200" ]] && return 0
    sleep 1
  done
  return 1
}

TOKEN=""
call() { # method body -> body, then the HTTP status on the last line
  local method="$1"
  local payload="${2:-}"
  local auth="X-Empty: 1"
  [[ -n "$TOKEN" ]] && auth="Authorization: Bearer $TOKEN"
  if [[ -n "$payload" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL/functions/v1/$NAME" -H "apikey: $KEY" \
      -H "$auth" -H 'Content-Type: application/json' -d "$payload"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL/functions/v1/$NAME" -H "apikey: $KEY" -H "$auth"
  fi
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
code_body() { python3 -c 'import json,sys;print(json.dumps({sys.argv[1]: sys.argv[2]}))' "$1" "$2"; }
heard()  { curl -s "$APPLE/__log"; }
forget() { curl -s -X POST "$APPLE/__reset" > /dev/null; }
# How many calls Apple received, optionally only those to one path.
calls()  { heard | python3 -c '
import json, sys
log = json.load(sys.stdin)
path = sys.argv[1] or None
print(len([e for e in log if path is None or e.get("path") == path]))' "${1:-}"; }

PASSWORD="apple-5rk-123456"
USER_ID=""
signup() { # email -> sets TOKEN and USER_ID
  local out=""
  local try
  local payload
  payload="$(python3 -c 'import json,sys;print(json.dumps({"email":sys.argv[1],"password":sys.argv[2],"data":{"full_name":"Contrato Apple"}}))' "$1" "$PASSWORD")"
  for try in 1 2 3 4 5 6; do
    out="$(curl -s -X POST "$API_URL/auth/v1/signup" -H "apikey: $KEY" -H 'Content-Type: application/json' -d "$payload")"
    TOKEN="$(pick access_token "$out")"
    USER_ID="$(python3 -c 'import sys,json;print((json.load(sys.stdin).get("user") or {}).get("id",""))' <<< "$out" 2>/dev/null)"
    [[ -n "$TOKEN" && -n "$USER_ID" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $out"
  exit 1
}
# Gives a login the Apple link a real sign-in would have written. The subject
# is the one the stand-in answers for the code `good`.
link_apple() { # user-id
  local sql
  # A run that died half-way leaves its link behind, and the subject is unique.
  supabase db query --local "delete from auth.identities where provider = 'apple' and provider_id = 'apple-sub-contract-A'" > /dev/null 2>&1
  sql="insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values ('apple-sub-contract-A', '$1', jsonb_build_object('sub', 'apple-sub-contract-A', 'email', 'oculto@privaterelay.appleid.com'), 'apple', now(), now(), now())"
  supabase db query --local "$sql" > "$SCRATCH/link.log" 2>&1 \
    || { echo "FAIL: could not write the Apple link — $(tail -2 "$SCRATCH/link.log")"; exit 1; }
}

if ! serve "$SCRATCH/env"; then
  echo "FAIL: the function did not answer within 90 s — $(tail -4 "$SCRATCH/serve.log")"
  exit 1
fi

# 2 -------------------------------------------------------------------------
note
SEEN="$(TOKEN="" call GET)"
if [[ "$(status "$SEEN")" == "200" && "$(pick build "$(body "$SEEN")")" == "$BUILD" \
      && "$(pick configured "$(body "$SEEN")")" == "True" ]]; then
  ok "GET with no session: build $BUILD, configured"
else
  fail "GET answered $(status "$SEEN") $(body "$SEEN") — the file declares build $BUILD"
fi

# 3 -------------------------------------------------------------------------
note
forget
ANON="$(TOKEN="" call POST "$(code_body "$BODY_KEY" good)")"
FORGED="$(TOKEN="not.a.token" call POST "$(code_body "$BODY_KEY" good)")"
if [[ "$(status "$ANON")" == "401" && "$(status "$FORGED")" == "401" && "$(calls)" == "0" ]]; then
  ok "no token, and a token nobody issued: 401 both, and Apple heard nothing"
else
  fail "unauthenticated calls answered $(status "$ANON") and $(status "$FORGED"); Apple heard $(calls) call(s)"
fi

# 4 -------------------------------------------------------------------------
STAMP="$$-$(date +%s)"
signup "apple-a-$STAMP@example.com"; A_TOKEN="$TOKEN"; A_ID="$USER_ID"
note
forget
PLAIN="$(call POST "$(code_body "$BODY_KEY" good)")"
if [[ "$(status "$PLAIN")" == "409" && "$(pick error "$(body "$PLAIN")")" == "no_apple_link" && "$(calls)" == "0" ]]; then
  ok "a login with no Apple link: 409 no_apple_link, and Apple heard nothing"
else
  fail "a login with no Apple link answered $(status "$PLAIN") $(body "$PLAIN"); Apple heard $(calls) call(s)"
fi

link_apple "$A_ID"

# 5 -------------------------------------------------------------------------
note
forget
OTHERKEY="$(call POST "$(code_body authorizationCode good)")"
if [[ "$(status "$OTHERKEY")" == "400" && "$(calls)" == "0" ]]; then
  ok "a body under another key: 400, and Apple heard nothing"
else
  fail "a body under another key answered $(status "$OTHERKEY") $(body "$OTHERKEY"); Apple heard $(calls) call(s)"
fi

# 6 -------------------------------------------------------------------------
note
forget
DONE="$(call POST "$(code_body "$BODY_KEY" good)")"
if [[ "$(status "$DONE")" == "200" && "$(pick revoked "$(body "$DONE")")" == "True" ]]; then
  ok "a login with an Apple link, the app's body {$BODY_KEY}: 200 {revoked: true}"
else
  fail "the app's call answered $(status "$DONE") $(body "$DONE") — expected 200 with the body key '$BODY_KEY'"
fi

note
VERDICT="$(heard | python3 -c '
import json, sys
log = json.load(sys.stdin)
problems = []
if [e.get("path") for e in log] != ["/auth/token", "/auth/revoke"]:
    problems.append("Apple received " + json.dumps([e.get("path") for e in log]) + ", expected the trade and then the revoke")
else:
    trade, revoke = log
    if trade.get("grant_type") != "authorization_code" or trade.get("code") != "good":
        problems.append("the trade sent grant_type=%s code=%s" % (trade.get("grant_type"), trade.get("code")))
    if revoke.get("token") != "stand-in-refresh-good" or revoke.get("token_type_hint") != "refresh_token":
        problems.append("the revoke sent token=%s hint=%s, not the refresh token the trade returned" % (revoke.get("token"), revoke.get("token_type_hint")))
    for name, entry in (("trade", trade), ("revoke", revoke)):
        secret = entry.get("secret") or {}
        if entry.get("client_id") != "mx.wera.app":
            problems.append("the %s named client_id %s" % (name, entry.get("client_id")))
        if secret.get("signed") is not True:
            problems.append("the client secret on the %s is not signed by the key the function was given" % name)
        want = {"alg": "ES256", "kid": "KEYTEST001", "iss": "TEAMTEST01", "sub": "mx.wera.app", "aud": "https://appleid.apple.com"}
        for key, value in want.items():
            if secret.get(key) != value:
                problems.append("the client secret on the %s has %s=%s, expected %s" % (name, key, secret.get(key), value))
        if not (0 < (secret.get("lifetime") or 0) <= 300):
            problems.append("the client secret on the %s lives %s s; Apple allows it and this function promises five minutes" % (name, secret.get("lifetime")))
print("; ".join(problems))')"
if [[ -z "$VERDICT" ]]; then
  ok "Apple received the trade, then the revoke of the token it returned; both client secrets verify (ES256, team, key id, bundle id, 5 min)"
else
  fail "$VERDICT"
fi

# 7 -------------------------------------------------------------------------
note
forget
ELSE="$(call POST "$(code_body "$BODY_KEY" other-account)")"
if [[ "$(status "$ELSE")" == "409" && "$(pick error "$(body "$ELSE")")" == "other_apple_account" \
      && "$(calls /auth/token)" == "1" && "$(calls /auth/revoke)" == "0" ]]; then
  ok "a code from another Apple account: 409 other_apple_account, traded and NOT revoked"
else
  fail "a code from another Apple account answered $(status "$ELSE") $(body "$ELSE") with $(calls /auth/revoke) revoke(s) — it must revoke nobody"
fi

# 8 -------------------------------------------------------------------------
note
forget
REFUSED="$(call POST "$(code_body "$BODY_KEY" refused)")"
if [[ "$(status "$REFUSED")" == "502" && "$(pick step "$(body "$REFUSED")")" == "token" && "$(calls /auth/revoke)" == "0" ]]; then
  ok "a code Apple refuses: 502 at the trade, and no revoke"
else
  fail "a refused code answered $(status "$REFUSED") $(body "$REFUSED") with $(calls /auth/revoke) revoke(s)"
fi

# 9 -------------------------------------------------------------------------
note
GONE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/rest/v1/rpc/delete_my_account" \
  -H "apikey: $KEY" -H "Authorization: Bearer $A_TOKEN" -H 'Content-Type: application/json' -d '{}')"
forget
AFTER="$(TOKEN="$A_TOKEN" call POST "$(code_body "$BODY_KEY" good)")"
if [[ "$GONE" == "200" && "$(status "$AFTER")" == "401" && "$(calls)" == "0" ]]; then
  ok "the still-signed token of a deleted account is refused: 401, and Apple heard nothing"
else
  fail "after delete_my_account ($GONE) the old token answered $(status "$AFTER") $(body "$AFTER"); Apple heard $(calls) call(s)"
fi

# 10 ------------------------------------------------------------------------
signup "apple-b-$STAMP@example.com"; link_apple "$USER_ID"
note
if ! serve "$SCRATCH/env-empty"; then
  fail "the function did not come back without its secrets — $(tail -3 "$SCRATCH/serve.log")"
else
  forget
  BARE="$(TOKEN="" call GET)"
  UNSET="$(call POST "$(code_body "$BODY_KEY" good)")"
  if [[ "$(pick configured "$(body "$BARE")")" == "False" && "$(status "$UNSET")" == "503" && "$(calls)" == "0" ]]; then
    ok "with its secrets missing: GET says so, the call is 503, and Apple heard nothing"
  else
    fail "without secrets GET said $(body "$BARE") and the call answered $(status "$UNSET") $(body "$UNSET"); Apple heard $(calls) call(s)"
  fi
fi

echo
if (( fails == 0 && ran < 11 )); then
  echo "FAIL: only $ran assertion groups ran, expected 11 — this check asserted almost nothing."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — the app's call reaches the function, the function"
  echo "signs for Apple with the key it was given, and it revokes one account and no other."
  exit 0
fi
echo "$ran group(s) ran, $fails failed."
exit 1

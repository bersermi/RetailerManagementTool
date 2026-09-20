#!/usr/bin/env bash
# 5b-iii-d-2-approve-contract — does `approve_request` still answer to the two
# argument names this app sends, still refuse a staff approval with no location,
# and is it still fenced at OWNER rather than at manager?
#
# WHY THIS EXISTS, AND IT IS A SHARPER CASE THAN ITS SIX SIBLINGS.
# `app/test/api-approvals.test.ts` can prove the app is consistent with itself.
# Nothing in TypeScript has ever read `0029`, and PostgREST matches an RPC BY
# ITS PARAMETER NAMES — so a `p_` name that drifts is not a type error, it is a
# 404 the typecheck, the suite and the bundler all pass straight over, reaching
# an owner as a button that never works.
#
# ⚠️⚠️ AND THE ONE THING THIS TASK TURNS ON IS `D8`, WHICH §2.11 REMOVED THE
# INSTRUMENT FOR. An approved staff member with no `member_location` row is
# INSIDE THE SHOP AND CAN DO NOTHING IN IT: `location_select` (`0001:506`) is
# `id in (select my_locations())`, so RLS hands her an empty shop and refuses
# her every write with NO MESSAGE, which on a phone looks exactly like the app
# being broken (ADR-035 §2.7 `D8`). The client refuses to send an empty array
# (`checkApproval`) and the server refuses to accept one (`0029:407`) — TWO
# copies of one rule, and this file is what says they still agree.
#
#   ⚠️ ASSERTION 4 IS THE HALF THAT IS USUALLY LEFT OUT, and without it the rest
#   is a check agreeing with a refusal nobody showed was worth making. It
#   approves a staff member into ONE of two stores and then signs in AS HER: she
#   reads exactly the store she was given and cannot see the other. That is the
#   silent fence, measured, on the person it would have silenced.
#
#   ⚠️ THE FENCE IS `owner` AND NOT `manager`, asymmetric with `create_invite`
#   one screen over, because this writes `workspace_member` AND `member_location`
#   and both insert policies are owner-only (`0001`). `0029`'s decision 6.
#   Assertion 7 measures it as a PAIR — an owner approving the SAME LIVE REQUEST
#   a manager, a cashier, a stranger and the requester herself were each refused
#   — because a `42501` from a function that is simply broken is also a `42501`.
#
# WHAT IT ASSERTS, all against a REAL round trip over HTTP, with six real people,
# two shops and two stores:
#
#   1. The RPC's name, its two `p_` arguments and its two refusal codes are READ
#      OUT OF `app/src/api/approvals.ts` — not typed in here. A second copy of a
#      contract is the defect this repository has recorded eleven times.
#   2. The argument names the app sends are the ones the function answers to, and
#      a deliberately wrong one is `PGRST202` — so this check can SEE a drift
#      rather than merely not meet one.
#   3. ⚠️⚠️ `D8` ON THE SERVER: a staff approval with `[]` is refused with the
#      app's own `BAD_LOCATION`, and NOTHING WAS WRITTEN — she is still not a
#      member and still in the queue. A refusal that half-committed would be
#      worse than no refusal.
#   4. ⚠️⚠️ `D8`'s PAYOFF, ON THE PERSON — see above.
#   5. The result carries every field `Approved` reads, and `location_count` is
#      what was actually written.
#   6. ⚠️ THE APPROVED REQUEST LEAVES THE QUEUE — the one thing
#      `5b-iii-d-1-approvals-contract.sh` names in its own header as unassertable
#      until this module existed. It exists now, so the gap closes here.
#   7. ⚠️⚠️ THE OWNER FENCE, MEASURED AS A PAIR — see above.
#   8. It is IDEMPOTENT: a second approve answers `already_approved` rather than
#      raising, and does not write a second membership. The pilot store is
#      offline a lot and a tap that appears to do nothing is tapped again.
#   9. ⚠️⚠️ EVERY REQUEST IN THE QUEUE IS `staff`, which is what makes `D8`'s
#      picker unskippable on this path — and it is the assertion this check
#      REPLACED a wrong one with, on its first run. See the group itself.
#  10. A store from ANOTHER shop is refused with the app's `BAD_LOCATION`.
#
# ⚠️ WHAT IT DOES NOT ASSERT, NAMED RATHER THAN LEFT TO BE FOUND:
#
#   * `TD003`, AND IT IS NOT REACHABLE FROM HERE RATHER THAN OVERLOOKED. Both
#     branches need a row EDITED into the past or marked superseded, and there
#     is no `workspace_invite_update` policy in this schema at all — a client
#     cannot write that column by any route, which is the schema being right.
#     `supabase/tests/0029_request_path.sql` 7.1 and 7.2 drive both branches and
#     7.3 asserts neither wrote a membership. ⚠️ What IS asserted here is the
#     join between the two: assertion 11 reads `REQUEST_GONE` out of the app and
#     demands `0029` still raise that exact code, so the constant cannot drift
#     away from the suite that tests it.
#   * ANYTHING ABOUT THE SCREEN. §2.11 refuses suites over rendering, so that the
#     picker appears only for a staff request in a shop with two stores, that the
#     confirm step is a second tap, and that the ticked store is announced by
#     more than colour are the owner's own phone (`R9`). ⚠️ The REFUSAL is the
#     exception and it is deliberate: `checkApproval` is a pure function, so
#     `app/test/api-approvals.test.ts` pins `D8` at the client and this file pins
#     it at the server.
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. The trap ten other checks here already recorded.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b-iii-d-2-approve-contract.sh
# With: a path to the approvals contract as $1, the workspace contract as $2, the
#       requests contract as $3, the invites contract as $4, the credentials
#       module as $5, the redeem contract as $6 and the applied migration as $7,
#       which is how a falsification harness points it at mutated copies.
#       ⚠️ ALL SEVEN ARE PARAMETERS BECAUSE ALL SEVEN ARE READ:
#       `conventions-gate-falsify.sh` spent a day running none of its sixteen
#       fixtures because the gate it falsifies gained an input the harness was
#       never told to copy.
# Exit: 0 the applied function answers what this app sends; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/approvals.ts}"
WORKSPACE_CONTRACT="${2:-app/src/api/workspace.ts}"
REQUEST_CONTRACT="${3:-app/src/api/requests.ts}"
INVITE_CONTRACT="${4:-app/src/api/invites.ts}"
CREDENTIALS="${5:-app/src/auth/credentials.ts}"
REDEEM_CONTRACT="${6:-app/src/api/redeem.ts}"
MIGRATION="${7:-supabase/migrations/0029_request_path.sql}"
for f in "$CONTRACT" "$WORKSPACE_CONTRACT" "$REQUEST_CONTRACT" "$INVITE_CONTRACT" "$CREDENTIALS" \
         "$REDEEM_CONTRACT" "$MIGRATION"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f"; exit 1; }
done

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# --- 1. the app's own claims, read out of its source -----------------------
APPROVE="$(sed -n "s/^export const APPROVE_REQUEST = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
PENDING="$(sed -n "s/^export const PENDING_ACCESS_REQUESTS = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
GONE="$(sed -n "s/^export const REQUEST_GONE = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
BAD_LOCATION="$(sed -n "s/^export const BAD_LOCATION = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
ONBOARD="$(sed -n "s/^export const ONBOARD_WORKSPACE = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"
WORKSPACE_COLUMNS="$(sed -n "s/^export const WORKSPACE_COLUMNS = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"
REQUEST_ACCESS="$(sed -n "s/^export const REQUEST_ACCESS = '\([^']*\)';.*/\1/p" "$REQUEST_CONTRACT" | head -1)"
CREATE_INVITE="$(sed -n "s/^export const CREATE_INVITE = '\([^']*\)';.*/\1/p" "$INVITE_CONTRACT" | head -1)"
REDEEM_INVITE="$(sed -n "s/^export const REDEEM_INVITE = '\([^']*\)';.*/\1/p" "$REDEEM_CONTRACT" | head -1)"

# ⚠️⚠️ THE TWO `p_` NAMES ARE READ OUT OF THE APP'S OWN INTERFACE, not typed
# here — the whole contract this file exists to assert, so a copy of it here
# would make assertion 2 a tautology. That is the seventh shape of misleading
# green this repository has recorded, and it is a check agreeing with itself.
APPROVE_ARGS="$(sed -n '/^export interface ApproveRequestArgs {/,/^}/p' "$CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p')"
APPROVE_ARG_N="$(printf '%s\n' "$APPROVE_ARGS" | grep -c . )"

# ⚠️⚠️ THE TWO NAMES ARE TAKEN OFF `approveArgs`' RETURNED LITERAL — the key
# assigned the request id, and the key assigned the locations — and NOT by
# looking for `request` and `location` inside the names themselves. The first
# version of this check did the latter, and fixtures `W2` and `W3` are what
# found it out: renaming a `p_` name to `p_solicitud_id` then made the check
# refuse at assertion 1 as UNREADABLE instead of driving the round trip and
# meeting the `PGRST202` it exists to meet. It was still red, which is how a
# defect like this survives — red for the shallower reason looks exactly like
# red. ⚠️ Read this way, the probe sends WHATEVER the app sends, which is the
# only version that can catch a rename the app made consistently.
BUILDER="$(sed -n '/^export function approveArgs/,/^}/p' "$CONTRACT")"
ID_ARG="$(sed -n 's/^    \([a-z_]*\): draft\.entry\.requestId,.*/\1/p' <<< "$BUILDER" | head -1)"
LOC_ARG="$(sed -n 's/^    \([a-z_]*\): locationsRequired(.*/\1/p' <<< "$BUILDER" | head -1)"

# ⚠️ AND BOTH MUST ALSO BE DECLARED ON THE WIRE TYPE. Without this the builder
# could send a key the interface never named — which typechecks, because an
# object literal wider than its annotation is only refused when it is FRESH at
# the call site, and this one is returned from a function.
in_args() { printf '%s\n' "$APPROVE_ARGS" | grep -qx "$1"; }

# The fields `Approved` reads, for assertion 5. Read off the parser, not listed:
# a field the app reads that `0029` does not return is `undefined` at runtime and
# is invisible to the typecheck, to the suite and to the bundler.
RESULT_FIELDS="$(sed -n '/^export function approvedFrom/,/^}/p' "$CONTRACT" \
  | sed -n 's/.*row\.\([a-z_]*\).*/\1/p' | sort -u)"
RESULT_FIELD_N="$(printf '%s\n' "$RESULT_FIELDS" | grep -c . )"

INVITE_ARGS="$(sed -n '/^export interface CreateInviteArgs {/,/^}/p' "$INVITE_CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p')"
ASK_ARG="$(sed -n '/^export interface RequestAccessArgs {/,/^}/p' "$REQUEST_CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p' | head -1)"
REDEEM_ARG="$(sed -n '/^export interface RedeemInviteArgs {/,/^}/p' "$REDEEM_CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p' | head -1)"
QUEUE_ARG="$(sed -n '/^export interface PendingRequestsArgs {/,/^}/p' "$CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p' | head -1)"
FULL_NAME_KEY="$(sed -n "s/^export const FULL_NAME_KEY = '\([^']*\)';.*/\1/p" "$CREDENTIALS" | head -1)"

note
if [[ -z "$APPROVE" || -z "$PENDING" || -z "$GONE" || -z "$BAD_LOCATION" || -z "$ONBOARD" \
      || -z "$WORKSPACE_COLUMNS" || -z "$REQUEST_ACCESS" || -z "$CREATE_INVITE" \
      || -z "$REDEEM_INVITE" || -z "$ASK_ARG" || -z "$REDEEM_ARG" || -z "$QUEUE_ARG" \
      || -z "$FULL_NAME_KEY" || -z "$ID_ARG" || -z "$LOC_ARG" ]] \
   || (( APPROVE_ARG_N != 2 )) || (( RESULT_FIELD_N < 4 )) \
   || ! in_args "$ID_ARG" || ! in_args "$LOC_ARG"; then
  fail "could not read the approval contract out of $CONTRACT"
  echo "      approve='$APPROVE($ID_ARG,$LOC_ARG)' ($APPROVE_ARG_N args)"
  echo "      gone='$GONE' bad_location='$BAD_LOCATION'"
  echo "      result fields=[$(printf '%s ' $RESULT_FIELDS)] ($RESULT_FIELD_N)"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: $APPROVE($ID_ARG, $LOC_ARG), refusals $GONE / $BAD_LOCATION"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi

# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE. The secret key bypasses RLS,
# and assertions 4 and 7 — the two that matter most — would then pass vacuously
# for exactly the reason supabase/README.md gives about the `postgres` superuser.
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

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

# ⚠️⚠️ A RESPONSE BODY IS WRITTEN TO A FILE AND NEVER INTERPOLATED INTO PYTHON
# SOURCE — `5b-ii-a`'s harness taught this directory that, and being red for the
# wrong reason reads as the check being broken rather than the app being wrong.
stash() { local f="$SCRATCH/$1.json"; body "$2" > "$f"; echo "$f"; }
pick()  { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
jfield(){ python3 -c "import sys,json;d=json.load(open(sys.argv[1]));print(d.get('$2','') if isinstance(d,dict) else '')" "$1" 2>/dev/null; }
rows()  { python3 -c "import sys,json;d=json.load(open(sys.argv[1]));print(len(d) if isinstance(d,list) else -1)" "$1" 2>/dev/null; }
row()   { python3 -c "
import sys,json
d=json.load(open(sys.argv[1]))
print(d[int(sys.argv[2])].get(sys.argv[3],'') if isinstance(d,list) and len(d)>int(sys.argv[2]) else '')" "$1" "$2" "$3" 2>/dev/null; }
has_key() { python3 -c "
import sys,json
d=json.load(open(sys.argv[1]))
print('yes' if isinstance(d,dict) and sys.argv[2] in d else 'no')" "$1" "$2" 2>/dev/null; }

# ⚠️⚠️ EVERY REQUEST BODY IS KEYED BY A NAME READ OUT OF THE APP, never by a name
# typed in this file. `5b-i`'s recorded arrangement: if this script spelled the
# argument names itself it would carry the very prefix the check exists to test,
# and a fixture that renames one in the app would stay green because the check
# would keep sending the right thing.
one_arg() { python3 -c 'import json,sys;print(json.dumps({sys.argv[1]: sys.argv[2]}))' "$1" "$2"; }
approve_body() { # request-id locations-json -> the JSON body, keyed by the app's names
  python3 -c 'import json,sys;print(json.dumps({sys.argv[1]: sys.argv[3], sys.argv[2]: json.loads(sys.argv[4])}))' \
    "$ID_ARG" "$LOC_ARG" "$1" "$2"
}
invite_body() { # email role locations-json -> the JSON body, keyed by the app's names
  python3 - "$INVITE_ARGS" "$WORKSPACE_ID" "$1" "$2" "$3" <<'PYBODY'
import json, sys
names = [n for n in sys.argv[1].split('\n') if n]
ws, email, role, locs = sys.argv[2], sys.argv[3], sys.argv[4], json.loads(sys.argv[5])
sent = {}
for n in names:
    if   'workspace' in n: sent[n] = ws
    elif 'email'     in n: sent[n] = email
    elif 'role'      in n: sent[n] = role
    elif 'location'  in n: sent[n] = locs
    else:                  sent[n] = None
print(json.dumps(sent))
PYBODY
}

STAMP="$$-$(date +%s)"
PASSWORD='approve-probe-123'
PROBE_NAME='María del Carmen Rodríguez Gómez'

signup() { # email [name] -> sets TOKEN and USER_ID
  local out payload
  payload="$(python3 - "$1" "$PASSWORD" "$FULL_NAME_KEY" "${2:-}" <<'PY'
import json, sys
email, password, key, name = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
body = {'email': email, 'password': password}
if name:
    body['data'] = {key: name}
print(json.dumps(body))
PY
)"
  out="$(TOKEN="" api POST /auth/v1/signup "$payload")"
  TOKEN="$(pick access_token "$(body "$out")")"
  USER_ID="$(python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('id',''))" <<< "$(body "$out")" 2>/dev/null)"
  [[ -n "$TOKEN" && -n "$USER_ID" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}

# --- the two shops, the two stores and the six people ----------------------
OWNER_EMAIL="ap-owner-$STAMP@example.com"
OWNER2_EMAIL="ap-owner2-$STAMP@example.com"
JOINER_EMAIL="ap-joiner-$STAMP@example.com"
MANAGER_EMAIL="ap-manager-$STAMP@example.com"
CASHIER_EMAIL="ap-cashier-$STAMP@example.com"
STRANGER_EMAIL="ap-stranger-$STAMP@example.com"
FENCED_EMAIL="ap-fenced-$STAMP@example.com"
WAITING_EMAIL="ap-waiting-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST "/rest/v1/rpc/$ONBOARD" \
  '{"p_display_name":"Aprobar 5b-iii-d-2","p_prices_include_tax":true,"p_location_name":"Centro"}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

WS="$(stash workspace "$(api GET "/rest/v1/workspace?select=$WORKSPACE_COLUMNS")")"
SHOP_CODE="$(python3 -c "import sys,json;print(json.load(open(sys.argv[1]))[0].get('code',''))" "$WS" 2>/dev/null)"
[[ -n "$SHOP_CODE" ]] || { echo "FAIL: could not read the shop's join code — $(cat "$WS")"; exit 1; }

# ⚠️ A SECOND STORE, AND IT IS WHAT MAKES ASSERTION 4 MEAN ANYTHING. In a
# one-store shop "she sees her store" and "she sees the shop" are the same
# sentence, and `D8`'s whole claim is that they are not.
api POST "/rest/v1/location" '{"workspace_id":"'"$WORKSPACE_ID"'","name":"Sur"}' \
  -H 'Prefer: return=representation' > /dev/null
LOCS="$(stash locations "$(api GET "/rest/v1/location?select=id,name&order=name")")"
[[ "$(rows "$LOCS")" == "2" ]] || { echo "FAIL: expected two stores, got $(rows "$LOCS") — $(cat "$LOCS")"; exit 1; }
CENTRO="$(row "$LOCS" 0 id)"; SUR="$(row "$LOCS" 1 id)"

mint_member() { # email role locations-json -> signs them up and redeems
  local issued token
  TOKEN="$OWNER_TOKEN"
  issued="$(stash "invite-$2" "$(api POST "/rest/v1/rpc/$CREATE_INVITE" "$(invite_body "$1" "$2" "$3")")")"
  token="$(jfield "$issued" token)"
  [[ -n "$token" ]] || { echo "FAIL: could not issue the $2 invite — $(cat "$issued")"; exit 1; }
  signup "$1"
  api POST "/rest/v1/rpc/$REDEEM_INVITE" "$(one_arg "$REDEEM_ARG" "$token")" > /dev/null
}
mint_member "$MANAGER_EMAIL" manager '[]';          MANAGER_TOKEN="$TOKEN"
mint_member "$CASHIER_EMAIL" staff "[\"$CENTRO\"]"; CASHIER_TOKEN="$TOKEN"

signup "$OWNER2_EMAIL"; OWNER2_TOKEN="$TOKEN"
OTHER="$(api POST "/rest/v1/rpc/$ONBOARD" \
  '{"p_display_name":"La Segunda 5b-iii-d-2","p_prices_include_tax":true,"p_location_name":"Norte"}')"
OTHER_LOCS="$(stash other-locations "$(api GET "/rest/v1/location?select=id,name")")"
OTHER_LOC="$(row "$OTHER_LOCS" 0 id)"
[[ -n "$OTHER_LOC" ]] || { echo "FAIL: could not read the other shop's store — $(cat "$OTHER_LOCS")"; exit 1; }

signup "$STRANGER_EMAIL"; STRANGER_TOKEN="$TOKEN"

ask_to_join() { # email [name] -> signs them up and asks; sets REQUEST_ID
  signup "$1" "${2:-}"
  api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(one_arg "$ASK_ARG" "$SHOP_CODE")" > /dev/null
}
queue_ids() { # -> the stashed queue as the owner sees it
  TOKEN="$OWNER_TOKEN"
  QUEUE="$(stash "queue-$1" "$(api POST "/rest/v1/rpc/$PENDING" "$(one_arg "$QUEUE_ARG" "$WORKSPACE_ID")")")"
}
id_of() { # email -> its request_id in $QUEUE
  python3 -c "
import sys,json
d=json.load(open(sys.argv[1]))
print(next((r.get('request_id','') for r in d if r.get('email')==sys.argv[2]), ''))" "$QUEUE" "$1" 2>/dev/null
}

ask_to_join "$JOINER_EMAIL" "$PROBE_NAME"; JOINER_TOKEN="$TOKEN"
ask_to_join "$FENCED_EMAIL";               FENCED_TOKEN="$TOKEN"
ask_to_join "$WAITING_EMAIL";              WAITING_TOKEN="$TOKEN"

queue_ids initial
JOINER_ID="$(id_of "$JOINER_EMAIL")"
FENCED_ID="$(id_of "$FENCED_EMAIL")"
WAITING_ID="$(id_of "$WAITING_EMAIL")"
if [[ -z "$JOINER_ID" || -z "$FENCED_ID" || -z "$WAITING_ID" ]]; then
  echo "FAIL: could not read the three pending requests back — $(cat "$QUEUE")"; exit 1
fi

approve_as() { # token request-id locations-json label
  TOKEN="$1"
  APPROVE_RAW="$(api POST "/rest/v1/rpc/$APPROVE" "$(approve_body "$2" "$3")")"
  APPROVE_FILE="$(stash "approve-$4" "$APPROVE_RAW")"
}

# --- 2. the argument names the app sends are the ones 0029 answers to ------
note
TOKEN="$OWNER_TOKEN"
WRONG="$(api POST "/rest/v1/rpc/$APPROVE" "{\"p_solicitud\":\"$JOINER_ID\",\"p_sucursales\":[]}")"
WRONG_CODE="$(jfield "$(stash wrong "$WRONG")" code)"
if [[ "$WRONG_CODE" == "PGRST202" ]]; then
  ok "deliberately wrong argument names are PGRST202 — this check can see a drift"
else
  fail "deliberately wrong argument names answered '$WRONG_CODE', not PGRST202"
  echo "      Without this, every assertion below passing would say nothing: a"
  echo "      check that cannot fail on a rename is not asserting the rename."
fi

# --- 3. ⚠️⚠️ D8 on the server: an empty array for staff is REFUSED ---------
note
approve_as "$OWNER_TOKEN" "$JOINER_ID" '[]' empty
EMPTY_CODE="$(jfield "$APPROVE_FILE" code)"
if [[ "$EMPTY_CODE" == "$BAD_LOCATION" ]]; then
  ok "a staff approval with no store is refused with $BAD_LOCATION — checkApproval guards a real rule"
else
  fail "a staff approval with an EMPTY store list answered '$EMPTY_CODE', expected $BAD_LOCATION"
  echo "      This is D8 (ADR-035 §2.7, 0029:407) and it is the whole reason the"
  echo "      picker refuses to be empty. If the server stopped refusing, the"
  echo "      client fence would be the ONLY thing standing between a staff member"
  echo "      and an app that silently refuses her every write — and §2.11 means"
  echo "      no suite here can see the client fence on a SCREEN."
  sed 's/^/        /' "$APPROVE_FILE" | head -3
fi

# ⚠️ A REFUSAL THAT HALF-COMMITTED WOULD BE WORSE THAN NO REFUSAL. `0029` takes
# `for update` on the row before any of this, so the raise rolls the statement
# back — and that is worth measuring rather than trusting, because the cost of
# being wrong is a member row with no locations, which is the exact state D8
# exists to prevent.
note
queue_ids after-refusal
STILL="$(id_of "$JOINER_EMAIL")"
TOKEN="$OWNER_TOKEN"
MEMBERS="$(stash members-after-refusal "$(api GET "/rest/v1/workspace_member?select=user_id,role")")"
MEMBER_N="$(rows "$MEMBERS")"
if [[ "$STILL" == "$JOINER_ID" && "$MEMBER_N" == "3" ]]; then
  ok "the refusal wrote nothing: she is still in the queue and still not a member"
else
  fail "after the refusal her queue row is '$STILL' and the shop has $MEMBER_N members (expected 3)"
  echo "      A half-committed refusal is worse than none: a workspace_member row"
  echo "      with no member_location is precisely the silent-write state D8 exists"
  echo "      to prevent, and nothing on the screen would ever show it."
fi

# --- 4. ⚠️⚠️ D8's payoff, measured on the person it protects ---------------
note
approve_as "$OWNER_TOKEN" "$JOINER_ID" "[\"$SUR\"]" staff
APPROVED_STATUS="$(jfield "$APPROVE_FILE" status)"
if [[ "$(status "$APPROVE_RAW")" == "200" && "$APPROVED_STATUS" == "approved" ]]; then
  ok "the same approval with ONE store is accepted"
else
  fail "approving with one store answered HTTP $(status "$APPROVE_RAW") / '$APPROVED_STATUS'"
  sed 's/^/        /' "$APPROVE_FILE" | head -3
fi

note
TOKEN="$JOINER_TOKEN"
HERS="$(stash her-locations "$(api GET "/rest/v1/location?select=id,name")")"
HER_N="$(rows "$HERS")"
HER_LOC="$(row "$HERS" 0 id)"
if [[ "$HER_N" == "1" && "$HER_LOC" == "$SUR" ]]; then
  ok "she now reads EXACTLY the store she was given, and not the other one — D8, measured on her"
else
  fail "the approved staff member reads $HER_N store(s), leading with '$HER_LOC' (expected 1, $SUR)"
  echo "      location_select (0001:506) is \`id in (select my_locations())\`, and"
  echo "      my_locations() reads member_location. THIS is the silent fence D8 is"
  echo "      about: had she been approved with no store she would be inside the"
  echo "      shop reading NOTHING, with every write refused and no message — and"
  echo "      that is the state the picker refuses to create."
  sed 's/^/        /' "$HERS" | head -4
fi

# --- 5. the result carries every field the app reads -----------------------
note
MISSING=""
for f in $RESULT_FIELDS; do
  [[ "$(has_key "$SCRATCH/approve-staff.json" "$f")" == "yes" ]] || MISSING="$MISSING $f"
done
WROTE="$(jfield "$SCRATCH/approve-staff.json" location_count)"
if [[ -z "$MISSING" && "$WROTE" == "1" ]]; then
  ok "the $RESULT_FIELD_N fields approvedFrom reads are all present, and location_count is 1"
else
  fail "the result is missing[$MISSING ] and reported location_count='$WROTE' (expected 1)"
  echo "      A field the app reads that 0029 does not return is \`undefined\` at"
  echo "      runtime and is invisible to the typecheck, to the suite and to the"
  echo "      bundler — the shape 5b-iii-d-1's fixture V4 was written for."
fi

# --- 6. ⚠️ the approved request LEAVES the queue ---------------------------
# ⚠️ THE GAP `5b-iii-d-1-approvals-contract.sh` NAMES IN ITS OWN HEADER, closed
# here because the module it needed now exists.
note
queue_ids after-approval
GONE_FROM_QUEUE="$(id_of "$JOINER_EMAIL")"
if [[ -z "$GONE_FROM_QUEUE" && "$(rows "$QUEUE")" == "2" ]]; then
  ok "the approved request LEAVES the queue — the bell's badge counts down"
else
  fail "she is still in the queue as '$GONE_FROM_QUEUE'; it holds $(rows "$QUEUE") row(s), expected 2"
  echo "      0037's definition of pending is four-part and accepted_at is one of"
  echo "      them. If an approved row stayed, an owner would be looking at"
  echo "      somebody she has already admitted — and the obvious thing to do"
  echo "      about that is tap the button again."
fi

# --- 7. ⚠️⚠️ the OWNER fence, measured as a pair ---------------------------
# ⚠️ THE OWNER'S SUCCESS ABOVE IS HALF OF THIS ASSERTION. A 42501 from a function
# that is simply broken is also a 42501, so what is asserted is the DIFFERENCE
# over ONE live request: four callers refused, and the owner admitted.
note
fenced=0
check_fenced() { # token label
  approve_as "$1" "$FENCED_ID" "[\"$CENTRO\"]" "fence-$2"
  local code; code="$(jfield "$APPROVE_FILE" code)"
  [[ "$code" == "42501" ]] && return 0
  fail "$2 approving answered '$code', expected 42501"
  echo "      0029 decision 6 fences this at OWNER — asymmetric with create_invite's"
  echo "      manager fence on purpose, because this writes workspace_member AND"
  echo "      member_location and both insert policies are owner-only (0001)."
  fenced=1
}
check_fenced "$MANAGER_TOKEN"  manager
check_fenced "$CASHIER_TOKEN"  cashier
check_fenced "$STRANGER_TOKEN" stranger
check_fenced "$OWNER2_TOKEN"   other-owner
check_fenced "$FENCED_TOKEN"   herself
if (( fenced == 0 )); then
  ok "manager, cashier, stranger, another shop's owner and the requester herself: all 42501"
fi

note
approve_as "$OWNER_TOKEN" "$FENCED_ID" "[\"$CENTRO\"]" fence-owner
if [[ "$(jfield "$SCRATCH/approve-fence-owner.json" status)" == "approved" ]]; then
  ok "…and the owner admits the SAME request — so the refusals are the fence, not a broken call"
else
  fail "the owner could not approve the request four other callers were refused"
  echo "      Without this half, assertion 7 is vacuous: a function that refuses"
  echo "      everybody refuses non-owners too."
  sed 's/^/        /' "$SCRATCH/approve-fence-owner.json" | head -3
fi

# --- 8. it is idempotent ---------------------------------------------------
note
approve_as "$OWNER_TOKEN" "$JOINER_ID" "[\"$SUR\"]" again
AGAIN_STATUS="$(jfield "$SCRATCH/approve-again.json" status)"
AGAIN_FLAG="$(jfield "$SCRATCH/approve-again.json" already_approved)"
TOKEN="$OWNER_TOKEN"
MEMBERS2="$(stash members-after-second "$(api GET "/rest/v1/workspace_member?select=user_id")")"
if [[ "$(status "$APPROVE_RAW")" == "200" && "$AGAIN_STATUS" == "already_approved" \
      && "$AGAIN_FLAG" == "True" && "$(rows "$MEMBERS2")" == "5" ]]; then
  ok "a second approve answers already_approved and writes no second membership"
else
  fail "the second approve answered HTTP $(status "$APPROVE_RAW") / '$AGAIN_STATUS' / already=$AGAIN_FLAG; $(rows "$MEMBERS2") members"
  echo "      0029:381 answers a repeat with the membership rather than raising,"
  echo "      and the pilot store is offline a lot — a tap that appears to do"
  echo "      nothing IS tapped again. A screen that invented a refusal here would"
  echo "      be telling a shopkeeper her own successful approval failed."
fi

# --- 9. ⚠️⚠️ EVERY REQUEST IS `staff`, AND THE SCREEN DEPENDS ON IT -------
# ⚠️⚠️ THIS ASSERTION REPLACED THE ONE THAT WAS WRITTEN FIRST, AND THE CHECK IS
# WHAT FOUND OUT. The original group approved a `manager`-role request and
# demanded `location_count = 0` (`0029:434`). It went red — because there is no
# such thing. `request_access` takes NO role argument, deliberately (`0029`'s
# `S4`: an email or role argument is a way to claim somebody else's invite), and
# it inserts without naming the column, so `workspace_invite.role`'s default of
# `'staff'` (`0002:374`) decides. EVERY row this screen can ever show is staff.
#
# ⚠️ SO WHAT IS ASSERTED IS THE REAL INVARIANT, and it is load-bearing twice:
# the picker is ALWAYS asked in a shop with two stores, and `D8` is therefore
# never bypassed on this path — while `approveArgs`' non-staff branch is
# currently UNREACHABLE HERE and is kept only because `0029` keeps the mirror
# of it. The day `request_access` gains a role, this goes red, which is exactly
# the day the app's branch stops being dead.
note
queue_ids roles
NON_STAFF="$(python3 -c "
import sys,json
d=json.load(open(sys.argv[1]))
print(','.join(sorted({r.get('role','?') for r in d if r.get('role') != 'staff'})))" "$QUEUE" 2>/dev/null)"
QUEUED_N="$(rows "$QUEUE")"
if [[ -z "$NON_STAFF" ]] && (( QUEUED_N > 0 )); then
  ok "all $QUEUED_N queued requests are 'staff' — so D8's picker is never skipped on this path"
else
  fail "the queue holds $QUEUED_N row(s) and these non-staff roles: [$NON_STAFF]"
  echo "      request_access takes no role argument (0029 S4) and inserts without"
  echo "      naming the column, so workspace_invite.role's default 'staff'"
  echo "      (0002:374) decides. If that ever changes, an approval can reach"
  echo "      approve_request with a role D8 does not fence — and the picker the"
  echo "      screen draws is conditioned on exactly that role."
fi

# --- 10. a store from another shop is refused ------------------------------
note
queue_ids before-foreign
LAST_EMAIL="ap-foreign-$STAMP@example.com"
ask_to_join "$LAST_EMAIL" > /dev/null
queue_ids foreign
FOREIGN_ID="$(id_of "$LAST_EMAIL")"
approve_as "$OWNER_TOKEN" "$FOREIGN_ID" "[\"$OTHER_LOC\"]" foreign
FOREIGN_CODE="$(jfield "$APPROVE_FILE" code)"
if [[ "$FOREIGN_CODE" == "$BAD_LOCATION" ]]; then
  ok "a store belonging to another shop is refused with $BAD_LOCATION"
else
  fail "approving into another shop's store answered '$FOREIGN_CODE', expected $BAD_LOCATION"
  echo "      0029:415. Without it an owner of two shops could put a staff member"
  echo "      of one into a store of the other, which is the workspace/location"
  echo "      conflation ADR-035 §2.3 calls a one-way door."
fi

# --- 11. the app's TD003 constant is the code 0029 actually raises ---------
# ⚠️ NOT REACHABLE OVER HTTP AND SAID SO IN THE HEADER: both branches need
# `expires_at` or `superseded_at` written, and this schema has NO
# `workspace_invite_update` policy at all. `supabase/tests/0029_request_path.sql`
# 7.1 and 7.2 drive them under a role. What is asserted here is the JOIN between
# the app's constant and the applied function, so the two cannot drift apart.
note
RAISES="$(grep -c "errcode = '$GONE'" "$MIGRATION")"
if (( RAISES >= 2 )); then
  ok "$GONE is raised $RAISES times by $(basename "$MIGRATION") — expired and superseded, as REQUEST_GONE claims"
else
  fail "the app's REQUEST_GONE ('$GONE') is raised $RAISES time(s) in $(basename "$MIGRATION"), expected 2"
  echo "      approveErrorMessage answers ES.approvals.errors.gone for this code and"
  echo "      the sentence covers BOTH branches deliberately. If the function stopped"
  echo "      raising it, a shopkeeper would get the honest catch-all for the one"
  echo "      refusal she can actually act on: ask the person to type the code again."
fi

# ---------------------------------------------------------------------------
# ⚠️⚠️ THE ANTI-VACUITY FLOOR, AND IT IS RULE 4 OF THIS REPOSITORY. `fails == 0`
# is ALSO what a run that asserted nothing prints — `5b-split-coverage.sh` ended
# on exactly that for 24 days over the largest split in the plan.
#
# ⚠️ THE NUMBER LIVES IN THIS FILE AND IN NO OTHER. `5b.5` found a count stale in
# three places at once, so the CI step's name does not repeat it and neither does
# the harness: raising an assertion group raises this line and nothing else.
EXPECTED_GROUPS=14
echo
if (( ran < EXPECTED_GROUPS )); then
  echo "FAILED: only $ran of $EXPECTED_GROUPS assertion groups ran — the rest asserted nothing"
  echo "      A green on a short run is the vacuous kind. If a group was removed"
  echo "      on purpose, lower EXPECTED_GROUPS in the same edit and say why."
  exit 1
fi
if (( fails > 0 )); then
  echo "FAILED: $fails of $ran assertion groups"
  exit 1
fi
echo "PASSED: $ran assertion groups — $APPROVE($ID_ARG, $LOC_ARG) answers what this app sends"
exit 0

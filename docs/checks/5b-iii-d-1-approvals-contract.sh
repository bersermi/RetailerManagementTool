#!/usr/bin/env bash
# 5b-iii-d-1-approvals-contract — does `pending_access_requests` still answer to
# the argument name this app sends, still return the six columns the screen
# reads, and is a non-owner still answered with ZERO ROWS rather than refused?
#
# WHY THIS EXISTS, AND IT IS THE SIBLING CHECKS' ARGUMENT ON THE APPROVER'S SIDE.
# `app/test/api-approvals.test.ts` can prove the app is consistent with itself.
# Nothing in TypeScript has ever read `0037`, and PostgREST matches an RPC BY ITS
# PARAMETER NAMES — so a `p_` name that drifts is not a type error, it is a 404
# the typecheck, the suite and the bundler all pass straight over, reaching an
# owner as a bell that is simply never there.
#
# ⚠️⚠️ AND IT ASSERTS THE THREE THINGS THIS TASK ACTUALLY TURNS ON, NONE OF WHICH
# ANY SUITE CAN REACH:
#
#   THE FENCE, AS A PAIR. `0037`'s decision 2 answers a non-owner with an EMPTY
#   LIST rather than `42501` — deliberately, so this path does not acquire a
#   THIRD meaning for a SQLSTATE already carrying two. That makes "you may not
#   see this" and "nobody is waiting" the same answer on the wire, and it is why
#   `canApprove` is a client-side fence. ⚠️ AN EMPTY LIST AND A REFUSED LIST LOOK
#   ALIKE FROM A ROW COUNT, which is the vacuous-green shape `0035` 5.2 records —
#   so assertion 6 reads the SAME workspace holding the SAME two pending requests
#   as an owner (two rows) and as a manager, a cashier, a stranger and the
#   requester herself (zero). One of those two must be the fence, and the PAIR is
#   what says which.
#
#   THE NAME, AND THAT IT IS REACHABLE NO OTHER WAY. The whole of `5b-iii-c`
#   exists because the owner's ruling of 2026-09-19 needs a name that is on no
#   table this caller may select: a person who has asked to join has no
#   `workspace_member` row until `approve_request` writes one. Assertion 5 makes
#   the owner try the other doors — the invite row itself, and `auth_full_name`
#   directly — and they must both stay shut. If either ever opens, `0037` has
#   become a convenience rather than the only route, and the widening is one
#   predicate away from §2.7's floor.
#
#   `source = 'request'` IS NOT DECORATION. Without it this hands the owner every
#   outstanding PUSH invite too — addresses he typed himself, with no requester
#   and therefore no name at all — and the badge would count invitations he sent
#   as people waiting to be let in. Assertion 8 issues one and demands it stay
#   out of the queue.
#
# WHAT IT ASSERTS, all against a REAL round trip over HTTP, with seven real
# people and two shops:
#
#   1. The RPC's name, its `p_` argument and its SIX COLUMNS are READ OUT OF
#      `app/src/api/approvals.ts` — not typed in here. A second copy of a
#      contract is the defect this repository has recorded eleven times.
#   2. The argument name the app sends is the one the function answers to, and a
#      deliberately wrong one is `PGRST202` — so assertion 2 also proves this
#      check could SEE a drift rather than merely not meeting one.
#   3. The columns the app names are EXACTLY the columns `0037` returns, both
#      ways. A renamed column is not an error at the client: it is a header that
#      silently renders blank on the one screen that identifies a stranger.
#   4. The queue holds the people who asked, under the addresses they signed up
#      with, and carries the NAME the ruling of 2026-09-19 put beneath it.
#      ⚠️ And a requester whose account has no name comes back NULL — never `''`
#      — which is `0037`'s decision 4 and the one case the screen must render as
#      an address with nothing under it.
#   5. ⚠️⚠️ THE NAME HAS NO SECOND DOOR — see above.
#   6. ⚠️⚠️ THE FENCE MEASURED AS A PAIR — see above.
#   7. It is WORKSPACE-SCOPED: the owner of the OTHER shop, passing this shop's
#      id, reads zero. `0037`'s decision 5, and `0001:317` admits many shops per
#      person from day one.
#   8. ⚠️⚠️ A PUSH INVITE IS NOT IN THE QUEUE — see above.
#   9. The ORDERING `pendingFrom` trusts: `0037` promises `order by created_at
#      desc` and the app renders the list in the order it arrives rather than
#      sorting a string against the phone's own clock.
#
# ⚠️ WHAT IT DOES NOT ASSERT, NAMED RATHER THAN LEFT TO BE FOUND:
#
#   * ANYTHING ABOUT THE SCREEN. §2.11 refuses suites over rendering, so that the
#     bell sits in the body of Inicio and not in the header, that a manager sees
#     no bell at all, and that the badge reads the count beside its word are the
#     owner's own phone (`R9`). ⚠️ The ORDER OF THE TWO LINES is the exception and
#     it is deliberate: it lives in `linesOf`, a pure function, so
#     `app/test/api-approvals.test.ts` pins the ruling of 2026-09-19 instead of a
#     paragraph claiming it was obeyed.
#   * THAT AN APPROVED REQUEST LEAVES THE QUEUE. Setting that up needs
#     `approve_request`, whose contract module is `5b-iii-d-2`'s and does not
#     exist yet — and spelling its `p_` names here would put a contract in this
#     file that nothing in the app can be checked against, which is the shape
#     assertion 1 exists to refuse. The four-part definition of pending is
#     already driven under `set role authenticated` by
#     `supabase/tests/0037_pending_access_requests.sql`, 38 behavioural checks.
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. The trap nine other checks here already recorded.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b-iii-d-1-approvals-contract.sh
# With: a path to the approvals contract as $1, the workspace contract as $2, the
#       requests contract as $3, the invites contract as $4, the credentials
#       module as $5 and the redeem contract as $6, which is how a falsification
#       harness points it at mutated copies. ⚠️ ALL SIX ARE PARAMETERS BECAUSE
#       ALL SIX ARE READ: `conventions-gate-falsify.sh` spent a day running none
#       of its sixteen fixtures because the gate it falsifies gained an input the
#       harness was never told to copy.
# Exit: 0 the applied function answers what this app sends; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/approvals.ts}"
WORKSPACE_CONTRACT="${2:-app/src/api/workspace.ts}"
REQUEST_CONTRACT="${3:-app/src/api/requests.ts}"
INVITE_CONTRACT="${4:-app/src/api/invites.ts}"
CREDENTIALS="${5:-app/src/auth/credentials.ts}"
REDEEM_CONTRACT="${6:-app/src/api/redeem.ts}"
for f in "$CONTRACT" "$WORKSPACE_CONTRACT" "$REQUEST_CONTRACT" "$INVITE_CONTRACT" "$CREDENTIALS" \
         "$REDEEM_CONTRACT"; do
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
PENDING="$(sed -n "s/^export const PENDING_ACCESS_REQUESTS = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
ONBOARD="$(sed -n "s/^export const ONBOARD_WORKSPACE = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"
WORKSPACE_COLUMNS="$(sed -n "s/^export const WORKSPACE_COLUMNS = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"
REQUEST_ACCESS="$(sed -n "s/^export const REQUEST_ACCESS = '\([^']*\)';.*/\1/p" "$REQUEST_CONTRACT" | head -1)"
CREATE_INVITE="$(sed -n "s/^export const CREATE_INVITE = '\([^']*\)';.*/\1/p" "$INVITE_CONTRACT" | head -1)"
REDEEM_INVITE="$(sed -n "s/^export const REDEEM_INVITE = '\([^']*\)';.*/\1/p" "$REDEEM_CONTRACT" | head -1)"
FULL_NAME_KEY="$(sed -n "s/^export const FULL_NAME_KEY = '\([^']*\)';.*/\1/p" "$CREDENTIALS" | head -1)"

# ⚠️ THE `p_` NAME AND THE COLUMN LIST ARE READ OUT OF THE APP'S OWN INTERFACES,
# not typed here — the whole contract this file exists to assert, so a copy of it
# here would make assertions 2 and 3 tautologies. That is the seventh shape of
# misleading green this repository has recorded, and it is a check agreeing with
# itself.
QUEUE_ARGS="$(sed -n '/^export interface PendingRequestsArgs {/,/^}/p' "$CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p')"
QUEUE_ARG_N="$(printf '%s\n' "$QUEUE_ARGS" | grep -c . )"
QUEUE_ARG="$(printf '%s\n' "$QUEUE_ARGS" | head -1)"

COLUMNS="$(sed -n '/^export interface PendingRequestRow {/,/^}/p' "$CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p')"
COLUMN_N="$(printf '%s\n' "$COLUMNS" | grep -c . )"

# The two `p_` names the sibling modules send, for minting the fixtures. Read,
# never typed — `5b-iii-b`'s arrangement.
INVITE_ARGS="$(sed -n '/^export interface CreateInviteArgs {/,/^}/p' "$INVITE_CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p')"
ASK_ARG="$(sed -n '/^export interface RequestAccessArgs {/,/^}/p' "$REQUEST_CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p' | head -1)"
REDEEM_ARG="$(sed -n '/^export interface RedeemInviteArgs {/,/^}/p' "$REDEEM_CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p' | head -1)"

has_column() { printf '%s\n' "$COLUMNS" | grep -qx "$1"; }

note
if [[ -z "$PENDING" || -z "$ONBOARD" || -z "$WORKSPACE_COLUMNS" || -z "$REQUEST_ACCESS" \
      || -z "$CREATE_INVITE" || -z "$REDEEM_INVITE" || -z "$FULL_NAME_KEY" \
      || -z "$ASK_ARG" || -z "$REDEEM_ARG" ]] \
   || (( QUEUE_ARG_N != 1 )) || (( COLUMN_N < 5 )) \
   || ! has_column request_id || ! has_column email || ! has_column requester_name \
   || ! has_column role || ! has_column requested_at; then
  fail "could not read the approvals contract out of $CONTRACT"
  echo "      queue='$PENDING($QUEUE_ARG)' columns=[$(printf '%s ' $COLUMNS)] ($COLUMN_N)"
  echo "      ask='$REQUEST_ACCESS($ASK_ARG)' invite='$CREATE_INVITE' name_key='$FULL_NAME_KEY'"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: $PENDING($QUEUE_ARG) over $COLUMN_N columns"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi

# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE. The secret key bypasses RLS,
# and assertions 5, 6 and 7 — every one that matters — would then pass vacuously
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
# ⚠️ `is_null` AND NOT `== ''`. `0037`'s decision 4 says the name is NULL and
# never the empty string for an account whose provider sent none, and those two
# are the same value once bash has it — so the distinction is made in python,
# where JSON still has a `null`.
is_null() { python3 -c "
import sys,json
d=json.load(open(sys.argv[1]))
v=d[int(sys.argv[2])].get(sys.argv[3], 'MISSING') if isinstance(d,list) and len(d)>int(sys.argv[2]) else 'MISSING'
print('null' if v is None else ('missing' if v=='MISSING' else 'value'))" "$1" "$2" "$3" 2>/dev/null; }
keys_of() { python3 -c "
import sys,json
d=json.load(open(sys.argv[1]))
print('\n'.join(sorted(d[0].keys())) if isinstance(d,list) and d else '')" "$1" 2>/dev/null; }

# ⚠️⚠️ EVERY REQUEST BODY IS KEYED BY A NAME READ OUT OF THE APP, never by a name
# typed in this file. `5b-i`'s recorded arrangement: if this script spelled the
# argument names itself it would carry the very prefix the check exists to test,
# and a fixture that renames one in the app would stay green because the check
# would keep sending the right thing.
one_arg() { # name value -> {"name": "value"}
  python3 -c 'import json,sys;print(json.dumps({sys.argv[1]: sys.argv[2]}))' "$1" "$2"
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
PASSWORD='queue-probe-123'
# ⚠️ TWO SURNAMES AND ACCENTS, `5b.7`'S PROBE NAME AND ITS ARGUMENT: this is a
# Mexican app whose users are mostly called things with accents in, and a
# transport that mangled UTF-8 would otherwise be green on the one column this
# whole migration exists to carry.
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

# --- the two shops and the seven people ------------------------------------
OWNER_EMAIL="queue-owner-$STAMP@example.com"
OWNER2_EMAIL="queue-owner2-$STAMP@example.com"
NAMED_EMAIL="queue-named-$STAMP@example.com"
BARE_EMAIL="queue-bare-$STAMP@example.com"
MANAGER_EMAIL="queue-manager-$STAMP@example.com"
CASHIER_EMAIL="queue-cashier-$STAMP@example.com"
STRANGER_EMAIL="queue-stranger-$STAMP@example.com"
PUSHED_EMAIL="queue-pushed-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"

CREATED="$(api POST "/rest/v1/rpc/$ONBOARD" \
  '{"p_display_name":"Aprobar 5b-iii-d-1","p_prices_include_tax":true,"p_location_name":"Centro"}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

WS="$(stash workspace "$(api GET "/rest/v1/workspace?select=$WORKSPACE_COLUMNS")")"
SHOP_CODE="$(python3 -c "import sys,json;print(json.load(open(sys.argv[1]))[0].get('code',''))" "$WS" 2>/dev/null)"
[[ -n "$SHOP_CODE" ]] || { echo "FAIL: could not read the shop's join code — $(cat "$WS")"; exit 1; }

LOCS="$(stash locations "$(api GET "/rest/v1/location?select=id,name")")"
CENTRO="$(row "$LOCS" 0 id)"
[[ -n "$CENTRO" ]] || { echo "FAIL: could not read the store — $(cat "$LOCS")"; exit 1; }

# A manager and a cashier, minted the way the app mints them: an invite issued by
# the owner and redeemed by the person. They exist for assertion 6 and nothing
# else — a fence read by nobody who could plausibly be refused is a fence
# nobody has tested.
mint_member() { # email role locations-json -> signs them up and redeems
  local issued token
  TOKEN="$OWNER_TOKEN"
  issued="$(stash "invite-$2" "$(api POST "/rest/v1/rpc/$CREATE_INVITE" "$(invite_body "$1" "$2" "$3")")")"
  token="$(jfield "$issued" token)"
  [[ -n "$token" ]] || { echo "FAIL: could not issue the $2 invite — $(cat "$issued")"; exit 1; }
  signup "$1"
  api POST "/rest/v1/rpc/$REDEEM_INVITE" "$(one_arg "$REDEEM_ARG" "$token")" > /dev/null
}

mint_member "$MANAGER_EMAIL" manager '[]';        MANAGER_TOKEN="$TOKEN"
mint_member "$CASHIER_EMAIL" staff "[\"$CENTRO\"]"; CASHIER_TOKEN="$TOKEN"

# The second shop, for the workspace-scoping assertion.
signup "$OWNER2_EMAIL"; OWNER2_TOKEN="$TOKEN"
api POST "/rest/v1/rpc/$ONBOARD" \
  '{"p_display_name":"La Segunda 5b-iii-d-1","p_prices_include_tax":true,"p_location_name":"Sur"}' > /dev/null

signup "$STRANGER_EMAIL"; STRANGER_TOKEN="$TOKEN"

# The two people waiting: one whose account carries a name, one whose does not.
# ⚠️ THE ORDER IS LOAD-BEARING FOR ASSERTION 9 — `bare` asks second, so `bare`
# must lead a list `0037` promises newest-first.
signup "$NAMED_EMAIL" "$PROBE_NAME"; NAMED_TOKEN="$TOKEN"
api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(one_arg "$ASK_ARG" "$SHOP_CODE")" > /dev/null
signup "$BARE_EMAIL"; BARE_TOKEN="$TOKEN"
api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(one_arg "$ASK_ARG" "$SHOP_CODE")" > /dev/null

queue_as() { # token -> the stashed response file, via $QUEUE_FILE / $QUEUE_RAW
  local ws="${2:-$WORKSPACE_ID}"
  TOKEN="$1"
  QUEUE_RAW="$(api POST "/rest/v1/rpc/$PENDING" "$(one_arg "$QUEUE_ARG" "$ws")")"
  QUEUE_FILE="$(stash "queue-$3" "$QUEUE_RAW")"
}

# --- 2. the argument name the app sends is the one 0037 answers to ---------
note
TOKEN="$OWNER_TOKEN"
WRONG="$(api POST "/rest/v1/rpc/$PENDING" "{\"p_taller\":\"$WORKSPACE_ID\"}")"
WRONG_CODE="$(jfield "$(stash wrong "$WRONG")" code)"
if [[ "$WRONG_CODE" == "PGRST202" ]]; then
  ok "a wrong argument name is PGRST202 — this check can see a drift"
else
  fail "a deliberately wrong argument name answered '$WRONG_CODE', not PGRST202"
  echo "      Without this, assertion 3 passing would say nothing: a check that"
  echo "      cannot fail on a rename is not asserting the rename."
fi

# --- 3. the columns the app names are the columns 0037 returns ------------
note
queue_as "$OWNER_TOKEN" "$WORKSPACE_ID" owner
GOT_COLUMNS="$(keys_of "$QUEUE_FILE")"
MISSING=""; EXTRA=""
for c in $COLUMNS; do
  grep -qx "$c" <<< "$GOT_COLUMNS" || MISSING="$MISSING $c"
done
for c in $GOT_COLUMNS; do
  has_column "$c" || EXTRA="$EXTRA $c"
done
if [[ "$(status "$QUEUE_RAW")" == "200" && -z "$MISSING" && -z "$EXTRA" ]]; then
  ok "the $COLUMN_N columns PendingRequestRow names are exactly what $PENDING returns"
else
  fail "the app and $PENDING disagree about the columns: missing[$MISSING ] extra[$EXTRA ]"
  echo "      HTTP $(status "$QUEUE_RAW"). A renamed column is not an error at the"
  echo "      client — it is a header that renders BLANK on the one screen whose"
  echo "      whole job is to identify a stranger, and nothing else would notice."
  sed 's/^/        /' "$QUEUE_FILE" | head -4
fi

# --- 4. the queue names the people who asked, and carries the name --------
note
QUEUE_N="$(rows "$QUEUE_FILE")"
NAMED_ROW=""; BARE_ROW=""
for i in 0 1; do
  case "$(row "$QUEUE_FILE" "$i" email)" in
    "$NAMED_EMAIL") NAMED_ROW="$i" ;;
    "$BARE_EMAIL")  BARE_ROW="$i" ;;
  esac
done
if [[ "$QUEUE_N" == "2" && -n "$NAMED_ROW" && -n "$BARE_ROW" ]]; then
  ok "the owner's queue holds both askers, under the addresses they signed up with"
else
  fail "the queue came back $QUEUE_N row(s); named=$NAMED_ROW bare=$BARE_ROW"
  echo "      The EMAIL is the header of an approval entry — the owner's ruling of"
  echo "      2026-09-19 — so a queue that cannot be matched to an address is a"
  echo "      screen an approver cannot act on."
  sed 's/^/        /' "$QUEUE_FILE" | head -6
fi

note
GOT_NAME="$(row "$QUEUE_FILE" "${NAMED_ROW:-0}" requester_name)"
if [[ "$GOT_NAME" == "$PROBE_NAME" ]]; then
  ok "the NAME comes back beneath it, accents and both surnames intact"
else
  fail "the requester's name came back '$GOT_NAME', not '$PROBE_NAME'"
  echo "      This column is the whole of why 0037 exists. Without it the ruling of"
  echo "      2026-09-19 — email as the header, NAME as the subtitle — has no"
  echo "      subtitle, and the screen is what it was before the migration."
fi

note
# ⚠️ NULL AND NEVER `''`. `0034` admits an account whose provider sent no name and
# `auth_full_name` returns NULL for it; an empty string would render as a gap
# under the address instead of as nothing at all.
BARE_NAME="$(is_null "$QUEUE_FILE" "${BARE_ROW:-1}" requester_name)"
if [[ "$BARE_NAME" == "null" ]]; then
  ok "a requester whose account has no name comes back NULL, not an empty string"
else
  fail "the nameless requester's name is '$BARE_NAME', expected null"
  echo "      0037 decision 4 and 0034 section 2: NULL is the value, and the screen"
  echo "      renders an address with nothing under it. An empty string is a gap."
fi

# --- 5. the name has no second door ---------------------------------------
note
TOKEN="$OWNER_TOKEN"
DIRECT="$(api GET "/rest/v1/workspace_invite?select=*")"
DIRECT_FILE="$(stash direct "$DIRECT")"
DIRECT_KEYS="$(keys_of "$DIRECT_FILE")"
if [[ "$(status "$DIRECT")" == "200" ]] && grep -qx "email" <<< "$DIRECT_KEYS" \
   && ! grep -qx "requester_name" <<< "$DIRECT_KEYS"; then
  ok "the invite row itself carries the EMAIL and no name — $PENDING is the only door"
else
  fail "selecting workspace_invite directly answered $(status "$DIRECT") with keys [$(echo $DIRECT_KEYS)]"
  echo "      If a name ever appears on that row, 0037 has become a convenience"
  echo "      rather than the only route — and a column meaning one thing for a"
  echo "      request and nothing for an invite is the shape 5b-iii-c refused."
fi

note
AUTH_NAME="$(api POST "/rest/v1/rpc/auth_full_name" "{\"p_user_id\":\"$USER_ID\"}")"
AUTH_STATUS="$(status "$AUTH_NAME")"
if [[ "$AUTH_STATUS" != "200" ]]; then
  ok "auth_full_name is not callable from a phone (HTTP $AUTH_STATUS) — it is granted to nobody"
else
  fail "auth_full_name answered a client directly"
  echo "      0034 grants it to NOBODY and it is reachable only from a definer"
  echo "      body. A client that can call it can read any account's name in the"
  echo "      instance, which is §2.7's floor rather than this screen's fence."
fi

# --- 6. ⚠️⚠️ the fence, measured as a PAIR --------------------------------
# ⚠️ THE OWNER'S TWO ROWS ABOVE ARE HALF OF THIS ASSERTION. Zero rows on its own
# says nothing — a broken function returns zero rows for everybody — so what is
# asserted is the DIFFERENCE across one workspace holding the same two requests.
note
fenced=0
check_fenced() { # token label
  queue_as "$1" "$WORKSPACE_ID" "$2"
  local st n
  st="$(status "$QUEUE_RAW")"; n="$(rows "$QUEUE_FILE")"
  if [[ "$st" == "200" && "$n" == "0" ]]; then
    return 0
  fi
  fail "$2 read the queue as HTTP $st with $n row(s) — expected 200 and zero"
  echo "      0037 decision 2: a non-owner is answered with an EMPTY LIST and is"
  echo "      NOT refused, because 42501 already carries two meanings on this path"
  echo "      and a refusal here would make it a fourth. A raise is as wrong as a row."
  fenced=1
}
check_fenced "$MANAGER_TOKEN"  manager
check_fenced "$CASHIER_TOKEN"  cashier
check_fenced "$STRANGER_TOKEN" stranger
check_fenced "$NAMED_TOKEN"    requester
if (( fenced == 0 )); then
  ok "owner 2 rows; manager, cashier, stranger and the requester herself 0 — and no refusal"
fi

# --- 7. it is workspace-scoped --------------------------------------------
note
queue_as "$OWNER2_TOKEN" "$WORKSPACE_ID" other-owner
if [[ "$(status "$QUEUE_RAW")" == "200" && "$(rows "$QUEUE_FILE")" == "0" ]]; then
  ok "the other shop's owner, passing this shop's id, reads zero"
else
  fail "another shop's owner read $(rows "$QUEUE_FILE") row(s) of this shop's queue"
  echo "      0037 decision 5 scopes it to one workspace, and 0001:317 admits many"
  echo "      shops per person from day one. An owner of two shops must not be"
  echo "      shown one queue with two shops' strangers in it."
fi

# --- 8. ⚠️⚠️ a PUSH invite is not a person waiting ------------------------
note
TOKEN="$OWNER_TOKEN"
api POST "/rest/v1/rpc/$CREATE_INVITE" "$(invite_body "$PUSHED_EMAIL" manager '[]')" > /dev/null
queue_as "$OWNER_TOKEN" "$WORKSPACE_ID" after-push
PUSHED_IN=no
for i in 0 1 2; do
  [[ "$(row "$QUEUE_FILE" "$i" email)" == "$PUSHED_EMAIL" ]] && PUSHED_IN=yes
done
if [[ "$(rows "$QUEUE_FILE")" == "2" && "$PUSHED_IN" == "no" ]]; then
  ok "an invite the owner sent is NOT in the queue — source = 'request' is real"
else
  fail "the queue grew to $(rows "$QUEUE_FILE") row(s) after one push invite (present=$PUSHED_IN)"
  echo "      0037 decision 3: without \`source = 'request'\` this hands the owner"
  echo "      every outstanding invite he typed himself — with no requester and"
  echo "      therefore no name — and the badge counts his own invitations as"
  echo "      people waiting to be let in."
fi

# --- 9. the ordering pendingFrom trusts ------------------------------------
note
NEWEST="$(row "$QUEUE_FILE" 0 email)"
if [[ "$NEWEST" == "$BARE_EMAIL" ]]; then
  ok "newest first: the second asker leads, which is the order pendingFrom trusts"
else
  fail "the queue leads with '$NEWEST', expected the later asker '$BARE_EMAIL'"
  echo "      0037 promises \`order by wi.created_at desc\` and @/api/approvals"
  echo "      renders the list in the order it arrives rather than sorting"
  echo "      requested_at, which is a string at the client and is compared"
  echo "      against a phone clock that is not the database's."
fi

# ---------------------------------------------------------------------------
# ⚠️⚠️ THE ANTI-VACUITY FLOOR, AND IT IS RULE 4 OF THIS REPOSITORY. `fails == 0`
# is ALSO what a run that asserted nothing prints — `5b-split-coverage.sh` ended
# on exactly that for 24 days over the largest split in the plan, and `3.3` found
# a suite that printed `not ok` and exited 0. A `note` deleted with the assertion
# it counted is the shape that gets here.
#
# ⚠️ THE NUMBER LIVES IN THIS FILE AND IN NO OTHER. `5b.5` found a count stale in
# three places at once, so the CI step's name does not repeat it and neither does
# the harness: raising an assertion group raises this line and nothing else.
EXPECTED_GROUPS=12
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
echo "PASSED: $ran assertion groups — $PENDING($QUEUE_ARG) answers what this app sends"
exit 0

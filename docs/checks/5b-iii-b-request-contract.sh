#!/usr/bin/env bash
# 5b-iii-b-request-contract — does `request_access` still answer to the argument
# name this app sends, is `my_access_requests` still the ONLY way a joiner can
# see her own row, and are the two meanings of `42501` still indistinguishable?
#
# WHY THIS EXISTS, AND IT IS THE SIBLING CHECKS' ARGUMENT ON THE PULL PATH.
# `app/test/api-requests.test.ts` can prove the app is consistent with itself.
# Nothing in TypeScript has ever read `0029`, and PostgREST matches an RPC BY ITS
# PARAMETER NAMES — so a `p_` name that drifts is not a type error, it is a 404
# the typecheck, the suite and the bundler all pass straight over, reaching a
# person as a button that does nothing on the one screen she has no way around.
#
# ⚠️⚠️ AND IT ASSERTS THE TWO THINGS THIS TASK ACTUALLY TURNS ON, NEITHER OF
# WHICH ANY SUITE CAN REACH:
#
#   `S3` — that a joiner CANNOT read her own request any other way. The whole
#   reason `my_access_requests` is a `security definer` function is that
#   `workspace_invite_select` is manager-and-above and somebody who has just
#   asked has no role at all. If a policy were ever widened to "you may see the
#   row you requested", the function would become redundant and the widening
#   would be one predicate away from the shop-enumeration `D6` refuses. Only a
#   live database with a real non-member in it can tell you which is true, and
#   assertion 5 makes her try.
#
#   THE `42501` OVERLOAD — that an unknown code and an absent session still come
#   back INDISTINGUISHABLE. `@/api/requests` reads `42501` on this screen as "no
#   such shop", against `@/api/errors` mapping it app-wide to "your session
#   ended", and that reading is a judgement about who is standing in front of the
#   phone rather than a contract. Assertion 9 drives both and compares them.
#   ⚠️ IT IS WRITTEN TO TURN OVER: the day a SQLSTATE is minted for the unknown
#   code — `5b-iii-a` did exactly this for `redeem_invite`, and `0036` is the
#   precedent — this assertion goes red on a correct tree and is REPLACED by its
#   opposite, in the same pass that deletes `UNKNOWN_CODE` from the app. A marker
#   and the assertion that drives it retire together; that is `5b-iii-a`'s rule
#   and this check is its next instance waiting to happen.
#
# WHAT IT ASSERTS, all against a REAL round trip over HTTP, with four real
# people and two shops:
#
#   1. Both RPC names, the `p_` argument and the refusal map are READ OUT OF
#      `app/src/api/requests.ts` — not typed in here. A second copy of a contract
#      is the defect this repository has recorded eleven times.
#   2. The argument name the app sends is the one the function answers to, and a
#      deliberately wrong one is `PGRST202` — so assertion 2 also proves this
#      check could SEE a drift rather than merely not meeting one.
#   3. `my_access_requests` takes NO argument and is callable by somebody who
#      belongs to no shop at all. That is `0029`'s grant to `authenticated`, and
#      it is the one read in this app that is not fenced on a role.
#   4. The ask WRITES: a real code answers `requested`, and the pending row comes
#      back through the function naming the shop, with the status string the app
#      knows. A jsonb answer is not a row.
#   5. ⚠️⚠️ `S3` MEASURED: the SAME joiner selecting `workspace_invite` directly
#      gets ZERO rows for the row she just created. The definer function is not a
#      convenience, it is the only door — and a policy widened to open a second
#      one turns this red.
#   6. A second ask answers `already_requested` and hands back the SAME request,
#      not a second row. `0029`'s decision 5: she taps twice on a bad connection,
#      and the pilot store is offline a lot.
#   7. ⚠️ `D7` ABSORBED: a person who was already INVITED by email and types the
#      SHOP's code instead of her token is let straight in — `joined`, and she
#      can read `workspace` a moment later. This is why `useRequestAccess`
#      invalidates the membership read on every success and not only on the ones
#      it expects.
#   8. Asking again from inside answers `already_member`, which is the other
#      status the app must not render as a pending ask.
#   9. ⚠️⚠️ THE OVERLOAD IS REAL, ASSERTED RATHER THAN ASSUMED — see above.
#  10. The ORDERING `pendingRequest` trusts: `0029` promises `order by created_at
#      desc` and the app takes the first `pending` row rather than sorting a
#      string. Two asks, and the newest comes back first.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Anything about the SCREEN. §2.11 refuses suites over
# rendering, so that the pending block appears below the code box, that one box
# is rendered and not two, and that the guard moves her to Inicio on the `joined`
# path are the owner's own phone (`R9`).
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. The trap eight other checks here already recorded.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b-iii-b-request-contract.sh
# With: a path to the request contract as $1, the redeem contract as $2, the
#       invite contract as $3 and the workspace contract as $4, which is how a
#       falsification harness points it at mutated copies.
# Exit: 0 the applied functions answer to what this app sends; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/requests.ts}"
REDEEM_CONTRACT="${2:-app/src/api/redeem.ts}"
INVITE_CONTRACT="${3:-app/src/api/invites.ts}"
WORKSPACE_CONTRACT="${4:-app/src/api/workspace.ts}"
for f in "$CONTRACT" "$REDEEM_CONTRACT" "$INVITE_CONTRACT" "$WORKSPACE_CONTRACT"; do
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
REQUEST_ACCESS="$(sed -n "s/^export const REQUEST_ACCESS = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
MY_REQUESTS="$(sed -n "s/^export const MY_ACCESS_REQUESTS = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
UNKNOWN_CODE="$(sed -n "s/^export const UNKNOWN_CODE = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
CODE_LENGTH="$(sed -n 's/^export const CODE_LENGTH = \([0-9]*\);.*/\1/p' "$REDEEM_CONTRACT" | head -1)"
CREATE_INVITE="$(sed -n "s/^export const CREATE_INVITE = '\([^']*\)';.*/\1/p" "$INVITE_CONTRACT" | head -1)"
ONBOARD="$(sed -n "s/^export const ONBOARD_WORKSPACE = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"
WORKSPACE_COLUMNS="$(sed -n "s/^export const WORKSPACE_COLUMNS = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"

# ⚠️ THE `p_` NAME IS READ OUT OF THE INTERFACE, not typed here — the whole
# contract this file exists to assert, so a copy of it here would make assertion
# 2 a tautology. That is the seventh shape of misleading green this repository
# has recorded, and it is a check agreeing with itself.
ASK_ARGS="$(sed -n '/^export interface RequestAccessArgs {/,/^}/p' "$CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p')"
ASK_ARG_N="$(printf '%s\n' "$ASK_ARGS" | grep -c . )"
ASK_ARG="$(printf '%s\n' "$ASK_ARGS" | head -1)"

# The four statuses the app reads, and the four states it renders — read off the
# app's own arrays so assertions 4, 6, 7 and 8 test the app's claim rather than
# four strings this file believes.
STATUSES="$(sed -n '/^export const ACCESS_STATUSES = \[/,/\] as const;/p' "$CONTRACT" \
  | sed -n "s/^  '\([a-z_]*\)',.*/\1/p")"
STATES="$(sed -n "s/^export const REQUEST_STATES = \[\(.*\)\] as const;.*/\1/p" "$CONTRACT" \
  | tr -d " '" | tr ',' '\n' | grep -c . )"

# The `p_` names the sibling module sends, for minting the `D7` fixture.
INVITE_ARGS="$(sed -n '/^export interface CreateInviteArgs {/,/^}/p' "$INVITE_CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p')"

has_status() { printf '%s\n' "$STATUSES" | grep -qx "$1"; }

note
if [[ -z "$REQUEST_ACCESS" || -z "$MY_REQUESTS" || -z "$UNKNOWN_CODE" || -z "$CODE_LENGTH" \
      || -z "$CREATE_INVITE" || -z "$ONBOARD" || -z "$WORKSPACE_COLUMNS" ]] \
   || (( ASK_ARG_N != 1 )) || (( STATES < 4 )) \
   || ! has_status requested || ! has_status already_requested \
   || ! has_status already_member || ! has_status joined; then
  fail "could not read the request contract out of $CONTRACT"
  echo "      ask='$REQUEST_ACCESS($ASK_ARG)' read='$MY_REQUESTS' unknown='$UNKNOWN_CODE'"
  echo "      statuses=[$(printf '%s ' $STATUSES)] states=$STATES code_len=$CODE_LENGTH"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: $REQUEST_ACCESS($ASK_ARG), $MY_REQUESTS(), unknown-code '$UNKNOWN_CODE'"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi

# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE. The secret key bypasses RLS,
# and assertions 5, 7 and 9 would then pass vacuously for exactly the reason
# supabase/README.md gives about the `postgres` superuser.
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

# ⚠️⚠️ EVERY REQUEST BODY IS KEYED BY A NAME READ OUT OF THE APP, never by a name
# typed in this file. `5b-i`'s recorded arrangement: if this script spelled the
# argument names itself it would carry the very prefix the check exists to test,
# and a fixture that renames one in the app would stay green because the check
# would keep sending the right thing.
ask_body() { # code -> the JSON body, keyed by the app's own name
  python3 -c 'import json,sys;print(json.dumps({sys.argv[1]: sys.argv[2]}))' "$ASK_ARG" "$1"
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
signup() { # email -> sets TOKEN and USER_ID
  local out payload
  payload="{\"email\":\"$1\",\"password\":\"request-probe-123\"}"
  out="$(TOKEN="" api POST /auth/v1/signup "$payload")"
  TOKEN="$(pick access_token "$(body "$out")")"
  USER_ID="$(python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('id',''))" <<< "$(body "$out")" 2>/dev/null)"
  [[ -n "$TOKEN" && -n "$USER_ID" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}

# --- the two shops and the four people -------------------------------------
OWNER_EMAIL="ask-owner-$STAMP@example.com"
ASKER_EMAIL="ask-asker-$STAMP@example.com"
INVITEE_EMAIL="ask-invitee-$STAMP@example.com"
OWNER2_EMAIL="ask-owner2-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"

CREATED="$(api POST "/rest/v1/rpc/$ONBOARD" \
  '{"p_display_name":"Pedir 5b-iii-b","p_prices_include_tax":true,"p_location_name":"Centro"}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

WS="$(stash workspace "$(api GET "/rest/v1/workspace?select=$WORKSPACE_COLUMNS")")"
SHOP_CODE="$(python3 -c "import sys,json;print(json.load(open(sys.argv[1]))[0].get('code',''))" "$WS" 2>/dev/null)"
SHOP_NAME="$(python3 -c "import sys,json;print(json.load(open(sys.argv[1]))[0].get('display_name',''))" "$WS" 2>/dev/null)"
[[ -n "$SHOP_CODE" ]] || { echo "FAIL: could not read the shop's join code — $(cat "$WS")"; exit 1; }

LOCS="$(stash locations "$(api GET "/rest/v1/location?select=id,name")")"
CENTRO="$(row "$LOCS" 0 id)"
[[ -n "$CENTRO" ]] || { echo "FAIL: could not read the store — $(cat "$LOCS")"; exit 1; }

# The second shop, for the ordering assertion.
signup "$OWNER2_EMAIL"; OWNER2_TOKEN="$TOKEN"
CREATED2="$(api POST "/rest/v1/rpc/$ONBOARD" \
  '{"p_display_name":"La Segunda 5b-iii-b","p_prices_include_tax":true,"p_location_name":"Sur"}')"
WORKSPACE2_ID="$(body "$CREATED2" | tr -d '"')"
WS2="$(stash workspace2 "$(api GET "/rest/v1/workspace?select=$WORKSPACE_COLUMNS")")"
SHOP2_CODE="$(python3 -c "import sys,json;print(json.load(open(sys.argv[1]))[0].get('code',''))" "$WS2" 2>/dev/null)"
[[ -n "$SHOP2_CODE" ]] || { echo "FAIL: could not read the second shop's code — $(cat "$WS2")"; exit 1; }

# --- 2. the argument name the app sends is the one 0029 answers to ---------
signup "$ASKER_EMAIL"; ASKER_TOKEN="$TOKEN"; ASKER_ID="$USER_ID"

note
WRONG="$(api POST "/rest/v1/rpc/$REQUEST_ACCESS" "{\"p_codigo\":\"$SHOP_CODE\"}")"
WRONG_CODE="$(jfield "$(stash wrong "$WRONG")" code)"
if [[ "$WRONG_CODE" == "PGRST202" ]]; then
  ok "a wrong argument name is PGRST202 — this check can see a drift"
else
  fail "a deliberately wrong argument name answered '$WRONG_CODE', not PGRST202"
  echo "      Without this, assertion 4 passing would say nothing: a check that"
  echo "      cannot fail on a rename is not asserting the rename."
fi

# --- 3. my_access_requests takes no argument, and a non-member may call it --
note
EMPTY="$(api POST "/rest/v1/rpc/$MY_REQUESTS" '{}')"
EMPTY_FILE="$(stash empty "$EMPTY")"
if [[ "$(status "$EMPTY")" == "200" && "$(rows "$EMPTY_FILE")" == "0" ]]; then
  ok "$MY_REQUESTS() answers a caller who belongs to no shop, with an empty list"
else
  fail "$MY_REQUESTS() refused a signed-in non-member: $(status "$EMPTY") $(cat "$EMPTY_FILE")"
  echo "      0029 grants it to \`authenticated\` precisely because the person"
  echo "      asking is a member of nothing. An empty list is the answer."
fi

# --- 4. the ask writes, and the row comes back through the function --------
note
ASKED="$(api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(ask_body "$SHOP_CODE")")"
ASKED_FILE="$(stash asked "$ASKED")"
ASKED_STATUS="$(jfield "$ASKED_FILE" status)"
if [[ "$ASKED_STATUS" == "requested" ]] && has_status "$ASKED_STATUS"; then
  ok "a real code answers '$ASKED_STATUS', a status the app reads"
else
  fail "asking with a real code answered '$ASKED_STATUS', not 'requested'"
fi

note
MINE="$(stash mine "$(api POST "/rest/v1/rpc/$MY_REQUESTS" '{}')")"
MINE_N="$(rows "$MINE")"
MINE_STATE="$(row "$MINE" 0 status)"
MINE_SHOP="$(row "$MINE" 0 workspace_name)"
if [[ "$MINE_N" == "1" && "$MINE_STATE" == "pending" && "$MINE_SHOP" == "$SHOP_NAME" ]]; then
  ok "the pending row comes back through $MY_REQUESTS(), naming '$MINE_SHOP'"
else
  fail "her own request read back as $MINE_N row(s), state '$MINE_STATE', shop '$MINE_SHOP'"
  echo "      Expected exactly one 'pending' row naming '$SHOP_NAME'. This is the"
  echo "      only thing she gets for asking; without it the button does nothing."
fi

# --- 5. S3: the definer function is the ONLY door --------------------------
note
DIRECT="$(stash direct "$(api GET "/rest/v1/workspace_invite?select=id,email,source")")"
DIRECT_N="$(rows "$DIRECT")"
if [[ "$DIRECT_N" == "0" ]]; then
  ok "S3 measured: selecting workspace_invite directly returns 0 rows for the requester"
else
  fail "the requester could read $DIRECT_N workspace_invite row(s) directly"
  echo "      S3 is the entire reason $MY_REQUESTS is \`security definer\`:"
  echo "      workspace_invite_select is manager-and-above and she has no role at"
  echo "      all. A policy widened to open a second door is one predicate away"
  echo "      from the shop enumeration D6 refuses — and it would make this green"
  echo "      check redundant rather than wrong, which is how it would survive."
fi

# --- 6. the second ask is idempotent ---------------------------------------
note
AGAIN="$(stash again "$(api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(ask_body "$SHOP_CODE")")")"
AGAIN_STATUS="$(jfield "$AGAIN" status)"
AGAIN_ID="$(jfield "$AGAIN" request_id)"
FIRST_ID="$(row "$MINE" 0 request_id)"
MINE2="$(stash mine2 "$(api POST "/rest/v1/rpc/$MY_REQUESTS" '{}')")"
if [[ "$AGAIN_STATUS" == "already_requested" ]] && has_status "$AGAIN_STATUS" \
   && [[ "$AGAIN_ID" == "$FIRST_ID" && "$(rows "$MINE2")" == "1" ]]; then
  ok "a second ask is '$AGAIN_STATUS' on the SAME request, and still one row"
else
  fail "the second ask answered '$AGAIN_STATUS' (id '$AGAIN_ID' vs '$FIRST_ID'), $(rows "$MINE2") row(s)"
  echo "      0029 decision 5 makes it idempotent because she taps twice on a bad"
  echo "      connection, and the pilot store is offline a lot. Two rows here"
  echo "      would be two things for an owner to approve."
fi

# --- 7. D7: an invited person who types the shop code is let straight in ----
signup "$INVITEE_EMAIL"; INVITEE_TOKEN="$TOKEN"

TOKEN="$OWNER_TOKEN"
MINTED="$(stash minted "$(api POST "/rest/v1/rpc/$CREATE_INVITE" \
  "$(invite_body "$INVITEE_EMAIL" staff "[\"$CENTRO\"]")")")"
[[ -n "$(jfield "$MINTED" token)" ]] || { echo "FAIL: could not mint the D7 invite — $(cat "$MINTED")"; exit 1; }

note
TOKEN="$INVITEE_TOKEN"
ABSORBED="$(stash absorbed "$(api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(ask_body "$SHOP_CODE")")")"
ABSORBED_STATUS="$(jfield "$ABSORBED" status)"
SEES="$(stash sees "$(api GET "/rest/v1/workspace?select=$WORKSPACE_COLUMNS")")"
if [[ "$ABSORBED_STATUS" == "joined" ]] && has_status "$ABSORBED_STATUS" \
   && [[ "$(rows "$SEES")" == "1" ]]; then
  ok "D7 absorbed: an invited person typing the SHOP code answered '$ABSORBED_STATUS' and is in"
else
  fail "the D7 path answered '$ABSORBED_STATUS' and she reads $(rows "$SEES") shop(s)"
  echo "      §2.7: \"someone already invited who then types the code is simply let"
  echo "      in, and is told none of it.\" The app cannot know this happened from"
  echo "      the outside, which is why useRequestAccess invalidates the"
  echo "      membership read on EVERY success and not only on the ones it expects."
fi

# --- 8. asking again from inside -------------------------------------------
note
INSIDE="$(stash inside "$(api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(ask_body "$SHOP_CODE")")")"
INSIDE_STATUS="$(jfield "$INSIDE" status)"
if [[ "$INSIDE_STATUS" == "already_member" ]] && has_status "$INSIDE_STATUS"; then
  ok "asking from inside answers '$INSIDE_STATUS' — nothing to ask for"
else
  fail "asking from inside the shop answered '$INSIDE_STATUS', not 'already_member'"
fi

# --- 9. THE OVERLOAD: an unknown code and an absent session are the same ----
# ⚠️⚠️ THIS IS THE ASSERTION THE APP'S `UNKNOWN_CODE` RESTS ON, AND IT IS
# WRITTEN TO TURN OVER. It compares the two measurements to EACH OTHER as well
# as to the app's constant, so an editor who changed both expectations would
# still be red. The day a SQLSTATE is minted for the unknown code, this goes red
# on a correct tree and is replaced by its opposite — `0036` is the precedent,
# one RPC over.
note
TOKEN="$ASKER_TOKEN"
NONSENSE="$(stash nonsense "$(api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(ask_body ZZZZZZZZ)")")"
NONSENSE_CODE="$(jfield "$NONSENSE" code)"

TOKEN=""
ANON="$(stash anon "$(api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(ask_body "$SHOP_CODE")")")"
ANON_CODE="$(jfield "$ANON" code)"

if [[ -z "$NONSENSE_CODE" ]]; then
  fail "a nonsense code was not refused at all — $(cat "$NONSENSE")"
elif [[ "$NONSENSE_CODE" != "$UNKNOWN_CODE" ]]; then
  fail "an unknown code answered '$NONSENSE_CODE', and the app maps '$UNKNOWN_CODE'"
  echo "      @/api/requests would show her the wrong sentence. If a SQLSTATE was"
  echo "      just minted for this, that is the GOOD case: update UNKNOWN_CODE and"
  echo "      REPLACE this assertion with its opposite — the two events must then"
  echo "      answer DIFFERENTLY, and this check must say so."
elif [[ "$ANON_CODE" != "$NONSENSE_CODE" ]]; then
  ok "the overload is GONE: anonymous '$ANON_CODE' vs unknown code '$NONSENSE_CODE'"
  echo "      ⚠️ Then @/api/requests no longer needs UNKNOWN_CODE, and this"
  echo "      assertion should be rewritten to REQUIRE the difference. See the"
  echo "      header: a marker and the assertion that drives it retire together."
  fail "the app still carries UNKNOWN_CODE for an overload that no longer exists"
else
  ok "the overload is REAL and measured: both answer '$NONSENSE_CODE' (app reads it as the code)"
fi

# --- 10. the ordering pendingRequest trusts ---------------------------------
note
TOKEN="$ASKER_TOKEN"
api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(ask_body "$SHOP2_CODE")" > /dev/null
ORDERED="$(stash ordered "$(api POST "/rest/v1/rpc/$MY_REQUESTS" '{}')")"
NEWEST="$(row "$ORDERED" 0 workspace_id)"
if [[ "$(rows "$ORDERED")" == "2" && "$NEWEST" == "$WORKSPACE2_ID" ]]; then
  ok "newest first: the second ask leads, which is the order pendingRequest trusts"
else
  fail "two asks came back $(rows "$ORDERED") row(s), newest '$NEWEST' (expected '$WORKSPACE2_ID')"
  echo "      pendingRequest takes the FIRST pending row rather than sorting on"
  echo "      requested_at, because the timestamp is a string at the client and"
  echo "      0029 promises \`order by created_at desc\`. If that promise moved,"
  echo "      she would be shown the wrong shop's name while she waits."
fi

# ---------------------------------------------------------------------------
echo
if (( fails > 0 )); then
  echo "FAILED: $fails of $ran assertion groups"
  exit 1
fi
echo "PASSED: $ran assertion groups — $REQUEST_ACCESS($ASK_ARG) and $MY_REQUESTS() answer what this app sends"
exit 0

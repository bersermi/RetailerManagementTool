#!/usr/bin/env bash
# 5b-ii-b-2-redeem-contract — does `redeem_invite` still answer to the argument
# name this app sends, and are the two credentials still told apart by LENGTH?
#
# WHY THIS EXISTS, AND IT IS `5b-ii-b-1-invite-contract.sh`'s ARGUMENT FROM THE
# OTHER SIDE OF THE LOOP. `app/test/api-redeem.test.ts` can prove the app is
# consistent with itself. Nothing in TypeScript has ever read `0028`, and
# PostgREST matches an RPC BY ITS PARAMETER NAMES — so a `p_` name that drifts is
# not a type error, it is a 404 the typecheck, the suite and the bundler all pass
# straight over, reaching a person as a button that does nothing on the one
# screen she has no way around.
#
# ⚠️⚠️ AND IT ASSERTS THE THING THIS TASK ACTUALLY TURNS ON, WHICH NO SUITE CAN
# REACH: THAT SIXTEEN AND EIGHT ARE STILL THE TWO LENGTHS. `@/api/redeem` decides
# which RPC to call by measuring what the person typed, because an invite token
# and a shop's join code are the same Crockford alphabet, the same normaliser and
# carry no label — the `P2` decision of the `5b-ii-b` sizing. That decision is
# sound only while `generate_invite_token` mints sixteen and `workspace_code_shape`
# admits eight. ⚠️ If either moved, EVERY assertion in the Vitest suite would
# still be green and this app would send a person's invite down the join-code path
# — or refuse a correct credential outright. §2.11 refuses the rendering suite
# that would notice. Assertion 3 mints a REAL token and reads a REAL shop's code
# and measures both against the app's own two constants.
#
# WHAT IT ASSERTS, all against a REAL round trip over HTTP, with three real
# people, one shop and two stores:
#
#   1. The RPC's name, the `p_` argument and the two lengths are READ OUT OF
#      `app/src/api/redeem.ts` — not typed in here. A second copy of a contract
#      is the defect this repository has recorded eleven times.
#   2. The argument name the app sends is the one the function answers to, and a
#      deliberately wrong one is `PGRST202` — so assertion 2 also proves this
#      check could SEE a drift rather than merely not meeting one.
#   3. ⚠️⚠️ `P2` MEASURED: a minted token is exactly `TOKEN_LENGTH` characters,
#      a real shop's `code` is exactly `CODE_LENGTH`, the two differ, and the
#      token is drawn from an alphabet on which the app's normaliser is the
#      IDENTITY — which is what makes "normalise, then measure, then send" send
#      back the same string that was minted.
#   4. The grouping survives the round trip: the token spaced the way this app's
#      own share sheet spaces it (`groupedToken`) redeems. `hash_invite_token`
#      normalises INSIDE the hash, so the two halves cannot disagree — this is
#      what says that is still true.
#   5. Redemption WRITES: the role and the location count come back as the invite
#      set them, and the redeemer — who belonged to no shop a moment ago — can
#      now read `workspace`. A jsonb answer is not a membership.
#   6. A second call by the same caller answers `already_redeemed` and is a 200.
#      `0028` made it idempotent because a joiner taps twice on a bad connection,
#      and the pilot store is offline a lot; the app treats it as a success.
#   7. A THIRD party presenting a spent token is refused with the SQLSTATE the
#      app maps to `spent` — `TD005` as of `0036`, read off the app's own map.
#   8. A SUPERSEDED token is refused with the SQLSTATE the app maps to `expired`.
#   9. ⚠️⚠️ THE OVERLOAD IS GONE, ASSERTED RATHER THAN ASSUMED — AND THIS IS THE
#      SAME ASSERTION IT ALWAYS WAS, TURNED OVER. It used to say that an
#      anonymous caller was refused the SAME code as a dead token, which is why
#      `@/api/redeem` reading it as "dead token" was a judgement about who was
#      standing there rather than a contract. `0036` (task `5b-iii-a`) minted
#      `TD005` for both of `redeem_invite`'s token refusals and left `42501` on
#      the authentication guard alone, so the two now answer DIFFERENTLY — and
#      this assertion is what says so, against a live database, rather than the
#      migration file saying it. ⚠️ The check compares the two measurements to
#      EACH OTHER as well as to the app's map: an editor who changed both
#      expectations would still be red.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Anything about the SCREEN. §2.11 refuses suites over
# rendering, so that the code box appears BELOW the create-a-shop half, that one
# box is rendered and not two, and that the guard actually moves her to Inicio
# once the membership read lands are the owner's own phone (`R9`).
#
# ⚠️ THE FIXTURE IS DRIVEN WITH `create_invite`'s ARGUMENT NAMES READ OUT OF
# `app/src/api/invites.ts`, which is the sibling module and a real contract this
# repository already guards — so minting is not a second typed copy either.
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. The trap seven other checks here already recorded.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b-ii-b-2-redeem-contract.sh
# With: a path to the redeem contract as $1, the invite contract as $2 and the
#       workspace contract as $3, which is how a falsification harness points it
#       at mutated copies.
# Exit: 0 the applied function answers to what this app sends; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/redeem.ts}"
INVITE_CONTRACT="${2:-app/src/api/invites.ts}"
WORKSPACE_CONTRACT="${3:-app/src/api/workspace.ts}"
for f in "$CONTRACT" "$INVITE_CONTRACT" "$WORKSPACE_CONTRACT"; do
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
REDEEM_INVITE="$(sed -n "s/^export const REDEEM_INVITE = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
TOKEN_LENGTH="$(sed -n 's/^export const TOKEN_LENGTH = \([0-9]*\);.*/\1/p' "$CONTRACT" | head -1)"
CODE_LENGTH="$(sed -n 's/^export const CODE_LENGTH = \([0-9]*\);.*/\1/p' "$CONTRACT" | head -1)"
CREATE_INVITE="$(sed -n "s/^export const CREATE_INVITE = '\([^']*\)';.*/\1/p" "$INVITE_CONTRACT" | head -1)"
ONBOARD="$(sed -n "s/^export const ONBOARD_WORKSPACE = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"
WORKSPACE_COLUMNS="$(sed -n "s/^export const WORKSPACE_COLUMNS = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"

# ⚠️ THE `p_` NAME IS READ OUT OF THE INTERFACE, not typed here — the whole
# contract this file exists to assert, so a copy of it here would make assertion
# 2 a tautology. That is the seventh shape of misleading green this repository
# has recorded, and it is a check agreeing with itself.
REDEEM_ARGS="$(sed -n '/^export interface RedeemInviteArgs {/,/^}/p' "$CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p')"
REDEEM_ARG_N="$(printf '%s\n' "$REDEEM_ARGS" | grep -c . )"
REDEEM_ARG="$(printf '%s\n' "$REDEEM_ARGS" | head -1)"

# ⚠️ AND THE TWO SQLSTATES ARE READ OFF THE MAP, so assertions 7 and 8 assert the
# app's own claim about what redeem_invite raises rather than a pair of numbers
# this file believes. The values are keys of `ES.join.errors`; the keys are the
# codes. ⚠️ As of 0036 neither is 42501, and assertion 9 is what says so — this
# reader is why that assertion needed no second edit to follow the change.
SPENT_CODE="$(sed -n "s/^  '\{0,1\}\([A-Za-z0-9]*\)'\{0,1\}: 'spent',.*/\1/p" "$CONTRACT" | head -1)"
EXPIRED_CODE="$(sed -n "s/^  '\{0,1\}\([A-Za-z0-9]*\)'\{0,1\}: 'expired',.*/\1/p" "$CONTRACT" | head -1)"

# The four `p_` names the sibling module sends, for minting the fixture.
INVITE_ARGS="$(sed -n '/^export interface CreateInviteArgs {/,/^}/p' "$INVITE_CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p')"

note
if [[ -z "$REDEEM_INVITE" || -z "$TOKEN_LENGTH" || -z "$CODE_LENGTH" || -z "$CREATE_INVITE" \
      || -z "$ONBOARD" || -z "$WORKSPACE_COLUMNS" || -z "$SPENT_CODE" || -z "$EXPIRED_CODE" ]] \
   || (( REDEEM_ARG_N != 1 )); then
  fail "could not read the redemption contract out of $CONTRACT"
  echo "      rpc='$REDEEM_INVITE' arg='$REDEEM_ARG' token=$TOKEN_LENGTH code=$CODE_LENGTH"
  echo "      spent='$SPENT_CODE' expired='$EXPIRED_CODE' mint='$CREATE_INVITE'"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: $REDEEM_INVITE($REDEEM_ARG), lengths $TOKEN_LENGTH/$CODE_LENGTH, refusals $EXPIRED_CODE/$SPENT_CODE"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi

# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE. The secret key bypasses RLS,
# and assertions 5 and 9 would then pass vacuously for exactly the reason
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

# ⚠️⚠️ EVERY REQUEST BODY IS KEYED BY A NAME READ OUT OF THE APP, MATCHED ON A
# SEMANTIC SUBSTRING — never by a name typed in this file. `5b-i`'s recorded
# arrangement: if this script spelled the argument names itself it would carry
# the very prefix the check exists to test, and a fixture that renames one in the
# app would stay green because the check would keep sending the right thing.
redeem_body() { # token -> the JSON body, keyed by the app's own name
  python3 -c 'import json,sys;print(json.dumps({sys.argv[1]: sys.argv[2]}))' "$REDEEM_ARG" "$1"
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
  payload="{\"email\":\"$1\",\"password\":\"redeem-probe-123\"}"
  out="$(TOKEN="" api POST /auth/v1/signup "$payload")"
  TOKEN="$(pick access_token "$(body "$out")")"
  USER_ID="$(python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('id',''))" <<< "$(body "$out")" 2>/dev/null)"
  [[ -n "$TOKEN" && -n "$USER_ID" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}

# --- the shop, its two stores, and the people ------------------------------
OWNER_EMAIL="redeem-owner-$STAMP@example.com"
JOINER_EMAIL="redeem-joiner-$STAMP@example.com"
STRANGER_EMAIL="redeem-stranger-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"

CREATED="$(api POST "/rest/v1/rpc/$ONBOARD" \
  '{"p_display_name":"Redimir 5b-ii-b-2","p_prices_include_tax":true,"p_location_name":"Centro"}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

SECOND="$(api POST "/rest/v1/location" "{\"workspace_id\":\"$WORKSPACE_ID\",\"name\":\"Norte\"}")"
case "$(status "$SECOND")" in 201|200) : ;; *) echo "FAIL: could not open a second store — $(body "$SECOND")"; exit 1 ;; esac

LOCS="$(stash locations "$(api GET "/rest/v1/location?select=id,name")")"
CENTRO="$(python3 -c "
import json,sys
rows=json.load(open(sys.argv[1]))
print(next(r['id'] for r in rows if r['name']=='Centro'))" "$LOCS" 2>/dev/null)"
NORTE="$(python3 -c "
import json,sys
rows=json.load(open(sys.argv[1]))
print(next(r['id'] for r in rows if r['name']=='Norte'))" "$LOCS" 2>/dev/null)"
[[ -n "$CENTRO" && -n "$NORTE" ]] || { echo "FAIL: could not read the two stores — $(cat "$LOCS")"; exit 1; }

WS="$(stash workspace "$(api GET "/rest/v1/workspace?select=$WORKSPACE_COLUMNS")")"
SHOP_CODE="$(python3 -c "import sys,json;print(json.load(open(sys.argv[1]))[0].get('code',''))" "$WS" 2>/dev/null)"
[[ -n "$SHOP_CODE" ]] || { echo "FAIL: could not read the shop's join code — $(cat "$WS")"; exit 1; }

# One staff invite naming BOTH stores, so assertion 5's location count is a
# number that could be wrong rather than a 1 that matches by luck.
MINT="$(stash mint "$(api POST "/rest/v1/rpc/$CREATE_INVITE" \
  "$(invite_body "$JOINER_EMAIL" staff "[\"$CENTRO\",\"$NORTE\"]")")")"
INVITE_TOKEN="$(jfield "$MINT" token)"
[[ -n "$INVITE_TOKEN" ]] || { echo "FAIL: could not mint a token to spend — $(cat "$MINT")"; exit 1; }

# --- 3. ⚠️⚠️ P2: the two lengths, measured ---------------------------------
note
VERDICT="$(python3 - "$INVITE_TOKEN" "$SHOP_CODE" "$TOKEN_LENGTH" "$CODE_LENGTH" <<'PY'
import re, sys
token, code, want_token, want_code = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
if len(token) != want_token:
    print('a minted token is %d characters and the app measures %d' % (len(token), want_token)); raise SystemExit
if len(code) != want_code:
    print('a real shop code is %d characters and the app measures %d' % (len(code), want_code)); raise SystemExit
if want_token == want_code:
    print('the app now expects the SAME length for both, so length cannot tell them apart'); raise SystemExit
# ⚠️ AND THE ALPHABET, WHICH IS WHAT MAKES "normalise, measure, send" SAFE. The
# app normalises before it sends; on a string drawn from this alphabet that
# normalisation is the IDENTITY, so the string spent is the string minted. A
# token containing i, l, o or a lower-case letter would be silently rewritten.
alphabet = r'[0-9ABCDEFGHJKMNPQRSTVWXYZ]'
if not re.fullmatch(alphabet + '+', token):
    print('the minted token is outside Crockford base32: %r' % (token,)); raise SystemExit
if not re.fullmatch(alphabet + '+', code):
    print('the shop code is outside Crockford base32: %r' % (code,)); raise SystemExit
PY
)"
if [[ -n "$VERDICT" ]]; then
  fail "the length rule the landing screen decides by no longer holds: $VERDICT"
  echo "      @/api/redeem measures what a person typed and chooses an RPC by it,"
  echo "      because an invite token and a join code carry no label and differ"
  echo "      only in length (P2). Every assertion in app/test/api-redeem.test.ts"
  echo "      would stay green while this app sent a person down the wrong path."
else
  ok "a minted token is $TOKEN_LENGTH Crockford chars and a shop code is $CODE_LENGTH — the app's own two numbers"
fi

# --- 2. the argument name, positive and negative --------------------------
# ⚠️ THE TOKEN IS SENT GROUPED, WHICH IS ASSERTION 4 RIDING ON ASSERTION 2's
# CALL. This app's own share sheet spaces the token in four groups of four
# (`groupedToken`), and `hash_invite_token` normalises INSIDE the hash — so the
# grouping must survive the round trip or the code the owner read out does not
# work. Sending the raw token here would never test that.
note
signup "$JOINER_EMAIL"; JOINER_TOKEN="$TOKEN"
GROUPED="${INVITE_TOKEN:0:4} ${INVITE_TOKEN:4:4} ${INVITE_TOKEN:8:4} ${INVITE_TOKEN:12:4}"
GOOD="$(stash good "$(api POST "/rest/v1/rpc/$REDEEM_INVITE" "$(redeem_body "$GROUPED")")")"
WRONG_BODY="$(python3 -c 'import json,sys;print(json.dumps({sys.argv[1]+"_x": sys.argv[2]}))' "$REDEEM_ARG" "$INVITE_TOKEN")"
WRONG="$(stash wrongargs "$(api POST "/rest/v1/rpc/$REDEEM_INVITE" "$WRONG_BODY")")"
WRONG_CODE="$(jfield "$WRONG" code)"
if [[ "$(jfield "$GOOD" workspace_id)" == "" ]]; then
  fail "$REDEEM_INVITE($REDEEM_ARG) — the name this app sends — did not redeem"
  echo "      The server said: $(cat "$GOOD")"
  echo "      PostgREST matches an RPC by its parameter names. If this is PGRST202,"
  echo "      the app and $REDEEM_INVITE disagree and every phone gets a 404 on the"
  echo "      one screen a joiner has no way around."
elif [[ "$WRONG_CODE" != "PGRST202" ]]; then
  fail "a deliberately wrong argument name did NOT come back PGRST202 (got '$WRONG_CODE')"
  echo "      This assertion is the one that proves the check can SEE a drift. If a"
  echo "      wrong name is accepted, the positive half above proves nothing."
else
  ok "the name this app sends is the one $REDEEM_INVITE answers to, and a wrong one is PGRST202"
fi

# --- 4. the grouping survived --------------------------------------------
note
if [[ "$(jfield "$GOOD" workspace_id)" != "$WORKSPACE_ID" ]]; then
  fail "the token spaced the way this app shares it did not redeem the right shop"
  echo "      groupedToken() puts the token on screen in four groups of four and"
  echo "      inviteShareText() sends it to WhatsApp that way. hash_invite_token"
  echo "      normalises inside the hash so the two halves cannot disagree — if"
  echo "      that stopped being true, the symptom is \"the code the owner read"
  echo "      out does not work\" with nothing in the schema looking wrong."
else
  ok "a token carrying this app's own grouping redeems the shop that minted it"
fi

# --- 5. redemption WRITES ------------------------------------------------
# ⚠️ A jsonb ANSWER IS NOT A MEMBERSHIP. The claim is that `workspace_member` and
# `member_location` rows now exist, so it is asserted by reading `workspace` as
# the joiner — a read that returned zero rows for her one HTTP call ago.
note
MINE="$(stash mine "$(api GET "/rest/v1/workspace?select=$WORKSPACE_COLUMNS")")"
VERDICT="$(python3 - "$GOOD" "$MINE" "$WORKSPACE_ID" <<'PY'
import json, sys
try:
    answer = json.load(open(sys.argv[1]))
    mine = json.load(open(sys.argv[2]))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if answer.get('role') != 'staff':
    print('the invite said staff and the membership came back %r' % (answer.get('role'),)); raise SystemExit
if answer.get('location_count') != 2:
    print('the invite named two stores and %r were written' % (answer.get('location_count'),)); raise SystemExit
if answer.get('already_redeemed') is not False:
    print('a first redemption reported already_redeemed=%r' % (answer.get('already_redeemed'),)); raise SystemExit
if not isinstance(mine, list) or len(mine) != 1 or mine[0].get('id') != sys.argv[3]:
    print('the joiner still cannot read the shop she just joined: %r' % (mine,)); raise SystemExit
PY
)"
if [[ -n "$VERDICT" ]]; then
  fail "redemption did not write the membership it promised: $VERDICT"
  echo "      §2.7: redeem_invite \"writes the workspace_member and member_location"
  echo "      rows, and marks the invite accepted\". Until that read comes back"
  echo "      non-empty, guard.ts leaves her on the landing screen forever."
else
  ok "redemption wrote the role, both member_location rows, and the shop is now readable to her"
fi

# --- 6. idempotent ------------------------------------------------------
note
TWICE="$(api POST "/rest/v1/rpc/$REDEEM_INVITE" "$(redeem_body "$INVITE_TOKEN")")"
TWICE_F="$(stash twice "$TWICE")"
if [[ "$(status "$TWICE")" != "200" ]]; then
  fail "a second tap by the same person was an ERROR (HTTP $(status "$TWICE")): $(cat "$TWICE_F")"
  echo "      0028 made this idempotent because a joiner taps twice on a bad"
  echo "      connection, and the pilot store is offline a lot. The app treats it"
  echo "      as a success — if it started refusing, she is told her own code is"
  echo "      dead on the one screen she has no way around."
elif [[ "$(jfield "$TWICE_F" already_redeemed)" != "True" ]]; then
  fail "a second redemption by the same caller did not answer already_redeemed"
  echo "      The server said: $(cat "$TWICE_F")"
else
  ok "a second tap by the same person answers already_redeemed, and is a 200"
fi

# --- 7. a third party presenting a spent token --------------------------
note
signup "$STRANGER_EMAIL"
SPENT="$(stash spent "$(api POST "/rest/v1/rpc/$REDEEM_INVITE" "$(redeem_body "$INVITE_TOKEN")")")"
SPENT_GOT="$(jfield "$SPENT" code)"
if [[ "$SPENT_GOT" != "$SPENT_CODE" ]]; then
  fail "a spent token presented by somebody else was not refused $SPENT_CODE (got '$SPENT_GOT')"
  echo "      @/api/redeem maps $SPENT_CODE to the sentence \"ese código ya no"
  echo "      sirve\". If the code moved, she is handed the catch-all instead —"
  echo "      or worse, the session sentence, which sends her to sign in again"
  echo "      and retype a code that will never work."
else
  ok "a third party presenting a spent token is refused $SPENT_CODE, the code the app maps to 'spent'"
fi

# --- 8. a superseded token ----------------------------------------------
# ⚠️ 0028 DECISION 6 IS WHAT MAKES THIS REACHABLE: inviting the same address
# again REPLACES the live pending invite, so the first token dies. That is the
# one thing here a shopkeeper would call a bug, and this is the refusal the
# person holding the dead code actually meets, a week later, on her phone.
note
TOKEN="$OWNER_TOKEN"
FIRST="$(stash first "$(api POST "/rest/v1/rpc/$CREATE_INVITE" \
  "$(invite_body "super-$STAMP@example.com" staff "[\"$CENTRO\"]")")")"
DEAD_TOKEN="$(jfield "$FIRST" token)"
AGAIN="$(stash againmint "$(api POST "/rest/v1/rpc/$CREATE_INVITE" \
  "$(invite_body "super-$STAMP@example.com" staff "[\"$CENTRO\"]")")")"
signup "super-$STAMP@example.com"
DEAD="$(stash dead "$(api POST "/rest/v1/rpc/$REDEEM_INVITE" "$(redeem_body "$DEAD_TOKEN")")")"
DEAD_GOT="$(jfield "$DEAD" code)"
if [[ "$(jfield "$AGAIN" replaced_pending)" != "True" ]]; then
  fail "could not supersede an invite, so assertion 8 checked nothing: $(cat "$AGAIN")"
elif [[ "$DEAD_GOT" != "$EXPIRED_CODE" ]]; then
  fail "a superseded token was not refused $EXPIRED_CODE (got '$DEAD_GOT')"
  echo "      @/api/redeem maps $EXPIRED_CODE to \"pídele uno nuevo\", which is the"
  echo "      only sentence that gets her a working code. Anything else leaves her"
  echo "      retyping a token that was killed by an invite she never saw."
else
  ok "a superseded token is refused $EXPIRED_CODE, the code the app maps to 'expired'"
fi

# --- 9. ⚠️⚠️ the overload is GONE, asserted rather than assumed -----------
# This assertion used to prove the overload was REAL: `@/api/redeem` read 42501
# as "that code is dead" while `@/api/errors` read the same 42501 app-wide as
# "your session ended", and the screen had to guess which person was standing
# there. `0036` minted TD005 for both token refusals and left 42501 on the
# authentication guard alone. This is the same measurement, now saying they have
# come apart — which is the thing task 5b-iii-a claims to have done, said by a
# live database rather than by a migration file.
note
TOKEN=""
ANON="$(stash anon "$(api POST "/rest/v1/rpc/$REDEEM_INVITE" "$(redeem_body "$INVITE_TOKEN")")")"
ANON_CODE="$(jfield "$ANON" code)"
TOKEN="$OWNER_TOKEN"
if [[ "$ANON_CODE" == "$SPENT_CODE" ]]; then
  fail "an anonymous caller is STILL refused $SPENT_CODE — the overload is back"
  echo "      0036 exists to separate these two. A caller with no session and a"
  echo "      caller holding a dead token must not answer with one code, because"
  echo "      @/api/redeem maps $SPENT_CODE to \"pide otro codigo\" and"
  echo "      @/api/errors maps the session code to \"vuelve a entrar\". Sharing"
  echo "      one code means one of those two people is told the wrong thing and"
  echo "      no test in app/ can see which."
elif [[ -z "$ANON_CODE" ]]; then
  fail "an anonymous caller was not refused at ALL — redeem_invite is reachable with no session"
elif [[ "$ANON_CODE" != "42501" ]]; then
  fail "an anonymous caller was refused '$ANON_CODE', not 42501"
  echo "      @/api/errors maps 42501 (and PGRST301) to the session sentence"
  echo "      app-wide. If PostgREST has started answering something else, the"
  echo "      joiner whose session lapsed falls through to the catch-all."
else
  ok "an anonymous caller is refused 42501 and a dead token $SPENT_CODE — the overload 5b-ii-b-2 measured is retired"
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that skipped everything
# looks like — and assertion group 1 exits early by design, which is exactly the
# shape that can leave the rest unrun without anything going red.
if (( fails == 0 && ran < 9 )); then
  echo "FAIL: only $ran assertion groups ran, expected 9 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — $REDEEM_INVITE answers to the name this app"
  echo "sends, the two credentials are still $TOKEN_LENGTH and $CODE_LENGTH characters, and the loop closes."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the redemption path and this app disagree."
exit 1

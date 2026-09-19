#!/usr/bin/env bash
# 5b.8-iii-b-name-contract — does `set_my_display_name` still answer to the two
# argument names this app sends, and does the box reach the people it was built
# for?
#
# WHY THIS EXISTS, AND IT IS `5b-i-api-contract.sh`'s ARGUMENT OVER THE ONE WRITE
# EVERY MEMBER MAY MAKE. `app/test/api-display-name.test.ts` proves the app is
# consistent with itself. Nothing in TypeScript has ever read `0035`, and
# PostgREST matches an RPC BY ITS PARAMETER NAMES — so a `p_` name that drifts is
# not a type error, it is:
#
#     {"code":"PGRST202","message":"Could not find the function
#      public.set_my_display_name(p_name, p_workspace_id) ..."}
#
# a 404 that the typecheck, the Vitest suite and the bundler all pass straight
# over, and that reaches a cashier as a `Guardar` button which does nothing.
#
# ⚠️⚠️ AND IT ASSERTS THE ONE THING THIS WHOLE TASK IS FOR, WHICH NO SUITE CAN
# REACH: THAT A STAFF CALLER CAN RENAME HERSELF. `workspace_member_update`
# (`0001:532`) is `has_role(workspace_id,'owner')`, so before `0035` a cashier
# could not touch the row that describes her — and the person whose Google
# account arrived as ONE WORD is most often exactly that cashier. §2.11 refuses
# the rendering suite that would notice the section being absent, and no Vitest
# assertion can see a policy. Assertion 8 seats a real staff member and has her
# fix her own name.
#
# ⚠️⚠️ AND ONE ASSERTION EXISTS TO KEEP A STRING MATCH HONEST — `5b-ii-b-1`'s
# assertion 8, one migration later. `0035` raises `insufficient_privilege` for
# TWO different refusals (no session, and not a member of this shop) and
# PostgREST raises it for a third (no grant). There is no distinguishing
# SQLSTATE, so `@/api/displayName` matches on a marker in the server's prose,
# which is normally a defect here. Assertion 7 drives that refusal for real and
# fails if the message stops containing the marker the app exports — so a
# reworded migration is red and named, rather than quietly telling a person her
# session ended when she has actually been removed from the shop. **The honest
# fix is a SQLSTATE of its own and that is a migration; `app/**` ships none.
# ⚠️ THIS ASSERTION AND THAT MARKER RETIRE TOGETHER when a code is minted.**
#
# WHAT IT ASSERTS, all against a REAL round trip over HTTP, with four real people
# in one shop:
#
#   1. The RPC's name, its two `p_` names and the marker are READ OUT OF
#      `app/src/api/displayName.ts`, and the member column list out of
#      `app/src/api/members.ts` — not typed in here. A second copy of a contract
#      is the defect this repository has recorded eleven times.
#   2. The two `p_` names the app sends are the ones the function answers to, and
#      a deliberately wrong one is `PGRST202` — so assertion 2 also proves this
#      check could SEE a drift rather than merely not meeting one.
#   3. ⚠️ The RETURN is the STORED, TRIMMED name. `0035`'s decision 2 exists so
#      the sheet renders what the database wrote rather than its own text box;
#      this sends a name wrapped in spaces and reads what comes back.
#   4. The new name reaches the read the app ACTUALLY MAKES — the roster's own
#      `MEMBER_COLUMNS`, not `select=*`. A write nobody's read can see is a
#      correction that does not appear on the list of people.
#   5. ⚠️ `role` IS UNTOUCHED BY THE CALL, measured off the row. That is the
#      whole reason this is an RPC and not the four-line "you may update your own
#      row" policy: RLS filters ROWS, not COLUMNS.
#   6. A blank name is refused `23514` from the wire — the floor under
#      `checkDisplayName`, which is a courtesy and not the fence.
#   7. A caller who is NOT an active member is refused `42501` AND the message
#      still carries the marker the app matches on.
#   8. ⚠️⚠️ A STAFF caller renames HERSELF and it is accepted — the gap `0035`
#      was written to close, measured rather than recalled.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Anything about the SHEET. §2.11 refuses suites over
# rendering, so that the section is drawn for every role, that the box is
# prefilled with what is stored, and that the name sits at `titleSize` are the
# owner's own phone (`R9`). ⚠️ Nor the workspace-scoping bill — a person in two
# shops fixing her name in one — which is `supabase/tests/0035_set_my_display_
# name.sql` check 3.5, under `set role authenticated`, where it belongs.
#
# ⚠️ THE FIXTURE IS DRIVEN WITH `create_invite`'s AND `redeem_invite`'s OWN
# ARGUMENT NAMES, TYPED HERE, and that is not a second copy of anything: this app
# calls both through their own contract modules, and THIS check is about
# `set_my_display_name`. Same arrangement `5b-ii-a`'s and `5b-ii-b-1`'s checks
# recorded.
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. The trap seven other checks here already record.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b.8-iii-b-name-contract.sh
# With: a path to the contract module as $1, the members module as $2 and the
#       workspace module as $3, which is how a falsification harness points it at
#       mutated copies.
# Exit: 0 the applied function answers to what this app sends; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/displayName.ts}"
MEMBERS_CONTRACT="${2:-app/src/api/members.ts}"
WORKSPACE_CONTRACT="${3:-app/src/api/workspace.ts}"
for f in "$CONTRACT" "$MEMBERS_CONTRACT" "$WORKSPACE_CONTRACT"; do
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
RPC="$(sed -n "s/^export const SET_MY_DISPLAY_NAME = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
MARKER="$(sed -n "s/^export const NOT_A_MEMBER_MARKER = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
MEMBER_COLUMNS="$(sed -n "s/^export const MEMBER_COLUMNS = '\([^']*\)';.*/\1/p" "$MEMBERS_CONTRACT" | head -1)"
ONBOARD="$(sed -n "s/^export const ONBOARD_WORKSPACE = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"

# ⚠️ THE TWO `p_` NAMES ARE READ OUT OF THE INTERFACE, not typed here. That is
# the whole contract this file exists to assert, so a copy of it here would make
# assertion 2 a tautology — the seventh shape of misleading green this repository
# has recorded, and the one that is a check agreeing with itself. ⚠️ AND THE
# READER MUST NOT RECOGNISE AN ARGUMENT BY THE `p_` PREFIX IT EXISTS TO TEST:
# `5b-i`'s harness found exactly that defect on its first run, where dropping the
# prefix made the check report "could not read the contract" instead of the 404.
ARGS="$(sed -n '/^export interface SetMyDisplayNameArgs {/,/^}/p' "$CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p')"
ARG_N="$(printf '%s\n' "$ARGS" | grep -c . )"
ARG_NAMES="$(printf '%s\n' "$ARGS" | sort | tr '\n' ',' | sed 's/,$//')"

note
if [[ -z "$RPC" || -z "$MARKER" || -z "$MEMBER_COLUMNS" || -z "$ONBOARD" ]] || (( ARG_N != 2 )); then
  fail "could not read the name contract out of $CONTRACT"
  echo "      rpc='$RPC' marker='$MARKER' args='$ARG_NAMES'"
  echo "      members='$MEMBER_COLUMNS' onboard='$ONBOARD'"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: $RPC($ARG_NAMES), marker '$MARKER'"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi

# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE. The secret key bypasses RLS,
# and assertions 4, 7 and 8 would then pass vacuously for exactly the reason
# supabase/README.md gives about the `postgres` superuser: a policy nobody is
# subject to is a policy nobody has tested.
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
# SOURCE. `5b-ii-a`'s harness taught this directory that: PostgREST answers a
# renamed column with a hint that QUOTES the column, and those backslash-escaped
# quotes pasted into a triple-quoted literal are unescaped by Python before
# json.loads sees them — the check goes red saying "Expecting ',' delimiter"
# instead of naming the defect. RED FOR THE WRONG REASON, and the worse kind: it
# reads as the check being broken rather than the app being wrong.
stash() { local f="$SCRATCH/$1.json"; body "$2" > "$f"; echo "$f"; }

pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
jfield() { python3 -c "import sys,json;d=json.load(open(sys.argv[1]));print(d.get('$2','') if isinstance(d,dict) else '')" "$1" 2>/dev/null; }

# ⚠️⚠️ EVERY REQUEST BODY IS KEYED BY THE NAMES READ OUT OF THE APP, MATCHED ON A
# SEMANTIC SUBSTRING — never by a name typed in this file. That is `5b-i`'s
# recorded arrangement and it is the whole reason assertion 2 is evidence: if
# this script spelled the argument names itself it would carry the very prefix
# the check exists to test, and a fixture that renames one in the app would stay
# green because the check would keep sending the right thing.
name_body() { # workspace-id name -> the JSON body, keyed by the app's names
  python3 - "$ARGS" "$1" "$2" <<'PYBODY'
import json, sys
names = [n for n in sys.argv[1].split('\n') if n]
ws, nm = sys.argv[2], sys.argv[3]
sent = {}
for n in names:
    if   'workspace' in n: sent[n] = ws
    elif 'name'      in n: sent[n] = nm
    else:                  sent[n] = None
print(json.dumps(sent))
PYBODY
}

STAMP="$$-$(date +%s)"
signup() { # email -> sets TOKEN and USER_ID
  local out payload
  payload="{\"email\":\"$1\",\"password\":\"name-probe-123\"}"
  out="$(TOKEN="" api POST /auth/v1/signup "$payload")"
  TOKEN="$(pick access_token "$(body "$out")")"
  USER_ID="$(python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('id',''))" <<< "$(body "$out")" 2>/dev/null)"
  [[ -n "$TOKEN" && -n "$USER_ID" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}

# --- the shop and the people ----------------------------------------------
OWNER_EMAIL="name-owner-$STAMP@example.com"
STAFF_EMAIL="name-staff-$STAMP@example.com"
STRANGER_EMAIL="name-stranger-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"; OWNER_ID="$USER_ID"

CREATED="$(api POST "/rest/v1/rpc/$ONBOARD" \
  '{"p_display_name":"Mi nombre 5b.8-iii-b","p_prices_include_tax":true,"p_location_name":"Centro"}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

LOCS="$(stash locations "$(api GET "/rest/v1/location?select=id,name")")"
CENTRO="$(python3 -c "
import json,sys
rows=json.load(open(sys.argv[1]))
print(rows[0]['id'] if rows else '')" "$LOCS")"
[[ -n "$CENTRO" ]] || { echo "FAIL: the shop has no store — $(cat "$LOCS")"; exit 1; }

# --- 2. the two argument names --------------------------------------------
# ⚠️ THE POSITIVE HALF AND THE NEGATIVE HALF TOGETHER. A call that succeeds with
# the right names proves the names are right; a call that FAILS `PGRST202` with a
# wrong one proves this check could have seen it. Without the second, a green
# here is also what "PostgREST ignores argument names" would look like.
note
GOOD_BODY="$(name_body "$WORKSPACE_ID" '  Ana María Rodríguez  ')"
GOOD="$(api POST "/rest/v1/rpc/$RPC" "$GOOD_BODY")"
# ⚠️ THE WRONG NAME IS DERIVED FROM THE APP'S OWN, by mangling whichever key
# carries the workspace — so this half is not a second typed copy either, and it
# keeps working if the argument is ever legitimately renamed.
WRONG_BODY="$(python3 -c 'import json,sys;d=json.loads(sys.argv[1]);k=[n for n in d if "workspace" in n][0];d[k+"_x"]=d.pop(k);print(json.dumps(d))' "$GOOD_BODY")"
WRONG="$(stash wrongargs "$(api POST "/rest/v1/rpc/$RPC" "$WRONG_BODY")")"
WRONG_CODE="$(jfield "$WRONG" code)"
if [[ "$(status "$GOOD")" != "200" ]]; then
  fail "$RPC($ARG_NAMES) — the names this app sends — was refused"
  echo "      HTTP $(status "$GOOD"): $(body "$GOOD")"
  echo "      PostgREST matches an RPC by its parameter names. If this is PGRST202,"
  echo "      the app and $RPC disagree and every phone gets a 404 where the"
  echo "      Guardar button is."
elif [[ "$WRONG_CODE" != "PGRST202" ]]; then
  fail "a deliberately wrong argument name did NOT come back PGRST202 (got '$WRONG_CODE')"
  echo "      This assertion is the one that proves the check can SEE a drift. If a"
  echo "      wrong name is accepted, the positive half above proves nothing."
else
  ok "the two names the app sends are the ones $RPC answers to, and a wrong one is PGRST202"
fi

# --- 3. the RETURN is the stored, trimmed name ----------------------------
# ⚠️ `0035`'s DECISION 2, AND THE SHEET RENDERS THIS VALUE. A name was sent
# wrapped in spaces; what comes back is what the database wrote. If this ever
# returned the input, `ajustes.tsx` would show a name the roster disagrees with
# by a space nobody can see, and `storedNameFrom` would have nothing to notice.
note
RETURNED="$(body "$GOOD" | python3 -c 'import sys,json
try: print(json.load(sys.stdin))
except Exception: print("")' 2>/dev/null)"
if [[ "$RETURNED" != "Ana María Rodríguez" ]]; then
  fail "the call returned '$RETURNED', not the stored trimmed name"
  echo "      It was sent '  Ana María Rodríguez  '. 0035 returns the STORED value"
  echo "      so the screen renders what the database wrote rather than its own"
  echo "      text box — that is the whole reason the function is not \`void\`."
else
  ok "the call returns the STORED, trimmed name (0035 decision 2)"
fi

# --- 4. it reaches the read the app actually makes -------------------------
# ⚠️ THE ROSTER'S OWN COLUMN LIST AND NOT `select=*`. A write that lands in a
# column nobody reads is a correction that never appears on the list of people —
# and the list is what the person is looking at while she decides whether it took.
note
ROSTER="$(stash roster "$(api GET "/rest/v1/workspace_member?select=$MEMBER_COLUMNS")")"
VERDICT="$(python3 - "$OWNER_ID" "$ROSTER" <<'PY'
import json, sys
me = sys.argv[1]
try:
    rows = json.load(open(sys.argv[2]))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list):
    print('the member read came back as an error: %r' % (rows,)); raise SystemExit
mine = [r for r in rows if r.get('user_id') == me]
if not mine:
    print('the caller is not in the read she just made'); raise SystemExit
if 'display_name' not in mine[0]:
    print('the column list the app reads does not carry display_name at all'); raise SystemExit
if mine[0]['display_name'] != 'Ana María Rodríguez':
    print('the roster read says %r' % (mine[0]['display_name'],)); raise SystemExit
PY
)"
if [[ -n "$VERDICT" ]]; then
  fail "the new name does not reach the read the app makes: $VERDICT"
else
  ok "the new name is in the roster's own read (MEMBER_COLUMNS), not just in select=*"
fi

# --- 5. `role` is untouched ------------------------------------------------
# ⚠️⚠️ THE ASSERTION THE WHOLE DESIGN RESTS ON. The alternative to this RPC was a
# "you may update your own row" POLICY, and RLS filters ROWS, NOT COLUMNS — that
# policy would have handed every cashier her own `role`. `0035` writes one column
# and this measures the other off the same row.
note
MY_ROLE="$(python3 -c "
import json,sys
rows=json.load(open(sys.argv[1]))
mine=[r for r in rows if r.get('user_id')==sys.argv[2]]
print(mine[0].get('role','') if mine else '')" "$ROSTER" "$OWNER_ID" 2>/dev/null)"
if [[ "$MY_ROLE" != "owner" ]]; then
  fail "the founding owner's role is now '$MY_ROLE' after a rename"
  echo "      set_my_display_name writes ONE column. If role moved, the function has"
  echo "      grown a second set-target, and the argument against the own-row policy"
  echo "      — RLS filters rows, not columns — has just been conceded in the body."
else
  ok "role is untouched by the call, which is why this is an RPC and not a policy"
fi

# --- 6. a blank is refused by the wire ------------------------------------
# ⚠️ `checkDisplayName` IS A COURTESY SO A PERSON IS NOT SHOWN A REFUSAL SHE
# COULD HAVE BEEN SPARED. THIS is the fence, and it is what the app would meet if
# that local check were ever loosened.
note
BLANK="$(stash blank "$(api POST "/rest/v1/rpc/$RPC" "$(name_body "$WORKSPACE_ID" '   ')")")"
BLANK_CODE="$(jfield "$BLANK" code)"
if [[ "$BLANK_CODE" != "23514" ]]; then
  fail "a blank name was NOT refused 23514 (got '$BLANK_CODE')"
  echo "      0035 trims and then rejects the empty string, and 0034's CHECK is the"
  echo "      floor under that. If this stopped refusing, a person can blank her own"
  echo "      name and drop to the role rung on everybody's roster."
else
  ok "a name of nothing but spaces is refused 23514 at the wire"
fi

# --- 7. the marker that separates 0035's two 42501s -----------------------
# ⚠️⚠️ THE ASSERTION THAT KEEPS A PROSE MATCH SAFE. A stranger who belongs to no
# shop names this workspace: the function finds no row and raises
# `insufficient_privilege` — the SAME SQLSTATE an absent session raises. The app
# tells the two apart by this marker, and if a migration rewords the sentence it
# would silently start saying "sign in again" to somebody who has been removed
# from the shop. RETIRES the day the refusal gets a SQLSTATE of its own.
note
signup "$STRANGER_EMAIL"
STRANGER="$(stash stranger "$(api POST "/rest/v1/rpc/$RPC" "$(name_body "$WORKSPACE_ID" 'Nadie')")")"
STRANGER_CODE="$(jfield "$STRANGER" code)"
STRANGER_MSG="$(jfield "$STRANGER" message)"
if [[ "$STRANGER_CODE" != "42501" ]]; then
  fail "a non-member was not refused 42501 by $RPC (got '$STRANGER_CODE')"
  echo "      The fence is the \`where\` clause in 0035's body — the caller's own"
  echo "      ACTIVE membership in the workspace she named. If it stopped holding,"
  echo "      a stranger can write a name into somebody else's shop."
elif ! grep -qF "$MARKER" <<< "$STRANGER_MSG"; then
  fail "the refusal no longer contains the marker the app matches on: $MARKER"
  echo "      The server said: $STRANGER_MSG"
  echo "      The app matches this prose because 0035 raises 42501 for TWO events"
  echo "      and PostgREST raises it for a third, and only one of them means 'you"
  echo "      are not in this shop'. Without the marker a person who has been"
  echo "      removed is told her session ended. The honest fix is a SQLSTATE of"
  echo "      its own, which is a migration — app/** ships none. Until then THIS"
  echo "      assertion is what makes the string match safe, and it has gone red"
  echo "      rather than silent."
else
  ok "a non-member is refused 42501 and the message still carries the marker"
fi

# --- 8. ⚠️⚠️ a STAFF caller renames HERSELF -------------------------------
# ⚠️ THE GAP `0035` EXISTS TO CLOSE, MEASURED. `workspace_member_update`
# (`0001:532`) is owner-only, so before this function a cashier could not edit
# the row that describes her — and she is the likeliest person to have arrived
# from Google as one word. She is seated by redeeming a real invite, which is
# `5b-ii-b-1`'s and `5b-ii-b-2`'s RPCs driven here by hand, the arrangement those
# two checks already recorded.
note
TOKEN="$OWNER_TOKEN"
# ⚠️ THE BODY IS BUILT INTO A VARIABLE FIRST, never inlined inside three levels
# of command substitution. `5b.7`'s check was red for the wrong reason on its
# first run for exactly that, and so was THIS one: bash handed PostgREST a
# mangled body and it answered `PGRST102 — Empty or invalid json`, which the
# assertion below reported as "could not seat a staff member". Red for the wrong
# reason, the fourth time that shape has appeared in a contract check here.
INVITE_BODY="{\"p_workspace_id\":\"$WORKSPACE_ID\",\"p_email\":\"$STAFF_EMAIL\",\"p_role\":\"staff\",\"p_location_ids\":[\"$CENTRO\"]}"
INVITE="$(stash invite "$(api POST /rest/v1/rpc/create_invite "$INVITE_BODY")")"
INVITE_TOKEN="$(jfield "$INVITE" token)"
if [[ -z "$INVITE_TOKEN" ]]; then
  echo "FAIL: could not mint a staff invite, so assertion 8 checked nothing: $(cat "$INVITE")"
  fails=$((fails+1))
fi
signup "$STAFF_EMAIL"; STAFF_ID="$USER_ID"
REDEEM_BODY="{\"p_token\":\"$INVITE_TOKEN\"}"
REDEEM="$(stash redeem "$(api POST /rest/v1/rpc/redeem_invite "$REDEEM_BODY")")"
STAFF_RENAME="$(api POST "/rest/v1/rpc/$RPC" "$(name_body "$WORKSPACE_ID" 'Lupita Hernández')")"
STAFF_RETURNED="$(body "$STAFF_RENAME" | python3 -c 'import sys,json
try: print(json.load(sys.stdin))
except Exception: print("")' 2>/dev/null)"
STAFF_ROSTER="$(stash staffroster "$(api GET "/rest/v1/workspace_member?select=$MEMBER_COLUMNS")")"
STAFF_ROLE="$(python3 -c "
import json,sys
rows=json.load(open(sys.argv[1]))
mine=[r for r in rows if r.get('user_id')==sys.argv[2]]
print(mine[0].get('role','') if mine else '')" "$STAFF_ROSTER" "$STAFF_ID" 2>/dev/null)"
if [[ "$(jfield "$REDEEM" member_id)" == "" ]]; then
  fail "could not seat a staff member, so assertion 8 checked nothing: $(cat "$REDEEM")"
elif [[ "$STAFF_RETURNED" != "Lupita Hernández" ]]; then
  fail "a STAFF caller could not fix her own name: HTTP $(status "$STAFF_RENAME") $(body "$STAFF_RENAME")"
  echo "      This is the gap 0035 was written to close. workspace_member_update is"
  echo "      has_role(workspace_id,'owner'), so a cashier cannot edit the row that"
  echo "      describes her — and she is the likeliest person to have come through"
  echo "      from Google as ONE WORD. If this is refused, the whole task ships a"
  echo "      box that only an owner can use, and no suite here could notice."
elif [[ "$STAFF_ROLE" != "staff" ]]; then
  fail "the staff caller's role is now '$STAFF_ROLE' after renaming herself"
else
  ok "a STAFF caller fixes her own name, and is still staff afterwards"
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that skipped everything
# looks like — and assertion group 1 exits early by design, which is exactly the
# shape that can leave the rest unrun without anything going red.
if (( fails == 0 && ran < 7 )); then
  echo "FAIL: only $ran assertion groups ran, expected 7 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — $RPC answers to the two names this app"
  echo "sends, it returns the stored name, role is untouched, and a cashier can fix"
  echo "her own name."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the name path and this app disagree."
exit 1

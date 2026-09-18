#!/usr/bin/env bash
# 5b-ii-b-1-invite-contract — does `create_invite` still answer to the four
# argument names this app sends, and is the token really shown only once?
#
# WHY THIS EXISTS, AND IT IS `5b-i-api-contract.sh`'s ARGUMENT OVER A WRITE.
# `app/test/api-invites.test.ts` can prove the app is consistent with itself.
# Nothing in TypeScript has ever read `0028`, and PostgREST matches an RPC BY ITS
# PARAMETER NAMES — so a `p_` name that drifts is not a type error, it is:
#
#     {"code":"PGRST202","message":"Could not find the function
#      public.create_invite(p_email, p_location_ids, p_role, p_workspace) ..."}
#
# a 404 that the typecheck, the Vitest suite and the bundler all pass straight
# over, and that reaches a shopkeeper as a button which does nothing.
#
# ⚠️⚠️ AND IT ASSERTS THE ONE THING THIS TASK IS REALLY ABOUT, WHICH NO SUITE CAN
# REACH: THAT THE TOKEN IS NOT IN THE DATABASE. `0028`'s comment says *"the token
# is in this result and nowhere else, ever"* — that is a claim about a stored row,
# and the only way to check it is to mint one and then go looking for the
# plaintext with a reader that would find it. Assertion 4 does exactly that.
# ⚠️ If it were ever false, every assertion in the Vitest suite would still be
# green: the app would be sending and parsing correctly, and the secret would
# simply also be sitting in a column a manager can read.
#
# ⚠️⚠️ AND ONE ASSERTION EXISTS TO KEEP A STRING MATCH HONEST. `0028` raises
# `22023` for five different refusals, one of which needs its own sentence —
# inviting somebody who has ALREADY ASKED to join is an approval, and approval is
# `0029`'s. There is no distinguishing SQLSTATE, so `@/api/invites` matches on a
# marker in the server's prose, which is normally a defect here. Assertion 8
# drives that refusal for real and fails if the message stops containing the
# marker the app exports — so a reworded migration is red and named, rather than
# quietly costing the one refusal that has a next step. **The honest fix is a
# SQLSTATE of its own and that is a migration; RULED BY THE OWNER 2026-09-18 into
# `5b-iii`, which owns the approval path the message points at. ⚠️ THIS ASSERTION
# RETIRES WITH IT — when the code lands, assertion 8 asserts the CODE, not prose.**
#
# WHAT IT ASSERTS, all against a REAL round trip over HTTP, with three real
# people and two stores:
#
#   1. The RPC's name, the location column list and the marker are READ OUT OF
#      `app/src/api/invites.ts` — not typed in here. A second copy of a contract
#      is the defect this repository has recorded eleven times.
#   2. The four `p_` names the app sends are the ones the function answers to,
#      and a deliberately wrong one is `PGRST202` — so assertion 2 also proves
#      this check could SEE a drift rather than merely not meeting one.
#   3. `location_select` answers the app's own column list, and a MANAGER is
#      handed every active store — `P1`'s measurement, against `0001:332`'s
#      `wm.role >= 'manager'` rather than against its comment. ⚠️ And `is_active`
#      is readable on that table and does NOT come back on the read the app
#      actually makes, so the omission is this app's discipline and not the
#      policy's — measured off the WIRE, the shape `5b-ii-a` uses for
#      `token_hash`.
#   4. ⚠️⚠️ The minted token is 16 Crockford characters, and searching
#      `workspace_invite` for the plaintext — as a manager, who may read that
#      table — finds NOTHING. Only the hash is stored.
#   5. A `staff` invite naming NO location is refused `22023` (`0028:291`), and
#      the same draft WITH a store succeeds. That is `N1`, the deliverable the
#      split of 2026-09-14 had put in the wrong child.
#   6. A `manager` invite stores `'{}'` whatever was passed, which is why
#      `createInviteArgs` sends `[]` rather than the form's contents.
#   7. Inviting the same address twice answers `replaced_pending: true` — `0028`
#      decision 6, and `P3`.
#   8. The `already requested` refusal still contains the marker the app matches.
#   9. A STAFF caller cannot create an invite at all: `42501` from the fence in
#      the BODY, which is where it is because §2.7's "under normal RLS" cannot
#      work (`5b.8` owes that amendment, ruled 2026-09-18).
#
# ⚠️ WHAT IT DOES NOT ASSERT. Anything about the SHEET. §2.11 refuses suites over
# rendering, so that the picker appears only above one store, that the token is
# rendered at `moneySize`, and that the replaced line is `atencion` and not
# `error` are the owner's own phone (`R9`).
#
# ⚠️ THE FIXTURE IS DRIVEN WITH `redeem_invite`'s AND `request_access`'s OWN
# ARGUMENT NAMES, TYPED HERE, and that is not a second copy of anything:
# `5b-ii-b-2` wraps the first and `5b-iii` the second, and this app calls
# neither yet. The moment it does, those names come out of the app the way
# `create_invite`'s already do. Same arrangement `5b-ii-a`'s check recorded.
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. The trap six other checks here already recorded.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b-ii-b-1-invite-contract.sh
# With: a path to the contract module as $1, which is how a falsification
#       harness points it at a mutated copy.
# Exit: 0 the applied function answers to what this app sends; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/invites.ts}"
WORKSPACE_CONTRACT="${2:-app/src/api/workspace.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }
[[ -r "$WORKSPACE_CONTRACT" ]] || { echo "FAIL: cannot read $WORKSPACE_CONTRACT"; exit 1; }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# --- 1. the app's own claims, read out of its source -----------------------
CREATE_INVITE="$(sed -n "s/^export const CREATE_INVITE = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
LOCATION_COLUMNS="$(sed -n "s/^export const LOCATION_COLUMNS = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
MARKER="$(sed -n "s/^export const ALREADY_REQUESTED_MARKER = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
ONBOARD="$(sed -n "s/^export const ONBOARD_WORKSPACE = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"
WORKSPACE_COLUMNS="$(sed -n "s/^export const WORKSPACE_COLUMNS = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"

# ⚠️ THE FOUR `p_` NAMES ARE READ OUT OF THE INTERFACE, not typed here. That is
# the whole contract this file exists to assert, so a copy of it here would make
# assertion 2 a tautology — the seventh shape of misleading green this
# repository has recorded, and the one that is a check agreeing with itself.
ARGS="$(sed -n '/^export interface CreateInviteArgs {/,/^}/p' "$CONTRACT" \
  | sed -n 's/^  readonly \([a-z_]*\)[?]*:.*/\1/p')"
ARG_N="$(printf '%s\n' "$ARGS" | grep -c . )"
ARG_NAMES="$(printf '%s\n' "$ARGS" | sort | tr '\n' ',' | sed 's/,$//')"

note
if [[ -z "$CREATE_INVITE" || -z "$LOCATION_COLUMNS" || -z "$MARKER" || -z "$ONBOARD" \
      || -z "$WORKSPACE_COLUMNS" ]] || (( ARG_N != 4 )); then
  fail "could not read the invite contract out of $CONTRACT"
  echo "      rpc='$CREATE_INVITE' columns='$LOCATION_COLUMNS' marker='$MARKER'"
  echo "      args='$ARG_NAMES' onboard='$ONBOARD'"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: $CREATE_INVITE($ARG_NAMES), location[$LOCATION_COLUMNS]"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi

# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE. The secret key bypasses RLS,
# and assertions 3, 4 and 9 would then pass vacuously for exactly the reason
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

# ⚠️ AND A REQUEST BODY IS BUILT INTO A VARIABLE FIRST, never inlined inside
# three levels of command substitution. `5b.7`'s check was red for the wrong
# reason on its first run for exactly that — bash handed GoTrue a mangled body
# and the control assertion printed `bad_json`.
pick() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
jfield() { python3 -c "import sys,json;d=json.load(open(sys.argv[1]));print(d.get('$2','') if isinstance(d,dict) else '')" "$1" 2>/dev/null; }

# ⚠️⚠️ EVERY REQUEST BODY IS KEYED BY THE NAMES READ OUT OF THE APP, MATCHED ON A
# SEMANTIC SUBSTRING — never by a name typed in this file. That is `5b-i`'s
# recorded arrangement and it is the whole reason assertion 2 is evidence: if
# this script spelled the argument names itself it would carry the very prefix
# the check exists to test, and a fixture that renames one in the app would stay
# green because the check would keep sending the right thing.
#
# ⚠️ IT WAS WRITTEN THE WRONG WAY FIRST, in this task, and was caught by reading
# the script back before the harness existed: the names were READ and PRINTED,
# and the call was made with a body typed here. A check agreeing with itself is
# the seventh shape of misleading green this repository has recorded.
invite_body() { # email role locations-json -> the JSON body, keyed by the app's names
  python3 - "$ARGS" "$WORKSPACE_ID" "$1" "$2" "$3" <<'PYBODY'
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
  payload="{\"email\":\"$1\",\"password\":\"invite-probe-123\"}"
  out="$(TOKEN="" api POST /auth/v1/signup "$payload")"
  TOKEN="$(pick access_token "$(body "$out")")"
  USER_ID="$(python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('id',''))" <<< "$(body "$out")" 2>/dev/null)"
  [[ -n "$TOKEN" && -n "$USER_ID" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}

# --- the shop, its two stores, and the people ------------------------------
OWNER_EMAIL="invite-owner-$STAMP@example.com"
STAFF_EMAIL="invite-staff-$STAMP@example.com"
ASKER_EMAIL="invite-asker-$STAMP@example.com"
INVITEE_EMAIL="invite-target-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"

CREATED="$(api POST "/rest/v1/rpc/$ONBOARD" \
  '{"p_display_name":"Invitar 5b-ii-b-1","p_prices_include_tax":true,"p_location_name":"Centro"}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

# A second store, so the picker has something to pick and assertion 3 is not
# measuring a list of one. `location_insert` is owner-only (0001:510).
SECOND="$(api POST "/rest/v1/location" \
  "{\"workspace_id\":\"$WORKSPACE_ID\",\"name\":\"Norte\"}")"
case "$(status "$SECOND")" in 201|200) : ;; *) echo "FAIL: could not open a second store — $(body "$SECOND")"; exit 1 ;; esac

WS="$(stash workspace "$(api GET "/rest/v1/workspace?select=$WORKSPACE_COLUMNS")")"
CODE="$(python3 -c "import sys,json;print(json.load(open(sys.argv[1]))[0].get('code',''))" "$WS" 2>/dev/null)"
[[ -n "$CODE" ]] || { echo "FAIL: could not read the shop's code — $(cat "$WS")"; exit 1; }

# --- 3. the location read, and P1's measurement ---------------------------
note
LOCS="$(stash locations "$(api GET "/rest/v1/location?select=$LOCATION_COLUMNS")")"
# ⚠️ AND THE SAME TABLE WITHOUT A COLUMN LIST, which is what makes the OMISSION
# checkable. `5b-ii-a`'s assertion 6 is the same shape over `token_hash`: a
# column the policy would hand over, that the app does not ask for. Without this
# second read, "the app does not read is_active" is true of a string in a source
# file and says nothing about what the database would have given it.
WIDE="$(stash locations-wide "$(api GET "/rest/v1/location?select=*")")"
VERDICT="$(python3 - "$LOCATION_COLUMNS" "$LOCS" "$WIDE" <<'PY'
import json, sys
cols = sys.argv[1].split(',')
try:
    rows = json.load(open(sys.argv[2]))
    wide = json.load(open(sys.argv[3]))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list) or not isinstance(wide, list):
    print('the location read came back as an error: %r' % (rows if not isinstance(rows, list) else wide,)); raise SystemExit
if len(rows) != 2:
    print('an owner of a two-store shop read %d stores' % len(rows)); raise SystemExit
if not wide:
    print('the select=* read came back empty, so the omission below checked nothing'); raise SystemExit
for row in rows:
    missing = [c for c in cols if c not in row]
    if missing:
        print('the select asked for columns the row does not have: %s' % missing); raise SystemExit
names = sorted(r['name'] for r in rows)
if names != ['Centro', 'Norte']:
    print('the two stores came back as %r' % (names,)); raise SystemExit
# ⚠️ THE DECISION `LOCATION_COLUMNS` RECORDS, MEASURED OFF THE WIRE. my_locations()
# (0001:332) filters l.is_active itself, so the column would be true on every row
# this app can ever see. The policy WOULD hand it over — that is what `wide`
# proves — and the app declining it is discipline rather than the policy doing it.
if 'is_active' not in wide[0]:
    print('location no longer carries is_active at all, so this assertion is stale'); raise SystemExit
if any('is_active' in row for row in rows):
    print('the app read now carries is_active, which my_locations() already filtered'); raise SystemExit
PY
)"
if [[ -n "$VERDICT" ]]; then
  fail "the location read does not answer the app's column list: $VERDICT"
else
  ok "location_select answers location[$LOCATION_COLUMNS], and an owner reads both stores"
fi

CENTRO="$(python3 -c "
import json,sys
rows=json.load(open(sys.argv[1]))
print(next(r['id'] for r in rows if r['name']=='Centro'))" "$LOCS")"
NORTE="$(python3 -c "
import json,sys
rows=json.load(open(sys.argv[1]))
print(next(r['id'] for r in rows if r['name']=='Norte'))" "$LOCS")"

# --- 2. the four argument names ------------------------------------------
# ⚠️ THE POSITIVE HALF AND THE NEGATIVE HALF TOGETHER. A call that succeeds with
# the right names proves the names are right; a call that FAILS `PGRST202` with a
# wrong one proves this check could have seen it. Without the second, a green
# here is also what "PostgREST ignores argument names" would look like.
note
ARGS_BODY="$(invite_body "$INVITEE_EMAIL" manager '[]')"
GOOD="$(api POST "/rest/v1/rpc/$CREATE_INVITE" "$ARGS_BODY")"
# ⚠️ THE WRONG NAME IS DERIVED FROM THE APP'S OWN, by mangling whichever key
# carries the workspace — so this half is not a second typed copy either, and
# it keeps working if the argument is ever legitimately renamed.
WRONG_BODY="$(python3 -c 'import json,sys;d=json.loads(sys.argv[1]);k=[n for n in d if "workspace" in n][0];d[k+"_x"]=d.pop(k);print(json.dumps(d))' "$ARGS_BODY")"
WRONG="$(stash wrongargs "$(api POST "/rest/v1/rpc/$CREATE_INVITE" "$WRONG_BODY")")"
WRONG_CODE="$(jfield "$WRONG" code)"
if [[ "$(status "$GOOD")" != "200" ]]; then
  fail "$CREATE_INVITE($ARG_NAMES) — the names this app sends — was refused"
  echo "      HTTP $(status "$GOOD"): $(body "$GOOD")"
  echo "      PostgREST matches an RPC by its parameter names. If this is PGRST202,"
  echo "      the app and $CREATE_INVITE disagree and every phone gets a 404."
elif [[ "$WRONG_CODE" != "PGRST202" ]]; then
  fail "a deliberately wrong argument name did NOT come back PGRST202 (got '$WRONG_CODE')"
  echo "      This assertion is the one that proves the check can SEE a drift. If a"
  echo "      wrong name is accepted, the positive half above proves nothing."
else
  ok "the four names the app sends are the ones $CREATE_INVITE answers to, and a wrong one is PGRST202"
fi

# --- 6. a manager invite stores no locations ------------------------------
note
MGR="$(stash manager "$GOOD")"
MGR_INVITE_ID="$(jfield "$MGR" invite_id)"
MGR_LOCS="$(python3 -c "
import json,sys
d=json.load(open(sys.argv[1]))
print(json.dumps(d.get('location_ids')))" "$MGR" 2>/dev/null)"
if [[ "$MGR_LOCS" != "[]" ]]; then
  fail "a manager invite came back holding locations: $MGR_LOCS"
  echo "      0028 overwrites them — \"a manager or owner invite stores '{}' whatever"
  echo "      was passed\" — which is why createInviteArgs sends [] rather than the"
  echo "      form's contents. If this changed, the app is now discarding a choice."
else
  ok "a manager invite stores no locations, as 0028 says it does"
fi

# --- 5. N1: a staff invite must name a location ---------------------------
note
STAFF_NONE_BODY="$(invite_body "$STAFF_EMAIL" staff '[]')"
STAFF_NONE="$(stash staffnone "$(api POST "/rest/v1/rpc/$CREATE_INVITE" "$STAFF_NONE_BODY")")"
NONE_CODE="$(jfield "$STAFF_NONE" code)"
STAFF_OK_BODY="$(invite_body "$STAFF_EMAIL" staff "[\"$CENTRO\"]")"
STAFF_OK="$(api POST "/rest/v1/rpc/$CREATE_INVITE" "$STAFF_OK_BODY")"
if [[ "$NONE_CODE" != "22023" ]]; then
  fail "a staff invite with no location was NOT refused 22023 (got '$NONE_CODE')"
  echo "      0028:291 is what makes the picker a deliverable at all (N1). If this"
  echo "      stopped refusing, checkInvite's locationMissing rule is now stricter"
  echo "      than the database and refuses drafts it would accept."
elif [[ "$(status "$STAFF_OK")" != "200" ]]; then
  fail "a staff invite WITH a store was refused: $(body "$STAFF_OK")"
else
  ok "a staff invite is refused 22023 with no store (0028:291) and accepted with one"
fi

STAFF_ISSUED="$(stash staffissued "$STAFF_OK")"
TOKEN_PLAIN="$(jfield "$STAFF_ISSUED" token)"
EXPIRES_AT="$(jfield "$STAFF_ISSUED" expires_at)"

# --- 4. ⚠️⚠️ the token is shown once, and only the hash is stored ----------
note
VERDICT="$(python3 - "$TOKEN_PLAIN" "$EXPIRES_AT" <<'PY'
import re, sys
from datetime import datetime, timezone
token, expires = sys.argv[1], sys.argv[2]
if not re.fullmatch(r'[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}', token or ''):
    print('the token is not 16 Crockford characters: %r' % (token,)); raise SystemExit
if not expires:
    print('no expires_at came back, and the card has a line for it (P4)'); raise SystemExit
try:
    at = datetime.fromisoformat(expires.replace('Z', '+00:00'))
except Exception as exc:
    print('expires_at is not parseable: %r (%s)' % (expires, exc)); raise SystemExit
days = (at - datetime.now(timezone.utc)).total_seconds() / 86400.0
if not (6.0 < days < 8.0):
    print('expires_at is %.2f days out; 0028 sets seven (D3)' % days); raise SystemExit
PY
)"
if [[ -n "$VERDICT" ]]; then
  fail "the minted token or its expiry is not what 0028 promises: $VERDICT"
else
  # The whole point: go looking for the plaintext as a MANAGER-capable caller,
  # who may read this table, using a reader that would find it if it were there.
  HUNT="$(stash hunt "$(api GET "/rest/v1/workspace_invite?select=*")")"
  LEAK="$(python3 - "$TOKEN_PLAIN" "$HUNT" <<'PY'
import json, sys
token = sys.argv[1]
try:
    rows = json.load(open(sys.argv[2]))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list):
    print('the invite read came back as an error: %r' % (rows,)); raise SystemExit
if not rows:
    print('no invite rows came back at all, so this assertion checked nothing'); raise SystemExit
blob = json.dumps(rows)
if token in blob:
    where = [k for r in rows for k, v in r.items() if isinstance(v, str) and token in v]
    print('THE PLAINTEXT TOKEN IS IN THE TABLE, in %s' % sorted(set(where))); raise SystemExit
if not any(r.get('token_hash') for r in rows):
    print('no row carries a token_hash, so nothing was stored to compare against'); raise SystemExit
PY
)"
  if [[ -n "$LEAK" ]]; then
    fail "the token is NOT shown only once: $LEAK"
    echo "      0028's comment says \"the token is in this result and nowhere else,"
    echo "      ever\" — only the hash is stored (0002:364). Every assertion in the"
    echo "      Vitest suite would still be green with the secret in a column."
  else
    ok "the token is 16 Crockford chars, expires in ~7 days, and is NOT in the table"
  fi
fi

# --- 7. P3: inviting the same address again replaces the live one ---------
note
AGAIN="$(stash again "$(api POST "/rest/v1/rpc/$CREATE_INVITE" "$STAFF_OK_BODY")")"
REPLACED="$(python3 -c "
import json,sys
d=json.load(open(sys.argv[1]))
print(json.dumps(d.get('replaced_pending')))" "$AGAIN" 2>/dev/null)"
AGAIN_TOKEN="$(jfield "$AGAIN" token)"
if [[ "$REPLACED" != "true" ]]; then
  fail "a second invite to the same address did not report replaced_pending (got $REPLACED)"
  echo "      0028 decision 6 replaces a LIVE pending invite deliberately, so the"
  echo "      code somebody is already holding stops working. That is P3, and the"
  echo "      card's one warning line reads this field. If it stopped being true,"
  echo "      the app is silent about the only thing here a shopkeeper calls a bug."
elif [[ "$AGAIN_TOKEN" == "$TOKEN_PLAIN" ]]; then
  fail "the replacement invite returned the SAME token as the one it superseded"
else
  ok "a second invite to one address answers replaced_pending, with a new token (P3)"
fi

# --- 8. the marker the app matches on ------------------------------------
note
signup "$ASKER_EMAIL"; ASKER_TOKEN="$TOKEN"
ASK="$(stash ask "$(api POST /rest/v1/rpc/request_access "{\"p_code\":\"$CODE\"}")")"
TOKEN="$OWNER_TOKEN"
CLASH_BODY="$(invite_body "$ASKER_EMAIL" staff "[\"$NORTE\"]")"
CLASH="$(stash clash "$(api POST "/rest/v1/rpc/$CREATE_INVITE" "$CLASH_BODY")")"
CLASH_CODE="$(jfield "$CLASH" code)"
CLASH_MSG="$(jfield "$CLASH" message)"
if [[ "$(jfield "$ASK" workspace_id)" == "" ]]; then
  fail "could not make somebody ask to join, so assertion 8 checked nothing: $(cat "$ASK")"
elif [[ "$CLASH_CODE" != "22023" ]]; then
  fail "inviting someone who already asked was not refused 22023 (got '$CLASH_CODE')"
elif ! grep -qF "$MARKER" <<< "$CLASH_MSG"; then
  fail "the refusal no longer contains the marker the app matches on: $MARKER"
  echo "      The server said: $CLASH_MSG"
  echo "      The app matches this prose because 0028 raises 22023 for five"
  echo "      different refusals and only this one has a next step. The honest"
  echo "      fix is a SQLSTATE of its own, which is a migration - routed to"
  echo "      5b-iii, which owns the approval path. Until then THIS assertion is"
  echo "      what makes the string match safe, and it has gone red not silent."
else
  ok "the 'already requested' refusal still carries the marker the app matches on"
fi

# --- 9. the fence in the body -------------------------------------------
# ⚠️ A STAFF MEMBER IS MADE BY REDEEMING, which is `5b-ii-b-2`'s RPC to wrap and
# is driven here by hand — the arrangement 5b-ii-a's check already recorded.
note
signup "$STAFF_EMAIL"
REDEEM="$(stash redeem "$(api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$AGAIN_TOKEN\"}")")"
FENCE_BODY="$(invite_body "nobody-$STAMP@example.com" staff "[\"$CENTRO\"]")"
FENCE="$(stash fence "$(api POST "/rest/v1/rpc/$CREATE_INVITE" "$FENCE_BODY")")"
FENCE_CODE="$(jfield "$FENCE" code)"
if [[ "$(jfield "$REDEEM" member_id)" == "" ]]; then
  fail "could not seat a staff member, so the fence assertion checked nothing: $(cat "$REDEEM")"
elif [[ "$FENCE_CODE" != "42501" ]]; then
  fail "a STAFF caller was not refused 42501 by create_invite (got '$FENCE_CODE')"
  echo "      The fence is in the FUNCTION BODY — has_role(workspace_id,'manager') —"
  echo "      and not \"under normal RLS\" as ADR-035 §2.7 still says (5b.8 owes that"
  echo "      amendment, ruled 2026-09-18). canInvite() in the app is a courtesy so a"
  echo "      shopkeeper is not shown a form that will refuse her; THIS is the"
  echo "      security, and it has just stopped holding."
else
  ok "a staff caller is refused 42501 by the fence in create_invite's body"
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
  echo "all $ran assertion groups passed — $CREATE_INVITE answers to the four names this"
  echo "app sends, the token is nowhere in the database, and the fence still holds."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the invite path and this app disagree."
exit 1

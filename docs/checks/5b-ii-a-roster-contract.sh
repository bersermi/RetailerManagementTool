#!/usr/bin/env bash
# 5b-ii-a-roster-contract — does Ajustes' roster still describe the database,
# and is the ruling it was built on still true of the applied policies?
#
# WHY THIS EXISTS, AND IT IS `5b-i-api-contract.sh`'s ARGUMENT OVER A SECOND
# SURFACE. `app/test/api-members.test.ts` can prove the app is consistent with
# itself. Nothing in TypeScript has ever read `0001` or `0002`, so a column
# renamed on either side of the wire is a 400 that the typecheck, the Vitest
# suite and the bundler all pass straight over:
#
#     {"code":"42703","message":"column workspace_member.rol does not exist"}
#
# ⚠️⚠️ AND IT ASSERTS ONE THING NO OTHER CHECK IN THIS REPOSITORY CAN: THAT THE
# OWNER'S RULING OF 2026-09-18 IS STILL THE RIGHT ONE. "Manager-and-above is
# right" was ruled on a MEASUREMENT — `workspace_invite_select` is
# `has_role(workspace_id, 'manager')` (`0002:563`) while `workspace_member_select`
# admits any member (`0001:524`), so a staff caller reads the roster and can
# identify nobody on it. That asymmetry is the whole reason `canSeeRoster`
# exists. If a later migration loosens the invite policy, the fence in the
# client becomes a section this app is hiding for no reason — and NOTHING ELSE
# WOULD GO RED, because a policy that allows more breaks no test.
#
# ⚠️ A POLICY THAT HIDES ROWS RETURNS `200 []`, NOT `403`. That is why the fence
# is a decision taken before the call and not an error handler, and assertion 5
# is where that is measured rather than recalled.
#
# WHAT IT ASSERTS, all against a REAL round trip over HTTP, with three real
# people in three real roles:
#
#   1. The two column lists are READ OUT OF `app/src/api/members.ts` — not
#      typed in here. A second copy of a contract is the defect this repository
#      has recorded eleven times.
#   2. An owner alone in a new shop reads exactly himself, with every column the
#      app asked for — and NO invite row, which is `T2`: the founding owner's
#      membership was written by `onboard_workspace` and no invite precedes it.
#   3. After two people join, the owner reads three memberships and two invites,
#      and every invite's `accepted_by` matches a `user_id` on the roster —
#      which is the join `rosterFrom` does, done here against real rows.
#   4. A MANAGER may read the invites. C11.2 makes the pilot's second person a
#      manager, so this is the pilot's own case and not a hypothetical.
#   5. ⚠️⚠️ A STAFF CALLER READS THE ROSTER AND ZERO INVITES, with HTTP 200 on
#      both. This is the ruling's measurement.
#   6. `token_hash` is readable by a manager and does NOT come back on the read
#      the app actually makes — so the omission is this app's discipline, not
#      the policy's. ⚠️ Measured off the WIRE and not off the column string,
#      because `select('*')` contains no such word.
#   7. The embed PostgREST cannot do returns `PGRST200`, which is why the join
#      is in TypeScript at all (`N4`).
#
# ⚠️ WHAT IT DOES NOT ASSERT. Anything about the SHEET. §2.11 refuses suites over
# rendering, so that `ajustes.tsx` asks `canSeeRoster` before it draws — rather
# than drawing and hiding — is the owner's own phone, as ever.
#
# ⚠️ THE FIXTURE IS DRIVEN WITH `0028`'s OWN ARGUMENT NAMES, TYPED HERE. That is
# not a second copy of anything: `create_invite` and `redeem_invite` are
# `5b-ii-b`'s to wrap and this app does not call them yet. The moment it does,
# those names come out of the app the way the column lists already do.
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. The trap five other checks here already recorded.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b-ii-a-roster-contract.sh
# With: a path to the contract module as $1, which is how a falsification
#       harness points it at a mutated copy.
# Exit: 0 the applied schema and policies answer to what Ajustes reads; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/members.ts}"
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

# --- 1. the app's own claim, read out of its source ------------------------
MEMBER_COLUMNS="$(sed -n "s/^export const MEMBER_COLUMNS = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
INVITE_COLUMNS="$(sed -n "s/^export const INVITE_COLUMNS = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
ONBOARD="$(sed -n "s/^export const ONBOARD_WORKSPACE = '\([^']*\)';.*/\1/p" "$WORKSPACE_CONTRACT" | head -1)"

note
if [[ -z "$MEMBER_COLUMNS" || -z "$INVITE_COLUMNS" || -z "$ONBOARD" ]]; then
  fail "could not read the roster's contract out of $CONTRACT"
  echo "      members='$MEMBER_COLUMNS' invites='$INVITE_COLUMNS' onboard='$ONBOARD'"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: workspace_member[$MEMBER_COLUMNS] and workspace_invite[$INVITE_COLUMNS]"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi

# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE. The secret key bypasses RLS,
# and assertion 5 — the whole point of this file — would then pass vacuously for
# exactly the reason supabase/README.md gives about the `postgres` superuser:
# a policy nobody is subject to is a policy nobody has tested.
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
# SOURCE, AND THE FALSIFICATION HARNESS IS WHAT TAUGHT THIS FILE THAT. Fixture
# `G1` renames a column; PostgREST answers 400 with a hint that QUOTES the
# column it thinks you meant, and those backslash-escaped quotes, pasted into a
# triple-quoted literal, are unescaped by Python before json.loads ever sees
# them. The check went red saying "unreadable: Expecting ',' delimiter" instead
# of naming the renamed column: RED FOR THE WRONG REASON, and the worse kind —
# it reads as the check being broken rather than the app being wrong, which is
# what gets a check deleted. Same family as the defect
# `5b-i-api-contract-falsify.sh` found in its sister on ITS first run.
stash()  { local f="$SCRATCH/$1.json"; body "$2" > "$f"; echo "$f"; }

# How many rows came back, or `!CODE` when the answer was an error object. A
# bare `len()` over an error counts its KEYS, which is how "a manager read 4
# memberships" got printed for a 400.
rows_len() {
  python3 - "$1" <<'PY'
import json, sys
try:
    rows = json.load(open(sys.argv[1]))
except Exception:
    print('!unreadable'); raise SystemExit
if isinstance(rows, list):
    print(len(rows))
else:
    print('!%s' % rows.get('code', 'object'))
PY
}
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }

STAMP="$$-$(date +%s)"
signup() { # email -> sets TOKEN and USER_ID
  local out
  out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"roster-probe-123\"}")"
  TOKEN="$(pick access_token "$(body "$out")")"
  USER_ID="$(python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('id',''))" <<< "$(body "$out")" 2>/dev/null)"
  [[ -n "$TOKEN" && -n "$USER_ID" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}

# --- the shop, and the three people in it ----------------------------------
OWNER_EMAIL="roster-owner-$STAMP@example.com"
MANAGER_EMAIL="roster-manager-$STAMP@example.com"
STAFF_EMAIL="roster-staff-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"; OWNER_ID="$USER_ID"

CREATED="$(api POST "/rest/v1/rpc/$ONBOARD" \
  '{"p_display_name":"Roster 5b-ii-a","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(python3 -c "import sys,json;print(json.load(sys.stdin))" <<< "$(body "$CREATED")" 2>/dev/null | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

# --- 2. the owner, alone, and T2 -------------------------------------------
note
ALONE="$(stash alone "$(api GET "/rest/v1/workspace_member?select=$MEMBER_COLUMNS")")"
ALONE_INVITES="$(stash alone-invites "$(api GET "/rest/v1/workspace_invite?select=$INVITE_COLUMNS")")"
VERDICT="$(python3 - "$MEMBER_COLUMNS" "$OWNER_ID" "$ALONE" "$ALONE_INVITES" <<'PY'
import json, sys
cols, owner = sys.argv[1].split(','), sys.argv[2]
try:
    members = json.load(open(sys.argv[3]))
    invites = json.load(open(sys.argv[4]))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(members, list):
    print('the roster read came back as an error: %r' % (members,)); raise SystemExit
if len(members) != 1:
    print('a new shop read %d memberships, expected exactly the founder' % len(members)); raise SystemExit
missing = [c for c in cols if c not in members[0]]
if missing:
    print('the select asked for columns the row does not have: %s' % missing); raise SystemExit
if members[0].get('user_id') != owner or members[0].get('role') != 'owner':
    print('the founder came back as %r' % (members[0],)); raise SystemExit
if invites != []:
    print('T2 is broken: the founding owner has an invite row - %r' % (invites,)); raise SystemExit
print('ok')
PY
)"
[[ -z "$VERDICT" ]] && VERDICT="the verdict script produced nothing - it crashed on the shape that came back"
if [[ "$VERDICT" == "ok" ]]; then
  ok "a new shop is one owner with every column the app asked for, and no invite (T2)"
else
  fail "$VERDICT"
fi

# --- the manager and the staff member join ---------------------------------
# ⚠️ 0028 REFUSES A STAFF INVITE WITH NO LOCATION (`22023`, D8/N1), so the owner
# reads his own store first. That read is `5b-ii-b`'s picker in embryo, and it is
# here because without it this fixture cannot produce a staff member at all.
LOCATION_ID="$(python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['id'] if r else '')" \
  <<< "$(body "$(api GET '/rest/v1/location?select=id')")" 2>/dev/null)"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location to invite into"; exit 1; }

invite_token() { # email role location_json -> token
  local out
  out="$(api POST /rest/v1/rpc/create_invite \
    "{\"p_workspace_id\":\"$WORKSPACE_ID\",\"p_email\":\"$1\",\"p_role\":\"$2\",\"p_location_ids\":$3}")"
  pick token "$(body "$out")"
}

MANAGER_TOKEN_STR="$(invite_token "$MANAGER_EMAIL" manager '[]')"
STAFF_TOKEN_STR="$(invite_token "$STAFF_EMAIL" staff "[\"$LOCATION_ID\"]")"
if [[ -z "$MANAGER_TOKEN_STR" || -z "$STAFF_TOKEN_STR" ]]; then
  echo "FAIL: create_invite returned no token — manager='$MANAGER_TOKEN_STR' staff='$STAFF_TOKEN_STR'"
  exit 1
fi

signup "$MANAGER_EMAIL"; MANAGER_TOKEN="$TOKEN"; MANAGER_ID="$USER_ID"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$MANAGER_TOKEN_STR\"}" > /dev/null

signup "$STAFF_EMAIL"; STAFF_TOKEN="$TOKEN"; STAFF_ID="$USER_ID"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_TOKEN_STR\"}" > /dev/null

# --- 3. the owner reads the whole shop, and the join has something to join --
note
TOKEN="$OWNER_TOKEN"
MEMBERS="$(stash members "$(api GET "/rest/v1/workspace_member?select=$MEMBER_COLUMNS")")"
INVITES="$(stash invites "$(api GET "/rest/v1/workspace_invite?select=$INVITE_COLUMNS")")"
VERDICT="$(python3 - "$OWNER_ID" "$MANAGER_ID" "$STAFF_ID" "$MANAGER_EMAIL" "$MEMBERS" "$INVITES" <<'PY'
import json, sys
owner, manager, staff, manager_email = sys.argv[1:5]
try:
    members = json.load(open(sys.argv[5]))
    invites = json.load(open(sys.argv[6]))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(members, list) or not isinstance(invites, list):
    print('one of the two reads came back as an error: %r / %r' % (members, invites)); raise SystemExit
try:
    by_user = dict((m['user_id'], m['role']) for m in members)
except KeyError as missing:
    print('a membership row has no %s - the join has no key on the member side' % missing); raise SystemExit
if set(by_user) != set([owner, manager, staff]):
    print('the owner read %r, expected the three who joined' % (sorted(by_user),)); raise SystemExit
if by_user[manager] != 'manager' or by_user[staff] != 'staff':
    print('the roles came back as %r' % (by_user,)); raise SystemExit
if len(invites) != 2:
    print('the owner read %d invites, expected the two he sent' % len(invites)); raise SystemExit
try:
    accepted = dict((i['accepted_by'], i['email']) for i in invites)
except KeyError as missing:
    print('an invite row has no %s - there is nothing to join on' % missing); raise SystemExit
if accepted.get(manager) != manager_email:
    print('the join has nothing to join on: accepted_by=%r' % (sorted(accepted),)); raise SystemExit
if owner in accepted:
    print('T2 is broken: the founding owner turned up in an invite'); raise SystemExit
print('ok')
PY
)"
[[ -z "$VERDICT" ]] && VERDICT="the verdict script produced nothing - it crashed on the shape that came back"
if [[ "$VERDICT" == "ok" ]]; then
  ok "three memberships, two invites, and every accepted_by is a user_id on the roster"
else
  fail "$VERDICT"
fi

# --- 4. a manager may read them too, which is the pilot's own case ----------
note
TOKEN="$MANAGER_TOKEN"
MGR_INVITES="$(api GET "/rest/v1/workspace_invite?select=$INVITE_COLUMNS")"
MGR_MEMBERS="$(api GET "/rest/v1/workspace_member?select=$MEMBER_COLUMNS")"
MGR_N="$(rows_len "$(stash mgr-invites "$MGR_INVITES")")"
MGR_M="$(rows_len "$(stash mgr-members "$MGR_MEMBERS")")"
if [[ "$(status "$MGR_INVITES")" == "200" && "$MGR_N" == "2" && "$MGR_M" == "3" ]]; then
  ok "a manager reads the roster AND the invites — C11.2's second person in the pilot"
else
  fail "a manager read $MGR_M memberships and $MGR_N invites (HTTP $(status "$MGR_INVITES"))"
  echo "      C11.2 makes the pilot's employee a manager, so canSeeRoster('manager')"
  echo "      being true is not a hypothesis about a future shop — it is the shop."
fi

# --- 5. ⚠️⚠️ THE RULING'S MEASUREMENT ---------------------------------------
note
TOKEN="$STAFF_TOKEN"
STAFF_MEMBERS="$(api GET "/rest/v1/workspace_member?select=$MEMBER_COLUMNS")"
STAFF_INVITES="$(api GET "/rest/v1/workspace_invite?select=$INVITE_COLUMNS")"
STAFF_M="$(rows_len "$(stash staff-members "$STAFF_MEMBERS")")"
STAFF_I="$(rows_len "$(stash staff-invites "$STAFF_INVITES")")"
if [[ "$(status "$STAFF_MEMBERS")" == "200" && "$STAFF_M" == "3" \
   && "$(status "$STAFF_INVITES")" == "200" && "$STAFF_I" == "0" ]]; then
  ok "a staff caller reads 3 memberships and 0 invites, both 200 — the ruling of 2026-09-18 still holds"
else
  fail "a staff caller read $STAFF_M memberships (HTTP $(status "$STAFF_MEMBERS")) and $STAFF_I invites (HTTP $(status "$STAFF_INVITES"))"
  echo "      The owner ruled the roster manager-and-above BECAUSE of this asymmetry:"
  echo "      staff see every colleague and can identify none of them. If the invite"
  echo "      policy has been loosened, canSeeRoster in app/src/api/members.ts is now"
  echo "      hiding a section for no reason, and nothing else in this repository"
  echo "      would have gone red — a policy that allows MORE breaks no test."
fi

# --- 6. the secret the app declines to ask for -----------------------------
note
TOKEN="$MANAGER_TOKEN"
HASH_READ="$(api GET "/rest/v1/workspace_invite?select=token_hash")"
# ⚠️ THE SECOND HALF IS READ OFF THE WIRE AND NOT OFF THE COLUMN LIST, because
# `select('*')` contains no such word: a check that only grepped the app's string
# would go green on the one edit that ships the hash to every manager's phone.
LEAKED="$(python3 - "$INVITES" <<'PY'
import json, sys
try:
    rows = json.load(open(sys.argv[1]))
except Exception:
    print('unreadable'); raise SystemExit
if not isinstance(rows, list):
    print('unreadable'); raise SystemExit
print(','.join(sorted(k for r in rows for k in r if 'token' in k or 'hash' in k)))
PY
)"
if [[ "$(status "$HASH_READ")" == "200" && -z "$LEAKED" ]]; then
  ok "token_hash is readable by a manager and never reaches the app — R13's other half"
else
  fail "token_hash read $(status "$HASH_READ") and the app's own read returned [$LEAKED]"
  echo "      The point of this assertion is that the omission is the APP's. If the"
  echo "      policy is what stops the hash reaching a phone, then a select('*')"
  echo "      would be harmless — and it is not."
fi

# --- 7. the embed PostgREST cannot do (N4) ---------------------------------
note
EMBED="$(api GET "/rest/v1/workspace_member?select=user_id,workspace_invite(email)")"
if grep -q 'PGRST200' <<< "$(body "$EMBED")"; then
  ok "the one-read embed is refused as PGRST200 — which is why rosterFrom exists"
else
  fail "the embed returned $(status "$EMBED") $(body "$EMBED")"
  echo "      app/src/api/members.ts joins in TypeScript because there is no foreign"
  echo "      key between the two tables — both reference auth.users, which §2.7"
  echo "      never exposes. If PostgREST can now embed them, that claim is stale"
  echo "      and the client is doing two reads it no longer has to."
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that skipped everything
# looks like — which here is one unset variable away.
EXPECTED=7
if (( ran < EXPECTED )); then
  echo "FAIL: only $ran assertion groups ran, expected $EXPECTED — this check"
  echo "      asserted almost nothing and was about to report success."
  exit 1
fi
if (( fails > 0 )); then
  echo "$ran assertion groups ran, $fails failed — Ajustes' roster and the applied"
  echo "schema disagree, and only this check can see it."
  exit 1
fi
echo "all $ran assertion groups passed — the database answers to exactly what"
echo "Ajustes reads, and the roster's manager fence is still the right one."

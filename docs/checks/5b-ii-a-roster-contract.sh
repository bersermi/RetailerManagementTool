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
# admits any member (`0001:524`). That asymmetry is the whole reason
# `canSeeRoster` exists. If a later migration loosens the invite policy, the
# fence in the client becomes a section this app is hiding for no reason — and
# NOTHING ELSE WOULD GO RED, because a policy that allows more breaks no test.
#
# ⚠️⚠️ ONE HALF OF THAT MEASUREMENT EXPIRED ON 2026-09-18 AND ASSERTION 9 IS
# WHERE IT WAS RE-TAKEN. The ruling's original wording was that a staff caller
# "reads the roster and can identify nobody on it". `0034` put a name on
# `workspace_member` and `5b.8-ii` reads it, so a staff roster is now perfectly
# legible and THAT sentence is dead. The fence stays on the half that did not
# move — this sheet also carries the invite button — and both halves are
# measured here rather than remembered: assertion 5 for the invites, assertion 9
# for the names.
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
#   8. ⚠️⚠️ THE NAME COMES BACK ON THE COLUMNS THE APP ASKS FOR, AND THE NULL
#      DOES TOO. `0034` copies `raw_user_meta_data ->> 'full_name'` onto the
#      membership at every one of the four ways into a shop; this signs two
#      people up WITH that metadata and one WITHOUT, and reads all three off the
#      wire. The null is asserted as deliberately as the name: the column is
#      nullable so an account with empty metadata is still ADMITTED, and that is
#      the floor `rosterFrom`'s email and role rungs stand on. A migration that
#      made the column NOT NULL would refuse that person at the door, and
#      nothing in TypeScript would go red.
#   9. ⚠️⚠️ A STAFF CALLER READS EVERY COLLEAGUE'S NAME, WHICH IS THE
#      MEASUREMENT THAT RETIRES THE 2026-09-14 RULING. That ruling — the member
#      row is identified by EMAIL and by no name — rested on `T1`: no table in
#      this schema carried one. Two split guards held it as a DELIVERABLE, and
#      `5b.8-ii` retires their sentinels. THIS is the assertion that makes the
#      retirement evidence rather than a claim: the same caller who reads zero
#      invites in assertion 5 reads a NAME on every row, because the name lives
#      on `workspace_member` and that policy admits any member (`0001:524`).
#      ⚠️ It is also the shape of the thing the owner RULED on the same day —
#      *"leave it"* — so if a later migration fences the column off, this goes
#      red and the ruling gets re-read rather than silently reversed.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Anything about the SHEET. §2.11 refuses suites over
# rendering, so that `ajustes.tsx` asks `canSeeRoster` before it draws — rather
# than drawing and hiding — is the owner's own phone, as ever.
#
# ⚠️ THE `full_name` METADATA KEY IS TYPED HERE AND IT IS THE ONE STRING THIS
# FILE SPELLS THAT IT DOES NOT READ OUT OF THE APP. It belongs to GoTrue and to
# Google's provider, not to us — `docs/checks/5b.7-signup-name-contract.sh` is
# the check that owns it and reads it out of `app/src/auth/credentials.ts`. Here
# it is fixture setup: this file's subject is what comes back on the ROSTER read,
# and a second reader of that key would be a second copy of somebody else's
# contract.
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

# ⚠️ ACCENTS, AND THEY ARE NOT DECORATION. This is a Mexican app whose users are
# mostly called things with accents in, and a transport that mangled UTF-8
# anywhere between the sign-up body and the roster read would otherwise be green.
# The same argument `5b.7`'s check makes one hop upstream.
OWNER_NAME='Bernardo Serafín Quiñones'
MANAGER_NAME='María del Carmen Rodríguez'

# ⚠️ THE PAYLOAD IS BUILT BY `json.dumps` AND NEVER BY STRING INTERPOLATION.
# A name is the one fixture value in this file that contains characters a shell
# heredoc and JSON disagree about, and hand-quoting it is how a check goes red
# for the wrong reason — the defect `stash` already records one layer down.
#
# ⚠️ AN ABSENT NAME IS AN ABSENT `data` OBJECT, NOT AN EMPTY ONE.
# `{"full_name": ""}` is a different account from one that never carried the key,
# and the floor assertions 8 and 9 rest on is the second of the two.
signup() { # email [full_name] -> sets TOKEN and USER_ID
  local out payload
  payload="$(python3 -c '
import json, sys
doc = {"email": sys.argv[1], "password": "roster-probe-123"}
if sys.argv[2]:
    doc["data"] = {"full_name": sys.argv[2]}
print(json.dumps(doc))
' "$1" "${2-}")"
  out="$(TOKEN="" api POST /auth/v1/signup "$payload")"
  TOKEN="$(pick access_token "$(body "$out")")"
  USER_ID="$(python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('id',''))" <<< "$(body "$out")" 2>/dev/null)"
  [[ -n "$TOKEN" && -n "$USER_ID" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}

# --- the shop, and the three people in it ----------------------------------
OWNER_EMAIL="roster-owner-$STAMP@example.com"
MANAGER_EMAIL="roster-manager-$STAMP@example.com"
STAFF_EMAIL="roster-staff-$STAMP@example.com"

signup "$OWNER_EMAIL" "$OWNER_NAME"; OWNER_TOKEN="$TOKEN"; OWNER_ID="$USER_ID"

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
    print("unreadable: %s" % exc); raise SystemExit
if not isinstance(members, list):
    print("the roster read came back as an error: %r" % (members,)); raise SystemExit
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

signup "$MANAGER_EMAIL" "$MANAGER_NAME"; MANAGER_TOKEN="$TOKEN"; MANAGER_ID="$USER_ID"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$MANAGER_TOKEN_STR\"}" > /dev/null

# ⚠️ NO NAME, DELIBERATELY. Assertions 8 and 9 need one account whose metadata
# is empty — a Google sign-in that returned nothing, or anybody made before
# `5b.7` — because that is the person `rosterFrom`'s lower rungs exist for, and
# the person a NOT NULL column would refuse at the door.
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
    print("unreadable: %s" % exc); raise SystemExit
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

# --- 8. the name 0034 stores, and the null it deliberately allows -----------
# ⚠️ READ AS THE OWNER, OFF THE COLUMNS THE APP ASKS FOR. `$MEMBERS` above was
# fetched with `select=$MEMBER_COLUMNS`, so if `display_name` is not in that
# string this group has nothing to look at — and says so, rather than reporting
# that a name was absent from a row nobody asked for it on.
note
VERDICT="$(python3 - "$MEMBER_COLUMNS" "$OWNER_ID" "$MANAGER_ID" "$STAFF_ID" "$OWNER_NAME" "$MANAGER_NAME" "$MEMBERS" <<'PY'
import json, sys
cols = sys.argv[1].split(',')
owner, manager, staff, owner_name, manager_name = sys.argv[2:7]
if 'display_name' not in cols:
    print("the app does not ask workspace_member for display_name, so the "
          "0034 column reaches no phone - MEMBER_COLUMNS is [%s]" % sys.argv[1])
    raise SystemExit
try:
    members = json.load(open(sys.argv[7]))
except Exception as exc:
    print("unreadable: %s" % exc); raise SystemExit
if not isinstance(members, list):
    print("the roster read came back as an error: %r" % (members,)); raise SystemExit
by_user = {}
for m in members:
    if 'display_name' not in m:
        print("a membership row came back without display_name, though the select "
              "asked for it: %r" % (m,)); raise SystemExit
    by_user[m['user_id']] = m['display_name']
if by_user.get(owner) != owner_name:
    print('onboard_workspace did not store the founder name: %r, sent %r'
          % (by_user.get(owner), owner_name)); raise SystemExit
if by_user.get(manager) != manager_name:
    print('redeem_invite did not store the joiner name: %r, sent %r'
          % (by_user.get(manager), manager_name)); raise SystemExit
if by_user.get(staff) is not None:
    print("an account signed up with NO full_name metadata came back with "
          "%r - the nullable column is the floor the identity ladder stands on"
          % (by_user.get(staff),)); raise SystemExit
print('ok')
PY
)"
[[ -z "$VERDICT" ]] && VERDICT="the verdict script produced nothing - it crashed on the shape that came back"
if [[ "$VERDICT" == "ok" ]]; then
  ok "two names came back intact through two different writers, and the account with no metadata came back null"
else
  fail "$VERDICT"
  echo "      0034 copies raw_user_meta_data ->> 'full_name' onto the membership at"
  echo "      all four ways into a shop, and the identity ladder reads it."
  echo "      ⚠️ The NULL is asserted as deliberately as the name: the column is"
  echo "      nullable so an account with empty metadata is still ADMITTED. A"
  echo "      migration that made it NOT NULL would refuse that person at the"
  echo "      door, and nothing in TypeScript would have gone red."
fi

# --- 9. ⚠️⚠️ THE MEASUREMENT THAT RETIRED THE 2026-09-14 RULING -------------
# The same caller as assertion 5, asking the same question about the other
# table. She reads ZERO invites and every colleague's NAME, because the name is
# on `workspace_member` and that policy admits any member of the workspace.
note
TOKEN="$STAFF_TOKEN"
STAFF_NAMED="$(stash staff-named "$(api GET "/rest/v1/workspace_member?select=$MEMBER_COLUMNS")")"
VERDICT="$(python3 - "$OWNER_ID" "$MANAGER_ID" "$OWNER_NAME" "$MANAGER_NAME" "$STAFF_NAMED" <<'PY'
import json, sys
owner, manager, owner_name, manager_name = sys.argv[1:5]
try:
    members = json.load(open(sys.argv[5]))
except Exception as exc:
    print("unreadable: %s" % exc); raise SystemExit
if not isinstance(members, list):
    print("the staff roster read came back as an error: %r" % (members,)); raise SystemExit
by_user = dict((m.get('user_id'), m.get('display_name')) for m in members)
if by_user.get(owner) != owner_name or by_user.get(manager) != manager_name:
    print("a staff caller read %r, expected both colleagues by name" % (by_user,)); raise SystemExit
print('ok')
PY
)"
[[ -z "$VERDICT" ]] && VERDICT="the verdict script produced nothing - it crashed on the shape that came back"
if [[ "$VERDICT" == "ok" ]]; then
  ok "a staff caller reads every colleague by NAME — the 2026-09-14 EMAIL ruling is superseded, measured"
else
  fail "$VERDICT"
  echo "      The owner ruled on 2026-09-14 that a member row is identified by"
  echo "      EMAIL and by no name, BECAUSE no table in this schema carried one."
  echo "      0034 ended that and he ruled again on 2026-09-18 — leave it — there"
  echo "      being no cheap fence: Postgres has no column-level RLS. Two split"
  echo "      guards held the old ruling as a deliverable and 5b.8-ii retired"
  echo "      their sentinels ON THE STRENGTH OF THIS ASSERTION. If it is red, the"
  echo "      column has been fenced off after all and that retirement is now a"
  echo "      claim with nothing behind it — re-read the ruling, do not delete"
  echo "      this group."
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that skipped everything
# looks like — which here is one unset variable away.
EXPECTED=9
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
echo "Ajustes reads, the roster's manager fence is still the right one, and a"
echo "member row says who the person is."

#!/usr/bin/env bash
# 5b-ii-a-roster-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `5b-ii-a-roster-contract.sh` prints "all 9
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what distinguishes the two: eleven fixtures —
# eight that must turn it red, a control that must leave it green, and two that
# assert the tree was put back afterwards.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE — the rule its sister
# harness paid for on its first run: *a fixture that is red for the wrong reason
# is not a falsification, it is a coincidence*. `5b-i-api-contract-falsify.sh`
# found the argument reader recognising an argument by the very prefix it exists
# to test, and reported "could not read the contract" where a 404 was owed.
#
# ⚠️⚠️ AND TWO FIXTURES MOVE THE DATABASE, NOT THE FILE. Six of these edit
# a copy of `app/src/api/members.ts`; `G5` and `G8` edit an applied POLICY,
# because the two assertions that matter most in that check — the owner's two
# rulings of 2026-09-18 still being the right rulings — cannot be falsified from
# the client side at all.
#
#   * `G5` LOOSENS `workspace_invite_select` to any member. The roster is
#     manager-and-above; if a staff caller could read the invites, the fence in
#     the client would be a section this app hides for no reason.
#   * `G8` NARROWS `workspace_member_select` to manager-and-above — the exact
#     fence the owner DECLINED on 2026-09-18 when he ruled *"leave it"* on a
#     cashier reading her colleagues' names. It is one of the three moves that
#     ruling weighed, and if a later session makes it anyway, assertion 9 is the
#     only thing in this repository that goes red. ⚠️ It is also the fixture
#     that keeps `5b.8-ii`'s retirement of two split-guard sentinels honest: that
#     retirement rests on assertion 9, so assertion 9 has to be able to fail.
#
# Both run the check, expect the named assertion to go red, and PUT THE POLICY
# BACK.
#
#   ⚠️ EACH RESTORE IS IN A `trap` AND RUNS ON EVERY EXIT PATH, including a
#   Ctrl-C and a failure inside the fixture. A harness that leaves a loosened
#   policy behind on a developer's machine has done more damage than the defect
#   it was looking for — every later run of every RLS check would pass against
#   a database nobody meant to have. ⚠️ `G8`'s is worse than `G5`'s if it
#   leaks: a NARROWED policy makes the tree look broken rather than safe, which
#   is the failure that gets a check deleted.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b-ii-a-roster-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b-ii-a-roster-contract.sh"
SOURCE="app/src/api/members.ts"
[[ -r "$CHECK" && -r "$SOURCE" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE
# DIRECTORY. `supabase start` names it `supabase_db_<project_id>`, and on this
# machine the project id and the checkout directory happen to be the same word —
# which is exactly the coincidence that makes a wrong derivation look correct
# until somebody clones the repo under another name. The owner's Mac has no
# `psql` of its own, so `docker exec` is the only way in.
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
# And a fallback for the one case that beats a correct derivation: a stack
# started under a different id. One running Postgres is unambiguous.
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi

# The policy as `0002:563` declares it. ⚠️ QUOTED FROM THE MIGRATION, and the
# restore below re-creates exactly this — not "something equivalent".
ORIGINAL_POLICY="create policy workspace_invite_select on public.workspace_invite
  for select to authenticated
  using (public.has_role(workspace_id, 'manager'));"

# And `workspace_member_select` as `0001:524` declares it — the read behind every
# member's own role lookup, `rosterFrom`'s join, and assertion 9's name.
ORIGINAL_MEMBER_POLICY="create policy workspace_member_select on public.workspace_member
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));"

policy_restored=yes
member_policy_restored=yes
restore_policy() {
  [[ "$policy_restored" == yes ]] && return 0
  docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1 <<SQL
drop policy if exists workspace_invite_select on public.workspace_invite;
$ORIGINAL_POLICY
SQL
  policy_restored=yes
  echo "        (workspace_invite_select restored to 0002's definition)"
}
restore_member_policy() {
  [[ "$member_policy_restored" == yes ]] && return 0
  docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1 <<SQL
drop policy if exists workspace_member_select on public.workspace_member;
$ORIGINAL_MEMBER_POLICY
SQL
  member_policy_restored=yes
  echo "        (workspace_member_select restored to 0001's definition)"
}
restore_all() { restore_policy; restore_member_policy; }
trap restore_all EXIT INT TERM

TMP="$(mktemp -d)"
trap 'restore_all; rm -rf "$TMP"' EXIT

fixtures=0
bad=0

# Runs the check against a (possibly mutated) contract and matches its output.
# $1 label  $2 expectation: a grep -E pattern, or the word GREEN
# $3 path to the contract to use
expect() {
  local label="$1" pattern="$2" contract="$3" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$contract" 2>&1)"; rc=$?
  if [[ "$pattern" == GREEN ]]; then
    if (( rc == 0 )) && grep -q 'all 9 assertion groups passed' <<< "$out"; then
      echo "  ok    $label — green, as it must be"
    else
      echo "FAIL: $label should have been GREEN (exit $rc)"
      sed 's/^/        /' <<< "$out" | tail -12
      bad=$((bad+1))
    fi
    return
  fi
  if (( rc == 0 )); then
    echo "FAIL: $label — the check PASSED on a broken tree, which is the vacuous"
    echo "      green this harness exists to catch."
    bad=$((bad+1))
  elif grep -qE "$pattern" <<< "$out"; then
    echo "  ok    $label — red, and red for the stated reason"
  else
    echo "FAIL: $label — red, but NOT for the reason it is named for."
    echo "      expected to match: $pattern"
    sed 's/^/        /' <<< "$out" | grep -E '^ *FAIL|^ *[a-z]' | tail -8
    bad=$((bad+1))
  fi
}

# One copy of the contract with one sed applied. ⚠️ THE COPY IS DIFFED AGAINST
# THE ORIGINAL AFTERWARDS: "the fixture edited nothing" is the anti-vacuity
# failure one layer in, and it is how three fixtures in this repository were
# found to have been silently dead.
mutate() { # label sed-expression -> path
  local label="$1" expr="$2" path="$TMP/$1.ts"
  sed "$expr" "$SOURCE" > "$path"
  if cmp -s "$path" "$SOURCE"; then
    echo "FAIL: fixture $label edited nothing — it proves nothing about the check."
    bad=$((bad+1))
  fi
  echo "$path"
}

echo "— the control —"
expect G0 GREEN "$SOURCE"

echo
echo "— the contract, mutated —"

# ⚠️ G1 IS THE 400 THIS WHOLE FILE EXISTS FOR. A column renamed on either side
# of the wire compiles, bundles and passes 215 Vitest assertions.
expect G1 'the roster read came back as an error|42703' \
  "$(mutate G1 "s/^export const MEMBER_COLUMNS = .*/export const MEMBER_COLUMNS = 'user_id,rol,is_active,display_name';/")"

# ⚠️⚠️ G2 IS THE ONE THAT SHIPS A SECRET. `select('*')` on `workspace_invite`
# hands `token_hash` to every manager's phone — and it contains no word a
# string-matching check would catch, which is why assertion 6 reads the wire.
expect G2 'token_hash read|the app.s own read returned' \
  "$(mutate G2 "s/^export const INVITE_COLUMNS = .*/export const INVITE_COLUMNS = '*';/")"

# G3: the column the client-side join is joined ON. Without it every roster row
# but the caller's own falls back to a role label, silently.
expect G3 'an invite row has no .accepted_by.|nothing to join on' \
  "$(mutate G3 "s/^export const INVITE_COLUMNS = .*/export const INVITE_COLUMNS = 'email';/")"

# G4: the contract is unreadable — the vacuity guard at the top of the check.
expect G4 'could not read the roster.s contract' \
  "$(mutate G4 "s/^export const MEMBER_COLUMNS/const MEMBER_COLUMNS/")"

# G5 is not a mutation of this file but of the DATABASE — see below.
# G6: the founding owner's own row. Dropping `user_id` leaves the join with no
# key on the member side, and `Tú` with nobody to attach to.
expect G6 'the founder came back as|a membership row has no .user_id.' \
  "$(mutate G6 "s/^export const MEMBER_COLUMNS = .*/export const MEMBER_COLUMNS = 'role,is_active,display_name';/")"

# ⚠️⚠️ G7 IS THE REGRESSION `5b.8-ii` EXISTS TO PREVENT A SECOND TIME. `0034`
# shipped the column and its own closing section says "NOTHING READS THE COLUMN";
# this task is the line that ended that, and dropping `display_name` from the
# select puts it straight back — a stored name nobody sees, with every Vitest
# assertion still green because they hand `rosterFrom` rows this app would never
# receive. Assertion 8 is what notices, and it says so in those words rather than
# reporting an absent value on a row nobody asked for it on.
expect G7 'does not ask workspace_member for display_name' \
  "$(mutate G7 "s/^export const MEMBER_COLUMNS = .*/export const MEMBER_COLUMNS = 'user_id,role,is_active';/")"

echo
echo "— the applied policy, loosened —"
# ⚠️⚠️ THE FIXTURE THAT CANNOT BE WRITTEN IN TYPESCRIPT. The owner ruled the
# roster manager-and-above BECAUSE staff cannot read `workspace_invite`. This
# makes that false for ninety seconds and asserts the check notices.
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  echo "FAIL: cannot reach $DB_CONTAINER — G5 is the fixture this harness is"
  echo "      most for, and skipping it silently is the vacuous green again."
  bad=$((bad+1))
  fixtures=$((fixtures+1))
else
  policy_restored=no
  docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1 <<'SQL'
drop policy if exists workspace_invite_select on public.workspace_invite;
create policy workspace_invite_select on public.workspace_invite
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));
SQL
  expect G5 'the ruling of 2026-09-18|a staff caller read' "$SOURCE"
  restore_policy
  # ⚠️ AND THE RESTORE IS ITSELF ASSERTED. A harness that silently failed to put
  # the policy back would leave every later RLS check passing against a database
  # nobody meant to have — a far worse outcome than the defect it was hunting.
  fixtures=$((fixtures+1))
  if bash "$CHECK" "$SOURCE" >/dev/null 2>&1; then
    echo "  ok    G5r — the policy went back, and the check is green again"
  else
    echo "FAIL: G5r — the policy was NOT restored. Run \`supabase db reset\`."
    bad=$((bad+1))
  fi
fi

echo
echo "— the applied policy, narrowed —"
# ⚠️⚠️ THE FENCE THE OWNER DECLINED, BUILT FOR NINETY SECONDS. On 2026-09-18 he
# ruled *"leave it"* on a cashier reading her colleagues' names, with narrowing
# `workspace_member_select` named as one of the three moves available and
# rejected: it is the read behind every member's own role lookup and behind
# `rosterFrom`'s join. This makes that move and asserts assertion 9 notices.
#
# ⚠️ IT IS ALSO WHAT KEEPS A SENTINEL RETIREMENT HONEST. `5b.8-ii` retired the
# 2026-09-14 EMAIL sentinels from two split guards on the strength of assertion
# 9. A retirement resting on an assertion that cannot fail is a retirement
# resting on nothing.
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  echo "FAIL: cannot reach $DB_CONTAINER — G8 is the fixture that keeps a"
  echo "      retired ruling honest, and skipping it silently is the vacuous"
  echo "      green again."
  bad=$((bad+1))
  fixtures=$((fixtures+1))
else
  member_policy_restored=no
  docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1 <<'SQL'
drop policy if exists workspace_member_select on public.workspace_member;
create policy workspace_member_select on public.workspace_member
  for select to authenticated
  using (public.has_role(workspace_id, 'manager'));
SQL
  # ⚠️ THE PATTERN PINS ASSERTION 9 AND NOT ASSERTION 5. Narrowing this policy
  # also empties the staff caller's roster, which assertion 5 reports in
  # different words — and a fixture that accepted either message would pass
  # while proving nothing about the assertion it is named for.
  expect G8 'expected both colleagues by name' "$SOURCE"
  restore_member_policy
  fixtures=$((fixtures+1))
  if bash "$CHECK" "$SOURCE" >/dev/null 2>&1; then
    echo "  ok    G8r — the policy went back, and the check is green again"
  else
    echo "FAIL: G8r — workspace_member_select was NOT restored. ⚠️ A NARROWED"
    echo "      policy left behind makes the whole tree look broken rather than"
    echo "      safe, which is the failure that gets a check deleted. Run"
    echo "      \`supabase db reset\`."
    bad=$((bad+1))
  fi
fi

echo
# ⚠️ THE ANTI-VACUITY FLOOR. A harness that ran no fixtures prints no failures.
EXPECTED=11
if (( fixtures < EXPECTED )); then
  echo "FAIL: only $fixtures fixtures ran, expected $EXPECTED."
  exit 1
fi
if (( bad > 0 )); then
  echo "$fixtures fixtures ran, $bad behaved wrongly — the check cannot be trusted"
  echo "to fail, which means its green says nothing."
  exit 1
fi
echo "all $fixtures fixtures behaved (8 red, 3 deliberately green) — the roster"
echo "contract can still fail, including on two policies nothing else would notice."

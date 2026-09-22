#!/usr/bin/env bash
# 5d-iv-a-takings-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `5d-iv-a-takings-contract.sh` prints "all 11
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what distinguishes the two: ten fixtures — a
# control that must stay green, seven that break the CONTRACT, and two that
# break the DATABASE.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is
# red for the wrong reason is not a falsification, it is a coincidence* — the
# rule `5b-i-api-contract-falsify.sh` paid for on its first run.
#
# ⚠️⚠️ AND TWO FIXTURES MOVE AN APPLIED POLICY, BECAUSE THE ASSERTION THAT
# MATTERS MOST IN THAT CHECK CANNOT BE FALSIFIED FROM THE CLIENT SIDE AT ALL.
# The owner ruled on 2026-09-14 that **a cashier keeps seeing revenue**, and the
# top of Inicio rests on it: `sale_select` (`0003:574`) admits every member at
# their own locations, with no `has_role` anywhere in it. If a later migration
# narrows that policy, the takings go blank for the person at the counter and
# NOTHING ELSE HERE WOULD GO RED — a policy that allows LESS breaks no test.
#
#   * `J8` narrows `sale_select` to manager-and-above. The owner still sees
#     every peso, so eight of the eleven groups stay green and only the cashier
#     one moves — which is exactly how this would arrive in real life.
#   * `J9` scopes it to the rows the CALLER created. Subtler and worse: every
#     member reads something, so nothing looks broken, and each phone shows a
#     different day's takings for the same shop.
#
# Both run the check, expect its cashier assertion to go red, and PUT THE POLICY
# BACK. ⚠️ Each restore is in a `trap` and runs on every exit path, Ctrl-C
# included: a harness that leaves a NARROWED policy behind makes the tree look
# broken rather than safe, which is the failure that gets a check deleted.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5d-iv-a-takings-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5d-iv-a-takings-contract.sh"
SOURCE="app/src/api/today.ts"
[[ -r "$CHECK" && -r "$SOURCE" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE
# DIRECTORY — the coincidence `5b-ii-a`'s harness recorded. The owner's Mac has
# no `psql` of its own, so `docker exec` is the only way in.
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi

# The policy as `0003:574` declares it. ⚠️ QUOTED FROM THE MIGRATION: the restore
# re-creates exactly this, not "something equivalent".
ORIGINAL_SALE_POLICY="create policy sale_select on public.sale
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));"

sale_policy_restored=yes
restore_sale_policy() {
  [[ "$sale_policy_restored" == yes ]] && return 0
  docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1 <<SQL
drop policy if exists sale_select on public.sale;
$ORIGINAL_SALE_POLICY
SQL
  sale_policy_restored=yes
  echo "        (sale_select restored to 0003's definition)"
}

TMP="$(mktemp -d)"
trap 'restore_sale_policy; rm -rf "$TMP"' EXIT INT TERM

fixtures=0
bad=0

# Runs the check against a (possibly mutated) contract and matches its output.
# $1 label  $2 expectation: a grep -E pattern, or the word GREEN  $3 contract path
expect() {
  local label="$1" pattern="$2" contract="$3" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$contract" 2>&1)"; rc=$?
  if [[ "$pattern" == GREEN ]]; then
    if (( rc == 0 )) && grep -q 'all 11 assertion groups passed' <<< "$out"; then
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
    sed 's/^/        /' <<< "$out" | grep -E '^FAIL|^ +[a-z]' | tail -8
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
expect J0 GREEN "$SOURCE"

echo
echo "— the contract, mutated —"

# ⚠️ J1 IS THE 400 THIS WHOLE FILE EXISTS FOR. A column renamed on either side of
# the wire compiles, bundles and passes 726 Vitest assertions.
expect J1 'answered 400|42703' \
  "$(mutate J1 "s/^export const SALE_COLUMNS = .*/export const SALE_COLUMNS = 'id,total_neto::text,total_tax::text,reversal_of';/")"

# ⚠️⚠️ J2 IS THE MONEY ONE, AND IT IS INVISIBLE TO EVERY OTHER INSTRUMENT. Drop
# the cast and PostgREST sends a JSON number; `JSON.parse` makes it a double,
# `parseDecimal` refuses a number argument, and the app WITHHOLDS the takings —
# a blank at the top of Inicio, with the typecheck, the suite and the bundler all
# green and nothing anywhere saying why.
expect J2 'arrived as JSON numbers' \
  "$(mutate J2 "s/^export const SALE_COLUMNS = .*/export const SALE_COLUMNS = 'id,total_net,total_tax::text,reversal_of';/")"

# J3: the other money column, because one cast surviving is not two.
expect J3 'arrived as JSON numbers' \
  "$(mutate J3 "s/^export const SALE_COLUMNS = .*/export const SALE_COLUMNS = 'id,total_net::text,total_tax,reversal_of';/")"

# ⚠️ J4: `select=*`. A star ships `created_by` — who rang the sale up — plus the
# payload hash and the offline flag to a screen that renders none of them.
expect J4 'columns .* never asked for' \
  "$(mutate J4 "s/^export const SALE_COLUMNS = .*/export const SALE_COLUMNS = '*';/")"

# ⚠️⚠️ J5: THE WINDOW MOVES TO `recorded_at`. This is the fixture with no second
# home anywhere: the pilot store is offline half the day, so a sale rung up at
# 17:00 and synced at 21:00 is DATED yesterday and RECORDED today. Filtering on
# the wrong column sweeps yesterday's late trade into this morning's takings, and
# every suite in this repository stays green.
expect J5 'the day window|expected this morning' \
  "$(mutate J5 "s/^export const TODAY_COLUMN = .*/export const TODAY_COLUMN = 'recorded_at';/")"

# ⚠️ J6: `reversal_of` dropped. The figure still sums correctly — it is the COUNT
# that silently starts saying *2 ventas* after one sale and one undo, and there is
# nothing on the wire to tell it otherwise.
expect J6 'not with what the app asked for|reversal_of' \
  "$(mutate J6 "s/^export const SALE_COLUMNS = .*/export const SALE_COLUMNS = 'id,total_net::text,total_tax::text';/")"

# J7: the contract is unreadable — the vacuity guard at the top of the check.
expect J7 'could not read the takings contract' \
  "$(mutate J7 's/^export const SALE_COLUMNS/const SALE_COLUMNS/')"

echo
echo "— the database, narrowed —"

# ⚠️⚠️ J8: `sale_select` FENCED TO MANAGERS. This is the decision of 2026-09-14
# reversed in the only place that could reverse it, and no client-side edit can
# stand in for it: the owner still reads every peso, so the check's other ten
# groups are green and only the cashier moves.
sale_policy_restored=no
docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1 <<'SQL'
drop policy if exists sale_select on public.sale;
create policy sale_select on public.sale
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations())
     and public.has_role(workspace_id, 'manager'));
SQL
expect J8 'a cashier read 200 with 0 rows' "$SOURCE"
restore_sale_policy

# ⚠️⚠️ J9: `sale_select` SCOPED TO THE CALLER'S OWN DOCUMENTS. The subtler of the
# two and the worse one: nothing is empty, nothing looks broken, and every phone
# in the shop shows a DIFFERENT figure for the same day — which is the one number
# a shopkeeper reconciles against her till.
sale_policy_restored=no
docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1 <<'SQL'
drop policy if exists sale_select on public.sale;
create policy sale_select on public.sale
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations())
     and created_by = auth.uid());
SQL
expect J9 'a cashier read 200 with 0 rows' "$SOURCE"
restore_sale_policy

echo
# ⚠️ AND THE CONTROL IS RUN AGAIN AT THE END, which is not belt-and-braces: the
# two policy fixtures above edit the DATABASE, and a restore that silently failed
# would leave every later run of the real check red for a reason nobody could
# find in the diff.
echo "— the control again, after the database was edited and put back —"
expect J10 GREEN "$SOURCE"

echo
if (( bad > 0 )); then
  echo "$fixtures fixtures ran, $bad did not behave — the check cannot be trusted."
  exit 1
fi
if (( fixtures < 11 )); then
  echo "FAIL: only $fixtures fixtures ran, expected 11 — this harness asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
echo "all $fixtures fixtures behaved as recorded — the check still fails, for the"
echo "stated reason, on a renamed column, a dropped cast, a star select, the wrong"
echo "window column, a missing reversal_of, an unreadable contract and a narrowed"
echo "policy."

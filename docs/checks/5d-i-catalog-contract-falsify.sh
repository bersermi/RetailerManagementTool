#!/usr/bin/env bash
# 5d-i-catalog-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `5d-i-catalog-contract.sh` prints "all 12
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what distinguishes the two: eleven fixtures —
# a control that must stay green, eight that break the CONTRACT, and two that
# break the DATABASE.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is
# red for the wrong reason is not a falsification, it is a coincidence* — the
# rule `5b-i-api-contract-falsify.sh` paid for on its first run.
#
# ⚠️⚠️ AND TWO FIXTURES MOVE AN APPLIED POLICY, BECAUSE THE ASSERTION THAT
# MATTERS MOST IN THAT CHECK CANNOT BE FALSIFIED FROM THE CLIENT SIDE AT ALL.
# `5d`'s sizing took a decision on the owner's behalf — **Productos is shown to
# every member, not manager-and-above** — and it rests on a measurement:
# `product_variant_select` and `price_list_select` admit any member of the shop
# while the INSERT and UPDATE policies are `has_role('manager')`. If a later
# migration narrows either one, the Productos screen is empty (or priceless) for
# the person at the counter and NOTHING ELSE HERE WOULD GO RED: a policy that
# allows less breaks no test.
#
#   * `H9`  narrows `product_variant_select` to manager-and-above.
#   * `H10` narrows `price_list_select` the same way — the subtler of the two,
#     because the cashier still sees every product and every price is a dash.
#
# Both run the check, expect its cashier assertion to go red, and PUT THE POLICY
# BACK. ⚠️ Each restore is in a `trap` and runs on every exit path, Ctrl-C
# included: a harness that leaves a NARROWED policy behind makes the tree look
# broken rather than safe, which is the failure that gets a check deleted.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5d-i-catalog-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5d-i-catalog-contract.sh"
SOURCE="app/src/api/catalog.ts"
[[ -r "$CHECK" && -r "$SOURCE" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE
# DIRECTORY — the coincidence `5b-ii-a`'s harness recorded. The owner's Mac has
# no `psql` of its own, so `docker exec` is the only way in.
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi

# The two policies as `0002:507` and `0002:542` declare them. ⚠️ QUOTED FROM THE
# MIGRATION: the restore re-creates exactly this, not "something equivalent".
ORIGINAL_VARIANT_POLICY="create policy product_variant_select on public.product_variant
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));"
ORIGINAL_PRICE_POLICY="create policy price_list_select on public.price_list
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));"

variant_policy_restored=yes
price_policy_restored=yes
restore_variant_policy() {
  [[ "$variant_policy_restored" == yes ]] && return 0
  docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1 <<SQL
drop policy if exists product_variant_select on public.product_variant;
$ORIGINAL_VARIANT_POLICY
SQL
  variant_policy_restored=yes
  echo "        (product_variant_select restored to 0002's definition)"
}
restore_price_policy() {
  [[ "$price_policy_restored" == yes ]] && return 0
  docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1 <<SQL
drop policy if exists price_list_select on public.price_list;
$ORIGINAL_PRICE_POLICY
SQL
  price_policy_restored=yes
  echo "        (price_list_select restored to 0002's definition)"
}
restore_all() { restore_variant_policy; restore_price_policy; }

TMP="$(mktemp -d)"
trap 'restore_all; rm -rf "$TMP"' EXIT INT TERM

fixtures=0
bad=0

# Runs the check against a (possibly mutated) contract and matches its output.
# $1 label  $2 expectation: a grep -E pattern, or the word GREEN  $3 contract path
expect() {
  local label="$1" pattern="$2" contract="$3" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$contract" 2>&1)"; rc=$?
  if [[ "$pattern" == GREEN ]]; then
    if (( rc == 0 )) && grep -q 'all 12 assertion groups passed' <<< "$out"; then
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
expect H0 GREEN "$SOURCE"

echo
echo "— the contract, mutated —"

# ⚠️ H1 IS THE 400 THIS WHOLE FILE EXISTS FOR. A column renamed on either side
# of the wire compiles, bundles and passes 669 Vitest assertions.
expect H1 'came back as an error|42703' \
  "$(mutate H1 "s/^export const VARIANT_COLUMNS = .*/export const VARIANT_COLUMNS = 'id,name,family_id,precio,is_active';/")"

# ⚠️⚠️ H2 IS THE MONEY ONE, AND IT IS INVISIBLE TO EVERY OTHER INSTRUMENT. Drop
# the cast and PostgREST sends a JSON number; `JSON.parse` makes it a double,
# `parseDecimal` refuses a number, and every price on the screen becomes a dash
# — with the typecheck, the suite and the bundler all green.
expect H2 'the ::text cast is gone|price_per_base came back as' \
  "$(mutate H2 "s/^export const PRICE_COLUMNS = .*/export const PRICE_COLUMNS = 'price_per_base,location_id';/")"

# H3: the same, one table over. A factor read as a double multiplies into every
# price in the shop.
expect H3 'decimal string at scale 6|factor_to_base came back as' \
  "$(mutate H3 "s/^export const UNIT_COLUMNS = .*/export const UNIT_COLUMNS = 'code,dimension,factor_to_base,display_order';/")"

# ⚠️ H4: `!inner` on the price embed. Every variant the shop has not priced
# vanishes from Productos — C3.12's dash cannot be drawn on a row that is not
# there — and the list still looks perfectly correct.
expect H4 'DROPPED by the read|behaving like an inner join' \
  "$(mutate H4 's/product_family(\${FAMILY_COLUMNS}),\${PRICE_TABLE}(/product_family(${FAMILY_COLUMNS}),${PRICE_TABLE}!inner(/')"

# ⚠️ H5: `select=*`. C8.8 says no pilot screen may expose `enforce_stock`, and a
# star ships it to the phone along with cost-adjacent columns nobody drew.
expect H5 'C8.8|enforce_stock' \
  "$(mutate H5 "s/^export const VARIANT_COLUMNS = .*/export const VARIANT_COLUMNS = '*';/")"

# ⚠️⚠️ H6: THE WINDOW, WIDENED. This is the assertion with no second home —
# *"which price is today's"* lives in the query alone, so a window that lets an
# expired row through puts LAST YEAR'S PRICE on the shelf, and the app has
# nothing to compare it against.
expect H6 'the window let through' \
  "$(mutate H6 's/effective_to.gt.\${today}/effective_to.gt.1900-01-01/')"

# H7: the contract is unreadable — the vacuity guard at the top of the check.
expect H7 "could not read the catalog.s contract" \
  "$(mutate H7 's/^export const VARIANT_COLUMNS/const VARIANT_COLUMNS/')"

# ⚠️ H8: `location_id` dropped from the price read. A shop that prices one store
# differently gets whichever row PostgREST happened to return first, and
# `priceFor` has nothing to tell them apart by.
expect H8 'priceFor has nothing to choose from|a price row is missing' \
  "$(mutate H8 "s/^export const PRICE_COLUMNS = .*/export const PRICE_COLUMNS = 'price_per_base::text';/")"

echo
echo "— the database, narrowed —"

# ⚠️⚠️ H9 IS THE FIXTURE THAT GUARDS A DECISION RATHER THAN A STRING: Productos
# is shown to every member because the policy admits every member. Narrow it and
# the screen is EMPTY for the person who spends all day at the counter.
variant_policy_restored=no
docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1 <<'SQL'
drop policy if exists product_variant_select on public.product_variant;
create policy product_variant_select on public.product_variant
  for select to authenticated
  using (public.has_role(workspace_id, 'manager'));
SQL
expect H9 'a cashier read 0 of the three products|Productos .*screen' "$SOURCE"
restore_variant_policy
expect H9R GREEN "$SOURCE"

# ⚠️ H10 IS THE SUBTLER HALF. The cashier still reads every product; every one of
# them shows a dash. A screen full of dashes is not an error state anywhere in
# this app — C3.12 makes it an ordinary row — so nothing but this would notice.
price_policy_restored=no
docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1 <<'SQL'
drop policy if exists price_list_select on public.price_list;
create policy price_list_select on public.price_list
  for select to authenticated
  using (public.has_role(workspace_id, 'manager'));
SQL
expect H10 'a cashier read 0 priced rows|shelf price, not a cost' "$SOURCE"
restore_price_policy
expect H10R GREEN "$SOURCE"

echo
if (( bad > 0 )); then
  echo "$fixtures fixtures ran, $bad did not behave as recorded."
  exit 1
fi
# ⚠️ RULE 4 AGAIN, ONE LAYER OUT: a harness that ran no fixtures is also silent.
if (( fixtures < 13 )); then
  echo "FAIL: only $fixtures fixtures ran, expected 13."
  exit 1
fi
echo "all $fixtures fixtures behaved as recorded — the check still fails on a renamed"
echo "column, a dropped cast, an inner join, a star select, a widened window, an"
echo "unreadable contract, a missing scope, and on either policy being narrowed."

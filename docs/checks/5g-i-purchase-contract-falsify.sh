#!/usr/bin/env bash
# 5g-i-purchase-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `5g-i-purchase-contract.sh` prints "all 10
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what distinguishes the two: eleven fixtures —
# a control that must stay green, seven that break the CONTRACT, and three that
# break the DATABASE.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is
# red for the wrong reason is not a falsification, it is a coincidence* — the
# rule `5b-i-api-contract-falsify.sh` paid for on its first run.
#
# ⚠️⚠️ AND THREE FIXTURES MOVE APPLIED SQL, BECAUSE THE ASSERTION `5g` SPLIT OVER
# CANNOT BE FALSIFIED FROM THE CLIENT SIDE AT ALL. Comprar's whole design rests
# on a measured asymmetry — a cashier reads the provider list, reads ZERO rows of
# `provider_price_memory` (200, not 403), records a delivery that SUCCEEDS, and
# reads zero purchases back — and every one of those is a POLICY rather than a
# column. A policy that allows less breaks no test, and a policy that allows more
# breaks no test either: both just change what a screen silently shows.
#
#   * `P8`  narrows `provider_select` to manager-and-above — the cashier's
#           header picker goes empty and Comprar has no provider to buy from.
#   * `P9`  widens BOTH `purchase_select` and `purchase_line_select` to any
#           member — the view joins them and is `security_invoker`, so either
#           one alone leaves the join empty. The cashier's memory
#           stops being empty, `memoryState`'s `unreadable` branch becomes dead
#           code, and nothing else anywhere would notice.
#   * `P10` renames the seeded generic provider — the word `0039` settled. It
#           proves the check is really reading the NAME off the wire rather than
#           carrying its own copy of it.
#
# All three run the check, expect the named assertion to go red, and PUT THE
# DATABASE BACK. ⚠️ Each restore is in a `trap` and runs on every exit path,
# Ctrl-C included: a harness that leaves a narrowed policy behind makes the tree
# look broken rather than safe, which is the failure that gets a check deleted.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5g-i-purchase-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5g-i-purchase-contract.sh"
SOURCE="app/src/api/providers.ts"
[[ -r "$CHECK" && -r "$SOURCE" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE
# DIRECTORY — the coincidence `5b-ii-a`'s harness recorded. The owner's Mac has
# no `psql` of its own, so `docker exec` is the only way in.
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi

sql() { docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1; }

# ⚠️ QUOTED FROM THE MIGRATIONS: the restore re-creates exactly this, not
# "something equivalent". `0002:522` and `0003:564`.
ORIGINAL_PROVIDER_POLICY="create policy provider_select on public.provider
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));"
ORIGINAL_LINE_POLICY="create policy purchase_line_select on public.purchase_line
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations())
     and public.has_role(workspace_id, 'manager'));"
ORIGINAL_PURCHASE_POLICY="create policy purchase_select on public.purchase
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations())
     and public.has_role(workspace_id, 'manager'));"

provider_policy_restored=yes
line_policy_restored=yes
seed_restored=yes

restore_provider_policy() {
  [[ "$provider_policy_restored" == yes ]] && return 0
  sql <<SQL
drop policy if exists provider_select on public.provider;
$ORIGINAL_PROVIDER_POLICY
SQL
  provider_policy_restored=yes
  echo "        (provider_select restored to 0002's definition)"
}
restore_line_policy() {
  [[ "$line_policy_restored" == yes ]] && return 0
  sql <<SQL
drop policy if exists purchase_line_select on public.purchase_line;
$ORIGINAL_LINE_POLICY
drop policy if exists purchase_select on public.purchase;
$ORIGINAL_PURCHASE_POLICY
SQL
  line_policy_restored=yes
  echo "        (purchase_select and purchase_line_select restored to 0003's definitions)"
}
# ⚠️ P10 RENAMES THE SEED INSIDE AN APPLIED FUNCTION, so the restore is a
# `replace` of the literal rather than a re-create of the whole body: the
# function is 0034's and re-typing it here would be the second copy this
# repository refuses.
restore_seed() {
  [[ "$seed_restored" == yes ]] && return 0
  sql <<'SQL'
do $$
declare body text;
begin
  select pg_get_functiondef(p.oid) into body
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'onboard_workspace';
  execute replace(body, '''Genérico del falsificador''', '''Genérico''');
end $$;
SQL
  seed_restored=yes
  echo "        (onboard_workspace's generic provider name restored)"
}
restore_all() { restore_provider_policy; restore_line_policy; restore_seed; }

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
    if (( rc == 0 )) && grep -q 'all 10 assertion groups passed' <<< "$out"; then
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
expect P0 GREEN "$SOURCE"

echo
echo "— the contract, mutated —"

# ⚠️ P1 IS THE 400 THIS WHOLE FILE EXISTS FOR. A column renamed on either side
# of the wire compiles, bundles and passes every Vitest assertion.
expect P1 'came back as an error|42703|does not have' \
  "$(mutate P1 "s/^export const PROVIDER_COLUMNS = .*/export const PROVIDER_COLUMNS = 'id,nombre,is_generic,is_active';/")"

# ⚠️⚠️ P2 IS THE MONEY ONE, AND IT IS INVISIBLE TO EVERY OTHER INSTRUMENT. Drop
# the cast and PostgREST sends a JSON number; `JSON.parse` makes it a double,
# `parseDecimal` refuses a number, and every prefill on Comprar becomes blank —
# with the typecheck, the suite and the bundler all green.
expect P2 'without the ::text cast it is a double|came back as' \
  "$(mutate P2 "s|^  'provider_id,variant_id,unit_price_net_per_base::text,last_qty_display_unit';|  'provider_id,variant_id,unit_price_net_per_base,last_qty_display_unit';|")"

# ⚠️ P3: the denomination she typed last time is dropped. `0008` says "8.50
# means nothing without it", and the loss is silent — the figure still arrives.
expect P3 'the view does not have|came back as an error' \
  "$(mutate P3 "s|,last_qty_display_unit';|,last_qty_display_unitt';|")"

# ⚠️⚠️ P4 IS THE ONE §2.8 SAYS THE OPERATOR CANNOT CATCH FOR US: drop the
# provider filter and the read carries EVERY supplier's price to the phone. The
# app would still pick the right one today; the row that must never reach the
# screen would simply be sitting on it.
expect P4 'one delivery of one variant should remember exactly one pairing|crossed providers' \
  "$(mutate P4 "s/^export const MEMORY_PROVIDER_COLUMN = .*/export const MEMORY_PROVIDER_COLUMN = 'variant_id';/")"

# ⚠️ P5: the view is renamed. This is the read that has no other instrument at
# all — no migration test drives `provider_price_memory` from a client.
expect P5 'came back as an error|does not exist|42P01' \
  "$(mutate P5 "s/^export const MEMORY_TABLE = .*/export const MEMORY_TABLE = 'provider_price_cache';/")"

# ⚠️⚠️ P6: THE DIRECTORY COLUMNS RIDE ALONG — C8.8's argument applied to the
# provider table, and THIS FIXTURE CAUGHT A HOLE IN THE CHECK ON ITS FIRST RUN
# AND IS WORTH KEEPING FOR THAT. The check's first version compared the response
# to the columns the app had ASKED for, so a contract that asked for `phone` was
# consistent with itself and green: it was measuring the wrong thing. It now
# carries a BANNED list and reads it off the wire, which is what `5d-i`'s
# `enforce_stock` assertion does one table over.
expect P6 'reached the phone' \
  "$(mutate P6 "s/^export const PROVIDER_COLUMNS = .*/export const PROVIDER_COLUMNS = 'id,name,is_generic,is_active,phone,address_line1';/")"

# ⚠️ P7: the order column is renamed. The app re-sorts nothing, so the database's
# order IS what a shopkeeper scrolls through.
expect P7 'came back as an error|42703|failed to parse' \
  "$(mutate P7 "s/^export const PROVIDER_ORDER_COLUMN = .*/export const PROVIDER_ORDER_COLUMN = 'nombre';/")"

echo
echo "— the database, mutated —"

# ⚠️⚠️ P8 — THE CASHIER LOSES THE PROVIDER LIST. Comprar's header has nothing to
# choose from, `record_purchase` refuses every delivery for want of a
# counterparty, and no column anywhere changed.
provider_policy_restored=no
sql <<'SQL'
drop policy if exists provider_select on public.provider;
create policy provider_select on public.provider
  for select to authenticated
  using (public.has_role(workspace_id, 'manager'));
SQL
expect P8 'cashier asymmetry has changed|providers  200 / 0' "$SOURCE"
restore_provider_policy

# ⚠️⚠️ P9 IS THE SUBTLER HALF AND IT IS THE ONE `5g` SPLIT OVER. Widen the fence
# and the cashier's memory STOPS being empty — which is an improvement nobody
# asked for, makes `memoryState`'s `unreadable` branch dead code, and puts every
# supplier's cost in front of the person at the counter. A policy that allows
# more breaks no test anywhere else in this repository.
#
# ⚠️⚠️ AND IT TAKES BOTH POLICIES, WHICH THIS FIXTURE LEARNED ON ITS FIRST RUN
# AND IS WORTH KEEPING: `provider_price_memory` JOINS `purchase_line` to
# `purchase`, and the view is `security_invoker`, so BOTH tables apply their own
# policy to the caller. Widening `purchase_line_select` alone leaves the join
# empty and the fixture green — a falsification that proved nothing and looked
# like one that did. **The memory is fenced twice, and that is now measured.**
line_policy_restored=no
sql <<'SQL'
drop policy if exists purchase_line_select on public.purchase_line;
create policy purchase_line_select on public.purchase_line
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));
drop policy if exists purchase_select on public.purchase;
create policy purchase_select on public.purchase
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));
SQL
expect P9 'cashier asymmetry has changed|memory     200 / [1-9]' "$SOURCE"
restore_line_policy

# ⚠️⚠️ P10 — THE NAME. It was the owner's open question when this fixture was
# written and it was ruled the same day (`0039`): the generic provider is
# `Genérico`, because the row is the ABSENCE of a counterparty. The check reads
# that name OFF THE WIRE, so a later `create or replace` of `onboard_workspace`
# that dropped the literal cannot land quietly — which is why the assertion
# survived the ruling instead of being deleted with it.
seed_restored=no
sql <<'SQL'
do $$
declare body text;
begin
  select pg_get_functiondef(p.oid) into body
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'onboard_workspace';
  execute replace(body, '''Genérico''', '''Genérico del falsificador''');
end $$;
SQL
expect P10 'the generic provider is now called' "$SOURCE"
restore_seed

echo
if (( bad > 0 )); then
  echo "$fixtures fixtures ran, $bad behaved wrongly — the check is not trustworthy yet."
  exit 1
fi
# ⚠️ THE ANTI-VACUITY GUARD, one layer up: a harness that ran no fixtures also
# prints no failures.
if (( fixtures < 11 )); then
  echo "FAIL: only $fixtures fixtures ran, expected 11."
  exit 1
fi
echo "all $fixtures fixtures behaved — the control is green, seven contract mutations and"
echo "three database mutations are red, and each is red for the reason it is named for."

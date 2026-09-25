#!/usr/bin/env bash
# 5g-iii-costs-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `5g-iii-costs-contract.sh` prints "11 assertion
# groups held against a real PostgREST", and that sentence is ALSO what a check
# which stopped reading anything prints. This is what distinguishes the two: TEN
# fixtures — two controls that must stay green (one at each end), seven that break
# the CONTRACT, and one that breaks the DATABASE.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is red
# for the wrong reason is not a falsification, it is a coincidence* — the rule
# `5b-i-api-contract-falsify.sh` paid for on its first run.
#
# ⚠️⚠️ AND THIS HARNESS PAID FOR ITSELF ON ITS OWN FIRST RUN, THREE TIMES OVER. It
# is worth recording because all three findings were in the CHECK rather than in
# the app:
#
#   * **`F5` WENT GREEN.** Sorting by the LINE's `created_at` instead of the
#     document's instant — `0010`'s own confusion — was undetectable, because the
#     live check recorded its five deliveries in chronological order, so the two
#     sort keys agreed. **The check's fixture data now disagrees with itself on
#     purpose**, which is also the faithful case: an outbox flushes in whatever
#     order it holds.
#   * **`F3` WAS RED FOR THE WRONG REASON.** It went red at *the read answers 200*,
#     because `purchase_line` has no `occurred_at` of its own — true, and nothing to
#     do with the order. The live check now asserts the SHAPE of `COSTS_ORDER`
#     before it builds a URL, so the trap is named where a person reads it.
#   * **`F4` WAS VACUOUS AND IS DELETED.** See its former place below.
#
# ⚠️⚠️ `F3` AND `F5b` ARE THE TWO THIS WHOLE FILE EXISTS FOR, and they are the two
# halves of one trap. `F3` is the `{ referencedTable }` spelling — which
# `postgrest-js` puts under the query key `purchase.order`, a silent no-op on a
# to-one embed, 200 and typechecked. `F5b` keeps the parent-sorting shape and points
# it at the WRITE moment instead of the trading moment. **If either ever goes green,
# the live check has stopped measuring what it was written for.**
#
# Run:  supabase start && supabase db reset && bash docs/checks/5g-iii-costs-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5g-iii-costs-contract.sh"
SOURCE="app/src/api/costs.ts"
[[ -r "$CHECK" && -r "$SOURCE" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE DIRECTORY
# — the coincidence `5b-ii-a`'s harness recorded. There is no `psql` on the
# owner's Mac, so `docker exec` is the only way in.
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi
sql() { docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1; }
ask() { docker exec -i "$DB_CONTAINER" psql -U postgres -At -c "$1" 2>/dev/null | tr -d '\r'; }

# ----------------------------------------------------------------------------
# ⚠️⚠️ THE RESTORE IS READ OUT OF THE APPLIED CATALOG AND NEVER REMEMBERED
# ----------------------------------------------------------------------------
# `5g-i`'s harness learned this the expensive way on the day `0040` shipped: a
# harness carrying its own copy of a policy does not fail when the policy moves —
# **it QUIETLY PUTS THE OLD ONE BACK.** `pg_policies` carries the command, the
# roles and the predicate, which is everything a `create policy` needs, so a
# policy this file has never heard of restores correctly by construction.
policy_def() { # table policy -> a create-policy statement
  ask "select format('create policy %I on public.%I for select to %s using (%s);',
                     policyname, tablename, array_to_string(roles, ', '), qual)
         from pg_policies
        where schemaname = 'public' and tablename = '$1' and policyname = '$2';"
}

ORIGINAL_PURCHASE_POLICY="$(policy_def purchase purchase_select)"
ORIGINAL_LINE_POLICY="$(policy_def purchase_line purchase_line_select)"

for pair in "purchase_select:$ORIGINAL_PURCHASE_POLICY" \
            "purchase_line_select:$ORIGINAL_LINE_POLICY"; do
  name="${pair%%:*}"; def="${pair#*:}"
  case "$def" in
    "create policy $name on public."*"using ("*) ;;
    *) echo "FAIL: could not read $name out of pg_policies, so the one database fixture"
       echo "      below could not be put back. Refusing to mutate a policy this harness"
       echo "      cannot restore — an empty restore is a \`drop policy\` with no"
       echo "      \`create\` after it, which reads as a total outage."
       echo "      got: ${def:-<empty>}"
       exit 1 ;;
  esac
done

policies_restored=yes
restore_policies() {
  [[ "$policies_restored" == yes ]] && return 0
  sql <<SQL
drop policy if exists purchase_select on public.purchase;
$ORIGINAL_PURCHASE_POLICY
drop policy if exists purchase_line_select on public.purchase_line;
$ORIGINAL_LINE_POLICY
SQL
  policies_restored=yes
  echo "        (purchase_select and purchase_line_select restored from the applied catalog)"
}

TMP="$(mktemp -d)"
# ⚠️ THE RESTORE IS IN A `trap` AND RUNS ON EVERY EXIT PATH, Ctrl-C included: a
# harness that leaves a narrowed policy behind makes the tree look broken rather
# than safe, which is the failure that gets a check deleted.
trap 'restore_policies; rm -rf "$TMP"' EXIT INT TERM

fixtures=0
bad=0

# $1 label  $2 expectation: a grep -E pattern, or the word GREEN  $3 contract path
expect() {
  local label="$1" pattern="$2" contract="$3" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$contract" 2>&1)"; rc=$?
  if [[ "$pattern" == GREEN ]]; then
    if (( rc == 0 )) && grep -q 'assertion groups held' <<< "$out"; then
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
    sed 's/^/        /' <<< "$out" | grep -E '^FAIL|^ {6}' | tail -8
    bad=$((bad+1))
  fi
}

# ⚠️ THE COPY IS DIFFED AGAINST THE ORIGINAL AFTERWARDS: "the fixture edited
# nothing" is the anti-vacuity failure one layer in, and it is how three fixtures
# in this repository were found to have been silently dead.
mutate() { # label sed-expression -> path
  local label="$1" expr="$2" path="$TMP/$1.ts"
  sed "$expr" "$SOURCE" > "$path"
  if cmp -s "$path" "$SOURCE"; then
    echo "FAIL: fixture $label edited nothing — it proves nothing about the check."
    bad=$((bad+1))
  fi
  echo "$path"
}

echo "== the control =="
expect "F0  the contract as shipped" GREEN "$SOURCE"

echo
echo "== the contract, broken seven ways =="

# F1 — the cast. Without `::text` the price arrives as a JSON double and
# `parseDecimal` refuses a number argument outright (`R5`). ⚠️ This is the
# assertion no string-matching check could make: the check has to look at the
# TYPE that came off the wire.
expect "F1  the ::text cast dropped from the price" \
  'arrived as (float|int) .* the ::text cast is gone' \
  "$(mutate F1 's/unit_price_net_per_base::text/unit_price_net_per_base/')"

# F2 — a column nobody draws. C8.8 and `R13`: a column the app never asks for is a
# column that never reaches a phone. ⚠️ `tax_rate` is the sharpest one to add,
# because it is the column that would let somebody quietly start showing GROSS
# purchase prices here while Comprar keeps prefilling NET.
expect "F2  tax_rate added to the column list" \
  'the line carried .*tax_rate' \
  "$(mutate F2 "s/'unit_price_net_per_base::text,/'unit_price_net_per_base::text,tax_rate::text,/")"

# ⚠️⚠️ F3 — THE FIXTURE THIS FILE EXISTS FOR. `postgrest-js` emits
# `purchase.order=occurred_at.desc` for `{ referencedTable: 'purchase' }`, which
# sorts the embedded row INSIDE each parent — a no-op on a to-one embed. PostgREST
# answers 200, TypeScript is happy, and `app/test/api-costs.test.ts` can only read
# the string. **Only a live read can catch this**, and the symptom is a chart whose
# points are in planner order.
# ⚠️ IT EXPECTS THE *SHAPE* MESSAGE AND NOT THE ORDER ONE, WHICH IS A CORRECTION THE
# FIRST RUN OF THIS HARNESS FORCED. The mutation makes the check red either way —
# `purchase_line` has no `occurred_at`, so the read 400s — but red at *the read
# answers 200* proves nothing about the order. The check now names the trap up
# front, before it ever builds a URL.
expect "F3  the order swapped to the {referencedTable} spelling" \
  'a bare column rather than a' \
  "$(mutate F3 "s|^export const COSTS_ORDER = 'purchase(occurred_at)';|export const COSTS_ORDER = 'occurred_at';|")"

# ⚠️⚠️ F4 WAS *THE DIRECTION REVERSED*, AND IT IS DELETED BECAUSE IT WAS VACUOUS —
# WHICH IS ITSELF THE FINDING. The live check reads `COSTS_ORDER_ASCENDING` out of
# the app and then compares the response against that same value, so a contract
# that flipped to ascending asks for ascending, gets ascending, and is
# self-consistently GREEN. **There is no second source for *which way round* on the
# wire.** The fixture was written, observed to be red for an unrelated reason, and
# removed rather than left in place looking like cover.
# ⚠️ IT IS PINNED WHERE A SECOND SOURCE EXISTS: `app/test/api-costs.test.ts` asserts
# both that `COSTS_ORDER_ASCENDING` is `false` and that `costsFrom` hands the screen
# its points OLDEST FIRST — the round trip a flip would break, since `costsFrom`
# reverses exactly once. The live check's header now says so out loud.

# F5 — the line's own write time as the sort key. ⚠️ THE MOST PLAUSIBLE WRONG
# ANSWER IN THIS WHOLE FILE, and the one `0010` exists because of:
# `purchase_line.created_at` is the moment the row was WRITTEN, which
# `recorded_offline` makes differ from the trading moment by up to 72 hours. A
# chart sorted by it puts an offline batch in the order it synced.
# ⚠️⚠️ THIS FIXTURE WENT GREEN ON THE FIRST RUN OF THIS HARNESS AND THAT IS WHY THE
# LIVE CHECK'S FIXTURE DATA CHANGED. It used to record five deliveries dated 60h,
# 40h, 30h, 10h and 2h ago **in that order**, so `created_at` ascended exactly as
# `occurred_at` did and the two sort keys were indistinguishable — the check was
# green on the one confusion `0010` exists because of. The deliveries are now
# written out of chronological order, which is also the faithful case: the outbox
# flushes what it holds when the signal returns, and nothing makes that order
# chronological.
expect "F5  sorted by the LINE's created_at instead of the document's instant" \
  'a bare column rather than a' \
  "$(mutate F5 "s|^export const COSTS_ORDER = 'purchase(occurred_at)';|export const COSTS_ORDER = 'created_at';|")"

# F5b — the same confusion, but keeping the parent-sorting SHAPE, so it gets past
# the shape gate and has to be caught by the ORDER itself. ⚠️ THIS IS THE FIXTURE
# F5 WAS SUPPOSED TO BE: `purchase(created_at)` is a real column on a real embedded
# table, PostgREST sorts by it happily, and the only thing wrong with it is that it
# is the WRITE moment rather than the trading moment.
# ⚠️⚠️ IT SORTS BY THE DOCUMENT'S `id`, NOT BY ITS `recorded_at`, AND THE REASON IS A
# FACT THIS FIXTURE DISCOVERED: **ordering a parent by an embedded column requires
# that column to be IN the embed's select list.** `purchase(recorded_at)` answers
# `42703 column purchase_line_purchase_1.recorded_at does not exist` even though
# `recorded_at` is right there on the table — so that mutation went red at *the read
# answers 200* and proved nothing about the order. `id` IS selected, is a `uuid`, and
# sorts in an order with no relation to time at all: **a perfectly valid parent sort
# that is completely wrong**, which is exactly the fixture this slot needs.
expect "F5b sorted by the document's id — a valid parent sort that is not time" \
  'not sorting the PARENT by the embedded column' \
  "$(mutate F5b "s|^export const COSTS_ORDER = 'purchase(occurred_at)';|export const COSTS_ORDER = 'purchase(id)';|")"

# F6 — `reversal_of` dropped. ⚠️ The void rule's own input: without this column
# `costsFrom` cannot tell a delivery that stands from one that was undone, and it
# would plot both at a positive price.
expect "F6  reversal_of dropped from the embed" \
  'the document carried' \
  "$(mutate F6 's/,reversal_of)/)/')"

# F7 — the wrong table. ⚠️ It reads as a silly fixture and it is not: `sale_line`
# has an almost identical shape, and a copy-paste from `@/api/today` would compile,
# typecheck, return 200 and draw a chart of what the shop SOLD labelled as what it
# PAID.
expect "F7  the read pointed at sale_line" \
  'answered 40[0-9]|the costs read|five deliveries of this variant were recorded' \
  "$(mutate F7 "s/^export const COSTS_TABLE = 'purchase_line';/export const COSTS_TABLE = 'sale_line';/")"

echo
echo "== the database, broken one way =="

# ⚠️⚠️ P1 — THE FENCE PUT BACK. `0040` dropped the manager clause from
# `purchase_select` and `purchase_line_select` on the owner's ruling of 2026-09-25;
# before it, an Empleada read ZERO deliveries — 200 and an empty array, never a
# 403 — so `Costos` would have drawn her an empty chart in a state
# indistinguishable from a product nobody has ever bought.
#
# ⚠️ IT CANNOT BE FALSIFIED FROM THE CLIENT SIDE AT ALL, which is the same argument
# `5g-i`'s `P8`/`P9` make: a policy that allows less breaks no test and a policy
# that allows more breaks no test either. Both just change what a screen silently
# shows.
policies_restored=no
sql <<'SQL'
drop policy if exists purchase_select on public.purchase;
create policy purchase_select on public.purchase for select to authenticated
  using (workspace_id in (select public.my_workspaces())
         and location_id in (select public.my_locations())
         and public.has_role(workspace_id, 'manager'));
drop policy if exists purchase_line_select on public.purchase_line;
create policy purchase_line_select on public.purchase_line for select to authenticated
  using (workspace_id in (select public.my_workspaces())
         and location_id in (select public.my_locations())
         and public.has_role(workspace_id, 'manager'));
SQL
expect "P1  the manager fence 0040 removed, put back" \
  'an Empleada read ZERO deliveries' "$SOURCE"
restore_policies

echo
# ⚠️ AND THE CONTROL IS RUN AGAIN AT THE END, which is not belt-and-braces: it is
# the only thing that proves the restore above actually worked. A harness whose
# last act leaves a narrowed policy in place would make every later check on this
# machine red for a reason nobody could find.
echo "== the control, again, to prove the restore took =="
expect "F8  the contract as shipped, after every fixture" GREEN "$SOURCE"

echo
if (( bad == 0 )); then
  echo "PASS — all $fixtures fixtures behaved: the check goes red for each stated reason"
  echo "       and green on a clean tree, before and after."
  exit 0
fi
echo "FAIL — $bad of $fixtures fixtures did not behave."
exit 1

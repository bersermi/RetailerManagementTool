#!/usr/bin/env bash
# 5h-ii-a-documents-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `5h-ii-a-documents-contract.sh` prints "all 16
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what distinguishes the two: TEN fixtures — one
# control that must stay green, eight that break the CONTRACT, and one that breaks
# the DATABASE.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is red
# for the wrong reason is not a falsification, it is a coincidence* — the rule
# `5b-i-api-contract-falsify.sh` paid for on its first run, and `5f.5`'s harness
# paid for again when its `F1` died on a string assertion instead of on the wire.
#
# ⚠️⚠️ AND THE LIVE CHECK HAD ALREADY PAID FOR ITSELF THREE TIMES BEFORE THIS FILE
# EXISTED — twice in its own harness and once in a claim the plan would have carried:
#
#   * **`record_sale` TAKES `unit_price_gross_per_base`.** The first fixture reused
#     `record_purchase`'s NET spelling and answered 400 / `22023`. A sale is keyed at
#     the shelf price, and `0016:59` says so.
#   * **`0018:222` CLAMPS `occurred_at` TO SEVENTY-TWO HOURS.** The first draft wrote
#     a delivery *nine days old* to drive the window and it landed at three days —
#     inside a seven-day window, with a 200 and no complaint. **Nothing this app
#     writes is ever outside `DOCUMENTS_DAYS` on the day it is written**, so the
#     window is falsified with a NARROW read instead. `F8` is the fixture that keeps
#     that honest.
#   * **`0021:316` STAMPS A REVERSAL AT THE MOMENT OF THE VOID**, not at the moment
#     of the document it cancels — so the newest `purchase` in the shop is the void
#     written seconds ago. The check asserted the 2-hour delivery and went red on
#     correct behaviour. ⚠️ That is also the property `takingsFrom` leans on: a sale
#     voided the next day takes the money off tomorrow.
#
# ⚠️⚠️ `F1` AND `F5` ARE THE TWO THIS FILE EXISTS FOR. `F1` drops the `::text` cast
# from a quantity INSIDE a to-many embed — the claim no string-matching check can
# make, and the one whose failure is nearly invisible: `3.000` becomes the number `3`
# and the screen looks right. `F5` makes the line order a bare column, which is the
# edit a reader who has just learned `COSTS_ORDER`'s lesson would make — and it is
# the WRONG lesson here, because this embed is to-MANY. **If either goes green, the
# live check has stopped measuring what it was written for.**
#
# Run:  supabase start && supabase db reset && bash docs/checks/5h-ii-a-documents-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5h-ii-a-documents-contract.sh"
SOURCE="app/src/api/documents.ts"
[[ -r "$CHECK" && -r "$SOURCE" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE DIRECTORY
# — the coincidence `5b-ii-a`'s harness recorded. There is no `psql` on the owner's
# Mac, so `docker exec` is the only way in ([[no-psql-on-this-machine]]).
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi
sql() { docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1; }
ask() { docker exec -i "$DB_CONTAINER" psql -U postgres -At -c "$1" 2>/dev/null | tr -d '\r'; }

# ⚠️⚠️ THE RESTORE IS READ OUT OF THE APPLIED CATALOG AND NEVER REMEMBERED —
# `5g-i`'s harness learned this the expensive way on the day `0040` shipped: a
# harness carrying its own copy of a policy does not fail when the policy moves,
# **it quietly puts the old one back.**
policy_def() { # table policy -> a create-policy statement
  ask "select format('create policy %I on public.%I for select to %s using (%s);',
                     policyname, tablename, array_to_string(roles, ', '), qual)
         from pg_policies
        where schemaname = 'public' and tablename = '$1' and policyname = '$2';"
}

ORIGINAL_LINE_POLICY="$(policy_def purchase_line purchase_line_select)"
case "$ORIGINAL_LINE_POLICY" in
  "create policy purchase_line_select on public."*"using ("*) ;;
  *) echo "FAIL: could not read purchase_line_select out of pg_policies, so the one"
     echo "      database fixture below could not be put back. Refusing to mutate a"
     echo "      policy this harness cannot restore — an empty restore is a \`drop"
     echo "      policy\` with no \`create\` after it, which reads as a total outage."
     echo "      got: ${ORIGINAL_LINE_POLICY:-<empty>}"
     exit 1 ;;
esac

policies_restored=yes
restore_policies() {
  [[ "$policies_restored" == yes ]] && return 0
  sql <<SQL
drop policy if exists purchase_line_select on public.purchase_line;
$ORIGINAL_LINE_POLICY
SQL
  policies_restored=yes
  echo "        (purchase_line_select restored from the applied catalog)"
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
    if (( rc == 0 )) && grep -q 'assertion groups passed' <<< "$out"; then
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
echo "== the contract, broken eight ways =="

# ⚠️⚠️ F1 — THE FIXTURE THIS FILE EXISTS FOR, AND THE ONE WHOSE REAL FAILURE IS
# NEARLY INVISIBLE. Nothing in this app had read a cast column out of a NESTED
# ARRAY before this module. Without `::text` PostgREST sends the quantity as a JSON
# number: `3.000` becomes `3`, `trimmed` sees no dot, and the screen reads `3 kg`
# — which is RIGHT for a whole number and silently wrong for `1.500`, where the
# double arrives as `1.5` and `parseDecimal` is never even reached.
expect "F1  the ::text cast dropped from qty_display, inside the embed" \
  'qty_display arrived as (float|int) .* INSIDE THE EMBED' \
  "$(mutate F1 's/qty_display::text/qty_display/')"

# F2 — the same cast on a line's money. `parseDecimal` refuses a number argument
# outright, so every line on this screen would read *Sin dato* — visible, unlike F1,
# and asserted because a check that only catches the visible half is half a check.
expect "F2  the ::text cast dropped from line_net" \
  'line_net arrived as (float|int) .* INSIDE THE EMBED' \
  "$(mutate F2 's/line_net::text/line_net/')"

# F3 — and on the DOCUMENT's own total, which is the field `SALE_COLUMNS` already
# carries. A contract nobody re-reads is a contract that drifts.
expect "F3  the ::text cast dropped from total_net" \
  'total_net arrived as (float|int)' \
  "$(mutate F3 's/total_net::text/total_net/')"

# ⚠️⚠️ F4 — THE SPELLING TRAP, IN THE DIRECTION `COSTS_ORDER` WARNS ABOUT. A reader
# who has just learned that constant's lesson would "fix" the document order into a
# `table(column)` expression — and here that is a 400, because this read STARTS at
# the document and `occurred_at` is its own column.
expect "F4  the document order spelled as a table(column) expression" \
  'a table\(column\) expression' \
  "$(mutate F4 "s/^export const DOCUMENTS_ORDER = 'occurred_at';/export const DOCUMENTS_ORDER = 'purchase(occurred_at)';/")"

# ⚠️⚠️ F5 — AND THE SAME TRAP IN THE OTHER DIRECTION, WHICH IS THE ONE THAT MATTERS.
# The LINE order reaches THROUGH an embed: `purchase_line` has no name of its own, so
# a bare column is 400/42703 — and there is nothing else to order by, because no
# ordinal column exists and `created_at` is identical across every line of one
# document. Without an order the lines come back in heap order and reshuffle on a
# re-plan, with nothing going red.
expect "F5  the line order spelled as a bare column" \
  'a bare column' \
  "$(mutate F5 "s/^export const DOCUMENTS_LINE_ORDER = 'product_variant(name)';/export const DOCUMENTS_LINE_ORDER = 'variant_id';/")"

# ⚠️⚠️ F6 — THE `5f.5` LESSON, ARRIVING FROM THE OTHER SIDE. PostgREST will only order
# by an embedded column that is in that embed's select list, and `product_variant(name)`
# is BOTH the sort key and the word a shopkeeper reads. A tidying pass that decided the
# client could name products from the catalog it already holds would 400 this screen.
expect "F6  product_variant removed from the line's columns" \
  'answered 400' \
  "$(mutate F6 's/,product_variant(name)//')"

# F7 — a column nobody reads. C8.8 and `R13`.
#
# ⚠️⚠️ THIS FIXTURE USED TO ADD `created_by` AND `5h-ii-b` ADDED IT FOR REAL, so the
# mutation moved to `recorded_offline` rather than being deleted. **It is the sharper
# of the two now**: `created_by` is read to hide a button and never rendered, while
# `recorded_offline` and `recorded_at` are what a client would need to draw the WINDOW
# half of `0021`'s fence — a second answer to *may she void this*, and the one this
# app must never hold. A tidying pass that "completes" the column list lands here.
expect "F7  recorded_offline added to the document's columns" \
  '(recorded_offline|reached the phone)' \
  "$(mutate F7 "s/,created_by';/,created_by,recorded_offline';/")"

# ⚠️⚠️ F8 — THE LIMIT, AND IT IS WHAT KEEPS THE NUMBER ON THE WIRE THE MODULE'S
# RATHER THAN THE CHECK'S. Narrowed to one, the read comes back with the reversal
# alone and the order assertion has no second row to check — which is exactly what
# `DOCUMENTS_LIMIT` cutting the wrong end of the list would look like.
expect "F8  the limit narrowed to one" \
  'returned None second' \
  "$(mutate F8 's/^export const DOCUMENTS_LIMIT = 60;/export const DOCUMENTS_LIMIT = 1;/')"

echo
echo "== the database, broken once =="

# ⚠️⚠️ F9 — `0040` PUT BACK. Until 2026-09-25 `purchase_line_select` carried
# `has_role(…, 'manager')`, so an Empleada's read was **200 and an EMPTY ARRAY** —
# never a 403. On this screen that is every delivery present and every one of them
# apparently empty, which reads as data loss rather than as a fence. **The one
# person who keys the deliveries is the one who needs this list.**
sql <<SQL
drop policy if exists purchase_line_select on public.purchase_line;
create policy purchase_line_select on public.purchase_line
  for select to authenticated
  using (
    workspace_id in (select public.my_workspaces())
    and location_id in (select public.my_locations())
    and public.has_role(workspace_id, 'manager')
  );
SQL
policies_restored=no
expect "F9  0040 reverted — the manager gate back on purchase_line_select" \
  'delivery with no lines|read [0-9]+ of the' \
  "$SOURCE"
restore_policies

echo
if [[ "$bad" -eq 0 ]]; then
  echo "all $fixtures fixtures behaved — 5h-ii-a-documents-contract.sh is still"
  echo "measuring the wire, the two orders, the window and both fences."
  exit 0
fi
echo "$bad of $fixtures fixtures did NOT behave."
exit 1

#!/usr/bin/env bash
# 7b-prices-contract-falsify — can `docs/checks/7b-prices-contract.sh` still fail?
#
# ⚠️ EACH FIXTURE IS A COPY OF `app/src/api/prices.ts` WITH ONE CONSTANT BROKEN,
# AND THE DATABASE IS NEVER TOUCHED — the one-sided mutation
# [[falsifier-must-not-mutate-what-the-check-reads]] asks for. And each asserts
# the REASON, not only the exit code ([[tab-delimiter-collapses-empty-fields]]).
#
#   F1  the sale side read NET                → no longer ask for both
#   F2  a price without its ::text cast       → not a string
#   F3  a page at or above max_rows           → IS NOT BELOW max_rows
#   F4  filtered on line_count, not quantity  → A DAY HOLDING ONLY A REVERSAL
#   F5  the day's AVERAGE, not the last typed → NOT THE LAST ONE TYPED
#   F6  the wrong view                        → THE READS ANSWERED
#
# ⚠️ WHAT NO FIXTURE HERE BREAKS: the order's direction and the `gt` operator,
# which live in `@/api/calls` where no script can load them. The check spells the
# read the way `calls.ts` does; `app/test/api-prices.test.ts` pins the constants.
#
# Run:  supabase start && supabase db reset && bash docs/checks/7b-prices-contract-falsify.sh
# Exit: 0 when the clean contract passes and every fixture fails for its reason.

set -uo pipefail

CHECK="docs/checks/7b-prices-contract.sh"
SOURCE="app/src/api/prices.ts"
[[ -r "$CHECK" && -r "$SOURCE" ]] || { echo "FAIL: run from the repository root"; exit 1; }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# --- the clean contract passes first — or every red below means nothing ------
if bash "$CHECK" "$SOURCE" > "$SCRATCH/clean.log" 2>&1; then
  ok "the clean contract passes"
else
  echo "FAIL: the check is red on the clean contract — fix that before reading fixtures"
  tail -20 "$SCRATCH/clean.log"
  exit 1
fi

fixture() { # id reason sed-expression description
  local id="$1" reason="$2" expr="$3" what="$4" copy="$SCRATCH/$1.ts"
  sed "$expr" "$SOURCE" > "$copy"
  if cmp -s "$SOURCE" "$copy"; then
    fail "$id: the mutation did not change the file — the fixture is testing nothing ($what)"
    return
  fi
  if bash "$CHECK" "$copy" > "$SCRATCH/$id.log" 2>&1; then
    fail "$id: THE CHECK STAYED GREEN — $what"
  elif grep -q "$reason" "$SCRATCH/$id.log"; then
    ok "$id: red for its reason — $what"
  else
    fail "$id: red, but not for '$reason' — $what"
    tail -8 "$SCRATCH/$id.log" | sed 's/^/        /'
  fi
}

fixture F1 'no longer ask for both' \
  "s/price:sale_price_last_gross::text/price:sale_price_last_net::text/" \
  "the sale line read without IVA — against the forty-first ruling"
fixture F2 'not a string' \
  "s/price:purchase_price_last_gross::text/price:purchase_price_last_gross/" \
  "a price without its ::text cast arrives as a JSON number"
fixture F3 'IS NOT BELOW max_rows' \
  "s/^export const PRICE_PAGE = [0-9]*;/export const PRICE_PAGE = 1500;/" \
  "a page above the cap makes every page short and the read stop after one"
fixture F4 'A DAY HOLDING ONLY A REVERSAL' \
  "s/^export const PURCHASE_PRICE_TRADED_COLUMN = '[a-z_]*';/export const PURCHASE_PRICE_TRADED_COLUMN = 'purchase_line_count';/" \
  "line_count keeps a day whose only line is a reversal"
fixture F5 'NOT THE LAST ONE TYPED' \
  "s/price:sale_price_last_gross::text/price:sale_price_gross::text/" \
  "the effective price is the day's average, and a card compares states"
fixture F6 'THE READS ANSWERED' \
  "s/^export const SALE_PRICE_VIEW = '[a-z_]*';/export const SALE_PRICE_VIEW = 'product_purchases_daily';/" \
  "the purchases view has no sale price — a 400 on every phone"

echo
if (( fails > 0 )); then
  echo "$fails fixture(s) did not fail as they should — the prices check can no longer see"
  echo "what it claims to."
  exit 1
fi
echo "all six fixtures failed for their own reasons — the prices check can still fail."

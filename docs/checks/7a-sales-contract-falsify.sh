#!/usr/bin/env bash
# 7a-sales-contract-falsify — can `docs/checks/7a-sales-contract.sh` still fail?
#
# ⚠️ EACH FIXTURE IS A COPY OF `app/src/api/sales.ts` WITH ONE CONSTANT BROKEN,
# AND THE DATABASE IS NEVER TOUCHED. That is the one-sided mutation
# [[falsifier-must-not-mutate-what-the-check-reads]] asks for: the check compares
# the app's constants against a real PostgREST, so breaking the app's side moves
# exactly one half of the comparison. Mutating the view instead would move both.
#
# ⚠️ AND EACH FIXTURE ASSERTS THE REASON, NOT ONLY THE EXIT CODE
# ([[tab-delimiter-collapses-empty-fields]]): a check that went red because GoTrue
# throttled a signup is not a check that caught the defect.
#
#   F1  the headline read as NET          → SALES_COLUMNS no longer asks for revenue_gross
#   F2  a figure without its ::text cast  → not a string
#   F3  a page at or above max_rows      → IS NOT BELOW max_rows
#   F4  the wrong view                    → THE READ ANSWERED
#
# ⚠️ WHAT NO FIXTURE HERE BREAKS, AND WHY: the spine filter. The operator (`gt.0`)
# lives in `@/api/calls`, which no script can load, and every other column in the
# view either excludes the unsold product too or is not comparable to zero — so a
# constant-only mutation cannot make the spine leak. The check covers that half by
# asserting the unfiltered read DOES carry the unsold product, which is what makes
# its *filtered out* verdict mean something.
#
# Run:  supabase start && supabase db reset && bash docs/checks/7a-sales-contract-falsify.sh
# Exit: 0 when the clean contract passes and every fixture fails for its reason.

set -uo pipefail

CHECK="docs/checks/7a-sales-contract.sh"
SOURCE="app/src/api/sales.ts"
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

fixture F1 'no longer asks for revenue_gross' \
  "s/revenue_gross::text/revenue_net::text/" \
  "the headline read as net — 16% short on a taxed product"
fixture F2 'not a string' \
  "s/qty_base_sold::text/qty_base_sold/" \
  "a quantity without its ::text cast arrives as a JSON number"
fixture F3 'IS NOT BELOW max_rows' \
  "s/^export const SALES_PAGE = [0-9]*;/export const SALES_PAGE = 1500;/" \
  "a page above the cap makes every page short and the read stop after one"
fixture F4 'THE READ ANSWERED' \
  "s/^export const SALES_VIEW = '[a-z_]*';/export const SALES_VIEW = 'product_purchases_daily';/" \
  "the purchases view has no revenue_gross — a 400 on every phone"

echo
if (( fails > 0 )); then
  echo "$fails fixture(s) did not fail as they should — the sales check can no longer see"
  echo "what it claims to."
  exit 1
fi
echo "all four fixtures failed for their own reasons — the sales check can still fail."

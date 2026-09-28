#!/usr/bin/env bash
# 7d-month-export-contract-falsify — can `docs/checks/7d-month-export-contract.sh`
# still fail?
#
# ⚠️ EACH FIXTURE IS A COPY OF `app/src/api/monthExport.ts` WITH ONE CONSTANT
# BROKEN, AND THE DATABASE IS NEVER TOUCHED — the one-sided mutation
# [[falsifier-must-not-mutate-what-the-check-reads]] asks for. And each fixture
# asserts the REASON, not only the exit code: a check that went red because GoTrue
# throttled a signup is not a check that caught the defect.
#
#   F1  a column that does not exist     → THE READ ANSWERED
#   F2  a figure without its ::text cast → not a string
#   F3  a page at or above max_rows      → IS NOT BELOW max_rows
#   F4  the cost of a write-off asked for → ASKS FOR unit_cost_net_per_base
#   F5  the wrong view                   → THE READ ANSWERED
#
# ⚠️ WHAT NO FIXTURE HERE BREAKS, AND WHY: the cashier's zero rows and the month
# filter's operators. The first is the DATABASE's answer and a constant cannot move
# it; the check guards it against vacuity by first proving she reads her store's
# sales. The operators (`gte`/`lt`) live in `@/api/calls`, which no script can load,
# and the check covers them by reading the neighbouring months as `[]`.
#
# Run:  supabase start && supabase db reset && bash docs/checks/7d-month-export-contract-falsify.sh
# Exit: 0 when the clean contract passes and every fixture fails for its reason.

set -uo pipefail

CHECK="docs/checks/7d-month-export-contract.sh"
SOURCE="app/src/api/monthExport.ts"
[[ -r "$CHECK" && -r "$SOURCE" ]] || { echo "FAIL: run from the repository root"; exit 1; }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

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

fixture F1 'THE READ ANSWERED' \
  "s/,qty_display::text,/,qty_shown::text,/" \
  "a renamed column is a 400 on every phone"
fixture F2 'not a string' \
  "s/line_gross::text/line_gross/" \
  "a figure without its ::text cast arrives as a JSON number"
fixture F3 'IS NOT BELOW max_rows' \
  "s/^export const EXPORT_PAGE = [0-9]*;/export const EXPORT_PAGE = 1500;/" \
  "a page above the cap makes every page short and a busy month stop after one"
fixture F4 'ASKS FOR unit_cost_net_per_base' \
  "s/,expiry_date';/,expiry_date,unit_cost_net_per_base';/" \
  "the cost of a write-off carried to the phone"
fixture F5 'THE READ ANSWERED' \
  "s/^export const EXPORT_VIEW = '[a-z_]*';/export const EXPORT_VIEW = 'product_velocity_daily';/" \
  "the sales view has none of these columns"

echo
if (( fails > 0 )); then
  echo "$fails fixture(s) did not fail as they should — the month export check can no"
  echo "longer see what it claims to."
  exit 1
fi
echo "all five fixtures failed for their own reasons — the month export check can still fail."

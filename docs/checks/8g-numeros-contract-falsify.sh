#!/usr/bin/env bash
# 8g-numeros-contract-falsify — can that check still fail?
#
# Rule 4 of this repository: `8g-numeros-contract.sh` prints *all N assertion
# groups passed*, and that is also what a check which stopped reading anything
# prints. Five broken copies of `app/src/api/month.ts`, each of which must turn
# it red FOR ITS OWN REASON — the message, not the exit code.
#
#   F1 ⚠️⚠️ the write-off lines embedded from `waste_line` instead of
#      `waste_reason_line`: the owner still reads them, and a cashier reads a
#      200 with `[]` — *Se tiró: Nada este mes* in her hand. The one this file is for.
#   F2 a delivery's total without its `::text` cast arrives as a JSON number.
#   F3 the reversal column misnamed — a 400 on every phone.
#   F4 a page above `max_rows`.
#   F5 the order's tiebreak misnamed — a 400 on every page.
#
# Run:  supabase start && supabase db reset && bash docs/checks/8g-numeros-contract-falsify.sh

set -uo pipefail

CHECK="docs/checks/8g-numeros-contract.sh"
SOURCE="app/src/api/month.ts"
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

fixture F1 'THE CASHIER READS DIFFERENT WRITE-OFFS' \
  "s/waste_reason_line(variant_id/waste_line(variant_id/" \
  "the lines from manager-only waste_line: a cashier reads none"
fixture F2 'rather than a string' \
  "s/total_net::text,total_tax::text';\$/total_net,total_tax::text';/" \
  "a delivery's total without ::text arrives as a JSON number"
fixture F3 'THE READS ANSWERED' \
  "s/^export const REVERSAL_COLUMN = '[a-z_]*';/export const REVERSAL_COLUMN = 'reversed_by';/" \
  "the reversal column misnamed — a 400 on every phone"
fixture F4 'IS NOT BELOW max_rows' \
  "s/^export const MONTH_PAGE = [0-9]*;/export const MONTH_PAGE = 1500;/" \
  "a page above the cap makes every page short and a month stop after one"
fixture F5 'THE READS ANSWERED' \
  "s/^export const MONTH_TIEBREAK = '[a-z_]*';/export const MONTH_TIEBREAK = 'document_id';/" \
  "the order's tiebreak misnamed — a 400 on every page"

echo
if (( fails > 0 )); then
  echo "$fails fixture(s) did not fail as they should — the Números check can no longer see"
  echo "what it claims to."
  exit 1
fi
echo "all five fixtures failed for their own reasons — the Números check can still fail."

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
#   F1  the headline read as NET          → SALES_KEYS names revenue_net
#   F2  a key the screen reads, missing   → where SALES_KEYS names
#   F3  the wrong function                → THE READ ANSWERED
#   F4  the function's name gone          → could not read SALES_FUNCTION
#
# ⚠️ WHAT NO FIXTURE HERE BREAKS, AND WHY (since `12.2`): the answer's figures,
# its spine, its void, its fence and its one value all live in `daily_sales`
# (`0095`), which a copy of `sales.ts` cannot touch. Each was broken in the
# database instead when it was written — fourteen mutations of the function and
# the view, each red at its own check of `supabase/tests/0095_sales_in_one_answer.sql`
# (plan `12.2`'s status entry) — and the check itself asserts the non-vacuity of
# each: the view's spine DOES carry the unsold product, and the same rows asked
# for as a set DO stop at max_rows.
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

fixture F1 'SALES_KEYS names revenue_net' \
  "s/^  'revenue_gross',$/  'revenue_net',/" \
  "the headline read as net — 16% short on a taxed product"
fixture F2 'where SALES_KEYS names' \
  "/^  'family_name',$/d" \
  "a key the screen reads is no longer named — the answer and the app disagree"
fixture F3 'THE READ ANSWERED' \
  "s/^export const SALES_FUNCTION = '[a-z_]*';/export const SALES_FUNCTION = 'daily_sale';/" \
  "a function that does not exist — a 404 on every phone"
fixture F4 'could not read SALES_FUNCTION' \
  "/^export const SALES_FUNCTION = /d" \
  "the check must refuse, not pass, when it cannot read the name"

echo
if (( fails > 0 )); then
  echo "$fails fixture(s) did not fail as they should — the sales check can no longer see"
  echo "what it claims to."
  exit 1
fi
echo "all four fixtures failed for their own reasons — the sales check can still fail."

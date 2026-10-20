#!/usr/bin/env bash
# 8g-proveedores-contract-falsify — can that check still fail?
#
# Rule 4 of this repository: `8g-proveedores-contract.sh` prints *all N assertion
# groups passed*, and that is also what a check which stopped reading anything
# prints. Four broken copies of `app/src/api/providerPage.ts`, each of which must
# turn it red FOR ITS OWN REASON — the message, not the exit code.
#
#   F1 a price without its `::text` cast arrives as a JSON number.
#   F2 ⚠️⚠️ the embed without `!inner`: the filter on the document no longer
#      narrows the LINES, and every supplier's line comes back with a null
#      document. The one this file is for.
#   F3 the supplier filter spelled on the line, which has no such column — a 400.
#   F4 the order spelled on a column the document lacks — a 400 on every page.
#
# Run:  supabase start && supabase db reset && bash docs/checks/8g-proveedores-contract-falsify.sh

set -uo pipefail

CHECK="docs/checks/8g-proveedores-contract.sh"
SOURCE="app/src/api/providerPage.ts"
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

fixture F1 'rather than a string' \
  "s/unit_price_net_per_base::text,purchase/unit_price_net_per_base,purchase/" \
  "a delivery price without ::text arrives as a JSON number"
fixture F2 'arrived with' \
  "s/purchase!inner(id,occurred_at/purchase(id,occurred_at/" \
  "the embed without !inner: every supplier's line comes back, with a null document"
fixture F3 'THE READ ANSWERED' \
  "s/^export const SUPPLIER_LINE_PROVIDER = '[a-z_.]*';/export const SUPPLIER_LINE_PROVIDER = 'provider_id';/" \
  "the supplier filter spelled on the line, which has no such column — a 400"
fixture F4 'THE READ ANSWERED' \
  "s/^export const SUPPLIER_LINE_ORDER = '[a-z_()]*';/export const SUPPLIER_LINE_ORDER = 'purchase(created)';/" \
  "the order on a column the document lacks — a 400 on every page"

echo
if (( fails > 0 )); then
  echo "$fails fixture(s) did not fail as they should — the supplier check can no longer see"
  echo "what it claims to."
  exit 1
fi
echo "all four fixtures failed for their own reasons — the supplier check can still fail."

#!/usr/bin/env bash
# 10.4b-ii-shop-scope-contract-falsify — can the shop scope check still fail?
#
# Rule 4 of this repository: a check nobody has seen fail is a check nobody has
# shown can. `10.4b-ii-shop-scope-contract.sh` is the only instrument that asks
# a real PostgREST whether Wera's reads keep a kitchen out, so it is also the one
# whose going quietly vacuous would be invisible: a kitchen's rows in a shop are
# rows she is allowed to see, and nothing else in the repository would notice.
#
# ⚠️ EACH FIXTURE MUTATES A COPY OF `app/src/api/workspace.ts` OR OF
# `app/src/api/calls.ts` AND NOTHING ELSE — the two files the check reads its
# claim out of — and never the database: a real defect arrives as an edit to the
# app, on a branch, with a green typecheck.
#
# ⚠️⚠️ IT MATCHES THE MESSAGE, NOT THE EXIT CODE: a fixture that is red for the
# wrong reason is a coincidence, not a falsification.
#
# ⚠️ ONE BRANCH NO FIXTURE HERE CAN REACH, SAID RATHER THAN HIDDEN: *filtered,
# the read returned another business's rows*. A filter on the ownership column
# returns that owner's rows by the definition of a filter, so no edit to the
# app's two files can make it leak — the leak that can happen is a read that
# skips `shopRows`, which names no relation here and is
# `app/test/api-shop-scope.test.ts`'s to catch (its own breaks, four, were run
# when it was written). The branch stays as the guard on the database's side.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.4b-ii-shop-scope-contract-falsify.sh

set -uo pipefail

CHECK="docs/checks/10.4b-ii-shop-scope-contract.sh"
WORKSPACE="app/src/api/workspace.ts"
CALLS="app/src/api/calls.ts"
[[ -r "$CHECK" && -r "$WORKSPACE" && -r "$CALLS" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

# fixture, expected colour, the phrase the output must contain, which file is
# mutated (workspace or calls), then the sed program applied to its copy.
run() {
  local name="$1" want="$2" phrase="$3" target="$4" program="$5"
  local real="$WORKSPACE"; [[ "$target" == calls ]] && real="$CALLS"
  local copy="$TMP/$name.ts"
  sed "$program" "$real" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$real"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING. A fixture that edits nothing"
    echo "      tests the control twice."
    fail=$((fail+1)); return
  fi
  local out rc
  if [[ "$target" == calls ]]; then
    out="$(bash "$CHECK" "$WORKSPACE" "$copy" 2>&1)"; rc=$?
  else
    out="$(bash "$CHECK" "$copy" "$CALLS" 2>&1)"; rc=$?
  fi
  local got=red; (( rc == 0 )) && got=green
  if [[ "$got" != "$want" ]]; then
    echo "  ✗ $name — expected $want, got $got"
    sed 's/^/        /' <<< "$out" | tail -6
    fail=$((fail+1)); return
  fi
  if [[ "$want" == red ]] && ! grep -qF "$phrase" <<< "$out"; then
    echo "  ✗ $name — red, but for the wrong reason. Wanted: $phrase"
    sed 's/^/        /' <<< "$out" | grep -i fail | head -3
    fail=$((fail+1)); return
  fi
  echo "  ✓ $name — $got"
  pass=$((pass+1))
}

echo "S0  the control, unedited"
run S0 green "" workspace ""

echo "S1  the filter's column is misspelled — PostgREST refuses every read"
run S1 red "the app's read of provider answered 400" workspace \
  "s/^export const SHOP_COLUMN = 'workspace_id';/export const SHOP_COLUMN = 'workspace';/"

echo "S2  the filter is on the store and not the business — a supplier has no store"
run S2 red "the app's read of provider answered 400" workspace \
  "s/^export const SHOP_COLUMN = 'workspace_id';/export const SHOP_COLUMN = 'location_id';/"

echo "S3  the filter's column is gone — the check must refuse, not pass"
run S3 red "could not read SHOP_COLUMN" workspace '/^export const SHOP_COLUMN = /d'

echo "S4  a read is pointed at reference data with no business column"
run S4 red "the unfiltered read of unit answered 400" calls \
  "s/shopRows('provider', PROVIDER_COLUMNS, shopId)/shopRows('unit', PROVIDER_COLUMNS, shopId)/"

echo "S5  a read names a constant no module exports"
run S5 red "could not resolve what shopRows reads" calls \
  's/shopRows(MAGNITUDE_TABLE, MAGNITUDE_COLUMNS, shopId)/shopRows(NO_SUCH_TABLE, MAGNITUDE_COLUMNS, shopId)/'

echo "S6  no read goes through the helper at all"
run S6 red "only 0 relations are read through shopRows" calls \
  's/\([^n] \)shopRows(/\1rowsOf(/g; s/= shopRows(/= rowsOf(/g; s/await shopRows(/await rowsOf(/g'

echo "S7  one relation leaves the helper — the roster reads every business again"
run S7 red "only 12 relations are read through shopRows" calls \
  "s/await shopRows('workspace_member', MEMBER_COLUMNS, shopId)/await supabase.from('workspace_member').select(MEMBER_COLUMNS)/"

echo "S8  a relation where the kitchen holds nothing — green would be the fixture's, not the filter's"
run S8 red "held no row of the kitchen" calls \
  "s/shopRows('collection_request', COLLECTION_COLUMNS, shopId)/shopRows('pilot_reading', COLLECTION_COLUMNS, shopId)/"

echo
echo "$pass passed, $fail failed."
# ⚠️ THE ANTI-VACUITY GUARD. A harness whose loop ran zero fixtures reports
# "0 failed" and exits 0.
if (( pass + fail < 9 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 9."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the shop scope check can still fail, and fails for the stated reason."

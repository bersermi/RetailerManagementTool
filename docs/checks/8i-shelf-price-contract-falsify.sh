#!/usr/bin/env bash
# 8i-shelf-price-contract-falsify — can `8i-shelf-price-contract.sh` still fail,
# and does it fail for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can
# fail. Each fixture below copies `app/src/api/shelfPrice.ts` or
# `app/src/api/catalog.ts`, breaks ONE claim in the copy, points the check at it,
# and requires red WITH THE SENTENCE that names that claim — red for the wrong
# reason is a failure here too. The control, unedited, must be green.
#
# Run:  supabase start && supabase db reset && bash docs/checks/8i-shelf-price-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/8i-shelf-price-contract.sh"
SHELF="app/src/api/shelfPrice.ts"
CATALOG="app/src/api/catalog.ts"
[[ -r "$CHECK" && -r "$SHELF" && -r "$CATALOG" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase target(shelf|catalog) sed-program
  local name="$1" want="$2" phrase="$3" target="$4" program="$5"
  local real="$SHELF"
  [[ "$target" == catalog ]] && real="$CATALOG"
  local copy="$TMP/$name.ts"
  sed "$program" "$real" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$real"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  local out rc s="$SHELF" c="$CATALOG"
  case "$target" in
    catalog) c="$copy" ;;
    *) s="$copy" ;;
  esac
  out="$(bash "$CHECK" "$s" "$c" 2>&1)"; rc=$?
  local got=red; (( rc == 0 )) && got=green
  if [[ "$got" != "$want" ]]; then
    echo "  ✗ $name — expected $want, got $got"
    sed 's/^/        /' <<< "$out" | tail -6
    fail=$((fail+1)); return
  fi
  if [[ "$want" == red ]] && ! grep -qF "$phrase" <<< "$out"; then
    echo "  ✗ $name — red, but for the wrong reason. Wanted: $phrase"
    sed 's/^/        /' <<< "$out" | grep FAIL | head -3
    fail=$((fail+1)); return
  fi
  echo "  ✓ $name — $got"
  pass=$((pass+1))
}

echo "C0  the control, unedited"
run C0 green "" shelf ""

echo "C1  the function is misspelt — no price would ever reach the shop"
run C1 red "a first price as the app sends it answered 404" shelf \
  "s/^export const SET_SHELF_PRICE = 'set_shelf_price';/export const SET_SHELF_PRICE = 'set_precio';/"

echo "C2  an argument is renamed — PostgREST finds no such function"
run C2 red "a first price as the app sends it answered 404" shelf \
  "s/^  'p_seen_price',$/  'p_seen',/"

echo "C3  two arguments trade places — the day is sent as the price"
run C3 red "a first price as the app sends it answered 400" shelf \
  "s/^  'p_price_per_base',$/  'p_tmp',/; s/^  'p_day',$/  'p_price_per_base',/; s/^  'p_tmp',$/  'p_day',/"

echo "C4  the answer is read under a key it does not carry — every price would wait for ever"
run C4 red "keys already_recorded,applied" shelf \
  "s/typeof row\.already_recorded !== 'boolean'/typeof row.recorded !== 'boolean'/"

echo "C5  a claim is gone from the file — the check must refuse, not pass"
run C5 red "could not read SHELF_PRICE_ARGUMENTS" shelf \
  "s/^export const SHELF_PRICE_ARGUMENTS = \[/export const ARGUMENTS = [/"

echo "C6  the catalog's price column is misspelt — no price would show at all"
run C6 red "the catalog read answered 400" catalog \
  "s/^export const PRICE_COLUMNS = 'price_per_base::text,location_id';/export const PRICE_COLUMNS = 'precio::text,location_id';/"

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 7 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 7."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the price contract check can still fail, and fails for the stated reason."

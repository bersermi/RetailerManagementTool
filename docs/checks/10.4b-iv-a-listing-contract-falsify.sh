#!/usr/bin/env bash
# 10.4b-iv-a-listing-contract-falsify — can `10.4b-iv-a-listing-contract.sh`
# still fail, and does it fail for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can
# fail. Each fixture below copies `cocina/src/api/listing.ts` or
# `cocina/src/api/place.ts`, breaks ONE claim in the copy, points the check at
# it, and requires red WITH THE SENTENCE that names that claim — red for the
# wrong reason is a failure here too. The control, unedited, must be green.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.4b-iv-a-listing-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.4b-iv-a-listing-contract.sh"
LISTING="cocina/src/api/listing.ts"
PLACE="cocina/src/api/place.ts"
KITCHEN="cocina/src/api/kitchen.ts"
CREDENTIALS="cocina/src/auth/credentials.ts"
[[ -r "$CHECK" && -r "$LISTING" && -r "$PLACE" && -r "$KITCHEN" && -r "$CREDENTIALS" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase target(listing|place) sed-program
  local name="$1" want="$2" phrase="$3" target="$4" program="$5"
  local real="$LISTING"
  [[ "$target" == place ]] && real="$PLACE"
  local copy="$TMP/$name.ts"
  sed "$program" "$real" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$real"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  local out rc l="$LISTING" p="$PLACE"
  case "$target" in
    place) p="$copy" ;;
    *) l="$copy" ;;
  esac
  out="$(bash "$CHECK" "$l" "$p" "$KITCHEN" "$CREDENTIALS" 2>&1)"; rc=$?
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
run C0 green "" listing ""

echo "C1  a column of the read is misspelt — PostgREST refuses every list"
run C1 red "the app's list read answered 400" listing \
  "s/,created_at,withdrawn_at,listing_line(/,created_at,retirada_at,listing_line(/"

echo "C2  the list is filtered on the place's column, not the kitchen's — her list comes back empty"
run C2 red "her list after publishing: the list returned []" listing \
  "s/^export const LISTING_OWNER_COLUMN = 'workspace_id';/export const LISTING_OWNER_COLUMN = 'location_id';/"

echo "C3  the list is turned oldest first — her new publication would sink to the bottom"
run C3 red "with two publications: the list returned" listing \
  "s/^export const LISTING_ORDER = 'created_at.desc,id.desc';/export const LISTING_ORDER = 'created_at.asc,id.asc';/"

echo "C4  the lines are ordered by a column the table has not — PostgREST refuses every list"
run C4 red "the app's list read answered 400" listing \
  "s/^export const LINE_ORDER = 'line_no';/export const LINE_ORDER = 'renglon';/"

echo "C5  the publishing function is misspelt — nothing could be published"
run C5 red "publishing as the app does answered 404" listing \
  "s/^export const PUBLISH_LISTING = 'publish_listing';/export const PUBLISH_LISTING = 'publish_itacate';/"

echo "C6  a window's argument is renamed — PostgREST finds no such function"
run C6 red "publishing as the app does answered 404" listing \
  's/^  readonly p_pickup_start: string;/  readonly p_desde: string;/'

echo "C7  the price's key is misspelt — every line is refused, nothing could be published"
run C7 red "publishing as the app does answered 400" listing \
  's/^  readonly unit_price: string;/  readonly price: string;/'

echo "C8  the vale's key is misspelt — accepted, and the bag silently loses what it is worth"
run C8 red "usual_price reads back None, sent 90" listing \
  's/^  readonly usual_price: string | null;/  readonly usual: string | null;/'

echo "C9  the withdrawing function is misspelt — nothing could be taken down"
run C9 red "withdrawing as the app does, withdraw_itacate(p_id), answered 404" listing \
  "s/^export const WITHDRAW_LISTING = 'withdraw_listing';/export const WITHDRAW_LISTING = 'withdraw_itacate';/"

echo "C10 a claim is gone from the file — the check must refuse, not pass"
run C10 red "could not read LISTING_OWNER_COLUMN" listing '/^export const LISTING_OWNER_COLUMN = /d'

echo "C11 the kitchen's place is read by the wrong column — there is no place to publish at"
run C11 red "could not read the kitchens' places and the shop's store apart" place \
  "s/^export const PLACE_OWNER_COLUMN = 'workspace_id';/export const PLACE_OWNER_COLUMN = 'id';/"

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 12 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 12."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the publishing contract check can still fail, and fails for the stated reason."

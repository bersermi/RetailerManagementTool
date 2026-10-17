#!/usr/bin/env bash
# ============================================================================
# 8k — CAN `8k-collection-contract.sh` STILL FAIL? Each fixture breaks ONE name
# the app declares, in a copy of `app/src/api/collection.ts`, and the check must
# go red FOR THAT REASON. A check that stays green over a renamed argument is a
# check that reads nothing.
#
#   bash docs/checks/8k-collection-contract-falsify.sh
# ============================================================================
set -uo pipefail

CHECK="docs/checks/8k-collection-contract.sh"
CONTRACT="app/src/api/collection.ts"
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

passed=0
failed=0

fixture() { # name sed-expression expected-reason-regex
  local name="$1" expr="$2" reason="$3"
  local copy="$SCRATCH/$name.ts"
  sed "$expr" "$CONTRACT" > "$copy"
  if cmp -s "$copy" "$CONTRACT"; then
    echo "BROKEN FIXTURE $name: the mutation changed nothing"; failed=$((failed+1)); return
  fi
  local out rc
  out="$(bash "$CHECK" "$copy" 2>&1)"; rc=$?
  if (( rc != 0 )) && grep -Eq "$reason" <<< "$out"; then
    echo "  ok    $name — red, for the reason"; passed=$((passed+1))
  else
    echo "FAIL: $name — rc=$rc, and the output did not match /$reason/:"
    grep -E '^FAIL' <<< "$out" | head -3
    failed=$((failed+1))
  fi
}

# PostgREST matches by argument NAME: a renamed one is a 404, not a refusal.
fixture renamed-argument \
  's/^  readonly p_pickup_date: string;/  readonly p_pickup_day: string;/' \
  'a store with no address answered 404'

# The refusal the screen keys its sentence on, misremembered.
fixture wrong-refusal-code \
  "s/^export const NO_ADDRESS_CODE = 'TD008';/export const NO_ADDRESS_CODE = 'TD009';/" \
  'a store with no address answered 400'

# A column the store row does not have.
fixture wrong-address-column \
  "s/^export const STORE_ADDRESS_COLUMNS = 'id,name,street,street_number,colonia,city,postal_code';/export const STORE_ADDRESS_COLUMNS = 'id,name,street,street_number,colonia,city,codigo_postal';/" \
  'address write 200 .*read 400'

# A column the request does not have.
fixture wrong-request-column \
  's/window_start,window_end,lines,photos/hora_inicio,window_end,lines,photos/' \
  'request 200 .*list 400'

# `0062`: what Wera paid without its cast arrives as a JSON number.
fixture paid-without-cast \
  "s/,wera_paid::text';/,wera_paid';/" \
  'wera_paid arrived as (float|int)'

# `8m`: the bucket misnamed — every upload is a 400 "Bucket not found".
fixture wrong-bucket \
  "s/^export const MERMA_BUCKET = 'merma';/export const MERMA_BUCKET = 'fotos';/" \
  'the photo upload answered 400'

echo
if (( failed == 0 && passed == 6 )); then
  echo "all 6 fixtures behaved as recorded — the contract check goes red on every defect it names."
  exit 0
fi
echo "$failed of $((passed + failed)) fixtures misbehaved."
exit 1

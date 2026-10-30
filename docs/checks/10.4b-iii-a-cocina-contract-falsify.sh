#!/usr/bin/env bash
# 10.4b-iii-a-cocina-contract-falsify — can `10.4b-iii-a-cocina-contract.sh`
# still fail, and does it fail for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can
# fail. Each fixture below copies `cocina/src/api/kitchen.ts` or
# `cocina/src/auth/credentials.ts`, breaks ONE claim in the copy, points the check
# at it, and requires red WITH THE SENTENCE that names that claim — red for the
# wrong reason is a failure here too. The control, unedited, must be green.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.4b-iii-a-cocina-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.4b-iii-a-cocina-contract.sh"
KITCHEN="cocina/src/api/kitchen.ts"
CREDENTIALS="cocina/src/auth/credentials.ts"
[[ -r "$CHECK" && -r "$KITCHEN" && -r "$CREDENTIALS" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase target(kitchen|credentials) sed-program
  local name="$1" want="$2" phrase="$3" target="$4" program="$5"
  local real="$KITCHEN"; [[ "$target" == credentials ]] && real="$CREDENTIALS"
  local copy="$TMP/$name.ts"
  sed "$program" "$real" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$real"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  local out rc
  if [[ "$target" == credentials ]]; then
    out="$(bash "$CHECK" "$KITCHEN" "$copy" 2>&1)"; rc=$?
  else
    out="$(bash "$CHECK" "$copy" "$CREDENTIALS" 2>&1)"; rc=$?
  fi
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
run C0 green "" kitchen ""

echo "C1  the kind is spelt as no account is — the database refuses the value"
run C1 red "the app's read answered 400" kitchen \
  "s/^export const COCINA_KIND = 'cocina';/export const COCINA_KIND = 'fonda';/"

echo "C2  the filter asks for the other kind — a shop's owner would open her shop here"
run C2 red "a shop's owner would be in her shop" kitchen \
  "s/^export const COCINA_KIND = 'cocina';/export const COCINA_KIND = 'tienda';/"

echo "C3  a column is misspelt — PostgREST refuses every read"
run C3 red "the app's read answered 400" kitchen \
  "s/^export const KITCHEN_COLUMNS = 'id,display_name,giro_principal';/export const KITCHEN_COLUMNS = 'id,display_name,giro';/"

echo "C4  ordered by name and not by creation — another kitchen would open"
run C4 red "the read returned" kitchen \
  "s/^export const KITCHEN_ORDER = 'created_at,id';/export const KITCHEN_ORDER = 'display_name,id';/"

echo "C5  the name is stored under a key the database does not read"
run C5 red "the name was stored under a key the database does not read" credentials \
  "s/^export const FULL_NAME_KEY = 'full_name';/export const FULL_NAME_KEY = 'name';/"

echo "C6  a claim is gone from the file — the check must refuse, not pass"
run C6 red "could not read KIND_COLUMN" kitchen '/^export const KIND_COLUMN = /d'

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 7 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 7."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the Cocina contract check can still fail, and fails for the stated reason."

#!/usr/bin/env bash
# 5b-i-api-contract-falsify — can the contract check still fail?
#
# Rule 4 of this repository: a check nobody has seen fail is a check nobody has
# shown can. `5b-i-api-contract.sh` is the only instrument in this project that
# can see the app and the applied schema disagreeing, so it is also the one
# whose going quietly vacuous would be invisible.
#
# ⚠️ EACH FIXTURE MUTATES A COPY OF `app/src/api/workspace.ts` AND NOTHING ELSE,
# which is why the check takes the contract's path as an argument. The database
# is never touched: every fixture is a change to what the APP claims, which is
# the direction a real defect arrives from — a rename in an editor, on a branch,
# with a green typecheck.
#
# ⚠️⚠️ IT MATCHES THE MESSAGE, NOT THE EXIT CODE. The rule a sister harness paid
# for on 2026-09-14: "a fixture that is red for the wrong reason is not a
# falsification, it is a coincidence." Two of that harness's nine were red for
# the wrong reason on their first run and were only caught because of this.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b-i-api-contract-falsify.sh

set -uo pipefail

CHECK="docs/checks/5b-i-api-contract.sh"
REAL="app/src/api/workspace.ts"
[[ -r "$CHECK" && -r "$REAL" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

# fixture, expected colour, the phrase the output must contain, then the sed
# program applied to the copy.
run() {
  local name="$1" want="$2" phrase="$3" program="$4"
  local copy="$TMP/$name.ts"
  sed "$program" "$REAL" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$REAL"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING. A fixture that edits nothing"
    echo "      is 5a-i's own recorded defect: it tests the control twice."
    fail=$((fail+1)); return
  fi
  local out rc
  out="$(bash "$CHECK" "$copy" 2>&1)"; rc=$?
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

echo "Z0  the control, unedited"
run Z0 green "" ""

echo "Z1  the display-name argument loses its p_ prefix"
run Z1 red "PGRST202" 's/p_display_name/display_name/g'

echo "Z2  C1.7's argument is renamed"
run Z2 red "PGRST202" 's/p_prices_include_tax/p_include_tax/g'

echo "Z3  the RPC itself is renamed"
run Z3 red "HTTP 404" "s/'onboard_workspace'/'onboard_shop'/"

echo "Z4  the select asks for a column no migration has applied"
run Z4 red "workspace read was 400" "s/id,display_name,prices_include_tax,code/id,display_name,prices_include_tax,code,owner_email/"

echo "Z5  the contract constants are gone — the check must refuse, not pass"
run Z5 red "could not read the contract" '/^export const ONBOARD_WORKSPACE/d'

echo
echo "$pass passed, $fail failed."
# ⚠️ THE ANTI-VACUITY GUARD. A harness whose loop ran zero fixtures reports
# "0 failed" and exits 0, which is the shape `conventions-gate-falsify.sh` spent
# a day in.
if (( pass + fail < 6 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 6."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the contract check can still fail, and fails for the stated reason."

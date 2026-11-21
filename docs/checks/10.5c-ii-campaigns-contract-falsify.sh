#!/usr/bin/env bash
# 10.5c-ii-campaigns-contract-falsify — can `10.5c-ii-campaigns-contract.sh` still fail, and does it
# fail for the reason it states?
#
# Each fixture copies `docs/runbooks/campaigns.sql`, breaks ONE thing in the copy (a function's name,
# an argument's, an audience, a kind, a wording's shape, a step left out, the statement that turns
# promotions on aimed at the wrong kind), points the check at it, and requires red WITH THE WORDS
# that name that break: red for the wrong reason is a failure here too. The control, unedited, must
# be green. Every fixture is one transaction that rolls back, as the check is.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5c-ii-campaigns-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.5c-ii-campaigns-contract.sh"
RUNBOOK="docs/runbooks/campaigns.sql"
for f in "$CHECK" "$RUNBOOK"; do
  [[ -r "$f" ]] || { echo "FAIL: run this from the repository root"; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program
  local name="$1" want="$2" phrase="$3" program="$4"
  local copy="$TMP/$name.sql"
  sed "$program" "$RUNBOOK" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$RUNBOOK"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
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
    sed 's/^/        /' <<< "$out" | grep -E 'FAIL|ERROR' | head -3
    fail=$((fail+1)); return
  fi
  echo "  ✓ $name — $got"
  pass=$((pass+1))
}

echo "R0  the control, unedited"
run R0 green "" ""

echo "R1  the draft asked of a misspelt function — his first campaign never starts"
run R1 red "servicio.new_campaing" \
  's/^select servicio.new_campaign($/select servicio.new_campaing(/'

echo "R2  an argument under another name — Postgres finds no function by those names"
run R2 red "does not exist" \
  's/^  p_held_out => 10,/  p_heldout  => 10,/'

echo "R3  an audience that is not on the closed list"
run R3 red "no audience activos in itacate" \
  "s/^  p_audience => 'todos',/  p_audience => 'activos',/"

echo "R4  the wordings' weights adding to 90"
run R4 red "1 to 5 wordings" \
  's/\[{"key":"A","weight":50,/[{"key":"A","weight":40,/'

echo "R5  Wera Cocina's kind in an Itacate campaign"
run R5 red "is not a promotion kind of the app itacate" \
  "s/^  p_kind     => 'ofertas',/  p_kind     => 'novedades',/"

echo "R6  a title over 80 characters"
run R6 red "1 to 5 wordings" \
  's/"title":"Para la cena, aparta y pasa a tu hora"/"title":"Para la cena, aparta y pasa a tu hora, que hoy cuatro cocinas de tu colonia tienen oferta del día"/'

echo "R7  the test left out — the launch is refused until one went out"
run R7 red "send it to your own phones first" \
  's/^select servicio.test_campaign(:campaign);/select 1;/'

echo "R8  promotions turned on for the wrong kind — the launch is refused"
run R8 red "the kind ofertas is off" \
  "s/^update servicio.notification_kind set is_on = true where kind = 'ofertas';/update servicio.notification_kind set is_on = true where kind = 'novedades';/"

echo "R9  his results asked of a misspelt function"
run R9 red "campaign_result(" \
  's/^select \* from servicio.campaign_results(7);/select * from servicio.campaign_result(7);/'

echo "R10 his test accounts written to a table that does not exist"
run R10 red "servicio.campaign_testers" \
  's/^insert into servicio.campaign_tester (user_id)$/insert into servicio.campaign_testers (user_id)/'

echo "R11 step 1's dates without their zone — Mexico City's hours read as the server's"
run R11 red "step 1 does not give its start and expiry" \
  "s/ America\/Mexico_City',$/',/"

echo "R12 a step left out — the check refuses to pass on nothing"
run R12 red "no statement after '-- step 6:'" \
  's/^-- step 6:.*/-- (stop: removed)/'

echo "R13 the stop asked of a misspelt function"
run R13 red "stop_campaing" \
  's/^select servicio.stop_campaign(:campaign);/select servicio.stop_campaing(:campaign);/'

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 14 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 14."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the campaigns contract check can still fail, and fails for the stated reason."

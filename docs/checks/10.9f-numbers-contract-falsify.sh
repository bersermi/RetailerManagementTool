#!/usr/bin/env bash
# 10.9f-numbers-contract-falsify — can `10.9f-numbers-contract.sh` still fail, and does it fail for the
# reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can fail. Each fixture
# below copies Wera Cocina's `cocina/src/api/numeros.ts`, breaks ONE claim in the copy (the function's
# name, its argument's, a key of the answer at each of its three levels, a figure about people, the
# periods it reads, the refusal's code), points the check at it, and requires red WITH THE SENTENCE
# that names that claim: red for the wrong reason is a failure here too. The control, unedited, must
# be green.
# ⚠️ And one fixture breaks the DATABASE instead (D1, the review of `10.9f`): `kitchen_events` re-made for its
# run with a handover's stamp as a visit of its own, so the check's *one visit* verdict is seen red too — then
# put back from `0086`'s own text, and the check run once more to show it green.
# ⚠️ Since `10.9l` (`0091`): three fixtures break a key of the card's at each level (C10–C12), and one breaks the
# database (D2): `card_numbers_in` re-made with no stamp counted as given at a handover, so the card's verdict is
# seen red — then put back from `0091`'s own text, and the check run once more (D2b).
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9f-numbers-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.9f-numbers-contract.sh"
NUMEROS="cocina/src/api/numeros.ts"
for f in "$CHECK" "$NUMEROS"; do
  [[ -r "$f" ]] || { echo "FAIL: run this from the repository root"; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program
  local name="$1" want="$2" phrase="$3" program="$4"
  local copy="$TMP/$name.ts"
  sed "$program" "$NUMEROS" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$NUMEROS"; then
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
    sed 's/^/        /' <<< "$out" | grep FAIL | head -3
    fail=$((fail+1)); return
  fi
  echo "  ✓ $name — $got"
  pass=$((pass+1))
}

echo "C0  the control, unedited"
run C0 green "" ""

echo "C1  her numbers asked of a misspelt function — Tus números never read"
run C1 red "kitchen_number answered 404" \
  "s/^export const KITCHEN_NUMBERS = 'kitchen_numbers';/export const KITCHEN_NUMBERS = 'kitchen_number';/"

echo "C2  the argument misspelt — PostgREST finds no function"
run C2 red "kitchen_numbers answered 404" \
  '/^export interface NumbersArgs {/,/^}/s/^  readonly p_workspace_id: string;/  readonly p_kitchen_id: string;/'

echo "C3  a period under another key at the top — Semana never read"
run C3 red "the answer carried no 'week'" \
  '/^export interface Numeros {/,/^}/s/^  readonly semana: EnElPeriodo;/  readonly week: EnElPeriodo;/'

echo "C4  the hours' bars under another key — Tus horas fuertes never drawn"
run C4 red "the period 'dia' carried no 'horas'" \
  '/^export interface EnElPeriodo extends Antes {/,/^}/s/^  readonly hours: readonly number\[\];/  readonly horas: readonly number[];/'

echo "C5  the walk-ins under another key — N sin apartar never said"
run C5 red "the period 'dia' carried no 'walkins'" \
  '/^export interface Antes {/,/^}/s/^  readonly walk_ins: number;/  readonly walkins: number;/'

echo "C6  the neighbours under another key — a figure about people never shown"
run C6 red "carried no 'vecinos'" \
  '/^export interface Antes {/,/^}/s/^  readonly neighbours: number | null;/  readonly vecinos: number | null;/'

echo "C7  the period before under another key — every comparison lost"
run C7 red "the period 'dia' carried no 'antes'" \
  '/^export interface EnElPeriodo extends Antes {/,/^}/s/^  readonly prev: Antes;/  readonly antes: Antes;/'

echo "C8  a period this build asks for that the answer does not carry"
run C8 red "the period 'week' is None, not an object" \
  "s/^export const PERIODOS = \['dia', 'semana', 'mes'\] as const;/export const PERIODOS = ['dia', 'week', 'mes'] as const;/"

echo "C9  not-her-owner read under another code — she would read the generic sentence"
run C9 red "the app reads 'TD013'" \
  "s/^export const NO_ES_LA_DUENA = '42501';/export const NO_ES_LA_DUENA = 'TD013';/"

echo "C10 the cards going one period earlier under another key — *hace una semana* never said (0091)"
run C10 red "carried no 'tarjetas_activas'" \
  '/^export interface Antes {/,/^}/s/^  readonly cards_going: number | null;/  readonly tarjetas_activas: number | null;/'
echo "C11 the stamps at a handover under another key — where her stamps come from never said (0091)"
run C11 red "the period 'dia' carried no 'handover_stamps'" \
  '/^export interface EnElPeriodo extends Antes {/,/^}/s/^  readonly stamps_handover: number;/  readonly handover_stamps: number;/'
echo "C12 the rewards waiting under another key — *N por entregar* never said (0091)"
run C12 red "the answer carried no 'rewards_to_give'" \
  '/^export interface Numeros {/,/^}/s/^  readonly rewards_waiting: number;/  readonly rewards_to_give: number;/'
echo "D1  a handover's stamp counted as a visit of its own — her one visit drawn as two, one a walk-in"
MIGRATION="supabase/migrations/0086_her_numbers.sql"
python3 - "$MIGRATION" "$TMP/good.sql" "$TMP/bad.sql" <<'PY'
import sys
text = open(sys.argv[1]).read()
start = text.index('create function servicio.kitchen_events(')
end = text.index('$$;', text.index('$$', start) + 2) + 3
good = text[start:end].replace('create function', 'create or replace function', 1)
bad = good.replace("coalesce(s.user_id::text, 'r' || s.reservation_id::text, 's' || s.id::text)", "'s' || s.id::text")
assert bad != good, 'the mutation changed nothing'
open(sys.argv[2], 'w').write(good)
open(sys.argv[3], 'w').write(bad)
PY
put_back() { supabase db query --local -f "$TMP/good.sql" > /dev/null 2>&1; }
if supabase db query --local -f "$TMP/bad.sql" > /dev/null 2>&1; then
  out="$(bash "$CHECK" 2>&1)"; rc=$?
  put_back
  phrase="came back plates, visits, walk-ins, cents = (1, 2, 1, 6000), not (1, 1, 0, 6000)"
  if (( rc == 0 )); then echo "  ✗ D1 — expected red, got green"; fail=$((fail+1))
  elif ! grep -qF "$phrase" <<< "$out"; then
    echo "  ✗ D1 — red, but for the wrong reason. Wanted: $phrase"; sed 's/^/        /' <<< "$out" | grep FAIL | head -3; fail=$((fail+1))
  else echo "  ✓ D1 — red"; pass=$((pass+1)); fi
else
  put_back
  echo "  ✗ D1 — could not re-make kitchen_events for its run"; fail=$((fail+1))
fi
echo "D1b the control again, kitchen_events put back"
if bash "$CHECK" > /dev/null 2>&1; then echo "  ✓ D1b — green"; pass=$((pass+1)); else echo "  ✗ D1b — red: D1 left the database broken"; fail=$((fail+1)); fi

echo "D2  no stamp counted as given at a handover — the card's split drawn as all at the counter (0091)"
python3 - "supabase/migrations/0091_her_numbers_with_the_card.sql" "$TMP/good2.sql" "$TMP/bad2.sql" <<'PY'
import sys
text = open(sys.argv[1]).read()
start = text.index('create function servicio.card_numbers_in(')
end = text.index('$$;', text.index('$$', start) + 2) + 3
good = text[start:end].replace('create function', 'create or replace function', 1)
bad = good.replace("from st where st.via = 'entrega'", "from st where st.via = 'su_codigo'")
assert bad != good, 'the mutation changed nothing'
open(sys.argv[2], 'w').write(good)
open(sys.argv[3], 'w').write(bad)
PY
put_back2() { supabase db query --local -f "$TMP/good2.sql" > /dev/null 2>&1; }
if supabase db query --local -f "$TMP/bad2.sql" > /dev/null 2>&1; then
  out="$(bash "$CHECK" 2>&1)"; rc=$?
  put_back2
  phrase="came back stamps, at a handover, rewards won, claimed, cards erased = (1, 0, 0, 0, 0), not (1, 1, 0, 0, 0)"
  if (( rc == 0 )); then echo "  ✗ D2 — expected red, got green"; fail=$((fail+1))
  elif ! grep -qF "$phrase" <<< "$out"; then
    echo "  ✗ D2 — red, but for the wrong reason. Wanted: $phrase"; sed 's/^/        /' <<< "$out" | grep FAIL | head -3; fail=$((fail+1))
  else echo "  ✓ D2 — red"; pass=$((pass+1)); fi
else
  put_back2
  echo "  ✗ D2 — could not re-make card_numbers_in for its run"; fail=$((fail+1))
fi
echo "D2b the control again, card_numbers_in put back"
if bash "$CHECK" > /dev/null 2>&1; then echo "  ✓ D2b — green"; pass=$((pass+1)); else echo "  ✗ D2b — red: D2 left the database broken"; fail=$((fail+1)); fi
echo
echo "$pass passed, $fail failed."
if (( pass + fail < 17 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 17."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the numbers contract check can still fail, and fails for the stated reason."

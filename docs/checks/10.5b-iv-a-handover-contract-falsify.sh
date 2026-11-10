#!/usr/bin/env bash
# 10.5b-iv-a-handover-contract-falsify — can `10.5b-iv-a-handover-contract.sh` still fail, and
# does it fail for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can fail. Each
# fixture below copies `cocina/src/api/apartados.ts`, breaks ONE claim in the copy — a column,
# the order, a function's name, an argument's, a key at each level of the answers, a label, a
# refusal's code — points the check at it, and requires red WITH THE SENTENCE that names that
# claim: red for the wrong reason is a failure here too. The control, unedited, must be green.
# ⚠️ Since `10.5b-iv-b` the fixtures C21–C24 break a copy of `cocina/src/api/cola.ts` instead —
# her queue's claims about which refusals are the database's last word.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5b-iv-a-handover-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.5b-iv-a-handover-contract.sh"
APARTADOS="cocina/src/api/apartados.ts"
COLA="cocina/src/api/cola.ts"
[[ -r "$CHECK" && -r "$APARTADOS" && -r "$COLA" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program [file to break: apartados (default) or cola]
  local name="$1" want="$2" phrase="$3" program="$4" which="${5:-apartados}"
  local original="$APARTADOS"; [[ "$which" == cola ]] && original="$COLA"
  local copy="$TMP/$name.ts"
  sed "$program" "$original" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$original"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  local out rc
  if [[ "$which" == cola ]]; then out="$(bash "$CHECK" "$APARTADOS" "$copy" 2>&1)"; rc=$?
  else out="$(bash "$CHECK" "$copy" 2>&1)"; rc=$?; fi
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

echo "C1  a column misspelt — the read is refused, and the tab never shows an order"
run C1 red "her kitchen's read answered 400" \
  "s/^export const RESERVATION_COLUMNS = 'id,listing_id,code,/export const RESERVATION_COLUMNS = 'id,listing_id,codigo,/"

echo "C2  who reserved read too — granted to nobody, so the whole read is refused"
run C2 red "her kitchen's read answered" \
  "s/^export const RESERVATION_COLUMNS = 'id,listing_id,/export const RESERVATION_COLUMNS = 'id,buyer_id,listing_id,/"

echo "C3  her hour read under a key the database does not write — every card without its hour"
run C3 red "a reservation carried no 'pickup_time'" \
  's/^  readonly pickup_at: string;/  readonly pickup_time: string;/'

echo "C4  the dish's name read under another key — no card would say what to prepare"
run C4 red "a line's dish carried no 'nombre'" \
  '/^export interface ReservationDishRow {/,/^}/s/^  readonly name: string;/  readonly nombre: string;/'

echo "C5  the order misspelt — PostgREST refuses it, and the tab never shows an order"
run C5 red "her kitchen's read answered 400" \
  "s/^export const RESERVATION_ORDER = 'pickup_at.asc,id.asc';/export const RESERVATION_ORDER = 'pickup.asc,id.asc';/"

echo "C6  who reserved, asked of a misspelt function — no card would carry a name or a score"
run C6 red "reservation_neighbor() answered 404" \
  "s/^export const RESERVATION_NEIGHBOURS = 'reservation_neighbours';/export const RESERVATION_NEIGHBOURS = 'reservation_neighbor';/"

echo "C7  the neighbour's name read under another key — every card would read Sin nombre"
run C7 red "the neighbour carried no 'nombre'" \
  '/^export interface NeighbourRow {/,/^}/s/^  readonly name: string | null;/  readonly nombre: string | null;/'

echo "C8  until when a first thumb may be given, under another key — Calificar would never show"
run C8 red "a neighbour's line carried no 'rate_by'" \
  's/^  readonly rate_until: string | null;/  readonly rate_by: string | null;/'

echo "C9  the handover's moment sent under another name — Ya cobré y lo entregué would do nothing"
run C9 red "answered 404 — no function by these arguments' names" \
  '/^export interface HandOverArgs {/,/^}/s/^  readonly p_at: string;/  readonly p_when: string;/'

echo "C10 the handover misspelt — no plate could be handed over"
run C10 red "hand_over() answered 404" \
  "s/^export const HAND_OVER_RESERVATION = 'hand_over_reservation';/export const HAND_OVER_RESERVATION = 'hand_over';/"

echo "C11 the thumb sent under another name — no thumb could be given"
run C11 red "answered 404 — no function by these arguments' names" \
  '/^export interface RateNeighbourArgs {/,/^}/s/^  readonly p_up: boolean;/  readonly p_thumb: boolean;/'

echo "C12 a label misspelt — the database refuses what the phone offers"
run C12 red "rate_neighbour() answered 400" \
  "s/^export const ETIQUETAS_ARRIBA = \['a_tiempo',/export const ETIQUETAS_ARRIBA = ['atiempo',/"

echo "C13 No se presentó misspelt — a plate that se liberó could never be rated"
run C13 red "*No se presentó* with 'no_se_presento_' answered 400" \
  "s/^export const NO_SE_PRESENTO = 'no_se_presento';/export const NO_SE_PRESENTO = 'no_se_presento_';/"

echo "C14 the thumb's answer read under another key — a thumb given would never be drawn"
run C14 red "rate_neighbour's answer carried no 'arriba'" \
  '/^export interface RatedNeighbourRow {/,/^}/s/^  readonly up: boolean;/  readonly arriba: boolean;/'

echo "C15 the refusal after the 24 hours read under another code — she would read the wrong sentence"
run C15 red "the app reads 'TD099'" \
  "s/^  TD022: 'yaNoSeCalifica',/  TD099: 'yaNoSeCalifica',/"

echo "C16 a claim is gone from the file — the check must refuse, not pass"
run C16 red "could not read ThumbRow" '/^export interface ThumbRow {/,/^}/d'

# The review of `10.5b-iv-a`: claims the first fixtures never broke.
echo "C17 the history's order misspelt — PostgREST refuses it, and Historial never shows"
run C17 red "the history's form answered 400" \
  "s/^export const RESERVATION_HISTORY_ORDER = 'pickup_at.desc,id.desc';/export const RESERVATION_HISTORY_ORDER = 'pickup.desc,id.desc';/"

echo "C18 the kitchen's column misspelt — the read is refused, and the tab never shows an order"
run C18 red "her kitchen's read answered 400" \
  "s/^export const RESERVATION_OWNER_COLUMN = 'workspace_id';/export const RESERVATION_OWNER_COLUMN = 'kitchen_id';/"

echo "C19 a thumb-down label misspelt — the database refuses what the phone offers"
run C19 red "a thumb down with 'tardes' answered 400" \
  "s/^export const ETIQUETAS_ABAJO = \['tarde',/export const ETIQUETAS_ABAJO = ['tardes',/"

echo "C20 the session's refusal read under another code — she would read the wrong sentence"
run C20 red "the app reads '42502'" \
  "s/^  '42501': 'sesion',/  '42502': 'sesion',/"

# `10.5b-iv-b`: her queue's claims (`cocina/src/api/cola.ts`).
echo "C21 her queue takes 'permission denied' as final — a phone whose sign-in lapsed would drop her handover"
run C21 red "a call with no session ('permission denied for function hand_over_reservation') matches what her queue takes as final" \
  "s#^export const NO_ES_DE_SU_COCINA = /reservation is not at one of your kitchens/;#export const NO_ES_DE_SU_COCINA = /permission denied|reservation is not at one of your kitchens/;#" cola

echo "C22 her queue's pattern for the functions' own 42501 misspelt — a handover that is not hers waits for ever"
run C22 red "is not what her queue takes as final" \
  "s#^export const NO_ES_DE_SU_COCINA = /reservation is not at one of your kitchens/;#export const NO_ES_DE_SU_COCINA = /reservation is not in one of your kitchens/;#" cola

echo "C23 a broken token not among her sign-in's codes — her queue would take it as a refusal"
run C23 red "which her queue does not wait on as her sign-in's" \
  "s/^export const CODIGOS_DE_SESION: readonly string\[\] = \['PGRST301', /export const CODIGOS_DE_SESION: readonly string[] = [/" cola

echo "C24 her queue draws another code as cambio — the database's refusal would wait instead"
run C24 red "her queue draws 22024 as cambio" \
  "s/^  '22023': 'cambio',/  '22024': 'cambio',/" cola

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 25 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 25."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the handover contract check can still fail, and fails for the stated reason."

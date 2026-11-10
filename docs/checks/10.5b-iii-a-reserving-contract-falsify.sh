#!/usr/bin/env bash
# 10.5b-iii-a-reserving-contract-falsify — can `10.5b-iii-a-reserving-contract.sh` still
# fail, and does it fail for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can fail. Each
# fixture below copies `itacate/src/api/apartados.ts`, breaks ONE claim in the copy — a
# function's name, an argument's, a key at each level of the answers, a state, a tag, a
# refusal's code — points the check at it, and requires red WITH THE SENTENCE that names
# that claim: red for the wrong reason is a failure here too. The control, unedited, must
# be green.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5b-iii-a-reserving-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.5b-iii-a-reserving-contract.sh"
APARTADOS="itacate/src/api/apartados.ts"
[[ -r "$CHECK" && -r "$APARTADOS" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program
  local name="$1" want="$2" phrase="$3" program="$4"
  local copy="$TMP/$name.ts"
  sed "$program" "$APARTADOS" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$APARTADOS"; then
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

echo "C1  reserving misspelt — no neighbour could ever reserve"
run C1 red "reserve_plates() answered 404" \
  "s/^export const RESERVE_PLATE = 'reserve_plate';/export const RESERVE_PLATE = 'reserve_plates';/"

echo "C2  her hour sent under another name — PostgREST finds no function by these arguments"
run C2 red "answered 404 — no function by these arguments' names" \
  's/^  readonly p_pickup_at: string;/  readonly p_hour: string;/'

echo "C3  her hour read under a key the database does not write — every ticket without its hour"
run C3 red "a reservation carried no 'pickup_time'" \
  's/^  readonly pickup_at: string;/  readonly pickup_time: string;/'

echo "C4  the kitchen's line of directions under another key — no ticket would say how to find her"
run C4 red "a reservation's kitchen carried no 'indications'" \
  '/^export interface ReservationKitchenRow {/,/^}/s/^  readonly directions: string | null;/  readonly indications: string | null;/'

echo "C5  a plate's price under another key — no ticket could say what to pay"
run C5 red "a reservation's line carried no 'price'" \
  '/^export interface ReservationLineRow {/,/^}/s/^  readonly unit_price: string;/  readonly price: string;/'

echo "C6  how many she holds under another key — the dish's foot would never know her limit"
run C6 red "her standing carried no 'held'" \
  's/^  readonly holding: number;/  readonly held: number;/'

echo "C7  pending misspelt — no ticket would ever be drawn"
run C7 red "came back in state 'apartado', the app knows 'reservado'" \
  "s/^export const ESTADOS = \['apartado',/export const ESTADOS = ['reservado',/"

echo "C8  cancelled misspelt — a plate she gave back would read as something else"
run C8 red "the app knows 'cancelada'" \
  "s/'recogido', 'cancelado', 'no_va'/'recogido', 'cancelada', 'no_va'/"

echo "C9  her yes's refusal read under another code — she would never be asked for it"
run C9 red "the app reads 'TD099'" \
  "s/^  TD021: 'sinSi',/  TD099: 'sinSi',/"

echo "C10 cancelling's argument under another name — Cancelar and No voy a poder ir would do nothing"
run C10 red "answered 404 — no function by the argument's name" \
  '/^export interface ReservationIdArgs {/,/^}/s/^  readonly p_id: string;/  readonly p_reservation: string;/'

echo "C11 her yes misspelt — she could never reserve"
run C11 red "give_my_yes_now() answered 404" \
  "s/^export const GIVE_MY_YES = 'give_my_yes';/export const GIVE_MY_YES = 'give_my_yes_now';/"

echo "C12 a claim is gone from the file — the check must refuse, not pass"
run C12 red "could not read ScoreRow" '/^export interface ScoreRow {/,/^}/d'

# `10.5b-iii-b`: her stars about the kitchen.
echo "C13 rating misspelt — no neighbour could ever rate a kitchen"
run C13 red "rate_kitchens() answered 404" \
  "s/^export const RATE_KITCHEN = 'rate_kitchen';/export const RATE_KITCHEN = 'rate_kitchens';/"

echo "C14 her stars sent under another name — PostgREST finds no function by these arguments"
run C14 red "answered 404 — no function by these arguments' names" \
  '/^export interface RateArgs {/,/^}/s/^  readonly p_stars: number;/  readonly p_estrellas: number;/'

echo "C15 her stars on her reservation read under another key — Anteriores would never show them"
run C15 red "her stars on her reservation carried no 'estrellas'" \
  '/^export interface MyRatingRow {/,/^}/s/^  readonly stars: number;/  readonly estrellas: number;/'

echo "C16 a tag after one to three stars misspelt — the database refuses what the phone offers"
run C16 red "two stars and 'tuvo_que_esperar' answered 400" \
  "s/^export const ETIQUETAS_MALAS = \['tuve_que_esperar',/export const ETIQUETAS_MALAS = ['tuvo_que_esperar',/"

echo "C17 the refusal after the day read under another code — she would read the wrong sentence"
run C17 red "the app reads 'TD098'" \
  "s/^  TD022: 'yaNoSeCalifica',/  TD098: 'yaNoSeCalifica',/"

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 18 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 18."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the reserving contract check can still fail, and fails for the stated reason."

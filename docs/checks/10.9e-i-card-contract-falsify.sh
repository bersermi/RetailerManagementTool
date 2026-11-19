#!/usr/bin/env bash
# 10.9e-i-card-contract-falsify — can `10.9e-i-card-contract.sh` still fail, and does it fail for
# the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can fail. Each
# fixture below copies ONE of the two files the check reads — Wera Cocina's
# `cocina/src/api/tarjeta.ts` or Itacate's `itacate/src/api/tarjeta.ts` — breaks ONE claim in the
# copy (a function's name, an argument's, a key of an answer, a refusal's code), points the check
# at it, and requires red WITH THE SENTENCE that names that claim: red for the wrong reason is a
# failure here too. The control, unedited, must be green.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9e-i-card-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.9e-i-card-contract.sh"
COCINA="cocina/src/api/tarjeta.ts"
ITACATE="itacate/src/api/tarjeta.ts"
for f in "$CHECK" "$COCINA" "$ITACATE"; do
  [[ -r "$f" ]] || { echo "FAIL: run this from the repository root"; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program which (cocina | itacate)
  local name="$1" want="$2" phrase="$3" program="$4" which="${5:-cocina}"
  local c="$COCINA" i="$ITACATE" original
  case "$which" in
    cocina) original="$COCINA" ;;
    itacate) original="$ITACATE" ;;
  esac
  local copy="$TMP/$name.ts"
  sed "$program" "$original" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$original"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  case "$which" in
    cocina) c="$copy" ;;
    itacate) i="$copy" ;;
  esac
  local out rc
  out="$(bash "$CHECK" "$c" "$i" 2>&1)"; rc=$?
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

echo "C1  Activar asked of a misspelt function — her card is never set up"
run C1 red "set_card_term answered 404" \
  "s/^export const SET_CARD_TERMS = 'set_card_terms';/export const SET_CARD_TERMS = 'set_card_term';/"

echo "C2  the days' argument misspelt — PostgREST finds no function"
run C2 red "set_card_terms answered 404" \
  '/^export interface TermsArgs {/,/^}/s/^  readonly p_expiry_days: DiasSinVenir;/  readonly p_days: DiasSinVenir;/'

echo "C3  the rewards to give under another key — the tile's dot never drawn"
run C3 red "the card carried no 'rewards_due'" \
  '/^export interface KitchenCardRow {/,/^}/s/^  readonly rewards_to_give: number;/  readonly rewards_due: number;/'

echo "C4  how a stamp came under another key — every line of Sellar dropped as unreadable"
run C4 red "a line of today's carried no 'how'" \
  "/^export interface TodayRow {/,/^}/s/^  readonly via: 'entrega' | 'su_codigo' | 'codigo_cocina';/  readonly how: 'entrega' | 'su_codigo' | 'codigo_cocina';/"

echo "C5  a phone's key asked of a misspelt function — Sellar never shows a code"
run C5 red "register_kitchen_keys answered 404" \
  "s/^export const REGISTER_KITCHEN_KEY = 'register_kitchen_key';/export const REGISTER_KITCHEN_KEY = 'register_kitchen_keys';/"

echo "C6  the scanned code's argument misspelt — Escanear a tu cliente finds nobody"
run C6 red "card_of_code answered 404" \
  '/^export interface CodeArgs {/,/^}/s/^  readonly p_code: string;/  readonly p_codigo: string;/'

echo "C7  the queue's moment misspelt — a stamp sent late never arrives"
run C7 red "give_stamp answered 404" \
  '/^export interface StampArgs {/,/^}/s/^  readonly p_at: string | null;/  readonly p_when: string | null;/'

echo "C8  her stamp today under another key — Dar sello offered twice"
run C8 red "the answer carried no 'sealed_today'" \
  '/^export interface CardRow {/,/^}/s/^  readonly stamped_today?: boolean;/  readonly sealed_today?: boolean;/'

echo "C9  a reward not hers read under another code — the generic sentence, not the right one"
run C9 red "the app reads 'TD026'" \
  "s/^export const NO_ES_SU_PREMIO = 'TD027';/export const NO_ES_SU_PREMIO = 'TD026';/"

echo "C10 her scan asked of a misspelt function — Escanear does nothing"
run C10 red "stamp_with_cod answered 404" \
  "s/^export const STAMP_WITH_CODE = 'stamp_with_code';/export const STAMP_WITH_CODE = 'stamp_with_cod';/" itacate

echo "C11 a kitchen's colonia under another key — her cards dropped as unreadable"
run C11 red "her card carried no 'barrio'" \
  '/^export interface MyCardRow extends CardStateRow {/,/^}/s/^  readonly colonia: string | null;/  readonly barrio: string | null;/' itacate

echo "C12 when a reward was won under another key — her stack dropped as unreadable"
run C12 red "a reward carried no 'won'" \
  '/^export interface RewardRow {/,/^}/s/^  readonly won_at: string;/  readonly won: string;/' itacate

echo "C13 what she claimed under another key — Cobraste never says what"
run C13 red "the answer carried no 'premio'" \
  '/^export interface ScanRow {/,/^}/s/^  readonly claimed: string | null;/  readonly premio: string | null;/' itacate

echo "C14 the reward's argument misspelt — Cobrar finds no function"
run C14 red "claim_with_code answered 404" \
  '/^export interface ClaimWithCodeArgs {/,/^}/s/^  readonly p_reward_id: string;/  readonly p_premio_id: string;/' itacate

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 15 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 15."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the card's contract check can still fail, and fails for the stated reason."

#!/usr/bin/env bash
# 10.9g-i-promotions-contract-falsify — can `10.9g-i-promotions-contract.sh` still fail, and does it
# fail for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can fail. Each fixture
# below copies ONE of the three files the check reads — Wera Cocina's `cocina/src/api/promociones.ts`
# or `cocina/src/api/listing.ts`, or Itacate's `itacate/src/api/cocinas.ts` — breaks ONE claim in the
# copy (a function's name, an argument's, a key of an answer, a refusal's code), points the check at
# it, and requires red WITH THE SENTENCE that names that claim: red for the wrong reason is a failure
# here too. The control, unedited, must be green. Since `10.9h-ii`, three more: the alert's two names and
# its answer's keys.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9g-i-promotions-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.9g-i-promotions-contract.sh"
PROMOS="cocina/src/api/promociones.ts"
LISTING="cocina/src/api/listing.ts"
COCINAS="itacate/src/api/cocinas.ts"
for f in "$CHECK" "$PROMOS" "$LISTING" "$COCINAS"; do
  [[ -r "$f" ]] || { echo "FAIL: run this from the repository root"; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program which (promos | listing | cocinas)
  local name="$1" want="$2" phrase="$3" program="$4" which="${5:-promos}"
  local p="$PROMOS" l="$LISTING" c="$COCINAS" original
  case "$which" in
    promos) original="$PROMOS" ;;
    listing) original="$LISTING" ;;
    cocinas) original="$COCINAS" ;;
  esac
  local copy="$TMP/$name.ts"
  sed "$program" "$original" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$original"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  case "$which" in
    promos) p="$copy" ;;
    listing) l="$copy" ;;
    cocinas) c="$copy" ;;
  esac
  local out rc
  out="$(bash "$CHECK" "$p" "$l" "$c" 2>&1)"; rc=$?
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

echo "P0  the control, unedited"
run P0 green "" ""

echo "P1  her promotions asked of a misspelt function — Promociones never loads"
run P1 red "kitchen_promotion answered 404" \
  "s/^export const KITCHEN_PROMOTIONS = 'kitchen_promotions';/export const KITCHEN_PROMOTIONS = 'kitchen_promotion';/"

echo "P2  Publicar promoción asked of a misspelt function — nothing is ever made"
run P2 red "create_promotions answered 404" \
  "s/^export const CREATE_PROMOTION = 'create_promotion';/export const CREATE_PROMOTION = 'create_promotions';/"

echo "P3  its last day's argument misspelt — PostgREST finds no function"
run P3 red "create_promotion answered 404" \
  '/^export interface CreateArgs {/,/^}/s/^  readonly p_ends_on: string;/  readonly p_until: string;/'

echo "P4  how many run under another key — Tienes tres activas never said"
run P4 red "the answer carried no 'active'" \
  '/^export interface PromotionsRow {/,/^}/s/^  readonly running: number;/  readonly active: number;/'

echo "P5  a promotion's conditions under another key — every one dropped as unreadable"
run P5 red "a promotion carried no 'terms'" \
  '/^export interface PromotionRow {/,/^}/s/^  readonly conditions: string;/  readonly terms: string;/'

echo "P6  three at once read under another code — the generic sentence, not Termina una"
run P6 red "the app reads 'TD028'" \
  "s/^export const TRES_ACTIVAS = 'TD029';/export const TRES_ACTIVAS = 'TD028';/"

echo "P7  Para tus clientes with no card read under another code"
run P7 red "the app reads 'TD024'" \
  "s/^export const SIN_TARJETA = 'TD030';/export const SIN_TARJETA = 'TD024';/"

echo "P8  Terminarla hoy asked of a misspelt function — it never ends"
run P8 red "end_promotions answered 404" \
  "s/^export const END_PROMOTION = 'end_promotion';/export const END_PROMOTION = 'end_promotions';/"

echo "P9  Deshacer's argument misspelt — PostgREST finds no function"
run P9 red "undo_promotion answered 404" \
  '/^export interface PromotionArgs {/,/^}/s/^  readonly p_id: string;/  readonly p_promotion_id: string;/'

echo "P10 the offer's promotion argument misspelt — publishing fails whenever she picks one"
run P10 red "the offer could not join it" \
  '/^export interface PublishArgs {/,/^}/s/^  readonly p_promotion_id?: string;/  readonly p_promo_id?: string;/' listing

echo "P11 the door's promotions under another key — the band is never drawn"
run P11 red "her kitchen carried no 'promos' list" \
  '/^export interface KitchenRow {/,/^}/s/^  readonly promotions: readonly DoorPromotionRow\[\] | null;/  readonly promos: readonly DoorPromotionRow[] | null;/' cocinas

echo "P12 a promotion's last day under another key in Itacate — hasta el … never said"
run P12 red "a promotion in the door carried no 'until'" \
  '/^export interface DoorPromotionRow {/,/^}/s/^  readonly ends_on: string;/  readonly until: string;/' cocinas

echo "P13 the offer's mark under another key — no offer ever wears it"
run P13 red "the offer carried no 'promotion'" \
  '/^export interface OfferRow {/,/^}/s/^  readonly promotion_id: string | null;/  readonly promotion: string | null;/' cocinas

echo "P14 an offer that cannot join read under another code"
run P14 red "the app reads 'TD030'" \
  "s/^export const NO_SE_PUEDE_UNIR = 'TD031';/export const NO_SE_PUEDE_UNIR = 'TD030';/"

echo "P15 whether the alert is offered asked of a misspelt function — the switch is never drawn (10.9h-ii)"
run P15 red "promotion_alert_offer answered 404" \
  "s/^export const PROMOTION_ALERT_OFFERED = 'promotion_alert_offered';/export const PROMOTION_ALERT_OFFERED = 'promotion_alert_offer';/"

echo "P16 the alert asked of a misspelt function — Avisar a quienes te siguen never reaches anyone (10.9h-ii)"
run P16 red "alert_promotions answered 404" \
  "s/^export const ALERT_PROMOTION = 'alert_promotion';/export const ALERT_PROMOTION = 'alert_promotions';/"

echo "P17 the alert's answer read under another key — every answer unreadable, every alert a failure (10.9h-ii)"
run P17 red "the alert's answer carried no 'sent'" \
  '/^export interface AlertRow {/,/^}/s/^  readonly alerted: boolean;/  readonly sent: boolean;/'

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 18 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 18."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the promotions' contract check can still fail, and fails for the stated reason."

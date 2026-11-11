#!/usr/bin/env bash
# 10.5b-iv-c-settings-contract-falsify — can `10.5b-iv-c-settings-contract.sh` still fail, and
# does it fail for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can fail. Each
# fixture below copies ONE of the four files the check reads — `cocina/src/api/ajustes.ts`,
# `calificaciones.ts`, `listing.ts` or `account.ts` — breaks ONE claim in the copy (a column, a
# key a setting is sent under, a function's name, an argument's, a key of an answer, a tag, a
# way a dish is sent under, a refusal's code, a filter of the pending read), points the check at
# it, and requires red WITH THE SENTENCE that names that claim: red for the wrong reason is a
# failure here too. The control, unedited, must be green.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5b-iv-c-settings-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.5b-iv-c-settings-contract.sh"
AJUSTES="cocina/src/api/ajustes.ts"
CALIFICACIONES="cocina/src/api/calificaciones.ts"
LISTING="cocina/src/api/listing.ts"
ACCOUNT="cocina/src/api/account.ts"
for f in "$CHECK" "$AJUSTES" "$CALIFICACIONES" "$LISTING" "$ACCOUNT"; do
  [[ -r "$f" ]] || { echo "FAIL: run this from the repository root"; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program which (ajustes | calificaciones | listing | account)
  local name="$1" want="$2" phrase="$3" program="$4" which="${5:-ajustes}"
  local a="$AJUSTES" c="$CALIFICACIONES" l="$LISTING" k="$ACCOUNT" original
  case "$which" in
    ajustes) original="$AJUSTES" ;;
    calificaciones) original="$CALIFICACIONES" ;;
    listing) original="$LISTING" ;;
    account) original="$ACCOUNT" ;;
  esac
  local copy="$TMP/$name.ts"
  sed "$program" "$original" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$original"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  case "$which" in
    ajustes) a="$copy" ;;
    calificaciones) c="$copy" ;;
    listing) l="$copy" ;;
    account) k="$copy" ;;
  esac
  local out rc
  out="$(bash "$CHECK" "$a" "$c" "$l" "$k" 2>&1)"; rc=$?
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

echo "C1  a setting's column misspelt — the read is refused, and every row of Mi cocina says it could not read"
run C1 red "her settings' read answered 400" \
  "s/^export const AJUSTES_COLUMNS = 'accepts_card,/export const AJUSTES_COLUMNS = 'accept_card,/"

echo "C2  a setting sent under a key the door does not read — a 200 that saved nothing"
run C2 red "her settings carried no 'accepts_cards'" \
  '/^export interface AjustesFields {/,/^}/s/^  readonly accepts_card: boolean;/  readonly accepts_cards: boolean;/'

echo "C3  the door's argument misspelt — PostgREST finds no function, and no switch ever saves"
run C3 red "set_kitchen_page answered 404" \
  '/^export interface SetAjustesArgs {/,/^}/s/^  readonly p_page: AjustesPatch;/  readonly p_pagina: AjustesPatch;/'

echo "C4  her settings filtered on a column the table lacks — the read is refused"
run C4 red "her settings' read answered 400" \
  "s/^export const AJUSTES_OWNER_COLUMN = 'workspace_id';/export const AJUSTES_OWNER_COLUMN = 'kitchen_id';/"

echo "C5  her stars asked of a misspelt function — Tus calificaciones never reads"
run C5 red "my_kitchen_rating answered 404" \
  "s/^export const MY_KITCHEN_RATINGS = 'my_kitchen_ratings';/export const MY_KITCHEN_RATINGS = 'my_kitchen_rating';/" calificaciones

echo "C6  the average read under a key the database does not send — her stars drawn as none"
run C6 red "her stars carried no 'avg'" \
  '/^export interface RatingsRow {/,/^}/s/^  readonly average?: string;/  readonly avg?: string;/' calificaciones

echo "C7  yesterday's stars read under another key — De ayer would be empty"
run C7 red "yesterday's rating carried" \
  '/^export interface YesterdayRow {/,/^}/s/^  readonly stars: number;/  readonly estrellas: number;/' calificaciones

echo "C8  a tag misspelt — Lo que más dicen would never count it"
run C8 red "the tags carried no 'muy_rico'" \
  "s/^  'muy_rica',$/  'muy_rico',/" calificaciones

echo "C9  the offer's desechable not read — her preview would show none on every offer"
run C9 red "the offer carried no 'container_price'" \
  "s/^export const LISTING_COLUMNS = 'id,location_id,pickup_start,pickup_end,created_at,withdrawn_at,container_price,/export const LISTING_COLUMNS = 'id,location_id,pickup_start,pickup_end,created_at,withdrawn_at,/" listing

echo "C10 a line's way misspelt in the read — PostgREST refuses it, and her list never shows"
run C10 red "her list's read answered 400" \
  "s/,para_llevar,para_aqui)';$/,para_llevar,para_aquí)';/" listing

echo "C11 a way sent under a key publish_listing does not read — a dish published wider than she chose"
run C11 red "the ways came back" \
  '/^export interface LineBody {/,/^}/s/^  readonly para_aqui: boolean | null;/  readonly para_comer: boolean | null;/' listing

echo "C12 − and + asked of a misspelt function — no tap ever lands"
run C12 red "set_listing_quantities answered 404" \
  "s/^export const SET_LISTING_QUANTITY = 'set_listing_quantity';/export const SET_LISTING_QUANTITY = 'set_listing_quantities';/" listing

echo "C13 − and +'s argument misspelt — PostgREST finds no function"
run C13 red "set_listing_quantity answered 404" \
  '/^export interface SetQuantityArgs {/,/^}/s/^  readonly p_line_no: number;/  readonly p_line: number;/' listing

echo "C14 what is taken read under another key — the answer could not be read and every tap would fail"
run C14 red "its answer carried no 'tomado'" \
  '/^export interface QuantityRow {/,/^}/s/^  readonly taken: string;/  readonly tomado: string;/' listing

echo "C15 below-what-is-reserved read under another code — she would read the app's generic sentence"
run C15 red "the app reads 'TD018'" \
  "s/^  TD019: 'apartados',/  TD018: 'apartados',/" listing

echo "C16 the pending read's hold misspelt — refused, and Apple would be told before every refused deletion"
run C16 red "the pending read answered 400" \
  "s/^export const PENDING_UNTIL_COLUMN = 'held_until';/export const PENDING_UNTIL_COLUMN = 'held_till';/" account

echo "C17 one of the pending read's moments misspelt — refused"
run C17 red "the pending read answered 400" \
  "s/^export const PENDING_NULL_COLUMNS = 'handed_over_at,picked_up_at,cancelled_at';/export const PENDING_NULL_COLUMNS = 'handed_over_at,collected_at,cancelled_at';/" account

echo "C18 the pending read asks a table that does not exist"
run C18 red "the pending read answered 404" \
  "s/^export const PENDING_TABLE = 'reservation';/export const PENDING_TABLE = 'reservations';/" account

echo "C19 the plate-pending refusal read under another code — the deletion would say something else"
run C19 red "the app reads 'TD015'" \
  "s/^export const PLATE_PENDING_CODE = 'TD014';/export const PLATE_PENDING_CODE = 'TD015';/" account

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 20 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 20."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the settings contract check can still fail, and fails for the stated reason."

#!/usr/bin/env bash
# 10.9a-i-features-contract-falsify — can `10.9a-i-features-contract.sh` still fail, and does it
# fail for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can fail. Each
# fixture below copies ONE of the two files the check reads — `cocina/src/api/servicios.ts` or
# Itacate's `itacate/src/api/cocinas.ts` — breaks ONE claim in the copy (a function's name, an
# argument's, a key of the answer, a feature, a state, the refusal's code, the door's key),
# points the check at it, and requires red WITH THE SENTENCE that names that claim: red for the
# wrong reason is a failure here too. The control, unedited, must be green.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9a-i-features-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.9a-i-features-contract.sh"
SERVICIOS="cocina/src/api/servicios.ts"
COCINAS="itacate/src/api/cocinas.ts"
for f in "$CHECK" "$SERVICIOS" "$COCINAS"; do
  [[ -r "$f" ]] || { echo "FAIL: run this from the repository root"; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program which (servicios | cocinas)
  local name="$1" want="$2" phrase="$3" program="$4" which="${5:-servicios}"
  local s="$SERVICIOS" c="$COCINAS" original
  case "$which" in
    servicios) original="$SERVICIOS" ;;
    cocinas) original="$COCINAS" ;;
  esac
  local copy="$TMP/$name.ts"
  sed "$program" "$original" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$original"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  case "$which" in
    servicios) s="$copy" ;;
    cocinas) c="$copy" ;;
  esac
  local out rc
  out="$(bash "$CHECK" "$s" "$c" 2>&1)"; rc=$?
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

echo "C1  the read asked of a misspelt function — Lo que usas and Hoy's tiles never read"
run C1 red "my_kitchen_feature answered 404" \
  "s/^export const MY_KITCHEN_FEATURES = 'my_kitchen_features';/export const MY_KITCHEN_FEATURES = 'my_kitchen_feature';/"

echo "C2  the read's argument misspelt — PostgREST finds no function"
run C2 red "my_kitchen_features answered 404" \
  '/^export interface FeaturesArgs {/,/^}/s/^  readonly p_workspace_id: string;/  readonly p_kitchen_id: string;/'

echo "C3  a key of the answer misspelt — her choices drawn as none"
run C3 red "the answer carried no 'menu_request'" \
  '/^export interface FeaturesRow {/,/^}/s/^  readonly menu_requests: number;/  readonly menu_request: number;/'

echo "C4  a key of each choice misspelt — every tile reads no state"
run C4 red "a choice carried no 'estado'" \
  '/^export interface FeatureRow {/,/^}/s/^  readonly state: string;/  readonly estado: string;/'

echo "C5  the write's name misspelt — no choice ever lands"
run C5 red "set_kitchen_feature answered 404" \
  "s/^export const SET_KITCHEN_FEATURES = 'set_kitchen_features';/export const SET_KITCHEN_FEATURES = 'set_kitchen_feature';/"

echo "C6  the write's argument misspelt — PostgREST finds no function"
run C6 red "set_kitchen_features answered 404" \
  '/^export interface SetFeaturesArgs {/,/^}/s/^  readonly p_choices:/  readonly p_features:/'

echo "C7  a feature misspelt — her tap on it is refused, never kept"
run C7 red "set_kitchen_features answered 400 for every feature" \
  "s/^export const SERVICIOS = \['tarjeta', 'promociones', 'numeros', 'menu'\] as const;/export const SERVICIOS = ['tarjeta', 'promociones', 'numeros', 'menú'] as const;/"

echo "C8  a state misspelt — Me interesa would be refused"
run C8 red "set_kitchen_features answered 400 for every feature" \
  "s/^export const ESTADOS = \['on', 'off', 'interesada'\] as const;/export const ESTADOS = ['on', 'apagada', 'interesada'] as const;/"

echo "C9  not-offered read under another code — she would read the generic sentence"
run C9 red "the app reads 'TD023'" \
  "s/^export const NO_SE_OFRECE = 'TD024';/export const NO_SE_OFRECE = 'TD023';/"

echo "C10 Cuéntanos asked of a misspelt function — what she writes never arrives"
run C10 red "send_menu_requests answered 404" \
  "s/^export const SEND_MENU_REQUEST = 'send_menu_request';/export const SEND_MENU_REQUEST = 'send_menu_requests';/"

echo "C11 Cuéntanos' text sent under another name — PostgREST finds no function"
run C11 red "send_menu_request answered 404" \
  '/^export interface MenuRequestArgs {/,/^}/s/^  readonly p_text: string;/  readonly p_body: string;/'

echo "C12 Itacate reads the door's services under another key — no kitchen would ever use anything"
run C12 red "her kitchen carried no 'servicios'" \
  '/^export interface KitchenRow {/,/^}/s/^  readonly features: readonly string\[\] | null;/  readonly servicios: readonly string[] | null;/' cocinas

echo "C13 Itacate does not know the card — the door would send a name it ignores"
run C13 red "which Itacate does not know" \
  "s/^export const SERVICIOS_VISTOS = \['tarjeta', 'promociones'\] as const;/export const SERVICIOS_VISTOS = ['promociones'] as const;/" cocinas

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 14 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 14."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the features contract check can still fail, and fails for the stated reason."

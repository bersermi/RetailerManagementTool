#!/usr/bin/env bash
# 10.9d-i-following-contract-falsify — can `10.9d-i-following-contract.sh` still fail, and does it
# fail for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can fail. Each
# fixture below copies ONE of the two files the check reads — Itacate's
# `itacate/src/api/siguiendo.ts` or Wera Cocina's `cocina/src/api/seguidores.ts` — breaks ONE
# claim in the copy (a function's name, an argument's, a key of an answer, the refusal's code),
# points the check at it, and requires red WITH THE SENTENCE that names that claim: red for the
# wrong reason is a failure here too. The control, unedited, must be green.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9d-i-following-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.9d-i-following-contract.sh"
SIGUIENDO="itacate/src/api/siguiendo.ts"
SEGUIDORES="cocina/src/api/seguidores.ts"
for f in "$CHECK" "$SIGUIENDO" "$SEGUIDORES"; do
  [[ -r "$f" ]] || { echo "FAIL: run this from the repository root"; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program which (siguiendo | seguidores)
  local name="$1" want="$2" phrase="$3" program="$4" which="${5:-siguiendo}"
  local i="$SIGUIENDO" c="$SEGUIDORES" original
  case "$which" in
    siguiendo) original="$SIGUIENDO" ;;
    seguidores) original="$SEGUIDORES" ;;
  esac
  local copy="$TMP/$name.ts"
  sed "$program" "$original" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$original"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  case "$which" in
    siguiendo) i="$copy" ;;
    seguidores) c="$copy" ;;
  esac
  local out rc
  out="$(bash "$CHECK" "$i" "$c" 2>&1)"; rc=$?
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

echo "C1  Seguir asked of a misspelt function — her tap does nothing"
run C1 red "set_my_folow answered 404" \
  "s/^export const SET_MY_FOLLOW = 'set_my_follow';/export const SET_MY_FOLLOW = 'set_my_folow';/"

echo "C2  the bell's argument misspelt — PostgREST finds no function"
run C2 red "set_my_follow answered 404" \
  '/^export interface FollowArgs {/,/^}/s/^  readonly p_bell: boolean | null;/  readonly p_campana: boolean | null;/'

echo "C3  a switch of the answer misspelt — Seguir drawn off after she taps it"
run C3 red "the answer carried no 'follows'" \
  '/^export interface FollowStateRow {/,/^}/s/^  readonly following: boolean;/  readonly follows: boolean;/'

echo "C4  her list asked of a misspelt function — Mis cocinas never read"
run C4 red "my_follow answered 404" \
  "s/^export const MY_FOLLOWS = 'my_follows';/export const MY_FOLLOWS = 'my_follow';/"

echo "C5  the list of kitchens that left under another key — dejó Wera never said"
run C5 red "the answer carried no 'left'" \
  '/^export interface FollowsRow {/,/^}/s/^  readonly gone: readonly GoneRow\[\];/  readonly left: readonly GoneRow[];/'

echo "C6  a kitchen's last day under another key — publicó hoy never drawn"
run C6 red "a kitchen carried no 'last_dia'" \
  '/^export interface FollowRow {/,/^}/s/^  readonly last_day: string | null;/  readonly last_dia: string | null;/'

echo "C7  a kitchen's switch under another key — Mis cocinas' bell never drawn"
run C7 red "a kitchen carried no 'follows'" \
  '/^export interface FollowRow {/,/^}/s/^  readonly following: boolean;/  readonly follows: boolean;/'

echo "C8  when a kitchen left under another key — the kitchen that left dropped as unreadable"
run C8 red "a kitchen that left carried no 'left_at'" \
  '/^export interface GoneRow {/,/^}/s/^  readonly gone_at: string;/  readonly left_at: string;/'

echo "C9  not-a-kitchen read under another code — she would read the generic sentence"
run C9 red "the app reads 'TD025'" \
  "s/^export const NO_ES_COCINA = 'TD026';/export const NO_ES_COCINA = 'TD025';/"

echo "C10 Te siguen N asked of a misspelt function — the day's card never says it"
run C10 red "kitchen_follower answered 404" \
  "s/^export const KITCHEN_FOLLOWERS = 'kitchen_followers';/export const KITCHEN_FOLLOWERS = 'kitchen_follower';/" seguidores

echo "C11 Te siguen N's argument misspelt — PostgREST finds no function"
run C11 red "kitchen_followers answered 404" \
  '/^export interface FollowersArgs {/,/^}/s/^  readonly p_workspace_id: string;/  readonly p_kitchen_id: string;/' seguidores

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 12 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 12."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the following contract check can still fail, and fails for the stated reason."

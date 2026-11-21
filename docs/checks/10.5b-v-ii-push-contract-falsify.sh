#!/usr/bin/env bash
# 10.5b-v-ii-push-contract-falsify — can `10.5b-v-ii-push-contract.sh` still fail, and does it fail
# for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can fail. Each fixture
# below copies Wera Cocina's `cocina/src/api/push.ts`, breaks ONE claim in the copy (a function's
# name, an argument's, the app's name, its kind's, a key of a kind), points the check at it, and
# requires red WITH THE SENTENCE that names that claim: red for the wrong reason is a failure here
# too. The control, unedited, must be green.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5b-v-ii-push-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.5b-v-ii-push-contract.sh"
PUSH="cocina/src/api/push.ts"
for f in "$CHECK" "$PUSH"; do
  [[ -r "$f" ]] || { echo "FAIL: run this from the repository root"; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program
  local name="$1" want="$2" phrase="$3" program="$4"
  local copy="$TMP/$name.ts"
  sed "$program" "$PUSH" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$PUSH"; then
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

echo "P0  the control, unedited"
run P0 green "" ""

echo "P1  the token sent to a misspelt function — no fonda's phone ever reaches the database"
run P1 red "register_push_toke answered 404" \
  "s/^export const REGISTER_PUSH_TOKEN = 'register_push_token';/export const REGISTER_PUSH_TOKEN = 'register_push_toke';/"

echo "P2  the token's argument misspelt — PostgREST finds no function"
run P2 red "register_push_token answered 404" \
  '/^export interface RegisterArgs {/,/^}/s/^  readonly p_token: string;/  readonly p_push_token: string;/'

echo "P3  the channels under another name — PostgREST finds no function, and Android would drop every message"
run P3 red "register_push_token answered 404" \
  '/^export interface RegisterArgs {/,/^}/s/^  readonly p_channels: readonly string\[\];/  readonly p_canales: readonly string[];/'

echo "P4  the replaced token under another name — a changed token never retires the old"
run P4 red "register_push_token answered 404" \
  '/^export interface RegisterArgs {/,/^}/s/^  readonly p_replaces: string | null;/  readonly p_old_token: string | null;/'

echo "P5  Cerrar sesión asked of a misspelt function — her phone keeps getting her kitchen's messages"
run P5 red "retire_push_tokens answered 404" \
  "s/^export const RETIRE_PUSH_TOKEN = 'retire_push_token';/export const RETIRE_PUSH_TOKEN = 'retire_push_tokens';/"

echo "P6  her kinds asked of a misspelt function — no channel made, no switch drawn"
run P6 red "my_notification_kind answered 404" \
  "s/^export const MY_NOTIFICATION_KINDS = 'my_notification_kinds';/export const MY_NOTIFICATION_KINDS = 'my_notification_kind';/"

echo "P7  the app under another name — the database knows no such app"
run P7 red "my_notification_kinds answered 400" \
  "s/^export const APP = 'cocina';/export const APP = 'wera_cocina';/"

echo "P8  a kind's channel under another key — the channel never made, every message dropped"
run P8 red "a kind carried no 'canal'" \
  '/^export interface KindRow {/,/^}/s/^  readonly channel: string;/  readonly canal: string;/'

echo "P9  a kind's switch under another key — her switch drawn from nothing"
run P9 red "a kind carried no 'on'" \
  '/^export interface KindRow {/,/^}/s/^  readonly is_on: boolean;/  readonly on: boolean;/'

echo "P10 the kind under another name — the switch and the tap aimed at nothing"
run P10 red "no kind 'apartado'" \
  "s/^export const APARTADOS = 'apartados';/export const APARTADOS = 'apartado';/"

echo "P11 her switch's argument misspelt — Mi cocina's switch does nothing"
run P11 red "set_notification_switch answered 404" \
  '/^export interface SwitchArgs {/,/^}/s/^  readonly p_on: boolean;/  readonly p_is_on: boolean;/'

echo "P12 a tap counted by a misspelt function"
run P12 red "count_notification_taps answered 404" \
  "s/^export const COUNT_NOTIFICATION_TAP = 'count_notification_tap';/export const COUNT_NOTIFICATION_TAP = 'count_notification_taps';/"

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 13 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 13."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the push contract check can still fail, and fails for the stated reason."

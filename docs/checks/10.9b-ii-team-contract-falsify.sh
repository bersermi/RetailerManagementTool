#!/usr/bin/env bash
# 10.9b-ii-team-contract-falsify — can `10.9b-ii-team-contract.sh` still fail, and does it fail for
# the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can fail. Each fixture
# below copies `cocina/src/api/equipo.ts`, breaks ONE claim in the copy (a function's name, an
# argument's, a role, the owner's role, the table, a column, a key of a row, a filter, the refusal's
# code), points the check at it, and requires red WITH THE SENTENCE that names that claim: red for
# the wrong reason is a failure here too. The control, unedited, must be green. ⚠️ C11 is the one
# that matters most: *Quitar*'s guard on the wrong column ends the OWNER's own membership. ⚠️ Since
# `10.9b-iii` the J fixtures break `cocina/src/api/invitar.ts` instead — joining by a code.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9b-ii-team-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.9b-ii-team-contract.sh"
EQUIPO="cocina/src/api/equipo.ts"
INVITAR="cocina/src/api/invitar.ts"
for f in "$CHECK" "$EQUIPO" "$INVITAR"; do
  [[ -r "$f" ]] || { echo "FAIL: run this from the repository root"; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program [file: equipo | invitar]
  local name="$1" want="$2" phrase="$3" program="$4" which="${5:-equipo}"
  local real="$EQUIPO"; [[ "$which" == invitar ]] && real="$INVITAR"
  local copy="$TMP/$name.ts"
  sed "$program" "$real" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$real"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  local out rc
  if [[ "$which" == invitar ]]; then out="$(bash "$CHECK" "$EQUIPO" "$copy" 2>&1)"; rc=$?
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

echo "C1  her role asked of a misspelt function — every phone would read no role"
run C1 red "my_roles answered 404" \
  "s/^export const MY_ROLE = 'my_role';/export const MY_ROLE = 'my_roles';/"

echo "C2  her role's argument misspelt — PostgREST finds no function"
run C2 red "my_role answered 404" \
  '/^export interface RoleArgs {/,/^}/s/^  readonly p_workspace_id: string;/  readonly p_kitchen_id: string;/'

echo "C3  a role misspelt — the owner's answer would be one the app does not know"
run C3 red "not one of the app's" \
  "s/^export const ROLES = \['owner', 'manager', 'staff'\] as const;/export const ROLES = ['duena', 'manager', 'staff'] as const;/"

echo "C4  the owner's role named wrong — the owner would get a helper's screens"
run C4 red "the app would draw a helper's" \
  "s/^export const DUENA = 'owner';/export const DUENA = 'manager';/"

echo "C5  the list asked of a misspelt table"
run C5 red "the list answered 404" \
  "s/^export const MEMBERS_TABLE = 'workspace_member';/export const MEMBERS_TABLE = 'workspace_members';/"

echo "C6  a column of the list misspelt — the owner's list never draws"
run C6 red "the list answered 400" \
  "s/^export const MEMBER_COLUMNS = 'user_id,role,display_name';/export const MEMBER_COLUMNS = 'user_id,role,name';/"

echo "C7  a key of each row misspelt — every name drawn as none"
run C7 red "not the app's" \
  '/^export interface MemberRow {/,/^}/s/^  readonly display_name: string | null;/  readonly nombre: string | null;/'

echo "C8  the list's kitchen filter misspelt"
run C8 red "the list answered 400" \
  "s/^export const MEMBER_KITCHEN_COLUMN = 'workspace_id';/export const MEMBER_KITCHEN_COLUMN = 'kitchen_id';/"

echo "C9  the active filter misspelt — a removed helper would stay on the list, or the list fail"
run C9 red "the list answered 400" \
  "s/^export const MEMBER_ACTIVE_COLUMN = 'is_active';/export const MEMBER_ACTIVE_COLUMN = 'active';/"

echo "C10 Quitar aimed by the wrong column — it ends nobody's membership"
run C10 red "Quitar answered 406" \
  "s/^export const MEMBER_USER_COLUMN = 'user_id';/export const MEMBER_USER_COLUMN = 'id';/"

echo "C11 ⚠️ Quitar's guard on the wrong column — the owner's own membership would end"
run C11 red "Quitar on an owner" \
  "s/^export const MEMBER_ROLE_COLUMN = 'role';/export const MEMBER_ROLE_COLUMN = 'display_name';/"

echo "C12 Salir asked of a misspelt function — her tap does nothing"
run C12 red "leave_kitchn answered 404" \
  "s/^export const LEAVE_KITCHEN = 'leave_kitchen';/export const LEAVE_KITCHEN = 'leave_kitchn';/"

echo "C13 Salir's argument misspelt — PostgREST finds no function"
run C13 red "leave_kitchen answered 404" \
  '/^export interface LeaveArgs {/,/^}/s/^  readonly p_workspace_id: string;/  readonly p_kitchen_id: string;/'

echo "C14 the owner's refusal read under another code — she would read the generic sentence"
run C14 red "the app reads 'TD024'" \
  "s/^export const OWNER_STAYS_CODE = 'TD025';/export const OWNER_STAYS_CODE = 'TD024';/"

echo "J1  Invitar asked of a misspelt function — the owner's sheet never shows a code"
run J1 red "FAIL: invite_helpr answered 404" \
  "s/^export const INVITE_HELPER = 'invite_helper';/export const INVITE_HELPER = 'invite_helpr';/" invitar

echo "J2  a key of the code's answer misspelt — the sheet draws no code"
run J2 red "not the app's {token,expira}" \
  '/^export interface InviteAnswer {/,/^}/s/^  readonly expires_at: string;/  readonly expira: string;/' invitar

echo "J3  the kitchen's name asked of a misspelt function — Unirme never says whose kitchen"
run J3 red "kitchen_of_cod answered 404" \
  "s/^export const KITCHEN_OF_CODE = 'kitchen_of_code';/export const KITCHEN_OF_CODE = 'kitchen_of_cod';/" invitar

echo "J4  the code's argument misspelt — PostgREST finds neither function"
run J4 red "kitchen_of_code answered 404" \
  '/^export interface CodeArgs {/,/^}/s/^  readonly p_token: string;/  readonly p_codigo: string;/' invitar

echo "J5  a key of the join's answer misspelt — her kitchen never enters her list"
run J5 red "without the app's ['nombre']" \
  '/^export interface JoinAnswer {/,/^}/s/^  readonly workspace_name: string;/  readonly nombre: string;/' invitar

echo "J6  a dead code read under another code — she would read the generic sentence, not to ask for another"
run J6 red "the app reads 'TD004'" \
  "s/^export const CODE_DEAD = 'TD005';/export const CODE_DEAD = 'TD004';/" invitar

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 21 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 21."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the team contract check can still fail, and fails for the stated reason."

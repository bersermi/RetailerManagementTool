#!/usr/bin/env bash
# 10.4b-iii-a-cocina-contract-falsify — can `10.4b-iii-a-cocina-contract.sh`
# still fail, and does it fail for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can
# fail. Each fixture below copies `cocina/src/api/kitchen.ts`,
# `cocina/src/auth/credentials.ts`, `cocina/src/api/place.ts` or
# `cocina/src/api/account.ts`, breaks ONE claim in the copy, points the check at
# it, and requires red WITH THE SENTENCE that names that claim — red for the
# wrong reason is a failure here too. The control, unedited, must be green.
# C7–C13 are `10.4b-iii-b`'s: making her kitchen. C14–C17 are `10.4b-iii-c`'s:
# her way out. C18–C19 are `10.4h`'s: her line with no pin, and her pin cleared.
# C20–C21 are `10.5-iii-b`'s: Itacate's way out drifting from Wera Cocina's —
# each refused before any sign-up, so each costs a second. ⚠️ And since then
# C14–C17 break Itacate's copy the same way as Wera Cocina's (`run`'s `account`
# target): the deletion's names are one engine in two files, and broken in one
# alone the comparison refused them first — red for the wrong reason, which is
# what this harness's first run of `10.5-iii-b` found.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.4b-iii-a-cocina-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.4b-iii-a-cocina-contract.sh"
KITCHEN="cocina/src/api/kitchen.ts"
CREDENTIALS="cocina/src/auth/credentials.ts"
PLACE="cocina/src/api/place.ts"
ACCOUNT="cocina/src/api/account.ts"
ITACATE="itacate/src/api/account.ts"
[[ -r "$CHECK" && -r "$KITCHEN" && -r "$CREDENTIALS" && -r "$PLACE" && -r "$ACCOUNT" && -r "$ITACATE" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase target(kitchen|credentials|place|account|itacate) sed-program
  local name="$1" want="$2" phrase="$3" target="$4" program="$5"
  local real="$KITCHEN"
  [[ "$target" == credentials ]] && real="$CREDENTIALS"
  [[ "$target" == place ]] && real="$PLACE"
  [[ "$target" == account ]] && real="$ACCOUNT"
  [[ "$target" == itacate ]] && real="$ITACATE"
  local copy="$TMP/$name.ts"
  sed "$program" "$real" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$real"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  local out rc k="$KITCHEN" c="$CREDENTIALS" p="$PLACE" a="$ACCOUNT" i="$ITACATE"
  case "$target" in
    credentials) c="$copy" ;;
    place) p="$copy" ;;
    account)
      # ⚠️ `10.5-iii-b`: THE DELETION'S NAMES ARE ONE ENGINE IN TWO FILES — the
      # check's first group refuses Itacate's differing from Wera Cocina's, before
      # any request — so a break in it is made in BOTH, and what must turn red is
      # the group that asks PostgREST. Broken in Cocina's alone, every one of these
      # was red at the comparison instead: the reason, not the database's answer.
      a="$copy"
      i="$TMP/$name-itacate.ts"
      sed "$program" "$ITACATE" > "$i"
      if cmp -s "$i" "$ITACATE"; then
        echo "  ✗ $name — THE MUTATION DOES NOT APPLY TO ITACATE'S COPY: the two files no longer share the line it breaks."
        fail=$((fail+1)); return
      fi
      ;;
    itacate) i="$copy" ;;
    *) k="$copy" ;;
  esac
  out="$(bash "$CHECK" "$k" "$c" "$p" "$a" "$i" 2>&1)"; rc=$?
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
run C0 green "" kitchen ""

echo "C1  the kind is spelt as no account is — the database refuses the value"
run C1 red "the app's read answered 400" kitchen \
  "s/^export const COCINA_KIND = 'cocina';/export const COCINA_KIND = 'fonda';/"

echo "C2  the filter asks for the other kind — a shop's owner would open her shop here"
run C2 red "a shop's owner would be in her shop" kitchen \
  "s/^export const COCINA_KIND = 'cocina';/export const COCINA_KIND = 'tienda';/"

echo "C3  a column is misspelt — PostgREST refuses every read"
run C3 red "the app's read answered 400" kitchen \
  "s/^export const KITCHEN_COLUMNS = 'id,display_name,giro_principal';/export const KITCHEN_COLUMNS = 'id,display_name,giro';/"

echo "C4  ordered by name and not by creation — another kitchen would open"
run C4 red "the read returned" kitchen \
  "s/^export const KITCHEN_ORDER = 'created_at,id';/export const KITCHEN_ORDER = 'display_name,id';/"

echo "C5  the name is stored under a key the database does not read"
run C5 red "the name was stored under a key the database does not read" credentials \
  "s/^export const FULL_NAME_KEY = 'full_name';/export const FULL_NAME_KEY = 'name';/"

echo "C6  a claim is gone from the file — the check must refuse, not pass"
run C6 red "could not read KIND_COLUMN" kitchen '/^export const KIND_COLUMN = /d'

echo "C7  her trade's column is misspelt — the update is refused, and she would never have one"
run C7 red "the app's trade update answered 400" kitchen \
  "s/^export const GIRO_COLUMN = 'giro_principal';/export const GIRO_COLUMN = 'giro';/"

echo "C8  the trades' door is misspelt — the form would have no list to choose from"
run C8 red "the trades' door answered 404" kitchen \
  "s/^export const KITCHEN_GIROS = 'kitchen_giros';/export const KITCHEN_GIROS = 'giros_cocina';/"

echo "C9  the kind's argument is renamed — no kitchen can be made"
run C9 red "could not make the kitchen as the app does" kitchen \
  's/^  readonly p_kind: typeof COCINA_KIND;/  readonly p_tipo: typeof COCINA_KIND;/'

echo "C10 the place is read by the wrong column — her kitchen's place is not found"
run C10 red "returned 0 rows, expected its one place" place \
  "s/^export const PLACE_OWNER_COLUMN = 'workspace_id';/export const PLACE_OWNER_COLUMN = 'id';/"

echo "C11 an address argument is renamed — her address is never written"
run C11 red "her address, set_store_address(" place \
  's/^  readonly p_street: string;/  readonly p_calle: string;/'

echo "C12 a pin argument is renamed — her pin is never set"
run C12 red "her pin, set_store_pin(" place \
  's/^  readonly p_lat: number;/  readonly p_latitud: number;/'

echo "C13 a place column is misspelt — PostgREST refuses the read"
run C13 red "the app's place read answered 400" place \
  "s/^export const PLACE_COLUMNS = 'id,name,street,street_number,colonia,city,postal_code,pin_lat,pin_lng,directions';/export const PLACE_COLUMNS = 'id,name,street,street_number,colonia,city,postal_code,lat,pin_lng,directions';/"

echo "C14 the owners read embeds a column the table has not — PostgREST refuses it, and nothing could be deleted"
run C14 red "the app's owners read answered 400" account \
  "s/^export const OWNER_COLUMNS = 'workspace_id,user_id,workspace(display_name,kind)';/export const OWNER_COLUMNS = 'workspace_id,user_id,workspace(display_name,tipo)';/"

echo "C15 the read asks for managers, not owners — the screen would say nothing goes, and every deletion be refused"
run C15 red "what goes with her account: the owners read named businesses" account \
  "s/^export const OWNER_ROLE = 'owner';/export const OWNER_ROLE = 'manager';/"

echo "C16 the names' argument is renamed — PostgREST finds no such function"
run C16 red "the deletion with a name missing answered 404" account \
  's/^  readonly p_business_names: readonly string\[\];/  readonly p_nombres: readonly string[];/'

echo "C17 the deletion's function is misspelt — every deletion would be a 404"
run C17 red "the deletion with a name missing answered 404" account \
  "s/^export const DELETE_MY_ACCOUNT = 'delete_my_account';/export const DELETE_MY_ACCOUNT = 'delete_account';/"

echo "C18 her line's door is misspelt — a line written with no pin would be a 404"
run C18 red "her line, set_store_direcciones(" place \
  "s/^export const SET_STORE_DIRECTIONS = 'set_store_directions';/export const SET_STORE_DIRECTIONS = 'set_store_direcciones';/"

echo "C19 the clearing's argument is renamed — a new street or number would never clear her pin"
run C19 red "her pin cleared, clear_store_pin(" place \
  '/^export interface ClearStorePinArgs {/,/^}/ s/^  readonly p_location_id: string;/  readonly p_lugar: string;/'

echo "C20 Itacate's owners read drifts from Wera Cocina's — a read no group here has sent"
run C20 red "Itacate's OWNER_COLUMNS is" itacate \
  "s/^export const OWNER_COLUMNS = 'workspace_id,user_id,workspace(display_name,kind)';/export const OWNER_COLUMNS = 'workspace_id,user_id,workspace(display_name)';/"

echo "C21 Itacate's names' argument is renamed — a body no group here has sent"
run C21 red "Itacate's DeleteArgs is" itacate \
  's/^  readonly p_business_names: readonly string\[\];/  readonly p_nombres: readonly string[];/'

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 22 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 22."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the Cocina contract check can still fail, and fails for the stated reason."

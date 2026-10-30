#!/usr/bin/env bash
# ============================================================================
# 5R-c — can the account-deletion contract check still fail?
# ============================================================================
# Hands `5R-c-account-deletion-contract.sh` a broken COPY of an app module and
# requires it to go red FOR THE REASON the fixture names. A check that can only
# pass asserts nothing. Needs the same local Supabase as the check itself.
# ============================================================================

set -uo pipefail

CHECK="docs/checks/5R-c-account-deletion-contract.sh"
CONTRACT="app/src/api/account.ts"
MEMBERS="app/src/api/members.ts"
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

passed=0
failed=0

fixture() { # name file-to-mutate sed-expression expected-reason-regex
  local name="$1" which="$2" expr="$3" reason="$4"
  local contract="$CONTRACT" members="$MEMBERS"
  local copy="$SCRATCH/$name.ts"
  sed "$expr" "$which" > "$copy"
  if cmp -s "$copy" "$which"; then
    echo "BROKEN FIXTURE $name: the mutation changed nothing"; failed=$((failed+1)); return
  fi
  [[ "$which" == "$CONTRACT" ]] && contract="$copy" || members="$copy"
  local out rc
  out="$(bash "$CHECK" "$contract" "$members" 2>&1)"; rc=$?
  if (( rc != 0 )) && grep -Eq "$reason" <<< "$out"; then
    echo "  ok    $name — red, for the reason"; passed=$((passed+1))
  else
    echo "FAIL: $name — rc=$rc, and the output did not match /$reason/:"
    grep -E '^FAIL' <<< "$out" | head -3
    failed=$((failed+1))
  fi
}

fixture renamed-argument "$CONTRACT" \
  's/^  readonly p_shop_name:/  readonly p_shop:/' \
  'DeleteArgs names .*p_shop'
fixture wrong-refusal-code "$CONTRACT" \
  "s/^export const NAME_MISMATCH_CODE = 'TD007';/export const NAME_MISMATCH_CODE = '42501';/" \
  'the wrong name answered 400'
fixture name-not-read "$MEMBERS" \
  "s/^export const MEMBER_COLUMNS = 'user_id,role,is_active,display_name';/export const MEMBER_COLUMNS = 'user_id,role,is_active';/" \
  'her membership read back'
# `10.4b-i` (`0073`): the list argument, and the read that says what goes.
fixture renamed-list-argument "$CONTRACT" \
  's/^  readonly p_business_names?:/  readonly p_names?:/' \
  'DeleteArgs names .*p_names'
fixture owners-read-not-owners "$CONTRACT" \
  "s/^export const OWNER_ROLE = 'owner';/export const OWNER_ROLE = 'manager';/" \
  'the owners read is not what businessesThatGo needs'
fixture owners-read-without-kind "$CONTRACT" \
  "s/^export const OWNER_COLUMNS = 'workspace_id,user_id,workspace(display_name,kind)';/export const OWNER_COLUMNS = 'workspace_id,user_id,workspace(display_name)';/" \
  'the owners read is not what businessesThatGo needs'

echo
if (( failed == 0 && passed == 6 )); then
  echo "all 6 fixtures behaved as recorded — the contract check goes red on every defect it names."
  exit 0
fi
echo "$failed of $((passed + failed)) fixtures misbehaved."
exit 1

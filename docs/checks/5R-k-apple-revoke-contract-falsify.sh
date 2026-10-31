#!/usr/bin/env bash
# ============================================================================
# 5R-k — can the Apple-revoke contract check still fail?
# ============================================================================
# Runs `5R-k-apple-revoke-contract.sh` eight times, each against one thing made
# wrong, and requires it to go red FOR THE REASON the fixture names. A check
# that can only pass asserts nothing. Needs the same local Supabase.
#
# SIX fixtures are broken COPIES of a file the check reads, as every sibling
# falsifier does it — three of them Wera Cocina's, since plan `10.4b-iii-c`:
# its body's app key renamed (the function then signs for Wera, and Apple
# refuses Cocina's code), an id that is not its bundle id, and a second
# function's name. ⚠️ TWO ARE NOT, AND CANNOT BE: the function is served from
# `supabase/functions/`, so a broken copy of it would not be the one running.
# Those two leave the function alone and make the stand-in for Apple LIE
# instead (`APPLE_STAND_IN_MODE`), which is the only way to show that the
# check's two central assertions — the signature, and whose account is revoked
# — are read off the wire and not assumed.
# ============================================================================

set -uo pipefail

CHECK="docs/checks/5R-k-apple-revoke-contract.sh"
CONTRACT="app/src/api/account.ts"
FUNCTION="supabase/functions/apple-revoke/index.ts"
COCINA="cocina/src/api/account.ts"
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

passed=0
failed=0

judge() { # name rc output expected-reason-regex
  local name="$1"
  local rc="$2"
  local out="$3"
  local reason="$4"
  if (( rc != 0 )) && [[ "$(grep -Ec "$reason" <<< "$out")" != "0" ]]; then
    echo "  ok    $name — red, for the reason"; passed=$((passed+1))
  else
    echo "FAIL: $name — rc=$rc, and the output did not match /$reason/:"
    grep -E '^FAIL' <<< "$out" | head -3
    failed=$((failed+1))
  fi
}

fixture() { # name file-to-mutate sed-expression expected-reason-regex
  local name="$1"
  local which="$2"
  local expr="$3"
  local reason="$4"
  local contract="$CONTRACT"
  local function="$FUNCTION"
  local cocina="$COCINA"
  local copy="$SCRATCH/$name.ts"
  sed "$expr" "$which" > "$copy"
  if cmp -s "$copy" "$which"; then
    echo "BROKEN FIXTURE $name: the mutation changed nothing"; failed=$((failed+1)); return
  fi
  if [[ "$which" == "$CONTRACT" ]]; then contract="$copy"
  elif [[ "$which" == "$COCINA" ]]; then cocina="$copy"
  else function="$copy"; fi
  local out
  local rc
  out="$(bash "$CHECK" "$contract" "$function" "$cocina" 2>&1)"; rc=$?
  judge "$name" "$rc" "$out" "$reason"
}

lying() { # name stand-in-mode expected-reason-regex
  local out
  local rc
  out="$(APPLE_STAND_IN_MODE="$2" bash "$CHECK" 2>&1)"; rc=$?
  judge "$1" "$rc" "$out" "$3"
}

fixture renamed-function "$CONTRACT" \
  "s/^export const APPLE_REVOKE = 'apple-revoke';/export const APPLE_REVOKE = 'apple-revoked';/" \
  'has no such function'
fixture renamed-body-key "$CONTRACT" \
  's/^  readonly code: string;/  readonly authorization_code: string;/' \
  "Wera.s call answered 400"
fixture stale-build "$FUNCTION" \
  's/^export const BUILD = [0-9][0-9]*;/export const BUILD = 999;/' \
  'the file declares build 999'
lying unverifiable-signature wrong-key \
  'is not signed by the key the function was given'
lying revokes-a-stranger one-apple-account \
  'it must revoke nobody'
fixture cocina-app-key-renamed "$COCINA" \
  's/^  readonly client_id: string;/  readonly clientId: string;/' \
  "Cocina.s call answered 502"
fixture cocina-not-its-bundle-id "$COCINA" \
  "s/^export const APPLE_CLIENT_ID = 'mx.wera.cocina';/export const APPLE_CLIENT_ID = 'mx.wera.cocinas';/" \
  "its bundle id is 'mx.wera.cocina'"
fixture cocina-other-function "$COCINA" \
  "s/^export const APPLE_REVOKE = 'apple-revoke';/export const APPLE_REVOKE = 'apple-revoke-cocina';/" \
  "there is one function"

echo
if (( failed == 0 && passed == 8 )); then
  echo "all 8 fixtures behaved as recorded — the contract check goes red on every defect it names."
  exit 0
fi
echo "$failed of $((passed + failed)) fixtures misbehaved."
exit 1

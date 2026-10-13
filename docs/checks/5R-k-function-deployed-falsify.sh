#!/usr/bin/env bash
# ============================================================================
# 5R-k — can the function-deployed check still fail?
# ============================================================================
# Hands `5R-k-function-deployed.sh` four replies the hosted project could give
# and requires red for each wrong one, FOR ITS REASON, and green for the right
# one. ⚠️ It breaks the REPLY and not the repository: the check compares a file
# with a reply, and editing the file would move both sides of that comparison.
# Needs no network and no Supabase.
# ============================================================================

set -uo pipefail

CHECK="docs/checks/5R-k-function-deployed.sh"
BUILD="$(sed -n 's/^export const BUILD = \([0-9][0-9]*\);.*/\1/p' supabase/functions/apple-revoke/index.ts | head -1)"
[[ -n "$BUILD" ]] || { echo "FAIL: cannot read the function's build"; exit 1; }

passed=0
failed=0

red() { # name status body expected-reason-regex
  local out
  local rc
  out="$(bash "$CHECK" --reply "$2" "$3" 2>&1)"; rc=$?
  if (( rc != 0 )) && [[ "$(grep -Ec "$4" <<< "$out")" != "0" ]]; then
    echo "  ok    $1 — red, for the reason"; passed=$((passed+1))
  else
    echo "FAIL: $1 — rc=$rc, and the output did not match /$4/:"
    grep -E '^FAIL' <<< "$out" | head -3
    failed=$((failed+1))
  fi
}

GOOD="{\"function\":\"apple-revoke\",\"build\":$BUILD,\"configured\":true}"
STALE="{\"function\":\"apple-revoke\",\"build\":$((BUILD + 1)),\"configured\":true}"
BARE="{\"function\":\"apple-revoke\",\"build\":$BUILD,\"configured\":false}"

red never-deployed 404 '{"code":"NOT_FOUND","message":"Requested function was not found"}' 'NOT DEPLOYED'
red another-function 200 '{"function":"something-else","build":1,"configured":true}' 'NOT DEPLOYED'
red stale-build 200 "$STALE" 'it is STALE'
red no-secrets 200 "$BARE" 'NO APPLE KEY'

out="$(bash "$CHECK" --reply 200 "$GOOD" 2>&1)"; rc=$?
if (( rc == 0 )); then
  echo "  ok    the-merged-build — green"; passed=$((passed+1))
else
  echo "FAIL: the merged build, configured, was reported red:"; grep -E '^FAIL' <<< "$out" | head -3
  failed=$((failed+1))
fi

echo
if (( failed == 0 && passed == 5 )); then
  echo "all 5 replies were read as recorded — the deployed check goes red on every state it names."
  exit 0
fi
echo "$failed of $((passed + failed)) replies were misread."
exit 1

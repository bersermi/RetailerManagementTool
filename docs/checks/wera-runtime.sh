#!/usr/bin/env bash
# ============================================================================
# WERA'S RUNTIME IS STILL THE ONE ITS BUILDS IN THE FIELD CARRY. Plan task `10.2a`.
#
#   bash docs/checks/wera-runtime.sh             # computes both platforms, compares
#   bash docs/checks/wera-runtime.sh --falsify   # proves it can go red
#
# An over-the-air update reaches only a build whose runtime — a hash of
# everything native (`app/fingerprint.config.js`) — equals the tree's. Two
# siblings of `app/` now share its `node_modules` (plan Step 10), and measured
# on 2026-10-27: a plain `npm install` of the new apps' notifications module
# upgraded `expo-constants`, a native module Wera uses, and moved Wera's runtime
# on both platforms (iOS d308ba9f → aaecdc7e, Android 5a4a7a5d → 8d03a151).
# Every check was green. Merged, no fix would have reached a pilot phone until
# new store builds — and `ship-an-update.sh` would only have said so the day
# somebody tried to ship one.
#
# ⚠️ THE EXPECTED VALUES ARE EAS'S, NOT THIS TREE'S: the runtime of the newest
# finished Wera build on each platform, read 2026-10-27 with
#   (cd app && npx eas-cli build:list --platform <p> --status finished --limit 1 --json)
# → `.runtime.version`. Both channels (`preview`, `production`) carried them.
#
# WHEN IT GOES RED:
#   - a sibling app's install moved a module Wera uses → pin the sibling's
#     dependency to a version Wera's tree already satisfies (cocina/CLAUDE.md);
#   - Wera's native layer changed ON PURPOSE (an icon, a native module, eas.json,
#     the SDK at `10.8`) → write the new values below in the same pull request,
#     and build both platforms before any update is shipped.
# Measured 2026-10-27: CI's Linux on node 22, after `npm ci`, computes the same
# values as the owner's Mac.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/../../app"

IOS_IN_THE_FIELD="d308ba9fac469dbf9c8fd7766e55954dc0ad1440"
ANDROID_IN_THE_FIELD="5a4a7a5d5328cda71e21d6c41a21ce9960b1f5af"

runtime() {   # runtime <ios|android>
  npx expo-updates fingerprint:generate --platform "$1" 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>console.log(JSON.parse(s).hash))'
}

check() {     # check <platform> <expected>
  local got
  got="$(runtime "$1")" || { echo "FAIL: could not compute Wera's $1 runtime"; return 1; }
  if [[ ! "$got" =~ ^[0-9a-f]{40}$ ]]; then
    echo "FAIL: Wera's $1 runtime came back as '$got', not a hash"
    return 1
  fi
  if [[ "$got" != "$2" ]]; then
    echo "FAIL: Wera's $1 runtime moved: the builds in the field carry ${2:0:8}, this tree computes ${got:0:8}."
    echo "      No over-the-air update would reach a phone. See this script's header."
    return 1
  fi
  echo "  ok    Wera's $1 runtime is ${got:0:8}, the one its builds in the field carry"
}

if [[ "${1:-}" == "--falsify" ]]; then
  if check android "0000000000000000000000000000000000000000" >/dev/null; then
    echo "FAIL: the check passed against a runtime no build has — it cannot go red"
    exit 1
  fi
  echo "  ok    a runtime no build has is refused"
  exit 0
fi

check ios "$IOS_IN_THE_FIELD"
check android "$ANDROID_IN_THE_FIELD"
echo
echo "Wera's runtime is unchanged on both platforms: every update still reaches the phones."

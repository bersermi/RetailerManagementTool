#!/usr/bin/env bash
# ============================================================================
# SHIP A JAVASCRIPT FIX TO THE PHONES, OVER THE AIR. Plan task `5R-b`.
#
# ADR-035 §2.11: a JS-only fix reaches a phone in under an hour, without App
# Store review and without a reinstall. This is the one command that does it.
#
#   bash docs/runbooks/ship-an-update.sh preview "Arregla el total del carrito"
#   bash docs/runbooks/ship-an-update.sh preview "…" --check    # refuses or says what it would do
#
# Run it on `main`, after the fix has merged green. The phone downloads the
# update the next time Wera opens and RUNS it the time after that: close Wera
# completely (swipe it away) and open it again, twice.
#
# ⚠️ IT REFUSES, AND PUBLISHES NOTHING, WHEN:
#   - the tree has uncommitted changes, or HEAD is not on origin/main. What
#     reaches a shop has passed CI, and an update names the commit it came from;
#   - EAS does not hold the three `EXPO_PUBLIC_` values for that environment.
#     `eas update --environment` sets `EXPO_NO_DOTENV=1`, so `app/.env.local` is
#     NOT read, and a bundle without the Supabase URL throws on the first launch;
#   - no finished build on that channel has this tree's runtime, on either
#     platform. ⚠️ `eas update` publishes to a runtime no phone has and reports
#     success: measured in eas-cli 24.12.1's source, it prints the runtime and
#     never compares it with a build. The usual cause is a native dependency
#     added since the last build (build again first), or a hand edit inside
#     `node_modules` (run `npm ci` at the root) — see `app/fingerprint.config.js`.
# A platform with no matching build is left out and named; the others ship.
# ============================================================================
set -euo pipefail

channel="${1:-}"
message="${2:-}"
mode="${3:-}"

usage() {
  echo "usage: bash docs/runbooks/ship-an-update.sh <preview|production> \"<message>\" [--check]" >&2
  exit 2
}
[[ "$channel" == "preview" || "$channel" == "production" ]] || usage
[[ -n "$message" && "$message" != -* ]] || usage
[[ -z "$mode" || "$mode" == "--check" ]] || usage

root="$(git rev-parse --show-toplevel)"
cd "$root/app"
eas() { npx --yes eas-cli@24 "$@"; }

# --- 1. what is being shipped has passed CI --------------------------------
if [[ -n "$(git status --porcelain)" ]]; then
  echo "REFUSED: the tree has uncommitted changes. Commit, merge, and run this on main." >&2
  exit 1
fi
git fetch --quiet origin main
if ! git merge-base --is-ancestor HEAD origin/main; then
  echo "REFUSED: $(git rev-parse --short HEAD) is not on origin/main. Merge it green first." >&2
  exit 1
fi

# --- 2. the values the bundle is built from are on EAS ---------------------
# Every `eas` call is checked by hand: under `set -e` a failure inside `$( )`
# would end the script with no message.
if ! eas whoami >/dev/null 2>&1; then
  echo "REFUSED: this Mac is not logged in to Expo. Run: npx eas-cli login" >&2
  exit 1
fi
# ⚠️ `env:list` takes no `--non-interactive` (eas-cli 24.12.1): passing one fails
# every run, which is how the first version of this script refused everything.
if ! env_out="$(eas env:list --environment "$channel" --format short 2>&1)"; then
  echo "REFUSED: could not read EAS's '$channel' environment:" >&2
  echo "$env_out" >&2
  exit 1
fi
env_names="$(sed -E 's/\x1b\[[0-9;]*m//g' <<<"$env_out" | cut -d= -f1)"
for name in EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY EXPO_PUBLIC_SUPPORT_WHATSAPP; do
  if ! grep -qx "$name" <<<"$env_names"; then
    echo "REFUSED: EAS's '$channel' environment has no $name." >&2
    echo "  (cd app && npx eas-cli env:set --environment $channel --name $name --value <value> --visibility plaintext)" >&2
    exit 1
  fi
done

# --- 3. a phone on this channel can run it ---------------------------------
platforms=()
for platform in ios android; do
  if ! runtime="$(npx expo-updates fingerprint:generate --platform "$platform" 2>/dev/null \
      | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>console.log(JSON.parse(s).hash))')"; then
    echo "REFUSED: could not compute the $platform runtime (npx expo-updates fingerprint:generate)." >&2
    exit 1
  fi
  query=(build:list --channel "$channel" --platform "$platform" --status finished
         --runtime-version "$runtime" --limit 1 --json --non-interactive)
  if ! builds="$(eas "${query[@]}" 2>/dev/null)" \
     || ! count="$(node -e 'const a=JSON.parse(process.argv[1]);console.log(Array.isArray(a)?a.length:0)' "$builds" 2>/dev/null)"; then
    echo "REFUSED: could not list EAS builds. To see why: (cd app && npx eas-cli ${query[*]})" >&2
    exit 1
  fi
  if [[ "$count" -gt 0 ]]; then
    echo "  $platform: runtime $runtime — a finished $channel build has it"
    platforms+=("$platform")
  else
    echo "  $platform: runtime $runtime — NO finished $channel build has it; left out"
  fi
done
if [[ ${#platforms[@]} -eq 0 ]]; then
  echo "REFUSED: this update would reach no phone. See the header of this script for the two usual causes." >&2
  exit 1
fi
target="all"
[[ ${#platforms[@]} -eq 1 ]] && target="${platforms[0]}"

commit="$(git rev-parse --short HEAD)"
if [[ "$mode" == "--check" ]]; then
  echo "CHECK ONLY: would publish $commit to '$channel' for $target — \"$message\""
  exit 0
fi

eas update --channel "$channel" --environment "$channel" --platform "$target" \
  --message "$message" --non-interactive
echo
echo "Published $commit to '$channel' for $target. On the phone: open Wera, close it completely, open it again."

#!/usr/bin/env bash
# 5a-iv-a-preflight — can this Mac put a build on the owner's iPhone, and will
# that build still be able to launch when the Mac is not in the room?
#
# WHY THIS EXISTS. `5a-iv-a`'s gate cell said "the owner's Mac and his own
# iPhone 15. NOTHING ELSE BLOCKS IT." That sentence was written without looking
# at the Mac. On 2026-09-12 it was looked at, and four things blocked it:
# `xcode-select` pointed at the Command Line Tools rather than at the Xcode
# sitting in /Applications, CocoaPods was not installed, no native project had
# ever been generated, and — the one that cannot be automated — the machine held
# ZERO code-signing identities and no Apple ID. Three were fixed in the session
# that found them. The fourth is the owner's to do, and it is the moment the
# seven-day free-provisioning story begins.
#
# ⚠️ THE POINT IS *WHEN* IT FAILS, NOT THAT IT FAILS. Every assertion here is
# something that would otherwise be discovered with the phone already in hand,
# in the one sitting that has to produce five readings no CI can ever take. A
# preflight that costs two seconds is the difference between an evening of
# readings and an evening of yak-shaving.
#
# ⚠️ THIS CHECK CANNOT RUN IN CI, AND THAT IS NOT A DEFECT. It reads the state
# of one laptop: its Xcode, its keychain, its paired devices, and a gitignored
# `.env.local`. So it is NOT evidence in the sense of ADR-035 §9 — it is the
# local instrument for a surface that has no file in this repository, the same
# standing as `docs/checks/5a-iii-gate.sh`, and it obeys the rule underneath §9
# rather than §9 itself: DO NOT BELIEVE A REPORT WHEN YOU CAN MEASURE.
#
# ⚠️ IT PRINTS NO KEY AND NO CERTIFICATE. It counts signing identities; it never
# names one. It asserts that two variables in `.env.local` are non-empty; it
# never echoes them. A transcript is a different blast radius from a keychain.
#
# ⚠️ BASH 3.2. No `mapfile`, no `declare -A`. This repository has now hit that
# trap twice — `5a-split-coverage.sh` records it and `plan-handover.sh` hit it
# anyway, in the very next script written. A note in a header is not a guard, so
# this file simply does not use either.
#
# Run:  bash docs/checks/5a-iv-a-preflight.sh
# Exit: 0 all assertions hold; 1 otherwise, naming each failure and its fix.

set -uo pipefail

APP_DIR="${1:-app}"
XCODE_APP="/Applications/Xcode.app"
fails=0
ran=0

fail() { echo "FAIL: $*"; fails=$((fails+1)); }
ok()   { echo "  ok    $*"; }
note() { echo "        $*"; }
assert() { ran=$((ran+1)); if [[ "$1" == "true" ]]; then ok "$2"; else fail "$2"; fi; }

# ⚠️ EVERY xcrun/xcodebuild CALL BELOW GOES THROUGH THIS. `xcode-select -s` needs
# sudo and this check does not ask for a password; `DEVELOPER_DIR` is the
# no-sudo equivalent and is what the session that wrote this file used to build.
# If the active directory is already Xcode, this changes nothing.
if [[ -d "$XCODE_APP/Contents/Developer" ]]; then
  export DEVELOPER_DIR="${DEVELOPER_DIR:-$XCODE_APP/Contents/Developer}"
fi

echo "5a-iv-a preflight — the Mac half of the sitting"
echo

# --- the toolchain --------------------------------------------------------

assert "$([[ -d "$XCODE_APP" ]] && echo true || echo false)" \
  "a full Xcode is installed at $XCODE_APP"
if [[ ! -d "$XCODE_APP" ]]; then
  note "The Command Line Tools are NOT enough: they have no iOS SDK, no"
  note "Simulator and no device-install path. Install Xcode from the App"
  note "Store — it is several GB, which is why this assertion is first."
fi

active="$(xcode-select -p 2>/dev/null || true)"
assert "$([[ "$active" == *"Xcode.app/Contents/Developer" || -n "${DEVELOPER_DIR:-}" ]] && echo true || echo false)" \
  "the active developer directory resolves to Xcode, not the Command Line Tools"
if [[ "$active" != *"Xcode.app/Contents/Developer" ]]; then
  note "\`xcode-select -p\` still says: ${active:-<nothing>}"
  note "This check exported DEVELOPER_DIR for itself, but \`npx expo run:ios\`"
  note "will NOT unless you do the same. Either:"
  note "    sudo xcode-select -s $XCODE_APP/Contents/Developer   (once, needs a password)"
  note "    export DEVELOPER_DIR=$XCODE_APP/Contents/Developer   (per shell, no password)"
fi

xcb_version="$(xcodebuild -version 2>/dev/null | head -1)"
assert "$([[ -n "$xcb_version" ]] && echo true || echo false)" \
  "xcodebuild runs: ${xcb_version:-<it does not>}"

# ⚠️ A LICENCE NOT YET ACCEPTED, OR COMPONENTS NOT YET INSTALLED, LOOKS LIKE A
# BUILD FAILURE HALFWAY THROUGH A COMPILE. `-checkFirstLaunchStatus` is the one
# call that answers it before anything is built.
xcodebuild -checkFirstLaunchStatus >/dev/null 2>&1
assert "$([[ $? -eq 0 ]] && echo true || echo false)" \
  "Xcode's first-launch components are installed and its licence is accepted"

assert "$(xcodebuild -showsdks 2>/dev/null | grep -q 'iphoneos' && echo true || echo false)" \
  "an iOS DEVICE SDK is present (iphoneos), not only the Simulator one"

assert "$(command -v pod >/dev/null 2>&1 && echo true || echo false)" \
  "CocoaPods is on PATH: $(pod --version 2>/dev/null || echo '<it is not>')"
if ! command -v pod >/dev/null 2>&1; then
  note "\`brew install cocoapods\`. Do NOT \`gem install\` it against the system"
  note "Ruby — this Mac's is 2.6, below what current CocoaPods supports."
fi

# --- the native project ---------------------------------------------------

# ⚠️ `app/ios/` IS GITIGNORED (app/.gitignore, \`/ios\`) AND THAT IS DELIBERATE —
# this is a Continuous Native Generation project, so the native directory is a
# build product. A fresh clone has none, and `npx expo prebuild -p ios` makes
# one. The assertion is here rather than skipped because a preflight whose
# subject is missing has not passed, it has abstained.
ws="$APP_DIR/ios/Wera.xcworkspace"
assert "$([[ -d "$ws" ]] && echo true || echo false)" \
  "the native project exists: $ws"
if [[ ! -d "$ws" ]]; then
  note "\`cd $APP_DIR && npx expo prebuild -p ios\` — it also runs \`pod install\`,"
  note "and on a cold CocoaPods cache that is minutes, not seconds."
fi

# --- ⚠️ THE ONE THAT DECIDES WHETHER 5a-iv-d IS POSSIBLE AT ALL -------------
#
# `npx expo run:ios` defaults to the DEBUG configuration — measured from
# `npx expo run:ios --help`, which prints "Debug or Release. Default: Debug".
# And a Debug build does not contain its JavaScript: `AppDelegate.swift` asks
# `RCTBundleURLProvider` for a Metro URL under `#if DEBUG` and only reads an
# embedded `main.jsbundle` in the `#else` branch.
#
# ⚠️⚠️ SO A DEBUG BUILD CANNOT LAUNCH WITHOUT THE MAC. That is fatal to BOTH
# halves of the persistence measurement: the day-0 pre-check re-deploys and
# re-opens, and `5a-iv-d` opens the app eight days later with the laptop
# somewhere else entirely. A Debug build on day 8 shows a red screen about a
# development server, and the reading that comes back is not "signed out" — it
# is nothing at all, from an instrument that never reached the question.
#
# This asserts the FORK IS STILL WHERE IT WAS MEASURED. If a future React Native
# moves it, the reason for `--configuration Release` has moved too, and this
# check is where that surfaces rather than on day 8.
delegate="$APP_DIR/ios/Wera/AppDelegate.swift"
if [[ -r "$delegate" ]]; then
  has_debug_metro="$(grep -q 'RCTBundleURLProvider' "$delegate" && echo true || echo false)"
  has_embedded="$(grep -q 'main.*jsbundle' "$delegate" && echo true || echo false)"
  assert "$([[ "$has_debug_metro" == true && "$has_embedded" == true ]] && echo true || echo false)" \
    "AppDelegate still forks on DEBUG: Metro when debug, embedded main.jsbundle otherwise"
  if [[ "$has_debug_metro" != true || "$has_embedded" != true ]]; then
    note "The reason \`--configuration Release\` is mandatory has MOVED. Re-read"
    note "$delegate before trusting the run sheet."
  fi
else
  ran=$((ran+1))
  fail "cannot read $delegate — the Debug/Release fork is unverified"
  note "Generate the native project first (see above). This assertion is not"
  note "skipped when the file is missing, because 'unverified' and 'fine' are"
  note "the same colour to a check that skips."
fi

# --- ⚠️ THE HUMAN STEP, AND THE START OF THE SEVEN-DAY CLOCK ---------------
#
# This is the assertion no session can satisfy on the owner's behalf: signing
# needs an Apple ID typed into Xcode, with 2FA. It is also the moment a free
# Apple ID's 7-day provisioning profile begins, which is the clock the whole of
# `5a-iv-d`'s design is arranged around. ⚠️ WHETHER THE SEVEN DAYS RUN FROM THE
# CERTIFICATE (added with the Apple ID) OR FROM THE PROFILE (created when Xcode
# signs a build) IS NOT MEASURED HERE — this machine holds neither. It does not
# change the advice: both happen minutes apart, so the day-0 pre-check belongs in
# the same sitting as the sign-in rather than a week later.
identities="$(security find-identity -v -p codesigning 2>/dev/null | grep -c 'valid identities found' || true)"
count="$(security find-identity -v -p codesigning 2>/dev/null | sed -n 's/^ *\([0-9][0-9]*\) valid identities found.*/\1/p' | head -1)"
count="${count:-0}"
assert "$([[ "$count" -gt 0 ]] && echo true || echo false)" \
  "the keychain holds at least one code-signing identity ($count found)"
if [[ "$count" -eq 0 ]]; then
  note "⚠️ THIS IS THE OWNER'S STEP AND NOTHING ELSE CAN DO IT:"
  note "    open $APP_DIR/ios/Wera.xcworkspace"
  note "    Xcode → Settings → Accounts → + → Apple ID → sign in"
  note "    target Wera → Signing & Capabilities → Automatically manage signing"
  note "    Team → the Personal Team that appears after signing in"
  note "A free Apple ID signs for SEVEN DAYS, and the sitting that follows this" 
  note "is where 5a-iv-d's day 0 is set. Do the pre-check in the SAME sitting."
fi

# --- the phone ------------------------------------------------------------

devices="$(xcrun devicectl list devices 2>/dev/null || true)"
known="$(printf '%s\n' "$devices" | grep -c 'iPhone' || true)"
assert "$([[ "$known" -gt 0 ]] && echo true || echo false)" \
  "this Mac has met an iPhone before ($known in the device list)"
if [[ "$known" -gt 0 ]]; then
  # Reported, not asserted: a phone in a drawer is the normal state when the
  # preflight is run, and failing on it would train someone to ignore the check.
  printf '%s\n' "$devices" | grep 'iPhone' | while IFS= read -r line; do
    note "device: $line"
  done
  note "'unavailable' here means 'not plugged in right now', which is fine"
  note "until the sitting itself."
fi

# --- the values the build bakes in ----------------------------------------
#
# ⚠️ `EXPO_PUBLIC_*` IS INLINED AT BUILD TIME, NOT READ AT RUNTIME. A Release
# build with an empty `.env.local` is a binary that compiles, installs, launches
# and then cannot reach Supabase — and on the phone that failure is
# indistinguishable from the sign-in being broken, which is one of the five
# readings. `docs/checks/5a-iii-gate.sh` checks these values against the live
# project; this checks only that the build will have something to inline.
env_file="$APP_DIR/.env.local"
assert "$([[ -r "$env_file" ]] && echo true || echo false)" \
  "$env_file exists (gitignored by design; copy from .env.example)"
if [[ -r "$env_file" ]]; then
  url="$(grep -E '^EXPO_PUBLIC_SUPABASE_URL=' "$env_file" | head -1 | cut -d= -f2-)"
  key="$(grep -E '^EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' "$env_file" | head -1 | cut -d= -f2-)"
  assert "$([[ -n "$url" && -n "$key" ]] && echo true || echo false)" \
    "both EXPO_PUBLIC_ names are present and non-empty (values never printed)"
  # The NEXT_PUBLIC_ trap, which `.env.example` records because the owner hit it.
  assert "$(grep -q '^NEXT_PUBLIC_' "$env_file" && echo false || echo true)" \
    "no NEXT_PUBLIC_ spelling in $env_file — Expo inlines neither the name nor a warning"
else
  # ⚠️ THE TWO ASSERTIONS ABOVE ARE NOT SKIPPED WHEN THE FILE IS MISSING, THEY
  # ARE FAILED. A skipped assertion and a satisfied one are the same colour, and
  # the count at the bottom of this file is what would otherwise have to catch
  # it — which is a guard doing a second job badly.
  ran=$((ran+2))
  fail "the two EXPO_PUBLIC_ names are unverified — there is no $env_file to read"
  fail "the NEXT_PUBLIC_ trap is unverified — there is no $env_file to read"
fi

# --- the rehearsal build product ------------------------------------------
#
# ⚠️ A SIMULATOR RELEASE BUILD IS A REHEARSAL, NOT A VERIFICATION, and saying so
# is the point — it is `5a-iv-c`'s emulator argument in the other platform's
# words. It cannot take one of the five readings: no Google interstitial, no
# deep link back from Safari, no opinion on whether 76pt reads as big. What it
# CAN do is compile every pod and run the "Bundle React Native code and images"
# phase, which is gated on the CONFIGURATION and not on the platform — so if it
# produced a `main.jsbundle`, the device Release build will too.
product="$(find "$APP_DIR/ios/build/Build/Products" -name 'Wera.app' -maxdepth 3 2>/dev/null | head -1)"
if [[ -n "$product" ]]; then
  assert "$([[ -f "$product/main.jsbundle" ]] && echo true || echo false)" \
    "the rehearsal build embedded its JavaScript: $product/main.jsbundle"
  if [[ ! -f "$product/main.jsbundle" ]]; then
    note "A Release build WITHOUT main.jsbundle is the exact shape that fails on"
    note "day 8 and looks like a signed-out session. Do not start the clock."
  fi
else
  ran=$((ran+1))
  fail "no rehearsal build product found under $APP_DIR/ios/build/Build/Products"
  note "Build it before the sitting, not during it:"
  note "    cd $APP_DIR && xcodebuild -workspace ios/Wera.xcworkspace -scheme Wera \\"
  note "      -configuration Release -sdk iphonesimulator \\"
  note "      -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO build"
  note "It needs no Apple ID, and it is the only thing here that proves the"
  note "native project compiles at all."
fi

# --- anti-vacuity ---------------------------------------------------------
#
# ⚠️ THE FIFTH SHAPE OF MISLEADING GREEN IN THIS REPOSITORY IS A CHECK THAT
# NEVER RUNS. Several assertions above are nested inside `if [[ -r ... ]]`, so a
# missing file could quietly reduce this script to four assertions and a zero
# exit. The count is what refuses that.
EXPECTED_MIN=14
echo
if [[ "$ran" -lt "$EXPECTED_MIN" ]]; then
  echo "FAIL: only $ran assertions ran, fewer than the $EXPECTED_MIN this file"
  echo "      contains. Something was skipped rather than answered."
  exit 1
fi

if [[ "$fails" -gt 0 ]]; then
  echo "$fails of $ran preflight assertions failed — the sitting would have"
  echo "found them with the phone already in your hand."
  exit 1
fi

echo "$ran/$ran — this Mac can build, sign and install, and a Release build will"
echo "carry its own JavaScript. Run the sitting: docs/checks/5a-iv-a-runsheet.md"

#!/usr/bin/env bash
# 5a-iv-c-2 — the Release rehearsal. Does the APK this Mac builds actually RUN?
#
# WHY THIS EXISTS, AND WHY IT IS NOT THE TOOLCHAIN CHECK AGAIN.
# `5a-iv-c-1` ended at `adb devices` listing a booted emulator. Nothing from
# this repository was involved, which was the point: that check can only be
# wrong about THE MACHINE. This one can only be wrong about THE APP. A red
# screen here is `expo prebuild`, Gradle, Hermes or `src/` — never a missing
# SDK, because the SDK is somebody else's assertion.
#
# ⚠️⚠️ THE DEFECT THIS FILE IS SHAPED AROUND IS `5a-iv-a`'s, AND IT IS THE
# BIGGEST ONE THIS PROJECT HAS HAD. On 2026-09-13 the app was run on a real
# phone for the first time and died on the splash:
#
#     TypeError: undefined is not a function   (formatMXN)
#
# `Intl.NumberFormat.prototype.formatToParts` does not exist on Hermes. The
# twenty-six assertions over `formatMXN` were green throughout, and still are:
# they run under node, which ships full ICU. A GREEN CI RUN IS EVIDENCE ABOUT
# THE RUNTIME CI USED, and node is not the runtime the shopkeeper holds.
#
# So the load-bearing assertions here are the last two, and neither of them is
# "the build succeeded":
#
#   * the process is STILL ALIVE some seconds after launch. `am start` prints
#     `Status: ok` for an app that terminates on its first frame — it reports
#     that the ACTIVITY WAS STARTED, which is a claim about ActivityManager and
#     not about the app. The iOS crash above would have passed it.
#   * a text this app's own `ES` table owns is PRESENT IN THE VIEW HIERARCHY,
#     read back off the running device with `uiautomator dump`. A process that
#     lives while React never rendered is the failure mode a pid cannot see,
#     and on a splash-screen crash the pid is the only thing that looks fine.
#
# ⚠️ AND THE PREMISE OF `R10` IS MEASURED HERE RATHER THAN ASSUMED. `R10` says
# "the app runs on Hermes"; this check reads the eight magic bytes of Hermes
# BYTECODE off the bundle inside the APK. `hermesEnabled=true` in
# gradle.properties is a file. The bytecode header is the engine.
#
# ⚠️⚠️ WHAT THIS CHECK CANNOT SEE, SAID HERE RATHER THAN LEFT TO BE FOUND.
# `formatMXN`'s OUTPUT. `readShape()` no longer throws on a runtime without
# full ICU — it falls back — so a wrong es-MX shape on Android (`MX$1.00`, a
# non-breaking space, a comma decimal) is SILENT: the app launches, the sign-in
# screen draws, and every assertion below stays green. The only screen that
# renders money is Inicio and it sits behind the auth guard, which this check
# has no session for. That reading was taken by hand on 2026-09-13 with a
# throwaway probe build — see docs/PLAN.md under `5a-iv-c-2` for the code
# points — and it becomes assertable here the moment `5b` puts a peso amount
# on a screen a signed-out device can reach.
#
# ⚠️ THIS CHECK CANNOT RUN IN CI, AND THAT IS NOT A DEFECT. It needs the SDK,
# an emulator, and virtualisation a runner does not offer. Same standing as
# `5a-iv-c-toolchain.sh`, `5a-iv-a-preflight.sh` and `5a-iii-gate.sh`: not
# evidence in the sense of ADR-035 §9, but the local instrument for a surface
# that has no file in this repository. DO NOT BELIEVE A REPORT WHEN YOU CAN
# MEASURE.
#
# ⚠️ BASH 3.2. No `mapfile`, no `declare -A`.
#
# Run:  bash docs/checks/5a-iv-c-2-rehearsal.sh
#       APK=/path/to/other.apk bash docs/checks/5a-iv-c-2-rehearsal.sh
#       bash docs/checks/5a-iv-c-2-rehearsal.sh --no-device   (static half only)
# Exit: 0 all assertions hold; 1 otherwise, naming each failure and its fix.

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$REPO/app"
PKG="mx.bserafin.wera"
ACTIVITY=".MainActivity"
APK="${APK:-$APP/android/app/build/outputs/apk/release/app-release.apk}"
# How long the app must stay up. The iOS crash was an uncaught exception at
# module load, which terminates the process in well under a second; a slow
# emulator can take three or four to get React mounted. Eight is not a
# performance claim, it is headroom over the thing being distinguished.
ALIVE_SECONDS="${ALIVE_SECONDS:-8}"
TITLE_TEXT="${TITLE_TEXT:-}"
DEVICE=1
[[ "${1:-}" == "--no-device" ]] && DEVICE=0

fails=0
ran=0
fail() { echo "FAIL: $*"; fails=$((fails+1)); }
ok()   { echo "  ok    $*"; }
note() { echo "        $*"; }
assert() { ran=$((ran+1)); if [[ "$1" == "true" ]]; then ok "$2"; else fail "$2"; fi; }

# The SDK is 5a-iv-c-1's subject, not this file's. Find it, do not verify it.
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
ADB="$SDK/platform-tools/adb"
AAPT2="$(ls -1 "$SDK"/build-tools/*/aapt2 2>/dev/null | sort | tail -1)"

# --- 1. `prebuild` ran, and its output is NOT in the repository -------------
# The plan row says "the folder is generated, not committed". `/android` is in
# app/.gitignore, and this asserts the two halves of that separately: the
# folder is THERE (so the build below is not about to build nothing) and git
# cannot see it (so nobody is reviewing 200 generated files in a diff).
assert "$([[ -d "$APP/android" ]] && echo true || echo false)" \
  "app/android/ exists — expo prebuild -p android has run"
[[ -d "$APP/android" ]] || note "fix: cd app && npx expo prebuild -p android"

tracked="$(cd "$REPO" && git ls-files app/android | head -1)"
assert "$([[ -z "$tracked" ]] && echo true || echo false)" \
  "app/android/ is untracked — generated, not committed"
[[ -z "$tracked" ]] && note "git ls-files app/android is empty" \
  || note "tracked: $tracked — app/.gitignore:/android is not doing its job"

# --- 2. There is an APK, and it was built from the source that is here now --
# ⚠️ THE STALENESS ASSERTION IS NOT TIDINESS. Every assertion below this one
# describes the APK on disk. If a source file changed after the build, they all
# stay green while describing a binary nobody has now — which is this
# repository's oldest shape of misleading green, in a new medium.
assert "$([[ -f "$APK" ]] && echo true || echo false)" \
  "the Release APK exists: ${APK#$REPO/}"
if [[ ! -f "$APK" ]]; then
  note "fix: cd app/android && ./gradlew assembleRelease"
  echo
  echo "FAILED: $fails of $ran assertions — no APK to look at."
  exit 1
fi
note "$(du -h "$APK" | cut -f1) — built $(date -r "$APK" '+%Y-%m-%d %H:%M:%S')"

newest_src="$(find "$APP/src" "$APP/app.json" "$APP/package.json" -type f -newer "$APK" 2>/dev/null | head -1)"
assert "$([[ -z "$newest_src" ]] && echo true || echo false)" \
  "no app source is newer than the APK — this binary is this source"
[[ -n "$newest_src" ]] && note "newer: ${newest_src#$REPO/} — rebuild before believing anything below"

# --- 3. It is a RELEASE APK, and the proof is that it contains JAVASCRIPT ---
# ⚠️⚠️ THIS IS #75's LESSON, TRANSPLANTED. On iOS, `expo run:ios` defaults to
# Debug, and A DEBUG BUILD CONTAINS NO JAVASCRIPT — it asks Metro for the
# bundle at launch, so it cannot run with the Mac out of the room. The Android
# equivalent is exactly as easy to produce and exactly as invisible: Gradle
# will happily install a debuggable APK that works beautifully while a
# development server is running and shows a red box the moment it is not.
#
# So "Release" is not read off the output PATH — `.../apk/release/` is a
# directory name, and a directory name is a file. It is read off the CONTENTS.
bundle_entry="assets/index.android.bundle"
has_bundle="$(unzip -l "$APK" "$bundle_entry" 2>/dev/null | grep -c "$bundle_entry")"
assert "$([[ "$has_bundle" -gt 0 ]] && echo true || echo false)" \
  "the APK embeds $bundle_entry — a Debug APK has none, it asks Metro"
[[ "$has_bundle" -gt 0 ]] || note "fix: ./gradlew assembleRelease, not assembleDebug"

# --- 4. The engine under test is HERMES, measured, not configured -----------
# `R10` is a rule about Hermes. Its premise is that the app runs on Hermes, and
# `hermesEnabled=true` in gradle.properties is a claim in a file. Hermes
# bytecode opens with a fixed 8-byte magic followed by a 4-byte version; plain
# JavaScript opens with whatever Metro wrote.
#
# ⚠️ THE CONSTANT BELOW WAS READ OFF THE BUNDLE THIS REPOSITORY BUILDS, NOT
# COPIED FROM A DESCRIPTION OF HERMES. The first spelling of this line was
# `c6 1f bc 03 c1 03 bc 1f` — a transcription of the magic from memory — and it
# was RED against a perfectly good bytecode bundle: the last two bytes are
# `19 1f`, and the `bc 1f` in the middle is what memory had duplicated. An
# assertion that is wrong about its own expected value fails on correct input,
# which is the one kind of red that gets "fixed" by deleting the check.
HERMES_MAGIC="c6 1f bc 03 c1 03 19 1f"
magic=""
hbc_version=""
if [[ "$has_bundle" -gt 0 ]]; then
  tmpd="$(mktemp -d)"
  unzip -o -q -j "$APK" "$bundle_entry" -d "$tmpd" 2>/dev/null
  magic="$(od -An -tx1 -N8 "$tmpd/index.android.bundle" 2>/dev/null | tr -s ' ' | sed 's/^ //;s/ $//')"
  hbc_version="$(od -An -tu4 -j8 -N4 "$tmpd/index.android.bundle" 2>/dev/null | tr -d ' ')"
  rm -rf "$tmpd"
fi
assert "$([[ "$magic" == "$HERMES_MAGIC" ]] && echo true || echo false)" \
  "the embedded bundle is HERMES BYTECODE, by its magic header"
note "first 8 bytes: ${magic:-<unreadable>}   HBC version: ${hbc_version:-?}"
[[ "$magic" == "$HERMES_MAGIC" ]] || \
  note "a plain-JS bundle means Hermes is off — R10's premise is then false"

# --- 5. The manifest, read out of the binary --------------------------------
# ⚠️ `application-debuggable` is the one that would quietly invalidate the
# whole sitting: a debuggable APK is the shape that needs a Mac in the room.
if [[ -n "$AAPT2" ]]; then
  badging="$("$AAPT2" dump badging "$APK" 2>/dev/null)"
  apk_pkg="$(printf '%s\n' "$badging" | sed -n "s/^package: name='\([^']*\)'.*/\1/p" | head -1)"
  assert "$([[ "$apk_pkg" == "$PKG" ]] && echo true || echo false)" \
    "the APK's package is $PKG (read from its manifest, not app.json)"
  [[ "$apk_pkg" == "$PKG" ]] || note "manifest says '$apk_pkg' — a different app to the OS"

  dbg="$(printf '%s\n' "$badging" | grep -c "^application-debuggable")"
  assert "$([[ "$dbg" -eq 0 ]] && echo true || echo false)" \
    "the APK is NOT debuggable — it does not need a Mac in the room"
  [[ "$dbg" -eq 0 ]] && note "no application-debuggable in the manifest"
else
  note "aapt2 not found under $SDK/build-tools — manifest assertions skipped"
fi

if [[ "$DEVICE" -eq 0 ]]; then
  echo
  echo "$((ran - fails))/$ran static assertions — --no-device, so nothing was run."
  note "the two that matter are the device ones. Do not report this as a pass."
  [[ "$fails" -eq 0 ]] && exit 0 || exit 1
fi

# --- 6. A device to run it on. 5a-iv-c-1's subject, restated as a precondition
serial="$("$ADB" devices 2>/dev/null | awk '/\tdevice$/{print $1; exit}')"
if [[ -z "$serial" ]]; then
  fail "no emulator or device attached — run 5a-iv-c-toolchain.sh first"
  ran=$((ran+1))
  echo
  echo "FAILED: $fails of $ran assertions — nothing to install onto."
  exit 1
fi
booted="$("$ADB" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
assert "$([[ "$booted" == "1" ]] && echo true || echo false)" \
  "a device is attached and booted: $serial"

# --- 7. Install, and read the install back off the device -------------------
# `adb install` printing Success is adb's word for it. `pm path` is the
# package manager's, and it is the one the launcher will use.
"$ADB" -s "$serial" uninstall "$PKG" >/dev/null 2>&1
install_out="$("$ADB" -s "$serial" install -r "$APK" 2>&1)"
pm_path="$("$ADB" -s "$serial" shell pm path "$PKG" 2>/dev/null | tr -d '\r')"
assert "$([[ -n "$pm_path" ]] && echo true || echo false)" \
  "installed: pm path $PKG resolves on the device"
[[ -n "$pm_path" ]] && note "$pm_path" || note "$install_out"

# --- 8. Launch it, and then WAIT, which is the whole assertion --------------
# ⚠️⚠️ `am start` REPORTS ACTIVITYMANAGER'S OPINION, NOT THE APP'S. It prints
# Status: ok when the activity was started; an app that throws at module load
# is started, and then gone. 5a-iv-a's crash happened on the splash — after a
# successful start, before the first frame.
"$ADB" -s "$serial" logcat -c >/dev/null 2>&1
start_out="$("$ADB" -s "$serial" shell am start -W -n "$PKG/$ACTIVITY" 2>&1 | tr -d '\r')"
started="$(printf '%s\n' "$start_out" | grep -c "^Status: ok")"
assert "$([[ "$started" -gt 0 ]] && echo true || echo false)" \
  "am start launched $PKG/$ACTIVITY (ActivityManager's claim, not the app's)"
[[ "$started" -gt 0 ]] || note "$start_out"

sleep "$ALIVE_SECONDS"

pid="$("$ADB" -s "$serial" shell pidof "$PKG" 2>/dev/null | tr -d '\r' | awk '{print $1}')"
assert "$([[ -n "$pid" ]] && echo true || echo false)" \
  "STILL RUNNING ${ALIVE_SECONDS}s after launch — pid $pid (this is 5a-iv-a's assertion)"
if [[ -z "$pid" ]]; then
  note "the process is gone. This is exactly what formatToParts did on iOS."
  note "read it: $ADB -s $serial logcat -d | grep -iE 'ReactNativeJS|AndroidRuntime'"
fi

# The JS error, in the app's own words, whether or not it killed the process.
logtail="$("$ADB" -s "$serial" logcat -d 2>/dev/null | tr -d '\r')"
jsfatal="$(printf '%s\n' "$logtail" | grep -cE "FATAL EXCEPTION|com.facebook.react.common.JavascriptException|ReactNativeJS.*(Error|TypeError|undefined is not)")"
assert "$([[ "$jsfatal" -eq 0 ]] && echo true || echo false)" \
  "no JS exception in logcat since launch"
[[ "$jsfatal" -eq 0 ]] || printf '%s\n' "$logtail" | \
  grep -E "FATAL EXCEPTION|JavascriptException|ReactNativeJS" | head -8 | sed 's/^/        /'

# --- 9. REACT RENDERED. Read the app's own words off the screen -------------
# ⚠️⚠️ A LIVE PID IS NOT A DRAWN SCREEN, AND THAT GAP IS WHERE A SPLASH-SCREEN
# CRASH HIDES. The strongest thing this check can say is that a string
# `app/src/strings.ts` owns came back out of the view hierarchy of the running
# app. Not a screenshot — a screenshot needs an eye, and this has to fail on
# its own. `uiautomator dump` is the accessibility tree, so the text is exact.
#
# ⚠️ The expected string is READ OUT OF `src/strings.ts`, not typed here. Typed
# here, this assertion would go stale the day somebody rewords the screen and
# would then be measuring this file's memory of the app.
#
# ⚠️ AND THE STRING IS `ES.auth.google`, NOT `ES.auth.title`. The title is
# `Wera` — which is also the application label, so a node the SYSTEM drew could
# satisfy it and this assertion would pass on an app that rendered nothing.
# `Entrar con Google` is four words no part of Android would ever produce.
if [[ -z "$TITLE_TEXT" ]]; then
  TITLE_TEXT="$(sed -n "s/^ *google: *'\([^']*\)'.*/\1/p" "$APP/src/strings.ts" | head -1)"
fi
assert "$([[ -n "$TITLE_TEXT" ]] && echo true || echo false)" \
  "the expected screen text was read out of src/strings.ts: '${TITLE_TEXT}'"

dump=""
if [[ -n "$pid" ]]; then
  "$ADB" -s "$serial" shell uiautomator dump /sdcard/wera-dump.xml >/dev/null 2>&1
  dump="$("$ADB" -s "$serial" shell cat /sdcard/wera-dump.xml 2>/dev/null | tr -d '\r')"
  "$ADB" -s "$serial" shell rm -f /sdcard/wera-dump.xml >/dev/null 2>&1
fi
drawn="$(printf '%s\n' "$dump" | grep -c -F "$TITLE_TEXT")"
assert "$([[ -n "$TITLE_TEXT" && "$drawn" -gt 0 ]] && echo true || echo false)" \
  "REACT RENDERED: '$TITLE_TEXT' is in the running app's view hierarchy"
if [[ "$drawn" -eq 0 ]]; then
  note "the process lives and the sign-in screen is not on it."
  note "a black screen behind a live pid is what a module-load crash looks like"
  note "when the crash is caught. Look: adb -s $serial exec-out screencap -p > /tmp/w.png"
fi

echo
if [[ "$fails" -eq 0 ]]; then
  echo "$ran/$ran — a Release APK built from this source, embedding Hermes bytecode,"
  echo "installed on $serial, still alive ${ALIVE_SECONDS}s after launch, with"
  echo "'$TITLE_TEXT' read back out of the running app's view hierarchy."
  echo "Register #13's emulator smoke test, discharged. 5a-iv-c-3 has an APK to take."
  note "⚠️ it says NOTHING about formatMXN's output — see the header."
  exit 0
fi
echo "FAILED: $fails of $ran assertions. Nothing above is a report; all of it is"
echo "a measurement of the APK at ${APK#$REPO/} on $serial."
exit 1

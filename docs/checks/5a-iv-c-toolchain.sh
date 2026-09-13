#!/usr/bin/env bash
# 5a-iv-c-toolchain — can this Mac build for Android and run what it builds?
#
# WHY THIS EXISTS. `5a-iv-c` carried `S/M` and a gate cell about a borrowed
# evening. The sizing was written on 2026-09-11 WITHOUT RUNNING `which adb`.
# Looked at on 2026-09-13, the machine had no Android Studio, no SDK, no `adb`,
# and — the one nobody had counted, because anybody who has ever opened Android
# Studio already has one — NO JDK AT ALL. That is the same shape as
# `5a-iv-a`'s gate cell ("nothing else blocks it", about a Mac holding zero
# code-signing identities), found the same way: by looking instead of writing.
#
# ⚠️⚠️ THE LESSON THIS FILE IS BUILT AROUND IS `#75`'s, AND IT IS ABOUT WHAT A
# GREEN MEANS. `5a-iv-a-preflight.sh` once printed "14/14 — this Mac can build,
# sign and install". It could not. The claim rested on a Release build FOR THE
# SIMULATOR, which needs no provisioning at all, so the assertion passed while
# measuring something adjacent to its own sentence. The Android equivalent is
# exactly as easy to write: every package present on disk, every path exported,
# every version correct — and an emulator that never boots, or that boots as
# `x86_64` under translation on an Apple-silicon Mac and is unusably slow.
#
# So the load-bearing assertion here is not "installed". IT IS A BOOTED
# EMULATOR, AND ITS ABI IS READ OFF THE RUNNING DEVICE (`ro.product.cpu.abi`)
# RATHER THAN INFERRED FROM THE NAME OF THE IMAGE THAT WAS DOWNLOADED.
# A package name is a file; a `getprop` is a measurement.
#
# ⚠️ AND IT ASSERTS OVER A LOGIN SHELL, NOT OVER THIS PROCESS. `JAVA_HOME` and
# `ANDROID_HOME` exported inside the session that installed the SDK are a fact
# about that session. Gradle is launched later, by `expo run:android`, from the
# owner's own terminal. If the variables are not in his shell's startup, the
# toolchain works exactly once — for the person who installed it — which is the
# `.env.local`-shaped defect: configuration that exists only where it was typed.
#
# ⚠️ THIS CHECK CANNOT RUN IN CI, AND THAT IS NOT A DEFECT. It reads the state
# of one laptop, and booting an emulator needs virtualisation a runner does not
# offer. Same standing as `5a-iv-a-preflight.sh` and `5a-iii-gate.sh`: not
# evidence in the sense of ADR-035 §9, but the local instrument for a surface
# that has no file in this repository. DO NOT BELIEVE A REPORT WHEN YOU CAN
# MEASURE.
#
# ⚠️ BASH 3.2. No `mapfile`, no `declare -A` — the trap this repository has now
# hit twice, in two consecutive scripts.
#
# Run:  bash docs/checks/5a-iv-c-toolchain.sh
#       bash docs/checks/5a-iv-c-toolchain.sh --no-boot   (skips the slow half)
# Exit: 0 all assertions hold; 1 otherwise, naming each failure and its fix.

set -uo pipefail

AVD_NAME="${AVD_NAME:-wera-android-36}"
API="36"
WANT_ABI="arm64-v8a"
MIN_JDK=17
BOOT=1
[[ "${1:-}" == "--no-boot" ]] && BOOT=0

fails=0
ran=0
fail() { echo "FAIL: $*"; fails=$((fails+1)); }
ok()   { echo "  ok    $*"; }
note() { echo "        $*"; }
assert() { ran=$((ran+1)); if [[ "$1" == "true" ]]; then ok "$2"; else fail "$2"; fi; }

# --- 1. A SHELL NOBODY CONFIGURED knows where the SDK and the JDK are ------
# ⚠️ `zsh -c`, not `$ANDROID_HOME`. See the header: the variable this process
# holds says nothing about the shell Gradle will actually be launched from.
#
# ⚠️⚠️ AND IT IS `zsh -c`, NOT `zsh -lc`, BECAUSE THE FIRST SPELLING OF THIS
# ASSERTION FAILED ON A CORRECT MACHINE. The exports went to `~/.zshrc`, which
# is what Android's own documentation says, and this line read them with
# `zsh -lc`. zsh sources `.zshrc` for INTERACTIVE shells; `-l` makes a shell a
# login shell, which is a different thing. Everything was installed, everything
# was exported, and the check reported nothing found.
#
# THE FIX WAS THE STRICTER HOME, NOT THE LOOSER TEST. Moving the exports to
# `~/.zshenv` — sourced by every zsh, interactive or not — makes them true for
# the plain `zsh -c` a build tool or an agent session spawns, which is the case
# that actually matters here and the one `.zshrc` would have missed silently.
# Relaxing this to `-lic` would have passed while leaving that broken.
#
# ⚠️⚠️ AND `env -u`, WHICH IS THE HALF THAT WAS WRONG NEXT. The spelling above
# was `zsh -c 'printf %s "$ANDROID_HOME"'` — and a child shell INHERITS its
# parent's environment, so it printed the value this script already had and the
# startup file was never consulted at all. Falsification T1 pointed `ZDOTDIR` at
# an empty directory, which should have hidden every startup file, AND THE
# ASSERTION STAYED GREEN.
#
# It would have passed for exactly one person: whoever was still in the shell
# that installed the SDK. For everyone else — a fresh terminal tomorrow — it
# asserted nothing, while printing a sentence about where the SDK is configured.
# THE SEVENTH SHAPE OF MISLEADING GREEN IN THIS REPOSITORY, and the same family
# as `#75`'s simulator build: an assertion that passes while measuring something
# ADJACENT to its own claim.
#
# Stripping the three variables first is what makes the startup file the only
# way they can come back.
STRIP="env -u ANDROID_HOME -u ANDROID_SDK_ROOT -u JAVA_HOME"
LOGIN_SDK="$($STRIP zsh -c 'printf %s "${ANDROID_HOME:-}"' 2>/dev/null)"
LOGIN_JAVA="$($STRIP zsh -c 'printf %s "${JAVA_HOME:-}"' 2>/dev/null)"

ran=$((ran+1))
if [[ -n "$LOGIN_SDK" && -x "$LOGIN_SDK/platform-tools/adb" ]]; then
  ok "a bare \`zsh -c\` exports ANDROID_HOME, and it points at a real SDK root"
else
  fail "a bare \`zsh -c\` does not export ANDROID_HOME at an SDK containing platform-tools/adb"
  note "got: '${LOGIN_SDK:-<unset>}'"
  note "fix: add the export to ~/.zshenv — NOT ~/.zshrc (not read by non-interactive"
  note "     shells) and not to the session that installs the SDK. A toolchain that"
  note "     works only in the shell that built it works exactly once."
fi

ran=$((ran+1))
if [[ -n "$LOGIN_JAVA" && -x "$LOGIN_JAVA/bin/java" ]]; then
  ok "a bare \`zsh -c\` exports JAVA_HOME, and it points at a runnable java"
else
  fail "a bare \`zsh -c\` does not export JAVA_HOME at a runnable JDK"
  note "got: '${LOGIN_JAVA:-<unset>}'"
fi

SDK="${LOGIN_SDK:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
JH="${LOGIN_JAVA:-${JAVA_HOME:-}}"
ADB="$SDK/platform-tools/adb"
SM="$SDK/cmdline-tools/latest/bin/sdkmanager"
AVDM="$SDK/cmdline-tools/latest/bin/avdmanager"
EMU="$SDK/emulator/emulator"

# --- 2. the JDK RUNS, and is new enough for this app's gradle plugin -------
# ⚠️ THE FLOOR IS NOT A PREFERENCE. `@react-native/gradle-plugin` pins AGP
# 8.12.0 and Kotlin 2.1.20; AGP 8.x refuses to configure under JDK 16 or below.
# This is the item the original `S/M` sizing missed entirely.
ran=$((ran+1))
JV="$("$JH/bin/java" -version 2>&1 | head -1)"
JMAJ="$(sed -n 's/.*version "\([0-9]*\).*/\1/p' <<< "$JV")"
if [[ -n "$JMAJ" ]] && (( JMAJ >= MIN_JDK )); then
  ok "java runs and reports major version $JMAJ (>= $MIN_JDK, the AGP 8.12 floor)"
else
  fail "java did not run, or is older than $MIN_JDK — AGP 8.12 will refuse to configure"
  note "got: ${JV:-<no output>}"
fi

# --- 3. adb RUNS ------------------------------------------------------------
# ⚠️ `-x` ON THE FILE IS NOT THE SAME CLAIM. A quarantined or wrong-arch binary
# is executable and still cannot run.
ran=$((ran+1))
if ADBV="$("$ADB" --version 2>&1)" && grep -q "Android Debug Bridge" <<< "$ADBV"; then
  ok "adb executes: $(head -1 <<< "$ADBV")"
else
  fail "adb does not execute"
  note "got: ${ADBV:-<nothing>}"
fi

# --- 4. the packages a Gradle build will ask for are installed -------------
# Read from `--list_installed`, which is the SDK's own record, rather than from
# the presence of a directory — an interrupted download leaves the directory.
ran=$((ran+1))
INST="$(JAVA_HOME="$JH" "$SM" --list_installed 2>/dev/null)"
if [[ -z "$INST" ]]; then
  fail "sdkmanager --list_installed produced nothing — the SDK root is not readable by it"
else
  ok "sdkmanager runs and reports its installed packages"
fi

for pkg in "platform-tools" "platforms;android-$API" "emulator"; do
  ran=$((ran+1))
  if grep -qF "$pkg" <<< "$INST"; then
    ok "installed: $pkg"
  else
    fail "not installed: $pkg"
    note "fix: sdkmanager \"$pkg\""
  fi
done

ran=$((ran+1))
if grep -qE '^\s*build-tools;' <<< "$INST"; then
  ok "installed: a build-tools release ($(grep -oE 'build-tools;[0-9.]+' <<< "$INST" | head -1))"
else
  fail "no build-tools installed — aapt2 and zipalign come from there"
fi

# --- 5. THE SYSTEM IMAGE IS arm64, NOT x86_64 ------------------------------
# ⚠️ THE PLAUSIBLE WRONG INSTALL. An `x86_64` image installs cleanly on an
# Apple-silicon Mac, boots, and runs every command in this file — under
# translation, slowly enough that a smoke test becomes an afternoon. Nothing
# about it LOOKS wrong; it is a different answer to a question nobody asked.
ran=$((ran+1))
if grep -qF "system-images;android-$API;google_apis;$WANT_ABI" <<< "$INST"; then
  ok "installed: the $WANT_ABI system image for API $API (native on this Mac)"
else
  fail "the $WANT_ABI system image for API $API is not installed"
  if grep -qE "system-images;android-$API;[^;]*;x86" <<< "$INST"; then
    note "⚠️ an x86 image IS installed. On Apple silicon that runs under"
    note "   translation — it will work and it will be slow enough to matter."
  fi
fi

# --- 6. an AVD exists, and avdmanager can read it back ---------------------
# ⚠️ THE SECOND HALF IS THE REAL ONE. A hand-edited or half-written `.ini`
# leaves an AVD that `list avd` reports under "The following Android Virtual
# Devices could not be loaded" — which is a non-empty listing, so grepping for
# the name alone passes on a broken device.
ran=$((ran+1))
AVDS="$(JAVA_HOME="$JH" "$AVDM" list avd 2>&1)"
if grep -qE "^\s*Name:\s*$AVD_NAME\s*$" <<< "$AVDS"; then
  ok "an AVD named $AVD_NAME exists and avdmanager parses it"
else
  fail "no loadable AVD named $AVD_NAME"
  if grep -qi "could not be loaded" <<< "$AVDS"; then
    note "⚠️ avdmanager reports at least one AVD it could not load."
  fi
  note "fix: avdmanager create avd -n $AVD_NAME -k 'system-images;android-$API;google_apis;$WANT_ABI'"
fi

# --- 7. ⚠️⚠️ IT BOOTS, AND ITS ABI IS READ OFF THE RUNNING DEVICE ----------
# Everything above this line is satisfiable by a correct set of downloads. This
# is the half that is not: `#75`'s finding was an assertion that passed on a
# build which could never have been installed, and the Android shape of it is a
# toolchain that is perfectly installed and cannot run anything.
if (( BOOT == 0 )); then
  echo
  echo "  ⚠️  --no-boot: the boot assertions were SKIPPED. Everything above is"
  echo "      satisfiable by a correct set of downloads and proves nothing about"
  echo "      whether this Mac can run what it builds."
else
  STARTED_BY_US=0
  SERIAL="$("$ADB" devices 2>/dev/null | awk '/^emulator-[0-9]+\tdevice$/{print $1; exit}')"
  if [[ -z "$SERIAL" ]]; then
    note "no emulator attached — starting $AVD_NAME headless (this takes a minute)"
    ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK" \
      "$EMU" -avd "$AVD_NAME" -no-window -no-audio -no-snapshot -gpu swiftshader_indirect \
      >/tmp/5a-iv-c-emulator.log 2>&1 &
    STARTED_BY_US=$!
    for _ in $(seq 1 90); do
      SERIAL="$("$ADB" devices 2>/dev/null | awk '/^emulator-[0-9]+\tdevice$/{print $1; exit}')"
      [[ -n "$SERIAL" ]] && break
      sleep 2
    done
  fi

  ran=$((ran+1))
  if [[ -n "$SERIAL" ]]; then
    ok "adb sees a running emulator: $SERIAL"
  else
    fail "no emulator came up — adb devices lists none after 180s"
    note "log: /tmp/5a-iv-c-emulator.log"
  fi

  BOOTED=""
  if [[ -n "$SERIAL" ]]; then
    for _ in $(seq 1 90); do
      BOOTED="$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')"
      [[ "$BOOTED" == "1" ]] && break
      sleep 2
    done
  fi

  # ⚠️ `sys.boot_completed`, NOT "adb listed it". A device appears in `adb
  # devices` well before Android is up; installing an APK into that window
  # fails in a way that reads like a broken APK.
  ran=$((ran+1))
  if [[ "$BOOTED" == "1" ]]; then
    ok "the emulator reached sys.boot_completed=1 — Android is actually up"
  else
    fail "the emulator never reported sys.boot_completed=1"
  fi

  ran=$((ran+1))
  ABI="$("$ADB" -s "${SERIAL:-x}" shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r\n')"
  if [[ "$ABI" == "$WANT_ABI" ]]; then
    ok "the RUNNING device reports ro.product.cpu.abi=$ABI — native, not translated"
  else
    fail "the running device reports ABI '${ABI:-<none>}', wanted $WANT_ABI"
    note "⚠️ this is measured on the device, not read off the package name."
  fi

  if [[ -n "$STARTED_BY_US" && "$STARTED_BY_US" != "0" ]]; then
    note "shutting down the emulator this check started"
    "$ADB" -s "${SERIAL:-x}" emu kill >/dev/null 2>&1
    wait "$STARTED_BY_US" 2>/dev/null
  fi
fi

# --- anti-vacuity ----------------------------------------------------------
# ⚠️ RULE 4. Every failure path above is conditional, so "0 failures" is also
# what a run that skipped everything looks like. This repository has now found
# six shapes of misleading green; an assertion counter is the cheapest guard
# against the one where the script itself was the thing that did not run.
EXPECTED_MIN=11
(( BOOT == 1 )) && EXPECTED_MIN=14

echo
if (( ran < EXPECTED_MIN )); then
  echo "FAIL: only $ran assertions ran, fewer than the $EXPECTED_MIN this file"
  echo "      contains. It asserted almost nothing and was about to report success."
  exit 1
fi
if (( fails > 0 )); then
  echo "$fails of $ran assertions failed — 5a-iv-c-2 would fail on this machine,"
  echo "and the borrowed evening of 5a-iv-c-3 would be spent on setup."
  exit 1
fi
if (( BOOT == 0 )); then
  echo "$ran/$ran of the INSTALL assertions hold. ⚠️ The boot half did not run, so"
  echo "this says the packages are present and NOT that this Mac can run them."
  exit 0
fi
echo "$ran/$ran — the JDK, the SDK and adb are found by a shell nobody configured,"
echo "and an $WANT_ABI emulator booted to sys.boot_completed=1 with its ABI read off"
echo "the running device. 5a-iv-c-2 has a machine to run on."

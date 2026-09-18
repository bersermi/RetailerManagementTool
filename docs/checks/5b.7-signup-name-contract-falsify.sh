#!/usr/bin/env bash
# 5b.7-signup-name-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `5b.7-signup-name-contract.sh` prints "all 6
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what distinguishes the two: seven fixtures —
# six that must turn it red and a control that must leave it green — each a copy
# of one file with exactly one thing broken.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. The rule its two
# sister harnesses each paid for on their own first run: *a fixture that is red
# for the wrong reason is not a falsification, it is a coincidence.* Both found
# the same family of defect — a check reporting "unreadable" where it owed the
# name of the thing that was wrong — and this check's own first run made it
# three, with `bad_json` printed where "the field was absent" was owed.
#
# ⚠️⚠️ AND ONE FIXTURE MUTATES THE CHECK ITSELF, NOT THE APP. `Y6` is the
# `G5`-shaped one: assertions 4 and 5 read a live round trip, and THERE IS NO
# LINE IN THIS APP THAT MAKES GoTrue DROP METADATA — so the only way to show
# those two can go red is to stop the probe sending the name. A fixture nobody
# can write is an assertion nobody has shown can fail.
#
# ⚠️ IT WRITES NOTHING TO THE TREE. Every fixture is a copy under `mktemp -d`,
# trapped; the real files are only ever read.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b.7-signup-name-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b.7-signup-name-contract.sh"
CREDENTIALS="app/src/auth/credentials.ts"
PROVIDER="app/src/auth/AuthProvider.tsx"
for f in "$CHECK" "$CREDENTIALS" "$PROVIDER"; do
  [[ -r "$f" ]] || { echo "FAIL: run this from the repository root ($f)"; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fixtures=0
bad=0

# Runs a (possibly mutated) check against a (possibly mutated) pair of files.
# $1 label  $2 expectation: a grep -E pattern, or the word GREEN
# $3 check  $4 credentials  $5 provider
expect() {
  local label="$1" pattern="$2" check="$3" creds="$4" prov="$5" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$check" "$creds" "$prov" 2>&1)"; rc=$?
  if [[ "$pattern" == GREEN ]]; then
    if (( rc == 0 )) && grep -q 'all 6 assertion groups passed' <<< "$out"; then
      echo "  ok    $label — green, as it must be"
    else
      echo "FAIL: $label should have been GREEN (exit $rc)"
      sed 's/^/        /' <<< "$out" | tail -12
      bad=$((bad+1))
    fi
    return
  fi
  if (( rc == 0 )); then
    echo "FAIL: $label — the check PASSED on a broken tree, which is the vacuous"
    echo "      green this harness exists to catch."
    bad=$((bad+1))
  elif grep -qE "$pattern" <<< "$out"; then
    echo "  ok    $label — red, and red for the stated reason"
  else
    echo "FAIL: $label — red, but NOT for the reason it is named for."
    echo "      expected to match: $pattern"
    sed 's/^/        /' <<< "$out" | grep -E '^ *FAIL|^ *[a-z]' | tail -8
    bad=$((bad+1))
  fi
}

# One copy of a file with one sed applied. ⚠️ THE COPY IS DIFFED AGAINST THE
# ORIGINAL AFTERWARDS: "the fixture edited nothing" is the anti-vacuity failure
# one layer in, and it is how three fixtures in this repository were found to
# have been silently dead — one of them by the task that wrote this file.
mutate() { # label source sed-expression -> path
  local label="$1" src="$2" expr="$3" path="$TMP/$1.${2##*.}"
  sed "$expr" "$src" > "$path"
  if cmp -s "$path" "$src"; then
    echo "FAIL: fixture $label edited nothing — it proves nothing about the check."
    bad=$((bad+1))
  fi
  echo "$path"
}

echo "— the control —"
expect Y0 GREEN "$CHECK" "$CREDENTIALS" "$PROVIDER"

echo
echo "— the exported key, mutated —"

# ⚠️⚠️ Y1 IS THE ONE THIS FILE EXISTS FOR, AND IT IS THE FAILURE NOTHING ELSE
# CAN SEE. `fullName` works perfectly: the app writes it, the app reads it, the
# round trip is green, every Vitest assertion passes. It is wrong only against
# GOOGLE, whose provider writes `full_name` — so the defect surfaces months
# later as a Google account with no name beside it on somebody else's phone.
expect Y1 "the app stores the name under 'fullName'" "$CHECK" \
  "$(mutate Y1 "$CREDENTIALS" "s/^export const FULL_NAME_KEY = 'full_name';/export const FULL_NAME_KEY = 'fullName';/")" \
  "$PROVIDER"

# Y2: the contract is unreadable — the vacuity guard at the top of the check.
expect Y2 'could not read FULL_NAME_KEY' "$CHECK" \
  "$(mutate Y2 "$CREDENTIALS" "s/^export const FULL_NAME_KEY/const FULL_NAME_KEY/")" \
  "$PROVIDER"

echo
echo "— the provider, mutated —"

# ⚠️ Y3 IS THE SILENT ONE. signUp with no `options` is a valid call that creates
# a valid account. Nothing throws, nothing is logged, the shopkeeper reaches her
# shop — and her name was never sent.
expect Y3 'calls signUp with no .options|the name is not being sent' "$CHECK" \
  "$CREDENTIALS" \
  "$(mutate Y3 "$PROVIDER" "/options: { data: { \[FULL_NAME_KEY\]: checked.fullName } },/d")"

# Y4: `options` present, but not `data`. GoTrue accepts the object and writes
# nothing — the same silent outcome as Y3, reached by a plausible typo.
expect Y4 'sends .options. but not .options.data.' "$CHECK" \
  "$CREDENTIALS" \
  "$(mutate Y4 "$PROVIDER" "s/options: { data:/options: { captchaToken:/")"

# Y5: sent, inside `data`, under a key nothing will ever read.
expect Y5 'not under the key it exports' "$CHECK" \
  "$CREDENTIALS" \
  "$(mutate Y5 "$PROVIDER" "s/\[FULL_NAME_KEY\]/apodo/")"

echo
echo "— the probe itself, silenced —"
# ⚠️⚠️ THE FIXTURE THAT CANNOT BE WRITTEN AGAINST THE APP. Assertions 4 and 5
# are the reason this check exists, and no edit to `app/` can make GoTrue lose
# what it was given. This stops the probe sending the name and asserts the check
# notices — which is the only evidence that those two read the wire at all.
expect Y6 'the name did not survive signUp' \
  "$(mutate Y6 "$CHECK" "s/'data': {key: name}/'data': {}/")" \
  "$CREDENTIALS" "$PROVIDER"

echo
# ⚠️ THE ANTI-VACUITY FLOOR. A harness that ran no fixtures prints no failures.
EXPECTED=7
if (( fixtures < EXPECTED )); then
  echo "FAIL: only $fixtures fixtures ran, expected $EXPECTED."
  exit 1
fi
if (( bad > 0 )); then
  echo "$fixtures fixtures ran, $bad behaved wrongly — the check cannot be trusted"
  echo "to fail, which means its green says nothing."
  exit 1
fi
echo "all $fixtures fixtures behaved (6 red, 1 deliberately green) — the sign-up"
echo "name contract can still fail, including on the hop no file can assert."

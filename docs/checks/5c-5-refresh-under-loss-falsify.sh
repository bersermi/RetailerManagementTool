#!/usr/bin/env bash
# 5c-5-refresh-under-loss-falsify — the nine fixtures the session reading was
# tested against, kept as a script rather than as a paragraph claiming it was.
#
# ⚠️⚠️ MOST FIXTURES FEED THE CHECK A CRAFTED READING RATHER THAN RE-RUNNING
# THE INSTRUMENT, AND THAT IS A DELIBERATE TRADE THIS FILE HAS TO JUSTIFY.
# The real instrument takes about two minutes, because the `auth-js` failure
# cooldown it measures is sixty seconds long and cannot be hurried from
# outside the library. Nine real runs would be twenty minutes against a
# fifteen-minute job cap, and this repository has already had a harness
# CANCELLED at that cap — neither a pass nor a failure, and the worst of the
# three to merge on.
#
# ⚠️ SO WHAT IS BEING FALSIFIED HERE IS MOSTLY THE JUDGE, and that is stated
# rather than glossed: `Y2`–`Y6` prove the bash check's assertions actually
# fire when the reading says the wrong thing, which is the half that rots
# quietly. ⚠️ `Y7` IS THE EXCEPTION AND IT IS THE ONE TO READ — it mutates the
# REAL instrument so the socket dies BEFORE the request reaches the server,
# turning a lost REPLY into a lost REQUEST. That is the easy case nobody was
# ever worried about, and a check that cannot tell the two apart is measuring
# nothing. No crafted reading can test that, because the thing in doubt is
# whether the instrument is honest about what it dropped.
#
# ⚠️ AND THE CONTROL IS A CRAFTED GOOD READING, NOT A REAL RUN. The real run
# is the check itself, which CI runs in the step immediately before this one —
# so a second one here would buy two minutes of duplicate evidence.
#
# ⚠️ GROUPS 7 AND 8 OF THE CHECK ARE NOT STUBBABLE and run for real in every
# fixture below: they are the check's own HTTP probes of GoTrue, not part of
# the instrument's output. That is why each fixture still costs ~30 seconds.
#
# Run:  supabase start && bash docs/checks/5c-5-refresh-under-loss-falsify.sh
# Exit: 0 when all nine fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5c-5-refresh-under-loss.sh"
INSTRUMENT="docs/checks/lib/5c-5-refresh-under-loss.mjs"
for f in "$CHECK" "$INSTRUMENT"; do
  [[ -r "$f" ]] || { echo "FAIL: run me from the repo root (cannot read $f)"; exit 1; }
done

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

# A crafted reading: the known-good one, with any field overridden. ⚠️ THE
# BASELINE IS SPELLED OUT HERE SO A SPOILED FIELD IS THE ONLY DIFFERENCE — a
# fixture that changed two things would not say which one the check caught.
stub() { # step field value  (omit all three for the clean reading)
  python3 - "$WORK/stub.mjs" "${1:-}" "${2:-}" "${3:-}" <<'PY'
import io, json, sys
out, step, field, value = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
reading = [
  {"step": "setup", "ok": True, "user": "00000000-0000-0000-0000-000000000000"},
  {"step": "lost-reply", "dropped": 1, "refresh_attempts": 8,
   "server_minted_a_token": True, "error_name": "AuthRetryableFetchError",
   "client_signed_out": False, "client_still_holds_R1": True,
   "in_call_retry_seconds": 25.6},
  {"step": "early-retry", "gap_seconds": 33, "ok": False, "error": "fetch failed",
   "went_to_the_network": False, "still_signed_in": True},
  {"step": "retry", "gap_seconds": 88.6, "went_to_the_network": True,
   "retry_ok": True, "retry_error": None, "landed_on_the_lost_token": True,
   "still_signed_in": True},
]
if step:
    for row in reading:
        if row["step"] == step:
            row[field] = json.loads(value)
lines = "\n".join("console.log(%s);" % json.dumps(json.dumps(r)) for r in reading)
io.open(out, "w", encoding="utf-8").write(lines + "\n")
PY
}

mutate() { # from to [file]
  python3 - "$WORK/${3:-real.mjs}" "$1" "$2" <<'PY'
import io, sys
p, f, t = sys.argv[1], sys.argv[2], sys.argv[3]
s = io.open(p, encoding="utf-8").read()
if f not in s:
    sys.exit("anchor not present: %s" % f[:70])
out = s.replace(f, t, 1)
if out == s:
    sys.exit("the mutation changed nothing — fixture void")
io.open(p, "w", encoding="utf-8").write(out)
PY
}

guard() { [[ $? -eq 0 ]] || { echo "FAIL: fixture setup failed"; fails=$((fails+1)); }; }

fixture() { # label want needle instrument
  local label="$1" want="$2" needle="$3" inst="$4" out rc
  ran=$((ran+1))
  out="$(bash "$WORK/check.sh" "$inst" 2>&1)"; rc=$?
  if [[ "$want" == "green" ]]; then
    if (( rc == 0 )); then echo "  ok    $label — green, as recorded"
    else echo "FAIL: $label should be GREEN and the check failed:"; sed 's/^/        /' <<< "$out"; fails=$((fails+1)); fi
    return
  fi
  if (( rc == 0 )); then
    echo "FAIL: $label should be RED and the check passed — the guard cannot see this"
    fails=$((fails+1))
  elif ! grep -qF "$needle" <<< "$out"; then
    echo "FAIL: $label was red for the WRONG REASON. Expected a failure mentioning:"
    echo "        $needle"
    sed 's/^/        /' <<< "$out"; fails=$((fails+1))
  else
    echo "  ok    $label — red, and the message names the defect"
  fi
}

cp "$CHECK" "$WORK/check.sh"

# --- Y0. the control -------------------------------------------------------
# ⚠️ A harness whose baseline is red runs no fixture at all: every "red" below
# would then be the baseline's red and would prove nothing.
stub; guard
fixture "Y0  a clean reading" green "" "$WORK/stub.mjs"

# --- Y1. ⚠️ the anti-vacuity floor -----------------------------------------
cp "$CHECK" "$WORK/check.sh"
mutate "EXPECTED_GROUPS=8" "EXPECTED_GROUPS=99" check.sh; guard
fixture "Y1  fewer groups ran than the check promises" red "asserted nothing" "$WORK/stub.mjs"
cp "$CHECK" "$WORK/check.sh"

# --- Y2. ⚠️⚠️ the server never rotated -------------------------------------
# A reading in which nothing was ever spent. The check must refuse it: the whole
# question is what happens to a token the server HAS already consumed.
stub lost-reply server_minted_a_token false; guard
fixture "Y2  the reading claims no token was minted" red "a lost REQUEST" "$WORK/stub.mjs"

# --- Y3. ⚠️ the outage was a blip ------------------------------------------
stub lost-reply in_call_retry_seconds 0.4; guard
fixture "Y3  the outage healed inside one call" red "measures nothing about being offline" "$WORK/stub.mjs"

# --- Y4. ⚠️⚠️ the shopkeeper WAS signed out --------------------------------
# The failure this whole task exists to look for. If the check can be green on
# a reading that says the session was destroyed, it is asserting nothing.
stub lost-reply client_signed_out true; guard
fixture "Y4  the lost reply signed the shopkeeper out" red "becomes a log-out" "$WORK/stub.mjs"

# --- Y5. ⚠️⚠️ the retry started a NEW chain --------------------------------
# Subtle and the reason the field exists: the retry "succeeding" is not the
# answer. It has to succeed onto the token whose delivery was lost.
stub retry landed_on_the_lost_token false; guard
fixture "Y5  the retry landed on a fresh token, not the lost one" red "Landing on the LOST token" "$WORK/stub.mjs"

# --- Y6. the cooldown finding is not being measured ------------------------
stub early-retry went_to_the_network true; guard
fixture "Y6  the early retry is reported as reaching the network" red "REFRESH_FAILURE_COOLDOWN_MS" "$WORK/stub.mjs"

# --- Y7. ⚠️⚠️ THE REAL INSTRUMENT, MADE DISHONEST --------------------------
# See the header: the socket dies BEFORE the request is forwarded, so the
# server never rotates and this is a lost REQUEST. The easy case. ⚠️ This is
# the only fixture that costs a full run, and it is the only one that can test
# whether the instrument tells the truth about what it dropped.
cp "$INSTRUMENT" "$WORK/real.mjs"
mutate "    if (isRefresh && outage && dropped > 0) { creq.socket.destroy(); return; }" \
       "    if (isRefresh && outage) { dropped++; creq.socket.destroy(); return; }"; guard
fixture "Y7  the instrument drops the REQUEST instead of the reply" red "a lost REQUEST" "$WORK/real.mjs"

# --- Y8. ⚠️⚠️ the discrimination assertion ---------------------------------
# Group 8 is what stops group 7 being "a server that says yes to everything".
# Stop USING the child and the replay is forgiven, so group 8 must go red.
cp "$CHECK" "$WORK/check.sh"
mutate 'rt "$B2" > /dev/null                 # the child is used: the chain really moved' \
       ': # the child is deliberately NOT used' check.sh; guard
fixture "Y8  the replay fixture never advances the chain" red "expected 400 refresh_token_already_used" "$WORK/stub.mjs"
cp "$CHECK" "$WORK/check.sh"

# ---------------------------------------------------------------------------
# ⚠️ THE FLOOR, FOR THE HARNESS ITSELF. A fixture deleted with the assertion it
# covered is how this file quietly stops being evidence.
EXPECTED_FIXTURES=9
echo
if (( ran < EXPECTED_FIXTURES )); then
  echo "FAILED: only $ran of $EXPECTED_FIXTURES fixtures ran"
  exit 1
fi
if (( fails > 0 )); then
  echo "FAILED: $fails of $ran fixtures"
  exit 1
fi
echo "PASSED: $ran fixtures — the session reading still fails on each defect it names"
exit 0

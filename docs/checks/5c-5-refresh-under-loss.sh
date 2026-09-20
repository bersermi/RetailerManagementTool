#!/usr/bin/env bash
# 5c-5-refresh-under-loss — DOES A SESSION SURVIVE A REFRESH WHOSE REPLY IS
# LOST? Plan task `5c.5`, promoted out of prose on 2026-09-13 and read on
# 2026-09-20.
#
# WHY THIS EXISTS, AND IT IS A READING BEFORE IT IS A GUARD. On 2026-09-13 the
# owner read the project's session settings off the dashboard and the plan
# recorded the result: nothing is set to expire a session, **but reuse
# detection is ON**. The residual worry it wrote down was this:
#
#     "the server processes the refresh, the reply never arrives over a bad
#      connection, and the client retries the same token. Inside 10s that is
#      forgiven; outside it, the session is revoked and the person is signed
#      out for no reason they can see. The pilot store is offline a lot — that
#      is not a hypothetical there."
#
# ⚠️⚠️ THAT WORRY IS WRONG ON THIS STACK, AND THIS FILE IS WHY WE KNOW. The
# ten-second interval never enters into the lost-reply case at all. What
# actually decides it is measured by assertions 7 and 8 below.
#
# ⚠️ IT IS A GUARD AS WELL AS A READING BECAUSE THE ANSWER IS LOAD-BEARING FOR
# `5c`. The whole offline design rests on "a dropped connection does not sign a
# shopkeeper out". That is a claim about GoTrue and `auth-js`, not about our
# code — so nothing else in this repository would notice a version bump
# changing it, and the first symptom would be a pilot shopkeeper signed out
# mid-sale with no explanation.
#
# WHAT IT ASSERTS, all of it end to end through a REAL `@supabase/supabase-js`
# client talking to a REAL GoTrue over a proxy that genuinely destroys the
# socket:
#
#   1. The stack is up, the key is the publishable one, and the versions this
#      reading is pinned to are recorded in the output.
#   2. ⚠️ THE DROP WAS REAL AND THE SERVER DID ROTATE. The proxy reads the
#      upstream reply to completion before killing the socket, so the rotation
#      is COMMITTED — otherwise this would be measuring a lost REQUEST, which
#      is the easy case nobody worried about.
#   3. The outage outlasted `auth-js`'s in-call retry budget (30s), so what is
#      measured is an outage rather than a blip the library heals by itself.
#   4. ⚠️⚠️ THE LOST REPLY DOES NOT SIGN ANYBODY OUT. The error is
#      `AuthRetryableFetchError`, the session is still in storage, and it still
#      holds the OLD refresh token.
#   5. ⚠️ THE 60-SECOND FAILURE COOLDOWN IS REAL, and it is the one finding
#      here that costs something: `auth-js` caches a failed refresh for
#      `REFRESH_FAILURE_COOLDOWN_MS` keyed on the token and serves it to every
#      caller WITHOUT touching the network. Signal returning does not mean
#      recovery; the cooldown lapsing does.
#   6. ⚠️⚠️ THE ANSWER: after the cooldown the retry succeeds and the client
#      lands on EXACTLY the token whose delivery was lost — not a fresh one off
#      a new chain — and the person is still signed in.
#   7. ⚠️⚠️ THE MECHANISM, MEASURED DIRECTLY: a spent refresh token whose child
#      has never been used returns that same child, well past the reuse
#      interval. The interval is irrelevant to the lost-reply case.
#   8. ⚠️⚠️ AND THE RULE DISCRIMINATES. Without this, 7 would be indistinguish-
#      able from a server that accepts everything: a spent token whose child
#      WAS used is refused past the interval with `refresh_token_already_used`.
#
# ⚠️ WHAT IT DOES NOT ASSERT, NAMED RATHER THAN LEFT TO BE FOUND:
#
#   * ANYTHING ABOUT THE HOSTED PROJECT. This drives the LOCAL stack. The
#     dashboard settings the plan records were read by the owner on 2026-09-13
#     and are a REPORT, not a measurement — that standing is unchanged, and
#     this reading must not be quietly upgraded into one about production.
#     What it does pin is the local GoTrue version, printed on every run.
#   * THE AUTO-REFRESH TICKER. The instrument sets `autoRefreshToken: false`
#     so the 30-second ticker cannot fire a refresh the script did not ask for.
#     The app runs with it TRUE (`app/src/lib/supabase.ts`), which only makes
#     recovery more automatic than what is measured here — the ticker retries
#     on its own once the cooldown lapses. This is the stricter case.
#   * WHAT THE SHOPKEEPER SEES. §2.11 keeps rendering out of scope; `5c` is
#     where the "Sin conexión a internet" copy lives.
#
# Run:  supabase start && bash docs/checks/5c-5-refresh-under-loss.sh
# With: a path to the instrument as $1, which is how the falsification harness
#       points it at a mutated copy.
# Exit: 0 when a lost reply still leaves the shopkeeper signed in; 1 otherwise.
#
# ⚠️ IT TAKES ABOUT TWO MINUTES and that is inherent: the cooldown it measures
# is sixty seconds long and cannot be hurried from outside the library.

set -uo pipefail

INSTRUMENT="${1:-docs/checks/lib/5c-5-refresh-under-loss.mjs}"
CONFIG="supabase/config.toml"
CLIENT="app/src/lib/supabase.ts"
for f in "$INSTRUMENT" "$CONFIG" "$CLIENT"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f"; exit 1; }
done

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# --- 1. the stack, and what this reading is pinned to ----------------------
note
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\`."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE — the rule every check here
# follows. A service key would not change this particular answer, but a reading
# taken with different credentials from the app's is not a reading about the app.
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

AUTH_CTR="$(docker ps --filter name=supabase_auth --format '{{.Names}}' 2>/dev/null | head -1)"
[[ -n "$AUTH_CTR" ]] || { echo "FAIL: no supabase auth container is running"; exit 1; }
GOTRUE_VER="$(curl -s "$API_URL/auth/v1/health" -H "apikey: $KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('version',''))" 2>/dev/null)"
# ⚠️ READ FROM THE RUNNING CONTAINER, not from config.toml. A config file is a
# request; the container's environment is what is actually enforced, and the two
# drift the moment somebody edits the file without restarting.
REUSE="$(docker exec "$AUTH_CTR" env 2>/dev/null \
  | sed -n 's/^GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL=\(.*\)$/\1/p')"
ROTATION="$(docker exec "$AUTH_CTR" env 2>/dev/null \
  | sed -n 's/^GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED=\(.*\)$/\1/p')"
SBJS_VER="$(python3 -c "import json;print(json.load(open('node_modules/@supabase/supabase-js/package.json'))['version'])" 2>/dev/null)"
AUTHJS_VER="$(python3 -c "import json;print(json.load(open('node_modules/@supabase/auth-js/package.json'))['version'])" 2>/dev/null)"

if [[ -z "$GOTRUE_VER" || -z "$REUSE" || -z "$SBJS_VER" || -z "$AUTHJS_VER" || "$ROTATION" != "true" ]]; then
  fail "could not pin the stack this reading is about"
  echo "      gotrue='$GOTRUE_VER' rotation='$ROTATION' reuse='$REUSE'"
  echo "      supabase-js='$SBJS_VER' auth-js='$AUTHJS_VER'"
  echo "      ⚠️ ROTATION MUST BE ON for this question to mean anything: with it"
  echo "      off, a refresh token is never spent and there is nothing to lose."
  exit 1
fi
ok "gotrue $GOTRUE_VER (rotation=$ROTATION, reuse=${REUSE}s), supabase-js $SBJS_VER, auth-js $AUTHJS_VER"

# --- the end-to-end reading ------------------------------------------------
OUT="$SCRATCH/reading.jsonl"
REPO_ROOT="$PWD" API_URL="$API_URL" SB_KEY="$KEY" \
  node "$INSTRUMENT" > "$OUT" 2> "$SCRATCH/err.txt"
NODE_RC=$?
if (( NODE_RC != 0 )) || [[ ! -s "$OUT" ]]; then
  echo "FAIL: the instrument did not run (exit $NODE_RC)"
  sed 's/^/        /' "$SCRATCH/err.txt" | head -12
  exit 1
fi

f() { # step field -> its JSON value, lower-cased
  python3 -c "
import sys,json
for line in open(sys.argv[1]):
    d=json.loads(line)
    if d.get('step')==sys.argv[2]:
        print(str(d.get(sys.argv[3],'')).lower()); break" "$OUT" "$1" "$2" 2>/dev/null
}

# --- 2. the drop was real and the server DID rotate ------------------------
note
if [[ "$(f lost-reply dropped)" == "1" && "$(f lost-reply server_minted_a_token)" == "true" ]]; then
  ok "the reply was destroyed AFTER the server committed a new token — a lost REPLY, not a lost request"
else
  fail "dropped=$(f lost-reply dropped) minted=$(f lost-reply server_minted_a_token)"
  echo "      If the server never rotated, this is measuring a lost REQUEST —"
  echo "      the easy case, where the old token was never spent and nothing was"
  echo "      ever at risk. The whole question is the other one."
fi

# --- 3. the outage outlasted the library's own retry budget ----------------
note
ATTEMPTS="$(f lost-reply refresh_attempts)"
BUDGET="$(f lost-reply in_call_retry_seconds)"
if (( ${ATTEMPTS%%.*} > 1 )) && python3 -c "import sys;sys.exit(0 if float('$BUDGET')>20 else 1)"; then
  ok "auth-js retried ${ATTEMPTS} times over ${BUDGET}s and still failed — a real outage, not a blip"
else
  fail "the client made $ATTEMPTS attempt(s) over ${BUDGET}s"
  echo "      auth-js retries a network-class refresh with exponential backoff"
  echo "      while the next backoff keeps it under AUTO_REFRESH_TICK_DURATION_MS"
  echo "      (30s). An outage shorter than that heals itself inside one call and"
  echo "      measures nothing about being offline."
fi

# --- 4. ⚠️⚠️ THE LOST REPLY DOES NOT SIGN ANYBODY OUT ----------------------
note
if [[ "$(f lost-reply error_name)" == "authretryablefetcherror" \
   && "$(f lost-reply client_signed_out)" == "false" \
   && "$(f lost-reply client_still_holds_R1)" == "true" ]]; then
  ok "the session survives the lost reply in the client, still holding the old token"
else
  fail "error=$(f lost-reply error_name) signed_out=$(f lost-reply client_signed_out) holds_old=$(f lost-reply client_still_holds_R1)"
  echo "      auth-js only tears a session down when the refresh fails for a"
  echo "      NON-retryable reason AND the access token has already expired. A"
  echo "      dropped connection is retryable, so the session is kept and the old"
  echo "      token stays in storage for the next attempt. If this ever changes,"
  echo "      every dropped connection in the pilot shop becomes a log-out."
fi

# --- 5. ⚠️ the 60-second failure cooldown ----------------------------------
note
if [[ "$(f early-retry went_to_the_network)" == "false" \
   && "$(f early-retry still_signed_in)" == "true" ]]; then
  ok "a retry inside the cooldown is served from cache and never touches the network"
else
  fail "early retry network=$(f early-retry went_to_the_network) signed_in=$(f early-retry still_signed_in)"
  echo "      REFRESH_FAILURE_COOLDOWN_MS is 60s (two auto-refresh ticks) and is"
  echo "      keyed on the refresh token. This is the one COST in this reading:"
  echo "      the signal coming back does not mean the app recovers — the app"
  echo "      recovers when the cooldown lapses, up to a minute later."
fi

# --- 6. ⚠️⚠️ THE ANSWER ----------------------------------------------------
note
GAP="$(f retry gap_seconds)"
if [[ "$(f retry retry_ok)" == "true" \
   && "$(f retry went_to_the_network)" == "true" \
   && "$(f retry landed_on_the_lost_token)" == "true" \
   && "$(f retry still_signed_in)" == "true" ]] \
   && python3 -c "import sys;sys.exit(0 if float('$GAP')>float('$REUSE') else 1)"; then
  ok "after ${GAP}s offline — far past the ${REUSE}s interval — the retry SUCCEEDS onto the very token that was lost, still signed in"
else
  fail "retry ok=$(f retry retry_ok) network=$(f retry went_to_the_network) landed_on_lost=$(f retry landed_on_the_lost_token) signed_in=$(f retry still_signed_in) gap=${GAP}s"
  echo "      This is the whole question 5c.5 was promoted out of prose to ask."
  echo "      Landing on the LOST token specifically is the point: it says the"
  echo "      server handed back the child it had already minted, rather than the"
  echo "      client starting a new chain and the old one being left to rot."
fi

# --- 7. ⚠️⚠️ the mechanism, measured directly ------------------------------
# The interval is read from the container above, so this waits past whatever is
# actually configured rather than past a number typed here.
note
rt() { curl -s -w $'\n%{http_code}' -X POST "$API_URL/auth/v1/token?grant_type=refresh_token" \
  -H "apikey: $KEY" -H 'Content-Type: application/json' -d "{\"refresh_token\":\"$1\"}"; }
tok() { sed '$d' <<< "$1" | python3 -c "import sys,json;print(json.load(sys.stdin).get('refresh_token',''))" 2>/dev/null; }
code() { sed '$d' <<< "$1" | python3 -c "import sys,json;print(json.load(sys.stdin).get('error_code',''))" 2>/dev/null; }
mintok() { curl -s -X POST "$API_URL/auth/v1/signup" -H "apikey: $KEY" -H 'Content-Type: application/json' \
  -d "{\"email\":\"mech-$1-$$-$(date +%s)@example.com\",\"password\":\"refresh-loss-123\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('refresh_token',''))" 2>/dev/null; }

A1="$(mintok unused)"
O="$(rt "$A1")"; A2="$(tok "$O")"
sleep $(( REUSE + 3 ))
O2="$(rt "$A1")"; A2b="$(tok "$O2")"
if [[ "$(tail -1 <<< "$O2")" == "200" && -n "$A2" && "$A2b" == "$A2" ]]; then
  ok "a spent token whose child is UNUSED returns that same child $((REUSE + 3))s later — the interval is not what saves it"
else
  fail "the unused-child retry answered HTTP $(tail -1 <<< "$O2"), token $([[ "$A2b" == "$A2" ]] && echo same || echo different)"
  echo "      This is the rule the whole answer rests on. GoTrue refuses a spent"
  echo "      token only when the chain has actually MOVED PAST it, which a lost"
  echo "      reply by definition never does."
fi

# --- 8. ⚠️⚠️ and the rule discriminates ------------------------------------
note
B1="$(mintok used)"
O="$(rt "$B1")"; B2="$(tok "$O")"
rt "$B2" > /dev/null                 # the child is used: the chain really moved
sleep $(( REUSE + 3 ))
O3="$(rt "$B1")"
if [[ "$(tail -1 <<< "$O3")" == "400" && "$(code "$O3")" == "refresh_token_already_used" ]]; then
  ok "a spent token whose child WAS used is refused — so assertion 7 is a distinction, not a server that says yes to everything"
else
  fail "the used-child replay answered HTTP $(tail -1 <<< "$O3") / '$(code "$O3")', expected 400 refresh_token_already_used"
  echo "      Without this, assertion 7 proves nothing: a GoTrue that accepted"
  echo "      every spent token would pass it. This is the half that says reuse"
  echo "      detection is switched on and working, and that the lost-reply case"
  echo "      is genuinely outside it rather than sneaking past a broken guard."
fi

# ---------------------------------------------------------------------------
# ⚠️⚠️ THE ANTI-VACUITY FLOOR, RULE 4 OF THIS REPOSITORY. `fails == 0` is ALSO
# what a run that asserted nothing prints.
EXPECTED_GROUPS=8
echo
if (( ran < EXPECTED_GROUPS )); then
  echo "FAILED: only $ran of $EXPECTED_GROUPS assertion groups ran — the rest asserted nothing"
  exit 1
fi
if (( fails > 0 )); then
  echo "FAILED: $fails of $ran assertion groups"
  exit 1
fi
echo "PASSED: $ran assertion groups — a refresh whose reply is lost does NOT sign the shopkeeper out"
echo "        (gotrue $GOTRUE_VER, auth-js $AUTHJS_VER, reuse interval ${REUSE}s)"
exit 0

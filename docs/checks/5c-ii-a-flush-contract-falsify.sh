#!/usr/bin/env bash
# 5c-ii-a-flush-contract-falsify — the nine fixtures the flush contract check was
# tested against, kept as a script rather than as a paragraph claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every check in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5c-ii-a-flush-contract.sh` still FAILS on each defect it was written
# for — the only way to know it has not been loosened into a check that passes on
# everything.
#
# ⚠️⚠️ EVERY FIXTURE HERE MUTATES THE APP RATHER THAN THE DATABASE, AND THAT IS
# THE SHAPE OF THE DEFECT THIS CHECK EXISTS FOR. PostgREST matches an RPC by its
# parameter names; the applied functions are append-only and CI-verified, so the
# side that drifts is `@/api/flush`. Each fixture drifts it in one place and
# demands the check meet the 404 the drift would produce in a shop.
#
# ⚠️ THE RULE FROM 2026-09-13 IS APPLIED: WHEN AN ASSERTION GAINS A NEW INPUT, THE
# THING THAT FALSIFIES IT GAINS THE SAME INPUT. The check reads TWO app modules —
# `flush.ts` and `workspace.ts` — and both are copied, which `W0`'s green is what
# confirms.
#
# ⚠️ NO FIXTURE RESETS THE DATABASE. A sibling harness learned that the expensive
# way: nine resets ran it past a job cap and the step was CANCELLED, which is
# neither a pass nor a failure. Every invocation of the check mints a new
# shopkeeper, a new shop and fresh sale uuids, so two runs cannot collide.
#
# Run:  supabase start && bash docs/checks/5c-ii-a-flush-contract-falsify.sh
# Exit: 0 when all nine fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5c-ii-a-flush-contract.sh"
FLUSH="app/src/api/flush.ts"
WORKSPACE="app/src/api/workspace.ts"
[[ -r "$CHECK" && -r "$FLUSH" && -r "$WORKSPACE" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

fresh() {
  cp "$FLUSH" "$WORK/flush.ts"
  cp "$WORKSPACE" "$WORK/workspace.ts"
  cp "$CHECK" "$WORK/check.sh"
}

# Replace inside the copied module, asserting the anchor was there and that the
# file actually changed — the per-fixture anti-vacuity guard, without which an
# edited-nothing fixture reports a false green.
mutate() {
  python3 - "$WORK/flush.ts" "$1" "$2" <<'PY'
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

# $1 label, $2 expected outcome (red|green), $3 substring the output must contain
fixture() {
  local label="$1" want="$2" needle="$3" out rc
  ran=$((ran+1))
  out="$(bash "$WORK/check.sh" "$WORK/flush.ts" "$WORK/workspace.ts" 2>&1)"; rc=$?
  if [[ "$want" == "green" ]]; then
    if (( rc == 0 )); then echo "  ok    $label — green, as recorded"
    else
      echo "FAIL: $label should be GREEN and the check failed:"; sed 's/^/        /' <<< "$out"
      fails=$((fails+1))
    fi
    return
  fi
  if (( rc == 0 )); then
    echo "FAIL: $label should be RED and the check passed — the guard cannot see this defect"
    fails=$((fails+1))
  elif ! grep -qF "$needle" <<< "$out"; then
    echo "FAIL: $label was red for the WRONG REASON. Expected a failure mentioning:"
    echo "        $needle"
    sed 's/^/        /' <<< "$out"
    fails=$((fails+1))
  else
    echo "  ok    $label — red, and the message names the defect"
  fi
}

# --- W0. control ------------------------------------------------------------
# ⚠️ A harness whose baseline is red runs no fixture at all: every "red" below
# would then be the baseline's red and would prove nothing. It is also what says
# BOTH copied modules were copied.
fresh
fixture "W0 control — the unmutated flush" green ""

# --- W1. the sale RPC's name drifts ----------------------------------------
# The whole reason this check exists: a rename is not a type error, it is a 404.
fresh
mutate "sale: 'record_sale'," "sale: 'record_sales',"
fixture "W1 record_sale renamed" red "record_sales"

# --- W2. the argument PREFIX drifts ----------------------------------------
# ⚠️⚠️ THE ONE THAT IS UNIQUE TO THIS MODULE. Every other `src/api/` module types
# its `p_` names out; this one builds them from the payload's own keys, because
# `0024` stores them bare and `0026` reads them bare. If the prefix rule goes, so
# does every argument name at once — and a typecheck sees nothing.
fresh
mutate 'args[`p_${key}`] = write.payload[key];' 'args[`q_${key}`] = write.payload[key];'
fixture "W2 the p_ prefix becomes q_" red "PGRST202"

# --- W3. the occurred_at argument is renamed -------------------------------
fresh
mutate "args.p_occurred_at = occurredAt(write);" "args.p_occurred_when = occurredAt(write);"
fixture "W3 p_occurred_at renamed" red "PGRST202"

# --- W4. the recorded_offline argument is renamed --------------------------
# ⚠️ THE EXPENSIVE ONE IN A SHOP: this argument decides whether the server
# overrides `occurred_at`, so a silent drift re-dates every offline sale.
fresh
mutate "args.p_recorded_offline = recordedOffline(write);" "args.p_offline = recordedOffline(write);"
fixture "W4 p_recorded_offline renamed" red "PGRST202"

# --- W5. the id argument is renamed ----------------------------------------
fresh
mutate "{ p_id: write.id }" "{ p_key: write.id }"
fixture "W5 p_id renamed" red "PGRST202"

# --- W6. a kind loses the function it is sent to ---------------------------
# The queue accepts four kinds (`0024`'s CHECK constraint), so a drifted name on
# any of them is a write that can never leave the phone — and only the four-kind
# probe would notice, because a shop selling nothing but sales never meets it.
fresh
mutate "transfer: 'record_transfer'," "transfer: 'record_transfers',"
fixture "W6 record_transfer renamed" red "transfer=PGRST202"

fresh
mutate "purchase: 'record_purchase'," "purchase: 'record_purchases',"
fixture "W7 record_purchase renamed" red "purchase=PGRST202"

# --- W8. the refused argument is renamed -----------------------------------
# The flush strips `replay_of_failed_write_id` by name. Rename it in the app and
# the strip silently stops matching — `0025`'s manager fence and its exemption
# from the clamp and the void window would then be reachable from a payload.
fresh
mutate "'replay_of_failed_write_id'" "'replay_marker_id'"
fixture "W8 the refused replay key renamed" red "is not an argument"

echo
EXPECTED=9
if (( ran < EXPECTED )); then
  echo "FAIL: only $ran fixtures ran, expected $EXPECTED — this harness asserted"
  echo "      almost nothing and was about to report success."
  exit 1
fi
if (( fails > 0 )); then
  echo "$ran fixtures ran, $fails behaved differently from the record."
  exit 1
fi
echo "all $ran fixtures behaved as recorded — the check still fails, for the"
echo "stated reason, on every way the flush's contract can drift away from the"
echo "functions it sends to."

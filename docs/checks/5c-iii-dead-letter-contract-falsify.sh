#!/usr/bin/env bash
# 5c-iii-dead-letter-contract-falsify — the eleven fixtures the dead-letter
# contract check was tested against, kept as a script rather than as a paragraph
# claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every check in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5c-iii-dead-letter-contract.sh` still FAILS on each defect it was
# written for — the only way to know it has not been loosened into a check that
# passes on everything.
#
# ⚠️⚠️ EVERY FIXTURE HERE MUTATES THE APP RATHER THAN THE DATABASE, AND THAT IS
# THE SHAPE OF THE DEFECT THIS CHECK EXISTS FOR. The applied functions are
# append-only and CI-verified; the side that drifts is `@/api/deadletter`. Six
# fixtures drift a NAME and demand the check meet the 404 a shop would; five
# drift a JUDGEMENT — a code moved from one side of the classification to the
# other, or a kind added to the downgrade list — and demand the check meet the
# database that disagrees.
#
# ⚠️⚠️ THE JUDGEMENT FIXTURES ARE THE ONES WORTH READING, because a misfiled code
# is not a 404. It is a green build, a green suite, a green typecheck, and a
# ledger that quietly stops matching what the shopkeeper typed:
#
#   * `Y6` puts `TD002` on the permanent list. "Not enough stock" looks like the
#     most permanent refusal there is; the check measures that the identical
#     retry LANDS, because `0017` skips enforcement when `recorded_offline` is
#     true and the flush's second attempt always sets it.
#   * `Y7` puts `PGRST301` on it — the expired session. That is a whole queue
#     dead-lettered the first time a token goes stale in a shop with no signal.
#   * `Y8` takes `42501` off it. §2.6's own example of a permanent failure then
#     retries forever, and the drain stops behind it.
#   * `Y9` adds `purchase` to the downgraded kinds, which is the auto-upgrade
#     `0024`'s amendment 2 exists to refuse.
#   * `Y10` stops `locationOf` reading `from_location_id`, so a dead-lettered
#     transfer lands with no store for §2.10's check to attribute it to.
#
# ⚠️ THE RULE FROM 2026-09-13 IS APPLIED: WHEN AN ASSERTION GAINS A NEW INPUT, THE
# THING THAT FALSIFIES IT GAINS THE SAME INPUT. The check reads TWO app modules —
# `deadletter.ts` and `workspace.ts` — and both are copied, which `Y0`'s green is
# what confirms.
#
# ⚠️ NO FIXTURE RESETS THE DATABASE. A sibling harness learned that the expensive
# way: nine resets ran it past a job cap and the step was CANCELLED, which is
# neither a pass nor a failure. Every invocation of the check mints a new
# shopkeeper, a new shop and fresh uuids, so two runs cannot collide.
#
# Run:  supabase start && bash docs/checks/5c-iii-dead-letter-contract-falsify.sh
# Exit: 0 when all eleven fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5c-iii-dead-letter-contract.sh"
DEADLETTER="app/src/api/deadletter.ts"
WORKSPACE="app/src/api/workspace.ts"
[[ -r "$CHECK" && -r "$DEADLETTER" && -r "$WORKSPACE" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

fresh() {
  cp "$DEADLETTER" "$WORK/deadletter.ts"
  cp "$WORKSPACE" "$WORK/workspace.ts"
  cp "$CHECK" "$WORK/check.sh"
}

# Replace inside the copied module, asserting the anchor was there and that the
# file actually changed — the per-fixture anti-vacuity guard, without which an
# edited-nothing fixture reports a false green.
mutate() {
  python3 - "$WORK/deadletter.ts" "$1" "$2" <<'PY'
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
  out="$(bash "$WORK/check.sh" "$WORK/deadletter.ts" "$WORK/workspace.ts" 2>&1)"; rc=$?
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

# --- Y0. control ------------------------------------------------------------
# ⚠️ A harness whose baseline is red runs no fixture at all: every "red" below
# would then be the baseline's red and would prove nothing. It is also what says
# BOTH copied modules were copied.
fresh
fixture "Y0 control — the unmutated contract" green ""

# --- Y1. the RPC's name drifts ---------------------------------------------
# A rename is not a type error; it is a 404, and the dead letter never files.
fresh
mutate "RECORD_FAILED_WRITE = 'record_failed_write'" "RECORD_FAILED_WRITE = 'record_failed_writes'"
fixture "Y1 record_failed_write renamed" red "PGRST202"

# --- Y2-Y5. the argument names drift ---------------------------------------
# ⚠️ `p_workspace_id` IS THE ONE WITH NO SIBLING ON THE SEND PATH. No `record_*`
# function takes a workspace at all, so this argument exists on exactly one call
# in the whole app and nothing else would ever notice it drifting.
fresh
mutate "p_workspace_id: write.workspaceId," "p_shop_id: write.workspaceId,"
fixture "Y2 p_workspace_id renamed" red "PGRST202"

fresh
mutate "p_payload: write.payload," "p_arguments: write.payload,"
fixture "Y3 p_payload renamed" red "PGRST202"

fresh
mutate "p_error_code: failure.code," "p_code: failure.code,"
fixture "Y4 p_error_code renamed" red "PGRST202"

fresh
mutate "p_id: write.id," "p_write_id: write.id,"
fixture "Y5 p_id renamed" red "PGRST202"

# --- Y6. a self-clearing refusal is called permanent -----------------------
# ⚠️⚠️ THE EXPENSIVE ONE IN A SHOP, AND NOTHING BUT A DATABASE CAN SEE IT. The
# suite would stay green: `classify` would simply return `permanent` for a code
# on its own list. Only a real `record_sale` can say that the identical retry
# LANDS — so dead-lettering it downgrades a sale that was about to be recorded
# in full, and the money disappears from Números.
fresh
mutate "  TD001: 'this id was already recorded with a different payload'," \
       "  TD002: 'not enough stock',
  TD001: 'this id was already recorded with a different payload',"
fixture "Y6 TD002 called permanent" red "0017 and 0020 guard the availability check"

# --- Y7. the expired session is called permanent ---------------------------
fresh
mutate "  TD001: 'this id was already recorded with a different payload'," \
       "  PGRST301: 'the session is gone',
  TD001: 'this id was already recorded with a different payload',"
fixture "Y7 PGRST301 called permanent" red "EVERY QUEUED SALE IS DEAD-LETTERED"

# --- Y8. §2.6's own example is called transient ----------------------------
fresh
mutate "  '42501': 'the caller may no longer write at that location'," ""
fixture "Y8 42501 no longer dead-lettered" red "which the app retries"

# --- Y9. a purchase is expected to downgrade -------------------------------
# `0024` amendment 2: the stock is ON the shelf with a manager holding the
# delivery note, and an upgrade would open a zero-cost lot and then double it.
fresh
mutate "DOWNGRADED_KINDS = ['sale', 'waste']" "DOWNGRADED_KINDS = ['sale', 'waste', 'purchase']"
fixture "Y9 purchase added to the downgraded kinds" red "the pair disagreed"

# --- Y10. a transfer loses its store ---------------------------------------
fresh
mutate "for (const key of ['location_id', 'from_location_id']) {" \
       "for (const key of ['location_id']) {"
fixture "Y10 locationOf stops reading from_location_id" red "the transfer's location was"

echo
EXPECTED=11
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
echo "stated reason, on every way the classification can drift away from the"
echo "codes the database raises and the downgrade it runs."

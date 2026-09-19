#!/usr/bin/env bash
# 5b.8-iii-split-coverage-falsify — the twelve fixtures the 5b.8-iii split guard
# was checked against, kept as a script rather than as a paragraph claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every guard in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b.8-iii-split-coverage.sh` still FAILS on each defect it was written
# for — the only way to know it has not been loosened into a check that passes on
# everything.
#
# ⚠️⚠️ AND IT EXISTS BECAUSE A SISTER HARNESS SPENT A DAY DEAD. On 2026-09-13
# `conventions-gate-falsify.sh` stopped running all sixteen of its fixtures,
# silently, because the gate it falsifies gained a new input file the harness had
# never been told to copy — the baseline went red and the harness refuses to run a
# fixture against a red baseline. Both scripts still existed, both were still
# invoked, and nothing was red anywhere. The rule that came out of it is applied
# here: WHEN AN ASSERTION GAINS A NEW INPUT, THE THING THAT FALSIFIES IT GAINS THE
# SAME INPUT. This guard reads exactly one file, and `S0` is what says so.
#
# ⚠️ EVERY MUTATION IS SCOPED TO ONE TABLE ROW, BY NAME, rather than to a phrase.
# That is `Y2`'s lesson inherited, and it binds harder here than in any of the four
# older harnesses: THE PARENT IS A STRICT PREFIX OF BOTH CHILDREN, and the parent
# promises every deliverable by construction, so an edit anchored on a phrase lands
# in whichever row grep reached first and the guard reports a DROPPED deliverable
# instead of a MISROUTED one. A fixture that is red for the wrong reason is not a
# falsification, it is a coincidence.
#
# ⚠️⚠️ THE PREFIX TRAP, NAMED: `5b.8-iii` IS A PREFIX OF `5b.8-iii-a` AND
# `5b.8-iii-b`. `mutate_row` matches `| **<task>** |` INCLUDING the closing pipe,
# which is what keeps the parent's fixtures off its children — and `S1` is the
# fixture that proves the matcher still separates them rather than assuming it.
#
# ⚠️ TWO HELPERS, NOT ONE. A deliverable can be named more than once in a row, so
# an edit that STRIKES a deliverable has to strike EVERY mention of it in that row.
# `mutate_row` replaces the first occurrence, `strike_row` replaces all of them,
# and a fixture using the wrong one is green for a reason that has nothing to do
# with the guard.
#
# ⚠️⚠️ AND `X1` IS A CROSS-GUARD FIXTURE, WHICH NONE OF THE FOUR OLDER HARNESSES
# HAS. `5b.8-iii-split-coverage.sh`'s header CLAIMS that adding two child rows
# leaves `5b.8-split-coverage.sh`'s 14/14 intact, because that guard's matcher
# carries the same trailing pipe. A claim about another script is exactly the kind
# of thing this repository requires evidence for, so `X1` runs that guard against
# this tree and asserts it is still green.
#
# Run:  bash docs/checks/5b.8-iii-split-coverage-falsify.sh
# Exit: 0 when all twelve fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b.8-iii-split-coverage.sh"
PARENT_CHECK="docs/checks/5b.8-split-coverage.sh"
PLAN="docs/PLAN.md"
[[ -r "$CHECK" && -r "$PLAN" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

reset() { cp "$PLAN" "$WORK/plan.md"; }

# Replace the FIRST occurrence inside ONE build-order row, identified by its bold
# task name. Asserts the row exists, that exactly one row carries that name, that
# the anchor is in it, and that the file actually changed — the per-fixture
# anti-vacuity guard, without which an edited-nothing fixture reports a false green.
mutate_row() {
  local task="$1" from="$2" to="$3"
  python3 - "$WORK/plan.md" "$task" "$from" "$to" 1 <<'PY'
import io,sys
p,task,f,t,first=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4],sys.argv[5]=="1"
lines=io.open(p,encoding="utf-8").readlines()
head="| **%s** |" % task
idx=[n for n,l in enumerate(lines) if l.startswith(head)]
if len(idx)!=1: sys.exit("expected exactly one %s row, found %d" % (task,len(idx)))
n=idx[0]
if f not in lines[n]: sys.exit("anchor not present in the %s row: %s" % (task,f[:60]))
before=lines[n]
lines[n]=lines[n].replace(f,t,1) if first else lines[n].replace(f,t)
if lines[n]==before: sys.exit("the mutation changed nothing — fixture void")
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
}

# Replace EVERY occurrence inside one row. ⚠️ This is what a deliverable actually
# LEAVING a row looks like.
strike_row() {
  local task="$1" from="$2" to="$3"
  python3 - "$WORK/plan.md" "$task" "$from" "$to" 0 <<'PY'
import io,sys
p,task,f,t,first=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4],sys.argv[5]=="1"
lines=io.open(p,encoding="utf-8").readlines()
head="| **%s** |" % task
idx=[n for n,l in enumerate(lines) if l.startswith(head)]
if len(idx)!=1: sys.exit("expected exactly one %s row, found %d" % (task,len(idx)))
n=idx[0]
if f not in lines[n]: sys.exit("anchor not present in the %s row: %s" % (task,f[:60]))
before=lines[n]
lines[n]=lines[n].replace(f,t,1) if first else lines[n].replace(f,t)
if lines[n]==before: sys.exit("the mutation changed nothing — fixture void")
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
}

drop_row() {
  local task="$1"
  python3 - "$WORK/plan.md" "$task" <<'PY'
import io,sys
p,task=sys.argv[1],sys.argv[2]
lines=io.open(p,encoding="utf-8").readlines()
head="| **%s** |" % task
out=[l for l in lines if not l.startswith(head)]
if len(out)==len(lines): sys.exit("no %s row to drop — fixture void" % task)
io.open(p,"w",encoding="utf-8").writelines(out)
PY
}

dupe_row() {
  local task="$1"
  python3 - "$WORK/plan.md" "$task" <<'PY'
import io,sys
p,task=sys.argv[1],sys.argv[2]
lines=io.open(p,encoding="utf-8").readlines()
head="| **%s** |" % task
idx=[n for n,l in enumerate(lines) if l.startswith(head)]
if len(idx)!=1: sys.exit("expected exactly one %s row, found %d" % (task,len(idx)))
lines.insert(idx[0]+1, lines[idx[0]])
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
}

# $1 label, $2 expected outcome (red|green), $3 substring the output must contain
fixture() {
  local label="$1" want="$2" needle="$3" out rc
  ran=$((ran+1))
  out="$(bash "$CHECK" "$WORK/plan.md" 2>&1)"; rc=$?
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
    echo "  ok    $label — red, and for the recorded reason"
  fi
}

# --- S0 the baseline -------------------------------------------------------
# ⚠️ EVERY FIXTURE BELOW IS MEANINGLESS IF THIS IS RED, which is the failure mode
# `conventions-gate-falsify.sh` shipped with for a day. The guard reads exactly
# one file, so the copy below is its whole world.
reset
fixture "S0  the tree as committed" green ""
if (( fails > 0 )); then
  echo
  echo "FAIL: the baseline is red, so no fixture below would mean anything. Stopping."
  exit 1
fi

# --- S1 the prefix trap ----------------------------------------------------
# ⚠️ THE ONE THAT PROTECTS EVERY OTHER FIXTURE. If `| **5b.8-iii** |` ever matched
# inside its own children, the parent's coverage check would read a child's row and
# every routing assertion below would pass on a broken tree. This edits the PARENT
# only; if the matcher leaked, child A would lose the RPC too and the failure would
# name a DROPPED deliverable rather than a vacuous parent.
reset
strike_row "5b.8-iii" "set_my_display_name" "XX_RENAMED_XX"
fixture "S1  parent loses the RPC; the children are untouched" red "no longer named in the parent"

# --- F1 a deliverable dropped by the split ---------------------------------
reset
strike_row "5b.8-iii-a" "set_my_display_name" "XX_RENAMED_XX"
fixture "F1  the RPC is in the parent and in neither child" red "dropped by the split"

# --- F2 a deliverable misrouted --------------------------------------------
# ⚠️ THE DEFECT THIS WHOLE FAMILY OF GUARDS EXISTS FOR, and the only one that is
# invisible to a human reading two rows quickly: the work is claimed, by the wrong
# task, and both sessions read as complete.
reset
strike_row "5b.8-iii-a" "set_my_display_name" "XX_RENAMED_XX"
mutate_row "5b.8-iii-b" "No migration" "It ships set_my_display_name. No migration"
fixture "F2  the RPC moves to the screen half" red "landed in 5b.8-iii-b"

# --- F3 a deliverable claimed by both children -----------------------------
# ⚠️ Two tasks each assuming the other ships it is how a deliverable falls between
# them while both rows read as complete.
reset
mutate_row "5b.8-iii-b" "No migration" "It also ships set_my_display_name. No migration"
fixture "F3  both children claim the RPC" red "owned by neither"

# --- F4 the screen half's own deliverable dropped --------------------------
# ⚠️ NOT A DUPLICATE OF F1. F1 strikes a deliverable owned by the MIGRATION half;
# this strikes the only one owned by the SCREEN half. A guard with an off-by-one in
# its owner comparison passes one of these and fails the other.
reset
strike_row "5b.8-iii-b" "control lives on the sheet" "XX_GONE_XX"
fixture "F4  the screen half loses the control" red "dropped by the split"

# --- F5 a child row stated twice -------------------------------------------
reset
dupe_row "5b.8-iii-a"
fixture "F5  the migration half is stated twice" red "appears 2 times"

# --- F6 a child row missing altogether -------------------------------------
reset
drop_row "5b.8-iii-b"
fixture "F6  the screen half has no row at all" red "no table row for 5b.8-iii-b"

# --- F7 the workspace-scoping decision erased ------------------------------
# ⚠️ A DECISION, NOT A DELIVERABLE. It goes into an applied function signature
# under an automated merge, and this row is the only record of why it is scoped.
reset
strike_row "5b.8-iii-a" "IT IS WORKSPACE-SCOPED" "IT IS SOMETHING"
fixture "F7  the scoping decision leaves the row" red "no longer says the RPC is workspace-scoped"

# --- F8 the column-not-row refusal erased ----------------------------------
# ⚠️ THE TENANCY WALL. Without this sentence the next session writes the own-row
# policy and hands every cashier her own role column.
reset
strike_row "5b.8-iii-a" "RLS FILTERS ROWS, NOT COLUMNS" "RLS IS FINE HERE"
fixture "F8  the own-row policy is no longer refused by name" red "rows and not columns"

# --- F9 the parent left takeable -------------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what this costs: a session
# takes the `L` the split exists to prevent.
reset
strike_row "5b.8-iii" "NO LONGER TAKEABLE" "STILL PERFECTLY TAKEABLE"
fixture "F9  the parent still reads as a task" red "does not say it is no longer takeable"

# --- X1 the cross-guard claim ----------------------------------------------
# ⚠️ THE HEADER OF THE GUARD THIS FALSIFIES MAKES A CLAIM ABOUT A DIFFERENT
# SCRIPT: that `5b.8-split-coverage.sh` is unaffected by the two rows added under
# `5b.8-iii`, because its matcher carries the same trailing pipe. "A file is not
# evidence" applies to that sentence too.
ran=$((ran+1))
reset
if [[ ! -r "$PARENT_CHECK" ]]; then
  echo "FAIL: X1 cannot run — $PARENT_CHECK is missing, and the guard's header"
  echo "      claims something about it."
  fails=$((fails+1))
else
  x_out="$(bash "$PARENT_CHECK" "$WORK/plan.md" 2>&1)"; x_rc=$?
  if (( x_rc == 0 )) && grep -qF "14/14" <<< "$x_out"; then
    echo "  ok    X1  the parent 5b.8 guard still sees 14/14 across this split"
  else
    echo "FAIL: X1 — adding 5b.8-iii's two children changed what 5b.8-split-coverage.sh"
    echo "      sees. The trailing-pipe claim in the guard's header is false:"
    sed 's/^/        /' <<< "$x_out"
    fails=$((fails+1))
  fi
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4. A harness that runs no fixtures also reports
# zero failures, which is precisely how the sister harness spent a day dead.
if (( fails == 0 && ran < 12 )); then
  echo "FAIL: only $ran fixtures ran, expected 12 — this harness proved almost nothing"
  echo "      and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran fixtures behaved as recorded — the guard still fails on a dropped"
  echo "deliverable, a misrouted one, a doubly-claimed one, a duplicated row, a"
  echo "missing row, both erased decisions and a takeable parent."
  exit 0
fi
echo "$ran fixture(s) ran, $fails did not behave as recorded — the guard has been loosened."
exit 1

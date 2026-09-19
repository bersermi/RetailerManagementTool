#!/usr/bin/env bash
# 5b-iii-split-coverage-falsify — the sixteen fixtures the 5b-iii split guard was
# checked against, kept as a script rather than as a paragraph claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every guard in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b-iii-split-coverage.sh` still FAILS on each defect it was written for
# — the only way to know it has not been loosened into a check that passes on
# everything.
#
# ⚠️⚠️ AND IT EXISTS BECAUSE A SISTER HARNESS SPENT A DAY DEAD. On 2026-09-13
# `conventions-gate-falsify.sh` stopped running all sixteen of its fixtures,
# silently, because the gate it falsifies gained a new input file the harness had
# never been told to copy — the baseline went red and the harness refuses to run a
# fixture against a red baseline. Both scripts still existed, both were still
# invoked, and nothing was red anywhere. The rule that came out of it is applied
# here: WHEN AN ASSERTION GAINS A NEW INPUT, THE THING THAT FALSIFIES IT GAINS THE
# SAME INPUT. The guard reads exactly one file, and `S0` is what says so.
#
# ⚠️ EVERY MUTATION IS SCOPED TO ONE TABLE ROW, BY NAME, rather than to a phrase.
# That is `Y2`'s lesson inherited, and it binds harder here than in any of the five
# older harnesses: `5b-i` IS A PREFIX OF `5b-iii`, WHICH IS A PREFIX OF ALL FOUR
# CHILDREN, and the parent promises every deliverable by construction — so an edit
# anchored on a phrase lands in whichever row grep reached first and the guard
# reports a DROPPED deliverable instead of a MISROUTED one. A fixture that is red
# for the wrong reason is not a falsification, it is a coincidence.
#
# ⚠️ TWO HELPERS, NOT ONE. A deliverable can be named more than once in a row, so
# an edit that STRIKES a deliverable has to strike EVERY mention of it in that row.
# `mutate_row` replaces the first occurrence, `strike_row` replaces all of them,
# and a fixture using the wrong one is green for a reason that has nothing to do
# with the guard.
#
# ⚠️⚠️ `X1` AND `X2` ARE CROSS-GUARD FIXTURES. This split adds four rows under a
# task that two OTHER instruments already read: `5b-split-coverage.sh` routes five
# deliverables to `| **5b-iii** |`, and `plan-handover.sh` reads whichever row
# carries the next-task marker. Both claims — that the trailing pipe keeps the new
# rows invisible to the first, and that the marker moved cleanly to a child for the
# second — are claims about other scripts, and this repository requires evidence
# for those too.
#
# Run:  bash docs/checks/5b-iii-split-coverage-falsify.sh
# Exit: 0 when all sixteen fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b-iii-split-coverage.sh"
PARENT_CHECK="docs/checks/5b-split-coverage.sh"
HANDOVER="docs/checks/plan-handover.sh"
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

# Strip the bold markers from one row's task cell, leaving the row in the table
# and the text intact. ⚠️ This is what a hand-edited row looks like, and the guard
# must read it as MISSING rather than silently matching something else.
unbold_row() {
  local task="$1"
  python3 - "$WORK/plan.md" "$task" <<'PY'
import io,sys
p,task=sys.argv[1],sys.argv[2]
lines=io.open(p,encoding="utf-8").readlines()
head="| **%s** |" % task
idx=[n for n,l in enumerate(lines) if l.startswith(head)]
if len(idx)!=1: sys.exit("expected exactly one %s row, found %d" % (task,len(idx)))
n=idx[0]
lines[n]=lines[n].replace(head, "| %s |" % task, 1)
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
# ⚠️ THE ONE THAT PROTECTS EVERY OTHER FIXTURE, and the chain is three deep here.
# If `| **5b-iii** |` ever matched inside its own children, the parent's coverage
# check would read a child's row and every routing assertion below would pass on a
# broken tree. This edits the PARENT only; if the matcher leaked, child A would
# lose the marker too and the failure would name a DROPPED deliverable rather than
# a vacuous parent.
reset
strike_row "5b-iii" "ALREADY_REQUESTED_MARKER" "XX_RENAMED_XX"
fixture "S1  parent loses the marker; the four children are untouched" red "no longer named in the parent"

# --- S2 a deliverable dropped by the split ---------------------------------
reset
strike_row "5b-iii-c" "auth_full_name" "XX_RENAMED_XX"
fixture "S2  the name read is in the parent and in no child" red "dropped by the split"

# --- S3 a deliverable misrouted --------------------------------------------
# ⚠️ THE DEFECT THIS WHOLE FAMILY OF GUARDS EXISTS FOR, and the only one that is
# invisible to a person reading two rows quickly: the work is claimed, by the wrong
# task, and both sessions read as complete. ⚠️ The badge is the realistic instance
# — a session building the joiner's half finds a notifications icon convenient and
# takes it, and the approver's half is left with no way in.
reset
strike_row "5b-iii-d" "C11.8" "the badge"
mutate_row "5b-iii-b" "It ships NO migration" "It also ships C11.8's badge. It ships NO migration"
fixture "S3  the badge moves from the approver's half to the joiner's" red "landed in 5b-iii-b"

# --- S4 a deliverable claimed by two children ------------------------------
# ⚠️ Two tasks each assuming the other ships it is how a deliverable falls between
# them while both rows read as complete.
# ⚠️ THE MUTATION GOES INTO THE OTHER CHILD, NOT THE OWNER. The first spelling of
# this fixture added the picker to `5b-iii-d` — the row that already holds it —
# and the guard stayed GREEN, correctly, because one child still owned it. A
# fixture that edits the owning row is not testing double ownership at all, and it
# reports the guard as loosened when nothing is wrong with it.
reset
mutate_row "5b-iii-b" "It ships NO migration" "It also ships the location picker. It ships NO migration"
fixture "S4  two children claim the location picker" red "owned by neither"

# --- S5 the SECOND migration child's deliverable dropped -------------------
# ⚠️ NOT A DUPLICATE OF S2. S2 strikes `5b-iii-c`'s only deliverable; this strikes
# one of `5b-iii-a`'s four. A guard with an off-by-one in its owner comparison
# passes one of these and fails the other.
reset
strike_row "5b-iii-a" "this token is not valid" "XX_GONE_XX"
fixture "S5  the dead-token code leaves the migration half" red "dropped by the split"

# --- S6 a client child's deliverable dropped -------------------------------
# ⚠️ THE THIRD SHAPE: a deliverable owned by a child that ships NO migration. Its
# failure is slower and cheaper — a screen nobody builds, found by the owner on his
# own phone during a pilot — and §2.11 bans the rendering suite that would notice.
reset
strike_row "5b-iii-b" "my_access_requests" "XX_GONE_XX"
fixture "S6  the joiner's pending state leaves the joiner's half" red "dropped by the split"

# --- S7 a child row stated twice -------------------------------------------
reset
dupe_row "5b-iii-a"
fixture "S7  the first migration half is stated twice" red "appears 2 times"

# --- S8 a child row missing altogether -------------------------------------
reset
drop_row "5b-iii-d"
fixture "S8  the approver's half has no row at all" red "no table row for 5b-iii-d"

# --- S9 a child row left in the table but unbolded -------------------------
# ⚠️ NOT A DUPLICATE OF S8. The row is still there and still readable by a person;
# the guard must not match it. This is what says the `**` in the matcher is doing
# work rather than being decoration — and it is the shape a hand-edit produces.
reset
unbold_row "5b-iii-c"
fixture "S9  the name-read half is in the table but not bold" red "no table row for 5b-iii-c"

# --- S10 the marker-and-assertion rule erased ------------------------------
# ⚠️ A DECISION, NOT A DELIVERABLE, and this one protects a CHECK. Retire a marker
# and leave the assertion that drives it and the contract check asserts a rule that
# is no longer true — red on a correct tree.
reset
strike_row "5b-iii-a" "RETIRE IN THE SAME PASS" "GET SORTED OUT EVENTUALLY"
fixture "S10 the marker-and-assertion rule leaves the row" red "retire in the same pass"

# --- S11 the name-column refusal erased ------------------------------------
# ⚠️ Without this sentence the next session adds the column, and it is meaningful
# on one `source` and empty on the other — append-only, under an automated merge.
reset
strike_row "5b-iii-c" "column whose meaning depends on another column" "perfectly ordinary column"
fixture "S11 the name column is no longer refused by name" red "refuses a name column on the request row"

# --- S12 D8's silent failure erased ----------------------------------------
# ⚠️ THE ONE THAT REACHES A SHOP. Drop it and the obvious kindness — let it
# through, default it, ask later — produces a cashier who can write nothing and is
# told nothing.
reset
strike_row "5b-iii-d" "WRITES NOTHING, SILENTLY" "IS PROBABLY FINE"
fixture "S12 D8's silent failure leaves the row" red "writes nothing, silently"

# --- S13 the parent left takeable ------------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what this costs: a session
# takes the `XL` the split exists to prevent — two migrations and two screens.
reset
strike_row "5b-iii" "NO LONGER TAKEABLE" "STILL PERFECTLY TAKEABLE"
fixture "S13 the parent still reads as a task" red "does not say it is no longer takeable"

# --- X1 the cross-guard claim: the parent guard is unmoved -----------------
# ⚠️ THE HEADER OF THE GUARD THIS FALSIFIES MAKES A CLAIM ABOUT A DIFFERENT
# SCRIPT: that `5b-split-coverage.sh` is unaffected by four rows added under
# `5b-iii`, because its matcher carries the same trailing pipe. "A file is not
# evidence" applies to that sentence too.
ran=$((ran+1))
reset
if [[ ! -r "$PARENT_CHECK" ]]; then
  echo "FAIL: X1 cannot run — $PARENT_CHECK is missing, and the guard's header"
  echo "      claims something about it."
  fails=$((fails+1))
else
  x_out="$(bash "$PARENT_CHECK" "$WORK/plan.md" 2>&1)"; x_rc=$?
  if (( x_rc == 0 )) && grep -qF "15/15" <<< "$x_out"; then
    echo "  ok    X1  the parent 5b guard still sees 15/15 across this split"
  else
    echo "FAIL: X1 — adding 5b-iii's four children changed what 5b-split-coverage.sh"
    echo "      sees. The trailing-pipe claim in the guard's header is false:"
    sed 's/^/        /' <<< "$x_out"
    fails=$((fails+1))
  fi
fi

# --- X2 the cross-guard claim: the marker moved cleanly --------------------
# ⚠️⚠️ THE SECOND CROSS-GUARD FIXTURE, AND NO OLDER HARNESS HERE HAS ONE. A split
# moves the next-task marker from the parent onto a child, and `plan-handover.sh`
# asserts that exactly one row carries it AND that the newest status-log entry
# names the same task. ⚠️ THAT IS THE ASSERTION THIS REPOSITORY HAS BROKEN MOST
# OFTEN — twice by striking the sentence in the parent row, which is a rendering
# the grep does not see. This runs the handover guard against the tree and ignores
# only its working-tree cleanliness group, which is about the owner's Mac rather
# than about the split.
#
# ⚠️⚠️ IT READS WHICH CHILD RATHER THAN NAMING ONE, AND THAT IS A FIX, NOT A
# LOOSENING — IT WENT RED IN CI ON 2026-09-19 THE FIRST TIME A CHILD SHIPPED.
# The first spelling hard-coded `agree on 5b-iii-a`, which was true on the day
# the split landed and false the moment `5b-iii-a` closed and the marker moved
# to `5b-iii-b`. That pins the fixture to a MOMENT instead of to the claim, and
# it would have fired again at `b`→`c` and at `c`→`d` — three red runs on three
# correct trees, which is how a harness gets edited away by whoever meets it
# next. The claim was never "the marker is on `a`"; it is **"the marker is on
# exactly one of THIS SPLIT'S CHILDREN, and the status log names the same one"**.
# That is what is asserted now, and the membership test is what keeps it strict:
# a marker that wandered onto `5b-iii` itself, onto `5b.8-iii-b`, or onto a name
# this split does not contain is still red.
ran=$((ran+1))
reset
if [[ ! -r "$HANDOVER" ]]; then
  echo "FAIL: X2 cannot run — $HANDOVER is missing"
  fails=$((fails+1))
else
  h_out="$(bash "$HANDOVER" "$WORK/plan.md" 2>&1)"
  # The task name out of the handover guard's own agreement line, so the two
  # instruments are compared rather than both compared to a constant here.
  X2_TASK="$(sed -n 's/.*and the table agree on \(.*\)$/\1/p' <<< "$h_out" | head -1)"
  # ⚠️⚠️ A CHILD OR ANY DESCENDANT OF ONE, AND THAT IS THE SECOND TIME THIS
  # FIXTURE HAS BEEN PINNED TO A MOMENT INSTEAD OF TO ITS CLAIM. The spelling
  # above this comment already records going red in CI on 2026-09-19 for
  # hard-coding `5b-iii-a`; the repair listed all four children — and went red
  # again the same day, on a correct tree, the moment `5b-iii-d` was itself sized
  # and split and handed its marker DOWN to `5b-iii-d-1`. ⚠️ A child splitting is
  # not a defect; it is what `5b-iii-d`'s own gate cell ordered, and three rows in
  # this split are predicted to do the same. The claim was never "the marker is on
  # one of four names" — it is **"the marker is somewhere INSIDE this split"**.
  # ⚠️ IT IS NOT A LOOSENING: `5b-iii` itself is still refused (there is no bare
  # `5b-iii` arm), and so is `5b.8-iii-b`, `5b-iii-e`, or any name this split does
  # not contain. The lesson, which is this directory's oldest one facing a new
  # way: A FIXTURE MUST ASSERT THE CLAIM, NOT THE TREE IT WAS WRITTEN AGAINST.
  X2_OK=0
  case "$X2_TASK" in
    5b-iii-[abcd]|5b-iii-[abcd]-*) X2_OK=1 ;;
  esac
  if grep -qF "exactly one table row is marked as the next task" <<< "$h_out" \
     && (( X2_OK == 1 )); then
    echo "  ok    X2  the next-task marker is inside this split ($X2_TASK) and the header agrees"
  else
    echo "FAIL: X2 — the split left the next-task marker ambiguous, or the status log"
    echo "      and the table disagree about which child is next, or the marker is"
    echo "      on something that is not one of this split's four children or a"
    echo "      descendant of one:"
    echo "        read: '$X2_TASK'"
    sed 's/^/        /' <<< "$h_out"
    fails=$((fails+1))
  fi
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4. A harness that runs no fixtures also reports
# zero failures, which is precisely how the sister harness spent a day dead.
if (( fails == 0 && ran < 16 )); then
  echo "FAIL: only $ran fixtures ran, expected 16 — this harness proved almost nothing"
  echo "      and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran fixtures behaved as recorded — the guard still fails on a vacuous"
  echo "parent, a dropped deliverable in each of the three shapes, a misrouted one, a"
  echo "doubly-claimed one, a duplicated row, a missing row, an unbolded row, all three"
  echo "erased decisions and a takeable parent; and the two older instruments that read"
  echo "these rows are unmoved by four new ones."
  exit 0
fi
echo "$ran fixture(s) ran, $fails did not behave as recorded — the guard has been loosened."
exit 1

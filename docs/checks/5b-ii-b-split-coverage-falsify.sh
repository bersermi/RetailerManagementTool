#!/usr/bin/env bash
# 5b-ii-b-split-coverage-falsify — the nine fixtures the 5b-ii-b split guard was
# checked against, kept as a script rather than as a paragraph claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every guard in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b-ii-b-split-coverage.sh` still FAILS on each defect it was written
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
# SAME INPUT. This guard reads exactly one file, and `Q0` is what says so.
#
# ⚠️ EVERY MUTATION IS SCOPED TO ONE TABLE ROW, BY NAME, RATHER THAN TO A PHRASE.
# That is `Y2`'s lesson inherited: its first spelling anchored an insert on a
# phrase the PARENT row also carried, the edit landed in the parent — which
# already promised it — and the guard reported a DROPPED deliverable instead of a
# MISROUTED one. A fixture that is red for the wrong reason is not a
# falsification, it is a coincidence.
#
# ⚠️⚠️ AND THE ROW MATCHER HERE HAS A TRAP THE TWO OLDER HARNESSES DID NOT: THREE
# OF THESE TASK NAMES ARE PREFIXES OF EACH OTHER. `5b-ii-b` is a prefix of
# `5b-ii-b-1`. `mutate_row` matches on `| **<task>** |` INCLUDING the closing
# pipe, which is what keeps the parent's mutation off the child's row — and its
# own exactly-one-row assertion is what would catch it if that ever stopped being
# true.
#
# Run:  bash docs/checks/5b-ii-b-split-coverage-falsify.sh
# Exit: 0 when all nine fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b-ii-b-split-coverage.sh"
PLAN="docs/PLAN.md"
[[ -r "$CHECK" && -r "$PLAN" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

# Replace inside ONE build-order row, identified by its bold task name. Asserts
# the row exists, that exactly one row carries that name, that the anchor is in
# it, and that the file actually changed — the per-fixture anti-vacuity guard,
# without which an edited-nothing fixture reports a false green.
mutate_row() {
  local task="$1" from="$2" to="$3"
  python3 - "$WORK/plan.md" "$task" "$from" "$to" <<'PY'
import io,sys
p,task,f,t=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4]
lines=io.open(p,encoding="utf-8").readlines()
head="| **%s** |" % task
idx=[n for n,l in enumerate(lines) if l.startswith(head)]
if len(idx)!=1: sys.exit("expected exactly one %s row, found %d" % (task,len(idx)))
n=idx[0]
if f not in lines[n]: sys.exit("anchor not present in the %s row: %s" % (task,f[:60]))
before=lines[n]
lines[n]=lines[n].replace(f,t,1)
if lines[n]==before: sys.exit("the mutation changed nothing — fixture void")
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
    echo "  ok    $label — red, and the message names the defect"
  fi
}

fresh() { cp "$PLAN" "$WORK/plan.md"; }
guard() { [[ $? -eq 0 ]] || { echo "FAIL: fixture setup failed"; fails=$((fails+1)); }; }

# --- Q0. control -----------------------------------------------------------
# ⚠️ A harness whose baseline is red runs no fixture at all: every "red" below
# would then be the baseline's red and would prove nothing.
fresh
fixture "Q0 control, unedited" green ""

# --- Q1. a child row deleted ----------------------------------------------
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
out=[l for l in lines if not l.startswith("| **5b-ii-b-2** |")]
assert len(out) == len(lines)-1, "expected exactly one 5b-ii-b-2 row"
io.open(p,"w",encoding="utf-8").writelines(out)
PY
guard
fixture "Q1 5b-ii-b-2's row deleted" red "no table row for 5b-ii-b-2"

# --- Q2. the redemption claimed by the push half --------------------------
# ⚠️ THE COMMONEST REAL MISTAKE, and the one this seam exists to make visible: a
# session that has just wrapped `create_invite` finds `redeem_invite` one line
# below it in `0028` and takes it too. `5b-ii-b-1` ships no redemption — that is
# the whole invariant, and it is what keeps the task an `M`.
#
# ⚠️ IT IS A MOVE AND NOT A COPY. Adding `redeem_invite` to `5b-ii-b-1` while
# leaving it in `5b-ii-b-2` makes the guard say "owned by neither" — a real
# defect, covered by `Q8` below, but NOT the one this fixture is named for. The
# MISROUTED branch is only reached when a deliverable LEAVES its owner.
fresh
mutate_row "5b-ii-b-1" "; and the **date formatter**" \
                       "; **\`redeem_invite\`**; and the **date formatter**"
guard
mutate_row "5b-ii-b-2" "**\`redeem_invite\`**, off the landing" \
                       "**the redemption RPC**, off the landing"
guard
fixture "Q2 redeem_invite moved into 5b-ii-b-1" red "this split assigned it to 5b-ii-b-2"

# --- Q3. a deliverable dropped by both children ---------------------------
# ⚠️ `P4`'s whole point, and `P1`'s history. A date this app cannot format is the
# kind of thing a session discovers at the moment it needs it and then solves
# inline in a screen, where no suite can reach it.
fresh
mutate_row "5b-ii-b-1" "the **date formatter** the expiry needs" \
                       "the **expiry renderer** the token needs"
guard
fixture "Q3 the date formatter in no child" red "in the parent row and in NO child"

# --- Q4. the parent row shrinks -------------------------------------------
# ⚠️⚠️ THE EDIT THAT MAKES A COVERAGE CHECK VACUOUS RATHER THAN RED, which is this
# repository's most-recorded check defect: with the promise gone from the parent,
# "every deliverable has a home" is true of a shorter list and nothing says so.
# ⚠️ `P1` IS THE RIGHT DELIVERABLE TO TEST IT WITH, because it is the one that
# already spent six days living in a paragraph instead of a list.
fresh
mutate_row "5b-ii-b" "**\`location_select\`** read that picker needs" \
                     "**locations** read that picker needs"
guard
fixture "Q4 the location read struck from the parent row" red "no longer named in the parent 5b-ii-b row"

# --- Q5. one child stated twice -------------------------------------------
# ⚠️ `5a-iv`'s sub-split defect exactly: stated in two tables, a correction landed
# in one, the guard read the other, and the plan asserted both routings at once.
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
i=[n for n,l in enumerate(lines) if l.startswith("| **5b-ii-b-1** |")]
assert len(i)==1, "expected exactly one 5b-ii-b-1 row"
lines.insert(i[0]+1, lines[i[0]])
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
guard
fixture "Q5 5b-ii-b-1's row stated twice" red "row appears 2 times"

# --- Q6. the decision, not a deliverable ----------------------------------
# ⚠️ `P2` is a decision about what a SCREEN does — one box that decides by length,
# rather than two boxes that ask a shopkeeper which kind of code she was sent. It
# has no constraint or policy to live in, and §2.11 bans the rendering suite that
# would catch two boxes appearing. This row is the only thing holding it.
fresh
mutate_row "5b-ii-b-2" "except by LENGTH" "except by their shape"
guard
fixture "Q6 the length rule deleted from 5b-ii-b-2" red "record the decision to ask her"

# --- Q7. the parent stays takeable ----------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what this costs: a session
# walks past the children and takes the L the split exists to prevent.
fresh
mutate_row "5b-ii-b" "IT IS NO LONGER TAKEABLE" "IT IS STILL THE ONE TO TAKE"
guard
fixture "Q7 the parent row stops saying it is not takeable" red "does not say it is no longer takeable"

# --- Q8. a row describing work it does not do -----------------------------
# ⚠️ `Z8`'s shape one level down: `5b-ii-b-1` claims a write it does not ship,
# while `5b-ii-b-2` still ships it. Nothing is DROPPED — which is why a coverage
# check that only counted homes would pass — and two tasks now each assume the
# other has it, the way `4.6b`'s scope disagreed with `4.5c-ii`'s for four days.
fresh
mutate_row "5b-ii-b-1" "; and the **date formatter**" \
                       ", and **\`redeem_invite\`**; and the **date formatter**"
guard
fixture "Q8 5b-ii-b-1 also claims redeem_invite" red "owned by neither"

echo
if (( ran != 9 )); then
  echo "FAIL: $ran fixtures ran, expected 9 — the harness skipped some and was about"
  echo "      to report success, which is how a sister harness spent a day dead."
  exit 1
fi
if (( fails == 0 )); then
  echo "all 9 fixtures behaved as recorded (8 red, 1 deliberately green) —"
  echo "5b-ii-b-split-coverage.sh can still fail on every defect it was written for."
  exit 0
fi
echo "$fails of $ran fixtures did not behave as recorded."
exit 1

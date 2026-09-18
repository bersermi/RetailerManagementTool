#!/usr/bin/env bash
# 5b-ii-split-coverage-falsify — the nine fixtures the 5b-ii split guard was
# checked against, kept as a script rather than as a paragraph claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every guard in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b-ii-split-coverage.sh` still FAILS on each defect it was written for —
# the only way to know it has not been loosened into a check that passes on
# everything.
#
# ⚠️⚠️ AND IT EXISTS BECAUSE A SISTER HARNESS SPENT A DAY DEAD. On 2026-09-13
# `conventions-gate-falsify.sh` stopped running all sixteen of its fixtures,
# silently, because the gate it falsifies gained a new input file the harness had
# never been told to copy — the baseline went red and the harness refuses to run a
# fixture against a red baseline. Both scripts still existed, both were still
# invoked, and nothing was red anywhere. The rule that came out of it is applied
# here: WHEN AN ASSERTION GAINS A NEW INPUT, THE THING THAT FALSIFIES IT GAINS THE
# SAME INPUT. This guard reads exactly one file, and the control fixture is what
# says so.
#
# ⚠️ EVERY MUTATION IS SCOPED TO ONE TABLE ROW, BY NAME, RATHER THAN TO A PHRASE.
# That is `Y2`'s lesson paid forward: its first spelling anchored an insert on a
# phrase the PARENT row also carried, the badge landed in the parent — which
# already promised it — and the guard reported a DROPPED deliverable instead of a
# MISROUTED one. A fixture that is red for the wrong reason is not a falsification,
# it is a coincidence.
#
# Run:  bash docs/checks/5b-ii-split-coverage-falsify.sh
# Exit: 0 when all nine fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b-ii-split-coverage.sh"
PLAN="docs/PLAN.md"
[[ -r "$CHECK" && -r "$PLAN" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

# Replace inside ONE build-order row, identified by its bold task name. Asserts
# the row exists, that the anchor is in it, and that the file actually changed —
# the per-fixture anti-vacuity guard, without which an edited-nothing fixture
# reports a false green.
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

# --- Z0. control -----------------------------------------------------------
# ⚠️ A harness whose baseline is red runs no fixture at all: every "red" below
# would then be the baseline's red and would prove nothing.
fresh
fixture "Z0 control, unedited" green ""

# --- Z1. a child row deleted ----------------------------------------------
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
out=[l for l in lines if not l.startswith("| **5b-ii-b** |")]
assert len(out) == len(lines)-1, "expected exactly one 5b-ii-b row"
io.open(p,"w",encoding="utf-8").writelines(out)
PY
guard
fixture "Z1 5b-ii-b's row deleted" red "no table row for 5b-ii-b"

# --- Z2. a membership write claimed by the read half ----------------------
# ⚠️ THE COMMONEST REAL MISTAKE, and the one the seam exists to make visible: a
# session that has just built the roster finds the invite button one line away and
# takes it. `5b-ii-a` ships no membership write — that is the whole invariant.
#
# ⚠️ IT IS A MOVE AND NOT A COPY, AND THE FIRST SPELLING OF IT WAS A COPY. Adding
# `create_invite` to `5b-ii-a` while leaving it in `5b-ii-b` makes the guard say
# "owned by neither" — a real defect, covered by `Z8` below, but NOT the one this
# fixture is named for. The MISROUTED branch is only reached when the deliverable
# leaves its owner, and it was untested until the harness said so.
fresh
mutate_row "5b-ii-a" "; and the **density** switch" \
                     ", **\`create_invite\`**; and the **density** switch"
guard
mutate_row "5b-ii-b" "**\`create_invite\`** — four" "**the invite RPC** — four"
guard
fixture "Z2 create_invite moved into 5b-ii-a" red "this split assigned it to 5b-ii-b"

# --- Z3. a deliverable dropped by both children ---------------------------
# ⚠️ N2's whole point. The density switch was homeless for six days in prose that
# no check read; this is what it looks like going homeless again.
fresh
mutate_row "5b-ii-a" "the **density** switch finally" "the text-size switch finally"
guard
fixture "Z3 the density switch in no child" red "in the parent row and in NO child"

# --- Z4. the parent row shrinks -------------------------------------------
# ⚠️⚠️ THE EDIT THAT MAKES A COVERAGE CHECK VACUOUS RATHER THAN RED, which is this
# repository's most-recorded check defect: with the promise gone from the parent,
# "every deliverable has a home" is true of a shorter list and nothing says so.
fresh
mutate_row "5b-ii" "with its WhatsApp share (**C11.7**)" "with its WhatsApp share"
guard
fixture "Z4 the join code struck from the parent row" red "no longer named in the parent 5b-ii row"

# --- Z5. one child stated twice -------------------------------------------
# ⚠️ `5a-iv`'s sub-split defect exactly: stated in two tables, a correction landed
# in one, the guard read the other, and the plan asserted both routings at once.
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
i=[n for n,l in enumerate(lines) if l.startswith("| **5b-ii-a** |")]
assert len(i)==1, "expected exactly one 5b-ii-a row"
lines.insert(i[0]+1, lines[i[0]])
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
guard
fixture "Z5 5b-ii-a's row stated twice" red "row appears 2 times"

# --- Z6. the decision, not a deliverable ----------------------------------
# ⚠️ The roster's manager fence is a decision about what a screen RENDERS, taken
# on the owner's behalf, with no constraint or policy on the client side to live
# in. §2.11 bans the rendering suite that would otherwise catch its removal.
fresh
mutate_row "5b-ii-a" "MANAGER-AND-ABOVE" "VISIBLE TO EVERY MEMBER"
guard
fixture "Z6 the roster's manager fence deleted" red "no longer says the roster is manager-and-above"

# --- Z7. the parent stays takeable ----------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what this costs: a session
# walks past the children and takes the L the split exists to prevent.
fresh
mutate_row "5b-ii" "IT IS NO LONGER TAKEABLE" "IT IS STILL THE ONE TO TAKE"
guard
fixture "Z7 the parent row stops saying it is not takeable" red "does not say it is no longer takeable"

# --- Z8. a row describing work it does not do -----------------------------
# ⚠️ `Y8`'s shape one level down: `5b-ii-a` claims a write it does not ship, while
# `5b-ii-b` still ships it. Nothing is DROPPED — which is why a coverage check that
# only counted homes would pass — and two tasks now each assume the other has it,
# the way `4.6b`'s scope disagreed with `4.5c-ii`'s for four days.
fresh
mutate_row "5b-ii-a" "; and the **density** switch" \
                     ", and **\`redeem_invite\`**; and the **density** switch"
guard
fixture "Z8 5b-ii-a also claims redeem_invite" red "owned by neither"

echo
if (( ran != 9 )); then
  echo "FAIL: $ran fixtures ran, expected 9 — the harness skipped some and was about"
  echo "      to report success, which is how a sister harness spent a day dead."
  exit 1
fi
if (( fails == 0 )); then
  echo "all 9 fixtures behaved as recorded (8 red, 1 deliberately green) —"
  echo "5b-ii-split-coverage.sh can still fail on every defect it was written for."
  exit 0
fi
echo "$fails of $ran fixtures did not behave as recorded."
exit 1

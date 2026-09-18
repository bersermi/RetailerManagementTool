#!/usr/bin/env bash
# 5b.8-split-coverage-falsify — the ten fixtures the 5b.8 split guard was checked
# against, kept as a script rather than as a paragraph claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every guard in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b.8-split-coverage.sh` still FAILS on each defect it was written for —
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
# SAME INPUT. This guard reads exactly one file, and `S0` is what says so.
#
# ⚠️ EVERY MUTATION IS SCOPED TO ONE TABLE ROW, BY NAME, RATHER THAN TO A PHRASE.
# That is `Y2`'s lesson inherited, and it binds harder here than in the three
# older harnesses: FOUR rows share a prefix and the PARENT promises every
# deliverable by construction, so an edit anchored on a phrase lands in whichever
# row grep reached first and the guard reports a DROPPED deliverable instead of a
# MISROUTED one. A fixture that is red for the wrong reason is not a
# falsification, it is a coincidence.
#
# ⚠️⚠️ AND THE ROW MATCHER HERE CARRIES THE WORST PREFIX TRAP IN THE DIRECTORY:
# `5b.8-i` IS A PREFIX OF BOTH `5b.8-ii` AND `5b.8-iii`. `mutate_row` matches on
# `| **<task>** |` INCLUDING the closing pipe, which is what keeps one fixture's
# edit off two sibling rows — and its own exactly-one-row assertion is what would
# catch it if that ever stopped being true.
#
# ⚠️ TWO HELPERS, NOT ONE, AND THE SECOND IS WHY `S4` WORKS. A deliverable can be
# named more than once in a row — the parent says `backfill` three times, and
# `5b.8-i` names `approve_request` twice — so an edit that strikes a deliverable
# has to strike EVERY mention of it in that row. `mutate_row` replaces the first
# occurrence, `strike_row` replaces all of them, and a fixture using the wrong one
# is green for a reason that has nothing to do with the guard.
#
# Run:  bash docs/checks/5b.8-split-coverage-falsify.sh
# Exit: 0 when all ten fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b.8-split-coverage.sh"
PLAN="docs/PLAN.md"
[[ -r "$CHECK" && -r "$PLAN" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

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
# LEAVING a row looks like: the parent names the backfill three times and
# `5b.8-i` names `approve_request` twice, and a fixture that strikes one mention
# of three leaves the guard green for the right reason and the fixture wrong.
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

# --- S0. control ------------------------------------------------------------
# ⚠️ A harness whose baseline is red runs no fixture at all: every "red" below
# would then be the baseline's red and would prove nothing.
fresh
fixture "S0 control, unedited" green ""

# --- S1. a child row deleted ------------------------------------------------
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
out=[l for l in lines if not l.startswith("| **5b.8-iii** |")]
assert len(out) == len(lines)-1, "expected exactly one 5b.8-iii row"
io.open(p,"w",encoding="utf-8").writelines(out)
PY
guard
fixture "S1 5b.8-iii's row deleted" red "no table row for 5b.8-iii"

# --- S2. a writer misrouted into the client child --------------------------
# ⚠️ THE PLAUSIBLE REAL MISTAKE, and the one this seam exists to make visible.
# `approve_request` is the APPROVAL, approvals are a screen, and screens live in
# the client child — so a session reading quickly puts it there. It is a WRITE,
# it belongs in the migration, and `5b-iii` builds its screen either way.
#
# ⚠️ IT IS A MOVE AND NOT A COPY. Adding it to `5b.8-ii` while leaving it in
# `5b.8-i` makes the guard say "owned by neither" — a real defect, covered by
# `S9` below, but NOT the one this fixture is named for. The MISROUTED branch is
# only reached when a deliverable LEAVES its owner.
fresh
strike_row "5b.8-i" "approve_request" "the approval RPC"
guard
mutate_row "5b.8-ii" "the contract check and harness extended" \
                     "\`approve_request\`'s screen, the contract check and harness extended"
guard
fixture "S2 approve_request moved into 5b.8-ii" red "this split assigned it to 5b.8-i"

# --- S3. a writer dropped by every child -----------------------------------
# ⚠️⚠️ THE SHAPE THIS WHOLE SIZING EXISTS TO PREVENT. `request_access` was on no
# row at all until 2026-09-18; it reaches a pilot as two people in one shop, one
# of them nameless, and nothing in the roster able to explain why.
fresh
strike_row "5b.8-i" "\`request_access\` (\`0029:256\`), the \`D7\` fast path" \
                    "the code path where somebody already invited"
guard
fixture "S3 request_access in no child" red "in the parent row and in NO child"

# --- S4. the parent row shrinks --------------------------------------------
# ⚠️⚠️ THE EDIT THAT MAKES A COVERAGE CHECK VACUOUS RATHER THAN RED, which is this
# repository's most-recorded check defect: with the promise gone from the parent,
# "every deliverable has a home" is true of a shorter list and nothing says so.
# ⚠️ THE BACKFILL IS THE RIGHT DELIVERABLE TO TEST IT WITH, because it is the one
# that cannot be run twice — a backfill dropped from the split is a backfill
# nobody notices until the rows it should have filled are months old.
fresh
strike_row "5b.8" "backfill" "one-off fill"
guard
fixture "S4 the backfill struck from the parent row" red "no longer named in the parent 5b.8 row"

# --- S5. one child stated twice --------------------------------------------
# ⚠️ `5a-iv`'s sub-split defect exactly: stated in two tables, a correction landed
# in one, the guard read the other, and the plan asserted both routings at once.
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
i=[n for n,l in enumerate(lines) if l.startswith("| **5b.8-ii** |")]
assert len(i)==1, "expected exactly one 5b.8-ii row"
lines.insert(i[0]+1, lines[i[0]])
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
guard
fixture "S5 5b.8-ii's row stated twice" red "row appears 2 times"

# --- S6. the write rule, which is a decision and not a deliverable ---------
# ⚠️ `R5` is a rule inside FOUR applied functions. It has no constraint, grant or
# policy to live in, and nothing in this repository can see a `coalesce` that has
# not been written yet. Once `0034` is applied, reversing it is a fix-forward
# migration that cannot restore what was overwritten.
fresh
mutate_row "5b.8-i" "only where the stored value is null" \
                    "every time the caller's metadata carries one"
guard
fixture "S6 R5's write rule deleted from 5b.8-i" red "record the decision to refresh"

# --- S7. the sentinel routing, the second decision ------------------------
# ⚠️ Two OTHER guards depend on which child moves their sentinels, and no check
# can read an intention. Retiring them in the migration leaves both asserting a
# rule that is neither true nor superseded for as long as `5b.8-ii` takes.
fresh
mutate_row "5b.8-ii" "the sentinels move HERE and not in the migration" \
                     "the sentinels move once the column is in"
guard
fixture "S7 R3's sentinel routing deleted from 5b.8-ii" red "or record the decision to move them earlier"

# --- S8. the parent stays takeable ----------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what this costs: a session
# walks past the children and takes the L the split exists to prevent. Here that
# L writes a column and rewrites four applied functions under an automated merge.
fresh
mutate_row "5b.8" "IT IS NO LONGER TAKEABLE" "IT IS STILL THE ONE TO TAKE"
guard
fixture "S8 the parent row stops saying it is not takeable" red "does not say it is no longer takeable"

# --- S9. a row describing work it does not do -----------------------------
# ⚠️ Nothing is DROPPED — which is why a coverage check that only counted homes
# would pass — and two tasks now each assume the other has it, the way `4.6b`'s
# scope disagreed with `4.5c-ii`'s for four days. On a backfill that means it is
# either run twice or not at all.
fresh
mutate_row "5b.8-ii" "the contract check and harness extended" \
                     "the backfill re-run if it missed anybody, the contract check and harness extended"
guard
fixture "S9 5b.8-ii also claims the backfill" red "owned by neither"

echo
if (( fails == 0 && ran < 10 )); then
  echo "FAIL: only $ran fixtures ran, expected 10 — this harness proved almost nothing."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran fixtures behaved as recorded — 5b.8-split-coverage.sh still fails on"
  echo "every defect it was written for, including both decisions and all four writers."
  exit 0
fi
echo "$ran fixture(s) ran, $fails behaved differently from the record."
exit 1

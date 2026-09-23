#!/usr/bin/env bash
# handbook-agreement-falsify — the eleven fixtures the handbook guard was checked
# against, kept as a script rather than as a paragraph claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every guard in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `handbook-agreement.sh` still FAILS on each defect it was written for.
#
# ⚠️⚠️ AND THIS GUARD NEEDED ITS HARNESS MORE THAN THE FOUR SPLIT GUARDS DID,
# BECAUSE IT WENT THROUGH THREE WRONG VERSIONS BEFORE IT WENT GREEN — and each
# wrong version was red on a CORRECT tree:
#
#   * v1 demanded a ✅ on a handbook "Done" row. One row of nine spells it without
#     the tick. The claim was true; the decoration differed.
#   * v2 looked for the done-claim only in the plan's build-order ROW. `5a-i`'s
#     row never restates it — the STATUS LOG carries it and that is the whole
#     record.
#   * v3 walked children one level. `5b-ii` sits above `5b-ii-b`, which is itself
#     a split parent with no claim of its own, so every leaf had shipped and the
#     walk still said unfinished.
#
# ⚠️ EVERY ONE OF THOSE WOULD HAVE BEEN "FIXED" BY EDITING THE HANDBOOK TO SUIT
# THE SCRIPT — degrading the file the owner reads to make a check go quiet.
# `H10` exists specifically to hold v3's lesson: it proves the child walk actually
# RECURSES, which is the assertion here most likely to rot into a no-op.
#
# ⚠️ EVERY MUTATION IS SCOPED TO ONE ROW, BY NAME, OR TO ONE NAMED REGION. A
# fixture that is red for the wrong reason is not a falsification, it is a
# coincidence — `Y2`'s lesson, inherited.
#
# Run:  bash docs/checks/handbook-agreement-falsify.sh
# Exit: 0 when all eleven fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/handbook-agreement.sh"
PLAN="docs/PLAN.md"
BOOK="docs/HANDBOOK.md"
[[ -r "$CHECK" && -r "$PLAN" && -r "$BOOK" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

# ⚠️⚠️ THE MARKED ROW IS DISCOVERED, NOT SPELLED — AND THIS IS THE SECOND THING
# THIS HARNESS LEARNED THE EXPENSIVE WAY. Three fixtures below (H3, H8, H9) edit
# the row that carries the handbook's next-work marker. Their first version named
# `5b.8-i`, because that is where the marker stood the day the guard shipped. On
# 2026-09-18 `5b.8-i` closed, the marker moved one row, and all three fixtures
# reported "anchor not present" — a SETUP failure, which this harness correctly
# refuses to score as a pass, but which would have to be hand-repaired on the day
# of every single task closure from now until step 6.
#
# ⚠️ A harness pinned to a task NAME goes stale the moment the project moves, and
# it goes stale in the direction that costs a session an hour with nothing wrong.
# So the two rows are read out of the file the way the GUARD reads them — the
# marked row, and the row after it — and the fixtures below never name a task.
MARK_LINE="$(grep -n "This is where the next piece of work is" "$BOOK" | head -1)"
[[ -n "$MARK_LINE" ]] || { echo "FAIL: no next-work marker in $BOOK — nothing to falsify"; exit 1; }
MARK_NO="${MARK_LINE%%:*}"
MARK_TASK="$(sed -n "${MARK_NO}p" "$BOOK" | sed 's/^| \*\*`\{0,1\}//; s/`\{0,1\}\*\* |.*//')"
# ⚠️⚠️ THE ANCHOR IS A LITERAL AND THE MARKER MUST BE SPELLED EXACTLY THIS WAY IN
# THE HANDBOOK — found by CI on 2026-09-23, plan task `5e-ii`. That task wrote the
# marker as `…next piece of work is.**`, with the full stop INSIDE the bold run.
# `handbook-agreement.sh` was green (it greps the sentence, not the markup) and
# this file went red on FOUR fixtures at once, every one of them reporting
# *"anchor not present in the <task> row"* — a harness that cannot find the row it
# is supposed to break reads exactly like a guard that has lost its teeth.
# ⚠️ NOTHING WAS LOOSENED TO MAKE IT GREEN: the handbook sentence was reworded, so
# the period sits outside the bold and the anchor matches — the cheaper half of
# *never spell a check's sentinel differently in the file it reads*, and the same
# call `5b.7` made about the R4 stripper. ⚠️ Widening this anchor to tolerate a
# trailing period is a change to the harness and needs a fixture of its own; it is
# routed to the next task that touches either file.
MARK_ANCHOR="⚠️ **This is where the next piece of work is**"

# The row after it, for H9's "both files point, and they disagree". Its anchor is
# the first bold run in its third cell, whatever that row happens to say.
#
# ⚠️⚠️ AND IT IS ANCHORED ANYWHERE IN THAT CELL, NOT AT ITS START — THE THIRD
# THING THIS HARNESS LEARNED THE EXPENSIVE WAY, AND IT IS THE SAME LESSON AS THE
# OTHER TWO, ONE LEVEL FURTHER OUT. The first spelling matched `^\*\*…` and so
# assumed the following row OPENS its third cell with a bold run. That was true
# on the day it was written and false the next time the marker moved: `5b.8-ii`
# closed on 2026-09-18, the marker moved to `5b.8-iii`, and the row after it
# opens *"After the two rows above."* in plain prose. The harness died at setup
# with "could not read the marked row and the one after it".
#
# ⚠️ IT STOPPED SPELLING A TASK NAME AND WENT ON SPELLING A SHAPE. The rule the
# other two fixtures paid for is "a harness must not name the file's moving
# parts"; a row's punctuation is a moving part too. The repair is NOT to reword
# the handbook so the harness can find its anchor — that is the file bending to
# the check, and this repository has the inverse rule written down twice.
#
# ⚠️⚠️ AND IT IS "THE NEAREST OTHER ROW WITH A BOLD RUN", NOT "THE ROW AFTER" —
# THE FOURTH THING THIS HARNESS LEARNED THE EXPENSIVE WAY, ON 2026-09-19, AND IT
# IS THE SAME LESSON A FOURTH TIME. The previous spelling took `MARK_NO + 1` and
# assumed a row follows the marked one AT ALL. `5b.8-iii-b` closed, the marker
# moved to the LAST task row in that table, and the row after it is the catch-all
# `| 5d–5h | The rest of the screens | After 5b |` — three plain words, no bold
# run anywhere. The harness died at setup with the very message the comment above
# was written about. ⚠️ The cheap "fix" was to bold something in that row so the
# harness could find an anchor, which is the file bending to the check — the
# inverse rule this repository has written down twice, and the one this block
# already refuses one paragraph up.
#
# ⚠️ IT SEARCHES DOWN AND THEN UP, because the marker can legitimately sit on the
# first row of the table as well as the last. `H9` needs ANY second row to plant a
# competing marker in; which one is immaterial, and that is exactly why the
# harness must not have an opinion about which.
pick_other_row() {
  local n total line cell id
  total="$(grep -c . "$BOOK")"
  for n in $(seq "$((MARK_NO + 1))" "$total") $(seq "$((MARK_NO - 1))" -1 1); do
    line="$(sed -n "${n}p" "$BOOK")"
    case "$line" in \|*) ;; *) continue ;; esac
    cell="$(sed 's/^| [^|]* | [^|]* | //' <<< "$line" | grep -oE '\*\*[^*]+\*\*' | head -1)"
    [[ -n "$cell" ]] || continue
    # ⚠️ AND IT MUST NOT LAND ON A ROW THAT ALREADY CARRIES THE MARKER, which is
    # the one row `H9` cannot use: planting a second copy where one already sits
    # would make `H8`'s "zero markers" and `H9`'s "two markers" the same edit.
    grep -qF "This is where the next piece of work is" <<< "$line" && continue
    # ⚠️⚠️ AND THE ROW'S ID MUST BE ONE `mutate_row` CAN REACH — a bold id that
    # starts with a DIGIT, appearing exactly once. The handbook carries two
    # `| **—** |` separator rows and `mutate_row` refuses an ambiguous anchor by
    # design, so a picker that offered one of those would hand `H9` a setup
    # failure that reads like a defect in the guard. That is what the first
    # spelling of this search did on the day it was written.
    case "$line" in \|\ \*\*[0-9]*) ;; *) continue ;; esac
    id="$(sed 's/^| \*\*`\{0,1\}//; s/`\{0,1\}\*\* |.*//' <<< "$line")"
    [[ "$(grep -c -F "| **$id** |" "$BOOK")" == "1" ]] || continue
    AFTER_NO="$n"
    return 0
  done
  return 1
}
AFTER_NO=""
pick_other_row
AFTER_TASK=""
AFTER_ANCHOR=""
if [[ -n "$AFTER_NO" ]]; then
  AFTER_TASK="$(sed -n "${AFTER_NO}p" "$BOOK" | sed 's/^| \*\*`\{0,1\}//; s/`\{0,1\}\*\* |.*//')"
  AFTER_ANCHOR="$(sed -n "${AFTER_NO}p" "$BOOK" | sed 's/^| [^|]* | [^|]* | //' | grep -oE '\*\*[^*]+\*\*' | head -1)"
fi

# ⚠️⚠️ AND THE WAITING-ON-YOU ROW IS DISCOVERED TOO, FOR THE SAME REASON AND ON
# THE SAME DAY. `H5`, `H6` and `H7` spelled `✅ **Nothing is waiting on YOU**`,
# which is only ONE of that row's two legitimate states — the guard itself reads
# it with `grep "waiting on YOU"` precisely because it flips. On 2026-09-18 a
# decision was parked, the row correctly became *"One thing is waiting on YOU"*,
# and all three fixtures died at setup with "found 0".
#
# ⚠️ THREE FIXTURES, THREE SPELLINGS OF ONE MISTAKE. H3/H8/H9 named a TASK,
# H9 named a row's PUNCTUATION, and these named a row's current STATE. The rule
# is one rule: a harness reads the file the way the guard reads it, and asserts
# nothing about what the file happens to say today.
WAIT_ANCHOR="$(grep -oE '\*\*[^*]*waiting on YOU\*\*' "$BOOK" | head -1)"
[[ -n "$WAIT_ANCHOR" ]] || {
  echo "FAIL: no waiting-on-you row in $BOOK — nothing for H5/H6/H7 to falsify"; exit 1; }

# The two states that row is allowed to be in, and one that is neither.
WAIT_ASKING='**One thing is waiting on YOU**'
WAIT_SILENT='**Nothing is waiting on YOU**'

# Empty the plan's decisions block: every row under its separator, up to the
# first line that is not a table row. ⚠️ BOUNDED BY THE ROWS AND NOT BY THE NEXT
# HEADING — `plan-handover.sh` shipped the unbounded version and it swallowed the
# falsification table beneath the block.
#
# ⚠️⚠️ AN ALREADY-EMPTY BLOCK IS A NO-OP AND NOT A VOID FIXTURE, AND THE FIRST
# SPELLING OF THIS GOT THAT BACKWARDS — one day after three fixtures in this same
# file were repaired for the identical reason. It exited with "the decisions block
# is already empty - fixture void", which is true of the EDIT and false of the
# FIXTURE: this is a PRECONDITION, not the mutation under test. The block legally
# holds zero rows — `plan-handover.sh` calls that "a legitimate and desirable
# state" — so the setter has to work from either state. A decision was parked on
# 2026-09-18 and ruled on 2026-09-19, and the harness broke on the ruling.
#
# ⚠️ WHAT KEEPS THAT SAFE IS `H0`, NOT AN EDIT COUNT. The control proves the
# unedited tree is GREEN, so a setup that happened to change nothing would leave
# the check green and the fixture would fail loudly as "should have been RED".
# Vacuity is caught by the assertion, which is where it belongs — counting edits
# is what made this helper refuse a legitimate state.
empty_decisions() {
  python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
h=[n for n,l in enumerate(lines) if l.startswith("### ⛔ DECISIONS OWED BY THE OWNER")]
assert len(h)==1, "expected one decisions block"
sep=[n for n in range(h[0],len(lines)) if lines[n].startswith("|---")]
assert sep, "no table separator under the decisions heading"
n=sep[0]+1
end=n
while end < len(lines) and lines[end].startswith("|"):
    end+=1
del lines[n:end]
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
}

# One open decision, whatever the block already holds. ⚠️ ITS `Blocks` CELL MUST
# NOT NAME THE TASK THE PLAN MARKS NEXT, or `plan-handover.sh`'s assertion 7c
# would be the thing that fires — in a harness for a different check.
add_decision() {
  python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
h=[n for n,l in enumerate(lines) if l.startswith("### ⛔ DECISIONS OWED BY THE OWNER")]
assert len(h)==1, "expected one decisions block"
sep=[n for n in range(h[0],len(lines)) if lines[n].startswith("|---")]
assert sep, "no table separator under the decisions heading"
lines.insert(sep[0]+1, "| A question only he can answer | a task that is not the next one | the fixture's brief |\n")
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
}
[[ -n "$MARK_TASK" && -n "$AFTER_TASK" && -n "$AFTER_ANCHOR" ]] || {
  echo "FAIL: could not read the marked row and the one after it out of $BOOK"; exit 1; }


# Replace inside ONE table row of ONE file, identified by its bold task name.
# Asserts the row exists, that exactly one row carries that name, that the anchor
# is in it, and that the file actually changed — the per-fixture anti-vacuity
# guard, without which an edited-nothing fixture reports a false green.
mutate_row() {
  local file="$1" task="$2" from="$3" to="$4"
  python3 - "$WORK/$file" "$task" "$from" "$to" <<'PY'
import io,sys
p,task,f,t=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4]
lines=io.open(p,encoding="utf-8").readlines()
head="| **%s** |" % task
idx=[n for n,l in enumerate(lines) if l.startswith(head)]
if len(idx)!=1: sys.exit("expected exactly one %s row in %s, found %d" % (task,p,len(idx)))
n=idx[0]
if f not in lines[n]: sys.exit("anchor not present in the %s row: %s" % (task,f[:60]))
before=lines[n]
lines[n]=lines[n].replace(f,t)
if lines[n]==before: sys.exit("the mutation changed nothing — fixture void")
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
}

# Replace inside the ONE line of a file that carries a unique substring. ⚠️ THE
# HANDBOOK HAS TWO `| **—** |` SEPARATOR ROWS, so a task-name anchor cannot reach
# the waiting-on-you row at all — `mutate_row` correctly refused to run those two
# fixtures rather than editing the wrong one, which is the anti-vacuity guard
# doing its job and is why they are targeted by content instead.
mutate_line() {
  local file="$1" from="$2" to="$3"
  python3 - "$WORK/$file" "$from" "$to" <<'PY'
import io,sys
p,f,t=sys.argv[1],sys.argv[2],sys.argv[3]
lines=io.open(p,encoding="utf-8").readlines()
idx=[n for n,l in enumerate(lines) if f in l]
if len(idx)!=1: sys.exit("expected exactly one line containing %r, found %d" % (f[:50],len(idx)))
n=idx[0]
lines[n]=lines[n].replace(f,t)
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
}

# $1 label, $2 expected outcome (red|green), $3 substring the output must contain
fixture() {
  local label="$1" want="$2" needle="$3" out rc
  ran=$((ran+1))
  out="$(bash "$CHECK" "$WORK/plan.md" "$WORK/book.md" 2>&1)"; rc=$?
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

fresh() { cp "$PLAN" "$WORK/plan.md"; cp "$BOOK" "$WORK/book.md"; }
guard() { [[ $? -eq 0 ]] || { echo "FAIL: fixture setup failed"; fails=$((fails+1)); }; }

# --- H0. control ------------------------------------------------------------
# ⚠️ A harness whose baseline is red runs no fixture at all: every "red" below
# would then be the baseline's red and would prove nothing. ⚠️ AND THIS ONE IS
# ALSO THE TWO-INPUT ASSERTION: the guard reads TWO files, so the control is what
# says the harness copies both. `conventions-gate-falsify.sh` spent a day dead
# because its gate gained an input it was never told to copy.
fresh
fixture "H0 control, both files unedited" green ""

# --- H1. a handbook row the plan has never heard of ------------------------
fresh
mutate_row book.md "5b.8-iii" "| **5b.8-iii** |" "| **5b.9-zz** |"
guard
fixture "H1 a handbook row for a task not in the plan" red "neither a row nor a step"

# --- H2. the plan closed it and the handbook did not notice ---------------
# ⚠️ THE DEFECT OF 2026-09-14 TO 2026-09-18, EXACTLY: `5b-ii-b-2`'s row told the
# owner his next job was a task that had already shipped.
fresh
mutate_row book.md "5b-ii-b-2" "✅ **Done 2026-09-18**" "**Coming up next**"
guard
fixture "H2 the plan says done, the handbook does not" red "is DONE and the handbook does not"

# --- H3. ⚠️ the worse direction -------------------------------------------
# The handbook crediting the owner with work that has not shipped. Nothing else
# in this repository looks at that sentence.
fresh
mutate_row book.md "$MARK_TASK" "$MARK_ANCHOR" "✅ **Done 2026-09-18**"
guard
fixture "H3 the handbook claims done and the plan does not" red "crediting him"

# --- H4. a split parent presented as one job ------------------------------
fresh
mutate_row book.md "5b.8" "**Split into three on 2026-09-18**" "**Coming after inviting works**"
guard
fixture "H4 a split parent not described as split" red "no longer takeable"

# --- H5. ⚠️⚠️ THE DEFECT THIS FILE EXISTS FOR ------------------------------
# On 2026-09-18 the owner ruled on the last open question, the plan's block went
# empty, and the handbook kept asking him for it. He had answered it the day
# before, and the only file he reads was still pointing him at it.
fresh
empty_decisions
guard
mutate_line book.md "$WAIT_ANCHOR" "$WAIT_ASKING"
guard
fixture "H5 block empty, handbook still asking" red "is EMPTY and the handbook still says something"

# --- H6. the inverse: a real question nobody is re-offered ---------------
fresh
add_decision
guard
mutate_line book.md "$WAIT_ANCHOR" "$WAIT_SILENT"
guard
fixture "H6 an open decision the handbook does not mention" red "says nothing is"

# --- H7. the owner is never told either way ------------------------------
fresh
mutate_line book.md "$WAIT_ANCHOR" "**All clear**"
guard
fixture "H7 no row says whether anything is waiting" red "expected exactly 1"

# --- H8. the handbook stops saying where the work is ---------------------
# ⚠️ THIS IS THE ONE THE AUTHOR OF THIS GUARD COMMITTED. Closing `5b-ii-b-2`'s
# row removed the only next-work marker in the file and put none back, so for one
# commit the owner's own document did not say where the project was.
fresh
mutate_row book.md "$MARK_TASK" "$MARK_ANCHOR" "⚠️ **Coming up**"
guard
fixture "H8 no next-work marker anywhere" red "no longer tells him where the project is"

# --- H9. both files point, and they disagree -----------------------------
fresh
mutate_row book.md "$MARK_TASK" "$MARK_ANCHOR" "⚠️ **First**"
guard
mutate_row book.md "$AFTER_TASK" "$AFTER_ANCHOR" \
                   "⚠️ **This is where the next piece of work is.**"
guard
fixture "H9 the two files point at different next tasks" red "and the handbook points at"

# --- H10. ⚠️⚠️ THE RECURSION FIXTURE -------------------------------------
# `5b-ii-b` is done ONLY because both its children are; `5b-ii` is done only
# because `5b-ii-b` is. Un-done ONE grandchild — in the row AND in the status
# log, because the guard consults both — and the whole chain above it must stop
# counting as finished, which turns the handbook's two "Done" rows into the worse
# direction. ⚠️ IF THE CHILD WALK EVER STOPS RECURSING THIS FIXTURE GOES GREEN
# while the guard still passes its control, which is exactly how a check rots
# into a no-op.
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
hits=0
for n,l in enumerate(lines):
    if l.startswith("| **5b-ii-b-2** |") or "`5b-ii-b-2` IS DONE AS OF" in l:
        before=l
        l=l.replace("IS DONE AS OF","IS UNDERWAY AS OF").replace("✅ **DONE","**UNDERWAY")
        if l!=before: lines[n]=l; hits+=1
assert hits>0, "no 5b-ii-b-2 done-claim found to break — fixture void"
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
guard
fixture "H10 one grandchild un-done breaks the whole chain" red "crediting him"

echo
if (( fails == 0 && ran < 11 )); then
  echo "FAIL: only $ran fixtures ran, expected 11 — this harness proved almost nothing."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran fixtures behaved as recorded — handbook-agreement.sh still fails on"
  echo "every defect it was written for, and its child walk still recurses."
  exit 0
fi
echo "$ran fixture(s) ran, $fails behaved differently from the record."
exit 1

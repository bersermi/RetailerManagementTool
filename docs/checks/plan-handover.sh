#!/usr/bin/env bash
# plan-handover — can the next session, with no context, find the right task?
#
# WHY THIS EXISTS. `docs/PLAN.md` is the only thing a cleared session reads to
# work out what to do next, and SIX separate stale-duplicate defects have now
# been found in this repository's prose:
#
#   * Facebook inside `C1.4` — the coverage check printed 10/10 across an edit
#     that moved a third of a deliverable to another task (2026-09-11).
#   * The `5a-iv` sub-split stated in TWO tables — a correction landed in one,
#     the guard read the other, and for an hour the file asserted both
#     routings while reporting success (2026-09-12).
#   * The `5a-iii-b` dashboard gate, closed by the owner, still recorded as
#     OWED in FOUR places (2026-09-12).
#   * `docs/HANDBOOK.md`'s "no app yet", nine days stale (2026-09-12, #76).
#   * `README.md`'s "the client does not exist yet" — the FRONT DOOR of the
#     repository, untouched since kick-off (2026-09-12, #77).
#   * ⚠️⚠️ A SECOND STATUS TABLE inside `## Position` saying `5a … Not started`
#     with six of eight sub-tasks done, `4.5 … UNDER WAY` where the same
#     section's header said it was closed, and NO ROW FOR STEP 4.6 — found by
#     the owner, by reading, on 2026-09-13. Assertion 5 is that one.
#
# ⚠️ FIVE OF THE SIX WERE FOUND BY A PERSON READING, NOT BY A CHECK. Each new
# assertion here is one shape retired; the shapes are not running out.
#
# All three are one rule: A CLAIM IS ONLY AS TRUE AS THE COPY THE CHECK HAPPENS
# TO READ. `5a-split-coverage.sh` now enforces that for `5a`'s deliverables.
# This file enforces the two things a HANDOVER depends on, which that check does
# not look at: the next task is named exactly once, and a task marked done
# carries no open obligation.
#
# ⚠️ IT DOES NOT VALIDATE THE PLAN'S CONTENT. It cannot tell a good next task
# from a bad one — only that the file names one task, unambiguously, and does
# not simultaneously claim it is finished and blocked.
#
# ⚠️⚠️ NEVER QUOTE THIS CHECK'S SENTINELS VERBATIM IN `docs/PLAN.md`. Its
# next-task sentinel and the status-board words below are grepped out of that
# file; a paragraph that SPELLS one becomes a match, and on 2026-09-13 a
# write-up explaining this very check made assertion 2 read the write-up
# instead of the status log. Describe the sentinel; do not spell it. THE SAME
# TRAP FIRED THREE TIMES THAT DAY, IN THREE DIFFERENT SCRIPTS —
# `conventions-gate.sh` (a comment naming a banned token),
# `5a-split-coverage.sh` (prose quoting a table row), and here. PROSE ABOUT A
# CHECK IS INPUT TO THAT CHECK.
#
# Run:  bash docs/checks/plan-handover.sh
# Exit: 0 all assertions hold; 1 otherwise, naming each failure.

set -uo pipefail

PLAN="${1:-docs/PLAN.md}"
[[ -r "$PLAN" ]] || { echo "FAIL: cannot read $PLAN"; exit 1; }

fails=0
ran=0
fail() { echo "FAIL: $*"; fails=$((fails+1)); }
ok()   { echo "  ok    $*"; }
note() { ran=$((ran+1)); }

# --- 1. exactly one TABLE ROW is marked as the next task -------------------
# The tables are authoritative; the status log at the top of the file is
# chronological and older entries legitimately still say "IS THE NEXT TASK".
# ⚠️ NO `mapfile`, AND THE REASON IS ALREADY WRITTEN DOWN IN
# `5a-split-coverage.sh`: macOS ships bash 3.2 and this has to run on the
# owner's Mac as well as on ubuntu-latest. The first spelling of this file used
# `mapfile` and died on the development machine — the same trap that file
# recorded for `declare -A`, hit again by the next script written. A check that
# only runs on one of the two machines that matter is not one.
NEXT_ROWS="$(grep -n "^| .*THIS IS THE NEXT TASK" "$PLAN")"
if [[ -z "$NEXT_ROWS" ]]; then NEXT_COUNT=0; else NEXT_COUNT="$(grep -c . <<< "$NEXT_ROWS")"; fi
NEXT_FIRST="$(head -1 <<< "$NEXT_ROWS")"
note
case "$NEXT_COUNT" in
  0) fail "no table row is marked 'THIS IS THE NEXT TASK'. A cleared session has"
     echo "      nothing to take, and the working agreement is one task per session." ;;
  1) ok "exactly one table row is marked as the next task" ;;
  *) fail "$NEXT_COUNT table rows claim to be the next task:"
     cut -d: -f1 <<< "$NEXT_ROWS" | sed 's/^/        line /' ;;
esac

# --- 2. the newest status-log entry names the SAME task --------------------
# ⚠️ THE CROSS-CHECK, AND IT IS THE ONE THAT MATTERS. The header is what a
# session reads first; the table is what it acts on. They are two copies of one
# claim, forty lines apart, which is precisely the shape that has failed twice.
ROW_TASK=""
if (( NEXT_COUNT == 1 )); then
  # `| **5a-iv-a** | …` or `| **`5a-iv-a`** | …`
  ROW_TASK="$(sed 's/^| \*\*`\{0,1\}//; s/`\{0,1\}\*\* |.*//' <<< "${NEXT_FIRST#*:}")"
  note
  if [[ -z "$ROW_TASK" ]]; then
    fail "could not read the task name out of the next-task row — the row format changed"
  else
    HEADER="$(grep -m1 "IS THE NEXT TASK" "$PLAN")"
    if grep -qF "$ROW_TASK" <<< "$HEADER"; then
      ok "the newest status-log entry and the table agree on $ROW_TASK"
    else
      fail "the table says the next task is '$ROW_TASK', but the newest status-log"
      echo "      entry says something else. A cleared session reads the header first"
      echo "      and acts on the table — two copies of one claim, disagreeing."
    fi

    # --- 3. the next task is not also marked done -------------------------
    note
    if grep -Eq "✅ \*\*DONE|IS DONE AS OF" <<< "$NEXT_FIRST"; then
      fail "$ROW_TASK is marked as the next task AND as done in the same row"
    else
      ok "$ROW_TASK is not also marked done"
    fi
  fi
fi

# --- 4. no row is simultaneously DONE and carrying an open obligation ------
# ⚠️ THIS IS THE ONE THAT FIRED FOR REAL. `5a-iii-b` shipped on 2026-09-11 with
# its gate reading "THE DASHBOARD EDIT IS STILL OWED"; the owner closed it the
# next day and FOUR copies of the claim went stale at once. A task that is done
# and still owed something is either not done or not owed — the file must say
# which.
note
STALE=0
while IFS= read -r line; do
  [[ "$line" == \|* ]] || continue
  grep -Eq "✅ \*\*DONE|✅✅ \*\*DONE" <<< "$line" || continue
  if grep -Eq "IS STILL OWED|IS NOT DONE|is NOT done|STILL OWED" <<< "$line"; then
    echo "FAIL: a row marked DONE also carries an open obligation:"
    echo "      ${line:0:110}…"
    STALE=$((STALE+1))
  fi
done < "$PLAN"
if (( STALE == 0 )); then
  ok "no row is both done and still owed something"
else
  fails=$((fails+1))
fi

# --- 5. no SECOND status board ---------------------------------------------
# ⚠️⚠️ THE SIXTH INSTANCE, AND THE FIRST THAT WAS A WHOLE TABLE. Found by the
# owner on 2026-09-13, by reading — not by any check here.
#
# `docs/PLAN.md` carried a summary table `| Step | What | Status |` inside
# `## Position`, 960 lines below that section's own header. It said
# `5a … Not started` while six of `5a`'s eight sub-tasks were done, `4.5 …
# UNDER WAY` while the header said steps 1-4.5 were all closed, and it had no
# row for step 4.6 at all. THE SECTION CONTRADICTED ITSELF, and a cleared
# session reading the table would have concluded the client had not been begun.
#
# ⚠️ NOTHING COULD SEE IT. Assertion 1 reads rows marked "THIS IS THE NEXT
# TASK"; `5a-split-coverage.sh` reads bold-name rows like `| **5a-i** |`. A row
# spelled `| 5a | … | Not started |` matched neither, and status that no
# instrument reads is status that only ages.
#
# ✅ THE TABLE'S STATUS COLUMN WAS REMOVED RATHER THAN CORRECTED — the shape
# `#76` chose for HANDBOOK.md. Status belongs in the status log and in each
# step's own section, and this assertion is what stops a third home appearing.
note
BOARD="$(grep -nE '^\|[^|]*\|[^|]*\|[[:space:]]*(Not started|NOT STARTED|Not begun|UNDER WAY|Under way)[[:space:]]*\|' "$PLAN")"
if [[ -z "$BOARD" ]]; then
  ok "no second status board — step status lives in the log and the step sections"
else
  fail "a step-status summary row is back. This is the defect that made 5a read"
  echo "      'Not started' with six of its eight sub-tasks done:"
  cut -d: -f1 <<< "$BOARD" | sed 's/^/        line /'
  echo "      Put the status in the status log, not in a second table."
fi

# --- 7. the decisions the OWNER owes are parked where every session reads --
# ⚠️⚠️ ADDED 2026-09-13, AND IT EXISTS TO REPLACE A HUMAN MEMORY. Until this
# block, an open owner decision lived in prose in the middle of an 9,700-line
# file, and being re-offered depended on whichever session happened to read far
# enough. The owner's instruction was explicit: he does not want to memorise
# which questions are outstanding, and he wants to drive the project from the
# standing prompt alone. A decision parked in the Position section is read by
# every session before it does anything, and the prompt's closing question
# surfaces it automatically.
#
# ⚠️ THE THIRD ASSERTION IS THE LOAD-BEARING ONE, and it is the only one here
# that can stop work rather than describe it: A TASK NAMED AS BLOCKED BY AN OPEN
# DECISION MAY NOT BE THE NEXT TASK. `4.6a` is a migration, migrations are
# append-only, and merging is automated — so a session that starts it before
# register #9 is ruled on does not produce a reviewable mistake, it produces a
# deployed one. The plan has said "do not start 4.6a" in prose since 2026-09-07;
# prose is not a gate.
#
# ⚠️ It is deliberately NOT an assertion that the list is non-empty. Zero open
# decisions is a legitimate and desirable state; what is illegitimate is a
# decision that exists and is invisible, or one that exists and is being walked
# past.
note
DEC_HEAD="$(grep -n '^### ⛔ DECISIONS OWED BY THE OWNER' "$PLAN")"
if [[ -z "$DEC_HEAD" ]]; then DEC_COUNT=0; else DEC_COUNT="$(grep -c . <<< "$DEC_HEAD")"; fi

if (( DEC_COUNT == 0 )); then
  fail "the decisions-owed block is gone. It is the one place an open owner decision"
  echo "      is guaranteed to be re-offered, and removing it puts the project back on"
  echo "      somebody remembering. If every decision is closed, keep the empty block."
elif (( DEC_COUNT > 1 )); then
  fail "$DEC_COUNT decisions-owed blocks. A second home is how one of them goes stale —"
  cut -d: -f1 <<< "$DEC_HEAD" | sed 's/^/        line /'
else
  ok "exactly one decisions-owed block, where every session reads it"

  # The block's table runs from its heading to the first blank line after the
  # rows begin. Rows are read at column 0, the rule three scripts learned the
  # hard way on 2026-09-13.
  #
  # ⚠️⚠️ AND THE LINE BELOW USED TO SAY `/^## /{exit}`, WHICH IS NOT WHAT THE
  # SENTENCE ABOVE PROMISES — AND IT MADE THIS GUARD BLOCK REAL WORK ON
  # 2026-09-13, THE FIRST DAY IT COULD. Exiting only at the next `##` heading
  # means every `|` line in between is scooped up, INCLUDING THE FALSIFICATION
  # TABLE THAT DOCUMENTS THIS VERY CHECK — and fixture `V4`'s cell spells
  # `4.6a` verbatim, because its whole job is to describe `4.6a` being blocked.
  # So the moment register #9 was RULED and `4.6a` legitimately became the next
  # task, assertion 7c read its own fixture, found `4.6a` in a "Blocks" column
  # that was really a "Result" column, and refused the task.
  #
  # ⚠️⚠️ IT WAS DORMANT AND WRONG FROM THE DAY IT WAS WRITTEN, AND IT SURFACED
  # EXACTLY WHEN IT WOULD DO DAMAGE — a false red on the one task it exists to
  # protect, at the moment that task was finally unblocked. The cheap "fix" is
  # to move the next-task marker back, which would leave `4.6a` unstartable for
  # good and look like the guard working.
  #
  # THIS IS THE FOURTH TIME IN THIS REPOSITORY THAT PROSE ABOUT A CHECK BECAME
  # INPUT TO THAT CHECK — after `conventions-gate.sh`'s comment-stripping trap,
  # `5a-split-coverage.sh` reading a quoted table row, and this file's own
  # assertion 2 reading the paragraph that named its sentinel. The rule was
  # already written down in both scripts. It was not enough, because the rule
  # says "do not SPELL the sentinel" and this defect needed a different one:
  # A CHECK MUST BOUND THE REGION IT READS, NOT TRUST THE NEXT HEADING.
  DEC_START="$(cut -d: -f1 <<< "$DEC_HEAD")"
  DEC_ROWS="$(awk -v s="$DEC_START" 'NR>s { if (/^\|/) { seen=1; print } else if (seen) { exit } }' "$PLAN")"
  DEC_BODY="$(grep -v '^|[-: |]*|$' <<< "$DEC_ROWS" | tail -n +2)"

  # --- 7b. every row says what it blocks ---------------------------------
  note
  BAD=0
  while IFS= read -r r; do
    [[ -n "$r" ]] || continue
    blocks="$(awk -F'|' '{print $3}' <<< "$r" | tr -d '[:space:]')"
    if [[ -z "$blocks" || "$blocks" == "—" ]]; then
      echo "FAIL: a decisions-owed row does not say what it blocks:"
      echo "      ${r:0:100}…"
      BAD=$((BAD+1))
    fi
  done <<< "$DEC_BODY"
  if (( BAD == 0 )); then
    ok "every open decision names the task it blocks"
  else
    fails=$((fails+1))
  fi

  # --- 7c. ⚠️⚠️ a blocked task may not be the next task -------------------
  note
  if [[ -n "${ROW_TASK:-}" ]]; then
    CLASH=""
    while IFS= read -r r; do
      [[ -n "$r" ]] || continue
      blocks="$(awk -F'|' '{print $3}' <<< "$r")"
      for t in $(grep -oE '`[0-9][0-9a-z.-]*`' <<< "$blocks" | tr -d '`'); do
        [[ "$t" == "$ROW_TASK" ]] && CLASH="$t"
      done
    done <<< "$DEC_BODY"
    if [[ -n "$CLASH" ]]; then
      fail "$CLASH is marked as the next task, and the decisions-owed block says it is"
      echo "      BLOCKED on a decision the owner has not made. Taking it writes code"
      echo "      against a guess — and if it is a migration, an automated merge deploys"
      echo "      that guess. Rule the decision first, or move the next-task marker."
    else
      ok "the next task ($ROW_TASK) is not blocked by any open decision"
    fi
  else
    ok "no next task to cross-check against the decisions-owed block"
  fi
fi

# --- 6. the working tree is not mid-task ----------------------------------
# A cleared session inherits the filesystem, not the conversation. Uncommitted
# edits are work it cannot see the reason for.
note
if DIRTY="$(git status --porcelain 2>/dev/null)" && [[ -n "$DIRTY" ]]; then
  fail "the working tree is dirty — a cleared session inherits these edits with no"
  echo "      record of why they exist:"
  sed 's/^/        /' <<< "$DIRTY"
else
  ok "the working tree is clean"
fi

echo
if (( fails > 0 )); then
  echo "$ran assertion groups ran, $fails failed — the next session cannot resume cleanly."
  exit 1
fi
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that skipped everything
# looks like. The seventh suite here to carry one.
if (( ran < 9 )); then
  echo "FAIL: only $ran assertion groups ran, expected 9 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
echo "all $ran assertion groups passed — a cleared session can find ${ROW_TASK:-the next task} and take it."

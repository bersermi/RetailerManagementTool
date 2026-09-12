#!/usr/bin/env bash
# plan-handover — can the next session, with no context, find the right task?
#
# WHY THIS EXISTS. `docs/PLAN.md` is the only thing a cleared session reads to
# work out what to do next, and in two days THREE separate stale-duplicate
# defects have been found in it:
#
#   * Facebook inside `C1.4` — the coverage check printed 10/10 across an edit
#     that moved a third of a deliverable to another task (2026-09-11).
#   * The `5a-iv` sub-split stated in TWO tables — a correction landed in one,
#     the guard read the other, and for an hour the file asserted both
#     routings while reporting success (2026-09-12).
#   * The `5a-iii-b` dashboard gate, closed by the owner, still recorded as
#     OWED in FOUR places (2026-09-12).
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

# --- 5. the working tree is not mid-task ----------------------------------
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
if (( ran < 5 )); then
  echo "FAIL: only $ran assertion groups ran, expected 5 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
echo "all $ran assertion groups passed — a cleared session can find ${ROW_TASK:-the next task} and take it."

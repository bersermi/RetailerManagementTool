#!/usr/bin/env bash
# handbook-agreement — does docs/HANDBOOK.md still agree with docs/PLAN.md?
#
# WHY THIS EXISTS. `docs/HANDBOOK.md` is the file the OWNER reads. Every other
# check in this directory reads `docs/PLAN.md` — `plan-handover.sh` and the four
# split guards all of them — so until this script existed the handbook was the one
# document in this repository that a person acts on and no machine ever looked at.
#
# ⚠️⚠️ IT WENT STALE IN THREE ROWS AT ONCE, TWICE IN FOUR DAYS, AND THE THIRD ONE
# IS WHY THIS IS NOT COSMETIC:
#
#   1. `5b-ii-b-2`'s row still said "this is where the next piece of work is" four
#      days after that task closed — so the file pointed the owner at finished work.
#   2. `5b.8`'s row described a single task on the day it was split three ways.
#   3. ⚠️⚠️ A row headed "One thing is waiting on YOU" still asked for the Números
#      questions AFTER they were ruled on 2026-09-18 — the same ruling that emptied
#      the decisions block in the plan. **The plan said nothing was owed and the
#      handbook said something was.** That is not a stale sentence; it is the
#      owner's own attention pointed at a question he had already answered, by the
#      only file that was telling him where to look.
#
# ⚠️ AND THE GAP IS ASYMMETRIC, WHICH IS THE ARGUMENT FOR A CHECK RATHER THAN A
# HABIT. A stale PLAN row is found by the next session, which reads it first and
# reads it critically. A stale HANDBOOK row is found by the owner, who has no way
# to know it is stale — it is the only account of the project he is given.
#
# WHAT IT ASSERTS. Everything here is an AGREEMENT between two files. The plan is
# authoritative in every one of them; this script never judges the plan.
#
#   1. Every task the handbook names exists in the plan — as a build-order row or
#      as a step heading. Catches a row left behind by a renumbering.
#   2. A task the plan calls DONE is not still described as pending, and — the
#      worse direction — a task the handbook calls done is really done in the plan.
#   3. A task the plan marks NO LONGER TAKEABLE is described as having been split,
#      not as a task somebody could pick up.
#   4. ⚠️⚠️ The decisions block agrees. Zero open decisions in the plan and the
#      handbook must say nothing is waiting; one or more and it must say something
#      is. This is defect 3 above, and it is the assertion this file exists for.
#   5. Exactly one handbook row carries the next-work marker, and it is the row for
#      the task the plan marks as next. This is defect 1 above.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Nothing about whether the handbook's ENGLISH is
# right, whether an explanation is any good, or whether a row the owner would want
# is missing entirely. It compares two files; it cannot see an absence neither of
# them records. ⚠️ AND IT IS NOT A SECOND STATUS BOARD: `plan-handover.sh`
# assertion 5 refuses one of those, and this script asserts AGREEMENT rather than
# copying anything.
#
# ⚠️⚠️ NEVER QUOTE THIS CHECK'S SENTINELS VERBATIM IN `docs/HANDBOOK.md` — the
# next-work marker and the waiting-on-you phrase especially. This is the twelfth
# and thirteenth instance of that rule in this repository, and the twelfth was
# three hours old when this file was written: a plan row recorded its own demotion
# by STRIKING the next-task sentence, and a strikethrough is a rendering the grep
# does not see. ⚠️ THE SISTER RULE: A CHECK MUST BOUND THE REGION IT READS, NOT
# TRUST THE NEXT HEADING — `plan-handover.sh` learned it on 2026-09-13 and the
# decisions-block reader below is copied from it for exactly that reason.
#
# Run:  bash docs/checks/handbook-agreement.sh
# Exit: 0 all groups hold; 1 otherwise, naming each disagreement.

set -uo pipefail

PLAN="${1:-docs/PLAN.md}"
BOOK="${2:-docs/HANDBOOK.md}"
[[ -r "$PLAN" ]] || { echo "FAIL: cannot read $PLAN"; exit 1; }
[[ -r "$BOOK" ]] || { echo "FAIL: cannot read $BOOK"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# ⚠️ No associative arrays and no `mapfile`: macOS ships bash 3.2 and this has to
# run on the owner's Mac as well as on ubuntu-latest. Both traps are recorded in
# the older plan checks; a check that runs on one of the two machines that matter
# is not one.
#
# ⚠️⚠️ `| grep "^|"` IS LOAD-BEARING AND IT IS NOT DECORATION HERE — IT IS THE
# FOURTH RECORDED INSTANCE ARRIVING AGAIN. `docs/PLAN.md` line ~2927 is PROSE that
# quotes `| **5a-i** |` verbatim while explaining this very trap, 8,000 lines above
# the real table. An unanchored `grep -F` finds two `5a-i` rows and one of them is
# a sentence about checking. A table row starts at column 0; a sentence quoting one
# does not.
#
# ⚠️ AND THE TRAILING ` |` KEEPS PREFIXES APART: `| **5b.8-i** |` must not match
# inside `| **5b.8-ii** |`. Same rule as the four split guards.
prow() { grep -F -e "| **$1** |" -e "| **\`$1\`** |" "$PLAN" | grep "^|" | head -1; }
brow() { grep -F -e "| **$1** |" -e "| **\`$1\`** |" "$BOOK" | grep "^|" | head -1; }

# Bold task ids at column 0 in the handbook. `—` separators and plain ranges like
# `5d–5h` are not task ids and are skipped by the pattern itself.
BOOK_TASKS="$(grep -oE '^\| \*\*[0-9][0-9A-Za-z.-]*\*\* \|' "$BOOK" \
              | sed 's/^| \*\*//; s/\*\* |$//' | sort -u)"

# The plan's own markers, kept in one place so a wording change is one edit.
PLAN_DONE_RX='✅ \*\*DONE|IS DONE AS OF'
BOOK_DONE_RX='\*\*Done [0-9]'
# ⚠️ IT MATCHES THE CLAIM, NOT THE TICK, AND THAT IS DELIBERATE. Eight handbook
# rows spell it `✅ **Done <date>**` and one spells it `**Done <date>**` with no tick.
# Both SAY the task is finished, which is the only thing this agreement is about. A
# check that goes red over a missing emoji is a check somebody loosens in six weeks,
# and it would be this script inventing a house style neither file agreed to.

# --- 1. every task the handbook names exists in the plan --------------------
# ⚠️ A step HEADING counts. The handbook legitimately talks about `4.6` as a body
# of work; the plan carries it as `## Step 4.6` with rows `4.6a`…`4.6c`. Demanding
# a row would be this check inventing a rule neither file follows.
note
unknown=0
for t in $BOOK_TASKS; do
  if [[ -z "$(prow "$t")" ]] && ! grep -qE "^#+ Step $t( |$|—)" "$PLAN"; then
    fail "the handbook has a row for '$t' and the plan has neither a row nor a step"
    echo "      heading for it. A renumbering left this behind, and the owner is"
    echo "      reading about work that no longer has that name."
    unknown=$((unknown+1))
  fi
done
(( unknown == 0 )) && ok "every task the handbook names is in the plan ($(grep -c . <<< "$BOOK_TASKS") of them)"

# --- 2. done means done, in both directions ---------------------------------
# ⚠️ THE SECOND DIRECTION IS THE SERIOUS ONE. A handbook row calling something
# done when the plan does not is the file telling the owner he has something he
# does not have. The first direction is the one that actually keeps happening.
#
# ⚠️⚠️ AND "THE PLAN SAYS IT IS DONE" HAS THREE SHAPES, NOT ONE — MEASURED, AFTER
# THIS ASSERTION'S FIRST DRAFT REPORTED TWO FALSE DEFECTS ON THE TREE IT WAS
# WRITTEN AGAINST:
#
#   a. the build-order ROW says so — the common case, e.g. `5b-ii-b-2`;
#   b. only the STATUS LOG says so. `5a-i`'s row never restates it; the log
#      carries "`5a-i` IS DONE AS OF 2026-09-07" and that is the whole record;
#   c. the task is a SPLIT PARENT and is done because every child is. `5a-iii`
#      has no done-claim anywhere — `5a-iii-a` and `5a-iii-b` carry them, and
#      the handbook correctly says "split in two, both halves closed".
#
# A check that knew only shape (a) would have called the handbook wrong twice
# while it was right both times, and the cheap "fix" is to edit the handbook to
# match the check — which is the file the owner reads being degraded to suit a
# script. ⚠️ THE BACKTICKS ARE THE DELIMITER in shape (b): `grep -F` on
# "`5a-i` IS DONE AS OF" cannot match "`5a-iii` IS DONE AS OF", which is what
# keeps a prefix from claiming its sibling's completion.

# Every bold task id at column 0 in the plan, for the child walk in shape (c).
PLAN_TASKS="$(grep -oE '^\| \*\*`?[0-9][0-9A-Za-z.-]*`?\*\* \|' "$PLAN" \
              | sed 's/^| \*\*`\{0,1\}//; s/`\{0,1\}\*\* |$//' | sort -u)"

plan_done() {
  local t="$1" kid kids=0 alldone=1
  grep -Eq "$PLAN_DONE_RX" <<< "$(prow "$t")" && return 0          # (a)
  grep -qF "\`$t\` IS DONE AS OF" "$PLAN" && return 0             # (b)
  for kid in $PLAN_TASKS; do                                        # (c)
    case "$kid" in
      "$t"-*)
        # ⚠️ RECURSIVE, because a parent can sit between a parent and the work.
        # `5b-ii`'s children are `5b-ii-a` and `5b-ii-b`, and `5b-ii-b` is itself
        # a split parent with no done-claim of its own — so a one-level walk
        # calls `5b-ii` unfinished while every leaf under it has shipped.
        # ⚠️ The walk strictly descends (a child id is strictly longer than its
        # parent's), so this terminates.
        kids=$((kids+1))
        plan_done "$kid" || alldone=0 ;;
    esac
  done
  (( kids > 0 && alldone == 1 )) && return 0
  return 1
}

note
dis=0
for t in $BOOK_TASKS; do
  B="$(brow "$t")"
  [[ -n "$B" && -n "$(prow "$t")" ]] || continue
  p_done=0; b_done=0
  plan_done "$t" && p_done=1
  grep -Eq "$BOOK_DONE_RX" <<< "$B" && b_done=1
  if (( p_done == 1 && b_done == 0 )); then
    fail "the plan says $t is DONE and the handbook does not. That is how"
    echo "      5b-ii-b-2 spent four days telling the owner his next job was a"
    echo "      task that had already shipped."
    dis=$((dis+1))
  elif (( p_done == 0 && b_done == 1 )); then
    fail "the handbook says $t is done and the plan does not — not in the row, not"
    echo "      in the status log, and not by every child of it being closed. This is"
    echo "      the worse direction: the one file the owner reads is crediting him"
    echo "      with work that has not shipped."
    dis=$((dis+1))
  fi
done
(( dis == 0 )) && ok "the two files agree on which tasks are done"

# --- 3. a split parent is described as split --------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what an unmarked parent
# costs in the PLAN: a session takes the `L` the split exists to prevent. Here the
# cost is different and quieter — the owner is told a task exists that nobody can
# take, and he cannot tell that from a task that is merely next.
note
unsplit=0
for t in $BOOK_TASKS; do
  P="$(prow "$t")"; B="$(brow "$t")"
  [[ -n "$P" && -n "$B" ]] || continue
  grep -qiF "no longer takeable" <<< "$P" || continue
  if ! grep -qiE "split" <<< "$B"; then
    fail "the plan says $t is no longer takeable — it was split — and the handbook"
    echo "      still describes it as one job. The owner cannot tell a task that was"
    echo "      divided from a task that is simply next."
    unsplit=$((unsplit+1))
  fi
done
(( unsplit == 0 )) && ok "every split parent the handbook names is described as split"

# --- 4. ⚠️⚠️ the decisions block agrees -------------------------------------
# THE ASSERTION THIS FILE EXISTS FOR. On 2026-09-18 the owner ruled on the last
# open question and the plan's block went empty; the handbook kept a row headed
# with the waiting-on-you phrase asking for it. He had answered it the day before.
#
# ⚠️ The block's table runs from its heading to the first blank line after the
# rows begin — the bounded-region rule `plan-handover.sh` learned the hard way on
# 2026-09-13, when an unbounded reader swallowed the falsification table beneath
# the block and refused a legitimate task. This reader is copied from the fixed
# version deliberately: two readers of one region that bound it differently is the
# same defect wearing two hats.
note
DEC_HEAD="$(grep -n '^### ⛔ DECISIONS OWED BY THE OWNER' "$PLAN")"
if [[ -z "$DEC_HEAD" ]] || (( $(grep -c . <<< "$DEC_HEAD") != 1 )); then
  # plan-handover.sh owns this failure and reports it properly; this check must
  # not report the same defect twice in different words.
  ok "decisions-block agreement skipped — plan-handover.sh owns the block's shape"
else
  DEC_START="$(cut -d: -f1 <<< "$DEC_HEAD")"
  DEC_ROWS="$(awk -v s="$DEC_START" 'NR>s { if (/^\|/) { seen=1; print } else if (seen) { exit } }' "$PLAN")"
  DEC_BODY="$(grep -v '^|[-: |]*|$' <<< "$DEC_ROWS" | tail -n +2 | grep -c '[^[:space:]]')"

  WAIT_ROWS="$(grep -c "waiting on YOU" "$BOOK")"
  if (( WAIT_ROWS != 1 )); then
    fail "$WAIT_ROWS handbook rows say whether something is waiting on the owner;"
    echo "      expected exactly 1. Zero means he is never told, and two is how one"
    echo "      of them goes stale — the same argument as the plan's single block."
  else
    W="$(grep "waiting on YOU" "$BOOK")"
    says_nothing=0
    grep -qiE "Nothing is waiting on YOU" <<< "$W" && says_nothing=1
    if (( DEC_BODY == 0 && says_nothing == 0 )); then
      fail "the plan's decisions block is EMPTY and the handbook still says something"
      echo "      is waiting on the owner. He has answered it and the only file he"
      echo "      reads is still asking. This is the defect of 2026-09-18, exactly."
    elif (( DEC_BODY > 0 && says_nothing == 1 )); then
      fail "the plan has $DEC_BODY open decision(s) and the handbook says nothing is"
      echo "      waiting on the owner. A question nobody re-offers is a question that"
      echo "      never gets answered, and the handbook is where he would see it."
    else
      ok "the decisions block and the handbook agree ($DEC_BODY open)"
    fi
  fi
fi

# --- 5. the next piece of work agrees ---------------------------------------
# ⚠️ Defect 1, and the reason the marker is a phrase rather than a tick: the owner
# reads sentences. `plan-handover.sh` already guarantees the plan names exactly one
# next task; this asserts the handbook points at the SAME one.
note
NEXT_ROW="$(grep -m1 "^| .*THIS IS THE NEXT TASK" "$PLAN")"
if [[ -z "$NEXT_ROW" ]]; then
  ok "no next task in the plan to cross-check — plan-handover.sh owns that failure"
else
  NEXT_TASK="$(sed 's/^| \*\*`\{0,1\}//; s/`\{0,1\}\*\* |.*//' <<< "$NEXT_ROW")"
  MARKS="$(grep -c "This is where the next piece of work is" "$BOOK")"
  if (( MARKS != 1 )); then
    fail "$MARKS handbook rows say where the next piece of work is; expected exactly 1."
    echo "      The plan says it is $NEXT_TASK. Zero rows means the owner's own file"
    echo "      no longer tells him where the project is — which is most of what he"
    echo "      opens it for."
  else
    MARK_TASK="$(grep "This is where the next piece of work is" "$BOOK" \
                 | sed 's/^| \*\*`\{0,1\}//; s/`\{0,1\}\*\* |.*//')"
    if [[ "$MARK_TASK" == "$NEXT_TASK" ]]; then
      ok "both files point at the same next piece of work ($NEXT_TASK)"
    else
      fail "the plan's next task is '$NEXT_TASK' and the handbook points at"
      echo "      '$MARK_TASK'. Two copies of one claim, in two files, disagreeing —"
      echo "      and the owner only reads one of them."
    fi
  fi
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above is
# conditional, so "0 failures" is also what a run that skipped everything looks
# like.
if (( fails == 0 && ran < 5 )); then
  echo "FAIL: only $ran assertion groups ran, expected 5 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — the handbook and the plan agree on what is"
  echo "done, what was split, what is next, and whether anything is waiting on the owner."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the file the owner reads disagrees with the plan."
exit 1

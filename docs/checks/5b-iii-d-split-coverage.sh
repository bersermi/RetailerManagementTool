#!/usr/bin/env bash
# 5b-iii-d-split-coverage — did the split of 5b-iii-d lose a deliverable?
#
# WHY THIS EXISTS. `5b-iii-d` was sized `L` and split IN TWO on 2026-09-19 — on
# the day it was taken, before a line of it was written — and this is the SEVENTH
# generation of the same guard: `5b-split-coverage.sh` watches `5b`'s three
# children, `5b-ii-split-coverage.sh` watches `5b-ii`'s two,
# `5b-ii-b-split-coverage.sh` watches `5b-ii-b`'s two,
# `5b.8-split-coverage.sh` watches `5b.8`'s three,
# `5b.8-iii-split-coverage.sh` watches `5b.8-iii`'s two,
# `5b-iii-split-coverage.sh` watches `5b-iii`'s four, and this watches the TWO
# under `5b-iii-d`. A split is a promise that every piece of the parent landed in
# exactly one child, and nothing in this repository can check that promise except
# a person reading three table rows.
#
# ⚠️⚠️ THIS ONE GUARDS NO MIGRATION AT ALL, AND THAT IS THE POINT RATHER THAN A
# RELAXATION. Both children ship client code only; every function either of them
# calls is already applied (`0029`, `0037`). So the failure this guard is written
# against is not a deployed function — it is `D8`'s fence going missing on a
# SCREEN, and §2.11 keeps rendering out of scope, which means **there is no suite
# in this repository that would notice.** The sixth-generation guard could at
# least fall back on "a pgTAP suite will catch it". This one cannot. These three
# table rows are the whole instrument.
#
# ⚠️⚠️ THE GATE CELL PREDICTED THE RE-SIZE AND WAS RIGHT FOR THE THIRD TIME
# RUNNING. `5b-iii-d`'s right-hand cell said "RE-SIZE IT ON THE DAY IT IS TAKEN —
# it carries a badge, a list and a picker", naming four earlier rows that each
# record a deferred half arriving bigger than it left. It was taken on 2026-09-19
# and measured at ~2,500 insertions against a house ruler whose largest client
# session is 1,782 — and the reason is one phrase: both of those edited a screen
# that ALREADY EXISTED, and this task has none to edit.
#
# THE SEAM, STATABLE IN ONE LINE: `5b-iii-d-1` READS and writes nothing, so every
# claim in it is falsifiable by one contract check over real HTTP; `5b-iii-d-2` is
# the only WRITE and carries the one decision no instrument here can see. That is
# the read-then-write line `5b-ii` was split on — `5b-ii-a` was the sheet "and
# everything on it that only reads" — reused rather than invented.
#
# WHAT IT ASSERTS:
#
#   1. The parent row `5b-iii-d` and both child rows exist in the build-order
#      table.
#   2. Each child row appears EXACTLY ONCE. ⚠️ `5a-iv`'s sub-split was stated in
#      two tables, a correction landed in one of them, the guard read the other,
#      and for an hour the plan asserted both routings while reporting success.
#   3. The parent still PROMISES each of the four deliverables — otherwise a
#      shrinking parent row makes the coverage claim below vacuous, which is this
#      repository's most-recorded check defect.
#   4. Each deliverable is named by exactly one child, and by the right one.
#   5. `D8`'s SILENT FAILURE survives in `5b-iii-d-2` — the child that ships the
#      fence. ⚠️ An approved staff member with no location writes nothing, with no
#      message, which on a phone looks exactly like the app being broken. The
#      control refuses to be empty because of that sentence and nothing else.
#   6. `5b-iii-d-1` still says it is DELIBERATELY HALF A LOOP. ⚠️ This is the
#      assertion that keeps the split from quietly collapsing: the cheapest thing
#      a session building the list can do is wire the approve button while it is
#      already in the file — and that is the whole `L` back in one sitting, with
#      the fence riding along unmeasured.
#   7. NEITHER child claims a migration. ⚠️ Both rows say so today because both
#      are true today; a child that grows one has grown out of this split, and
#      merging is automated, so that is a deployed function rather than a
#      reviewable diff.
#   8. The parent row is NOT takeable. `4.6a`, `4.6c`, `5b`, `5b-ii`, `5b-ii-b`,
#      `5b.8`, `5b.8-iii` and `5b-iii` all had to say so in their own rows once
#      split, and prose is not a gate.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Nothing about whether the split is a GOOD one. It
# cannot see whether `5b-iii-d-1` is buildable in one session, and — the one that
# matters here — IT CANNOT SEE AN EMPTY PICKER. That is exactly the instrument
# §2.11 declines to buy, which is why the fence is defended by assertion 5 as a
# SENTENCE rather than by a test as a behaviour.
#
# ⚠️⚠️ NEVER QUOTE THIS CHECK'S SENTINELS VERBATIM IN `docs/PLAN.md` PROSE. It
# reads table rows anchored at column 0, which is why prose quoting a row can
# never match — and the sizing section above these rows quotes several of these
# sentences almost word for word, deliberately, because that section is where the
# reasoning lives. ⚠️ THE SISTER RULE, learned by `plan-handover.sh` the hard way
# on 2026-09-13: A CHECK MUST BOUND THE REGION IT READS, NOT TRUST THE NEXT
# HEADING. This one bounds itself by matching bold task names at column 0 and
# nothing else.
#
# Run:  bash docs/checks/5b-iii-d-split-coverage.sh
# Exit: 0 all groups hold; 1 otherwise, naming each failure.

set -uo pipefail

PLAN="${1:-docs/PLAN.md}"
[[ -r "$PLAN" ]] || { echo "FAIL: cannot read $PLAN"; exit 1; }

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
# ⚠️ `| grep "^|"` IS LOAD-BEARING. A table row starts at column 0; prose quoting
# one does not — and the sizing section quotes these rows.
#
# ⚠️⚠️ THE TRAILING ` |` IS THE WHOLE BALLGAME, AND THE PREFIX CHAIN IS NOW FOUR
# DEEP: `5b-i` ⊂ `5b-iii` ⊂ `5b-iii-d` ⊂ `5b-iii-d-1`. Without the closing pipe,
# `| **5b-iii-d** |` matches inside BOTH children, the parent is counted three
# times, and every deliverable appears to be "in the parent" no matter which child
# holds it — assertion 4 silently reporting success on a dropped deliverable.
# ⚠️ It is also what keeps the SIXTH-generation guard unmoved by these two new
# rows, since `| **5b-iii-d** |` cannot match inside `| **5b-iii-d-1** |`.
# Fixtures `P1` and `P2` are what say that separation is real rather than assumed.
rows_all() { grep -F -e "| **$1** |" -e "| **\`$1\`** |" "$PLAN" | grep "^|"; }
row()      { rows_all "$1" | head -1; }

CHILDREN="5b-iii-d-1 5b-iii-d-2"

# --- 1. the three rows exist ------------------------------------------------
note
missing=0
for t in 5b-iii-d $CHILDREN; do
  if [[ -z "$(row "$t")" ]]; then
    fail "no table row for $t in $PLAN"
    missing=$((missing+1))
  fi
done
if (( missing == 0 )); then
  ok "the parent row and both children of 5b-iii-d are present"
else
  echo "      A split whose children are not in the build-order table is a split a"
  echo "      cleared session cannot take."
  echo
  echo "$ran group(s) ran, $fails failed."
  exit 1
fi

# --- 2. each child row appears exactly once ---------------------------------
note
dupes=0
for t in $CHILDREN; do
  n="$(rows_all "$t" | grep -c . )"
  if (( n != 1 )); then
    fail "$t's row appears $n times. Two copies of one claim is how the 5a-iv"
    echo "      sub-split asserted two different routings at once — state it once."
    dupes=$((dupes+1))
  fi
done
(( dupes == 0 )) && ok "each child row is stated exactly once"

# deliverable | the regex it is recognised by | the child that owns it
#
# ⚠️ EACH REGEX MUST MATCH IN EXACTLY ONE CHILD ROW, which is a constraint on the
# PLAN's wording as much as on this list: a child row that mentions its sibling's
# work in passing turns this red. That is deliberate. A row describing work it
# does not do is how `4.6b`'s scope disagreed with `4.5c-ii`'s for four days.
#
# ⚠️⚠️ AND IT IS NEVER `(a|b)`. These entries are split on `|` by `IFS='|' read`,
# so a `|` inside the regex field TRUNCATES it — the pattern becomes `(a`, the
# owner field becomes `b)`, and the entry fails as a DROPPED deliverable, which
# reads exactly like the defect this list exists to catch and is not one. Use a
# BRACKET CLASS where case differs, as the ruling entry does.
#
# ⚠️ THE RULING ENTRY IS MATCHED CASE-INSENSITIVELY BY BRACKET CLASS rather than
# by `grep -i`, because the rest of this list is case-SENSITIVE on purpose:
# `approve_request` is a function name and `Approve Request` is prose about one.
DELIVERABLES=(
  "C11.8 — the Home notifications icon and its badge|C11\.8|5b-iii-d-1"
  "the approval row's order, ruled 2026-09-19|EMAIL [aA][sS] [tT][hH][eE] [hH][eE][aA][dD][eE][rR]|5b-iii-d-1"
  "approve_request — the act that shuts the loop|approve_request|5b-iii-d-2"
  "the location picker D8 refuses to leave empty|location picker|5b-iii-d-2"
)

# --- 3. + 4. the parent still promises each one, and exactly one child has it
note
covered=0
cov_fails=0
for d in "${DELIVERABLES[@]}"; do
  IFS='|' read -r name rx owner <<< "$d"

  if ! grep -Eq "$rx" <<< "$(row 5b-iii-d)"; then
    echo "FAIL: '$name' is no longer named in the parent 5b-iii-d row — the coverage"
    echo "      claim below would be vacuous for it. Restore it, or re-size deliberately."
    cov_fails=$((cov_fails+1))
    continue
  fi

  hits=""
  for t in $CHILDREN; do
    grep -Eq "$rx" <<< "$(row "$t")" && hits="$hits $t"
  done
  set -- $hits
  case "$#" in
    0) echo "FAIL: '$name' is in the parent row and in NO child — dropped by the split."
       echo "      ⚠️ NEITHER CHILD SHIPS A MIGRATION, so nothing downstream will catch"
       echo "      this: §2.11 keeps rendering out of scope and no suite here can see a"
       echo "      screen that is missing a control. These rows are the instrument."
       cov_fails=$((cov_fails+1)) ;;
    1) if [[ "$1" != "$owner" ]]; then
         echo "FAIL: '$name' landed in $1; this split assigned it to $owner."
         cov_fails=$((cov_fails+1))
       else
         covered=$((covered+1))
       fi ;;
    *) echo "FAIL: '$name' appears in$hits — owned by neither, which is how a"
       echo "      deliverable falls between two tasks that each assume the other has it."
       cov_fails=$((cov_fails+1)) ;;
  esac
done
total=${#DELIVERABLES[@]}
if (( cov_fails == 0 )); then
  ok "$covered/$total of 5b-iii-d's deliverables land in exactly one child, the assigned one"
else
  fails=$((fails+1))
  echo "      $covered/$total covered; $cov_fails are not."
fi

ROW_D1="$(row 5b-iii-d-1)"
ROW_D2="$(row 5b-iii-d-2)"

# --- 5. D8's silent failure travels with the fence --------------------------
# ⚠️ THE FIRST OF THREE THAT GUARD A DECISION RATHER THAN A DELIVERABLE, AND IT IS
# THE ONE THAT REACHES A SHOP. `D8` is why the picker refuses to be empty for
# `staff`. Drop the sentence and the obvious kindness — let it through, pick a
# default, ask later — produces a cashier who can open the app and write nothing,
# with no message. ⚠️ The parent row carries this sentence too, and the SIXTH
# generation asserts it there; this asserts it survived into the half that
# actually builds the control.
note
if grep -qF "WRITES NOTHING, SILENTLY" <<< "$ROW_D2"; then
  ok "5b-iii-d-2's row still carries D8's silent failure"
else
  fail "5b-iii-d-2's row no longer says an approved staff member with no location"
  echo "      writes nothing, silently. That sentence is the whole reason the control"
  echo "      refuses to be empty, RLS refuses those writes with no message, and §2.11"
  echo "      means no test in this repository can see the difference."
fi

# --- 6. the read half is still half a loop ----------------------------------
# ⚠️ THE SECOND DECISION, AND IT IS THE ONE THAT KEEPS THIS SPLIT FROM COLLAPSING
# BACK INTO THE `L` IT CAME FROM. The cheapest thing a session building the list
# can do is wire the approve button while the file is already open — and that is
# the whole task back in one sitting, with the fence riding along in the half
# where nothing can measure it. The row has to say the half is deliberate, or the
# next session reads an unfinished screen rather than a finished one.
note
if grep -qF "DELIBERATELY HALF A LOOP" <<< "$ROW_D1"; then
  ok "5b-iii-d-1's row still says its half loop is deliberate"
else
  fail "5b-iii-d-1's row no longer says it is deliberately half a loop. A screen that"
  echo "      lists people and cannot admit them reads as UNFINISHED rather than as"
  echo "      shipped — and the session that 'finishes' it takes the write, the picker"
  echo "      and D8's fence in the sitting this split exists to keep them out of."
fi

# --- 7. neither child has grown a migration ---------------------------------
# ⚠️ THE THIRD DECISION. Both halves are client-only and both rows say so. A child
# that grows a migration has grown out of this split — and merging is automated,
# so it is not a reviewable mistake but a deployed one, repaired by a fix-forward
# migration. ⚠️ This is a POSITIVE assertion on purpose: the row must still SAY it,
# because a silent row is what a row that quietly acquired one looks like.
note
mig=0
for t in $CHILDREN; do
  if ! grep -qF "ships NO migration" <<< "$(row "$t")"; then
    fail "$t's row no longer states that it ships no migration. Every function both"
    echo "      halves call is applied already (0029, 0037). A child that needs DDL is a"
    echo "      child that outgrew this split, and it merges automatically."
    mig=$((mig+1))
  fi
done
(( mig == 0 )) && ok "neither child claims a migration, and both rows still say so"

# --- 8. the parent is not takeable ------------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what happens when a parent
# stays takeable: a session takes the `L` the split exists to prevent. Here that
# `L` is a badge, a new screen, a picker and the only write, in one sitting.
note
if grep -qiF "no longer takeable" <<< "$(row 5b-iii-d)"; then
  ok "the parent 5b-iii-d row says it is no longer takeable"
else
  fail "the parent 5b-iii-d row does not say it is no longer takeable. A split whose"
  echo "      parent still reads as a task is a split a cleared session walks past — it"
  echo "      takes the L, and this L carries the one decision nothing here can measure."
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above is
# conditional, so "0 failures" is also what a run that skipped everything looks
# like — and assertion group 1 exits early by design, which is exactly the shape
# that can leave the rest unrun without anything going red.
if (( fails == 0 && ran < 7 )); then
  echo "FAIL: only $ran assertion groups ran, expected 7 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — 5b-iii-d's $total deliverables have two homes,"
  echo "each child is stated once, the read half still admits it is half a loop, the write"
  echo "half still carries the fence, and neither has grown a migration."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the 5b-iii-d split is not safe to take."
exit 1

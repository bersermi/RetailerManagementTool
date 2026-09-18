#!/usr/bin/env bash
# 5b.8-split-coverage — did the split of 5b.8 lose a deliverable?
#
# WHY THIS EXISTS. `5b.8` was sized `L` and split three ways on 2026-09-18, before
# a line of it was written, and this is the FOURTH generation of the same guard:
# `5b-split-coverage.sh` watches `5b`'s three children, `5b-ii-split-coverage.sh`
# watches `5b-ii`'s two, `5b-ii-b-split-coverage.sh` watches `5b-ii-b`'s two, and
# this watches `5b.8`'s three. A split is a promise that every piece of the parent
# landed in exactly one child, and nothing in this repository can check that
# promise except a person reading four table rows.
#
# ⚠️⚠️ AND THIS ONE GUARDS A MIGRATION, WHICH NONE OF THE THREE BEFORE IT DID.
# `5b.8-i` writes a column and rewrites four applied functions. Merging is
# automated, so a deliverable that falls out of this split is not a reviewable
# mistake — it is a deployed one, and the repair is a second migration plus a
# second backfill over the rows made in between.
#
# THE SIX THINGS THE SIZING FOUND, and the first two were on no row at all:
#
#   * `R1` `request_access` (0029:256) writes a `workspace_member` row on the `D7`
#     fast path — somebody already invited who types the shop code instead of the
#     token. The parent row named two writers; the applied schema has four.
#   * `R2` `approve_request` (0029:455) writes one too, and it is `5b-iii`'s own
#     RPC — the task `5b.8` is ordered to precede. A column without this writer
#     means the pull path joins nameless on the very next task.
#   * `R3` the 2026-09-14 EMAIL ruling is held as a deliverable by TWO split
#     guards, and it stops being true on the SCREEN, not in the migration — so
#     the sentinels move in the second child and not the first.
#   * `R4` `display_name` already means the SHOP inside `onboard_workspace`, whose
#     own parameter is `p_display_name` (0027:418).
#   * `R5` three of the four writers take an `update` branch, so the name is
#     written on `insert` and on `update` ONLY where the stored value is null —
#     otherwise a re-invite silently overwrites a correction a person made.
#   * `R6` `supabase/README.md`'s `0033` entry says no human name exists anywhere
#     in this schema. This migration makes that false.
#
# WHAT IT ASSERTS:
#
#   1. The parent row `5b.8` and all three child rows exist in the build-order
#      table.
#   2. Each child row appears EXACTLY ONCE. ⚠️ `5a-iv`'s sub-split was stated in
#      two tables, a correction landed in one of them, the guard read the other,
#      and for an hour the plan asserted both routings while reporting success.
#   3. The parent still PROMISES each of the fourteen deliverables — otherwise a
#      shrinking parent row makes the coverage claim below vacuous, which is this
#      repository's most-recorded check defect.
#   4. Each deliverable is named by exactly one child, and by the right one.
#   5. `R5`'s write rule — on `update` only where the stored value is null — is
#      still written into the child that ships it. ⚠️ That is a DECISION taken on
#      the owner's behalf, baked into FOUR applied functions, and nothing in this
#      repository can see a `coalesce` that has not been written yet.
#   6. `R3`'s routing — the sentinels move in the second child — is still written
#      into that child. Two other guards depend on which task moves them, and no
#      check can read an intention.
#   7. The parent row is NOT takeable. `4.6a`, `4.6c`, `5b`, `5b-ii` and `5b-ii-b`
#      all had to say so in their own rows once split, and prose is not a gate.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Nothing about whether the split is a GOOD one. It
# cannot see whether `5b.8-i` is buildable in one session, and it cannot see a
# FIFTH membership writer appearing in the schema — only that the row does not
# fail to claim the four that exist today. ⚠️ AND IT CANNOT SEE `R1`, `R2`, `R4`
# OR `R5` IN THE SCHEMA AT ALL: those are claims about applied SQL, and the
# instrument for them is the pgTAP suite `5b.8-i` ships — the same division
# `5b-i` drew, `5b.7` repeated and `5b-ii-b` inherited.
#
# ⚠️⚠️ NEVER QUOTE THIS CHECK'S SENTINELS VERBATIM IN `docs/PLAN.md`. It reads
# table rows anchored at column 0, which is why prose quoting a row can never
# match — and the sizing section above these rows quotes several. ⚠️ THE SISTER
# RULE, learned by `plan-handover.sh` the hard way on 2026-09-13: A CHECK MUST
# BOUND THE REGION IT READS, NOT TRUST THE NEXT HEADING. This one bounds itself
# by matching bold task names at column 0 and nothing else.
#
# Run:  bash docs/checks/5b.8-split-coverage.sh
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
# one does not — and the sizing section quotes several of these rows.
#
# ⚠️ AND THE `**` IS LOAD-BEARING. The build-order rows are bold (`| **5b.8-i** |`);
# the sizing's seam table names the same tasks in backticks and no bold. Matching
# the bold form is what keeps assertion 2 counting rows and not prose.
#
# ⚠️⚠️ THE TRAILING ` |` IS WHAT KEEPS THE FOUR ROWS APART, AND HERE IT MATTERS
# MORE THAN IT EVER HAS: `5b.8-i` IS A PREFIX OF BOTH ITS SIBLINGS. Without the
# closing pipe, `| **5b.8-i** |` matches inside `| **5b.8-ii** |` and
# `| **5b.8-iii** |`, and one row is counted three times — the exact shape
# assertion 2 exists to catch, arriving through the matcher instead.
#
# ⚠️ AND `5b.8` IS THE FIRST TASK NAME HERE CONTAINING A `.`, a regex
# metacharacter. This matcher is `grep -F` and is safe by construction; the
# DELIVERABLES regexes below are `grep -E` and were each read for it by hand.
rows_all() { grep -F -e "| **$1** |" -e "| **\`$1\`** |" "$PLAN" | grep "^|"; }
row()      { rows_all "$1" | head -1; }

# --- 1. the four rows exist -------------------------------------------------
note
missing=0
for t in 5b.8 5b.8-i 5b.8-ii 5b.8-iii; do
  if [[ -z "$(row "$t")" ]]; then
    fail "no table row for $t in $PLAN"
    missing=$((missing+1))
  fi
done
if (( missing == 0 )); then
  ok "the parent row and all three children of 5b.8 are present"
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
for t in 5b.8-i 5b.8-ii 5b.8-iii; do
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
# RPC in passing turns this red. That is deliberate. A row describing work it does
# not do is how `4.6b`'s scope disagreed with `4.5c-ii`'s for four days.
#
# ⚠️ THE SEAM IS STATABLE IN ONE LINE AND THE LIST IS HOW IT IS HELD: the first
# child ships EVERY WRITE and no read; the second ships every READ and no
# migration; the third ships the one repair path and the screen that calls it.
#
# ⚠️ `pgTAP` ALONE IS NOT THE SENTINEL and must not be. The third child ships a
# pgTAP suite of its own, so the regex names the FIRST child's suite by what it
# covers — the four writers — which is the claim that actually belongs to it.
DELIVERABLES=(
  "the display_name column on workspace_member|the table a phone CAN read|5b.8-i"
  "the shop-creation RPC writes it|onboard_workspace|5b.8-i"
  "the redemption RPC writes it|redeem_invite|5b.8-i"
  # ⚠️ R1. 0029:256, the D7 fast path. On no row before 2026-09-18.
  "the join-by-code fast path writes it (R1)|request_access|5b.8-i"
  # ⚠️ R2. 0029:455, and it is 5b-iii's own RPC — the ordering's whole point.
  "the approval path writes it (R2)|approve_request|5b.8-i"
  "the backfill for rows that already exist|backfill|5b.8-i"
  "the pgTAP suite over the four writers|pgTAP suite over the four writers|5b.8-i"
  # ⚠️ Two sections, not one: §2.3 carries the columns, §2.7 the auth.users
  # sentence and the create_invite spelling. The plan said §2.7 for all three.
  "the ADR amendments|ADR-035 §2.7|5b.8-i"
  "the fourth identity case in the roster|rosterFrom|5b.8-ii"
  "the column added to the roster's read|MEMBER_COLUMNS|5b.8-ii"
  "the contract check and harness extended|contract check and harness|5b.8-ii"
  # ⚠️ R3. Capitalised at the head of a sentence in the child row, lower-case in
  # the parent's — which is why this one regex carries an alternation and the
  # thirteen others do not.
  "the two split guards whose sentinels this retires (R3)|[Tt]wo split guards|5b.8-ii"
  "the security definer self-edit RPC|set_my_display_name|5b.8-iii"
  "the control a person fixes their own name with|the control lives on the sheet|5b.8-iii"
)

# --- 3. + 4. the parent still promises each one, and exactly one child has it
note
covered=0
cov_fails=0
for d in "${DELIVERABLES[@]}"; do
  IFS='|' read -r name rx owner <<< "$d"

  if ! grep -Eq "$rx" <<< "$(row 5b.8)"; then
    echo "FAIL: '$name' is no longer named in the parent 5b.8 row — the coverage"
    echo "      claim below would be vacuous for it. Restore it, or re-size deliberately."
    cov_fails=$((cov_fails+1))
    continue
  fi

  hits=""
  for t in 5b.8-i 5b.8-ii 5b.8-iii; do
    grep -Eq "$rx" <<< "$(row "$t")" && hits="$hits $t"
  done
  set -- $hits
  case "$#" in
    0) echo "FAIL: '$name' is in the parent row and in NO child — dropped by the split."
       echo "      ⚠️ THIS SPLIT SHIPS A MIGRATION. A write that falls out here is not a"
       echo "      control nobody builds; it is a column nobody fills, deployed, and"
       echo "      repaired by a second migration and a second backfill."
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
  ok "$covered/$total of 5b.8's deliverables land in exactly one child, the assigned one"
else
  fails=$((fails+1))
  echo "      $covered/$total covered; $cov_fails are not."
fi

# --- 5. the write rule survives ---------------------------------------------
# ⚠️ THE FIRST OF TWO THAT GUARD A DECISION RATHER THAN A DELIVERABLE, and it is
# the most expensive decision in this split. `redeem_invite` (0028:520),
# `request_access` (0029:253) and `approve_request` (0029:452) all take an
# `update` branch when the member row already exists. If that branch refreshes the
# name from `raw_user_meta_data`, a person who corrected their own name through
# `5b.8-iii` loses it the next time somebody re-invites her — silently, on an
# event she did not trigger.
#
# It is one `coalesce` in SQL and an argument nothing else holds: a write rule
# inside four applied functions has no constraint, grant or policy to live in, and
# once `0034` is applied reversing it is a fix-forward migration that cannot
# restore what was overwritten.
note
ROW_I="$(row 5b.8-i)"
if grep -qF "only where the stored value is null" <<< "$ROW_I"; then
  ok "5b.8-i's row still carries R5's write rule"
else
  fail "5b.8-i's row no longer says the name is written on \`update\` ONLY where the"
  echo "      stored value is null. Three of the four writers take an update branch"
  echo "      (0028:520, 0029:253, 0029:452), so without that rule a re-invite"
  echo "      silently replaces a name a person corrected about themselves with"
  echo "      whatever Google sent. Restore it, or record the decision to refresh"
  echo "      the name every time and say what it costs her."
fi

# --- 6. the sentinel routing survives ---------------------------------------
# ⚠️ THE SECOND DECISION, AND IT IS ABOUT TWO OTHER GUARDS. `5b-split-coverage.sh`
# and `5b-ii-split-coverage.sh` both hold the 2026-09-14 EMAIL ruling as a
# DELIVERABLE. The parent's rule is that they stay exactly as they are "until it
# does" — and `it` is the child that puts the name on a screen, not the one that
# stores it. A guard asserting a rule that is not yet true goes red on a correct
# tree and gets deleted; one asserting a rule superseded on paper is caught by the
# row that names it. Nothing but this row records which child is which.
note
ROW_II="$(row 5b.8-ii)"
if grep -qF "the sentinels move HERE and not in the migration" <<< "$ROW_II"; then
  ok "5b.8-ii's row still claims the sentinel retirement (R3)"
else
  fail "5b.8-ii's row no longer says the two guards' sentinels move HERE rather than"
  echo "      in the migration. A stored column changes nothing a person sees, so"
  echo "      retiring them in 5b.8-i leaves both guards asserting a rule that is"
  echo "      neither true nor superseded for as long as 5b.8-ii takes. Restore it,"
  echo "      or record the decision to move them earlier and say what holds the"
  echo "      ruling in the meantime."
fi

# --- 7. the parent is not takeable ------------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what happens when a parent
# stays takeable: a session takes the `L` the split exists to prevent. Here that
# `L` carries two migrations.
note
if grep -qiF "no longer takeable" <<< "$(row 5b.8)"; then
  ok "the parent 5b.8 row says it is no longer takeable"
else
  fail "the parent 5b.8 row does not say it is no longer takeable. A split whose"
  echo "      parent still reads as a task is a split a cleared session walks past —"
  echo "      it takes the L, and this L writes a column and rewrites four applied"
  echo "      functions under an automated merge."
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above is
# conditional, so "0 failures" is also what a run that skipped everything looks
# like — and assertion group 1 exits early by design, which is exactly the shape
# that can leave the rest unrun without anything going red.
if (( fails == 0 && ran < 6 )); then
  echo "FAIL: only $ran assertion groups ran, expected 6 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — 5b.8's $total deliverables have three homes,"
  echo "each child is stated once, all four membership writers land in the migration,"
  echo "and no child claims a write it does not ship."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the 5b.8 split is not safe to take."
exit 1

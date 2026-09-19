#!/usr/bin/env bash
# 5b.8-iii-split-coverage — did the split of 5b.8-iii lose a deliverable?
#
# WHY THIS EXISTS. `5b.8-iii` was sized `L` and split in two on 2026-09-19, before
# a line of it was written, and this is the FIFTH generation of the same guard:
# `5b-split-coverage.sh` watches `5b`'s three children, `5b-ii-split-coverage.sh`
# watches `5b-ii`'s two, `5b-ii-b-split-coverage.sh` watches `5b-ii-b`'s two,
# `5b.8-split-coverage.sh` watches `5b.8`'s three, and this watches the two under
# `5b.8-iii`. A split is a promise that every piece of the parent landed in
# exactly one child, and nothing in this repository can check that promise except
# a person reading three table rows.
#
# ⚠️⚠️ AND THIS ONE GUARDS A MIGRATION, THE SECOND OF THE FIVE THAT DOES.
# `5b.8-iii-a` writes a `security definer` RPC that updates `workspace_member`.
# Merging is automated, so a deliverable that falls out of this split is not a
# reviewable mistake — it is a deployed one, and the repair is a fix-forward
# migration over a function the client is already calling.
#
# ⚠️⚠️ THE GATE CELL PREDICTED THE RE-SIZE AND WAS RIGHT, WHICH IS WHY THE ROW
# EXISTS AT ALL. `5b.8-iii`'s right-hand cell has said "IF IT IS DEFERRED, RE-SIZE
# IT ON THE DAY IT IS TAKEN" since 2026-09-18, naming `4e`, `4.6a` and `5b.8` as
# three rows that each record a deferred half arriving bigger than it left. It was
# deferred, it was taken on 2026-09-19, and it arrived bigger.
#
# THE SEAM, STATABLE IN ONE LINE: the first child ships the RPC and everything
# that can be falsified with NO CLIENT IN THE ROOM; the second ships the screen
# that calls it and NO MIGRATION. That is the same seam `5b.8` itself was split
# on — `5b.8-i` the migration, `5b.8-ii` the screen — which is the argument for
# reusing it rather than inventing one.
#
# WHAT IT ASSERTS:
#
#   1. The parent row `5b.8-iii` and both child rows exist in the build-order
#      table.
#   2. Each child row appears EXACTLY ONCE. ⚠️ `5a-iv`'s sub-split was stated in
#      two tables, a correction landed in one of them, the guard read the other,
#      and for an hour the plan asserted both routings while reporting success.
#   3. The parent still PROMISES each of the ten deliverables — otherwise a
#      shrinking parent row makes the coverage claim below vacuous, which is this
#      repository's most-recorded check defect.
#   4. Each deliverable is named by exactly one child, and by the right one.
#   5. The WORKSPACE-SCOPING decision is still written into the child that ships
#      it. ⚠️ That is a decision taken on the owner's behalf, it goes into an
#      APPLIED function signature, and nothing in this repository can see a
#      parameter that has not been written yet.
#   6. The COLUMN-NOT-ROW refusal survives in the child that ships it. ⚠️ This is
#      the one that guards the tenancy wall: the obvious "you may update your own
#      row" policy is RLS, RLS filters ROWS and not COLUMNS, and it would hand
#      every cashier her own `role`. A split that drops this sentence is a split
#      whose next session writes that policy.
#   7. The parent row is NOT takeable. `4.6a`, `4.6c`, `5b`, `5b-ii`, `5b-ii-b`
#      and `5b.8` all had to say so in their own rows once split, and prose is not
#      a gate.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Nothing about whether the split is a GOOD one. It
# cannot see whether `5b.8-iii-a` is buildable in one session, and it cannot see
# whether the RPC it describes is the right shape — those are claims about applied
# SQL, and the instrument for them is the pgTAP suite `5b.8-iii-a` ships, the same
# division `5b-i` drew, `5b.7` repeated and `5b.8` inherited.
#
# ⚠️⚠️ AND IT CANNOT SEE THE LOPSIDED COVERAGE BELOW AS A DEFECT, BECAUSE IT IS
# NOT ONE. Nine of the ten deliverables land in `5b.8-iii-a` and one in
# `5b.8-iii-b`. That is not the split being unfair; it is the PARENT ROW having
# been written as a database task with a single sentence about the control — which
# is itself part of why it needed splitting, and why the second child's row has to
# carry detail the parent never had. Assertion 3 only demands the parent name what
# the children claim, never the reverse.
#
# ⚠️⚠️ NEVER QUOTE THIS CHECK'S SENTINELS VERBATIM IN `docs/PLAN.md` PROSE. It
# reads table rows anchored at column 0, which is why prose quoting a row can
# never match — and the sizing section above these rows quotes several. ⚠️ THE
# SISTER RULE, learned by `plan-handover.sh` the hard way on 2026-09-13: A CHECK
# MUST BOUND THE REGION IT READS, NOT TRUST THE NEXT HEADING. This one bounds
# itself by matching bold task names at column 0 and nothing else.
#
# Run:  bash docs/checks/5b.8-iii-split-coverage.sh
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
# ⚠️ AND THE `**` IS LOAD-BEARING. The build-order rows are bold
# (`| **5b.8-iii-a** |`); the sizing prose names the same tasks in backticks and
# no bold. Matching the bold form is what keeps assertion 2 counting rows.
#
# ⚠️⚠️ THE TRAILING ` |` IS WHAT KEEPS THE PARENT OFF ITS OWN CHILDREN, AND HERE
# IT IS THE WHOLE BALLGAME: `5b.8-iii` IS A PREFIX OF BOTH `5b.8-iii-a` AND
# `5b.8-iii-b`. Without the closing pipe, `| **5b.8-iii** |` matches inside both
# child rows and the parent is counted three times — and worse, every deliverable
# would appear to be "in the parent" no matter which child actually holds it,
# which is assertion 4 silently reporting success on a dropped deliverable.
#
# ⚠️ AND THE SAME TRAILING PIPE IS WHY `5b.8-split-coverage.sh` KEEPS WORKING
# ACROSS THIS SPLIT. That guard routes two deliverables to `| **5b.8-iii** |`; the
# two new rows do not match its matcher, so its 14/14 is unchanged by the rows
# added here. That was verified, not assumed.
rows_all() { grep -F -e "| **$1** |" -e "| **\`$1\`** |" "$PLAN" | grep "^|"; }
row()      { rows_all "$1" | head -1; }

# --- 1. the three rows exist ------------------------------------------------
note
missing=0
for t in 5b.8-iii 5b.8-iii-a 5b.8-iii-b; do
  if [[ -z "$(row "$t")" ]]; then
    fail "no table row for $t in $PLAN"
    missing=$((missing+1))
  fi
done
if (( missing == 0 )); then
  ok "the parent row and both children of 5b.8-iii are present"
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
for t in 5b.8-iii-a 5b.8-iii-b; do
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
# ⚠️ THE LAST ENTRY CARRIES A BRACKET CLASS AND THE NINE OTHERS DO NOT, for the
# same reason `5b.8-split-coverage.sh`'s `R3` entry does: the phrase opens a
# sentence in the child row and sits mid-sentence in the parent's, so the leading
# letter differs. ⚠️⚠️ IT IS NOT AN ALTERNATION, AND IT MUST NEVER BECOME ONE:
# these entries are split on `|` by `IFS='|' read`, so a `(a|b)` inside the regex
# field TRUNCATES it — the pattern becomes `(a`, the owner field becomes `b)`, and
# the entry fails as a DROPPED deliverable, which reads exactly like the defect
# this list exists to catch and is not one. That wrong word walked
# `5b-split-coverage.sh`'s next writer into it on 2026-09-19.
DELIVERABLES=(
  "the self-edit RPC itself|set_my_display_name|5b.8-iii-a"
  "it is a definer function, not a policy|security definer|5b.8-iii-a"
  "it takes the next migration number|next free number|5b.8-iii-a"
  "it touches one column and nothing else|ONE column|5b.8-iii-a"
  "the pgTAP suite over the RPC|pgTAP suite|5b.8-iii-a"
  "a non-member is refused|non-member is refused|5b.8-iii-a"
  "a blank is refused|blank is refused|5b.8-iii-a"
  "the role column is provably untouched|provably untouched|5b.8-iii-a"
  "the column-not-row refusal|RLS FILTERS ROWS, NOT COLUMNS|5b.8-iii-a"
  "the control a person fixes their own name with|[Tt]he control lives on the sheet|5b.8-iii-b"
)

# --- 3. + 4. the parent still promises each one, and exactly one child has it
note
covered=0
cov_fails=0
for d in "${DELIVERABLES[@]}"; do
  IFS='|' read -r name rx owner <<< "$d"

  if ! grep -Eq "$rx" <<< "$(row 5b.8-iii)"; then
    echo "FAIL: '$name' is no longer named in the parent 5b.8-iii row — the coverage"
    echo "      claim below would be vacuous for it. Restore it, or re-size deliberately."
    cov_fails=$((cov_fails+1))
    continue
  fi

  hits=""
  for t in 5b.8-iii-a 5b.8-iii-b; do
    grep -Eq "$rx" <<< "$(row "$t")" && hits="$hits $t"
  done
  set -- $hits
  case "$#" in
    0) echo "FAIL: '$name' is in the parent row and in NEITHER child — dropped by the split."
       echo "      ⚠️ THIS SPLIT SHIPS A MIGRATION. A deliverable that falls out here is"
       echo "      not a control nobody builds; it is a function deployed without it,"
       echo "      repaired by a fix-forward migration while the client already calls it."
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
  ok "$covered/$total of 5b.8-iii's deliverables land in exactly one child, the assigned one"
else
  fails=$((fails+1))
  echo "      $covered/$total covered; $cov_fails are not."
fi

# --- 5. the workspace-scoping decision survives -----------------------------
# ⚠️ THE FIRST OF TWO THAT GUARD A DECISION RATHER THAN A DELIVERABLE, and it is
# the one the owner is owed an answer about rather than the other way round.
# `my_workspaces()` returns `setof uuid` and `0001:317` says many-workspaces-per-
# user works from day one. So `set_my_display_name` either takes a workspace id
# and fixes ONE membership row, or takes none and rewrites every row the caller
# owns — a write that crosses the tenant boundary this schema spends all its
# effort not crossing. The scoped form was chosen on the owner's behalf because it
# is the REVERSIBLE direction: a scoped call can later fan out, and an unscoped
# write that has already run cannot be un-run.
#
# It is one parameter in SQL and an argument nothing else holds. Once `0035` is
# applied the signature is a deployed modelling choice, and this is the only place
# in the repository that records WHY it has that shape.
note
ROW_A="$(row 5b.8-iii-a)"
if grep -qF "IT IS WORKSPACE-SCOPED" <<< "$ROW_A"; then
  ok "5b.8-iii-a's row still carries the workspace-scoping decision"
else
  fail "5b.8-iii-a's row no longer says the RPC is workspace-scoped. That is a"
  echo "      decision taken on the owner's behalf, it goes into an APPLIED function"
  echo "      signature under an automated merge, and the unscoped alternative writes"
  echo "      across a tenant boundary. Restore it, or record the owner's ruling that"
  echo "      the fan-out is wanted instead."
fi

# --- 6. the column-not-row refusal survives ---------------------------------
# ⚠️ THE SECOND DECISION, AND IT IS THE TENANCY WALL. The obvious fix for "a
# person cannot edit her own name" is a policy saying she may update her own
# `workspace_member` row. RLS filters ROWS, NOT COLUMNS — the sentence ADR-035
# §2.7 already spends a paragraph on about `cost` — so that policy also lets her
# set her own `role`. The whole reason this task is an RPC and not four lines of
# policy is written in one sentence, in one row, and nowhere else.
note
if grep -qF "RLS FILTERS ROWS, NOT COLUMNS" <<< "$ROW_A"; then
  ok "5b.8-iii-a's row still refuses the own-row policy by name"
else
  fail "5b.8-iii-a's row no longer says RLS filters rows and not columns. Without"
  echo "      that sentence the next session reads 'let a person edit her own row',"
  echo "      writes the policy, and hands every cashier her own role column — the"
  echo "      tenancy wall opened to buy a text field, by an edit that reads as a"
  echo "      courtesy."
fi

# --- 7. the parent is not takeable ------------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what happens when a parent
# stays takeable: a session takes the `L` the split exists to prevent. Here that
# `L` is a migration and a screen in one sitting, which is the two sessions
# `5b.8-i` and `5b.8-ii` each needed on their own.
note
if grep -qiF "no longer takeable" <<< "$(row 5b.8-iii)"; then
  ok "the parent 5b.8-iii row says it is no longer takeable"
else
  fail "the parent 5b.8-iii row does not say it is no longer takeable. A split whose"
  echo "      parent still reads as a task is a split a cleared session walks past —"
  echo "      it takes the L, and this L ships a security definer RPC and a screen"
  echo "      under an automated merge."
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
  echo "all $ran assertion groups passed — 5b.8-iii's $total deliverables have two homes,"
  echo "each child is stated once, the RPC and its suite land in the migration half,"
  echo "the screen half claims no migration, and both decisions are still written down."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the 5b.8-iii split is not safe to take."
exit 1

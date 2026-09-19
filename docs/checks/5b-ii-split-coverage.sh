#!/usr/bin/env bash
# 5b-ii-split-coverage — did the sub-split of 5b-ii lose a deliverable?
#
# WHY THIS EXISTS. `5b-ii` was sized `L` and split in two on 2026-09-18, before a
# line of it was written. A split is a promise that every piece of the parent
# landed in exactly one child; nothing in this repository could check that promise
# except a person reading two tables, and this repository has now recorded THIRTEEN
# stale-copy defects, five of which a person found and no check did.
#
# It is `5b-split-coverage.sh` pointed one level down, and it exists for the same
# reason with one difference worth stating: `5b`'s split had to route THIRTEEN
# deliverables that were already written on the parent row. THREE OF THE EIGHT HERE
# WERE NOT ON ANY ROW AT ALL until the sizing went and looked —
#
#   * the location a `staff` invite must name. `0028:291` raises 22023 without it
#     and the split of 2026-09-14 assigned the picker to the OTHER child, which
#     owns D8 itself. (`N1` in the sizing.)
#   * the density switch and its persistence, deferred onto this sheet by
#     `5a-iii-b` in prose — "the surface that sets it is 5b's Ajustes" — and
#     carried in no deliverable list for six days. (`N2`.)
#   * the roster's manager fence, which is a consequence of `workspace_invite`
#     being readable at `manager` (0002:563) while `workspace_member` is readable
#     by any member (0001:524). (`N3`.)
#
# ⚠️ THAT IS THE ARGUMENT FOR THIS FILE RATHER THAN A PARAGRAPH. A deliverable
# nobody wrote down is not lost by a bad split; it is lost by never having been in
# a list, and the only thing that fixes that is a list something reads.
#
# WHAT IT ASSERTS:
#
#   1. The parent row `5b-ii` and both child rows exist in the build-order table.
#   2. Each child row appears EXACTLY ONCE. ⚠️ `5a-iv`'s sub-split was stated in
#      two tables, a correction landed in one of them, the guard read the other,
#      and for an hour the plan asserted both routings while reporting success.
#   3. The parent still PROMISES each deliverable — otherwise a shrinking parent
#      row makes the coverage claim below vacuous, which is this repository's
#      most-recorded check defect.
#   4. Each deliverable is named by exactly one child, and by the right one.
#   5. The roster's manager fence is still written into the child that renders it.
#      ⚠️ That is a DECISION taken on the owner's behalf, about what a screen
#      renders, and it has no constraint, grant or policy to live in — the same
#      argument that made the 2026-09-14 EMAIL ruling a deliverable rather than a
#      paragraph.
#   6. The parent row is NOT takeable. `4.6a`, `4.6c` and `5b` all had to say so in
#      their own rows once split, and prose is not a gate.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Nothing about whether the split is a GOOD one. It
# cannot see whether `5b-ii-a` is really buildable in one session, and it cannot
# see a membership write appearing in it — only that the row does not CLAIM one.
#
# ⚠️⚠️ NEVER QUOTE THIS CHECK'S SENTINELS VERBATIM IN `docs/PLAN.md`. It reads
# table rows anchored at column 0, which is why prose quoting a row can never
# match. ⚠️ THE RULE WAS BROKEN WHILE THIS SPLIT WAS BEING WRITTEN, FOR THE EIGHTH
# TIME: the new `5b-ii` gate cell named `src/api/` in passing, and
# `5b-split-coverage.sh` went red with "owned by neither" — correctly, within
# seconds, on the sentence that had just been typed. THE SENTENCE WAS CHANGED, NOT
# THE CHECK, which is the cheaper half of the rule and the half that keeps being
# forgotten.
#
# Run:  bash docs/checks/5b-ii-split-coverage.sh
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
# the four older plan checks; a check that runs on one of the two machines that
# matter is not one.
#
# ⚠️ `| grep "^|"` IS LOAD-BEARING. A table row starts at column 0; prose quoting
# one does not — and the sizing section above these rows quotes several.
#
# ⚠️ AND THE `**` IS LOAD-BEARING TOO, in a way it was not one level up. The
# build-order rows are bold (`| **5b-ii-a** |`); the sizing's seam table names the
# same tasks in backticks and no bold (`| `5b-ii-a` | …`). Matching the bold form
# is what keeps assertion 2 counting rows and not prose.
rows_all() { grep -F -e "| **$1** |" -e "| **\`$1\`** |" "$PLAN" | grep "^|"; }
row()      { rows_all "$1" | head -1; }

# --- 1. the three rows exist -----------------------------------------------
note
missing=0
for t in 5b-ii 5b-ii-a 5b-ii-b; do
  if [[ -z "$(row "$t")" ]]; then
    fail "no table row for $t in $PLAN"
    missing=$((missing+1))
  fi
done
if (( missing == 0 )); then
  ok "the parent row and both children of 5b-ii are present"
else
  echo "      A split whose children are not in the build-order table is a split a"
  echo "      cleared session cannot take."
  echo
  echo "$ran group(s) ran, $fails failed."
  exit 1
fi

# --- 2. each child row appears exactly once --------------------------------
note
dupes=0
for t in 5b-ii-a 5b-ii-b; do
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
# ⚠️ THE SEAM IS STATABLE IN ONE LINE AND THE LIST IS HOW IT IS HELD: `5b-ii-a`
# ships NO MEMBERSHIP WRITE. Both RPCs are `5b-ii-b`'s, and so is the only argument
# either of them can be refused for.
DELIVERABLES=(
  "Ajustes — the first non-tab surface|Ajustes|5b-ii-a"
  "C11.7 — the join code and its WhatsApp share|C11\.7|5b-ii-a"
  "member management — the roster|member management|5b-ii-a"
  # ⚠️⚠️ REPLACED 2026-09-18 BY `5b.8-ii`, AND THE OLD WORDING IS WORTH KNOWING.
  # It was "the member row is identified by EMAIL, never a name (ruled
  # 2026-09-14)", and it rested on `T1`: no table in this schema carried a human
  # name, and the owner declined the migration that would add one. `5b.7` and
  # `0034` reversed that, he ruled again, and the sentinel moved WITH the ruling
  # rather than being deleted — a decision about what a screen renders still has
  # no constraint, grant or policy to live in, which is the whole argument for
  # its being here. ⚠️ It moved in the task that put the name ON A SCREEN and not
  # in the one that stored it: a stored column changes nothing a person sees, so
  # retiring it a task early would have left this guard asserting a rule that was
  # neither true nor superseded for as long as that task took.
  "the member row is identified by the NAME on the membership (ruled 2026-09-18)|identified by the NAME|5b-ii-a"
  # ⚠️ N2. Deferred onto this sheet by `5a-iii-b`, which was right to defer it —
  # "persisting it behind a placeholder switch would put the write in the file that
  # gets deleted" — and wrote it nowhere a check could read. Six days homeless.
  "the density switch and its persistence (N2)|density|5b-ii-a"
  "create_invite, and the token shown once|create_invite|5b-ii-b"
  "redeem_invite|redeem_invite|5b-ii-b"
  # ⚠️ N1. `0028:291` refuses a staff invite with no location. It is D8's ARGUMENT
  # and not D8, which is the approval path's and stays there — so this is the one
  # deliverable the 2026-09-14 split put in the wrong child by omission.
  "the location a staff invite must name (N1)|staff invite must name|5b-ii-b"
)

# --- 3. + 4. the parent still promises each one, and exactly one child has it
note
covered=0
cov_fails=0
for d in "${DELIVERABLES[@]}"; do
  IFS='|' read -r name rx owner <<< "$d"

  if ! grep -Eq "$rx" <<< "$(row 5b-ii)"; then
    echo "FAIL: '$name' is no longer named in the parent 5b-ii row — the coverage"
    echo "      claim below would be vacuous for it. Restore it, or re-size deliberately."
    cov_fails=$((cov_fails+1))
    continue
  fi

  hits=""
  for t in 5b-ii-a 5b-ii-b; do
    grep -Eq "$rx" <<< "$(row "$t")" && hits="$hits $t"
  done
  set -- $hits
  case "$#" in
    0) echo "FAIL: '$name' is in the parent row and in NO child — dropped by the split."
       echo "      It ships no migration, so nothing will deploy a mistake; what it"
       echo "      costs is a screen nobody builds, found by the owner during a pilot."
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
  ok "$covered/$total of 5b-ii's deliverables land in exactly one child, the assigned one"
else
  fails=$((fails+1))
  echo "      $covered/$total covered; $cov_fails are not."
fi

# --- 5. the roster's manager fence survives --------------------------------
# ⚠️ THIS IS THE ONE THAT GUARDS A DECISION RATHER THAN A DELIVERABLE, and it is
# here because the sizing measured something the ruling of 2026-09-14 did not
# cover. That ruling said the member row is identified by EMAIL, recovered from
# `workspace_invite`. `workspace_invite_select` is `has_role(workspace_id,
# 'manager')` (0002:563) — its own comment says "staff have no reason to enumerate
# either" — while `workspace_member_select` admits any member of the workspace
# (0001:524). So a STAFF caller could read the roster and identify nobody on it.
#
# ⚠️⚠️ THAT SENTENCE EXPIRED ON 2026-09-18 AND THE FENCE DID NOT. `0034` put a
# name on `workspace_member` and `5b.8-ii` reads it, so a staff roster is now
# perfectly legible — measured, as assertion 9 of
# `docs/checks/5b-ii-a-roster-contract.sh`. What holds the fence up is the half
# of the asymmetry that did not move: this sheet also carries the INVITE button
# (`5b-ii-b`), and a roster a cashier can open is a roster with a control she may
# not use on it. ⚠️ The guard below is unchanged; what it is protecting is not.
#
# The roster is therefore manager-and-above and a staff member is shown the shop
# and their own settings instead, because a list of unidentifiable rows is the app
# rendering an internal state — the thing the owner's own rule refuses to hand a
# shopkeeper. ⚠️ TAKEN ON HIS BEHALF IN THE SIZING AND RULED BY HIM THE SAME DAY
# — "manager-and-above is right", 2026-09-18 — so this assertion protects a
# RULING now and not a session's judgement. The check did not change; what it is
# protecting did.
#
# ⚠️ Nothing else can hold it. There is no column to assert, no policy to read on
# the CLIENT side, and §2.11 bans the rendering suite that would catch the section
# appearing. A session that quietly shows staff the roster has to delete this
# sentence from a plan row to do it.
note
ROW_A="$(row 5b-ii-a)"
if grep -qiF "manager-and-above" <<< "$ROW_A"; then
  ok "the roster is still recorded as manager-and-above in 5b-ii-a's row"
else
  fail "5b-ii-a's row no longer says the roster is manager-and-above. The owner"
  echo "      RULED that on 2026-09-18 — 'manager-and-above is right' — and reversing it"
  echo "      renders a list whose every row but the caller's is blank for a staff"
  echo "      member — workspace_invite is readable at 'manager' (0002:563) and"
  echo "      workspace_member by any member (0001:524). Restore it, or record the"
  echo "      decision to show staff the roster and say what they see on it."
fi

# --- 6. the parent is not takeable -----------------------------------------
# ⚠️ `4.6a`, `4.6c` and `5b` all carry this sentence in their own rows, and
# `plan-handover.sh`'s fixture V4 is the record of what happens when a parent stays
# takeable: a session takes the `L` the split exists to prevent.
note
if grep -qiF "no longer takeable" <<< "$(row 5b-ii)"; then
  ok "the parent 5b-ii row says it is no longer takeable"
else
  fail "the parent 5b-ii row does not say it is no longer takeable. A split whose"
  echo "      parent still reads as a task is a split a cleared session walks past —"
  echo "      it takes the L, which is the one thing the split exists to prevent."
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above is
# conditional, so "0 failures" is also what a run that skipped everything looks
# like — and assertion group 1 exits early by design, which is exactly the shape
# that can leave the rest unrun without anything going red.
if (( fails == 0 && ran < 5 )); then
  echo "FAIL: only $ran assertion groups ran, expected 5 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — 5b-ii's $total deliverables have two homes,"
  echo "each child is stated once, and no membership write is claimed by the read half."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the 5b-ii split is not safe to take."
exit 1

#!/usr/bin/env bash
# 5b-split-coverage — did the split of 5b lose a deliverable?
#
# WHY THIS EXISTS. `5b` was sized `L` and split three ways on 2026-09-14, before a
# line of client code was written. A split is a promise that every piece of the
# parent landed in exactly one child; nothing in this repository could check that
# promise except a person reading two tables, and this repository has now recorded
# ELEVEN stale-copy defects, five of which a person found and no check did.
#
# It is `4.6a-split-coverage.sh` pointed at a client task, and it exists for the
# same reason with one difference worth stating: `4.6a`'s children each shipped an
# APPEND-ONLY MIGRATION, so a lost deliverable there became a deployed one. `5b`'s
# children ship no migration at all. What a lost deliverable costs here is a screen
# nobody builds — C11.7's share button, or C11.8's badge — noticed by the owner,
# during a pilot, on his own phone.
#
# WHAT IT ASSERTS:
#
#   1. The parent row and all three child rows exist in the build-order table.
#   2. Each child row appears EXACTLY ONCE. ⚠️ This is the one aimed at this
#      repository's own history: `5a-iv`'s sub-split was stated in two tables, a
#      correction landed in one of them, the guard read the other, and for an hour
#      the plan asserted both routings while reporting success.
#   3. The parent still PROMISES each deliverable — otherwise a shrinking parent
#      row makes the coverage claim below vacuous, which is how a check stops
#      measuring its own claim.
#   4. Each deliverable is named by exactly one child, and by the right one.
#   5. `5b.5` gates on `5b-i` and not on all of `5b`. ⚠️ That was a decision taken
#      on the owner's behalf in the sizing and it is the only part of the split
#      that changes something he had already ruled on — so it is held by a check
#      rather than by the paragraph that records it.
#   6. The parent row is NOT takeable. `4.6a` and `4.6c` both had to say so in
#      their own rows once split, and prose is not a gate.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Nothing about whether the split is a GOOD one. It
# cannot tell a sensible seam from a foolish one — only that nothing the parent
# promises has fallen between two children that each assume the other has it.
#
# ⚠️⚠️ NEVER QUOTE THIS CHECK'S SENTINELS VERBATIM IN `docs/PLAN.md`. It reads
# table rows anchored at column 0, which is why prose quoting a row can never
# match — the rule four guards in this repository learned on one day in September,
# and the rule that stopped `plan-handover.sh` reading its own falsification table.
#
# Run:  bash docs/checks/5b-split-coverage.sh
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
# the three older plan checks; a check that runs on one of the two machines that
# matter is not one.
#
# ⚠️ `| grep "^|"` IS LOAD-BEARING. A table row starts at column 0; prose quoting
# one does not.
rows_all() { grep -F -e "| **$1** |" -e "| **\`$1\`** |" "$PLAN" | grep "^|"; }
row()      { rows_all "$1" | head -1; }

# --- 1. the four rows exist ------------------------------------------------
note
missing=0
for t in 5b 5b-i 5b-ii 5b-iii; do
  if [[ -z "$(row "$t")" ]]; then
    fail "no table row for $t in $PLAN"
    missing=$((missing+1))
  fi
done
if (( missing == 0 )); then
  ok "the parent row and all three children of 5b are present"
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
for t in 5b-i 5b-ii 5b-iii; do
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
# PLAN's wording as much as on this list: a child row that mentions a neighbour's
# RPC in passing turns this red. That is deliberate. A row describing work it does
# not do is how `4.6b`'s scope disagreed with `4.5c-ii`'s for four days.
#
# The two constraint numbers are recognised by their own labels, because that is
# how the grill-me record and ADR-035 both name them — so this compares the split
# against the requirement rather than against a paraphrase written beside it.
DELIVERABLES=(
  "onboard_workspace — the shop is created|onboard_workspace|5b-i"
  "C1.7 — the IVA question, asked once and wrong for ever|C1\.7|5b-i"
  "the no-workspace landing|no-workspace landing|5b-i"
  "src/api/ — the app's first data layer|src/api/|5b-i"
  "Ajustes — the first non-tab surface|Ajustes|5b-ii"
  "C11.7 — the join code and its WhatsApp share|C11\.7|5b-ii"
  "member management|member management|5b-ii"
  "create_invite|create_invite|5b-ii"
  "redeem_invite|redeem_invite|5b-ii"
  "request_access — the joiner types the code|request_access|5b-iii"
  "my_access_requests — the joiner's pending state (S3)|my_access_requests|5b-iii"
  "approve_request, and the location picker D8 refuses to leave empty|approve_request|5b-iii"
  "C11.8 — the Home notifications icon and its badge|C11\.8|5b-iii"
)

# --- 3. + 4. the parent still promises each one, and exactly one child has it
note
covered=0
cov_fails=0
for d in "${DELIVERABLES[@]}"; do
  IFS='|' read -r name rx owner <<< "$d"

  if ! grep -Eq "$rx" <<< "$(row 5b)"; then
    echo "FAIL: '$name' is no longer named in the parent 5b row — the coverage claim"
    echo "      below would be vacuous for it. Restore it, or re-size deliberately."
    cov_fails=$((cov_fails+1))
    continue
  fi

  hits=""
  for t in 5b-i 5b-ii 5b-iii; do
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
  ok "$covered/$total of 5b's deliverables land in exactly one child, the assigned one"
else
  fails=$((fails+1))
  echo "      $covered/$total covered; $cov_fails are not."
fi

# --- 5. 5b.5 gates on the child that creates the pattern -------------------
# ⚠️ THIS IS THE ONE THAT GUARDS A DECISION RATHER THAN A DELIVERABLE, and it is
# here because the sizing changed something the owner had already ruled on. His
# ruling of 2026-09-13 was that the conventions second pass happens "once 5b has
# produced a real one"; the split re-pointed it at `5b-i`, which is the child that
# actually produces it. That is an upholding and not a bend — but it is the kind of
# re-reading a later session could quietly undo, so it is held by a check.
note
ROW_5B5="$(row 5b.5)"
if [[ -z "$ROW_5B5" ]]; then
  fail "no 5b.5 row at all. conventions-gate.sh needs it and so does the deferral"
  echo "      written into docs/CONVENTIONS.md and ADR-035 §3."
elif grep -qF '`5b-i` closing' <<< "$ROW_5B5" || grep -qF '5b-i' <<< "$ROW_5B5"; then
  ok "5b.5 gates on 5b-i — the child that creates src/api/, not the whole of 5b"
else
  fail "5b.5 no longer gates on 5b-i. The split re-pointed it there because 5b-i is"
  echo "      the task that CREATES src/api/ and the other two are its first"
  echo "      consumers; gating on all of 5b means the pattern is written after three"
  echo "      screens have each invented their own. Re-point it, or record the"
  echo "      decision to move it back."
fi

# --- 6. the parent is not takeable -----------------------------------------
# ⚠️ `4.6a` and `4.6c` both carry this sentence in their own rows, and `plan-
# handover.sh`'s fixture V4 is the record of what happens when a parent stays
# takeable: a session takes the `L` the split exists to prevent.
note
if grep -qiF "no longer takeable" <<< "$(row 5b)"; then
  ok "the parent 5b row says it is no longer takeable"
else
  fail "the parent 5b row does not say it is no longer takeable. A split whose"
  echo "      parent still reads as a task is a split a cleared session walks past —"
  echo "      it takes the L, which is the one thing the split exists to prevent."
fi

echo
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — 5b's $total deliverables have three homes,"
  echo "each child is stated once, and 5b.5 points at the one that builds the pattern."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the 5b split is not safe to take."
exit 1

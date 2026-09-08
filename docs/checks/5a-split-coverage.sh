#!/usr/bin/env bash
# 5a-split-coverage — did the four-way split of `5a` lose anything?
#
# WHY THIS EXISTS. `5a` was sized `L` and split into `5a-i`–`5a-iv` on 2026-09-07,
# before any app code was written. A split is the cheapest place in this project to
# lose a deliverable: the parent row stays in the file looking complete, the four
# child rows look complete individually, and the one line that fell between them is
# invisible until a screen needs it. Nothing else in this repository reads
# `docs/PLAN.md`, so nothing else would notice.
#
# WHAT IT ASSERTS, and it is deliberately not "the file mentions 5a-i":
#   1. All four sub-task rows exist in the sizing table.
#   2. Each of `5a`'s TEN deliverables matches EXACTLY ONE sub-task row — not zero
#      (dropped) and not two (split in half, owned by neither).
#   3. That one row is the one this split assigned it to.
#   4. The parent `5a` row still names all ten, so an edit that quietly shrinks the
#      parent turns this red rather than making the coverage claim trivially true.
#
# ⚠️ `app.yml` is recognised by its FULL PATH, not by the bare filename. `5a-ii`
# refers to *"app.yml's test half"* without owning the file, and the bare name made
# rule 2 fire on a reference. The rule is right and the recogniser was wrong: the
# deliverable is the file at `.github/workflows/app.yml`, which is how the parent row
# names it too.
#
# Run:  bash docs/checks/5a-split-coverage.sh
# Exit: 0 all eleven covered; 1 otherwise, naming each failure.

set -uo pipefail

PLAN="${1:-docs/PLAN.md}"
[[ -r "$PLAN" ]] || { echo "FAIL: cannot read $PLAN"; exit 1; }

# The four sub-task rows, and the parent row, pulled out of the sizing table.
#
# ⚠️ No associative arrays: macOS ships bash 3.2 and this has to run on the owner's
# Mac as well as on ubuntu-latest. The first spelling used `declare -A`, which failed
# on the development machine — loudly, and in the right direction, but a check that
# only runs on one of the two machines that matter is not one.
row() { grep -m1 -F "| **$1** |" "$PLAN"; }

for t in 5a 5a-i 5a-ii 5a-iii 5a-iv; do
  if [[ -z "$(row "$t")" ]]; then
    echo "FAIL: no table row for $t in $PLAN"
    exit 1
  fi
done

# deliverable | regex it is recognised by | the sub-task that owns it
#
# The regexes match the PARENT row's wording where possible, so the check is
# comparing the split against what `5a` actually promised rather than against a
# paraphrase written at the same time as the split.
DELIVERABLES=(
  "Expo project|Expo project|5a-i"
  "both platforms|iOS and Android|5a-i"
  "app.yml workflow|\.github/workflows/app\.yml|5a-i"
  "workspace entry|workspace|5a-i"
  "density scale (C3.18)|C3\.18|5a-ii"
  "money formatting (C12.2)|C12\.2|5a-ii"
  "icons-plus-words nav (C12.1)|C12\.1|5a-ii"
  "OAuth, no phone auth (C1.4)|C1\.4|5a-iii"
  "last-screen restore (C1.3)|C1\.3|5a-iii"
  "local device run (C1.6)|C1\.6|5a-iv"
)
#
# ⚠️ TEN, NOT ELEVEN, AND THE FIRST DRAFT OF THIS LIST HAD BOTH. It carried "both
# platforms (C1.1)" and "the pilot devices (C1.1)" as separate deliverables; the
# parent row names C1.1 exactly once, for *"Expo project for iOS and Android"*. Rule 2
# is what found it — the duplicate matched two sub-tasks, which is indistinguishable
# from a deliverable that fell between them until you look. A miscount that inflates
# the denominator makes a coverage claim look better than it is.

fails=0
covered=0

for d in "${DELIVERABLES[@]}"; do
  IFS='|' read -r name rx owner <<< "$d"

  # (4) the parent must still promise it
  if ! grep -Eq "$rx" <<< "$(row 5a)"; then
    echo "FAIL: '$name' is no longer named in the parent 5a row — the split's coverage"
    echo "      claim would be vacuous for it. Restore it or re-size deliberately."
    fails=$((fails+1))
    continue
  fi

  # (2)+(3) exactly one sub-task, and the right one
  hits=()
  for t in 5a-i 5a-ii 5a-iii 5a-iv; do
    grep -Eq "$rx" <<< "$(row "$t")" && hits+=("$t")
  done

  case "${#hits[@]}" in
    0) echo "FAIL: '$name' is in 5a and in NO sub-task — dropped by the split"
       fails=$((fails+1)) ;;
    1) if [[ "${hits[0]}" != "$owner" ]]; then
         echo "FAIL: '$name' landed in ${hits[0]}, this split assigned it to $owner"
         fails=$((fails+1))
       else
         covered=$((covered+1))
       fi ;;
    *) echo "FAIL: '$name' appears in ${hits[*]} — owned by neither, which is how a"
       echo "      deliverable falls between two tasks that each assume the other has it"
       fails=$((fails+1)) ;;
  esac
done

total=${#DELIVERABLES[@]}
if (( fails > 0 )); then
  echo
  echo "$covered/$total of 5a's deliverables are covered by exactly one sub-task; $fails are not."
  exit 1
fi

echo "$covered/$total of 5a's deliverables covered by exactly one sub-task each, as assigned."

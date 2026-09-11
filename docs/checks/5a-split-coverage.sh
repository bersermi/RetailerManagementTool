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
#   5.-8. That Facebook's deferral to `5i` (2026-09-11) is recorded, gated, and
#      claimed by no `5a` sub-task. See the block at the foot of this file for
#      why the ten-deliverable loop above cannot see that on its own.
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

# ---------------------------------------------------------------------------
# THE FACEBOOK DEFERRAL — added 2026-09-11, and it exists because the loop above
# CANNOT SEE IT.
#
# ⚠️⚠️ `C1.4` NAMES THREE PROVIDERS AND THE CHECK COUNTED IT AS ONE ATOM. When
# Facebook was deferred out of `5a-iii` to `5i`, the regex `C1\.4` still matched
# the parent row and still matched exactly one sub-task — so this file printed
# 10/10 while a third of a deliverable had changed tasks. That is the precise
# failure it was written to catch, in the one form its own granularity hid:
# A DELIVERABLE THAT IS A LIST IS ONLY AS VISIBLE AS ITS COARSEST NAME.
#
# So the deferral itself is now the thing asserted. Not "Facebook is mentioned
# somewhere" — four separate claims, each of which is how this goes wrong:
#   5. `5i` exists as a table row and names Facebook.
#   6. `5i` carries a real gate, not an em-dash. A deferred task with no gate is
#      a task nobody is waiting on, which is how "later" becomes "never".
#   7. NO `5a-*` sub-task names Facebook — otherwise it has been quietly folded
#      back in and two tasks each think the other has it.
#   8. The parent `5a` row still RECORDS the move. `5a` promised Facebook; an
#      edit that deletes the promise instead of recording where it went makes
#      the coverage claim true by forgetting, which is fixture F4's lesson.

fb_fails=0

# ⚠️ THE DELIVERABLE CELL, NOT THE WHOLE ROW — falsification G5. `5i`'s GATE
# legitimately says "Facebook Live mode", so grepping the row for "Facebook"
# stayed green on a fixture that renamed the task itself away from Facebook:
# the word survived in a cell that is about what BLOCKS the task, not what it
# IS. A row is not one string, and asserting over the wrong cell is how a check
# passes while measuring something adjacent to its claim.
fb_what="$(row 5i | awk -F'|' '{print $3}')"
if ! grep -Eq "Facebook" <<< "$fb_what"; then
  echo "FAIL: no table row for 5i whose DELIVERABLE is Facebook — the deferral"
  echo "      has no home (its gate mentioning Facebook is not the same claim)"
  fb_fails=$((fb_fails+1))
else
  # The gate is the LAST pipe-delimited cell of the row.
  gate="$(row 5i | awk -F'|' '{print $(NF-1)}' | sed 's/^ *//; s/ *$//')"
  if [[ -z "$gate" || "$gate" == "—" || "$gate" == "-" ]]; then
    echo "FAIL: 5i has no gate. A deferred task nobody is waiting on is how"
    echo "      'later' becomes 'never' — name what unblocks it."
    fb_fails=$((fb_fails+1))
  fi
fi

for t in 5a-i 5a-ii 5a-iii 5a-iv; do
  if grep -Eq "Facebook" <<< "$(row "$t")"; then
    # Being named as EXPLICITLY deferred is the one allowed mention.
    if ! grep -Eq "FACEBOOK DEFERRED|Facebook deferred" <<< "$(row "$t")"; then
      echo "FAIL: $t names Facebook, which was deferred to 5i on 2026-09-11."
      echo "      Either it has been folded back in without re-sizing, or two"
      echo "      tasks now each assume the other owns it."
      fb_fails=$((fb_fails+1))
    fi
  fi
done

if ! grep -Eq "Facebook" <<< "$(row 5a)"; then
  echo "FAIL: the parent 5a row no longer mentions Facebook at all. 5a PROMISED"
  echo "      it; record where it went (5i) rather than deleting the promise —"
  echo "      a coverage claim made true by forgetting is fixture F4's lesson."
  fb_fails=$((fb_fails+1))
fi

# ---------------------------------------------------------------------------
# THE `5a-iii` SUB-SPLIT — added 2026-09-11, the SAME DAY the Facebook finding
# showed why it is needed.
#
# ⚠️ `5a-iii` was split into `5a-iii-a` / `5a-iii-b`, and the ten-deliverable
# loop above scans only `5a-i`..`5a-iv`. So C1.3 and C1.4 are matched against
# the PARENT `5a-iii` row and nothing looks at which half actually carries
# them — which means moving last-screen restore into `5a-iv`, or email sign-in
# out of `5a-iii-a`, leaves this file GREEN.
#
# That is precisely the shape found hours earlier with C1.4 and Facebook: A
# DELIVERABLE IS ONLY AS VISIBLE AS THE COARSEST ROW THAT NAMES IT. Writing
# that down and then not applying it one level down would be the same defect
# with better documentation. Fixture F2 already pins C1.3 to `5a-iii` rather
# than `5a-iv`; these pin it to the half of `5a-iii` that owns it.

sub_fails=0

for t in 5a-iii-a 5a-iii-b; do
  if [[ -z "$(row "$t")" ]]; then
    echo "FAIL: no table row for $t — 5a-iii was split in two on 2026-09-11"
    sub_fails=$((sub_fails+1))
  fi
done

if (( sub_fails == 0 )); then
  # C1.4's sign-in belongs to the half with no deep link; C1.3's restore to the
  # half that owns navigation. Each in exactly one, for rule 2's reason.
  for pair in "C1\.4:5a-iii-a:5a-iii-b" "C1\.3:5a-iii-b:5a-iii-a"; do
    rx="${pair%%:*}"; rest="${pair#*:}"; owner="${rest%%:*}"; other="${rest#*:}"
    if ! grep -Eq "$rx" <<< "$(row "$owner")"; then
      echo "FAIL: ${rx//\\/} is not in $owner, which this split assigned it to."
      echo "      The parent 5a-iii row still naming it is NOT the same claim."
      sub_fails=$((sub_fails+1))
    fi
    if grep -Eq "$rx" <<< "$(row "$other")"; then
      echo "FAIL: ${rx//\\/} appears in $other as well — owned by neither half"
      sub_fails=$((sub_fails+1))
    fi
  done
fi

if (( sub_fails > 0 )); then
  echo
  echo "The 5a-iii sub-split does not hold. Re-size deliberately rather than editing a row."
  exit 1
fi

# ---------------------------------------------------------------------------
# THE `5a-iv` SUB-SPLIT — added 2026-09-11, when `5a-iv` was re-sized from `S/M`
# to `L` and split four ways.
#
# ⚠️ IT ASSERTS OVER THE READINGS BY NAME, NOT OVER `C1\.4`, AND THAT IS THE
# WHOLE DESIGN. C1.4 is BUILT in 5a-iii-a, EXTENDED in 5a-iii-b, DEFERRED IN
# PART to 5i, and READ in 5a-iv-d — four tasks, one identifier. This repository
# has already been bitten twice by exactly that: C1.4-and-Facebook, where the
# loop above printed 10/10 across an edit that moved a third of a deliverable;
# and C1.3 in the 5a-iii sub-split, where the PARENT row's mention satisfied a
# claim about the halves. A DELIVERABLE THAT IS A LIST IS ONLY AS VISIBLE AS ITS
# COARSEST NAME. So the unit here is the thing someone would actually move —
# "the allow-list", "the interstitial", "the eight-day reading".

iv_fails=0

for t in 5a-iv-a 5a-iv-b 5a-iv-c 5a-iv-d; do
  if [[ -z "$(row "$t")" ]]; then
    echo "FAIL: no table row for $t — 5a-iv was split four ways on 2026-09-11"
    iv_fails=$((iv_fails+1))
  fi
done

if (( iv_fails == 0 )); then
  # reading | regex | the sub-task that owns it
  READINGS=(
    "C12.1's words drawn|C12\.1|5a-iv-a"
    "C3.18's numbers judged|C3\.18|5a-iv-a"
    "the guard actually redirects|guard|5a-iv-a"
    "the Supabase redirect allow-list|allow-list|5a-iv-a"
    "Google's unverified-app interstitial|interstitial|5a-iv-a"
    "C1.4's eight-day reading|eight-day reading|5a-iv-d"
    "the local device build (C1.6)|C1\.6|5a-iv-a"
    "CONVENTIONS.md|CONVENTIONS\.md|5a-iv-b"
  )
  for r in "${READINGS[@]}"; do
    IFS='|' read -r rname rrx rowner <<< "$r"
    rhits=()
    for t in 5a-iv-a 5a-iv-b 5a-iv-c 5a-iv-d; do
      grep -Eq "$rrx" <<< "$(row "$t")" && rhits+=("$t")
    done
    case "${#rhits[@]}" in
      0) echo "FAIL: '$rname' is owned by no half of 5a-iv — the one category of"
         echo "      claim this project has no machine for, and nobody is holding it"
         iv_fails=$((iv_fails+1)) ;;
      1) [[ "${rhits[0]}" == "$rowner" ]] || {
           echo "FAIL: '$rname' landed in ${rhits[0]}, this split assigned it to $rowner"
           iv_fails=$((iv_fails+1)); } ;;
      *) echo "FAIL: '$rname' appears in ${rhits[*]} — owned by neither"
         iv_fails=$((iv_fails+1)) ;;
    esac
  done

  # ⚠️⚠️ THE LOAD-BEARING ONE, AND IT IS THE REASON THE SPLIT EXISTS.
  # `5a-iv-d` is gated on a CALENDAR, and the sizing moved it onto ANDROID
  # (5a-iv-c) on purpose: a free Apple ID signs an iPhone build with a 7-day
  # provisioning profile, Google expires test-user tokens at 7 days, and the
  # reading is at day 8 — so on iOS a failure has three candidate causes and no
  # way to tell them apart. A later session "tidying" this back onto 5a-iv-a
  # looks like fixing an inconsistency and silently restores the confound.
  iv_gate="$(row 5a-iv-d | awk -F'|' '{print $(NF-1)}')"
  if [[ -z "${iv_gate//[[:space:]]/}" || "${iv_gate//[[:space:]]/}" == "—" ]]; then
    echo "FAIL: 5a-iv-d has no gate. It is the only task in this project gated on a"
    echo "      DATE rather than a task — unnamed, it is the one that never happens."
    iv_fails=$((iv_fails+1))
  elif ! grep -Eq "5a-iv-c" <<< "$iv_gate"; then
    echo "FAIL: 5a-iv-d's gate does not name 5a-iv-c. The eight-day reading was moved"
    echo "      onto ANDROID so that ONE 7-day clock is live instead of two; putting it"
    echo "      back on the iPhone build makes a failed reading uninterpretable."
    iv_fails=$((iv_fails+1))
  fi
fi

if (( iv_fails > 0 )); then
  echo
  echo "The 5a-iv sub-split does not hold. Re-size deliberately rather than editing a row."
  exit 1
fi

if (( fb_fails > 0 )); then
  echo
  echo "$covered/$total deliverables covered, but the Facebook deferral is not recorded correctly."
  exit 1
fi

echo "$covered/$total of 5a's deliverables covered by exactly one sub-task each, as assigned."
echo "Facebook's deferral to 5i is recorded, gated, and claimed by no 5a sub-task."
echo "5a-iii's two halves exist, and C1.4 and C1.3 each sit in exactly one of them."
echo "5a-iv's four parts exist; six readings each have one owner, and the eight-day one"
echo "  is gated on 5a-iv-c so that only one 7-day clock is live."

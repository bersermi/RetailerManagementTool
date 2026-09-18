#!/usr/bin/env bash
# 5b-ii-b-split-coverage — did the sub-sub-split of 5b-ii-b lose a deliverable?
#
# WHY THIS EXISTS. `5b-ii-b` was sized `L` and split in two on 2026-09-18, before a
# line of it was written, and this is the THIRD generation of the same guard:
# `5b-split-coverage.sh` watches `5b`'s three children, `5b-ii-split-coverage.sh`
# watches `5b-ii`'s two, and this watches `5b-ii-b`'s two. A split is a promise
# that every piece of the parent landed in exactly one child, and nothing in this
# repository can check that promise except a person reading two table rows.
#
# ⚠️⚠️ AND THE ARGUMENT FOR A THIRD ONE IS WRITTEN IN THE SECOND ONE'S OWN
# FINDINGS. `N1` — the location a staff invite must name — was recorded on
# 2026-09-18 with the sentence *"and a `location` read the app does not have"*
# sitting inside it. That read never became a deliverable, a row, or a line any
# check could see; it was a deliverable inside a paragraph, which is the defect
# this repository has now recorded fourteen times. **It is `P1` in this sizing,
# and this file is where it stops being prose.**
#
# THE FOUR THINGS THE SIZING FOUND, and three of them were on no row:
#
#   * `P1` the `location_select` read behind the picker. Nothing under `app/src/`
#     selects from `location`; and the policy is `id in (select my_locations())`
#     (0001:506) — scoped by LOCATION, not by workspace like every other read
#     this app performs.
#   * `P2` an invite token is SIXTEEN characters of the same Crockford alphabet as
#     the eight-character join code, normalised by the same
#     `normalize_workspace_code` — so only length tells them apart, and the
#     landing screen has to carry both.
#   * `P3` `create_invite` answers `replaced_pending` / `superseded_count`, which
#     say a code somebody is holding has just been killed (0028 decision 6).
#   * `P4` the token's `expires_at` has to be rendered and `app/src/format/` holds
#     `mxn.ts` and nothing else.
#
# WHAT IT ASSERTS:
#
#   1. The parent row `5b-ii-b` and both child rows exist in the build-order table.
#   2. Each child row appears EXACTLY ONCE. ⚠️ `5a-iv`'s sub-split was stated in
#      two tables, a correction landed in one of them, the guard read the other,
#      and for an hour the plan asserted both routings while reporting success.
#   3. The parent still PROMISES each deliverable — otherwise a shrinking parent
#      row makes the coverage claim below vacuous, which is this repository's
#      most-recorded check defect.
#   4. Each deliverable is named by exactly one child, and by the right one.
#   5. `P2`'s answer — the two credentials are told apart by LENGTH — is still
#      written into the child that renders the box. ⚠️ That is a DECISION taken on
#      the owner's behalf about what a screen does, and it has no constraint,
#      grant or policy to live in: the same argument that made the roster's
#      manager fence a deliverable one level up.
#   6. The parent row is NOT takeable. `4.6a`, `4.6c`, `5b` and `5b-ii` all had to
#      say so in their own rows once split, and prose is not a gate.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Nothing about whether the split is a GOOD one. It
# cannot see whether `5b-ii-b-1` is buildable in one session, and it cannot see a
# redemption appearing in it — only that the row does not CLAIM one. ⚠️ AND IT
# CANNOT SEE `P1` AT ALL: that is a claim about a policy and a live database, and
# the instrument for it is the contract check `5b-ii-b-1` ships, the same division
# `5b-i` drew and `5b.7` repeated.
#
# ⚠️⚠️ NEVER QUOTE THIS CHECK'S SENTINELS VERBATIM IN `docs/PLAN.md`. It reads
# table rows anchored at column 0, which is why prose quoting a row can never
# match — and the sizing section above these rows quotes several. ⚠️ THE SISTER
# RULE, learned by `plan-handover.sh` the hard way on 2026-09-13: A CHECK MUST
# BOUND THE REGION IT READS, NOT TRUST THE NEXT HEADING. This one bounds itself
# by matching bold task names at column 0 and nothing else.
#
# Run:  bash docs/checks/5b-ii-b-split-coverage.sh
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
# the five older plan checks; a check that runs on one of the two machines that
# matter is not one.
#
# ⚠️ `| grep "^|"` IS LOAD-BEARING. A table row starts at column 0; prose quoting
# one does not — and the sizing section quotes several of these rows.
#
# ⚠️ AND THE `**` IS LOAD-BEARING. The build-order rows are bold
# (`| **5b-ii-b-1** |`); the sizing's seam table names the same tasks in backticks
# and no bold (`| `5b-ii-b-1` | …`). Matching the bold form is what keeps
# assertion 2 counting rows and not prose.
#
# ⚠️⚠️ AND THE TRAILING ` |` IS WHAT KEEPS THE GENERATIONS APART. `| **5b-ii-b** |`
# must not match `| **5b-ii-b-1** | …`, or the parent and its child become one row
# and assertion 2 reports three copies of a row stated once. `grep -F` on the
# whole cell including its closing pipe is what separates them, and it is the
# reason the older `5b-ii` guard is unaffected by these two new rows existing.
rows_all() { grep -F -e "| **$1** |" -e "| **\`$1\`** |" "$PLAN" | grep "^|"; }
row()      { rows_all "$1" | head -1; }

# --- 1. the three rows exist -----------------------------------------------
note
missing=0
for t in 5b-ii-b 5b-ii-b-1 5b-ii-b-2; do
  if [[ -z "$(row "$t")" ]]; then
    fail "no table row for $t in $PLAN"
    missing=$((missing+1))
  fi
done
if (( missing == 0 )); then
  ok "the parent row and both children of 5b-ii-b are present"
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
for t in 5b-ii-b-1 5b-ii-b-2; do
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
# ⚠️ THE SEAM IS STATABLE IN ONE LINE AND THE LIST IS HOW IT IS HELD: `5b-ii-b-1`
# ships NO REDEMPTION, and every argument either RPC can be refused for on the
# PUSH side is its own.
DELIVERABLES=(
  "create_invite, and its four arguments|create_invite|5b-ii-b-1"
  "the token shown once and stored only as a hash|shown once|5b-ii-b-1"
  # ⚠️ N1, inherited. `0028:291` raises 22023 without it, and the split of
  # 2026-09-14 had assigned the picker to the child that owns D8 itself.
  "the location a staff invite must name (N1)|staff invite must name|5b-ii-b-1"
  # ⚠️ P1. Named inside N1's prose on 2026-09-18 and never made a deliverable.
  "the location_select read behind the picker (P1)|location_select|5b-ii-b-1"
  # ⚠️ P3. 0028 decision 6 replaces a live pending invite deliberately, so the
  # code somebody is already holding stops working and nothing says so.
  "what a replaced code costs the person holding it (P3)|replaced_pending|5b-ii-b-1"
  # ⚠️ P4. app/src/format/ holds mxn.ts and nothing else.
  "the date formatter the expiry needs (P4)|date formatter|5b-ii-b-1"
  "redeem_invite|redeem_invite|5b-ii-b-2"
  # ⚠️ P2. Sixteen characters against the join code's eight, same alphabet, same
  # normaliser — so the landing screen's one box decides by length.
  "an invite token is sixteen characters, not eight (P2)|sixteen characters|5b-ii-b-2"
)

# --- 3. + 4. the parent still promises each one, and exactly one child has it
note
covered=0
cov_fails=0
for d in "${DELIVERABLES[@]}"; do
  IFS='|' read -r name rx owner <<< "$d"

  if ! grep -Eq "$rx" <<< "$(row 5b-ii-b)"; then
    echo "FAIL: '$name' is no longer named in the parent 5b-ii-b row — the coverage"
    echo "      claim below would be vacuous for it. Restore it, or re-size deliberately."
    cov_fails=$((cov_fails+1))
    continue
  fi

  hits=""
  for t in 5b-ii-b-1 5b-ii-b-2; do
    grep -Eq "$rx" <<< "$(row "$t")" && hits="$hits $t"
  done
  set -- $hits
  case "$#" in
    0) echo "FAIL: '$name' is in the parent row and in NO child — dropped by the split."
       echo "      It ships no migration, so nothing will deploy a mistake; what it"
       echo "      costs is a control nobody builds, found by the owner during a pilot."
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
  ok "$covered/$total of 5b-ii-b's deliverables land in exactly one child, the assigned one"
else
  fails=$((fails+1))
  echo "      $covered/$total covered; $cov_fails are not."
fi

# --- 5. the length rule survives -------------------------------------------
# ⚠️ THIS IS THE ONE THAT GUARDS A DECISION RATHER THAN A DELIVERABLE, and it is
# here for the reason the roster's manager fence is one level up: it is a decision
# about what a SCREEN does, taken on the owner's behalf, with nothing in the
# schema to hold it and §2.11 banning the rendering suite that would catch its
# removal.
#
# `generate_invite_token` (0028) draws SIXTEEN characters from the join code's own
# alphabet — its comment says so in terms, "the same alphabet as the join code
# (D5)" — and `hash_invite_token` normalises through `normalize_workspace_code`,
# the join code's own normaliser. So a token and a code are indistinguishable
# except by LENGTH, and the landing screen has to take both: this task's token,
# and `5b-iii`'s code.
#
# The decision is ONE box that decides by length, because two labelled boxes ask
# a shopkeeper which KIND of credential she was sent and she cannot know — the
# sender typed it into WhatsApp with no label on it. A session that quietly builds
# two boxes has to delete this sentence from a plan row to do it.
note
ROW_B2="$(row 5b-ii-b-2)"
if grep -qF "except by LENGTH" <<< "$ROW_B2"; then
  ok "5b-ii-b-2's row still says the two credentials are told apart by length"
else
  fail "5b-ii-b-2's row no longer says the token and the join code are told apart"
  echo "      by LENGTH. Sixteen characters against eight, the same alphabet and the"
  echo "      same normaliser (0028's generate_invite_token, 0027's"
  echo "      normalize_workspace_code) — so one box can decide and two boxes would"
  echo "      ask a shopkeeper which kind of code she was sent, which she cannot know."
  echo "      Restore it, or record the decision to ask her and say how."
fi

# --- 6. the parent is not takeable -----------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what happens when a parent
# stays takeable: a session takes the `L` the split exists to prevent.
note
if grep -qiF "no longer takeable" <<< "$(row 5b-ii-b)"; then
  ok "the parent 5b-ii-b row says it is no longer takeable"
else
  fail "the parent 5b-ii-b row does not say it is no longer takeable. A split whose"
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
  echo "all $ran assertion groups passed — 5b-ii-b's $total deliverables have two homes,"
  echo "each child is stated once, and no redemption is claimed by the push half."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the 5b-ii-b split is not safe to take."
exit 1

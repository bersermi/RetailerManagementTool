#!/usr/bin/env bash
# 5b-iii-split-coverage — did the split of 5b-iii lose a deliverable?
#
# WHY THIS EXISTS. `5b-iii` was sized `XL` and split FOUR ways on 2026-09-19,
# before a line of it was written, and this is the SIXTH generation of the same
# guard: `5b-split-coverage.sh` watches `5b`'s three children,
# `5b-ii-split-coverage.sh` watches `5b-ii`'s two, `5b-ii-b-split-coverage.sh`
# watches `5b-ii-b`'s two, `5b.8-split-coverage.sh` watches `5b.8`'s three,
# `5b.8-iii-split-coverage.sh` watches `5b.8-iii`'s two, and this watches the
# FOUR under `5b-iii`. A split is a promise that every piece of the parent landed
# in exactly one child, and nothing in this repository can check that promise
# except a person reading five table rows.
#
# ⚠️⚠️ AND THIS ONE GUARDS TWO MIGRATIONS — THE FIRST SPLIT GUARD HERE THAT DOES.
# `5b-iii-a` mints two application SQLSTATEs; `5b-iii-c` writes a `security
# definer` read over `auth.users` metadata. Merging is automated, so a deliverable
# that falls out of this split is not a reviewable mistake — it is a deployed one,
# and the repair is a fix-forward migration over a function the client already
# calls.
#
# ⚠️⚠️ THE GATE CELL PREDICTED THE RE-SIZE AND WAS RIGHT, TWICE OVER. `5b-iii`'s
# right-hand cell has said "RE-SIZE IT ON THE DAY IT IS TAKEN — IT GREW ON
# 2026-09-18 AND AGAIN ON 2026-09-19, BOTH TIMES BEFORE IT WAS TAKEN" since the
# day of the second growth. It was taken on 2026-09-19 and it arrived bigger than
# both readings: the `M/L` in that row predates BOTH of the rulings now inside it.
#
# THE SEAM, STATABLE IN ONE LINE: `a` and `c` ship a migration each and NO SCREEN,
# so every claim in them is falsifiable with no client in the room; `b` and `d`
# ship a screen each and NO MIGRATION. Two database children and two client
# children, alternating. That is the same seam `5b.8` and `5b.8-iii` were split
# on, which is the argument for reusing it rather than inventing one.
#
# WHAT IT ASSERTS:
#
#   1. The parent row `5b-iii` and all four child rows exist in the build-order
#      table.
#   2. Each child row appears EXACTLY ONCE. ⚠️ `5a-iv`'s sub-split was stated in
#      two tables, a correction landed in one of them, the guard read the other,
#      and for an hour the plan asserted both routings while reporting success.
#   3. The parent still PROMISES each of the twelve deliverables — otherwise a
#      shrinking parent row makes the coverage claim below vacuous, which is this
#      repository's most-recorded check defect.
#   4. Each deliverable is named by exactly one child, and by the right one.
#   5. The MARKER-AND-ASSERTION rule survives in the child that ships it.
#      ⚠️ `5b-iii-a` deletes two markers the client matches on today, and each is
#      driven for real by an assertion in a contract check. A marker deleted while
#      its assertion stands leaves a check asserting a rule that is no longer
#      true — red on a correct tree, and deleted by whoever meets it next.
#   6. The refusal of a NAME COLUMN on the request row survives in `5b-iii-c`.
#      ⚠️ That is the tenancy-shaped decision in this split: `workspace_invite`
#      holds BOTH paths' rows, so a name column would mean one thing for a request
#      and nothing for an invite, and a column whose meaning depends on another
#      column is the shape that goes wrong. A split that drops the sentence is a
#      split whose next session adds the column.
#   7. `D8`'s SILENT FAILURE survives in `5b-iii-d`. ⚠️ An approved staff member
#      with no location writes nothing, with no message — which on a phone looks
#      exactly like the app being broken. The picker refuses to be empty because
#      of that sentence and nothing else; §2.11 bans the rendering suite that
#      would otherwise notice it defaulting.
#   8. The parent row is NOT takeable. `4.6a`, `4.6c`, `5b`, `5b-ii`, `5b-ii-b`,
#      `5b.8` and `5b.8-iii` all had to say so in their own rows once split, and
#      prose is not a gate.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Nothing about whether the split is a GOOD one. It
# cannot see whether `5b-iii-a` is buildable in one session, and it cannot see
# whether the SQLSTATEs the row names are still free — those are claims about
# applied SQL, and the instrument for them is the pgTAP suite each migration child
# ships, the same division `5b-i` drew, `5b.7` repeated and `5b.8` inherited.
#
# ⚠️⚠️ NEVER QUOTE THIS CHECK'S SENTINELS VERBATIM IN `docs/PLAN.md` PROSE. It
# reads table rows anchored at column 0, which is why prose quoting a row can
# never match — and the sizing section above these rows quotes several. ⚠️ THE
# SISTER RULE, learned by `plan-handover.sh` the hard way on 2026-09-13: A CHECK
# MUST BOUND THE REGION IT READS, NOT TRUST THE NEXT HEADING. This one bounds
# itself by matching bold task names at column 0 and nothing else.
#
# Run:  bash docs/checks/5b-iii-split-coverage.sh
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
# (`| **5b-iii-a** |`); the sizing prose names the same tasks in backticks and no
# bold. Matching the bold form is what keeps assertion 2 counting rows.
#
# ⚠️⚠️ THE TRAILING ` |` IS THE WHOLE BALLGAME HERE, AND THIS IS THE WORST PREFIX
# CHAIN IN THIS DIRECTORY: `5b-i` is a prefix of `5b-iii`, which is a prefix of
# ALL FOUR children. Without the closing pipe, `| **5b-iii** |` matches inside
# every child row, the parent is counted five times, and every deliverable appears
# to be "in the parent" no matter which child holds it — assertion 4 silently
# reporting success on a dropped deliverable. Fixture `S1` is what says the
# matcher still separates them, and `X1`/`X2` say the older guards are unmoved by
# four new rows existing.
rows_all() { grep -F -e "| **$1** |" -e "| **\`$1\`** |" "$PLAN" | grep "^|"; }
row()      { rows_all "$1" | head -1; }

CHILDREN="5b-iii-a 5b-iii-b 5b-iii-c 5b-iii-d"

# --- 1. the five rows exist -------------------------------------------------
note
missing=0
for t in 5b-iii $CHILDREN; do
  if [[ -z "$(row "$t")" ]]; then
    fail "no table row for $t in $PLAN"
    missing=$((missing+1))
  fi
done
if (( missing == 0 )); then
  ok "the parent row and all four children of 5b-iii are present"
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
# BRACKET CLASS where a leading letter differs between parent and child, as the
# join-screen entry does. That wrong word walked `5b-split-coverage.sh`'s next
# writer into the trap on 2026-09-19.
#
# ⚠️ TWO ENTRIES HERE ARE THE REFUSAL'S OWN WORDS RATHER THAN A SYMBOL, because
# the SQLSTATEs they name do not exist yet — `TD004` and `TD005` are recommended
# in the row and confirmed against `supabase/README.md` on the day. A guard that
# matched the numbers would go red the moment the numbering moved, which is the
# file bending to the check.
DELIVERABLES=(
  "the code for a second ask on the push path|approve the request instead|5b-iii-a"
  "the prose marker it retires|ALREADY_REQUESTED_MARKER|5b-iii-a"
  "the code for a dead token|this token is not valid|5b-iii-a"
  "the screen-local reading it retires|@/api/redeem|5b-iii-a"
  "the join-by-code screen|[Jj]oin-by-code|5b-iii-b"
  "request_access — the joiner types the code|request_access|5b-iii-b"
  "my_access_requests — the joiner's pending state (S3)|my_access_requests|5b-iii-b"
  "the definer read of the requester's name|auth_full_name|5b-iii-c"
  "C11.8 — the Home notifications icon and its badge|C11\.8|5b-iii-d"
  "approve_request — the act that shuts the loop|approve_request|5b-iii-d"
  "the location picker D8 refuses to leave empty|location picker|5b-iii-d"
  "the approval row's order, ruled 2026-09-19|EMAIL [aA][sS] [tT][hH][eE] [hH][eE][aA][dD][eE][rR]|5b-iii-d"
)

# --- 3. + 4. the parent still promises each one, and exactly one child has it
note
covered=0
cov_fails=0
for d in "${DELIVERABLES[@]}"; do
  IFS='|' read -r name rx owner <<< "$d"

  if ! grep -Eq "$rx" <<< "$(row 5b-iii)"; then
    echo "FAIL: '$name' is no longer named in the parent 5b-iii row — the coverage"
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
       echo "      ⚠️ THIS SPLIT SHIPS TWO MIGRATIONS. A deliverable that falls out here"
       echo "      is not a screen nobody builds; it is a function deployed without it,"
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
  ok "$covered/$total of 5b-iii's deliverables land in exactly one child, the assigned one"
else
  fails=$((fails+1))
  echo "      $covered/$total covered; $cov_fails are not."
fi

ROW_A="$(row 5b-iii-a)"
ROW_C="$(row 5b-iii-c)"
ROW_D="$(row 5b-iii-d)"

# --- 5. a marker and its assertion retire together --------------------------
# ⚠️ THE FIRST OF THREE THAT GUARD A DECISION RATHER THAN A DELIVERABLE, and it is
# the one that protects a CHECK rather than the app. `@/api/invites` and
# `@/api/redeem` each match a marker in a server error message today, and each is
# safe only because a contract check drives that refusal for real and goes red if
# the wording moves. Delete a marker and leave its assertion and the check now
# asserts a rule that is no longer true — it goes red on a correct tree, and this
# repository has recorded four separate occasions where the response to that was
# to delete the check.
note
if grep -qF "RETIRE IN THE SAME PASS" <<< "$ROW_A"; then
  ok "5b-iii-a's row still ties each marker's retirement to its assertion"
else
  fail "5b-iii-a's row no longer says a marker and the assertion that drives it"
  echo "      retire in the same pass. Both markers are matched by the client TODAY and"
  echo "      both are driven by a contract check; retiring one half leaves either a"
  echo "      check that is red on a correct tree, or a client matching on prose nothing"
  echo "      measures any more."
fi

# --- 6. the name column on the request row is still refused -----------------
# ⚠️ THE SECOND DECISION. The obvious way to put a requester's name in front of an
# approver is a column on the request row. `workspace_invite` holds BOTH paths'
# rows, and a push-path invitee may have no account at all — so the column means
# one thing for `source = 'request'` and nothing for `source = 'invite'`. The
# reason this task is a `security definer` read and not four lines of DDL lives in
# one sentence, in one row, and nowhere else in the repository.
note
if grep -qiF "column whose meaning depends on another column" <<< "$ROW_C"; then
  ok "5b-iii-c's row still refuses the name column on the request row by name"
else
  fail "5b-iii-c's row no longer refuses a name column on the request row. Without"
  echo "      that sentence the next session reads 'the approver needs a name, put it on"
  echo "      the row', adds the column, and ships one that is meaningful on one source"
  echo "      and empty on the other — under an automated merge, append-only."
fi

# --- 7. D8's silent failure survives ----------------------------------------
# ⚠️ THE THIRD DECISION, AND IT IS THE ONE THAT REACHES A SHOP. `D8` is why the
# location picker refuses to be empty for `staff`. Drop the sentence and the
# obvious kindness — let it through, pick a default, ask later — produces a
# cashier who can open the app and write nothing, with no message, which looks
# exactly like the app being broken. ⚠️ §2.11 bans the rendering suite that would
# otherwise catch an empty picker, so this row is the instrument.
note
if grep -qF "WRITES NOTHING, SILENTLY" <<< "$ROW_D"; then
  ok "5b-iii-d's row still carries D8's silent failure"
else
  fail "5b-iii-d's row no longer says an approved staff member with no location"
  echo "      writes nothing, silently. That sentence is the whole reason the picker"
  echo "      refuses to be empty, RLS refuses those writes with no message, and no"
  echo "      test in this repository can see the difference."
fi

# --- 8. the parent is not takeable ------------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what happens when a parent
# stays takeable: a session takes the `XL` the split exists to prevent. Here that
# `XL` is two migrations and two screens in one sitting — four sessions by the
# house ruler, under an automated merge.
note
if grep -qiF "no longer takeable" <<< "$(row 5b-iii)"; then
  ok "the parent 5b-iii row says it is no longer takeable"
else
  fail "the parent 5b-iii row does not say it is no longer takeable. A split whose"
  echo "      parent still reads as a task is a split a cleared session walks past — it"
  echo "      takes the XL, and this XL ships two migrations and two screens."
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
  echo "all $ran assertion groups passed — 5b-iii's $total deliverables have four homes,"
  echo "each child is stated once, the two migrations land in the two children that ship"
  echo "no screen, the two screens claim no migration, and all three decisions are still"
  echo "written down."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the 5b-iii split is not safe to take."
exit 1

#!/usr/bin/env bash
# 4.6a-split-coverage — did the three-way split of `4.6a` lose anything, and do
# the two files that hand out migration numbers still agree?
#
# WHY THIS EXISTS. `4.6a` was sized `L` and split into `4.6a-i` / `4.6a-ii` /
# `4.6a-iii` on 2026-09-13, before a line of `0027` was written. It carries the
# EIGHT RULINGS of decision register #9, and ADR-035 §2.7 says in terms that all
# of them freeze the moment the migration merges. A ruling that falls between two
# child tasks is therefore not a scheduling slip — it is a deployed guess, and
# merging is automated.
#
# `5a-split-coverage.sh` is the same idea one step earlier in the build, and this
# file is deliberately its shape. What is NEW here is the last assertion group:
# it reads `supabase/README.md`.
#
# ⚠️⚠️ THE SEVENTH STALE COPY WAS IN THAT FILE, AND NO CHECK HAD EVER READ IT.
# `supabase/README.md` calls itself "the authority on numbering". On 2026-09-13 it
# said `0026` was the last migration of the database build and that nothing was
# downstream of it — true on 2026-09-05, false from 2026-09-07, when the UI/UX
# grill created step 4.6. The session that split `4.6a` had to hand out `0027`,
# `0028` and `0029` out of a file that did not know step 4.6 existed. Every one of
# this repository's six earlier stale-copy defects was inside `docs/`; this one was
# not, which is exactly why nothing was watching.
#
# WHAT IT ASSERTS:
#   1. Rows exist for the parent, the three children, and `4.6b` / `4.6c`.
#   2. Each child row appears EXACTLY ONCE in the plan. Three of the six recorded
#      stale-copy defects were a claim stated twice and corrected in one copy.
#   3. Each of `4.6a`'s THIRTEEN deliverables is still named in the PARENT row —
#      otherwise a shrinking parent makes the coverage claim below vacuous.
#      Thirteen and not twelve because the owner ruled the joiner's status read IN
#      on 2026-09-13, hours after the split merged.
#   4. Each deliverable is named by EXACTLY ONE child row, and by the right one.
#   5. The five migration numbers are claimed once each and by the right task —
#      this is where the renumbering (`4.6b` → `0030`, `4.6c` → `0031`) is held.
#   6. `supabase/README.md` carries `0027`–`0031` against those task names, and no
#      longer asserts the database build ended at `0026`.
#
#   7. ADR-035 §2.7 no longer says register #9's rulings freeze at `0027` alone,
#      and names `0027`–`0029` against the three child tasks. ⚠️⚠️ ADDED 2026-09-13
#      WHEN THE OWNER INSTRUCTED THAT AMENDMENT. Until then this file said in its
#      own comments that the ADR's lag was "the owner's to amend, not a guard's" —
#      which was true, and became a stale claim the moment he amended it. THIRD
#      FILE, ONE CLAIM: the ADR, the plan and the database doc must agree on which
#      task owns which migration.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Nothing about `0027`'s CONTENT — it cannot tell a
# correct migration from an incorrect one, only that the plan still routes every
# ruling somewhere, and that the three documents describing the split agree.
#
# ⚠️⚠️ NEVER QUOTE THIS CHECK'S SENTINELS VERBATIM IN THE FILES IT READS. It reads
# plan table rows anchored at column 0 (prose quoting a row never starts there) and
# one banned phrase out of `supabase/README.md`. On 2026-09-13 FOUR guards in this
# repository reported a defect by reading the prose that explained the fix. Two
# rules came out of that day and both are applied here: describe a sentinel, never
# spell it; and bound the region you read rather than trusting the next heading.
#
# Run:  bash docs/checks/4.6a-split-coverage.sh
# Exit: 0 all groups hold; 1 otherwise, naming each failure.

set -uo pipefail

PLAN="${1:-docs/PLAN.md}"
DBDOC="${2:-supabase/README.md}"
ADR="${3:-docs/adr/ADR-035-target-architecture-postgres-react-native.md}"
[[ -r "$PLAN"  ]] || { echo "FAIL: cannot read $PLAN";  exit 1; }
[[ -r "$DBDOC" ]] || { echo "FAIL: cannot read $DBDOC"; exit 1; }
[[ -r "$ADR"   ]] || { echo "FAIL: cannot read $ADR";   exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# ⚠️ No associative arrays and no `mapfile`: macOS ships bash 3.2 and this has to
# run on the owner's Mac as well as on ubuntu-latest. Both traps are already
# recorded in the two older plan checks; a check that runs on one of the two
# machines that matter is not one.
#
# ⚠️ `| grep "^|"` IS LOAD-BEARING. A table row starts at column 0; prose quoting
# one does not. That one pipe is what stopped `5a-split-coverage.sh` from reading a
# paragraph 8,000 lines above the table it meant to read.
rows_all() { grep -F -e "| **$1** |" -e "| **\`$1\`** |" "$PLAN" | grep "^|"; }
row()      { rows_all "$1" | head -1; }

# --- 1. the six rows exist -------------------------------------------------
note
missing=0
for t in 4.6a 4.6a-i 4.6a-ii 4.6a-iii 4.6b 4.6c; do
  if [[ -z "$(row "$t")" ]]; then
    fail "no table row for $t in $PLAN"
    missing=$((missing+1))
  fi
done
if (( missing == 0 )); then
  ok "all six rows of step 4.6 are present"
else
  echo "      A split whose children are not in the build-order table is a split a"
  echo "      cleared session cannot take."
  echo
  echo "$ran group(s) ran, $fails failed."
  exit 1
fi

# --- 2. each child row appears exactly once --------------------------------
# ⚠️ THIS IS THE ONE AIMED AT THIS REPOSITORY'S OWN HISTORY. `5a-iv`'s sub-split was
# stated in two tables; a correction landed in one of them and the guard read the
# other, and for an hour the plan asserted both routings while reporting success.
# One copy of each row is the cheapest possible version of that fix.
note
dupes=0
for t in 4.6a-i 4.6a-ii 4.6a-iii; do
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
# The eight rulings of register #9 are recognised by their OWN numbers, because
# that is how ADR-035 §2.7 and the brief both name them — so this is comparing the
# split against the ruling rather than against a paraphrase written beside it.
# ⚠️ `D3′` carries a PRIME. It is not `D3`: the brief's `D3` was amended on the day
# of the ruling, and the amended form is the one that has to land somewhere.
DELIVERABLES=(
  "D1 — source, and the check|D1|4.6a-i"
  "D2 — token_hash nullable|D2|4.6a-i"
  "D3′ — supersede the expired pending row|D3′|4.6a-i"
  "D4 — invited_by becomes decided_by|D4|4.6a-i"
  "D5 — the Crockford join code|D5|4.6a-i"
  "D6 — resolve the whole code, no scan policy|D6|4.6a-iii"
  "D7 — a request absorbs a pending invite|D7|4.6a-iii"
  "D8 — locations required at approval|D8|4.6a-iii"
  "create_invite|create_invite|4.6a-ii"
  "redeem_invite|redeem_invite|4.6a-ii"
  "request_access|request_access|4.6a-iii"
  "approve_request|approve_request|4.6a-iii"
  # ⚠️ THE THIRTEENTH, ADDED 2026-09-13 BECAUSE THE OWNER RULED ON IT. The sizing
  # session took the joiner's status read on his behalf and offered it back as the
  # one cheap-today-dear-later call in the split; he said keep it. A deliverable
  # that a DECISION put there, and that only prose remembers, is exactly the shape
  # of six of this repository's seven stale-copy defects — so it is counted here
  # rather than trusted to the paragraph that records the ruling.
  "my_access_requests — the joiner's status read|my_access_requests|4.6a-iii"
)

# --- 3. + 4. the parent still promises each one, and exactly one child has it
note
covered=0
cov_fails=0
for d in "${DELIVERABLES[@]}"; do
  IFS='|' read -r name rx owner <<< "$d"

  if ! grep -Eq "$rx" <<< "$(row 4.6a)"; then
    echo "FAIL: '$name' is no longer named in the parent 4.6a row — the coverage claim"
    echo "      below would be vacuous for it. Restore it, or re-size deliberately."
    cov_fails=$((cov_fails+1))
    continue
  fi

  hits=""
  for t in 4.6a-i 4.6a-ii 4.6a-iii; do
    grep -Eq "$rx" <<< "$(row "$t")" && hits="$hits $t"
  done
  set -- $hits
  case "$#" in
    0) echo "FAIL: '$name' is in the parent row and in NO child — dropped by the split."
       echo "      Register #9's rulings freeze when the migration merges, so a ruling"
       echo "      nobody owns is a deployed guess."
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
  ok "$covered/$total of 4.6a's deliverables land in exactly one child, the assigned one"
else
  fails=$((fails+1))
  echo "      $covered/$total covered; $cov_fails are not."
fi

# --- 5. the five migration numbers, one task each --------------------------
# ⚠️ THE RENUMBERING LIVES HERE. The split gave `0027`–`0029` to the three children,
# which pushed `4.6b` to `0030` and `4.6c` to `0031`. A row left claiming its old
# number is two tasks writing one append-only file, and the second one to merge is
# the one that finds out.
#
# ⚠️ THE LIVE CLAIM IS THE FIRST NUMBER IN THE MIGRATION CELL, AND THE FIRST
# SPELLING OF THIS GROUP GOT THAT WRONG — it grepped the whole cell, and `4.6b`'s
# cell legitimately says "was `0028`, renumbered by the `4.6a` split", so the guard
# reported the renumbering it was written to protect as a collision. Recording where
# a number CAME FROM is the thing this repository does on every renumbering; a check
# that forbids it would be asking the file to forget.
note
num_fails=0
# The migration cell is field 3 of a row that starts with an empty field. Its FIRST
# four-digit backticked token is what the task claims now.
claimed() { awk -F'|' '{print $3}' <<< "$(row "$1")" | grep -oE '`[0-9]{4}`' | head -1 | tr -d '`'; }
check_num() {
  local task="$1" want="$2" got
  got="$(claimed "$task")"
  if [[ "$got" != "$want" ]]; then
    echo "FAIL: $task claims migration '${got:-none}', the split assigned it $want."
    num_fails=$((num_fails+1))
    return
  fi
  for other in 4.6a-i 4.6a-ii 4.6a-iii 4.6b 4.6c; do
    [[ "$other" == "$task" ]] && continue
    if [[ "$(claimed "$other")" == "$want" ]]; then
      echo "FAIL: $other also claims migration $want — two tasks, one append-only file."
      echo "      This is the renumbering going stale in the very table that hands the"
      echo "      numbers out, and the second task to merge is the one that finds out."
      num_fails=$((num_fails+1))
    fi
  done
}
check_num 4.6a-i   0027
check_num 4.6a-ii  0028
check_num 4.6a-iii 0029
check_num 4.6b     0030
check_num 4.6c     0031
if (( num_fails == 0 )); then
  ok "0027–0031 are claimed once each, by the task the split assigned them to"
else
  fails=$((fails+1))
fi

# --- 6. the numbering authority agrees -------------------------------------
# ⚠️⚠️ THE CROSS-FILE HALF, AND THE REASON THIS FILE EXISTS RATHER THAN AN EXTRA
# ASSERTION IN THE 5a CHECK. `supabase/README.md` says of itself that it is the
# authority on numbering. Two files stating one claim is the shape that has failed
# six times here, and it failed a seventh in this direction: the plan knew about
# step 4.6 from 2026-09-07 and the database doc did not.
#
# The banned phrase is the exact claim that went stale, in the capitalisation both
# of its copies used. The lower-case "the last migration of build step 4" is a
# DIFFERENT and still-true claim about `0022` and is deliberately not matched.
#
# ⚠️ IT READS BULLETS, NOT LINES, AND THAT IS 7c's LESSON APPLIED RATHER THAN
# RE-LEARNED. That file's numbering list wraps every entry over four or five lines,
# so a line-based grep for "this number against that task" is false on a correct
# file. The region is bounded the way the document itself bounds it: a bullet runs
# from `- ` to the next unindented line.
note
db_fails=0
bullets() {
  awk '
    /^- /      { if (b != "") print b; b = $0; next }
    /^  +[^ ]/ { if (b != "") { b = b " " $0; next } }
               { if (b != "") { print b; b = "" } }
    END        { if (b != "") print b }
  ' "$1"
}
DB_BULLETS="$(bullets "$DBDOC")"
for pair in "0027:4.6a-i" "0028:4.6a-ii" "0029:4.6a-iii" "0030:4.6b" "0031:4.6c"; do
  num="${pair%%:*}"; task="${pair##*:}"
  if ! grep -F "\`$num\`" <<< "$DB_BULLETS" | grep -qF "**$task**"; then
    echo "FAIL: $DBDOC does not carry $num against $task. It is the authority on"
    echo "      numbering and the plan is handing out numbers it does not know about."
    db_fails=$((db_fails+1))
  fi
done
if grep -q "LAST migration" "$DBDOC"; then
  echo "FAIL: $DBDOC still asserts a LAST migration of the database build. It said that"
  echo "      of \`0026\` from 2026-09-05 until 2026-09-13, through six days in which step"
  echo "      4.6 existed and owned five migrations. Say what the end of the sequence was"
  echo "      AT A DATE, or say nothing."
  db_fails=$((db_fails+1))
fi
if (( db_fails == 0 )); then
  ok "$DBDOC agrees on 0027–0031 and no longer says the schema is finished"
else
  fails=$((fails+1))
fi

# --- 7. ADR-035 carries the split ------------------------------------------
# ⚠️⚠️ THE ARCHITECTURE DOCUMENT IS THE FILE `CLAUDE.md` TELLS A CLEARED SESSION TO
# OBEY — "if anything disagrees with the ADR, the ADR wins" — so a stale sentence
# there is not a documentation defect, it is an instruction. §2.7 said the eight
# rulings "freeze when `0027` merges", which was written hours before `4.6a` became
# three migrations. Amended on the owner's instruction 2026-09-13, and asserted here
# so the next split cannot leave it behind.
#
# ⚠️ IT ASSERTS THE POSITIVE FORM — the three migrations named against the three
# child tasks — AND the absence of the superseded sentence. The positive half alone
# passes on a document that says both things, which is the shape of every stale-copy
# defect recorded in this repository.
#
# ⚠️⚠️ THE FIRST SPELLING OF THIS GROUP READ THE WRONG COPY, AND FIXTURE Z10 IS WHAT
# SAID SO. It flattened the whole document and looked for each number within eighty
# characters of its task name — which §8's follow-up checklist and this file's own
# revision entry both satisfy, 1,500 lines from §2.7. So a fixture that struck
# `4.6a-iii` out of the §2.7 amendment table stayed GREEN: the guard was measuring
# something adjacent to its claim, for the second time in this file's short life.
# ✅ NOW IT READS THE AMENDMENT'S OWN TABLE ROWS, anchored at column 0 — which also
# makes the anti-vacuity case free, because deleting the table removes the rows this
# loop requires rather than only the sentence the next check bans.
note
adr_fails=0
for pair in "0027:4.6a-i" "0028:4.6a-ii" "0029:4.6a-iii"; do
  num="${pair%%:*}"; task="${pair##*:}"
  if ! grep -F "| \`$num\` |" "$ADR" | grep -qF "\`$task\`"; then
    echo "FAIL: ADR-035 §2.7's amendment table does not name $num against $task. It is"
    echo "      the document a cleared session is told to obey over every other file, so"
    echo "      a split it does not carry is a split that reads as wrong."
    adr_fails=$((adr_fails+1))
  fi
done
if grep -q "All of it freezes when .0027. merges" "$ADR"; then
  echo "FAIL: ADR-035 §2.7 says register #9's rulings freeze when 0027 merges. They"
  echo "      freeze across 0027-0029 — D6, D7 and D8 stay revisable for two migrations"
  echo "      longer — and this sentence is the one the 4.6a split made stale."
  adr_fails=$((adr_fails+1))
fi
if (( adr_fails == 0 )); then
  ok "ADR-035 carries the three-way split and no longer freezes everything at 0027"
else
  fails=$((fails+1))
fi

echo
if (( fails > 0 )); then
  echo "$ran assertion groups ran, $fails failed — the 4.6a split is not safe to take."
  exit 1
fi
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above is
# conditional, so "0 failures" is also what a run that asserted nothing looks like.
if (( ran < 6 )); then
  echo "FAIL: only $ran assertion groups ran, expected 6 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
echo "all $ran assertion groups passed — 4.6a's $total deliverables have three homes,"
echo "0027–0031 are claimed once each, and all three files describing the split agree."

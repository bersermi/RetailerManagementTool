#!/usr/bin/env bash
# split-coverage — ONE engine for the split guards, driven by a spec file.
#
# WHY THIS EXISTS. Between 2026-08-26 and 2026-09-19 this repository grew SEVEN
# generations of the same guard — `5b`, `5b-ii`, `5b-ii-b`, `5b.8`, `5b.8-iii`,
# `5b-iii` and `5b-iii-d` — each a ~290-line copy of the same five assertions with
# a different table of deliverables, and each with a ~265-line falsifier that was
# also a copy. 2,043 lines of check and 1,858 of falsifier asserting one idea:
# A SPLIT IS A PROMISE THAT EVERY PIECE OF THE PARENT LANDED IN EXACTLY ONE CHILD,
# and nothing in this repository can check that promise except a person reading
# table rows. The idea was never the problem. The seventh copy of it was.
#
# ⚠️ WHAT WAS LOST TO COPYING, AND IS NOW FIXED IN ONE PLACE:
#
#   * `5b-split-coverage.sh` HAD NO ANTI-VACUITY GUARD. Six of the seven ended
#     with `(( fails == 0 && ran < N ))`; that one ended with `fails == 0` alone,
#     so a run that skipped every assertion reported success. Rule 4 of this
#     repository, missing from the guard that covers the largest split.
#   * THE `IFS='|'` TRUNCATION TRAP BIT THREE SEPARATE WRITERS. A `(a|b)` in a
#     regex field silently truncates the entry, which then fails as a DROPPED
#     deliverable — reading exactly like the defect the list exists to catch. All
#     three copies "fixed" it by adding a comment telling the next writer not to.
#     This engine COUNTS THE FIELDS and names the trap instead (assertion 0).
#
# ⚠️ THE ENGINE IS GENERIC; THE JUDGEMENT STAYS IN THE SPEC. A spec names the
# deliverables, who owns each, and the sentences a row must still carry. Deciding
# what those are is the sizing session's work and no engine can do it. What the
# engine removes is the retyping of the machinery around them.
#
# Usage:  bash docs/checks/split-coverage.sh <spec> [plan]
#         bash docs/checks/split-coverage.sh --all [plan]
#
# `plan` defaults to the plan CORPUS (working plan + archive) via plan-corpus.sh,
# so a row keeps resolving after its step is archived. Every lookup here is
# CONTENT-addressed — `| **task** |` — and never by line number, which is what
# makes archiving invisible to this check.
#
# Exit: 0 when every assertion in the spec passes; 1 otherwise.

set -uo pipefail

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "${1:-}" == "--all" ]]; then
  shift
  rc=0
  for s in "$SELF_DIR"/specs/*.split; do
    echo "═══ $(basename "$s" .split)"
    bash "$0" "$s" "$@" || rc=1
    echo
  done
  exit $rc
fi

SPEC="${1:-}"
[[ -n "$SPEC" && -r "$SPEC" ]] || { echo "FAIL: usage: split-coverage.sh <spec|--all> [plan]"; exit 1; }

# The plan corpus, unless a caller names a file — which is what the falsifier does
# when it hands us a mutated copy.
if [[ -n "${2:-}" ]]; then
  PLAN="$2"
else
  PLAN="$(bash "$SELF_DIR/plan-corpus.sh")" || { echo "FAIL: could not assemble the plan corpus"; exit 1; }
fi
[[ -r "$PLAN" ]] || { echo "FAIL: cannot read $PLAN"; exit 1; }

# --- spec ------------------------------------------------------------------
SPLIT_ID=""; SUMMARY=""
SPLIT_GROUPS=(); DELIVERABLES=(); PHRASES=(); EACH_CHILD_SAYS=()
# shellcheck disable=SC1090
. "$SPEC"
[[ -n "$SPLIT_ID" ]] || { echo "FAIL: $SPEC sets no SPLIT_ID"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# ⚠️ No associative arrays and no `mapfile`: macOS ships bash 3.2 and this has to
# run on the owner's Mac as well as on ubuntu-latest. A check that runs on one of
# the two machines that matter is not one.
#
# ⚠️ `| grep "^|"` IS LOAD-BEARING. A table row starts at column 0; prose quoting
# one does not — and the sizing sections quote these rows.
#
# ⚠️⚠️ THE TRAILING ` |` IS THE WHOLE BALLGAME. The prefix chains here run four
# deep (`5b-i` ⊂ `5b-iii` ⊂ `5b-iii-d` ⊂ `5b-iii-d-1`). Without the closing pipe,
# `| **5b-iii-d** |` matches inside BOTH children, the parent is counted three
# times, and every deliverable appears to be "in the parent" no matter which child
# holds it — assertion 3 silently reporting success on a dropped deliverable.
# ⚠️ THE TABLE ROWS ARE EXTRACTED ONCE. A plan lookup is `grep` over ~630 table
# rows, not over the corpus's 15,000 lines — the seven copies each re-read the
# whole file per lookup, and with 71 deliverables that is hundreds of full-file
# scans per run. Same result, and it is what makes the falsifier's full sweep
# finish inside a CI step rather than outside one.
# ⚠️ `grep "^|"` STAYS LOAD-BEARING and is applied HERE, at extraction: a table row
# starts at column 0, prose quoting one does not, and the sizing sections quote
# these rows.
ROWS="$(grep "^|" "$PLAN")"

# ⚠️⚠️ EVERY TASK'S ROW IS EXTRACTED ONCE, AND AFTER THAT EVERY LOOKUP IS PURE
# BASH. This is not micro-tuning: the seven copies called `grep` once per lookup,
# which is ~100 fork+exec+here-string-tempfile round trips per run — 0.8s of pure
# WAIT at 1% CPU, and with 342 fixtures over seven specs that was five minutes of
# CI doing nothing. Caching turns it into one grep per task.
#
# ⚠️ No associative arrays: macOS ships bash 3.2 and this has to run on the owner's
# Mac as well as on ubuntu-latest. Parallel indexed arrays and a linear scan — the
# task list is a dozen entries, so the scan is free.
CACHE_IDS=(); CACHE_ROW=(); CACHE_N=()
cache_task() {                     # $1 = task id; idempotent
  local i
  for ((i=0; i<${#CACHE_IDS[@]}; i++)); do [[ "${CACHE_IDS[$i]}" == "$1" ]] && return; done
  local hits; hits="$(grep -F -e "| **$1** |" -e "| **\`$1\`** |" <<< "$ROWS")"
  CACHE_IDS+=("$1")
  CACHE_ROW+=("$(head -1 <<< "$hits")")
  if [[ -z "$hits" ]]; then CACHE_N+=(0); else CACHE_N+=("$(grep -c . <<< "$hits")"); fi
}
_cache_idx() {
  local i
  for ((i=0; i<${#CACHE_IDS[@]}; i++)); do
    [[ "${CACHE_IDS[$i]}" == "$1" ]] && { echo "$i"; return; }
  done
  echo "-1"
}
row()       { local i; i="$(_cache_idx "$1")"; (( i >= 0 )) && printf '%s' "${CACHE_ROW[$i]}"; }
row_count() { local i; i="$(_cache_idx "$1")"; if (( i >= 0 )); then echo "${CACHE_N[$i]}"; else echo 0; fi; }

# ⚠️ POPULATED BEFORE THE FIRST ASSERTION so that a missing row is a FAILED
# ASSERTION rather than an empty cache entry nothing notices.
prime_cache() {
  local g p c t
  for g in "${SPLIT_GROUPS[@]}"; do
    p="${g%%|*}"; cache_task "$p"
    for c in ${g#*|}; do cache_task "$c"; done
  done
  for t in "${PHRASES[@]:-}"; do
    [[ -z "$t" ]] && continue
    cache_task "$(cut -d'|' -f1 <<< "$t")"
  done
}

children_of() {  # $1 = parent id -> echoes its children, or nothing
  local g p
  for g in "${SPLIT_GROUPS[@]}"; do
    p="${g%%|*}"
    [[ "$p" == "$1" ]] && { echo "${g#*|}"; return; }
  done
}
group_parent_of() {  # $1 = child id -> echoes the parent whose group holds it
  local g p c k
  for g in "${SPLIT_GROUPS[@]}"; do
    p="${g%%|*}"; k="${g#*|}"
    for c in $k; do [[ "$c" == "$1" ]] && { echo "$p"; return; }; done
  done
}
all_children() {
  local g
  for g in "${SPLIT_GROUPS[@]}"; do echo "${g#*|}"; done
}

# --- 0. the spec is well formed --------------------------------------------
# ⚠️ THIS IS THE ASSERTION THE SEVEN COPIES REPLACED WITH A COMMENT. A `|` inside
# a regex field truncates the entry: the pattern becomes `(a`, the owner becomes
# `b)`, and it fails downstream as a DROPPED deliverable — which reads exactly
# like the defect this file exists to catch and is not one. Counting the fields
# turns a misdiagnosis into a named failure.
note
spec_bad=0
(( ${#SPLIT_GROUPS[@]} > 0 )) || { fail "$SPEC declares no SPLIT_GROUPS"; spec_bad=$((spec_bad+1)); }
(( ${#DELIVERABLES[@]} > 0 )) || { fail "$SPEC declares no DELIVERABLES — a split guard that promises nothing is vacuous"; spec_bad=$((spec_bad+1)); }
for d in "${DELIVERABLES[@]}"; do
  n=$(awk -F'|' '{print NF}' <<< "$d")
  if (( n != 3 )); then
    fail "DELIVERABLES entry has $n fields, expected 3 (name|regex|owner):"
    echo "        $d"
    echo "      ⚠️ A bare \`|\` in the regex field TRUNCATES the entry. Use a BRACKET"
    echo "      CLASS — [aA][sS] — never an alternation (a|b). This is the trap that"
    echo "      bit 5b, 5b.8 and 5b-iii in turn."
    spec_bad=$((spec_bad+1))
  fi
done
for p in "${PHRASES[@]:-}"; do
  [[ -z "$p" ]] && continue
  n=$(awk -F'|' '{print NF}' <<< "$p")
  (( n == 4 )) || { fail "PHRASES entry has $n fields, expected 4 (task|F or I|phrase|why): $p"; spec_bad=$((spec_bad+1)); }
done
for e in "${EACH_CHILD_SAYS[@]:-}"; do
  [[ -z "$e" ]] && continue
  n=$(awk -F'|' '{print NF}' <<< "$e")
  (( n == 3 )) || { fail "EACH_CHILD_SAYS entry has $n fields, expected 3 (F or I|phrase|why): $e"; spec_bad=$((spec_bad+1)); }
done
for d in "${DELIVERABLES[@]}"; do
  IFS='|' read -r _ _ owner <<< "$d"
  if [[ -z "$(group_parent_of "$owner")" ]]; then
    fail "deliverable owner '$owner' is in no SPLIT_GROUPS child list — it can never be checked"
    spec_bad=$((spec_bad+1))
  fi
done
if (( spec_bad == 0 )); then
  ok "the spec is well formed: ${#SPLIT_GROUPS[@]} group(s), ${#DELIVERABLES[@]} deliverable(s)"
else
  echo
  echo "$ran group(s) ran, $fails failed — the spec is unusable, so nothing below was asserted."
  exit 1
fi

prime_cache

# --- 1. every parent and child row exists ----------------------------------
note
missing=0
for g in "${SPLIT_GROUPS[@]}"; do
  p="${g%%|*}"
  for t in $p ${g#*|}; do
    if [[ -z "$(row "$t")" ]]; then
      fail "no table row for $t in $PLAN"
      missing=$((missing+1))
    fi
  done
done
if (( missing == 0 )); then
  ok "every parent and child row of $SPLIT_ID is present"
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
for t in $(all_children); do
  n="$(row_count "$t")"
  if (( n != 1 )); then
    fail "$t's row appears $n times. Two copies of one claim is how the 5a-iv"
    echo "      sub-split asserted two different routings at once — state it once."
    dupes=$((dupes+1))
  fi
done
(( dupes == 0 )) && ok "each child row is stated exactly once"

# --- 3. the parent still promises each deliverable, and exactly one child has it
# ⚠️ EACH REGEX MUST MATCH IN EXACTLY ONE CHILD ROW, which is a constraint on the
# PLAN's wording as much as on the spec: a child row that mentions its sibling's
# work in passing turns this red. That is deliberate. A row describing work it
# does not do is how `4.6b`'s scope disagreed with `4.5c-ii`'s for four days.
note
covered=0
cov_fails=0
for d in "${DELIVERABLES[@]}"; do
  IFS='|' read -r name rx owner <<< "$d"
  parent="$(group_parent_of "$owner")"
  kids="$(children_of "$parent")"

  if ! grep -Eq "$rx" <<< "$(row "$parent")"; then
    echo "FAIL: '$name' is no longer named in the parent $parent row — the coverage"
    echo "      claim below would be vacuous for it. Restore it, or re-size deliberately."
    cov_fails=$((cov_fails+1))
    continue
  fi

  hits=""
  for t in $kids; do
    grep -Eq "$rx" <<< "$(row "$t")" && hits="$hits $t"
  done
  set -- $hits
  case "$#" in
    0) echo "FAIL: '$name' is in the $parent row and in NO child — dropped by the split."
       echo "      ⚠️ §2.11 keeps rendering out of scope, so for a client-only deliverable"
       echo "      there is no suite here that would notice. These rows are the instrument."
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
  ok "$covered/$total of $SPLIT_ID's deliverables land in exactly one child, the assigned one"
else
  fails=$((fails+1))
  echo "      $covered/$total covered; $cov_fails are not."
fi

# --- 4. the sentences a named row must still carry -------------------------
# ⚠️ THESE GUARD A DECISION RATHER THAN A DELIVERABLE, and they are the ones that
# reach a shop. A decision about what a screen renders has no constraint, grant or
# policy to live in — so the plan row is its only home, and this is the only
# instrument that reads it.
if (( ${#PHRASES[@]} > 0 )); then
  note
  ph_fails=0
  for p in "${PHRASES[@]}"; do
    [[ -z "$p" ]] && continue
    IFS='|' read -r task mode phrase why <<< "$p"
    r="$(row "$task")"
    if [[ -z "$r" ]]; then
      fail "no $task row at all, so its required sentence cannot be checked. $why"
      ph_fails=$((ph_fails+1)); continue
    fi
    if [[ "$mode" == "I" ]]; then
      grep -qiF "$phrase" <<< "$r" && continue
    else
      grep -qF "$phrase" <<< "$r" && continue
    fi
    fail "$task's row no longer carries: \"$phrase\""
    echo "      $why"
    ph_fails=$((ph_fails+1))
  done
  (( ph_fails == 0 )) && ok "all ${#PHRASES[@]} required sentence(s) survive in their rows"
fi

# --- 5. sentences every child must carry -----------------------------------
if (( ${#EACH_CHILD_SAYS[@]} > 0 )); then
  note
  ec_fails=0
  for e in "${EACH_CHILD_SAYS[@]}"; do
    [[ -z "$e" ]] && continue
    IFS='|' read -r mode phrase why <<< "$e"
    for t in $(all_children); do
      r="$(row "$t")"
      if [[ "$mode" == "I" ]]; then
        grep -qiF "$phrase" <<< "$r" && continue
      else
        grep -qF "$phrase" <<< "$r" && continue
      fi
      fail "$t's row no longer states: \"$phrase\""
      echo "      $why"
      ec_fails=$((ec_fails+1))
    done
  done
  (( ec_fails == 0 )) && ok "every child row carries its ${#EACH_CHILD_SAYS[@]} required statement(s)"
fi

# --- 6. every parent is not takeable ---------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what happens when a parent
# stays takeable: a session takes the `L` the split exists to prevent.
note
take=0
for g in "${SPLIT_GROUPS[@]}"; do
  p="${g%%|*}"
  if ! grep -qiF "no longer takeable" <<< "$(row "$p")"; then
    fail "the parent $p row does not say it is no longer takeable. A split whose"
    echo "      parent still reads as a task is a split a cleared session walks past —"
    echo "      it takes the L, which is the one thing the split exists to prevent."
    take=$((take+1))
  fi
done
(( take == 0 )) && ok "every parent row says it is no longer takeable"

# --- anti-vacuity ----------------------------------------------------------
# ⚠️ RULE 4. Every failure path above is conditional, so "0 failures" is also what
# a run that skipped everything looks like — and assertions 0 and 1 exit early by
# design, which is exactly the shape that can leave the rest unrun without
# anything going red. `5b-split-coverage.sh` shipped for 24 days without this.
expected=5
(( ${#PHRASES[@]} > 0 ))        && expected=$((expected+1))
(( ${#EACH_CHILD_SAYS[@]} > 0 )) && expected=$((expected+1))
echo
if (( fails == 0 && ran < expected )); then
  echo "FAIL: only $ran assertion groups ran, expected $expected — this check asserted"
  echo "      almost nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — $SPLIT_ID's $total deliverables each have"
  echo "exactly one home, every child is stated once, and every parent is closed."
  [[ -n "$SUMMARY" ]] && echo "$SUMMARY"
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the $SPLIT_ID split is not safe to take."
exit 1

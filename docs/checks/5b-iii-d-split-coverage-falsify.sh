#!/usr/bin/env bash
# 5b-iii-d-split-coverage-falsify — the fourteen fixtures the 5b-iii-d split guard
# was checked against, kept as a script rather than as a paragraph claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every guard in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b-iii-d-split-coverage.sh` still FAILS on each defect it was written
# for — the only way to know it has not been loosened into a check that passes on
# everything.
#
# ⚠️⚠️ AND IT MATTERS MORE HERE THAN IN THE SIX OLDER HARNESSES, FOR ONE REASON:
# NEITHER CHILD OF THIS SPLIT SHIPS A MIGRATION. The older guards could be wrong
# and still have a pgTAP suite downstream catching the damage. This split's whole
# risk is `D8`'s fence going missing on a SCREEN, and §2.11 keeps rendering out of
# scope — so there is no second instrument. If this guard is quietly broken,
# nothing else in the repository is looking.
#
# ⚠️ EVERY MUTATION IS SCOPED TO ONE TABLE ROW, BY NAME, rather than to a phrase.
# That is `Y2`'s lesson inherited, and the prefix chain is now FOUR deep —
# `5b-i` ⊂ `5b-iii` ⊂ `5b-iii-d` ⊂ `5b-iii-d-1` — while the parent promises every
# deliverable by construction. An edit anchored on a phrase lands in whichever row
# grep reached first and the guard reports a DROPPED deliverable instead of a
# MISROUTED one. A fixture that is red for the wrong reason is not a
# falsification, it is a coincidence.
#
# ⚠️⚠️ `S6` MUTATES THE NON-OWNING ROW, AND THAT IS NOT AN ACCIDENT OF SPELLING.
# The sixth-generation harness recorded its `S4` going GREEN FOR THE WRONG REASON:
# a double-ownership fixture whose first spelling added the deliverable to the row
# that ALREADY OWNED IT, so one child still owned it, the guard stayed correctly
# green, and the harness reported "the guard cannot see this defect" — accusing a
# guard that was working. A double-ownership fixture must add the deliverable to
# the child that does NOT have it. `location picker` belongs to `5b-iii-d-2`, so
# `S6` puts it in `5b-iii-d-1`.
#
# ⚠️⚠️ `P1` AND `P2` ARE CROSS-GENERATION FIXTURES, and they are the evidence for a
# claim the sizing section makes in prose: that the SIXTH-generation guard is
# unmoved by these two new rows because every matcher takes the closing ` |`.
# `P1` says it stays green on the split tree; `P2` says it still goes red when the
# row it actually watches is gone — which is what rules out the alternative
# explanation, that it went green because it had stopped looking.
#
# Run:  bash docs/checks/5b-iii-d-split-coverage-falsify.sh
# Exit: 0 when all fourteen fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b-iii-d-split-coverage.sh"
PARENT_CHECK="docs/checks/5b-iii-split-coverage.sh"
PLAN="docs/PLAN.md"
[[ -r "$CHECK" && -r "$PARENT_CHECK" && -r "$PLAN" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

reset() { cp "$PLAN" "$WORK/plan.md"; }

# Replace EVERY occurrence inside ONE build-order row, identified by its bold task
# name. Asserts the row exists, that exactly one row carries that name, that the
# anchor is in it, and that the file actually changed — the per-fixture
# anti-vacuity guard, without which an edited-nothing fixture reports a false green.
#
# ⚠️ ALL OCCURRENCES, NOT THE FIRST. A deliverable can be named more than once in a
# row, and an edit that strikes only the first leaves the guard matching the second
# — a fixture that is green because the defect was never introduced.
strike_row() {
  local task="$1" from="$2" to="$3"
  python3 - "$WORK/plan.md" "$task" "$from" "$to" <<'PY'
import io,sys
p,task,f,t=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4]
lines=io.open(p,encoding="utf-8").readlines()
head="| **%s** |" % task
idx=[n for n,l in enumerate(lines) if l.startswith(head)]
if len(idx)!=1: sys.exit("expected exactly one %s row, found %d" % (task,len(idx)))
n=idx[0]
if f not in lines[n]: sys.exit("anchor not present in the %s row: %s" % (task,f[:60]))
before=lines[n]
lines[n]=lines[n].replace(f,t)
if lines[n]==before: sys.exit("the mutation changed nothing — fixture void")
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
}

drop_row() {
  local task="$1"
  python3 - "$WORK/plan.md" "$task" <<'PY'
import io,sys
p,task=sys.argv[1],sys.argv[2]
lines=io.open(p,encoding="utf-8").readlines()
head="| **%s** |" % task
out=[l for l in lines if not l.startswith(head)]
if len(out)==len(lines): sys.exit("no %s row to drop — fixture void" % task)
io.open(p,"w",encoding="utf-8").writelines(out)
PY
}

dupe_row() {
  local task="$1"
  python3 - "$WORK/plan.md" "$task" <<'PY'
import io,sys
p,task=sys.argv[1],sys.argv[2]
lines=io.open(p,encoding="utf-8").readlines()
head="| **%s** |" % task
idx=[n for n,l in enumerate(lines) if l.startswith(head)]
if len(idx)!=1: sys.exit("expected exactly one %s row, found %d" % (task,len(idx)))
lines.insert(idx[0]+1, lines[idx[0]])
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
}

# $1 label, $2 expected outcome (red|green), $3 substring the output must contain,
# $4 optional: which check to run (defaults to the guard under test)
fixture() {
  local label="$1" want="$2" needle="$3" which="${4:-$CHECK}" out rc
  ran=$((ran+1))
  out="$(bash "$which" "$WORK/plan.md" 2>&1)"; rc=$?
  if [[ "$want" == "green" ]]; then
    if (( rc == 0 )); then echo "  ok    $label — green, as recorded"
    else
      echo "FAIL: $label should be GREEN and the check failed:"; sed 's/^/        /' <<< "$out"
      fails=$((fails+1))
    fi
    return
  fi
  if (( rc == 0 )); then
    echo "FAIL: $label should be RED and the check passed — the guard cannot see this defect"
    fails=$((fails+1))
  elif ! grep -qF "$needle" <<< "$out"; then
    echo "FAIL: $label was red for the WRONG REASON. Expected a failure mentioning:"
    echo "        $needle"
    sed 's/^/        /' <<< "$out"
    fails=$((fails+1))
  else
    echo "  ok    $label — red, and for the recorded reason"
  fi
}

# --- S0 the baseline -------------------------------------------------------
# ⚠️ Without this, every red below could be a red the guard produces on ANY input.
reset
fixture "S0 control, the plan unedited" green ""

# --- S1 the parent row deleted ---------------------------------------------
reset; drop_row "5b-iii-d" || exit 1
fixture "S1 the parent 5b-iii-d row deleted" red "no table row for 5b-iii-d in"

# --- S2 a child row deleted ------------------------------------------------
reset; drop_row "5b-iii-d-2" || exit 1
fixture "S2 the 5b-iii-d-2 row deleted" red "no table row for 5b-iii-d-2"

# --- S3 a child stated twice -----------------------------------------------
# ⚠️ The 5a-iv defect: two copies of one routing, a correction landing in one of
# them, and the guard reading the other while reporting success.
reset; dupe_row "5b-iii-d-1" || exit 1
fixture "S3 the 5b-iii-d-1 row stated twice" red "row appears 2 times"

# --- S4 the parent stops promising a deliverable ---------------------------
# ⚠️ THE VACUITY FIXTURE. A shrinking parent row is this repository's most-recorded
# check defect: the coverage claim stays green because there is nothing left to
# cover.
reset; strike_row "5b-iii-d" "(**C11.8**)" "(the bell)" || exit 1
fixture "S4 the parent no longer promises C11.8" red "no longer named in the parent 5b-iii-d row"

# --- S5 a deliverable dropped by the split ---------------------------------
reset; strike_row "5b-iii-d-1" "(**C11.8**)" "(the bell)" || exit 1
fixture "S5 C11.8 promised by the parent and claimed by no child" red "in the parent row and in NO child"

# --- S6 a deliverable claimed by BOTH children -----------------------------
# ⚠️⚠️ IT MUTATES THE ROW THAT DOES NOT OWN IT. `location picker` belongs to
# `5b-iii-d-2`; adding it there again would leave one owner, keep the guard
# correctly green, and make this fixture accuse a working guard — which is exactly
# what the sixth-generation harness recorded its own S4 doing.
reset; strike_row "5b-iii-d-1" "plus the role asked for" \
                  "plus the location picker and the role asked for" || exit 1
fixture "S6 the location picker claimed by both children" red "owned by neither"

# --- S7 a deliverable in the WRONG child -----------------------------------
# ⚠️ Not dropped and not duplicated — MOVED. This is the routing error the guard
# exists for, and it is invisible to a check that only counts homes.
reset
strike_row "5b-iii-d-1" "(**C11.8**)" "(the bell)" || exit 1
strike_row "5b-iii-d-2" "**The act, and the one refusal" \
                        "**The act, the bell (**C11.8**), and the one refusal" || exit 1
fixture "S7 C11.8 moved into 5b-iii-d-2" red "landed in 5b-iii-d-2"

# --- S8 D8's silent failure deleted from the write half --------------------
# ⚠️ THE ONE THAT REACHES A SHOP. Drop the sentence and the obvious kindness —
# let it through, pick a default, ask later — ships a cashier who can open the app
# and write nothing, with no message, and §2.11 means nothing here would notice.
reset; strike_row "5b-iii-d-2" "WRITES NOTHING, SILENTLY" "is given no location" || exit 1
fixture "S8 D8's silent failure gone from 5b-iii-d-2" red "no longer says an approved staff member with no location"

# --- S9 the read half stops admitting it is half a loop --------------------
# ⚠️ THE FIXTURE FOR THE SPLIT COLLAPSING BACK INTO THE L IT CAME FROM. A screen
# that lists people and cannot admit them reads as unfinished, and the session
# that "finishes" it takes the write, the picker and the fence in one sitting.
reset; strike_row "5b-iii-d-1" "DELIBERATELY HALF A LOOP" "READY TO EXTEND" || exit 1
fixture "S9 5b-iii-d-1 no longer says its half loop is deliberate" red "no longer says it is deliberately half a loop"

# --- S10 a child grows a migration -----------------------------------------
# ⚠️ Merging is automated. A child that acquires DDL does not produce a reviewable
# mistake; it produces a deployed one, repaired by a fix-forward migration.
reset; strike_row "5b-iii-d-1" "It ships NO migration" "It ships a small migration" || exit 1
fixture "S10 5b-iii-d-1 claims a migration" red "no longer states that it ships no migration"

# --- S11 the parent stays takeable -----------------------------------------
# ⚠️ `plan-handover.sh`'s fixture V4 is the record of what this costs: a session
# walks past the split and takes the L it exists to prevent.
reset; strike_row "5b-iii-d" "IT IS NO LONGER TAKEABLE" "IT IS STILL TAKEABLE" || exit 1
fixture "S11 the parent row still reads as takeable" red "does not say it is no longer takeable"

# --- P1 the sixth-generation guard is unmoved by the two new rows ----------
# ⚠️ THE CROSS-GENERATION CLAIM, MEASURED. The sizing section says in prose that
# `| **5b-iii-d** |` cannot match inside `| **5b-iii-d-1** |`, so the guard that
# watches 5b-iii's four children does not see this split at all. Prose is not
# evidence; this is.
reset
fixture "P1 5b-iii-split-coverage is unmoved by the two new rows" green "" "$PARENT_CHECK"

# --- P2 and it is still LOOKING --------------------------------------------
# ⚠️⚠️ P1 ALONE PROVES NOTHING, and that is the whole reason this fixture exists.
# A guard that had stopped reading these rows entirely would also be green on P1.
# Deleting the row the sixth generation actually watches — `5b-iii-d`, one of ITS
# four children — must turn it red, which rules out the other explanation.
reset; drop_row "5b-iii-d" || exit 1
fixture "P2 and it still goes red when 5b-iii-d itself is gone" red "no table row for 5b-iii-d in" "$PARENT_CHECK"

echo
if (( ran != 14 )); then
  echo "FAIL: $ran fixtures ran, expected 14 — a fixture was skipped, which is how"
  echo "      conventions-gate-falsify.sh spent a day dead while still being invoked."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran fixtures behaved as recorded — 5b-iii-d-split-coverage.sh still fails"
  echo "on every defect it was written for, and the sixth-generation guard is unmoved by"
  echo "the two new rows while still watching its own."
  exit 0
fi
echo "$ran fixture(s) ran, $fails did not behave as recorded — the guard has been loosened."
exit 1

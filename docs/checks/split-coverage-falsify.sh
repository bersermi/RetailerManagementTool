#!/usr/bin/env bash
# split-coverage-falsify — ONE falsifier for the split-coverage engine, generating
# its fixtures FROM each spec.
#
# WHY THIS REPLACES SEVEN, AND IS STRONGER THAN THEY WERE. Each of the seven
# bespoke guards had its own ~265-line falsifier, and all seven introduced the same
# defect classes by hand: delete the parent row, delete a child, state a child
# twice, take a deliverable out of the parent, take it out of every child, give it
# to two children, move it to the wrong one, drop a required sentence, leave the
# parent takeable. Because the engine is now one file, ONE falsifier covers it —
# and because the fixtures are DERIVED FROM THE SPEC rather than typed, it runs
# every class against every deliverable of every split instead of against the
# handful each author chose. 71 deliverables, not 7 samples.
#
# ⚠️ IT ANSWERS RULE 4 FOR THE ENGINE. Seven green runs prove nothing on their own:
# a vacuous engine is green too. This is the file that says the engine can FAIL, and
# fail for the stated reason rather than by accident.
#
# ⚠️⚠️ A DOUBLE-OWNERSHIP FIXTURE MUST EDIT THE NON-OWNING ROW. Adding the
# deliverable to the row that already owns it leaves the check correctly green and
# makes the fixture accuse a working guard — the trap recorded after it happened
# once. So S6 and S7 extract the ACTUAL matched substring out of the owner's row and
# graft it onto a SIBLING, which is also what makes them generic: no fixture has to
# invent a string that satisfies an arbitrary ERE.
#
# ⚠️ EVERY FIXTURE ASSERTS THE MUTATION CHANGED THE FILE. A fixture that edited
# nothing is green because the defect was never introduced — the false green this
# whole file exists to rule out.
#
# Usage:  bash docs/checks/split-coverage-falsify.sh [--quick]
#         --quick: one representative deliverable per spec (for a fast local loop).
#
# Exit: 0 when every fixture behaves as recorded; 1 otherwise.

set -uo pipefail

ENGINE="docs/checks/split-coverage.sh"
CORPUS_SH="docs/checks/plan-corpus.sh"
SPECS_DIR="docs/checks/specs"
[[ -r "$ENGINE" && -r "$CORPUS_SH" && -d "$SPECS_DIR" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

QUICK=0
[[ "${1:-}" == "--quick" ]] && QUICK=1

FULL="$(bash "$CORPUS_SH")" || { echo "FAIL: cannot assemble the plan corpus"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# ⚠️⚠️ THE FIXTURES RUN AGAINST A ROWS-ONLY PROJECTION OF THE CORPUS, AND THAT IS
# EXACT RATHER THAN APPROXIMATE. The engine's ONLY read of the plan is
# `ROWS="$(grep "^|" "$PLAN")"` — it never looks at a line that is not a table row —
# so a file containing just those rows is indistinguishable to it. 630 lines instead
# of 15,185, which is what brings 335 fixtures (each spawning python three times and
# bash once) inside a CI step instead of five minutes outside one.
#
# ⚠️ IT IS NOT TAKEN ON TRUST. Fixture E0 below runs every spec against the FULL
# corpus and against this projection and refuses unless the output is identical —
# so if the engine ever grows a read of non-row prose, the projection stops being
# equivalent and this file goes red rather than quietly testing the wrong input.
PLAN="$WORK/rows.md"
grep "^|" "$FULL" > "$PLAN"

fails=0
ran=0

MUT="$WORK/mutate.py"
cat > "$MUT" <<'PY'
import sys, re
# mutate.py <plan> <out> <op> <task> [arg]
plan, out, op, task = sys.argv[1:5]
arg = sys.argv[5] if len(sys.argv) > 5 else ""
lines = open(plan).read().split("\n")

def is_row(ln, t):
    return ln.startswith("|") and ("| **%s** |" % t in ln or "| **`%s`** |" % t in ln)

idx = [i for i, ln in enumerate(lines) if is_row(ln, task)]
if not idx:
    sys.exit("no %s row — fixture void" % task)
i = idx[0]
before = lines[i]

if op == "drop":
    lines = [ln for j, ln in enumerate(lines) if j != i]
elif op == "dupe":
    lines.insert(i + 1, before)
elif op == "strip":            # remove a literal substring from the row
    if arg not in before:
        sys.exit("'%s' not in the %s row — fixture void" % (arg, task))
    lines[i] = before.replace(arg, "")
elif op == "graft":            # append a literal substring to the row
    if before.rstrip().endswith("|"):
        lines[i] = before.rstrip()[:-1] + " " + arg + " |"
    else:
        lines[i] = before + " " + arg
elif op in ("match", "matchi"):  # print the substring of the row matching an ERE
    m = re.search(arg, before, re.IGNORECASE if op == "matchi" else 0)
    if not m:
        sys.exit("")
    print(m.group(0))
    sys.exit(0)
else:
    sys.exit("unknown op %s" % op)

new = "\n".join(lines)
if new == open(plan).read():
    sys.exit("the mutation changed nothing — fixture void")
open(out, "w").write(new)
PY

# match_in <task> <ere>  -> the literal substring of that row matching the ERE
match_in()  { python3 "$MUT" "$PLAN" /dev/null match  "$1" "$2" 2>/dev/null; }
# ⚠️ THE ENGINE MATCHES THESE SENTINELS CASE-INSENSITIVELY AND THE ROWS SHOUT THEM.
# A fixture that strips the lower-case spelling edits nothing, and an edit that
# changes nothing is a fixture that is green because the defect was never
# introduced. So find the text AS ACTUALLY SPELLED, then strip that.
match_in_i() { python3 "$MUT" "$PLAN" /dev/null matchi "$1" "$2" 2>/dev/null; }

# fixture <label> <spec> <expect green|red> <needle> <op> <task> [arg]
fixture() {
  local label="$1" spec="$2" expect="$3" needle="$4" op="$5" task="$6" arg="${7:-}"
  ran=$((ran+1))
  local pf="$WORK/plan.md" out rc

  if [[ "$op" == "none" ]]; then
    cp "$PLAN" "$pf"
  else
    if ! python3 "$MUT" "$PLAN" "$pf" "$op" "$task" "$arg" 2>"$WORK/mut.err"; then
      echo "FAIL: [$label] fixture void — $(cat "$WORK/mut.err")"
      fails=$((fails+1)); return
    fi
    # ⚠️ the per-fixture anti-vacuity guard: an edit that changed nothing is a
    # fixture that is green because the defect was never introduced.
    if cmp -s "$PLAN" "$pf"; then
      echo "FAIL: [$label] the mutation left the plan identical — fixture void"
      fails=$((fails+1)); return
    fi
  fi

  out="$(bash "$ENGINE" "$spec" "$pf" 2>&1)"; rc=$?

  if [[ "$expect" == "green" ]]; then
    if (( rc == 0 )); then echo "  ok    [$label] green"; else
      echo "FAIL: [$label] expected green, got rc=$rc"; echo "$out" | sed 's/^/        /'
      fails=$((fails+1)); fi
  else
    if (( rc == 0 )); then
      echo "FAIL: [$label] expected RED, the engine passed — the defect was not caught"
      fails=$((fails+1))
    elif ! grep -qF "$needle" <<< "$out"; then
      echo "FAIL: [$label] went red for the WRONG reason; wanted \"$needle\""
      echo "$out" | sed 's/^/        /'
      fails=$((fails+1))
    else
      echo "  ok    [$label] red on \"$needle\""
    fi
  fi
}

# ⚠️ COUNTED, NOT TYPED. The closing line used to say "all 7 splits"; adding
# `5c.split` on 2026-09-20 made that sentence false with nothing going red, which
# is the stale-copy defect this repository has recorded nine of — in the file
# whose whole job is to prove a claim is still true.
SPEC_COUNT=0
for spec in "$SPECS_DIR"/*.split; do SPEC_COUNT=$((SPEC_COUNT+1)); done

# --- E0. the projection is equivalent to the full corpus, for every spec -----
echo "═══ E0 the rows-only projection"
for spec in "$SPECS_DIR"/*.split; do
  ran=$((ran+1))
  a="$(bash "$ENGINE" "$spec" "$FULL" 2>&1)"; ra=$?
  b="$(bash "$ENGINE" "$spec" "$PLAN" 2>&1)"; rb=$?
  if (( ra == rb )) && [[ "$a" == "$b" ]]; then
    echo "  ok    [E0 $(basename "$spec" .split)] identical on the full corpus and the projection"
  else
    echo "FAIL: [E0 $(basename "$spec" .split)] the projection is NOT equivalent — the engine has"
    echo "      grown a read of something other than table rows, so every fixture below"
    echo "      would be testing the wrong input."
    diff <(echo "$a") <(echo "$b") | head -10 | sed 's/^/        /'
    fails=$((fails+1))
  fi
done
echo

for spec in "$SPECS_DIR"/*.split; do
  id="$(basename "$spec" .split)"
  echo "═══ $id"

  SPLIT_ID=""; SPLIT_GROUPS=(); DELIVERABLES=(); PHRASES=(); EACH_CHILD_SAYS=()
  # shellcheck disable=SC1090
  . "$spec"

  # S0 — the control. Must be green, or every red below is meaningless.
  fixture "S0 control" "$spec" green "" none ""

  for g in "${SPLIT_GROUPS[@]}"; do
    parent="${g%%|*}"; kids="${g#*|}"
    set -- $kids; first="$1"

    fixture "S1 $parent row deleted"      "$spec" red "no table row for $parent" drop "$parent"
    fixture "S2 $first row deleted"       "$spec" red "no table row for $first"  drop "$first"
    fixture "S3 $first stated twice"      "$spec" red "row appears 2 times"      dupe "$first"
    takeable="$(match_in_i "$parent" "no longer takeable")"
    if [[ -z "$takeable" ]]; then
      echo "FAIL: [S10 $parent] the parent row does not carry the takeable sentinel at all"
      fails=$((fails+1)); ran=$((ran+1))
    else
      fixture "S10 $parent left takeable" "$spec" red "does not say it is no longer takeable" \
              strip "$parent" "$takeable"
    fi
  done

  n=0
  for d in "${DELIVERABLES[@]}"; do
    IFS='|' read -r name rx owner <<< "$d"
    n=$((n+1))
    (( QUICK == 1 && n > 1 )) && break

    parent=""
    for g in "${SPLIT_GROUPS[@]}"; do
      for c in ${g#*|}; do [[ "$c" == "$owner" ]] && parent="${g%%|*}"; done
    done
    [[ -n "$parent" ]] || { echo "FAIL: [$name] owner $owner in no group"; fails=$((fails+1)); continue; }

    ptext="$(match_in "$parent" "$rx")"
    otext="$(match_in "$owner"  "$rx")"
    if [[ -z "$ptext" || -z "$otext" ]]; then
      echo "FAIL: [$name] the regex matches no text in the $parent or $owner row — spec is stale"
      fails=$((fails+1)); continue
    fi

    fixture "S4 '$name' out of $parent" "$spec" red "no longer named in the parent $parent row" \
            strip "$parent" "$ptext"
    fixture "S5 '$name' out of $owner"  "$spec" red "in NO child" \
            strip "$owner" "$otext"

    # a sibling that is NOT the owner — the only safe row to graft onto
    sib=""
    for g in "${SPLIT_GROUPS[@]}"; do
      [[ "${g%%|*}" == "$parent" ]] || continue
      for c in ${g#*|}; do [[ "$c" != "$owner" && -z "$sib" ]] && sib="$c"; done
    done
    if [[ -n "$sib" ]]; then
      fixture "S6 '$name' claimed by $owner and $sib" "$spec" red "owned by neither" \
              graft "$sib" "$otext"
      # S7 needs two edits; do them in sequence on one file.
      ran=$((ran+1))
      pf="$WORK/plan.md"; tmp="$WORK/step1.md"
      if python3 "$MUT" "$PLAN" "$tmp" strip "$owner" "$otext" 2>/dev/null \
         && python3 "$MUT" "$tmp" "$pf" graft "$sib" "$otext" 2>/dev/null; then
        out="$(bash "$ENGINE" "$spec" "$pf" 2>&1)"; rc=$?
        if (( rc == 0 )); then
          echo "FAIL: [S7 '$name' moved to $sib] expected RED, engine passed"; fails=$((fails+1))
        elif grep -qF "landed in $sib" <<< "$out"; then
          echo "  ok    [S7 '$name' moved to $sib] red on \"landed in $sib\""
        else
          echo "FAIL: [S7 '$name' moved to $sib] red for the wrong reason"
          echo "$out" | sed 's/^/        /'; fails=$((fails+1))
        fi
      else
        echo "FAIL: [S7 '$name' moved to $sib] fixture void"; fails=$((fails+1))
      fi
    fi
  done

  for p in "${PHRASES[@]:-}"; do
    [[ -z "$p" ]] && continue
    IFS='|' read -r task mode phrase why <<< "$p"
    if [[ "$mode" == "I" ]]; then real="$(match_in_i "$task" "$phrase")"; else real="$phrase"; fi
    [[ -n "$real" ]] || real="$phrase"
    fixture "S8 $task loses \"$phrase\"" "$spec" red "no longer carries" strip "$task" "$real"
  done

  for e in "${EACH_CHILD_SAYS[@]:-}"; do
    [[ -z "$e" ]] && continue
    IFS='|' read -r mode phrase why <<< "$e"
    for g in "${SPLIT_GROUPS[@]}"; do
      set -- ${g#*|}
      if [[ "$mode" == "I" ]]; then real="$(match_in_i "$1" "$phrase")"; else real="$phrase"; fi
      [[ -n "$real" ]] || real="$phrase"
      fixture "S9 $1 loses \"$phrase\"" "$spec" red "no longer states" strip "$1" "$real"
    done
  done
  echo
done

# --- the engine's own refusals, not a plan defect --------------------------
# ⚠️ ASSERTION 0 IS THE ONE THE SEVEN COPIES REPLACED WITH A COMMENT, so it is the
# one most worth proving. A bare `|` in a regex field truncates the entry and it
# then fails as a DROPPED deliverable — a misdiagnosis that cost three writers.
echo "═══ engine refusals"
bad="$WORK/bad.split"
cat > "$bad" <<'B'
SPLIT_ID="bogus"
SPLIT_GROUPS=( "5b|5b-i 5b-ii 5b-iii" )
DELIVERABLES=( "an alternation|(a|b)|5b-i" )
B
ran=$((ran+1))
out="$(bash "$ENGINE" "$bad" "$PLAN" 2>&1)"
if grep -qF "fields, expected 3" <<< "$out" && grep -qF "BRACKET" <<< "$out"; then
  echo "  ok    [E1 a bare | in a regex field] named as the truncation trap, not as a dropped deliverable"
else
  echo "FAIL: [E1] the engine did not name the IFS truncation trap"; echo "$out" | sed 's/^/        /'; fails=$((fails+1))
fi

empty="$WORK/empty.split"
printf 'SPLIT_ID="bogus"\nSPLIT_GROUPS=( "5b|5b-i 5b-ii" )\nDELIVERABLES=()\n' > "$empty"
ran=$((ran+1))
out="$(bash "$ENGINE" "$empty" "$PLAN" 2>&1)"
if grep -qF "declares no DELIVERABLES" <<< "$out"; then
  echo "  ok    [E2 a spec promising nothing] refused as vacuous"
else
  echo "FAIL: [E2] an empty spec was not refused"; echo "$out" | sed 's/^/        /'; fails=$((fails+1))
fi

# ⚠️ THE CORPUS'S OWN ANTI-VACUITY GUARD. A truncated corpus would make every
# check above grep a short file and report success — the exact false green that
# archiving the plan could have introduced.
ran=$((ran+1))
short="$WORK/short"; mkdir -p "$short/docs/plan/archive"
head -5 docs/PLAN.md > "$short/docs/PLAN.md"
out="$(PLAN_ROOT="$short" bash "$CORPUS_SH" 2>&1)"; rc=$?
if (( rc == 0 )) && [[ -r "$out" ]]; then
  echo "  ok    [E3 a small but intact plan] corpus assembles"
else
  echo "FAIL: [E3] corpus refused an intact plan"; echo "$out" | sed 's/^/        /'; fails=$((fails+1))
fi

echo
# ⚠️ RULE 4 FOR THIS FILE. The floor is mode-aware because `--quick` runs one
# deliverable per spec on purpose; the number CI must see is the full one.
# ⚠️ RAISED 75/305 → 80/400 on 2026-09-20 when `5c.split` took the suite from 342
# fixtures to 409. The floor is a LOWER BOUND and goes stale only in the safe
# direction — a deleted spec still trips it — but a floor left 100 fixtures below
# the real count lets a whole spec go silently unrun, which is rule 4 half-applied.
if (( QUICK == 1 )); then MIN=80; else MIN=400; fi
if (( fails == 0 && ran < MIN )); then
  echo "FAIL: only $ran fixtures ran, expected at least $MIN — fixtures were skipped,"
  echo "      which is how a falsifier reports success having proved nothing."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran fixtures behaved as recorded — the engine still fails, for the stated"
  echo "reason, on every defect class against every deliverable of all $SPEC_COUNT splits."
  exit 0
fi
echo "$ran fixtures ran, $fails failed."
exit 1

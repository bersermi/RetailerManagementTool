#!/usr/bin/env bash
# 4.6a-split-coverage-falsify — the eight fixtures the split guard was checked
# against, kept as a script rather than as a paragraph claiming it was checked.
#
# WHY THIS EXISTS. `conventions-gate-falsify.sh` was committed on 2026-09-12 for
# the same reason (#80): a falsification table in `docs/PLAN.md` is a claim about a
# session's diligence, and this repository's founding rule is that a file is not
# evidence. Re-running this says whether the guard still fails on each defect it
# was written for — which is the only way to know it has not been loosened into a
# check that passes on everything.
#
# ⚠️⚠️ AND IT EXISTS BECAUSE TWO FIXTURES ONCE WENT RED FOR THE WRONG REASON. On
# 2026-09-13 a throwaway mutation helper opened each file for writing before
# reading it, silently emptying it — every fixture was red, none of them for the
# edit it claimed to make. "A fixture that is red for the wrong reason is not a
# falsification, it is a coincidence." So this script does two things that helper
# did not: every mutation asserts that it CHANGED the file, and every expected
# failure is matched against the message it should produce, not against exit 1.
#
# Run:  bash docs/checks/4.6a-split-coverage-falsify.sh
# Exit: 0 when all eight fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/4.6a-split-coverage.sh"
PLAN="docs/PLAN.md"
DBDOC="supabase/README.md"
[[ -r "$CHECK" && -r "$PLAN" && -r "$DBDOC" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

# Replace $2 with $3 in the copy $1, and REFUSE to continue if nothing changed.
mutate() {
  local file="$1" from="$2" to="$3" before after
  before="$(cksum < "$file")"
  python3 - "$file" "$from" "$to" <<'PY'
import io,sys
p,f,t=sys.argv[1],sys.argv[2],sys.argv[3]
s=io.open(p,encoding="utf-8").read()
if f not in s:
    sys.exit("anchor not present: "+f[:60])
io.open(p,"w",encoding="utf-8").write(s.replace(f,t,1))
PY
  [[ $? -eq 0 ]] || return 1
  after="$(cksum < "$file")"
  [[ "$before" != "$after" ]] || { echo "      !! the mutation changed nothing — fixture void"; return 1; }
  return 0
}

# $1 label, $2 expected outcome (red|green), $3 substring the output must contain
# (ignored when green), then the two files to run against.
fixture() {
  local label="$1" want="$2" needle="$3" plan="$4" dbdoc="$5" out rc
  ran=$((ran+1))
  out="$(bash "$CHECK" "$plan" "$dbdoc" 2>&1)"; rc=$?
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
    echo "  ok    $label — red, and the message names the defect"
  fi
}

fresh() { cp "$PLAN" "$WORK/plan.md"; cp "$DBDOC" "$WORK/db.md"; }

# --- Z0. control -----------------------------------------------------------
fresh
fixture "Z0 control, unedited" green "" "$WORK/plan.md" "$WORK/db.md"

# --- Z1. a child row deleted ----------------------------------------------
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
out=[l for l in lines if not l.startswith("| **4.6a-iii** |")]
assert len(out) == len(lines)-1, "expected exactly one 4.6a-iii row"
io.open(p,"w",encoding="utf-8").writelines(out)
PY
fixture "Z1 4.6a-iii's row deleted" red "no table row for 4.6a-iii" "$WORK/plan.md" "$WORK/db.md"

# --- Z2. D8 moved into the wrong child ------------------------------------
fresh
mutate "$WORK/plan.md" "refuses an empty array when the role is \`staff\` (**\`D8\`**)" \
                       "refuses an empty array when the role is \`staff\`" || exit 1
mutate "$WORK/plan.md" "Suite: \`supabase/tests/0028_invite_path.sql\`" \
                       "locations are checked at approval (**\`D8\`**). Suite: \`supabase/tests/0028_invite_path.sql\`" || exit 1
fixture "Z2 D8 moved from 4.6a-iii into 4.6a-ii" red "this split assigned it to 4.6a-iii" "$WORK/plan.md" "$WORK/db.md"

# --- Z3. a ruling dropped by the split ------------------------------------
fresh
mutate "$WORK/plan.md" "and the **\`D3′\`** supersede helper that both creating RPCs call" \
                       "and the supersede helper that both creating RPCs call" || exit 1
fixture "Z3 D3′ struck from 4.6a-i's row" red "in the parent row and in NO child" "$WORK/plan.md" "$WORK/db.md"

# --- Z4. the parent stops promising something -----------------------------
fresh
mutate "$WORK/plan.md" "the join-request path \`request_access\` and its approval \`approve_request\`" \
                       "the join-request path and its approval" || exit 1
fixture "Z4 the parent row stops naming request_access" red "no longer named in the parent 4.6a row" "$WORK/plan.md" "$WORK/db.md"

# --- Z5. the renumbering goes stale ---------------------------------------
fresh
mutate "$WORK/plan.md" "| **4.6c** | ⚠️ \`0031\` — **was \`0029\`, renumbered by the \`4.6a\` split, 2026-09-13**" \
                       "| **4.6c** | \`0029\`" || exit 1
fixture "Z5 4.6c left claiming 0029" red "also claims migration 0029" "$WORK/plan.md" "$WORK/db.md"

# --- Z6. the numbering authority reverts ----------------------------------
fresh
mutate "$WORK/db.md" "and the end of the sequence as it stood on 2026-09-05" \
                     "the LAST migration of the database build" || exit 1
fixture "Z6 supabase/README.md says the build ended at 0026 again" red "still asserts a LAST migration" "$WORK/plan.md" "$WORK/db.md"

# --- Z7. a second copy of a child row ------------------------------------
# The shape of three of this repository's six stale-copy defects.
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
row=[l for l in lines if l.startswith("| **4.6a-i** |")]
assert len(row)==1
lines.insert(200, row[0])
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
fixture "Z7 a second copy of 4.6a-i's row, 200 lines away" red "row appears 2 times" "$WORK/plan.md" "$WORK/db.md"

# --- Z8. the RULED deliverable dropped ------------------------------------
# ⚠️ ADDED WITH THE THIRTEENTH DELIVERABLE, 2026-09-13. The owner ruled the joiner's
# status read IN; an atom added to a coverage list and never falsified is an atom
# nobody has shown the guard can see.
fresh
mutate "$WORK/plan.md" "and \`my_access_requests()\` — **ruled in by the owner 2026-09-13** — so the joiner" \
                       "and so the joiner" || exit 1
fixture "Z8 my_access_requests dropped from 4.6a-iii" red "in the parent row and in NO child" "$WORK/plan.md" "$WORK/db.md"

echo
if (( fails > 0 )); then
  echo "$ran fixtures ran, $fails did not behave as recorded."
  exit 1
fi
if (( ran < 9 )); then
  echo "FAIL: only $ran fixtures ran, expected 9."
  exit 1
fi
echo "all $ran fixtures behaved as recorded in docs/PLAN.md — the guard fails on each"
echo "defect it claims to catch, and each failure names that defect."

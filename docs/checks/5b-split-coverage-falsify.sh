#!/usr/bin/env bash
# 5b-split-coverage-falsify — the nine fixtures the 5b split guard was checked
# against, kept as a script rather than as a paragraph claiming it was checked.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every guard in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b-split-coverage.sh` still FAILS on each defect it was written for —
# the only way to know it has not been loosened into a check that passes on
# everything.
#
# ⚠️⚠️ AND IT EXISTS BECAUSE A SISTER HARNESS SPENT A DAY DEAD. On 2026-09-13
# `conventions-gate-falsify.sh` stopped running all sixteen of its fixtures,
# silently, because the gate it falsifies gained a new input file the harness had
# never been told to copy — the baseline went red and the harness refuses to run a
# fixture against a red baseline. Both scripts still existed, both were still
# invoked, and nothing was red anywhere. The rule that came out of it is applied
# here: WHEN AN ASSERTION GAINS A NEW INPUT, THE THING THAT FALSIFIES IT GAINS THE
# SAME INPUT. This guard reads exactly one file, and the control fixture below is
# what says so.
#
# ⚠️ Every mutation asserts that it CHANGED the file, and every expected failure is
# matched against the message it should produce rather than against exit 1 — because
# "a fixture that is red for the wrong reason is not a falsification, it is a
# coincidence."
#
# Run:  bash docs/checks/5b-split-coverage-falsify.sh
# Exit: 0 when all nine fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b-split-coverage.sh"
PLAN="docs/PLAN.md"
[[ -r "$CHECK" && -r "$PLAN" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

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
fixture() {
  local label="$1" want="$2" needle="$3" out rc
  ran=$((ran+1))
  out="$(bash "$CHECK" "$WORK/plan.md" 2>&1)"; rc=$?
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

fresh() { cp "$PLAN" "$WORK/plan.md"; }

# --- Y0. control -----------------------------------------------------------
fresh
fixture "Y0 control, unedited" green ""

# --- Y1. a child row deleted ----------------------------------------------
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
out=[l for l in lines if not l.startswith("| **5b-iii** |")]
assert len(out) == len(lines)-1, "expected exactly one 5b-iii row"
io.open(p,"w",encoding="utf-8").writelines(out)
PY
fixture "Y1 5b-iii's row deleted" red "no table row for 5b-iii"

# --- Y2. a deliverable moved into the wrong child -------------------------
# The commonest real mistake: a session takes 5b-ii, finds the badge convenient
# while it is in Ajustes, and moves it. C11.8 then ships with the push path and
# the pull path has no surface at all.
fresh
mutate "$WORK/plan.md" "the Home **notifications icon and badge** (**C11.8**)" \
                       "the Home notifications surface" || exit 1
# ⚠️ ANCHORED ON TEXT UNIQUE TO THE 5b-ii ROW. The first spelling of this fixture
# anchored on a phrase the PARENT row also carries, so the insert landed in the
# parent — which already promises C11.8 — and the fixture went red for the wrong
# reason, reporting a dropped deliverable instead of a misrouted one. The harness
# caught it because it matches the MESSAGE and not the exit code.
mutate "$WORK/plan.md" "returning a token shown **once**" \
                       "returning a token shown **once**, plus the Home notifications icon and badge (**C11.8**)" || exit 1
fixture "Y2 C11.8's badge moved from 5b-iii into 5b-ii" red "this split assigned it to 5b-iii"

# --- Y3. a deliverable dropped by the split -------------------------------
# The one a split actually loses: it is in the parent, nobody owns it, and it is
# noticed by the owner on his own phone during a pilot.
fresh
mutate "$WORK/plan.md" "the **join code** with its WhatsApp share (**C11.7**)" \
                       "the **join code**" || exit 1
fixture "Y3 C11.7's share button in no child" red "in the parent row and in NO child"

# --- Y4. the parent stops promising something -----------------------------
# ⚠️ THE ONE THAT MAKES A CHECK VACUOUS RATHER THAN RED. Shrink the parent and the
# coverage claim quietly stops covering anything — this repository's recorded
# "green check that stopped measuring its own claim", six times over.
fresh
# ⚠️ THE BACKTICKS ARE ESCAPED, AND THE FIRST SPELLING OF THIS LINE DID NOT ESCAPE
# THEM — inside double quotes bash ran `src/api/` as a command, and the fixture
# died on "No such file or directory" instead of testing anything.
mutate "$WORK/plan.md" "**\`src/api/\`**, the app's first real data layer;" "" || exit 1
fixture "Y4 src/api/ struck from the parent row" red "no longer named in the parent 5b row"

# --- Y5. a child row stated twice -----------------------------------------
# `5a-iv`'s sub-split defect exactly: two copies, a correction landing in one.
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
i=[n for n,l in enumerate(lines) if l.startswith("| **5b-ii** |")]
assert len(i)==1, i
lines.insert(i[0]+1, lines[i[0]])
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
fixture "Y5 5b-ii's row stated twice" red "row appears 2 times"

# --- Y6. 5b.5 re-pointed back at the whole of 5b --------------------------
# ⚠️ THE FIXTURE THAT GUARDS A DECISION RATHER THAN A DELIVERABLE. The sizing
# re-pointed the conventions second pass at `5b-i`, the child that creates
# `src/api/`. Moving it back is not a typo — it is undoing a call, and it costs
# three screens each inventing their own pattern first.
fresh
python3 - "$WORK/plan.md" <<'PY'
import io,sys
p=sys.argv[1]
lines=io.open(p,encoding="utf-8").readlines()
for n,l in enumerate(lines):
    if l.startswith("| **5b.5** |"):
        lines[n] = l.replace("5b-i", "5b")
        break
else:
    sys.exit("no 5b.5 row")
io.open(p,"w",encoding="utf-8").writelines(lines)
PY
fixture "Y6 5b.5 gated on all of 5b again" red "5b.5 no longer gates on 5b-i"

# --- Y7. the parent left takeable -----------------------------------------
# `plan-handover.sh`'s fixture V4 is the record of what this costs: a cleared
# session walks past three children and takes the L the split exists to prevent.
fresh
mutate "$WORK/plan.md" "THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** **Onboarding and membership.**" \
                       "**Onboarding and membership.**" || exit 1
fixture "Y7 the parent row stops saying it is not takeable" red "does not say it is no longer takeable"

# --- Y8. the reverse one: a child mentioning a NEIGHBOUR'S deliverable ----
# ⚠️ NOT A TYPO AND NOT HARMLESS. A row describing work it does not do is how
# `4.6b`'s scope disagreed with `4.5c-ii`'s for four days, and the minority copy
# was the more cautious one. The guard treats two owners as no owner.
fresh
mutate "$WORK/plan.md" "Join-by-code → **\`request_access\`**" \
                       "Join-by-code (and the **\`create_invite\`** token, re-read here) → **\`request_access\`**" || exit 1
fixture "Y8 5b-iii claims create_invite as well" red "owned by neither"

# --- Y9. the member-identity ruling, in its 2026-09-18 wording ------------
# ⚠️⚠️ ADDED BY `5b.8-ii` IN THE SAME COMMIT THAT REPLACED THE ASSERTION IT
# FALSIFIES. The sentinel read "identified by EMAIL" from 2026-09-14; `5b.7` and
# `0034` killed its premise (`T1`), the owner ruled again on 2026-09-18, and it
# now reads "identified by the NAME on the membership". An assertion whose
# wording moves without its fixture moving is an assertion nobody has proved can
# fail — and for four days this entry had no fixture of its own at all.
fresh
mutate "$WORK/plan.md" "**SUPERSEDED — the member row is now identified by the NAME on the membership**" \
                       "**the member row is identified somehow**" || exit 1
fixture "Y9 the member-identity ruling struck from the parent row" red "no longer named in the parent 5b row"

# --- Y10. the half that was NOT retired -----------------------------------
# ⚠️⚠️ THE FIXTURE THAT EXISTS BECAUSE THE OTHER HALF WAS RETIRED. On 2026-09-18
# the member-list sentinel was genuinely superseded, and the approval-row one was
# MEASURED AND LEFT STANDING: a pending request is a `workspace_invite` row
# (`0029:296`) and the person asking has no `workspace_member` row until
# `approve_request` writes one (`0029:455`), so no membership carries their name
# while the approver is looking. The premise died; the outcome did not.
#
# ⚠️ THE FORESEEABLE MISTAKE IS DELETING BOTH, by a session that has read "the
# 2026-09-14 EMAIL ruling was retired" and not the measurement under it. This is
# what that looks like.
fresh
mutate "$WORK/plan.md" "the approver sees an EMAIL** and never a name" \
                       "the approver sees whatever is on the request** and never a name" || exit 1
fixture "Y10 the approval-row ruling struck from the parent row" red "no longer named in the parent 5b row"

echo
# ⚠️ THE ANTI-VACUITY FLOOR, rule 4 of this repository, and it was MISSING from
# this harness until `5b.8-ii` added two fixtures to it. Every failure path above
# is conditional, so "0 failures" is also what a harness that stopped running
# fixtures prints — which is precisely how `conventions-gate-falsify.sh` spent a
# day dead with both its scripts still green.
EXPECTED=11
if (( ran < EXPECTED )); then
  echo "FAIL: only $ran fixtures ran, expected $EXPECTED — this harness proved"
  echo "      almost nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran fixtures behaved as recorded in docs/PLAN.md — the guard fails on each"
  echo "defect it claims to catch, and each failure names that defect."
  exit 0
fi
echo "$ran fixture(s) ran, $fails did not behave as recorded."
exit 1

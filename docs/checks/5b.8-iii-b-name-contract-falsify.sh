#!/usr/bin/env bash
# 5b.8-iii-b-name-contract-falsify — the ten fixtures the name contract check was
# tested against, kept as a script rather than as a paragraph claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every check
# in this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b.8-iii-b-name-contract.sh` still FAILS on each defect it was written
# for — the only way to know it has not been loosened into a check that passes on
# everything.
#
# ⚠️⚠️ AND IT EXISTS BECAUSE A SISTER HARNESS SPENT A DAY DEAD. On 2026-09-13
# `conventions-gate-falsify.sh` stopped running all sixteen of its fixtures,
# silently, because the gate it falsifies gained a new input the harness had
# never been told to copy. The rule from that day is applied here: WHEN AN
# ASSERTION GAINS A NEW INPUT, THE THING THAT FALSIFIES IT GAINS THE SAME INPUT.
# This check reads THREE app modules — `displayName.ts`, `members.ts` and
# `workspace.ts` — and all three are copied, which `V0`'s green confirms and
# `V6`'s red is what makes non-vacuous: a fixture that mutates `members.ts` can
# only go red if `members.ts` was actually handed to the check.
#
# ⚠️⚠️ SIX FIXTURES MUTATE THE APP AND THREE MUTATE THE PROBE, BY NECESSITY AND
# NOT BY CONVENIENCE. `V7`, `V8` and `V9` cannot be reached from `app/` at all —
# no line of TypeScript can make Postgres stop trimming a name, stop refusing a
# blank one, or start refusing a cashier — so those three make the probe LOOK IN A
# WORLD WHERE THE CLAIM IS FALSE. That is `5b.7`'s `Y6` arrangement and its
# argument: *"a fixture nobody can write is an assertion nobody has shown can
# fail."*
#
# ⚠️ NO FIXTURE RESETS THE DATABASE, which the sibling harnesses learned the
# expensive way: nine resets ran one of them to six minutes against `db.yml`'s
# fifteen-minute job cap and the step was CANCELLED — neither a pass nor a
# failure, and the worst of the three to merge on. Every invocation of the check
# mints a new workspace and new addresses off `$STAMP` (`$$` plus the clock), so
# two runs cannot collide.
#
# Run:  supabase start && bash docs/checks/5b.8-iii-b-name-contract-falsify.sh
# Exit: 0 when all ten fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b.8-iii-b-name-contract.sh"
CONTRACT="app/src/api/displayName.ts"
MEMBERS_CONTRACT="app/src/api/members.ts"
WORKSPACE_CONTRACT="app/src/api/workspace.ts"
[[ -r "$CHECK" && -r "$CONTRACT" && -r "$MEMBERS_CONTRACT" && -r "$WORKSPACE_CONTRACT" ]] || {
  echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

fresh() {
  cp "$CONTRACT" "$WORK/displayName.ts"
  cp "$MEMBERS_CONTRACT" "$WORK/members.ts"
  cp "$WORKSPACE_CONTRACT" "$WORK/workspace.ts"
  cp "$CHECK" "$WORK/check.sh"
}

# Replace inside the copied file, asserting the anchor was there and that the
# file actually changed — the per-fixture anti-vacuity guard, without which an
# edited-nothing fixture reports a false green. ⚠️ A SIBLING HARNESS SHIPPED A
# FIXTURE WHOSE ANCHOR CARRIED A NEWLINE AGAINST A ONE-LINE TARGET: the mutation
# always failed, and the fixture was green for a reason unrelated to what it
# asserts. That is what this guard is for.
mutate() {
  python3 - "$WORK/${3:-displayName.ts}" "$1" "$2" <<'PY'
import io, sys
p, f, t = sys.argv[1], sys.argv[2], sys.argv[3]
s = io.open(p, encoding="utf-8").read()
if f not in s:
    sys.exit("anchor not present: %s" % f[:70])
out = s.replace(f, t, 1)
if out == s:
    sys.exit("the mutation changed nothing — fixture void")
io.open(p, "w", encoding="utf-8").write(out)
PY
}

guard() { [[ $? -eq 0 ]] || { echo "FAIL: fixture setup failed"; fails=$((fails+1)); }; }

# $1 label, $2 expected outcome (red|green), $3 substring the output must contain
fixture() {
  local label="$1" want="$2" needle="$3" out rc
  ran=$((ran+1))
  out="$(bash "$WORK/check.sh" "$WORK/displayName.ts" "$WORK/members.ts" "$WORK/workspace.ts" 2>&1)"; rc=$?
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

# --- V0. control ----------------------------------------------------------
# ⚠️ A harness whose baseline is red runs no fixture at all: every "red" below
# would then be the baseline's red and would prove nothing. It is also what says
# all THREE copied modules were copied.
fresh
fixture "V0 control, the tree as committed" green ""

# --- V1. the RPC renamed --------------------------------------------------
fresh
mutate "export const SET_MY_DISPLAY_NAME = 'set_my_display_name';" \
       "export const SET_MY_DISPLAY_NAME = 'fijar_mi_nombre';"
guard
fixture "V1 the RPC renamed" red "the names this app sends — was refused"

# --- V2. an argument renamed ----------------------------------------------
# ⚠️ THE DEFECT THIS CHECK EXISTS FOR. PostgREST matches a function by its
# parameter names, so this is `PGRST202` — a 404 the typecheck, the Vitest suite
# and the bundler all pass straight over.
fresh
mutate "  readonly p_display_name: string;" \
       "  readonly p_full_name: string;"
guard
fixture "V2 an argument renamed in the interface" red "the names this app sends — was refused"

# --- V3. the `p_` prefix dropped ------------------------------------------
# ⚠️⚠️ THE SHAPE `5b-i`'s HARNESS FOUND IN ITS OWN CHECK ON THE FIRST RUN: a
# reader that recognises an argument BY THE PREFIX IT EXISTS TO TEST reports
# "could not read the contract" instead of the 404, which is red for the wrong
# reason and reads as the check being broken rather than the app being wrong.
# This fixture is red only if the message names the 404.
fresh
mutate "  readonly p_workspace_id: string;" \
       "  readonly workspace_id: string;"
guard
fixture "V3 the p_ prefix dropped from an argument" red "the names this app sends — was refused"

# --- V4. the contract unreadable ------------------------------------------
# Assertion 1's own guard. A check that cannot find the app's strings has nothing
# to assert, and its green would be the vacuous kind this repository has recorded
# five shapes of.
fresh
mutate "export interface SetMyDisplayNameArgs {" \
       "export interface SetMyDisplayNameArgsRenamedAway {"
guard
fixture "V4 the args interface renamed away" red "could not read the name contract"

# --- V5. the marker changed -----------------------------------------------
# ⚠️⚠️ THE ASSERTION THAT KEEPS A PROSE MATCH SAFE. `0035` raises 42501 for two
# events and PostgREST for a third; the marker is the only thing that separates
# "you have been removed from this shop" from "sign in again". If the app's
# marker and the server's sentence drift apart, a person who has been removed is
# told her session ended — and nothing but this assertion can see it.
fresh
mutate "export const NOT_A_MEMBER_MARKER = 'not an active member';" \
       "export const NOT_A_MEMBER_MARKER = 'no eres miembro de esta tienda';"
guard
fixture "V5 the refusal marker drifts from the migration" red "no longer contains the marker"

# --- V6. the column the write lands in is dropped from the read -----------
# ⚠️ IT MUTATES `members.ts`, WHICH IS WHAT PROVES THE HARNESS COPIES IT. A write
# nobody's read can see is a correction that never appears on the list of people
# — and `useMyDisplayName` reads the same column, so the box itself would go on
# showing the old name.
fresh
mutate "export const MEMBER_COLUMNS = 'user_id,role,is_active,display_name';" \
       "export const MEMBER_COLUMNS = 'user_id,role,is_active';" members.ts
guard
fixture "V6 display_name dropped from the roster's read" red "does not carry display_name at all"

# ==========================================================================
# THE THREE THAT MUTATE THE PROBE. No line of TypeScript can make Postgres stop
# trimming, stop refusing a blank, or start refusing a cashier — so these make
# the check LOOK IN A WORLD WHERE THE CLAIM IS FALSE. A red here says the
# assertion is live against the world we actually have.
# ==========================================================================

# --- V7. a world where 0035 does not trim ---------------------------------
# `0035`'s decision 2 is that the RETURN is what was STORED, so the sheet renders
# the database's answer and not its own text box. If the function returned the
# input untrimmed, this check as committed would be red — and this fixture is
# that same comparison pointed the other way.
fresh
mutate 'if [[ "$RETURNED" != "Ana María Rodríguez" ]]; then' \
       'if [[ "$RETURNED" != "  Ana María Rodríguez  " ]]; then' check.sh
guard
fixture "V7 the probe expects an UNtrimmed return" red "not the stored trimmed name"

# --- V8. a world where the refusal never arrives --------------------------
# `checkDisplayName` is a courtesy so a person is not shown a refusal she could
# have been spared; the CHECK constraint and `0035`'s `nullif(btrim(...))` are
# the fence. No line of TypeScript can make Postgres accept a blank, so the probe
# is made to send a name the database is happy with — which is, from the
# assertion's side, indistinguishable from a fence that stopped refusing. A red
# says the comparison is live rather than a `23514` nobody is reading.
#
# ⚠️ IT MUTATES WHAT IS SENT AND NOT WHAT IS EXPECTED, and the first spelling of
# this fixture did the opposite: it changed the expected SQLSTATE while the
# failure message still had `23514` typed into its prose, so the check printed
# *"a blank name was NOT refused 23514 (got '23514')"* — red for the right
# reason with a sentence nobody could act on. A message that spells a constant
# the comparison beside it no longer uses is the same stale-duplicate defect this
# repository keeps recording, one scope down.
fresh
mutate "BLANK=\"\$(stash blank \"\$(api POST \"/rest/v1/rpc/\$RPC\" \"\$(name_body \"\$WORKSPACE_ID\" '   ')\")\")\"" \
       "BLANK=\"\$(stash blank \"\$(api POST \"/rest/v1/rpc/\$RPC\" \"\$(name_body \"\$WORKSPACE_ID\" 'Ana')\")\")\"" check.sh
guard
fixture "V8 the probe sends a name the database accepts" red "was NOT refused 23514 (got '')"

# --- V9. a world where a cashier may not fix her own name -----------------
# ⚠️⚠️ THE ASSERTION THE WHOLE TASK RESTS ON, AND THE ONE NOTHING ELSE IN THIS
# REPOSITORY CAN MAKE. The probe is pointed at a workspace the staff member does
# not belong to, which is exactly what "a cashier cannot fix her own name" looks
# like from the app's side — the state that held for every membership before
# `0035` was applied.
fresh
mutate 'STAFF_RENAME="$(api POST "/rest/v1/rpc/$RPC" "$(name_body "$WORKSPACE_ID" '"'"'Lupita Hernández'"'"')")"' \
       'STAFF_RENAME="$(api POST "/rest/v1/rpc/$RPC" "$(name_body "00000000-0000-4000-8000-000000000000" '"'"'Lupita Hernández'"'"')")"' check.sh
guard
fixture "V9 the probe puts the cashier in a shop she is not in" red "could not fix her own name"

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. A harness that ran no
# fixture prints "0 failed" too.
if (( fails == 0 && ran < 10 )); then
  echo "FAIL: only $ran fixtures ran, expected 10 — this harness asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran fixtures behaved as recorded — 5b.8-iii-b-name-contract.sh can still"
  echo "fail on a renamed RPC, a drifted argument, a lost marker, an unread column,"
  echo "and on each of the three claims only the database can break."
  exit 0
fi
echo "$ran fixtures ran, $fails did not behave as recorded — the name contract check"
echo "is not known to be able to fail."
exit 1

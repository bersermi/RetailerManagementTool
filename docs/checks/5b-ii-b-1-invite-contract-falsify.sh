#!/usr/bin/env bash
# 5b-ii-b-1-invite-contract-falsify — the eight fixtures the invite contract
# check was tested against, kept as a script rather than as a paragraph claiming
# it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every check
# in this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b-ii-b-1-invite-contract.sh` still FAILS on each defect it was
# written for — the only way to know it has not been loosened into a check that
# passes on everything.
#
# ⚠️⚠️ AND IT EXISTS BECAUSE A SISTER HARNESS SPENT A DAY DEAD. On 2026-09-13
# `conventions-gate-falsify.sh` stopped running all sixteen of its fixtures,
# silently, because the gate it falsifies gained a new input the harness had
# never been told to copy. The rule from that day is applied here: WHEN AN
# ASSERTION GAINS A NEW INPUT, THE THING THAT FALSIFIES IT GAINS THE SAME INPUT.
# This check reads TWO app modules — `invites.ts` and `workspace.ts` — and both
# are copied, which `Q0`'s green is what confirms.
#
# ⚠️⚠️ EVERY FIXTURE MUTATES THE APP AND NOT THE CHECK, WITH TWO NAMED
# EXCEPTIONS. `S7` and `S8` cannot be reached from `app/` at all — no line of
# TypeScript can make Postgres store a plaintext token or drop its own fence — so
# those two mutate the PROBE. That is `5b.7`'s `Y6` arrangement and its argument:
# *"a fixture nobody can write is an assertion nobody has shown can fail."*
#
# ⚠️⚠️ NO FIXTURE RESETS THE DATABASE, AND THE FIRST VERSION OF THIS FILE DID —
# ONCE PER FIXTURE. The comment here used to say a reset was required because
# `0028`'s one-pending-invite index would make a second run refuse for a reason
# that had nothing to do with the fixture. **That was asserted and never tested,
# and it is false**: every invocation of the check mints a NEW workspace and new
# addresses off `$STAMP` (`$$` plus the clock), and
# `workspace_invite_one_pending_idx` is partial on `(workspace_id, email)` — so
# two runs cannot collide.
#
# ⚠️ IT COST A CI TIMEOUT RATHER THAN AN ARGUMENT. Nine resets ran the harness to
# six minutes and counting against `db.yml`'s fifteen-minute job cap, and the step
# was CANCELLED — which is not a failure and not a pass, and would have been the
# worst of the three to merge on. Measured after removing them: **sixteen seconds,
# with all nine fixtures behaving identically.** The check itself takes two.
#
# ⚠️ WHAT THE FIXTURES DO STILL NEED is a database with the migrations applied,
# which `db.yml` has already done several steps earlier.
#
# Run:  supabase start && bash docs/checks/5b-ii-b-1-invite-contract-falsify.sh
# Exit: 0 when all eight fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b-ii-b-1-invite-contract.sh"
CONTRACT="app/src/api/invites.ts"
WORKSPACE_CONTRACT="app/src/api/workspace.ts"
[[ -r "$CHECK" && -r "$CONTRACT" && -r "$WORKSPACE_CONTRACT" ]] || {
  echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

fresh() {
  cp "$CONTRACT" "$WORK/invites.ts"
  cp "$WORKSPACE_CONTRACT" "$WORK/workspace.ts"
  cp "$CHECK" "$WORK/check.sh"
}

# Replace inside the copied contract, asserting the anchor was there and that
# the file actually changed — the per-fixture anti-vacuity guard, without which
# an edited-nothing fixture reports a false green.
mutate() {
  python3 - "$WORK/${3:-invites.ts}" "$1" "$2" <<'PY'
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
  out="$(bash "$WORK/check.sh" "$WORK/invites.ts" "$WORK/workspace.ts" 2>&1)"; rc=$?
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

# --- S0. control -----------------------------------------------------------
# ⚠️ A harness whose baseline is red runs no fixture at all: every "red" below
# would then be the baseline's red and would prove nothing. It is also what says
# BOTH copied modules were copied.
fresh
fixture "S0 control, the tree as committed" green ""

# --- S1. the RPC renamed --------------------------------------------------
# The plain case, and the one a rename in a migration produces from the other
# side: a 404 the typecheck, the suite and the bundler all pass over.
fresh
mutate "export const CREATE_INVITE = 'create_invite';" \
       "export const CREATE_INVITE = 'crear_invitacion';"
guard
fixture "S1 the RPC renamed in the app" red "the names this app sends — was refused"

# --- S2. ⚠️⚠️ an argument name drifts ------------------------------------
# THE DEFECT THIS FILE EXISTS FOR. PostgREST matches an RPC BY ITS PARAMETER
# NAMES, so this is not a type error and nothing in `app/` can see it. ⚠️ It is
# also the fixture that proves assertion 2 reads the app rather than a name typed
# in the check — which is exactly how that assertion was written WRONG first, and
# this fixture is what would have caught it.
fresh
mutate "  readonly p_workspace_id: string;" \
       "  readonly p_workspace: string;"
guard
fixture "S2 p_workspace_id renamed in the app's own interface" red "the names this app sends — was refused"

# --- S3. the location column list drifts ---------------------------------
fresh
mutate "export const LOCATION_COLUMNS = 'id,name';" \
       "export const LOCATION_COLUMNS = 'id,nombre';"
guard
fixture "S3 a location column renamed" red "does not answer the app's column list"

# --- S4. reading a column the app has no business with --------------------
# ⚠️ THE DECISION `LOCATION_COLUMNS` RECORDS, GUARDED. `my_locations()` already
# filters `is_active`, so adding it back ships a value that is `true` on every
# row this app can ever see — and teaches a later reader the wrong lesson about
# which policies filter and which do not.
#
# ⚠️⚠️ AND THIS FIXTURE IS THE REASON ASSERTION 3 IS WORTH ANYTHING. Its first
# spelling refused "columns the app did not ask for", which with an explicit
# `select=` PostgREST can never return — so the branch was UNFALSIFIABLE and this
# fixture is what said so, by staying green when it should have been red. The
# assertion was rewritten to read the table twice: `select=*` proves the policy
# WOULD hand `is_active` over, and the app's own read proves it does not take
# it. The omission is now measured off the wire rather than off a source string,
# which is `5b-ii-a`'s arrangement for `token_hash`.
fresh
mutate "export const LOCATION_COLUMNS = 'id,name';" \
       "export const LOCATION_COLUMNS = 'id,name,is_active';"
guard
fixture "S4 the app reads is_active, which my_locations() already filtered" red "now carries is_active"

# --- S5. the marker the string match depends on --------------------------
# ⚠️ THE ONE SERVER MESSAGE THIS APP READS. There is no distinguishing SQLSTATE
# for "already requested" — 0028 raises 22023 for five different refusals — so
# `@/api/invites` matches on prose, and THIS assertion is the only thing that
# makes that safe. A reworded migration must be red and named, not silent.
fresh
mutate "export const ALREADY_REQUESTED_MARKER = 'already requested';" \
       "export const ALREADY_REQUESTED_MARKER = 'ya solicitó acceso';"
guard
fixture "S5 the marker no longer matches what 0028 raises" red "no longer contains the marker the app matches on"

# --- S6. the contract cannot be read at all ------------------------------
# ⚠️ THE VACUITY GUARD. A check that cannot find the app's strings has nothing to
# assert, and the dangerous outcome is not a crash — it is a green.
fresh
mutate "export interface CreateInviteArgs {" "export interface CreateInviteArgsRenamed {"
guard
fixture "S6 the argument interface renamed away" red "could not read the invite contract"

# --- S7. ⚠️ THE TOKEN IS STORED IN PLAINTEXT -----------------------------
# ⚠️⚠️ THIS ONE MUTATES THE PROBE, and the reason is `5b.7`'s `Y6` exactly: NO
# LINE IN `app/` CAN MAKE POSTGRES STORE A PLAINTEXT TOKEN. The claim belongs to
# `0028`, so the only way to show the assertion can fail is to make the probe
# look in a world where it is false. Here the hunt is pointed at a body that does
# contain the token — which is what a migration storing it would produce.
#
# ⚠️ A fixture nobody can write is an assertion nobody has shown can fail, and
# this is the assertion the whole task turns on.
fresh
mutate 'HUNT="$(stash hunt "$(api GET "/rest/v1/workspace_invite?select=*")")"' \
       'HUNT="$(stash hunt "$(printf '"'"'[{"token_hash":"deadbeef","leaked":"%s"}]\n200'"'"' "$TOKEN_PLAIN")")"' \
       check.sh
guard
fixture "S7 the plaintext token is in the table" red "THE PLAINTEXT TOKEN IS IN THE TABLE"

# --- S8. ⚠️ the fence stops holding --------------------------------------
# ⚠️ THE PROBE AGAIN, for the same reason: `create_invite`'s manager fence is in
# the FUNCTION BODY and nothing in `app/` can open it. The probe is made to call
# as the OWNER where it means to call as the staff member, which is the shape a
# real regression would have — a caller who should be refused and is not.
fresh
mutate 'signup "$STAFF_EMAIL"
REDEEM=' 'signup "$STAFF_EMAIL"
STAFF_SEATED_TOKEN="$TOKEN"
REDEEM=' check.sh
guard
mutate 'FENCE_BODY="$(invite_body "nobody-$STAMP@example.com" staff "[\"$CENTRO\"]")"' \
       'FENCE_BODY="$(invite_body "nobody-$STAMP@example.com" staff "[\"$CENTRO\"]")"
TOKEN="$OWNER_TOKEN"' check.sh
guard
fixture "S8 a caller who should be refused is not" red "was not refused 42501"

echo
if (( ran != 9 )); then
  echo "FAIL: $ran fixtures ran, expected 9 — the harness skipped some and was about"
  echo "      to report success, which is how a sister harness spent a day dead."
  exit 1
fi
if (( fails == 0 )); then
  echo "all 9 fixtures behaved as recorded (8 red, 1 deliberately green) —"
  echo "5b-ii-b-1-invite-contract.sh can still fail on every defect it was written for."
  exit 0
fi
echo "$fails of $ran fixtures did not behave as recorded."
exit 1

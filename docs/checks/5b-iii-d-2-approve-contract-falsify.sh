#!/usr/bin/env bash
# 5b-iii-d-2-approve-contract-falsify — the seventeen fixtures the approval
# contract check was tested against, kept as a script rather than as a paragraph
# claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every check in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b-iii-d-2-approve-contract.sh` still FAILS on each defect it was
# written for — the only way to know it has not been loosened into a check that
# passes on everything.
#
# ⚠️⚠️ THE RULE FROM 2026-09-13 IS APPLIED HERE: WHEN AN ASSERTION GAINS A NEW
# INPUT, THE THING THAT FALSIFIES IT GAINS THE SAME INPUT.
# `conventions-gate-falsify.sh` spent a day running none of its sixteen fixtures
# because the gate it falsifies gained an input the harness was never told to
# copy. This check reads SEVEN files — six app modules and the applied migration
# `0029` — and all seven are copied, which `W0`'s green is what confirms.
#
# ⚠️⚠️ AND `W4` AND `W9` ARE THE TWO TO READ, BECAUSE THEY ARE `D8` FROM EITHER
# SIDE. `W4` drifts the app's belief about which SQLSTATE the refusal carries;
# `W9` sends the probe to approve a staff member WITH a store where the check
# means to send NONE. Between them they say that assertion 3 is measuring the
# empty-array refusal specifically, and not merely that some call somewhere
# failed. §2.11 removed every instrument that could see the client half of `D8`
# on a screen, so these two are what is left.
#
# ⚠️ `W11` IS THE ONE THAT KEEPS ASSERTION 4 HONEST. That assertion signs in as
# the approved staff member and demands she read exactly the store she was given
# — the whole payoff of `D8` — and it would be equally green if the probe simply
# read the shop as the OWNER, who sees both. `W11` does exactly that and must go
# red.
#
# ⚠️ NO FIXTURE RESETS THE DATABASE, which a sibling harness learned the expensive
# way: nine resets ran it to six minutes against `db.yml`'s job cap and the step
# was CANCELLED — neither a pass nor a failure, and the worst of the three to
# merge on. Every invocation of the check mints new shops and new addresses off
# `$STAMP` (`$$` plus the clock), so two runs cannot collide.
#
# Run:  supabase start && bash docs/checks/5b-iii-d-2-approve-contract-falsify.sh
# Exit: 0 when all seventeen fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b-iii-d-2-approve-contract.sh"
CONTRACT="app/src/api/approvals.ts"
WORKSPACE_CONTRACT="app/src/api/workspace.ts"
REQUEST_CONTRACT="app/src/api/requests.ts"
INVITE_CONTRACT="app/src/api/invites.ts"
CREDENTIALS="app/src/auth/credentials.ts"
REDEEM_CONTRACT="app/src/api/redeem.ts"
MIGRATION="supabase/migrations/0029_request_path.sql"
for f in "$CHECK" "$CONTRACT" "$WORKSPACE_CONTRACT" "$REQUEST_CONTRACT" "$INVITE_CONTRACT" \
         "$CREDENTIALS" "$REDEEM_CONTRACT" "$MIGRATION"; do
  [[ -r "$f" ]] || { echo "FAIL: run me from the repo root (cannot read $f)"; exit 1; }
done

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

fresh() {
  cp "$CONTRACT"           "$WORK/approvals.ts"
  cp "$WORKSPACE_CONTRACT" "$WORK/workspace.ts"
  cp "$REQUEST_CONTRACT"   "$WORK/requests.ts"
  cp "$INVITE_CONTRACT"    "$WORK/invites.ts"
  cp "$CREDENTIALS"        "$WORK/credentials.ts"
  cp "$REDEEM_CONTRACT"    "$WORK/redeem.ts"
  cp "$MIGRATION"          "$WORK/0029.sql"
  cp "$CHECK"              "$WORK/check.sh"
}

# Replace inside a copied file, asserting the anchor was there and that the file
# actually changed — the per-fixture anti-vacuity guard, without which an
# edited-nothing fixture reports a false green. ⚠️ A SIBLING HARNESS SHIPPED A
# FIXTURE WHOSE ANCHOR CARRIED A NEWLINE AGAINST A ONE-LINE TARGET: the mutation
# always failed and the fixture was green for a reason unrelated to what it
# asserts. That is what this guard is for.
mutate() {
  python3 - "$WORK/${3:-approvals.ts}" "$1" "$2" <<'PY'
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
  out="$(bash "$WORK/check.sh" "$WORK/approvals.ts" "$WORK/workspace.ts" "$WORK/requests.ts" \
         "$WORK/invites.ts" "$WORK/credentials.ts" "$WORK/redeem.ts" "$WORK/0029.sql" 2>&1)"; rc=$?
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

# --- W0. control ----------------------------------------------------------
# ⚠️ A harness whose baseline is red runs no fixture at all: every "red" below
# would then be the baseline's red and would prove nothing. It is also what says
# all SEVEN copied inputs were copied.
fresh
fixture "W0  the tree as committed" green ""

# ===========================================================================
# THE APP-SIDE FIXTURES. Nine defects a person could type into `app/src/api/`.
# ===========================================================================

# --- W1. the RPC is renamed in the app ------------------------------------
fresh
mutate "export const APPROVE_REQUEST = 'approve_request';" \
       "export const APPROVE_REQUEST = 'aprobar_solicitud';"; guard
fixture "W1  the RPC renamed in the app" red "a staff approval with an EMPTY store list"

# --- W2. the request-id `p_` argument is renamed in the app ---------------
# ⚠️ THE DEFECT THIS WHOLE FILE EXISTS FOR. PostgREST matches a function BY ITS
# PARAMETER NAMES, so this is a 404 — not a type error, not a failing test, not
# a bundler warning. On a phone it is a button that never works.
fresh
mutate "  readonly p_request_id: string;" "  readonly p_solicitud_id: string;"; guard
mutate "    p_request_id: draft.entry.requestId," "    p_solicitud_id: draft.entry.requestId,"; guard
fixture "W2  the request-id argument renamed in the app" red "a staff approval with an EMPTY store list"

# --- W3. the locations `p_` argument is renamed in the app ----------------
fresh
mutate "  readonly p_location_ids: readonly string[];" \
       "  readonly p_sucursal_ids: readonly string[];"; guard
mutate "    p_location_ids: locationsRequired(draft.entry.role) ? dedupe(draft.locationIds) : []," \
       "    p_sucursal_ids: locationsRequired(draft.entry.role) ? dedupe(draft.locationIds) : [],"; guard
fixture "W3  the locations argument renamed in the app" red "a staff approval with an EMPTY store list"

# --- W4. ⚠️⚠️ the app's belief about D8's SQLSTATE drifts ------------------
# THE CLIENT HALF OF `D8`. `approveErrorMessage` answers
# `ES.approvals.errors.location` for this code; a drift means the one refusal
# that says "that store is not this shop's" arrives as the honest catch-all, and
# nothing else in this repository would notice.
fresh
mutate "export const BAD_LOCATION = '22023';" "export const BAD_LOCATION = '22P02';"; guard
fixture "W4  the app expects the wrong code for a bad location" red "expected 22P02"

# --- W5. the app's TD003 constant drifts -----------------------------------
# ⚠️ THE CODE IS UNREACHABLE OVER HTTP — no `workspace_invite_update` policy
# exists — so assertion 11 is the ONLY thing joining the app's constant to the
# function `supabase/tests/0029_request_path.sql` 7.1/7.2 tests.
fresh
mutate "export const REQUEST_GONE = 'TD003';" "export const REQUEST_GONE = 'TD005';"; guard
fixture "W5  the app expects the wrong code for a dead request" red "REQUEST_GONE ('TD005')"

# --- W6. ⚠️⚠️ the app reads a field 0029 does NOT return ------------------
# THE ONE NO OTHER INSTRUMENT SEES, and `5b-iii-d-1`'s `V4` one module over. The
# typecheck is happy (the field comes off a `Record<string, unknown>`), the
# suite is happy (its fixtures are hand-written objects), the bundler is happy —
# and what reaches a person is a value that is silently `undefined`.
fresh
mutate "    memberId: typeof row.member_id === 'string' && row.member_id !== '' ? row.member_id : null," \
       "    memberId: typeof row.decided_at === 'string' && row.decided_at !== '' ? row.decided_at : null,"; guard
fixture "W6  the app reads a result field that is not there" red "the result is missing"

# --- W7. the contract cannot be read out of the app at all ----------------
# ⚠️ A CHECK THAT CANNOT FIND WHAT IT ASSERTS MUST SAY SO RATHER THAN PASS. This
# is the fifth shape of vacuous green this repository has recorded.
fresh
mutate "export const APPROVE_REQUEST = 'approve_request';" \
       "const APPROVE_REQUEST = 'approve_request';"; guard
fixture "W7  the contract is unreadable" red "could not read the approval contract"

# --- W8. ⚠️ the anti-vacuity floor -----------------------------------------
# A `note` deleted with the assertion it counted is how a short run gets here,
# and `fails == 0` is what it prints. `5b-split-coverage.sh` ended on exactly
# that for 24 days over the largest split in the plan.
fresh
mutate "EXPECTED_GROUPS=14" "EXPECTED_GROUPS=99" check.sh; guard
fixture "W8  fewer groups ran than the check promises" red "asserted nothing"

# ===========================================================================
# THE PROBE-SIDE FIXTURES. Eight claims no edit to `app/` can falsify, so the
# probe is sent to look in a world where each is false. That is `5b.7`'s `Y6`
# arrangement and its argument: *"a fixture nobody can write is an assertion
# nobody has shown can fail."*
# ===========================================================================

# --- W9. ⚠️⚠️ D8's refusal is not being measured --------------------------
# The probe approves the staff request WITH a store where the check means to
# send NONE. If assertion 3 can be green on that, it is not measuring the empty
# array — it is measuring that something, somewhere, failed.
fresh
mutate 'approve_as "$OWNER_TOKEN" "$JOINER_ID" '"'"'[]'"'"' empty' \
       'approve_as "$OWNER_TOKEN" "$JOINER_ID" "[\"$SUR\"]" empty' check.sh; guard
fixture "W9  the probe never sends an empty store list" red "a staff approval with an EMPTY store list"

# --- W10. ⚠️⚠️ the owner fence is gone ------------------------------------
# The manager approves with the OWNER's token, which is what "a manager can
# approve" would look like from this script. `0029`'s decision 6 is owner-only
# because this writes `workspace_member` AND `member_location`.
fresh
mutate 'check_fenced "$MANAGER_TOKEN"  manager' 'check_fenced "$OWNER_TOKEN"  manager' check.sh; guard
fixture "W10 a non-owner can approve" red "manager approving answered"

# --- W11. ⚠️⚠️ D8's payoff is read by the wrong person --------------------
# See the header: assertion 4 is equally green for an OWNER, who sees both
# stores — so it must go red when asked as one.
fresh
mutate 'TOKEN="$JOINER_TOKEN"
HERS=' 'TOKEN="$OWNER_TOKEN"
HERS=' check.sh; guard
fixture "W11 the staff member's view is read as the owner" red "the approved staff member reads"

# --- W12. the queue-leaves assertion looks at the wrong row ---------------
# It must be reading whether the APPROVED request went, not whether any row did.
fresh
mutate 'GONE_FROM_QUEUE="$(id_of "$JOINER_EMAIL")"' \
       'GONE_FROM_QUEUE="$(id_of "$FENCED_EMAIL")"' check.sh; guard
fixture "W12 a still-pending request would satisfy the queue assertion" red "still in the queue"

# --- W13. ⚠️ idempotency is not being measured -----------------------------
# The second approve is sent against a DIFFERENT, never-approved request, which
# answers `approved` rather than `already_approved`. `0029:381` is what the
# pilot store's connection depends on.
fresh
mutate 'approve_as "$OWNER_TOKEN" "$JOINER_ID" "[\"$SUR\"]" again' \
       'approve_as "$OWNER_TOKEN" "$WAITING_ID" "[\"$SUR\"]" again' check.sh; guard
fixture "W13 the repeat approve is sent to a fresh request" red "the second approve answered"

# --- W14. the refusal-wrote-nothing assertion is not reading the database --
# Counted as somebody who can see no members at all, it must notice.
fresh
mutate 'TOKEN="$OWNER_TOKEN"
MEMBERS="$(stash members-after-refusal' 'TOKEN="$STRANGER_TOKEN"
MEMBERS="$(stash members-after-refusal' check.sh; guard
fixture "W14 the membership count is read by somebody who sees none" red "members (expected 3)"

# --- W15. ⚠️ the all-staff invariant is not reading the roles -------------
# Assertion 9 is what says `D8`'s picker cannot be skipped on this path. Asked
# for the wrong role it must go red, or it is asserting nothing about roles.
fresh
mutate "r.get('role') != 'staff'" "r.get('role') != 'manager'" check.sh; guard
fixture "W15 the queued roles are compared against the wrong one" red "non-staff roles"

# --- W16. the foreign-store refusal is sent this shop's own store ---------
fresh
mutate 'approve_as "$OWNER_TOKEN" "$FOREIGN_ID" "[\"$OTHER_LOC\"]" foreign' \
       'approve_as "$OWNER_TOKEN" "$FOREIGN_ID" "[\"$CENTRO\"]" foreign' check.sh; guard
fixture "W16 the foreign-store fixture uses a store of this shop" red "approving into another shop's store"

# ---------------------------------------------------------------------------
# ⚠️ THE FLOOR, FOR THE HARNESS ITSELF. A fixture deleted with the assertion it
# covered is how this file quietly stops being evidence.
EXPECTED_FIXTURES=17
echo
if (( ran < EXPECTED_FIXTURES )); then
  echo "FAILED: only $ran of $EXPECTED_FIXTURES fixtures ran"
  exit 1
fi
if (( fails > 0 )); then
  echo "FAILED: $fails of $ran fixtures"
  exit 1
fi
echo "PASSED: $ran fixtures — the approval contract check still fails on each defect it names"
exit 0

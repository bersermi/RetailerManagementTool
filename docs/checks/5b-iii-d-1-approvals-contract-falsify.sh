#!/usr/bin/env bash
# 5b-iii-d-1-approvals-contract-falsify — the twelve fixtures the approvals
# contract check was tested against, kept as a script rather than as a paragraph
# claiming it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every check in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b-iii-d-1-approvals-contract.sh` still FAILS on each defect it was
# written for — the only way to know it has not been loosened into a check that
# passes on everything.
#
# ⚠️⚠️ THE RULE FROM 2026-09-13 IS APPLIED HERE: WHEN AN ASSERTION GAINS A NEW
# INPUT, THE THING THAT FALSIFIES IT GAINS THE SAME INPUT.
# `conventions-gate-falsify.sh` spent a day running none of its sixteen fixtures
# because the gate it falsifies gained an input the harness was never told to
# copy. This check reads SIX files — `approvals.ts`, `workspace.ts`,
# `requests.ts`, `invites.ts`, `credentials.ts` and `redeem.ts` — and all six are
# copied, which `V0`'s green is what confirms.
#
# ⚠️⚠️ SIX FIXTURES MUTATE THE APP AND FIVE MUTATE THE PROBE, BY NECESSITY AND
# NOT BY CONVENIENCE. No line of TypeScript can make Postgres show a manager
# somebody else's queue, stop fencing `auth_full_name`, put a name on the invite
# row, count a push invite as a person waiting, or reverse a `select` order — so
# those five make the probe look in a world where the claim is false. That is
# `5b.7`'s `Y6` arrangement and its argument: *"a fixture nobody can write is an
# assertion nobody has shown can fail."*
#
# ⚠️⚠️ AND `V4` IS THE ONE TO READ. It ADDS a column to the app's own row type —
# the direction a real edit goes when somebody decides the screen should show the
# expiry, or `5b-iii-d-2` reaches for something `0037` does not return. That
# defect is INVISIBLE everywhere else in this repository: the typecheck is happy
# (the field is `unknown`), the suite is happy (its fixtures are hand-written
# objects), the bundler is happy, and the screen renders a blank where an
# identity should be. Assertion 3 is the only thing that looks.
#
# ⚠️ NO FIXTURE RESETS THE DATABASE, which a sibling harness learned the expensive
# way: nine resets ran it to six minutes against `db.yml`'s job cap and the step
# was CANCELLED — neither a pass nor a failure, and the worst of the three to
# merge on. Every invocation of the check mints new shops and new addresses off
# `$STAMP` (`$$` plus the clock), so two runs cannot collide.
#
# Run:  supabase start && bash docs/checks/5b-iii-d-1-approvals-contract-falsify.sh
# Exit: 0 when all twelve fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b-iii-d-1-approvals-contract.sh"
CONTRACT="app/src/api/approvals.ts"
WORKSPACE_CONTRACT="app/src/api/workspace.ts"
REQUEST_CONTRACT="app/src/api/requests.ts"
INVITE_CONTRACT="app/src/api/invites.ts"
CREDENTIALS="app/src/auth/credentials.ts"
REDEEM_CONTRACT="app/src/api/redeem.ts"
for f in "$CHECK" "$CONTRACT" "$WORKSPACE_CONTRACT" "$REQUEST_CONTRACT" "$INVITE_CONTRACT" \
         "$CREDENTIALS" "$REDEEM_CONTRACT"; do
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
         "$WORK/invites.ts" "$WORK/credentials.ts" "$WORK/redeem.ts" 2>&1)"; rc=$?
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
# all SIX copied modules were copied.
fresh
fixture "V0  the tree as committed" green ""

# --- V1. the RPC is renamed in the app ------------------------------------
fresh
mutate "export const PENDING_ACCESS_REQUESTS = 'pending_access_requests';" \
       "export const PENDING_ACCESS_REQUESTS = 'pendientes_de_acceso';"; guard
fixture "V1  the RPC renamed in the app" red "disagree about the columns"

# --- V2. the `p_` argument is renamed in the app --------------------------
# ⚠️ THE DEFECT THIS WHOLE FILE EXISTS FOR. PostgREST matches a function BY ITS
# PARAMETER NAMES, so this is a 404 — not a type error, not a failing test, not a
# bundler warning. On a phone it is a bell that never appears.
fresh
mutate "  readonly p_workspace_id: string;" "  readonly p_taller_id: string;"; guard
mutate "  return { p_workspace_id: workspaceId };" "  return { p_taller_id: workspaceId };"; guard
fixture "V2  the p_ argument renamed in the app" red "disagree about the columns"

# --- V3. the app stops reading a column 0037 returns ----------------------
fresh
mutate "  readonly expires_at: unknown;" "  readonly caduca_en: unknown;"; guard
fixture "V3  a column renamed in the app's row type" red "disagree about the columns"

# --- V4. ⚠️⚠️ the app reads a column 0037 does NOT return -----------------
# THE ONE NO OTHER INSTRUMENT SEES — see the header.
fresh
mutate "  readonly expires_at: unknown;" "  readonly expires_at: unknown;
  readonly decided_at: unknown;"; guard
fixture "V4  the app reads a column that is not there" red "disagree about the columns"

# --- V5. the name never reaches the database at all -----------------------
# ⚠️ `5b.7` put the name under the key Google writes, and `auth_full_name` reads
# that key. A drift in the app's constant means every account created from here
# on has no name — silently, because a nameless account is admitted on purpose.
fresh
mutate "export const FULL_NAME_KEY = 'full_name';" \
       "export const FULL_NAME_KEY = 'nombre_completo';" credentials.ts; guard
fixture "V5  the sign-up name lands under a key 0034 does not read" red \
        "This column is the whole of why 0037 exists"

# --- V6. the contract cannot be read out of the app at all ----------------
# ⚠️ A CHECK THAT CANNOT FIND WHAT IT ASSERTS MUST SAY SO RATHER THAN PASS. This
# is the fifth shape of vacuous green this repository has recorded.
fresh
mutate "export const PENDING_ACCESS_REQUESTS = 'pending_access_requests';" \
       "const PENDING_ACCESS_REQUESTS = 'pending_access_requests';"; guard
fixture "V6  the contract is unreadable" red "could not read the approvals contract"

# --- V7. ⚠️ the anti-vacuity floor -----------------------------------------
# A `note` deleted with the assertion it counted is how a short run gets here, and
# `fails == 0` is what it prints. `5b-split-coverage.sh` ended on exactly that for
# 24 days.
fresh
mutate "EXPECTED_GROUPS=12" "EXPECTED_GROUPS=99" check.sh; guard
fixture "V7  fewer groups ran than the check promises" red "asserted nothing"

# ===========================================================================
# THE PROBE-SIDE FIXTURES. Five claims no edit to `app/` can falsify, so the
# probe is sent to look in a world where each is false.
# ===========================================================================

# --- V8. ⚠️⚠️ the fence is gone -------------------------------------------
# The manager reads the queue with the OWNER's token, which is what "a manager can
# see the queue" would look like from this script. If assertion 6 can be green on
# that, it is not asserting the fence — and the fence is the whole of `0037`'s
# decision 1 and the trade the owner took on 2026-09-19.
fresh
mutate 'check_fenced "$MANAGER_TOKEN"  manager' 'check_fenced "$OWNER_TOKEN"  manager' check.sh; guard
fixture "V8  a non-owner can read the queue" red "read the queue as HTTP"

# --- V9. ⚠️ the requester can read her own queue ---------------------------
# The other half of the same fence, and the one §2.7 spends a paragraph on: a
# person who has asked to join must not be handed the list of everybody else who
# has.
fresh
mutate 'check_fenced "$NAMED_TOKEN"    requester' 'check_fenced "$OWNER_TOKEN"    requester' check.sh; guard
fixture "V9  the requester can read everybody else's row" red "read the queue as HTTP"

# --- V10. ⚠️⚠️ auth_full_name is callable from a phone --------------------
# `0034` grants it to NOBODY. A client that can call it can read any account's
# name in the instance, which is §2.7's floor rather than this screen's fence — so
# the probe calls something that IS granted, and the assertion must notice.
fresh
mutate 'api POST "/rest/v1/rpc/auth_full_name" "{\"p_user_id\":\"$USER_ID\"}"' \
       'api POST "/rest/v1/rpc/$PENDING" "$(one_arg "$QUEUE_ARG" "$WORKSPACE_ID")"' check.sh; guard
fixture "V10 the name function answers a client directly" red "answered a client directly"

# --- V11. ⚠️⚠️ a push invite counts as a person waiting -------------------
# `source = 'request'` removed would mean the owner's own outstanding invitations
# appear in his queue of strangers — with no requester and therefore no name at
# all. The probe makes that third row real by having the invitee ASK instead.
fresh
mutate 'api POST "/rest/v1/rpc/$CREATE_INVITE" "$(invite_body "$PUSHED_EMAIL" manager '"'"'[]'"'"')" > /dev/null' \
       'signup "$PUSHED_EMAIL"; api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(one_arg "$ASK_ARG" "$SHOP_CODE")" > /dev/null' \
       check.sh; guard
fixture "V11 a third row in the queue passes as an invite that stayed out" red \
        "the queue grew to 3 row(s)"

# --- V12. ⚠️ the order 0037 promises is reversed ---------------------------
# `pendingFrom` renders the list in the order it arrives rather than sorting
# `requested_at`, which is a string at the client compared against a phone clock
# that is not the database's. The probe swaps who asked last.
fresh
mutate 'signup "$NAMED_EMAIL" "$PROBE_NAME"; NAMED_TOKEN="$TOKEN"
api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(one_arg "$ASK_ARG" "$SHOP_CODE")" > /dev/null
signup "$BARE_EMAIL"; BARE_TOKEN="$TOKEN"
api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(one_arg "$ASK_ARG" "$SHOP_CODE")" > /dev/null' \
       'signup "$BARE_EMAIL"; BARE_TOKEN="$TOKEN"
api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(one_arg "$ASK_ARG" "$SHOP_CODE")" > /dev/null
signup "$NAMED_EMAIL" "$PROBE_NAME"; NAMED_TOKEN="$TOKEN"
api POST "/rest/v1/rpc/$REQUEST_ACCESS" "$(one_arg "$ASK_ARG" "$SHOP_CODE")" > /dev/null' \
       check.sh; guard
fixture "V12 the newest request no longer leads" red "expected the later asker"

# ---------------------------------------------------------------------------
# ⚠️ THE FLOOR, for the reason the check itself has one: a harness that ran no
# fixture prints the same last line as one that ran twelve.
EXPECTED_FIXTURES=13
echo
if (( ran < EXPECTED_FIXTURES )); then
  echo "FAILED: only $ran of $EXPECTED_FIXTURES fixtures ran"
  exit 1
fi
if (( fails > 0 )); then
  echo "FAILED: $fails of $ran fixtures did not behave as recorded"
  exit 1
fi
echo "PASSED: all $ran fixtures — the approvals contract check can still fail on each"
exit 0

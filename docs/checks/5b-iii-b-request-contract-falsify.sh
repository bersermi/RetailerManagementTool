#!/usr/bin/env bash
# 5b-iii-b-request-contract-falsify — the eleven fixtures the request contract
# check was tested against, kept as a script rather than as a paragraph claiming
# it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every check in
# this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b-iii-b-request-contract.sh` still FAILS on each defect it was written
# for — the only way to know it has not been loosened into a check that passes on
# everything.
#
# ⚠️⚠️ THE RULE FROM 2026-09-13 IS APPLIED HERE: WHEN AN ASSERTION GAINS A NEW
# INPUT, THE THING THAT FALSIFIES IT GAINS THE SAME INPUT. `conventions-gate-
# falsify.sh` spent a day running none of its sixteen fixtures because the gate it
# falsifies gained an input the harness was never told to copy. This check reads
# FOUR app modules — `requests.ts`, `redeem.ts`, `invites.ts` and `workspace.ts` —
# and all four are copied, which `V0`'s green is what confirms.
#
# ⚠️⚠️ SEVEN FIXTURES MUTATE THE APP AND FOUR MUTATE THE PROBE, BY NECESSITY AND
# NOT BY CONVENIENCE. `V7`, `V8`, `V9` and `V10` cannot be reached from `app/` at
# all — no line of TypeScript can make Postgres raise one SQLSTATE instead of two,
# show a non-member her own invite row, or stop ordering by `created_at` — so
# those four make the probe look in a world where the claim is false. That is
# `5b.7`'s `Y6` arrangement and its argument: *"a fixture nobody can write is an
# assertion nobody has shown can fail."*
#
# ⚠️⚠️ AND `V7` IS THE ONE TO READ, AND IT NOW RUNS THE OTHER WAY ROUND. Until
# `0038` it pretended a distinct SQLSTATE HAD been minted, so that the check went
# red while the app still carried its screen-local guess. `0038` minted it for
# real (task `5b.9`), the guess is gone, and the fixture is inverted with the
# assertion it falsifies: it now makes the anonymous call answer the SAME code as
# a mistyped one — the overload COMING BACK — and the check must be red on that.
# ⚠️ That is what keeps assertion 9 a TWO-WAY assertion rather than a claim that
# today's behaviour is fine: without it, a migration that re-merged the two codes
# would leave `@/api/requests` showing "that is not a shop" to somebody whose
# session had simply lapsed, and nothing in this repository would say so.
#
# ⚠️ NO FIXTURE RESETS THE DATABASE, which a sibling harness learned the expensive
# way: nine resets ran it to six minutes against `db.yml`'s job cap and the step
# was CANCELLED — neither a pass nor a failure, and the worst of the three to
# merge on. Every invocation of the check mints new shops and new addresses off
# `$STAMP` (`$$` plus the clock), so two runs cannot collide.
#
# Run:  supabase start && bash docs/checks/5b-iii-b-request-contract-falsify.sh
# Exit: 0 when all ten fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b-iii-b-request-contract.sh"
CONTRACT="app/src/api/requests.ts"
REDEEM_CONTRACT="app/src/api/redeem.ts"
INVITE_CONTRACT="app/src/api/invites.ts"
WORKSPACE_CONTRACT="app/src/api/workspace.ts"
[[ -r "$CHECK" && -r "$CONTRACT" && -r "$REDEEM_CONTRACT" && -r "$INVITE_CONTRACT" \
   && -r "$WORKSPACE_CONTRACT" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

fresh() {
  cp "$CONTRACT" "$WORK/requests.ts"
  cp "$REDEEM_CONTRACT" "$WORK/redeem.ts"
  cp "$INVITE_CONTRACT" "$WORK/invites.ts"
  cp "$WORKSPACE_CONTRACT" "$WORK/workspace.ts"
  cp "$CHECK" "$WORK/check.sh"
}

# Replace inside a copied file, asserting the anchor was there and that the file
# actually changed — the per-fixture anti-vacuity guard, without which an
# edited-nothing fixture reports a false green. ⚠️ A SIBLING HARNESS SHIPPED A
# FIXTURE WHOSE ANCHOR CARRIED A NEWLINE AGAINST A ONE-LINE TARGET: the mutation
# always failed and the fixture was green for a reason unrelated to what it
# asserts. That is what this guard is for.
mutate() {
  python3 - "$WORK/${3:-requests.ts}" "$1" "$2" <<'PY'
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
  out="$(bash "$WORK/check.sh" "$WORK/requests.ts" "$WORK/redeem.ts" "$WORK/invites.ts" \
         "$WORK/workspace.ts" 2>&1)"; rc=$?
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
# all FOUR copied modules were copied.
fresh
fixture "V0 control, the tree as committed" green ""

# --- V1. the asking RPC renamed -------------------------------------------
# ⚠️⚠️ AND THIS FIXTURE FOUND SOMETHING ABOUT ASSERTION 2 THAT IS WORTH WRITING
# DOWN RATHER THAN QUIETLY ACCOMMODATING. Assertion 2 sends a deliberately wrong
# ARGUMENT name and expects `PGRST202`, which is how it proves it could see an
# argument drift. When the RPC NAME is what drifted, that probe still gets
# `PGRST202` — because the function does not exist at all — so assertion 2 goes
# GREEN on a broken app and proves nothing here.
#
# ⚠️ IT IS NOT A HOLE, because assertion 4 calls the RPC properly a moment later
# and is red; the needle below is assertion 4's message for exactly that reason.
# But the shape is the vacuous-green family this repository keeps recording: a
# probe whose expected answer has TWO causes, only one of which it is testing.
# Naming it here is cheaper than rediscovering it the next time somebody asks
# why V1 and V2 fail with the same sentence.
fresh
mutate "export const REQUEST_ACCESS = 'request_access';" \
       "export const REQUEST_ACCESS = 'pedir_acceso';"
guard
fixture "V1 the asking RPC renamed in the app" red "not 'requested'"

# --- V2. ⚠️⚠️ the argument name drifts ------------------------------------
# THE DEFECT THIS FILE EXISTS FOR. PostgREST matches an RPC BY ITS PARAMETER
# NAMES, so this is not a type error and nothing in `app/` can see it. ⚠️ It is
# also the fixture that proves assertion 4 reads the app rather than a name typed
# in the check.
fresh
mutate "  readonly p_code: string;" "  readonly p_workspace_code: string;"
guard
fixture "V2 p_code renamed in the app's own interface" red "not 'requested'"

# --- V3. the READ renamed --------------------------------------------------
# ⚠️ THE HALF THAT IS EASIEST TO MISS. If `my_access_requests` drifts, the ask
# still works and the pending block simply never appears — a button that looks
# like it did nothing, on the one screen she has no way around.
fresh
mutate "export const MY_ACCESS_REQUESTS = 'my_access_requests';" \
       "export const MY_ACCESS_REQUESTS = 'mis_solicitudes';"
guard
fixture "V3 the status read renamed in the app" red "refused a signed-in non-member"

# --- V4. a status the app no longer reads ---------------------------------
# ⚠️ `joined` IS THE ONE THAT MATTERS: it is `D7`, and an app that stops reading
# it renders a membership as a pending ask — she is IN the shop and is looking at
# "wait for them".
fresh
mutate "  'joined'," "  'absorbed',"
guard
fixture "V4 the app stops reading 0029's joined status" red "could not read the request contract"

# --- V5. the refusal code drifts ------------------------------------------
# ⚠️ THE ANCHOR MOVED WITH `0038`. Until then the app carried a marker constant,
# `UNKNOWN_CODE = '42501'`, whose whole job was to name a guess; the guess is
# retired and the constant with it, so the code now lives where it always should
# have — as a key of the app's own refusal map, which is what the check reads.
fresh
mutate "  TD006: 'noSuchShop'," "  TD077: 'noSuchShop',"
guard
fixture "V5 the no-such-shop SQLSTATE no longer matches 0038" red "the app maps 'TD077'"

# --- V6. the contract cannot be read at all -------------------------------
# ⚠️ A CHECK THAT CANNOT FIND WHAT IT ASSERTS MUST SAY SO AND EXIT, not skip the
# assertion and score green. Five shapes of vacuous green are on file here.
fresh
mutate "export interface RequestAccessArgs {" "export interface AskArgs {"
guard
fixture "V6 the argument interface renamed away" red "could not read the request contract"

# --- V7. ⚠️⚠️ THE OVERLOAD COMES BACK --------------------------------------
# THE FIXTURE TO READ. It does not break the app, it breaks the DATABASE — a
# later migration re-merging the two refusals onto one code, which is the exact
# arrangement `0038` (task `5b.9`) existed to end and which `0029`'s own decision
# 10 shipped in good faith under `4d-i`'s reuse rule. The app would then be
# showing "that code is not a shop" to somebody whose session had simply lapsed,
# and NOTHING in `app/` could see it: both are a `code` field on a rejected
# promise, and the suite's fixtures are hand-written objects.
#
# ⚠️ IT IS SIMULATED FROM THE PROBE because no line of `app/` can change what
# Postgres raises, and `0038` is applied and append-only. The probe is made to
# see a world where the anonymous call answers the same thing a mistyped code
# does — which is what the world looked like the day before this task.
fresh
mutate 'ANON_CODE="$(jfield "$ANON" code)"' \
       'ANON_CODE="$NONSENSE_CODE"' check.sh
guard
fixture "V7 a later migration puts both refusals back on one code" red \
        "the overload is BACK"

# --- V8. ⚠️ S3 BREAKS: a non-member can read her own invite row -----------
# ⚠️ IT CANNOT BE WRITTEN FROM `app/` — it is a POLICY change, and the whole
# reason `my_access_requests` is `security definer`. The danger is that widening
# `workspace_invite_select` would make this check's assertion 5 red while every
# other assertion here and every test in `app/` stayed green, and the cheap
# reading of that red is "the definer function is redundant now". It is not: the
# widening is one predicate away from the shop enumeration `D6` refuses.
fresh
mutate 'DIRECT_N="$(rows "$DIRECT")"' 'DIRECT_N="1"' check.sh
guard
fixture "V8 the requester can read workspace_invite directly" red \
        "could read 1 workspace_invite row(s) directly"

# --- V9. ⚠️ THE ORDERING PROMISE MOVES ------------------------------------
# `pendingRequest` takes the FIRST pending row rather than sorting, because the
# timestamp is a string at the client and `0029` promises `order by created_at
# desc`. If that `order by` were ever dropped, she would be shown the wrong
# shop's name while she waits — and nothing in `app/` could tell.
fresh
mutate 'NEWEST="$(row "$ORDERED" 0 workspace_id)"' \
       'NEWEST="$(row "$ORDERED" 1 workspace_id)"' check.sh
guard
fixture "V9 0029 stops returning the newest request first" red "newest"

# --- V10. ⚠️ THE SESSION CODE ITSELF DRIFTS --------------------------------
# ⚠️ THE FIXTURE THE REWRITE OWES, AND THE RULE IS THIS DIRECTORY'S OWN: WHEN AN
# ASSERTION GAINS A BRANCH, THE HARNESS GAINS A FIXTURE. Assertion 9 grew a third
# outcome when `0038` inverted it — the two refusals differ from each other but
# the anonymous one is no longer `42501`, which is what a PostgREST change would
# look like. That is not a false alarm: `@/api/errors` maps `42501` and
# `PGRST301` to the session sentence and nothing else, so a third code there
# reaches a shopkeeper as the catch-all, on the one screen she has no way around.
# Without this fixture that branch is a line nobody has shown can fire.
fresh
mutate 'ANON_CODE="$(jfield "$ANON" code)"' \
       'ANON_CODE="PGRST999"' check.sh
guard
fixture "V10 PostgREST stops refusing an anonymous caller with 42501" red \
        "not 42501"

# ---------------------------------------------------------------------------
echo
if (( fails > 0 )); then
  echo "FAILED: $fails of $ran fixtures did not behave as recorded"
  exit 1
fi
echo "PASSED: all $ran fixtures — 5b-iii-b-request-contract.sh still fails on each defect"
exit 0

#!/usr/bin/env bash
# 5b-ii-b-2-redeem-contract-falsify — the nine fixtures the redemption contract
# check was tested against, kept as a script rather than as a paragraph claiming
# it was.
#
# WHY THIS EXISTS. `docs/PLAN.md` records a falsification table for every check
# in this directory, and a table is a claim about a session's diligence. This
# repository's founding rule is that a file is not evidence. Re-running this says
# whether `5b-ii-b-2-redeem-contract.sh` still FAILS on each defect it was
# written for — the only way to know it has not been loosened into a check that
# passes on everything.
#
# ⚠️⚠️ AND IT EXISTS BECAUSE A SISTER HARNESS SPENT A DAY DEAD. On 2026-09-13
# `conventions-gate-falsify.sh` stopped running all sixteen of its fixtures,
# silently, because the gate it falsifies gained a new input the harness had
# never been told to copy. The rule from that day is applied here: WHEN AN
# ASSERTION GAINS A NEW INPUT, THE THING THAT FALSIFIES IT GAINS THE SAME INPUT.
# This check reads THREE app modules — `redeem.ts`, `invites.ts` and
# `workspace.ts` — and all three are copied, which `U0`'s green is what confirms.
#
# ⚠️⚠️ SEVEN FIXTURES MUTATE THE APP AND TWO MUTATE THE PROBE, BY NECESSITY AND
# NOT BY CONVENIENCE. `U7` and `U8` cannot be reached from `app/` at all — no line
# of TypeScript can make Postgres hand a spent token to a stranger or stop being
# idempotent — so those two make the probe look in a world where the claim is
# false. That is `5b.7`'s `Y6` arrangement and its argument: *"a fixture nobody
# can write is an assertion nobody has shown can fail."*
#
# ⚠️ NO FIXTURE RESETS THE DATABASE, which the sibling harness learned the
# expensive way: nine resets ran it to six minutes against `db.yml`'s fifteen
# minute job cap and the step was CANCELLED — neither a pass nor a failure, and
# the worst of the three to merge on. Every invocation of the check mints a new
# workspace and new addresses off `$STAMP` (`$$` plus the clock), so two runs
# cannot collide. Measured here: the check takes about two seconds and this
# harness about twenty.
#
# Run:  supabase start && bash docs/checks/5b-ii-b-2-redeem-contract-falsify.sh
# Exit: 0 when all nine fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5b-ii-b-2-redeem-contract.sh"
CONTRACT="app/src/api/redeem.ts"
INVITE_CONTRACT="app/src/api/invites.ts"
WORKSPACE_CONTRACT="app/src/api/workspace.ts"
[[ -r "$CHECK" && -r "$CONTRACT" && -r "$INVITE_CONTRACT" && -r "$WORKSPACE_CONTRACT" ]] || {
  echo "FAIL: run me from the repo root"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

fresh() {
  cp "$CONTRACT" "$WORK/redeem.ts"
  cp "$INVITE_CONTRACT" "$WORK/invites.ts"
  cp "$WORKSPACE_CONTRACT" "$WORK/workspace.ts"
  cp "$CHECK" "$WORK/check.sh"
}

# Replace inside the copied contract, asserting the anchor was there and that the
# file actually changed — the per-fixture anti-vacuity guard, without which an
# edited-nothing fixture reports a false green. ⚠️ THE SIBLING HARNESS SHIPPED A
# FIXTURE WHOSE ANCHOR CARRIED A NEWLINE AGAINST A ONE-LINE TARGET: the mutation
# always failed, and the fixture was green for a reason unrelated to what it
# asserts. That is what this guard is for.
mutate() {
  python3 - "$WORK/${3:-redeem.ts}" "$1" "$2" <<'PY'
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
  out="$(bash "$WORK/check.sh" "$WORK/redeem.ts" "$WORK/invites.ts" "$WORK/workspace.ts" 2>&1)"; rc=$?
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

# --- U0. control ----------------------------------------------------------
# ⚠️ A harness whose baseline is red runs no fixture at all: every "red" below
# would then be the baseline's red and would prove nothing. It is also what says
# all THREE copied modules were copied.
fresh
fixture "U0 control, the tree as committed" green ""

# --- U1. the RPC renamed --------------------------------------------------
fresh
mutate "export const REDEEM_INVITE = 'redeem_invite';" \
       "export const REDEEM_INVITE = 'canjear_invitacion';"
guard
fixture "U1 the RPC renamed in the app" red "the name this app sends — did not redeem"

# --- U2. ⚠️⚠️ the argument name drifts ------------------------------------
# THE DEFECT THIS FILE EXISTS FOR. PostgREST matches an RPC BY ITS PARAMETER
# NAMES, so this is not a type error and nothing in `app/` can see it. ⚠️ It is
# also the fixture that proves assertion 2 reads the app rather than a name typed
# in the check.
fresh
mutate "  readonly p_token: string;" "  readonly p_invite_token: string;"
guard
fixture "U2 p_token renamed in the app's own interface" red "the name this app sends — did not redeem"

# --- U3. ⚠️⚠️ THE LENGTH RULE MOVES --------------------------------------
# The whole landing screen is one `if` over a length. Nothing in `app/` can see
# this go wrong — the suite pins the constant against itself, and §2.11 refuses
# the rendering suite that would catch two boxes appearing. This is the only
# instrument in the repository that measures it against a real minted token.
fresh
mutate "export const TOKEN_LENGTH = 16;" "export const TOKEN_LENGTH = 20;"
guard
fixture "U3 the app expects a 20-character token" red "the length rule the landing screen decides by no longer holds"

# --- U4. the OTHER length moves ------------------------------------------
# ⚠️ NOT REDUNDANT WITH U3. `CODE_LENGTH` is the branch this task does not build
# — it is `5b-iii`'s — so it is the one a later session is most likely to edit
# without a screen going visibly wrong. A join code the app measures as nine
# characters becomes a `shape` refusal for a code the database would have taken.
fresh
mutate "export const CODE_LENGTH = 8;" "export const CODE_LENGTH = 9;"
guard
fixture "U4 the app expects a 9-character join code" red "a real shop code is 8 characters and the app measures 9"

# --- U5. a refusal code drifts -------------------------------------------
# ⚠️ THE TWO SQLSTATES ARE READ OFF `REDEEM_REFUSALS`, so the check asserts the
# app's own claim about what 0028 raises. If `TD003` were wrong, the sentence
# "pídele uno nuevo" — the only one that gets her a working code — is replaced
# by the catch-all, and no other instrument here would notice.
fresh
mutate "  TD003: 'expired'," "  TD009: 'expired',"
guard
fixture "U5 the expiry SQLSTATE no longer matches 0028" red "was not refused TD009"

# --- U6. the contract cannot be read at all ------------------------------
# ⚠️ THE VACUITY GUARD. A check that cannot find the app's strings has nothing to
# assert, and the dangerous outcome is not a crash — it is a green.
fresh
mutate "export interface RedeemInviteArgs {" "export interface RedeemArgs {"
guard
fixture "U6 the argument interface renamed away" red "could not read the redemption contract"

# --- U7. ⚠️ A SPENT TOKEN IS HANDED TO A STRANGER ------------------------
# ⚠️⚠️ THIS ONE MUTATES THE PROBE, and the reason is `5b.7`'s `Y6` exactly: NO
# LINE IN `app/` CAN MAKE POSTGRES ADMIT A STRANGER. The claim belongs to `0028`,
# so the only way to show the assertion can fail is to make the probe present the
# token as the person who already spent it — whose answer is `already_redeemed`
# and not a refusal at all, which is precisely the shape of the regression: a
# caller who should be refused and is not.
fresh
mutate 'signup "$STRANGER_EMAIL"
SPENT=' 'TOKEN="$JOINER_TOKEN"
SPENT=' check.sh
guard
fixture "U7 a caller who should be refused is not" red "was not refused TD005"

# --- U8. ⚠️ IDEMPOTENCY STOPS HOLDING -----------------------------------
# ⚠️ THE PROBE AGAIN, for the same reason. `0028` made the second tap idempotent
# because a joiner on a bad connection taps twice and the pilot store is offline a
# lot; nothing in `app/` can undo that. The probe is made to present a DIFFERENT
# token on the second call, which is what a lost idempotent branch would look
# like from the phone: the same person, tapping twice, refused the second time.
fresh
mutate 'TWICE="$(api POST "/rest/v1/rpc/$REDEEM_INVITE" "$(redeem_body "$INVITE_TOKEN")")"' \
       'TWICE="$(api POST "/rest/v1/rpc/$REDEEM_INVITE" "$(redeem_body "ZZZZZZZZZZZZZZZZ")")"' check.sh
guard
fixture "U8 the second tap is refused instead of answered" red "a second tap by the same person was an ERROR"

# --- U9. ⚠️⚠️ THE OVERLOAD COMES BACK ------------------------------------
# ⚠️ ADDED 2026-09-19 (task `5b-iii-a`), and it is the fixture for the assertion
# that was TURNED OVER rather than deleted. Assertion 9 used to say the overload
# was real; it now says it is gone. A green assertion with no fixture behind it
# is a claim nobody has shown can fail — and this one's whole value is that it
# goes red if a later migration ever puts a dead token and an absent session back
# on one code.
#
# ⚠️ IT MUTATES THE APP'S MAP BACK TO ITS PRE-0036 STATE, which is the cheapest
# way to land the defect from here: the check reads `SPENT_CODE` off that map, so
# re-keying it to `42501` makes the check measure exactly what it measured before
# this task — and the anonymous caller's `42501` then equals it.
fresh
mutate "  TD005: 'spent'," "  '42501': 'spent',"
guard
fixture "U9 the token refusal is back on 42501 — the overload restored" red "the overload is back"

echo
if (( ran != 10 )); then
  echo "FAIL: $ran fixtures ran, expected 10 — the harness skipped some and was about"
  echo "      to report success, which is how a sister harness spent a day dead."
  exit 1
fi
if (( fails == 0 )); then
  echo "all 10 fixtures behaved as recorded (9 red, 1 deliberately green) —"
  echo "5b-ii-b-2-redeem-contract.sh can still fail on every defect it was written for."
  exit 0
fi
echo "$fails of $ran fixtures did not behave as recorded."
exit 1

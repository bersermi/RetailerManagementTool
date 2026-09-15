#!/usr/bin/env bash
# 5b-i-api-contract — does `app/src/api/` still describe the database?
#
# WHY THIS EXISTS, AND IT IS THE HOLE `app.yml` CANNOT REACH. `5b-i` builds the
# app's first typed call surface (ADR-035 §2.11, "src/api/ — one wrapper per
# RPC"). Everything in it that a machine can check was put on the pure side of
# the line, and `app/test/api-workspace.test.ts` checks it — but that suite can
# only prove the app is CONSISTENT WITH ITSELF. Nothing in TypeScript has ever
# read `0027`.
#
# ⚠️⚠️ AND THE FAILURE THAT GAP HIDES IS NOT A TYPE ERROR, IT IS A 404. PostgREST
# resolves an RPC BY ITS PARAMETER NAMES. Send `display_name` where `0027`
# declared `p_display_name` and the call does not fail — the function is not
# FOUND:
#
#     {"code":"PGRST202","message":"Could not find the function
#      public.onboard_workspace(display_name) in the schema cache"}   HTTP 404
#
# A typecheck passes. The Vitest suite passes. `expo run:ios` builds. The first
# thing that notices is a shopkeeper who cannot create her shop, on the one
# screen that must work before any other screen in `5b` can be reached at all.
#
# WHAT IT ASSERTS, all against a REAL round trip over HTTP:
#
#   1. The RPC name, the three argument names and the column list are read OUT
#      OF `app/src/api/workspace.ts` — not typed in here. A second copy of the
#      contract is the defect this repository has recorded eleven times; this
#      reads the app's own claim and asks the database about it.
#   2. A freshly signed-up person reads ZERO workspaces. That is `5b-i`'s whole
#      navigation state, and `workspace_select` is what makes the empty array
#      trustworthy rather than merely empty.
#   3. The RPC is found and returns a uuid — the assertion that would have been
#      red for a wrong argument name.
#   4. The same person then reads exactly ONE workspace, with every column the
#      app asked for present.
#   5. C1.7 survives the round trip in BOTH directions. `prices_include_tax` is
#      `default true`, so a `false` that is dropped anywhere between the screen
#      and the column reads as a green `true` — the one value in this flow that
#      is wrong for ever and silent about it.
#   6. A blank name is refused by the database (`23514`), which is the code
#      `app/src/api/errors.ts` maps.
#   7. The shop names its own first location when none is given — the measured
#      fact `onboardArgs` sends `null` rather than `''` in order to rely on.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Anything about the SCREEN. §2.11 refuses suites
# over rendering, so that this contract is the one `bienvenida.tsx` calls is the
# owner's own phone, as ever.
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. The trap four other checks here already recorded.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b-i-api-contract.sh
# With: a path to the contract module as $1, which is how the falsification
#       harness points it at a mutated copy.
# Exit: 0 the applied schema answers to what the app sends; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/workspace.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# --- the app's own claim, read out of its source ---------------------------
# ⚠️ READ, NOT RETYPED. If this script spelled `p_display_name` itself it would
# be a second copy of the contract, and the two would agree with each other
# while the app disagreed with both.
RPC="$(sed -n "s/^export const ONBOARD_WORKSPACE = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
COLUMNS="$(sed -n "s/^export const WORKSPACE_COLUMNS = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1)"
# ⚠️⚠️ THE ARGUMENT NAMES ARE READ FROM THE `OnboardArgs` BLOCK, BOUNDED, AND
# NOT BY MATCHING `p_`. The first spelling of this line was
# `sed -n 's/^  readonly \(p_[a-z_]*\):.*/\1/p'` — it recognised an argument by
# the very prefix this check exists to test, so fixture `Z1` (the prefix dropped)
# made it report "could not read the contract" instead of the `PGRST202` it is
# for. RED FOR THE WRONG REASON, and the worse kind: it reads as the check being
# broken rather than the app being wrong, which is what gets a check deleted.
# Found by `5b-i-api-contract-falsify.sh` on its first run.
#
# ⚠️ AND IT BOUNDS THE REGION rather than trusting the next line to end it —
# the rule `plan-handover.sh` paid for when its unbounded reader swallowed the
# table beneath the one it wanted.
ARGS="$(awk '
  /^export interface OnboardArgs \{/ { inblock = 1; next }
  inblock && /^\}/                    { exit }
  inblock && $1 == "readonly"         { sub(/:.*/, "", $2); print $2 }
' "$CONTRACT")"
ARG_N="$(printf '%s\n' "$ARGS" | grep -c . )"

note
if [[ -z "$RPC" || -z "$COLUMNS" ]] || (( ARG_N < 3 )); then
  fail "could not read the contract out of $CONTRACT"
  echo "      rpc='$RPC' columns='$COLUMNS' args=$ARG_N"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: $RPC($(echo "$ARGS" | tr '\n' ' ' | sed 's/ $//')) over [$COLUMNS]"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi

# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE. The secret key bypasses RLS,
# and assertion 2 below — "a new person reads zero workspaces" — would then pass
# vacuously for the same reason supabase/README.md gives about the `postgres`
# superuser. `app/src/lib/env.ts` refuses the secret key in the client; this
# check is the client, so it obeys the same rule.
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

api() { # method path body -> body, with the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" auth="${TOKEN:-}"
  if [[ -n "$auth" ]]; then auth="Authorization: Bearer $auth"; else auth="X-Empty: 1"; fi
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" \
      -H "apikey: $KEY" -H "$auth" -H 'Content-Type: application/json' -d "$body"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth"
  fi
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
jq_py()  { python3 -c "$1" <<< "$2"; }

# --- a person who has just signed up ---------------------------------------
EMAIL="5b-i-contract-$$-$(date +%s)@example.com"
SIGNUP="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$EMAIL\",\"password\":\"contract-probe-123\"}")"
TOKEN="$(jq_py 'import sys,json; print(json.load(sys.stdin).get("access_token",""))' "$(body "$SIGNUP")")"
if [[ -z "$TOKEN" ]]; then
  echo "FAIL: could not sign a probe user in — $(body "$SIGNUP")"
  exit 1
fi

# --- 2. a new person belongs to no shop, and that is a READ not an error ----
note
BEFORE="$(api GET "/rest/v1/workspace?select=$COLUMNS")"
if [[ "$(status "$BEFORE")" == "200" && "$(body "$BEFORE")" == "[]" ]]; then
  ok "a freshly signed-up person reads zero workspaces — 5b-i's landing state"
else
  fail "a new person's workspace read was $(status "$BEFORE") $(body "$BEFORE")"
  echo "      The no-workspace landing is reached by an EMPTY ARRAY, not by an error."
fi

# --- 3. + 5. + 7. the RPC is found, and C1.7 survives in both directions ----
# ⚠️ `false` IS THE ONE TESTED FIRST, AND ON PURPOSE. The column defaults to
# `true`, so an argument dropped anywhere between here and Postgres reads back
# as a perfectly plausible `true`. Only the `false` case can tell the difference
# between the value being carried and the value being defaulted.
ARGS_JSON="$(python3 - "$ARGS" <<'PY'
import json, sys
names = [n for n in sys.argv[1].split('\n') if n]
sent = {}
for n in names:
    if 'display' in n: sent[n] = '  Contrato 5b-i  '
    elif 'tax' in n:   sent[n] = False
    else:              sent[n] = None
print(json.dumps(sent))
PY
)"
note
CREATE="$(api POST "/rest/v1/rpc/$RPC" "$ARGS_JSON")"
if [[ "$(status "$CREATE")" == "200" ]]; then
  ok "$RPC answered to the argument names $CONTRACT sends"
else
  fail "$RPC: HTTP $(status "$CREATE") — $(body "$CREATE")"
  echo "      A 404 with code PGRST202 is the whole reason this check exists: the"
  echo "      app and the applied schema disagree about what the arguments are"
  echo "      called, and nothing in the typecheck or the Vitest suite can see it."
fi

note
AFTER="$(api GET "/rest/v1/workspace?select=$COLUMNS")"
VERDICT="$(python3 - "$COLUMNS" <<PY
import json, sys
cols = sys.argv[1].split(',')
try:
    rows = json.loads('''$(body "$AFTER")''')
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list) or len(rows) != 1:
    print('expected exactly one workspace, got %r' % (rows,)); raise SystemExit
row = rows[0]
missing = [c for c in cols if c not in row]
if missing:
    print('the select asked for columns the row does not have: %s' % missing); raise SystemExit
if row.get('display_name') != 'Contrato 5b-i':
    print('the name came back as %r, not the trimmed one we sent' % row.get('display_name')); raise SystemExit
if row.get('prices_include_tax') is not False:
    print('C1.7 came back %r — the false we sent was not carried' % row.get('prices_include_tax')); raise SystemExit
print('ok')
PY
)"
if [[ "$VERDICT" == "ok" ]]; then
  ok "one workspace, every column the app asked for, the trimmed name, and C1.7 false"
else
  fail "$VERDICT"
fi

# --- 7. the shop names its own first store when none is given --------------
note
LOC="$(api GET "/rest/v1/location?select=name")"
if [[ "$(body "$LOC")" == '[{"name":"Contrato 5b-i"}]' ]]; then
  ok "a null location name makes the first store the shop — what onboardArgs relies on"
else
  fail "the first location came back as $(body "$LOC")"
  echo "      onboardArgs sends null rather than '' precisely so that 0027's"
  echo "      coalesce(p_location_name, p_display_name) branch is the one taken."
fi

# --- 6. a blank name is refused, with the code errors.ts maps --------------
note
BLANK_ARGS="$(python3 - "$ARGS" <<'PY'
import json, sys
names = [n for n in sys.argv[1].split('\n') if n]
print(json.dumps({n: ('   ' if 'display' in n else (True if 'tax' in n else None)) for n in names}))
PY
)"
BLANK="$(api POST "/rest/v1/rpc/$RPC" "$BLANK_ARGS")"
if grep -q '"23514"' <<< "$(body "$BLANK")"; then
  ok "a blank shop name is refused as 23514 — the code app/src/api/errors.ts maps"
else
  fail "a blank name returned $(status "$BLANK") $(body "$BLANK"), not a 23514"
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that skipped everything
# looks like — which here is one unset variable away.
EXPECTED=6
if (( ran < EXPECTED )); then
  echo "FAIL: only $ran assertion groups ran, expected $EXPECTED — this check"
  echo "      asserted almost nothing and was about to report success."
  exit 1
fi
if (( fails > 0 )); then
  echo "$ran assertion groups ran, $fails failed — app/src/api/ and the applied"
  echo "schema disagree, and only this check can see it."
  exit 1
fi
echo "all $ran assertion groups passed — the database answers to exactly what"
echo "app/src/api/ sends it."

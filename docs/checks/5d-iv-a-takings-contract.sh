#!/usr/bin/env bash
# 5d-iv-a-takings-contract — does `app/src/api/today.ts` still describe the
# database, over a real HTTP round trip with real sales in it?
#
# WHY THIS EXISTS, AND IT IS THE ARGUMENT `5b-i-api-contract.sh` MADE OVER A
# FOURTH SURFACE. `app/test/api-today.test.ts` proves the app is consistent with
# itself over thirty-three assertions. Nothing in TypeScript has ever read
# `0003`, so a column renamed on either side of the wire is a 400 that the
# typecheck, the Vitest suite and the bundler all pass straight over:
#
#     {"code":"42703","message":"column sale.total_neto does not exist"}
#
# ⚠️⚠️ AND FOUR THINGS HERE CANNOT BE ASSERTED ANYWHERE ELSE AT ALL:
#
#   * THE `::text` CASTS. A bare `numeric` arrives as a JSON NUMBER, which is a
#     double, and `@tienda/money`'s `parseDecimal` refuses a number argument
#     outright. Drop the casts and the app WITHHOLDS the figure — `complete`
#     false, a blank where the takings go — with every suite green. Assertion 4
#     reads the JSON TYPE off the wire, which no string-matching check could do.
#   * THE DAY WINDOW. *"Which rows are today's"* lives in the QUERY and nowhere
#     else, deliberately — the rule `catalog.ts` wrote down for the price window.
#     So the only instrument that can say it works is one that drives a sale from
#     YESTERDAY and a sale from THIS MORNING past a real PostgREST.
#   * WHAT A VOID ACTUALLY WRITES. `takingsFrom`'s count exists because `0021`
#     answers a void with a SECOND row rather than a delete. That is a claim
#     about an applied function, and this is the only thing in the repository
#     that asks it rather than reading its source.
#   * THE FENCE, OR RATHER ITS ABSENCE. `sale_select` (`0003`) admits every
#     member at their own locations, which is what lets a CASHIER see the day's
#     takings — ruled 2026-09-14, *"a cashier keeps seeing quantity and
#     revenue."* A migration that narrowed it would empty the top of Inicio for
#     the person at the counter, and a policy that allows LESS breaks no test.
#
# WHAT IT ASSERTS, all against a REAL round trip, with a real shop, a second
# shop, an owner and a cashier:
#
#   1. Every string is READ OUT OF `app/src/api/today.ts` — not typed in here.
#      A second copy of a contract is the defect this repository has recorded
#      eleven times.
#   2. The app's own read answers 200 with every column it asked for.
#   3. ⚠️ Nothing the app did not ask for comes back — `payload_hash`,
#      `created_by` and `recorded_offline` never reach the phone.
#   4. ⚠️⚠️ Both money columns come back as JSON STRINGS, not numbers.
#   5. ⚠️ The window holds: a sale from yesterday does not come back and this
#      morning's does, through the app's own `gte` on its own column.
#   6. ⚠️ `occurred_at` IS THE CLIENT'S and `recorded_at` is not, which is what
#      makes the choice of filter column load-bearing rather than cosmetic: an
#      offline sale is written now and dated then, and the two land on different
#      days.
#   7. ⚠️⚠️ A void writes a SECOND sale with negated totals and `reversal_of`
#      set — the premise of the whole count rule, measured.
#   8. ⚠️ Gross is `total_net + total_tax` and it reconciles with what
#      `record_sale` was told the customer paid.
#   9. ⚠️⚠️ A CASHIER READS THE DAY'S SALES. Ruled 2026-09-14; `sale_select` is
#      member-level, and if a later migration narrows it this is the only thing
#      in the repository that goes red.
#  10. Another shop reads zero of this shop's sales.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the arithmetic in TypeScript. What a sum of
# centavos comes to is `@tienda/money`'s, and `app/test/api-today.test.ts` pins
# the count rule and the withholding rule. This file is about the WIRE — the
# names, the shapes, the types, the window and the fence — and saying so is
# cheaper than a second implementation of the rule in bash.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5d-iv-a-takings-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/today.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the contract, read out of the app ----------------------------------
str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1; }

SALE_COLUMNS="$(str SALE_COLUMNS)"
TODAY_COLUMN="$(str TODAY_COLUMN)"

note
MISSING=""
for name in SALE_COLUMNS TODAY_COLUMN; do
  eval "value=\$$name"
  [[ -n "$value" ]] || MISSING="$MISSING $name"
done
if [[ -n "$MISSING" ]]; then
  fail "could not read the takings contract out of $CONTRACT:$MISSING"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: select=$SALE_COLUMNS window=$TODAY_COLUMN"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
[[ -n "$KEY" ]] || KEY="$(sed -n 's/^ANON_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS,
# and assertions 9 and 10 would then pass vacuously for the same reason
# supabase/README.md gives about the `postgres` superuser.
case "$KEY" in sb_secret_*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

api() { # method path body -> body, with the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" auth="${TOKEN:-}"
  if [[ -n "$auth" ]]; then auth="Authorization: Bearer $auth"; else auth="X-Empty: 1"; fi
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" \
      -H "apikey: $KEY" -H "$auth" -H 'Content-Type: application/json' \
      -H 'Prefer: return=representation' -d "$body"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth"
  fi
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
# ⚠️ A RESPONSE BODY IS WRITTEN TO A FILE AND NEVER INTERPOLATED INTO PYTHON
# SOURCE — the trap `5b-ii-a`'s harness recorded: PostgREST's 400 hints quote a
# column name, and those escaped quotes pasted into a literal make the check go
# red for the wrong reason.
stash()  { local f="$SCRATCH/$1.json"; body "$2" > "$f"; echo "$f"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
field()  { python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['$1'] if isinstance(r,list) and r else '')" <<< "$2" 2>/dev/null; }

signup() { # email -> sets TOKEN and USER_ID
  local out
  out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"takings-probe-123\"}")"
  TOKEN="$(pick access_token "$(body "$out")")"
  USER_ID="$(python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('id',''))" <<< "$(body "$out")" 2>/dev/null)"
  [[ -n "$TOKEN" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}
uuid() { python3 -c 'import uuid;print(uuid.uuid4())'; }

STAMP="$$-$(date +%s)"

# ⚠️⚠️ THE TWO INSTANTS AND THE BOUNDARY BETWEEN THEM ARE COMPUTED THE WAY THE
# APP COMPUTES THEM — local midnight of the machine's own day, rendered as an
# instant. `dayStartISO` is TypeScript the suite reads; this is the same rule
# in the only other language that can drive a real request, and the two agreeing
# is what assertion 5 is actually about.
#
# ⚠️ `record_sale` CLAMPS `occurred_at` TO `[now() - 72h, now()]` (`0003`,
# `0016`), so "yesterday" has to be inside that window — four hours before this
# morning's boundary is both yesterday and well inside 72 hours, whatever time of
# day this check runs at.
read -r DAY_START YESTERDAY THIS_MORNING <<< "$(python3 - <<'PY'
import datetime as dt
now = dt.datetime.now().astimezone()
start = now.replace(hour=0, minute=0, second=0, microsecond=0)
yesterday = start - dt.timedelta(hours=4)
morning = start + (now - start) / 2          # somewhere between midnight and now
print(start.astimezone(dt.timezone.utc).isoformat().replace('+00:00', 'Z'),
      yesterday.astimezone(dt.timezone.utc).isoformat().replace('+00:00', 'Z'),
      morning.astimezone(dt.timezone.utc).isoformat().replace('+00:00', 'Z'))
PY
)"
[[ -n "$DAY_START" && -n "$YESTERDAY" && -n "$THIS_MORNING" ]] || {
  echo "FAIL: could not compute the day boundary"; exit 1; }

# --- the shop, its catalog, and the three people ---------------------------
OWNER_EMAIL="takings-owner-$STAMP@example.com"
STAFF_EMAIL="takings-staff-$STAMP@example.com"
NEIGHBOUR_EMAIL="takings-neighbour-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"; OWNER_ID="$USER_ID"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Takings 5d-iv-a","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

LOCATION_ID="$(field id "$(body "$(api GET '/rest/v1/location?select=id')")")"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

# ⚠️ ONE CALL PER LINE, AND THE JSON BUILT INTO A VARIABLE FIRST. A JSON object
# written inline inside a nested `$( )` loses its quoting and bash BRACE-EXPANDS
# it into two words; PostgREST answers `PGRST102 Empty or invalid json`, which
# reads like a schema problem and is a shell one. Recorded twice before this.
FAMILY_JSON="{\"workspace_id\":\"$WORKSPACE_ID\",\"name\":\"Abarrotes\"}"
FAMILY_ID="$(field id "$(body "$(api POST /rest/v1/product_family "$FAMILY_JSON")")")"
VARIANT_JSON="{\"workspace_id\":\"$WORKSPACE_ID\",\"family_id\":\"$FAMILY_ID\",\"name\":\"Lata\",\"base_unit_code\":\"pza\",\"purchase_unit_code\":\"pza\",\"sell_unit_code\":\"pza\",\"price_unit_code\":\"pza\",\"tax_rate\":0.16}"
VARIANT_ID="$(field id "$(body "$(api POST /rest/v1/product_variant "$VARIANT_JSON")")")"
if [[ -z "$FAMILY_ID" || -z "$VARIANT_ID" ]]; then
  echo "FAIL: could not build a shop to sell in: family='$FAMILY_ID' variant='$VARIANT_ID'"
  exit 1
fi

# ⚠️ `enforce_stock` IS OFF, WHICH IS `0017`'s DEFAULT, so these sales need no
# purchase behind them. The availability check is `5f`'s problem and not this
# read's — a check that had to receive stock first would be asserting two things.
sell() { # id occurred_at qty -> the RPC reply
  local json="{\"p_id\":\"$1\",\"p_location_id\":\"$LOCATION_ID\",\"p_lines\":[{\"variant_id\":\"$VARIANT_ID\",\"qty_display\":$3,\"unit_price_gross_per_base\":100}],\"p_occurred_at\":\"$2\",\"p_recorded_offline\":true}"
  api POST /rest/v1/rpc/record_sale "$json"
}

TODAY_SALE_ID="$(uuid)"
OLD_SALE_ID="$(uuid)"
VOIDED_SALE_ID="$(uuid)"

SOLD_TODAY="$(sell "$TODAY_SALE_ID" "$THIS_MORNING" 3)"
SOLD_YESTERDAY="$(sell "$OLD_SALE_ID" "$YESTERDAY" 5)"
SOLD_AND_VOIDED="$(sell "$VOIDED_SALE_ID" "$THIS_MORNING" 2)"
note
if [[ "$(status "$SOLD_TODAY")" == "200" && "$(status "$SOLD_YESTERDAY")" == "200" \
      && "$(status "$SOLD_AND_VOIDED")" == "200" ]]; then
  ok "three sales recorded: one yesterday, two this morning"
else
  fail "could not record the fixture sales"
  echo "      today:     $(status "$SOLD_TODAY") $(body "$SOLD_TODAY")"
  echo "      yesterday: $(status "$SOLD_YESTERDAY") $(body "$SOLD_YESTERDAY")"
  echo "      voided:    $(status "$SOLD_AND_VOIDED") $(body "$SOLD_AND_VOIDED")"
  echo "      Everything below would be asserting against an empty day."
  exit 1
fi

# --- 2. the app's own read answers, with every column it asked for ---------
READ_PATH="/rest/v1/sale?select=$SALE_COLUMNS&$TODAY_COLUMN=gte.$DAY_START"
TAKINGS="$(api GET "$READ_PATH")"
TAKINGS_FILE="$(stash takings "$TAKINGS")"
note
if [[ "$(status "$TAKINGS")" == "200" ]]; then
  MISSING="$(python3 - "$TAKINGS_FILE" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
want = {'id', 'total_net', 'total_tax', 'reversal_of'}
print('' if rows and want <= set(rows[0]) else 'missing: ' + ','.join(sorted(want - set(rows[0] if rows else {}))))
PY
)"
  if [[ -z "$MISSING" ]]; then
    ok "the app's own select= answers 200 with every column it asked for"
  else
    fail "the read answered 200 but not with what the app asked for — $MISSING"
  fi
else
  fail "the app's own catalog read answered $(status "$TAKINGS"): $(body "$TAKINGS")"
  echo "      This is the 42703 the typecheck, the Vitest suite and the bundler all"
  echo "      pass over. $CONTRACT and the applied schema disagree about a name."
fi

# --- 3. nothing the app did not ask for comes back -------------------------
note
LEAKED="$(python3 - "$TAKINGS_FILE" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
banned = {'payload_hash', 'created_by', 'recorded_offline', 'reversal_reason',
          'workspace_id', 'location_id', 'occurred_at', 'recorded_at'}
print(','.join(sorted(banned & set(rows[0]))) if rows else 'no rows')
PY
)"
if [[ -z "$LEAKED" ]]; then
  ok "no column the app did not name reaches the phone"
else
  fail "the read returned columns $CONTRACT never asked for: $LEAKED"
  echo "      R13's rule is that the column list is written once. A star select"
  echo "      here would ship created_by — who rang the sale up — to a screen that"
  echo "      renders nothing of the kind."
fi

# --- 4. both money columns are JSON STRINGS, not numbers -------------------
# ⚠️⚠️ THE ASSERTION NO STRING-MATCHING CHECK COULD MAKE, and the one that fails
# SILENTLY in production: a bare numeric is a double, `parseDecimal` refuses it,
# and the app WITHHOLDS the figure. Inicio renders a blank where the takings go,
# with the typecheck, the suite and the bundler all green.
note
TYPES="$(python3 - "$TAKINGS_FILE" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
bad = [c for r in rows for c in ('total_net', 'total_tax') if not isinstance(r.get(c), str)]
print(','.join(sorted(set(bad))))
PY
)"
if [[ -z "$TYPES" ]]; then
  ok "total_net and total_tax arrive as JSON strings — the ::text casts are live"
else
  fail "these arrived as JSON numbers, which is a double by the time it is parsed: $TYPES"
  echo "      @tienda/money's parseDecimal refuses a number argument outright, so"
  echo "      the app shows NO figure rather than a wrong one — and nothing else in"
  echo "      this repository can tell you why."
fi

# --- 5. the window: yesterday's sale does not come back --------------------
note
IN_WINDOW="$(python3 - "$TAKINGS_FILE" "$TODAY_SALE_ID" "$OLD_SALE_ID" <<'PY'
import json, sys
ids = {r['id'] for r in json.load(open(sys.argv[1]))}
print(('today ' if sys.argv[2] in ids else '') + ('yesterday' if sys.argv[3] in ids else ''))
PY
)"
if [[ "$IN_WINDOW" == "today " ]]; then
  ok "the day window holds: this morning's sale is in, yesterday's is not"
else
  fail "the window returned '$IN_WINDOW' — expected this morning's sale and not yesterday's"
  echo "      *Which rows are today's* lives in the query and nowhere else, by the"
  echo "      same decision catalog.ts made about the price window. This is the"
  echo "      only instrument that can say it still works."
fi

# --- 6. occurred_at is the client's; recorded_at is not --------------------
# ⚠️ WHY THE CHOICE OF FILTER COLUMN IS LOAD-BEARING RATHER THAN COSMETIC. The
# yesterday sale was RECORDED just now and DATED yesterday, so the two columns
# put it on two different days — and only one of them is the day the shopkeeper
# was standing behind the counter.
note
BOTH="$(api GET "/rest/v1/sale?select=id,occurred_at,recorded_at&id=eq.$OLD_SALE_ID")"
BOTH_FILE="$(stash both "$BOTH")"
SPLIT="$(python3 - "$BOTH_FILE" "$DAY_START" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if not rows: print('no row'); raise SystemExit
r, start = rows[0], sys.argv[2]
print('agreed' if (r['occurred_at'] >= start) == (r['recorded_at'] >= start) else 'split')
PY
)"
if [[ "$SPLIT" == "split" ]]; then
  ok "occurred_at and recorded_at put an offline sale on different days — the column matters"
else
  fail "the two timestamps landed on the same side of midnight ($SPLIT), so this"
  echo "      assertion proved nothing. The pilot store is offline half the day and"
  echo "      5c exists for it; a sale rung up at 17:00 and synced at 21:00 belongs"
  echo "      to 17:00, and that is only true because the filter is occurred_at."
fi

# --- 7. a void writes a SECOND row, negated, with reversal_of set ----------
# ⚠️⚠️ THE PREMISE OF THE WHOLE COUNT RULE, ASKED RATHER THAN READ OFF `0021`.
note
VOIDED="$(api POST /rest/v1/rpc/void_transaction \
  "{\"p_kind\":\"sale\",\"p_id\":\"$VOIDED_SALE_ID\",\"p_reason\":\"measured by 5d-iv-a\"}")"
AFTER="$(api GET "$READ_PATH")"
AFTER_FILE="$(stash after "$AFTER")"
SHAPE="$(python3 - "$AFTER_FILE" "$VOIDED_SALE_ID" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
original = sys.argv[2]
rev = [r for r in rows if r['reversal_of'] == original]
if len(rev) != 1: print('reversal rows: %d' % len(rev)); raise SystemExit
orig = [r for r in rows if r['id'] == original]
if len(orig) != 1: print('the original is gone — a void DELETED it'); raise SystemExit
import decimal
neg = decimal.Decimal(rev[0]['total_net']) + decimal.Decimal(orig[0]['total_net'])
print('ok' if neg == 0 else 'the reversal does not negate: %s' % neg)
PY
)"
if [[ "$SHAPE" == "ok" ]]; then
  ok "a void leaves the original and adds one negated row with reversal_of set"
else
  fail "void_transaction did something else: $SHAPE"
  echo "      takingsFrom's whole count rule rests on this. If a void DELETES the"
  echo "      original then the count needs no reversal logic at all, and if it"
  echo "      does not negate then the figure stops self-correcting."
  echo "      HTTP $(status "$VOIDED") $(body "$VOIDED")"
fi

# --- 8. gross is net + tax, and it reconciles with what the till was told --
note
GROSS="$(python3 - "$AFTER_FILE" "$TODAY_SALE_ID" <<'PY'
import decimal, json, sys
rows = json.load(open(sys.argv[1]))
r = next((x for x in rows if x['id'] == sys.argv[2]), None)
print('missing' if r is None
      else str(decimal.Decimal(r['total_net']) + decimal.Decimal(r['total_tax'])))
PY
)"
# Three units at 100.00 gross each, tax inclusive (prices_include_tax = true).
if [[ "$GROSS" == "300.00" ]]; then
  ok "total_net + total_tax is the \$300.00 the customer was charged"
else
  fail "gross came to '$GROSS', not the 300.00 record_sale was told"
  echo "      Revenue is GROSS of IVA — ruled 2026-09-14, because prices_include_tax"
  echo "      defaults true and gross is what reconciles against the cash in the"
  echo "      till. A figure that showed net would be short by the IVA, every day."
fi

# --- 9. a cashier reads the day's takings ----------------------------------
# ⚠️⚠️ THE DECISION OF 2026-09-14 — *"a cashier keeps seeing quantity and
# revenue"* — measured against the applied policy rather than restated.
note
signup "$STAFF_EMAIL"; STAFF_TOKEN="$TOKEN"; STAFF_ID="$USER_ID"
TOKEN="$OWNER_TOKEN"
MEMBER_JSON="{\"workspace_id\":\"$WORKSPACE_ID\",\"user_id\":\"$STAFF_ID\",\"role\":\"staff\"}"
ADDED="$(api POST '/rest/v1/workspace_member?select=id' "$MEMBER_JSON")"
# ⚠️ `member_location.member_id` IS `workspace_member.id`, NOT THE AUTH USER ID.
# `0001:233` keys the placement on the MEMBERSHIP, which is what makes a person
# who leaves and rejoins a new row rather than a resurrected one — and posting a
# user id here is a 400 that reads like a policy refusal.
STAFF_MEMBER_ID="$(field id "$(body "$ADDED")")"
PLACED="$(api POST /rest/v1/member_location "{\"workspace_id\":\"$WORKSPACE_ID\",\"member_id\":\"$STAFF_MEMBER_ID\",\"location_id\":\"$LOCATION_ID\"}")"
TOKEN="$STAFF_TOKEN"
STAFF_READ="$(api GET "$READ_PATH")"
STAFF_FILE="$(stash staff "$STAFF_READ")"
STAFF_N="$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(len(d) if isinstance(d,list) else -1)" "$STAFF_FILE" 2>/dev/null)"
if [[ "$(status "$STAFF_READ")" == "200" && "${STAFF_N:-0}" -ge 2 ]]; then
  ok "a cashier reads the day's sales — sale_select is member-level, as ruled"
else
  fail "a cashier read $(status "$STAFF_READ") with ${STAFF_N:-?} rows"
  echo "      Ruled 2026-09-14: she keeps seeing revenue. sale_select (0003) admits"
  echo "      every member at their own locations, and a migration that narrowed it"
  echo "      would empty the top of Inicio for the person at the counter — which"
  echo "      breaks no other test in this repository."
  echo "      member: $(status "$ADDED") / location: $(status "$PLACED")"
fi

# --- 10. another shop reads none of it -------------------------------------
note
signup "$NEIGHBOUR_EMAIL"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Otra tienda","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
NEIGHBOUR="$(api GET "$READ_PATH")"
NEIGHBOUR_N="$(python3 -c "import json,sys;d=json.loads(sys.stdin.read());print(len(d) if isinstance(d,list) else -1)" <<< "$(body "$NEIGHBOUR")" 2>/dev/null)"
if [[ "$(status "$NEIGHBOUR")" == "200" && "${NEIGHBOUR_N:-1}" -eq 0 ]]; then
  ok "another shop reads zero of this shop's sales"
else
  fail "a neighbouring shop read ${NEIGHBOUR_N:-?} rows ($(status "$NEIGHBOUR"))"
fi

# --- anti-vacuity ----------------------------------------------------------
# ⚠️ RULE 4. Every failure path above is conditional, so "0 failures" is also
# what a run that skipped everything looks like.
echo
if (( fails > 0 )); then
  echo "$ran assertion groups ran, $fails failed — $CONTRACT and the applied schema"
  echo "disagree, or a policy moved under it."
  exit 1
fi
if (( ran < 10 )); then
  echo "FAIL: only $ran assertion groups ran, expected 10 — this check asserted"
  echo "      almost nothing and was about to report success."
  exit 1
fi
echo "all $ran assertion groups passed — app/src/api/today.ts still describes the"
echo "database it will meet, over a real round trip with real sales in it."

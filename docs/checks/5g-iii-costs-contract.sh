#!/usr/bin/env bash
# 5g-iii-costs-contract — does `app/src/api/costs.ts` still describe the
# database, and does the read behind `Costos` really come back in the order the
# chart depends on?
#
# ⚠️⚠️ THE SECOND HALF IS THE POINT, AND IT IS A CLAIM A NODE SUITE CANNOT MAKE.
# `app/test/api-costs.test.ts` asserts that `COSTS_ORDER` is spelled
# `purchase(occurred_at)` rather than as a `{ referencedTable }` option — because
# `postgrest-js` puts the second one under the query key `purchase.order`, which
# sorts the EMBEDDED row inside each parent and is therefore a silent no-op on a
# to-one embed. **But a suite can only read the string.** Whether PostgREST then
# actually sorts the PARENT by it, over a composite foreign key, is a question
# only a real PostgREST answers — and a wrong answer is a chart whose points are
# strung together in planner order, redrawn differently on a re-plan, with nothing
# anywhere going red.
#
# WHAT IT ASSERTS, all against a REAL round trip with a real shop, a real catalog,
# two real suppliers, five real deliveries and two real people:
#
#   1. Every string is READ OUT OF `app/src/api/costs.ts` — not typed in here. A
#      second copy of a contract is the defect this repository has recorded
#      eleven times.
#   2. The read answers 200 and carries exactly the columns the app asked for,
#      with the document embedded over its COMPOSITE foreign key. ⚠️ That the
#      embed resolves at all is the first thing this check exists for:
#      `purchase_line_header_fk` is `(purchase_id, workspace_id, location_id)`,
#      not the single-column shape every other embed in this app uses.
#   3. ⚠️⚠️ THE ORDER IS REAL, MEASURED ON THE PARENT. Five deliveries with five
#      distinct `occurred_at`, read back and compared to the descending order the
#      app asked for. ⚠️ And the `{ referencedTable }` spelling is driven in the
#      SAME run and shown NOT to sort — so this check does not merely confirm the
#      right answer, it exhibits the wrong one.
#   4. ⚠️ `unit_price_net_per_base` COMES BACK AS A JSON STRING because the
#      contract casts it. Without the cast it is a double and `parseDecimal`
#      refuses a number argument outright. Read off the WIRE, which no
#      string-matching check could do.
#   5. ⚠️ A column the app never asks for never reaches a phone (C8.8, `R13`).
#      `qty_base`, `line_net`, `tax_amount`, `tax_rate` and `expiry_date` are all
#      on the table and none of them is on this screen.
#   6. ⚠️⚠️ `p_occurred_at` IS IGNORED UNLESS `p_recorded_offline` IS TRUE
#      (`0018:221`), which is why every fixture below sets it. Measured on
#      2026-09-25: three deliveries dated -60h, -30h and -5h all landed within
#      100 ms of each other without the flag. **This is the difference between a
#      check that draws a line and one that draws a dot.**
#   7. ⚠️⚠️ THE VOID RULE, OVER A REAL REVERSAL — AND WRITING ONE TOOK A FINDING.
#      **`purchase` and `purchase_line` have SELECT policies and NOTHING ELSE**
#      (`0003:558`, `0003:564`; measured 2026-09-25, a direct insert answers
#      `42501 permission denied for table purchase`). Every write goes through
#      `record_purchase`, which is `security definer` — and **no function in this
#      schema writes a reversal**: `0021` describes the shape and nothing creates
#      one. So a void is **not reachable through the API at all today**, and the
#      fixture is inserted as the superuser inside the container.
#      ⚠️ THAT IS SOUND HERE AND WOULD NOT BE ELSEWHERE: the superuser writes the
#      FIXTURE, and the assertion is the READ, which is made as a real user over
#      real HTTP. supabase/README.md's warning is about running the ASSERTION as
#      superuser, which would pass vacuously; this does the opposite.
#   8. ⚠️ §2.9's OWN VIEW HAS NO `provider_id`, asked of the database rather than
#      read off `0032`. It is the reason this module reads `purchase_line` at all,
#      and the day somebody widens that view this assertion is how they find out
#      the decision can be revisited.
#   9. ⚠️⚠️ AN EMPLEADA READS ALL OF IT, WHICH `0040` MADE TRUE FOUR HOURS BEFORE
#      THIS SCREEN EXISTED. Before it she read zero rows — 200 and an empty array,
#      never a 403 — and `Costos` would have been a chart of nothing for her, in a
#      state indistinguishable from a product nobody has bought.
#  10. Another shop reads none of this shop's deliveries.
#
# ⚠️⚠️ WHAT IT CANNOT ASSERT, AND THE FALSIFIER IS WHAT ESTABLISHED IT: THE
# DIRECTION. This check reads `COSTS_ORDER_ASCENDING` out of the app and then
# compares the response against that same value, so a contract that flipped to
# ascending would ask for ascending, get ascending, and be self-consistently green.
# **There is no second source for *which way round* on the wire.** It is pinned
# where a second source exists — `app/test/api-costs.test.ts` asserts both that
# `COSTS_ORDER_ASCENDING` is `false` and that `costsFrom` hands the screen its
# points OLDEST FIRST, which is the round trip that would break. A fixture for it
# was written here, observed to be vacuous, and removed rather than left looking
# like cover.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the arithmetic and the geometry. What `$18.50 / kg`
# is per gram, and where a dot lands in a unit box, is
# `app/test/api-costs.test.ts`'s — and the document is
# `app/test/costs-pdf.test.ts`'s. This file is about the WIRE: the names, the
# shapes, the types, the ORDER and the fences.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5g-iii-costs-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/costs.ts}"
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

COSTS_TABLE="$(str COSTS_TABLE)"
COSTS_VARIANT_COLUMN="$(str COSTS_VARIANT_COLUMN)"
COSTS_ORDER="$(str COSTS_ORDER)"
# ⚠️ `COSTS_COLUMNS` is written over two lines, so it is read differently — the
# arrangement `5g-i`'s check made for `MEMORY_COLUMNS`, and for its reason: the
# alternative is reformatting the module to suit this check.
COSTS_COLUMNS="$(sed -n "/^export const COSTS_COLUMNS =/,/;/p" "$CONTRACT" \
                 | sed -n "s/.*'\([^']*\)'.*/\1/p" | head -1)"
# ⚠️ AND THE DIRECTION IS A BOOLEAN, so the wire spelling below is COMPOSED from
# the app's own two values rather than being a third copy of the string.
COSTS_ORDER_ASCENDING="$(sed -n "s/^export const COSTS_ORDER_ASCENDING = \(.*\);.*/\1/p" "$CONTRACT" | head -1)"

note
MISSING=""
for name in COSTS_TABLE COSTS_VARIANT_COLUMN COSTS_ORDER COSTS_COLUMNS COSTS_ORDER_ASCENDING; do
  eval "value=\$$name"
  [[ -n "$value" ]] || MISSING="$MISSING $name"
done
if [[ -n "$MISSING" ]]; then
  fail "could not read the costs contract out of $CONTRACT:$MISSING"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
case "$COSTS_ORDER_ASCENDING" in
  true)  DIRECTION=asc ;;
  false) DIRECTION=desc ;;
  *) fail "COSTS_ORDER_ASCENDING is '$COSTS_ORDER_ASCENDING', which is neither true nor false"; exit 1 ;;
esac
WIRE_ORDER="$COSTS_ORDER.$DIRECTION"

# ⚠️⚠️ THE SHAPE OF THE ORDER IS ASSERTED BEFORE ITS EFFECT IS, AND THE FALSIFIER IS
# WHY. `F3` swaps `purchase(occurred_at)` for a bare `occurred_at` — the
# `{ referencedTable }` shape — and without this the check went red at *the read
# answers 200*, because `purchase_line` has no `occurred_at` of its own. **Red for
# the wrong reason is a coincidence and not a falsification.** This names the trap
# where a person will read it.
note
case "$COSTS_ORDER" in
  *"("*")")
    ok "the order is a column EXPRESSION — $COSTS_ORDER — so PostgREST sorts the parent" ;;
  *)
    fail "COSTS_ORDER is '$COSTS_ORDER', which is a bare column rather than a"
    echo "      \`table(column)\` expression. \`purchase_line\` has no instant of its own —"
    echo "      only \`created_at\`, the WRITE moment, which \`recorded_offline\` makes differ"
    echo "      from the trading moment by up to 72 hours (§2.6; \`0010\` is the migration"
    echo "      that exists because an allocator confused the two)."
    echo "      ⚠️ AND IF THIS BECAME A \`{ referencedTable }\` OPTION INSTEAD, postgrest-js"
    echo "      would emit the query key \`purchase.order\`, which sorts the embedded row"
    echo "      INSIDE each parent. \`purchase\` is a to-one embed, so that is a silent"
    echo "      no-op: 200, typechecked, and the chart's points strung together in"
    echo "      planner order."
    exit 1 ;;
esac

ok "read from $CONTRACT: table=$COSTS_TABLE order=$WIRE_ORDER"
ok "columns=$COSTS_COLUMNS"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS and
# assertions 9 and 10 would pass vacuously, for the reason supabase/README.md
# gives about the `postgres` superuser.
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

TOKEN=""
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
first()  { python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['$1'] if isinstance(r,list) and r else '')" <<< "$2" 2>/dev/null; }
uuid()   { python3 -c 'import uuid;print(uuid.uuid4())'; }
ago()    { python3 -c "import datetime,sys;print((datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(hours=float(sys.argv[1]))).isoformat())" "$1"; }

verdict() { # label python-file extra-args...
  local label="$1"; shift
  local out
  out="$(python3 "$@" 2>&1)"
  [[ -z "$out" ]] && out="the verdict script produced nothing — it crashed on the shape that came back"
  note
  if [[ "$out" == ok* ]]; then ok "$label${out#ok}"; else fail "$out"; fi
}

# ⚠️ SIGNUP IS RETRIED. GoTrue rate-limits it, and a rate-limited signup returns an
# empty body rather than a 429 — which on 2026-09-25 looked exactly like a broken
# harness for twenty minutes. The retry is the cheap fix and the comment is the
# rest of it.
signup() { # email -> sets TOKEN
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"costs-probe-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  echo "      GoTrue rate-limits signup and answers with an EMPTY BODY when it does."
  exit 1
}

STAMP="$$-$(date +%s)"

# --- the shop, its catalog, its two suppliers and its two people -----------
signup "costs-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Costos 5g-iii","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }
LOCATION_ID="$(first id "$(body "$(api GET '/rest/v1/location?select=id')")")"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

# ⚠️ THE FAMILY NAME CARRIES AN ACCENT for `5d-i`'s reason: a transport that
# mangled UTF-8 between here and a phone would otherwise be green.
FAMILY_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Jitomates"}))' "$WORKSPACE_ID")"
FAMILY_ID="$(first id "$(body "$(api POST '/rest/v1/product_family?select=id' "$FAMILY_JSON")")")"
[[ -n "$FAMILY_ID" ]] || { echo "FAIL: could not create a family"; exit 1; }

VARIANT_JSON="$(python3 -c '
import json, sys
print(json.dumps({
  "workspace_id": sys.argv[1], "family_id": sys.argv[2], "name": "Jitomate saladet",
  "base_unit_code": "g", "purchase_unit_code": "kg", "sell_unit_code": "kg",
  "price_unit_code": "kg", "tax_rate": 0}))' "$WORKSPACE_ID" "$FAMILY_ID")"
VARIANT_ID="$(first id "$(body "$(api POST '/rest/v1/product_variant?select=id' "$VARIANT_JSON")")")"
[[ -n "$VARIANT_ID" ]] || { echo "FAIL: could not create a variant"; exit 1; }

# ⚠️ A SECOND VARIANT IN THE SAME FAMILY — the read is filtered by VARIANT and not
# by family, so a delivery of this one must never appear in the other's chart.
# §2.9 and the owner both say *per product*, and a family mixes base units.
OTHER_JSON="$(python3 -c '
import json, sys
print(json.dumps({
  "workspace_id": sys.argv[1], "family_id": sys.argv[2], "name": "Jitomate bola",
  "base_unit_code": "g", "purchase_unit_code": "kg", "sell_unit_code": "kg",
  "price_unit_code": "kg", "tax_rate": 0}))' "$WORKSPACE_ID" "$FAMILY_ID")"
OTHER_ID="$(first id "$(body "$(api POST '/rest/v1/product_variant?select=id' "$OTHER_JSON")")")"
[[ -n "$OTHER_ID" ]] || { echo "FAIL: could not create a second variant"; exit 1; }

SECOND_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Bodega del Centro"}))' "$WORKSPACE_ID")"
SECOND_ID="$(first id "$(body "$(api POST '/rest/v1/provider?select=id' "$SECOND_JSON")")")"
[[ -n "$SECOND_ID" ]] || { echo "FAIL: could not create a second provider"; exit 1; }
GENERIC_ID="$(first id "$(body "$(api GET '/rest/v1/provider?select=id&is_generic=is.true')")")"
[[ -n "$GENERIC_ID" ]] || { echo "FAIL: the new shop has no generic provider"; exit 1; }

# --- the deliveries --------------------------------------------------------
# ⚠️⚠️ ASSERTION 6 IS BUILT INTO EVERY ONE OF THESE: `p_recorded_offline` is TRUE
# so `0018:221` honours `p_occurred_at`. Online it takes `now()` for all of them
# and this check would have five points at one instant — a dot, not a line.
# ⚠️ AND THE OFFLINE PATH IS NOT AN ARTIFICE HERE: the pilot store is offline half
# the day (§2.6, `5c`), so a dated `occurred_at` is the ORDINARY case for it.
buy() { # hours-ago provider-id price variant -> response
  local payload
  payload="$(python3 -c '
import json, sys
print(json.dumps({
  "p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_provider_id": sys.argv[3],
  "p_occurred_at": sys.argv[5], "p_recorded_offline": True,
  "p_lines": [{"variant_id": sys.argv[6], "qty_display": "3", "qty_display_unit": "kg",
               "unit_price_net_per_base": sys.argv[4]}]}))' \
    "$(uuid)" "$LOCATION_ID" "$2" "$3" "$(ago "$1")" "$4")"
  api POST /rest/v1/rpc/record_purchase "$payload"
}

TOKEN="$OWNER_TOKEN"
# ⚠️⚠️ THE ORDER THESE ARE WRITTEN IN DISAGREES WITH THE ORDER THEY HAPPENED IN, AND
# THAT IS THE WHOLE POINT OF THE SEQUENCE BELOW — it was found by the falsifier,
# which showed `F5` (sorting by the LINE's `created_at` instead of the document's
# `occurred_at`) going GREEN. The first version recorded 60h, 40h, 30h, 10h and 2h
# ago in that order, so `created_at` ascended exactly as `occurred_at` did and the
# two sort keys were indistinguishable. **A check that cannot tell them apart is
# green on the one confusion `0010` exists because of.**
#
# ⚠️ AND IT IS THE FAITHFUL CASE, not a contrivance: the outbox flushes what it
# holds when the signal comes back (§2.6, `5c`), and nothing makes that order
# chronological. A shop offline all morning replays its deliveries in whatever
# order they were keyed.
#
# Hours ago, price per gram. ⚠️ Also deliberately NOT in price order, so a check
# that happened to sort by price would fail too.
FIRST="$(buy 30 "$GENERIC_ID" '0.018500' "$VARIANT_ID")"
note
if [[ "$(status "$FIRST")" == "200" ]]; then
  ok "record_purchase accepts a dated, offline-recorded delivery"
else
  fail "record_purchase refused the first delivery: $(body "$FIRST")"
  exit 1
fi
buy  2 "$GENERIC_ID" '0.020000' "$VARIANT_ID" > /dev/null
buy 60 "$GENERIC_ID" '0.016000' "$VARIANT_ID" > /dev/null
buy 10 "$SECOND_ID"  '0.019000' "$VARIANT_ID" > /dev/null
buy 40 "$SECOND_ID"  '0.021000' "$VARIANT_ID" > /dev/null
# ⚠️ AND ONE OF THE OTHER VARIANT, which must not appear below.
buy  5 "$SECOND_ID"  '0.099000' "$OTHER_ID"   > /dev/null

# --- 2, 3, 4, 5. the read the app actually makes ---------------------------
READ_PATH="/rest/v1/$COSTS_TABLE?$COSTS_VARIANT_COLUMN=eq.$VARIANT_ID&select=$COSTS_COLUMNS&order=$WIRE_ORDER"
SERIES="$(api GET "$READ_PATH")"
SERIES_FILE="$(stash series "$SERIES")"

note
if [[ "$(status "$SERIES")" == "200" ]]; then
  ok "the read answers 200 — the embed over the COMPOSITE fk resolves"
else
  fail "the costs read answered $(status "$SERIES"): $(body "$SERIES")"
  echo '      purchase_line_header_fk is (purchase_id, workspace_id, location_id), not'
  echo '      the single-column shape every other embed in this app uses. A 400 about an'
  echo '      ambiguous or missing relationship is what a broken embed looks like, and no'
  echo '      typecheck and no node suite can see it.'
  echo '      ⚠️ A 42703 naming a column of the EMBEDDED table means something narrower and'
  echo '      is worth knowing: ordering a parent by an embedded column requires that column'
  echo '      to be IN the embed s select list. `purchase(occurred_at)` works because'
  echo '      occurred_at is selected; `purchase(recorded_at)` 400s even though the column'
  echo '      exists on the table. Found by this check s own falsifier, 2026-09-25.' 
  exit 1
fi

# ⚠️ THE BANNED LIST IS NAMED HERE AND MEASURED OFF THE WIRE, C8.8's argument
# applied to a delivery's line — the arrangement `5g-i`'s check records, added
# because its own first version compared the response's keys to the columns the
# app ASKED for and was therefore consistent with itself.
BANNED='qty_base,qty_display,qty_display_unit,line_net,tax_amount,tax_rate,expiry_date,created_at,workspace_id,location_id,purchase_id,variant_id'

cat > "$SCRATCH/series.py" <<'PY'
import json, sys
path, banned = sys.argv[1], sys.argv[2].split(',')
try:
    rows = json.load(open(path))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list):
    print('the costs read came back as an error: %r' % (rows,)); raise SystemExit

# Five of this variant, and the sixth delivery was of another one.
if len(rows) != 5:
    print('five deliveries of this variant were recorded and the read returned %d — '
          'the filter is on the VARIANT, and a family mixes base units' % len(rows))
    raise SystemExit

for row in rows:
    if set(row) != {'unit_price_net_per_base', 'purchase'}:
        print('the line carried %r; the app asks for the price and the document and '
              'nothing else' % sorted(row)); raise SystemExit
    reached = [c for c in banned if c in row]
    if reached:
        print('%s reached the phone — a column the app never asks for is a column '
              'that never reaches a phone (C8.8, R13)' % reached); raise SystemExit
    doc = row['purchase']
    if not isinstance(doc, dict):
        print('the document came back as %r rather than as an object — `!inner` on a '
              'to-one embed should nest exactly one' % (doc,)); raise SystemExit
    if set(doc) != {'id', 'occurred_at', 'provider_id', 'reversal_of'}:
        print('the document carried %r; the app asks for four columns' % sorted(doc))
        raise SystemExit

    # ⚠️⚠️ ASSERTION 4 — THE CAST, READ OFF THE WIRE. Without `::text` PostgREST
    # sends a JSON number, `json.load` makes it a float, and `parseDecimal`
    # refuses a number argument outright. This is the assertion no
    # string-matching check could make.
    price = row['unit_price_net_per_base']
    if not isinstance(price, str):
        print('unit_price_net_per_base arrived as %s (%r) rather than as a string — '
              'the ::text cast is gone and every price on this screen would now go '
              'through a double (R5)' % (type(price).__name__, price)); raise SystemExit

print('ok — five lines, the price as a string, and no column the app never asked for')
PY
verdict "the read carries exactly what the contract asks for" \
  "$SCRATCH/series.py" "$SERIES_FILE" "$BANNED"

# ⚠️⚠️ ASSERTION 3 — THE ORDER, ON THE PARENT, AND THE WRONG SPELLING BESIDE IT.
WRONG_PATH="/rest/v1/$COSTS_TABLE?$COSTS_VARIANT_COLUMN=eq.$VARIANT_ID&select=$COSTS_COLUMNS&purchase.order=occurred_at.$DIRECTION"
WRONG_FILE="$(stash wrong "$(api GET "$WRONG_PATH")")"
UNORDERED_FILE="$(stash unordered "$(api GET "/rest/v1/$COSTS_TABLE?$COSTS_VARIANT_COLUMN=eq.$VARIANT_ID&select=$COSTS_COLUMNS")")"

cat > "$SCRATCH/order.py" <<'PY'
import json, sys
right, wrong, none_, direction = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

def instants(path):
    rows = json.load(open(path))
    if not isinstance(rows, list):
        return None
    return [r['purchase']['occurred_at'] for r in rows]

got = instants(right)
if got is None:
    print('the ordered read came back as an error'); raise SystemExit
if len(set(got)) != len(got):
    print('the fixture gave two deliveries the same instant, so this assertion could '
          'not distinguish an order from a coincidence'); raise SystemExit

want = sorted(got, reverse=(direction == 'desc'))
if got != want:
    print('the read asked for %s and came back in %r — PostgREST is not sorting the '
          'PARENT by the embedded column. The chart would then string its points '
          'together in planner order and redraw differently on a re-plan, with '
          'nothing going red' % (direction, got)); raise SystemExit

# ⚠️⚠️ AND THE WRONG SPELLING IS EXHIBITED RATHER THAN DESCRIBED. `purchase.order`
# is what `postgrest-js` emits for `{ referencedTable: 'purchase' }`; it sorts the
# embedded row WITHIN each parent, and `purchase` is to-one, so it should leave
# the parent order exactly as an unordered read left it.
loose = instants(wrong)
bare = instants(none_)
if loose is None or bare is None:
    print('the comparison reads came back as errors'); raise SystemExit
if loose != bare:
    print('`purchase.order=` changed the parent order (%r vs %r), so the note in '
          'COSTS_ORDER about it being a silent no-op is now WRONG and should be '
          'rewritten rather than trusted' % (loose, bare)); raise SystemExit
if loose == want and len(set(bare)) > 1:
    print('NOTE: the unordered read happened to come back sorted, so this run cannot '
          'show that `purchase.order=` fails to sort. The right spelling still held.')

print('ok — %s on the parent, and `purchase.order=` provably does not sort it' % direction)
PY
verdict "the order is real, and the tempting spelling is shown not to be" \
  "$SCRATCH/order.py" "$SERIES_FILE" "$WRONG_FILE" "$UNORDERED_FILE" "$DIRECTION"

# --- 7. the void, over a real reversal -------------------------------------
# ⚠️⚠️ THE FIXTURE GOES IN AS THE SUPERUSER, AND THE REASON IS A FINDING RATHER
# THAN A CONVENIENCE — see this file's header, assertion 7. `purchase` carries a
# SELECT policy and nothing else, so an `authenticated` insert is `42501`; and no
# function in this schema writes a reversal, so there is no RPC to call either.
# **A void is not reachable through the API today.** The superuser writes the two
# rows; every assertion below is still a read made as a real user over real HTTP.
#
# ⚠️ `docker exec` AND NOT `psql` — there is no psql on this machine, which is
# recorded rather than rediscovered.
psql_su() { docker exec -i supabase_db_RetailerManagementTool \
              psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

note
if ! psql_su -c 'select 1' > /dev/null 2>&1; then
  fail "cannot reach the local Postgres container, so the void rule could not be exercised"
  echo "      The container is supabase_db_RetailerManagementTool; \`supabase start\`"
  echo "      brings it up. This assertion needs it because a purchase reversal cannot"
  echo "      be written through the API at all — see the header."
else
  ORIG_ID="$(first id "$(body "$(api GET "/rest/v1/purchase?select=id&order=occurred_at.desc&limit=1")")")"
  if [[ -z "$ORIG_ID" ]]; then
    fail "no purchase to reverse"
  else
    # ⚠️ THE NEGATION IS DONE IN SQL OFF THE ORIGINAL ROW, so the reversal really is
    # `0021`'s shape — negated totals, `reversal_of` set — and not a hand-typed
    # approximation of it. ⚠️ `purchase_line_price_non_negative` is why the LINE's
    # unit price stays POSITIVE while its quantity and money go negative: that
    # constraint is the whole reason this assertion exists.
    if psql_su > "$SCRATCH/reversal.log" 2>&1 <<SQL
with orig as (
  select * from public.purchase where id = '$ORIG_ID'
), rev as (
  insert into public.purchase
    (id, workspace_id, location_id, provider_id, occurred_at, total_net, total_tax,
     reversal_of, reversal_reason, created_by, payload_hash)
  select gen_random_uuid(), o.workspace_id, o.location_id, o.provider_id, now(),
         -o.total_net, -o.total_tax, o.id, 'prueba 5g-iii', o.created_by,
         '5g-iii-' || gen_random_uuid()::text
    from orig o
  returning id, workspace_id, location_id
)
insert into public.purchase_line
  (workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display,
   qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
select r.workspace_id, r.location_id, r.id, pl.variant_id,
       -pl.qty_base, -pl.qty_display, pl.qty_display_unit,
       pl.unit_price_net_per_base, -pl.line_net, -pl.tax_amount, pl.tax_rate
  from rev r
  join public.purchase_line pl on pl.purchase_id = '$ORIG_ID';
SQL
    then
      ok "a reversal document and its line insert, as 0021 shapes them"
      AFTER_FILE="$(stash after "$(api GET "$READ_PATH")")"
      cat > "$SCRATCH/void.py" <<'VOIDPY'
import json, sys
rows = json.load(open(sys.argv[1]))
orig = sys.argv[2]
if not isinstance(rows, list):
    print('the read after the reversal came back as an error: %r' % (rows,)); raise SystemExit

# THE QUERY BRINGS BOTH DOCUMENTS BACK, WHICH IS THE WHOLE POINT. RLS does not
# hide a reversal and no filter excludes one, so if `costsFrom` did not drop them
# the chart would draw a delivery that never stood - at a POSITIVE price, because
# `purchase_line_price_non_negative` keeps it positive on the reversal too.
ids = [r['purchase']['id'] for r in rows]
revs = [r for r in rows if r['purchase']['reversal_of']]
if not revs:
    print('the reversal did not come back from the read, so costsFrom-s void rule is '
          'guarding against something the database already does - which would make '
          'that code and its five assertions dead'); raise SystemExit
if orig not in ids:
    print('the reversed document did not come back either, so only half the rule is '
          'load-bearing'); raise SystemExit
# Five deliveries of this variant, plus the ONE line the reversal copied off the
# most recent of them. Both halves of the void are therefore among these six: the
# original is one of the five and the reversal is the sixth.
if len(rows) != 6:
    print('expected 6 lines back (five deliveries plus the reversal-s line) and '
          'got %d' % len(rows)); raise SystemExit

prices = [r['unit_price_net_per_base'] for r in revs]
if any(p.startswith('-') for p in prices):
    print('a reversal line came back with a NEGATIVE unit price (%r). '
          'purchase_line_price_non_negative says that cannot happen, and if it can '
          'then costsFrom could have filtered on the sign instead' % prices)
    raise SystemExit

print('ok - 6 lines, both halves of the void among them at a POSITIVE price, so '
      'dropping them is the client-s job and nothing else will do it')
VOIDPY
      verdict "a void is two rows on the wire, and neither is a point" \
        "$SCRATCH/void.py" "$AFTER_FILE" "$ORIG_ID"
    else
      fail "could not insert the reversal fixture: $(tail -3 "$SCRATCH/reversal.log")"
    fi
  fi
fi

# --- 8. §2.9's view, and why this module does not read it -------------------
note
DAILY="$(api GET "/rest/v1/product_purchases_daily?select=provider_id&limit=1")"
if [[ "$(status "$DAILY")" == "200" ]]; then
  fail "product_purchases_daily now HAS a provider_id, and this module's central"
  echo "      argument is therefore out of date. `@/api/costs`' header says the view"
  echo "      groups by (workspace, location, variant, day) and cannot answer *what is"
  echo "      each PROVIDER charging me* — if that changed, reading the view becomes"
  echo "      the better design and this file should say so rather than this check"
  echo "      staying green by luck."
else
  ok "product_purchases_daily still has no provider_id ($(status "$DAILY")) — the"
  echo "        reason this read goes to purchase_line and not to §2.9's own view"
fi

# --- 9. an Empleada reads all of it ----------------------------------------
# ⚠️⚠️ BEFORE `0040` SHE READ ZERO ROWS — 200 AND AN EMPTY ARRAY, NEVER A 403 — so
# `Costos` would have drawn her an empty chart in a state indistinguishable from a
# product nobody has ever bought. The owner ruled on 2026-09-25: *"Empleada should
# be able to see the both the purchase records and the prices."* This is the
# assertion that would notice the fence coming back.
# ⚠️ `p_email` IS REQUIRED — `0028:226` declares it with no default, and PostgREST
# matches a function BY ITS PARAMETER NAMES, so omitting it is a 404 (`PGRST202`)
# rather than a complaint about a missing argument. `R13`'s own lesson, met in a
# check rather than in the app.
#
# ⚠️⚠️ AND `p_location_ids` IS REQUIRED FOR A STAFF INVITE SPECIFICALLY, which is
# `0028` enforcing §2.7 rather than a quirk of this harness: *"create_invite: a
# staff invite must name at least one location"*, with the detail *"Staff write
# only where member_location puts them, and RLS refuses the rest silently."* A
# cashier with no location is a member who can be refused everywhere without ever
# being told — which is exactly the silent shape that rule exists to prevent.
# ⚠️ **It also makes assertion 9 sharper than it would otherwise be:** she is
# placed in THIS store, so the rows she reads back come through `my_locations()`
# and not past it — `0040` dropped the role clause and KEPT the location wall.
STAFF_INVITE_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "costs-staff-$STAMP@example.com" "$LOCATION_ID")"
TOKEN="$OWNER_TOKEN"
INVITE_OUT="$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE_JSON")"
STAFF_TOKEN_STR="$(pick token "$(body "$INVITE_OUT")")"
if [[ -z "$STAFF_TOKEN_STR" ]]; then
  note; fail "create_invite returned no token for the cashier, so assertion 9 could not run"
  echo "      $(status "$INVITE_OUT"): $(body "$INVITE_OUT" | head -c 300)"
else
  signup "costs-staff-$STAMP@example.com"; STAFF_TOKEN="$TOKEN"
  api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_TOKEN_STR\"}" > /dev/null
  STAFF_FILE="$(stash staff "$(api GET "$READ_PATH")")"
  cat > "$SCRATCH/staff.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if not isinstance(rows, list):
    print('the cashier`s read came back as an error: %r' % (rows,)); raise SystemExit
if len(rows) == 0:
    print('an Empleada read ZERO deliveries. `0040` dropped the manager clause from '
          'purchase_select and purchase_line_select on the owner`s ruling of '
          '2026-09-25; if the fence is back, `Costos` draws her an empty chart in a '
          'state indistinguishable from a product nobody has bought — and '
          '`canReadMemory` in @/api/providers is now lying too')
    raise SystemExit
if not all(isinstance(r['unit_price_net_per_base'], str) for r in rows):
    print('the cashier got the price as something other than a string'); raise SystemExit
print('ok — an Empleada reads %d deliveries and their prices' % len(rows))
PY
  verdict "any role may read what the shop paid (0040)" "$SCRATCH/staff.py" "$STAFF_FILE"
fi

# --- 10. another shop reads none of it -------------------------------------
signup "costs-stranger-$STAMP@example.com"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Otra tienda","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
STRANGER_FILE="$(stash stranger "$(api GET "$READ_PATH")")"
cat > "$SCRATCH/stranger.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if not isinstance(rows, list):
    print('the stranger`s read came back as an error: %r' % (rows,)); raise SystemExit
if rows:
    print('another workspace read %d of this shop`s deliveries, with their prices' % len(rows))
    raise SystemExit
print('ok — another shop reads none of this shop`s deliveries')
PY
verdict "the tenancy wall holds over the embed too" "$SCRATCH/stranger.py" "$STRANGER_FILE"

echo
if (( fails == 0 )); then
  echo "PASS — $ran assertion groups held against a real PostgREST."
  exit 0
fi
echo "FAIL — $fails of $ran assertion groups failed."
exit 1

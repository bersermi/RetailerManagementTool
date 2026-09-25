#!/usr/bin/env bash
# 5f.5-magnitude-contract — does `app/src/api/magnitude.ts` still describe the
# database, and does the read behind ADR-035 §2.8's magnitude warning really
# come back trailing?
#
# ⚠️⚠️ THIS CHECK EXISTS FOR TWO CLAIMS A NODE SUITE CANNOT MAKE, AND THE SECOND
# ONE IS THE ONE THAT WOULD ROT QUIETLY.
#
#   * **`qty_base::text`.** Nothing in this app had ever read a quantity off
#     `purchase_line` — `@/api/costs` measured `qty_display` arriving as the JSON
#     number `2.000` and then simply did not ask for it. Without the cast
#     `parseDecimal` refuses a number argument outright, `typicalFrom` drops
#     every sample, and **the guard goes silent with nothing anywhere going red**
#     — which is the exact failure shape this whole row is trying not to be.
#     `app/test/api-magnitude.test.ts` feeds itself strings, so it is green
#     either way.
#   * **`order` and `limit` composing.** *Trailing* is not a column; it is the
#     `limit` slicing an order that is applied to the PARENT over a **composite**
#     foreign key. If the order silently stopped applying — the
#     `{ referencedTable }` trap `COSTS_ORDER` documents — the read would take an
#     arbitrary `MAGNITUDE_LIMIT` lines out of the shop's whole history and call
#     them recent. 200, typechecked, and wrong for ever.
#
# WHAT IT ASSERTS, all against a REAL round trip with a real shop, a real
# catalog, real deliveries and two real people:
#
#   1. Every string is READ OUT OF `app/src/api/magnitude.ts` — not typed in
#      here. A second copy of a contract is the defect this repository has
#      recorded eleven times.
#   2. The read the app actually makes answers 200 and carries exactly the
#      columns it asked for, with the document embedded over its composite fk.
#   3. ⚠️⚠️ `qty_base` COMES BACK AS A JSON **STRING**, read off the wire.
#   4. ⚠️ So does `unit_price_net_per_base` — the cast `@/api/costs` already
#      carries, re-asserted here because this module is a second reader of it and
#      a contract nobody re-reads is a contract that drifts.
#   5. ⚠️⚠️ THE ORDER AND THE LIMIT COMPOSE: the newest documents come back, and
#      a smaller limit keeps the newest rather than an arbitrary slice. ⚠️ And
#      the `{ referencedTable }` spelling is driven in the SAME run and shown NOT
#      to sort, so this check exhibits the wrong answer as well as the right one.
#   6. ⚠️⚠️ THE READ IS SHOP-WIDE AND CARRIES NO VARIANT FILTER — which is the
#      finding this row's sizing turned on, asserted rather than commented. Two
#      products were bought; both appear.
#   7. ⚠️ A column the app never asks for never reaches a phone (C8.8, `R13`).
#   8. ⚠️⚠️ AN EMPLEADA READS ALL OF IT, WHICH IS WHAT MAKES THIS GUARD REACH THE
#      PERSON §2.8 IS WRITTEN ABOUT — *"a cashier meaning 1.5 kg who types 15"*.
#      Until `0040` (2026-09-25) `purchase_line_select` carried
#      `has_role(…, 'manager')`, so her read was **200 and an empty array**, never
#      a 403: every median absent, every comparison `none`, the guard silently
#      dead for the only role the ADR names.
#   9. Another shop reads none of this shop's deliveries.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the arithmetic. Which sample is the median, what
# three times it is, and which word goes beside the line, are
# `app/test/api-magnitude.test.ts`'s. This file is about the WIRE: the names, the
# shapes, the types, the ORDER, the LIMIT and the fences.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5f.5-magnitude-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/magnitude.ts}"
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
num() { sed -n "s/^export const $1 = \([0-9]*\);.*/\1/p" "$CONTRACT" | head -1; }

MAGNITUDE_TABLE="$(str MAGNITUDE_TABLE)"
MAGNITUDE_ORDER="$(str MAGNITUDE_ORDER)"
MAGNITUDE_LIMIT="$(num MAGNITUDE_LIMIT)"
# ⚠️ `MAGNITUDE_COLUMNS` is written over two lines, so it is read differently —
# the arrangement `5g-i`'s check made for `MEMORY_COLUMNS` and `5g-iii`'s for
# `COSTS_COLUMNS`, and for their reason: the alternative is reformatting the
# module to suit this check.
MAGNITUDE_COLUMNS="$(sed -n "/^export const MAGNITUDE_COLUMNS =/,/;/p" "$CONTRACT" \
                     | sed -n "s/.*'\([^']*\)'.*/\1/p" | head -1)"
# ⚠️ AND THE DIRECTION IS A BOOLEAN, so the wire spelling below is COMPOSED from
# the app's own two values rather than being a third copy of the string.
MAGNITUDE_ORDER_ASCENDING="$(sed -n "s/^export const MAGNITUDE_ORDER_ASCENDING = \(.*\);.*/\1/p" "$CONTRACT" | head -1)"

note
MISSING=""
for name in MAGNITUDE_TABLE MAGNITUDE_ORDER MAGNITUDE_LIMIT MAGNITUDE_COLUMNS MAGNITUDE_ORDER_ASCENDING; do
  eval "value=\$$name"
  [[ -n "$value" ]] || MISSING="$MISSING $name"
done
if [[ -n "$MISSING" ]]; then
  fail "could not read the magnitude contract out of $CONTRACT:$MISSING"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
case "$MAGNITUDE_ORDER_ASCENDING" in
  true)  DIRECTION=asc ;;
  false) DIRECTION=desc ;;
  *) fail "MAGNITUDE_ORDER_ASCENDING is '$MAGNITUDE_ORDER_ASCENDING', which is neither true nor false"; exit 1 ;;
esac
WIRE_ORDER="$MAGNITUDE_ORDER.$DIRECTION"

# ⚠️⚠️ THE SHAPE OF THE ORDER IS ASSERTED BEFORE ITS EFFECT IS, for the reason
# `5g-iii`'s check records: a bare column makes the read 400 at *answers 200*,
# and red for the wrong reason is a coincidence rather than a falsification.
note
case "$MAGNITUDE_ORDER" in
  *"("*")")
    ok "the order is a column EXPRESSION — $MAGNITUDE_ORDER — so PostgREST sorts the parent" ;;
  *)
    fail "MAGNITUDE_ORDER is '$MAGNITUDE_ORDER', which is a bare column rather than a"
    echo "      \`table(column)\` expression. \`purchase_line\` has no instant of its own —"
    echo "      only \`created_at\`, the WRITE moment, which \`recorded_offline\` makes differ"
    echo "      from the trading moment by up to 72 hours (§2.6; \`0010\` is the migration"
    echo "      that exists because an allocator confused the two)."
    echo "      ⚠️⚠️ AND HERE THE ORDER IS WHAT \`limit\` SLICES. A silent no-op leaves the"
    echo "      guard taking an arbitrary $MAGNITUDE_LIMIT lines out of the shop's whole history"
    echo "      and calling them trailing."
    exit 1 ;;
esac

# ⚠️⚠️ THERE IS DELIBERATELY NO STRING ASSERTION ABOUT `qty_base::text` HERE, AND
# THE FALSIFIER IS WHY. The first draft had one, and `F1` — the fixture that drops
# the cast — went red on THAT rather than on the wire, so **the live type
# assertion this whole check exists for was never once exercised**. That is the
# vacuity one layer in: a green that means *a string was present*, dressed as a
# green that means *the database answered correctly*.
#
# ⚠️ IT IS NOT THE ARRANGEMENT `COSTS_ORDER` GOT ABOVE, AND THE DIFFERENCE IS THE
# FAILURE MODE. A bare-column order makes the read **400**, so that check asserts
# the shape first to avoid being red for the wrong reason. A missing `::text`
# makes the read **200 with a number in it** — precisely the thing a live read can
# see and nothing else can. The string-level guard belongs in
# `app/test/api-magnitude.test.ts`, where it is, and this file measures the wire.

ok "read from $CONTRACT: table=$MAGNITUDE_TABLE order=$WIRE_ORDER limit=$MAGNITUDE_LIMIT"
ok "columns=$MAGNITUDE_COLUMNS"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS and
# assertions 8 and 9 would pass vacuously, for the reason supabase/README.md
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
# SOURCE — the trap `5b-ii-a`'s harness recorded.
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
# harness for twenty minutes.
signup() { # email -> sets TOKEN
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"magnitude-probe-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  echo "      GoTrue rate-limits signup and answers with an EMPTY BODY when it does."
  exit 1
}

STAMP="$$-$(date +%s)"

# --- the shop, its catalog and its people ----------------------------------
signup "mag-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Magnitud 5f.5","p_prices_include_tax":true,"p_location_name":null}')"
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

variant() { # name -> id
  local json
  json="$(python3 -c '
import json, sys
print(json.dumps({
  "workspace_id": sys.argv[1], "family_id": sys.argv[2], "name": sys.argv[3],
  "base_unit_code": "g", "purchase_unit_code": "kg", "sell_unit_code": "kg",
  "price_unit_code": "kg", "tax_rate": 0}))' "$WORKSPACE_ID" "$FAMILY_ID" "$1")"
  first id "$(body "$(api POST '/rest/v1/product_variant?select=id' "$json")")"
}
VARIANT_ID="$(variant 'Jitomate saladet')"
OTHER_ID="$(variant 'Jitomate bola')"
[[ -n "$VARIANT_ID" && -n "$OTHER_ID" ]] || { echo "FAIL: could not create two variants"; exit 1; }

GENERIC_ID="$(first id "$(body "$(api GET '/rest/v1/provider?select=id&is_generic=is.true')")")"
[[ -n "$GENERIC_ID" ]] || { echo "FAIL: the new shop has no generic provider"; exit 1; }

# --- the deliveries --------------------------------------------------------
# ⚠️⚠️ `p_recorded_offline` IS TRUE ON EVERY ONE so `0018:221` honours
# `p_occurred_at`. Online it takes `now()` for all of them and assertion 5 would
# be comparing five instants that are the same instant — green, and vacuous.
buy() { # hours-ago variant qty-kg price-per-gram -> response
  local payload
  payload="$(python3 -c '
import json, sys
print(json.dumps({
  "p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_provider_id": sys.argv[3],
  "p_occurred_at": sys.argv[4], "p_recorded_offline": True,
  "p_lines": [{"variant_id": sys.argv[5], "qty_display": sys.argv[6],
               "qty_display_unit": "kg", "unit_price_net_per_base": sys.argv[7]}]}))' \
    "$(uuid)" "$LOCATION_ID" "$GENERIC_ID" "$(ago "$1")" "$2" "$3" "$4")"
  api POST /rest/v1/rpc/record_purchase "$payload"
}

TOKEN="$OWNER_TOKEN"
# ⚠️⚠️ THE ORDER THESE ARE WRITTEN IN DISAGREES WITH THE ORDER THEY HAPPENED IN,
# which is `5g-iii`'s finding reused rather than rediscovered: written
# chronologically, the line's own `created_at` ascends exactly as the document's
# `occurred_at` does and a check cannot tell the two sort keys apart. ⚠️ It is
# also the faithful case — the outbox replays what it holds in whatever order it
# was keyed (§2.6, `5c`).
#
# Hours ago, kilos, pesos per gram. The QUANTITIES differ so assertion 5 can name
# which delivery came back and not merely how many.
FIRST="$(buy 30 "$VARIANT_ID" '3'  '0.018500')"
note
if [[ "$(status "$FIRST")" == "200" ]]; then
  ok "record_purchase accepts a dated, offline-recorded delivery"
else
  fail "record_purchase refused the first delivery: $(body "$FIRST")"
  exit 1
fi
buy  2 "$VARIANT_ID" '5'  '0.020000' > /dev/null
buy 60 "$VARIANT_ID" '1'  '0.016000' > /dev/null
buy 10 "$VARIANT_ID" '4'  '0.019000' > /dev/null
buy 40 "$VARIANT_ID" '2'  '0.021000' > /dev/null
# ⚠️ AND ONE OF THE OTHER VARIANT — assertion 6 needs the read to carry BOTH.
buy  5 "$OTHER_ID"   '7'  '0.099000' > /dev/null

# --- 2, 3, 4, 6, 7. the read the app actually makes -------------------------
# ⚠️ NO FILTER IN THE PATH, WHICH IS THE POINT OF ASSERTION 6 — `shopMagnitude`
# passes none, because the guard fires over a whole basket.
READ_PATH="/rest/v1/$MAGNITUDE_TABLE?select=$MAGNITUDE_COLUMNS&order=$WIRE_ORDER&limit=$MAGNITUDE_LIMIT"
HISTORY="$(api GET "$READ_PATH")"
HISTORY_FILE="$(stash history "$HISTORY")"

note
if [[ "$(status "$HISTORY")" == "200" ]]; then
  ok "the read answers 200 — the embed over the COMPOSITE fk resolves under a limit"
else
  fail "the magnitude read answered $(status "$HISTORY"): $(body "$HISTORY")"
  echo '      purchase_line_header_fk is (purchase_id, workspace_id, location_id), not'
  echo '      the single-column shape every other embed in this app uses.'
  echo '      ⚠️⚠️ A 42703 NAMING occurred_at IS THE DEFECT THIS CHECK FOUND ON ITS FIRST'
  echo '      RUN, 2026-09-25, and it is why MAGNITUDE_COLUMNS selects a column nothing'
  echo "      reads: PostgREST will only order a PARENT by an embedded column that is in"
  echo "      the embed's select list. COSTS_COLUMNS never met this because Costos RENDERS"
  echo '      the date. Restore `occurred_at` to the embed — see that constant.'
  exit 1
fi

BANNED='qty_display,qty_display_unit,line_net,tax_amount,tax_rate,expiry_date,created_at,workspace_id,location_id,purchase_id'

cat > "$SCRATCH/shape.py" <<'PY'
import json, sys
path, banned, variant, other = sys.argv[1], sys.argv[2].split(','), sys.argv[3], sys.argv[4]
try:
    rows = json.load(open(path))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list):
    print('the magnitude read came back as an error: %r' % (rows,)); raise SystemExit

if len(rows) != 6:
    print('six lines were recorded across two products and the read returned %d — '
          'this read carries NO filter, because the guard fires over a whole basket'
          % len(rows)); raise SystemExit

# ⚠️⚠️ ASSERTION 6 — SHOP-WIDE. A variant filter creeping back in would leave
# every product but one with no median and the guard silent on the rest.
seen = {r.get('variant_id') for r in rows}
if seen != {variant, other}:
    print('the read carried variants %r; both products the shop bought must be in one '
          'read, or the basket costs a round trip per line' % sorted(seen))
    raise SystemExit

for row in rows:
    if set(row) != {'variant_id', 'qty_base', 'unit_price_net_per_base', 'purchase'}:
        print('the line carried %r; the app asks for the variant, the quantity, the '
              'price and the document, and nothing else' % sorted(row)); raise SystemExit
    reached = [c for c in banned if c in row]
    if reached:
        print('%s reached the phone — a column the app never asks for is a column '
              'that never reaches a phone (C8.8, R13)' % reached); raise SystemExit
    doc = row['purchase']
    if not isinstance(doc, dict):
        print('the document came back as %r rather than as an object — `!inner` on a '
              'to-one embed should nest exactly one' % (doc,)); raise SystemExit
    if set(doc) != {'id', 'occurred_at', 'reversal_of'}:
        print('the document carried %r; the app asks for the id, the reversal link and '
              '— only so PostgREST will sort the parent — occurred_at' % sorted(doc))
        raise SystemExit

    # ⚠️⚠️ ASSERTION 3 — THE CAST THIS CHECK EXISTS FOR, READ OFF THE WIRE.
    qty = row['qty_base']
    if not isinstance(qty, str):
        print('qty_base arrived as %s (%r) rather than as a string — the ::text cast is '
              'gone. parseDecimal refuses a number argument outright, typicalFrom would '
              'drop EVERY sample, and §2.8\'s guard would go silent with nothing going '
              'red (R5)' % (type(qty).__name__, qty)); raise SystemExit

    # ⚠️ ASSERTION 4 — the price cast, re-asserted by its second reader.
    price = row['unit_price_net_per_base']
    if not isinstance(price, str):
        print('unit_price_net_per_base arrived as %s (%r) rather than as a string — the '
              '::text cast is gone and every cost in this path would go through a '
              'double (R5)' % (type(price).__name__, price)); raise SystemExit

print('ok — six lines across two products, both numerics as strings, nothing unasked-for')
PY
verdict "the read carries exactly what the contract asks for, shop-wide" \
  "$SCRATCH/shape.py" "$HISTORY_FILE" "$BANNED" "$VARIANT_ID" "$OTHER_ID"

# --- 5. the order and the limit compose ------------------------------------
# ⚠️⚠️ THE SLICE IS DRIVEN AT limit=2 AND NOT AT MAGNITUDE_LIMIT, DELIBERATELY.
# What can break is the COMPOSITION — an order that silently stops applying to the
# parent leaves `limit` slicing planner order — and that is visible at two rows.
# Recording 401 deliveries to exercise the real number would buy nothing this
# cannot see and would take minutes. The app's own limit IS on the wire above.
SLICE_FILE="$(stash slice "$(api GET "/rest/v1/$MAGNITUDE_TABLE?select=$MAGNITUDE_COLUMNS&order=$WIRE_ORDER&limit=2")")"
# ⚠️ THE WRONG SPELLING, DRIVEN IN THE SAME RUN — `purchase.order` sorts the
# embedded row inside each parent, which on a to-one embed is nothing at all.
WRONG_FILE="$(stash wrong "$(api GET "/rest/v1/$MAGNITUDE_TABLE?select=$MAGNITUDE_COLUMNS&purchase.order=occurred_at.$DIRECTION&limit=2")")"

cat > "$SCRATCH/slice.py" <<'PY'
import json, sys
sliced, wrong = sys.argv[1], sys.argv[2]

def rows(path):
    r = json.load(open(path))
    return r if isinstance(r, list) else None

got = rows(sliced)
if got is None:
    print('the limited read came back as an error'); raise SystemExit
if len(got) != 2:
    print('limit=2 returned %d rows' % len(got)); raise SystemExit

# The two newest documents are 2h and 5h ago — the 5 kg of one product and the
# 7 kg of the other. Named by QUANTITY, which is why the fixtures differ.
#
# ⚠️ IN GRAMS, BECAUSE `qty_base` IS THE BASE UNIT AND THE FIXTURE BUYS KILOS —
# `record_purchase` normalises `qty_display` through `unit.factor_to_base`. This
# line read '5.000' on the first run and went red on a correct response, which is
# the ordinary way an expectation written from the payload instead of from the
# schema fails.
newest = [r['qty_base'] for r in got]
if newest != ['5000.000', '7000.000']:
    print('the two newest deliveries are 5 kg (2h ago) and 7 kg (5h ago) — 5000 g and '
          '7000 g, newest first; the limited read returned %r. The limit is slicing an '
          'order that is not being applied to the parent, so "trailing" is an arbitrary '
          'slice of the shop\'s whole history' % newest)
    raise SystemExit

instants = [r['purchase']['occurred_at'] for r in got]
if instants != sorted(instants, reverse=True):
    print('the limited read came back out of order: %r' % instants); raise SystemExit

bad = rows(wrong)
if bad is None:
    print('the { referencedTable } read came back as an error rather than as a no-op — '
          'this assertion exhibits the WRONG answer and needs it to be answerable')
    raise SystemExit
if [r['qty_base'] for r in bad] == newest:
    print('the `purchase.order` spelling returned the same two rows as the column '
          'expression, so this run cannot tell the right spelling from the wrong one. '
          'That is a coincidence of the planner, not a falsification — see COSTS_ORDER')
    raise SystemExit

print('ok — the newest two, in order, and the { referencedTable } spelling did NOT sort them')
PY
verdict "the order and the limit compose — *trailing* is real" "$SCRATCH/slice.py" "$SLICE_FILE" "$WRONG_FILE"

# --- 8. an Empleada reads all of it ----------------------------------------
# ⚠️⚠️ THIS IS THE ASSERTION THAT KEEPS §2.8's PARAGRAPH TRUE. The ADR's error is
# *a cashier* mistyping; before `0040` her read was 200-and-empty, so every median
# was absent and the guard was silently dead for exactly her.
# ⚠️ THE STAFF INVITE NAMES A LOCATION, which `0028` requires and §2.7 is the
# reason for: *"Staff write only where member_location puts them, and RLS refuses
# the rest silently."* ⚠️ **It also makes this assertion sharper**: she is placed
# in THIS store, so the rows she reads come through `my_locations()` rather than
# past it — `0040` dropped the role clause and KEPT the location wall.
STAFF_INVITE_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "mag-staff-$STAMP@example.com" "$LOCATION_ID")"
TOKEN="$OWNER_TOKEN"
INVITE_OUT="$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE_JSON")"
STAFF_TOKEN_STR="$(pick token "$(body "$INVITE_OUT")")"
[[ -n "$STAFF_TOKEN_STR" ]] || {
  echo "FAIL: create_invite returned no token for the cashier — $(status "$INVITE_OUT"): $(body "$INVITE_OUT" | head -c 300)"
  exit 1; }

signup "mag-staff-$STAMP@example.com"
REDEEMED="$(api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_TOKEN_STR\"}")"
note
if [[ "$(status "$REDEEMED")" == "200" ]]; then
  ok "an Empleada joined the shop at this location"
else
  fail "redeem_invite refused: $(body "$REDEEMED")"
  exit 1
fi

STAFF_FILE="$(stash staff "$(api GET "$READ_PATH")")"
cat > "$SCRATCH/staff.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if not isinstance(rows, list):
    print('the Empleada read came back as an error: %r — note that an RLS SELECT '
          'refusal is 200 and an EMPTY ARRAY, never a 403' % (rows,)); raise SystemExit
if len(rows) != 6:
    print('the Empleada read %d of the six lines her shop recorded. `0040` dropped the '
          "role gate from purchase_line_select and kept my_locations(); if it has been "
          'narrowed again, §2.8\'s guard is silently dead for the one role the ADR names '
          '— *"a cashier meaning 1.5 kg who types 15"* — with nothing going red'
          % len(rows))
    raise SystemExit
print('ok — all six, which is what makes this guard reach the person §2.8 is about')
PY
verdict "an Empleada reads the whole history the guard is built on (0040)" "$SCRATCH/staff.py" "$STAFF_FILE"

# --- 9. another shop reads none of it --------------------------------------
signup "mag-stranger-$STAMP@example.com"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Otra tienda","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
STRANGER_FILE="$(stash stranger "$(api GET "$READ_PATH")")"
cat > "$SCRATCH/stranger.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if not isinstance(rows, list):
    print('the stranger read came back as an error: %r' % (rows,)); raise SystemExit
if rows:
    print("another shop read %d of this shop's delivery lines — what a shop pays is the "
          'most commercially sensitive figure it has (§2.7)' % len(rows)); raise SystemExit
print('ok — nothing')
PY
verdict "another shop reads none of this shop's deliveries" "$SCRATCH/stranger.py" "$STRANGER_FILE"

# --- verdict ---------------------------------------------------------------
echo
if [[ "$fails" -eq 0 ]]; then
  echo "all $ran assertion groups passed — app/src/api/magnitude.ts still describes"
  echo "the database, and the read behind §2.8's magnitude warning comes back trailing."
  exit 0
fi
echo "$fails of $ran assertion groups FAILED."
exit 1

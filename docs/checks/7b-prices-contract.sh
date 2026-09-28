#!/usr/bin/env bash
# 7b-prices-contract — does `app/src/api/prices.ts` still describe the two views
# `Precios` reads, `product_velocity_daily` and `product_purchases_daily`, and do
# the reads come back the way the chart and the cards need them?
#
# ⚠️⚠️ SIX CLAIMS LIVE HERE AND NOWHERE ELSE IN THIS REPOSITORY.
#
#   1. ⚠️⚠️ **THE PRICE WITH IVA ARRIVES AT TEN DECIMALS.** `0032` multiplies a
#      `numeric(14,6)` by `1 + numeric(5,4)`, which Postgres returns at scale 10 —
#      and `parseDecimal` at the unit-price scale (6) THROWS on it. So the app
#      rounds once (`perBaseText`). If the wire ever sends six places this check
#      says so, because the rounding would then be doing nothing; if it sends
#      more than ten, `perBaseText` refuses every point and the chart is empty
#      with nothing red anywhere. Only a real database can say which.
#
#   2. ⚠️⚠️ **A SALE'S PRICE WITH IVA LANDS ON THE SHELF PRICE.** `record_sale`
#      stores a DERIVED net (`round(line_net / qty_base, 6)`, `0016`) and `0032`
#      grosses it back up. 1.5 kg of a 16%-IVA product keyed at $120.00/kg must
#      come back as a per-gram figure that rounds to exactly $120.00 a kilo.
#      A purchase keyed at a net of $80.00/kg comes back as exactly $92.80.
#
#   3. ⚠️⚠️ **THE DAY'S PRICE IS THE LAST ONE TYPED, NOT THE AVERAGE.** Two sales
#      of one product on one day at $3.00 and then $3.50 must read $3.50 —
#      the effective price beside it is $3.1666…, and both are strings.
#
#   4. ⚠️ **THE QUANTITY FILTER IS WHAT MAKES A LIST OF PRICES.** The sale view is
#      a spine: a product bought and never sold has a row every day with a NULL
#      price, and must NOT come back. And a day holding only a REVERSAL — a
#      delivery voided two days later — nets negative and must not come back
#      either; `line_count` (Números' filter) would keep it. Both are asserted
#      unfiltered too, so *filtered out* is not vacuous.
#
#   5. ⚠️⚠️ **EVERY ROLE READS BOTH SIDES — `0040` AND `0003` REST ON THIS.** A
#      cashier reads exactly the owner's rows on both views. The purchase side
#      was manager-only until `0040` (the owner's ruling of 2026-09-25); if a
#      later migration fences it again, `Precios` opens for her on a sale line
#      and a purchase side that says *sin compras todavía* — a lie. ⚠️ RLS is
#      bypassed by `postgres`, so this is asserted over HTTP.
#
#   6. ⚠️ **NOBODY ELSE'S SHOP, AND PAGING THAT REASSEMBLES** — `7a`'s two claims
#      for the same reasons: both views are `security_invoker`, and `max_rows`
#      truncates silently.
#
# WHAT IS DELIBERATELY NOT ASSERTED HERE:
#
#   ⚠️ THE WINDOWS AND THE PERCENTAGES. Which day a card compares against, how a
#   change rounds, what a dash means — pure TypeScript, owned by
#   `app/test/api-prices.test.ts` ([[a-shell-check-cannot-see-a-pure-function]]).
#
#   ⚠️ A SECOND LOCATION, `7a`'s reason: C1.5 puts every pilot shop at one store.
#
# Run:  supabase start && supabase db reset && bash docs/checks/7b-prices-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/prices.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- the contract, read out of the app --------------------------------------
# ⚠️ EVERY STRING BELOW IS THE MODULE'S OWN — a check that retypes a contract is
# asserting itself.
str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
num() { sed -n "s/^export const $1 = \([0-9][0-9]*\);.*/\1/p" "$2" | head -1; }

SALE_PRICE_VIEW="$(str SALE_PRICE_VIEW "$CONTRACT")"
SALE_PRICE_COLUMNS="$(str SALE_PRICE_COLUMNS "$CONTRACT")"
SALE_PRICE_TRADED_COLUMN="$(str SALE_PRICE_TRADED_COLUMN "$CONTRACT")"
PURCHASE_PRICE_VIEW="$(str PURCHASE_PRICE_VIEW "$CONTRACT")"
PURCHASE_PRICE_COLUMNS="$(str PURCHASE_PRICE_COLUMNS "$CONTRACT")"
PURCHASE_PRICE_TRADED_COLUMN="$(str PURCHASE_PRICE_TRADED_COLUMN "$CONTRACT")"
PRICE_VARIANT_COLUMN="$(str PRICE_VARIANT_COLUMN "$CONTRACT")"
PRICE_DAY_COLUMN="$(str PRICE_DAY_COLUMN "$CONTRACT")"
PRICE_PAGE="$(num PRICE_PAGE "$CONTRACT")"
PRICE_TIEBREAK="$(sed -n "s/^export const PRICE_TIEBREAK: readonly string\[\] = \[\(.*\)\];.*/\1/p" "$CONTRACT" \
  | tr -d " '" | head -1)"

note
for name in SALE_PRICE_VIEW SALE_PRICE_COLUMNS SALE_PRICE_TRADED_COLUMN PURCHASE_PRICE_VIEW \
            PURCHASE_PRICE_COLUMNS PURCHASE_PRICE_TRADED_COLUMN PRICE_VARIANT_COLUMN \
            PRICE_DAY_COLUMN PRICE_PAGE PRICE_TIEBREAK; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app"
    echo "      This check asserts the app's own constants against a real database."
    echo "      If it cannot find them it has nothing to assert, and a green here"
    echo "      would be the vacuous kind ADR-035 §9 refuses."
    exit 1
  fi
done
ok "read from $CONTRACT: $SALE_PRICE_VIEW + $PURCHASE_PRICE_VIEW, page $PRICE_PAGE, order $PRICE_DAY_COLUMN.asc,$PRICE_TIEBREAK"

# --- 6a. the page is below the cap -----------------------------------------
MAX_ROWS="$(sed -n 's/^max_rows *= *\([0-9][0-9]*\).*/\1/p' supabase/config.toml | head -1)"
note
if [[ -z "$MAX_ROWS" ]]; then
  fail "could not read max_rows out of supabase/config.toml"
elif (( PRICE_PAGE < MAX_ROWS )); then
  ok "PRICE_PAGE ($PRICE_PAGE) is below max_rows ($MAX_ROWS), so a short page can only mean the end"
else
  fail "PRICE_PAGE ($PRICE_PAGE) IS NOT BELOW max_rows ($MAX_ROWS)."
  echo "      PostgREST truncates every response at max_rows WITHOUT AN ERROR, and the read"
  echo "      stops at the first short page — so every page is short and history is cut."
fi

# --- the ruling: both lines with IVA ----------------------------------------
note
if [[ "$SALE_PRICE_COLUMNS" == *"sale_price_last_gross::text"* && \
      "$PURCHASE_PRICE_COLUMNS" == *"purchase_price_last_gross::text"* ]]; then
  ok "both reads ask for the typed price WITH IVA, as text — the forty-first ruling"
else
  fail "the reads no longer ask for both *_price_last_gross::text: $SALE_PRICE_COLUMNS / $PURCHASE_PRICE_COLUMNS"
  echo "      Ruled 2026-09-28: one chart, both lines with IVA. A net figure on one"
  echo "      side is 16% off the other on a taxed product, and both are strings."
fi

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)"
  echo "      from the repository root — \`supabase status\` needs the project directory."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS and
# claims 5 and 6 would pass vacuously.
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
# ⚠️ A RESPONSE BODY IS WRITTEN TO A FILE AND NEVER INTERPOLATED INTO PYTHON SOURCE.
stash()  { local f="$SCRATCH/$1.json"; body "$2" > "$f"; echo "$f"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
first()  { python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['$1'] if isinstance(r,list) and r else '')" <<< "$2" 2>/dev/null; }
uuid()   { python3 -c 'import uuid;print(uuid.uuid4())'; }

verdict() { # label python-file extra-args...
  local label="$1"; shift
  local out
  out="$(python3 "$@" 2>&1)"
  [[ -z "$out" ]] && out="the verdict script produced nothing — it crashed on the shape that came back"
  note
  if [[ "$out" == ok* ]]; then ok "$label${out#ok}"; else fail "$out"; fi
}

# ⚠️ SIGNUP IS RETRIED — GoTrue rate-limits it and answers with an EMPTY BODY.
signup() { # email -> sets TOKEN
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"prices-probe-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  exit 1
}

STAMP="$$-$(date +%s)"

# --- the shop, its people and its catalog ----------------------------------
signup "prices-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Precios 7b","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }
LOCATIONS="$(api GET '/rest/v1/location?select=id,timezone')"
LOCATION_ID="$(first id "$(body "$LOCATIONS")")"
TIMEZONE="$(first timezone "$(body "$LOCATIONS")")"
[[ -n "$LOCATION_ID" && -n "$TIMEZONE" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

STAFF_EMAIL="prices-staff-$STAMP@example.com"
STAFF_INVITE="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "$STAFF_EMAIL" "$LOCATION_ID")"
STAFF_INVITE_TOKEN="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE")")")"
[[ -n "$STAFF_INVITE_TOKEN" ]] || { echo "FAIL: create_invite returned no token for the cashier"; exit 1; }

TOKEN="$OWNER_TOKEN"
FAMILY_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Lácteos y más"}))' "$WORKSPACE_ID")"
FAMILY_ID="$(first id "$(body "$(api POST '/rest/v1/product_family?select=id' "$FAMILY_JSON")")")"
[[ -n "$FAMILY_ID" ]] || { echo "FAIL: could not create a family"; exit 1; }

variant() { # name base-unit price-unit tax-rate -> id
  local json
  json="$(python3 -c '
import json, sys
print(json.dumps({
  "workspace_id": sys.argv[1], "family_id": sys.argv[2], "name": sys.argv[3],
  "base_unit_code": sys.argv[4], "purchase_unit_code": sys.argv[5],
  "sell_unit_code": sys.argv[5], "price_unit_code": sys.argv[5], "tax_rate": sys.argv[6]}))' \
    "$WORKSPACE_ID" "$FAMILY_ID" "$1" "$2" "$3" "$4")"
  first id "$(body "$(api POST '/rest/v1/product_variant?select=id' "$json")")"
}
# ⚠️ QUESO carries 16% IVA (claims 1 and 2); HUEVO none and is sold twice at two
# prices (claim 3) and bought on two days (paging); CREMA is bought and never sold
# (the spine); LECHE is bought and the delivery voided two days later (the
# reversal-only day).
QUESO="$(variant 'Queso fresco' g kg 0.1600)"
HUEVO="$(variant 'Huevo blanco' pza pza 0)"
CREMA="$(variant 'Crema ácida' g kg 0)"
LECHE="$(variant 'Leche entera' pza pza 0)"
[[ -n "$QUESO" && -n "$HUEVO" && -n "$CREMA" && -n "$LECHE" ]] || { echo "FAIL: could not create four variants"; exit 1; }
GENERIC_ID="$(first id "$(body "$(api GET '/rest/v1/provider?select=id&is_generic=is.true')")")"
[[ -n "$GENERIC_ID" ]] || { echo "FAIL: the new shop has no generic provider"; exit 1; }

# ⚠️ TWO DAYS AGO, RECORDED OFFLINE: `record_purchase` clamps an offline
# `occurred_at` to the last 72 hours ([[record-rpcs-constrain-what-a-fixture-can-be]]),
# so 48 hours lands as asked. The store's own date for it is computed in its zone.
BACK="$(python3 -c 'import datetime;print((datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(hours=48)).isoformat())')"
BACK_DAY="$(python3 -c 'import datetime,sys,zoneinfo;print(datetime.datetime.fromisoformat(sys.argv[1]).astimezone(zoneinfo.ZoneInfo(sys.argv[2])).date().isoformat())' "$BACK" "$TIMEZONE")"
TODAY="$(python3 -c 'import datetime,sys,zoneinfo;print(datetime.datetime.now(zoneinfo.ZoneInfo(sys.argv[1])).date().isoformat())' "$TIMEZONE")"

buy() { # id lines-json occurred-at-or-empty -> response
  api POST /rest/v1/rpc/record_purchase "$(python3 -c '
import json, sys
args = {"p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_provider_id": sys.argv[3],
        "p_lines": json.loads(sys.argv[4])}
if sys.argv[5]:
    args["p_occurred_at"] = sys.argv[5]
    args["p_recorded_offline"] = True
print(json.dumps(args))' "$1" "$LOCATION_ID" "$GENERIC_ID" "$2" "${3:-}")"
}
line() { # variant qty unit key price -> json object
  python3 -c 'import json,sys;print(json.dumps({"variant_id":sys.argv[1],"qty_display":sys.argv[2],"qty_display_unit":sys.argv[3],sys.argv[4]:sys.argv[5]}))' "$@"
}
BOUGHT="$(buy "$(uuid)" "[$(line "$QUESO" 5 kg unit_price_net_per_base 0.080000),$(line "$HUEVO" 60 pza unit_price_net_per_base 2.000000),$(line "$CREMA" 2 kg unit_price_net_per_base 0.050000)]" "$BACK")"
MILK_ID="$(uuid)"
MILK="$(buy "$MILK_ID" "[$(line "$LECHE" 10 pza unit_price_net_per_base 1.000000)]" "$BACK")"
MORE="$(buy "$(uuid)" "[$(line "$HUEVO" 30 pza unit_price_net_per_base 2.500000)]" "")"
UNDONE="$(api POST /rest/v1/rpc/void_transaction \
  "{\"p_kind\":\"purchase\",\"p_id\":\"$MILK_ID\",\"p_reason\":\"7b fixture\"}")"

sell() { # id lines-json -> response
  api POST /rest/v1/rpc/record_sale "$(python3 -c '
import json, sys
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_lines": json.loads(sys.argv[3])}))' \
    "$1" "$LOCATION_ID" "$2")"
}
# ⚠️ `unit_price_GROSS_per_base` ON A SALE (`0016`). 1.5 kg of queso at $120/kg
# gross; then twelve eggs at $3.00, and six more at $3.50 in a LATER sale.
SOLD="$(sell "$(uuid)" "[$(line "$QUESO" 1.5 kg unit_price_gross_per_base 0.120000),$(line "$HUEVO" 12 pza unit_price_gross_per_base 3.000000)]")"
SOLD_TOO="$(sell "$(uuid)" "[$(line "$HUEVO" 6 pza unit_price_gross_per_base 3.500000)]")"

note
if [[ "$(status "$BOUGHT")" == "200" && "$(status "$MILK")" == "200" && "$(status "$MORE")" == "200" \
      && "$(status "$UNDONE")" == "200" && "$(status "$SOLD")" == "200" && "$(status "$SOLD_TOO")" == "200" ]]; then
  ok "three deliveries (two of them two days back), one voided today, and two sales today"
else
  fail "the fixture did not land: bought $(status "$BOUGHT") $(body "$BOUGHT") / milk $(status "$MILK") / more $(status "$MORE") / void $(status "$UNDONE") $(body "$UNDONE") / sold $(status "$SOLD") $(body "$SOLD") / sold too $(status "$SOLD_TOO")"
  exit 1
fi
[[ "$BACK_DAY" != "$TODAY" ]] || { echo "FAIL: two days back is the same store day as today — the fixture cannot tell days apart"; exit 1; }

# ⚠️ THE READ, SPELLED AS postgrest-js SPELLS IT: `.eq`, `.gt`, two `.order`s and
# `.range(from, to)`, which becomes `offset` and `limit`.
ORDER="$PRICE_DAY_COLUMN.asc"
IFS=',' read -r -a TIES <<< "$PRICE_TIEBREAK"
for col in "${TIES[@]}"; do ORDER="$ORDER,$col.asc"; done
sale_read() { # variant [offset limit] -> response
  api GET "/rest/v1/$SALE_PRICE_VIEW?select=$SALE_PRICE_COLUMNS&$PRICE_VARIANT_COLUMN=eq.$1&$SALE_PRICE_TRADED_COLUMN=gt.0&order=$ORDER&offset=${2:-0}&limit=${3:-$PRICE_PAGE}"
}
purchase_read() { # variant [offset limit] -> response
  api GET "/rest/v1/$PURCHASE_PRICE_VIEW?select=$PURCHASE_PRICE_COLUMNS&$PRICE_VARIANT_COLUMN=eq.$1&$PURCHASE_PRICE_TRADED_COLUMN=gt.0&order=$ORDER&offset=${2:-0}&limit=${3:-$PRICE_PAGE}"
}

# --- 1-3. the owner's reads --------------------------------------------------
Q_SALE="$(sale_read "$QUESO")"
Q_BUY="$(purchase_read "$QUESO")"
H_SALE="$(sale_read "$HUEVO")"
H_BUY="$(purchase_read "$HUEVO")"
note
if [[ "$(status "$Q_SALE")" == "200" && "$(status "$Q_BUY")" == "200" ]]; then
  ok "both reads Precios makes answer 200"
else
  fail "THE READS ANSWERED $(status "$Q_SALE") / $(status "$Q_BUY"): $(body "$Q_SALE") $(body "$Q_BUY")"
  echo "      A renamed column, an alias PostgREST no longer accepts or a filter on a"
  echo "      column that moved is a 400 here — and a Precios screen that says the"
  echo "      connection failed on every phone."
  exit 1
fi

cat > "$SCRATCH/prices.py" <<'PY'
import json, re, sys
from decimal import Decimal, ROUND_HALF_UP
q_sale, q_buy, h_sale, h_buy, today, back = sys.argv[1:7]
def rows(path, what):
    r = json.load(open(path))
    if not isinstance(r, list):
        print('%s came back as %r' % (what, r)); raise SystemExit
    for row in r:
        if sorted(row) != ['day', 'price']:
            print('%s: a row carried %s where the alias asks for exactly day and price' % (what, sorted(row)))
            raise SystemExit
        if not isinstance(row['price'], str):
            print('%s: price came back as %s, not a string — parseDecimal refuses a JSON number, '
                  'and every point on the chart would be dropped' % (what, type(row['price']).__name__))
            raise SystemExit
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(row['day'])):
            print('%s: day came back as %r, not a YYYY-MM-DD date' % (what, row['day'])); raise SystemExit
    return r
qs, qb, hs, hb = rows(q_sale, 'queso sale'), rows(q_buy, 'queso purchase'), rows(h_sale, 'huevo sale'), rows(h_buy, 'huevo purchase')
# ⚠️ FIRST, so a read of the EFFECTIVE price fails for this reason and not for its scale.
if hs != [{'day': today, 'price': '3.5000000000'}]:
    print('THE DAY\'S PRICE IS NOT THE LAST ONE TYPED: huevo sold at $3.00 then $3.50 today and '
          'reads %r. The effective price is $3.1666…; the card compares STATES.' % (hs,))
    raise SystemExit
if [r['day'] for r in qs] != [today]:
    print('queso sold once, today (%s); the sale read has %r' % (today, qs)); raise SystemExit
price = qs[0]['price']
places = len(price.split('.')[1]) if '.' in price else 0
if places != 10:
    print('THE SALE PRICE WITH IVA CAME BACK AT %d DECIMALS (%r), NOT 10. perBaseText in '
          '@/api/prices rounds ten places to six because parseDecimal refuses more than six; '
          'if the wire changed, re-derive that function before trusting the chart.' % (places, price))
    raise SystemExit
kilo = (Decimal(price).quantize(Decimal('0.000001'), ROUND_HALF_UP) * 1000).quantize(Decimal('0.01'), ROUND_HALF_UP)
if kilo != Decimal('120.00'):
    print('QUESO WAS KEYED AT $120.00/kg WITH IVA AND THE TYPED GROSS %r READS $%s A KILO. '
          'record_sale stores a derived net and 0032 grosses it back up; the round trip '
          'must land on the shelf price.' % (price, kilo))
    raise SystemExit
if qb != [{'day': back, 'price': '0.0928000000'}]:
    print('QUESO WAS BOUGHT AT A NET OF $0.080000/g WITH 16%% IVA ON %s — %r, NOT '
          '0.0928000000 ($92.80/kg with IVA)' % (back, qb))
    raise SystemExit
if hb != [{'day': back, 'price': '2.0000000000'}, {'day': today, 'price': '2.5000000000'}]:
    print('huevo was bought on %s at $2.00 and today at $2.50; the purchase read, oldest '
          'first, has %r' % (back, hb))
    raise SystemExit
print('ok — ten places, $120.00/kg rebuilt exactly, $92.80/kg bought, the LAST sale price, oldest first')
PY
Q_SALE_FILE="$(stash q_sale "$Q_SALE")"; Q_BUY_FILE="$(stash q_buy "$Q_BUY")"
H_SALE_FILE="$(stash h_sale "$H_SALE")"; H_BUY_FILE="$(stash h_buy "$H_BUY")"
verdict "the prices are with IVA, typed, and on the store's days" \
  "$SCRATCH/prices.py" "$Q_SALE_FILE" "$Q_BUY_FILE" "$H_SALE_FILE" "$H_BUY_FILE" "$TODAY" "$BACK_DAY"

# --- 4. the filter is what makes a list of prices ----------------------------
C_SALE="$(body "$(sale_read "$CREMA")")"
C_SPINE="$(body "$(api GET "/rest/v1/$SALE_PRICE_VIEW?select=day&$PRICE_VARIANT_COLUMN=eq.$CREMA")")"
note
if [[ "$C_SALE" == "[]" && "$C_SPINE" == *"day"* ]]; then
  ok "a product bought and never sold has spine rows, and the quantity filter drops every one"
else
  fail "THE SPINE: filtered $C_SALE / unfiltered $C_SPINE"
  echo "      Filtered must be [] (no sale, no price) and unfiltered must carry rows —"
  echo "      otherwise the first half measured nothing."
fi

L_BUY="$(body "$(purchase_read "$LECHE")")"
L_ALL="$(body "$(api GET "/rest/v1/$PURCHASE_PRICE_VIEW?select=day,purchases_qty_base::text&$PRICE_VARIANT_COLUMN=eq.$LECHE&order=day.asc")")"
cat > "$SCRATCH/void.py" <<'PY'
import json, sys
kept, whole, today, back = json.loads(sys.argv[1]), json.loads(sys.argv[2]), sys.argv[3], sys.argv[4]
if [r['day'] for r in whole] != [back, today] or not whole[1]['purchases_qty_base'].startswith('-'):
    print('the unfiltered view should carry the delivery on %s and a NEGATIVE reversal-only day '
          'today; it carries %r — so the filtered half would measure nothing' % (back, whole)); raise SystemExit
if kept != [{'day': back, 'price': '1.0000000000'}]:
    print('A DAY HOLDING ONLY A REVERSAL CAME BACK AS A PRICE: %r. The delivery was voided today, '
          'so today nets negative and must not be a point — line_count would have kept it.' % (kept,))
    raise SystemExit
print('ok')
PY
verdict "a day holding only a voided delivery is not a price, and the delivery's own day still is" \
  "$SCRATCH/void.py" "$L_BUY" "$L_ALL" "$TODAY" "$BACK_DAY"

# --- 6b. one row at a time reassembles the same list ------------------------
ONE="$(body "$(purchase_read "$HUEVO" 0 1)")"; TWO="$(body "$(purchase_read "$HUEVO" 1 1)")"; END="$(body "$(purchase_read "$HUEVO" 2 1)")"
PAGED="$(python3 -c 'import json,sys;print(json.dumps(json.loads(sys.argv[1])+json.loads(sys.argv[2])+json.loads(sys.argv[3])))' "$ONE" "$TWO" "$END" 2>/dev/null)"
WHOLE="$(python3 -c 'import json,sys;print(json.dumps(json.load(open(sys.argv[1]))))' "$H_BUY_FILE")"
note
if [[ -n "$PAGED" && "$PAGED" == "$WHOLE" && "$END" == "[]" ]]; then
  ok "paging one row at a time over the app's order reassembles the whole read, then stops"
else
  fail "PAGING DID NOT REASSEMBLE THE READ: whole=$WHOLE paged=$PAGED"
fi

# --- 5. the cashier reads the same rows, on both sides ----------------------
signup "$STAFF_EMAIL"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_INVITE_TOKEN\"}" > /dev/null
HER_SALE="$(sale_read "$QUESO")"; HER_BUY="$(purchase_read "$QUESO")"; HER_EGGS="$(purchase_read "$HUEVO")"
note
if [[ "$(body "$HER_SALE")" == "$(cat "$Q_SALE_FILE")" && "$(body "$HER_BUY")" == "$(cat "$Q_BUY_FILE")" \
      && "$(body "$HER_EGGS")" == "$(cat "$H_BUY_FILE")" ]]; then
  ok "a cashier reads exactly the owner's rows on BOTH sides — 0003 for sales, 0040 for purchases"
else
  fail "THE CASHIER'S READ DIFFERS FROM THE OWNER'S: sale $(body "$HER_SALE") / purchase $(body "$HER_BUY") / eggs $(body "$HER_EGGS")"
  echo "      The owner ruled on 2026-09-25 that an Empleada sees what the shop paid (0040),"
  echo "      and on 2026-09-28 that every role sees Números. If a view is fenced now,"
  echo "      Precios opens for her on a side that says nothing was ever bought."
fi

# --- 6. and another shop reads none of them ---------------------------------
signup "prices-stranger-$STAMP@example.com"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Otra tienda 7b","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
THEIR_SALE="$(sale_read "$QUESO")"; THEIR_BUY="$(purchase_read "$QUESO")"
note
if [[ "$(status "$THEIR_SALE")" == "200" && "$(body "$THEIR_SALE")" == "[]" \
      && "$(status "$THEIR_BUY")" == "200" && "$(body "$THEIR_BUY")" == "[]" ]]; then
  ok "another shop's owner reads none of these prices — 200 and [] on both sides"
else
  fail "ANOTHER SHOP READ THIS SHOP'S PRICES: $(body "$THEIR_SALE") / $(body "$THEIR_BUY")"
  echo "      Both views are security_invoker, so their fence is every join's."
fi

echo
if (( fails > 0 )); then
  echo "$ran assertion group(s) ran, $fails failed — the price views do not answer the way"
  echo "app/src/api/prices.ts says they do."
  exit 1
fi
echo "all $ran assertion groups passed — Precios reads the typed price with IVA on both sides,"
echo "one point per traded day, for every role in the shop and nobody outside it."

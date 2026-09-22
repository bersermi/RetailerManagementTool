#!/usr/bin/env bash
# 5d-i-catalog-contract — does `app/src/api/catalog.ts` still describe the
# database, over a real HTTP round trip with a real shop in it?
#
# WHY THIS EXISTS, AND IT IS THE ARGUMENT `5b-i-api-contract.sh` MADE OVER A
# THIRD SURFACE. `app/test/api-catalog.test.ts` proves the app is consistent
# with itself. Nothing in TypeScript has ever read `0001` or `0002`, so a column
# renamed on either side of the wire is a 400 that the typecheck, the Vitest
# suite and the bundler all pass straight over:
#
#     {"code":"42703","message":"column product_variant.precio does not exist"}
#
# ⚠️⚠️ AND THREE THINGS HERE CANNOT BE ASSERTED ANYWHERE ELSE AT ALL:
#
#   * THE EMBED. `product_variant_family_fk` is a COMPOSITE foreign key
#     `(family_id, workspace_id)`, and the whole catalog read is one request
#     only if PostgREST will embed across it. `members.ts` had to join in
#     TypeScript because no FK existed there; this file is the measurement that
#     says this case is the other one.
#   * THE `::text` CASTS. A bare `numeric` arrives as a JSON NUMBER, which is a
#     double — `0.035 * 1000` is `35.000000000000004` — and `@tienda/money`'s
#     `parseDecimal` refuses a number argument outright. Assertion 4 reads the
#     JSON TYPE off the wire, which no string-matching check could do.
#   * THE PRICE WINDOW. `price_list` is a dated range table and *"which price is
#     today's"* lives in the QUERY and nowhere else, deliberately — a second
#     copy in TypeScript would be a second answer. So the only instrument that
#     can say the window works is one that drives an EXPIRED row and a FUTURE
#     row past a real PostgREST.
#
# WHAT IT ASSERTS, all against a REAL round trip, with a real shop, a second
# shop, an owner and a cashier:
#
#   1. Every string is READ OUT OF `app/src/api/catalog.ts` — not typed in here.
#      A second copy of a contract is the defect this repository has recorded
#      eleven times.
#   2. The app's own catalog read answers 200 with every column it asked for,
#      the family embedded as an OBJECT and the prices as an ARRAY.
#   3. ⚠️ The window holds: an expired price and a future price do not come
#      back, and the row in force does.
#   4. ⚠️⚠️ Both numerics come back as JSON STRINGS, not numbers.
#   5. ⚠️ `enforce_stock` never reaches the phone — C8.8 says no pilot screen
#      may expose it, and this is that promise measured off the WIRE rather than
#      off the column string.
#   6. A variant nobody has priced comes back WITH AN EMPTY ARRAY rather than
#      being dropped: C3.12's dash exists because the embed is not `!inner`.
#   7. A store's own price and the shop-wide one arrive on the same read, which
#      is what `priceFor` chooses between.
#   8. ⚠️ The one-filter spelling is still a 400. `valid_period=cs.<date>` looks
#      like the whole window in one go and answers `22P02 malformed range
#      literal`; this is the refusal that justifies two filters, re-measured
#      rather than remembered.
#   9. ⚠️⚠️ A CASHIER READS THE WHOLE CATALOG AND EVERY PRICE. §2.8 labels
#      `Catálogo` Manager+ and the three SELECT policies admit any member
#      (`0002:490`, `507`, `542`) — the INSERT and UPDATE ones are the manager
#      fence. `5d`'s sizing took that as a decision on the owner's behalf; this
#      is where it is measured, and if a later migration narrows those policies
#      this is the only thing in the repository that goes red.
#  10. Another shop reads zero of this shop's products.
#  11. The ten units read back, every factor a decimal string at scale 6 — the
#      map `5c-iv-b` refused to hard-code.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the arithmetic. What a price in centavos comes to
# is `@tienda/money`'s, whose `cases.json` is wired into two suites, and
# `app/test/api-catalog.test.ts` pins the three C3.10 examples. This file is
# about the WIRE — the names, the shapes, the types and the fences — and saying
# so is cheaper than a second implementation of the rule in bash.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5d-i-catalog-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/catalog.ts}"
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

VARIANT_COLUMNS="$(str VARIANT_COLUMNS)"
FAMILY_COLUMNS="$(str FAMILY_COLUMNS)"
PRICE_COLUMNS="$(str PRICE_COLUMNS)"
UNIT_COLUMNS="$(str UNIT_COLUMNS)"
PRICE_TABLE="$(str PRICE_TABLE)"
PRICE_STARTS="$(str PRICE_STARTS_COLUMN)"
ORDER_COLUMN="$(str CATALOG_ORDER_COLUMN)"

# ⚠️ THE `select=` IS THE MODULE'S OWN TEMPLATE WITH ITS OWN VALUES PUT IN, not
# a second spelling of the same composition. The line is a template literal, so
# the backticked text is lifted and each `${NAME}` replaced by what was read
# above — which means a change to the SHAPE of the select (a third embed, a
# renamed relationship) arrives here without this file being edited.
TEMPLATE="$(grep -A2 '^export const CATALOG_SELECT =' "$CONTRACT" \
            | sed -n 's/.*`\(.*\)`.*/\1/p' | head -1)"
CATALOG_SELECT="$TEMPLATE"
for name in VARIANT_COLUMNS FAMILY_COLUMNS PRICE_COLUMNS PRICE_TABLE; do
  eval "value=\$$name"
  CATALOG_SELECT="${CATALOG_SELECT//\$\{$name\}/$value}"
done

# The open end of the window, the same way: `priceEndsAfter`'s own template.
WINDOW_TEMPLATE="$(sed -n '/^export function priceEndsAfter/,/^}/p' "$CONTRACT" \
                   | sed -n 's/.*`\(.*\)`.*/\1/p' | head -1)"

note
MISSING=""
for name in VARIANT_COLUMNS FAMILY_COLUMNS PRICE_COLUMNS UNIT_COLUMNS PRICE_TABLE \
            PRICE_STARTS ORDER_COLUMN CATALOG_SELECT WINDOW_TEMPLATE; do
  eval "value=\$$name"
  [[ -n "$value" ]] || MISSING="$MISSING $name"
done
case "$CATALOG_SELECT" in *'${'*) MISSING="$MISSING CATALOG_SELECT(unsubstituted)" ;; esac
if [[ -n "$MISSING" ]]; then
  fail "could not read the catalog's contract out of $CONTRACT:$MISSING"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: select=$CATALOG_SELECT"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS,
# and assertions 9 and 10 would then pass vacuously for the same reason
# supabase/README.md gives about the `postgres` superuser.
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

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

signup() { # email -> sets TOKEN and USER_ID
  local out
  out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"catalog-probe-123\"}")"
  TOKEN="$(pick access_token "$(body "$out")")"
  USER_ID="$(python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('id',''))" <<< "$(body "$out")" 2>/dev/null)"
  [[ -n "$TOKEN" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}

STAMP="$$-$(date +%s)"
TODAY="$(date -u +%F)"
PAST_FROM="2026-01-01"
PAST_TO="2026-06-01"
FUTURE_FROM="2099-01-01"

# --- the shop, its catalog, and the two people -----------------------------
OWNER_EMAIL="catalog-owner-$STAMP@example.com"
STAFF_EMAIL="catalog-staff-$STAMP@example.com"
NEIGHBOUR_EMAIL="catalog-neighbour-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Catalog 5d-i","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

LOCATION_ID="$(python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['id'] if r else '')" \
  <<< "$(body "$(api GET '/rest/v1/location?select=id')")" 2>/dev/null)"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

insert() { # path json -> response
  api POST "/rest/v1/$1" "$2"
}

# ⚠️ THE FAMILY NAME CARRIES AN ACCENT, and it is not decoration: assertion 2
# reads it back off the wire, so a transport that mangled UTF-8 between here and
# a phone would otherwise be green — the same argument `5b-ii-a` makes about a
# person's name, one table over.
FAMILY_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Plátanos"}))' "$WORKSPACE_ID")"
FAMILY_ID="$(python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['id'] if isinstance(r,list) and r else '')" \
  <<< "$(body "$(insert 'product_family?select=id' "$FAMILY_JSON")")" 2>/dev/null)"
[[ -n "$FAMILY_ID" ]] || { echo "FAIL: could not create a family"; exit 1; }

variant() { # name price_unit -> id
  local json
  json="$(python3 -c '
import json, sys
print(json.dumps({
  "workspace_id": sys.argv[1], "family_id": sys.argv[2], "name": sys.argv[3],
  "base_unit_code": "g", "purchase_unit_code": "kg", "sell_unit_code": "kg",
  "price_unit_code": sys.argv[4], "tax_rate": 0}))' "$WORKSPACE_ID" "$FAMILY_ID" "$1" "$2")"
  python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['id'] if isinstance(r,list) and r else '')" \
    <<< "$(body "$(insert 'product_variant?select=id' "$json")")" 2>/dev/null
}

PECHUGA_ID="$(variant 'Plátano macho' kg)"
CUARTO_ID="$(variant 'Plátano tabasco' 250g)"
UNPRICED_ID="$(variant 'Sin precio' kg)"
if [[ -z "$PECHUGA_ID" || -z "$CUARTO_ID" || -z "$UNPRICED_ID" ]]; then
  echo "FAIL: could not create the three variants"; exit 1
fi

# ⚠️ EVERY OBJECT IN A BULK INSERT MUST CARRY THE SAME KEYS — PostgREST answers
# `PGRST102 All object keys must match` otherwise, measured here on the first
# run. So the nulls are written out rather than omitted.
PRICES_JSON="$(python3 -c '
import json, sys
ws, loc, a, b = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
past_from, past_to, future_from = sys.argv[5], sys.argv[6], sys.argv[7]
rows = [
  {"workspace_id": ws, "variant_id": a, "price_per_base": "0.035000",
   "effective_from": past_from, "effective_to": None, "location_id": None},
  {"workspace_id": ws, "variant_id": a, "price_per_base": "0.041000",
   "effective_from": past_from, "effective_to": None, "location_id": loc},
  {"workspace_id": ws, "variant_id": b, "price_per_base": "0.020000",
   "effective_from": past_from, "effective_to": past_to, "location_id": None},
  {"workspace_id": ws, "variant_id": b, "price_per_base": "0.036000",
   "effective_from": past_to, "effective_to": future_from, "location_id": None},
  {"workspace_id": ws, "variant_id": b, "price_per_base": "9.990000",
   "effective_from": future_from, "effective_to": None, "location_id": None},
]
print(json.dumps(rows))' "$WORKSPACE_ID" "$LOCATION_ID" "$PECHUGA_ID" "$CUARTO_ID" \
      "$PAST_FROM" "$PAST_TO" "$FUTURE_FROM")"
PRICED="$(insert 'price_list?select=id' "$PRICES_JSON")"
if [[ "$(status "$PRICED")" != "201" ]]; then
  echo "FAIL: could not price the catalog — $(body "$PRICED")"; exit 1
fi

# --- the read the app actually makes ---------------------------------------
WINDOW="${WINDOW_TEMPLATE//\$\{today\}/$TODAY}"
READ_PATH="/rest/v1/product_variant?select=$CATALOG_SELECT&$PRICE_TABLE.$PRICE_STARTS=lte.$TODAY&$PRICE_TABLE.or=($WINDOW)&order=$ORDER_COLUMN"

CATALOG="$(api GET "$READ_PATH")"
CATALOG_FILE="$(stash catalog "$CATALOG")"

# --- 2..7. one python verdict over the one read ----------------------------
# ⚠️ ONE READ AND SIX ASSERTIONS OVER IT, because that is what the app does: a
# check that fetched each answer separately would be asserting six requests the
# client never makes.
verdict() { # label python-file extra-args...
  local label="$1"; shift
  local out
  out="$(python3 "$@" 2>&1)"
  [[ -z "$out" ]] && out="the verdict script produced nothing — it crashed on the shape that came back"
  note
  if [[ "$out" == ok* ]]; then ok "$label${out#ok}"; else fail "$out"; fi
}

cat > "$SCRATCH/shape.py" <<'PY'
import json, sys
path, cols, family_cols, price_cols = sys.argv[1], sys.argv[2].split(','), sys.argv[3].split(','), sys.argv[4].split(',')
try:
    rows = json.load(open(path))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list):
    print('the catalog read came back as an error: %r' % (rows,)); raise SystemExit
if len(rows) != 3:
    print('the shop has three variants and the read returned %d' % len(rows)); raise SystemExit
for row in rows:
    missing = [c for c in cols if c not in row]
    if missing:
        print('the select asked for columns the row does not have: %s' % missing); raise SystemExit
    family = row.get('product_family')
    if not isinstance(family, dict):
        print('product_family embedded as %r, not as an object — the composite FK did not embed'
              % (family,)); raise SystemExit
    fmissing = [c for c in family_cols if c not in family]
    if fmissing:
        print('the family embed is missing %s' % fmissing); raise SystemExit
    if family.get('name') != 'Plátanos':
        print('the family name came back as %r — UTF-8 did not survive the round trip'
              % (family.get('name'),)); raise SystemExit
    prices = row.get('price_list')
    if not isinstance(prices, list):
        print('price_list embedded as %r, not as an array' % (prices,)); raise SystemExit
    for price in prices:
        pmissing = [c.split('::')[0] for c in price_cols if c.split('::')[0] not in price]
        if pmissing:
            print('a price row is missing %s' % pmissing); raise SystemExit
print('ok — three variants, each with its family as an object and its prices as an array')
PY
verdict "the app's own read answers with every column it asked for" \
  "$SCRATCH/shape.py" "$CATALOG_FILE" "$VARIANT_COLUMNS" "$FAMILY_COLUMNS" "$PRICE_COLUMNS"

cat > "$SCRATCH/window.py" <<'PY'
import json, sys
path, priced, unpriced, quarter = sys.argv[1:5]
rows = {r['id']: r for r in json.load(open(path))}
q = rows.get(quarter)
if q is None:
    print('the variant with three price rows did not come back at all'); raise SystemExit
values = sorted(p['price_per_base'] for p in q['price_list'])
if values != ['0.036000']:
    print('the window let through %r — it must be the row in force and nothing else '
          '(0.020000 expired, 9.990000 has not started)' % (values,)); raise SystemExit
print('ok — an expired price and a future price stayed behind; the one in force came back')
PY
verdict "the price window holds against a real PostgREST" \
  "$SCRATCH/window.py" "$CATALOG_FILE" "$PECHUGA_ID" "$UNPRICED_ID" "$CUARTO_ID"

cat > "$SCRATCH/text.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
for row in rows:
    for price in row['price_list']:
        if not isinstance(price['price_per_base'], str):
            print('price_per_base came back as %r (%s) — the ::text cast is gone, and a '
                  'JSON number is a double: parseDecimal refuses it and every price on the '
                  'screen would be a dash' % (price['price_per_base'], type(price['price_per_base']).__name__))
            raise SystemExit
print('ok — every price is a decimal string, exactly as Postgres stored it')
PY
verdict "the money path starts from digits, not from a double" "$SCRATCH/text.py" "$CATALOG_FILE"

cat > "$SCRATCH/fence.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
banned = ['enforce_stock', 'tax_rate', 'pack_size']
for row in rows:
    present = [c for c in banned if c in row]
    if present:
        print('the read brought back %s — C8.8 says no pilot screen may expose '
              'enforce_stock, and a column the app never asks for is a column that '
              'never reaches a phone' % present)
        raise SystemExit
print('ok — enforce_stock, tax_rate and pack_size never left the database')
PY
verdict "C8.8's switch does not reach the phone, measured off the wire" \
  "$SCRATCH/fence.py" "$CATALOG_FILE"

cat > "$SCRATCH/unpriced.py" <<'PY'
import json, sys
path, unpriced = sys.argv[1], sys.argv[2]
rows = {r['id']: r for r in json.load(open(path))}
row = rows.get(unpriced)
if row is None:
    print('the variant nobody has priced was DROPPED by the read — the embed is behaving '
          'like an inner join, and C3.12 dash would never be drawn because the row is not '
          'there to draw it'); raise SystemExit
if row['price_list'] != []:
    print('the unpriced variant came back with %r' % (row['price_list'],)); raise SystemExit
print("ok — a variant with no price is in the list, with an empty array")
PY
verdict "an unpriced product is listed, which is what C3.12's dash needs" \
  "$SCRATCH/unpriced.py" "$CATALOG_FILE" "$UNPRICED_ID"

cat > "$SCRATCH/scope.py" <<'PY'
import json, sys
path, priced, location = sys.argv[1], sys.argv[2], sys.argv[3]
rows = {r['id']: r for r in json.load(open(path))}
prices = rows[priced]['price_list']
# The absence of the column is the defect this assertion is really about, and it
# has to be NAMED rather than crashed on: a KeyError here reads as the check
# being broken rather than the contract, which is how a check gets deleted.
for price in prices:
    if 'location_id' not in price:
        print('priceFor has nothing to choose from: the price read does not ask for '
              'location_id, so a shop that prices one store differently gets whichever '
              'row PostgREST returned first'); raise SystemExit
scopes = sorted((p['location_id'] or 'shop-wide') for p in prices)
if scopes != sorted([location, 'shop-wide']):
    print('priceFor has nothing to choose from: the read returned scopes %r' % (scopes,))
    raise SystemExit
print('ok — the store price and the shop-wide price arrive on the same read')
PY
verdict "both price scopes come back, which is what priceFor picks between" \
  "$SCRATCH/scope.py" "$CATALOG_FILE" "$PECHUGA_ID" "$LOCATION_ID"

# --- 8. the one-filter spelling is still refused ---------------------------
note
RANGE="$(api GET "/rest/v1/price_list?select=price_per_base&valid_period=cs.$TODAY")"
RANGE_CODE="$(pick code "$(body "$RANGE")")"
if [[ "$(status "$RANGE")" == "400" && "$RANGE_CODE" == "22P02" ]]; then
  ok "valid_period=cs.<date> is still a 400 — the two date filters are not a preference"
else
  fail "the generated range column now accepts a bare date ($(status "$RANGE") $RANGE_CODE)."
  echo "      This check's whole reason for two filters was that it did not. If PostgREST"
  echo "      or Postgres has changed, the WINDOW can become one filter — but that is a"
  echo "      decision to take deliberately, not a green to walk past."
fi

# --- 9. the cashier ---------------------------------------------------------
STAFF_INVITE_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "$STAFF_EMAIL" "$LOCATION_ID")"
STAFF_TOKEN_STR="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE_JSON")")")"
[[ -n "$STAFF_TOKEN_STR" ]] || { echo "FAIL: create_invite returned no token for the cashier"; exit 1; }

signup "$STAFF_EMAIL"; STAFF_TOKEN="$TOKEN"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_TOKEN_STR\"}" > /dev/null

TOKEN="$STAFF_TOKEN"
STAFF_READ="$(stash staff "$(api GET "$READ_PATH")")"
cat > "$SCRATCH/staff.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if not isinstance(rows, list):
    print('a cashier reading the catalog got %r' % (rows,)); raise SystemExit
if len(rows) != 3:
    print('a cashier read %d of the three products. §2.8 labels Catalogo Manager+ and '
          'the SELECT policies do not: if a migration has narrowed them, the Productos '
          'screen 5d-ii builds is empty for the person at the counter' % len(rows))
    raise SystemExit
priced = [r for r in rows if r['price_list']]
if len(priced) != 2:
    print('a cashier read %d priced rows of the two that are priced — price_list_select '
          'is member-level on purpose ("this is the shelf price, not a cost")' % len(priced))
    raise SystemExit
print('ok — a cashier reads all three products and every shelf price')
PY
verdict "a cashier reads the whole catalog, prices included" "$SCRATCH/staff.py" "$STAFF_READ"

# --- 10. the shop next door -------------------------------------------------
signup "$NEIGHBOUR_EMAIL"; NEIGHBOUR_TOKEN="$TOKEN"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Catalog 5d-i neighbour","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
NEIGHBOUR_READ="$(stash neighbour "$(api GET "$READ_PATH")")"
cat > "$SCRATCH/neighbour.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if rows != []:
    print('the shop next door read %d of this shop rows — the tenant fence is the one '
          'boundary in this schema that carries weight' % (len(rows) if isinstance(rows, list) else -1))
    raise SystemExit
print('ok — another shop reads nothing of this one')
PY
verdict "tenancy holds on the catalog read" "$SCRATCH/neighbour.py" "$NEIGHBOUR_READ"

# --- 11. the units ----------------------------------------------------------
UNITS_READ="$(stash units "$(api GET "/rest/v1/unit?select=$UNIT_COLUMNS")")"
cat > "$SCRATCH/units.py" <<'PY'
import json, re, sys
rows = json.load(open(sys.argv[1]))
cols = [c.split('::')[0] for c in sys.argv[2].split(',')]
if not isinstance(rows, list) or len(rows) != 10:
    print('the unit table read back %r rows, and 0001 seeds ten'
          % (len(rows) if isinstance(rows, list) else rows)); raise SystemExit
for row in rows:
    missing = [c for c in cols if c not in row]
    if missing:
        print('a unit row is missing %s' % missing); raise SystemExit
    factor = row['factor_to_base']
    if not isinstance(factor, str) or not re.match(r'^\d+\.\d{6}$', factor):
        print('factor_to_base came back as %r — it must be a decimal string at scale 6, '
              'because it is multiplied into a price' % (factor,)); raise SystemExit
codes = sorted(r['code'] for r in rows)
if 'kg' not in codes or '250g' not in codes:
    print('the ten units are %r' % (codes,)); raise SystemExit
print('ok — ten units, every factor a decimal string at scale 6, read by a cashier')
PY
verdict "the unit table reads back as the factors map" "$SCRATCH/units.py" "$UNITS_READ" "$UNIT_COLUMNS"

# --- the order the DATABASE applies ----------------------------------------
# ⚠️ READ OFF THE WIRE RATHER THAN ASSUMED, because nothing in the app sorts:
# `catalogFrom` keeps what arrives, deliberately, so this is the only place the
# real collation is ever seen. An accented name is in the fixture for that.
note
TOKEN="$OWNER_TOKEN"
ORDER_READ="$(stash order "$(api GET "$READ_PATH")")"
ORDERED="$(python3 -c "
import json,sys
rows = json.load(open(sys.argv[1]))
print('|'.join(r['name'] for r in rows))" "$ORDER_READ" 2>/dev/null)"
case "$ORDERED" in
  'Plátano macho|Plátano tabasco|Sin precio'|'Sin precio|Plátano macho|Plátano tabasco')
    ok "the database orders the list, accents and all: $ORDERED" ;;
  *)
    fail "the catalog came back in an order this check has not seen before: $ORDERED"
    echo "      The order is the database's — nothing in the app re-sorts — so a change"
    echo "      here is a change to what a shopkeeper scrolls through. Read it, decide"
    echo "      whether it is still right, and then record the new one." ;;
esac

echo
if (( fails > 0 )); then
  echo "$ran assertion groups ran, $fails failed — the app and the database disagree"
  echo "about the catalog."
  exit 1
fi
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that asserted nothing looks
# like.
if (( ran < 12 )); then
  echo "FAIL: only $ran assertion groups ran, expected 12 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
echo "all $ran assertion groups passed — app/src/api/catalog.ts still describes the"
echo "database: the embed works, both numerics are text, the window holds, a cashier"
echo "reads every price, and the shop next door reads nothing."

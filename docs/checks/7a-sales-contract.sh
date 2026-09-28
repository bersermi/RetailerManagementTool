#!/usr/bin/env bash
# 7a-sales-contract — does `app/src/api/sales.ts` still describe
# `public.product_velocity_daily`, and does the read Números makes come back the
# way the screen draws it?
#
# ⚠️⚠️ SIX CLAIMS LIVE HERE AND NOWHERE ELSE IN THIS REPOSITORY.
#
#   1. ⚠️⚠️ **THE HEADLINE IS GROSS.** §2.9, ruled 2026-09-14. The fixture sells a
#      product carrying 16% IVA at a keyed shelf price, and `revenue_gross` must
#      come back as EXACTLY the figure keyed — not the net, which is the column
#      beside it and differs by the tax. Both are strings, both parse, and the
#      Vitest suite cannot tell them apart.
#
#   2. ⚠️⚠️ **THE VIEW IS A SPINE, AND THE FILTER IS WHAT MAKES IT A LIST OF
#      SALES.** `0014` gives every product the store has stocked a row for every
#      day, sold or not. A product bought and never sold must NOT come back — if
#      it does, `SALES_ACTIVE_COLUMN` stopped filtering and six months of a real
#      shop is products × days of zeros, paged over the wire.
#
#   3. ⚠️ **A VOID NETS.** A sale voided the same day contributes nothing to the
#      day's quantity or revenue — `void_transaction` (`0021`) writes negative
#      lines, and the view sums them. The day still carries `line_count > 0`, so
#      the row is read and the client sees the net.
#
#   4. ⚠️⚠️ **EVERY ROLE READS IT — THE OWNER'S RULING OF 2026-09-28 RESTS ON
#      THIS.** A cashier reads her own store's rows with no role gate, because
#      `sale_line_select` has none (`0003`). If a later migration fences the view,
#      the Números door stays on her Inicio and opens on *nothing sold* — a lie
#      told by a screen the owner said she may see. ⚠️ RLS is bypassed by the
#      `postgres` superuser, so this is asserted over HTTP and not in SQL.
#
#   5. ⚠️ **AND NOBODY ELSE'S SHOP.** A second shop's owner reads zero of these
#      rows — the view is `security_invoker`, so its fence is every join's
#      ([[security-invoker-view-is-fenced-by-every-join]]), and this is the
#      direction that leaks.
#
#   6. ⚠️⚠️ **THE PAGING IS SOUND.** `max_rows` truncates silently, so the app
#      pages at `SALES_PAGE` over `day` plus `SALES_TIEBREAK`. The page size must
#      be below `max_rows` (else the first page is always "short" and the read
#      stops there), and reading one row at a time must reassemble the same list
#      as reading them all — which it only does if the order is total.
#
# WHAT IS DELIBERATELY NOT ASSERTED HERE:
#
#   ⚠️ THE ROLL-UP. Weeks starting on Monday, a family summed only within a
#   dimension, a void netting across two days: all pure TypeScript, all owned by
#   `app/test/api-sales.test.ts` ([[a-shell-check-cannot-see-a-pure-function]]).
#
#   ⚠️ A SECOND LOCATION. C1.5 puts each pilot shop at one store, and making a
#   second one needs a path no screen has. Isolation is asserted across SHOPS
#   (claim 5), which is the boundary a phone can actually cross today.
#
# Run:  supabase start && supabase db reset && bash docs/checks/7a-sales-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/sales.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- the contract, read out of the app --------------------------------------
# ⚠️ EVERY STRING BELOW IS THE MODULE'S OWN. A check that retypes a contract is
# asserting itself — `5h-ii-a`'s rule, obeyed by every check since.
str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
# SALES_COLUMNS is long enough that the formatter wraps it onto the next line.
wrapped() { sed -n "/^export const $1 =\$/{n;s/^ *'\([^']*\)';.*/\1/p;}" "$2" | head -1; }
num() { sed -n "s/^export const $1 = \([0-9][0-9]*\);.*/\1/p" "$2" | head -1; }

SALES_VIEW="$(str SALES_VIEW "$CONTRACT")"
SALES_COLUMNS="$(str SALES_COLUMNS "$CONTRACT")"
[[ -n "$SALES_COLUMNS" ]] || SALES_COLUMNS="$(wrapped SALES_COLUMNS "$CONTRACT")"
SALES_DAY_COLUMN="$(str SALES_DAY_COLUMN "$CONTRACT")"
SALES_ACTIVE_COLUMN="$(str SALES_ACTIVE_COLUMN "$CONTRACT")"
SALES_PAGE="$(num SALES_PAGE "$CONTRACT")"
SALES_TIEBREAK="$(sed -n "s/^export const SALES_TIEBREAK: readonly string\[\] = \[\(.*\)\];.*/\1/p" "$CONTRACT" \
  | tr -d " '" | head -1)"

note
for name in SALES_VIEW SALES_COLUMNS SALES_DAY_COLUMN SALES_ACTIVE_COLUMN SALES_PAGE SALES_TIEBREAK; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app"
    echo "      This check asserts the app's own constants against a real database."
    echo "      If it cannot find them it has nothing to assert, and a green here"
    echo "      would be the vacuous kind ADR-035 §9 refuses."
    exit 1
  fi
done
ok "read from $CONTRACT: $SALES_VIEW, page $SALES_PAGE, order $SALES_DAY_COLUMN.desc,$SALES_TIEBREAK"

# --- 6a. the page is below the cap -----------------------------------------
MAX_ROWS="$(sed -n 's/^max_rows *= *\([0-9][0-9]*\).*/\1/p' supabase/config.toml | head -1)"
note
if [[ -z "$MAX_ROWS" ]]; then
  fail "could not read max_rows out of supabase/config.toml"
elif (( SALES_PAGE < MAX_ROWS )); then
  ok "SALES_PAGE ($SALES_PAGE) is below max_rows ($MAX_ROWS), so a short page can only mean the end"
else
  fail "SALES_PAGE ($SALES_PAGE) IS NOT BELOW max_rows ($MAX_ROWS)."
  echo "      PostgREST truncates every response at max_rows WITHOUT AN ERROR. shopSales"
  echo "      stops at the first page shorter than SALES_PAGE — so at or above the cap,"
  echo "      every page is short, the read stops after one, and Números draws the"
  echo "      newest $MAX_ROWS rows as though they were six months."
fi

# --- 1a. the app asks for gross, not net -----------------------------------
note
case ",$SALES_COLUMNS," in
  *",revenue_gross::text,"*) ok "SALES_COLUMNS asks for revenue_gross, as text — §2.9's headline" ;;
  *) fail "SALES_COLUMNS no longer asks for revenue_gross::text: $SALES_COLUMNS"
     echo "      §2.9, ruled 2026-09-14: revenue is GROSS, the figure that reconciles"
     echo "      against the cash in the till. Net is 16% smaller on a taxed product." ;;
esac

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
# claims 4 and 5 would pass vacuously.
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

# ⚠️ SIGNUP IS RETRIED. GoTrue rate-limits it, and a rate-limited signup returns an
# EMPTY BODY rather than a 429 — which looks exactly like a broken harness.
signup() { # email -> sets TOKEN
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"sales-probe-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  echo "      GoTrue rate-limits signup and answers with an EMPTY BODY when it does."
  exit 1
}

STAMP="$$-$(date +%s)"

# --- the shop, its people and its catalog ----------------------------------
signup "sales-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Números 7a","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }
LOCATIONS="$(api GET '/rest/v1/location?select=id,timezone')"
LOCATION_ID="$(first id "$(body "$LOCATIONS")")"
TIMEZONE="$(first timezone "$(body "$LOCATIONS")")"
[[ -n "$LOCATION_ID" && -n "$TIMEZONE" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

STAFF_EMAIL="sales-staff-$STAMP@example.com"
STAFF_INVITE="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "$STAFF_EMAIL" "$LOCATION_ID")"
STAFF_INVITE_TOKEN="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE")")")"
[[ -n "$STAFF_INVITE_TOKEN" ]] || { echo "FAIL: create_invite returned no token for the cashier"; exit 1; }

TOKEN="$OWNER_TOKEN"
# ⚠️ THE FAMILY NAME CARRIES AN ACCENT for `5d-i`'s reason: a transport that mangled
# UTF-8 between here and a phone would otherwise be green.
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
# ⚠️ QUESO CARRIES 16% IVA so gross and net differ on it (claim 1); HUEVO carries
# none; CREMA is bought and never sold (claim 2).
QUESO="$(variant 'Queso fresco' g kg 0.1600)"
HUEVO="$(variant 'Huevo blanco' pza pza 0)"
CREMA="$(variant 'Crema ácida' g kg 0)"
[[ -n "$QUESO" && -n "$HUEVO" && -n "$CREMA" ]] || { echo "FAIL: could not create three variants"; exit 1; }
GENERIC_ID="$(first id "$(body "$(api GET '/rest/v1/provider?select=id&is_generic=is.true')")")"
[[ -n "$GENERIC_ID" ]] || { echo "FAIL: the new shop has no generic provider"; exit 1; }

# --- the delivery, the sales and the void ----------------------------------
# ⚠️ ONLINE, NOT `p_recorded_offline`, SO EVERYTHING LANDS AT now() — and the void
# is stamped at now() too, so the sale and its reversal share the store's date.
# (`0021` stamps a reversal at the moment of the void, never the sale's moment:
# [[record-rpcs-constrain-what-a-fixture-can-be]].)
BOUGHT="$(api POST /rest/v1/rpc/record_purchase "$(python3 -c '
import json, sys
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_provider_id": sys.argv[3],
  "p_lines": [
    {"variant_id": sys.argv[4], "qty_display": "5",  "qty_display_unit": "kg",  "unit_price_net_per_base": "0.080000"},
    {"variant_id": sys.argv[5], "qty_display": "60", "qty_display_unit": "pza", "unit_price_net_per_base": "2.000000"},
    {"variant_id": sys.argv[6], "qty_display": "2",  "qty_display_unit": "kg",  "unit_price_net_per_base": "0.050000"}]}))' \
  "$(uuid)" "$LOCATION_ID" "$GENERIC_ID" "$QUESO" "$HUEVO" "$CREMA")")"
note
if [[ "$(status "$BOUGHT")" == "200" ]]; then
  ok "record_purchase stocks three products — the spine now has a row for each"
else
  fail "record_purchase refused the delivery: $(status "$BOUGHT") $(body "$BOUGHT")"; exit 1
fi

sell() { # id lines-json -> response
  api POST /rest/v1/rpc/record_sale "$(python3 -c '
import json, sys
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_lines": json.loads(sys.argv[3])}))' \
    "$1" "$LOCATION_ID" "$2")"
}
# ⚠️ `unit_price_GROSS_per_base` ON A SALE (`0016:59`). 1.5 kg of queso at $120/kg
# gross is $180.00 exactly; 12 eggs at $3.00 is $36.00.
SOLD="$(sell "$(uuid)" "$(python3 -c '
import json, sys
print(json.dumps([
  {"variant_id": sys.argv[1], "qty_display": "1.5", "qty_display_unit": "kg",  "unit_price_gross_per_base": "0.120000"},
  {"variant_id": sys.argv[2], "qty_display": "12",  "qty_display_unit": "pza", "unit_price_gross_per_base": "3.000000"}]))' \
  "$QUESO" "$HUEVO")")"
VOIDED_ID="$(uuid)"
SOLD_TOO="$(sell "$VOIDED_ID" "$(python3 -c '
import json, sys
print(json.dumps([{"variant_id": sys.argv[1], "qty_display": "6", "qty_display_unit": "pza",
                   "unit_price_gross_per_base": "3.000000"}]))' "$HUEVO")")"
VOID_OUT="$(api POST /rest/v1/rpc/void_transaction \
  "{\"p_kind\":\"sale\",\"p_id\":\"$VOIDED_ID\",\"p_reason\":\"7a fixture\"}")"
note
if [[ "$(status "$SOLD")" == "200" && "$(status "$SOLD_TOO")" == "200" && "$(status "$VOID_OUT")" == "200" ]]; then
  ok "two sales rung up and the second one voided"
else
  fail "the fixture did not land: sale $(status "$SOLD") $(body "$SOLD") / second $(status "$SOLD_TOO") / void $(status "$VOID_OUT") $(body "$VOID_OUT")"
  exit 1
fi

TODAY="$(python3 -c 'import datetime,sys,zoneinfo;print(datetime.datetime.now(zoneinfo.ZoneInfo(sys.argv[1])).date().isoformat())' "$TIMEZONE")"
SINCE="$(python3 -c 'import datetime,sys;d=datetime.date.fromisoformat(sys.argv[1]);print((d-datetime.timedelta(days=200)).isoformat())' "$TODAY")"

# ⚠️ THE READ, SPELLED AS postgrest-js SPELLS IT: `.gte`, `.gt`, three `.order`s and
# `.range(from, to)`, which becomes `offset` and `limit`.
ORDER="$SALES_DAY_COLUMN.desc"
IFS=',' read -r -a TIES <<< "$SALES_TIEBREAK"
for col in "${TIES[@]}"; do ORDER="$ORDER,$col.asc"; done
read_page() { # offset limit -> response
  api GET "/rest/v1/$SALES_VIEW?select=$SALES_COLUMNS&$SALES_DAY_COLUMN=gte.$SINCE&$SALES_ACTIVE_COLUMN=gt.0&order=$ORDER&offset=$1&limit=$2"
}

# --- 1-3. the owner's read --------------------------------------------------
OWNER_READ="$(read_page 0 "$SALES_PAGE")"
note
if [[ "$(status "$OWNER_READ")" == "200" ]]; then
  ok "the read Números makes answers 200"
else
  fail "THE READ ANSWERED $(status "$OWNER_READ"): $(body "$OWNER_READ")"
  echo "      A renamed column, a view that moved, or a filter on a column that no"
  echo "      longer exists is a 400 here — and a Números screen that says the"
  echo "      connection failed on every phone, for ever."
  exit 1
fi
OWNER_FILE="$(stash owner "$OWNER_READ")"

cat > "$SCRATCH/owner.py" <<'PY'
import json, re, sys
path, cols, today, queso, huevo, crema = sys.argv[1:7]
want = [c.split('::')[0] for c in cols.split(',')]
rows = json.load(open(path))
if not isinstance(rows, list):
    print('the read came back as %r' % (rows,)); raise SystemExit
for row in rows:
    if sorted(row) != sorted(want):
        print('a row carried %s where SALES_COLUMNS asked for %s' % (sorted(row), sorted(want))); raise SystemExit
    for figure in ('qty_base_sold', 'revenue_gross'):
        if figure in row and not isinstance(row[figure], str):
            print('%s came back as %s, not a string — parseDecimal refuses a JSON number, '
                  'and every total on the screen would be withheld' % (figure, type(row[figure]).__name__))
            raise SystemExit
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(row.get('day', ''))):
        print('day came back as %r, not a YYYY-MM-DD date — bucketOf reads it as one' % (row.get('day'),))
        raise SystemExit
by = {row['variant_id']: row for row in rows}
if crema in by:
    print('THE SPINE LEAKED: a product bought and never sold came back (%r). The view '
          'carries a row for every stocked product on every day; the filter on line_count '
          'is what makes it a list of sales, and without it six months of a real shop is '
          'products x days of zeros.' % (by[crema],))
    raise SystemExit
if set(by) != {queso, huevo}:
    print('expected exactly the two products sold, got %d row(s): %r' % (len(rows), rows)); raise SystemExit
q, h = by[queso], by[huevo]
if q['day'] != today or h['day'] != today:
    print("the day is not the store's own date (%s): %r / %r" % (today, q['day'], h['day'])); raise SystemExit
if q['revenue_gross'] != '180.00':
    print('QUESO WAS KEYED AT $180.00 GROSS AND revenue_gross SAYS %r. It carries 16%% IVA, '
          'so the net is $155.17 — a figure near that one is the net under the gross name.'
          % (q['revenue_gross'],))
    raise SystemExit
if q['qty_base_sold'] != '1500.000':
    print('1.5 kg of queso should be 1500.000 base units (grams), got %r' % (q['qty_base_sold'],)); raise SystemExit
if (h['qty_base_sold'], h['revenue_gross']) != ('12.000', '36.00'):
    print('THE VOID DID NOT NET: huevo sold 12 + 6, then voided the 6, and reads %r / %r '
          'rather than 12.000 / 36.00' % (h['qty_base_sold'], h['revenue_gross']))
    raise SystemExit
print('ok — gross exactly as keyed, the unsold product filtered out, the void netted, the day local')
PY
verdict "the rows are the sales, in gross, netted" \
  "$SCRATCH/owner.py" "$OWNER_FILE" "$SALES_COLUMNS" "$TODAY" "$QUESO" "$HUEVO" "$CREMA"

# ⚠️⚠️ AND THE SPINE ASSERTION ABOVE IS NOT VACUOUS: without the filter, CREMA IS
# there. A fixture whose unsold product never reached the view would pass *filtered
# out* whether or not `SALES_ACTIVE_COLUMN` filters anything.
UNFILTERED="$(body "$(api GET "/rest/v1/$SALES_VIEW?select=variant_id&$SALES_DAY_COLUMN=gte.$SINCE")")"
note
if [[ "$UNFILTERED" == *"$CREMA"* ]]; then
  ok "and without the filter the unsold product IS in the view — so the filter did that"
else
  fail "the unsold product is not in the view even unfiltered: $UNFILTERED"
  echo "      Then the spine assertion above measured nothing. 0014's spine starts at a"
  echo "      product's first STOCK day; if that stopped being true, re-derive claim 2."
fi

# --- 6b. one row at a time reassembles the same list ------------------------
ONE="$(body "$(read_page 0 1)")"; TWO="$(body "$(read_page 1 1)")"; END="$(body "$(read_page 2 1)")"
PAGED="$(python3 -c 'import json,sys;print(json.dumps(json.loads(sys.argv[1])+json.loads(sys.argv[2])+json.loads(sys.argv[3])))' "$ONE" "$TWO" "$END" 2>/dev/null)"
WHOLE="$(python3 -c 'import json,sys;print(json.dumps(json.load(open(sys.argv[1]))))' "$OWNER_FILE")"
note
if [[ -n "$PAGED" && "$PAGED" == "$WHOLE" && "$END" == "[]" ]]; then
  ok "paging one row at a time over the app's order reassembles the whole read, then stops"
else
  fail "PAGING DID NOT REASSEMBLE THE READ: whole=$WHOLE paged=$PAGED"
  echo "      shopSales asks in pages and concatenates them. Over an order with ties,"
  echo "      the planner may break a tie differently per page — one row twice, one"
  echo "      never — and the totals are wrong with nothing going red."
fi

# --- 4. the cashier reads the same rows -------------------------------------
signup "$STAFF_EMAIL"; STAFF_TOKEN="$TOKEN"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_INVITE_TOKEN\"}" > /dev/null
HER_READ="$(read_page 0 "$SALES_PAGE")"
note
if [[ "$(status "$HER_READ")" == "200" && "$(body "$HER_READ")" == "$(cat "$OWNER_FILE")" ]]; then
  ok "a cashier reads exactly the owner's rows for her store — the 2026-09-28 ruling holds"
else
  fail "THE CASHIER'S READ DIFFERS FROM THE OWNER'S: $(status "$HER_READ") $(body "$HER_READ")"
  echo "      The owner ruled on 2026-09-28 that every role sees Números, and the"
  echo "      Inicio door is drawn for her. If the view is fenced now, that door opens"
  echo "      on a screen that says nothing was sold. Either the fence is wrong or the"
  echo "      ruling needs asking again — not a quiet client-side hide."
fi

# --- 5. and another shop reads none of them ---------------------------------
signup "sales-stranger-$STAMP@example.com"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Otra tienda 7a","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
THEIR_READ="$(read_page 0 "$SALES_PAGE")"
note
if [[ "$(status "$THEIR_READ")" == "200" && "$(body "$THEIR_READ")" == "[]" ]]; then
  ok "another shop's owner reads none of these rows — 200 and []"
else
  fail "ANOTHER SHOP READ THIS SHOP'S SALES: $(status "$THEIR_READ") $(body "$THEIR_READ")"
  echo "      product_velocity_daily is security_invoker, so its fence is every join's."
  echo "      A row here is one tenant's revenue on another tenant's phone."
fi

echo
if (( fails > 0 )); then
  echo "$ran assertion group(s) ran, $fails failed — product_velocity_daily does not answer"
  echo "the way app/src/api/sales.ts says it does."
  exit 1
fi
echo "all $ran assertion groups passed — Números reads gross sales, netted, for every role"
echo "in the shop and nobody outside it, in pages that reassemble."

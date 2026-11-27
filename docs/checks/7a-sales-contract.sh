#!/usr/bin/env bash
# 7a-sales-contract — does `app/src/api/sales.ts` still describe
# `public.daily_sales` (`0095`, plan `12.2`), and does the read Números makes come
# back the way the screen draws it?
#
# ⚠️⚠️ SIX CLAIMS LIVE HERE AND NOWHERE ELSE IN THIS REPOSITORY.
#
#   1. ⚠️⚠️ **THE HEADLINE IS GROSS.** §2.9, ruled 2026-09-14. The fixture sells a
#      product carrying 16% IVA at a keyed shelf price, and `revenue_gross` must
#      come back as EXACTLY the figure keyed — not the net, which differs by the
#      tax. Both would be strings, both parse, and the Vitest suite cannot tell
#      them apart.
#
#   2. ⚠️⚠️ **THE ANSWER IS A LIST OF SALES, NOT THE VIEW'S SPINE.** `0014` gives
#      every product the store has stocked a row in `product_velocity_daily` for
#      every day, sold or not. A product bought and never sold must NOT come back
#      — and the view's spine DOES hold it, asserted, so the fixture really made
#      one and the answer really left it out.
#
#   3. ⚠️ **A VOID NETS.** A sale voided the same day contributes nothing to the
#      day's quantity or revenue — `void_transaction` (`0021`) writes negative
#      lines, and the function sums them.
#
#   4. ⚠️⚠️ **EVERY ROLE READS IT — THE OWNER'S RULING OF 2026-09-28 RESTS ON
#      THIS.** A cashier reads her own store's rows with no role gate, because
#      `sale_line_select` has none (`0003`) and the function is `security
#      invoker`. If a later migration fences it, the Números door stays on her
#      Inicio and opens on *nothing sold* — a lie told by a screen the owner said
#      she may see. ⚠️ RLS is bypassed by the `postgres` superuser, so this is
#      asserted over HTTP and not in SQL.
#
#   5. ⚠️ **AND NOBODY ELSE'S SHOP.** A second shop's owner, naming this shop,
#      reads an empty list — the direction that leaks.
#
#   6. ⚠️⚠️ **ONE ANSWER, AND NO `max_rows` CUTS IT.** PostgREST truncates a SET
#      of rows at `max_rows` without an error — why this read paged until `12.2`,
#      in 18 pages that each took longer on the demo shop than the database lets
#      a phone wait (`12.1`). The function answers ONE json value, so the fixture
#      writes more sales rows than the cap and asks for them in one request: every
#      one must come back, as many as the view counts.
#
# WHAT IS DELIBERATELY NOT ASSERTED HERE:
#
#   ⚠️ THE ROLL-UP. Weeks starting on Monday, a family summed only within a
#   dimension, a void netting across two days: all pure TypeScript, all owned by
#   `app/test/api-sales.test.ts` ([[a-shell-check-cannot-see-a-pure-function]]).
#
#   ⚠️ A SECOND LOCATION. C1.5 puts each pilot shop at one store, and making a
#   second one needs a path no screen has. Isolation is asserted across SHOPS
#   (claim 5), which is the boundary a phone can actually cross today; a cashier
#   at one of two stores is `supabase/tests/0095_sales_in_one_answer.sql`'s.
#
#   ⚠️ THAT THE FUNCTION'S ROWS ARE THE VIEW'S TO THE CENT, every column, a void
#   of yesterday's sale made today: the same suite's, in SQL, where every case
#   can be dated.
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

SALES_FUNCTION="$(str SALES_FUNCTION "$CONTRACT")"
# SALES_KEYS is one quoted key per line between its `= [` and its `];`.
SALES_KEYS="$(sed -n "/^export const SALES_KEYS/,/^];/p" "$CONTRACT" | sed -n "s/^ *'\([a-z_]*\)',*$/\1/p" | paste -sd, -)"

note
for name in SALES_FUNCTION SALES_KEYS; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app"
    echo "      This check asserts the app's own constants against a real database."
    echo "      If it cannot find them it has nothing to assert, and a green here"
    echo "      would be the vacuous kind ADR-035 §9 refuses."
    exit 1
  fi
done
ok "read from $CONTRACT: $SALES_FUNCTION, answered in $SALES_KEYS"

MAX_ROWS="$(sed -n 's/^max_rows *= *\([0-9][0-9]*\).*/\1/p' supabase/config.toml | head -1)"
[[ -n "$MAX_ROWS" ]] || { echo "FAIL: could not read max_rows out of supabase/config.toml"; exit 1; }

# --- 1a. the app reads gross, not net --------------------------------------
note
case ",$SALES_KEYS," in
  *",revenue_net,"*) fail "SALES_KEYS names revenue_net: $SALES_KEYS"
     echo "      §2.9, ruled 2026-09-14: revenue is GROSS, the figure that reconciles"
     echo "      against the cash in the till. Net is 16% smaller on a taxed product." ;;
  *",revenue_gross,"*) ok "SALES_KEYS names revenue_gross — §2.9's headline" ;;
  *) fail "SALES_KEYS no longer names revenue_gross: $SALES_KEYS"
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

# ⚠️ THE READ, SPELLED AS supabase-js's `rpc` SPELLS IT: a POST of the arguments
# `salesArgs` builds, by name.
read_sales() { # workspace since -> response
  api POST "/rest/v1/rpc/$SALES_FUNCTION" "{\"p_workspace_id\":\"$1\",\"p_since\":\"$2\"}"
}

# --- 1-3. the owner's read --------------------------------------------------
OWNER_READ="$(read_sales "$WORKSPACE_ID" "$SINCE")"
note
if [[ "$(status "$OWNER_READ")" == "200" ]]; then
  ok "the read Números makes answers 200"
else
  fail "THE READ ANSWERED $(status "$OWNER_READ"): $(body "$OWNER_READ")"
  echo "      A renamed function, or an argument it no longer takes, is a 404 here —"
  echo "      and a Números screen that says the connection failed on every phone,"
  echo "      for ever."
  exit 1
fi
OWNER_FILE="$(stash owner "$OWNER_READ")"

cat > "$SCRATCH/owner.py" <<'PY'
import json, re, sys
path, keys, today, queso, huevo, crema = sys.argv[1:7]
want = keys.split(',')
rows = json.load(open(path))
if not isinstance(rows, list):
    print('the read came back as %r' % (rows,)); raise SystemExit
for row in rows:
    if sorted(row) != sorted(want):
        print('a row carried %s where SALES_KEYS names %s' % (sorted(row), sorted(want))); raise SystemExit
    for figure in ('qty_base_sold', 'revenue_gross'):
        if figure in row and not isinstance(row[figure], str):
            print('%s came back as %s, not a string — parseDecimal refuses a JSON number, '
                  'and every total on the screen would be withheld' % (figure, type(row[figure]).__name__))
            raise SystemExit
    # `0100`, plan `14.2`: Vender's order counts this — a whole JSON number.
    if not isinstance(row.get('times_sold'), int) or isinstance(row.get('times_sold'), bool):
        print('times_sold came back as %r, not a whole number — Vender orders its tiles by it'
              % (row.get('times_sold'),))
        raise SystemExit
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(row.get('day', ''))):
        print('day came back as %r, not a YYYY-MM-DD date — bucketOf reads it as one' % (row.get('day'),))
        raise SystemExit
by = {row['variant_id']: row for row in rows}
if crema in by:
    print('THE SPINE LEAKED: a product bought and never sold came back (%r). The view '
          'carries a row for every stocked product on every day; the answer must be a list '
          'of sales, or six months of a real shop is products x days of zeros.' % (by[crema],))
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
if (q['times_sold'], h['times_sold']) != (1, 1):
    print('THE COUNT DID NOT NET: queso sold once and huevo twice with one sale voided, so '
          'times_sold should be 1 and 1 (0100), and reads %r / %r — a count that takes no sale '
          'back puts a product voided often first on Vender' % (q['times_sold'], h['times_sold']))
    raise SystemExit
print('ok — gross exactly as keyed, the unsold product filtered out, the void netted in the figures and the count, the day local')
PY
verdict "the rows are the sales, in gross, netted" \
  "$SCRATCH/owner.py" "$OWNER_FILE" "$SALES_KEYS" "$TODAY" "$QUESO" "$HUEVO" "$CREMA"

# ⚠️⚠️ AND THE SPINE ASSERTION ABOVE IS NOT VACUOUS: the view's spine DOES carry
# the unsold product. A fixture whose unsold product never reached the database
# would pass *left out* whether or not the answer is a list of sales.
SPINE="$(body "$(api GET "/rest/v1/product_velocity_daily?select=variant_id&variant_id=eq.$CREMA&limit=1")")"
note
if [[ "$SPINE" == *"$CREMA"* ]]; then
  ok "and the view's spine DOES carry the unsold product — so the answer left it out"
else
  fail "the unsold product is not on the view's spine: $SPINE"
  echo "      Then the spine assertion above measured nothing. 0014's spine starts at a"
  echo "      product's first STOCK day; if that stopped being true, re-derive claim 2."
fi

# --- 4. the cashier reads the same rows -------------------------------------
signup "$STAFF_EMAIL"; STAFF_TOKEN="$TOKEN"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_INVITE_TOKEN\"}" > /dev/null
HER_READ="$(read_sales "$WORKSPACE_ID" "$SINCE")"
note
if [[ "$(status "$HER_READ")" == "200" && "$(body "$HER_READ")" == "$(cat "$OWNER_FILE")" ]]; then
  ok "a cashier reads exactly the owner's rows for her store — the 2026-09-28 ruling holds"
else
  fail "THE CASHIER'S READ DIFFERS FROM THE OWNER'S: $(status "$HER_READ") $(body "$HER_READ")"
  echo "      The owner ruled on 2026-09-28 that every role sees Números, and the"
  echo "      Inicio door is drawn for her. If the read is fenced now, that door opens"
  echo "      on a screen that says nothing was sold. Either the fence is wrong or the"
  echo "      ruling needs asking again — not a quiet client-side hide."
fi

# --- 5. and another shop reads none of them ---------------------------------
signup "sales-stranger-$STAMP@example.com"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Otra tienda 7a","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
THEIR_READ="$(read_sales "$WORKSPACE_ID" "$SINCE")"
note
if [[ "$(status "$THEIR_READ")" == "200" && "$(body "$THEIR_READ")" == "[]" ]]; then
  ok "another shop's owner reads none of these rows — 200 and []"
else
  fail "ANOTHER SHOP READ THIS SHOP'S SALES: $(status "$THEIR_READ") $(body "$THEIR_READ")"
  echo "      $SALES_FUNCTION is security invoker, so its fence is sale_line's policy."
  echo "      A row here is one tenant's revenue on another tenant's phone."
fi

# --- 6. more rows than max_rows, in ONE answer -----------------------------
# ⚠️ THE CLAIM THAT LET THE READ STOP PAGING. N products sold on each of three
# days (today online, yesterday and the day before as offline writes, inside
# every record_*'s 72 hours) is 3N rows; with N = max_rows / 3 + 1 that is more
# than the cap, and with the queso and the eggs above, 3N + 2 in all.
TOKEN="$OWNER_TOKEN"
N=$(( MAX_ROWS / 3 + 1 ))
cat > "$SCRATCH/bulk.py" <<'PY'
import datetime, json, sys, uuid
kind = sys.argv[1]
if kind == 'variants':
    ws, family, n = sys.argv[2], sys.argv[3], int(sys.argv[4])
    print(json.dumps([{"workspace_id": ws, "family_id": family, "name": "Granel 7a %04d" % i,
                       "base_unit_code": "pza", "purchase_unit_code": "pza", "sell_unit_code": "pza",
                       "price_unit_code": "pza", "tax_rate": "0"} for i in range(n)]))
elif kind == 'purchase':
    loc, provider, ids_path = sys.argv[2:5]
    ids = [r['id'] for r in json.load(open(ids_path))]
    print(json.dumps({"p_id": str(uuid.uuid4()), "p_location_id": loc, "p_provider_id": provider,
                      "p_lines": [{"variant_id": v, "qty_display": "10", "qty_display_unit": "pza",
                                   "unit_price_net_per_base": "1.000000"} for v in ids]}))
elif kind == 'sale':
    loc, ids_path, days_back = sys.argv[2], sys.argv[3], int(sys.argv[4])
    ids = [r['id'] for r in json.load(open(ids_path))]
    body = {"p_id": str(uuid.uuid4()), "p_location_id": loc,
            "p_lines": [{"variant_id": v, "qty_display": "1", "qty_display_unit": "pza",
                         "unit_price_gross_per_base": "2.000000"} for v in ids]}
    if days_back:
        at = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_back)
        body.update({"p_occurred_at": at.isoformat(), "p_recorded_offline": True})
    print(json.dumps(body))
elif kind == 'verdict':
    path, status, want, cap, counted, keys, as_set = sys.argv[2:9]
    if status != '200':
        print('the read of %s rows answered %s' % (want, status)); raise SystemExit
    rows = json.load(open(path))
    if not isinstance(rows, list):
        print('the answer is not a list: %r' % (rows,)); raise SystemExit
    if len(rows) != int(want):
        print('ONE REQUEST RETURNED %d ROWS OF %s — max_rows is %s. A set of rows is truncated '
              'there without an error; this read must answer one value, or Números draws part '
              'of six months as the whole of it.' % (len(rows), want, cap)); raise SystemExit
    if counted != want:
        print('the view counts %s rows with a sale line, the answer has %s' % (counted, want)); raise SystemExit
    if any(sorted(r) != sorted(keys.split(',')) for r in rows):
        print('a row of the long answer carried other keys'); raise SystemExit
    if as_set != cap:
        print('the view asked for the same rows as a SET returned %s, not max_rows (%s) — then the '
              'cap was not in force and this group proved nothing' % (as_set, cap)); raise SystemExit
    print('ok — %d rows in one request, as many as the view counts, where the same rows asked '
          'for as a set stop at max_rows (%s)' % (len(rows), cap))
PY

LOCAL_LANDED=""
OUT="$(api POST '/rest/v1/product_variant?select=id' "$(python3 "$SCRATCH/bulk.py" variants "$WORKSPACE_ID" "$FAMILY_ID" "$N")")"
body "$OUT" > "$SCRATCH/bulk-ids.json"
[[ "$(status "$OUT")" == "201" ]] || LOCAL_LANDED+=" products=$(status "$OUT")"
OUT="$(api POST /rest/v1/rpc/record_purchase "$(python3 "$SCRATCH/bulk.py" purchase "$LOCATION_ID" "$GENERIC_ID" "$SCRATCH/bulk-ids.json" 2>/dev/null)")"
[[ "$(status "$OUT")" == "200" ]] || LOCAL_LANDED+=" purchase=$(status "$OUT")"
for back in 0 1 2; do
  OUT="$(api POST /rest/v1/rpc/record_sale "$(python3 "$SCRATCH/bulk.py" sale "$LOCATION_ID" "$SCRATCH/bulk-ids.json" "$back" 2>/dev/null)")"
  [[ "$(status "$OUT")" == "200" ]] || LOCAL_LANDED+=" sale-$back=$(status "$OUT") $(body "$OUT" | head -c 200)"
done
note
if [[ -z "$LOCAL_LANDED" ]]; then
  ok "$N more products, each sold today, yesterday and the day before: $((3 * N)) rows, past max_rows ($MAX_ROWS)"
else
  fail "the long fixture did not land:$LOCAL_LANDED"
fi

WANT=$(( 3 * N + 2 ))
LONG_READ="$(read_sales "$WORKSPACE_ID" "$SINCE")"
body "$LONG_READ" > "$SCRATCH/long.json"
# ⚠️ THE VIEW'S OWN COUNT, by PostgREST's `count=exact`, which counts the whole
# filtered set whatever `limit` says — the two definitions of a day's sales,
# meeting over HTTP.
COUNTED="$(curl -s -o /dev/null -D - \
  "$API_URL/rest/v1/product_velocity_daily?select=day&workspace_id=eq.$WORKSPACE_ID&day=gte.$SINCE&line_count=gt.0&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $OWNER_TOKEN" -H "Prefer: count=exact" \
  | tr -d '\r' | sed -n 's/^[Cc]ontent-[Rr]ange: .*\/\([0-9][0-9]*\)$/\1/p')"
# ⚠️ AND THE CAP IS REAL: the same rows asked for as a set come back cut at it.
AS_SET="$(body "$(api GET "/rest/v1/product_velocity_daily?select=day&workspace_id=eq.$WORKSPACE_ID&day=gte.$SINCE&line_count=gt.0")" \
  | python3 -c 'import json,sys;print(len(json.load(sys.stdin)))' 2>/dev/null)"
verdict "one request, every row" \
  "$SCRATCH/bulk.py" verdict "$SCRATCH/long.json" "$(status "$LONG_READ")" "$WANT" "$MAX_ROWS" \
  "${COUNTED:-none}" "$SALES_KEYS" "${AS_SET:-none}"

echo
# ⚠️ THE ANTI-VACUITY GUARD: every failure path above is conditional, so "0
# failures" is also what a run that skipped a group looks like.
EXPECTED=11
if (( ran < EXPECTED )); then
  echo "FAIL: only $ran assertion groups ran, expected $EXPECTED — this check asserted"
  echo "      less than it says and was about to report success."
  exit 1
fi
if (( fails > 0 )); then
  echo "$ran assertion group(s) ran, $fails failed — $SALES_FUNCTION does not answer"
  echo "the way app/src/api/sales.ts says it does."
  exit 1
fi
echo "all $ran assertion groups passed — Números reads gross sales, netted, for every role"
echo "in the shop and nobody outside it, in one answer past max_rows."

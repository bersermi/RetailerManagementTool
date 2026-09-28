#!/usr/bin/env bash
# 7d-month-export-contract — does `app/src/api/monthExport.ts` still describe
# `public.transaction_export` (`0033`), and does the read the month download makes
# come back the way the two files are built from it?
#
# ⚠️⚠️ SIX CLAIMS LIVE HERE AND NOWHERE ELSE IN THIS REPOSITORY.
#
#   1. **EVERY COLUMN THE APP ASKS FOR EXISTS, AND EVERY FIGURE IS A STRING.** A
#      renamed column is a 400 on every phone; a lost `::text` is a JSON number
#      that `parseDecimal` refuses, and the whole file is withheld.
#
#   2. ⚠️⚠️ **THE COST COLUMN NEVER COMES BACK.** `unit_cost_net_per_base` is what
#      fences the view, and área 9 keeps waste off every page as a cost. The
#      read is asserted to carry no key the app did not name.
#
#   3. **ALL THREE KINDS, ONE MONTH, THE WAY THE LEDGER HOLDS THEM** — a delivery
#      with its supplier and expiry, a sale in GROSS exactly as keyed, the void
#      of a second sale as a flagged reversal with negated figures, and a
#      write-off whose cause is the enum's own word. `created_by` is the person
#      who keyed it, so `whoOf` has something to resolve.
#
#   4. **THE MONTH IS THE STORE'S MONTH, HALF-OPEN.** The fixture's rows carry
#      the store's local date, and the month before and the month after read
#      `[]` — so the filter is doing the choosing, not the fixture's size.
#
#   5. ⚠️⚠️ **A CASHIER READS ZERO ROWS — 200 AND `[]` — AND `canExport` RESTS ON
#      IT.** The owner ruled on 2026-09-28 that she is not shown the download,
#      because `0033`'s body predicate hands her nothing. If a migration widens
#      the view this goes red, and the ruling is the thing to ask again — not a
#      quiet change to `canExport`. **And another shop reads none of it.**
#
#   6. **THE PAGING IS SOUND** — `EXPORT_PAGE` below `max_rows`, and one row at a
#      time over the app's order reassembles the whole read and then stops.
#
# WHAT IS DELIBERATELY NOT ASSERTED HERE: the CSV and the PDF. They are pure
# TypeScript and `app/test/api-month-export.test.ts` owns them
# ([[a-shell-check-cannot-see-a-pure-function]]). Whether a phone opens and
# shares them is the owner's reading (`R9`).
#
# Run:  supabase start && supabase db reset && bash docs/checks/7d-month-export-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/monthExport.ts}"
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
# asserting itself.
str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
wrapped() { sed -n "/^export const $1 =\$/{n;s/^ *'\([^']*\)';.*/\1/p;}" "$2" | head -1; }
num() { sed -n "s/^export const $1 = \([0-9][0-9]*\);.*/\1/p" "$2" | head -1; }

EXPORT_VIEW="$(str EXPORT_VIEW "$CONTRACT")"
EXPORT_COLUMNS="$(str EXPORT_COLUMNS "$CONTRACT")"
[[ -n "$EXPORT_COLUMNS" ]] || EXPORT_COLUMNS="$(wrapped EXPORT_COLUMNS "$CONTRACT")"
EXPORT_DAY_COLUMN="$(str EXPORT_DAY_COLUMN "$CONTRACT")"
EXPORT_PAGE="$(num EXPORT_PAGE "$CONTRACT")"
EXPORT_TIEBREAK="$(sed -n "s/^export const EXPORT_TIEBREAK: readonly string\[\] = \[\(.*\)\];.*/\1/p" "$CONTRACT" \
  | tr -d " '" | head -1)"

note
for name in EXPORT_VIEW EXPORT_COLUMNS EXPORT_DAY_COLUMN EXPORT_PAGE EXPORT_TIEBREAK; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app"
    echo "      This check asserts the app's own constants against a real database."
    echo "      If it cannot find them it has nothing to assert, and a green here"
    echo "      would be the vacuous kind ADR-035 §9 refuses."
    exit 1
  fi
done
ok "read from $CONTRACT: $EXPORT_VIEW, page $EXPORT_PAGE, order $EXPORT_DAY_COLUMN,$EXPORT_TIEBREAK"

# --- 6a. the page is below the cap -----------------------------------------
MAX_ROWS="$(sed -n 's/^max_rows *= *\([0-9][0-9]*\).*/\1/p' supabase/config.toml | head -1)"
note
if [[ -z "$MAX_ROWS" ]]; then
  fail "could not read max_rows out of supabase/config.toml"
elif (( EXPORT_PAGE < MAX_ROWS )); then
  ok "EXPORT_PAGE ($EXPORT_PAGE) is below max_rows ($MAX_ROWS), so a short page can only mean the end"
else
  fail "EXPORT_PAGE ($EXPORT_PAGE) IS NOT BELOW max_rows ($MAX_ROWS)."
  echo "      PostgREST truncates at max_rows WITHOUT AN ERROR, and monthRows stops at"
  echo "      the first short page — so every page is short and a busy month is cut"
  echo "      off at $MAX_ROWS lines in a file somebody reconciles a notebook against."
fi

# --- 2a. the app never asks for the cost -----------------------------------
note
case ",$EXPORT_COLUMNS," in
  *",unit_cost_net_per_base"*) fail "EXPORT_COLUMNS ASKS FOR unit_cost_net_per_base: $EXPORT_COLUMNS"
     echo "      Área 9 (2026-09-18): waste is shown as quantity, never as cost — a shortfall"
     echo "      lot costs ZERO under C8.6, so a despiece's loss would read as free." ;;
  *) ok "EXPORT_COLUMNS does not ask for the cost of a write-off" ;;
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
# claim 5 would pass vacuously — and so would 0033's body predicate, whose second
# disjunct lets exactly the callers RLS does not filter read everything.
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
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"export-probe-123\"}")"
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
signup "export-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
OWNER_UID="$(pick id "$(body "$(api GET /auth/v1/user)")")"
[[ -n "$OWNER_UID" ]] || { echo "FAIL: could not read the owner's own user id"; exit 1; }
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Movimientos 7d","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }
LOCATIONS="$(api GET '/rest/v1/location?select=id,timezone')"
LOCATION_ID="$(first id "$(body "$LOCATIONS")")"
TIMEZONE="$(first timezone "$(body "$LOCATIONS")")"
[[ -n "$LOCATION_ID" && -n "$TIMEZONE" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

STAFF_EMAIL="export-staff-$STAMP@example.com"
STAFF_INVITE="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "$STAFF_EMAIL" "$LOCATION_ID")"
STAFF_INVITE_TOKEN="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE")")")"
[[ -n "$STAFF_INVITE_TOKEN" ]] || { echo "FAIL: create_invite returned no token for the cashier"; exit 1; }

# ⚠️ THE FAMILY AND THE SUPPLIER CARRY ACCENTS AND A COMMA, so a transport that
# mangled UTF-8 — or a CSV writer downstream that trusted it — would otherwise be green.
FAMILY_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Lácteos y más"}))' "$WORKSPACE_ID")"
FAMILY_ID="$(first id "$(body "$(api POST '/rest/v1/product_family?select=id' "$FAMILY_JSON")")")"
[[ -n "$FAMILY_ID" ]] || { echo "FAIL: could not create a family"; exit 1; }
PROVIDER_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Ferretería \"El Águila\", Hijos"}))' "$WORKSPACE_ID")"
PROVIDER_ID="$(first id "$(body "$(api POST '/rest/v1/provider?select=id' "$PROVIDER_JSON")")")"
[[ -n "$PROVIDER_ID" ]] || { echo "FAIL: could not create a supplier"; exit 1; }

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
# ⚠️ QUESO CARRIES 16% IVA so gross and net differ on it; HUEVO carries none.
QUESO="$(variant 'Queso fresco' g kg 0.1600)"
HUEVO="$(variant 'Huevo blanco' pza pza 0)"
[[ -n "$QUESO" && -n "$HUEVO" ]] || { echo "FAIL: could not create two variants"; exit 1; }

# --- the month: a delivery, two sales and a void, a write-off --------------
# ⚠️ ONLINE, NOT `p_recorded_offline`, SO EVERYTHING LANDS AT now() — the void too
# ([[record-rpcs-constrain-what-a-fixture-can-be]]) — and all of it in this month.
BOUGHT="$(api POST /rest/v1/rpc/record_purchase "$(python3 -c '
import json, sys
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_provider_id": sys.argv[3],
  "p_lines": [
    {"variant_id": sys.argv[4], "qty_display": "5",  "qty_display_unit": "kg",  "unit_price_net_per_base": "0.080000",
     "expiry_date": sys.argv[6]},
    {"variant_id": sys.argv[5], "qty_display": "60", "qty_display_unit": "pza", "unit_price_net_per_base": "2.000000"}]}))' \
  "$(uuid)" "$LOCATION_ID" "$PROVIDER_ID" "$QUESO" "$HUEVO" "$(python3 -c 'import datetime;print((datetime.date.today()+datetime.timedelta(days=20)).isoformat())')")")"

sell() { # id lines-json -> response
  api POST /rest/v1/rpc/record_sale "$(python3 -c '
import json, sys
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_lines": json.loads(sys.argv[3])}))' \
    "$1" "$LOCATION_ID" "$2")"
}
# ⚠️ `unit_price_GROSS_per_base` ON A SALE (`0016:59`). 1.5 kg of queso at $120/kg
# gross is $180.00 exactly.
SOLD="$(sell "$(uuid)" "$(python3 -c '
import json, sys
print(json.dumps([{"variant_id": sys.argv[1], "qty_display": "1.5", "qty_display_unit": "kg",
                   "unit_price_gross_per_base": "0.120000"}]))' "$QUESO")")"
VOIDED_ID="$(uuid)"
SOLD_TOO="$(sell "$VOIDED_ID" "$(python3 -c '
import json, sys
print(json.dumps([{"variant_id": sys.argv[1], "qty_display": "6", "qty_display_unit": "pza",
                   "unit_price_gross_per_base": "3.000000"}]))' "$HUEVO")")"
VOID_OUT="$(api POST /rest/v1/rpc/void_transaction \
  "{\"p_kind\":\"sale\",\"p_id\":\"$VOIDED_ID\",\"p_reason\":\"7d fixture\"}")"
THROWN="$(api POST /rest/v1/rpc/record_waste "$(python3 -c '
import json, sys
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2],
  "p_lines": [{"variant_id": sys.argv[3], "qty_display": "4", "qty_display_unit": "pza",
               "unit_price_gross_per_base": "3.000000", "reason": "caducado"}]}))' \
  "$(uuid)" "$LOCATION_ID" "$HUEVO")")"
note
if [[ "$(status "$BOUGHT")" == "200" && "$(status "$SOLD")" == "200" && "$(status "$SOLD_TOO")" == "200" \
      && "$(status "$VOID_OUT")" == "200" && "$(status "$THROWN")" == "200" ]]; then
  ok "a delivery, two sales, a void and a write-off landed — every kind the file carries"
else
  fail "the fixture did not land: purchase $(status "$BOUGHT") $(body "$BOUGHT") / sale $(status "$SOLD") / second $(status "$SOLD_TOO") / void $(status "$VOID_OUT") $(body "$VOID_OUT") / waste $(status "$THROWN") $(body "$THROWN")"
  exit 1
fi

# --- the month, in the STORE's calendar -------------------------------------
TODAY="$(python3 -c 'import datetime,sys,zoneinfo;print(datetime.datetime.now(zoneinfo.ZoneInfo(sys.argv[1])).date().isoformat())' "$TIMEZONE")"
MONTHS="$(python3 -c '
import sys
y, m = int(sys.argv[1][:4]), int(sys.argv[1][5:7])
def first(i): return "%04d-%02d-01" % (i // 12, i % 12 + 1)
i = y * 12 + m - 1
print(first(i - 1), first(i), first(i + 1), first(i + 2))' "$TODAY")"
read -r PREV FROM TO AFTER <<< "$MONTHS"

# ⚠️ THE READ, SPELLED AS postgrest-js SPELLS IT: `.gte`, `.lt`, the `.order`s and
# `.range(from, to)`, which becomes `offset` and `limit`.
ORDER="$EXPORT_DAY_COLUMN.asc"
IFS=',' read -r -a TIES <<< "$EXPORT_TIEBREAK"
for col in "${TIES[@]}"; do ORDER="$ORDER,$col.asc"; done
read_month() { # from to offset limit -> response
  api GET "/rest/v1/$EXPORT_VIEW?select=$EXPORT_COLUMNS&$EXPORT_DAY_COLUMN=gte.$1&$EXPORT_DAY_COLUMN=lt.$2&order=$ORDER&offset=$3&limit=$4"
}

TOKEN="$OWNER_TOKEN"
OWNER_READ="$(read_month "$FROM" "$TO" 0 "$EXPORT_PAGE")"
note
if [[ "$(status "$OWNER_READ")" == "200" ]]; then
  ok "the read the download makes answers 200"
else
  fail "THE READ ANSWERED $(status "$OWNER_READ"): $(body "$OWNER_READ")"
  echo "      A renamed column or a view that moved is a 400 here — and a download"
  echo "      that says the connection failed on every phone, for ever."
  exit 1
fi
OWNER_FILE="$(stash owner "$OWNER_READ")"

cat > "$SCRATCH/owner.py" <<'PY'
import json, re, sys
path, cols, today, owner, voided = sys.argv[1:6]
want = sorted(c.split('::')[0] for c in cols.split(','))
rows = json.load(open(path))
if not isinstance(rows, list):
    print('the read came back as %r' % (rows,)); raise SystemExit
for row in rows:
    if sorted(row) != want:
        print('a row carried %s where EXPORT_COLUMNS asked for %s' % (sorted(row), want)); raise SystemExit
    if 'unit_cost_net_per_base' in row:
        print('THE COST OF A WRITE-OFF REACHED THE PHONE'); raise SystemExit
    for figure in ('qty_display', 'line_net', 'tax_amount', 'line_gross'):
        if not isinstance(row[figure], str):
            print('%s came back as %s, not a string — parseDecimal refuses a JSON number and '
                  'the whole file is withheld' % (figure, type(row[figure]).__name__)); raise SystemExit
    if row['day'] != today:
        print("day is %r, not the store's own date %s" % (row['day'], today)); raise SystemExit
    if row['created_by'] != owner:
        print('created_by is %r, not the person who keyed it' % (row['created_by'],)); raise SystemExit
kinds = sorted(r['kind'] for r in rows)
if kinds != ['purchase', 'purchase', 'sale', 'sale', 'sale', 'waste']:
    print('expected 2 delivery lines, 3 sale lines (one a reversal) and 1 write-off, got %r' % (kinds,))
    raise SystemExit
sale = [r for r in rows if r['kind'] == 'sale' and r['variant_name'] == 'Queso fresco']
if len(sale) != 1 or sale[0]['line_gross'] != '180.00' or sale[0]['is_reversal']:
    print('QUESO WAS KEYED AT $180.00 GROSS and the line reads %r — a figure near $155.17 is '
          'the net under the gross name' % (sale,)); raise SystemExit
rev = [r for r in rows if r['is_reversal']]
if len(rev) != 1 or rev[0]['kind'] != 'sale' or not rev[0]['line_gross'].startswith('-') \
        or not rev[0]['qty_display'].startswith('-'):
    print('THE VOID IS NOT A FLAGGED, NEGATED LINE: %r' % (rev,)); raise SystemExit
buy = [r for r in rows if r['kind'] == 'purchase']
if any(r['provider_name'] != 'Ferretería "El Águila", Hijos' for r in buy):
    print('a delivery line lost its supplier, or its accents: %r' % ([r['provider_name'] for r in buy],))
    raise SystemExit
if sorted(r['expiry_date'] is None for r in buy) != [False, True]:
    print('the per-line expiry did not come through on exactly the line that had one: %r' % (buy,))
    raise SystemExit
waste = [r for r in rows if r['kind'] == 'waste'][0]
if waste['waste_reason'] != 'caducado' or waste['provider_name'] is not None:
    print("the write-off's cause is %r (want the enum's own 'caducado'), provider %r"
          % (waste['waste_reason'], waste['provider_name'])); raise SystemExit
if any(r['kind'] != 'waste' and r['waste_reason'] is not None for r in rows):
    print('a sale or a delivery carried a waste cause'); raise SystemExit
print('ok — three kinds, gross as keyed, the void flagged and negated, the supplier and cause intact, no cost')
PY
verdict "the month is the ledger's lines, as the file writes them" \
  "$SCRATCH/owner.py" "$OWNER_FILE" "$EXPORT_COLUMNS" "$TODAY" "$OWNER_UID" "$VOIDED_ID"

# --- 4. the neighbouring months hold none of it ----------------------------
BEFORE="$(read_month "$PREV" "$FROM" 0 "$EXPORT_PAGE")"
LATER="$(read_month "$TO" "$AFTER" 0 "$EXPORT_PAGE")"
note
if [[ "$(status "$BEFORE")" == "200" && "$(body "$BEFORE")" == "[]" \
      && "$(status "$LATER")" == "200" && "$(body "$LATER")" == "[]" ]]; then
  ok "the month before ($PREV) and the month after ($TO) read [] — the filter chose the month"
else
  fail "A NEIGHBOURING MONTH READ ROWS: before $(status "$BEFORE") $(body "$BEFORE") / after $(status "$LATER") $(body "$LATER")"
fi

# --- 6b. one row at a time reassembles the same list ------------------------
: > "$SCRATCH/pages.txt"
for at in 0 1 2 3 4 5 6; do body "$(read_month "$FROM" "$TO" "$at" 1)" >> "$SCRATCH/pages.txt"; done
PAGED="$(python3 -c '
import json, sys
out = []
for line in open(sys.argv[1]):
    out += json.loads(line)
print(json.dumps(out))' "$SCRATCH/pages.txt" 2>/dev/null)"
WHOLE="$(python3 -c 'import json,sys;print(json.dumps(json.load(open(sys.argv[1]))))' "$OWNER_FILE")"
LAST="$(tail -1 "$SCRATCH/pages.txt")"
note
if [[ -n "$PAGED" && "$PAGED" == "$WHOLE" && "$LAST" == "[]" ]]; then
  ok "paging one row at a time over the app's order reassembles the whole month, then stops"
else
  fail "PAGING DID NOT REASSEMBLE THE MONTH: whole=$WHOLE paged=$PAGED"
  echo "      monthRows asks in pages and concatenates them. Over an order with ties the"
  echo "      planner may break a tie differently per page — one line twice, one never."
fi

# --- 5. the cashier reads zero rows -----------------------------------------
signup "$STAFF_EMAIL"; STAFF_TOKEN="$TOKEN"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_INVITE_TOKEN\"}" > /dev/null
HER_SALES="$(api GET "/rest/v1/sale?select=id&location_id=eq.$LOCATION_ID")"
HER_READ="$(read_month "$FROM" "$TO" 0 "$EXPORT_PAGE")"
note
if [[ "$(body "$HER_SALES")" == "[]" ]]; then
  fail "the cashier cannot read her own store's sales at all — she never joined, so the zero below measures nothing"
elif [[ "$(status "$HER_READ")" == "200" && "$(body "$HER_READ")" == "[]" ]]; then
  ok "a cashier who reads her store's sales reads ZERO export rows — 0033's fence, and why canExport hides the download"
else
  fail "THE CASHIER READ THE EXPORT: $(status "$HER_READ") $(body "$HER_READ")"
  echo "      The owner ruled on 2026-09-28 that she is not shown the download BECAUSE"
  echo "      0033 gives her nothing. If the view now answers her, the ruling is the"
  echo "      thing to ask again — and whether the cost column reaches her with it."
fi

# --- 5b. and another shop reads none of them --------------------------------
signup "export-stranger-$STAMP@example.com"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Otra tienda 7d","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
THEIR_READ="$(read_month "$FROM" "$TO" 0 "$EXPORT_PAGE")"
note
if [[ "$(status "$THEIR_READ")" == "200" && "$(body "$THEIR_READ")" == "[]" ]]; then
  ok "another shop's owner reads none of these rows — 200 and []"
else
  fail "ANOTHER SHOP READ THIS SHOP'S MONTH: $(status "$THEIR_READ") $(body "$THEIR_READ")"
fi

echo
if (( fails > 0 )); then
  echo "$ran assertion group(s) ran, $fails failed — transaction_export does not answer"
  echo "the way app/src/api/monthExport.ts says it does."
  exit 1
fi
echo "all $ran assertion groups passed — the month download reads every kind of line,"
echo "with no cost, for the manager and owner only, and nobody outside the shop."

#!/usr/bin/env bash
# 8g-numeros-contract — does `app/src/api/month.ts` still describe the database?
#
# Números' centre (plan `8g`, the owner's rulings of 2026-10-20) reads three
# kinds of document header the app had never read whole: a month of
# DELIVERIES, a month of WRITE-OFFS with their lines, and four weeks of SALES —
# and, for the first two, every reversal since the month opened. No typecheck
# and no Vitest fixture can say any of these answer; this check asks a real
# PostgREST, spelling each request the way `documentsBetween` and
# `reversalsSince` (`@/api/calls`) do, out of the module's own constants.
#
#   1. ⚠️ THE PAGE IS BELOW `max_rows`, or a short page would not mean the end.
#   2. EVERY READ ANSWERS 200 with the app's columns, and every figure ARRIVES AS
#      A STRING (`::text`) — a JSON number is a double before `parseDecimal` sees it.
#   3. ⚠️ THE REVERSAL READ NAMES WHAT WAS UNDONE, so `standing` can leave a
#      voided delivery, write-off or sale out of its month (`8p`).
#   4. ⚠️⚠️ A CASHIER READS THE SAME ROWS AS THE OWNER — the purchase headers
#      (`0040`) AND THE WRITE-OFF LINES. The lines come off `waste_reason_line`
#      (`0041`) because `waste_line` is manager-only: an embed of the wrong one is
#      a 200 with `[]`, and *Se tiró* would read *Nada este mes* in her hand
#      while the owner's said *8 piezas* ([[embed-on-a-fenced-table-is-a-200-with-an-empty-array]]).
#   5. ANOTHER SHOP READS NONE OF THEM — 200 and `[]`.
#
# Run:  supabase start && supabase db reset && bash docs/checks/8g-numeros-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/month.ts}"
DOCS="${2:-app/src/api/documents.ts}"
[[ -r "$CONTRACT" && -r "$DOCS" ]] || { echo "FAIL: cannot read $CONTRACT / $DOCS"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- the contract, read out of the app --------------------------------------
str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
num() { sed -n "s/^export const $1 = \([0-9][0-9]*\);.*/\1/p" "$2" | head -1; }
record() { sed -n "/^export const $1/,/^};/p" "$2" | sed -n "s/^  $3: '\([^']*\)',.*/\1/p" | head -1; }

PURCHASE_COLUMNS="$(str MONTH_PURCHASE_COLUMNS "$CONTRACT")"
WASTE_COLUMNS="$(str MONTH_WASTE_COLUMNS "$CONTRACT")"
SALE_COLUMNS="$(str SALE_TIME_COLUMNS "$CONTRACT")"
REVERSAL="$(str REVERSAL_COLUMN "$CONTRACT")"
TIME="$(str MONTH_TIME_COLUMN "$CONTRACT")"
TIE="$(str MONTH_TIEBREAK "$CONTRACT")"
PAGE="$(num MONTH_PAGE "$CONTRACT")"
T_PURCHASE="$(record DOCUMENTS_TABLE "$DOCS" purchase)"
T_WASTE="$(record DOCUMENTS_TABLE "$DOCS" waste)"
T_SALE="$(record DOCUMENTS_TABLE "$DOCS" sale)"

note
MISSING=""
for name in PURCHASE_COLUMNS WASTE_COLUMNS SALE_COLUMNS REVERSAL TIME TIE PAGE T_PURCHASE T_WASTE T_SALE; do
  eval "value=\$$name"
  [[ -n "$value" ]] || MISSING="$MISSING $name"
done
if [[ -n "$MISSING" ]]; then
  fail "could not read the month contract out of $CONTRACT / $DOCS:$MISSING"
  echo "      This check asserts the app's own strings against the database; without"
  echo "      them a green here would be the vacuous kind."
  exit 1
fi
ok "read from the app: $T_PURCHASE, $T_WASTE and $T_SALE headers, page $PAGE, cut on $TIME"

# --- 1. the page is below the cap -------------------------------------------
note
if (( PAGE < 1000 )); then
  ok "MONTH_PAGE ($PAGE) is below max_rows (1000), so a short page can only mean the end"
else
  fail "MONTH_PAGE IS NOT BELOW max_rows: $PAGE. PostgREST truncates at 1000 without saying"
  echo "      so — every page would be short and a month would stop after the first."
fi

# --- the local stack ---------------------------------------------------------
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

# ⚠️ SIGNUP IS RETRIED: a rate-limited signup is an EMPTY BODY, not a 429.
signup() { # email -> sets TOKEN
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"numeros-probe-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  exit 1
}

STAMP="$$-$(date +%s)"

# --- the shop, its people, its catalog --------------------------------------
signup "numeros-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
WORKSPACE_ID="$(body "$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Números 8g","p_prices_include_tax":true,"p_location_name":null}')" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop"; exit 1; }
LOCATION_ID="$(first id "$(body "$(api GET '/rest/v1/location?select=id')")")"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

STAFF_EMAIL="numeros-staff-$STAMP@example.com"
INVITE_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "$STAFF_EMAIL" "$LOCATION_ID")"
INVITE_TOKEN="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$INVITE_JSON")")")"
[[ -n "$INVITE_TOKEN" ]] || { echo "FAIL: create_invite returned no token"; exit 1; }

FAMILY_ID="$(first id "$(body "$(api POST '/rest/v1/product_family?select=id' "$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Panadería"}))' "$WORKSPACE_ID")")")")"
variant() { # name base price-unit -> id
  first id "$(body "$(api POST '/rest/v1/product_variant?select=id' "$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "family_id": sys.argv[2], "name": sys.argv[3],
  "base_unit_code": sys.argv[4], "purchase_unit_code": sys.argv[5], "sell_unit_code": sys.argv[5],
  "price_unit_code": sys.argv[5], "tax_rate": 0}))' "$WORKSPACE_ID" "$FAMILY_ID" "$1" "$2" "$3")")")"
}
PAN="$(variant 'Pan de caja' pza pza)"
HUEVO="$(variant 'Huevo blanco' g kg)"
GENERIC="$(first id "$(body "$(api GET '/rest/v1/provider?select=id&is_generic=is.true')")")"
CHUY="$(first id "$(body "$(api POST '/rest/v1/provider?select=id' "$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Don Chuy"}))' "$WORKSPACE_ID")")")")"
[[ -n "$PAN" && -n "$HUEVO" && -n "$GENERIC" && -n "$CHUY" ]] || { echo "FAIL: the catalog did not land"; exit 1; }

# --- the documents: two of each kind, one of them voided ---------------------
buy() { # id provider -> status
  status "$(api POST /rest/v1/rpc/record_purchase "$(python3 -c '
import json, sys
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_provider_id": sys.argv[3],
  "p_lines": [{"variant_id": sys.argv[4], "qty_display": "20", "qty_display_unit": "pza", "unit_price_net_per_base": "30.000000"}]}))' \
    "$1" "$LOCATION_ID" "$2" "$PAN")")"
}
sell() { # id -> status
  status "$(api POST /rest/v1/rpc/record_sale "$(python3 -c '
import json, sys
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2],
  "p_lines": [{"variant_id": sys.argv[3], "qty_display": "2", "qty_display_unit": "pza", "unit_price_gross_per_base": "45.000000"}]}))' \
    "$1" "$LOCATION_ID" "$PAN")")"
}
throw() { # id -> status
  status "$(api POST /rest/v1/rpc/record_waste "$(python3 -c '
import json, sys
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_lines": [
  {"variant_id": sys.argv[3], "qty_display": "3", "qty_display_unit": "pza", "unit_price_gross_per_base": "45.00", "reason": "caducado"},
  {"variant_id": sys.argv[4], "qty_display": "0.5", "qty_display_unit": "kg", "unit_price_gross_per_base": "0.04", "reason": "dañado"}]}))' \
    "$1" "$LOCATION_ID" "$PAN" "$HUEVO")")"
}
undo() { # kind id -> status
  local out
  out="$(api POST /rest/v1/rpc/void_transaction "{\"p_kind\":\"$1\",\"p_id\":\"$2\",\"p_reason\":\"8g fixture\"}")"
  [[ "$(status "$out")" == "200" ]] || echo "      void of $1 answered: $(body "$out" | head -c 300)" >&2
  status "$out"
}
B_KEPT="$(uuid)"; B_GONE="$(uuid)"; S_KEPT="$(uuid)"; S_GONE="$(uuid)"; W_KEPT="$(uuid)"; W_GONE="$(uuid)"
LANDED="$(buy "$B_KEPT" "$CHUY") $(buy "$B_GONE" "$GENERIC") $(sell "$S_KEPT") $(sell "$S_GONE") $(throw "$W_KEPT") $(throw "$W_GONE")"
VOIDED="$(undo purchase "$B_GONE") $(undo sale "$S_GONE") $(undo waste "$W_GONE")"
note
if [[ "$LANDED" == "200 200 200 200 200 200" && "$VOIDED" == "200 200 200" ]]; then
  ok "two deliveries, two sales and two write-offs, one of each voided"
else
  fail "the fixture did not land: writes $LANDED / voids $VOIDED"; exit 1
fi

# The month the app would ask for, as the app spells it: its first instant and
# the next month's, in UTC with a Z (`dayStartOf`), so nothing needs escaping.
read FROM TO <<< "$(python3 -c '
import datetime
now = datetime.datetime.now()
start = datetime.datetime(now.year, now.month, 1).astimezone(datetime.timezone.utc)
nxt = datetime.datetime(now.year + (now.month == 12), now.month % 12 + 1, 1).astimezone(datetime.timezone.utc)
print(start.strftime("%Y-%m-%dT%H:%M:%S.000Z"), nxt.strftime("%Y-%m-%dT%H:%M:%S.000Z"))')"
ORDER="order=$TIME.asc,$TIE.asc&offset=0&limit=$PAGE"
window() { api GET "/rest/v1/$1?select=$2&$TIME=gte.$FROM&$TIME=lt.$TO&$ORDER"; }
reversals() { api GET "/rest/v1/$1?select=$REVERSAL&$REVERSAL=not.is.null&$TIME=gte.$FROM&$ORDER"; }

# --- 2 and 3. the owner's reads ---------------------------------------------
TOKEN="$OWNER_TOKEN"
O_BUY="$(window "$T_PURCHASE" "$PURCHASE_COLUMNS")"; O_BUY_R="$(reversals "$T_PURCHASE")"
O_WASTE="$(window "$T_WASTE" "$WASTE_COLUMNS")";     O_WASTE_R="$(reversals "$T_WASTE")"
O_SALE="$(window "$T_SALE" "$SALE_COLUMNS")"
note
if [[ "$(status "$O_BUY")$(status "$O_BUY_R")$(status "$O_WASTE")$(status "$O_WASTE_R")$(status "$O_SALE")" == "200200200200200" ]]; then
  ok "all five reads Números makes answer 200 — the columns, the embed and the filters exist"
else
  fail "THE READS ANSWERED: deliveries $(status "$O_BUY") $(body "$O_BUY" | head -c 200) / reversals $(status "$O_BUY_R") $(body "$O_BUY_R" | head -c 200) / write-offs $(status "$O_WASTE") $(body "$O_WASTE" | head -c 200) / their reversals $(status "$O_WASTE_R") / sales $(status "$O_SALE") $(body "$O_SALE" | head -c 200)"
  exit 1
fi

cat > "$SCRATCH/owner.py" <<'PY'
import json, sys
buy, buy_r, waste, waste_r, sale = (json.load(open(p)) for p in sys.argv[1:6])
b_kept, b_gone, s_kept, s_gone, w_kept, w_gone, chuy = sys.argv[6:13]

def standing(rows, reversals):
    undone = {r['reversal_of'] for r in reversals if r.get('reversal_of')}
    undone |= {r['reversal_of'] for r in rows if r.get('reversal_of')}
    return [r for r in rows if not r.get('reversal_of') and r['id'] not in undone]

for name, rows in (('deliveries', buy), ('sales', sale)):
    for r in rows:
        for col in ('total_net', 'total_tax'):
            if not isinstance(r.get(col), str):
                print('a %s figure arrived as %s rather than a string — the ::text cast is gone, '
                      'and parseDecimal refuses a number' % (name, type(r.get(col)).__name__)); raise SystemExit
if [r['reversal_of'] for r in buy_r] != [b_gone]:
    print('THE REVERSAL READ DOES NOT NAME THE VOIDED DELIVERY: %r' % (buy_r,)); raise SystemExit
if [r['reversal_of'] for r in waste_r] != [w_gone]:
    print('THE REVERSAL READ DOES NOT NAME THE VOIDED WRITE-OFF: %r' % (waste_r,)); raise SystemExit
kept = standing(buy, buy_r)
if [(r['id'], r['provider_id'], r['total_net']) for r in kept] != [(b_kept, chuy, '600.00')]:
    print('the deliveries that stand are %r — wanted only Don Chuy\'s, $600.00' % (kept,)); raise SystemExit
if [r['id'] for r in standing(sale, [])] != [s_kept]:
    print('the sales that stand are %r — wanted only %s' % (standing(sale, []), s_kept)); raise SystemExit
w = standing(waste, waste_r)
lines = sorted((l['reason'], l['qty_base']) for l in (w[0]['waste_reason_line'] if len(w) == 1 else []))
if [r['id'] for r in w] != [w_kept] or lines != [('caducado', '3.000'), ('dañado', '500.000')]:
    print('the write-off that stands came back as %r with lines %r' % ([r['id'] for r in w], lines)); raise SystemExit
print('ok — one delivery, one sale and one write-off stand; each void is named; figures are strings')
PY
verdict "what stands, read the way the app reads it" "$SCRATCH/owner.py" \
  "$(stash o_buy "$O_BUY")" "$(stash o_buy_r "$O_BUY_R")" "$(stash o_waste "$O_WASTE")" \
  "$(stash o_waste_r "$O_WASTE_R")" "$(stash o_sale "$O_SALE")" \
  "$B_KEPT" "$B_GONE" "$S_KEPT" "$S_GONE" "$W_KEPT" "$W_GONE" "$CHUY"

# --- 4. the cashier reads the same rows -------------------------------------
signup "$STAFF_EMAIL"; STAFF_TOKEN="$TOKEN"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$INVITE_TOKEN\"}" > /dev/null
TOKEN="$STAFF_TOKEN"
H_BUY="$(window "$T_PURCHASE" "$PURCHASE_COLUMNS")"; H_WASTE="$(window "$T_WASTE" "$WASTE_COLUMNS")"
H_SALE="$(window "$T_SALE" "$SALE_COLUMNS")"; H_WASTE_R="$(reversals "$T_WASTE")"
cat > "$SCRATCH/same.py" <<'PY'
import json, sys
pairs = [(json.load(open(sys.argv[i])), json.load(open(sys.argv[i + 1]))) for i in (1, 3, 5, 7)]
names = ('deliveries', 'write-offs', 'sales', 'write-off reversals')
for name, (owner, hers) in zip(names, pairs):
    if not isinstance(hers, list):
        print('THE CASHIER\'S %s READ CAME BACK AS AN ERROR: %r' % (name, hers)); raise SystemExit
    if hers != owner:
        print('THE CASHIER READS DIFFERENT %s FROM THE OWNER: hers %r, his %r' % (name.upper(), hers, owner))
        raise SystemExit
lines = [l for r in pairs[1][1] for l in (r.get('waste_reason_line') or [])]
if not lines:
    print('THE CASHIER READS NO WRITE-OFF LINES — Se tiró would say Nada este mes in her hand'); raise SystemExit
print('ok — %d deliveries, %d write-off lines and %d sales, identical to the owner\'s' %
      (len(pairs[0][1]), len(lines), len(pairs[2][1])))
PY
verdict "a cashier reads the same month as the owner, write-off lines included" "$SCRATCH/same.py" \
  "$(stash o_buy2 "$O_BUY")" "$(stash h_buy "$H_BUY")" "$(stash o_waste2 "$O_WASTE")" "$(stash h_waste "$H_WASTE")" \
  "$(stash o_sale2 "$O_SALE")" "$(stash h_sale "$H_SALE")" "$(stash o_waste_r2 "$O_WASTE_R")" "$(stash h_waste_r "$H_WASTE_R")"

# --- 5. and another shop reads none of them ---------------------------------
signup "numeros-stranger-$STAMP@example.com"
api POST /rest/v1/rpc/onboard_workspace '{"p_display_name":"Otra tienda 8g","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
THEIRS="$(body "$(window "$T_PURCHASE" "$PURCHASE_COLUMNS")")$(body "$(window "$T_WASTE" "$WASTE_COLUMNS")")$(body "$(window "$T_SALE" "$SALE_COLUMNS")")"
note
if [[ "$THEIRS" == "[][][]" ]]; then
  ok "another shop's owner reads none of this month — 200 and [] on all three"
else
  fail "ANOTHER SHOP READ THIS SHOP'S MONTH: $THEIRS"
fi

# --- the verdict -------------------------------------------------------------
echo
if (( ran < 7 )); then
  echo "FAIL: only $ran assertion group(s) ran; this check has at least 7. Something"
  echo "      exited early and a green here would be vacuous."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — Números reads a month of deliveries, write-offs"
  echo "and sales as the app spells them, sees every void, and reads the same in a"
  echo "cashier's hand and nothing in a stranger's."
  exit 0
fi
echo "$fails assertion group(s) FAILED out of $ran."
exit 1

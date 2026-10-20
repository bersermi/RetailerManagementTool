#!/usr/bin/env bash
# 8g-proveedores-contract — does `app/src/api/providerPage.ts` still describe the
# database?
#
# A supplier's page (plan `8g`, the owner's option A of 2026-10-20) reads ONE
# thing the app had never read: every delivery LINE of one supplier, filtered on
# the EMBEDDED document (`purchase!inner(…)`, the composite foreign key `Costos`
# embeds) and ordered by the PARENT's time. No typecheck and no Vitest fixture can
# say any of that answers; this check asks a real PostgREST, spelling the request
# the way `supplierLines` (`@/api/calls`) does, out of the module's own constants.
#
#   1. ⚠️ EVERY STRING IS READ OUT OF THE APP — not typed in here.
#   2. THE READ ANSWERS 200, the price ARRIVES AS A STRING (`::text`), and the
#      document is embedded with the four columns `broughtOf` reads.
#   3. ⚠️⚠️ ONLY HER LINES COME BACK — the filter on the embed narrows the LINES
#      (that is what `!inner` is for); another supplier's delivery is never sent.
#   4. NEWEST FIRST BY THE DOCUMENT'S TIME, and a voided delivery comes back with
#      its cancellation, so `standing` can leave both out.
#   5. ⚠️ A CASHIER READS THE SAME LINES AS THE OWNER (`0040`), and another shop none.
#
# Run:  supabase start && supabase db reset && bash docs/checks/8g-proveedores-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/providerPage.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- the contract, read out of the app --------------------------------------
str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
# ⚠️ `SUPPLIER_LINE_COLUMNS` is written over two lines.
COLUMNS="$(sed -n "/^export const SUPPLIER_LINE_COLUMNS =/,/;/p" "$CONTRACT" | sed -n "s/^ *'\([^']*\)';.*/\1/p" | head -1)"
TABLE="$(str SUPPLIER_LINE_TABLE "$CONTRACT")"
BY="$(str SUPPLIER_LINE_PROVIDER "$CONTRACT")"
TIME="$(str SUPPLIER_LINE_TIME "$CONTRACT")"
ORDER="$(str SUPPLIER_LINE_ORDER "$CONTRACT")"
TIE="$(str SUPPLIER_LINE_TIEBREAK "$CONTRACT")"

note
MISSING=""
for name in COLUMNS TABLE BY TIME ORDER TIE; do
  eval "value=\$$name"
  [[ -n "$value" ]] || MISSING="$MISSING $name"
done
if [[ -n "$MISSING" ]]; then
  fail "could not read the supplier contract out of $CONTRACT:$MISSING"
  exit 1
fi
ok "read from the app: $TABLE, filtered on $BY and $TIME, ordered by $ORDER then $TIE"

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
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"proveedores-probe-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  exit 1
}

STAMP="$$-$(date +%s)"

# --- the shop, its people, its catalog --------------------------------------
signup "proveedores-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
WORKSPACE_ID="$(body "$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Proveedores 8g","p_prices_include_tax":true,"p_location_name":null}')" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop"; exit 1; }
LOCATION_ID="$(first id "$(body "$(api GET '/rest/v1/location?select=id')")")"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

STAFF_EMAIL="proveedores-staff-$STAMP@example.com"
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

# --- the documents: two deliveries from Don Chuy (one voided), one from the generic
B_OLD="$(uuid)"; B_NEW="$(uuid)"; B_GONE="$(uuid)"; B_GEN="$(uuid)"
buy() { # id provider variant price -> status
  status "$(api POST /rest/v1/rpc/record_purchase "$(python3 -c '
import json, sys
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_provider_id": sys.argv[3],
  "p_lines": [{"variant_id": sys.argv[4], "qty_display": "10", "qty_display_unit": "pza", "unit_price_net_per_base": sys.argv[5]}]}))' \
    "$1" "$LOCATION_ID" "$2" "$3" "$4")")"
}
LANDED="$(buy "$B_OLD" "$CHUY" "$PAN" "30.000000") $(buy "$B_GEN" "$GENERIC" "$PAN" "31.000000") $(buy "$B_GONE" "$CHUY" "$PAN" "99.000000")"
sleep 1
LANDED="$LANDED $(buy "$B_NEW" "$CHUY" "$PAN" "33.000000")"
# ⚠️ THE VOID IS TRIED THREE TIMES: once in a few runs it answered 400 straight after
# the delivery landed and 200 on the next try (the same thing `8g-numeros-contract.sh`
# saw once). The refusal is printed every time, so a real one still reads.
VOID=""
for try in 1 2 3; do
  VOID_OUT="$(api POST /rest/v1/rpc/void_transaction "{\"p_kind\":\"purchase\",\"p_id\":\"$B_GONE\",\"p_reason\":\"8g fixture\"}")"
  VOID="$(status "$VOID_OUT")"
  [[ "$VOID" == "200" ]] && break
  echo "      the void answered (try $try): $(body "$VOID_OUT" | head -c 300)" >&2
  sleep 2
done
note
if [[ "$LANDED" == "200 200 200 200" && "$VOID" == "200" ]]; then
  ok "three deliveries from Don Chuy (one voided) and one from the generic supplier"
else
  fail "the fixture did not land: writes $LANDED / void $VOID"; exit 1
fi

SINCE="$(python3 -c 'import datetime;print((datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=120)).strftime("%Y-%m-%dT%H:%M:%S.000Z"))')"
lines() { api GET "/rest/v1/$TABLE?select=$COLUMNS&$BY=eq.$1&$TIME=gte.$SINCE&order=$ORDER.desc,$TIE.desc&offset=0&limit=500"; }

# --- 2, 3 and 4. the owner's read --------------------------------------------
TOKEN="$OWNER_TOKEN"
O_LINES="$(lines "$CHUY")"
note
if [[ "$(status "$O_LINES")" == "200" ]]; then
  ok "the read answers 200 — the embed, the filters on it and the parent order exist"
else
  fail "THE READ ANSWERED $(status "$O_LINES"): $(body "$O_LINES" | head -c 300)"
  exit 1
fi

cat > "$SCRATCH/owner.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1])); chuy, gen, old, new, gone = sys.argv[2:7]
if not isinstance(rows, list) or not rows:
    print('THE SUPPLIER READ CAME BACK EMPTY: %r' % (rows,)); raise SystemExit
for r in rows:
    if not isinstance(r.get('unit_price_net_per_base'), str):
        print('a delivery price arrived as %s rather than a string — the ::text cast is gone'
              % type(r.get('unit_price_net_per_base')).__name__); raise SystemExit
    doc = r.get('purchase') or {}
    if sorted(doc) != ['id', 'occurred_at', 'provider_id', 'reversal_of']:
        print('the document arrived with %r — broughtOf reads id, occurred_at, provider_id, reversal_of' % sorted(doc)); raise SystemExit
providers = {r['purchase']['provider_id'] for r in rows}
if providers != {chuy}:
    print('ONLY HER LINES SHOULD COME BACK — the filter on the embed narrowed nothing: %r' % providers); raise SystemExit
docs = [r['purchase']['id'] for r in rows]
times = [r['purchase']['occurred_at'] for r in rows]
if times != sorted(times, reverse=True):
    print('NOT NEWEST FIRST by the document\'s time: %r' % times); raise SystemExit
if gen in docs:
    print('the generic supplier\'s delivery came back on Don Chuy\'s page'); raise SystemExit
if not ({old, new, gone} <= set(docs)) or not any(r['purchase']['reversal_of'] == gone for r in rows):
    print('the voided delivery should come back WITH its cancellation, so standing can leave both out: %r'
          % [(r['purchase']['id'], r['purchase']['reversal_of']) for r in rows]); raise SystemExit
print('ok — %d lines, all Don Chuy\'s, newest first, the void with its cancellation, prices as strings' % len(rows))
PY
verdict "only her lines, newest first, with what standing needs" "$SCRATCH/owner.py" \
  "$(stash o_lines "$O_LINES")" "$CHUY" "$GENERIC" "$B_OLD" "$B_NEW" "$B_GONE"

# --- 5. the cashier reads the same, and another shop none -------------------
signup "$STAFF_EMAIL"; STAFF_TOKEN="$TOKEN"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$INVITE_TOKEN\"}" > /dev/null
TOKEN="$STAFF_TOKEN"
H_LINES="$(lines "$CHUY")"
note
if [[ "$(status "$H_LINES")" == "200" && "$(body "$H_LINES")" == "$(body "$O_LINES")" ]]; then
  ok "a cashier reads exactly the owner's lines — her page is the same in every hand"
else
  fail "THE CASHIER READS DIFFERENT LINES: $(status "$H_LINES") $(body "$H_LINES" | head -c 300)"
fi

signup "proveedores-stranger-$STAMP@example.com"
api POST /rest/v1/rpc/onboard_workspace '{"p_display_name":"Otra tienda 8g","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
THEIRS="$(body "$(lines "$CHUY")")"
note
if [[ "$THEIRS" == "[]" ]]; then
  ok "another shop's owner reads none of her lines — 200 and []"
else
  fail "ANOTHER SHOP READ THIS SHOP'S SUPPLIER LINES: $THEIRS"
fi

# --- the verdict -------------------------------------------------------------
echo
if (( ran < 6 )); then
  echo "FAIL: only $ran assertion group(s) ran; this check has at least 6. Something"
  echo "      exited early and a green here would be vacuous."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — a supplier's page reads her delivery lines as"
  echo "the app spells them: only hers, newest first, the same in a cashier's hand, and"
  echo "nothing in a stranger's."
  exit 0
fi
echo "$fails assertion group(s) FAILED out of $ran."
exit 1

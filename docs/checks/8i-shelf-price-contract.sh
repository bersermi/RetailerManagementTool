#!/usr/bin/env bash
# 8i-shelf-price-contract — does a price set on the phone reach the shop as the
# app sends it, over a real PostgREST?
#
# WHY THIS EXISTS. `app/src/api/shelfPrice.ts` is the app's claim about `0074`:
# the function's name, its arguments by name, and the two keys of its answer.
# PostgREST finds a function BY its argument names, so one misspelt is a 404 on
# every price — and the drain keeps a 404 waiting rather than drop it, so the
# phone would show her price for ever and the shop would never have it. And the
# app sends both numbers as TEXT (a price is never a double here), which only a
# real PostgREST shows it accepts. `supabase/tests/0074_…` holds every rule of
# the function as the roles; this holds the app's half of the wire.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST, as an owner and
# a cashier of one shop:
#   1. The claim is read OUT OF `shelfPrice.ts`, and the catalog's price embed and
#      window out of `catalog.ts` — nothing is retyped here.
#   2. A first price, as the app sends it (the numbers as text, no scope, seen as
#      none): 200 and an answer of exactly the two keys the app reads, booleans;
#      the database holds one row from her day under the phone's id.
#   3. The same id again: already recorded, still one row.
#   4. A change from a later day, seen as the price in force: the old row ends at
#      her day and hers begins.
#   5. A second change the same day: that day's row replaced, still two rows.
#   6. A stale phone (seen as a price no longer in force): 200, not applied, and
#      nothing written.
#   7. The catalog, read as the app reads it, finds exactly the new price.
#   8. A cashier: 403 `42501`, nothing written.
#   9. Signed out: refused, nothing written.
#  10. A negative price: 400 `22023`, nothing written.
#
# ⚠️ WHAT THE DATABASE HOLDS IS ASKED OF THE DATABASE (`supabase db query --local`,
# as the superuser): a 200 or a 400 says how the call ended, not what is stored.
#
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI.
#
# Run:  supabase start && supabase db reset && bash docs/checks/8i-shelf-price-contract.sh
# With: $1 a copy of shelfPrice.ts, $2 of catalog.ts — how the falsifier points it
#       at a broken one.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

SHELF_TS="${1:-app/src/api/shelfPrice.ts}"
CATALOG_TS="${2:-app/src/api/catalog.ts}"
for f in "$SHELF_TS" "$CATALOG_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the app's own claim, read out of its source ------------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
FUNCTION="$(const SET_SHELF_PRICE "$SHELF_TS")"
ARGS="$(awk '/^export const SHELF_PRICE_ARGUMENTS = \[/{f=1;next} f&&/^\] as const;/{exit} f' "$SHELF_TS" \
        | sed -n "s/^ *'\([a-z_]*\)',*$/\1/p" | paste -sd, -)"
# The two keys `priceReplyFrom` reads, in its order.
REPLY_KEYS="$(sed -n "s/.*typeof row\.\([a-z_]*\) !== 'boolean' || typeof row\.\([a-z_]*\) !== 'boolean'.*/\1,\2/p" "$SHELF_TS" | head -1)"
PRICE_TABLE="$(const PRICE_TABLE "$CATALOG_TS")"
PRICE_COLUMNS="$(const PRICE_COLUMNS "$CATALOG_TS")"
PRICE_STARTS="$(const PRICE_STARTS_COLUMN "$CATALOG_TS")"
ENDS_TEMPLATE="$(sed -n 's/.*return `\(effective_to[^`]*\)`;.*/\1/p' "$CATALOG_TS" | head -1)"

for pair in "SET_SHELF_PRICE:$FUNCTION" "SHELF_PRICE_ARGUMENTS:$ARGS" "priceReplyFrom's keys:$REPLY_KEYS" \
            "PRICE_TABLE:$PRICE_TABLE" "PRICE_COLUMNS:$PRICE_COLUMNS" \
            "PRICE_STARTS_COLUMN:$PRICE_STARTS" "priceEndsAfter:$ENDS_TEMPLATE"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the app's source"
    echo "      This check asserts the app's own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
ok "read from the app: $FUNCTION($ARGS), answered with {$REPLY_KEYS}; the catalog embeds $PRICE_TABLE($PRICE_COLUMNS)"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)"
  echo "      from the repository root — \`supabase status\` needs the project directory."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE, which bypasses RLS: "a cashier
# is refused" would then be true of nobody.
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

TOKEN=""
api() { # method path [body] -> body, with the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" auth="${TOKEN:-}"
  if [[ -n "$auth" ]]; then auth="Authorization: Bearer $auth"; else auth="X-Empty: 1"; fi
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" \
      -H "apikey: $KEY" -H "$auth" -H 'Content-Type: application/json' -d "$body"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth"
  fi
}
# One row posted, and its id back (`return=representation`). Fixtures only — the
# product is not under test.
insert_id() { # table json -> the new row's id
  curl -s -X POST "$API_URL/rest/v1/$1?select=id" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -H 'Prefer: return=representation' -d "$2" \
    | python3 -c 'import json,sys; r=json.load(sys.stdin); print(r[0]["id"] if isinstance(r,list) and r else "")' 2>/dev/null
}
# A JSON object keyed by the APP's names, in their order — never typed here.
by_names() { # names-csv json-value1 json-value2 ... -> a JSON object
  python3 -c 'import json,sys; n=sys.argv[1].split(","); print(json.dumps(dict(zip(n,[json.loads(v) for v in sys.argv[2:]]))))' "$@"
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
uuid()   { python3 -c 'import uuid; print(uuid.uuid4())'; }
day()    { python3 -c 'import datetime,sys; print((datetime.date.today()+datetime.timedelta(days=int(sys.argv[1]))).isoformat())' "$1"; }
# What the database holds, as the superuser.
sql()    { supabase db query --local -o csv "$1" 2>/dev/null | tail -1; }
rows()   { # variant -> `from→to price | …`, oldest first, the shop-wide scope
  sql "select coalesce(string_agg(format('%s→%s %s', effective_from, coalesce(effective_to::text, '∞'), price_per_base), ' | ' order by effective_from), 'none') from public.price_list where variant_id = '$1' and location_id is null"
}
# One price as the app sends it: id, product, price, day, scope, seen.
set_price() { # id variant price day seen(json) -> the response
  api POST "/rest/v1/rpc/$FUNCTION" "$(by_names "$ARGS" "\"$1\"" "\"$2\"" "\"$3\"" "\"$4\"" null "$5")"
}
# The answer, read as `priceReplyFrom` reads it: `applied`/`superseded`, or what was wrong.
reply_of() {
  python3 - "$REPLY_KEYS" "$1" <<'PY'
import json, sys
keys = sys.argv[1].split(',')
try:
    d = json.loads(sys.argv[2])
except Exception:
    print('unreadable'); sys.exit()
if not isinstance(d, dict) or sorted(d) != sorted(keys) or not all(isinstance(d[k], bool) for k in keys):
    print('keys ' + (','.join(sorted(d)) if isinstance(d, dict) else type(d).__name__)); sys.exit()
applied, already = d[keys[0]], d[keys[1]]
print(('applied' if applied else 'superseded') + (' already' if already else ''))
PY
}

STAMP="$$-$(date +%s)"
D0="$(day -2)"
D1="$(day 0)"

# --- an owner, her shop, one product, and a cashier ------------------------
signup() { # email -> the sign-up's body
  local out try
  python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": "precio-probe-123"}))' "$1" > "$SCRATCH/signup.json"
  # ⚠️ RETRIED: GoTrue rate-limits sign-ups and answers a limited one with an
  # EMPTY body rather than a 429 — which looks exactly like a broken harness.
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "$(cat "$SCRATCH/signup.json")")"
    [[ -n "$(pick access_token "$(body "$out")")" ]] && { body "$out"; return; }
    sleep 10
  done
  body "$out"
}
OWNER_BODY="$(signup "duena-precio-$STAMP@example.com")"
OWNER_TOKEN="$(pick access_token "$OWNER_BODY")"
CASHIER_BODY="$(signup "cajera-precio-$STAMP@example.com")"
CASHIER_TOKEN="$(pick access_token "$CASHIER_BODY")"
CASHIER_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["user"]["id"])' <<< "$CASHIER_BODY" 2>/dev/null)"
if [[ -z "$OWNER_TOKEN" || -z "$CASHIER_TOKEN" || -z "$CASHIER_ID" ]]; then
  fail "the two sign-ups got no session — $(head -c 200 <<< "$OWNER_BODY")"
  exit 1
fi
TOKEN="$OWNER_TOKEN"
SHOP="$(body "$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Abarrotes del precio","p_prices_include_tax":true,"p_location_name":null}')" | tr -d '"')"
[[ "$SHOP" =~ ^[0-9a-f-]{36}$ ]] || { fail "could not make the shop: $SHOP"; exit 1; }
FAMILY="$(insert_id product_family "{\"workspace_id\":\"$SHOP\",\"name\":\"Refrescos $STAMP\"}")"
VARIANT="$(insert_id product_variant "{\"workspace_id\":\"$SHOP\",\"family_id\":\"$FAMILY\",\"name\":\"Refresco $STAMP\",\"base_unit_code\":\"pza\",\"purchase_unit_code\":\"pza\",\"sell_unit_code\":\"pza\",\"price_unit_code\":\"pza\"}")"
[[ "$VARIANT" =~ ^[0-9a-f-]{36}$ ]] || { fail "could not make the product: $VARIANT"; exit 1; }
# The cashier joins as staff — as the superuser, because joining is not under test.
supabase db query --local "insert into public.workspace_member (workspace_id, user_id, role) values ('$SHOP', '$CASHIER_ID', 'staff')" > /dev/null 2>&1
[[ "$(sql "select role from public.workspace_member where workspace_id = '$SHOP' and user_id = '$CASHIER_ID'")" == staff ]] \
  || { fail "could not make the cashier a member of the shop"; exit 1; }

# --- 2. a first price, as the app sends it ---------------------------------
P1="$(uuid)"
out="$(set_price "$P1" "$VARIANT" 18.000000 "$D0" null)"
got="$(reply_of "$(body "$out")")"
if [[ "$(status "$out")" == 200 && "$got" == applied ]]; then
  ok "a first price, the numbers as text, no scope, seen as none: 200, answered {$REPLY_KEYS}, applied"
else
  fail "a first price as the app sends it answered $(status "$out") ($got) — $(body "$out" | head -c 200)"
fi
r="$(rows "$VARIANT")"
if [[ "$r" == "${D0}→∞ 18.000000" && "$(sql "select count(*) from public.price_list where id = '$P1'")" == 1 ]]; then
  ok "the shop holds one price, from her day, under the phone's id: $r"
else
  fail "after the first price the shop holds: $r"
fi

# --- 3. the same id again --------------------------------------------------
out="$(set_price "$P1" "$VARIANT" 18.000000 "$D0" null)"
got="$(reply_of "$(body "$out")")"
if [[ "$(status "$out")" == 200 && "$got" == "applied already" && "$(rows "$VARIANT")" == "${D0}→∞ 18.000000" ]]; then
  ok "the same id again: already recorded, and still one row"
else
  fail "the same id again answered $(status "$out") ($got) and the shop holds $(rows "$VARIANT")"
fi

# --- 4. a change from a later day ------------------------------------------
P2="$(uuid)"
out="$(set_price "$P2" "$VARIANT" 20.000000 "$D1" '"18.000000"')"
got="$(reply_of "$(body "$out")")"
r="$(rows "$VARIANT")"
if [[ "$(status "$out")" == 200 && "$got" == applied && "$r" == "${D0}→$D1 18.000000 | ${D1}→∞ 20.000000" ]]; then
  ok "a change seen against the price in force: the old one ends at her day and hers begins"
else
  fail "a change answered $(status "$out") ($got) and the shop holds $r"
fi

# --- 5. a second change the same day ---------------------------------------
P3="$(uuid)"
out="$(set_price "$P3" "$VARIANT" 22.000000 "$D1" '"20.000000"')"
got="$(reply_of "$(body "$out")")"
r="$(rows "$VARIANT")"
if [[ "$(status "$out")" == 200 && "$got" == applied && "$r" == "${D0}→$D1 18.000000 | ${D1}→∞ 22.000000" \
      && "$(sql "select count(*) from public.price_list where id in ('$P2', '$P3')")" == 1 ]]; then
  ok "a second change the same day replaces that day's row, under the new id"
else
  fail "a same-day change answered $(status "$out") ($got) and the shop holds $r"
fi

# --- 6. a stale phone ------------------------------------------------------
P4="$(uuid)"
out="$(set_price "$P4" "$VARIANT" 25.000000 "$D1" '"20.000000"')"
got="$(reply_of "$(body "$out")")"
if [[ "$(status "$out")" == 200 && "$got" == superseded && "$(rows "$VARIANT")" == "$r" \
      && "$(sql "select count(*) from public.price_list where id = '$P4'")" == 0 ]]; then
  ok "a phone still showing \$20 when the price is \$22: 200, not applied, nothing written"
else
  fail "a stale change answered $(status "$out") ($got) and the shop holds $(rows "$VARIANT")"
fi

# --- 7. the catalog, as the app reads it -----------------------------------
ENDS="${ENDS_TEMPLATE//\$\{today\}/$D1}"
out="$(api GET "/rest/v1/product_variant?select=id,$PRICE_TABLE($PRICE_COLUMNS)&id=eq.$VARIANT&$PRICE_TABLE.$PRICE_STARTS=lte.$D1&$PRICE_TABLE.or=($ENDS)")"
seen="$(python3 -c 'import json,sys; r=json.load(sys.stdin); print(",".join(p["price_per_base"] for p in r[0]["'"$PRICE_TABLE"'"]))' <<< "$(body "$out")" 2>/dev/null)"
if [[ "$(status "$out")" == 200 && "$seen" == 22.000000 ]]; then
  ok "the catalog, read as the app reads it today, finds exactly the new price: $seen"
else
  fail "the catalog read answered $(status "$out") and found [$seen] — $(body "$out" | head -c 200)"
fi

# --- 8. a cashier ----------------------------------------------------------
before="$(rows "$VARIANT")"
TOKEN="$CASHIER_TOKEN"
out="$(set_price "$(uuid)" "$VARIANT" 30.000000 "$D1" '"22.000000"')"
TOKEN="$OWNER_TOKEN"
code="$(pick code "$(body "$out")")"
if [[ "$(status "$out")" == 403 && "$code" == 42501 && "$(rows "$VARIANT")" == "$before" ]]; then
  ok "a cashier is refused 403 42501, and the price stands"
else
  fail "a cashier's price answered $(status "$out") $code, and the shop holds $(rows "$VARIANT")"
fi

# --- 9. signed out ---------------------------------------------------------
TOKEN=""
out="$(set_price "$(uuid)" "$VARIANT" 30.000000 "$D1" '"22.000000"')"
TOKEN="$OWNER_TOKEN"
code="$(pick code "$(body "$out")")"
if [[ "$(status "$out")" =~ ^40[13]$ && "$code" == 42501 && "$(rows "$VARIANT")" == "$before" ]]; then
  ok "signed out, the function cannot be called ($(status "$out") $code), and the price stands"
else
  fail "a signed-out price answered $(status "$out") $code, and the shop holds $(rows "$VARIANT")"
fi

# --- 10. a negative price --------------------------------------------------
P5="$(uuid)"
out="$(set_price "$P5" "$VARIANT" -1.000000 "$D1" '"22.000000"')"
code="$(pick code "$(body "$out")")"
if [[ "$(status "$out")" == 400 && "$code" == 22023 && "$(sql "select count(*) from public.price_list where id = '$P5'")" == 0 ]]; then
  ok "a negative price is refused 400 22023, and nothing is written"
else
  fail "a negative price answered $(status "$out") $code"
fi

echo
if (( fails > 0 )); then
  echo "$fails assertion(s) failed."
  exit 1
fi
echo "all 10 groups passed — a price set on the phone reaches the shop as the app sends it."

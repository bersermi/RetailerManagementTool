#!/usr/bin/env bash
# 6a-i-waste-contract — does `app/src/api/waste.ts` still describe the database,
# and can this app actually record a loss?
#
# ⚠️⚠️ `record_waste` (`0019`) HAS BEEN APPLIED SINCE 2026-09-05 WITH 67
# BEHAVIOURAL CHECKS AND TEN FALSIFICATIONS AGAINST IT, AND NOTHING IN `app/` HAD
# EVER CALLED IT. So every claim below is one no node suite and no typecheck can
# make, and several of them were 200-and-wrong until they were driven:
#
#   * **THE FIVE CAUSES ARE STILL THE FIVE.** `WASTE_REASONS` is a TypeScript
#     tuple and `public.waste_reason` is an enum in a migration; TypeScript has
#     never read `0003`. A value renamed there leaves the suite green and every
#     write-off in the shop answering **HTTP 400 `22P02`** — *invalid input value
#     for enum public.waste_reason* — which is a **DEAD LETTER** per loss, and
#     §2.6 says replay is manual.
#   * ⚠️⚠️ **THE ORDER IS THE ENUM'S DECLARATION ORDER, AND IT IS NOT
#     ALPHABETICAL.** Postgres sorts an enum by declaration. So the picker's order
#     and the order a reason breakdown arrives in are the same order — or they are
#     two answers to *which cause matters most*, and **nothing else in this
#     repository could see the disagreement.**
#   * ⚠️⚠️ **A LINE WITH NO CAUSE IS `22023` AND NOT A DEFAULT.** `0019` refuses
#     it with a sentence quoting §2.8. The client refuses it first
#     (`draftOf`'s `no-reason`), and this is what proves the server would too — so
#     the picker having no way past it is a second lock and not the only one.
#   * ⚠️⚠️ **AN UNPRICED WASTE LINE LANDS AT ZERO, AND OMITTING THE PRICE DOES
#     NOT.** This is the measurement `UNPRICED_WASTE` rests on: the price key is
#     REQUIRED (`22023`), and an explicit `0` is accepted with `line_net` of
#     `0.00`. **A loss not recorded destroys the only record of it**, so the
#     client sends the zero — and if the database ever starts refusing it, this
#     goes red rather than a shopkeeper's write-off silently dead-lettering.
#   * ⚠️⚠️ **THE DEFAULT UNIT IS THE **SELL** UNIT, WHICH IS NOT THE BASE UNIT.**
#     `0019` defaults `qty_display_unit` to `sell_unit_code`; the cart holds BASE
#     units. Measured: `qty_display: 500` with no unit against a `g`-based,
#     `kg`-sold variant stored `qty_base: 500000` — **five hundred KILOS.** The
#     client always sends the unit, and this asserts the default it must never
#     rely on.
#   * ⚠️⚠️ **AN EMPLEADA CAN RECORD A LOSS AND CANNOT READ ITS LINES, AND THE
#     REFUSAL IS AN HTTP 200 WITH AN EMPTY ARRAY.** `waste_select` admits every
#     member and `waste_line_select` carries `has_role(…, 'manager')` (`0003:596`)
#     — the only asymmetric pair in this schema, and `0040` re-confirmed it by
#     name. **This is why `6a-ii` exists and why it needs a migration**, and this
#     check is what stops somebody "fixing" the list by widening the fence
#     without noticing they are publishing the cost of waste.
#   * **THE ACCENTS SURVIVE THE ROUND TRIP.** Two of the five carry one, so this
#     is a UTF-8 assertion as well as a vocabulary one.
#   * ⚠️ **WASTE RECORDS UNCONDITIONALLY** — owner-ruled 2026-09-04, *"the loss
#     already happened, and refusing it discards the only record of it."* More
#     than the shelf holds is a 200, and the shelf goes negative.
#
# WHAT IT DOES NOT ASSERT: which words the picker shows, what the bar counts, and
# that there is no peso total. Those are `app/test/api-waste.test.ts`'s and
# `R9`'s. This file is about the WIRE: the vocabulary, the order, the codes, the
# units, the zero and the fence.
#
# Run:  supabase start && supabase db reset && bash docs/checks/6a-i-waste-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/waste.ts}"
CART="${2:-app/src/cart/cart.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }
[[ -r "$CART" ]] || { echo "FAIL: cannot read $CART"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the contract, read out of the app ----------------------------------
# ⚠️ EVERY STRING BELOW IS THE MODULE'S OWN. A check that retypes a contract is
# asserting itself — `MAGNITUDE_ORDER_ASCENDING`'s rule, and `5h-ii-a`'s.
str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1; }
# ⚠️ THE FIVE VALUES COME OUT OF THE TUPLE, ONE PER LINE, IN THE ORDER THEY ARE
# WRITTEN — because the ORDER is one of the things being asserted. A `sort` here
# would destroy the claim.
values() {
  sed -n '/^export const WASTE_REASONS = \[/,/^\] as const;/p' "$CONTRACT" \
    | sed -n "s/^  '\([^']*\)',.*/\1/p"
}
# ⚠️ THE PRICE KEY IS `@/cart/cart`'s `PRICE_KEY.sell`, because waste follows the
# SALE shape (`MONEY_KIND.waste`). Read from there rather than retyped, so a
# change to that map is caught here and not by a shopkeeper.
price_key() {
  sed -n '/^export const PRICE_KEY = {/,/^} as const/p' "$CART" \
    | sed -n "s/^  sell: '\([^']*\)',.*/\1/p" | head -1
}
# ⚠️ AND THE ZERO ITSELF, so that a session which changes the policy to a NULL or
# to a guess has to come here and say so.
unpriced() { sed -n 's/^export const UNPRICED_WASTE = \([0-9][0-9.]*\);.*/\1/p' "$CART" | head -1; }

REASON_KEY="$(str WASTE_REASON_KEY)"
PRICE_FIELD="$(price_key)"
UNPRICED="$(unpriced)"
REASONS=()
while IFS= read -r one; do [[ -n "$one" ]] && REASONS+=("$one"); done < <(values)

note
if [[ -z "$REASON_KEY" || -z "$PRICE_FIELD" || -z "$UNPRICED" || ${#REASONS[@]} -eq 0 ]]; then
  fail "could not read the waste contract out of $CONTRACT / $CART"
  echo "      key='$REASON_KEY' price='$PRICE_FIELD' unpriced='$UNPRICED' reasons=${#REASONS[@]}"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
# ⚠️ THE FLOOR IS FIVE AND IT IS A FLOOR RATHER THAN AN EQUALITY, so that
# amending `0003` to add a sixth cause needs no edit here — but a `sed` that
# silently matched three lines cannot pass.
if (( ${#REASONS[@]} < 5 )); then
  fail "read only ${#REASONS[@]} cause(s) out of WASTE_REASONS — expected at least 5"
  exit 1
fi
ok "read from $CONTRACT: ${#REASONS[@]} cause(s), key=$REASON_KEY"
ok "read from $CART: price field=$PRICE_FIELD, unpriced waste sends $UNPRICED"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)"
  echo "      from the repository root — \`supabase status\` needs the project directory."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS,
# and the manager-fence assertions would pass vacuously — supabase/README.md's
# own note about the `postgres` superuser.
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

# ⚠️ SIGNUP IS RETRIED. GoTrue rate-limits it, and a rate-limited signup returns
# an empty body rather than a 429 — which looks exactly like a broken harness.
signup() { # email -> sets TOKEN
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"waste-probe-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  echo "      GoTrue rate-limits signup and answers with an EMPTY BODY when it does."
  exit 1
}

STAMP="$$-$(date +%s)"

# --- the shop, its catalog, its stock and its people -----------------------
signup "waste-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Desperdicio 6a-i","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }
LOCATION_ID="$(first id "$(body "$(api GET '/rest/v1/location?select=id')")")"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

# ⚠️ THE FAMILY NAME CARRIES AN ACCENT for `5d-i`'s reason: a transport that
# mangled UTF-8 between here and a phone would otherwise be green.
FAMILY_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Frutas y verduras"}))' "$WORKSPACE_ID")"
FAMILY_ID="$(first id "$(body "$(api POST '/rest/v1/product_family?select=id' "$FAMILY_JSON")")")"
[[ -n "$FAMILY_ID" ]] || { echo "FAIL: could not create a family"; exit 1; }

# ⚠️ BASE AND SELL UNITS ARE SEPARATE ARGUMENTS, because assertion 6 is about the
# DEFAULT `qty_display_unit` and a variant whose base and sell units are the same
# would make that assertion pass whichever unit `0019` picked.
variant() { # name base-unit sell-unit -> id
  local json
  json="$(python3 -c '
import json, sys
print(json.dumps({
  "workspace_id": sys.argv[1], "family_id": sys.argv[2], "name": sys.argv[3],
  "base_unit_code": sys.argv[4], "purchase_unit_code": sys.argv[5],
  "sell_unit_code": sys.argv[5], "price_unit_code": sys.argv[5], "tax_rate": 0}))' \
    "$WORKSPACE_ID" "$FAMILY_ID" "$1" "$2" "$3")"
  first id "$(body "$(api POST '/rest/v1/product_variant?select=id' "$json")")"
}
JITOMATE="$(variant 'Jitomate saladet' g kg)"
SERVILLETAS="$(variant 'Servilletas' pza pza)"
[[ -n "$JITOMATE" && -n "$SERVILLETAS" ]] || { echo "FAIL: could not create two variants"; exit 1; }

# ⚠️ STOCK FIRST, so the FEFO allocator has lots to take from and the cost
# snapshot is a real number rather than the shortfall zero C8.6 describes.
GENERIC_ID="$(first id "$(body "$(api GET '/rest/v1/provider?select=id&is_generic=is.true')")")"
[[ -n "$GENERIC_ID" ]] || { echo "FAIL: the new shop has no generic provider"; exit 1; }
BUY_LINES="$(python3 -c '
import json, sys
print(json.dumps([
  {"variant_id": sys.argv[1], "qty_display": "20", "qty_display_unit": "kg",  "unit_price_net_per_base": "0.030000"},
  {"variant_id": sys.argv[2], "qty_display": "50", "qty_display_unit": "pza", "unit_price_net_per_base": "1.000000"}]))' \
  "$JITOMATE" "$SERVILLETAS")"
BUY_BODY="$(python3 -c '
import json, sys
print(json.dumps({
  "p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_provider_id": sys.argv[3],
  "p_occurred_at": sys.argv[4], "p_recorded_offline": True,
  "p_lines": json.loads(sys.argv[5])}))' \
  "$(uuid)" "$LOCATION_ID" "$GENERIC_ID" "$(ago 6)" "$BUY_LINES")"
STOCKED="$(api POST /rest/v1/rpc/record_purchase "$BUY_BODY")"
note
if [[ "$(status "$STOCKED")" == "200" ]]; then ok "the shop has stock to lose"
else fail "could not stock the shop: $(status "$STOCKED") $(body "$STOCKED" | head -c 300)"; exit 1; fi

# ⚠️ THE EMPLEADA. `0028` requires a staff invite to name a location and §2.7 is
# the reason — so everything she reads and writes goes THROUGH `my_locations()`.
STAFF_INVITE_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "waste-staff-$STAMP@example.com" "$LOCATION_ID")"
INVITE_OUT="$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE_JSON")"
STAFF_INVITE="$(pick token "$(body "$INVITE_OUT")")"
[[ -n "$STAFF_INVITE" ]] || {
  echo "FAIL: create_invite returned no token — $(status "$INVITE_OUT"): $(body "$INVITE_OUT" | head -c 300)"
  exit 1; }
signup "waste-staff-$STAMP@example.com"; STAFF_TOKEN="$TOKEN"
REDEEM_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_token": sys.argv[1]}))' "$STAFF_INVITE")"
REDEEMED="$(TOKEN="$STAFF_TOKEN" api POST /rest/v1/rpc/redeem_invite "$REDEEM_JSON")"
note
if [[ "$(status "$REDEEMED")" == "200" ]]; then ok "an Empleada joined the shop at this location"
else fail "redeem_invite refused: $(body "$REDEEMED")"; exit 1; fi

# ⚠️⚠️ THE PAYLOAD IS BUILT THE WAY `@/cart/cart` BUILDS IT, keys and all —
# `variant_id`, `qty_display`, `qty_display_unit`, the price field read out of
# `PRICE_KEY.sell`, and the reason under the key read out of the contract. A
# check that hardcoded these would be asserting itself.
waste_line() { # variant qty unit price reason -> one line, as JSON
  python3 -c '
import json, sys
line = {"variant_id": sys.argv[1], "qty_display": sys.argv[2],
        sys.argv[4]: sys.argv[5]}
if sys.argv[3] != "":
    line["qty_display_unit"] = sys.argv[3]
if sys.argv[7] != "":
    line[sys.argv[6]] = sys.argv[7]
print(json.dumps(line))' "$1" "$2" "$3" "$PRICE_FIELD" "$4" "$REASON_KEY" "$5"
}

record_waste() { # token id hours-ago lines-json -> response
  local payload
  payload="$(python3 -c '
import json, sys
print(json.dumps({
  "p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_occurred_at": sys.argv[3],
  "p_recorded_offline": True, "p_lines": json.loads(sys.argv[4])}))' \
    "$2" "$LOCATION_ID" "$(ago "$3")" "$4")"
  TOKEN="$1" api POST /rest/v1/rpc/record_waste "$payload"
}

# --- 2. every cause the app offers is a cause the database accepts ---------
# ⚠️⚠️ THE WHOLE VOCABULARY IN ONE DOCUMENT, WHICH IS ALSO HOW THE ORDER IS
# ASSERTED. One document with one line per cause, read back with `?order=reason`.
# ⚠️ THE LINES ARE ASSEMBLED THROUGH A **FILE** AND NOT THROUGH AN ARGUMENT LIST.
# The first spelling passed five JSON objects as positional arguments to python
# through a nested `$( )`, which is [[json-inline-in-nested-subshell-brace-expands]]
# waiting to happen — bash splits an inline object in two and PostgREST answers
# `PGRST102`. One object per line in a file has no quoting to get wrong.
ALL_ID="$(uuid)"
LINES_FILE="$SCRATCH/all-lines.json"
: > "$SCRATCH/each.txt"
for r in "${REASONS[@]}"; do waste_line "$JITOMATE" '1' 'kg' '0.060000' "$r" >> "$SCRATCH/each.txt"; done
python3 -c '
import json, sys
with open(sys.argv[1], encoding="utf-8") as fh:
    print(json.dumps([json.loads(l) for l in fh if l.strip()]))' "$SCRATCH/each.txt" > "$LINES_FILE"
ALL_LINES="$(cat "$LINES_FILE")"

ALL_OUT="$(record_waste "$STAFF_TOKEN" "$ALL_ID" 1 "$ALL_LINES")"
note
if [[ "$(status "$ALL_OUT")" == "200" ]]; then
  ok "an Empleada recorded a loss under every one of the ${#REASONS[@]} cause(s) this app offers"
else
  fail "record_waste refused the app's own vocabulary: $(status "$ALL_OUT") $(body "$ALL_OUT" | head -c 400)"
  echo "      ⚠️ A cause this app offers that the database refuses is a DEAD LETTER"
  echo "      per write-off (22P02), and §2.6 says replay is manual. Check"
  echo "      WASTE_REASONS against 0003:419."
  exit 1
fi

# --- 3. the order the app offers them in is the order the database sorts ---
ORDERED="$(TOKEN="$OWNER_TOKEN" api GET "/rest/v1/waste_line?select=$REASON_KEY&waste_id=eq.$ALL_ID&order=$REASON_KEY")"
ORDERED_FILE="$(stash ordered "$ORDERED")"
printf '%s\n' "${REASONS[@]}" > "$SCRATCH/app-order.txt"
cat > "$SCRATCH/order.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1], encoding='utf-8'))
key = sys.argv[2]
app = [l.rstrip('\n') for l in open(sys.argv[3], encoding='utf-8') if l.strip()]
if not isinstance(rows, list) or not rows:
    print(f"the reason read came back as {rows!r} rather than a list of rows")
    raise SystemExit
db = [r[key] for r in rows]
if db != app:
    print("⚠️ THE PICKER'S ORDER AND THE DATABASE'S DISAGREE.")
    print(f"      app offers:  {app}")
    print(f"      db sorts to: {db}")
    print("      Postgres sorts an enum by DECLARATION order, so this is what a")
    print("      reason breakdown will arrive in. Two orders is two answers to")
    print("      *which cause matters most*, and nothing else here can see it.")
    raise SystemExit
if db == sorted(db):
    print("the order is ALPHABETICAL, which means this assertion proved nothing:")
    print("      declaration order and alphabetical order coincide, so a tuple")
    print("      somebody 'tidied' would still pass. 0003 declared them in a")
    print("      deliberate non-alphabetical order; check that it still does.")
    raise SystemExit
print(f"ok — {len(db)} cause(s), and it is NOT alphabetical: {db[0]} … {db[-1]}")
PY
verdict "the app offers the causes in the order the database sorts them" \
  "$SCRATCH/order.py" "$ORDERED_FILE" "$REASON_KEY" "$SCRATCH/app-order.txt"

# --- 4. a cause no migration created ---------------------------------------
BAD_ID="$(uuid)"
BAD_LINES="$(python3 -c '
import json, sys
print(json.dumps([json.loads(sys.argv[1])]))' "$(waste_line "$JITOMATE" '1' 'kg' '0.060000' 'se me cayo')")"
BAD_OUT="$(record_waste "$STAFF_TOKEN" "$BAD_ID" 1 "$BAD_LINES")"
BAD_FILE="$(stash bad "$BAD_OUT")"
note
BAD_STATUS="$(status "$BAD_OUT")"
BAD_CODE="$(pick code "$(body "$BAD_OUT")")"
if [[ "$BAD_STATUS" == "400" && "$BAD_CODE" == "22P02" ]]; then
  ok "a cause outside the enum is refused — HTTP 400 / 22P02, which is why isWasteReason() guards a restored basket"
else
  fail "an invalid cause answered $BAD_STATUS / '$BAD_CODE', expected 400 / 22P02"
  echo "      ⚠️ THE MESSAGE LEAKS A POSTGRES TYPE NAME (*invalid input value for"
  echo "      enum public.waste_reason*), so it must never reach a shopkeeper —"
  echo "      @/api/waste's isWasteReason() is what keeps a restored basket from"
  echo "      producing one. If this code changed, that guard's reason changed."
fi

# --- 5. no cause at all ----------------------------------------------------
NONE_ID="$(uuid)"
NONE_LINES="$(python3 -c '
import json, sys
print(json.dumps([json.loads(sys.argv[1])]))' "$(waste_line "$JITOMATE" '1' 'kg' '0.060000' '')")"
NONE_OUT="$(record_waste "$STAFF_TOKEN" "$NONE_ID" 1 "$NONE_LINES")"
note
NONE_CODE="$(pick code "$(body "$NONE_OUT")")"
if [[ "$(status "$NONE_OUT")" == "400" && "$NONE_CODE" == "22023" ]]; then
  ok "a line with no cause is refused — 400 / 22023, so reason-first has a server-side lock too"
else
  fail "a line with no cause answered $(status "$NONE_OUT") / '$NONE_CODE', expected 400 / 22023"
  echo "      ⚠️⚠️ IF THIS EVER BECOMES A 200 THE SCHEMA HAS GAINED A DEFAULT, which"
  echo "      is what 0019 refuses by name: an enum with a default quietly files"
  echo "      every unlabelled loss under one cause. draftOf's \`no-reason\` and the"
  echo "      picker having no way out are the client's two locks; this is the third."
fi

# --- 6. the default unit is the SELL unit, not the base unit --------------
# ⚠️⚠️ THE MEASUREMENT THE CLIENT IS BUILT AROUND NEVER RELYING ON. `Jitomate` is
# based in `g` and sold in `kg`, so a quantity sent with NO unit is multiplied by
# a thousand. The cart holds BASE units and always sends the unit; this is what
# makes that a decision rather than a coincidence.
UNIT_ID="$(uuid)"
UNIT_LINES="$(python3 -c '
import json, sys
print(json.dumps([json.loads(sys.argv[1])]))' "$(waste_line "$JITOMATE" '2' '' '0.060000' "${REASONS[0]}")")"
UNIT_OUT="$(record_waste "$STAFF_TOKEN" "$UNIT_ID" 1 "$UNIT_LINES")"
STORED="$(TOKEN="$OWNER_TOKEN" api GET "/rest/v1/waste_line?select=qty_base,qty_display,qty_display_unit&waste_id=eq.$UNIT_ID")"
STORED_FILE="$(stash stored "$STORED")"
cat > "$SCRATCH/unit.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1], encoding='utf-8'))
if not isinstance(rows, list) or len(rows) != 1:
    print(f"expected one waste line back, got {rows!r}")
    raise SystemExit
row = rows[0]
if row['qty_display_unit'] != 'kg':
    print(f"the default qty_display_unit is {row['qty_display_unit']!r}, not the SELL unit 'kg'.")
    print("      0019 documents sell_unit_code as the default (stock is LEAVING the")
    print("      shelf). If that changed, @/cart/cart's qtySent must be re-read:")
    print("      the cart holds BASE units and relies on sending the unit EVERY time.")
    raise SystemExit
if float(row['qty_base']) != 2000.0:
    print(f"qty_base is {row['qty_base']}, expected 2000 — 2 kg of a gram-based variant")
    raise SystemExit
print("ok — 2 with no unit became 2 kg / qty_base 2000, so an omitted unit multiplies by 1000")
PY
note
if [[ "$(status "$UNIT_OUT")" == "200" ]]; then
  verdict "the default unit is the SELL unit and NOT the base unit" "$SCRATCH/unit.py" "$STORED_FILE"
else
  fail "a line with no qty_display_unit answered $(status "$UNIT_OUT"): $(body "$UNIT_OUT" | head -c 300)"
fi

# --- 7. the unpriced loss, which is the decision `UNPRICED_WASTE` records --
# ⚠️ FIRST: OMITTING THE PRICE IS REFUSED. This is why the client cannot simply
# say nothing, and it is half of the argument for sending a zero.
SILENT_ID="$(uuid)"
SILENT_LINES="$(python3 -c '
import json, sys
print(json.dumps([{"variant_id": sys.argv[1], "qty_display": "3",
                   "qty_display_unit": "pza", sys.argv[2]: sys.argv[3]}]))' \
  "$SERVILLETAS" "$REASON_KEY" "${REASONS[1]}")"
SILENT_OUT="$(record_waste "$STAFF_TOKEN" "$SILENT_ID" 1 "$SILENT_LINES")"
note
SILENT_CODE="$(pick code "$(body "$SILENT_OUT")")"
if [[ "$(status "$SILENT_OUT")" == "400" && "$SILENT_CODE" == "22023" ]]; then
  ok "omitting $PRICE_FIELD is refused — 400 / 22023, so silence is not one of the options"
else
  fail "a line with no price answered $(status "$SILENT_OUT") / '$SILENT_CODE', expected 400 / 22023"
  echo "      ⚠️⚠️ IF THIS IS NOW A 200 THEN UNPRICED_WASTE'S WHOLE ARGUMENT CHANGED."
  echo "      The zero exists because the key is REQUIRED; if the database will take"
  echo "      a null, saying *unknown* beats saying *nothing* and @/cart/cart should"
  echo "      be re-read with this result in hand."
fi

# ⚠️ AND SECOND: THE ZERO THE CLIENT SENDS INSTEAD IS ACCEPTED, and the quantity
# lands exactly. `Servilletas` has never been priced, which is C8.2's short
# catalog — the condition that makes this the common case rather than an edge one.
ZERO_ID="$(uuid)"
ZERO_LINES="$(python3 -c '
import json, sys
print(json.dumps([json.loads(sys.argv[1])]))' \
  "$(waste_line "$SERVILLETAS" '3' 'pza' "$(python3 -c "print(f'{float(\"$UNPRICED\"):.6f}')")" "${REASONS[1]}")")"
ZERO_OUT="$(record_waste "$STAFF_TOKEN" "$ZERO_ID" 1 "$ZERO_LINES")"
ZERO_ROWS="$(TOKEN="$OWNER_TOKEN" api GET "/rest/v1/waste_line?select=qty_base,line_net,tax_amount,unit_price_net_per_base&waste_id=eq.$ZERO_ID")"
ZERO_FILE="$(stash zero "$ZERO_ROWS")"
cat > "$SCRATCH/zero.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1], encoding='utf-8'))
if not isinstance(rows, list) or len(rows) != 1:
    print(f"expected one waste line back, got {rows!r}")
    raise SystemExit
row = rows[0]
if float(row['unit_price_net_per_base']) != 0.0 or float(row['line_net']) != 0.0:
    print(f"a zero-priced line stored price={row['unit_price_net_per_base']} net={row['line_net']}, expected both 0")
    raise SystemExit
if float(row['qty_base']) != 3.0:
    print(f"qty_base is {row['qty_base']}, expected 3 — the QUANTITY is the number this screen reports")
    raise SystemExit
print("ok — the loss is recorded, line_net 0.00, and the quantity is exact")
PY
note
if [[ "$(status "$ZERO_OUT")" == "200" ]]; then
  verdict "an unpriced product's loss is still recorded, at $UNPRICED" "$SCRATCH/zero.py" "$ZERO_FILE"
else
  fail "a zero-priced waste line answered $(status "$ZERO_OUT"): $(body "$ZERO_OUT" | head -c 300)"
  echo "      ⚠️ THIS IS THE ONE THAT MATTERS MOST FOR THE PILOT. C8.2 seeds the"
  echo "      catalog short, so many products have no price — and if this is refused,"
  echo "      Desperdicio cannot record a loss for the products most likely to spoil."
fi

# --- 8. the accents survive the round trip --------------------------------
ACCENTED="$(TOKEN="$OWNER_TOKEN" api GET "/rest/v1/waste_line?select=$REASON_KEY&waste_id=eq.$ALL_ID")"
ACCENTED_FILE="$(stash accented "$ACCENTED")"
cat > "$SCRATCH/utf8.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1], encoding='utf-8'))
key = sys.argv[2]
app = [l.rstrip('\n') for l in open(sys.argv[3], encoding='utf-8') if l.strip()]
accented = [r for r in app if any(ord(c) > 127 for c in r)]
if not accented:
    print("no cause in WASTE_REASONS carries a non-ASCII character, so this")
    print("      assertion proves nothing about UTF-8. 0003 declares `dañado` and")
    print("      `merma de preparación`; check the tuple.")
    raise SystemExit
back = {r[key] for r in rows}
missing = [r for r in accented if r not in back]
if missing:
    print(f"accented cause(s) did not come back verbatim: {missing}")
    print(f"      what came back: {sorted(back)}")
    print("      A transport that mangles UTF-8 between a phone and Postgres turns")
    print("      every write-off under these causes into a 22P02 dead letter.")
    raise SystemExit
print(f"ok — {len(accented)} accented cause(s) round-tripped verbatim: {', '.join(accented)}")
PY
verdict "the accented causes survive the round trip" \
  "$SCRATCH/utf8.py" "$ACCENTED_FILE" "$REASON_KEY" "$SCRATCH/app-order.txt"

# --- 9. waste records unconditionally, which is the owner's ruling ---------
# ⚠️ RULED 2026-09-04: *"the loss already happened, and refusing it discards the
# only record of it."* More than the shelf holds is a 200 and the shelf goes
# negative — the opposite of `record_sale`, which refuses `TD002`.
OVER_ID="$(uuid)"
OVER_LINES="$(python3 -c '
import json, sys
print(json.dumps([json.loads(sys.argv[1])]))' \
  "$(waste_line "$JITOMATE" '9999' 'kg' '0.060000' "${REASONS[3]}")")"
OVER_OUT="$(record_waste "$STAFF_TOKEN" "$OVER_ID" 1 "$OVER_LINES")"
note
if [[ "$(status "$OVER_OUT")" == "200" ]]; then
  ok "more than the shelf holds is recorded — no availability check, the owner's ruling of 2026-09-04"
else
  fail "waste beyond stock answered $(status "$OVER_OUT"), expected 200: $(body "$OVER_OUT" | head -c 300)"
  echo "      ⚠️ AN AVAILABILITY CHECK HAS APPEARED IN record_waste. That reverses an"
  echo "      owner ruling, and the screen would then need somewhere to put a refusal"
  echo "      it currently cannot receive."
fi

# --- 10. the asymmetric fence, which is why `6a-ii` needs a migration -----
# ⚠️⚠️ THE ASSERTION THIS WHOLE SPLIT RESTS ON, AND IT IS A 200. `waste_select`
# admits every member; `waste_line_select` carries has_role(…, 'manager')
# (0003:596) because the line holds `unit_cost_net_per_base`. So an Empleada sees
# that a document exists and what it was worth on the shelf, and sees NONE of its
# products — as an empty array, not as a refusal.
STAFF_DOC="$(TOKEN="$STAFF_TOKEN" api GET "/rest/v1/waste?select=id,total_net,waste_line($REASON_KEY,qty_display)&id=eq.$ALL_ID")"
STAFF_FILE="$(stash staffdoc "$STAFF_DOC")"
OWNER_DOC="$(TOKEN="$OWNER_TOKEN" api GET "/rest/v1/waste?select=id,total_net,waste_line($REASON_KEY,qty_display)&id=eq.$ALL_ID")"
OWNER_FILE="$(stash ownerdoc "$OWNER_DOC")"
cat > "$SCRATCH/fence.py" <<'PY'
import json, sys
staff = json.load(open(sys.argv[1], encoding='utf-8'))
owner = json.load(open(sys.argv[2], encoding='utf-8'))
if not isinstance(staff, list) or len(staff) != 1:
    print(f"an Empleada could not read the waste HEADER at her own location: {staff!r}")
    print("      waste_select (0003:591) carries no role gate. If she is refused the")
    print("      header too, §2.7 has changed and 6a-ii's whole question is different.")
    raise SystemExit
if staff[0]['waste_line'] != []:
    print("⚠️⚠️ AN EMPLEADA CAN NOW READ waste_line, AND THAT IS A COST FENCE OPENING.")
    print(f"      she got: {staff[0]['waste_line']!r}")
    print("      waste_line carries unit_cost_net_per_base — what the shop PAID for")
    print("      what it threw away — and 0040 kept that manager-and-above BY NAME")
    print("      while widening purchase. If this is deliberate it is an ADR §2.7")
    print("      amendment and an owner's ruling, not a green check.")
    raise SystemExit
if not isinstance(owner, list) or len(owner) != 1 or len(owner[0]['waste_line']) < 2:
    print(f"the OWNER could not read the lines either, so this proved nothing: {owner!r}")
    print("      An empty array on both sides is a vacuous pass — the embed may")
    print("      simply be wrong. The owner must see the lines for the Empleada's")
    print("      empty array to mean a fence.")
    raise SystemExit
print(f"ok — she reads the header and {len(staff[0]['waste_line'])} of its lines; "
      f"the owner reads {len(owner[0]['waste_line'])}")
PY
verdict "an Empleada records a loss and cannot read its lines — a 200 with an empty array" \
  "$SCRATCH/fence.py" "$STAFF_FILE" "$OWNER_FILE"

# --- 11. idempotency, because the queue re-sends ---------------------------
# ⚠️ A FLUSH RE-SENDS ON ANY UNREADABLE REPLY (`@/api/flush`), so a second send
# of one client id must be the SAME document and not a second loss.
AGAIN="$(record_waste "$STAFF_TOKEN" "$ALL_ID" 1 "$ALL_LINES")"
AGAIN_FILE="$(stash again "$AGAIN")"
cat > "$SCRATCH/again.py" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding='utf-8'))
want = sys.argv[2]
if not isinstance(d, dict):
    print(f"a replay answered {d!r} rather than an object")
    raise SystemExit
if d.get('already_recorded') is not True:
    print(f"a replay answered already_recorded={d.get('already_recorded')!r}, expected True")
    print("      §2.6's idempotency is what makes a retry free. Without it every")
    print("      lost reply is a SECOND write-off on the ledger.")
    raise SystemExit
if d.get('waste_id') != want:
    print(f"a replay answered waste_id={d.get('waste_id')!r}, expected the first document {want}")
    raise SystemExit
print("ok — the same client id is the same document, carrying already_recorded")
PY
note
if [[ "$(status "$AGAIN")" == "200" ]]; then
  verdict "re-sending one write-off is not a second loss" "$SCRATCH/again.py" "$AGAIN_FILE" "$ALL_ID"
else
  fail "a replay answered $(status "$AGAIN"): $(body "$AGAIN" | head -c 300)"
fi

# --- verdict ---------------------------------------------------------------
echo
if (( fails > 0 )); then
  echo "$ran assertion group(s) ran, $fails failed — app/src/api/waste.ts and"
  echo "app/src/cart/cart.ts are describing a database that is not this one."
  exit 1
fi
# ⚠️ THE ANTI-VACUITY FLOOR. "0 failed" is also what a run that asserted nothing
# prints — the shape this repository has recorded five of.
if (( ran < 14 )); then
  echo "FAIL: only $ran assertion group(s) ran, expected at least 14 — this check"
  echo "      proved almost nothing and was about to report success."
  exit 1
fi
echo "all $ran assertion groups passed — this app can record a loss, under every"
echo "cause it offers, in the order the database sorts them, with or without a"
echo "price; and an Empleada still cannot read what it cost."

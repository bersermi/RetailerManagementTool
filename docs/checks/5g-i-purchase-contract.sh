#!/usr/bin/env bash
# 5g-i-purchase-contract — does `app/src/api/providers.ts` still describe the
# database, and does `record_purchase` accept what `@/cart/cart` builds?
#
# ⚠️⚠️ THE SECOND HALF IS THE FIRST TIME ANYTHING IN THIS REPOSITORY HAS SENT
# `record_purchase` ANYTHING. It has been applied since `0018` on 2026-09-04 and
# `5f-i`'s row said so out loud: *"nothing here has asked Postgres whether it
# accepts this payload… `record_purchase` is `5g`'s."* A node suite can read
# every rule in `@/cart/cart` and cannot read that, and a file is not evidence.
#
# WHAT IT ASSERTS, all against a REAL round trip, with a real shop, a real
# delivery, an owner and a cashier:
#
#   1. Every string is READ OUT OF `app/src/api/providers.ts` — not typed in
#      here. A second copy of a contract is the defect this repository has
#      recorded eleven times.
#   2. The provider read answers 200 with every column it asked for, and the
#      generic row `onboard_workspace` seeds is in it.
#   3. ⚠️⚠️ WHAT THAT ROW IS CALLED, read off the wire rather than off `0002`.
#      F6 says `Genérico` and the applied schema says something else; this is
#      the assertion that makes the disagreement impossible to forget, and it
#      goes red the day the decisions block is answered either way.
#   4. `record_purchase` accepts the payload `draftOf` builds, key for key —
#      including `p_provider_id`, which `@/cart/cart` did not carry until this
#      task, and `qty_display` as a STRING.
#   5. ⚠️ A delivery with no provider is refused, and by `0018`'s own SQLSTATE.
#      `draftOf` refuses it first; this proves the second wall is really there.
#   6. ⚠️⚠️ THE PRICE IS THE INVOICE NET AND IT IS STORED VERBATIM. §2.5 rule 2
#      scopes `prices_include_tax` to the SALE side in its own parenthesis, and
#      `quoted` disagreed with it until 2026-09-24. This reads the figure back
#      out of the ledger and compares it to what was sent.
#   7. ⚠️ The memory view then offers that same figure back — the round trip
#      C3.11 is made of, over the real `distinct on` rather than a fixture.
#   8. ⚠️⚠️ `unit_price_net_per_base` COMES BACK AS A JSON STRING because the
#      contract casts it. Without the cast it is a double, and `parseDecimal`
#      refuses a number argument outright. Read off the WIRE, which no string
#      -matching check could do.
#   9. ⚠️ THE MEMORY NEVER CROSSES PROVIDERS. Two providers, one variant, two
#      different prices — and the filter the app sends returns one of them.
#  10. ⚠️⚠️ THE CASHIER ASYMMETRY, WHICH IS WHY `5g` SPLIT. She reads the
#      provider list; she reads ZERO rows of the memory — 200 and an empty
#      array, NOT a 403; she records a delivery that SUCCEEDS; and she reads
#      ZERO purchases back. Every symptom of the broken case is a designed state
#      of the working one, so this is the only instrument that can see it.
#  11. Another shop reads none of this shop's providers or prices.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the arithmetic. What `$18.00 / kg` is per gram is
# `@tienda/money`'s and `app/test/api-providers.test.ts` pins the round trip.
# This file is about the WIRE — the names, the shapes, the types and the fences.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5g-i-purchase-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/providers.ts}"
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

PROVIDER_COLUMNS="$(str PROVIDER_COLUMNS)"
PROVIDER_ORDER_COLUMN="$(str PROVIDER_ORDER_COLUMN)"
MEMORY_TABLE="$(str MEMORY_TABLE)"
MEMORY_PROVIDER_COLUMN="$(str MEMORY_PROVIDER_COLUMN)"
# ⚠️ `MEMORY_COLUMNS` is written over two lines, so it is read differently. The
# alternative is reformatting the module to suit this check, which is the tail
# wagging the dog.
MEMORY_COLUMNS="$(sed -n "/^export const MEMORY_COLUMNS =/,/;/p" "$CONTRACT" \
                  | sed -n "s/.*'\([^']*\)'.*/\1/p" | head -1)"

note
MISSING=""
for name in PROVIDER_COLUMNS PROVIDER_ORDER_COLUMN MEMORY_TABLE \
            MEMORY_PROVIDER_COLUMN MEMORY_COLUMNS; do
  eval "value=\$$name"
  [[ -n "$value" ]] || MISSING="$MISSING $name"
done
if [[ -n "$MISSING" ]]; then
  fail "could not read the provider contract out of $CONTRACT:$MISSING"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: provider=$PROVIDER_COLUMNS memory=$MEMORY_COLUMNS"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS,
# and assertions 10 and 11 would then pass vacuously for the same reason
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

signup() { # email -> sets TOKEN
  local out
  out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"purchase-probe-123\"}")"
  TOKEN="$(pick access_token "$(body "$out")")"
  [[ -n "$TOKEN" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}

STAMP="$$-$(date +%s)"

# --- the shop, its catalog, its suppliers and its two people ---------------
signup "purchase-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Purchase 5g-i","p_prices_include_tax":true,"p_location_name":null}')"
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

VARIANT_JSON="$(python3 -c '
import json, sys
print(json.dumps({
  "workspace_id": sys.argv[1], "family_id": sys.argv[2], "name": "Jitomate saladet",
  "base_unit_code": "g", "purchase_unit_code": "kg", "sell_unit_code": "kg",
  "price_unit_code": "kg", "tax_rate": 0}))' "$WORKSPACE_ID" "$FAMILY_ID")"
VARIANT_ID="$(first id "$(body "$(api POST '/rest/v1/product_variant?select=id' "$VARIANT_JSON")")")"
[[ -n "$VARIANT_ID" ]] || { echo "FAIL: could not create a variant"; exit 1; }

# A second, named supplier — assertion 9 needs two of them for one variant.
SECOND_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Bodega del Centro"}))' "$WORKSPACE_ID")"
SECOND_ID="$(first id "$(body "$(api POST '/rest/v1/provider?select=id' "$SECOND_JSON")")")"
[[ -n "$SECOND_ID" ]] || { echo "FAIL: could not create a second provider"; exit 1; }

# --- 2, 3. the read the app actually makes ---------------------------------
PROVIDERS_PATH="/rest/v1/provider?select=$PROVIDER_COLUMNS&order=$PROVIDER_ORDER_COLUMN"
PROVIDERS="$(api GET "$PROVIDERS_PATH")"
PROVIDERS_FILE="$(stash providers "$PROVIDERS")"

# ⚠️⚠️ THE BANNED LIST IS NAMED HERE AND MEASURED OFF THE WIRE, WHICH IS C8.8's
# ARGUMENT APPLIED TO THE PROVIDER DIRECTORY — and it was added because the
# falsifier's P6 walked straight past the first version of this assertion. That
# version compared the response's keys to the columns the app ASKED for, so a
# contract that asked for `phone` was consistent with itself and green. **The
# question is not whether the read got what it wanted; it is whether a column
# Comprar never draws reached a phone.** `contact_name`, `phone` and
# `address_line1` belong to Proveedores, which is step 6's own screen.
BANNED='contact_name,phone,address_line1,normalized_name,created_at,updated_at'

cat > "$SCRATCH/providers.py" <<'PY'
import json, sys
path, cols, banned = sys.argv[1], sys.argv[2].split(','), sys.argv[3].split(',')
try:
    rows = json.load(open(path))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list):
    print('the provider read came back as an error: %r' % (rows,)); raise SystemExit
if len(rows) != 2:
    print('the shop has two providers and the read returned %d' % len(rows)); raise SystemExit
for row in rows:
    missing = [c for c in cols if c not in row]
    if missing:
        print('the select asked for columns the row does not have: %s' % missing); raise SystemExit
    extra = [c for c in row if c not in cols]
    if extra:
        print('the read carried columns nobody asked for: %s — a column the app never '
              'asks for is a column that never reaches a phone' % extra); raise SystemExit
    reached = [c for c in banned if c in row]
    if reached:
        print('%s reached the phone. Comprar draws none of them and Proveedores is step '
              "6's own screen — a column the app never asks for is a column that never "
              'reaches a phone (C8.8)' % reached); raise SystemExit
generic = [r for r in rows if r['is_generic']]
if len(generic) != 1:
    print('a workspace has exactly one generic provider and this one has %d' % len(generic))
    raise SystemExit
print('ok — two providers, exactly one generic, and no directory column reached the phone')
PY
verdict "the provider read answers with what the app asked for" \
  "$SCRATCH/providers.py" "$PROVIDERS_FILE" "$PROVIDER_COLUMNS" "$BANNED"

# ⚠️⚠️ ASSERTION 3 — WHAT THE SEEDED ROW IS ACTUALLY CALLED. It was written on
# 2026-09-24 while the plan and the applied schema DISAGREED about this string:
# F6 required `Genérico`, `onboard_workspace` had seeded `Compra directa` since
# `0002`, and nothing in this repository looked at a word.
# ✅ **RULED THE SAME DAY AND SHIPPED AS `0039`:** *"Genérico is fine, that means
# we don't have a Provider for that purchase."* **The row is the ABSENCE of a
# counterparty rather than a description of how the goods were bought.**
# ⚠️ THE ASSERTION STAYS, AND IT IS NOT NOW REDUNDANT: it is the only thing in
# this repository that reads the word a shopkeeper sees, and a later
# `create or replace` of `onboard_workspace` that forgot the literal would
# otherwise silently seed the old name into every shop made after it.
note
GENERIC_NAME="$(python3 -c "
import json,sys
rows = json.load(open(sys.argv[1]))
print(next((r['name'] for r in rows if r.get('is_generic')), ''))" "$PROVIDERS_FILE" 2>/dev/null)"
if [[ "$GENERIC_NAME" == "Genérico" ]]; then
  ok "the seeded generic provider is called 'Genérico', as 0039 and F6 both say"
else
  fail "the generic provider is now called '$GENERIC_NAME', and it should be 'Genérico'."
  echo "      0039 renamed the seed AND the rows that already existed, on the owner's"
  echo "      ruling of 2026-09-24. If this is a deliberate second rename it needs a"
  echo "      fix-forward migration that does BOTH halves again — a seed changed alone"
  echo "      leaves every existing shop pointing at the old word, which is the state"
  echo "      0039 exists to have ended."
fi

GENERIC_ID="$(python3 -c "
import json,sys
rows = json.load(open(sys.argv[1]))
print(next((r['id'] for r in rows if r.get('is_generic')), ''))" "$PROVIDERS_FILE" 2>/dev/null)"
[[ -n "$GENERIC_ID" ]] || { echo "FAIL: no generic provider to buy from"; exit 1; }

# --- 4. the payload `draftOf` builds ---------------------------------------
# ⚠️ SPELLED THE WAY `@/cart/cart` SPELLS IT, key for key: `p_` plus the
# payload's own keys is what `@/api/flush`'s `sendArgs` sends, so a key renamed
# on either side of the wire is a 400 nothing else in this repository would see.
# ⚠️ `qty_display` IS A STRING. `0016` and `0018` read it as
# `(e.l->>'qty_display')::numeric`, so text arrives exactly; a JSON number
# arrives through a double, which `R5` forbids anywhere near the ledger.
NET='0.018000'
buy() { # provider-id price -> response
  local payload
  payload="$(python3 -c '
import json, sys
print(json.dumps({
  "p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_provider_id": sys.argv[3] or None,
  "p_lines": [{"variant_id": sys.argv[4], "qty_display": "3", "qty_display_unit": "kg",
               "unit_price_net_per_base": sys.argv[5]}]}))' \
    "$(uuid)" "$LOCATION_ID" "$1" "$VARIANT_ID" "$2")"
  api POST /rest/v1/rpc/record_purchase "$payload"
}

TOKEN="$OWNER_TOKEN"
DELIVERY="$(buy "$GENERIC_ID" "$NET")"
DELIVERY_FILE="$(stash delivery "$DELIVERY")"
note
if [[ "$(status "$DELIVERY")" == "200" ]]; then
  ok "record_purchase accepts the payload draftOf builds, p_provider_id and all"
else
  fail "record_purchase refused the app's own payload — $(status "$DELIVERY"): $(body "$DELIVERY")"
  echo "      This is the round trip 5f-i's row said nothing had ever performed. A node"
  echo "      suite cannot see it and a file is not evidence."
fi

# --- 5. a delivery with nobody to have come from ---------------------------
# ⚠️ `draftOf` refuses this first — that is `app/test/cart.test.ts`'s assertion.
# This one proves the SECOND wall is really there, so the client-side refusal is
# a courtesy rather than the only thing standing between a shop and a delivery
# with no counterparty.
note
NOBODY="$(buy "" "$NET")"
if [[ "$(status "$NOBODY")" == "400" ]] && grep -q '22023' <<< "$(body "$NOBODY")"; then
  ok "a delivery with no provider is refused by 0018's own wall, as 22023"
else
  fail "a delivery with no provider came back $(status "$NOBODY"): $(body "$NOBODY")"
  echo "      0018:200 raises 22023 — 'a delivery has a counterparty, and the generic"
  echo "      provider is a real row'. If that has moved, draftOf's no-provider refusal"
  echo "      is now the only thing holding the line."
fi

# --- 6. the price is the invoice net, stored verbatim ----------------------
# ⚠️⚠️ §2.5 RULE 2 SCOPES `prices_include_tax` TO THE SALE, IN ITS OWN
# PARENTHESIS — and this shop was created with the flag TRUE. `quoted` in
# `@/cart/cart` read it on both sides until 2026-09-24 and that made every
# purchase unpriceable. This reads the figure back out of the LEDGER.
LINE="$(stash line "$(api GET "/rest/v1/purchase_line?select=unit_price_net_per_base::text,qty_base::text,line_net::text&variant_id=eq.$VARIANT_ID")")"
cat > "$SCRATCH/net.py" <<'PY'
import json, sys
path, sent = sys.argv[1], sys.argv[2]
rows = json.load(open(path))
if not isinstance(rows, list) or not rows:
    print('the delivery line did not come back: %r' % (rows,)); raise SystemExit
line = rows[0]
stored = line['unit_price_net_per_base']
if not isinstance(stored, str):
    print('unit_price_net_per_base came back as %r — the ::text cast is what keeps it '
          'out of a double' % (stored,)); raise SystemExit
if float(stored) != float(sent):
    print('the invoice net was sent as %s and stored as %s — something converted it, and '
          'the only flag that could is scoped to the SALE by §2.5 rule 2'
          % (sent, stored)); raise SystemExit
# 3 kg at 0.018/g is 3000 g and $54.00 net.
if float(line['qty_base']) != 3000.0:
    print('qty_display 3 kg re-derived as %s base units, expected 3000' % line['qty_base'])
    raise SystemExit
if float(line['line_net']) != 54.0:
    print('line_net came to %s, expected 54.00 — 3000 g at 0.018' % line['line_net'])
    raise SystemExit
print('ok — the invoice net is stored verbatim and the quantity re-derives to 3000 g')
PY
verdict "the price reaches the ledger as the invoice net" "$SCRATCH/net.py" "$LINE" "$NET"

# --- 7, 8. the memory offers it back ---------------------------------------
MEMORY_PATH="/rest/v1/$MEMORY_TABLE?select=$MEMORY_COLUMNS&$MEMORY_PROVIDER_COLUMN=eq.$GENERIC_ID"
MEMORY="$(api GET "$MEMORY_PATH")"
MEMORY_FILE="$(stash memory "$MEMORY")"
cat > "$SCRATCH/memory.py" <<'PY'
import json, sys
path, cols, sent, variant, provider = (
    sys.argv[1], sys.argv[2].split(','), sys.argv[3], sys.argv[4], sys.argv[5])
rows = json.load(open(path))
if not isinstance(rows, list):
    print('the memory read came back as an error: %r' % (rows,)); raise SystemExit
if len(rows) != 1:
    print('one delivery of one variant should remember exactly one pairing, got %d'
          % len(rows)); raise SystemExit
row = rows[0]
# ⚠️ The select names `unit_price_net_per_base::text`; PostgREST keys the result
# by the column, so the cast is invisible in the key and visible in the TYPE.
wanted = [c.split('::')[0] for c in cols]
missing = [c for c in wanted if c not in row]
if missing:
    print('the memory select asked for columns the view does not have: %s' % missing)
    raise SystemExit
price = row['unit_price_net_per_base']
if not isinstance(price, str):
    print('unit_price_net_per_base came back as %r (%s) — without the ::text cast it is a '
          'double, and parseDecimal refuses a number argument outright'
          % (price, type(price).__name__)); raise SystemExit
if float(price) != float(sent):
    print('the memory offers %s and the delivery paid %s' % (price, sent)); raise SystemExit
if row['last_qty_display_unit'] != 'kg':
    print('the denomination she typed came back as %r, expected kg'
          % (row['last_qty_display_unit'],)); raise SystemExit
if row['provider_id'] != provider or row['variant_id'] != variant:
    print('the memory is for the wrong pairing: %r' % (row,)); raise SystemExit
print('ok — one pairing, the figure a JSON STRING, the denomination carried')
PY
verdict "the memory offers back what was paid, as text" \
  "$SCRATCH/memory.py" "$MEMORY_FILE" "$MEMORY_COLUMNS" "$NET" "$VARIANT_ID" "$GENERIC_ID"

# --- 9. and it never crosses providers -------------------------------------
# ⚠️⚠️ THE ONE RULE §2.8 SAYS THE OPERATOR CANNOT CATCH FOR US: a borrowed
# prefill *"looks exactly like the case where the system knows"*. Two suppliers,
# one variant, two prices — and the filter the app sends must return one.
OTHER_NET='0.025000'
buy "$SECOND_ID" "$OTHER_NET" > /dev/null
note
FIRST_AGAIN="$(body "$(api GET "$MEMORY_PATH")")"
SECOND_MEM="$(body "$(api GET "/rest/v1/$MEMORY_TABLE?select=$MEMORY_COLUMNS&$MEMORY_PROVIDER_COLUMN=eq.$SECOND_ID")")"
GOT_FIRST="$(python3 -c "
import json,sys
r=json.loads(sys.stdin.read())
print(r[0]['unit_price_net_per_base'] if isinstance(r,list) and len(r)==1 else 'WRONG')" <<< "$FIRST_AGAIN" 2>/dev/null)"
GOT_SECOND="$(python3 -c "
import json,sys
r=json.loads(sys.stdin.read())
print(r[0]['unit_price_net_per_base'] if isinstance(r,list) and len(r)==1 else 'WRONG')" <<< "$SECOND_MEM" 2>/dev/null)"
if [[ "$GOT_FIRST" == "$NET" && "$GOT_SECOND" == "$OTHER_NET" ]]; then
  ok "two providers, one variant, two prices — and neither read sees the other's"
else
  fail "the memory crossed providers: generic offered '$GOT_FIRST' (expected $NET) and"
  echo "      the named supplier offered '$GOT_SECOND' (expected $OTHER_NET). A supplier"
  echo "      price is a fact about a relationship, and a borrowed prefill is accepted by"
  echo "      an operator precisely because it looks like a memory."
fi

# --- 10. what a cashier reads, and it CHANGED SIDES on 2026-09-25 -----------
# ⚠️⚠️ THIS IS WHY `5g` SPLIT, AND IT IS STILL THE ONLY INSTRUMENT THAT CAN SEE IT.
# Every claim here is a POLICY rather than a column, and a policy that allows more
# breaks no other test in this repository — which is precisely why the numbers are
# asserted and not the intent.
#
# ⚠️⚠️ WHAT IT USED TO ASSERT, because the inversion is the point: until `0040` a
# cashier read the provider list, **ZERO** rows of `provider_price_memory` (200 and
# an empty array, never a 403), recorded a delivery that SUCCEEDED, and read **zero**
# purchases back. That asymmetry is what `5g.split` was written around, and Comprar's
# `unreadable` price state existed for it.
#
# ✅ `0040` ENDED IT ON THE DECISION MAKER'S INSTRUCTION — *"Empleada should be able
# to see the both the purchase records and the prices."* So the memory is no longer
# empty for her and the purchases read back. ⚠️ **The assertion is INVERTED rather
# than deleted**: it is the only thing anywhere that would notice the fence being put
# back, and a migration that narrowed these two policies would otherwise show up as
# a screen quietly asking her to type a price the app already knows.
#
# ⚠️ THE LOCATION WALL IS STILL ASSERTED THROUGH HER: she is invited to ONE location,
# so what she reads is her store's deliveries and not the workspace's.
STAFF_EMAIL="purchase-staff-$STAMP@example.com"
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
STAFF_PROVIDERS="$(api GET "$PROVIDERS_PATH")"
STAFF_MEMORY="$(api GET "$MEMORY_PATH")"
STAFF_BUY="$(buy "$GENERIC_ID" "$NET")"
STAFF_PURCHASES="$(api GET '/rest/v1/purchase?select=id')"

note
SP_N="$(python3 -c "import sys,json;r=json.load(sys.stdin);print(len(r) if isinstance(r,list) else -1)" <<< "$(body "$STAFF_PROVIDERS")" 2>/dev/null)"
SM_N="$(python3 -c "import sys,json;r=json.load(sys.stdin);print(len(r) if isinstance(r,list) else -1)" <<< "$(body "$STAFF_MEMORY")" 2>/dev/null)"
SQ_N="$(python3 -c "import sys,json;r=json.load(sys.stdin);print(len(r) if isinstance(r,list) else -1)" <<< "$(body "$STAFF_PURCHASES")" 2>/dev/null)"
if [[ "$(status "$STAFF_MEMORY")" == "200" && "$SM_N" -ge 1 \
      && "$SP_N" == "2" \
      && "$(status "$STAFF_BUY")" == "200" \
      && "$(status "$STAFF_PURCHASES")" == "200" && "$SQ_N" -ge 1 ]]; then
  ok "a cashier reads 2 providers, $SM_N memory row(s), WRITES a delivery and reads $SQ_N back (0040)"
else
  fail "what a cashier reads has changed, and Comprar's design rests on it:"
  echo "      providers  $(status "$STAFF_PROVIDERS") / $SP_N rows  (expected 200 / 2)"
  echo "      memory     $(status "$STAFF_MEMORY") / $SM_N rows  (expected 200 / at least 1"
  echo "                 since 0040 — ZERO here means the role gate is back on"
  echo "                 purchase_select or purchase_line_select, and Comprar would ask"
  echo "                 her to type a price the app already knows)"
  echo "      record     $(status "$STAFF_BUY")              (expected 200 — no role fence)"
  echo "      purchases  $(status "$STAFF_PURCHASES") / $SQ_N rows  (expected 200 / at least 1"
  echo "                 since 0040 — she may now read back what she recorded)"
  echo "      If a migration has fenced record_purchase itself, canReadMemory and 5g-ii's"
  echo "      empty price box need re-deciding rather than repairing."
fi

# --- 11. the shop next door -------------------------------------------------
signup "purchase-neighbour-$STAMP@example.com"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Otra tienda","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
note
NEIGH_PROVIDERS="$(body "$(api GET "$PROVIDERS_PATH")")"
NEIGH_MEMORY="$(body "$(api GET "$MEMORY_PATH")")"
MINE="$(python3 -c "
import json,sys
rows=json.loads(sys.stdin.read())
print(sum(1 for r in rows if r.get('id') in (sys.argv[1], sys.argv[2])) if isinstance(rows,list) else -1)" \
  "$GENERIC_ID" "$SECOND_ID" <<< "$NEIGH_PROVIDERS" 2>/dev/null)"
NM_N="$(python3 -c "import sys,json;r=json.load(sys.stdin);print(len(r) if isinstance(r,list) else -1)" <<< "$NEIGH_MEMORY" 2>/dev/null)"
if [[ "$MINE" == "0" && "$NM_N" == "0" ]]; then
  ok "the shop next door reads none of this shop's providers and none of its prices"
else
  fail "another workspace saw $MINE of this shop's providers and $NM_N of its prices."
  echo "      provider_select and the memory view are both workspace-scoped; this is the"
  echo "      assertion that would be vacuous under the secret key, which is why it is not."
fi

echo
if (( fails > 0 )); then
  echo "$ran assertion groups ran, $fails failed — the app and the database disagree"
  echo "about what the shop buys and from whom."
  exit 1
fi
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that asserted nothing looks
# like.
if (( ran < 10 )); then
  echo "FAIL: only $ran assertion groups ran, expected 10 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
echo "all $ran assertion groups passed — app/src/api/providers.ts still describes the"
echo "database, record_purchase accepts the payload this app builds, the invoice net"
echo "reaches the ledger unconverted, the memory never crosses providers, and a"
echo "cashier's empty memory is measured rather than assumed."

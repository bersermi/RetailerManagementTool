#!/usr/bin/env bash
# 5h-ii-a-documents-contract — does `app/src/api/documents.ts` still describe the
# database, and does the list every correction is reached from really come back
# with its lines, in order, inside its window?
#
# ⚠️⚠️ THIS CHECK EXISTS FOR FOUR CLAIMS A NODE SUITE CANNOT MAKE, AND EVERY ONE OF
# THEM IS 200-AND-WRONG RATHER THAN RED:
#
#   * **A TO-MANY EMBED OVER A COMPOSITE FOREIGN KEY.** Every embed in this app
#     until now is to-ONE and read FROM the line — `purchase!inner(…)`,
#     `family(…)`. This one starts at the DOCUMENT and asks for its lines, over
#     `purchase_line_header_fk` = `(purchase_id, workspace_id, location_id)` →
#     `purchase (id, workspace_id, location_id)`. A 400 about an ambiguous
#     relationship was the likelier answer and is what this asserts against.
#   * **`::text` INSIDE THAT EMBED.** Nothing in this app had read a money or
#     quantity column out of a nested array. Without the cast PostgREST sends a
#     bare `numeric` as a JSON number, `parseDecimal` refuses a number argument
#     outright, and every amount on this screen reads *Sin dato* — **or worse,
#     `qty_display` reads `3` instead of `3.000` and looks right.**
#     `app/test/api-documents.test.ts` feeds itself strings, so it is green either
#     way.
#   * **`limit` ON THE PARENT COUNTS DOCUMENTS AND DOES NOT TRUNCATE LINES.** If it
#     counted rows after the join, `DOCUMENTS_LIMIT` would silently cut a delivery
#     in half — a document rendered with three of its five lines, which is the one
#     failure on this screen a shopkeeper would act on and could not detect.
#   * **THE LINE ORDER, WHICH IS THE ONE THAT CHANGED THE MODULE'S DESIGN.**
#     Nothing in this schema records the order a shopkeeper keyed her lines in:
#     there is no ordinal column and `created_at` is IDENTICAL across every line of
#     one document (one statement, one `now()`). Left unordered they come back in
#     heap order, which a `VACUUM` or a re-plan reshuffles with nothing going red.
#     So the order is `product_variant(name)` — a **nested** embedded column — and
#     it is spelled `<line table>.order=…`, which is the `{ referencedTable }`
#     form `COSTS_ORDER` documents as a TRAP. **It is a no-op on a to-one embed
#     and it is the correct spelling on a to-many one**, and this check drives the
#     other spelling in the same run so a reader can see which one moves.
#
# WHAT IT ASSERTS, all against a REAL round trip with a real shop, a real catalog,
# real deliveries, real sales, a void and three real people:
#
#   1. Every string is READ OUT OF `app/src/api/documents.ts` — the two column
#      lists are COMPOSED from the module's own four parts rather than retyped.
#      A check that retypes a contract is asserting itself.
#   2. The read the app makes answers 200 for BOTH kinds, with the lines nested.
#   3. ⚠️⚠️ EVERY MONEY AND QUANTITY FIELD COMES BACK AS A JSON **STRING**, read
#      off the wire — on the document AND inside the embed.
#   4. ⚠️ A column the app never asks for never reaches a phone (C8.8, `R13`) —
#      `recorded_at` and `recorded_offline` by name, because that pair is the
#      decision `5h-ii-b` measured: they are what drawing `0021`'s WINDOW on the
#      client would need, and the database is what answers it instead.
#      ⚠️ `created_by`, `qty_base` and `unit_price_net_per_base` were on that list
#      until 2026-09-26 and are now REQUIRED rather than merely permitted.
#   5. ⚠️⚠️ `limit` COUNTS DOCUMENTS: `limit=1` over a three-line delivery answers
#      one document carrying all three.
#   6. ⚠️ The documents come back NEWEST FIRST, by the app's own order.
#   7. ⚠️⚠️ THE LINES COME BACK ALPHABETICAL BY PRODUCT NAME — and the same run
#      drives a read with no line order and shows it answers a DIFFERENT order, so
#      this assertion cannot be a coincidence of the planner.
#   8. ⚠️⚠️ THE WINDOW IS LIVE — and it is asserted with a NARROW one rather than an
#      old document, because **`record_purchase` CANNOT WRITE AN OLD DOCUMENT**:
#      `0018:222` clamps `occurred_at` to `greatest(least(p_occurred_at, now()),
#      now() - 72h)`, so nothing this app writes is ever more than three days old on
#      the day it is written and `DOCUMENTS_DAYS` = 7 can never exclude it. A
#      fixture asking for nine days back lands at 72 hours, silently INSIDE the
#      window — which is what this check found on its first run, by going red. So
#      the app's own window is asserted to keep everything, and a one-hour window is
#      driven in the same run and asserted to keep none of it.
#   9. ⚠️⚠️ A VOIDED DOCUMENT AND ITS REVERSAL ARE **BOTH ON THE WIRE**, which is
#      what makes `documentsFrom`'s void rule load-bearing rather than decorative.
#      *"Just one line, clean"* is the client's doing and this proves the client is
#      the only thing doing it.
#  10. ⚠️⚠️ AN EMPLEADA READS BOTH KINDS at her own location — `0040` for the
#      purchases, `0003` for the sales, neither role-gated.
#  11. Another shop reads none of it.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the arithmetic and the words. Which documents stand,
# what each is worth, what a line says and which sentence replaces the list are
# `app/test/api-documents.test.ts`'s. This file is about the WIRE: the names, the
# shapes, the types, the ORDERS, the LIMIT, the WINDOW and the fences.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5h-ii-a-documents-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/documents.ts}"
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
num() { sed -n "s/^export const $1 = \([0-9]*\);.*/\1/p" "$CONTRACT" | head -1; }
# ⚠️ A CONSTANT WRITTEN OVER TWO LINES IS READ DIFFERENTLY — the arrangement
# `5g-i`, `5g-iii` and `5f.5` all made for their column lists, and for their
# reason: the alternative is reformatting the module to suit this check.
wrapped() { sed -n "/^export const $1 =/,/;/p" "$CONTRACT" | sed -n "s/.*'\([^']*\)'.*/\1/p" | head -1; }
# ⚠️ A `Record` FIELD. `DOCUMENTS_LINE_TABLE` is two lines of `kind: 'table',`
# inside one declaration, so the block is bounded first and the field read second.
record() { # constant field -> value
  sed -n "/^export const $1/,/^};/p" "$CONTRACT" | sed -n "s/^  $2: '\([^']*\)',.*/\1/p" | head -1
}
# ⚠️ `\(.*\)` AND NEVER `\(true\|false\)`: `\|` IS A GNU EXTENSION AND macOS SHIPS
# BSD sed, so the alternation reads as a literal and this returns nothing. It did,
# on the first run — the same class of trap `plan-handover.sh` recorded about
# `mapfile`. The pattern below is `5f.5`'s, which is portable and proven.
boolean() { sed -n "s/^export const $1 = \(.*\);.*/\1/p" "$CONTRACT" | head -1; }

DOCUMENTS_HEAD_COLUMNS="$(wrapped DOCUMENTS_HEAD_COLUMNS)"
DOCUMENTS_PROVIDER_COLUMN="$(str DOCUMENTS_PROVIDER_COLUMN)"
DOCUMENTS_LINE_COLUMNS="$(wrapped DOCUMENTS_LINE_COLUMNS)"
DOCUMENTS_ORDER="$(str DOCUMENTS_ORDER)"
DOCUMENTS_TIEBREAK="$(str DOCUMENTS_TIEBREAK)"
DOCUMENTS_LINE_ORDER="$(str DOCUMENTS_LINE_ORDER)"
DOCUMENTS_LIMIT="$(num DOCUMENTS_LIMIT)"
DOCUMENTS_DAYS="$(num DOCUMENTS_DAYS)"
DOCUMENTS_ORDER_ASCENDING="$(boolean DOCUMENTS_ORDER_ASCENDING)"
DOCUMENTS_LINE_ORDER_ASCENDING="$(boolean DOCUMENTS_LINE_ORDER_ASCENDING)"
PURCHASE_TABLE="$(record DOCUMENTS_TABLE purchase)"
SALE_TABLE="$(record DOCUMENTS_TABLE sale)"
PURCHASE_LINE_TABLE="$(record DOCUMENTS_LINE_TABLE purchase)"
SALE_LINE_TABLE="$(record DOCUMENTS_LINE_TABLE sale)"

note
MISSING=""
for name in DOCUMENTS_HEAD_COLUMNS DOCUMENTS_PROVIDER_COLUMN DOCUMENTS_LINE_COLUMNS \
            DOCUMENTS_ORDER DOCUMENTS_TIEBREAK DOCUMENTS_LINE_ORDER DOCUMENTS_LIMIT \
            DOCUMENTS_DAYS DOCUMENTS_ORDER_ASCENDING DOCUMENTS_LINE_ORDER_ASCENDING \
            PURCHASE_TABLE SALE_TABLE PURCHASE_LINE_TABLE SALE_LINE_TABLE; do
  eval "value=\$$name"
  [[ -n "$value" ]] || MISSING="$MISSING $name"
done
if [[ -n "$MISSING" ]]; then
  fail "could not read the documents contract out of $CONTRACT:$MISSING"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi

direction() { case "$1" in true) echo asc ;; false) echo desc ;; *) echo '?' ;; esac; }
DOC_DIRECTION="$(direction "$DOCUMENTS_ORDER_ASCENDING")"
LINE_DIRECTION="$(direction "$DOCUMENTS_LINE_ORDER_ASCENDING")"
if [[ "$DOC_DIRECTION" == '?' || "$LINE_DIRECTION" == '?' ]]; then
  fail "an order direction is neither true nor false: documents=$DOCUMENTS_ORDER_ASCENDING lines=$DOCUMENTS_LINE_ORDER_ASCENDING"
  exit 1
fi

# ⚠️⚠️ THE COLUMN LISTS ARE **COMPOSED** FROM THE MODULE'S OWN PARTS, exactly as
# `DOCUMENTS_COLUMNS` composes them. That is why this check does not try to parse
# a template literal out of TypeScript — and why it cannot drift from the app.
PURCHASE_COLUMNS="$DOCUMENTS_HEAD_COLUMNS,$DOCUMENTS_PROVIDER_COLUMN,$PURCHASE_LINE_TABLE($DOCUMENTS_LINE_COLUMNS)"
SALE_COLUMNS="$DOCUMENTS_HEAD_COLUMNS,$SALE_LINE_TABLE($DOCUMENTS_LINE_COLUMNS)"
WIRE_ORDER="$DOCUMENTS_ORDER.$DOC_DIRECTION,$DOCUMENTS_TIEBREAK.$DOC_DIRECTION"

# ⚠️⚠️ THE SHAPE OF THE TWO ORDERS IS ASSERTED BEFORE THEIR EFFECT IS, and they
# are asserted to be OPPOSITE shapes — which is the one thing about this module a
# reader is most likely to "correct". The document order is the parent's own
# column, so a bare name is right; the LINE order reaches through an embed, so a
# bare name is a 400.
note
case "$DOCUMENTS_ORDER" in
  *"("*) fail "DOCUMENTS_ORDER is '$DOCUMENTS_ORDER', a table(column) expression. This read"
         echo "      starts AT the document, so \`occurred_at\` is a plain column of the table"
         echo "      being selected — \`COSTS_ORDER\`'s ceremony belongs to a read that starts"
         echo "      at the LINE, and here it is a 400."
         exit 1 ;;
  *) ok "the documents are ordered by a plain column of their own table — $DOCUMENTS_ORDER.$DOC_DIRECTION" ;;
esac

note
case "$DOCUMENTS_LINE_ORDER" in
  *"("*")") ok "the lines are ordered by an embedded expression — $DOCUMENTS_LINE_ORDER.$LINE_DIRECTION" ;;
  *) fail "DOCUMENTS_LINE_ORDER is '$DOCUMENTS_LINE_ORDER', a bare column."
     echo "      \`purchase_line\` has no name of its own — the product's name lives one"
     echo "      embed further out — so a bare column here answers 400/42703."
     echo "      ⚠️⚠️ AND THERE IS NOTHING ELSE TO ORDER BY: no ordinal column exists and"
     echo "      \`created_at\` is IDENTICAL across every line of one document, so an"
     echo "      unordered embed returns heap order and reshuffles on a re-plan."
     exit 1 ;;
esac

ok "read from $CONTRACT: limit=$DOCUMENTS_LIMIT days=$DOCUMENTS_DAYS order=$WIRE_ORDER"
ok "purchase columns=$PURCHASE_COLUMNS"
ok "sale columns=$SALE_COLUMNS"

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
# assertions 10 and 11 would pass vacuously, for the reason supabase/README.md
# gives about the `postgres` superuser.
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

# ⚠️ SIGNUP IS RETRIED. GoTrue rate-limits it, and a rate-limited signup returns an
# empty body rather than a 429 — which looks exactly like a broken harness.
signup() { # email -> sets TOKEN
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"documents-probe-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  echo "      GoTrue rate-limits signup and answers with an EMPTY BODY when it does."
  exit 1
}

STAMP="$$-$(date +%s)"

# --- the shop, its catalog, its supplier and its people --------------------
signup "doc-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Lo último 5h-ii-a","p_prices_include_tax":true,"p_location_name":null}')"
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

# ⚠️ THE UNIT IS AN ARGUMENT, so the fixture can carry TWO DIMENSIONS. `record_sale`
# and `record_purchase` both refuse a cross-dimension conversion — *"unit 'pza' is
# measured in 'pza', but the variant is stored in 'g'"*, `22023`, §2.5 — which this
# harness discovered by selling bread by the piece against a gram-based variant on
# its first run. ⚠️ **It is worth carrying both anyway**: the screen renders the
# unit's own word, and `3 pza` and `1.500 kg` are the two shapes a shopkeeper sees.
variant() { # name base-unit -> id
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
# ⚠️⚠️ THREE PRODUCTS WHOSE NAMES SORT A, B, C — AND THEY ARE CREATED AND KEYED IN
# A DIFFERENT ORDER ON PURPOSE. Assertion 7 is about the LINE order, and a
# fixture keyed alphabetically is green whether the order is applied or not:
# insertion order and alphabetical order would be the same list. ⚠️ **That is the
# vacuity `5f.5`'s own fixture comment records, in the other direction.**
AGUACATE="$(variant 'Aguacate Hass' g kg)"
BOLILLO="$(variant 'Bolillo' pza pza)"
CEBOLLA="$(variant 'Cebolla blanca' g kg)"
[[ -n "$AGUACATE" && -n "$BOLILLO" && -n "$CEBOLLA" ]] || { echo "FAIL: could not create three variants"; exit 1; }

GENERIC_ID="$(first id "$(body "$(api GET '/rest/v1/provider?select=id&is_generic=is.true')")")"
[[ -n "$GENERIC_ID" ]] || { echo "FAIL: the new shop has no generic provider"; exit 1; }
PROVIDER_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Bodega Hernández"}))' "$WORKSPACE_ID")"
PROVIDER_ID="$(first id "$(body "$(api POST '/rest/v1/provider?select=id' "$PROVIDER_JSON")")")"
[[ -n "$PROVIDER_ID" ]] || { echo "FAIL: could not create a named provider"; exit 1; }

# --- the deliveries and the sales ------------------------------------------
# ⚠️⚠️ `p_recorded_offline` IS TRUE ON EVERY ONE so `0018:221` and `0016` honour
# `p_occurred_at`. Online they take `now()` for all of them and assertions 6 and 8
# would be comparing instants that are the same instant — green, and vacuous.
buy() { # id hours-ago provider lines-json -> response
  local payload
  payload="$(python3 -c '
import json, sys
print(json.dumps({
  "p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_provider_id": sys.argv[3],
  "p_occurred_at": sys.argv[4], "p_recorded_offline": True,
  "p_lines": json.loads(sys.argv[5])}))' \
    "$1" "$LOCATION_ID" "$3" "$(ago "$2")" "$4")"
  api POST /rest/v1/rpc/record_purchase "$payload"
}

# ⚠️⚠️ `unit_price_GROSS_per_base` ON A SALE AND `unit_price_NET_per_base` ON A
# PURCHASE. `0016:59` requires the gross figure — a sale is keyed at the shelf
# price — and reusing the purchase spelling answers 400/`22023`. **That is not a
# guess: this harness made the mistake on its first run** and it is recorded here
# rather than in a commit message.
sell() { # id hours-ago lines-json -> response
  local payload
  payload="$(python3 -c '
import json, sys
print(json.dumps({
  "p_id": sys.argv[1], "p_location_id": sys.argv[2],
  "p_occurred_at": sys.argv[3], "p_recorded_offline": True,
  "p_lines": json.loads(sys.argv[4])}))' \
    "$1" "$LOCATION_ID" "$(ago "$2")" "$3")"
  api POST /rest/v1/rpc/record_sale "$payload"
}

TOKEN="$OWNER_TOKEN"

# ⚠️ THE THREE-LINE DELIVERY, KEYED CEBOLLA → AGUACATE → BOLILLO. Assertions 5 and
# 7 both read it: three lines under one document, and alphabetical is neither the
# keyed order nor the reverse of it.
THREE_LINE_ID="$(uuid)"
THREE_LINES="$(python3 -c '
import json, sys
print(json.dumps([
  {"variant_id": sys.argv[1], "qty_display": "1",   "qty_display_unit": "kg", "unit_price_net_per_base": "0.030000"},
  {"variant_id": sys.argv[2], "qty_display": "2",   "qty_display_unit": "kg", "unit_price_net_per_base": "0.020000"},
  {"variant_id": sys.argv[3], "qty_display": "6", "qty_display_unit": "pza", "unit_price_net_per_base": "1.500000"}]))' \
  "$CEBOLLA" "$AGUACATE" "$BOLILLO")"
FIRST="$(buy "$THREE_LINE_ID" 20 "$PROVIDER_ID" "$THREE_LINES")"
note
if [[ "$(status "$FIRST")" == "200" ]]; then
  ok "record_purchase accepts a dated, offline-recorded three-line delivery"
else
  fail "record_purchase refused the three-line delivery: $(body "$FIRST")"
  exit 1
fi

ONE_LINE="$(python3 -c '
import json, sys
print(json.dumps([{"variant_id": sys.argv[1], "qty_display": "4", "qty_display_unit": "kg",
                   "unit_price_net_per_base": "0.025000"}]))' "$AGUACATE")"
# The newest delivery — 2 hours ago, from the generic provider.
NEWEST_ID="$(uuid)"
buy "$NEWEST_ID" 2 "$GENERIC_ID" "$ONE_LINE" > /dev/null
# The one that gets voided.
VOIDED_ID="$(uuid)"
buy "$VOIDED_ID" 6 "$PROVIDER_ID" "$ONE_LINE" > /dev/null
# ⚠️⚠️ THERE IS DELIBERATELY NO out-of-window FIXTURE, AND THE REASON IS A CLAMP
# THIS CHECK FOUND BY GOING RED. `0018:222` sets
# `greatest(least(coalesce(p_occurred_at, now()), now()), now() - interval '72
# hours')`, so **a delivery keyed as nine days old LANDS AT SEVENTY-TWO HOURS** —
# inside a seven-day window, with a 200 and no complaint. Nothing this app can write
# is ever outside `DOCUMENTS_DAYS` on the day it is written; the window only ever
# excludes documents as time passes, and a check cannot manufacture one. **Assertion
# 8 drives a NARROW window instead** — see below.

SALE_LINES="$(python3 -c '
import json, sys
print(json.dumps([
  {"variant_id": sys.argv[1], "qty_display": "0.5", "qty_display_unit": "kg", "unit_price_gross_per_base": "0.090000"},
  {"variant_id": sys.argv[2], "qty_display": "3",   "qty_display_unit": "pza", "unit_price_gross_per_base": "2.500000"}]))' \
  "$CEBOLLA" "$BOLILLO")"
SALE_ID="$(uuid)"
SOLD="$(sell "$SALE_ID" 3 "$SALE_LINES")"
note
if [[ "$(status "$SOLD")" == "200" ]]; then
  ok "record_sale accepts a dated, offline-recorded two-line sale"
else
  fail "record_sale refused the sale: $(body "$SOLD")"
  echo "      ⚠️ A SALE LINE NEEDS unit_price_GROSS_per_base (0016:59), not the NET"
  echo "      spelling record_purchase takes. The wrong one answers 22023."
  exit 1
fi

# --- the void, which assertion 9 reads -------------------------------------
VOID_OUT="$(api POST /rest/v1/rpc/void_transaction \
  "{\"p_kind\":\"purchase\",\"p_id\":\"$VOIDED_ID\",\"p_reason\":\"5h-ii-a fixture\"}")"
note
if [[ "$(status "$VOID_OUT")" == "200" ]]; then
  ok "void_transaction cancelled a delivery — it is granted to authenticated (0021:448)"
else
  fail "void_transaction refused: $(status "$VOID_OUT") $(body "$VOID_OUT")"
  echo "      ⚠️⚠️ 5h-i MEASURED THIS GRANT — proacl reads authenticated=X/postgres."
  echo "      If it has been revoked, 5h-ii-b has no write path at all and the plan's"
  echo "      claim that it ships no migration is false."
  exit 1
fi

# --- 2, 3, 4, 6, 9. the read the app actually makes, for both kinds ---------
read_path() { # table columns [extra] -> path
  echo "/rest/v1/$1?select=$2&$3order=$WIRE_ORDER&$4.order=$DOCUMENTS_LINE_ORDER.$LINE_DIRECTION&limit=$DOCUMENTS_LIMIT"
}
# ⚠️⚠️ THE WINDOW IS COMPUTED THE WAY `sinceISO` COMPUTES IT — LOCAL midnight, days
# back — so this check drives the app's own window rather than a UTC approximation
# of it. A UTC midnight here differs by six hours on the owner's Mac and by none in
# CI, and the assertion would be green in one place and red in the other
# ([[local-time-tests-need-a-pinned-tz]]).
#
# ⚠️⚠️ AND IT PRINTS THE `Z` FORM, NEVER `+00:00`, WHICH IS WHAT `toISOString()`
# EMITS AND THEREFORE WHAT THE APP SENDS. In a query string a literal `+` decodes
# to a SPACE and Postgres answers 400 / 22007 — *invalid input syntax for type
# timestamp with time zone* — on a value that reads as perfectly well formed in the
# failure message. This check did exactly that on its first run, and it looked like
# the composite embed failing rather than like a URL.
#
# ⚠️⚠️ THE PYTHON IS IN A **SINGLE-QUOTED** ARGUMENT AND EVERY COMMENT ABOVE IT IS
# SHELL, WHICH IS NOT TIDINESS. A backtick inside a double-quoted `python3 -c "…"`
# is COMMAND SUBSTITUTION: this block was first written with backticked prose inside
# the double quotes, bash ran `Z` and `+00:00` as commands, `SINCE` came out
# mangled, and **the window silently stopped filtering — so the ORDER assertion
# went red for a reason it does not name.**
# [[apostrophe-breaks-heredoc-in-subshell]] is the same family. Keep prose out of an
# interpolated argument.
SINCE="$(python3 -c '
import datetime, sys
days = int(sys.argv[1])
now = datetime.datetime.now().astimezone()
midnight = now.replace(hour=0, minute=0, second=0, microsecond=0) - datetime.timedelta(days=days)
utc = midnight.astimezone(datetime.timezone.utc)
print(utc.isoformat().replace("+00:00", "Z"))' "$DOCUMENTS_DAYS")"
WINDOW="$DOCUMENTS_ORDER=gte.$SINCE&"

PURCHASE_PATH="$(read_path "$PURCHASE_TABLE" "$PURCHASE_COLUMNS" "$WINDOW" "$PURCHASE_LINE_TABLE")"
SALE_PATH="$(read_path "$SALE_TABLE" "$SALE_COLUMNS" "$WINDOW" "$SALE_LINE_TABLE")"

PURCHASES="$(api GET "$PURCHASE_PATH")"
note
if [[ "$(status "$PURCHASES")" == "200" ]]; then
  ok "the purchase read answers 200 — the TO-MANY embed over the COMPOSITE fk resolves"
else
  fail "the purchase read answered $(status "$PURCHASES"): $(body "$PURCHASES")"
  echo '      purchase_line_header_fk is (purchase_id, workspace_id, location_id) →'
  echo '      purchase (id, workspace_id, location_id), read FROM THE PARENT. Every other'
  echo '      embed in this app is to-ONE and read from the line, so this is the first of'
  echo '      its kind here and a 400 about an ambiguous relationship is the likely shape.'
  exit 1
fi
PURCHASES_FILE="$(stash purchases "$PURCHASES")"

SALES="$(api GET "$SALE_PATH")"
note
if [[ "$(status "$SALES")" == "200" ]]; then
  ok "the sale read answers 200 — one module, two tables, the same shape"
else
  fail "the sale read answered $(status "$SALES"): $(body "$SALES")"
  exit 1
fi
SALES_FILE="$(stash sales "$SALES")"

# ⚠️⚠️ THREE NAMES LEFT THESE LISTS ON 2026-09-26 WHEN `5h-ii-b` WIDENED THE READ,
# AND EVERY ONE OF THEM MOVED TO `wanted_*` RATHER THAN SIMPLY GOING. `created_by`
# is read so `mayCorrect` can hide a button a cashier cannot use — it is never
# rendered, so `today.ts`'s §2.7 refusal is untouched — and `qty_base` and
# `unit_price_net_per_base` are what `prefillOf` puts back in the cart. **A column
# this check stops banning must start being required**, or the assertion becomes
# *anything goes*.
#
# ⚠️ `recorded_at` AND `recorded_offline` ARE STILL BANNED AND THAT IS THE
# SHARPEST PAIR HERE: they are exactly what a client would need to draw the WINDOW
# half of `0021`'s fence, and drawing it on this side would be a second answer to
# *may she void this*. The database answers it, as `TD003`.
BANNED='recorded_offline,reversal_reason,payload_hash,recorded_at,workspace_id,location_id'
LINE_BANNED='tax_rate,expiry_date,created_at,purchase_id,sale_id,workspace_id,location_id'

cat > "$SCRATCH/shape.py" <<'PY'
import json, sys
path, kind, line_key, banned, line_banned = sys.argv[1:6]
banned = banned.split(',')
line_banned = line_banned.split(',')
wanted_doc = {'id', 'occurred_at', 'total_net', 'total_tax', 'reversal_of',
              'created_by', line_key}
if kind == 'purchase':
    wanted_doc.add('provider_id')
wanted_line = {'id', 'variant_id', 'qty_base', 'qty_display', 'qty_display_unit',
               'unit_price_net_per_base', 'line_net', 'tax_amount', 'product_variant'}

try:
    rows = json.load(open(path))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list):
    print('the %s read came back as an error: %r' % (kind, rows)); raise SystemExit
if not rows:
    print('the %s read came back EMPTY, so every assertion over it below would be '
          'vacuous — the fixture recorded documents inside the window' % kind)
    raise SystemExit

for row in rows:
    if set(row) != wanted_doc:
        print('the %s carried %r; the app asks for exactly %r'
              % (kind, sorted(row), sorted(wanted_doc))); raise SystemExit
    reached = [c for c in banned if c in row]
    if reached:
        print('%s reached the phone on a %s — a column the app never asks for is a '
              'column that never reaches a phone (C8.8, R13). ⚠️⚠️ recorded_at and '
              'recorded_offline are the DECISION here and 5h-ii-b measured it: they '
              'are what a client would need to draw the WINDOW half of 0021\'s fence, '
              'which is measured from recorded_at on an offline write and occurred_at '
              'otherwise — a second answer to "may she void this", wrong in the '
              'direction of hiding a button she is allowed to press' % (reached, kind))
        raise SystemExit

    # ⚠️⚠️ ASSERTION 3 — THE CASTS ON THE DOCUMENT, READ OFF THE WIRE.
    for field in ('total_net', 'total_tax'):
        value = row[field]
        if not isinstance(value, str):
            print('%s arrived as %s (%r) rather than as a string — the ::text cast is '
                  'gone. parseDecimal refuses a number argument outright and every '
                  'amount on this screen would read "Sin dato" (R5)'
                  % (field, type(value).__name__, value)); raise SystemExit

    lines = row[line_key]
    if not isinstance(lines, list):
        print('the lines came back as %r rather than as an ARRAY — a to-many embed nests '
              'a list, and a to-one one nests an object. If this is an object the read '
              'has silently become a different question' % (lines,)); raise SystemExit
    if not lines:
        print('a %s came back with NO lines; record_purchase and record_sale both refuse '
              'an empty array (0016:183), so an empty embed means the join stopped '
              'resolving' % kind); raise SystemExit

    for one in lines:
        if set(one) != wanted_line:
            print('the line carried %r; the app asks for exactly %r'
                  % (sorted(one), sorted(wanted_line))); raise SystemExit
        reached = [c for c in line_banned if c in one]
        if reached:
            print('%s reached the phone on a line (C8.8, R13). ⚠️ tax_rate and '
                  'expiry_date are the live decisions now that 5h-ii-b has taken '
                  'qty_base and unit_price_net_per_base: tax_rate is what recovering a '
                  'sale\'s GROSS price would need, and that row decided a corrected '
                  'sale is re-priced at the shelf instead' % reached); raise SystemExit

        # ⚠️⚠️ ASSERTION 3, INSIDE THE EMBED — THE CLAIM THIS WHOLE CHECK EXISTS
        # FOR. Nothing in this app had read a cast column out of a nested array.
        # ⚠️ `qty_base` AND `unit_price_net_per_base` JOINED THIS LIST WITH
        # `5h-ii-b`, AND THEY ARE THE TWO THE SUITE CANNOT SEE AT ALL: nothing
        # renders either, so an uncast `qty_base` would arrive as a double and
        # `prefillOf` would put a rounded quantity into a cart about to be
        # re-recorded — a wrong number in the ledger, with no symptom on screen.
        for field in ('qty_base', 'qty_display', 'unit_price_net_per_base',
                      'line_net', 'tax_amount'):
            value = one[field]
            if not isinstance(value, str):
                print('%s arrived as %s (%r) INSIDE THE EMBED rather than as a string — '
                      'the ::text cast does not survive a to-many embed, or has been '
                      'dropped. ⚠️ On qty_display the failure is not even visible: 3.000 '
                      'becomes the number 3 and the screen looks right (R5)'
                      % (field, type(value).__name__, value)); raise SystemExit

        product = one['product_variant']
        if not isinstance(product, dict) or 'name' not in product:
            print('the line\'s product came back as %r rather than as an object with a '
                  'name — that embed is BOTH the word a shopkeeper reads and the key the '
                  'lines are sorted by' % (product,)); raise SystemExit

print('ok — %d document(s), lines nested as arrays, every cast field a string, '
      'nothing unasked-for' % len(rows))
PY
verdict "a purchase carries exactly what the contract asks for, lines included" \
  "$SCRATCH/shape.py" "$PURCHASES_FILE" purchase "$PURCHASE_LINE_TABLE" "$BANNED" "$LINE_BANNED"
verdict "a sale carries exactly the same shape, minus the provider" \
  "$SCRATCH/shape.py" "$SALES_FILE" sale "$SALE_LINE_TABLE" "$BANNED" "$LINE_BANNED"

# --- 6, 8, 9. the order, the window, and both halves of the void -----------
# ⚠️⚠️ THE NARROW WINDOW, DRIVEN IN THE SAME RUN. Without it "the window is applied"
# is unfalsifiable here: every fixture document is inside the app's seven days
# (see the clamp above), so the app's own read would be identical with no filter at
# all. A one-hour window must keep NONE of them.
HOUR_AGO="$(python3 -c '
import datetime
print((datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)).isoformat().replace("+00:00", "Z"))')"
NARROW_FILE="$(stash narrow "$(api GET "/rest/v1/$PURCHASE_TABLE?select=$PURCHASE_COLUMNS&$DOCUMENTS_ORDER=gte.$HOUR_AGO&order=$WIRE_ORDER&${PURCHASE_LINE_TABLE}.order=$DOCUMENTS_LINE_ORDER.$LINE_DIRECTION&limit=$DOCUMENTS_LIMIT")")"

cat > "$SCRATCH/documents.py" <<'PY'
import json, sys
path, narrow_path, line_key, newest, voided, three = sys.argv[1:7]
rows = json.load(open(path))
ids = [r['id'] for r in rows]

# ⚠️⚠️ ASSERTION 6 — NEWEST FIRST, AND *NEWEST* IS THE REVERSAL. `0021:316` stamps a
# compensating document with `v_now` — the moment of the VOID, not the moment of the
# document it cancels — so a void written seconds ago is the newest `purchase` in the
# shop. **This check asserted the 2-hour delivery and went red on correct
# behaviour**, which is the ordinary way an expectation written from the fixture
# instead of from the migration fails. ⚠️ It is also the property `takingsFrom` leans
# on: a sale voided the next day takes the money off TOMORROW.
reversals = [r['id'] for r in rows if r['reversal_of'] == voided]
if len(reversals) != 1:
    print('expected exactly one document whose reversal_of points at the voided '
          'delivery, found %d. <kind>_one_reversal_idx makes a document reversible at '
          'most once' % len(reversals)); raise SystemExit
if not ids or ids[0] != reversals[0]:
    print('the newest document should be the REVERSAL — 0021 stamps it at the moment of '
          'the void — and the read returned %r first. The documents are not coming back '
          'newest-first, so the limit would drop the wrong end of the list'
          % (ids[0] if ids else None)); raise SystemExit

# ⚠️ THE 2-HOUR DELIVERY IS NEXT, which is what makes the line above an ORDER
# assertion rather than a statement about one row.
if len(ids) < 2 or ids[1] != newest:
    print('after the reversal the newest delivery is the 2-hour-old one; the read '
          'returned %r second' % (ids[1] if len(ids) > 1 else None)); raise SystemExit

# ⚠️ ASSERTED AGAINST A CALENDAR AND NOT AGAINST THE ARRAY'S OWN ORDER
# ([[assert-against-a-calendar-not-the-array]]): the two lines above compare against
# ids the fixture chose, and this one is the weaker, self-consistency half.
instants = [r['occurred_at'] for r in rows]
if instants != sorted(instants, reverse=True):
    print('the documents came back out of order: %r' % instants); raise SystemExit

# ⚠️⚠️ ASSERTION 9 — BOTH HALVES OF THE VOID ARE ON THE WIRE. This is what makes
# `documentsFrom`'s void rule load-bearing: the database hides neither, so *"just one
# line, clean"* is entirely the client's doing.
if voided not in ids:
    print('the VOIDED delivery is not on the wire. The database hides neither half of a '
          'reversal — documentsFrom drops both — so if the server has started filtering '
          'them the client rule is now dead code and nothing would say so')
    raise SystemExit
if three not in ids:
    print('the three-line delivery is not on the wire, so the assertion below has '
          'nothing to read'); raise SystemExit

# ⚠️ AND THE REVERSAL CARRIES NEGATED TOTALS, which is what makes a plain sum over
# the table already net of voids (0021) — the property takingsFrom leans on.
mirror = [r for r in rows if r['id'] == reversals[0]][0]
original = [r for r in rows if r['id'] == voided][0]
if not mirror['total_net'].startswith('-') or original['total_net'].startswith('-'):
    print('the reversal should carry NEGATED totals and the original positive ones; got '
          '%r and %r' % (mirror['total_net'], original['total_net'])); raise SystemExit

# ⚠️⚠️ ASSERTION 8 — THE WINDOW IS LIVE. Every fixture document is inside the app's
# seven days because 0018 clamps at 72 hours, so the app's own window cannot exclude
# anything and this narrow read is what proves the filter is applied at all.
narrow = json.load(open(narrow_path))
if not isinstance(narrow, list):
    print('the one-hour read came back as an error: %r' % (narrow,)); raise SystemExit
leaked = [r['id'] for r in narrow if r['id'] in (newest, voided, three)]
if leaked:
    print('a one-hour window returned %r — documents that are 2, 6 and 20 hours old. The '
          'occurred_at filter is not being applied, and since 0018 clamps every fixture '
          'to 72 hours the seven-day window would look identical with no filter at all'
          % (leaked,)); raise SystemExit

print('ok — the reversal first, then the 2-hour delivery, both halves of the void on the '
      'wire with the mirror negated, and a one-hour window keeps none of it')
PY
verdict "newest first, the window live, and both halves of the void on the wire" \
  "$SCRATCH/documents.py" "$PURCHASES_FILE" "$NARROW_FILE" "$PURCHASE_LINE_TABLE" \
  "$NEWEST_ID" "$VOIDED_ID" "$THREE_LINE_ID"

# --- 7. the lines come back alphabetical, and the other spelling does not ---
# ⚠️⚠️ THE SAME READ WITH NO LINE ORDER AT ALL, DRIVEN IN THE SAME RUN. Without it
# this assertion cannot tell *the order was applied* from *the planner happened to
# agree*, which is the coincidence `COSTS_ORDER`'s own check records paying for.
UNORDERED="$(api GET "/rest/v1/$PURCHASE_TABLE?select=$PURCHASE_COLUMNS&${WINDOW}order=$WIRE_ORDER&limit=$DOCUMENTS_LIMIT")"
UNORDERED_FILE="$(stash unordered "$UNORDERED")"

cat > "$SCRATCH/lines.py" <<'PY'
import json, sys
ordered_path, unordered_path, line_key, three = sys.argv[1:5]

def lines_of(path, doc_id):
    for row in json.load(open(path)):
        if row['id'] == doc_id:
            return row[line_key]
    return None

got = lines_of(ordered_path, three)
if got is None:
    print('the three-line delivery is not in the ordered read'); raise SystemExit
if len(got) != 3:
    print('the three-line delivery came back with %d lines' % len(got)); raise SystemExit

names = [one['product_variant']['name'] for one in got]
if names != sorted(names):
    print('the lines came back %r, which is not alphabetical. ⚠️⚠️ THE ORDER IS THE ONLY '
          'THING MAKING THIS LIST REPRODUCIBLE: no ordinal column exists and created_at '
          'is IDENTICAL across every line of one document, so an unordered embed returns '
          'heap order and a VACUUM or a re-plan reshuffles it with nothing going red — a '
          'shopkeeper comparing this screen to a paper note would watch the rows move'
          % names)
    raise SystemExit

# ⚠️ THE FIXTURE KEYED THEM CEBOLLA → AGUACATE → BOLILLO, so alphabetical is
# neither the keyed order nor its reverse. If those coincided this assertion would
# be green on an order that was never applied.
if names == ['Cebolla blanca', 'Aguacate Hass', 'Bolillo']:
    print('the lines came back in the KEYED order, which happens to be what this fixture '
          'was built to distinguish from alphabetical'); raise SystemExit

bare = lines_of(unordered_path, three)
if bare is None:
    print('the unordered read did not return the three-line delivery, so the contrast '
          'this assertion needs cannot be drawn'); raise SystemExit
bare_names = [one['product_variant']['name'] for one in bare]
if bare_names == names:
    print('the read with NO line order returned the same order as the read with one, so '
          'this run cannot tell the applied order from the planner agreeing with it. '
          'That is a coincidence, not a falsification — the fixture keys the lines in a '
          'non-alphabetical order precisely to avoid it, so if this fires the heap order '
          'has changed and the fixture needs a third arrangement')
    raise SystemExit

print('ok — %r, and the read with no line order returned %r instead'
      % (names, bare_names))
PY
verdict "the lines come back alphabetical, and an unordered read does not" \
  "$SCRATCH/lines.py" "$PURCHASES_FILE" "$UNORDERED_FILE" "$PURCHASE_LINE_TABLE" "$THREE_LINE_ID"

# --- 5. the limit counts DOCUMENTS and does not truncate lines --------------
# ⚠️⚠️ DRIVEN AT limit=1 AND NOT AT DOCUMENTS_LIMIT, DELIBERATELY. What can break is
# whether the limit counts parents or joined rows, and that is visible at one row.
# Recording sixty-one deliveries would buy nothing this cannot see. The app's own
# limit is on the wire in every read above.
# ⚠️ THE DELIVERY IS FOUND BY **ID** AND NOT BY AN EQUALITY ON ITS INSTANT: a
# microsecond of drift between `ago 20` here and the value the RPC stored would
# make the read empty, which is a fixture that proves nothing.
SLICED="$(api GET "/rest/v1/$PURCHASE_TABLE?select=$PURCHASE_COLUMNS&id=eq.$THREE_LINE_ID&${PURCHASE_LINE_TABLE}.order=$DOCUMENTS_LINE_ORDER.$LINE_DIRECTION&limit=1")"
SLICED_FILE="$(stash sliced "$SLICED")"

cat > "$SCRATCH/limit.py" <<'PY'
import json, sys
path, line_key = sys.argv[1], sys.argv[2]
rows = json.load(open(path))
if not isinstance(rows, list):
    print('the limited read came back as an error: %r' % (rows,)); raise SystemExit
if len(rows) != 1:
    print('limit=1 over one document returned %d rows' % len(rows)); raise SystemExit
lines = rows[0][line_key]
if len(lines) != 3:
    print('limit=1 returned a delivery with %d of its 3 lines. ⚠️⚠️ THE LIMIT IS '
          'COUNTING JOINED ROWS RATHER THAN DOCUMENTS, which means DOCUMENTS_LIMIT '
          'silently cuts deliveries in half — a document rendered with some of its lines '
          'is the one failure on this screen a shopkeeper would act on and could not '
          'detect' % len(lines)); raise SystemExit
print('ok — one document, all three of its lines')
PY
verdict "the parent limit counts DOCUMENTS and never truncates their lines" \
  "$SCRATCH/limit.py" "$SLICED_FILE" "$PURCHASE_LINE_TABLE"

# --- 10. an Empleada reads both kinds --------------------------------------
# ⚠️⚠️ THIS IS THE ASSERTION THAT KEEPS THE LIST REACHABLE BY THE PERSON WHO MAKES
# THE MISTAKE. `sale_select` / `sale_line_select` admit any member at their own
# location with no role gate (`0003`), and `0040` made the purchase pair match on
# 2026-09-25. Before that her purchase read was 200-and-EMPTY — never a 403 — so
# this screen would have been blank for exactly her, with nothing going red.
# ⚠️ THE STAFF INVITE NAMES A LOCATION, which `0028` requires and §2.7 is the
# reason for, and it makes this sharper: the rows she reads come THROUGH
# `my_locations()` rather than past it.
STAFF_INVITE_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "doc-staff-$STAMP@example.com" "$LOCATION_ID")"
TOKEN="$OWNER_TOKEN"
INVITE_OUT="$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE_JSON")"
STAFF_TOKEN_STR="$(pick token "$(body "$INVITE_OUT")")"
[[ -n "$STAFF_TOKEN_STR" ]] || {
  echo "FAIL: create_invite returned no token for the cashier — $(status "$INVITE_OUT"): $(body "$INVITE_OUT" | head -c 300)"
  exit 1; }

signup "doc-staff-$STAMP@example.com"
REDEEMED="$(api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_TOKEN_STR\"}")"
note
if [[ "$(status "$REDEEMED")" == "200" ]]; then
  ok "an Empleada joined the shop at this location"
else
  fail "redeem_invite refused: $(body "$REDEEMED")"
  exit 1
fi

STAFF_PURCHASES_FILE="$(stash staff-purchases "$(api GET "$PURCHASE_PATH")")"
STAFF_SALES_FILE="$(stash staff-sales "$(api GET "$SALE_PATH")")"

cat > "$SCRATCH/staff.py" <<'PY'
import json, sys
purchases, sales, line_key_p, line_key_s, owner_p, owner_s = sys.argv[1:7]

def rows(path, label):
    data = json.load(open(path))
    if not isinstance(data, list):
        print('the Empleada %s read came back as an error: %r — note that an RLS SELECT '
              'refusal is 200 and an EMPTY ARRAY, never a 403' % (label, data))
        raise SystemExit
    return data

hers_p = rows(purchases, 'purchase')
hers_s = rows(sales, 'sale')
theirs_p = json.load(open(owner_p))
theirs_s = json.load(open(owner_s))

if len(hers_p) != len(theirs_p):
    print('the Empleada read %d of the %d deliveries her shop recorded. `0040` dropped '
          'the role gate from purchase_select and purchase_line_select and kept '
          'my_locations(); if it has been narrowed again, this screen is BLANK for the '
          'one person who keys the deliveries — 200 and an empty array, with nothing '
          'going red' % (len(hers_p), len(theirs_p)))
    raise SystemExit
if len(hers_s) != len(theirs_s):
    print('the Empleada read %d of the %d sales her shop recorded; sale_select admits '
          'any member at their own location (0003)' % (len(hers_s), len(theirs_s)))
    raise SystemExit

# ⚠️ AND SHE READS THE LINES TOO, not merely the headers. A widened header policy
# over a narrowed LINE policy answers 200 with empty arrays — every document
# present and every one of them apparently empty, which reads as a data-loss bug.
for row in hers_p:
    if not row[line_key_p]:
        print('the Empleada read a delivery with no lines. purchase_line_select is the '
              'other half of 0040, and a widened header over a narrowed line policy '
              'renders every document empty rather than refused')
        raise SystemExit
for row in hers_s:
    if not row[line_key_s]:
        print('the Empleada read a sale with no lines (sale_line_select, 0003)')
        raise SystemExit

print('ok — every document and every line of both kinds, which is what makes this '
      'screen reachable by the person who keys the deliveries')
PY
verdict "an Empleada reads both kinds, headers and lines (0003, 0040)" \
  "$SCRATCH/staff.py" "$STAFF_PURCHASES_FILE" "$STAFF_SALES_FILE" \
  "$PURCHASE_LINE_TABLE" "$SALE_LINE_TABLE" "$PURCHASES_FILE" "$SALES_FILE"

# --- 11. another shop reads none of it --------------------------------------
signup "doc-stranger-$STAMP@example.com"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Otra tienda","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
STRANGER_P_FILE="$(stash stranger-purchases "$(api GET "$PURCHASE_PATH")")"
STRANGER_S_FILE="$(stash stranger-sales "$(api GET "$SALE_PATH")")"

cat > "$SCRATCH/stranger.py" <<'PY'
import json, sys
for path, label in ((sys.argv[1], 'deliveries'), (sys.argv[2], 'sales')):
    rows = json.load(open(path))
    if not isinstance(rows, list):
        print('the stranger %s read came back as an error: %r' % (label, rows))
        raise SystemExit
    if rows:
        print("another shop read %d of this shop's %s — what a shop pays and what it "
              'takes are the two most commercially sensitive figures it has (§2.7)'
              % (len(rows), label))
        raise SystemExit
print('ok — nothing, of either kind')
PY
verdict "another shop reads none of this shop's documents" \
  "$SCRATCH/stranger.py" "$STRANGER_P_FILE" "$STRANGER_S_FILE"

# --- verdict ---------------------------------------------------------------
echo
if [[ "$fails" -eq 0 ]]; then
  echo "all $ran assertion groups passed — app/src/api/documents.ts still describes"
  echo "the database, and the list every correction is reached from comes back with its"
  echo "lines, in order, inside its window, for both kinds and for a cashier."
  exit 0
fi
echo "$fails of $ran assertion groups FAILED."
exit 1

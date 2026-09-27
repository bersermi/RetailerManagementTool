#!/usr/bin/env bash
# 6a-ii-a-waste-list-contract — can a CASHIER read back the write-off she just
# recorded, and does `app/src/api/documents.ts` still describe `0041`?
#
# ⚠️⚠️ THIS IS THE ONLY INSTRUMENT IN THIS REPOSITORY THAT CAN SEE THE THING
# `0041` WAS BUILT FOR. Everything else is blind to it in a specific way:
#
#   * `supabase/tests/0041_waste_reason_line.sql` reads the view in SQL, where a
#     view that is correct and UNEMBEDDABLE over PostgREST passes every check.
#   * `app/test/api-documents.test.ts` reads the app's constants against
#     fixtures it wrote itself — it cannot know whether the wire agrees.
#   * `supabase/pgtap/01_rls_coverage.sql` joins `relkind = 'r'`, so **a view is
#     invisible to the RLS guard by construction.**
#
# ⚠️⚠️ AND THE CLAIM IS ONE NOTHING COULD MAKE BEFORE TODAY: **an Empleada
# reading her own write-off used to get HTTP 200 and `"waste_line": []`** — a
# document with no products, not a refusal. `waste_select` admits every member
# and `waste_line_select` carries `has_role(…, 'manager')` (`0003:596`), the only
# asymmetric pair in this schema, and `0040` kept it by name while widening
# `purchase`. `0041` reaches AROUND that fence with a `security definer` view.
#
# So the assertions that matter are all of the form *she can, and he cannot, and
# the fence is still there*:
#
#   * ⚠️⚠️ **SHE READS HER LINES THROUGH THE VIEW AND ZERO THROUGH `waste_line`.**
#     The second half is the control. Without it a green run proves only that a
#     fixture exists, which is the vacuous shape ADR-035 §9 refuses.
#   * ⚠️⚠️ **THE VIEW HAS NO COST COLUMN AND ASKING FOR ONE IS A `42703`.** Not a
#     leak, not an empty string — the column does not exist, so no projection of
#     this view yields a cost.
#   * ⚠️⚠️ **A DIFFERENT WORKSPACE'S OWNER READS ZERO.** A definer view bypasses
#     RLS on every table it touches, so the tenancy wall is a `where` clause a
#     person wrote and nothing in Postgres will complain if it is wrong.
#   * ⚠️⚠️ **THE LINE ORDER TAKES TWO KEYS, AND THE REVERSED SPELLING MOVES IT.**
#     One document can hold the SAME product twice under two causes, so one key
#     leaves those two lines tied and a tie is heap order. Asserting only that
#     the sorted read is sorted would be self-consistent and blind
#     ([[assert-against-a-calendar-not-the-array]]); the `desc` read is what makes
#     the `asc` read evidence.
#   * ⚠️ **THE ENUM SORTS BY DECLARATION AND NOT ALPHABETICALLY**, asserted on a
#     DISCRIMINATING pair — `merma de preparación` is declared third and
#     `error de captura` fifth, and the alphabet puts them the other way round.
#   * ⚠️ **`::text` SURVIVES THE EMBED ON A VIEW**, the same claim `5h-ii-a` made
#     of a table. A bare `numeric` is a JSON double and `parseDecimal` refuses one.
#
# WHAT IT DOES NOT ASSERT: that the screen draws no peso figure, what the switch
# says, or where the cause is rendered. Those are `app/test/api-documents.test.ts`'s
# and `R9`'s. **This file is about the wire.**
#
# Run:  supabase start && supabase db reset && bash docs/checks/6a-ii-a-waste-list-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/documents.ts}"
WASTE="${2:-app/src/api/waste.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }
[[ -r "$WASTE" ]] || { echo "FAIL: cannot read $WASTE"; exit 1; }

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
# ⚠️ `wrapped` EXISTS BECAUSE THE COLUMN LISTS ARE TOO LONG FOR ONE LINE and
# prettier puts the literal on the line AFTER the `=`.
str()     { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1; }
wrapped() { sed -n "/^export const $1 =\$/,/;\$/p" "$CONTRACT" | sed -n "s/^  '\([^']*\)';\$/\1/p" | head -1; }
record()  { sed -n "/^export const $1: Readonly<Record<DocumentKind, string>> = {/,/^};/p" "$CONTRACT" \
              | sed -n "s/^  $2: '\([^']*\)',.*/\1/p" | head -1; }
# ⚠️ THE ORDER KEYS COME OUT OF THE ARRAY IN THE ORDER THEY ARE WRITTEN, because
# the ORDER of the two keys is one of the things being asserted.
order_keys() {
  sed -n "s/^export const DOCUMENTS_WASTE_LINE_ORDER: readonly string\[\] = \[\(.*\)\];\$/\1/p" "$CONTRACT" \
    | tr ',' '\n' | sed -n "s/.*'\([^']*\)'.*/\1/p"
}
reasons() {
  sed -n '/^export const WASTE_REASONS = \[/,/^\] as const;/p' "$WASTE" \
    | sed -n "s/^  '\([^']*\)',.*/\1/p"
}

WASTE_TABLE="$(record DOCUMENTS_TABLE waste)"
WASTE_LINE_RELATION="$(record DOCUMENTS_LINE_TABLE waste)"
WASTE_HEAD_COLUMNS="$(str DOCUMENTS_WASTE_HEAD_COLUMNS)"
WASTE_LINE_COLUMNS="$(wrapped DOCUMENTS_WASTE_LINE_COLUMNS)"
DOCUMENTS_ORDER="$(str DOCUMENTS_ORDER)"
DOCUMENTS_TIEBREAK="$(str DOCUMENTS_TIEBREAK)"
DOCUMENTS_LIMIT="$(sed -n 's/^export const DOCUMENTS_LIMIT = \([0-9]*\);.*/\1/p' "$CONTRACT" | head -1)"
ORDER_KEYS=()
while IFS= read -r one; do [[ -n "$one" ]] && ORDER_KEYS+=("$one"); done < <(order_keys)
REASONS=()
while IFS= read -r one; do [[ -n "$one" ]] && REASONS+=("$one"); done < <(reasons)

note
for name in WASTE_TABLE WASTE_LINE_RELATION WASTE_HEAD_COLUMNS WASTE_LINE_COLUMNS \
            DOCUMENTS_ORDER DOCUMENTS_TIEBREAK DOCUMENTS_LIMIT; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of $CONTRACT"
    echo "      This check asserts the app's own constants against a real database."
    echo "      If it cannot find them it has nothing to assert, and a green here"
    echo "      would be the vacuous kind this repository has recorded five shapes of."
    exit 1
  fi
done
if (( ${#ORDER_KEYS[@]} != 2 )); then
  fail "DOCUMENTS_WASTE_LINE_ORDER read as ${#ORDER_KEYS[@]} key(s) — expected 2"
  echo "      One key leaves two lines of the SAME product under two causes tied,"
  echo "      and a tie is heap order. See that constant."
  exit 1
fi
if (( ${#REASONS[@]} < 5 )); then
  fail "read only ${#REASONS[@]} cause(s) out of WASTE_REASONS"; exit 1
fi
ok "read from $CONTRACT: $WASTE_TABLE embeds $WASTE_LINE_RELATION, ordered ${ORDER_KEYS[0]} then ${ORDER_KEYS[1]}"

# ⚠️⚠️ THE ONE ASSERTION THAT IS ABOUT THE APP AND NOT ABOUT THE WIRE, AND IT IS
# HERE BECAUSE IT IS THE CHEAPEST PLACE TO CATCH IT: the relation must not be
# `waste_line`. An embed on the base table answers a cashier `200` with `[]`, so
# "fixing" this constant back would produce a screen that renders write-offs with
# no products and nothing that goes red.
note
case "$WASTE_LINE_RELATION" in
  waste_line) fail "DOCUMENTS_LINE_TABLE.waste is 'waste_line' — the base table, which is manager-and-above."
              echo "      A cashier's embed on it is HTTP 200 with an empty array: a write-off"
              echo "      drawn with no products. The view 0041 ships is what this must name." ;;
  *)          ok "the app embeds a view and not the manager-fenced base table" ;;
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
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS,
# and every fence assertion below would pass vacuously.
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
# ⚠️⚠️ THE OFFSET IS `Z` AND NOT `+00:00`, AND THE REASON COST THIS FILE A RUN:
# an instant goes into a QUERY STRING here, where `+` is an encoded SPACE. An
# unencoded `+00:00` reaches Postgres as `… 00:00` and comes back
# **HTTP 400 `22007`, invalid input syntax for type timestamp with time zone** —
# which reads exactly like a bad column and is a URL-encoding fault.
# `5h-ii-a-documents-contract.sh` does the same `.replace("+00:00", "Z")` for the
# same reason; it is the RPC BODIES that can carry the offset, because those are
# JSON.
ago()    { python3 -c "import datetime,sys;print((datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(hours=float(sys.argv[1]))).isoformat().replace('+00:00','Z'))" "$1"; }

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
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"waste-list-123\"}")"
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
signup "list-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Lo ultimo 6a-ii-a","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }
LOCATION_ID="$(first id "$(body "$(api GET '/rest/v1/location?select=id')")")"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

FAMILY_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Frutas y verduras"}))' "$WORKSPACE_ID")"
FAMILY_ID="$(first id "$(body "$(api POST '/rest/v1/product_family?select=id' "$FAMILY_JSON")")")"
[[ -n "$FAMILY_ID" ]] || { echo "FAIL: could not create a family"; exit 1; }

variant() { # name -> id
  local json
  json="$(python3 -c '
import json, sys
print(json.dumps({
  "workspace_id": sys.argv[1], "family_id": sys.argv[2], "name": sys.argv[3],
  "base_unit_code": "pza", "purchase_unit_code": "pza",
  "sell_unit_code": "pza", "price_unit_code": "pza", "tax_rate": 0}))' \
    "$WORKSPACE_ID" "$FAMILY_ID" "$1")"
  first id "$(body "$(api POST '/rest/v1/product_variant?select=id' "$json")")"
}
# ⚠️⚠️ THE NAMES ARE CHOSEN SO THE ORDER ASSERTIONS DISCRIMINATE, and they are
# CREATED in the reverse of their alphabetical order so heap order cannot be
# mistaken for a sort.
ZANAHORIA="$(variant 'Zanahoria')"
JITOMATE="$(variant 'Jitomate')"
AGUACATE="$(variant 'Aguacate')"
[[ -n "$ZANAHORIA" && -n "$JITOMATE" && -n "$AGUACATE" ]] || { echo "FAIL: could not create three variants"; exit 1; }

GENERIC_ID="$(first id "$(body "$(api GET '/rest/v1/provider?select=id&is_generic=is.true')")")"
[[ -n "$GENERIC_ID" ]] || { echo "FAIL: the new shop has no generic provider"; exit 1; }
BUY_LINES="$(python3 -c '
import json, sys
print(json.dumps([
  {"variant_id": v, "qty_display": "50", "qty_display_unit": "pza", "unit_price_net_per_base": "1.000000"}
  for v in sys.argv[1:]]))' "$ZANAHORIA" "$JITOMATE" "$AGUACATE")"
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

# ⚠️ THE EMPLEADA. `0028` requires a staff invite to name a location, so
# everything she reads goes THROUGH `my_locations()`.
STAFF_INVITE_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "list-staff-$STAMP@example.com" "$LOCATION_ID")"
STAFF_INVITE="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE_JSON")")")"
[[ -n "$STAFF_INVITE" ]] || { echo "FAIL: create_invite returned no token"; exit 1; }
signup "list-staff-$STAMP@example.com"; STAFF_TOKEN="$TOKEN"
REDEEMED="$(TOKEN="$STAFF_TOKEN" api POST /rest/v1/rpc/redeem_invite \
  "$(python3 -c 'import json,sys;print(json.dumps({"p_token":sys.argv[1]}))' "$STAFF_INVITE")")"
note
if [[ "$(status "$REDEEMED")" == "200" ]]; then ok "an Empleada joined the shop at this location"
else fail "redeem_invite refused: $(body "$REDEEMED")"; exit 1; fi

# ⚠️⚠️ AND AN OUTSIDER — the owner of a DIFFERENT shop. He is manager-and-above
# in his own workspace, which is exactly the actor a definer view that forgot its
# predicate would hand every write-off in the database to.
signup "list-outsider-$STAMP@example.com"; OUTSIDER_TOKEN="$TOKEN"
OTHER="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Otra tienda","p_prices_include_tax":true,"p_location_name":null}')"
note
if [[ "$(status "$OTHER")" == "200" ]]; then ok "a second shop exists, with an owner of its own"
else fail "could not create the second shop: $(body "$OTHER")"; exit 1; fi

# --- the write-off SHE records, mixing two causes on one product -----------
# ⚠️⚠️ `6a-i`'s SCREEN SENDS ONE CAUSE PER DOCUMENT AND THIS FIXTURE SENDS TWO ON
# PURPOSE. The database puts `reason` on the LINE, so the mixed shape is
# reachable — and it is the ONLY shape that can tell a one-key line order from a
# two-key one. A fixture built the way the screen writes would make assertion 6
# pass whichever order the app asked for.
REASON_KEY="$(sed -n "s/^export const WASTE_REASON_KEY = '\([^']*\)';.*/\1/p" "$WASTE" | head -1)"
[[ -n "$REASON_KEY" ]] || { echo "FAIL: could not read WASTE_REASON_KEY"; exit 1; }

WASTE_ID="$(uuid)"
: > "$SCRATCH/lines.txt"
line_json() { # variant qty reason
  python3 -c '
import json, sys
print(json.dumps({"variant_id": sys.argv[1], "qty_display": sys.argv[2],
                  "qty_display_unit": "pza", "unit_price_gross_per_base": "1.000000",
                  sys.argv[3]: sys.argv[4]}))' "$1" "$2" "$REASON_KEY" "$3"
}
# ⚠️ AGUACATE TWICE, UNDER `merma de preparación` AND `error de captura` — the
# pair that DISCRIMINATES declaration order from the alphabet: merma is declared
# third and error fifth, and the alphabet puts error first.
line_json "$ZANAHORIA" '1' 'dañado'                >> "$SCRATCH/lines.txt"
line_json "$AGUACATE"  '2' 'error de captura'      >> "$SCRATCH/lines.txt"
line_json "$AGUACATE"  '3' 'merma de preparación'  >> "$SCRATCH/lines.txt"
line_json "$JITOMATE"  '4' 'caducado'              >> "$SCRATCH/lines.txt"
python3 -c '
import json, sys
print(json.dumps([json.loads(l) for l in open(sys.argv[1]) if l.strip()]))' \
  "$SCRATCH/lines.txt" > "$SCRATCH/lines.json"
WASTE_BODY="$(python3 -c '
import json, sys
print(json.dumps({
  "p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_occurred_at": sys.argv[3],
  "p_recorded_offline": False, "p_lines": json.load(open(sys.argv[4]))}))' \
  "$WASTE_ID" "$LOCATION_ID" "$(ago 2)" "$SCRATCH/lines.json")"
RECORDED="$(TOKEN="$STAFF_TOKEN" api POST /rest/v1/rpc/record_waste "$WASTE_BODY")"
note
if [[ "$(status "$RECORDED")" == "200" ]]; then ok "the Empleada recorded a four-line write-off, two causes on one product"
else fail "record_waste refused: $(status "$RECORDED") $(body "$RECORDED" | head -c 300)"; exit 1; fi

# --- 2. the control: she still reads NOTHING off waste_line ----------------
# ⚠️⚠️ WITHOUT THIS EVERY ASSERTION BELOW IS VACUOUS. If a cashier could read the
# base table, `0041` would be solving nothing and a green run would prove only
# that a fixture exists. **It is also what stops somebody "fixing" a future
# regression by widening `waste_line_select`** — which would publish the cost of
# waste, the one thing the owner did NOT trade away.
BASE_READ="$(TOKEN="$STAFF_TOKEN" api GET "/rest/v1/waste?select=id,waste_line(id)&id=eq.$WASTE_ID")"
verdict "the fence is intact: an Empleada reading waste_line gets 200 and an EMPTY array" \
  - "$(stash base "$BASE_READ")" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if not isinstance(rows, list) or len(rows) != 1:
    print(f"the Empleada could not read the waste HEADER either: {rows!r}"); raise SystemExit
lines = rows[0].get("waste_line")
if lines is None:
    print("no `waste_line` key came back at all — the embed changed shape"); raise SystemExit
if lines != []:
    print(f"an Empleada READ {len(lines)} waste_line row(s). `waste_line_select` has been "
          f"widened, which publishes `unit_cost_net_per_base` — the one thing the owner "
          f"did not trade. 0041 reaches AROUND this fence and must not open it.")
    raise SystemExit
print("ok — and the header is readable, which is 0003's asymmetry")
PY

# --- 3. she reads her own lines THROUGH THE VIEW ---------------------------
# ⚠️ THE WIRE SPELLING IS COMPOSED OUT OF THE APP'S OWN CONSTANTS and never
# retyped — so an edit to `documents.ts` is caught here rather than by a
# shopkeeper.
WASTE_SELECT="$WASTE_HEAD_COLUMNS,$WASTE_LINE_RELATION($WASTE_LINE_COLUMNS)"
LINE_ORDER_ASC="$WASTE_LINE_RELATION.order=${ORDER_KEYS[0]}.asc,${ORDER_KEYS[1]}.asc"
LINE_ORDER_DESC="$WASTE_LINE_RELATION.order=${ORDER_KEYS[0]}.desc,${ORDER_KEYS[1]}.desc"
WIRE="/rest/v1/$WASTE_TABLE?select=$WASTE_SELECT&$DOCUMENTS_ORDER=gte.$(ago 24)&order=$DOCUMENTS_ORDER.desc&order=$DOCUMENTS_TIEBREAK.desc&limit=$DOCUMENTS_LIMIT"

HER_READ="$(TOKEN="$STAFF_TOKEN" api GET "$WIRE&$LINE_ORDER_ASC")"
note
if [[ "$(status "$HER_READ")" == "200" ]]; then
  ok "the app's own select string is accepted as written: $WASTE_SELECT"
else
  fail "the wire spelling this app sends was REFUSED: $(status "$HER_READ") $(body "$HER_READ" | head -c 400)"
fi

verdict "she reads all four of her own lines through the view" \
  - "$(stash hers "$HER_READ")" "$WASTE_ID" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if not isinstance(rows, list):
    print(f"not a list: {rows!r}"); raise SystemExit
mine = [r for r in rows if r.get("id") == sys.argv[2]]
if len(mine) != 1:
    print(f"her write-off is not in her own list: {len(mine)} of {len(rows)} row(s)"); raise SystemExit
lines = mine[0].get("waste_reason_line")
if not isinstance(lines, list) or len(lines) != 4:
    print(f"expected 4 lines through the view, got {lines!r}"); raise SystemExit
print("ok — 4 lines, where waste_line answered []")
PY

# ⚠️⚠️ THE CAST, ON A VIEW. `5h-ii-a` proved `::text` survives an embed on a
# TABLE; a view is a different object and `parseDecimal` refuses a JSON number
# outright (`R5`), so a bare `numeric` here is every quantity in the app going
# unreadable at once.
verdict "every cast quantity arrives as a JSON string and not as a double (R5)" \
  - "$(stash hers2 "$HER_READ")" "$WASTE_ID" <<'PY'
import json, sys
rows = [r for r in json.load(open(sys.argv[1])) if r.get("id") == sys.argv[2]]
bad = []
for line in rows[0]["waste_reason_line"]:
    for field in ("qty_base", "qty_display"):
        if not isinstance(line.get(field), str):
            bad.append(f"{field}={line.get(field)!r} ({type(line.get(field)).__name__})")
print("ok — qty_base and qty_display are strings on every line" if not bad
      else "a cast column came back as a number: " + ", ".join(sorted(set(bad))))
PY

# --- 4. no money reaches her through this view -----------------------------
# ⚠️⚠️ ASKED FOR RATHER THAN ASSUMED ABSENT. `0041` carries no money column at
# all, so this is a `42703` — the column does not exist — and NOT an empty value
# a caller might coax out. That is the property worth having: **no projection of
# this view yields a cost.**
for COLUMN in unit_cost_net_per_base unit_price_net_per_base line_net tax_amount; do
  PROBE="$(TOKEN="$STAFF_TOKEN" api GET "/rest/v1/$WASTE_LINE_RELATION?select=$COLUMN&limit=1")"
  note
  CODE="$(python3 -c "import sys,json
try: print(json.load(open(sys.argv[1])).get('code',''))
except Exception: print('')" "$(stash "probe-$COLUMN" "$PROBE")")"
  if [[ "$(status "$PROBE")" == "400" && "$CODE" == "42703" ]]; then
    ok "the view has no \`$COLUMN\` — asking for it is 42703, not a value"
  else
    fail "\`$COLUMN\` is reachable through $WASTE_LINE_RELATION: $(status "$PROBE") $(body "$PROBE" | head -c 200)"
  fi
done

# ⚠️ AND THE HEADER THE APP ASKS FOR CARRIES NO MONEY EITHER. `waste.total_net`
# EXISTS and a cashier may read it — this asserts the app does not ASK, which is
# the area-9 ruling of 2026-09-14 applied to a third screen rather than a fence.
note
case "$WASTE_HEAD_COLUMNS" in
  *total_net*|*total_tax*) fail "DOCUMENTS_WASTE_HEAD_COLUMNS asks for a peso figure: $WASTE_HEAD_COLUMNS" ;;
  *) ok "the app asks a write-off's header for no peso figure: $WASTE_HEAD_COLUMNS" ;;
esac

# --- 5. the tenancy wall a definer view has to put back by hand ------------
OUTSIDE="$(TOKEN="$OUTSIDER_TOKEN" api GET "/rest/v1/$WASTE_LINE_RELATION?select=id,variant_name,reason")"
verdict "a DIFFERENT shop's owner reads ZERO rows through the view" \
  - "$(stash outside "$OUTSIDE")" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if not isinstance(rows, list):
    print(f"expected a list, got {rows!r}"); raise SystemExit
if rows:
    print(f"A DEFINER VIEW LEAKED ACROSS TENANTS: an outsider read {len(rows)} row(s). "
          f"0041 bypasses RLS on every table it touches, so its `where` clause IS the "
          f"policy — and nothing in Postgres complains when it is wrong.")
    raise SystemExit
print("ok — the workspace/location predicate in the view body holds")
PY

# --- 6. the line order, on TWO keys, and non-vacuously ---------------------
# ⚠️⚠️ THE `desc` READ IS WHAT MAKES THE `asc` READ EVIDENCE. Comparing a sorted
# response against its own derived order is self-consistent and blind
# ([[assert-against-a-calendar-not-the-array]]); driving the REVERSED spelling and
# watching the answer invert is what proves the parameter is doing the work
# rather than heap order happening to agree.
HER_DESC="$(TOKEN="$STAFF_TOKEN" api GET "$WIRE&$LINE_ORDER_DESC")"
verdict "the two-key order sorts the lines, and the reversed spelling inverts them" \
  - "$(stash asc "$HER_READ")" "$(stash desc "$HER_DESC")" "$WASTE_ID" <<'PY'
import json, sys

def lines(path, doc_id):
    rows = [r for r in json.load(open(path)) if r.get("id") == doc_id]
    if not rows:
        return None
    return [(l.get("variant_name"), l.get("reason")) for l in rows[0]["waste_reason_line"]]

asc = lines(sys.argv[1], sys.argv[3])
desc = lines(sys.argv[2], sys.argv[3])
if asc is None or desc is None:
    print("the write-off was missing from one of the two reads"); raise SystemExit
if len(asc) != 4:
    print(f"expected 4 lines, got {len(asc)}"); raise SystemExit
if asc != list(reversed(desc)):
    print(f"the desc read is NOT the reverse of the asc read — the order parameter is "
          f"not doing the work, so the asc read agreeing with itself proves nothing.\n"
          f"      asc : {asc}\n      desc: {desc}")
    raise SystemExit
names = [n for n, _ in asc]
if names != sorted(names):
    print(f"the first key did not sort the product names: {names}"); raise SystemExit

# ⚠️ THE SECOND KEY, ON THE ONE PRODUCT THAT APPEARS TWICE — the pair a single
# key would have left in heap order.
twice = [r for n, r in asc if n == "Aguacate"]
if len(twice) != 2:
    print(f"the fixture lost its duplicate product: {asc}"); raise SystemExit
if twice != ["merma de preparación", "error de captura"]:
    print(f"the second key ordered the duplicate wrongly: {twice}"); raise SystemExit
# ⚠️⚠️ AND THAT ORDER IS THE ENUM'S DECLARATION ORDER AND PROVABLY NOT THE
# ALPHABET: merma is declared third and error fifth, and `sorted()` disagrees.
if twice == sorted(twice):
    print(f"the causes came back in ALPHABETICAL order, not declaration order: {twice}. "
          f"An enum sorts by declaration; if that has changed, the picker's order and "
          f"this list's have silently stopped agreeing.")
    raise SystemExit
print("ok — names A→Z, the duplicate split by cause, and the cause order is NOT alphabetical")
PY

# --- 7. the manager sees the same document, and the cost as well -----------
# ⚠️ THE OTHER HALF OF *the fence is intact*: the view widened what a CASHIER can
# read and took nothing from a manager. Without this, narrowing `0041` by mistake
# would look identical to a pass.
OWNER_READ="$(TOKEN="$OWNER_TOKEN" api GET "/rest/v1/waste?select=id,waste_line(id,unit_cost_net_per_base::text)&id=eq.$WASTE_ID")"
verdict "the owner still reads the base table, cost included, exactly as before 0041" \
  - "$(stash owner "$OWNER_READ")" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if not isinstance(rows, list) or len(rows) != 1:
    print(f"the owner cannot see the write-off at all: {rows!r}"); raise SystemExit
lines = rows[0].get("waste_line") or []
if len(lines) != 4:
    print(f"the owner reads {len(lines)} line(s) of a four-line document"); raise SystemExit
costs = [l.get("unit_cost_net_per_base") for l in lines]
if any(c is None for c in costs):
    print(f"the cost snapshot did not come back for the owner: {costs}"); raise SystemExit
print("ok — 4 lines with their cost snapshot")
PY

OWNER_VIEW="$(TOKEN="$OWNER_TOKEN" api GET "/rest/v1/$WASTE_LINE_RELATION?select=id&limit=100")"
verdict "and the owner reads the view too — it is not a staff-only door" \
  - "$(stash ownerview "$OWNER_VIEW")" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
print("ok — the owner reads it as well" if isinstance(rows, list) and len(rows) >= 4
      else f"the owner reads {rows!r} through the view, which should carry every line she can see")
PY

# --- 8. a void, and what the list does with it -----------------------------
# ⚠️⚠️ THE VIEW CARRIES THE REVERSAL'S LINES ON PURPOSE (`0009`'s rule: a negated
# document cancels itself in a sum) AND THE CLIENT DROPS BOTH HALVES. This
# asserts the WIRE half — that the reversal arrives — because `documentsFrom`'s
# dropping is only correct if there is something to drop.
VOIDED="$(TOKEN="$STAFF_TOKEN" api POST /rest/v1/rpc/void_transaction \
  "$(python3 -c 'import json,sys;print(json.dumps({"p_kind":"waste","p_id":sys.argv[1],"p_reason":"prueba 6a-ii-a"}))' "$WASTE_ID")")"
note
if [[ "$(status "$VOIDED")" == "200" ]]; then
  ok "a cashier voided her OWN write-off and got a 200 — the claim 6a-ii-b is built on"
else
  fail "void_transaction refused a cashier her own recent write-off: $(status "$VOIDED") $(body "$VOIDED" | head -c 300)"
fi

AFTER="$(TOKEN="$STAFF_TOKEN" api GET "$WIRE&$LINE_ORDER_ASC")"
verdict "the reversal arrives through the view, with negated quantities and the same causes" \
  - "$(stash after "$AFTER")" "$WASTE_ID" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
mirror = [r for r in rows if r.get("reversal_of") == sys.argv[2]]
original = [r for r in rows if r.get("id") == sys.argv[2]]
if len(mirror) != 1:
    print(f"the mirror document is not in the read: {[r.get('id') for r in rows]}"); raise SystemExit
if len(original) != 1:
    print("the document that was voided is no longer readable at all"); raise SystemExit
lines = mirror[0].get("waste_reason_line") or []
if len(lines) != 4:
    print(f"the mirror carries {len(lines)} line(s) of 4"); raise SystemExit
if not all(str(l.get("qty_base", "")).startswith("-") for l in lines):
    print(f"the mirror's quantities are not negated: {[l.get('qty_base') for l in lines]}")
    raise SystemExit
# ⚠️ THE CAUSES ARE COMPARED AS A SET AGAINST THE ORIGINAL'S rather than counted.
# The first writing of this assertion hardcoded THREE against a four-cause
# fixture and went red for its own arithmetic — a count is a claim about the
# fixture, and what is actually being asserted is that the mirror keeps whatever
# the document it cancels was filed under.
was = sorted({l.get("reason") for l in original[0].get("waste_reason_line") or []})
now = sorted({l.get("reason") for l in lines})
if now != was:
    print(f"the mirror's causes differ from the document it cancels:\n"
          f"      original: {was}\n      mirror  : {now}")
    raise SystemExit
# ⚠️ AND THE SUM IS ZERO, which is the property `0009`'s rule buys by NOT
# filtering reversals out of the view: a negated document cancels itself.
total = sum(float(l["qty_base"]) for r in (original + mirror) for l in r["waste_reason_line"])
if abs(total) > 1e-9:
    print(f"a document and its reversal do not sum to zero through the view: {total}")
    raise SystemExit
print(f"ok — a negated mirror the client drops, {len(was)} cause(s) kept, and the pair sums to zero")
PY

# --- the verdict -----------------------------------------------------------
# ⚠️ RULE 4. Every failure path above is conditional, so "0 failures" is also
# what a run that skipped everything looks like.
EXPECTED=21
echo
if (( fails == 0 && ran < EXPECTED )); then
  echo "FAIL: only $ran assertion groups ran, expected $EXPECTED — this check asserted"
  echo "      almost nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — an Empleada reads what she lost and why,"
  echo "through a view that carries no cost, and the fence on waste_line is intact."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the list 6a-ii-a ships does not match the database."
exit 1

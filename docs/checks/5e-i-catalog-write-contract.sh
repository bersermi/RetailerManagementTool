#!/usr/bin/env bash
# 5e-i-catalog-write-contract — does `app/src/api/catalogWrite.ts` still describe
# the database, over a real HTTP round trip with a real shop and a real cashier?
#
# WHY THIS EXISTS, AND IT IS `5d-i-catalog-contract.sh`'s ARGUMENT POINTED AT THE
# WRITE SIDE. `app/test/api-catalog-write.test.ts` proves the app is consistent
# with itself over forty-four assertions. Not one of them has read `0002`, so a
# column renamed on either side of the wire is a 400 that the typecheck, the
# Vitest suite and the bundler all pass straight over:
#
#     {"code":"PGRST204","message":"Could not find the 'precio' column"}
#
# ⚠️⚠️ AND SIX THINGS HERE CANNOT BE ASSERTED ANYWHERE ELSE AT ALL:
#
#   * THE FENCE, WHICH IS THE CENTRAL ONE. `product_family_insert`,
#     `product_variant_insert` and `price_list_insert` are all
#     `has_role(…, 'manager')` in `0002`. No typecheck, suite or bundler has ever
#     read a policy; `CREATE POLICY` is not in the knowledge graph; and RLS is
#     bypassed by `postgres`, so a check run as superuser would pass vacuously.
#     This runs over real HTTP as a real cashier, and asserts she is REFUSED.
#   * THE ORDER. `WRITE_ORDER` claims family, then variant, then price. That is
#     not a preference and not slower the other way round — it is the composite
#     foreign keys, and the only way to say so is to post a price before its
#     variant and read the `23503` back.
#   * THE SHOP-WIDE UNIQUENESS. `product_variant_name_unique` is
#     `(workspace_id, normalized_name)`, so `Pierna` under Pollo refuses `Pierna`
#     under Cerdo — a sentence blaming the FAMILY would be wrong, and only a
#     database can say which.
#   * THE FOLD. `normalize_name` folds case and spaces and NOT accents. The app's
#     duplicate pre-check copies exactly that much; a check that could not tell
#     the two apart would let the copy drift.
#   * WHAT THE APP DOES NOT SEND. `enforce_stock`, `tax_rate` and `pack_size` are
#     off `VARIANT_INSERT_COLUMNS` (C8.8, `5e-iii`), and the promise is not about
#     the string — it is about what is IN THE ROW afterwards, which is `0002`'s
#     defaults and nothing this app guessed.
#   * ⚠️⚠️ THE TWO ARITHMETICS MEETING. A price written by this task must be the
#     price `5d-i` READS BACK, today, through the exact window that read applies.
#     `pricePerBase` and `priceCentavos` are inverses of each other in TypeScript;
#     this is the only place the round trip crosses a real `numeric(14,6)` and a
#     real dated range.
#
# WHAT IT ASSERTS, all against a REAL round trip:
#
#   1. Every string is READ OUT OF `app/src/api/catalogWrite.ts` — not typed in
#      here. A second copy of a contract is the defect this repository has
#      recorded eleven times.
#   2. The three rows the app builds are accepted, in `WRITE_ORDER`'s order,
#      each with exactly its own column list and nothing else.
#   3. ⚠️⚠️ A CASHIER IS REFUSED on all three tables, with the code the app maps.
#   4. ⚠️ The order is the foreign keys': a price posted before its variant is
#      refused, and so is a variant posted before its family.
#   5. ⚠️ The duplicate is SHOP-WIDE, and it names the constraint the app keys on.
#   6. ⚠️ The fold is case and spaces and NOT accents, both halves measured.
#   7. A duplicate FAMILY names the other constraint the app keys on.
#   8. ⚠️⚠️ The price written today is on the catalog read TODAY, byte for byte,
#      through `5d-i`'s own window.
#   9. ⚠️ The columns the app never sends come back at `0002`'s defaults.
#  10. The shop next door cannot write into this one.
#  11. A blank name and an unknown unit are the codes the app maps to its honest
#      catch-all — the two `checkProduct` exists to make unreachable.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the arithmetic. What `$35.00 / kg` comes to in
# `price_per_base` is `@tienda/money`'s and `app/test/api-catalog-write.test.ts`
# pins it against `priceCentavos` for all ten units. This file is about the WIRE
# — the names, the order, the types and the FENCES — and saying so is cheaper
# than a second implementation of the rule in bash. The one number below,
# `0.035000`, is that suite's own fixture carried over so the two sides meet.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5e-i-catalog-write-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/catalogWrite.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the contract, read out of the app ----------------------------------
# ⚠️⚠️ THE READER STARTS AT THE `export const NAME =` LINE AND NOT AT THE NAME
# ALONE, WHICH IS WHAT KEEPS A DOC-COMMENT OUT OF IT. Two of these three column lists are long
# enough that the formatter WRAPS them onto the next line, so a one-line `sed`
# would have found one of three and reported the other two missing — which is
# what happened on this check's first run. The range runs from the export to the
# first line ending in a semicolon, and the first quoted column-shaped string in
# it is the value; every comment about the constant sits above that range.
# ⚠️ THE ANCHOR IS ` =` AND NOT A WORD BOUNDARY. BSD sed and GNU sed disagree
# about `\b`, and this runs on the owner's Mac as well as on ubuntu-latest —
# the two-machine trap `R4`'s accent class and `5a-split-coverage.sh` both
# record, hit again by the next script written.
str() { # NAME -> the string that constant is declared as, wrapped or not
  sed -n "/^export const $1 =/,/;\$/p" "$CONTRACT" \
    | sed -n "s/.*'\([a-z_,]*\)'.*/\1/p" | head -1
}
priv() { sed -n "s/^const $1 = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1; }

FAMILY_COLUMNS="$(str FAMILY_INSERT_COLUMNS)"
VARIANT_COLUMNS="$(str VARIANT_INSERT_COLUMNS)"
PRICE_COLUMNS="$(str PRICE_INSERT_COLUMNS)"
INSERT_RETURNING="$(str INSERT_RETURNING)"
DUPLICATE_CODE="$(priv DUPLICATE)"
FORBIDDEN_CODE="$(priv FORBIDDEN)"

# The order is an ARRAY and it is the claim this check drives. Read as written.
WRITE_ORDER="$(sed -n "s/^export const WRITE_ORDER = \[\(.*\)\] as const;.*/\1/p" "$CONTRACT" \
               | tr -d "' " )"

# The constraint names the app keys its two duplicate sentences on.
REFUSAL_CONSTRAINTS="$(sed -n '/^export const CATALOG_WRITE_REFUSALS/,/^};$/p' "$CONTRACT" \
                       | sed -n 's/^  \([a-z_][a-z_]*\):.*/\1/p' | tr '\n' ' ')"

note
MISSING=""
for name in FAMILY_COLUMNS VARIANT_COLUMNS PRICE_COLUMNS INSERT_RETURNING \
            DUPLICATE_CODE FORBIDDEN_CODE WRITE_ORDER REFUSAL_CONSTRAINTS; do
  eval "value=\$$name"
  [[ -n "$value" ]] || MISSING="$MISSING $name"
done
if [[ -n "$MISSING" ]]; then
  fail "could not read the catalog write's contract out of $CONTRACT:$MISSING"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi

FAMILY_TABLE="$(cut -d, -f1 <<< "$WRITE_ORDER")"
VARIANT_TABLE="$(cut -d, -f2 <<< "$WRITE_ORDER")"
PRICE_TABLE="$(cut -d, -f3 <<< "$WRITE_ORDER")"
if [[ -z "$FAMILY_TABLE" || -z "$VARIANT_TABLE" || -z "$PRICE_TABLE" ]]; then
  fail "WRITE_ORDER did not read back as three tables: '$WRITE_ORDER'"
  exit 1
fi
ok "read from $CONTRACT: $FAMILY_TABLE -> $VARIANT_TABLE -> $PRICE_TABLE"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS,
# and assertion 3 — the only instrument the manager fence ever gets — would then
# pass vacuously, for the same reason supabase/README.md gives about `postgres`.
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
# SOURCE — the trap `5b-ii-a`'s harness recorded: PostgREST's refusals quote a
# constraint name, and those escaped quotes pasted into a literal make the check
# go red for the wrong reason.
stash()  { local f="$SCRATCH/$1.json"; body "$2" > "$f"; echo "$f"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
code_of(){ pick code "$1"; }
first_id(){ python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['id'] if isinstance(r,list) and r else (r.get('id','') if isinstance(r,dict) else ''))" <<< "$1" 2>/dev/null; }

signup() { # email -> sets TOKEN
  local out
  out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"catalog-write-probe-123\"}")"
  TOKEN="$(pick access_token "$(body "$out")")"
  [[ -n "$TOKEN" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}

STAMP="$$-$(date +%s)"
TODAY="$(date +%F)"
# ⚠️ THE LOCAL DAY AND NOT `date -u`. `isoDay` in `@/api/catalog` computes the
# DEVICE's day deliberately — a price window is a fact about a shop's morning —
# so a check that posted the UTC day would be testing a row the app never writes.
# [[local-time-tests-need-a-pinned-tz]]: this machine is UTC-6 and CI is UTC, and
# the two agree here only because both sides of this file use the same clock.

# ⚠️ EVERY BODY IS BUILT BY PYTHON INTO A VARIABLE BEFORE IT IS PASSED, never
# inlined into a nested `$( )`: bash brace-expands `{"a":1}` inside one and
# PostgREST answers `PGRST102`. The trap is recorded in this project's memory.
row() { # column-list value... -> a JSON object with exactly those columns
  local columns="$1"; shift
  python3 -c '
import json, sys
cols = sys.argv[1].split(",")
vals = sys.argv[2:]
if len(cols) != len(vals):
    raise SystemExit("column list and values disagree: %r vs %r" % (cols, vals))
out = {}
for c, v in zip(cols, vals):
    out[c] = None if v == "@@null@@" else v
print(json.dumps(out))' "$columns" "$@"
}
# ⚠️ THE NULL SENTINEL IS A WORD AND NOT A CONTROL BYTE. The first spelling was
# `$'\x00null'`, and BASH CANNOT HOLD A NUL IN A VARIABLE — it truncated to the
# empty string, the positional arguments shifted by one, and PostgREST answered
# `22007 invalid input syntax for type date` about a column three places along.
# A sentinel that vanishes silently is worse than no sentinel.
NULL='@@null@@'

# --- the shop and its two people -------------------------------------------
OWNER_EMAIL="write-owner-$STAMP@example.com"
STAFF_EMAIL="write-staff-$STAMP@example.com"
NEIGHBOUR_EMAIL="write-neighbour-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Catalog write 5e-i","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

LOCATION_ID="$(first_id "$(body "$(api GET '/rest/v1/location?select=id')")")"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

STAFF_INVITE_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "$STAFF_EMAIL" "$LOCATION_ID")"
STAFF_TOKEN_STR="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE_JSON")")")"
[[ -n "$STAFF_TOKEN_STR" ]] || { echo "FAIL: create_invite returned no token for the cashier"; exit 1; }
signup "$STAFF_EMAIL"; STAFF_TOKEN="$TOKEN"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_TOKEN_STR\"}" > /dev/null

# ⚠️ THE NAMES CARRY AN ACCENT AND A CAPITAL, and neither is decoration:
# assertion 6 is the whole point of them.
FAMILY_NAME="Plátanos"
VARIANT_NAME="Plátano macho"
# `app/test/api-catalog-write.test.ts` pins $35.00 / kg as this string.
PRICE_PER_BASE="0.035000"

# --- 2. the three rows the app builds, in the order it claims ---------------
TOKEN="$OWNER_TOKEN"
FAMILY_BODY="$(row "$FAMILY_COLUMNS" "$WORKSPACE_ID" "$FAMILY_NAME")"
FAMILY_OUT="$(api POST "/rest/v1/$FAMILY_TABLE?select=$INSERT_RETURNING" "$FAMILY_BODY")"
FAMILY_ID="$(first_id "$(body "$FAMILY_OUT")")"

VARIANT_BODY="$(row "$VARIANT_COLUMNS" "$WORKSPACE_ID" "$FAMILY_ID" "$VARIANT_NAME" kg kg kg kg)"
VARIANT_OUT="$(api POST "/rest/v1/$VARIANT_TABLE?select=$INSERT_RETURNING" "$VARIANT_BODY")"
VARIANT_ID="$(first_id "$(body "$VARIANT_OUT")")"

PRICE_BODY="$(row "$PRICE_COLUMNS" "$WORKSPACE_ID" "$VARIANT_ID" "$NULL" "$PRICE_PER_BASE" "$TODAY" "$NULL")"
PRICE_OUT="$(api POST "/rest/v1/$PRICE_TABLE?select=$INSERT_RETURNING" "$PRICE_BODY")"

note
if [[ "$(status "$FAMILY_OUT")" == "201" && "$(status "$VARIANT_OUT")" == "201" \
      && "$(status "$PRICE_OUT")" == "201" && -n "$FAMILY_ID" && -n "$VARIANT_ID" ]]; then
  ok "the three rows the app builds are accepted, each with exactly its own columns"
else
  fail "the app's own insert bodies were not accepted:"
  echo "        $FAMILY_TABLE  $(status "$FAMILY_OUT") $(body "$FAMILY_OUT")"
  echo "        $VARIANT_TABLE $(status "$VARIANT_OUT") $(body "$VARIANT_OUT")"
  echo "        $PRICE_TABLE   $(status "$PRICE_OUT") $(body "$PRICE_OUT")"
  echo "      Every column above is read out of $CONTRACT. A rename on either side"
  echo "      of the wire compiles, bundles and passes the whole Vitest suite."
  exit 1
fi

# --- 3. ⚠️⚠️ THE FENCE. A CASHIER IS REFUSED. ------------------------------
# This is the assertion the task exists for and the only instrument it ever gets.
TOKEN="$STAFF_TOKEN"
STAFF_FAMILY="$(api POST "/rest/v1/$FAMILY_TABLE?select=$INSERT_RETURNING" \
  "$(row "$FAMILY_COLUMNS" "$WORKSPACE_ID" "Res del turno")")"
STAFF_VARIANT="$(api POST "/rest/v1/$VARIANT_TABLE?select=$INSERT_RETURNING" \
  "$(row "$VARIANT_COLUMNS" "$WORKSPACE_ID" "$FAMILY_ID" "Bistec del turno" kg kg kg kg)")"
STAFF_PRICE="$(api POST "/rest/v1/$PRICE_TABLE?select=$INSERT_RETURNING" \
  "$(row "$PRICE_COLUMNS" "$WORKSPACE_ID" "$VARIANT_ID" "$NULL" "9.990000" "$TODAY" "$NULL")")"

for pair in "$FAMILY_TABLE|$STAFF_FAMILY" "$VARIANT_TABLE|$STAFF_VARIANT" "$PRICE_TABLE|$STAFF_PRICE"; do
  table="${pair%%|*}"; out="${pair#*|}"
  note
  got_code="$(code_of "$(body "$out")")"
  if [[ "$(status "$out")" == "403" && "$got_code" == "$FORBIDDEN_CODE" ]]; then
    ok "a cashier is refused $table — $FORBIDDEN_CODE, the code the app maps"
  elif [[ "$(status "$out")" == "403" ]]; then
    # ⚠️ REFUSED, BUT NOT WITH THE CODE THE APP KEYS ON. She is safe and she is
    # told the wrong thing: `catalogWriteErrorMessage` falls through to
    # `@/api/errors`, where the fence becomes *"Tu sesión se cerró"* and she is
    # sent round a loop she cannot leave. A different failure from the one below
    # and it must not wear its words.
    fail "a cashier is refused $table with '$got_code', and the app maps '$FORBIDDEN_CODE'."
    echo "      She is fenced out correctly and told the wrong sentence: an unmapped"
    echo "      code falls through to @/api/errors, where 42501 is 'Tu sesión se cerró'"
    echo "      — a cashier sent to sign in again for a permission she will never have."
  else
    fail "A CASHIER WROTE TO $table (HTTP $(status "$out"), code '$got_code')."
    echo "      \`${table}_insert\` is has_role('manager') in 0002 and this is the only"
    echo "      instrument in this repository that can see it: no typecheck, suite or"
    echo "      bundler has ever read a policy, and CREATE POLICY is not in the graph."
    echo "      If the policy was widened deliberately, 5e-ii must stop drawing the"
    echo "      fence — a control hidden from someone who is allowed to use it is the"
    echo "      same defect as one shown to someone who is not."
  fi
done

# --- 4. the order is the foreign keys', not a preference -------------------
TOKEN="$OWNER_TOKEN"
ORPHAN_VARIANT="$(api POST "/rest/v1/$VARIANT_TABLE?select=$INSERT_RETURNING" \
  "$(row "$VARIANT_COLUMNS" "$WORKSPACE_ID" "00000000-0000-0000-0000-000000000000" "Huerfano" kg kg kg kg)")"
ORPHAN_PRICE="$(api POST "/rest/v1/$PRICE_TABLE?select=$INSERT_RETURNING" \
  "$(row "$PRICE_COLUMNS" "$WORKSPACE_ID" "00000000-0000-0000-0000-000000000000" "$NULL" "1.000000" "$TODAY" "$NULL")")"
note
if [[ "$(status "$ORPHAN_VARIANT")" != "201" && "$(status "$ORPHAN_PRICE")" != "201" ]]; then
  ok "a row posted before the one it points at is refused — WRITE_ORDER is the FKs'"
else
  fail "a variant with no family, or a price with no variant, was ACCEPTED."
  echo "      WRITE_ORDER's order rests on product_variant_family_fk and"
  echo "      price_list_variant_fk being enforced. If a migration dropped one, a"
  echo "      partial write stops being recoverable and starts being garbage."
fi

# --- 5. the duplicate is SHOP-WIDE -----------------------------------------
SECOND_FAMILY="$(first_id "$(body "$(api POST "/rest/v1/$FAMILY_TABLE?select=$INSERT_RETURNING" \
  "$(row "$FAMILY_COLUMNS" "$WORKSPACE_ID" "Otra familia")")")")"
CROSS="$(api POST "/rest/v1/$VARIANT_TABLE?select=$INSERT_RETURNING" \
  "$(row "$VARIANT_COLUMNS" "$WORKSPACE_ID" "$SECOND_FAMILY" "$VARIANT_NAME" kg kg kg kg)")"
note
CROSS_CODE="$(code_of "$(body "$CROSS")")"
CROSS_MESSAGE="$(pick message "$(body "$CROSS")")"
if [[ "$CROSS_CODE" == "$DUPLICATE_CODE" ]] \
   && grep -q 'product_variant_name_unique' <<< "$CROSS_MESSAGE"; then
  ok "the same name under a SECOND family is refused $DUPLICATE_CODE, naming the constraint"
else
  fail "a name this shop already uses was accepted under another family (code '$CROSS_CODE')."
  echo "      product_variant_name_unique is (workspace_id, normalized_name) — shop-wide."
  echo "      ES.catalog.issues.duplicate deliberately does NOT say 'en esta familia',"
  echo "      and ES.catalog.errors keys on that constraint's NAME, which must be in"
  echo "      the message: PostgREST sends details: null. Got: $CROSS_MESSAGE"
fi

# --- 6. the fold is case and spaces, and NOT accents ------------------------
FOLDED="$(api POST "/rest/v1/$VARIANT_TABLE?select=$INSERT_RETURNING" \
  "$(row "$VARIANT_COLUMNS" "$WORKSPACE_ID" "$FAMILY_ID" "  PLÁTANO   MACHO " kg kg kg kg)")"
UNFOLDED="$(api POST "/rest/v1/$VARIANT_TABLE?select=$INSERT_RETURNING" \
  "$(row "$VARIANT_COLUMNS" "$WORKSPACE_ID" "$FAMILY_ID" "Platano macho" kg kg kg kg)")"
note
if [[ "$(status "$FOLDED")" != "201" && "$(status "$UNFOLDED")" == "201" ]]; then
  ok "normalize_name folds case and spaces and NOT accents — both halves measured"
else
  fail "the fold is not what the app copies (case+space $(status "$FOLDED"), accent $(status "$UNFOLDED"))."
  echo "      checkProduct folds with searchKey — case and spaces — because that is the"
  echo "      rule the constraint applies. If the database now folds accents, the app"
  echo "      lets through a duplicate; if it stopped folding case, the app refuses a"
  echo "      product the shop is allowed to create. 0002 §2 argues the current rule."
fi

# --- 7. the family duplicate names the other constraint --------------------
SAME_FAMILY="$(api POST "/rest/v1/$FAMILY_TABLE?select=$INSERT_RETURNING" \
  "$(row "$FAMILY_COLUMNS" "$WORKSPACE_ID" "  plátanos ")")"
note
SAME_CODE="$(code_of "$(body "$SAME_FAMILY")")"
SAME_MESSAGE="$(pick message "$(body "$SAME_FAMILY")")"
if [[ "$SAME_CODE" == "$DUPLICATE_CODE" ]] \
   && grep -q 'product_family_name_unique' <<< "$SAME_MESSAGE"; then
  ok "a family the shop already has is refused $DUPLICATE_CODE, naming its own constraint"
else
  fail "the duplicate family did not answer the constraint the app keys on (code '$SAME_CODE')."
  echo "      The two duplicates get two different sentences — one is a product the shop"
  echo "      already sells, the other a family it already has — and the constraint name"
  echo "      in the message is the only thing that tells them apart. Got: $SAME_MESSAGE"
fi
note
CONSTRAINT_MISS=""
for constraint in $REFUSAL_CONSTRAINTS; do
  grep -q "$constraint" <<< "$CROSS_MESSAGE$SAME_MESSAGE" || CONSTRAINT_MISS="$CONSTRAINT_MISS $constraint"
done
if [[ -z "$CONSTRAINT_MISS" ]]; then
  ok "every constraint CATALOG_WRITE_REFUSALS keys on was seen on the wire"
else
  fail "CATALOG_WRITE_REFUSALS keys on constraints this database never named:$CONSTRAINT_MISS"
  echo "      A sentence keyed on a constraint that no longer fires is a sentence"
  echo "      nobody will ever read, and the shopkeeper gets the catch-all instead."
fi

# --- 8. ⚠️⚠️ THE TWO ARITHMETICS MEET, THROUGH 5d-i's OWN READ --------------
# The price written above must be on the catalog read TODAY — not tomorrow —
# byte for byte, and still a JSON STRING.
READ_MODULE="app/src/api/catalog.ts"
rstr() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$READ_MODULE" | head -1; }
R_VARIANT="$(rstr VARIANT_COLUMNS)"; R_FAMILY="$(rstr FAMILY_COLUMNS)"
R_PRICE="$(rstr PRICE_COLUMNS)"; R_TABLE="$(rstr PRICE_TABLE)"
R_STARTS="$(rstr PRICE_STARTS_COLUMN)"; R_ORDER="$(rstr CATALOG_ORDER_COLUMN)"
R_SELECT="$(grep -A2 '^export const CATALOG_SELECT =' "$READ_MODULE" \
            | sed -n 's/.*`\(.*\)`.*/\1/p' | head -1)"
for name in VARIANT FAMILY PRICE TABLE; do
  eval "value=\$R_$name"
  R_SELECT="${R_SELECT//\$\{${name}_COLUMNS\}/$value}"
done
R_SELECT="${R_SELECT//\$\{PRICE_TABLE\}/$R_TABLE}"
R_WINDOW="$(sed -n '/^export function priceEndsAfter/,/^}/p' "$READ_MODULE" \
            | sed -n 's/.*`\(.*\)`.*/\1/p' | head -1)"
R_WINDOW="${R_WINDOW//\$\{today\}/$TODAY}"
note
if [[ -z "$R_SELECT" || -z "$R_WINDOW" || "$R_SELECT" == *'${'* ]]; then
  fail "could not read the catalog READ's contract out of $READ_MODULE"
  echo "      This assertion is the write and the read meeting. Without the read's own"
  echo "      select it would be a second spelling of it, which is the defect both"
  echo "      files exist to avoid."
else
  ok "read from $READ_MODULE: the catalog select this write must appear on"
fi

CATALOG_FILE="$(stash catalog "$(api GET \
  "/rest/v1/$VARIANT_TABLE?select=$R_SELECT&$R_TABLE.$R_STARTS=lte.$TODAY&$R_TABLE.or=($R_WINDOW)&order=$R_ORDER")")"
cat > "$SCRATCH/roundtrip.py" <<'PY'
import json, sys
path, variant_id, expected, family_name = sys.argv[1:5]
rows = json.load(open(path))
if not isinstance(rows, list):
    print('the catalog read came back as an error: %r' % (rows,)); raise SystemExit
row = next((r for r in rows if r['id'] == variant_id), None)
if row is None:
    print('the product this task just created is NOT on the catalog read at all')
    raise SystemExit
family = row.get('product_family')
if not isinstance(family, dict) or family.get('name') != family_name:
    print('the family created beside it came back as %r' % (family,)); raise SystemExit
prices = row.get('price_list') or []
if len(prices) != 1:
    print('the price written TODAY is not the one price in force today: %r. '
          'effective_from is the device day and the read window is lte today plus '
          '"not ended" — a product created this morning that is priceless until '
          'tomorrow is C3.12 dash on a product the shop just priced' % (prices,))
    raise SystemExit
got = prices[0]['price_per_base']
if not isinstance(got, str):
    print('price_per_base came back as %r (%s) — the ::text cast is gone, and a JSON '
          'number is a double: parseDecimal refuses it and the price this task just '
          'wrote renders as a dash' % (got, type(got).__name__)); raise SystemExit
if got != expected:
    print('the price was written as %r and read back as %r — numeric(14,6) did not '
          'hold what pricePerBase produced, so priceCentavos cannot be its inverse'
          % (expected, got)); raise SystemExit
print('ok - the product created today is on today read, priced %s, as a string' % got)
PY
note
OUT="$(python3 "$SCRATCH/roundtrip.py" "$CATALOG_FILE" "$VARIANT_ID" "$PRICE_PER_BASE" "$FAMILY_NAME" 2>&1)"
[[ -z "$OUT" ]] && OUT="the verdict script produced nothing — it crashed on the shape that came back"
if [[ "$OUT" == ok* ]]; then ok "the write and the read agree over a real database${OUT#ok}"; else fail "$OUT"; fi

# --- 9. the columns the app never sends ------------------------------------
note
DEFAULTS="$(stash defaults "$(api GET \
  "/rest/v1/$VARIANT_TABLE?select=id,enforce_stock,tax_rate,pack_size&id=eq.$VARIANT_ID")")"
cat > "$SCRATCH/defaults.py" <<'PY'
import json, sys
from decimal import Decimal
rows = json.load(open(sys.argv[1]))
if not isinstance(rows, list) or len(rows) != 1:
    print('could not read the variant back: %r' % (rows,)); raise SystemExit
row = rows[0]
if row['enforce_stock'] is not None:
    print('enforce_stock came back %r on a row this app created. C8.8 says no pilot '
          'screen may expose it, and a value here is this app having chosen one'
          % (row['enforce_stock'],)); raise SystemExit
# The two are read as NUMBERS rather than as text, so the comparison is
# numeric: these columns carry no ::text cast because nothing in the app reads
# them at all — that is the point of the assertion — and `0` arriving as `0.0`
# is PostgREST's spelling of the default, not a value this app chose. Decimal
# rather than float because the question is "is it exactly the default".
if Decimal(str(row['tax_rate'])) != Decimal('0'):
    print('tax_rate came back %r — 0002 defaults it to 0 because most basic groceries '
          'in Mexico are exempt, and 5e-iii is the row that sets it once, deliberately'
          % (row['tax_rate'],)); raise SystemExit
if Decimal(str(row['pack_size'])) != Decimal('1'):
    print('pack_size came back %r — the four-field form asks no pack question and '
          '0002 defaults it to 1' % (row['pack_size'],)); raise SystemExit
print('ok - enforce_stock null, tax_rate 0, pack_size 1: 0002 chose, not this app')
PY
OUT="$(python3 "$SCRATCH/defaults.py" "$DEFAULTS" 2>&1)"
[[ -z "$OUT" ]] && OUT="the defaults verdict crashed on the shape that came back"
if [[ "$OUT" == ok* ]]; then ok "what the app does not send${OUT#ok}"; else fail "$OUT"; fi

# --- 10. the shop next door -------------------------------------------------
signup "$NEIGHBOUR_EMAIL"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Catalog write 5e-i neighbour","p_prices_include_tax":true,"p_location_name":null}' > /dev/null
NEIGHBOUR_WRITE="$(api POST "/rest/v1/$VARIANT_TABLE?select=$INSERT_RETURNING" \
  "$(row "$VARIANT_COLUMNS" "$WORKSPACE_ID" "$FAMILY_ID" "Del vecino" kg kg kg kg)")"
note
if [[ "$(status "$NEIGHBOUR_WRITE")" != "201" ]]; then
  ok "the shop next door cannot write into this one"
else
  fail "ANOTHER SHOP WROTE A PRODUCT INTO THIS ONE'S CATALOG."
  echo "      The tenant fence is the one boundary in this schema that carries weight,"
  echo "      and 5d-i measures it on the READ side only."
fi

# --- 11. the two the app makes unreachable ---------------------------------
TOKEN="$OWNER_TOKEN"
BLANK="$(api POST "/rest/v1/$VARIANT_TABLE?select=$INSERT_RETURNING" \
  "$(row "$VARIANT_COLUMNS" "$WORKSPACE_ID" "$FAMILY_ID" "   " kg kg kg kg)")"
BAD_UNIT="$(api POST "/rest/v1/$VARIANT_TABLE?select=$INSERT_RETURNING" \
  "$(row "$VARIANT_COLUMNS" "$WORKSPACE_ID" "$FAMILY_ID" "Arrobas" arroba arroba arroba arroba)")"
note
BLANK_CODE="$(code_of "$(body "$BLANK")")"
UNIT_CODE="$(code_of "$(body "$BAD_UNIT")")"
REJECTED_LINE="$(sed -n "s/^const REJECTED: readonly string\[\] = \[\(.*\)\];.*/\1/p" "$CONTRACT" | tr -d "' ")"
if [[ -n "$REJECTED_LINE" ]] \
   && grep -q "$BLANK_CODE" <<< "$REJECTED_LINE" && grep -q "$UNIT_CODE" <<< "$REJECTED_LINE"; then
  ok "a blank name ($BLANK_CODE) and an unknown unit ($UNIT_CODE) are both codes the app maps"
else
  fail "the two refusals checkProduct exists to pre-empt are not the codes the app maps."
  echo "      blank name: '$BLANK_CODE'   unknown unit: '$UNIT_CODE'   mapped: '$REJECTED_LINE'"
  echo "      Unmapped, both fall through to @/api/errors, where 23514 is 'Escribe el"
  echo "      nombre de tu tienda' — a shopkeeper adding a product told to name her shop."
fi

echo
if (( fails > 0 )); then
  echo "$ran assertion groups ran, $fails failed — the app and the database disagree"
  echo "about the catalog write."
  exit 1
fi
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that asserted nothing looks
# like.
if (( ran < 15 )); then
  echo "FAIL: only $ran assertion groups ran, expected 15 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
echo "all $ran assertion groups passed — app/src/api/catalogWrite.ts still describes the"
echo "database: the three rows land in WRITE_ORDER's order, A CASHIER IS REFUSED ON ALL"
echo "THREE TABLES, the duplicate is shop-wide and names its constraint, the fold is case"
echo "and spaces and not accents, and the price written today is on today's catalog read."

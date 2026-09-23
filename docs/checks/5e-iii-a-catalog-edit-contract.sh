#!/usr/bin/env bash
# 5e-iii-a-catalog-edit-contract — does `app/src/api/catalogEdit.ts` still
# describe the database, over a real HTTP round trip with a real shop and a real
# cashier?
#
# WHY THIS EXISTS, AND IT IS `5e-i-catalog-write-contract.sh`'s ARGUMENT POINTED
# AT THE UPDATE SIDE. `app/test/api-catalog-edit.test.ts` proves the app is
# consistent with itself over fifty assertions. Not one of them has read `0002`.
#
# ⚠️⚠️ AND FIVE THINGS HERE CANNOT BE ASSERTED ANYWHERE ELSE AT ALL:
#
#   * ⚠️⚠️ THE FENCE ON AN UPDATE IS NOT THE FENCE ON AN INSERT, AND THAT IS THE
#     FINDING THIS FILE EXISTS TO KEEP. `price_list_insert` is `with check`, so a
#     cashier posting a price is refused `42501` — which `5e-i` already asserts.
#     Every UPDATE policy on these tables is `using` as well, and a row a `using`
#     clause excludes is a row PostgREST CANNOT SEE: the PATCH matches nothing and
#     comes back **200 with `[]`**. No code, no message, no refusal. A screen that
#     read that as success would tell a shopkeeper her price changed while the
#     shelf kept the old one. `.single()` — `Accept:
#     application/vnd.pgrst.object+json` — is what turns it into a **406
#     PGRST116**, and assertion 4 drives both shapes so the day one of them moves
#     is the day this goes red.
#   * THE ORDER. `CLOSE BEFORE YOU OPEN` is not a preference. Assertion 5 opens a
#     row while the old one is still open and reads `23P01` back from
#     `price_list_no_overlap` — the only way to say the sequence is forced.
#   * THE SAME-DAY BRANCH. `priceChange`'s third branch exists because closing a
#     row that started today is a zero-length range. Assertion 6 tries exactly
#     that and reads `23514` / `price_list_range_ordered` back, then performs the
#     reprice the app does instead and watches it succeed.
#   * THE TWO FIGURES. `parseTaxRate` refuses 100% and `parsePackSize` refuses
#     zero because `product_variant_tax_rate_sane` and
#     `product_variant_pack_size_positive` do. Assertion 7 sends both past a real
#     database, so the app's bounds cannot drift away from the column's.
#   * NO DELETE. `product_variant` has no delete policy in `0002` — the reason
#     retirement is `is_active`. Assertion 8 attempts one and reads the refusal.
#
# WHAT IT ASSERTS, all against a REAL round trip:
#
#   1. Every string is READ OUT OF `app/src/api/catalogEdit.ts` — not typed in
#      here. A second copy of a contract is the defect this repository has
#      recorded eleven times.
#   2. The edit read asks for columns the database really has, for one variant,
#      through the same dated window `5d-i` applies.
#   3. The ordinary change — close at today, then open — is accepted, and the
#      catalog read afterwards shows the NEW figure and only that one.
#   4. ⚠️⚠️ A CASHIER IS REFUSED, on UPDATE and on INSERT, in the two different
#      shapes those refusals really take.
#   5. ⚠️ Open-before-close is `23P01`. The order is the constraint's, not ours.
#   6. ⚠️ A same-day close is `23514` on `price_list_range_ordered`, and the
#      reprice the app performs instead is accepted.
#   7. ⚠️ The tax rate and the pack size are bounded by the columns' own checks.
#   8. ⚠️ A product cannot be deleted, which is why it is retired instead — and
#      the retirement itself is accepted.
#   9. The shop next door cannot edit into this one.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the arithmetic. What `$35.00 / kg` comes to in
# `price_per_base` is `@tienda/money`'s, and `app/test/api-catalog-edit.test.ts`
# pins it against `pricePerBase` and `priceCentavos`. This file is about the WIRE
# — the names, the order, the codes and the FENCES.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5e-iii-a-catalog-edit-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/catalogEdit.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the contract, read out of the app ----------------------------------
# ⚠️ THE READER STARTS AT THE `export const NAME =` LINE AND RUNS TO THE FIRST
# SEMICOLON, `5e-i`'s recorded shape: the formatter wraps a long column list onto
# the next line, and a one-line `sed` finds some of them and reports the rest
# missing. ⚠️ THE ANCHOR IS ` =` AND NOT `\b` — BSD and GNU sed disagree about
# that, and this runs on the owner's Mac as well as on ubuntu-latest.
str() {
  sed -n "/^export const $1 =/,/;\$/p" "$CONTRACT" \
    | sed -n "s/.*'\([a-z_,:]*\)'.*/\1/p" | head -1
}
priv() { sed -n "s/^const $1 = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1; }

PRICE_EDIT_COLUMNS="$(str PRICE_EDIT_COLUMNS)"
VARIANT_EDIT_COLUMNS="$(str VARIANT_EDIT_COLUMNS)"
NAME_PATCH_COLUMNS="$(str NAME_PATCH_COLUMNS)"
SETTINGS_PATCH_COLUMNS="$(str SETTINGS_PATCH_COLUMNS)"
ACTIVE_PATCH_COLUMNS="$(str ACTIVE_PATCH_COLUMNS)"
PRICE_CLOSE_COLUMNS="$(str PRICE_CLOSE_COLUMNS)"
PRICE_REPRICE_COLUMNS="$(str PRICE_REPRICE_COLUMNS)"
UPDATE_RETURNING="$(str UPDATE_RETURNING)"
VARIANT_TABLE="$(str VARIANT_TABLE)"
FORBIDDEN_CODE="$(priv FORBIDDEN)"
OVERLAP_CODE="$(priv OVERLAP)"
NO_ROWS_CODE="$(priv NO_ROWS)"
# ⚠️ REJECTED is an ARRAY of codes, so it is read as one and driven as one.
REJECTED_CODES="$(sed -n "s/^const REJECTED: readonly string\[\] = \[\(.*\)\];.*/\1/p" "$CONTRACT" \
                  | tr -d "' " | tr ',' ' ')"
# ⚠️ `PRICE_EDIT_TABLE` and `PRICE_INSERT_COLUMNS` are RE-EXPORTS, on purpose —
# one answer to *which row is in force* and one insert body in this app. So they
# are read out of the modules that own them, exactly as the app imports them.
PRICE_TABLE="$(sed -n "/^export const PRICE_TABLE =/,/;\$/p" app/src/api/catalog.ts \
               | sed -n "s/.*'\([a-z_]*\)'.*/\1/p" | head -1)"
PRICE_INSERT_COLUMNS="$(sed -n "/^export const PRICE_INSERT_COLUMNS =/,/;\$/p" app/src/api/catalogWrite.ts \
                        | sed -n "s/.*'\([a-z_,]*\)'.*/\1/p" | head -1)"

note
MISSING=""
for name in PRICE_EDIT_COLUMNS VARIANT_EDIT_COLUMNS NAME_PATCH_COLUMNS SETTINGS_PATCH_COLUMNS \
            ACTIVE_PATCH_COLUMNS PRICE_CLOSE_COLUMNS PRICE_REPRICE_COLUMNS \
            UPDATE_RETURNING VARIANT_TABLE FORBIDDEN_CODE OVERLAP_CODE \
            NO_ROWS_CODE REJECTED_CODES PRICE_TABLE PRICE_INSERT_COLUMNS; do
  eval "value=\$$name"
  [[ -n "$value" ]] || MISSING="$MISSING $name"
done
if [[ -n "$MISSING" ]]; then
  fail "could not read the catalog edit's contract out of $CONTRACT:$MISSING"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $CONTRACT: $VARIANT_TABLE and $PRICE_TABLE, five patch bodies"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS and
# assertion 4 — the only instrument the UPDATE fence ever gets — would then pass
# vacuously, the same reason `supabase/README.md` gives about `postgres`.
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

api() { # method path body -> body, with the HTTP status on the last line
  local method="$1" path="$2" payload="${3:-}" auth="${TOKEN:-}" acc="${ACCEPT:-application/json}"
  if [[ -n "$auth" ]]; then auth="Authorization: Bearer $auth"; else auth="X-Empty: 1"; fi
  if [[ -n "$payload" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" \
      -H "apikey: $KEY" -H "$auth" -H 'Content-Type: application/json' \
      -H "Accept: $acc" -H 'Prefer: return=representation' -d "$payload"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" \
      -H "apikey: $KEY" -H "$auth" -H "Accept: $acc"
  fi
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
code_of(){ pick code "$1"; }
msg_of() { pick message "$1"; }
first_id(){ python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['id'] if isinstance(r,list) and r else (r.get('id','') if isinstance(r,dict) else ''))" <<< "$1" 2>/dev/null; }
rows_in(){ python3 -c "import sys,json;r=json.load(sys.stdin);print(len(r) if isinstance(r,list) else -1)" <<< "$1" 2>/dev/null; }
field()  { python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0].get('$1','') if isinstance(r,list) and r else '')" <<< "$2" 2>/dev/null; }
# ⚠️ IS IT TEXT ON THE WIRE, OR A JSON NUMBER? `::text` is what makes the
# difference, and a double reaching `parseDecimal` is refused outright — so the
# TYPE is the assertion here and the value alone would pass either way.
istext() { python3 -c "import sys,json;r=json.load(sys.stdin);print('yes' if isinstance(r,list) and r and isinstance(r[0].get('$1'),str) else 'no')" <<< "$2" 2>/dev/null; }

# ⚠️ EVERY BODY IS BUILT INTO A VARIABLE BEFORE IT IS PASSED, never inlined into a
# nested `$( )`: bash brace-expands `{"a":1}` inside one and PostgREST answers
# `PGRST102`. The trap is recorded in this project's memory.
obj() { # column-list value... -> a JSON object with exactly those columns
  local columns="$1"; shift
  python3 -c '
import json, sys
cols = sys.argv[1].split(",")
vals = sys.argv[2:]
if len(cols) != len(vals):
    raise SystemExit("column list and values disagree: %r vs %r" % (cols, vals))
print(json.dumps({c: (None if v == "@@null@@" else v) for c, v in zip(cols, vals)}))' \
    "$columns" "$@"
}
# ⚠️ THE NULL SENTINEL IS A WORD AND NOT A CONTROL BYTE — bash cannot hold a NUL
# in a variable; it truncates to empty and the positional arguments shift.
NULL='@@null@@'

signup() { # email -> sets TOKEN
  local out
  out="$(TOKEN="" ACCEPT="application/json" api POST /auth/v1/signup \
        "{\"email\":\"$1\",\"password\":\"catalog-edit-probe-123\"}")"
  TOKEN="$(pick access_token "$(body "$out")")"
  [[ -n "$TOKEN" ]] || { echo "FAIL: could not sign $1 in — $(body "$out")"; exit 1; }
}

STAMP="$$-$(date +%s)"
# ⚠️ THE LOCAL DAY AND NOT `date -u`. `isoDay` computes the DEVICE's day
# deliberately — a price window is a fact about a shop's morning — so a check that
# used the UTC day would be testing a row the app never writes.
# [[local-time-tests-need-a-pinned-tz]]: this machine is UTC-6 and CI is UTC, and
# both sides of this file use the same clock, which is what makes them agree.
TODAY="$(date +%F)"
YESTERDAY="$(python3 -c 'import datetime; print(datetime.date.today() - datetime.timedelta(days=1))')"

# --- the shop, its cashier, and the shop next door --------------------------
signup "edit-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Catalog edit 5e-iii-a","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }
LOCATION_ID="$(first_id "$(body "$(api GET '/rest/v1/location?select=id')")")"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

STAFF_EMAIL="edit-staff-$STAMP@example.com"
INVITE_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "$STAFF_EMAIL" "$LOCATION_ID")"
STAFF_TOKEN_STR="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$INVITE_JSON")")")"
[[ -n "$STAFF_TOKEN_STR" ]] || { echo "FAIL: create_invite returned no token for the cashier"; exit 1; }
signup "$STAFF_EMAIL"; STAFF_TOKEN="$TOKEN"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_TOKEN_STR\"}" > /dev/null

signup "edit-neighbour-$STAMP@example.com"; NEIGHBOUR_TOKEN="$TOKEN"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"La tienda de al lado","p_prices_include_tax":true,"p_location_name":null}' > /dev/null

# --- a product priced YESTERDAY, so the ordinary branch is the live one ------
TOKEN="$OWNER_TOKEN"
FAMILY_BODY="$(obj 'workspace_id,name' "$WORKSPACE_ID" 'Plátanos')"
FAMILY_ID="$(first_id "$(body "$(api POST "/rest/v1/product_family?select=id" "$FAMILY_BODY")")")"
VARIANT_BODY="$(obj 'workspace_id,family_id,name,base_unit_code,purchase_unit_code,sell_unit_code,price_unit_code' \
  "$WORKSPACE_ID" "$FAMILY_ID" 'Plátano macho' kg kg kg kg)"
VARIANT_ID="$(first_id "$(body "$(api POST "/rest/v1/$VARIANT_TABLE?select=id" "$VARIANT_BODY")")")"
[[ -n "$FAMILY_ID" && -n "$VARIANT_ID" ]] || { echo "FAIL: could not seed the product"; exit 1; }

# `app/test/api-catalog-write.test.ts` pins $35.00 / kg as this string.
OLD_PRICE="0.035000"
NEW_PRICE="0.040000"
SEED_BODY="$(obj "$PRICE_INSERT_COLUMNS" "$WORKSPACE_ID" "$VARIANT_ID" "$NULL" "$OLD_PRICE" "$YESTERDAY" "$NULL")"
SEED_OUT="$(api POST "/rest/v1/$PRICE_TABLE?select=id" "$SEED_BODY")"
PRICE_ID="$(first_id "$(body "$SEED_OUT")")"
[[ -n "$PRICE_ID" ]] || { echo "FAIL: could not seed yesterday's price — $(body "$SEED_OUT")"; exit 1; }

# --- 2. the edit read asks for columns the database has ---------------------
note
READ_OUT="$(api GET "/rest/v1/$PRICE_TABLE?select=$PRICE_EDIT_COLUMNS&variant_id=eq.$VARIANT_ID&effective_from=lte.$TODAY&or=(effective_to.is.null,effective_to.gt.$TODAY)")"
READ_ROWS="$(rows_in "$(body "$READ_OUT")")"
if [[ "$(status "$READ_OUT")" == "200" && "$READ_ROWS" == "1" \
      && "$(field id "$(body "$READ_OUT")")" == "$PRICE_ID" \
      && "$(field effective_from "$(body "$READ_OUT")")" == "$YESTERDAY" ]]; then
  ok "the edit read returns the row in force, with its id and its start date"
else
  fail "the edit read did not come back as one dated row:"
  echo "        $(status "$READ_OUT") $(body "$READ_OUT")"
  echo "      PRICE_EDIT_COLUMNS is read out of $CONTRACT; a column renamed on"
  echo "      either side of the wire compiles, bundles and passes Vitest."
fi

# --- 3. the ordinary change: CLOSE, then OPEN -------------------------------
note
CLOSE_BODY="$(obj "$PRICE_CLOSE_COLUMNS" "$TODAY")"
CLOSE_OUT="$(api PATCH "/rest/v1/$PRICE_TABLE?id=eq.$PRICE_ID&select=$UPDATE_RETURNING" "$CLOSE_BODY")"
OPEN_BODY="$(obj "$PRICE_INSERT_COLUMNS" "$WORKSPACE_ID" "$VARIANT_ID" "$NULL" "$NEW_PRICE" "$TODAY" "$NULL")"
OPEN_OUT="$(api POST "/rest/v1/$PRICE_TABLE?select=$UPDATE_RETURNING" "$OPEN_BODY")"
NEW_ROW_ID="$(first_id "$(body "$OPEN_OUT")")"
AFTER="$(api GET "/rest/v1/$PRICE_TABLE?select=$PRICE_EDIT_COLUMNS&variant_id=eq.$VARIANT_ID&effective_from=lte.$TODAY&or=(effective_to.is.null,effective_to.gt.$TODAY)")"
if [[ "$(status "$CLOSE_OUT")" == "200" && "$(status "$OPEN_OUT")" == "201" \
      && "$(rows_in "$(body "$AFTER")")" == "1" \
      && "$(field price_per_base "$(body "$AFTER")")" == "$NEW_PRICE" ]]; then
  ok "close-then-open is accepted, and the window afterwards holds ONE row: the new price"
else
  fail "the ordinary price change did not go through, or left two rows in force:"
  echo "        close $(status "$CLOSE_OUT") $(body "$CLOSE_OUT")"
  echo "        open  $(status "$OPEN_OUT") $(body "$OPEN_OUT")"
  echo "        window afterwards: $(body "$AFTER")"
fi

# --- 4. ⚠️⚠️ THE FENCE, IN ITS TWO DIFFERENT SHAPES ------------------------
# This is the assertion the task exists for. A cashier's INSERT is refused with a
# code; a cashier's UPDATE is not refused at all unless the app asks for one row.
note
TOKEN="$STAFF_TOKEN"
STAFF_RENAME_BODY="$(obj "$NAME_PATCH_COLUMNS" 'Plátano del turno')"
STAFF_RENAME="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=$UPDATE_RETURNING" "$STAFF_RENAME_BODY")"
STAFF_REPRICE_BODY="$(obj "$PRICE_REPRICE_COLUMNS" '0.010000')"
STAFF_REPRICE="$(api PATCH "/rest/v1/$PRICE_TABLE?id=eq.$NEW_ROW_ID&select=$UPDATE_RETURNING" "$STAFF_REPRICE_BODY")"
STAFF_RETIRE_BODY="$(obj "$ACTIVE_PATCH_COLUMNS" false)"
STAFF_RETIRE="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=$UPDATE_RETURNING" "$STAFF_RETIRE_BODY")"
STAFF_OPEN_BODY="$(obj "$PRICE_INSERT_COLUMNS" "$WORKSPACE_ID" "$VARIANT_ID" "$LOCATION_ID" '0.010000' "$TODAY" "$NULL")"
STAFF_OPEN="$(api POST "/rest/v1/$PRICE_TABLE?select=$UPDATE_RETURNING" "$STAFF_OPEN_BODY")"

SILENT=0
for pair in "rename|$STAFF_RENAME" "reprice|$STAFF_REPRICE" "retire|$STAFF_RETIRE"; do
  what="${pair%%|*}"; out="${pair#*|}"
  if [[ "$(status "$out")" != "200" || "$(rows_in "$(body "$out")")" != "0" ]]; then
    fail "a cashier's $what did not come back as the SILENT refusal this app is built"
    echo "      around: expected 200 and an empty array, got $(status "$out") $(body "$out")."
    echo "      If it is now a real error, catalogEdit's PGRST116 mapping is describing"
    echo "      a database that has changed — which is this check doing its job."
    SILENT=1
  fi
done
# ⚠️ AND THE SHAPE THE APP ACTUALLY SEES, because `.single()` is what it sends.
ACCEPT='application/vnd.pgrst.object+json'
STAFF_ONE="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=$UPDATE_RETURNING" "$STAFF_RENAME_BODY")"
ACCEPT='application/json'
UNCHANGED="$(api GET "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=name,is_active")"

if (( SILENT == 0 )) \
   && [[ "$(code_of "$(body "$STAFF_ONE")")" == "$NO_ROWS_CODE" ]] \
   && [[ "$(code_of "$(body "$STAFF_OPEN")")" == "$FORBIDDEN_CODE" ]] \
   && [[ "$(field name "$(body "$UNCHANGED")")" == 'Plátano macho' ]] \
   && [[ "$(field is_active "$(body "$UNCHANGED")")" == 'True' ]]; then
  ok "A CASHIER IS REFUSED — silently on UPDATE, $NO_ROWS_CODE through .single(), $FORBIDDEN_CODE on INSERT, and the row is untouched"
else
  fail "the manager fence did not hold, or did not hold in the shape the app maps:"
  echo "        rename via .single(): $(status "$STAFF_ONE") $(body "$STAFF_ONE")"
  echo "        price insert:         $(status "$STAFF_OPEN") $(body "$STAFF_OPEN")"
  echo "        the row afterwards:   $(body "$UNCHANGED")"
  echo "      ⚠️ This is the only instrument in this repository that can see the"
  echo "      UPDATE fence. Nothing in TypeScript has ever read a policy, and RLS"
  echo "      is bypassed by \`postgres\`, so a superuser run would pass vacuously."
fi

# --- 5. ⚠️ OPEN BEFORE CLOSE IS REFUSED — the order is the constraint's ------
note
TOKEN="$OWNER_TOKEN"
OVERLAP_BODY="$(obj "$PRICE_INSERT_COLUMNS" "$WORKSPACE_ID" "$VARIANT_ID" "$NULL" '0.050000' "$TODAY" "$NULL")"
OVERLAP_OUT="$(api POST "/rest/v1/$PRICE_TABLE?select=$UPDATE_RETURNING" "$OVERLAP_BODY")"
if [[ "$(code_of "$(body "$OVERLAP_OUT")")" == "$OVERLAP_CODE" ]] \
   && grep -q 'price_list_no_overlap' <<< "$(msg_of "$(body "$OVERLAP_OUT")")"; then
  ok "opening a second row over today is $OVERLAP_CODE on price_list_no_overlap — CLOSE BEFORE YOU OPEN"
else
  fail "a price posted over an open one was not refused as $OVERLAP_CODE:"
  echo "        $(status "$OVERLAP_OUT") $(body "$OVERLAP_OUT")"
  echo "      The order in catalogEdit is not a preference — it is this constraint."
fi

# --- 6. ⚠️ THE SAME-DAY BRANCH, AND WHY IT EXISTS --------------------------
note
ZERO_BODY="$(obj "$PRICE_CLOSE_COLUMNS" "$TODAY")"
ZERO_OUT="$(api PATCH "/rest/v1/$PRICE_TABLE?id=eq.$NEW_ROW_ID&select=$UPDATE_RETURNING" "$ZERO_BODY")"
REPRICE_BODY="$(obj "$PRICE_REPRICE_COLUMNS" '0.045000')"
REPRICE_OUT="$(api PATCH "/rest/v1/$PRICE_TABLE?id=eq.$NEW_ROW_ID&select=$UPDATE_RETURNING" "$REPRICE_BODY")"
REPRICED="$(api GET "/rest/v1/$PRICE_TABLE?select=$PRICE_EDIT_COLUMNS&id=eq.$NEW_ROW_ID")"
ZERO_CODE="$(code_of "$(body "$ZERO_OUT")")"
if grep -qw "$ZERO_CODE" <<< "$REJECTED_CODES" \
   && grep -q 'price_list_range_ordered' <<< "$(msg_of "$(body "$ZERO_OUT")")" \
   && [[ "$(status "$REPRICE_OUT")" == "200" ]] \
   && [[ "$(field price_per_base "$(body "$REPRICED")")" == '0.045000' ]]; then
  ok "closing a row that started today is $ZERO_CODE on price_list_range_ordered, and the reprice is accepted"
else
  fail "the same-day branch is not what the app is built around:"
  echo "        zero-length close: $(status "$ZERO_OUT") $(body "$ZERO_OUT")"
  echo "        reprice in place:  $(status "$REPRICE_OUT") $(body "$REPRICE_OUT")"
  echo "      priceChange's third branch exists BECAUSE the first line above fails."
fi

# --- 7. ⚠️ THE TWO FIGURES ARE BOUNDED BY THE COLUMNS' OWN CHECKS -----------
note
TAX_OUT="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=$UPDATE_RETURNING" \
  "$(obj 'tax_rate' '1.0000')")"
PACK_OUT="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=$UPDATE_RETURNING" \
  "$(obj 'pack_size' '0.000')")"
GOOD_OUT="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=$UPDATE_RETURNING" \
  "$(obj "$SETTINGS_PATCH_COLUMNS" '0.1600' '24.000')")"
# ⚠️ `::text`, FOR `PRICE_COLUMNS`' OWN REASON — a `numeric` comes back as a JSON
# NUMBER otherwise, and `0.1600` read as a double and printed again is `0.16`.
# The first spelling of this assertion compared those two strings and went red
# against a database that was perfectly right.
SETTLED="$(api GET "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=tax_rate::text,pack_size::text")"
if grep -qw "$(code_of "$(body "$TAX_OUT")")" <<< "$REJECTED_CODES" \
   && grep -q 'product_variant_tax_rate_sane' <<< "$(msg_of "$(body "$TAX_OUT")")" \
   && grep -qw "$(code_of "$(body "$PACK_OUT")")" <<< "$REJECTED_CODES" \
   && grep -q 'product_variant_pack_size_positive' <<< "$(msg_of "$(body "$PACK_OUT")")" \
   && [[ "$(status "$GOOD_OUT")" == "200" ]] \
   && [[ "$(field tax_rate "$(body "$SETTLED")")" == "0.1600" ]]; then
  ok "100% tax and a pack of zero are refused by their own checks; 16% and 24 land"
else
  fail "the tax rate and the pack size are not bounded where the app thinks:"
  echo "        tax 1.0000:  $(status "$TAX_OUT") $(body "$TAX_OUT")"
  echo "        pack 0.000:  $(status "$PACK_OUT") $(body "$PACK_OUT")"
  echo "        16% and 24:  $(status "$GOOD_OUT") $(body "$GOOD_OUT") -> $(body "$SETTLED")"
  echo "      parseTaxRate and parsePackSize refuse exactly these two bounds."
fi

# --- 8. ⚠️ NO DELETE, WHICH IS WHY RETIREMENT IS is_active ------------------
note
DELETE_OUT="$(api DELETE "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=$UPDATE_RETURNING")"
RETIRE_OUT="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=$UPDATE_RETURNING" \
  "$(obj "$ACTIVE_PATCH_COLUMNS" false)")"
RETIRED="$(api GET "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=is_active")"
if [[ "$(code_of "$(body "$DELETE_OUT")")" == "$FORBIDDEN_CODE" ]] \
   && [[ "$(status "$RETIRE_OUT")" == "200" ]] \
   && [[ "$(field is_active "$(body "$RETIRED")")" == 'False' ]]; then
  ok "a product cannot be deleted ($FORBIDDEN_CODE) and is retired by $ACTIVE_PATCH_COLUMNS instead"
else
  fail "deletion and retirement are not what the app is built around:"
  echo "        delete: $(status "$DELETE_OUT") $(body "$DELETE_OUT")"
  echo "        retire: $(status "$RETIRE_OUT") $(body "$RETIRE_OUT") -> $(body "$RETIRED")"
  echo "      Neither catalog table has a delete policy in 0002, which is the whole"
  echo "      reason catalogEdit offers is_active and no DELETE at all."
fi

# --- 10. ⚠️ THE FORM'S OWN READ: THE TWO FIGURES IT SHOWS BESIDE ITS BOXES ---
# `5e-iii-b`. `variantSettings` sends no column for a box nobody typed into, so
# an empty form cannot overwrite anything — which makes *what is the IVA right
# now* a question the screen must be able to ASK, and `VARIANT_COLUMNS` in
# `@/api/catalog` carries neither column. ⚠️ The TYPE is the assertion, not the
# value: a bare `numeric` arrives as a JSON number, which is a double, and
# `parseDecimal` refuses a number outright — so a `::text` dropped from this list
# compiles, bundles, passes Vitest and renders an empty `Actual:` line.
#
# ⚠️⚠️ IT READS BACK WHAT ASSERTION 7 WROTE, AND THE ORDER IS THE POINT RATHER
# THAN AN ACCIDENT OF PLACEMENT. Asserting `0002`'s defaults would only say the
# columns exist; asserting the 16% and the pack of 24 that assertion 7 patched in
# says the two halves of `Editar` agree — what `parseTaxRate` sent as `0.1600`
# comes back as `0.1600`, which is exactly what `taxPercentOf` renders as `16`.
# ⚠️ A fixture that reorders these two groups breaks this and should.
note
TOKEN="$OWNER_TOKEN"
SETTINGS_OUT="$(api GET "/rest/v1/$VARIANT_TABLE?select=$VARIANT_EDIT_COLUMNS&id=eq.$VARIANT_ID")"
SETTINGS_BODY="$(body "$SETTINGS_OUT")"
if [[ "$(status "$SETTINGS_OUT")" == "200" && "$(rows_in "$SETTINGS_BODY")" == "1" \
      && "$(istext tax_rate "$SETTINGS_BODY")" == "yes" \
      && "$(istext pack_size "$SETTINGS_BODY")" == "yes" \
      && "$(field tax_rate "$SETTINGS_BODY")" == "0.1600" \
      && "$(field pack_size "$SETTINGS_BODY")" == "24.000" ]]; then
  ok "the form reads back what assertion 7 wrote, as TEXT and at the column's scale: 0.1600 and 24.000"
else
  fail "the two set-once figures did not come back as text at their column scales:"
  echo "        $(status "$SETTINGS_OUT") $SETTINGS_BODY"
  echo "      VARIANT_EDIT_COLUMNS is read out of $CONTRACT. A '::text' dropped"
  echo "      here is a JSON double, which \`parseDecimal\` refuses — and the screen"
  echo "      shows nothing rather than failing, which is the worst of the two."
fi

# --- 9. the shop next door cannot edit into this one ------------------------
note
TOKEN="$NEIGHBOUR_TOKEN"
ACCEPT='application/vnd.pgrst.object+json'
NEIGHBOUR_OUT="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$VARIANT_ID&select=$UPDATE_RETURNING" \
  "$(obj "$NAME_PATCH_COLUMNS" 'Robado')")"
ACCEPT='application/json'
if [[ "$(code_of "$(body "$NEIGHBOUR_OUT")")" == "$NO_ROWS_CODE" ]]; then
  ok "the shop next door cannot rename this shop's product"
else
  fail "another workspace's owner reached this product:"
  echo "        $(status "$NEIGHBOUR_OUT") $(body "$NEIGHBOUR_OUT")"
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that skipped everything looks
# like — and `5b-split-coverage.sh` shipped without one.
if (( fails == 0 && ran < 9 )); then
  echo "FAIL: only $ran assertion groups ran, expected 9 — this check asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — $CONTRACT still describes the applied"
  echo "schema over a real round trip, and A CASHIER IS REFUSED on every path."
  exit 0
fi
echo "$ran group(s) ran, $fails failed — the app and the database disagree."
exit 1

#!/usr/bin/env bash
# 5h-ii-b-corrections-contract — does `app/src/api/corrections.ts` still describe
# the database, and can this app actually put a document right?
#
# ⚠️⚠️ THIS IS THE FIRST WRITE IN THIS APP THAT CANCELS ANYTHING, AND EVERY CLAIM
# BELOW IS ONE NO NODE SUITE AND NO TYPECHECK CAN MAKE:
#
#   * **THE RPC EXISTS WITH THESE THREE ARGUMENT NAMES.** PostgREST matches a
#     function BY ITS PARAMETER NAMES, so `p_reason` misspelled is a **404 /
#     `PGRST202`** and not a bad call — the 404 `R13` exists for. TypeScript has
#     never read `0021`, and `app/test/api-corrections.test.ts` cannot load
#     `api/calls.ts`.
#   * **`TD003` ARRIVES ON AN HTTP 400.** `@/api/errors` maps it to *pídele a un
#     gerente*, and that mapping is worthless if the code on the wire is not
#     `TD003` or if PostgREST dresses a custom SQLSTATE as something else. A
#     wrong guess here is a cashier told *algo salió mal*, who taps again.
#   * **A REPLAY'S BODY IS SHORTER THAN A FIRST VOID'S.** `0021:268` answers a
#     void that already happened with four keys rather than six. `voidedFrom`
#     requires three of them and it must stay that way: a parser wanting `lines`
#     would turn the idempotent success into a failure on exactly the tap
#     somebody makes when the first response was lost.
#   * **`mayCorrect` AND `0021` AGREE, AND ONLY WHERE THEY SHOULD.** The client
#     hides one case and one only — a cashier on somebody else's document. This
#     check drives that case AND the three the client SHOWS, so a fence drawn too
#     wide on either side goes red rather than hiding a button she may press.
#   * ⚠️⚠️ **THE WINDOW IS READ FROM `workspace_setting` AND IS NOT A CONSTANT.**
#     This is the assertion the app has no way to make, because the app never
#     reads that table: the same cashier, the same document, refused at a window
#     of 0 and allowed at 15. `0001:563` says the client reads it *"to render
#     correctly"*; `5h-ii-b` decided the client should NOT, and this is what
#     keeps the decision honest rather than merely convenient.
#   * ⚠️⚠️ **A VOIDED DELIVERY CAN BE RE-RECORDED, WHICH IS THE WHOLE OF
#     `Corregir`.** `record_purchase` is idempotent on the CLIENT-GENERATED id
#     and guards it with `payload_hash` (`0018:455`): a re-record of identical
#     lines under a NEW id must be a new document and not a `TD001`. If it were
#     not, `Corregir` would void a delivery and refuse to replace it — and
#     nothing in the app could see that until a shopkeeper stood in it.
#   * **AND THE ROUND TRIP IS EXACT.** `qty_base` and `unit_price_net_per_base`
#     come back off the wire as the same digits they were sent as, because
#     `prefillOf` puts them straight back into a cart that is about to re-record
#     the ledger. Nothing renders either one, so a rounding here has no symptom.
#
# WHAT IT DOES NOT ASSERT: which buttons are drawn, what they say, and what a
# cart does with a prefill. Those are `app/test/api-corrections.test.ts`'s and
# `R9`'s. This file is about the WIRE: the name, the arguments, the codes, the
# fence and the re-record.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5h-ii-b-corrections-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/corrections.ts}"
WORDS="${2:-app/src/strings.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }
[[ -r "$WORDS" ]] || { echo "FAIL: cannot read $WORDS"; exit 1; }

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
str()  { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$CONTRACT" | head -1; }
# ⚠️ THE `p_` NAMES COME OUT OF THE **INTERFACE**, which is the only place they
# are written — `voidArgs` builds the object from it and TypeScript is what keeps
# the two in step. Reading the builder instead would read the keys twice.
args() { sed -n '/^export interface VoidArgs/,/^}/p' "$CONTRACT" \
           | sed -n 's/^  readonly \(p_[a-z_]*\).*/\1/p' | sort | tr '\n' ' '; }
# ⚠️ A `Record` FIELD over two lines — `5h-ii-a`'s `record()`, and its reason.
record() { sed -n "/^export const $1/,/^};/p" "$CONTRACT" | sed -n "s/^  $2: '\([^']*\)',.*/\1/p" | head -1; }
# ⚠️ THE REASON IS IN `src/strings.ts` (`R4`), NOT HERE — and it carries an ACCENT,
# which makes the round trip below a UTF-8 assertion as well as an audit one.
word() { sed -n "s/^    $1: '\([^']*\)',.*/\1/p" "$WORDS" | head -1; }

VOID_TRANSACTION="$(str VOID_TRANSACTION)"
VOID_ARGS="$(args)"
REASON_CORRECTED="$(word reasonCorrected)"
REASON_DELETED="$(word reasonDeleted)"
CART_PURCHASE="$(record CART_KIND purchase)"
CART_SALE="$(record CART_KIND sale)"

note
MISSING=""
for name in VOID_TRANSACTION VOID_ARGS REASON_CORRECTED REASON_DELETED \
            CART_PURCHASE CART_SALE; do
  eval "value=\$$name"
  [[ -n "$value" ]] || MISSING="$MISSING $name"
done
if [[ -n "$MISSING" ]]; then
  fail "could not read the corrections contract out of $CONTRACT / $WORDS:$MISSING"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi

note
if [[ "$VOID_ARGS" == "p_id p_kind p_reason " ]]; then
  ok "the RPC is $VOID_TRANSACTION($VOID_ARGS) — three arguments, written once"
else
  fail "VoidArgs spells '$VOID_ARGS'; 0021 declares p_kind, p_id and p_reason."
  echo "      PostgREST matches a function BY ITS PARAMETER NAMES, so a fourth"
  echo "      argument or a renamed one is a 404 and not a bad call (R13)."
  exit 1
fi

note
if [[ "$CART_PURCHASE" == "buy" && "$CART_SALE" == "sell" ]]; then
  ok "a purchase is re-recorded into the buy cart and a sale into the sell cart"
else
  fail "CART_KIND reads purchase=$CART_PURCHASE sale=$CART_SALE"
  exit 1
fi

note
if [[ "$REASON_CORRECTED" != "$REASON_DELETED" ]]; then
  ok "the two acts write different audit reasons — '$REASON_CORRECTED' / '$REASON_DELETED'"
else
  fail "both corrections write the same reversal_reason, so the audit trail cannot"
  echo "      tell a correction from a deletion — which is the only thing it records."
  exit 1
fi

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
# every fence assertion below would pass vacuously, for the reason
# supabase/README.md gives about the `postgres` superuser.
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
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"corrections-probe-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  echo "      GoTrue rate-limits signup and answers with an EMPTY BODY when it does."
  exit 1
}

STAMP="$$-$(date +%s)"

# --- the shop, its catalog, its supplier and its two people ----------------
signup "fix-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
ONBOARD='{"p_display_name":"Corregir 5h-ii-b","p_prices_include_tax":true,"p_location_name":null}'
CREATED="$(api POST /rest/v1/rpc/onboard_workspace "$ONBOARD")"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }
LOCATION_ID="$(first id "$(body "$(api GET '/rest/v1/location?select=id')")")"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

# ⚠️⚠️ EVERY JSON BODY IS BUILT INTO A VARIABLE BY `python3` AND NEVER WRITTEN
# INLINE INSIDE A NESTED `$( )`. Bash BRACE-EXPANDS `{"a":1,"b":2}` there — it
# splits the body in two and PostgREST answers `PGRST102` on something that reads
# perfectly well in the failure message. This harness hit it on its first run.
FAMILY_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Frutas y verduras"}))' "$WORKSPACE_ID")"
FAMILY_ID="$(first id "$(body "$(api POST '/rest/v1/product_family?select=id' "$FAMILY_JSON")")")"
[[ -n "$FAMILY_ID" ]] || { echo "FAIL: could not create a family"; exit 1; }

variant() { # name base-unit price-unit -> id
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
AGUACATE="$(variant 'Aguacate Hass' g kg)"
BOLILLO="$(variant 'Bolillo' pza pza)"
[[ -n "$AGUACATE" && -n "$BOLILLO" ]] || { echo "FAIL: could not create two variants"; exit 1; }

PROVIDER_JSON="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Bodega Hernández"}))' "$WORKSPACE_ID")"
PROVIDER_ID="$(first id "$(body "$(api POST '/rest/v1/provider?select=id' "$PROVIDER_JSON")")")"
[[ -n "$PROVIDER_ID" ]] || { echo "FAIL: could not create a named provider"; exit 1; }

# ⚠️ THE EMPLEADA. `0028` requires a staff invite to name a location and §2.7 is
# the reason — so everything she reads and writes goes THROUGH `my_locations()`.
STAFF_INVITE_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "fix-staff-$STAMP@example.com" "$LOCATION_ID")"
INVITE_OUT="$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE_JSON")"
STAFF_INVITE="$(pick token "$(body "$INVITE_OUT")")"
[[ -n "$STAFF_INVITE" ]] || {
  echo "FAIL: create_invite returned no token — $(status "$INVITE_OUT"): $(body "$INVITE_OUT" | head -c 300)"
  exit 1; }
signup "fix-staff-$STAMP@example.com"; STAFF_TOKEN="$TOKEN"
REDEEM_JSON="$(python3 -c '
import json, sys
print(json.dumps({"p_token": sys.argv[1]}))' "$STAFF_INVITE")"
REDEEMED="$(api POST /rest/v1/rpc/redeem_invite "$REDEEM_JSON")"
note
if [[ "$(status "$REDEEMED")" == "200" ]]; then
  ok "an Empleada joined the shop at this location"
else
  fail "redeem_invite refused: $(body "$REDEEMED")"
  exit 1
fi
STAFF_ID="$(pick user_id "$(body "$(TOKEN="$STAFF_TOKEN" api GET '/auth/v1/user')")")"
[[ -n "$STAFF_ID" ]] || STAFF_ID="$(pick id "$(body "$(TOKEN="$STAFF_TOKEN" api GET '/auth/v1/user')")")"

# --- the deliveries --------------------------------------------------------
LINES_JSON="$(python3 -c '
import json, sys
print(json.dumps([
  {"variant_id": sys.argv[1], "qty_display": "2",  "qty_display_unit": "kg",  "unit_price_net_per_base": "0.030000"},
  {"variant_id": sys.argv[2], "qty_display": "12", "qty_display_unit": "pza", "unit_price_net_per_base": "1.500000"}]))' \
  "$AGUACATE" "$BOLILLO")"

buy() { # id hours-ago -> response  (uses whatever TOKEN is set)
  local payload
  payload="$(python3 -c '
import json, sys
print(json.dumps({
  "p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_provider_id": sys.argv[3],
  "p_occurred_at": sys.argv[4], "p_recorded_offline": True,
  "p_lines": json.loads(sys.argv[5])}))' \
    "$1" "$LOCATION_ID" "$PROVIDER_ID" "$(ago "$2")" "$LINES_JSON")"
  api POST /rest/v1/rpc/record_purchase "$payload"
}

# ⚠️ THE REASON IS SENT AS THE APP SENDS IT — read out of `src/strings.ts`, accent
# and all, so this round trip is a UTF-8 assertion too (`5d-i`'s reason).
voidit() { # kind id reason -> response
  local payload
  payload="$(python3 -c '
import json, sys
print(json.dumps({"p_kind": sys.argv[1], "p_id": sys.argv[2], "p_reason": sys.argv[3]}))' \
    "$1" "$2" "$3")"
  api POST /rest/v1/rpc/"$VOID_TRANSACTION" "$payload"
}

TOKEN="$OWNER_TOKEN"
OWNERS_ID="$(uuid)"
BOUGHT="$(buy "$OWNERS_ID" 6)"
note
if [[ "$(status "$BOUGHT")" == "200" ]]; then
  ok "record_purchase accepts a two-line delivery from the owner"
else
  fail "record_purchase refused: $(body "$BOUGHT")"; exit 1
fi

# --- 2. the RPC exists, with these argument names --------------------------
VOID_OUT="$(voidit purchase "$OWNERS_ID" "$REASON_DELETED")"
VOID_FILE="$(stash first-void "$VOID_OUT")"
note
case "$(status "$VOID_OUT")" in
  200) ok "$VOID_TRANSACTION answered 200 — the function, the three argument names and the grant" ;;
  404) fail "$VOID_TRANSACTION answered 404: $(body "$VOID_OUT")"
       echo "      ⚠️⚠️ PostgREST MATCHES BY PARAMETER NAME. A 404 here is the app and"
       echo "      the database disagreeing about the RPC's SHAPE, not about whether it"
       echo "      exists — which is the failure R13 was written for."
       exit 1 ;;
  *)   fail "$VOID_TRANSACTION answered $(status "$VOID_OUT"): $(body "$VOID_OUT")"
       echo "      ⚠️ 0021:448 revokes from public and grants execute to authenticated."
       echo "      If that grant is gone, 5h-ii-b has no write path and the plan's claim"
       echo "      that it ships no migration is false."
       exit 1 ;;
esac

# --- 3 and 4. the first void's body, and the replay's shorter one ----------
REPLAY_OUT="$(voidit purchase "$OWNERS_ID" "$REASON_DELETED")"
REPLAY_FILE="$(stash replay "$REPLAY_OUT")"
note
[[ "$(status "$REPLAY_OUT")" == "200" ]] \
  && ok "a second void of the same document answers 200 and not an error" \
  || fail "the replay answered $(status "$REPLAY_OUT"): $(body "$REPLAY_OUT")"

cat > "$SCRATCH/shape.py" <<'PY'
import json, sys
first_path, replay_path, voided = sys.argv[1:4]
first = json.load(open(first_path))
replay = json.load(open(replay_path))

for name, got in (('the first void', first), ('the replay', replay)):
    if not isinstance(got, dict):
        print('%s answered %r rather than an object' % (name, got)); raise SystemExit
    for key in ('voided', 'void_id', 'already_recorded'):
        if key not in got:
            print('%s carried %r — `voidedFrom` reads voided, void_id and '
                  'already_recorded, and a missing one is a null on the client'
                  % (name, sorted(got))); raise SystemExit
    if got['voided'] != voided:
        print('%s says it cancelled %r rather than %r' % (name, got['voided'], voided))
        raise SystemExit

if first['already_recorded'] is not False:
    print('the FIRST void reported already_recorded=%r' % first['already_recorded'])
    raise SystemExit
if replay['already_recorded'] is not True:
    print('the REPLAY reported already_recorded=%r — 0021:268 returns True when the '
          'void has already happened, and <kind>_one_reversal_idx is what makes that '
          'the only possible answer' % replay['already_recorded']); raise SystemExit
if replay['void_id'] != first['void_id']:
    print('the replay named a DIFFERENT compensating document (%r vs %r) — it wrote a '
          'second reversal, which <kind>_one_reversal_idx must forbid'
          % (replay['void_id'], first['void_id'])); raise SystemExit

# ⚠️⚠️ THE ASSERTION THAT KEEPS `voidedFrom` HONEST. The replay's body is SHORTER
# than the first void's — four keys against six — so a parser that required the
# counts would turn the idempotent success into a failure on exactly the tap
# somebody makes when the first response was lost.
missing = [k for k in ('lines', 'movements') if k not in first]
if missing:
    print('the first void carried no %r, so this check cannot show that the replay is '
          'shorter — and the claim voidedFrom is built on is unproven' % missing)
    raise SystemExit
extra = [k for k in ('lines', 'movements') if k in replay]
if extra:
    print('the replay carried %r. 5h-ii-b measured it NOT carrying them and voidedFrom '
          'reads three keys because of it; if 0021 now answers a full body, say so — '
          'this is the shape the client was built against' % extra); raise SystemExit

print('ok — first %r, replay %r' % (sorted(first), sorted(replay)))
PY
verdict "the replay is idempotent AND its body is shorter than the first void's" \
  "$SCRATCH/shape.py" "$VOID_FILE" "$REPLAY_FILE" "$OWNERS_ID"

# --- 5. the audit trail landed, accent and all -----------------------------
TRAIL="$(api GET "/rest/v1/purchase?select=id,reversal_of,reversal_reason&reversal_of=eq.$OWNERS_ID")"
TRAIL_FILE="$(stash trail "$TRAIL")"
cat > "$SCRATCH/trail.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
wanted = sys.argv[2]
if not isinstance(rows, list) or len(rows) != 1:
    print('expected exactly one compensating document, got %r' % (rows,)); raise SystemExit
got = rows[0]['reversal_reason']
if got != wanted:
    print('reversal_reason is %r and the app sends %r. ⚠️ If the two differ only in '
          'their accents, this is a UTF-8 failure between the phone and Postgres and '
          'not a wrong string' % (got, wanted)); raise SystemExit
print('ok — %r, stored exactly as src/strings.ts spells it' % got)
PY
verdict "the reason the app sends is the reason the ledger keeps" \
  "$SCRATCH/trail.py" "$TRAIL_FILE" "$REASON_DELETED"

# --- 6. a reversal cannot itself be voided ---------------------------------
VOID_ID="$(pick void_id "$(body "$VOID_OUT")")"
REVERSAL_OUT="$(voidit purchase "$VOID_ID" "$REASON_DELETED")"
note
if [[ "$(status "$REVERSAL_OUT")" == "400" && "$(pick code "$(body "$REVERSAL_OUT")")" == "TD003" ]]; then
  ok "a reversal cannot itself be voided — TD003, and documentsFrom never offers it"
else
  fail "voiding a reversal answered $(status "$REVERSAL_OUT"): $(body "$REVERSAL_OUT")"
fi

# --- 7. THE FENCE. the one case the client hides, and the three it shows ----
# ⚠️⚠️ `mayCorrect` HIDES EXACTLY ONE CASE — a cashier on somebody else's
# document — and shows the rest. Every one of the four is driven here, so a fence
# drawn too WIDE on the client (hiding a button she may press) goes red just as
# loudly as one drawn too narrow.
TOKEN="$OWNER_TOKEN"
OWNERS_SECOND="$(uuid)"
buy "$OWNERS_SECOND" 4 > /dev/null
TOKEN="$STAFF_TOKEN"
DENIED="$(voidit purchase "$OWNERS_SECOND" "$REASON_CORRECTED")"
note
if [[ "$(status "$DENIED")" == "400" && "$(pick code "$(body "$DENIED")")" == "TD003" ]]; then
  ok "a cashier may not void the owner's delivery — TD003 on a 400, which is the case mayCorrect hides"
else
  fail "a cashier voiding the owner's delivery answered $(status "$DENIED"): $(body "$DENIED")"
  echo "      ⚠️⚠️ THIS IS THE ASSERTION @/api/errors IS BUILT ON. TD003 must arrive as"
  echo "      the CODE on an HTTP 400 — a custom SQLSTATE is not a privilege error to"
  echo "      PostgREST, so if this is a 403 or a 500 the sentence a cashier reads is"
  echo "      'algo salió mal' and she taps again."
fi

# ⚠️ AND SHE VOIDS HER OWN. This is the case the client SHOWS, and it is the one
# Rosa actually uses.
STAFFS_ID="$(uuid)"
STAFF_BOUGHT="$(buy "$STAFFS_ID" 5)"
note
[[ "$(status "$STAFF_BOUGHT")" == "200" ]] \
  && ok "an Empleada records a delivery — no role fence on Comprar (the 24th ruling)" \
  || { fail "record_purchase refused the cashier: $(body "$STAFF_BOUGHT")"; }

HERS="$(voidit purchase "$STAFFS_ID" "$REASON_CORRECTED")"
note
if [[ "$(status "$HERS")" == "200" ]]; then
  ok "a cashier voids her OWN five-hour-old delivery inside a 15-minute window"
  echo "        ⚠️⚠️ AND THAT IS NOT A BUG. 0021 measures the window from recorded_at on"
  echo "        an offline write and occurred_at otherwise, so the clock starts when the"
  echo "        document LANDS — which is why the client cannot draw this boundary from"
  echo "        occurred_at, and why @/api/corrections leaves it to the database."
else
  fail "a cashier could not void her own document: $(status "$HERS") $(body "$HERS")"
fi

# --- 8. ⚠️⚠️ THE WINDOW IS THE SHOP'S SETTING AND NOT A CONSTANT ------------
# The same cashier, the same shape of document, refused at a window of 0 and
# allowed at 15. **This is the assertion the app cannot make**, because the app
# deliberately never reads `workspace_setting` — and it is what keeps that
# decision honest rather than merely convenient.
TOKEN="$OWNER_TOKEN"
SETTING_JSON='{"void_window_minutes":0}'
SET_OUT="$(api PATCH "/rest/v1/workspace_setting?workspace_id=eq.$WORKSPACE_ID" "$SETTING_JSON")"
note
if [[ "$(status "$SET_OUT")" == "200" && "$(first void_window_minutes "$(body "$SET_OUT")")" == "0" ]]; then
  ok "the owner narrowed this shop's void window to 0 minutes (0001:567, owners only)"
else
  fail "could not narrow the window: $(status "$SET_OUT") $(body "$SET_OUT")"
  echo "      Without this the next two assertions cannot distinguish a window that is"
  echo "      READ from one that is hardcoded, and both would pass vacuously."
  exit 1
fi

TOKEN="$STAFF_TOKEN"
NARROW_ID="$(uuid)"
buy "$NARROW_ID" 0 > /dev/null
NARROW="$(voidit purchase "$NARROW_ID" "$REASON_CORRECTED")"
note
if [[ "$(status "$NARROW")" == "400" && "$(pick code "$(body "$NARROW")")" == "TD003" ]]; then
  ok "at a 0-minute window she is refused her OWN brand-new delivery — the window is live"
else
  fail "at a 0-minute window the void answered $(status "$NARROW"): $(body "$NARROW")"
  echo "      ⚠️ 0021 reads workspace_setting.void_window_minutes and falls back to 15"
  echo "      when there is no row. If this passed, the window is not being read."
fi

TOKEN="$OWNER_TOKEN"
WIDEN_JSON='{"void_window_minutes":15}'
api PATCH "/rest/v1/workspace_setting?workspace_id=eq.$WORKSPACE_ID" "$WIDEN_JSON" > /dev/null
TOKEN="$STAFF_TOKEN"
WIDE="$(voidit purchase "$NARROW_ID" "$REASON_CORRECTED")"
note
if [[ "$(status "$WIDE")" == "200" ]]; then
  ok "the same document, the same cashier, allowed once the window is 15 again"
else
  fail "widening the window did not allow the void: $(status "$WIDE") $(body "$WIDE")"
fi

# ⚠️ A MANAGER-AND-ABOVE VOIDS ANYTHING AT ANY TIME, which is the last of the
# four fence cases and the one the owner himself is standing in.
TOKEN="$OWNER_TOKEN"
OWNER_ON_HERS="$(voidit purchase "$STAFFS_ID" "$REASON_DELETED")"
note
[[ "$(status "$OWNER_ON_HERS")" == "200" ]] \
  && ok "the owner voids the cashier's document — a replay here, and still 200" \
  || fail "the owner could not void the cashier's document: $(body "$OWNER_ON_HERS")"

# --- 9. ⚠️⚠️ THE RE-RECORD, WHICH IS THE WHOLE OF `Corregir` ----------------
# `record_purchase` is idempotent on the CLIENT-GENERATED id and guards it with
# `payload_hash` (`0018:455`). A corrected delivery carries the SAME lines under a
# NEW id, and if that were a TD001 this app would void a delivery and refuse to
# replace it — with nothing in the suite or the typecheck able to see it.
TOKEN="$OWNER_TOKEN"
REDONE_ID="$(uuid)"
REDONE="$(buy "$REDONE_ID" 0)"
note
if [[ "$(status "$REDONE")" == "200" ]]; then
  ok "the identical delivery re-records under a new id — no payload_hash collision"
else
  fail "the re-record answered $(status "$REDONE"): $(body "$REDONE")"
  echo "      ⚠️⚠️ THIS IS THE CLAIM Corregir STANDS ON. If it is a TD001, the void has"
  echo "      already happened and the shopkeeper cannot put the delivery back."
fi

# ⚠️ AND THE SAME ID IS STILL A REPLAY, which is the other half of §2.6 and the
# reason the re-record must mint a fresh one rather than reusing the original's.
SAME_AGAIN="$(buy "$REDONE_ID" 0)"
note
if [[ "$(status "$SAME_AGAIN")" == "200" \
      && "$(pick already_recorded "$(body "$SAME_AGAIN")")" == "True" ]]; then
  ok "the same id is still answered as a replay — §2.6's idempotency is untouched"
else
  ALREADY="$(pick already_recorded "$(body "$SAME_AGAIN")")"
  if [[ "$(status "$SAME_AGAIN")" == "200" && "$ALREADY" == "true" ]]; then
    ok "the same id is still answered as a replay — §2.6's idempotency is untouched"
  else
    fail "re-sending the same id answered $(status "$SAME_AGAIN") / already_recorded=$ALREADY: $(body "$SAME_AGAIN")"
  fi
fi

# --- 10. what `Lo último` shows afterwards, through the app's own read ------
# ⚠️⚠️ *"Just one line, clean"* — the owner's own answer, proven end to end. Four
# deliveries were written to this shop and three of them were voided; the read the
# app makes must carry every one of those documents AND their reversals, because
# it is `documentsFrom` that drops the pairs and not the database.
DOC_CONTRACT="app/src/api/documents.ts"
wrapped() { sed -n "/^export const $1 =/,/;/p" "$DOC_CONTRACT" | sed -n "s/.*'\([^']*\)'.*/\1/p" | head -1; }
HEAD_COLUMNS="$(wrapped DOCUMENTS_HEAD_COLUMNS)"
LINE_COLUMNS="$(wrapped DOCUMENTS_LINE_COLUMNS)"
READ_PATH="/rest/v1/purchase?select=$HEAD_COLUMNS,provider_id,purchase_line($LINE_COLUMNS)&order=occurred_at.desc,id.desc&purchase_line.order=product_variant(name).asc&limit=60"
AFTER="$(api GET "$READ_PATH")"
AFTER_FILE="$(stash after "$AFTER")"

cat > "$SCRATCH/after.py" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
redone, voided_ids, refused = sys.argv[2], set(sys.argv[3].split(',')), sys.argv[4]
if not isinstance(rows, list):
    print('the read came back as an error: %r' % (rows,)); raise SystemExit

by_id = {r['id']: r for r in rows}
reversed_ids = {r['reversal_of'] for r in rows if r.get('reversal_of')}

# ⚠️ BOTH HALVES OF EVERY VOID ARE ON THE WIRE. If the database hid them,
# documentsFrom's rule would be decorative and "just one line, clean" would be
# something nobody was doing.
for one in voided_ids:
    if one not in by_id:
        print('the voided document %s is NOT on the wire — the database is hiding it, '
              'so documentsFrom is not what makes the list clean' % one); raise SystemExit
    if one not in reversed_ids:
        print('no reversal points at %s, so the void wrote nothing' % one); raise SystemExit

# ⚠️ AND THE CLIENT'S RULE, APPLIED HERE: what a shopkeeper would actually see.
standing = [r['id'] for r in rows
            if not r.get('reversal_of') and r['id'] not in reversed_ids]
if redone not in standing:
    print('the re-recorded delivery %s does not stand; standing are %r'
          % (redone, standing)); raise SystemExit
for one in voided_ids:
    if one in standing:
        print('the voided delivery %s still stands after documentsFrom\'s rule — a '
              'shopkeeper would see the document she just corrected' % one)
        raise SystemExit

# ⚠️⚠️ AND A REFUSED VOID WROTE NOTHING. `TD003` is raised before the compensating
# document is inserted (`0021` §5 precedes §6) and the whole RPC is one
# transaction, so the delivery the cashier was refused must still STAND. A fence
# that refused and half-wrote would be the worst outcome available here, and it
# would look identical from the client.
if refused not in standing:
    print('the delivery the cashier was REFUSED (%s) no longer stands. TD003 is raised '
          'before the compensating document is written, so a refusal must leave the '
          'ledger exactly as it was' % refused); raise SystemExit

# ⚠️⚠️ THE ROUND TRIP prefillOf DEPENDS ON: the two columns nothing renders come
# back as the SAME DIGITS they were sent as. A rounding here re-records the ledger
# with a quantity nobody keyed, and there is no symptom on any screen.
lines = by_id[redone]['purchase_line']
got = sorted((l['qty_base'], l['unit_price_net_per_base']) for l in lines)
want = sorted([('2000.000', '0.030000'), ('12.000', '1.500000')])
if got != want:
    print('the re-recorded delivery came back as %r and was sent as %r — prefillOf '
          'puts these straight back into a cart, so a rounding here is a wrong number '
          'in the ledger with nothing on screen to show it' % (got, want))
    raise SystemExit
for value in [v for pair in got for v in pair]:
    if not isinstance(value, str):
        print('%r arrived as %s rather than a string — the ::text cast is gone'
              % (value, type(value).__name__)); raise SystemExit

print('ok — %d document(s) on the wire, %d standing, every void paired with its '
      'reversal and the refused one untouched' % (len(rows), len(standing)))
PY
# ⚠️ THE THREE THAT WERE VOIDED, AND THE ONE THAT WAS REFUSED — named separately
# because the check's first run passed the refused document as a voided one and
# went red. **That is the fixture being wrong rather than the app**, and the
# distinction is now an assertion of its own.
verdict "after three corrections the list reads clean, and the prefill columns round-trip" \
  "$SCRATCH/after.py" "$AFTER_FILE" "$REDONE_ID" \
  "$OWNERS_ID,$STAFFS_ID,$NARROW_ID" "$OWNERS_SECOND"

# --- the verdict -----------------------------------------------------------
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository: a check that asserted
# nothing must not be able to report success.
echo
if (( ran < 18 )); then
  echo "FAIL: only $ran assertion group(s) ran; this check has at least 18. Something"
  echo "      exited early and a green here would be vacuous."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — app/src/api/corrections.ts still describes"
  echo "the database: the RPC and its three arguments, TD003 on a 400, an idempotent"
  echo "replay with a shorter body, the fence in all four of its cases, a live window,"
  echo "and a voided delivery that can be re-recorded."
  exit 0
fi
echo "$fails assertion group(s) FAILED out of $ran."
exit 1

#!/usr/bin/env bash
# 5c-iii-dead-letter-contract — are the codes the app calls PERMANENT the codes
# this database actually raises, is the one it calls TRANSIENT really cleared by
# a retry, and does `record_failed_write` still downgrade a sale and leave a
# purchase alone?
#
# WHY THIS EXISTS, AND IT IS THE ONLY INSTRUMENT `5c-iii` HAS.
# `app/test/api-deadletter.test.ts` can prove the classification is consistent
# with itself: it drives `classify` over every code and asserts which side each
# one falls on. It cannot know whether those codes EXIST. Nothing in TypeScript
# has ever read `0016`–`0025`, and the whole of this task rests on two facts
# about the applied schema:
#
#   * that a permanently rejected write comes back as one of the codes on the
#     app's list, and that an EXPIRED SESSION does not — because `42501` means
#     "the caller may no longer write there" (§2.6's own example of a permanent
#     failure) AND is also what an absent session looks like app-wide, and
#     dead-lettering the second reading would downgrade a whole queue;
#   * that `record_failed_write` downgrades `sale` and `waste` and does NOT
#     downgrade `purchase` — the ledger-changing half, which is silent by design
#     (C10.5) and therefore has no shopkeeper to notice it going wrong.
#
# ⚠️⚠️ THE HALF OF THIS THAT CHANGES THE LEDGER IS THE HALF NOBODY WILL SEE. A
# downgrade reconciles QUANTITY and carries no revenue, no tax split and no
# batch attribution — §2.6: "stock stays true; margin goes quiet" — and §2.8
# sends the dead letter to the vendor rather than to the shop. So the only thing
# standing between a misclassification and a silently wrong ledger is this file.
#
# WHAT IT ASSERTS, all of it end to end over REAL HTTP against a real shop, as a
# real signed-in owner and never as the superuser:
#
#   1. The RPC's name, its SEVEN argument names, the permanent-code list and the
#      downgraded kinds are READ OUT OF `app/src/api/deadletter.ts` — not typed
#      in here. Every request below is BUILT from what was read, so a rename in
#      the app makes this check meet the 404 a shop would rather than merely
#      failing to find the old spelling.
#   2. A probe owner, a shop, a store and one sellable variant with stock
#      enforcement ON — which assertion 6 needs and nothing else does.
#   3. `record_failed_write` answers to exactly the names `reportArgs` builds,
#      and the same call with BARE names is `PGRST202`. Without the second half
#      the first is a check that met no drift.
#   4. ⚠️ THE THREE CODES §2.6 NAMES ARE THE THREE THIS DATABASE RAISES, and all
#      three are on the app's permanent list: `22023` for a variant that is not
#      in this workspace, `42501` for a location the caller may not write at,
#      and `TD001` for a re-send whose payload changed — which `0016` raises
#      with the detail *"This is not a retry. Dead-letter it (ADR-035 §2.6)."*
#   5. ⚠️⚠️ AND AN UNUSABLE TOKEN IS `PGRST301`, NOT `42501`. This is the whole
#      reason `42501` is safe to dead-letter: a refusal raised INSIDE the
#      function reaches the client as `42501`, and an expired session never
#      reaches the body at all. If that ever stops being true, every queued sale
#      on a phone with a stale token is downgraded.
#   6. ⚠️⚠️ `TD002` IS CLEARED BY THE VERY NEXT RETRY, WHICH IS WHY IT MUST NOT
#      BE ON THE LIST. "Not enough stock" is the most permanent-looking refusal
#      in the schema; `0017` and `0020` both guard it with `if v_enforce and not
#      v_offline`, and the flush sets `recorded_offline` from `attempts > 1`. So
#      the same uuid that was refused lands in FULL on its second attempt, and
#      dead-lettering it would downgrade a sale that was about to be recorded
#      properly. Measured as a pair: refused online, landed offline.
#   7. ⚠️⚠️ THE DOWNGRADE PAIR — `0024`'s own section-5 shape, driven from the
#      client's side. A dead-lettered SALE and a dead-lettered PURCHASE with the
#      same variant, the same quantity and the same store: the sale moves the
#      shelf and the purchase does not, so nothing but the kind can explain the
#      difference. The movement names its dead letter, which is what makes the
#      downgrade recoverable (§2.6 step 3, "not optional").
#   8. ⚠️ A RE-REPORT DOES NOT MOVE THE SHELF TWICE. `adjust_stock_delta` has no
#      idempotency key of its own — `0024` decision 7 — so the primary key is
#      the whole of it, and the flush re-reports freely after a crash.
#   9. ⚠️ THE PAYLOAD IS STORED WITH ITS KEYS BARE, which is what `0026` reads,
#      and a dead-lettered TRANSFER names its ORIGIN store. A transfer's payload
#      has no `location_id` at all, so left to the server's default it would land
#      with a NULL location and §2.10's nightly check could not attribute it.
#
# ⚠️ WHAT IT DOES NOT ASSERT, NAMED RATHER THAN LEFT TO BE FOUND:
#
#   * THE DRAIN. Whether a permanent failure actually reaches this function, in
#     what order, and what the row becomes afterwards is `app/test/
#     api-flush.test.ts` over injected ports. Report-before-reject is asserted
#     there, because it is a fact about the loop and not about the schema.
#   * THE SQLITE HALF. `@/lib/outboxDb` imports a native module, so no node
#     process loads it; `workspace_id` reaching a `queued_write` row is argued in
#     that file and will first run on a device.
#   * REPLAY. `replay_failed_write` (`0026`) is not called here and is not built:
#     §2.6 says replay is manual, and `4.6b` shipped its manager fence. What this
#     check does assert is the thing replay NEEDS — the payload stored bare.
#   * ANYTHING ABOUT A SCREEN. §2.11 keeps rendering out of scope, and C10.5
#     keeps this whole event off a shopkeeper's screen anyway. The banner is
#     `5c-iv`.
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. The trap eleven other checks here already record.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5c-iii-dead-letter-contract.sh
# With: a path to the dead-letter contract as $1 and the workspace contract as
#       $2, which is how the falsification harness points it at mutated copies.
# Exit: 0 when the applied schema answers what the classification assumes.

set -uo pipefail

DEADLETTER="${1:-app/src/api/deadletter.ts}"
WORKSPACE="${2:-app/src/api/workspace.ts}"
for f in "$DEADLETTER" "$WORKSPACE"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f"; exit 1; }
done

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# Is $1 one of the codes the app calls permanent?
is_permanent() {
  local needle="$1" c
  for c in $PERM_CODES; do [[ "$c" == "$needle" ]] && return 0; done
  return 1
}

# --- 1. the app's own claims, read out of its source ------------------------
# ⚠️ EVERY NAME IS READ AS A SPELLING AND EVERY REQUEST IS BUILT FROM IT. A
# check that greps for the name it expects can only ever report "not found", and
# the defect this file exists for is a name that CHANGED and now 404s in a shop.
# `5c-ii-a`'s harness found exactly that defect in two of its own readers.
note
RPC="$(sed -n "s/^export const RECORD_FAILED_WRITE = '\([a-z_]*\)';.*/\1/p" "$DEADLETTER" | head -1)"
# The seven arguments, each read by the ROLE it fills rather than by its name.
ARG_ID="$(sed -n 's/^    \(p_[a-z_]*\): write\.id,.*/\1/p' "$DEADLETTER" | head -1)"
ARG_KIND="$(sed -n 's/^    \(p_[a-z_]*\): write\.kind,.*/\1/p' "$DEADLETTER" | head -1)"
ARG_WS="$(sed -n 's/^    \(p_[a-z_]*\): write\.workspaceId,.*/\1/p' "$DEADLETTER" | head -1)"
ARG_PAYLOAD="$(sed -n 's/^    \(p_[a-z_]*\): write\.payload,.*/\1/p' "$DEADLETTER" | head -1)"
ARG_CODE="$(sed -n 's/^    \(p_[a-z_]*\): failure\.code,.*/\1/p' "$DEADLETTER" | head -1)"
ARG_DETAIL="$(sed -n 's/^    \(p_[a-z_]*\): failure\.detail,.*/\1/p' "$DEADLETTER" | head -1)"
ARG_LOC="$(sed -n 's/^    \(p_[a-z_]*\): locationOf(write\.payload),.*/\1/p' "$DEADLETTER" | head -1)"
# The permanent list, as the app spells it. `42501` is quoted and `TD001` is
# not, because one is a valid identifier and the other is not — so both forms
# are read rather than one being assumed.
PERM_CODES="$(sed -n '/^export const PERMANENT_CODES/,/^};/p' "$DEADLETTER" \
  | sed -n "s/^  '\{0,1\}\([A-Za-z0-9]\{1,\}\)'\{0,1\}:.*/\1/p" | tr '\n' ' ')"
# The kinds the app says the SERVER downgrades. It does not decide this; it
# records it, and assertion 7 is what says the record is true.
DOWNGRADED="$(sed -n "s/^export const DOWNGRADED_KINDS = \[\(.*\)\] as const;.*/\1/p" "$DEADLETTER" \
  | tr -d "' " | tr ',' ' ')"
# ⚠️ AND THE KEYS `locationOf` LOOKS FOR, IN ITS OWN ORDER. Assertion 9 reads
# the transfer's store out of the payload using THIS list, so dropping
# `from_location_id` in the app makes the check send what the app would send —
# a dead letter with no store — rather than quietly using its own answer.
LOC_KEYS="$(sed -n "s/^  for (const key of \[\(.*\)\]) {.*/\1/p" "$DEADLETTER" | tr -d "'\" " | tr ',' ' ')"
ONBOARD="$(sed -n "s/^export const ONBOARD_WORKSPACE = '\([^']*\)';.*/\1/p" "$WORKSPACE" | head -1)"

if [[ -z "$RPC" || -z "$ARG_ID" || -z "$ARG_KIND" || -z "$ARG_WS" || -z "$ARG_PAYLOAD" \
   || -z "$ARG_CODE" || -z "$ARG_DETAIL" || -z "$ARG_LOC" || -z "$PERM_CODES" \
   || -z "$DOWNGRADED" || -z "$LOC_KEYS" || -z "$ONBOARD" ]]; then
  fail "could not read the dead letter's contract out of $DEADLETTER"
  echo "      rpc='$RPC' args='$ARG_ID $ARG_KIND $ARG_WS $ARG_PAYLOAD $ARG_CODE $ARG_DETAIL $ARG_LOC'"
  echo "      permanent='$PERM_CODES' downgraded='$DOWNGRADED' location keys='$LOC_KEYS'"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $DEADLETTER: $RPC, seven arguments, permanent [$PERM_CODES], downgraded [$DOWNGRADED]"

# --- the local stack --------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE. The secret key bypasses RLS,
# and every assertion below would then be measuring the superuser rather than the
# shopkeeper — the vacuity supabase/README.md records for `postgres`.
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
field()  { python3 -c 'import sys,json; d=json.load(sys.stdin); print(d[0][sys.argv[1]] if isinstance(d,list) else d.get(sys.argv[1],""))' "$1" <<< "$2" 2>/dev/null; }
code()   { field code "$1"; }
uuid()   { python3 -c 'import uuid;print(uuid.uuid4())'; }

# --- 2. a shop, a store and something to sell -------------------------------
note
EMAIL="5c-iii-contract-$$-$(date +%s)@example.com"
SIGNUP_JSON="{\"email\":\"$EMAIL\",\"password\":\"contract-probe-123\"}"
SIGNUP="$(TOKEN="" api POST /auth/v1/signup "$SIGNUP_JSON")"
TOKEN="$(python3 -c 'import sys,json; print(json.load(sys.stdin).get("access_token",""))' <<< "$(body "$SIGNUP")")"
[[ -n "$TOKEN" ]] || { echo "FAIL: could not sign a probe user in — $(body "$SIGNUP")"; exit 1; }

SHOP="$(api POST "/rest/v1/rpc/$ONBOARD" '{"p_display_name":"Dead letter 5c-iii","p_prices_include_tax":true,"p_location_name":null}')"
WS="$(body "$SHOP" | tr -d '"')"
LOCATION="$(field id "$(body "$(api GET '/rest/v1/location?select=id')")")"
PROVIDER="$(field id "$(body "$(api GET '/rest/v1/provider?select=id')")")"
# ⚠️ ONE CALL PER LINE, AND NOT NESTED INSIDE ANOTHER `$( )` WITH THE JSON
# INLINE. A JSON object written inline in a nested command substitution loses its
# quoting and bash BRACE-EXPANDS it into two words; PostgREST answers `PGRST102
# Empty or invalid json`, which reads like a schema problem and is a shell one.
FAMILY_JSON="{\"workspace_id\":\"$WS\",\"name\":\"Abarrotes\"}"
FAMILY_RAW="$(api POST /rest/v1/product_family "$FAMILY_JSON")"
FAMILY="$(field id "$(body "$FAMILY_RAW")")"
# ⚠️ `enforce_stock` IS ON, AND ONLY ASSERTION 6 NEEDS IT. `0017` leaves the
# check dormant on every workspace by default, so a variant that does not
# enforce can never raise the `TD002` this check exists to prove is transient.
VARIANT_JSON="{\"workspace_id\":\"$WS\",\"family_id\":\"$FAMILY\",\"name\":\"Lata\",\"base_unit_code\":\"pza\",\"purchase_unit_code\":\"pza\",\"sell_unit_code\":\"pza\",\"price_unit_code\":\"pza\",\"enforce_stock\":true}"
VARIANT_RAW="$(api POST /rest/v1/product_variant "$VARIANT_JSON")"
VARIANT="$(field id "$(body "$VARIANT_RAW")")"
if [[ -n "$WS" && -n "$LOCATION" && -n "$PROVIDER" && -n "$VARIANT" ]]; then
  ok "a probe owner with one shop, one store, one provider and one enforced variant"
else
  fail "could not build a shop to fail in: ws='$WS' location='$LOCATION' provider='$PROVIDER' variant='$VARIANT'"
  echo "      Everything below would then be asserting against a refusal rather"
  echo "      than against a rejected sale."
  exit 1
fi

AT="$(python3 -c 'import datetime;print(datetime.datetime.now(datetime.timezone.utc).isoformat())')"
NOWHERE='00000000-0000-4000-8000-00000000dead'

# The payload a queued write stores — argument names, KEYS BARE, because that is
# what `0026` reads (`0024` decision 5). Built once and reused, so the sale and
# the purchase below differ by nothing but their kind.
sale_payload() { # qty
  echo "{\"location_id\":\"$LOCATION\",\"lines\":[{\"variant_id\":\"$VARIANT\",\"qty_display\":$1,\"unit_price_gross_per_base\":10}],\"occurred_at\":\"$AT\",\"recorded_offline\":true}"
}
report() { # id kind payload error_code [location — empty means the json null]
  local loc="${5-$LOCATION}" locj
  if [[ -z "$loc" ]]; then locj="null"; else locj="\"$loc\""; fi
  local json="{\"$ARG_ID\":\"$1\",\"$ARG_KIND\":\"$2\",\"$ARG_WS\":\"$WS\",\"$ARG_PAYLOAD\":$3,\"$ARG_CODE\":\"$4\",\"$ARG_DETAIL\":\"measured by 5c-iii\",\"$ARG_LOC\":$locj}"
  api POST "/rest/v1/rpc/$RPC" "$json"
}
sale() { # id qty recorded_offline -> the RPC reply
  local json="{\"p_id\":\"$1\",\"p_location_id\":\"$LOCATION\",\"p_lines\":[{\"variant_id\":\"$VARIANT\",\"qty_display\":$2,\"unit_price_gross_per_base\":10}],\"p_occurred_at\":\"$AT\",\"p_recorded_offline\":$3}"
  api POST /rest/v1/rpc/record_sale "$json"
}

# --- 3. the report's argument names are the ones the function answers to ----
note
FIRST_FW="$(uuid)"
FILED="$(report "$FIRST_FW" sale "$(sale_payload 3)" 22023)"
BARE_JSON="{\"id\":\"$(uuid)\",\"kind\":\"sale\",\"workspace_id\":\"$WS\",\"payload\":$(sale_payload 3),\"error_code\":\"22023\"}"
BARE="$(api POST "/rest/v1/rpc/$RPC" "$BARE_JSON")"
if [[ "$(status "$FILED")" == "200" ]] && grep -q 'PGRST202' <<< "$(body "$BARE")"; then
  ok "$RPC answers to exactly the seven names reportArgs builds, and to no bare one"
else
  fail "$RPC: HTTP $(status "$FILED") — $(body "$FILED")"
  echo "      and the bare-name call answered $(status "$BARE") $(body "$BARE")"
  echo "      A 404 with code PGRST202 on the first is the whole reason this check"
  echo "      exists: the app and the applied schema disagree about what the"
  echo "      arguments are called, and nothing in the typecheck or the Vitest"
  echo "      suite can see it. A 200 on the SECOND means assertion 3 is proving"
  echo "      nothing, because the prefix would not be load-bearing."
fi

# --- 4. the three codes §2.6 names are the three this database raises -------
note
# ⚠️⚠️ EACH BODY IS BUILT INTO A VARIABLE FIRST, AND THAT IS THE SHELL TRAP THIS
# REPOSITORY HAS NOW MET TWICE. A JSON object written inline inside a nested
# `$( )` loses its quoting and bash BRACE-EXPANDS it into two arguments;
# PostgREST answers `PGRST102 Empty or invalid json`, and this very assertion
# then reports that the database "raises PGRST102 for a deleted variant" — a
# shell bug wearing a schema bug's clothes, and one that would have been written
# into the app's permanent list as a real code.
VARIANT_GONE_JSON="{\"p_id\":\"$(uuid)\",\"p_location_id\":\"$LOCATION\",\"p_lines\":[{\"variant_id\":\"$NOWHERE\",\"qty_display\":1,\"unit_price_gross_per_base\":10}],\"p_occurred_at\":null,\"p_recorded_offline\":false}"
VARIANT_GONE="$(api POST /rest/v1/rpc/record_sale "$VARIANT_GONE_JSON")"
C_PAYLOAD="$(code "$(body "$VARIANT_GONE")")"
NO_LOCATION_JSON="{\"p_id\":\"$(uuid)\",\"p_location_id\":\"$NOWHERE\",\"p_lines\":[],\"p_occurred_at\":null,\"p_recorded_offline\":false}"
NO_LOCATION="$(api POST /rest/v1/rpc/record_sale "$NO_LOCATION_JSON")"
C_LOCATION="$(code "$(body "$NO_LOCATION")")"
# TD001 needs a sale that LANDED first, under a uuid we then re-send changed.
TD001_ID="$(uuid)"
sale "$TD001_ID" 2 true > /dev/null
C_CHANGED="$(code "$(body "$(sale "$TD001_ID" 7 true)")")"
missing=""
for pair in "$C_PAYLOAD:a deleted variant" "$C_LOCATION:a location the caller lost" \
            "$C_CHANGED:a re-send whose payload changed"; do
  got="${pair%%:*}"; what="${pair#*:}"
  [[ -n "$got" ]] || { missing="$missing [$what raised nothing]"; continue; }
  is_permanent "$got" || missing="$missing [$what raises $got, which the app retries]"
done
if [[ -z "$missing" ]]; then
  ok "the three §2.6 names — $C_PAYLOAD, $C_LOCATION, $C_CHANGED — are all on the app's permanent list"
else
  fail "a permanently rejected write would be retried forever:$missing"
  echo "      §2.6's Permanent row is \"42501 location not accessible after a"
  echo "      membership change; a constraint; a variant deleted between capture"
  echo "      and flush\". A code this database raises and the app does not"
  echo "      recognise is a sale that never lands and, since the drain stops at"
  echo "      the first transient failure, every write behind it blocked too."
fi

# --- 5. ⚠️⚠️ an unusable token is PGRST301, not 42501 -----------------------
# The distinction the whole of `42501`'s entry rests on. A refusal raised INSIDE
# the function is `42501`; an expired or unacceptable session never reaches the
# body. If these ever collapsed into one code, the app would have to choose
# between retrying a membership change forever and downgrading a whole queue the
# first time a token went stale in a shop with no signal.
note
GOOD_TOKEN="$TOKEN"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4Iiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjE1MDAwMDAwMDB9.notasignature"
STALE="$(sale "$(uuid)" 1 false)"
C_STALE="$(code "$(body "$STALE")")"
TOKEN="$GOOD_TOKEN"
if [[ -n "$C_STALE" && "$C_STALE" != "$C_LOCATION" ]] && ! is_permanent "$C_STALE"; then
  ok "an unusable session is $C_STALE and a refused location is $C_LOCATION — different codes, and only one is dead-lettered"
else
  fail "an unusable session answered '$C_STALE' (HTTP $(status "$STALE")); a refused location answers '$C_LOCATION'"
  echo "      If they are the same code, or if the session code is on the app's"
  echo "      permanent list, then the first time a token goes stale on a phone"
  echo "      with a full queue EVERY QUEUED SALE IS DEAD-LETTERED — each one"
  echo "      downgrading the shelf and losing its revenue, tax split and batch"
  echo "      attribution, silently (C10.5). This is the assertion that makes"
  echo "      42501 safe to dead-letter at all."
fi

# --- 6. ⚠️⚠️ TD002 is cleared by the very next retry -----------------------
note
TD002_ID="$(uuid)"
SHORT="$(sale "$TD002_ID" 5 false)"
C_SHORT="$(code "$(body "$SHORT")")"
# The SAME uuid and the SAME lines, sent as the flush's second attempt would.
AGAIN="$(sale "$TD002_ID" 5 true)"
LANDED="$(field sale_id "$(body "$AGAIN")")"
if [[ -n "$C_SHORT" ]] && ! is_permanent "$C_SHORT" && [[ "$(status "$AGAIN")" == "200" && -n "$LANDED" ]]; then
  ok "$C_SHORT refused the write online and the identical retry LANDED offline — so retrying it is right and dead-lettering it would lose a sale"
else
  fail "the short-stock refusal was '$C_SHORT' and the offline retry answered $(status "$AGAIN") $(body "$AGAIN")"
  echo "      0017 and 0020 guard the availability check with \`if v_enforce and"
  echo "      not v_offline\`, and the flush sets recorded_offline from"
  echo "      \`attempts > 1\` — so the second attempt skips the very check that"
  echo "      raised. If this code is on the app's permanent list, a sale the"
  echo "      retry was about to record IN FULL is instead downgraded: the stock"
  echo "      is reconciled and the money disappears from Números."
fi

# --- 7. ⚠️⚠️ the downgrade pair — same variant, same quantity, same store --
note
PUR_FW="$(uuid)"
PUR_PAYLOAD="{\"location_id\":\"$LOCATION\",\"provider_id\":\"$PROVIDER\",\"lines\":[{\"variant_id\":\"$VARIANT\",\"qty_display\":3,\"unit_cost_net_per_base\":5}],\"occurred_at\":\"$AT\",\"recorded_offline\":true}"
PURCHASE="$(report "$PUR_FW" purchase "$PUR_PAYLOAD" 22023)"
SALE_DOWN="$(field downgraded "$(body "$FILED")")"
PUR_DOWN="$(field downgraded "$(body "$PURCHASE")")"
PUR_WHY="$(field downgrade_skipped "$(body "$PURCHASE")")"
MOVES_RAW="$(api GET "/rest/v1/stock_movement?select=failed_write_id,qty_base,adjustment_reason&failed_write_id=eq.$FIRST_FW")"
MOVES="$(python3 -c 'import sys,json;print(len(json.load(sys.stdin)))' <<< "$(body "$MOVES_RAW")" 2>/dev/null)"
PUR_MOVES_RAW="$(api GET "/rest/v1/stock_movement?select=failed_write_id&failed_write_id=eq.$PUR_FW")"
PUR_MOVES="$(python3 -c 'import sys,json;print(len(json.load(sys.stdin)))' <<< "$(body "$PUR_MOVES_RAW")" 2>/dev/null)"
REASON="$(field adjustment_reason "$(body "$MOVES_RAW")")"
SAYS_SALE=no; SAYS_PURCHASE=no
for k in $DOWNGRADED; do
  [[ "$k" == "sale" ]] && SAYS_SALE=yes
  [[ "$k" == "purchase" ]] && SAYS_PURCHASE=yes
done
if [[ "$SALE_DOWN" == "True" && "$PUR_DOWN" == "False" && "$MOVES" == "1" && "$PUR_MOVES" == "0" \
   && "$REASON" == "failed_write_downgrade" && "$SAYS_SALE" == "yes" && "$SAYS_PURCHASE" == "no" ]]; then
  ok "the sale downgraded (1 movement, named its dead letter) and the purchase did not ($PUR_WHY) — and the app says the same"
else
  fail "the pair disagreed: sale downgraded=$SALE_DOWN over $MOVES movement(s) reason='$REASON'; purchase downgraded=$PUR_DOWN ($PUR_WHY) over $PUR_MOVES; the app's list is [$DOWNGRADED]"
  echo "      §2.6 as amended 2026-09-05: downgrade the kinds where the stock is"
  echo "      GONE and nobody will re-enter it. A rejected purchase leaves the"
  echo "      delivery ON the shelf with a manager holding the note, and an"
  echo "      auto-upgrade would open a zero-cost lot and then DOUBLE the shelf"
  echo "      the moment Comprar records it properly. ⚠️ The movement must also"
  echo "      NAME its dead letter: without the link, the downgrade and any later"
  echo "      replay each remove the same units and the ledger is short by"
  echo "      exactly one sale."
fi

# --- 8. a re-report is a no-op, not a second downgrade ---------------------
note
AGAIN_FW="$(report "$FIRST_FW" sale "$(sale_payload 3)" 22023)"
AGAIN_FLAG="$(field already_recorded "$(body "$AGAIN_FW")")"
AGAIN_DOWN="$(field downgraded "$(body "$AGAIN_FW")")"
AFTER_RAW="$(api GET "/rest/v1/stock_movement?select=failed_write_id&failed_write_id=eq.$FIRST_FW")"
AFTER="$(python3 -c 'import sys,json;print(len(json.load(sys.stdin)))' <<< "$(body "$AFTER_RAW")" 2>/dev/null)"
if [[ "$AGAIN_FLAG" == "True" && "$AGAIN_DOWN" == "False" && "$AFTER" == "1" ]]; then
  ok "the same dead letter reported twice: already_recorded, no second downgrade, still ONE movement"
else
  fail "the re-report read already_recorded=$AGAIN_FLAG downgraded=$AGAIN_DOWN over $AFTER movement(s)"
  echo "      0024 decision 7: adjust_stock_delta has no idempotency key of its"
  echo "      own, so failed_write's primary key is the whole of it. The flush"
  echo "      re-reports freely — a row left \`flushing\` by a crash is re-queued"
  echo "      and tried again — so a second report that moved the shelf again"
  echo "      would take the stock down twice for one rejected sale."
fi

# --- 9. the payload is stored bare, and a transfer names its origin --------
note
TRANSFER_FW="$(uuid)"
TRANSFER_PAYLOAD="{\"from_location_id\":\"$LOCATION\",\"to_location_id\":\"$NOWHERE\",\"lines\":[{\"variant_id\":\"$VARIANT\",\"qty_display\":1}],\"occurred_at\":\"$AT\"}"
# ⚠️ THE LOCATION IS PICKED BY THE APP'S OWN KEY LIST, IN THE APP'S OWN ORDER —
# `locationOf`, read as a spelling in assertion 1. So a client that stopped
# looking for `from_location_id` makes this send what that client would send.
TR_LOC="$(python3 -c 'import sys,json;d=json.load(sys.stdin);ks=sys.argv[1].split();print(next((d[k] for k in ks if isinstance(d.get(k),str) and d[k].strip()), ""))' "$LOC_KEYS" <<< "$TRANSFER_PAYLOAD")"
report "$TRANSFER_FW" transfer "$TRANSFER_PAYLOAD" 22023 "$TR_LOC" > /dev/null
STORED_RAW="$(api GET "/rest/v1/failed_write?select=id,kind,payload,location_id&id=eq.$FIRST_FW")"
STORED_KEYS="$(python3 -c 'import sys,json;d=json.load(sys.stdin);print(" ".join(sorted(d[0]["payload"].keys())) if d else "")' <<< "$(body "$STORED_RAW")" 2>/dev/null)"
TRANSFER_RAW="$(api GET "/rest/v1/failed_write?select=location_id&id=eq.$TRANSFER_FW")"
TRANSFER_LOC="$(field location_id "$(body "$TRANSFER_RAW")")"
if [[ "$STORED_KEYS" == "lines location_id occurred_at recorded_offline" \
   && "$TRANSFER_LOC" == "$LOCATION" ]]; then
  ok "the payload came back keyed '$STORED_KEYS' — bare, as 0026 reads it — and the transfer named its origin store"
else
  fail "the stored payload keys were '$STORED_KEYS' and the transfer's location was '$TRANSFER_LOC' (expected '$LOCATION')"
  echo "      0024 decision 5 stores the payload as the original call's arguments"
  echo "      KEYED BY ARGUMENT NAME, and replay_failed_write reads that object"
  echo "      directly — payload->'lines', payload->>'occurred_at'. A p_-prefixed"
  echo "      copy would store, dead-letter and downgrade perfectly and be found"
  echo "      on the day somebody first tried to REPLAY one. ⚠️ And a transfer's"
  echo "      payload has no location_id at all (0020 takes from_/to_), so a dead"
  echo "      letter that did not send one explicitly would land with a NULL"
  echo "      location and §2.10's nightly check could not attribute it."
fi

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that skipped everything
# looks like.
EXPECTED=9
if (( ran < EXPECTED )); then
  echo "FAIL: only $ran assertion groups ran, expected $EXPECTED — this check"
  echo "      asserted almost nothing and was about to report success."
  exit 1
fi
if (( fails > 0 )); then
  echo "$ran assertion groups ran, $fails failed — the classification and the"
  echo "applied schema disagree about what is permanent, and the half that goes"
  echo "wrong changes the ledger without telling anybody."
  exit 1
fi
echo "all $ran assertion groups passed — the codes the app dead-letters are the"
echo "codes this database raises, the one it retries is the one a retry clears,"
echo "and a rejected sale still moves the shelf where a rejected purchase does not."

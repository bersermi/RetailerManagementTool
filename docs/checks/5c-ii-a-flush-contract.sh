#!/usr/bin/env bash
# 5c-ii-a-flush-contract — does the applied database answer to what a FLUSH
# sends, is a re-send under one uuid still a success rather than a second sale,
# and does `recorded_offline` still decide which day a sale counts on?
#
# WHY THIS EXISTS, AND IT IS THE INSTRUMENT THE SPLIT WAS MADE AROUND.
# `app/test/api-flush.test.ts` can prove the flush is consistent with itself: it
# drives the whole drain over injected ports and never touches Postgres. Nothing
# in TypeScript has ever read `0016`, `0025` or `0026` — and PostgREST matches an
# RPC BY ITS PARAMETER NAMES, so a `p_` name that drifts is not a type error, it
# is a 404 the typecheck, the suite and the bundler all pass straight over,
# reaching a shopkeeper as a queue that never empties.
#
# ⚠️⚠️ AND THE ARGUMENT NAMES HERE ARE NOT TYPED OUT ANYWHERE IN THE APP. Every
# other `src/api/` module writes its `p_` names as literals; this one builds them
# as `p_` + the payload's own keys, because `0024` decision 5 stores
# `failed_write.payload` as the original call's arguments KEYED BY ARGUMENT NAME
# and `replay_failed_write` reads that object directly. So the prefix rule is the
# contract, and assertion 4 is what says it is load-bearing rather than
# decorative: the bare key is a 404 and the prefixed one is not.
#
# WHAT IT ASSERTS, all of it end to end over REAL HTTP against a real shop, as a
# real signed-in owner and never as the superuser:
#
#   1. The four RPC names and the three arguments the flush owns are READ OUT OF
#      `app/src/api/flush.ts` — not typed in here. A second copy of a contract is
#      the defect this repository has recorded eleven times.
#   2. A probe owner, a shop, a store and one sellable variant exist — so
#      everything below is a real sale and not a refusal that happens to differ.
#   3. `record_sale` answers to exactly the argument names `sendArgs` builds.
#   4. ⚠️⚠️ THE PREFIX IS THE CONTRACT: the SAME call with the payload's bare
#      `location_id` is `PGRST202`. Without this, 3 is a check that met no drift
#      rather than one that can see drift.
#   5. ⚠️⚠️ RETRIES ARE FREE. The same uuid sent twice answers `already_recorded`
#      false then true, and there is exactly ONE sale on the server. This is the
#      whole of §2.6's idempotency, measured on the path the flush uses.
#   6. ⚠️ ONE GROUP, BOTH DIRECTIONS, and it is one rather than two on purpose:
#      an ONLINE write has its `occurred_at` OVERRIDDEN with the server's now()
#      whatever the device sent, and an OFFLINE write keeps the client's time.
#      Only the pair can tell a value being carried from a value being defaulted.
#   7. ⚠️⚠️ THE OMISSION CASE, AND IT IS THE REASON `occurredAt` HAS A FALLBACK
#      AT ALL: an offline write sent with a NULL `p_occurred_at` is stamped with
#      the moment of the flush. `0025` coalesces it into `now()` and raises
#      nothing — so a 09:00 sale drained at 14:00 would count on the wrong day,
#      silently, and this is the measurement that says so.
#   8. All FOUR `record_*` functions answer to the argument sets the flush would
#      build for their kinds — a queued transfer that no function answers to is a
#      write that can never leave the phone.
#   9. ⚠️ `p_replay_of_failed_write_id` IS A REAL ARGUMENT THAT WOULD BE ACCEPTED.
#      The flush strips it by name (`0025` fences it at manager and exempts the
#      write from the clamp AND the 15-minute void window), and this is what
#      makes that exclusion a decision rather than a no-op.
#
# ⚠️ WHAT IT DOES NOT ASSERT, NAMED RATHER THAN LEFT TO BE FOUND:
#
#   * WHEN A FLUSH RUNS. Nothing in `5c-ii-a` decides that — no timer, no
#     listener, no connectivity. That is `5c-ii-b`, and its instrument is two
#     devices rather than anything in this repository.
#   * TRANSIENT AGAINST PERMANENT. Every failure in this half is a retry; the
#     classification and `record_failed_write` are `5c-iii`.
#   * THE SQLITE HALF. `@/lib/outboxDb` and `@/lib/flushRunner` import native
#     modules, so no node process loads them; the ports are injected and the
#     suite drives fakes. What the real four do is argued in those files.
#   * ANYTHING ABOUT A SCREEN. §2.11 keeps rendering out of scope, and this half
#     renders nothing at all.
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. The trap ten other checks here already recorded.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5c-ii-a-flush-contract.sh
# With: a path to the flush contract as $1 and the workspace contract as $2,
#       which is how the falsification harness points it at mutated copies.
# Exit: 0 when the applied functions answer what the flush sends; 1 otherwise.

set -uo pipefail

FLUSH="${1:-app/src/api/flush.ts}"
WORKSPACE="${2:-app/src/api/workspace.ts}"
for f in "$FLUSH" "$WORKSPACE"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f"; exit 1; }
done

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# --- 1. the app's own claims, read out of its source ------------------------
note
RPC_SALE="$(sed -n "s/^  sale: '\([a-z_]*\)',.*/\1/p" "$FLUSH" | head -1)"
RPC_PURCHASE="$(sed -n "s/^  purchase: '\([a-z_]*\)',.*/\1/p" "$FLUSH" | head -1)"
RPC_WASTE="$(sed -n "s/^  waste: '\([a-z_]*\)',.*/\1/p" "$FLUSH" | head -1)"
RPC_TRANSFER="$(sed -n "s/^  transfer: '\([a-z_]*\)',.*/\1/p" "$FLUSH" | head -1)"
# ⚠️ ALL THREE ARE READ AS SPELLINGS, for the reason the prefix is: a check that
# greps for the name it expects can only report "not found", and the defect this
# file exists for is a name that CHANGED and now 404s in a shop.
ARG_ID="$(sed -n 's/^.*= { \([a-z_]*\): write\.id };.*/\1/p' "$FLUSH" | head -1)"
ARG_AT="$(sed -n 's/^  args\.\([a-z_]*\) = occurredAt(write);.*/\1/p' "$FLUSH" | head -1)"
ARG_OFF="$(sed -n 's/^  args\.\([a-z_]*\) = recordedOffline(write);.*/\1/p' "$FLUSH" | head -1)"
# ⚠️⚠️ THE PREFIX IS READ AS A SPELLING TOO, AND EVERY REQUEST BELOW IS BUILT
# FROM IT. So a rename in `@/api/flush` makes this check SEND the new name and
# meet the PGRST202 a shop would — rather than merely failing to find the old
# one, which is a check agreeing with itself.
PFX="$(sed -n 's/.*args\[`\([a-z_]*\)[$]{key}`\].*/\1/p' "$FLUSH" | head -1)"
# ⚠️ READ AS A SPELLING, NOT MATCHED AS A LITERAL. A check that greps for the
# key it expects can only ever report "not found" — it would never discover that
# the app now strips a DIFFERENT name, which is the form this defect takes.
REFUSED="$(sed -n "s/^const NEVER_FROM_A_DEVICE = \['recorded_offline', '\([a-z_]*\)'\].*/\1/p" "$FLUSH" | head -1)"
ONBOARD="$(sed -n "s/^export const ONBOARD_WORKSPACE = '\([^']*\)';.*/\1/p" "$WORKSPACE" | head -1)"

if [[ -z "$RPC_SALE" || -z "$RPC_PURCHASE" || -z "$RPC_WASTE" || -z "$RPC_TRANSFER" \
   || -z "$ARG_ID" || -z "$ARG_AT" || -z "$ARG_OFF" || -z "$PFX" || -z "$REFUSED" \
   || -z "$ONBOARD" ]]; then
  fail "could not read the flush's contract out of $FLUSH"
  echo "      rpcs='$RPC_SALE $RPC_PURCHASE $RPC_WASTE $RPC_TRANSFER'"
  echo "      args='$ARG_ID $ARG_AT $ARG_OFF' prefix='$PFX' refused='$REFUSED'"
  echo "      This check asserts the app's own strings against the database. If it"
  echo "      cannot find them it has nothing to assert, and a green here would be"
  echo "      the vacuous kind this repository has recorded five shapes of."
  exit 1
fi
ok "read from $FLUSH: $RPC_SALE/$RPC_PURCHASE/$RPC_WASTE/$RPC_TRANSFER, $ARG_ID/$ARG_AT/$ARG_OFF, prefix ${PFX}<key>, never $REFUSED"

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

# --- 2. a shop, a store and something to sell -------------------------------
note
EMAIL="5c-ii-a-contract-$$-$(date +%s)@example.com"
SIGNUP_JSON="{\"email\":\"$EMAIL\",\"password\":\"contract-probe-123\"}"
SIGNUP="$(TOKEN="" api POST /auth/v1/signup "$SIGNUP_JSON")"
TOKEN="$(python3 -c 'import sys,json; print(json.load(sys.stdin).get("access_token",""))' <<< "$(body "$SIGNUP")")"
[[ -n "$TOKEN" ]] || { echo "FAIL: could not sign a probe user in — $(body "$SIGNUP")"; exit 1; }

SHOP="$(api POST "/rest/v1/rpc/$ONBOARD" '{"p_display_name":"Flush 5c-ii-a","p_prices_include_tax":true,"p_location_name":null}')"
WS="$(body "$SHOP" | tr -d '"')"
LOCATION_RAW="$(api GET '/rest/v1/location?select=id')"
LOCATION="$(field id "$(body "$LOCATION_RAW")")"
# ⚠️ ONE CALL PER LINE, AND NOT NESTED INSIDE ANOTHER `$( )`. A JSON object
# written inline in a nested command substitution loses its quoting and bash
# BRACE-EXPANDS it into two words — `{"a":1,"b":2}` becomes two arguments, and
# PostgREST answers `PGRST102 Empty or invalid json`, which reads like a schema
# problem and is a shell one. Cost twenty minutes here on 2026-09-20.
FAMILY_JSON="{\"workspace_id\":\"$WS\",\"name\":\"Abarrotes\"}"
FAMILY_RAW="$(api POST /rest/v1/product_family "$FAMILY_JSON")"
FAMILY="$(field id "$(body "$FAMILY_RAW")")"
VARIANT_JSON="{\"workspace_id\":\"$WS\",\"family_id\":\"$FAMILY\",\"name\":\"Lata\",\"base_unit_code\":\"pza\",\"purchase_unit_code\":\"pza\",\"sell_unit_code\":\"pza\",\"price_unit_code\":\"pza\"}"
VARIANT_RAW="$(api POST /rest/v1/product_variant "$VARIANT_JSON")"
VARIANT="$(field id "$(body "$VARIANT_RAW")")"
if [[ -n "$WS" && -n "$LOCATION" && -n "$FAMILY" && -n "$VARIANT" ]]; then
  ok "a probe owner with one shop, one store and one sellable variant"
else
  fail "could not build a shop to sell in: ws='$WS' location='$LOCATION' family='$FAMILY' variant='$VARIANT'"
  echo "      Everything below would then be asserting against a refusal rather"
  echo "      than against a sale."
  exit 1
fi

LINES="[{\"variant_id\":\"$VARIANT\",\"qty_display\":2,\"unit_price_gross_per_base\":15.50}]"

# ⚠️ FRESH UUIDS EVERY RUN, AND NOT A FIXED SET. A second run against a database
# that was not reset would re-send yesterday's id with today's variant, and
# `0016` answers that with `TD001` — "already recorded with a different payload",
# which is the schema being RIGHT and this check being wrong about its own
# fixture. Bit once here on 2026-09-20.
NEW_ID="$(python3 -c 'import uuid;print(uuid.uuid4())')"
OFF_ID="$(python3 -c 'import uuid;print(uuid.uuid4())')"
NOAT_ID="$(python3 -c 'import uuid;print(uuid.uuid4())')"
BARE_ID="$(python3 -c 'import uuid;print(uuid.uuid4())')"
CLIENT_AT="$(python3 -c 'import datetime;print((datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(hours=5)).isoformat())')"

sale() { # id occurred_at(or null) recorded_offline -> the RPC reply
  local id="$1" at="$2" off="$3" atj
  if [[ "$at" == "null" ]]; then atj="null"; else atj="\"$at\""; fi
  local json="{\"$ARG_ID\":\"$id\",\"${PFX}location_id\":\"$LOCATION\",\"${PFX}lines\":$LINES,\"$ARG_AT\":$atj,\"$ARG_OFF\":$off}"
  api POST "/rest/v1/rpc/$RPC_SALE" "$json"
}

# --- 3. the flush's argument names are the ones the function answers to -----
note
FIRST_ID="$NEW_ID"
ONE="$(sale "$FIRST_ID" "$CLIENT_AT" false)"
if [[ "$(status "$ONE")" == "200" ]]; then
  ok "$RPC_SALE answered to the argument names sendArgs builds"
else
  fail "$RPC_SALE: HTTP $(status "$ONE") — $(body "$ONE")"
  echo "      A 404 with code PGRST202 is the whole reason this check exists: the"
  echo "      flush and the applied schema disagree about what the arguments are"
  echo "      called, and nothing in the typecheck or the Vitest suite can see it."
fi

# --- 4. the p_ prefix is the contract, not a habit --------------------------
note
BARE_JSON="{\"$ARG_ID\":\"$BARE_ID\",\"location_id\":\"$LOCATION\",\"${PFX}lines\":$LINES,\"$ARG_AT\":null,\"$ARG_OFF\":false}"
BARE="$(api POST "/rest/v1/rpc/$RPC_SALE" "$BARE_JSON")"
if grep -q 'PGRST202' <<< "$(body "$BARE")"; then
  ok "the payload's BARE location_id is PGRST202 — so the prefix is load-bearing"
else
  fail "a bare location_id returned $(status "$BARE") $(body "$BARE"), not a PGRST202"
  echo "      0024 stores the payload keyed by argument name with no p_ prefix and"
  echo "      0026 reads it that way, so the flush adds the prefix at the call. If"
  echo "      the bare name also worked, assertion 3 would be proving nothing."
fi

# --- 5. retries are free: one uuid, twice, one sale -------------------------
note
AGAIN="$(sale "$FIRST_ID" "$CLIENT_AT" true)"
FIRST_FLAG="$(field already_recorded "$(body "$ONE")")"
AGAIN_FLAG="$(field already_recorded "$(body "$AGAIN")")"
SALES_RAW="$(api GET '/rest/v1/sale?select=id')"
COUNT="$(python3 -c 'import sys,json;print(len(json.load(sys.stdin)))' <<< "$(body "$SALES_RAW")" 2>/dev/null)"
if [[ "$FIRST_FLAG" == "False" && "$AGAIN_FLAG" == "True" && "$COUNT" == "1" ]]; then
  ok "one uuid sent twice: already_recorded false then true, and ONE sale on the server"
else
  fail "the re-send read already_recorded=$AGAIN_FLAG (first $FIRST_FLAG) over $COUNT sale(s)"
  echo "      §2.6: a re-send under the same uuid is a SUCCESS carrying"
  echo "      already_recorded, not a duplicate sale. Every retry in the flush —"
  echo "      and every row it unsticks after a crash — rests on this."
fi

# --- 6. recorded_offline decides whose clock wins ----------------------
note
ONLINE_AT="$(field occurred_at "$(body "$ONE")")"
OFF="$(sale "$OFF_ID" "$CLIENT_AT" true)"
OFFLINE_AT="$(field occurred_at "$(body "$OFF")")"
VERDICT="$(python3 - "$CLIENT_AT" "$ONLINE_AT" "$OFFLINE_AT" <<'PY'
import sys, datetime
def at(s):
    return datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))
sent, online, offline = (at(x) for x in sys.argv[1:4])
now = datetime.datetime.now(datetime.timezone.utc)
if abs((online - sent).total_seconds()) < 60:
    print('the ONLINE write kept the client clock: %s' % online); raise SystemExit
if abs((online - now).total_seconds()) > 300:
    print('the ONLINE write was not stamped with now(): %s' % online); raise SystemExit
if abs((offline - sent).total_seconds()) > 2:
    print('the OFFLINE write did not keep the client clock: %s vs %s' % (offline, sent)); raise SystemExit
print('ok')
PY
)"
if [[ "$VERDICT" == "ok" ]]; then
  ok "online the server overrides occurred_at; offline the device's own time survives"
else
  fail "$VERDICT"
  echo "      §2.6 and 0025: recorded_offline is what decides whether occurred_at"
  echo "      is overridden with now(), and therefore WHICH DAY the sale counts on"
  echo "      in Números. The flush sets it from 'was this committed on its first"
  echo "      attempt', which is why it must reach the server intact."
fi

# --- 7. the omission case, which is why occurredAt has a fallback -----------
note
NOAT="$(sale "$NOAT_ID" null true)"
NOAT_AT="$(field occurred_at "$(body "$NOAT")")"
VERDICT="$(python3 - "$NOAT_AT" <<'PY'
import sys, datetime
got = datetime.datetime.fromisoformat(sys.argv[1].replace('Z', '+00:00'))
now = datetime.datetime.now(datetime.timezone.utc)
drift = abs((got - now).total_seconds())
print('ok' if drift < 300 else 'a null occurred_at was NOT stamped with now(): %s' % got)
PY
)"
if [[ "$VERDICT" == "ok" ]]; then
  ok "an OFFLINE write with a null occurred_at is silently stamped with now() — the harm the queuedAt fallback prevents"
else
  fail "$VERDICT"
  echo "      0025's offline branch is coalesce(p_occurred_at, v_now), so omitting"
  echo "      the time re-dates the sale to the moment of the flush and raises"
  echo "      nothing. If this ever stops being true, @/api/flush's occurredAt"
  echo "      fallback has lost the reason it exists and should be re-argued, not"
  echo "      quietly kept."
fi

# --- 8. all four kinds answer to what the flush would send ------------------
note
probe() { # rpc json -> "found" | the error code
  local out; out="$(api POST "/rest/v1/rpc/$1" "$2")"
  if grep -q 'PGRST202' <<< "$(body "$out")"; then echo "PGRST202"; else echo "found"; fi
}
NOWHERE='00000000-0000-4000-8000-00000000dead'
TAIL="\"${PFX}lines\":[],\"$ARG_AT\":null,\"$ARG_OFF\":false}"
SALE_PROBE="{\"$ARG_ID\":\"$NOWHERE\",\"${PFX}location_id\":\"$NOWHERE\",$TAIL"
PURCH_PROBE="{\"$ARG_ID\":\"$NOWHERE\",\"${PFX}location_id\":\"$NOWHERE\",\"${PFX}provider_id\":\"$NOWHERE\",$TAIL"
TRANS_PROBE="{\"$ARG_ID\":\"$NOWHERE\",\"${PFX}from_location_id\":\"$NOWHERE\",\"${PFX}to_location_id\":\"$NOWHERE\",$TAIL"
P_SALE="$(probe "$RPC_SALE" "$SALE_PROBE")"
P_WASTE="$(probe "$RPC_WASTE" "$SALE_PROBE")"
P_PURCH="$(probe "$RPC_PURCHASE" "$PURCH_PROBE")"
P_TRANS="$(probe "$RPC_TRANSFER" "$TRANS_PROBE")"
if [[ "$P_SALE$P_WASTE$P_PURCH$P_TRANS" == "foundfoundfoundfound" ]]; then
  ok "all four record_* functions answer to the argument sets the flush builds per kind"
else
  fail "a kind the queue accepts has no function to send it to: sale=$P_SALE waste=$P_WASTE purchase=$P_PURCH transfer=$P_TRANS"
  echo "      0024's CHECK constraint lets all four kinds into the queue, so a"
  echo "      drifted name here is a write that can never leave the phone."
fi

# --- 9. the refused argument is real, so refusing it is a decision ---------
note
MARKER_JSON="{\"$ARG_ID\":\"$NOWHERE\",\"${PFX}location_id\":\"$NOWHERE\",\"${PFX}lines\":[],\"$ARG_AT\":null,\"$ARG_OFF\":false,\"${PFX}$REFUSED\":\"$NOWHERE\"}"
MARKER="$(api POST "/rest/v1/rpc/$RPC_SALE" "$MARKER_JSON")"
if grep -q 'PGRST202' <<< "$(body "$MARKER")"; then
  fail "${PFX}$REFUSED is not an argument of $RPC_SALE at all — $(body "$MARKER")"
  echo "      The flush strips this key by name. If the function no longer takes"
  echo "      it, that exclusion has become a no-op and the comment explaining it"
  echo "      is describing a capability that is gone."
else
  ok "${PFX}$REFUSED IS an argument $RPC_SALE would accept — so stripping it is a decision, not a no-op"
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
  echo "$ran assertion groups ran, $fails failed — the flush and the applied"
  echo "schema disagree, and only this check can see it."
  exit 1
fi
echo "all $ran assertion groups passed — the database answers to exactly what a"
echo "flush sends it, one uuid twice is one sale, and recorded_offline still"
echo "decides whose clock the ledger keeps."

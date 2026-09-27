#!/usr/bin/env bash
# 6a-ii-b-waste-correction-contract — can a CASHIER put her own write-off right,
# and does the cause survive the round trip in a form `record_waste` will take?
#
# ⚠️⚠️ TWO CLAIMS LIVE HERE AND NOWHERE ELSE, AND THEY ARE NOT THE SAME CLAIM.
#
#   1. **`void_transaction` TAKES `'waste'`.** `0021` has said so since
#      2026-09-04 and nothing had ever called it with that kind — twenty-three
#      days of an argument nobody sent. It matters more here than on the other
#      two kinds because `waste_line_select` carries a manager gate that
#      `purchase_line` and `sale_line` do not (`0003:596`, kept by `0040`), so a
#      void that needed to READ the lines would refuse a cashier while appearing
#      to work for everybody who tested it.
#
#   2. ⚠️⚠️ **THE CAUSE THAT COMES BACK IS A CAUSE THAT CAN GO BACK.** `Corregir`
#      is a void plus a re-record, and the re-record sends the cause the view
#      just handed over. `@/api/documents` renders that cause through
#      `reasonLabel` — a one-way door by design — so the app carries the WIRE
#      value beside the word (`reasonValue`, `causeValue`). **Nothing in
#      TypeScript can tell the two apart**: both are strings, they differ by a
#      capital letter, and a suite that built its own fixture would agree with
#      itself either way. Here the label is sent to a real `record_waste` and
#      refused — **HTTP 400 `22P02`, invalid input value for enum
#      public.waste_reason** — which is what makes the positive half evidence.
#
# WHAT IS DELIBERATELY NOT RE-ASSERTED HERE: the window, the role boundary in
# general, the shape of an idempotent replay in general, and `TD003` arriving on
# a 400 rather than a 403. `docs/checks/5h-ii-b-corrections-contract.sh` drove
# all four against a real PostgREST and they are properties of `void_transaction`
# rather than of a kind. ⚠️ **The one exception is the cashier-versus-somebody-
# else fence**, which is re-driven for `waste` alone, because `0021` compares
# `created_by` on the document it was handed and a write-off is the only kind
# whose LINES she cannot read.
#
# Run:  supabase start && supabase db reset && bash docs/checks/6a-ii-b-waste-correction-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CORRECTIONS="${1:-app/src/api/corrections.ts}"
WASTE="${2:-app/src/api/waste.ts}"
CONTRACT="${3:-app/src/api/documents.ts}"
for f in "$CORRECTIONS" "$WASTE" "$CONTRACT"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f"; exit 1; }
done

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the contract, read out of the app ----------------------------------
# ⚠️ EVERY STRING BELOW IS THE MODULE'S OWN. A check that retypes a contract is
# asserting itself — `5h-ii-a`'s rule, and `6a-ii-a`'s.
str()  { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
flag() { sed -n "/^export const CORRECTABLE: Readonly<Record<DocumentKind, boolean>> = {/,/^};/p" \
           "$CORRECTIONS" | sed -n "s/^  $1: \([a-z]*\),.*/\1/p" | head -1; }
# ⚠️ `\([a-z]*\)` AND NOT `\(true\|false\)`: BSD sed has no `\|`, so the
# alternation matches nothing on a Mac and everything on CI — a check that is
# green in one place and red in the other, which is worse than either.
reasons() {
  sed -n '/^export const WASTE_REASONS = \[/,/^\] as const;/p' "$WASTE" \
    | sed -n "s/^  '\([^']*\)',.*/\1/p"
}
record() { sed -n "/^export const $1: Readonly<Record<DocumentKind, string>> = {/,/^};/p" "$CONTRACT" \
             | sed -n "s/^  $2: '\([^']*\)',.*/\1/p" | head -1; }
wrapped() { sed -n "/^export const $1 =\$/,/;\$/p" "$CONTRACT" | sed -n "s/^  '\([^']*\)';\$/\1/p" | head -1; }

VOID_RPC="$(str VOID_TRANSACTION "$CORRECTIONS")"
REASON_KEY="$(str WASTE_REASON_KEY "$WASTE")"
CORRECTABLE_WASTE="$(flag waste)"
WASTE_TABLE="$(record DOCUMENTS_TABLE waste)"
WASTE_LINE_RELATION="$(record DOCUMENTS_LINE_TABLE waste)"
WASTE_LINE_COLUMNS="$(wrapped DOCUMENTS_WASTE_LINE_COLUMNS)"
REASONS=()
while IFS= read -r one; do [[ -n "$one" ]] && REASONS+=("$one"); done < <(reasons)

note
for name in VOID_RPC REASON_KEY CORRECTABLE_WASTE WASTE_TABLE WASTE_LINE_RELATION WASTE_LINE_COLUMNS; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app"
    echo "      This check asserts the app's own constants against a real database."
    echo "      If it cannot find them it has nothing to assert, and a green here"
    echo "      would be the vacuous kind ADR-035 §9 refuses."
    exit 1
  fi
done
if (( ${#REASONS[@]} < 5 )); then
  fail "read only ${#REASONS[@]} cause(s) out of WASTE_REASONS"; exit 1
fi
ok "read from the app: $VOID_RPC over a '$REASON_KEY' key, ${#REASONS[@]} causes"

# ⚠️⚠️ THE ONE ASSERTION ABOUT THE APP RATHER THAN THE WIRE, AND IT IS HERE
# BECAUSE EVERYTHING BELOW IS ABOUT A CONTROL NOBODY CAN REACH IF IT IS WRONG.
# `CORRECTABLE` is *is it built* — `mayCorrect` is *may she* and
# `void_transaction` is the fence. A `false` here draws no buttons on a write-off
# at all, and every green assertion below would be about an unreachable path.
note
case "$CORRECTABLE_WASTE" in
  true)  ok "the app offers Corregir and Eliminar on a write-off (CORRECTABLE.waste)" ;;
  false) fail "CORRECTABLE.waste is false — the screen draws no control on a write-off."
         echo "      Everything this check proves about the wire would be true of a path"
         echo "      a shopkeeper cannot reach. See @/api/corrections." ;;
  *)     fail "CORRECTABLE.waste read as '$CORRECTABLE_WASTE'" ;;
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
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS
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
# ⚠️ THE OFFSET IS `Z` AND NOT `+00:00` — an instant that reaches a QUERY STRING
# unencoded arrives as `… 00:00` and comes back HTTP 400 `22007`, which reads
# exactly like a bad column. `6a-ii-a`'s harness records the run it cost.
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
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"waste-fix-123\"}")"
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
signup "fix-owner-$STAMP@example.com"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Corregir 6a-ii-b","p_prices_include_tax":true,"p_location_name":null}')"
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
JITOMATE="$(variant 'Jitomate')"
AGUACATE="$(variant 'Aguacate')"
[[ -n "$JITOMATE" && -n "$AGUACATE" ]] || { echo "FAIL: could not create two variants"; exit 1; }

GENERIC_ID="$(first id "$(body "$(api GET '/rest/v1/provider?select=id&is_generic=is.true')")")"
[[ -n "$GENERIC_ID" ]] || { echo "FAIL: the new shop has no generic provider"; exit 1; }
BUY_LINES="$(python3 -c '
import json, sys
print(json.dumps([
  {"variant_id": v, "qty_display": "80", "qty_display_unit": "pza", "unit_price_net_per_base": "1.000000"}
  for v in sys.argv[1:]]))' "$JITOMATE" "$AGUACATE")"
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
  "$WORKSPACE_ID" "fix-staff-$STAMP@example.com" "$LOCATION_ID")"
STAFF_INVITE="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE_JSON")")")"
[[ -n "$STAFF_INVITE" ]] || { echo "FAIL: create_invite returned no token"; exit 1; }
signup "fix-staff-$STAMP@example.com"; STAFF_TOKEN="$TOKEN"
REDEEMED="$(TOKEN="$STAFF_TOKEN" api POST /rest/v1/rpc/redeem_invite \
  "$(python3 -c 'import json,sys;print(json.dumps({"p_token":sys.argv[1]}))' "$STAFF_INVITE")")"
note
if [[ "$(status "$REDEEMED")" == "200" ]]; then ok "an Empleada joined the shop at this location"
else fail "redeem_invite refused: $(body "$REDEEMED")"; exit 1; fi

# --- the write-off SHE records, one cause for the whole document -----------
# ⚠️ ONE CAUSE, WHICH IS WHAT `6a-i`'s SCREEN SENDS — the shape `Corregir` has to
# be able to put back. The MIXED document is `6a-ii-a`'s fixture and its own
# assertion; here the point is the round trip, so the document is the ordinary one.
CAUSE="${REASONS[0]}"
write_off() { # id occurred-at reason token -> response
  local lines
  lines="$(python3 -c '
import json, sys
print(json.dumps([
  {"variant_id": sys.argv[1], "qty_display": "3", "qty_display_unit": "pza",
   "unit_price_gross_per_base": "1.000000", sys.argv[3]: sys.argv[4]},
  {"variant_id": sys.argv[2], "qty_display": "2", "qty_display_unit": "pza",
   "unit_price_gross_per_base": "1.000000", sys.argv[3]: sys.argv[4]}]))' \
    "$JITOMATE" "$AGUACATE" "$REASON_KEY" "$3")"
  local payload
  payload="$(python3 -c '
import json, sys
print(json.dumps({
  "p_id": sys.argv[1], "p_location_id": sys.argv[2], "p_occurred_at": sys.argv[3],
  "p_recorded_offline": False, "p_lines": json.loads(sys.argv[4])}))' \
    "$1" "$LOCATION_ID" "$2" "$lines")"
  TOKEN="$4" api POST /rest/v1/rpc/record_waste "$payload"
}

WASTE_ID="$(uuid)"
RECORDED="$(write_off "$WASTE_ID" "$(ago 1)" "$CAUSE" "$STAFF_TOKEN")"
note
if [[ "$(status "$RECORDED")" == "200" ]]; then ok "the Empleada recorded a two-line write-off under '$CAUSE'"
else fail "record_waste refused: $(status "$RECORDED") $(body "$RECORDED" | head -c 300)"; exit 1; fi

# --- 2. the cause comes back as a value, not as a word ---------------------
# ⚠️⚠️ THIS IS THE ASSERTION THE WHOLE ROW TURNS ON. The app renders the cause
# through `reasonLabel`, which is a one-way door; `causeValue` is what `Corregir`
# re-records from. If the view ever handed back anything but a bare enum member,
# the correction would be a dead letter on the one path where the original has
# already been voided.
WASTE_SELECT="id,$WASTE_LINE_RELATION($WASTE_LINE_COLUMNS)"
HER_READ="$(TOKEN="$STAFF_TOKEN" api GET "/rest/v1/$WASTE_TABLE?select=$WASTE_SELECT&id=eq.$WASTE_ID")"
note
if [[ "$(status "$HER_READ")" == "200" ]]; then ok "she reads her own write-off back through the view"
else fail "the read the app sends was REFUSED: $(status "$HER_READ") $(body "$HER_READ" | head -c 400)"; exit 1; fi

printf '%s\n' "${REASONS[@]}" > "$SCRATCH/reasons.txt"
verdict "every line's cause is one of the five enum members, verbatim" \
  - "$(stash hers "$HER_READ")" "$SCRATCH/reasons.txt" "$REASON_KEY" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
allowed = [l.strip() for l in open(sys.argv[2]) if l.strip()]
key = sys.argv[3]
if not isinstance(rows, list) or len(rows) != 1:
    print(f"expected one document, got {rows!r}"); raise SystemExit
lines = rows[0].get("waste_reason_line")
if not isinstance(lines, list) or not lines:
    print(f"no lines came back through the view: {lines!r}"); raise SystemExit
seen = [line.get(key) for line in lines]
bad = [v for v in seen if v not in allowed]
if bad:
    print(f"the view handed back {bad!r}, which WASTE_REASONS does not contain — "
          f"a value the app cannot send back to record_waste")
    raise SystemExit
if len(set(seen)) != 1:
    print(f"this fixture is one cause per document and the view returned {set(seen)!r}")
    raise SystemExit
print(f"ok — all {len(seen)} line(s) read '{seen[0]}'")
PY

WIRE_CAUSE="$(python3 -c "
import json,sys
rows=json.load(open(sys.argv[1]))
print(rows[0]['waste_reason_line'][0][sys.argv[2]])" "$SCRATCH/hers.json" "$REASON_KEY")"

# ⚠️⚠️ AND THE NEGATIVE CONTROL, WITHOUT WHICH THE LINE ABOVE PROVES NOTHING. The
# word a shopkeeper reads is the enum member with a capital letter — `Caducado`
# against `caducado` — so a check that only asserted *the value came back* would
# be green for an app that sent the label. Here the label is sent to a real
# `record_waste` and the database refuses it by name.
LABEL="$(python3 -c 'import sys;v=sys.argv[1];print(v[:1].upper()+v[1:])' "$WIRE_CAUSE")"
REFUSED="$(write_off "$(uuid)" "$(ago 1)" "$LABEL" "$STAFF_TOKEN")"
note
REFUSED_CODE="$(pick code "$(body "$REFUSED")")"
if [[ "$(status "$REFUSED")" == "400" && "$REFUSED_CODE" == "22P02" ]]; then
  ok "the WORD is refused — '$LABEL' is 400/22P02, which is why the app carries the value too"
else
  fail "record_waste ACCEPTED '$LABEL' (or refused it differently): $(status "$REFUSED") code=$REFUSED_CODE"
  echo "      ⚠️⚠️ This is the control that makes the assertion above evidence. If a label"
  echo "      reaches the enum, nothing anywhere can see the difference between"
  echo "      \`cause\` and \`causeValue\` and the two fields may as well be one."
fi

# --- 3. she voids her OWN write-off ----------------------------------------
# ⚠️⚠️ TWENTY-THREE DAYS OF AN ARGUMENT NOBODY SENT. `0021` has taken `'waste'`
# since 2026-09-04; `5h-ii-b` called it with `purchase` and `sale` only. The
# reason it is not obvious is `waste_line_select`: she cannot read her own lines
# off the base table at all, so a void that touched them would refuse her.
void() { # id reason token -> response
  local payload
  payload="$(python3 -c '
import json, sys
print(json.dumps({"p_kind": "waste", "p_id": sys.argv[1], "p_reason": sys.argv[2]}))' "$1" "$2")"
  TOKEN="$3" api POST "/rest/v1/rpc/$VOID_RPC" "$payload"
}

VOIDED="$(void "$WASTE_ID" 'Corregida desde Lo ultimo' "$STAFF_TOKEN")"
note
if [[ "$(status "$VOIDED")" == "200" ]]; then ok "a cashier voided her OWN write-off — the kind 0021 had never been sent"
else fail "void_transaction refused a cashier her own write-off: $(status "$VOIDED") $(body "$VOIDED" | head -c 300)"; fi

REPLAY="$(void "$WASTE_ID" 'Corregida desde Lo ultimo' "$STAFF_TOKEN")"
verdict "the answer carries what voidedFrom reads, and a replay is shorter rather than a failure" \
  - "$(stash voided "$VOIDED")" "$(stash replay "$REPLAY")" <<'PY'
import json, sys
first = json.load(open(sys.argv[1]))
replay = json.load(open(sys.argv[2]))
for label, doc in (("first", first), ("replay", replay)):
    if not isinstance(doc, dict):
        print(f"the {label} void answered {doc!r}, which is not an object"); raise SystemExit
    for key in ("voided", "void_id", "already_recorded"):
        if key not in doc:
            print(f"the {label} void's body has no `{key}`. `voidedFrom` reads all three, "
                  f"and a missing one is a null on the client"); raise SystemExit
if first["already_recorded"] is not False:
    print(f"the FIRST void reported already_recorded={first['already_recorded']!r}"); raise SystemExit
if replay["already_recorded"] is not True:
    print(f"the REPLAY reported already_recorded={replay['already_recorded']!r} — "
          f"`<kind>_one_reversal_idx` makes a document reversible at most once"); raise SystemExit
if first["void_id"] != replay["void_id"]:
    print("the replay named a DIFFERENT reversal, so the second tap wrote a second document")
    raise SystemExit
# ⚠️⚠️ THE SHORTER BODY IS THE POINT AND NOT A CURIOSITY. `voidedFrom` must not
# require `lines`/`movements`, because the tap that produces a replay is exactly
# the one a shopkeeper makes when the first answer was lost.
if len(replay) >= len(first):
    print(f"the replay was not shorter: first={sorted(first)} replay={sorted(replay)} — "
          f"the claim `voidedFrom` is built on is that a replay carries FEWER keys")
    raise SystemExit
movements = first.get("movements")
if not isinstance(movements, int) or movements < 1:
    print(f"the void reported movements={movements!r} — a write-off put right must put the "
          f"stock back, and 0021 answers with the compensating movement count")
    raise SystemExit
print(f"ok — first {sorted(first)}, replay {sorted(replay)}, {movements} movement(s) back")
PY

# --- 4. the reversal stands beside the original, which is the list's rule --
# ⚠️⚠️ `documentsFrom` DROPS THE PAIR — the owner's *"just one line, clean"*. That
# rule is only correct if the database really writes a MIRROR rather than deleting
# or editing: a `delete` would leave the rule right by accident and a ledger
# wrong for ever.
PAIR="$(TOKEN="$STAFF_TOKEN" api GET "/rest/v1/$WASTE_TABLE?select=id,reversal_of&or=(id.eq.$WASTE_ID,reversal_of.eq.$WASTE_ID)")"
verdict "both halves stand in the ledger, and one of them points at the other" \
  - "$(stash pair "$PAIR")" "$WASTE_ID" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
original = sys.argv[2]
if not isinstance(rows, list) or len(rows) != 2:
    print(f"expected the original AND its mirror, got {rows!r} — if the original is missing "
          f"the void DELETED it, and this ledger has never changed a row"); raise SystemExit
mirror = [r for r in rows if r.get("reversal_of") == original]
kept = [r for r in rows if r.get("id") == original and r.get("reversal_of") is None]
if len(mirror) != 1 or len(kept) != 1:
    print(f"the pair is not one standing original and one mirror: {rows!r}"); raise SystemExit
print("ok — the original is untouched and the reversal names it")
PY

# --- 5. Corregir's second half: re-record from the cause the wire gave -----
# ⚠️⚠️ THIS IS THE ROUND TRIP CLOSED. The value read off the view in group 2 goes
# straight back into `record_waste`, which is literally what `prefillOf` →
# `load` → Desperdicio does with `causeValue`. A green here is the one thing that
# says a correction a shopkeeper makes will land.
AGAIN_ID="$(uuid)"
AGAIN="$(write_off "$AGAIN_ID" "$(ago 1)" "$WIRE_CAUSE" "$STAFF_TOKEN")"
note
if [[ "$(status "$AGAIN")" == "200" ]]; then
  ok "the corrected write-off was re-recorded under the cause the view handed back"
else
  fail "re-recording with the wire's own cause failed: $(status "$AGAIN") $(body "$AGAIN" | head -c 300)"
fi

# --- 6. the fence, re-driven for this kind alone ---------------------------
# ⚠️⚠️ RE-DRIVEN RATHER THAN INHERITED FROM `5h-ii-b`, AND THE REASON IS THE
# ASYMMETRIC POLICY. `0021` compares `created_by` on the document it was handed;
# a write-off is the only kind whose LINES a cashier cannot read, so this is the
# one place where *she may not void it* and *she may not see it* could be
# confused for each other. It is the case `mayCorrect` hides a button for.
BOSS_ID="$(uuid)"
BOSS_WASTE="$(write_off "$BOSS_ID" "$(ago 1)" "$CAUSE" "$OWNER_TOKEN")"
note
if [[ "$(status "$BOSS_WASTE")" == "200" ]]; then ok "the owner recorded a write-off of his own"
else fail "the owner could not record a write-off: $(body "$BOSS_WASTE" | head -c 300)"; exit 1; fi

DENIED="$(void "$BOSS_ID" 'Eliminada desde Lo ultimo' "$STAFF_TOKEN")"
note
DENIED_CODE="$(pick code "$(body "$DENIED")")"
if [[ "$(status "$DENIED")" == "400" && "$DENIED_CODE" == "TD003" ]]; then
  ok "a cashier may not void somebody else's write-off — TD003 on a 400, not a 403"
else
  fail "voiding the owner's write-off answered $(status "$DENIED") code=$DENIED_CODE: $(body "$DENIED" | head -c 300)"
  echo "      ⚠️ A custom SQLSTATE is not a privilege error to PostgREST, so this arrives"
  echo "      as a 400. @/api/errors maps the code and mayCorrect hides the button."
fi

# ⚠️ AND THE REFUSED VOID WROTE NOTHING — `TD003` is raised before the
# compensating document, so the owner's write-off must still stand alone.
STILL="$(TOKEN="$OWNER_TOKEN" api GET "/rest/v1/$WASTE_TABLE?select=id,reversal_of&or=(id.eq.$BOSS_ID,reversal_of.eq.$BOSS_ID)")"
verdict "the refused void left no mirror behind" \
  - "$(stash still "$STILL")" "$BOSS_ID" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
if not isinstance(rows, list) or len(rows) != 1 or rows[0].get("id") != sys.argv[2]:
    print(f"expected the owner's write-off standing ALONE, got {rows!r} — a refusal that "
          f"still wrote a reversal would cancel a document nobody was allowed to cancel")
    raise SystemExit
print("ok — one row, and it is the original")
PY

# --- verdict ---------------------------------------------------------------
echo
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — a cashier can put her own write-off right,"
  echo "and the cause survives the round trip as a value record_waste accepts."
  exit 0
fi
echo "$fails of $ran assertion group(s) FAILED."
exit 1

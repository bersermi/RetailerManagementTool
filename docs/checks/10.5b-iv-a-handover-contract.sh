#!/usr/bin/env bash
# 10.5b-iv-a-handover-contract — does Wera Cocina read her kitchen's reservations, hand them
# over and rate the neighbour by the names the database answers?
#
# WHY THIS EXISTS. `cocina/src/api/apartados.ts` is Wera Cocina's claim about `0079`'s table
# and handover and `0080`'s two functions of the kitchen's side (ADR-035 §2.7: the seller's
# side under the ordinary walls): a table, its columns and a two-level embed, a filter, a day
# bound and an order; three function names and every argument's name; every key it reads of
# two jsonb answers; the labels it sends; and the refusal codes it turns into sentences.
# PostgREST matches a function BY ITS ARGUMENTS' NAMES, so a misspelt `p_` name is a 404; a
# misspelt column a 400 — no order on the tab at all; a misspelt key of a jsonb answer a 200
# with that part missing — an order with no name, a thumb never drawn. The typecheck, the
# suite and the bundler all pass over every one.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF `cocina/src/api/apartados.ts`, the fonda's setup out of Wera
#      Cocina's own files and the neighbour's reserving out of Itacate's: nothing retyped.
#   2. A fonda makes, as Wera Cocina does, a kitchen that takes cards, serves here and charges a
#      $5 *desechable* (set by the database's owner: their screens are `10.5b-iv-c`'s), and
#      publishes one dish, three plates. A neighbour gives her yes and reserves one, cash, to go.
#   3. The fonda reads her kitchen's reservations by the app's read — its columns, the filter,
#      the day bound, the order and the embed's order — and every key comes back at every level,
#      as the neighbour chose, money as numbers, and never who reserved. The history's form of the
#      read (the days before today: `lt`, the newest first) is taken too, and holds none of today's.
#   4. `reservation_neighbours` by the app's argument: every key; the neighbour's short name cut
#      as the app expects; no score yet (*Nueva en Itacate*); no thumb; nothing to rate yet.
#   5. *Ya cobré y lo entregué* — `hand_over_reservation` by the app's names, with her phone's
#      moment — answers what the app reads; the read then carries the handover; a retry keeps the
#      first moment; the order now waits for a thumb, the name still on it.
#   6. Her thumb — `rate_neighbour` by the app's names, a thumb up with the first label of its side
#      — answers every key the app reads; the order then carries it and the name is gone; changed
#      to a thumb down with the first label of the other side, it is taken.
#   7. The refusals the app turns into sentences: a label that cannot be true there (*cambio*), a
#      pending order (*yaNoSeCalifica*), and someone who is not the kitchen's (*sesion*).
#   8. A plate that *se liberó* (its window moved into the past by the database's owner): *No se
#      presentó* by the app's label is taken; *Sí pasó* — the handover recorded late — clears it,
#      and the order waits for a thumb again.
#   9. A plate eaten there carries no *desechable*; one taken away carries its $5.
#  10. The neighbour reads none of the kitchen's reservations, and signed out nothing is answered.
#  ⚠️ `10.5b-iv-b` — WHAT HER QUEUE RELIES ON (`cocina/src/api/cola.ts`: the handover and her thumb
#  are queued on the phone and sent when there is signal, maybe much later):
#  11. A handover sent late keeps her phone's moment, and a second send keeps the first.
#  12. A thumb sent before its order's handover is refused (group 7's `yaNoSeCalifica`) — which is
#      why the queue never sends one ahead — and after the late handover it lands with HER moment.
#  13. Which refusals the queue takes as the database's last word, read out of `cola.ts`: the
#      functions' own `42501` matches its pattern; a call with NO session — what supabase-js sends
#      when it could not renew hers — answers `42501` too, `permission denied for function`, and
#      must NOT match, or a phone whose sign-in lapsed would drop her handover; a broken token is
#      a code it waits on; and the codes it draws as refusals are the ones the database answered.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the database's own rules (`supabase/tests/0079_…` and `0080_…`),
# or what the screens do with an answer (`cocina/test/apartados.test.ts`, which also holds the
# state and *what is taken* to the migrations' text). Itacate's own names are its own check's
# (`10.5b-iii-a-reserving-contract.sh`); here they only make a reservation to hand over.
#
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2 and this runs on the owner's Mac as well
# as in CI. ⚠️ TWO ACCOUNTS A RUN: GoTrue allows 30 sign-ups in 5 minutes, and the falsifier runs
# this a dozen times.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5b-iv-a-handover-contract.sh
# With: $1 a copy of cocina's apartados.ts, $2 a copy of its cola.ts — how the falsifier points it at a broken one.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

APARTADOS_TS="${1:-cocina/src/api/apartados.ts}"
COLA_TS="${2:-cocina/src/api/cola.ts}"
ITACATE_TS="itacate/src/api/apartados.ts"
COCINAS_TS="itacate/src/api/cocinas.ts"
KITCHEN_TS="cocina/src/api/kitchen.ts"
PLACE_TS="cocina/src/api/place.ts"
LISTING_TS="cocina/src/api/listing.ts"
PAGINA_TS="cocina/src/api/pagina.ts"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
for f in "$APARTADOS_TS" "$COLA_TS" "$ITACATE_TS" "$COCINAS_TS" "$KITCHEN_TS" "$PLACE_TS" "$LISTING_TS" "$PAGINA_TS" "$CREDENTIALS_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f (run this from the repository root)"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the app's own claim, read out of its source ------------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
fields_of() { # file interface prefix-regex
  awk -v want="export interface $2 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\):.*/\1/p" | paste -sd, -
}
list_of() { sed -n "s/^export const $1 = \[\(.*\)\] as const;.*/\1/p" "$2" | tr -d "' " | head -1; }
# The code the app reads as a falla — `TD022: 'yaNoSeCalifica',` or `'42501': 'sesion',`.
code_of() { sed -n "s/^  '\{0,1\}\([A-Z0-9]*\)'\{0,1\}: '$1',.*/\1/p" "$APARTADOS_TS" | head -1; }
nth() { cut -d, -f"$2" <<< "$1"; }

TABLE="$(const RESERVATION_TABLE "$APARTADOS_TS")"
COLUMNS="$(const RESERVATION_COLUMNS "$APARTADOS_TS")"
OWNER_COLUMN="$(const RESERVATION_OWNER_COLUMN "$APARTADOS_TS")"
DAY_COLUMN="$(const RESERVATION_DAY_COLUMN "$APARTADOS_TS")"
ORDER="$(const RESERVATION_ORDER "$APARTADOS_TS")"
HISTORY_ORDER="$(const RESERVATION_HISTORY_ORDER "$APARTADOS_TS")"
LINES_TABLE="$(const RESERVATION_LINES_TABLE "$APARTADOS_TS")"
LINE_ORDER="$(const RESERVATION_LINE_ORDER "$APARTADOS_TS")"
NEIGHBOURS="$(const RESERVATION_NEIGHBOURS "$APARTADOS_TS")"
HAND_OVER="$(const HAND_OVER_RESERVATION "$APARTADOS_TS")"
RATE="$(const RATE_NEIGHBOUR "$APARTADOS_TS")"
NEIGHBOURS_ARGS="$(fields_of "$APARTADOS_TS" NeighboursArgs 'p_')"
HAND_OVER_ARGS="$(fields_of "$APARTADOS_TS" HandOverArgs 'p_')"
RATE_ARGS="$(fields_of "$APARTADOS_TS" RateNeighbourArgs 'p_')"
ROW_KEYS="$(fields_of "$APARTADOS_TS" ReservationRow '')"
LINE_KEYS="$(fields_of "$APARTADOS_TS" ReservationLineRow '')"
DISH_KEYS="$(fields_of "$APARTADOS_TS" ReservationDishRow '')"
ENTRY_KEYS="$(fields_of "$APARTADOS_TS" NeighbourEntryRow '')"
NEIGHBOUR_KEYS="$(fields_of "$APARTADOS_TS" NeighbourRow '')"
THUMB_KEYS="$(fields_of "$APARTADOS_TS" ThumbRow '')"
RATED_KEYS="$(fields_of "$APARTADOS_TS" RatedNeighbourRow '')"
UP_LABELS="$(list_of ETIQUETAS_ARRIBA "$APARTADOS_TS")"
DOWN_LABELS="$(list_of ETIQUETAS_ABAJO "$APARTADOS_TS")"
NO_SHOW="$(const NO_SE_PRESENTO "$APARTADOS_TS")"
PAYMENTS="$(list_of PAGOS "$APARTADOS_TS")"
WAYS="$(list_of COMERES "$APARTADOS_TS")"
NO_RATING_CODE="$(code_of yaNoSeCalifica)"
CHANGED_CODE="$(code_of cambio)"
SESSION_CODE="$(code_of sesion)"
# Itacate's names, for the neighbour who reserves.
RESERVE="$(const RESERVE_PLATE "$ITACATE_TS")"
RESERVE_ARGS="$(fields_of "$ITACATE_TS" ReserveArgs 'p_')"
YES="$(const GIVE_MY_YES "$ITACATE_TS")"
# Wera Cocina's names, for the fonda's side.
ONBOARD="$(const ONBOARD_WORKSPACE "$KITCHEN_TS")"
ONBOARD_ARGS="$(fields_of "$KITCHEN_TS" OnboardArgs 'p_')"
KIND="$(const COCINA_KIND "$KITCHEN_TS")"
PLACE_TABLE="$(const PLACE_TABLE "$PLACE_TS")"
PLACE_OWNER="$(const PLACE_OWNER_COLUMN "$PLACE_TS")"
SET_ADDRESS="$(const SET_STORE_ADDRESS "$PLACE_TS")"
ADDRESS_ARGS="$(fields_of "$PLACE_TS" SetStoreAddressArgs 'p_')"
PUBLISH="$(const PUBLISH_LISTING "$LISTING_TS")"
PUBLISH_ARGS="$(fields_of "$LISTING_TS" PublishArgs 'p_')"
LINE_BODY="$(fields_of "$LISTING_TS" LineBody '')"
SET_PAGE="$(const SET_KITCHEN_PAGE "$PAGINA_TS")"
PAGE_ARGS="$(fields_of "$PAGINA_TS" SetPageArgs 'p_')"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"
# `10.5b-iv-b`: the queue's own claims — its pattern for a final 42501, the codes it waits on as her
# sign-in's, and the codes it draws as refusals (`FINALES`, `'22023': 'cambio',` or `TD022: 'yaNoSeCalifica',`).
FINAL_42501="$(sed -n 's#^export const NO_ES_DE_SU_COCINA = /\(.*\)/;$#\1#p' "$COLA_TS" | head -1)"
SESSION_CODES="$(sed -n "s/^export const CODIGOS_DE_SESION: readonly string\[\] = \[\(.*\)\];.*/\1/p" "$COLA_TS" | tr -d "' " | head -1)"
final_of() { awk '/^export const FINALES/{f=1;next} f&&/^};/{exit} f' "$COLA_TS" | sed -n "s/^  '\{0,1\}\([A-Z0-9]*\)'\{0,1\}: '$1',.*/\1/p" | head -1; }
FINAL_CAMBIO="$(final_of cambio)"
FINAL_NO_RATING="$(final_of yaNoSeCalifica)"

for pair in "RESERVATION_TABLE:$TABLE" "RESERVATION_COLUMNS:$COLUMNS" "RESERVATION_OWNER_COLUMN:$OWNER_COLUMN" \
            "RESERVATION_DAY_COLUMN:$DAY_COLUMN" "RESERVATION_ORDER:$ORDER" "RESERVATION_HISTORY_ORDER:$HISTORY_ORDER" "RESERVATION_LINES_TABLE:$LINES_TABLE" \
            "RESERVATION_LINE_ORDER:$LINE_ORDER" "RESERVATION_NEIGHBOURS:$NEIGHBOURS" "HAND_OVER_RESERVATION:$HAND_OVER" \
            "RATE_NEIGHBOUR:$RATE" "NeighboursArgs:$NEIGHBOURS_ARGS" "HandOverArgs:$HAND_OVER_ARGS" "RateNeighbourArgs:$RATE_ARGS" \
            "ReservationRow:$ROW_KEYS" "ReservationLineRow:$LINE_KEYS" "ReservationDishRow:$DISH_KEYS" \
            "NeighbourEntryRow:$ENTRY_KEYS" "NeighbourRow:$NEIGHBOUR_KEYS" "ThumbRow:$THUMB_KEYS" "RatedNeighbourRow:$RATED_KEYS" \
            "ETIQUETAS_ARRIBA:$UP_LABELS" "ETIQUETAS_ABAJO:$DOWN_LABELS" "NO_SE_PRESENTO:$NO_SHOW" "PAGOS:$PAYMENTS" "COMERES:$WAYS" \
            "the code for yaNoSeCalifica:$NO_RATING_CODE" "the code for cambio:$CHANGED_CODE" "the code for sesion:$SESSION_CODE" \
            "RESERVE_PLATE:$RESERVE" "ReserveArgs:$RESERVE_ARGS" "GIVE_MY_YES:$YES" "ONBOARD_WORKSPACE:$ONBOARD" \
            "OnboardArgs:$ONBOARD_ARGS" "COCINA_KIND:$KIND" "PLACE_TABLE:$PLACE_TABLE" "PLACE_OWNER_COLUMN:$PLACE_OWNER" \
            "SET_STORE_ADDRESS:$SET_ADDRESS" "SetStoreAddressArgs:$ADDRESS_ARGS" "PUBLISH_LISTING:$PUBLISH" \
            "PublishArgs:$PUBLISH_ARGS" "LineBody:$LINE_BODY" "SET_KITCHEN_PAGE:$SET_PAGE" "SetPageArgs:$PAGE_ARGS" \
            "FULL_NAME_KEY:$NAME_KEY" "NO_ES_DE_SU_COCINA:$FINAL_42501" "CODIGOS_DE_SESION:$SESSION_CODES" \
            "the queue's final code for cambio:$FINAL_CAMBIO" "the queue's final code for yaNoSeCalifica:$FINAL_NO_RATING"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the apps' source"
    echo "      This check asserts the app's own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
CASH="$(nth "$PAYMENTS" 1)"; CARD="$(nth "$PAYMENTS" 2)"
TO_GO="$(nth "$WAYS" 1)"; HERE="$(nth "$WAYS" 2)"
UP1="$(nth "$UP_LABELS" 1)"; DOWN1="$(nth "$DOWN_LABELS" 1)"
ok "read from Wera Cocina: $TABLE?select=… by $OWNER_COLUMN, $DAY_COLUMN, order $ORDER, $LINES_TABLE by $LINE_ORDER; $NEIGHBOURS($NEIGHBOURS_ARGS), $HAND_OVER($HAND_OVER_ARGS), $RATE($RATE_ARGS)"
ok "and the answers: a reservation {$ROW_KEYS}, its line {$LINE_KEYS}, its dish {$DISH_KEYS}; a neighbour's line {$ENTRY_KEYS}, the neighbour {$NEIGHBOUR_KEYS}, a thumb {$THUMB_KEYS}; rated {$RATED_KEYS}"
ok "and the labels ($UP_LABELS up, $DOWN_LABELS down, $NO_SHOW), the codes ($NO_RATING_CODE yaNoSeCalifica, $CHANGED_CODE cambio, $SESSION_CODE sesion), how she pays ($PAYMENTS) and eats ($WAYS)"
ok "and from her queue: a final 42501 is /$FINAL_42501/, her sign-in's codes are $SESSION_CODES, its final codes $FINAL_CAMBIO cambio and $FINAL_NO_RATING yaNoSeCalifica"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)"
  echo "      from the repository root — \`supabase status\` needs the project directory."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE, which bypasses RLS and every grant.
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

TOKEN=""
api() { # method path [body] -> body, with the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" auth="${TOKEN:-}"
  if [[ -n "$auth" ]]; then auth="Authorization: Bearer $auth"; else auth="X-Empty: 1"; fi
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" \
      -H "apikey: $KEY" -H "$auth" -H 'Content-Type: application/json' -H 'Prefer: return=representation' -d "$body"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth"
  fi
}
by_names() { # names-csv json-value1 json-value2 ... -> a JSON object keyed by the APP's names
  python3 -c 'import json,sys; n=sys.argv[1].split(","); print(json.dumps(dict(zip(n,[json.loads(v) for v in sys.argv[2:]]))))' "$@"
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
first_id() { python3 -c 'import json,sys; r=json.load(sys.stdin); print(r[0]["id"] if isinstance(r,list) and r else "")' 2>/dev/null; }
iso() { python3 -c 'import datetime,sys; print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(minutes=int(sys.argv[1]))).isoformat(timespec="seconds").replace("+00:00","Z"))' "$1"; }
uuid() { python3 -c 'import uuid; print(uuid.uuid4())'; }
# The day bound as the app sends it: 30 days before today (`desdeDia`); UTC here is a day either side at most.
since() { python3 -c 'import datetime; print((datetime.date.today()-datetime.timedelta(days=31)).isoformat())'; }
# Her hours inside a window, as Itacate offers them: every quarter hour from the first at or after the start.
first_hour() { # start end
  python3 -c '
import datetime, sys
p = lambda t: datetime.datetime.fromisoformat(t.replace("Z", "+00:00"))
q = 15 * 60
s = int(p(sys.argv[1]).timestamp())
print(datetime.datetime.fromtimestamp(-(-s // q) * q, datetime.timezone.utc).isoformat().replace("+00:00", "Z"))' "$@"
}
# ⚠️ GoTrue rate-limits sign-ups and answers a limited one with an EMPTY body — retried, long
# enough to outlast its 5-minute window when the falsifier has spent it.
signup() { # email display-name -> a session token, or nothing
  python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": "cocina-probe-123", "data": {sys.argv[2]: sys.argv[3]}}))' \
    "$1" "$NAME_KEY" "$2" > "$SCRATCH/signup.json"
  local out token="" try
  for try in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    out="$(TOKEN="" api POST /auth/v1/signup "$(cat "$SCRATCH/signup.json")")"
    token="$(pick access_token "$(body "$out")")"
    [[ -n "$token" ]] && break
    sleep 15
  done
  echo "$token"
}
as_owner() { supabase db query --local -o csv "$1" 2>/dev/null | tail -1; }

STAMP="$$-$(date +%s)"

# --- 2. a fonda, as Wera Cocina makes her; a neighbour, as Itacate reserves -----------
TOKEN="$(signup "fonda-entrega-$STAMP@example.com" "Doña Entregas $STAMP")"
[[ -n "$TOKEN" ]] || { fail "a fonda's sign-up got no session"; exit 1; }
FONDA="$TOKEN"
A="$(body "$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" "\"Fonda Doña Entregas $STAMP\"" "\"$KIND\"")")" | tr -d '"')"
[[ "$A" =~ ^[0-9a-f-]{36}$ ]] || { fail "could not make the kitchen: $A"; exit 1; }
PA="$(body "$(api GET "/rest/v1/$PLACE_TABLE?select=id&$PLACE_OWNER=eq.$A&order=created_at,id&limit=1")" | first_id)"
[[ -n "$PA" ]] || { fail "could not read the kitchen's place"; exit 1; }
out="$(api POST "/rest/v1/rpc/$SET_ADDRESS" "$(by_names "$ADDRESS_ARGS" "\"$PA\"" '"Sabino"' '"12"' '"Santa María la Ribera"' '"Cuauhtémoc"' '"06400"')")"
[[ "$(status "$out")" == 2* ]] || fail "her address could not be set: $(status "$out") $(body "$out" | head -c 160)"
out="$(api POST "/rest/v1/rpc/$SET_PAGE" "$(by_names "$PAGE_ARGS" "\"$A\"" '{"sentence": "Comida casera."}')")"
[[ "$(status "$out")" == 2* ]] || fail "her page could not be set: $(status "$out") $(body "$out" | head -c 160)"
# ⚠️ Her card, eating here and the desechable set by the database's owner: Wera Cocina's
# screens for them are `10.5b-iv-c`'s, and this check is about the handover's names.
set_up="$(as_owner "update public.kitchen_page set accepts_card = true, para_aqui = true, container_price = 5.00 where workspace_id = '$A' returning workspace_id")"
[[ "$set_up" == "$A" ]] || { fail "could not set her card, eating here and the desechable ($set_up)"; exit 1; }
START="$(iso 15)"; END="$(iso 165)"
OFFER="$(uuid)"
DISH="$(by_names "$LINE_BODY" '"Mole con arroz"' 'null' '[]' '"60.00"' '3' 'false' '"120.00"' 'null')"
out="$(api POST "/rest/v1/rpc/$PUBLISH" "$(by_names "$PUBLISH_ARGS" "\"$OFFER\"" "\"$PA\"" "\"$START\"" "\"$END\"" "[$DISH]")")"
[[ "$(status "$out")" == 200 ]] || { fail "she could not publish: $(status "$out") $(body "$out" | head -c 160)"; exit 1; }
HOUR="$(first_hour "$START" "$END")"

TOKEN="$(signup "vecina-entrega-$STAMP@example.com" "Ana Probadora $STAMP")"
[[ -n "$TOKEN" ]] || { fail "a neighbour's sign-up got no session"; exit 1; }
VECINA="$TOKEN"
api POST "/rest/v1/rpc/$YES" '{}' > /dev/null
reserve() { # id payment eat -> status
  local out; out="$(api POST "/rest/v1/rpc/$RESERVE" "$(by_names "$RESERVE_ARGS" "\"$1\"" "\"$OFFER\"" '1' "\"$HOUR\"" "\"$2\"" "\"$3\"")")"
  body "$out" > "$SCRATCH/reserved.json"
  status "$out"
}
R1="$(uuid)"
s="$(reserve "$R1" "$CASH" "$TO_GO")"
[[ "$s" == 200 ]] || { fail "the neighbour could not reserve, as Itacate does: $s $(head -c 200 "$SCRATCH/reserved.json")"; exit 1; }
CODE1="$(pick code "$(cat "$SCRATCH/reserved.json")")"
ok "a fonda makes, as Wera Cocina does, a kitchen that takes cards, serves here and charges a \$5 desechable, and publishes three plates of one dish; a neighbour reserves one, as Itacate does — code $CODE1, cash, to go"

# Verdicts are one python file, a function per question.
cat > "$SCRATCH/v.py" <<'PY'
import json, re, sys

def load(path):
    return json.load(open(path))

def missing(obj, keys_csv, what):
    if not isinstance(obj, dict):
        return '%s is %r, not an object' % (what, obj)
    gone = [k for k in keys_csv.split(',') if k not in obj]
    return '%s carried no %s' % (what, ', '.join(repr(k) for k in gone)) if gone else None

def row_of(path, rid):
    rows = load(path)
    if not isinstance(rows, list):
        return None, 'the read came back %r, not a list' % (rows,)
    r = next((x for x in rows if isinstance(x, dict) and x.get('id') == rid), None)
    return r, (None if r is not None else 'reservation %s is not in her kitchen\'s list' % rid)

def read(path, rid, row_keys, line_keys, dish_keys, payment, eat, container, handed):
    r, why = row_of(path, rid)
    if why: print(why); return
    why = missing(r, row_keys, 'a reservation')
    if why: print(why); return
    if 'buyer_id' in r:
        print('her kitchen\'s read sent who reserved — buyer_id is granted to nobody'); return
    if not (isinstance(r.get('code'), int) and 100 <= r['code'] <= 999):
        print('the code came back %r, the app reads three digits' % r.get('code')); return
    if (r.get('payment'), r.get('eat')) != (payment, eat):
        print('it came back paid %r and eaten %r, she chose %r and %r' % (r.get('payment'), r.get('eat'), payment, eat)); return
    if (r.get('handed_over_at') is not None) != (handed == 'yes'):
        print('handed_over_at came back %r, and it was %s handed over' % (r.get('handed_over_at'), '' if handed == 'yes' else 'not')); return
    lines = r.get('reservation_line')
    if not isinstance(lines, list) or len(lines) != 1:
        print('its lines came back %r' % (lines,)); return
    l = lines[0]
    why = missing(l, line_keys, "a reservation's line") or missing(l.get('listing_line'), dish_keys, "a line's dish")
    if why: print(why); return
    if l['listing_line'].get('name') != 'Mole con arroz' or l['listing_line'].get('line_no') != 1:
        print("the line's dish came back %r" % l['listing_line']); return
    if float(l.get('unit_price')) != 60 or float(l.get('quantity')) != 1:
        print("the line came back %r of %r — one plate at $60" % (l.get('quantity'), l.get('unit_price'))); return
    want = None if container == 'none' else float(container)
    got = None if l.get('container_price') is None else float(l['container_price'])
    if got != want:
        print("the line's desechable came back %r, it should be %r for a plate %s" % (got, want, 'taken away' if want else 'eaten there')); return
    print('OK')

def handed_at(path, rid):
    r, why = row_of(path, rid)
    print(why or r.get('handed_over_at') or '')

def entry(path, rid, entry_keys, neighbour_keys, thumb_keys, want_name, want_thumb, want_rate):
    rows = load(path)
    if not isinstance(rows, list):
        print('%r, not a list' % (rows,)); return
    e = next((x for x in rows if isinstance(x, dict) and x.get('id') == rid), None)
    if e is None:
        print('reservation %s has no line about its neighbour' % rid); return
    why = missing(e, entry_keys, "a neighbour's line")
    if why: print(why); return
    n = e.get('neighbour')
    if want_name == 'none':
        if n is not None:
            print('the order still carried a name, %r — it goes once the order is rated' % n); return
    else:
        why = missing(n, neighbour_keys, 'the neighbour')
        if why: print(why); return
        if n.get('name') != want_name:
            print('the neighbour came back %r, the app expects %r' % (n.get('name'), want_name)); return
        if n.get('score') is not None:
            print('a neighbour with no thumbs came back with a score %r' % n['score']); return
    t = e.get('thumb')
    if want_thumb == 'none':
        if t is not None:
            print('the order came back with a thumb %r, none was given' % t); return
    else:
        why = missing(t, thumb_keys, 'its thumb')
        if why: print(why); return
        up, label = want_thumb.split(':')
        if t.get('up') != (up == 'up') or t.get('labels') != [label] or t.get('clock') is not False:
            print('its thumb came back %r, the fonda gave %s with %r' % (t, up, label)); return
    if (e.get('rate_until') is not None) != (want_rate == 'yes'):
        print('rate_until came back %r, and a first thumb %s be given' % (e.get('rate_until'), 'may' if want_rate == 'yes' else 'may not')); return
    print('OK')

def rated(path, keys, up, label):
    r = load(path)
    why = missing(r, keys, "rate_neighbour's answer")
    if why: print(why); return
    if r.get('up') != (up == 'up') or r.get('labels') != [label]:
        print('rating answered %r, she gave %s with %r' % (r, up, label)); return
    print('OK')

def refused(path, want):
    try:
        e = load(path)
    except Exception:
        e = {}
    got = e.get('code') if isinstance(e, dict) else None
    print('OK' if got == want else 'the database answered %r, the app reads %r' % (got, want))

def empty(path):
    rows = load(path)
    print('OK' if rows == [] else 'someone else read %r' % rows)

globals()[sys.argv[1]](*sys.argv[2:])
PY
verdict() { python3 "$SCRATCH/v.py" "$@"; }
ask() { # file method path [body] -> status; the body into the file
  local file="$1"; shift
  local out; out="$(api "$@")"
  body "$out" > "$file"
  status "$out"
}

# The app's read, as supabase-js sends it: the columns and embed, the kitchen, the day, the
# order, and the embed's own order (`referencedTable`).
SINCE="$(since)"
READ="/rest/v1/$TABLE?select=$COLUMNS&$OWNER_COLUMN=eq.$A&$DAY_COLUMN=gte.$SINCE&order=$ORDER&$LINES_TABLE.order=$LINE_ORDER.asc"
read_as_fonda() { TOKEN="$FONDA"; ask "$1" GET "$READ"; }

# --- 3. her kitchen's reservations ---------------------------------------------------------
s="$(read_as_fonda "$SCRATCH/read1.json")"
v="$(verdict read "$SCRATCH/read1.json" "$R1" "$ROW_KEYS" "$LINE_KEYS" "$DISH_KEYS" "$CASH" "$TO_GO" 5 no)"
# The history's form, as `myReservations(kitchenId, desde, antes)` sends it: before her day — none of that
# day's. ⚠️ Her day is the order's own `pickup_day` (the kitchen's zone), never this machine's date: CI runs
# in UTC, a day ahead of Mexico City's every evening.
HER_DAY="$(python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); print(next((x["pickup_day"] for x in r if x.get("id")==sys.argv[2]), ""))' "$SCRATCH/read1.json" "$R1" 2>/dev/null)"
READ_BEFORE="/rest/v1/$TABLE?select=$COLUMNS&$OWNER_COLUMN=eq.$A&$DAY_COLUMN=gte.$SINCE&$DAY_COLUMN=lt.$HER_DAY&order=$HISTORY_ORDER&$LINES_TABLE.order=$LINE_ORDER.asc"
TOKEN="$FONDA"; s2="$(ask "$SCRATCH/read-before.json" GET "$READ_BEFORE")"
before="$(python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); print("OK" if isinstance(r,list) and not any(x.get("id")==sys.argv[2] for x in r) else "the history form carried today'"'"'s %r" % r)' "$SCRATCH/read-before.json" "$R1" 2>&1)"
if [[ "$s" != 200 ]]; then fail "her kitchen's read answered $s $(head -c 240 "$SCRATCH/read1.json")"
elif [[ "$v" != OK ]]; then fail "$v"
elif [[ "$s2" != 200 || "$before" != OK ]]; then fail "the history's form answered $s2 — $before $(head -c 160 "$SCRATCH/read-before.json")"
else ok "the fonda reads her kitchen's reservations by the app's read: every key at every level, as the neighbour chose, the \$5 desechable on a plate to go, never who reserved — and the history's form holds none of today's"
fi

# --- 4. who reserved it ----------------------------------------------------------------
TOKEN="$FONDA"
neighbours() { ask "$1" POST "/rest/v1/rpc/$NEIGHBOURS" "$(by_names "$NEIGHBOURS_ARGS" "\"$A\"")"; }
s="$(neighbours "$SCRATCH/n1.json")"
v="$(verdict entry "$SCRATCH/n1.json" "$R1" "$ENTRY_KEYS" "$NEIGHBOUR_KEYS" "$THUMB_KEYS" 'Ana P.' none no)"
if [[ "$s" == 404 ]]; then fail "$NEIGHBOURS() answered 404 — no function by the argument's name ($NEIGHBOURS_ARGS)"
elif [[ "$s" != 200 ]]; then fail "$NEIGHBOURS() answered $s $(head -c 200 "$SCRATCH/n1.json")"
elif [[ "$v" == OK ]]; then ok "$NEIGHBOURS() answers every key the app reads: 'Ana P.', no score yet (Nueva en Itacate), no thumb, nothing to rate while it is pending"
else fail "$v"; fi

# --- 5. Ya cobré y lo entregué ------------------------------------------------------------
hand_over() { ask "$1" POST "/rest/v1/rpc/$HAND_OVER" "$(by_names "$HAND_OVER_ARGS" "\"$2\"" "\"$(iso 0)\"")"; }
s="$(hand_over "$SCRATCH/h1.json" "$R1")"
got="$(tr -d '"' < "$SCRATCH/h1.json")"
read_as_fonda "$SCRATCH/read2.json" > /dev/null
v="$(verdict read "$SCRATCH/read2.json" "$R1" "$ROW_KEYS" "$LINE_KEYS" "$DISH_KEYS" "$CASH" "$TO_GO" 5 yes)"
first="$(verdict handed_at "$SCRATCH/read2.json" "$R1")"
TOKEN="$FONDA"; sleep 1
s2="$(hand_over "$SCRATCH/h1b.json" "$R1")"
read_as_fonda "$SCRATCH/read3.json" > /dev/null
again="$(verdict handed_at "$SCRATCH/read3.json" "$R1")"
TOKEN="$FONDA"
neighbours "$SCRATCH/n2.json" > /dev/null
w="$(verdict entry "$SCRATCH/n2.json" "$R1" "$ENTRY_KEYS" "$NEIGHBOUR_KEYS" "$THUMB_KEYS" 'Ana P.' none yes)"
if [[ "$s" == 404 ]]; then fail "$HAND_OVER() answered 404 — no function by these arguments' names ($HAND_OVER_ARGS)"
elif [[ "$s" != 200 || "$got" != recogido ]]; then fail "$HAND_OVER() answered $s '$got', the app reads 'recogido'"
elif [[ "$v" != OK ]]; then fail "after the handover, $v"
elif [[ "$s2" != 200 || "$again" != "$first" ]]; then fail "a retry answered $s2 and moved the handover from $first to $again"
elif [[ "$w" != OK ]]; then fail "after the handover, $w"
else ok "she hands it over through $HAND_OVER() with her phone's moment — 'recogido'; the read carries it, a retry keeps the first moment, and the order waits for her thumb with the name still on it"
fi

# --- 6. her thumb ------------------------------------------------------------------------
rate() { ask "$1" POST "/rest/v1/rpc/$RATE" "$(by_names "$RATE_ARGS" "\"$2\"" "$3" "[\"$4\"]" "\"$(iso 0)\"")"; }
TOKEN="$FONDA"
s="$(rate "$SCRATCH/t1.json" "$R1" true "$UP1")"
v="$(verdict rated "$SCRATCH/t1.json" "$RATED_KEYS" up "$UP1")"
neighbours "$SCRATCH/n3.json" > /dev/null
w="$(verdict entry "$SCRATCH/n3.json" "$R1" "$ENTRY_KEYS" "$NEIGHBOUR_KEYS" "$THUMB_KEYS" none "up:$UP1" no)"
s2="$(rate "$SCRATCH/t2.json" "$R1" false "$DOWN1")"
v2="$(verdict rated "$SCRATCH/t2.json" "$RATED_KEYS" down "$DOWN1")"
if [[ "$s" == 404 ]]; then fail "$RATE() answered 404 — no function by these arguments' names ($RATE_ARGS)"
elif [[ "$s" != 200 ]]; then fail "$RATE() answered $s $(head -c 200 "$SCRATCH/t1.json")"
elif [[ "$v" != OK ]]; then fail "$v"
elif [[ "$w" != OK ]]; then fail "after her thumb, $w"
elif [[ "$s2" != 200 || "$v2" != OK ]]; then fail "a thumb down with '$DOWN1' answered $s2 — $v2 $(head -c 200 "$SCRATCH/t2.json")"
else ok "she gives a thumb up with '$UP1' through $RATE(): every key the app reads; the order carries it and the name is gone; changed to a thumb down with '$DOWN1', it is taken"
fi

# --- 7. the refusals the app turns into sentences ------------------------------------
TOKEN="$VECINA"
R2="$(uuid)"; R3="$(uuid)"
s="$(reserve "$R2" "$CARD" "$HERE")"; s3="$(reserve "$R3" "$CASH" "$TO_GO")"
if [[ "$s" != 200 || "$s3" != 200 ]]; then
  fail "after her first pickup she could not reserve two more, as Itacate does: $s $s3 $(head -c 200 "$SCRATCH/reserved.json")"
else
  TOKEN="$FONDA"
  rate "$SCRATCH/x1.json" "$R1" true "$DOWN1" > /dev/null
  a="$(verdict refused "$SCRATCH/x1.json" "$CHANGED_CODE")"
  rate "$SCRATCH/x2.json" "$R3" true "$UP1" > /dev/null
  b="$(verdict refused "$SCRATCH/x2.json" "$NO_RATING_CODE")"
  TOKEN="$VECINA"
  hand_over "$SCRATCH/x3.json" "$R3" > /dev/null
  c="$(verdict refused "$SCRATCH/x3.json" "$SESSION_CODE")"
  if [[ "$a" != OK ]]; then fail "a thumb up with '$DOWN1': $a"
  elif [[ "$b" != OK ]]; then fail "a thumb on a pending order: $b"
  elif [[ "$c" != OK ]]; then fail "the neighbour handing her own order over: $c"
  else ok "refused with the codes the app turns into sentences: a label that cannot be true $CHANGED_CODE (*cambio*), a pending order $NO_RATING_CODE (*yaNoSeCalifica*), someone not of the kitchen $SESSION_CODE (*sesion*)"
  fi
fi

# --- 8. a plate that se liberó: No se presentó, then Sí pasó ------------------------------
moved="$(as_owner "update public.reservation set pickup_at = now() - interval '2 hours', held_until = now() - interval '1 hour' where id = '$R2' returning id")"
if [[ "$moved" != "$R2" ]]; then
  fail "could not move the second plate's window into the past ($moved)"
else
  TOKEN="$FONDA"
  s="$(rate "$SCRATCH/t3.json" "$R2" false "$NO_SHOW")"
  v="$(verdict rated "$SCRATCH/t3.json" "$RATED_KEYS" down "$NO_SHOW")"
  s2="$(hand_over "$SCRATCH/h2.json" "$R2")"
  neighbours "$SCRATCH/n4.json" > /dev/null
  w="$(verdict entry "$SCRATCH/n4.json" "$R2" "$ENTRY_KEYS" "$NEIGHBOUR_KEYS" "$THUMB_KEYS" 'Ana P.' none yes)"
  if [[ "$s" != 200 || "$v" != OK ]]; then fail "*No se presentó* with '$NO_SHOW' answered $s — $v $(head -c 200 "$SCRATCH/t3.json")"
  elif [[ "$s2" != 200 ]]; then fail "*Sí pasó* answered $s2 $(head -c 200 "$SCRATCH/h2.json")"
  elif [[ "$w" != OK ]]; then fail "after *Sí pasó*, $w"
  else ok "a plate that se liberó takes *No se presentó* with '$NO_SHOW'; *Sí pasó* — the handover recorded late — clears it, and the order waits for her thumb again"
  fi
fi

# --- 9. a plate eaten there, and one to go -----------------------------------------------
read_as_fonda "$SCRATCH/read4.json" > /dev/null
v="$(verdict read "$SCRATCH/read4.json" "$R2" "$ROW_KEYS" "$LINE_KEYS" "$DISH_KEYS" "$CARD" "$HERE" none yes)"
w="$(verdict read "$SCRATCH/read4.json" "$R3" "$ROW_KEYS" "$LINE_KEYS" "$DISH_KEYS" "$CASH" "$TO_GO" 5 no)"
if [[ "$v" != OK ]]; then fail "a plate eaten there: $v"
elif [[ "$w" != OK ]]; then fail "a plate to go: $w"
else ok "a plate eaten there, by card, carries no desechable; one to go, in cash, its \$5"
fi

# --- 10. nobody else's, and nothing signed out -------------------------------------------
TOKEN="$VECINA"
s="$(ask "$SCRATCH/vecina-read.json" GET "$READ")"
v="$(verdict empty "$SCRATCH/vecina-read.json")"
s2="$(neighbours "$SCRATCH/vecina-n.json")"
out="$(TOKEN="" api GET "$READ")"
out2="$(TOKEN="" api POST "/rest/v1/rpc/$NEIGHBOURS" "$(by_names "$NEIGHBOURS_ARGS" "\"$A\"")")"
if [[ "$s" != 200 || "$v" != OK ]]; then fail "the neighbour reading the kitchen's reservations: $s $v"
elif [[ "$s2" == 2* ]]; then fail "the neighbour asking $NEIGHBOURS() for the kitchen answered $s2"
elif [[ "$(status "$out")" == 2* && "$(body "$out")" != "[]" ]]; then fail "signed out, the read answered $(status "$out") $(body "$out" | head -c 120)"
elif [[ "$(status "$out2")" == 2* ]]; then fail "signed out, $NEIGHBOURS() answered $(status "$out2")"
else ok "the neighbour reads none of the kitchen's reservations and is refused its neighbours' lines ($s2); signed out nothing is answered ($(status "$out"), $(status "$out2"))"
fi

# --- 11. `10.5b-iv-b`: a handover sent late keeps her moment ----------------------------------
# R3 is still pending (group 7). Made two hours ago, as the database's owner, so a moment 40 minutes
# ago is inside what `hand_over_reservation` keeps (between the order's making and now).
LATE="$(iso -40)"; THUMB_AT="$(iso -35)"
same_instant() { python3 -c 'import datetime,sys; p=lambda t: datetime.datetime.fromisoformat(t.replace("Z","+00:00")); print("OK" if sys.argv[1] and sys.argv[2] and p(sys.argv[1])==p(sys.argv[2]) else "%r is not %r" % (sys.argv[1], sys.argv[2]))' "$1" "$2" 2>&1; }
made="$(as_owner "update public.reservation set created_at = now() - interval '2 hours' where id = '$R3' returning id")"
if [[ "$made" != "$R3" ]]; then
  fail "could not move the third plate's making into the past ($made)"
else
  TOKEN="$FONDA"
  s="$(ask "$SCRATCH/h3.json" POST "/rest/v1/rpc/$HAND_OVER" "$(by_names "$HAND_OVER_ARGS" "\"$R3\"" "\"$LATE\"")")"
  read_as_fonda "$SCRATCH/read5.json" > /dev/null
  kept="$(same_instant "$(verdict handed_at "$SCRATCH/read5.json" "$R3")" "$LATE")"
  TOKEN="$FONDA"
  s2="$(ask "$SCRATCH/h3b.json" POST "/rest/v1/rpc/$HAND_OVER" "$(by_names "$HAND_OVER_ARGS" "\"$R3\"" "\"$(iso 0)\"")")"
  read_as_fonda "$SCRATCH/read6.json" > /dev/null
  again="$(same_instant "$(verdict handed_at "$SCRATCH/read6.json" "$R3")" "$LATE")"
  if [[ "$s" != 200 ]]; then fail "a handover sent late answered $s $(head -c 200 "$SCRATCH/h3.json")"
  elif [[ "$kept" != OK ]]; then fail "a handover sent late did not keep her moment: $kept"
  elif [[ "$s2" != 200 || "$again" != OK ]]; then fail "sent again from her queue, the handover answered $s2 and moved: $again"
  else ok "a handover sent 40 minutes late keeps her phone's moment, and the queue's second send keeps the first"
  fi
fi

# --- 12. `10.5b-iv-b`: a thumb behind its handover, with her moment ----------------------------
# Group 7 refused a thumb on R3 while it was pending (`$NO_RATING_CODE`): a queue that sent the thumb first
# would take that as final and lose it. Behind the late handover, the same thumb lands — given at HER moment.
TOKEN="$FONDA"
s="$(ask "$SCRATCH/t4.json" POST "/rest/v1/rpc/$RATE" "$(by_names "$RATE_ARGS" "\"$R3\"" true "[\"$UP1\"]" "\"$THUMB_AT\"")")"
v="$(verdict rated "$SCRATCH/t4.json" "$RATED_KEYS" up "$UP1")"
given="$(same_instant "$(pick given_at "$(cat "$SCRATCH/t4.json")")" "$THUMB_AT")"
if [[ "$s" != 200 || "$v" != OK ]]; then fail "a thumb sent behind its late handover answered $s — $v $(head -c 200 "$SCRATCH/t4.json")"
elif [[ "$given" != OK ]]; then fail "a thumb sent late was not given at her moment: $given"
else ok "refused while its order was pending ($NO_RATING_CODE, group 7), the thumb sent behind the late handover lands, given at her phone's moment"
fi

# --- 13. `10.5b-iv-b`: which refusals her queue takes as the database's last word --------------
matches() { python3 -c 'import re,sys; print("yes" if re.search(sys.argv[1], sys.argv[2]) else "no")' "$1" "$2"; }
TOKEN="$VECINA"
s1="$(ask "$SCRATCH/q1.json" POST "/rest/v1/rpc/$HAND_OVER" "$(by_names "$HAND_OVER_ARGS" "\"$R1\"" "\"$(iso 0)\"")")"
TOKEN=""
s2="$(ask "$SCRATCH/q2.json" POST "/rest/v1/rpc/$HAND_OVER" "$(by_names "$HAND_OVER_ARGS" "\"$R1\"" "\"$(iso 0)\"")")"
TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.c2lnbmF0dXJl"
s3="$(ask "$SCRATCH/q3.json" POST "/rest/v1/rpc/$HAND_OVER" "$(by_names "$HAND_OVER_ARGS" "\"$R1\"" "\"$(iso 0)\"")")"
TOKEN="$FONDA"
c1="$(pick code "$(cat "$SCRATCH/q1.json")")"; m1="$(pick message "$(cat "$SCRATCH/q1.json")")"
c2="$(pick code "$(cat "$SCRATCH/q2.json")")"; m2="$(pick message "$(cat "$SCRATCH/q2.json")")"
c3="$(pick code "$(cat "$SCRATCH/q3.json")")"
if [[ "$c1" != 42501 || "$(matches "$FINAL_42501" "$m1")" != yes ]]; then
  fail "the functions' own refusal ($s1 $c1 '$m1') is not what her queue takes as final (/$FINAL_42501/) — a handover that is not hers would wait for ever"
elif [[ "$c2" != 42501 ]]; then
  fail "with no session the database answered $s2 '$c2' '$m2' — the case her queue tells apart from a refusal is not the database's"
elif [[ "$(matches "$FINAL_42501" "$m2")" != no ]]; then
  fail "a call with no session ('$m2') matches what her queue takes as final (/$FINAL_42501/) — a phone whose sign-in lapsed would drop her handover"
elif [[ ",$SESSION_CODES," != *",$c3,"* ]]; then
  fail "a broken token answered $s3 '$c3', which her queue does not wait on as her sign-in's ($SESSION_CODES) — it would be taken as a refusal"
elif [[ "$FINAL_CAMBIO" != "$CHANGED_CODE" || "$FINAL_NO_RATING" != "$NO_RATING_CODE" ]]; then
  fail "her queue draws $FINAL_CAMBIO as cambio and $FINAL_NO_RATING as yaNoSeCalifica, the database answered $CHANGED_CODE and $NO_RATING_CODE (group 7)"
else ok "her queue takes as final the functions' own 42501 ('$m1') and the codes the database answered, never a call with no session ($s2, '$m2'), and waits on a broken token ($c3)"
fi

echo
if (( fails > 0 )); then
  echo "$fails assertion group(s) failed."
  exit 1
fi
echo "all 13 assertion groups passed — Wera Cocina reads her kitchen's reservations, hands them over and rates the"
echo "neighbour by the names the database answers: every column and key, the labels it sends, the codes it turns into"
echo "sentences, a desechable only on a plate taken away, and never who reserved; and her queue's sends keep her moment,"
echo "a thumb lands behind its handover, and only the database's last word is taken as one."

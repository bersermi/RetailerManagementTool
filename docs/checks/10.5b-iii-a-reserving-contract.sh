#!/usr/bin/env bash
# 10.5b-iii-a-reserving-contract — does Itacate reserve, cancel, collect and read her
# standing by the names the database answers, and does it answer a neighbour what her
# screens draw?
#
# WHY THIS EXISTS. `itacate/src/api/apartados.ts` is Itacate's claim about `0079`'s four
# functions and `0080`'s three of hers (ADR-035 §2.7, *What is hers*) — the third, her stars
# about the kitchen (`rate_kitchen`), since `10.5b-iii-b`: seven function names,
# every argument's name, every key it reads at every level of two jsonb answers, the
# states it draws, and the refusal codes it turns into sentences. PostgREST matches a
# function BY ITS ARGUMENTS' NAMES, so a misspelt `p_` name is a 404; a misspelt key is a
# 200 with that part missing — a ticket with no code, a total with no price — and a
# misspelt state or code a screen that says the wrong thing. The typecheck, the suite and
# the bundler all pass over every one.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF `apartados.ts` (and the payment and eating codes out of
#      `cocinas.ts`), and the fonda's setup out of Wera Cocina's own files: nothing retyped.
#   2. A fonda makes, as Wera Cocina does, a kitchen with her address and page, takes cards
#      and serves here too, with a *desechable* of $5 (set by the database's owner: Wera
#      Cocina's screens for them are `10.5b-iv`'s), and publishes one dish, two plates.
#   3. A neighbour reads her standing by the app's names: every key, no yes, no score, one
#      at a time.
#   4. Before her yes, reserving is refused with the code the app reads as *sinSi*.
#   5. Her yes; her standing then carries it.
#   6. She reserves by the app's names — the last hour, by card, to eat there — and gets her
#      id and a three-digit code; the same id again is the same reservation; a second one
#      is refused with the code the app reads as *limite* (one until her first pickup).
#   7. Her reservations come back with every key the app reads, at every level, in the
#      state the app calls pending, as she chose them, money as two-decimal text — and no
#      *desechable* on a plate eaten there. The door then sends one plate left.
#   8. She cancels it more than an hour before her hour: the state the app calls
#      *cancelado*. She reserves the first hour, to go: its line carries the *desechable*;
#      giving it back within the hour is the state the app calls *no_va*.
#   9. She reserves again and says *Ya lo tengo*: the state the app calls collected; her
#      standing then lets her hold three.
#  10. *Ya lo tengo* on a cancelled one is refused with the code the app reads as
#      *yaNoPendiente*.
#  11. (`10.5b-iii-b`) She rates the plate she collected by the app's names — five stars and the
#      first good tag, a note — and her reservation then carries her stars, never her note; five
#      stars changed to two with the first of the other four tags is taken; a cancelled plate is
#      refused with the code the app reads as *yaNoSeCalifica*. The tags are read out of the app:
#      the good four from `cocinas.ts` (the door sends them too), the other four from `apartados.ts`.
#  12. Someone else — the fonda — reads none of hers, and signed out nothing is answered.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the database's own rules (`supabase/tests/0079_…` and
# `0080_…`: who may reserve by score, trust that grows past one pickup, the clock's *No se
# presentó*), or what the screens do with an answer (`itacate/test/apartados.test.ts`,
# `apartar.test.ts`, `calificar.test.ts`) — nor a kitchen's stars on the door, which come from five
# ratings counted the day after: `calificar.test.ts` holds the keys to the door's text, and
# `supabase/tests/0080_…` counts them. `TD015`, `TD017` and `TD020` are held to the migrations' text by
# that suite; this check meets the three a neighbour meets first.
#
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2 and this runs on the owner's Mac
# as well as in CI. ⚠️ TWO ACCOUNTS A RUN: GoTrue allows 30 sign-ups in 5 minutes, and the
# falsifier runs this a dozen times.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5b-iii-a-reserving-contract.sh
# With: $1 a copy of itacate's apartados.ts — how the falsifier points it at a broken one.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

APARTADOS_TS="${1:-itacate/src/api/apartados.ts}"
COCINAS_TS="itacate/src/api/cocinas.ts"
KITCHEN_TS="cocina/src/api/kitchen.ts"
PLACE_TS="cocina/src/api/place.ts"
LISTING_TS="cocina/src/api/listing.ts"
PAGINA_TS="cocina/src/api/pagina.ts"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
for f in "$APARTADOS_TS" "$COCINAS_TS" "$KITCHEN_TS" "$PLACE_TS" "$LISTING_TS" "$PAGINA_TS" "$CREDENTIALS_TS"; do
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
# The code the app reads as a falla — `TD021: 'sinSi',` or `'22023': 'cambio',`.
code_of() { sed -n "s/^  '\{0,1\}\([A-Z0-9]*\)'\{0,1\}: '$1',.*/\1/p" "$APARTADOS_TS" | head -1; }
nth() { cut -d, -f"$2" <<< "$1"; }

RESERVE="$(const RESERVE_PLATE "$APARTADOS_TS")"
MINE="$(const MY_RESERVATIONS "$APARTADOS_TS")"
CANCEL="$(const CANCEL_MY_RESERVATION "$APARTADOS_TS")"
CONFIRM="$(const CONFIRM_MY_PICKUP "$APARTADOS_TS")"
YES="$(const GIVE_MY_YES "$APARTADOS_TS")"
STANDING="$(const MY_STANDING "$APARTADOS_TS")"
RATE="$(const RATE_KITCHEN "$APARTADOS_TS")"
RATE_ARGS="$(fields_of "$APARTADOS_TS" RateArgs 'p_')"
RATED_KEYS="$(fields_of "$APARTADOS_TS" RatedRow '')"
MY_RATING_KEYS="$(fields_of "$APARTADOS_TS" MyRatingRow '')"
GOOD_TAGS="$(list_of ETIQUETAS_BUENAS "$COCINAS_TS")"
BAD_TAGS="$(list_of ETIQUETAS_MALAS "$APARTADOS_TS")"
NO_RATING_CODE="$(code_of yaNoSeCalifica)"
RESERVE_ARGS="$(fields_of "$APARTADOS_TS" ReserveArgs 'p_')"
ID_ARGS="$(fields_of "$APARTADOS_TS" ReservationIdArgs 'p_')"
RESERVED_KEYS="$(fields_of "$APARTADOS_TS" ReservedRow '')"
ROW_KEYS="$(fields_of "$APARTADOS_TS" ReservationRow '')"
KITCHEN_KEYS="$(fields_of "$APARTADOS_TS" ReservationKitchenRow '')"
ADDRESS_KEYS="$(fields_of "$APARTADOS_TS" ReservationAddressRow '')"
PAGE_KEYS="$(fields_of "$APARTADOS_TS" ReservationPageRow '')"
LINE_KEYS="$(fields_of "$APARTADOS_TS" ReservationLineRow '')"
STANDING_KEYS="$(fields_of "$APARTADOS_TS" StandingRow '')"
SCORE_KEYS="$(fields_of "$APARTADOS_TS" ScoreRow '')"
STATES="$(list_of ESTADOS "$APARTADOS_TS")"
NO_YES_CODE="$(code_of sinSi)"
LIMIT_CODE="$(code_of limite)"
NOT_PENDING_CODE="$(code_of yaNoPendiente)"
PAYMENTS="$(list_of PAGOS "$COCINAS_TS")"
WAYS="$(list_of COMERES "$COCINAS_TS")"
DOOR="$(const ON_OFFER_NOW "$COCINAS_TS")"
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

for pair in "RESERVE_PLATE:$RESERVE" "MY_RESERVATIONS:$MINE" "CANCEL_MY_RESERVATION:$CANCEL" "CONFIRM_MY_PICKUP:$CONFIRM" \
            "GIVE_MY_YES:$YES" "MY_STANDING:$STANDING" "ReserveArgs:$RESERVE_ARGS" "ReservationIdArgs:$ID_ARGS" \
            "ReservedRow:$RESERVED_KEYS" "ReservationRow:$ROW_KEYS" "ReservationKitchenRow:$KITCHEN_KEYS" \
            "ReservationAddressRow:$ADDRESS_KEYS" "ReservationPageRow:$PAGE_KEYS" "ReservationLineRow:$LINE_KEYS" \
            "StandingRow:$STANDING_KEYS" "ScoreRow:$SCORE_KEYS" "ESTADOS:$STATES" "the code for sinSi:$NO_YES_CODE" \
            "the code for limite:$LIMIT_CODE" "the code for yaNoPendiente:$NOT_PENDING_CODE" "PAGOS:$PAYMENTS" \
            "COMERES:$WAYS" "ON_OFFER_NOW:$DOOR" "ONBOARD_WORKSPACE:$ONBOARD" "OnboardArgs:$ONBOARD_ARGS" \
            "COCINA_KIND:$KIND" "PLACE_TABLE:$PLACE_TABLE" "PLACE_OWNER_COLUMN:$PLACE_OWNER" \
            "SET_STORE_ADDRESS:$SET_ADDRESS" "SetStoreAddressArgs:$ADDRESS_ARGS" "PUBLISH_LISTING:$PUBLISH" \
            "PublishArgs:$PUBLISH_ARGS" "LineBody:$LINE_BODY" "SET_KITCHEN_PAGE:$SET_PAGE" "SetPageArgs:$PAGE_ARGS" \
            "FULL_NAME_KEY:$NAME_KEY" "RATE_KITCHEN:$RATE" "RateArgs:$RATE_ARGS" "RatedRow:$RATED_KEYS" \
            "MyRatingRow:$MY_RATING_KEYS" "ETIQUETAS_BUENAS:$GOOD_TAGS" "ETIQUETAS_MALAS:$BAD_TAGS" \
            "the code for yaNoSeCalifica:$NO_RATING_CODE"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the apps' source"
    echo "      This check asserts the app's own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
PENDING="$(nth "$STATES" 1)"; COLLECTED="$(nth "$STATES" 2)"; CANCELLED="$(nth "$STATES" 3)"; NOT_GOING="$(nth "$STATES" 4)"
CASH="$(nth "$PAYMENTS" 1)"; CARD="$(nth "$PAYMENTS" 2)"
TO_GO="$(nth "$WAYS" 1)"; HERE="$(nth "$WAYS" 2)"
ok "read from Itacate: $RESERVE($RESERVE_ARGS) -> {$RESERVED_KEYS}, $MINE(), $CANCEL($ID_ARGS), $CONFIRM($ID_ARGS), $YES(), $STANDING()"
ok "and the answers: a reservation {$ROW_KEYS}, its kitchen {$KITCHEN_KEYS}, address {$ADDRESS_KEYS}, page {$PAGE_KEYS}, line {$LINE_KEYS}; her standing {$STANDING_KEYS}, score {$SCORE_KEYS}"
ok "and the states it draws ($STATES), the codes it reads ($NO_YES_CODE sinSi, $LIMIT_CODE limite, $NOT_PENDING_CODE yaNoPendiente), how she pays ($PAYMENTS) and eats ($WAYS)"
ok "and her stars: $RATE($RATE_ARGS) -> {$RATED_KEYS}, on her reservation {$MY_RATING_KEYS}; tags ($GOOD_TAGS) after four or five, ($BAD_TAGS) after one to three; $NO_RATING_CODE yaNoSeCalifica"

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
# Her hours inside a window, as Itacate offers them: every quarter hour from the first at or
# after the start, to 15 minutes before the end. `first` or `last`.
hour_in() { # first|last start end
  python3 -c '
import datetime, sys
which, start, end = sys.argv[1], sys.argv[2], sys.argv[3]
p = lambda t: datetime.datetime.fromisoformat(t.replace("Z", "+00:00"))
q = 15 * 60
s = int(p(start).timestamp()); e = int(p(end).timestamp()) - q
first = -(-s // q) * q; last = e // q * q
t = first if which == "first" else last
print(datetime.datetime.fromtimestamp(t, datetime.timezone.utc).isoformat().replace("+00:00", "Z"))' "$@"
}
# ⚠️ GoTrue rate-limits sign-ups and answers a limited one with an EMPTY body — retried, long
# enough to outlast its 5-minute window when the falsifier has spent it.
signup() { # email display-name -> a session token, or nothing
  python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": "itacate-probe-123", "data": {sys.argv[2]: sys.argv[3]}}))' \
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

STAMP="$$-$(date +%s)"

# --- 2. a fonda, as Wera Cocina makes her ------------------------------------
TOKEN="$(signup "fonda-apartar-$STAMP@example.com" "Doña Apartados $STAMP")"
[[ -n "$TOKEN" ]] || { fail "a fonda's sign-up got no session"; exit 1; }
FONDA="$TOKEN"
A="$(body "$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" "\"Fonda Doña Apartados $STAMP\"" "\"$KIND\"")")" | tr -d '"')"
[[ "$A" =~ ^[0-9a-f-]{36}$ ]] || { fail "could not make the kitchen: $A"; exit 1; }
PA="$(body "$(api GET "/rest/v1/$PLACE_TABLE?select=id&$PLACE_OWNER=eq.$A&order=created_at,id&limit=1")" | first_id)"
[[ -n "$PA" ]] || { fail "could not read the kitchen's place"; exit 1; }
out="$(api POST "/rest/v1/rpc/$SET_ADDRESS" "$(by_names "$ADDRESS_ARGS" "\"$PA\"" '"Sabino"' '"12"' '"Santa María la Ribera"' '"Cuauhtémoc"' '"06400"')")"
[[ "$(status "$out")" == 2* ]] || fail "her address could not be set: $(status "$out") $(body "$out" | head -c 160)"
out="$(api POST "/rest/v1/rpc/$SET_PAGE" "$(by_names "$PAGE_ARGS" "\"$A\"" '{"sentence": "Comida casera.", "color": "chile"}')")"
[[ "$(status "$out")" == 2* ]] || fail "her page could not be set: $(status "$out") $(body "$out" | head -c 160)"
# ⚠️ Her card, eating here and the desechable set by the database's owner: Wera Cocina's
# screens for them are `10.5b-iv`'s, and this check is about Itacate's names.
set_up="$(supabase db query --local -o csv "update public.kitchen_page set accepts_card = true, para_aqui = true, container_price = 5.00 where workspace_id = '$A' returning workspace_id" 2>/dev/null | tail -1)"
[[ "$set_up" == "$A" ]] || { fail "could not set her card, eating here and the desechable ($set_up)"; exit 1; }
START="$(iso 15)"; END="$(iso 165)"
OFFER="$(uuid)"
DISH="$(by_names "$LINE_BODY" '"Mole con arroz"' 'null' '[]' '"60.00"' '2' 'false' '"120.00"' 'null')"
out="$(api POST "/rest/v1/rpc/$PUBLISH" "$(by_names "$PUBLISH_ARGS" "\"$OFFER\"" "\"$PA\"" "\"$START\"" "\"$END\"" "[$DISH]")")"
[[ "$(status "$out")" == 200 ]] || { fail "she could not publish: $(status "$out") $(body "$out" | head -c 160)"; exit 1; }
FIRST_HOUR="$(hour_in first "$START" "$END")"; LAST_HOUR="$(hour_in last "$START" "$END")"
ok "a fonda makes, as Wera Cocina does, a kitchen that takes cards, serves here and charges a \$5 desechable, and publishes two plates of one dish"

# --- 3. a neighbour's standing, before anything --------------------------------------
TOKEN="$(signup "vecina-apartar-$STAMP@example.com" "Ana Probadora $STAMP")"
[[ -n "$TOKEN" ]] || { fail "a neighbour's sign-up got no session"; exit 1; }
VECINA="$TOKEN"

# Verdicts are one python file, a function per question.
cat > "$SCRATCH/v.py" <<'PY'
import json, re, sys

MONEY = re.compile(r'^\d+\.\d{2}$')
QTY = re.compile(r'^\d+\.\d{3}$')

def load(path):
    return json.load(open(path))

def missing(obj, keys_csv, what):
    if not isinstance(obj, dict):
        return '%s is %r, not an object' % (what, obj)
    gone = [k for k in keys_csv.split(',') if k not in obj]
    return '%s carried no %s' % (what, ', '.join(repr(k) for k in gone)) if gone else None

def standing(path, keys, score_keys, want_yes, want_limit):
    s = load(path)
    why = missing(s, keys, 'her standing')
    if why: print(why); return
    if (s['yes_at'] is not None) != (want_yes == 'yes'):
        print('her standing said yes_at %r, and she has %s given her yes' % (s.get('yes_at'), 'not' if want_yes != 'yes' else '')); return
    if s.get('score') is not None:
        why = missing(s['score'], score_keys, 'her score')
        print(why or 'a neighbour with no thumbs came back with a score %r' % s['score']); return
    if s.get('limit') != int(want_limit):
        print('her standing let her hold %r, the database rules %s now' % (s.get('limit'), want_limit)); return
    if not isinstance(s.get('labels'), dict):
        print('her standing came back with labels %r' % s.get('labels')); return
    print('OK')

def reserved(path, keys, rid):
    r = load(path)
    why = missing(r, keys, "reserve_plate's answer")
    if why: print(why); return
    if r.get('id') != rid:
        print('reserving answered id %r, the phone made %r' % (r.get('id'), rid)); return
    if not (isinstance(r.get('code'), int) and 100 <= r['code'] <= 999):
        print('her code came back %r, the app reads three digits' % r.get('code')); return
    print(r['code'])

def refused(path, want):
    try:
        e = load(path)
    except Exception:
        e = {}
    got = e.get('code') if isinstance(e, dict) else None
    print('OK' if got == want else 'the database answered %r, the app reads %r' % (got, want))

def mine(path, rid, row_keys, kitchen_keys, address_keys, page_keys, line_keys, state, payment, eat, container):
    rows = load(path)
    if not isinstance(rows, list):
        print('her reservations came back %r, not a list' % rows); return
    r = next((x for x in rows if isinstance(x, dict) and x.get('id') == rid), None)
    if r is None:
        print('her reservation %s is not in her list' % rid); return
    for obj, keys, what in ((r, row_keys, 'a reservation'), (r.get('kitchen'), kitchen_keys, "a reservation's kitchen"),
                            ((r.get('kitchen') or {}).get('address'), address_keys, "its kitchen's address"),
                            ((r.get('kitchen') or {}).get('page'), page_keys, "its kitchen's page")):
        why = missing(obj, keys, what)
        if why: print(why); return
    if r.get('state') != state:
        print('her reservation came back in state %r, the app knows %r' % (r.get('state'), state)); return
    if (r.get('payment'), r.get('eat')) != (payment, eat):
        print('her reservation came back paid %r and eaten %r, she chose %r and %r' % (r.get('payment'), r.get('eat'), payment, eat)); return
    lines = r.get('lines')
    if not isinstance(lines, list) or len(lines) != 1:
        print('her reservation came back with lines %r' % lines); return
    l = lines[0]
    why = missing(l, line_keys, "a reservation's line")
    if why: print(why); return
    if l.get('unit_price') != '60.00' or not MONEY.match(l.get('unit_price') or ''):
        print("the line's price came back %r — the app reads money as two-decimal text" % l.get('unit_price')); return
    if not (isinstance(l.get('quantity'), str) and QTY.match(l['quantity'])) or l['quantity'] != '1.000':
        print("the line's quantity came back %r — one plate, as three-decimal text" % l.get('quantity')); return
    want = None if container == 'none' else container
    if l.get('container_price') != want:
        print("the line's desechable came back %r, it should be %r for a plate %s" % (l.get('container_price'), want, 'taken away' if want else 'eaten there')); return
    if r['kitchen'].get('name', '').find('Doña Apartados') < 0 or r['kitchen']['address'].get('street') != 'Sabino':
        print("its kitchen came back %r" % r['kitchen']); return
    print('OK')

def left(path, kid, offer, want):
    rows = load(path)
    k = next((x for x in rows if isinstance(x, dict) and x.get('id') == kid), None)
    if k is None:
        print('the kitchen is not in the door'); return
    o = next((x for x in (k.get('on_offer') or []) if x.get('id') == offer), None)
    if o is None:
        print('her offer is not on offer'); return
    got = o['lines'][0].get('quantity')
    print('OK' if got == want else 'the door sends %r left, %r was reserved of two' % (got, want))

def rated(path, keys, stars, tag):
    r = load(path)
    why = missing(r, keys, "rate_kitchen's answer")
    if why: print(why); return
    if r.get('stars') != int(stars) or r.get('tags') != [tag]:
        print('rating answered %r, she gave %s stars and %r' % (r, stars, tag)); return
    print('OK')

def her_stars(path, rid, keys, stars, tag):
    rows = load(path)
    r = next((x for x in rows if isinstance(x, dict) and x.get('id') == rid), None)
    if r is None:
        print('the plate she rated is not in her list'); return
    why = missing(r.get('my_rating'), keys, 'her stars on her reservation')
    if why: print(why); return
    if 'note' in r['my_rating']:
        print('her reservation sent her note back — only Wera reads it: %r' % r['my_rating']); return
    if r['my_rating'].get('stars') != int(stars) or r['my_rating'].get('tags') != [tag]:
        print('her reservation carried %r, she gave %s stars and %r' % (r['my_rating'], stars, tag)); return
    if not r.get('rate_until'):
        print('her collected plate came back with no rate_until — the app would never offer Calificar'); return
    print('OK')

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

s="$(ask "$SCRATCH/standing.json" POST "/rest/v1/rpc/$STANDING" '{}')"
if [[ "$s" != 200 ]]; then fail "$STANDING() answered a neighbour $s $(head -c 200 "$SCRATCH/standing.json")"
else
  v="$(verdict standing "$SCRATCH/standing.json" "$STANDING_KEYS" "$SCORE_KEYS" no 1)"
  [[ "$v" == OK ]] && ok "a neighbour reads her standing through $STANDING(): every key the app reads, no yes, no score, one at a time" || fail "$v"
fi

# --- 4. before her yes, refused ---------------------------------------------------
R1="$(uuid)"
reserve_body() { by_names "$RESERVE_ARGS" "\"$1\"" "\"$OFFER\"" '1' "\"$2\"" "\"$3\"" "\"$4\""; }
s="$(ask "$SCRATCH/no-yes.json" POST "/rest/v1/rpc/$RESERVE" "$(reserve_body "$R1" "$LAST_HOUR" "$CARD" "$HERE")")"
v="$(verdict refused "$SCRATCH/no-yes.json" "$NO_YES_CODE")"
if [[ "$s" == 404 ]]; then fail "$RESERVE() answered 404 — no function by these arguments' names ($RESERVE_ARGS)"
elif [[ "$v" == OK ]]; then ok "before her yes, $RESERVE() refuses with $NO_YES_CODE — what the app reads as *sinSi* ($s)"
else fail "before her yes, $v"; fi

# --- 5. her yes ------------------------------------------------------------------------
s="$(ask "$SCRATCH/yes.json" POST "/rest/v1/rpc/$YES" '{}')"
s2="$(ask "$SCRATCH/standing2.json" POST "/rest/v1/rpc/$STANDING" '{}')"
v="$(verdict standing "$SCRATCH/standing2.json" "$STANDING_KEYS" "$SCORE_KEYS" yes 1)"
if [[ "$s" != 200 ]]; then fail "$YES() answered $s $(head -c 200 "$SCRATCH/yes.json")"
elif [[ "$v" == OK ]]; then ok "she gives her yes through $YES(), and her standing then carries it"
else fail "after her yes, $v"; fi

# --- 6. she reserves ------------------------------------------------------------------
s="$(ask "$SCRATCH/r1.json" POST "/rest/v1/rpc/$RESERVE" "$(reserve_body "$R1" "$LAST_HOUR" "$CARD" "$HERE")")"
if [[ "$s" != 200 ]]; then
  fail "$RESERVE() answered $s $(head -c 200 "$SCRATCH/r1.json")"
else
  CODE1="$(verdict reserved "$SCRATCH/r1.json" "$RESERVED_KEYS" "$R1")"
  if [[ "$CODE1" =~ ^[0-9]{3}$ ]]; then
    s="$(ask "$SCRATCH/r1-again.json" POST "/rest/v1/rpc/$RESERVE" "$(reserve_body "$R1" "$LAST_HOUR" "$CARD" "$HERE")")"
    again="$(verdict reserved "$SCRATCH/r1-again.json" "$RESERVED_KEYS" "$R1")"
    R2="$(uuid)"
    s2="$(ask "$SCRATCH/r2.json" POST "/rest/v1/rpc/$RESERVE" "$(reserve_body "$R2" "$FIRST_HOUR" "$CASH" "$TO_GO")")"
    lim="$(verdict refused "$SCRATCH/r2.json" "$LIMIT_CODE")"
    if [[ "$again" != "$CODE1" ]]; then fail "the same id again answered $again, not her reservation $CODE1"
    elif [[ "$lim" != OK ]]; then fail "a second reservation before her first pickup: $lim"
    else ok "she reserves by the app's names — her last hour, by card, to eat there — and gets her id and code $CODE1; the same id again is the same reservation; a second is refused with $LIMIT_CODE (*limite*)"
    fi
  else
    fail "$CODE1"
  fi
fi

# --- 7. her reservations, every key; the door's plates left --------------------------
s="$(ask "$SCRATCH/mine.json" POST "/rest/v1/rpc/$MINE" '{}')"
v="$(verdict mine "$SCRATCH/mine.json" "$R1" "$ROW_KEYS" "$KITCHEN_KEYS" "$ADDRESS_KEYS" "$PAGE_KEYS" "$LINE_KEYS" "$PENDING" "$CARD" "$HERE" none)"
s2="$(ask "$SCRATCH/door.json" POST "/rest/v1/rpc/$DOOR" '{}')"
d="$(verdict left "$SCRATCH/door.json" "$A" "$OFFER" '1.000')"
if [[ "$s" != 200 ]]; then fail "$MINE() answered $s $(head -c 200 "$SCRATCH/mine.json")"
elif [[ "$v" != OK ]]; then fail "$v"
elif [[ "$d" != OK ]]; then fail "$d"
else ok "her reservations come back through $MINE() with every key the app reads, at every level, '$PENDING', as she chose, money as text, no desechable eaten there — and the door sends one plate left"
fi

# --- 8. cancelling: more than an hour before, then within it ---------------------------
s="$(ask "$SCRATCH/cancel1.json" POST "/rest/v1/rpc/$CANCEL" "$(by_names "$ID_ARGS" "\"$R1\"")")"
got="$(tr -d '"' < "$SCRATCH/cancel1.json")"
R3="$(uuid)"
s3="$(ask "$SCRATCH/r3.json" POST "/rest/v1/rpc/$RESERVE" "$(reserve_body "$R3" "$FIRST_HOUR" "$CASH" "$TO_GO")")"
ask "$SCRATCH/mine3.json" POST "/rest/v1/rpc/$MINE" '{}' > /dev/null
v3="$(verdict mine "$SCRATCH/mine3.json" "$R3" "$ROW_KEYS" "$KITCHEN_KEYS" "$ADDRESS_KEYS" "$PAGE_KEYS" "$LINE_KEYS" "$PENDING" "$CASH" "$TO_GO" '5.00')"
s4="$(ask "$SCRATCH/cancel3.json" POST "/rest/v1/rpc/$CANCEL" "$(by_names "$ID_ARGS" "\"$R3\"")")"
got3="$(tr -d '"' < "$SCRATCH/cancel3.json")"
if [[ "$s" == 404 ]]; then fail "$CANCEL() answered 404 — no function by the argument's name ($ID_ARGS)"
elif [[ "$s" != 200 || "$got" != "$CANCELLED" ]]; then fail "cancelling more than an hour before her hour answered $s '$got', the app knows '$CANCELLED'"
elif [[ "$s3" != 200 ]]; then fail "reserving the first hour, to go, answered $s3 $(head -c 200 "$SCRATCH/r3.json")"
elif [[ "$v3" != OK ]]; then fail "$v3"
elif [[ "$s4" != 200 || "$got3" != "$NOT_GOING" ]]; then fail "giving it back within the hour answered $s4 '$got3', the app knows '$NOT_GOING'"
else ok "she cancels through $CANCEL() an hour or more before her hour — '$CANCELLED'; reserves the first hour to go, its line carrying the \$5 desechable; and within the hour gives it back — '$NOT_GOING'"
fi

# --- 9. Ya lo tengo -------------------------------------------------------------------
R4="$(uuid)"
s="$(ask "$SCRATCH/r4.json" POST "/rest/v1/rpc/$RESERVE" "$(reserve_body "$R4" "$FIRST_HOUR" "$CASH" "$TO_GO")")"
s2="$(ask "$SCRATCH/confirm4.json" POST "/rest/v1/rpc/$CONFIRM" "$(by_names "$ID_ARGS" "\"$R4\"")")"
got="$(tr -d '"' < "$SCRATCH/confirm4.json")"
ask "$SCRATCH/mine4.json" POST "/rest/v1/rpc/$MINE" '{}' > /dev/null
v="$(verdict mine "$SCRATCH/mine4.json" "$R4" "$ROW_KEYS" "$KITCHEN_KEYS" "$ADDRESS_KEYS" "$PAGE_KEYS" "$LINE_KEYS" "$COLLECTED" "$CASH" "$TO_GO" '5.00')"
ask "$SCRATCH/standing3.json" POST "/rest/v1/rpc/$STANDING" '{}' > /dev/null
w="$(verdict standing "$SCRATCH/standing3.json" "$STANDING_KEYS" "$SCORE_KEYS" yes 3)"
if [[ "$s" != 200 ]]; then fail "reserving again answered $s $(head -c 200 "$SCRATCH/r4.json")"
elif [[ "$s2" == 404 ]]; then fail "$CONFIRM() answered 404 — no function by the argument's name ($ID_ARGS)"
elif [[ "$s2" != 200 || "$got" != "$COLLECTED" ]]; then fail "*Ya lo tengo* answered $s2 '$got', the app knows '$COLLECTED'"
elif [[ "$v" != OK ]]; then fail "$v"
elif [[ "$w" != OK ]]; then fail "after her first pickup, $w"
else ok "she says *Ya lo tengo* through $CONFIRM() — '$COLLECTED' — and her standing then lets her hold three"
fi

# --- 10. Ya lo tengo on a cancelled one ------------------------------------------------
s="$(ask "$SCRATCH/confirm1.json" POST "/rest/v1/rpc/$CONFIRM" "$(by_names "$ID_ARGS" "\"$R1\"")")"
v="$(verdict refused "$SCRATCH/confirm1.json" "$NOT_PENDING_CODE")"
[[ "$v" == OK ]] && ok "*Ya lo tengo* on one she cancelled is refused with $NOT_PENDING_CODE — what the app reads as *yaNoPendiente* ($s)" || fail "*Ya lo tengo* on a cancelled one: $v"

# --- 11. her stars about the kitchen (`10.5b-iii-b`) ---------------------------------------
rate_body() { by_names "$RATE_ARGS" "\"$1\"" "$2" "[\"$3\"]" "$4"; }
s="$(ask "$SCRATCH/rate4.json" POST "/rest/v1/rpc/$RATE" "$(rate_body "$R4" 5 "$(nth "$GOOD_TAGS" 1)" '"Muy rico, gracias."')")"
v="$(verdict rated "$SCRATCH/rate4.json" "$RATED_KEYS" 5 "$(nth "$GOOD_TAGS" 1)")"
ask "$SCRATCH/mine5.json" POST "/rest/v1/rpc/$MINE" '{}' > /dev/null
w="$(verdict her_stars "$SCRATCH/mine5.json" "$R4" "$MY_RATING_KEYS" 5 "$(nth "$GOOD_TAGS" 1)")"
s2="$(ask "$SCRATCH/rate4b.json" POST "/rest/v1/rpc/$RATE" "$(rate_body "$R4" 2 "$(nth "$BAD_TAGS" 1)" null)")"
v2="$(verdict rated "$SCRATCH/rate4b.json" "$RATED_KEYS" 2 "$(nth "$BAD_TAGS" 1)")"
s3="$(ask "$SCRATCH/rate1.json" POST "/rest/v1/rpc/$RATE" "$(rate_body "$R1" 4 "$(nth "$GOOD_TAGS" 1)" null)")"
v3="$(verdict refused "$SCRATCH/rate1.json" "$NO_RATING_CODE")"
if [[ "$s" == 404 ]]; then fail "$RATE() answered 404 — no function by these arguments' names ($RATE_ARGS)"
elif [[ "$s" != 200 ]]; then fail "$RATE() answered $s $(head -c 200 "$SCRATCH/rate4.json")"
elif [[ "$v" != OK ]]; then fail "$v"
elif [[ "$w" != OK ]]; then fail "$w"
elif [[ "$s2" != 200 || "$v2" != OK ]]; then fail "two stars and '$(nth "$BAD_TAGS" 1)' answered $s2 — $v2 $(head -c 200 "$SCRATCH/rate4b.json")"
elif [[ "$v3" != OK ]]; then fail "rating one she cancelled: $v3"
else ok "she rates through $RATE() the plate she collected — five stars, '$(nth "$GOOD_TAGS" 1)', a note — and her reservation carries her stars, never her note; two stars with '$(nth "$BAD_TAGS" 1)' is taken; a cancelled plate is refused with $NO_RATING_CODE (*yaNoSeCalifica*)"
fi

# --- 12. nobody else's, and nothing signed out ------------------------------------------
TOKEN="$FONDA"
s="$(ask "$SCRATCH/fonda-mine.json" POST "/rest/v1/rpc/$MINE" '{}')"
v="$(verdict empty "$SCRATCH/fonda-mine.json")"
out="$(TOKEN="" api POST "/rest/v1/rpc/$MINE" '{}')"
if [[ "$s" != 200 || "$v" != OK ]]; then fail "the fonda asking $MINE(): $s $v"
elif [[ "$(status "$out")" == 2* ]]; then fail "signed out, $MINE() answered $(status "$out") — nothing is readable without an account"
else ok "someone else — the fonda — reads none of hers through $MINE(), and signed out it refuses ($(status "$out"))"
fi

echo
if (( fails > 0 )); then
  echo "$fails assertion group(s) failed."
  exit 1
fi
echo "all 12 assertion groups passed — Itacate reserves, gives back, collects, rates and reads her standing by"
echo "the names the database answers: every argument and key, the states its screens draw, the codes it turns into"
echo "sentences, a desechable only on a plate taken away, her stars without her note, and nothing of hers to anyone else."

#!/usr/bin/env bash
# 10.5b-iv-c-settings-contract — does Wera Cocina read and set her settings, read her stars,
# publish how each dish may be eaten, move − and +, and ask about a pending plate before a
# deletion, by the names the database answers?
#
# WHY THIS EXISTS. `cocina/src/api/ajustes.ts`, `calificaciones.ts`, the − and + half of
# `listing.ts` and the pre-deletion read of `account.ts` are Wera Cocina's claims about `0079`'s
# and `0080`'s schema: six columns and the keys `set_kitchen_page` reads, one function and every
# key of its jsonb answer, how a line is published and moved, and four filters on `reservation`.
# PostgREST matches a function BY ITS ARGUMENTS' NAMES, so a misspelt `p_` name is a 404; a
# misspelt column a 400; and `set_kitchen_page` and `publish_listing` IGNORE A KEY THEY DO NOT
# KNOW — a misspelt setting is a 200 that saved nothing, a misspelt way a dish published wider
# than she chose. The typecheck, the suite and the bundler all pass over every one.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF those four files, the fonda's setup out of Wera Cocina's own files
#      and the neighbour's reserving out of Itacate's: nothing retyped.
#   2. Her settings by the app's read, before she set anything: no row — the defaults.
#   3. Each setting set ALONE, by the app's key, through `set_kitchen_page` by the app's argument
#      names: the row it answers carries it, every earlier one kept; then the app's read returns all
#      six as set.
#   4. What the screens never send is refused (`22023`): neither way; a score not among the four;
#      a price of zero. A price cleared is none.
#   5. With both ways on, a dish published *para comer aquí* only by the app's keys comes back so,
#      a bag to go, a dish sent with none the kitchen's both — and the offer carries the desechable
#      as it stood; read back by the app's own read. A way the kitchen does not offer is refused.
#   6. − and +: `set_listing_quantity` by the app's names answers the app's keys as decimal text,
#      what is taken counted; below what a neighbour reserved is refused with the code the app reads
#      as hers; a line with nothing reserved goes to 0 — and the app's read still brings the offer,
#      that line at 0. Nobody but the kitchen moves it.
#   7. The door, as the neighbour: what is LEFT of each line, a line with nothing left not sent,
#      her payment, her ways, who may reserve and the offer's desechable — what her preview repeats.
#   8. Her stars below five: the count and nothing else.
#   9. From five (five rated plates made yesterday by the database's owner): the count, the
#      average, each of the eight tags the app reads, yesterday's stars and tags and nothing else —
#      and the door's three good tags are the app's rule over that answer (`estrellasDe`).
#  10. Before a deletion: the app's pending read finds the neighbour's plate, and both deletions
#      refuse with the code the app turns into its sentence; handed over, the read finds none.
#  11. Signed out, nothing is answered.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the database's own rules (`supabase/tests/0079_…`, `0080_…`), or what
# the screens do with an answer (`cocina/test/ajustes.test.ts`, `listing.test.ts`, `account.test.ts`).
#
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2. ⚠️ TWO ACCOUNTS A RUN: GoTrue allows 30
# sign-ups in 5 minutes, and the falsifier runs this a dozen times.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5b-iv-c-settings-contract.sh
# With: $1 ajustes.ts, $2 calificaciones.ts, $3 listing.ts, $4 account.ts — how the falsifier points it at a broken copy.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

AJUSTES_TS="${1:-cocina/src/api/ajustes.ts}"
CALIFICACIONES_TS="${2:-cocina/src/api/calificaciones.ts}"
LISTING_TS="${3:-cocina/src/api/listing.ts}"
ACCOUNT_TS="${4:-cocina/src/api/account.ts}"
PAGINA_TS="cocina/src/api/pagina.ts"
APARTADOS_TS="cocina/src/api/apartados.ts"
KITCHEN_TS="cocina/src/api/kitchen.ts"
PLACE_TS="cocina/src/api/place.ts"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
ITACATE_TS="itacate/src/api/apartados.ts"
COCINAS_TS="itacate/src/api/cocinas.ts"
for f in "$AJUSTES_TS" "$CALIFICACIONES_TS" "$LISTING_TS" "$ACCOUNT_TS" "$PAGINA_TS" "$APARTADOS_TS" "$KITCHEN_TS" "$PLACE_TS" "$CREDENTIALS_TS" "$ITACATE_TS" "$COCINAS_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f (run this from the repository root)"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the app's own claim, read out of its source ------------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
fields_of() { # file interface prefix-regex — a key may be optional (`?:`)
  awk -v want="export interface $2 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\)?\{0,1\}:.*/\1/p" | paste -sd, -
}
# A multi-line `export const NAME = [ 'a', 'b', ] as const;`, as a comma list.
list_of() { awk -v want="export const $1 = [" '$0==want{f=1;next} f&&/^\] as const;/{exit} f' "$2" | tr -d "', " | paste -sd, -; }
# A code in `export const QUANTITY_CODES = { TD019: 'apartados', … }` — the code the app reads as $1.
code_in() { awk '/^export const QUANTITY_CODES = \{/{f=1;next} f&&/^\} as const;/{exit} f' "$LISTING_TS" | sed -n "s/^  \([A-Z0-9]*\): '$1',.*/\1/p" | head -1; }
nth() { cut -d, -f"$2" <<< "$1"; }

A_TABLE="$(const AJUSTES_TABLE "$AJUSTES_TS")"
A_COLUMNS="$(const AJUSTES_COLUMNS "$AJUSTES_TS")"
A_OWNER="$(const AJUSTES_OWNER_COLUMN "$AJUSTES_TS")"
A_FIELDS="$(fields_of "$AJUSTES_TS" AjustesFields '')"
A_ARGS="$(fields_of "$AJUSTES_TS" SetAjustesArgs 'p_')"
SET_PAGE="$(const SET_KITCHEN_PAGE "$PAGINA_TS")"
RATINGS="$(const MY_KITCHEN_RATINGS "$CALIFICACIONES_TS")"
RATINGS_ARGS="$(fields_of "$CALIFICACIONES_TS" RatingsArgs 'p_')"
RATINGS_KEYS="$(fields_of "$CALIFICACIONES_TS" RatingsRow '')"
YESTERDAY_KEYS="$(fields_of "$CALIFICACIONES_TS" YesterdayRow '')"
TAGS="$(list_of ETIQUETAS "$CALIFICACIONES_TS")"
L_TABLE="$(const LISTING_TABLE "$LISTING_TS")"
L_COLUMNS="$(const LISTING_COLUMNS "$LISTING_TS")"
L_OWNER="$(const LISTING_OWNER_COLUMN "$LISTING_TS")"
PUBLISH="$(const PUBLISH_LISTING "$LISTING_TS")"
PUBLISH_ARGS="$(fields_of "$LISTING_TS" PublishArgs 'p_')"
LINE_BODY="$(fields_of "$LISTING_TS" LineBody '')"
QUANTITY="$(const SET_LISTING_QUANTITY "$LISTING_TS")"
QUANTITY_ARGS="$(fields_of "$LISTING_TS" SetQuantityArgs 'p_')"
QUANTITY_KEYS="$(fields_of "$LISTING_TS" QuantityRow '')"
TAKEN_CODE="$(code_in apartados)"
P_TABLE="$(const PENDING_TABLE "$ACCOUNT_TS")"
P_COLUMNS="$(const PENDING_COLUMNS "$ACCOUNT_TS")"
P_OWNER="$(const PENDING_OWNER_COLUMN "$ACCOUNT_TS")"
P_NULLS="$(const PENDING_NULL_COLUMNS "$ACCOUNT_TS")"
P_UNTIL="$(const PENDING_UNTIL_COLUMN "$ACCOUNT_TS")"
P_CODE="$(const PLATE_PENDING_CODE "$ACCOUNT_TS")"
DELETE_ACCOUNT="$(const DELETE_MY_ACCOUNT "$ACCOUNT_TS")"
DELETE_ARGS="$(fields_of "$ACCOUNT_TS" DeleteArgs 'p_')"
DELETE_BUSINESS="$(const DELETE_MY_BUSINESS "$ACCOUNT_TS")"
DELETE_BUSINESS_ARGS="$(fields_of "$ACCOUNT_TS" DeleteBusinessArgs 'p_')"
HAND_OVER="$(const HAND_OVER_RESERVATION "$APARTADOS_TS")"
HAND_OVER_ARGS="$(fields_of "$APARTADOS_TS" HandOverArgs 'p_')"
ONBOARD="$(const ONBOARD_WORKSPACE "$KITCHEN_TS")"
ONBOARD_ARGS="$(fields_of "$KITCHEN_TS" OnboardArgs 'p_')"
KIND="$(const COCINA_KIND "$KITCHEN_TS")"
PLACE_TABLE="$(const PLACE_TABLE "$PLACE_TS")"
PLACE_OWNER="$(const PLACE_OWNER_COLUMN "$PLACE_TS")"
SET_ADDRESS="$(const SET_STORE_ADDRESS "$PLACE_TS")"
ADDRESS_ARGS="$(fields_of "$PLACE_TS" SetStoreAddressArgs 'p_')"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"
RESERVE="$(const RESERVE_PLATE "$ITACATE_TS")"
RESERVE_ARGS="$(fields_of "$ITACATE_TS" ReserveArgs 'p_')"
YES="$(const GIVE_MY_YES "$ITACATE_TS")"
DOOR="$(const ON_OFFER_NOW "$COCINAS_TS")"

for pair in "AJUSTES_TABLE:$A_TABLE" "AJUSTES_COLUMNS:$A_COLUMNS" "AJUSTES_OWNER_COLUMN:$A_OWNER" "AjustesFields:$A_FIELDS" \
            "SetAjustesArgs:$A_ARGS" "SET_KITCHEN_PAGE:$SET_PAGE" "MY_KITCHEN_RATINGS:$RATINGS" "RatingsArgs:$RATINGS_ARGS" \
            "RatingsRow:$RATINGS_KEYS" "YesterdayRow:$YESTERDAY_KEYS" "ETIQUETAS:$TAGS" "LISTING_TABLE:$L_TABLE" \
            "LISTING_COLUMNS:$L_COLUMNS" "LISTING_OWNER_COLUMN:$L_OWNER" "PUBLISH_LISTING:$PUBLISH" "PublishArgs:$PUBLISH_ARGS" \
            "LineBody:$LINE_BODY" "SET_LISTING_QUANTITY:$QUANTITY" "SetQuantityArgs:$QUANTITY_ARGS" "QuantityRow:$QUANTITY_KEYS" \
            "the code for apartados:$TAKEN_CODE" "PENDING_TABLE:$P_TABLE" "PENDING_COLUMNS:$P_COLUMNS" "PENDING_OWNER_COLUMN:$P_OWNER" \
            "PENDING_NULL_COLUMNS:$P_NULLS" "PENDING_UNTIL_COLUMN:$P_UNTIL" "PLATE_PENDING_CODE:$P_CODE" \
            "DELETE_MY_ACCOUNT:$DELETE_ACCOUNT" "DeleteArgs:$DELETE_ARGS" "DELETE_MY_BUSINESS:$DELETE_BUSINESS" \
            "DeleteBusinessArgs:$DELETE_BUSINESS_ARGS" "HAND_OVER_RESERVATION:$HAND_OVER" "HandOverArgs:$HAND_OVER_ARGS" \
            "ONBOARD_WORKSPACE:$ONBOARD" "OnboardArgs:$ONBOARD_ARGS" "COCINA_KIND:$KIND" "PLACE_TABLE:$PLACE_TABLE" \
            "PLACE_OWNER_COLUMN:$PLACE_OWNER" "SET_STORE_ADDRESS:$SET_ADDRESS" "SetStoreAddressArgs:$ADDRESS_ARGS" \
            "FULL_NAME_KEY:$NAME_KEY" "RESERVE_PLATE:$RESERVE" "ReserveArgs:$RESERVE_ARGS" "GIVE_MY_YES:$YES" "ON_OFFER_NOW:$DOOR"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the apps' source"
    echo "      This check asserts the app's own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
CARD="$(nth "$A_FIELDS" 1)"; TRANSFER="$(nth "$A_FIELDS" 2)"; TO_GO="$(nth "$A_FIELDS" 3)"; HERE="$(nth "$A_FIELDS" 4)"
BOX="$(nth "$A_FIELDS" 5)"; MIN="$(nth "$A_FIELDS" 6)"
ok "read from Wera Cocina: her settings $A_TABLE?select=$A_COLUMNS by $A_OWNER, set as {$A_FIELDS} through $SET_PAGE($A_ARGS)"
ok "and her stars $RATINGS($RATINGS_ARGS) → {$RATINGS_KEYS}, yesterday's {$YESTERDAY_KEYS}, the tags $TAGS"
ok "and − and + $QUANTITY($QUANTITY_ARGS) → {$QUANTITY_KEYS}, $TAKEN_CODE below what is reserved; a line {$LINE_BODY}"
ok "and before a deletion $P_TABLE?select=$P_COLUMNS by $P_OWNER, $P_NULLS null, $P_UNTIL ahead; $P_CODE refuses"

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
first_hour() { # start — her first quarter hour, as Itacate offers it
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
  for try in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24; do
    out="$(TOKEN="" api POST /auth/v1/signup "$(cat "$SCRATCH/signup.json")")"
    token="$(pick access_token "$(body "$out")")"
    [[ -n "$token" ]] && break
    sleep 15
  done
  echo "$token"
}
as_owner() { supabase db query --local -o csv "$1" 2>/dev/null | tail -1; }

# Verdicts are one python file, a function per question.
cat > "$SCRATCH/v.py" <<'PY'
import json, sys

def load(path):
    try:
        return json.load(open(path))
    except Exception:
        return None

def missing(obj, keys_csv, what):
    if not isinstance(obj, dict):
        return '%s is %r, not an object' % (what, obj)
    gone = [k for k in keys_csv.split(',') if k not in obj]
    return '%s carried no %s' % (what, ', '.join(repr(k) for k in gone)) if gone else None

def money(v):
    return None if v is None else round(float(v), 2)

def settings(path, keys_csv, want_json):
    rows = load(path)
    if isinstance(rows, list):
        if len(rows) != 1: print('her settings came back %d rows, not her one' % len(rows)); return
        row = rows[0]
    else:
        row = rows
    why = missing(row, keys_csv, 'her settings')
    if why: print(why); return
    want = json.loads(want_json)
    for k, v in want.items():
        got = row.get(k)
        if k in ('container_price',):
            got, v = money(got), money(v)
        if got != v:
            print('%s came back %r, she set %r' % (k, row.get(k), want[k])); return
    print('OK')

def none_yet(path):
    rows = load(path)
    print('OK' if rows == [] else 'a kitchen that set nothing read %r, not no row' % (rows,))

def ways(path, oid, line_keys, desechable):
    rows = load(path)
    if not isinstance(rows, list): print('her list came back %r' % (rows,)); return
    o = next((r for r in rows if isinstance(r, dict) and r.get('id') == oid), None)
    if o is None: print('the offer is not in her list'); return
    if 'container_price' not in o: print("the offer carried no 'container_price'"); return
    if money(o.get('container_price')) != money(desechable):
        print('the offer carried a desechable of %r, the kitchen stated %r' % (o.get('container_price'), desechable)); return
    lines = sorted(o.get('listing_line') or [], key=lambda l: l.get('line_no', 0))
    if len(lines) != 4: print('its lines came back %r' % (lines,)); return
    for l in lines:
        why = missing(l, 'para_llevar,para_aqui', 'a line')
        if why: print(why); return
    got = [(l['para_llevar'], l['para_aqui']) for l in lines]
    want = [(False, True), (True, False), (True, True), (True, False)]
    if got != want:
        print('the ways came back %r: she sent a dish para comer aquí only, a bag, a dish as the kitchen and one para llevar only; wanted %r' % (got, want)); return
    print('OK')

def quantity(path, keys_csv, count, taken):
    d = load(path)
    why = missing(d, keys_csv, 'its answer')
    if why: print(why); return
    for k in keys_csv.split(','):
        if not isinstance(d[k], str): print('%s came back %r, not decimal text' % (k, d[k])); return
    if (float(d.get('quantity', -1)), float(d.get('taken', -1))) != (float(count), float(taken)):
        print('it answered %r, wanted %s offered and %s taken' % (d, count, taken)); return
    print('OK')

def zero_line(path, oid, line_no):
    line_no = int(line_no)
    rows = load(path)
    o = next((r for r in (rows or []) if isinstance(r, dict) and r.get('id') == oid), None)
    if o is None: print('the offer left her list once a line reached 0'); return
    l = next((x for x in o.get('listing_line') or [] if x.get('line_no') == line_no), None)
    if l is None or float(l.get('quantity', -1)) != 0:
        print('line %d came back %r, set to 0' % (line_no, l)); return
    print('OK')

def door(path, kid, oid):
    ks = load(path)
    k = next((x for x in (ks or []) if isinstance(x, dict) and x.get('id') == kid), None)
    if k is None: print('the door did not send her kitchen'); return
    if k.get('payment') != ['efectivo', 'tarjeta', 'transferencia']: print('payment came back %r' % (k.get('payment'),)); return
    if k.get('eat') != ['llevar', 'aqui']: print('eat came back %r' % (k.get('eat'),)); return
    if k.get('min_score') != 80: print('min_score came back %r' % (k.get('min_score'),)); return
    o = next((x for x in k.get('on_offer') or [] if x.get('id') == oid), None)
    if o is None: print('the offer is not on offer'); return
    if money(o.get('container_price')) != 5.5: print("the offer's desechable came back %r" % (o.get('container_price'),)); return
    lines = {l.get('line_no'): l for l in o.get('lines') or []}
    if 3 in lines: print('a line with nothing left was sent: %r' % (lines[3],)); return
    if 1 not in lines or float(lines[1].get('quantity')) != 3:
        print('line 1 came back %r: 4 offered less 1 taken is 3 left' % (lines.get(1),)); return
    print('OK')

def few(path, n):
    n = int(n)
    d = load(path)
    print('OK' if d == {'count': n} else 'below five it answered %r, not {"count": %d} alone' % (d, n))

def stars(path, keys_csv, yesterday_keys, tags_csv):
    d = load(path)
    why = missing(d, keys_csv, 'her stars')
    if why: print(why); return
    if (d['count'], d['average']) != (5, '4.2'):
        print('count and average came back %r and %r, wanted 5 and "4.2"' % (d['count'], d['average'])); return
    tags = d['tags']
    for t in tags_csv.split(','):
        if t not in tags: print('the tags carried no %r' % t); return
    want = {'lista_a_tiempo': 3, 'muy_rica': 3, 'buena_porcion': 1, 'tuve_que_esperar': 1}
    for t, n in want.items():
        if tags.get(t) != n: print('%s came back %r, given %d times' % (t, tags.get(t), n)); return
    y = d['yesterday']
    if not isinstance(y, list) or len(y) != 5: print('yesterday came back %r' % (y,)); return
    for r in y:
        if sorted(r.keys()) != sorted(yesterday_keys.split(',')):
            print("yesterday's rating carried %r — the app reads %s, and nothing may say who" % (sorted(r.keys()), yesterday_keys)); return
    print('OK')

def door_stars(stars_path, door_path, kid):
    d = load(stars_path)
    ks = load(door_path)
    k = next((x for x in (ks or []) if isinstance(x, dict) and x.get('id') == kid), None)
    if k is None or not isinstance(k.get('stars'), dict): print('the door sent no stars: %r' % (k and k.get('stars'),)); return
    good = ['lista_a_tiempo', 'buena_porcion', 'muy_rica', 'me_atendieron_bien']
    rule = sorted([t for t in good if d['tags'].get(t, 0) > 0], key=lambda t: (-d['tags'][t], t))[:3]
    s = k['stars']
    if (s.get('average'), s.get('count'), s.get('tags')) != (d['average'], d['count'], rule):
        print('the door sent %r; her own answer by the app\'s rule makes %r' % (s, {'average': d['average'], 'count': d['count'], 'tags': rule})); return
    print('OK')

def pending(path, rid):
    rows = load(path)
    if rid == '':
        print('OK' if rows == [] else 'with nothing pending the read found %r' % (rows,)); return
    if not isinstance(rows, list) or [r.get('id') for r in rows] != [rid]:
        print('the read found %r, wanted the pending plate %s' % (rows, rid)); return
    print('OK')

def code(path, want):
    d = load(path)
    got = d.get('code') if isinstance(d, dict) else None
    print('OK' if got == want else 'it answered %r, the app reads %r' % (d, want))

globals()[sys.argv[1]](*sys.argv[2:])
PY
verdict() { python3 "$SCRATCH/v.py" "$@"; }
check() { # what verdict args...
  local what="$1"; shift
  local v; v="$(verdict "$@")"
  if [[ "$v" == OK ]]; then ok "$what"; else fail "$what — $v"; fi
}

STAMP="$$-$(date +%s)"

# --- a fonda, as Wera Cocina makes her ---------------------------------------
TOKEN="$(signup "fonda-ajustes-$STAMP@example.com" "Doña Ajustes $STAMP")"
[[ -n "$TOKEN" ]] || { fail "a fonda's sign-up got no session"; exit 1; }
FONDA="$TOKEN"
NAME="Fonda Doña Ajustes $STAMP"
A="$(body "$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" "\"$NAME\"" "\"$KIND\"")")" | tr -d '"')"
[[ "$A" =~ ^[0-9a-f-]{36}$ ]] || { fail "could not make the kitchen: $A"; exit 1; }
PA="$(body "$(api GET "/rest/v1/$PLACE_TABLE?select=id&$PLACE_OWNER=eq.$A&order=created_at,id&limit=1")" | first_id)"
[[ -n "$PA" ]] || { fail "could not read the kitchen's place"; exit 1; }
out="$(api POST "/rest/v1/rpc/$SET_ADDRESS" "$(by_names "$ADDRESS_ARGS" "\"$PA\"" '"Sabino"' '"12"' '"Santa María la Ribera"' '"Cuauhtémoc"' '"06400"')")"
[[ "$(status "$out")" == 2* ]] || fail "her address could not be set: $(status "$out") $(body "$out" | head -c 160)"

read_settings() { api GET "/rest/v1/$A_TABLE?select=$A_COLUMNS&$A_OWNER=eq.$A"; }
set_one() { # key json-value -> status; the answered row in $SCRATCH/set.json
  local out; out="$(api POST "/rest/v1/rpc/$SET_PAGE" "$(by_names "$A_ARGS" "\"$A\"" "{\"$1\": $2}")")"
  body "$out" > "$SCRATCH/set.json"
  status "$out"
}

# --- 2. nothing set yet ----------------------------------------------------
out="$(read_settings)"
if [[ "$(status "$out")" != 200 ]]; then
  fail "her settings' read answered $(status "$out"): $(body "$out" | head -c 200)"
else
  body "$out" > "$SCRATCH/s0.json"
  check "her settings by the app's read, before she set any: no row — the defaults" none_yet "$SCRATCH/s0.json"
fi

# --- 3. each setting alone, by the app's key -------------------------------
so_far='{}'
for pair in "$CARD:true" "$TRANSFER:true" "$HERE:true" "$BOX:\"5.50\"" "$MIN:80"; do
  k="${pair%%:*}"; v="${pair#*:}"
  s="$(set_one "$k" "$v")"
  so_far="$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); d[sys.argv[2]]=json.loads(sys.argv[3]); print(json.dumps(d))' "$so_far" "$k" "$v")"
  if [[ "$s" != 200 ]]; then
    fail "$SET_PAGE answered $s to {$k: $v}: $(head -c 200 "$SCRATCH/set.json")"
  else
    check "$k set alone by the app's key — the row it answers carries it, and every one set before" settings "$SCRATCH/set.json" "$A_FIELDS" "$so_far"
  fi
done
out="$(read_settings)"; body "$out" > "$SCRATCH/s1.json"
want_all="$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); d[sys.argv[2]]=True; print(json.dumps(d))' "$so_far" "$TO_GO")"
check "and the app's read returns all six as set" settings "$SCRATCH/s1.json" "$A_FIELDS" "$want_all"

# --- 4. what the screens never send --------------------------------------
s="$(set_one "$TO_GO" false)"
[[ "$s" == 200 ]] && ok "one way only — para comer aquí — is taken" || fail "para comer aquí alone was refused: $s $(head -c 160 "$SCRATCH/set.json")"
s="$(set_one "$HERE" false)"
if [[ "$s" == 400 ]] && [[ "$(pick code "$(cat "$SCRATCH/set.json")")" == 22023 ]]; then ok "neither way is refused 22023 — the screen never sends it"; else fail "neither way answered $s $(head -c 160 "$SCRATCH/set.json")"; fi
s="$(set_one "$TO_GO" true)"; [[ "$s" == 200 ]] || fail "to go could not be switched back on: $s"
s="$(set_one "$MIN" 70)"
if [[ "$s" == 400 ]] && [[ "$(pick code "$(cat "$SCRATCH/set.json")")" == 22023 ]]; then ok "a score not among the four is refused 22023"; else fail "min_score 70 answered $s $(head -c 160 "$SCRATCH/set.json")"; fi
s="$(set_one "$BOX" '"0"')"
if [[ "$s" == 400 ]] && [[ "$(pick code "$(cat "$SCRATCH/set.json")")" == 22023 ]]; then ok "a desechable of zero is refused 22023"; else fail "a desechable of 0 answered $s $(head -c 160 "$SCRATCH/set.json")"; fi
s="$(set_one "$BOX" null)"
if [[ "$s" == 200 ]] && [[ "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get(sys.argv[2]))' "$SCRATCH/set.json" "$BOX")" == None ]]; then ok "No lo cobro: a desechable cleared is none"; else fail "clearing the desechable answered $s $(head -c 160 "$SCRATCH/set.json")"; fi
s="$(set_one "$BOX" '"5.50"')"; [[ "$s" == 200 ]] || fail "the desechable could not be set again: $s"

# --- 5. how each dish may be eaten -----------------------------------------
START="$(iso 15)"; END="$(iso 165)"
OFFER="$(uuid)"
line_of() { # name surprise para_llevar para_aqui
  by_names "$LINE_BODY" "\"$1\"" 'null' '[]' '"60.00"' '4' "$2" '"120.00"' 'null' "$3" "$4"
}
DISH1="$(line_of 'Mole con arroz' false false true)"
BAG="$(line_of 'Bolsa de pan' true null null)"
DISH3="$(line_of 'Comida corrida' false null null)"
# ⚠️ And one to go only: with both keys tested each way, a misspelt key widens a dish visibly.
DISH4="$(line_of 'Tamales' false true false)"
out="$(api POST "/rest/v1/rpc/$PUBLISH" "$(by_names "$PUBLISH_ARGS" "\"$OFFER\"" "\"$PA\"" "\"$START\"" "\"$END\"" "[$DISH1,$BAG,$DISH3,$DISH4]")")"
[[ "$(status "$out")" == 200 ]] || { fail "she could not publish with the app's ways: $(status "$out") $(body "$out" | head -c 200)"; exit 1; }
read_list() { api GET "/rest/v1/$L_TABLE?select=$L_COLUMNS&$L_OWNER=eq.$A&order=created_at.desc,id.desc&listing_line.order=line_no.asc&limit=60"; }
out="$(read_list)"
if [[ "$(status "$out")" != 200 ]]; then
  fail "her list's read answered $(status "$out"): $(body "$out" | head -c 200)"
else
  body "$out" > "$SCRATCH/list.json"
  check "a dish para comer aquí only, a bag to go, a dish as the kitchen's both, one para llevar only — and the offer's desechable as it stood, by the app's own read" ways "$SCRATCH/list.json" "$OFFER" "$LINE_BODY" 5.5
fi
s="$(set_one "$HERE" false)"; [[ "$s" == 200 ]] || fail "para comer aquí could not be switched off: $s"
out="$(api POST "/rest/v1/rpc/$PUBLISH" "$(by_names "$PUBLISH_ARGS" "\"$(uuid)\"" "\"$PA\"" "\"$START\"" "\"$END\"" "[$DISH1]")")"
if [[ "$(status "$out")" == 400 ]] && [[ "$(pick code "$(body "$out")")" == 22023 ]]; then ok "a way her kitchen does not offer is refused 22023 — the app sends one only when both are on"; else fail "a way the kitchen lacks answered $(status "$out") $(body "$out" | head -c 160)"; fi
s="$(set_one "$HERE" true)"; [[ "$s" == 200 ]] || fail "para comer aquí could not be switched on again: $s"

# --- a neighbour reserves one plate of the first dish -------------------------
TOKEN="$(signup "vecina-ajustes-$STAMP@example.com" "Ana Ajustes $STAMP")"
[[ -n "$TOKEN" ]] || { fail "a neighbour's sign-up got no session"; exit 1; }
VECINA="$TOKEN"
api POST "/rest/v1/rpc/$YES" '{}' > /dev/null
R1="$(uuid)"
HOUR="$(first_hour "$START")"
out="$(api POST "/rest/v1/rpc/$RESERVE" "$(by_names "$RESERVE_ARGS" "\"$R1\"" "\"$OFFER\"" '1' "\"$HOUR\"" '"efectivo"' '"aqui"')")"
[[ "$(status "$out")" == 200 ]] || { fail "the neighbour could not reserve, as Itacate does: $(status "$out") $(body "$out" | head -c 200)"; exit 1; }

# --- 6. − and + ---------------------------------------------------------------
move() { # line quantity -> status; the answer in $SCRATCH/q.json
  local out; out="$(api POST "/rest/v1/rpc/$QUANTITY" "$(by_names "$QUANTITY_ARGS" "\"$OFFER\"" "$1" "$2")")"
  body "$out" > "$SCRATCH/q.json"
  status "$out"
}
TOKEN="$VECINA"
s="$(move 1 5)"
[[ "$s" == 401 || "$s" == 403 ]] && ok "the neighbour cannot move it ($s)" || fail "the neighbour moved her offer: $s $(head -c 160 "$SCRATCH/q.json")"
TOKEN="$FONDA"
s="$(move 1 4)"
if [[ "$s" == 200 ]]; then check "+ and − by the app's names: the app's keys as decimal text, the neighbour's plate counted as taken" quantity "$SCRATCH/q.json" "$QUANTITY_KEYS" 4 1
else fail "$QUANTITY answered $s: $(head -c 200 "$SCRATCH/q.json")"; fi
s="$(move 1 0)"
if [[ "$s" == 400 ]]; then check "below what is reserved is refused with the code the app reads as hers ($TAKEN_CODE)" code "$SCRATCH/q.json" "$TAKEN_CODE"
else fail "below what is reserved answered $s $(head -c 160 "$SCRATCH/q.json")"; fi
s="$(move 3 0)"
[[ "$s" == 200 ]] || fail "a line with nothing reserved could not go to 0: $s $(head -c 160 "$SCRATCH/q.json")"
out="$(read_list)"; body "$out" > "$SCRATCH/list2.json"
check "a line at 0: the app's read still brings the offer, that line at 0" zero_line "$SCRATCH/list2.json" "$OFFER" 3

# --- 7. the door, as the neighbour --------------------------------------------
TOKEN="$VECINA"
out="$(api POST "/rest/v1/rpc/$DOOR" '{}')"; body "$out" > "$SCRATCH/door.json"
check "the door sends what is left (4 less 1), not a line with none, and her payment, ways, score and desechable — what her preview repeats" door "$SCRATCH/door.json" "$A" "$OFFER"

# --- 8. her stars below five --------------------------------------------------
TOKEN="$FONDA"
out="$(api POST "/rest/v1/rpc/$RATINGS" "$(by_names "$RATINGS_ARGS" "\"$A\"")")"
if [[ "$(status "$out")" == 200 ]]; then body "$out" > "$SCRATCH/few.json"; check "her stars below five: the count and nothing else" few "$SCRATCH/few.json" 0
else fail "$RATINGS answered $(status "$out"): $(body "$out" | head -c 200)"; fi

# --- 9. from five: five plates rated yesterday, made by the database's owner ---
made="$(as_owner "with src as (select * from public.reservation where id = '$R1'),
  r as (insert into public.reservation (id, workspace_id, location_id, listing_id, code, pickup_at, pickup_day, held_until, payment, eat, created_at, handed_over_at)
        select gen_random_uuid(), src.workspace_id, src.location_id, src.listing_id, 100 + g, src.pickup_at - interval '2 days',
               src.pickup_day - 2, src.held_until - interval '2 days', src.payment, src.eat, now() - interval '2 days', now() - interval '2 days'
          from src, generate_series(1, 5) g
        returning id, code),
  k as (insert into servicio.kitchen_rating (reservation_id, stars, tags, given_at)
        select r.id,
               case r.code - 100 when 4 then 4 when 5 then 2 else 5 end,
               case r.code - 100 when 4 then array['buena_porcion'] when 5 then array['tuve_que_esperar']
                                 else array['lista_a_tiempo', 'muy_rica'] end,
               -- an hour before today began in her kitchen's zone: yesterday, counted the day after
               ((now() at time zone 'America/Mexico_City')::date)::timestamp at time zone 'America/Mexico_City' - interval '1 hour'
          from r
        returning 1)
  select count(*) from k")"
[[ "$made" == 5 ]] || fail "could not make five rated plates as the database's owner ($made)"
out="$(api POST "/rest/v1/rpc/$RATINGS" "$(by_names "$RATINGS_ARGS" "\"$A\"")")"; body "$out" > "$SCRATCH/stars.json"
check "from five: the count, the average, each of the app's eight tags, yesterday's stars and tags — the app's keys and nothing else" stars "$SCRATCH/stars.json" "$RATINGS_KEYS" "$YESTERDAY_KEYS" "$TAGS"
TOKEN="$VECINA"
out="$(api POST "/rest/v1/rpc/$DOOR" '{}')"; body "$out" > "$SCRATCH/door2.json"
check "the door's stars are the app's rule over her own answer: the average, the count, the three most given good tags" door_stars "$SCRATCH/stars.json" "$SCRATCH/door2.json" "$A"

# --- 10. before a deletion ------------------------------------------------------
TOKEN="$FONDA"
pending_read() {
  local q="/rest/v1/$P_TABLE?select=$P_COLUMNS&$P_OWNER=in.($A)" c
  for c in ${P_NULLS//,/ }; do q="$q&$c=is.null"; done
  api GET "$q&$P_UNTIL=gt.$(iso 0)&limit=1"
}
out="$(pending_read)"
if [[ "$(status "$out")" != 200 ]]; then fail "the pending read answered $(status "$out"): $(body "$out" | head -c 200)"
else body "$out" > "$SCRATCH/p1.json"; check "the app's pending read finds the neighbour's plate" pending "$SCRATCH/p1.json" "$R1"; fi
out="$(api POST "/rest/v1/rpc/$DELETE_BUSINESS" "$(by_names "$DELETE_BUSINESS_ARGS" "\"$A\"" "\"$NAME\"")")"; body "$out" > "$SCRATCH/d1.json"
check "her kitchen's deletion refuses with the code the app turns into its sentence" code "$SCRATCH/d1.json" "$P_CODE"
out="$(api POST "/rest/v1/rpc/$DELETE_ACCOUNT" "$(by_names "$DELETE_ARGS" "[\"$NAME\"]")")"; body "$out" > "$SCRATCH/d2.json"
check "and her account's" code "$SCRATCH/d2.json" "$P_CODE"
out="$(api POST "/rest/v1/rpc/$HAND_OVER" "$(by_names "$HAND_OVER_ARGS" "\"$R1\"" "\"$(iso 0)\"")")"
[[ "$(status "$out")" == 200 ]] || fail "the plate could not be handed over: $(status "$out") $(body "$out" | head -c 160)"
out="$(pending_read)"; body "$out" > "$SCRATCH/p2.json"
check "handed over, the pending read finds none" pending "$SCRATCH/p2.json" ''

# --- 11. signed out -------------------------------------------------------------
TOKEN=""
out="$(read_settings)"
[[ "$(status "$out")" == 200 && "$(body "$out")" == "[]" ]] || [[ "$(status "$out")" == 401 ]] \
  && ok "signed out, her settings are nobody's to read" || fail "signed out, her settings answered $(status "$out") $(body "$out" | head -c 120)"
out="$(api POST "/rest/v1/rpc/$RATINGS" "$(by_names "$RATINGS_ARGS" "\"$A\"")")"
[[ "$(status "$out")" == 401 || "$(status "$out")" == 403 ]] && ok "signed out, her stars are refused ($(status "$out"))" || fail "signed out, her stars answered $(status "$out")"

echo
if (( fails > 0 )); then
  echo "$fails assertion(s) failed."
  exit 1
fi
echo "every assertion held: Wera Cocina's settings, stars, − and +, ways and pending read are the names the database answers."

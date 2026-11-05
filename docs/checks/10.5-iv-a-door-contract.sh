#!/usr/bin/env bash
# 10.5-iv-a-door-contract — does Itacate read the one door by the names it
# answers, and does the door answer a neighbour what the list draws?
#
# WHY THIS EXISTS. `itacate/src/api/cocinas.ts` is Itacate's claim about `0078`'s
# `on_offer_now()` (ADR-035 §2.7): the door's name, and the KEYS it reads at every
# level of the answer — a kitchen, her address, her point and whose it is, her page,
# what she offers, each line, what she usually publishes, each dish she repeats. The
# door answers ONE jsonb value, so a misspelt key is not a 400 or a 404: it is a
# 200 with that part missing — a kitchen with no distance, a price that never draws
# — which the typecheck, the suite and the bundler all pass over. And the money
# travels as decimal TEXT (`"60.00"`), which `parseDecimal` refuses as a number.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF `cocinas.ts` — the door, every interface's keys, the
#      two point sources — and the fonda's setup out of Wera Cocina's own files
#      (`kitchen.ts`, `place.ts`, `listing.ts`, `pagina.ts`, `credentials.ts`):
#      nothing is retyped here.
#   2. A fonda makes, as Wera Cocina does, a shop and three kitchens: A with her
#      trade, her address, her own pin, her page and two publications on offer (a
#      dish with its photo and *vale*, a bag; the dish again later, so it repeats);
#      B with her address and Google's point, one publication whose window is then
#      moved into the past by the database's owner — QUIET; C with nothing published.
#   3. A neighbour — no business's member — calls the door as the app does: 200, a
#      list.
#   4. A comes back with every key the app reads, at every level, each value of the
#      type the app reads and as sent: money as two-decimal text, quantities as
#      three-decimal text, her pin under its source, the lines, her page, the
#      summary with the dish she repeats.
#   5. B comes back quiet — nothing on offer, her summary — at Google's point, under
#      Google's source.
#   6. C and the shop do not come back: the door shows a kitchen that published in
#      the last 14 days, and never a shop.
#   7. Signed out, the door refuses.
#
# ⚠️ WHAT IT DOES NOT ASSERT: who may write a kitchen's point, page or publications
# (`supabase/tests/0072`, `0076`, `0078` and the Wera Cocina checks), the 14 and 29
# days, or that the door never sorts on Google's point (`0078`'s census). Nor what
# the list does with the answer: `itacate/test/cocinas.test.ts` and
# `itacate/test/lista.test.ts`.
#
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5-iv-a-door-contract.sh
# With: $1 a copy of itacate's cocinas.ts — how the falsifier points it at a broken one.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

COCINAS_TS="${1:-itacate/src/api/cocinas.ts}"
KITCHEN_TS="cocina/src/api/kitchen.ts"
PLACE_TS="cocina/src/api/place.ts"
LISTING_TS="cocina/src/api/listing.ts"
PAGINA_TS="cocina/src/api/pagina.ts"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
for f in "$COCINAS_TS" "$KITCHEN_TS" "$PLACE_TS" "$LISTING_TS" "$PAGINA_TS" "$CREDENTIALS_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f (run this from the repository root)"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the app's own claim, read out of its source ------------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
# An interface's field names, comma-joined, in declaration order.
fields_of() { # file interface prefix-regex
  awk -v want="export interface $2 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\):.*/\1/p" | paste -sd, -
}
DOOR="$(const ON_OFFER_NOW "$COCINAS_TS")"
KITCHEN_KEYS="$(fields_of "$COCINAS_TS" KitchenRow '')"
ADDRESS_KEYS="$(fields_of "$COCINAS_TS" AddressRow '')"
POINT_KEYS="$(fields_of "$COCINAS_TS" PointRow '')"
PAGE_KEYS="$(fields_of "$COCINAS_TS" PageRow '')"
OFFER_KEYS="$(fields_of "$COCINAS_TS" OfferRow '')"
LINE_KEYS="$(fields_of "$COCINAS_TS" LineRow '')"
SUMMARY_KEYS="$(fields_of "$COCINAS_TS" SummaryRow '')"
REPEAT_KEYS="$(fields_of "$COCINAS_TS" RepeatRow '')"
SOURCES="$(sed -n "s/^export const POINT_SOURCES = \[\(.*\)\] as const;.*/\1/p" "$COCINAS_TS" | tr -d "' " | head -1)"
# Wera Cocina's names, for the fonda's side.
ONBOARD="$(const ONBOARD_WORKSPACE "$KITCHEN_TS")"
ONBOARD_ARGS="$(fields_of "$KITCHEN_TS" OnboardArgs 'p_')"
KIND="$(const COCINA_KIND "$KITCHEN_TS")"
WORKSPACE_TABLE="$(const WORKSPACE_TABLE "$KITCHEN_TS")"
GIRO_COLUMN="$(const GIRO_COLUMN "$KITCHEN_TS")"
PLACE_TABLE="$(const PLACE_TABLE "$PLACE_TS")"
PLACE_OWNER="$(const PLACE_OWNER_COLUMN "$PLACE_TS")"
SET_ADDRESS="$(const SET_STORE_ADDRESS "$PLACE_TS")"
ADDRESS_ARGS="$(fields_of "$PLACE_TS" SetStoreAddressArgs 'p_')"
SET_PIN="$(const SET_STORE_PIN "$PLACE_TS")"
PIN_ARGS="$(fields_of "$PLACE_TS" SetStorePinArgs 'p_')"
SET_GOOGLE="$(const SET_GOOGLE_POINT "$PLACE_TS")"
GOOGLE_ARGS="$(fields_of "$PLACE_TS" SetGooglePointArgs 'p_')"
PUBLISH="$(const PUBLISH_LISTING "$LISTING_TS")"
PUBLISH_ARGS="$(fields_of "$LISTING_TS" PublishArgs 'p_')"
LINE_BODY="$(fields_of "$LISTING_TS" LineBody '')"
SET_PAGE="$(const SET_KITCHEN_PAGE "$PAGINA_TS")"
PAGE_ARGS="$(fields_of "$PAGINA_TS" SetPageArgs 'p_')"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"

for pair in "ON_OFFER_NOW:$DOOR" "KitchenRow:$KITCHEN_KEYS" "AddressRow:$ADDRESS_KEYS" "PointRow:$POINT_KEYS" \
            "PageRow:$PAGE_KEYS" "OfferRow:$OFFER_KEYS" "LineRow:$LINE_KEYS" "SummaryRow:$SUMMARY_KEYS" \
            "RepeatRow:$REPEAT_KEYS" "POINT_SOURCES:$SOURCES" \
            "ONBOARD_WORKSPACE:$ONBOARD" "OnboardArgs:$ONBOARD_ARGS" "COCINA_KIND:$KIND" \
            "WORKSPACE_TABLE:$WORKSPACE_TABLE" "GIRO_COLUMN:$GIRO_COLUMN" "PLACE_TABLE:$PLACE_TABLE" \
            "PLACE_OWNER_COLUMN:$PLACE_OWNER" "SET_STORE_ADDRESS:$SET_ADDRESS" "SetStoreAddressArgs:$ADDRESS_ARGS" \
            "SET_STORE_PIN:$SET_PIN" "SetStorePinArgs:$PIN_ARGS" "SET_GOOGLE_POINT:$SET_GOOGLE" \
            "SetGooglePointArgs:$GOOGLE_ARGS" "PUBLISH_LISTING:$PUBLISH" "PublishArgs:$PUBLISH_ARGS" \
            "LineBody:$LINE_BODY" "SET_KITCHEN_PAGE:$SET_PAGE" "SetPageArgs:$PAGE_ARGS" "FULL_NAME_KEY:$NAME_KEY"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the apps' source"
    echo "      This check asserts the app's own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
PIN_SOURCE="${SOURCES%%,*}"
GOOGLE_SOURCE="${SOURCES#*,}"
ok "read from Itacate: $DOOR(), a kitchen {$KITCHEN_KEYS}, its point under '$PIN_SOURCE' or '$GOOGLE_SOURCE'"
ok "and inside it: address {$ADDRESS_KEYS}, point {$POINT_KEYS}, page {$PAGE_KEYS}, offer {$OFFER_KEYS}, line {$LINE_KEYS}, summary {$SUMMARY_KEYS}, repeat {$REPEAT_KEYS}"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)"
  echo "      from the repository root — \`supabase status\` needs the project directory."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE, which bypasses RLS: "a neighbour
# reads it through the door" would then be true of nobody.
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
# A JSON object keyed by the APP's names, in their order — never typed here.
by_names() { # names-csv json-value1 json-value2 ... -> a JSON object
  python3 -c 'import json,sys; n=sys.argv[1].split(","); print(json.dumps(dict(zip(n,[json.loads(v) for v in sys.argv[2:]]))))' "$@"
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
first_id() { python3 -c 'import json,sys; r=json.load(sys.stdin); print(r[0]["id"] if isinstance(r,list) and r else "")' 2>/dev/null; }
iso() { python3 -c 'import datetime,sys; print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(minutes=int(sys.argv[1]))).isoformat(timespec="seconds").replace("+00:00","Z"))' "$1"; }
uuid() { python3 -c 'import uuid; print(uuid.uuid4())'; }
# ⚠️ GoTrue rate-limits sign-ups and answers a limited one with an EMPTY body rather
# than a 429 — which looks exactly like a broken harness — so a sign-up is retried.
signup() { # email display-name -> a session token, or nothing
  python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": "itacate-probe-123", "data": {sys.argv[2]: sys.argv[3]}}))' \
    "$1" "$NAME_KEY" "$2" > "$SCRATCH/signup.json"
  local out token="" try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "$(cat "$SCRATCH/signup.json")")"
    token="$(pick access_token "$(body "$out")")"
    [[ -n "$token" ]] && break
    sleep 10
  done
  echo "$token"
}

STAMP="$$-$(date +%s)"

# --- 2. a fonda, as Wera Cocina makes her ------------------------------------
TOKEN="$(signup "fonda-$STAMP@example.com" "Doña Puerta $STAMP")"
[[ -n "$TOKEN" ]] || { fail "a fonda's sign-up got no session"; exit 1; }
FONDA="$TOKEN"
SHOP="$(body "$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Tienda de la fonda","p_prices_include_tax":true,"p_location_name":null}')" | tr -d '"')"
make_kitchen() { body "$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" "\"$1\"" "\"$KIND\"")")" | tr -d '"'; }
A="$(make_kitchen "Fonda Doña Puerta $STAMP")"; sleep 1
B="$(make_kitchen "Cocina Quieta $STAMP")"; sleep 1
C="$(make_kitchen "Cocina Sin Nada $STAMP")"
for pair in "shop:$SHOP" "kitchen A:$A" "kitchen B:$B" "kitchen C:$C"; do
  [[ "${pair#*:}" =~ ^[0-9a-f-]{36}$ ]] || { fail "could not make the ${pair%%:*}: ${pair#*:}"; exit 1; }
done
place_of() { body "$(api GET "/rest/v1/$PLACE_TABLE?select=id&$PLACE_OWNER=eq.$1&order=created_at,id&limit=1")" | first_id; }
PA="$(place_of "$A")"; PB="$(place_of "$B")"
[[ -n "$PA" && -n "$PB" && "$PA" != "$PB" ]] || { fail "could not read the kitchens' places ($PA, $PB)"; exit 1; }

out="$(api PATCH "/rest/v1/$WORKSPACE_TABLE?id=eq.$A" "{\"$GIRO_COLUMN\":\"giro-fonda\"}")"
[[ "$(status "$out")" == 200 ]] || fail "her trade could not be set: $(status "$out") $(body "$out" | head -c 160)"
address() { api POST "/rest/v1/rpc/$SET_ADDRESS" "$(by_names "$ADDRESS_ARGS" "\"$1\"" '"Sabino"' '"12"' '"Santa María la Ribera"' '"Cuauhtémoc"' '"06400"')"; }
for place in "$PA" "$PB"; do
  out="$(address "$place")"
  [[ "$(status "$out")" == 2* ]] || fail "her address could not be set: $(status "$out") $(body "$out" | head -c 160)"
done
out="$(api POST "/rest/v1/rpc/$SET_PIN" "$(by_names "$PIN_ARGS" "\"$PA\"" '19.452301' '-99.159876' '"Portón verde, junto a la farmacia"')")"
[[ "$(status "$out")" == 2* ]] || fail "her own pin could not be set: $(status "$out") $(body "$out" | head -c 160)"
out="$(api POST "/rest/v1/rpc/$SET_GOOGLE" "$(by_names "$GOOGLE_ARGS" "\"$PB\"" '19.43261' '-99.133208' '"ChIJ-prueba-10.5-iv-a"')")"
[[ "$(status "$out")" == 2* ]] || fail "Google's point could not be kept: $(status "$out") $(body "$out" | head -c 160)"
COVER="$A/$(uuid)"
PAGE="$(python3 -c 'import json,sys; print(json.dumps({"sentence": "Comida casera desde 1998.", "color": "chile", "cover_path": sys.argv[1]}))' "$COVER")"
out="$(api POST "/rest/v1/rpc/$SET_PAGE" "$(by_names "$PAGE_ARGS" "\"$A\"" "$PAGE")")"
[[ "$(status "$out")" == 2* ]] || fail "her page could not be set: $(status "$out") $(body "$out" | head -c 160)"

line() { by_names "$LINE_BODY" "$@"; }
PHOTO="$A/$(uuid)"
DISH="$(line '"Comida corrida"' '"Sopa, arroz y guisado"' '["pica", "gluten"]' '"60.00"' '2' 'false' '"120.00"' "\"$PHOTO\"")"
BAG="$(line '"Bolsa de guisados"' 'null' '[]' '"50.00"' '3' 'true' '"110.00"' 'null')"
publish() { api POST "/rest/v1/rpc/$PUBLISH" "$(by_names "$PUBLISH_ARGS" "\"$1\"" "\"$2\"" "\"$3\"" "\"$4\"" "$5")"; }
FIRST="$(uuid)"; SECOND="$(uuid)"; QUIET="$(uuid)"
out="$(publish "$FIRST" "$PA" "$(iso 15)" "$(iso 75)" "[$DISH, $BAG]")"
[[ "$(status "$out")" == 200 ]] || fail "she could not publish: $(status "$out") $(body "$out" | head -c 160)"
sleep 1
out="$(publish "$SECOND" "$PA" "$(iso 120)" "$(iso 180)" "[$DISH]")"
[[ "$(status "$out")" == 200 ]] || fail "she could not publish again: $(status "$out") $(body "$out" | head -c 160)"
out="$(publish "$QUIET" "$PB" "$(iso 15)" "$(iso 75)" "[$BAG]")"
[[ "$(status "$out")" == 200 ]] || fail "kitchen B could not publish: $(status "$out") $(body "$out" | head -c 160)"
# ⚠️ B's window moved into the past by the database's owner — a phone cannot publish
# one (`22023`), and a kitchen quiet for real is one whose window ended.
moved="$(supabase db query --local -o csv "update public.listing set pickup_start = now() - interval '3 hours', pickup_end = now() - interval '2 hours' where id = '$QUIET' returning id" 2>/dev/null | tail -1)"
[[ "$moved" == "$QUIET" ]] || { fail "could not move kitchen B's window into the past ($moved)"; exit 1; }
ok "a fonda makes, as Wera Cocina does, a shop and three kitchens — A on offer with her pin and page, B quiet at Google's point, C with nothing"

# --- 3. a neighbour asks the door, as Itacate does ---------------------------
TOKEN="$(signup "vecina-$STAMP@example.com" "Vecina $STAMP")"
[[ -n "$TOKEN" ]] || { fail "a neighbour's sign-up got no session"; exit 1; }
out="$(api POST "/rest/v1/rpc/$DOOR" '{}')"
body "$out" > "$SCRATCH/door.json"
if [[ "$(status "$out")" == 200 ]] && python3 -c 'import json,sys; sys.exit(0 if isinstance(json.load(open(sys.argv[1])), list) else 1)' "$SCRATCH/door.json" 2>/dev/null; then
  ok "a neighbour — no business's member — calls $DOOR() as the app does: 200, a list"
else
  fail "the door answered a neighbour $(status "$out") $(body "$out" | head -c 200)"
  exit 1
fi

# Verdicts are one python file, a function per question: `verdict <question> <args…>`.
cat > "$SCRATCH/door.py" <<'PY'
import datetime, json, re, sys

MONEY = re.compile(r'^\d+\.\d{2}$')
QTY = re.compile(r'^\d+\.\d{3}$')
DAY = re.compile(r'^\d{4}-\d{2}-\d{2}$')

def load(path):
    return json.load(open(path))

def by_id(rows, kid):
    for r in rows:
        if isinstance(r, dict) and r.get('id') == kid:
            return r
    return None

def missing(obj, keys_csv, what):
    if not isinstance(obj, dict):
        return '%s is %r, not an object' % (what, obj)
    gone = [k for k in keys_csv.split(',') if k not in obj]
    return '%s carried no %s' % (what, ', '.join(repr(k) for k in gone)) if gone else None

def instant(text):
    return datetime.datetime.fromisoformat(re.sub(r'(\.\d{3})\d+', r'\1', text).replace('Z', '+00:00'))

def on_offer(path, kid, kitchen_keys, address_keys, point_keys, page_keys, offer_keys, line_keys, summary_keys, repeat_keys, pin_source, first, second, photo, cover):
    k = by_id(load(path), kid)
    if k is None:
        print('kitchen A is not in the answer'); return
    for obj, keys, what in ((k, kitchen_keys, 'kitchen A'), (k.get('address'), address_keys, "A's address"),
                            (k.get('point'), point_keys, "A's point"), (k.get('page'), page_keys, "A's page"),
                            (k.get('summary'), summary_keys, "A's summary")):
        why = missing(obj, keys, what)
        if why: print(why); return
    if k.get('giro') != 'giro-fonda':
        print("A's trade came back %r, set 'giro-fonda'" % k.get('giro')); return
    a = k['address']
    if (a.get('street'), a.get('street_number'), a.get('colonia'), a.get('city'), a.get('postal_code')) != ('Sabino', '12', 'Santa María la Ribera', 'Cuauhtémoc', '06400'):
        print("A's address came back %r" % a); return
    if k.get('directions') != 'Portón verde, junto a la farmacia':
        print("A's line came back %r" % k.get('directions')); return
    p = k['point']
    if p.get('source') != pin_source:
        print("A's own pin came back under source %r, the app knows %r" % (p.get('source'), pin_source)); return
    if not all(isinstance(p.get(x), (int, float)) and not isinstance(p.get(x), bool) for x in ('lat', 'lng')) or abs(p['lat'] - 19.452301) > 1e-9 or abs(p['lng'] + 99.159876) > 1e-9:
        print("A's pin came back %r, set 19.452301, -99.159876" % p); return
    g = k['page']
    if (g.get('sentence'), g.get('color'), g.get('cover_path')) != ('Comida casera desde 1998.', 'chile', cover):
        print("A's page came back %r" % g); return
    offers = k.get('on_offer')
    if not isinstance(offers, list) or [o.get('id') for o in offers if isinstance(o, dict)] != [first, second]:
        print("A's offers came back %r, published %r" % ([o.get('id') if isinstance(o, dict) else o for o in offers] if isinstance(offers, list) else offers, [first, second])); return
    for o in offers:
        why = missing(o, offer_keys, 'an offer of A')
        if why: print(why); return
        try:
            if instant(o['pickup_end']) <= instant(o['pickup_start']):
                print('an offer of A ends before it starts: %r' % o); return
        except Exception as exc:
            print('an offer of A has a window the app cannot read: %s' % exc); return
        lines = o.get('lines')
        if not isinstance(lines, list) or not lines:
            print('an offer of A came back with lines %r' % lines); return
        for l in lines:
            why = missing(l, line_keys, 'a line of A')
            if why: print(why); return
            for key in ('unit_price', 'usual_price'):
                if l.get(key) is not None and not (isinstance(l.get(key), str) and MONEY.match(l[key])):
                    print('%s came back %r — the app reads money as two-decimal text' % (key, l.get(key))); return
            if not (isinstance(l.get('quantity'), str) and QTY.match(l['quantity'])):
                print('quantity came back %r — the app reads it as three-decimal text' % l.get('quantity')); return
    dish, bag = offers[0]['lines']
    sent = {'line_no': 1, 'name': 'Comida corrida', 'description': 'Sopa, arroz y guisado', 'unit_price': '60.00', 'quantity': '2.000', 'surprise': False, 'usual_price': '120.00', 'image_path': photo}
    for key, value in sent.items():
        if dish.get(key) != value:
            print('the dish: %s came back %r, sent %r' % (key, dish.get(key), value)); return
    if sorted(dish.get('tags') or []) != ['gluten', 'pica']:
        print("the dish's tags came back %r" % dish.get('tags')); return
    if (bag.get('surprise'), bag.get('usual_price'), bag.get('image_path'), bag.get('description')) != (True, '110.00', None, None):
        print('the bag came back %r' % bag); return
    s = k['summary']
    if not (isinstance(s.get('weekdays'), list) and len(s['weekdays']) == 7 and all(isinstance(n, int) for n in s['weekdays']) and sum(s['weekdays']) == 2):
        print("A's weekdays came back %r — seven whole numbers, two publications" % s.get('weekdays')); return
    if not isinstance(s.get('usual_hour'), int) or not 0 <= s['usual_hour'] <= 23:
        print("A's usual hour came back %r" % s.get('usual_hour')); return
    if not (isinstance(s.get('last_day'), str) and DAY.match(s['last_day'])):
        print("A's last day came back %r — the app reads YYYY-MM-DD" % s.get('last_day')); return
    reps = s.get('repeats')
    if not isinstance(reps, list) or len(reps) != 1:
        print("A's repeats came back %r — the dish published twice" % reps); return
    why = missing(reps[0], repeat_keys, "A's repeated dish")
    if why: print(why); return
    if (reps[0].get('name'), reps[0].get('times'), reps[0].get('usual_price')) != ('Comida corrida', 2, '60.00'):
        print("A's repeated dish came back %r" % reps[0]); return
    print('OK')

def quiet(path, kid, kitchen_keys, point_keys, summary_keys, google_source):
    k = by_id(load(path), kid)
    if k is None:
        print('kitchen B — quiet, published within 14 days — is not in the answer'); return
    for obj, keys, what in ((k, kitchen_keys, 'kitchen B'), (k.get('point'), point_keys, "B's point"), (k.get('summary'), summary_keys, "B's summary")):
        why = missing(obj, keys, what)
        if why: print(why); return
    if k.get('on_offer') != []:
        print("B's window ended, yet on_offer came back %r" % k.get('on_offer')); return
    p = k['point']
    if p.get('source') != google_source:
        print("B's point came back under source %r, the app knows %r for Google's copy" % (p.get('source'), google_source)); return
    if abs(p.get('lat', 0) - 19.43261) > 1e-9 or abs(p.get('lng', 0) + 99.133208) > 1e-9:
        print("B's point came back %r, kept 19.43261, -99.133208" % p); return
    if k.get('page') is not None:
        print("B made no page, yet it came back %r" % k.get('page')); return
    print('OK')

def absent(path, *ids):
    rows = load(path)
    there = [i for i in ids if by_id(rows, i) is not None]
    print('OK' if not there else 'came back, and must not: %s' % ', '.join(there))

globals()[sys.argv[1]](*sys.argv[2:])
PY
verdict() { python3 "$SCRATCH/door.py" "$@"; }

# --- 4. kitchen A, every key the app reads ---------------------------------------
v="$(verdict on_offer "$SCRATCH/door.json" "$A" "$KITCHEN_KEYS" "$ADDRESS_KEYS" "$POINT_KEYS" "$PAGE_KEYS" \
     "$OFFER_KEYS" "$LINE_KEYS" "$SUMMARY_KEYS" "$REPEAT_KEYS" "$PIN_SOURCE" "$FIRST" "$SECOND" "$PHOTO" "$COVER")"
if [[ "$v" == OK ]]; then ok "kitchen A comes back with every key the app reads, at every level, as sent: money as two-decimal text, her pin under '$PIN_SOURCE', her page, the dish she repeats"
else fail "$v"; fi

# --- 5. kitchen B, quiet, at Google's point -------------------------------------------
v="$(verdict quiet "$SCRATCH/door.json" "$B" "$KITCHEN_KEYS" "$POINT_KEYS" "$SUMMARY_KEYS" "$GOOGLE_SOURCE")"
if [[ "$v" == OK ]]; then ok "kitchen B comes back quiet — nothing on offer — at Google's point, under '$GOOGLE_SOURCE'"
else fail "$v"; fi

# --- 6. what never comes back -------------------------------------------------------------
v="$(verdict absent "$SCRATCH/door.json" "$C" "$SHOP")"
if [[ "$v" == OK ]]; then ok "kitchen C, which never published, and the shop do not come back"
else fail "kitchen C or the shop $v"; fi

# --- 7. signed out, nothing -----------------------------------------------------------------
out="$(TOKEN="" api POST "/rest/v1/rpc/$DOOR" '{}')"
if [[ "$(status "$out")" == 2* ]]; then
  fail "signed out, the door answered $(status "$out") — nothing is readable without an account"
else
  ok "signed out, the door refuses ($(status "$out"))"
fi

echo
if (( fails > 0 )); then
  echo "$fails assertion group(s) failed."
  exit 1
fi
echo "all 7 assertion groups passed — Itacate reads the one door by the names it answers: every key, at"
echo "every level, as the list reads it; a quiet kitchen at Google's point; never a kitchen that never"
echo "published, never a shop, and nothing signed out."

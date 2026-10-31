#!/usr/bin/env bash
# 10.4b-iv-a-listing-contract — does Wera Cocina's publishing still describe the
# schema, is a retry one publication, and does her list keep a second kitchen's
# out?
#
# WHY THIS EXISTS. `cocina/src/api/listing.ts` is Cocina's claim about `0072`'s
# publishing: the read's table, columns, embed, filter, order and limit; the two
# functions and their arguments; and the KEYS each line is sent under. A
# misspelt column or function is a 400 or a 404 on the phone that the typecheck,
# the suite and the bundler all pass over — and a misspelt LINE KEY is worse:
# `publish_listing` ignores a key it does not know, so a *vale* sent as `usual`
# is a publication with no *vale*, answered 200. And two behaviours only a real
# database shows: the phone makes the id, so the same press sent twice must be
# ONE publication (the reply lost, the retry sent); and the list is filtered on
# the open kitchen, because the walls show a login every kitchen she belongs to.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST, as ONE login
# that owns a shop and two kitchens:
#   1. The claim is read OUT OF `listing.ts` — and the kitchen's place read out of
#      `place.ts`, the kitchen's sign-up out of `kitchen.ts`, the name's key out of
#      `credentials.ts` — nothing is retyped here.
#   2. Before she publishes, the app's list read answers 200 and `[]`.
#   3. She publishes as the app does — the app's function, its arguments by name,
#      each line under the app's keys: a dish with two tags and no *vale*, a bag
#      with its *vale*. 200, and the id she sent.
#   4. The app's list reads it back with exactly the app's columns: her place, the
#      window as sent, not withdrawn, the lines in her order with every value as
#      sent — money to the centavo, the tags, the bag and its *vale*.
#   5. The same press again, the same id: 200 and the same id — still one
#      publication, its lines not doubled.
#   6. At her SHOP's store — what a read that lost the kitchen's filter would send:
#      400 `TD013`, and nothing written.
#   7. A window that ended while the form stayed open: 400 `22023`, nothing written
#      — the refusal the app says in Spanish (`revisar`).
#   8. Her second kitchen publishes: the first kitchen's list does not show it,
#      where the unfiltered read shows both — so the filter is what keeps it out.
#   9. A second publication at the first kitchen: the list is the newest first.
#  10. Withdrawn as the app does: the list reads it withdrawn; withdrawn again, the
#      first moment is kept.
#  11. Signed out: the list reads nothing, and publishing is refused.
#
# ⚠️ WHETHER A REFUSED PUBLICATION WROTE NOTHING IS ASKED OF THE DATABASE ITSELF
# (`supabase db query --local`, as the superuser, groups 6 and 7): a 400 says the
# call failed, not that no row is left behind.
#
# ⚠️ WHAT IT DOES NOT ASSERT: who may publish or withdraw (the owner and a
# manager, question 3), a stranger reading nothing, an id taken from another
# kitchen, or each malformed line — `supabase/tests/0072_a_kitchen_publishes.sql`
# holds the walls and every refusal, as the roles. Nor the form: what she types
# and when the steppers stop are `cocina/test/listing.test.ts` and
# `cocina/test/ventana.test.ts`, which hold the form's limits to `0072`'s text.
#
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.4b-iv-a-listing-contract.sh
# With: $1 a copy of listing.ts, $2 of place.ts, $3 of kitchen.ts and $4 of
#       credentials.ts — how the falsifier points it at a broken one.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

LISTING_TS="${1:-cocina/src/api/listing.ts}"
PLACE_TS="${2:-cocina/src/api/place.ts}"
KITCHEN_TS="${3:-cocina/src/api/kitchen.ts}"
CREDENTIALS_TS="${4:-cocina/src/auth/credentials.ts}"
for f in "$LISTING_TS" "$PLACE_TS" "$KITCHEN_TS" "$CREDENTIALS_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the app's own claim, read out of its source ------------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
num()   { sed -n "s/^export const $1 = \([0-9_]*\);.*/\1/p" "$2" | tr -d _ | head -1; }
# An interface's field names, comma-joined, in declaration order. `p_` for the
# functions' arguments; every field for a line's keys.
fields_of() { # file interface prefix-regex
  awk -v want="export interface $2 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\):.*/\1/p" | paste -sd, -
}
TABLE="$(const LISTING_TABLE "$LISTING_TS")"
LINES_TABLE="$(const LINES_TABLE "$LISTING_TS")"
COLUMNS="$(const LISTING_COLUMNS "$LISTING_TS")"
OWNER_COL="$(const LISTING_OWNER_COLUMN "$LISTING_TS")"
ORDER_COLS="$(const LISTING_ORDER "$LISTING_TS")"
LINE_ORDER="$(const LINE_ORDER "$LISTING_TS")"
LIMIT="$(num LISTING_LIMIT "$LISTING_TS")"
PUBLISH="$(const PUBLISH_LISTING "$LISTING_TS")"
PUBLISH_ARGS="$(fields_of "$LISTING_TS" PublishArgs 'p_')"
LINE_KEYS="$(fields_of "$LISTING_TS" LineBody '')"
WITHDRAW="$(const WITHDRAW_LISTING "$LISTING_TS")"
WITHDRAW_ARGS="$(fields_of "$LISTING_TS" WithdrawArgs 'p_')"
PLACE_TABLE="$(const PLACE_TABLE "$PLACE_TS")"
PLACE_COLUMNS="$(const PLACE_COLUMNS "$PLACE_TS")"
PLACE_OWNER="$(const PLACE_OWNER_COLUMN "$PLACE_TS")"
PLACE_ACTIVE="$(const PLACE_ACTIVE_COLUMN "$PLACE_TS")"
PLACE_ORDER_COLS="$(const PLACE_ORDER "$PLACE_TS")"
ONBOARD="$(const ONBOARD_WORKSPACE "$KITCHEN_TS")"
ONBOARD_ARGS="$(fields_of "$KITCHEN_TS" OnboardArgs 'p_')"
KIND="$(const COCINA_KIND "$KITCHEN_TS")"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"

for pair in "LISTING_TABLE:$TABLE" "LINES_TABLE:$LINES_TABLE" "LISTING_COLUMNS:$COLUMNS" \
            "LISTING_OWNER_COLUMN:$OWNER_COL" "LISTING_ORDER:$ORDER_COLS" "LINE_ORDER:$LINE_ORDER" \
            "LISTING_LIMIT:$LIMIT" "PUBLISH_LISTING:$PUBLISH" "PublishArgs:$PUBLISH_ARGS" \
            "LineBody:$LINE_KEYS" "WITHDRAW_LISTING:$WITHDRAW" "WithdrawArgs:$WITHDRAW_ARGS" \
            "PLACE_TABLE:$PLACE_TABLE" "PLACE_COLUMNS:$PLACE_COLUMNS" "PLACE_OWNER_COLUMN:$PLACE_OWNER" \
            "PLACE_ACTIVE_COLUMN:$PLACE_ACTIVE" "PLACE_ORDER:$PLACE_ORDER_COLS" \
            "ONBOARD_WORKSPACE:$ONBOARD" "OnboardArgs:$ONBOARD_ARGS" "COCINA_KIND:$KIND" "FULL_NAME_KEY:$NAME_KEY"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the app's source"
    echo "      This check asserts the app's own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
# The read as supabase-js sends it: the order exactly as the app spells it —
# `column.direction`, the direction part of the claim — the lines' order on the
# embed (`listing_line.order`), then the limit.
ORDER="$ORDER_COLS"
list_read() { echo "/rest/v1/$TABLE?select=$COLUMNS&$OWNER_COL=eq.$1&order=$ORDER&$LINES_TABLE.order=$LINE_ORDER.asc&limit=$LIMIT"; }
PLACE_ORDER="$(tr ',' '\n' <<< "$PLACE_ORDER_COLS" | sed 's/$/.asc/' | paste -sd, -)"
place_read() { echo "/rest/v1/$PLACE_TABLE?select=$PLACE_COLUMNS&$PLACE_OWNER=eq.$1&$PLACE_ACTIVE=eq.true&order=$PLACE_ORDER&limit=1"; }
ok "read from the app: $TABLE?select=$COLUMNS by $OWNER_COL, ordered by $ORDER, its lines by $LINE_ORDER, $LIMIT at most"
ok "and to publish: $PUBLISH($PUBLISH_ARGS), each line {$LINE_KEYS}; to withdraw: $WITHDRAW($WITHDRAW_ARGS)"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)"
  echo "      from the repository root — \`supabase status\` needs the project directory."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE, which bypasses RLS: "the second
# kitchen stays out" would then be true of nobody.
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

TOKEN=""
api() { # method path [body] -> body, with the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" auth="${TOKEN:-}"
  if [[ -n "$auth" ]]; then auth="Authorization: Bearer $auth"; else auth="X-Empty: 1"; fi
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" \
      -H "apikey: $KEY" -H "$auth" -H 'Content-Type: application/json' -d "$body"
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
# How many publications with these ids the database holds, asked as the superuser.
held() { # ids-csv -> a count
  local list
  list="$(tr ',' '\n' <<< "$1" | sed "s/.*/'&'/" | paste -sd, -)"
  supabase db query --local -o csv "select count(*)::int from public.listing where id in ($list)" 2>/dev/null | tail -1
}
iso() { python3 -c 'import datetime,sys; print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(minutes=int(sys.argv[1]))).isoformat(timespec="seconds").replace("+00:00","Z"))' "$1"; }
uuid() { python3 -c 'import uuid; print(uuid.uuid4())'; }

STAMP="$$-$(date +%s)"

# --- a fonda with a shop and two kitchens -----------------------------------
# ⚠️ THE BODY IS BUILT BY ONE SCRIPT IN ITS OWN STEP: an accent and a key from the
# app inside a heredoc in `$( )` is where bash 3.2 loses an apostrophe.
python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": "cocina-probe-123", "data": {sys.argv[2]: sys.argv[3]}}))' \
  "publica-$STAMP@example.com" "$NAME_KEY" "Doña Publica $STAMP" > "$SCRATCH/signup.json"
# ⚠️ RETRIED: GoTrue rate-limits sign-ups and answers a limited one with an EMPTY
# body rather than a 429 — which looks exactly like a broken harness.
for try in 1 2 3 4 5 6; do
  out="$(TOKEN="" api POST /auth/v1/signup "$(cat "$SCRATCH/signup.json")")"
  TOKEN="$(pick access_token "$(body "$out")")"
  [[ -n "$TOKEN" ]] && break
  sleep 10
done
if [[ -z "$TOKEN" ]]; then
  fail "a sign-up by the email door got no session — $(status "$out") $(body "$out" | head -c 200)"
  exit 1
fi
SHOP="$(body "$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Tienda de la fonda","p_prices_include_tax":true,"p_location_name":null}')" | tr -d '"')"
KITCHEN="$(body "$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" '"Fonda que publica"' "\"$KIND\"")")" | tr -d '"')"
sleep 1
SECOND="$(body "$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" '"Segunda cocina"' "\"$KIND\"")")" | tr -d '"')"
for pair in "shop:$SHOP" "kitchen:$KITCHEN" "second kitchen:$SECOND"; do
  [[ "${pair#*:}" =~ ^[0-9a-f-]{36}$ ]] || { fail "could not make the ${pair%%:*}: ${pair#*:}"; exit 1; }
done
PLACE="$(body "$(api GET "$(place_read "$KITCHEN")")" | first_id)"
SECOND_PLACE="$(body "$(api GET "$(place_read "$SECOND")")" | first_id)"
SHOP_STORE="$(body "$(api GET "/rest/v1/$PLACE_TABLE?select=id&$PLACE_OWNER=eq.$SHOP")" | first_id)"
if [[ -z "$PLACE" || -z "$SECOND_PLACE" || -z "$SHOP_STORE" || "$PLACE" == "$SHOP_STORE" ]]; then
  fail "could not read the kitchens' places and the shop's store apart ($PLACE, $SECOND_PLACE, $SHOP_STORE)"
  exit 1
fi
ok "a fonda signs up and owns a shop and two kitchens, each kitchen's place read as the app reads it"

# Verdicts are one python file, a function per question: `verdict <question> <args…>`.
cat > "$SCRATCH/listing.py" <<'PY'
import datetime, json, sys

def load(path):
    try:
        return json.load(open(path))
    except Exception as exc:
        print('unreadable: %s' % exc); raise SystemExit

def top_level(columns):
    # `a,b,embed(x,y)` -> ['a', 'b', 'embed']: the commas inside an embed are its own.
    out, depth, word = [], 0, ''
    for ch in columns:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        elif ch == ',' and depth == 0:
            out.append(word); word = ''; continue
        if depth == 0 and ch != ')':
            word += ch
    out.append(word)
    return [w for w in out if w]

def instant(text):
    return datetime.datetime.fromisoformat(text.replace('Z', '+00:00'))

def same(a, b):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool) and not isinstance(b, bool):
        return abs(a - b) < 1e-9
    return a == b

def listing(status, path, columns, lines_table, expect_json):
    rows = load(path)
    if status != '200' or not isinstance(rows, list):
        print("the app's list read answered %s %s" % (status, json.dumps(rows)[:200])); return
    want = json.loads(expect_json)
    got = [r.get('id') for r in rows]
    if got != want['ids']:
        print('the list returned %s, expected %s' % (got, want['ids'])); return
    asked = set(top_level(columns))
    for r in rows:
        if set(r) != asked:
            print('a publication carried %s, the app asks for %s' % (sorted(r), sorted(asked))); return
    by_id = {r['id']: r for r in rows}
    for lid, spec in want.get('check', {}).items():
        r = by_id[lid]
        if 'place' in spec and r.get('location_id') != spec['place']:
            print('publication %s is at %s, not her kitchen place %s' % (lid, r.get('location_id'), spec['place'])); return
        for key in ('pickup_start', 'pickup_end'):
            if key in spec and instant(r[key]) != instant(spec[key]):
                print('%s reads back %s, sent %s' % (key, r[key], spec[key])); return
        if 'withdrawn' in spec and (r.get('withdrawn_at') is not None) != spec['withdrawn']:
            print('publication %s reads withdrawn_at %r, expected %s' % (lid, r.get('withdrawn_at'), 'set' if spec['withdrawn'] else 'empty')); return
        if 'withdrawn_at' in spec and instant(r['withdrawn_at']) != instant(spec['withdrawn_at']):
            print('withdrawn again, withdrawn_at moved: %s, first %s' % (r['withdrawn_at'], spec['withdrawn_at'])); return
        if 'lines' in spec:
            lines = r.get(lines_table)
            if not isinstance(lines, list) or len(lines) != len(spec['lines']):
                print('publication %s came back with %s lines, sent %d' % (lid, len(lines) if isinstance(lines, list) else lines, len(spec['lines']))); return
            for i, (have, sent) in enumerate(zip(lines, spec['lines']), start=1):
                for key, value in sent.items():
                    if not same(have.get(key), value):
                        print('line %d of %s: %s reads back %r, sent %r' % (i, lid, key, have.get(key), value)); return
    print('OK')

def withdrawn_at(path, lid):
    rows = load(path)
    for r in rows if isinstance(rows, list) else []:
        if r.get('id') == lid:
            print(r.get('withdrawn_at') or ''); return
    print('')

globals()[sys.argv[1]](*sys.argv[2:])
PY
verdict() { python3 "$SCRATCH/listing.py" "$@"; }
list_is() { # kitchen expect-json -> "OK" or why not
  local out; out="$(api GET "$(list_read "$1")")"
  body "$out" > "$SCRATCH/list.json"
  verdict listing "$(status "$out")" "$SCRATCH/list.json" "$COLUMNS" "$LINES_TABLE" "$2"
}
# One line under the APP's keys, in their order (`LineBody`): name, description,
# tags, unit_price, quantity, surprise, usual_price.
line() { by_names "$LINE_KEYS" "$@"; }
DISH="$(line '"Comida corrida"' '"Sopa, arroz y guisado del día"' '["pica", "gluten"]' '"65.00"' '4' 'false' 'null')"
BAG="$(line '"Bolsa de pan"' '"6 piezas de pan dulce"' '[]' '"45.00"' '5' 'true' '"90.00"')"
# What the list must read back for those two, by the database's columns.
SENT_LINES='[{"line_no":1,"name":"Comida corrida","description":"Sopa, arroz y guisado del día","tags":["gluten","pica"],"unit_price":65,"quantity":4,"surprise":false,"usual_price":null},
             {"line_no":2,"name":"Bolsa de pan","description":"6 piezas de pan dulce","tags":[],"unit_price":45,"quantity":5,"surprise":true,"usual_price":90}]'
publish() { # id place start end lines-json -> the response
  api POST "/rest/v1/rpc/$PUBLISH" "$(by_names "$PUBLISH_ARGS" "\"$1\"" "\"$2\"" "\"$3\"" "\"$4\"" "$5")"
}

# --- 2. nothing published yet ----------------------------------------------
v="$(list_is "$KITCHEN" '{"ids": []}')"
if [[ "$v" == OK ]]; then ok "before she publishes, the app's list read answers [] — Todavía no has publicado nada"
else fail "before publishing: $v"; fi

# --- 3. she publishes, as the app does ---------------------------------------
FIRST="$(uuid)"
START="$(iso 15)"; END="$(iso 75)"
out="$(publish "$FIRST" "$PLACE" "$START" "$END" "[$DISH, $BAG]")"
if [[ "$(status "$out")" == 200 && "$(body "$out" | tr -d '"')" == "$FIRST" ]]; then
  ok "$PUBLISH($PUBLISH_ARGS) with a dish and a bag answers 200 and the id the phone made"
else
  fail "publishing as the app does answered $(status "$out") $(body "$out" | head -c 200)"
fi

# --- 4. her list reads it back -------------------------------------------------
EXPECT="$(python3 -c 'import json,sys; print(json.dumps({"ids":[sys.argv[1]],"check":{sys.argv[1]:{"place":sys.argv[2],"pickup_start":sys.argv[3],"pickup_end":sys.argv[4],"withdrawn":False,"lines":json.loads(sys.argv[5])}}}))' \
  "$FIRST" "$PLACE" "$START" "$END" "$SENT_LINES")"
v="$(list_is "$KITCHEN" "$EXPECT")"
if [[ "$v" == OK ]]; then ok "her list reads it back with exactly the app's columns: her place, the window, not withdrawn, both lines in her order, every value as sent"
else fail "her list after publishing: $v"; fi

# --- 5. the same press again: one publication ----------------------------------
out="$(publish "$FIRST" "$PLACE" "$START" "$END" "[$DISH, $BAG]")"
v="$(list_is "$KITCHEN" "$EXPECT")"
if [[ "$(status "$out")" != 200 || "$(body "$out" | tr -d '"')" != "$FIRST" ]]; then
  fail "the same press again answered $(status "$out") $(body "$out" | head -c 200), not the same id"
elif [[ "$v" != OK ]]; then fail "after the same press again: $v — a retry must be the same publication"
else ok "the same press again answers the same id, and her list still holds one publication with its two lines"; fi

# --- 6. at her shop's store: refused ---------------------------------------------
AT_SHOP="$(uuid)"
out="$(publish "$AT_SHOP" "$SHOP_STORE" "$START" "$END" "[$DISH]")"
if [[ "$(status "$out")" == 400 && "$(pick code "$(body "$out")")" == TD013 && "$(held "$AT_SHOP")" == 0 ]]; then
  ok "at her shop's store — what a read that lost the kitchen's filter would send — 400 TD013, and nothing written"
else
  fail "publishing at her shop's store answered $(status "$out") $(body "$out" | head -c 160); the database holds $(held "$AT_SHOP") of it"
fi

# --- 7. a window that ended: refused ---------------------------------------------
ENDED="$(uuid)"
out="$(publish "$ENDED" "$PLACE" "$(iso -120)" "$(iso -60)" "[$DISH]")"
if [[ "$(status "$out")" == 400 && "$(pick code "$(body "$out")")" == 22023 && "$(held "$ENDED")" == 0 ]]; then
  ok "a window that has ended — a form left open — 400 22023, and nothing written"
else
  fail "a window that ended answered $(status "$out") $(body "$out" | head -c 160); the database holds $(held "$ENDED") of it"
fi

# --- 8. her second kitchen's stays out of the first's list -------------------------
OTHER="$(uuid)"
out="$(publish "$OTHER" "$SECOND_PLACE" "$START" "$END" "[$BAG]")"
EVERY="$(body "$(api GET "/rest/v1/$TABLE?select=id")")"
v="$(list_is "$KITCHEN" "{\"ids\": [\"$FIRST\"]}")"
if [[ "$(status "$out")" != 200 ]]; then
  fail "her second kitchen could not publish: $(status "$out") $(body "$out" | head -c 160)"
elif ! grep -c "$OTHER" <<< "$EVERY" > /dev/null || ! grep -c "$FIRST" <<< "$EVERY" > /dev/null; then
  fail "the unfiltered read does not show both kitchens' publications ($EVERY), so the filter is not shown to be what keeps one out"
elif [[ "$v" != OK ]]; then
  fail "the first kitchen's list with the second's published: $v"
else
  ok "her second kitchen's publication is not in the first's list — and the unfiltered read shows both"
fi

# --- 9. the newest first ------------------------------------------------------------
sleep 1
THIRD="$(uuid)"
out="$(publish "$THIRD" "$PLACE" "$START" "$END" "[$BAG]")"
v="$(list_is "$KITCHEN" "{\"ids\": [\"$THIRD\", \"$FIRST\"]}")"
if [[ "$(status "$out")" != 200 ]]; then fail "a second publication at her kitchen answered $(status "$out") $(body "$out" | head -c 160)"
elif [[ "$v" != OK ]]; then fail "with two publications: $v — the list is the newest first"
else ok "a second publication at her kitchen is first in her list — the newest first"; fi

# --- 10. withdrawn, and withdrawn once -----------------------------------------------
out="$(api POST "/rest/v1/rpc/$WITHDRAW" "$(by_names "$WITHDRAW_ARGS" "\"$FIRST\"")")"
v="$(list_is "$KITCHEN" "{\"ids\": [\"$THIRD\", \"$FIRST\"], \"check\": {\"$FIRST\": {\"withdrawn\": true}, \"$THIRD\": {\"withdrawn\": false}}}")"
WHEN="$(verdict withdrawn_at "$SCRATCH/list.json" "$FIRST")"
if [[ "$(status "$out")" != 200 && "$(status "$out")" != 204 ]]; then
  fail "withdrawing as the app does, $WITHDRAW($WITHDRAW_ARGS), answered $(status "$out") $(body "$out" | head -c 200)"
elif [[ "$v" != OK || -z "$WHEN" ]]; then
  fail "after withdrawing: $v"
else
  sleep 1
  out="$(api POST "/rest/v1/rpc/$WITHDRAW" "$(by_names "$WITHDRAW_ARGS" "\"$FIRST\"")")"
  v="$(list_is "$KITCHEN" "{\"ids\": [\"$THIRD\", \"$FIRST\"], \"check\": {\"$FIRST\": {\"withdrawn\": true, \"withdrawn_at\": \"$WHEN\"}}}")"
  if [[ "$(status "$out")" != 200 && "$(status "$out")" != 204 ]]; then fail "withdrawing again answered $(status "$out") $(body "$out" | head -c 200)"
  elif [[ "$v" != OK ]]; then fail "withdrawing again: $v"
  else ok "withdrawn as the app does, her list reads it withdrawn and the other one standing; withdrawn again, the first moment is kept"; fi
fi

# --- 11. signed out, nothing -----------------------------------------------------------
out="$(TOKEN="" api GET "$(list_read "$KITCHEN")")"
pub_out="$(TOKEN="" publish "$(uuid)" "$PLACE" "$START" "$END" "[$DISH]")"
if grep -c '"id"' <<< "$(body "$out")" > /dev/null; then
  fail "signed out, the list returned publications: $(body "$out" | head -c 200)"
elif [[ "$(status "$pub_out")" == 2* ]]; then
  fail "signed out, publishing answered $(status "$pub_out") — nothing is reachable without an account"
else
  ok "signed out: no list ($(status "$out")), and publishing is refused ($(status "$pub_out"))"
fi

echo
if (( fails > 0 )); then
  echo "$fails assertion group(s) failed."
  exit 1
fi
echo "all 11 assertion groups passed — Wera Cocina publishes through names the database answers, every"
echo "line's value arrives under its own key, the same press twice is one publication, a shop's store and"
echo "an ended window are refused with nothing written, her list is her kitchen's alone, newest first, and"
echo "a withdrawal keeps its first moment."

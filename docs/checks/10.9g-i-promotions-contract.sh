#!/usr/bin/env bash
# 10.9g-i-promotions-contract — does Wera Cocina read, make, end and undo a promotion, and publish an
# offer that joins one, by the names the database answers? And does Itacate read them, and the
# offer's mark, through the door by its names?
#
# WHY THIS EXISTS. `cocina/src/api/promociones.ts` is Wera Cocina's claim about `0087`: four
# functions, their arguments, every key of their answer, the refusals it reads; `cocina/src/api/
# listing.ts` names the argument an offer joins one by (`p_promotion_id`); `itacate/src/api/
# cocinas.ts` names the door's `promotions`, each promotion's keys, and each offer's mark. PostgREST
# matches a function BY ITS ARGUMENTS' NAMES, so a misspelt `p_` name is a 404; a misspelt key of
# an answer is a 200 with her promotions drawn empty, a band never shown, a mark never worn. The
# typecheck, the suites and the bundler all pass over each one. (`10.5-iv-a-door-contract.sh` holds
# the door's kitchen and offer keys by presence; this holds a promotion's, exactly.)
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF those three files, the fonda's setup out of Wera Cocina's own files:
#      nothing retyped — the door's two keys are the ones whose comment names `0087`.
#   2. Her kitchen's promotions, by Wera Cocina's names: exactly the app's keys, none yet.
#   3. *Publicar promoción*, by Wera Cocina's names — *Un día especial* on her kitchen's weekday —
#      exactly the app's keys, and the promotion's own.
#   4. An offer that joins it, by Wera Cocina's names (`publish_listing`'s sixth): 200.
#   5. A neighbour's door, by Itacate's names: the kitchen's promotion with exactly the app's keys,
#      and the offer wearing its id.
#   6. Two more, then a fourth refused with the code Wera Cocina reads (three at once).
#   7. *Para tus clientes* with no card: refused with the code Wera Cocina reads.
#   8. *Terminarla hoy*, by Wera Cocina's names: terminada; the door drops it and the offer's mark.
#   9. An offer joining one not on today's weekday: refused with the code Wera Cocina reads.
#  10. *Deshacer*, by Wera Cocina's names: gone. Ending one she does not have: her list, unchanged —
#      never a refusal (a raised `P0002` is a 500 through PostgREST, which this check found).
#  11. Signed out, nothing is answered.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the database's own rules (`supabase/tests/0087_promotions.sql`: the
# shapes, who may, *Deshacer*'s two minutes — `TD032` cannot be reached in a run without waiting —
# the card closing, her own off, Wera's switch, the deletions), or what a screen does with an answer
# (`cocina/test/promociones.test.ts`).
#
# ⚠️ IT TURNS WERA'S SWITCH FOR PROMOTIONS ON for its run, as the database's owner (`supabase db
# query --local`), and off again on its way out, as the card's check does. ⚠️ IT DELETES THE KITCHEN
# IT MADE as its owner (`delete_my_business`, `0077`). ⚠️ NO `mapfile`, NO `declare -A`: macOS ships
# bash 3.2. ⚠️ TWO ACCOUNTS A RUN: GoTrue allows 30 sign-ups in 5 minutes, and the falsifier runs
# this a dozen times.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9g-i-promotions-contract.sh
# With: $1 Wera Cocina's promociones.ts, $2 its listing.ts, $3 Itacate's cocinas.ts — how the
#       falsifier points it at a broken copy.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

PROMOS_TS="${1:-cocina/src/api/promociones.ts}"
LISTING_TS="${2:-cocina/src/api/listing.ts}"
COCINAS_TS="${3:-itacate/src/api/cocinas.ts}"
KITCHEN_TS="cocina/src/api/kitchen.ts"
ACCOUNT_TS="cocina/src/api/account.ts"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
for f in "$PROMOS_TS" "$LISTING_TS" "$COCINAS_TS" "$KITCHEN_TS" "$ACCOUNT_TS" "$CREDENTIALS_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f (run this from the repository root)"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
as_owner() { supabase db query --local -o csv "$1" 2>/dev/null | tail -1; }
trap 'as_owner "update servicio.feature_switch set is_on = false where name = '"'"'promociones'"'"'" >/dev/null; rm -rf "$SCRATCH"' EXIT

# --- 1. the apps' own claim, read out of their source ----------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
fields_of() { # file interface prefix-regex — a key may be optional (`?:`); an interface may extend another
  awk -v want="$2" '
    $0 ~ "^export interface " want "( extends [A-Za-z]+)? [{]$" { f=1; next }
    f && /^}/ { exit }
    f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\)?\{0,1\}:.*/\1/p" | paste -sd, -
}
# The key of an interface whose doc comment, on the line above it, names `0087`.
key_of_0087() { # file interface
  awk -v want="$2" '$0 ~ "^export interface " want " [{]$" {f=1; next} f && /^}/ {exit} f' "$1" \
    | grep -A1 '`0087`' | sed -n 's/^ *readonly \([a-z_]*\)?\{0,1\}:.*/\1/p' | head -1
}

READ="$(const KITCHEN_PROMOTIONS "$PROMOS_TS")"
MAKE="$(const CREATE_PROMOTION "$PROMOS_TS")"
END="$(const END_PROMOTION "$PROMOS_TS")"
UNDO="$(const UNDO_PROMOTION "$PROMOS_TS")"
THREE="$(const TRES_ACTIVAS "$PROMOS_TS")"
NO_CARD="$(const SIN_TARJETA "$PROMOS_TS")"
CANT_JOIN="$(const NO_SE_PUEDE_UNIR "$PROMOS_TS")"
KITCHEN_ARGS="$(fields_of "$PROMOS_TS" KitchenArgs 'p_')"
MAKE_ARGS="$(fields_of "$PROMOS_TS" CreateArgs 'p_')"
PROMO_ARGS="$(fields_of "$PROMOS_TS" PromotionArgs 'p_')"
ANSWER_KEYS="$(fields_of "$PROMOS_TS" PromotionsRow '')"
ROW_KEYS="$(fields_of "$PROMOS_TS" PromotionRow '')"

PUBLISH="$(const PUBLISH_LISTING "$LISTING_TS")"
PUBLISH_ARGS="$(fields_of "$LISTING_TS" PublishArgs 'p_')"
LINE_BODY="$(fields_of "$LISTING_TS" LineBody '')"

DOOR="$(const ON_OFFER_NOW "$COCINAS_TS")"
DOOR_PROMOS="$(key_of_0087 "$COCINAS_TS" KitchenRow)"
OFFER_MARK="$(key_of_0087 "$COCINAS_TS" OfferRow)"
DOOR_ROW_KEYS="$(fields_of "$COCINAS_TS" DoorPromotionRow '')"

ONBOARD="$(const ONBOARD_WORKSPACE "$KITCHEN_TS")"
ONBOARD_ARGS="$(fields_of "$KITCHEN_TS" OnboardArgs 'p_')"
KIND="$(const COCINA_KIND "$KITCHEN_TS")"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"
DELETE="$(const DELETE_MY_BUSINESS "$ACCOUNT_TS")"
DELETE_ARGS="$(fields_of "$ACCOUNT_TS" DeleteBusinessArgs 'p_')"

for pair in "KITCHEN_PROMOTIONS:$READ" "CREATE_PROMOTION:$MAKE" "END_PROMOTION:$END" "UNDO_PROMOTION:$UNDO" \
            "TRES_ACTIVAS:$THREE" "SIN_TARJETA:$NO_CARD" "NO_SE_PUEDE_UNIR:$CANT_JOIN" \
            "KitchenArgs:$KITCHEN_ARGS" "CreateArgs:$MAKE_ARGS" "PromotionArgs:$PROMO_ARGS" \
            "PromotionsRow:$ANSWER_KEYS" "PromotionRow:$ROW_KEYS" \
            "PUBLISH_LISTING:$PUBLISH" "PublishArgs:$PUBLISH_ARGS" "LineBody:$LINE_BODY" \
            "ON_OFFER_NOW:$DOOR" "KitchenRow's 0087 key:$DOOR_PROMOS" "OfferRow's 0087 key:$OFFER_MARK" \
            "DoorPromotionRow:$DOOR_ROW_KEYS" "ONBOARD_WORKSPACE:$ONBOARD" "OnboardArgs:$ONBOARD_ARGS" \
            "COCINA_KIND:$KIND" "FULL_NAME_KEY:$NAME_KEY" "DELETE_MY_BUSINESS:$DELETE" "DeleteBusinessArgs:$DELETE_ARGS"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the apps' source"
    echo "      This check asserts the apps' own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
# `PublishArgs`' sixth name is the promotion it joins: optional, so read here by its place.
IFS=, read -r _ _ _ _ _ JOIN_ARG _ <<< "$PUBLISH_ARGS"
[[ -n "${JOIN_ARG:-}" ]] || { echo "FAIL: PublishArgs names no sixth argument — the promotion an offer joins"; exit 1; }
ok "read from Wera Cocina: $READ($KITCHEN_ARGS) → {$ANSWER_KEYS}, each {$ROW_KEYS}; $MAKE($MAKE_ARGS); $END and $UNDO($PROMO_ARGS); $PUBLISH(…, $JOIN_ARG)"
ok "read from Itacate: $DOOR() — a kitchen's $DOOR_PROMOS, each {$DOOR_ROW_KEYS}; an offer's $OFFER_MARK"

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
      -H "apikey: $KEY" -H "$auth" -H 'Content-Type: application/json' -d "$body"
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
uuid()   { python3 -c 'import uuid; print(uuid.uuid4())'; }
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

# Verdicts are one python file, a function per question.
cat > "$SCRATCH/v.py" <<'PY'
import datetime, json, sys

def load(path):
    try:
        return json.load(open(path))
    except Exception:
        return None

def exactly(a, keys, what):
    if not isinstance(a, dict):
        return '%s is %r, not an object' % (what, a)
    want = keys.split(',')
    gone = [k for k in want if k not in a]
    extra = [k for k in a if k not in want]
    if gone:
        return '%s carried no %s' % (what, ', '.join(repr(k) for k in gone))
    if extra:
        return '%s carried %s, which the app does not read' % (what, ', '.join(repr(k) for k in extra))
    return None

def answer(a, keys, row_keys, running, ids, states=''):
    """kitchen_promotions, or a write's answer: exactly the app's keys, each promotion's too."""
    bad = exactly(a, keys, 'the answer')
    if bad:
        return bad
    if a.get('running') != int(running):
        return 'running came back %r, not %s' % (a.get('running'), running)
    ps = a.get('promotions')
    if not isinstance(ps, list):
        return 'promotions came back %r' % (ps,)
    for p in ps:
        bad = exactly(p, row_keys, 'a promotion')
        if bad:
            return bad
    got = ','.join(p.get('id', '') for p in ps)
    if got != ids:
        return 'its promotions came back %s, not %s' % (got or 'none', ids or 'none')
    if states and ','.join(p.get('state', '') for p in ps) != states:
        return 'their states came back %s, not %s' % (','.join(p.get('state', '') for p in ps), states)
    return None

def day_of(a):
    return a.get('day', '') if isinstance(a, dict) else ''

def door(a, kitchen, promos_key, row_keys, mark_key, promo, offer, mode):
    """The door: her kitchen's promotions with exactly the app's keys; `promo` in it and the offer wearing
    its id (mode `in`), or `promo` gone from it and the offer wearing nothing (mode `out`)."""
    if not isinstance(a, list):
        return 'the door answered %r, not a list' % (a,)
    k = next((x for x in a if isinstance(x, dict) and x.get('id') == kitchen), None)
    if k is None:
        return 'her kitchen is not in the door'
    ps = k.get(promos_key)
    if not isinstance(ps, list):
        return 'her kitchen carried no %r list: %r' % (promos_key, ps)
    for p in ps:
        bad = exactly(p, row_keys, "a promotion in the door")
        if bad:
            return bad
    ids = [p.get('id') for p in ps]
    if mode == 'in' and promo not in ids:
        return 'her promotion is not in the door (%r)' % ids
    if mode == 'out' and promo in ids:
        return 'the door still sends the promotion she ended (%r)' % ids
    o = next((x for x in (k.get('on_offer') or []) if isinstance(x, dict) and x.get('id') == offer), None)
    if o is None:
        return 'her offer is not on offer in the door'
    if mark_key not in o:
        return 'the offer carried no %r' % mark_key
    want = promo if mode == 'in' else None
    return None if o.get(mark_key) == want else 'the offer wears %r, not %r' % (o.get(mark_key), want)

def code(a, want):
    got = a.get('code') if isinstance(a, dict) else None
    return None if got == want else 'refused with %r — the app reads %r' % (got, want)

if __name__ == '__main__':
    fn, path, *rest = sys.argv[1:]
    r = globals()[fn](load(path), *rest)
    print(r or '')
PY
check() { # label verdict-function json-file args...
  local label="$1" fn="$2" file="$3"; shift 3
  local why; why="$(python3 "$SCRATCH/v.py" "$fn" "$file" "$@")"
  if [[ -z "$why" ]]; then ok "$label"; else fail "$label — $why"; fi
}
v() { python3 "$SCRATCH/v.py" "$@"; }
# Date arithmetic only, no clock: her kitchen's weekday (ISO, 1 Monday) shifted, and a day n days on.
dow()  { python3 -c 'import datetime,sys; d=datetime.date.fromisoformat(sys.argv[1]); print((d.isoweekday()-1+int(sys.argv[2]))%7+1)' "$1" "$2"; }
plus() { python3 -c 'import datetime,sys; print((datetime.date.fromisoformat(sys.argv[1])+datetime.timedelta(days=int(sys.argv[2]))).isoformat())' "$1" "$2"; }
# A call whose answer is checked: a non-200 is a failure that names the function and its status.
call() { # file function body
  local out; out="$(api POST "/rest/v1/rpc/$2" "$3")"
  body "$out" > "$SCRATCH/$1.json"
  if [[ "$(status "$out")" != 200 ]]; then fail "$2 answered $(status "$out"): $(body "$out" | head -c 200)"; return 1; fi
}
refused() { # label file function body want-code
  local out; out="$(api POST "/rest/v1/rpc/$3" "$4")"
  body "$out" > "$SCRATCH/$2.json"
  check "$1" code "$SCRATCH/$2.json" "$5"
}
make_one() { # id kind days-json ends-on what -> a create_promotion body by the app's names
  by_names "$MAKE_ARGS" "\"$A\"" "\"$1\"" "\"$2\"" "\"$5\"" null null "$3" "\"$4\"" \
    "\"Del $DAY al $4, en $NAME, Sabino 120, Santa María la Ribera.\""
}
iso_in() { python3 -c 'import datetime,sys; print((datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=int(sys.argv[1]))).isoformat())' "$1"; }

# --- Wera's switch, the fonda and her kitchen through Wera Cocina's names, a neighbour --------
[[ "$(as_owner "update servicio.feature_switch set is_on = true where name = 'promociones' returning is_on")" == t* ]] \
  || { echo "FAIL: could not turn Wera's switch for promotions on, as the database's owner"; exit 1; }
RUN="$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')"
NAME="Fonda Promo $RUN"
FONDA="$(signup "fonda-$RUN@example.invalid" "Fonda $RUN")"
VECINA="$(signup "vecina-$RUN@example.invalid" "Vecina Ruiz $RUN")"
[[ -n "$FONDA" && -n "$VECINA" ]] || { echo "FAIL: could not sign two accounts up"; exit 1; }
TOKEN="$FONDA"
out="$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" "\"$NAME\"" "\"$KIND\"")")"
A="$(tr -d '"' <<< "$(body "$out")")"
[[ "$A" =~ ^[0-9a-f-]{36}$ ]] || { echo "FAIL: her kitchen could not be made: $(status "$out") $(body "$out" | head -c 200)"; exit 1; }
PA="$(as_owner "select id from public.location where workspace_id = '$A'")"
[[ "$PA" =~ ^[0-9a-f-]{36}$ ]] || { echo "FAIL: her kitchen has no place"; exit 1; }
ok "Wera's switch on for this run; a fonda and her kitchen made through Wera Cocina's names ($ONBOARD), a neighbour signed up"

# --- 2. her kitchen's promotions, none yet ---------------------------------------------------
call r0 "$READ" "$(by_names "$KITCHEN_ARGS" "\"$A\"")" \
  && check "her kitchen's promotions by Wera Cocina's names: exactly the app's keys, none yet" answer "$SCRATCH/r0.json" "$ANSWER_KEYS" "$ROW_KEYS" 0 ""
DAY="$(v day_of "$SCRATCH/r0.json")"
[[ "$DAY" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "FAIL: her kitchen's day did not come back ($DAY)"; exit 1; }
TODAY_DOW="$(dow "$DAY" 0)"; OTHER_DOW="$(dow "$DAY" 1)"

# --- 3. Publicar promoción --------------------------------------------------------------------
P1="$(uuid)"; P2="$(uuid)"; P3="$(uuid)"; P4="$(uuid)"; P5="$(uuid)"
call m1 "$MAKE" "$(make_one "$P1" dia "[$TODAY_DOW]" "$(plus "$DAY" 14)" "Jueves pozolero")" \
  && check "Publicar promoción by Wera Cocina's names — un día especial, on her weekday: the app's keys, and the promotion's" answer "$SCRATCH/m1.json" "$ANSWER_KEYS" "$ROW_KEYS" 1 "$P1" activa

# --- 4. an offer that joins it ------------------------------------------------------------------
OFFER="$(uuid)"
DISH="$(by_names "$LINE_BODY" '"Pozole rojo"' 'null' '[]' '"70.00"' '6' 'false' '"95.00"' 'null')"
out="$(api POST "/rest/v1/rpc/$PUBLISH" "$(by_names "$PUBLISH_ARGS" "\"$OFFER\"" "\"$PA\"" "\"$(iso_in 0)\"" "\"$(iso_in 180)\"" "[$DISH]" "\"$P1\"")")"
[[ "$(status "$out")" == 200 ]] && ok "an offer joins it by Wera Cocina's names ($PUBLISH's $JOIN_ARG): 200" \
  || fail "the offer could not join it: $PUBLISH answered $(status "$out") $(body "$out" | head -c 200)"

# --- 5. a neighbour's door --------------------------------------------------------------------------
TOKEN="$VECINA"
call d1 "$DOOR" '{}' \
  && check "the neighbour's door by Itacate's names: her promotion with exactly the app's keys, the offer wearing its id" door "$SCRATCH/d1.json" "$A" "$DOOR_PROMOS" "$DOOR_ROW_KEYS" "$OFFER_MARK" "$P1" "$OFFER" in

# --- 6. three at once ------------------------------------------------------------------------------
TOKEN="$FONDA"
call m2 "$MAKE" "$(make_one "$P2" nuevo '[1,2,3,4,5,6,7]' "$(plus "$DAY" 7)" "Enchiladas potosinas")"
call m3 "$MAKE" "$(make_one "$P3" temporada '[1,2,3,4,5,6,7]' "$(plus "$DAY" 30)" "Romeritos")" \
  && check "two more by Wera Cocina's names: three running" answer "$SCRATCH/m3.json" "$ANSWER_KEYS" "$ROW_KEYS" 3 "$P3,$P2,$P1"
refused "a fourth is refused with the code Wera Cocina reads (three at once)" x1 "$MAKE" \
  "$(make_one "$P4" nuevo '[1,2,3,4,5,6,7]' "$(plus "$DAY" 7)" "Chiles en nogada")" "$THREE"

# --- 7. Para tus clientes with no card -----------------------------------------------------------
refused "Para tus clientes with no card open: refused with the code Wera Cocina reads" x2 "$MAKE" \
  "$(make_one "$P4" clientes '[1,2,3,4,5,6,7]' "$(plus "$DAY" 7)" "Agua gratis")" "$NO_CARD"

# --- 8. Terminarla hoy --------------------------------------------------------------------------------
call e1 "$END" "$(by_names "$PROMO_ARGS" "\"$A\"" "\"$P1\"")" \
  && check "Terminarla hoy by Wera Cocina's names: terminada, two running" answer "$SCRATCH/e1.json" "$ANSWER_KEYS" "$ROW_KEYS" 2 "$P3,$P2,$P1" activa,activa,terminada
TOKEN="$VECINA"
call d2 "$DOOR" '{}' \
  && check "the door drops it, and the offer's mark with it" door "$SCRATCH/d2.json" "$A" "$DOOR_PROMOS" "$DOOR_ROW_KEYS" "$OFFER_MARK" "$P1" "$OFFER" out

# --- 9. an offer joining one not on today's weekday --------------------------------------------------
TOKEN="$FONDA"
call m5 "$MAKE" "$(make_one "$P5" dia "[$OTHER_DOW]" "$(plus "$DAY" 14)" "Viernes de pescado")"
refused "an offer joining one not on today's weekday: refused with the code Wera Cocina reads" x3 "$PUBLISH" \
  "$(by_names "$PUBLISH_ARGS" "\"$(uuid)\"" "\"$PA\"" "\"$(iso_in 0)\"" "\"$(iso_in 120)\"" "[$DISH]" "\"$P5\"")" "$CANT_JOIN"

# --- 10. Deshacer -------------------------------------------------------------------------------------
call u1 "$UNDO" "$(by_names "$PROMO_ARGS" "\"$A\"" "\"$P5\"")" \
  && check "Deshacer by Wera Cocina's names, within its minutes: gone" answer "$SCRATCH/u1.json" "$ANSWER_KEYS" "$ROW_KEYS" 2 "$P3,$P2,$P1"
call x4 "$END" "$(by_names "$PROMO_ARGS" "\"$A\"" "\"$(uuid)\"")" \
  && check "ending one her kitchen does not have, by Wera Cocina's names: her list, unchanged — never a refusal" answer "$SCRATCH/x4.json" "$ANSWER_KEYS" "$ROW_KEYS" 2 "$P3,$P2,$P1"

out="$(api POST "/rest/v1/rpc/$DELETE" "$(by_names "$DELETE_ARGS" "\"$A\"" "\"$NAME\"")")"
[[ "$(status "$out")" == 200 ]] && ok "her kitchen deleted alone through Wera Cocina's names ($DELETE)" || fail "could not delete her kitchen: $DELETE answered $(status "$out") $(body "$out" | head -c 200)"

# --- 11. signed out --------------------------------------------------------------------------------
TOKEN=""
for fn in "$READ:$(by_names "$KITCHEN_ARGS" "\"$A\"")" "$MAKE:$(make_one "$(uuid)" nuevo '[1]' "$DAY" "Nada")" \
          "$END:$(by_names "$PROMO_ARGS" "\"$A\"" "\"$P2\"")" "$UNDO:$(by_names "$PROMO_ARGS" "\"$A\"" "\"$P2\"")"; do
  out="$(api POST "/rest/v1/rpc/${fn%%:*}" "${fn#*:}")"
  [[ "$(status "$out")" == 401 || "$(status "$out")" == 403 ]] && ok "signed out, ${fn%%:*} is refused ($(status "$out"))" || fail "signed out, ${fn%%:*} answered $(status "$out")"
done

echo
if (( fails > 0 )); then
  echo "$fails assertion(s) failed."
  exit 1
fi
echo "every assertion held: her kitchen's promotions, one made, an offer joining it, the door's band and mark, three at once, the card's kind, ending, the weekday and Deshacer are the names the database answers."

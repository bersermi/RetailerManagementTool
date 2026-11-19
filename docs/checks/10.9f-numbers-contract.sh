#!/usr/bin/env bash
# 10.9f-numbers-contract — does Wera Cocina read her numbers by the names the database answers,
# and does a plate handed over through the apps' own functions land in them as one visit?
#
# WHY THIS EXISTS. `cocina/src/api/numeros.ts` is Wera Cocina's claim about `0086`: one function,
# its argument, every key of its answer at three levels (the answer, each period, the period
# before), and the refusal it reads as *not her kitchen's owner*. PostgREST matches a function BY
# ITS ARGUMENTS' NAMES, so a misspelt `p_` name is a 404; a misspelt key is a 200 the app reads as
# *No pudimos leer tus números* — or, for a figure about people, as one under the floor. The
# typecheck, the suites and the bundler all pass over each one. And `supabase/tests/0086_…` counts
# rows it WROTE ITSELF: this is where a reservation made by Itacate's `reserve_plate` and handed over
# by Wera Cocina's `hand_over_reservation` — the trigger stamping her card on the way — is counted.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF `numeros.ts`, the fonda's and the neighbour's setup out of the two
#      apps' own files: nothing retyped.
#   2. Her kitchen with nothing yet, asked as its owner by Wera Cocina's names: exactly the app's
#      keys at every level, no first visit, every count 0, the people under the floor.
#   3. One plate reserved through Itacate's names and handed over through Wera Cocina's, with her
#      loyalty card on (the handover stamps it): today, this week and this month each hold ONE
#      plate, ONE visit — her reservation and its stamp are one — no walk-in, $60, her first visit
#      set, the people still under the floor; each set of bars adds up to the one visit.
#   4. The neighbour asking for the kitchen's numbers: refused with the code the app reads.
#   5. Signed out, nothing is answered.
#
# ⚠️ WHAT IT DOES NOT ASSERT: what the database counts on a calendar — the weeks, the months, the
# zone, the floor at five, a person whose account is gone (`supabase/tests/0086_her_numbers.sql`) —
# or what a screen says of an answer (`cocina/test/numeros.test.ts`).
#
# ⚠️ IT TURNS WERA'S SWITCH `tarjeta` ON as the database's owner, for the handover's stamp, and back
# to what it was at the end. ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2. ⚠️ TWO ACCOUNTS
# A RUN: GoTrue allows 30 sign-ups in 5 minutes, and the falsifier runs this a dozen times.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9f-numbers-contract.sh
# With: $1 Wera Cocina's numeros.ts — how the falsifier points it at a broken copy.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

NUMEROS_TS="${1:-cocina/src/api/numeros.ts}"
KITCHEN_TS="cocina/src/api/kitchen.ts"
PLACE_TS="cocina/src/api/place.ts"
LISTING_TS="cocina/src/api/listing.ts"
APARTADOS_TS="cocina/src/api/apartados.ts"
TARJETA_TS="cocina/src/api/tarjeta.ts"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
ITACATE_TS="itacate/src/api/apartados.ts"
for f in "$NUMEROS_TS" "$KITCHEN_TS" "$PLACE_TS" "$LISTING_TS" "$APARTADOS_TS" "$TARJETA_TS" "$CREDENTIALS_TS" "$ITACATE_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f (run this from the repository root)"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
SWITCH_WAS=""
restore() {
  [[ -n "$SWITCH_WAS" ]] && supabase db query --local -o csv \
    "update servicio.feature_switch set is_on = $SWITCH_WAS where name = 'tarjeta' returning is_on" > /dev/null 2>&1
  rm -rf "$SCRATCH"
}
trap restore EXIT

# --- 1. the apps' own claim, read out of their source ----------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
fields_of() { # file interface prefix-regex — `export interface X {` or `export interface X extends Y {`
  awk -v name="$2" '$0 ~ "^export interface " name "( extends [A-Za-z_]+)? [{]$" {f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\)?\{0,1\}:.*/\1/p" | paste -sd, -
}
list_of() { sed -n "s/^export const $1 = \[\(.*\)\] as const;.*/\1/p" "$2" | tr -d "' " | head -1; }
nth() { cut -d, -f"$2" <<< "$1"; }

NUMBERS="$(const KITCHEN_NUMBERS "$NUMEROS_TS")"
NUMBERS_ARGS="$(fields_of "$NUMEROS_TS" NumbersArgs 'p_')"
TOP_KEYS="$(fields_of "$NUMEROS_TS" Numeros '')"
BEFORE_KEYS="$(fields_of "$NUMEROS_TS" Antes '')"
PERIOD_OWN_KEYS="$(fields_of "$NUMEROS_TS" EnElPeriodo '')"
PERIODS="$(list_of PERIODOS "$NUMEROS_TS")"
NOT_OWNER="$(const NO_ES_LA_DUENA "$NUMEROS_TS")"
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
HAND_OVER="$(const HAND_OVER_RESERVATION "$APARTADOS_TS")"
HAND_OVER_ARGS="$(fields_of "$APARTADOS_TS" HandOverArgs 'p_')"
PAYMENTS="$(list_of PAGOS "$APARTADOS_TS")"
WAYS="$(list_of COMERES "$APARTADOS_TS")"
TERMS="$(const SET_CARD_TERMS "$TARJETA_TS")"
TERMS_ARGS="$(fields_of "$TARJETA_TS" TermsArgs 'p_')"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"
RESERVE="$(const RESERVE_PLATE "$ITACATE_TS")"
RESERVE_ARGS="$(fields_of "$ITACATE_TS" ReserveArgs 'p_')"
YES="$(const GIVE_MY_YES "$ITACATE_TS")"

for pair in "KITCHEN_NUMBERS:$NUMBERS" "NumbersArgs:$NUMBERS_ARGS" "Numeros:$TOP_KEYS" "Antes:$BEFORE_KEYS" \
            "EnElPeriodo:$PERIOD_OWN_KEYS" "PERIODOS:$PERIODS" "NO_ES_LA_DUENA:$NOT_OWNER" \
            "ONBOARD_WORKSPACE:$ONBOARD" "OnboardArgs:$ONBOARD_ARGS" "COCINA_KIND:$KIND" "PLACE_TABLE:$PLACE_TABLE" \
            "PLACE_OWNER_COLUMN:$PLACE_OWNER" "SET_STORE_ADDRESS:$SET_ADDRESS" "SetStoreAddressArgs:$ADDRESS_ARGS" \
            "PUBLISH_LISTING:$PUBLISH" "PublishArgs:$PUBLISH_ARGS" "LineBody:$LINE_BODY" \
            "HAND_OVER_RESERVATION:$HAND_OVER" "HandOverArgs:$HAND_OVER_ARGS" "PAGOS:$PAYMENTS" "COMERES:$WAYS" \
            "SET_CARD_TERMS:$TERMS" "TermsArgs:$TERMS_ARGS" "FULL_NAME_KEY:$NAME_KEY" \
            "RESERVE_PLATE:$RESERVE" "ReserveArgs:$RESERVE_ARGS" "GIVE_MY_YES:$YES"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the apps' source"
    echo "      This check asserts the apps' own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
# A period carries the period before's keys and its own (`EnElPeriodo extends Antes`).
PERIOD_KEYS="$BEFORE_KEYS,$PERIOD_OWN_KEYS"
CASH="$(nth "$PAYMENTS" 1)"; TO_GO="$(nth "$WAYS" 1)"
ok "read from Wera Cocina: $NUMBERS($NUMBERS_ARGS) → {$TOP_KEYS}, each of $PERIODS {$PERIOD_KEYS}, the period before {$BEFORE_KEYS}; not her owner: $NOT_OWNER"

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
first_id() { python3 -c 'import json,sys; r=json.load(sys.stdin); print(r[0]["id"] if isinstance(r,list) and r else "")' 2>/dev/null; }
iso() { python3 -c 'import datetime,sys; print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(minutes=int(sys.argv[1]))).isoformat(timespec="seconds").replace("+00:00","Z"))' "$1"; }
uuid() { python3 -c 'import uuid; print(uuid.uuid4())'; }
# Her hours inside a window, as Itacate offers them: every quarter hour from the first at or after the start.
first_hour() { # start end
  python3 -c '
import datetime, sys
p = lambda t: datetime.datetime.fromisoformat(t.replace("Z", "+00:00"))
q = 15 * 60
s = int(p(sys.argv[1]).timestamp())
print(datetime.datetime.fromtimestamp(-(-s // q) * q, datetime.timezone.utc).isoformat().replace("+00:00", "Z"))' "$@"
}
as_owner() { supabase db query --local -o csv "$1" 2>/dev/null | tail -1; }
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
import json, sys

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

def shape(a, top, periods, period_keys, before_keys):
    """Exactly the app's keys at each level: the answer, each period, the period before."""
    bad = exactly(a, top, 'the answer')
    if bad:
        return bad
    for p in periods.split(','):
        x = a.get(p)
        bad = exactly(x, period_keys, 'the period %r' % p) or exactly(x.get('prev'), before_keys, 'the period before %r' % p)
        if bad:
            return bad
    return None

def counts(a, periods, plates, visits, walk_ins, cents, since):
    """Every period holds the same: the counts given, the people under the floor, the bars adding up."""
    if not isinstance(a, dict):
        return 'the answer is %r' % (a,)
    if (a.get('since') is None) != (since == 'none'):
        return 'her first visit came back %r' % (a.get('since'),)
    for p in periods.split(','):
        x = a.get(p) or {}
        got = (x.get('plates'), x.get('visits'), x.get('walk_ins'), x.get('cents'))
        want = (int(plates), int(visits), int(walk_ins), int(cents))
        if got != want:
            return '%s came back plates, visits, walk-ins, cents = %r, not %r' % (p, got, want)
        if x.get('neighbours') is not None or x.get('returning') is not None:
            return '%s showed people under the floor: %r, %r' % (p, x.get('neighbours'), x.get('returning'))
        if sum(x.get('hours') or []) != int(visits) or (p != 'dia' and sum(x.get('days') or []) != int(visits)):
            return '%s: its bars do not add up to its visits (%r, %r)' % (p, x.get('days'), x.get('hours'))
    return None

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
  local why rc; why="$(python3 "$SCRATCH/v.py" "$fn" "$file" "$@" 2>&1)"; rc=$?
  # ⚠️ A verdict that crashed said nothing — and nothing must never read as a pass.
  (( rc == 0 )) || why="the verdict could not read the answer: $(tail -1 <<< "$why")"
  if [[ -z "$why" ]]; then ok "$label"; else fail "$label — $why"; fi
}
# A call whose answer is checked: a non-200 is a failure that names the function and its status.
call() { # file function body
  local out; out="$(api POST "/rest/v1/rpc/$2" "$3")"
  body "$out" > "$SCRATCH/$1.json"
  if [[ "$(status "$out")" != 200 ]]; then fail "$2 answered $(status "$out"): $(body "$out" | head -c 200)"; return 1; fi
}

# --- the fonda, made through Wera Cocina's names; a neighbour ----------------
RUN="$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')"
FONDA="$(signup "fonda-numeros-$RUN@example.invalid" "Fonda $RUN")"
VECINA="$(signup "vecina-numeros-$RUN@example.invalid" "Vecina $RUN")"
[[ -n "$FONDA" && -n "$VECINA" ]] || { echo "FAIL: could not sign two accounts up"; exit 1; }
TOKEN="$FONDA"
out="$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" "\"Fonda Contada $RUN\"" "\"$KIND\"")")"
A="$(tr -d '"' <<< "$(body "$out")")"
[[ "$A" =~ ^[0-9a-f-]{36}$ ]] || { echo "FAIL: her kitchen could not be made: $(status "$out") $(body "$out" | head -c 200)"; exit 1; }
PA="$(body "$(api GET "/rest/v1/$PLACE_TABLE?select=id&$PLACE_OWNER=eq.$A&order=created_at,id&limit=1")" | first_id)"
[[ -n "$PA" ]] || { echo "FAIL: could not read her kitchen's place"; exit 1; }
out="$(api POST "/rest/v1/rpc/$SET_ADDRESS" "$(by_names "$ADDRESS_ARGS" "\"$PA\"" '"Sabino"' '"12"' '"Santa María la Ribera"' '"Cuauhtémoc"' '"06400"')")"
[[ "$(status "$out")" == 2* ]] || { echo "FAIL: her address could not be set: $(status "$out") $(body "$out" | head -c 160)"; exit 1; }
ok "a fonda and her kitchen made through Wera Cocina's names ($ONBOARD, $SET_ADDRESS), a neighbour signed up"

# --- 2. nothing yet, asked as her owner ------------------------------------------------
if call n0 "$NUMBERS" "$(by_names "$NUMBERS_ARGS" "\"$A\"")"; then
  check "her numbers by Wera Cocina's names, asked as the owner: exactly the app's keys at every level" shape "$SCRATCH/n0.json" "$TOP_KEYS" "$PERIODS" "$PERIOD_KEYS" "$BEFORE_KEYS"
  check "nothing yet: no first visit, every count 0, nobody shown" counts "$SCRATCH/n0.json" "$PERIODS" 0 0 0 0 none
fi

# --- 3. one plate, reserved in Itacate and handed over in Wera Cocina, her card on -----
SWITCH_WAS="$(as_owner "select is_on from servicio.feature_switch where name = 'tarjeta'")"
[[ "$SWITCH_WAS" == true || "$SWITCH_WAS" == false ]] || { echo "FAIL: could not read Wera's switch for the card ($SWITCH_WAS)"; exit 1; }
[[ "$(as_owner "update servicio.feature_switch set is_on = true where name = 'tarjeta' returning is_on")" == true ]] \
  || { echo "FAIL: could not turn Wera's switch for the card on"; exit 1; }
out="$(api POST "/rest/v1/rpc/$TERMS" "$(by_names "$TERMS_ARGS" "\"$A\"" '"Un agua fresca"' 8 0)")"
[[ "$(status "$out")" == 200 ]] || { echo "FAIL: her card could not be set up: $(status "$out") $(body "$out" | head -c 160)"; exit 1; }
START="$(iso 15)"; END="$(iso 165)"
OFFER="$(uuid)"
DISH="$(by_names "$LINE_BODY" '"Mole con arroz"' 'null' '[]' '"60.00"' '3' 'false' '"120.00"' 'null')"
out="$(api POST "/rest/v1/rpc/$PUBLISH" "$(by_names "$PUBLISH_ARGS" "\"$OFFER\"" "\"$PA\"" "\"$START\"" "\"$END\"" "[$DISH]")")"
[[ "$(status "$out")" == 200 ]] || { echo "FAIL: she could not publish: $(status "$out") $(body "$out" | head -c 160)"; exit 1; }
TOKEN="$VECINA"
api POST "/rest/v1/rpc/$YES" '{}' > /dev/null
R1="$(uuid)"
out="$(api POST "/rest/v1/rpc/$RESERVE" "$(by_names "$RESERVE_ARGS" "\"$R1\"" "\"$OFFER\"" '1' "\"$(first_hour "$START" "$END")\"" "\"$CASH\"" "\"$TO_GO\"")")"
[[ "$(status "$out")" == 200 ]] || { echo "FAIL: the neighbour could not reserve, as Itacate does: $(status "$out") $(body "$out" | head -c 200)"; exit 1; }
TOKEN="$FONDA"
out="$(api POST "/rest/v1/rpc/$HAND_OVER" "$(by_names "$HAND_OVER_ARGS" "\"$R1\"" "\"$(iso 0)\"")")"
[[ "$(status "$out")" == 200 ]] || { echo "FAIL: she could not hand it over: $(status "$out") $(body "$out" | head -c 160)"; exit 1; }
STAMPS="$(as_owner "select count(*) from servicio.card_stamp where workspace_id = '$A' and reservation_id = '$R1' and via = 'entrega'")"
[[ "$STAMPS" == 1 ]] || fail "the handover did not stamp her card ($STAMPS stamps) — the visit below would not be tested as one"
ok "she set up her card ($TERMS), published a \$60 plate ($PUBLISH); the neighbour reserved one ($RESERVE); she handed it over ($HAND_OVER) — and the handover stamped the card"
if call n1 "$NUMBERS" "$(by_names "$NUMBERS_ARGS" "\"$A\"")"; then
  check "one plate today, this week and this month — ONE visit (her reservation and its stamp are one), no walk-in, \$60, nobody shown under five" counts "$SCRATCH/n1.json" "$PERIODS" 1 1 0 6000 set
fi

# --- 4. the neighbour asking ----------------------------------------------------------
TOKEN="$VECINA"
out="$(api POST "/rest/v1/rpc/$NUMBERS" "$(by_names "$NUMBERS_ARGS" "\"$A\"")")"
body "$out" > "$SCRATCH/r1.json"
if [[ "$(status "$out")" == 404 ]]; then fail "$NUMBERS answered 404 — no function by these arguments' names ($NUMBERS_ARGS)"
else check "the neighbour asking for the kitchen's numbers: refused with the code the app reads" code "$SCRATCH/r1.json" "$NOT_OWNER"; fi

# --- 5. signed out --------------------------------------------------------------------
TOKEN=""
out="$(api POST "/rest/v1/rpc/$NUMBERS" "$(by_names "$NUMBERS_ARGS" "\"$A\"")")"
[[ "$(status "$out")" == 401 || "$(status "$out")" == 403 ]] && ok "signed out, $NUMBERS is refused ($(status "$out"))" || fail "signed out, $NUMBERS answered $(status "$out")"

echo
if (( fails > 0 )); then
  echo "$fails assertion(s) failed."
  exit 1
fi
echo "every assertion held: her numbers are the names the database answers, and a handover through the apps is one visit in them."

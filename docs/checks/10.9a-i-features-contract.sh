#!/usr/bin/env bash
# 10.9a-i-features-contract — does Wera Cocina read and set what her kitchen uses, and tell Wera
# about her menu, by the names the database answers? And does Itacate read what a kitchen uses
# from the door by the key the door sends?
#
# WHY THIS EXISTS. `cocina/src/api/servicios.ts` is Wera Cocina's claim about `0081`: three
# functions, their arguments, every key of their one answer, the four features and the three
# states it sends, and the refusal it reads as *not offered*. PostgREST matches a function BY ITS
# ARGUMENTS' NAMES, so a misspelt `p_` name is a 404; a misspelt key of the answer is a 200 with
# her choices drawn as none; a misspelt feature or state is refused (`22023`) and her tap does
# nothing. And `itacate/src/api/cocinas.ts` names the door's `features` — misspelt, a 200 in which
# no kitchen ever uses anything. The typecheck, the suites and the bundler all pass over each one.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF those two files, the fonda's setup out of Wera Cocina's own files:
#      nothing retyped.
#   2. Before she chooses: the read answers the app's keys and nothing else, no choice.
#   3. Every feature the app knows, sent `off` by the app's names, comes back as the app's keys,
#      each feature with the app's states — and *Me interesa* (`interesada`) too.
#   4. `on` while Wera has the feature switched off: refused with the code the app reads (`TD024`).
#   5. Switched on (one UPDATE, as on the live database): `on` is taken, and the door, asked as a
#      neighbour, says so under the key Itacate reads — each name one Itacate knows.
#   6. *Cuéntanos*: the app's names, the answer counting it.
#   7. Signed out, nothing is answered.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the database's own rules (`supabase/tests/0081_…`: who may write,
# what is refused, the moments, Discord, the deletions), or what a screen does with an answer
# (`cocina/test/servicios.test.ts`, `itacate/test/cocinas.test.ts`).
#
# ⚠️ IT TURNS WERA'S `tarjeta` SWITCH OFF FIRST AND OFF AGAIN AT THE END, through the database's
# owner — the local stack only. ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2. ⚠️ TWO
# ACCOUNTS A RUN: GoTrue allows 30 sign-ups in 5 minutes, and the falsifier runs this a dozen times.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9a-i-features-contract.sh
# With: $1 servicios.ts, $2 Itacate's cocinas.ts — how the falsifier points it at a broken copy.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

SERVICIOS_TS="${1:-cocina/src/api/servicios.ts}"
COCINAS_TS="${2:-itacate/src/api/cocinas.ts}"
KITCHEN_TS="cocina/src/api/kitchen.ts"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
for f in "$SERVICIOS_TS" "$COCINAS_TS" "$KITCHEN_TS" "$CREDENTIALS_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f (run this from the repository root)"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'as_owner "update servicio.feature_switch set is_on = false where name = '"'"'tarjeta'"'"'" >/dev/null; rm -rf "$SCRATCH"' EXIT

# --- 1. the apps' own claim, read out of their source ----------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
fields_of() { # file interface prefix-regex — a key may be optional (`?:`)
  awk -v want="export interface $2 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\)?\{0,1\}:.*/\1/p" | paste -sd, -
}
# A one-line `export const NAME = ['a', 'b'] as const;`, as a comma list.
list_of() { sed -n "s/^export const $1 = \[\(.*\)\] as const;.*/\1/p" "$2" | head -1 | tr -d "' "; }
nth() { cut -d, -f"$2" <<< "$1"; }

READ="$(const MY_KITCHEN_FEATURES "$SERVICIOS_TS")"
SET="$(const SET_KITCHEN_FEATURES "$SERVICIOS_TS")"
MENU="$(const SEND_MENU_REQUEST "$SERVICIOS_TS")"
READ_ARGS="$(fields_of "$SERVICIOS_TS" FeaturesArgs 'p_')"
SET_ARGS="$(fields_of "$SERVICIOS_TS" SetFeaturesArgs 'p_')"
MENU_ARGS="$(fields_of "$SERVICIOS_TS" MenuRequestArgs 'p_')"
ROW_KEYS="$(fields_of "$SERVICIOS_TS" FeaturesRow '')"
CHOICE_KEYS="$(fields_of "$SERVICIOS_TS" FeatureRow '')"
FEATURES="$(list_of SERVICIOS "$SERVICIOS_TS")"
STATES="$(list_of ESTADOS "$SERVICIOS_TS")"
NOT_OFFERED="$(const NO_SE_OFRECE "$SERVICIOS_TS")"
DOOR="$(const ON_OFFER_NOW "$COCINAS_TS")"
SEEN="$(list_of SERVICIOS_VISTOS "$COCINAS_TS")"
# The key of Itacate's `KitchenRow` whose comment names `0081` — the door's services.
DOOR_KEY="$(awk '/^export interface KitchenRow \{/{f=1;next} f&&/^}/{exit} f' "$COCINAS_TS" | grep -A1 '`0081`' | sed -n 's/^ *readonly \([a-z_]*\):.*/\1/p' | head -1)"
ONBOARD="$(const ONBOARD_WORKSPACE "$KITCHEN_TS")"
ONBOARD_ARGS="$(fields_of "$KITCHEN_TS" OnboardArgs 'p_')"
KIND="$(const COCINA_KIND "$KITCHEN_TS")"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"

for pair in "MY_KITCHEN_FEATURES:$READ" "SET_KITCHEN_FEATURES:$SET" "SEND_MENU_REQUEST:$MENU" "FeaturesArgs:$READ_ARGS" \
            "SetFeaturesArgs:$SET_ARGS" "MenuRequestArgs:$MENU_ARGS" "FeaturesRow:$ROW_KEYS" "FeatureRow:$CHOICE_KEYS" \
            "SERVICIOS:$FEATURES" "ESTADOS:$STATES" "NO_SE_OFRECE:$NOT_OFFERED" "ON_OFFER_NOW:$DOOR" \
            "SERVICIOS_VISTOS:$SEEN" "KitchenRow's 0081 key:$DOOR_KEY" "ONBOARD_WORKSPACE:$ONBOARD" "OnboardArgs:$ONBOARD_ARGS" \
            "COCINA_KIND:$KIND" "FULL_NAME_KEY:$NAME_KEY"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the apps' source"
    echo "      This check asserts the apps' own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
ON="$(nth "$STATES" 1)"; OFF="$(nth "$STATES" 2)"; INTERESTED="$(nth "$STATES" 3)"
CARD="$(nth "$FEATURES" 1)"; MENU_FEATURE="$(nth "$FEATURES" 4)"
ok "read from Wera Cocina: $READ($READ_ARGS), $SET($SET_ARGS), $MENU($MENU_ARGS) → {$ROW_KEYS}, each choice {$CHOICE_KEYS}"
ok "the features $FEATURES, the states $STATES, $NOT_OFFERED for one not offered"
ok "read from Itacate: $DOOR → each kitchen's $DOOR_KEY, the names $SEEN"

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

def answer(a, row_keys):
    """The answer carries exactly the app's keys."""
    if not isinstance(a, dict):
        return 'the answer is %r, not an object' % (a,)
    want = row_keys.split(',')
    gone = [k for k in want if k not in a]
    extra = [k for k in a if k not in want]
    if gone:
        return 'the answer carried no %s' % ', '.join(repr(k) for k in gone)
    if extra:
        return 'the answer carried %s, which the app does not read' % ', '.join(repr(k) for k in extra)
    return None

def choices(a, row_keys, choice_keys, want_csv):
    """Every choice carries the app's keys, and the choices are exactly feature=state as wanted."""
    bad = answer(a, row_keys)
    if bad:
        return bad
    list_key = row_keys.split(',')[0]
    got = {}
    for c in a.get(list_key) or []:
        gone = [k for k in choice_keys.split(',') if k not in c]
        if gone:
            return 'a choice carried no %s: %r' % (', '.join(repr(k) for k in gone), c)
        keys = choice_keys.split(',')
        got[c[keys[0]]] = c[keys[1]]
    want = dict(p.split('=') for p in want_csv.split(',')) if want_csv else {}
    return None if got == want else 'the choices came back %r, not %r' % (got, want)

def code(a, want):
    got = a.get('code') if isinstance(a, dict) else None
    return None if got == want else 'refused with %r — the app reads %r' % (got, want)

def door(a, kitchen, key, want_csv, seen_csv):
    if not isinstance(a, list):
        return 'the door answered %r' % (a,)
    k = next((x for x in a if isinstance(x, dict) and x.get('id') == kitchen), None)
    if k is None:
        return 'her kitchen is not in the door'
    if key not in k:
        return 'her kitchen carried no %r' % key
    got = k[key]
    want = want_csv.split(',') if want_csv else []
    if got != want:
        return 'the door said %r, not %r' % (got, want)
    unknown = [n for n in got if n not in seen_csv.split(',')]
    return 'the door sent %r, which Itacate does not know' % unknown if unknown else None

def count(a, row_keys, want):
    bad = answer(a, row_keys)
    if bad:
        return bad
    got = a.get(row_keys.split(',')[3])
    return None if got == int(want) else 'the count came back %r, not %s' % (got, want)

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

# --- the fonda, made through Wera Cocina's names; a neighbour ----------------
as_owner "update servicio.feature_switch set is_on = false where name = '$CARD'" >/dev/null
RUN="$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')"
NAME="Fonda Contrato $RUN"
FONDA="$(signup "fonda-$RUN@example.invalid" "Fonda $RUN")"
VECINA="$(signup "vecina-$RUN@example.invalid" "Vecina $RUN")"
[[ -n "$FONDA" && -n "$VECINA" ]] || { echo "FAIL: could not sign two accounts up"; exit 1; }
TOKEN="$FONDA"
out="$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" "\"$NAME\"" "\"$KIND\"")")"
A="$(tr -d '"' <<< "$(body "$out")")"
[[ "$A" =~ ^[0-9a-f-]{36}$ ]] || { echo "FAIL: her kitchen could not be made: $(status "$out") $(body "$out" | head -c 200)"; exit 1; }
# A publication of yesterday, written as the database's owner, so the door sends her kitchen.
seen="$(as_owner "insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by, created_at)
  select gen_random_uuid(), l.workspace_id, l.id, now() - interval '1 day', now() - interval '23 hours',
         (select user_id from public.workspace_member where workspace_id = l.workspace_id limit 1), now() - interval '1 day'
    from public.location l where l.workspace_id = '$A' returning 1")"
[[ "$seen" == 1 ]] || fail "could not write a publication for her kitchen ($seen)"
ok "a fonda and her kitchen made through Wera Cocina's names ($ONBOARD), a neighbour signed up"

# --- 2. before she chooses ----------------------------------------------------
out="$(api POST "/rest/v1/rpc/$READ" "$(by_names "$READ_ARGS" "\"$A\"")")"
if [[ "$(status "$out")" == 200 ]]; then body "$out" > "$SCRATCH/r0.json"; check "before she chooses: the app's keys and nothing else, no choice" choices "$SCRATCH/r0.json" "$ROW_KEYS" "$CHOICE_KEYS" ''
else fail "$READ answered $(status "$out"): $(body "$out" | head -c 200)"; fi

# --- 3. every feature the app knows, by the app's names -------------------------
choice="$(python3 -c 'import json,sys; f=sys.argv[1].split(","); print(json.dumps({x: sys.argv[2] for x in f}))' "$FEATURES" "$OFF")"
out="$(api POST "/rest/v1/rpc/$SET" "$(by_names "$SET_ARGS" "\"$A\"" "$choice")")"
if [[ "$(status "$out")" == 200 ]]; then body "$out" > "$SCRATCH/r1.json"
  check "every feature the app knows, sent '$OFF': each comes back, as the app's keys" choices "$SCRATCH/r1.json" "$ROW_KEYS" "$CHOICE_KEYS" \
    "$(tr ',' '\n' <<< "$FEATURES" | sed "s/\$/=$OFF/" | paste -sd, -)"
else fail "$SET answered $(status "$out") for every feature '$OFF': $(body "$out" | head -c 200)"; fi
out="$(api POST "/rest/v1/rpc/$SET" "$(by_names "$SET_ARGS" "\"$A\"" "{\"$MENU_FEATURE\": \"$INTERESTED\"}")")"
if [[ "$(status "$out")" == 200 ]]; then body "$out" > "$SCRATCH/r2.json"
  check "Me interesa: '$MENU_FEATURE' sent '$INTERESTED' is kept so" choices "$SCRATCH/r2.json" "$ROW_KEYS" "$CHOICE_KEYS" \
    "$(tr ',' '\n' <<< "$FEATURES" | sed "s/\$/=$OFF/;s/^$MENU_FEATURE=$OFF\$/$MENU_FEATURE=$INTERESTED/" | paste -sd, -)"
else fail "$SET answered $(status "$out") for '$MENU_FEATURE' '$INTERESTED': $(body "$out" | head -c 200)"; fi

# --- 4. on, while Wera has it switched off --------------------------------------
out="$(api POST "/rest/v1/rpc/$SET" "$(by_names "$SET_ARGS" "\"$A\"" "{\"$CARD\": \"$ON\"}")")"
body "$out" > "$SCRATCH/r3.json"
check "'$CARD' '$ON' while Wera has it switched off: refused with the code the app reads" code "$SCRATCH/r3.json" "$NOT_OFFERED"

# --- 5. switched on: taken, and the door says so as Itacate reads it --------------
as_owner "update servicio.feature_switch set is_on = true where name = '$CARD'" >/dev/null
out="$(api POST "/rest/v1/rpc/$SET" "$(by_names "$SET_ARGS" "\"$A\"" "{\"$CARD\": \"$ON\"}")")"
if [[ "$(status "$out")" == 200 ]]; then body "$out" > "$SCRATCH/r4.json"
  check "switched on, '$CARD' '$ON' is taken" choices "$SCRATCH/r4.json" "$ROW_KEYS" "$CHOICE_KEYS" \
    "$(tr ',' '\n' <<< "$FEATURES" | sed "s/\$/=$OFF/;s/^$MENU_FEATURE=$OFF\$/$MENU_FEATURE=$INTERESTED/;s/^$CARD=$OFF\$/$CARD=$ON/" | paste -sd, -)"
else fail "$SET answered $(status "$out") for '$CARD' '$ON' switched on: $(body "$out" | head -c 200)"; fi
TOKEN="$VECINA"
out="$(api POST "/rest/v1/rpc/$DOOR" '{}')"; body "$out" > "$SCRATCH/door.json"
check "the door, as the neighbour: her kitchen's $DOOR_KEY is ['$CARD'], a name Itacate knows" door "$SCRATCH/door.json" "$A" "$DOOR_KEY" "$CARD" "$SEEN"
TOKEN="$FONDA"

# --- 6. Cuéntanos cómo necesitas tu menú ---------------------------------------
out="$(api POST "/rest/v1/rpc/$MENU" "$(by_names "$MENU_ARGS" "\"$A\"" '"El lunes subo el menú de la semana."')")"
if [[ "$(status "$out")" == 200 ]]; then body "$out" > "$SCRATCH/m.json"; check "what she tells Wera about the menu is taken, the answer counting it" count "$SCRATCH/m.json" "$ROW_KEYS" 1
else fail "$MENU answered $(status "$out"): $(body "$out" | head -c 200)"; fi

# --- 7. signed out --------------------------------------------------------------
TOKEN=""
out="$(api POST "/rest/v1/rpc/$READ" "$(by_names "$READ_ARGS" "\"$A\"")")"
[[ "$(status "$out")" == 401 || "$(status "$out")" == 403 ]] && ok "signed out, what she uses is refused ($(status "$out"))" || fail "signed out, $READ answered $(status "$out")"
out="$(api POST "/rest/v1/rpc/$SET" "$(by_names "$SET_ARGS" "\"$A\"" "{\"$CARD\": \"$OFF\"}")")"
[[ "$(status "$out")" == 401 || "$(status "$out")" == 403 ]] && ok "signed out, no choice is taken ($(status "$out"))" || fail "signed out, $SET answered $(status "$out")"

echo
if (( fails > 0 )); then
  echo "$fails assertion(s) failed."
  exit 1
fi
echo "every assertion held: what her kitchen uses, and the door's word on it, are the names the database answers."

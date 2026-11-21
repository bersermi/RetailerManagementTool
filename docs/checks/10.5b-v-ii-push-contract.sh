#!/usr/bin/env bash
# 10.5b-v-ii-push-contract — does Wera Cocina (and since `10.5c-iii` Itacate) tell the database about
# her phone, read the kinds of message, switch one, count a tap and retire its token by the names the
# database answers?
#
# WHY THIS EXISTS. `cocina/src/api/push.ts` is Wera Cocina's claim about `0092`: five functions,
# their arguments, the app's own name and its one kind, and every key of a kind. PostgREST matches a
# function BY ITS ARGUMENTS' NAMES, so a misspelt `p_` name is a 404 — and on each open the phone's
# token would never reach the database: no fonda would get a message, and nothing on any screen
# would say so (the hook swallows it; *Apartados* shows everything anyway). A misspelt key of a kind
# is a 200 with the switch never drawn and the channel never made — and Android then drops every
# message for that channel without a word. The typecheck, the suites and the bundler pass over each.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF `push.ts`, the fonda's sign-up out of Wera Cocina's own file: nothing
#      retyped.
#   2. Her kinds: a list, each kind by exactly the app's keys, `apartados` among them, on by default.
#   3. Her switch off, by the app's names: answered with her kinds, that one off; and on again.
#   4. This phone's token, by the app's names: stored live for her, with its channels (read as postgres).
#   5. A changed token naming the one it replaces: the old one retired `otro_token`.
#   6. A token that is not Expo's: refused with 22023, as the app's hook would be told.
#   7. A tap counted by the app's names: today's count rose by one, and names nobody.
#   8. Cerrar sesión, by the app's names: the token retired `cerro_sesion`.
#   9. Signed out, nothing is answered.
#
# ⚠️ WHAT IT DOES NOT ASSERT: who gets a message and in what words, the reader of Expo's answers,
# what is forgotten (`supabase/tests/0092_the_first_push.sql`); what the phone does on each open
# (`cocina/test/push.test.ts`); that a message ARRIVES — no check can (ADR-035 §2.11).
# ⚠️ NO MESSAGE IS SENT: nobody reserves here, so nothing is queued for Expo.
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2.
#
# ⚠️ SINCE `10.5c-iii` IT RUNS ON EACH APP'S FILE: `$1` the app's push.ts, `$2` the name of the constant
# holding the kind it switches and taps — Wera Cocina's `APARTADOS` (service), Itacate's `PUBLICO` (the
# bell's, on request, which `0094` lets her switch). The app's own name is read out of the file (`APP`).
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5b-v-ii-push-contract.sh
#       bash docs/checks/10.5b-v-ii-push-contract.sh itacate/src/api/push.ts PUBLICO
# With: $1 an app's push.ts (Wera Cocina's by default) — how the falsifier points it at a broken copy;
#       $2 the constant naming its kind (APARTADOS by default).
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

PUSH_TS="${1:-cocina/src/api/push.ts}"
KIND_CONST="${2:-APARTADOS}"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
for f in "$PUSH_TS" "$CREDENTIALS_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f (run this from the repository root)"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
cat > "$SCRATCH/kinds.py" <<'PY'
import json, sys
want = sorted(sys.argv[1].split(",")); kind = sys.argv[2]
d = json.load(sys.stdin)
if not isinstance(d, list) or not d:
    print("the answer was not a list of kinds"); sys.exit()
for k in d:
    got = sorted(k.keys())
    if got != want:
        missing = [x for x in want if x not in got]; extra = [x for x in got if x not in want]
        print(f"a kind carried no {missing[0]!r}" if missing else f"a kind carried a key the app does not read: {extra[0]!r}"); sys.exit()
row = [k for k in d if k.get("kind") == kind]
if not row: print(f"no kind {kind!r} among {[k.get('kind') for k in d]}"); sys.exit()
if row[0].get("is_on") is not True: print(f"{kind!r} was not on by default"); sys.exit()
print("ok")
PY

# --- 1. the app's own claim, read out of its source -------------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
fields_of() { # file interface prefix-regex — a key may be optional (`?:`)
  awk -v want="export interface $2 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\)?\{0,1\}:.*/\1/p" | paste -sd, -
}

REGISTER="$(const REGISTER_PUSH_TOKEN "$PUSH_TS")"
RETIRE="$(const RETIRE_PUSH_TOKEN "$PUSH_TS")"
KINDS="$(const MY_NOTIFICATION_KINDS "$PUSH_TS")"
SWITCH="$(const SET_NOTIFICATION_SWITCH "$PUSH_TS")"
TAP="$(const COUNT_NOTIFICATION_TAP "$PUSH_TS")"
APP="$(const APP "$PUSH_TS")"
KIND="$(const "$KIND_CONST" "$PUSH_TS")"
REGISTER_ARGS="$(fields_of "$PUSH_TS" RegisterArgs 'p_')"
RETIRE_ARGS="$(fields_of "$PUSH_TS" RetireArgs 'p_')"
KINDS_ARGS="$(fields_of "$PUSH_TS" KindsArgs 'p_')"
SWITCH_ARGS="$(fields_of "$PUSH_TS" SwitchArgs 'p_')"
TAP_ARGS="$(fields_of "$PUSH_TS" TapArgs 'p_')"
KIND_KEYS="$(fields_of "$PUSH_TS" KindRow '')"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"

for pair in "REGISTER_PUSH_TOKEN:$REGISTER" "RETIRE_PUSH_TOKEN:$RETIRE" "MY_NOTIFICATION_KINDS:$KINDS" \
            "SET_NOTIFICATION_SWITCH:$SWITCH" "COUNT_NOTIFICATION_TAP:$TAP" "APP:$APP" "$KIND_CONST:$KIND" \
            "RegisterArgs:$REGISTER_ARGS" "RetireArgs:$RETIRE_ARGS" "KindsArgs:$KINDS_ARGS" \
            "SwitchArgs:$SWITCH_ARGS" "TapArgs:$TAP_ARGS" "KindRow:$KIND_KEYS" "FULL_NAME_KEY:$NAME_KEY"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the app's source"
    echo "      This check asserts the app's own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
ok "read from $PUSH_TS: $REGISTER($REGISTER_ARGS), $RETIRE($RETIRE_ARGS), $KINDS($KINDS_ARGS) → [{$KIND_KEYS}], $SWITCH($SWITCH_ARGS), $TAP($TAP_ARGS); app '$APP', kind '$KIND'"

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
as_postgres() { supabase db query --local -o csv "$1" 2>/dev/null | tail -1; }
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

STAMP="$(date +%s)$RANDOM"
TOKEN="$(signup "push.$STAMP@example.mx" "Fonda Push")"
[[ -n "$TOKEN" ]] || { echo "FAIL: GoTrue gave no session for the fonda"; exit 1; }
FONDA_TOKEN="$TOKEN"
USER_ID="$(python3 -c 'import sys,json,base64; p=sys.argv[1].split(".")[1]; p+="="*(-len(p)%4); print(json.loads(base64.urlsafe_b64decode(p))["sub"])' "$TOKEN")"

PHONE1="ExponentPushToken[contract-$STAMP-a]"
PHONE2="ExponentPushToken[contract-$STAMP-b]"
J() { python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"; }

# --- 2. her kinds ----------------------------------------------------------
out="$(api POST "/rest/v1/rpc/$KINDS" "$(by_names "$KINDS_ARGS" "$(J "$APP")")")"
if [[ "$(status "$out")" != 200 ]]; then
  fail "$KINDS answered $(status "$out"): $(body "$out" | head -c 300)"
else
  verdict="$(python3 "$SCRATCH/kinds.py" "$KIND_KEYS" "$KIND" <<< "$(body "$out")")"
  [[ "$verdict" == ok ]] && ok "$KINDS: each kind by exactly {$KIND_KEYS}; '$KIND' on by default" || fail "$verdict"
fi

# --- 3. her switch ---------------------------------------------------------
out="$(api POST "/rest/v1/rpc/$SWITCH" "$(by_names "$SWITCH_ARGS" "$(J "$KIND")" false)")"
if [[ "$(status "$out")" != 200 ]]; then
  fail "$SWITCH answered $(status "$out"): $(body "$out" | head -c 300)"
else
  verdict="$(python3 -c '
import json,sys
d=json.load(sys.stdin); kind=sys.argv[1]
row=[k for k in d if isinstance(k,dict) and k.get("kind")==kind] if isinstance(d,list) else []
print("ok" if row and row[0].get("is_on") is False else "the answer did not hold the switch off")' "$KIND" <<< "$(body "$out")")"
  [[ "$verdict" == ok ]] && ok "$SWITCH off: answered with her kinds, '$KIND' off" || fail "$verdict"
  stored="$(as_postgres "select is_on from servicio.notification_switch where user_id = '$USER_ID' and kind = '$KIND'")"
  [[ "$stored" == false ]] && ok "kept for her, as postgres reads it" || fail "her switch was not kept off (read: '$stored')"
  out="$(api POST "/rest/v1/rpc/$SWITCH" "$(by_names "$SWITCH_ARGS" "$(J "$KIND")" true)")"
  [[ "$(status "$out")" == 200 ]] && ok "and on again" || fail "$SWITCH on answered $(status "$out")"
fi

# --- 4. this phone's token --------------------------------------------------
out="$(api POST "/rest/v1/rpc/$REGISTER" "$(by_names "$REGISTER_ARGS" "$(J "$APP")" "$(J "$PHONE1")" '"android"' true '["apartados","recordatorio"]' '[]' null)")"
case "$(status "$out")" in
  200|204)
    live="$(as_postgres "select retired_at is null and allowed and channels = '{apartados,recordatorio}' and user_id = '$USER_ID' from servicio.push_token where token = '$PHONE1'")"
    [[ "$live" == true ]] && ok "$REGISTER: stored live for her, with its channels" || fail "the token was not stored live with its channels (read: '$live')" ;;
  *) fail "$REGISTER answered $(status "$out"): $(body "$out" | head -c 300)" ;;
esac

# --- 5. a changed token -----------------------------------------------------
out="$(api POST "/rest/v1/rpc/$REGISTER" "$(by_names "$REGISTER_ARGS" "$(J "$APP")" "$(J "$PHONE2")" '"android"' true '["apartados"]' '[]' "$(J "$PHONE1")")")"
case "$(status "$out")" in
  200|204)
    old="$(as_postgres "select retired_why from servicio.push_token where token = '$PHONE1'")"
    new="$(as_postgres "select count(*) from servicio.push_token where token = '$PHONE2' and retired_at is null")"
    [[ "$old" == otro_token && "$new" == 1 ]] && ok "a changed token retires the one it names (otro_token)" \
      || fail "the replaced token read '$old', the new one live $new time(s)" ;;
  *) fail "$REGISTER with a replaced token answered $(status "$out"): $(body "$out" | head -c 300)" ;;
esac

# --- 6. refused ------------------------------------------------------------
out="$(api POST "/rest/v1/rpc/$REGISTER" "$(by_names "$REGISTER_ARGS" "$(J "$APP")" '"not-a-token"' '"android"' true '[]' '[]' null)")"
code="$(pick code "$(body "$out")")"
[[ "$(status "$out")" == 400 && "$code" == 22023 ]] && ok "a token that is not Expo's: 400, 22023" \
  || fail "a token that is not Expo's answered $(status "$out") $code"

# --- 7. a tap --------------------------------------------------------------
before="$(as_postgres "select coalesce((select taps from servicio.notification_tap_count where kind = '$KIND' and day = (now() at time zone 'America/Mexico_City')::date), 0)")"
out="$(api POST "/rest/v1/rpc/$TAP" "$(by_names "$TAP_ARGS" "$(J "$KIND")")")"
after="$(as_postgres "select coalesce((select taps from servicio.notification_tap_count where kind = '$KIND' and day = (now() at time zone 'America/Mexico_City')::date), 0)")"
case "$(status "$out")" in
  200|204) [[ "$after" == "$((before + 1))" ]] && ok "$TAP: today's count $before → $after, nobody kept" || fail "a tap moved today's count $before → $after" ;;
  *) fail "$TAP answered $(status "$out"): $(body "$out" | head -c 300)" ;;
esac

# --- 8. Cerrar sesión -------------------------------------------------------
out="$(api POST "/rest/v1/rpc/$RETIRE" "$(by_names "$RETIRE_ARGS" "$(J "$APP")" "$(J "$PHONE2")")")"
case "$(status "$out")" in
  200|204)
    why="$(as_postgres "select retired_why from servicio.push_token where token = '$PHONE2'")"
    [[ "$why" == cerro_sesion ]] && ok "$RETIRE: the token retired cerro_sesion" || fail "the token read '$why' after Cerrar sesión" ;;
  *) fail "$RETIRE answered $(status "$out"): $(body "$out" | head -c 300)" ;;
esac

# --- 9. signed out ---------------------------------------------------------
TOKEN=""
out="$(api POST "/rest/v1/rpc/$KINDS" "$(by_names "$KINDS_ARGS" "$(J "$APP")")")"
[[ "$(status "$out")" == 401 ]] && ok "signed out: $KINDS answers 401" || fail "signed out, $KINDS answered $(status "$out")"
TOKEN="$FONDA_TOKEN"

echo
if (( fails > 0 )); then
  echo "$fails assertion(s) failed: $PUSH_TS does not describe 0092 as applied."
  exit 1
fi
echo "every assertion holds — $PUSH_TS ('$APP') names 0092's five doors as the database answers them."

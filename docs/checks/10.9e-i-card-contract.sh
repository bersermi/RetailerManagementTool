#!/usr/bin/env bash
# 10.9e-i-card-contract — does Wera Cocina set up its loyalty card, hand a phone its code, read a
# neighbour's card from her code, stamp it and give her a reward by the names the database
# answers? And does Itacate hand her phone its code, stamp it and claim a reward by its names, and
# read her cards?
#
# WHY THIS EXISTS. `cocina/src/api/tarjeta.ts` is Wera Cocina's claim about `0085`: seven
# functions, their arguments, every key of their answers, the refusals it reads. `itacate/src/api/
# tarjeta.ts` is Itacate's: five. PostgREST matches a function BY ITS ARGUMENTS' NAMES, so a
# misspelt `p_` name is a 404; a misspelt key of an answer is a 200 with her card drawn empty, a
# reward never offered, a stamp the screen calls a failure. The typecheck, the suites and the
# bundler all pass over each one. (A kitchen's terms before her first stamp reach her through the
# door's `card`: `10.5-iv-a-door-contract.sh` holds every key of the door to Itacate's `KitchenRow`.)
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF those two files, the fonda's setup out of Wera Cocina's own files:
#      nothing retyped.
#   2. *Activar*, by Wera Cocina's names: the card's answer carries exactly the app's keys, and its
#      terms too.
#   3. Each phone handed its key and secret, by each app's names: exactly the app's keys.
#   5. She scans the kitchen's code — worked out here from the secret, as her phone works it out —
#      by Itacate's names: her first stamp, exactly the app's keys.
#   6. The kitchen scans hers, by Wera Cocina's names: her name and card, exactly the app's keys.
#   7. Three past days arrive from the kitchen's queue, each with its moment and that moment's code:
#      the fourth stamp wins. Then her cards, by Itacate's names: exactly the app's keys at each
#      level, her reward listed.
#   8. She claims it by scanning the kitchen's code, by Itacate's names: exactly the app's keys.
#   9. The kitchen's counts and today's lines, by Wera Cocina's names: exactly the app's keys.
#  10. Refused with the code the apps read: a reward that is not hers, from either phone.
#  11. *Cerrar la tarjeta*, by Wera Cocina's names: closed.
#  12. Signed out, nothing is answered.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the database's own rules (`supabase/tests/0085_…`: one a day, new
# terms for new cards, the days, closing, guessing, who leaves, the deletions), or what a screen
# does with an answer (`cocina/test/tarjeta.test.ts`, `itacate/test/tarjeta.test.ts`), or that the
# phones' own code agrees with the database's (`cocina/test/codigo.test.ts`, both held to the RFCs).
#
# ⚠️ IT TURNS WERA'S SWITCH FOR THE CARD ON for its run, as the database's owner (`supabase db
# query --local`), and off again on its way out, as `10.9a-i`'s check does. ⚠️ IT DELETES THE
# KITCHEN IT MADE as its owner (`delete_my_business`, `0077`). ⚠️ NO `mapfile`, NO `declare -A`:
# macOS ships bash 3.2. ⚠️ TWO ACCOUNTS A RUN: GoTrue allows 30 sign-ups in 5 minutes, and the
# falsifier runs this a dozen times.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9e-i-card-contract.sh
# With: $1 Wera Cocina's tarjeta.ts, $2 Itacate's tarjeta.ts — how the falsifier points it at a
#       broken copy.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

COCINA_TS="${1:-cocina/src/api/tarjeta.ts}"
ITACATE_TS="${2:-itacate/src/api/tarjeta.ts}"
KITCHEN_TS="cocina/src/api/kitchen.ts"
ACCOUNT_TS="cocina/src/api/account.ts"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
for f in "$COCINA_TS" "$ITACATE_TS" "$KITCHEN_TS" "$ACCOUNT_TS" "$CREDENTIALS_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f (run this from the repository root)"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
as_owner() { supabase db query --local -o csv "$1" 2>/dev/null | tail -1; }
trap 'as_owner "update servicio.feature_switch set is_on = false where name = '"'"'tarjeta'"'"'" >/dev/null; rm -rf "$SCRATCH"' EXIT

# --- 1. the apps' own claim, read out of their source ----------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
fields_of() { # file interface prefix-regex — a key may be optional (`?:`); an interface may extend another
  awk -v want="$2" '
    $0 ~ "^export interface " want "( extends [A-Za-z]+)? [{]$" { f=1; next }
    f && /^}/ { exit }
    f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\)?\{0,1\}:.*/\1/p" | paste -sd, -
}

C_TERMS="$(const SET_CARD_TERMS "$COCINA_TS")"
C_CLOSE="$(const CLOSE_CARD "$COCINA_TS")"
C_CARD="$(const KITCHEN_CARD "$COCINA_TS")"
C_KEY="$(const REGISTER_KITCHEN_KEY "$COCINA_TS")"
C_OF_CODE="$(const CARD_OF_CODE "$COCINA_TS")"
C_STAMP="$(const GIVE_STAMP "$COCINA_TS")"
C_REWARD="$(const GIVE_REWARD "$COCINA_TS")"
C_NOT_HERS="$(const NO_ES_SU_PREMIO "$COCINA_TS")"
C_TERMS_ARGS="$(fields_of "$COCINA_TS" TermsArgs 'p_')"
C_KITCHEN_ARGS="$(fields_of "$COCINA_TS" KitchenArgs 'p_')"
C_CODE_ARGS="$(fields_of "$COCINA_TS" CodeArgs 'p_')"
C_STAMP_ARGS="$(fields_of "$COCINA_TS" StampArgs 'p_')"
C_REWARD_ARGS="$(fields_of "$COCINA_TS" RewardArgs 'p_')"
C_CARD_KEYS="$(fields_of "$COCINA_TS" KitchenCardRow '')"
C_TERMS_KEYS="$(fields_of "$COCINA_TS" TermsRow '')"
C_TODAY_KEYS="$(fields_of "$COCINA_TS" TodayRow '')"
C_KEY_KEYS="$(fields_of "$COCINA_TS" KeyRow '')"
C_SCAN_KEYS="$(fields_of "$COCINA_TS" CardRow '')"
C_REWARD_KEYS="$(fields_of "$COCINA_TS" RewardRow '')"

I_KEY="$(const REGISTER_MY_KEY "$ITACATE_TS")"
I_CARDS="$(const MY_CARDS "$ITACATE_TS")"
I_STAMP="$(const STAMP_WITH_CODE "$ITACATE_TS")"
I_CLAIM="$(const CLAIM_WITH_CODE "$ITACATE_TS")"
I_NOT_HERS="$(const NO_ES_TU_PREMIO "$ITACATE_TS")"
I_STAMP_ARGS="$(fields_of "$ITACATE_TS" StampWithCodeArgs 'p_')"
I_CLAIM_ARGS="$(fields_of "$ITACATE_TS" ClaimWithCodeArgs 'p_')"
I_KEY_KEYS="$(fields_of "$ITACATE_TS" KeyRow '')"
I_STATE_KEYS="$(fields_of "$ITACATE_TS" CardStateRow '')"
I_MINE_KEYS="$(fields_of "$ITACATE_TS" MyCardRow '')"
I_REWARD_KEYS="$(fields_of "$ITACATE_TS" RewardRow '')"
I_SCAN_KEYS="$(fields_of "$ITACATE_TS" ScanRow '')"

ONBOARD="$(const ONBOARD_WORKSPACE "$KITCHEN_TS")"
ONBOARD_ARGS="$(fields_of "$KITCHEN_TS" OnboardArgs 'p_')"
KIND="$(const COCINA_KIND "$KITCHEN_TS")"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"
DELETE="$(const DELETE_MY_BUSINESS "$ACCOUNT_TS")"
DELETE_ARGS="$(fields_of "$ACCOUNT_TS" DeleteBusinessArgs 'p_')"

for pair in "SET_CARD_TERMS:$C_TERMS" "CLOSE_CARD:$C_CLOSE" "KITCHEN_CARD:$C_CARD" "REGISTER_KITCHEN_KEY:$C_KEY" \
            "CARD_OF_CODE:$C_OF_CODE" "GIVE_STAMP:$C_STAMP" "GIVE_REWARD:$C_REWARD" "NO_ES_SU_PREMIO:$C_NOT_HERS" \
            "TermsArgs:$C_TERMS_ARGS" "KitchenArgs:$C_KITCHEN_ARGS" "CodeArgs:$C_CODE_ARGS" "StampArgs:$C_STAMP_ARGS" \
            "RewardArgs:$C_REWARD_ARGS" "KitchenCardRow:$C_CARD_KEYS" "TermsRow:$C_TERMS_KEYS" "TodayRow:$C_TODAY_KEYS" \
            "KeyRow (Cocina):$C_KEY_KEYS" "CardRow:$C_SCAN_KEYS" "RewardRow (Cocina):$C_REWARD_KEYS" \
            "REGISTER_MY_KEY:$I_KEY" "MY_CARDS:$I_CARDS" "STAMP_WITH_CODE:$I_STAMP" \
            "CLAIM_WITH_CODE:$I_CLAIM" "NO_ES_TU_PREMIO:$I_NOT_HERS" \
            "StampWithCodeArgs:$I_STAMP_ARGS" "ClaimWithCodeArgs:$I_CLAIM_ARGS" "KeyRow (Itacate):$I_KEY_KEYS" \
            "CardStateRow:$I_STATE_KEYS" "MyCardRow:$I_MINE_KEYS" "RewardRow (Itacate):$I_REWARD_KEYS" \
            "ScanRow:$I_SCAN_KEYS" "ONBOARD_WORKSPACE:$ONBOARD" "OnboardArgs:$ONBOARD_ARGS" \
            "COCINA_KIND:$KIND" "FULL_NAME_KEY:$NAME_KEY" "DELETE_MY_BUSINESS:$DELETE" "DeleteBusinessArgs:$DELETE_ARGS"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the apps' source"
    echo "      This check asserts the apps' own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
# The keys a raw answer carries, by the apps' own names: Itacate's scan is its result and kitchen
# (ScanRow's first two) and, for a claim, what was claimed (its third), beside her card's keys; her
# cards are the kitchen's keys (MyCardRow's own) beside her card's. Wera Cocina's scan is CardRow.
IFS=, read -r S_RESULT S_KITCHEN S_CLAIMED _ <<< "$I_SCAN_KEYS"
I_STAMPED_KEYS="$S_RESULT,$S_KITCHEN,$I_STATE_KEYS"
I_CLAIMED_KEYS="$S_RESULT,$S_KITCHEN,$S_CLAIMED,$I_STATE_KEYS"
I_MINE_ALL_KEYS="$I_MINE_KEYS,$I_STATE_KEYS"
C_SEEN_KEYS="$(tr , '\n' <<< "$C_SCAN_KEYS" | grep -vx claimed | paste -sd, -)"
ok "read from Wera Cocina: $C_TERMS($C_TERMS_ARGS), $C_CLOSE, $C_CARD → {$C_CARD_KEYS}, $C_KEY → {$C_KEY_KEYS}, $C_OF_CODE($C_CODE_ARGS), $C_STAMP($C_STAMP_ARGS), $C_REWARD($C_REWARD_ARGS) → {$C_SCAN_KEYS}"
ok "read from Itacate: $I_KEY → {$I_KEY_KEYS}, $I_CARDS → {$I_MINE_ALL_KEYS}, $I_STAMP($I_STAMP_ARGS), $I_CLAIM($I_CLAIM_ARGS) → {$I_CLAIMED_KEYS}"

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
# A phone's code at a moment (unix seconds), worked out here as RFC 4226 says — independently of
# both apps' code and of the database's.
code_at() { # secret-hex unix-seconds -> six digits
  python3 -c '
import hashlib, hmac, struct, sys
mac = hmac.new(bytes.fromhex(sys.argv[1]), struct.pack(">Q", int(sys.argv[2]) // 60), hashlib.sha1).digest()
o = mac[19] & 15
print("%06d" % ((struct.unpack(">I", mac[o:o + 4])[0] & 0x7fffffff) % 1000000))' "$1" "$2"
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

def card(a, keys, terms_keys, today_keys, open_, cards, stamps_today, rewards):
    """kitchen_card: exactly the app's keys; its terms, its lines too."""
    bad = exactly(a, keys, 'the card')
    if bad:
        return bad
    if a.get('terms') is not None:
        bad = exactly(a['terms'], terms_keys, 'its terms')
        if bad:
            return bad
    for line in a.get('today') or []:
        bad = exactly(line, today_keys, "a line of today's")
        if bad:
            return bad
    got = (a.get('open'), a.get('cards'), a.get('stamps_today'), a.get('rewards_to_give'))
    want = (open_ == 'true', int(cards), int(stamps_today), int(rewards))
    return None if got == want else 'the card says open, cards, stamps today, rewards = %r, not %r' % (got, want)

def key(a, keys):
    bad = exactly(a, keys, 'the key')
    if bad:
        return bad
    s = a.get('secret')
    return None if isinstance(s, str) and len(s) == 40 else 'the secret is %r, not 40 hex characters' % (s,)

def scan(a, keys, result, stamps):
    """A scan's answer: exactly the app's keys, the result and her count wanted."""
    bad = exactly(a, keys, 'the answer')
    if bad:
        return bad
    got = (a.get('result'), a.get('stamps'))
    return None if got == (result, int(stamps)) else 'the scan came back %r, not %r' % (got, (result, int(stamps)))

def mine(a, keys, reward_keys, kitchen, rewards):
    """Her cards: one kitchen, exactly the app's keys, her rewards by the app's keys."""
    if not isinstance(a, list) or len(a) != 1:
        return 'her cards were %r, not her one kitchen' % (a,)
    bad = exactly(a[0], keys, 'her card')
    if bad:
        return bad
    if a[0].get('id') != kitchen:
        return 'the kitchen listed is %r, not hers' % a[0].get('id')
    rs = a[0].get('rewards')
    if not isinstance(rs, list) or len(rs) != int(rewards):
        return 'her rewards were %r, not %s' % (rs, rewards)
    for r in rs:
        bad = exactly(r, reward_keys, 'a reward')
        if bad:
            return bad
    return None

def first_reward(a):
    try:
        return a[0]['rewards'][0]['id']
    except Exception:
        return ''

def code(a, want):
    got = a.get('code') if isinstance(a, dict) else None
    return None if got == want else 'refused with %r — the app reads %r' % (got, want)

def closed(a):
    return None if isinstance(a, dict) and a.get('open') is False and a.get('closed_at') else 'the card came back %r' % (a,)

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
# A call whose answer is checked: a non-200 is a failure that names the function and its status.
call() { # file function body
  local out; out="$(api POST "/rest/v1/rpc/$2" "$3")"
  body "$out" > "$SCRATCH/$1.json"
  if [[ "$(status "$out")" != 200 ]]; then fail "$2 answered $(status "$out"): $(body "$out" | head -c 200)"; return 1; fi
}
iso_ago() { python3 -c 'import datetime,sys; print((datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=int(sys.argv[1]))).isoformat())' "$1"; }
unix_of() { python3 -c 'import datetime,sys; print(int(datetime.datetime.fromisoformat(sys.argv[1]).timestamp()))' "$1"; }

# --- Wera's switch, the fonda and her kitchen through Wera Cocina's names, a neighbour --------
[[ "$(as_owner "update servicio.feature_switch set is_on = true where name = 'tarjeta' returning is_on")" == t* ]] \
  || { echo "FAIL: could not turn Wera's switch for the card on, as the database's owner"; exit 1; }
RUN="$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')"
NAME="Fonda Sellada $RUN"
FONDA="$(signup "fonda-$RUN@example.invalid" "Fonda $RUN")"
VECINA="$(signup "vecina-$RUN@example.invalid" "Vecina Ruiz $RUN")"
[[ -n "$FONDA" && -n "$VECINA" ]] || { echo "FAIL: could not sign two accounts up"; exit 1; }
TOKEN="$FONDA"
out="$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" "\"$NAME\"" "\"$KIND\"")")"
A="$(tr -d '"' <<< "$(body "$out")")"
[[ "$A" =~ ^[0-9a-f-]{36}$ ]] || { echo "FAIL: her kitchen could not be made: $(status "$out") $(body "$out" | head -c 200)"; exit 1; }
ok "Wera's switch on for this run; a fonda and her kitchen made through Wera Cocina's names ($ONBOARD), a neighbour signed up"

# --- 2. Activar --------------------------------------------------------------------------------
if call t1 "$C_TERMS" "$(by_names "$C_TERMS_ARGS" "\"$A\"" '"Un agua fresca"' 4 0)"; then
  check "Activar by Wera Cocina's names: the app's keys, its terms' keys, open, nothing yet" card "$SCRATCH/t1.json" "$C_CARD_KEYS" "$C_TERMS_KEYS" "$C_TODAY_KEYS" true 0 0 0
fi

# --- 3. each phone's key ---------------------------------------------------------------------
KSECRET=""; KKEY=""; VSECRET=""; VKEY=""
if call k1 "$C_KEY" "$(by_names "$C_KITCHEN_ARGS" "\"$A\"")"; then
  check "the kitchen's phone handed its key by Wera Cocina's names: the app's keys, 40 hex characters" key "$SCRATCH/k1.json" "$C_KEY_KEYS"
  KSECRET="$(pick secret "$(cat "$SCRATCH/k1.json")")"; KKEY="$(pick key "$(cat "$SCRATCH/k1.json")")"
fi
TOKEN="$VECINA"
if call k2 "$I_KEY" '{}'; then
  check "her phone handed its key by Itacate's names: the app's keys, 40 hex characters" key "$SCRATCH/k2.json" "$I_KEY_KEYS"
  VSECRET="$(pick secret "$(cat "$SCRATCH/k2.json")")"; VKEY="$(pick key "$(cat "$SCRATCH/k2.json")")"
fi
[[ -n "$KSECRET" && -n "$VSECRET" ]] || { echo "FAIL: without both phones' secrets nothing can be scanned"; exit 1; }

# --- 5. she scans the kitchen's code ---------------------------------------------------------
KCODE="$(code_at "$KSECRET" "$(date +%s)")"
if call s1 "$I_STAMP" "$(by_names "$I_STAMP_ARGS" "\"$KCODE\"" "\"$A\"" "\"$KKEY\"")"; then
  check "she scans the kitchen's code, by Itacate's names: her first stamp, the app's keys" scan "$SCRATCH/s1.json" "$I_STAMPED_KEYS" primer 1
fi

# --- 6. the kitchen scans hers ---------------------------------------------------------------
TOKEN="$FONDA"
VCODE="$(code_at "$VSECRET" "$(date +%s)")"
if call c1 "$C_OF_CODE" "$(by_names "$C_CODE_ARGS" "\"$A\"" "\"$VCODE\"" "\"$VKEY\"")"; then
  check "the kitchen scans her code, by Wera Cocina's names: her name and card, the app's keys" scan "$SCRATCH/c1.json" "$C_SEEN_KEYS" suya 1
fi

# --- 7. three past days from the kitchen's queue; the fourth stamp wins ------------------------
for d in 1 2 3; do
  AT="$(iso_ago "$d")"
  CODE_THEN="$(code_at "$VSECRET" "$(unix_of "$AT")")"
  want=sello; (( d == 3 )) && want=gano
  n=$((d + 1)); (( d == 3 )) && n=0
  if call g$d "$C_STAMP" "$(by_names "$C_STAMP_ARGS" "\"$A\"" "\"$CODE_THEN\"" null "\"$AT\"")"; then
    check "a stamp $d day(s) back, from the queue with its moment, by Wera Cocina's names: $want, the app's keys" scan "$SCRATCH/g$d.json" "$C_SEEN_KEYS" "$want" "$n"
  fi
done
TOKEN="$VECINA"
RID=""
if call m1 "$I_CARDS" '{}'; then
  check "her cards, by Itacate's names: the app's keys at each level, her one reward" mine "$SCRATCH/m1.json" "$I_MINE_ALL_KEYS" "$I_REWARD_KEYS" "$A" 1
  RID="$(python3 "$SCRATCH/v.py" first_reward "$SCRATCH/m1.json")"
fi

# --- 8. she claims it by scanning the kitchen's code ---------------------------------------------
KCODE="$(code_at "$KSECRET" "$(date +%s)")"
if [[ -n "$RID" ]] && call r1 "$I_CLAIM" "$(by_names "$I_CLAIM_ARGS" "\"$RID\"" "\"$KCODE\"" "\"$KKEY\"")"; then
  check "she claims her reward by scanning the kitchen's code, by Itacate's names: the app's keys" scan "$SCRATCH/r1.json" "$I_CLAIMED_KEYS" cobrado 0
fi

# --- 9. the kitchen's counts and today's lines -----------------------------------------------------
TOKEN="$FONDA"
if call t2 "$C_CARD" "$(by_names "$C_KITCHEN_ARGS" "\"$A\"")"; then
  check "the kitchen's card by Wera Cocina's names: the app's keys, today's lines too; no card going, her stamp today, nothing to give" card "$SCRATCH/t2.json" "$C_CARD_KEYS" "$C_TERMS_KEYS" "$C_TODAY_KEYS" true 0 1 0
fi

# --- 10. refused with the codes the apps read --------------------------------------------------------
VCODE="$(code_at "$VSECRET" "$(date +%s)")"
out="$(api POST "/rest/v1/rpc/$C_REWARD" "$(by_names "$C_REWARD_ARGS" "\"$A\"" "\"$VCODE\"" '"00000000-0000-4000-8000-000000000000"' null null)")"
body "$out" > "$SCRATCH/x1.json"
check "a reward that is not hers: refused with the code Wera Cocina reads" code "$SCRATCH/x1.json" "$C_NOT_HERS"
TOKEN="$VECINA"
KCODE="$(code_at "$KSECRET" "$(date +%s)")"
out="$(api POST "/rest/v1/rpc/$I_CLAIM" "$(by_names "$I_CLAIM_ARGS" '"00000000-0000-4000-8000-000000000000"' "\"$KCODE\"" null)")"
body "$out" > "$SCRATCH/x2.json"
check "a reward that is not hers, claimed from her phone: refused with the code Itacate reads" code "$SCRATCH/x2.json" "$I_NOT_HERS"

# --- 11. Cerrar la tarjeta ----------------------------------------------------------------------------
TOKEN="$FONDA"
if call z1 "$C_CLOSE" "$(by_names "$C_KITCHEN_ARGS" "\"$A\"")"; then
  check "Cerrar la tarjeta by Wera Cocina's names: closed" closed "$SCRATCH/z1.json"
fi
out="$(api POST "/rest/v1/rpc/$DELETE" "$(by_names "$DELETE_ARGS" "\"$A\"" "\"$NAME\"")")"
[[ "$(status "$out")" == 200 ]] && ok "her kitchen deleted alone through Wera Cocina's names ($DELETE)" || fail "could not delete her kitchen: $DELETE answered $(status "$out") $(body "$out" | head -c 200)"

# --- 12. signed out --------------------------------------------------------------------------------
TOKEN=""
for fn in "$I_CARDS:{}" "$I_KEY:{}" "$C_CARD:$(by_names "$C_KITCHEN_ARGS" "\"$A\"")" \
          "$I_STAMP:$(by_names "$I_STAMP_ARGS" '"123456"' null null)"; do
  out="$(api POST "/rest/v1/rpc/${fn%%:*}" "${fn#*:}")"
  [[ "$(status "$out")" == 401 || "$(status "$out")" == 403 ]] && ok "signed out, ${fn%%:*} is refused ($(status "$out"))" || fail "signed out, ${fn%%:*} answered $(status "$out")"
done

echo
if (( fails > 0 )); then
  echo "$fails assertion(s) failed."
  exit 1
fi
echo "every assertion held: the card's setup, both phones' codes, a stamp each way, a reward won and claimed, and the kitchen's counts are the names the database answers."

#!/usr/bin/env bash
# 10.9d-i-following-contract — does Itacate follow a kitchen, ring its bell and read the kitchens
# she follows by the names the database answers? And does Wera Cocina read how many follow her
# kitchen by its names?
#
# WHY THIS EXISTS. `itacate/src/api/siguiendo.ts` is Itacate's claim about `0084`: two functions,
# their arguments, every key of their answers, and the refusal it reads as *not a kitchen in
# Itacate*. `cocina/src/api/seguidores.ts` is Wera Cocina's: one function and its argument.
# PostgREST matches a function BY ITS ARGUMENTS' NAMES, so a misspelt `p_` name is a 404; a
# misspelt key of an answer is a 200 with her list drawn empty, her switch drawn off, or a
# kitchen that left never said. The typecheck, the suites and the bundler all pass over each one.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF those two files, the fonda's setup out of Wera Cocina's own files:
#      nothing retyped.
#   2. *Seguir*, by Itacate's names: the answer carries exactly the app's keys — following, the
#      bell off; then the bell alone, following kept.
#   3. Her list: exactly the app's keys, at each level — the kitchen she follows, nothing gone.
#   4. *Te siguen N*, by Wera Cocina's names, asked as the fonda: 1.
#   5. Not a kitchen in Itacate: refused with the code the app reads.
#   6. The kitchen deleted by its owner, through Wera Cocina's names: her list says it left, by
#      the app's keys, with its name.
#   7. Signed out, nothing is answered.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the database's own rules (`supabase/tests/0084_…`: whose rows, what
# is refused, both switches off, the 30 days, the deletions), or what a screen does with an
# answer (`itacate/test/siguiendo.test.ts`, `cocina/test/seguidores.test.ts`).
#
# ⚠️ IT DELETES THE KITCHEN IT MADE as its owner, by `delete_my_business` (`0077`) — the trigger is
# the same for every path. ⚠️ NO `mapfile`, NO `declare -A`: macOS
# ships bash 3.2. ⚠️ TWO ACCOUNTS A RUN: GoTrue allows 30 sign-ups in 5 minutes, and the falsifier
# runs this a dozen times.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9d-i-following-contract.sh
# With: $1 Itacate's siguiendo.ts, $2 Wera Cocina's seguidores.ts — how the falsifier points it at
#       a broken copy.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

SIGUIENDO_TS="${1:-itacate/src/api/siguiendo.ts}"
SEGUIDORES_TS="${2:-cocina/src/api/seguidores.ts}"
KITCHEN_TS="cocina/src/api/kitchen.ts"
ACCOUNT_TS="cocina/src/api/account.ts"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
for f in "$SIGUIENDO_TS" "$SEGUIDORES_TS" "$KITCHEN_TS" "$ACCOUNT_TS" "$CREDENTIALS_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f (run this from the repository root)"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the apps' own claim, read out of their source ----------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
fields_of() { # file interface prefix-regex — a key may be optional (`?:`)
  awk -v want="export interface $2 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\)?\{0,1\}:.*/\1/p" | paste -sd, -
}

SET="$(const SET_MY_FOLLOW "$SIGUIENDO_TS")"
LIST="$(const MY_FOLLOWS "$SIGUIENDO_TS")"
NOT_A_KITCHEN="$(const NO_ES_COCINA "$SIGUIENDO_TS")"
SET_ARGS="$(fields_of "$SIGUIENDO_TS" FollowArgs 'p_')"
STATE_KEYS="$(fields_of "$SIGUIENDO_TS" FollowStateRow '')"
LIST_KEYS="$(fields_of "$SIGUIENDO_TS" FollowsRow '')"
KITCHEN_KEYS="$(fields_of "$SIGUIENDO_TS" FollowRow '')"
GONE_KEYS="$(fields_of "$SIGUIENDO_TS" GoneRow '')"
COUNT="$(const KITCHEN_FOLLOWERS "$SEGUIDORES_TS")"
COUNT_ARGS="$(fields_of "$SEGUIDORES_TS" FollowersArgs 'p_')"
ONBOARD="$(const ONBOARD_WORKSPACE "$KITCHEN_TS")"
ONBOARD_ARGS="$(fields_of "$KITCHEN_TS" OnboardArgs 'p_')"
KIND="$(const COCINA_KIND "$KITCHEN_TS")"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"
DELETE="$(const DELETE_MY_BUSINESS "$ACCOUNT_TS")"
DELETE_ARGS="$(fields_of "$ACCOUNT_TS" DeleteBusinessArgs 'p_')"

for pair in "SET_MY_FOLLOW:$SET" "MY_FOLLOWS:$LIST" "NO_ES_COCINA:$NOT_A_KITCHEN" "FollowArgs:$SET_ARGS" \
            "FollowStateRow:$STATE_KEYS" "FollowsRow:$LIST_KEYS" "FollowRow:$KITCHEN_KEYS" "GoneRow:$GONE_KEYS" \
            "KITCHEN_FOLLOWERS:$COUNT" "FollowersArgs:$COUNT_ARGS" "ONBOARD_WORKSPACE:$ONBOARD" \
            "OnboardArgs:$ONBOARD_ARGS" "COCINA_KIND:$KIND" "FULL_NAME_KEY:$NAME_KEY" \
            "DELETE_MY_BUSINESS:$DELETE" "DeleteBusinessArgs:$DELETE_ARGS"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the apps' source"
    echo "      This check asserts the apps' own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
ok "read from Itacate: $SET($SET_ARGS) → {$STATE_KEYS}, $LIST() → {$LIST_KEYS}, each kitchen {$KITCHEN_KEYS}, each gone {$GONE_KEYS}, $NOT_A_KITCHEN"
ok "read from Wera Cocina: $COUNT($COUNT_ARGS)"

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

def switches(a, keys, following, bell):
    """The answer carries exactly the app's keys, the two switches as wanted (in the keys' order)."""
    bad = exactly(a, keys, 'the answer')
    if bad:
        return bad
    k = keys.split(',')
    got = (a[k[0]], a[k[1]])
    want = (following == 'true', bell == 'true')
    return None if got == want else 'the switches came back %r, not %r' % (got, want)

def listed(a, list_keys, kitchen_keys, kitchen, following, bell):
    """Her list: exactly the app's keys; one kitchen, hers, with exactly the app's keys; nothing gone."""
    bad = exactly(a, list_keys, 'the answer')
    if bad:
        return bad
    kitchens_key, gone_key = list_keys.split(',')[:2]
    ks = a[kitchens_key]
    if not isinstance(ks, list) or len(ks) != 1:
        return 'her list held %r, not her one kitchen' % (ks,)
    bad = exactly(ks[0], kitchen_keys, 'a kitchen')
    if bad:
        return bad
    if ks[0].get('id') != kitchen:
        return 'the kitchen listed is %r, not hers' % ks[0].get('id')
    if (ks[0].get('following'), ks[0].get('bell')) != (following == 'true', bell == 'true'):
        return 'the kitchen listed says following=%r, bell=%r' % (ks[0].get('following'), ks[0].get('bell'))
    return None if a[gone_key] == [] else 'something gone already: %r' % (a[gone_key],)

def left(a, list_keys, gone_keys, kitchen, name):
    """The kitchen deleted: her list no longer holds it, and says it left, by the app's keys."""
    bad = exactly(a, list_keys, 'the answer')
    if bad:
        return bad
    kitchens_key, gone_key = list_keys.split(',')[:2]
    if a[kitchens_key] != []:
        return 'her list still holds %r' % (a[kitchens_key],)
    g = a[gone_key]
    if not isinstance(g, list) or len(g) != 1:
        return 'what left is %r, not her one kitchen' % (g,)
    bad = exactly(g[0], gone_keys, 'a kitchen that left')
    if bad:
        return bad
    return None if (g[0].get('id'), g[0].get('name')) == (kitchen, name) else 'what left says %r' % (g[0],)

def count(a, want):
    return None if a == int(want) else 'the count came back %r, not %s' % (a, want)

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
# A call whose answer is checked: a non-200 is a failure that names the function and its status.
call() { # file function body
  local out; out="$(api POST "/rest/v1/rpc/$2" "$3")"
  body "$out" > "$SCRATCH/$1.json"
  if [[ "$(status "$out")" != 200 ]]; then fail "$2 answered $(status "$out"): $(body "$out" | head -c 200)"; return 1; fi
}

# --- the fonda, made through Wera Cocina's names; a neighbour ----------------
RUN="$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')"
NAME="Fonda Seguida $RUN"
FONDA="$(signup "fonda-$RUN@example.invalid" "Fonda $RUN")"
VECINA="$(signup "vecina-$RUN@example.invalid" "Vecina $RUN")"
[[ -n "$FONDA" && -n "$VECINA" ]] || { echo "FAIL: could not sign two accounts up"; exit 1; }
TOKEN="$FONDA"
out="$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" "\"$NAME\"" "\"$KIND\"")")"
A="$(tr -d '"' <<< "$(body "$out")")"
[[ "$A" =~ ^[0-9a-f-]{36}$ ]] || { echo "FAIL: her kitchen could not be made: $(status "$out") $(body "$out" | head -c 200)"; exit 1; }
ok "a fonda and her kitchen made through Wera Cocina's names ($ONBOARD), a neighbour signed up"

# --- 2. Seguir, then the bell alone ------------------------------------------------
TOKEN="$VECINA"
if call s1 "$SET" "$(by_names "$SET_ARGS" "\"$A\"" true null)"; then
  check "Seguir by Itacate's names: the app's keys and nothing else, following, the bell off" switches "$SCRATCH/s1.json" "$STATE_KEYS" true false
fi
if call s2 "$SET" "$(by_names "$SET_ARGS" "\"$A\"" null true)"; then
  check "the bell alone by Itacate's names: following kept, the bell on" switches "$SCRATCH/s2.json" "$STATE_KEYS" true true
fi

# --- 3. her list ---------------------------------------------------------------------
if call l1 "$LIST" '{}'; then
  check "her list: the app's keys at each level, her one kitchen followed and rung, nothing gone" listed "$SCRATCH/l1.json" "$LIST_KEYS" "$KITCHEN_KEYS" "$A" true true
fi

# --- 4. Te siguen N, as the fonda --------------------------------------------------------
TOKEN="$FONDA"
if call c1 "$COUNT" "$(by_names "$COUNT_ARGS" "\"$A\"")"; then
  check "Te siguen N by Wera Cocina's names, asked as the fonda: 1" count "$SCRATCH/c1.json" 1
fi

# --- 5. not a kitchen in Itacate ---------------------------------------------------------
TOKEN="$VECINA"
out="$(api POST "/rest/v1/rpc/$SET" "$(by_names "$SET_ARGS" '"00000000-0000-4000-8000-000000000000"' true null)")"
body "$out" > "$SCRATCH/r1.json"
check "an id that is no kitchen in Itacate: refused with the code the app reads" code "$SCRATCH/r1.json" "$NOT_A_KITCHEN"

# --- 6. the kitchen deleted, by its owner through Wera Cocina's names ---------------------
TOKEN="$FONDA"
out="$(api POST "/rest/v1/rpc/$DELETE" "$(by_names "$DELETE_ARGS" "\"$A\"" "\"$NAME\"")")"
[[ "$(status "$out")" == 200 ]] && ok "her kitchen deleted alone through Wera Cocina's names ($DELETE)" || fail "could not delete her kitchen: $DELETE answered $(status "$out") $(body "$out" | head -c 200)"
TOKEN="$VECINA"
if call l2 "$LIST" '{}'; then
  check "her kitchen deleted: her list says it left, by the app's keys, with its name" left "$SCRATCH/l2.json" "$LIST_KEYS" "$GONE_KEYS" "$A" "$NAME"
fi

# --- 7. signed out --------------------------------------------------------------------
TOKEN=""
for fn in "$LIST:{}" "$SET:$(by_names "$SET_ARGS" "\"$A\"" true null)" "$COUNT:$(by_names "$COUNT_ARGS" "\"$A\"")"; do
  out="$(api POST "/rest/v1/rpc/${fn%%:*}" "${fn#*:}")"
  [[ "$(status "$out")" == 401 || "$(status "$out")" == 403 ]] && ok "signed out, ${fn%%:*} is refused ($(status "$out"))" || fail "signed out, ${fn%%:*} answered $(status "$out")"
done

echo
if (( fails > 0 )); then
  echo "$fails assertion(s) failed."
  exit 1
fi
echo "every assertion held: following, the bell, her list and the kitchen's count are the names the database answers."

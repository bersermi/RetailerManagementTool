#!/usr/bin/env bash
# 10.9b-ii-team-contract — does Wera Cocina read her role, read who works at her kitchen, remove a
# helper and let a helper leave, by the names the database answers — as a real owner and a real
# helper? And does her *Eliminar mi cuenta* read name nothing for a helper?
#
# WHY THIS EXISTS. `cocina/src/api/equipo.ts` is Wera Cocina's claim about `0001` and `0082`: her
# role (`my_role` and its argument), the memberships' table, its columns and the filters the list
# and *Quitar a …* send, and *Salir de esta cocina* (`leave_kitchen`, its argument, its refusal).
# PostgREST matches a function BY ITS ARGUMENTS' NAMES, so a misspelt `p_` name is a 404; a misspelt
# column is a 400 on the phone; a misspelt FILTER is worse — *Quitar* sent on the wrong column is a
# 200 that ends nobody's membership, or the owner's own. The typecheck, the suite and the bundler
# all pass over each one.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST:
#   1. The claim is read OUT OF `equipo.ts` (and the owners read out of `account.ts`, the kitchen's
#      making out of `kitchen.ts`): nothing retyped.
#   2. Her role: the owner reads the app's owner, the helper a role the app knows that is not it.
#   3. The owner's list: the kitchen's two active memberships, each carrying exactly the app's keys.
#   4. The helper's *Eliminar mi cuenta* read, as Cocina asks it: no row of it is hers, so nothing
#      would be named — a helper owns no business.
#   5. *Quitar* is refused to a helper, and never ends an owner's membership — not even the owner's
#      own, sent by the owner (the filter's `neq`).
#   6. *Quitar* by the owner: her row back; then the helper's kitchens read is empty, her role
#      `null`, the owner's list one person — the walls do the rest.
#   7. *Deshacer*: she is back, her role and her kitchen with her.
#   8. *Salir de esta cocina* by the helper: taken, the same again a retry; her role `null`, the
#      owner's list one person. The owner's *Salir*: refused with the code the app reads.
#   9. Signed out, nothing is answered.
#
# ⚠️ WHAT IT DOES NOT ASSERT: the database's own rules (`supabase/tests/0082_…`: who may leave, her
# name kept, the deletions), how a helper JOINS (`10.9b-iii` — here her membership is written as the
# database's owner, as `redeem_invite` writes it), or what a screen does with an answer
# (`cocina/test/equipo.test.ts`, `ayudante.test.ts`).
#
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2. ⚠️ TWO ACCOUNTS A RUN: GoTrue allows 30
# sign-ups in 5 minutes, and the falsifier runs this a dozen times.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.9b-ii-team-contract.sh
# With: $1 equipo.ts — how the falsifier points it at a broken copy.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

EQUIPO_TS="${1:-cocina/src/api/equipo.ts}"
ACCOUNT_TS="cocina/src/api/account.ts"
KITCHEN_TS="cocina/src/api/kitchen.ts"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
for f in "$EQUIPO_TS" "$ACCOUNT_TS" "$KITCHEN_TS" "$CREDENTIALS_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f (run this from the repository root)"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the app's own claim, read out of its source ---------------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
fields_of() { # file interface prefix-regex — a key may be optional (`?:`)
  awk -v want="export interface $2 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\)?\{0,1\}:.*/\1/p" | paste -sd, -
}
list_of() { sed -n "s/^export const $1 = \[\(.*\)\] as const;.*/\1/p" "$2" | head -1 | tr -d "' "; }

MY_ROLE="$(const MY_ROLE "$EQUIPO_TS")"
ROLE_ARGS="$(fields_of "$EQUIPO_TS" RoleArgs 'p_')"
ROLES="$(list_of ROLES "$EQUIPO_TS")"
OWNER="$(const DUENA "$EQUIPO_TS")"
TABLE="$(const MEMBERS_TABLE "$EQUIPO_TS")"
COLUMNS="$(const MEMBER_COLUMNS "$EQUIPO_TS")"
KITCHEN_COL="$(const MEMBER_KITCHEN_COLUMN "$EQUIPO_TS")"
ACTIVE_COL="$(const MEMBER_ACTIVE_COLUMN "$EQUIPO_TS")"
USER_COL="$(const MEMBER_USER_COLUMN "$EQUIPO_TS")"
ROLE_COL="$(const MEMBER_ROLE_COLUMN "$EQUIPO_TS")"
ROW_KEYS="$(fields_of "$EQUIPO_TS" MemberRow '')"
LEAVE="$(const LEAVE_KITCHEN "$EQUIPO_TS")"
LEAVE_ARGS="$(fields_of "$EQUIPO_TS" LeaveArgs 'p_')"
STAYS="$(const OWNER_STAYS_CODE "$EQUIPO_TS")"
OWNERS_TABLE="$(const OWNERS_TABLE "$ACCOUNT_TS")"
OWNER_COLUMNS="$(const OWNER_COLUMNS "$ACCOUNT_TS")"
OWNER_ROLE_COL="$(const OWNER_ROLE_COLUMN "$ACCOUNT_TS")"
OWNER_ROLE="$(const OWNER_ROLE "$ACCOUNT_TS")"
OWNER_ACTIVE_COL="$(const OWNER_ACTIVE_COLUMN "$ACCOUNT_TS")"
WORKSPACE="$(const WORKSPACE_TABLE "$KITCHEN_TS")"
KITCHEN_COLUMNS="$(const KITCHEN_COLUMNS "$KITCHEN_TS")"
KIND_COL="$(const KIND_COLUMN "$KITCHEN_TS")"
KIND="$(const COCINA_KIND "$KITCHEN_TS")"
ONBOARD="$(const ONBOARD_WORKSPACE "$KITCHEN_TS")"
ONBOARD_ARGS="$(fields_of "$KITCHEN_TS" OnboardArgs 'p_')"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"

for pair in "MY_ROLE:$MY_ROLE" "RoleArgs:$ROLE_ARGS" "ROLES:$ROLES" "DUENA:$OWNER" "MEMBERS_TABLE:$TABLE" \
            "MEMBER_COLUMNS:$COLUMNS" "MEMBER_KITCHEN_COLUMN:$KITCHEN_COL" "MEMBER_ACTIVE_COLUMN:$ACTIVE_COL" \
            "MEMBER_USER_COLUMN:$USER_COL" "MEMBER_ROLE_COLUMN:$ROLE_COL" "MemberRow:$ROW_KEYS" "LEAVE_KITCHEN:$LEAVE" \
            "LeaveArgs:$LEAVE_ARGS" "OWNER_STAYS_CODE:$STAYS" "OWNERS_TABLE:$OWNERS_TABLE" "OWNER_COLUMNS:$OWNER_COLUMNS" \
            "OWNER_ROLE_COLUMN:$OWNER_ROLE_COL" "OWNER_ROLE:$OWNER_ROLE" "OWNER_ACTIVE_COLUMN:$OWNER_ACTIVE_COL" \
            "WORKSPACE_TABLE:$WORKSPACE" "KITCHEN_COLUMNS:$KITCHEN_COLUMNS" "KIND_COLUMN:$KIND_COL" "COCINA_KIND:$KIND" \
            "ONBOARD_WORKSPACE:$ONBOARD" "OnboardArgs:$ONBOARD_ARGS" "FULL_NAME_KEY:$NAME_KEY"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the app's source"
    echo "      This check asserts the app's own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
ok "read from Wera Cocina: $MY_ROLE($ROLE_ARGS) → one of $ROLES, the owner '$OWNER'"
ok "the list: $TABLE?select=$COLUMNS, $KITCHEN_COL=eq, $ACTIVE_COL=eq.true → {$ROW_KEYS}; Quitar by $USER_COL, $ROLE_COL=neq.$OWNER"
ok "Salir: $LEAVE($LEAVE_ARGS), refused $STAYS for an owner; the deletion's read: $OWNERS_TABLE?select=$OWNER_COLUMNS"

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
api() { # method path [body] [accept] -> body, with the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" accept="${4:-application/json}" auth="${TOKEN:-}"
  if [[ -n "$auth" ]]; then auth="Authorization: Bearer $auth"; else auth="X-Empty: 1"; fi
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth" \
      -H 'Content-Type: application/json' -H "Accept: $accept" -H 'Prefer: return=representation' -d "$body"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth" -H "Accept: $accept"
  fi
}
# ⚠️ WHAT `.single()` SENDS: the object media type, which PostgREST answers 406 `PGRST116` when no row came back.
SINGLE='application/vnd.pgrst.object+json'
by_names() { # names-csv json-value1 json-value2 ... -> a JSON object keyed by the APP's names
  python3 -c 'import json,sys; n=sys.argv[1].split(","); print(json.dumps(dict(zip(n,[json.loads(v) for v in sys.argv[2:]]))))' "$@"
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
# ⚠️ GoTrue rate-limits sign-ups and answers a limited one with an EMPTY body — retried, long
# enough to outlast its 5-minute window when the falsifier has spent it.
signup() { # email display-name -> "token user-id", or nothing
  python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": "cocina-probe-123", "data": {sys.argv[2]: sys.argv[3]}}))' \
    "$1" "$NAME_KEY" "$2" > "$SCRATCH/signup.json"
  local out token="" user="" try
  for try in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24; do
    out="$(TOKEN="" api POST /auth/v1/signup "$(cat "$SCRATCH/signup.json")")"
    token="$(pick access_token "$(body "$out")")"
    user="$(python3 -c "import sys,json;d=json.load(sys.stdin);print((d.get('user') or {}).get('id',''))" <<< "$(body "$out")" 2>/dev/null)"
    [[ -n "$token" && -n "$user" ]] && break
    sleep 15
  done
  [[ -n "$token" && -n "$user" ]] && echo "$token $user"
}
as_owner() { supabase db query --local -o csv "$1" 2>/dev/null | tail -1; }
q() { python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=",()"))' "$1"; }

# Verdicts are one python file, a function per question.
cat > "$SCRATCH/v.py" <<'PY'
import json, sys

def load(path):
    try:
        return json.load(open(path))
    except Exception:
        return None

def role(a, roles_csv, owner, want_owner):
    if a not in roles_csv.split(','):
        return 'her role came back %r, not one of the app\'s %s' % (a, roles_csv)
    if (a == owner) != (want_owner == 'yes'):
        return 'her role came back %r — the app would draw %s' % (a, "the owner's screens" if a == owner else "a helper's")
    return None

def out(a):
    return None if a is None else 'her role came back %r, not null — the app would keep her at the kitchen' % (a,)

def team(a, keys_csv, user_col, want_csv):
    if not isinstance(a, list):
        return 'the list answered %r' % (a,)
    keys = keys_csv.split(',')
    for r in a:
        if sorted(r) != sorted(keys):
            return 'a row carried %s, not the app\'s %s' % (sorted(r), sorted(keys))
    got = sorted(r[user_col] for r in a)
    want = sorted(want_csv.split(',')) if want_csv else []
    return None if got == want else 'the list held %d people (%r), not %d' % (len(got), got, len(want))

def named(a, user_col, want_role_csv):
    """Each row's role and name, as user=role=name."""
    if not isinstance(a, list):
        return 'the list answered %r' % (a,)
    got = sorted('%s=%s=%s' % (r.get(user_col), r.get('role'), r.get('display_name')) for r in a)
    want = sorted(want_role_csv.split(','))
    return None if got == want else 'the list said %r, not %r' % (got, want)

def none_hers(a, user, owner_user):
    if not isinstance(a, list) or not a:
        return 'the read answered %r — her kitchen\'s owner should be on it' % (a,)
    if any(r.get('user_id') == user for r in a):
        return 'a row of the owners read is hers — her account\'s deletion would name a business'
    if not any(r.get('user_id') == owner_user for r in a):
        return 'her kitchen\'s owner is not on the read'
    return None

def row_back(a, user_col, user):
    if not isinstance(a, dict) or a.get(user_col) != user:
        return 'the update answered %r, not her row' % (a,)
    return None

def code(a, want):
    got = a.get('code') if isinstance(a, dict) else None
    return None if got == want else 'answered %r — the app reads %r' % (got, want)

def empty(a):
    return None if a == [] else 'answered %r, not []' % (a,)

def kitchens(a, kitchen):
    if not isinstance(a, list) or not any(isinstance(k, dict) and k.get('id') == kitchen for k in a):
        return 'her kitchens read %r — her kitchen is not on it' % (a,)
    return None

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
save() { body "$1" > "$SCRATCH/$2.json"; }

# --- the owner and her kitchen, made through Wera Cocina's names; a helper ------
RUN="$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')"
NAME="Fonda Equipo $RUN"
read -r MARI MARI_ID <<< "$(signup "mari-$RUN@example.invalid" "Mari $RUN")"
read -r LUPITA LUPITA_ID <<< "$(signup "lupita-$RUN@example.invalid" "Lupita $RUN")"
[[ -n "${MARI:-}" && -n "${LUPITA:-}" ]] || { echo "FAIL: could not sign two accounts up"; exit 1; }
TOKEN="$MARI"
out="$(api POST "/rest/v1/rpc/$ONBOARD" "$(by_names "$ONBOARD_ARGS" "\"$NAME\"" "\"$KIND\"")")"
A="$(tr -d '"' <<< "$(body "$out")")"
[[ "$A" =~ ^[0-9a-f-]{36}$ ]] || { echo "FAIL: her kitchen could not be made: $(status "$out") $(body "$out" | head -c 200)"; exit 1; }
# Lupita joins as a helper — written as the database's owner, as `redeem_invite` writes it (`0028`):
# a `staff` membership with her name, and its kitchen's one place.
joined="$(as_owner "with m as (insert into public.workspace_member (workspace_id, user_id, role, display_name)
    values ('$A', '$LUPITA_ID', 'staff', 'Lupita $RUN') returning id)
  insert into public.member_location (workspace_id, member_id, location_id)
    select '$A', m.id, l.id from m, public.location l where l.workspace_id = '$A' returning 1")"
[[ "$joined" == 1 ]] || { echo "FAIL: Lupita could not be made a helper ($joined)"; exit 1; }
ok "a fonda and her kitchen made through Wera Cocina's names ($ONBOARD); Lupita a helper there, as an invitation makes one"

MEMBERS="/rest/v1/$TABLE?select=$(q "$COLUMNS")&$KITCHEN_COL=eq.$A&$ACTIVE_COL=eq.true"
ROW="/rest/v1/$TABLE?$KITCHEN_COL=eq.$A&$USER_COL=eq.$LUPITA_ID&$ROLE_COL=neq.$OWNER&select=$USER_COL"
OWN_ROW="/rest/v1/$TABLE?$KITCHEN_COL=eq.$A&$USER_COL=eq.$MARI_ID&$ROLE_COL=neq.$OWNER&select=$USER_COL"
KITCHENS="/rest/v1/$WORKSPACE?select=$(q "$KITCHEN_COLUMNS")&$KIND_COL=eq.$KIND"
ROLE_BODY="$(by_names "$ROLE_ARGS" "\"$A\"")"
LEAVE_BODY="$(by_names "$LEAVE_ARGS" "\"$A\"")"

# --- 2. her role ----------------------------------------------------------------
TOKEN="$MARI"; out="$(api POST "/rest/v1/rpc/$MY_ROLE" "$ROLE_BODY")"; save "$out" r1
if [[ "$(status "$out")" == 200 ]]; then check "the owner's role: the app's owner — her screens" role "$SCRATCH/r1.json" "$ROLES" "$OWNER" yes
else fail "$MY_ROLE answered $(status "$out") for the owner: $(body "$out" | head -c 200)"; fi
TOKEN="$LUPITA"; out="$(api POST "/rest/v1/rpc/$MY_ROLE" "$ROLE_BODY")"; save "$out" r2
if [[ "$(status "$out")" == 200 ]]; then check "the helper's role: one the app knows, not the owner's — a helper's screens" role "$SCRATCH/r2.json" "$ROLES" "$OWNER" no
else fail "$MY_ROLE answered $(status "$out") for the helper: $(body "$out" | head -c 200)"; fi

# --- 3. the owner's list ----------------------------------------------------------
TOKEN="$MARI"; out="$(api GET "$MEMBERS")"; save "$out" t1
if [[ "$(status "$out")" == 200 ]]; then
  check "Quién trabaja aquí: the kitchen's two people, each with exactly the app's keys" team "$SCRATCH/t1.json" "$ROW_KEYS" "$USER_COL" "$MARI_ID,$LUPITA_ID"
  check "each by role and name" named "$SCRATCH/t1.json" "$USER_COL" "$MARI_ID=owner=Mari $RUN,$LUPITA_ID=staff=Lupita $RUN"
else fail "the list answered $(status "$out"): $(body "$out" | head -c 200)"; fi

# --- 4. the helper's Eliminar mi cuenta read ----------------------------------------
TOKEN="$LUPITA"
out="$(api GET "/rest/v1/$OWNERS_TABLE?select=$(q "$OWNER_COLUMNS")&$OWNER_ROLE_COL=eq.$OWNER_ROLE&$OWNER_ACTIVE_COL=eq.true")"; save "$out" o1
if [[ "$(status "$out")" == 200 ]]; then check "her Eliminar mi cuenta read: her kitchen's owner, and no row of hers — nothing would be named" none_hers "$SCRATCH/o1.json" "$LUPITA_ID" "$MARI_ID"
else fail "the owners read answered $(status "$out"): $(body "$out" | head -c 200)"; fi

# --- 5. Quitar refused where it must be ----------------------------------------------
TOKEN="$LUPITA"; out="$(api PATCH "$ROW" "$(by_names "$ACTIVE_COL" false)" "$SINGLE")"; save "$out" x1
check "Quitar sent by a helper: refused, no row (PGRST116, what the app reads as only the owner may)" code "$SCRATCH/x1.json" PGRST116
TOKEN="$MARI"; out="$(api PATCH "$OWN_ROW" "$(by_names "$ACTIVE_COL" false)" "$SINGLE")"; save "$out" x2
check "Quitar on an owner — the owner's own row, by the owner: no row, the filter's $ROLE_COL=neq.$OWNER" code "$SCRATCH/x2.json" PGRST116
TOKEN="$MARI"; out="$(api POST "/rest/v1/rpc/$MY_ROLE" "$ROLE_BODY")"; save "$out" r3
check "and the owner is still the owner" role "$SCRATCH/r3.json" "$ROLES" "$OWNER" yes

# --- 6. Quitar by the owner ------------------------------------------------------------
TOKEN="$MARI"; out="$(api PATCH "$ROW" "$(by_names "$ACTIVE_COL" false)" "$SINGLE")"; save "$out" x3
if [[ "$(status "$out")" == 200 ]]; then check "Quitar a Lupita, by the owner: her row back, as .single() reads it" row_back "$SCRATCH/x3.json" "$USER_COL" "$LUPITA_ID"
else fail "Quitar answered $(status "$out"): $(body "$out" | head -c 200)"; fi
TOKEN="$LUPITA"; out="$(api GET "$KITCHENS")"; save "$out" k1
check "her phone loses the kitchen: her kitchens read, as the app asks it, is empty" empty "$SCRATCH/k1.json"
out="$(api POST "/rest/v1/rpc/$MY_ROLE" "$ROLE_BODY")"; save "$out" r4
check "and her role is null — the app reads her kitchens again" out "$SCRATCH/r4.json"
TOKEN="$MARI"; out="$(api GET "$MEMBERS")"; save "$out" t2
check "the owner's list: herself alone" team "$SCRATCH/t2.json" "$ROW_KEYS" "$USER_COL" "$MARI_ID"

# --- 7. Deshacer ---------------------------------------------------------------------------
TOKEN="$MARI"; out="$(api PATCH "$ROW" "$(by_names "$ACTIVE_COL" true)" "$SINGLE")"; save "$out" x4
check "Deshacer: her row back" row_back "$SCRATCH/x4.json" "$USER_COL" "$LUPITA_ID"
TOKEN="$LUPITA"; out="$(api GET "$KITCHENS")"; save "$out" k2
check "and her kitchen with her" kitchens "$SCRATCH/k2.json" "$A"

# --- 8. Salir de esta cocina ------------------------------------------------------------------
TOKEN="$LUPITA"; out="$(api POST "/rest/v1/rpc/$LEAVE" "$LEAVE_BODY")"
[[ "$(status "$out")" == 200 || "$(status "$out")" == 204 ]] && ok "Salir de esta cocina, by the helper: taken ($(status "$out"))" \
  || fail "$LEAVE answered $(status "$out"): $(body "$out" | head -c 200)"
out="$(api POST "/rest/v1/rpc/$LEAVE" "$LEAVE_BODY")"
[[ "$(status "$out")" == 200 || "$(status "$out")" == 204 ]] && ok "the same tap again: nothing, no error ($(status "$out"))" \
  || fail "a second $LEAVE answered $(status "$out"): $(body "$out" | head -c 200)"
out="$(api POST "/rest/v1/rpc/$MY_ROLE" "$ROLE_BODY")"; save "$out" r5
check "her role is null once she left" out "$SCRATCH/r5.json"
TOKEN="$MARI"; out="$(api GET "$MEMBERS")"; save "$out" t3
check "the owner's list: herself alone again" team "$SCRATCH/t3.json" "$ROW_KEYS" "$USER_COL" "$MARI_ID"
out="$(api POST "/rest/v1/rpc/$LEAVE" "$LEAVE_BODY")"; save "$out" l1
check "the owner's Salir: refused with the code the app reads" code "$SCRATCH/l1.json" "$STAYS"

# --- 9. signed out ----------------------------------------------------------------------------
TOKEN=""
out="$(api POST "/rest/v1/rpc/$MY_ROLE" "$ROLE_BODY")"
[[ "$(status "$out")" == 401 || "$(status "$out")" == 403 ]] && ok "signed out, her role is refused ($(status "$out"))" || fail "signed out, $MY_ROLE answered $(status "$out")"
out="$(api GET "$MEMBERS")"
[[ "$(status "$out")" == 401 || "$(status "$out")" == 403 ]] && ok "signed out, the list is refused ($(status "$out"))" || fail "signed out, the list answered $(status "$out"): $(body "$out" | head -c 120)"
out="$(api POST "/rest/v1/rpc/$LEAVE" "$LEAVE_BODY")"
[[ "$(status "$out")" == 401 || "$(status "$out")" == 403 ]] && ok "signed out, Salir is refused ($(status "$out"))" || fail "signed out, $LEAVE answered $(status "$out")"

echo
if (( fails > 0 )); then
  echo "$fails assertion(s) failed."
  exit 1
fi
echo "every assertion held: her role, who works at her kitchen, Quitar and Salir are the names the database answers."

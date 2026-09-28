#!/usr/bin/env bash
# 6b-provider-directory-contract — does `app/src/api/providerDirectory.ts` still
# describe `public.provider`, and is the manager fence on it real?
#
# ⚠️⚠️ SEVEN CLAIMS LIVE HERE AND NOWHERE ELSE IN THIS REPOSITORY.
#
#   1. **THE DETAIL READ ANSWERS WITH EVERY COLUMN IT ASKED FOR.** `DETAIL_COLUMNS`
#      names three columns no other read in this app has ever asked for —
#      `contact_name`, `phone`, `address_line1` — and a renamed column is a 400 the
#      typecheck, the bundler and the whole Vitest suite pass straight over.
#
#   2. ⚠️⚠️ **THE INSERT BODY THE APP BUILDS IS ACCEPTED, AND IT OMITS TWO COLUMNS
#      ON PURPOSE.** `is_generic` is refused a second row by
#      `provider_one_generic_per_workspace_idx`, a PARTIAL unique index, and
#      `is_active` defaults to true — so `INSERT_COLUMNS` naming either would be
#      this app restating a default it does not own, or sending a `23505` on an
#      index whose name says nothing a shopkeeper could act on.
#
#   3. ⚠️⚠️ **THE FENCE. A CASHIER IS REFUSED, AND THE TWO REFUSALS DO NOT LOOK
#      ALIKE.** `provider_insert` and `provider_update` are both
#      `has_role(…, 'manager')` in `0002` — and on an INSERT she gets **HTTP 403
#      `42501`**, while on an UPDATE she gets **HTTP 200 and `[]`**, because a
#      `using` clause makes the row invisible rather than refusing the write. This
#      is the ONLY instrument in this repository that can see either: no
#      typecheck, suite or bundler has ever read a policy, `CREATE POLICY` is not
#      in the knowledge graph, and RLS is bypassed by the `postgres` superuser, so
#      a check run as superuser passes vacuously.
#
#   4. ⚠️⚠️ **`normalize_name` FOLDS CASE AND WHITESPACE AND NOT ACCENTS**, which
#      is what makes this app's own duplicate check deliberately WIDER than its
#      schema. Driven both ways here: `bodega   DEL centro` is refused `23505`,
#      and `Abarrotes Pena` beside `Abarrotes Peña` is **accepted**. The second
#      half is the one nothing else can see — `checkProvider` refuses it, and if
#      the database ever started refusing it too, this app would be showing a
#      sentence about a rule that had moved.
#
#   5. ⚠️⚠️ **THE GENERIC ROW CAN BE DEACTIVATED AND NOTHING IN POSTGRES STOPS IT.**
#      `provider_protect_generic` raises `restrict_violation` on a DELETE and on a
#      demotion and **stops there**. `canRetire` is the whole fence, and this
#      measures that it is load-bearing rather than belt-and-braces: a shop whose
#      catch-all supplier was switched off opens Comprar with no default at all.
#      ⚠️ The row is put straight back, so nothing downstream sees it off.
#
#   6. ⚠️ **ANOTHER SHOP SEES NONE OF THIS SHOP'S SUPPLIERS**, and its manager
#      cannot rename one of them. `provider_select` is `my_workspaces()` and there
#      is no delete policy at all, so this is the tenancy claim on the one table
#      `6b` writes.
#
#   7. ⚠️⚠️ **POSTGRES KEEPS `''` AND `null` APART ON `contact_name`**, which is the
#      premise under `optional()`'s *empty means absent, once*. ⚠️ **No check in this
#      repository can call `optional()` — it is a TypeScript function and this is a
#      shell script** — so this asserts the CONSEQUENCE and
#      `app/test/api-provider-directory.test.ts` asserts the DECISION. That division
#      is written down because a falsifier fixture mutating `optional()` walked
#      straight past an earlier version of this check, and the honest answer was to
#      say which instrument owns which half.
#
# WHAT IS DELIBERATELY NOT RE-ASSERTED HERE: the LIST read and its banned columns.
# `docs/checks/5g-i-purchase-contract.sh` drives `PROVIDER_COLUMNS` and asserts by
# name that the three directory columns never reach a phone through Comprar's read
# — ⚠️ **and this check is the other side of that boundary rather than an exception
# to it**: those columns arrive through `DETAIL_COLUMNS`, on one supplier, on a
# screen reached by tapping her. Widening the list read to serve the directory
# turns that check red, which is what it is for.
#
# ⚠️ AND THERE IS NO DELETE ASSERTION, because there is nothing to assert: `0002`
# gives `provider` no DELETE policy, so the app never sends one. The absence is
# asserted in `app/test/api-provider-directory.test.ts`, against the vocabulary.
#
# Run:  supabase start && supabase db reset && bash docs/checks/6b-provider-directory-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/providerDirectory.ts}"
LIST="${2:-app/src/api/providers.ts}"
for f in "$CONTRACT" "$LIST"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f"; exit 1; }
done

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the contract, read out of the app ----------------------------------
# ⚠️ EVERY STRING BELOW IS THE MODULE'S OWN. A check that retypes a contract is
# asserting itself — `5h-ii-a`'s rule, obeyed by every check since.
str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
# ⚠️ `DETAIL_COLUMNS` IS WRAPPED ACROSS TWO LINES by the formatter, so it needs its
# own reader — the shape `6a-ii-b`'s `wrapped` records.
wrapped() { sed -n "/^export const $1 =\$/,/;\$/p" "$2" | sed -n "s/^  '\([^']*\)';\$/\1/p" | head -1; }

DIRECTORY_TABLE="$(str DIRECTORY_TABLE "$CONTRACT")"
DETAIL_ID_COLUMN="$(str DETAIL_ID_COLUMN "$CONTRACT")"
DETAIL_COLUMNS="$(wrapped DETAIL_COLUMNS "$CONTRACT")"
INSERT_COLUMNS="$(str INSERT_COLUMNS "$CONTRACT")"
NAME_PATCH_COLUMNS="$(str NAME_PATCH_COLUMNS "$CONTRACT")"
CONTACT_PATCH_COLUMNS="$(str CONTACT_PATCH_COLUMNS "$CONTRACT")"
ACTIVE_PATCH_COLUMNS="$(str ACTIVE_PATCH_COLUMNS "$CONTRACT")"
WRITE_RETURNING="$(str WRITE_RETURNING "$CONTRACT")"
PROVIDER_COLUMNS="$(str PROVIDER_COLUMNS "$LIST")"

note
for name in DIRECTORY_TABLE DETAIL_ID_COLUMN DETAIL_COLUMNS INSERT_COLUMNS \
            NAME_PATCH_COLUMNS CONTACT_PATCH_COLUMNS ACTIVE_PATCH_COLUMNS \
            WRITE_RETURNING PROVIDER_COLUMNS; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app"
    echo "      This check asserts the app's own constants against a real database."
    echo "      If it cannot find them it has nothing to assert, and a green here"
    echo "      would be the vacuous kind ADR-035 §9 refuses."
    exit 1
  fi
done
ok "read from $CONTRACT: detail=$DETAIL_COLUMNS insert=$INSERT_COLUMNS"

# ⚠️⚠️ THE ONE ASSERTION ABOUT THE APP RATHER THAN THE WIRE, AND IT IS THE HINGE
# OF THE WHOLE BOUNDARY. The directory's three columns must be in `DETAIL_COLUMNS`
# and must NOT be in `PROVIDER_COLUMNS` — the first half is what this task built
# and the second is what `5g-i` guards. Asserting both HERE means a session that
# widens the list read to save a query finds out in two places at once.
note
DIRECTORY_ONLY='contact_name phone address_line1'
missing=''
leaked=''
for column in $DIRECTORY_ONLY; do
  case ",$DETAIL_COLUMNS," in *",$column,"*) ;; *) missing="$missing $column" ;; esac
  case ",$PROVIDER_COLUMNS," in *",$column,"*) leaked="$leaked $column" ;; esac
done
if [[ -n "$missing" ]]; then
  fail "the detail read does not ask for:$missing — Proveedores draws all three"
elif [[ -n "$leaked" ]]; then
  fail "COMPRAR'S LIST READ NOW CARRIES:$leaked"
  echo "      Those three columns belong to the DETAIL read, on one supplier, on a"
  echo "      screen reached by tapping her. On the list read they reach every"
  echo "      phone that opens Comprar, and docs/checks/5g-i-purchase-contract.sh"
  echo "      asserts by name that they do not. If that was deliberate, amend"
  echo "      that check and say so — do not widen it quietly."
else
  ok "the directory's three columns are on the detail read and not on Comprar's"
fi

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)"
  echo "      from the repository root — \`supabase status\` needs the project directory."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS and
# assertions 3 and 6 would pass vacuously, which is the trap `supabase/README.md`
# records about the `postgres` superuser.
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

TOKEN=""
api() { # method path body -> body, with the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" auth="${TOKEN:-}"
  if [[ -n "$auth" ]]; then auth="Authorization: Bearer $auth"; else auth="X-Empty: 1"; fi
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" \
      -H "apikey: $KEY" -H "$auth" -H 'Content-Type: application/json' \
      -H 'Prefer: return=representation' -d "$body"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth"
  fi
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
# ⚠️ A RESPONSE BODY IS WRITTEN TO A FILE AND NEVER INTERPOLATED INTO PYTHON
# SOURCE — the trap `5b-ii-a`'s harness recorded: PostgREST's 400 hints quote a
# column name, and those escaped quotes pasted into a literal make the check go red
# for the wrong reason.
stash()  { local f="$SCRATCH/$1.json"; body "$2" > "$f"; echo "$f"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
first()  { python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['$1'] if isinstance(r,list) and r else '')" <<< "$2" 2>/dev/null; }
code_of() { pick code "$1"; }
rows_of() { python3 -c "import sys,json
try:
    r = json.load(sys.stdin)
except Exception:
    print('-1'); raise SystemExit
print(len(r) if isinstance(r, list) else '-1')" <<< "$1" 2>/dev/null; }

verdict() { # label python-file extra-args...
  local label="$1"; shift
  local out
  out="$(python3 "$@" 2>&1)"
  [[ -z "$out" ]] && out="the verdict script produced nothing — it crashed on the shape that came back"
  note
  if [[ "$out" == ok* ]]; then ok "$label${out#ok}"; else fail "$out"; fi
}

# ⚠️ SIGNUP IS RETRIED. GoTrue rate-limits it, and a rate-limited signup returns an
# EMPTY BODY rather than a 429 — which looks exactly like a broken harness.
signup() { # email -> sets TOKEN
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"provider-dir-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  echo "      GoTrue rate-limits signup and answers with an EMPTY BODY when it does."
  exit 1
}

# ⚠️ AN OPTIONAL COLUMN IS SENT AS A REAL JSON `null`, BUILT IN PYTHON AND NEVER
# INTERPOLATED — [[bash-cannot-hold-a-nul-sentinel]] and
# [[json-inline-in-nested-subshell-brace-expands]] between them cost this
# repository two sessions.
insert_body() { # columns workspace name contact phone address (empty string -> null)
  python3 -c '
import json, sys
cols = sys.argv[1].split(",")
vals = sys.argv[2:]
# THE COUNTS MUST MATCH, AND THIS assert IS NOT DEFENSIVE — it is the fix for a
# fixture that walked straight past an earlier version of this harness. zip stops at
# the shorter list, so a column ADDED to INSERT_COLUMNS was silently never sent and
# the check stayed green about an insert the app had changed. A harness that quietly
# ignores half its input is the vacuous green one layer in.
assert len(cols) == len(vals), (
    "INSERT_COLUMNS names %d column(s) and this harness has %d value(s) for them: %s. "
    "A column was added to the insert body this app builds. Give it a value here, and "
    "decide whether the database owns that column before you do."
    % (len(cols), len(vals), cols))
row = {}
for col, val in zip(cols, vals):
    row[col] = None if val == "" else val
print(json.dumps(row))' "$@"
}
patch_body() { # key value  (empty string -> null; "true"/"false" -> bool)
  python3 -c '
import json, sys
key, raw = sys.argv[1], sys.argv[2]
if raw == "":
    val = None
elif raw in ("true", "false"):
    val = raw == "true"
else:
    val = raw
print(json.dumps({key: val}))' "$@"
}

STAMP="$$-$(date +%s)"

# --- the shop and its three people -----------------------------------------
OWNER_EMAIL="dir-owner-$STAMP@example.com"
STAFF_EMAIL="dir-staff-$STAMP@example.com"
NEIGHBOUR_EMAIL="dir-neighbour-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Proveedores 6b","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" ]] || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }
LOCATION_ID="$(first id "$(body "$(api GET '/rest/v1/location?select=id')")")"
[[ -n "$LOCATION_ID" ]] || { echo "FAIL: the new shop has no location"; exit 1; }

STAFF_INVITE="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "$STAFF_EMAIL" "$LOCATION_ID")"
STAFF_INVITE_TOKEN="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$STAFF_INVITE")")")"
[[ -n "$STAFF_INVITE_TOKEN" ]] || { echo "FAIL: create_invite returned no token for the cashier"; exit 1; }
signup "$STAFF_EMAIL"; STAFF_TOKEN="$TOKEN"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$STAFF_INVITE_TOKEN\"}" > /dev/null

# ⚠️ THE NEIGHBOUR IS A SHOP OF HER OWN AND NOT A STRANGER WITH NO WORKSPACE:
# assertion 6 is about `my_workspaces()` excluding a shop, which a person who is in
# no shop at all would pass vacuously.
signup "$NEIGHBOUR_EMAIL"; NEIGHBOUR_TOKEN="$TOKEN"
api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"La de al lado","p_prices_include_tax":true,"p_location_name":null}' > /dev/null

# ⚠️⚠️ THE NAMES CARRY ACCENTS, A CAPITAL AND DOUBLE SPACES, and none of the three
# is decoration: assertions 1 and 4 are the whole reason for them. A transport that
# mangled UTF-8 between here and a phone would otherwise be green.
CENTRO_NAME='Bodega del Centro'
PENA_ACCENT='Abarrotes Peña'
PENA_PLAIN='Abarrotes Pena'
CENTRO_FOLDED='bodega   DEL centro'

# --- 2. the insert body the app builds --------------------------------------
TOKEN="$OWNER_TOKEN"
CENTRO_BODY="$(insert_body "$INSERT_COLUMNS" "$WORKSPACE_ID" "$CENTRO_NAME" \
  'Doña Mati' '55 1234 5678' 'Av. Juárez 12')"
CENTRO_OUT="$(api POST "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING" "$CENTRO_BODY")"
CENTRO_ID="$(first id "$(body "$CENTRO_OUT")")"

# ⚠️ AND THE ONE WITH NOTHING BUT A NAME, which is what three `Opcional` boxes
# left alone produce. `optional()` sends a real `null` for each, and `not null`
# on any of the three would be a 400 here rather than a form nobody can submit.
BARE_BODY="$(insert_body "$INSERT_COLUMNS" "$WORKSPACE_ID" 'Frutas del Valle' '' '' '')"
BARE_OUT="$(api POST "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING" "$BARE_BODY")"
BARE_ID="$(first id "$(body "$BARE_OUT")")"

note
if [[ "$(status "$CENTRO_OUT")" == "201" && "$(status "$BARE_OUT")" == "201" \
      && -n "$CENTRO_ID" && -n "$BARE_ID" ]]; then
  ok "the app's own insert body is accepted, with all four fields and with one"
else
  fail "the app's own insert body was not accepted:"
  echo "        with contact details  $(status "$CENTRO_OUT") $(body "$CENTRO_OUT")"
  echo "        with a name only      $(status "$BARE_OUT") $(body "$BARE_OUT")"
  echo "      Every column above is read out of $CONTRACT. A rename on either side"
  echo "      of the wire compiles, bundles and passes the whole Vitest suite."
  exit 1
fi

# ⚠️⚠️ AND THE TWO COLUMNS IT OMITS ARE OMITTED FOR A REASON THE DATABASE CAN
# CONFIRM. `is_active` must have defaulted to true, or a supplier she just made is
# invisible to `providersFrom`; `is_generic` must have defaulted to false, or the
# partial unique index would have refused the row and the shop would have two
# catch-alls.
DEFAULTS="$(api GET "/rest/v1/$DIRECTORY_TABLE?select=is_active,is_generic&$DETAIL_ID_COLUMN=eq.$BARE_ID")"
DEFAULTS_FILE="$(stash defaults "$DEFAULTS")"
cat > "$SCRATCH/defaults.py" <<'PY'
import json, sys
try:
    rows = json.load(open(sys.argv[1]))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list) or len(rows) != 1:
    print('the supplier just created did not read back as one row: %r' % (rows,)); raise SystemExit
row = rows[0]
if row.get('is_active') is not True:
    print('a brand-new supplier came back is_active=%r — providersFrom drops her, so '
          'she is invisible on the screen that just made her' % (row.get('is_active'),))
    raise SystemExit
if row.get('is_generic') is not False:
    print('a brand-new supplier came back is_generic=%r — the shop now has two '
          'catch-alls and defaultProvider picks whichever sorts first'
          % (row.get('is_generic'),))
    raise SystemExit
print('ok — is_active defaulted true and is_generic defaulted false, so the app '
      'is right to send neither')
PY
verdict "the two columns INSERT_COLUMNS omits default the way the app assumes" \
  "$SCRATCH/defaults.py" "$DEFAULTS_FILE"

# --- 1. the detail read the app actually makes ------------------------------
DETAIL="$(api GET "/rest/v1/$DIRECTORY_TABLE?select=$DETAIL_COLUMNS&$DETAIL_ID_COLUMN=eq.$CENTRO_ID")"
DETAIL_FILE="$(stash detail "$DETAIL")"
cat > "$SCRATCH/detail.py" <<'PY'
import json, sys
path, cols = sys.argv[1], sys.argv[2].split(',')
name, contact, phone, address = sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]
try:
    rows = json.load(open(path))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list):
    print('the detail read came back as an error: %r' % (rows,)); raise SystemExit
if len(rows) != 1:
    print('one supplier was asked for and %d came back' % len(rows)); raise SystemExit
row = rows[0]
missing = [c for c in cols if c not in row]
if missing:
    print('the select asked for columns the row does not have: %s' % missing); raise SystemExit
extra = [c for c in row if c not in cols]
if extra:
    print('the read carried columns nobody asked for: %s — a column the app never '
          'asks for is a column that never reaches a phone' % extra); raise SystemExit
# ⚠️⚠️ THE VALUES AND NOT ONLY THE KEYS, which is what `5g-i`'s falsifier P6 taught
# this repository: a read compared only against the columns it ASKED for is a
# contract agreeing with itself. An accent mangled in transit is the failure a
# shopkeeper sees and no key check can.
for column, want in (('name', name), ('contact_name', contact),
                     ('phone', phone), ('address_line1', address)):
    if row.get(column) != want:
        print('%s came back as %r and was written as %r — an accent or a space lost '
              'in transit is exactly what this compares' % (column, row.get(column), want))
        raise SystemExit
if row.get('is_generic') is not False or row.get('is_active') is not True:
    print('the row came back is_generic=%r is_active=%r' % (row.get('is_generic'), row.get('is_active')))
    raise SystemExit
print('ok — one supplier, every column asked for, every value byte for byte')
PY
verdict "the detail read answers with what the app asked for" \
  "$SCRATCH/detail.py" "$DETAIL_FILE" "$DETAIL_COLUMNS" \
  "$CENTRO_NAME" 'Doña Mati' '55 1234 5678' 'Av. Juárez 12'

# --- 4. normalize_name folds case and whitespace, and NOT accents -----------
# ⚠️ THE REFUSED HALF FIRST. `provider_name_unique` is on `normalized_name`, so a
# name that merely FOLDS onto one the shop has is a 23505 — which is the sentence
# `ES.providers.errors.duplicate` exists for.
FOLDED_OUT="$(api POST "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING" \
  "$(insert_body "$INSERT_COLUMNS" "$WORKSPACE_ID" "$CENTRO_FOLDED" '' '' '')")"
note
if [[ "$(status "$FOLDED_OUT")" == "409" && "$(code_of "$(body "$FOLDED_OUT")")" == "23505" ]]; then
  ok "a name that folds onto one the shop has is refused 23505, the code the app maps"
elif [[ "$(status "$FOLDED_OUT")" == "201" ]]; then
  fail "'$CENTRO_FOLDED' WAS ACCEPTED BESIDE '$CENTRO_NAME'."
  echo "      normalize_name is supposed to collapse whitespace and fold case, so"
  echo "      provider_name_unique should have refused this. If it no longer does,"
  echo "      this shop can hold two rows for one supplier and provider_price_memory"
  echo "      splits down the middle — two prefills, each holding half of what was paid."
else
  fail "a folded duplicate answered $(status "$FOLDED_OUT") code '$(code_of "$(body "$FOLDED_OUT")")'"
  echo "      The app keys on 23505. An unmapped code falls through to @/api/errors."
fi

# ⚠️⚠️ AND THE ACCEPTED HALF, WHICH IS THE ONE NOTHING ELSE IN THIS REPOSITORY CAN
# SEE. `0002` refuses to fold accents in `normalize_name` on purpose — *"Plátano and
# Platano being distinct is acceptable, silently merging them is not"* — so these
# two are two legal rows. `checkProvider` refuses the second anyway, with a
# sentence, which is this app deliberately STRICTER than its schema. The day the
# database starts refusing it, that sentence becomes a claim about a rule that moved.
ACCENT_OUT="$(api POST "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING" \
  "$(insert_body "$INSERT_COLUMNS" "$WORKSPACE_ID" "$PENA_ACCENT" '' '' '')")"
PLAIN_OUT="$(api POST "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING" \
  "$(insert_body "$INSERT_COLUMNS" "$WORKSPACE_ID" "$PENA_PLAIN" '' '' '')")"
PENA_ID="$(first id "$(body "$ACCENT_OUT")")"
note
if [[ "$(status "$ACCENT_OUT")" == "201" && "$(status "$PLAIN_OUT")" == "201" ]]; then
  ok "normalize_name does NOT fold accents — Peña and Pena are two legal rows, and"
  echo "        checkProvider refusing the second is this app stricter than its schema"
elif [[ "$(status "$PLAIN_OUT")" == "409" ]]; then
  fail "THE DATABASE NOW FOLDS ACCENTS: '$PENA_PLAIN' was refused beside '$PENA_ACCENT'."
  echo "      0002 refuses to fold them on purpose. If a migration changed that, the"
  echo "      comment in @/api/providerDirectory calling this app 'deliberately wider"
  echo "      than its schema' is now false, and so is api-provider-directory.test.ts."
else
  fail "the accent pair answered $(status "$ACCENT_OUT") and $(status "$PLAIN_OUT")"
fi

# --- 2b. the three patch bodies the app builds ------------------------------
TOKEN="$OWNER_TOKEN"
RENAME_OUT="$(api PATCH "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING&$DETAIL_ID_COLUMN=eq.$BARE_ID" \
  "$(patch_body "$NAME_PATCH_COLUMNS" 'Frutas del Valle SA')")"
# ⚠️ CLEARING A CONTACT DETAIL IS A REAL CHANGE AND IT SENDS `null`, not `''`. A
# supplier whose number is wrong must be able to have it removed, and `''` would be
# a phone number this shop HAS that renders as C3.12's dash.
CLEAR_KEY="${CONTACT_PATCH_COLUMNS%%,*}"
CLEAR_OUT="$(api PATCH "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING&$DETAIL_ID_COLUMN=eq.$CENTRO_ID" \
  "$(patch_body "$CLEAR_KEY" '')")"
note
if [[ "$(status "$RENAME_OUT")" == "200" && "$(rows_of "$(body "$RENAME_OUT")")" == "1" \
      && "$(status "$CLEAR_OUT")" == "200" && "$(rows_of "$(body "$CLEAR_OUT")")" == "1" ]]; then
  ok "a rename and a cleared contact both land, and both answer with the row back"
else
  fail "a manager's own patch bodies were not accepted:"
  echo "        rename        $(status "$RENAME_OUT") $(body "$RENAME_OUT")"
  echo "        clear $CLEAR_KEY  $(status "$CLEAR_OUT") $(body "$CLEAR_OUT")"
fi

CLEARED="$(api GET "/rest/v1/$DIRECTORY_TABLE?select=$CLEAR_KEY&$DETAIL_ID_COLUMN=eq.$CENTRO_ID")"
note
if [[ "$(body "$CLEARED")" == *"\"$CLEAR_KEY\":null"* ]]; then
  ok "a cleared $CLEAR_KEY is null and not an empty string, so absent means absent"
else
  fail "a cleared $CLEAR_KEY read back as $(body "$CLEARED")"
  echo "      '' is a value this shop HAS and null is one it does not. The screen"
  echo "      draws the same dash for both, so the two are indistinguishable on the"
  echo "      page while being different rows in Postgres."
fi

# ⚠️⚠️ AND THE PREMISE UNDER *EMPTY MEANS ABSENT, ONCE*: POSTGRES KEEPS `''` AND
# `null` APART, AND THE SCREEN CANNOT. `optional()` in the app turns an untouched
# box into a real `null`, and the reason that decision matters is measured here
# rather than assumed — a `contact_name` of `''` is a contact this shop HAS, it
# renders as the same `ES.providers.fields.blank` dash a `null` does, and every
# `coalesce` in a report nobody has written yet will disagree with the page.
#
# ⚠️ NO CHECK IN THIS REPOSITORY CAN CALL `optional()` — it is a TypeScript function
# and this is a shell script. `app/test/api-provider-directory.test.ts` is the
# instrument for the DECISION; this is the instrument for the CONSEQUENCE, and the
# two halves are named in both files so neither is mistaken for the other.
TOKEN="$OWNER_TOKEN"
BLANK_BODY="$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "name": "Vacio contra nulo",
                  "contact_name": ""}))' "$WORKSPACE_ID")"
BLANK_OUT="$(api POST "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING" "$BLANK_BODY")"
BLANK_ID="$(first id "$(body "$BLANK_OUT")")"
note
if [[ -z "$BLANK_ID" ]]; then
  fail "could not create a supplier with an empty-string contact ($(status "$BLANK_OUT"))"
else
  EMPTY_READ="$(api GET "/rest/v1/$DIRECTORY_TABLE?select=contact_name&contact_name=eq.&$DETAIL_ID_COLUMN=eq.$BLANK_ID")"
  NULL_READ="$(api GET "/rest/v1/$DIRECTORY_TABLE?select=contact_name&contact_name=is.null&$DETAIL_ID_COLUMN=eq.$BLANK_ID")"
  if [[ "$(rows_of "$(body "$EMPTY_READ")")" == "1" && "$(rows_of "$(body "$NULL_READ")")" == "0" ]]; then
    ok "Postgres keeps '' and null apart on contact_name, so optional() sending null matters"
  else
    fail "'' AND null ARE NOT DISTINGUISHABLE ON contact_name."
    echo "        contact_name=eq.    $(rows_of "$(body "$EMPTY_READ")") row(s)"
    echo "        contact_name=is.null $(rows_of "$(body "$NULL_READ")") row(s)"
    echo "      If a migration added a check or a trigger folding one into the other,"
    echo "      optional()'s decision in @/api/providerDirectory is now ceremony and"
    echo "      its comment — 'empty means absent, once' — has become false."
  fi
fi

# --- 3. ⚠️⚠️ THE FENCE. A CASHIER IS REFUSED, TWO DIFFERENT WAYS. -----------
# This is the assertion the task exists for and the only instrument it ever gets.
TOKEN="$STAFF_TOKEN"

# (a) she CAN read. `provider_select` is `my_workspaces()` with no role in it, and
#     the directory being open to her rests entirely on that.
STAFF_READ="$(api GET "/rest/v1/$DIRECTORY_TABLE?select=$DETAIL_COLUMNS&$DETAIL_ID_COLUMN=eq.$CENTRO_ID")"
note
if [[ "$(status "$STAFF_READ")" == "200" && "$(rows_of "$(body "$STAFF_READ")")" == "1" ]]; then
  ok "a cashier READS a supplier's contact details — provider_select has no role in it"
else
  fail "A CASHIER CANNOT READ A SUPPLIER ($(status "$STAFF_READ") $(body "$STAFF_READ"))."
  echo "      provider_select is workspace_id in (select my_workspaces()) in 0002, with"
  echo "      no role gate. Proveedores is drawn for her on that basis: if the policy"
  echo "      was narrowed, the screen must stop being offered to her and Inicio's"
  echo "      door needs a fence it does not currently have."
fi

# (b) an INSERT is a 403 with 42501.
STAFF_INSERT="$(api POST "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING" \
  "$(insert_body "$INSERT_COLUMNS" "$WORKSPACE_ID" 'Proveedor del turno' '' '' '')")"
note
staff_code="$(code_of "$(body "$STAFF_INSERT")")"
if [[ "$(status "$STAFF_INSERT")" == "403" && "$staff_code" == "42501" ]]; then
  ok "a cashier is refused an INSERT — 42501 on a 403, the code the app maps"
elif [[ "$(status "$STAFF_INSERT")" == "403" ]]; then
  # ⚠️ REFUSED, BUT NOT WITH THE CODE THE APP KEYS ON. She is safe and she is told
  # the wrong thing: an unmapped code falls through to `@/api/errors`, where 42501
  # is *"Tu sesión se cerró"* — a cashier sent round a loop she cannot leave.
  fail "a cashier is refused an INSERT with '$staff_code', and the app maps 42501."
  echo "      She is fenced out correctly and told the wrong sentence."
else
  fail "A CASHIER CREATED A SUPPLIER (HTTP $(status "$STAFF_INSERT"), code '$staff_code')."
  echo "      provider_insert is has_role(workspace_id, 'manager') in 0002 and this is"
  echo "      the only instrument in this repository that can see it: no typecheck,"
  echo "      suite or bundler has ever read a policy, and CREATE POLICY is not in the"
  echo "      knowledge graph. If the policy was widened deliberately, providerRows"
  echo "      must stop hiding the create row from her."
fi

# (c) ⚠️⚠️ AN UPDATE IS A 200 WITH `[]`, AND THAT IS THE WHOLE POINT OF ASKING FOR
#     THE ROW BACK. `provider_update`'s `using` clause makes the row INVISIBLE
#     rather than refusing the write, so a PATCH that asked for nothing back would
#     report success for a write that never happened.
STAFF_PATCH="$(api PATCH "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING&$DETAIL_ID_COLUMN=eq.$CENTRO_ID" \
  "$(patch_body "$NAME_PATCH_COLUMNS" 'Bodega del turno')")"
note
staff_rows="$(rows_of "$(body "$STAFF_PATCH")")"
if [[ "$(status "$STAFF_PATCH")" == "200" && "$staff_rows" == "0" ]]; then
  ok "a cashier's UPDATE is a 200 with zero rows — invisible, not forbidden"
elif [[ "$(status "$STAFF_PATCH")" == "403" ]]; then
  fail "a cashier's UPDATE came back 403 rather than 200 with []."
  echo "      That is SAFER and the app is now wrong about it: providerWriteErrorMessage"
  echo "      maps PGRST116 for this path, and .select().single() is described in"
  echo "      @/api/calls as load-bearing. Both comments have become false."
else
  fail "A CASHIER RENAMED A SUPPLIER (HTTP $(status "$STAFF_PATCH"), $staff_rows row(s))."
  echo "      provider_update is has_role(workspace_id, 'manager') in 0002."
fi

# ⚠️ AND THE NAME DID NOT MOVE. A 200 with `[]` proves the row was invisible to
# her; this proves nothing was written, which is the claim a shopkeeper cares about.
TOKEN="$OWNER_TOKEN"
STILL="$(api GET "/rest/v1/$DIRECTORY_TABLE?select=name&$DETAIL_ID_COLUMN=eq.$CENTRO_ID")"
note
if [[ "$(body "$STILL")" == *"$CENTRO_NAME"* ]]; then
  ok "and the supplier still has the name a manager gave her"
else
  fail "the supplier's name is now $(body "$STILL")"
fi

# --- 5. the generic row: no delete, no demotion, and DEACTIVATION IS ALLOWED --
GENERIC_ID="$(first id "$(body "$(api GET "/rest/v1/$DIRECTORY_TABLE?select=id&is_generic=is.true")")")"
note
if [[ -n "$GENERIC_ID" ]]; then
  ok "the shop onboard_workspace made has exactly one generic supplier to guard"
else
  fail "the new shop has no generic provider — F6 and 0039 both say it should"
fi

GENERIC_DELETE="$(api DELETE "/rest/v1/$DIRECTORY_TABLE?$DETAIL_ID_COLUMN=eq.$GENERIC_ID")"
note
# ⚠️ `0002` GIVES `provider` NO DELETE POLICY AT ALL, so this is refused by RLS
# BEFORE `provider_protect_generic` ever runs — which is why the assertion is
# *nothing was deleted* rather than *the trigger fired*. A DELETE nothing may see
# is a 204 over zero rows, not an error.
GENERIC_STILL="$(api GET "/rest/v1/$DIRECTORY_TABLE?select=id&$DETAIL_ID_COLUMN=eq.$GENERIC_ID")"
if [[ "$(rows_of "$(body "$GENERIC_STILL")")" == "1" ]]; then
  ok "the generic supplier survives a DELETE — no delete policy, and a trigger behind it"
else
  fail "THE GENERIC SUPPLIER WAS DELETED (delete answered $(status "$GENERIC_DELETE"))."
  echo "      0002 gives provider no delete policy and provider_protect_generic raises"
  echo "      restrict_violation on top of that. A shop with no generic row opens"
  echo "      Comprar with no default and record_purchase refuses every delivery."
fi

DEMOTE="$(api PATCH "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING&$DETAIL_ID_COLUMN=eq.$GENERIC_ID" \
  "$(patch_body is_generic false)")"
note
if [[ "$(status "$DEMOTE")" != "200" ]]; then
  ok "the generic supplier cannot be demoted — provider_protect_generic, $(status "$DEMOTE")"
else
  fail "THE GENERIC SUPPLIER WAS DEMOTED. provider_protect_generic is supposed to"
  echo "      raise restrict_violation on exactly this, and the partial unique index"
  echo "      cannot catch a workspace left with NO generic row."
fi

# ⚠️⚠️ AND NOW THE ONE THE DATABASE DOES **NOT** STOP, WHICH IS WHY `canRetire`
# EXISTS. `provider_protect_generic` guards a DELETE and a demotion and stops
# there — nothing prevents `is_active` false, and `providersFrom` compensates by
# keeping the generic row whatever `is_active` says. So the fence that matters is
# in the client, and this is the measurement that says so.
DEACTIVATE="$(api PATCH "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING&$DETAIL_ID_COLUMN=eq.$GENERIC_ID" \
  "$(patch_body "$ACTIVE_PATCH_COLUMNS" false)")"
note
if [[ "$(status "$DEACTIVATE")" == "200" && "$(rows_of "$(body "$DEACTIVATE")")" == "1" ]]; then
  ok "the generic supplier CAN be deactivated — so canRetire is the only fence there is"
else
  fail "the database refused to deactivate the generic supplier ($(status "$DEACTIVATE"))."
  echo "      That is SAFER and it makes a comment false: @/api/providerDirectory says"
  echo "      provider_protect_generic 'refuses to delete it and refuses to demote it"
  echo "      and stops there', and canRetire is described as the whole fence. If a"
  echo "      migration closed this, say so there — a client fence nobody needs is a"
  echo "      control a session will delete."
fi
# ⚠️ PUT BACK IMMEDIATELY. Everything after this reads the shop's suppliers, and a
# deactivated generic row is exactly the broken state this assertion is about.
api PATCH "/rest/v1/$DIRECTORY_TABLE?$DETAIL_ID_COLUMN=eq.$GENERIC_ID" \
  "$(patch_body "$ACTIVE_PATCH_COLUMNS" true)" > /dev/null
note
RESTORED="$(api GET "/rest/v1/$DIRECTORY_TABLE?select=is_active&$DETAIL_ID_COLUMN=eq.$GENERIC_ID")"
if [[ "$(body "$RESTORED")" == *'true'* ]]; then
  ok "and it is switched back on, so nothing downstream inherits a shop with no default"
else
  fail "the generic supplier is still deactivated — $(body "$RESTORED")"
fi

# ⚠️ AN ORDINARY SUPPLIER RETIRES, WHICH IS WHAT `Quitar proveedor` SENDS.
RETIRE="$(api PATCH "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING&$DETAIL_ID_COLUMN=eq.$PENA_ID" \
  "$(patch_body "$ACTIVE_PATCH_COLUMNS" false)")"
note
if [[ "$(status "$RETIRE")" == "200" && "$(rows_of "$(body "$RETIRE")")" == "1" ]]; then
  ok "an ordinary supplier is retired with is_active false, the app's own patch"
else
  fail "retiring an ordinary supplier answered $(status "$RETIRE") $(body "$RETIRE")"
fi

# ⚠️⚠️ AND SHE IS STILL THERE, WHICH IS THE HALF `ES.providers.edit.retireOnce`
# PROMISES. The row is not deleted — it leaves the directory because
# `providersFrom` drops it, and every purchase recorded against her keeps its
# counterparty. A shopkeeper told *las compras que ya registraste no cambian* is
# owed that being true.
GONE="$(api GET "/rest/v1/$DIRECTORY_TABLE?select=id,is_active&$DETAIL_ID_COLUMN=eq.$PENA_ID")"
note
if [[ "$(rows_of "$(body "$GONE")")" == "1" && "$(body "$GONE")" == *'false'* ]]; then
  ok "a retired supplier is still a row — nothing is deleted, which is what the app says"
else
  fail "a retired supplier read back as $(body "$GONE")"
fi

# --- 6. another shop sees none of it ---------------------------------------
TOKEN="$NEIGHBOUR_TOKEN"
NEIGHBOUR_READ="$(api GET "/rest/v1/$DIRECTORY_TABLE?select=$DETAIL_COLUMNS&$DETAIL_ID_COLUMN=eq.$CENTRO_ID")"
note
if [[ "$(status "$NEIGHBOUR_READ")" == "200" && "$(rows_of "$(body "$NEIGHBOUR_READ")")" == "0" ]]; then
  ok "another shop's manager reads none of this shop's suppliers — 200 and []"
else
  fail "ANOTHER SHOP READ THIS SHOP'S SUPPLIERS ($(status "$NEIGHBOUR_READ") $(body "$NEIGHBOUR_READ"))."
  echo "      provider_select is workspace_id in (select my_workspaces()) in 0002."
fi

NEIGHBOUR_PATCH="$(api PATCH "/rest/v1/$DIRECTORY_TABLE?select=$WRITE_RETURNING&$DETAIL_ID_COLUMN=eq.$CENTRO_ID" \
  "$(patch_body "$NAME_PATCH_COLUMNS" 'Mi bodega ahora')")"
note
if [[ "$(rows_of "$(body "$NEIGHBOUR_PATCH")")" == "0" ]]; then
  ok "and she cannot rename one — invisible to her too, the same 200 with []"
else
  fail "ANOTHER SHOP'S MANAGER RENAMED THIS SHOP'S SUPPLIER."
  echo "      $(status "$NEIGHBOUR_PATCH") $(body "$NEIGHBOUR_PATCH")"
fi

# --- verdict ---------------------------------------------------------------
echo
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — app/src/api/providerDirectory.ts still describes"
  echo "the database: the detail read carries the three columns Comprar's does not, the"
  echo "insert body lands with all four fields and with one, A CASHIER IS REFUSED BOTH"
  echo "WAYS (403 on an insert, 200-with-[] on an update), normalize_name folds case and"
  echo "whitespace and NOT accents, THE GENERIC ROW CAN STILL BE DEACTIVATED so canRetire"
  echo "is the only fence there is, and another shop sees none of it."
  exit 0
fi
echo "$fails of $ran assertion group(s) failed."
echo "⚠️ Nothing else in this repository can see any of this: no typecheck, suite or"
echo "   bundler has ever read a policy, CREATE POLICY is not in the knowledge graph,"
echo "   and RLS is bypassed by the postgres superuser. Fix the app or amend the"
echo "   contract — do not loosen this check to match."
exit 1

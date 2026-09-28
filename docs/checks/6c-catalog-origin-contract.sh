#!/usr/bin/env bash
# 6c-catalog-origin-contract — does `app/src/api/catalogEdit.ts` still describe
# `public.product_variant`, and is `0042`'s fence real over HTTP?
#
# ⚠️⚠️ FIVE CLAIMS LIVE HERE AND NOWHERE ELSE IN THIS REPOSITORY.
#
#   1. ⚠️⚠️ **`restrict_violation` IS AN HTTP 400 WITH CODE `23001`.** Not a 403, not
#      a 409. A trigger's exception is neither a privilege error nor a uniqueness
#      conflict, so PostgREST's mapping is the only thing that decides what a
#      shopkeeper's phone receives — and `catalogEditErrorMessage` keys on the code.
#      Nothing else in this repository can see it: the SQL suite
#      `supabase/tests/0042_catalog_origin.sql` sees SQLSTATE 23001 and no HTTP
#      status at all ([[custom-sqlstate-arrives-as-400]]).
#
#   2. ⚠️⚠️ **`VARIANT_EDIT_COLUMNS` STILL ANSWERS, AND `is_prebuilt` COMES BACK AS A
#      JSON BOOLEAN.** The two figures beside it are `::text` casts and this one is
#      not; a cast added by a future session would hand `canRetireProduct` the string
#      `'false'`, which is truthy, and **hide the retire control on every product the
#      shop made.** A renamed or cast column compiles, bundles and passes all 1,513
#      Vitest tests.
#
#   3. ⚠️⚠️ **FINDING 1, DRIVEN OVER THE WIRE: A PREBUILT PRODUCT IS STILL RENAMED AND
#      REPRICED BY THE APP'S OWN PATCH BODIES.** `NAME_PATCH_COLUMNS` and
#      `SETTINGS_PATCH_COLUMNS` are sent as the app builds them. This is the assertion
#      that would have caught the version of `0042` that put `is_prebuilt = false`
#      into `product_variant_update`'s `using` clause — a migration that reads
#      correctly, merges automatically and breaks the catalog it was written to
#      protect.
#
#   4. ⚠️ **THE ASYMMETRY.** A shop row can be promoted to prebuilt and a prebuilt row
#      cannot be demoted. The first is an import's only way in — nothing can mark a
#      row prebuilt except an INSERT that says so or this UPDATE — and the first
#      writing of `0042` fenced both directions and made the marker unsettable.
#
#   5. ⚠️⚠️ **A CASHIER IS REFUSED THE OTHER WAY AND IT IS NOT AN ERROR.**
#      `product_variant_update` is `has_role(…, 'manager')`, so her PATCH never
#      reaches the trigger: the row is INVISIBLE rather than forbidden and she gets
#      **200 with `[]`** ([[rls-update-refusal-is-a-200]]). If the fence ever answered
#      her with 23001 it would be telling somebody the policy already excluded that a
#      distinction exists. ⚠️ RLS is bypassed by the `postgres` superuser, so a check
#      run as superuser passes this vacuously — which is why it is here and not in SQL.
#
# WHAT IS DELIBERATELY NOT ASSERTED HERE:
#
#   ⚠️ `canRetireProduct` ITSELF. It is a TypeScript function and this is a shell
#   script; `app/test/api-catalog-edit.test.ts` owns that half, and this asserts the
#   CONSEQUENCE the database can be asked about
#   ([[a-shell-check-cannot-see-a-pure-function]]).
#
#   ⚠️ THE BACKFILL. `0042` writes no `update`, so no row in a fresh database
#   witnesses the owner's 2026-09-24 ruling — `pg_attribute.attmissingval` records
#   it and that is a catalog read, which `supabase/tests/0042_catalog_origin.sql`
#   §2 owns.
#
# Run:  supabase start && supabase db reset && bash docs/checks/6c-catalog-origin-contract.sh
# Exit: 0 when every group holds; 1 otherwise.

set -uo pipefail

CONTRACT="${1:-app/src/api/catalogEdit.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- the contract, read out of the app --------------------------------------
# ⚠️ EVERY STRING BELOW IS THE MODULE'S OWN. A check that retypes a contract is
# asserting itself — `5h-ii-a`'s rule, obeyed by every check since.
str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }

VARIANT_TABLE="$(str VARIANT_TABLE "$CONTRACT")"
VARIANT_EDIT_COLUMNS="$(str VARIANT_EDIT_COLUMNS "$CONTRACT")"
NAME_PATCH_COLUMNS="$(str NAME_PATCH_COLUMNS "$CONTRACT")"
SETTINGS_PATCH_COLUMNS="$(str SETTINGS_PATCH_COLUMNS "$CONTRACT")"
ACTIVE_PATCH_COLUMNS="$(str ACTIVE_PATCH_COLUMNS "$CONTRACT")"
UPDATE_RETURNING="$(str UPDATE_RETURNING "$CONTRACT")"

note
for name in VARIANT_TABLE VARIANT_EDIT_COLUMNS NAME_PATCH_COLUMNS \
            SETTINGS_PATCH_COLUMNS ACTIVE_PATCH_COLUMNS UPDATE_RETURNING; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app"
    echo "      This check asserts the app's own constants against a real database."
    echo "      If it cannot find them it has nothing to assert, and a green here"
    echo "      would be the vacuous kind ADR-035 §9 refuses."
    exit 1
  fi
done
ok "read from $CONTRACT: edit=$VARIANT_EDIT_COLUMNS active=$ACTIVE_PATCH_COLUMNS"

# ⚠️⚠️ THE ONE ASSERTION ABOUT THE APP RATHER THAN THE WIRE, AND IT IS THE HINGE OF
# THE WHOLE ROW. The marker must be on the read and must NOT be on any patch body:
# `0042`'s fence refuses a demotion, so a marker that reached a patch would be this
# app sending a write it can only be refused for.
note
case ",$VARIANT_EDIT_COLUMNS," in
  *",is_prebuilt,"*) marker_read=1 ;;
  *) marker_read=0 ;;
esac
marker_written=0
for list in "$NAME_PATCH_COLUMNS" "$SETTINGS_PATCH_COLUMNS" "$ACTIVE_PATCH_COLUMNS"; do
  case ",$list," in *",is_prebuilt,"*) marker_written=1 ;; esac
done
if [[ "$VARIANT_EDIT_COLUMNS" == *'is_prebuilt::text'* ]]; then
  fail "VARIANT_EDIT_COLUMNS CASTS THE MARKER TO TEXT."
  echo "      The two figures beside it are ::text because numeric arrives as a JSON"
  echo "      double. A cast boolean arrives as the STRING 'false', which is truthy —"
  echo "      so canRetireProduct would hide the retire control on every product the"
  echo "      shop made, and nothing in the Vitest suite reads the wire."
elif (( marker_read == 0 )); then
  fail "VARIANT_EDIT_COLUMNS no longer asks for is_prebuilt — the retire control has"
  echo "      nothing to draw on, which is the state this row was written to end."
elif (( marker_written == 1 )); then
  fail "A PATCH BODY NOW CARRIES is_prebuilt."
  echo "      0042's trigger refuses a demotion with 23001, so this app would be"
  echo "      sending a write it can only be refused for. The marker is read and"
  echo "      never written by a screen."
else
  ok "the marker is on the one-variant read and on none of the three patch bodies"
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
# assertion 5 would pass vacuously, which is the trap `supabase/README.md` records
# about the `postgres` superuser.
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
# ⚠️ A RESPONSE BODY IS WRITTEN TO A FILE AND NEVER INTERPOLATED INTO PYTHON SOURCE
# — PostgREST's messages quote a column name, and those escaped quotes pasted into a
# literal make the check go red for the wrong reason.
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
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"catalog-origin-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  echo "      GoTrue rate-limits signup and answers with an EMPTY BODY when it does."
  exit 1
}

patch_body() { # key value  ("true"/"false" -> bool, digits+dot -> number, else text)
  python3 -c '
import json, sys
key, raw = sys.argv[1], sys.argv[2]
if raw in ("true", "false"):
    val = raw == "true"
else:
    val = raw
print(json.dumps({key: val}))' "$@"
}
settings_body() { # "tax_rate,pack_size" rate size
  python3 -c '
import json, sys
cols = sys.argv[1].split(",")
vals = sys.argv[2:]
# ⚠️ THE COUNTS MUST MATCH, AND THIS assert IS NOT DEFENSIVE — zip stops at the
# shorter list, so a column added to SETTINGS_PATCH_COLUMNS would silently never be
# sent and this check would stay green about a body the app had changed.
assert len(cols) == len(vals), (
    "SETTINGS_PATCH_COLUMNS names %d column(s) and this harness has %d value(s): %s"
    % (len(cols), len(vals), cols))
print(json.dumps(dict(zip(cols, vals))))' "$@"
}

STAMP="$$-$(date +%s)"
OWNER_EMAIL="origin-owner-$STAMP@example.com"
STAFF_EMAIL="origin-staff-$STAMP@example.com"

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Catalogo 6c","p_prices_include_tax":true,"p_location_name":null}')"
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

# --- the fixture: two products, one ours and one his ------------------------
# ⚠️⚠️ THE PREBUILT ROW IS MADE BY THE APP'S OWN PATH — an insert with no marker and
# then a PATCH promoting it — RATHER THAN BY A SEEDED FIXTURE. There is no seeded
# catalog anywhere in `supabase/migrations/`; `6c` ships the marker and the import is
# a later job. So this harness reaches a prebuilt row the only way anything can, and
# assertion 4 is what makes that possible rather than a convenience.
TOKEN="$OWNER_TOKEN"
FAMILY_OUT="$(api POST '/rest/v1/product_family?select=id' \
  "{\"workspace_id\":\"$WORKSPACE_ID\",\"name\":\"Verdura 6c\"}")"
FAMILY_ID="$(first id "$(body "$FAMILY_OUT")")"
[[ -n "$FAMILY_ID" ]] || {
  echo "FAIL: could not create a family — $(status "$FAMILY_OUT") $(body "$FAMILY_OUT")"
  exit 1
}

make_variant() { # name -> id
  local out
  out="$(api POST '/rest/v1/product_variant?select=id' "$(python3 -c '
import json, sys
print(json.dumps({"workspace_id": sys.argv[1], "family_id": sys.argv[2], "name": sys.argv[3],
                  "base_unit_code": "pza", "purchase_unit_code": "pza",
                  "sell_unit_code": "pza", "price_unit_code": "pza"}))' \
    "$WORKSPACE_ID" "$FAMILY_ID" "$1")")"
  first id "$(body "$out")"
}
OURS_ID="$(make_variant 'Jitomate nuestro')"
HIS_ID="$(make_variant 'Chile suyo')"
[[ -n "$OURS_ID" && -n "$HIS_ID" ]] || { echo "FAIL: could not create the two products"; exit 1; }

# --- 2. the read, and the marker's JSON type --------------------------------
FRESH="$(api GET "/rest/v1/$VARIANT_TABLE?select=$VARIANT_EDIT_COLUMNS&id=eq.$HIS_ID")"
FRESH_FILE="$(stash fresh "$FRESH")"
cat > "$SCRATCH/fresh.py" <<'PY'
import json, sys
path, cols = sys.argv[1], sys.argv[2].split(',')
try:
    rows = json.load(open(path))
except Exception as exc:
    print('unreadable: %s' % exc); raise SystemExit
if not isinstance(rows, list) or len(rows) != 1:
    print('the one-variant read came back as %r — a renamed column is a 400 here and '
          'nothing else in this repository reads it' % (rows,)); raise SystemExit
row = rows[0]
want = [c.split('::')[0] for c in cols]
missing = [c for c in want if c not in row]
if missing:
    print('the read asked for columns the row does not have: %s' % missing); raise SystemExit
extra = [c for c in row if c not in want]
if extra:
    print('the read carried columns nobody asked for: %s' % extra); raise SystemExit
# ⚠️⚠️ THE TYPES AND NOT ONLY THE KEYS. This is the whole assertion: the two figures
# must arrive as STRINGS (they are ::text, and parseDecimal refuses a JSON double)
# and the marker must arrive as a BOOLEAN. `'false'` is truthy in TypeScript.
if not isinstance(row['tax_rate'], str) or not isinstance(row['pack_size'], str):
    print('a figure came back as %r/%r rather than as a string — the ::text casts are '
          'what keep a double out of the money path'
          % (type(row['tax_rate']).__name__, type(row['pack_size']).__name__))
    raise SystemExit
if not isinstance(row['is_prebuilt'], bool):
    print('is_prebuilt came back as %r (%r) rather than as a JSON boolean. The string '
          "'false' is TRUTHY, so canRetireProduct would hide the retire control on "
          'every product the shop made.' % (row['is_prebuilt'], type(row['is_prebuilt']).__name__))
    raise SystemExit
if row['is_prebuilt'] is not False:
    print('a product this app just inserted came back is_prebuilt=%r. 0042 sets the '
          'DEFAULT to false precisely so VARIANT_INSERT_COLUMNS needs no new column — '
          'every product made through Agregar is his without the app saying so.'
          % (row['is_prebuilt'],))
    raise SystemExit
print('ok — two figures as strings, the marker as a boolean, and a new product is the shop\'s')
PY
verdict "the one-variant read answers, and the marker is a boolean" \
  "$SCRATCH/fresh.py" "$FRESH_FILE" "$VARIANT_EDIT_COLUMNS"

# --- 4. the asymmetry: a promotion is allowed, a demotion is not ------------
PROMOTE="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$OURS_ID&select=$UPDATE_RETURNING" \
  "$(patch_body is_prebuilt true)")"
note
if [[ "$(status "$PROMOTE")" == "200" && "$(rows_of "$(body "$PROMOTE")")" == "1" ]]; then
  ok "a shop row can be PROMOTED to prebuilt — the only way an import gets in"
else
  fail "PROMOTING A ROW TO PREBUILT WAS REFUSED: $(status "$PROMOTE") $(body "$PROMOTE")"
  echo "      Nothing can mark a row prebuilt except an INSERT that says so or this"
  echo "      PATCH. Fencing both directions makes the marker unsettable by the seed,"
  echo "      by a fixture, by a maintenance job and by any later migration — which is"
  echo "      exactly what the first writing of 0042 did, and what a probe found."
  echo "      provider_protect_generic refuses a demotion and permits a promotion."
  exit 1
fi

DEMOTE="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$OURS_ID&select=$UPDATE_RETURNING" \
  "$(patch_body is_prebuilt false)")"
note
if [[ "$(status "$DEMOTE")" == "400" && "$(code_of "$(body "$DEMOTE")")" == "23001" ]]; then
  ok "and CANNOT be demoted back to the shop — 400 23001"
else
  fail "a demotion answered $(status "$DEMOTE") code '$(code_of "$(body "$DEMOTE")")'"
  echo "      This is the direction that matters: flipping the marker back hands the"
  echo "      shopkeeper a delete on a catalog row that is not his, through a PATCH"
  echo "      the app never sends and PostgREST would accept without complaint."
fi

# --- 1. THE FENCE, AND THE NUMBER THE CLIENT MAPS --------------------------
REFUSED="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$OURS_ID&select=$UPDATE_RETURNING" \
  "$(patch_body "$ACTIVE_PATCH_COLUMNS" false)")"
note
if [[ "$(status "$REFUSED")" == "400" && "$(code_of "$(body "$REFUSED")")" == "23001" ]]; then
  ok "retiring a prebuilt product is refused HTTP 400 code 23001, the code the app maps"
else
  fail "RETIRING A PREBUILT PRODUCT ANSWERED $(status "$REFUSED") code '$(code_of "$(body "$REFUSED")")'"
  echo "      Body: $(body "$REFUSED")"
  echo "      catalogEditErrorMessage keys on the STRING '23001' and gives"
  echo "      ES.catalog.errors.notYours. A 403 would be read as notAllowedEdit — a"
  echo "      sentence about permission, which is FALSE here: the same manager may"
  echo "      rename and reprice this product. A 409 or an unmapped code falls"
  echo "      through to @/api/errors and says nothing she could act on."
  echo "      ⚠️ If the mapping moved, amend the code in app/src/api/catalogEdit.ts —"
  echo "      do not widen this check."
fi

# ⚠️ AND THE ROW IS STILL THERE. A fence that refused and deactivated anyway is the
# worst of both, and a 400 alone cannot see it.
STILL="$(api GET "/rest/v1/$VARIANT_TABLE?select=id,is_active&id=eq.$OURS_ID")"
note
if [[ "$(first is_active "$(body "$STILL")")" == "True" ]]; then
  ok "and the prebuilt product is still in the catalog afterwards"
else
  fail "the refusal did not roll the row back: $(body "$STILL")"
fi

# --- 3. FINDING 1: a prebuilt product is still renamed and repriced ---------
RENAMED="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$OURS_ID&select=id,name" \
  "$(patch_body "$NAME_PATCH_COLUMNS" 'Jitomate bola')")"
note
if [[ "$(status "$RENAMED")" == "200" && "$(first name "$(body "$RENAMED")")" == "Jitomate bola" ]]; then
  ok "FINDING 1 HOLDS: the shopkeeper can still RENAME a product that came with the app"
else
  fail "RENAMING A PREBUILT PRODUCT WAS REFUSED: $(status "$RENAMED") $(body "$RENAMED")"
  echo "      This is the defect 6c's row calls out by name. The obvious spelling of"
  echo "      0042 adds is_prebuilt = false to product_variant_update's using clause;"
  echo "      it reads correctly, merges automatically, and stops him pricing and"
  echo "      renaming an imported product — which is the entire reason for importing"
  echo "      one. He must be able to set his own prices on our catalog; he must not"
  echo "      be able to remove it. A using clause sees a ROW, never a TRANSITION, so"
  echo "      the rule has to be a trigger."
  exit 1
fi

REPRICED="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$OURS_ID&select=id,tax_rate::text,pack_size::text" \
  "$(settings_body "$SETTINGS_PATCH_COLUMNS" '0.1600' '24')")"
note
if [[ "$(status "$REPRICED")" == "200" ]]; then
  ok "and can set his own IVA and pack size on it — the app's own settings body"
else
  fail "the settings patch on a prebuilt product was refused: $(status "$REPRICED") $(body "$REPRICED")"
  echo "      Same argument as the rename above, on the two figures Editar changes."
fi

# ⚠️ AND HIS OWN PRODUCT CAN STILL BE RETIRED, which is the capability this row
# RESTORES rather than the fence it adds. A check that only measured the refusal
# would be green on a screen with no retire control at all.
RETIRED="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$HIS_ID&select=$UPDATE_RETURNING" \
  "$(patch_body "$ACTIVE_PATCH_COLUMNS" false)")"
note
if [[ "$(status "$RETIRED")" == "200" && "$(rows_of "$(body "$RETIRED")")" == "1" ]]; then
  ok "a product the shop CREATED is retired by the app's own patch — the capability restored"
else
  fail "retiring the shop's own product answered $(status "$RETIRED") $(body "$RETIRED")"
  echo "      Editar's retire control has been drawn on NOTHING since 2026-09-23 and"
  echo "      this row is what gives it back. If this is red, 6c shipped a fence and"
  echo "      no capability."
fi

# --- 5. the cashier, and the refusal that is not an error -------------------
TOKEN="$STAFF_TOKEN"
HER_TRY="$(api PATCH "/rest/v1/$VARIANT_TABLE?id=eq.$OURS_ID&select=$UPDATE_RETURNING" \
  "$(patch_body "$ACTIVE_PATCH_COLUMNS" false)")"
note
if [[ "$(status "$HER_TRY")" == "200" && "$(rows_of "$(body "$HER_TRY")")" == "0" ]]; then
  ok "the cashier's retire is SILENT — 200 and zero rows, never 23001"
elif [[ "$(code_of "$(body "$HER_TRY")")" == "23001" ]]; then
  fail "THE CASHIER GOT THE TRIGGER'S ERROR RATHER THAN RLS'S SILENCE."
  echo "      product_variant_update is has_role(…, 'manager'), so her PATCH should"
  echo "      never reach the trigger at all: the row is INVISIBLE to her update"
  echo "      rather than forbidden. Reaching the trigger means the policy moved, and"
  echo "      the fence is now telling somebody the policy already excluded that a"
  echo "      distinction between our rows and hers exists."
else
  fail "the cashier's retire answered $(status "$HER_TRY") $(body "$HER_TRY")"
fi

# ⚠️ AND SHE CAN READ THE MARKER, which leaks nothing and is what lets a manager
# demoted mid-shift still see a coherent screen. `select` is granted table-wide and
# `product_variant_select` is workspace-scoped with no column list.
HER_READ="$(api GET "/rest/v1/$VARIANT_TABLE?select=$VARIANT_EDIT_COLUMNS&id=eq.$OURS_ID")"
note
if [[ "$(status "$HER_READ")" == "200" && "$(rows_of "$(body "$HER_READ")")" == "1" ]]; then
  ok "and she can READ the marker — it says where a row came from, never what it cost"
else
  fail "the cashier could not read the one-variant row: $(status "$HER_READ") $(body "$HER_READ")"
fi

echo
if (( fails > 0 )); then
  echo "$ran assertion group(s) ran, $fails failed — 0042's fence does not behave the"
  echo "way app/src/api/catalogEdit.ts says it does."
  exit 1
fi
echo "all $ran assertion groups passed — a prebuilt product cannot be retired (400"
echo "23001), can still be renamed and repriced, and the shop's own products can go."

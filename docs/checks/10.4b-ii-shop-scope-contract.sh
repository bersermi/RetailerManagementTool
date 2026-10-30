#!/usr/bin/env bash
# 10.4b-ii-shop-scope-contract — does every read of a business's rows in
# `app/src/api/` keep a kitchen out of Wera?
#
# WHY THIS EXISTS. Since `0072` one login can own a shop and a kitchen, and the
# walls let her read every business she belongs to (`my_workspaces()`), so a read
# that asks for "the rows I may see" gets both. Measured 2026-10-29 on the local
# database: two stores, two generic suppliers, both memberships — and with two
# stores `useCatalog` resolves none, so Vender, Comprar and Merma drew no slider.
# Plan `10.4b-ii` reads a business's rows through ONE helper in
# `app/src/api/calls.ts`, `shopRows`, which filters on `SHOP_COLUMN` for the
# shop open in Wera. This check asks a real PostgREST whether that filter keeps
# the kitchen out, relation by relation.
#
# WHAT IT ASSERTS, all against a real round trip over HTTP:
#
#   1. The filter's column is read OUT OF `app/src/api/workspace.ts`
#      (`SHOP_COLUMN`), and the relations it is applied to OUT OF
#      `app/src/api/calls.ts` — every `shopRows(<relation>, …)`: a literal, a
#      constant resolved in the module that defines it, `DOCUMENTS_TABLE[kind]`
#      as that record's three tables, and the `table` handed to the two Números
#      reads as `app/src/api/hooks.ts` hands it. Nothing is retyped here, so a
#      read moved onto `shopRows` is checked without this file being edited.
#   2. One login owns a shop and a kitchen, each made the way its own app makes
#      it, and BOTH hold a row in every one of those relations — written through
#      the functions the apps call (a Te lo compro request as the owner of the
#      database, `8k`'s way, because its rules are not this check's).
#   3. For each relation: unfiltered, she reads the kitchen's rows — the walls'
#      answer, and what makes the group non-vacuous — and filtered on the shop as
#      the app filters, she reads the shop's rows and no other business's. Three
#      relations say more, because a screen takes a decision off the answer: ONE
#      store (`useCatalog` resolves a store only from one), ONE generic supplier
#      (Comprar's default) and ONE membership of hers (her role).
#
# ⚠️ WHAT IT DOES NOT ASSERT. That every read in `calls.ts` starts at `shopRows`:
# a read that skips it names no relation here, so `app/test/api-shop-scope.test.ts`
# holds the file to that. Nor the columns each read asks for — each module's own
# contract check holds those; here the select is the ownership column alone.
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. ⚠️ AND NO TAB AS A DELIMITER: whitespace IFS
# collapses empty fields, so a relation that failed to resolve would vanish
# rather than be reported (`|` below, and the reason is asserted, not inferred).
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.4b-ii-shop-scope-contract.sh
# With: $1 a copy of workspace.ts and $2 a copy of calls.ts — how the falsifier
#       points it at a broken one.
# Exit: 0 every relation keeps the kitchen out; 1 otherwise.

set -uo pipefail

WORKSPACE_TS="${1:-app/src/api/workspace.ts}"
CALLS_TS="${2:-app/src/api/calls.ts}"
API_DIR="app/src/api"
HOOKS_TS="$API_DIR/hooks.ts"
for f in "$WORKSPACE_TS" "$CALLS_TS" "$HOOKS_TS" "$API_DIR/documents.ts"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f"; exit 1; }
done

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the app's own claim, read out of its source ------------------------
SHOP_COL="$(sed -n "s/^export const SHOP_COLUMN = '\([^']*\)';.*/\1/p" "$WORKSPACE_TS" | head -1)"

# ⚠️ ONE LINE PER RELATION — `relation|read,read` — or `?|<what could not be
# resolved>` for an argument this reader does not understand, which is a FAIL
# below and never a skip.
python3 - "$CALLS_TS" "$API_DIR" "$HOOKS_TS" > "$SCRATCH/relations" <<'PY'
import glob, re, sys

calls_path, api_dir, hooks_path = sys.argv[1:4]

def code(path):
    text = open(path, encoding='utf-8').read()
    text = re.sub(r'/\*[\s\S]*?\*/', ' ', text)
    return re.sub(r'(^|[^:])//.*$', r'\1', text, flags=re.M)

consts = {}
for path in glob.glob(api_dir + '/*.ts'):
    for m in re.finditer(r"^export const (\w+)(?::[^=]*)? = '([^']*)';", code(path), re.M):
        consts[m.group(1)] = m.group(2)
record = re.search(r"export const DOCUMENTS_TABLE\b[^=]*=\s*\{([^}]*)\}", code(api_dir + '/documents.ts'))
documents = dict(re.findall(r"(\w+):\s*'([^']*)'", record.group(1))) if record else {}

functions, name, body = {}, None, []
for line in code(calls_path).split('\n'):
    start = re.match(r'^(?:export\s+)?(?:async\s+)?function\s+(\w+)', line)
    if name is None and start:
        name, body = start.group(1), [line]
        continue
    if name is None:
        continue
    body.append(line)
    if line == '}':
        functions[name] = '\n'.join(body)
        name = None

hooks = code(hooks_path)
reads = {}
for fn, text in functions.items():
    if fn == 'shopRows':
        continue
    for arg in re.findall(r'\bshopRows\(\s*([^,]+?)\s*,', text):
        if re.fullmatch(r"'[^']*'", arg):
            found = [arg.strip("'")]
        elif arg == 'DOCUMENTS_TABLE[kind]':
            found = list(documents.values())
        elif re.fullmatch(r'[A-Z][A-Z0-9_]*', arg):
            found = [consts.get(arg)]
        elif arg == 'table':
            kinds = re.findall(r'\b' + fn + r'(?:<[^>]*>)?\(\s*[^,()]+,\s*DOCUMENTS_TABLE\.(\w+)', hooks)
            found = [documents.get(k) for k in sorted(set(kinds))] or [None]
        else:
            found = [None]
        for relation in found:
            if relation is None:
                print('?|%s in %s' % (arg, fn))
            else:
                reads.setdefault(relation, []).append(fn)
for relation in sorted(reads):
    print('%s|%s' % (relation, ','.join(sorted(set(reads[relation])))))
PY

# ⚠️ THIRTEEN RELATIONS TODAY, FROM SIXTEEN READS. A floor, not a snapshot: a read
# that leaves `shopRows` lowers the count and turns this red here, and the suite
# names which. Raise it when a relation joins.
MIN_RELATIONS=13
RELATIONS="$(grep -c '^[a-z_][a-z_]*|' "$SCRATCH/relations")"
UNREAD="$(grep -c '^?|' "$SCRATCH/relations")"

note
if [[ -z "$SHOP_COL" ]]; then
  fail "could not read SHOP_COLUMN out of $WORKSPACE_TS"
  echo "      This check asserts the app's own filter against the database. Without it"
  echo "      there is nothing to assert, and a green here would be the vacuous kind."
  exit 1
fi
if (( UNREAD > 0 )); then
  fail "could not resolve what shopRows reads in $CALLS_TS: $(grep '^?|' "$SCRATCH/relations" | cut -d'|' -f2 | tr '\n' ';')"
  echo "      Each shopRows(<relation>, …) must name a literal, a constant exported from"
  echo "      app/src/api/, DOCUMENTS_TABLE[kind], or the 'table' hooks.ts hands it."
  exit 1
fi
if (( RELATIONS < MIN_RELATIONS )); then
  fail "only $RELATIONS relations are read through shopRows in $CALLS_TS, expected at least $MIN_RELATIONS"
  echo "      A read that left shopRows is a read a kitchen can leak into again;"
  echo "      app/test/api-shop-scope.test.ts names which."
  exit 1
fi
ok "read from the app: $SHOP_COL, over $RELATIONS relations — $(cut -d'|' -f1 "$SCRATCH/relations" | tr '\n' ' ' | sed 's/ $//')"

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
DB_URL="$(sed -n 's/^DB_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)"
  echo "      from the repository root — \`supabase status\` needs the project directory."
  exit 1
fi
# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE: the secret key bypasses RLS, and
# "the walls let her read the kitchen" would then be true of anybody.
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
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
first()  { python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['$1'] if isinstance(r,list) and r else '')" <<< "$2" 2>/dev/null; }
uuid()   { python3 -c 'import uuid;print(uuid.uuid4())'; }

as_owner_of_db() { # sql -> runs it as the database owner, the way the owner uses the dashboard
  if command -v psql > /dev/null; then
    psql "$DB_URL" -q -v ON_ERROR_STOP=1 -c "$1" > /dev/null
  else
    docker exec -i "$(docker ps --format '{{.Names}}' | grep -m1 '^supabase_db_')" \
      psql -U postgres -q -v ON_ERROR_STOP=1 -c "$1" > /dev/null
  fi
}

# ⚠️ SIGNUP IS RETRIED. GoTrue rate-limits it, and a rate-limited signup returns an
# EMPTY BODY rather than a 429 — which looks exactly like a broken harness.
signup() { # email -> sets TOKEN
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"scope-probe-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  exit 1
}

STAMP="$$-$(date +%s)"

# --- 2. one login, a shop and a kitchen, a row of each kind at both ---------
signup "scope-owner-$STAMP@example.com"
OWNER_UID="$(pick id "$(body "$(api GET /auth/v1/user)")")"
[[ -n "$OWNER_UID" ]] || { echo "FAIL: could not read the owner's own user id"; exit 1; }

# ⚠️ EACH MADE AS ITS OWN APP MAKES IT: the shop as every Wera build does, the
# kitchen with Wera Cocina's `p_kind` — the setup, not the claim.
SHOP="$(body "$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Tienda 10.4b-ii","p_prices_include_tax":true,"p_location_name":null}')" | tr -d '"')"
KITCHEN="$(body "$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Cocina 10.4b-ii","p_kind":"cocina"}')" | tr -d '"')"
[[ "$SHOP" =~ ^[0-9a-f-]{36}$ && "$KITCHEN" =~ ^[0-9a-f-]{36}$ ]] \
  || { echo "FAIL: could not make the shop ($SHOP) and the kitchen ($KITCHEN)"; exit 1; }

# ⚠️ EVERY BODY IS BUILT BY ONE SCRIPT, IN ITS OWN STEP, AND NEVER NESTED: a
# `python3 -c '…'` four `$(` deep is where bash 3.2 lost the product insert on
# this check's first run, and nothing said so but an empty id.
cat > "$SCRATCH/bodies.py" <<'PY'
import json, sys
kind, args = sys.argv[1], sys.argv[2:]
if kind == 'invite':
    ws, email, loc = args
    print(json.dumps({"p_workspace_id": ws, "p_email": email, "p_role": "staff", "p_location_ids": [loc]}))
elif kind == 'family':
    ws, name = args
    print(json.dumps({"workspace_id": ws, "name": name}))
elif kind == 'variant':
    ws, family, name = args
    print(json.dumps({"workspace_id": ws, "family_id": family, "name": name, "base_unit_code": "pza",
                      "purchase_unit_code": "pza", "sell_unit_code": "pza", "price_unit_code": "pza", "tax_rate": "0"}))
elif kind == 'purchase':
    doc, loc, provider, variant = args
    print(json.dumps({"p_id": doc, "p_location_id": loc, "p_provider_id": provider, "p_lines": [
        {"variant_id": variant, "qty_display": "6", "qty_display_unit": "pza", "unit_price_net_per_base": "5.000000"}]}))
elif kind == 'sale':
    doc, loc, variant = args
    print(json.dumps({"p_id": doc, "p_location_id": loc, "p_lines": [
        {"variant_id": variant, "qty_display": "2", "qty_display_unit": "pza", "unit_price_gross_per_base": "9.000000"}]}))
elif kind == 'waste':
    doc, loc, variant = args
    print(json.dumps({"p_id": doc, "p_location_id": loc, "p_lines": [
        {"variant_id": variant, "qty_display": "1", "qty_display_unit": "pza", "unit_price_gross_per_base": "9.000000",
         "reason": "caducado"}]}))
PY
bodyof() { python3 "$SCRATCH/bodies.py" "$@"; }

LANDED=""
stock() { # workspace label -> writes a row of every kind at that business
  local ws="$1" label="$2" loc gen family variant json out
  loc="$(first id "$(body "$(api GET "/rest/v1/location?select=id&workspace_id=eq.$ws")")")"
  gen="$(first id "$(body "$(api GET "/rest/v1/provider?select=id&workspace_id=eq.$ws&is_generic=is.true")")")"
  [[ -n "$loc" && -n "$gen" ]] || { LANDED+=" $label:no-store-or-generic"; return; }

  json="$(bodyof invite "$ws" "scope-staff-$label-$STAMP@example.com" "$loc")"
  out="$(api POST /rest/v1/rpc/create_invite "$json")"
  [[ "$(status "$out")" == "200" ]] || LANDED+=" $label:invite=$(status "$out")"

  json="$(bodyof family "$ws" "Familia $label")"
  out="$(api POST '/rest/v1/product_family?select=id' "$json")"
  family="$(first id "$(body "$out")")"
  json="$(bodyof variant "$ws" "$family" "Producto $label")"
  out="$(api POST '/rest/v1/product_variant?select=id' "$json")"
  variant="$(first id "$(body "$out")")"
  [[ -n "$variant" ]] || { LANDED+=" $label:product=$(status "$out")"; return; }

  json="$(bodyof purchase "$(uuid)" "$loc" "$gen" "$variant")"
  out="$(api POST /rest/v1/rpc/record_purchase "$json")"
  [[ "$(status "$out")" == "200" ]] || LANDED+=" $label:purchase=$(status "$out")"
  json="$(bodyof sale "$(uuid)" "$loc" "$variant")"
  out="$(api POST /rest/v1/rpc/record_sale "$json")"
  [[ "$(status "$out")" == "200" ]] || LANDED+=" $label:sale=$(status "$out")"
  json="$(bodyof waste "$(uuid)" "$loc" "$variant")"
  out="$(api POST /rest/v1/rpc/record_waste "$json")"
  [[ "$(status "$out")" == "200" ]] || LANDED+=" $label:waste=$(status "$out")"

  # ⚠️ AS THE OWNER OF THE DATABASE, `8k`'s way: what makes a request valid is its
  # own check's, and a kitchen asking Te lo compro is not a thing either app does.
  as_owner_of_db "insert into public.collection_request
      (id, workspace_id, location_id, pickup_date, window_start, window_end, street, street_number,
       city, postal_code, lines, created_by)
    values ('$(uuid)', '$ws', '$loc', current_date + 1, '09:00', '09:15', 'Sabino', '120',
       'Ciudad de México', '06400', '[{\"variant_name\":\"Producto $label\"}]', '$OWNER_UID')" \
    || LANDED+=" $label:collection"
}
stock "$SHOP" tienda
stock "$KITCHEN" cocina

note
if [[ -z "$LANDED" ]]; then
  ok "one login owns a shop and a kitchen, and each holds a store, a generic supplier, an invite, a product, a delivery, a sale, a write-off and a Te lo compro request"
else
  fail "the fixture did not land:$LANDED"
  echo "      Without a row at BOTH businesses every group below would pass for an"
  echo "      empty table rather than for the filter."
fi

# --- 3. relation by relation: the walls show both, the filter the shop ------
# ⚠️ THE VERDICT IS A FILE AND NOT A HEREDOC INSIDE `$( )`: an apostrophe in one
# (the shop's, Comprar's) makes bash 3.2 report an unexpected EOF at the end of
# the file — this check's first run, and a memory of this repository.
cat > "$SCRATCH/verdict.py" <<'PY'
import json, sys
relation, shop, kitchen, owner, all_status, scoped_status, all_path, scoped_path = sys.argv[1:9]
def rows(path):
    try:
        value = json.load(open(path))
    except Exception as exc:
        return 'unreadable: %s' % exc
    return value
every, scoped = rows(all_path), rows(scoped_path)
if all_status != '200' or not isinstance(every, list):
    print('the unfiltered read of %s answered %s %r' % (relation, all_status, every)); raise SystemExit
if scoped_status != '200' or not isinstance(scoped, list):
    print("the app's read of %s answered %s %r" % (relation, scoped_status, scoped)); raise SystemExit
if not any(r.get('workspace_id') == kitchen for r in every):
    print('unfiltered, %s held no row of the kitchen — the fixture, not the filter, would be green' % relation); raise SystemExit
if not scoped:
    print("filtered as the app filters, %s returned nothing — not even the shop's own rows" % relation); raise SystemExit
others = [r.get('workspace_id') for r in scoped if r.get('workspace_id') != shop]
if others:
    print("filtered as the app filters, %s returned %d row(s) of another business: %r" % (relation, len(others), sorted(set(others)))); raise SystemExit
if relation == 'location' and len(scoped) != 1:
    print('the shop has one store and the read returned %d — useCatalog resolves a store only from one' % len(scoped)); raise SystemExit
if relation == 'provider' and sum(1 for r in scoped if r.get('is_generic')) != 1:
    print("the read holds %d generic suppliers — Comprar's default must be the shop's one" % sum(1 for r in scoped if r.get('is_generic'))); raise SystemExit
if relation == 'workspace_member' and [r.get('user_id') for r in scoped].count(owner) != 1:
    print('her own membership appears %d times — her role is read off the one that is hers' % [r.get('user_id') for r in scoped].count(owner)); raise SystemExit
print("ok %d row(s) unfiltered, %d filtered, all the shop's" % (len(every), len(scoped)))
PY

while IFS='|' read -r relation reads; do
  [[ -n "$relation" ]] || continue
  extra=""
  case "$relation" in
    provider)         extra=",is_generic" ;;
    workspace_member) extra=",user_id" ;;
  esac
  ALL="$(api GET "/rest/v1/$relation?select=workspace_id$extra")"
  SCOPED="$(api GET "/rest/v1/$relation?select=workspace_id$extra&$SHOP_COL=eq.$SHOP")"
  body "$ALL" > "$SCRATCH/all.json"
  body "$SCOPED" > "$SCRATCH/scoped.json"
  VERDICT="$(python3 "$SCRATCH/verdict.py" "$relation" "$SHOP" "$KITCHEN" "$OWNER_UID" \
    "$(status "$ALL")" "$(status "$SCOPED")" "$SCRATCH/all.json" "$SCRATCH/scoped.json" 2>&1)"
  [[ -z "$VERDICT" ]] && VERDICT="the verdict script produced nothing — it crashed on the shape that came back"
  note
  if [[ "$VERDICT" == ok* ]]; then
    ok "$relation ($reads): ${VERDICT#ok }"
  else
    fail "$relation ($reads): $VERDICT"
  fi
done < "$SCRATCH/relations"

echo
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that skipped everything
# looks like.
EXPECTED=$((2 + RELATIONS))
if (( ran < EXPECTED )); then
  echo "FAIL: only $ran assertion groups ran, expected $EXPECTED — this check"
  echo "      asserted almost nothing and was about to report success."
  exit 1
fi
if (( fails > 0 )); then
  echo "$ran assertion groups ran, $fails failed — a kitchen's rows reach Wera through"
  echo "a read in app/src/api/, and only this check can see it."
  exit 1
fi
echo "all $ran assertion groups passed — every read of a business's rows in"
echo "app/src/api/ keeps a kitchen out of the shop open in Wera."

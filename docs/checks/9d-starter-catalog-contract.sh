#!/usr/bin/env bash
# ============================================================================
# 9d — the starter catalog's import, held to a real PostgREST
# ============================================================================
# docs/PLAN.md task `9d`, `## Step 9`. ADR-035 §2.9.
#
#   supabase start && supabase db reset
#   bash docs/checks/9d-starter-catalog-contract.sh [starterCatalog.ts] [catalog.ts]
#
# `app/src/api/starterCatalog.ts` names two RPCs and three `p_` arguments, and
# `app/src/api/catalog.ts` asks `product_variant` for `template_code`. No
# typecheck has ever read `0044`, so this file reads those strings OUT OF THE APP
# and puts them in front of a reset database, over HTTP, as the phone would.
#
# WHAT IT ASSERTS, each measured on the wire:
#   1. the app's constants are readable (or this check would assert nothing);
#   2. a signed-in person reads the template — and the real content `0045`
#      put there, so a reset that lost the snapshot is red;
#   3. ⚠️ nobody reaches `catalogo` directly: PGRST106 (406), the schema is not
#      exposed, and an anonymous caller is refused the read (401, 42501);
#   4. the variant read the app makes, with `template_code`, is a 200;
#   5. ⚠️⚠️ the owner imports Pollería minus one unticked product, BY THE APP'S
#      ARGUMENT NAMES: the count arrives, the rows carry their codes, the
#      unticked one is absent, and a second import brings nothing;
#   6. a cashier is refused (403, 42501) and an unknown tag is a 400 (23514).
#
# ⚠️ AND WHAT IT CANNOT CLAIM: which screen draws what, and how it looks (R9).
# ============================================================================

set -uo pipefail

CONTRACT="${1:-app/src/api/starterCatalog.ts}"
CATALOG="${2:-app/src/api/catalog.ts}"
[[ -r "$CONTRACT" ]] || { echo "FAIL: cannot read $CONTRACT"; exit 1; }
[[ -r "$CATALOG" ]] || { echo "FAIL: cannot read $CATALOG"; exit 1; }

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the contract, read out of the app -----------------------------------
str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }

CATALOG_TEMPLATE="$(str CATALOG_TEMPLATE "$CONTRACT")"
IMPORT_CATALOG="$(str IMPORT_CATALOG "$CONTRACT")"
VARIANT_COLUMNS="$(str VARIANT_COLUMNS "$CATALOG")"
# The three argument names, read off the ImportArgs interface itself.
ARG_NAMES="$(awk '/^export interface ImportArgs/{f=1;next} f&&/^}/{exit} f' "$CONTRACT" \
  | sed -n 's/^ *readonly \(p_[a-z_]*\):.*/\1/p' | paste -sd, -)"

note
for name in CATALOG_TEMPLATE IMPORT_CATALOG VARIANT_COLUMNS ARG_NAMES; do
  if [[ -z "${!name}" ]]; then
    fail "could not read $name out of the app — this check would assert nothing"
    exit 1
  fi
done
if [[ "$ARG_NAMES" != "p_workspace_id,p_tags,p_exclude" ]]; then
  fail "ImportArgs names '$ARG_NAMES'; 0044 declares p_workspace_id, p_tags, p_exclude."
  echo "      PostgREST matches an RPC by its argument NAMES, so a renamed one is a"
  echo "      404 PGRST202 — the function is not found, rather than refused."
else
  ok "read from the app: $CATALOG_TEMPLATE, $IMPORT_CATALOG($ARG_NAMES)"
fi
case ",$VARIANT_COLUMNS," in
  *",template_code,"*) ;;
  *) fail "VARIANT_COLUMNS no longer asks for template_code — the picker cannot tell what is already in the shop" ;;
esac

# --- the wire -----------------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` and \`supabase db reset\` from the root."
  exit 1
fi
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

TOKEN=""
api() { # method path body [extra-header] -> body, then the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" extra="${4:-X-Empty: 1}" auth="X-Empty: 1"
  [[ -n "$TOKEN" ]] && auth="Authorization: Bearer $TOKEN"
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth" \
      -H "$extra" -H 'Content-Type: application/json' -d "$body"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $KEY" -H "$auth" -H "$extra"
  fi
}
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
pick()   { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
first()  { python3 -c "import sys,json;r=json.load(sys.stdin);print(r[0]['$1'] if isinstance(r,list) and r else '')" <<< "$2" 2>/dev/null; }

signup() { # email -> sets TOKEN
  local out try
  for try in 1 2 3 4 5 6; do
    out="$(TOKEN="" api POST /auth/v1/signup "{\"email\":\"$1\",\"password\":\"starter-9d-123\"}")"
    TOKEN="$(pick access_token "$(body "$out")")"
    [[ -n "$TOKEN" ]] && return 0
    sleep 10
  done
  echo "FAIL: could not sign $1 in after six tries — $(body "$out")"
  echo "      GoTrue rate-limits signup and answers with an EMPTY BODY when it does."
  exit 1
}

# ⚠️ The import's body is built from the names READ ABOVE, never typed again here.
import_body() { # workspace tags-csv exclude-csv
  python3 -c '
import json, sys
names = sys.argv[1].split(",")
ws, tags, excl = sys.argv[2], sys.argv[3], sys.argv[4]
vals = [ws, [t for t in tags.split(",") if t], [e for e in excl.split(",") if e]]
print(json.dumps(dict(zip(names, vals))))' "$ARG_NAMES" "$@"
}

STAMP="$$-$(date +%s)"
OWNER_EMAIL="starter-owner-$STAMP@example.com"
STAFF_EMAIL="starter-staff-$STAMP@example.com"

# --- 3a. anonymous first, before any token exists ------------------------------
note
ANON="$(TOKEN="" api POST "/rest/v1/rpc/$CATALOG_TEMPLATE" '{}')"
if [[ "$(status "$ANON")" == "401" && "$(pick code "$(body "$ANON")")" == "42501" ]]; then
  ok "an anonymous caller is refused the template — 401 42501, not handed it"
else
  fail "an anonymous $CATALOG_TEMPLATE answered $(status "$ANON") $(body "$ANON") — expected 401 42501"
fi

signup "$OWNER_EMAIL"; OWNER_TOKEN="$TOKEN"
CREATED="$(api POST /rest/v1/rpc/onboard_workspace \
  '{"p_display_name":"Pollería 9d","p_prices_include_tax":true,"p_location_name":null}')"
WORKSPACE_ID="$(body "$CREATED" | tr -d '"')"
[[ -n "$WORKSPACE_ID" && "$(status "$CREATED")" == "200" ]] \
  || { echo "FAIL: could not create the shop — $(body "$CREATED")"; exit 1; }

# --- 2. the template, signed in ---------------------------------------------------
note
TPL="$(api POST "/rest/v1/rpc/$CATALOG_TEMPLATE" '{}')"
body "$TPL" > "$SCRATCH/template.json"
TPL_VERDICT="$(python3 - "$SCRATCH/template.json" <<'PY'
import json, sys
t = json.load(open(sys.argv[1]))
if not isinstance(t, dict) or set(t) != {"tags", "families", "products"}:
    print("the template is not the three-list object:", str(t)[:200]); raise SystemExit
codes = {p["code"] for p in t["products"]}
polleria = [p for p in t["products"] if "giro-polleria" in p["tags"]]
if "pollo-entero" not in codes or len(polleria) == 0:
    print("the template does not hold 0045's Pollería — was the snapshot applied?"); raise SystemExit
bad = [p["code"] for p in t["products"] if not isinstance(p.get("tax_rate"), str)]
if bad:
    print("a number crossed as a JSON number, not text:", bad[:3]); raise SystemExit
print(f"ok {len(polleria)}")
PY
)"
if [[ "$(status "$TPL")" == "200" && "$TPL_VERDICT" == ok* ]]; then
  POLLERIA="${TPL_VERDICT#ok }"
  ok "a signed-in person reads the template: 200, $POLLERIA Pollería products, numbers as text"
else
  fail "the template read: $(status "$TPL") — ${TPL_VERDICT:-$(body "$TPL" | head -c 200)}"
  POLLERIA=0
fi

# --- 3b. nobody reaches the schema itself -----------------------------------------
note
DIRECT="$(api GET '/rest/v1/product?select=code' '' 'Accept-Profile: catalogo')"
if [[ "$(status "$DIRECT")" == "406" && "$(pick code "$(body "$DIRECT")")" == "PGRST106" ]]; then
  ok "catalogo is not exposed — a direct read is 406 PGRST106, for the owner too"
else
  fail "a direct read of catalogo.product answered $(status "$DIRECT") $(body "$DIRECT" | head -c 200)"
fi

# --- 4. the variant read the app makes --------------------------------------------
note
READ="$(api GET "/rest/v1/product_variant?select=$VARIANT_COLUMNS")"
if [[ "$(status "$READ")" == "200" ]]; then
  ok "the variant read with template_code is a 200 ($VARIANT_COLUMNS)"
else
  fail "the variant read answered $(status "$READ"): $(body "$READ" | head -c 200)"
fi

# --- 5. the import, by the app's argument names -----------------------------------
note
FIRST="$(api POST "/rest/v1/rpc/$IMPORT_CATALOG" "$(import_body "$WORKSPACE_ID" giro-polleria rabadilla)")"
WANT=$((POLLERIA - 1))
if [[ "$(status "$FIRST")" == "200" \
      && "$(pick imported "$(body "$FIRST")")" == "$WANT" \
      && "$(pick skipped "$(body "$FIRST")")" == "0" ]]; then
  ok "the owner imports Pollería minus one unticked: 200 {imported: $WANT, skipped: 0}"
else
  fail "the import answered $(status "$FIRST") $(body "$FIRST") — expected imported $WANT, skipped 0"
fi

note
ROWS="$(api GET "/rest/v1/product_variant?select=template_code,is_active&template_code=not.is.null")"
body "$ROWS" > "$SCRATCH/rows.json"
ROWS_VERDICT="$(python3 - "$SCRATCH/rows.json" "$WANT" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1])); want = int(sys.argv[2])
codes = [r["template_code"] for r in rows]
if len(codes) != want: print(f"{len(codes)} imported rows read back, expected {want}"); raise SystemExit
if "rabadilla" in codes: print("the unticked product arrived anyway — p_exclude was ignored"); raise SystemExit
if len(set(codes)) != len(codes): print("a template code is in the shop twice"); raise SystemExit
print("ok")
PY
)"
[[ "$ROWS_VERDICT" == ok ]] \
  && ok "the rows read back carry their codes, once each, and the unticked one is absent" \
  || fail "$ROWS_VERDICT"

note
AGAIN="$(api POST "/rest/v1/rpc/$IMPORT_CATALOG" "$(import_body "$WORKSPACE_ID" giro-polleria '')")"
if [[ "$(pick imported "$(body "$AGAIN")")" == "1" ]]; then
  ok "a second import brings only what the first left out (the unticked one) — nothing twice"
else
  fail "the second import answered $(body "$AGAIN") — expected exactly the one left out"
fi

# --- 6. the refusals ---------------------------------------------------------------
note
UNKNOWN="$(api POST "/rest/v1/rpc/$IMPORT_CATALOG" "$(import_body "$WORKSPACE_ID" giro-nada '')")"
if [[ "$(status "$UNKNOWN")" == "400" && "$(pick code "$(body "$UNKNOWN")")" == "23514" ]]; then
  ok "an unknown tag is a 400 23514 — a client bug said out loud, not an empty giro"
else
  fail "an unknown tag answered $(status "$UNKNOWN") $(body "$UNKNOWN")"
fi

LOCATION_ID="$(first id "$(body "$(api GET '/rest/v1/location?select=id')")")"
INVITE="$(python3 -c '
import json, sys
print(json.dumps({"p_workspace_id": sys.argv[1], "p_email": sys.argv[2],
                  "p_role": "staff", "p_location_ids": [sys.argv[3]]}))' \
  "$WORKSPACE_ID" "$STAFF_EMAIL" "$LOCATION_ID")"
INVITE_TOKEN="$(pick token "$(body "$(api POST /rest/v1/rpc/create_invite "$INVITE")")")"
[[ -n "$INVITE_TOKEN" ]] || { echo "FAIL: create_invite returned no token for the cashier"; exit 1; }
signup "$STAFF_EMAIL"
api POST /rest/v1/rpc/redeem_invite "{\"p_token\":\"$INVITE_TOKEN\"}" > /dev/null

note
STAFF="$(api POST "/rest/v1/rpc/$IMPORT_CATALOG" "$(import_body "$WORKSPACE_ID" giro-polleria '')")"
if [[ "$(status "$STAFF")" == "403" && "$(pick code "$(body "$STAFF")")" == "42501" ]]; then
  ok "a cashier is refused the import — 403 42501"
else
  fail "the cashier's import answered $(status "$STAFF") $(body "$STAFF")"
fi
TOKEN="$OWNER_TOKEN"

echo
if (( fails == 0 && ran < 10 )); then
  echo "FAIL: only $ran assertion groups ran, expected 10 — this check asserted almost nothing."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — the app's names reach 0044, the template reads"
  echo "with 0045's Pollería, the schema stays closed, and the import lands once, minus"
  echo "what was unticked, for the owner and never for a cashier."
  exit 0
fi
echo "$ran group(s) ran, $fails failed."
exit 1

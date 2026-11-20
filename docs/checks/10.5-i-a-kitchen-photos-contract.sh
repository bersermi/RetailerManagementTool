#!/usr/bin/env bash
# ============================================================================
# 10.5-i-a — ARE THE BUCKET `cocina`'S WALLS REAL, OVER A REAL STORAGE API AND
# A REAL POSTGREST?
#
# `0076` makes the bucket where a kitchen's cover, logo, dish and promotion
# photos live. The owner's ruling of 2026-11-01 set its walls — written by the
# kitchen's owner and managers in her own folder (⚠️ and since `0083`, `10.9b-iii`,
# by her helper too: G36, a helper publishes), never read by anyone signed out —
# and `0076` keeps two promises of its own: only while the kitchen exists (Wera's
# aviso promises a deleted shop's photos leave everyone's reach at once), and
# pictures only. ⚠️ SINCE `0090` (`10.9i-ii`, his D2 of 2026-11-19, the full
# version ruled 2026-11-20) a photo is opened outside her kitchen only while the
# door shows it — her cover and logo, the dishes of her open offers, a promotion
# while it shows — and her kitchen deletes a photo once nothing names it. A
# policy's text is not its behaviour, so this drives Storage as each person would:
#
#    1. the bucket as Storage reports it: private, 2 MB a file, JPEG/PNG/WebP;
#    2. the owner puts both files of a picture into her folder (again: 409);
#    3. a manager puts one;
#    4. the cook — a helper, `staff` — puts one too (`0083`; she was refused until then);
#    5. ⚠️ her kitchen opens and lists every file in its folder; nobody outside
#       it — a shop's owner, a neighbour, another kitchen's owner — opens or lists
#       a picture nothing shows (`0090`; until then everyone signed in read all);
#    6. nobody signed out reads it, by the private path or the public one;
#    7. a shop's owner puts none, in her shop's folder or the kitchen's;
#    8. a neighbour puts none, in a folder of her own or the kitchen's;
#    9. another kitchen's owner puts none in this kitchen's folder, and one in hers;
#   10. nothing is overwritten: an upsert and an update are refused, the bytes stay;
#   11. pictures only: a page is refused, and so is a file over 2 MB;
#   12. her page and her dish point at the picture, and never at another kitchen's;
#       her page reads back as Wera Cocina asks for it, to her kitchen and not
#       to a neighbour;
#   13. ⚠️ what the door shows, everyone signed in opens: her cover and the dish
#       of her open offer, byte for byte — and a neighbour lists exactly those;
#   14. ⚠️ only while it shows: a promotion's photo while shown and not once
#       ended; a dish's once its offer's window ends, or once it is withdrawn —
#       while her kitchen still opens each;
#   15. ⚠️ a phone deletes only what nothing names, and only in her kitchen: a
#       neighbour, a shop's owner and another kitchen's owner delete nothing; her
#       own delete of her cover, of a withdrawn offer's dish and of an ended
#       promotion's photo leaves each; the cook deletes a picture nothing names;
#   16. ⚠️ Wera Cocina's way, by its names: the cover replaced, then the old one's
#       two files deleted in one call; a promotion undone, then its photo;
#   17. ⚠️ another kitchen's owner deletes her account: her photo leaves the
#       neighbour's reach at once, and waits in the bucket for the hand that
#       deletes it within 30 days;
#   18. ⚠️ that hand (`10.5-ii`, and since `0090` its second list):
#       `docs/runbooks/delete-orphan-photos.sh --local` lists the deleted kitchen's
#       folder and a living kitchen's picture nothing names that is over a day
#       old — not a fresh one, not one her page or an offer names — and with
#       `--delete` those are gone and the rest still read.
#
#   bash docs/checks/10.5-i-a-kitchen-photos-contract.sh [fotos.ts] [pagina.ts] [listing.ts]
#
# ⚠️ SINCE `10.5-ii` THE NAMES ARE WERA COCINA'S, read out of its own modules as
# `8o-photos-contract.sh` reads Wera's: the bucket and the two files' names out
# of `cocina/src/api/fotos.ts`; the page's table, columns, filter and cover's
# field out of `pagina.ts`; a dish's photo key out of `listing.ts`'s `LineBody`.
# A name the app misspells is a name this check sends, and goes red.
#
# ⚠️ TOKENS ARE SIGNED HERE WITH THE LOCAL JWT SECRET, as the auth server signs
# its own: six people a run, eleven runs in the falsifier, and the job's other
# checks share the auth server's limit of 30 sign-ups and sign-ins per five
# minutes. Each person is made through the auth server's admin door, so each is
# a real row in `auth.users`; Storage's policies read the token's `sub` and role.
#
# ⚠️ THIS NEEDS STORAGE RUNNING — the CI job that runs it starts `storage-api`
# before the reset, or `0076` finds no `storage.buckets` and makes no bucket.
# ⚠️ IT TURNS WERA'S SWITCH FOR PROMOTIONS ON for group 14, and puts it back as
# it found it on the way out.
# ============================================================================
set -uo pipefail

FOTOS_TS="${1:-cocina/src/api/fotos.ts}"
PAGINA_TS="${2:-cocina/src/api/pagina.ts}"
LISTING_TS="${3:-cocina/src/api/listing.ts}"
for f in "$FOTOS_TS" "$PAGINA_TS" "$LISTING_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f — run this from the repository root"; exit 1; }
done
str() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
field() { # file interface name-prefix -> the first field of that interface starting with it
  awk -v want="export interface $2 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\):.*/\1/p" | head -1
}
BUCKET="$(str PHOTO_BUCKET "$FOTOS_TS")"
LARGE="$(str LARGE_FILE "$FOTOS_TS")"
SMALL="$(str SMALL_FILE "$FOTOS_TS")"
PAGE_TABLE="$(str PAGE_TABLE "$PAGINA_TS")"
PAGE_COLUMNS="$(str PAGE_COLUMNS "$PAGINA_TS")"
PAGE_OWNER="$(str PAGE_OWNER_COLUMN "$PAGINA_TS")"
COVER_COLUMN="$(field "$PAGINA_TS" PageFields cover)"
DISH_COLUMN="$(field "$LISTING_TS" LineBody image)"
for pair in "PHOTO_BUCKET:$BUCKET" "LARGE_FILE:$LARGE" "SMALL_FILE:$SMALL" "PAGE_TABLE:$PAGE_TABLE" \
            "PAGE_COLUMNS:$PAGE_COLUMNS" "PAGE_OWNER_COLUMN:$PAGE_OWNER" "PageFields' cover:$COVER_COLUMN" \
            "LineBody's photo:$DISH_COLUMN"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of Wera Cocina's source — a green here would be the vacuous kind"
    exit 1
  fi
done

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }
echo "  read from Wera Cocina: the bucket $BUCKET, files $LARGE and $SMALL; $PAGE_TABLE?select=$PAGE_COLUMNS by $PAGE_OWNER, the cover as $COVER_COLUMN; a dish's photo as $DISH_COLUMN"

STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
ANON="$(sed -n 's/^ANON_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
SERVICE="$(sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
SECRET="$(sed -n 's/^JWT_SECRET="\(.*\)"$/\1/p' <<< "$STATUS")"
DB_URL="$(sed -n 's/^DB_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$KEY" || -z "$SERVICE" || -z "$SECRET" || -z "$ANON" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` and \`supabase db reset\` from the root."
  exit 1
fi
case "$KEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

ask_db() { # sql -> its one value, as the database's owner
  if command -v psql > /dev/null; then
    psql "$DB_URL" -At -v ON_ERROR_STOP=1 -c "$1"
  else
    docker exec -i "$(docker ps --format '{{.Names}}' | grep -m1 '^supabase_db_')" \
      psql -U postgres -At -v ON_ERROR_STOP=1 -c "$1"
  fi
}

pick()  { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }
body()   { sed '$d' <<< "$1"; }
status() { tail -1 <<< "$1"; }
uuid()   { python3 -c 'import uuid;print(uuid.uuid4())'; }

MINT='
import base64, hashlib, hmac, json, sys, time
b = lambda d: base64.urlsafe_b64encode(d).rstrip(b"=").decode()
now = int(time.time())
h = b(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
p = b(json.dumps({"sub": sys.argv[2], "role": "authenticated", "aud": "authenticated",
                  "iat": now, "exp": now + 3600}).encode())
print(h + "." + p + "." + b(hmac.new(sys.argv[1].encode(), (h + "." + p).encode(), hashlib.sha256).digest()))
'
PERSON_ID=""
person() { # email full-name -> sets PERSON_ID, and prints a token for that person
  local out
  out="$(curl -s -X POST "$API_URL/auth/v1/admin/users" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"fotos-cocina-123\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"$2\"}}")"
  PERSON_ID="$(pick id "$out")"
  [[ -n "$PERSON_ID" ]] || { echo "FAIL: the auth server would not make $1 — $out" >&2; return 1; }
}
token() { python3 -c "$MINT" "$SECRET" "$1"; }

api() { # method path body token -> body, then the HTTP status on the last line
  local auth="X-Empty: 1"
  [[ -n "${4:-}" ]] && auth="Authorization: Bearer $4"
  curl -s -w $'\n%{http_code}' -X "$1" "$API_URL$2" -H "apikey: $KEY" -H "$auth" \
    -H 'Content-Type: application/json' -d "$3"
}
put() { # object-path file token [content-type] [extra-header] [method] -> body, then the status
  curl -s -w $'\n%{http_code}' -X "${6:-POST}" "$API_URL/storage/v1/object/$BUCKET/$1" \
    -H "apikey: $KEY" -H "Authorization: Bearer $3" -H "Content-Type: ${4:-image/jpeg}" \
    -H "${5:-X-Empty: 1}" --data-binary @"$2"
}
reads() { # object-path token [file] -> the HTTP status of a signed-in read
  curl -s -o "${3:-/dev/null}" -w '%{http_code}' "$API_URL/storage/v1/object/authenticated/$BUCKET/$1" \
    -H "apikey: $KEY" -H "Authorization: Bearer $2"
}
refused() { # body+status -> true when Storage refused the write on a policy or a limit
  local s; s="$(status "$1")"
  [[ "$s" =~ ^4[0-9][0-9]$ ]] && [[ "$(body "$1")" == *"row-level security"* || "$(body "$1")" == *"Unauthorized"* ]]
}
# ⚠️ `0090`: what Storage LISTS in a folder for a person — the names under it,
# sorted, one line; a refusal is printed as ERR, never as an empty folder.
lists() { # folder token -> the names Storage lists in it
  curl -s -X POST "$API_URL/storage/v1/object/list/$BUCKET" -H "apikey: $KEY" -H "Authorization: Bearer $2" \
    -H 'Content-Type: application/json' -d "{\"prefix\":\"$1/\",\"limit\":100}" \
    | python3 -c '
import json, sys
d = json.load(sys.stdin)
print(" ".join(sorted(x["name"] for x in d)) if isinstance(d, list) else "ERR " + json.dumps(d)[:160])' 2>/dev/null
}
# ⚠️ `0090`: a delete AS WERA COCINA SENDS ONE — supabase-js `remove([...])`, one
# DELETE with every path. Storage answers 200 with the files it deleted; a file
# its policy refuses is simply not in that list.
del() { # token path... -> body, then the status
  local tok="$1"; shift
  curl -s -w $'\n%{http_code}' -X DELETE "$API_URL/storage/v1/object/$BUCKET" \
    -H "apikey: $KEY" -H "Authorization: Bearer $tok" -H 'Content-Type: application/json' \
    -d "$(python3 -c 'import json, sys; print(json.dumps({"prefixes": sys.argv[1:]}))' "$@")"
}
kept() { # picture -> how many of its files the bucket holds, as the database's owner
  ask_db "select count(*) from storage.objects where bucket_id = '$BUCKET' and name like '$1/%'"
}

SCRATCH="$(mktemp -d)"
SWITCH_WAS="$(ask_db "select coalesce((select is_on::text from servicio.feature_switch where name = 'promociones'), 'none')")"
[[ "$SWITCH_WAS" == "true" || "$SWITCH_WAS" == "false" ]] \
  || { echo "FAIL: could not read Wera's switch for promotions ($SWITCH_WAS) — is 0081 applied?"; exit 1; }
trap 'ask_db "update servicio.feature_switch set is_on = $SWITCH_WAS where name = '"'"'promociones'"'"'" > /dev/null; rm -rf "$SCRATCH"' EXIT
printf '\xff\xd8\xff\xe0 10.5-i-a large \xff\xd9' > "$SCRATCH/$LARGE"
printf '\xff\xd8\xff\xe0 10.5-i-a thumb \xff\xd9' > "$SCRATCH/$SMALL"
printf '\xff\xd8\xff\xe0 10.5-i-a other \xff\xd9' > "$SCRATCH/otra.jpg"
printf '<!doctype html><title>no</title>' > "$SCRATCH/pagina.html"
python3 -c 'import sys;sys.stdout.buffer.write(b"\xff\xd8\xff\xe0" + b"\0" * (2 * 1024 * 1024 + 16))' > "$SCRATCH/grande.jpg"

# --- the people: a kitchen's owner, a manager, a cook; a shop's owner; a neighbour; another kitchen
STAMP="$$-$(date +%s)"
person "fonda-fotos-$STAMP@example.com" "Fonda Fotos"           || exit 1; FONDA_ID="$PERSON_ID";    FONDA="$(token "$PERSON_ID")"
person "gerente-fotos-$STAMP@example.com" "Gerente Fotos"       || exit 1; GERENTE_ID="$PERSON_ID";  GERENTE="$(token "$PERSON_ID")"
person "cocinera-fotos-$STAMP@example.com" "Cocinera Fotos"     || exit 1; COCINERA_ID="$PERSON_ID"; COCINERA="$(token "$PERSON_ID")"
person "tendera-fotos-$STAMP@example.com" "Tendera Fotos"       || exit 1; TENDERA="$(token "$PERSON_ID")"
person "vecina-fotos-$STAMP@example.com" "Vecina Fotos"         || exit 1; VECINA_ID="$PERSON_ID";   VECINA="$(token "$PERSON_ID")"
person "otra-fotos-$STAMP@example.com" "Otra Fotos"             || exit 1; OTRA="$(token "$PERSON_ID")"

KITCHEN_NAME="Fonda Contrato $STAMP"
OTHER_NAME="Fonda Otra Contrato $STAMP"
made() { # token body -> the business id
  local out; out="$(api POST /rest/v1/rpc/onboard_workspace "$2" "$1")"
  [[ "$(status "$out")" == "200" ]] || { echo "FAIL: could not make a business — $(body "$out")" >&2; return 1; }
  body "$out" | tr -d '"'
}
WS_C="$(made "$FONDA" "{\"p_display_name\":\"$KITCHEN_NAME\",\"p_kind\":\"cocina\"}")" || exit 1
WS_T="$(made "$TENDERA" '{"p_display_name":"Abarrotes Contrato Fotos"}')" || exit 1
WS_O="$(made "$OTRA" "{\"p_display_name\":\"$OTHER_NAME\",\"p_kind\":\"cocina\"}")" || exit 1
LOC_C="$(ask_db "select id from public.location where workspace_id = '$WS_C'")"
ask_db "insert into public.workspace_member (workspace_id, user_id, role, display_name) values
          ('$WS_C', '$GERENTE_ID', 'manager', 'Gerente Fotos'), ('$WS_C', '$COCINERA_ID', 'staff', 'Cocinera Fotos')" > /dev/null
ask_db "insert into public.member_location (workspace_id, member_id, location_id)
          select '$WS_C', id, '$LOC_C' from public.workspace_member where workspace_id = '$WS_C' and user_id = '$COCINERA_ID'" > /dev/null
[[ -n "$WS_C" && -n "$WS_T" && -n "$WS_O" && -n "$LOC_C" ]] || { echo "FAIL: could not build the fixture"; exit 1; }
upload() { # picture token -> 0 when both its files went up
  [[ "$(status "$(put "$1/$LARGE" "$SCRATCH/$LARGE" "$2")")" == "200" \
     && "$(status "$(put "$1/$SMALL" "$SCRATCH/$SMALL" "$2")")" == "200" ]]
}
offer() { # id picture start-minutes end-minutes token -> body+status of publish_listing, the dish's photo by the app's key
  api POST /rest/v1/rpc/publish_listing "$(python3 -c '
import json, sys
from datetime import datetime, timedelta, timezone
now = datetime.now(timezone.utc)
print(json.dumps({"p_id": sys.argv[1], "p_location_id": sys.argv[2],
                  "p_pickup_start": (now + timedelta(minutes=int(sys.argv[5]))).isoformat(),
                  "p_pickup_end": (now + timedelta(minutes=int(sys.argv[6]))).isoformat(),
                  "p_lines": [{"name": "Comida corrida", "unit_price": "65.00", "quantity": 4,
                               sys.argv[4]: sys.argv[3]}]}))' \
    "$1" "$LOC_C" "$2" "$DISH_COLUMN" "$3" "$4")" "$5"
}

# --- 1. the bucket, as Storage reports it --------------------------------------------
note
B="$(curl -s "$API_URL/storage/v1/bucket/$BUCKET" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE")"
B_SHAPE="$(python3 -c '
import sys, json
d = json.load(sys.stdin)
print(d.get("public"), d.get("file_size_limit"), ",".join(sorted(d.get("allowed_mime_types") or [])))' <<< "$B" 2>/dev/null)"
if [[ "$B_SHAPE" == "False 2097152 image/jpeg,image/png,image/webp" ]]; then
  ok "the bucket $BUCKET is private, takes 2 MB a file, and JPEG, PNG or WebP alone"
else
  fail "the bucket $BUCKET reads '$B_SHAPE' — expected 'False 2097152 image/jpeg,image/png,image/webp' ($(head -c 200 <<< "$B"))"
  echo '      "Bucket not found" is Storage not started before the reset, or 0076 not applied.'
fi

# --- 2. the owner puts both files of a picture into her kitchen's folder -------------
PIC_ID="$(uuid)"
PIC="$WS_C/$PIC_ID"
note
UP_L="$(put "$PIC/$LARGE" "$SCRATCH/$LARGE" "$FONDA")"
UP_T="$(put "$PIC/$SMALL" "$SCRATCH/$SMALL" "$FONDA")"
DUP="$(put "$PIC/$SMALL" "$SCRATCH/$SMALL" "$FONDA")"
if [[ "$(status "$UP_L")" == "200" && "$(status "$UP_T")" == "200" && "$(pick statusCode "$(body "$DUP")")" == "409" ]]; then
  ok "the owner puts $LARGE and $SMALL into $BUCKET under her kitchen; the same file again is a 409"
else
  fail "the owner's upload answered $(status "$UP_L") $(body "$UP_L" | head -c 200); the small one $(status "$UP_T"); again $(body "$DUP" | head -c 120)"
  echo '      A 403 is the fence refusing a kitchen its own folder.'
fi

# --- 3. a manager puts one -------------------------------------------------------------
note
MGR_ID="$(uuid)"
MGR_PIC="$WS_C/$MGR_ID"
UP_M="$(put "$MGR_PIC/$LARGE" "$SCRATCH/$LARGE" "$GERENTE")"
if [[ "$(status "$UP_M")" == "200" ]]; then
  ok "a manager of the kitchen puts one into its folder"
else
  fail "the manager's upload answered $(status "$UP_M") $(body "$UP_M" | head -c 200) — the ruling gives the owner and managers the folder"
fi

# --- 4. the cook puts one too (`0083`, `10.9b-iii` — G36: a helper publishes, her dish's photo with it)
note
COOK_ID="$(uuid)"
COOK_PIC="$WS_C/$COOK_ID"
UP_S="$(put "$COOK_PIC/$LARGE" "$SCRATCH/$LARGE" "$COCINERA")"
if [[ "$(status "$UP_S")" == "200" ]]; then
  ok "the cook — a helper — puts one into her kitchen's folder too"
else
  fail "the cook's upload answered $(status "$UP_S") $(body "$UP_S" | head -c 160) — since 0083 every member of the kitchen writes in its folder"
fi

# --- 5. ⚠️ her kitchen opens and lists every file; nobody outside it a picture nothing shows (`0090`)
note
R_FONDA="$(reads "$PIC/$LARGE" "$FONDA" "$SCRATCH/fonda.jpg")"
R_COCINERA="$(reads "$PIC/$SMALL" "$COCINERA")"
R_GERENTE="$(reads "$COOK_PIC/$LARGE" "$GERENTE")"
R_TENDERA="$(reads "$PIC/$LARGE" "$TENDERA")"
R_VECINA="$(reads "$PIC/$LARGE" "$VECINA")"
R_OTRA="$(reads "$PIC/$SMALL" "$OTRA")"
L_COOK="$(lists "$WS_C" "$COCINERA")"
L_VECINA="$(lists "$WS_C" "$VECINA")"
ALL3="$(tr ' ' '\n' <<< "$PIC_ID $MGR_ID $COOK_ID" | sort | tr '\n' ' ' | sed 's/ $//')"
if [[ "$R_FONDA $R_COCINERA $R_GERENTE" == "200 200 200" ]] && cmp -s "$SCRATCH/fonda.jpg" "$SCRATCH/$LARGE" \
   && [[ "$R_TENDERA" =~ ^(400|404)$ && "$R_VECINA" =~ ^(400|404)$ && "$R_OTRA" =~ ^(400|404)$ ]] \
   && [[ "$L_COOK" == "$ALL3" && "$L_VECINA" == "" ]]; then
  ok "her kitchen opens every file in its folder (owner, cook, manager: 200) and the cook lists all three pictures; a shop's owner ($R_TENDERA), a neighbour ($R_VECINA) and another kitchen's owner ($R_OTRA) open none that nothing shows, and the neighbour lists nothing"
else
  fail "her kitchen read owner $R_FONDA, cook $R_COCINERA, manager $R_GERENTE; outside it a shop $R_TENDERA, a neighbour $R_VECINA, another kitchen $R_OTRA; the cook listed '$L_COOK' (expected '$ALL3'), the neighbour '$L_VECINA' (expected nothing)"
  echo '      A 200 outside her kitchen, or a neighbour listing pictures, is 0076'"'"'s read: anyone signed in, every file.'
fi

# --- 6. nobody signed out reads it -----------------------------------------------------
note
S_NONE="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/storage/v1/object/authenticated/$BUCKET/$PIC/$LARGE" -H "apikey: $KEY")"
S_ANON="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/storage/v1/object/authenticated/$BUCKET/$PIC/$LARGE" -H "apikey: $KEY" -H "Authorization: Bearer $ANON")"
S_PUBLIC="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/storage/v1/object/public/$BUCKET/$PIC/$LARGE")"
if [[ "$S_NONE" =~ ^(400|401|403|404)$ && "$S_ANON" =~ ^(400|401|403|404)$ && "$S_PUBLIC" =~ ^(400|401|403|404)$ ]]; then
  ok "nobody signed out reads it — no token $S_NONE, the anon key $S_ANON, the public path $S_PUBLIC"
else
  fail "a signed-out read answered: no token $S_NONE, the anon key $S_ANON, the public path $S_PUBLIC — the ruling: never by anyone signed out"
fi

# --- 7. a shop's owner puts none ---------------------------------------------------------
note
T_OWN="$(put "$WS_T/$(uuid)/$LARGE" "$SCRATCH/$LARGE" "$TENDERA")"
T_KIT="$(put "$WS_C/$(uuid)/$LARGE" "$SCRATCH/$LARGE" "$TENDERA")"
if refused "$T_OWN" && refused "$T_KIT"; then
  ok "a shop's owner puts none — not in her shop's folder ($(status "$T_OWN")), not in the kitchen's ($(status "$T_KIT"))"
else
  fail "a shop's owner's upload answered $(status "$T_OWN") into her shop's folder, $(status "$T_KIT") into the kitchen's — the folder must be a kitchen's, and hers"
fi

# --- 8. a neighbour puts none --------------------------------------------------------------
note
V_OWN="$(put "$VECINA_ID/$(uuid)/$LARGE" "$SCRATCH/$LARGE" "$VECINA")"
V_KIT="$(put "$WS_C/$(uuid)/$LARGE" "$SCRATCH/$LARGE" "$VECINA")"
if refused "$V_OWN" && refused "$V_KIT"; then
  ok "a neighbour puts none — not in a folder of her own ($(status "$V_OWN")), not in the kitchen's ($(status "$V_KIT"))"
else
  fail "a neighbour's upload answered $(status "$V_OWN") into her own folder, $(status "$V_KIT") into the kitchen's"
fi

# --- 9. another kitchen's owner: not in this kitchen's folder, and in hers ----------------
note
OTHER_PIC="$WS_O/$(uuid)"
O_KIT="$(put "$WS_C/$(uuid)/$LARGE" "$SCRATCH/otra.jpg" "$OTRA")"
O_OWN="$(put "$OTHER_PIC/$LARGE" "$SCRATCH/otra.jpg" "$OTRA")"
if refused "$O_KIT" && [[ "$(status "$O_OWN")" == "200" ]]; then
  ok "another kitchen's owner puts none in this kitchen's folder ($(status "$O_KIT")), and one in her own"
else
  fail "another kitchen's owner answered $(status "$O_KIT") into this kitchen's folder and $(status "$O_OWN") into hers $(body "$O_OWN" | head -c 120)"
fi

# --- 10. nothing is overwritten -----------------------------------------------------------
note
UPSERT="$(put "$PIC/$LARGE" "$SCRATCH/otra.jpg" "$FONDA" image/jpeg 'x-upsert: true')"
UPDATE="$(put "$PIC/$LARGE" "$SCRATCH/otra.jpg" "$FONDA" image/jpeg 'X-Empty: 1' PUT)"
AFTER="$(reads "$PIC/$LARGE" "$FONDA" "$SCRATCH/after.jpg")"
if [[ ! "$(status "$UPSERT")" =~ ^2 && ! "$(status "$UPDATE")" =~ ^2 && "$AFTER" == "200" ]] && cmp -s "$SCRATCH/after.jpg" "$SCRATCH/$LARGE"; then
  ok "nothing is overwritten — her upsert ($(status "$UPSERT")) and update ($(status "$UPDATE")) refused, the bytes as they were"
else
  fail "an overwrite answered upsert $(status "$UPSERT"), update $(status "$UPDATE"); the read after $AFTER (or its bytes changed) — a new photo is a new path"
fi

# --- 11. pictures only -------------------------------------------------------------------------
note
HTML_PATH="$WS_C/$(uuid)/index.html"
BIG_PATH="$WS_C/$(uuid)/$LARGE"
HTML="$(put "$HTML_PATH" "$SCRATCH/pagina.html" "$FONDA" text/html)"
BIG="$(put "$BIG_PATH" "$SCRATCH/grande.jpg" "$FONDA")"
HTML_READ="$(reads "$HTML_PATH" "$FONDA")"
BIG_READ="$(reads "$BIG_PATH" "$FONDA")"
if [[ "$(status "$HTML")" =~ ^4 && "$(status "$BIG")" =~ ^4 && "$HTML_READ" =~ ^(400|404)$ && "$BIG_READ" =~ ^(400|404)$ ]]; then
  ok "pictures only — a page is refused ($(status "$HTML")), and so is a file over 2 MB ($(status "$BIG")); neither is stored"
else
  fail "a page answered $(status "$HTML") $(body "$HTML" | head -c 120) (read $HTML_READ); a 2 MB file $(status "$BIG") $(body "$BIG" | head -c 120) (read $BIG_READ)"
fi

# --- 12. her page and her dish point at the picture, and never at another kitchen's -----------
note
PAGE="$(api POST /rest/v1/rpc/set_kitchen_page \
  "{\"p_workspace_id\":\"$WS_C\",\"p_page\":{\"$COVER_COLUMN\":\"$PIC\",\"color\":\"nopal\"}}" "$FONDA")"
WRONG="$(api POST /rest/v1/rpc/set_kitchen_page \
  "{\"p_workspace_id\":\"$WS_C\",\"p_page\":{\"$COVER_COLUMN\":\"$OTHER_PIC\"}}" "$GERENTE")"
LISTING="$(uuid)"
DISH="$(offer "$LISTING" "$MGR_PIC" 60 180 "$GERENTE")"
DISH_HELD="$(ask_db "select $DISH_COLUMN from public.listing_line where listing_id = '$LISTING'")"
# ⚠️ `10.5-ii`: her page read back as Wera Cocina asks for it — to her kitchen's
# people (the cook too), and to nobody else: a neighbour's read is `[]`.
PAGE_READ="/rest/v1/$PAGE_TABLE?select=$PAGE_COLUMNS&$PAGE_OWNER=eq.$WS_C"
SEEN_OWNER="$(api GET "$PAGE_READ" '' "$FONDA")"
SEEN_COOK="$(api GET "$PAGE_READ" '' "$COCINERA")"
SEEN_NEIGHBOUR="$(api GET "$PAGE_READ" '' "$VECINA")"
PAGE_SHAPE="$(python3 -c '
import json, sys
rows = json.loads(sys.argv[1])
print(len(rows), ",".join(rows[0].keys()) if rows else "", rows[0].get(sys.argv[2], "") if rows else "", rows[0].get("color", "") if rows else "")' \
  "$(body "$SEEN_OWNER")" "$COVER_COLUMN" 2>/dev/null)"
if [[ "$(status "$PAGE")" == "200" && "$(pick "$COVER_COLUMN" "$(body "$PAGE")")" == "$PIC" \
      && "$(status "$WRONG")" == "400" && "$(pick code "$(body "$WRONG")")" == "22023" \
      && "$(status "$DISH")" == "200" && "$DISH_HELD" == "$MGR_PIC" \
      && "$PAGE_SHAPE" == "1 $PAGE_COLUMNS $PIC nopal" \
      && "$(status "$SEEN_COOK")" == "200" && "$(body "$SEEN_COOK")" != "[]" \
      && "$(status "$SEEN_NEIGHBOUR")" == "200" && "$(body "$SEEN_NEIGHBOUR")" == "[]" ]]; then
  ok "her page's cover and a dish point at pictures in her folder; another kitchen's picture is 400 22023; her page reads back with Wera Cocina's columns to her and her cook, and [] to a neighbour"
else
  fail "the page answered $(status "$PAGE") $(body "$PAGE" | head -c 160); another kitchen's picture $(status "$WRONG") $(body "$WRONG" | head -c 120); the dish $(status "$DISH") $(body "$DISH" | head -c 160), holding '$DISH_HELD'; the app's read '$PAGE_SHAPE' (expected '1 $PAGE_COLUMNS $PIC nopal'), the cook $(status "$SEEN_COOK") $(body "$SEEN_COOK" | head -c 80), a neighbour $(status "$SEEN_NEIGHBOUR") $(body "$SEEN_NEIGHBOUR" | head -c 80)"
fi

# --- 13. ⚠️ what the door shows, everyone signed in opens — and a neighbour lists exactly that
note
D_VECINA="$(reads "$PIC/$LARGE" "$VECINA" "$SCRATCH/vecina.jpg")"
D_TENDERA="$(reads "$PIC/$SMALL" "$TENDERA")"
D_OTRA_DISH="$(reads "$MGR_PIC/$LARGE" "$OTRA")"
D_VECINA_DISH="$(reads "$MGR_PIC/$LARGE" "$VECINA")"
D_VECINA_COOK="$(reads "$COOK_PIC/$LARGE" "$VECINA")"
L_SHOWN="$(lists "$WS_C" "$VECINA")"
SHOWN2="$(tr ' ' '\n' <<< "$PIC_ID $MGR_ID" | sort | tr '\n' ' ' | sed 's/ $//')"
if [[ "$D_VECINA $D_TENDERA $D_OTRA_DISH $D_VECINA_DISH" == "200 200 200 200" ]] && cmp -s "$SCRATCH/vecina.jpg" "$SCRATCH/$LARGE" \
   && [[ "$D_VECINA_COOK" =~ ^(400|404)$ && "$L_SHOWN" == "$SHOWN2" ]]; then
  ok "what the door shows, everyone signed in opens: her cover (a neighbour byte for byte, a shop's owner) and her open offer's dish (another kitchen's owner, a neighbour); the cook's picture nothing shows still $D_VECINA_COOK; a neighbour lists exactly the two"
else
  fail "the cover read neighbour $D_VECINA, shop $D_TENDERA; the dish another kitchen $D_OTRA_DISH, neighbour $D_VECINA_DISH; the cook's unshown picture to a neighbour $D_VECINA_COOK; the neighbour listed '$L_SHOWN' (expected '$SHOWN2')"
fi

# --- 14. ⚠️ only while it shows: a promotion's, an offer whose window ended, an offer withdrawn
note
ask_db "update servicio.feature_switch set is_on = true where name = 'promociones'" > /dev/null
PROMO_PIC="$WS_C/$(uuid)"; PROMO="$(uuid)"
ENDED_PIC="$WS_C/$(uuid)"; ENDED="$(uuid)"
upload "$PROMO_PIC" "$FONDA" && upload "$ENDED_PIC" "$FONDA" || fail "the owner could not put two more pictures in her folder"
UNTIL="$(python3 -c 'import datetime; print((datetime.date.today() + datetime.timedelta(days=7)).isoformat())')"
MADE="$(api POST /rest/v1/rpc/create_promotion "{\"p_workspace_id\":\"$WS_C\",\"p_id\":\"$PROMO\",\"p_kind\":\"nuevo\",\"p_what\":\"Pozole verde\",\"p_more\":null,\"p_image_path\":\"$PROMO_PIC\",\"p_days\":[1,2,3,4,5,6,7],\"p_ends_on\":\"$UNTIL\",\"p_conditions\":\"Hasta el $UNTIL, en $KITCHEN_NAME.\"}" "$FONDA")"
P_SHOWN="$(reads "$PROMO_PIC/$LARGE" "$VECINA")"
ENDED_PROMO="$(api POST /rest/v1/rpc/end_promotion "{\"p_workspace_id\":\"$WS_C\",\"p_id\":\"$PROMO\"}" "$FONDA")"
P_ENDED="$(reads "$PROMO_PIC/$LARGE" "$VECINA")"
P_KITCHEN="$(reads "$PROMO_PIC/$LARGE" "$COCINERA")"
OVER="$(offer "$ENDED" "$ENDED_PIC" 0 120 "$FONDA")"
E_OPEN="$(reads "$ENDED_PIC/$SMALL" "$VECINA")"
ask_db "update public.listing set pickup_start = now() - interval '3 hours', pickup_end = now() - interval '1 minute' where id = '$ENDED'" > /dev/null
E_OVER="$(reads "$ENDED_PIC/$SMALL" "$VECINA")"
E_KITCHEN="$(reads "$ENDED_PIC/$SMALL" "$GERENTE")"
GONE_OFFER="$(api POST /rest/v1/rpc/withdraw_listing "{\"p_id\":\"$LISTING\"}" "$GERENTE")"
W_VECINA="$(reads "$MGR_PIC/$LARGE" "$VECINA")"
W_KITCHEN="$(reads "$MGR_PIC/$LARGE" "$COCINERA")"
C_STILL="$(reads "$PIC/$LARGE" "$VECINA")"
if [[ "$(status "$MADE")" == "200" && "$P_SHOWN" == "200" && "$(status "$ENDED_PROMO")" == "200" && "$P_ENDED" =~ ^(400|404)$ && "$P_KITCHEN" == "200" \
      && "$(status "$OVER")" == "200" && "$E_OPEN" == "200" && "$E_OVER" =~ ^(400|404)$ && "$E_KITCHEN" == "200" \
      && "$(status "$GONE_OFFER")" =~ ^20[04]$ && "$W_VECINA" =~ ^(400|404)$ && "$W_KITCHEN" == "200" && "$C_STILL" == "200" ]]; then
  ok "only while it shows: a promotion's photo while shown (200), not once ended ($P_ENDED); a dish's while its offer is open (200), not once its window ended ($E_OVER) or it was withdrawn ($W_VECINA) — her kitchen still opens each; her cover still 200"
else
  fail "the promotion made $(status "$MADE") $(body "$MADE" | head -c 120): its photo shown $P_SHOWN, ended $(status "$ENDED_PROMO") then $P_ENDED (the cook $P_KITCHEN); the offer $(status "$OVER") $(body "$OVER" | head -c 100): open $E_OPEN, its window over $E_OVER (the manager $E_KITCHEN); withdrawn $(status "$GONE_OFFER"): a neighbour $W_VECINA, the cook $W_KITCHEN; the cover $C_STILL"
  echo '      A 200 to the neighbour after it stopped showing is a read that asks what was ever shown, not what is.'
fi

# --- 15. ⚠️ a phone deletes only what nothing names, and only in her kitchen --------------------
note
X_VECINA="$(del "$VECINA" "$COOK_PIC/$LARGE")"
X_TENDERA="$(del "$TENDERA" "$COOK_PIC/$LARGE")"
X_OTRA="$(del "$OTRA" "$COOK_PIC/$LARGE")"
OUTSIDERS_LEFT="$(kept "$COOK_PIC")"
X_COVER="$(del "$FONDA" "$PIC/$LARGE" "$PIC/$SMALL")"
X_DISH="$(del "$GERENTE" "$MGR_PIC/$LARGE")"
X_PROMO="$(del "$FONDA" "$PROMO_PIC/$LARGE" "$PROMO_PIC/$SMALL")"
NAMED_LEFT="$(kept "$PIC") $(kept "$MGR_PIC") $(kept "$PROMO_PIC")"
X_COOK="$(del "$COCINERA" "$COOK_PIC/$LARGE")"
COOK_LEFT="$(kept "$COOK_PIC")"
COOK_READ="$(reads "$COOK_PIC/$LARGE" "$FONDA")"
if [[ "$(body "$X_VECINA")" == "[]" && "$(body "$X_TENDERA")" == "[]" && "$(body "$X_OTRA")" == "[]" && "$OUTSIDERS_LEFT" == "1" \
      && "$(body "$X_COVER")" == "[]" && "$(body "$X_DISH")" == "[]" && "$(body "$X_PROMO")" == "[]" && "$NAMED_LEFT" == "2 1 2" \
      && "$(status "$X_COOK")" == "200" && "$(body "$X_COOK")" == *"$COOK_PIC/$LARGE"* && "$COOK_LEFT" == "0" && "$COOK_READ" =~ ^(400|404)$ ]]; then
  ok "a phone deletes only what nothing names, in her kitchen: a neighbour, a shop's owner and another kitchen's owner delete nothing; her cover, a withdrawn offer's dish and an ended promotion's photo stay (2 1 2 files); the cook deletes a picture nothing names — 0 files left, unread after"
else
  fail "outsiders' deletes answered $(body "$X_VECINA" | head -c 60) / $(body "$X_TENDERA" | head -c 60) / $(body "$X_OTRA" | head -c 60), leaving $OUTSIDERS_LEFT; her deletes of what is named answered $(body "$X_COVER" | head -c 80) / $(body "$X_DISH" | head -c 80) / $(body "$X_PROMO" | head -c 80), leaving '$NAMED_LEFT' (expected '2 1 2'); the cook's of an unnamed one $(status "$X_COOK") $(body "$X_COOK" | head -c 120), leaving $COOK_LEFT, read after $COOK_READ"
  echo '      A named picture gone is a delete policy that never asks what names it; an unnamed one kept is no delete policy at all.'
fi

# --- 16. ⚠️ Wera Cocina's way: the cover replaced, then the old one; a promotion undone, then its photo
note
NEW_PIC="$WS_C/$(uuid)"
upload "$NEW_PIC" "$FONDA" || fail "the owner could not put her new cover in her folder"
SWAP="$(api POST /rest/v1/rpc/set_kitchen_page \
  "{\"p_workspace_id\":\"$WS_C\",\"p_page\":{\"$COVER_COLUMN\":\"$NEW_PIC\"}}" "$FONDA")"
X_OLD="$(del "$FONDA" "$PIC/$LARGE" "$PIC/$SMALL")"
OLD_LEFT="$(kept "$PIC")"
OLD_READ="$(reads "$PIC/$LARGE" "$FONDA")"
NEW_READ="$(reads "$NEW_PIC/$LARGE" "$VECINA")"
UNDO_PIC="$WS_C/$(uuid)"; UNDO="$(uuid)"
upload "$UNDO_PIC" "$FONDA" || fail "the owner could not put a promotion's photo in her folder"
MADE2="$(api POST /rest/v1/rpc/create_promotion "{\"p_workspace_id\":\"$WS_C\",\"p_id\":\"$UNDO\",\"p_kind\":\"nuevo\",\"p_what\":\"Mole de olla\",\"p_more\":null,\"p_image_path\":\"$UNDO_PIC\",\"p_days\":[1,2,3,4,5,6,7],\"p_ends_on\":\"$UNTIL\",\"p_conditions\":\"Hasta el $UNTIL, en $KITCHEN_NAME.\"}" "$FONDA")"
X_EARLY="$(del "$FONDA" "$UNDO_PIC/$LARGE" "$UNDO_PIC/$SMALL")"
UNDONE="$(api POST /rest/v1/rpc/undo_promotion "{\"p_workspace_id\":\"$WS_C\",\"p_id\":\"$UNDO\"}" "$FONDA")"
X_UNDO="$(del "$FONDA" "$UNDO_PIC/$LARGE" "$UNDO_PIC/$SMALL")"
UNDO_LEFT="$(kept "$UNDO_PIC")"
if [[ "$(status "$SWAP")" == "200" && "$(pick "$COVER_COLUMN" "$(body "$SWAP")")" == "$NEW_PIC" \
      && "$(status "$X_OLD")" == "200" && "$OLD_LEFT" == "0" && "$OLD_READ" =~ ^(400|404)$ && "$NEW_READ" == "200" \
      && "$(status "$MADE2")" == "200" && "$(body "$X_EARLY")" == "[]" \
      && "$(status "$UNDONE")" == "200" && "$(status "$X_UNDO")" == "200" && "$UNDO_LEFT" == "0" ]]; then
  ok "Wera Cocina's way: her cover replaced, the old one's two files deleted in one call (0 left, unread) and the new one read by a neighbour; a promotion's photo kept while it stands, deleted after Deshacer (0 left)"
else
  fail "the cover swap answered $(status "$SWAP") $(body "$SWAP" | head -c 120); the old one's delete $(status "$X_OLD") $(body "$X_OLD" | head -c 120), leaving $OLD_LEFT, read $OLD_READ; the new one to a neighbour $NEW_READ; the promotion $(status "$MADE2"), its photo deleted before Deshacer $(body "$X_EARLY" | head -c 80), undone $(status "$UNDONE"), deleted after $(status "$X_UNDO") $(body "$X_UNDO" | head -c 80), leaving $UNDO_LEFT"
fi

# --- 17. ⚠️ gone with her kitchen: out of everyone's reach at once ------------------------------
note
SHOWN_OTHER="$(api POST /rest/v1/rpc/set_kitchen_page \
  "{\"p_workspace_id\":\"$WS_O\",\"p_page\":{\"$COVER_COLUMN\":\"$OTHER_PIC\"}}" "$OTRA")"
BEFORE="$(reads "$OTHER_PIC/$LARGE" "$VECINA")"
GONE="$(api POST /rest/v1/rpc/delete_my_account "{\"p_business_names\":[\"$OTHER_NAME\"]}" "$OTRA")"
AFTER_GONE="$(reads "$OTHER_PIC/$LARGE" "$VECINA")"
KEPT="$(ask_db "select count(*) from storage.objects where bucket_id = '$BUCKET' and name like '$WS_O/%'")"
if [[ "$(status "$SHOWN_OTHER")" == "200" && "$BEFORE" == "200" && "$(status "$GONE")" == "200" && "$AFTER_GONE" =~ ^(400|404)$ && "$KEPT" == "1" ]]; then
  ok "another kitchen's owner deletes her account: the neighbour read her cover ($BEFORE), and at once cannot ($AFTER_GONE); the file waits for the hand that deletes it"
else
  fail "her cover was set $(status "$SHOWN_OTHER"), read $BEFORE before, the deletion answered $(status "$GONE") $(body "$GONE" | head -c 120), the neighbour's read after $AFTER_GONE, files kept $KEPT"
  echo '      A 200 after the deletion is a read wall that asks for an account and not for a kitchen that exists.'
fi

# --- 18. ⚠️ the hand that deletes it: the runbook, on this stack ----------------------------------
# A picture nothing names, two days old (Wera Cocina's upload before a save that
# never came, or a build from before `10.9i-ii`); one nothing names, fresh (a save
# in flight); her new cover and the withdrawn offer's dish, named.
note
OLD_ID="$(uuid)"; OLD_PIC="$WS_C/$OLD_ID"
FRESH_PIC="$WS_C/$(uuid)"
upload "$OLD_PIC" "$FONDA" && upload "$FRESH_PIC" "$FONDA" || fail "the owner could not put two more pictures in her folder"
ask_db "update storage.objects set created_at = now() - interval '2 days' where bucket_id = '$BUCKET' and name like '$OLD_PIC/%'" > /dev/null
LISTED="$(bash docs/runbooks/delete-orphan-photos.sh --local 2>&1)"
DELETED="$(bash docs/runbooks/delete-orphan-photos.sh --local --delete 2>&1)"
KEPT_AFTER="$(ask_db "select count(*) from storage.objects where bucket_id = '$BUCKET' and name like '$WS_O/%'")"
LEFT_AFTER="$(kept "$OLD_PIC") $(kept "$FRESH_PIC") $(kept "$NEW_PIC") $(kept "$MGR_PIC")"
STILL_READ="$(reads "$NEW_PIC/$LARGE" "$VECINA")"
if grep -c "$BUCKET *$WS_O  1 file" <<< "$LISTED" > /dev/null \
   && grep -c "$BUCKET *$OLD_PIC  2 file" <<< "$LISTED" > /dev/null \
   && ! grep -c -e "$FRESH_PIC" -e "$NEW_PIC" -e "$MGR_PIC" <<< "$LISTED" > /dev/null \
   && grep -c "deleted   $BUCKET/$WS_O" <<< "$DELETED" > /dev/null && grep -c "deleted   $BUCKET/$OLD_PIC" <<< "$DELETED" > /dev/null \
   && grep -c "Every folder listed is gone" <<< "$DELETED" > /dev/null \
   && [[ "$KEPT_AFTER" == "0" && "$LEFT_AFTER" == "0 2 2 1" && "$STILL_READ" == "200" ]]; then
  ok "the runbook lists the deleted kitchen's folder and the living kitchen's picture nothing names, two days old — not the fresh one, not her cover, not the offer's dish — and deletes those two: files left $LEFT_AFTER (old, fresh, cover, dish), her cover still read by a neighbour"
else
  fail "the runbook listed: $(head -c 600 <<< "$LISTED") — deleted: $(head -c 500 <<< "$DELETED") — the deleted kitchen's files left $KEPT_AFTER; old, fresh, cover, dish left '$LEFT_AFTER' (expected '0 2 2 1'); a neighbour's read of her cover $STILL_READ"
fi

echo
if (( fails == 0 && ran < 18 )); then
  echo "FAIL: only $ran assertion groups ran, expected 18 — this check asserted almost nothing."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — the bucket $BUCKET holds its walls over the real APIs:"
  echo "every member of a kitchen writes in her folder (her helper since 0083) and opens all of it; anyone"
  echo "else signed in opens only what the door shows now (0090), nobody signed out; pictures only, nothing"
  echo "overwritten; her kitchen deletes what nothing names and nothing else — and the runbook, the aviso's"
  echo "hand, a deleted kitchen's photos and a living one's nothing names."
  exit 0
fi
echo "$ran group(s) ran, $fails failed."
exit 1

#!/usr/bin/env bash
# 10.5c-iii-consent-contract — does each app read her answer to offers, give it on its sheet's words and
# report a campaign's tap by the names the database answers — and is its sheet's version the one the
# analyst's approval inserts?
#
# WHY THIS EXISTS. `itacate/src/api/push.ts` and `cocina/src/api/push.ts` are each app's claim about
# `0093`'s three doors: `my_consent`, `set_my_consent`, `count_campaign_tap`, their arguments, the keys of
# her answers, and `PALABRAS` — the version of words the sheet shows and a yes is given on. PostgREST
# matches a function BY ITS ARGUMENTS' NAMES, so a misspelt `p_` name is a 404: the sheet would never keep
# a yes and *Notificaciones* would never draw her answer — and the app says only *No se guardó*. A version
# the runbook's *on 1* does not insert is refused for ever (22023), the day the analyst turns offers on, on
# every phone. The typecheck, the suites and the bundler pass over each.
#
# WHAT IT ASSERTS, over HTTP against a real GoTrue and PostgREST, as a probe account:
#   1. The claim is read OUT OF `push.ts` — the three names, their arguments, the app, the version, her
#      answers' keys — and *on 1* out of the runbook: nothing retyped.
#   2. Her answers, never asked: an object by exactly the app's keys, each null.
#   3. ⚠️ Dark: a yes on the app's version before the analyst approves it is refused, 400 / 22023 — what
#      the sheet is told today.
#   4. *On 1*, run as postgres, approves the app's version for that app, for both uses.
#   5. Then a yes by the app's names: 200, her answer by exactly the app's keys, yes on that version; one
#      record per use, as postgres reads them. And a no: 200, no.
#   6. A campaign's tap by the app's names: found (204) — a send no message has changes nothing, says nothing.
#   7. Signed out, nothing is answered.
#   8. Nothing is left behind: the probe and the words *on 1* approved are deleted, so a second run — the
#      other app's, in the same job — starts dark again.
#
# ⚠️ WHAT IT DOES NOT ASSERT: who is sent a campaign, the hours, the limits, the counts
# (`supabase/tests/0093_campaigns.sql`); when the sheet asks (each app's `test/push.test.ts`); that a message
# ARRIVES — no check can (ADR-035 §2.11).
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5c-iii-consent-contract.sh
#       bash docs/checks/10.5c-iii-consent-contract.sh itacate/src/api/push.ts
# With: $1 an app's push.ts (Wera Cocina's by default), $2 the runbook — how the falsifier points it at a
#       broken copy.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

PUSH_TS="${1:-cocina/src/api/push.ts}"
RUNBOOK="${2:-docs/runbooks/campaigns.sql}"
CREDENTIALS_TS="cocina/src/auth/credentials.ts"
for f in "$PUSH_TS" "$RUNBOOK" "$CREDENTIALS_TS"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f (run this from the repository root)"; exit 1; }
done

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the app's own claim, read out of its source -------------------------
const() { sed -n "s/^export const $1 = '\([^']*\)';.*/\1/p" "$2" | head -1; }
fields_of() { # file interface prefix-regex — a key may be optional (`?:`)
  awk -v want="export interface $2 {" '$0==want{f=1;next} f&&/^}/{exit} f' "$1" \
    | sed -n "s/^ *readonly \($3[a-z_]*\)?\{0,1\}:.*/\1/p" | paste -sd, -
}

MINE="$(const MY_CONSENT "$PUSH_TS")"
GIVE="$(const SET_MY_CONSENT "$PUSH_TS")"
CTAP="$(const COUNT_CAMPAIGN_TAP "$PUSH_TS")"
APP="$(const APP "$PUSH_TS")"
WORDS="$(const PALABRAS "$PUSH_TS")"
MINE_ARGS="$(fields_of "$PUSH_TS" ConsentArgs 'p_')"
GIVE_ARGS="$(fields_of "$PUSH_TS" AnswerArgs 'p_')"
CTAP_ARGS="$(fields_of "$PUSH_TS" CampaignTapArgs 'p_')"
CONSENT_KEYS="$(fields_of "$PUSH_TS" ConsentRow '')"
ANSWER_KEYS="$(fields_of "$PUSH_TS" AnswerRow '')"
NAME_KEY="$(const FULL_NAME_KEY "$CREDENTIALS_TS")"

for pair in "MY_CONSENT:$MINE" "SET_MY_CONSENT:$GIVE" "COUNT_CAMPAIGN_TAP:$CTAP" "APP:$APP" "PALABRAS:$WORDS" \
            "ConsentArgs:$MINE_ARGS" "AnswerArgs:$GIVE_ARGS" "CampaignTapArgs:$CTAP_ARGS" \
            "ConsentRow:$CONSENT_KEYS" "AnswerRow:$ANSWER_KEYS" "FULL_NAME_KEY:$NAME_KEY"; do
  if [[ -z "${pair#*:}" ]]; then
    echo "FAIL: could not read ${pair%%:*} out of the app's source"
    echo "      This check asserts the app's own claim. Without it there is nothing to"
    echo "      assert, and a green here would be the vacuous kind."
    exit 1
  fi
done
ok "read from $PUSH_TS: $MINE($MINE_ARGS) → {$CONSENT_KEYS} of {$ANSWER_KEYS}, $GIVE($GIVE_ARGS), $CTAP($CTAP_ARGS); app '$APP', words '$WORDS'"

# *On 1*: its marker line and every line after it up to the first that ends in `;`.
awk 'index($0, "-- on 1:") == 1 { on = 1; next } on { print; if ($0 ~ /;[[:space:]]*$/) exit }' "$RUNBOOK" > "$SCRATCH/on_1.sql"
if [[ -z "$(grep -v '^[[:space:]]*--' "$SCRATCH/on_1.sql" | tr -d '[:space:]')" ]]; then
  echo "FAIL: no statement after '-- on 1:' in $RUNBOOK — nothing approves any words"
  exit 1
fi
ok "read from $RUNBOOK: on 1"

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
J() { python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"; }
# ⚠️ GoTrue rate-limits sign-ups and answers a limited one with an EMPTY body — retried, long
# enough to outlast its 5-minute window when the falsifier has spent it.
signup() { # email display-name -> a session token, or nothing
  python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": "consent-probe-123", "data": {sys.argv[2]: sys.argv[3]}}))' \
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
# Her answers by exactly the app's keys; `want` is `null` (never asked) or `true`/`false` (that answer).
answers_py() {
  python3 -c '
import json,sys
keys=sorted(sys.argv[1].split(",")); akeys=sorted(sys.argv[2].split(",")); want=sys.argv[3]; words=sys.argv[4]
d=json.load(sys.stdin)
if not isinstance(d,dict): print("her answers were not an object"); sys.exit()
got=sorted(d.keys())
if got!=keys:
    missing=[k for k in keys if k not in got]; extra=[k for k in got if k not in keys]
    print(f"her answers carried no {missing[0]!r}" if missing else f"her answers carried a key the app does not read: {extra[0]!r}"); sys.exit()
for k in keys:
    v=d[k]
    if want=="null":
        if v is not None: print(f"{k!r} was answered before she was asked"); sys.exit()
        continue
    if not isinstance(v,dict) or sorted(v.keys())!=akeys:
        print(f"an answer carried not exactly {akeys}: {v!r}"); sys.exit()
    if v.get("answer") is not (want=="true"): print(f"{k!r} was not {want}"); sys.exit()
    kept=v.get("words")
    if kept!=words: print(f"{k!r} was kept on {kept!r}, not {words!r}"); sys.exit()
print("ok")' "$CONSENT_KEYS" "$ANSWER_KEYS" "$1" "$WORDS"
}

STAMP="$(date +%s)$RANDOM"
TOKEN="$(signup "consent.$STAMP@example.mx" "Vecina Consent")"
[[ -n "$TOKEN" ]] || { echo "FAIL: GoTrue gave no session for the probe"; exit 1; }
PROBE_TOKEN="$TOKEN"
USER_ID="$(python3 -c 'import sys,json,base64; p=sys.argv[1].split(".")[1]; p+="="*(-len(p)%4); print(json.loads(base64.urlsafe_b64decode(p))["sub"])' "$TOKEN")"

# --- 2. never asked --------------------------------------------------------
out="$(api POST "/rest/v1/rpc/$MINE" "$(by_names "$MINE_ARGS" "$(J "$APP")")")"
if [[ "$(status "$out")" != 200 ]]; then
  fail "$MINE answered $(status "$out"): $(body "$out" | head -c 300)"
else
  verdict="$(answers_py null <<< "$(body "$out")")"
  [[ "$verdict" == ok ]] && ok "$MINE: her answers by exactly {$CONSENT_KEYS}, each null — never asked" || fail "$verdict"
fi

# --- 3. dark: before the analyst approves ----------------------------------
already="$(as_postgres "select count(*) from servicio.consent_words where words = '$WORDS'")"
if [[ "$already" == 0 ]]; then
  out="$(api POST "/rest/v1/rpc/$GIVE" "$(by_names "$GIVE_ARGS" "$(J "$WORDS")" true)")"
  code="$(pick code "$(body "$out")")"
  [[ "$(status "$out")" == 400 && "$code" == 22023 ]] && ok "dark: a yes on '$WORDS' before it is approved — 400, 22023, what the sheet is told today" \
    || fail "a yes before approval answered $(status "$out") $code: $(body "$out" | head -c 200)"
else
  fail "'$WORDS' was already approved on this database before the check ran — run it on a fresh one (supabase db reset)"
fi

# --- 4. on 1, as postgres --------------------------------------------------
if supabase db query --local -f "$SCRATCH/on_1.sql" > "$SCRATCH/on_1.out" 2>&1; then
  row="$(as_postgres "select app = '$APP' and purposes @> array['promociones','medir_promociones'] and shown_on = 'hoja' from servicio.consent_words where words = '$WORDS'")"
  [[ "$row" == true ]] && ok "on 1 approves '$WORDS' for '$APP', for both uses, on the sheet" \
    || fail "the runbook approves no words '$WORDS' for app '$APP' (read: '$row') — the sheet's yes would be refused for ever"
else
  fail "on 1 did not run: $(head -c 300 "$SCRATCH/on_1.out")"
fi

# --- 5. a yes, then a no ---------------------------------------------------
out="$(api POST "/rest/v1/rpc/$GIVE" "$(by_names "$GIVE_ARGS" "$(J "$WORDS")" true)")"
if [[ "$(status "$out")" != 200 ]]; then
  fail "$GIVE answered $(status "$out"): $(body "$out" | head -c 300)"
else
  verdict="$(answers_py true <<< "$(body "$out")")"
  [[ "$verdict" == ok ]] && ok "$GIVE yes: answered with her answers, each a yes on '$WORDS'" || fail "$verdict"
  kept="$(as_postgres "select count(*) from servicio.consent where user_id = '$USER_ID' and app = '$APP' and answer and words = '$WORDS'")"
  [[ "$kept" == 2 ]] && ok "kept as one record per use, as postgres reads them (2)" || fail "her yes was kept as $kept record(s), not 2"
  out="$(api POST "/rest/v1/rpc/$GIVE" "$(by_names "$GIVE_ARGS" "$(J "$WORDS")" false)")"
  verdict="$(answers_py false <<< "$(body "$out")")"
  [[ "$(status "$out")" == 200 && "$verdict" == ok ]] && ok "$GIVE no: answered, each a no" || fail "a no answered $(status "$out"): $verdict"
fi

# --- 6. a campaign's tap ---------------------------------------------------
out="$(api POST "/rest/v1/rpc/$CTAP" "$(by_names "$CTAP_ARGS" 9007199254740991)")"
case "$(status "$out")" in
  200|204) ok "$CTAP: found by its names — a send no message has changes nothing, says nothing" ;;
  *) fail "$CTAP answered $(status "$out"): $(body "$out" | head -c 300)" ;;
esac

# --- 7. signed out ---------------------------------------------------------
TOKEN=""
out="$(api POST "/rest/v1/rpc/$MINE" "$(by_names "$MINE_ARGS" "$(J "$APP")")")"
[[ "$(status "$out")" == 401 ]] && ok "signed out: $MINE answers 401" || fail "signed out, $MINE answered $(status "$out")"
TOKEN="$PROBE_TOKEN"

# --- nothing left behind ---------------------------------------------------
# ⚠️ ONE STATEMENT A CALL: `db query` runs what it is given as one prepared statement, which refuses two
# commands — from a string or a file. Her records go with the probe (`on delete cascade`), then the words.
supabase db query --local "delete from auth.users where id = '$USER_ID'" > "$SCRATCH/cleanup.out" 2>&1
supabase db query --local "delete from servicio.consent_words w where w.added_at > now() - interval '1 hour' and not exists (select 1 from servicio.consent c where c.words = w.words)" >> "$SCRATCH/cleanup.out" 2>&1
left="$(as_postgres "select count(*) from servicio.consent_words where words = '$WORDS'")"
[[ "$left" == 0 ]] && ok "nothing left behind: the probe and the words on 1 approved, deleted" \
  || fail "the words on 1 approved are still here ($left) — the next run would find them approved: $(head -c 200 "$SCRATCH/cleanup.out")"

echo
if (( fails > 0 )); then
  echo "$fails assertion(s) failed: $PUSH_TS does not describe 0093's three doors, or its words, as applied."
  exit 1
fi
echo "every assertion holds — $PUSH_TS ('$APP') reads, gives and counts by 0093's names, on words the runbook approves."

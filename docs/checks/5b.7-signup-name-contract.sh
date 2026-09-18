#!/usr/bin/env bash
# 5b.7-signup-name-contract — does the name a person types at sign-up survive?
#
# WHY THIS EXISTS, AND THE PLAN ROW SAYS IT IN ONE SENTENCE: *"a round trip is
# the evidence, not the file."* `5b.7` collects `Nombre` and `Apellido`, joins
# them, and hands the result to `supabase.auth.signUp` under
# `options.data.full_name`. Every part of that except the last hop is ours and
# is covered by `app/test/credentials.test.ts`. THE LAST HOP IS A CLAIM ABOUT
# SOMEBODY ELSE'S SYSTEM — that GoTrue writes `options.data` into the new user's
# `raw_user_meta_data` and keeps it there — and ADR-035 §9 is unambiguous about
# what settles those: a green CI run.
#
# ⚠️⚠️ AND THE FAILURE IT GUARDS IS SILENT AND IRRECOVERABLE. `signUp` does not
# reject an unknown option. If the metadata were dropped — a renamed field, a
# library that stopped forwarding it, a project setting — the account is still
# created, the shopkeeper still reaches her shop, and nothing anywhere goes red.
# The name is simply not there, and `5b.8`'s backfill then reads an empty column
# for every person who joined in between. They cannot be asked again: there is
# no screen that asks, and there is nothing to derive a name from.
#
# WHAT IT ASSERTS, all against a REAL round trip over HTTP:
#
#   1. The metadata key is read OUT OF `app/src/auth/credentials.ts`, not typed
#      in here — the rule `5b-i` established about `p_display_name`.
#   2. ⚠️ THAT KEY IS `full_name`, AND THIS IS THE ONE STRING THIS FILE SPELLS
#      ITSELF, deliberately. It is not our name for the field; it is GOOGLE'S.
#      The provider writes the name it is handed into `raw_user_meta_data.
#      full_name`, and matching it is the whole reason `5b.8` gets one reader
#      for both ways in. Reading it from the app here too would let the app
#      rename itself into agreement with nothing at all.
#   3. `AuthProvider.tsx` actually sends it, and sends it INSIDE `options.data`
#      — the one place GoTrue reads. A key at the top level of the signUp body
#      is silently ignored.
#   4. A person signing up with that metadata reads it back, byte for byte,
#      accents and two surnames included.
#   5. ⚠️ AND IT IS STILL THERE ON A LATER SIGN-IN, from a token the sign-up
#      response never saw. This is the assertion that separates "the response
#      echoed what we sent" from "the row holds it" — and the row is what
#      `5b.8` migrates against.
#   6. ⚠️ THE ANTI-VACUITY CONTROL, RUN EVERY TIME: a second person signs up
#      with NO metadata and must have NO `full_name`. Without this, 4 and 5
#      would both stay green on a GoTrue that invented the field, and on a
#      check that had stopped reading the wire at all.
#
# ⚠️ WHAT IT DOES NOT ASSERT. Anything about the SCREEN — §2.11 refuses suites
# over rendering, so that `entrar.tsx` shows those two boxes on the sign-up half
# and never on the sign-in half is the owner's own phone, as ever. And nothing
# about GOOGLE: local Google OAuth needs real credentials, so that the provider
# writes this same key is the documented default and remains UNMEASURED on this
# project. One glance at `user_metadata` on the next real Google sign-in on the
# phone settles it.
#
# ⚠️ NO `mapfile`, NO `declare -A` — macOS ships bash 3.2 and this runs on the
# owner's Mac as well as in CI. The trap five other checks here already recorded.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5b.7-signup-name-contract.sh
# With: a path to the credentials module as $1 and to the provider as $2, which
#       is how the falsification harness points it at mutated copies.
# Exit: 0 the name survives the round trip; 1 otherwise.

set -uo pipefail

CREDENTIALS="${1:-app/src/auth/credentials.ts}"
PROVIDER="${2:-app/src/auth/AuthProvider.tsx}"
[[ -r "$CREDENTIALS" ]] || { echo "FAIL: cannot read $CREDENTIALS"; exit 1; }
[[ -r "$PROVIDER" ]]    || { echo "FAIL: cannot read $PROVIDER"; exit 1; }

# ⚠️ GOOGLE'S SPELLING. See the header, assertion 2: this is the one contract in
# this file that is NOT the app's to change.
GOOGLE_METADATA_KEY='full_name'

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# --- 1. the app's own claim, read out of its source ------------------------
KEY="$(sed -n "s/^export const FULL_NAME_KEY = '\([^']*\)';.*/\1/p" "$CREDENTIALS" | head -1)"

note
if [[ -z "$KEY" ]]; then
  fail "could not read FULL_NAME_KEY out of $CREDENTIALS"
  echo "      This check asserts the app's own string against a live round trip."
  echo "      If it cannot find that string it has nothing to assert, and a green"
  echo "      here would be the vacuous kind this repository has recorded five"
  echo "      shapes of."
  exit 1
fi
ok "read from $CREDENTIALS: the metadata key is '$KEY'"

# --- 2. and it is the key Google writes ------------------------------------
note
if [[ "$KEY" != "$GOOGLE_METADATA_KEY" ]]; then
  fail "the app stores the name under '$KEY', and Google's provider writes '$GOOGLE_METADATA_KEY'"
  echo "      That is not a naming preference. 5b.8 reads ONE key for both ways"
  echo "      in; two keys is a branch on which button a person happened to tap"
  echo "      months earlier, and the branch would be invisible until a Google"
  echo "      account showed up with no name beside it."
else
  ok "it is the key Supabase's Google provider already writes"
fi

# --- 3. the provider sends it, and sends it inside options.data ------------
# ⚠️ COMMENTS ARE STRIPPED FIRST — the rule `conventions-gate.sh` paid for. This
# file's own header explains `options.data`, and a guard that read the warning
# and reported the defect would be red on the file that got it right.
CODE="$SCRATCH/provider.txt"
grep -v -E '^[[:space:]]*(//|\*|/\*)' "$PROVIDER" > "$CODE"

note
# The `signUp` call's own block, bounded — not the whole file. `5b-i` and
# `plan-handover.sh` both paid for a reader that trusted the next line to end
# the region it wanted.
SIGNUP_BLOCK="$(awk '
  index($0, "supabase.auth.signUp({") > 0 { inblock = 1 }
  inblock { print }
  inblock && index($0, "});") > 0 { exit }
' "$CODE")"

if [[ -z "$SIGNUP_BLOCK" ]]; then
  fail "no supabase.auth.signUp({ … }) call found in $PROVIDER"
  echo "      The round trip below would then be testing GoTrue and not this app."
elif ! grep -q 'options:' <<< "$SIGNUP_BLOCK"; then
  fail "$PROVIDER calls signUp with no \`options\` — the name is not being sent"
  echo "      GoTrue does not reject an unknown option and does not reject a"
  echo "      missing one. The account is created either way; the name is simply"
  echo "      not there, and nobody finds out."
elif ! grep -qE 'options:[[:space:]]*\{[[:space:]]*data:' <<< "$SIGNUP_BLOCK"; then
  fail "$PROVIDER sends \`options\` but not \`options.data\`"
  echo "      \`data\` is the only member of \`options\` GoTrue writes to"
  echo "      raw_user_meta_data. Anything else there is accepted and dropped."
  sed 's/^/        /' <<< "$SIGNUP_BLOCK"
elif ! grep -qE '\[FULL_NAME_KEY\]|'"'$KEY'"':|"'"$KEY"'":|[^a-z_]'"$KEY"':' <<< "$SIGNUP_BLOCK"; then
  fail "$PROVIDER sends options.data, but not under the key it exports"
  sed 's/^/        /' <<< "$SIGNUP_BLOCK"
else
  ok "$PROVIDER sends it inside options.data, under the exported key"
fi

# --- the local stack -------------------------------------------------------
STATUS="$(supabase status -o env 2>/dev/null)"
API_URL="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<< "$STATUS")"
PUBKEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$STATUS")"
if [[ -z "$API_URL" || -z "$PUBKEY" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` (and \`supabase db reset\`)."
  exit 1
fi

# ⚠️ THE PUBLISHABLE KEY AND NEVER THE SECRET ONE — the same rule the two
# sister checks state. The secret key is an admin door; a name read back through
# it says nothing about what a phone can see.
case "$PUBKEY" in sb_secret_*|eyJ*) echo "FAIL: that is not a publishable key"; exit 1 ;; esac

api() { # method path body token -> body, with the HTTP status on the last line
  local method="$1" path="$2" body="${3:-}" token="${4:-}" auth
  if [[ -n "$token" ]]; then auth="Authorization: Bearer $token"; else auth="X-Empty: 1"; fi
  if [[ -n "$body" ]]; then
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" \
      -H "apikey: $PUBKEY" -H "$auth" -H 'Content-Type: application/json' -d "$body"
  else
    curl -s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "apikey: $PUBKEY" -H "$auth"
  fi
}
body() { sed '$d' <<< "$1"; }

# ⚠️⚠️ A RESPONSE BODY IS WRITTEN TO A FILE AND NEVER INTERPOLATED INTO PYTHON
# SOURCE. `5b-ii-a-roster-contract.sh`'s harness found that defect in its sister
# on its first run: an error body quotes the value it is complaining about, and
# those escaped quotes, pasted into a literal, are unescaped by Python before
# json.loads sees them — the check then says "unreadable" where it owes the
# name. Red for the wrong reason, which is what gets a check deleted.
stash() { local f="$SCRATCH/$1.json"; body "$2" > "$f"; echo "$f"; }

# The metadata on a user document, or a marker. Reads `user_metadata` and falls
# back to the same object nested under `user`, which is the shape /signup returns.
metadata_name() { # file key -> the value, `!absent`, or `!<reason>`
  python3 - "$1" "$2" <<'PY'
import json, sys
try:
    doc = json.load(open(sys.argv[1]))
except Exception as exc:
    print('!unreadable: %s' % exc); raise SystemExit
if not isinstance(doc, dict):
    print('!not an object: %r' % (doc,)); raise SystemExit
if 'error' in doc or 'error_code' in doc or 'msg' in doc:
    print('!error: %r' % (doc.get('error_code') or doc.get('error') or doc.get('msg'),))
    raise SystemExit
meta = doc.get('user_metadata')
if meta is None and isinstance(doc.get('user'), dict):
    meta = doc['user'].get('user_metadata')
if not isinstance(meta, dict):
    print('!no user_metadata object'); raise SystemExit
if sys.argv[2] not in meta:
    print('!absent'); raise SystemExit
print(meta[sys.argv[2]])
PY
}

# ⚠️⚠️ THE NAME THE PROBE SENDS, AND EVERY PART OF IT IS LOAD-BEARING. Two
# surnames, because `5b.7` refused a split-on-space rule on exactly this shape.
# Accents, because a transport that mangles UTF-8 would otherwise be green — and
# this is a Mexican app whose users are mostly called things with accents in.
PROBE_NAME='María del Carmen Rodríguez Gómez'
PASSWORD='nombre-probe-123'
STAMP="$$-$(date +%s)"
NAMED_EMAIL="signup-named-$STAMP@example.com"
BARE_EMAIL="signup-bare-$STAMP@example.com"

PAYLOAD="$(python3 - "$KEY" "$PROBE_NAME" "$NAMED_EMAIL" "$PASSWORD" <<'PY'
import json, sys
key, name, email, password = sys.argv[1:5]
print(json.dumps({'email': email, 'password': password, 'data': {key: name}}))
PY
)"

# --- 4. the name comes back on the sign-up itself --------------------------
note
SIGNED_UP="$(stash signup "$(api POST /auth/v1/signup "$PAYLOAD")")"
GOT="$(metadata_name "$SIGNED_UP" "$KEY")"
if [[ "$GOT" != "$PROBE_NAME" ]]; then
  fail "the name did not survive signUp — got '$GOT', sent '$PROBE_NAME'"
  echo "      This is the hop no file in this repository can assert. If it is"
  echo "      red, every account created from here on has no name, silently."
  sed 's/^/        /' "$SIGNED_UP" | head -4
else
  ok "the name came back from /auth/v1/signup, accents and both surnames intact"
fi

# --- 5. and it is still there on a later sign-in ---------------------------
# ⚠️ THE ASSERTION THAT MATTERS TO `5b.8`. A response can echo what it was
# handed; a row has to hold it. This token is minted by a second request that
# never saw the first one's body.
note
SIGNED_IN="$(api POST '/auth/v1/token?grant_type=password' \
  "{\"email\":\"$NAMED_EMAIL\",\"password\":\"$PASSWORD\"}")"
TOKEN="$(python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))" \
  <<< "$(body "$SIGNED_IN")" 2>/dev/null)"
if [[ -z "$TOKEN" ]]; then
  fail "could not sign the probe back in — $(body "$SIGNED_IN" | head -c 200)"
else
  LATER="$(stash later "$(api GET /auth/v1/user '' "$TOKEN")")"
  GOT_LATER="$(metadata_name "$LATER" "$KEY")"
  if [[ "$GOT_LATER" != "$PROBE_NAME" ]]; then
    fail "the name was echoed but not STORED — a later read gave '$GOT_LATER'"
    echo "      5b.8 backfills \`workspace_member.display_name\` from"
    echo "      raw_user_meta_data. A value that only ever existed in a response"
    echo "      body is a migration written against an empty column."
  else
    ok "a fresh token reads the same name back — it is in raw_user_meta_data"
  fi
fi

# --- 6. the control: no metadata sent, no metadata invented ----------------
# ⚠️ THE ANTI-VACUITY ASSERTION, AND IT RUNS EVERY TIME RATHER THAN LIVING IN
# THE HARNESS. Assertions 4 and 5 are only worth something if the field can be
# ABSENT — on a server that handed every user a `full_name`, or in a check that
# had stopped reading the wire, both would stay green and mean nothing.
note
# ⚠️ THE BODY IS BUILT INTO A VARIABLE FIRST, AND THAT IS NOT STYLE. Written
# inline it sat inside `stash "$( api … "{\"email\"…}" )"` — three levels of
# command substitution — and bash handed GoTrue a mangled body: the check
# reported `bad_json` where it owed "the field was absent". RED FOR THE WRONG
# REASON on its very first run, the third time this repository has hit that
# shape in a contract check, and here it would have discredited the one
# assertion that keeps the other two honest.
BARE_PAYLOAD="{\"email\":\"$BARE_EMAIL\",\"password\":\"$PASSWORD\"}"
BARE="$(stash bare "$(api POST /auth/v1/signup "$BARE_PAYLOAD")")"
GOT_BARE="$(metadata_name "$BARE" "$KEY")"
if [[ "$GOT_BARE" != '!absent' ]]; then
  fail "a sign-up that sent no name came back with '$GOT_BARE' under '$KEY'"
  echo "      Assertions 4 and 5 can then pass without this app sending"
  echo "      anything at all, which is exactly the vacuous green rule 4 of this"
  echo "      repository is about."
else
  ok "a sign-up with no metadata has no '$KEY' — the two above are not vacuous"
fi

echo
if (( fails > 0 )); then
  echo "$fails of $ran assertion groups failed."
  exit 1
fi
echo "all $ran assertion groups passed — the name a person types at sign-up"
echo "reaches raw_user_meta_data under the key Google writes, and stays there."

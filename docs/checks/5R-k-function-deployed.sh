#!/usr/bin/env bash
# 5R-k-function-deployed — is the HOSTED function the one this repository has
# merged, and does it hold the owner's Apple key?
#
# WHY THIS EXISTS. `5R-f-schema-deployed.sh` exists because a green CI run
# applied every migration to a database that was then thrown away. `5R-k` added
# the first thing in this system that is deployed and is NOT a migration: the
# Edge Function `apple-revoke`. `supabase db push` does not carry it,
# `5R-f` cannot see it, and nothing fails when it is missing — a deletion goes
# ahead exactly as before and Apple is simply never told.
#
# WHAT IT ASSERTS, all of it about the real hosted project:
#   1. the repository names a deploy target, and the function's file a build;
#   2. the function ANSWERS there (a 404 is *never deployed*);
#   3. the build it reports is the build the file declares (else it is stale:
#      something merged and was not deployed);
#   4. ⚠️ it reports itself CONFIGURED: the three Apple secrets are set. Without
#      them it answers 503 to every call. ⚠️ This does not prove the key is the
#      RIGHT one — only Apple can say, at a real deletion from an iPhone;
#   5. a call with no session is refused with 401, by the function itself.
#
# ⚠️ IT NEEDS NO TOKEN AND NO CLI: one unauthenticated GET, which the function
# answers because `verify_jwt` is off for it (supabase/config.toml). It reveals
# a build number and one boolean.
#
# ⚠️ IT IS IN NO WORKFLOW, for `5R-f`'s second reason: its answer depends on the
# world and not on the diff, so it would redden pull requests that did not
# cause it and cannot fix it.
#
# Run:  bash docs/checks/5R-k-function-deployed.sh
#       bash docs/checks/5R-k-function-deployed.sh --reply <status> <body>   # the falsifier's
# Exit: 0 when the hosted function is the merged one and holds its secrets.

set -uo pipefail

FUNCTION="supabase/functions/apple-revoke/index.ts"
README="supabase/README.md"
NAME="apple-revoke"

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

[[ -r "$FUNCTION" ]] || { echo "FAIL: cannot read $FUNCTION — run me from the repo root"; exit 1; }
[[ -r "$README" ]]   || { echo "FAIL: cannot read $README — run me from the repo root"; exit 1; }

CANNED=0
if [[ "${1:-}" == "--reply" ]]; then
  CANNED=1
  CANNED_STATUS="${2:-}"
  CANNED_BODY="${3:-}"
fi

note
BUILD="$(sed -n 's/^export const BUILD = \([0-9][0-9]*\);.*/\1/p' "$FUNCTION" | head -1)"
REF="$(sed -n 's/^\*\*Deploy target — project ref:\*\* `\([a-z0-9]*\)`.*/\1/p' "$README" | head -1)"
if [[ -z "$BUILD" || -z "$REF" ]]; then
  fail "could not read the build ('$BUILD') or the deploy target ('$REF') — this check would assert nothing"
  exit 1
fi
ok "the repository declares build $BUILD of $NAME, for project $REF"

URL="https://$REF.supabase.co/functions/v1/$NAME"
pick() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')" <<< "$2" 2>/dev/null; }

if (( CANNED == 1 )); then
  STATUS="$CANNED_STATUS"
  BODY="$CANNED_BODY"
else
  REPLY="$(curl -s --max-time 20 -w $'\n%{http_code}' "$URL")"
  STATUS="$(tail -1 <<< "$REPLY")"
  BODY="$(sed '$d' <<< "$REPLY")"
fi

note
if [[ "$STATUS" == "200" && "$(pick function "$BODY")" == "$NAME" ]]; then
  ok "the hosted function answers"
else
  fail "the hosted function answered $STATUS $(head -c 160 <<< "$BODY") — it is NOT DEPLOYED."
  echo "      Until it is, an account made with Apple is deleted without Apple being told."
  echo "      REMEDY: supabase functions deploy $NAME --use-api"
  echo
  echo "$ran group(s) ran, $fails failed."
  exit 1
fi

note
HOSTED_BUILD="$(pick build "$BODY")"
if [[ "$HOSTED_BUILD" == "$BUILD" ]]; then
  ok "it is build $BUILD, the one merged"
else
  fail "the hosted function is build $HOSTED_BUILD and the repository declares $BUILD — it is STALE."
  echo "      REMEDY: supabase functions deploy $NAME --use-api"
fi

note
if [[ "$(pick configured "$BODY")" == "True" ]]; then
  ok "it holds its three Apple secrets (whether the key is the right one, only a real deletion shows)"
else
  fail "the hosted function has NO APPLE KEY: it answers 503 and Apple is never told."
  echo "      REMEDY (the owner, with the key file from his Apple developer account):"
  echo "        supabase secrets set APPLE_TEAM_ID=<team id> APPLE_KEY_ID=<key id> \\"
  echo "          APPLE_PRIVATE_KEY=\"\$(cat <path to AuthKey_....p8>)\""
  echo "      docs/HANDBOOK.md, *Turning on Entrar con Apple*, has every step."
fi

if (( CANNED == 0 )); then
  note
  REFUSED="$(curl -s --max-time 20 -o /dev/null -w '%{http_code}' -X POST "$URL" \
    -H 'Content-Type: application/json' -d '{"code":"x"}')"
  if [[ "$REFUSED" == "401" ]]; then
    ok "a call with no session is refused: 401"
  else
    fail "a call with no session answered $REFUSED — expected the function's own 401"
  fi
fi

echo
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — the hosted function is the merged one, and it is configured."
  exit 0
fi
echo "$ran group(s) ran, $fails failed."
exit 1

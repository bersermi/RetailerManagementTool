#!/usr/bin/env bash
# ============================================================================
# 10.5b-v-iii — can the push-security check still fail?
# ============================================================================
# Hands `10.5b-v-iii-push-security.sh` the answers Expo and the hosted database could give and
# requires red for each wrong one, FOR ITS REASON, and green for the right one. The answers are the
# shapes measured: Expo's whole-request refusal (`errors[0].code`) and a message's ticket
# (`data[0]`). Needs no network, no Supabase and no phone.
# ============================================================================

set -uo pipefail

CHECK="docs/checks/10.5b-v-iii-push-security.sh"
[[ -r "$CHECK" ]] || { echo "FAIL: cannot read $CHECK — run me from the repo root"; exit 1; }

passed=0
failed=0

# Measured 2026-11-21, push security on, this Mac with no token to the emulator's Wera Cocina: HTTP 403.
REFUSED='{"errors":[{"code":"UNAUTHORIZED","type":"USER","message":"Insufficient permissions to send push notifications to @wera-app/cocina.","isTransient":false,"metadata":{"experienceId":"@wera-app/cocina"}}]}'
TICKET_OK='{"data":[{"status":"ok","id":"01a20064-282f-73df-95d5-13cf97da70d1"}]}'
GONE='{"data":[{"status":"error","message":"not a valid Expo push token","details":{"error":"DeviceNotRegistered"}}]}'
BAD_TOKEN='{"errors":[{"code":"AUTHENTICATION_ERROR","type":"USER","message":"The bearer token is invalid.","isTransient":false}]}'
THROTTLED='{"errors":[{"code":"TOO_MANY_REQUESTS","message":"slow down"}]}'

red() { # name carries mac-status mac-body db-status db-body expected-reason-regex
  local out rc
  out="$(bash "$CHECK" --replies "$2" "$3" "$4" "$5" "$6" 2>&1)"; rc=$?
  if (( rc != 0 )) && grep -Eq "^FAIL: .*($7)" <<< "$out"; then
    echo "  ok    $1 — red, for the reason"; passed=$((passed+1))
  else
    echo "FAIL: $1 — rc=$rc, and no FAIL line matched /$7/:"
    grep -E '^FAIL' <<< "$out" | head -3
    failed=$((failed+1))
  fi
}

red security-off           1 200 "$TICKET_OK" 200 "$TICKET_OK" 'push security is OFF'
red sender-carries-nothing 0 403 "$REFUSED"   200 "$TICKET_OK" 'carries NO access token'
red db-refused-no-token    1 403 "$REFUSED"   403 "$REFUSED"   'REFUSED the database.s message \(UNAUTHORIZED\)'
red db-token-invalid       1 403 "$REFUSED"   401 "$BAD_TOKEN" 'REFUSED the database.s token \(AUTHENTICATION_ERROR'
red db-no-answer           1 403 "$REFUSED"   none 'no answer to request' 'was not accepted: none'
red db-pg-net-error        1 403 "$REFUSED"   error 'Timeout of 10000 ms reached' 'was not accepted: error'
red phone-gone-mac         1 200 "$GONE"      200 "$TICKET_OK" 'no phone Expo knows \(Expo, to this Mac'
red phone-gone-db          1 403 "$REFUSED"   200 "$GONE"      'no phone Expo knows \(Expo, to the database'
red mac-throttled          1 429 "$THROTTLED" 200 "$TICKET_OK" 'not a refusal for want of a token'
red mac-bad-header         1 401 "$BAD_TOKEN" 200 "$TICKET_OK" 'not a refusal for want of a token'
red db-ok-not-200          1 403 "$REFUSED"   500 "$TICKET_OK" 'a ticket ok with HTTP 500'

out="$(bash "$CHECK" --replies 1 403 "$REFUSED" 200 "$TICKET_OK" 2>&1)"; rc=$?
if (( rc == 0 )); then
  echo "  ok    security-on-and-carried — green"; passed=$((passed+1))
else
  echo "FAIL: push security on and the token carried was reported red:"; grep -E '^FAIL' <<< "$out" | head -3
  failed=$((failed+1))
fi

echo
if (( failed == 0 && passed == 12 )); then
  echo "all 12 answers were read as recorded — the push-security check goes red on every state it names."
  exit 0
fi
echo "$failed of $((passed + failed)) answers were misread."
exit 1

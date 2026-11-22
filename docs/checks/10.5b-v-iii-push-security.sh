#!/usr/bin/env bash
# 10.5b-v-iii-push-security — is Expo's push security ON, and does the hosted database's sender
# carry a token Expo accepts? Plan task `10.5b-v-iii`.
#
# WHY THIS EXISTS. Until Expo's push security is on, Expo's send address delivers a message from
# anyone who holds a phone's push token — measured 2026-11-21: one sent from this Mac with no token
# showed on the emulator's Wera Cocina. Once it is on (since 2026-11-21, the owner's hands), Expo
# refuses any message without the account's access token — the database's own messages too, unless
# the hosted Vault holds that token (`docs/runbooks/set-expo-push-token.sh`). Neither mistake shows
# anywhere: a refused push is a row with an error in `servicio.notification_send`, and nobody reads it.
#
# WHAT IT ASSERTS, about the real Expo and the real hosted project:
#   1. the hosted sender's headers carry an access token (`servicio.expo_headers()`);
#   2. a message from THIS Mac with no token, to a real phone of Wera Cocina or Itacate, is REFUSED
#      with Expo's `UNAUTHORIZED` — push security is on (measured: HTTP 403, *Insufficient
#      permissions to send push notifications to @wera-app/cocina*);
#   3. the same message sent BY THE HOSTED DATABASE — `net.http_post` with `servicio.expo_headers()`,
#      the URL and the timeout `servicio.push_send` uses — is ACCEPTED: Expo's ticket `ok`.
#
# ⚠️ IT NEEDS A REAL PHONE'S PUSH TOKEN, of a project the `wera-app` account owns. A made-up one is
# answered `DeviceNotRegistered` with the setting on or off (both measured 2026-11-21), so it cannot
# show the setting. Use a test phone's — the emulator's — never a person's. The token is read from a
# file: never an argument, never in this repository. Each run puts the database's message on that
# phone (*Enviado por la base de datos*), and this Mac's too while push security is off.
#
# ⚠️ IT ASKS THE HOSTED DATABASE TO SEND ONE MESSAGE — pg_net's own queue, as
# `set-discord-webhook.sh`'s test line does. No table of the apps is written, and the minute job
# (`read_push_answers`) reads only the answers `notification_send` names.
#
# ⚠️ IT IS IN NO WORKFLOW, for `5R-f`'s reason: its answer depends on the world, not the diff.
#
# Run:  bash docs/checks/10.5b-v-iii-push-security.sh <file holding ExponentPushToken[…]>
#       bash docs/checks/10.5b-v-iii-push-security.sh --replies <carries> <mac status> <mac body> \
#            <db status> <db body>                                  # the falsifier's: asks nothing
# Exit: 0 when all three hold.

set -uo pipefail

SEND='https://exp.host/--/api/v2/push/send'
fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

if [[ "${1:-}" == "--replies" ]]; then
  CARRIES="${2:-}"; MAC_STATUS="${3:-}"; MAC_BODY="${4:-}"; DB_STATUS="${5:-}"; DB_BODY="${6:-}"
else
  file="${1:-}"
  if [[ -z "$file" || ! -r "$file" ]]; then
    echo "usage: bash $0 <file holding a test phone's ExponentPushToken[…]>" >&2
    exit 2
  fi
  TOKEN="$(tr -d '[:space:]' < "$file")"
  # The token goes inside a SQL string and a JSON body, so anything but a token's shape is refused.
  if ! [[ "$TOKEN" =~ ^ExponentPushToken\[[A-Za-z0-9_-]{10,64}\]$ ]]; then
    echo "that file does not hold an Expo push token (ExponentPushToken[…])." >&2
    exit 2
  fi
  err="$(mktemp)"; trap 'rm -f "$err"' EXIT
  q() { # one statement → the rows, as JSON
    supabase db query --linked -o json "$1" 2>"$err" | jq -c '.rows' || { cat "$err" >&2; echo '[]'; }
  }

  # 1. What the sender carries — a yes or a no, never the token.
  CARRIES="$(q "select (servicio.expo_headers() ? 'Authorization')::int as v" | jq -r '.[0].v // empty')"

  # 2. This Mac, no token.
  body="$(jq -nc --arg to "$TOKEN" '[{to: $to, title: "Prueba de seguridad",
            body: "Desde una Mac sin token de Expo: si ves esto, la seguridad de Expo está apagada.",
            priority: "high"}]')"
  reply="$(curl -s --max-time 20 -w $'\n%{http_code}' -X POST "$SEND" \
    -H 'Content-Type: application/json' -H 'Accept: application/json' -d "$body")"
  MAC_STATUS="$(tail -1 <<< "$reply")"; MAC_BODY="$(sed '$d' <<< "$reply")"

  # 3. The hosted database, as `push_send` sends.
  id="$(q "select net.http_post(
             url                  := '$SEND',
             body                 := jsonb_build_array(jsonb_build_object(
                                       'to', '$TOKEN', 'title', 'Prueba de seguridad',
                                       'body', 'Enviado por la base de datos, con el token de Expo.',
                                       'priority', 'high')),
             headers              := servicio.expo_headers(),
             timeout_milliseconds := 10000) as v" | jq -r '.[0].v // empty')"
  row=''
  if [[ "$id" =~ ^[0-9]+$ ]]; then
    for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
      row="$(q "select status_code, content, timed_out, error_msg from net._http_response where id = $id" | jq -c '.[0] // empty')"
      [[ -n "$row" ]] && break
      sleep 2
    done
  fi
  if [[ -z "$row" ]]; then
    DB_STATUS="none"; DB_BODY="no answer to request '${id:-none}' in 30 seconds"
  elif [[ "$(jq -r '.timed_out // false' <<< "$row")" == "true" || -n "$(jq -r '.error_msg // empty' <<< "$row")" ]]; then
    DB_STATUS="error"; DB_BODY="$(jq -r '.error_msg // "timed out"' <<< "$row")"
  else
    DB_STATUS="$(jq -r '.status_code // empty' <<< "$row")"; DB_BODY="$(jq -r '.content // empty' <<< "$row")"
  fi
fi

# What Expo said, in one word: ok, UNAUTHORIZED, AUTHENTICATION_ERROR, DeviceNotRegistered, …
# A whole-request refusal is `errors[0].code`; a message's is its ticket's `details.error`.
word() {
  jq -r 'if (.errors? | type) == "array" then (.errors[0].code // "?")
         elif (.data? | type) == "array" then
           (.data[0] | if .status == "ok" then "ok" else (.details.error // .message // "?") end)
         else "?" end' <<< "$1" 2>/dev/null || echo "?"
}
MAC="$(word "$MAC_BODY")"; DB="$(word "$DB_BODY")"
gone() { echo "the phone's token is no phone Expo knows ($1 answered DeviceNotRegistered) — nothing is proven with it; read a live one"; }

if [[ "$CARRIES" == "1" ]]; then
  ok "the hosted sender carries an access token (servicio.expo_headers())"
else
  fail "the hosted sender carries NO access token ('${CARRIES:-no answer}') — run docs/runbooks/set-expo-push-token.sh; while push security is on, every message is refused"
fi

case "$MAC" in
  UNAUTHORIZED)        ok "Expo refused a message from this Mac with no token (UNAUTHORIZED, HTTP $MAC_STATUS): push security is on" ;;
  ok)                  fail "Expo TOOK a message from this Mac with no token (HTTP $MAC_STATUS) — push security is OFF (expo.dev → Access tokens)" ;;
  DeviceNotRegistered) fail "$(gone 'Expo, to this Mac,')" ;;
  *)                   fail "Expo's answer to this Mac is not a refusal for want of a token: HTTP $MAC_STATUS, $MAC — ${MAC_BODY:0:200}" ;;
esac

case "$DB" in
  ok)                   if [[ "$DB_STATUS" == "200" ]]; then
                          ok "Expo accepted the hosted database's message, sent as push_send sends (ticket ok)"
                        else
                          fail "the database's message: a ticket ok with HTTP $DB_STATUS — not Expo's answer"
                        fi ;;
  UNAUTHORIZED)         fail "Expo REFUSED the database's message (UNAUTHORIZED): push security is on and the sender carries no token — every message is refused NOW. Run docs/runbooks/set-expo-push-token.sh, or switch push security off" ;;
  AUTHENTICATION_ERROR) fail "Expo REFUSED the database's token (AUTHENTICATION_ERROR, HTTP $DB_STATUS): the stored token is not valid — every message is refused NOW, security on or off. Run docs/runbooks/set-expo-push-token.sh with a valid one" ;;
  DeviceNotRegistered)  fail "$(gone 'Expo, to the database,')" ;;
  *)                    fail "the database's message was not accepted: $DB_STATUS, $DB — ${DB_BODY:0:200}" ;;
esac

echo
if (( fails == 0 )); then
  echo "all 3 assertion groups passed — Expo's push security is on, and the database's messages carry its token."
  exit 0
fi
echo "$fails of 3 assertion groups failed."
exit 1

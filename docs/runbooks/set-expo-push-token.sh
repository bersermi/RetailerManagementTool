#!/usr/bin/env bash
# ============================================================================
# STORE (OR REPLACE) EXPO'S ACCESS TOKEN, WHICH EVERY PUSH FROM THE DATABASE CARRIES. Plan task
# `10.5b-v-ii`; first run by the owner on 2026-11-21 (`10.5b-v-iii`).
#
# `0092` sends the apps' messages from Postgres to Expo's push service — Wera Cocina's since
# `0092`, Itacate's since `10.5c-iii`. Expo's push security is ON for the `wera-app` account since
# 2026-11-21 (`10.5b-v-iii`): Expo refuses any message without the account's access token — 403
# `UNAUTHORIZED`, *Insufficient permissions to send push notifications to @wera-app/cocina*. The
# database carries that token as `Authorization: Bearer …` whenever the hosted Vault holds it under
# `expo_push_access_token` — this is how it gets there, and how it is replaced.
#
#   bash docs/runbooks/set-expo-push-token.sh            # asks for the token
#   bash docs/runbooks/set-expo-push-token.sh < file     # reads it from a file
#
# THE ORDER, AND IT MATTERS (measured 2026-11-20): Expo READS the header even while push security is
# off, and refuses the whole request when the token is not valid — 401 AUTHENTICATION_ERROR, *The
# bearer token is invalid* — so a wrong token stored here stops every message, switched on or not.
#   1. expo.dev → the `wera-app` account (it owns Wera Cocina and Itacate; not the personal one) →
#      Settings → Access tokens (https://expo.dev/accounts/wera-app/settings/access-tokens) → a token
#      of its robot user `push-sender` (made 2026-11-21; a robot acts only on `wera-app`, where a
#      personal token acts as its person on every account).
#   2. Run this. It asks Expo first, with that token, and changes NOTHING unless Expo accepts it.
#   3. Only then, on the same page, the switch *Enhanced security for push notifications — Require
#      access tokens before delivering notifications to your end users* (Expo's docs name no switch;
#      the owner read the page on 2026-11-21). Replacing the token while it is on: this script alone.
#   4. Prove it: `bash docs/checks/10.5b-v-iii-push-security.sh <file holding a test phone's push
#      token>` — this Mac refused without a token, the database's message accepted with it. ⚠️ This
#      script's own probe CANNOT show the setting: it sends to a made-up token, which Expo answers
#      `DeviceNotRegistered` with the setting on or off (both measured 2026-11-21) — only a real
#      phone's token can.
# To stop using it: switch Expo's push security off FIRST, then delete the secret (Supabase dashboard
# → Vault) — the other order stops every message.
#
# ⚠️ THE TOKEN IS A SECRET — it acts as the account on Expo. Never an argument (the shell's history,
# the process list), never in this repository, which is public.
#
# ⚠️ IT WRITES TO THE HOSTED DATABASE (the Vault) through `supabase db query --linked` — the
# Management API, no database password — then reads back that the sender's headers carry it.
# ============================================================================
set -euo pipefail

if [[ -t 0 ]]; then
  read -r -s -p 'Paste the Expo access token and press Enter: ' token || true
  echo
else
  read -r token || true
fi
token="${token//[[:space:]]/}"

# The token goes inside a SQL string, so anything but a token's own shape is refused, not escaped.
if ! [[ "$token" =~ ^[A-Za-z0-9_-]{20,200}$ ]]; then
  echo "NOTHING CHANGED: that does not look like an Expo access token (letters, digits, - and _)." >&2
  exit 2
fi

err="$(mktemp)"; sql="$(mktemp)"; hdr="$(mktemp)"
trap 'rm -f "$err" "$sql" "$hdr"' EXIT
chmod 600 "$sql" "$hdr"

# 1. Expo's own answer to this token, before anything is stored: one message to a token that is no
# phone. 200 — the token is valid (the message itself is refused as DeviceNotRegistered); 401 — not.
printf 'Authorization: Bearer %s\n' "$token" > "$hdr"
answer="$(curl -s -o /dev/null -w '%{http_code}' -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' -H 'Accept: application/json' -H @"$hdr" \
  -d '[{"to":"ExponentPushToken[runbook-probe]","title":"x","body":"x"}]')"
if [[ "$answer" != "200" ]]; then
  echo "NOTHING CHANGED: Expo answered $answer to that token (200 means it accepts it). Check it was copied whole." >&2
  exit 1
fi
echo "Expo accepts the token."

q() { # one statement → its last CSV line
  local out
  out="$(supabase db query --linked -o csv "$1" 2>"$err")" || { cat "$err" >&2; exit 1; }
  printf '%s\n' "$out" | tail -1
}

if [[ "$(q "select count(*) from pg_proc where proname = 'expo_headers' and pronamespace = 'servicio'::regnamespace")" != "1" ]]; then
  echo "NOTHING CHANGED: the hosted project does not have 0092 yet. Run 'supabase db push' first." >&2
  exit 1
fi

# A quoted heredoc: `$$` would otherwise expand to this shell's process id.
template="$(cat <<'SQL'
do $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'expo_push_access_token';
  if v_id is null then
    perform vault.create_secret('__TOKEN__', 'expo_push_access_token',
      'Expo access token every push from the database carries (0092, plan 10.5b-v-ii)');
  else
    perform vault.update_secret(v_id, '__TOKEN__');
  end if;
end
$$;
SQL
)"
printf '%s\n' "${template//__TOKEN__/$token}" > "$sql"
supabase db query --linked -f "$sql" >/dev/null 2>"$err" || { cat "$err" >&2; exit 1; }

# 2. What the sender will carry, compared by hash, so the token never travels as an argument.
hash="$(printf 'Bearer %s' "$token" | shasum -a 256 | cut -d' ' -f1)"
carried="$(q "select count(*) from (select servicio.expo_headers() ->> 'Authorization' as a) h where encode(sha256(convert_to(h.a, 'UTF8')), 'hex') = '$hash'")"
if [[ "$carried" != "1" ]]; then
  echo "UNEXPECTED: the sender's headers do not carry exactly that token (found $carried). Nothing is confirmed." >&2
  exit 1
fi
echo "Stored in the hosted Vault as expo_push_access_token; every push from the database now carries it."
echo "Now — and only now — switch on Expo's push security (step 3 at the top of this file), then prove it (step 4)."

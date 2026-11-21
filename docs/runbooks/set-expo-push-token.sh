#!/usr/bin/env bash
# ============================================================================
# STORE (OR REPLACE) EXPO'S ACCESS TOKEN, WHICH EVERY PUSH FROM THE DATABASE CARRIES. Plan task
# `10.5b-v-ii`.
#
# `0092` sends Wera Cocina's messages (a fonda's reservations) from Postgres to Expo's push
# service. Until Expo's push security is switched on, Expo takes a message from anyone who holds a
# phone's token; once it is on, Expo refuses any request without the account's access token. The
# database carries that token as `Authorization: Bearer …` whenever the hosted Vault holds it under
# `expo_push_access_token` — this is how it gets there.
#
#   bash docs/runbooks/set-expo-push-token.sh            # asks for the token
#   bash docs/runbooks/set-expo-push-token.sh < file     # reads it from a file
#
# THE ORDER, AND IT MATTERS (measured 2026-11-20): Expo READS the header even while push security is
# off, and refuses the whole request when the token is not valid — 401 AUTHENTICATION_ERROR, *The
# bearer token is invalid* — so a wrong token stored here stops every message, switched on or not.
#   1. expo.dev → Access tokens (https://expo.dev/settings/access-tokens, the page Expo's
#      docs point to) → create a token for the account that owns Wera Cocina and Itacate.
#   2. Run this. It asks Expo first, with that token, and changes NOTHING unless Expo accepts it.
#   3. Only then switch on Expo's push security — Expo's docs (read 2026-11-20) say it is enabled
#      "from your Expo dashboard", linking the same page, and name no switch or scope: read the page
#      for it, and say what you find.
# To stop using it: delete the secret (Supabase dashboard → Vault) AND switch Expo's push security
# off first — the other order stops every message.
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
echo "Now — and only now — switch on Expo's push security (step 3 at the top of this file)."

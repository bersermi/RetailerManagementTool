#!/usr/bin/env bash
# ============================================================================
# STORE (OR REPLACE) THE DISCORD WEBHOOK WERA'S ALERTS GO TO. Plan task `5P-f`.
#
# `0070` posts a line to the owner's Discord when somebody makes an account or
# a shop — but only once the hosted project's Vault holds the channel's webhook
# under the name `discord_avisos_webhook`. Without it nothing is sent and
# nothing fails, so a missing webhook is SILENT: this is how it gets there.
#
#   bash docs/runbooks/set-discord-webhook.sh            # asks for the URL
#   bash docs/runbooks/set-discord-webhook.sh < file     # reads it from a file
#
# The URL: Discord → the channel's ⚙️ → Integrations → Webhooks → Copy Webhook
# URL. To move the alerts to another channel, make a webhook there and run this
# again. To stop them, delete the webhook in Discord.
#
# ⚠️ THE URL IS A SECRET — whoever has it can post into the channel. It is
# never an argument (it would sit in the shell's history and the process list)
# and never in this repository, which is public.
#
# ⚠️ IT WRITES TO THE HOSTED DATABASE (the Vault) through `supabase db query
# --linked` — the Management API, no database password — then sends one test
# line and prints Discord's answer. 204 means delivered.
# ============================================================================
set -euo pipefail

if [[ -t 0 ]]; then
  read -r -s -p 'Paste the Discord webhook URL and press Enter: ' url || true
  echo
else
  read -r url || true
fi
url="${url//[[:space:]]/}"

# The URL goes inside a SQL string, so anything but a webhook's own shape is
# refused rather than escaped.
if ! [[ "$url" =~ ^https://((canary|ptb)\.)?discord(app)?\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$ ]]; then
  echo "NOTHING CHANGED: that is not a Discord webhook URL (https://discord.com/api/webhooks/<id>/<token>)." >&2
  exit 2
fi

err="$(mktemp)"; sql="$(mktemp)"
trap 'rm -f "$err" "$sql"' EXIT
chmod 600 "$sql"

q() { # one statement → its last CSV line
  local out
  out="$(supabase db query --linked -o csv "$1" 2>"$err")" || { cat "$err" >&2; exit 1; }
  printf '%s\n' "$out" | tail -1
}

if [[ "$(q "select count(*) from pg_proc where proname = 'avisar_a_wera'")" != "1" ]]; then
  echo "NOTHING CHANGED: the hosted project does not have 0070 yet. Run 'supabase db push' first." >&2
  exit 1
fi

# A quoted heredoc: `$$` would otherwise expand to this shell's process id.
template="$(cat <<'SQL'
do $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'discord_avisos_webhook';
  if v_id is null then
    perform vault.create_secret('__URL__', 'discord_avisos_webhook',
      'Discord webhook for Wera''s alerts to its owner (0070, plan 5P-f)');
  else
    perform vault.update_secret(v_id, '__URL__');
  end if;
end
$$;
SQL
)"
printf '%s\n' "${template//__URL__/$url}" > "$sql"
supabase db query --linked -f "$sql" >/dev/null 2>"$err" || { cat "$err" >&2; exit 1; }

# Compared by hash, so the URL never travels as an argument.
hash="$(printf '%s' "$url" | shasum -a 256 | cut -d' ' -f1)"
stored="$(q "select count(*) from vault.decrypted_secrets where name = 'discord_avisos_webhook' and encode(sha256(convert_to(decrypted_secret, 'UTF8')), 'hex') = '$hash'")"
if [[ "$stored" != "1" ]]; then
  echo "UNEXPECTED: the Vault does not hold exactly that webhook (found $stored). Nothing is confirmed." >&2
  exit 1
fi
echo "Stored in the hosted Vault as discord_avisos_webhook."

before="$(q "select coalesce(max(id), 0) from net._http_response")"
q "select servicio.avisar_a_wera('✅ Wera está conectada a este canal. Aquí te aviso cuando alguien crea una cuenta o abre una tienda.')" >/dev/null

answer=''
for _ in 1 2 3 4 5 6 7 8 9 10; do
  answer="$(q "select coalesce(status_code::text, 'error: ' || coalesce(error_msg, '?')) from net._http_response where id > $before order by id desc limit 1")"
  [[ -n "$answer" && "$answer" != *coalesce* ]] && break
  answer=''
  sleep 2
done

if [[ "$answer" == "204" || "$answer" == "200" ]]; then
  echo "Discord answered $answer: the test line is in the channel."
else
  echo "Discord's answer: ${answer:-none in 20 seconds}. The webhook is stored, but the test line is not confirmed." >&2
  exit 1
fi

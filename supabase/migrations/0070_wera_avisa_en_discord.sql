-- ============================================================================
-- 0070 — WERA TELLS ITS OWNER ON DISCORD: A NEW ACCOUNT, A NEW SHOP. Plan task `5P-f`.
--
-- The owner's request of 2026-10-22: *"a notification system that will notify
-- me on events … Such things as new people registering"*, and his choice, the
-- same day, of Discord over WhatsApp and Telegram. Two events, one message
-- each, into one channel of his Discord server:
--
--   a row in `auth.users`        → «👤 Nueva cuenta en Wera (con Google). Ya son 15 cuentas.»
--   a row in `public.workspace`  → «🏪 Nueva tienda en Wera. Ya son 4 tiendas.»
--
-- ⚠️ NO PERSON IN THE MESSAGE. No name, no email, no shop name (a small shop is
-- often named for its owner): how she signed up and a count. The aviso de
-- privacidad names who receives a person's data, and Discord is not on it;
-- a message without a person adds nobody. A name in a message is an aviso
-- change first.
--
-- ⚠️ THE SIGNUP NEVER WAITS ON DISCORD, AND NEVER FAILS BECAUSE OF IT.
-- `net.http_post` (pg_net) only QUEUES the request in a table; pg_net's worker
-- sends it after the transaction commits, so a rolled-back signup sends
-- nothing and a slow Discord holds no lock (ADR-035: never HTTP inside a
-- transaction). Every function below swallows its own error into a WARNING:
-- an alert lost is a message he misses; a signup lost is a customer.
--
-- ⚠️ THE WEBHOOK IS A SECRET AND LIVES ONLY IN THE HOSTED PROJECT'S VAULT, as
-- `discord_avisos_webhook` — never in this repository (it is public): whoever
-- holds the URL can post into his channel. With no secret by that name the
-- function does nothing, which is what CI and every local database see.
-- `docs/runbooks/set-discord-webhook.sh` stores or replaces it.
--
-- ⚠️ NO EDGE FUNCTION. ADR-035 reserves a second one for a ruling. A webhook
-- needs no signing, and a function would itself need a secret from here to
-- know the caller is this database — one secret more, not one fewer.
--
-- ⚠️ A TRIGGER ON `auth.users` IS ALLOWED; A FUNCTION IN `auth` IS NOT
-- (Supabase's restriction of 2025-04-21). The functions live in `servicio`,
-- which no client role can reach (`0058`), run as their owner
-- (`security definer`) because the auth server inserts as
-- `supabase_auth_admin`, and are callable by nobody else.
-- ============================================================================

create extension if not exists pg_net with schema extensions;

-- ----------------------------------------------------------------------------
-- The one sender. Reads the webhook from the vault and queues the message.
-- ----------------------------------------------------------------------------
create function servicio.avisar_a_wera(p_texto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
begin
  select s.decrypted_secret into v_url
    from vault.decrypted_secrets s
   where s.name = 'discord_avisos_webhook'
   limit 1;

  if btrim(coalesce(v_url, '')) = '' or btrim(coalesce(p_texto, '')) = '' then
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object(
                 'content', left(p_texto, 2000),
                 -- never ping @everyone, whatever the text holds
                 'allowed_mentions', jsonb_build_object('parse', jsonb_build_array())),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
exception when others then
  raise warning 'servicio.avisar_a_wera: % (%)', sqlerrm, sqlstate;
end;
$$;

comment on function servicio.avisar_a_wera(text) is
  'Queues one Discord message to Wera''s owner (vault secret discord_avisos_webhook). '
  'Does nothing without the secret; never raises. 0070, plan 5P-f.';

-- ----------------------------------------------------------------------------
-- A new account. `raw_app_meta_data.provider` is how she signed up.
-- ----------------------------------------------------------------------------
create function servicio.aviso_cuenta_nueva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via   text;
  v_total bigint;
begin
  v_via := case new.raw_app_meta_data ->> 'provider'
             when 'email'  then 'con correo'
             when 'google' then 'con Google'
             when 'apple'  then 'con Apple'
             else null
           end;
  select count(*) into v_total from auth.users;

  perform servicio.avisar_a_wera(format(
    '👤 Nueva cuenta en Wera%s. Ya son %s cuentas.',
    case when v_via is null then '' else ' (' || v_via || ')' end,
    v_total));
  return null;
exception when others then
  raise warning 'servicio.aviso_cuenta_nueva: % (%)', sqlerrm, sqlstate;
  return null;
end;
$$;

create trigger wera_avisa_cuenta_nueva
  after insert on auth.users
  for each row execute function servicio.aviso_cuenta_nueva();

-- ----------------------------------------------------------------------------
-- A new shop. Its giro is chosen after this row exists, so it is not said.
-- ----------------------------------------------------------------------------
create function servicio.aviso_tienda_nueva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total bigint;
begin
  select count(*) into v_total from public.workspace w where w.is_active;

  perform servicio.avisar_a_wera(format(
    '🏪 Nueva tienda en Wera. Ya son %s tiendas.', v_total));
  return null;
exception when others then
  raise warning 'servicio.aviso_tienda_nueva: % (%)', sqlerrm, sqlstate;
  return null;
end;
$$;

create trigger wera_avisa_tienda_nueva
  after insert on public.workspace
  for each row execute function servicio.aviso_tienda_nueva();

revoke all on function servicio.avisar_a_wera(text)   from public, anon, authenticated;
revoke all on function servicio.aviso_cuenta_nueva()  from public, anon, authenticated;
revoke all on function servicio.aviso_tienda_nueva()  from public, anon, authenticated;

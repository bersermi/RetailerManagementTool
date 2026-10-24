-- ============================================================================
-- 0070 — Wera tells its owner on Discord: a new account, a new shop (`5P-f`).
--
-- What is asserted is what lands in pg_net's QUEUE (`net.http_request_queue`):
-- the URL, the body, and that nothing else does. Whether Discord answers is
-- not this suite's to know — pg_net's worker sends only after a commit, and
-- THIS WHOLE SUITE RUNS IN ONE TRANSACTION AND ROLLS BACK, so CI never sends
-- anything, the stand-in webhook never leaves the vault, and the worker cannot
-- empty the queue between a write and the check that reads it.
--
-- ⚠️ THE ACCOUNTS HERE ARE INSERTED AS `postgres`, which cannot become
-- `supabase_auth_admin` (the role the auth server writes with). That role is
-- exercised by every contract check in `db.yml` that signs up through the real
-- auth server — each one now fires this trigger, with no webhook set, and a
-- trigger the auth server could not run would turn all of them red. Measured
-- once by hand as that role, 2026-10-22: see the plan's status log.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

begin;

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated, anon;
grant all on sequence public._verify_n_seq to authenticated, anon;

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;

create or replace function public._try(p_sql text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
grant execute on function public._try(text) to authenticated, anon;

-- What the queue holds after a given id, as text: the content Discord would show.
create function public._enviados(p_after bigint)
returns table (id bigint, url text, content text, body jsonb, headers jsonb)
language sql as $$
  select q.id, q.url,
         convert_from(q.body, 'UTF8')::jsonb ->> 'content',
         convert_from(q.body, 'UTF8')::jsonb,
         q.headers
    from net.http_request_queue q
   where q.id > p_after
   order by q.id
$$;

\set sin    '''0070aaaa-0000-4000-8000-000000000001'''
\set maria  '''0070aaaa-0000-4000-8000-000000000002'''
\set pepe   '''0070aaaa-0000-4000-8000-000000000003'''
\set nadie  '''0070aaaa-0000-4000-8000-000000000004'''
\set roto   '''0070aaaa-0000-4000-8000-000000000005'''
\set url    '''http://127.0.0.1:9/discord-0070'''

-- A database that already holds the hosted secret's name would make group 1
-- pass for the wrong reason; inside this transaction it is removed, and the
-- rollback puts it back.
delete from vault.secrets where name = 'discord_avisos_webhook';

-- ---------------------------------------------------------------------------
-- 1. NO WEBHOOK, NO MESSAGE — what CI and every local database are.
-- ---------------------------------------------------------------------------
select coalesce(max(id), 0) as q0 from net.http_request_queue \gset

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values (:sin, 'sin.secreto.0070@example.mx', '{"full_name":"Sin Secreto"}', '{"provider":"email"}');

select chk('1.1 with no webhook in the vault, a new account queues nothing — and is made',
           (select count(*) from public._enviados(:q0)) = 0
       and exists (select 1 from auth.users where id = :sin));

select vault.create_secret(:url, 'discord_avisos_webhook', 'stand-in, 0070 suite') is not null as made \gset

-- ---------------------------------------------------------------------------
-- 2. A NEW ACCOUNT, AS THE AUTH SERVER MAKES IT.
-- ---------------------------------------------------------------------------
select coalesce(max(id), 0) as q1 from net.http_request_queue \gset

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values (:maria, 'maria.lopez.0070@example.mx', '{"full_name":"María López"}', '{"provider":"google"}');

select count(*) as cuentas from auth.users \gset

select chk('2.1 one message, to the vault''s webhook, by POST',
           (select count(*) from public._enviados(:q1)) = 1
       and (select url from public._enviados(:q1)) = :url
       and (select method::text from net.http_request_queue where id > :q1) = 'POST',
           coalesce((select string_agg(url, ' ') from public._enviados(:q1)), 'none'));

select chk('2.2 it says how she signed up and how many accounts there are now',
           (select content from public._enviados(:q1))
             = format('👤 Nueva cuenta en Wera (con Google). Ya son %s cuentas.', :cuentas),
           coalesce((select content from public._enviados(:q1)), 'none'));

select chk('2.3 it names nobody — no name, no email',
           (select position('maría' in lower(content)) = 0
               and position('lópez' in lower(content)) = 0
               and position('@' in content) = 0
               and position('0070' in content) = 0
              from public._enviados(:q1)));

select chk('2.4 Discord is told to ping nobody (allowed_mentions.parse is empty), as JSON',
           (select body -> 'allowed_mentions' -> 'parse' = '[]'::jsonb
               and headers ->> 'Content-Type' = 'application/json'
              from public._enviados(:q1)));

-- ---------------------------------------------------------------------------
-- 3. A NEW SHOP, through the app's own door.
-- ---------------------------------------------------------------------------
select coalesce(max(id), 0) as q2 from net.http_request_queue \gset

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :maria), true);
set local role authenticated;
select onboard_workspace('Abarrotes María 0070') as ws \gset
reset role;

select count(*) as tiendas from public.workspace where is_active \gset

select chk('3.1 a new shop sends exactly one message, and it counts the shops',
           (select count(*) from public._enviados(:q2)) = 1
       and (select content from public._enviados(:q2))
             = format('🏪 Nueva tienda en Wera. Ya son %s tiendas.', :tiendas),
           coalesce((select string_agg(content, ' | ') from public._enviados(:q2)), 'none'));

select chk('3.2 the shop''s name is not in it (a small shop is often named for its owner)',
           (select position('abarrotes' in lower(content)) = 0
               and position('maría' in lower(content)) = 0
              from public._enviados(:q2)));

-- ---------------------------------------------------------------------------
-- 4. The other ways in.
-- ---------------------------------------------------------------------------
select coalesce(max(id), 0) as q3 from net.http_request_queue \gset
insert into auth.users (id, email, raw_app_meta_data)
values (:pepe, 'pepe.0070@example.mx', '{"provider":"email"}');

select chk('4.1 an email signup says «con correo»',
           (select content from public._enviados(:q3)) like '👤 Nueva cuenta en Wera (con correo). Ya son % cuentas.',
           coalesce((select content from public._enviados(:q3)), 'none'));

-- ---------------------------------------------------------------------------
-- 5. A SIGNUP ROLLED BACK SENDS NOTHING — the request is a row in this
--    transaction, not a call already made.
-- ---------------------------------------------------------------------------
select coalesce(max(id), 0) as q4 from net.http_request_queue \gset
savepoint antes_de_nadie;
insert into auth.users (id, email, raw_app_meta_data)
values (:nadie, 'nadie.0070@example.mx', '{"provider":"email"}');
rollback to savepoint antes_de_nadie;

select chk('5.1 a signup rolled back leaves nothing queued',
           (select count(*) from public._enviados(:q4)) = 0
       and not exists (select 1 from auth.users where id = :nadie));

-- ---------------------------------------------------------------------------
-- 6. A BROKEN SENDER NEVER BREAKS A SIGNUP. Two breaks, each inside a
--    savepoint: a webhook pasted wrong (pg_net refuses a malformed URL), and
--    a sender that raises outright (the trigger's own guard).
-- ---------------------------------------------------------------------------
savepoint url_rota;
select vault.update_secret(id, 'esto no es una url') is not null as cambiada
  from vault.secrets where name = 'discord_avisos_webhook' \gset
select coalesce(max(id), 0) as q5 from net.http_request_queue \gset
select public._try(format(
  $q$insert into auth.users (id, email, raw_app_meta_data) values (%L, 'roto.0070@example.mx', '{"provider":"apple"}')$q$,
  :roto)) as alta_url_rota \gset
select exists (select 1 from auth.users where id = :roto) as hecha_url_rota \gset
select count(*) as cola_url_rota from public._enviados(:q5) \gset
rollback to savepoint url_rota;

select chk('6.1 with a malformed webhook in the vault, the signup still succeeds and nothing is queued',
           :'alta_url_rota' = 'ok' and :'hecha_url_rota'::boolean and :cola_url_rota = 0,
           format('insert=%s made=%s queued=%s', :'alta_url_rota', :'hecha_url_rota', :cola_url_rota));

savepoint emisor_roto;
create or replace function servicio.avisar_a_wera(p_texto text)
returns void language plpgsql as $f$ begin raise exception 'roto a propósito'; end $f$;
select public._try(format(
  $q$insert into auth.users (id, email, raw_app_meta_data) values (%L, 'roto.0070@example.mx', '{"provider":"apple"}')$q$,
  :roto)) as alta_emisor_roto \gset
select public._try($q$select onboard_workspace('Roto 0070')$q$) as tienda_emisor_rota \gset
select exists (select 1 from auth.users where id = :roto) as hecha_emisor_roto \gset
rollback to savepoint emisor_roto;

select chk('6.2 with a sender that raises, a signup and a new shop still succeed',
           :'alta_emisor_roto' = 'ok' and :'hecha_emisor_roto'::boolean and :'tienda_emisor_rota' = 'ok',
           format('insert=%s made=%s shop=%s', :'alta_emisor_roto', :'hecha_emisor_roto', :'tienda_emisor_rota'));

-- ---------------------------------------------------------------------------
-- 7. NOBODY ELSE CAN SEND — the channel is his.
-- ---------------------------------------------------------------------------
set local role authenticated;
select public._try($q$select servicio.avisar_a_wera('hola')$q$) as as_member \gset
reset role;
set local role anon;
select public._try($q$select servicio.avisar_a_wera('hola')$q$) as as_anon \gset
reset role;

select chk('7.1 a signed-in member and an anonymous caller are both refused (42501)',
           :'as_member' = '42501' and :'as_anon' = '42501',
           format('member=%s anon=%s', :'as_member', :'as_anon'));

select chk('7.2 the three functions are definer, pinned to an empty search_path, executable by no client role',
           (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'servicio'
               and p.proname in ('avisar_a_wera', 'aviso_cuenta_nueva', 'aviso_tienda_nueva')
               and p.prosecdef
               and p.proconfig @> array['search_path=""']
               and not has_function_privilege('authenticated', p.oid, 'execute')
               and not has_function_privilege('anon', p.oid, 'execute')) = 3);

select chk('7.3 the two triggers exist and are enabled',
           (select count(*) from pg_trigger t
             where t.tgname in ('wera_avisa_cuenta_nueva', 'wera_avisa_tienda_nueva')
               and t.tgenabled = 'O'
               and not t.tgisinternal) = 2);

select n, passed, label, detail from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 14 then
    raise exception 'expected 14 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;

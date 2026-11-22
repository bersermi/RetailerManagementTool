-- ============================================================================
-- 0098 — The owner's Discord line for a new shop says Wera Tienda
-- ============================================================================
-- docs/PLAN.md task `13.3`, the owner's ruling of 2026-11-22: *"Wera: tu tienda
-- -> Wera Tienda. Wera Cocina se queda como está. Itacate se vuelve Wera."* The
-- row: *"the Discord lines (`0070`) if they name an app"*.
--
-- THE CENSUS — every line the database sends his Discord channel through
-- `servicio.avisar_a_wera` (`0070`), read in every migration that calls it and,
-- for the one that changes here, on the hosted project (2026-11-22):
--   1. a new account — *👤 Nueva cuenta (con Google). Ya son N cuentas.* (`0076`):
--      names no app;
--   2. a new business — `servicio.aviso_tienda_nueva()` (`0072`, on the hosted
--      project word for word): a kitchen's line names *Wera Cocina*, which stays;
--      ⚠️ **a shop's line says *Nueva tienda en Wera*** — the shop app's old name,
--      and since the ruling the neighbours' app's name. It becomes *Nueva tienda
--      en Wera Tienda*;
--   3. what a kitchen asks for and tells (`0081`): *Una cocina quiere: …* and
--      *Una cocina nos contó…* — no app named;
--   4. the webhook's test line (`docs/runbooks/set-discord-webhook.sh`): *Wera está
--      conectada a este canal* — the family's name, which stays.
-- Each line still names nobody (`0070`).
--
-- WHAT THIS DOES: `aviso_tienda_nueva()` re-made by `create or replace` — `0072`'s
-- body character for character but the shop line's last two words — so its
-- grants (revoked from every client role, `0070`) and its trigger on
-- `public.workspace` stay as they are. Nothing is added, renamed or removed (the
-- field rule): no client calls it; only the trigger does.
-- ============================================================================

create or replace function servicio.aviso_tienda_nueva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total bigint;
begin
  select count(*) into v_total
    from public.workspace w
   where w.is_active and w.kind = new.kind;

  if new.kind = 'cocina' then
    perform servicio.avisar_a_wera(format(
      '🍲 Nueva cocina en Wera Cocina. Ya son %s cocinas.', v_total));
  else
    perform servicio.avisar_a_wera(format(
      '🏪 Nueva tienda en Wera Tienda. Ya son %s tiendas.', v_total));
  end if;
  return null;
exception when others then
  raise warning 'servicio.aviso_tienda_nueva: % (%)', sqlerrm, sqlstate;
  return null;
end;
$$;

comment on function servicio.aviso_tienda_nueva() is
  'Trigger on public.workspace: tells the owner''s Discord channel that a business '
  'opened — a shop (Wera Tienda) or a kitchen (Wera Cocina) — with the count of its '
  'kind, naming nobody. 0070; the kind 0072; Wera Tienda 0098 (plan 13.3).';

-- ============================================================================
-- 0097 — The names: the words the database gives the phones say Wera
-- ============================================================================
-- docs/PLAN.md task `13.2`, the owner's ruling of 2026-11-22: *"Wera: tu tienda
-- -> Wera Tienda. Wera Cocina se queda como está. Itacate se vuelve Wera."*
--
-- WHAT A PHONE READS FROM HERE THAT NAMED ITACATE — the census of 2026-11-22,
-- every migration read and the hosted project asked (`servicio.notification_kind`,
-- `servicio.notice`, `servicio.campaign_variant`, `servicio.consent_words`):
--   1. two kinds' words under her switches in *Tú → Notificaciones*:
--      `ofertas` (*Ofertas y novedades de las cocinas de Itacate.*, `0093`) and
--      `tarjeta_cambio` (*Si una cocina cierra su tarjeta o deja Itacate.*,
--      `0094`) — on the hosted project word for word as those migrations wrote
--      them;
--   2. the message a kitchen's leaving sends whoever holds its card —
--      *<kitchen> dejó Itacate* — written by `servicio.notice_kitchen_leaves()`
--      (`0094`); no notice on the hosted project holds it yet (0 rows).
-- Nothing else: no campaign text exists (0 rows), no consent words are approved
-- (0 rows; the yes sheet's draft in `docs/runbooks/campaigns.sql` changes with
-- the apps in this PR), and every message a function raises is English, mapped
-- by each phone to its own words by its code. The comments on functions and
-- tables keep *Itacate* — no phone reads them — as do the ids: the value
-- `'itacate'` in every `app` column, `consent_words.words` like
-- `'itacate-hoja-1'`, and the object names (the plan's Step 13: no id changes).
--
-- WHAT THIS DOES: two `update`s of the kinds' words, and the leaving trigger's
-- function re-made by `create or replace` with *dejó Wera* — the same body
-- otherwise, character for character — so its grants and its trigger stay as
-- they are. A notice already queued with the old words is reworded too. Nothing
-- is added, renamed or removed (the field rule): every build in the field reads
-- the same keys, only their words change.
-- ============================================================================

-- 1. The words under her switches. Set whole: they are `0093`'s and `0094`'s
--    defaults, unchanged on the hosted project (read 2026-11-22).
update servicio.notification_kind
   set detail = 'Ofertas y novedades de las cocinas en Wera.'
 where kind = 'ofertas';

update servicio.notification_kind
   set detail = 'Si una cocina cierra su tarjeta o deja Wera.'
 where kind = 'tarjeta_cambio';

-- 2. A kitchen leaves Wera — `0094`'s (5b), its title's last word the only change.
create or replace function servicio.notice_kitchen_leaves()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.kind is distinct from 'cocina'
     or not exists (select 1 from servicio.notification_kind k where k.kind = 'tarjeta_cambio' and k.is_on)
     or servicio.card_kept_until(old.id) <= now() then
    return old;
  end if;
  insert into servicio.notice (kind, user_id, workspace_id, kitchen_name, about, title, body, data)
  select 'tarjeta_cambio', h.user_id, old.id, old.display_name, 'baja:' || old.id,
         old.display_name || ' dejó Wera',
         servicio.gone_words(h.stamps, h.rewards),
         jsonb_build_object('kind', 'tarjeta_cambio', 'opens', 'mis_cocinas')
    from servicio.card_holders(old.id, now()) h
    join auth.users u on u.id = h.user_id
  on conflict (user_id, kind, about) do nothing;
  return old;
exception when others then
  raise warning 'servicio.notice_kitchen_leaves: % (%)', sqlerrm, sqlstate;
  return old;
end;
$$;

-- `create or replace` keeps `0094`'s grants; said again so this file stands alone.
revoke all on function servicio.notice_kitchen_leaves() from public, anon, authenticated;

-- 3. A notice queued before this and not yet read: the same words.
update servicio.notice
   set title = left(title, length(title) - length(' dejó Itacate')) || ' dejó Wera'
 where kind = 'tarjeta_cambio'
   and title like '% dejó Itacate';

-- 4. And none left: a kind's words naming Itacate after this would be a row the
--    census missed — stop the deploy and read it rather than ship it.
do $$
begin
  if exists (select 1 from servicio.notification_kind
              where concat_ws(' ', label, detail, channel_name) ~ '(^|[^[:alpha:]])Itacate([^[:alpha:]]|$)') then
    raise exception '0097: a notification kind still names Itacate — read it before deploying';
  end if;
end;
$$;

comment on function servicio.notice_kitchen_leaves() is
  'Before a kitchen''s row goes: one tarjeta_cambio notice to each neighbour holding its stamps or a '
  'reward, titled <kitchen> dejó Wera with what was lost (gone_words). Returns the row on every path, '
  'so it never stops a deletion. 0094, plan 10.9h-i; its words since 0097, plan 13.2 (was dejó Itacate).';

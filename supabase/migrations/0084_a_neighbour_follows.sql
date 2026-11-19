-- ============================================================================
-- 0084 — a neighbour follows a kitchen: her follows, the bell beside them, and a
--        kitchen that leaves Itacate
-- ============================================================================
-- docs/PLAN.md task `10.9d-i` — the database half of following (`10.9d`, split on
-- size 2026-11-18). The owner's rulings of 2026-11-16 and 17 (the family-shell
-- page, round 7; his private notes, G19–G23): she follows from a kitchen's page,
-- and once after her first pickup there; following and the alert when it
-- publishes (a bell) are two things; the kitchen sees *Te siguen N*, never who; a
-- kitchen that leaves reads *dejó Itacate* in her *Mis cocinas* for 30 days.
-- ADR-035 §2.7 (its review of 2026-11-17: her follows are rows about her in
-- `servicio`, read and written only through `security definer` functions keyed
-- on `auth.uid()` — the reservations' pattern, `0079`; no policy names her; a
-- kitchen reads *how many*).
--
-- WHAT IS HERE:
--   1. TWO TABLES IN `servicio`, read and written only through the functions
--      below (the schema is closed to every client role since `0058`):
--        `follow`        her follow of a kitchen and its bell — two switches on
--                        one row, the row gone once both are off
--        `kitchen_gone`  the NAME of a kitchen she followed, once it is deleted,
--                        for 30 days: what *dejó Itacate* draws
--   2. A TRIGGER ON A KITCHEN'S DELETION (`kitchen_leaves`): every path that
--      deletes a kitchen — `delete_my_business` (`0077`), `delete_my_account`
--      (`0073`, `0080`, below), the two runbooks that call them — writes one
--      `kitchen_gone` row per neighbour following it, before its follows go with
--      it (`on delete cascade`).
--   3. A NIGHTLY JOB (`forget-gone-kitchens`, pg_cron as `0078`'s) deleting each
--      `kitchen_gone` row 30 days after the kitchen left; the read stops showing
--      it at the same moment, so the job running late shows nothing older.
--   4. THREE FUNCTIONS:
--        `set_my_follow(p_workspace_id, p_following, p_bell)`   hers: either switch,
--                                                              or both
--        `my_follows()`                                         hers: the kitchens she
--                                                              follows or rings, and
--                                                              those gone 30 days
--        `kitchen_followers(p_workspace_id)`                    any member of the
--                                                              kitchen: how many
--   5. `delete_my_account` RE-MADE, ITS SIGNATURE UNCHANGED: her follows and her
--      kitchens gone go with her account (two statements; `0080`'s body otherwise).
--
-- ⚠️ WHAT EACH SIDE SEES (his rulings; the ⚠️ lines are this migration's reading
-- of them, reported in the plan's status entry of 2026-11-18):
--   * HER — only her own rows, by `auth.uid()`; nobody else's follow is
--     readable by anyone, through anything.
--   * THE KITCHEN — a number: how many neighbours follow it (`following`), never
--     who, never when. ⚠️ Every active member reads it — her helpers too: *Te
--     siguen N* is on the day's card, which a helper's *Hoy* draws (the
--     family-shell page). ⚠️ No floor: G27's floor of five is on her numbers'
--     figures about people (`10.9f`); this count is the one the page draws, *Te
--     siguen 38*, and a kitchen with one follower reads 1.
--   * ⚠️ THE BELL IS STORED, NOT RUNG: no message is sent by anything here — the
--     bell's message and its default are his product analyst's (the plan's
--     decisions block, *The services' messages*, (1); `10.9h`). Off until she
--     taps it (that row's recommendation): a follow made without naming the bell
--     leaves it off, so whatever she rules, nobody is sent anything she did not
--     tap for. ⚠️ AND TWO SWITCHES, AS RULED (G21: following and the bell
--     separate): the bell may be on without following — the drawing toggles
--     each alone; *Mis cocinas* lists the kitchens she follows.
--   * ⚠️ A KITCHEN'S NAME OUTLIVES IT 30 DAYS, IN THE ROWS OF THOSE WHO FOLLOWED IT
--     (G23): its display name and the moment it left, nothing else — no person,
--     no page, no photo. The aviso's rewrite says so (`10.5b-vi`).
--
-- ⚠️ ANY KITCHEN IN ITACATE MAY BE FOLLOWED, NOT ONLY ONE THE DOOR SENDS TODAY: a
-- page opened from its address (`10.9c`) is a kitchen quiet for more than two
-- weeks too. A shop, an inactive or a deleted business, or an id that is none is
-- `TD026`, one code for all, so an id tells a stranger nothing. Her own kitchen
-- may be followed — her login is one across the three apps.
--
-- THE REFUSALS (custom SQLSTATEs reach PostgREST as a 400):
--   42501  nobody signed in; not a member of that kitchen (the count)
--   22023  `set_my_follow` asked to change nothing
--   TD013  the count, for a shop (`0072`'s code: only a kitchen)
--   TD026  not a kitchen in Itacate (new here)
--
-- ⚠️ THE DELETIONS: a kitchen deleted takes its follows (`on delete cascade`)
-- after the trigger keeps their names; her account deleted takes her follows and
-- her kitchens gone (`delete_my_account`, below — the rows carry a plain id,
-- `0053`'s rule, so nothing cascades from the login). Neither blocks a deletion,
-- so the apps' read before *Eliminar* (`account.ts`' pending plates) has nothing
-- to learn; the warning before *Eliminar esta cocina* is `10.9d-ii`'s, through
-- `kitchen_followers`.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`): two
-- tables in a schema no client reaches, a trigger, a job, three functions added,
-- and `delete_my_account` re-made with its signature and answer unchanged.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Her follows, and the kitchens she followed that left
-- ----------------------------------------------------------------------------

create table servicio.follow (
  -- A plain id (`0053`): no foreign key to the login, removed by `delete_my_account`.
  user_id      uuid not null,
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  following    boolean not null default false,
  bell         boolean not null default false,
  -- When she first followed or rang, and when either switch last changed.
  since        timestamptz not null default now(),
  changed_at   timestamptz not null default now(),

  primary key (user_id, workspace_id),
  -- A row with both off is no row: `set_my_follow` deletes it.
  constraint follow_something check (following or bell)
);

-- The kitchen's count, and the trigger's read, by kitchen.
create index follow_by_kitchen on servicio.follow (workspace_id) where following;

comment on table servicio.follow is
  'A neighbour''s follow of a kitchen and its bell (Avísame cuando publique): two '
  'switches on one row, deleted once both are off (G21: following and the bell are '
  'separate). user_id is a plain id (0053), removed with her account. Written and read by '
  'her alone (set_my_follow, my_follows); a kitchen reads how many follow it '
  '(kitchen_followers), never who. The bell is stored, not rung: its message and default '
  'are the product analyst''s (10.9h). Goes with the kitchen. 0084, plan 10.9d-i.';

create table servicio.kitchen_gone (
  user_id      uuid not null,
  -- The deleted kitchen's id, pointing at nothing: what she followed, not a key.
  workspace_id uuid not null,
  name         text not null,
  gone_at      timestamptz not null default now(),

  primary key (user_id, workspace_id)
);

create index kitchen_gone_by_moment on servicio.kitchen_gone (gone_at);

comment on table servicio.kitchen_gone is
  'A kitchen a neighbour followed, once deleted: its display name and when it left, for '
  '30 days — what Mis cocinas draws as dejó Itacate (G23). Written by the trigger '
  'kitchen_leaves on any deletion of a kitchen; read by her alone (my_follows); deleted '
  'by the nightly job forget-gone-kitchens 30 days on, and with her account. 0084, plan '
  '10.9d-i.';

revoke all on servicio.follow       from public, anon, authenticated;
revoke all on servicio.kitchen_gone from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2. A kitchen leaves: the names its followers keep for 30 days
-- ----------------------------------------------------------------------------
-- BEFORE the row goes, so its follows are still there to read (they go with it,
-- by the cascade, after). Every deletion of a kitchen passes here, whichever
-- function or runbook made it.

create function servicio.kitchen_leaves()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into servicio.kitchen_gone (user_id, workspace_id, name, gone_at)
  select f.user_id, old.id, old.display_name, now()
    from servicio.follow f
   where f.workspace_id = old.id and f.following
  on conflict (user_id, workspace_id) do update set name = excluded.name, gone_at = excluded.gone_at;
  return old;
end;
$$;

comment on function servicio.kitchen_leaves() is
  'Trigger: before a kitchen is deleted, one kitchen_gone row per neighbour following it '
  '— its display name and the moment — so her Mis cocinas reads dejó Itacate for 30 '
  'days (G23). Granted to nobody. 0084, plan 10.9d-i.';

revoke all on function servicio.kitchen_leaves() from public, anon, authenticated;

create trigger kitchen_leaves
  before delete on public.workspace
  for each row
  when (old.kind = 'cocina')
  execute function servicio.kitchen_leaves();


-- ----------------------------------------------------------------------------
-- 3. Thirty days on, the name goes too
-- ----------------------------------------------------------------------------

create function servicio.forget_gone_kitchens()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_forgotten integer;
begin
  delete from servicio.kitchen_gone g where g.gone_at <= now() - interval '30 days';
  get diagnostics v_forgotten = row_count;
  return v_forgotten;
end;
$$;

comment on function servicio.forget_gone_kitchens() is
  'Deletes every kitchen_gone row 30 days after its kitchen left (G23: dejó Itacate for 30 '
  'days). Run every night by pg_cron (the job forget-gone-kitchens); granted to nobody. '
  'Returns how many it deleted. 0084, plan 10.9d-i.';

revoke all on function servicio.forget_gone_kitchens() from public, anon, authenticated;

-- 09:19 UTC is 03:19 in Mexico City, two minutes after `0078`'s job. A named
-- schedule replaces a job of that name, so a second run schedules nothing twice.
select cron.schedule('forget-gone-kitchens', '19 9 * * *',
                     'select servicio.forget_gone_kitchens()');


-- ----------------------------------------------------------------------------
-- 4. Her side
-- ----------------------------------------------------------------------------

-- Either switch, or both: `null` leaves a switch as it is. Answers the two as the
-- database now holds them for that kitchen, so her phone draws what is true.
create function public.set_my_follow(
  p_workspace_id uuid,
  p_following    boolean default null,
  p_bell         boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_following boolean;
  v_bell      boolean;
begin
  if v_user is null then
    raise exception 'set_my_follow requires an authenticated caller' using errcode = '42501';
  end if;
  if p_following is null and p_bell is null then
    raise exception 'set_my_follow: nothing to change' using errcode = '22023';
  end if;
  if p_workspace_id is null or not exists (
       select 1 from public.workspace w
        where w.id = p_workspace_id and w.kind = 'cocina' and w.is_active) then
    raise exception 'set_my_follow: that is not a kitchen in Itacate' using errcode = 'TD026';
  end if;

  select f.following, f.bell into v_following, v_bell
    from servicio.follow f
   where f.user_id = v_user and f.workspace_id = p_workspace_id
     for update;

  v_following := coalesce(p_following, v_following, false);
  v_bell      := coalesce(p_bell, v_bell, false);

  if not v_following and not v_bell then
    delete from servicio.follow f where f.user_id = v_user and f.workspace_id = p_workspace_id;
  else
    insert into servicio.follow as f (user_id, workspace_id, following, bell)
    values (v_user, p_workspace_id, v_following, v_bell)
    on conflict (user_id, workspace_id) do update
       set following  = excluded.following,
           bell       = excluded.bell,
           -- A retry of what she already has keeps its moment.
           changed_at = case when (f.following, f.bell) is distinct from (excluded.following, excluded.bell)
                             then now() else f.changed_at end;
  end if;

  return jsonb_build_object('following', v_following, 'bell', v_bell);
end;
$$;

comment on function public.set_my_follow(uuid, boolean, boolean) is
  'The caller follows a kitchen or not (Seguir), and rings its bell or not (Avísame cuando '
  'publique): two switches, either or both — null leaves one as it is. Both off deletes '
  'her row. Answers {following, bell} as now held. The bell is stored, not rung (10.9h). '
  '42501 signed out, 22023 nothing to change, TD026 not a kitchen in Itacate (a shop, an '
  'inactive or deleted business, or no business). Keyed on auth.uid(). 0084, plan 10.9d-i.';


-- The kitchens she follows or rings, each with what *Mis cocinas* draws, and the
-- kitchens she followed that left in the last 30 days.
create function public.my_follows()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'my_follows requires an authenticated caller' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'kitchens', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', w.id,
               'name', w.display_name,
               'giro', w.giro_principal,
               'colonia', l.colonia,
               'page', (select jsonb_build_object('color', p.color, 'logo_path', p.logo_path, 'cover_path', p.cover_path)
                          from public.kitchen_page p
                         where p.workspace_id = w.id),
               'following', f.following,
               'bell', f.bell,
               'since', f.since,
               -- The door's `summary.last_day`, word for word (`0078`): the last day she
               -- published for, in her kitchen's zone, over four weeks — so *publicó hoy*
               -- here and *Hoy no ha publicado* on her page never disagree.
               'last_day', (select to_char(max(li.pickup_start at time zone l.timezone), 'YYYY-MM-DD')
                              from public.listing li
                             where li.workspace_id = w.id
                               and li.created_at >= now() - interval '28 days'))
             order by w.display_name, w.id), '[]'::jsonb)
        from servicio.follow f
        join public.workspace w on w.id = f.workspace_id and w.kind = 'cocina' and w.is_active
        left join lateral (
               select loc.colonia, loc.timezone
                 from public.location loc
                where loc.workspace_id = w.id and loc.is_active
                order by loc.created_at, loc.id
                limit 1) l on true
       where f.user_id = auth.uid()),
    'gone', (
      select coalesce(jsonb_agg(jsonb_build_object('id', g.workspace_id, 'name', g.name, 'gone_at', g.gone_at)
                                order by g.gone_at desc, g.workspace_id), '[]'::jsonb)
        from servicio.kitchen_gone g
       where g.user_id = auth.uid()
         and g.gone_at > now() - interval '30 days')
  );
end;
$$;

comment on function public.my_follows() is
  'The caller''s own follows: {kitchens: [{id, name, giro, colonia, page: {color, '
  'logo_path, cover_path} or null, following, bell, since, last_day — the door''s '
  'summary.last_day}] by name, gone: [{id, name, gone_at}] — the kitchens she followed '
  'that left in the last 30 days, newest first}. Every kitchen in Itacate she follows or '
  'rings, whether or not the door sends it today. Keyed on auth.uid(); nobody else''s. '
  '0084, plan 10.9d-i.';


-- ----------------------------------------------------------------------------
-- 5. The kitchen's side: how many, never who
-- ----------------------------------------------------------------------------

create function public.kitchen_followers(p_workspace_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_kind public.workspace_kind;
begin
  if auth.uid() is null then
    raise exception 'kitchen_followers requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'kitchen_followers: that kitchen is not one of yours' using errcode = '42501';
  end if;

  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'kitchen_followers: only a kitchen is followed' using errcode = 'TD013';
  end if;

  return (select count(*)::integer from servicio.follow f where f.workspace_id = p_workspace_id and f.following);
end;
$$;

comment on function public.kitchen_followers(uuid) is
  'Any active member of a kitchen: how many neighbours follow it (Te siguen N) — a '
  'number, never who or when (G22). 42501 signed out or not one of hers, TD013 a shop. '
  '0084, plan 10.9d-i.';


-- ----------------------------------------------------------------------------
-- 6. Her account deleted: her follows go with it
-- ----------------------------------------------------------------------------
-- `0080`'s body, statement for statement, with two deletions after her yes's. Its
-- signature, its refusals and its answer are unchanged.

create or replace function public.delete_my_account(
  p_shop_name      text   default null,
  p_business_names text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_email  text;
  v_shop   record;
  v_purged int := 0;
  v_left   int := 0;
  -- 0073: every name she typed, folded, blanks out; each business takes one.
  v_typed  text[];
  v_at     int;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user;
  if not found then
    raise exception 'no login to delete' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(array_agg(public.normalize_name(t.typed) order by t.ord), '{}'::text[])
    into v_typed
    from unnest(coalesce(p_business_names, '{}'::text[]) || p_shop_name)
         with ordinality as t(typed, ord)
   where t.typed is not null and btrim(t.typed) <> '';

  -- New in 0079: no business she alone owns goes while a neighbour holds a plate
  -- there. Before the names, so a wrong name never hides it.
  if exists (select 1
               from public.reservation r
               join public.workspace_member wm on wm.workspace_id = r.workspace_id
              where wm.user_id = v_user and wm.is_active and wm.role = 'owner'
                and not exists (
                      select 1 from public.workspace_member o
                       where o.workspace_id = r.workspace_id and o.is_active and o.role = 'owner'
                         and o.user_id <> v_user)
                and public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                             r.held_until, r.pickup_at) = 'apartado') then
    raise exception 'a reservation is still to hand over at a business that goes with this account'
      using errcode = 'TD014';
  end if;

  -- Every business this person is the only active owner of. Checked in full
  -- BEFORE anything changes, so a missing name deletes nothing at all.
  for v_shop in
    select w.id, w.display_name
      from public.workspace w
      join public.workspace_member wm on wm.workspace_id = w.id
     where wm.user_id = v_user and wm.is_active and wm.role = 'owner'
       and not exists (
             select 1 from public.workspace_member o
              where o.workspace_id = w.id and o.is_active and o.role = 'owner'
                and o.user_id <> v_user)
     order by w.id
  loop
    v_at := array_position(v_typed, public.normalize_name(v_shop.display_name));
    if v_at is null then
      raise exception 'a business name typed does not match: deleting this account deletes every business it is the only owner of'
        using errcode = 'TD007';
    end if;
    v_typed := v_typed[1:v_at - 1] || v_typed[v_at + 1:];
  end loop;

  -- The shops that go with this account (ruling 2), ledger and all (ruling 4).
  -- The order is the restrict chain's: movements before the lots and documents
  -- they point at, lots before the purchase lines they came from, and every
  -- document before the stores and products it names.
  for v_shop in
    select w.id
      from public.workspace w
      join public.workspace_member wm on wm.workspace_id = w.id
     where wm.user_id = v_user and wm.is_active and wm.role = 'owner'
       and not exists (
             select 1 from public.workspace_member o
              where o.workspace_id = w.id and o.is_active and o.role = 'owner'
                and o.user_id <> v_user)
  loop
    perform set_config('tienda.purging_workspace', v_shop.id::text, true);
    delete from public.stock_movement where workspace_id = v_shop.id;
    delete from public.stock_batch    where workspace_id = v_shop.id;
    delete from public.sale           where workspace_id = v_shop.id;
    delete from public.purchase       where workspace_id = v_shop.id;
    delete from public.waste          where workspace_id = v_shop.id;
    delete from public.failed_write   where workspace_id = v_shop.id;
    delete from public.price_list     where workspace_id = v_shop.id;
    delete from public.workspace      where id = v_shop.id;
    perform set_config('tienda.purging_workspace', '', true);
    v_purged := v_purged + 1;
  end loop;

  -- Every other shop keeps a former member (ruling 1). The name is frozen
  -- first, while the login that carries it still exists (decision a).
  update public.workspace_member wm
     set display_name = coalesce(wm.display_name, public.auth_full_name(v_user))
   where wm.user_id = v_user;

  delete from public.member_location ml
   using public.workspace_member wm
   where ml.member_id = wm.id and wm.user_id = v_user;

  update public.workspace_member wm
     set is_active = false
   where wm.user_id = v_user and wm.is_active;
  get diagnostics v_left = row_count;

  -- The rows that carry this person's address (decision c).
  delete from public.workspace_invite wi
   where (v_email is not null and lower(wi.email::text) = lower(v_email::text))
      or wi.requested_by = v_user
      or wi.accepted_by  = v_user;

  -- New in 0080: every thumb kitchens gave her, and every note she wrote to Wera,
  -- go with her account; her stars stay, pointing to nobody once her id is
  -- cleared below; and her yes.
  delete from servicio.reservation_thumb t
   using public.reservation r
   where t.reservation_id = r.id and r.buyer_id = v_user;
  update servicio.kitchen_rating kr
     set note = null
    from public.reservation r
   where kr.reservation_id = r.id and r.buyer_id = v_user and kr.note is not null;
  delete from servicio.neighbour_yes y where y.user_id = v_user;

  -- New in 0084: her follows and their bells, and the kitchens she followed that
  -- left. After the purge above, so her own kitchen's leaving — when it went with
  -- her account and she followed it — leaves nothing of hers behind either.
  delete from servicio.follow f where f.user_id = v_user;
  delete from servicio.kitchen_gone g where g.user_id = v_user;

  -- New in 0079: her own reservations. Those still to collect are given back —
  -- the plate is back on offer and the kitchen reads it cancelled — and none is
  -- left pointing to her (ruled 2026-11-10).
  update public.reservation r
     set cancelled_at = case
                          when public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                                        r.held_until, r.pickup_at) = 'apartado'
                          then now()
                          else r.cancelled_at
                        end,
         buyer_id = null
   where r.buyer_id = v_user;

  -- The login itself: identities, sessions and refresh tokens cascade from it.
  delete from auth.users where id = v_user;

  return jsonb_build_object('shops_deleted', v_purged, 'shops_left', v_left);
end;
$$;

comment on function public.delete_my_account(text, text[]) is
  'Deletes the caller''s login (plan task 5R-c, the owner''s rulings of '
  '2026-10-09). Every business — shop or kitchen — the caller is the only active '
  'owner of is DELETED with everything in it, and each must have its name among '
  'the names typed: p_business_names, plus p_shop_name, which every Wera build '
  'before 0073 sends alone. Each business takes one typed name (normalize_name: '
  'case and spaces fold, accents do not); TD007 when one is missing, and nothing '
  'changes; TD014 while a reservation is still to hand over at one of them (0079). '
  'In every other business the membership becomes a former member: is_active '
  'false, left_at stamped, display_name kept. Invitations carrying the caller''s '
  'email are deleted. Her own reservations still to collect are cancelled, and none '
  'keeps her id (0079); every thumb kitchens gave her, her notes to Wera and her '
  'express yes go, and her stars stay pointing to nobody (0080). Returns '
  '{shops_deleted, shops_left}. 0073, plan 10.4b-i, the owner''s ruling of '
  '2026-10-29; 0079, plan 10.5b-i, his ruling of 2026-11-10; 0080, plan 10.5b-ii-b; '
  'since 0084 her follows, her bells and the kitchens she followed that left go too '
  '(plan 10.9d-i).';


-- ----------------------------------------------------------------------------
-- 7. Who may call what
-- ----------------------------------------------------------------------------
-- Each named in `supabase/pgtap/_walls.sql`'s list in this pull request.
revoke all on function public.set_my_follow(uuid, boolean, boolean) from public, anon;
revoke all on function public.my_follows()                          from public, anon;
revoke all on function public.kitchen_followers(uuid)               from public, anon;
grant execute on function public.set_my_follow(uuid, boolean, boolean) to authenticated;
grant execute on function public.my_follows()                          to authenticated;
grant execute on function public.kitchen_followers(uuid)               to authenticated;

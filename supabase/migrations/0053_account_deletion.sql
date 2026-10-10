-- ============================================================================
-- 0053 — account deletion: the login goes, the shop's records keep the name
-- ============================================================================
-- docs/PLAN.md task `5R-c`. ADR-035 §2.3 (the actor on a ledger row), §2.4 (the
-- ledger is append-only) and §2.7 (access).
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE OWNER'S RULINGS, 2026-10-09 — this file builds them, it decides none
-- ----------------------------------------------------------------------------
--   (1) A member who deletes their account loses their LOGIN (email, password,
--       Google link, sessions, the emails on invitations). The shop keeps a
--       FORMER-MEMBER record: display name, role, when they joined and left.
--       Every sale, void and waste they recorded still names them. The same
--       tombstone covers an owner removing a member.
--   (2) A SOLE owner's deletion deletes the shop. A co-owner simply leaves.
--   (3) Immediate. No grace period.
--   (4) When a shop is deleted nothing is kept, not even aggregates.
--   (5) A phone number, if one is ever verified, is login data: the tombstone
--       keeps the name, never the phone.
--
-- ----------------------------------------------------------------------------
-- What changes
-- ----------------------------------------------------------------------------
--   1. THE ELEVEN FOREIGN KEYS TO auth.users ARE DROPPED; EVERY COLUMN STAYS.
--      `sale`, `purchase`, `waste`, `stock_batch`, `stock_movement`
--      (`created_by`), `failed_write` (`reported_by`, `replayed_by`),
--      `workspace_invite` (`requested_by`, `accepted_by`, `decided_by`) and
--      `workspace_member.user_id`, which used to CASCADE. No ledger row is
--      rewritten: the uuid stays, and `workspace_member` is what turns it into
--      a name. ⚠️ ONE-WAY: after the first real deletion these constraints can
--      never return, because the ids they would point at are gone.
--   2. `workspace_member.left_at`, stamped by a trigger whenever `is_active`
--      goes false (and cleared if it goes true again), so an owner removing a
--      member and a member deleting their account write the same tombstone.
--   3. `workspace_member_login_exists_trg` — the half of the dropped
--      `user_id` key worth keeping: a NEW membership must name a living login.
--      Without it, an access token that outlives its deleted account (a JWT is
--      checked by signature only, for up to an hour) could open a new shop.
--   4. `purging_workspace(uuid)` and an exception for it in the three triggers
--      that refuse a DELETE (`transaction_document_is_immutable`,
--      `provider_protect_generic`, `catalog_prebuilt_stays`). The exception is
--      a transaction-local setting that only `delete_my_account` sets, for one
--      workspace at a time; no client can set it (PostgREST exposes no
--      `set_config`), and no client holds a DELETE grant on the ledger anyway.
--   5. `delete_my_account(p_shop_name text)` — the one way in.
--
-- ----------------------------------------------------------------------------
-- THE DECISIONS THIS FILE TAKES ITSELF, each a function body to reverse
-- ----------------------------------------------------------------------------
--   a. THE NAME IS FROZEN AT DELETION. A member whose `display_name` is null
--      gets the name their login carried (`auth_full_name`) copied onto the
--      tombstone before the login goes. With neither, the app writes
--      *Ex-miembro* alone. The EMAIL is never copied: it is login data.
--   b. A SOLE OWNER MUST SEND THE SHOP'S NAME, and the server compares it
--      (`normalize_name`, so case and spacing do not matter) — `TD007` when it
--      does not match. The typed name is the app's confirmation; checking it
--      here too means a client bug cannot delete a shop nobody confirmed.
--   c. INVITATIONS: every row addressed to the person's email, or that they
--      requested or accepted, is deleted — those rows carry the address.
--      Invitations they SENT stay; they hold the other person's address and
--      only this person's uuid.
--   d. `member_location` rows of a departing member are deleted. They are
--      access, not history, and a tombstone grants none.
--   e. ⚠️ AN UNSENT WRITE ON THE PHONE IS NOT THIS FUNCTION'S CONCERN. Deletion
--      needs the network, and the network is what drains the outbox first.
--
-- ⚠️ NOT CHANGED, AND NAMED: `workspace_member_delete` (owner-only, `0001`)
-- still lets an owner HARD-delete a membership through the API, which would
-- cascade that member's `pilot_reading` rows. No screen does it — removal is
-- not built — and the ruling says removal is a tombstone. Narrowing the policy
-- is a rule about who may do what, so it is parked for the owner, not taken.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The eleven foreign keys
-- ----------------------------------------------------------------------------

alter table public.sale             drop constraint sale_created_by_fkey;
alter table public.purchase         drop constraint purchase_created_by_fkey;
alter table public.waste            drop constraint waste_created_by_fkey;
alter table public.stock_batch      drop constraint stock_batch_created_by_fkey;
alter table public.stock_movement   drop constraint stock_movement_created_by_fkey;
alter table public.failed_write     drop constraint failed_write_reported_by_fkey;
alter table public.failed_write     drop constraint failed_write_replayed_by_fkey;
alter table public.workspace_invite drop constraint workspace_invite_requested_by_fkey;
alter table public.workspace_invite drop constraint workspace_invite_accepted_by_fkey;
alter table public.workspace_invite drop constraint workspace_invite_decided_by_fkey;
alter table public.workspace_member drop constraint workspace_member_user_id_fkey;

-- ----------------------------------------------------------------------------
-- 2. The tombstone's stamp
-- ----------------------------------------------------------------------------

alter table public.workspace_member
  add column left_at timestamptz,
  add constraint workspace_member_left_only_when_inactive
    check (left_at is null or not is_active);

-- Memberships already inactive before this file have no known leaving date.
-- Their `updated_at` is the last thing that changed them, which is the best
-- answer there is. Measured on the hosted project 2026-10-09: there are none.
update public.workspace_member set left_at = updated_at where not is_active;

comment on column public.workspace_member.left_at is
  'When this membership ended — a member deleting their account, or an owner '
  'removing them. Stamped by workspace_member_stamp_left_trg whenever is_active '
  'goes false. A row with left_at set is a FORMER member: it keeps display_name '
  'and role so the shop''s records still name them, and passes no fence, since '
  'every fence reads is_active. Plan task 5R-c (0053).';

create function public.workspace_member_stamp_left()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_active and not new.is_active then
    new.left_at := now();
  elsif new.is_active then
    new.left_at := null;
  end if;
  return new;
end;
$$;

create trigger workspace_member_stamp_left_trg
  before update of is_active on public.workspace_member
  for each row execute function public.workspace_member_stamp_left();

-- ----------------------------------------------------------------------------
-- 3. A new membership still names a living login
-- ----------------------------------------------------------------------------

create function public.workspace_member_login_exists()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from auth.users u where u.id = new.user_id) then
    raise exception 'no login % exists for a new membership', new.user_id
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.workspace_member_login_exists() from public, anon, authenticated;

create trigger workspace_member_login_exists_trg
  before insert or update of user_id on public.workspace_member
  for each row execute function public.workspace_member_login_exists();

-- ----------------------------------------------------------------------------
-- 4. The one exception to "nothing is deleted"
-- ----------------------------------------------------------------------------

create function public.purging_workspace(p_workspace_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('tienda.purging_workspace', true), '')
       = p_workspace_id::text
$$;

comment on function public.purging_workspace(uuid) is
  'True only inside delete_my_account(), while it deletes this one workspace. '
  'The three triggers that refuse a DELETE ask it first. Plan task 5R-c (0053).';

create or replace function public.transaction_document_is_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- 0053: a sole owner deleting their account deletes the shop, ledger and all
  -- (ruling 4 of 2026-10-09). Nothing else may.
  if tg_op = 'DELETE' and public.purging_workspace(old.workspace_id) then
    return old;
  end if;

  raise exception
    '% on %.% is not allowed: transaction documents are append-only, correct them with a reversal (ADR-035 §2.4)',
    tg_op, tg_table_schema, tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

create or replace function public.provider_protect_generic()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_generic
     and not public.purging_workspace(old.workspace_id) then
    raise exception 'the generic provider cannot be deleted'
      using errcode = 'restrict_violation';
  end if;

  if tg_op = 'UPDATE' and old.is_generic and not new.is_generic then
    raise exception 'the generic provider cannot be demoted'
      using errcode = 'restrict_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.catalog_prebuilt_stays()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_prebuilt
     and not public.purging_workspace(old.workspace_id) then
    raise exception 'a prebuilt % cannot be deleted: %',
      tg_table_name, coalesce(old.name, '(unnamed)')
      using errcode = 'restrict_violation';
  end if;

  if tg_op = 'UPDATE' then
    if old.is_prebuilt and old.is_active and not new.is_active then
      raise exception 'a prebuilt % cannot be retired: %',
        tg_table_name, coalesce(old.name, '(unnamed)')
        using errcode = 'restrict_violation';
    end if;

    if old.is_prebuilt and not new.is_prebuilt then
      raise exception 'a prebuilt % cannot be reassigned to the shop: %',
        tg_table_name, coalesce(old.name, '(unnamed)')
        using errcode = 'restrict_violation';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. delete_my_account
-- ----------------------------------------------------------------------------

create function public.delete_my_account(p_shop_name text default null)
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
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user;
  if not found then
    raise exception 'no login to delete' using errcode = 'insufficient_privilege';
  end if;

  -- Every shop this person is the only active owner of. Checked in full BEFORE
  -- anything changes, so a wrong name deletes nothing at all.
  for v_shop in
    select w.id, w.display_name
      from public.workspace w
      join public.workspace_member wm on wm.workspace_id = w.id
     where wm.user_id = v_user and wm.is_active and wm.role = 'owner'
       and not exists (
             select 1 from public.workspace_member o
              where o.workspace_id = w.id and o.is_active and o.role = 'owner'
                and o.user_id <> v_user)
  loop
    if p_shop_name is null
       or public.normalize_name(p_shop_name) <> public.normalize_name(v_shop.display_name) then
      raise exception 'the shop name typed does not match: deleting this account deletes the shop'
        using errcode = 'TD007';
    end if;
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

  -- The login itself: identities, sessions and refresh tokens cascade from it.
  delete from auth.users where id = v_user;

  return jsonb_build_object('shops_deleted', v_purged, 'shops_left', v_left);
end;
$$;

comment on function public.delete_my_account(text) is
  'Deletes the caller''s login (plan task 5R-c, the owner''s rulings of '
  '2026-10-09). A shop the caller is the only active owner of is DELETED with '
  'everything in it, and p_shop_name must match its name (TD007 otherwise, and '
  'nothing changes). In every other shop the membership becomes a former member: '
  'is_active false, left_at stamped, display_name kept. Invitations carrying the '
  'caller''s email are deleted. Returns {shops_deleted, shops_left}.';

revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;

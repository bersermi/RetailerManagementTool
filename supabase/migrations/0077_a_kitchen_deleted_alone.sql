-- ============================================================================
-- 0077 — a kitchen deleted alone: her login, and everything else she owns, stay
-- ============================================================================
-- docs/PLAN.md task `10.5-iii-c`. The owner's ruling of 2026-11-04 (*"Yes to
-- both, follow your recommendations"*), after his own question that morning —
-- *"Is it possible to delete only a given business without touching her
-- individual Itacate or her Cocina account?"*: *Eliminar esta cocina* in Wera
-- Cocina, beside *Eliminar mi cuenta*, the kitchen's name typed. Her login — the
-- one she uses in Itacate and Wera too — and every other business she owns stay,
-- and nothing is told to Apple. ADR-035 §2.7, the one-login row.
--
-- WHAT IS HERE — one function, beside `delete_my_account`:
--   `delete_my_business(p_workspace_id uuid, p_business_name text)` deletes ONE
--   business its caller is the only active owner of, after its typed name:
--   `0073`'s purge, for that business alone. A kitchen has one owner (Wera Cocina
--   has no team), and everything of it goes with it — its place, its page, its
--   publications, its memberships and invitations (`on delete cascade`, `0001`,
--   `0072`, `0076`). Its photos leave everyone's reach at once
--   (`kitchen_folder_ok`, `0076`, asks for a kitchen that exists) and are deleted
--   by hand within 30 days (`docs/runbooks/delete-orphan-photos.sh`), exactly as
--   a kitchen deleted with the account. It answers `{business_deleted: <id>}`.
--
-- ⚠️⚠️ A KITCHEN, AND ONLY A KITCHEN — HIS RULING'S SCOPE, NOT A NEW RULE. A shop
-- is refused `TD013` (*only a kitchen*, as `publish_listing` and
-- `set_kitchen_page` refuse one), so a shop still goes only with its owner's
-- account, where Wera offers its month's records first (`5R-c`). His words on
-- shops: *the same way only if he asks*. The function is named for a business so
-- that, if he does, the refusal is one `if` taken out by a `create or replace` —
-- the same name and signature, no second door.
--
-- ⚠️ THE REFUSALS, IN THEIR ORDER — none of them changes anything:
--   `42501`  nobody signed in (the grant refuses `anon` before the body runs);
--   `TD012`  not hers alone — no such business, one she is not an active owner
--            of, or one another active owner shares. ONE code for the three, so
--            an id tells a stranger nothing (`set_store_address`'s, `0069`);
--   `TD013`  hers alone, but a shop;
--   `TD007`  the name typed is not the business's, folded as `normalize_name`
--            folds — case and runs of spaces, never accents (`0053`, `0073`).
--
-- ⚠️ THE PURGE IS `0073`'s, STATEMENT FOR STATEMENT — the restrict chain's order
-- (movements before the lots and documents they point at, lots before the
-- purchase lines they came from, every document before the stores and products
-- it names), and `tienda.purging_workspace`, the transaction-local exception
-- the three delete-refusing triggers ask, set for this one business and
-- cleared. Its suite holds the two bodies' `delete from` lists equal: a table
-- that must be emptied before a business can go is added to both, or neither
-- deletes cleanly. A kitchen holds none of those rows today; they are emptied
-- anyway, so this stays right the day one does.
--
-- ⚠️ NOT TOLD TO APPLE, AND NOT A TOMBSTONE: the login stays, so nothing about
-- it changes — her other memberships, her name on them, her invitations, her
-- Apple link. Only the kitchen's own rows go, its memberships among them.
--
-- ⚠️ ONCE RESERVATIONS EXIST (`10.5b`), A KITCHEN WITH ONE PENDING IS REFUSED —
-- ruled with this function on 2026-11-04, written by that row with a code of
-- its own.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`): one
-- function added and one comment re-worded; nothing dropped or renamed.
-- ============================================================================

create function public.delete_my_business(p_workspace_id uuid, p_business_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_business record;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  -- Hers: she is an active owner of it. ⚠️ No such business and a business that
  -- is not hers are one answer.
  select w.id, w.display_name, w.kind
    into v_business
    from public.workspace w
    join public.workspace_member wm on wm.workspace_id = w.id
   where w.id = p_workspace_id
     and wm.user_id = v_user and wm.is_active and wm.role = 'owner';
  if not found then
    raise exception 'delete_my_business: that business is not one of yours'
      using errcode = 'TD012';
  end if;

  -- Hers ALONE: `0053`'s predicate. A business another owner shares is not hers
  -- to delete; her account's deletion leaves it, as a former member.
  if exists (select 1 from public.workspace_member o
              where o.workspace_id = p_workspace_id and o.is_active and o.role = 'owner'
                and o.user_id <> v_user) then
    raise exception 'delete_my_business: another owner shares that business, so it is not yours alone to delete'
      using errcode = 'TD012';
  end if;

  if v_business.kind <> 'cocina' then
    raise exception 'delete_my_business: only a kitchen is deleted on its own — a shop goes only with its owner''s account'
      using errcode = 'TD013';
  end if;

  -- A blank or missing name folds to '' or NULL, never to a business's name
  -- (`workspace_display_name_not_blank`, `0001`).
  if public.normalize_name(p_business_name) is distinct from public.normalize_name(v_business.display_name) then
    raise exception 'a business name typed does not match: deleting a business asks for its name'
      using errcode = 'TD007';
  end if;

  -- `0073`'s purge, for this business alone.
  perform set_config('tienda.purging_workspace', p_workspace_id::text, true);
  delete from public.stock_movement where workspace_id = p_workspace_id;
  delete from public.stock_batch    where workspace_id = p_workspace_id;
  delete from public.sale           where workspace_id = p_workspace_id;
  delete from public.purchase       where workspace_id = p_workspace_id;
  delete from public.waste          where workspace_id = p_workspace_id;
  delete from public.failed_write   where workspace_id = p_workspace_id;
  delete from public.price_list     where workspace_id = p_workspace_id;
  delete from public.workspace      where id = p_workspace_id;
  perform set_config('tienda.purging_workspace', '', true);

  return jsonb_build_object('business_deleted', p_workspace_id);
end;
$$;

comment on function public.delete_my_business(uuid, text) is
  'Deletes ONE business the caller is the only active owner of, with everything in '
  'it, after its name is typed (normalize_name: case and spaces fold, accents do '
  'not) — and keeps the caller''s login and every other business. A kitchen only: '
  'a shop is refused TD013 and goes only with its owner''s account. TD012 when the '
  'business is not the caller''s alone (none such, not an active owner, or another '
  'active owner shares it); TD007 when the name does not match; nothing changes on '
  'any refusal. The purge is delete_my_account''s for that business. Returns '
  '{business_deleted}. 0077, plan 10.5-iii-c, the owner''s ruling of 2026-11-04.';

comment on function public.purging_workspace(uuid) is
  'True only inside delete_my_account() (0053, 0073) or delete_my_business() (0077), '
  'while it deletes this one workspace. The three triggers that refuse a DELETE ask '
  'it first. Plan tasks 5R-c and 10.5-iii-c.';

revoke all on function public.delete_my_business(uuid, text) from public, anon;
grant execute on function public.delete_my_business(uuid, text) to authenticated;

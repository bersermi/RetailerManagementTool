-- ============================================================================
-- 0073 — deleting an account names every business that goes with it
-- ============================================================================
-- docs/PLAN.md task `10.4b-i`. The owner's ruling of 2026-10-29 (*"Agree with
-- your recommendation"*): when deleting an account would delete more than one
-- business she is the only owner of — a shop and a kitchen, since `0072` — the
-- screen names every one and she types each one's name. `5R-c`'s rule of
-- 2026-10-09 (type the shop's name, because the shop goes with the account),
-- kept true for each business.
--
-- ⚠️⚠️ WHY `0053` COULD NOT DO IT: it checks EVERY business she solely owns
-- against ONE typed name, so a person who owns a shop AND a kitchen is refused
-- `TD007` in every app, whatever she types (measured by `10.4a`). Nobody owns
-- both yet: Cocina's sign-up (`10.4b-ii`) makes it possible.
--
-- WHAT CHANGES — one optional argument, and the check that reads it:
--   `delete_my_account(p_shop_name text, p_business_names text[])`. Every name
--   she typed — the new list and the old single name together — is folded as
--   `normalize_name` folds (case and runs of spaces, not accents), blanks are
--   dropped, and ⚠️ EACH BUSINESS TAKES ONE NAME FROM THEM. Two businesses
--   called *Doña Lupe* need *Doña Lupe* typed twice, so a build that sends one
--   name deletes at most one business: an old Wera build, whose screen warned
--   about one shop, can never delete a kitchen it never named. A name left over
--   (a business she no longer solely owns) is ignored. Checked in full before
--   anything changes, as before: one name missing and nothing is deleted.
--
-- ⚠️ EVERY WERA BUILD IN THE FIELD KEEPS DELETING A ONE-SHOP ACCOUNT EXACTLY AS
-- TODAY (ADR-035 §2.2, `field-rule.sh`): they send `{p_shop_name}`, which is one
-- typed name for one business — the same comparison `0053` made. The new
-- argument defaults to NULL, so PostgREST finds this function by the old name
-- alone. A new signature is a drop and a create (`0064`'s move, never an
-- overload), and the drop takes the grants: they are re-issued below.
--
-- ⚠️ THE BODY IS `0053`'s, CHARACTER FOR CHARACTER, but for the name check and
-- its two locals. The purge, the tombstones, the invitations and the login go
-- exactly as they went. `shops_deleted` still counts what was purged — every
-- kind of business now, under the key every Wera build reads.
-- ============================================================================

drop function public.delete_my_account(text);

create function public.delete_my_account(
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
  'changes. In every other business the membership becomes a former member: '
  'is_active false, left_at stamped, display_name kept. Invitations carrying the '
  'caller''s email are deleted. Returns {shops_deleted, shops_left}. 0073, '
  'plan 10.4b-i, the owner''s ruling of 2026-10-29.';

revoke all on function public.delete_my_account(text, text[]) from public, anon;
grant execute on function public.delete_my_account(text, text[]) to authenticated;

-- ============================================================================
-- 0074 — A PRICE SET OR CHANGED WITHOUT SIGNAL. Plan task `8i`.
--
-- The owner's ruling of 2026-11-01 (*"Yes, go with your recommendation"*): the
-- owner or a manager sets or changes a price at the counter with no signal. The
-- phone keeps the price, shows it, and sends it when the signal returns. If
-- somebody changed that price in the meantime, theirs stays and hers is
-- dropped, and nobody is shown anything.
--
-- WHY A FUNCTION. A price change is two writes on `price_list`: the old row is
-- closed at today, then the new one is opened (`price_list_no_overlap` refuses
-- two rows covering one day). Over PostgREST those are two requests with no
-- transaction between them, and when only the first lands the product is left
-- with no price at all — on the shelf, mid-morning. A phone that sends a change
-- hours later, after a dropped connection, must not be able to leave that state
-- behind. One function makes the close and the open one transaction.
--
-- WHAT IT DOES, given the phone's id for the new row, the product, the price
-- per base unit, the day she typed it (the phone's own), the scope (a store's
-- own price, or NULL for the shop-wide one) and the price her phone showed
-- for that scope (NULL when it showed none):
--   * a retry — a row with that id already exists — answers `already_recorded`
--     and writes nothing;
--   * the price is applied only if nothing changed after her day and the price
--     in force on her day is the one she saw; otherwise it is SUPERSEDED: it
--     answers `applied: false` and writes nothing. That is how a change made on
--     a stale phone, or after another phone's newer change, loses to it;
--   * applied: the row in force on her day is closed at that day (or, when it
--     started that same day, replaced — a range cannot end on the day it
--     starts, `price_list_range_ordered`), and her row opens on that day. A
--     product left with no price by a half-done change of an older build is
--     healed the same way: that row ends at her day and hers begins.
--
-- ⚠️ SECURITY INVOKER, so the fence is the one `price_list` already has: its
-- insert, update and delete policies are the owner's and a manager's (`0002`),
-- and this function reads and writes nothing the caller could not. It says so
-- up front (`42501`) because an UPDATE a policy excludes is silent.
--
-- ⚠️ ONE PRICE WRITE PER PRODUCT AT A TIME: the product's row is locked `for no
-- key update` (which a sale's foreign-key check does not wait on), so two
-- phones' changes to one product are judged one after the other.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`):
-- this file adds one function and changes nothing else. Builds from before it
-- keep writing `price_list` directly, as the policies still allow.
--
-- THE REFUSALS:
--   42501  not signed in; the product is not one of the caller's; the caller is
--          not its shop's owner or a manager
--   22023  no id, no product, no price or no day; a negative price; a store
--          that is not this shop's
-- ============================================================================

create function public.set_shelf_price(
  p_id             uuid,
  p_variant_id     uuid,
  p_price_per_base numeric,
  p_day            date,
  p_location_id    uuid    default null,
  p_seen_price     numeric default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_workspace uuid;
  v_on_day    public.price_list%rowtype;
  v_found     boolean;
begin
  if v_user is null then
    raise exception 'set_shelf_price requires an authenticated caller'
      using errcode = '42501';
  end if;
  if p_id is null or p_variant_id is null or p_price_per_base is null or p_day is null then
    raise exception 'set_shelf_price: the id, the product, the price and the day are required'
      using errcode = '22023';
  end if;
  if p_price_per_base < 0 or p_seen_price < 0 then
    raise exception 'set_shelf_price: a price cannot be negative'
      using errcode = '22023';
  end if;

  select v.workspace_id into v_workspace
    from public.product_variant v
   where v.id = p_variant_id;
  if v_workspace is null then
    raise exception 'set_shelf_price: that product is not one of yours'
      using errcode = '42501';
  end if;
  if not public.has_role(v_workspace, 'manager') then
    raise exception 'set_shelf_price: only the owner or a manager sets a price'
      using errcode = '42501';
  end if;
  if p_location_id is not null and not exists (
       select 1 from public.location l
        where l.id = p_location_id and l.workspace_id = v_workspace) then
    raise exception 'set_shelf_price: that store is not this shop''s'
      using errcode = '22023';
  end if;

  -- One price write per product at a time.
  perform 1 from public.product_variant v where v.id = p_variant_id for no key update;

  -- A retry of a price already set is that price.
  if exists (select 1 from public.price_list pl where pl.id = p_id) then
    return jsonb_build_object('applied', true, 'already_recorded', true);
  end if;

  -- The price in force on her day, in her scope.
  select * into v_on_day
    from public.price_list pl
   where pl.workspace_id = v_workspace
     and pl.variant_id = p_variant_id
     and pl.location_id is not distinct from p_location_id
     and pl.effective_from <= p_day
     and (pl.effective_to is null or pl.effective_to > p_day);
  v_found := found;

  -- Superseded: somebody changed it on a later day, or it was not what she saw.
  if exists (select 1 from public.price_list pl
              where pl.workspace_id = v_workspace
                and pl.variant_id = p_variant_id
                and pl.location_id is not distinct from p_location_id
                and pl.effective_from > p_day)
     or (case when v_found then v_on_day.price_per_base end) is distinct from p_seen_price then
    return jsonb_build_object('applied', false, 'already_recorded', false);
  end if;

  -- The price is already what she typed: nothing to write.
  if v_found and v_on_day.price_per_base = p_price_per_base then
    return jsonb_build_object('applied', true, 'already_recorded', false);
  end if;

  if v_found then
    if v_on_day.effective_from < p_day then
      update public.price_list set effective_to = p_day where id = v_on_day.id;
    else
      delete from public.price_list where id = v_on_day.id;
    end if;
  end if;

  insert into public.price_list
    (id, workspace_id, variant_id, location_id, price_per_base, effective_from, effective_to)
  values
    (p_id, v_workspace, p_variant_id, p_location_id, p_price_per_base, p_day, null);

  return jsonb_build_object('applied', true, 'already_recorded', false);
end;
$$;

comment on function public.set_shelf_price(uuid, uuid, numeric, date, uuid, numeric) is
  'Sets or changes one product''s shelf price in one transaction: closes the row in force '
  'on p_day (or replaces it when it started that day) and opens the phone''s row (p_id) '
  'from p_day. Applied only when nothing changed after p_day and the price in force on '
  'p_day is p_seen_price (NULL: none); otherwise superseded, and nothing is written. '
  'A retry of p_id answers already_recorded. Security invoker: price_list''s own '
  'policies fence it (owner and manager). Plan 8i, the owner''s ruling of 2026-11-01.';

revoke all on function public.set_shelf_price(uuid, uuid, numeric, date, uuid, numeric)
  from public, anon;
grant execute on function public.set_shelf_price(uuid, uuid, numeric, date, uuid, numeric)
  to authenticated;

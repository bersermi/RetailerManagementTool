-- ============================================================================
-- 0075 — HER ADDRESS FIRST: HER LINE OF DIRECTIONS WITHOUT A PIN, AND HER OWN
-- PIN CLEARED. Plan task `10.4h`.
--
-- The owner's ruling of 2026-11-03 (*"Let's go with your proposal an your
-- recommendation"*, then *"Yes"* to this migration): a kitchen registers with
-- her address alone. Every map that draws her kitchen places her address live,
-- each phone for its own person, and keeps nothing of Google's; a pin is kept
-- only when she sets her own point, and a new street or number clears it, so
-- the map follows the new address.
--
-- WHY A MIGRATION. `set_store_pin` (`0072`) writes the line of directions only
-- together with a pin — `directions = v_directions` on every call — and refuses
-- a missing pin (`22023`). So with no point of her own there was no way to save
-- her directions, and no way to clear a pin once set. Two functions beside it,
-- each the owner's alone, as it is:
--   * `set_store_directions(p_location_id, p_directions)` — her one line, or
--     none (blank = none); the pin untouched;
--   * `clear_store_pin(p_location_id)` — her pin gone, both numbers; the line
--     untouched. A place with no pin answers the same: nothing to clear.
--
-- ⚠️ `set_store_pin`'S SIGNATURE AND CHECKS STAY AS THEY ARE, and it still writes
-- the line with the pin: a build that sets her point sends her line with it, as
-- every build in the field does.
--
-- ⚠️ THE SAME REFUSALS AS `set_store_pin`, IN THE SAME ORDER: `42501` signed
-- out; `TD012` a place she cannot see, or whose business she does not own;
-- `22023` a line over 140 characters or on two lines. ⚠️ NO KIND ASKED, as
-- `set_store_pin` asks none: a shop's pin or line is shown only through a door,
-- and the only door (`10.5-i`) reads kitchens.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`):
-- this file adds two functions, re-words two column comments, and changes
-- nothing else.
--
-- ⚠️ THE WALLS: both revoked from public and anon, granted to authenticated, and
-- named in `supabase/pgtap/_walls.sql`'s list in the same pull request.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Her line of directions, with no pin
-- ----------------------------------------------------------------------------
create function public.set_store_directions(
  p_location_id uuid,
  p_directions  text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user       uuid := auth.uid();
  v_location   public.location%rowtype;
  v_directions text := nullif(btrim(coalesce(p_directions, '')), '');
begin
  if v_user is null then
    raise exception 'set_store_directions requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_location
    from public.location l
   where l.id = p_location_id
     and l.id in (select public.my_locations())
   for update;

  if not found or not public.has_role(v_location.workspace_id, 'owner') then
    raise exception 'set_store_directions: only the owner of that store sets its directions'
      using errcode = 'TD012';
  end if;

  if v_directions is not null
     and (char_length(v_directions) > 140 or v_directions ~ '[\r\n]') then
    raise exception 'set_store_directions: the directions are one line of at most 140 characters'
      using errcode = '22023';
  end if;

  update public.location
     set directions = v_directions
   where id = v_location.id;
end;
$$;

comment on function public.set_store_directions(uuid, text) is
  'The owner sets her store''s or kitchen''s one line of directions without a pin '
  '(blank = none); its pin is untouched. TD012: not her store, or not its owner; '
  '22023: directions over 140 characters or on two lines. 0075.';


-- ----------------------------------------------------------------------------
-- 2. Her own pin, cleared
-- ----------------------------------------------------------------------------
create function public.clear_store_pin(p_location_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_location public.location%rowtype;
begin
  if v_user is null then
    raise exception 'clear_store_pin requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_location
    from public.location l
   where l.id = p_location_id
     and l.id in (select public.my_locations())
   for update;

  if not found or not public.has_role(v_location.workspace_id, 'owner') then
    raise exception 'clear_store_pin: only the owner of that store clears its pin'
      using errcode = 'TD012';
  end if;

  update public.location
     set pin_lat = null,
         pin_lng = null
   where id = v_location.id;
end;
$$;

comment on function public.clear_store_pin(uuid) is
  'The owner clears her store''s or kitchen''s pin, both numbers; its line of '
  'directions is untouched, and a place with no pin answers the same. TD012: not '
  'her store, or not its owner. 0075.';


-- ----------------------------------------------------------------------------
-- 3. What the two columns say now
-- ----------------------------------------------------------------------------
comment on column public.location.pin_lat is
  'Her own point, where the store or kitchen hands things over: latitude, six decimals. '
  'NULL until she sets one — since 0075 a kitchen registers with her address alone, '
  'which every map places live and nobody keeps. Set with pin_lng (location_pin_whole) '
  'through set_store_pin; cleared through clear_store_pin. 0072, 0075.';
comment on column public.location.directions is
  'One optional line beside the address: "Portón verde, junto a la farmacia". At most '
  '140 characters, one line. Written with a pin by set_store_pin, or alone by '
  'set_store_directions. The owner''s yes of 2026-10-29. 0072, 0075.';


-- ----------------------------------------------------------------------------
-- 4. Who may call them
-- ----------------------------------------------------------------------------
revoke all on function public.set_store_directions(uuid, text) from public, anon;
grant execute on function public.set_store_directions(uuid, text) to authenticated;
revoke all on function public.clear_store_pin(uuid) from public, anon;
grant execute on function public.clear_store_pin(uuid) to authenticated;

-- ============================================================================
-- 0069 — A STORE'S ADDRESS, GIVEN BY WHOEVER NEEDS IT FIRST. Plan task `8q`.
--
-- The owner's ruling of 2026-10-21: *"No one can log Merma until they provide
-- the address with CP, they can also set it in the Configuracion without
-- opening Merma."* Merma now asks for the store's address of everyone who
-- opens it in a store that has none, and lets nobody past until it is given;
-- Ajustes offers the same. Until this file only the owner could write a store
-- row (`location_update`, `0001`; `0058` added the address columns under it),
-- so a cashier asked for the address could not have given it.
--
-- ⚠️ ONE DOOR, AND IT IS NARROW: `set_store_address`. Anyone the store is
-- visible to (`my_locations()` — the owner and an Encargado every store, an
-- Empleado the ones she is assigned) may FILL an address that is not complete
-- yet; changing a complete one stays the owner's, as it was. The table's own
-- policy is untouched: nothing here lets a non-owner update `location`
-- directly, and the function writes the five address columns and nothing else.
--
-- ⚠️ IT REFUSES WITH `TD012` — a store not hers, or a complete address and she
-- is not the owner — so the app says one sentence for both and never reads
-- "tu sesión se cerró" off a `42501`. `22023` for a missing field: the table's
-- checks allow NULL (a store may have no address), the function does not.
-- ============================================================================

create function public.set_store_address(
  p_location_id   uuid,
  p_street        text,
  p_street_number text,
  p_colonia       text,
  p_city          text,
  p_postal_code   text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_location  public.location%rowtype;
  v_complete  boolean;
begin
  if v_user is null then
    raise exception 'set_store_address requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_location
    from public.location l
   where l.id = p_location_id
     and l.id in (select public.my_locations())
   for update;

  if not found then
    raise exception 'set_store_address: that store is not one of yours'
      using errcode = 'TD012';
  end if;

  if nullif(btrim(coalesce(p_street, '')), '') is null
     or nullif(btrim(coalesce(p_street_number, '')), '') is null
     or nullif(btrim(coalesce(p_city, '')), '') is null
     or nullif(btrim(coalesce(p_postal_code, '')), '') is null then
    raise exception 'set_store_address: street, number, city and postal code are all required'
      using errcode = '22023';
  end if;

  v_complete := v_location.street is not null
            and v_location.street_number is not null
            and v_location.city is not null
            and v_location.postal_code is not null;

  if v_complete and not public.has_role(v_location.workspace_id, 'owner') then
    raise exception 'set_store_address: the store has an address, and only the owner changes it'
      using errcode = 'TD012';
  end if;

  update public.location
     set street        = btrim(p_street),
         street_number = btrim(p_street_number),
         colonia       = nullif(btrim(coalesce(p_colonia, '')), ''),
         city          = btrim(p_city),
         postal_code   = btrim(p_postal_code)
   where id = v_location.id;
end;
$$;

revoke all on function public.set_store_address(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.set_store_address(uuid, text, text, text, text, text) to authenticated;

comment on function public.set_store_address(uuid, text, text, text, text, text) is
  '8q (2026-10-21, the owner: no one logs merma until the store has an address, '
  'given in Merma or Ajustes). Anyone the store is visible to may fill an address '
  'that is not complete; changing a complete one is the owner''s. TD012 for a '
  'store not hers or a complete address and not the owner; 22023 for a missing '
  'field. Writes the five address columns and nothing else.';

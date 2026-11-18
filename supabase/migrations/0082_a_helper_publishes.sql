-- ============================================================================
-- 0082 — a helper publishes, and leaves her kitchen
-- ============================================================================
-- docs/PLAN.md task `10.9b-i` — the database half of helpers (`10.9b`, split on
-- size 2026-11-18). The owner's rulings of 2026-11-16 and 17 (his private notes;
-- drawn on the family-shell page, round 7): G13 everyone at the fonda uses her own
-- phone; G18 two roles, the OWNER and a HELPER — the database's `owner` and
-- `staff`, with `manager` left free for a third role he left open; G36 a helper
-- publishes too, for now. A helper hands over orders, gives stamps and rewards and
-- publishes; everything else — the features, the card's terms, promotions, her
-- page and settings, her numbers, inviting and removing — is the owner's.
--
-- ----------------------------------------------------------------------------
-- 1. WHAT A HELPER MAY DO THAT SHE COULD NOT — three functions re-made, their
--    signatures unchanged (the field rule: every build in the field still calls
--    them by the same names and arguments)
-- ----------------------------------------------------------------------------
-- Every function a kitchen's member calls was read for its role before this file
-- was written (the plan's row asked it). Asking `manager` today:
--   publish_listing        (last made by 0079)   → `staff` at a kitchen
--   withdraw_listing       (made by 0072)         → `staff` at a kitchen — *Deshacer*
--                                                   and *Ya se terminó* are publishing's
--   set_listing_quantity   (made by 0079)         → `staff` at a kitchen — − and +
--   set_kitchen_page       (last made by 0080)    → unchanged: her page is the owner's
--   cancel_reservation_as_kitchen (0080)         → unchanged: not handing over, and
--                                                   switched off for everyone (TD023)
--   set_shelf_price        (0074)                 → unchanged: a shop's, never a kitchen's
-- Already open to every member of the kitchen, so nothing to lower:
--   hand_over_reservation and rate_neighbour (last made by 0080) — "everyone hands
--   over" was ruled 2026-10-28 (`10.3`, question 3).
-- Asking `owner`, and kept: set_kitchen_features and send_menu_request (0081).
--
-- ⚠️ ONLY AT A KITCHEN. Each of the three asks `staff` when the business is a
-- kitchen and `manager` anywhere else, so what a shop's Empleado is refused — and
-- the code she is refused with — does not move. `publish_listing` and
-- `set_listing_quantity` refuse a shop anyway (TD013); `withdraw_listing` never
-- asked the kind, and now asks it only to pick the role.
--
-- ⚠️ THE LOCATION WALL STAYS. Each still finds the kitchen through
-- `my_locations()`, which gives a `staff` member only the places `member_location`
-- names — so a helper acts at her kitchen once her membership names its place,
-- as an invitation does (`redeem_invite`, 0028), and nowhere else.
--
-- ----------------------------------------------------------------------------
-- 2. *SALIR DE ESTA COCINA* — `leave_kitchen(p_workspace_id)`
-- ----------------------------------------------------------------------------
-- The family-shell page draws it in a helper's *Mi cocina*: "tu cuenta sigue, tu
-- teléfono deja de verla". Until now nobody could end her own membership: the
-- table's update policy is the owner's (0001), and the owner removes a member with
-- it, as Wera's *Tu equipo* does. Ending hers is `is_active = false`, which the
-- trigger stamps (`left_at`, 0053) and every read and wall already honours —
-- `my_workspaces()` and `my_locations()` ask `is_active` — and her name stays on
-- what she recorded (the owner's ruling of 2026-10-09: the business keeps the name).
--   - signed out, or not a member of that KITCHEN: 42501;
--   - its owner: TD025 — an owner does not leave her kitchen; she deletes it
--     (*Eliminar esta cocina*, `delete_my_business`);
--   - already left: nothing, and no error — a retry of the same tap.
--
-- ----------------------------------------------------------------------------
-- 3. NOT HERE, ON PURPOSE
-- ----------------------------------------------------------------------------
-- How a helper JOINS — the invitation's code: whether it lasts a day or a week,
-- one person or several, how long it is, and whether the owner confirms each by
-- name — is the owner's question, parked in the plan's decisions block on
-- 2026-11-18. `workspace_invite.email` is NOT NULL (0002) and `create_invite`
-- asks for an address (0028), so a code with no address is a change of shape,
-- and it waits for his word. Removing a helper needs nothing new (the owner's
-- update of `is_active`). The deletions need nothing new: a kitchen deleted takes
-- every membership with it, and a helper's account deleted keeps her name on her
-- membership and ends it (`delete_my_account`, last made by 0080) — the
-- rehearsal reads both back.
-- New code TD025. Field rule: one function added, three re-made with the same
-- signature, nothing removed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The three, re-made: the body each had, its role line alone changed
-- ----------------------------------------------------------------------------

create or replace function public.publish_listing(p_id uuid, p_location_id uuid, p_pickup_start timestamp with time zone, p_pickup_end timestamp with time zone, p_lines jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user      uuid := auth.uid();
  v_loc       public.location%rowtype;
  v_kind      public.workspace_kind;
  v_existing  public.listing%rowtype;
  v_line      jsonb;
  v_n         integer;
  v_i         integer := 0;
  v_name      text;
  v_desc      text;
  v_tags      text[];
  v_price     numeric;
  v_usual     numeric;
  v_qty       numeric;
  v_surprise  boolean;
  v_line_id   uuid;
  v_photo     text;
  v_known     constant text[] := array['pica', 'cerdo', 'mariscos', 'cacahuate', 'lacteos', 'gluten'];
  -- New in 0079: the kitchen's ways and desechable, and each line's.
  v_page      public.kitchen_page%rowtype;
  v_k_llevar  boolean;
  v_k_aqui    boolean;
  v_llevar    boolean;
  v_aqui      boolean;
begin
  if v_user is null then
    raise exception 'publish_listing requires an authenticated caller'
      using errcode = '42501';
  end if;
  if p_location_id is null
     or p_location_id not in (select public.my_locations()) then
    raise exception 'publish_listing: that kitchen is not one of yours'
      using errcode = '42501';
  end if;

  select * into v_loc from public.location l where l.id = p_location_id;

  -- 0082 (`10.9b-i`, the owner's ruling G36 of 2026-11-17): at a kitchen a helper
  -- publishes too — `staff`. Anywhere else the role stays `manager`, so a shop's
  -- Empleado is refused 42501 here exactly as before, and TD013 below is unchanged.
  select w.kind into v_kind from public.workspace w where w.id = v_loc.workspace_id;
  if not public.has_role(v_loc.workspace_id,
                         case when v_kind = 'cocina' then 'staff' else 'manager' end::public.workspace_role) then
    raise exception 'publish_listing: only someone who works at that kitchen publishes'
      using errcode = '42501';
  end if;

  if v_kind is distinct from 'cocina' then
    raise exception 'publish_listing: only a kitchen publishes' using errcode = 'TD013';
  end if;

  if p_id is null then
    raise exception 'publish_listing: the phone must make the publication''s id'
      using errcode = '22023';
  end if;

  -- A retry of a publication already recorded is that publication.
  select * into v_existing from public.listing x where x.id = p_id;
  if found then
    if v_existing.workspace_id is distinct from v_loc.workspace_id then
      raise exception 'publish_listing: that id is not this kitchen''s'
        using errcode = '42501';
    end if;
    return v_existing.id;
  end if;

  if p_pickup_start is null or p_pickup_end is null
     or p_pickup_end <= p_pickup_start
     or p_pickup_end <= now()
     or p_pickup_start > now() + interval '24 hours'
     or p_pickup_end - p_pickup_start > interval '12 hours' then
    raise exception 'publish_listing: the window must be a window of at most twelve '
                    'hours that has not ended and starts within a day'
      using errcode = '22023';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'publish_listing: the lines are a list' using errcode = '22023';
  end if;
  v_n := jsonb_array_length(p_lines);
  if v_n < 1 or v_n > 10 then
    raise exception 'publish_listing: one to ten lines, not %', v_n using errcode = '22023';
  end if;

  -- New in 0079: the kitchen's ways (no page is para llevar only).
  select * into v_page from public.kitchen_page p where p.workspace_id = v_loc.workspace_id;
  v_k_llevar := coalesce(v_page.para_llevar, true);
  v_k_aqui   := coalesce(v_page.para_aqui, false);

  -- Every line is checked before anything is written.
  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_i := v_i + 1;
    if jsonb_typeof(v_line) <> 'object' then
      raise exception 'publish_listing: line % is not an object', v_i using errcode = '22023';
    end if;
    begin
      v_name  := nullif(btrim(coalesce(v_line ->> 'name', '')), '');
      v_price := (v_line ->> 'unit_price')::numeric;
      v_qty   := (v_line ->> 'quantity')::numeric;
      v_usual := (v_line ->> 'usual_price')::numeric;
      v_line_id := (v_line ->> 'id')::uuid;
    exception when others then
      raise exception 'publish_listing: line % has a value that is not a number or an id', v_i
        using errcode = '22023';
    end;
    if v_name is null or char_length(v_name) > 80 then
      raise exception 'publish_listing: line % needs a name of at most 80 characters', v_i
        using errcode = '22023';
    end if;
    if char_length(btrim(coalesce(v_line ->> 'description', ''))) > 200 then
      raise exception 'publish_listing: line %''s description is over 200 characters', v_i
        using errcode = '22023';
    end if;
    if v_price is null or v_price <= 0 or v_price <> round(v_price, 2) or v_price >= 100000 then
      raise exception 'publish_listing: line %''s price is pesos and centavos above zero', v_i
        using errcode = '22023';
    end if;
    if v_qty is null or v_qty <> trunc(v_qty) or v_qty < 1 or v_qty > 999 then
      raise exception 'publish_listing: line %''s count is a whole number from 1 to 999', v_i
        using errcode = '22023';
    end if;
    if v_usual is not null
       and (v_usual <= v_price or v_usual <> round(v_usual, 2) or v_usual >= 100000) then
      raise exception 'publish_listing: line %''s usual price is pesos and centavos above its price', v_i
        using errcode = '22023';
    end if;
    if v_line ? 'surprise' and jsonb_typeof(v_line -> 'surprise') not in ('boolean', 'null') then
      raise exception 'publish_listing: line %''s surprise is yes or no', v_i using errcode = '22023';
    end if;
    if v_line ? 'tags' and jsonb_typeof(v_line -> 'tags') not in ('array', 'null') then
      raise exception 'publish_listing: line %''s tags are a list', v_i using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(
                 case jsonb_typeof(v_line -> 'tags') when 'array' then v_line -> 'tags' else '[]'::jsonb end) t
                where jsonb_typeof(t) <> 'string' or not (t #>> '{}') = any (v_known)) then
      raise exception 'publish_listing: line % carries a tag that is not on the list', v_i
        using errcode = '22023';
    end if;
    -- New in 0076: the dish's photo, a picture in this kitchen's own folder.
    if v_line ? 'image_path' and jsonb_typeof(v_line -> 'image_path') not in ('string', 'null') then
      raise exception 'publish_listing: line %''s photo is a path, or null', v_i using errcode = '22023';
    end if;
    v_photo := nullif(btrim(coalesce(v_line ->> 'image_path', '')), '');
    if v_photo is not null and not public.picture_in_folder(v_photo, v_loc.workspace_id) then
      raise exception 'publish_listing: line %''s photo is not a picture in this kitchen''s own folder', v_i
        using errcode = '22023';
    end if;
    -- New in 0079: how a dish may be eaten, narrowed from the kitchen's ways.
    if (v_line ? 'para_llevar' and jsonb_typeof(v_line -> 'para_llevar') not in ('boolean', 'null'))
       or (v_line ? 'para_aqui' and jsonb_typeof(v_line -> 'para_aqui') not in ('boolean', 'null')) then
      raise exception 'publish_listing: line %''s ways are yes or no', v_i using errcode = '22023';
    end if;
    if not coalesce((v_line ->> 'surprise')::boolean, false) then
      v_llevar := coalesce((v_line ->> 'para_llevar')::boolean, v_k_llevar);
      v_aqui   := coalesce((v_line ->> 'para_aqui')::boolean, v_k_aqui);
      if (v_llevar and not v_k_llevar) or (v_aqui and not v_k_aqui) then
        raise exception 'publish_listing: line % offers a way the kitchen does not', v_i
          using errcode = '22023';
      end if;
      if not (v_llevar or v_aqui) then
        raise exception 'publish_listing: line % is para llevar, para comer aquí, or both', v_i
          using errcode = '22023';
      end if;
    end if;
  end loop;

  insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by,
                              container_price)
  values (p_id, v_loc.workspace_id, v_loc.id, p_pickup_start, p_pickup_end, v_user,
          v_page.container_price);

  v_i := 0;
  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_i := v_i + 1;
    v_desc := nullif(btrim(coalesce(v_line ->> 'description', '')), '');
    select coalesce(array_agg(distinct t #>> '{}' order by t #>> '{}'), '{}')
      into v_tags
      from jsonb_array_elements(
             case jsonb_typeof(v_line -> 'tags') when 'array' then v_line -> 'tags' else '[]'::jsonb end) t;
    v_surprise := coalesce((v_line ->> 'surprise')::boolean, false);
    v_photo := nullif(btrim(coalesce(v_line ->> 'image_path', '')), '');
    if v_surprise then
      v_llevar := true;
      v_aqui   := false;
    else
      v_llevar := coalesce((v_line ->> 'para_llevar')::boolean, v_k_llevar);
      v_aqui   := coalesce((v_line ->> 'para_aqui')::boolean, v_k_aqui);
    end if;

    insert into public.listing_line
      (id, listing_id, workspace_id, location_id, line_no, name, description, tags,
       unit_price, quantity, surprise, usual_price, image_path, para_llevar, para_aqui)
    values
      (coalesce((v_line ->> 'id')::uuid, gen_random_uuid()), p_id, v_loc.workspace_id, v_loc.id,
       v_i, btrim(v_line ->> 'name'), v_desc, v_tags,
       (v_line ->> 'unit_price')::numeric, (v_line ->> 'quantity')::numeric, v_surprise,
       (v_line ->> 'usual_price')::numeric, v_photo, v_llevar, v_aqui);
  end loop;

  return p_id;
end;
$function$;

comment on function public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb) is
  'A kitchen publishes: one pickup window at one of her kitchens and one to ten lines, each a dish or a surprise bag, each with a photo in her own folder if she took one (0076), and since 0079 how each dish may be eaten (para_llevar, para_aqui: narrowed from the kitchen''s ways, which a line that sends neither takes; a bag is para llevar), with the kitchen''s desechable copied onto it. Anyone who works at the kitchen — a helper (staff) since 0082, G36; manager elsewhere, so a shop is refused as before. The id is the phone''s; a retry returns it. 42501 / TD013 (a shop) / 22023 — see 0072, 0076, 0079 and 0082. Plans 10.4a, 10.5b-i, 10.9b-i.';

create or replace function public.withdraw_listing(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user    uuid := auth.uid();
  v_listing public.listing%rowtype;
begin
  if v_user is null then
    raise exception 'withdraw_listing requires an authenticated caller'
      using errcode = '42501';
  end if;

  select * into v_listing
    from public.listing x
   where x.id = p_id
     and x.location_id in (select public.my_locations())
   for update;

  -- 0082 (`10.9b-i`, G36): at a kitchen a helper takes down what is published too
  -- (*Deshacer*, *Ya se terminó*) — `staff`; anywhere else `manager`, as before.
  if not found or not public.has_role(v_listing.workspace_id,
       case when (select w.kind from public.workspace w where w.id = v_listing.workspace_id) = 'cocina'
            then 'staff' else 'manager' end::public.workspace_role) then
    raise exception 'withdraw_listing: only someone who works at that kitchen withdraws'
      using errcode = '42501';
  end if;

  update public.listing
     set withdrawn_at = now()
   where id = v_listing.id
     and withdrawn_at is null;
end;
$function$;

comment on function public.withdraw_listing(uuid) is
  'Someone who works at the kitchen takes a publication down — a helper (staff) since 0082, G36; manager at any other business. Withdrawn once; a retry keeps the first moment. 42501 for anyone else. 0072, 0082; plans 10.4a, 10.9b-i.';

create or replace function public.set_listing_quantity(p_listing_id uuid, p_line_no integer, p_quantity numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user    uuid := auth.uid();
  v_listing public.listing%rowtype;
  v_kind    public.workspace_kind;
  v_line    public.listing_line%rowtype;
  v_taken   numeric;
begin
  if v_user is null then
    raise exception 'set_listing_quantity requires an authenticated caller' using errcode = '42501';
  end if;

  select * into v_listing from public.listing li
   where li.id = p_listing_id
     and li.location_id in (select public.my_locations());
  -- 0082 (`10.9b-i`, G36): at a kitchen a helper says how many are left too (− and +)
  -- — `staff`; anywhere else `manager`, so the refusal there is 42501 as before.
  if found then
    select w.kind into v_kind from public.workspace w where w.id = v_listing.workspace_id;
  end if;
  if v_kind is null or not public.has_role(v_listing.workspace_id,
       case when v_kind = 'cocina' then 'staff' else 'manager' end::public.workspace_role) then
    raise exception 'set_listing_quantity: only someone who works at that kitchen changes it'
      using errcode = '42501';
  end if;

  if v_kind is distinct from 'cocina' then
    raise exception 'set_listing_quantity: only a kitchen''s offer' using errcode = 'TD013';
  end if;

  if v_listing.withdrawn_at is not null or v_listing.pickup_end <= now() then
    raise exception 'set_listing_quantity: that offer is no longer on offer' using errcode = 'TD015';
  end if;

  if p_quantity is null or p_quantity <> trunc(p_quantity) or p_quantity < 0 or p_quantity > 999 then
    raise exception 'set_listing_quantity: a count is a whole number from 0 to 999' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('tienda.reserve.business:' || v_listing.workspace_id::text, 0));

  select * into v_line from public.listing_line ll
   where ll.listing_id = v_listing.id and ll.line_no = p_line_no
   for update;
  if not found then
    raise exception 'set_listing_quantity: that offer has no line %', p_line_no using errcode = '22023';
  end if;

  v_taken := public.listing_line_taken(v_line.id);
  if p_quantity < v_taken then
    raise exception 'set_listing_quantity: % already reserved', v_taken using errcode = 'TD019';
  end if;

  update public.listing_line set quantity = p_quantity where id = v_line.id;

  return jsonb_build_object('quantity', p_quantity::numeric(12,3)::text,
                            'taken', v_taken::numeric(12,3)::text);
end;
$function$;

comment on function public.set_listing_quantity(uuid, integer, numeric) is
  'Someone who works at the kitchen — a helper (staff) since 0082, G36 — says how many of an offer''s line she offers now (− and +): a whole number from 0 to 999, never below what is reserved. Answers {quantity, taken} as decimal strings. 42501 / TD013 / TD015 (withdrawn or over) / 22023 / TD019 (below what is reserved). 0079, 0082; plans 10.5b-i, 10.9b-i.';

-- ----------------------------------------------------------------------------
-- 2. *Salir de esta cocina*
-- ----------------------------------------------------------------------------

create function public.leave_kitchen(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_member public.workspace_member%rowtype;
begin
  if v_user is null then
    raise exception 'leave_kitchen requires an authenticated caller' using errcode = '42501';
  end if;

  select wm.* into v_member
    from public.workspace_member wm
    join public.workspace w on w.id = wm.workspace_id
   where wm.workspace_id = p_workspace_id
     and wm.user_id = v_user
     and w.kind = 'cocina'
   for update of wm;
  if not found then
    raise exception 'leave_kitchen: that is not a kitchen you work at' using errcode = '42501';
  end if;

  if not v_member.is_active then
    return;  -- she left already: the same tap, again
  end if;

  if v_member.role = 'owner' then
    raise exception 'leave_kitchen: an owner does not leave her kitchen — she deletes it (Eliminar esta cocina)'
      using errcode = 'TD025';
  end if;

  -- Her name stays on what she recorded, as when an account is deleted (0053, 0080).
  update public.workspace_member
     set is_active    = false,
         display_name = coalesce(display_name, public.auth_full_name(v_user))
   where id = v_member.id;
end;
$$;

comment on function public.leave_kitchen(uuid) is
  'Salir de esta cocina: a helper (or a manager) ends her own membership of a kitchen — is_active false, left_at stamped, her name kept on what she recorded; her account stays. An already-ended membership is a retry: nothing, no error. 42501 signed out or not one of her kitchens (a shop is not), TD025 for its owner, who deletes the kitchen instead. 0082, plan 10.9b-i.';

revoke all on function public.leave_kitchen(uuid) from public, anon;
grant execute on function public.leave_kitchen(uuid) to authenticated;

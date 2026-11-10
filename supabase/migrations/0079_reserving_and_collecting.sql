-- ============================================================================
-- 0079 — reserving and collecting: the database
-- ============================================================================
-- docs/PLAN.md task `10.5b-i`, the first of `10.5b`'s six (split on size,
-- 2026-11-10). Slice 3's design, ruled with the owner on 2026-11-05 and
-- 2026-11-06 (the family-shell page's stage 2, calls 11–22, 26–28 and 37), and
-- the two questions it left open, ruled 2026-11-10 (*"I agree on your
-- recommendations for the 2 questions"*), with three reservations at a time
-- instead of one (*"perhaps 3 maximum for now"*). ADR-035 §2.7: *What is hers*
-- (her reservations through functions keyed on her own id), *What she writes*
-- (`security definer` functions that check the caller), and the seller's side
-- under the ordinary policies.
--
-- WHAT IS HERE:
--   1. THE KITCHEN'S SETTINGS, on `kitchen_page` (what a neighbour reads of her
--      kitchen): `accepts_card`, `accepts_transfer` (off; cash is always on),
--      `para_llevar` (on), `para_aqui` (off) — at least one — and
--      `container_price`, the *desechable*'s price (none). Written by
--      `set_kitchen_page`, the owner or a manager, which learns the five keys.
--   2. THE OFFER'S: `listing.container_price`, copied from the kitchen when it is
--      published, so a reservation's amount never moves; `listing_line.para_llevar`
--      and `para_aqui`, how each line may be eaten. `publish_listing` learns two
--      keys per line; a build that sends neither publishes the kitchen's own ways,
--      which for every kitchen today is *para llevar* — what Itacate means now.
--      A surprise bag is always *para llevar*.
--   3. `reservation` AND `reservation_line` — a header (call 37) and its lines.
--   4. THE NEIGHBOUR'S FUNCTIONS, keyed on her own id: `reserve_plate`,
--      `my_reservations`, `cancel_my_reservation`, `confirm_my_pickup`.
--   5. THE FONDA'S: her kitchen's reservations under the ordinary policies;
--      `hand_over_reservation`; `set_listing_quantity` (− and +).
--   6. THE DOOR (`on_offer_now`) learns what is left, how each line may be eaten,
--      the *desechable*, and the kitchen's methods and ways.
--   7. THE TWO DELETIONS learn about reservations.
--
-- ⚠️ NO RATING, AND NOTHING THAT SHOWS WHO RESERVED. Questions 7–10 ruled one tap
-- of one to five stars; on 2026-11-10 the owner opened feedback both ways and
-- what each side sees of the other as a discussion of its own (`10.5b-ii`). So
-- the buyer is stored — a plain id, the reservation must know whose it is — and
-- granted to nobody: a member reads every column but `buyer_id`. Whatever
-- `10.5b-ii` rules is added beside this, never a change to it.
--
-- ⚠️ THE STATES ARE MOMENTS, NOT A COLUMN. A reservation records when it was made,
-- cancelled, handed over and confirmed, and until when its plate is held (the
-- window's end); its state is read from those by `reservation_state`, the ONE
-- definition, used by every function here:
--   `recogido`  handed over by the kitchen, or confirmed by her (*Recogí* on both
--               sides — either counts);
--   `cancelado` she cancelled up to an hour before HER hour;
--   `no_va`     she cancelled within that hour (*No voy a poder ir*) — the plate
--               goes back on offer all the same;
--   `liberado`  the window ended with none of the above (*Se liberó*);
--   `apartado`  none of the above, and the window has not ended — pending.
-- No column can drift from the moments, and no job has to run at a window's end.
--
-- ⚠️ WHAT IS TAKEN OF A LINE is `listing_line_taken`, the ONE definition: every
-- plate reserved and not given back — a cancelled reservation gives its plate
-- back, unless it was handed over all the same. A plate that *se liberó* stays
-- taken: it was held until the window ended, which is also when the offer ends.
--
-- THE NEW REFUSALS (custom SQLSTATEs reach PostgREST as a 400):
--   TD014  a reservation is still to hand over at that kitchen — deleting the
--          kitchen alone, or the account of its only owner, waits until each is
--          handed over or its window ends (ruled 2026-11-10)
--   TD015  that offer is no longer on offer, or nothing is left of that dish
--   TD016  she already holds three reservations still to collect
--   TD017  a kitchen's own people do not reserve at it
--   TD018  that reservation is no longer pending — collected, or its window over
--   TD019  − below what neighbours have already reserved
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`): two
-- tables, defaulted and nullable columns, and functions added; `set_kitchen_page`,
-- `publish_listing`, `on_offer_now`, `delete_my_business` and `delete_my_account`
-- re-created with their signatures unchanged. One CHECK widened
-- (`listing_line.quantity` may reach 0, for −); none narrowed for a build that
-- sends what it sends today. ⚠️ THE DOOR'S `quantity` NOW MEANS WHAT IS LEFT, and
-- a line with nothing left is not sent: every Itacate build draws `quantity` as
-- *Quedan N* and refuses a 0 (`itacate/src/api/cocinas.ts`, `countOf`), so this is
-- what the builds in the field need — before this migration nothing was ever
-- reserved, so what was offered and what was left were one number.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. The two definitions every function below reads
-- ----------------------------------------------------------------------------
-- Granted to nobody: the functions that call them are `security definer` and
-- run as their owner.

create function public.reservation_state(
  p_cancelled_at   timestamptz,
  p_handed_over_at timestamptz,
  p_picked_up_at   timestamptz,
  p_held_until     timestamptz,
  p_pickup_at      timestamptz
)
returns text
language sql
stable
set search_path = ''
as $$
  select case
           when p_handed_over_at is not null or p_picked_up_at is not null then 'recogido'
           when p_cancelled_at is not null then
             case when p_cancelled_at >= p_pickup_at - interval '1 hour' then 'no_va' else 'cancelado' end
           when p_held_until <= now() then 'liberado'
           else 'apartado'
         end
$$;

comment on function public.reservation_state(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz) is
  'A reservation''s state, read from its moments: recogido (handed over or confirmed), '
  'cancelado (cancelled up to an hour before her hour), no_va (cancelled within it), '
  'liberado (the window ended with none of those), apartado (pending). The one '
  'definition. Granted to nobody. 0079, plan 10.5b-i.';

revoke all on function public.reservation_state(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz)
  from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 1. The kitchen's settings
-- ----------------------------------------------------------------------------
-- ⚠️ ON `kitchen_page`, ONE ROW PER KITCHEN AND NO ROW A PAGE OF DEFAULTS
-- (`0076`): everything here is what a neighbour reads of the kitchen — the
-- payment chips and the two ways are on her page — and no row at all reads as
-- cash only, *para llevar* only, no *desechable*. ⚠️ A CARD OR A TRANSFER IS A
-- YES OR NO, NEVER AN ACCOUNT: the owner's ruling of 2026-11-05 — Wera Cocina
-- handles no financial data for now.

alter table public.kitchen_page
  add column accepts_card     boolean not null default false,
  add column accepts_transfer boolean not null default false,
  add column para_llevar      boolean not null default true,
  add column para_aqui        boolean not null default false,
  add column container_price  numeric(12,2);

alter table public.kitchen_page
  add constraint kitchen_page_one_way_at_least check (para_llevar or para_aqui),
  add constraint kitchen_page_container_price_shape
    check (container_price is null or (container_price > 0 and container_price < 100000));

comment on column public.kitchen_page.accepts_card is
  'She takes a card at the counter, on her own terminal. A yes or no; Wera never sees a '
  'card. Cash is always taken. 0079, plan 10.5b-i (call 12).';
comment on column public.kitchen_page.accepts_transfer is
  'She takes a transfer on arrival, to the account she gives at the counter. A yes or no; '
  'no account is stored or shown (ruled 2026-11-05). 0079, plan 10.5b-i (calls 12, 13).';
comment on column public.kitchen_page.para_llevar is
  'Her plates can be taken away. At least one of the two ways. 0079 (call 26).';
comment on column public.kitchen_page.para_aqui is
  'Her plates can be eaten at her kitchen. At least one of the two ways. 0079 (call 26).';
comment on column public.kitchen_page.container_price is
  'What she charges for the desechable, added when a plate is taken away; NULL is no '
  'charge. Copied to each offer when it is published. 0079, plan 10.5b-i.';

-- The body is `0076`'s with the five keys read beside the text ones. Everything
-- else is character for character: the fields sent are set, the fields left out
-- stay, unknown keys are ignored.
create or replace function public.set_kitchen_page(p_workspace_id uuid, p_page jsonb)
returns public.kitchen_page
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_kind     public.workspace_kind;
  v_key      text;
  v_sentence text;
  v_color    text;
  v_cover    text;
  v_logo     text;
  v_link     text;
  v_row      public.kitchen_page%rowtype;
  -- New in 0079: the kitchen's settings, as they will stand after this call.
  v_old      public.kitchen_page%rowtype;
  v_card     boolean;
  v_transfer boolean;
  v_llevar   boolean;
  v_aqui     boolean;
  v_box      numeric;
begin
  if v_user is null then
    raise exception 'set_kitchen_page requires an authenticated caller'
      using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'manager') then
    raise exception 'set_kitchen_page: only the owner or a manager of that kitchen sets its page'
      using errcode = '42501';
  end if;

  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'set_kitchen_page: only a kitchen has a page' using errcode = 'TD013';
  end if;

  if p_page is null or jsonb_typeof(p_page) <> 'object' then
    raise exception 'set_kitchen_page: the page is an object of the fields to change'
      using errcode = '22023';
  end if;
  foreach v_key in array array['sentence', 'color', 'cover_path', 'logo_path', 'maps_link']
  loop
    if p_page ? v_key and jsonb_typeof(p_page -> v_key) not in ('string', 'null') then
      raise exception 'set_kitchen_page: % is text, or null to clear it', v_key
        using errcode = '22023';
    end if;
  end loop;
  -- New in 0079: four yes-or-no keys, and the desechable's price as text.
  foreach v_key in array array['accepts_card', 'accepts_transfer', 'para_llevar', 'para_aqui']
  loop
    if p_page ? v_key and jsonb_typeof(p_page -> v_key) <> 'boolean' then
      raise exception 'set_kitchen_page: % is true or false', v_key
        using errcode = '22023';
    end if;
  end loop;
  if p_page ? 'container_price' and jsonb_typeof(p_page -> 'container_price') not in ('string', 'null') then
    raise exception 'set_kitchen_page: container_price is pesos as text, or null for no charge'
      using errcode = '22023';
  end if;

  v_sentence := nullif(btrim(coalesce(p_page ->> 'sentence', '')), '');
  v_color    := nullif(btrim(coalesce(p_page ->> 'color', '')), '');
  v_cover    := nullif(btrim(coalesce(p_page ->> 'cover_path', '')), '');
  v_logo     := nullif(btrim(coalesce(p_page ->> 'logo_path', '')), '');
  v_link     := nullif(btrim(coalesce(p_page ->> 'maps_link', '')), '');

  if v_sentence is not null and (char_length(v_sentence) > 100 or v_sentence ~ '[\r\n]') then
    raise exception 'set_kitchen_page: the sentence is one line of at most 100 characters'
      using errcode = '22023';
  end if;
  if v_color is not null
     and v_color not in ('chile', 'mole', 'nopal', 'talavera', 'cempasuchil', 'jamaica') then
    raise exception 'set_kitchen_page: the colour is one of chile, mole, nopal, talavera, cempasuchil, jamaica'
      using errcode = '22023';
  end if;
  if v_cover is not null and not public.picture_in_folder(v_cover, p_workspace_id) then
    raise exception 'set_kitchen_page: the cover is a picture in this kitchen''s own folder'
      using errcode = '22023';
  end if;
  if v_logo is not null and not public.picture_in_folder(v_logo, p_workspace_id) then
    raise exception 'set_kitchen_page: the logo is a picture in this kitchen''s own folder'
      using errcode = '22023';
  end if;
  if v_link is not null and not public.google_maps_link_ok(v_link) then
    raise exception 'set_kitchen_page: the link is one that opens Google Maps (https://maps.app.goo.gl/…)'
      using errcode = '22023';
  end if;

  -- New in 0079: each setting as it will stand — what was sent, else what was
  -- stored, else the default — so the two ways are checked whole.
  select * into v_old from public.kitchen_page k where k.workspace_id = p_workspace_id;
  v_card     := case when p_page ? 'accepts_card'     then (p_page ->> 'accepts_card')::boolean     else coalesce(v_old.accepts_card, false) end;
  v_transfer := case when p_page ? 'accepts_transfer' then (p_page ->> 'accepts_transfer')::boolean else coalesce(v_old.accepts_transfer, false) end;
  v_llevar   := case when p_page ? 'para_llevar'      then (p_page ->> 'para_llevar')::boolean      else coalesce(v_old.para_llevar, true) end;
  v_aqui     := case when p_page ? 'para_aqui'        then (p_page ->> 'para_aqui')::boolean        else coalesce(v_old.para_aqui, false) end;
  if not (v_llevar or v_aqui) then
    raise exception 'set_kitchen_page: a kitchen hands plates over para llevar, para comer aquí, or both'
      using errcode = '22023';
  end if;
  if p_page ? 'container_price' then
    begin
      v_box := nullif(btrim(coalesce(p_page ->> 'container_price', '')), '')::numeric;
    exception when others then
      raise exception 'set_kitchen_page: container_price is pesos and centavos'
        using errcode = '22023';
    end;
    if v_box is not null and (v_box <= 0 or v_box <> round(v_box, 2) or v_box >= 100000) then
      raise exception 'set_kitchen_page: container_price is pesos and centavos above zero, or null for no charge'
        using errcode = '22023';
    end if;
  else
    v_box := v_old.container_price;
  end if;

  insert into public.kitchen_page as k
    (workspace_id, sentence, color, cover_path, logo_path, maps_link, updated_at, updated_by,
     accepts_card, accepts_transfer, para_llevar, para_aqui, container_price)
  values
    (p_workspace_id, v_sentence, v_color, v_cover, v_logo, v_link, now(), v_user,
     v_card, v_transfer, v_llevar, v_aqui, v_box)
  on conflict (workspace_id) do update
     set sentence   = case when p_page ? 'sentence'   then excluded.sentence   else k.sentence   end,
         color      = case when p_page ? 'color'      then excluded.color      else k.color      end,
         cover_path = case when p_page ? 'cover_path' then excluded.cover_path else k.cover_path end,
         logo_path  = case when p_page ? 'logo_path'  then excluded.logo_path  else k.logo_path  end,
         maps_link  = case when p_page ? 'maps_link'  then excluded.maps_link  else k.maps_link  end,
         accepts_card     = excluded.accepts_card,
         accepts_transfer = excluded.accepts_transfer,
         para_llevar      = excluded.para_llevar,
         para_aqui        = excluded.para_aqui,
         container_price  = excluded.container_price,
         updated_at = now(),
         updated_by = v_user
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.set_kitchen_page(uuid, jsonb) is
  'The owner or a manager of a kitchen changes her page and, since 0079, her settings: '
  'accepts_card, accepts_transfer, para_llevar, para_aqui (true or false; at least one '
  'of the two ways) and container_price (pesos as text, or null for no charge). The '
  'fields sent are set (null or blank clears a text one), the fields left out stay, '
  'unknown keys are ignored. Answers with the page as saved. 42501 / TD013 (a shop) / '
  '22023 — see 0076 and 0079. Plans 10.5-i-a and 10.5b-i.';


-- ----------------------------------------------------------------------------
-- 2. The offer's: the desechable copied, and how each line may be eaten
-- ----------------------------------------------------------------------------

alter table public.listing add column container_price numeric(12,2);
alter table public.listing
  add constraint listing_container_price_shape
    check (container_price is null or (container_price > 0 and container_price < 100000));

comment on column public.listing.container_price is
  'The desechable''s price as the kitchen stated it when this was published, added to '
  'each plate taken away; NULL is no charge. Copied by publish_listing, never sent. '
  '0079, plan 10.5b-i.';

alter table public.listing_line
  add column para_llevar boolean not null default true,
  add column para_aqui   boolean not null default false;

alter table public.listing_line
  add constraint listing_line_one_way_at_least check (para_llevar or para_aqui),
  add constraint listing_line_surprise_is_to_go check (not surprise or (para_llevar and not para_aqui));

comment on column public.listing_line.para_llevar is
  'This line can be taken away. A surprise bag always can, and only that. 0079 (call 26).';
comment on column public.listing_line.para_aqui is
  'This line can be eaten at the kitchen. Never a surprise bag. 0079 (call 26).';

-- ⚠️ − MAY BRING A LINE TO ZERO when nothing of it is reserved (call 17: never
-- below what is reserved). Publishing still asks for 1 to 999.
alter table public.listing_line drop constraint listing_line_quantity_positive;
alter table public.listing_line
  add constraint listing_line_quantity_not_negative check (quantity >= 0);

comment on column public.listing_line.quantity is
  'How many she offers now: published as 1 to 999, then moved by − and + '
  '(set_listing_quantity), never below what is reserved. What is left is this less '
  'listing_line_taken. Fractions allowed, for a shop''s Ofrecer later. 0072, 0079.';

-- The body is `0076`'s, with two keys of each line read and written, and the
-- kitchen's desechable copied onto the publication. Everything else is character
-- for character.
--
-- Each line, as the phone sends it (keys it does not know are ignored):
--   {"id": uuid (optional), "name": "Comida corrida", "description": "…",
--    "tags": ["pica"], "unit_price": "65.00", "quantity": 4,
--    "surprise": false, "usual_price": "120.00", "image_path": "<workspace>/<uuid>",
--    "para_llevar": true, "para_aqui": false}
-- ⚠️ A WAY SENT MUST BE ONE THE KITCHEN OFFERS — each offer narrows her ways, never
-- widens them; a way not sent is the kitchen's own; a surprise bag is para llevar
-- whatever is sent.
create or replace function public.publish_listing(
  p_id           uuid,
  p_location_id  uuid,
  p_pickup_start timestamptz,
  p_pickup_end   timestamptz,
  p_lines        jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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

  if not public.has_role(v_loc.workspace_id, 'manager') then
    raise exception 'publish_listing: only the owner or a manager publishes'
      using errcode = '42501';
  end if;

  select w.kind into v_kind from public.workspace w where w.id = v_loc.workspace_id;
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
$$;

comment on function public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb) is
  'A kitchen publishes: one pickup window at one of her kitchens and one to ten '
  'lines, each a dish or a surprise bag, each with a photo in her own folder if she '
  'took one (0076), and since 0079 how each dish may be eaten (para_llevar, '
  'para_aqui: narrowed from the kitchen''s ways, which a line that sends neither '
  'takes; a bag is para llevar), with the kitchen''s desechable copied onto it. '
  'Owner or manager (question 3). The id is the phone''s; a retry returns it. '
  '42501 / TD013 (a shop) / 22023 — see 0072, 0076 and 0079. Plans 10.4a, 10.5b-i.';


-- ----------------------------------------------------------------------------
-- 3. The reservation: a header and its lines (call 37)
-- ----------------------------------------------------------------------------
-- ⚠️ `listing`'s SHAPE: the line carries the header's business and kitchen, a
-- composite key ties the three, and both are read at the member's own kitchens —
-- `location_id in my_locations()` — so a cook assigned to one branch of a chain
-- does not enumerate another's, while the owner and a manager see all. Every
-- member, any role, hands over (question 3), so every member reads them.
-- ⚠️ NO WRITE GRANT: the functions below are the only way in.
-- ⚠️ `buyer_id` IS A PLAIN uuid, `0053`'s ruling — no key in `public` points at a
-- login — and it is granted to NOBODY: a member reads every other column. It is
-- cleared when her account is deleted, so nothing left points to her.
-- ⚠️ "THAT DAY" IS THE DAY SHE COLLECTS, in the kitchen's zone (2026-11-06): the
-- code is unique at that business that day, so a shop's apartado for tomorrow
-- (call 42) never meets another code. 100 to 999 — never a leading zero to misread.
-- ⚠️ ONE LISTING PER RESERVATION: a shop's apartado of several products is several
-- lines of one shop's offer (`10.6b`); Itacate writes one line of one plate.
-- ⚠️ BOTH TABLES GO WITH THEIR KITCHEN: every key cascades from the listing, so a
-- kitchen deleted takes its reservations along — which is why the deletions refuse
-- while one is still to hand over.

create table public.reservation (
  id                 uuid primary key,
  workspace_id       uuid not null references public.workspace (id) on delete cascade,
  location_id        uuid not null,
  listing_id         uuid not null,
  buyer_id           uuid,
  buyer_workspace_id uuid references public.workspace (id) on delete set null,
  code               smallint not null,
  pickup_at          timestamptz not null,
  pickup_day         date not null,
  held_until         timestamptz not null,
  payment            text not null,
  eat                text not null,
  created_at         timestamptz not null default now(),
  cancelled_at       timestamptz,
  handed_over_at     timestamptz,
  handed_over_by     uuid,
  picked_up_at       timestamptz,

  constraint reservation_listing_fk
    foreign key (listing_id, workspace_id, location_id)
    references public.listing (id, workspace_id, location_id) on delete cascade,
  constraint reservation_id_scope_unique unique (id, workspace_id, location_id),
  constraint reservation_code_unique unique (workspace_id, pickup_day, code),
  constraint reservation_code_three_digits check (code between 100 and 999),
  constraint reservation_payment_known check (payment in ('efectivo', 'tarjeta', 'transferencia')),
  constraint reservation_eat_known check (eat in ('llevar', 'aqui'))
);

-- (A kitchen's day is read through `reservation_code_unique`'s index, whose first
-- two columns are the business and the day.)
create index reservation_by_buyer_idx on public.reservation (buyer_id) where buyer_id is not null;

comment on table public.reservation is
  'One reservation (an apartado): a header with its code, her hour, how she pays and how '
  'it is eaten, and the moments it was made, cancelled, handed over and confirmed; its '
  'state is reservation_state over those. Written only by the functions of 0079; read by '
  'the kitchen''s members, every column but buyer_id, and by the neighbour through '
  'my_reservations. 0079, plan 10.5b-i.';
comment on column public.reservation.buyer_id is
  'Who reserved: a plain id, granted to nobody, cleared when her account is deleted. '
  '0079.';
comment on column public.reservation.buyer_workspace_id is
  'The kitchen that reserved, when a kitchen reserves at a shop (10.6b). NULL for a '
  'neighbour. Call 37, 2026-11-06. 0079.';
comment on column public.reservation.code is
  'The 3-digit code she says at the counter: 100 to 999, random, unique at that business '
  'on the day she collects. 0079.';
comment on column public.reservation.pickup_at is
  'Her hour: a quarter hour, a date and a time (2026-11-06). 0079 (call 11).';
comment on column public.reservation.pickup_day is
  'The day she collects, in the kitchen''s zone — the day the code is unique on. 0079.';
comment on column public.reservation.held_until is
  'Until when her plate is held: the window''s end (call 11). 0079.';
comment on column public.reservation.payment is
  'How she will pay: efectivo, tarjeta or transferencia. Only the method — never an '
  'amount, a proof or an account (ruled 2026-11-05). 0079 (call 12).';
comment on column public.reservation.eat is
  'llevar or aqui: the kitchen packs it or serves it. 0079 (call 27).';
comment on column public.reservation.handed_over_by is
  'The member who typed the code: a plain id (0053). 0079.';
comment on column public.reservation.picked_up_at is
  'When she swiped Ya lo tengo. 0079.';

create table public.reservation_line (
  reservation_id  uuid not null,
  line_no         smallint not null,
  workspace_id    uuid not null,
  location_id     uuid not null,
  listing_line_id uuid not null references public.listing_line (id) on delete cascade,
  quantity        numeric(12,3) not null,
  unit_price      numeric(12,2) not null,
  container_price numeric(12,2),

  constraint reservation_line_pkey primary key (reservation_id, line_no),
  constraint reservation_line_header_fk
    foreign key (reservation_id, workspace_id, location_id)
    references public.reservation (id, workspace_id, location_id) on delete cascade,
  constraint reservation_line_number_positive check (line_no >= 1),
  constraint reservation_line_quantity_positive check (quantity > 0),
  constraint reservation_line_price_positive check (unit_price > 0),
  constraint reservation_line_container_price_shape check (container_price is null or container_price > 0)
);

create index reservation_line_by_listing_line_idx on public.reservation_line (listing_line_id);

comment on table public.reservation_line is
  'What a reservation holds: one offer''s line and how many, with its price and the '
  'desechable as they were when she reserved — so what she is charged never moves. '
  'Itacate writes one line of one plate. 0079, plan 10.5b-i (call 37).';
comment on column public.reservation_line.container_price is
  'The desechable per unit, when it is taken away and the kitchen charges for one; NULL '
  'otherwise. 0079.';

alter table public.reservation      enable row level security;
alter table public.reservation_line enable row level security;

create policy reservation_select on public.reservation
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));

create policy reservation_line_select on public.reservation_line
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));

revoke all on public.reservation      from anon, authenticated;
revoke all on public.reservation_line from anon, authenticated;
grant select (id, workspace_id, location_id, listing_id, buyer_workspace_id, code, pickup_at,
              pickup_day, held_until, payment, eat, created_at, cancelled_at, handed_over_at,
              handed_over_by, picked_up_at)
  on public.reservation to authenticated;
grant select on public.reservation_line to authenticated;

-- What is taken of an offer's line: every plate reserved and not given back.
create function public.listing_line_taken(p_listing_line_id uuid)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(rl.quantity), 0)
    from public.reservation_line rl
    join public.reservation r on r.id = rl.reservation_id
   where rl.listing_line_id = p_listing_line_id
     and (r.cancelled_at is null or r.handed_over_at is not null or r.picked_up_at is not null)
$$;

comment on function public.listing_line_taken(uuid) is
  'How much of an offer''s line is taken: every reservation of it not cancelled, or '
  'cancelled and handed over all the same. What is left is quantity less this. The one '
  'definition. Granted to nobody. 0079, plan 10.5b-i.';

revoke all on function public.listing_line_taken(uuid) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. The neighbour's functions — keyed on her own id (ADR-035 §2.7)
-- ----------------------------------------------------------------------------

-- ⚠️ ONE PLATE OF ONE DISH, AT HER HOUR, BY HER METHOD.
-- THE REFUSALS, IN THE ORDER SHE MEETS THEM:
--   42501  not signed in; the id is another person's reservation
--   22023  no id; that offer has no such line; a method the kitchen does not take;
--          a way the dish is not eaten; an hour that is not a quarter hour from the
--          current one until 15 minutes before the window ends, inside it
--   TD015  the offer is withdrawn, its window over, not a kitchen's — or nothing is
--          left of that dish
--   TD017  she is one of that kitchen's own people
--   TD016  she already holds three reservations still to collect (2026-11-10)
-- ⚠️ THE ID IS THE PHONE'S: a retry over a bad connection is that reservation,
-- returned before anything is checked again — as `publish_listing` does.
-- ⚠️ TWO LOCKS, ALWAYS IN THIS ORDER — her own, then the kitchen's — so two of her
-- phones never pass the three together, and two neighbours never take the last
-- plate or one code together. `set_listing_quantity` takes the kitchen's.
create function public.reserve_plate(
  p_id         uuid,
  p_listing_id uuid,
  p_line_no    integer,
  p_pickup_at  timestamptz,
  p_payment    text,
  p_eat        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_old      public.reservation%rowtype;
  v_listing  public.listing%rowtype;
  v_line     public.listing_line%rowtype;
  v_page     public.kitchen_page%rowtype;
  v_zone     text;
  v_eat      text;
  v_day      date;
  v_code     integer;
  v_tries    integer := 0;
begin
  if v_user is null then
    raise exception 'reserve_plate requires an authenticated caller' using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'reserve_plate: the phone must make the reservation''s id' using errcode = '22023';
  end if;

  -- A retry of a reservation already made is that reservation.
  select * into v_old from public.reservation r where r.id = p_id;
  if found then
    if v_old.buyer_id is distinct from v_user then
      raise exception 'reserve_plate: that id is not one of your reservations' using errcode = '42501';
    end if;
    return jsonb_build_object('id', v_old.id, 'code', v_old.code);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('tienda.reserve.buyer:' || v_user::text, 0));

  select li.* into v_listing
    from public.listing li
    join public.workspace w on w.id = li.workspace_id
   where li.id = p_listing_id
     and w.kind = 'cocina' and w.is_active
     and li.withdrawn_at is null and li.pickup_end > now();
  if not found then
    raise exception 'reserve_plate: that offer is no longer on offer' using errcode = 'TD015';
  end if;

  if exists (select 1 from public.workspace_member wm
              where wm.workspace_id = v_listing.workspace_id
                and wm.user_id = v_user and wm.is_active) then
    raise exception 'reserve_plate: a kitchen''s own people do not reserve at it' using errcode = 'TD017';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('tienda.reserve.business:' || v_listing.workspace_id::text, 0));

  select * into v_line from public.listing_line ll
   where ll.listing_id = v_listing.id and ll.line_no = p_line_no;
  if not found then
    raise exception 'reserve_plate: that offer has no line %', p_line_no using errcode = '22023';
  end if;

  if (select count(*) from public.reservation r
       where r.buyer_id = v_user
         and public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                      r.held_until, r.pickup_at) = 'apartado') >= 3 then
    raise exception 'reserve_plate: three reservations are still to collect' using errcode = 'TD016';
  end if;

  if v_line.quantity - public.listing_line_taken(v_line.id) < 1 then
    raise exception 'reserve_plate: nothing is left of that dish' using errcode = 'TD015';
  end if;

  select * into v_page from public.kitchen_page p where p.workspace_id = v_listing.workspace_id;
  if p_payment is null
     or p_payment not in ('efectivo', 'tarjeta', 'transferencia')
     or (p_payment = 'tarjeta' and not coalesce(v_page.accepts_card, false))
     or (p_payment = 'transferencia' and not coalesce(v_page.accepts_transfer, false)) then
    raise exception 'reserve_plate: the kitchen does not take that — cash always, a card or a transfer when she says so'
      using errcode = '22023';
  end if;

  if p_eat is null then
    v_eat := case when v_line.para_llevar then 'llevar' else 'aqui' end;
  elsif p_eat = 'llevar' and v_line.para_llevar then
    v_eat := 'llevar';
  elsif p_eat = 'aqui' and v_line.para_aqui then
    v_eat := 'aqui';
  else
    raise exception 'reserve_plate: that dish is not eaten that way' using errcode = '22023';
  end if;

  -- Her hour: a quarter hour, from the current one, inside the window, until 15
  -- minutes before it ends (call 11). `date_bin` keeps it free of any zone.
  if p_pickup_at is null
     or date_bin('15 minutes', p_pickup_at, timestamptz '2000-01-01 00:00:00+00') <> p_pickup_at
     or p_pickup_at < v_listing.pickup_start
     or p_pickup_at > v_listing.pickup_end - interval '15 minutes'
     or p_pickup_at < date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') then
    raise exception 'reserve_plate: her hour is a quarter hour from now until 15 minutes before the window ends'
      using errcode = '22023';
  end if;

  select l.timezone into v_zone from public.location l where l.id = v_listing.location_id;
  v_day := (p_pickup_at at time zone v_zone)::date;

  -- The code: random, unused at that business that day.
  loop
    v_code := 100 + floor(random() * 900)::integer;
    exit when not exists (select 1 from public.reservation r
                           where r.workspace_id = v_listing.workspace_id
                             and r.pickup_day = v_day and r.code = v_code);
    v_tries := v_tries + 1;
    if v_tries >= 20 then
      select min(c) into v_code
        from generate_series(100, 999) c
       where not exists (select 1 from public.reservation r
                          where r.workspace_id = v_listing.workspace_id
                            and r.pickup_day = v_day and r.code = c);
      if v_code is null then
        raise exception 'reserve_plate: every code of that day is taken' using errcode = '54000';
      end if;
      exit;
    end if;
  end loop;

  insert into public.reservation
    (id, workspace_id, location_id, listing_id, buyer_id, code, pickup_at, pickup_day,
     held_until, payment, eat)
  values
    (p_id, v_listing.workspace_id, v_listing.location_id, v_listing.id, v_user, v_code,
     p_pickup_at, v_day, v_listing.pickup_end, p_payment, v_eat);

  insert into public.reservation_line
    (reservation_id, line_no, workspace_id, location_id, listing_line_id, quantity,
     unit_price, container_price)
  values
    (p_id, 1, v_listing.workspace_id, v_listing.location_id, v_line.id, 1,
     v_line.unit_price, case when v_eat = 'llevar' then v_listing.container_price end);

  return jsonb_build_object('id', p_id, 'code', v_code);
end;
$$;

comment on function public.reserve_plate(uuid, uuid, integer, timestamptz, text, text) is
  'A neighbour reserves one plate of one line of an offer on offer now: her hour (a '
  'quarter hour from the current one until 15 minutes before the window ends), how she '
  'pays (efectivo always; tarjeta and transferencia when the kitchen takes them) and how '
  'it is eaten (llevar or aqui, among the line''s ways; NULL is llevar when it can be). '
  'Up to three still to collect. The id is the phone''s; a retry returns it. Answers '
  '{id, code}. 42501 / 22023 / TD015 / TD016 / TD017 — see 0079. Plan 10.5b-i.';

-- ⚠️ HER OWN, AND NOTHING ELSE: keyed on `auth.uid()`, the shape `my_access_requests()`
-- (`0029`) has — no door into anyone else's data. What a reservation needs her to
-- know: the code, her hour, until when it is held, when cancelling becomes *No voy
-- a poder ir*, how she pays and eats, what she reserved at what price, and the
-- kitchen's name, address, directions and page — never a point (Google's copy is
-- handed out only by the door, `0078`'s census) and never anyone else. The ones
-- still to collect and her last 30 days; money and quantities as decimal strings.
create function public.my_reservations()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'my_reservations requires an authenticated caller' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', r.id,
             'code', r.code,
             'state', public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                               r.held_until, r.pickup_at),
             'pickup_at', r.pickup_at,
             'held_until', r.held_until,
             'cancel_until', r.pickup_at - interval '1 hour',
             'payment', r.payment,
             'eat', r.eat,
             'created_at', r.created_at,
             'cancelled_at', r.cancelled_at,
             'handed_over_at', r.handed_over_at,
             'picked_up_at', r.picked_up_at,
             'kitchen', jsonb_build_object(
                'id', w.id,
                'name', w.display_name,
                'giro', w.giro_principal,
                'address', jsonb_build_object(
                   'street', l.street, 'street_number', l.street_number, 'colonia', l.colonia,
                   'city', l.city, 'postal_code', l.postal_code),
                'directions', l.directions,
                'page', (select jsonb_build_object(
                                  'color', p.color, 'logo_path', p.logo_path, 'maps_link', p.maps_link)
                           from public.kitchen_page p
                          where p.workspace_id = w.id)),
             'lines', (select jsonb_agg(jsonb_build_object(
                                'line_no', ll.line_no, 'name', ll.name, 'surprise', ll.surprise,
                                'image_path', ll.image_path,
                                'quantity', rl.quantity::text,
                                'unit_price', rl.unit_price::text,
                                'container_price', rl.container_price::text)
                              order by rl.line_no)
                         from public.reservation_line rl
                         join public.listing_line ll on ll.id = rl.listing_line_id
                        where rl.reservation_id = r.id)
           ) order by r.pickup_at desc, r.id), '[]'::jsonb)
      from public.reservation r
      join public.workspace w on w.id = r.workspace_id
      join public.location l on l.id = r.location_id
     where r.buyer_id = auth.uid()
       and r.pickup_day >= (now() at time zone l.timezone)::date - 30
  );
end;
$$;

comment on function public.my_reservations() is
  'The caller''s own reservations — every one still to collect and her last 30 days — '
  'with the code, the state, her hour, until when it is held, cancel_until (an hour '
  'before her hour), how she pays and eats, the lines at their prices, and the '
  'kitchen''s name, trade, address, directions and page. Keyed on auth.uid(); nobody '
  'else''s. Money and quantities as decimal strings. 0079, plan 10.5b-i.';

-- ⚠️ BEFORE AN HOUR BEFORE HER HOUR IT IS `cancelado`, AFTER IT `no_va` (*No voy a
-- poder ir*, call 15) — and both give the plate back. A retry answers the state it
-- left. 42501 when it is not hers; TD018 when it was collected or its window is over.
create function public.cancel_my_reservation(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_r     public.reservation%rowtype;
  v_state text;
begin
  if v_user is null then
    raise exception 'cancel_my_reservation requires an authenticated caller' using errcode = '42501';
  end if;

  select * into v_r from public.reservation r
   where r.id = p_id and r.buyer_id = v_user
   for update;
  if not found then
    raise exception 'cancel_my_reservation: that reservation is not one of yours' using errcode = '42501';
  end if;

  v_state := public.reservation_state(v_r.cancelled_at, v_r.handed_over_at, v_r.picked_up_at,
                                      v_r.held_until, v_r.pickup_at);
  if v_state in ('cancelado', 'no_va') then
    return v_state;
  end if;
  if v_state <> 'apartado' then
    raise exception 'cancel_my_reservation: that reservation is no longer pending (%)', v_state
      using errcode = 'TD018';
  end if;

  update public.reservation set cancelled_at = now() where id = v_r.id;
  return public.reservation_state(now(), null, null, v_r.held_until, v_r.pickup_at);
end;
$$;

comment on function public.cancel_my_reservation(uuid) is
  'The neighbour gives her reservation back: cancelado up to an hour before her hour, '
  'no_va after it (No voy a poder ir); the plate is back on offer either way. A retry '
  'answers the state it left. 42501 (not hers) / TD018 (collected, or its window over). '
  '0079, plan 10.5b-i.';

-- ⚠️ *YA LO TENGO* — her side of *Recogí*: either side's word makes it collected. A
-- cancelled reservation the kitchen did not hand over is not hers to confirm, and
-- the day after its window is the last she can. Its first moment is kept.
create function public.confirm_my_pickup(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_r    public.reservation%rowtype;
begin
  if v_user is null then
    raise exception 'confirm_my_pickup requires an authenticated caller' using errcode = '42501';
  end if;

  select * into v_r from public.reservation r
   where r.id = p_id and r.buyer_id = v_user
   for update;
  if not found then
    raise exception 'confirm_my_pickup: that reservation is not one of yours' using errcode = '42501';
  end if;

  if v_r.picked_up_at is null then
    if (v_r.cancelled_at is not null and v_r.handed_over_at is null)
       or now() > v_r.held_until + interval '24 hours' then
      raise exception 'confirm_my_pickup: that reservation is no longer pending' using errcode = 'TD018';
    end if;
    update public.reservation set picked_up_at = now() where id = v_r.id;
  end if;

  return 'recogido';
end;
$$;

comment on function public.confirm_my_pickup(uuid) is
  'The neighbour swipes Ya lo tengo: her reservation is collected (recogido). The first '
  'moment is kept. 42501 (not hers) / TD018 (cancelled and not handed over, or more than '
  'a day after its window). 0079, plan 10.5b-i.';


-- ----------------------------------------------------------------------------
-- 5. The fonda's functions — her kitchen's side, under its ordinary walls
-- ----------------------------------------------------------------------------

-- ⚠️ *ENTREGAR* IS ALWAYS RECORDED (ruled 2026-11-10): the code typed at the counter
-- means the food was handed over, so it is written whatever the reservation says —
-- even after its window, even if she cancelled while the counter had no signal.
-- ⚠️ IT MAY ARRIVE LATE, FROM HER QUEUE (`10.5b-iv`): `p_at` is when it happened on
-- her phone, kept between the reservation's making and now; a retry keeps the first.
-- Any member of that kitchen, any role (question 3: everyone hands over).
create function public.hand_over_reservation(p_id uuid, p_at timestamptz default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_r    public.reservation%rowtype;
begin
  if v_user is null then
    raise exception 'hand_over_reservation requires an authenticated caller' using errcode = '42501';
  end if;

  select * into v_r from public.reservation r
   where r.id = p_id
     and r.workspace_id in (select public.my_workspaces())
     and r.location_id  in (select public.my_locations())
   for update;
  if not found then
    raise exception 'hand_over_reservation: that reservation is not at one of your kitchens'
      using errcode = '42501';
  end if;

  if v_r.handed_over_at is null then
    update public.reservation
       set handed_over_at = greatest(least(coalesce(p_at, now()), now()), v_r.created_at),
           handed_over_by = v_user
     where id = v_r.id;
  end if;

  return 'recogido';
end;
$$;

comment on function public.hand_over_reservation(uuid, timestamptz) is
  'A member of the kitchen hands a reservation over (the code typed): always recorded, '
  'whatever its state; p_at is when, on her phone (kept between its making and now); a '
  'retry keeps the first. Answers recogido. 42501 when it is not at one of her kitchens. '
  '0079, plan 10.5b-i.';

-- ⚠️ − AND + (call 17): how many she offers now, never below what is reserved; the
-- price and the dish never change after publishing. Whole numbers, 0 to 999. The
-- owner or a manager, as publishing is. Answers what she offers and what is taken,
-- as decimal strings.
create function public.set_listing_quantity(
  p_listing_id uuid,
  p_line_no    integer,
  p_quantity   numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
  if not found or not public.has_role(v_listing.workspace_id, 'manager') then
    raise exception 'set_listing_quantity: only the owner or a manager of that kitchen changes it'
      using errcode = '42501';
  end if;

  select w.kind into v_kind from public.workspace w where w.id = v_listing.workspace_id;
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
$$;

comment on function public.set_listing_quantity(uuid, integer, numeric) is
  'The owner or a manager says how many of an offer''s line she offers now (− and +): a '
  'whole number from 0 to 999, never below what is reserved. Answers {quantity, taken} '
  'as decimal strings. 42501 / TD013 / TD015 (withdrawn or over) / 22023 / TD019 (below '
  'what is reserved). 0079, plan 10.5b-i.';


-- ----------------------------------------------------------------------------
-- 6. The door: what is left, the ways, the desechable, the methods
-- ----------------------------------------------------------------------------
-- The body is `0078`'s with four changes, each marked: the kitchen's settings
-- read beside its place; `payment` and `eat` on each kitchen; `container_price`
-- on each offer; and on each line `quantity` as what is LEFT, with `para_llevar`
-- and `para_aqui` — a line with nothing left not sent, an offer with no line left
-- not on offer (`0072`'s own definition: *with something left*). Everything else
-- character for character — `cocina/test/comoLaVen.test.ts` and the census in
-- `supabase/tests/0078_the_door_and_googles_point.sql` read this text.
create or replace function public.on_offer_now()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'on_offer_now requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  return (
    with kitchen as (
      select w.id, w.display_name, w.giro_principal, l.id as location_id, l.street,
             l.street_number, l.colonia, l.city, l.postal_code, l.directions,
             l.timezone, l.pin_lat, l.pin_lng, l.google_at,
             -- ⚠️ THE ONE PLACE GOOGLE'S POINT IS READ: handed out, never compared.
             jsonb_build_object('lat', l.google_lat, 'lng', l.google_lng, 'source', 'google') as google_point,
             -- 0079: the kitchen's settings; no page is cash and para llevar only.
             coalesce(kp.accepts_card, false) as accepts_card,
             coalesce(kp.accepts_transfer, false) as accepts_transfer,
             coalesce(kp.para_llevar, true) as para_llevar,
             coalesce(kp.para_aqui, false) as para_aqui
        from public.workspace w
        join lateral (
               select loc.*
                 from public.location loc
                where loc.workspace_id = w.id and loc.is_active
                order by loc.created_at, loc.id
                limit 1) l on true
        left join public.kitchen_page kp on kp.workspace_id = w.id
       where w.kind = 'cocina' and w.is_active
         and exists (select 1 from public.listing li
                      where li.workspace_id = w.id
                        and ((li.withdrawn_at is null and li.pickup_end > now())
                             or li.created_at >= now() - interval '14 days'))
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', k.id,
             'name', k.display_name,
             'giro', k.giro_principal,
             'address', jsonb_build_object(
                'street', k.street, 'street_number', k.street_number, 'colonia', k.colonia,
                'city', k.city, 'postal_code', k.postal_code),
             'directions', k.directions,
             -- Her own pin wins; else Google's copy while it is under 29 days old.
             'point', case
                        when k.pin_lat is not null then
                          jsonb_build_object('lat', k.pin_lat, 'lng', k.pin_lng, 'source', 'pin')
                        when k.google_at > now() - interval '29 days' then k.google_point
                      end,
             'page', (select jsonb_build_object(
                               'sentence', p.sentence, 'color', p.color, 'cover_path', p.cover_path,
                               'logo_path', p.logo_path, 'maps_link', p.maps_link)
                        from public.kitchen_page p
                       where p.workspace_id = k.id),
             -- 0079: how she takes payment (cash always) and the ways she hands plates over.
             'payment', to_jsonb(array['efectivo']
                                 || case when k.accepts_card then array['tarjeta'] else '{}'::text[] end
                                 || case when k.accepts_transfer then array['transferencia'] else '{}'::text[] end),
             'eat', to_jsonb(case when k.para_llevar then array['llevar'] else '{}'::text[] end
                             || case when k.para_aqui then array['aqui'] else '{}'::text[] end),
             'on_offer', coalesce((
                select jsonb_agg(jsonb_build_object(
                         'id', li.id,
                         'pickup_start', li.pickup_start,
                         'pickup_end', li.pickup_end,
                         -- 0079: the desechable as she stated it when she published.
                         'container_price', li.container_price::text,
                         -- 0079: `quantity` is what is LEFT; a line with nothing left is not sent.
                         'lines', (select jsonb_agg(jsonb_build_object(
                                            'line_no', ll.line_no, 'name', ll.name,
                                            'description', ll.description, 'tags', to_jsonb(ll.tags),
                                            'unit_price', ll.unit_price::text,
                                            'quantity', (ll.quantity - t.taken)::numeric(12,3)::text,
                                            'surprise', ll.surprise,
                                            'usual_price', ll.usual_price::text,
                                            'image_path', ll.image_path,
                                            'para_llevar', ll.para_llevar,
                                            'para_aqui', ll.para_aqui)
                                          order by ll.line_no)
                                     from public.listing_line ll
                                    cross join lateral (select public.listing_line_taken(ll.id) as taken) t
                                    where ll.listing_id = li.id
                                      and ll.quantity > t.taken))
                         order by li.pickup_start, li.id)
                  from public.listing li
                 where li.workspace_id = k.id
                   and li.withdrawn_at is null and li.pickup_end > now()
                   -- 0079: on offer only with something left.
                   and exists (select 1 from public.listing_line x
                                where x.listing_id = li.id
                                  and x.quantity > public.listing_line_taken(x.id))), '[]'::jsonb),
             -- What she usually publishes, over four weeks, in her kitchen's own zone.
             'summary', jsonb_build_object(
                'weekdays', (select jsonb_agg(coalesce(c.n, 0) order by d.dow)
                               from generate_series(1, 7) d(dow)
                               left join (select extract(isodow from li.pickup_start at time zone k.timezone)::int as dow,
                                                 count(*)::int as n
                                            from public.listing li
                                           where li.workspace_id = k.id
                                             and li.created_at >= now() - interval '28 days'
                                           group by 1) c on c.dow = d.dow),
                'usual_hour', (select extract(hour from li.pickup_start at time zone k.timezone)::int
                                 from public.listing li
                                where li.workspace_id = k.id
                                  and li.created_at >= now() - interval '28 days'
                                group by 1
                                order by count(*) desc, 1
                                limit 1),
                'last_day', (select to_char(max(li.pickup_start at time zone k.timezone), 'YYYY-MM-DD')
                               from public.listing li
                              where li.workspace_id = k.id
                                and li.created_at >= now() - interval '28 days'),
                'repeats', coalesce((
                   select jsonb_agg(jsonb_build_object('name', r.name, 'times', r.times,
                                                       'usual_price', r.usual_price::text)
                                    order by r.times desc, r.last_seen desc, r.name)
                     from (select (array_agg(ll.name order by li.created_at desc))[1] as name,
                                  count(distinct li.id)::int as times,
                                  mode() within group (order by ll.unit_price) as usual_price,
                                  max(li.created_at) as last_seen
                             from public.listing_line ll
                             join public.listing li on li.id = ll.listing_id
                            where li.workspace_id = k.id
                              and li.created_at >= now() - interval '28 days'
                            group by public.normalize_name(ll.name)
                           having count(distinct li.id) >= 2
                            order by count(distinct li.id) desc, max(li.created_at) desc
                            limit 5) r), '[]'::jsonb))
           ) order by k.id), '[]'::jsonb)
      from kitchen k
  );
end;
$$;

comment on function public.on_offer_now() is
  'THE ONE DOOR (ADR-035 §2.7): every kitchen a neighbour may see — on offer now (not '
  'withdrawn, its window not over, something left) or published in the last 14 days — '
  'with its name, trade, address, directions, page, how it takes payment and the ways it '
  'hands plates over (0079), what it offers now line by line — quantity is what is left, '
  'with each line''s ways and each offer''s desechable (0079) — a summary of what it '
  'usually publishes over four weeks, and the point to draw: her own pin, else Google''s '
  '30-day copy while under 29 days old, else none. For the pilot it takes no area: her '
  'phone works out distance and order. Never a cost, a member, a ledger row or who '
  'reserved; money and quantities as decimal strings. 0078 and 0079, plans 10.5-i-b-i and '
  '10.5b-i.';


-- ----------------------------------------------------------------------------
-- 7. The two deletions learn about reservations (ruled 2026-11-10)
-- ----------------------------------------------------------------------------
-- (1) A kitchen with a reservation still to hand over is not deleted — alone, or
--     with the account of its only owner — until each is handed over or its window
--     ends: `TD014`, checked before the typed names, so a wrong name never hides it.
-- (2) A neighbour's account goes at once: her reservations still to collect are
--     cancelled, so each plate is back on offer and the kitchen reads it cancelled,
--     and every reservation of hers is left with nothing that points to her.
-- ⚠️ THE PURGE IS UNCHANGED, statement for statement: `0077`'s suite holds the two
-- bodies' `delete from` lists equal, and a kitchen's reservations go with it by
-- their keys.

create or replace function public.delete_my_business(p_workspace_id uuid, p_business_name text)
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

  -- New in 0079: not while a neighbour holds a plate there.
  if exists (select 1 from public.reservation r
              where r.workspace_id = p_workspace_id
                and public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                             r.held_until, r.pickup_at) = 'apartado') then
    raise exception 'delete_my_business: a reservation at this kitchen is still to hand over'
      using errcode = 'TD014';
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
  'active owner shares it); TD014 while a reservation there is still to hand over '
  '(0079); TD007 when the name does not match; nothing changes on any refusal. The '
  'purge is delete_my_account''s for that business. Returns {business_deleted}. 0077, '
  'plan 10.5-iii-c, the owner''s ruling of 2026-11-04; 0079, plan 10.5b-i.';

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
  'keeps her id (0079). Returns {shops_deleted, shops_left}. 0073, plan 10.4b-i, '
  'the owner''s ruling of 2026-10-29; 0079, plan 10.5b-i, his ruling of 2026-11-10.';


-- ----------------------------------------------------------------------------
-- 8. Who may call what
-- ----------------------------------------------------------------------------
-- ⚠️ `from public, anon` — never `from public` alone: the hosted project hands
-- `anon` EXECUTE by default (ADR-035, the revision of 2026-10-27). Each is named in
-- `supabase/pgtap/_walls.sql`'s list in this same change. The re-created
-- functions keep their grants.

revoke all on function public.reserve_plate(uuid, uuid, integer, timestamptz, text, text) from public, anon;
grant execute on function public.reserve_plate(uuid, uuid, integer, timestamptz, text, text) to authenticated;

revoke all on function public.my_reservations() from public, anon;
grant execute on function public.my_reservations() to authenticated;

revoke all on function public.cancel_my_reservation(uuid) from public, anon;
grant execute on function public.cancel_my_reservation(uuid) to authenticated;

revoke all on function public.confirm_my_pickup(uuid) from public, anon;
grant execute on function public.confirm_my_pickup(uuid) to authenticated;

revoke all on function public.hand_over_reservation(uuid, timestamptz) from public, anon;
grant execute on function public.hand_over_reservation(uuid, timestamptz) to authenticated;

revoke all on function public.set_listing_quantity(uuid, integer, numeric) from public, anon;
grant execute on function public.set_listing_quantity(uuid, integer, numeric) to authenticated;

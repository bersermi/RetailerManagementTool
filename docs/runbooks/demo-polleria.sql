-- ============================================================================
-- demo-polleria.sql — months of history for a DEMO shop: a Pollería y Recaudería
-- ============================================================================
-- Fills ONE demo account's shop with sales, deliveries, write-offs and an
-- employee, from c_start to now, so the owner can show Wera to prospective
-- shops. Written the way the seed writes its ledger (supabase/seeds/10_, 20_):
-- by hand, mirroring record_purchase / record_sale / record_waste, with every
-- withdrawal allocated through allocate_fefo() — because the record_* RPCs
-- clamp a document to the last 72 hours and history cannot be written through
-- them.
--
-- ONE STATEMENT (a single DO block), so `supabase db query --linked -f` runs
-- it atomically: it all lands or none of it does.
--
-- RE-RUNNABLE, AND RUN IN CHUNKS: each run writes at most c_days days, from
-- the shop's newest sale onwards, so the first fill takes about eight runs
-- (demo-polleria.sh loops them) and every later run tops the shop up to now —
-- deliveries and write-offs already on a day are never written twice. Run it
-- on the morning of a demo and today has sales. A run that fails or times out
-- rolls back whole, so running it again is always safe.
--
-- WHAT IT TOUCHES: only the shop owned by c_email. It refuses an unknown email
-- or an account owning more than one shop. If the account has no shop yet it
-- opens one (onboard_workspace, as the app does) and imports the Pollería,
-- Verdulería and Frutería starter catalogs (import_catalog, as the app does).
-- It adds six providers, and one employee — Lucía, a login nobody can sign in
-- with (random password), because a member must have a login
-- (workspace_member_login_exists_trg).
--
-- docs/runbooks/demo-polleria.sh puts the email in for __OWNER_EMAIL__ and runs it.
-- ============================================================================
do $demo$
declare
  c_email  constant text := '__OWNER_EMAIL__';
  c_shop   constant text := 'Pollería y Recaudería La Güera';
  c_start  constant date := date '2026-05-01';
  c_tz     constant text := 'America/Mexico_City';
  c_scale  constant numeric := 1.0;           -- every day's demand, multiplied
  c_until  constant timestamptz := now() - interval '1 minute';
  c_lines_per_ticket constant numeric := 2.9;
  c_days   constant integer := 31;            -- days written per run: run it until it is up to date

  v_owner uuid; v_ws uuid; v_loc uuid; v_emp uuid; v_emp_member uuid; v_emp_email text;
  v_n integer; v_last timestamptz; v_from date; v_today date;
  v_day date; v_dow integer; v_open numeric; v_close numeric;
  v_prov record; v_at timestamptz; v_doc uuid; v_pid uuid;
  v_tk record; v_ln record; v_alloc record;
  v_tot_net numeric(12,2); v_nlines integer; v_T integer;
  v_who uuid; v_cost_num numeric; v_cost_qty numeric;
  v_sales integer := 0; v_purchases integer := 0; v_wastes integer := 0;
begin
  drop table if exists _dp, _sup, _prov, _stock, _pl, _ln, _tk, _wl, _wq;

  -- --------------------------------------------------------------------------
  -- 1. The owner, the shop, the store
  -- --------------------------------------------------------------------------
  select u.id into v_owner from auth.users u where lower(u.email) = lower(c_email);
  if v_owner is null then
    raise exception 'demo: no account with email % — sign up in Wera first', c_email;
  end if;

  select count(*) into v_n
    from public.workspace_member wm join public.workspace w on w.id = wm.workspace_id
   where wm.user_id = v_owner and wm.role = 'owner' and wm.is_active and w.kind = 'tienda';
  if v_n > 1 then
    raise exception 'demo: % owns % shops — use an account that owns only the demo shop', c_email, v_n;
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  select wm.workspace_id into v_ws
    from public.workspace_member wm join public.workspace w on w.id = wm.workspace_id
   where wm.user_id = v_owner and wm.role = 'owner' and wm.is_active and w.kind = 'tienda';
  if v_ws is null then
    v_ws := public.onboard_workspace(c_shop, true, c_shop);
    update public.workspace set giro_principal = 'giro-polleria' where id = v_ws;
  end if;

  select l.id into v_loc from public.location l
   where l.workspace_id = v_ws and l.is_active order by l.created_at, l.id limit 1;

  -- The starter catalog, as the app imports it. A second import imports nothing.
  perform public.import_catalog(v_ws, array['giro-polleria','giro-verduleria','giro-fruteria']);
  perform set_config('request.jwt.claims', null, true);

  -- --------------------------------------------------------------------------
  -- 2. Providers (no phone numbers: a made-up number could be somebody's)
  -- --------------------------------------------------------------------------
  insert into public.provider (workspace_id, name, contact_name)
  select v_ws, p.name, p.contact
    from (values
      ('Avícola El Rancho',             'Sr. Ramiro Téllez'),
      ('Pollos El Güero',               'Sr. Javier Ortiz'),
      ('Huevo La Granja',               'Sra. Leticia Campos'),
      ('Bodega Hermanos Ruiz',          'Sr. Ernesto Ruiz'),
      ('Frutas Selectas Mendoza',       'Sra. Patricia Mendoza'),
      ('Abarrotes y Chiles La Central', 'Sr. Arturo Lara')
    ) as p(name, contact)
   where not exists (select 1 from public.provider x
                      where x.workspace_id = v_ws and x.normalized_name = public.normalize_name(p.name));

  -- --------------------------------------------------------------------------
  -- 3. The employee: Lucía, Empleado, at this store
  -- --------------------------------------------------------------------------
  select wm.user_id, wm.id into v_emp, v_emp_member
    from public.workspace_member wm
   where wm.workspace_id = v_ws and wm.role = 'staff' and wm.display_name = 'Lucía'
   limit 1;
  if v_emp is null then
    v_emp := gen_random_uuid();
    v_emp_email := 'lucia.' || left(v_ws::text, 8) || '@demo.wera.invalid';
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change)
    values
      ('00000000-0000-0000-0000-000000000000', v_emp, 'authenticated', 'authenticated',
       v_emp_email, extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
       '', '', '', '');
    insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (v_emp::text, v_emp,
            jsonb_build_object('sub', v_emp::text, 'email', v_emp_email, 'email_verified', true),
            'email', now(), now());
    insert into public.workspace_member (workspace_id, user_id, role, display_name)
    values (v_ws, v_emp, 'staff', 'Lucía')
    returning id into v_emp_member;
    insert into public.member_location (workspace_id, member_id, location_id)
    values (v_ws, v_emp_member, v_loc);
  end if;

  -- --------------------------------------------------------------------------
  -- 4. Curves: a value per month start, May 1 .. Dec 1, linear in between
  -- --------------------------------------------------------------------------
  create or replace function pg_temp.idx(a numeric[], d date) returns numeric
  language sql immutable as $f$
    select case
      when d < date '2026-05-01' then a[1]
      when d >= date '2026-12-01' then a[8]
      else (select a[k + 1] + (a[k + 2] - a[k + 1])
                   * ((d - ms)::numeric / (((ms + interval '1 month')::date) - ms))
              from (select (extract(month from d)::int - 5) as k,
                           date_trunc('month', d)::date as ms) s)
    end
  $f$;

  -- A day's expected demand, in display units (kg, pza, manojo), before noise.
  create or replace function pg_temp.expect(p_daily numeric, p_season numeric[], d date) returns numeric
  language sql immutable as $f$
    select p_daily
         * (array[0.80, 0.85, 0.92, 0.90, 1.05, 1.30, 1.10])[extract(isodow from d)::int]
         * (1 + 0.012 * ((d - date '2026-05-01') / 30.0))       -- the shop grows a little
         * pg_temp.idx(p_season, d)
         * case d when date '2026-05-10' then 1.25               -- Día de las Madres
                  when date '2026-09-15' then 1.30               -- noche mexicana
                  when date '2026-09-16' then 0.85
                  when date '2026-10-31' then 1.10
                  when date '2026-11-01' then 1.20               -- Día de Muertos
                  when date '2026-11-02' then 1.15
                  when date '2026-11-16' then 0.85
                  else 1 end
  $f$;

  create or replace function pg_temp.step(p numeric, s numeric) returns numeric
  language sql immutable as $f$ select greatest(s, round(p / s) * s) $f$;

  -- --------------------------------------------------------------------------
  -- 5. What this shop sells, and how
  -- --------------------------------------------------------------------------
  -- daily: a normal weekday's sales in display units; line: one customer's usual
  -- quantity; ratio: today's cost over today's shelf price; curve: the cost path;
  -- season: the demand path (0 = not sold that month); life: days before it is
  -- thrown away (null: it keeps); pack: deliveries come in multiples of it.
  create temp table _dp (
    code text primary key, daily numeric, line numeric, ratio numeric,
    curve numeric[], season numeric[], life integer, pack numeric, grp text,
    variant_id uuid, factor numeric, unit_code text, purchase_unit text, tax numeric,
    sell_now numeric, sell_today numeric, cost_step numeric
  ) on commit drop;

  insert into _dp (code, daily, line, ratio, curve, season, life, pack, grp)
  select v.code, v.daily, v.line, v.ratio, c.curve, coalesce(s.season, '{1,1,1,1,1,1,1,1}'), v.life, v.pack, v.grp
    from (values
      -- Pollería
      ('pollo-entero',        16.0, 2.10, 0.72, 'pollo', null,     3, 0.1,  'pollo'),
      ('pechuga-entera',       9.0, 1.00, 0.75, 'pollo', null,     3, 0.1,  'pollo'),
      ('pechuga-deshuesada',   4.5, 0.75, 0.74, 'pollo', null,     3, 0.1,  'pollo'),
      ('milanesa-de-pollo',    5.5, 0.60, 0.68, 'pollo', null,     3, 0.1,  'pollo'),
      ('pierna-con-muslo',    11.0, 1.10, 0.73, 'pollo', null,     3, 0.1,  'pollo'),
      ('pierna',               2.5, 0.80, 0.73, 'pollo', null,     3, 0.1,  'pollo'),
      ('muslo',                2.5, 0.80, 0.73, 'pollo', null,     3, 0.1,  'pollo'),
      ('alitas',               3.5, 1.00, 0.72, 'pollo', null,     3, 0.1,  'pollo'),
      ('huacal',               3.0, 1.00, 0.60, 'pollo', null,     3, 0.1,  'pollo'),
      ('patas',                1.5, 0.50, 0.57, 'pollo', null,     3, 0.1,  'pollo'),
      ('molleja',              1.5, 0.50, 0.67, 'pollo', null,     3, 0.1,  'pollo'),
      ('higado',               1.2, 0.50, 0.60, 'pollo', null,     3, 0.1,  'pollo'),
      ('retazo',               2.0, 1.00, 0.62, 'pollo', null,     3, 0.1,  'pollo'),
      ('pechuga-adobada',      1.5, 0.50, 0.69, 'pollo', null,     3, 0.1,  'pollo'),
      ('nuggets-de-pollo',     1.0, 0.50, 0.70, 'pollo', null,     5, 0.1,  'pollo'),
      ('huevo-blanco',         7.0, 1.00, 0.80, 'huevo', null,    25, 1,    'huevo'),
      ('huevo-rojo',           1.8, 1.00, 0.78, 'huevo', null,    25, 1,    'huevo'),
      -- Moles, salsas, chiles secos
      ('mole-dona-maria-original-vaso-chico', 3.0, 1, 0.72, 'abarrote', null,    null, 12, 'abarrote'),
      ('salsa-valentina-etiqueta-amarilla',   2.5, 1, 0.70, 'abarrote', null,    null, 12, 'abarrote'),
      ('mole-rojo-a-granel',   0.5, 0.25, 0.65, 'abarrote', null,    null, 1, 'abarrote'),
      ('chile-guajillo',       0.35, 0.10, 0.62, 'abarrote', 'secos', null, 1, 'seco'),
      ('chile-ancho',          0.2, 0.10, 0.62, 'abarrote', 'secos', null, 1, 'seco'),
      ('chile-de-arbol',       0.1, 0.05, 0.60, 'abarrote', 'secos', null, 1, 'seco'),
      -- Verduras
      ('jitomate-saladet',    13.0, 1.00, 0.62, 'jitomate', null,   6, 1,  'verdura'),
      ('tomate-verde',         4.5, 0.50, 0.60, 'tomate',   null,   8, 1,  'verdura'),
      ('cebolla-blanca',       4.5, 0.50, 0.62, 'cebolla',  null,  15, 1,  'verdura'),
      ('papa-blanca',          7.0, 1.00, 0.65, 'estable',  null,  20, 1,  'verdura'),
      ('zanahoria',            3.5, 0.50, 0.60, 'estable',  null,  10, 1,  'verdura'),
      ('calabacita',           3.5, 0.50, 0.62, 'estable',  null,   5, 1,  'verdura'),
      ('chayote',              2.5, 0.50, 0.60, 'estable',  null,  10, 1,  'verdura'),
      ('chile-serrano',        1.8, 0.25, 0.60, 'chile',    null,   7, 1,  'verdura'),
      ('chile-jalapeno',       1.2, 0.25, 0.60, 'chile',    null,   7, 1,  'verdura'),
      ('chile-poblano',        1.8, 0.50, 0.62, 'chile',    null,   6, 1,  'verdura'),
      ('limon-con-semilla',    5.5, 0.50, 0.60, 'limon',    null,  10, 1,  'verdura'),
      ('aguacate',             5.5, 0.50, 0.66, 'aguacate', null,   5, 1,  'verdura'),
      ('nopal',                2.5, 0.50, 0.55, 'estable',  null,   3, 1,  'verdura'),
      ('pepino',               2.5, 0.50, 0.60, 'estable',  null,   7, 1,  'verdura'),
      ('brocoli',              1.8, 0.50, 0.62, 'estable',  null,   5, 1,  'verdura'),
      ('cilantro',            13.0, 1,    0.50, 'estable',  null,   3, 12, 'hierba'),
      ('epazote',              3.5, 1,    0.50, 'estable',  null,   3, 12, 'hierba'),
      ('ajo',                  7.0, 2,    0.55, 'estable',  null,  30, 10, 'verdura'),
      ('lechuga-romana',       5.0, 1,    0.58, 'estable',  null,   3, 6,  'verdura'),
      ('elote',                7.0, 3,    0.55, 'estable',  'elote', 3, 10, 'verdura'),
      -- Frutas
      ('platano-tabasco',      7.0, 1.00, 0.60, 'platano',  null,   5, 1,  'fruta'),
      ('manzana-roja',         3.5, 1.00, 0.65, 'fruta',    null,  15, 1,  'fruta'),
      ('naranja-para-jugo',   10.0, 2.00, 0.58, 'naranja',  'naranja', 12, 1, 'fruta'),
      ('papaya-maradol',       3.5, 1.50, 0.60, 'fruta',    null,   4, 1,  'fruta'),
      ('mango-ataulfo',        3.0, 1.00, 0.60, 'mango',    'mango',   5, 1, 'fruta'),
      ('guayaba',              2.0, 1.00, 0.60, 'guayaba',  'guayaba', 6, 1, 'fruta'),
      ('sandia',               4.5, 2.00, 0.55, 'sandia',   'sandia',  7, 1, 'fruta')
    ) as v(code, daily, line, ratio, curve_key, season_key, life, pack, grp)
    join (values
      ('pollo',    '{0.90,0.91,0.92,0.93,0.95,1.00,1.00,1.00}'::numeric[]),
      ('huevo',    '{0.86,0.88,0.90,0.95,0.97,0.99,1.00,1.00}'),
      ('abarrote', '{0.95,0.95,0.96,0.97,0.98,1.00,1.00,1.00}'),
      ('jitomate', '{0.80,1.05,1.45,1.30,1.05,0.95,1.00,1.00}'),
      ('tomate',   '{0.90,1.00,1.20,1.25,1.00,0.95,1.00,1.00}'),
      ('cebolla',  '{0.92,0.93,0.95,0.97,0.98,0.99,1.00,1.00}'),
      ('estable',  '{0.96,0.97,0.98,0.98,0.99,0.99,1.00,1.00}'),
      ('chile',    '{1.00,1.15,1.35,1.10,0.90,0.95,1.00,1.00}'),
      ('limon',    '{1.60,1.40,1.05,0.90,0.92,0.95,1.00,1.00}'),
      ('aguacate', '{0.95,1.00,1.15,1.30,1.25,1.05,1.00,1.00}'),
      ('platano',  '{0.94,0.95,0.97,0.98,0.99,1.00,1.00,1.00}'),
      ('fruta',    '{0.95,0.96,0.97,0.98,0.99,1.00,1.00,1.00}'),
      ('naranja',  '{0.90,0.95,1.05,1.15,1.10,1.00,1.00,1.00}'),
      ('mango',    '{1.10,0.85,0.80,0.95,1.20,1.20,1.20,1.20}'),
      ('guayaba',  '{1.30,1.30,1.20,1.15,1.10,0.95,1.00,1.00}'),
      ('sandia',   '{1.00,0.85,0.80,0.85,0.95,1.05,1.00,1.00}')
    ) as c(key, curve) on c.key = v.curve_key
    left join (values
      ('secos',   '{0.80,0.80,0.80,0.80,1.10,1.30,1.50,1.50}'::numeric[]),
      ('elote',   '{0.60,0.90,1.30,1.40,1.20,0.80,0.60,0.60}'),
      ('naranja', '{0.90,0.80,0.80,0.80,0.90,1.00,1.20,1.30}'),
      ('mango',   '{1.20,1.40,1.30,0.90,0.40,0,0,0}'),
      ('guayaba', '{0.30,0.30,0.30,0.40,0.70,1.20,1.50,1.50}'),
      ('sandia',  '{1.20,1.50,1.40,1.10,0.70,0.40,0.30,0.30}')
    ) as s(key, season) on s.key = v.season_key;

  -- The shop's own rows. Today's shelf price is the shop's price list: what the
  -- import wrote, or what the owner changed it to.
  update _dp p
     set variant_id = pv.id, factor = u.factor_to_base, unit_code = pv.sell_unit_code,
         purchase_unit = pv.purchase_unit_code, tax = pv.tax_rate,
         sell_now = pl.price_per_base * u.factor_to_base
    from public.product_variant pv
    join public.unit u on u.code = pv.sell_unit_code
    left join lateral (
      select x.price_per_base from public.price_list x
       where x.workspace_id = v_ws and x.variant_id = pv.id
         and (x.location_id is null or x.location_id = v_loc) and x.effective_to is null
       order by (x.location_id is not null) desc, x.effective_from desc limit 1) pl on true
   where pv.workspace_id = v_ws and pv.template_code = p.code;

  select count(*) into v_n from _dp where variant_id is null or sell_now is null;
  if v_n > 0 then
    raise exception 'demo: % product(s) missing from the shop or without a price: %', v_n,
      (select string_agg(code, ', ') from _dp where variant_id is null or sell_now is null);
  end if;

  if exists (select 1 from _dp where tax <> 0) then
    raise exception 'demo: every product here is 0%% IVA — % is not',
      (select string_agg(code, ', ') from _dp where tax <> 0);
  end if;

  update _dp set cost_step = case when grp = 'pollo' then 0.10
                                  when unit_code = 'kg' and sell_now >= 100 then 1.00
                                  when unit_code = 'kg' then 0.50
                                  else 0.10 end;

  -- Who brings what. dows: ISO weekdays (1 = Monday). frac: null = top the shelf
  -- up to the next delivery; a number = buy that share of the day's demand.
  create temp table _sup (
    code text, prov text, dows integer[], from_d date, to_d date,
    factor numeric, curve numeric[], hour numeric, by_emp boolean, frac numeric
  ) on commit drop;

  -- Chicken: El Rancho every morning but Sunday. From August, El Güero takes the
  -- three big cuts on Tuesday, Thursday and Saturday — cheaper after September.
  insert into _sup
  select p.code, 'Avícola El Rancho', '{1,2,3,4,5,6}', c_start, date '2026-08-02', 1, null, 7.0, false, null
    from _dp p where p.grp = 'pollo';
  insert into _sup
  select p.code, 'Avícola El Rancho',
         case when p.code in ('pollo-entero','pierna-con-muslo','pechuga-entera')
              then '{1,3,5}'::integer[] else '{1,2,3,4,5,6}' end,
         date '2026-08-03', date '2099-12-31', 1, null, 7.0, false, null
    from _dp p where p.grp = 'pollo';
  insert into _sup
  select p.code, 'Pollos El Güero', '{2,4,6}', date '2026-08-03', date '2099-12-31', 1,
         '{0.90,0.90,0.90,0.91,0.92,0.95,0.95,0.95}', 7.5, false, null
    from _dp p where p.code in ('pollo-entero','pierna-con-muslo','pechuga-entera');
  insert into _sup
  select p.code, 'Huevo La Granja', '{2,5}', c_start, date '2099-12-31', 1, null, 9.0, false, null
    from _dp p where p.grp = 'huevo';
  insert into _sup
  select p.code, 'Abarrotes y Chiles La Central', '{1}', c_start, date '2099-12-31', 1, null, 10.0, false, null
    from _dp p where p.grp in ('abarrote','seco');
  insert into _sup
  select p.code, 'Bodega Hermanos Ruiz', '{1,3,5}', c_start, date '2099-12-31', 1, null, 6.5, false, null
    from _dp p where p.grp in ('verdura','hierba');
  insert into _sup
  select p.code, 'Frutas Selectas Mendoza', '{2}', c_start, date '2099-12-31', 1, null, 7.25, false, null
    from _dp p where p.grp = 'fruta';
  insert into _sup
  select p.code, 'Frutas Selectas Mendoza', '{6}', c_start, date '2099-12-31', 1, null, 12.6, true, null
    from _dp p where p.grp = 'fruta';
  -- Saturday at the market: the busiest day's extra, at a market price.
  insert into _sup
  select p.code, '__generic__', '{6}', c_start, date '2099-12-31', 1.10, null, 9.0, false, 0.35
    from _dp p where p.code in ('jitomate-saladet','aguacate','limon-con-semilla','cilantro','chile-serrano');

  create temp table _prov (name text primary key, id uuid) on commit drop;
  insert into _prov
  select s.prov, coalesce(
           (select x.id from public.provider x where x.workspace_id = v_ws
              and x.normalized_name = public.normalize_name(s.prov)),
           case when s.prov = '__generic__' then
             (select x.id from public.provider x where x.workspace_id = v_ws and x.is_generic limit 1) end)
    from (select distinct prov from _sup) s;
  if exists (select 1 from _prov where id is null) then
    raise exception 'demo: a provider is missing';
  end if;

  -- --------------------------------------------------------------------------
  -- 6. Where to start: the beginning, or the newest sale (a top-up)
  -- --------------------------------------------------------------------------
  select max(s.occurred_at) into v_last from public.sale s where s.workspace_id = v_ws;
  v_from  := coalesce((v_last at time zone c_tz)::date, c_start);
  v_last  := coalesce(v_last, '-infinity'::timestamptz);
  v_today := least((c_until at time zone c_tz)::date, v_from + c_days - 1);

  create temp table _stock (variant_id uuid primary key, qty numeric) on commit drop;
  insert into _stock
  select p.variant_id, coalesce((select sum(bb.remaining_base) from public.batch_balance bb
                                  where bb.workspace_id = v_ws and bb.location_id = v_loc
                                    and bb.variant_id = p.variant_id), 0)
    from _dp p;

  create temp table _pl (variant_id uuid, qty_base numeric, qty_disp numeric, unit_code text,
                         unit_net numeric, line_net numeric) on commit drop;
  create temp table _ln (t integer, variant_id uuid, qty_base numeric) on commit drop;
  create temp table _tk (t integer primary key, at timestamptz, who uuid) on commit drop;
  create temp table _wl (variant_id uuid, qty_base numeric, reason public.waste_reason) on commit drop;
  create temp table _wq (variant_id uuid, reason public.waste_reason, qty_base numeric,
                         line_net numeric) on commit drop;

  -- --------------------------------------------------------------------------
  -- 7. Day by day
  -- --------------------------------------------------------------------------
  for v_day in select d::date from generate_series(v_from, v_today, interval '1 day') d
  loop
    perform setseed(((abs(hashtext('demo-polleria|' || v_day::text)) % 1999999) / 1000000.0) - 0.9999995);
    v_dow := extract(isodow from v_day)::int;
    v_open  := case when v_dow = 7 then 8.0 else 7.5 end;
    v_close := case when v_dow = 7 then 15.0 else 20.0 end;

    -- Today's shelf prices: the board changes on Mondays, ten days behind cost.
    update _dp set sell_today =
      pg_temp.step(sell_now * pg_temp.idx(curve, (v_day - (v_dow - 1)) - 10) / pg_temp.idx(curve, v_today),
                   case when unit_code = 'kg' and sell_now >= 20 then 1.00 else 0.50 end);

    -- ---- deliveries --------------------------------------------------------
    for v_prov in
      select s.prov, min(s.hour) as hour, bool_and(s.by_emp) as by_emp
        from _sup s
       where v_day between s.from_d and s.to_d
         and (v_dow = any(s.dows)
              or (v_day = c_start and s.frac is null))          -- opening stock: everybody comes
       group by s.prov
       order by min(s.hour)
    loop
      v_at := (v_day + make_interval(secs => (v_prov.hour * 3600 + random()::numeric * 1500)::int)) at time zone c_tz;
      continue when v_at > c_until;
      v_pid := (select id from _prov where name = v_prov.prov);
      continue when exists (select 1 from public.purchase x
                             where x.workspace_id = v_ws and x.provider_id = v_pid
                               and (x.occurred_at at time zone c_tz)::date = v_day);
      delete from _pl;
      insert into _pl (variant_id, qty_base, qty_disp, unit_code, unit_net, line_net)
      select q.variant_id, q.qty_disp * q.factor, q.qty_disp, q.purchase_unit,
             q.price / q.factor, round(q.qty_disp * q.price, 2)
        from (
          select distinct on (p.variant_id) p.variant_id, p.factor, p.purchase_unit,
                 -- what to buy, in whole packs
                 ceil(greatest(0,
                   case when s.frac is not null
                        then pg_temp.expect(p.daily, p.season, v_day) * c_scale * s.frac
                        else t.tgt * case p.grp when 'pollo' then 1.10 when 'abarrote' then 1.0
                                                when 'seco' then 1.0 else 1.20 end
                             - st.qty / p.factor end) / p.pack) * p.pack as qty_disp,
                 -- what it cost: today's point on the curve, give or take 1.5%
                 pg_temp.step(p.sell_now * p.ratio * s.factor
                              * pg_temp.idx(coalesce(s.curve, p.curve), v_day)
                              * (1 + (random()::numeric - 0.5) * 0.03), p.cost_step) as price,
                 pg_temp.expect(p.daily, p.season, v_day) * c_scale as today
            from _sup s
            join _dp p on p.code = s.code
            join _stock st on st.variant_id = p.variant_id
            cross join lateral (
              select coalesce(min(k), 7) as gap from generate_series(1, 7) k
               where exists (select 1 from _sup s2
                              where s2.code = s.code and s2.frac is null
                                and v_day + k between s2.from_d and s2.to_d
                                and extract(isodow from v_day + k)::int = any(s2.dows))) g
            cross join lateral (
              select sum(pg_temp.expect(p.daily, p.season, v_day + k)) * c_scale as tgt
                from generate_series(0, g.gap - 1) k) t
           where s.prov = v_prov.prov
             and v_day between s.from_d and s.to_d
             and (v_dow = any(s.dows) or (v_day = c_start and s.frac is null))
             and pg_temp.idx(p.season, v_day) > 0
           order by p.variant_id, s.hour
        ) q
       where q.qty_disp > 0 and q.qty_disp >= 0.25 * q.today;

      continue when not exists (select 1 from _pl);

      v_doc := gen_random_uuid();
      v_who := case when v_prov.by_emp and v_dow <> 3 then v_emp else v_owner end;
      insert into public.purchase
        (id, workspace_id, location_id, provider_id, occurred_at, recorded_at,
         total_net, total_tax, created_by, recorded_offline, payload_hash)
      select v_doc, v_ws, v_loc, v_pid, v_at, v_at, sum(line_net), 0, v_who, false, md5(v_doc::text)
        from _pl;
      with ins as (
        insert into public.purchase_line
          (workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display,
           qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate, expiry_date)
        select v_ws, v_loc, v_doc, variant_id, qty_base, qty_disp, unit_code, unit_net, line_net, 0, 0, null
          from _pl
        returning id, variant_id, qty_base, unit_price_net_per_base
      ), b as (
        insert into public.stock_batch
          (workspace_id, location_id, variant_id, origin, provider_id, source_purchase_line_id,
           qty_received_base, unit_cost_net_per_base, received_at, expiry_date, created_by)
        select v_ws, v_loc, ins.variant_id, 'purchase', v_pid, ins.id, ins.qty_base,
               ins.unit_price_net_per_base, v_at, null, v_who
          from ins
        returning id, variant_id, qty_received_base, unit_cost_net_per_base
      )
      insert into public.stock_movement
        (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
         unit_cost_net_per_base, purchase_id, occurred_at, recorded_at, created_by)
      select v_ws, v_loc, b.id, b.variant_id, 'purchase', b.qty_received_base,
             b.unit_cost_net_per_base, v_doc, v_at, v_at, v_who
        from b;
      update _stock st set qty = st.qty + pl.qty_base from _pl pl where pl.variant_id = st.variant_id;
      v_purchases := v_purchases + 1;
    end loop;

    -- ---- the day's tickets -------------------------------------------------
    delete from _ln; delete from _tk;
    -- every product's day, cut into customers' quantities
    insert into _ln (t, variant_id, qty_base)
    select 0, c.variant_id,
           case when c.unit_code = 'kg'
                then greatest(50, round(c.q / c.n * (0.6 + 0.8 * random()::numeric) * c.factor / 5) * 5)
                else greatest(1, round(c.q / c.n * (0.6 + 0.8 * random()::numeric))) end
      from (
        select p.variant_id, p.unit_code, p.factor, x.q,
               greatest(1, floor(x.q / p.line + random()::numeric))::int as n
          from _dp p
          cross join lateral (select pg_temp.expect(p.daily, p.season, v_day) * c_scale
                                     * (0.85 + 0.30 * random()::numeric) as q) x
         where pg_temp.idx(p.season, v_day) > 0
      ) c
      cross join lateral generate_series(1, c.n);

    select count(*) into v_nlines from _ln;
    v_T := greatest(1, round(v_nlines / c_lines_per_ticket))::int;
    update _ln set t = 1 + floor(random()::numeric * v_T)::int;

    -- when each customer came: a morning crowd and an evening one
    insert into _tk (t, at, who)
    select g.t, (v_day + make_interval(secs => (h.h * 3600)::int)) at time zone c_tz,
           case when v_dow <> 3 and (v_dow = 7 or h.h >= 12) and random()::numeric < 0.8
                then v_emp else v_owner end
      from generate_series(1, v_T) g(t)
      cross join lateral (
        select least(v_close - 0.05, greatest(v_open + 0.05,
                 case when v_dow = 7 then 11.0 + 1.6 * z.z
                      when z.m < 0.68 then 10.5 + 1.4 * z.z
                      else 17.3 + 1.3 * z.z end)) as h
          -- g.t keeps it per customer: an uncorrelated subquery is computed once
          from (select random()::numeric + 0 * g.t as m,
                       sqrt(-2 * ln(1 - random()::numeric)) * cos(2 * pi() * random())::numeric as z) z
      ) h;

    for v_tk in select * from _tk where at > v_last and at <= c_until order by at
    loop
      -- one line per product, never more than the shelf holds
      delete from _pl;
      insert into _pl (variant_id, qty_base, qty_disp, unit_code, unit_net, line_net)
      select l.variant_id, least(sum(l.qty_base), st.qty), 0, p.unit_code, 0, 0
        from _ln l join _stock st on st.variant_id = l.variant_id
        join _dp p on p.variant_id = l.variant_id
       where l.t = v_tk.t and st.qty > 0
       group by l.variant_id, st.qty, p.unit_code;
      update _pl pl
         set qty_disp = round(pl.qty_base / p.factor, 3),
             line_net = round(p.sell_today / p.factor * pl.qty_base, 2)
        from _dp p where p.variant_id = pl.variant_id;
      delete from _pl where line_net <= 0;
      update _pl set unit_net = round(line_net / qty_base, 6);
      continue when not exists (select 1 from _pl);

      v_doc := gen_random_uuid();
      insert into public.sale
        (id, workspace_id, location_id, occurred_at, recorded_at,
         total_net, total_tax, created_by, recorded_offline, payload_hash)
      select v_doc, v_ws, v_loc, v_tk.at, v_tk.at, sum(line_net), 0, v_tk.who, false, md5(v_doc::text)
        from _pl;
      insert into public.sale_line
        (workspace_id, location_id, sale_id, variant_id, qty_base, qty_display,
         qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
      select v_ws, v_loc, v_doc, variant_id, qty_base, qty_disp, unit_code, unit_net, line_net, 0, 0
        from _pl;
      for v_ln in select * from _pl loop
        for v_alloc in select * from public.allocate_fefo(v_ws, v_loc, v_ln.variant_id,
                                                           v_ln.qty_base, v_tk.who, v_tk.at)
        loop
          insert into public.stock_movement
            (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
             unit_cost_net_per_base, sale_id, occurred_at, recorded_at, created_by)
          values (v_ws, v_loc, v_alloc.batch_id, v_ln.variant_id, 'sale', -v_alloc.qty_base,
                  v_alloc.unit_cost_net_per_base, v_doc, v_tk.at, v_tk.at, v_tk.who);
        end loop;
      end loop;
      update _stock st set qty = st.qty - pl.qty_base from _pl pl where pl.variant_id = st.variant_id;
      v_sales := v_sales + 1;
    end loop;

    -- ---- closing: what goes in the bin -------------------------------------
    v_at := (v_day + make_interval(secs => ((v_close - 0.3) * 3600 + random()::numeric * 900)::int)) at time zone c_tz;
    continue when v_at > c_until;
    continue when exists (select 1 from public.waste x
                           where x.workspace_id = v_ws and (x.occurred_at at time zone c_tz)::date = v_day);
    v_who := case when v_dow <> 3 then v_emp else v_owner end;
    delete from _wl;

    -- what sat on the shelf too long (one day less in the May–June heat)
    insert into _wl (variant_id, qty_base, reason)
    select p.variant_id, o.qty * (0.75 + 0.25 * random()::numeric), 'caducado'
      from _dp p
      cross join lateral (
        select sum(bb.remaining_base) as qty
          from public.batch_balance bb
         where bb.workspace_id = v_ws and bb.location_id = v_loc and bb.variant_id = p.variant_id
           and bb.remaining_base > 0
           and (bb.received_at at time zone c_tz)::date
               <= v_day - greatest(2, p.life - case when extract(month from v_day) in (5, 6) then 1 else 0 end)
      ) o
     where p.life is not null and o.qty > 0;

    -- produce going soft between deliveries, sorted out on Monday, Wednesday,
    -- Friday and Sunday: herbs and lettuce fastest, then the ripe fruit
    if v_dow in (1, 3, 5, 7) then
      -- only what is worth writing down: 300 g or two pieces, the eight biggest
      insert into _wl (variant_id, qty_base, reason)
      select r.variant_id, r.q, 'caducado'
        from (
          select p.variant_id, p.unit_code, p.sell_today, p.factor,
                 st.qty * (0.5 + random()::numeric)
                        * case when v_dow = 1 then 1 else 2 end
                        * case when extract(month from v_day) in (5, 6) then 1.4
                               when extract(month from v_day) in (7, 8) then 1.2 else 1 end
                        * case when p.code in ('cilantro','epazote','lechuga-romana','elote','nopal') then 0.08
                               when p.code in ('papaya-maradol','platano-tabasco','mango-ataulfo',
                                               'aguacate','guayaba') then 0.05
                               when p.code in ('jitomate-saladet','tomate-verde','calabacita','brocoli',
                                               'pepino','chile-serrano','chile-jalapeno','chile-poblano',
                                               'sandia') then 0.035
                               else 0.01 end as q
            from _dp p join _stock st on st.variant_id = p.variant_id
           where p.grp in ('verdura', 'fruta', 'hierba') and st.qty > 0
        ) r
       where r.q >= case when r.unit_code = 'kg' then 300 else 2 end
       order by r.q / r.factor * r.sell_today desc
       limit 8;
    end if;

    -- bruised fruit, a squashed jitomate box, a dropped tray of eggs
    insert into _wl (variant_id, qty_base, reason)
    select p.variant_id, (0.3 + random()::numeric * 0.9) * 1000, 'dañado'
      from _dp p
     where random()::numeric < case p.code when 'aguacate' then 0.10 when 'jitomate-saladet' then 0.08
                                  when 'platano-tabasco' then 0.08 when 'papaya-maradol' then 0.07
                                  else 0 end
        or (p.code = 'huevo-blanco' and v_dow = 2 and random()::numeric < 0.6);

    -- trimming chicken: Tuesday and Saturday, about 2% of what was cut since
    if v_dow in (2, 6) then
      insert into _wl (variant_id, qty_base, reason)
      select sl.variant_id, sum(sl.qty_base) * (0.015 + random()::numeric * 0.01), 'merma de preparación'
        from public.sale_line sl join public.sale s on s.id = sl.sale_id
        join _dp p on p.variant_id = sl.variant_id
       where s.workspace_id = v_ws
         and p.code in ('pollo-entero', 'pechuga-entera')
         and s.occurred_at >= ((v_day - case v_dow when 2 then 3 else 4 end)::timestamp at time zone c_tz)
         and s.occurred_at < v_at
       group by sl.variant_id;
    end if;

    -- the month-end count comes up short
    if v_day = (date_trunc('month', v_day) + interval '1 month - 1 day')::date then
      insert into _wl (variant_id, qty_base, reason)
      select p.variant_id,
             case p.code when 'aguacate' then (0.4 + random()::numeric * 0.5) * 1000
                         else 2 + floor(random()::numeric * 3) end,
             'robo o faltante'
        from _dp p where p.code in ('aguacate', 'cilantro');
    end if;

    -- round to what a person would type; one line per product and reason, and
    -- never more than the shelf holds
    delete from _wq;
    insert into _wq (variant_id, reason, qty_base)
    select r.variant_id, r.reason, greatest(0, least(r.q, r.st - (r.cum - r.q)))
      from (
        select w.variant_id, w.reason, w.q, st.qty as st,
               sum(w.q) over (partition by w.variant_id order by w.reason) as cum
          from (select w.variant_id, w.reason,
                       case when p.unit_code = 'kg' then round(sum(w.qty_base) / 10) * 10
                            else floor(sum(w.qty_base)) end as q
                  from _wl w join _dp p on p.variant_id = w.variant_id
                 group by w.variant_id, w.reason, p.unit_code) w
          join _stock st on st.variant_id = w.variant_id
      ) r;
    delete from _wq where qty_base <= 0;
    continue when not exists (select 1 from _wq);
    update _wq q set line_net = round(p.sell_today / p.factor * q.qty_base, 2)
      from _dp p where p.variant_id = q.variant_id;

    v_doc := gen_random_uuid();
    insert into public.waste
      (id, workspace_id, location_id, occurred_at, recorded_at,
       total_net, total_tax, created_by, recorded_offline, payload_hash)
    select v_doc, v_ws, v_loc, v_at, v_at, sum(line_net), 0, v_who, false, md5(v_doc::text)
      from _wq;

    for v_ln in
      select q.variant_id, q.qty_base, q.reason, q.line_net, p.factor, p.unit_code
        from _wq q join _dp p on p.variant_id = q.variant_id
    loop
      v_cost_num := 0; v_cost_qty := 0;
      for v_alloc in select * from public.allocate_fefo(v_ws, v_loc, v_ln.variant_id,
                                                         v_ln.qty_base, v_who, v_at)
      loop
        insert into public.stock_movement
          (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
           unit_cost_net_per_base, waste_id, occurred_at, recorded_at, created_by)
        values (v_ws, v_loc, v_alloc.batch_id, v_ln.variant_id, 'waste', -v_alloc.qty_base,
                v_alloc.unit_cost_net_per_base, v_doc, v_at, v_at, v_who);
        v_cost_num := v_cost_num + v_alloc.qty_base * v_alloc.unit_cost_net_per_base;
        v_cost_qty := v_cost_qty + v_alloc.qty_base;
      end loop;
      insert into public.waste_line
        (workspace_id, location_id, waste_id, variant_id, qty_base, qty_display,
         qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate,
         reason, unit_cost_net_per_base, expiry_date)
      values (v_ws, v_loc, v_doc, v_ln.variant_id, v_ln.qty_base,
              round(v_ln.qty_base / v_ln.factor, 3), v_ln.unit_code,
              round(v_ln.line_net / v_ln.qty_base, 6), v_ln.line_net, 0, 0,
              v_ln.reason, round(v_cost_num / nullif(v_cost_qty, 0), 6), null);
      update _stock set qty = qty - v_ln.qty_base where variant_id = v_ln.variant_id;
    end loop;
    v_wastes := v_wastes + 1;
  end loop;

  raise notice 'demo: shop %, from % to % — % deliveries, % sales, % write-offs',
    v_ws, v_from, v_today, v_purchases, v_sales, v_wastes;
end;
$demo$;

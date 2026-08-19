-- ============================================================================
-- 00_skeleton.sql — the skeleton a shop is recognisable from
-- ============================================================================
-- docs/PLAN.md task 1.5. Run automatically by `supabase db reset` (config.toml
-- [db.seed] sql_paths), which means CI runs it on every push: if this file
-- raises, the reset step fails and the job is red before a single suite runs.
--
-- FIRST OF SEVERAL. The seed files run in the order config.toml lists them, which
-- is the dependency order: this one builds the catalog, `10_deliveries.sql` fills
-- it (1.6a), and the consumption and reversals follow (1.6b, 1.6c). Each file owns
-- one question and asserts its own answer at the end.
--
-- WHAT THIS FILE IS: catalog, providers, locations, people, sell prices. The
-- static half of a shop — the part someone curates once and then edits rarely.
--
-- WHAT IT IS NOT: the ledger. No purchase, sale, waste, transfer, batch or
-- movement is written here. That is task 1.6, it is three months long, and every
-- unit of it is allocated through `allocate_fefo()` so the seed and `record_sale`
-- cannot diverge (docs/PLAN.md, "Decided 2026-08-17 — the seed's FEFO allocation").
-- Keep that split: the moment this file writes a movement by hand, the design
-- gate at step 2 starts being judged on data the real system never produces.
--
-- ----------------------------------------------------------------------------
-- TWO MERCHANTS, AND THAT IS THE POINT
-- ----------------------------------------------------------------------------
-- Shape fixed by the owner 2026-08-18. Merchant A has two locations, merchant B
-- has one and stays small.
--
-- B is not decoration and it is not a second customer. **A single-tenant seed
-- makes every isolation check vacuous**: a query that forgot its `workspace_id`
-- predicate returns exactly the right answer when there is only one workspace,
-- and step 2 — the design gate — is precisely where that would hide. The same
-- goes for `location_id` and merchant A's second store. 1.4 hit the small version
-- of this: its performance fixture was single-tenant, so `workspace_id` selected
-- every row and the planner's choices could not be read as evidence.
--
-- So B exists to be *left out* of every answer about A, and Sucursal Mercado
-- exists to be left out of every answer about the Centro store.
--
-- ----------------------------------------------------------------------------
-- REALISM, AND WHERE IT STOPS
-- ----------------------------------------------------------------------------
-- The catalog is a real Mexican tienda's: `canasta básica` at 0% IVA and
-- everything processed at 16%, produce and meat weighed in grams but delivered by
-- the kilo, packs bought as a case and sold as singles. Those are not decoration
-- either — they are the shapes that break arithmetic (ADR-035 §2.5), and a seed
-- without them lets a unit bug reach step 5b.
--
-- Provider spread is deliberately NOT realistic: three named providers per
-- merchant plus the generic one, no long tail (owner, 2026-08-18). The minimum
-- that exercises "a price is remembered per provider and never crosses to
-- another" (§2.3), not a simulation of a supply chain.
--
-- Everything here is written as the `postgres` superuser, so RLS is not running.
-- That is correct for a seed and is exactly why it proves nothing about access —
-- the isolation claims live in supabase/tests/, under `set role authenticated`.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Refuse to run twice
-- ----------------------------------------------------------------------------
-- `supabase db reset` always hands us an empty database, so this never fires in
-- normal use. It fires when someone runs the file by hand against a database that
-- already has data — where the damage is not an error but a SECOND Tienda Doña
-- Lupe with a second catalog, which nothing downstream would flag and every count
-- in step 2 would quietly double.

do $$
begin
  if exists (select 1 from public.workspace) then
    raise exception
      '00_skeleton.sql expects an empty database (found % workspace row(s)) — run `supabase db reset`',
      (select count(*) from public.workspace)
      using errcode = 'object_not_in_prerequisite_state';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- 1. People
-- ----------------------------------------------------------------------------
-- Every document carries `created_by uuid not null references auth.users (id)`,
-- so the ledger in 1.6 cannot be written without these. Fixed uuids, because 1.6
-- and any test that reads the seed will name them.
--
-- Roles are chosen to make the access rules visible rather than uniform: A has an
-- owner, a manager and a cashier at each store. **The cashiers are the reason
-- `member_location` exists** — each is assigned to exactly one store, so a query
-- that leaks across locations shows up as a cashier seeing the other shop's
-- numbers. The manager holds both stores by role and has no `member_location`
-- row at all, which is the fail-closed rule in `my_locations()`.

insert into auth.users (id, email) values
  ('5eed0001-0000-0000-0000-000000000001', 'lupe.owner@tienda.mx'),
  ('5eed0001-0000-0000-0000-000000000002', 'rosa.gerente@tienda.mx'),
  ('5eed0001-0000-0000-0000-000000000003', 'caja.centro@tienda.mx'),
  ('5eed0001-0000-0000-0000-000000000004', 'caja.mercado@tienda.mx'),
  ('5eed0001-0000-0000-0000-000000000005', 'roble.owner@tienda.mx'),
  ('5eed0001-0000-0000-0000-000000000006', 'caja.roble@tienda.mx');


-- ----------------------------------------------------------------------------
-- 2. The two merchants
-- ----------------------------------------------------------------------------
-- Through `onboard_workspace()` and not by hand. It is the tested path, and it is
-- what writes the `workspace_setting` row and the generic provider — both easy to
-- forget and both silently wrong to omit. It also means the seed exercises the
-- same function a real signup does, so a change that breaks onboarding breaks the
-- reset too.
--
-- It generates the workspace id itself, so ids are looked up by display name
-- below rather than fixed. `_seed_ref` carries them across statements: seed.sql
-- is plain SQL with no psql meta-commands, because the CLI executes it directly
-- and `\gset` is not available.

create table public._seed_ref (k text primary key, v uuid not null);

do $$
declare
  v_a uuid;
  v_b uuid;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"5eed0001-0000-0000-0000-000000000001","role":"authenticated"}', true);
  v_a := public.onboard_workspace('Tienda Doña Lupe', true, 'Doña Lupe Centro');

  perform set_config('request.jwt.claims',
    '{"sub":"5eed0001-0000-0000-0000-000000000005","role":"authenticated"}', true);
  v_b := public.onboard_workspace('Abarrotes El Roble', true, 'El Roble');

  perform set_config('request.jwt.claims', null, true);

  insert into public._seed_ref (k, v) values ('ws_a', v_a), ('ws_b', v_b);
end;
$$;

-- `prices_include_tax` is left at true for both, which is the Mexican counter
-- reality: the sticker is what the customer pays and the RPC splits tax out of it
-- per line (ADR-035 §2.5).


-- ----------------------------------------------------------------------------
-- 3. Locations
-- ----------------------------------------------------------------------------
-- Merchant A's second store. `onboard_workspace` made the first.

insert into public.location (workspace_id, name)
select v, 'Sucursal Mercado' from public._seed_ref where k = 'ws_a';

insert into public._seed_ref (k, v)
select 'loc_a_centro', id from public.location
 where workspace_id = (select v from public._seed_ref where k = 'ws_a')
   and name = 'Doña Lupe Centro';

insert into public._seed_ref (k, v)
select 'loc_a_mercado', id from public.location
 where workspace_id = (select v from public._seed_ref where k = 'ws_a')
   and name = 'Sucursal Mercado';

insert into public._seed_ref (k, v)
select 'loc_b', id from public.location
 where workspace_id = (select v from public._seed_ref where k = 'ws_b');


-- ----------------------------------------------------------------------------
-- 4. Memberships
-- ----------------------------------------------------------------------------
-- The owners already have theirs from `onboard_workspace`.

insert into public.workspace_member (workspace_id, user_id, role)
select (select v from public._seed_ref where k = 'ws_a'), u.id, u.role::public.workspace_role
  from (values
    ('5eed0001-0000-0000-0000-000000000002'::uuid, 'manager'),
    ('5eed0001-0000-0000-0000-000000000003'::uuid, 'staff'),
    ('5eed0001-0000-0000-0000-000000000004'::uuid, 'staff')
  ) as u(id, role);

insert into public.workspace_member (workspace_id, user_id, role)
values ((select v from public._seed_ref where k = 'ws_b'),
        '5eed0001-0000-0000-0000-000000000006', 'staff');

-- Cashiers only. A manager with a member_location row would still see every
-- store — my_locations() grants them by role — but it would misrepresent the
-- rule, and someone would eventually read the seed as documentation of it.
insert into public.member_location (workspace_id, member_id, location_id)
select wm.workspace_id, wm.id,
       case wm.user_id
         when '5eed0001-0000-0000-0000-000000000003' then (select v from public._seed_ref where k = 'loc_a_centro')
         when '5eed0001-0000-0000-0000-000000000004' then (select v from public._seed_ref where k = 'loc_a_mercado')
         when '5eed0001-0000-0000-0000-000000000006' then (select v from public._seed_ref where k = 'loc_b')
       end
  from public.workspace_member wm
 where wm.user_id in ('5eed0001-0000-0000-0000-000000000003',
                      '5eed0001-0000-0000-0000-000000000004',
                      '5eed0001-0000-0000-0000-000000000006');


-- ----------------------------------------------------------------------------
-- 5. Providers
-- ----------------------------------------------------------------------------
-- Three named per merchant, plus 'Compra directa' — the generic one
-- `onboard_workspace` already created, flagged `is_generic` and not deletable.
-- It is not a dumping ground: it is there so "I bought this at the market this
-- morning" is a two-tap purchase instead of a reason to invent a fake provider
-- record (§2.3), and 1.6 should use it that way a handful of times, not hundreds.
--
-- The names differ per merchant on purpose. A provider row belongs to one
-- workspace; two merchants buying from the same real-world distributor hold two
-- unrelated rows, and price memory never crosses between them.

insert into public.provider (workspace_id, name, contact_name, phone)
select (select v from public._seed_ref where k = 'ws_a'), p.name, p.contact, p.phone
  from (values
    ('Distribuidora del Centro',   'Ing. Marta Ruiz',    '5551002030'),
    ('Refrescos y Botanas del Valle', 'Sr. Julio Peña',  '5551002031'),
    ('Lácteos La Vaquita',         'Sra. Ana Gómez',     '5551002032')
  ) as p(name, contact, phone);

insert into public.provider (workspace_id, name, contact_name, phone)
select (select v from public._seed_ref where k = 'ws_b'), p.name, p.contact, p.phone
  from (values
    ('Abarrotera del Norte',       'Sr. Beto Salas',     '8181002040'),
    ('Frutas y Verduras El Huerto','Sra. Carmen Díaz',   '8181002041'),
    ('Bebidas Regias',             'Sr. Hugo Treviño',   '8181002042')
  ) as p(name, contact, phone);


-- ----------------------------------------------------------------------------
-- 6. Families
-- ----------------------------------------------------------------------------
-- `track_expiry` and `default_lifespan_days` are set where a shop would actually
-- track them. They feed the expiry policy that fills `purchase_line.expiry_date`
-- and therefore `stock_batch.expiry_date` — which is the FEFO sort key. A catalog
-- where nothing expires would let 1.6 write three months of ledger in which FEFO
-- never has a decision to make, and `allocate_fefo()` would be exercised by the
-- seed without ever being tested by it.

insert into public.product_family (workspace_id, name, track_expiry, default_lifespan_days)
select (select v from public._seed_ref where k = 'ws_a'), f.name, f.track, f.days
  from (values
    ('Abarrotes básicos',  false, null::integer),
    ('Frutas y verduras',  true,  7),
    ('Carnes y lácteos',   true,  10),
    ('Pan y tortillas',    true,  3),
    ('Bebidas',            false, null),
    ('Botanas y dulces',   true,  120),
    ('Limpieza del hogar', false, null),
    ('Higiene personal',   false, null),
    ('Desechables',        false, null)
  ) as f(name, track, days);

insert into public.product_family (workspace_id, name, track_expiry, default_lifespan_days)
select (select v from public._seed_ref where k = 'ws_b'), f.name, f.track, f.days
  from (values
    ('Abarrotes básicos', false, null::integer),
    ('Frutas y verduras', true,  7),
    ('Bebidas',           false, null)
  ) as f(name, track, days);


-- ----------------------------------------------------------------------------
-- 7. The catalog, staged
-- ----------------------------------------------------------------------------
-- Staged first, then inserted in one statement, so that the sell price sits next
-- to the product it belongs to instead of in a second list that has to be kept in
-- the same order. `price_list` is filled from the same table further down, which
-- is what keeps a product and its price from drifting apart in this file.
--
-- THE FOUR UNIT COLUMNS MUST SHARE A DIMENSION — a trigger in 0002 enforces it,
-- because arithmetic across dimensions has no answer to give. The patterns:
--
--   packaged     base pza,  bought pza,  sold pza,  priced pza
--   weighed      base g,    bought kg,   sold g,    priced kg
--   by volume    base ml,   bought l,    sold ml,   priced l
--   a case       base pza,  bought pza,  sold pza,  priced pza, pack_size > 1
--
-- `pack_size` is NOT a unit. A case of 24 is `pack_size` 24 with both units
-- `pza` (0002). It is what makes "bought by the case, sold as singles" close
-- exactly, and it is one of the two shapes §2.5 exists for.
--
-- `sell_price_per_base` is per BASE unit, always — 30 pesos a kilo of jitomate is
-- 0.030000 here, not 30. Getting this wrong is invisible until margin is a
-- thousand times too big at step 2, which is why the assertions at the end of
-- this file check the weighed rows specifically.

create table public._seed_catalog (
  ws_key              text not null,
  family              text not null,
  name                text not null,
  base_unit           text not null,
  purchase_unit       text not null,
  sell_unit           text not null,
  price_unit          text not null,
  pack_size           numeric(14,3) not null default 1,
  tax_rate            numeric(5,4)  not null,
  sell_price_per_base numeric(14,6) not null
);


-- --- Abarrotes básicos — 0% IVA, the canasta básica ---------------------------
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Abarrotes básicos', t.name, 'pza','pza','pza','pza', t.pack, 0.0000, t.price
  from (values
    ('Arroz superextra 1 kg',            1, 32.00), ('Frijol negro 1 kg',              1, 38.00),
    ('Frijol bayo 1 kg',                 1, 39.00), ('Azúcar estándar 1 kg',           1, 28.00),
    ('Sal de mesa 1 kg',                 1, 14.00), ('Harina de trigo 1 kg',           1, 26.00),
    ('Harina de maíz nixtamalizado 1 kg',1, 24.00), ('Avena en hojuelas 1 kg',         1, 42.00),
    ('Aceite vegetal 1 l',               1, 45.00), ('Aceite vegetal 850 ml',          1, 39.00),
    ('Pasta codo 200 g',                 1,  9.50), ('Pasta sopa de letras 200 g',     1,  9.50),
    ('Pasta fideo 200 g',                1,  9.50), ('Pasta espagueti 200 g',          1, 10.50),
    ('Pasta coditos tricolor 200 g',     1, 12.00), ('Atún en agua 140 g',             1, 19.50),
    ('Atún en aceite 140 g',             1, 21.00), ('Sardina en tomate 425 g',        1, 27.00),
    ('Chiles chipotles 220 g',           1, 19.00), ('Chiles jalapeños 380 g',         1, 24.00),
    ('Puré de tomate 210 g',             1,  8.50), ('Puré de tomate 1 kg',            1, 26.00),
    ('Café soluble 200 g',               1, 92.00), ('Café molido 500 g',              1, 118.00),
    ('Té de manzanilla 25 sobres',       1, 22.00), ('Té verde 25 sobres',             1, 24.00),
    ('Consomé de pollo 200 g',           1, 31.00), ('Mayonesa 390 g',                 1, 42.00),
    ('Cátsup 370 g',                     1, 28.00), ('Mostaza 250 g',                  1, 19.00),
    ('Salsa picante 150 ml',             1, 16.00), ('Salsa verde 250 g',              1, 18.00),
    ('Vinagre blanco 500 ml',            1, 13.00), ('Miel de abeja 340 g',            1, 68.00),
    ('Mermelada de fresa 270 g',         1, 34.00), ('Mermelada de piña 270 g',        1, 34.00),
    ('Gelatina en polvo 120 g',          1,  9.00), ('Leche en polvo 400 g',           1, 78.00),
    ('Galleta de animalitos 1 kg',       1, 58.00), ('Chocolate en polvo 400 g',       1, 62.00),
    ('Lenteja 500 g',                    1, 22.00), ('Garbanzo 500 g',                 1, 24.00),
    ('Arroz 5 kg (bulto)',               1, 148.00),('Azúcar 5 kg (bulto)',            1, 132.00),
    ('Aceite 1 l caja 12 pzas',         12, 43.00)
  ) as t(name, pack, price);

-- Granel — the same staples sold by weight. Base g, bought by the kilo. These are
-- the rows that make a unit bug visible: a shop that buys a 25 kg sack and sells
-- 250 g at a time closes to zero only if the conversion holds (§2.5).
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Abarrotes básicos', t.name, 'g','kg','g','kg', 1, 0.0000, t.per_kg / 1000
  from (values
    ('Arroz a granel',    34.00), ('Frijol negro a granel', 41.00),
    ('Frijol bayo a granel', 43.00), ('Azúcar a granel',    30.00),
    ('Lenteja a granel',  46.00), ('Garbanzo a granel',     49.00),
    ('Haba a granel',     52.00), ('Alpiste a granel',      28.00),
    ('Avena a granel',    36.00), ('Chile guajillo seco',  180.00),
    ('Chile ancho seco',  195.00), ('Chile de árbol seco',  210.00)
  ) as t(name, per_kg);


-- --- Frutas y verduras — 0% IVA, weighed ------------------------------------
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Frutas y verduras', t.name, 'g','kg','g','kg', 1, 0.0000, t.per_kg / 1000
  from (values
    ('Jitomate saladet', 28.00), ('Jitomate bola',     32.00), ('Cebolla blanca',   24.00),
    ('Cebolla morada',   30.00), ('Papa blanca',       26.00), ('Papa cambray',     38.00),
    ('Zanahoria',        18.00), ('Chile serrano',     45.00), ('Chile jalapeño',   38.00),
    ('Chile poblano',    42.00), ('Chile habanero',   120.00), ('Limón',            32.00),
    ('Naranja',          18.00), ('Mandarina',         28.00), ('Manzana roja',     46.00),
    ('Manzana verde',    48.00), ('Plátano tabasco',   22.00), ('Papaya maradol',   26.00),
    ('Piña',             24.00), ('Sandía',            16.00), ('Melón',            22.00),
    ('Aguacate hass',    89.00), ('Pepino',            20.00), ('Calabaza italiana',24.00),
    ('Chayote',          19.00), ('Nopal limpio',      30.00), ('Ejote',            42.00),
    ('Betabel',          22.00), ('Jícama',            25.00), ('Camote',           23.00),
    ('Tomate verde',     30.00), ('Ajo',              140.00), ('Jengibre',         95.00),
    ('Espinaca',         48.00), ('Acelga',            36.00), ('Brócoli',          40.00),
    ('Coliflor',         34.00), ('Champiñón',         85.00)
  ) as t(name, per_kg);

-- Sold by the piece even though they are produce. A lettuce has a price, not a
-- price per kilo, and pretending otherwise is how a catalog stops matching the
-- sign taped to the crate.
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Frutas y verduras', t.name, 'pza','pza','pza','pza', t.pack, 0.0000, t.price
  from (values
    ('Lechuga romana',      1, 22.00), ('Col blanca',        1, 26.00),
    ('Elote fresco',        1, 12.00), ('Manojo de cilantro',1,  8.00),
    ('Manojo de perejil',   1,  8.00), ('Manojo de rábanos', 1, 10.00),
    ('Lechuga orejona',     1, 20.00), ('Elote caja 50 pzas',50, 10.50)
  ) as t(name, pack, price);


-- --- Carnes y lácteos — 0% IVA ----------------------------------------------
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Carnes y lácteos', t.name, 'g','kg','g','kg', 1, 0.0000, t.per_kg / 1000
  from (values
    ('Pollo entero',           78.00), ('Pechuga de pollo',       145.00),
    ('Pierna y muslo',         92.00), ('Alas de pollo',           88.00),
    ('Bistec de res',         215.00), ('Carne molida de res',    168.00),
    ('Retazo con hueso',       95.00), ('Chuleta de cerdo',       138.00),
    ('Costilla de cerdo',     152.00), ('Carne para deshebrar',   175.00),
    ('Longaniza',             118.00), ('Chorizo',                125.00),
    ('Jamón de pavo',         135.00), ('Salchicha de pavo',       88.00),
    ('Tocino',                198.00), ('Queso fresco',           142.00),
    ('Queso Oaxaca',          168.00), ('Queso manchego',         205.00),
    ('Queso panela',          138.00), ('Crema a granel',         115.00)
  ) as t(name, per_kg);

insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Carnes y lácteos', t.name, 'pza','pza','pza','pza', t.pack, 0.0000, t.price
  from (values
    ('Leche entera 1 l',            1, 26.00), ('Leche deslactosada 1 l',    1, 29.00),
    ('Leche light 1 l',             1, 27.00), ('Leche de chocolate 250 ml', 1, 12.00),
    ('Yogurt natural 1 kg',         1, 42.00), ('Yogurt bebible 250 ml',     1, 13.00),
    ('Mantequilla 90 g',            1, 24.00), ('Margarina 190 g',           1, 21.00),
    ('Crema ácida 450 ml',          1, 38.00), ('Media crema 190 g',         1, 18.00),
    ('Queso amarillo rebanado 200 g',1, 46.00),('Requesón 250 g',            1, 32.00),
    ('Huevo blanco 12 pzas',       12,  3.60), ('Huevo blanco 30 pzas',     30,  3.40),
    ('Huevo rojo 12 pzas',         12,  4.10)
  ) as t(name, pack, price);


-- --- Pan y tortillas — 0% IVA, three-day lifespan ---------------------------
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Pan y tortillas', t.name, 'g','kg','g','kg', 1, 0.0000, t.per_kg / 1000
  from (values
    ('Tortilla de maíz',    24.00), ('Tortilla de nopal',   34.00),
    ('Masa para tortilla',  18.00)
  ) as t(name, per_kg);

insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Pan y tortillas', t.name, 'pza','pza','pza','pza', t.pack, 0.0000, t.price
  from (values
    ('Tortilla de harina paquete 10 pzas', 1, 22.00), ('Bolillo',              1,  3.00),
    ('Telera',                             1,  3.50), ('Pan de caja blanco',   1, 42.00),
    ('Pan de caja integral',               1, 48.00), ('Concha',               1,  8.00),
    ('Dona glaseada',                      1, 10.00), ('Cuernito',             1,  9.00),
    ('Tostadas 20 pzas',                   1, 26.00), ('Totopos 200 g',        1, 24.00),
    ('Bolillo caja 60 pzas',              60,  2.60)
  ) as t(name, pack, price);


-- --- Bebidas — 16% IVA ------------------------------------------------------
-- Generated as flavours × presentations, which is how a real tienda catalog grows
-- and the cheapest honest way to reach a few hundred products without inventing
-- three hundred names nobody would recognise.
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Bebidas',
       'Refresco ' || s.sabor || ' ' || p.pres,
       'pza','pza','pza','pza', p.pack, 0.1600, round(p.base_price * s.mult, 2)
  from (values ('de cola',1.00),('de manzana',0.95),('de naranja',0.95),
               ('de limón',0.95),('de toronja',0.98),('de tamarindo',0.92),
               ('de uva',0.96)) as s(sabor, mult)
 cross join (values ('600 ml', 1, 20.00), ('2 l', 1, 38.00), ('2.5 l', 1, 44.00),
                    ('lata 355 ml', 1, 17.00), ('caja 12 latas', 12, 15.50)) as p(pres, pack, base_price);

insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Bebidas',
       'Jugo de ' || s.sabor || ' ' || p.pres,
       'pza','pza','pza','pza', p.pack, 0.1600, p.base_price
  from (values ('naranja'),('manzana'),('durazno'),('mango'),('uva')) as s(sabor)
 cross join (values ('1 l', 1, 28.00), ('200 ml', 1, 9.00)) as p(pres, pack, base_price);

insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Bebidas', t.name, 'pza','pza','pza','pza', t.pack, 0.1600, t.price
  from (values
    ('Agua natural 1 l',           1, 12.00), ('Agua natural 1.5 l',      1, 15.00),
    ('Agua natural 600 ml',        1,  9.00), ('Agua mineral 600 ml',     1, 16.00),
    ('Garrafón de agua 20 l',      1, 42.00), ('Cerveza clara 355 ml',    1, 22.00),
    ('Cerveza oscura 355 ml',      1, 24.00), ('Cerveza clara 940 ml',    1, 38.00),
    ('Cerveza six clara',          6, 21.00), ('Bebida energética 473 ml',1, 38.00),
    ('Bebida hidratante 600 ml',   1, 22.00), ('Té helado 600 ml',        1, 18.00),
    ('Leche de soya 1 l',          1, 34.00), ('Agua de coco 330 ml',     1, 26.00)
  ) as t(name, pack, price);


-- --- Botanas y dulces — 16% IVA, and they do expire --------------------------
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Botanas y dulces',
       'Papas fritas ' || s.sabor || ' ' || p.pres,
       'pza','pza','pza','pza', p.pack, 0.1600, p.price
  from (values ('naturales'),('adobadas'),('con jalapeño'),
               ('con queso'),('con crema y especias')) as s(sabor)
 cross join (values ('bolsa chica', 1, 16.00), ('bolsa grande', 1, 34.00),
                    ('caja 24 bolsas', 24, 14.00)) as p(pres, pack, price);

insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Botanas y dulces', t.name, 'pza','pza','pza','pza', t.pack, 0.1600, t.price
  from (values
    ('Frituras de maíz con chile',   1, 16.00), ('Frituras de maíz con limón', 1, 16.00),
    ('Frituras de harina',           1, 15.00), ('Churritos enchilados',       1, 14.00),
    ('Cacahuates salados 150 g',     1, 22.00), ('Cacahuates japoneses 150 g', 1, 24.00),
    ('Cacahuates enchilados 150 g',  1, 24.00), ('Pistaches 100 g',            1, 62.00),
    ('Galletas marías 170 g',        1, 18.00), ('Galletas saladas 141 g',     1, 17.00),
    ('Galletas de chocolate 120 g',  1, 21.00), ('Galletas de avena 120 g',    1, 20.00),
    ('Galletas rellenas de vainilla',1, 15.00), ('Galletas rellenas de fresa', 1, 15.00),
    ('Galletas de nuez 120 g',       1, 23.00), ('Barra de chocolate 40 g',    1, 18.00),
    ('Chocolate con almendra 40 g',  1, 22.00), ('Chocolate blanco 40 g',      1, 20.00),
    ('Paleta de caramelo',           1,  3.00), ('Paleta de chile',            1,  4.00),
    ('Gomitas 100 g',                1, 16.00), ('Gomitas enchiladas 100 g',   1, 18.00),
    ('Chicles 14 pzas',              1, 14.00), ('Mazapán',                    1,  6.00),
    ('Obleas con cajeta',            1,  8.00), ('Malvaviscos 150 g',          1, 19.00),
    ('Tamarindo enchilado 100 g',    1, 17.00), ('Dulce de leche 60 g',        1,  9.00),
    ('Caja de paletas 100 pzas',   100,  2.60), ('Caja de mazapán 30 pzas',   30,  5.20)
  ) as t(name, pack, price);


-- --- Limpieza del hogar — 16% IVA -------------------------------------------
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Limpieza del hogar', t.name, 'pza','pza','pza','pza', t.pack, 0.1600, t.price
  from (values
    ('Jabón de barra para ropa',      1, 16.00), ('Detergente en polvo 1 kg',   1, 48.00),
    ('Detergente en polvo 500 g',     1, 27.00), ('Detergente líquido 1 l',     1, 56.00),
    ('Cloro 1 l',                     1, 22.00), ('Cloro 950 ml',               1, 21.00),
    ('Suavizante de telas 1 l',       1, 42.00), ('Limpiador multiusos 1 l',    1, 34.00),
    ('Jabón para trastes 500 g',      1, 32.00), ('Jabón líquido para trastes 640 ml', 1, 38.00),
    ('Fibra para trastes',            1,  9.00), ('Esponja multiusos',          1, 12.00),
    ('Escoba de plástico',            1, 68.00), ('Trapeador de pabilo',        1, 78.00),
    ('Recogedor de plástico',         1, 45.00), ('Cubeta 12 l',                1, 62.00),
    ('Bolsas para basura 30 pzas',    1, 38.00), ('Papel higiénico 4 rollos',   4, 14.50),
    ('Papel higiénico 12 rollos',    12, 12.80), ('Servilletas 100 pzas',       1, 18.00),
    ('Toallas de papel 2 rollos',     2, 21.00), ('Insecticida en aerosol 400 ml', 1, 68.00),
    ('Aromatizante en aerosol 325 ml',1, 52.00), ('Limpiador de vidrios 500 ml',1, 36.00),
    ('Sarricida 1 l',                 1, 34.00), ('Detergente caja 20 pzas',   20, 25.00)
  ) as t(name, pack, price);


-- --- Higiene personal — 16% IVA ---------------------------------------------
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Higiene personal', t.name, 'pza','pza','pza','pza', t.pack, 0.1600, t.price
  from (values
    ('Shampoo sachet 15 ml',        1,  4.00), ('Shampoo 400 ml',            1, 68.00),
    ('Acondicionador 400 ml',       1, 72.00), ('Shampoo anticaspa 400 ml',  1, 82.00),
    ('Jabón de tocador',            1, 14.00), ('Jabón líquido 250 ml',      1, 46.00),
    ('Pasta dental 100 ml',         1, 38.00), ('Pasta dental 50 ml',        1, 24.00),
    ('Cepillo dental',              1, 26.00), ('Enjuague bucal 500 ml',     1, 62.00),
    ('Desodorante en barra 50 g',   1, 48.00), ('Desodorante en aerosol 150 ml', 1, 54.00),
    ('Rastrillo desechable 2 pzas', 2, 16.00), ('Crema corporal 400 ml',     1, 74.00),
    ('Toallas femeninas 10 pzas',   1, 32.00), ('Pañales etapa 3, 20 pzas',  1, 148.00),
    ('Papel facial 90 pzas',        1, 26.00), ('Algodón 50 g',              1, 18.00),
    ('Alcohol 250 ml',              1, 22.00), ('Curitas 20 pzas',           1, 28.00),
    ('Gel antibacterial 240 ml',    1, 34.00), ('Cotonetes 100 pzas',        1, 21.00),
    ('Shampoo sachet caja 50 pzas',50,  3.20)
  ) as t(name, pack, price);


-- --- Desechables — 16% IVA --------------------------------------------------
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'a', 'Desechables', t.name, 'pza','pza','pza','pza', t.pack, 0.1600, t.price
  from (values
    ('Vasos desechables 10 oz, 25 pzas', 1, 24.00), ('Platos desechables 25 pzas',  1, 32.00),
    ('Cucharas desechables 25 pzas',     1, 18.00), ('Tenedores desechables 25 pzas',1, 18.00),
    ('Servilletas para fiesta 50 pzas',  1, 22.00), ('Papel aluminio 10 m',         1, 42.00),
    ('Plástico adherente 30 m',          1, 38.00), ('Bolsas con cierre 20 pzas',   1, 34.00),
    ('Popotes 100 pzas',                 1, 16.00), ('Charolas de unicel 20 pzas',  1, 28.00),
    ('Vasos caja 40 paquetes',          40, 21.00)
  ) as t(name, pack, price);


-- --- Merchant B — deliberately small ----------------------------------------
-- B is a control, not a customer. It carries enough catalog for a cross-tenant
-- query to have something real to wrongly return, and no more. Names deliberately
-- OVERLAP with merchant A's: `product_variant_name_unique` is per workspace, and a
-- query that lost its workspace predicate should collide with a plausible twin
-- rather than silently find nothing.
insert into public._seed_catalog (ws_key, family, name, base_unit, purchase_unit, sell_unit, price_unit, pack_size, tax_rate, sell_price_per_base)
select 'b', t.fam, t.name, t.bu, t.pu, t.su, t.pru, t.pack, t.tax, t.price
  from (values
    ('Abarrotes básicos','Arroz superextra 1 kg','pza','pza','pza','pza',1::numeric,0.0000::numeric,33.00::numeric),
    ('Abarrotes básicos','Frijol negro 1 kg',    'pza','pza','pza','pza',1,0.0000,39.00),
    ('Abarrotes básicos','Azúcar estándar 1 kg', 'pza','pza','pza','pza',1,0.0000,29.00),
    ('Abarrotes básicos','Sal de mesa 1 kg',     'pza','pza','pza','pza',1,0.0000,15.00),
    ('Abarrotes básicos','Aceite vegetal 1 l',   'pza','pza','pza','pza',1,0.0000,46.00),
    ('Abarrotes básicos','Pasta codo 200 g',     'pza','pza','pza','pza',1,0.0000,10.00),
    ('Abarrotes básicos','Atún en agua 140 g',   'pza','pza','pza','pza',1,0.0000,21.00),
    ('Abarrotes básicos','Café soluble 200 g',   'pza','pza','pza','pza',1,0.0000,94.00),
    ('Abarrotes básicos','Arroz a granel',       'g','kg','g','kg',      1,0.0000, 0.035000),
    ('Abarrotes básicos','Frijol negro a granel','g','kg','g','kg',      1,0.0000, 0.042000),
    ('Abarrotes básicos','Azúcar a granel',      'g','kg','g','kg',      1,0.0000, 0.031000),
    ('Frutas y verduras','Jitomate saladet',     'g','kg','g','kg',      1,0.0000, 0.029000),
    ('Frutas y verduras','Cebolla blanca',       'g','kg','g','kg',      1,0.0000, 0.025000),
    ('Frutas y verduras','Papa blanca',          'g','kg','g','kg',      1,0.0000, 0.027000),
    ('Frutas y verduras','Limón',                'g','kg','g','kg',      1,0.0000, 0.033000),
    ('Frutas y verduras','Chile serrano',        'g','kg','g','kg',      1,0.0000, 0.046000),
    ('Frutas y verduras','Plátano tabasco',      'g','kg','g','kg',      1,0.0000, 0.023000),
    ('Frutas y verduras','Lechuga romana',       'pza','pza','pza','pza',1,0.0000,23.00),
    ('Bebidas',          'Refresco de cola 600 ml','pza','pza','pza','pza',1,0.1600,21.00),
    ('Bebidas',          'Refresco de cola 2 l', 'pza','pza','pza','pza',1,0.1600,39.00),
    ('Bebidas',          'Refresco de manzana 600 ml','pza','pza','pza','pza',1,0.1600,20.00),
    ('Bebidas',          'Agua natural 1 l',     'pza','pza','pza','pza',1,0.1600,12.50),
    ('Bebidas',          'Agua natural 600 ml',  'pza','pza','pza','pza',1,0.1600, 9.50),
    ('Bebidas',          'Cerveza clara 355 ml', 'pza','pza','pza','pza',1,0.1600,23.00),
    ('Bebidas',          'Refresco de cola caja 12 latas','pza','pza','pza','pza',12,0.1600,16.00)
  ) as t(fam, name, bu, pu, su, pru, pack, tax, price);


-- ----------------------------------------------------------------------------
-- 8. The catalog, inserted
-- ----------------------------------------------------------------------------
-- One statement, from the staging table, so the dimension trigger and the
-- per-workspace name uniqueness are exercised over every row at once.
--
-- `enforce_stock` is left null on every variant, which defers to
-- `workspace_setting.enforce_stock_default` — false. v1 RECORDS stock and does
-- not enforce it (§2.6): a sale the system thinks it cannot cover is written, not
-- blocked, because refusing it happens at a counter in front of a customer.

insert into public.product_variant
  (workspace_id, family_id, name, base_unit_code, purchase_unit_code,
   sell_unit_code, price_unit_code, pack_size, tax_rate)
select r.v, pf.id, c.name, c.base_unit, c.purchase_unit,
       c.sell_unit, c.price_unit, c.pack_size, c.tax_rate
  from public._seed_catalog c
  join public._seed_ref r      on r.k = 'ws_' || c.ws_key
  join public.product_family pf on pf.workspace_id = r.v and pf.name = c.family;


-- ----------------------------------------------------------------------------
-- 9. Sell prices
-- ----------------------------------------------------------------------------
-- CURATED, per location, `location_id is null` meaning "applies to every store"
-- (§2.3). This is the one table where a nullable `location_id` does NOT mean the
-- location-level RLS shape — copy that shape onto it and every workspace-default
-- price becomes invisible, including on the sell path (supabase/README.md).
--
-- One open-ended workspace-default row per variant. `effective_to` is null, which
-- is what "the current price" looks like; the exclusion constraint in 0002 stops a
-- second overlapping row from ever existing for the same variant and scope.

insert into public.price_list (workspace_id, variant_id, location_id, price_per_base, effective_from)
select pv.workspace_id, pv.id, null, c.sell_price_per_base, date '2026-05-18'
  from public._seed_catalog c
  join public._seed_ref r       on r.k = 'ws_' || c.ws_key
  join public.product_family pf on pf.workspace_id = r.v and pf.name = c.family
  join public.product_variant pv on pv.workspace_id = r.v and pv.family_id = pf.id
                                and pv.name = c.name;

-- A location override at Sucursal Mercado, on produce only: the market stall buys
-- fresher and charges more for it. These exist so that "the price at this store"
-- and "the workspace price" are DIFFERENT NUMBERS somewhere in the seed. If they
-- agreed everywhere, a query that ignored `location_id` entirely would return the
-- right answer and step 2 would certify it.
insert into public.price_list (workspace_id, variant_id, location_id, price_per_base, effective_from)
select pv.workspace_id, pv.id,
       (select v from public._seed_ref where k = 'loc_a_mercado'),
       round(pl.price_per_base * 1.08, 6), date '2026-05-18'
  from public.product_variant pv
  join public.product_family pf on pf.id = pv.family_id
  join public.price_list pl     on pl.variant_id = pv.id and pl.location_id is null
 where pv.workspace_id = (select v from public._seed_ref where k = 'ws_a')
   and pf.name = 'Frutas y verduras';

-- A superseded price, so the seed contains at least one variant whose price has
-- actually changed. A price history of length one is not a history, and the
-- `[)` range plus the exclusion constraint are untested by it.
update public.price_list
   set effective_from = date '2026-03-01', effective_to = date '2026-05-18',
       price_per_base = round(price_per_base * 0.92, 6)
 where id in (
   select pl.id from public.price_list pl
     join public.product_variant pv on pv.id = pl.variant_id
    where pv.workspace_id = (select v from public._seed_ref where k = 'ws_a')
      and pl.location_id is null
      and pv.name in ('Arroz superextra 1 kg', 'Aceite vegetal 1 l', 'Jitomate saladet')
 );

insert into public.price_list (workspace_id, variant_id, location_id, price_per_base, effective_from)
select pv.workspace_id, pv.id, null, c.sell_price_per_base, date '2026-05-18'
  from public._seed_catalog c
  join public._seed_ref r        on r.k = 'ws_a'
  join public.product_family pf  on pf.workspace_id = r.v and pf.name = c.family
  join public.product_variant pv on pv.workspace_id = r.v and pv.family_id = pf.id
                                and pv.name = c.name
 where c.ws_key = 'a'
   and c.name in ('Arroz superextra 1 kg', 'Aceite vegetal 1 l', 'Jitomate saladet');


-- ----------------------------------------------------------------------------
-- 10. Assertions
-- ----------------------------------------------------------------------------
-- The seed asserts itself, here, at reset time — which means CI runs these on
-- every push without anyone wiring anything up, because `db reset` fails the job
-- if this file raises.
--
-- They are not decoration. `supabase/tests/_cleanup.sql` TRUNCATEs every table
-- before the first suite, so **seed data does not survive into any test file**:
-- if the seed is not checked where it is built, it is not checked at all until
-- 1.7. The properties below are the ones 1.6 and step 2 are about to depend on,
-- and each is stated as a number rather than a shrug.

do $$
declare
  v_ws_a uuid := (select v from public._seed_ref where k = 'ws_a');
  v_ws_b uuid := (select v from public._seed_ref where k = 'ws_b');
  v_n    integer;
  v_m    integer;
begin
  -- Nothing staged may go missing on the way in. This is the assertion that
  -- catches a family name typo, which would otherwise drop rows silently: the
  -- insert is an inner join on `product_family.name`, so a mismatch loses the
  -- product rather than raising.
  select count(*) into v_n from public._seed_catalog;
  select count(*) into v_m from public.product_variant;
  if v_n <> v_m then
    raise exception 'seed: staged % catalog rows but % variants exist — an inner join dropped rows', v_n, v_m;
  end if;

  -- Two merchants, three stores, and B is genuinely smaller.
  if (select count(*) from public.workspace) <> 2 then
    raise exception 'seed: expected 2 workspaces, found %', (select count(*) from public.workspace);
  end if;
  if (select count(*) from public.location where workspace_id = v_ws_a) <> 2 then
    raise exception 'seed: merchant A must have 2 locations';
  end if;
  if (select count(*) from public.location where workspace_id = v_ws_b) <> 1 then
    raise exception 'seed: merchant B must have 1 location';
  end if;

  select count(*) into v_n from public.product_variant where workspace_id = v_ws_a;
  select count(*) into v_m from public.product_variant where workspace_id = v_ws_b;
  if v_n < 250 then
    raise exception 'seed: merchant A has only % variants, expected ~300', v_n;
  end if;
  if v_m >= v_n / 4 then
    raise exception 'seed: merchant B (% variants) is meant to be a small control against A (%)', v_m, v_n;
  end if;

  -- The shapes §2.5 exists for. Each of these is a way arithmetic breaks, and a
  -- catalog missing one lets that break reach step 5b undetected.
  select count(*) into v_n from public.product_variant
   where workspace_id = v_ws_a and base_unit_code = 'g' and purchase_unit_code = 'kg';
  if v_n < 50 then
    raise exception 'seed: only % weighed variants (base g, bought by kg) — expected the produce and meat aisles', v_n;
  end if;

  select count(*) into v_n from public.product_variant
   where workspace_id = v_ws_a and pack_size > 1;
  if v_n < 8 then
    raise exception 'seed: only % pack variants — "bought as a case, sold as singles" is untested', v_n;
  end if;

  if not exists (select 1 from public.product_variant where workspace_id = v_ws_a and tax_rate = 0)
  or not exists (select 1 from public.product_variant where workspace_id = v_ws_a and tax_rate = 0.16) then
    raise exception 'seed: merchant A must carry both 0%% and 16%% IVA products';
  end if;

  -- Every variant is sellable. A product with no current price is a product
  -- Vender cannot ring up, and 1.6 would have to invent a number for it.
  select count(*) into v_n
    from public.product_variant pv
   where not exists (
     select 1 from public.price_list pl
      where pl.variant_id = pv.id and pl.location_id is null and pl.effective_to is null);
  if v_n > 0 then
    raise exception 'seed: % variant(s) have no open workspace-default sell price', v_n;
  end if;

  -- And at least one has a real price history, plus a live location override.
  if (select count(*) from public.price_list where effective_to is not null) < 3 then
    raise exception 'seed: no superseded prices — the date range and its exclusion constraint are untested';
  end if;
  if (select count(*) from public.price_list
       where location_id = (select v from public._seed_ref where k = 'loc_a_mercado')) < 30 then
    raise exception 'seed: too few location price overrides at Sucursal Mercado';
  end if;

  -- Providers: three named plus the generic one, per merchant.
  if (select count(*) from public.provider where workspace_id = v_ws_a and not is_generic) <> 3
  or (select count(*) from public.provider where workspace_id = v_ws_b and not is_generic) <> 3 then
    raise exception 'seed: each merchant should carry exactly 3 named providers';
  end if;
  if (select count(*) from public.provider where is_generic) <> 2 then
    raise exception 'seed: exactly one generic provider per workspace is expected';
  end if;

  -- Access shape: cashiers pinned to one store each, managers pinned to none.
  if (select count(*) from public.member_location) <> 3 then
    raise exception 'seed: expected exactly 3 member_location rows — the three cashiers';
  end if;
  if exists (
    select 1 from public.member_location ml
      join public.workspace_member wm on wm.id = ml.member_id
     where wm.role <> 'staff') then
    raise exception 'seed: only staff should hold member_location rows — managers get every store by role';
  end if;

  -- THE LEDGER IS NOT THIS FILE'S JOB, and it still is not, now that later seed
  -- files write one. This assertion runs BEFORE they do — it is scoped to the moment
  -- the skeleton finishes, which is exactly what makes it survive the split. If it
  -- fails, a delivery has been written into the catalog file, and the FEFO-allocation
  -- decision that keeps the seed and `record_sale` from diverging is being bypassed.
  if exists (select 1 from public.stock_movement)
  or exists (select 1 from public.stock_batch)
  or exists (select 1 from public.purchase)
  or exists (select 1 from public.sale)
  or exists (select 1 from public.waste) then
    raise exception '00_skeleton: the catalog file writes no ledger — deliveries belong to 10_deliveries.sql (1.6a)';
  end if;

  raise notice 'seed: % variants for %, % for % — % locations, % providers, % price rows',
    (select count(*) from public.product_variant where workspace_id = v_ws_a),
    (select display_name from public.workspace where id = v_ws_a),
    (select count(*) from public.product_variant where workspace_id = v_ws_b),
    (select display_name from public.workspace where id = v_ws_b),
    (select count(*) from public.location),
    (select count(*) from public.provider),
    (select count(*) from public.price_list);
end;
$$;


-- ----------------------------------------------------------------------------
-- 11. Clean up the scaffolding
-- ----------------------------------------------------------------------------
-- `_seed_catalog` and `_seed_ref` are build scaffolding, not schema. Leaving them
-- behind would put two tables in `public` that no migration created — which is
-- exactly the drift between "what a file says" and "what the database holds" that
-- ADR-035 §9 exists to prevent.
--
-- The later seed files need the same ids and look them up by name, the way section 3
-- does, rather than depending on a table that is not part of the schema. That is why
-- these are dropped here rather than at the end of the last file.

drop table public._seed_catalog;
drop table public._seed_ref;

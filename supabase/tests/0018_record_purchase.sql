-- ============================================================================
-- Behavioural verification for 0018 — record_purchase()
-- ============================================================================
-- ADR-035 §2.3, §2.4, §2.5, §2.6, §9; ADR-017. docs/PLAN.md task 4d-i.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0018_record_purchase.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `record_purchase` is the function that PUTS STOCK ON THE SHELF, and it is the
-- mirror of 0016 in the four places that matter: the tax anchor is the invoice
-- net rather than the shelf price, the default denomination is the variant's
-- PURCHASE unit rather than its sell unit, no allocator runs because a delivery
-- CREATES the lot it fills, and there is no availability check because nothing
-- is being taken out.
--
-- Three rules have no schema behind them and are the function's own — the
-- location wall, idempotency, the timestamps. 0016's falsification F1 measured
-- what that means: deleting the wall left every suite steps 1-3 shipped green.
-- Sections 1 and 8 are the equivalents for THIS function, and they are not RLS
-- tests.
--
-- A fourth rule is this function's alone and has no counterpart in 0016 at all:
-- THE PROVIDER. A sale has no counterparty row; a delivery does, and §2.3
-- derives purchase-price memory from these lines in 0008, so a document filed
-- against the wrong supplier corrupts a report rather than a total. Section 2.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING ABOUT CONCURRENCY. One connection cannot block on its own lock —
-- 4c-i's F6 and 4c-ii's W-F1 measured exactly that, twice. `record_purchase`
-- takes no allocator lock at all (section 7.9 asserts the absence), so there is
-- less to say here than there was for the sale; what remains is the idempotency
-- row lock on the header, and 3.7a's Vitest suite already names the blocking pid
-- on THIS table among its three.
--
-- ⚠️ NOTHING ABOUT `record_waste`. That is `0019`, task 4d-ii, and the question
-- of whether it gets the availability check is deliberately still open.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;

create function public.chk_raises(p_label text, p_sql text, p_expect text default null)
returns void language plpgsql as $$
declare v_state text;
begin
  execute p_sql;
  perform public.chk(p_label, false, 'no exception raised');
exception when others then
  v_state := sqlstate;
  perform public.chk(p_label,
                     p_expect is null or v_state = p_expect,
                     'sqlstate ' || v_state || coalesce(' (wanted ' || p_expect || ')', ''));
end;
$$;
grant execute on function public.chk_raises(text, text, text) to authenticated;

-- Message matching, used sparingly and for 0017's reason: sqlstate is the
-- contract and a suite that matches on prose goes red when a comma moves. The
-- exceptions here are the two refusals that TELL AN OPERATOR WHAT TO DO INSTEAD
-- — a return to the provider is a void, not a negative line — because that
-- sentence is the whole value of refusing rather than accepting.
create or replace function public.chk_message(p_label text, p_sql text, p_needles text[])
returns void language plpgsql as $$
declare v_msg text; v_missing text[];
begin
  execute p_sql;
  perform public.chk(p_label, false, 'no exception raised');
exception when others then
  v_msg := sqlerrm;
  select array_agg(x) into v_missing from unnest(p_needles) x where position(x in v_msg) = 0;
  perform public.chk(p_label, v_missing is null,
                     coalesce('missing: ' || array_to_string(v_missing, ', '), v_msg));
end;
$$;
grant execute on function public.chk_message(text, text, text[]) to authenticated;

-- ⚠️ `create or replace` IS LOAD-BEARING, and 0016 and 0017 both record why.
-- Sections 4-7 call `record_purchase` BARE because those calls are meant to
-- SUCCEED; under ON_ERROR_STOP=1 a falsification that makes one of them raise
-- kills psql where it stands, so the report never renders and the DROPs at the
-- foot of the file never run. Plain `create` would then make the next run die on
-- "function already exists" — a second, meaningless red on top of the real one.
create or replace function public._call(p_id uuid, p_loc uuid, p_prov uuid,
                             p_lines jsonb,
                             p_at timestamptz default null,
                             p_off boolean default false)
returns text language sql as $$
  select format('select public.record_purchase(%L::uuid, %L::uuid, %L::uuid, '
                '%L::jsonb, %L::timestamptz, %L::boolean)',
                p_id, p_loc, p_prov, p_lines, p_at, p_off)
$$;
grant execute on function public._call(uuid, uuid, uuid, jsonb, timestamptz, boolean)
  to authenticated;

-- One delivery line. `p_unit` and `p_expiry` are omitted from the object when
-- null, because "absent" and "null" are different payloads to a function whose
-- defaults are the point of sections 4 and 6.
create or replace function public._pl(p_variant uuid, p_qty numeric,
                             p_price numeric default 4.00,
                             p_unit text default null,
                             p_expiry date default null)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'variant_id',              p_variant,
           'qty_display',             p_qty,
           'unit_price_net_per_base', p_price,
           'qty_display_unit',        p_unit,
           'expiry_date',             p_expiry))
$$;
grant execute on function public._pl(uuid, numeric, numeric, text, date) to authenticated;


-- ---------------------------------------------------------------- fixture ----
-- TWO workspaces and THREE stores, because the two walls this file is about
-- both need somewhere to be refused FROM. Workspace A holds loc_1 and loc_2;
-- the cashier is assigned to loc_1 only, which is what makes 1.3 a real refusal
-- rather than a missing row.
--
-- THE FAMILIES ARE THE EXPIRY GRID (ADR-017), one per tier:
--   fam_track   track_expiry true,  lifespan 7    — tier 2 fires
--   fam_nolife  track_expiry true,  lifespan null — tier 2 has nothing to add
--   fam_plain   track_expiry false, lifespan 30   — tier 2 must NOT fire, and
--                                                   the lifespan is set anyway
--                                                   so that a version reading
--                                                   only the lifespan goes red
--
-- THE VARIANTS CARRY THE UNIT AND RATE GRID:
--   var_kg     base g, PURCHASE kg, sell 100g — section 4's discriminator: the
--              two denominations differ by 10x, so reading the wrong one is
--              visible rather than subtle
--   var_iva    16%, base pza  — section 5's mixed-rate document, with
--   var_zero   0%,  base pza  — its zero-rated partner (§2.5: an ordinary
--                               Mexican basket, and the cheapest fixture that
--                               can tell a per-line split from a document one)
--   var_nolife under fam_nolife, var_plain under fam_plain

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'cashier.a@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'owner.b@example.mx');

\set owner_a   '''11111111-1111-1111-1111-111111111111'''
\set cashier_a '''22222222-2222-2222-2222-222222222222'''
\set owner_b   '''33333333-3333-3333-3333-333333333333'''

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
select onboard_workspace('Tienda A') as ws_a \gset
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', false);
select onboard_workspace('Tienda B') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc_1 from location where workspace_id = :'ws_a' \gset
select id as loc_b from location where workspace_id = :'ws_b' \gset

insert into location (workspace_id, name) values (:'ws_a', 'Sucursal Norte');
select id as loc_2 from location where workspace_id = :'ws_a' and name = 'Sucursal Norte' \gset

-- The timezone is the DEFAULT, named here rather than assumed, because section
-- 6.4 asserts the local day and a suite that silently depended on a default
-- would go green for the wrong reason if 0012's default ever moved.
update location set timezone = 'America/Mexico_City' where workspace_id = :'ws_a';

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', :cashier_a, 'staff');
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1' from workspace_member wm where wm.user_id = :cashier_a;

insert into product_family (workspace_id, name, track_expiry, default_lifespan_days) values
  (:'ws_a', 'Lacteos',   true,  7),
  (:'ws_a', 'Abarrotes', true,  null),
  (:'ws_a', 'Limpieza',  false, 30);
select id as fam_track  from product_family where workspace_id=:'ws_a' and name='Lacteos'   \gset
select id as fam_nolife from product_family where workspace_id=:'ws_a' and name='Abarrotes' \gset
select id as fam_plain  from product_family where workspace_id=:'ws_a' and name='Limpieza'  \gset

insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam_track',  'Queso a granel', 'g',  'kg',  '100g','100g', 0.0000),
  (:'ws_a', :'fam_track',  'Leche entera',   'pza','pza', 'pza', 'pza',  0.0000),
  (:'ws_a', :'fam_plain',  'Jabon 16',       'pza','pza', 'pza', 'pza',  0.1600),
  (:'ws_a', :'fam_plain',  'Jabon exento',   'pza','pza', 'pza', 'pza',  0.0000),
  (:'ws_a', :'fam_nolife', 'Arroz',          'g',  'kg',  '100g','100g', 0.0000),
  (:'ws_a', :'fam_plain',  'Escoba',         'pza','pza', 'pza', 'pza',  0.0000);

select id as var_kg     from product_variant where workspace_id=:'ws_a' and name='Queso a granel' \gset
select id as var_track  from product_variant where workspace_id=:'ws_a' and name='Leche entera'   \gset
select id as var_iva    from product_variant where workspace_id=:'ws_a' and name='Jabon 16'       \gset
select id as var_zero   from product_variant where workspace_id=:'ws_a' and name='Jabon exento'   \gset
select id as var_nolife from product_variant where workspace_id=:'ws_a' and name='Arroz'          \gset
select id as var_plain  from product_variant where workspace_id=:'ws_a' and name='Escoba'         \gset

insert into product_family (workspace_id, name) values (:'ws_b', 'Ajena');
select id as fam_b from product_family where workspace_id=:'ws_b' and name='Ajena' \gset
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code) values
  (:'ws_b', :'fam_b', 'Producto ajeno', 'pza','pza','pza','pza');
select id as var_b from product_variant where workspace_id=:'ws_b' and name='Producto ajeno' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset
select id as prov_b from provider where workspace_id = :'ws_b' and is_generic \gset

insert into provider (workspace_id, name, is_active) values
  (:'ws_a', 'Proveedor retirado', false);
select id as prov_dead from provider where workspace_id=:'ws_a' and name='Proveedor retirado' \gset

-- Yesterday at 03:00 UTC, built in UTC rather than in the session's timezone so
-- the value does not depend on how psql was started. It is 21-45 hours old, so
-- always inside the 72h offline window and never in the future — and at 03:00
-- UTC the store's local day (UTC-6) is the PREVIOUS one. That gap is what makes
-- check 6.4 able to fail.
select ((date_trunc('day', now() at time zone 'UTC') - interval '21 hours')
        at time zone 'UTC') as t_night \gset


-- ================================================================= 1 ==========
-- THE LOCATION WALL — this function's own, and nothing in the schema catches
-- its absence. 0016 F1 deleted the equivalent from `record_sale` and every
-- suite steps 1-3 shipped stayed green, INCLUDING 05, which asserts the same
-- wall on reads. This is not an RLS test: the function is `security definer`,
-- so RLS is not running when any of these calls execute.
-- =============================================================================

\set p_nullloc '''aaaa0018-0000-0000-0000-000000000001'''
\set p_other   '''aaaa0018-0000-0000-0000-000000000002'''
\set p_unassn  '''aaaa0018-0000-0000-0000-000000000003'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('1.1 a NULL location is refused, and first — before the id, '
                  'the provider or the lines are looked at',
                  public._call(:p_nullloc::uuid, null, :'prov_a'::uuid,
                               jsonb_build_array(public._pl(:'var_zero'::uuid, 1))),
                  '42501');

select chk_raises('1.2 another tenant''s location is refused, though the caller '
                  'is an owner in their own',
                  public._call(:p_other::uuid, :'loc_b'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(public._pl(:'var_zero'::uuid, 1))),
                  '42501');
-- ⚠️⚠️ `commit`, NOT `rollback`, AND IT IS LOAD-BEARING. `chk_raises` records its
-- verdict by INSERTING into `public._verify`. A refusal block that ended in
-- `rollback` would throw that row away with the transaction and the check would
-- vanish from the report entirely — not fail, VANISH. The first run of this file
-- lost EIGHTEEN checks that way, including every one in sections 1, 2 and 3, and
-- reported "all 62 checks passed" without complaint. Nothing is written by the
-- calls in these blocks — that is what 1.4, 2.6, 3.12 and 10.3 assert — so there
-- is nothing for the commit to keep except the verdicts. Check 10.7 is the guard
-- that stops this recurring.
commit;

-- The cashier is a member of workspace A and assigned to loc_1. loc_2 is a real
-- store in their own tenant that they hold no assignment for — the shape the
-- owner settled in 0006: a hard refusal, no manager override, because shift
-- cover is a reassignment.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('1.3 a store in the caller''s OWN workspace that they are not '
                  'assigned to is refused — the wall is per store, not per tenant',
                  public._call(:p_unassn::uuid, :'loc_2'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(public._pl(:'var_zero'::uuid, 1))),
                  '42501');
-- `commit`, not `rollback` — see the note in section 1. The verdicts are the
-- only thing this block writes.
commit;

select chk('1.4 …and not one of the three wrote a header',
           (select count(*) from purchase
             where id in (:p_nullloc::uuid, :p_other::uuid, :p_unassn::uuid)) = 0);

select chk('1.5 …nor a lot. A refusal that opened a batch would leave stock on a '
           'shelf the caller may not touch',
           (select count(*) from stock_batch) = 0,
           format('batches=%s', (select count(*) from stock_batch)));


-- ================================================================= 2 ==========
-- THE PROVIDER — this function's alone. `record_sale` has no counterparty row
-- and therefore no equivalent to any check in this section.
-- =============================================================================

\set p_noprov   '''aaaa0018-0000-0000-0000-000000000004'''
\set p_provb    '''aaaa0018-0000-0000-0000-000000000005'''
\set p_generic  '''aaaa0018-0000-0000-0000-000000000006'''
\set p_retired  '''aaaa0018-0000-0000-0000-000000000007'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('2.1 a NULL provider is refused — a delivery has a counterparty',
                  public._call(:p_noprov::uuid, :'loc_1'::uuid, null,
                               jsonb_build_array(public._pl(:'var_zero'::uuid, 1))),
                  '22023');

-- ⚠️ `purchase_provider_fk` is composite on (provider_id, workspace_id), so the
-- schema would refuse this too — with `23503` and a constraint name. The RPC
-- refusing it FIRST, with `22023`, is what puts the two possible faults on
-- different sqlstates: a payload the operator can fix versus a database fault
-- they cannot. Asserting the code is asserting which of the two answered.
select chk_raises('2.2 another tenant''s provider is refused BY THE RPC (22023), '
                  'not by the foreign key (23503)',
                  public._call(:p_provb::uuid, :'loc_1'::uuid, :'prov_b'::uuid,
                               jsonb_build_array(public._pl(:'var_zero'::uuid, 1))),
                  '22023');
-- `commit`, not `rollback` — see the note in section 1. The verdicts are the
-- only thing this block writes.
commit;

-- The generic provider is a REAL ROW and means "bought at the market this
-- morning from an unnamed supplier" — 0004 says so on `stock_batch.provider_id`,
-- where NULL means something else entirely. A delivery with no named supplier
-- must therefore succeed, not be waved through with a null.
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:p_generic::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(public._pl(:'var_zero'::uuid, 1))) as r \gset
commit;

select chk('2.3 the GENERIC provider is accepted — it is a real row, and it is '
           'what "bought at the market" means (0004)',
           (select provider_id from purchase where id = :p_generic::uuid) = :'prov_a'::uuid);

select chk('2.4 …and the lot carries it, not a null. NULL on a batch means no '
           'purchase happened at all',
           (select provider_id from stock_batch
             where source_purchase_line_id in
                   (select id from purchase_line where purchase_id = :p_generic::uuid))
           = :'prov_a'::uuid);

-- ⚠️ DECIDED, NOT OVERLOOKED. An inactive provider is ACCEPTED. A supplier is
-- retired the day after a delivery arrives from them at least as often as the
-- day before, and a shop cannot refuse to file paperwork for stock it has
-- already put on the shelf. If this is ever to be refused it is a shop-truth
-- decision, and it belongs to the owner rather than to this file.
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:p_retired::uuid, :'loc_1'::uuid, :'prov_dead'::uuid,
                       jsonb_build_array(public._pl(:'var_zero'::uuid, 1))) as r \gset
commit;

select chk('2.5 an INACTIVE provider is accepted — a delivery already on the '
           'shelf cannot be un-received (decided in 4d-i, not overlooked)',
           (select count(*) from purchase where id = :p_retired::uuid) = 1
       and (select is_active from provider where id = :'prov_dead'::uuid) = false);

select chk('2.6 …and neither refusal in this section wrote anything',
           (select count(*) from purchase
             where id in (:p_noprov::uuid, :p_provb::uuid)) = 0);


-- ================================================================= 3 ==========
-- THE PAYLOAD. Every arm of the validation ladder, in the order the function
-- checks them. The ladder exists because the pricing query joins three tables
-- and an INNER join would silently DROP an unresolvable line — recording a
-- SHORTER delivery than arrived, which on this side of the ledger loses stock
-- the shop paid for rather than shortchanging a customer.
-- =============================================================================

\set p_bad1 '''aaaa0018-0000-0000-0000-000000000011'''
\set p_bad2 '''aaaa0018-0000-0000-0000-000000000012'''
\set p_bad3 '''aaaa0018-0000-0000-0000-000000000013'''
\set p_bad4 '''aaaa0018-0000-0000-0000-000000000014'''
\set p_bad5 '''aaaa0018-0000-0000-0000-000000000015'''
\set p_bad6 '''aaaa0018-0000-0000-0000-000000000016'''
\set p_bad7 '''aaaa0018-0000-0000-0000-000000000017'''
\set p_bad8 '''aaaa0018-0000-0000-0000-000000000018'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('3.1 a NULL id is refused — the client generates it, because it '
                  'is the idempotency key (§2.6)',
                  public._call(null, :'loc_1'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(public._pl(:'var_zero'::uuid, 1))),
                  '22023');

select chk_raises('3.2 an EMPTY line array is refused — a delivery of nothing is '
                  'not a delivery',
                  public._call(:p_bad1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                               '[]'::jsonb),
                  '22023');

select chk_raises('3.3 a lines payload that is not an array is refused',
                  public._call(:p_bad2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                               '{"variant_id":"x"}'::jsonb),
                  '22023');

select chk_raises('3.4 a line with no variant_id is refused',
                  public._call(:p_bad3::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(jsonb_build_object(
                                 'qty_display', 1, 'unit_price_net_per_base', 4.00))),
                  '22023');

select chk_raises('3.5 a line with no unit_price_net_per_base is refused — the '
                  'invoice net has no default and cannot be looked up (§2.3)',
                  public._call(:p_bad4::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(jsonb_build_object(
                                 'variant_id', :'var_zero'::uuid, 'qty_display', 1))),
                  '22023');

-- ⚠️ THE SECOND LINE IS THE BAD ONE, deliberately. A validator that stopped at
-- the first element would pass this and then drop the line in the pricing join.
select chk_raises('3.6 another tenant''s variant is refused — and it is the '
                  'SECOND line, which a first-element check would miss',
                  public._call(:p_bad5::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(public._pl(:'var_zero'::uuid, 1),
                                                 public._pl(:'var_b'::uuid, 1))),
                  '22023');

select chk_raises('3.7 a unit from ANOTHER DIMENSION is refused — converting '
                  'volume to mass is nonsense, not a user error (§2.5.2)',
                  public._call(:p_bad6::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(public._pl(:'var_kg'::uuid, 1, 4.00, 'l'))),
                  '22023');

-- The message is asserted here and in 3.9 for 0017's stated reason: these two
-- are the refusals that tell the operator what to do INSTEAD, and that sentence
-- is the entire value of refusing rather than accepting.
select chk_message('3.8 a NEGATIVE quantity is refused, and the message says a '
                   'return to the provider is a VOID',
                   public._call(:p_bad7::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                                jsonb_build_array(public._pl(:'var_zero'::uuid, -1))),
                   array['void_transaction']);

select chk_raises('3.9 a negative invoice price is refused',
                  public._call(:p_bad8::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(public._pl(:'var_zero'::uuid, 1, -4.00))),
                  '22023');

-- 0.0000004 kg is 0.0004 g, which rounds to nothing in a numeric(14,3) base
-- ledger. A line with a real price and no quantity would open a lot of nothing —
-- and 0015 would then refuse the whole transaction at COMMIT, with a message
-- about receipt completeness rather than about the line the operator keyed.
select chk_raises('3.10 a quantity that ROUNDS TO ZERO IN THE BASE UNIT is '
                  'refused here, not by 0015 at commit',
                  public._call(:p_bad1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(public._pl(:'var_kg'::uuid, 0.0000004))),
                  '22023');

-- ⚠️⚠️ THE SECOND, NARROWER GATE, AND IT FOUND A DEFECT IN 0018. `qty_display` is
-- numeric(14,3) as well as `qty_base`, so a quantity can be perfectly fine in
-- the base unit and still vanish in the denomination it was keyed in: 0.0004 kg
-- is 0.4 g, which the arm above passes. The first version of this function had
-- only that arm, and this line reached `purchase_line` and was refused by
-- `purchase_line_qty_display_agrees` with `23514` — a constraint name, where the
-- ladder exists precisely so the operator gets a sentence about the number they
-- keyed. THE SQLSTATE IS THE WHOLE ASSERTION: a check that only demanded "it
-- raises" was green against the broken version.
select chk_raises('3.11 …and a quantity that survives the base unit but ROUNDS '
                  'TO ZERO IN THE KEYED ONE is refused by the RPC (22023), not '
                  'by a CHECK constraint (23514)',
                  public._call(:p_bad2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(public._pl(:'var_kg'::uuid, 0.0004))),
                  '22023');
-- `commit`, not `rollback` — see the note in section 1. The verdicts are the
-- only thing this block writes.
commit;

select chk('3.12 not one of the refused ids reached the table',
           (select count(*) from purchase where id in (
              :p_bad1::uuid, :p_bad2::uuid, :p_bad3::uuid, :p_bad4::uuid,
              :p_bad5::uuid, :p_bad6::uuid, :p_bad7::uuid, :p_bad8::uuid)) = 0);


-- ================================================================= 4 ==========
-- THE DEFAULT DENOMINATION IS THE **PURCHASE** UNIT. This is the structural
-- difference from 0016 that is easiest to get wrong and hardest to see: reading
-- `sell_unit_code` here applies clean, prices correctly, and books a tenth of
-- the stock that arrived. `var_kg` buys in kg and sells in 100g, so the two
-- readings differ by a factor of ten.
-- =============================================================================

\set p_unit1 '''aaaa0018-0000-0000-0000-000000000021'''
\set p_unit2 '''aaaa0018-0000-0000-0000-000000000022'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- No qty_display_unit: the function must reach for the PURCHASE unit.
select record_purchase(:p_unit1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(public._pl(:'var_kg'::uuid, 2, 0.05))) as r \gset
-- An explicit unit, which must override the default.
select record_purchase(:p_unit2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(public._pl(:'var_kg'::uuid, 2, 0.05, '100g'))) as r \gset
commit;

select chk('4.1 with no unit given, 2 of "Queso a granel" is 2 KG = 2000 g — the '
           'PURCHASE unit, not the sell unit',
           (select qty_base from purchase_line where purchase_id = :p_unit1::uuid) = 2000,
           format('qty_base=%s',
                  (select qty_base from purchase_line where purchase_id = :p_unit1::uuid)));

select chk('4.2 …and the unit STORED on the line is kg, so the review screen '
           'shows back the denomination that was keyed',
           (select qty_display_unit from purchase_line where purchase_id = :p_unit1::uuid) = 'kg');

select chk('4.3 an EXPLICIT unit overrides the default — the same "2" is 200 g '
           'in 100g',
           (select qty_base from purchase_line where purchase_id = :p_unit2::uuid) = 200,
           format('qty_base=%s',
                  (select qty_base from purchase_line where purchase_id = :p_unit2::uuid)));

-- ⚠️ ANTI-VACUITY. 4.1 only means something because the sell unit would have
-- given a DIFFERENT answer. If a future catalog change made the two units equal
-- for this variant, 4.1 would pass under either reading and prove nothing.
select chk('4.4 …and the two denominations really do disagree, so 4.1 can fail',
           (select qty_base from purchase_line where purchase_id = :p_unit1::uuid)
        <> (select qty_base from purchase_line where purchase_id = :p_unit2::uuid));

select chk('4.5 the LOT received the purchase-unit quantity too — a batch that '
           'disagreed with its line would be refused by 0015, but only at commit',
           (select sb.qty_received_base from stock_batch sb
             join purchase_line pl on pl.id = sb.source_purchase_line_id
            where pl.purchase_id = :p_unit1::uuid) = 2000);


-- ================================================================= 5 ==========
-- THE MONEY — NET-FIRST, AND TAX IS THE RESIDUAL (§2.5, owner 2026-08-26):
--
--     line_net   = round(unit_net x qty_base, 2)
--     line_gross = round(line_net x (1 + rate), 2)
--     tax_amount = line_gross - line_net
--
-- The mirror of 0016, and the anchor is what differs: a supplier invoice is
-- quoted net where a shelf price is agreed gross.
-- =============================================================================

\set p_mix  '''aaaa0018-0000-0000-0000-000000000031'''
\set p_wgt  '''aaaa0018-0000-0000-0000-000000000032'''

-- ⚠️ THE MIXED-RATE DOCUMENT IS THE DISCRIMINATOR, and 4b-ii's finding is why:
-- 16% beside 0% is an ordinary Mexican basket (§2.5 — general goods 16%, most
-- unprocessed food zero-rated), and it is the CHEAPEST fixture that can tell a
-- per-line tax split from a document-level one. A single-rate document is
-- satisfied by both. Binding on this file by name.
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:p_mix::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(
                         public._pl(:'var_iva'::uuid,  7, 3.33),
                         public._pl(:'var_zero'::uuid, 5, 2.50))) as r \gset
-- A weighed decimal: 1.375 kg at 12.345678 per g would be absurd, so the price
-- is per GRAM and the quantity is the awkward one. 1375 g x 0.037 = 50.875,
-- which is a half-centavo tie and lands on rule 6's half-up rounding.
select record_purchase(:p_wgt::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(public._pl(:'var_kg'::uuid, 1.375, 0.037))) as r \gset
commit;

select chk('5.1 the mixed document''s 16% line: 7 x 3.33 = 23.31 net',
           (select line_net from purchase_line
             where purchase_id = :p_mix::uuid and variant_id = :'var_iva'::uuid) = 23.31,
           format('net=%s', (select line_net from purchase_line
             where purchase_id = :p_mix::uuid and variant_id = :'var_iva'::uuid)));

-- round(23.31 x 1.16, 2) = round(27.0396, 2) = 27.04; residual 27.04 - 23.31 = 3.73.
-- ⚠️ round(23.31 x 0.16, 2) = round(3.7296, 2) = 3.73 as well — the two spellings
-- agree HERE, which is F17's whole point, and 5.10 is where the residual form is
-- asserted as an identity rather than as a number.
select chk('5.2 …and its tax is the RESIDUAL of gross minus net: 27.04 - 23.31 = 3.73',
           (select tax_amount from purchase_line
             where purchase_id = :p_mix::uuid and variant_id = :'var_iva'::uuid) = 3.73,
           format('tax=%s', (select tax_amount from purchase_line
             where purchase_id = :p_mix::uuid and variant_id = :'var_iva'::uuid)));

select chk('5.3 the ZERO-RATED line in the SAME document carries no tax at all — '
           'which is what makes this a mixed document and not two',
           (select line_net from purchase_line
             where purchase_id = :p_mix::uuid and variant_id = :'var_zero'::uuid) = 12.50
       and (select tax_amount from purchase_line
             where purchase_id = :p_mix::uuid and variant_id = :'var_zero'::uuid) = 0.00);

-- Rule 5: the header is the SUM OF THE ROUNDED LINES, never an independent
-- computation. 23.31 + 12.50 = 35.81 net; 3.73 + 0.00 = 3.73 tax.
select chk('5.4 the header totals are the sum of the rounded lines (§2.5 rule 5)',
           (select total_net from purchase where id = :p_mix::uuid) = 35.81
       and (select total_tax from purchase where id = :p_mix::uuid) = 3.73,
           format('net=%s tax=%s',
                  (select total_net from purchase where id = :p_mix::uuid),
                  (select total_tax from purchase where id = :p_mix::uuid)));

-- ⚠️ ANTI-VACUITY, AND THE POINT OF THE MIXED RATE. A document-level split would
-- tax the whole 35.81 at ONE rate. At 16% that is 5.73, at 0% it is 0.00 —
-- neither is 3.73. The check names both wrong answers so it cannot pass by
-- coincidence.
select chk('5.5 …and a DOCUMENT-level split would have given 5.73 or 0.00, not '
           '3.73 — the mixed rate is what makes 5.4 falsifiable',
           (select total_tax from purchase where id = :p_mix::uuid)
             not in (round(35.81 * 0.16, 2), 0.00));

select chk('5.6 the weighed line rounds half-UP, not to even: 1375 x 0.037 = '
           '50.875 becomes 50.88',
           (select line_net from purchase_line where purchase_id = :p_wgt::uuid) = 50.88,
           format('net=%s',
                  (select line_net from purchase_line where purchase_id = :p_wgt::uuid)));

select chk('5.7 unit_price_net_per_base is stored AS THE INVOICE SENT IT, not '
           're-derived from the rounded line',
           (select unit_price_net_per_base from purchase_line
             where purchase_id = :p_wgt::uuid) = 0.037000,
           format('unit=%s', (select unit_price_net_per_base from purchase_line
             where purchase_id = :p_wgt::uuid)));

-- The client never sends a rate. If it could, a till could understate IVA.
select chk('5.8 tax_rate is snapshotted FROM THE VARIANT — the client never sent '
           'one, and the 16% line proves the value did not default to zero',
           (select tax_rate from purchase_line
             where purchase_id = :p_mix::uuid and variant_id = :'var_iva'::uuid) = 0.1600);

select chk('5.9 …and the header totals agree with the lines on the weighed '
           'document too, which is one line and therefore a different arithmetic',
           (select total_net from purchase where id = :p_wgt::uuid) = 50.88
       and (select total_tax from purchase where id = :p_wgt::uuid) = 0.00);

-- ⚠️ THE IDENTITY, OVER EVERY PURCHASE LINE THIS FILE HAS WRITTEN. 4b-ii's shape:
-- a per-row assertion of the rule itself rather than of a number, so a line
-- written by any call above — including ones this section never mentions — is
-- covered. `tax_amount = round(line_net x (1+rate), 2) - line_net` IS the
-- residual form, spelled out.
select chk('5.10 the residual identity holds on EVERY purchase line in the '
           'database — net + tax = round(net x (1+rate), 2), exactly',
           not exists (
             select 1 from purchase_line pl
              where pl.line_net + pl.tax_amount
                 <> round(pl.line_net * (1 + pl.tax_rate), 2)),
           format('lines=%s', (select count(*) from purchase_line)));

select chk('5.11 …and every header equals the sum of its own rounded lines',
           not exists (
             select 1 from purchase p
              join (select purchase_id, sum(line_net) n, sum(tax_amount) t
                      from purchase_line group by purchase_id) s
                on s.purchase_id = p.id
              where p.total_net <> s.n or p.total_tax <> s.t));


-- ================================================================= 6 ==========
-- EXPIRY — ADR-017's THREE TIERS. ADR-035's header carries ADR-017 forward "in
-- substance" and §2.6 points at it by name for this function:
--
--   1. the operator's date, if the line carries one          — manual wins
--   2. else the family lifespan added to the received date,
--      when the family tracks expiry                         — the automation
--   3. else null, which means NOT TRACKED and never "does not expire" (0004)
-- =============================================================================

\set p_exp1 '''aaaa0018-0000-0000-0000-000000000041'''
\set p_exp2 '''aaaa0018-0000-0000-0000-000000000042'''
\set p_exp3 '''aaaa0018-0000-0000-0000-000000000043'''
\set p_exp4 '''aaaa0018-0000-0000-0000-000000000044'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- One document, four lines, one per cell of the grid. They share a header so
-- they share a `received_at`, which is what makes tier 2's arithmetic comparable
-- across them.
--   var_track  (fam_track, lifespan 7) with a MANUAL date  -> tier 1
--   var_track                          with no date        -> tier 2
--   var_nolife (tracks, lifespan null) with no date        -> tier 3
--   var_plain  (does NOT track, lifespan 30) with a MANUAL date -> tier 1 again,
--              and this is the cell that proves tier 1 is unconditional
select record_purchase(:p_exp1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(
                         public._pl(:'var_track'::uuid,  1, 4.00, null, '2030-01-31'::date),
                         public._pl(:'var_track'::uuid,  2, 4.00),
                         public._pl(:'var_nolife'::uuid, 1, 0.05),
                         public._pl(:'var_plain'::uuid,  1, 4.00, null, '2031-06-15'::date))) as r \gset
commit;

select chk('6.1 TIER 1 — the operator''s date wins over a family lifespan of 7 days',
           (select expiry_date from purchase_line
             where purchase_id = :p_exp1::uuid and variant_id = :'var_track'::uuid
               and qty_base = 1) = '2030-01-31'::date);

select chk('6.2 TIER 2 — no manual date, so lifespan 7 is added to the received day',
           (select expiry_date from purchase_line
             where purchase_id = :p_exp1::uuid and variant_id = :'var_track'::uuid
               and qty_base = 2)
           = ((select occurred_at from purchase where id = :p_exp1::uuid)
              at time zone 'America/Mexico_City')::date + 7,
           format('got=%s', (select expiry_date from purchase_line
             where purchase_id = :p_exp1::uuid and variant_id = :'var_track'::uuid
               and qty_base = 2)));

select chk('6.3 TIER 3 — the family tracks expiry but has NO lifespan, so there '
           'is nothing to add and the answer is null, not today',
           (select expiry_date from purchase_line
             where purchase_id = :p_exp1::uuid and variant_id = :'var_nolife'::uuid) is null);

-- ⚠️ THE CELL THAT MAKES "manual > lifespan" MEAN SOMETHING. `fam_plain` does
-- NOT track expiry and carries a lifespan of 30 anyway. A version that gated
-- tier 1 behind `track_expiry` would return null here; one that ignored
-- `track_expiry` and just used the lifespan would return received + 30. Only the
-- ADR's ordering returns the operator's date.
select chk('6.4 TIER 1 IS UNCONDITIONAL — the operator''s date is kept even for a '
           'family that does not track expiry and has a lifespan set',
           (select expiry_date from purchase_line
             where purchase_id = :p_exp1::uuid and variant_id = :'var_plain'::uuid)
           = '2031-06-15'::date,
           format('got=%s', (select expiry_date from purchase_line
             where purchase_id = :p_exp1::uuid and variant_id = :'var_plain'::uuid)));

-- ⚠️ THE LOCAL DAY, AND IT IS THE ONE CASE WHERE UTC AND MEXICO CITY DISAGREE.
-- The delivery is filed OFFLINE at 03:00 UTC yesterday, which is 21:00 the day
-- before in the store's timezone. A lifespan added to the UTC day is off by one
-- for every evening delivery a shop takes. 0012 put `location.timezone` on the
-- table and 0013 established this spelling; the seed predates both and
-- hardcodes UTC, which is a fixture and not a rule.
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:p_exp2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(public._pl(:'var_track'::uuid, 1)),
                       :'t_night'::timestamptz, true) as r \gset
commit;

select chk('6.5 TIER 2 RESOLVES IN THE STORE''S LOCAL DAY — an evening delivery '
           'expires from the day the shop received it, not from the UTC day',
           (select expiry_date from purchase_line where purchase_id = :p_exp2::uuid)
           = (:'t_night'::timestamptz at time zone 'America/Mexico_City')::date + 7,
           format('got=%s local=%s',
                  (select expiry_date from purchase_line where purchase_id = :p_exp2::uuid),
                  (:'t_night'::timestamptz at time zone 'America/Mexico_City')::date + 7));

-- ⚠️ ANTI-VACUITY, and without it 6.5 is worthless: for most of the day the two
-- spellings agree and the check would pass under either. The fixture was built
-- at 03:00 UTC precisely so they cannot.
select chk('6.6 …and the UTC spelling really would have given a DIFFERENT date, '
           'so 6.5 is able to fail',
           (:'t_night'::timestamptz at time zone 'America/Mexico_City')::date
        <> (:'t_night'::timestamptz at time zone 'UTC')::date);

select chk('6.7 …and it is NOT the UTC answer that was stored',
           (select expiry_date from purchase_line where purchase_id = :p_exp2::uuid)
        <> (:'t_night'::timestamptz at time zone 'UTC')::date + 7);

-- The batch is what FEFO reads. A line that resolved expiry correctly and a lot
-- that did not would put the stock in the wrong consumption order while every
-- report about the document looked right.
select chk('6.8 THE LOT CARRIES THE SAME DATE AS ITS LINE, on all five lines '
           'above — the batch is what FEFO orders on, not the line',
           not exists (
             select 1 from stock_batch sb
              join purchase_line pl on pl.id = sb.source_purchase_line_id
             where pl.purchase_id in (:p_exp1::uuid, :p_exp2::uuid)
               and sb.expiry_date is distinct from pl.expiry_date));

select chk('6.9 …and a null expiry reached the LOT as null, so FEFO sorts it '
           'last rather than first (0004: null is not "does not expire")',
           (select sb.expiry_date from stock_batch sb
             join purchase_line pl on pl.id = sb.source_purchase_line_id
            where pl.purchase_id = :p_exp1::uuid
              and pl.variant_id = :'var_nolife'::uuid) is null);


-- ================================================================= 7 ==========
-- THE LOTS AND THE RECEIPTS — 4a's rule (0015), and the structural difference
-- from 0016. A delivery CREATES the lot it fills, so no allocator runs and no
-- `batch_balance` row is locked. What must be true is that every line opened
-- exactly one lot and that the movement filling it was written before the
-- transaction ended.
-- =============================================================================

select chk('7.1 ONE LOT PER LINE, and every one has origin = purchase',
           (select count(*) from stock_batch) = (select count(*) from purchase_line)
       and not exists (select 1 from stock_batch where origin <> 'purchase'),
           format('batches=%s lines=%s',
                  (select count(*) from stock_batch),
                  (select count(*) from purchase_line)));

select chk('7.2 …each pointing at ITS OWN line — no lot shares a source, which '
           'is what stock_batch_purchase_line_idx exists to stop',
           (select count(distinct source_purchase_line_id) from stock_batch)
         = (select count(*) from stock_batch));

select chk('7.3 …and the lot agrees with its line on location, variant and '
           'quantity. A composite FK stops the first two; the quantity is ours',
           not exists (
             select 1 from stock_batch sb
              join purchase_line pl on pl.id = sb.source_purchase_line_id
             where sb.location_id <> pl.location_id
                or sb.variant_id  <> pl.variant_id
                or sb.qty_received_base <> pl.qty_base));

-- ⚠️ 0015's RULE, ASSERTED DIRECTLY RATHER THAN TRUSTED TO FIRE. The constraint
-- is DEFERRED, so it only speaks at commit; a suite that never committed would
-- never hear it. Every call above committed, so this is the state it left.
select chk('7.4 EVERY LOT IS FULL — the live purchase movements sum to '
           'qty_received_base, which is 0015''s rule (task 4a)',
           (select count(*) from receipt_completeness_violations()) = 0,
           format('violations=%s',
                  (select count(*) from receipt_completeness_violations())));

select chk('7.5 …and the receipt movement is POSITIVE, one per lot, reason '
           'purchase — the sign is stock_movement_sign_follows_reason''s, not ours',
           (select count(*) from stock_movement where reason = 'purchase')
         = (select count(*) from stock_batch)
       and not exists (select 1 from stock_movement
                        where reason = 'purchase' and qty_base <= 0));

select chk('7.6 the shelf actually has the stock — batch_balance equals what was '
           'received, on every lot',
           not exists (
             select 1 from batch_balance bb
              join stock_batch sb on sb.id = bb.batch_id
             where bb.remaining_base <> sb.qty_received_base),
           format('lots=%s', (select count(*) from batch_balance)));

select chk('7.7 the LOT COST is the invoice''s own number — §2.9 divides revenue '
           'against this, so a rounding artefact here lands in every margin',
           not exists (
             select 1 from stock_batch sb
              join purchase_line pl on pl.id = sb.source_purchase_line_id
             where sb.unit_cost_net_per_base <> pl.unit_price_net_per_base));

select chk('7.8 …and the MOVEMENT carries the same cost, snapshotted from the lot',
           not exists (
             select 1 from stock_movement sm
              join stock_batch sb on sb.id = sm.batch_id
             where sm.reason = 'purchase'
               and sm.unit_cost_net_per_base <> sb.unit_cost_net_per_base));

-- `received_at` is the FEFO tiebreak (§2.4). One document whose lots disagreed
-- about it would order against itself the moment two of its lines were the same
-- variant — which the expiry document in section 6 actually is.
select chk('7.9 received_at equals the document''s occurred_at on every lot, so '
           'one delivery cannot order against itself under FEFO',
           not exists (
             select 1 from stock_batch sb
              join purchase_line pl on pl.id = sb.source_purchase_line_id
              join purchase p on p.id = pl.purchase_id
             where sb.received_at <> p.occurred_at));

-- ⚠️ THE ABSENCE THAT MATTERS. `record_sale` calls `allocate_fefo()`, which can
-- OPEN AN ADJUSTMENT LOT on a shortfall (branch 3) and takes row locks that
-- outlive the call. `record_purchase` does neither. An implementation that
-- reached for the allocator would still put the right quantity on the shelf and
-- would be invisible to every check above this one.
select chk('7.10 NO ALLOCATOR RAN — not one adjustment lot, and not one sale or '
           'waste movement, exists anywhere in this database',
           (select count(*) from stock_batch where origin <> 'purchase') = 0
       and (select count(*) from stock_movement where reason <> 'purchase') = 0,
           format('non-purchase lots=%s non-purchase movements=%s',
                  (select count(*) from stock_batch where origin <> 'purchase'),
                  (select count(*) from stock_movement where reason <> 'purchase')));


-- ================================================================= 8 ==========
-- IDEMPOTENCY — §2.6's four rows, over a CLIENT-generated primary key. 0016
-- settled the shape and the sqlstate; this file asserts that THIS function
-- carries it, and adds the two columns 0016 has no counterpart for.
-- =============================================================================

\set p_idem '''aaaa0018-0000-0000-0000-000000000051'''
\set p_ord  '''aaaa0018-0000-0000-0000-000000000052'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:p_idem::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(
                         public._pl(:'var_iva'::uuid,  3, 2.00),
                         public._pl(:'var_zero'::uuid, 4, 1.50))) as r1 \gset
commit;

select (:'r1'::jsonb->>'already_recorded')::boolean as r1_already \gset
select (:'r1'::jsonb->>'batch_count')::integer      as r1_batches \gset

select chk('8.1 the first call reports already_recorded = false and two lots',
           :'r1_already'::boolean = false and :'r1_batches'::integer = 2);

-- ROW 1: same id, same payload -> success, and NOTHING is written twice.
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:p_idem::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(
                         public._pl(:'var_iva'::uuid,  3, 2.00),
                         public._pl(:'var_zero'::uuid, 4, 1.50))) as r2 \gset
commit;

select chk('8.2 §2.6 row 1 — the SAME payload returns already_recorded = true',
           (:'r2'::jsonb->>'already_recorded')::boolean = true);

-- ⚠️ THE EXPENSIVE HALF OF IDEMPOTENCY ON THIS FUNCTION. A retried sale that
-- duplicated its lines would overstate a total. A retried DELIVERY that
-- duplicated its lines would open a second set of LOTS and put stock on the
-- shelf that never arrived — and 0015 would be perfectly happy, because each
-- phantom lot would have its own matching receipt.
select chk('8.3 …and it wrote NOTHING a second time: two lines, two lots, two '
           'receipts — a duplicate delivery would invent stock 0015 cannot see',
           (select count(*) from purchase_line where purchase_id = :p_idem::uuid) = 2
       and (select count(*) from stock_batch sb join purchase_line pl
                on pl.id = sb.source_purchase_line_id
             where pl.purchase_id = :p_idem::uuid) = 2
       and (select count(*) from stock_movement where purchase_id = :p_idem::uuid) = 2,
           format('lines=%s lots=%s movements=%s',
                  (select count(*) from purchase_line where purchase_id = :p_idem::uuid),
                  (select count(*) from stock_batch sb join purchase_line pl
                     on pl.id = sb.source_purchase_line_id
                    where pl.purchase_id = :p_idem::uuid),
                  (select count(*) from stock_movement where purchase_id = :p_idem::uuid)));

select chk('8.4 …and the returned totals are the STORED ones, read back rather '
           'than recomputed from the payload that was just refused entry',
           (:'r2'::jsonb->>'total_net')::numeric
           = (select total_net from purchase where id = :p_idem::uuid));

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- ROW 4: same id, DIFFERENT lines -> TD001, the one the client dead-letters.
select chk_raises('8.5 §2.6 row 4 — the same id with DIFFERENT lines raises TD001',
                  public._call(:p_idem::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(
                                 public._pl(:'var_iva'::uuid,  3, 2.00),
                                 public._pl(:'var_zero'::uuid, 9, 1.50))),
                  'TD001');

-- ⚠️ A COLUMN 0016 HAS NO COUNTERPART FOR. The same basket filed against a
-- different supplier is a different document: §2.3 derives purchase-price
-- MEMORY from these lines in 0008, so returning already_recorded here would
-- silently attribute the cost to whichever provider the client happened to send
-- first, and the report would never disagree with itself.
select chk_raises('8.6 …and so does the same id with a different PROVIDER — the '
                  'cost memory 0008 derives would otherwise name the wrong one',
                  public._call(:p_idem::uuid, :'loc_1'::uuid, :'prov_dead'::uuid,
                               jsonb_build_array(
                                 public._pl(:'var_iva'::uuid,  3, 2.00),
                                 public._pl(:'var_zero'::uuid, 4, 1.50))),
                  'TD001');

-- ⚠️ AND EXPIRY IS IN THE HASH, which the sale has nothing like. Two deliveries
-- identical but for a use-by date are two different deliveries: the lots they
-- open sort differently under FEFO and are consumed in a different order.
select chk_raises('8.7 …and a corrected EXPIRY DATE is a different payload too, '
                  'because it changes the order the stock will be consumed in',
                  public._call(:p_idem::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                               jsonb_build_array(
                                 public._pl(:'var_iva'::uuid,  3, 2.00, null, '2030-03-03'::date),
                                 public._pl(:'var_zero'::uuid, 4, 1.50))),
                  'TD001');
-- `commit`, not `rollback` — see the note in section 1. The verdicts are the
-- only thing this block writes.
commit;

-- The hash is over the NORMALISED lines and is order-independent: two devices
-- that key the same delivery in a different order agree.
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:p_idem::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(
                         public._pl(:'var_zero'::uuid, 4, 1.50),
                         public._pl(:'var_iva'::uuid,  3, 2.00))) as r3 \gset
commit;

select chk('8.8 LINE ORDER DOES NOT MATTER — the same delivery keyed in the '
           'opposite order is the same payload, not a TD001',
           (:'r3'::jsonb->>'already_recorded')::boolean = true);

-- A DIFFERENT id with an identical payload is a second delivery, not a retry.
-- The same shop really does take the same order twice in a week.
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:p_ord::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(
                         public._pl(:'var_iva'::uuid,  3, 2.00),
                         public._pl(:'var_zero'::uuid, 4, 1.50))) as r4 \gset
commit;

select chk('8.9 a DIFFERENT id with the same payload is a second delivery — the '
           'key is the id, not the basket',
           (:'r4'::jsonb->>'already_recorded')::boolean = false
       and (select count(*) from purchase
             where id in (:p_idem::uuid, :p_ord::uuid)) = 2);

select chk('8.10 …and it opened its OWN lots, so the shelf now holds both '
           'deliveries rather than one',
           (select count(*) from stock_batch sb join purchase_line pl
              on pl.id = sb.source_purchase_line_id
            where pl.purchase_id = :p_ord::uuid) = 2);


-- ================================================================= 9 ==========
-- THE TIMESTAMPS (§2.6). Online the server OVERRIDES; offline the client value
-- is accepted and CLAMPED to [now() - 72h, now()]. The clamp rejects nothing —
-- it cannot, the delivery already arrived — it only stops a wrong device clock
-- filing stock in 1970 or next year.
-- =============================================================================

\set p_on   '''aaaa0018-0000-0000-0000-000000000061'''
\set p_off  '''aaaa0018-0000-0000-0000-000000000062'''
\set p_old  '''aaaa0018-0000-0000-0000-000000000063'''
\set p_fut  '''aaaa0018-0000-0000-0000-000000000064'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- ONLINE, with a client time supplied anyway. It must be ignored.
select record_purchase(:p_on::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(public._pl(:'var_zero'::uuid, 1)),
                       now() - interval '10 days', false) as r \gset
-- OFFLINE, inside the window.
select record_purchase(:p_off::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(public._pl(:'var_zero'::uuid, 1)),
                       now() - interval '5 hours', true) as r \gset
-- OFFLINE, far too old — clamped to the floor.
select record_purchase(:p_old::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(public._pl(:'var_zero'::uuid, 1)),
                       now() - interval '400 days', true) as r \gset
-- OFFLINE, a device clock running fast — clamped to now.
select record_purchase(:p_fut::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       jsonb_build_array(public._pl(:'var_zero'::uuid, 1)),
                       now() + interval '30 days', true) as r \gset
commit;

select chk('9.1 ONLINE the server OVERRIDES the client''s occurred_at — a till '
           'that fills the field in cannot backdate its own delivery',
           (select occurred_at from purchase where id = :p_on::uuid)
             > now() - interval '1 hour',
           format('at=%s', (select occurred_at from purchase where id = :p_on::uuid)));

select chk('9.2 OFFLINE a client time inside the window is KEPT — refusing it '
           'would discard a delivery the shop has already accepted',
           (select occurred_at from purchase where id = :p_off::uuid)
             between now() - interval '5 hours 1 minute'
                 and now() - interval '4 hours 59 minutes');

select chk('9.3 OFFLINE a time older than 72h is CLAMPED to the floor, not refused',
           (select occurred_at from purchase where id = :p_old::uuid)
             between now() - interval '72 hours 1 minute'
                 and now() - interval '71 hours 59 minutes',
           format('at=%s', (select occurred_at from purchase where id = :p_old::uuid)));

select chk('9.4 OFFLINE a FUTURE time is clamped to now — a fast device clock '
           'cannot file stock that has not arrived',
           (select occurred_at from purchase where id = :p_fut::uuid) <= now());

-- `recorded_at` is the one column an offline write must NOT backdate: "when did
-- we find out" is the question audit asks, and it is always answered by the
-- server. All four rows above were written in the same moment.
select chk('9.5 recorded_at is the SERVER''S on all four, including the one '
           'backdated 72 hours — offline moves occurred_at and nothing else',
           not exists (select 1 from purchase
                        where id in (:p_on::uuid, :p_off::uuid,
                                     :p_old::uuid, :p_fut::uuid)
                          and recorded_at < now() - interval '1 hour'));

select chk('9.6 …and the offline FLAG was recorded, so a report can tell a '
           'backdated delivery from a live one',
           (select recorded_offline from purchase where id = :p_on::uuid) = false
       and (select bool_and(recorded_offline) from purchase
             where id in (:p_off::uuid, :p_old::uuid, :p_fut::uuid)) = true);

-- The lot's received_at follows occurred_at, and that is what FEFO reads. A
-- backdated delivery whose lot was stamped `now()` would sort AHEAD of stock
-- that really is older, and the shop would sell the wrong carton first.
select chk('9.7 the clamped lot''s received_at follows occurred_at, so a late '
           'flush does not jump the FEFO queue',
           (select sb.received_at from stock_batch sb
             join purchase_line pl on pl.id = sb.source_purchase_line_id
            where pl.purchase_id = :p_old::uuid)
           = (select occurred_at from purchase where id = :p_old::uuid));


-- ================================================================ 10 ==========
-- THE FILE'S OWN ANTI-VACUITY GUARD. 4b-i found two checks that were green
-- because nothing had been written for them to be green about; this section is
-- what stops that shape recurring. It asserts that the calls this file claims to
-- have made really happened, and that the refusals really refused.
-- =============================================================================

-- TWELVE PURCHASES: 2.3, 2.5, 4.1, 4.3, 5 (mixed), 5 (weighed), 6.1's four-line
-- document, 6.5's offline one, 8.1, 8.9, and section 9's four — less the three
-- of section 9 already counted. Counted, not guessed:
--   generic, retired, unit1, unit2, mix, wgt, exp1, exp2, idem, ord,
--   on, off, old, fut  =  14
select chk('10.1 the file really recorded the fourteen deliveries it then made '
           'claims about',
           (select count(*) from purchase) = 14,
           format('purchases=%s', (select count(*) from purchase)));

select chk('10.2 …and every one went through the RPC — not one has an empty hash',
           not exists (select 1 from purchase where btrim(payload_hash) = ''));

-- ⚠️ AND THE REFUSALS REALLY REFUSED. Thirteen ids were sent and rejected across
-- sections 1, 2 and 3. A `chk_raises` that went green on the WRONG exception —
-- a typo in the fixture, say — would leave this green too, which is why the
-- sqlstate is asserted at each call site as well as the absence here.
select chk('10.3 not one of the thirteen refused ids reached the table',
           (select count(*) from purchase where id in (
              :p_nullloc::uuid, :p_other::uuid, :p_unassn::uuid,
              :p_noprov::uuid, :p_provb::uuid,
              :p_bad1::uuid, :p_bad2::uuid, :p_bad3::uuid, :p_bad4::uuid,
              :p_bad5::uuid, :p_bad6::uuid, :p_bad7::uuid, :p_bad8::uuid)) = 0);

select chk('10.4 the §2.4 invariant holds over every document this file wrote — '
           'the projection agrees with the ledger on every lot',
           (select count(*) from batch_balance_violations()) = 0,
           format('violations=%s', (select count(*) from batch_balance_violations())));

select chk('10.5 …and 0015 does too: not one lot was opened without its receipt',
           (select count(*) from receipt_completeness_violations()) = 0);

-- ⚠️ THE WHOLE LEDGER SUMS. Every gram this file put on a shelf came from a
-- purchase movement, and nothing took any of it off. If the two disagree, some
-- path in 0018 wrote a movement without a lot or a lot without a movement, and
-- every per-document check above could still be green.
select chk('10.6 the shelf total equals the sum of every movement ever written — '
           'nothing was added to a balance that the ledger cannot account for',
           (select coalesce(sum(remaining_base), 0) from batch_balance)
         = (select coalesce(sum(qty_base), 0) from stock_movement),
           format('shelf=%s ledger=%s',
                  (select coalesce(sum(remaining_base), 0) from batch_balance),
                  (select coalesce(sum(qty_base), 0) from stock_movement)));

-- ⚠️⚠️ THE COUNT ITSELF, AND IT IS A FIFTH SHAPE OF VACUOUS GREEN. Every guard
-- this repository has added so far catches a check that RAN and asserted
-- nothing: a condition that is always true, a NULL that prints FAIL and hides
-- from `not passed`, a report block that never renders, a suite that dies in
-- `beforeAll`. THIS ONE IS A CHECK THAT NEVER APPEARS AT ALL — its `_verify` row
-- is rolled back with the transaction it was recorded in, and the report cannot
-- miss what was never there. The first run of this file lost eighteen checks to
-- it and said "all 62 checks passed".
--
-- The literal below is the only defence, and it is deliberately a LITERAL rather
-- than anything derived: a count computed from the file would agree with the
-- file whatever the file did. Adding a check means changing this number, which
-- is the point — it is a second place that has to know, and a check that
-- silently stops running cannot keep both of them happy.
select chk('10.7 ALL 81 CHECKS IN THIS FILE ACTUALLY RAN — a verdict rolled back '
           'with its transaction leaves no trace, and the report cannot miss '
           'what was never inserted',
           (select count(*) from public._verify) = 81,
           format('recorded=%s of 81', (select count(*) from public._verify)));

-- The helpers this file invented, removed by the file that invented them.
drop function public._call(uuid, uuid, uuid, jsonb, timestamptz, boolean);
drop function public._pl(uuid, numeric, numeric, text, date);
drop function public.chk_message(text, text, text[]);


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  -- ⚠️ `is not true`, NOT `not passed` — a NULL condition prints FAIL and is
  -- invisible to `not passed`. Found in 4b-i, and present in all six suites
  -- before it was.
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

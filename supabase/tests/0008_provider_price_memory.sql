-- ============================================================================
-- Behavioural verification for 0008 — provider price memory
-- ============================================================================
-- ADR-035 §9: a file is not evidence, a green CI run is. `supabase db reset`
-- proves only that the view compiles, and a view that compiles is a view that
-- returns SOMETHING. Everything this one is FOR — that a voided delivery stops
-- prefilling, that a price never crosses from one provider to another, that the
-- answer is the same twice running — is invisible to the reset. This file is that
-- evidence, and it runs in .github/workflows/db.yml immediately after it.
--
-- The two exclusions are the reason the file exists. A void writes a second
-- document and never touches the first (ADR-035 §2.4), so "the last purchase
-- line" gets it wrong TWICE: first by offering the cancelled document's own line,
-- and then, once that is filtered, by falling back onto the document it
-- cancelled. Each exclusion looks sufficient on its own and neither is. Checks
-- 12–19 are that argument made executable.
--
-- Run it against a DATABASE THAT WAS JUST RESET, or after supabase/tests/_cleanup.sql
-- — it writes fixture rows and cannot remove them, because purchase documents are
-- append-only by trigger.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0008_provider_price_memory.sql
--
-- The access section runs under `set local role authenticated`. Do not "simplify"
-- it away: the postgres superuser bypasses RLS, and this view's entire access
-- story is inherited RLS, so running those checks as the owner would pass
-- vacuously and prove the opposite of what they claim.
--
-- Provisional by design. ADR-035 §3 step 3 replaces it with pgTAP suites.
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


-- ---------------------------------------------------------------- fixture ----
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'staff.a1@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'manager.a@example.mx'),
  ('44444444-4444-4444-4444-444444444444', 'owner.b@example.mx');

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
select onboard_workspace('Tienda A') as ws_a \gset

select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', false);
select onboard_workspace('Tienda B') as ws_b \gset

select set_config('request.jwt.claims', null, false);

insert into location (workspace_id, name) values (:'ws_a', 'Sucursal Norte');

select id as loc_a1 from location where workspace_id = :'ws_a' and name = 'Tienda A' \gset
select id as loc_a2 from location where workspace_id = :'ws_a' and name = 'Sucursal Norte' \gset
select id as loc_b1 from location where workspace_id = :'ws_b' \gset

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', '22222222-2222-2222-2222-222222222222', 'staff'),
  (:'ws_a', '33333333-3333-3333-3333-333333333333', 'manager');

insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_a1' from workspace_member wm
 where wm.user_id = '22222222-2222-2222-2222-222222222222';

\set owner_a '''11111111-1111-1111-1111-111111111111'''
\set owner_b '''44444444-4444-4444-4444-444444444444'''

-- Two named providers in A. The generic one onboard_workspace creates is left
-- alone deliberately — it accumulates its own memory like any other provider
-- (ADR-035 §2.3) and check 11 is that it does not silently absorb anyone else's.
insert into provider (workspace_id, name) values
  (:'ws_a', 'Proveedor Uno'),
  (:'ws_a', 'Proveedor Dos'),
  (:'ws_b', 'Proveedor B');

select id as prov1    from provider where workspace_id = :'ws_a' and name = 'Proveedor Uno' \gset
select id as prov2    from provider where workspace_id = :'ws_a' and name = 'Proveedor Dos' \gset
select id as prov_gen from provider where workspace_id = :'ws_a' and is_generic \gset
select id as prov_b   from provider where workspace_id = :'ws_b' and not is_generic \gset

-- One variant per claim, so no check has to reason about another check's history.
insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes'), (:'ws_b', 'Abarrotes');
select id as fam_a from product_family where workspace_id = :'ws_a' \gset
select id as fam_b from product_family where workspace_id = :'ws_b' \gset

insert into product_variant (workspace_id, family_id, name,
       base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code, tax_rate)
values (:'ws_a', :'fam_a', 'Arroz 1kg',    'pza','pza','pza','pza', 0.16),  -- later delivery wins
       (:'ws_a', :'fam_a', 'Frijol 1kg',   'pza','pza','pza','pza', 0.16),  -- back-dated, recorded later
       (:'ws_a', :'fam_a', 'Aceite 1L',    'pza','pza','pza','pza', 0.16),  -- void falls back
       (:'ws_a', :'fam_a', 'Atun lata',    'pza','pza','pza','pza', 0.16),  -- only delivery voided
       (:'ws_a', :'fam_a', 'Azucar 1kg',   'pza','pza','pza','pza', 0.16),  -- negative line, live doc
       (:'ws_a', :'fam_a', 'Leche 1L',     'pza','pza','pza','pza', 0.16),  -- a VOIDED RETURN: positive reversal line
       (:'ws_a', :'fam_a', 'Sal 1kg',      'pza','pza','pza','pza', 0.16),  -- document-id tiebreak
       (:'ws_a', :'fam_a', 'Pan blanco',   'pza','pza','pza','pza', 0.16),  -- recorded_at tiebreak
       (:'ws_a', :'fam_a', 'Harina 1kg',   'pza','pza','pza','pza', 0.16),  -- line-id tiebreak
       (:'ws_a', :'fam_a', 'Cafe 250g',    'pza','pza','pza','pza', 0.16),  -- bought at the OTHER store
       (:'ws_a', :'fam_a', 'Chiles secos', 'pza','pza','pza','pza', 0.16),  -- one provider only
       (:'ws_a', :'fam_a', 'Galletas 200g','pza','pza','pza','pza', 0.16);  -- identical in every prefilled column
insert into product_variant (workspace_id, family_id, name,
       base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code, tax_rate)
values (:'ws_b', :'fam_b', 'Arroz 1kg',    'pza','pza','pza','pza', 0.16);

select id as var_basic  from product_variant where workspace_id = :'ws_a' and name = 'Arroz 1kg'    \gset
select id as var_back   from product_variant where workspace_id = :'ws_a' and name = 'Frijol 1kg'   \gset
select id as var_void   from product_variant where workspace_id = :'ws_a' and name = 'Aceite 1L'    \gset
select id as var_only   from product_variant where workspace_id = :'ws_a' and name = 'Atun lata'    \gset
select id as var_neg    from product_variant where workspace_id = :'ws_a' and name = 'Azucar 1kg'   \gset
select id as var_ret    from product_variant where workspace_id = :'ws_a' and name = 'Leche 1L'     \gset
select id as var_tie    from product_variant where workspace_id = :'ws_a' and name = 'Sal 1kg'      \gset
select id as var_rec    from product_variant where workspace_id = :'ws_a' and name = 'Pan blanco'   \gset
select id as var_2line  from product_variant where workspace_id = :'ws_a' and name = 'Harina 1kg'   \gset
select id as var_loc    from product_variant where workspace_id = :'ws_a' and name = 'Cafe 250g'    \gset
select id as var_p1only from product_variant where workspace_id = :'ws_a' and name = 'Chiles secos' \gset
select id as var_dup    from product_variant where workspace_id = :'ws_a' and name = 'Galletas 200g'\gset
select id as var_b      from product_variant where workspace_id = :'ws_b' \gset


-- ============================================================== documents ====
-- FIXED IDS, because two of the checks below are ABOUT id order and a
-- gen_random_uuid() would make them assert nothing at all — they would pass on
-- roughly half of all runs and nobody would know which half.
\set d_basic_old '''aaaa0008-0000-0000-0000-000000000001'''
\set d_basic_new '''aaaa0008-0000-0000-0000-000000000002'''
\set d_back_new  '''aaaa0008-0000-0000-0000-000000000011'''
\set d_back_old  '''aaaa0008-0000-0000-0000-000000000012'''
\set d_void_old  '''aaaa0008-0000-0000-0000-000000000021'''
\set d_void_new  '''aaaa0008-0000-0000-0000-000000000022'''
\set d_void_rev  '''aaaa0008-0000-0000-0000-000000000023'''
\set d_only      '''aaaa0008-0000-0000-0000-000000000031'''
\set d_only_rev  '''aaaa0008-0000-0000-0000-000000000032'''
\set d_neg       '''aaaa0008-0000-0000-0000-000000000041'''
\set d_ret_buy   '''aaaa0008-0000-0000-0000-000000000042'''
\set d_ret_ret   '''aaaa0008-0000-0000-0000-000000000043'''
\set d_ret_rev   '''aaaa0008-0000-0000-0000-000000000044'''
\set d_tie_lo    '''aaaa0008-0000-0000-0000-000000000051'''
\set d_tie_hi    '''aaaa0008-0000-0000-0000-000000000052'''
-- Inverted again, and for the same reason: the LATER-RECORDED document carries
-- the LOWER id, so recorded_at is the only key that can produce the right answer.
\set d_rec_late  '''aaaa0008-0000-0000-0000-000000000055'''
\set d_rec_early '''aaaa0008-0000-0000-0000-000000000056'''
-- Two deliveries identical in every column the view hands back. Nothing but an id
-- can separate them, which after 0010 is the only thing an id is still for.
\set d_dup_1     '''aaaa0008-0000-0000-0000-000000000057'''
\set d_dup_2     '''aaaa0008-0000-0000-0000-000000000058'''
\set d_2line     '''aaaa0008-0000-0000-0000-000000000061'''
\set d_loc       '''aaaa0008-0000-0000-0000-000000000071'''
\set d_p1only    '''aaaa0008-0000-0000-0000-000000000081'''
\set d_gen       '''aaaa0008-0000-0000-0000-000000000091'''
\set d_b         '''aaaa0008-0000-0000-0000-0000000000b1'''

-- Line ids for the two-lines-one-document check, same reasoning.
\set l_2line_lo  '''bbbb0008-0000-0000-0000-000000000001'''
\set l_2line_hi  '''bbbb0008-0000-0000-0000-000000000002'''

-- And for the tie pair, DELIBERATELY INVERTED: the line under the LOWER document
-- id carries the HIGHER line id. Left to gen_random_uuid() these two are a coin
-- flip, and check 24 passed on the toss — the document-id key was deleted from
-- the view and the whole suite stayed green. Inverted, the two keys disagree, so
-- only the document-id key can produce the documented answer.
\set l_tie_on_lo '''cccc0008-0000-0000-0000-0000000000ff'''
\set l_tie_on_hi '''cccc0008-0000-0000-0000-000000000001'''

-- The tie pair carries an EXPLICIT recorded_at as well as an explicit
-- occurred_at. recorded_at defaults to now(), and psql runs each statement in
-- its own transaction, so leaving it to the default would silently make
-- recorded_at the discriminator and the document-id key would never be reached —
-- a check that passes while testing nothing.
\set tie_at '''2026-03-01 12:00:00+00'''

insert into purchase (id, workspace_id, location_id, provider_id, occurred_at, recorded_at,
                      total_net, total_tax, reversal_of, reversal_reason, created_by, payload_hash)
values
  (:d_basic_old, :'ws_a', :'loc_a1', :'prov1', now() - interval '3 days', now(), 100, 16, null, null, :owner_a, 'h-basic-old'),
  (:d_basic_new, :'ws_a', :'loc_a1', :'prov1', now() - interval '1 day',  now(), 120, 19, null, null, :owner_a, 'h-basic-new'),

  -- Inserted newest-first on purpose: the view must order by WHEN IT HAPPENED and
  -- not by when the row landed, and an ordering bug that reads insert order would
  -- be invisible if the fixture happened to agree with it.
  (:d_back_new,  :'ws_a', :'loc_a1', :'prov1', now() - interval '1 day',  now(), 200, 32, null, null, :owner_a, 'h-back-new'),
  (:d_back_old,  :'ws_a', :'loc_a1', :'prov1', now() - interval '5 days', now(), 250, 40, null, null, :owner_a, 'h-back-old'),

  (:d_void_old,  :'ws_a', :'loc_a1', :'prov1', now() - interval '4 days', now(), 300, 48, null, null, :owner_a, 'h-void-old'),
  (:d_void_new,  :'ws_a', :'loc_a1', :'prov1', now() - interval '2 days', now(), 350, 56, null, null, :owner_a, 'h-void-new'),

  (:d_only,      :'ws_a', :'loc_a1', :'prov1', now() - interval '3 days', now(), 400, 64, null, null, :owner_a, 'h-only'),

  (:d_neg,       :'ws_a', :'loc_a1', :'prov1', now() - interval '3 days', now(), 500, 80, null, null, :owner_a, 'h-neg'),

  -- A delivery, then a RETURN TO THE SUPPLIER of the same goods. A return is an
  -- ordinary live document carrying a negative line — 0003 permits exactly that,
  -- and it is not a reversal of anything.
  (:d_ret_buy,   :'ws_a', :'loc_a1', :'prov1', now() - interval '5 days', now(), 1000, 160, null, null, :owner_a, 'h-ret-buy'),
  (:d_ret_ret,   :'ws_a', :'loc_a1', :'prov1', now() - interval '3 days', now(), -1000, -160, null, null, :owner_a, 'h-ret-ret'),

  (:d_tie_lo,    :'ws_a', :'loc_a1', :'prov1', :tie_at, :tie_at, 610, 98, null, null, :owner_a, 'h-tie-lo'),
  (:d_tie_hi,    :'ws_a', :'loc_a1', :'prov1', :tie_at, :tie_at, 600, 96, null, null, :owner_a, 'h-tie-hi'),

  -- Same instant on the shop floor, an hour apart in the system. Two deliveries
  -- can share occurred_at — it is server now() for a whole transaction — and the
  -- one entered later is the later knowledge.
  (:d_rec_early, :'ws_a', :'loc_a1', :'prov1', :tie_at, :tie_at, 410, 66, null, null, :owner_a, 'h-rec-early'),
  (:d_rec_late,  :'ws_a', :'loc_a1', :'prov1', :tie_at, timestamptz '2026-03-01 13:00:00+00', 400, 64, null, null, :owner_a, 'h-rec-late'),

  -- Identical on every key that is not an id: same instant, same recorded_at, and
  -- lines that agree on price, tax rate and denomination.
  (:d_dup_1,     :'ws_a', :'loc_a1', :'prov1', :tie_at, :tie_at, 550, 88, null, null, :owner_a, 'h-dup-1'),
  (:d_dup_2,     :'ws_a', :'loc_a1', :'prov1', :tie_at, :tie_at, 550, 88, null, null, :owner_a, 'h-dup-2'),

  (:d_2line,     :'ws_a', :'loc_a1', :'prov1', now() - interval '3 days', now(), 700, 112, null, null, :owner_a, 'h-2line'),

  -- The other store. The memory is per (provider, variant) and WORKSPACE-WIDE.
  (:d_loc,       :'ws_a', :'loc_a2', :'prov1', now() - interval '3 days', now(), 800, 128, null, null, :owner_a, 'h-loc'),

  (:d_p1only,    :'ws_a', :'loc_a1', :'prov1', now() - interval '3 days', now(), 900, 144, null, null, :owner_a, 'h-p1only'),

  -- Same variant, different provider. Its price must not reach prov1's row and
  -- prov1's must not reach it.
  (:d_gen,       :'ws_a', :'loc_a1', :'prov2', now() - interval '1 hour',  now(), 150, 24, null, null, :owner_a, 'h-prov2'),

  (:d_b,         :'ws_b', :'loc_b1', :'prov_b', now() - interval '1 hour', now(), 990, 158, null, null, :owner_b, 'h-b');

-- The two reversals, filed after their originals so the FK has something to point
-- at. A reversal carries the same workspace and location by composite FK, which
-- is what makes the `not exists` subquery inside the view safe under RLS.
insert into purchase (id, workspace_id, location_id, provider_id, occurred_at, recorded_at,
                      total_net, total_tax, reversal_of, reversal_reason, created_by, payload_hash)
values
  (:d_void_rev, :'ws_a', :'loc_a1', :'prov1', now(), now(), -350, -56, :d_void_new, 'devolucion', :owner_a, 'h-void-rev'),
  (:d_only_rev, :'ws_a', :'loc_a1', :'prov1', now(), now(), -400, -64, :d_only,     'devolucion', :owner_a, 'h-only-rev'),

  -- VOIDING THE RETURN. Its compensating line is POSITIVE, because the document it
  -- cancels was negative — and it is the most recent row for the pair. This is the
  -- one shape in which `p.reversal_of is null` is load-bearing on its own: every
  -- other reversal in this fixture is also caught by the qty_base > 0 filter, so
  -- without this document check 13 would pass with the exclusion deleted. It was
  -- added after exactly that was demonstrated.
  (:d_ret_rev,  :'ws_a', :'loc_a1', :'prov1', now(), now(), 1110, 177.60, :d_ret_ret, 'cancelacion de devolucion', :owner_a, 'h-ret-rev');

insert into purchase_line (workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display,
                           qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
values
  (:'ws_a', :'loc_a1', :d_basic_old, :'var_basic', 10, 10, 'pza', 10.000000, 100, 16.00, 0.16),
  (:'ws_a', :'loc_a1', :d_basic_new, :'var_basic', 10, 10, 'kg',  12.000000, 120, 19.20, 0.16),

  (:'ws_a', :'loc_a1', :d_back_new,  :'var_back',  10, 10, 'pza', 20.000000, 200, 32.00, 0.16),
  (:'ws_a', :'loc_a1', :d_back_old,  :'var_back',  10, 10, 'pza', 25.000000, 250, 40.00, 0.16),

  (:'ws_a', :'loc_a1', :d_void_old,  :'var_void',  10, 10, 'pza', 30.000000, 300, 48.00, 0.16),
  (:'ws_a', :'loc_a1', :d_void_new,  :'var_void',  10, 10, 'pza', 35.000000, 350, 56.00, 0.16),
  -- The compensating line: opposite sign, same price. Both of the view's
  -- exclusions have to fire for var_void to read 30.
  (:'ws_a', :'loc_a1', :d_void_rev,  :'var_void', -10, -10, 'pza', 35.000000, -350, -56.00, 0.16),

  (:'ws_a', :'loc_a1', :d_only,      :'var_only',  10, 10, 'pza', 40.000000, 400, 64.00, 0.16),
  (:'ws_a', :'loc_a1', :d_only_rev,  :'var_only', -10, -10, 'pza', 40.000000, -400, -64.00, 0.16),

  -- A LIVE document carrying a correction line. 0003's CHECK permits it, and it
  -- is not a price the shop pays for the goods.
  (:'ws_a', :'loc_a1', :d_neg,       :'var_neg',   10, 10, 'pza', 50.000000, 500, 80.00, 0.16),
  (:'ws_a', :'loc_a1', :d_neg,       :'var_neg',   -2, -2, 'pza', 55.000000, -110, -17.60, 0.16),

  (:'ws_a', :'loc_a1', :d_ret_buy,   :'var_ret',   10, 10, 'pza', 100.000000, 1000, 160.00, 0.16),
  (:'ws_a', :'loc_a1', :d_ret_ret,   :'var_ret',  -10, -10, 'pza', 100.000000, -1000, -160.00, 0.16),
  -- Positive line, on a reversal document, at a price that appears nowhere else.
  (:'ws_a', :'loc_a1', :d_ret_rev,   :'var_ret',   10, 10, 'pza', 111.000000, 1110, 177.60, 0.16),

  -- INVERTED FOR 0010: the later-RECORDED document now carries the LOWER price, so
  -- the price key added in 0010 would answer 41 and only recorded_at can answer 40.
  (:'ws_a', :'loc_a1', :d_rec_early, :'var_rec',   10, 10, 'pza', 41.000000, 410, 65.60, 0.16),
  (:'ws_a', :'loc_a1', :d_rec_late,  :'var_rec',   10, 10, 'pza', 40.000000, 400, 64.00, 0.16),

  (:'ws_a', :'loc_a1', :d_dup_1,     :'var_dup',   10, 10, 'pza', 55.000000, 550, 88.00, 0.16),
  (:'ws_a', :'loc_a1', :d_dup_2,     :'var_dup',   10, 10, 'pza', 55.000000, 550, 88.00, 0.16),

  (:'ws_a', :'loc_a2', :d_loc,       :'var_loc',   10, 10, 'pza', 80.000000, 800, 128.00, 0.16),
  (:'ws_a', :'loc_a1', :d_p1only,    :'var_p1only',10, 10, 'pza', 90.000000, 900, 144.00, 0.16),
  (:'ws_a', :'loc_a1', :d_gen,       :'var_basic', 10, 10, 'pza', 15.000000, 150, 24.00, 0.16),
  (:'ws_b', :'loc_b1', :d_b,         :'var_b',     10, 10, 'pza', 99.000000, 990, 158.40, 0.16);

-- Two lines for ONE variant on ONE document. A split case, a corrected quantity —
-- ordinary, and it shares occurred_at, recorded_at and purchase_id by
-- construction, so only the line id can separate them.
insert into purchase_line (id, workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display,
                           qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
values
  (:l_2line_lo, :'ws_a', :'loc_a1', :d_2line, :'var_2line', 10, 10, 'pza', 71.000000, 710, 113.60, 0.16),
  (:l_2line_hi, :'ws_a', :'loc_a1', :d_2line, :'var_2line', 10, 10, 'pza', 70.000000, 700, 112.00, 0.16);

-- The tie pair. Identical occurred_at and recorded_at, and line ids that rank the
-- opposite way to the document ids.
insert into purchase_line (id, workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display,
                           qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
values
  (:l_tie_on_lo, :'ws_a', :'loc_a1', :d_tie_lo, :'var_tie', 10, 10, 'pza', 61.000000, 610, 97.60, 0.16),
  (:l_tie_on_hi, :'ws_a', :'loc_a1', :d_tie_hi, :'var_tie', 10, 10, 'pza', 60.000000, 600, 96.00, 0.16);


-- ============================================================ derivation =====
select chk('1. one row per (provider, variant), not one per delivery',
  (select count(*) from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_basic') = 1);

select chk('2. the LATER delivery is the memory',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_basic') = 12.000000,
  (select coalesce(unit_price_net_per_base::text, 'no row') from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_basic'));

select chk('3. it names the document it came from',
  (select last_purchase_id from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_basic') = :d_basic_new);

select chk('4. the DENOMINATION the operator typed is remembered too',
  (select last_qty_display_unit from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_basic') = 'kg');

select chk('5. the snapshotted tax_rate rides along, not the variant''s current one',
  (select tax_rate from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_basic') = 0.16);

-- Ordering is by occurred_at. The back-dated document was inserted FIRST and is
-- the newer delivery; a view that read insert order or recorded_at would answer 25.
select chk('6. a back-dated delivery recorded later does not become the memory',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_back') = 20.000000,
  (select coalesce(unit_price_net_per_base::text,'no row') from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_back'));


-- ============================================== provider and location scope ==
select chk('7. the same variant from a second provider is its OWN row',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov2' and variant_id = :'var_basic') = 15.000000);

select chk('8. and it does not disturb the first provider''s row',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_basic') = 12.000000);

-- NO FALLBACK ACROSS PROVIDERS (ADR-035 §2.3). A price is a fact about a
-- relationship. Buying it from someone new is a blank required field, and Comprar
-- renders that as its own state rather than as a zero.
select chk('9. a variant bought only from prov1 gives prov2 NOTHING — no fallback',
  (select count(*) from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov2' and variant_id = :'var_p1only') = 0);

select chk('10. the memory is WORKSPACE-wide: a delivery at the other store counts',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_loc') = 80.000000
  and (select last_location_id from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_loc') = :'loc_a2');

select chk('11. the generic provider absorbs nobody else''s prices',
  (select count(*) from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov_gen') = 0);


-- ============================================================ exclusions =====
-- Exclusion one on its own. The reversal document is the most recent row for the
-- pair and carries a negative line; offering it back would prefill the price of a
-- delivery that was cancelled.
select chk('12. the reversal document is never itself the memory',
  (select last_purchase_id from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_void')
  is distinct from :d_void_rev);

-- AND HERE IS WHERE IT IS THE ONLY THING THAT WORKS. A void of a RETURN carries a
-- positive line, so qty_base > 0 lets it through and `p.reversal_of is null` is
-- the sole reason it is not the memory. Removing that predicate was tried, and
-- until this document existed the whole suite stayed green without it — a vacuous
-- pass of precisely the kind supabase/README.md warns about for RLS run as
-- superuser. Check 13 is what discriminates now.
select chk('13. a reversal carrying a POSITIVE line is still not the memory',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_ret')
  is distinct from 111.000000,
  (select coalesce(unit_price_net_per_base::text,'no row') from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_ret'));

-- The return itself is a live document with a negative line, excluded by
-- qty_base > 0 and by exclusion two both. What stands is the delivery.
select chk('14. a voided return leaves the original delivery as the memory',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_ret') = 100.000000,
  (select coalesce(unit_price_net_per_base::text,'no row') from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_ret'));

-- Exclusion two, which is the one that is easy to forget. With only the first,
-- the VOIDED document becomes the most recent standing row again and prefills
-- forever — the failure ADR-035 §2.3 names by name.
select chk('15. the VOIDED delivery stops prefilling',
  (select last_purchase_id from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_void')
  is distinct from :d_void_new);

select chk('16. and the pair falls back to the delivery that still stands',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_void') = 30.000000,
  (select coalesce(unit_price_net_per_base::text,'no row') from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_void'));

select chk('17. exactly one row survives for a pair with a void in its history',
  (select count(*) from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_void') = 1);

-- Blank, not zero. Comprar renders an absent price as its own state (§2.8); a
-- row reading 0.00 would be prefilled into a delivery and believed.
select chk('18. when the ONLY delivery is voided the pair has NO row at all',
  (select count(*) from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_only') = 0);

select chk('19. a correction line on a LIVE document is not a remembered price',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_neg') = 50.000000,
  (select coalesce(unit_price_net_per_base::text,'no row') from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_neg'));

select chk('20. no row anywhere in the view carries a non-positive price source',
  not exists (
    select 1 from provider_price_memory m
      join purchase_line pl on pl.id = m.last_purchase_line_id
     where pl.qty_base <= 0));

select chk('21. no row anywhere in the view is sourced from a void or a voided document',
  not exists (
    select 1 from provider_price_memory m
      join purchase p on p.id = m.last_purchase_id
     where p.reversal_of is not null
        or exists (select 1 from purchase r where r.reversal_of = p.id)));


-- =========================================================== determinism =====
-- occurred_at alone does not pick a single row. These two claims are why the view
-- carries four sort keys and not one; without the tail keys each would return an
-- arbitrary row and could return a different one tomorrow on unchanged data.
select chk('22. identical occurred_at AND recorded_at still yields ONE row',
  (select count(*) from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_tie') = 1);

-- 0010 REPLACED THE KEY THAT DECIDES THIS. It used to be the higher document id,
-- which is a uuid and therefore not data: a merchant with two stores on one
-- delivery round produces this tie every week, and the prefill was a coin flip
-- between two prices really paid. The price now decides, and the fixture is
-- inverted so the two keys DISAGREE — the higher price sits on the LOWER document
-- id, so an id tiebreak would answer 60 and only the price key can answer 61.
select chk('23. and it is the higher PRICE, not the higher document id (0010)',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_tie') = 61.000000
  and (select last_purchase_id from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_tie') = :d_tie_lo,
  (select coalesce(unit_price_net_per_base::text,'no row') from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_tie'));

-- THE THIRD KEY. Two documents that happened at the same instant are separated by
-- when they were recorded, and here the later-recorded one carries the LOWER
-- document id, so the id key alone would answer 40. Added after deleting
-- recorded_at from the view left all 43 checks green.
-- Inverted for 0010 as well, and for the same reason: the later-recorded document
-- now carries the LOWER price, so the price key would answer 41 and recorded_at is
-- the only key that can answer 40.
select chk('24. of two deliveries at the same instant, the later-RECORDED wins',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_rec') = 40.000000,
  (select coalesce(unit_price_net_per_base::text,'no row') from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_rec'));

select chk('25. two lines for one variant on ONE document yield one row',
  (select count(*) from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_2line') = 1);

-- Inverted too: the higher price is on the LOWER line id, so the line-id key would
-- answer 70 and only the price key can answer 71.
select chk('26. and it is the higher PRICE, not the higher line id (0010)',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_2line') = 71.000000
  and (select last_purchase_line_id from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_2line') = :l_2line_lo);

-- AND THE ID KEYS ARE STILL DOING A JOB. Two deliveries identical in every column
-- the view hands back — same instant, same recorded_at, same price, same tax rate,
-- same denomination — can only be separated by an id, and `distinct on` returns an
-- arbitrary row without a total order. Which document wins is genuinely arbitrary
-- and both answers are true; that there is exactly ONE is not.
select chk('26b. two deliveries identical in every prefilled column still yield ONE row (0010)',
  (select count(*) from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_dup') = 1,
  (select count(*)::text from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_dup'));

select chk('26c. and the prefill it hands back is the same either way',
  (select unit_price_net_per_base from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_dup') = 55.000000
  and (select last_qty_display_unit from provider_price_memory
    where workspace_id = :'ws_a' and provider_id = :'prov1' and variant_id = :'var_dup') = 'pza');

-- The whole answer, twice, compared as a set. A tiebreak bug that only shows on
-- one pair in a hundred is exactly the kind this catches and a spot check does not.
create table public._snap1 as select * from provider_price_memory;
create table public._snap2 as select * from provider_price_memory;
select chk('27. the view returns the identical answer when asked twice',
  not exists (select * from public._snap1 except select * from public._snap2)
  and not exists (select * from public._snap2 except select * from public._snap1)
  and (select count(*) from public._snap1) = (select count(*) from public._snap2));

-- Twelve standing pairs in A: prov1 × {basic, back, void, neg, ret, tie, rec, dup,
-- 2line, loc, p1only} = 11, plus prov2 × basic. var_only is absent because its only
-- delivery was voided. An off-by-one here means an exclusion fired too widely or
-- not at all.
select chk('28. workspace A holds exactly the twelve pairs that still stand',
  (select count(*) from provider_price_memory where workspace_id = :'ws_a') = 12,
  (select count(*)::text from provider_price_memory where workspace_id = :'ws_a'));


-- ============================================================== isolation ====
select chk('29. workspace B''s delivery is in B''s memory and nowhere else',
  (select count(*) from provider_price_memory where workspace_id = :'ws_b') = 1
  and (select count(*) from provider_price_memory
        where workspace_id = :'ws_a' and unit_price_net_per_base = 99.000000) = 0);

select chk('30. the whole view is exactly A''s twelve plus B''s one',
  (select count(*) from provider_price_memory) = 13,
  (select count(*)::text from provider_price_memory));


-- ================================================================= access ====
-- Everything above ran as the owning role, which bypasses RLS. This view's entire
-- access story IS inherited RLS, so these are the checks that matter and they run
-- under `set local role authenticated`.

select chk('31. the view is security_invoker — the mechanism §2.7 chose',
  (select coalesce(array_to_string(reloptions, ','), '') from pg_class
    where oid = 'public.provider_price_memory'::regclass) like '%security_invoker=true%',
  (select coalesce(array_to_string(reloptions, ','), '(none)') from pg_class
    where oid = 'public.provider_price_memory'::regclass));

select chk('32. anon holds no select on it',
  not has_table_privilege('anon', 'public.provider_price_memory', 'select'));

select chk('33. authenticated holds the grant — the gate is RLS, not the grant',
  has_table_privilege('authenticated', 'public.provider_price_memory', 'select'));

-- A STAFF MEMBER SEES NOTHING. purchase and purchase_line are manager-and-above
-- because they carry cost (§2.7), and the view inherits that rather than
-- restating it. Zero rows, not an error.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select chk('34. a STAFF member at loc_a1 sees zero rows — cost is manager-and-above',
  (select count(*) from public.provider_price_memory) = 0,
  (select count(*)::text from public.provider_price_memory));
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select chk('35. a MANAGER sees all twelve of their workspace''s pairs',
  (select count(*) from public.provider_price_memory) = 12,
  (select count(*)::text from public.provider_price_memory));
select chk('36. including the pair bought at a store they hold by role, not by assignment',
  (select count(*) from public.provider_price_memory where variant_id = :'var_loc') = 1);
select chk('37. and none of workspace B''s',
  (select count(*) from public.provider_price_memory where workspace_id = :'ws_b') = 0);
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select chk('38. the OWNER of A sees the same twelve',
  (select count(*) from public.provider_price_memory) = 12);
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select chk('39. a second tenant sees only their own one row',
  (select count(*) from public.provider_price_memory) = 1
  and (select workspace_id from public.provider_price_memory) = :'ws_b');
commit;


-- ================================================================ the plan ===
-- docs/PLAN.md task 1.4: "explain confirms the two-index plan".
--
-- ADR-035 §2.3 asks for ONE index, (workspace_id, provider_id, variant_id,
-- occurred_at desc). It is not creatable: provider_id and occurred_at are on the
-- header and variant_id is on the line. 0003 shipped the two-index equivalent
-- instead — purchase_by_provider_idx and purchase_line_by_variant_idx — and said
-- 1.4 must confirm it against a REAL plan rather than assume it. This is that
-- confirmation, kept in CI so it stays true.
--
-- IT NEEDS DATA. On the eleven-row fixture above every plan is a sequential scan
-- the check would assert nothing, so this section builds a third workspace big
-- enough for the planner to have an opinion. That is also why it runs last: it
-- would otherwise pollute every count above.

insert into auth.users (id, email) values ('55555555-5555-5555-5555-555555555555', 'owner.c@example.mx');
select set_config('request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', false);
select onboard_workspace('Tienda C') as ws_c \gset
select set_config('request.jwt.claims', null, false);
select id as loc_c from location where workspace_id = :'ws_c' \gset
\set owner_c '''55555555-5555-5555-5555-555555555555'''

insert into product_family (workspace_id, name) values (:'ws_c', 'Abarrotes');
select id as fam_c from product_family where workspace_id = :'ws_c' \gset

insert into product_variant (workspace_id, family_id, name,
       base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code, tax_rate)
select :'ws_c', :'fam_c', 'Producto ' || g, 'pza','pza','pza','pza', 0.16
  from generate_series(1, 200) g;

insert into provider (workspace_id, name)
select :'ws_c', 'Proveedor ' || g from generate_series(1, 40) g;

-- 40 providers × 25 deliveries = 1000 documents, 4 lines each = 4000 lines.
insert into purchase (id, workspace_id, location_id, provider_id, occurred_at,
                      total_net, total_tax, created_by, payload_hash)
select gen_random_uuid(), :'ws_c', :'loc_c', pr.id, now() - (g || ' hours')::interval,
       100, 16, :owner_c, 'h-c-' || pr.id || '-' || g
  from provider pr, generate_series(1, 25) g
 where pr.workspace_id = :'ws_c' and not pr.is_generic;

create table public._pv as
select id, (row_number() over (order by name)) - 1 as n
  from product_variant where workspace_id = :'ws_c';

create table public._ph as
select id, workspace_id, location_id, (row_number() over (order by id)) - 1 as n
  from purchase where workspace_id = :'ws_c';

insert into purchase_line (workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display,
                           qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
select ph.workspace_id, ph.location_id, ph.id, pv.id, 10, 10, 'pza', 8.500000, 85, 13.60, 0.16
  from public._ph ph
 cross join generate_series(1, 4) g
  join public._pv pv on pv.n = ((ph.n * 4 + g) % 200);

analyze public.purchase;
analyze public.purchase_line;

do $$
declare
  v_ws uuid; v_prov uuid; v_var uuid;
  v_plan jsonb; v_txt text;
begin
  select w.id into v_ws from public.workspace w where w.display_name = 'Tienda C';

  -- A pair that genuinely has history, so the plan is the plan for a real lookup
  -- and not for an empty one.
  select p.provider_id, pl.variant_id into v_prov, v_var
    from public.purchase p
    join public.purchase_line pl on pl.purchase_id = p.id
   where p.workspace_id = v_ws
   limit 1;

  execute format(
    'explain (format json) select * from public.provider_price_memory '
    'where workspace_id = %L and provider_id = %L and variant_id = %L',
    v_ws, v_prov, v_var) into v_plan;
  v_txt := v_plan::text;

  perform public.chk('40. explain: the HEADER half uses purchase_by_provider_idx',
    v_txt like '%purchase_by_provider_idx%', left(v_txt, 400));
  perform public.chk('41. explain: the LINE half uses purchase_line_by_variant_idx',
    v_txt like '%purchase_line_by_variant_idx%', left(v_txt, 400));
  perform public.chk('42. explain: the voided-document exclusion uses purchase_one_reversal_idx',
    v_txt like '%purchase_one_reversal_idx%', left(v_txt, 400));
  perform public.chk('43. explain: no sequential scan of purchase or purchase_line',
    v_txt not like '%Seq Scan%', left(v_txt, 400));
end;
$$;

-- And the lookup returns a single row on that fixture, so checks 37–40 are the
-- plan for a query that actually answers something.
do $$
declare v_ws uuid; v_prov uuid; v_var uuid; v_n integer;
begin
  select w.id into v_ws from public.workspace w where w.display_name = 'Tienda C';
  select p.provider_id, pl.variant_id into v_prov, v_var
    from public.purchase p
    join public.purchase_line pl on pl.purchase_id = p.id
   where p.workspace_id = v_ws
   limit 1;
  select count(*) into v_n from public.provider_price_memory
   where workspace_id = v_ws and provider_id = v_prov and variant_id = v_var;
  perform public.chk('44. the plan above is for a lookup that returns exactly one row',
    v_n = 1, v_n::text);
end;
$$;


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where not passed;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

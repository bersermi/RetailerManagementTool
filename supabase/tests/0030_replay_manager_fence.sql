-- ============================================================================
-- 0030 — the fence loosened one notch: what the REPLACEMENT did, and what it
--        deliberately left standing
--
-- ADR-035 §2.6 (*Replay*), §2.7 (the capability table), §2.8 (dead letters land
-- with the vendor). docs/PLAN.md task 4.6b. Grill answers C11.1, C11.2, C11.4.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ WHAT THIS FILE IS NOT, AND WHY THAT MATTERS MORE THAN WHAT IT IS
-- ----------------------------------------------------------------------------
-- `0030` REPLACES A FUNCTION THAT ALREADY HAS AN 88-CHECK SUITE. The behaviour
-- of `replay_failed_write` — the compensation, the re-run, the timestamp
-- recomputation, the idempotency, the four kinds, the tenancy refusal — is
-- `supabase/tests/0026_replay_failed_write.sql`, which `0030` RE-SIGNED rather
-- than duplicated. Its section 2 now walks the ladder at four rungs on one row:
-- cashier refused → manager replays → manager still cannot READ the row →
-- owner reaches the idempotency branch → cashier refused a second time.
--
-- ⚠️ A SECOND COPY OF THOSE CHECKS IS THE DEFECT THIS REPOSITORY KEEPS
-- RECORDING, not extra safety: two suites over one claim drift, and the one
-- nobody reads is the one that goes quietly wrong. So this file asserts only
-- the two things `0026`'s suite structurally cannot:
--
--   §1  THE REPLACEMENT ITSELF, from the catalog. `create or replace` has
--       failure modes a behavioural suite cannot see — an OVERLOAD instead of a
--       replacement, a lost `security definer`, a reset `search_path`, a
--       dropped ACL. Every one of those leaves a function that still passes
--       every behavioural check run as the schema owner.
--
--   §2  THE PERIMETER — the three fences `0030` did NOT move, asserted here
--       precisely BECAUSE nothing else will notice if a later migration moves
--       one of them while thinking it is finishing this task.
--
--   §3  The fence as applied, under `set role authenticated`, on a real dead
--       letter. Deliberately narrow: three rungs and a tenancy probe, enough to
--       make §1's catalog reading non-vacuous. The long behavioural walk stays
--       in `0026`.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE ONE CLAIM IN HERE THAT IS SUPPOSED TO GO RED ONE DAY
-- ----------------------------------------------------------------------------
-- Check **2.1** asserts that `failed_write_select` is STILL owner-only. That is
-- the applied state and it is a decision, not an oversight: C11.4 ruled on who
-- may CALL this function and nothing has ruled on who may READ the table
-- (`0024` decision 8). The consequence is stated plainly — **a manager may
-- replay a dead letter she cannot see** — and it is owed to step `5c`'s
-- dead-letter banner (C11.9), where the owner chooses between loosening the
-- policy and adding a `security definer` read in the shape of
-- `my_access_requests()` (`0029`).
--
-- ⚠️ `docs/PLAN.md`'s 4.5c-ii section PREDICTED THE OPPOSITE SCOPE, on
-- 2026-09-05: *"it is TWO changes, the fence AND `failed_write`'s SELECT
-- policy, or the manager replays blind."* It is right about the consequence and
-- it is four days older than C11.4, which says *one notch*. The plan's 4.6b
-- row, its 4.6b section and `supabase/README.md` all say one notch too. The
-- minority copy does not get to widen a migration that merges automatically.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING ABOUT THE VENDOR PATH, for the same reason `0026`'s suite cannot:
-- every function on this surface reads `auth.uid()`, so a `service_role` replay
-- fails the authenticated-caller guard before it reaches the fence.
--
-- ⚠️ NOTHING ABOUT CONCURRENCY. One connection cannot block on its own lock.
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

-- 4.5b's helper: `insufficient_privilege` IS 42501, so a state alone cannot
-- tell a role refusal from a location wall or from a row that is not ours.
create function public.chk_raises_like(p_label text, p_sql text,
                                       p_state text, p_msg text)
returns void language plpgsql as $$
declare v_state text; v_msg text;
begin
  execute p_sql;
  perform public.chk(p_label, false, 'no exception raised');
exception when others then
  v_state := sqlstate; v_msg := sqlerrm;
  perform public.chk(p_label, v_state = p_state and v_msg like '%' || p_msg || '%',
                     format('sqlstate %s / %L', v_state, v_msg));
end;
$$;
grant execute on function
  public.chk_raises_like(text, text, text, text) to authenticated;

-- ⚠️ 4d's helper, AND IT IS HERE FOR A FALSIFICATION RATHER THAN FOR TIDINESS.
-- The first spelling of the manager/owner checks below called
-- `replay_failed_write` inline inside `select chk(...)`. Under fixture F1 — the
-- fence reverted to `owner` — that call RAISES, and under `ON_ERROR_STOP` psql
-- aborted the whole file at that statement: a genuine red, but one that printed
-- no report table, ran none of the checks below it, and told a reader the
-- sqlstate instead of which claim broke. `chk_json` traps, records, and lets
-- the rest of the ladder run — which is the difference between a suite that
-- fails and a suite that says what failed.
create function public.chk_json(p_label text, p_sql text, p_key text, p_expect text)
returns void language plpgsql as $$
declare v jsonb;
begin
  execute p_sql into v;
  perform public.chk(p_label, (v ->> p_key) is not distinct from p_expect,
                     format('%s=%s (wanted %s)', p_key,
                            coalesce(v ->> p_key, 'null'),
                            coalesce(p_expect, 'null')));
exception when others then
  perform public.chk(p_label, false, 'RAISED ' || sqlstate || ': ' || sqlerrm);
end;
$$;
grant execute on function public.chk_json(text, text, text, text) to authenticated;

create function public._rep(p_fw uuid)
returns text language sql as $$
  select format('select public.replay_failed_write(%L::uuid)', p_fw)
$$;
grant execute on function public._rep(uuid) to authenticated;

create function public._sl(p_variant uuid, p_qty numeric,
                           p_price numeric default 10.00)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_gross_per_base', p_price))
$$;
grant execute on function public._sl(uuid, numeric, numeric) to authenticated;

-- ⚠️ `_pl` AND `_sl` ARE CREATED AT THE EXACT SIGNATURES THE SUITES ABOVE GAVE
-- THEM, defaults included, which is the rule `_cleanup.sql` states in its own
-- words: a different arity does not replace the older helper, it sits BESIDE it
-- and makes a short call ambiguous rather than wrong. `_pl`'s fourth argument
-- is unused here and is kept for that reason alone.
create function public._pl(p_variant uuid, p_qty numeric,
                           p_price numeric default 4.00,
                           p_expiry date default null)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_net_per_base', p_price, 'expiry_date', p_expiry)))
$$;
grant execute on function public._pl(uuid, numeric, numeric, date) to authenticated;

-- The source text of a function, as APPLIED. §1 reads this rather than the
-- migration file, because ADR-035 §9 is explicit that a file is not evidence.
--
-- ⚠️⚠️ IT AGGREGATES RATHER THAN RETURNING ONE ROW, AND A FALSIFICATION IS WHY.
-- The first spelling was a bare scalar subquery on `proname`. Under fixture F2
-- — an OVERLOAD instead of a replacement, which is the single worst thing
-- `create or replace` can do — it returned two rows and raised *"more than one
-- row returned by a subquery used as an expression"*, killing the file before
-- check 1.1 could report the overload it exists to catch. **A suite that dies
-- on the defect it is written to name has not caught it.** Aggregating makes
-- every §1 claim read "…of EVERY replay_failed_write in the catalog", which is
-- both survivable and the stronger sentence: an overload carrying the old
-- owner fence now turns 1.3 red as well as 1.1.
create function public._src(p_name text)
returns text language sql stable as $$
  select string_agg(p.prosrc, E'\n') from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = p_name
$$;


-- ---------------------------------------------------------------- fixture ----
-- Four people, one workspace, one location, one variant. The cashier holds the
-- location, so every refusal below is the ROLE fence and never the location
-- wall — `0026`'s suite learned that the hard way and the reason is recorded
-- there.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'cashier.a@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'owner.b@example.mx'),
  ('44444444-4444-4444-4444-444444444444', 'manager.a@example.mx');

\set owner_a   '''11111111-1111-1111-1111-111111111111'''
\set cashier_a '''22222222-2222-2222-2222-222222222222'''
\set owner_b   '''33333333-3333-3333-3333-333333333333'''
\set manager_a '''44444444-4444-4444-4444-444444444444'''

\set jwt_owner   '''{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'''
\set jwt_cashier '''{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'''
\set jwt_owner_b '''{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}'''
\set jwt_manager '''{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}'''

select set_config('request.jwt.claims', :jwt_owner, false);
select onboard_workspace('Tienda A') as ws_a \gset
select set_config('request.jwt.claims', :jwt_owner_b, false);
select onboard_workspace('Tienda B') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc_1 from location where workspace_id = :'ws_a' \gset

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', :cashier_a, 'staff'),
  (:'ws_a', :manager_a, 'manager');
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1'::uuid
  from workspace_member wm where wm.user_id = :cashier_a;

insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes');
select id as fam from product_family where workspace_id = :'ws_a' \gset
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam', 'Pan', 'pza','pza','pza','pza', 0.0000);
select id as var from product_variant where workspace_id=:'ws_a' and name='Pan' \gset

-- `onboard_workspace` creates the generic provider; §2.3 makes it a real row
-- rather than a null, so `record_purchase` requires one.
select id as prov from provider where workspace_id = :'ws_a' and is_generic \gset

\set anchor '''2026-06-10 12:00:00+00'''
\set dl_fen '''fbfb0030-0000-0000-0000-000000000001'''
\set dl_ten '''fbfb0030-0000-0000-0000-000000000002'''

-- Ten on the shelf, so the dead letter's downgrade has a real lot to take from
-- and the replay has something to compensate.
begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select record_purchase('bbbb0030-0000-0000-0000-000000000001'::uuid,
                       :'loc_1'::uuid, :'prov'::uuid,
                       public._pl(:'var'::uuid, 10, 4.00),
                       :'anchor'::timestamptz - interval '1 day') as r \gset
commit;

-- Two dead letters, both reported by the CASHIER — which is the ordinary case
-- (`0024`: the person whose write was rejected is usually the one at the till)
-- and is what makes 3.5's reported_by/replayed_by split worth asserting.
begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select record_failed_write(:dl_fen::uuid, 'sale', :'ws_a'::uuid,
         jsonb_build_object('location_id', :'loc_1'::uuid,
                            'lines', public._sl(:'var'::uuid, 2, 5.00),
                            'occurred_at', :'anchor'::timestamptz - interval '2 hours',
                            'recorded_offline', true),
         '42501') as r \gset
select record_failed_write(:dl_ten::uuid, 'sale', :'ws_a'::uuid,
         jsonb_build_object('location_id', :'loc_1'::uuid,
                            'lines', public._sl(:'var'::uuid, 1, 5.00),
                            'occurred_at', :'anchor'::timestamptz - interval '2 hours',
                            'recorded_offline', true),
         '42501') as r \gset
commit;


-- ============================================================================
-- 1. THE REPLACEMENT ITSELF, READ FROM THE CATALOG
-- ============================================================================
-- ⚠️ EVERY CHECK HERE EXISTS BECAUSE `create or replace function` CAN FAIL
-- QUIETLY. The four failure modes below all leave a function that answers
-- correctly when the schema owner calls it, which is how a behavioural suite
-- would miss them.

-- The first and worst: `create or replace` matches on the full signature, so a
-- file that changed an argument type or added a default would CREATE A SECOND
-- FUNCTION and leave `0026`'s standing. `0024`'s header spells out what that
-- costs — the old body stays reachable and keeps doing the old thing. `0030`
-- changes no argument, so there must be exactly one.
select chk('1.1 ⚠️⚠️ EXACTLY ONE replay_failed_write EXISTS — create or replace '
           'REPLACED 0026''s function rather than overloading it. An overload '
           'would leave the owner-fenced body standing and reachable, and no '
           'behavioural check could tell which one it called',
           (select count(*) from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'replay_failed_write') = 1,
           format('overloads=%s',
                  (select count(*) from pg_proc p
                     join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname='public' and p.proname='replay_failed_write')));

select chk('1.2 …and its signature is unchanged — one uuid argument, returning '
           'jsonb. §2.6 writes replay as one row at a time, so there is still '
           'no "replay everything" spelling to grow into',
           (select bool_and(pg_get_function_arguments(p.oid) = 'p_failed_write_id uuid'
                        and pg_get_function_result(p.oid) = 'jsonb')
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname='replay_failed_write'),
           (select string_agg(pg_get_function_arguments(p.oid) || ' -> ' ||
                              pg_get_function_result(p.oid), ' ; ')
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname='replay_failed_write'));

-- THE FENCE, READ FROM THE APPLIED BODY. Both halves: the new predicate is
-- there AND the old one is gone. Asserting only the first would pass against a
-- body that tests both and takes the tighter branch.
select chk('1.3 ⚠️⚠️ THE APPLIED BODY FENCES AT manager, AND CARRIES NO owner '
           'FENCE ANY MORE. Both halves — asserting only the first would pass '
           'against a body that still short-circuits on owner somewhere above '
           'it. ADR-035 §9: the catalog is the evidence, not the file',
           public._src('replay_failed_write') like '%has_role(v_fw.workspace_id, ''manager'')%'
       and public._src('replay_failed_write') not like '%has_role(v_fw.workspace_id, ''owner'')%',
           format('manager=%s owner=%s',
                  public._src('replay_failed_write') like '%''manager''%',
                  public._src('replay_failed_write') like '%has_role(v_fw.workspace_id, ''owner'')%'));

-- `security definer` and the empty search_path are what make the fence the ONLY
-- thing standing between a caller and the ledger. A replacement that dropped
-- either would still pass §3 below, because §3's callers are members.
select chk('1.4 ⚠️ security definer AND search_path = '''' SURVIVED THE '
           'REPLACEMENT. A definer function with a default search_path is '
           'resolvable by the caller, and this one writes the ledger — so the '
           'two properties are the fence''s foundation and not decoration',
           (select bool_and(p.prosecdef
               and exists (select 1 from unnest(p.proconfig) cfg
                            where cfg in ('search_path=', 'search_path=""')))
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname='replay_failed_write'),
           (select string_agg(format('secdef=%s config=%s', p.prosecdef,
                                     p.proconfig), ' ; ')
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname='replay_failed_write'));

-- ⚠️ THE ACL. `0030`'s header CLAIMS that `create or replace` preserves it and
-- that the restated revoke/grant at the bottom of the migration are no-ops.
-- That claim is read from pg_proc rather than believed. It matters in both
-- directions: a lost grant makes the function unreachable, and a reset ACL
-- restores Postgres's default EXECUTE-to-PUBLIC and hands `anon` the ledger.
select chk('1.5 ⚠️⚠️ THE ACL SURVIVED: authenticated holds EXECUTE, and PUBLIC '
           'and anon hold NOTHING. Postgres grants EXECUTE to PUBLIC by default '
           'on every function it creates (3.1''s finding, in its sixth place), '
           'so a reset ACL here would hand anon a definer function that writes '
           'the ledger — and every behavioural check would still pass',
           (select bool_and(array_to_string(p.proacl, ',') like '%authenticated=X%'
                        and array_to_string(p.proacl, ',') not like '%,=X%'
                        and array_to_string(p.proacl, ',') not like '=X%'
                        and array_to_string(p.proacl, ',') not like '%anon=X%')
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname='replay_failed_write'),
           (select string_agg(array_to_string(p.proacl, ' '), ' ; ')
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname='replay_failed_write'));

-- ⚠️ THE COMMENT IS THE FIRST THING A LATER SESSION READS, and `0026`'s said
-- "OWNER only". A replacement that left it saying so would be the ninth stale
-- copy in this repository's record — and the first one inside the database.
select chk('1.6 ⚠️ THE FUNCTION COMMENT WAS RE-SIGNED TOO — it names MANAGER, '
           'names 0030 and C11.4 as whose decision it was, and no longer says '
           '"OWNER only". Eight stale-copy defects are recorded in this repo '
           'and every one of them was a sentence nobody re-read',
           (select bool_and(d.description like '%MANAGER%'
                        and d.description like '%C11.4%'
                        and d.description not like '%OWNER only%')
              from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
              join pg_description d on d.objoid = p.oid
             where n.nspname='public' and p.proname='replay_failed_write'),
           'comment re-signed at 0030');

-- …and the uncomfortable half is in the comment too, on purpose. The next
-- person to widen `failed_write_select` should meet the decision before they
-- meet the policy.
select chk('1.7 ⚠️⚠️ …AND THE COMMENT NAMES THE BLINDNESS RATHER THAN HIDING '
           'IT: failed_write_select is still owner-only, so a manager may '
           'replay a row she cannot SELECT. Owed to 5c (C11.9), and named here '
           'so that widening the policy is a decision someone takes rather '
           'than a tidy-up someone performs',
           (select bool_and(d.description like '%failed\_write\_select IS STILL '
                                             || 'OWNER-ONLY%')
              from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
              join pg_description d on d.objoid = p.oid
             where n.nspname='public' and p.proname='replay_failed_write'),
           'blindness named in the comment');


-- ============================================================================
-- 2. THE PERIMETER — the three fences `0030` did NOT move
-- ============================================================================
-- ⚠️⚠️ THIS SECTION IS THE POINT OF THE FILE. `0030` is one predicate, and the
-- risk in a one-predicate migration is never the predicate — it is the next
-- session that reads "the fence moved to manager" and finishes the job nobody
-- asked for. Each of these three is a separate decision with its own owner.

-- ⚠️ THE ONE THAT IS SUPPOSED TO GO RED ONE DAY. See this file's header.
select chk('2.1 ⚠️⚠️ failed_write_select IS STILL OWNER-ONLY — 0024 decision 8, '
           'untouched by 0030. THIS CHECK IS EXPECTED TO GO RED EVENTUALLY: '
           '5c''s dead-letter banner (C11.9) needs the manager to see '
           'something, and the owner chooses between loosening this policy and '
           'a security-definer read in the shape of my_access_requests (0029). '
           'Whoever changes it says whose decision it was; whoever changes it '
           'silently is undoing 0024 decision 8 by accident',
           (select pg_get_expr(pol.polqual, pol.polrelid) like '%''owner''%'
              from pg_policy pol
              join pg_class c on c.oid = pol.polrelid
             where c.relname = 'failed_write' and pol.polname = 'failed_write_select'),
           (select pg_get_expr(pol.polqual, pol.polrelid)
              from pg_policy pol
              join pg_class c on c.oid = pol.polrelid
             where c.relname='failed_write' and pol.polname='failed_write_select'));

-- ⚠️ `record_failed_write` MUST NOT GROW A FENCE, and the reason is the exact
-- inverse of 4.6b's: the person whose write was rejected is USUALLY THE
-- CASHIER, so a role fence on the REPORT would refuse the dead letter in its
-- commonest case and lose the event (`0024` decision 6).
select chk('2.2 ⚠️⚠️ record_failed_write STILL HAS NO ROLE FENCE. 0030 loosened '
           'the fence on RECOVERY and must not be read as an argument about '
           'REPORTING — the person whose write was rejected is usually the '
           'cashier, and a fence there would lose the event it exists to '
           'preserve (0024 decision 6). The workspace check is still the only '
           'refusal in that body',
           public._src('record_failed_write') not like '%has_role%',
           format('has_role in body=%s',
                  public._src('record_failed_write') like '%has_role%'));

-- ⚠️ THE TWO FENCES ARE NOW EQUAL, which is what `0025` wrote before `0026`
-- chose to be tighter. This check says the marker did not move WITH the
-- orchestrator — it was already there.
select chk('2.3 ⚠️ 0025''s replay MARKER is still fenced at manager in the '
           'recorders, and it did NOT move with 0030 — it was already there. '
           '0026 decision 4 made the orchestrator TIGHTER than the marker; '
           'C11.4 removed that gap, so the two are now equal, which is the '
           'shape 0025 decision 3 wrote in the first place',
           public._src('record_sale') like '%has_role%'
       and public._src('record_sale') like '%manager%',
           format('record_sale fences on manager=%s',
                  public._src('record_sale') like '%manager%'));


-- ============================================================================
-- 3. THE FENCE AS APPLIED, under `set role authenticated`
-- ============================================================================
-- ⚠️ NARROW ON PURPOSE. Three rungs and a tenancy probe — enough that §1's
-- catalog reading is a claim about a working function rather than about a
-- string in pg_proc. The full behavioural walk is `0026`'s re-signed section 2,
-- which runs four rungs on one row including the cashier refused AFTER a
-- successful replay.
--
-- ⚠️ AND EVERY REFUSAL HERE IS THE ROLE. The cashier holds this location, so a
-- 42501 location wall cannot masquerade as a fence.

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_raises_like('3.1 a CASHIER is still refused — TD003, the role '
                       'refusal. 0030 moved the fence one notch and not two: '
                       '§2.6''s replayer reviews a row that can carry COST, '
                       'and §2.7 puts cost at manager-and-above',
                       public._rep(:dl_fen::uuid), 'TD003',
                       'only a manager or an owner');
commit;

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
-- ⚠️ NOT "did not raise" — `already_replayed` would also not raise, and a
-- manager who merely reaches the idempotency branch has not replayed anything.
-- The returned jsonb is what separates the two.
select chk_json('3.2 ⚠️⚠️ THE CHECK THAT HOLDS 4.6b: a MANAGER REPLAYS. Not '
                'merely un-refused — already_replayed is FALSE, so this call is '
                'the one that compensated the downgrade and re-ran the sale. '
                'C11.4: the person standing in the shop must be able to fix a '
                'failed write, and C11.2 makes that person a manager',
                public._rep(:dl_fen::uuid), 'already_replayed', 'false');

-- The half `0030` chose not to fix, pinned where it happens.
select chk('3.3 ⚠️⚠️ …AND SHE CANNOT SEE THE ROW SHE JUST RECOVERED. Zero rows '
           'of failed_write are visible to the manager who replayed it, '
           'because failed_write_select is owner-only (2.1). This is the '
           'applied consequence of one notch rather than two, and it is owed '
           'to 5c',
           (select count(*) from public.failed_write where id = :dl_fen) = 0,
           format('rows visible to the manager=%s',
                  (select count(*) from public.failed_write where id = :dl_fen)));
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
-- The rung above. `has_role` is a ladder, so loosening to manager must not
-- have fenced the owner out — and on a row the manager already replayed, the
-- proof that she CLEARED the fence is that she reached the branch below it.
select chk_json('3.4 ⚠️ the OWNER, above the fence, reaches the '
                'already-replayed branch rather than TD003 — has_role is a '
                'ladder and not an equality, so 0030 did not fence the owner '
                'out of her own dead letter on the way past',
                public._rep(:dl_fen::uuid), 'already_replayed', 'true');
commit;

-- Read as the schema owner, deliberately: the manager cannot select this row
-- (3.3), so a check that reads it back must not be the manager. That is 4b-i's
-- finding, which `0024`'s and `0026`'s suites both had to learn.
select chk('3.5 ⚠️ the stamp names the MANAGER who replayed it and the CASHIER '
           'who reported it — two different people, which is what the two '
           'columns exist to keep apart. 0030 moved who may replay and did not '
           'touch who is recorded as having done it',
           (select replayed_by = :manager_a::uuid and reported_by = :cashier_a::uuid
              from public.failed_write where id = :dl_fen),
           format('replayed_by=%s reported_by=%s',
                  (select replayed_by from public.failed_write where id = :dl_fen),
                  (select reported_by from public.failed_write where id = :dl_fen)));

begin;
select set_config('request.jwt.claims', :jwt_owner_b, true);
set local role authenticated;
-- ⚠️ THE TENANCY REFUSAL IS NOT THE FENCE, and loosening the fence must not
-- have made it one. The workspace predicate is in the `where`, so a foreign
-- dead letter is indistinguishable from one that does not exist — `0021`'s
-- reasoning, because the id is a CLIENT uuid on a table shared by every tenant.
select chk_raises_like('3.6 ⚠️ an OWNER OF ANOTHER WORKSPACE gets 42501 NOT '
                       'FOUND, not TD003 — which would confirm the id exists. '
                       'The tenancy refusal sits ABOVE the role fence and 0030 '
                       'did not disturb the order',
                       public._rep(:dl_ten::uuid), '42501',
                       'not found or not accessible');
commit;

select chk('3.7 the refusals left NOTHING behind — the second dead letter is '
           'still unreplayed, so 3.1 and 3.6 refused rather than partially '
           'succeeded',
           (select replayed_at is null from public.failed_write where id = :dl_ten)
       and (select count(*) = 1 from public.failed_write where replayed_at is not null),
           format('stamped=%s',
                  (select count(*) from public.failed_write where replayed_at is not null)));


-- ============================================================================
-- 4. The counter
-- ============================================================================
-- 3.3 found that a suite can print failures and exit 0; 3.6a found that a green
-- tick is also what a step that ran nothing looks like. A suite that silently
-- SHRANK is the third shape, and only a pinned count catches it.
select chk('4.1 ALL 18 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 17,
           format('recorded=%s of 17 before this one',
                  (select count(*) from public._verify)));

drop function public.chk_raises_like(text, text, text, text);
drop function public.chk_json(text, text, text, text);
drop function public._rep(uuid);
drop function public._sl(uuid, numeric, numeric);
drop function public._pl(uuid, numeric, numeric, date);
drop function public._src(text);


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

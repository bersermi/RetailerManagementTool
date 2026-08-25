-- ============================================================================
-- 04 — RLS ISOLATION, WRITES (behavioural) — INSERTING A NEW ROW INTO THE OTHER
--      WORKSPACE
--
-- ADR-035 §2.10, second row: "a user in workspace A reading or WRITING workspace
-- B gets zero rows and a rejection." Plan task 3.2b-ii, and the half 03 named in
-- WHAT THIS FILE DOES NOT CLAIM and deferred. 02 made the reading half; 03 made
-- the writing half that needs no fabricated row — the grant wall, the filter,
-- the moved row and the append-only triggers. This file makes the one case left:
-- an INSERT of a brand-new row into the other tenant's workspace, on each of the
-- eight tables `authenticated` may insert into at all.
--
-- ⚠️ WHY THIS CASE COST A TASK OF ITS OWN. The other fifty-two (table, verb)
-- pairs need no knowledge of the domain: `insert into public.sale default values`
-- is refused at the ACL check before a row is ever formed, and an update or a
-- delete aimed across the wall matches nothing. An INSERT that `authenticated`
-- IS granted has to survive long enough to reach the policy, and that means a
-- payload — a real family id, four units that share a dimension, a price period
-- that overlaps nothing. A rejected insert proves nothing on its own: "rejected"
-- may mean a missing `family_id`, and the suite would be green about the wrong
-- wall entirely.
--
-- ⚠️ SO THE PROOF IS THE PAIRING, AND IT IS STRONGER HERE THAN THE PLAN ASKED
-- FOR. The plan's done-when is "each cross-wall insert paired with an accepted
-- same-payload insert". What this file runs is not merely the same payload but
-- THE SAME STATEMENT TEXT: one string per (table, workspace), executed twice —
-- once by the owner of that workspace, once by the owner of the other. One is
-- accepted and inserts exactly one row; the other is refused. The two runs
-- differ in nothing whatsoever except who is asking, which is the entire claim
-- (F7). And the two workspaces' statements differ only in the uuids each
-- workspace resolves to, which is what makes them the same payload (F8).
--
-- ⚠️ THESE ARE THE ONE WRITE-POLICY FAMILY THE TENANT WALL CAN ACTUALLY SEE, and
-- that is the finding this file has to report. 03 found that a cross-tenant
-- UPDATE or DELETE never reaches its `_update` / `_delete` policy: Postgres must
-- read a row before it can write it, so the SELECT policy filters the statement
-- first and the write policy is a second layer nothing crossing the wall can
-- observe. An INSERT reads nothing. There is no existing row for a SELECT policy
-- to hide, and with no RETURNING clause the SELECT policy is not applied to the
-- new row either — so the refusal below comes from `<table>_insert`'s WITH CHECK
-- and from nowhere else. F6 asserts the conditions that make that attribution
-- true: one permissive INSERT policy per table, carrying a WITH CHECK and no
-- USING. Falsified: opening `provider_insert` to `with check (true)` turns
-- T-cross red for provider, where the same experiment on `provider_update` left
-- the whole of 03 green.
--
-- ⚠️ THE ORDER POSTGRES CHECKS THINGS IN IS WHAT MAKES A PAYLOAD DANGEROUS.
-- NOT NULL, CHECK constraints and BEFORE ROW triggers all fire BEFORE the RLS
-- WITH CHECK — `product_variant_units_same_dimension_trg` is one of them, and a
-- payload whose four unit codes spanned two dimensions would be refused by that
-- trigger with the policy never consulted. Unique indexes, exclusion constraints
-- and foreign keys fire AFTER it, so those cannot preempt the policy but they
-- CAN fail the positive control. Both failure shapes are caught: a constraint
-- refusal is not sqlstate 42501 with an RLS message, so it lands `unclassified`
-- under F5, and a positive control that does not insert exactly one row turns
-- T-own red.
--
-- WHO THE TWO USERS ARE. 02's and 03's, by the fixed uuids 00_skeleton promises
-- tests will name: `5eed0001-…-0001` owns Tienda Doña Lupe and `5eed0001-…-0005`
-- owns Abarrotes El Roble. Owners rather than cashiers because the claim is about
-- the TENANT wall with the store wall held open — the store wall is 3.3 — and
-- because five of the eight policies here gate on `manager` and three on `owner`,
-- so only an owner can supply the accepted half of all eight pairs.
--
-- BOTH DIRECTIONS, PER 03's SETTLED RULE. The grant wall is a property of the
-- role and is measured once; `denied-check` depends on which workspace the caller
-- belongs to, so it is measured in both — a policy accidentally written against a
-- hardcoded workspace passes one direction and fails the other. F10 asserts the
-- two owners really are strangers to each other's workspace.
--
-- THE FIXTURE, AND WHY THERE IS ONE. `workspace_member` needs a `user_id` that is
-- not already a member of the workspace being written to, and all six seed users
-- are members of one workspace or the other. Rather than fabricate a
-- cross-tenant membership out of an existing user — which is a confusing thing to
-- leave in a suite about tenancy — this file inserts one `auth.users` row of its
-- own, `3b2b0001-…-0009`, and F9 asserts it was not already there. It is undone
-- by the rollback like everything else here.
--
-- ⚠️ THIS FILE OPENS A TRANSACTION AND ROLLS IT BACK, and every individual write
-- is additionally undone the instant it is measured, by `pg_temp.attempt()`.
-- Sixteen of the thirty-two attempts are accepted inserts, and they are real
-- rows. Removing the per-write undo was falsified, and what it costs is worth
-- stating precisely rather than dramatically: NOTHING COLLIDES — the stranger's
-- run of the same statement is refused by the policy long before it could reach
-- a unique index — but the sixteen accepted rows then survive their own
-- measurement, and a suite whose later measurements read a ledger its earlier
-- ones changed is a suite whose results depend on their own order. F11 is the
-- only test that goes red for it, and it does.
--
-- WHAT THIS FILE DOES NOT CLAIM. Nothing about which LOCATIONS a member may
-- write — 3.3. Nothing about the role wall on inserts: an owner is used
-- throughout, so "staff may not insert a provider" is not asserted here and 03's
-- T-role is the only role claim step 3 makes so far. Nothing about the RPCs,
-- which do not exist yet, and which are the only way a real client will ever
-- insert anything (ADR-035 §2.6) — these grants exist for the RPCs to run under,
-- and this file is about what the wall does if a client reaches past them.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off
set search_path = tap, public, pg_catalog;
set client_min_messages = warning;

begin;

-- ---------------------------------------------------------------------------
-- `pg_temp.attempt()` — one write, measured and then UNDONE
--
-- 03's function, character for character, and it has to be repeated rather than
-- shared: each suite is its own psql session and `pg_temp` does not survive one.
-- A shared copy would have to live in `public`, which is the schema 01 makes
-- structural claims about, so the duplication is the cheaper of the two costs.
--
-- A statement that SUCCEEDS is undone by raising `TU001` from inside the block
-- that ran it: the plpgsql subtransaction rolls back, taking the write with it,
-- while the OUT parameters survive because they are variables and not database
-- state.
--
-- ⚠️ SECURITY INVOKER (the default) AND IT MUST STAY THAT WAY. `security
-- definer` would run every statement as the owner — `postgres`, which bypasses
-- RLS — and all thirty-two measurements would come back `applied` while
-- measuring nothing at all. `role_seen` is recorded from INSIDE the function so
-- F3 reads the role the statement actually ran under.
-- ---------------------------------------------------------------------------
create function pg_temp.attempt(p_stmt text,
  out mode text, out n_rows int, out state text, out msg text, out role_seen name)
language plpgsql as $fn$
begin
  role_seen := current_user;
  mode := null; n_rows := null; state := null; msg := null;
  begin
    execute p_stmt;
    get diagnostics n_rows = row_count;
    mode := case when n_rows = 0 then 'filtered' else 'applied' end;
    raise exception using errcode = 'TU001', message = 'pgtap-undo';
  exception
    when sqlstate 'TU001' then
      null;                                  -- planned: the write is undone
    when others then
      state := sqlstate; msg := sqlerrm;
      mode := case
        when sqlstate = '42501'
         and sqlerrm like 'permission denied for table%'                then 'denied-grant'
        when sqlstate = '42501'
         and sqlerrm like 'new row violates row-level security policy%' then 'denied-check'
        when sqlstate = '23001'                                         then 'denied-trigger'
        else 'unclassified'
      end;
  end;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- The two owners, resolved from the ledger rather than assumed — 02's and 03's
-- block, unchanged, because the claim it supports is the same one.
-- ---------------------------------------------------------------------------
create temp table ins_actor (
  tag      text primary key,
  user_id  uuid not null,
  ws_id    uuid,
  ws_count int not null,
  cross_member int not null
);

insert into ins_actor (tag, user_id, ws_id, ws_count, cross_member)
select v.tag, v.user_id,
       (select wm.workspace_id from public.workspace_member wm
         where wm.user_id = v.user_id and wm.role = 'owner' and wm.is_active
         limit 1),
       (select count(*)::int from public.workspace_member wm
         where wm.user_id = v.user_id and wm.role = 'owner' and wm.is_active),
       0
from (values ('a', '5eed0001-0000-0000-0000-000000000001'::uuid),
             ('b', '5eed0001-0000-0000-0000-000000000005'::uuid)) as v(tag, user_id);

update ins_actor x
   set cross_member = (
     select count(*)::int from public.workspace_member wm
      where wm.user_id = x.user_id
        and wm.workspace_id = (select ws_id from ins_actor o where o.tag <> x.tag));

-- ---------------------------------------------------------------------------
-- The fixture: one user who belongs to neither workspace
--
-- `workspace_member`'s payload needs a `user_id` that is not already a member of
-- the workspace it is aimed at, and every seed user is a member of one of the
-- two. F9 is what keeps this honest — if a future seed adds this id, the fixture
-- stops being this file's and someone decides whether it is still wanted.
-- ---------------------------------------------------------------------------
create temp table ins_fixture_before as
select count(*)::int as n_user
  from auth.users
 where id = '3b2b0001-0000-0000-0000-000000000009';

insert into auth.users (id, email)
values ('3b2b0001-0000-0000-0000-000000000009', 'invitee.3.2b-ii@pgtap.invalid');

-- ---------------------------------------------------------------------------
-- THE INSERT REGISTER — the eight tables, computed from the catalog
--
-- ⚠️ THIS IS WHAT REPLACES 03's F17. 03 could only count the tables it was
-- deferring; this file has to have a hand-built payload for each one, so a NINTH
-- insert-granted table cannot join quietly — it lands in `ins_granted` with no
-- payload beside it and F1 fails NAMING it. Computed from `has_table_privilege`
-- and never written out, so the day a migration grants `authenticated` an insert
-- somewhere new is the day this suite starts asking for its payload.
-- ---------------------------------------------------------------------------
create temp table ins_granted (tbl name primary key);

-- ⚠️ `c.oid` rather than a name built with quote_ident: a text-to-regclass cast
-- is resolved against the search_path and the planner is free to evaluate it
-- BEFORE the nspname filter, which makes this query fail on the first table of
-- the same name in another schema — `auth.instances` here. Found by running it.
insert into ins_granted (tbl)
select c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
   and has_table_privilege('authenticated', c.oid, 'insert');

-- One statement per (workspace, table). The SAME string is later run by both
-- owners: accepted for the one it belongs to, refused for the other.
create temp table ins_stmt (
  target text,          -- the workspace tag the row is aimed at
  tbl    name,
  stmt   text not null,
  primary key (target, tbl)
);

-- ---------------------------------------------------------------------------
-- THE EIGHT PAYLOADS
--
-- Built as `postgres` and BEFORE any role switch, deliberately: resolving
-- workspace B's family id while acting as owner A would return nothing, because
-- 02 proved B's rows are invisible to A — the suite would then build a payload
-- with a null family id and measure a NOT NULL violation instead of a policy.
--
-- Every id a payload names is resolved from the workspace the payload is aimed
-- at, so each is a row that workspace would genuinely accept. The composite
-- foreign keys make that mandatory rather than tidy: `member_location` refers to
-- (member_id, workspace_id) and (location_id, workspace_id) together, so a
-- payload mixing tenants is refused by the database before RLS is reached.
--
-- The `not exists` clauses pick targets whose unique keys are free — an owner's
-- membership row has no `member_location` assignment (the seed gives those to
-- cashiers only), and a location with no price row for the chosen variant leaves
-- the exclusion constraint nothing to collide with. Those constraints fire AFTER
-- the policy and so cannot preempt it, but they would fail the positive control,
-- and a positive control that fails is a pair that proves nothing.
-- ---------------------------------------------------------------------------
do $$
declare
  w              record;
  v_owner_member uuid;
  v_owner_user   uuid;
  v_loc          uuid;
  v_family       uuid;
  v_variant      uuid;
  v_price_loc    uuid;
begin
  for w in select tag, ws_id from ins_actor order by tag loop
    select wm.id, wm.user_id into v_owner_member, v_owner_user
      from public.workspace_member wm
     where wm.workspace_id = w.ws_id and wm.role = 'owner' and wm.is_active
     order by wm.created_at
     limit 1;

    select l.id into v_loc
      from public.location l
     where l.workspace_id = w.ws_id
       and not exists (select 1 from public.member_location ml
                        where ml.member_id = v_owner_member
                          and ml.location_id = l.id)
     order by l.name
     limit 1;

    select pf.id into v_family
      from public.product_family pf
     where pf.workspace_id = w.ws_id
     order by pf.name
     limit 1;

    select pv.id into v_variant
      from public.product_variant pv
     where pv.workspace_id = w.ws_id
     order by pv.name
     limit 1;

    select l.id into v_price_loc
      from public.location l
     where l.workspace_id = w.ws_id
       and not exists (select 1 from public.price_list pl
                        where pl.variant_id = v_variant
                          and pl.location_id = l.id)
     order by l.name
     limit 1;

    -- A null here would be a payload built against a workspace that does not
    -- hold what it needs, and the suite would measure a NOT NULL violation and
    -- call it isolation. Refuse to build one instead.
    if v_owner_member is null or v_owner_user is null or v_loc is null
       or v_family is null or v_variant is null or v_price_loc is null then
      raise exception
        'workspace % cannot supply a payload: member=% loc=% family=% variant=% price_loc=%',
        w.tag, v_owner_member, v_loc, v_family, v_variant, v_price_loc;
    end if;

    insert into ins_stmt (target, tbl, stmt) values

      -- location_insert: has_role(workspace_id, 'owner')
      (w.tag, 'location', format(
        'insert into public.location (workspace_id, name) values (%L, %L)',
        w.ws_id, 'pgTAP 3.2b-ii bodega')),

      -- workspace_member_insert: has_role(workspace_id, 'owner').
      -- The user is this file's fixture, so the unique (workspace_id, user_id)
      -- is free in BOTH workspaces and the same payload works either way.
      (w.tag, 'workspace_member', format(
        'insert into public.workspace_member (workspace_id, user_id, role) values (%L, %L, %L)',
        w.ws_id, '3b2b0001-0000-0000-0000-000000000009', 'staff')),

      -- member_location_insert: has_role(workspace_id, 'owner').
      -- Both FKs are composite, so member and location must be the same
      -- workspace's — which is why this one is resolved and not written out.
      (w.tag, 'member_location', format(
        'insert into public.member_location (workspace_id, member_id, location_id) values (%L, %L, %L)',
        w.ws_id, v_owner_member, v_loc)),

      -- product_family_insert: has_role(workspace_id, 'manager')
      (w.tag, 'product_family', format(
        'insert into public.product_family (workspace_id, name) values (%L, %L)',
        w.ws_id, 'pgTAP 3.2b-ii familia')),

      -- product_variant_insert: has_role(workspace_id, 'manager').
      -- ⚠️ All four unit codes are 'pza' on purpose: the dimension trigger is a
      -- BEFORE trigger and fires ahead of the policy, so a payload that spanned
      -- mass and count would be refused by arithmetic and never reach RLS.
      (w.tag, 'product_variant', format(
        'insert into public.product_variant (workspace_id, family_id, name, '
        || 'base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code) '
        || 'values (%L, %L, %L, %L, %L, %L, %L)',
        w.ws_id, v_family, 'pgTAP 3.2b-ii variante', 'pza', 'pza', 'pza', 'pza')),

      -- provider_insert: has_role(workspace_id, 'manager').
      -- `is_generic` is left at its default false: the partial unique index
      -- allows exactly one generic provider per workspace and onboarding already
      -- made it.
      (w.tag, 'provider', format(
        'insert into public.provider (workspace_id, name) values (%L, %L)',
        w.ws_id, 'pgTAP 3.2b-ii proveedor')),

      -- price_list_insert: has_role(workspace_id, 'manager').
      -- A far-future `effective_from` at a location that holds no price for this
      -- variant: the seed's rows are open-ended, so any date at all would overlap
      -- them if the scope collided.
      (w.tag, 'price_list', format(
        'insert into public.price_list (workspace_id, variant_id, location_id, '
        || 'price_per_base, effective_from) values (%L, %L, %L, 1.500000, %L)',
        w.ws_id, v_variant, v_price_loc, '2099-01-01')),

      -- workspace_invite_insert: has_role(workspace_id, 'manager').
      -- `token_hash` is globally unique, so it carries the workspace id — which
      -- is a uuid, and therefore masked away by F8 along with the others.
      (w.tag, 'workspace_invite', format(
        'insert into public.workspace_invite (workspace_id, email, role, invited_by, token_hash) '
        || 'values (%L, %L, %L, %L, %L)',
        w.ws_id, 'invitee.3.2b-ii@pgtap.invalid', 'staff', v_owner_user,
        'pgtap-3.2b-ii-' || w.ws_id));
  end loop;
end;
$$;

-- The eight tables as they stood before anything ran, for F11. Taken as
-- postgres, so it is the truth and not a filtered view of it.
create temp table ins_before (tbl name primary key, n int);

do $$
declare r record; v_n int;
begin
  for r in select tbl from ins_granted order by tbl loop
    execute format('select count(*)::int from public.%I', r.tbl) into v_n;
    insert into ins_before values (r.tbl, v_n);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- The measurements — every statement, run by both owners
--
-- 32 of them: 8 tables × 2 target workspaces × 2 callers. `actor = target` is
-- the positive control and must insert exactly one row; `actor <> target` is the
-- cross-wall attempt and must be refused by the policy. The statement text is
-- carried into the result table so F7 can assert from the MEASUREMENTS that the
-- accepted and the refused run were the same string, rather than from this
-- file's promise that they were.
-- ---------------------------------------------------------------------------
create temp table ins_result (
  tbl       name,
  target    text,
  actor     text,
  stmt      text not null,
  mode      text,
  n_rows    int,
  state     text,
  msg       text,
  role_seen name,
  primary key (tbl, target, actor)
);

do $$
declare
  a   record;
  s   record;
  res record;
begin
  for a in select tag, user_id from ins_actor order by tag loop
    perform set_config('request.jwt.claims',
      json_build_object('sub', a.user_id, 'role', 'authenticated')::text, true);

    for s in select target, tbl, stmt from ins_stmt order by tbl, target loop
      execute 'set role authenticated';
      select * into res from pg_temp.attempt(s.stmt);
      execute 'reset role';
      insert into ins_result
        values (s.tbl, s.target, a.tag, s.stmt,
                res.mode, res.n_rows, res.state, res.msg, res.role_seen);
    end loop;
  end loop;

  perform set_config('request.jwt.claims', null, true);
end;
$$;

create temp table ins_after (tbl name primary key, n int);

do $$
declare r record; v_n int;
begin
  for r in select tbl from ins_granted order by tbl loop
    execute format('select count(*)::int from public.%I', r.tbl) into v_n;
    insert into ins_after values (r.tbl, v_n);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- The plan is COMPUTED from what was measured, never hardcoded: 11 fixed tests
-- and one per measurement. F1 and F4 are what stop that arithmetic from being
-- satisfied by measuring nothing.
-- ---------------------------------------------------------------------------
select plan(11 + (select count(*)::int from ins_result));

-- ---------------------------------------------------------------------------
-- Fixed tests F1–F11
-- ---------------------------------------------------------------------------

-- F1. EVERY INSERT-GRANTED TABLE HAS A PAYLOAD HERE, AND NOTHING ELSE DOES.
-- ⚠️ THIS IS 03's F17, DISCHARGED. 03 could only count the eight tables it was
-- deferring; a ninth would have joined the count and nothing would have asked
-- for its payload. Here a ninth arrives with no statement beside it and this
-- test fails naming it. The other direction matters too: a payload for a table
-- `authenticated` may NOT insert into would be measuring the grant wall, which
-- is 03's claim and not this file's.
select is_empty(
  $$ select g.tbl || ' is insert-granted and has no payload in 04' from ins_granted g
      where not exists (select 1 from ins_stmt s where s.tbl = g.tbl)
      union all
     select distinct s.tbl || ' has a payload but authenticated cannot insert into it'
       from ins_stmt s
      where not exists (select 1 from ins_granted g where g.tbl = s.tbl) $$,
  'F1 every table authenticated may insert into has a payload here, and only those'
);

-- F2. THE ROLE HAS NO WAY OUT. 02's and 03's F2, load-bearing for the same
-- reason: if `authenticated` bypassed RLS every refusal below would be an
-- accepted insert.
select ok(
  (select not rolsuper and not rolbypassrls from pg_roles where rolname = 'authenticated')
  and (select rolbypassrls from pg_roles where rolname = current_setting('session_authorization')),
  'F2 authenticated is neither superuser nor BYPASSRLS, and the session user is'
);

-- F3. THE SWITCH HAPPENED, per measurement, read from inside `attempt()` and not
-- from what this file believes it set.
select is(
  (select coalesce(array_agg(distinct role_seen), '{}') from ins_result),
  array['authenticated']::name[],
  'F3 every one of the 32 measurements ran under set role authenticated'
);

-- F4. THE FLOOR. Every per-row test below is generated from `ins_result`, so an
-- empty one is a plan of eleven passing tests and a green that asserted no
-- isolation at all.
select ok(
  (select count(*)::int from ins_result) = 32
  and (select count(*)::int from ins_result where actor <> target) = 16
  and (select count(*)::int from ins_result where actor =  target) = 16,
  'F4 eight tables were each measured in both directions, refused and accepted'
);

-- F5. NO MEASUREMENT CAME BACK `unclassified`. ⚠️ THIS IS THE ONE THAT CATCHES A
-- PAYLOAD REFUSED BY A CONSTRAINT — a NOT NULL, a foreign key, a unique index or
-- the dimension trigger all arrive with a sqlstate this suite does not recognise,
-- and every one of them would otherwise look like isolation working. It is also
-- what a Postgres release rewording either 42501 message turns red, rather than
-- silently collapsing `denied-grant` and `denied-check` into one fact.
select is_empty(
  $$ select tbl || ' target ' || target || ' actor ' || actor
          || ' [' || coalesce(state,'-') || '] ' || coalesce(msg,'')
       from ins_result where mode = 'unclassified' $$,
  'F5 no insert was refused in a way this suite could not classify'
);

-- F6. THE ATTRIBUTION. T-cross claims the refusal came from the table's INSERT
-- policy, and on an INSERT that claim is available in a way 03 found it was not
-- for updates: nothing is read, so no SELECT policy stands in front, and with no
-- RETURNING clause none is applied to the new row either. What has to hold for
-- that to be true is checked rather than assumed — exactly one permissive INSERT
-- policy per table, granted to `authenticated`, carrying a WITH CHECK and no
-- USING (an INSERT policy cannot have one). ⚠️ A second permissive insert policy
-- arriving on any of these tables turns this red ON PURPOSE: permissive policies
-- are OR-ed, so the refusal would no longer be attributable to one predicate.
select is_empty(
  $$ select g.tbl || ': ' || cardinality(pol.names) || ' permissive insert policies '
          || coalesce(array_to_string(pol.names, ', '), '')
       from ins_granted g
       cross join lateral (
         select array_agg(p.polname order by p.polname) as names,
                bool_and(p.polwithcheck is not null and p.polqual is null) as shaped
           from pg_policy p
           join pg_class c on c.oid = p.polrelid
           join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = g.tbl
            and p.polcmd = 'a' and p.polpermissive
            and 'authenticated' = any (select rolname from pg_roles
                                        where oid = any (p.polroles))
       ) pol
      where pol.names is null or cardinality(pol.names) <> 1 or not pol.shaped $$,
  'F6 each table has exactly one permissive INSERT policy for authenticated, WITH CHECK and no USING'
);

-- F7. THE ACCEPTED STATEMENT AND THE REFUSED STATEMENT ARE THE SAME STRING.
-- This is the heart of the file. "Same payload" would be a claim about intent;
-- this is a claim about the text that ran, read back out of the measurements. If
-- the two ever differ, the pair has stopped being a control and the difference —
-- not the policy — could be what changed the outcome.
select is_empty(
  $$ select r.tbl || ' target ' || r.target || ': the two callers ran different statements'
       from ins_result r
       join ins_result q on q.tbl = r.tbl and q.target = r.target and q.actor <> r.actor
      where q.stmt is distinct from r.stmt $$,
  'F7 for every table, the owner and the stranger ran byte-identical SQL'
);

-- F8. AND THE TWO WORKSPACES' STATEMENTS ARE THE SAME PAYLOAD. Every id in a
-- payload is resolved from the workspace it is aimed at, so the two texts cannot
-- be identical — but with the uuids masked out they must be, or the two
-- workspaces are being asked for different things and the direction that passes
-- is not evidence about the direction that fails.
select is_empty(
  $$ with masked as (
       select tbl, target,
              regexp_replace(stmt,
                '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
                '<uuid>', 'g') as shape
         from ins_stmt)
     select a.tbl || ': the two workspaces were sent different payloads'
       from masked a join masked b on b.tbl = a.tbl and b.target > a.target
      where a.shape is distinct from b.shape $$,
  'F8 the payload aimed at A and the payload aimed at B differ only in their uuids'
);

-- F9. THE FIXTURE IS THIS SUITE'S, AND IT SAYS SO. 02's F9 and 03's F10, for the
-- same reason: if a future seed adds this user, this turns red and someone
-- decides whether the fixture is still wanted, rather than the suite quietly
-- building its payload around somebody else's row.
select is((select n_user from ins_fixture_before), 0,
  'F9 the invitee user was absent from auth.users; this suite supplied it');

-- F10. THE STRANGER IS A STRANGER. Two owners, two distinct workspaces, neither a
-- member of the other's — without which "refused" would be a fact about a
-- missing role and not about the tenant wall.
select ok(
  (select count(*) = 2 from ins_actor where ws_count = 1 and ws_id is not null)
  and (select count(distinct ws_id) = 2 from ins_actor)
  and (select coalesce(sum(cross_member), 0)::int = 0 from ins_actor),
  'F10 two owners, two distinct workspaces, neither a member of the other''s'
);

-- F11. THE SUITE PUT EVERYTHING BACK. Sixteen of the thirty-two attempts are
-- accepted inserts, and the next CI step reads this database.
select is_empty(
  $$ select b.tbl from ins_before b join ins_after a on a.tbl = b.tbl
      where b.n is distinct from a.n $$,
  'F11 every insert was undone: the eight tables hold what they held before'
);

-- ---------------------------------------------------------------------------
-- The cross-wall insert — refused by the table's INSERT policy, and by nothing
-- else. The mode is `denied-check`: the row was formed, every constraint that
-- fires before RLS was satisfied, and the WITH CHECK predicate refused it.
-- ---------------------------------------------------------------------------
select is(mode, 'denied-check',
  'T-cross ' || tbl || ' owner ' || actor
    || ' cannot insert a new row into workspace ' || target)
from ins_result where actor <> target order by tbl, actor;

-- ---------------------------------------------------------------------------
-- The positive control — THE SAME STATEMENT, run by the workspace it names.
-- Exactly one row, so "rejected" above cannot have meant "the payload was
-- malformed".
-- ---------------------------------------------------------------------------
select ok(mode = 'applied' and n_rows = 1,
  'T-own ' || tbl || ' owner ' || actor
    || ' inserts that identical row into workspace ' || target || ' — so T-cross measured a policy')
from ins_result where actor = target order by tbl, actor;

-- ---------------------------------------------------------------------------
-- `finish(exception_on_failure := true)` RAISES so psql exits non-zero; plain
-- psql prints "not ok" and exits 0. Same reasoning, and the same spelling trap,
-- as 01, 02 and 03 document at their own tails.
--
-- The ROLLBACK is the second of the two undo mechanisms — `attempt()` undoes each
-- write as it is measured, and this undoes the `auth.users` fixture. It is not
-- reached when a test fails: psql stops on the exception and drops the
-- connection, which rolls the transaction back anyway.
-- ---------------------------------------------------------------------------
select * from finish(exception_on_failure := true);

-- ---------------------------------------------------------------------------
-- THE GUARD `finish()` DOES NOT PROVIDE  (plan task 3.3, corrected in 3.4)
--
-- `exception_on_failure := true` above is the single mechanism turning a red
-- assertion into a non-zero exit. pgTAP DISARMS it when the plan does not match
-- the number of tests run. From its own `_finish`:
--
--     IF curr_test <> exp_tests THEN
--         RETURN NEXT diag('Looks like you planned ... but ran ...');
--     ELSIF num_faild > 0 THEN
--         IF raise_ex THEN RAISE EXCEPTION ...
--
-- An ELSIF. A miscounted plan takes the first branch, the exception in the
-- second is never reached, and psql exits 0 with `not ok` lines in its output —
-- the vacuous green ADR-035 Sec 9 exists to refuse. .github/workflows/db.yml is
-- the backstop for every suite here; this is the per-file half, so the file
-- also defends itself when it is run by hand.
--
-- ⚠️ IT COMPARES pgTAP'S OWN TWO NUMBERS AND NOTHING OF THIS FILE'S. 3.3 wrote
-- this guard against the suite's own computed `planned` column, which asks only
-- "did the loop emit what the arithmetic said" and misses `plan()` being CALLED
-- with something else — `plan(planned + 1)` leaves curr_test equal to `planned`
-- and sails through. `tap._get('plan')` is the number pgTAP was actually given.
-- Falsified in 3.4 both ways round.
-- ---------------------------------------------------------------------------
do $$
declare
  v_planned int := tap._get('plan');
  v_ran     int := tap._get('curr_test');
begin
  if v_ran is distinct from v_planned then
    raise exception
      'plan/actual mismatch: plan() was given %, % tests ran — finish() reports '
      'this as a diagnostic and does NOT raise, so exception_on_failure was '
      'disarmed and any failing test above exited 0', v_planned, v_ran;
  end if;
end;
$$;

rollback;

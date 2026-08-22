-- ============================================================================
-- 03 — RLS ISOLATION, WRITES (behavioural) — the three refusals that need no
--      fabricated row
--
-- ADR-035 §2.10, second row: "a user in workspace A reading or WRITING workspace
-- B gets zero rows and a rejection." Plan task 3.2b-i. 02 made the reading half
-- of that sentence; this file makes the writing half, minus one case that needs
-- a payload and is task 3.2b-ii (see WHAT THIS FILE DOES NOT CLAIM).
--
-- ⚠️ "A REJECTION" IS THREE DIFFERENT FACTS, AND THIS SUITE NAMES WHICH.
-- The plan's original row for 3.2b expected two. Probing the applied schema
-- found three, and they fail in visibly different ways:
--
--   denied-grant    `authenticated` holds no privilege on (table, verb), so
--                   Postgres refuses at the ACL check — BEFORE the row is
--                   formed and BEFORE any policy is consulted. RLS is not what
--                   stopped this write, and a suite that reports it as "RLS
--                   works" is reporting a wall it never tested.
--                   Looks like: 42501 "permission denied for table <t>"
--
--   filtered        The USING predicate made the other workspace's rows
--                   invisible, so an UPDATE or DELETE aimed across the wall
--                   matches nothing. ⚠️ THE STATEMENT SUCCEEDS. There is no
--                   error, no warning, and nothing in the result to distinguish
--                   it from a statement that did nothing for any other reason —
--                   which is why every one of these carries a POSITIVE CONTROL
--                   below: the identical statement aimed at the caller's own
--                   workspace must affect more than zero rows.
--                   Looks like: no error, row_count = 0
--
--   denied-check    A row-security policy refused the NEW ROW IMAGE. Reached
--                   here by taking one of the caller's own rows and trying to
--                   MOVE it across the wall — `set workspace_id = <B>`. It is
--                   the one of the three that "row_count = 0" can never make:
--                   the rows WERE found and the write WAS attempted.
--                   Looks like: 42501 "new row violates row-level security
--                   policy for table <t>"
--
--                   ⚠️ AND IT IS NOT THE UPDATE POLICY'S `with check` THAT
--                   FIRES — see THE WITH CHECK IS SHADOWED below. The mode is
--                   named for the error, not for the predicate.
--
-- ⚠️ TWO OF THE THREE SHARE SQLSTATE 42501. The mechanism can only be told
-- apart by the message text, so `pg_temp.attempt()` classifies on the message
-- and records `unclassified` for anything matching neither. F11 asserts no
-- measurement anywhere came back unclassified — which is what a future Postgres
-- rewording turns red, rather than quietly collapsing two different facts into
-- one and staying green.
--
-- ⚠️ EVERY MEASUREMENT OF A SIGNED-IN CALLER RUNS UNDER `set role
-- authenticated`, for the reason 02 documents at length: `postgres` carries
-- BYPASSRLS on this project, so the identical statements run as the session user
-- are refused by nothing and pass vacuously. F2 asserts the role has no way out
-- of RLS; F3 asserts the switch actually happened, per measurement, from what
-- the measurement recorded rather than from what this comment claims.
--
-- ⚠️ THE APPEND-ONLY BLOCK IS THE ONE THAT RUNS AS THE BYPASSING ROLE, ON
-- PURPOSE. The eight transaction-document tables grant `authenticated` nothing
-- but `select`, so a signed-in user never reaches their immutability triggers —
-- the grant stops them first, and that is F13. The triggers are therefore the
-- ONLY wall standing in front of a role that holds the privilege and bypasses
-- RLS, which on this project is `postgres` and `service_role` (F12). So they are
-- exercised from exactly there.
--
-- ⚠️ THE WITH CHECK IS SHADOWED, ON EVERY UPDATE POLICY IN THIS SCHEMA — found
-- by falsification while this suite was being written, and the reason T-move is
-- worded the way it is. All eight update policies are written with USING and
-- WITH CHECK as the SAME expression (F18), and that makes the WITH CHECK half
-- unreachable as a FIRST cause of refusal:
--
--   * if USING fails, no row is selected for update, so the write never gets far
--     enough for a WITH CHECK to be evaluated — the result is `filtered`, and a
--     staff user updating a provider in their own workspace was confirmed to
--     land there rather than on a check violation;
--   * if USING passes, the caller holds the role on that workspace, so the only
--     new row image the WITH CHECK would reject is one that has MOVED to another
--     workspace — and that image is also invisible to the table's SELECT policy,
--     which Postgres applies to the post-update row and which refuses it FIRST.
--
-- Confirmed both ways: `alter policy provider_update with check (true)` leaves
-- this entire suite green, and the move is still refused; open the SELECT policy
-- as well and the refusal that finally arrives is a unique violation, not a
-- policy one. So the `with check` clauses on these eight policies are
-- defence in depth rather than load-bearing walls, and NOTHING BEHAVIOURAL CAN
-- OBSERVE THEM. That is a fact about the schema, recorded in docs/PLAN.md; it is
-- not a defect this suite is entitled to paper over by claiming the credit for a
-- refusal that came from somewhere else.
--
-- F18 is what keeps the attribution honest: it asserts the two conditions above
-- still hold, so a migration that makes USING and WITH CHECK differ turns this
-- suite red and whoever is there re-derives what T-move is testing.
--
-- WHO THE TWO USERS ARE. The same two owners 02 uses, by the fixed uuids
-- 00_skeleton promises tests will name: `5eed0001-…-0001` owns Tienda Doña Lupe
-- and `5eed0001-…-0005` owns Abarrotes El Roble. Owners rather than cashiers for
-- 02's reason — the claim is about the TENANT wall with the store wall held
-- open. The store wall is 3.3.
--
-- WHY THE GRANT WALL IS MEASURED ONCE AND THE TENANT WALLS TWICE. A table
-- privilege is held by the ROLE, not by the user: `authenticated` either has
-- `insert on public.sale` or it does not, and both owners meet the identical
-- ACL. Measuring it from both would be duplication, not a second claim — so it
-- is measured as owner A, and F14 asserts the two actors really do share one
-- role so the wall cannot differ between them. `filtered` and `denied-check`
-- depend on which workspace the caller belongs to, so those ARE measured in both
-- directions: a policy accidentally written against a hardcoded workspace would
-- pass one direction and fail the other.
--
-- ⚠️ THIS FILE OPENS A TRANSACTION AND ROLLS IT BACK, and it needs to more than
-- 02 did. A write suite is mostly rejected writes, but its positive controls are
-- accepted ones — the DELETE that proves `filtered` was not zero-for-some-other-
-- reason really does delete 365 price-list rows before it is undone. Two
-- mechanisms keep that off the database the next CI step reads: every individual
-- write is undone by `pg_temp.attempt()` the instant it is measured (see there),
-- and the whole file is one transaction that ends in `rollback`. F15 checks the
-- ledger is unchanged at the end, from row counts taken at the start.
--
-- The `workspace_invite` fixture is 02's, and it is here for 02's reason: it is
-- the one tenant table the seed leaves empty in both workspaces, and both its
-- cross-tenant DELETE and that delete's positive control would be zero-row
-- non-events without it. 3.2a's finding, and the plan records that fixing the
-- seed instead is the owner's call.
--
-- WHAT THIS FILE DOES NOT CLAIM. It does not insert a NEW row into workspace B.
-- The eight tables `authenticated` may insert into each need a payload valid
-- enough to reach the WITH CHECK — and, more to the point, a proof that the
-- payload IS valid, by the same payload being accepted into the caller's own
-- workspace. Without that pairing "the insert was rejected" may mean a missing
-- `provider_id`, and the suite is green about the wrong wall. That is task
-- 3.2b-ii, it is the whole of why 3.2b split, and F16/F17 hold the deferral open
-- so a ninth insert-granted table cannot join it quietly. Nothing about
-- locations — 3.3. Nothing about the RPCs, which do not exist yet.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off
set search_path = tap, public, pg_catalog;
set client_min_messages = warning;

begin;

-- ---------------------------------------------------------------------------
-- `pg_temp.attempt()` — one write, measured and then UNDONE
--
-- Every write in this file goes through here, and the reason is the middle
-- branch: a positive control has to genuinely succeed to be worth anything, and
-- a suite that leaves 365 deleted rows behind for the next measurement to count
-- is a suite whose later results depend on the order of its earlier ones.
--
-- So a statement that SUCCEEDS is immediately undone by raising `TU001` from
-- inside the block that ran it. That rolls the plpgsql subtransaction back,
-- taking the write with it — while the OUT parameters, which are variables and
-- not database state, survive to be returned. `TU001` is a custom SQLSTATE
-- chosen not to collide with anything the schema raises; the immutability
-- triggers use 23001 and a bare `raise exception` would be P0001.
--
-- ⚠️ THE FUNCTION IS SECURITY INVOKER (the default) AND MUST STAY THAT WAY.
-- `security definer` here would run every statement as the function's owner —
-- `postgres`, which bypasses RLS — and every test in this file would pass
-- while measuring nothing. `role_seen` is recorded from inside the function for
-- that reason, so F3 reads the role the STATEMENT ran under and not the role the
-- caller believed it had set.
--
-- It lives in `pg_temp` rather than `public` because `public` is what 01's
-- coverage suite makes claims about, and it disappears with the transaction.
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
-- The two users, and the two workspaces, resolved from the ledger — 02's block,
-- unchanged, because the claim it supports is the same one.
-- ---------------------------------------------------------------------------
create temp table iso_actor (
  tag      text primary key,
  user_id  uuid not null,
  ws_id    uuid,
  ws_count int not null,
  cross_member int not null
);

insert into iso_actor (tag, user_id, ws_id, ws_count, cross_member)
select v.tag, v.user_id,
       (select wm.workspace_id from public.workspace_member wm
         where wm.user_id = v.user_id and wm.role = 'owner' and wm.is_active
         limit 1),
       (select count(*)::int from public.workspace_member wm
         where wm.user_id = v.user_id and wm.role = 'owner' and wm.is_active),
       0
from (values ('a', '5eed0001-0000-0000-0000-000000000001'::uuid),
             ('b', '5eed0001-0000-0000-0000-000000000005'::uuid)) as v(tag, user_id);

update iso_actor x
   set cross_member = (
     select count(*)::int from public.workspace_member wm
      where wm.user_id = x.user_id
        and wm.workspace_id = (select ws_id from iso_actor o where o.tag <> x.tag));

-- ---------------------------------------------------------------------------
-- The `workspace_invite` fixture, and the ledger's shape before anything ran
--
-- The invites are 02's fixture and exist for 02's reason (F10). `iso_before` is
-- this file's own: a write suite that undoes its writes should be able to prove
-- it, and F15 does, per table.
-- ---------------------------------------------------------------------------
create temp table iso_invite_before as
select count(*)::int as n from public.workspace_invite;

insert into public.workspace_invite (workspace_id, email, role, invited_by, token_hash)
select a.ws_id,
       'invite.' || a.tag || '@pgtap.invalid',
       'staff',
       a.user_id,
       'pgtap-3.2b-' || a.tag
from iso_actor a;

-- ---------------------------------------------------------------------------
-- Classification — 02's, plus the two columns a WRITE suite needs
--
-- `ws_col`  the tenant column, or null. A table this suite cannot place is a
--           table it is not testing, and F6 goes red naming it. Same reasoning
--           as 02, same single exempt name: `unit`.
-- `any_col` a column safe to name in a no-op `set` for the grant-wall probe. It
--           must not be GENERATED or an identity column: those raise at PARSE
--           time, and parse errors happen BEFORE the ACL check — so the probe
--           would come back `unclassified` (F11) with a message about a
--           generated column instead of the permission denial it went to find.
-- `n_b`     rows the OTHER workspace holds. F7's non-vacuity: "filtered to zero
--           rows" is worth nothing where there were no rows to filter.
-- ---------------------------------------------------------------------------
create temp table iso_table (
  tbl     name primary key,
  ws_col  name,
  exempt  boolean not null,
  any_col name not null,
  n_a     int,
  n_b     int
);

insert into iso_table (tbl, ws_col, exempt, any_col)
select c.relname,
       case
         when exists (select 1 from pg_attribute a
                       where a.attrelid = c.oid and a.attname = 'workspace_id'
                         and a.attnum > 0 and not a.attisdropped) then 'workspace_id'
         when c.relname = 'workspace' then 'id'
       end,
       c.relname = 'unit',
       (select a.attname from pg_attribute a
         where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
           and a.attgenerated = '' and a.attidentity = ''
         order by a.attnum limit 1)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r';

-- ---------------------------------------------------------------------------
-- THE PAIR REGISTER — every (table, verb) accounted for, exactly once
--
-- 20 tables × 3 write verbs = 60 pairs, and the point of this table is that a
-- pair cannot go unmeasured by being forgotten. `disposition` is computed from
-- the CATALOG, never hardcoded, so a migration that grants `authenticated` a new
-- privilege moves the pair from the grant wall to the tenant wall on its own and
-- the suite starts asserting the harder claim about it that same day.
--
--   grant-wall        no privilege held  -> expect denied-grant  (measured below)
--   cross-tenant      update/delete held -> expect filtered, with a control
--   deferred-3.2b-ii  insert held        -> needs a payload; F16 and F17
--
-- F1 asserts all 60 are here and none is unaccounted.
-- ---------------------------------------------------------------------------
create temp table iso_pair (
  tbl         name,
  verb        text,
  granted     boolean not null,
  disposition text not null,
  primary key (tbl, verb)
);

insert into iso_pair (tbl, verb, granted, disposition)
select t.tbl, v.verb,
       has_table_privilege('authenticated', ('public.' || quote_ident(t.tbl))::regclass, v.verb),
       case
         when not has_table_privilege('authenticated', ('public.' || quote_ident(t.tbl))::regclass, v.verb)
           then 'grant-wall'
         when v.verb = 'insert' then 'deferred-3.2b-ii'
         else 'cross-tenant'
       end
  from iso_table t cross join (values ('insert'), ('update'), ('delete')) as v(verb);

-- ---------------------------------------------------------------------------
-- The measurements
-- ---------------------------------------------------------------------------
create temp table iso_grant (        -- the ACL wall, as owner A
  tbl name, verb text, mode text, state text, msg text, role_seen name,
  primary key (tbl, verb)
);

create temp table iso_cross (        -- update/delete aimed ACROSS the wall
  tbl name, verb text, actor text, mode text, n_rows int, role_seen name,
  primary key (tbl, verb, actor)
);

create temp table iso_own (          -- the SAME statement aimed at one's own
  tbl name, verb text, actor text, mode text, n_rows int, role_seen name,
  primary key (tbl, verb, actor)
);

create temp table iso_move (         -- one's own row, pushed across the wall
  tbl name, actor text, mode text, state text, msg text, role_seen name,
  primary key (tbl, actor)
);

create temp table iso_append (       -- the immutability triggers, as the
  tbl name, verb text, mode text,    -- BYPASSING role — see the header
  state text, msg text, role_seen name,
  primary key (tbl, verb)
);

do $$
declare
  r       record;
  a       record;
  res     record;
  v_ws    uuid;
  v_other uuid;
  v_stmt  text;
  v_n     int;
begin
  -- Row counts per tenant table, per workspace, taken as postgres (BYPASSRLS)
  -- so they are the truth rather than what anyone can see. F7 reads n_b.
  for r in select tbl, ws_col from iso_table where ws_col is not null loop
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.ws_col)
      into v_n using (select ws_id from iso_actor where tag = 'a');
    update iso_table set n_a = v_n where tbl = r.tbl;
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.ws_col)
      into v_n using (select ws_id from iso_actor where tag = 'b');
    update iso_table set n_b = v_n where tbl = r.tbl;
  end loop;

  -- -------------------------------------------------------------------------
  -- 1. THE GRANT WALL, as owner A.
  --
  -- Statements chosen to reach the ACL check and nothing else. `insert … default
  -- values` never forms a row, `… where false` never matches one — so if any of
  -- these came back with a NOT NULL violation or a foreign key error, the ACL
  -- check would not have been what stopped it, and the mode would not be
  -- `denied-grant`. That ordering is Postgres's, and it is the reason this whole
  -- family needs no fixture: permission is checked before the row exists.
  -- -------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select user_id from iso_actor where tag = 'a'),
                      'role', 'authenticated')::text, true);

  for r in select p.tbl, p.verb, t.any_col
             from iso_pair p join iso_table t on t.tbl = p.tbl
            where p.disposition = 'grant-wall'
            order by p.tbl, p.verb
  loop
    v_stmt := case r.verb
      when 'insert' then format('insert into public.%I default values', r.tbl)
      when 'update' then format('update public.%I set %I = %I where false',
                                r.tbl, r.any_col, r.any_col)
      when 'delete' then format('delete from public.%I where false', r.tbl)
    end;
    execute 'set role authenticated';
    select * into res from pg_temp.attempt(v_stmt);
    execute 'reset role';
    insert into iso_grant values (r.tbl, r.verb, res.mode, res.state, res.msg, res.role_seen);
  end loop;

  -- -------------------------------------------------------------------------
  -- 2 and 3. THE TENANT WALL — the cross-tenant statement and its control.
  --
  -- Both directions, because these two are the ones that depend on WHO is
  -- asking. The two statements differ in exactly one place, the workspace uuid,
  -- which is what makes the control a control: if the cross-tenant form returns
  -- zero rows and the own-workspace form returns zero rows too, nothing has been
  -- shown about isolation and T-own is what says so.
  --
  -- The `set <ws_col> = <ws_col>` in the update form is a deliberate no-op: it
  -- is a valid new row image, so the WITH CHECK predicate accepts it and what is
  -- left under test is the USING predicate alone. Pushing a row to the OTHER
  -- workspace is the WITH CHECK claim and it is section 4, kept separate so the
  -- two predicates fail independently.
  -- -------------------------------------------------------------------------
  for a in select tag, user_id, ws_id from iso_actor order by tag loop
    v_ws    := a.ws_id;
    v_other := (select ws_id from iso_actor o where o.tag <> a.tag);
    perform set_config('request.jwt.claims',
      json_build_object('sub', a.user_id, 'role', 'authenticated')::text, true);

    for r in select p.tbl, p.verb, t.ws_col
               from iso_pair p join iso_table t on t.tbl = p.tbl
              where p.disposition = 'cross-tenant'
              order by p.tbl, p.verb
    loop
      -- across the wall
      v_stmt := case r.verb
        when 'update' then format('update public.%I set %I = %I where %I = %L',
                                  r.tbl, r.ws_col, r.ws_col, r.ws_col, v_other)
        when 'delete' then format('delete from public.%I where %I = %L',
                                  r.tbl, r.ws_col, v_other)
      end;
      execute 'set role authenticated';
      select * into res from pg_temp.attempt(v_stmt);
      execute 'reset role';
      insert into iso_cross values (r.tbl, r.verb, a.tag, res.mode, res.n_rows, res.role_seen);

      -- the same statement, aimed at home
      v_stmt := case r.verb
        when 'update' then format('update public.%I set %I = %I where %I = %L',
                                  r.tbl, r.ws_col, r.ws_col, r.ws_col, v_ws)
        when 'delete' then format('delete from public.%I where %I = %L',
                                  r.tbl, r.ws_col, v_ws)
      end;
      execute 'set role authenticated';
      select * into res from pg_temp.attempt(v_stmt);
      execute 'reset role';
      insert into iso_own values (r.tbl, r.verb, a.tag, res.mode, res.n_rows, res.role_seen);
    end loop;

    -- -----------------------------------------------------------------------
    -- 4. THE NEW ROW IMAGE — one of the caller's OWN rows, pushed across the
    --    wall. Refused by a POLICY, and not by the absence of rows to update.
    --
    -- Every table the caller may update, including `workspace` itself, whose
    -- tenant column is its own `id`. Moving a workspace onto the other's id
    -- would also collide with a primary key, and it does not get that far:
    -- the row policy refuses the new image before any index is touched, so what
    -- comes back is 42501 and not 23505. Checked, not assumed — a unique
    -- violation here would land as `unclassified` under F11, which is exactly
    -- what happens if RLS on the table is disabled.
    --
    -- ⚠️ The policy that refuses it is the SELECT policy, re-applied by Postgres
    -- to the post-update row — NOT the update policy's `with check`, which on
    -- this schema can never fire first. See THE WITH CHECK IS SHADOWED in the
    -- header, and F18.
    -- -----------------------------------------------------------------------
    for r in select p.tbl, t.ws_col
               from iso_pair p join iso_table t on t.tbl = p.tbl
              where p.verb = 'update' and p.disposition = 'cross-tenant'
                and t.ws_col is not null
              order by p.tbl
    loop
      v_stmt := format('update public.%I set %I = %L where %I = %L',
                       r.tbl, r.ws_col, v_other, r.ws_col, v_ws);
      execute 'set role authenticated';
      select * into res from pg_temp.attempt(v_stmt);
      execute 'reset role';
      insert into iso_move values (r.tbl, a.tag, res.mode, res.state, res.msg, res.role_seen);
    end loop;
  end loop;

  perform set_config('request.jwt.claims', null, true);

  -- -------------------------------------------------------------------------
  -- 5. THE APPEND-ONLY TRIGGERS, run as the SESSION role and not as a user.
  --
  -- This is the one block that deliberately does not switch roles, and the
  -- header says why: `authenticated` is refused these tables at the grant (F13),
  -- so from a signed-in caller the triggers are unreachable and untested. The
  -- roles that DO hold the privilege — `postgres` here, `service_role` in the
  -- API — also bypass RLS (F12), which leaves the trigger as the only wall in
  -- front of them. Measuring it from anywhere else would measure the grant again.
  --
  -- The table list is computed from `pg_trigger`, not written out, so an
  -- append-only table added by a future migration is covered the day it lands.
  -- -------------------------------------------------------------------------
  for r in select c.relname as tbl, t.any_col
             from pg_trigger g
             join pg_class c on c.oid = g.tgrelid
             join pg_namespace n on n.oid = c.relnamespace
             join iso_table t on t.tbl = c.relname
            where n.nspname = 'public' and not g.tgisinternal
              and g.tgname like '%\_immutable\_trg'
            group by c.relname, t.any_col
            order by c.relname
  loop
    v_stmt := format('update public.%I set %I = %I where ctid = (select ctid from public.%I limit 1)',
                     r.tbl, r.any_col, r.any_col, r.tbl);
    select * into res from pg_temp.attempt(v_stmt);
    insert into iso_append values (r.tbl, 'update', res.mode, res.state, res.msg, res.role_seen);

    v_stmt := format('delete from public.%I where ctid = (select ctid from public.%I limit 1)',
                     r.tbl, r.tbl);
    select * into res from pg_temp.attempt(v_stmt);
    insert into iso_append values (r.tbl, 'delete', res.mode, res.state, res.msg, res.role_seen);
  end loop;
end;
$$;

-- The ledger as it stands AFTER every write above, for F15. Taken as postgres,
-- so it is the truth and not a filtered view of it.
create temp table iso_after as
select t.tbl, t.n_a, t.n_b from iso_table t;

do $$
declare r record; v_n int;
begin
  for r in select tbl, ws_col from iso_table where ws_col is not null loop
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.ws_col)
      into v_n using (select ws_id from iso_actor where tag = 'a');
    update iso_after set n_a = v_n where tbl = r.tbl;
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.ws_col)
      into v_n using (select ws_id from iso_actor where tag = 'b');
    update iso_after set n_b = v_n where tbl = r.tbl;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- The plan is COMPUTED from what was measured, never hardcoded: 17 fixed tests,
-- one per grant-wall pair, one per cross-tenant measurement and one per control,
-- one per move, one per append-only probe. A table or a grant added by a future
-- migration is measured and asserted the day it lands. F1 and F5 are what stop
-- that arithmetic from being satisfied by measuring nothing.
-- ---------------------------------------------------------------------------
select plan(
  18
  + (select count(*)::int from iso_grant)
  + (select count(*)::int from iso_cross)
  + (select count(*)::int from iso_own)
  + (select count(*)::int from iso_move)
  + (select count(*)::int from iso_append)
);

-- ---------------------------------------------------------------------------
-- Fixed tests F1–F18
-- ---------------------------------------------------------------------------

-- F1. EVERY (TABLE, VERB) PAIR IS ACCOUNTED FOR. 20 tables × 3 write verbs. A
-- pair missing from the register is a write nobody looked at, and the register
-- is the only place the three dispositions are reconciled against the catalog.
select ok(
  (select count(*)::int from iso_pair) >= 60
  and not exists (select 1 from iso_pair
                   where disposition not in ('grant-wall','cross-tenant','deferred-3.2b-ii')),
  'F1 all 60 (table, verb) write pairs are registered, each with a known disposition'
);

-- F2. THE ROLE HAS NO WAY OUT. 02's F2, and it is load-bearing here for the same
-- reason: if `authenticated` bypassed RLS, every `filtered` below would be an
-- `applied` and every `denied-check` would be an accepted write.
select ok(
  (select not rolsuper and not rolbypassrls from pg_roles where rolname = 'authenticated')
  and (select rolbypassrls from pg_roles where rolname = current_setting('session_authorization')),
  'F2 authenticated is neither superuser nor BYPASSRLS, and the session user is'
);

-- F3. THE SWITCH HAPPENED, per measurement, from what each measurement recorded
-- inside `attempt()` — not from what this file believes it set.
select is(
  (select coalesce(array_agg(distinct role_seen), '{}') from (
     select role_seen from iso_grant
     union select role_seen from iso_cross
     union select role_seen from iso_own
     union select role_seen from iso_move) s),
  array['authenticated']::name[],
  'F3 every signed-in measurement ran under set role authenticated'
);

-- F4. AND THE APPEND-ONLY BLOCK DID NOT. It is the one family that must run as
-- the bypassing role; measuring it as `authenticated` would measure the grant.
select ok(
  (select count(*) = 0 from iso_append where role_seen = 'authenticated')
  and (select count(*) > 0 from iso_append),
  'F4 the append-only probes ran as the bypassing session role, not as a user'
);

-- F5. THE FLOOR. Every per-row test below is generated from a measurement table,
-- so empty ones are a plan of seventeen passing tests and a green that asserted
-- no isolation at all. These are what 0001–0004 applied.
select ok(
  (select count(*)::int from iso_grant)  >= 40
  and (select count(*)::int from iso_cross) >= 24
  and (select count(*)::int from iso_own)   >= 24
  and (select count(*)::int from iso_move)  >= 16
  and (select count(*)::int from iso_append) >= 16,
  'F5 the grant wall, both tenant walls and the triggers were all actually measured'
);

-- F6. NOTHING IN public WENT UNCLASSIFIED. 02's F6: a table this suite cannot
-- place is a table it is not testing.
select is_empty(
  $$ select tbl from iso_table where ws_col is null and not exempt $$,
  'F6 every table in public is tenant-scoped by a known column, or named exempt'
);

-- F7. NON-VACUITY, PER TABLE. "Filtered to zero rows" is worth nothing where the
-- other workspace had no rows to filter. Stated as the set of offenders so a
-- failure names the table.
select is_empty(
  $$ select tbl from iso_table where not exempt and (n_a = 0 or n_b = 0) $$,
  'F7 every tenant table held rows in BOTH workspaces when it was measured'
);

-- F8. THE CONTROLS CONTROLLED SOMETHING. F7 says the rows existed; this says the
-- statements reached them. Without it, `filtered` and "the WHERE clause was
-- wrong" are the same green.
select is_empty(
  $$ select tbl || '.' || verb || '/' || actor from iso_own
      where mode <> 'applied' or coalesce(n_rows, 0) = 0 $$,
  'F8 every cross-tenant statement affected rows when aimed at its own workspace'
);

-- F9. `unit` IS THE SINGLE DELIBERATE HOLE, still. 02's F8.
select ok(
  (select exempt from iso_table where tbl = 'unit')
  and (select count(*) = 1 from iso_table where exempt),
  'F9 unit is the single exempt table, and it is still the only one'
);

-- F10. THE FIXTURE IS THIS SUITE'S, AND IT SAYS SO. 02's F9: if a future seed
-- populates `workspace_invite`, this turns red and someone decides whether the
-- fixture is still wanted, rather than the suite measuring somebody else's rows.
select is((select n from iso_invite_before), 0,
  'F10 workspace_invite was empty in the seed; this suite supplied its own rows');

-- F11. NO MEASUREMENT ANYWHERE CAME BACK `unclassified`. THIS IS THE ONE THAT
-- GUARDS THE OTHER SIXTEEN. Two of the three refusals share sqlstate 42501 and
-- are told apart by message text; a Postgres release that rewords either would
-- otherwise leave this suite green while it silently stopped distinguishing the
-- mechanisms it exists to distinguish. Any unexpected sqlstate lands here too.
select is_empty(
  $$ select tbl || '.' || verb || ' [' || coalesce(state,'-') || '] ' || coalesce(msg,'')
       from (select tbl, verb, mode, state, msg from iso_grant
             union all select tbl, 'update' as verb, mode, state, msg from iso_move
             union all select tbl, verb, mode, state, msg from iso_append) s
      where mode = 'unclassified' $$,
  'F11 no write was refused in a way this suite could not classify'
);

-- F12. THE BYPASSING ROLES ARE KNOWN AND NAMED. The append-only triggers are the
-- only wall in front of a role that holds the privilege and skips RLS, so which
-- roles those are is part of the claim rather than background.
select is(
  (select array_agg(rolname order by rolname) from pg_roles
    where rolbypassrls and rolname in ('anon','authenticated','service_role','postgres')),
  array['postgres','service_role']::name[],
  'F12 exactly postgres and service_role bypass RLS; anon and authenticated do not'
);

-- F13. AND A SIGNED-IN USER NEVER REACHES THOSE TRIGGERS. Every append-only
-- table refuses `authenticated` both write verbs at the grant, which is why the
-- probes above had to be run from somewhere else. If a migration ever grants one
-- of them an update, this goes red and the trigger stops being the only wall.
select is_empty(
  $$ select p.tbl || '.' || p.verb from iso_pair p
      where p.tbl in (select tbl from iso_append) and p.granted $$,
  'F13 no append-only table grants authenticated any write verb'
);

-- F14. THE TWO ACTORS SHARE ONE ROLE, which is what makes measuring the grant
-- wall once rather than twice honest: a table privilege is held by the role, so
-- both owners meet the identical ACL.
select ok(
  (select count(*) = 2 from iso_actor where ws_count = 1 and ws_id is not null)
  and (select count(distinct ws_id) = 2 from iso_actor)
  and (select coalesce(sum(cross_member), 0)::int = 0 from iso_actor),
  'F14 two owners, two distinct workspaces, neither a member of the other''s'
);

-- F15. THE SUITE PUT EVERYTHING BACK. Its positive controls really do delete
-- hundreds of rows before `attempt()` undoes them, and a suite whose later
-- measurements read a ledger its earlier ones changed is a suite whose results
-- depend on their own order.
select is_empty(
  $$ select b.tbl from iso_table b join iso_after a on a.tbl = b.tbl
      where b.n_a is distinct from a.n_a or b.n_b is distinct from a.n_b $$,
  'F15 every write was undone: the ledger is what it was before the suite ran'
);

-- F16. THE DEFERRAL IS EXACTLY WHAT 3.2b-ii OWES — inserts, and only inserts.
-- An update or delete arriving here would be a write this suite decided not to
-- test, which is not a decision it is allowed to make quietly.
select is_empty(
  $$ select tbl || '.' || verb from iso_pair
      where disposition = 'deferred-3.2b-ii' and verb <> 'insert' $$,
  'F16 nothing but an insert is deferred to 3.2b-ii'
);

-- F17. AND THERE ARE STILL EIGHT OF THEM. ⚠️ THIS TEST IS MEANT TO GO RED. A
-- ninth insert-granted table is a ninth cross-wall insert nobody has written a
-- payload for, and it would otherwise join the deferral register in silence.
-- 3.2b-ii replaces this count with the assertions themselves.
select is(
  (select count(*)::int from iso_pair where disposition = 'deferred-3.2b-ii'), 8,
  'F17 eight insert-granted tables are deferred to 3.2b-ii, and a ninth turns this red');

-- F18. THE ATTRIBUTION BEHIND T-move, ASSERTED RATHER THAN ASSUMED. T-move says
-- "refused by a policy" and not "refused by the WITH CHECK" because on this
-- schema the WITH CHECK cannot fire first — every update policy repeats its
-- USING expression as its WITH CHECK, and the SELECT policy refuses the moved
-- row image before the update policy is consulted about it. Both halves are
-- checked here. ⚠️ A migration that makes the two expressions differ on any of
-- these tables turns this red ON PURPOSE: the shadowing would no longer be
-- uniform, and what T-move is entitled to claim would have to be re-derived.
select is_empty(
  $$ select c.relname || '.' || p.polname from pg_policy p
       join pg_class c on c.oid = p.polrelid
      where c.relname in (select tbl from iso_move)
        and p.polcmd = 'w'
        and pg_get_expr(p.polqual, p.polrelid)
            is distinct from pg_get_expr(p.polwithcheck, p.polrelid)
      union all
     select t.tbl || ' has no select policy to shadow it' from iso_move t
      where not exists (select 1 from pg_policy p2
                         join pg_class c2 on c2.oid = p2.polrelid
                        where c2.relname = t.tbl and p2.polcmd = 'r') $$,
  'F18 every moved table repeats USING as WITH CHECK and carries a SELECT policy'
);

-- ---------------------------------------------------------------------------
-- The grant wall — the ACL refusal, before RLS is consulted at all
-- ---------------------------------------------------------------------------
select is(mode, 'denied-grant',
  'T-grant ' || tbl || '.' || verb || ' is refused to authenticated at the grant, before RLS')
from iso_grant order by tbl, verb;

-- ---------------------------------------------------------------------------
-- The tenant wall, both directions — the USING predicate, and its control
-- ---------------------------------------------------------------------------
select is(mode, 'filtered',
  'T-cross ' || tbl || '.' || verb || ' owner ' || actor
    || ' reaches none of the other workspace''s rows')
from iso_cross order by tbl, verb, actor;

select ok(mode = 'applied' and n_rows > 0,
  'T-own ' || tbl || '.' || verb || ' owner ' || actor
    || ' reaches ' || coalesce(n_rows, 0) || ' of its own — so T-cross measured something')
from iso_own order by tbl, verb, actor;

-- ---------------------------------------------------------------------------
-- The new row image — a row of one's own, pushed across the wall and refused
-- ---------------------------------------------------------------------------
select is(mode, 'denied-check',
  'T-move ' || tbl || ' owner ' || actor
    || ' has its own row refused by a policy when it moves it across the wall')
from iso_move order by tbl, actor;

-- ---------------------------------------------------------------------------
-- Append-only, as the role that bypasses RLS — the trigger is the last wall
-- ---------------------------------------------------------------------------
select is(mode, 'denied-trigger',
  'T-append ' || tbl || '.' || verb
    || ' is refused by the immutability trigger, even to a role that bypasses RLS')
from iso_append order by tbl, verb;

-- ---------------------------------------------------------------------------
-- `finish(exception_on_failure := true)` RAISES so psql exits non-zero; plain
-- psql prints "not ok" and exits 0. Same reasoning, and the same spelling trap,
-- as 01 and 02 document at their own tails.
--
-- The ROLLBACK below is the second of the two mechanisms named in the header —
-- `attempt()` undoes each write as it is measured, and this undoes the fixture
-- and anything `attempt()` was not asked about. It is not reached when a test
-- fails: psql stops on the exception and drops the connection, which rolls the
-- transaction back anyway.
-- ---------------------------------------------------------------------------
select * from finish(exception_on_failure := true);

rollback;

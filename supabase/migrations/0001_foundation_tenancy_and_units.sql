-- ============================================================================
-- 0001 — Foundation: tenancy, roles, RLS helpers, unit reference table
-- ============================================================================
-- ADR-035 §2.2, §2.3 (tenancy + reference), §2.7 (access)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * the `unit` reference table and its seed data (global, not tenant-scoped)
--   * the five tenancy tables
--   * the RLS helper functions every later policy depends on
--   * RLS enabled and policed on everything created here
--
-- Not in this migration: catalog, transactions, ledger, projections (0002+).
--
-- `workspace` is the TENANT (one business). `location` is the STORE. They were
-- the same row in the first draft of ADR-035; separating them is not cosmetic —
-- every ledger row is denominated by location, so retrofitting it after data
-- exists means backfilling a column whose correct historical value is unknowable.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------

-- ADR-035 §2.7 — three roles, not four. "Viewer" was dropped: nobody in a small
-- store has read-only access to their own operation.
create type public.workspace_role as enum ('staff', 'manager', 'owner');

-- Physical dimension of a unit. Conversion is only ever valid within a dimension.
create type public.unit_dimension as enum ('mass', 'volume', 'count');


-- ----------------------------------------------------------------------------
-- 2. Shared trigger helper
-- ----------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger: stamps updated_at.';


-- ----------------------------------------------------------------------------
-- 3. Unit reference table  (ADR-035 §2.5)
-- ----------------------------------------------------------------------------
-- Conversion factors are physics, not user data. Users select from this table;
-- they never define their own factors. A user-defined factor is an unbounded
-- support burden for no benefit.
--
-- Every ledger quantity is stored in the *base* unit of its dimension — always
-- the smallest practical denomination. With kilograms as base, buying 1 kg and
-- selling 100 g ten times would never quite close. In grams it closes exactly.

create table public.unit (
  code            text primary key,
  dimension       public.unit_dimension not null,
  base_code       text not null references public.unit (code),
  factor_to_base  numeric(14,6) not null,
  display_order   smallint not null default 100,

  constraint unit_factor_positive check (factor_to_base > 0),
  -- A base unit is its own base, with factor exactly 1.
  constraint unit_base_is_identity check (
    (code <> base_code) or (factor_to_base = 1)
  )
);

comment on table public.unit is
  'Global unit reference. Not workspace-scoped: factors are physics. ADR-035 §2.5.';
comment on column public.unit.base_code is
  'The canonical unit for this dimension. Ledger quantities are stored in it.';

-- Base units first, then derived. FK checks fire at end of statement, so the
-- self-reference is safe either way, but splitting keeps intent obvious.
insert into public.unit (code, dimension, base_code, factor_to_base, display_order) values
  ('g',    'mass',   'g',   1, 40),
  ('ml',   'volume', 'ml',  1, 40),
  ('pza',  'count',  'pza', 1, 10);

insert into public.unit (code, dimension, base_code, factor_to_base, display_order) values
  ('kg',   'mass',   'g',   1000, 10),
  ('500g', 'mass',   'g',    500, 20),
  ('250g', 'mass',   'g',    250, 25),  -- "un cuarto de kilo"
  ('100g', 'mass',   'g',    100, 30),  -- the usual sell/price denomination
  ('l',    'volume', 'ml',  1000, 10),
  ('500ml','volume', 'ml',   500, 20),
  ('100ml','volume', 'ml',   100, 30);

-- The unit table is world-readable reference data. RLS on, single permissive
-- read policy — no workspace predicate, because there is no workspace column.
alter table public.unit enable row level security;

create policy unit_read_all on public.unit
  for select to authenticated
  using (true);


-- ----------------------------------------------------------------------------
-- 4. Workspace  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------

create table public.workspace (
  id                  uuid primary key default gen_random_uuid(),
  display_name        text not null,
  currency            text not null default 'MXN',

  -- ADR-035 §2.5 — asked once at onboarding ("¿Tus precios ya incluyen IVA?"),
  -- never surfaced at the counter. Decides how the RPC splits net from tax.
  prices_include_tax  boolean not null default true,

  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint workspace_display_name_not_blank check (btrim(display_name) <> '')
);

create trigger workspace_set_updated_at
  before update on public.workspace
  for each row execute function public.set_updated_at();

comment on column public.workspace.prices_include_tax is
  'Mexican retail convention: shelf prices include IVA, supplier invoices break it '
  'out. Capturing both raw would overstate margin by up to the tax rate. ADR-035 §2.5.';


-- ----------------------------------------------------------------------------
-- 5. Location  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------
-- A physical store. One is seeded at onboarding, so v1 renders no location
-- picker and costs no taps; the column exists because a second store for the
-- same owner is expected within ~6 months and `location_id` on the ledger is a
-- one-way door (ADR-035 §4).
--
-- Catalog, providers and price lists stay workspace-level: one catalog, separate
-- shelves. Stock, movements and documents are location-level, from 0002 onward.

create table public.location (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspace (id) on delete cascade,
  name          text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint location_name_not_blank check (btrim(name) <> ''),

  -- Referenced by the composite FK on member_location. A plain FK to id alone
  -- would let a member of workspace A be assigned a location in workspace B.
  constraint location_id_workspace_unique unique (id, workspace_id)
);

-- Case- and whitespace-insensitive uniqueness. Catalog tables use a stored
-- `normalized_name` (ADR-004) because they are searched; a location list is
-- never longer than a handful of rows, so an expression index is enough.
create unique index location_name_unique_idx
  on public.location (workspace_id, lower(btrim(name)));

create index location_by_workspace_idx
  on public.location (workspace_id)
  where is_active;

create trigger location_set_updated_at
  before update on public.location
  for each row execute function public.set_updated_at();

comment on table public.location is
  'A physical store. The tenant is `workspace`; the shelf is `location`. '
  'Every ledger row from 0002 onward carries location_id. ADR-035 §2.3.';


-- ----------------------------------------------------------------------------
-- 6. Workspace membership  (ADR-035 §2.3, §2.7)
-- ----------------------------------------------------------------------------
-- Membership resolves on auth.uid(). The Power Platform build matched on user
-- display name (prov-V1-BUILD-LOG.md D-06), which is neither unique nor
-- immutable — two staff sharing a name in different workspaces would have read
-- each other's data.

create table public.workspace_member (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspace (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          public.workspace_role not null default 'staff',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint workspace_member_unique unique (workspace_id, user_id),

  -- See the note on location_id_workspace_unique above.
  constraint workspace_member_id_workspace_unique unique (id, workspace_id)
);

-- Drives my_workspaces() on every single request. Partial: inactive members are
-- never the answer to "which workspaces can this user see?".
create index workspace_member_lookup_idx
  on public.workspace_member (user_id, workspace_id)
  where is_active;

create index workspace_member_by_workspace_idx
  on public.workspace_member (workspace_id)
  where is_active;

create trigger workspace_member_set_updated_at
  before update on public.workspace_member
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- 7. Member ↔ location assignment  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- A join table, not a `location_id` column on workspace_member: the owner will
-- move a cashier between stores to cover a shift, and that must not be a role
-- change.
--
-- Only staff need rows here. my_locations() gives managers and owners every
-- location by role — deliberately NOT by "this member has no assignment rows,
-- so show everything", which is fail-open. A forgotten insert would then leak
-- the other store rather than lock someone out of their own.
--
-- workspace_id is carried and both FKs are composite, so the database refuses a
-- member/location pair from two different tenants. A plain pair of FKs would not.

create table public.member_location (
  workspace_id  uuid not null,
  member_id     uuid not null,
  location_id   uuid not null,
  created_at    timestamptz not null default now(),

  primary key (member_id, location_id),

  constraint member_location_member_fk
    foreign key (member_id, workspace_id)
    references public.workspace_member (id, workspace_id) on delete cascade,

  constraint member_location_location_fk
    foreign key (location_id, workspace_id)
    references public.location (id, workspace_id) on delete cascade
);

create index member_location_by_location_idx
  on public.member_location (location_id);

comment on table public.member_location is
  'Which locations a staff member may work at. Managers and owners are granted '
  'every location by role, not by rows here. ADR-035 §2.7.';


-- ----------------------------------------------------------------------------
-- 8. Workspace settings  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------
-- One row per workspace, enforced by a unique constraint the Dataverse design
-- specified (ADR-033) but never created — which left LookUp() picking a settings
-- row non-deterministically when more than one existed.

create table public.workspace_setting (
  workspace_id          uuid primary key references public.workspace (id) on delete cascade,

  -- UI prefill behaviour only. Prices themselves are derived from transaction
  -- history, never stored in a mutable cache column (ADR-035 §2.3).
  use_last_sell_price   boolean not null default true,

  -- ADR-035 §2.7 — self-service void window. Beyond it, manager role required.
  void_window_minutes   smallint not null default 15,

  -- ADR-035 §2.6 — the enforcement path exists in the RPC but ships dormant.
  -- The pilot decides whether oversales are a real problem before this is exposed.
  enforce_stock_default boolean not null default false,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint workspace_setting_void_window_sane
    check (void_window_minutes between 0 and 1440)
);

create trigger workspace_setting_set_updated_at
  before update on public.workspace_setting
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- 9. RLS helpers  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- Deliberately NOT a JWT claim. A claim is a snapshot: revoke someone's
-- membership and their existing token keeps working until it expires — full
-- write access to a workspace they were removed from, for exactly the person you
-- most want cut off. A live membership read takes effect on the next query.
--
-- SECURITY DEFINER is what breaks the recursion: the function reads
-- workspace_member without triggering that table's own RLS policy.
-- search_path is pinned empty and every name fully qualified, so the definer
-- context cannot be hijacked by a caller-controlled search_path.

create function public.my_workspaces()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select wm.workspace_id
    from public.workspace_member wm
   where wm.user_id = auth.uid()
     and wm.is_active
$$;

comment on function public.my_workspaces() is
  'Workspace ids the caller is an active member of. The predicate behind every '
  'tenant_isolation policy. Set-returning, so many-workspaces-per-user works '
  'from day one even though every real user has exactly one. ADR-035 §2.7.';


-- Staff are scoped to a location, not to a workspace. Managers and owners get
-- every active location in their workspaces by role; staff get only locations
-- they are explicitly assigned to.
--
-- FAIL-CLOSED, deliberately. The tempting alternative — "a member with no
-- member_location rows sees everything" — fails in the wrong direction: one
-- forgotten insert silently shows a cashier the other store's takings, and
-- nobody reports it. Under this rule the same mistake locks them out of their
-- own store, which is a support ticket within five minutes.
create function public.my_locations()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.id
    from public.location l
    join public.workspace_member wm
      on wm.workspace_id = l.workspace_id
   where wm.user_id = auth.uid()
     and wm.is_active
     and l.is_active
     and (
           wm.role >= 'manager'
        or exists (
             select 1
               from public.member_location ml
              where ml.member_id = wm.id
                and ml.location_id = l.id
           )
         )
$$;

comment on function public.my_locations() is
  'Location ids the caller may act in. Managers and owners: every active '
  'location in their workspaces. Staff: explicit member_location rows only. '
  'Fail-closed by role, never by absence of rows. ADR-035 §2.7.';


create function public.my_role(p_workspace_id uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = ''
as $$
  select wm.role
    from public.workspace_member wm
   where wm.user_id = auth.uid()
     and wm.workspace_id = p_workspace_id
     and wm.is_active
$$;

comment on function public.my_role(uuid) is
  'Caller role in one workspace, or null if not a member. ADR-035 §2.7.';


create function public.has_role(p_workspace_id uuid, p_min public.workspace_role)
returns boolean
language sql
stable
as $$
  -- Enum order is staff < manager < owner, so >= is a privilege floor.
  select coalesce(public.my_role(p_workspace_id) >= p_min, false)
$$;

comment on function public.has_role(uuid, public.workspace_role) is
  'True when the caller holds at least the given role. Relies on workspace_role '
  'enum ordering (staff < manager < owner).';


-- ----------------------------------------------------------------------------
-- 10. Onboarding  (ADR-035 §2.6)
-- ----------------------------------------------------------------------------
-- The bootstrap ordering problem: the first workspace_member row must be written
-- by something not yet governed by the policy it is about to create. One
-- SECURITY DEFINER function, deliberate and auditable, rather than a scattering
-- of privileged writes.

create function public.onboard_workspace(
  p_display_name       text,
  p_prices_include_tax boolean default true,
  p_location_name      text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id      uuid := auth.uid();
  v_workspace_id uuid;
begin
  if v_user_id is null then
    raise exception 'onboard_workspace requires an authenticated caller'
      using errcode = '28000';
  end if;

  if btrim(coalesce(p_display_name, '')) = '' then
    raise exception 'Workspace name is required'
      using errcode = '22023';
  end if;

  insert into public.workspace (display_name, prices_include_tax)
       values (btrim(p_display_name), p_prices_include_tax)
    returning id into v_workspace_id;

  insert into public.workspace_member (workspace_id, user_id, role)
       values (v_workspace_id, v_user_id, 'owner');

  insert into public.workspace_setting (workspace_id)
       values (v_workspace_id);

  -- The first store. Named after the business unless the caller says otherwise,
  -- because a single-store owner should never be asked to name a "location" —
  -- the concept does not exist for them yet.
  insert into public.location (workspace_id, name)
       values (v_workspace_id, btrim(coalesce(nullif(btrim(p_location_name), ''),
                                              p_display_name)));

  -- No member_location row for the owner, on purpose: my_locations() grants
  -- managers and owners every location by role. A row here would imply the
  -- assignment matters for them, and the first person to delete it while
  -- "tidying up" would learn that it doesn't.

  return v_workspace_id;
end;
$$;

comment on function public.onboard_workspace(text, boolean, text) is
  'Creates a workspace, its owner membership, its settings row and its first '
  'location atomically. The only sanctioned way a workspace comes into '
  'existence. ADR-035 §2.6.';


-- ----------------------------------------------------------------------------
-- 11. Row-level security
-- ----------------------------------------------------------------------------
-- Two policy shapes, repeated verbatim on every business table from 0002 onward.
--
-- Workspace-level (catalog, providers, price lists):
--     using (workspace_id in (select public.my_workspaces()))
--
-- Location-level (stock_batch, stock_movement, batch_balance, purchase, sale,
-- waste — anything on the ledger):
--     using (workspace_id in (select public.my_workspaces())
--        and location_id  in (select public.my_locations()))
--
-- The workspace predicate is redundant in the second shape — my_locations()
-- already implies membership — and is kept anyway. It is indexed and cheap, and
-- one uniform prefix is what makes the shape safe to copy without thinking.
--
-- Both are wrapped as `in (select fn())` rather than a bare function call so the
-- planner evaluates them once per query instead of once per row.
--
-- There is no administrative exception and no "see all workspaces" policy —
-- that policy is how every multi-tenant leak in history happened.

alter table public.workspace           enable row level security;
alter table public.location            enable row level security;
alter table public.workspace_member    enable row level security;
alter table public.member_location     enable row level security;
alter table public.workspace_setting   enable row level security;

-- --- workspace ---------------------------------------------------------------

create policy workspace_select on public.workspace
  for select to authenticated
  using (id in (select public.my_workspaces()));

create policy workspace_update on public.workspace
  for update to authenticated
  using (public.has_role(id, 'owner'))
  with check (public.has_role(id, 'owner'));

-- No insert policy by design: workspaces are created only via
-- onboard_workspace(). No delete policy: deactivate via is_active.

-- --- location ----------------------------------------------------------------
-- Read is scoped by my_locations(), not by workspace: a cashier assigned to one
-- store has no business enumerating the other. Opening a store is an owner act.

create policy location_select on public.location
  for select to authenticated
  using (id in (select public.my_locations()));

create policy location_insert on public.location
  for insert to authenticated
  with check (public.has_role(workspace_id, 'owner'));

create policy location_update on public.location
  for update to authenticated
  using (public.has_role(workspace_id, 'owner'))
  with check (public.has_role(workspace_id, 'owner'));

-- No delete policy: a location with ledger history is never deleted, only
-- deactivated. The FKs from 0002 onward would refuse anyway.

-- --- workspace_member --------------------------------------------------------

create policy workspace_member_select on public.workspace_member
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));

create policy workspace_member_insert on public.workspace_member
  for insert to authenticated
  with check (public.has_role(workspace_id, 'owner'));

create policy workspace_member_update on public.workspace_member
  for update to authenticated
  using (public.has_role(workspace_id, 'owner'))
  with check (public.has_role(workspace_id, 'owner'));

create policy workspace_member_delete on public.workspace_member
  for delete to authenticated
  using (public.has_role(workspace_id, 'owner'));

-- --- member_location ---------------------------------------------------------
-- Readable workspace-wide: knowing who covers which store is roster information,
-- not takings. Writable by owners only, consistent with membership and roles.

create policy member_location_select on public.member_location
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));

create policy member_location_insert on public.member_location
  for insert to authenticated
  with check (public.has_role(workspace_id, 'owner'));

create policy member_location_delete on public.member_location
  for delete to authenticated
  using (public.has_role(workspace_id, 'owner'));

-- No update policy: an assignment is added or removed, never edited in place.

-- --- workspace_setting -------------------------------------------------------
-- Readable by every member: the client needs use_last_sell_price and
-- void_window_minutes to render correctly. Writable by owners only (ADR-035 §2.7).

create policy workspace_setting_select on public.workspace_setting
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));

create policy workspace_setting_update on public.workspace_setting
  for update to authenticated
  using (public.has_role(workspace_id, 'owner'))
  with check (public.has_role(workspace_id, 'owner'));


-- ----------------------------------------------------------------------------
-- 12. Grants
-- ----------------------------------------------------------------------------
-- Explicit rather than inherited from default privileges, so the intent is
-- reviewable in the migration itself.

revoke all on public.unit              from anon, authenticated;
revoke all on public.workspace         from anon, authenticated;
revoke all on public.location          from anon, authenticated;
revoke all on public.workspace_member  from anon, authenticated;
revoke all on public.member_location   from anon, authenticated;
revoke all on public.workspace_setting from anon, authenticated;

grant select                 on public.unit              to authenticated;
grant select, update         on public.workspace         to authenticated;
grant select, insert, update on public.location          to authenticated;
grant select, insert, update, delete on public.workspace_member to authenticated;
grant select, insert, delete on public.member_location   to authenticated;
grant select, update         on public.workspace_setting to authenticated;

-- Functions carry an implicit EXECUTE grant to PUBLIC, so revoking from anon and
-- authenticated alone would leave them callable. Revoke from PUBLIC first.
revoke all on function public.my_workspaces()                          from public;
revoke all on function public.my_locations()                           from public;
revoke all on function public.my_role(uuid)                            from public;
revoke all on function public.has_role(uuid, public.workspace_role)    from public;
revoke all on function public.onboard_workspace(text, boolean, text)   from public;
revoke all on function public.set_updated_at()                         from public;

grant execute on function public.my_workspaces()                        to authenticated;
grant execute on function public.my_locations()                         to authenticated;
grant execute on function public.my_role(uuid)                          to authenticated;
grant execute on function public.has_role(uuid, public.workspace_role)  to authenticated;
grant execute on function public.onboard_workspace(text, boolean, text) to authenticated;

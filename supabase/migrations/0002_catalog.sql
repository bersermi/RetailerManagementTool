-- ============================================================================
-- 0002 — Catalog: families, variants, providers, sell prices, invites
-- ============================================================================
-- ADR-035 §2.3 (data model), §2.5 (units and money), §2.7 (access)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * product_family, product_variant  — the catalog
--   * provider                          — including the non-deletable generic row
--   * price_list                        — SELL prices only, no overlapping ranges
--   * workspace_invite                  — the row; create_invite/redeem_invite are 0005
--   * onboard_workspace() replaced, to seed the generic provider
--
-- Not in this migration: transactions (0003), ledger (0004), RPCs (0005).
--
-- Everything here is WORKSPACE-level, never location-level: one catalog, separate
-- shelves (ADR-035 §2.3). Two stores under one owner carrying different goods is a
-- merchandising difference, which per-location stock already expresses. The one
-- exception is price_list.location_id, which overrides price per store.
--
-- Purchase prices are deliberately absent. They are derived from purchase_line in
-- 0003 — "remembered, not curated". Putting them here is what produced the nullable
-- provider_id that silently defeated the overlap constraint in the first draft.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------

-- Exclusion constraints compare uuid and text with `=` alongside a range with
-- `&&`; plain gist cannot index the scalar operators, btree_gist can.
create extension if not exists btree_gist;

-- Case-insensitive email for invites, so the recipient's capitalisation on signup
-- does not decide whether their invite is found.
create extension if not exists citext;


-- ----------------------------------------------------------------------------
-- 2. Name normalisation
-- ----------------------------------------------------------------------------
-- Catalog tables store `normalized_name` rather than indexing an expression,
-- because they are searched (ADR-004, carried forward). Generated-always so it
-- can never drift from `name`, which is the failure mode a trigger invites.
--
-- Deliberately NOT accent-folding. `unaccent()` is STABLE, not IMMUTABLE, so it
-- cannot appear in a generated column without an immutable wrapper — and wrapping
-- it is a lie about a dictionary that can be edited. Accents are meaningful in
-- Spanish product names; "Plátano" and "Platano" being distinct is acceptable,
-- silently merging them is not. Search-time folding belongs in the query.

create function public.normalize_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(btrim(regexp_replace(p_name, '\s+', ' ', 'g')))
$$;

comment on function public.normalize_name(text) is
  'Case-, whitespace- and repeat-space-insensitive name key for catalog uniqueness. '
  'Immutable so it can back a generated column. Does not fold accents — see 0002 §2.';


-- ----------------------------------------------------------------------------
-- 3. Product family  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------
-- The substance; the variant is how it is packaged and sold. "Jitomate" is a
-- family, "Jitomate a granel" and "Jitomate caja 10kg" are variants of it.

create table public.product_family (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspace (id) on delete cascade,
  name                  text not null,
  normalized_name       text generated always as (public.normalize_name(name)) stored,
  default_lifespan_days integer,
  track_expiry          boolean not null default false,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint product_family_name_not_blank check (btrim(name) <> ''),
  constraint product_family_lifespan_positive
    check (default_lifespan_days is null or default_lifespan_days > 0),

  -- Referenced by the composite FK on product_variant, so a variant can never be
  -- attached to a family belonging to another tenant.
  constraint product_family_id_workspace_unique unique (id, workspace_id),
  constraint product_family_name_unique unique (workspace_id, normalized_name)
);

create index product_family_by_workspace_idx
  on public.product_family (workspace_id)
  where is_active;

create trigger product_family_set_updated_at
  before update on public.product_family
  for each row execute function public.set_updated_at();

comment on table public.product_family is
  'The substance. Variants under it differ in packaging and denomination, not in kind. '
  'ADR-035 §2.3.';
comment on column public.product_family.default_lifespan_days is
  'Seeds expiry_date on batches when the variant tracks expiry and the operator does '
  'not enter one. Null means no default — never means "does not expire".';


-- ----------------------------------------------------------------------------
-- 4. Product variant  (ADR-035 §2.3, §2.5)
-- ----------------------------------------------------------------------------
-- Four denominations, all optional overrides of base except base itself:
--   base_unit_code      what the ledger stores. Smallest practical (g, ml, pza)
--   purchase_unit_code  how it arrives      (caja, kg)
--   sell_unit_code      how it leaves       (g, pza)
--   price_unit_code     how it is quoted    (per 100g)
--
-- Supersedes ADR-008 (one unit per variant), which made buying a case and selling
-- singles unrepresentable. All four must share a dimension — converting mass to
-- volume is not a user error to be corrected, it is nonsense (§2.5.2).

create table public.product_variant (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null,
  family_id          uuid not null,
  name               text not null,
  normalized_name    text generated always as (public.normalize_name(name)) stored,

  base_unit_code     text not null references public.unit (code),
  purchase_unit_code text not null references public.unit (code),
  sell_unit_code     text not null references public.unit (code),
  price_unit_code    text not null references public.unit (code),

  -- How many base units one purchase unit contains, when the unit table alone
  -- cannot say: a case of 24 pieces is pack_size 24 with both units 'pza'.
  pack_size          numeric(14,3) not null default 1,

  -- IVA as a rate, not a percentage: 0.1600, not 16. Default 0 because most
  -- basic groceries in Mexico are exempt, and the common case should need no edit.
  tax_rate           numeric(5,4) not null default 0,

  -- Null defers to workspace_setting.enforce_stock_default. Stock is recorded,
  -- not enforced (ADR-035 §1) — a variant may opt in individually.
  enforce_stock      boolean,

  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint product_variant_name_not_blank check (btrim(name) <> ''),
  constraint product_variant_pack_size_positive check (pack_size > 0),
  constraint product_variant_tax_rate_sane check (tax_rate >= 0 and tax_rate < 1),

  constraint product_variant_family_fk
    foreign key (family_id, workspace_id)
    references public.product_family (id, workspace_id) on delete cascade,

  -- Referenced by the composite FKs on price_list and, from 0003, every line table.
  constraint product_variant_id_workspace_unique unique (id, workspace_id),
  constraint product_variant_name_unique unique (workspace_id, normalized_name)
);

create index product_variant_by_family_idx
  on public.product_variant (family_id)
  where is_active;

create index product_variant_by_workspace_idx
  on public.product_variant (workspace_id)
  where is_active;

create trigger product_variant_set_updated_at
  before update on public.product_variant
  for each row execute function public.set_updated_at();

-- Dimension consistency cannot be a CHECK, because it needs the unit table. A
-- constraint trigger keeps it in the database rather than in whichever RPC
-- remembers: the point of §2.5.2 is that the conversion is arithmetic, and
-- arithmetic across dimensions has no answer to give.
create function public.product_variant_units_same_dimension()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_dims integer;
begin
  select count(distinct u.dimension)
    into v_dims
    from public.unit u
   where u.code in (new.base_unit_code, new.purchase_unit_code,
                    new.sell_unit_code, new.price_unit_code);

  if v_dims > 1 then
    raise exception
      'product_variant %: base/purchase/sell/price units span more than one dimension',
      coalesce(new.name, '(unnamed)')
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger product_variant_units_same_dimension_trg
  before insert or update of base_unit_code, purchase_unit_code,
                             sell_unit_code, price_unit_code
  on public.product_variant
  for each row execute function public.product_variant_units_same_dimension();

comment on table public.product_variant is
  'One variant = one substance = one base unit. Measurement and pricing '
  'denominations are separate. ADR-035 §2.5.';
comment on column public.product_variant.pack_size is
  'Base units per purchase unit, where the unit table cannot express it — a case '
  'of 24 pieces is pack_size 24 with purchase and base both pza.';


-- ----------------------------------------------------------------------------
-- 5. Provider  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------
-- Purchase price memory is per (provider, variant) and lives in purchase_line
-- from 0003, never here. A price learned from one provider never prefills
-- another's: a supplier price is a fact about a relationship, not about a product.

create table public.provider (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspace (id) on delete cascade,
  name            text not null,
  normalized_name text generated always as (public.normalize_name(name)) stored,
  contact_name    text,
  phone           text,
  address_line1   text,

  -- "I bought this at the market this morning." Exactly one per workspace,
  -- created by onboard_workspace, never deletable. It exists so that an
  -- unplanned purchase is two taps rather than a reason to invent a fake
  -- supplier record — which is what operators do otherwise, and what turns the
  -- provider directory into landfill.
  is_generic      boolean not null default false,

  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint provider_name_not_blank check (btrim(name) <> ''),
  constraint provider_id_workspace_unique unique (id, workspace_id),
  constraint provider_name_unique unique (workspace_id, normalized_name)
);

create unique index provider_one_generic_per_workspace_idx
  on public.provider (workspace_id)
  where is_generic;

create index provider_by_workspace_idx
  on public.provider (workspace_id)
  where is_active;

create trigger provider_set_updated_at
  before update on public.provider
  for each row execute function public.set_updated_at();

-- Not deletable, and not demotable either: clearing is_generic would leave the
-- workspace without one, which the partial unique index above cannot catch.
create function public.provider_protect_generic()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_generic then
    raise exception 'the generic provider cannot be deleted'
      using errcode = 'restrict_violation';
  end if;

  if tg_op = 'UPDATE' and old.is_generic and not new.is_generic then
    raise exception 'the generic provider cannot be demoted'
      using errcode = 'restrict_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger provider_protect_generic_trg
  before update or delete on public.provider
  for each row execute function public.provider_protect_generic();

comment on table public.provider is
  'Suppliers, including exactly one non-deletable generic row per workspace. '
  'Purchase prices are NOT stored here — they are derived from purchase_line. '
  'ADR-035 §2.3.';


-- ----------------------------------------------------------------------------
-- 6. Price list  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------
-- SELL prices only. Curated: someone decides them, and they change rarely.
-- location_id null is the workspace default; a row with a location overrides it
-- for that store.
--
-- The exclusion constraint is the whole point of this table. In the first draft
-- provider prices lived here too, which made provider_id nullable, and a NULL in
-- an exclusion key makes the constraint silently inert — two overlapping prices
-- would both be accepted and the newer one would win at random.

create table public.price_list (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null,
  variant_id      uuid not null,
  location_id     uuid,

  price_per_base  numeric(14,6) not null,
  effective_from  date not null,
  effective_to    date,

  valid_period    daterange generated always as
                    (daterange(effective_from, effective_to, '[)')) stored,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint price_list_price_non_negative check (price_per_base >= 0),
  constraint price_list_range_ordered
    check (effective_to is null or effective_to > effective_from),

  constraint price_list_variant_fk
    foreign key (variant_id, workspace_id)
    references public.product_variant (id, workspace_id) on delete cascade,

  constraint price_list_location_fk
    foreign key (location_id, workspace_id)
    references public.location (id, workspace_id) on delete restrict,

  -- A sentinel rather than a placeholder row, so there is nothing to maintain and
  -- nothing anyone can delete. ADR-035 §2.3.
  constraint price_list_no_overlap exclude using gist (
    workspace_id with =,
    variant_id   with =,
    (coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)) with =,
    valid_period with &&
  )
);

create index price_list_lookup_idx
  on public.price_list (workspace_id, variant_id, location_id, effective_from desc);

create trigger price_list_set_updated_at
  before update on public.price_list
  for each row execute function public.set_updated_at();

comment on table public.price_list is
  'Sell prices, curated. Purchase prices are derived from purchase_line and are '
  'deliberately not here. location_id null = workspace default. ADR-035 §2.3.';
comment on constraint price_list_no_overlap on public.price_list is
  'No two prices for the same variant and scope may cover the same day. The '
  'coalesce sentinel is what keeps a null location_id from defeating the constraint.';


-- ----------------------------------------------------------------------------
-- 7. Workspace invite  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- The row only. create_invite() and redeem_invite() are 0005, because
-- redeem_invite is `security definer` and belongs with the other RPCs.
--
-- Only the hash is stored. The token itself is shown once to the inviter and
-- delivered out of band — the owner sends it over WhatsApp. That is one fewer
-- piece of infrastructure between here and the pilot, and it is how a shop with
-- three staff would do it anyway. `auth.users` is never exposed to anyone.

create table public.workspace_invite (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  email        citext not null,
  role         public.workspace_role not null default 'staff',

  -- Which stores the invitee will be assigned on redemption. Empty for a manager
  -- or owner, who get every location from my_locations() by role.
  location_ids uuid[] not null default '{}',

  invited_by   uuid not null references auth.users (id),
  token_hash   text not null,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users (id),
  created_at   timestamptz not null default now(),

  constraint workspace_invite_token_hash_unique unique (token_hash),
  constraint workspace_invite_accepted_consistent
    check ((accepted_at is null) = (accepted_by is null)),
  constraint workspace_invite_expiry_future
    check (expires_at > created_at)
);

-- One live invite per email per workspace. Accepted and expired rows are kept as
-- an audit trail, so the index covers only those still redeemable.
create unique index workspace_invite_one_pending_idx
  on public.workspace_invite (workspace_id, email)
  where accepted_at is null;

create index workspace_invite_by_workspace_idx
  on public.workspace_invite (workspace_id, created_at desc);

comment on table public.workspace_invite is
  'Single-use staff invitations. Only the token hash is stored; delivery is out of '
  'band for v1. ADR-035 §2.7.';


-- ----------------------------------------------------------------------------
-- 8. onboard_workspace — replaced to seed the generic provider
-- ----------------------------------------------------------------------------
-- Replaced rather than edited in 0001: migrations are append-only once applied,
-- and fixing forward is the rule this repo is organised around. 0001 could not
-- reference public.provider because it did not exist yet.
--
-- Behaviour is otherwise identical to 0001: creates the workspace, the owner
-- membership, the settings row and one location. It now also creates the
-- workspace's generic provider, so "I bought this at the market" works from the
-- first minute rather than after someone remembers to add it.

create or replace function public.onboard_workspace(
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
      using errcode = 'insufficient_privilege';
  end if;

  if btrim(coalesce(p_display_name, '')) = '' then
    raise exception 'workspace display name is required'
      using errcode = 'check_violation';
  end if;

  insert into public.workspace (display_name, prices_include_tax)
  values (btrim(p_display_name), p_prices_include_tax)
  returning id into v_workspace_id;

  insert into public.workspace_member (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  insert into public.workspace_setting (workspace_id)
  values (v_workspace_id);

  insert into public.location (workspace_id, name)
  values (v_workspace_id, btrim(coalesce(p_location_name, p_display_name)));

  -- New in 0002.
  insert into public.provider (workspace_id, name, is_generic)
  values (v_workspace_id, 'Compra directa', true);

  return v_workspace_id;
end;
$$;

comment on function public.onboard_workspace(text, boolean, text) is
  'Creates a workspace with its owner membership, settings, first location and '
  'generic provider. Five rows. ADR-035 §2.3, §2.7.';


-- ----------------------------------------------------------------------------
-- 9. Row-level security
-- ----------------------------------------------------------------------------
-- The workspace-level shape from 0001 §11, repeated verbatim:
--     using (workspace_id in (select public.my_workspaces()))
--
-- Reads are open to every member: a cashier needs the catalog and the sell price
-- to ring anything up. Writes are manager-or-owner throughout — editing the
-- catalog mid-shift is how a tax rate silently changes on a Tuesday.
--
-- Nothing here is location-scoped. One catalog, separate shelves.

alter table public.product_family   enable row level security;
alter table public.product_variant  enable row level security;
alter table public.provider         enable row level security;
alter table public.price_list       enable row level security;
alter table public.workspace_invite enable row level security;

-- --- product_family ----------------------------------------------------------

create policy product_family_select on public.product_family
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));

create policy product_family_insert on public.product_family
  for insert to authenticated
  with check (public.has_role(workspace_id, 'manager'));

create policy product_family_update on public.product_family
  for update to authenticated
  using (public.has_role(workspace_id, 'manager'))
  with check (public.has_role(workspace_id, 'manager'));

-- No delete policy: a family with ledger history is deactivated, never deleted.

-- --- product_variant ---------------------------------------------------------

create policy product_variant_select on public.product_variant
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));

create policy product_variant_insert on public.product_variant
  for insert to authenticated
  with check (public.has_role(workspace_id, 'manager'));

create policy product_variant_update on public.product_variant
  for update to authenticated
  using (public.has_role(workspace_id, 'manager'))
  with check (public.has_role(workspace_id, 'manager'));

-- --- provider ----------------------------------------------------------------

create policy provider_select on public.provider
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));

create policy provider_insert on public.provider
  for insert to authenticated
  with check (public.has_role(workspace_id, 'manager'));

create policy provider_update on public.provider
  for update to authenticated
  using (public.has_role(workspace_id, 'manager'))
  with check (public.has_role(workspace_id, 'manager'));

-- No delete policy. The generic row is additionally protected by trigger, because
-- a missing delete policy is invisible to anyone reading the table definition.

-- --- price_list --------------------------------------------------------------
-- Readable by everyone: this is the shelf price, not a cost. Cost lives on the
-- purchase side from 0003 and is manager-only there.

create policy price_list_select on public.price_list
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));

create policy price_list_insert on public.price_list
  for insert to authenticated
  with check (public.has_role(workspace_id, 'manager'));

create policy price_list_update on public.price_list
  for update to authenticated
  using (public.has_role(workspace_id, 'manager'))
  with check (public.has_role(workspace_id, 'manager'));

create policy price_list_delete on public.price_list
  for delete to authenticated
  using (public.has_role(workspace_id, 'manager'));

-- --- workspace_invite --------------------------------------------------------
-- Manager-and-above only, for reads as well as writes: the row carries an email
-- address and a token hash, and staff have no reason to enumerate either.

create policy workspace_invite_select on public.workspace_invite
  for select to authenticated
  using (public.has_role(workspace_id, 'manager'));

create policy workspace_invite_insert on public.workspace_invite
  for insert to authenticated
  with check (public.has_role(workspace_id, 'manager'));

create policy workspace_invite_delete on public.workspace_invite
  for delete to authenticated
  using (public.has_role(workspace_id, 'manager'));

-- No update policy: redemption is written by redeem_invite() in 0005, which is
-- security definer. An invite is never edited by hand.


-- ----------------------------------------------------------------------------
-- 10. Grants
-- ----------------------------------------------------------------------------
-- Explicit rather than inherited, so the intent is reviewable in the migration.

revoke all on public.product_family   from anon, authenticated;
revoke all on public.product_variant  from anon, authenticated;
revoke all on public.provider         from anon, authenticated;
revoke all on public.price_list       from anon, authenticated;
revoke all on public.workspace_invite from anon, authenticated;

grant select, insert, update         on public.product_family   to authenticated;
grant select, insert, update         on public.product_variant  to authenticated;
grant select, insert, update         on public.provider         to authenticated;
grant select, insert, update, delete on public.price_list       to authenticated;
grant select, insert, delete         on public.workspace_invite to authenticated;

revoke all on function public.normalize_name(text) from public;
grant execute on function public.normalize_name(text) to authenticated;

-- Trigger functions are never called directly.
revoke all on function public.product_variant_units_same_dimension() from public;
revoke all on function public.provider_protect_generic()             from public;

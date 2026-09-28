-- ============================================================================
-- 0042 — Which catalog rows are the shop's to remove
-- ============================================================================
-- ADR-035 §2.9 (the catalog, and the prebuilt rows a shop starts from), §2.7
-- (access). docs/PLAN.md task `6c`.
--
-- Scope, deliberately narrow so one person can review it:
--   * product_family.is_prebuilt   — one boolean column
--   * product_variant.is_prebuilt  — the same boolean column
--   * public.catalog_prebuilt_stays()  — one trigger function, two triggers
--
-- Nothing else. No view, no policy change, no grant change, no RPC, and
-- ⚠️⚠️ NO SEEDED CATALOG — the import and the screens around it are a later job
-- and `6c`'s row says so in the owner's own words: *"once we wrap up the full app
-- we will polish many parts, one of them is the onboarding to import a catalog."*
--
-- ----------------------------------------------------------------------------
-- WHY THIS COLUMN EXISTS, IN THE OWNER'S WORDS
-- ----------------------------------------------------------------------------
-- *"When we start developing that onboarding step where each user can select the
-- nature of his shop and therefore import a set of products that he can also look
-- at offline we need to make that distinction to avoid them from deleting a
-- product they didn't create."* (2026-09-23.)
--
-- So this is not tidiness. It is the thing that makes an imported catalog safe to
-- hand somebody, and until it exists `Editar` can only offer its retire control on
-- EVERY product or on NONE. It has been drawn on none since 2026-09-23 — the
-- honest interim, found by the owner on his own phone — and `6c` is what gives
-- deleting back, on his own rows only.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ WHY A BOOLEAN AND NOT AN `origin` ENUM — RULED BY THE OWNER 2026-09-27
-- ----------------------------------------------------------------------------
-- The question is binary today and the plan had called the column `origin` since
-- 2026-09-23, so both shapes were put to him with their costs. The boolean won on
-- a measured argument two days old: an enum crossing the wire as a LABEL rather
-- than as its member is a bug no typecheck and no Vitest fixture can see, which is
-- what `6a-ii-b` found in `reasonLabel` and paid for in `DocumentLine.reasonValue`.
-- **A boolean has no label to get wrong.** It also matches `provider.is_generic`
-- (`0002:241`), which is this schema's existing answer to the same shape of
-- question: one protected row, one boolean, one trigger.
--
-- ⚠️ WHAT IT COSTS, NAMED RATHER THAN GLOSSED: a third provenance — *imported from
-- a spreadsheet*, *provided by a supplier* — is a new nullable column later and
-- not an `alter type … add value`. That is additive and cheap; the wire vocabulary
-- an enum would have created is neither.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE BACKFILL IS THE ONE-WAY DOOR, AND IT IS THE OWNER'S RULING OF 2026-09-24
-- ----------------------------------------------------------------------------
-- *"Everything present when the marker ships is NOT the shopkeeper's; everything
-- created through `Agregar` afterwards is."*
--
-- ⚠️ SO THE DEFAULT IS WRITTEN TWICE ON PURPOSE, AND THE ORDER IS THE WHOLE TRICK:
--
--     add column is_prebuilt boolean not null default true;   -- every existing row
--     alter column is_prebuilt set default false;             -- every future row
--
-- **There is no `update` statement in this file.** An `update … set is_prebuilt =
-- true` would reach the same state and would also fire
-- `product_variant_set_updated_at` on every row in every shop, stamping
-- `updated_at` with the migration's instant and destroying the only record of when
-- a product was last really edited. The two-step default touches no row: Postgres
-- 11+ stores an `add column` default in the catalog rather than rewriting the heap.
--
-- ⚠️ AND IT MEANS `5e-i`'s `VARIANT_INSERT_COLUMNS` NEEDS NO NEW COLUMN. Every
-- product made through `Agregar` is correctly the shop's without the app ever
-- saying so, which is the property `6c`'s row asked for by name.
--
-- ⚠️ A ROW ALREADY RETIRED WHEN THIS LANDS STAYS RETIRED. The fence below guards
-- the true→false transition only, so `is_active = false` rows are untouched — and
-- there is no `Reactivar` anywhere in this app for a product (`ES.catalog.edit`
-- carries no such word, on the owner's 2026-09-23 ruling). That is stated here
-- because it is the one visible consequence of the backfill nobody asked about.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE FENCE IS ON DEACTIVATION AND NOT ON UPDATE — AND GETTING THIS WRONG
-- WOULD HAVE MERGED AUTOMATICALLY AND BROKEN THE CATALOG IT PROTECTS
-- ----------------------------------------------------------------------------
-- The obvious move is to add `is_prebuilt = false` to `product_variant_update`'s
-- `using` clause. **That would stop the shopkeeper PRICING and RENAMING an
-- imported product, which is the entire reason for importing one.** He must be able
-- to set his own prices on our catalog; he must not be able to remove it.
--
-- A `using` clause cannot say *this column may not change in this direction* — it
-- sees the row, not the transition — so the rule is a TRIGGER, the shape
-- `product_variant_units_same_dimension_trg` (`0002:204`) and
-- `provider_protect_generic_trg` (`0002:284`) already establish in this very file's
-- predecessor.
--
-- ⚠️ SO NO POLICY CHANGES IN `0042`. `product_family_update` and
-- `product_variant_update` are still `has_role(…, 'manager')` on both sides and
-- carry no column list, which is what keeps repricing an imported row legal.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ ONE MECHANISM, NOT TWO — AND THAT IS A DECISION WITH A REASON
-- ----------------------------------------------------------------------------
-- `revoke update (is_prebuilt) on product_variant from authenticated` would also
-- stop the marker being flipped, and it is NOT done here. Two mechanisms for one
-- rule means two refusals with two different SQLSTATEs depending on which fires
-- first — a 403 `42501` from the grant, a 400 `restrict_violation` from the
-- trigger — and `6b` has just finished paying for exactly that shape on `provider`,
-- where a cashier is refused two different ways and only one of them is an error.
-- **One rule, one refusal, one thing for a contract check to assert.**
--
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES NOT OPEN
-- ----------------------------------------------------------------------------
-- ⚠️ `is_prebuilt` IS READABLE BY EVERY MEMBER, including a cashier: `select` is
-- granted table-wide and `product_variant_select` is workspace-scoped with no
-- column list. That is deliberate and it leaks nothing — it says where a row came
-- from, not what it cost — and she cannot write the catalog at all
-- (`product_variant_update` is manager-and-above, which `canWriteCatalog` mirrors
-- on the client).
--
-- ⚠️ AND NO ROW IS SHARED ACROSS TENANTS BY THIS FILE OR EVER. A prebuilt row is
-- COPIED INTO a workspace; every line table's foreign key is composite on
-- `(id, workspace_id)` and every policy is `workspace_id`-scoped, so a row owned by
-- nobody is not representable here. ADR-035 §2.9 carries the rule and this column
-- does not reopen it.

-- ----------------------------------------------------------------------------
-- 1. The marker
-- ----------------------------------------------------------------------------
alter table public.product_family
  add column is_prebuilt boolean not null default true;
alter table public.product_family
  alter column is_prebuilt set default false;

alter table public.product_variant
  add column is_prebuilt boolean not null default true;
alter table public.product_variant
  alter column is_prebuilt set default false;

comment on column public.product_family.is_prebuilt is
  'True when the row came from a catalog we maintain, false when the shopkeeper '
  'made it. Only his own rows may be retired — public.catalog_prebuilt_stays() is '
  'the fence, and it guards is_active going true to false. The DEFAULT is false: '
  'anything inserted through the app is his. ADR-035 2.9.';

comment on column public.product_variant.is_prebuilt is
  'True when the row came from a catalog we maintain, false when the shopkeeper '
  'made it. Only his own rows may be retired — public.catalog_prebuilt_stays() is '
  'the fence, and it guards is_active going true to false. A prebuilt row is still '
  'renamed and repriced freely, which is the whole reason for importing one. '
  'ADR-035 2.9.';

-- ----------------------------------------------------------------------------
-- 2. The fence
-- ----------------------------------------------------------------------------
-- ⚠️ ONE FUNCTION, TWO TRIGGERS. Both tables carry `name`, `is_active` and now
-- `is_prebuilt`, so the body is table-agnostic and `tg_table_name` is what makes
-- the message say which one refused.
--
-- ⚠️⚠️ ONE DIRECTION IS FENCED AND THE OTHER IS NOT, AND THE FIRST WRITING OF THIS
-- FILE GOT IT WRONG — FOUND BY DRIVING IT, NOT BY READING IT. Prebuilt→shop is the
-- direction that matters: flipping it would hand the shopkeeper a delete on our
-- catalog through a PATCH the app never sends but PostgREST would happily accept.
-- Shop→prebuilt was fenced too, on the argument that a shopkeeper who accidentally
-- locks his own product has no way back — **and a probe against the applied schema
-- showed what that costs: NOTHING CAN EVER MARK A ROW PREBUILT AFTER IT IS
-- INSERTED.** Not the seed, not a fixture, not a `service_role` maintenance job, not
-- a later migration without disabling the trigger. An import inserting its own rows
-- is unaffected, which is why the defect is invisible in the case this row is for.
--
-- ⚠️ SO IT IS EXACTLY `provider_protect_generic`'s SHAPE, WHICH REFUSES A DEMOTION
-- AND PERMITS A PROMOTION (`old.is_generic and not new.is_generic`). Following the
-- precedent in the file this column is added to turns out to be the right answer for
-- the same reason it was there: a lock-in is not a security hole, and removing the
-- administrative path is a bigger cost than the mis-tap it guards against.
--
-- ⚠️ THE `delete` BRANCH IS DEAD CODE TODAY AND IS KEPT ANYWAY, which is
-- `provider_protect_generic`'s own precedent: neither catalog table grants `delete`
-- to `authenticated` and neither has a delete policy, so nothing can reach it — and
-- the day somebody adds a grant, the fence is already standing rather than
-- silently absent.
create function public.catalog_prebuilt_stays()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_prebuilt then
    raise exception 'a prebuilt % cannot be deleted: %',
      tg_table_name, coalesce(old.name, '(unnamed)')
      using errcode = 'restrict_violation';
  end if;

  if tg_op = 'UPDATE' then
    if old.is_prebuilt and old.is_active and not new.is_active then
      raise exception 'a prebuilt % cannot be retired: %',
        tg_table_name, coalesce(old.name, '(unnamed)')
        using errcode = 'restrict_violation';
    end if;

    if old.is_prebuilt and not new.is_prebuilt then
      raise exception 'a prebuilt % cannot be reassigned to the shop: %',
        tg_table_name, coalesce(old.name, '(unnamed)')
        using errcode = 'restrict_violation';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger catalog_prebuilt_stays_trg
  before update or delete on public.product_family
  for each row execute function public.catalog_prebuilt_stays();

create trigger catalog_prebuilt_stays_trg
  before update or delete on public.product_variant
  for each row execute function public.catalog_prebuilt_stays();

comment on function public.catalog_prebuilt_stays() is
  'Refuses to retire, delete or hand to the shop a catalog row the shop did not '
  'create; marking one of the shop''s own rows prebuilt is allowed, which is '
  'provider_protect_generic''s asymmetry and is what leaves an import a path in. '
  'The rule is a TRIGGER and not a policy predicate because a using clause sees a '
  'row and not a transition: a prebuilt product must stay renameable and '
  'repriceable, and only is_active going true to false is forbidden. ADR-035 2.9.';

-- ⚠️ REVOKED FROM `public` the way `0002` does for its own trigger functions: a
-- trigger function is called by the executor, never by a client, and a callable one
-- is a needless surface.
revoke all on function public.catalog_prebuilt_stays() from public;

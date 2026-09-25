-- ============================================================================
-- 0039_generic_provider_name.sql — ONE SEEDED NAME, AND THE ROWS THAT
-- ALREADY CARRY THE OLD ONE
--
-- Build step 5's task `5g.5`, and the FIFTH migration of step 5.
--
-- NO table, NO column, NO view, NO policy, NO trigger, NO grant, NO signature.
-- ONE applied function is `create or replace`d so that ONE `insert` seeds a
-- different literal, and ONE `update` brings the rows that already exist into
-- line with it. That is the whole file.
--
-- ⚠️⚠️ WHY IT EXISTS: THE PLAN AND THE APPLIED SCHEMA HAVE DISAGREED ABOUT THIS
-- STRING SINCE 2026-08-26, AND NOTHING COULD SEE IT.
--
--   `docs/PLAN.md`'s F6 says *"a provider named `Genérico` must be seeded in
--   every workspace"*. `onboard_workspace` has seeded `Compra directa` since
--   `0002`, carried forward untouched through `0027` and `0034`. Neither is a
--   bug — a `not null` `purchase.provider_id` and `record_purchase`'s *"a
--   delivery has a counterparty"* make what F6 really requires the ROW, and the
--   row has always been there. **What differed is a word a shopkeeper reads in
--   `Comprando a:` on every delivery she records**, and no check in this
--   repository looked at a string until `5g-i` added one on 2026-09-24.
--
-- ⚠️⚠️ THE OWNER RULED IT THE SAME DAY, AND HE REVERSED THE RECOMMENDATION WITH
-- A REASON THAT CHANGES WHAT THE WORD MEANS: *"Genérico is fine, that means we
-- don't have a Provider for that purchase so we buy it from a generic provider.
-- It's a way to allow the user to make purchases from a non-recurrent provider
-- if he wants."*
--
--   The brief argued for `Compra directa` on the ground that it names WHAT SHE
--   DID — she bought it directly, at the market, this morning — while `Genérico`
--   only names the row to whoever built the schema. **That was true and beside
--   the point.** The row is not a description of an act, it is the ABSENCE of a
--   counterparty made into something the ledger can point at: *we do not have a
--   provider for this purchase*. `Genérico` says that; `Compra directa` says
--   something narrower and would read oddly on a delivery that arrived by van
--   from a supplier nobody intends to use again.
--
-- ⚠️ `0002`'s COMMENT IS NOT BEING CALLED WRONG. *"I bought this at the market
-- this morning"* is still exactly why the row exists and it stays where it is;
-- what this file changes is the word a person reads, not the reason.
--
-- ============================================================================
-- DECISIONS TAKEN IN THIS FILE
-- ============================================================================
--
-- 1. ⚠️⚠️ THE UPDATE IS SCOPED BY `is_generic`, NOT BY THE OLD NAME. A shop
--    that had already renamed its own generic row — nothing prevents it,
--    `provider_update` is manager-and-above and the protect trigger guards only
--    DELETE and demotion — would otherwise keep a third spelling for ever,
--    which is the state this file exists to end. **One generic row per
--    workspace is enforced by `provider_one_generic_per_workspace_idx`**, so
--    the scope is exact.
--
-- 2. ⚠️⚠️ AND IT SKIPS ANY WORKSPACE THAT ALREADY HAS A PROVIDER CALLED
--    `Genérico`, BECAUSE `provider_name_unique` WOULD RAISE. The constraint is
--    `(workspace_id, normalized_name)` and `normalized_name` is generated, so a
--    shop that created a *named* supplier called `Genérico` at some point would
--    take this whole migration down — and a migration that fails on one tenant's
--    data is a deployment that stops for everybody. **Such a shop keeps its
--    current generic name and is listed by the notice below**, which is the only
--    thing this file can honestly do without guessing a second name for it.
--
-- 3. ⚠️ IT IS IDEMPOTENT AND SAFE TO RE-APPLY. The `update` is a no-op once the
--    name is already right, and `create or replace` restates a function body.
--    `supabase db reset` re-runs everything from `0001`, so a migration that
--    only worked once would break the local loop every session.
--
-- 4. ⚠️ NO SEED FILE IS TOUCHED BY THIS MIGRATION, and the seeds still say
--    `Compra directa` in their own prose until they are rewritten alongside it.
--    `supabase/seeds/` is fixture data for reading screens, not schema, and
--    conflating the two is how a migration grows a second job.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The seed  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------
-- ⚠️ THE WHOLE BODY IS RESTATED because `create or replace function` takes no
-- patch. It is `0034`'s, character for character, with one literal changed —
-- which is the diff a reviewer should be able to see at a glance and is the
-- reason nothing else in this function is touched here.

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
  -- R4: `display_name` means the SHOP three lines below and the PERSON here, in
  -- one function body. The local is named for the person so the two never read
  -- as one thing; the COLUMN keeps its name, which is right on each table.
  v_person_name  text;
begin
  if v_user_id is null then
    raise exception 'onboard_workspace requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  if btrim(coalesce(p_display_name, '')) = '' then
    raise exception 'workspace display name is required'
      using errcode = 'check_violation';
  end if;

  -- New in 0027.
  insert into public.workspace (display_name, prices_include_tax, code)
  values (btrim(p_display_name), p_prices_include_tax,
          public.generate_workspace_code())
  returning id into v_workspace_id;

  v_person_name := public.auth_full_name(v_user_id);

  insert into public.workspace_member (workspace_id, user_id, role, display_name)
  values (v_workspace_id, v_user_id, 'owner', v_person_name);

  insert into public.workspace_setting (workspace_id)
  values (v_workspace_id);

  insert into public.location (workspace_id, name)
  values (v_workspace_id, btrim(coalesce(p_location_name, p_display_name)));

  -- New in 0002. ⚠️ Renamed in 0039 on the owner's ruling of 2026-09-24: the row
  -- is the ABSENCE of a counterparty, not a description of how the goods were
  -- bought. See this file's header.
  insert into public.provider (workspace_id, name, is_generic)
  values (v_workspace_id, 'Genérico', true);

  return v_workspace_id;
end;
$$;


-- ----------------------------------------------------------------------------
-- 2. The rows that already exist  (decision 1 and decision 2)
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THIS IS THE HALF THAT COULD ONLY GET DEARER. A seed changed alone leaves
-- every shop created before today pointing its deliveries at a provider called
-- something the header no longer says, and nothing anywhere would disagree.

do $$
declare
  v_renamed integer;
  v_skipped text;
begin
  with blocked as (
    select p.workspace_id
      from public.provider p
     where p.normalized_name = public.normalize_name('Genérico')
       and not p.is_generic
  ),
  renamed as (
    update public.provider g
       set name = 'Genérico'
     where g.is_generic
       and g.name <> 'Genérico'
       and g.workspace_id not in (select workspace_id from blocked)
    returning 1
  )
  select count(*) into v_renamed from renamed;

  select string_agg(w.display_name, ', ')
    into v_skipped
    from public.workspace w
   where exists (
     select 1 from public.provider p
      where p.workspace_id = w.id
        and p.normalized_name = public.normalize_name('Genérico')
        and not p.is_generic
   );

  raise notice '0039: renamed % generic provider row(s) to Genérico', v_renamed;

  -- ⚠️ A NOTICE AND NOT AN EXCEPTION. A shop that already has a NAMED supplier
  -- called Genérico is a real shop with real deliveries, and stopping the
  -- deployment for everybody to resolve one tenant's naming collision is the
  -- wrong trade. It keeps whatever its generic row is called today and shows up
  -- here, which is the only honest answer this file has: picking a second name
  -- for it would be inventing a word nobody chose.
  if v_skipped is not null then
    raise notice '0039: left alone, a named provider already holds that name: %', v_skipped;
  end if;
end $$;


comment on function public.onboard_workspace(text, boolean, text) is
  'Creates a workspace, its owner membership, its settings, its first location '
  'and its generic provider, atomically. The generic provider is named Genérico '
  '(0039, owner ruling 2026-09-24): the row is the absence of a counterparty — '
  '"we do not have a provider for that purchase" — rather than a description of '
  'how the goods were bought. ADR-035 §2.3.';

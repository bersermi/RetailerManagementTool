-- ============================================================================
-- 0043 — pilot_reading, and record_pilot_readings(): what §5 measures, kept
-- ============================================================================
-- ADR-035 §5 (pilot rules, the latency budgets, taps, abandonment). docs/PLAN.md
-- task `5P-a`.
--
-- Scope, deliberately narrow so one person can review it:
--   * public.pilot_reading              — one table, one SELECT policy
--   * public.record_pilot_readings()    — the only way a row gets in
--
-- No view, no trigger, no seed, and no change to any existing table or policy.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ FOUR RULINGS, ALL ASKED BEFORE A LINE WAS WRITTEN, AND TWO OF THEM MOVE
-- WHAT §5 SAID
-- ----------------------------------------------------------------------------
-- 2026-09-28, the decision maker, on four questions put by `5P-a`:
--
--   (42) the overlay is HIDDEN — the shopkeeper's screens do not change; the
--        owner opens the readings himself. Nothing in this file.
--   (43) the readings are SENT TO THE SERVER, not kept on the phone. ⚠️ §5
--        said *"measured with a dev-build overlay … not with instrumentation
--        shipped to production"*; that sentence is amended in the same commit.
--        What still holds is that ONLY A BUILD MADE WITH THE PILOT FLAG WRITES
--        HERE — a store build never calls this function.
--   (44) a reading NAMES THE MEMBER who was signed in. ⚠️ Recommended against,
--        because it is behavioural data on a named employee (LFPDPPP), and
--        taken: the `aviso de privacidad` (`5R-d`) must say so before a shop
--        the owner does not run is instrumented.
--   (45) OWNER ONLY reads it back — not a manager. The `failed_write` fence
--        (`0024`), for the same reason: it is about the shop, not in it.
--
-- ----------------------------------------------------------------------------
-- THE DECISIONS THIS FILE TAKES ITSELF, each one line to reverse
-- ----------------------------------------------------------------------------
--   1. THE MEMBER IS STAMPED, NEVER SENT. `record_pilot_readings` reads it off
--      `auth.uid()` for the workspace named; there is no argument for it, so a
--      phone cannot file a reading under somebody else.
--   2. THE ID IS THE CLIENT'S, AND A RE-SEND IS A NO-OP. A batch whose reply was
--      lost is sent again by the phone; `on conflict (id) do nothing` makes the
--      second send land nothing, and the count returned says so. `failed_write`'s
--      decision 7, for the same reason.
--   3. `kind` AND `screen` ARE TEXT UNDER A CHECK, NOT ENUMS. An enum crossing
--      the wire as a label is the defect `6a-ii-b` found (`reasonLabel`), and
--      `failed_write.kind` is already spelled this way.
--   4. `location_id` HAS A COMPOSITE FOREIGN KEY, NOT `failed_write`'s NONE.
--      That table must accept a report about a location that has gone; a
--      reading about a store that no longer exists is worth nothing, and the
--      composite key is what keeps a reading from naming another shop's store.
--      Nullable, because a cold open happens before a store is chosen.
--   5. NOTHING IS CLAMPED. `occurred_at` is when the phone measured it; a
--      reading queued for a week offline is still a true reading of that day.
--
-- ----------------------------------------------------------------------------
-- THE FIVE KINDS, and what `value` counts in each
-- ----------------------------------------------------------------------------
--   commit_ms      slide released → confirmation drawn            ms   (§5: p95 ≤ 300)
--   round_trip_ms  record_* sent → reply received, success only   ms   (§5: p95 ≤ 1000)
--   open_ms        process start → Vender first drawn, cold only  ms   (§5: p95 ≤ 2000)
--   taps           finger-downs from the first to the commit      n    (§5: median ≤ 5)
--   abandoned      a capture screen left with nothing committed   n = the taps made
--
-- `abandoned` with value 0 is somebody passing through; above 0 is somebody who
-- started and gave up, which is the silent non-use §5 names.
-- ============================================================================

create table public.pilot_reading (
  -- ⚠️ THE CLIENT'S UUID. Decision 2: the idempotency key.
  id            uuid primary key,
  workspace_id  uuid not null references public.workspace (id) on delete cascade,
  -- ⚠️ STAMPED BY THE FUNCTION, decision 1 — and ruling 44.
  member_id     uuid not null,
  location_id   uuid,
  -- A random id the phone makes once and keeps, so two phones signed in as one
  -- person are still two instruments.
  device_id     uuid not null,
  kind          text not null,
  -- Every kind is ABOUT a capture screen; the cold open is about Vender.
  screen        text not null,
  value         integer not null,
  occurred_at   timestamptz not null,
  recorded_at   timestamptz not null default now(),
  -- The build that measured it, so a reading taken before a fix is not read as
  -- a reading of the fix.
  build         text not null,

  constraint pilot_reading_member_fk
    foreign key (member_id, workspace_id)
    references public.workspace_member (id, workspace_id) on delete cascade,

  constraint pilot_reading_location_fk
    foreign key (location_id, workspace_id)
    references public.location (id, workspace_id) on delete cascade,

  constraint pilot_reading_kind_known
    check (kind in ('commit_ms', 'round_trip_ms', 'open_ms', 'taps', 'abandoned')),

  constraint pilot_reading_screen_known
    check (screen in ('vender', 'comprar', 'desperdicio')),

  constraint pilot_reading_value_sane
    check (value >= 0 and value <= 86400000),

  constraint pilot_reading_build_not_blank
    check (btrim(build) <> '')
);

create index pilot_reading_by_workspace_time_idx
  on public.pilot_reading (workspace_id, occurred_at desc);

create index pilot_reading_by_kind_idx
  on public.pilot_reading (workspace_id, kind, occurred_at desc);

comment on table public.pilot_reading is
  'What ADR-035 §5 measures during the pilot: commit-to-confirmation, the record_* '
  'round trip, cold open to Vender, taps per transaction, and abandoned capture '
  'screens. Written ONLY by a build made with the pilot flag, through '
  'record_pilot_readings(); read by the workspace OWNER only. Names the member '
  '(the decision maker, 2026-09-28) — the aviso de privacidad must say so. '
  'Append-only: no UPDATE or DELETE is granted to anyone. Plan task 5P-a.';

comment on column public.pilot_reading.value is
  'Milliseconds for commit_ms, round_trip_ms and open_ms; a count of finger-downs '
  'for taps and abandoned. See 0043''s header for each kind.';


-- ----------------------------------------------------------------------------
-- RLS — the owner reads, nobody writes directly
-- ----------------------------------------------------------------------------

alter table public.pilot_reading enable row level security;

revoke all on public.pilot_reading from anon, authenticated;

create policy pilot_reading_select on public.pilot_reading
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and public.has_role(workspace_id, 'owner'));

grant select on public.pilot_reading to authenticated;


-- ----------------------------------------------------------------------------
-- record_pilot_readings — a batch in, the count that landed out
-- ----------------------------------------------------------------------------

create function public.record_pilot_readings(
  p_workspace_id uuid,
  p_readings     jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member   uuid;
  v_inserted integer;
begin
  if auth.uid() is null then
    raise exception 'record_pilot_readings requires an authenticated caller'
      using errcode = '28000';
  end if;

  -- ---- 1. the workspace wall, first ----------------------------------------
  -- Decision 1: the member is the CALLER's row in this workspace, and an
  -- inactive member is not one.
  select wm.id into v_member
    from public.workspace_member wm
   where wm.user_id = auth.uid()
     and wm.workspace_id = p_workspace_id
     and wm.is_active;

  if v_member is null then
    raise exception 'workspace not accessible'
      using errcode = '42501';
  end if;

  -- ---- 2. the batch --------------------------------------------------------
  if p_readings is null or jsonb_typeof(p_readings) <> 'array' then
    raise exception 'record_pilot_readings: p_readings must be an array'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_readings) > 500 then
    raise exception 'record_pilot_readings: at most 500 readings per call'
      using errcode = '22023';
  end if;

  -- ⚠️ A LOCATION MUST BE ONE OF THIS WORKSPACE'S. The composite foreign key
  -- would refuse it too, as a 23503 naming a constraint; this names the reason.
  if exists (
       select 1
         from jsonb_array_elements(p_readings) r
        where nullif(r ->> 'location_id', '') is not null
          and not exists (select 1 from public.location l
                           where l.id = (r ->> 'location_id')::uuid
                             and l.workspace_id = p_workspace_id)) then
    raise exception 'record_pilot_readings: a reading names a location outside this workspace'
      using errcode = '22023';
  end if;

  insert into public.pilot_reading
         (id, workspace_id, member_id, location_id, device_id,
          kind, screen, value, occurred_at, build)
  select (r ->> 'id')::uuid,
         p_workspace_id,
         v_member,
         nullif(r ->> 'location_id', '')::uuid,
         (r ->> 'device_id')::uuid,
         r ->> 'kind',
         r ->> 'screen',
         (r ->> 'value')::integer,
         (r ->> 'occurred_at')::timestamptz,
         r ->> 'build'
    from jsonb_array_elements(p_readings) r
      on conflict (id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

comment on function public.record_pilot_readings(uuid, jsonb) is
  'Files a batch of §5 pilot readings for the caller, in one workspace. The member '
  'is stamped from auth.uid() and is never an argument. Idempotent on each '
  'reading''s client id: a re-sent batch lands nothing and returns 0. Plan 5P-a.';

revoke all on function public.record_pilot_readings(uuid, jsonb) from public, anon;
grant execute on function public.record_pilot_readings(uuid, jsonb) to authenticated;

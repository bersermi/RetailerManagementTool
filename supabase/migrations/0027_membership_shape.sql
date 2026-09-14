-- ============================================================================
-- 0027 — the membership shape: the join code, and one table for two ways in
--
-- ADR-035 §2.3, §2.7 (amended 2026-09-13, C11.5 / C11.6), §2.8, §9.
-- docs/PLAN.md task 4.6a-i.
--
-- THE FIRST MIGRATION OF STEP 4.6, and the first this schema has had that
-- RENAMES A COLUMN. It ships no RPC: `create_invite` / `redeem_invite` are
-- `0028` (4.6a-ii) and `request_access` / `approve_request` /
-- `my_access_requests` are `0029` (4.6a-iii). This file is the table, the
-- column nobody has, and the three helpers both paths call.
--
-- ADR-035 §2.7, as amended:
--
--     There are two ways in, not one. The joiner is given a workspace code,
--     enters it, and REQUESTS access, which the owner approves. An invite is
--     simply a request that arrives pre-approved — so it is one table and one
--     lifecycle, not two.
--
-- Five of register #9's eight rulings land here: D1, D2, D3', D4, D5. D6-D8 are
-- the pull path and land in `0029`; §2.7's amendment table is the authority on
-- which is which, and each freezes when ITS migration merges.
--
-- ---------------------------------------------------------------------------
-- DECISIONS
-- ---------------------------------------------------------------------------
-- 1. ⚠️⚠️ D1 AND D4 CANNOT BOTH BE TRUE AS WRITTEN, AND THIS FILE RESOLVES THEM
--    IN D4'S FAVOUR. This is the one decision here that is cheap today and a
--    fix-forward migration tomorrow, so it is first.
--
--    §2.7's D1 says `decided_by` is "present exactly when `source = 'invite'`".
--    §2.7's D4 says `decided_by` is "set at creation for an invite AND AT
--    APPROVAL FOR A REQUEST". Read literally, D1's CHECK forbids the row D4
--    requires: an approved request would have a decider on a `source =
--    'request'` row and violate the constraint. Nothing could ever satisfy both.
--
--    D4 is the one to keep, because D1's collision is with D4's ENTIRE REASON
--    for existing. D4 exists so that "who approved this membership" has an
--    answer in the schema — and the request path is the ONLY path where
--    approval is a separate act by a separate person. A constraint that empties
--    `decided_by` on exactly those rows leaves D4 renaming a column for a
--    question it can no longer answer.
--
--    D1's own reason survives intact. It is that "a self-request has nobody to
--    put there" — which is a statement about the row AT CREATION, not for all
--    time. A CHECK cannot say "at creation", so the invariant is expressed as
--    the state that means the same thing:
--
--      invite   → a decider from the start          (decided_by not null)
--      request  → a decider exactly once decided    (decided_by is not null)
--                                                   = (accepted_at is not null)
--
--    So a pending request has no decider, which is D1's requirement, and an
--    approved one has exactly the owner who approved it, which is D4's.
--
-- 2. D1 AND D2 SHARE ONE CHECK, as `docs/PLAN.md` 4.6a-i requires ("ONE check
--    constraint holding the first two together"). They are one invariant read
--    twice: an invite is the path with a token and a decider up front, a
--    request is the path with neither. Two constraints could be satisfied
--    separately and would let a `source = 'request'` row carry a token.
--
-- 3. ⚠️⚠️ D3' NEEDS A COLUMN, AND THE ALTERNATIVE IS DELETING THE AUDIT TRAIL.
--    D3' says the creating RPC must supersede an expired pending row, because
--    `workspace_invite_one_pending_idx` is partial on `accepted_at is null` and
--    an expired row still has `accepted_at is null` — so it holds the slot
--    forever and nobody can ever re-ask. §2.7 adds that it cannot be fixed in
--    the index: `now()` is not `immutable` and may not appear in a predicate.
--
--    A function can only free that slot two ways: DELETE the row, or change a
--    column the predicate reads. `0002:403` says the rows are "kept as an audit
--    trail", and deleting is how an owner loses the record that they asked and
--    it lapsed — so the column is `superseded_at`, and the partial index now
--    reads `accepted_at is null and superseded_at is null`. It is a timestamp
--    rather than a boolean because "when did this lapse" is the question an
--    approval queue actually gets asked.
--
--    ⚠️ Stamping `accepted_at` instead was considered and refused: it means
--    "somebody joined", and `accepted_by` is constrained to move with it. That
--    would record a membership that does not exist.
--
-- 4. THE CODE IS GENERATED FROM `gen_random_bytes`, NOT `random()`. D6 makes
--    the resolving RPC an enumeration oracle by construction and says in terms
--    that 8 Crockford characters are "what make guessing impractical, and that
--    — not aesthetics — is the reason for the length". A caller who can predict
--    the PRNG does not need to guess, and `random()` is seeded per backend and
--    is not cryptographically strong. pgcrypto is already installed.
--
--    256 is a multiple of 32, so `byte % 32` over the 32-character alphabet is
--    uniform with no modulo bias.
--
-- 5. THE NORMALISER MAPS, IT DOES NOT VALIDATE. `I`/`L` → `1` and `O` → `0` are
--    the substitutions Crockford defines, and they are why those letters are
--    not in the alphabet. `U` is excluded too but has NO defined mapping, so a
--    typed `U` is left standing and simply matches no code. Whitespace and
--    hyphens are stripped, because a code read aloud gets written down in
--    groups.
--
-- 6. `source` IS text-with-a-CHECK, NOT AN ENUM, following `failed_write.kind`
--    (`0024:205`) — the most recent precedent and the closest in shape. The six
--    enums in this schema are domain vocabulary; this is a two-valued
--    discriminator that §2.7 spells as two string literals.
--
-- 7. ⚠️ NO SEED ROWS, AND THE INSTINCT POINTS THE OTHER WAY. `3.2a` found
--    `workspace_invite` is the one tenant table the seed leaves empty and
--    `4.5b` found the isolation suites go red on an empty tenant table, so
--    "seed it" looks like the fix. It is not: `02`'s own F9 ASSERTS the table
--    was empty in the seed and says a future seed populating it "turns red and
--    someone decides whether the fixture is still wanted". This migration
--    touches no seed file and F9 stays the guard on that decision.
--
-- 8. ⚠️ THE RENAME BREAKS THREE GREEN SUITES, AND RE-SIGNING THEM IS PART OF
--    THIS TASK. `02_rls_isolation_reads.sql:106`, `03_rls_isolation_writes.sql:256`
--    and `04_rls_isolation_writes_inserts.sql:363` each insert a fixture naming
--    `invited_by`. The rename does not break a test's CLAIM; it breaks the
--    INSERT, so all three die in setup — and `4c-ii` recorded that a suite which
--    dies in setup reports ZERO failing tests. They are updated in the same
--    commit as this file.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The join code  (register #9 D5, ADR-035 §2.7, C11.6)
-- ----------------------------------------------------------------------------
-- `workspace` has had no code since `0001:110`, and the `id` cannot serve:
-- nobody reads a uuid over WhatsApp. C11.6 is explicit that workspaces are
-- never listed, so the code is the ONLY handle a non-member ever has on a
-- workspace — which is what makes its shape a security property and not a
-- formatting preference.

create or replace function public.generate_workspace_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  -- Crockford base32: no I, L, O (misread as 1 and 0) and no U.
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes    bytea;
  v_code     text;
  v_tries    int := 0;
begin
  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_code  := '';
    for i in 0..7 loop
      -- 256 % 32 = 0, so this is uniform over the alphabet.
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;

    exit when not exists (
      select 1 from public.workspace w where w.code = v_code
    );

    -- D5: "generated with retry-on-collision". ~10^12 codes, so a collision is
    -- a retry and not a design. A hundred in a row is not a collision, it is a
    -- broken random source, and it should say so rather than spin.
    v_tries := v_tries + 1;
    if v_tries >= 100 then
      raise exception 'could not generate a unique workspace code in % attempts', v_tries
        using errcode = 'internal_error';
    end if;
  end loop;

  return v_code;
end;
$$;

comment on function public.generate_workspace_code() is
  'An unused 8-character Crockford base32 workspace code, retried on collision. '
  'Cryptographically random because ADR-035 §2.7 D6 makes the resolving RPC an '
  'enumeration oracle and the length is the only thing defending it.';


create or replace function public.normalize_workspace_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- Strips the grouping a code acquires when it is written down, then applies
  -- Crockford's own substitutions for the letters the alphabet excludes.
  -- `U` is excluded with no defined mapping, so it survives and matches nothing.
  select nullif(
           translate(
             upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g')),
             'ILO',
             '110'
           ),
           ''
         );
$$;

comment on function public.normalize_workspace_code(text) is
  'Normalises a workspace code typed by someone standing up: case-folded, '
  'grouping removed, I/L -> 1 and O -> 0 per Crockford. ADR-035 §2.7 D5.';


alter table public.workspace
  add column code text;

-- The backfill: every workspace that already exists gets one before the column
-- is made mandatory. Row by row, because the generator reads the table it is
-- writing to and a set-based update would not see its own collisions.
do $$
declare r record;
begin
  for r in select id from public.workspace where code is null loop
    update public.workspace
       set code = public.generate_workspace_code()
     where id = r.id;
  end loop;
end;
$$;

alter table public.workspace
  alter column code set not null;

alter table public.workspace
  add constraint workspace_code_shape
    check (code ~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$');

-- Unique, and the index the resolving RPC in `0029` will read. There is no
-- SELECT policy behind it and there will not be one — D6.
create unique index workspace_code_unique_idx
  on public.workspace (code);

comment on column public.workspace.code is
  'The join code, read aloud over WhatsApp and typed by the joiner. 8 characters '
  'of Crockford base32, unique, never listed (C11.6). ADR-035 §2.7 D5.';


-- ----------------------------------------------------------------------------
-- 2. workspace_invite re-shaped — one table, two ways in  (D1, D2, D4)
-- ----------------------------------------------------------------------------
-- `0002:370` built this table for an owner-initiated PUSH only. The amendment
-- of 2026-09-13 added the PULL, and an invite became "a request that arrives
-- pre-approved" — the framing that lets one table serve both.

alter table public.workspace_invite
  add column source text not null default 'invite';

-- D1 + decision 3 above: the default is what keeps the three applied pgTAP
-- fixtures valid without naming a column they were written before, and it needs
-- no backfill — every row that exists today IS an invite.
comment on column public.workspace_invite.source is
  'Which way in this row is: an owner-initiated invite, or a joiner-initiated '
  'request through the workspace code. ADR-035 §2.7 D1.';

-- D4: the rename, and the first in this schema's history. `accepted_by` meant
-- the INVITEE on one path and the OWNER on the other — a semantic overload that
-- reads as correct until someone asks who approved a membership.
alter table public.workspace_invite
  rename column invited_by to decided_by;

alter table public.workspace_invite
  alter column decided_by drop not null;

-- ⚠️ A COLUMN RENAME DOES NOT RENAME THE CONSTRAINTS THAT REFERENCE IT. Postgres
-- left this FK called `workspace_invite_invited_by_fkey`, which is a copy of the
-- old name in the catalog — the place a later session looks when a constraint
-- fires and the error names it. Six of this repository's seven recorded defects
-- are a stale copy nobody re-read.
alter table public.workspace_invite
  rename constraint workspace_invite_invited_by_fkey to workspace_invite_decided_by_fkey;

-- D2: a self-request has no token as a matter of CONCEPT, not of timing. A
-- dummy to satisfy `not null` would be a unique, never-redeemable secret stored
-- for nothing. `workspace_invite_token_hash_unique` is untouched — Postgres
-- admits many nulls in a unique constraint.
alter table public.workspace_invite
  alter column token_hash drop not null;

-- D1 AND D2 IN ONE CHECK (decisions 1 and 2 above). The `(decided_by is not
-- null) = (accepted_at is not null)` half is the resolution of D1 against D4:
-- a pending request has no decider, an approved one has exactly the person who
-- approved it.
alter table public.workspace_invite
  add constraint workspace_invite_source_consistent
    check (
      (source = 'invite'
        and token_hash is not null
        and decided_by is not null)
      or
      (source = 'request'
        and token_hash is null
        and (decided_by is not null) = (accepted_at is not null))
    );

comment on column public.workspace_invite.decided_by is
  'Who decided this membership: the inviter at creation on the invite path, the '
  'approver at approval on the request path. Distinct from accepted_by, which is '
  'who actually joined. ADR-035 §2.7 D4.';


-- ----------------------------------------------------------------------------
-- 3. Superseding the expired pending row  (D3')
-- ----------------------------------------------------------------------------
-- ⚠️ THE BUG D3' CORRECTS IS ALREADY IN THE APPLIED SCHEMA, and it is worse
-- than the brief that found it said. `workspace_invite_one_pending_idx` is
-- partial on `accepted_at is null`; an EXPIRED row still has `accepted_at is
-- null`, so it occupies the slot permanently. Today, an invite that lapses
-- means that email can never be invited to that workspace again — and after
-- `0029` it would mean they can never request access either.

alter table public.workspace_invite
  add column superseded_at timestamptz;

-- A superseded row is one nobody acted on. If it had been accepted it would not
-- have been in anyone's way.
alter table public.workspace_invite
  add constraint workspace_invite_superseded_unaccepted
    check (superseded_at is null or accepted_at is null);

comment on column public.workspace_invite.superseded_at is
  'When this pending row was retired to free the one-pending slot for a new ask. '
  'The row is kept, not deleted: 0002 keeps these as an audit trail, and "we '
  'asked and it lapsed" is the half an approval queue needs. ADR-035 §2.7 D3.';

-- The index D3' exists because of, re-cut. It still cannot read `now()` —
-- that is why the function below has to do the work.
drop index public.workspace_invite_one_pending_idx;

create unique index workspace_invite_one_pending_idx
  on public.workspace_invite (workspace_id, email)
  where accepted_at is null and superseded_at is null;

comment on index public.workspace_invite_one_pending_idx is
  'One LIVE ask per email per workspace. Accepted, expired-and-superseded rows '
  'are kept as an audit trail, so the index covers only those still actionable.';


-- The helper both creating RPCs call, written once here rather than twice
-- downstream. `0028`'s create_invite and `0029`'s request_access each call it
-- before inserting; neither exists yet.
--
-- Not `security definer`: its only callers ARE definer functions, so it already
-- runs with their privileges, and a definer helper reachable on its own would be
-- a way to retire someone else's pending invite.
create or replace function public.supersede_expired_invite(
  p_workspace_id uuid,
  p_email        citext
)
returns int
language plpgsql
set search_path = ''
as $$
declare
  v_superseded int;
begin
  update public.workspace_invite
     set superseded_at = now()
   where workspace_id  = p_workspace_id
     and email         = p_email
     and accepted_at   is null
     and superseded_at is null
     and expires_at    <= now();

  get diagnostics v_superseded = row_count;
  return v_superseded;
end;
$$;

comment on function public.supersede_expired_invite(uuid, citext) is
  'Retires any EXPIRED pending row for this (workspace, email) so a new ask can '
  'take the one-pending slot. ADR-035 §2.7 D3: the partial index cannot test '
  'expiry itself, because now() is not immutable and may not appear in a '
  'predicate — so the creating RPC must do it first.';

-- ⚠️ `from public`, NOT `from anon, authenticated` — and the catalog is what said
-- so. EXECUTE on a new function is granted to PUBLIC by default, and revoking the
-- two Supabase roles leaves that default standing: `proacl` still read `=X/postgres`
-- after the tighter-looking revoke. `0001:595` and `0002:596` already had it right.
--
-- None of the three needs a client grant. All three are called from `security
-- definer` bodies — onboard_workspace here, create_invite in `0028`, request_access
-- in `0029` — which run as the definer and do not consult the caller's privileges.
revoke all on function public.generate_workspace_code()                  from public;
revoke all on function public.normalize_workspace_code(text)             from public;
revoke all on function public.supersede_expired_invite(uuid, citext)     from public;


-- ----------------------------------------------------------------------------
-- 4. onboard_workspace — replaced a third time, for the code
-- ----------------------------------------------------------------------------
-- Replaced rather than edited, as `0002` replaced `0001`'s: migrations are
-- append-only once applied. `0001` created the workspace, its owner membership,
-- its settings row and one location; `0002` added the generic provider. This
-- adds nothing to the row count — a new workspace is simply BORN with a code,
-- because there is no second moment at which anyone would think to give it one.

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

  -- New in 0027.
  insert into public.workspace (display_name, prices_include_tax, code)
  values (btrim(p_display_name), p_prices_include_tax,
          public.generate_workspace_code())
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
  'Creates a workspace with its join code, owner membership, settings, first '
  'location and generic provider. Five rows. ADR-035 §2.3, §2.7.';

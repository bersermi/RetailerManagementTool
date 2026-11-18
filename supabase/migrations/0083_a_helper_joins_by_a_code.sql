-- ============================================================================
-- 0083 — a helper joins a kitchen by a code, and puts a photo on her dish
-- ============================================================================
-- docs/PLAN.md task `10.9b-iii` — the last third of helpers (`10.9b`, split on
-- size 2026-11-18). The owner's ruling of 2026-11-18, asked with the situations
-- (Doña Mari hires Lupita): *"Agree with your recommendation."* —
--
--   a code for ONE person, good for 24 HOURS, 16 characters typed in four groups
--   of four (Wera's own invitation, `0028`), NO ADDRESS ASKED, and she joins as a
--   helper AT ONCE, with no confirmation by name; the owner removes her from
--   *Quién trabaja aquí*. Inviting stays the owner's (G18).
--
-- and G36 of 2026-11-17 (a helper publishes too), whose last piece — her dish's
-- photo — `10.9b-ii` found still refused.
--
-- ----------------------------------------------------------------------------
-- 1. THE ADDRESS, OPTIONAL — for a helper's invitation alone
-- ----------------------------------------------------------------------------
-- `workspace_invite.email` has been NOT NULL since `0002`, and every row so far
-- carries one: Wera's invitations name the person the owner typed, and a request
-- carries the asker's. A kitchen's code names nobody — whoever holds it is the
-- person (`0028`'s decision 5: the token is the credential, and redemption never
-- read the address). So the column admits a null, and a CHECK keeps the null to
-- the one row that may have it: an INVITE for a HELPER (`staff`). A request, and
-- an invitation for a manager or an owner, still carry an address.
--   * The one-pending index (`0027`) is on `(workspace_id, email)`: Postgres
--     counts nulls as distinct, so a kitchen may hold several live codes at once —
--     one per person she is inviting, as ruled.
--   * Who may write such a row: nobody directly — `0055` closed the table's
--     insert and delete to every client; `invite_helper` below is the one writer,
--     and it asks that the business is a kitchen.
--   * ⚠️ Wera never meets one: a shop's invitations are made by `create_invite`,
--     which still refuses a blank address (`22023`), and Wera opens shops only.
--
-- ----------------------------------------------------------------------------
-- 2. `invite_helper(p_workspace_id)` — *Invitar a alguien*
-- ----------------------------------------------------------------------------
-- The owner of a kitchen asks for a code. One row: no address, the role `staff`,
-- the kitchen's one place (so `my_locations()` lets the helper work there the
-- moment she joins — `0082`'s location wall), `decided_by` the owner, expiring
-- 24 hours on. The token is `0028`'s — 16 Crockford characters, 80 bits — and
-- it is in the answer and nowhere else: only its hash is kept.
--   - signed out, or not the OWNER of that business: 42501 (G18: inviting is
--     hers; a helper and a manager are refused alike);
--   - a shop: TD013 (`0072`'s *only a kitchen*) — Wera's own invitations stay
--     `create_invite`'s, with an address;
--   - a kitchen with no active place: 22023 (no kitchen is made without one).
-- ⚠️ Each call is a new code, and an earlier one is NOT retired: each is for one
-- person and lives its 24 hours — Mari may invite Lupita and Rosa the same
-- afternoon. A code is spent by the first person who joins with it.
--
-- ----------------------------------------------------------------------------
-- 3. `kitchen_of_code(p_token)` — *Unirme a Fonda Doña Mari*
-- ----------------------------------------------------------------------------
-- Whoever holds a valid code is told the kitchen's name BEFORE she joins (the
-- plan's row; the family-shell page's button). It reads `workspace_invite` and
-- `workspace` past their policies — she belongs to nothing yet — and answers
-- `{kitchen_name}` for a helper's code that is live, or already hers. Its
-- refusals are `redeem_invite`'s own, so the screen says one thing for both:
--   - signed out: 42501; blank: 22023;
--   - no such code, a code someone else spent, or a code that is not a
--     kitchen's helper code (a shop's emailed token): TD005 — never a name;
--   - expired or replaced: TD003.
-- It is an oracle in the same way `redeem_invite` is, and the same 80 bits stand
-- in front of it (`0028`'s decision 3).
--
-- Joining itself is `redeem_invite` as it is (`0028`, last made by `0036`):
-- holding the code is the proof — it writes her `staff` membership with the name
-- she signed up with (`0034`), her place, and spends the code.
--
-- ----------------------------------------------------------------------------
-- 4. HER DISH'S PHOTO — the bucket `cocina`'s insert policy, `staff`
-- ----------------------------------------------------------------------------
-- `0076` wrote `photo_folder_ok(name, 'manager')`: a helper's photo was refused,
-- and her offer with it, while `publish_listing` let her publish since `0082`.
-- Lowered to `staff` — any active member of THAT kitchen — with the kitchen's
-- own fence (`kitchen_folder_ok`) unchanged, so a neighbour, a shop's owner and
-- another kitchen's owner still write nothing there. Still no update and no
-- delete policy. Only where Storage runs (CI resets without it).
--
-- ----------------------------------------------------------------------------
-- 5. THE DELETIONS — nothing to change, read back by the suite and the rehearsal
-- ----------------------------------------------------------------------------
-- A kitchen deleted takes its codes (`workspace_invite.workspace_id` is `on
-- delete cascade`, `0002`); a helper's account deleted takes the code she joined
-- with (`delete_my_account` deletes the rows `accepted_by` her, `0053`, last made
-- by `0080`), and a code nobody used carries no address to find.
--
-- No new code (TD003, TD005, TD013 reused). Field rule: two functions added, a
-- column made nullable, a policy re-made; nothing removed.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The address, optional for a helper's invitation alone
-- ----------------------------------------------------------------------------

alter table public.workspace_invite
  alter column email drop not null;

alter table public.workspace_invite
  add constraint workspace_invite_email_or_helper_code
    check (email is not null or (source = 'invite' and role = 'staff'));

comment on column public.workspace_invite.email is
  'Who an invitation or a request is for: the address the owner typed (an invite) '
  'or the asker''s (a request). NULL only on a kitchen''s helper code '
  '(invite_helper, 0083) — whoever holds the code is the person — and the CHECK '
  'workspace_invite_email_or_helper_code keeps it there. ADR-035 §2.7.';


-- ----------------------------------------------------------------------------
-- 2. invite_helper — *Invitar a alguien*
-- ----------------------------------------------------------------------------

create function public.invite_helper(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_kind   public.workspace_kind;
  v_place  uuid;
  v_token  text;
  v_hash   text;
  v_tries  int := 0;
  v_invite public.workspace_invite%rowtype;
begin
  if v_user is null then
    raise exception 'invite_helper requires an authenticated caller' using errcode = '42501';
  end if;

  -- G18: inviting is the owner's. A helper and a manager are refused alike.
  if not public.has_role(p_workspace_id, 'owner') then
    raise exception 'invite_helper: only the owner of that kitchen invites' using errcode = '42501';
  end if;

  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'invite_helper: only a kitchen invites a helper by a code' using errcode = 'TD013';
  end if;

  -- The kitchen's one place: the helper works there the moment she joins.
  select l.id into v_place
    from public.location l
   where l.workspace_id = p_workspace_id and l.is_active
   order by l.created_at, l.id
   limit 1;
  if v_place is null then
    raise exception 'invite_helper: that kitchen has no place to work at' using errcode = '22023';
  end if;

  -- 0028's token and retry: 80 bits, and the unique hash makes a collision an
  -- error in front of nobody rather than a fiction.
  loop
    v_token := public.generate_invite_token();
    v_hash  := public.hash_invite_token(v_token);
    exit when not exists (select 1 from public.workspace_invite wi where wi.token_hash = v_hash);
    v_tries := v_tries + 1;
    if v_tries >= 100 then
      raise exception 'could not generate an unused invite token in % attempts', v_tries
        using errcode = 'internal_error';
    end if;
  end loop;

  insert into public.workspace_invite
    (workspace_id, email, role, location_ids, source, decided_by, token_hash, expires_at)
  values
    (p_workspace_id, null, 'staff', array[v_place], 'invite', v_user, v_hash, now() + interval '24 hours')
  returning * into v_invite;

  -- ⚠️ THE TOKEN IS IN THIS ANSWER AND NOWHERE ELSE: only its hash is kept.
  return jsonb_build_object(
    'token',      v_token,
    'expires_at', v_invite.expires_at
  );
end;
$$;

comment on function public.invite_helper(uuid) is
  'Invitar a alguien: the owner of a kitchen gets a code for ONE person, good for 24 '
  'hours, with no address — the owner''s ruling of 2026-11-18. One workspace_invite '
  'row: email null, role staff, the kitchen''s one place, decided_by the owner; '
  'answers {token, expires_at}, the token shown once (only its hash is kept). Each '
  'call is a new code; an earlier one is not retired. Joining is redeem_invite. '
  '42501 signed out or not the owner (G18), TD013 a shop, 22023 no place. 0083, '
  'plan 10.9b-iii.';

revoke all on function public.invite_helper(uuid) from public, anon;
grant execute on function public.invite_helper(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. kitchen_of_code — *Unirme a Fonda Doña Mari*
-- ----------------------------------------------------------------------------

create function public.kitchen_of_code(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_invite public.workspace_invite%rowtype;
  v_name   text;
begin
  if v_user is null then
    raise exception 'kitchen_of_code requires an authenticated caller' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    raise exception 'kitchen_of_code: a code is required' using errcode = '22023';
  end if;

  -- A helper's code at a kitchen, and nothing else: a shop's emailed token is
  -- not found here, so it names nothing.
  select wi.* into v_invite
    from public.workspace_invite wi
    join public.workspace w on w.id = wi.workspace_id
   where wi.token_hash = public.hash_invite_token(p_token)
     and wi.source = 'invite'
     and wi.role = 'staff'
     and wi.email is null
     and w.kind = 'cocina';
  if not found then
    raise exception 'kitchen_of_code: this invitation code is not valid' using errcode = 'TD005';
  end if;

  -- redeem_invite's order (0036): spent first — hers is still hers — then
  -- replaced, then expired.
  if v_invite.accepted_at is not null and v_invite.accepted_by is distinct from v_user then
    raise exception 'kitchen_of_code: this invitation has already been used' using errcode = 'TD005';
  end if;
  if v_invite.accepted_at is null then
    if v_invite.superseded_at is not null then
      raise exception 'kitchen_of_code: this invitation was replaced by a newer one' using errcode = 'TD003';
    end if;
    if v_invite.expires_at <= now() then
      raise exception 'kitchen_of_code: this invitation expired' using errcode = 'TD003';
    end if;
  end if;

  select w.display_name into v_name from public.workspace w where w.id = v_invite.workspace_id;
  return jsonb_build_object('kitchen_name', v_name);
end;
$$;

comment on function public.kitchen_of_code(text) is
  'Unirme a …: the name of the kitchen a helper''s code would join, told to whoever '
  'holds a live one before she joins (or to the person who already joined with it). '
  'Reads workspace_invite and workspace past their policies; answers {kitchen_name}. '
  'Its refusals are redeem_invite''s: 42501 signed out, 22023 blank, TD005 no such '
  'code / spent by someone else / not a kitchen''s helper code, TD003 expired or '
  'replaced. 0083, plan 10.9b-iii.';

revoke all on function public.kitchen_of_code(text) from public, anon;
grant execute on function public.kitchen_of_code(text) to authenticated;


-- ----------------------------------------------------------------------------
-- 4. Her dish's photo: the bucket `cocina`'s insert policy asks `staff`
-- ----------------------------------------------------------------------------

do $fotos$
begin
  if to_regclass('storage.objects') is null then
    raise notice '0083: no Storage here — the bucket cocina''s policy is re-made where Storage runs';
    return;
  end if;

  execute 'drop policy if exists cocina_insert on storage.objects';
  execute $p$
    create policy cocina_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'cocina'
                  and public.photo_folder_ok(name, 'staff')
                  and public.kitchen_folder_ok(name))
  $p$;
end
$fotos$;

-- ============================================================================
-- 0089 — when her stamps are erased: any number of days from 14 to 365
-- ============================================================================
-- docs/PLAN.md task `10.9k` — the owner's rulings of 2026-11-19, late evening,
-- after a taquero's feedback (*"better to allow an even more flexible picker"*):
-- the loyalty card's *¿Cuándo se borran sus sellos si no vuelve?* becomes
-- *Nunca · 2 semanas · 1 mes · 2 meses · 3 meses · Otro…*, nothing pre-chosen
-- (G34), kept as days — 14, 30, 60, 90 (a month is 30 days, as
-- `make_interval(days => …)` already counts it) — and *Otro…* typed, from 14 to
-- 365 days (*"shortest 14 days"*). It replaces G15's *15, 30, 45 or 60*.
--
-- WHAT IS HERE:
--   1. `servicio.card_terms`' `card_terms_expiry` — `expiry_days in (15, 30,
--      45, 60)` becomes `between 14 and 365` (NULL is still *Nunca*). Every row
--      `0085` let in (15, 30, 45, 60) fits the new range, so nothing is changed
--      or refused as it is checked again.
--   2. `public.set_card_terms` — RE-CREATED, ITS SIGNATURE UNCHANGED: the days
--      are 0 (*Nunca*) or a whole number from 14 to 365; anything else 22023,
--      as before. Nothing else in its body changes.
--
-- WHAT STAYS AS IT IS (each `0085`'s, untouched here):
--   * a card keeps the terms it started on (G12) — cards going on 15 or 45 days
--     keep them, and a fonda who reopens her setup reads hers as *Otro…*;
--   * the days count from her last stamp (G15): `card_state`, `kitchen_card`,
--     `give_card_stamp` and the nightly `forget_cards` add `expiry_days` days to
--     `last_stamp_at` whatever the number — none needs re-making;
--   * the door's `card` and `my_cards` send `expiry_days` as they did: a number,
--     or null for *Nunca*.
--
-- ⚠️ THE FIELD RULE (ADR-035 §2.2): nothing a build calls is removed or renamed;
-- one check widened and one function re-made with its own signature. A terms
-- row keeps its shape — a smallint, or null. An Itacate build from before `10.9k`
-- reads a card of a day count it does not know (21) as no card before her first
-- stamp, and draws nothing — never a crash; the builds that reach people are
-- the final MVP version's (the owner's ruling of 2026-11-19), which read any.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The check: 14 to 365 days, or NULL (*Nunca*)
-- ----------------------------------------------------------------------------

alter table servicio.card_terms drop constraint card_terms_expiry;
alter table servicio.card_terms
  add constraint card_terms_expiry check (expiry_days between 14 and 365);

comment on table servicio.card_terms is
  'Each version of a kitchen''s loyalty card terms (Tarjeta de lealtad): the reward (1 to 60 '
  'characters), 4 to 12 stamps, and the days without a stamp after which hers are erased '
  '(14 to 365 since 0089 — 15, 30, 45 or 60 before; NULL is Nunca). The newest (replaced_at '
  'null) is the current one; closed_at on it is the card closed (G12: no new cards; those '
  'started finish and redeem for 30 days). A card keeps the version it started on. Written by '
  'the owner (set_card_terms, close_card); goes with the kitchen. 0085, plan 10.9e-i; 0089, '
  'plan 10.9k.';


-- ----------------------------------------------------------------------------
-- 2. `set_card_terms`: the days are 0 (*Nunca*) or 14 to 365
-- ----------------------------------------------------------------------------
-- `0085`'s body, word for word, but for the days' check and its message.

create or replace function public.set_card_terms(
  p_workspace_id uuid,
  p_reward       text,
  p_stamps       integer,
  p_expiry_days  integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_kind   public.workspace_kind;
  v_reward text := btrim(coalesce(p_reward, ''));
  v_days   smallint;
  v_cur    servicio.card_terms%rowtype;
begin
  if v_user is null then
    raise exception 'set_card_terms requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'owner') then
    raise exception 'set_card_terms: only the kitchen''s owner sets its card' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'set_card_terms: only a kitchen has a loyalty card' using errcode = 'TD013';
  end if;
  if not servicio.card_switched_on() then
    raise exception 'set_card_terms: the loyalty card is not offered yet' using errcode = 'TD024';
  end if;
  if char_length(v_reward) not between 1 and 60 then
    raise exception 'set_card_terms: the reward is 1 to 60 characters' using errcode = '22023';
  end if;
  if p_stamps is null or p_stamps not between 4 and 12 then
    raise exception 'set_card_terms: 4 to 12 stamps' using errcode = '22023';
  end if;
  if p_expiry_days is null or (p_expiry_days <> 0 and p_expiry_days not between 14 and 365) then
    raise exception 'set_card_terms: the days are 0 (Nunca) or 14 to 365' using errcode = '22023';
  end if;
  v_days := nullif(p_expiry_days, 0);

  select * into v_cur from servicio.card_terms t
   where t.workspace_id = p_workspace_id and t.replaced_at is null
     for update;

  if not (found and v_cur.closed_at is null and v_cur.reward = v_reward
          and v_cur.stamps = p_stamps and v_cur.expiry_days is not distinct from v_days) then
    -- Opened again more than 30 days after it closed: what the closing ended stays
    -- ended, whether or not the nightly job has run yet (the review of 10.9e-i).
    if v_cur.closed_at is not null and v_cur.closed_at <= now() - interval '30 days' then
      delete from servicio.loyalty_card c where c.workspace_id = p_workspace_id;
      delete from servicio.card_reward r where r.workspace_id = p_workspace_id and r.claimed_at is null;
    end if;
    update servicio.card_terms t set replaced_at = now() where t.id = v_cur.id;
    insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_by)
    values (p_workspace_id, v_reward, p_stamps, v_days, v_user);
  end if;

  insert into servicio.kitchen_feature as f (workspace_id, feature, state)
  values (p_workspace_id, 'tarjeta', 'on')
  on conflict (workspace_id, feature) do update
     set state = 'on',
         changed_at = case when f.state = 'on' then f.changed_at else now() end;

  return public.kitchen_card(p_workspace_id);
end;
$$;

comment on function public.set_card_terms(uuid, text, integer, integer) is
  'Activar / Guardar on the loyalty card''s setup (G7, G34): the reward (1 to 60 '
  'characters, trimmed), 4 to 12 stamps, and the days without a stamp after which hers '
  'are erased — 0 (Nunca) or a whole number from 14 to 365 (0089, plan 10.9k: the chips '
  '2 semanas, 1 mes, 2 meses, 3 meses are 14, 30, 60, 90; Otro… any in range), required '
  '(nothing pre-chosen). The owner''s (G18). The same terms again change nothing; other '
  'terms are a new version that only new cards take (G12), and reopen a closed card. Turns '
  'her choice of tarjeta on. Answers kitchen_card. 42501 signed out or not the owner, TD013 '
  'a shop, TD024 Wera''s switch off, 22023 a term out of range. 0085, plan 10.9e-i; 0089.';

-- Re-made with its own signature, so its rights stand; said again so this file
-- alone shows them (ADR-035 §2.7: never `from public` alone).
revoke all on function public.set_card_terms(uuid, text, integer, integer) from public, anon;
grant execute on function public.set_card_terms(uuid, text, integer, integer) to authenticated;

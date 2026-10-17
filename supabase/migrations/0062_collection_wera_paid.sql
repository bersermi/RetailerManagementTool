-- ============================================================================
-- 0062 — TE LO COMPRO: WHAT WERA PAID. Plan task `8n`, the owner's ruling of
-- 2026-10-17 on Inicio's *Rescatado* (*"Rescatado $… Que la Wera te compró."*):
--
--   *"What Wera paid"* — over an estimate at the shop's own shelf price.
--
-- ⚠️ ONE COLUMN, TYPED BY THE OWNER IN THE SUPABASE DASHBOARD when he marks a
-- pickup `recogida` — he is the one paying, and the dashboard is the pilot's
-- whole operator console (`0059`). Pesos, like every money column in this
-- schema; `null` until he types it, which is not the same as a zero.
--
-- ⚠️ NO CLIENT WRITES IT. `0059` granted `authenticated` SELECT on this table and
-- nothing else, and that is unchanged: a shop reads what Wera paid and can never
-- say it. Who reads it is `collection_request_select`'s — owners and managers.
--
-- ⚠️ NOT TIED TO THE STATUS. The dashboard saves one cell at a time, so a check
-- demanding `recogida` would refuse the amount whenever he types it before he
-- changes the status. Inicio counts every amount that is there.
-- ============================================================================

alter table public.collection_request
  add column wera_paid numeric(12,2);

alter table public.collection_request
  add constraint collection_request_wera_paid_non_negative
    check (wera_paid is null or wera_paid >= 0);

comment on column public.collection_request.wera_paid is
  'What Wera paid the shop for this pickup, MXN; typed by the owner in the '
  'dashboard when he marks it recogida. Null until then. No client writes it. '
  '0062, plan 8n.';

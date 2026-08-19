#!/usr/bin/env bash
# ============================================================================
# Behavioural verification for 0005 — two concurrent allocations
# ============================================================================
# ADR-035 §2.4. This is the one claim in docs/PLAN.md task 1.3b that a .sql file
# in supabase/tests/ cannot make: "two concurrent allocations cannot oversell one
# batch". A single session cannot block on its own lock, so a single-session test
# of allocate_fefo()'s `for update of bb` asserts nothing — it would pass just as
# green with the locking clause deleted.
#
# So this file drives TWO REAL CONNECTIONS. It asserts that the second session is
# made to wait — and then, because waiting alone is not the property (see session
# 2 below, where the trap is spelled out), that when it stops waiting it allocates
# against the ledger the first session actually left behind.
#
# THE FIXTURE IS BUILT SO THE BUG WOULD BE VISIBLE. Two lots of 100 for one
# variant at one store: P expires first, Q expires later. Each session asks for
# exactly 100.
#
#   with the lock  — S1 takes all of P; S2 waits, re-reads, takes all of Q.
#                    P = 0 and Q = 0.
#   without it     — both read P at 100 and both allocate P. P = -100, Q = 100:
#                    the shop has sold 200 units of a lot that held 100 while a
#                    whole lot sat untouched. THE INVARIANT STILL HOLDS AND EVERY
#                    TOTAL STILL BALANCES, which is exactly why this has to be
#                    tested rather than reasoned about — batch_balance_violations()
#                    is blind to it, and so is every check in 0005_allocation.sql.
#
# HOW THE TWO SESSIONS ARE SYNCHRONISED, without a sleep and without a race. S1
# records its backend pid in a committed row before it opens its transaction.
# This script then waits for that backend to hold a RowExclusiveLock on
# stock_movement, which it can only do once it has finished allocating AND
# written its movements — so "S1 holds the row locks" is observed, not assumed.
# S1 then spins on a committed flag row (a volatile plpgsql loop takes a fresh
# snapshot per statement under READ COMMITTED, so it can see a commit made after
# its own transaction began) until this script tells it to finish.
#
# It needs psql and DB_URL, both of which .github/workflows/db.yml already has,
# and it assumes A DATABASE THAT WAS JUST RESET, like every file beside it.
#
#   supabase db reset
#   DB_URL="$(supabase status -o env | grep '^DB_URL=' | cut -d'"' -f2)" \
#     bash supabase/tests/0005_allocation_concurrency.sh
# ============================================================================
set -uo pipefail

: "${DB_URL:?DB_URL must be set — see the header of this file}"

PASSED=0
FAILED=0

chk() { # chk <label> <status> [detail]
  if [ "$2" = "0" ]; then
    printf 'PASS  %s\n' "$1"
    PASSED=$((PASSED + 1))
  else
    printf 'FAIL  %s   [%s]\n' "$1" "${3:-}"
    FAILED=$((FAILED + 1))
  fi
}

eq() { [ "$1" = "$2" ] && echo 0 || echo 1; }

q() { psql "$DB_URL" -X -q -At -v ON_ERROR_STOP=1 -c "$1"; }

TMP="$(mktemp -d)"
cleanup() {
  # Never leave S1 holding locks — and therefore S2 blocked on them — if this
  # script dies partway through.
  q "insert into public._conc (phase) values ('go')" >/dev/null 2>&1 || true
  wait 2>/dev/null || true
  rm -rf "$TMP"
}
trap cleanup EXIT

OWNER=11111111-1111-1111-1111-111111111111
P=ffff0005-0000-0000-0000-000000000001
Q=ffff0005-0000-0000-0000-000000000002

# ------------------------------------------------------------------ fixture --
psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 >/dev/null <<SQL
create table public._conc (phase text, pid integer);

insert into auth.users (id, email) values ('$OWNER', 'owner.a@example.mx');

select set_config('request.jwt.claims',
  '{"sub":"$OWNER","role":"authenticated"}', false);
select onboard_workspace('Tienda A');
select set_config('request.jwt.claims', null, false);

insert into product_family (workspace_id, name) select id, 'Abarrotes' from public.workspace;

insert into product_variant (workspace_id, family_id, name,
       base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code)
select pf.workspace_id, pf.id, 'Jitomate a granel', 'g', 'kg', 'g', 'g'
  from public.product_family pf;

-- P expires first, so FEFO offers it to BOTH sessions. Q is the lot the second
-- session has to fall through to once it sees what the first one did. Two plain
-- inserts rather than one UNION: a union resolves its own column types before
-- they ever meet the target columns, so every literal would need a cast.
insert into public.stock_batch (id, workspace_id, location_id, variant_id, origin,
       qty_received_base, unit_cost_net_per_base, expiry_date, created_by)
select '$P', l.workspace_id, l.id, pv.id, 'adjustment', 100, 0.010000,
       current_date + 1, '$OWNER'
  from public.location l join public.product_variant pv on pv.workspace_id = l.workspace_id;

insert into public.stock_batch (id, workspace_id, location_id, variant_id, origin,
       qty_received_base, unit_cost_net_per_base, expiry_date, created_by)
select '$Q', l.workspace_id, l.id, pv.id, 'adjustment', 100, 0.020000,
       current_date + 5, '$OWNER'
  from public.location l join public.product_variant pv on pv.workspace_id = l.workspace_id;

insert into public.stock_movement (workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
select sb.workspace_id, sb.location_id, sb.id, sb.variant_id, 'adjustment',
       sb.qty_received_base, sb.unit_cost_net_per_base, now(), '$OWNER'
  from public.stock_batch sb;
SQL

WS=$(q "select id from public.workspace limit 1")
LOC=$(q "select id from public.location limit 1")
VAR=$(q "select id from public.product_variant limit 1")

chk "fixture: two open lots of 100, P expiring first" \
    "$(eq "$(q "select (select remaining_base::int from public.batch_balance where batch_id='$P')
                   || '/' ||
                   (select remaining_base::int from public.batch_balance where batch_id='$Q')")" "100/100")"

# ------------------------------------------------- session 1: takes all of P --
psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 > "$TMP/s1.log" 2>&1 <<SQL &
insert into public._conc (phase, pid) values ('s1', pg_backend_pid());

begin;

create temp table s1_alloc as
  select * from public.allocate_fefo('$WS', '$LOC', '$VAR', 100, '$OWNER', now());

insert into public.stock_movement (workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
-- A downward count, not a sale: 'sale' would demand a sale_id
-- (stock_movement_source_agrees) and this test is about the allocator, not about
-- documents. §2.4 counts a downward count as a withdrawal like any other.
select '$WS', '$LOC', a.batch_id, '$VAR', 'adjustment', -a.qty_base,
       a.unit_cost_net_per_base, now(), '$OWNER'
  from s1_alloc a;

-- Hold the locks until this script says otherwise. Bounded, so a failure here is
-- a failed test and not a hung CI job.
do \$\$
declare v_spins integer := 0;
begin
  while not exists (select 1 from public._conc where phase = 'go') loop
    perform pg_sleep(0.05);
    v_spins := v_spins + 1;
    if v_spins > 1200 then
      raise exception 'session 1 waited 60s for the go flag and gave up';
    end if;
  end loop;
end
\$\$;

commit;
SQL
S1=$!

# Wait until S1 has actually allocated AND written — a RowExclusiveLock on
# stock_movement held by its backend is the proof, and it cannot appear earlier.
S1_PID=""
for _ in $(seq 1 200); do
  S1_PID=$(q "select pid from public._conc where phase = 's1'" || true)
  [ -n "$S1_PID" ] && break
  sleep 0.05
done

HELD=1
for _ in $(seq 1 200); do
  if [ "$(q "select count(*) from pg_locks
              where pid = ${S1_PID:-0}
                and relation = 'public.stock_movement'::regclass
                and mode = 'RowExclusiveLock'" || echo 0)" = "1" ]; then
    HELD=0
    break
  fi
  sleep 0.05
done
chk "session 1: has allocated and written, and is holding its row locks" "$HELD" \
    "pid=${S1_PID:-none}"

# ---------------------- session 2: blocks, then allocates against what S1 left --
# NO lock_timeout, and it WRITES. Both matter, and the reason is the whole design
# of this file.
#
# A timeout here would prove nothing. Without `for update of bb` the second
# session still blocks — just later, inside the projection trigger, whose
# `on conflict (batch_id) do update` collides with the first session's uncommitted
# update of the same row. Blocking is therefore true in BOTH worlds and cannot
# tell them apart; an earlier draft of this file asserted it and passed green with
# the locking clause deleted.
#
# What tells them apart is WHAT SESSION 2 ALLOCATED once it is let through:
#
#   with the lock — the select is re-evaluated after S1 commits, P is no longer
#                   `remaining_base > 0`, and S2 allocates Q. P = 0, Q = 0.
#   without it    — S2 read P at 100 from a stale snapshot before blocking, and
#                   the wait does not change what it decided. It writes -100
#                   against a lot that no longer has it. P = -100, Q = 100.
#
psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 > "$TMP/s2.log" 2>&1 <<SQL &
insert into public._conc (phase, pid) values ('s2', pg_backend_pid());

begin;

create temp table s2_alloc as
  select * from public.allocate_fefo('$WS', '$LOC', '$VAR', 100, '$OWNER', now());

insert into public.stock_movement (workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
select '$WS', '$LOC', a.batch_id, '$VAR', 'adjustment', -a.qty_base,
       a.unit_cost_net_per_base, now(), '$OWNER'
  from s2_alloc a;

create table public._s2_result as
  select count(*)::text || ':' || string_agg(batch_id::text || '=' || qty_base::int, ',') as got
    from s2_alloc;

commit;
SQL
S2=$!

S2_PID=""
for _ in $(seq 1 200); do
  S2_PID=$(q "select pid from public._conc where phase = 's2'" || true)
  [ -n "$S2_PID" ] && break
  sleep 0.05
done

WAITING=1
for _ in $(seq 1 200); do
  if [ "$(q "select count(*) from pg_stat_activity
              where pid = ${S2_PID:-0} and wait_event_type = 'Lock'" || echo 0)" = "1" ]; then
    WAITING=0
    break
  fi
  sleep 0.05
done
chk "concurrency: the second session is made to WAIT for the first" "$WAITING" \
    "pid=${S2_PID:-none}"

# ------------------------------------------------------- let session 1 commit --
q "insert into public._conc (phase) values ('go')" >/dev/null
wait "$S1"
S1_STATUS=$?
chk "session 1: committed cleanly" "$(eq "$S1_STATUS" "0")" "$(tail -3 "$TMP/s1.log" | tr '\n' ' ')"

chk "session 1: took all of P, the lot that expires first" \
    "$(eq "$(q "select remaining_base::int from public.batch_balance where batch_id='$P'")" "0")"

wait "$S2"
S2_STATUS=$?
chk "session 2: committed cleanly once it was let through" "$(eq "$S2_STATUS" "0")" \
    "$(tail -3 "$TMP/s2.log" | tr '\n' ' ')"

# THE DISCRIMINATING CHECK. Waiting is not enough — it has to have re-read.
S2_GOT=$(q "select got from public._s2_result")
chk "concurrency: having waited, it allocates Q — NOT the lot the first session emptied" \
    "$(eq "$S2_GOT" "1:$Q=100")" "got '$S2_GOT'"

# ------------------------------------------------------------------ the point --
chk "concurrency: NEITHER LOT WAS OVERSOLD — 200 units asked, 200 units delivered, both lots at zero" \
    "$(eq "$(q "select (select remaining_base::int from public.batch_balance where batch_id='$P')
                   || '/' ||
                   (select remaining_base::int from public.batch_balance where batch_id='$Q')")" "0/0")"

chk "concurrency: and the §2.4 invariant survived the race" \
    "$(eq "$(q "select count(*) from public.batch_balance_violations()")" "0")"

# ---------------------------------------------------------------------- report --
printf '\n%s\n' "----------------------------------------------------------------"
if [ "$FAILED" -gt 0 ]; then
  printf '%s behavioural check(s) FAILED, %s passed\n' "$FAILED" "$PASSED"
  exit 1
fi
printf 'all %s checks passed\n' "$PASSED"

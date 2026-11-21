#!/usr/bin/env bash
# ============================================================================
# FILL, OR TOP UP, THE DEMO SHOP. Not a plan task: the owner's request of
# 2026-11-20, to show Wera to shops with months of history behind it.
#
# A made-up Pollería y Recaudería: sales from 1 May, deliveries from six
# providers whose prices move, the Merma, and an Empleado, Lucía. The ledger is
# written by `demo-polleria.sql`, beside this file — read its header for what it
# touches and refuses.
#
#   bash docs/runbooks/demo-polleria.sh demo@example.com            # the hosted project
#   bash docs/runbooks/demo-polleria.sh demo@example.com --local    # the local stack
#
# Run it from the repository folder. The first run fills May to now; every
# later run writes only what is missing, up to the minute it runs — so run it
# the morning of a demo and today has sales. Nothing is ever written twice.
#
# ⚠️ IT WRITES TO THE HOSTED DATABASE, to the one shop the email owns, through
# `supabase db query --linked` (the Management API, no database password). The
# account must exist: sign up in Wera. If it has no shop yet, the SQL opens one
# and imports the Pollería, Verdulería and Frutería catalogs, as the app does.
#
# ⚠️ IT REFUSES, AND WRITES NOTHING, WHEN no account has that email, or the
# account owns more than one shop — so it can never reach a real shop that is
# not the demo's.
#
# ⚠️ NO CHECK RUNS THIS. The SQL writes the ledger by hand, mirroring
# record_purchase / record_sale / record_waste (their 72-hour clamp is why it
# cannot call them), with every withdrawal through allocate_fefo(). A migration
# that adds a required column to a ledger table, or changes those functions,
# can break it: it then fails whole and writes nothing. Rehearse with --local.
# ============================================================================
set -euo pipefail

email="${1:-}"
target="${2:---linked}"

if [[ -z "$email" || "$email" == -* ]]; then
  echo "usage: bash docs/runbooks/demo-polleria.sh <email> [--local]" >&2
  exit 2
fi
if [[ "$target" != "--linked" && "$target" != "--local" ]]; then
  echo "the second argument may only be --local (got: $target)" >&2
  exit 2
fi
# The email goes inside a SQL string, so anything that could close the string
# is refused rather than escaped.
if ! [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$ ]]; then
  echo "that does not look like an email address: $email" >&2
  exit 2
fi

here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
sed "s/__OWNER_EMAIL__/$email/" "$here/demo-polleria.sql" > "$tmp/run.sql"

# Each run writes at most 31 days, so no single call runs long; eight cover
# 1 May to the end of December, and a run with nothing left to write is quick.
for i in 1 2 3 4 5 6 7 8; do
  echo "run $i of 8 — $(date +%H:%M:%S)"
  out=$(supabase db query "$target" -f "$tmp/run.sql" 2>&1) || { echo "$out" >&2; exit 1; }
done

cat > "$tmp/summary.sql" <<SQL
with ws as (
  select wm.workspace_id as id from public.workspace_member wm
    join auth.users u on u.id = wm.user_id
   where lower(u.email) = lower('$email') and wm.role = 'owner' and wm.is_active
), emp as (
  select wm.user_id from public.workspace_member wm, ws
   where wm.workspace_id = ws.id and wm.role = 'staff'
), v as (
  select to_char(s.occurred_at at time zone 'America/Mexico_City', 'YYYY-MM') mes, count(*) ventas,
         round(sum(s.total_net)) vendido,
         round(100.0 * count(*) filter (where s.created_by in (select user_id from emp)) / count(*)) pct_empleado
    from public.sale s, ws where s.workspace_id = ws.id group by 1
), c as (
  select to_char(p.occurred_at at time zone 'America/Mexico_City', 'YYYY-MM') mes, count(*) entregas,
         round(sum(p.total_net)) comprado
    from public.purchase p, ws where p.workspace_id = ws.id group by 1
), w as (
  select to_char(x.occurred_at at time zone 'America/Mexico_City', 'YYYY-MM') mes, round(sum(x.total_net)) tirado
    from public.waste x, ws where x.workspace_id = ws.id group by 1
)
select v.mes, v.ventas, v.vendido, c.entregas, c.comprado, w.tirado, v.pct_empleado,
       (select to_char(max(s.occurred_at) at time zone 'America/Mexico_City', 'YYYY-MM-DD HH24:MI')
          from public.sale s, ws where s.workspace_id = ws.id) ultima_venta
  from v left join c using (mes) left join w using (mes) order by v.mes
SQL

where='the shop (hosted)'; [[ "$target" == "--local" ]] && where='the LOCAL database'
echo "Done on $where. The demo shop, month by month (pesos; Tirado at shelf price):"
supabase db query "$target" -o table -f "$tmp/summary.sql" 2>/dev/null

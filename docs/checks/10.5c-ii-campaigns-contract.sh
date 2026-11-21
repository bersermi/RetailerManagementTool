#!/usr/bin/env bash
# 10.5c-ii-campaigns-contract — does the runbook he starts a campaign from still run against the
# database, step by step, as written?
#
# WHY THIS EXISTS. `docs/runbooks/campaigns.sql` is the owner's only way to start a campaign
# (`10.5c-i`, question 5: SQL, never a screen), and it is a claim about `0093`: seven functions
# by name, every argument by name, the kinds, the audiences, the shape of a wording, the columns
# of his results, and the two statements that turn promotions on. A misspelt `p_` name, a renamed
# function or an audience that left the list is an error on the night he first runs it — and no
# suite reads that file. This check runs its steps as he would.
#
# WHAT IT ASSERTS, in ONE TRANSACTION THAT ROLLS BACK (pg_net sends only what is committed, so
# nothing reaches Expo), against a fresh local database (`supabase db reset`):
#   1. Every step is read OUT OF THE RUNBOOK — steps 0 to 6 and the two statements that turn
#      promotions on; one missing is a failure, never a skip. The only edits: `:'email'` is a
#      probe account's, `:campaign` the number step 1 answered, step 1's two dates tomorrow's.
#   2. Step 0 makes the probe account a test account.
#   3. Step 1 answers a campaign's number: a draft, not launched, its wordings' weights adding to 100.
#   4. Step 2 answers a row per group — held_back if any is held back, then each wording.
#   5. Step 3 sends every wording to the probe's phone (read off pg_net's queue), and marks it tested.
#   6. Step 4, while promotions are dark, is refused — "the kind … is off".
#   7. The two statements that turn promotions on run; then step 4 launches it.
#   8. Step 5 answers the campaign's rows, with every column the runbook names.
#   9. Step 6 stops it.
#
# ⚠️ WHAT IT DOES NOT ASSERT: who gets a message, the hours, the limits, the hash, the counts
# (`supabase/tests/0093_campaigns.sql`); that a message ARRIVES — no check can (ADR-035 §2.11).
# ⚠️ NO `mapfile`, NO `declare -A`: macOS ships bash 3.2.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5c-ii-campaigns-contract.sh
# With: $1 the runbook — how the falsifier points it at a broken copy.
# Exit: 0 every assertion holds; 1 otherwise.

set -uo pipefail

RUNBOOK="${1:-docs/runbooks/campaigns.sql}"
[[ -r "$RUNBOOK" ]] || { echo "FAIL: cannot read $RUNBOOK (run this from the repository root)"; exit 1; }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# --- 1. the steps, read out of the runbook ----------------------------------
# A step is its marker line (`-- step N:` or `-- on N:`) and every line after it up to the first
# that ends in `;`.
step() { # marker -> the statement, or nothing
  awk -v m="$1" '
    index($0, m) == 1 { on = 1; next }
    on { print; if ($0 ~ /;[[:space:]]*$/) exit }
  ' "$RUNBOOK"
}

TOMORROW="$(TZ=America/Mexico_City date -v+1d +%Y-%m-%d 2>/dev/null || TZ=America/Mexico_City date -d tomorrow +%Y-%m-%d)"
for m in "-- step 0:" "-- step 1:" "-- step 2:" "-- step 3:" "-- step 4:" "-- step 5:" "-- step 6:" "-- on 1:" "-- on 2:"; do
  s="$(step "$m")"
  if [[ -z "$(grep -v '^[[:space:]]*--' <<< "$s" | tr -d '[:space:]')" ]]; then
    echo "FAIL: no statement after '$m' in $RUNBOOK"
    echo "      This check runs the runbook's own steps. Without one there is nothing to"
    echo "      run, and a green here would be the vacuous kind."
    exit 1
  fi
  name="$(sed 's/^-- //; s/://; s/ /_/' <<< "$m")"
  printf '%s\n' "$s" > "$SCRATCH/$name.sql"
done

# Step 1 as written, its dates tomorrow's: a draft whose dates have passed is refused, rightly.
dates="$(grep -cE "'[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} America/Mexico_City'" "$SCRATCH/step_1.sql")"
if [[ "$dates" -lt 2 ]]; then
  echo "FAIL: step 1 does not give its start and expiry as 'YYYY-MM-DD HH:MM America/Mexico_City'"
  exit 1
fi
sed -E "s/'[0-9]{4}-[0-9]{2}-[0-9]{2} ([0-9]{2}:[0-9]{2}) America\/Mexico_City'/'$TOMORROW \1 America\/Mexico_City'/g" \
  "$SCRATCH/step_1.sql" > "$SCRATCH/step_1_tomorrow.sql"
echo "  ok    read from the runbook: steps 0 to 6 and the two that turn promotions on; step 1's dates moved to $TOMORROW"

no_semi() { sed -E '$ s/;[[:space:]]*$//' "$1"; }

# --- the local database -----------------------------------------------------
DB_URL="$(supabase status -o env 2>/dev/null | sed -n 's/^DB_URL="\(.*\)"$/\1/p')"
CONTAINER="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -m1 '^supabase_db_' || true)"
if [[ -z "$DB_URL" && -z "$CONTAINER" ]]; then
  echo "FAIL: no local Supabase. Run \`supabase start\` and \`supabase db reset\` from the repository root."
  exit 1
fi
run_psql() { # the script on stdin
  if command -v psql > /dev/null && [[ -n "$DB_URL" ]]; then
    psql "$DB_URL" -X -q -At -v ON_ERROR_STOP=1 -f -
  else
    docker exec -i "$CONTAINER" psql -U postgres -d postgres -X -q -At -v ON_ERROR_STOP=1 -f -
  fi
}

PROBE_ID='0c5c0000-0000-4000-8000-0000000c0011'
PROBE_EMAIL='probe.10.5c-ii@example.mx'
PROBE_TOKEN='ExponentPushToken[contract-10.5c-ii]'

# --- 2–9. the steps, run as he would, in one transaction ---------------------
{
  cat <<SQL
begin;
create temporary table _v (n serial, label text, passed boolean);
insert into auth.users (id, email) values ('$PROBE_ID', '$PROBE_EMAIL');
insert into servicio.push_token (user_id, app, token, platform, allowed, channels)
values ('$PROBE_ID', 'itacate', '$PROBE_TOKEN', 'ios', true, '{}');
\set email '$PROBE_EMAIL'
\o /dev/null
SQL
  cat "$SCRATCH/step_0.sql"
  cat <<'SQL'
\o
insert into _v (label, passed)
select 'step 0 makes the probe account a test account',
       exists (select 1 from servicio.campaign_tester t join auth.users u on u.id = t.user_id where u.email = :'email');
SQL
  no_semi "$SCRATCH/step_1_tomorrow.sql"
  cat <<'SQL'
\gset step1_
\if :{?step1_new_campaign}
  \set campaign :step1_new_campaign
\else
  \echo 'FAIL  step 1 answered no campaign number (its column was not new_campaign)'
  \q
\endif
insert into _v (label, passed)
select 'step 1 answers a campaign''s number: a draft, not launched, its wordings'' weights adding to 100',
       (select launched_at is null and tested_at is null from servicio.campaign where id = :campaign)
       and (select sum(weight) from servicio.campaign_variant where campaign_id = :campaign) = 100;
SQL
  echo "create temporary table _p as"
  no_semi "$SCRATCH/step_2.sql"
  cat <<'SQL'
;
insert into _v (label, passed)
select 'step 2 answers a row per group: held_back if any is held back, then each wording',
       (select array_agg(grp order by case when grp = 'held_back' then 0 else 1 end, grp) from _p)
       = (select case when c.held_out > 0 then array['held_back'] else '{}'::text[] end
                 || (select array_agg(v.variant order by v.variant) from servicio.campaign_variant v where v.campaign_id = c.id)
            from servicio.campaign c where c.id = :campaign);
select coalesce(max(id), 0) as mark from net.http_request_queue \gset
\o /dev/null
SQL
  cat "$SCRATCH/step_3.sql"
  cat <<SQL
\o
insert into _v (label, passed)
select 'step 3 sends every wording to the probe''s phone, and marks the campaign tested',
       (select count(*) from net.http_request_queue q,
                jsonb_array_elements(convert_from(q.body, 'UTF8')::jsonb) m
         where q.id > :mark and m ->> 'to' = '$PROBE_TOKEN'
           and (m -> 'data' ->> 'campaign_id')::bigint = :campaign)
         = (select count(*) from servicio.campaign_variant where campaign_id = :campaign)
       and (select tested_at is not null from servicio.campaign where id = :campaign);
savepoint dark;
\set ON_ERROR_STOP off
\o /dev/null
SQL
  cat "$SCRATCH/step_4.sql"
  cat <<'SQL'
\o
\set dark_error :ERROR
\set dark_message :LAST_ERROR_MESSAGE
\set ON_ERROR_STOP on
rollback to savepoint dark;
insert into _v (label, passed)
select 'step 4, while promotions are dark, is refused: ' || :'dark_message',
       :'dark_error' = 'true' and :'dark_message' like '%is off%'
       and (select launched_at is null from servicio.campaign where id = :campaign);
\o /dev/null
SQL
  cat "$SCRATCH/on_1.sql" "$SCRATCH/on_2.sql" "$SCRATCH/step_4.sql"
  cat <<'SQL'
\o
insert into _v (label, passed)
select 'the two statements that turn promotions on run; then step 4 launches it',
       (select launched_at is not null from servicio.campaign where id = :campaign)
       and exists (select 1 from servicio.consent_words)
       and exists (select 1 from servicio.notification_kind k join servicio.campaign c on c.kind = k.kind
                    where c.id = :campaign and k.is_on);
SQL
  echo "create temporary table _r as"
  no_semi "$SCRATCH/step_5.sql"
  cat <<'SQL'
;
insert into _v (label, passed)
select 'step 5 answers the campaign''s rows, with every column the runbook names',
       exists (select 1 from _r where campaign_id = :campaign)
       and (select count(*) from pg_attribute a
             where a.attrelid = '_r'::regclass and a.attnum > 0
               and a.attname in ('people', 'reached', 'accepted', 'handed_over', 'tapped', 'acted',
                                 'unmeasured', 'final', 'grp', 'tapped_pct', 'acted_pct')) = 11;
\o /dev/null
SQL
  cat "$SCRATCH/step_6.sql"
  cat <<'SQL'
\o
insert into _v (label, passed)
select 'step 6 stops it',
       (select stopped_at is not null from servicio.campaign where id = :campaign);
select case when passed then '  ok    ' else 'FAIL: ' end || label from _v order by n;
rollback;
SQL
} > "$SCRATCH/run.sql"

out="$(run_psql < "$SCRATCH/run.sql" 2>&1)"
code=$?
echo "$out" | grep -E '^(  ok    |FAIL)' || true
if (( code != 0 )) || grep -q '^FAIL' <<< "$out" || [[ "$(grep -c '^  ok    ' <<< "$out")" -lt 8 ]]; then
  echo "$out" | grep -E 'ERROR|error' | head -5
  echo
  echo "the runbook does not run against 0093 as applied: docs/runbooks/campaigns.sql must change with the schema."
  exit 1
fi
echo
echo "every assertion holds — docs/runbooks/campaigns.sql runs against 0093, step by step, as written."

#!/usr/bin/env bash
# field-rule-falsify — can docs/checks/field-rule.sh still SEE a migration that
# breaks a call a phone makes? A check that has never been red has not been shown
# to read anything.
#
# PART A — the rules, one fixture each. Each fixture is DDL applied to this
# change's schema INSIDE A TRANSACTION THAT ROLLS BACK, with `lib/field-surface.sql`
# read in the same transaction: so the surface is the database's own answer to a
# real `drop`, `revoke` or `rename`, never a hand-written row, and nothing is left
# behind. The comparator then reads the untouched schema as BEFORE and the
# fixture's as AFTER, and must say FAIL with the named fact — or, for the changes
# the field rule allows (a new table, a new function, a new argument with a
# default, a nullable column, a declared break), must say ok.
#
# PART B — the whole check, end to end: a real migration file the check has to
# find, build on top of the base and refuse; the same file declaring its break,
# accepted; an applied migration edited; a migration numbered out of order.
#
# Run:  supabase start && bash docs/checks/field-rule-falsify.sh
# ⚠️ It resets the local database twice (part B) and ends with `supabase db reset`,
#    so the seed is back afterwards. It refuses to run over uncommitted changes in
#    supabase/migrations/, because part B edits one migration and restores it from
#    HEAD.
# Exit: 0 every fixture caught or allowed as it should be; 1 otherwise.

set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)" || exit 1
cd "$ROOT" || exit 1
SURFACE="docs/checks/lib/field-surface.sql"
COMPARE="docs/checks/lib/field-compare.py"
CHECK="docs/checks/field-rule.sh"
FIXTURE_MIGRATION="supabase/migrations/9999_field_rule_falsify.sql"
LOW_MIGRATION="supabase/migrations/0006_field_rule_falsify.sql"
EDITED="$(ls supabase/migrations/*.sql | tail -1)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/field-rule-falsify.XXXXXX")"

cleanup() {
  rm -f "$FIXTURE_MIGRATION" "$LOW_MIGRATION"
  git checkout --quiet HEAD -- "$EDITED" 2>/dev/null
  rm -rf "$WORK"
}
trap cleanup EXIT

if ! git diff --quiet HEAD -- supabase/migrations \
   || [[ -n "$(git ls-files --others --exclude-standard supabase/migrations)" ]]; then
  echo "FAIL: supabase/migrations/ has changes HEAD does not — part B edits a migration and"
  echo "      restores it from HEAD, so it will not run over work in progress. Commit first."
  exit 1
fi

DB="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
[[ -n "$DB" ]] || { echo "FAIL: no local Supabase. Run \`supabase start\`."; exit 1; }

caught=0
missed=0
ran=0
ok()     { echo "  ok    $*"; }
missed() { echo "FAIL: $*"; missed=$((missed+1)); }

surface_with() { # ddl-file out-file — the surface after the DDL, all rolled back
  { echo 'begin;'; cat "$1"; echo ';'; cat "$SURFACE"; echo ';'; echo 'rollback;'; } \
    | docker exec -i "$DB" psql -U postgres -d postgres -X -q -v ON_ERROR_STOP=1 --csv \
      > "$2" 2> "$2.err"
}

# expect NAME WANT [DECLARATION]   — the DDL is in $WORK/f.sql
#   WANT: a line the comparator must print and exit 1 with ("FAIL: kind key"),
#         or "hold" (it must exit 0)
expect() {
  local name="$1" want="$2" decl="${3:-}" out code
  ran=$((ran+1))
  if ! surface_with "$WORK/f.sql" "$WORK/after.csv"; then
    missed "$name — the fixture did not apply, so it proves nothing: $(head -2 "$WORK/after.csv.err" | tr '\n' ' ')"
    return
  fi
  if [[ -n "$decl" ]]; then
    printf '%s\n' "$decl" > "$WORK/declares.sql"
    out="$(python3 "$COMPARE" "$WORK/before.csv" "$WORK/after.csv" "$WORK/declares.sql")"; code=$?
  else
    out="$(python3 "$COMPARE" "$WORK/before.csv" "$WORK/after.csv")"; code=$?
  fi
  if [[ "$want" == "hold" ]]; then
    if (( code == 0 )); then caught=$((caught+1)); ok "$name — allowed"
    else missed "$name — the field rule allows this, and the check refused it:"; printf '%s\n' "$out" | grep '^FAIL' | head -5; fi
  else
    if (( code == 1 )) && [[ "$out" == *"$want"* ]]; then caught=$((caught+1)); ok "$name — caught"
    else missed "$name — not caught (exit $code; wanted '$want'):"; printf '%s\n' "$out" | head -6; fi
  fi
}

# --- the schema this change ends at, read once --------------------------------
echo "Part A — the rules, each against the database's own answer to the DDL"
if ! supabase db reset --no-seed > "$WORK/reset.log" 2>&1; then
  echo "FAIL: could not build this change's schema: $(tail -3 "$WORK/reset.log")"; exit 1
fi
: > "$WORK/f.sql"
surface_with "$WORK/f.sql" "$WORK/before.csv" || { echo "FAIL: could not read the surface"; exit 1; }

cat > "$WORK/f.sql" <<'SQL'
-- no change (a SELECT here would print ahead of the surface and spoil its header)
SQL
expect "A0 nothing changes" "hold"

cat > "$WORK/f.sql" <<'SQL'
drop function public.set_my_display_name(uuid, text)
SQL
expect "A1 a function a phone calls is dropped" "FAIL: function set_my_display_name"

cat > "$WORK/f.sql" <<'SQL'
revoke execute on function public.request_access(text) from authenticated
SQL
expect "A2 a signed-in person may no longer execute it" "FAIL: function request_access"

cat > "$WORK/f.sql" <<'SQL'
drop function public.collection_reaches(text);
create function public.collection_reaches(p_cp text) returns boolean
  language sql as $f$ select true $f$;
grant execute on function public.collection_reaches(text) to authenticated
SQL
expect "A3 an argument is renamed" "FAIL: argument collection_reaches.p_postal_code"

cat > "$WORK/f.sql" <<'SQL'
drop function public.cancel_collection_request(uuid);
create function public.cancel_collection_request(p_id uuid, p_reason text) returns jsonb
  language sql as $f$ select null::jsonb $f$;
grant execute on function public.cancel_collection_request(uuid, text) to authenticated
SQL
expect "A4 a new argument with no default" "FAIL: argument cancel_collection_request.p_reason"

cat > "$WORK/f.sql" <<'SQL'
drop function public.cancel_collection_request(uuid);
create function public.cancel_collection_request(p_id uuid, p_reason text default null) returns jsonb
  language sql as $f$ select null::jsonb $f$;
grant execute on function public.cancel_collection_request(uuid, text) to authenticated
SQL
expect "A5 a new argument WITH a default (0064's shape)" "hold"

cat > "$WORK/f.sql" <<'SQL'
drop function public.onboard_workspace(text, boolean, text);
create function public.onboard_workspace(p_display_name text, p_location_name text,
                                         p_prices_include_tax boolean default true) returns uuid
  language sql as $f$ select null::uuid $f$;
grant execute on function public.onboard_workspace(text, text, boolean) to authenticated
SQL
expect "A6 an argument loses its default" "FAIL: argument onboard_workspace.p_location_name"

cat > "$WORK/f.sql" <<'SQL'
drop function public.request_access(text);
create function public.request_access(p_code varchar) returns jsonb
  language sql as $f$ select null::jsonb $f$;
grant execute on function public.request_access(varchar) to authenticated
SQL
expect "A7 an argument's type changes" "FAIL: argument request_access.p_code"

cat > "$WORK/f.sql" <<'SQL'
drop function public.collection_reaches(text);
create function public.collection_reaches(p_postal_code text) returns text
  language sql as $f$ select 'si' $f$;
grant execute on function public.collection_reaches(text) to authenticated
SQL
expect "A8 what a function returns changes" "FAIL: function collection_reaches"

cat > "$WORK/f.sql" <<'SQL'
drop function public.my_access_requests();
create function public.my_access_requests()
  returns table (request_id uuid, workspace_id uuid, workspace_name text, status text,
                 role public.workspace_role, requested_at timestamptz, expires_at timestamptz)
  language sql as $f$ select null::uuid, null::uuid, null::text, null::text,
                             null::public.workspace_role, null::timestamptz, null::timestamptz where false $f$;
grant execute on function public.my_access_requests() to authenticated
SQL
expect "A9 a column a function returned is gone" "FAIL: result my_access_requests.decided_at"

cat > "$WORK/f.sql" <<'SQL'
create function public.request_access(p_code text, p_note text) returns jsonb
  language sql as $f$ select null::jsonb $f$;
grant execute on function public.request_access(text, text) to authenticated
SQL
expect "A10 an overload beside the old function" "FAIL: overload request_access"

cat > "$WORK/f.sql" <<'SQL'
alter table public.location rename column name to nombre
SQL
expect "A11 a column a phone reads is renamed" "FAIL: column location.name"

cat > "$WORK/f.sql" <<'SQL'
alter table public.provider drop column address_line1 cascade
SQL
expect "A12 a column is dropped" "FAIL: column provider.address_line1"

cat > "$WORK/f.sql" <<'SQL'
alter table public.provider alter column contact_name type varchar(40)
SQL
expect "A13 a column's type changes" "FAIL: column provider.contact_name"

cat > "$WORK/f.sql" <<'SQL'
alter table public.provider add column zz_required text not null default 'x';
alter table public.provider alter column zz_required drop default
SQL
expect "A14 a new NOT NULL column with no default on a table phones insert into" "FAIL: required provider.zz_required"

cat > "$WORK/f.sql" <<'SQL'
alter table public.provider add column zz_optional text
SQL
expect "A15 a new nullable column" "hold"

cat > "$WORK/f.sql" <<'SQL'
revoke insert on public.provider from authenticated
SQL
expect "A16 a right over a table is taken back" "FAIL: insert provider.name"

cat > "$WORK/f.sql" <<'SQL'
revoke select, insert, update, delete on public.unit from authenticated
SQL
expect "A17 a table a phone reads is no longer readable" "FAIL: relation unit"

cat > "$WORK/f.sql" <<'SQL'
alter table public.member_location drop constraint member_location_pkey
SQL
expect "A18 the key an upsert names is dropped" "FAIL: unique member_location(location_id,member_id)"

cat > "$WORK/f.sql" <<'SQL'
alter table public.provider drop constraint provider_workspace_id_fkey
SQL
expect "A19 a foreign key an embed follows is dropped" "FAIL: relationship provider(workspace_id)->workspace(id)"

cat > "$WORK/f.sql" <<'SQL'
alter table public.provider add column zz_other_workspace uuid references public.workspace (id)
SQL
expect "A20 a second foreign key makes an embed ambiguous" "FAIL: relationship provider<->workspace"

cat > "$WORK/f.sql" <<'SQL'
alter type public.waste_reason rename value 'caducado' to 'vencido'
SQL
expect "A21 an enum label is renamed" "FAIL: enum waste_reason.caducado"

cat > "$WORK/f.sql" <<'SQL'
update storage.buckets set id = 'producto_x', name = 'producto_x' where id = 'producto'
SQL
expect "A22 a bucket goes" "FAIL: bucket producto"

cat > "$WORK/f.sql" <<'SQL'
create table public.zz_listing (id uuid primary key, workspace_id uuid references public.workspace (id));
grant select on public.zz_listing to authenticated;
create function public.zz_door(p_near text default null) returns setof public.zz_listing
  language sql as $f$ select * from public.zz_listing $f$;
grant execute on function public.zz_door(text) to authenticated
SQL
expect "A23 a new table and a new door (what the marketplace slices add)" "hold"

cat > "$WORK/f.sql" <<'SQL'
drop function public.set_my_display_name(uuid, text)
SQL
expect "A24 a removal its migration declares" "hold" \
  "-- field-rule: breaks function set_my_display_name — the falsifier's fixture says so"

cat > "$WORK/f.sql" <<'SQL'
alter type public.waste_reason rename value 'error de captura' to 'error'
SQL
expect "A25 a declared key with a space in it" "hold" \
  "-- field-rule: breaks enum waste_reason.error de captura — the falsifier's fixture says so"

cat > "$WORK/f.sql" <<'SQL'
-- no change (a SELECT here would print ahead of the surface and spoil its header)
SQL
expect "A26 a declaration that names nothing that breaks" "FAIL: declares.sql declares it breaks function set_my_display_name" \
  "-- field-rule: breaks function set_my_display_name — but nothing drops it"

ran=$((ran+1))
printf 'kind,key,detail\n' > "$WORK/empty.csv"
out="$(python3 "$COMPARE" "$WORK/before.csv" "$WORK/empty.csv")"; code=$?
if (( code == 2 )) && [[ "$out" == FAIL:* ]]; then caught=$((caught+1)); ok "A27 an empty answer — refused, never read as clean"
else missed "A27 an empty answer was not refused (exit $code): $out"; fi

# --- the whole check, end to end -----------------------------------------------
echo "Part B — the whole check, on real migration files"
HEAD_SHA="$(git rev-parse HEAD)"

cat > "$FIXTURE_MIGRATION" <<'SQL'
-- the falsifier's fixture: a migration that takes a door a phone calls
revoke execute on function public.request_access(text) from authenticated;
SQL
ran=$((ran+1))
out="$(bash "$CHECK" "$HEAD_SHA" 2>&1)"; code=$?
if (( code == 1 )) && [[ "$out" == *"FAIL: function request_access"* ]]; then
  caught=$((caught+1)); ok "B1 a new migration that takes a door — refused"
else missed "B1 a new migration that takes a door was not refused (exit $code):"; printf '%s\n' "$out" | tail -6; fi

cat > "$FIXTURE_MIGRATION" <<'SQL'
-- the falsifier's fixture, declared this time
-- field-rule: breaks function request_access — the falsifier's fixture says so
revoke execute on function public.request_access(text) from authenticated;
SQL
ran=$((ran+1))
out="$(bash "$CHECK" "$HEAD_SHA" 2>&1)"; code=$?
if (( code == 0 )) && [[ "$out" == *"declared  function request_access"* ]]; then
  caught=$((caught+1)); ok "B2 the same migration, declaring it — allowed, and reported"
else missed "B2 the declared migration was not allowed (exit $code):"; printf '%s\n' "$out" | tail -6; fi
rm -f "$FIXTURE_MIGRATION"

printf '\n-- edited after it was applied\n' >> "$EDITED"
ran=$((ran+1))
out="$(bash "$CHECK" "$HEAD_SHA" 2>&1)"; code=$?
if (( code == 1 )) && [[ "$out" == *"differs from the base's"* ]]; then
  caught=$((caught+1)); ok "B3 an applied migration edited — refused"
else missed "B3 an edited migration was not refused (exit $code):"; printf '%s\n' "$out" | tail -4; fi
git checkout --quiet HEAD -- "$EDITED"

printf -- '-- numbered into a hole\nselect 1;\n' > "$LOW_MIGRATION"
ran=$((ran+1))
out="$(bash "$CHECK" "$HEAD_SHA" 2>&1)"; code=$?
if (( code == 1 )) && [[ "$out" == *"numbered at or below"* ]]; then
  caught=$((caught+1)); ok "B4 a new migration numbered below the newest — refused"
else missed "B4 an out-of-order migration was not refused (exit $code):"; printf '%s\n' "$out" | tail -4; fi
rm -f "$LOW_MIGRATION"

# --- leave the local database as a session expects it ---------------------------
supabase db reset > "$WORK/reset.log" 2>&1 || echo "  note  could not restore the seed: run \`supabase db reset\`"

echo
if (( missed > 0 )); then
  echo "$missed of $ran fixture(s) went the wrong way: the field rule's check cannot be trusted as it stands."
  exit 1
fi
echo "field rule's falsifier: $caught of $ran fixtures went the right way — every break caught, every allowed change let through."

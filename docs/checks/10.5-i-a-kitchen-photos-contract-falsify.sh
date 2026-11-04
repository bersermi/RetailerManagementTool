#!/usr/bin/env bash
# ============================================================================
# 10.5-i-a — CAN `10.5-i-a-kitchen-photos-contract.sh` STILL FAIL? Each fixture
# breaks ONE wall of the bucket `cocina` in the applied database — a policy of
# `0076`'s widened or added, or the bucket's own settings loosened — and the
# check must go red FOR THAT REASON (the output is matched, not the exit code).
# The two policies and the bucket's row are read back out of the catalog first
# and restored in a `trap`, then read again to prove they are back.
#
#   bash docs/checks/10.5-i-a-kitchen-photos-contract-falsify.sh
# ============================================================================
set -uo pipefail

CHECK="docs/checks/10.5-i-a-kitchen-photos-contract.sh"
[[ -r "$CHECK" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

DB_URL="$(supabase status -o env 2>/dev/null | sed -n 's/^DB_URL="\(.*\)"$/\1/p')"
ask() { # sql -> its output, as the database's owner
  if command -v psql > /dev/null; then
    psql "$DB_URL" -At -v ON_ERROR_STOP=1 -c "$1" 2>&1
  else
    docker exec -i "$(docker ps --format '{{.Names}}' | grep -m1 '^supabase_db_')" \
      psql -U postgres -At -v ON_ERROR_STOP=1 -c "$1" 2>&1 | tr -d '\r'
  fi
}

expr_of() { # policy-name qual|withcheck -> its expression on storage.objects
  ask "select coalesce(pg_get_expr(pol.pol$2, pol.polrelid), '') from pg_policy pol
        where pol.polrelid = 'storage.objects'::regclass and pol.polname = '$1';"
}
INSERT_CHECK="$(expr_of cocina_insert withcheck)"
SELECT_USING="$(expr_of cocina_select qual)"
BUCKET_ROW="$(ask "select public::text || ' ' || file_size_limit::text || ' ' || array_to_string(allowed_mime_types, ',')
                     from storage.buckets where id = 'cocina';")"
if [[ "$INSERT_CHECK" != *kitchen_folder_ok* || "$INSERT_CHECK" != *photo_folder_ok* \
      || "$SELECT_USING" != *kitchen_folder_ok* || "$BUCKET_ROW" != "false 2097152 image/jpeg,image/png,image/webp" ]]; then
  echo "FAIL: could not read 0076's bucket out of the applied catalog —"
  echo "      cocina_insert: '${INSERT_CHECK:0:100}', cocina_select: '${SELECT_USING:0:100}', bucket: '$BUCKET_ROW'."
  echo "      Is Storage running, and was it running before the reset?"
  exit 1
fi

restore() {
  local p
  for p in cocina_insert cocina_select cocina_anon cocina_update cocina_delete; do
    ask "drop policy if exists $p on storage.objects;" > /dev/null
  done
  ask "create policy cocina_insert on storage.objects for insert to authenticated with check ($INSERT_CHECK);" > /dev/null
  ask "create policy cocina_select on storage.objects for select to authenticated using ($SELECT_USING);" > /dev/null
  ask "update storage.buckets set public = false, file_size_limit = 2097152,
         allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'cocina';" > /dev/null
  local back row
  back="$(ask "select string_agg(polname, ' ' order by polname) from pg_policy
                where polrelid = 'storage.objects'::regclass and polname like 'cocina%';")"
  row="$(ask "select public::text || ' ' || file_size_limit::text || ' ' || array_to_string(allowed_mime_types, ',')
                from storage.buckets where id = 'cocina';")"
  if [[ "$back" != "cocina_insert cocina_select" || "$row" != "$BUCKET_ROW" ]]; then
    echo "FAIL: THE RESTORE DID NOT PUT THE BUCKET BACK (policies '$back', bucket '$row'). Stopping."
    exit 1
  fi
}
trap 'restore' EXIT INT TERM

passed=0
failed=0

run() { # name expected-reason-regex
  local out rc
  out="$(bash "$CHECK" 2>&1)"; rc=$?
  if (( rc != 0 )) && grep -Eq "$2" <<< "$out"; then
    echo "  ok    $1 — red, for the reason"; passed=$((passed+1))
  else
    echo "FAIL: $1 — rc=$rc, and the output did not match /$2/:"
    grep -E '^FAIL' <<< "$out" | head -3
    failed=$((failed+1))
  fi
}

# The control: the database as `0076` left it.
out="$(bash "$CHECK" 2>&1)"
if [[ $? -eq 0 ]]; then echo "  ok    control — green on the database as it is"; passed=$((passed+1))
else echo "FAIL: control — the check is red on the database as it is"; grep -E '^FAIL' <<< "$out" | head -3; failed=$((failed+1)); fi

# ⚠️ The read that asks for an account and not for a kitchen that exists — the
# ruling's words alone. Every screen still works; a deleted kitchen's photos
# stay open to anyone holding a path, which Wera's aviso promises never happens.
ask "drop policy cocina_select on storage.objects;" > /dev/null
ask "create policy cocina_select on storage.objects for select to authenticated using (bucket_id = 'cocina');" > /dev/null
run read-past-deletion "the neighbour's read after 200"
restore

# Opened to anyone signed out.
ask "create policy cocina_anon on storage.objects for select to anon using (bucket_id = 'cocina');" > /dev/null
run read-signed-out 'a signed-out read answered'
restore

# The write without the role: every member of a kitchen writes, the cook included.
ask "drop policy cocina_insert on storage.objects;" > /dev/null
ask "create policy cocina_insert on storage.objects for insert to authenticated
       with check (bucket_id = 'cocina' and public.kitchen_folder_ok(name));" > /dev/null
run cook-writes "the cook's upload answered 200"
restore

# The write without the kitchen: `0063`'s shape alone, so a shop's owner writes files nobody can read.
ask "drop policy cocina_insert on storage.objects;" > /dev/null
ask "create policy cocina_insert on storage.objects for insert to authenticated
       with check (bucket_id = 'cocina' and public.photo_folder_ok(name, 'manager'));" > /dev/null
run shop-writes "a shop's owner's upload answered 200"
restore

# An update policy, so a photo can be replaced under the same path a phone already holds.
ask "create policy cocina_update on storage.objects for update to authenticated
       using (bucket_id = 'cocina' and public.photo_folder_ok(name, 'manager'))
       with check (bucket_id = 'cocina' and public.photo_folder_ok(name, 'manager'));" > /dev/null
run overwrite 'an overwrite answered upsert 200'
restore

# A delete policy.
ask "create policy cocina_delete on storage.objects for delete to authenticated
       using (bucket_id = 'cocina' and public.photo_folder_ok(name, 'manager'));" > /dev/null
run delete 'after her deletes'
restore

# The bucket made public: every photo readable by its address, signed in or not.
ask "update storage.buckets set public = true where id = 'cocina';" > /dev/null
run public-bucket "the bucket cocina reads 'True"
restore

# Any file at all — a page served from the project's address.
ask "update storage.buckets set allowed_mime_types = null where id = 'cocina';" > /dev/null
run any-file 'a page answered 200'
restore

# No size of its own: the project's 50 MB.
ask "update storage.buckets set file_size_limit = null where id = 'cocina';" > /dev/null
run any-size 'a 2 MB file 200'
restore

echo
if (( failed == 0 && passed == 10 )); then
  echo "all 10 fixtures behaved as recorded — the contract check goes red on every wall it names."
  exit 0
fi
echo "$failed of $((passed + failed)) fixtures misbehaved."
exit 1

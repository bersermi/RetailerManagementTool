#!/usr/bin/env bash
# ============================================================================
# DELETE THE PHOTOS OF A BUSINESS THAT NO LONGER EXISTS. Plan task `10.5-ii`.
#
# Both avisos promise it: a deleted shop's or kitchen's photos leave everyone's
# reach at once — every bucket's read wall asks for the business, which the
# deletion removes — and **we delete them by hand within 30 days** (Wera's aviso,
# section 6; Wera Cocina's, section 7, since `10.5-ii`). This is that hand.
#
#   bash docs/runbooks/delete-orphan-photos.sh                    # the hosted project: lists, deletes nothing
#   bash docs/runbooks/delete-orphan-photos.sh --delete           # ... and deletes every folder it listed
#   bash docs/runbooks/delete-orphan-photos.sh --local [--delete] # the local stack instead (its rehearsal)
#
# AN ORPHAN is the first folder of a file in `producto` (a shop's product photos,
# `0063`), `merma` (Te lo compro's, `0060`) or `cocina` (a kitchen's cover, logo
# and dishes, `0076`) that names no business any more. Each of those buckets
# keeps a business's files under its id, and `delete_my_account`'s purge deletes
# the business's row but cannot reach the files: no bucket has a delete policy,
# and SQL cannot delete a file (Supabase's `storage.protect_delete` refuses it,
# and a row deleted under it would leave the bytes in the store). So the files go
# through the Storage API — `supabase storage rm`, which the CLI signs with the
# project's own service key, fetched with the login on this Mac (`supabase login`).
# `catalogo` is Wera's own photos, never a business's, and is never read here.
#
# ⚠️ THE HOSTED DELETE IS THE OWNER'S: a write to the shop. A session runs the
# listing; he runs `--delete`, or approves it as a `!` line in the conversation.
# ⚠️ Nothing records when a business was deleted, so a folder's newest file is
# shown — a business is at least that old; the 30 days run from its deletion.
#
# Rehearsed in CI by `docs/checks/10.5-i-a-kitchen-photos-contract.sh` (step 15):
# a kitchen deleted, its photo listed and deleted, the living kitchen's untouched.
# ============================================================================
set -uo pipefail

TARGET="--linked"
DELETE=0
for arg in "$@"; do
  case "$arg" in
    --local) TARGET="--local" ;;
    --linked) TARGET="--linked" ;;
    --delete) DELETE=1 ;;
    *) echo "usage: bash docs/runbooks/delete-orphan-photos.sh [--local] [--delete]"; exit 2 ;;
  esac
done
[[ -d supabase/migrations ]] || { echo "FAIL: run this from the repository root"; exit 1; }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# ⚠️ ONE STATEMENT, AND IT ALWAYS ANSWERS A ROW: on `--linked` a result with no
# rows prints one blank line and no header, which must never read as "none".
# The first row counts what was examined; every other row is an orphan folder.
cat > "$SCRATCH/huerfanas.sql" <<'SQL'
select kind, bucket, folder, files, newest
  from (
    select 0 as ord, 'examined' as kind, '' as bucket, '' as folder,
           count(*)::text as files, '' as newest
      from storage.objects
     where bucket_id in ('producto', 'merma', 'cocina')
    union all
    select 1, 'orphan', o.bucket_id, split_part(o.name, '/', 1),
           count(*)::text, to_char(max(o.created_at) at time zone 'UTC', 'YYYY-MM-DD')
      from storage.objects o
     where o.bucket_id in ('producto', 'merma', 'cocina')
       and split_part(o.name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and not exists (select 1 from public.workspace w where w.id::text = split_part(o.name, '/', 1))
     group by o.bucket_id, split_part(o.name, '/', 1)
  ) t
 order by ord, bucket, folder
SQL

orphans() { # -> "bucket folder files newest" per orphan; fails loudly on no answer
  if ! supabase db query "$TARGET" -o csv -f "$SCRATCH/huerfanas.sql" > "$SCRATCH/out.csv" 2> "$SCRATCH/err.txt"; then
    echo "FAIL: the query was refused: $(head -c 300 "$SCRATCH/err.txt")" >&2
    return 1
  fi
  python3 - "$SCRATCH/out.csv" "$SCRATCH/examined" <<'PY'
import csv, sys
rows = list(csv.DictReader(open(sys.argv[1], encoding="utf-8")))
if not rows or rows[0].get("kind") != "examined":
    sys.stderr.write("FAIL: the answer had no examined row, so nothing it says can be trusted\n")
    sys.exit(1)
open(sys.argv[2], "w").write(rows[0]["files"])
for row in rows[1:]:
    print(row["bucket"], row["folder"], row["files"], row["newest"])
PY
}

where="the hosted project"
[[ "$TARGET" == "--local" ]] && where="the local stack"
echo "Photos of businesses that no longer exist, on $where:"
if ! LIST="$(orphans)"; then exit 1; fi
if [[ -z "$LIST" ]]; then
  echo "  none — all $(cat "$SCRATCH/examined") file(s) in producto, merma and cocina belong to a business that exists."
  exit 0
fi
while read -r bucket folder files newest; do
  printf '  %-9s %s  %s file(s), the newest from %s\n' "$bucket" "$folder" "$files" "$newest"
done <<< "$LIST"

if (( DELETE == 0 )); then
  echo
  echo "Nothing deleted. To delete them (the avisos: within 30 days of the business's deletion):"
  echo "  bash docs/runbooks/delete-orphan-photos.sh$([[ "$TARGET" == "--local" ]] && echo " --local") --delete"
  exit 0
fi

echo
fails=0
while read -r bucket folder files newest; do
  if supabase storage rm -r "ss:///$bucket/$folder" "$TARGET" --experimental --yes > "$SCRATCH/rm.txt" 2>&1; then
    echo "  deleted   $bucket/$folder"
  else
    echo "  FAILED    $bucket/$folder — $(head -c 200 "$SCRATCH/rm.txt")"
    fails=$((fails + 1))
  fi
done <<< "$LIST"

# ⚠️ READ AGAIN, NEVER TRUSTED: a folder the API kept is still an orphan.
if ! AFTER="$(orphans)"; then exit 1; fi
left=0
while read -r bucket folder _ _; do
  [[ -z "$bucket" ]] && continue
  if grep -c "^$bucket $folder " <<< "$AFTER" > /dev/null; then
    echo "FAIL: $bucket/$folder is still there after its delete"
    left=$((left + 1))
  fi
done <<< "$LIST"
if (( fails == 0 && left == 0 )); then
  echo "Every folder listed is gone, read back on $where."
  exit 0
fi
exit 1

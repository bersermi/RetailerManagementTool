#!/usr/bin/env bash
# ============================================================================
# DELETE ONE KITCHEN, AND KEEP THE ACCOUNT, WHEN ITS OWNER ASKS BY EMAIL. Plan
# task `10.5-iii-c`, the owner's ruling of 2026-11-04.
#
# Wera Cocina's deletion page and its aviso say a kitchen can be deleted alone —
# in the app (*Eliminar esta cocina*) or by writing to privacidad@tu-wera.com —
# and that her account, the one she uses in Wera Cocina, Itacate and Wera, stays.
# This is what the owner runs once he has confirmed the request comes from the
# account's own address (docs/HANDBOOK.md, *If somebody asks to delete only
# their kitchen*).
#
#   bash docs/runbooks/delete-a-kitchen.sh someone@example.com                          # lists the kitchens she alone owns
#   bash docs/runbooks/delete-a-kitchen.sh someone@example.com --kitchen 'Fonda Lupe'   # deletes that one; the account stays
#   bash docs/runbooks/delete-a-kitchen.sh someone@example.com --kitchen 'Fonda Lupe' --local   # rehearsal
#
# It does EXACTLY what *Eliminar esta cocina* does: it calls `delete_my_business`
# (`0077`) as that person, with the kitchen and the name typed, so the kitchen
# goes with everything in it — its place, its page, what it published — and her
# login and every other business she owns stay. There is no second deletion
# path to keep in step with the first.
#
# ⚠️ A SCRIPT OF ITS OWN, NOT A FLAG ON `delete-an-account.sh`: that one deletes a
# login, and a flag forgotten there would delete the account she asked to keep.
# Nothing this script runs can delete a login, and it reads the login back
# afterwards to say so.
#
# ⚠️ IT WRITES TO THE HOSTED DATABASE, and Claude's sessions are not allowed to
# — the owner runs it, through `supabase db query --linked` (the Management
# API, no database password).
#
# ⚠️ IT REFUSES, AND CHANGES NOTHING, WHEN:
#   - no account has that email;
#   - no `--kitchen` is given — it prints each kitchen she alone owns, and the
#     command to run for each;
#   - the name is none of those kitchens' — a shop's name too: a shop goes only
#     with its owner's account (`delete-an-account.sh`). Case and runs of spaces
#     do not matter; accents do (`normalize_name`);
#   - two of her kitchens are called that — this script tells kitchens apart by
#     name only, so it deletes neither; she can delete hers in the app, where
#     *Eliminar esta cocina* is on the kitchen it opens;
#   - a neighbour holds a plate there still to hand over (`TD014`, `0079` — the
#     owner's ruling of 2026-11-10): run it again once it is handed over or that
#     day's pickup window has ended.
#
# ⚠️ ITS PHOTOS leave everyone's reach at once and are deleted by hand within 30
# days — `docs/runbooks/delete-orphan-photos.sh` finds them, as it finds those of
# a kitchen deleted with the account.
#
# `docs/checks/10.4b-iv-b-delete-by-email-rehearsal.sh` runs this against the
# local database too, each refusal and the deletion read back (CI: `db.yml`).
# ============================================================================
set -euo pipefail

usage='usage: bash docs/runbooks/delete-a-kitchen.sh <email> [--kitchen "<the kitchen'"'"'s name>"] [--local]'

email="${1:-}"
if [[ -z "$email" || "$email" == -* ]]; then
  echo "$usage" >&2
  exit 2
fi
shift

# The kitchen's name is free text (an apostrophe is legal), so it is quoted the
# SQL way: every ' doubled — through a variable, as `delete-an-account.sh` does.
q="'"
bs='\'
target='--linked'
typed=''
given=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --local) target='--local'; shift ;;
    --kitchen)
      if [[ $# -lt 2 || -z "$2" ]]; then echo "--kitchen needs the kitchen's name" >&2; exit 2; fi
      if [[ "$given" -eq 1 ]]; then echo "one --kitchen at a time: each kitchen is its own request" >&2; exit 2; fi
      typed="$2"; given=1
      shift 2 ;;
    *) echo "unknown argument: $1" >&2; echo "$usage" >&2; exit 2 ;;
  esac
done
typed_sql="${typed//$q/$q$q}"

# The email goes inside a SQL string, so anything that could close the string
# is refused rather than escaped.
if ! [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$ ]]; then
  echo "that does not look like an email address: $email" >&2
  exit 2
fi

# One statement, one column of its result, one row per line — `delete-an-account.sh`'s
# reader, copied: CSV, stderr apart, plain text columns only.
query() { # sql column
  local out err
  err=$(mktemp)
  if ! out=$(supabase db query "$target" -o csv "$1" 2>"$err"); then
    grep -v '^Connecting to' "$err" >&2; [[ -n "$out" ]] && printf '%s\n' "$out" >&2; rm -f "$err"; return 1
  fi
  rm -f "$err"
  printf '%s\n' "$out" | python3 -c '
import csv, sys
rows = list(csv.DictReader(sys.stdin))
if not rows or sys.argv[1] not in rows[0]:
    sys.exit("unexpected reply: no column " + sys.argv[1])
for r in rows:
    print(r[sys.argv[1]])
' "$2"
}

# 1. Who is this, and which kitchens are hers alone. Read only. One row per such
# kitchen — `0077`'s own predicate: an active owner, and no other — or one row
# with empty columns when there is none. One fixed order, so the reads below line
# up row for row.
mine_sql="
with who as (
  select u.id from auth.users u where lower(u.email) = lower('$email')
),
mine as (
  select w.id, w.display_name
    from public.workspace w
    join public.workspace_member wm on wm.workspace_id = w.id
    join who on who.id = wm.user_id
   where wm.is_active and wm.role = 'owner' and w.kind = 'cocina'
     and not exists (
           select 1 from public.workspace_member o
            where o.workspace_id = w.id and o.is_active and o.role = 'owner'
              and o.user_id <> who.id)
)
select (select count(*) from who)::text as found,
       coalesce(m.id::text, '') as id,
       coalesce(m.display_name, '') as kitchen,
       case when m.id is null then ''
            when public.normalize_name(m.display_name) = public.normalize_name('$typed_sql') then 'yes'
            else 'no' end as matches
  from (select 1) one left join mine m on true
 order by m.display_name, m.id;"

found=$(query "$mine_sql" found | sed -n 1p) || { echo "NOTHING CHANGED: the lookup failed (above)." >&2; exit 1; }
ids=$(query "$mine_sql" id) || { echo "NOTHING CHANGED: the lookup failed (above)." >&2; exit 1; }
kitchens=$(query "$mine_sql" kitchen) || { echo "NOTHING CHANGED: the lookup failed (above)." >&2; exit 1; }
matches=$(query "$mine_sql" matches) || { echo "NOTHING CHANGED: the lookup failed (above)." >&2; exit 1; }

if [[ "$found" == "0" ]]; then
  echo "NOTHING CHANGED: no account has the email $email." >&2
  echo "Check the spelling with the person. They may have signed up with another address." >&2
  exit 1
fi
if [[ "$found" != "1" ]]; then
  echo "UNEXPECTED: $found accounts have the email $email. Nothing changed." >&2
  exit 1
fi

owned=$(printf '%s\n' "$ids" | grep -c -v '^$' || true)
hits=$(printf '%s\n' "$matches" | grep -c '^yes$' || true)

# Each kitchen she alone owns, and the command that deletes it — shell-quoted for
# pasting: in single quotes, each ' written as '\''.
list_kitchens() {
  local name again
  while IFS= read -r name; do
    if [[ -z "$name" ]]; then continue; fi
    again="bash docs/runbooks/delete-a-kitchen.sh $email --kitchen '${name//$q/$q$bs$q$q}'"
    if [[ "$target" == "--local" ]]; then again+=" --local"; fi
    printf '    %s\n' "$again" >&2
  done <<<"$kitchens"
}

if [[ "$owned" -eq 0 ]]; then
  echo "NOTHING CHANGED: $email owns no kitchen alone." >&2
  echo "A kitchen she shares is not hers to delete; a shop goes only with its owner's account" >&2
  echo "(docs/runbooks/delete-an-account.sh)." >&2
  exit 1
fi
if [[ "$given" -eq 0 ]]; then
  echo "NOTHING CHANGED: say which kitchen. $email is the ONLY owner of $owned kitchen(s):" >&2
  list_kitchens
  echo "Deleting one deletes it with its place, its page and everything it published; her" >&2
  echo "account and every other business of hers stay. Run the line for the kitchen she named." >&2
  exit 1
fi
if [[ "$hits" -eq 0 ]]; then
  echo "NOTHING CHANGED: no kitchen $email alone owns is called '$typed'. Hers:" >&2
  list_kitchens
  echo "Accents count; case and spaces do not. A shop's name is never here: a shop goes only" >&2
  echo "with its owner's account (docs/runbooks/delete-an-account.sh)." >&2
  exit 1
fi
if [[ "$hits" -gt 1 ]]; then
  echo "NOTHING CHANGED: $hits kitchens of $email are called '$typed'. This script tells kitchens" >&2
  echo "apart by name only, so it deletes neither: she can delete hers in Wera Cocina," >&2
  echo "Eliminar esta cocina, on the kitchen the app opens." >&2
  exit 1
fi

# The one kitchen the name matched: the rows line up (one order).
kitchen_id=$(paste -d '\t' <(printf '%s\n' "$ids") <(printf '%s\n' "$matches") | awk -F '\t' '$2 == "yes" { print $1; exit }')
if ! [[ "$kitchen_id" =~ ^[0-9a-f-]{36}$ ]]; then
  echo "UNEXPECTED: the lookup gave no kitchen id ('$kitchen_id'). Nothing changed." >&2
  exit 1
fi

# 2. The deletion itself, as that person: the claim set first in the same
# statement (a CTE with a volatile function is evaluated before the outer select),
# so `auth.uid()` inside `delete_my_business` is theirs.
wrote=0
result=$(query "
with who as (
  select u.id from auth.users u where lower(u.email) = lower('$email')
),
as_them as (
  select set_config('request.jwt.claims',
                    json_build_object('sub', who.id::text, 'role', 'authenticated')::text,
                    true) as claims
    from who
),
gone as (
  select public.delete_my_business(p_workspace_id => '$kitchen_id'::uuid,
                                   p_business_name => '$typed_sql') as r from as_them
)
select r ->> 'business_deleted' as result from gone;" result) || wrote=$?

# 3. Read it back, whatever the write said: the kitchen must be gone and the login
# still there — and a refusal must have left both. Never report what was not measured.
left=$(query "select count(*)::text as n from public.workspace where id = '$kitchen_id';" n) || {
  echo "UNKNOWN: the read-back failed (above). Check by hand before telling the person anything." >&2
  exit 1
}
login=$(query "select count(*)::text as n from auth.users u where lower(u.email) = lower('$email');" n) || {
  echo "UNKNOWN: the read-back failed (above). Check by hand before telling the person anything." >&2
  exit 1
}
if [[ "$login" != "1" ]]; then
  echo "UNEXPECTED: no account with $email remains — this script must never delete one. Tell Claude." >&2
  exit 1
fi
if [[ "$wrote" != 0 ]]; then
  if [[ "$left" == "1" ]]; then
    echo "NOTHING CHANGED: the deletion was refused (above)." >&2
  else
    echo "UNEXPECTED: the command failed (above) but the kitchen is gone and the account stays." >&2
  fi
  exit 1
fi
if [[ "$left" != "0" || "$result" != "$kitchen_id" ]]; then
  echo "UNEXPECTED: the deletion answered '$result' but the kitchen $kitchen_id is still there ($left)." >&2
  exit 1
fi

where='the shop (hosted)'; [[ "$target" == "--local" ]] && where='the LOCAL database'
echo "Done on $where. The kitchen '$typed' of $email is deleted; the account stays."
echo "Its photos are out of everyone's reach now: run docs/runbooks/delete-orphan-photos.sh"
echo "within 30 days. Reply to the person from privacidad@tu-wera.com to say it is done."

#!/usr/bin/env bash
# ============================================================================
# DELETE ONE ACCOUNT WHEN ITS OWNER ASKS BY EMAIL. Plan tasks `5R-d-i`, and
# `10.4b-iv-b` (a name for each business).
#
# The deletion pages (site/eliminar-cuenta/, and Wera Cocina's beside it) promise
# a way out without the app, because Google requires one: somebody who
# uninstalled Wera or Wera Cocina writes to privacidad@tu-wera.com. One login
# serves both apps, so one deletion serves both. This is what the owner runs
# once he has confirmed the request comes from the account's own address
# (docs/HANDBOOK.md, *If somebody asks to delete their account*).
#
#   bash docs/runbooks/delete-an-account.sh someone@example.com                       # owns no business alone
#   bash docs/runbooks/delete-an-account.sh someone@example.com --shop 'La Tienda'    # the one she alone owns
#   bash docs/runbooks/delete-an-account.sh someone@example.com --shop 'La Tienda' --shop 'Fonda Lupe'
#   bash docs/runbooks/delete-an-account.sh someone@example.com --local               # rehearsal
#
# It does EXACTLY what *Eliminar mi cuenta* does in either app: it calls
# `delete_my_account` (`0053`, `0073`) as that person, so the login goes, every
# business keeps their name as a former member, and every business they alone
# own — a shop in Wera, a kitchen in Wera Cocina — goes with them. There is no
# second deletion path to keep in step with the first.
#
# ⚠️ ONE `--shop` FOR EACH BUSINESS SHE ALONE OWNS, a shop's name or a kitchen's
# (`10.4b-iv-b`). `0073` asks every such business for its own typed name, so one
# name never deletes two; until that row this script passed a single name, which
# deleted a kitchen alone but was refused `TD007` for a shop and a kitchen. The
# names go in `p_business_names`, as Wera Cocina sends them. Case and runs of
# spaces do not matter; accents do (`normalize_name`).
#
# ⚠️ IT WRITES TO THE HOSTED DATABASE, and Claude's sessions are not allowed to
# — the owner runs it, through `supabase db query --linked` (the Management
# API, no database password).
#
# ⚠️ IT REFUSES, AND CHANGES NOTHING, WHEN:
#   - no account has that email;
#   - the account is the ONLY owner of a business and fewer `--shop` names are
#     given than it has such businesses — it prints each one, shop or kitchen,
#     and the command to run again, because deleting the account deletes them.
#     Ask the person to confirm that, then run what it printed;
#   - a name matches none of them (`delete_my_account` checks every one before
#     it changes anything — the same check the apps' typed names pass).
#
# `docs/checks/10.4b-iv-b-delete-by-email-rehearsal.sh` runs this against the
# local database, each refusal and each deletion read back (CI: `db.yml`).
# ============================================================================
set -euo pipefail

usage='usage: bash docs/runbooks/delete-an-account.sh <email> [--shop "<a business name>"]... [--local]'

email="${1:-}"
if [[ -z "$email" || "$email" == -* ]]; then
  echo "$usage" >&2
  exit 2
fi
shift

# A business's name is free text (an apostrophe is legal), so each is quoted the
# SQL way: every ' doubled. ⚠️ Through a variable: written inline as \' inside
# the double quotes, bash keeps the backslashes and the SQL breaks.
# ⚠️ No bash array for the names: macOS's bash 3.2 refuses an empty one under
# `set -u`, so they are kept as the SQL list they become, and counted.
q="'"
bs='\'
target='--linked'
names_sql=''
named=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --local) target='--local'; shift ;;
    --shop)
      if [[ $# -lt 2 || -z "$2" ]]; then echo "--shop needs a business's name" >&2; exit 2; fi
      names_sql="${names_sql:+$names_sql, }'${2//$q/$q$q}'"
      named=$((named + 1))
      shift 2 ;;
    *) echo "unknown argument: $1" >&2; echo "$usage" >&2; exit 2 ;;
  esac
done

# The email goes inside a SQL string, so anything that could close the string
# is refused rather than escaped.
if ! [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$ ]]; then
  echo "that does not look like an email address: $email" >&2
  exit 2
fi

# Runs one statement and prints one column of its result, one row per line.
# CSV, because it is the output `reset-a-password.sh` has proven against the
# hosted project. ⚠️ Select plain text columns only: the CLI writes a json
# value in CSV as Go's `map[...]`, not as JSON. ⚠️ One statement per call: the
# CLI prepares what it is given, and a prepared statement holds one command.
query() { # sql column
  # ⚠️ stderr apart: the CLI prints "Connecting to …" there, and merged into
  # the CSV it becomes the header row.
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

# 1. Who is this, and which businesses go with them. Read only. One row per
# business they alone own — the same set, by the same rule, that
# `delete_my_account` asks names for — or one row with empty columns when there
# is none. The order is fixed so the two reads below line up row for row.
sole_sql="
with who as (
  select u.id from auth.users u where lower(u.email) = lower('$email')
),
sole as (
  select w.id, w.display_name, w.kind
    from public.workspace w
    join public.workspace_member wm on wm.workspace_id = w.id
    join who on who.id = wm.user_id
   where wm.is_active and wm.role = 'owner'
     and not exists (
           select 1 from public.workspace_member o
            where o.workspace_id = w.id and o.is_active and o.role = 'owner'
              and o.user_id <> who.id)
)
select (select count(*) from who)::text as found,
       case s.kind when 'cocina' then 'kitchen' when 'tienda' then 'shop' else '' end as kind,
       coalesce(s.display_name, '') as business
  from (select 1) one left join sole s on true
 order by s.kind, s.display_name, s.id;"

found=$(query "$sole_sql" found | sed -n 1p) || { echo "NOTHING CHANGED: the lookup failed (above)." >&2; exit 1; }
kinds=$(query "$sole_sql" kind) || { echo "NOTHING CHANGED: the lookup failed (above)." >&2; exit 1; }
businesses=$(query "$sole_sql" business) || { echo "NOTHING CHANGED: the lookup failed (above)." >&2; exit 1; }

if [[ "$found" == "0" ]]; then
  echo "NOTHING CHANGED: no account has the email $email." >&2
  echo "Check the spelling with the person. They may have signed up with another address." >&2
  exit 1
fi
if [[ "$found" != "1" ]]; then
  echo "UNEXPECTED: $found accounts have the email $email. Nothing changed." >&2
  exit 1
fi

# How many businesses go with the account: the rows whose kind is not empty.
sole_count=$(printf '%s\n' "$kinds" | grep -c -v '^$' || true)
if [[ "$named" -lt "$sole_count" ]]; then
  echo "NOTHING CHANGED: $email is the ONLY owner of $sole_count business(es):" >&2
  # The two reads line up row for row (one order); a name may hold anything.
  paste -d '\t' <(printf '%s\n' "$kinds") <(printf '%s\n' "$businesses") | while IFS= read -r row; do
    if [[ -n "${row%%$'\t'*}" ]]; then printf '    %-8s %s\n' "${row%%$'\t'*}:" "${row#*$'\t'}" >&2; fi
  done
  echo "Deleting the account deletes each of them too — a shop with its products, sales," >&2
  echo "purchases and waste; a kitchen with what it published — and everybody's access to" >&2
  echo "them. Ask the person to confirm, then run again with one --shop for each:" >&2
  again="bash docs/runbooks/delete-an-account.sh $email"
  while IFS= read -r name; do
    if [[ -z "$name" ]]; then continue; fi
    # Shell-quoted for pasting: in single quotes, each ' written as '\''.
    again+=" --shop '${name//$q/$q$bs$q$q}'"
  done <<<"$businesses"
  if [[ "$target" == "--local" ]]; then again+=" --local"; fi
  echo "    $again" >&2
  exit 1
fi

if [[ "$named" -eq 0 ]]; then
  names_arr="'{}'::text[]"
else
  names_arr="array[$names_sql]::text[]"
fi

# 2. The deletion itself, as that person. The claim is set first in the same
# statement (a CTE with a volatile function is evaluated before the outer
# select), so `auth.uid()` inside `delete_my_account` is theirs.
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
  select public.delete_my_account(p_business_names => $names_arr) as r from as_them
)
select format('businesses deleted: %s, businesses it left: %s',
              r ->> 'shops_deleted', r ->> 'shops_left') as result
  from gone;" result) || wrote=$?

# 3. Read it back, whatever the write said: the login must be gone, and a
# refusal must have left it in place. Never report what was not measured.
left=$(query "select count(*)::text as n from auth.users u where lower(u.email) = lower('$email');" n) || {
  echo "UNKNOWN: the read-back failed (above). Check by hand before telling the person anything." >&2
  exit 1
}
if [[ "$wrote" != 0 ]]; then
  if [[ "$left" == "1" ]]; then
    echo "NOTHING CHANGED: the deletion was refused (above)." >&2
    echo "'a business name typed does not match' means one --shop is not the name of a business" >&2
    echo "this account alone owns. Run it without any --shop to print each name as it is stored." >&2
  else
    echo "UNEXPECTED: the command failed (above) but no account with $email remains." >&2
  fi
  exit 1
fi
if [[ "$left" != "0" ]]; then
  echo "UNEXPECTED: the deletion reported '$result' but an account with $email still exists." >&2
  exit 1
fi

where='the shop (hosted)'; [[ "$target" == "--local" ]] && where='the LOCAL database'
echo "Done on $where. The account $email is deleted ($result)."
echo "Reply to the person from privacidad@tu-wera.com to say it is done."

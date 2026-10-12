#!/usr/bin/env bash
# ============================================================================
# DELETE ONE ACCOUNT WHEN ITS OWNER ASKS BY EMAIL. Plan task `5R-d-i`.
#
# The deletion page (site/eliminar-cuenta/) promises a way out without the app,
# because Google requires one: somebody who uninstalled Wera writes to
# privacidad@tu-wera.com. This is what the owner runs once he has confirmed the
# request comes from the account's own address (docs/HANDBOOK.md, *If somebody
# asks to delete their account*).
#
#   bash docs/runbooks/delete-an-account.sh someone@example.com                    # the shop
#   bash docs/runbooks/delete-an-account.sh someone@example.com --shop "La Tienda" # a sole owner
#   bash docs/runbooks/delete-an-account.sh someone@example.com --local            # rehearsal
#
# It does EXACTLY what *Eliminar mi cuenta* does in the app: it calls
# `delete_my_account` (`0053`) as that person, so the login goes, every shop
# keeps their name as a former member, and a shop they alone own goes with them.
# There is no second deletion path to keep in step with the first.
#
# ⚠️ IT WRITES TO THE HOSTED DATABASE, and Claude's sessions are not allowed to
# — the owner runs it, through `supabase db query --linked` (the Management
# API, no database password).
#
# ⚠️ IT REFUSES, AND CHANGES NOTHING, WHEN:
#   - no account has that email;
#   - the account is the ONLY owner of a shop and `--shop` is missing — it
#     prints the shop's name, because deleting the account deletes the shop.
#     Ask the person to confirm that, then run it again with `--shop "<name>"`;
#   - `--shop` does not match that shop's name (`delete_my_account` checks it
#     before it changes anything, the same check the app's typed name passes).
# ============================================================================
set -euo pipefail

usage='usage: bash docs/runbooks/delete-an-account.sh <email> [--shop "<shop name>"] [--local]'

email="${1:-}"
if [[ -z "$email" || "$email" == -* ]]; then
  echo "$usage" >&2
  exit 2
fi
shift

target='--linked'
shop=''
shop_given=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --local) target='--local'; shift ;;
    --shop)
      if [[ $# -lt 2 || -z "$2" ]]; then echo "--shop needs the shop's name" >&2; exit 2; fi
      shop="$2"; shop_given=1; shift 2 ;;
    *) echo "unknown argument: $1" >&2; echo "$usage" >&2; exit 2 ;;
  esac
done

# The email goes inside a SQL string, so anything that could close the string
# is refused rather than escaped.
if ! [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$ ]]; then
  echo "that does not look like an email address: $email" >&2
  exit 2
fi
# A shop's name is free text (an apostrophe is legal), so it is quoted the SQL
# way: every ' doubled. ⚠️ Through a variable: written inline as \' inside the
# double quotes, bash keeps the backslashes and the SQL breaks.
q="'"
shop_sql='null'
if [[ "$shop_given" == 1 ]]; then
  shop_sql="'${shop//$q/$q$q}'"
fi

# Runs one statement and prints one column of its result, one row per line.
# CSV, because it is the output `reset-a-password.sh` has proven against the
# hosted project. ⚠️ Select plain text columns only: the CLI writes a json
# value in CSV as Go's `map[...]`, not as JSON.
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

# 1. Who is this, and which shops would go with them. Read only. One row per
# shop they alone own, or one row with an empty name when there is none.
sole_sql="
with who as (
  select u.id from auth.users u where lower(u.email) = lower('$email')
),
sole as (
  select w.display_name
    from public.workspace w
    join public.workspace_member wm on wm.workspace_id = w.id
    join who on who.id = wm.user_id
   where wm.is_active and wm.role = 'owner'
     and not exists (
           select 1 from public.workspace_member o
            where o.workspace_id = w.id and o.is_active and o.role = 'owner'
              and o.user_id <> who.id)
)
select (select count(*) from who)::text as found, coalesce(s.display_name, '') as shop
  from (select 1) one left join sole s on true
 order by s.display_name;"

found=$(query "$sole_sql" found | sed -n 1p) || { echo "NOTHING CHANGED: the lookup failed (above)." >&2; exit 1; }
sole_shops=$(query "$sole_sql" shop | sed '/^$/d') || { echo "NOTHING CHANGED: the lookup failed (above)." >&2; exit 1; }

if [[ "$found" == "0" ]]; then
  echo "NOTHING CHANGED: no account has the email $email." >&2
  echo "Check the spelling with the person. They may have signed up with another address." >&2
  exit 1
fi
if [[ "$found" != "1" ]]; then
  echo "UNEXPECTED: $found accounts have the email $email. Nothing changed." >&2
  exit 1
fi
if [[ -n "$sole_shops" && "$shop_given" == 0 ]]; then
  echo "NOTHING CHANGED: $email is the ONLY owner of:" >&2
  printf '    %s\n' "$sole_shops" >&2
  echo "Deleting the account deletes that shop too: its products, sales, purchases, waste and" >&2
  echo "everybody's access to it. Ask the person to confirm, then run again with:" >&2
  echo "    --shop \"$(printf '%s\n' "$sole_shops" | head -1)\"" >&2
  exit 1
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
  select public.delete_my_account($shop_sql) as r from as_them
)
select format('shops deleted: %s, shops it left: %s',
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
    echo "A 'shop name typed does not match' error means --shop must be the shop's name as printed." >&2
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

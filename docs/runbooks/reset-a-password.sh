#!/usr/bin/env bash
# ============================================================================
# SET A TEMPORARY PASSWORD FOR ONE ACCOUNT. Plan task `5R-h`.
#
# *¿Olvidaste tu contraseña?* on `Entrar` opens WhatsApp to the owner, and this
# is what he runs once he has confirmed who is asking (docs/HANDBOOK.md, *If
# somebody forgot their password*). There is no reset email: that needs a real
# mail provider, which is `5R-j`, parked.
#
#   bash docs/runbooks/reset-a-password.sh someone@example.com            # the shop
#   bash docs/runbooks/reset-a-password.sh someone@example.com --local    # rehearsal
#
# It prints the new password once. Send it to the person; they sign in with it.
#
# ⚠️ IT WRITES TO THE HOSTED DATABASE, and Claude's sessions are not allowed to
# — the owner runs it. It goes through `supabase db query --linked` (the
# Management API, no database password).
#
# ⚠️ IT REFUSES, AND CHANGES NOTHING, WHEN:
#   - no account has that email (it never creates one);
#   - the account signs in with Google only — giving it a password would open a
#     second way into somebody's Google account. Tell them to tap *Entrar con
#     Google*.
# One statement looks the account up and writes it, so the check and the write
# cannot disagree.
# ============================================================================
set -euo pipefail

email="${1:-}"
target="${2:---linked}"

if [[ -z "$email" || "$email" == -* ]]; then
  echo "usage: bash docs/runbooks/reset-a-password.sh <email> [--local]" >&2
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

# Easy to read out or type from a WhatsApp message: no 0/o, 1/l/i.
alphabet='abcdefghjkmnpqrstuvwxyz23456789'
chunk() {
  local out='' n
  for _ in 1 2 3 4; do
    n=$(( $(od -An -N2 -tu2 /dev/urandom | tr -d ' ') % ${#alphabet} ))
    out+="${alphabet:$n:1}"
  done
  printf '%s' "$out"
}
password="wera-$(chunk)-$(chunk)"

sql=$(cat <<SQL
with target as (
  select u.id,
         exists (select 1 from auth.identities i
                  where i.user_id = u.id and i.provider = 'email') as has_password
    from auth.users u
   where lower(u.email) = lower('$email')
),
written as (
  update auth.users u
     set encrypted_password = extensions.crypt('$password', extensions.gen_salt('bf')),
         updated_at = now()
    from target t
   where u.id = t.id and t.has_password
  returning u.id
)
select (select count(*) from target)                    as found,
       (select count(*) from target where has_password) as has_password,
       (select count(*) from written)                   as written;
SQL
)

out=$(supabase db query "$target" -o csv "$sql" 2>&1) || { echo "$out" >&2; exit 1; }
row=$(printf '%s\n' "$out" | tail -1)
IFS=, read -r found has_password written <<<"$row"

if [[ "$found" == "0" ]]; then
  echo "NOTHING CHANGED: no account has the email $email." >&2
  echo "Check the spelling with the person. They may have signed up with another address." >&2
  exit 1
fi
if [[ "$has_password" == "0" ]]; then
  echo "NOTHING CHANGED: $email signs in with Google, not with a password." >&2
  echo "Tell them to tap 'Entrar con Google'." >&2
  exit 1
fi
if [[ "$written" != "1" ]]; then
  echo "UNEXPECTED: found=$found has_password=$has_password written=$written. Nothing is confirmed." >&2
  echo "$out" >&2
  exit 1
fi

where='the shop (hosted)'; [[ "$target" == "--local" ]] && where='the LOCAL database'
echo "Done on $where. The new password for $email is:"
echo
echo "    $password"
echo
echo "Send it to them by WhatsApp. They sign in on Entrar with it."

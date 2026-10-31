#!/usr/bin/env bash
# ============================================================================
# DOES THE DELETION ASKED FOR BY EMAIL STILL DELETE WHAT IT SAYS, AND REFUSE
# WHAT IT MUST? Plan task `10.4b-iv-b`.
#
#   bash docs/checks/10.4b-iv-b-delete-by-email-rehearsal.sh            # every case (it prints the count)
#   bash docs/checks/10.4b-iv-b-delete-by-email-rehearsal.sh --falsify  # broken copies, each red for its reason
#
# Against a local `supabase start` with the migrations applied: it runs
# `docs/runbooks/delete-an-account.sh --local` exactly as the owner runs it on
# the hosted project, as five people — a kitchen alone, a shop and a kitchen, a
# shop alone, a co-owner of a shop, nobody — and reads every answer back from
# the database itself, never from what the runbook printed.
#
# WHY IT EXISTS. The runbook is the only way out without the app, and the aviso
# and both deletion pages promise it (Google requires one). It is run by hand,
# rarely, on the live database, and what it deletes cannot be put back. Until
# `10.4b-iv-b` it passed one name, which `0073` refuses for an account that alone
# owns a shop and a kitchen; nothing ran it but a person (rehearsed by hand on
# 2026-10-12). The names it prints are pasted back into a terminal, so the case
# that matters most runs the printed command as printed.
#
# ⚠️ IT WRITES TO THE LOCAL DATABASE ONLY (`--local` on every call), and every
# fixture login is `…@example.invalid`, tagged per run; whatever a failed case
# leaves behind is deleted at the end, through the same function.
# ⚠️ One statement per `supabase db query` call: the CLI prepares what it is
# given, and a prepared statement holds one command.
# ============================================================================
set -uo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
runbook="$root/docs/runbooks/delete-an-account.sh"
mode="${1:-}"
[[ -z "$mode" || "$mode" == "--falsify" ]] || { echo "usage: bash docs/checks/10.4b-iv-b-delete-by-email-rehearsal.sh [--falsify]" >&2; exit 2; }
[[ -f "$runbook" ]] || { echo "no runbook at $runbook" >&2; exit 2; }
command -v supabase >/dev/null || { echo "the Supabase CLI is not on PATH" >&2; exit 2; }
cd "$root"

scratch="$(mktemp -d)"
tag="$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')"
trap 'cleanup; rm -rf "$scratch"' EXIT

# One statement, one column, one row per line (the runbook's own reader).
sql() { # statement column
  local out
  out="$(supabase db query --local -o csv "$1" 2>"$scratch/sql.err")" || { cat "$scratch/sql.err" >&2; return 1; }
  printf '%s\n' "$out" | python3 -c '
import csv, sys
rows = list(csv.DictReader(sys.stdin))
if not rows or sys.argv[1] not in rows[0]:
    sys.exit("unexpected reply: no column " + sys.argv[1])
for r in rows:
    print(r[sys.argv[1]])
' "$2"
}

mail() { echo "$1-$tag@example.invalid"; }

# A login, made as GoTrue would leave it for these purposes: an id, an email, a name.
login() { # who
  sql "insert into auth.users (id, email, raw_user_meta_data)
       values (gen_random_uuid(), '$(mail "$1")', jsonb_build_object('full_name', 'Rehearsal $1'))
       returning id::text as id;" id
}

# A business, made as its app makes it: `onboard_workspace` called as the owner.
business() { # user-id name kind
  # ⚠️ Through a variable, as in the runbook: `\'` inside double quotes keeps its backslash.
  local q="'"
  local name="${2//$q/$q$q}"
  sql "with as_them as (
         select set_config('request.jwt.claims',
                  json_build_object('sub', '$1', 'role', 'authenticated')::text, true) as c)
       select public.onboard_workspace(p_display_name => '$name', p_kind => '$3')::text as id
         from as_them;" id
}

users_with() { sql "select count(*)::text as n from auth.users where lower(email) = lower('$1');" n; }
business_left() { sql "select count(*)::text as n from public.workspace where id = '$1';" n; }

# Every fixture still standing goes, as the function deletes: each one's own
# businesses named. Silent; a leftover never makes a case green.
cleanup() {
  local id
  for id in $(sql "select id::text as id from auth.users where email like '%-$tag@example.invalid';" id 2>/dev/null); do
    sql "with as_them as (
           select set_config('request.jwt.claims',
                    json_build_object('sub', '$id', 'role', 'authenticated')::text, true) as c),
         mine as (
           select coalesce(array_agg(w.display_name), '{}') as names
             from public.workspace w
             join public.workspace_member wm on wm.workspace_id = w.id
            where wm.user_id = '$id' and wm.is_active and wm.role = 'owner')
         select public.delete_my_account(p_business_names => mine.names)::text as r
           from as_them, mine;" r >/dev/null 2>&1 || true
  done
}

# --- the five people ---------------------------------------------------------
fixtures() {
  kitchen_name="Fonda D'Lupe $tag"
  shop_b="Abarrotes Ambas $tag"
  kitchen_b="Cocina Ambas $tag"
  shop_c="Tienda Sola $tag"
  shared="Compartida $tag"

  u_a="$(login solo-cocina)" && k_a="$(business "$u_a" "$kitchen_name" cocina)" || return 1
  u_b="$(login ambas)" && s_b="$(business "$u_b" "$shop_b" tienda)" && k_b="$(business "$u_b" "$kitchen_b" cocina)" || return 1
  u_c="$(login solo-tienda)" && s_c="$(business "$u_c" "$shop_c" tienda)" || return 1
  u_e="$(login duena)" && s_d="$(business "$u_e" "$shared" tienda)" || return 1
  u_d="$(login socia)" || return 1
  # The co-owner: a second active owner of the shared shop.
  sql "insert into public.workspace_member (workspace_id, user_id, role, display_name, is_active)
       values ('$s_d', '$u_d', 'owner', 'Rehearsal socia', true) returning id::text as id;" id >/dev/null || return 1
  u_f="$(login nada)" || return 1
}

# One case: the runbook's exit code, a sentence it printed, and what the
# database holds afterwards. Prints `ok` or `FAIL`.
# shellcheck disable=SC2034
check() { # name want-exit text readback-command want-readback
  local name="$1" want="$2" text="$3" readback="$4" want_rb="$5"
  local rb
  rb="$(eval "$readback" 2>&1 | tr '\n' ' ' | sed 's/ $//')"
  if [[ "$code" == "$want" ]] && grep -qF -- "$text" <<<"$out" && [[ "$rb" == "$want_rb" ]]; then
    echo "  ok    $name"
  else
    echo "  FAIL  $name (exit $code, wanted $want; read back [$rb], wanted [$want_rb]; wanted the line: $text)"
    printf '%s\n' "$out" | sed 's/^/          | /' | head -12
  fi
}
run() { out="$(bash "$book" "$@" 2>&1)"; code=$?; }

N_NOBODY="an email with no account is refused, and nothing changes"
N_KITCHEN_ASKED="a kitchen alone, asked for without its name, is refused and named as a kitchen"
N_BOTH_ASKED="a shop and a kitchen, asked for without names, are both named, and nothing changes"
N_ONE_OF_TWO="one name of two is refused before the database is asked, and nothing changes"
N_ONE_WRONG="two names, one of them wrong, is refused by the database itself, and nothing changes"
N_PRINTED="the command it printed, run as printed, deletes the login, the shop and the kitchen"
N_APOSTROPHE="a kitchen's name with an apostrophe, typed in another case and spacing, deletes it"
N_SHOP_ALONE="a shop alone and one --shop, as before this row, deletes both"
N_COOWNER="a co-owner needs no name: her login goes, the shop stays, her name stays on it"
N_NOTHING="an account with no business goes with no name, its email typed in capitals"

cases() {
  book="$1"
  local again args

  run "$(mail ninguna)" --local
  check "$N_NOBODY" 1 "NOTHING CHANGED: no account has the email" "users_with $(mail ninguna)" "0"

  run "$(mail solo-cocina)" --local
  check "$N_KITCHEN_ASKED" 1 "kitchen: $kitchen_name" "users_with $(mail solo-cocina); business_left $k_a" "1 1"

  run "$(mail ambas)" --local
  local asked="$out"
  check "$N_BOTH_ASKED" 1 "shop:    $shop_b" "users_with $(mail ambas); business_left $s_b; business_left $k_b" "1 1 1"
  grep -qF -- "kitchen: $kitchen_b" <<<"$asked" || echo "  FAIL  $N_BOTH_ASKED (the kitchen was not named)"

  run "$(mail ambas)" --shop "$shop_b" --local
  check "$N_ONE_OF_TWO" 1 "is the ONLY owner of 2 business(es)" "users_with $(mail ambas); business_left $s_b; business_left $k_b" "1 1 1"

  run "$(mail ambas)" --shop "$shop_b" --shop "Cocina Equivocada $tag" --local
  check "$N_ONE_WRONG" 1 "the deletion was refused" "users_with $(mail ambas); business_left $s_b; business_left $k_b" "1 1 1"

  # The line the owner would paste, as printed: its arguments, read the way his
  # shell reads them, handed to the runbook under test.
  again="$(grep -m1 '^    bash docs/runbooks/delete-an-account.sh ' <<<"$asked" | sed 's/^    bash docs\/runbooks\/delete-an-account.sh //')"
  if [[ -z "$again" ]] || ! eval "args=($again)"; then
    out="(no command to run again was printed)"; code=99
  else
    run "${args[@]}"
  fi
  check "$N_PRINTED" 0 "Done on the LOCAL database" "users_with $(mail ambas); business_left $s_b; business_left $k_b" "0 0 0"

  run "$(mail solo-cocina)" --shop "fonda  d'lupe $tag" --local
  check "$N_APOSTROPHE" 0 "businesses deleted: 1" "users_with $(mail solo-cocina); business_left $k_a" "0 0"

  run "$(mail solo-tienda)" --shop "$shop_c" --local
  check "$N_SHOP_ALONE" 0 "businesses deleted: 1" "users_with $(mail solo-tienda); business_left $s_c" "0 0"

  run "$(mail socia)" --local
  check "$N_COOWNER" 0 "businesses deleted: 0, businesses it left: 1" \
    "users_with $(mail socia); business_left $s_d; sql \"select (count(*) filter (where not is_active and display_name = 'Rehearsal socia'))::text as n from public.workspace_member where workspace_id = '$s_d' and user_id = '$u_d';\" n" "0 1 1"

  run "$(mail nada | tr '[:lower:]' '[:upper:]')" --local
  check "$N_NOTHING" 0 "businesses deleted: 0" "users_with $(mail nada)" "0"
}

tally() { # cases-output
  local red green
  red="$(grep -c '^  FAIL' <<<"$1")"
  green="$(grep -c '^  ok' <<<"$1")"
  echo "$red $green"
}

if [[ -z "$mode" ]]; then
  fixtures || { echo "could not make the fixtures (above) — is \`supabase start\` up, with the migrations applied?" >&2; exit 2; }
  result="$(cases "$runbook")"
  echo "$result"
  read -r red green <<<"$(tally "$result")"
  echo
  if [[ "$red" -ne 0 ]]; then
    echo "$red of $((red + green)) case(s) failed — delete-an-account.sh no longer does what its header says."
    exit 1
  fi
  echo "all $green cases passed — the deletion by email refuses what it must and deletes what it names."
  exit 0
fi

# --- --falsify: a broken copy must turn the case that guards it red ---------
bad=0
tried=0
broken() { # name from to must-fail
  local name="$1" from="$2" to="$3" must_fail="$4"
  local copy="$scratch/broken.sh"
  tried=$((tried + 1))
  FROM="$from" TO="$to" node -e '
    const fs = require("fs");
    const s = fs.readFileSync(process.argv[1], "utf8");
    fs.writeFileSync(process.argv[2], s.split(process.env.FROM).join(process.env.TO));
  ' "$runbook" "$copy"
  if cmp -s "$runbook" "$copy"; then
    echo "  FAIL  $name — the breakage did not apply; the runbook no longer has: $from"
    bad=$((bad + 1))
    return
  fi
  cleanup
  if ! fixtures >/dev/null 2>&1; then
    echo "  FAIL  $name — could not make the fixtures"
    bad=$((bad + 1))
    return
  fi
  local result
  result="$(cases "$copy")"
  if grep -qF -- "  FAIL  $must_fail" <<<"$result"; then
    echo "  ok    $name — red on: $must_fail"
  else
    echo "  FAIL  $name — stayed green on: $must_fail"
    bad=$((bad + 1))
  fi
}

broken "every name but the last forgotten" \
  'names_sql="${names_sql:+$names_sql, }'"'"'${2//$q/$q$q}'"'"'"' \
  'names_sql="'"'"'${2//$q/$q$q}'"'"'"' "$N_PRINTED"
broken "the count of names never compared" \
  'if [[ "$named" -lt "$sole_count" ]]; then' 'if [[ "$named" -lt 0 ]]; then' "$N_KITCHEN_ASKED"
broken "a co-owned shop counted as hers" \
  'and o.user_id <> who.id)' 'and o.user_id <> who.id and false)' "$N_COOWNER"
broken "the printed names left unquoted" \
  "again+=\" --shop '\${name//\$q/\$q\$bs\$q\$q}'\"" 'again+=" --shop ${name}"' "$N_PRINTED"

echo
if [[ "$bad" -ne 0 ]]; then
  echo "$bad broken copy(ies) were not caught — the rehearsal cannot fail where it should."
  exit 1
fi
echo "all $tried broken copies turned their case red — the rehearsal can still fail."

#!/usr/bin/env bash
# ============================================================================
# DOES THE DELETION ASKED FOR BY EMAIL STILL DELETE WHAT IT SAYS, AND REFUSE
# WHAT IT MUST? Plan task `10.4b-iv-b` — and, since `10.5-iii-c`, the deletion of
# ONE KITCHEN asked for by email, the account kept (`delete-a-kitchen.sh`, `0077`).
#
#   bash docs/checks/10.4b-iv-b-delete-by-email-rehearsal.sh            # every case (it prints the count)
#   bash docs/checks/10.4b-iv-b-delete-by-email-rehearsal.sh --falsify  # broken copies, each red for its reason
#
# Against a local `supabase start` with the migrations applied: it runs
# `docs/runbooks/delete-an-account.sh --local` exactly as the owner runs it on
# the hosted project, as five people — a kitchen alone, a shop and a kitchen, a
# shop alone, a co-owner of a shop, nobody — and reads every answer back from
# the database itself, never from what the runbook printed. And
# `docs/runbooks/delete-a-kitchen.sh --local` as one more person, who owns a shop
# and two kitchens: her kitchens listed and never her shop, a shop's name and a
# name with an accent refused, the line it printed for one kitchen run as printed
# — that kitchen gone, her login, her shop and her other kitchen kept — and the
# same line again refused. ⚠️ Since `10.9a-i` each deleted kitchen's choices and requests about
# its menu (`0081`, `servicio`) are read back gone, and the kept kitchen's kept. ⚠️ Since
# `10.9b-i` two helpers (`0082`): one deletes her account — her login goes, her kitchen stays,
# her name stays on her ended membership — and one is in the kitchen deleted alone — her
# membership goes with it, her login stays. ⚠️ Since `10.9b-iii` (`0083`) each helper JOINS by her
# owner's code, as the phones do, and an invitation with no address is read back: the code a helper
# joined with goes with her account, and a code nobody used goes with its kitchen — deleted with
# its account, or alone. ⚠️ Since `10.9d-i` (`0084`) a neighbour follows three kitchens, as
# Itacate does (`set_my_follow`): a kitchen deleted, with its account or alone, takes its follows
# and leaves her its name (*dejó Itacate*); the kept kitchen keeps hers; and the person who owns
# nothing follows one before deleting her account — her follows and the kitchens she followed
# that left go with her. ⚠️ Since `10.9e-i` (`0085`) the same neighbour holds a loyalty card at each
# of the three kitchens, with a stamp and a reward to claim: a kitchen deleted, with its account or
# alone, takes its whole card — terms, cards, stamps, rewards, its phones' codes — and the kept
# kitchen keeps hers; the person who owns nothing holds one at the kept kitchen, and her account
# deleted takes her card, her reward and her phone's code, her stamp staying there, nobody's.
# ⚠️ Since `10.9g-i` (`0087`) each of the three kitchens runs a promotion, an offer of hers joining
# it: a kitchen deleted, with its account or alone, takes its promotions and the offer, and the kept
# kitchen keeps its own. A promotion names nobody, so an account that owns nothing has none to take.
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
kitchen_runbook="$root/docs/runbooks/delete-a-kitchen.sh"
mode="${1:-}"
[[ -z "$mode" || "$mode" == "--falsify" ]] || { echo "usage: bash docs/checks/10.4b-iv-b-delete-by-email-rehearsal.sh [--falsify]" >&2; exit 2; }
[[ -f "$runbook" ]] || { echo "no runbook at $runbook" >&2; exit 2; }
[[ -f "$kitchen_runbook" ]] || { echo "no runbook at $kitchen_runbook" >&2; exit 2; }
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
# `10.9a-i`: what a kitchen uses and what it told Wera about its menu (`0081`), rows of its own.
# Since `10.9d-i`, the neighbours who follow it or ring its bell (`0084`) too.
servicio_left() { sql "select ((select count(*) from servicio.kitchen_feature where workspace_id = '$1')
                             + (select count(*) from servicio.menu_request where workspace_id = '$1')
                             + (select count(*) from servicio.follow where workspace_id = '$1'))::text as n;" n; }
# A choice and a request about the menu, written as the database's owner: a deletion must take both.
uses() { # kitchen-id
  sql "with f as (insert into servicio.kitchen_feature (workspace_id, feature, state) values ('$1', 'menu', 'interesada') returning 1),
            m as (insert into servicio.menu_request (workspace_id, body) values ('$1', 'Ensayo') returning 1)
       select ((select count(*) from f) + (select count(*) from m))::text as n;" n
}

# `10.9b-iii`: a helper's code, asked for as the kitchen's owner (`invite_helper`, `0083`) — an
# invitation with no address. Prints the code.
code_at() { # kitchen-id
  local owner
  owner="$(sql "select user_id::text as u from public.workspace_member
                 where workspace_id = '$1' and role = 'owner' and is_active limit 1;" u)" || return 1
  sql "with as_them as (
         select set_config('request.jwt.claims',
                  json_build_object('sub', '$owner', 'role', 'authenticated')::text, true) as c)
       select public.invite_helper('$1') ->> 'token' as t from as_them;" t
}
# `10.9b-i`: a helper at a kitchen (`staff`, at its place) — since `10.9b-iii` joining by her owner's
# code, as the phones do (`redeem_invite`), which names her membership from her login.
helper() { # kitchen-id user-id
  local code
  code="$(code_at "$1")" && [[ -n "$code" ]] || return 1
  sql "with as_them as (
         select set_config('request.jwt.claims',
                  json_build_object('sub', '$2', 'role', 'authenticated')::text, true) as c)
       select (public.redeem_invite('$code') ->> 'location_count') as n from as_them;" n
}
# `10.9d-i`: a neighbour follows a kitchen through her own function, as Itacate does (`0084`).
follows() { # user-id kitchen-id
  sql "with as_them as (
         select set_config('request.jwt.claims',
                  json_build_object('sub', '$1', 'role', 'authenticated')::text, true) as c)
       select (public.set_my_follow('$2', p_following => true) ->> 'following') as f from as_them;" f
}
# Her own rows: what she follows, and the kitchens she followed that left (one, or every one).
follows_of() { sql "select count(*)::text as n from servicio.follow where user_id = '$1';" n; }
gone_for() { # user-id [kitchen-id]
  sql "select count(*)::text as n from servicio.kitchen_gone where user_id = '$1' ${2:+and workspace_id = '$2'};" n
}
memberships_of() { sql "select count(*)::text as n from public.workspace_member where user_id = '$1';" n; }
# `10.9e-i`: a neighbour's card at a kitchen (`0085`), written as the database's owner — the
# kitchen's terms and its owner's phone's code, her card, a stamp, a reward to claim and her
# phone's code. Prints how many of her five rows it wrote.
card_at() { # kitchen-id user-id
  sql "with owner as (select wm.user_id from public.workspace_member wm
                       where wm.workspace_id = '$1' and wm.role = 'owner' and wm.is_active limit 1),
            t as (insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_by)
                  select '$1', 'Ensayo', 8, null, owner.user_id from owner
                  on conflict (workspace_id) where replaced_at is null do update set reward = excluded.reward
                  returning id),
            c as (insert into servicio.loyalty_card (user_id, workspace_id, terms_id, stamps, started_at, last_stamp_at)
                  select '$2', '$1', t.id, 1, now(), now() from t returning 1),
            s as (insert into servicio.card_stamp (workspace_id, user_id, day, given_at, given_by, via, count_after, of_stamps)
                  select '$1', '$2', current_date, now(), owner.user_id, 'su_codigo', 1, 8 from owner returning 1),
            r as (insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at)
                  select '$1', '$2', t.id, 'Ensayo', now() from t returning 1),
            kk as (insert into servicio.kitchen_key (workspace_id, user_id, secret)
                   select '$1', owner.user_id, extensions.gen_random_bytes(20) from owner returning 1),
            nk as (insert into servicio.neighbour_key (user_id, secret)
                   values ('$2', extensions.gen_random_bytes(20)) returning 1)
       select ((select count(*) from c) + (select count(*) from s) + (select count(*) from r)
               + (select count(*) from kk) + (select count(*) from nk))::text as n;" n
}
# A kitchen's whole card: its terms, the cards, stamps and rewards there, its phones' codes.
card_left() { sql "select ((select count(*) from servicio.card_terms where workspace_id = '$1')
                         + (select count(*) from servicio.loyalty_card where workspace_id = '$1')
                         + (select count(*) from servicio.card_stamp where workspace_id = '$1')
                         + (select count(*) from servicio.card_reward where workspace_id = '$1')
                         + (select count(*) from servicio.kitchen_key where workspace_id = '$1'))::text as n;" n; }
# Her card at one kitchen; every row of hers anywhere (cards, rewards, stamps, her phones' codes);
# the stamps at a kitchen that point to nobody.
card_of() { sql "select count(*)::text as n from servicio.loyalty_card where user_id = '$1' and workspace_id = '$2';" n; }
her_card_rows() { sql "select ((select count(*) from servicio.loyalty_card where user_id = '$1')
                             + (select count(*) from servicio.card_reward where user_id = '$1')
                             + (select count(*) from servicio.card_stamp where user_id = '$1')
                             + (select count(*) from servicio.neighbour_key where user_id = '$1'))::text as n;" n; }
nobodys_stamps() { sql "select count(*)::text as n from servicio.card_stamp where workspace_id = '$1' and user_id is null;" n; }
# `10.9g-i`: a promotion at a kitchen (`0087`), written as the database's owner, and an offer of the
# kitchen's that joined it. Prints how many of the two rows it wrote.
promo_at() { # kitchen-id
  sql "with p as (insert into servicio.promotion (id, workspace_id, kind, what, days, starts_on, ends_on, conditions)
                  values (gen_random_uuid(), '$1', 'nuevo', 'Ensayo', array[1,2,3,4,5,6,7]::smallint[],
                          current_date, current_date + 7, 'Ensayo, en esta cocina.')
                  returning id),
            o as (insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by, promotion_id)
                  select gen_random_uuid(), '$1', l.id, now(), now() + interval '2 hours', gen_random_uuid(), p.id
                    from p, public.location l where l.workspace_id = '$1' limit 1
                  returning 1)
       select ((select count(*) from p) + (select count(*) from o))::text as n;" n
}
# A kitchen's promotions, and the offers anywhere that joined one of them.
promos_left() { sql "select ((select count(*) from servicio.promotion where workspace_id = '$1')
                           + (select count(*) from public.listing where promotion_id in
                                (select id from servicio.promotion where workspace_id = '$1')))::text as n;" n; }
# `10.9b-iii`: every invitation of a kitchen, used or not; and the ones a person joined with.
codes_left() { sql "select count(*)::text as n from public.workspace_invite where workspace_id = '$1';" n; }
joined_with() { sql "select count(*)::text as n from public.workspace_invite where accepted_by = '$1';" n; }

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
  # `10.5-iii-c`: a shop and two kitchens, all hers alone. ⚠️ The kitchen the cases
  # delete sorts SECOND by name, so a runbook that took the first row it listed
  # would send the other kitchen's id — and the server would refuse the name.
  shop_g="Abarrotes Gabi $tag"
  kitchen_g="Cocina D'Gabi $tag"
  kitchen_g2="Antojitos Gabi $tag"
  u_g="$(login tres)" && s_g="$(business "$u_g" "$shop_g" tienda)" \
    && k_g="$(business "$u_g" "$kitchen_g" cocina)" && k_g2="$(business "$u_g" "$kitchen_g2" cocina)" || return 1
  # `10.9a-i`: three kitchens with a choice and a request each — one deleted with its account, one
  # deleted alone, one kept.
  [[ "$(uses "$k_b")" == 2 && "$(uses "$k_g")" == 2 && "$(uses "$k_g2")" == 2 ]] || return 1
  # `10.9b-i`: a helper at the kitchen Gabi keeps, who deletes her own account; and one at the
  # kitchen Gabi deletes alone.
  u_h="$(login ayudante)" && [[ "$(helper "$k_g2" "$u_h")" == 1 ]] || return 1
  u_h2="$(login ayudante-gabi)" && [[ "$(helper "$k_g" "$u_h2")" == 1 ]] || return 1
  # `10.9b-iii`: a code nobody used at the kitchen deleted with its account and at the one deleted alone.
  [[ -n "$(code_at "$k_b")" && -n "$(code_at "$k_g")" ]] || return 1
  # `10.9d-i`: a neighbour follows the kitchen deleted with its account, the one deleted alone and
  # the one kept; the person who owns nothing follows the first, then deletes her account.
  u_v="$(login vecina)" || return 1
  [[ "$(follows "$u_v" "$k_b")" == true && "$(follows "$u_v" "$k_g")" == true && "$(follows "$u_v" "$k_g2")" == true ]] || return 1
  [[ "$(follows "$u_f" "$k_b")" == true ]] || return 1
  # `10.9e-i`: her card at the same three kitchens; the person who owns nothing holds one at the
  # kitchen kept, so what her account takes is read where nothing else deletes it.
  [[ "$(card_at "$k_b" "$u_v")" == 5 && "$(card_at "$k_g" "$u_v")" == 5 && "$(card_at "$k_g2" "$u_v")" == 5 ]] || return 1
  [[ "$(card_at "$k_g2" "$u_f")" == 5 ]] || return 1
  # `10.9g-i`: a promotion at each, an offer joining it.
  [[ "$(promo_at "$k_b")" == 2 && "$(promo_at "$k_g")" == 2 && "$(promo_at "$k_g2")" == 2 ]] || return 1
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
run_kitchen() { out="$(bash "$kbook" "$@" 2>&1)"; code=$?; }

N_NOBODY="an email with no account is refused, and nothing changes"
N_KITCHEN_ASKED="a kitchen alone, asked for without its name, is refused and named as a kitchen"
N_BOTH_ASKED="a shop and a kitchen, asked for without names, are both named, and nothing changes"
N_ONE_OF_TWO="one name of two is refused before the database is asked, and nothing changes"
N_ONE_WRONG="two names, one of them wrong, is refused by the database itself, and nothing changes"
N_PRINTED="the command it printed, run as printed, deletes the login, the shop and the kitchen — with what the kitchen uses and told Wera, a code nobody used, its follows, its whole loyalty card and its promotions, its follower keeping its name"
N_APOSTROPHE="a kitchen's name with an apostrophe, typed in another case and spacing, deletes it"
N_SHOP_ALONE="a shop alone and one --shop, as before this row, deletes both"
N_COOWNER="a co-owner needs no name: her login goes, the shop stays, her name stays on it"
N_NOTHING="an account with no business goes with no name, its email typed in capitals — her follows, the kitchen she followed that left, her card, her reward and her phone's code with it, her stamp staying, nobody's"
N_HELPER="a kitchen's helper needs no name: her login goes, the kitchen stays, her name stays on her ended membership, the code she joined with goes"
K_NOBODY="the kitchen's runbook: an email with no account is refused, and nothing changes"
K_ASKED="no kitchen named: her two kitchens listed, never her shop, and nothing changes"
K_SHOP="her shop's name is no kitchen's: refused, and nothing changes"
K_ACCENT="her kitchen's name with an accent added: refused — accents count — and nothing changes"
K_PRINTED="the line it printed for one kitchen, run as printed: that kitchen gone with what it uses and told Wera, its follows, its whole loyalty card, its promotions, its helper's membership and its codes, its follower keeping its name; her login, her shop, her other kitchen and the helper's login kept, its own kept, its card holder's card kept, its promotion kept"
K_AGAIN="the same line again: refused — no kitchen of hers is called that any more — and nothing else changes"

# ⚠️ `part` is `all`, `account` or `kitchen`: a broken copy of ONE runbook runs that
# runbook's cases alone — the other runbook is the real file, so its cases could
# only pass again — which keeps the falsifier inside its job's time (`db.yml`;
# measured on `10.5-iii-c`'s first run: every case for every copy was cancelled at
# fifteen minutes with two copies left).
cases() { # account-runbook kitchen-runbook [part]
  book="$1"
  kbook="$2"
  local part="${3:-all}"
  local again args listed
  if [[ "$part" != kitchen ]]; then

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
  check "$N_PRINTED" 0 "Done on the LOCAL database" "users_with $(mail ambas); business_left $s_b; business_left $k_b; servicio_left $k_b; codes_left $k_b; gone_for $u_v $k_b; card_left $k_b; promos_left $k_b" "0 0 0 0 0 1 0 0"

  run "$(mail solo-cocina)" --shop "fonda  d'lupe $tag" --local
  check "$N_APOSTROPHE" 0 "businesses deleted: 1" "users_with $(mail solo-cocina); business_left $k_a" "0 0"

  run "$(mail solo-tienda)" --shop "$shop_c" --local
  check "$N_SHOP_ALONE" 0 "businesses deleted: 1" "users_with $(mail solo-tienda); business_left $s_c" "0 0"

  run "$(mail socia)" --local
  check "$N_COOWNER" 0 "businesses deleted: 0, businesses it left: 1" \
    "users_with $(mail socia); business_left $s_d; sql \"select (count(*) filter (where not is_active and display_name = 'Rehearsal socia'))::text as n from public.workspace_member where workspace_id = '$s_d' and user_id = '$u_d';\" n" "0 1 1"

  run "$(mail nada | tr '[:lower:]' '[:upper:]')" --local
  check "$N_NOTHING" 0 "businesses deleted: 0" "users_with $(mail nada); follows_of $u_f; gone_for $u_f; her_card_rows $u_f; nobodys_stamps $k_g2" "0 0 0 0 1"

  run "$(mail ayudante)" --local
  check "$N_HELPER" 0 "businesses deleted: 0, businesses it left: 1" \
    "users_with $(mail ayudante); business_left $k_g2; sql \"select (count(*) filter (where not is_active and display_name = 'Rehearsal ayudante'))::text as n from public.workspace_member where workspace_id = '$k_g2' and user_id = '$u_h';\" n; joined_with $u_h" "0 1 1 0"
  fi
  if [[ "$part" == account ]]; then return 0; fi

  # --- one kitchen alone, the account kept (`10.5-iii-c`) ---
  local everything="users_with $(mail tres); business_left $k_g; business_left $k_g2; business_left $s_g"

  run_kitchen "$(mail ninguna)" --local
  check "$K_NOBODY" 1 "NOTHING CHANGED: no account has the email" "users_with $(mail ninguna)" "0"

  run_kitchen "$(mail tres)" --local
  listed="$out"
  check "$K_ASKED" 1 "is the ONLY owner of 2 kitchen(s)" "$everything" "1 1 1 1"
  if grep -qF -- "$shop_g" <<<"$listed"; then echo "  FAIL  $K_ASKED (her shop was listed as a kitchen)"; fi

  run_kitchen "$(mail tres)" --kitchen "$shop_g" --local
  check "$K_SHOP" 1 "no kitchen $(mail tres) alone owns is called" "$everything" "1 1 1 1"

  run_kitchen "$(mail tres)" --kitchen "Cocina D'Gabí $tag" --local
  check "$K_ACCENT" 1 "no kitchen $(mail tres) alone owns is called" "$everything" "1 1 1 1"

  # The line the owner would paste for that kitchen, as printed, read the way his
  # shell reads it, handed to the runbook under test.
  again="$(grep -F -- "Gabi $tag" <<<"$listed" | grep -m1 -F -- "D'" | sed 's/^    bash docs\/runbooks\/delete-a-kitchen.sh //')"
  if [[ -z "$again" ]] || ! eval "args=($again)"; then
    out="(no line for the kitchen was printed)"; code=99
  else
    run_kitchen "${args[@]}"
  fi
  check "$K_PRINTED" 0 "Done on the LOCAL database" "$everything; servicio_left $k_g; servicio_left $k_g2; memberships_of $u_h2; users_with $(mail ayudante-gabi); codes_left $k_g; gone_for $u_v $k_g; card_left $k_g; card_of $u_v $k_g2; promos_left $k_g; promos_left $k_g2" "1 0 1 1 0 3 0 1 0 1 0 1 0 2"

  if [[ -n "$again" ]] && eval "args=($again)"; then run_kitchen "${args[@]}"; else out="(no line)"; code=99; fi
  check "$K_AGAIN" 1 "no kitchen $(mail tres) alone owns is called" "$everything" "1 0 1 1"
}

tally() { # cases-output
  local red green
  red="$(grep -c '^  FAIL' <<<"$1")"
  green="$(grep -c '^  ok' <<<"$1")"
  echo "$red $green"
}

if [[ -z "$mode" ]]; then
  fixtures || { echo "could not make the fixtures (above) — is \`supabase start\` up, with the migrations applied?" >&2; exit 2; }
  result="$(cases "$runbook" "$kitchen_runbook")"
  echo "$result"
  read -r red green <<<"$(tally "$result")"
  echo
  if [[ "$red" -ne 0 ]]; then
    echo "$red of $((red + green)) case(s) failed — delete-an-account.sh or delete-a-kitchen.sh no longer does what its header says."
    exit 1
  fi
  echo "all $green cases passed — the deletion by email, of an account or of one kitchen, refuses what it must and deletes what it names."
  exit 0
fi

# --- --falsify: a broken copy must turn the case that guards it red ---------
bad=0
tried=0
broken() { # name from to must-fail [which: account|kitchen]
  local name="$1" from="$2" to="$3" must_fail="$4" which="${5:-account}"
  local copy="$scratch/broken.sh" real="$runbook"
  [[ "$which" == kitchen ]] && real="$kitchen_runbook"
  tried=$((tried + 1))
  FROM="$from" TO="$to" node -e '
    const fs = require("fs");
    const s = fs.readFileSync(process.argv[1], "utf8");
    fs.writeFileSync(process.argv[2], s.split(process.env.FROM).join(process.env.TO));
  ' "$real" "$copy"
  if cmp -s "$real" "$copy"; then
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
  if [[ "$which" == kitchen ]]; then result="$(cases "$runbook" "$copy" kitchen)"; else result="$(cases "$copy" "$kitchen_runbook" account)"; fi
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
# ⚠️ `10.9b-i` tried "a kitchen she only helps at, counted as hers" (the owner predicate
# dropped) and it stays green: her kitchen has another active owner, so the same clause that
# guards the co-owner keeps it out — that copy is "a co-owned shop counted as hers", above.
# The helper's read-backs (her login gone, her name on her ended membership) are the
# database's, and `supabase/tests/0082_a_helper_publishes.sql` 6.1 is where they can fail.
broken "the printed names left unquoted" \
  "again+=\" --shop '\${name//\$q/\$q\$bs\$q\$q}'\"" 'again+=" --shop ${name}"' "$N_PRINTED"
# `10.5-iii-c`: the kitchen's runbook.
broken "the kitchen's: the first kitchen listed taken, not the one named" \
  '$2 == "yes" { print $1; exit }' '$1 != "" { print $1; exit }' "$K_PRINTED" kitchen
broken "the kitchen's: a shop counted among her kitchens" \
  "where wm.is_active and wm.role = 'owner' and w.kind = 'cocina'" \
  "where wm.is_active and wm.role = 'owner'" "$K_SHOP" kitchen
broken "the kitchen's: the typed name sent unquoted" \
  'typed_sql="${typed//$q/$q$q}"' 'typed_sql="$typed"' "$K_PRINTED" kitchen

echo
if [[ "$bad" -ne 0 ]]; then
  echo "$bad broken copy(ies) were not caught — the rehearsal cannot fail where it should."
  exit 1
fi
echo "all $tried broken copies turned their case red — the rehearsal can still fail."

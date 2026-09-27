#!/usr/bin/env bash
# 6a-ii-a-waste-list-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `6a-ii-a-waste-list-contract.sh` prints "all 21
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what distinguishes the two: two controls that
# must stay green, six that break the CONTRACT the app carries, and three that
# break the DATABASE the check asserts against.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is red
# for the wrong reason is not a falsification, it is a coincidence.*
#
# ⚠️⚠️ AND THE CONTRACT FIXTURES MUTATE A **COPY** PASSED IN AS AN ARGUMENT, NEVER
# THE WORKING TREE — `[[falsifier-must-not-mutate-what-the-check-reads]]`. Editing
# `documents.ts` moves only ONE side of the comparison, because the other side is
# a migration; a fixture that edited the CHECK would move both and prove nothing.
#
# ⚠️⚠️ THE THREE THIS FILE EXISTS FOR, AND THEY ARE THE THREE WAYS `0041` GOES
# WRONG WITHOUT ANYTHING ELSE NOTICING:
#
#   * **`D1`, THE VIEW FLIPPED TO `security_invoker = true`.** This is the edit a
#     reader makes to bring `0041` "into line with §2.7", and it is exactly the
#     trap the row was measured out of: the view goes EMPTY for the only person it
#     exists for. The app still typechecks, the suite still passes, and the
#     shopkeeper sees a write-off with no products.
#   * **`D2`, THE TENANCY PREDICATE DROPPED.** A definer view bypasses RLS on
#     every table it touches, so its `where` clause IS its policy — and Postgres
#     will never complain that it is missing. This is the only instrument in the
#     repository that can see it, because `supabase/pgtap/01_rls_coverage.sql`
#     joins `relkind = 'r'` and a view is not a table.
#   * **`D3`, THE COST PUT BACK ON THE VIEW.** The column the owner did NOT trade.
#     `0041` carries no money at all so that no projection of it yields a cost;
#     adding one back is a one-line `create or replace` and reads like a feature.
#
# Run:  supabase start && supabase db reset && bash docs/checks/6a-ii-a-waste-list-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/6a-ii-a-waste-list-contract.sh"
SOURCE="app/src/api/documents.ts"
WASTE="app/src/api/waste.ts"
[[ -r "$CHECK" && -r "$SOURCE" && -r "$WASTE" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE DIRECTORY
# — the coincidence `5b-ii-a`'s harness recorded. There is no `psql` on the
# owner's Mac, so `docker exec` is the only way in ([[no-psql-on-this-machine]]).
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi
sql() { docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1; }
ask() { docker exec -i "$DB_CONTAINER" psql -U postgres -At -c "$1" 2>/dev/null | tr -d '\r'; }
reload() { ask "notify pgrst, 'reload schema';" >/dev/null; sleep 2; }

# ⚠️⚠️ THE RESTORE IS READ OUT OF THE APPLIED CATALOG AND NEVER REMEMBERED —
# `5g-i`'s harness learned this the expensive way on the day `0040` shipped: a
# harness carrying its own copy does not fail when the thing moves, **it quietly
# puts the old one back.**
VIEW_BODY="$(ask "select pg_get_viewdef('public.waste_reason_line'::regclass);")"
case "$VIEW_BODY" in
  *waste_line*) ;;
  *) echo "FAIL: could not read waste_reason_line out of the catalog, so the three"
     echo "      database fixtures could not be put back. Refusing to drop a view"
     echo "      this harness cannot restore."
     echo "      got: ${VIEW_BODY:0:120}"
     exit 1 ;;
esac
# ⚠️ AND THE PROPERTY IS CONFIRMED PRESENT BEFORE IT IS REMOVED. If the view were
# already invoker, or already missing its predicate, `D1` and `D2` would prove
# nothing and the right answer is to stop rather than to report a pass.
RELOPTS="$(ask "select coalesce(reloptions::text,'') from pg_class where oid = 'public.waste_reason_line'::regclass;")"
case "$RELOPTS" in
  *security_invoker=true*|*security_invoker=on*)
     echo "FAIL: waste_reason_line is ALREADY security_invoker, so it reads empty for"
     echo "      a cashier and D1 would prove nothing. That is the defect, not the fixture."
     exit 1 ;;
esac
case "$VIEW_BODY" in
  *my_workspaces*) ;;
  *) echo "FAIL: the view states no workspace predicate, so the tenancy wall is"
     echo "      ALREADY gone and D2 would prove nothing."
     exit 1 ;;
esac

view_restored=yes
restore_view() {
  [[ "$view_restored" == yes ]] && return 0
  sql <<SQL
drop view if exists public.waste_reason_line;
create view public.waste_reason_line with (security_invoker = false) as
$VIEW_BODY
grant select on public.waste_reason_line to authenticated;
SQL
  view_restored=yes
  reload
  echo "        (waste_reason_line restored from the applied catalog)"
}

TMP="$(mktemp -d)"
# ⚠️ THE RESTORE IS IN A `trap` AND RUNS ON EVERY EXIT PATH, Ctrl-C included: a
# harness that leaves a shopkeeper's list broken is worse than one that fails.
trap 'restore_view; rm -rf "$TMP"' EXIT INT TERM

fixtures=0
bad=0

# $1 label  $2 expectation: a grep -E pattern, or GREEN  $3 contract  $4 waste module
expect() {
  local label="$1" pattern="$2" contract="$3" waste="$4" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$contract" "$waste" 2>&1)"; rc=$?
  if [[ "$pattern" == GREEN ]]; then
    if (( rc == 0 )) && grep -c 'assertion groups passed' <<< "$out" >/dev/null; then
      echo "  ok    $label — green, as it must be"
    else
      echo "FAIL: $label should have been GREEN (exit $rc)"
      sed 's/^/        /' <<< "$out" | tail -12
      bad=$((bad+1))
    fi
    return
  fi
  if (( rc == 0 )); then
    echo "FAIL: $label — the check PASSED on a broken tree, which is the vacuous"
    echo "      green this harness exists to catch."
    bad=$((bad+1))
  elif grep -qE "$pattern" <<< "$out"; then
    echo "  ok    $label — red, and red for the stated reason"
  else
    echo "FAIL: $label — red, but NOT for the reason it is named for."
    echo "      expected to match: $pattern"
    sed 's/^/        /' <<< "$out" | grep -E '^FAIL|^ {6}' | tail -8
    bad=$((bad+1))
  fi
}

# ⚠️ THE COPY IS DIFFED AGAINST THE ORIGINAL AFTERWARDS: "the fixture edited
# nothing" is the anti-vacuity failure one layer in.
# ⚠️⚠️ FOUR SEPARATE `local`s AND NOT ONE — `[[local-expands-before-it-assigns]]`.
mutate() { # label source-path sed-expression -> path
  local label="$1"
  local src="$2"
  local expr="$3"
  local path="$TMP/$label-$(basename "$src")"
  sed "$expr" "$src" > "$path"
  if cmp -s "$path" "$src"; then
    echo "FAIL: fixture $label edited nothing — it proves nothing about the check."
    bad=$((bad+1))
  fi
  echo "$path"
}

echo "=== the control: the tree as it is ==="
expect "C0  the unbroken tree" GREEN "$SOURCE" "$WASTE"

echo
echo "=== the contract: six ways the app can stop describing 0041 ==="

# ⚠️ F1 IS THE ONE A READER ACTUALLY DOES. `waste_line` is the obvious table to
# name; the embed answers a cashier 200 with `[]`, so the screen renders a
# write-off with no products and NOTHING in the app goes red.
F1="$(mutate F1 "$SOURCE" "s/^  waste: 'waste_reason_line',\$/  waste: 'waste_line',/")"
expect "F1  the app embeds waste_line instead of the view" \
  "the base table, which is manager-and-above|is 'waste_line'" "$F1" "$WASTE"

# ⚠️ F2: the second order key removed. Every line still comes back, the read is
# still sorted by name, and the two lines of ONE product under two causes fall
# into heap order — the exact defect `DOCUMENTS_WASTE_LINE_ORDER` exists for.
F2="$(mutate F2 "$SOURCE" "s/^export const DOCUMENTS_WASTE_LINE_ORDER: readonly string\[\] = \['variant_name', 'reason'\];\$/export const DOCUMENTS_WASTE_LINE_ORDER: readonly string[] = ['variant_name'];/")"
expect "F2  one order key where two are needed" \
  "read as 1 key\(s\) — expected 2" "$F2" "$WASTE"

# ⚠️ F3: the two keys SWAPPED. Both are still sent, the request is still a 200,
# and the lines come back grouped by CAUSE rather than by product — which is a
# different screen and would read as a rendering bug for weeks.
F3="$(mutate F3 "$SOURCE" "s/= \['variant_name', 'reason'\];\$/= ['reason', 'variant_name'];/")"
expect "F3  the order keys swapped, so the list groups by cause" \
  "did not sort the product names|ordered the duplicate wrongly|NOT the reverse" "$F3" "$WASTE"

# ⚠️ F4: a money column put back into the app's line list. The view does not have
# it, so this is an immediate `42703` — the app asking for something `0041`
# deliberately does not carry.
F4="$(mutate F4 "$SOURCE" "s/qty_display_unit,reason,variant_name';\$/qty_display_unit,reason,variant_name,line_net::text';/")"
expect "F4  the app asks the view for a money column it does not carry" \
  "was REFUSED|42703" "$F4" "$WASTE"

# ⚠️⚠️ F5: THE PESO FIGURE PUT BACK ON A WRITE-OFF'S HEADER. `waste.total_net`
# EXISTS and a cashier may read it, so this is a 200 and the app renders `$0.00`
# beside the products most likely to spoil — the area-9 ruling of 2026-09-14
# broken with nothing else in the repository able to see it.
F5="$(mutate F5 "$SOURCE" "s/^export const DOCUMENTS_WASTE_HEAD_COLUMNS = 'id,occurred_at,reversal_of,created_by';\$/export const DOCUMENTS_WASTE_HEAD_COLUMNS = 'id,occurred_at,total_net::text,total_tax::text,reversal_of,created_by';/")"
expect "F5  a peso figure back on a write-off's header" \
  "asks for a peso figure" "$F5" "$WASTE"

# ⚠️ F6: the cause dropped from the line list. The list still draws, every
# quantity is right, and the one column that answers *why* is gone — which is the
# whole asset §2.8 says Desperdicio feeds.
F6="$(mutate F6 "$SOURCE" "s/qty_display_unit,reason,variant_name';\$/qty_display_unit,variant_name';/")"
expect "F6  the cause dropped from the line list" \
  "was REFUSED|read as 1 key|did not sort|ordered the duplicate wrongly|expected 4 lines|42703|KeyError|None" "$F6" "$WASTE"

echo
echo "=== the database: three ways 0041 itself can go wrong ==="

# ⚠️⚠️ D1 IS THE FIXTURE THIS WHOLE ROW WAS MEASURED OUT OF, and it is the edit a
# reader makes to bring the view "into line with §2.7". The view goes EMPTY for
# the only person it exists for.
view_restored=no
sql <<SQL
alter view public.waste_reason_line set (security_invoker = true);
SQL
reload
expect "D1  the view flipped to security_invoker = true" \
  "expected 4 lines through the view|the Empleada could not read" "$SOURCE" "$WASTE"
restore_view

# ⚠️⚠️ D2: THE TENANCY PREDICATE DROPPED. A definer view bypasses RLS on every
# table it reads, so this hands every write-off in the database to any signed-in
# user — and nothing in Postgres, and nothing else in this repository, says so.
view_restored=no
sql <<SQL
drop view public.waste_reason_line;
create view public.waste_reason_line with (security_invoker = false) as
  select wl.id, wl.waste_id, wl.workspace_id, wl.location_id, wl.variant_id,
         pv.name as variant_name, wl.reason, wl.qty_base, wl.qty_display,
         wl.qty_display_unit, w.occurred_at
    from public.waste_line wl
    join public.waste w on w.id = wl.waste_id
    join public.product_variant pv on pv.id = wl.variant_id;
grant select on public.waste_reason_line to authenticated;
SQL
reload
expect "D2  the tenancy predicate dropped from a DEFINER view" \
  "LEAKED ACROSS TENANTS" "$SOURCE" "$WASTE"
restore_view

# ⚠️⚠️ D3: THE COST PUT BACK. One column, one `create or replace`, and it reads
# like somebody adding a useful field.
view_restored=no
sql <<SQL
drop view public.waste_reason_line;
create view public.waste_reason_line with (security_invoker = false) as
  select wl.id, wl.waste_id, wl.workspace_id, wl.location_id, wl.variant_id,
         pv.name as variant_name, wl.reason, wl.qty_base, wl.qty_display,
         wl.qty_display_unit, wl.unit_cost_net_per_base, w.occurred_at
    from public.waste_line wl
    join public.waste w on w.id = wl.waste_id
    join public.product_variant pv on pv.id = wl.variant_id
   where wl.workspace_id in (select public.my_workspaces())
     and wl.location_id in (select public.my_locations());
grant select on public.waste_reason_line to authenticated;
SQL
reload
expect "D3  unit_cost_net_per_base put back on the view" \
  "is reachable through waste_reason_line" "$SOURCE" "$WASTE"
restore_view

# ⚠️ AND THE CONTROL AGAIN, AFTER THE RESTORE. A harness that drops a view and
# reports success without re-proving the tree is a harness that could have left
# it dropped — the failure mode that gets a check deleted rather than fixed.
echo
echo "=== the control again, to prove the restore actually restored ==="
expect "C1  the tree after the view was put back" GREEN "$SOURCE" "$WASTE"

echo
if (( bad > 0 )); then
  echo "$fixtures fixtures ran, $bad did not behave —"
  echo "6a-ii-a-waste-list-contract.sh is not biting what this file says it bites."
  exit 1
fi
# ⚠️ THE ANTI-VACUITY FLOOR FOR THE HARNESS ITSELF: "0 misbehaved" is also what a
# run that executed no fixtures prints.
if (( fixtures < 11 )); then
  echo "FAIL: only $fixtures fixtures ran, expected 11 — this harness proved almost"
  echo "      nothing and was about to report success."
  exit 1
fi
echo "$fixtures fixtures, all as expected (2 green controls, 9 red) —"
echo "6a-ii-a-waste-list-contract.sh has teeth."

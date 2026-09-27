#!/usr/bin/env bash
# 6a-ii-b-waste-correction-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `6a-ii-b-waste-correction-contract.sh` prints
# "all 15 assertion groups passed", and that sentence is ALSO what a check which
# stopped reading anything prints. This is what tells the two apart: one control
# that must stay green, five that break the CONTRACT the app carries, and one
# that breaks the DATABASE the check asserts against.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is red
# for the wrong reason is not a falsification, it is a coincidence.*
#
# ⚠️⚠️ AND THE CONTRACT FIXTURES MUTATE A **COPY** PASSED IN AS AN ARGUMENT, NEVER
# THE WORKING TREE — `[[falsifier-must-not-mutate-what-the-check-reads]]`. The
# check compares the app against a migration; editing the CHECK would move both
# sides and prove nothing.
#
# ⚠️⚠️ THE TWO THIS FILE EXISTS FOR, BECAUSE THEY ARE THE TWO THAT GO WRONG
# SILENTLY:
#
#   * **`F5`, THE CAUSE DROPPED FROM THE LINE LIST.** The list still draws, every
#     quantity is right, the buttons are still there — and `causeValue` is `null`
#     on every write-off, so `Corregir` voids the document and lands her on
#     Desperdicio with the opening question unanswered. A shopkeeper would read
#     that as the app forgetting, and no typecheck or Vitest can see it.
#   * **`D1`, THE EXECUTE GRANT TAKEN OFF `void_transaction`.** `0021:448` grants
#     it to `authenticated`, and the plan believed for a whole day that no path to
#     a void existed at all. A migration that re-issued the function without the
#     grant would leave every `Corregir` and `Eliminar` in the app refusing, with
#     the SQL itself still perfectly correct.
#
# Run:  supabase start && supabase db reset && bash docs/checks/6a-ii-b-waste-correction-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/6a-ii-b-waste-correction-contract.sh"
CORRECTIONS="app/src/api/corrections.ts"
WASTE="app/src/api/waste.ts"
SOURCE="app/src/api/documents.ts"
[[ -r "$CHECK" && -r "$CORRECTIONS" && -r "$WASTE" && -r "$SOURCE" ]] \
  || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE DIRECTORY
# — the coincidence `5b-ii-a`'s harness recorded. There is no `psql` on the
# owner's Mac, so `docker exec` is the only way in ([[no-psql-on-this-machine]]).
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi
ask() { docker exec -i "$DB_CONTAINER" psql -U postgres -At -c "$1" 2>/dev/null | tr -d '\r'; }

# ⚠️⚠️ THE SIGNATURE IS READ OUT OF THE APPLIED CATALOG AND NEVER SPELLED HERE —
# `5g-i`'s harness learned this the expensive way: a harness carrying its own copy
# does not fail when the thing moves, **it quietly puts the wrong one back.**
VOID_SIG="$(ask "select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'void_transaction';")"
case "$VOID_SIG" in
  void_transaction\(*\)) ;;
  *) echo "FAIL: could not read void_transaction out of the catalog, so D1 could not"
     echo "      be put back. Refusing to revoke a grant this harness cannot restore."
     echo "      got: ${VOID_SIG:0:120}"
     exit 1 ;;
esac
# ⚠️ AND THE PROPERTY IS CONFIRMED PRESENT BEFORE IT IS REMOVED. If the grant were
# already gone, D1 would prove nothing and the right answer is to stop rather than
# to report a pass.
VOID_ACL="$(ask "select coalesce(p.proacl::text,'') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'void_transaction';")"
case "$VOID_ACL" in
  *authenticated=X*) ;;
  *) echo "FAIL: authenticated already cannot execute void_transaction, so D1 would"
     echo "      prove nothing. That is the defect, not the fixture."
     echo "      proacl: $VOID_ACL"
     exit 1 ;;
esac

grant_restored=yes
restore_grant() {
  [[ "$grant_restored" == yes ]] && return 0
  ask "grant execute on function public.$VOID_SIG to authenticated;" >/dev/null
  grant_restored=yes
  echo "        (execute on $VOID_SIG granted back to authenticated)"
}

TMP="$(mktemp -d)"
# ⚠️ THE RESTORE IS IN A `trap` AND RUNS ON EVERY EXIT PATH, Ctrl-C included: a
# harness that leaves every correction in the app refusing is worse than one that
# fails.
trap 'restore_grant; rm -rf "$TMP"' EXIT INT TERM

fixtures=0
bad=0

# $1 label  $2 expectation: a grep -E pattern, or GREEN  $3 corrections  $4 waste  $5 documents
expect() {
  local label="$1" pattern="$2" corrections="$3" waste="$4" source="$5" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$corrections" "$waste" "$source" 2>&1)"; rc=$?
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
expect "C0  the unbroken tree" GREEN "$CORRECTIONS" "$WASTE" "$SOURCE"

echo
echo "=== the contract: five ways the app can stop describing the correction ==="

# ⚠️ F1 IS THE ROW ITSELF, PUT BACK. `CORRECTABLE.waste = false` draws no buttons
# on a write-off at all, so every wire assertion below it would be true of a path
# no shopkeeper can reach — the vacuous green ADR-035 §9 refuses.
F1="$(mutate F1 "$CORRECTIONS" "s/^  waste: true,\$/  waste: false,/")"
expect "F1  the app stops offering the two controls on a write-off" \
  "CORRECTABLE.waste is false|draws no control" "$F1" "$WASTE" "$SOURCE"

# ⚠️ F2: THE RPC MISSPELLED. PostgREST resolves a function by NAME and argument
# names, so this is a 404 / `PGRST202` and not a bad call — the 404 `R13` exists
# for, reaching a shopkeeper as a button that does nothing.
F2="$(mutate F2 "$CORRECTIONS" "s/^export const VOID_TRANSACTION = 'void_transaction';\$/export const VOID_TRANSACTION = 'void_transacton';/")"
expect "F2  the RPC's name misspelled by one letter" \
  "refused a cashier her own write-off" "$F2" "$WASTE" "$SOURCE"

# ⚠️ F3: THE PAYLOAD KEY `0019` READS THE CAUSE UNDER, RENAMED. The RPC's own name
# is still right, so this is not a 404 — `record_waste` looks for the key by name,
# finds nothing, and raises `22023`.
F3="$(mutate F3 "$WASTE" "s/^export const WASTE_REASON_KEY = 'reason';\$/export const WASTE_REASON_KEY = 'motivo';/")"
expect "F3  the cause sent under a key 0019 does not read" \
  "record_waste refused" "$CORRECTIONS" "$F3" "$SOURCE"

# ⚠️ F4: THE APP EMBEDS `waste_line` INSTEAD OF THE VIEW. A cashier's embed on the
# base table is HTTP **200 with an empty array** — `waste_line_select` carries a
# manager gate `waste_select` does not — so the document reads back with no lines
# and nothing in the app goes red. `Corregir` would then re-record an EMPTY cart.
F4="$(mutate F4 "$SOURCE" "s/^  waste: 'waste_reason_line',\$/  waste: 'waste_line',/")"
expect "F4  the app embeds the manager-fenced base table" \
  "no lines came back through the view|was REFUSED|42703" "$CORRECTIONS" "$WASTE" "$F4"

# ⚠️⚠️ F5 IS THE ONE THIS FILE EXISTS FOR. The cause dropped from the line list:
# the read is a 200, every quantity is right, and `causeValue` is `null` on every
# write-off — so `Corregir` voids the document and lands her on Desperdicio with
# the opening question unanswered, looking exactly like the app forgetting.
F5="$(mutate F5 "$SOURCE" "s/qty_display_unit,reason,variant_name';\$/qty_display_unit,variant_name';/")"
expect "F5  the cause dropped from the line list, so nothing can be put back" \
  "WASTE_REASONS does not contain|handed back" "$CORRECTIONS" "$WASTE" "$F5"

echo
echo "=== the database: one way 0021 stops being reachable ==="

# ⚠️⚠️ D1: THE EXECUTE GRANT. `0021:448` revokes from `public` and grants to
# `authenticated`; the plan spent a day believing no path to a void existed and
# was wrong. A migration re-issuing the function without the grant leaves the SQL
# correct and every correction in the app refusing — and no pgTAP suite asserts a
# function's ACL.
grant_restored=no
ask "revoke execute on function public.$VOID_SIG from authenticated;" >/dev/null
STILL="$(ask "select coalesce(p.proacl::text,'') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'void_transaction';")"
case "$STILL" in
  *authenticated=X*) echo "FAIL: D1 revoked nothing — proacl is still $STILL"; bad=$((bad+1)) ;;
  *) expect "D1  execute on void_transaction taken off authenticated" \
       "refused a cashier her own write-off" "$CORRECTIONS" "$WASTE" "$SOURCE" ;;
esac
restore_grant

# ⚠️ AND THE CONTROL AGAIN, AFTER THE RESTORE. A harness that broke the database
# and did not put it back would leave every fixture after it red for a reason
# nobody named — so the last word is the tree, green.
echo
echo "=== the control again, after the database was put back ==="
expect "C1  the restored tree" GREEN "$CORRECTIONS" "$WASTE" "$SOURCE"

echo
if (( bad == 0 )); then
  echo "all $fixtures fixture(s) behaved — the check can still fail, and it fails"
  echo "for the reason each fixture is named for."
  exit 0
fi
echo "$bad of $fixtures fixture(s) misbehaved."
exit 1

#!/usr/bin/env bash
# 6b-provider-directory-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `6b-provider-directory-contract.sh` prints "all 23
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what tells the two apart: two controls that must
# stay green, six that break the CONTRACT the app carries, and two that break the
# DATABASE the check asserts against.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is red
# for the wrong reason is not a falsification, it is a coincidence.*
#
# ⚠️⚠️ AND THE CONTRACT FIXTURES MUTATE A **COPY** PASSED IN AS AN ARGUMENT, NEVER
# THE WORKING TREE — [[falsifier-must-not-mutate-what-the-check-reads]]. The check
# compares the app against a migration; editing the CHECK would move both sides and
# prove nothing.
#
# ⚠️⚠️ THE THREE THIS FILE EXISTS FOR, BECAUSE THEY ARE THE THREE THAT GO WRONG
# SILENTLY — and ⚠️ **TWO OF THE ORIGINAL SIX CONTRACT FIXTURES WERE REPLACED
# BECAUSE THE CHECK PASSED ON THEM**, which is this file doing its job on its first
# run rather than failing at it. One added `is_generic` to `INSERT_COLUMNS`, which
# Postgres accepts happily; one made `optional()` return `''` instead of `null`, and
# no shell script can call a TypeScript function. **Both claims are the Vitest
# suite's**, and the check gained an assertion about the CONSEQUENCE of the second
# (Postgres keeps `''` and `null` apart) rather than pretending to see the cause.
# The two fixtures now in their place break something on the wire:
#
#   * **`F2`, THE DIRECTORY COLUMNS ADDED TO COMPRAR'S LIST READ.** Everything
#     works. The directory works BETTER — a phone number on every row without a
#     tap. And every supplier's contact details now reach every phone that opens
#     Comprar, which is a decision about who sees what, made by adding three words
#     to a string. `docs/checks/5g-i-purchase-contract.sh` is the check that would
#     also go red, and this fixture proves THIS one does too, so the boundary is
#     guarded from both sides.
#   * **`F3`, THE COLUMN `Quitar proveedor` SENDS, MISSPELLED.** A 400 `42703` on
#     the one write a shopkeeper cannot undo — and the app would be showing her a
#     confirmation for something that never lands.
#   * **`D2`, THE MANAGER FENCE WIDENED ON `provider_update`.** No assertion
#     anywhere else in this repository can see it. A cashier's PATCH stops coming
#     back empty, `providerWriteErrorMessage`'s `PGRST116` branch becomes dead, and
#     the detail screen is hiding a control from somebody entitled to use it —
#     silently, which is `5e-i`'s recorded argument about the catalog.
#
# Run:  supabase start && supabase db reset && bash docs/checks/6b-provider-directory-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/6b-provider-directory-contract.sh"
CONTRACT="app/src/api/providerDirectory.ts"
LIST="app/src/api/providers.ts"
[[ -r "$CHECK" && -r "$CONTRACT" && -r "$LIST" ]] \
  || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE DIRECTORY —
# the coincidence `5b-ii-a`'s harness recorded. There is no `psql` on the owner's
# Mac, so `docker exec` is the only way in ([[no-psql-on-this-machine]]).
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi
ask() { docker exec -i "$DB_CONTAINER" psql -U postgres -At -c "$1" 2>/dev/null | tr -d '\r'; }

# ⚠️⚠️ THE POLICY BODIES ARE READ OUT OF THE APPLIED CATALOG AND NEVER SPELLED HERE
# — `5g-i`'s harness learned this the expensive way: a harness carrying its own copy
# does not fail when the thing moves, **it quietly puts the wrong one back.**
policy_using() { ask "select coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') from pg_policy pol join pg_class c on c.oid = pol.polrelid where c.relname = 'provider' and pol.polname = '$1';"; }
policy_check() { ask "select coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') from pg_policy pol join pg_class c on c.oid = pol.polrelid where c.relname = 'provider' and pol.polname = '$1';"; }

UPDATE_USING="$(policy_using provider_update)"
UPDATE_CHECK="$(policy_check provider_update)"
SELECT_USING="$(policy_using provider_select)"

# ⚠️ AND EVERY PROPERTY IS CONFIRMED PRESENT BEFORE IT IS REMOVED. If the fence were
# already gone, D2 would prove nothing and the right answer is to stop rather than to
# report a pass.
case "$UPDATE_USING" in
  *has_role*) ;;
  *) echo "FAIL: provider_update's using clause does not mention has_role, so D2"
     echo "      would prove nothing. That is the defect, not the fixture."
     echo "      using: ${UPDATE_USING:0:160}"
     exit 1 ;;
esac
case "$SELECT_USING" in
  *my_workspaces*) ;;
  *) echo "FAIL: provider_select's using clause does not mention my_workspaces, so D1"
     echo "      would prove nothing."
     echo "      using: ${SELECT_USING:0:160}"
     exit 1 ;;
esac
[[ -n "$UPDATE_CHECK" ]] || { echo "FAIL: could not read provider_update's with-check clause"; exit 1; }

policies_restored=yes
restore_policies() {
  [[ "$policies_restored" == yes ]] && return 0
  ask "drop policy if exists provider_select on public.provider;" >/dev/null
  ask "create policy provider_select on public.provider for select to authenticated using ($SELECT_USING);" >/dev/null
  ask "drop policy if exists provider_update on public.provider;" >/dev/null
  ask "create policy provider_update on public.provider for update to authenticated using ($UPDATE_USING) with check ($UPDATE_CHECK);" >/dev/null
  policies_restored=yes
  echo "        (provider_select and provider_update put back as 0002 wrote them)"
}

TMP="$(mktemp -d)"
# ⚠️ THE RESTORE IS IN A `trap` AND RUNS ON EVERY EXIT PATH, Ctrl-C included: a
# harness that left a shop's suppliers writable by anybody is worse than one that
# fails.
trap 'restore_policies; rm -rf "$TMP"' EXIT INT TERM

fixtures=0
bad=0

# $1 label  $2 expectation: a grep -E pattern, or GREEN  $3 contract  $4 list
expect() {
  local label="$1" pattern="$2" contract="$3" list="$4" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$contract" "$list" 2>&1)"; rc=$?
  if [[ "$pattern" == GREEN ]]; then
    if (( rc == 0 )) && grep -c 'assertion groups passed' <<< "$out" >/dev/null; then
      echo "  ok    $label — green, as it must be"
    else
      echo "FAIL: $label should have been GREEN (exit $rc)"
      sed 's/^/        /' <<< "$out" | tail -14
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
    sed 's/^/        /' <<< "$out" | grep -E '^FAIL|^ {6}' | tail -10
    bad=$((bad+1))
  fi
}

# ⚠️ THE COPY IS DIFFED AGAINST THE ORIGINAL AFTERWARDS: "the fixture edited
# nothing" is the anti-vacuity failure one layer in.
# ⚠️⚠️ THREE SEPARATE `local`s AND NOT ONE — [[local-expands-before-it-assigns]].
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
expect "C0  the unbroken tree" GREEN "$CONTRACT" "$LIST"

echo
echo "=== the contract: six ways the app can stop describing this table ==="

# ⚠️ F1: A DETAIL COLUMN DROPPED. The read is still a 200 and the OTHER columns are
# all there, so nothing in the app goes red — the detail screen simply draws an
# empty box where the supplier's phone number is, on the one screen in this app
# where that number is written down.
F1="$(mutate F1 "$CONTRACT" "s/^  'id,name,is_generic,is_active,contact_name,phone,address_line1';\$/  'id,name,is_generic,is_active,contact_name,address_line1';/")"
expect "F1  the phone dropped from the detail read" \
  "does not ask for: phone|Proveedores draws all three" "$F1" "$LIST"

# ⚠️⚠️ F2 IS THE ONE THIS FILE EXISTS FOR, AND IT IS A CHANGE SOMEBODY WOULD MAKE ON
# PURPOSE. Adding the three directory columns to Comprar's list read puts a phone
# number on every row of the directory with no tap — and puts every supplier's
# contact details on every phone that opens Comprar. That is a decision about who
# sees what, arriving as three words in a string.
F2="$(mutate F2 "$LIST" "s/^export const PROVIDER_COLUMNS = 'id,name,is_generic,is_active';\$/export const PROVIDER_COLUMNS = 'id,name,is_generic,is_active,contact_name,phone,address_line1';/")"
expect "F2  the directory's three columns added to Comprar's list read" \
  "COMPRAR'S LIST READ NOW CARRIES|do not widen it quietly" "$CONTRACT" "$F2"

# ⚠️⚠️ F3 IS THE COLUMN `Quitar proveedor` SENDS, MISSPELLED. PostgREST resolves a
# column by name, so this is a 400 `42703` on the one patch a shopkeeper cannot
# undo — and the app would be showing her a confirmation for a write that never
# lands. ⚠️ This fixture REPLACED one that added `is_generic` to `INSERT_COLUMNS`,
# which the check passed: the database accepts `is_generic: false` happily, so no
# wire assertion can see it and the claim belongs to
# `app/test/api-provider-directory.test.ts`, which does assert the column set
# exactly. **A fixture the check cannot catch is a gap in the fixture, not always a
# gap in the check** — but finding out which is the whole reason this file exists.
F3="$(mutate F3 "$CONTRACT" "s/^export const ACTIVE_PATCH_COLUMNS = 'is_active';\$/export const ACTIVE_PATCH_COLUMNS = 'active';/")"
expect "F3  the retire column misspelled" \
  "retiring an ordinary supplier answered|deactivate the generic supplier|42703" "$F3" "$LIST"

# ⚠️⚠️ F4 IS THE COLUMN A CLEARED CONTACT PATCHES, MISSPELLED — a 400 `42703` on the
# path that REMOVES a wrong phone number, which is the one thing a directory is for
# after adding one. ⚠️ This fixture also replaced an earlier one, and the reason is
# worth keeping: it mutated `optional()` to return `''` instead of `null`, and the
# check passed — because **no shell script can call a TypeScript function.** The
# check now asserts the CONSEQUENCE instead (Postgres keeps `''` and `null` apart on
# `contact_name`, so the decision matters) and the DECISION stays Vitest's. Both
# halves are named in both files so neither is mistaken for the other.
F4="$(mutate F4 "$CONTRACT" "s/^export const CONTACT_PATCH_COLUMNS = 'contact_name,phone,address_line1';\$/export const CONTACT_PATCH_COLUMNS = 'contacto,phone,address_line1';/")"
expect "F4  the cleared-contact column misspelled" \
  "clear contacto|not accepted|42703" "$F4" "$LIST"

# ⚠️ F5: THE WRITE STOPS ASKING FOR THE ROW BACK. This is the assertion that makes
# the UPDATE fence visible at all: `.select().single()` is what turns a cashier's
# 200-with-`[]` into a `PGRST116` an app can act on. With nothing returned, her
# rename reports success and changes nothing.
F5="$(mutate F5 "$CONTRACT" "s/^export const WRITE_RETURNING = 'id';\$/export const WRITE_RETURNING = '';/")"
expect "F5  the write stops asking for the row back" \
  "could not read WRITE_RETURNING|not accepted|zero rows|row back" "$F5" "$LIST"

# ⚠️ F6: THE TABLE MISSPELLED BY ONE LETTER. PostgREST resolves a table by name, so
# this is a 404 on every call — the failure `R13` exists for, and the one a
# typecheck, a bundler and the whole Vitest suite pass straight over.
F6="$(mutate F6 "$CONTRACT" "s/^export const DIRECTORY_TABLE = 'provider';\$/export const DIRECTORY_TABLE = 'providers';/")"
expect "F6  the table's name misspelled by one letter" \
  "not accepted|could not" "$F6" "$LIST"

echo
echo "=== the database: two ways 0002's fences can stop being what the app draws ==="

# ⚠️ D1: `provider_select` NARROWED TO MANAGERS. The directory being open to a
# cashier rests ENTIRELY on that policy having no role in it — Inicio's door carries
# no fence, and `canWriteProviders` hides controls rather than the screen. A
# migration that added a role gate would leave her tapping a door onto an empty page.
policies_restored=no
ask "drop policy if exists provider_select on public.provider;" >/dev/null
ask "create policy provider_select on public.provider for select to authenticated using (public.has_role(workspace_id, 'manager'));" >/dev/null
NARROWED="$(policy_using provider_select)"
case "$NARROWED" in
  *has_role*) expect "D1  provider_select narrowed to managers" \
                "A CASHIER CANNOT READ A SUPPLIER|needs a fence it does not currently have" \
                "$CONTRACT" "$LIST" ;;
  *) echo "FAIL: D1 changed nothing — provider_select is still ${NARROWED:0:80}"; bad=$((bad+1)) ;;
esac
restore_policies

# ⚠️⚠️ D2 IS THE THIRD ONE THIS FILE EXISTS FOR. `provider_update` widened to every
# member: a cashier's PATCH stops coming back empty, so
# `providerWriteErrorMessage`'s `PGRST116` branch is dead code and the detail screen
# is hiding a control from somebody entitled to use it — silently. Nothing else in
# this repository can see a policy at all.
policies_restored=no
ask "drop policy if exists provider_update on public.provider;" >/dev/null
ask "create policy provider_update on public.provider for update to authenticated using (workspace_id in (select public.my_workspaces())) with check (workspace_id in (select public.my_workspaces()));" >/dev/null
WIDENED="$(policy_using provider_update)"
case "$WIDENED" in
  *has_role*) echo "FAIL: D2 changed nothing — provider_update still mentions has_role"; bad=$((bad+1)) ;;
  *) expect "D2  the manager fence widened on provider_update" \
       "A CASHIER RENAMED A SUPPLIER|has_role" "$CONTRACT" "$LIST" ;;
esac
restore_policies

# ⚠️ AND THE CONTROL AGAIN, AFTER THE RESTORE. A harness that broke the database and
# did not put it back would leave every fixture after it red for a reason nobody
# named — so the last word is the tree, green.
echo
echo "=== the control again, after the database was put back ==="
expect "C1  the restored tree" GREEN "$CONTRACT" "$LIST"

echo
if (( bad == 0 )); then
  echo "all $fixtures fixture(s) behaved — the check can still fail, and it fails"
  echo "for the reason each fixture is named for."
  exit 0
fi
echo "$bad of $fixtures fixture(s) misbehaved."
exit 1

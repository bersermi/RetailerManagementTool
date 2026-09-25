#!/usr/bin/env bash
# 5f.5-magnitude-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `5f.5-magnitude-contract.sh` prints "all 10
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what distinguishes the two: EIGHT fixtures —
# one control that must stay green, six that break the CONTRACT, and one that
# breaks the DATABASE.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is red
# for the wrong reason is not a falsification, it is a coincidence* — the rule
# `5b-i-api-contract-falsify.sh` paid for on its first run.
#
# ⚠️⚠️ AND THE LIVE CHECK HAD ALREADY PAID FOR ITSELF BEFORE THIS FILE EXISTED,
# WHICH IS WORTH RECORDING BECAUSE THE DEFECT WAS IN THE APP. `app/src/api/
# magnitude.ts` shipped its first draft with `purchase!inner(id,reversal_of)` —
# the guard reads the id and the reversal link and genuinely nothing else off the
# document — and the first live run answered **400, `42703: column
# purchase_line_purchase_1.occurred_at does not exist`**. PostgREST will only
# order a PARENT by an embedded column that is in the embed's select list. Nothing
# in TypeScript, in Vitest or in `MagnitudeRow` can see that rule, and both
# capture screens would have 400'd on open. **`F4` below is that defect, kept.**
#
# ⚠️⚠️ AND THIS HARNESS PAID FOR ITSELF ON ITS OWN FIRST RUN TOO, IN THE CHECK
# RATHER THAN IN THE APP — THE SHAPE `5g-iii`'s HARNESS RECORDED, ARRIVING AGAIN.
# `F1` came back **red for the wrong reason**: the live check opened with a string
# assertion that `MAGNITUDE_COLUMNS` carries `qty_base::text`, so the fixture died
# on that and **the wire assertion the whole file exists for was never once
# exercised.** The string guard is removed — the live check now measures the type
# that came off PostgREST and nothing else, and the string-level claim lives in
# `app/test/api-magnitude.test.ts` where it belongs. ⚠️ **A green that means *a
# string was present*, dressed as a green that means *the database answered
# correctly*, is this repository's most-repeated defect wearing a check's
# clothes.**
#
# ⚠️⚠️ `F1` AND `F3` ARE THE TWO THIS FILE EXISTS FOR. `F1` drops the `qty_base`
# cast — the claim no string-matching check can make, and the one whose failure is
# SILENT: `parseDecimal` refuses a number argument, `typicalFrom` drops every
# sample, and §2.8's guard says nothing for ever with nothing going red. `F3` is
# the `{ referencedTable }` spelling, which is a no-op on a to-one embed and would
# leave `limit` slicing planner order. **If either goes green, the live check has
# stopped measuring what it was written for.**
#
# Run:  supabase start && supabase db reset && bash docs/checks/5f.5-magnitude-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5f.5-magnitude-contract.sh"
SOURCE="app/src/api/magnitude.ts"
[[ -r "$CHECK" && -r "$SOURCE" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE DIRECTORY
# — the coincidence `5b-ii-a`'s harness recorded. There is no `psql` on the
# owner's Mac, so `docker exec` is the only way in.
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi
sql() { docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1; }
ask() { docker exec -i "$DB_CONTAINER" psql -U postgres -At -c "$1" 2>/dev/null | tr -d '\r'; }

# ⚠️⚠️ THE RESTORE IS READ OUT OF THE APPLIED CATALOG AND NEVER REMEMBERED —
# `5g-i`'s harness learned this the expensive way on the day `0040` shipped: a
# harness carrying its own copy of a policy does not fail when the policy moves,
# **it quietly puts the old one back.**
policy_def() { # table policy -> a create-policy statement
  ask "select format('create policy %I on public.%I for select to %s using (%s);',
                     policyname, tablename, array_to_string(roles, ', '), qual)
         from pg_policies
        where schemaname = 'public' and tablename = '$1' and policyname = '$2';"
}

ORIGINAL_LINE_POLICY="$(policy_def purchase_line purchase_line_select)"
case "$ORIGINAL_LINE_POLICY" in
  "create policy purchase_line_select on public."*"using ("*) ;;
  *) echo "FAIL: could not read purchase_line_select out of pg_policies, so the one"
     echo "      database fixture below could not be put back. Refusing to mutate a"
     echo "      policy this harness cannot restore — an empty restore is a \`drop"
     echo "      policy\` with no \`create\` after it, which reads as a total outage."
     echo "      got: ${ORIGINAL_LINE_POLICY:-<empty>}"
     exit 1 ;;
esac

policies_restored=yes
restore_policies() {
  [[ "$policies_restored" == yes ]] && return 0
  sql <<SQL
drop policy if exists purchase_line_select on public.purchase_line;
$ORIGINAL_LINE_POLICY
SQL
  policies_restored=yes
  echo "        (purchase_line_select restored from the applied catalog)"
}

TMP="$(mktemp -d)"
# ⚠️ THE RESTORE IS IN A `trap` AND RUNS ON EVERY EXIT PATH, Ctrl-C included: a
# harness that leaves a narrowed policy behind makes the tree look broken rather
# than safe, which is the failure that gets a check deleted.
trap 'restore_policies; rm -rf "$TMP"' EXIT INT TERM

fixtures=0
bad=0

# $1 label  $2 expectation: a grep -E pattern, or the word GREEN  $3 contract path
expect() {
  local label="$1" pattern="$2" contract="$3" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$contract" 2>&1)"; rc=$?
  if [[ "$pattern" == GREEN ]]; then
    if (( rc == 0 )) && grep -q 'assertion groups passed' <<< "$out"; then
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
# nothing" is the anti-vacuity failure one layer in, and it is how three fixtures
# in this repository were found to have been silently dead.
mutate() { # label sed-expression -> path
  local label="$1" expr="$2" path="$TMP/$1.ts"
  sed "$expr" "$SOURCE" > "$path"
  if cmp -s "$path" "$SOURCE"; then
    echo "FAIL: fixture $label edited nothing — it proves nothing about the check."
    bad=$((bad+1))
  fi
  echo "$path"
}

echo "== the control =="
expect "F0  the contract as shipped" GREEN "$SOURCE"

echo
echo "== the contract, broken six ways =="

# ⚠️⚠️ F1 — THE FIXTURE THIS FILE EXISTS FOR, AND THE ONE WHOSE REAL FAILURE IS
# SILENT. Without `::text` PostgREST sends the quantity as a JSON number, which is
# a double; `parseDecimal` refuses a number argument outright, `typicalFrom`
# catches and drops EVERY sample, and the warning simply never appears. No
# exception reaches a screen, no test goes red, and the shopkeeper is told that
# nothing is unusual — for ever.
expect "F1  the ::text cast dropped from qty_base" \
  'qty_base arrived as (float|int) .* the ::text cast is gone' \
  "$(mutate F1 's/qty_base::text/qty_base/')"

# F2 — the same cast on the price. `@/api/costs` already carries it; this module
# is its second reader, and a contract nobody re-reads is a contract that drifts.
expect "F2  the ::text cast dropped from the price" \
  'unit_price_net_per_base arrived as (float|int) .* the ::text cast is gone' \
  "$(mutate F2 's/unit_price_net_per_base::text/unit_price_net_per_base/')"

# ⚠️⚠️ F3 — THE `{ referencedTable }` TRAP. `postgrest-js` emits
# `purchase.order=occurred_at.desc` for that spelling, which sorts the embedded
# row INSIDE each parent — a no-op on a to-one embed. 200, typechecked, and
# `app/test/api-magnitude.test.ts` can only read the string. ⚠️ **Here it is worse
# than a mis-drawn chart**: the order is what `limit` slices, so the guard's
# *trailing* median would be over an arbitrary 400 lines of the shop's history.
expect "F3  the order spelled as a bare column" \
  'is a bare column rather than' \
  "$(mutate F3 "s/^export const MAGNITUDE_ORDER = 'purchase(occurred_at)';/export const MAGNITUDE_ORDER = 'occurred_at';/")"

# ⚠️⚠️ F4 — THE DEFECT THE LIVE CHECK FOUND IN THE APP ON ITS FIRST RUN, KEPT AS A
# FIXTURE. PostgREST refuses to order a parent by an embedded column that is not
# in the embed's select list. `occurred_at` is the one column in this contract
# that NOTHING reads — it is absent from `MagnitudeRow` on purpose — so a tidying
# pass that trusted the types would delete it and 400 both capture screens.
expect "F4  occurred_at removed from the embed (the defect this check found)" \
  'answered 400.*42703' \
  "$(mutate F4 's/purchase!inner(id,occurred_at,reversal_of)/purchase!inner(id,reversal_of)/')"

# F5 — a column nobody reads. C8.8 and `R13`. ⚠️ `tax_rate` is the sharpest one to
# add: it is what would let somebody quietly start comparing GROSS costs here
# while Comprar keeps storing NET.
expect "F5  tax_rate added to the column list" \
  'the line carried .*tax_rate' \
  "$(mutate F5 's/variant_id,qty_base::text/variant_id,tax_rate::text,qty_base::text/')"

# ⚠️⚠️ F6 — THE LIMIT, WHICH IS WHAT MAKES *trailing* MEAN ANYTHING. Set to one,
# the read comes back with a single line out of six and the shape assertion says
# so. This is what proves the number on the wire is the module's and not the
# check's.
expect "F6  the limit narrowed to one" \
  'the read returned 1' \
  "$(mutate F6 's/^export const MAGNITUDE_LIMIT = 400;/export const MAGNITUDE_LIMIT = 1;/')"

echo
echo "== the database, broken one way =="

# ⚠️⚠️ F7 — `0040` PUT BACK THE WAY IT WAS, WHICH IS THE FIXTURE THAT KEEPS §2.8's
# OWN PARAGRAPH TRUE. The ADR's error is *a cashier* mistyping. With the role gate
# restored her read is **200 and an EMPTY ARRAY** — never a 403 — so every median
# is absent, every comparison answers `none`, and the guard is silently dead for
# exactly the person it was written for. **Nothing else in this repository would
# go red.**
policies_restored=no
sql <<'SQL'
drop policy if exists purchase_line_select on public.purchase_line;
create policy purchase_line_select on public.purchase_line
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations())
     and public.has_role(workspace_id, 'manager'));
SQL
expect "F7  the manager gate put back on purchase_line_select" \
  'the Empleada read 0 of the six lines' \
  "$SOURCE"
restore_policies

echo
if [[ "$bad" -eq 0 ]]; then
  echo "all $fixtures fixtures behaved — 5f.5-magnitude-contract.sh is still measuring"
  echo "the wire, the order, the limit and the fence, and not merely running."
  exit 0
fi
echo "$bad of $fixtures fixtures MISBEHAVED."
exit 1

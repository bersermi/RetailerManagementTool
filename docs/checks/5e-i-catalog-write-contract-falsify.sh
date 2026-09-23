#!/usr/bin/env bash
# 5e-i-catalog-write-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `5e-i-catalog-write-contract.sh` prints "all 16
# assertion groups passed", and that sentence is ALSO what a check which stopped
# reading anything prints. This is what distinguishes the two: seventeen fixtures
# — a control that must stay green, six that break the CONTRACT, five that break
# the DATABASE, and one that breaks the READ module, each restored.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is
# red for the wrong reason is not a falsification, it is a coincidence* — the
# rule `5b-i-api-contract-falsify.sh` paid for on its first run.
#
# ⚠️⚠️ AND FIVE FIXTURES MOVE AN APPLIED SCHEMA, BECAUSE THE ASSERTIONS THAT
# MATTER MOST IN THAT CHECK CANNOT BE FALSIFIED FROM THE CLIENT SIDE AT ALL. No
# edit to a TypeScript file can make a policy admit a cashier, and a policy that
# allows MORE breaks no test — which is the exact shape of the defect this task
# exists to guard:
#
#   * `G7`  widens `product_variant_insert` to any member. ⚠️⚠️ THE CENTRAL ONE.
#           `5e-ii` draws the fence rather than discovering it, so the day this
#           policy is widened the app is HIDING a control from somebody who is
#           allowed to use it — and nothing else in the repository would know.
#   * `G8`  widens `price_list_insert` the same way. The subtler half: she can
#           create the product and not price it, or the reverse.
#   * `G9`  drops `price_list_variant_fk`. `WRITE_ORDER`'s order rests entirely
#           on that key; without it a partial write stops being recoverable and
#           starts being garbage, and the check's order assertion goes vacuous.
#   * `G10` narrows `product_variant_name_unique` to per-family. The app's
#           sentence deliberately does NOT say *"en esta familia"*; if the
#           constraint became per-family that sentence would start being wrong
#           in the one direction a shopkeeper cannot work out for herself.
#   * `G11` changes `product_variant.tax_rate`'s DEFAULT to 0.16. The form asks
#           no tax question, so the default is what every product a shop creates
#           carries — and a migration that moved it would have this app quietly
#           charging IVA on beans.
#
# Every one runs the check, expects the named assertion to go red, and PUTS THE
# SCHEMA BACK. ⚠️ Each restore is in a `trap` and runs on every exit path,
# Ctrl-C included: a harness that leaves a WIDENED policy behind makes the tree
# look safe when it is not, which is worse than one that leaves it broken.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5e-i-catalog-write-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5e-i-catalog-write-contract.sh"
SOURCE="app/src/api/catalogWrite.ts"
# ⚠️ THE READ MODULE IS MUTATED TOO, BY `G12` ALONE. The claim that a product
# created with NO price is still on the catalog read lives half in the check and
# half in THIS file's embed, so proving the assertion still has teeth means
# handing the check a `catalog.ts` with an `!inner` in it.
READ_SOURCE="app/src/api/catalog.ts"
[[ -r "$CHECK" && -r "$SOURCE" && -r "$READ_SOURCE" ]] \
  || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE
# DIRECTORY — the coincidence `5b-ii-a`'s harness recorded. The owner's Mac has
# no `psql` of its own, so `docker exec` is the only way in.
DB_CONTAINER="supabase_db_$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' supabase/config.toml | head -1)"
if ! docker exec "$DB_CONTAINER" true 2>/dev/null; then
  FOUND="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -1)"
  [[ -n "$FOUND" ]] && DB_CONTAINER="$FOUND"
fi

psql_do() { docker exec -i "$DB_CONTAINER" psql -U postgres -q >/dev/null 2>&1; }

# ⚠️ QUOTED FROM `0002`: each restore re-creates exactly what that migration
# declared, not "something equivalent".
ORIGINAL_VARIANT_INSERT="create policy product_variant_insert on public.product_variant
  for insert to authenticated
  with check (public.has_role(workspace_id, 'manager'));"
ORIGINAL_PRICE_INSERT="create policy price_list_insert on public.price_list
  for insert to authenticated
  with check (public.has_role(workspace_id, 'manager'));"
ORIGINAL_PRICE_FK="alter table public.price_list
  add constraint price_list_variant_fk
  foreign key (variant_id, workspace_id)
  references public.product_variant (id, workspace_id) on delete cascade;"
ORIGINAL_NAME_UNIQUE="alter table public.product_variant
  add constraint product_variant_name_unique unique (workspace_id, normalized_name);"
ORIGINAL_TAX_DEFAULT="alter table public.product_variant alter column tax_rate set default 0;"

variant_insert_restored=yes
price_insert_restored=yes
price_fk_restored=yes
name_unique_restored=yes
tax_default_restored=yes

restore_variant_insert() {
  [[ "$variant_insert_restored" == yes ]] && return 0
  psql_do <<SQL
drop policy if exists product_variant_insert on public.product_variant;
$ORIGINAL_VARIANT_INSERT
SQL
  variant_insert_restored=yes
  echo "        (product_variant_insert restored to 0002's definition)"
}
restore_price_insert() {
  [[ "$price_insert_restored" == yes ]] && return 0
  psql_do <<SQL
drop policy if exists price_list_insert on public.price_list;
$ORIGINAL_PRICE_INSERT
SQL
  price_insert_restored=yes
  echo "        (price_list_insert restored to 0002's definition)"
}
restore_price_fk() {
  [[ "$price_fk_restored" == yes ]] && return 0
  # ⚠️ THE ORPHAN ROWS THE FIXTURE ITSELF CREATED MUST GO FIRST, or the key
  # cannot be added back and the restore fails silently — which is how a harness
  # leaves the tree broken and blames the next fixture.
  psql_do <<SQL
delete from public.price_list p
 where not exists (select 1 from public.product_variant v
                    where v.id = p.variant_id and v.workspace_id = p.workspace_id);
alter table public.price_list drop constraint if exists price_list_variant_fk;
$ORIGINAL_PRICE_FK
SQL
  price_fk_restored=yes
  echo "        (price_list_variant_fk restored to 0002's definition)"
}
restore_name_unique() {
  [[ "$name_unique_restored" == yes ]] && return 0
  psql_do <<SQL
alter table public.product_variant
  drop constraint if exists product_variant_name_unique;
alter table public.product_variant
  drop constraint if exists product_variant_name_unique_per_family;
delete from public.product_variant a
 using public.product_variant b
 where a.ctid > b.ctid
   and a.workspace_id = b.workspace_id
   and a.normalized_name = b.normalized_name;
$ORIGINAL_NAME_UNIQUE
SQL
  name_unique_restored=yes
  echo "        (product_variant_name_unique restored to 0002's definition)"
}
restore_tax_default() {
  [[ "$tax_default_restored" == yes ]] && return 0
  psql_do <<SQL
$ORIGINAL_TAX_DEFAULT
SQL
  tax_default_restored=yes
  echo "        (product_variant.tax_rate default restored to 0002's 0)"
}
restore_all() {
  restore_variant_insert
  restore_price_insert
  restore_price_fk
  restore_name_unique
  restore_tax_default
}

TMP="$(mktemp -d)"
trap 'restore_all; rm -rf "$TMP"' EXIT INT TERM

fixtures=0
bad=0

# Runs the check against a (possibly mutated) contract and matches its output.
# $1 label  $2 expectation: a grep -E pattern, or the word GREEN  $3 contract path
expect() {
  local label="$1" pattern="$2" contract="$3" read_module="${4:-$READ_SOURCE}" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$contract" "$read_module" 2>&1)"; rc=$?
  if [[ "$pattern" == GREEN ]]; then
    if (( rc == 0 )) && grep -q 'all 16 assertion groups passed' <<< "$out"; then
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
    sed 's/^/        /' <<< "$out" | grep -E '^FAIL|^ +[a-z]' | tail -8
    bad=$((bad+1))
  fi
}

# One copy of the contract with one sed applied. ⚠️ THE COPY IS DIFFED AGAINST
# THE ORIGINAL AFTERWARDS: "the fixture edited nothing" is the anti-vacuity
# failure one layer in, and it is how three fixtures in this repository were
# found to have been silently dead.
mutate() { # label sed-expression [source] -> path
  local label="$1" expr="$2" src="${3:-$SOURCE}" path="$TMP/$1.ts"
  sed "$expr" "$src" > "$path"
  if cmp -s "$path" "$src"; then
    echo "FAIL: fixture $label edited nothing — it proves nothing about the check."
    bad=$((bad+1))
  fi
  echo "$path"
}

echo "— the control —"
expect G0 GREEN "$SOURCE"

echo
echo "— the contract, mutated —"

# ⚠️ G1 IS THE 400 THIS WHOLE FILE EXISTS FOR, ON THE WRITE SIDE: a column
# renamed on either side of the wire compiles, bundles and passes the suite.
# ⚠️ The count is preserved deliberately — a fixture that ADDED or REMOVED a
# column would break the harness's own row builder instead of the assertion.
expect G1 'insert bodies were not accepted|PGRST204' \
  "$(mutate G1 "s/,price_unit_code';/,precio_unidad';/")"

# G2: the same, on the money column. `price_per_base` is what `pricePerBase`
# produces and what `priceCentavos` reads back; a rename breaks both ends.
expect G2 'insert bodies were not accepted|PGRST204' \
  "$(mutate G2 "s/variant_id,location_id,price_per_base/variant_id,location_id,precio/")"

# ⚠️⚠️ G3 IS THE ORDER, AND IT IS THE DELIVERABLE `5e-i`'s ROW CALLS *NOT AN
# IMPLEMENTATION DETAIL*. Swap the variant and the price and the app is posting a
# price for a variant that does not exist yet.
expect G3 'insert bodies were not accepted|23503|22P02|PGRST' \
  "$(mutate G3 "s/= \['product_family', 'product_variant', 'price_list'\]/= ['product_family', 'price_list', 'product_variant']/")"

# ⚠️ G4: the code the FENCE answers with, changed. She is still refused and she
# is told the wrong sentence — the failure this check reports separately from
# "a cashier wrote", because they are different defects.
expect G4 "is refused .* with '42501', and the app maps" \
  "$(mutate G4 "s/^const FORBIDDEN = '42501';/const FORBIDDEN = '42999';/")"

# ⚠️ G5: a sentence keyed on a constraint that does not fire. The shopkeeper gets
# the catch-all instead of the one sentence she can act on, and nothing in
# TypeScript could notice: the key is a string on both sides.
expect G5 'keys on constraints this database never named' \
  "$(mutate G5 "s/  product_variant_name_unique: 'duplicate',/  product_variant_nombre_unico: 'duplicate',/")"

# G6: the contract is unreadable — the vacuity guard at the top of the check.
expect G6 "could not read the catalog write.s contract" \
  "$(mutate G6 's/^export const VARIANT_INSERT_COLUMNS/const VARIANT_INSERT_COLUMNS/')"

echo
echo "— the database, moved —"

# ⚠️⚠️ G7 IS THE FIXTURE THIS WHOLE TASK EXISTS FOR. No client-side edit can
# make a policy admit a cashier, and a policy that admits MORE breaks no test.
variant_insert_restored=no
psql_do <<'SQL'
drop policy if exists product_variant_insert on public.product_variant;
create policy product_variant_insert on public.product_variant
  for insert to authenticated
  with check (workspace_id in (select public.my_workspaces()));
SQL
expect G7 'A CASHIER WROTE TO product_variant' "$SOURCE"
restore_variant_insert
expect G7R GREEN "$SOURCE"

# ⚠️ G8 IS THE SUBTLER HALF: she can price a product she cannot create, or
# create one she cannot price. Half a fence is not a fence.
price_insert_restored=no
psql_do <<'SQL'
drop policy if exists price_list_insert on public.price_list;
create policy price_list_insert on public.price_list
  for insert to authenticated
  with check (workspace_id in (select public.my_workspaces()));
SQL
expect G8 'A CASHIER WROTE TO price_list' "$SOURCE"
restore_price_insert
expect G8R GREEN "$SOURCE"

# ⚠️ G9: the foreign key `WRITE_ORDER` rests on. Without it the order stops
# being a correctness rule and becomes a preference, and a partial write leaves
# a price pointing at nothing.
price_fk_restored=no
psql_do <<'SQL'
alter table public.price_list drop constraint if exists price_list_variant_fk;
SQL
expect G9 'posted before the one it points at was ACCEPTED|price with no variant, was ACCEPTED' "$SOURCE"
restore_price_fk

# ⚠️ G10: the uniqueness narrowed to per-family. `ES.catalog.issues.duplicate`
# deliberately does not say *"en esta familia"* because the constraint is
# shop-wide; the day it stops being, that sentence sends a shopkeeper to change
# the one field that was right.
name_unique_restored=no
psql_do <<'SQL'
alter table public.product_variant drop constraint if exists product_variant_name_unique;
alter table public.product_variant
  add constraint product_variant_name_unique_per_family
  unique (workspace_id, family_id, normalized_name);
SQL
expect G10 'accepted under another family' "$SOURCE"
restore_name_unique

# ⚠️ G11: the default the form never asks about. `VARIANT_INSERT_COLUMNS` omits
# `tax_rate` on purpose, so whatever `0002` defaults is what every product a
# pilot shop creates carries — and this is the only thing that would notice.
tax_default_restored=no
psql_do <<'SQL'
alter table public.product_variant alter column tax_rate set default 0.1600;
SQL
expect G11 'tax_rate came back' "$SOURCE"
restore_tax_default

echo
expect G11R GREEN "$SOURCE"

echo
echo "— the READ module, mutated —"

# ⚠️⚠️ G12 GUARDS THE OWNER'S RULING OF 2026-09-22, AND IT IS THE ONLY FIXTURE
# IN THIS HARNESS THAT TOUCHES THE READ. `5d-i` already proves an unpriced
# variant survives the embed — on a variant its own fixture INSERTED. What
# changed is who makes them: a shopkeeper now deliberately creates products with
# no price, on a form, and an `!inner` would make every one of them vanish off
# Productos the moment he saved it. He would watch it happen and have nothing to
# read from it except that the app lost his product.
expect G12 'was DROPPED by the read|!inner' "$SOURCE" \
  "$(mutate G12 's/product_family(\${FAMILY_COLUMNS}),\${PRICE_TABLE}(/product_family(${FAMILY_COLUMNS}),${PRICE_TABLE}!inner(/' "$READ_SOURCE")"
expect G12R GREEN "$SOURCE"

echo
if (( bad > 0 )); then
  echo "$fixtures fixtures ran, $bad did not behave as recorded."
  exit 1
fi
# ⚠️ RULE 4 AGAIN, ONE LAYER OUT: a harness that ran no fixtures is also silent.
if (( fixtures < 17 )); then
  echo "FAIL: only $fixtures fixtures ran, expected 17."
  exit 1
fi
echo "all $fixtures fixtures behaved as recorded — the check still fails on a renamed"
echo "column, a reordered write, an unmapped refusal code, a constraint the app keys on"
echo "that no longer fires, an unreadable contract, EITHER INSERT POLICY WIDENED TO A"
echo "CASHIER, a dropped foreign key, a narrowed uniqueness, a moved tax default, and an"
echo "!inner embed that would hide every product the owner ruled may have no price."

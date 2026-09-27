#!/usr/bin/env bash
# 6a-i-waste-contract-falsify — can that check still fail?
#
# ⚠️ RULE 4 OF THIS REPOSITORY. `6a-i-waste-contract.sh` prints "all 17 assertion
# groups passed", and that sentence is ALSO what a check which stopped reading
# anything prints. This is what distinguishes the two: one control that must stay
# green, seven that break the CONTRACT the app carries, and one that breaks the
# DATABASE the check asserts against.
#
# ⚠️⚠️ EACH FIXTURE MATCHES THE MESSAGE, NOT THE EXIT CODE. *A fixture that is red
# for the wrong reason is not a falsification, it is a coincidence* — the rule
# `5b-i-api-contract-falsify.sh` paid for on its first run.
#
# ⚠️⚠️ AND THE CONTRACT FIXTURES MUTATE A **COPY** PASSED IN AS AN ARGUMENT, NEVER
# THE WORKING TREE. `6a-i-waste-contract.sh` takes the two module paths as `$1` and
# `$2` for exactly this reason. ⚠️ **That is also the rule
# [[falsifier-must-not-mutate-what-the-check-reads]] obeyed rather than dodged:
# editing the tuple in the app moves only ONE side of the comparison — the database
# is fixed by a migration — so it is a real falsification. The fixture that would
# move BOTH sides is the one that edits the check, and there is none here.
#
# ⚠️⚠️ THE TWO THIS FILE EXISTS FOR:
#
#   * **`F2`, THE ORDER.** `WASTE_REASONS` sorted alphabetically. Every cause is
#     still legal, every write still lands, and the only thing that is wrong is
#     that the picker offers them in an order the database will never sort them
#     into. **Nothing else in this repository can see that**, and a reader tidying
#     a tuple is the likeliest way it happens.
#   * **`F8`, THE COST FENCE.** `waste_line_select`'s role gate dropped, which is
#     the edit somebody would make to "fix" `Lo último` showing a cashier a waste
#     document with no products. It publishes `unit_cost_net_per_base` — what the
#     shop PAID for what it threw away — which `0040` kept manager-and-above **by
#     name** while widening `purchase`. If this goes green, the check has stopped
#     being the thing that makes `6a-ii` a question rather than a patch.
#
# Run:  supabase start && supabase db reset && bash docs/checks/6a-i-waste-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/6a-i-waste-contract.sh"
SOURCE="app/src/api/waste.ts"
CART="app/src/cart/cart.ts"
[[ -r "$CHECK" && -r "$SOURCE" && -r "$CART" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

# ⚠️ THE CONTAINER NAME COMES FROM `supabase/config.toml`, NOT FROM THE DIRECTORY
# — the coincidence `5b-ii-a`'s harness recorded. There is no `psql` on the owner's
# Mac, so `docker exec` is the only way in ([[no-psql-on-this-machine]]).
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

ORIGINAL_LINE_POLICY="$(policy_def waste_line waste_line_select)"
case "$ORIGINAL_LINE_POLICY" in
  "create policy waste_line_select on public."*"using ("*) ;;
  *) echo "FAIL: could not read waste_line_select out of pg_policies, so the one"
     echo "      database fixture below could not be put back. Refusing to mutate a"
     echo "      policy this harness cannot restore — an empty restore is a \`drop"
     echo "      policy\` with no \`create\` after it, which reads as a total outage."
     echo "      got: ${ORIGINAL_LINE_POLICY:-<empty>}"
     exit 1 ;;
esac
# ⚠️ AND THE FENCE IS CONFIRMED PRESENT BEFORE IT IS REMOVED. If `has_role` is not
# in that predicate the tree is already wide open, `F8` would prove nothing, and
# the right answer is to stop rather than to report a pass.
case "$ORIGINAL_LINE_POLICY" in
  *has_role*) ;;
  *) echo "FAIL: waste_line_select carries no has_role predicate, so the cost of"
     echo "      waste is ALREADY readable by every member. F8 would prove nothing."
     echo "      If that is deliberate it is an ADR §2.7 amendment; 0040 kept this"
     echo "      fence manager-and-above by name while widening purchase."
     exit 1 ;;
esac

policies_restored=yes
restore_policies() {
  [[ "$policies_restored" == yes ]] && return 0
  sql <<SQL
drop policy if exists waste_line_select on public.waste_line;
$ORIGINAL_LINE_POLICY
SQL
  policies_restored=yes
  echo "        (waste_line_select restored from the applied catalog)"
}

TMP="$(mktemp -d)"
# ⚠️ THE RESTORE IS IN A `trap` AND RUNS ON EVERY EXIT PATH, Ctrl-C included: a
# harness that leaves a widened cost fence behind is worse than one that fails.
trap 'restore_policies; rm -rf "$TMP"' EXIT INT TERM

fixtures=0
bad=0

# $1 label  $2 expectation: a grep -E pattern, or GREEN  $3 contract  $4 cart
expect() {
  local label="$1" pattern="$2" contract="$3" cart="$4" out rc
  fixtures=$((fixtures+1))
  out="$(bash "$CHECK" "$contract" "$cart" 2>&1)"; rc=$?
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
# nothing" is the anti-vacuity failure one layer in, and it is how three fixtures
# in this repository were found to have been silently dead.
mutate() { # label source-path sed-expression -> path
  # ⚠️⚠️ FOUR SEPARATE `local`s AND NOT ONE, AND THAT IS A BUG THIS HARNESS SHIPPED
  # AND MEASURED ON ITS FIRST RUN. `local a="$1" b="$2" c="$TMP/$(basename "$b")"`
  # does NOT see `b`: bash expands every word on the line BEFORE the `local`
  # builtin performs any assignment, so the command substitution ran with `src`
  # unset. Under `set -u` that printed *src: unbound variable* from the subshell,
  # yielded the EMPTY STRING, and the fixtures still went red — for the right
  # reasons, by luck, because each label kept the paths distinct. ⚠️ **The next two
  # fixtures to share a label prefix would have shared a file**, which is a fixture
  # silently testing the previous one's mutation.
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
expect "F0  the unbroken tree" GREEN "$SOURCE" "$CART"

echo
echo "=== the contract: seven ways the app can stop describing the database ==="

# ⚠️ F1: A SIXTH CAUSE. The likeliest real mistake — somebody adds a reason the
# picker should offer and forgets that `0003:419` is where a reason comes from.
# Every write under it is a 22P02 dead letter, one per loss.
F1="$(mutate F1 "$SOURCE" "s/^  'error de captura',\$/  'error de captura',\n  'se cayó al piso',/")"
expect "F1  a sixth cause the enum has never had" \
  "refused the app's own vocabulary|22P02" "$F1" "$CART"

# ⚠️⚠️ F2: THE ORDER, SORTED. This is the fixture this file exists for. Every cause
# is legal, every write lands, and the picker now offers them in an order the
# database will never sort them into.
cat > "$TMP/sort-order.py" <<'PY'
import re, sys
src = open(sys.argv[1], encoding='utf-8').read()
block = re.search(r"(export const WASTE_REASONS = \[\n)(.*?)(\] as const;)", src, re.S)
lines = sorted(l for l in block.group(2).splitlines() if l.strip())
out = src[:block.start(2)] + "\n".join(lines) + "\n" + src[block.end(2):]
open(sys.argv[2], 'w', encoding='utf-8').write(out)
PY
python3 "$TMP/sort-order.py" "$SOURCE" "$TMP/F2-waste.ts"
fixtures=$((fixtures+0))
if cmp -s "$TMP/F2-waste.ts" "$SOURCE"; then
  echo "FAIL: fixture F2 edited nothing — WASTE_REASONS may already be alphabetical,"
  echo "      in which case assertion 3 is vacuous and says so on its own."
  bad=$((bad+1))
fi
expect "F2  the causes sorted alphabetically — every one legal, the ORDER wrong" \
  "PICKER'S ORDER AND THE DATABASE'S DISAGREE|order is ALPHABETICAL" "$TMP/F2-waste.ts" "$CART"

# ⚠️ F3: THE PAYLOAD KEY MISSPELLED. `0019` looks for `reason` by name; anything
# else is a line with no cause at all, which is 22023 — NOT a 404, because the
# RPC's own name is fine. That distinction is why `R13` puts the key in a module.
F3="$(mutate F3 "$SOURCE" "s/^export const WASTE_REASON_KEY = 'reason';\$/export const WASTE_REASON_KEY = 'waste_reason';/")"
expect "F3  the reason key misspelled — a 22023 and not a 404" \
  "refused the app's own vocabulary|22023" "$F3" "$CART"

# ⚠️ F4: THE PRICE KEY SWAPPED FOR THE PURCHASE SPELLING. `record_waste` follows
# the SALE shape (`MONEY_KIND.waste`), so the net key leaves it with no price at
# all — the same mistake `5h-ii-a`'s harness made on its first run, in reverse.
F4="$(mutate F4 "$CART" "s/^  sell: 'unit_price_gross_per_base',\$/  sell: 'unit_price_net_per_base',/")"
expect "F4  the NET price key on a document anchored gross" \
  "refused the app's own vocabulary|22023|unit_price_gross_per_base is required" "$SOURCE" "$F4"

# ⚠️⚠️ F5: THE UNPRICED POLICY TURNED INTO A GUESS. `UNPRICED_WASTE` set to 1
# instead of 0 means a product nobody priced is written off at one peso a BASE
# unit — a gram of tomato at a peso, which is a thousand pesos a kilo in
# `waste.total_net`. The write still lands, so only the stored figure can see it.
F5="$(mutate F5 "$CART" "s/^export const UNPRICED_WASTE = 0;\$/export const UNPRICED_WASTE = 1;/")"
expect "F5  an unpriced loss valued at a guess instead of at zero" \
  "stored price=|expected both 0" "$SOURCE" "$F5"

# ⚠️ F6: THE TUPLE EMPTIED OF ITS ACCENTED CAUSES, which is what an editor that
# "cleaned up" a file's encoding would leave behind. Assertion 8 exists so that a
# transport mangling UTF-8 is red rather than green — and this proves assertion 8
# is not vacuously satisfied by there being nothing accented to check.
F6="$(mutate F6 "$SOURCE" "s/^  'dañado',\$/  'danado',/")"
expect "F6  an accent stripped from a cause" \
  "refused the app's own vocabulary|22P02|round-tripped|non-ASCII" "$F6" "$CART"

# ⚠️ F7: THE DECLARATION EMPTIED. A `sed` in somebody's refactor that leaves the
# constant with no members. The check must refuse to run rather than report that
# zero causes all worked — the vacuous green this repository has five shapes of.
cat > "$TMP/empty.py" <<'PY'
import re, sys
src = open(sys.argv[1], encoding='utf-8').read()
out = re.sub(r"(export const WASTE_REASONS = \[\n).*?(\] as const;)", r"\1\2", src, flags=re.S)
open(sys.argv[2], 'w', encoding='utf-8').write(out)
PY
python3 "$TMP/empty.py" "$SOURCE" "$TMP/F7-waste.ts"
if cmp -s "$TMP/F7-waste.ts" "$SOURCE"; then
  echo "FAIL: fixture F7 edited nothing."
  bad=$((bad+1))
fi
expect "F7  WASTE_REASONS emptied — the check must refuse, not report five passes" \
  "could not read the waste contract|read only [0-9]+ cause" "$TMP/F7-waste.ts" "$CART"

echo
echo "=== the database: the cost fence this whole split rests on ==="

# ⚠️⚠️ F8: `waste_line_select`'s ROLE GATE DROPPED. This is the migration somebody
# would write to "fix" a cashier seeing a waste document with no products — and it
# publishes what the shop PAID for what it threw away. `0003:584` explains the
# asymmetry, `0040` kept it BY NAME, and `0003:589` names the actual remedy: *"the
# reason-and-quantity view for Desperdicio ships with that screen."*
policies_restored=no
sql <<'SQL'
alter policy waste_line_select on public.waste_line
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));
SQL
expect "F8  the cost-of-waste fence widened to every member" \
  "COST FENCE OPENING|can now read waste_line" "$SOURCE" "$CART"
restore_policies

# ⚠️ AND THE CONTROL AGAIN, AFTER THE RESTORE. A harness that widens a policy and
# reports success without re-proving the tree is a harness that could have left it
# widened — the failure mode that gets a check deleted rather than fixed.
echo
echo "=== the control again, to prove the restore actually restored ==="
expect "F9  the tree after the policy was put back" GREEN "$SOURCE" "$CART"

echo
if (( bad > 0 )); then
  echo "$fixtures fixtures ran, $bad did not behave —"
  echo "6a-i-waste-contract.sh is not biting what this file says it bites."
  exit 1
fi
# ⚠️ THE ANTI-VACUITY FLOOR FOR THE HARNESS ITSELF: "0 misbehaved" is also what a
# run that executed no fixtures prints.
if (( fixtures < 10 )); then
  echo "FAIL: only $fixtures fixtures ran, expected 10 — this harness proved almost"
  echo "      nothing and was about to report success."
  exit 1
fi
echo "$fixtures fixtures, all as expected (2 green controls, 8 red) —"
echo "6a-i-waste-contract.sh has teeth."

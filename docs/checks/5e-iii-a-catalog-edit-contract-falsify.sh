#!/usr/bin/env bash
# 5e-iii-a-catalog-edit-contract-falsify — can the contract check FAIL?
#
# WHY THIS EXISTS. Rule 4 of this repository: a green run proves nothing until
# something has proved the check can go red, and for the stated reason rather than
# by accident. `5e-iii-a-catalog-edit-contract.sh` talks to a real database, so
# every one of its assertions is conditional on a round trip — which is exactly
# the shape that reports success when it has asserted nothing.
#
# ⚠️⚠️ AND THE ASSERTION THAT MATTERS MOST IS THE ONE HARDEST TO FALSIFY BY HAND.
# `A CASHIER IS REFUSED` is the only instrument in this repository that can see the
# UPDATE fence, and it is now a claim about TWO shapes: a silent 200-with-`[]` and
# a 406 `PGRST116` through `.single()`. Fixtures `F3` and `F4` move each of those
# codes and watch the check notice.
#
# HOW THE FIXTURES WORK. The check takes its contract file as `$1`, so every
# fixture is a MUTATED COPY of `app/src/api/catalogEdit.ts` — the app is never
# touched and the database is never seeded differently. Each fixture asserts the
# mutation actually changed the file first: a fixture that edited nothing is green
# because the defect was never introduced, which is the false green this whole
# file exists to rule out.
#
# Run:  supabase start && supabase db reset && bash docs/checks/5e-iii-a-catalog-edit-contract-falsify.sh
# Exit: 0 when every fixture behaves as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5e-iii-a-catalog-edit-contract.sh"
SOURCE="app/src/api/catalogEdit.ts"
[[ -r "$CHECK" && -r "$SOURCE" ]] || { echo "FAIL: run me from the repo root"; exit 1; }

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
COPY="$SCRATCH/catalogEdit.ts"

fails=0
ran=0

fresh() { cp "$SOURCE" "$COPY"; }

# sed -i is spelled differently on BSD and GNU, and this runs on the owner's Mac
# as well as on ubuntu-latest — the two-machine trap three scripts here record.
edit() { python3 - "$COPY" "$1" "$2" <<'PY'
import io, sys
path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
s = io.open(path, encoding='utf-8').read()
if old not in s:
    raise SystemExit("MUTATION-ANCHOR-MISSING")
io.open(path, 'w', encoding='utf-8').write(s.replace(old, new, 1))
PY
}

fixture() { # name expect(red|green) needle
  local name="$1" expect="$2" needle="$3"
  ran=$((ran+1))
  if ! cmp -s "$SOURCE" "$COPY" && [[ "$expect" == "green" ]]; then
    : # a green fixture is allowed to be an edited file only when it is the control
  fi
  local out rc
  out="$(bash "$CHECK" "$COPY" 2>&1)"; rc=$?
  if [[ "$expect" == "green" ]]; then
    if (( rc == 0 )); then echo "  ok    [$name] green"; return; fi
    echo "FAIL: [$name] expected green, got $rc"; sed 's/^/        /' <<< "$out" | tail -12
    fails=$((fails+1)); return
  fi
  if (( rc == 0 )); then
    echo "FAIL: [$name] expected RED and the check passed — it is not watching this."
    fails=$((fails+1)); return
  fi
  if grep -qF "$needle" <<< "$out"; then
    echo "  ok    [$name] red on \"$needle\""
  else
    echo "FAIL: [$name] went red for the WRONG REASON — \"$needle\" not in the output."
    echo "      A fixture red for the wrong reason is a coincidence, not a falsification."
    sed 's/^/        /' <<< "$out" | tail -12
    fails=$((fails+1))
  fi
}

mutated() { # assert the edit landed, so a no-op fixture cannot pass as a defect
  if cmp -s "$SOURCE" "$COPY"; then
    echo "FAIL: the mutation changed nothing — the fixture below tests the base file."
    fails=$((fails+1)); return 1
  fi
  return 0
}

echo "═══ 5e-iii-a catalog edit contract"

# --- F0. the control -------------------------------------------------------
fresh
fixture "F0 control, the app unedited" green ""

# --- F1. the edit read stops asking for the day a row started --------------
# ⚠️ WITHOUT `effective_from` THERE IS NO SAME-DAY BRANCH AT ALL: every change
# would take the close-and-open path and the second correction of a morning would
# be refused a zero-length range.
fresh
edit "'id,price_per_base::text,location_id,effective_from,effective_to'" \
     "'id,price_per_base::text,location_id,effective_to'"
mutated && fixture "F1 the edit read forgets effective_from" red "the edit read did not come back as one dated row"

# --- F2. the close patches a column the database does not have -------------
fresh
edit "export const PRICE_CLOSE_COLUMNS = 'effective_to';" \
     "export const PRICE_CLOSE_COLUMNS = 'ends_on';"
mutated && fixture "F2 the close names a column that is not there" red "the ordinary price change did not go through"

# --- F3. ⚠️⚠️ the silent-refusal code moves --------------------------------
# The whole finding of this task: a cashier's UPDATE is not refused, it is
# invisible, and `PGRST116` through `.single()` is the only thing that says so.
fresh
edit "const NO_ROWS = 'PGRST116';" "const NO_ROWS = 'PGRST404';"
mutated && fixture "F3 the app stops recognising a zero-row update" red "the manager fence did not hold"

# --- F4. the insert refusal moves ------------------------------------------
fresh
edit "const FORBIDDEN = '42501';" "const FORBIDDEN = '42999';"
mutated && fixture "F4 the app stops recognising the insert refusal" red "the manager fence did not hold"

# --- F5. the overlap code moves --------------------------------------------
fresh
edit "const OVERLAP = '23P01';" "const OVERLAP = '23P99';"
mutated && fixture "F5 the app stops recognising price_list_no_overlap" red "was not refused as"

# --- F6. the honest catch-all stops covering a check violation -------------
fresh
edit "const REJECTED: readonly string[] = ['23514', '23503'];" \
     "const REJECTED: readonly string[] = ['23503'];"
mutated && fixture "F6 23514 falls out of the catch-all" red "the same-day branch is not what the app is built around"

# --- F7. retirement becomes a column that does not exist -------------------
fresh
edit "export const ACTIVE_PATCH_COLUMNS = 'is_active';" \
     "export const ACTIVE_PATCH_COLUMNS = 'retired';"
mutated && fixture "F7 retirement names a column that is not there" red "deletion and retirement are not what the app is built around"

# --- F8. the two settings are patched under the wrong names ----------------
fresh
edit "export const SETTINGS_PATCH_COLUMNS = 'tax_rate,pack_size';" \
     "export const SETTINGS_PATCH_COLUMNS = 'iva,caja';"
mutated && fixture "F8 the tax rate and pack size are renamed" red "the tax rate and the pack size are not bounded where the app thinks"

# --- F10. ⚠️⚠️ THE FORM'S OWN READ LOSES ITS `::text` — `5e-iii-b` ---------
# ⚠️ THE DEFECT IS INVISIBLE EVERYWHERE ELSE. A bare `numeric` arrives as a JSON
# number, which is a double; `parseDecimal` refuses a number outright, so
# `taxPercentOf` answers `''` and the screen simply draws no `Actual:` line. It
# compiles, it bundles, it passes Vitest, and the only thing that changes is that
# a shopkeeper can no longer see the IVA he is deciding whether to leave alone.
fresh
edit "'id,tax_rate::text,pack_size::text'" "'id,tax_rate,pack_size'"
mutated && fixture "F10 the two set-once figures come back as doubles" red "did not come back as text at their column scales"

# --- F11. the form's read asks for a column the database does not have -----
fresh
edit "'id,tax_rate::text,pack_size::text'" "'id,iva::text,pack_size::text'"
mutated && fixture "F11 the form reads a column that is not there" red "did not come back as text at their column scales"

# --- F9. ⚠️ THE VACUITY CASE — a contract the check cannot read ------------
# ⚠️ IT MUST REFUSE RATHER THAN RUN. A check that cannot find the strings it
# asserts has nothing to assert, and this repository has recorded five shapes of
# the green that produces.
fresh
python3 - "$COPY" <<'PY'
import io, sys
io.open(sys.argv[1], 'w', encoding='utf-8').write('// nothing to see here\n')
PY
mutated && fixture "F9 a contract with no constants in it" red "could not read the catalog edit's contract"

echo
if (( fails == 0 && ran < 12 )); then
  echo "FAIL: only $ran fixtures ran, expected 12 — this harness asserted almost"
  echo "      nothing and was about to report success."
  exit 1
fi
if (( fails == 0 )); then
  echo "all $ran fixtures behaved as recorded — the contract check still fails, for"
  echo "the stated reason, on every defect class it was written for."
  exit 0
fi
echo "$ran fixture(s) ran, $fails did not behave as recorded."
exit 1

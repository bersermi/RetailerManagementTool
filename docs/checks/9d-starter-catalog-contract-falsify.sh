#!/usr/bin/env bash
# ============================================================================
# 9d — proves 9d-starter-catalog-contract.sh can fail, and fails for the reason
# ============================================================================
# Each fixture is a COPY of an app module with one thing broken, handed to the
# check as its argument; the real files are never touched. A fixture passes
# when the check exits non-zero AND its output names the defect — a check red
# for the wrong reason would look the same from the exit code alone.
#
#   bash docs/checks/9d-starter-catalog-contract-falsify.sh   (needs supabase start)
# ============================================================================

set -uo pipefail

CHECK="docs/checks/9d-starter-catalog-contract.sh"
CONTRACT="app/src/api/starterCatalog.ts"
CATALOG="app/src/api/catalog.ts"
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

passed=0
failed=0

fixture() { # name file-to-mutate sed-expression expected-reason-regex
  local name="$1" which="$2" expr="$3" reason="$4"
  local contract="$CONTRACT" catalog="$CATALOG"
  local copy="$SCRATCH/$name.ts"
  sed "$expr" "$which" > "$copy"
  if cmp -s "$copy" "$which"; then
    echo "BROKEN FIXTURE $name: the mutation changed nothing"; failed=$((failed+1)); return
  fi
  [[ "$which" == "$CONTRACT" ]] && contract="$copy" || catalog="$copy"
  local out rc
  out="$(bash "$CHECK" "$contract" "$catalog" 2>&1)"; rc=$?
  if (( rc != 0 )) && grep -Eq "$reason" <<< "$out"; then
    echo "  ok    $name — red, for the reason"; passed=$((passed+1))
  else
    echo "FAIL: $name — rc=$rc, and the output did not match /$reason/:"
    grep -E '^FAIL' <<< "$out" | head -3
    failed=$((failed+1))
  fi
}

fixture wrong-rpc-name "$CONTRACT" \
  "s/^export const IMPORT_CATALOG = 'import_catalog';/export const IMPORT_CATALOG = 'import_catalogue';/" \
  'the import answered 404'
fixture renamed-argument "$CONTRACT" \
  's/^  readonly p_exclude:/  readonly p_excluded:/' \
  'ImportArgs names .*p_excluded'
fixture column-dropped "$CATALOG" \
  's/,is_active,template_code'"'"';/,is_active'"'"';/' \
  'no longer asks for template_code'
fixture template-rpc-renamed "$CONTRACT" \
  "s/^export const CATALOG_TEMPLATE = 'catalog_template';/export const CATALOG_TEMPLATE = 'catalog_templates';/" \
  'anonymous catalog_templates answered 404|the template read: 404'

echo
if (( failed == 0 && passed == 4 )); then
  echo "all 4 fixtures behaved as recorded — the contract check goes red on every defect it names."
  exit 0
fi
echo "$failed of $((passed + failed)) fixtures misbehaved."
exit 1

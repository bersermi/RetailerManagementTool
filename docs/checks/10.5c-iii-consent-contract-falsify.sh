#!/usr/bin/env bash
# 10.5c-iii-consent-contract-falsify — can `10.5c-iii-consent-contract.sh` still fail, and does it fail for
# the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can fail. Each fixture below
# copies an app's `push.ts` (or the runbook), breaks ONE claim in the copy (a function's name, an argument's,
# the version of the sheet's words, a key of her answers, the row *on 1* approves), points the check at it, and
# requires red WITH THE SENTENCE that names that claim: red for the wrong reason is a failure here too. The
# controls, unedited, must be green — Wera Cocina's and Itacate's.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5c-iii-consent-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.5c-iii-consent-contract.sh"
COCINA="cocina/src/api/push.ts"
ITACATE="itacate/src/api/push.ts"
RUNBOOK="docs/runbooks/campaigns.sql"
for f in "$CHECK" "$COCINA" "$ITACATE" "$RUNBOOK"; do
  [[ -r "$f" ]] || { echo "FAIL: run this from the repository root"; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program file [what-the-program-edits: push|runbook]
  local name="$1" want="$2" phrase="$3" program="$4" file="$5" edits="${6:-push}"
  local push="$file" runbook="$RUNBOOK" source copy
  if [[ "$edits" == runbook ]]; then source="$RUNBOOK"; copy="$TMP/$name.sql"; runbook="$copy"
  else source="$file"; copy="$TMP/$name.ts"; push="$copy"; fi
  sed "$program" "$source" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$source"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  local out rc
  out="$(bash "$CHECK" "$push" "$runbook" 2>&1)"; rc=$?
  local got=red; (( rc == 0 )) && got=green
  if [[ "$got" != "$want" ]]; then
    echo "  ✗ $name — expected $want, got $got"
    sed 's/^/        /' <<< "$out" | tail -6
    fail=$((fail+1)); return
  fi
  if [[ "$want" == red ]] && ! grep -qF "$phrase" <<< "$out"; then
    echo "  ✗ $name — red, but for the wrong reason. Wanted: $phrase"
    sed 's/^/        /' <<< "$out" | grep FAIL | head -3
    fail=$((fail+1)); return
  fi
  echo "  ✓ $name — $got"
  pass=$((pass+1))
}

echo "C0  Wera Cocina's file, unedited"
run C0 green "" "" "$COCINA"

echo "C1  her answers read from a misspelt function — Mi cocina never draws Novedades' answer"
run C1 red "my_consents answered 404" \
  "s/^export const MY_CONSENT = 'my_consent';/export const MY_CONSENT = 'my_consents';/" "$COCINA"

echo "C2  the words' argument under another name — PostgREST finds no function, no yes is ever kept"
run C2 red "set_my_consent answered 404" \
  '/^export interface AnswerArgs {/,/^}/s/^  readonly p_words: string;/  readonly p_version: string;/' "$COCINA"

echo "C3  a version the runbook does not approve — the yes refused for ever, the day Novedades turn on"
run C3 red "the runbook approves no words 'cocina-hoja-9' for app 'cocina'" \
  "s/^export const PALABRAS = 'cocina-hoja-1';/export const PALABRAS = 'cocina-hoja-9';/" "$COCINA"

echo "C4  a campaign's tap reported to a misspelt function"
run C4 red "count_campaign_taps answered 404" \
  "s/^export const COUNT_CAMPAIGN_TAP = 'count_campaign_tap';/export const COUNT_CAMPAIGN_TAP = 'count_campaign_taps';/" "$COCINA"

echo "C5  the send under another name — PostgREST finds no function, no tap is counted"
run C5 red "count_campaign_tap answered 404" \
  '/^export interface CampaignTapArgs {/,/^}/s/^  readonly p_send: number;/  readonly p_send_id: number;/' "$COCINA"

echo "C6  her answers under another key — the app reads an answer that is never there"
run C6 red "her answers carried no 'ofertas'" \
  '/^export interface ConsentRow {/,/^}/s/^  readonly promociones: AnswerRow | null;/  readonly ofertas: AnswerRow | null;/' "$COCINA"

echo "C7  an answer's words under another key — Dijiste que sí drawn from nothing"
run C7 red "an answer carried not exactly" \
  '/^export interface AnswerRow {/,/^}/s/^  readonly words: string;/  readonly palabras: string;/' "$COCINA"

echo "I0  Itacate's file, unedited"
run I0 green "" "" "$ITACATE"

echo "I1  Itacate's app under another name — the database knows no such app"
run I1 red "my_consent answered 400" \
  "s/^export const APP = 'itacate';/export const APP = 'itacate_app';/" "$ITACATE"

echo "R1  on 1 approving Itacate's words under another version — Itacate's yes refused for ever"
run R1 red "the runbook approves no words 'itacate-hoja-1' for app 'itacate'" \
  "s/('itacate-hoja-1', 'itacate',/('itacate-hoja-0', 'itacate',/" "$ITACATE" runbook

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 11 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 11."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the consent contract check can still fail, and fails for the stated reason."

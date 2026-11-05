#!/usr/bin/env bash
# 10.5-iv-a-door-contract-falsify — can `10.5-iv-a-door-contract.sh` still fail,
# and does it fail for the reason it states?
#
# A contract check that has never been seen red is a check nobody has shown can
# fail. Each fixture below copies `itacate/src/api/cocinas.ts`, breaks ONE claim in
# the copy — a key at each level of the door's answer, the door's name, a point's
# source — points the check at it, and requires red WITH THE SENTENCE that names
# that claim: red for the wrong reason is a failure here too. The control, unedited,
# must be green.
#
# Run:  supabase start && supabase db reset && bash docs/checks/10.5-iv-a-door-contract-falsify.sh
# Exit: 0 every fixture behaved; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/10.5-iv-a-door-contract.sh"
COCINAS="itacate/src/api/cocinas.ts"
[[ -r "$CHECK" && -r "$COCINAS" ]] || { echo "FAIL: run this from the repository root"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

run() { # name want phrase sed-program
  local name="$1" want="$2" phrase="$3" program="$4"
  local copy="$TMP/$name.ts"
  sed "$program" "$COCINAS" > "$copy"
  if [[ "$program" != "" ]] && cmp -s "$copy" "$COCINAS"; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING: a fixture that edits nothing tests the control twice."
    fail=$((fail+1)); return
  fi
  local out rc
  out="$(bash "$CHECK" "$copy" 2>&1)"; rc=$?
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

echo "C0  the control, unedited"
run C0 green "" ""

echo "C1  the door is misspelt — no kitchen could ever be read"
run C1 red "the door answered a neighbour 404" \
  "s/^export const ON_OFFER_NOW = 'on_offer_now';/export const ON_OFFER_NOW = 'on_offer_today';/"

echo "C2  a kitchen's offers read under a key the door does not write — every kitchen would look quiet"
run C2 red "kitchen A carried no 'offers'" \
  's/^  readonly on_offer: readonly OfferRow\[\] | null;/  readonly offers: readonly OfferRow[] | null;/'

echo "C3  her street's number under another key — Google could not place a kitchen with no point"
run C3 red "A's address carried no 'number'" \
  's/^  readonly street_number: string | null;/  readonly number: string | null;/'

echo "C4  her point's latitude under another key — no kitchen would have a distance"
run C4 red "A's point carried no 'latitude'" \
  's/^  readonly lat: number;/  readonly latitude: number;/'

echo "C5  her cover under another key — every page would wear its default"
run C5 red "A's page carried no 'cover'" \
  's/^  readonly cover_path: string | null;/  readonly cover: string | null;/'

echo "C6  a window's start under another key — no offer could be read, every kitchen quiet"
run C6 red "an offer of A carried no 'start'" \
  's/^  readonly pickup_start: string;/  readonly start: string;/'

echo "C7  a dish's price under another key — no dish could be read"
run C7 red "a line of A carried no 'price'" \
  's/^  readonly unit_price: string;/  readonly price: string;/'

echo "C8  the usual hour under another key — no quiet kitchen would say when she publishes"
run C8 red "A's summary carried no 'hour'" \
  's/^  readonly usual_hour: number | null;/  readonly hour: number | null;/'

echo "C9  a repeated dish's count under another key — what she usually publishes would lose how often"
run C9 red "A's repeated dish carried no 'count'" \
  's/^  readonly times: number;/  readonly count: number;/'

echo "C10 her own pin's source misspelt — a pin of hers would be held to Google's rules"
run C10 red "A's own pin came back under source 'pin', the app knows 'mine'" \
  "s/^export const POINT_SOURCES = \['pin', 'google'\] as const;/export const POINT_SOURCES = ['mine', 'google'] as const;/"

echo "C11 Google's source misspelt — Google's copy would not be known as Google's"
run C11 red "B's point came back under source 'google', the app knows 'Google'" \
  "s/^export const POINT_SOURCES = \['pin', 'google'\] as const;/export const POINT_SOURCES = ['pin', 'Google'] as const;/"

echo "C12 a claim is gone from the file — the check must refuse, not pass"
run C12 red "could not read RepeatRow" '/^export interface RepeatRow {/,/^}/d'

echo
echo "$pass passed, $fail failed."
if (( pass + fail < 13 )); then
  echo "FAIL: only $((pass + fail)) fixtures ran, expected 13."
  exit 1
fi
(( fail == 0 )) || exit 1
echo "the door's contract check can still fail, and fails for the stated reason."

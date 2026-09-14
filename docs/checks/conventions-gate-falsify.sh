#!/usr/bin/env bash
# conventions-gate-falsify — does `conventions-gate.sh` actually have teeth?
#
# ⚠️ WHY THIS ONE IS COMMITTED, WHEN NO OTHER FALSIFICATION HARNESS IN THIS
# REPOSITORY IS. Decided with the owner on 2026-09-13, and it is a deliberate
# break with precedent, so the reasoning is here rather than in a commit message
# nobody will re-read.
#
# Every task from `4a` onwards has falsified its own checks by hand, recorded
# the fixtures as a table in `docs/PLAN.md`, and thrown the harness away. That
# was right for those: a pgTAP suite is falsified once, at the moment it is
# written, and then it is finished.
#
# `conventions-gate.sh` is different in one respect that matters — IT IS NOT
# FINISHED. It is a standing CI gate whose rule set grows: `R10` was added on
# 2026-09-13 after `formatToParts` crashed the app on a phone, and `R11` is
# already expected at `5b.5` when `src/api/` and `src/ui/` arrive. Every one of
# those edits needs the gate re-proved, and re-deriving sixteen fixtures from a
# table of prose costs more than keeping the fixtures.
#
# ⚠️ THE RULE IT SERVES IS RULE 4 OF THIS REPOSITORY: A GUARD NOTHING CAN TURN
# RED IS NOT EVIDENCE. `conventions-gate.sh` reports "all N assertion groups
# passed", and that sentence is also what a gate that stopped reading the files
# would print. This is what distinguishes the two.
#
# HOW IT WORKS. Each fixture is a COPY of the tree with exactly one thing
# broken, and the gate is run against the copy. Nothing here ever writes to the
# working tree. A fixture that turns out to edit nothing is reported as PROVING
# NOTHING rather than passing — the trap `5a-i` recorded, where a fixture whose
# `sed` silently matched no line went green and was counted as evidence.
#
# ⚠️ ONE FIXTURE EXPECTS **GREEN**, AND IT IS THE MOST IMPORTANT ONE. `F13`
# adds a comment naming every banned token at once. The first spelling of the
# gate was RED on it — red on the files that got it right — because this
# codebase documents its traps in prose next to the code that avoids them. A
# guard that fires on the explanation makes deleting the explanation the
# cheapest way to green, and would strip this repository of the comments that
# make it legible.
#
# ⚠️ IDS ARE STABLE AND ARE NOT IN RUN ORDER. `F13` runs last because it is the
# green one; `F14`–`F16` were added after it. The numbers match the fixture
# table in `docs/PLAN.md` under `5a-iv-b`, and renumbering them would break that
# cross-reference for no gain.
#
# Run:  bash docs/checks/conventions-gate-falsify.sh
# Exit: 0 every fixture behaved as expected; 1 otherwise.

set -uo pipefail

# ⚠️ NOT A HARDCODED PATH. The first spelling of this file carried the author's
# own home directory, which is fine in a scratchpad and useless in a repository.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="docs/checks/conventions-gate.sh"

[[ -r "$REPO/$GATE" ]] || { echo "FAIL: cannot read $REPO/$GATE"; exit 1; }

# ⚠️ A TEMP DIRECTORY, NOT A SIBLING OF THIS FILE. A fixture tree inside
# `docs/checks/` would be a broken copy of the app sitting in the repository,
# which `plan-handover.sh` would correctly call a dirty working tree.
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# ⚠️ BSD `sed` WANTS `-i ''` AND GNU `sed` REFUSES IT. This runs on the owner's
# Mac and would run on ubuntu-latest — the same two-machine trap that
# `5a-split-coverage.sh` recorded for `declare -A`, `plan-handover.sh` for
# `mapfile`, and `conventions-gate.sh` for a multibyte bracket expression. Four
# separate scripts here have now hit one version of it.
sedi() {
  if sed --version >/dev/null 2>&1; then sed -i "$@"; else sed -i '' "$@"; fi
}

pass=0
bad=0
ran=0

mk() {
  rm -rf "${WORK:?}"/*
  mkdir -p "$WORK/docs/checks" "$WORK/docs/adr" "$WORK/app"
  cp "$REPO/docs/CONVENTIONS.md" "$WORK/docs/"
  cp "$REPO/docs/PLAN.md"        "$WORK/docs/"
  cp "$REPO/$GATE"               "$WORK/docs/checks/"
  # ⚠️⚠️ docs/adr/ WAS MISSING HERE AND IT KILLED EVERY FIXTURE IN THIS FILE.
  # `conventions-gate.sh` gained a TENTH assertion group on 2026-09-13, when
  # ADR-035 §3 was amended to carry the `5b.5` deferral as its third copy — and
  # that group reads the ADR. This harness never copied it, so the gate could not
  # find the file in the fixture tree, the BASELINE went red, and the harness
  # refuses to run a single fixture when the baseline is red. Both scripts still
  # existed, both were still invoked, and `conventions-gate.sh` still passed on
  # the real tree: nothing was red anywhere, and every falsification of it had
  # silently stopped running.
  #
  # ⚠️ THAT IS THE EXACT DEFECT THE `4.6c` RE-SCOPE RECORDED ABOUT `Z5`, arriving
  # from the same direction — "not an edit to the check, but an edit to the FILE
  # THE CHECK READS", here a check that started reading a NEW file the harness
  # was never told about. Found 2026-09-14 while running the guards after the
  # gross-revenue ruling; it had been dead since the amendment.
  #
  # The whole directory, not the one file, so the next assertion group to read an
  # ADR does not repeat this.
  cp -R "$REPO/docs/adr/."       "$WORK/docs/adr/"
  cp -R "$REPO/app/src"          "$WORK/app/src"
  cp -R "$REPO/app/test"         "$WORK/app/test"
}

# run <id> <expect red|green> <description>
run() {
  local id="$1" expect="$2" desc="$3"
  ran=$((ran+1))

  # ⚠️ THE ANTI-VACUITY GUARD, PER FIXTURE. A `sed` that matched nothing leaves
  # an unbroken copy, the gate goes green, and a fixture expecting green would
  # be COUNTED AS EVIDENCE while having tested nothing at all.
  if diff -r -q "$REPO/app/src" "$WORK/app/src" >/dev/null 2>&1 \
     && diff -r -q "$REPO/app/test" "$WORK/app/test" >/dev/null 2>&1 \
     && diff -q "$REPO/docs/CONVENTIONS.md" "$WORK/docs/CONVENTIONS.md" >/dev/null 2>&1 \
     && diff -q "$REPO/docs/PLAN.md" "$WORK/docs/PLAN.md" >/dev/null 2>&1 \
     && diff -q "$REPO/$GATE" "$WORK/docs/checks/conventions-gate.sh" >/dev/null 2>&1; then
    echo "$id  ⚠️ FIXTURE EDITED NOTHING — proves nothing"
    bad=$((bad+1))
    return
  fi

  local out rc got
  out="$(bash "$WORK/$GATE" "$WORK" 2>&1)"; rc=$?
  got=green; (( rc != 0 )) && got=red

  if [[ "$got" == "$expect" ]]; then
    pass=$((pass+1))
    printf '%-4s %-5s %s\n' "$id" "$got" "$desc"
    [[ "$got" == red ]] && grep -m1 '^FAIL' <<< "$out" | sed 's/^/       /'
  else
    bad=$((bad+1))
    printf '%-4s %-5s %s   ⚠️ EXPECTED %s\n' "$id" "$got" "$desc" "$expect"
    sed 's/^/       /' <<< "$out" | head -8
  fi
}

echo "=== baseline: the unbroken tree must be GREEN ==="
mk
if out="$(bash "$WORK/$GATE" "$WORK" 2>&1)"; then
  echo "  the original copy is GREEN"
else
  echo "  ⚠️ BASELINE IS RED — fix the gate or the tree before falsifying."
  sed 's/^/  /' <<< "$out"
  exit 1
fi
echo
echo "=== falsifications: each must turn it RED ==="

mk; sedi "s|from '@/theme/density'|from '../src/theme/density'|" "$WORK/app/test/density.test.ts"
run F1 red "R1 — one test import climbs back out to ../src/"

mk; cp "$WORK/app/test/mxn.test.ts" "$WORK/app/src/format/mxn.test.ts"
run F2 red "R2 — a test file placed beside the source"

mk; sedi "s|from '@/theme/density'|from '@/theme/DensityProvider'|" "$WORK/app/test/density.test.ts"
run F3 red "R2 — a test import that resolves to a .tsx"

mk; sedi "s|<Pendiente what={ES.tabs.comprar} />|<Pendiente what='Recepción de mercancía' />|" "$WORK/app/src/app/(tabs)/comprar.tsx"
run F4 red "R4 — a Spanish sentence typed into a route"

mk; sedi "s|const grouped = PESOS.format(pesos);|const grouped = String(pesos).toFixed(0);|" "$WORK/app/src/format/mxn.ts"
run F5 red "R5 — toFixed, in the one file exempt from the division rule"

mk; sedi "s|return priceSellLine(11_600_000, 1_000, 1_600).gross;|return priceSellLine(11_600_000, 1_000, 1_600).gross / 100;|" "$WORK/app/src/wiring.ts"
run F6 red "R5 — a division by 100 outside src/format/"

mk; sedi "s|fontSize: scale.moneySize|fontSize: 32|" "$WORK/app/src/app/(tabs)/index.tsx"
run F7 red "R6 — a hardcoded fontSize on the one screen that has one"

mk; sedi "s|const HINT =|const DEBUG = process.env.EXPO_PUBLIC_DEBUG;\\
const HINT =|" "$WORK/app/src/lib/env.ts"
run F8 red "R7 — a second module reading process.env"

mk; sedi '1,25d' "$WORK/app/src/auth/guard.ts"
run F9 red "R8 — a module's header block deleted"

# ⚠️ `R11` AND NOT `R10`, AND THE REASON IS ITSELF A FINDING. This fixture
# invented an `R10` that did not exist — and on 2026-09-13 `R10` became real,
# so the fixture started adding a DUPLICATE heading, `sort -u` collapsed it, and
# the fixture went green while claiming to prove the gate could see an unknown
# rule. A falsification can go stale exactly like any other claim.
mk; printf '\n### R11 — a rule nobody enforces\n\n**Checked by:** a person, at review.\n' >> "$WORK/docs/CONVENTIONS.md"
run F10 red "assertion 0 — a rule (R11) added to the page and not to the script"

mk; sedi 's|^\*\*Checked by:\*\* a person, at review. R2 covers its structural half only.|**Checked by:** `docs/checks/conventions-gate.sh`, R3.|' "$WORK/docs/CONVENTIONS.md"
run F11 red "assertion 0 — R3's page claim flipped to 'enforced'"

mk; find "$WORK/app/src" \( -name '*.ts' -o -name '*.tsx' \) | tail -20 | xargs rm -f
run F12 red "anti-vacuity — most of src/ removed, every loop goes quiet"

mk; sedi 's/^| \*\*5b\.5\*\* | /| **5b.5** | ✅ **DONE 2026-10-01** /' "$WORK/docs/PLAN.md"
run F14 red "0b — 5b.5 closed in the plan, the page still sends juniors to it"

mk; sedi 's/^## ⚠️ What this page does not cover yet — a second pass is owed at `5b.5`$/## Everything is covered/' "$WORK/docs/CONVENTIONS.md"
run F15 red "0b — the page drops its deferral while 5b.5 is still open"

mk; sedi 's|const positive = SHAPE.format(1);|const positive = SHAPE.formatToParts(1);|' "$WORK/app/src/format/mxn.ts"
run F16 red "R10 — formatToParts put back: the exact call that crashed the phone"

echo
echo "=== the reverse one: the comment-stripping guard must NOT fire ==="
mk
cat >> "$WORK/app/src/wiring.ts" <<'EOF'

// ⚠️ A COMMENT THAT NAMES EVERY TRAP: NEXT_PUBLIC_, process.env, toFixed(2),
// dividing by / 100, a literal fontSize: 16, and 'una oración en español'.
EOF
run F13 green "a comment naming every banned token stays green"

echo
# ⚠️ THE ANTI-VACUITY GUARD FOR THE HARNESS ITSELF. "0 unexpected" is also what
# a run that executed no fixtures looks like — the eighth check here to need
# one, and the first where the thing that could empty it is this file's own
# fixture list being edited down.
EXPECTED_FIXTURES=16
if (( ran < EXPECTED_FIXTURES )); then
  echo "FAIL: only $ran fixtures ran, expected $EXPECTED_FIXTURES — this harness"
  echo "      proved almost nothing and was about to report success."
  exit 1
fi
if (( bad > 0 )); then
  echo "$pass behaved as expected, $bad did not — conventions-gate.sh is not"
  echo "biting what this file says it bites."
  exit 1
fi
echo "$ran fixtures, all as expected ($((ran - 1)) red, 1 deliberately green) —"
echo "conventions-gate.sh has teeth."

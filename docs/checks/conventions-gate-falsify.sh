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
# 2026-09-13 after `formatToParts` crashed the app on a phone, `R11` — the
# palette — on 2026-09-17 at `5b.6`, and `R12`/`R13` — the data layer — on
# 2026-09-18 at `5b.5`. ⚠️ This header used to forecast
# `R11` for `5b.5` and *"when `src/api/` and `src/ui/` arrive"*, which is not
# what it turned out to be; the forecast is left visible rather than quietly
# corrected, because it is the argument for keeping the fixtures. Every one of
# those edits needs the gate re-proved, and re-deriving thirty fixtures from a
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
# green one; `F14`–`F16` were added after it, `F17`–`F19` after those, `F20`–`F21`
# with assertion 0d, `F22`–`F27` at `5b.5` with `R12`, `R13` and the rewritten
# `0b`, and `F28`–`F30` with the §3 amendment of 2026-09-18 — the first fixtures
# assertion `0c` has ever had. The numbers match the fixture tables in
# `docs/PLAN.md` under `5a-iv-b`, `5b.6` and `5b.5`, and renumbering them would
# break that cross-reference for no gain.
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
  # ⚠️⚠️ `docs/adr/` IS IN THIS LIST AS OF 2026-09-18, AND IT WAS NOT BEFORE —
  # FOUND BY THE FIRST THREE FIXTURES THAT EDIT IT. The gate has read the ADR
  # since 2026-09-13 (assertion 0c); this guard diffed the other five inputs and
  # not that one, so an ADR-only fixture came back "EDITED NOTHING" having edited
  # the file correctly. ⚠️ **It is the same shape as the defect that killed this
  # harness for a day** — the gate gained an input the harness was never told
  # about — arriving one layer in: the harness COPIED the new input and its own
  # vacuity guard still did not watch it. **The rule is that this list and the
  # gate's inputs are the same set**, and the only thing that keeps them so is a
  # fixture that edits each one.
  if diff -r -q "$REPO/app/src" "$WORK/app/src" >/dev/null 2>&1 \
     && diff -r -q "$REPO/app/test" "$WORK/app/test" >/dev/null 2>&1 \
     && diff -r -q "$REPO/docs/adr" "$WORK/docs/adr" >/dev/null 2>&1 \
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

# ⚠️⚠️ RE-ANCHORED 2026-09-25 BY `5g-ii`, AND IT HAD GONE QUIET WITHOUT FAILING.
# This read `<Pendiente what={ES.tabs.comprar} />` — the scaffold that stood behind
# the Comprar tab — and `5g-ii` replaced that file with the real screen, so the
# `sed` matched nothing and the fixture reported `⚠️ FIXTURE EDITED NOTHING`.
# ⚠️ **The gate itself never moved**: R4 was correct the whole time, and only the
# harness went stale. **A fixture pinned to markup another task owns has an expiry
# date nobody wrote down** — the rule `5b.8-i`'s row records about line numbers,
# hit again by a string. ⚠️ The new anchor is a string the SAME task owns.
mk; sedi "s|{ES.buy.genericHint}|{'Recepción de mercancía'}|" "$WORK/app/src/app/(tabs)/comprar.tsx"
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

# ⚠️⚠️ THE MUTATION IS BY PATTERN AND NOT BY LINE NUMBER, AND THE REASON IS A
# SECOND STALE FIXTURE — the same family as `F10` below, found on 2026-09-14.
# This read `sedi '1,25d'`, which deleted the first twenty-five lines of
# `guard.ts` because that was where its header ENDED at the time. `5b-i` added a
# paragraph to that header, the fence moved past line 25, the deletion left the
# closing `// =====` standing, and R8 still saw a header — so the fixture went
# GREEN while claiming to prove the gate could see a header go missing. **A
# fixture pinned to a line number of a file that other tasks edit is a fixture
# with an expiry date nobody wrote down.** The range below is anchored to the
# fence itself and does not care how long the block is.
mk; sedi '/^\/\/ =====/,/^\/\/ =====/d' "$WORK/app/src/auth/guard.ts"
run F9 red "R8 — a module's header block deleted"

# ⚠️⚠️ THE MUTATION IS A RULE NUMBER THE PAGE HAS NOT REACHED YET, COMPUTED
# RATHER THAN TYPED — CHANGED 2026-09-18 AT `5b.5`, AND IT IS THE THIRD TIME
# THIS ONE FIXTURE HAS GONE STALE BY THE SAME MECHANISM.
#
# The first spelling invented an `R10`; `R10` became real on 2026-09-13, so the
# fixture started adding a DUPLICATE heading, `sort -u` collapsed it, and it went
# GREEN while claiming to prove the gate can see an unknown rule. It was rewritten
# to say `R11`; `R11` became real at `5b.6`. It was then rewritten to say `R12`
# — with a comment calling that name *"deliberately absurd"* — and `5b.5` made
# `R12` AND `R13` real four days later. THE COMMENT WAS WRONG ON THE DAY IT WAS
# WRITTEN: `R12` was not absurd, it was simply next.
#
# ⚠️ THE LESSON IS NOT "PICK A HIGHER NUMBER", WHICH IS WHAT WAS TRIED TWICE.
# The mutation now READS the page and invents the number ONE PAST ITS HIGHEST,
# which by construction is a rule neither list in the gate can know about — so
# there is no number for the codebase to claim out from under it, ever. The
# expiry date is removed rather than postponed.
mk
NEXT_RULE="R$(( $(grep -oE '^### R[0-9]+ ' "$WORK/docs/CONVENTIONS.md" \
                 | grep -oE '[0-9]+' | sort -n | tail -1) + 1 ))"
printf '\n### %s — a rule nobody enforces\n\n**Checked by:** a person, at review.\n' \
  "$NEXT_RULE" >> "$WORK/docs/CONVENTIONS.md"
run F10 red "assertion 0 — a rule ($NEXT_RULE) added to the page and not to the script"

mk; sedi 's|^\*\*Checked by:\*\* a person, at review. R2 covers its structural half only.|**Checked by:** `docs/checks/conventions-gate.sh`, R3.|' "$WORK/docs/CONVENTIONS.md"
run F11 red "assertion 0 — R3's page claim flipped to 'enforced'"

# ⚠️⚠️ THIS FIXTURE WENT GREEN ON 2026-09-17 AND IT IS THE THIRD IN THIS FILE
# TO GO STALE THE SAME WAY — after `F9`'s line number and `F10`'s rule name,
# here a COUNT. It read `tail -20`, which removed the last twenty of what were
# then twenty-nine source files and left nine, tripping the gate's `SRC_N < 10`
# floor. `5b.6` added `palette.ts`; thirty files minus twenty is TEN, ten is not
# fewer than ten, the floor did not fire, and the fixture reported success
# having proved that the anti-vacuity guard still... passes.
#
# ⚠️ IT WAS FOUND BY RUNNING THE HARNESS, NOT BY READING IT — and the task that
# broke it is the task that adds ONE FILE. Every future task adds files too.
# `tail -n +4` keeps the first three whatever the tree grows to, so the number
# of files in `app/src` is no longer an input to this fixture.
mk; find "$WORK/app/src" \( -name '*.ts' -o -name '*.tsx' \) | tail -n +4 | xargs rm -f
run F12 red "anti-vacuity — all but three of src/ removed, every loop goes quiet"

# --- 0b's three. ⚠️ THE TASK ID IS NO LONGER `5b.5`, AND THAT IS THE POINT:
# `5b.5` wrote the `src/api/` half and moved the `src/ui/` half to `5h.5`. The
# assertion now reads the id off the page instead of carrying it, so these three
# fixtures survive the NEXT move too — which the two they replace would not have.
mk; sedi 's/^| \*\*5h\.5\*\* | /| **5h.5** | ✅ **DONE 2026-11-01** /' "$WORK/docs/PLAN.md"
run F14 red "0b — the task the page defers to is closed in the plan"

mk; sedi 's/^## ⚠️ What this page does not cover yet.*$/## Everything is covered/' "$WORK/docs/CONVENTIONS.md"
run F15 red "0b — the page drops its deferral while the plan still owes it a pass"

# ⚠️ THE THIRD BRANCH, AND IT IS THE ONE THE OLD HARDCODED SPELLING COULD NOT
# HAVE: page and plan both naming a task, and not the same one.
mk; sedi 's/owed at `5h\.5`/owed at `5z.9`/' "$WORK/docs/CONVENTIONS.md"
run F27 red "0b — the page defers to one task and the plan owes another"

mk; sedi 's|const positive = SHAPE.format(1);|const positive = SHAPE.formatToParts(1);|' "$WORK/app/src/format/mxn.ts"
run F16 red "R10 — formatToParts put back: the exact call that crashed the phone"

# --- R12's two and R13's three, added 2026-09-18 at `5b.5` ----------------
# ⚠️ EVERY MUTATION IS ANCHORED TO A LINE THAT EXISTS AND TO A SPELLING SOMEBODY
# WOULD ACTUALLY WRITE, not to a line number — `F9`'s lesson, three times paid
# for in this file. The two R12 fixtures are the two ways the boundary goes: the
# import, and the call.
# ⚠️⚠️ AND F22's ANCHOR IS THE IMPORT'S *SOURCE*, NOT ITS NAMED LIST, BECAUSE
# THE NARROWER SPELLING WENT DEAD ON 2026-09-18. It read
# `import { useOnboardWorkspace } from '@/api/hooks';`, and `5b-ii-b-2` added a
# second hook to that very line — so the anchor stopped matching, `sedi` edited
# nothing, and the fixture reported ⚠️ FIXTURE EDITED NOTHING. **It was found by
# running this harness, not by reading it**, which is the fifth time in this
# repository that a fixture was disarmed by ordinary work one file away. The rule
# it adds to `F9`'s: ANCHOR ON THE PART OF THE LINE THE NEXT TASK HAS NO REASON
# TO TOUCH. A screen's import LIST grows every time the screen does; the module
# it imports FROM does not.
mk; sedi "s|^\(.*from '@/api/hooks';\)$|import { supabase } from '@/lib/supabase';\\
\1|" "$WORK/app/src/app/(onboarding)/bienvenida.tsx"
run F22 red "R12 — a route imports the client, one import above the hook it should use"

# ⚠️ NOT REDUNDANT WITH F22. A screen can reach the wrapper through `@/api/calls`
# without ever naming `@/lib/supabase`, which is the tidier-looking version of
# the same defect and the one a reviewer waves through.
mk
sedi "s|import { checkShopName } from '@/api/workspace';|import { myWorkspaces } from '@/api/calls';\\
import { checkShopName } from '@/api/workspace';|" "$WORK/app/src/app/(onboarding)/bienvenida.tsx"
run F23 red "R12 — a route importing the wrapper directly, past the hook"

mk; sedi "s|supabase.rpc(ONBOARD_WORKSPACE, onboardArgs(input))|supabase.rpc('onboard_workspace', onboardArgs(input))|" "$WORK/app/src/api/calls.ts"
run F24 red "R13 — the RPC's name typed at the call site instead of the contract"

# ⚠️ THE HALF A NAMED CONSTANT DOES NOT COVER. `PGRST202` is a wrong ARGUMENT
# name as often as a wrong function name, and this spelling keeps the constant.
mk; sedi "s|supabase.rpc(ONBOARD_WORKSPACE, onboardArgs(input))|supabase.rpc(ONBOARD_WORKSPACE, { p_display_name: input.displayName })|" "$WORK/app/src/api/calls.ts"
run F25 red "R13 — the p_ argument names typed at the call site"

mk; sedi "s|.select(WORKSPACE_COLUMNS)|.select('*')|" "$WORK/app/src/api/calls.ts"
run F26 red "R13 — select('*'), which ships every column of the row to a phone"

# --- 0c's three, added 2026-09-18 with the §3 amendment -------------------
# ⚠️⚠️ ASSERTION 0c HAD NO FIXTURE FOR SEVEN DAYS, AND IT IS THE ONE THAT READS
# THE ADR. It was added on 2026-09-13 as the third copy of the deferral, and the
# only thing that ever exercised it was the BASELINE — which is how it was found,
# on 2026-09-14, to have been dead for a day because this harness did not copy
# `docs/adr/` at all. A green baseline is not a falsification: it says the check
# passes on a correct tree, which is what a check that reads nothing also does.
# `5b.5`'s own sentence, paid for again: a new assertion with no fixture is a
# rule nobody has shown can fail.
ADR_MD="docs/adr/ADR-035-target-architecture-postgres-react-native.md"

mk; sedi 's/5h\.5/5x.9/g' "$WORK/$ADR_MD"
run F28 red "0c — the ADR stops naming the task the page defers to"

# ⚠️ THE REVERSION THE AMENDMENT EXISTS TO PREVENT: step 5a's DELIVERABLE LIST
# claiming src/api back, which is the edit a session obeying "the ADR wins"
# would make if the amendment note were ever lost.
mk; sedi 's|   \*\*`CONVENTIONS.md` — one page\*\*. Hiring gates on that file existing, because a|   **`src/api/` wrappers and the `src/ui/` primitives**, plus **`CONVENTIONS.md` — one page**. Hiring gates on that file existing, because a|' "$WORK/$ADR_MD"
run F29 red "0c — step 5a's deliverable list claims src/api back"

# ⚠️ AND THE MARKER ITSELF, which is the half that stops the fixture above from
# being answerable by deleting the amendment wholesale: with no marker, the
# "deliverable list" is the entire block and the grep finds the note's own words.
mk; sedi 's/Amended 2026-09-13/Amended at some point/g' "$WORK/$ADR_MD"
run F30 red "0c — the amendment marker deleted, which makes 0c's region the whole block"

# --- R11's three, added 2026-09-17 at `5b.6` -------------------------------
# ⚠️ THE MUTATIONS ARE ANCHORED TO A STYLE PROP THAT EXISTS, not to a line
# number — `F9`'s lesson, twice paid for in this file.
mk; sedi "s|borderWidth: 1,|borderWidth: 1, borderColor: '#E7E0D2',|" "$WORK/app/src/app/(tabs)/index.tsx"
run F17 red "R11 — a hex typed into a screen, even one copied from the palette"

# ⚠️ NOT REDUNDANT WITH F17, AND THIS IS THE ONE A HEX-ONLY RULE WOULD MISS.
# `'white'` contains no `#`, and it is the spelling a person reaches for first.
#
# ⚠️⚠️ RE-ANCHORED AT `5b-ii-a`, AND IT WAS DEAD WHEN THAT TASK FOUND IT. The
# anchor was a layout pair — `alignItems: 'center', justifyContent: 'center'` —
# which that task's rewrite of Inicio broke apart, so the fixture edited nothing
# and proved nothing. THIRD INSTANCE in this harness: `F10` and `F12` went the
# same way, and the anti-vacuity diff is the only reason any of the three were
# noticed rather than trusted. The new anchor is not a layout line but the
# VIOLATION ITSELF INVERTED — a palette read replaced by a named colour — so it
# can only stop applying on a screen that has stopped reading the palette, which
# is a thing `R11` would already be shouting about.
mk; sedi "s|backgroundColor: PALETTE.fondo|backgroundColor: 'white'|" "$WORK/app/src/app/(tabs)/index.tsx"
run F18 red "R11 — a named CSS colour, which carries no hex at all"

# ⚠️ THE EXEMPTION IS ONE FILE, NOT A DIRECTORY. `src/theme/palette.ts` may
# hold hexes; its neighbour may not, and `density.ts` says in its own header
# that it has no colours in it. A `theme/*` exemption would have made this
# green and left the second palette nobody knows about.
mk; sedi "s|export const MIN_TAP_TARGET = 48;|export const MIN_TAP_TARGET = 48;\
export const FOCUS_RING = '#1C6B4B';|" "$WORK/app/src/theme/density.ts"
run F19 red "R11 — a colour in theme/density.ts, the palette's own neighbour"

# --- 0d's two ---------------------------------------------------------------
# ⚠️ A NEW ASSERTION WITH NO FIXTURE IS A RULE NOBODY HAS SHOWN CAN FAIL, which
# is this header's own sentence. `0d` reads the page's quick-start line — the
# summary a junior takes as the answer when they do not scroll — and it exists
# because that line had never mentioned `R10`, silently, since 2026-09-13.
# ⚠️⚠️ THE MUTATION DROPS THE LAST RULE ON THE LINE, WHATEVER IT IS — CHANGED
# 2026-09-18 AT `5b.5`, WHERE THIS FIXTURE WENT VACUOUS AND THE HARNESS SAID SO.
# It spelled the line out in full, so the task that ADDED `R12` and `R13` to that
# line left the `sed` matching nothing, and the run reported "FIXTURE EDITED
# NOTHING — proves nothing". ⚠️ **That is a FOURTH stale mechanism in this one
# file** — after `F9`'s line number, `F10`'s rule name and `F12`'s file count,
# here a literal copy of the very line the fixture exists to protect. The pattern
# below names no rule at all.
mk; sedi -E 's/( R[0-9]+)( against app\/)/\2/' "$WORK/docs/CONVENTIONS.md"
run F20 red "0d — the page's quick-start line forgets a rule the script enforces"

# ⚠️ AND THE LINE GOING MISSING ALTOGETHER, which is how an assertion that
# greps for one line quietly stops asserting anything at all.
mk; sedi 's|^bash docs/checks/conventions-gate\.sh .*# reads .*$|bash docs/checks/conventions-gate.sh|' "$WORK/docs/CONVENTIONS.md"
run F21 red "0d — the quick-start line loses its '# reads …' claim entirely"

echo
echo "=== the reverse one: the comment-stripping guard must NOT fire ==="
mk
cat >> "$WORK/app/src/wiring.ts" <<'EOF'

// ⚠️ A COMMENT THAT NAMES EVERY TRAP: NEXT_PUBLIC_, process.env, toFixed(2),
// dividing by / 100, a literal fontSize: 16, and 'una oración en español'.
// ⚠️ AND R11'S, added 2026-09-17: backgroundColor: '#A8620A', color: 'white',
// and rgba(0, 0, 0, 0.4) — the amber the canvas carried before it was measured.
// ⚠️ AND R13'S, added 2026-09-18: .rpc('onboard_workspace'), p_display_name,
// and .select('*') — the three spellings of an RPC contract written twice.
EOF
# ⚠️ AND R12'S GOES IN A ROUTE, because R12 is the one rule whose region is a
# DIRECTORY rather than the whole tree: a comment about it in `wiring.ts` would
# prove nothing, since `wiring.ts` is not a screen. A route's header naming the
# modules it must not reach is exactly the prose this must not fire on.
cat >> "$WORK/app/src/app/(tabs)/comprar.tsx" <<'EOF'

// ⚠️ R12'S TRAP, NAMED WHERE THE RULE APPLIES: a screen never writes
// supabase.from('sale_line'), never imports '@/lib/supabase', and never reaches
// '@/api/calls' or '@/api/errors' — it calls a hook.
EOF
run F13 green "a comment naming every banned token stays green"

echo
# ⚠️ THE ANTI-VACUITY GUARD FOR THE HARNESS ITSELF. "0 unexpected" is also what
# a run that executed no fixtures looks like — the eighth check here to need
# one, and the first where the thing that could empty it is this file's own
# fixture list being edited down.
EXPECTED_FIXTURES=30
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

#!/usr/bin/env bash
# conventions-gate — is `docs/CONVENTIONS.md` still describing this codebase?
#
# WHY THIS EXISTS. `CONVENTIONS.md` is a page of CLAIMS ABOUT `app/`, written to
# be obeyed by someone who was not here when they were decided (ADR-035 §3:
# *"hiring gates on that file existing"*). That makes it the largest instance
# yet of the defect this repository has now recorded five times — a claim is
# only as true as the copy the reader happens to open:
#
#   * Facebook inside `C1.4` — a coverage check printed 10/10 across an edit
#     that moved a third of a deliverable elsewhere (2026-09-11).
#   * The `5a-iv` sub-split stated in TWO tables, disagreeing (2026-09-12).
#   * The `5a-iii-b` dashboard gate, closed, still recorded as OWED in FOUR
#     places (2026-09-12).
#   * `docs/HANDBOOK.md`'s "no app yet", nine days stale (2026-09-12, #76).
#   * `README.md`'s "the client does not exist yet" — untouched since kick-off,
#     the FRONT DOOR of the repository, and found by this task.
#
# A conventions page is worse than any of those, because a junior does not read
# it to learn where the build is. They read it to decide how to write the next
# file, and a stale rule is then copied into the code rather than merely
# believed. So every rule on that page that a machine can read is read by this
# script, BY THE SAME NUMBER THE PAGE GIVES IT.
#
# ⚠️ WHAT IT CANNOT DO, SAID HERE RATHER THAN LEFT TO BE DISCOVERED. It cannot
# tell a good convention from a bad one, and it cannot see the rules that are
# about judgement (R3, R9). Those are marked on the page as person-reviewed,
# and assertion 0 below asserts that the page and this script AGREE ABOUT WHICH
# ONES THOSE ARE — because "the check does not cover it" quietly becoming true
# of a rule that used to be covered is the same stale-copy defect wearing a
# different hat.
#
# ⚠️ COMMENTS ARE STRIPPED BEFORE ANY RULE IS APPLIED, and that is not a detail.
# This codebase documents its traps in prose next to the code that avoids them:
# `src/lib/env.ts` contains the string `NEXT_PUBLIC_` in a comment explaining
# why `NEXT_PUBLIC_` must never appear, and `src/format/mxn.ts` contains
# `centavos / 100` in a comment explaining why nothing divides by 100. A guard
# that reads the warning and reports the defect is worse than no guard: it is
# red on the files that got it RIGHT, so the first thing anyone does is delete
# the comment.
#
# ⚠️ NO `mapfile`, NO `declare -A`. macOS ships bash 3.2 and this runs on the
# owner's Mac as well as on ubuntu-latest — the trap `5a-split-coverage.sh` and
# `plan-handover.sh` both recorded, hit again by the next script written.
#
# ⚠️ WHEN YOU ADD OR CHANGE A RULE HERE, RE-FALSIFY IT.
# `docs/checks/conventions-gate-falsify.sh` is the harness — sixteen fixtures,
# fifteen of which must turn this file RED and one of which must leave it GREEN.
# It is the only falsification harness committed in this repository, and its
# header says why. A new rule with no fixture is a rule nobody has shown can
# fail, which is rule 4 of this repository exactly.
#
# Run:  bash docs/checks/conventions-gate.sh
# Exit: 0 every enforced rule holds; 1 otherwise, naming the rule and the file.

set -uo pipefail

ROOT="${1:-.}"
PAGE="$ROOT/docs/CONVENTIONS.md"
SRC="$ROOT/app/src"
TESTS="$ROOT/app/test"

[[ -r "$PAGE" ]] || { echo "FAIL: cannot read $PAGE"; exit 1; }
[[ -d "$SRC"  ]] || { echo "FAIL: cannot read $SRC";  exit 1; }
[[ -d "$TESTS" ]] || { echo "FAIL: cannot read $TESTS"; exit 1; }

# ⚠️ THE TWO LISTS THE PAGE IS CHECKED AGAINST. Adding a rule to the page
# without adding it here is a FAILURE, not an omission — see assertion 0.
ENFORCED="R1 R2 R4 R5 R6 R7 R8 R10 R11"
STATED="R3 R9"

fails=0
ran=0
fail() { echo "FAIL: $*"; fails=$((fails+1)); }
ok()   { echo "  ok    $*"; }
note() { ran=$((ran+1)); }

# Every file a rule may look at. Routes included: they are app code.
src_files()  { find "$SRC" -type f \( -name '*.ts' -o -name '*.tsx' \) | sort; }
test_files() { find "$TESTS" -type f -name '*.ts' | sort; }

# A file with its full-line comments removed. See the header: this is what
# stops the guard firing on the prose that explains the trap.
code() { grep -v -E '^[[:space:]]*(//|\*|/\*)' "$1"; }

# Report one offending line as `path:n: text`, where n is the line number IN
# THE STRIPPED STREAM — useless for jumping to, so the text is printed too.
offend() { echo "        $1: ${2}"; }

# --- 0. the page and this script name the same rules ----------------------
# ⚠️⚠️ THE CROSS-CHECK, AND IT IS THE ONE THAT KEEPS THE OTHERS HONEST. The
# page says of every rule whether a machine reads it. This asserts that claim
# against the machine that would.
note
PAGE_RULES="$(grep -oE '^### R[0-9]+ ' "$PAGE" | tr -d '# ' | sort -u)"
BOTH="$(printf '%s\n%s\n' "$ENFORCED" "$STATED" | tr ' ' '\n' | grep -v '^$' | sort -u)"
if [[ "$PAGE_RULES" != "$BOTH" ]]; then
  fail "docs/CONVENTIONS.md and this script disagree about which rules exist"
  echo "      page:   $(echo "$PAGE_RULES" | tr '\n' ' ')"
  echo "      script: $(echo "$BOTH" | tr '\n' ' ')"
else
  ok "the page and this script name the same rules: $(echo "$BOTH" | tr '\n' ' ')"
fi

# Each rule's own claim about whether a machine reads it must match the lists.
note
mismatch=0
for r in $BOTH; do
  # The "Checked by:" line inside that rule's section.
  claim="$(awk -v rule="### $r " '
    index($0, rule) == 1 { inrule = 1; next }
    /^### R[0-9]+ / { inrule = 0 }
    inrule && index($0, "**Checked by:**") == 1 { print; exit }
  ' "$PAGE")"
  if [[ -z "$claim" ]]; then
    fail "$r has no '**Checked by:**' line on the page — a rule with no stated"
    echo "      instrument is a rule nobody can tell the status of"
    mismatch=$((mismatch+1))
    continue
  fi
  if grep -qF 'conventions-gate.sh' <<< "$claim"; then said=enforced; else said=stated; fi
  if grep -qw "$r" <<< "$ENFORCED"; then real=enforced; else real=stated; fi
  if [[ "$said" != "$real" ]]; then
    fail "$r: the page says it is $said, this script $real it"
    echo "      $claim"
    mismatch=$((mismatch+1))
  fi
done
(( mismatch == 0 )) && ok "every rule's '**Checked by:**' line matches what this script does"

# --- 0b. the deferred second pass has not gone stale ----------------------
# ⚠️⚠️ THE OWNER RULED ON 2026-09-13 — *"keep it in docs/, and do the second
# pass after 5b"* — and a DEFERRAL IS THE MOST PERISHABLE KIND OF CLAIM THERE
# IS. The page tells a junior "there are no src/api or src/ui conventions here
# yet, that is `5b.5`"; the plan carries `5b.5` as an open row. When `5b.5` is
# eventually done, BOTH have to move, and the one that gets forgotten is the
# page — which would then be telling a new hire to go read a task that closed.
#
# This is the same shape as assertion 0 and the same shape as the five stale
# copies in this repository's history: two files, one claim, no instrument.
note
PLAN="$ROOT/docs/PLAN.md"
if [[ ! -r "$PLAN" ]]; then
  fail "cannot read $PLAN — the second-pass cross-check needs it"
else
  PAGE_DEFERS=no; grep -qF 'a second pass is owed at `5b.5`' "$PAGE" && PAGE_DEFERS=yes
  PLAN_ROW="$(grep -m1 -F '| **5b.5** |' "$PLAN")"
  PLAN_OPEN=no
  if [[ -n "$PLAN_ROW" ]] && ! grep -Eq '✅ \*\*DONE|IS DONE AS OF' <<< "$PLAN_ROW"; then
    PLAN_OPEN=yes
  fi
  if [[ "$PAGE_DEFERS" == "$PLAN_OPEN" ]]; then
    if [[ "$PAGE_DEFERS" == yes ]]; then
      ok "the page defers src/api and src/ui to 5b.5, and 5b.5 is open in the plan"
    else
      ok "the second pass is done in the plan and the page no longer defers to it"
    fi
  elif [[ "$PAGE_DEFERS" == yes ]]; then
    fail "the page says the second pass is owed at 5b.5, but docs/PLAN.md has no"
    echo "      open 5b.5 row. Either the task closed and this page was not updated,"
    echo "      or the row was renamed — a junior is being sent to a task that is gone."
  else
    fail "docs/PLAN.md carries 5b.5 as open, but docs/CONVENTIONS.md no longer says"
    echo "      the second pass is owed. The page now reads as complete when it is not,"
    echo "      and src/api / src/ui conventions are what is missing from it."
  fi
fi

# --- 0c. ⚠️⚠️ AND THE ADR IS THE THIRD COPY OF THAT DEFERRAL, AS OF 2026-09-13
#
# The amendment that closed the last plan-vs-ADR disagreement put `5b.5` into
# ADR-035 §3 in its own words. Assertion 0b above watches TWO files; the
# amendment silently made it three, and **the copy nobody checks is the copy
# that goes stale** — six times in this repository's history, five of them
# found by a person reading rather than by a check.
#
# ⚠️ IT ASSERTS THE ADR STILL CARRIES THE DEFERRAL, NOT THAT IT AGREES ABOUT
# OPEN/CLOSED. The ADR records a DECISION — where the obligation lives — and
# decisions are not status; `5b.5` closing does not make `5b.5` stop being
# where §3's "arrive to a pattern" requirement is discharged. What would be a
# defect is the ADR going back to naming `5a`, which is precisely the edit a
# session obeying "the ADR wins" would make if the amendment were ever lost.
note
ADR="$ROOT/docs/adr/ADR-035-target-architecture-postgres-react-native.md"
if [[ ! -r "$ADR" ]]; then
  fail "cannot read $ADR — the third copy of the 5b.5 deferral is unchecked"
else
  ADR_5B5=no;   grep -qF '5b.5' "$ADR" && ADR_5B5=yes
  # §3's step `5a` paragraph must no longer claim src/api and src/ui for itself.
  #
  # ⚠️⚠️ THE FIRST SPELLING OF THIS FIRED ON THE AMENDMENT NOTE. It grepped the
  # whole `5a.` block for `src/api`, and the note explaining that src/api MOVED
  # OUT contains the words `src/api` — so the guard reported the defect by
  # reading the sentence that records the fix. FOURTH TIME IN THIS REPOSITORY,
  # after conventions-gate's own comment-stripping trap and the two row-pattern
  # traps in the plan scripts, all on 2026-09-13. PROSE ABOUT A CHANGE IS INPUT
  # TO THE CHECK THAT WATCHES IT.
  #
  # The real claim is narrower and is the one asserted: step 5a's own
  # DELIVERABLE LIST — everything before the amendment marker — must not name
  # them. The note after the marker may say whatever it needs to.
  ADR_5A_CLAIMS=no
  BLOCK="$(awk '/^5a\. \*\*Foundation\*\*/,/^5b\./' "$ADR")"
  HEAD="$(awk '/Amended 2026-09-13/{exit} {print}' <<< "$BLOCK")"
  if grep -qE 'src/(api|ui)' <<< "$HEAD"; then ADR_5A_CLAIMS=yes; fi
  # And the marker must be there at all, or HEAD is the whole block and the
  # assertion above would pass only because the amendment was deleted wholesale.
  if ! grep -qF 'Amended 2026-09-13' <<< "$BLOCK"; then ADR_5A_CLAIMS=yes; fi
  if [[ "$ADR_5B5" == no ]]; then
    fail "ADR-035 does not mention 5b.5. The 2026-09-13 amendment moved §3's"
    echo "      src/api and src/ui obligation there; without it the ADR reads as"
    echo "      though step 5a still owes them, and CLAUDE.md says the ADR wins."
  elif [[ "$ADR_5A_CLAIMS" == yes ]]; then
    fail "ADR-035 §3's step 5a claims src/api or src/ui again, outside the"
    echo "      amendment note. That is the exact reversion the amendment exists to"
    echo "      prevent — re-opening a question the owner closed on 2026-09-13."
  else
    ok "ADR-035 carries the 5b.5 deferral and step 5a no longer claims src/api or src/ui"
  fi
fi

# --- 0d. the page's quick-start line names the rules this script enforces --
# ⚠️⚠️ ADDED 2026-09-17 AT `5b.6`, AND THE REASON IS THAT THIS TASK FOUND TWO
# STALE CLAIMS ON THE PAGE AT ONCE — both about the check reading them.
#
#   * the header said "Nine rules; seven of them are read by a machine". Ten
#     rules, eight enforced. Stale since `R10` landed on 2026-09-13.
#   * the `bash …` line said "reads R1, R2, R4–R8". It had never mentioned R10.
#
# Neither was checked by anything, because assertion 0 reads the rules' own
# HEADINGS and their "Checked by:" lines — it never read the page's summary of
# itself. A reader who does not scroll takes the summary as the answer.
#
# The English count is now deleted rather than corrected: a number no machine
# reads goes stale again on the next rule. The LIST stays, spelled as bare
# tokens so it can be compared, and this is what compares it.
#
# ⚠️ IT READS ONE BOUNDED LINE, not a region — `plan-handover.sh`'s lesson, and
# the narrowest possible application of it.
note
CMD_LINE="$(grep -m1 -E '^bash docs/checks/conventions-gate\.sh .*# reads ' "$PAGE")"
if [[ -z "$CMD_LINE" ]]; then
  fail "docs/CONVENTIONS.md has no 'bash docs/checks/conventions-gate.sh … # reads …'"
  echo "      line. That line is the page's own summary of what a machine checks,"
  echo "      and it is the first thing a junior reads. Restore it."
else
  CLAIMED="$(sed -e 's/.*# reads //' -e 's/ against app\/.*//' <<< "$CMD_LINE" \
             | tr ' ' '\n' | grep -E '^R[0-9]+$' | sort -u)"
  WANTED="$(echo "$ENFORCED" | tr ' ' '\n' | sort -u)"
  if [[ "$CLAIMED" == "$WANTED" ]]; then
    ok "the page's quick-start line names exactly the enforced rules"
  else
    fail "docs/CONVENTIONS.md's quick-start line and this script disagree about"
    echo "      which rules are enforced."
    echo "      page:   $(echo "$CLAIMED" | tr '\n' ' ')"
    echo "      script: $(echo "$WANTED"  | tr '\n' ' ')"
  fi
fi

# --- R1. imports are written `@/…`, never a climb out of the directory -----
# The alias is declared TWICE — `app/tsconfig.json` for Metro and the
# typecheck, `app/vitest.config.ts` for the suite — and a relative path that
# climbs is the one spelling that can work in one and not the other.
note
r1=0
for f in $(src_files) $(test_files); do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    r1=$((r1+1)); offend "$f" "$line"
  done < <(code "$f" | grep -E "^[[:space:]]*(import|export)[^\"']*from[[:space:]]*['\"]\.\./" )
done
if (( r1 == 0 )); then ok "R1  every import is '@/…' or a package — no climbing relative paths"
else fail "R1  $r1 import(s) climb out of their directory instead of using '@/'"; fi

# --- R2. tests live in app/test/, are .ts, and never reach a .tsx ----------
# ADR-035 §2.11 (amended 2026-09-07) allows a unit test where it pins a VALUE a
# customer sees or the ledger stores, and refuses suites over rendering,
# navigation and layout. `app/vitest.config.ts` collects `test/**` only, so the
# boundary is structural; this asserts the other half — that nothing in the
# suite pulls a component in through the side door.
note
r2=0
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  r2=$((r2+1)); offend "$f" "a test file under app/src/ — tests live in app/test/"
done < <(find "$SRC" -type f -name '*.test.*')
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  r2=$((r2+1)); offend "$f" "a .tsx under app/test/ — the suite may not render"
done < <(find "$TESTS" -type f -name '*.tsx')
for f in $(test_files); do
  while IFS= read -r spec; do
    [[ -z "$spec" ]] && continue
    case "$spec" in
      *.tsx)
        r2=$((r2+1)); offend "$f" "imports '$spec' — a .tsx, which the suite may not load" ;;
      @/*)
        rest="${spec#@/}"
        if [[ ! -f "$SRC/$rest.ts" && -f "$SRC/$rest.tsx" ]]; then
          r2=$((r2+1)); offend "$f" "imports '$spec', which resolves to a .tsx"
        fi ;;
    esac
  done < <(code "$f" | grep -oE "from[[:space:]]*['\"][^'\"]+['\"]" | sed "s/.*['\"]\(.*\)['\"]/\1/")
done
if (( r2 == 0 )); then ok "R2  the suite is .ts under app/test/ and reaches no component"
else fail "R2  $r2 violation(s) of the test boundary"; fi

# --- R4. every word a shopkeeper reads is in src/strings.ts ---------------
# ⚠️ THE RECOGNISER IS THE ACCENT, AND ITS LIMIT IS STATED ON THE PAGE. Every
# Spanish sentence this app says carries one; a single unaccented word typed in
# place (`'Entrar'`) does not, and this cannot see it. A narrow guard that says
# what it misses beats a broad one that is believed to catch everything.
#
# ⚠️⚠️ AN ALTERNATION AND NOT A BRACKET EXPRESSION, AND THE REASON IS THE OTHER
# MACHINE. `[áéíóú]` is a set of BYTES, not of characters, wherever the locale
# is not a UTF-8 one — this runs on the owner's Mac and on ubuntu-latest, which
# do not agree about that, and the failure would be silent in the worse
# direction: a rule that quietly stops recognising Spanish. Each alternative
# below is matched as a literal multi-byte string, which is locale-independent.
# The same family as the bash 3.2 trap two other checks here already recorded:
# a check that only works on one of the two machines that matter is not one.
ACCENTS='á|é|í|ó|ú|Á|É|Í|Ó|Ú|ñ|Ñ|¿|¡'
note
r4=0
for f in $(src_files); do
  [[ "$f" == "$SRC/strings.ts" ]] && continue
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    r4=$((r4+1)); offend "$f" "$line"
  done < <(code "$f" | grep -E "$ACCENTS" | grep -E "['\"\`]")
done
if (( r4 == 0 )); then ok "R4  src/strings.ts is the only module with Spanish in it"
else fail "R4  $r4 Spanish literal(s) outside src/strings.ts"; fi

# --- R5. money is integer centavos; money computes, mxn.ts renders --------
# `toFixed` and a division by 100 are the two spellings of the one bug this
# whole money path exists to prevent: an exact integer turned into a double
# somewhere between Postgres and the screen. `src/format/mxn.ts` is exempt from
# the division because it is the one place that separates pesos from centavos
# BY INTEGER ARITHMETIC, with forty lines saying so.
note
r5=0
for f in $(src_files); do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    r5=$((r5+1)); offend "$f" "$line"
  done < <(code "$f" | grep -E "toFixed\(")
  [[ "$f" == "$SRC/format/mxn.ts" ]] && continue
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    r5=$((r5+1)); offend "$f" "$line"
  done < <(code "$f" | grep -E "/[[:space:]]*100([^0-9]|$)|Intl\.")
done
if (( r5 == 0 )); then ok "R5  no toFixed, no division by 100, no Intl outside src/format/mxn.ts"
else fail "R5  $r5 place(s) where a peso-valued float could be made"; fi

# --- R6. a size a person looks at comes from the density scale ------------
# C3.18's two modes exist so an old customer can read the screen across a
# counter. A literal `fontSize: 16` is a screen with ONE density that does not
# say so — and the ones a retrofit misses are exactly the rows elder mode was
# for. ⚠️ `flex`, `borderWidth`, `opacity` and `zIndex` are deliberately absent
# from this list: they are not sizes, and elder mode does not change them.
note
r6=0
SIZE_KEYS='fontSize|lineHeight|letterSpacing|height|minHeight|maxHeight|width|minWidth|maxWidth|gap|rowGap|columnGap|padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|margin|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical|borderRadius'
for f in $(src_files); do
  [[ "$f" == "$SRC/theme/density.ts" ]] && continue
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    r6=$((r6+1)); offend "$f" "$line"
  done < <(code "$f" | grep -E "(^|[^A-Za-z])($SIZE_KEYS)[[:space:]]*:[[:space:]]*[0-9]")
done
if (( r6 == 0 )); then ok "R6  every size on a screen comes from useDensity(), not a literal"
else fail "R6  $r6 hardcoded size(s) — elder mode cannot change these"; fi

# --- R11. a colour a person sees comes from the palette -------------------
# ⚠️ ADDED 2026-09-17, PLAN TASK `5b.6`. Área 13's one machine-checkable half.
# The owner ruled direction B — colour carries meaning, green acts, amber warns,
# red destroys — and eleven named roles landed in `src/theme/palette.ts`. A hex
# typed into a screen is a twelfth role nobody named, and the states it gets
# wrong are the ones nobody looks at: the empty list, the failed write, the row
# with no price. Exactly `R6`'s argument, about colour instead of size.
#
# ⚠️ TWO PATTERNS, AND THE SECOND IS NOT REDUNDANT. A hex catches `'#A8620A'`;
# the colour-key pattern catches `color: 'white'`, which has no hex in it at
# all and is the spelling somebody reaches for first.
#
# ⚠️ WHAT IT CANNOT SEE, SAID HERE RATHER THAN DISCOVERED LATER: the rule that
# NO STATE IS ANNOUNCED BY COLOUR ALONE. That needs a rendered screen, and
# §2.11 bans the suite that would render one. It lives in the palette's header,
# in `R11` on the page, and in ADR-035 §2.11 — and `R9` is the convention that
# says an unseeable deliverable gets written down, which this is.
note
r11=0
COLOUR_KEYS='[A-Za-z]*[Cc]olor'
for f in $(src_files); do
  [[ "$f" == "$SRC/theme/palette.ts" ]] && continue
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    r11=$((r11+1)); offend "$f" "$line"
  done < <(code "$f" | grep -E "#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|(^|[^A-Za-z])($COLOUR_KEYS)[[:space:]]*:[[:space:]]*['\"\`]")
done
if (( r11 == 0 )); then ok "R11 every colour comes from src/theme/palette.ts, not a literal"
else fail "R11 $r11 colour literal(s) — a role nobody named, in a state nobody checks"; fi

# --- R7. two environment variables, EXPO_PUBLIC_, spelled out in full -----
# Expo's babel plugin INLINES `process.env.EXPO_PUBLIC_FOO` where it is
# written; it does not build a populated `process.env`. So a second reader, or
# a spread, typechecks and runs in node and hands the phone nothing.
note
r7=0
for f in $(src_files); do
  [[ "$f" == "$SRC/lib/supabase.ts" ]] && continue
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    r7=$((r7+1)); offend "$f" "$line"
  done < <(code "$f" | grep -E "process\.env")
done
for f in $(src_files) $(test_files); do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    r7=$((r7+1)); offend "$f" "$line"
  done < <(code "$f" | grep -E "process\.env\.NEXT_PUBLIC_")
done
if (( r7 == 0 )); then ok "R7  process.env is read in src/lib/supabase.ts and nowhere else"
else fail "R7  $r7 place(s) reading the environment outside the one module that may"; fi

# --- R10. Intl is limited to what has been measured on a phone ------------
# ⚠️⚠️ ADDED 2026-09-13, AFTER `formatToParts` CRASHED THE APP ON LAUNCH. Plan
# task `5a-iv-a`, on the owner's own iPhone 15, the first time this app was ever
# run on a device: `TypeError: undefined is not a function` at `formatMXN`, an
# uncaught JS exception that terminates the process on the splash screen.
#
# `Intl.NumberFormat` CONSTRUCTS on Hermes and `.format()` returns `$1,234.50`
# correctly — the device was asked directly, with a probe build, rather than
# reasoned about. `.formatToParts()` is simply not there.
#
# ⚠️ THE TWENTY-SIX ASSERTIONS OVER `formatMXN` WERE GREEN THROUGHOUT, AND THEY
# STILL ARE. They run under node, which ships full ICU. This repository's
# founding rule is "a file is not evidence; a green CI run is" — and this is the
# footnote that rule needed: A GREEN CI RUN IS EVIDENCE ABOUT THE RUNTIME CI
# USED. Node is not the runtime the shopkeeper holds, and no suite that runs
# here ever will be.
#
# ⚠️ IT IS AN ALLOW-LIST. The names below are not "known missing" — they are
# UNMEASURED, which is the same thing until someone puts one on a phone. Adding
# one is not a code change, it is a measurement plus a code change.
#
# ⚠️⚠️ AND IT IS AN INTERSECTION, WHICH WAS MEASURED ON 2026-09-13, PLAN TASK
# `5a-iv-c-2`. A Release APK on an Android emulator says `formatToParts` IS A
# FUNCTION. Hermes takes ECMA-402 from the host — Foundation on iOS, ICU on
# Android — so the surface is a property of the PLATFORM and two devices running
# "Hermes" do not agree about what exists. The name that killed the app on an
# iPhone works on an Oppo.
#
# SO A NAME STAYS IN THE BANNED LIST WHILE ANY SHIPPING PLATFORM HAS NOT BEEN
# ASKED, AND ONE GREEN DEVICE IS ONE OF TWO. `PluralRules` is `undefined` on
# Android and unasked on iOS; `DateTimeFormat` and `Collator` are functions on
# Android and unasked on iOS. `format` and `resolvedOptions` are the only two
# with evidence from both.
note
INTL_ALLOWED='format|resolvedOptions'
INTL_BANNED='formatToParts|formatRangeToParts|formatRange|selectRange|supportedLocalesOf|Segmenter|RelativeTimeFormat|ListFormat|DisplayNames|PluralRules|Collator'
r10=0
for f in $(src_files); do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    r10=$((r10+1)); offend "$f" "$line"
  done < <(code "$f" | grep -E "($INTL_BANNED)")
done
if (( r10 == 0 )); then
  ok "R10 Intl use stays inside the measured surface ($INTL_ALLOWED)"
else
  fail "R10 $r10 use(s) of an ECMA-402 API nobody has run on a phone"
  echo "      Hermes is not node. Put it on a device, look, then widen the"
  echo "      allow-list in this script and in docs/CONVENTIONS.md with the date."
fi

# --- R8. every module outside src/app/ opens with a header saying why -----
# ⚠️ ROUTES ARE EXEMPT AND THE EXEMPTION IS THE RULE'S POINT. A file under
# `src/app/` that mounts a component has nothing to explain; a module that
# DECIDES something has, and this codebase's habit of writing the reasoning
# next to the decision is the reason a stranger can read `guard.ts` at all.
note
r8=0
for f in $(src_files); do
  case "$f" in "$SRC"/app/*) continue ;; esac
  if ! grep -q '^// =====' "$f"; then
    r8=$((r8+1)); offend "$f" "no '// =====' header — why does this module exist?"
  fi
done
if (( r8 == 0 )); then ok "R8  every module outside src/app/ says why it exists"
else fail "R8  $r8 module(s) with no header"; fi

echo
if (( fails > 0 )); then
  echo "$ran assertion groups ran, $fails failed — docs/CONVENTIONS.md is describing"
  echo "a codebase that is no longer this one."
  exit 1
fi
# ⚠️ THE ANTI-VACUITY GUARD, rule 4 of this repository. Every failure path above
# is conditional, so "0 failures" is also what a run that found no files looks
# like. The eighth check here to carry one, and the first where the thing that
# could empty it is a `find` over a directory that moved.
# ⚠️ 14 AND NOT 13, AND THE OFF-BY-ONE WAS ALREADY HERE. This read `11` while
# TWELVE groups ran, so one group could have been deleted and the guard would
# still have passed. `5b.6` added two groups and tightened it to the real
# number at the same time: a floor one below the truth is a floor with one
# free deletion in it.
note_expected=14
if (( ran < note_expected )); then
  echo "FAIL: only $ran assertion groups ran, expected $note_expected — this check"
  echo "      asserted almost nothing and was about to report success."
  exit 1
fi
SRC_N="$(src_files | grep -c .)"
TEST_N="$(test_files | grep -c .)"
if (( SRC_N < 10 || TEST_N < 5 )); then
  echo "FAIL: only $SRC_N source and $TEST_N test files were read. Every rule above"
  echo "      is a loop over those lists, so an empty one is a silent green."
  exit 1
fi
echo "all $ran assertion groups passed over $SRC_N source and $TEST_N test files —"
echo "docs/CONVENTIONS.md still describes app/."

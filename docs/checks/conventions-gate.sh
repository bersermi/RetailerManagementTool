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
ENFORCED="R1 R2 R4 R5 R6 R7 R8"
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
note
r4=0
for f in $(src_files); do
  [[ "$f" == "$SRC/strings.ts" ]] && continue
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    r4=$((r4+1)); offend "$f" "$line"
  done < <(code "$f" | grep -E "['\"\`][^'\"\`]*[áéíóúÁÉÍÓÚñÑ¿¡][^'\"\`]*['\"\`]")
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
note_expected=9
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

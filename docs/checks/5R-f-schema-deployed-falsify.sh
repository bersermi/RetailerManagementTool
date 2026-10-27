#!/usr/bin/env bash
# 5R-f-schema-deployed-falsify — the fifteen fixtures the deploy guard was checked
# against, kept as a script rather than as a paragraph claiming it was. D1–D10
# are the migration list (`5R-f`); W1–W5 are the walls group (`10.1b`).
#
# ⚠️⚠️ THIS HARNESS IS NOT AN EXTRA HERE — IT IS THE ONLY EVIDENCE THE GUARD WORKS.
# The hosted project is currently IN SYNC, and it should stay that way, so the real
# check is green and will be green every time anybody runs it. A guard that has
# only ever been seen green is a guard nobody has tested. Every red this script
# produces is one the real one cannot produce without breaking the shop's database.
#
# HOW IT WORKS, AND WHY IT TOUCHES NOTHING REAL. Each fixture builds a whole fake
# repository in a temp directory — migration files, a README naming a deploy
# target, a `.temp/project-ref` — and puts a STUB `supabase` first on PATH that
# prints canned JSON. ⚠️ The stub is what keeps this honest in both directions: the
# check under test has **no environment variable and no flag** that makes it read
# a file instead of the network, so there is no backdoor in the guard itself for
# somebody to reach for later.
#
# ⚠️ THE CANNED JSON IS THE REAL SHAPE, MEASURED RATHER THAN GUESSED. On 2026-09-24
# a throwaway migration file was added locally and `supabase migration list
# --linked` was run against the real project: an unapplied migration comes back as
# `"remote": ""` — an EMPTY STRING, not null, not an absent key. A fixture built on
# the guess would have been red for the wrong reason, which is a coincidence and
# not a falsification.
#
# ⚠️⚠️ `D8` IS THE ONE THAT EARNS ITS KEEP AND IT IS WHY THE GUARD HAS A FOURTH
# ASSERTION AT ALL. It hands back a list that is INTERNALLY CONSISTENT — every row
# it mentions is applied — while silently omitting a migration that is on disk.
# Groups 5 and 6 walk the CLI's rows, so both would pass while looking at almost
# nothing. Only the group that walks the DISK catches it. Delete assertion 4 and
# this fixture goes green.
#
# Run:  bash docs/checks/5R-f-schema-deployed-falsify.sh
# Exit: 0 when all fifteen fixtures behave as recorded; 1 otherwise.

set -uo pipefail

CHECK="docs/checks/5R-f-schema-deployed.sh"
[[ -r "$CHECK" ]] || { echo "FAIL: run me from the repo root"; exit 1; }
CHECK_ABS="$PWD/$CHECK"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fails=0
ran=0

REF="hweutzjhzvioswnjzqki"

# --- the stub -----------------------------------------------------------------
# It answers `--version` for assertion 1, prints $STUB_WALLS for `db query` (group
# 7) exiting with $STUB_WALLS_RC, and prints $STUB_BODY for everything else,
# exiting with $STUB_RC. ⚠️ It writes each body verbatim, so a fixture can hand
# back malformed output as easily as valid JSON or CSV. The walls default is the
# measured shape of "no breach" — the header line alone (2026-10-27, CLI 2.114.0).
mkdir -p "$WORK/bin"
cat > "$WORK/bin/supabase" <<'STUB'
#!/usr/bin/env bash
for a in "$@"; do
  if [ "$a" = "--version" ]; then echo "0.0.0-stub"; exit 0; fi
done
case " $* " in
  *" db query "*)
    [ -n "${STUB_WALLS:-}" ] && printf '%s\n' "$STUB_WALLS"
    exit "${STUB_WALLS_RC:-0}" ;;
esac
[ -n "${STUB_BODY:-}" ] && printf '%s\n' "$STUB_BODY"
exit "${STUB_RC:-0}"
STUB
chmod +x "$WORK/bin/supabase"

# --- tree builder -------------------------------------------------------------
# $1 = fixture name, $2 = space-separated local migration versions.
# Leaves the tree at $WORK/$1 with a correct README and a correct link.
build_tree() {
  name="$1"; versions="$2"
  root="$WORK/$name"
  rm -rf "$root"
  mkdir -p "$root/supabase/migrations" "$root/supabase/.temp" "$root/supabase/pgtap"
  for v in $versions; do
    printf -- '-- fixture\nselect 1;\n' > "$root/supabase/migrations/${v}_fixture.sql"
  done
  printf -- '-- fixture: the stub answers for it\nselect 1\n' > "$root/supabase/pgtap/_walls.sql"
  printf '# Database\n\n**Deploy target — project ref:** `%s`\n' "$REF" \
    > "$root/supabase/README.md"
  printf '%s' "$REF" > "$root/supabase/.temp/project-ref"
}

# JSON row helper: json_rows "0001:0001 0002:" -> the migrations payload.
json_rows() {
  body='{"migrations":['
  first=1
  for pair in $1; do
    loc="${pair%%:*}"
    rem="${pair#*:}"
    [ $first -eq 0 ] && body="$body,"
    first=0
    body="$body{\"local\":\"$loc\",\"remote\":\"$rem\",\"time\":\"$loc\"}"
  done
  printf '%s],"message":"Migrations listed"}' "$body"
}

# $1 = fixture id, $2 = expected red|green, $3 = human description,
# $4 = tree root, $5 = stub body, $6 = stub rc, $7 = a phrase the output must carry
expect() {
  id="$1"; want="$2"; desc="$3"; root="$4"; body="$5"; rc="$6"; phrase="${7:-}"
  ran=$((ran+1))
  out="$(cd "$root" && PATH="$WORK/bin:$PATH" STUB_BODY="$body" STUB_RC="$rc" \
         STUB_WALLS="$WALLS_BODY" STUB_WALLS_RC="$WALLS_RC" \
         bash "$CHECK_ABS" . 2>&1)"
  got_rc=$?
  if [ "$want" = "red" ]; then got="$( [ $got_rc -ne 0 ] && echo red || echo green )";
  else got="$( [ $got_rc -eq 0 ] && echo green || echo red )"; fi
  if [ "$got" != "$want" ]; then
    echo "FAIL: $id expected $want and the guard went $got — $desc"
    printf '%s\n' "$out" | sed 's/^/        /' | head -14
    fails=$((fails+1))
    return
  fi
  # ⚠️ A RED IS NOT ENOUGH: it must be red for the STATED reason. A fixture that is
  # red for an unrelated reason is a coincidence, which is the lesson `Y2` left.
  if [ -n "$phrase" ] && ! printf '%s' "$out" | grep -qF "$phrase"; then
    echo "FAIL: $id went $want as expected but not for the reason it exists for —"
    echo "      the output never mentions: $phrase"
    printf '%s\n' "$out" | sed 's/^/        /' | head -14
    fails=$((fails+1))
    return
  fi
  echo "  ok    $id  $desc"
}

ALL_OK="0001:0001 0002:0002 0003:0003"

# The walls group's answer for every D fixture: no breach. W fixtures override it.
CLEAN_WALLS="wall,object"
WALLS_BODY="$CLEAN_WALLS"
WALLS_RC=0

# --- D3 first: the control ----------------------------------------------------
# ⚠️ IT RUNS FIRST ON PURPOSE. If the harness itself were broken — a bad stub, a
# tree the check cannot read — every fixture below would be red and the run would
# look like fifteen successful falsifications. This one proves a correct tree is
# green — the walls group included.
build_tree d3 "0001 0002 0003"
expect "D3" green "a tree that agrees with its remote, and keeps the walls, is GREEN — the control" \
  "$WORK/d3" "$(json_rows "$ALL_OK")" 0 "all 7 assertion groups passed"

# --- D1: the 2026-09-22 defect ------------------------------------------------
build_tree d1 "0001 0002 0003"
expect "D1" red "a migration merged here and never applied there — 2026-09-22 itself" \
  "$WORK/d1" "$(json_rows "0001:0001 0002:0002 0003:")" 0 "supabase db push"

# --- D2: SQL run by hand ------------------------------------------------------
build_tree d2 "0001 0002"
expect "D2" red "the remote carries a migration this repository does not have" \
  "$WORK/d2" "$(json_rows "0001:0001 0002:0002 :0003")" 0 "by hand"

# --- D4: the command failed ---------------------------------------------------
# ⚠️⚠️ THE MOST IMPORTANT NEGATIVE ONE. An expired login, a dropped network or a
# deleted project must never read as "nothing has diverged".
build_tree d4 "0001 0002 0003"
expect "D4" red "a failing list command is RED, never a silent green" \
  "$WORK/d4" "Access token not provided. Supply an access token by running supabase login" 1 \
  "did not return a migration list"

# --- D5: an empty list while files exist --------------------------------------
build_tree d5 "0001 0002 0003"
expect "D5" red "an empty remote with local files on disk is caught" \
  "$WORK/d5" '{"migrations":[],"message":"Migrations listed"}' 0 \
  "does not mention"

# --- D6: linked to the wrong project ------------------------------------------
# ⚠️ THE VACUOUS-PASS FIXTURE. Every row agrees; it is the wrong database.
build_tree d6 "0001 0002 0003"
printf 'someotherproject' > "$WORK/d6/supabase/.temp/project-ref"
expect "D6" red "a link to a different project is refused rather than passing vacuously" \
  "$WORK/d6" "$(json_rows "$ALL_OK")" 0 "WRONG DATABASE"

# --- D7: the README stops naming a deploy target ------------------------------
build_tree d7 "0001 0002 0003"
printf '# Database\n\nnothing here names a target.\n' > "$WORK/d7/supabase/README.md"
expect "D7" red "a README that no longer names the deploy target is caught" \
  "$WORK/d7" "$(json_rows "$ALL_OK")" 0 "does not name a deploy target"

# --- D8: a short list that is internally consistent ---------------------------
# ⚠️⚠️ THE FIXTURE ASSERTION 4 EXISTS FOR. Delete that group and this goes green.
build_tree d8 "0001 0002 0003"
expect "D8" red "a partial listing cannot hide a migration by omitting it" \
  "$WORK/d8" "$(json_rows "0001:0001 0002:0002")" 0 "does not mention"

# --- D9: not linked at all ----------------------------------------------------
build_tree d9 "0001 0002 0003"
rm -f "$WORK/d9/supabase/.temp/project-ref"
expect "D9" red "an unlinked working copy is told to link, not quietly passed" \
  "$WORK/d9" "$(json_rows "$ALL_OK")" 0 "supabase link --project-ref"

# --- D10: output the guard cannot parse ---------------------------------------
# ⚠️ THE CLI'S OUTPUT FORMAT IS NOT THIS REPOSITORY'S TO FIX. If it moves, the
# guard must say so rather than compare an empty list to an empty list.
build_tree d10 "0001 0002 0003"
expect "D10" red "output the guard cannot parse is red, not an empty comparison" \
  "$WORK/d10" '{"migrations":"this is not an array"}' 0 "cannot read"

# --- W1–W5: the walls group (plan 10.1b) ---------------------------------------
# Every W tree agrees with its remote, so group 7 is the only thing that can turn
# it red — and each must be red for ITS reason, named by the phrase.

# W1 — ⚠️⚠️ THE ONE THE GROUP EXISTS FOR: every migration applied, a wall open.
# 2026-10-27 exactly: groups 1–6 green while anon could execute 50 functions.
build_tree w1 "0001 0002 0003"
WALLS_BODY="$CLEAN_WALLS
anon may execute,auth_full_name(p_user_id uuid)"
expect "W1" red "a breach on a fully deployed remote is caught — 2026-10-27 itself" \
  "$WORK/w1" "$(json_rows "$ALL_OK")" 0 "breaks 1 wall(s)"

# W2 — the query failed. An expired login must never read as "no breach".
build_tree w2 "0001 0002 0003"
WALLS_BODY="Access token not provided. Supply an access token by running supabase login"
WALLS_RC=1
expect "W2" red "a failing walls query is RED, never a silent green" \
  "$WORK/w2" "$(json_rows "$ALL_OK")" 0 "did not come back"
WALLS_RC=0

# W3 — exit 0 and an answer that is not the CSV the query returns: the CLI's
# format moved, and "no rows I can parse" is not "no breach".
build_tree w3 "0001 0002 0003"
WALLS_BODY='{"rows":[]}'
expect "W3" red "an answer in another shape is red, not an empty list of breaches" \
  "$WORK/w3" "$(json_rows "$ALL_OK")" 0 "did not come back"

# W4 — the query file is gone: nothing reads who may call what.
build_tree w4 "0001 0002 0003"
rm -f "$WORK/w4/supabase/pgtap/_walls.sql"
WALLS_BODY="$CLEAN_WALLS"
expect "W4" red "a tree without the walls query is red, not a pass over nothing" \
  "$WORK/w4" "$(json_rows "$ALL_OK")" 0 "cannot read"

# W5 — a wrong link: the walls must not be read — or reported green — about
# somebody else's project. D6 shows group 2 red; this shows group 7 refuses too.
build_tree w5 "0001 0002 0003"
printf 'someotherproject' > "$WORK/w5/supabase/.temp/project-ref"
expect "W5" red "the walls are not read through a link group 2 refused" \
  "$WORK/w5" "$(json_rows "$ALL_OK")" 0 "the walls were not read"

echo ""
if (( fails == 0 )); then
  echo "all $ran fixtures behaved as recorded — the deploy guard goes red on a"
  echo "remote that is behind, a remote that is ahead, a partial listing, a"
  echo "failed command, a wrong link, an undocumented target, an open wall, a"
  echo "walls query that failed or came back in another shape, and a missing one."
  exit 0
fi
echo "$ran fixtures ran, $fails did not behave as recorded."
exit 1

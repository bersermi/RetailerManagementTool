#!/usr/bin/env bash
# 5R-f-schema-deployed — is the HOSTED database actually carrying the migrations
# this repository has merged?
#
# WHY THIS EXISTS. On 2026-09-22 the hosted project the owner's phone signs in to
# was found to have NO SCHEMA AT ALL. Every migration had been applied in CI's
# throwaway Postgres and nowhere else, and it was found by HIM TAPPING PRODUCTOS
# — not by any check in this directory.
#
# ⚠️⚠️ THE OTHER CHECKS ARE NOT WRONG, AND THAT IS THE WHOLE POINT. Every contract
# check here builds its own database, asserts against it and deletes it. That is
# the right design for proving a migration APPLIES. It says nothing whatsoever
# about whether it WAS applied, to the one database a shopkeeper's phone talks to.
# `supabase/README.md` calls a green CI run the evidence for a schema claim; this
# script is the half of that sentence CI cannot reach.
#
# WHAT IT ASSERTS. Six groups, and every one of them is about the REAL remote:
#
#   1. The `supabase` CLI is on PATH — the instrument exists.
#   2. The repository NAMES a deploy target and the CLI is linked to THAT project.
#      ⚠️ Without this the check passes vacuously against somebody's other
#      project, which is the same class of defect as running an RLS test as
#      `postgres`: green, and about nothing.
#   3. The list command SUCCEEDED and returned a parseable, non-empty answer. An
#      error is never read as "nothing has diverged".
#   4. Every migration file on disk appears in that answer — catches a partial or
#      stale listing rather than trusting it.
#   5. ⚠️⚠️ Every local migration is APPLIED REMOTELY. This is the 2026-09-22
#      defect and the reason the file exists.
#   6. Every remote migration has a local file. A remote-only migration means SQL
#      reached the database by hand, which `supabase/README.md` forbids outright.
#
# ⚠️⚠️ IT IS DELIBERATELY NOT IN ANY WORKFLOW, AND THAT WAS THE FIRST DECISION THIS
# TASK MADE. `supabase migration list --linked` needs a Supabase ACCESS TOKEN, and
# an access token is ACCOUNT-WIDE — there is no project-scoped one. Putting it in a
# repository secret would hand every workflow run the owner's whole Supabase
# account in order to guard against a forgotten `db push`, which is a blast radius
# far larger than the thing being guarded.
#
# ⚠️ AND THE SECOND REASON IS THIS REPOSITORY'S OWN HISTORY. This check's answer
# depends on the WORLD, not on the diff: once a migration merges, it is red until a
# person deploys — so it would redden pull requests that did not cause it and
# cannot fix it. `5R-g` records what that does. A red that is not yours is how
# people learn to stop reading CI, and the working agreement already rests on
# somebody reading the job log by name.
#
# ⚠️ SO IT IS A CHECK A SESSION RUNS, and `supabase/README.md`'s deploy section
# names the moment: straight after `supabase db push`, and whenever a migration
# has merged and nobody can say for certain that it was deployed.
#
# ⚠️ NO PASSWORD AND NO SERVICE KEY — measured 2026-09-24, not assumed. `--linked`
# authenticates with the stored access token. The pooler URL's password does NOT
# work from this machine and nothing here needs it.
#
# Run:  bash docs/checks/5R-f-schema-deployed.sh
# Exit: 0 when the hosted database matches the repository; 1 otherwise, naming
#       every migration that differs and which side it is missing from.

set -uo pipefail

# ⚠️ The root is an argument so the falsifier can build a whole fake tree. It is
# never anything but `.` in real use.
ROOT="${1:-.}"

MIGRATIONS="$ROOT/supabase/migrations"
README="$ROOT/supabase/README.md"
LINKED="$ROOT/supabase/.temp/project-ref"

fails=0
ran=0
note() { ran=$((ran+1)); }
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# ⚠️ No associative arrays and no `mapfile`: macOS ships bash 3.2, and this is a
# check whose whole purpose is to be run on the owner's Mac. The other plan guards
# carry the same note for the same reason.

[[ -d "$MIGRATIONS" ]] || { echo "FAIL: cannot read $MIGRATIONS — run me from the repo root"; exit 1; }
[[ -r "$README" ]]     || { echo "FAIL: cannot read $README — run me from the repo root"; exit 1; }

# --- 1. the instrument exists ------------------------------------------------
note
if ! command -v supabase >/dev/null 2>&1; then
  fail "the \`supabase\` CLI is not on PATH, so this check cannot look at the"
  echo "      hosted database at all. Install it (\`brew install supabase/tap/supabase\`)"
  echo "      and run \`supabase login\` once. ⚠️ A check that cannot look must not"
  echo "      report green, which is why this is a failure and not a skip."
  echo ""
  echo "$ran assertion group(s) ran, $fails failed."
  exit 1
fi
ok "the supabase CLI is on PATH ($(supabase --version 2>/dev/null | head -1))"

# --- 2. the repository names a deploy target, and we are linked to it --------
# ⚠️⚠️ THE REF IS READ FROM A COMMITTED FILE AND THE LINK FROM A GITIGNORED ONE,
# WHICH IS THE ENTIRE REASON THIS GROUP EXISTS. `supabase/.temp/` is gitignored, so
# the link is a property of one laptop; `supabase/README.md` is the repository's
# own statement of where this schema belongs. Comparing them is what stops a green
# run that looked at the wrong database.
#
# ⚠️ `supabase/config.toml`'s `project_id` is NOT this — it is the local stack's
# name (`RetailerManagementTool`), not the hosted ref, and reading it here would
# compare a string to itself.
note
EXPECTED_REF="$(grep -oE '^\*\*Deploy target — project ref:\*\* `[a-z0-9]+`' "$README" \
                | head -1 | grep -oE '`[a-z0-9]+`' | tr -d '`')"
if [[ -z "$EXPECTED_REF" ]]; then
  fail "$README does not name a deploy target, so nothing says which hosted"
  echo "      database this schema belongs to. The line it looks for is a single"
  echo "      bolded definition at column 0 naming the project ref in backticks."
  echo "      ⚠️ That paragraph is half of what task 5R-f ships; if it has been"
  echo "      removed or reworded, the deploy path is undocumented again."
elif [[ ! -r "$LINKED" ]]; then
  fail "this working copy is not linked to a Supabase project ($LINKED is absent),"
  echo "      so \`--linked\` has nothing to talk to. ⚠️ That file is GITIGNORED —"
  echo "      linking is per-laptop and is not something a clone inherits."
  echo "      REMEDY: supabase link --project-ref $EXPECTED_REF"
else
  ACTUAL_REF="$(tr -d ' \t\n\r' < "$LINKED")"
  if [[ "$ACTUAL_REF" != "$EXPECTED_REF" ]]; then
    fail "this working copy is linked to project '$ACTUAL_REF' and $README names"
    echo "      '$EXPECTED_REF' as the deploy target. ⚠️⚠️ EVERY ASSERTION BELOW WOULD"
    echo "      HAVE BEEN ABOUT THE WRONG DATABASE — green, and about nothing, which"
    echo "      is the same shape as running an isolation test as the superuser."
    echo "      REMEDY: supabase link --project-ref $EXPECTED_REF"
  else
    ok "linked to the project $README names as the deploy target ($EXPECTED_REF)"
  fi
fi

# --- 3. the remote actually answered ----------------------------------------
# ⚠️⚠️ AN ERROR IS NOT AN ABSENCE OF DIVERGENCE. If this command fails — no
# network, an expired login, a deleted project — the honest answer is "I do not
# know", and the only safe rendering of "I do not know" in a guard is red.
note
LIST_OUT="$(supabase migration list --linked --workdir "$ROOT" 2>&1)"
LIST_RC=$?

# The CLI prints progress lines to stdout before the JSON, so take the last line
# that looks like the payload rather than assuming it stands alone.
LIST_JSON="$(printf '%s\n' "$LIST_OUT" | grep '"migrations"' | tail -1)"

if (( LIST_RC != 0 )) || [[ -z "$LIST_JSON" ]]; then
  fail "\`supabase migration list --linked\` did not return a migration list"
  echo "      (exit $LIST_RC). ⚠️ This is RED rather than skipped: the question"
  echo "      'is the hosted schema current' is unanswered, and an unanswered"
  echo "      question is exactly what 2026-09-22 was."
  echo "      If it mentions a login, the remedy is: supabase login"
  echo "      What it said:"
  printf '%s\n' "$LIST_OUT" | sed 's/^/        /' | head -12
  echo ""
  echo "$ran assertion group(s) ran, $((fails+1)) failed — the hosted database was not read."
  exit 1
fi

# Normalise to `version|local|remote`, one per line. ⚠️ An unapplied local
# migration comes back with remote as an EMPTY STRING, not null — measured against
# the real CLI on 2026-09-24 by adding a throwaway file and listing.
#
# ⚠️⚠️ THE DELIMITER IS `|` AND IT WAS A TAB FOR ONE DRAFT, WHICH WAS A REAL BUG
# THE HARNESS CAUGHT. A tab is IFS WHITESPACE, and bash collapses a run of IFS
# whitespace into ONE delimiter — so a remote-only row, whose middle field is
# empty, arrived as two fields and read as an UNDEPLOYED migration instead of a
# hand-run one. Both are red, so the exit code hid it; fixture `D2` asserts the
# REASON and that is the only thing that found it. `|` is not IFS whitespace and
# cannot appear in a migration version.
PAIRS="$(printf '%s' "$LIST_JSON" | node -e '
  let s = "";
  process.stdin.on("data", d => (s += d));
  process.stdin.on("end", () => {
    let d;
    try { d = JSON.parse(s); } catch (e) { process.exit(3); }
    const rows = d && d.migrations;
    if (!Array.isArray(rows)) process.exit(4);
    for (const m of rows) {
      const local = (m.local || "").trim();
      const remote = (m.remote || "").trim();
      const version = local || remote;
      console.log([version, local, remote].join("|"));
    }
  });
')"
NODE_RC=$?
if (( NODE_RC != 0 )); then
  fail "the migration list came back in a shape this check cannot read (node exit"
  echo "      $NODE_RC). The CLI's output format has moved, and a guard that cannot"
  echo "      parse the answer is reporting on nothing."
  echo ""
  echo "$ran assertion group(s) ran, $((fails+1)) failed."
  exit 1
fi
ok "the hosted project answered with a readable migration list ($(printf '%s\n' "$PAIRS" | grep -c .) row(s))"

# --- 4. every migration file on disk is in that answer -----------------------
# ⚠️ THIS IS THE ANTI-VACUITY GROUP. Groups 5 and 6 walk the CLI's rows; if the CLI
# ever returned a short list — a stale workdir, a flag that changed meaning — they
# would both pass while looking at almost nothing. This one walks the DISK.
note
LOCAL_FILES="$(ls "$MIGRATIONS" 2>/dev/null | grep -E '^[0-9]+_.*\.sql$' | sed 's/_.*//' | sort -u)"
if [[ -z "$LOCAL_FILES" ]]; then
  fail "there are no numbered migration files in $MIGRATIONS, which cannot be"
  echo "      right — this repository's schema is 36 of them. Something is wrong"
  echo "      with the path rather than with the database."
else
  missing_from_list=0
  for v in $LOCAL_FILES; do
    if ! printf '%s\n' "$PAIRS" | grep -q "^$v|"; then
      fail "migration $v exists in $MIGRATIONS and the CLI's list does not mention"
      echo "      it at all. ⚠️ That is the listing being incomplete, not the remote"
      echo "      being behind — the assertions below would have skipped it silently."
      missing_from_list=$((missing_from_list+1))
    fi
  done
  (( missing_from_list == 0 )) && \
    ok "all $(printf '%s\n' "$LOCAL_FILES" | grep -c .) migration file(s) on disk appear in the list"
fi

# --- 5. every local migration is applied remotely ----------------------------
# ⚠️⚠️ THE ONE THIS FILE EXISTS FOR.
note
undeployed=0
while IFS='|' read -r version loc rem; do
  [[ -z "$version" ]] && continue
  if [[ -n "$loc" && -z "$rem" ]]; then
    if (( undeployed == 0 )); then
      fail "the hosted database is BEHIND this repository — migration(s) merged"
      echo "      here and never applied there. ⚠️⚠️ This is 2026-09-22 exactly: the"
      echo "      schema is real in CI's throwaway Postgres and absent from the one"
      echo "      database the owner's phone talks to."
      echo "      REMEDY: supabase db push"
      echo "      Not applied to $EXPECTED_REF:"
    fi
    echo "        $version  ($(ls "$MIGRATIONS" | grep "^${version}_" | head -1))"
    undeployed=$((undeployed+1))
  fi
done <<EOF
$PAIRS
EOF
(( undeployed == 0 )) && ok "every local migration is applied on the hosted project"

# --- 6. nothing reached the database by hand ---------------------------------
# ⚠️ THE OTHER DIRECTION, AND IT IS A DIFFERENT DEFECT. A migration applied
# remotely with no file here means SQL was run by hand. `supabase/README.md`: "
# Nothing reaches the database by hand." It also makes the next `db push` a
# guess, and migrations are append-only once applied.
note
handmade=0
while IFS='|' read -r version loc rem; do
  [[ -z "$version" ]] && continue
  if [[ -n "$rem" && -z "$loc" ]]; then
    if (( handmade == 0 )); then
      fail "the hosted database carries migration(s) this repository does not have."
      echo "      ⚠️ SQL reached that database by hand, which supabase/README.md"
      echo "      forbids outright — and it makes the next \`db push\` a guess,"
      echo "      because migrations are append-only once applied."
      echo "      Applied on $EXPECTED_REF with no file here:"
    fi
    echo "        $version"
    handmade=$((handmade+1))
  fi
done <<EOF
$PAIRS
EOF
(( handmade == 0 )) && ok "every migration on the hosted project has a file in this repository"

echo ""
if (( fails == 0 )); then
  echo "all $ran assertion groups passed — the hosted project $EXPECTED_REF is"
  echo "carrying exactly the migrations this repository has merged."
  exit 0
fi
echo "$ran assertion groups ran, $fails failed — the deployed schema and this"
echo "repository do not agree, and the phone talks to the deployed one."
exit 1

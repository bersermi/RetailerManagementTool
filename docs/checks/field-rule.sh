#!/usr/bin/env bash
# field-rule — does every call a phone could make still work after this change's
# migrations? (plan `10.3`; ADR-035 §2.2: "a migration keeps every build in the
# field working")
#
# WHY THIS EXISTS. One database serves three apps, and a phone can run one build
# for a long time: a store install runs the bundle it shipped with until it has
# fetched an update and been opened again, a phone that never updates runs it for
# good, and a phone offline for days flushes its outbox with the calls it made
# then. The contract checks prove TODAY's app against TODAY's schema — never an
# older build. Until this check, the session writing a migration held the rule.
#
# WHAT IT HOLDS, AND WHY THE SCHEMA RATHER THAN EACH APP'S CALLS. ADR-035 first
# described this check as "each app's calls at its oldest build in use, run
# against the newest schema". Measured on 2026-10-28, neither half can be read
# from the repository: the outbox builds its argument names at run time (`p_` +
# the payload's keys, `@/api/flush`), so no reading of the source finds them; and
# which build each phone still runs is recorded nowhere (the pilot Android's was
# last written down as "still owes" the 2026-10-21 build). So it holds a superset
# that needs neither: EVERYTHING a signed-in phone could reach before the change —
# each function with its argument names, types and defaults and what it returns,
# each table and view with its columns, types and rights, the foreign keys an
# embed follows, the keys an upsert names, the enum labels, the buckets
# (`lib/field-surface.sql`) — must still answer after it, unless the migration
# that removes a thing declares it, with the reason no build in use calls it:
#
#     -- field-rule: breaks <kind> <key> — <why no build in use calls it>
#
# A call any build makes is a subset of that surface, so it covers every build of
# Wera, Wera Cocina and Itacate, the outbox included, without knowing which are
# in use. The price: a removal nobody calls needs that one line.
#
# HOW. The schema before is the base commit's migrations (`supabase db reset
# --version <its newest> --no-seed`); the schema after is that plus this change's
# new migrations, applied on top with `supabase migration up` — what
# `supabase db push` does to the shop. `lib/field-surface.sql` reads each;
# `lib/field-compare.py` says what broke (its header lists every rule).
#
# WHAT IT ASSERTS:
#   1. Every migration the base holds is here, unedited — append-only, which
#      nothing checked before, and which the comparison needs: the shop holds
#      the base's files, not an edited copy.
#   2. The base's schema and this change's are both read, and neither answer is
#      empty.
#   3. Nothing a build could call is gone or changed unless a new migration
#      declares it — and no declaration names something that does not break.
#
# ⚠️ WHAT IT DOES NOT ASSERT, NAMED RATHER THAN LEFT TO BE FOUND:
#   * WHAT A CALL DOES. A row policy, a CHECK, a trigger or a function body can
#     still make an old call fail or answer less (an UPDATE refused by RLS is a
#     200 with no row). It holds that the call is FOUND, with the same names and
#     types, and that the right to make it is held. Behaviour stays with the
#     contract checks (today's app) and the session (older builds).
#   * THE EDGE FUNCTION. `apple-revoke` deploys by hand, so removing it from the
#     shop is a person's act and not a migration's.
#   * The hosted project. This proves the migration files; `5R-f` proves what
#     the shop runs.
#
# Run:  supabase start && bash docs/checks/field-rule.sh [BASE]
#       BASE: the commit before the change (default origin/main; CI passes the
#       pull request's base, or the push's previous head).
# ⚠️ IT LEAVES THE LOCAL DATABASE at this change's schema with NO SEED and no
#       rows: it resets it twice. `supabase db reset` brings the seed back.
# Exit: 0 every call still answers; 1 otherwise.

set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)" || { echo "FAIL: not inside the repository"; exit 1; }
cd "$ROOT" || exit 1
BASE_REF="${1:-origin/main}"
SURFACE="docs/checks/lib/field-surface.sql"
COMPARE="docs/checks/lib/field-compare.py"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/field-rule.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

for f in "$SURFACE" "$COMPARE"; do
  [[ -r "$f" ]] || { echo "FAIL: cannot read $f"; exit 1; }
done
BASE="$(git rev-parse --verify --quiet "${BASE_REF}^{commit}")"
if [[ -z "$BASE" ]]; then
  echo "FAIL: no commit called '$BASE_REF' here (in CI the base must be fetched first)"
  exit 1
fi

# --- 1. the migrations the base holds are here, unedited --------------------
BASE_MIGRATIONS="$(git ls-tree --name-only "$BASE" supabase/migrations/ | grep '\.sql$')"
if [[ -z "$BASE_MIGRATIONS" ]]; then
  echo "FAIL: the base ${BASE:0:8} holds no migration — that is not this repository's main"
  exit 1
fi
edited=0
for f in $BASE_MIGRATIONS; do
  if [[ ! -f "$f" ]]; then
    fail "$f is in the base and not here — a migration once applied is never removed"
    edited=$((edited+1))
  elif ! git diff --quiet "$BASE" -- "$f"; then
    fail "$f differs from the base's — a migration once applied is never edited; fix forward with a new one"
    edited=$((edited+1))
  fi
done
BASE_N="$(printf '%s\n' "$BASE_MIGRATIONS" | grep -c .)"
(( edited == 0 )) && ok "the base's $BASE_N migrations (${BASE:0:8}) are here, unedited"

# ⚠️ `comm`, not `grep -q` per file: under `pipefail` a `grep -q` that stops
# early can kill its writer, and the pipeline then reads as no match.
NEW="$(comm -13 <(printf '%s\n' "$BASE_MIGRATIONS" | sort) \
                <(ls supabase/migrations/*.sql | sort) | tr '\n' ' ')"
NEW="${NEW% }"
BASE_VERSION="$(printf '%s\n' "$BASE_MIGRATIONS" | tail -1 | sed 's#.*/\([0-9]*\)_.*#\1#')"
# ⚠️ A new migration numbered below the base's newest would be built into the
# schema BEFORE (`reset --version` applies every file up to that number), and
# the shop's `db push` refuses one out of order anyway.
for f in $NEW; do
  v="$(basename "$f" | sed 's/^\([0-9]*\)_.*/\1/')"
  if [[ ! "$v" > "$BASE_VERSION" ]]; then
    fail "$f is numbered at or below the base's newest ($BASE_VERSION) — number it after"
  fi
done
if [[ -z "$NEW" ]]; then
  (( fails > 0 )) && { echo "$fails failure(s)."; exit 1; }
  ok "this change adds no migration — the schema a phone talks to cannot move here"
  exit 0
fi
echo "  new   $NEW"
(( fails > 0 )) && { echo "$fails failure(s)."; exit 1; }

DB="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
[[ -n "$DB" ]] || { echo "FAIL: no local Supabase. Run \`supabase start\`."; exit 1; }

surface() { # out-file — the surface of whatever the local database holds now
  { cat "$SURFACE"; echo ';'; } \
    | docker exec -i "$DB" psql -U postgres -d postgres -X -q -v ON_ERROR_STOP=1 --csv \
      > "$1" 2> "$1.err"
}

# --- 2. the schema before, and the schema after -----------------------------
if ! supabase db reset --version "$BASE_VERSION" --no-seed > "$WORK/reset.log" 2>&1; then
  echo "FAIL: could not build the base's schema (through $BASE_VERSION):"
  tail -5 "$WORK/reset.log"
  exit 1
fi
if ! surface "$WORK/before.csv"; then
  echo "FAIL: could not read the base's surface: $(head -3 "$WORK/before.csv.err")"
  exit 1
fi
ok "read the schema through $BASE_VERSION, the base's newest migration"

if ! supabase migration up --local > "$WORK/up.log" 2>&1; then
  echo "FAIL: this change's migrations do not apply on top of the base's schema:"
  tail -8 "$WORK/up.log"
  exit 1
fi
if ! surface "$WORK/after.csv"; then
  echo "FAIL: could not read the surface after this change: $(head -3 "$WORK/after.csv.err")"
  exit 1
fi
ok "applied $(echo "$NEW" | wc -w | tr -d ' ') new migration(s) on top, as \`supabase db push\` would"

# --- 3. what broke ------------------------------------------------------------
# shellcheck disable=SC2086 # NEW is a list of paths without spaces
python3 "$COMPARE" "$WORK/before.csv" "$WORK/after.csv" $NEW
compared=$?
(( compared == 0 )) || fails=$((fails+1))

echo "  note  the local database is at this change's schema with no seed: \`supabase db reset\` restores it"
if (( fails > 0 )); then
  echo "$fails failure(s)."
  exit 1
fi
echo "field rule: every call a build could make before this change still answers after it."

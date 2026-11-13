#!/usr/bin/env bash
# ============================================================================
# THE NIGHTLY COPY — every table of the live database, onto this Mac.
# ============================================================================
# docs/PLAN.md task `5P-e`, the owner's ruling of 2026-10-15: *"I'll do the
# nightly copy in the Mac"* until the pilot's kick-off, and Supabase Pro (daily
# backups kept seven days) before the first real shop. The free plan the live
# project is on takes NO backups (measured 2026-10-13).
#
#   bash docs/runbooks/nightly-copy.sh            # one copy now
#   bash docs/runbooks/nightly-copy.sh --install  # schedule it nightly at 03:30
#
# WHAT IT IS: one folder per run under ~/RetailerToolDev/wera-backups/, holding
# each table as JSON and a `manifest.txt` with the row counts; runs older than
# seven days are removed. It reads through `supabase db query --linked` — the
# CLI's own access token, no database password — so it reads nothing a session
# cannot.
#
# ⚠️ EVERY SCHEMA A MIGRATION MADE, NOT `public` ALONE (fixed 2026-11-12, plan
# task `5P-e`): until then it read `public` only, so `servicio` (`0079`, `0080`:
# a neighbour's yes, the ratings, the thumbs) and `catalogo` (the starter
# catalog) were in no copy. The list is read from `supabase/migrations/` — `public`
# plus each `create schema` — so a migration that adds one is copied the next
# night with nobody remembering. A table of `public` keeps its old file name
# (`sale.json`); any other is `<schema>.<table>.json`.
# ⚠️ A TABLE THAT FAILS IS TRIED THREE TIMES (fixed the same day): on 9 and 10
# November one table a night came back empty — a dropped connection, not an
# error in the table — and that night's copy simply lacked it.
# ⚠️ "SEVEN DAYS" IS THE AVISOS' PROMISE — *"hasta 7 días en las copias de
# seguridad"* — so a run deletes every copy older than seven days less an hour.
# Until 2026-11-12 it used `find -mtime +7`, which keeps a copy until it is
# eight whole days old.
#
# ⚠️ WHAT IT IS NOT: a restorable backup of the whole project. It holds no
# logins (the `auth` schema is not read), so after a restore every person signs
# in again and the rows are put back by hand, by a session. It is the shops'
# records, which is what a shop could not get back any other way.
# ⚠️ It runs only while this Mac is on and awake at 03:30, and the scheduled
# job writes its log to the same folder: `nightly-copy.log`.
# ============================================================================
set -uo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="${WERA_BACKUPS:-$HOME/RetailerToolDev/wera-backups}"
KEEP_DAYS=7
TRIES=3
LABEL="mx.wera.nightly-copy"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [[ "${1:-}" == "--install" ]]; then
  mkdir -p "$HOME/Library/LaunchAgents" "$DEST"
  cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$REPO/docs/runbooks/nightly-copy.sh</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>30</integer></dict>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>StandardOutPath</key><string>$DEST/nightly-copy.log</string>
  <key>StandardErrorPath</key><string>$DEST/nightly-copy.log</string>
</dict>
</plist>
PLISTEOF
  launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1
  if launchctl bootstrap "gui/$(id -u)" "$PLIST"; then
    echo "scheduled: $LABEL runs nightly at 03:30 (this Mac's time); log in $DEST/nightly-copy.log"
    exit 0
  fi
  echo "FAIL: launchctl refused $PLIST" >&2
  exit 1
fi

cd "$REPO" || exit 1
STAMP="$(date -u +%Y-%m-%dT%H%MZ)"
OUT="$DEST/$STAMP"
mkdir -p "$OUT"
echo "$(date -u +%FT%TZ) nightly copy into $OUT"

# One column of plain text per query: the CLI renders json as Go's map[...] in
# CSV, so every value read here is cast to text first.
query() { # sql -> csv on stdout; "Connecting to …" stays on stderr
  supabase db query --linked -o csv "$1" 2>/dev/null
}

# `public`, and every schema a migration creates — quoted for SQL, one list.
SCHEMAS="$( { echo public; grep -hoiE 'create schema( if not exists)? [a-z_]+' supabase/migrations/*.sql \
  | awk '{print tolower($NF)}'; } | sort -u | sed "s/.*/'&'/" | paste -sd, -)"
TABLES="$(query "select table_schema || '.' || table_name from information_schema.tables where table_schema in ($SCHEMAS) and table_type = 'BASE TABLE' order by table_schema <> 'public', 1" | tail -n +2)"
if [[ -z "$TABLES" ]]; then
  echo "FAIL: could not list the tables — is this Mac linked and logged in? (supabase link, supabase login)"
  exit 1
fi

failed=0
: > "$OUT/manifest.txt"
for st in $TABLES; do
  schema="${st%%.*}"; t="${st#*.}"
  # `public` keeps the file and manifest names every copy before 2026-11-12 used.
  name="$st"; [[ "$schema" == public ]] && name="$t"
  ok=0
  for (( try = 1; try <= TRIES; try++ )); do
    if query "select coalesce(json_agg(r), '[]'::json)::text as rows from \"$schema\".\"$t\" r" \
        | python3 -c '
import csv, json, sys
csv.field_size_limit(sys.maxsize)  # a whole table is one field: product_variant passes 128 KB
rows = list(csv.DictReader(sys.stdin))
data = json.loads(rows[0]["rows"]) if rows and rows[0].get("rows") else None
if data is None:
    sys.exit(1)
json.dump(data, open(sys.argv[1], "w"), ensure_ascii=False)
print(len(data))' "$OUT/$name.json" > "$OUT/.count" 2>/dev/null; then
      ok=1; break
    fi
    sleep $(( try * 5 ))
  done
  if (( ok )); then
    echo "$name $(cat "$OUT/.count")" >> "$OUT/manifest.txt"
  else
    echo "$name FAILED" >> "$OUT/manifest.txt"
    failed=$((failed + 1))
  fi
done
rm -f "$OUT/.count"

# Seven days kept — less an hour, so last week's copy goes before tonight's
# lands a few minutes later than it did — and only folders this script names.
find "$DEST" -maxdepth 1 -type d -name '20??-??-??T????Z' \
  -mmin +"$(( KEEP_DAYS * 24 * 60 - 60 ))" -exec rm -rf {} +

echo "$(wc -l < "$OUT/manifest.txt" | tr -d ' ') tables, $failed failed; $(du -sh "$OUT" | cut -f1)"
(( failed == 0 ))

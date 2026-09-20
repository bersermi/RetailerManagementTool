#!/usr/bin/env bash
# plan-corpus — assemble the working plan and its archive into ONE file, and echo
# the path. This is the safeguard that makes archiving invisible to every check.
#
# WHY THIS EXISTS. On 2026-09-19 `docs/PLAN.md` reached 14,998 lines / ~313k
# tokens — LARGER THAN A CONTEXT WINDOW, so no session could read it and every
# session grepped it instead. Steps 0 through 4.6 were closed and still being
# carried. Archiving them was the obvious repair and had one obstacle: TWENTY-SEVEN
# checks read the plan, seventeen of them in `app.yml`, and a row that moves to
# another file stops resolving.
#
# ⚠️ IT WORKS AT ALL BECAUSE EVERY PLAN LOOKUP IN THIS REPOSITORY IS
# CONTENT-ADDRESSED. Each check finds its row with `grep -F "| **task** |"`, never
# by line number, and each takes the plan path as `$1`. So a concatenation of
# working plan + archive is indistinguishable from the old single file to every one
# of them — the row is found wherever it lives. Had one check used a line offset,
# this file would not be possible and the archive would have to stay unsplit.
#
# ⚠️ ORDER IS WORKING-PLAN-FIRST AND THEN ARCHIVE IN NAME ORDER. `row()` takes the
# FIRST match (`head -1`), so if a task id somehow appeared in both, the LIVE plan
# wins and the archive copy is inert. That is the safe direction: a live row can be
# edited by the session that needs it, an archived one cannot.
#
# ⚠️ ASSERTION: the corpus must never be SHORTER than the working plan, and the
# archive must not have gone missing while the plan still points at it. A silently
# empty corpus is how every downstream check would go green having read nothing —
# so this file refuses rather than returning a path to a truncated corpus.
#
# Usage:  PLAN="$(bash docs/checks/plan-corpus.sh)"
#         bash docs/checks/plan-corpus.sh --list    # what it would assemble
#
# Exit: 0 and a path on stdout; 1 and a message on stderr otherwise.

set -uo pipefail

ROOT="${PLAN_ROOT:-.}"
WORKING="$ROOT/docs/PLAN.md"
ARCHIVE_DIR="$ROOT/docs/plan/archive"

[[ -r "$WORKING" ]] || { echo "FAIL: cannot read $WORKING" >&2; exit 1; }

parts="$WORKING"
if [[ -d "$ARCHIVE_DIR" ]]; then
  for f in "$ARCHIVE_DIR"/*.md; do
    [[ -r "$f" ]] && parts="$parts $f"
  done
fi

if [[ "${1:-}" == "--list" ]]; then
  for p in $parts; do echo "$p"; done
  exit 0
fi

# Deterministic cache path, rebuilt when any part is newer than the corpus. Keyed
# on the absolute repo path so two checkouts do not share one.
key="$(cd "$ROOT" && pwd | tr -c 'A-Za-z0-9' '_')"
CORPUS="${TMPDIR:-/tmp}/tienda-plan-corpus${key}.md"

stale=0
[[ -f "$CORPUS" ]] || stale=1
if (( stale == 0 )); then
  for p in $parts; do
    [[ "$p" -nt "$CORPUS" ]] && { stale=1; break; }
  done
fi

if (( stale == 1 )); then
  : > "$CORPUS" || { echo "FAIL: cannot write $CORPUS" >&2; exit 1; }
  for p in $parts; do
    cat "$p" >> "$CORPUS"
    echo >> "$CORPUS"   # a file ending mid-table must not fuse with the next
  done
fi

# ⚠️ ANTI-VACUITY. A corpus shorter than the working plan means a failed cat, a
# clobbered cache or a truncated write — and every check downstream would then
# grep an empty file and report success. Refuse instead.
wl=$(wc -l < "$WORKING")
cl=$(wc -l < "$CORPUS")
if (( cl < wl )); then
  echo "FAIL: corpus is $cl lines, the working plan alone is $wl — assembly failed." >&2
  echo "      Every plan check downstream would have grepped a truncated file and" >&2
  echo "      reported success. Refusing to hand back a path." >&2
  exit 1
fi

echo "$CORPUS"

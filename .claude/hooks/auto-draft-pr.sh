#!/usr/bin/env bash
# Opens a draft PR to the default branch when a Claude Code session ends.
#
# Silent no-op unless ALL of these hold:
#   - we are inside a git repo
#   - HEAD is a named branch that is NOT the default branch
#   - origin is a github.com remote
#   - gh is installed and authenticated
#   - the branch has at least one commit the base does not
#
# If a PR already exists for the branch it just pushes. Never blocks the session:
# every failure path exits 0.

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null) || exit 0
[ -n "$branch" ] || exit 0                       # detached HEAD

base=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
base=${base:-main}
[ "$branch" != "$base" ] || exit 0                # never PR main into main

git remote get-url origin 2>/dev/null | grep -q 'github\.com' || exit 0
command -v gh >/dev/null 2>&1 || exit 0
gh auth status >/dev/null 2>&1 || exit 0

# Prefer the remote base ref; fall back to the local branch.
if git rev-parse --verify --quiet "origin/$base" >/dev/null 2>&1; then
  baseref="origin/$base"
elif git rev-parse --verify --quiet "$base" >/dev/null 2>&1; then
  baseref="$base"
else
  exit 0
fi

ahead=$(git rev-list --count "$baseref..$branch" 2>/dev/null) || exit 0
[ "${ahead:-0}" -gt 0 ] || exit 0                 # nothing to propose

existing=$(gh pr view "$branch" --json url --jq .url 2>/dev/null)
if [ -n "$existing" ]; then
  git push --quiet origin "$branch" >/dev/null 2>&1
  printf '{"systemMessage":"Pushed %s commit(s) to existing PR: %s"}\n' "$ahead" "$existing"
  exit 0
fi

git push --quiet -u origin "$branch" >/dev/null 2>&1 || exit 0

url=$(gh pr create --draft --base "$base" --head "$branch" --fill 2>/dev/null | grep -Eo 'https://[^[:space:]]+' | tail -1)
[ -n "$url" ] || exit 0
printf '{"systemMessage":"Opened draft PR (%s commit(s)) -> %s : %s"}\n' "$ahead" "$base" "$url"

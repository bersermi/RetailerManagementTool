#!/usr/bin/env bash
# ============================================================================
# THE TWO SETTINGS OUTSIDE THIS REPOSITORY THAT ITACATE'S SIGN-IN NEEDS. Plan
# task `10.5-iii-a`. The owner runs it once — a session's own write to either is
# refused by its permission check (*Secret-Store Writes* on EAS, *Modify Shared
# Resources* on the hosted project) — and anyone reads both back with `--check`.
#
#   bash docs/runbooks/set-itacate-sign-in.sh            # makes both, then reads both back
#   bash docs/runbooks/set-itacate-sign-in.sh --check    # reads both back, changes nothing
#
# 1. ITACATE'S EAS PROJECT HOLDS THE THREE VALUES ITS BUNDLE READS, in `preview`:
#    the database's address and publishable key, and the support number its
#    *¿Olvidaste tu contraseña?* opens — copied from Wera Cocina's project (Wera's
#    values), never printed. Without them `ship-an-update.sh --app itacate`
#    refuses to publish. ⚠️ `production` waits for Itacate's way out (`10.5-iii-b`):
#    no store version carries a sign-in before it.
# 2. THE HOSTED PROJECT ACCEPTS ITACATE: `mx.wera.vecino` among the Apple
#    provider's client ids — without it Supabase refuses Apple's token
#    (*Unacceptable audience*) — and `mx.wera.vecino://**` on the redirect list —
#    without it Google's sign-in hangs, because GoTrue sends the browser to the
#    Site URL instead of back to the app. Every entry already there is kept. A
#    PATCH of those two fields to the Management API, with the token in this
#    Mac's keychain item `Supabase CLI`, never printed.
#
# Wera Cocina's twin of step 2 was his command of 2026-10-30 (the plan's status
# log). Apple's portal is not touched: one person has one Apple id across the
# team's apps, grouped or not; grouping Itacate under Wera's App ID is for
# telling Apple about a deletion, `10.5-iii-b`.
# ============================================================================
set -euo pipefail

mode="${1:-}"
[[ -z "$mode" || "$mode" == "--check" ]] || { echo "usage: bash docs/runbooks/set-itacate-sign-in.sh [--check]" >&2; exit 2; }

root="$(git rev-parse --show-toplevel)"
PROJECT_REF="hweutzjhzvioswnjzqki"
API="https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth"
APP_ID="mx.wera.vecino"
NEEDED="EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY EXPO_PUBLIC_SUPPORT_WHATSAPP"
fails=0

eas() { npx --yes eas-cli@24 "$@"; }
# One environment's `NAME=value` lines, colours off. ⚠️ Values included: never echo this.
listing() {
  (cd "$root/$1" && eas env:list --environment preview --format short --include-sensitive 2>/dev/null) \
    | sed -E 's/\x1b\[[0-9;]*m//g'
}
value_of() { sed -n "s/^$1=//p" <<<"$2" | head -1; }
digest() { printf '%s' "$1" | shasum -a 256 | cut -c1-12; }

# --- 1. Itacate's EAS project ------------------------------------------------
echo "1. Itacate's EAS project, 'preview' (values copied from Wera Cocina's, never shown)"
if ! eas whoami >/dev/null 2>&1; then
  echo "  REFUSED: this Mac is not logged in to Expo. Run: npx eas-cli login" >&2
  exit 1
fi
cocina="$(listing cocina)"
itacate="$(listing itacate)"
for name in $NEEDED; do
  from="$(value_of "$name" "$cocina")"
  if [[ -z "$from" ]]; then
    echo "  FAIL  Wera Cocina's 'preview' has no $name to copy" >&2
    fails=$((fails + 1))
    continue
  fi
  have="$(value_of "$name" "$itacate")"
  if [[ -z "$have" && "$mode" != "--check" ]]; then
    visibility="plaintext"
    [[ "$name" == "EXPO_PUBLIC_SUPPORT_WHATSAPP" ]] && visibility="sensitive"
    if ! (cd "$root/itacate" && eas env:create --scope project --environment preview --name "$name" \
          --value "$from" --visibility "$visibility" --non-interactive >/dev/null 2>&1); then
      echo "  FAIL  could not create $name in Itacate's 'preview'" >&2
      fails=$((fails + 1))
      continue
    fi
  fi
done
itacate="$(listing itacate)"
for name in $NEEDED; do
  from="$(value_of "$name" "$cocina")"
  have="$(value_of "$name" "$itacate")"
  if [[ -z "$have" ]]; then
    echo "  FAIL  Itacate's 'preview' has no $name"
    fails=$((fails + 1))
  elif [[ -n "$from" && "$(digest "$have")" == "$(digest "$from")" ]]; then
    echo "  ok    $name — ${#have} characters, the same as Wera Cocina's"
  else
    echo "  FAIL  $name differs from Wera Cocina's"
    fails=$((fails + 1))
  fi
done

# --- 2. The hosted project's sign-in settings --------------------------------
echo "2. The hosted project's sign-in settings"
token="$(security find-generic-password -s 'Supabase CLI' -w 2>/dev/null || true)"
if [[ -z "$token" ]]; then
  echo "  REFUSED: no Supabase token in this Mac's keychain (item 'Supabase CLI'). Run: supabase login" >&2
  exit 1
fi
read_auth() {
  curl -sS --fail -H "Authorization: Bearer $token" "$API"
}
# The two fields, as they would be with Itacate in them; every other entry kept, in order.
with_itacate() {
  node -e '
    const c = JSON.parse(process.argv[1]), id = process.argv[2];
    const add = (list, item) => { const a = (list || "").split(",").map(s => s.trim()).filter(Boolean); if (!a.includes(item)) a.push(item); return a.join(","); };
    console.log(JSON.stringify({ external_apple_client_id: add(c.external_apple_client_id, id), uri_allow_list: add(c.uri_allow_list, id + "://**") }));
  ' "$1" "$APP_ID"
}
if ! before="$(read_auth)"; then
  echo "  FAIL  could not read the hosted project's sign-in settings" >&2
  exit 1
fi
wanted="$(with_itacate "$before")"
current="$(node -e 'const c=JSON.parse(process.argv[1]);console.log(JSON.stringify({external_apple_client_id:c.external_apple_client_id||"",uri_allow_list:c.uri_allow_list||""}))' "$before")"
if [[ "$wanted" != "$current" && "$mode" != "--check" ]]; then
  if ! curl -sS --fail -o /dev/null -X PATCH -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
        --data "$wanted" "$API"; then
    echo "  FAIL  the hosted project refused the change" >&2
    exit 1
  fi
fi
after="$(read_auth)"
node -e '
  const c = JSON.parse(process.argv[1]), id = process.argv[2];
  const ids = (c.external_apple_client_id || "").split(","), uris = (c.uri_allow_list || "").split(",");
  const line = (ok, what) => console.log((ok ? "  ok    " : "  FAIL  ") + what);
  const checks = [
    [ids.includes(id), "Apple client ids: " + c.external_apple_client_id],
    [uris.includes(id + "://**"), "redirect list: " + c.uri_allow_list],
    [c.external_apple_enabled === true && c.external_google_enabled === true && c.external_email_enabled === true,
     "Apple, Google and email sign-in on"],
  ];
  for (const [ok, what] of checks) line(ok, what);
  process.exit(checks.filter(([ok]) => !ok).length);
' "$after" "$APP_ID" || fails=$((fails + $?))

echo
if [[ "$fails" -gt 0 ]]; then
  echo "$fails setting(s) missing — Itacate's sign-in is not ready."
  exit 1
fi
echo "both settings hold — Itacate's update can ship, and its Google and Apple sign-ins reach the hosted project."

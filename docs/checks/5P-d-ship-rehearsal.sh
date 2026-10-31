#!/usr/bin/env bash
# ============================================================================
# DOES `docs/runbooks/ship-an-update.sh` STILL REFUSE WHAT IT MUST, AND STILL
# CLEAR THE BUNDLER'S CACHE? Plan task `5P-d`.
#
#   bash docs/checks/5P-d-ship-rehearsal.sh             # every case (it prints the count)
#   bash docs/checks/5P-d-ship-rehearsal.sh --falsify   # broken copies, each red for its reason
#
# ⚠️ No count is written here: this header said "the ten cases" while the
# script ran thirteen (found by `10.4b-iii-a`, which added Wera Cocina's
# `--app cocina` cases). The runner's own line is the number.
#
# The runbook is the one command that puts JavaScript on a shop's phone, and it
# is run by hand, months apart. Two of its lines guard things nothing else does:
#   - `production` is refused while its EAS environment holds `EXPO_PUBLIC_PILOT`,
#     the value that makes a bundle take the pilot's readings (ADR-035 §5: not in
#     a store build);
#   - every publish passes `--clear-cache`, because Metro keeps the `EXPO_PUBLIC_`
#     values of the export before it (measured 2026-10-13, in the runbook's header).
#
# ⚠️ WHAT THIS IS NOT: nothing here reaches EAS or runs Metro. `npx` is a stub
# that answers `whoami`, `env:list`, the fingerprint and `build:list` from files,
# and prints the `eas update` it was asked for instead of running it. So this
# reads the runbook's DECISIONS. That a cleared cache really does pick up a new
# value was measured by hand, once, and is not re-measured here.
#
# The runbook asserts a clean tree whose HEAD is on origin/main, so each run is
# in a scratch repository made for it, with a copy of the runbook as its only file.
# ============================================================================
set -uo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
runbook="$here/../runbooks/ship-an-update.sh"
mode="${1:-}"
[[ -z "$mode" || "$mode" == "--falsify" ]] || { echo "usage: bash docs/checks/5P-d-ship-rehearsal.sh [--falsify]" >&2; exit 2; }
[[ -f "$runbook" ]] || { echo "no runbook at $runbook" >&2; exit 2; }

scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT

mkdir -p "$scratch/bin"
cat > "$scratch/bin/npx" <<'STUB'
#!/usr/bin/env bash
args="$*"
case "$args" in
  *"eas-cli@24 whoami"*) echo stub; exit 0 ;;
  *"eas-cli@24 env:list"*)
    env=""; prev=""
    for a in "$@"; do [[ "$prev" == "--environment" ]] && env="$a"; prev="$a"; done
    printf '\nEnvironment: %s\n' "$env"
    cat "$STUB_DIR/env-$env"; exit 0 ;;
  *"expo-updates fingerprint:generate"*) echo '{"hash":"stubruntime"}'; exit 0 ;;
  *"eas-cli@24 build:list"*) echo '[{"id":"x"}]'; exit 0 ;;
  *"eas-cli@24 update"*) echo "STUB-PUBLISH: $args (in $(basename "$PWD"))"; exit 0 ;;
esac
echo "stub npx: unexpected: $args" >&2; exit 97
STUB
chmod +x "$scratch/bin/npx"

# A scratch repository whose HEAD is its origin/main, holding one runbook.
repo_for() {
  local copy="$1"
  local dir="$2"
  rm -rf "$dir" "$dir.git"
  mkdir -p "$dir/app" "$dir/cocina" "$dir/docs/runbooks"
  cp "$copy" "$dir/docs/runbooks/ship-an-update.sh"
  ( cd "$dir" \
    && git init -q -b main \
    && git add -A \
    && git -c user.name=rehearsal -c user.email=rehearsal@example.invalid commit -q -m seed \
    && git clone -q --bare . "$dir.git" \
    && git remote add origin "$dir.git" \
    && git fetch -q origin ) || { echo "could not make the scratch repository" >&2; exit 2; }
}

three=$'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=k\nEXPO_PUBLIC_SUPABASE_URL=u\nEXPO_PUBLIC_SUPPORT_WHATSAPP=w'
with_pilot="$three"$'\nEXPO_PUBLIC_PILOT=piloto-1'
refused="REFUSED: EAS's 'production' environment holds EXPO_PUBLIC_PILOT"
publish_line="STUB-PUBLISH: --yes eas-cli@24 update --channel production --environment production --platform all --message mensaje --clear-cache --non-interactive (in app)"
# ⚠️ `10.4b-iii-a`: the database's two values alone. Since `10.4b-iv-b` Wera Cocina
# needs Wera's three — its *¿Olvidaste tu contraseña?* reads the support number —
# so this is what an environment missing that number looks like, for both apps.
two=$'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=k\nEXPO_PUBLIC_SUPABASE_URL=u'

# One case: the runbook's exit code AND a sentence it printed. Prints `ok` or `FAIL`.
one() {
  local dir="$1"
  local name="$2"
  local channel="$3"
  local flag="$4"
  local body="$5"
  local want="$6"
  local text="$7"
  printf '%s\n' "$body" > "$scratch/env-$channel"
  local out
  local code
  if [[ -n "$flag" ]]; then
    # ⚠️ A FLAG MAY BE SEVERAL WORDS (`--check --only android`), split here on
    # purpose — and never an empty array, which bash 3.2's `set -u` refuses.
    local -a flags
    read -r -a flags <<<"$flag"
    out="$(cd "$dir" && STUB_DIR="$scratch" PATH="$scratch/bin:$PATH" bash docs/runbooks/ship-an-update.sh "$channel" mensaje "${flags[@]}" 2>&1)"
    code=$?
  else
    out="$(cd "$dir" && STUB_DIR="$scratch" PATH="$scratch/bin:$PATH" bash docs/runbooks/ship-an-update.sh "$channel" mensaje 2>&1)"
    code=$?
  fi
  if [[ "$code" == "$want" ]] && grep -qF -- "$text" <<<"$out"; then
    echo "  ok    $name"
  else
    echo "  FAIL  $name (exit $code; wanted $want and: $text)"
  fi
}

N_PROD_CHECK="production holding the pilot value is refused, by name"
N_PROD_PUBLISH="production holding it is refused when publishing, and nothing is sent"
N_PROD_CLEAN="production without it passes, and says the readings are off"
N_PREVIEW_ON="preview holding it says ON and names the label"
N_PREVIEW_OFF="preview without it says off"
N_COLOUR="a coloured listing is still read"
N_LOOKALIKE="a name that merely contains it is not it"
N_FIRST="a missing Supabase value is still refused"
N_CLEAR="a preview publish clears the bundler cache"
N_PROD_SENT="a clean production publish goes out, cache cleared"
N_ONLY_SENT="--only android publishes to Android alone"
N_ONLY_CHECK="--check with --only names the one platform it would reach"
N_ONLY_BAD="--only with a platform that is not one is refused"
N_COCINA_SENT="--app cocina publishes from Wera Cocina's folder"
N_COCINA_CHECK="Wera Cocina with the database's two values and the support number passes"
N_COCINA_THREE="Wera Cocina without the support number is refused"
N_WERA_THREE="Wera without its support number is still refused"
N_COCINA_FIRST="Wera Cocina without the database's key is refused"
N_APP_BAD="--app with an app this runbook does not ship is refused"

cases() {
  local dir="$1"
  one "$dir" "$N_PROD_CHECK"   production --check "$with_pilot" 1 "$refused"
  one "$dir" "$N_PROD_PUBLISH" production ""      "$with_pilot" 1 "$refused"
  one "$dir" "$N_PROD_CLEAN"   production --check "$three"      0 "readings: off"
  one "$dir" "$N_PREVIEW_ON"   preview    --check "$with_pilot" 0 'under "piloto-1"'
  one "$dir" "$N_PREVIEW_OFF"  preview    --check "$three"      0 "readings: off"
  one "$dir" "$N_COLOUR"       production --check "$three"$'\n\x1b[1mEXPO_PUBLIC_PILOT\x1b[22m=piloto-1' 1 "$refused"
  one "$dir" "$N_LOOKALIKE"    production --check "$three"$'\nEXPO_PUBLIC_PILOT_NOTE=x' 0 "readings: off"
  one "$dir" "$N_FIRST"        preview    --check $'EXPO_PUBLIC_SUPABASE_URL=u\nEXPO_PUBLIC_PILOT=piloto-1' 1 "has no EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  one "$dir" "$N_CLEAR"        preview    ""      "$with_pilot" 0 "--clear-cache"
  one "$dir" "$N_PROD_SENT"    production ""      "$three"      0 "$publish_line"
  one "$dir" "$N_ONLY_SENT"    production "--only android" "$three" 0 "--platform android --message mensaje"
  one "$dir" "$N_ONLY_CHECK"   production "--check --only android" "$three" 0 "for android"
  one "$dir" "$N_ONLY_BAD"     production "--only windows" "$three" 2 "usage:"
  one "$dir" "$N_COCINA_SENT"  preview    "--app cocina" "$three" 0 "--clear-cache --non-interactive (in cocina)"
  one "$dir" "$N_COCINA_CHECK" preview    "--check --app cocina" "$three" 0 "to Wera Cocina's 'preview'"
  one "$dir" "$N_COCINA_THREE" preview    "--check --app cocina" "$two" 1 "has no EXPO_PUBLIC_SUPPORT_WHATSAPP"
  one "$dir" "$N_WERA_THREE"   preview    --check "$two" 1 "has no EXPO_PUBLIC_SUPPORT_WHATSAPP"
  one "$dir" "$N_COCINA_FIRST" preview    "--check --app cocina" 'EXPO_PUBLIC_SUPABASE_URL=u' 1 "has no EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  one "$dir" "$N_APP_BAD"      preview    "--app itacate" "$two" 2 "usage:"
}

if [[ -z "$mode" ]]; then
  repo_for "$runbook" "$scratch/real"
  out="$(cases "$scratch/real")"
  echo "$out"
  red="$(grep -c '^  FAIL' <<<"$out")"
  green="$(grep -c '^  ok' <<<"$out")"
  if [[ "$red" -ne 0 ]]; then
    echo
    echo "$red of $((red + green)) case(s) failed — ship-an-update.sh no longer decides what its header says."
    exit 1
  fi
  echo
  echo "all $green cases passed — the runbook refuses a store update that would take readings, and clears the cache."
  exit 0
fi

# --- --falsify: a broken copy must turn the case that guards it red ---------
bad=0
tried=0
broken() {
  local name="$1"
  local from="$2"
  local to="$3"
  local must_fail="$4"
  local copy="$scratch/broken.sh"
  tried=$((tried + 1))
  FROM="$from" TO="$to" node -e '
    const fs = require("fs");
    const s = fs.readFileSync(process.argv[1], "utf8");
    fs.writeFileSync(process.argv[2], s.split(process.env.FROM).join(process.env.TO));
  ' "$runbook" "$copy"
  if cmp -s "$runbook" "$copy"; then
    echo "  FAIL  $name — the breakage did not apply; the runbook no longer has: $from"
    bad=$((bad + 1))
    return
  fi
  repo_for "$copy" "$scratch/broken"
  local out
  out="$(cases "$scratch/broken")"
  if grep -qF -- "  FAIL  $must_fail" <<<"$out"; then
    echo "  ok    $name — red on: $must_fail"
  else
    echo "  FAIL  $name — stayed green on: $must_fail"
    bad=$((bad + 1))
  fi
}

broken "the publish without the cache clear" \
  '--clear-cache --non-interactive' '--non-interactive' "$N_CLEAR"
broken "the refusal aimed at a channel nobody ships to" \
  '[[ "$channel" == "production" ]]; then' '[[ "$channel" == "nowhere" ]]; then' "$N_PROD_PUBLISH"
broken "the name matched loosely" \
  'grep -qx "EXPO_PUBLIC_PILOT" <<<"$env_names"' 'grep -q "EXPO_PUBLIC_PILOT" <<<"$env_names"' "$N_LOOKALIKE"
broken "the listing read with its colours on" \
  'env_names="$(sed -E '"'"'s/\x1b\[[0-9;]*m//g'"'"' <<<"$env_out" | cut -d= -f1)"' 'env_names="$(cut -d= -f1 <<<"$env_out")"' "$N_COLOUR"

broken "--only that leaves nothing out" \
  'if [[ -n "$only" && "$platform" != "$only" ]]; then' 'if [[ -n "$only" && "$platform" == "nowhere" ]]; then' "$N_ONLY_SENT"
broken "--app that is read and then ignored" \
  'cd "$root/$app"' 'cd "$root/app"' "$N_COCINA_SENT"
# ⚠️ `10.4b-iv-b`: an update to Wera Cocina built without the support number has no
# *¿Olvidaste tu contraseña?*, and nothing on the phone says so.
broken "Wera Cocina's list without the support number" \
  'label="Wera Cocina"; needed="EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY EXPO_PUBLIC_SUPPORT_WHATSAPP"' \
  'label="Wera Cocina"; needed="EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"' "$N_COCINA_THREE"

echo
if [[ "$bad" -ne 0 ]]; then
  echo "$bad broken copy(ies) were not caught — the rehearsal cannot fail where it should."
  exit 1
fi
echo "all $tried broken copies turned their case red — the rehearsal can still fail."

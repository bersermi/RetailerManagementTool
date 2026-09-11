#!/usr/bin/env bash
# 5a-iii-gate — is the hosted Supabase project actually configured the way the
# plan says it is?
#
# WHY THIS EXISTS. `5a-iii`'s gate was cleared on 2026-09-11 by running these
# assertions by hand, and they found TWO things no file in this repository could
# have: Google was built in the Google Cloud console but NOT enabled on the
# Supabase side — two separate halves, one of them done — and email confirmation
# was still on, which would have parked every signup behind a rate-limited
# built-in mailer. Both were reported as done in good faith. Neither was.
#
# ⚠️ THIS CHECK CANNOT RUN IN CI, AND SAYING SO IS THE POINT. It needs
# `app/.env.local`, which is gitignored, and it needs the network. So it is NOT
# evidence in the sense ADR-035 §9 means — it is the local instrument for a
# surface that lives in someone else's dashboard and has no file to read. The
# rule it obeys instead is the one underneath §9: DO NOT BELIEVE A REPORT WHEN
# YOU CAN MEASURE. Run it whenever the auth config is said to have changed.
#
# ⚠️ IT NEVER PRINTS A VALUE. The publishable key is public by design, but a
# transcript is a different blast radius from an app binary, and the one key
# that must never appear is exactly the one a mistake would put here.
#
# Run:  bash docs/checks/5a-iii-gate.sh
# Exit: 0 all assertions hold; 1 otherwise, naming each failure.

set -uo pipefail

ENV_FILE="${1:-app/.env.local}"
fails=0
ran=0

# ⚠️ THE SAME STRING AS `app/src/auth/oauth.ts`'s `OAUTH_REDIRECT_URI` and as
# `app.json`'s scheme. `app/test/oauth.test.ts` ties those two together in CI;
# this is the third copy, and it is here because this is the only instrument
# that can send it to the live project. If they ever disagree, the phone is the
# one that finds out.
REDIRECT_URI='mx.bserafin.wera://auth/callback'

fail() { echo "FAIL: $*"; fails=$((fails+1)); }
ok()   { echo "  ok    $*"; }
assert() { ran=$((ran+1)); if [[ "$1" == "true" ]]; then ok "$2"; else fail "$2"; fi; }

# --- the file -------------------------------------------------------------
if [[ ! -r "$ENV_FILE" ]]; then
  echo "FAIL: cannot read $ENV_FILE."
  echo "      It is gitignored by design (app/.gitignore, \`.env*.local\`) and must be"
  echo "      created by hand from app/.env.example. See plan task 5a-iii."
  exit 1
fi

# Read without exporting into this shell's environment any longer than needed.
URL="$(grep -E '^EXPO_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
KEY="$(grep -E '^EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2-)"

assert "$([[ -n "$URL" ]] && echo true || echo false)" \
  "EXPO_PUBLIC_SUPABASE_URL is present and non-empty"
assert "$([[ -n "$KEY" ]] && echo true || echo false)" \
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is present and non-empty"

# ⚠️ THE NEXT_PUBLIC_ TRAP, AND IT IS NOT HYPOTHETICAL. Supabase's Connect
# dialog has a framework picker and hands out the Next.js spelling by default;
# the owner pasted exactly that on 2026-09-11. Expo inlines ONLY EXPO_PUBLIC_,
# so the Next spelling is not a wrong value, it is NO value — `undefined` — and
# it surfaces as a broken client rather than as a misnamed variable.
assert "$(grep -qE '^NEXT_PUBLIC_' "$ENV_FILE" && echo false || echo true)" \
  "no NEXT_PUBLIC_ names (Expo inlines only EXPO_PUBLIC_; the Next spelling is undefined)"

assert "$(echo "$URL" | grep -qE '^https://[a-z0-9]+\.supabase\.co$' && echo true || echo false)" \
  "URL is https://<ref>.supabase.co with no trailing slash or quotes"

# ⚠️⚠️ THE ONE THAT MATTERS MOST. A secret key in a file the client reads hands
# every phone a key that bypasses RLS entirely — and RLS is the whole of what
# protects this data. It looks identical to the correct key until someone reads
# the prefix, which is why a machine reads it.
assert "$(echo "$KEY" | grep -qE '^sb_secret_|service_role' && echo false || echo true)" \
  "the key is NOT a service_role / sb_secret_ key (it would bypass RLS on every phone)"

assert "$(echo "$KEY" | grep -qE '^sb_publishable_|^eyJ' && echo true || echo false)" \
  "the key is a recognised client key shape (sb_publishable_ or a legacy anon JWT)"

if (( fails > 0 )); then
  echo
  echo "$ran assertions ran, $fails failed — not calling the project with this."
  exit 1
fi

# --- the live project -----------------------------------------------------
BODY="$(mktemp)"; trap 'rm -f "$BODY"' EXIT
CODE="$(curl -s --max-time 20 -o "$BODY" -w '%{http_code}' \
        -H "apikey: $KEY" "$URL/auth/v1/settings" 2>/dev/null || echo 000)"

if [[ "$CODE" != "200" ]]; then
  echo "FAIL: GET $URL/auth/v1/settings returned HTTP $CODE, not 200."
  echo "      000 means the request never completed — no network, or the project"
  echo "      is paused. A non-200 with a body usually means the key is wrong."
  exit 1
fi
ok "the project answers, and the key is accepted (HTTP 200)"
ran=$((ran+1))

# ⚠️ THE EXPECTATIONS ARE THE PLAN'S, NOT THE PROJECT'S. Facebook is `false` on
# purpose — it was deferred to `5i` on 2026-09-11 — so this check goes RED if
# somebody enables it in the dashboard without the task that owns it. A config
# surface nobody asserts over drifts, and this one has no file to diff.
read_json() { node -e '
  const fs=require("fs"); const s=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
  const e=s.external||{};
  const out={ google:!!e.google, email:!!e.email, facebook:!!e.facebook, phone:!!e.phone,
              autoconfirm:s.mailer_autoconfirm===true, signups:!s.disable_signup };
  console.log(Object.entries(out).map(([k,v])=>k+"="+v).join(" "));
' "$1"; }

STATE="$(read_json "$BODY")" || { echo "FAIL: could not parse the settings response"; exit 1; }
get() { echo "$STATE" | tr ' ' '\n' | grep -E "^$1=" | cut -d= -f2; }

expect() { # name expected why
  ran=$((ran+1))
  local got; got="$(get "$1")"
  if [[ "$got" == "$2" ]]; then ok "$1 is $2 — $3"
  else fail "$1 is $got, expected $2 — $3"; fi
}

expect google      true  "C1.4, and the Supabase half is separate from the Google Cloud half"
expect email       true  "C1.4"
expect facebook    false "deferred to 5i on 2026-09-11 — enabling it here skips that task"
expect phone       false "C1.4 refuses phone auth outright"
expect autoconfirm true  "confirmations OFF; the built-in mailer is rate-limited and not for production"
expect signups     true  "5b's onboarding cannot work if signups are disabled"

# --- the round trip, as far as it can be walked without a browser ----------
# Added in 5a-iii-b. The provider matrix above says Google is ENABLED; it says
# nothing about whether the round trip it enables actually goes anywhere, and
# those are two different dashboards with one string shared between them.
if (( fails == 0 )); then
  ENC="$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$REDIRECT_URI")"
  GOOGLE_URL="$(curl -s -o /dev/null --max-time 20 -w '%{redirect_url}' \
                -H "apikey: $KEY" "$URL/auth/v1/authorize?provider=google&redirect_to=$ENC")"

  ran=$((ran+1))
  if [[ "$GOOGLE_URL" == https://accounts.google.com/* ]]; then
    ok "/auth/v1/authorize hands the phone to accounts.google.com"
  else
    fail "/auth/v1/authorize did not redirect to Google (got: ${GOOGLE_URL:-nothing})"
  fi

  # ⚠️⚠️ THE ASSERTION THAT COVERS THE *OTHER* CONSOLE. Google rejects an
  # authorize request whose `redirect_uri` is not on the OAuth client's
  # Authorized redirect URIs list — `Error 400: redirect_uri_mismatch` — and
  # that list lives in the Google Cloud console, which has no file here either.
  # The gate's founding finding was the inverse of this one: Google built in
  # the Cloud console and NOT enabled on the Supabase side. Both halves are now
  # measured, and a project ref that changes breaks exactly this.
  if [[ -n "$GOOGLE_URL" ]]; then
    PAGE="$(mktemp)"
    GCODE="$(curl -s -L --max-time 25 -o "$PAGE" -w '%{http_code}' "$GOOGLE_URL" 2>/dev/null || echo 000)"
    ran=$((ran+1))
    if [[ "$GCODE" == "200" ]] && ! grep -qE 'redirect_uri_mismatch|invalid_client|Error 4[0-9][0-9]' "$PAGE"; then
      ok "Google accepts the client and its redirect_uri — the Cloud console half holds"
    else
      fail "Google refused the authorize request (HTTP $GCODE). A redirect_uri_mismatch"
      fail "  means the Cloud console's Authorized redirect URIs is missing"
      fail "  $URL/auth/v1/callback"
    fi
    rm -f "$PAGE"
  fi
fi

# ⚠️⚠️ WHAT THIS CHECK DELIBERATELY DOES NOT ASSERT, AND THE MEASUREMENT THAT
# SETTLED IT. Supabase's Redirect URLs allow-list must contain
# `mx.bserafin.wera://**`, and that is the single most likely cause of
# 5a-iii-b's characteristic failure — the browser opens and never comes back.
# An assertion over it was WRITTEN AND THEN DELETED: `/auth/v1/authorize`
# returns the SAME 302 to Google for `redirect_to=mx.bserafin.wera://...` and
# for `redirect_to=https://evil.example.com/steal`. GoTrue validates the
# redirect at the CALLBACK step, after the provider returns, and a disallowed
# one is not an error — the browser is quietly sent to the project's Site URL
# instead. So a check here would have run, passed, and looked at nothing, which
# is this repository's most-repeated defect. It belongs to 5a-iv and the phone.

echo
if (( fails > 0 )); then
  echo "$ran assertions ran, $fails failed."
  exit 1
fi
# ⚠️ THE ANTI-VACUITY GUARD, and it is rule 4 of this repository. Every failure
# path above exits early, so "0 failures" is also what an empty run looks like.
if (( ran < 14 )); then
  echo "FAIL: only $ran assertions ran, expected at least 14 — this check asserted"
  echo "      almost nothing and was about to report success."
  exit 1
fi
echo "all $ran assertions passed — the 5a-iii gate holds, values not printed."

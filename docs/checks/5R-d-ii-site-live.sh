#!/usr/bin/env bash
# 5R-d-ii-site-live — is tu-wera.com actually serving the pages in site/, from
# GitHub Pages, with the blanks filled and no cookies?
#
# WHY THIS EXISTS. A green `site` workflow proves the pages BUILT and were handed
# to GitHub. It says nothing about the domain: the DNS records are typed by the
# owner at GoDaddy, the HTTPS certificate is issued by GitHub only after those
# records resolve, and the email forwarding is a third service. This is the half
# CI cannot reach, so — like 5R-f-schema-deployed.sh — it is a check a session runs.
#
# WHAT IT ASSERTS:
#
#   1. tu-wera.com resolves to GitHub Pages' four addresses, and to nothing else
#      (GoDaddy's parking answers 3.33.130.190 and 15.197.148.33).
#   2. www.tu-wera.com is a CNAME to bersermi.github.io.
#   3. /, /privacidad/, /privacidad/cocina-e-itacate/ (the two new apps, plans
#      `10.2b` and `10.4b-iv-b`), /terminos/cocina-e-itacate/ (their terms, with
#      the notice Google's terms ask of an app with its map, `10.4g-i`),
#      /eliminar-cuenta/, /eliminar-cuenta/cocina/ (Wera Cocina's, the link its
#      Play Data safety form gives), /eliminar-cuenta/itacate/ (Itacate's, the same,
#      `10.5-iii-b`) and /estilo.css answer 200 over HTTPS, served by GitHub.
#   4. ⚠️ No response sets a cookie — the pages say *"Este sitio no usa cookies"*.
#   5. ⚠️ No page holds `{{` — the aviso names its responsable.
#   6. Both avisos and the terms served are the ones on this checkout (their date
#      lines match).
#   7. http:// redirects to https://.
#   8. tu-wera.com has MX records, so privacidad@ and ayuda@ can receive mail.
#      ⚠️ It cannot prove the mail is FORWARDED — only a test email can.
#   9. ⚠️ `10.9c` — a kitchen's address (/cocina/, in 3–5) and the two files that
#      hand it to Itacate: /.well-known/apple-app-site-association and
#      /.well-known/assetlinks.json answer 200 with no redirect, byte for byte this
#      checkout's — and, what the phones themselves read, Apple's CDN holds the
#      iPhone's file (it fetches on its own schedule: red for some hours after a
#      change is not a broken site) and Google's Digital Asset Links API reads
#      Itacate's package from Android's. Neither proves a phone opens Itacate: a
#      phone's `pm get-app-links` (Android) or a tap on the link (an iPhone) does.
#
# ⚠️ IT ASKS A PUBLIC RESOLVER (1.1.1.1), NOT THIS MAC'S. Measured 2026-10-13: an
# hour after the owner changed the records, this Mac's resolver still answered
# GoDaddy's old address — even for a query aimed at GoDaddy's own nameservers,
# with a TTL counting down, so something on the path caches port 53 — while
# 1.1.1.1, 8.8.8.8 and 9.9.9.9 all had the new records. A check that read the
# stale cache went red on a domain the world could already reach. Every curl
# below is pinned to the address the public resolver gives.
#
# --before-dns asks GitHub's servers directly (tu-wera.com pinned to
# 185.199.108.153, over http) and asserts only 3–6. It proves the deploy, never
# the domain; say so when you report it.
#
# Run:  bash docs/checks/5R-d-ii-site-live.sh [--before-dns]
# Exit: 0 when every assertion holds; 1 otherwise, naming each one that does not.

set -uo pipefail

DOMAIN="tu-wera.com"
RESOLVER="1.1.1.1"
PAGES_IPS="185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153"
MODE="${1:-}"

[[ -r site/privacidad/index.html ]] || { echo "FAIL: run me from the repo root"; exit 1; }

fails=0
ok()   { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [[ "$MODE" == "--before-dns" ]]; then
  BASE="http://$DOMAIN"
  PIN=(--resolve "$DOMAIN:80:185.199.108.153")
  echo "Before DNS: asking GitHub's servers directly. This proves the deploy, not the domain."
else
  BASE="https://$DOMAIN"
  first="$(dig @"$RESOLVER" +short "$DOMAIN" A | head -1)"
  PIN=(--resolve "$DOMAIN:443:${first:-0.0.0.0}" --resolve "$DOMAIN:80:${first:-0.0.0.0}")

  # 1. The apex.
  got="$(dig @"$RESOLVER" +short "$DOMAIN" A | sort | tr '\n' ' ' | sed 's/ $//')"
  want="$(echo $PAGES_IPS | tr ' ' '\n' | sort | tr '\n' ' ' | sed 's/ $//')"
  if [[ "$got" == "$want" ]]; then ok "$DOMAIN resolves to GitHub Pages' four addresses"
  else fail "$DOMAIN resolves to [$got], not GitHub Pages' [$want]"; fi

  # 2. www.
  cname="$(dig @"$RESOLVER" +short "www.$DOMAIN" CNAME)"
  if [[ "$cname" == "bersermi.github.io." ]]; then ok "www.$DOMAIN is a CNAME to bersermi.github.io"
  else fail "www.$DOMAIN's CNAME is [${cname:-none}], not bersermi.github.io."; fi
fi

# 3, 4 and 5. Each page.
for path in / /privacidad/ /privacidad/cocina-e-itacate/ /terminos/cocina-e-itacate/ /eliminar-cuenta/ /eliminar-cuenta/cocina/ /eliminar-cuenta/itacate/ /cocina/ /estilo.css; do
  name="$(echo "$path" | tr '/' '_')"
  code="$(curl -sS ${PIN[@]+"${PIN[@]}"} -o "$TMP/$name.body" -D "$TMP/$name.head" -w '%{http_code}' "$BASE$path" 2>"$TMP/$name.err")"
  if [[ "$code" != "200" ]]; then
    fail "$BASE$path answered ${code:-nothing}: $(head -1 "$TMP/$name.err")"
    continue
  fi
  if grep -qi '^server: GitHub.com' "$TMP/$name.head"; then ok "$BASE$path answers 200, served by GitHub"
  else fail "$BASE$path answers 200 but not from GitHub ($(grep -i '^server:' "$TMP/$name.head" | tr -d '\r'))"; fi
  if grep -qi '^set-cookie:' "$TMP/$name.head"; then fail "$BASE$path sets a cookie"
  else ok "$BASE$path sets no cookie"; fi
  if grep -q '{{' "$TMP/$name.body"; then fail "$BASE$path still holds $(grep -o '{{[^}]*}}' "$TMP/$name.body" | head -1)"
  elif [[ "$path" != *.css ]]; then ok "$BASE$path holds no {{ }}"; fi
done

# 6. Both avisos and the terms served are this checkout's.
for page in privacidad privacidad/cocina-e-itacate terminos/cocina-e-itacate; do
  fecha="$(grep -o '<p class="fecha">[^<]*' "site/$page/index.html" | head -1)"
  body="$TMP/_$(echo "$page" | tr '/' '_')_.body"
  if [[ -s "$body" ]]; then
    if grep -qF "$fecha" "$body"; then ok "/$page/ served carries this checkout's date line (${fecha#*>})"
    else fail "/$page/ served is not this checkout's — its date line differs from (${fecha#*>})"; fi
  fi
done

if [[ "$MODE" != "--before-dns" ]]; then
  # 7. http → https.
  loc="$(curl -sS "${PIN[@]}" -o /dev/null -w '%{http_code} %{redirect_url}' "http://$DOMAIN/" 2>/dev/null)"
  if [[ "$loc" == 301\ https://$DOMAIN/* ]]; then ok "http:// redirects to https://"
  else fail "http://$DOMAIN/ answered [$loc], not a 301 to https:// — tick Enforce HTTPS once the certificate exists"; fi

  # 8. Mail.
  mx="$(dig @"$RESOLVER" +short "$DOMAIN" MX | tr '\n' ' ')"
  if [[ -n "$mx" ]]; then ok "$DOMAIN has MX records ($mx) — send a test email to privacidad@ to prove the forwarding"
  else fail "$DOMAIN has no MX records, so privacidad@$DOMAIN cannot receive mail"; fi
fi

# 9. The files that hand a kitchen's address to Itacate.
for file in apple-app-site-association assetlinks.json; do
  code="$(curl -sS ${PIN[@]+"${PIN[@]}"} -o "$TMP/$file" -D "$TMP/$file.head" -w '%{http_code}' "$BASE/.well-known/$file" 2>/dev/null)"
  if [[ "$code" != "200" ]]; then fail "$BASE/.well-known/$file answered ${code:-nothing} — not 200 (a redirect counts as missing to a phone)"
  elif cmp -s "$TMP/$file" "site/.well-known/$file"; then ok "$BASE/.well-known/$file answers 200, this checkout's to the byte ($(grep -i '^content-type:' "$TMP/$file.head" | tr -d '\r' | cut -d' ' -f2-))"
  else fail "$BASE/.well-known/$file is served, but it is not this checkout's"; fi
done
if [[ "$MODE" != "--before-dns" ]]; then
  apple="$(curl -sS -m 20 "https://app-site-association.cdn-apple.com/a/v1/$DOMAIN" 2>/dev/null)"
  if python3 -c 'import json,sys; a=json.loads(sys.argv[1]); b=json.load(open("site/.well-known/apple-app-site-association")); sys.exit(0 if a==b else 1)' "$apple" 2>/dev/null
  then ok "Apple's CDN holds this checkout's apple-app-site-association"
  else fail "Apple's CDN does not hold this checkout's file yet (it answered: $(echo "$apple" | head -c 120))"; fi
  google="$(curl -sS -m 20 "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://$DOMAIN&relation=delegate_permission/common.handle_all_urls" 2>/dev/null)"
  if echo "$google" | grep -q '"packageName": "mx.wera.vecino"'; then ok "Google's Digital Asset Links API reads Itacate (mx.wera.vecino) from $DOMAIN"
  else fail "Google's Digital Asset Links API does not read Itacate from $DOMAIN: $(echo "$google" | tr -d '\n' | head -c 160)"; fi
fi

echo
if [[ $fails -gt 0 ]]; then echo "$fails assertion(s) failed."; exit 1; fi
echo "every assertion holds."

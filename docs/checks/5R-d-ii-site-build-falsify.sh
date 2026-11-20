#!/usr/bin/env bash
# 5R-d-ii-site-build-falsify — does 5R-d-ii-site-build.sh refuse what it says it
# refuses, for the reason it says?
#
# Every case builds a COPY of site/ in a temporary directory and breaks the copy,
# never site/ itself. Each case asserts the exit code AND the reason the build
# prints, because a build that fails for the wrong reason would pass a bare
# exit-code test.
#
#   F0  the real pages with stand-in values build green (the baseline — a guard
#       that refuses everything would pass F1–F5 alone)
#   F1  RESPONSABLE empty                    → refused, naming RESPONSABLE
#   F2  a page with an unknown {{OTRO}}      → refused, naming {{OTRO}}
#   F3  a <script src="https://…">           → refused, naming the script
#   F4  a link to a page that does not exist → refused, naming the link
#   F5  a value holding <b>                  → built, and the page shows &lt;b&gt;
#   ⚠️ `10.9c` — a kitchen's address, and the files that hand it to Itacate:
#   F6  an inline <script> on another page   → refused, naming the page
#   F7  cocina/'s script asking the network  → refused, naming fetch
#   F8  a second script on cocina/           → refused, one at most
#   F9  .well-known/ missing                 → refused, naming the file
#   F10 assetlinks.json with a broken key    → refused, naming the file
#   F11 the iPhone's file not JSON           → refused, naming the file
#   ⚠️ `5R-r` — the owner's WhatsApp on his page, two more secrets:
#   F12 WHATSAPP empty                       → refused, naming WHATSAPP
#   F13 WHATSAPP_TEXTO empty                 → refused, naming WHATSAPP_TEXTO
#   F14 WHATSAPP with a + and spaces         → refused: wa.me takes digits only
#   F15 the number shown is not the one dialled → refused, naming both
#   F16 no page holds {{WHATSAPP}}           → refused: his page must link it
#   (F0 also reads his page: the link and the shown number filled in, once each)
#
# It needs no secret, so CI runs it on every pull request that touches site/.
#
# Run:  bash docs/checks/5R-d-ii-site-build-falsify.sh
# Exit: 0 when every case behaves; 1 otherwise.

set -uo pipefail

BUILD="docs/checks/5R-d-ii-site-build.sh"
[[ -r "$BUILD" && -d site ]] || { echo "FAIL: run me from the repo root"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fails=0
pass() { echo "  ok    $*"; }
fail() { echo "FAIL: $*"; fails=$((fails+1)); }

# copy <name> — a fresh copy of site/ to break.
copy() { rm -rf "$TMP/$1"; cp -R site "$TMP/$1"; }

# run <name> <responsable> <domicilio> [<whatsapp> [<whatsapp texto>]] — builds the copy;
# output in $TMP/<name>.log. The two WhatsApp values default to stand-ins; pass '' to empty one.
run() {
  RESPONSABLE="$2" DOMICILIO="$3" WHATSAPP="${4-520000000000}" WHATSAPP_TEXTO="${5-00 0000 0000}" \
    bash "$BUILD" "$TMP/$1.out" "$TMP/$1" >"$TMP/$1.log" 2>&1
}

# expect_refused <status> <label> <name> <reason grep>
expect_refused() {
  local status=$1 label=$2 name=$3 reason=$4
  if [[ $status -eq 0 ]]; then
    fail "$label: the build accepted it"
  elif ! grep -q -- "$reason" "$TMP/$name.log"; then
    fail "$label: refused, but not for the expected reason ($reason):"; sed 's/^/        /' "$TMP/$name.log"
  elif [[ -e "$TMP/$name.out" ]]; then
    fail "$label: refused, but left an output directory behind"
  else
    pass "$label"
  fi
}

copy f0; run f0 'Nombre Prueba' 'Calle Falsa 123, CDMX' 525512345678 '55 1234 5678'
if [[ $? -eq 0 ]]; then pass "F0 the real pages build green with stand-in values"
else fail "F0 the real pages do not build:"; sed 's/^/        /' "$TMP/f0.log"; fi
if [[ -r "$TMP/f0.out/bernardo/index.html" ]] \
   && [[ "$(grep -c 'href="https://wa.me/525512345678"' "$TMP/f0.out/bernardo/index.html")" == 1 ]] \
   && [[ "$(grep -c '>55 1234 5678<' "$TMP/f0.out/bernardo/index.html")" == 1 ]]; then
  pass "F0 his page links wa.me/<the digits> and shows the number, once each"
else fail "F0 his page does not carry the WhatsApp link and number filled in"; fi

copy f1; run f1 '' 'Calle Falsa 123, CDMX'
expect_refused $? "F1 an empty RESPONSABLE is refused" f1 'RESPONSABLE is empty'

copy f2; printf '<p>{{OTRO}}</p>\n' >>"$TMP/f2/eliminar-cuenta/index.html"
run f2 'Nombre Prueba' 'Calle Falsa 123, CDMX'
expect_refused $? "F2 an unknown placeholder is refused" f2 'still holds {{OTRO}}'

copy f3; printf '<script src="https://example.com/a.js"></script>\n' >>"$TMP/f3/index.html"
run f3 'Nombre Prueba' 'Calle Falsa 123, CDMX'
expect_refused $? "F3 a third-party script is refused" f3 'loads https://example.com/a.js from another site'

copy f4; printf '<a href="../no-existe/">x</a>\n' >>"$TMP/f4/privacidad/index.html"
run f4 'Nombre Prueba' 'Calle Falsa 123, CDMX'
expect_refused $? "F4 a broken internal link is refused" f4 'links to ../no-existe/, which is not in the output'

copy f5; run f5 'Nombre Prueba' 'Calle <b>Falsa</b> 123'
if [[ $? -ne 0 ]]; then fail "F5 a value with markup was refused rather than escaped"
elif grep -q 'Calle &lt;b&gt;Falsa&lt;/b&gt; 123' "$TMP/f5.out/privacidad/index.html" \
     && ! grep -q '<b>Falsa' "$TMP/f5.out/privacidad/index.html"; then
  pass "F5 a value with markup goes in escaped"
else fail "F5 a value with markup went in raw"; fi

copy f6; printf '<script>var a = 1;</script>\n' >>"$TMP/f6/eliminar-cuenta/index.html"
run f6 'Nombre Prueba' 'Calle Falsa 123, CDMX'
expect_refused $? "F6 an inline script on a page other than cocina/ is refused" f6 'eliminar-cuenta/index.html carries a <script>'

copy f7; perl -0pi -e 's/\(function \(\) \{/(function () { fetch("\/x");/' "$TMP/f7/cocina/index.html"
run f7 'Nombre Prueba' 'Calle Falsa 123, CDMX'
expect_refused $? "F7 cocina/'s script asking the network is refused" f7 "script uses fetch"

copy f8; perl -0pi -e 's#</body>#<script>var b = 2;</script>\n</body>#' "$TMP/f8/cocina/index.html"
run f8 'Nombre Prueba' 'Calle Falsa 123, CDMX'
expect_refused $? "F8 a second script on cocina/ is refused" f8 'carries 2 scripts'

copy f9; rm -rf "$TMP/f9/.well-known"
run f9 'Nombre Prueba' 'Calle Falsa 123, CDMX'
expect_refused $? "F9 the association files missing are refused" f9 '.well-known/apple-app-site-association is not in the output'

copy f10; perl -0pi -e 's/"0B:6D/"0b:6d/' "$TMP/f10/.well-known/assetlinks.json"
run f10 'Nombre Prueba' 'Calle Falsa 123, CDMX'
expect_refused $? "F10 a key Android cannot read is refused" f10 'assetlinks.json is not what Android reads'

copy f11; printf '{ "applinks": ' >"$TMP/f11/.well-known/apple-app-site-association"
run f11 'Nombre Prueba' 'Calle Falsa 123, CDMX'
expect_refused $? "F11 an iPhone file that is not JSON is refused" f11 'apple-app-site-association is not what an iPhone reads'

copy f12; run f12 'Nombre Prueba' 'Calle Falsa 123, CDMX' ''
expect_refused $? "F12 an empty WHATSAPP is refused" f12 'WHATSAPP is empty'

copy f13; run f13 'Nombre Prueba' 'Calle Falsa 123, CDMX' 520000000000 ''
expect_refused $? "F13 an empty WHATSAPP_TEXTO is refused" f13 'WHATSAPP_TEXTO is empty'

copy f14; run f14 'Nombre Prueba' 'Calle Falsa 123, CDMX' '+52 55 0000 0000'
expect_refused $? "F14 a WHATSAPP that is not digits is refused" f14 'WHATSAPP is not 10 to 15 digits'

copy f15; run f15 'Nombre Prueba' 'Calle Falsa 123, CDMX' 525512345678 '55 1234 9999'
expect_refused $? "F15 a shown number that is not the dialled one is refused" f15 "WHATSAPP_TEXTO's digits are not the end of WHATSAPP"

copy f16; perl -0pi -e 's#https://wa\.me/\{\{WHATSAPP\}\}#https://wa.me/#' "$TMP/f16/bernardo/index.html"
run f16 'Nombre Prueba' 'Calle Falsa 123, CDMX'
expect_refused $? "F16 his page without the WhatsApp link is refused" f16 'no page holds {{WHATSAPP}}'

echo
if [[ $fails -gt 0 ]]; then echo "$fails case(s) failed."; exit 1; fi
echo "all 17 cases behave."

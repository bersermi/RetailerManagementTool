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

# run <name> <responsable> <domicilio> — builds the copy; output in $TMP/<name>.log.
run() {
  RESPONSABLE="$2" DOMICILIO="$3" bash "$BUILD" "$TMP/$1.out" "$TMP/$1" >"$TMP/$1.log" 2>&1
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

copy f0; run f0 'Nombre Prueba' 'Calle Falsa 123, CDMX'
if [[ $? -eq 0 ]]; then pass "F0 the real pages build green with stand-in values"
else fail "F0 the real pages do not build:"; sed 's/^/        /' "$TMP/f0.log"; fi

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

echo
if [[ $fails -gt 0 ]]; then echo "$fails case(s) failed."; exit 1; fi
echo "all 6 cases behave."

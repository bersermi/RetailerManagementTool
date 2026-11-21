#!/usr/bin/env bash
# ============================================================================
# THE COUNTER'S OBJECTS AS PICTURES — Step 11, row 11.2 (direction A · Mostrador,
# the owner's ruling of 2026-11-20).
#
#   bash brand/render-mostrador.sh
#
# Reads    brand/mostrador/objetos/*.svg — one drawing per object that React Native
#          draws as a tinted picture, since no app build carries an SVG library:
#            sello-vaca      the card's stamp, the cow in a double ring, inked
#            motas           the specks that wear a word stamp (laid over it)
#            trazo-pestana   the stroke under the active tab
#            muesca          a ticket's notch, a half-round bite
#            punta-etiqueta  a price tag's pointed end with its hole
#            mostrador       the counter's paper, a seamless tile that only lightens
#          (sello-vaca draws brand/wera-mark.svg in by reference.)
# Writes   brand/mostrador/png/<name>.png, <name>@2x.png, <name>@3x.png — each drawing
#          at its own size in points, at one, two and three pixels per point, one
#          colour (black) on transparent: the apps tint them at runtime, so only the
#          alpha is the drawing.
#
# ⚠️ THE PNGs ARE COMMITTED AND THIS SCRIPT IS RUN BY HAND, like the other three.
# Nothing in an app reads brand/: rows 11.6 to 11.9 copy what they use into the app,
# after the owner's yes at 11.5. `node brand/mostrador/objetos.mjs` checks the result.
#
# Needs Google Chrome (it draws the SVG and its filters) and Node (it crops, with
# brand/mostrador/png.mjs: headless Chrome will not open a window narrower than about
# 500 pixels, so each drawing is shot in a larger window and its corner kept).
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[[ -x "$CHROME" ]] || { echo "FAIL: Google Chrome is not at $CHROME"; exit 1; }
command -v node >/dev/null || { echo "FAIL: node is missing"; exit 1; }
SRC="brand/mostrador/objetos"
OUT="brand/mostrador/png"
WINDOW=600
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT"

# The drawing's size in points, from its root element's width and height.
size_of() {   # size_of <file> <attr>
  sed -n '1s/.*<svg[^>]* '"$2"'="\([0-9.]*\)".*/\1/p' "$1"
}

n=0
for svg in "$SRC"/*.svg; do
  name="$(basename "$svg" .svg)"
  w="$(size_of "$svg" width)"
  h="$(size_of "$svg" height)"
  [[ -n "$w" && -n "$h" ]] || { echo "FAIL: $svg has no width and height on its first line"; exit 1; }
  for s in 1 2 3; do
    suffix=""; [[ $s -gt 1 ]] && suffix="@${s}x"
    shot="$WORK/$name$suffix.png"
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor="$s" \
      --default-background-color=00000000 --allow-file-access-from-files --window-size="$WINDOW,$WINDOW" \
      --screenshot="$shot" "file://$PWD/$svg" >/dev/null 2>&1
    [[ -s "$shot" ]] || { echo "FAIL: Chrome drew nothing for $name at ${s}x"; exit 1; }
    pw=$(awk -v a="$w" -v b="$s" 'BEGIN { printf "%d", a * b + 0.5 }')
    ph=$(awk -v a="$h" -v b="$s" 'BEGIN { printf "%d", a * b + 0.5 }')
    node brand/mostrador/png.mjs recortar "$shot" "$OUT/$name$suffix.png" "$pw" "$ph"
    n=$((n + 1))
  done
done
echo "drew $n pictures into $OUT"

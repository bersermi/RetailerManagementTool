#!/usr/bin/env bash
# ============================================================================
# THE APPS' DRAWINGS AS PICTURES — Step 11, row 11.4 (direction A · Mostrador,
# the owner's ruling of 2026-11-20; the icons' line, his call 10 of 2026-11-26).
#
#   bash brand/render-dibujos.sh
#
# Reads    brand/dibujos/*.svg — one drawing each, in the icons' line on a
#          64-unit square — and brand/dibujos/dibujos.json, which gives each its
#          size in points (`puntos`):
#            9 empty screens   what a screen with nothing yet shows above its sentence
#            9 trades          a kitchen or a dish without a photo, once, on her colour
#            1 reward          ¡Ganaste!, in the kitchen's colour
# Writes   brand/dibujos/png/<name>.png, <name>@2x.png, <name>@3x.png — each drawing
#          at its size, at one, two and three pixels per point, one colour (black)
#          on transparent: the apps tint them at runtime (<Image tintColor>), since
#          no app build carries an SVG library, so only the alpha is the drawing.
#
# ⚠️ THE PNGs ARE COMMITTED AND THIS SCRIPT IS RUN BY HAND, like the other render
# scripts. Nothing in an app reads brand/: row 11.10 copies what it uses into each
# app. `node brand/dibujos/dibujos.mjs` checks that every picture is its source.
#
# Needs Google Chrome (it draws the SVG) and Node (it reads the sizes and crops,
# with brand/mostrador/png.mjs: headless Chrome will not open a window narrower
# than about 500 pixels, so each drawing is shot in a larger window and its corner
# kept).
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[[ -x "$CHROME" ]] || { echo "FAIL: Google Chrome is not at $CHROME"; exit 1; }
command -v node >/dev/null || { echo "FAIL: node is missing"; exit 1; }
SRC="brand/dibujos"
OUT="brand/dibujos/png"
WINDOW=600
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT"

n=0
for svg in "$SRC"/*.svg; do
  name="$(basename "$svg" .svg)"
  pt="$(node -e 'const d=require(process.argv[1]).dibujos[process.argv[2]]; if (!d) process.exit(1); console.log(d.puntos)' "$PWD/$SRC/dibujos.json" "$name")" \
    || { echo "FAIL: $name.svg has no entry in dibujos.json"; exit 1; }
  {
    printf '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block;width:%spx;height:%spx}</style>\n' "$pt" "$pt"
    cat "$svg"
  } > "$WORK/$name.html"
  for s in 1 2 3; do
    suffix=""; [[ $s -gt 1 ]] && suffix="@${s}x"
    shot="$WORK/$name$suffix.png"
    # ⚠️ A shot now and then fails with no word (measured 2026-11-26: 1 in 57, a
    # different one each run), so each is tried three times before giving up.
    for try in 1 2 3; do
      rm -f "$shot"
      "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor="$s" \
        --default-background-color=00000000 --window-size="$WINDOW,$WINDOW" \
        --screenshot="$shot" "file://$WORK/$name.html" >/dev/null 2>&1 || true
      [[ -s "$shot" ]] && break
    done
    [[ -s "$shot" ]] || { echo "FAIL: Chrome drew nothing for $name at ${s}x, three times"; exit 1; }
    px=$((pt * s))
    node brand/mostrador/png.mjs recortar "$shot" "$OUT/$name$suffix.png" "$px" "$px"
    n=$((n + 1))
  done
done
echo "drew $n pictures into $OUT"

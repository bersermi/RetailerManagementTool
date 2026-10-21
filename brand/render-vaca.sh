#!/usr/bin/env bash
# ============================================================================
# THE COW FOR THE OPENING — `8g`, the owner's note of 2026-10-21: *"an animation
# when opening the app for the first time with our cow that turns into the logo
# in the middle of the screen."*
#
#   bash brand/render-vaca.sh
#
# Reads    brand/wera-mark.svg — the one drawing the icons come from
# Writes   app/src/marca/vaca-oxido.png — the mark in rust, as on the splash
#          app/src/marca/vaca-crema.png — the mark in cream, as on the icon
#          Both 480 px square, transparent, the whole 512-unit box: 160 pt at 3x.
#          The W and the nostrils are real holes, so what is under shows through.
#
# The welcome screen lays the rust one where the splash left it, grows the
# icon's rust square behind it, and cross-fades to the cream one — so the
# animation starts on the splash's frame and ends on the icon's picture.
#
# ⚠️ THE PNGs ARE COMMITTED AND THIS SCRIPT IS RUN BY HAND, like the other two.
# The colours are `render-icons.sh`'s, ruled 2026-10-13.
#
# Needs Google Chrome (it draws the SVG).
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[[ -x "$CHROME" ]] || { echo "FAIL: Google Chrome is not at $CHROME"; exit 1; }
RUST="#B5561F"
CREAM="#FFF8EC"
SIDE=480
OUT="app/src/marca"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

draw() {   # draw <name> <colour>
  {
    printf '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:%spx;height:%spx;overflow:hidden;background:transparent}div{color:%s}svg{display:block;width:%spx;height:%spx}</style><div>\n' "$SIDE" "$SIDE" "$2" "$SIDE" "$SIDE"
    cat brand/wera-mark.svg
    printf '</div>\n'
  } > "$WORK/$1.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --window-size="$SIDE,$SIDE" \
    --screenshot="$WORK/$1.png" "file://$WORK/$1.html" >/dev/null 2>&1
  [[ -s "$WORK/$1.png" ]] || { echo "FAIL: Chrome drew nothing for $1"; exit 1; }
  cp "$WORK/$1.png" "$OUT/$1.png"
}

draw vaca-oxido "$RUST"
draw vaca-crema "$CREAM"
echo "drew the cow twice into $OUT"

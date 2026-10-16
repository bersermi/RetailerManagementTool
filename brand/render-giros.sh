#!/usr/bin/env bash
# ============================================================================
# THE SHOP'S WATERMARK, ONE DRAWING PER GIRO — `8g`, the owner's option C,
# 2026-10-15: *"a small watermark at the top based on the giro of the store …
# shouldn't be noisy."* The tab screens' cream band draws one of these, faint,
# at its right edge, with the shop's name under the title.
#
#   bash brand/render-giros.sh
#
# Reads    brand/giros/<giro>.svg   — the source, drawn by the session
# Writes   app/src/marca/giros/<giro>.png — 390 px square, transparent, which is
#          130 pt at 3x; the app lays it down at low opacity, so one size serves
#          both densities.
#
# ⚠️ THE PNGs ARE COMMITTED AND THIS SCRIPT IS RUN BY HAND, like
# `render-icons.sh`: no workflow draws them. A changed drawing is a changed
# `.svg` AND a re-run, in the same commit.
#
# ⚠️ A REPLACEMENT DRAWING NEEDS NO CODE: keep the file name and the 64-unit
# view box, and the app picks it up on the next update.
#
# Needs Google Chrome (it draws the SVG).
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[[ -x "$CHROME" ]] || { echo "FAIL: Google Chrome is not at $CHROME"; exit 1; }

OUT="app/src/marca/giros"
SIDE=390
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT"

count=0
for src in brand/giros/*.svg; do
  name="$(basename "$src" .svg)"
  {
    printf '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:%spx;height:%spx;overflow:hidden;background:transparent}svg{display:block;width:%spx;height:%spx}</style>\n' "$SIDE" "$SIDE" "$SIDE" "$SIDE"
    cat "$src"
  } > "$WORK/$name.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --window-size="$SIDE,$SIDE" \
    --screenshot="$WORK/$name.png" "file://$WORK/$name.html" >/dev/null 2>&1
  [[ -s "$WORK/$name.png" ]] || { echo "FAIL: Chrome drew nothing for $name"; exit 1; }
  cp "$WORK/$name.png" "$OUT/$name.png"
  count=$((count + 1))
done

[[ "$count" -eq 7 ]] || { echo "FAIL: drew $count drawings, expected 7 (one per giro)"; exit 1; }
echo "drew $count drawings into $OUT"

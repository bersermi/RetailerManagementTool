#!/usr/bin/env bash
# ============================================================================
# DRAW THE APP'S ICON FILES FROM THE MARK. Run by hand, on this Mac:
#
#   bash brand/render-icons.sh
#
# `brand/wera-mark.svg` is the one drawing. This writes the five pictures the
# builds and the Play listing carry, so a change to the mark or to a colour is
# one edit and one run, never five hand-made files:
#
#   app/assets/images/icon.png                     1024, no alpha: iOS, and the fallback
#   app/assets/images/android-icon-foreground.png  1024, transparent: Android's adaptive icon
#   app/assets/images/android-icon-monochrome.png  1024, transparent: Android's themed icon
#   app/assets/images/splash-icon.png              the mark on the splash screen
#   store/google-play/icono-512.png                the Play listing's icon
#
# The owner's rulings of 2026-10-13: the mark is option A, rust on cream, and the
# icon is a CREAM cow on a RUST square. The splash is the mark in rust on the
# app's own cream (`fondo`), so the first screen does not flash a second colour.
#
# ⚠️ AN ICON IS PART OF THE NATIVE BUILD. A change here moves the runtime of BOTH
# platforms: no over-the-air fix reaches a phone until it installs a new build.
#
# ⚠️ ANDROID CROPS. An adaptive icon shows only the middle two thirds of its
# foreground, behind a mask the launcher chooses; the horn tips have to sit
# inside the inner circle (61% of the canvas) or a round launcher cuts them.
# That is why the foreground's viewBox is 900 wide for a mark 392 wide.
#
# Needs Google Chrome (it draws the SVG) and `sips` (macOS).
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[[ -x "$CHROME" ]] || { echo "FAIL: Google Chrome is not at $CHROME"; exit 1; }
RUST="#B5561F"
CREAM="#FFF8EC"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# everything between <defs> and </svg>: the mask, and the group it cuts
INNER="$(python3 - <<'PY'
s = open('brand/wera-mark.svg', encoding='utf-8').read()
print(s[s.index('<defs>'):s.rindex('</svg>')])
PY
)"

draw() {   # draw <name> <width> <height> <viewBox> <mark colour> <ground>
  local name="$1"
  local w="$2"
  local h="$3"
  cat > "$WORK/$name.html" <<HTML
<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:$6}svg{display:block;width:${w}px;height:${h}px;color:$5}</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="$4">$INNER</svg>
HTML
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --window-size="$w,$h" \
    --screenshot="$WORK/$name.png" "file://$WORK/$name.html" >/dev/null 2>&1
  [[ -s "$WORK/$name.png" ]] || { echo "FAIL: Chrome drew nothing for $name"; exit 1; }
}

draw icon    1024 1024 "-70 -70 652 652"   "$CREAM"   "$RUST"
draw fg      1024 1024 "-194 -193 900 900" "$CREAM"   "transparent"
draw mono    1024 1024 "-194 -193 900 900" "#FFFFFF"  "transparent"
draw splash   600  574 "30 40 452 432"     "$RUST"    "transparent"
draw play512  512  512 "-70 -70 652 652"   "$CREAM"   "$RUST"

# iOS refuses an icon with an alpha channel, so that one goes through a format that has none
sips -s format bmp "$WORK/icon.png" --out "$WORK/icon.bmp" >/dev/null
sips -s format png "$WORK/icon.bmp" --out app/assets/images/icon.png >/dev/null
cp "$WORK/fg.png"      app/assets/images/android-icon-foreground.png
cp "$WORK/mono.png"    app/assets/images/android-icon-monochrome.png
cp "$WORK/splash.png"  app/assets/images/splash-icon.png
cp "$WORK/play512.png" store/google-play/icono-512.png

for f in app/assets/images/icon.png app/assets/images/android-icon-foreground.png \
         app/assets/images/android-icon-monochrome.png app/assets/images/splash-icon.png \
         store/google-play/icono-512.png; do
  printf '  %-48s %s\n' "$f" "$(sips -g pixelWidth -g pixelHeight -g hasAlpha "$f" | tail -3 | awk '{print $2}' | tr '\n' ' ')"
done
[[ "$(sips -g hasAlpha app/assets/images/icon.png | tail -1 | awk '{print $2}')" == "no" ]] \
  || { echo "FAIL: app/assets/images/icon.png has an alpha channel; iOS will refuse it"; exit 1; }
echo "drawn from brand/wera-mark.svg. A new build is needed before any phone shows it."

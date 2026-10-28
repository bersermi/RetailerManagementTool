#!/usr/bin/env bash
# ============================================================================
# DRAW THE TWO NEW APPS' PLAY PICTURES. Plan task `10.2b`. Run by hand, on this Mac:
#
#   bash store/cocina-itacate/render.sh
#
# Writes, beside this script, for Wera Cocina and Itacate: the 512 px listing icon
# and the 1024 × 500 feature graphic. PROVISIONAL, like the apps' launcher icons
# (`10.2a`): Wera's mark (`brand/wera-mark.svg`) on each app's own ground — green
# `#1C6B4B` for Cocina, blue `#24476B` for Itacate, the colours its Android icon
# already carries. The real pictures are the owner's call before production.
#
# The screenshots are not drawn here: they are the apps themselves, taken on the
# Android emulator from a `preview` build (`store/cocina-itacate.md`).
#
# Needs Google Chrome (it draws the SVG). Wera's own pictures are
# `brand/render-icons.sh` and `store/google-play/grafico.html`; this touches neither.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"
REPO="$(cd ../.. && pwd)"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[[ -x "$CHROME" ]] || { echo "FAIL: Google Chrome is not at $CHROME"; exit 1; }
CREAM="#FFF8EC"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

INNER="$(python3 - "$REPO/brand/wera-mark.svg" <<'PY'
import sys
s = open(sys.argv[1], encoding='utf-8').read()
print(s[s.index('<defs>'):s.rindex('</svg>')])
PY
)"

shoot() {   # shoot <html file> <png out> <width> <height>
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --window-size="$3,$4" \
    --screenshot="$2" "file://$1" >/dev/null 2>&1
  [[ -s "$2" ]] || { echo "FAIL: Chrome drew nothing for $2"; exit 1; }
}

icon() {    # icon <app> <ground>
  cat > "$WORK/$1-icon.html" <<HTML
<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:512px;height:512px;overflow:hidden;background:$2}svg{display:block;width:512px;height:512px;color:$CREAM}</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-70 -70 652 652">$INNER</svg>
HTML
  shoot "$WORK/$1-icon.html" "$1-icono-512.png" 512 512
}

graphic() { # graphic <app> <ground> <name> <name size px> <line>
  cat > "$WORK/$1-grafico.html" <<HTML
<!doctype html><html lang="es"><meta charset="utf-8">
<style>
  html,body{margin:0;width:1024px;height:500px;overflow:hidden}
  body{background:$CREAM;color:#201D16;font-family:-apple-system,"Helvetica Neue",Helvetica,Arial,sans-serif;display:flex;align-items:center}
  .marca{display:flex;align-items:center;gap:26px;padding:0 0 18px 76px}
  svg{width:260px;height:249px;color:$2;flex:none}
  .nombre{font-size:$4px;font-weight:800;letter-spacing:-3px;line-height:1;color:$2}
  .lema{font-size:38px;font-weight:700;margin-top:14px;letter-spacing:-.5px}
  .que{font-size:25px;color:#6F675A;margin-top:18px}
  .raya{position:absolute;left:0;right:0;bottom:0;height:18px;background:$2}
</style>
<body><div class="marca"><svg xmlns="http://www.w3.org/2000/svg" viewBox="30 40 452 432" aria-hidden="true">$INNER</svg>
<div><div class="nombre">$3</div><div class="lema">$5</div><div class="que">Versión de prueba</div></div></div><div class="raya"></div></body></html>
HTML
  shoot "$WORK/$1-grafico.html" "$1-grafico-1024x500.png" 1024 500
}

icon    cocina  "#1C6B4B"
icon    itacate "#24476B"
graphic cocina  "#1C6B4B" "Wera Cocina" 96  "Para fondas y cocinas"
graphic itacate "#24476B" "Itacate"     124 "Para vecinos"

for f in cocina-icono-512.png itacate-icono-512.png cocina-grafico-1024x500.png itacate-grafico-1024x500.png; do
  printf '  %-28s %s\n' "$f" "$(sips -g pixelWidth -g pixelHeight "$f" | tail -2 | awk '{print $2}' | tr '\n' ' ')"
done

#!/usr/bin/env bash
# ============================================================================
# DRAW THE TWO NEW APPS' PLAY PICTURES, AND WERA COCINA'S OWN. Plan tasks `10.2b`
# and `10.4d-ii`. Run by hand, on this Mac:
#
#   bash store/cocina-itacate/render.sh
#
# Writes, beside this script, for Wera Cocina and Itacate: the 512 px listing icon
# and the 1024 × 500 feature graphic: Wera's mark (`brand/wera-mark.svg`) on each
# app's own ground — green `#1C6B4B` for Cocina, blue `#24476B` for Itacate, the
# colours its Android icon already carries (`10.2a`). Wera Cocina's is RULED (the
# owner, 2026-11-02: the cream cow on its green, on both platforms); Itacate's is
# still provisional, its owner's call before production.
#
# And into `cocina/assets/images/`, the two pictures Wera Cocina's builds carry
# (`10.4d-ii`): `icon.png`, the listing icon's drawing at 1024 with no alpha channel
# (App Store Connect refuses an icon with one) — the iPhone's icon, and the old
# Android phones' (Expo draws Android's pre-8 launcher icon from the same field);
# and `splash-icon.png`, the cow in Cocina's green on nothing, as the app opens —
# its cream is `cocina/app.json`'s `backgroundColor`, the app's own `fondo` (the
# owner's ruling of the same evening). `cocina/test/icon.test.ts` holds both.
#
# ⚠️ THOSE TWO ARE PART OF THE NATIVE BUILD. Re-drawing either moves Wera Cocina's
# runtime on both platforms: no update reaches a phone until it installs a new build.
#
# The screenshots are not drawn here: they are the apps themselves, taken on the
# Android emulator from a `preview` build (`store/cocina-itacate.md`).
#
# Needs Google Chrome (it draws the SVG). Wera's own pictures are
# `brand/render-icons.sh` and `store/google-play/grafico.html`; this touches neither.
#
# AND, ON ITS OWN, ITACATE'S IPHONE ICON (`10.5-iv-b-i`, the owner's ruling of 2026-11-05 — the
# family-shell page's call 6: the cow on Itacate's blue, on both phones, in its first iPhone build):
#
#   bash store/cocina-itacate/render.sh itacate-icono
#
# writes `itacate/assets/images/icon.png` — the 512 listing icon's drawing at 1024, no alpha
# channel — and NOTHING ELSE. It is `ios.icon` alone in `itacate/app.json`: Android 8 and later
# already draw the cow on the blue (the adaptive icon), and the top-level `icon` — Android's
# pre-8 launcher icon — stays Wera's, so Itacate's Android runtime does not move. ⚠️ Native on
# the iPhone: re-drawing it moves Itacate's iPhone runtime.
#
# AND, ON ITS OWN, THE NINE TRADES' DRAWINGS (`10.5-ii`) — a kitchen's default cover
# and dish picture, her trade's drawing on her colour:
#
#   bash store/cocina-itacate/render.sh giros
#
# draws each `<symbol>` of `brand/giros.svg` white on nothing, 512 px square, into
# `cocina/src/marca/giros/<name>.png` (no app has SVG), and NOTHING ELSE: run with no
# argument this script re-draws the icon and the launch screen too, which are part of
# the native build. The drawings are JavaScript assets and move no runtime.
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

appicon() { # appicon <folder> <ground> — the icon of `brand/render-icons.sh`, at 1024, with no alpha channel
  mkdir -p "$1"
  cat > "$WORK/app-icon.html" <<HTML
<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:1024px;height:1024px;overflow:hidden;background:$2}svg{display:block;width:1024px;height:1024px;color:$CREAM}</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-70 -70 652 652">$INNER</svg>
HTML
  shoot "$WORK/app-icon.html" "$WORK/app-icon.png" 1024 1024
  # through a format with no alpha channel, as Wera's icon goes
  sips -s format bmp "$WORK/app-icon.png" --out "$WORK/app-icon.bmp" >/dev/null
  sips -s format png "$WORK/app-icon.bmp" --out "$1/icon.png" >/dev/null
  [[ "$(sips -g hasAlpha "$1/icon.png" | tail -1 | awk '{print $2}')" == "no" ]] \
    || { echo "FAIL: $1/icon.png has an alpha channel; App Store Connect will refuse it"; exit 1; }
}

apppictures() { # apppictures <folder> <ground> — the icon above, and the launch screen's cow
  appicon "$1" "$2"
  cat > "$WORK/app-splash.html" <<HTML
<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:600px;height:574px;overflow:hidden;background:transparent}svg{display:block;width:600px;height:574px;color:$2}</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 40 452 432">$INNER</svg>
HTML
  shoot "$WORK/app-splash.html" "$1/splash-icon.png" 600 574
}

giros() { # each symbol of brand/giros.svg, white on nothing, 512 px, into cocina/src/marca/giros/
  local out="$REPO/cocina/src/marca/giros" id
  mkdir -p "$out"
  python3 - "$REPO/brand/giros.svg" "$WORK" > "$WORK/giros.txt" <<'PY'
import re, sys
svg, work = sys.argv[1], sys.argv[2]
text = open(svg, encoding="utf-8").read()
for name, inner in re.findall(r"<symbol id=\"([a-z]+)\" viewBox=\"0 0 64 64\">(.*?)</symbol>", text, re.S):
    page = ("<!doctype html><meta charset=\"utf-8\"><style>html,body{margin:0;width:512px;height:512px;"
            "overflow:hidden;background:transparent}svg{display:block;width:512px;height:512px;color:#FFFFFF}</style>"
            "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\">" + inner + "</svg>")
    open(work + "/giro-" + name + ".html", "w", encoding="utf-8").write(page)
    print(name)
PY
  [[ -s "$WORK/giros.txt" ]] || { echo "FAIL: no <symbol> found in brand/giros.svg"; exit 1; }
  while read -r id; do
    shoot "$WORK/giro-$id.html" "$out/$id.png" 512 512
    printf '  %-36s %s\n' "cocina/src/marca/giros/$id.png" "$(sips -g pixelWidth -g pixelHeight -g hasAlpha "$out/$id.png" | tail -3 | awk '{print $2}' | tr '\n' ' ')"
  done < "$WORK/giros.txt"
}

if [[ "${1:-}" == "giros" ]]; then
  giros
  exit 0
fi

if [[ "${1:-}" == "itacate-icono" ]]; then
  appicon "$REPO/itacate/assets/images" "#24476B"
  printf '  %-36s %s\n' "itacate/assets/images/icon.png" "$(sips -g pixelWidth -g pixelHeight -g hasAlpha "$REPO/itacate/assets/images/icon.png" | tail -3 | awk '{print $2}' | tr '\n' ' ')"
  exit 0
fi

icon    cocina  "#1C6B4B"
icon    itacate "#24476B"
graphic cocina  "#1C6B4B" "Wera Cocina" 96  "Para fondas y cocinas"
graphic itacate "#24476B" "Itacate"     124 "Para vecinos"
apppictures "$REPO/cocina/assets/images" "#1C6B4B"

for f in cocina-icono-512.png itacate-icono-512.png cocina-grafico-1024x500.png itacate-grafico-1024x500.png \
         "$REPO/cocina/assets/images/icon.png" "$REPO/cocina/assets/images/splash-icon.png"; do
  printf '  %-36s %s\n' "${f#"$REPO"/}" "$(sips -g pixelWidth -g pixelHeight -g hasAlpha "$f" | tail -3 | awk '{print $2}' | tr '\n' ' ')"
done

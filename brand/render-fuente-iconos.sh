#!/usr/bin/env bash
# ============================================================================
# THE DRAWN ICONS AS ONE FONT — Step 11, row 11.3-i (direction A · Mostrador,
# the owner's ruling of 2026-11-20).
#
#   bash brand/render-fuente-iconos.sh
#
# Reads    brand/iconos/*.svg and brand/iconos/mapa.json
# Writes   brand/iconos/WeraIconos.ttf and brand/iconos/WeraIconos.json (the
#          glyph map, keyed by the MaterialCommunityIcons names each drawing
#          replaces), by brand/iconos/fuente.py
#
# ⚠️ THE FONT IS COMMITTED AND THIS SCRIPT IS RUN BY HAND, like the other four
# render scripts: no workflow draws it. A changed drawing is a changed .svg AND a
# re-run, in the same commit — `node brand/iconos/iconos.mjs` goes red on a font
# that no longer draws its sources. Nothing in an app reads brand/: row 11.10
# copies the font and its map into the apps, after the owner's yes at 11.5.
#
# Not an app icon: brand/render-icons.sh draws the launcher icons.
#
# Needs Python 3 and the network the first time: it makes a virtual environment
# outside the repository with the exact packages below (fontTools builds the
# font; picosvg, on skia-pathops, outlines the strokes), and reuses it after.
# Nothing is added to the apps' node_modules.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

PAQUETES=(fonttools==4.68.0 picosvg==0.23.0 skia-pathops==0.9.2 lxml==6.1.3 absl-py==2.5.1)
command -v python3 >/dev/null || { echo "FAIL: python3 is missing"; exit 1; }

huella="$(printf '%s\n' "${PAQUETES[@]}" "$(python3 -c 'import sys; print(sys.version_info[:2])')" | shasum | cut -c1-12)"
VENV="${XDG_CACHE_HOME:-$HOME/.cache}/wera-fuente-iconos/$huella"
if [[ ! -x "$VENV/bin/python" ]]; then
  echo "making $VENV (once)"
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet --disable-pip-version-check "${PAQUETES[@]}"
fi

"$VENV/bin/python" brand/iconos/fuente.py

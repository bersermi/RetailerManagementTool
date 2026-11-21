# brand/iconos — the apps' icons, drawn

Step 11, row `11.3-i` (2026-11-21). The three apps draw MaterialCommunityIcons today; these drawings
replace them, built into one font so the swap at `11.10` is an import. **No app reads this folder,
and nothing here is on a phone** until the owner's yes at `11.5` and the build rows after it.

| File | What it is |
|---|---|
| `<dibujo>.svg` | One drawing per icon, in the line below |
| `mapa.json` | Each drawing's code point, the MaterialCommunityIcons names it replaces, where the apps show it; and the screens the first half covers |
| `WeraIconos.ttf`, `WeraIconos.json` | The font and its glyph map, keyed by the names the apps write today — built by `bash brand/render-fuente-iconos.sh` (`fuente.py`), never by hand |
| `inventario.mjs`, `inventario.json` | Every glyph the three apps draw, found by the TypeScript compiler, and the drawing that replaces it (`null` while there is none) |
| `iconos.mjs` | The check: `node brand/iconos/iconos.mjs` |

## The line

The marker line direction A's proposal drew (https://claude.ai/artifact/DnbxMURykZKNYYeemUHbuz),
in the trade drawings' manner: plain objects, rounded, a little uneven.

- **A 24-unit square**, the grid MaterialCommunityIcons uses, so a drawing sits where the glyph it
  replaces sat. Keep the ink at least one unit inside the square.
- **One stroke of 2, round ends and round joins.** Set them once on the root (`fill="none"
  stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`); no part takes
  another width.
- **Solid only where a shape reads better full** — a play button, a QR's three corners, a
  quote's two balls, a tie: `fill="#000"` on that part. A filled glyph that means *on* (a heart
  that follows, a bell that rings) is the same drawing filled.
- **By hand, not by ruler**: coordinates are placed, not snapped to the half-unit, and no drawing
  is quite symmetrical. Ink only: no transform, no opacity, no colour, no style — the app colours
  the glyph as text.
- **Today's meaning, our drawing.** Each drawing says what the glyph it replaces says (Vender is
  still a cash register, Merma a basket with a minus); `mapa.json` names where each is seen.

## Adding or changing a drawing

1. Draw `<dibujo>.svg` in the line; add it to `mapa.json` with the next free code point
   (U+E000 up, never reused) and the names it replaces.
2. `bash brand/render-fuente-iconos.sh` — the font and its map, byte for byte repeatable.
3. `node brand/iconos/inventario.mjs`, then `node brand/iconos/iconos.mjs` — red if the font no
   longer draws its sources, if a drawing leaves the line, or if a screen of the first half names
   a glyph not drawn.

⚠️ **The font sits where MaterialCommunityIcons' does** — the same em (512), ascent (448) and
descent (−64) — so an icon lands in the same box of the same `<Text>` at every size on both
platforms. Change none of them: `iconos.mjs` compares both fonts.

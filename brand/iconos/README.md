# brand/iconos — the apps' icons, drawn

Step 11, rows `11.3-i` (2026-11-21: the line, the font, the 33 most seen) and `11.3-ii` (2026-11-26:
every other glyph, so the font is whole). Since `11.10-i` (2026-11-28) the three apps draw them in place of
MaterialCommunityIcons: each app's `src/marca/iconos/` holds the font and its map byte for byte, and
`@/ui/Icono` (one file in the three) draws them, keyed by the names the apps wrote before (each app's
`test/iconos.test.ts`). **A change here reaches a phone only when it is copied into the apps** — Wera
over the air, the siblings in their next build.

| File | What it is |
|---|---|
| `<dibujo>.svg` | One drawing per icon, in the line below |
| `mapa.json` | Each drawing's code point, the MaterialCommunityIcons names it replaces, where the apps show it; and the screens the first half covers |
| `WeraIconos.ttf`, `WeraIconos.json` | The font and its glyph map, keyed by the names the apps write today — built by `bash brand/render-fuente-iconos.sh` (`fuente.py`), never by hand |
| `inventario.mjs`, `inventario.json` | Every glyph the three apps draw, found by the TypeScript compiler, and the drawing that replaces it (`null` while there is none; `marca: true` on a company's own mark) |
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
  that follows, a bell that rings, a star given, a ticked box) is the same drawing filled.
- **A cut is drawn in white** (`stroke="#fff"`), over a solid part drawn before it — the check in
  a ticked box, the cross in a filled circle. The font takes it out of the ink, so the phone's
  ground shows through; the check compares the holes.
- **A small solid dot is a filled circle with no stroke** (`fill="#000" stroke="none"`, as the
  dial pad's keys): a circle stroked wider than its radius outlines hollow in the font.
- **By hand, not by ruler**: coordinates are placed, not snapped to the half-unit, and no drawing
  is quite symmetrical. Ink only: no transform, no opacity, no colour, no style — the app colours
  the glyph as text.
- **Today's meaning, our drawing.** Each drawing says what the glyph it replaces says (Vender is
  still a cash register, Merma a basket with a minus); `mapa.json` names where each is seen. Two
  names that mean one thing take one drawing (`pencil` and `pencil-outline`; a purchase in the
  documents and the Comprar tab), and the loyalty card's `cow` is the Wera cow
  (`brand/wera-mark.svg`) in the line.

## Two marks that are not ours

`google` (*Continuar con Google*) and `whatsapp` are each company's own mark: never redrawn, and not
copied either — MaterialCommunityIcons' licence leaves its brand icons out
(pictogrammers.com/docs/general/license, read 2026-11-26). Each is its owner's own file, by its
owner's rules — `brand/marcas/README.md` (`11.10-i`): Google's G is Google's picture since then, so
it is no glyph; `whatsapp` stays in `mapa.json`'s `marcas`, drawn by `@/ui/Icono` from
MaterialCommunityIcons as before, until Meta's own glyph is there.

## Adding or changing a drawing

1. Draw `<dibujo>.svg` in the line; add it to `mapa.json` with the next free code point
   (U+E000 up, never reused) and the names it replaces.
2. `bash brand/render-fuente-iconos.sh` — the font and its map, byte for byte repeatable.
3. `node brand/iconos/inventario.mjs`, then `node brand/iconos/iconos.mjs` — red if the font no
   longer draws its sources, if a drawing leaves the line, or if any glyph the three apps draw is
   neither drawn nor a mark. **A glyph the apps start naming turns it red** until it is drawn here.

⚠️ **The font sits where MaterialCommunityIcons' does** — the same em (512), ascent (448) and
descent (−64) — so an icon lands in the same box of the same `<Text>` at every size on both
platforms. Change none of them: `iconos.mjs` compares both fonts.

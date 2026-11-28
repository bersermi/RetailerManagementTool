# brand/dibujos — the apps' drawings

Step 11, row `11.4` (2026-11-26): the drawings the three apps show where they have nothing else to
show — a screen with nothing yet, a kitchen or a dish without a photo, a reward won — in the icons'
line (`brand/iconos/README.md`, his call 10). **Since `11.10-ii` the three apps draw them**, each from its own copies
of `png/` — Wera's `app/src/marca/vacios/`, the siblings' `src/marca/dibujos/` — held to these files byte for byte, and
every place to `dibujos.json`, by each app's `test/dibujos.test.ts` (in `app.yml`'s and `cocina-itacate.yml`'s filters).

| File | What it is |
|---|---|
| `<dibujo>.svg` | One drawing, in the line below |
| `dibujos.json` | Each drawing's kind, size and ink, and where it sits: the screen's file, the sentence beside it (a key of that app's `strings.ts`), what the screen shows there today. Also every place that draws a trade today (`sinFoto`) and the empty states left without a drawing, with why (`sinDibujo`) |
| `png/` | Each drawing as a picture at 1×, 2× and 3×, black on transparent — drawn by `bash brand/render-dibujos.sh`, never by hand |
| `dibujos.mjs` | The check: `node brand/dibujos/dibujos.mjs` |

## The line, on a larger square

The icons' line (`brand/iconos/README.md`) — one marker stroke, round ends and round joins, placed
by hand, ink only, solid only where a shape reads better full — drawn on **a 64-unit square with a
stroke of 3**. Scaled to an icon's 24 units that is a stroke of about 1.1: the same pen, a bigger
drawing, so a drawing of 96 to 160 points carries a 4.5 to 7.5-point line, not a poster's.

- Keep the ink at least one unit inside the square.
- No word is ever drawn: the sentence beside a drawing is the app's own string, read aloud and sized
  by the phone.
- The apps draw a picture tinted at runtime (`<Image tintColor>`), since no build carries an SVG
  library, so a drawing is one colour.

## Where each kind goes (`dibujos.json`, `reglas`)

- **An empty screen** gets a drawing only where the whole screen, or its one list, has nothing yet —
  never while it loads, without signal, on a failure, or when a search matched nothing (Wera's
  `catalogLine` and `providerLine` choose among those; only their *nothing yet* line takes one).
  Above the sentence, centred, 96 points (120 at Wera's *Letra grande*), **in the screen's own colour**
  on the counter: each app's `accion`, and on Wera's *Lo último* the colour of its counter
  (`accion`, `compra`, `desperdicio`), as `8g` ruled. It replaces today's glyph and its disc. The
  family shell's rule: *an empty screen gives one sentence, one drawing and the button that fills it.*
- **A kitchen or a dish without a photo** wears her colour and **her trade's drawing once**, in white,
  centred at 60% of the frame's height (64% in a dish row's square) — in place of today's wallpaper
  (`Dibujo`'s `portada`: 28 faint copies and a large one). The nine keep the names the code gives them
  (`DIBUJOS` in both siblings' `src/api/pagina.ts`), so `11.10` swaps files, not names.
  ⚠️ **The map's pins keep today's solid drawings** (`brand/giros.svg`, rendered by
  `store/cocina-itacate/render.sh`): at 20 points a line is a smudge. So both sets are kept — since `11.10-ii` the
  flat ones in the neighbours' app alone (`itacate/src/marca/giros/`, `@/theme/pines`), the only one with a map.
- **A reward won** (*¡Ganaste …!*) is one drawing in white on a sheet of the kitchen's colour,
  150 points, above the reward in `premio` (Mansalva, as row `11.1` ruled), in place of today's
  disc, cow and three badges. The cow stays on the card's stamps.

## Adding or changing a drawing

1. Draw `<dibujo>.svg` in the line; give it an entry in `dibujos.json` — its kind, its size in points,
   and for an empty screen or the reward, where it sits.
2. `bash brand/render-dibujos.sh` — every picture, at 1×, 2× and 3×.
3. `node brand/dibujos/dibujos.mjs` — red if a picture is not its source, if a drawing leaves the
   line, if a screen or sentence it names is gone from the code, if a trade the siblings draw has no
   drawing, or if an ink falls under 3:1 on what it is drawn on.
4. Copy its three pictures into every app that draws it (`app/src/marca/vacios/`, `cocina/src/marca/dibujos/`,
   `itacate/src/marca/dibujos/`) in the same PR, and name it in that app's table (`@/marca/vacios`, `@/theme/dibujos`) —
   or that app's `test/dibujos.test.ts` is red.

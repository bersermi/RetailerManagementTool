// ============================================================================
// ÁREA 13 — THE ELEVEN COLOUR ROLES. Plan task 5b.6, ADR-035 §2.11.
//
// Direction B — "Mercado" — ruled by the owner on 2026-09-17 over three rounds
// of drawings: "let's go full B." Of the three directions drawn over the same
// Vender basket, this is the one that carries meaning with HUE. Green acts,
// amber warns, red destroys.
//
// ⚠️ IT IS WRITTEN BEFORE THE FIRST COLOURED SCREEN ON PURPOSE, and the reason
// is `density.ts`'s reason one step over: retrofitting colour onto finished
// screens is an audit of every file, and the ones an audit misses are the
// states nobody looks at — the empty list, the failed write, the row with no
// price. The client reached `5b-i` with twenty-nine source files and ZERO
// colour in any of them, which is the hole this file fills.
//
// SO THE RULE FOR EVERY SCREEN FROM `5b-ii` ONWARDS IS ONE LINE: a colour a
// person sees comes from here, never from a literal. `R11` in
// `docs/checks/conventions-gate.sh` reads it, the way `R6` reads sizes.
//
// ⚠️⚠️ A ROLE HAS ONE JOB, AND THAT IS THE WHOLE DESIGN. `atencion` is the
// unpriced row and nothing else; it is not "the orange one". This is what lets
// someone who is not a designer add a screen without inventing anything — they
// pick the role whose sentence matches what they are building. A role used for
// a second job is how eleven roles become a palette of eleven opinions.
//
// ⚠️⚠️ NO STATE IS EVER ANNOUNCED BY COLOUR ALONE. Always colour AND a word,
// or colour AND a border. This is the one argument that survived from the
// REJECTED direction C, and it is not politeness: the pilot's users are old,
// the shop is bright, and two of its four phones are low-end Android with
// poor screens. A hue on its own is not a signal to them. ⚠️ No check in this
// repository can see this rule — §2.11 bans rendering suites — so it lives
// here, in the ADR, and in the head of whoever writes the next screen.
//
// ⚠️ THIS FILE HAS NO SIZES AND NO FONTS, the mirror of the sentence at the
// top of `density.ts`. Type is the operating system's own face: no download,
// no layout shift on first paint, native numerals. A shop that spends its day
// without signal cannot afford a webfont, and a brand face is a download.
//
// ⚠️ THE KEYS ARE UNACCENTED SPANISH — `accion`, `atencion`, `linea`. The
// domain language is Spanish (CLAUDE.md), and the accents are dropped so the
// identifier can be typed and grepped on any keyboard. The accent lives in the
// role's sentence below, where a person reads it.
// ============================================================================

/**
 * Every colour a screen is allowed to read. One field per role, and the
 * doc-comment is the role's ONE job — the sentence a person matches their
 * screen against before picking it.
 */
export interface Palette {
  /** The ground of every screen. */
  readonly fondo: string;
  /** Lists, cards and sheets — what sits on top of `fondo`. */
  readonly superficie: string;
  /** The screen header, and only the screen header. */
  readonly banda: string;
  /** All primary text. Product names, totals, headings. */
  readonly tinta: string;
  /** Units and secondary labels — never a price, never a name. */
  readonly tintaApagada: string;
  /** 1 px separators. ⚠️ Structure, not text: see the note below. */
  readonly linea: string;
  /** What ACTS: cobrar, recibir, the active tab, the `+` on a row. */
  readonly accion: string;
  /** The resting fill behind an action, so it reads as tappable at rest. */
  readonly accionSuave: string;
  /** ⚠️ C3.17 AND NOTHING ELSE: `falta precio`, and a line priced `$0.00`. */
  readonly atencion: string;
  /** The ground of a row that needs attention. Pairs with `atencion`. */
  readonly atencionSuave: string;
  /** What DESTROYS: `Quitar`, cancelling a sale, registering merma. */
  readonly error: string;
  /**
   * ⚠️ THE TWELFTH ROLE, ADDED 2026-09-24 BY `5f-iii-a`: **the screen a sheet
   * is laid over, dimmed.** It is laid down under a translucency rather than
   * painted flat — `opacity` is a number and not a colour, so `R11` is
   * satisfied by naming the hue here instead of typing `rgba(0,0,0,.4)` into a
   * screen, which that rule forbids by name.
   *
   * ⚠️ IT IS IN NO INK OR GROUND LIST AND THAT IS DELIBERATE. Nothing is ever
   * written ON it — the sheet carries its own `fondo` — so a 4.5:1 assertion
   * against the inks would be asserting something no shopkeeper ever reads.
   * `linea` is absent from `GROUND_ROLES` for exactly this reason.
   */
  readonly velo: string;
}

/**
 * ⚠️⚠️ ONE VALUE HERE DISAGREES WITH THE CANVAS ON PURPOSE, AND IT IS THE ONE
 * THE USERS NEED MOST. The drawings the owner ruled on put `atencion` at
 * `#A8620A`. Measured against WCAG 2.1 afterwards, that amber is **4.25:1 on
 * `atencionSuave`** — below the 4.5:1 floor for normal text, on the exact
 * pairing the role exists for: amber words on an amber row. It also missed on
 * `banda` (4.22) and `accionSuave` (4.08).
 *
 * `#9A5A09` is the same hue (33.4°) and the same saturation, three steps
 * darker in lightness, and it clears 4.5:1 against EVERY ground with margin —
 * 4.69 at worst. `app/test/palette.test.ts` asserts the whole matrix, so this
 * cannot quietly drift back. The canvas is a drawing; this table is the
 * shipped palette, and `docs/PLAN.md` records the divergence by name.
 *
 * ⚠️ AND ONE NEAR-IDENTITY IS LEFT AS DRAWN, MEASURED AND SAID OUT LOUD.
 * `banda` and `atencionSuave` are TWO CHANNEL STEPS APART — for a shopkeeper
 * they are the same cream. They never abut today (the band is the header, the
 * attention ground is a list row), so it is not a defect; it is the sharpest
 * possible argument for the rule above it. If a row needing attention is ever
 * placed inside the header band, its colour will be telling her NOTHING and
 * the word `falta precio` will be doing all the work — which is precisely what
 * "never colour alone" already requires of it.
 *
 * ⚠️⚠️ AND A THIRD MEASUREMENT IS THE REASON THAT RULE IS NOT POLITENESS.
 * `accion` and `atencion` — green acts, amber warns — are **1.18:1 apart in
 * luminance**. They differ in HUE and in almost nothing else, which is the
 * classic red-green confusion pair: to roughly one man in twelve they are two
 * greys of the same brightness. Direction B carries meaning with hue, and this
 * is the bill for that choice. It is not repaired by darkening one of them —
 * both clear 4.5:1 on every ground already, and a monochrome viewer would
 * still be guessing. The word beside the colour is the fix, and it is free.
 */
export const PALETTE: Palette = {
  fondo: '#FFFCF6',
  superficie: '#FFFFFF',
  banda: '#FBF0DE',
  tinta: '#201D16',
  tintaApagada: '#6F675A',
  linea: '#E7E0D2',
  accion: '#1C6B4B',
  accionSuave: '#E6F0EA',
  atencion: '#9A5A09',
  atencionSuave: '#FCF1DE',
  error: '#A32218',
  velo: '#15130E',
};

/** `'fondo' | 'superficie' | …` — derived from the table so the two cannot drift. */
export type PaletteRole = keyof Palette;

/**
 * Every role's name, for iteration. Ordered as the table above: the grounds,
 * then the inks, then the three pairs that carry state.
 */
export const PALETTE_ROLES: readonly PaletteRole[] = [
  'fondo',
  'superficie',
  'banda',
  'tinta',
  'tintaApagada',
  'linea',
  'accion',
  'accionSuave',
  'atencion',
  'atencionSuave',
  'error',
  'velo',
];

/**
 * ⚠️ THE ROLES A PERSON READS WORDS IN. Anything in this list must clear
 * 4.5:1 against everything in `GROUNDS` — asserted token by token in
 * `app/test/palette.test.ts`, because "old eyes in a bright shop" is the
 * entire reason área 13 happened and it is checkable without rendering.
 */
export const INK_ROLES: readonly PaletteRole[] = [
  'tinta',
  'tintaApagada',
  'accion',
  'atencion',
  'error',
];

/**
 * ⚠️ THE ROLES A PERSON READS WORDS *ON*. `linea` is deliberately absent: it
 * is a 1 px separator and nothing is ever written on it. It is also, at 1.28:1
 * against `fondo`, far below the 3:1 non-text threshold — and that is the
 * accepted cost of direction B. Direction C carried structure in 2 px rules
 * and was REJECTED because at `Letra grande` the borders ate the screen, so
 * here the row boundary is carried by space, and the line is a hint.
 */
export const GROUND_ROLES: readonly PaletteRole[] = [
  'fondo',
  'superficie',
  'banda',
  'accionSuave',
  'atencionSuave',
];

// ============================================================================
// THE SERIES RING — `5g-iii`, 2026-09-25, AND IT IS THIS FILE'S FIRST
// CATEGORICAL SCALE.
//
// ⚠️⚠️ IT IS DELIBERATELY *NOT* A SET OF ROLES, AND THAT IS THE WHOLE REASON IT
// SITS BELOW `Palette` RATHER THAN INSIDE IT. The rule at the top of this file
// is that a role has ONE JOB and you pick it by matching its sentence to what
// you are building — `atencion` is the unpriced row and nothing else. A series
// colour's job is *"the third provider on this chart"*, which is not a meaning
// at all: it is an INDEX wearing a colour. Adding these to `Palette` would put
// five members in `PALETTE_ROLES` that no screen can ever pick by name, and
// would make the table's own design sentence false.
//
// ⚠️ `Costos`'s SCREEN is the only reader — `app/src/app/costos/[id].tsx`, and
// as of 2026-09-25 nothing else. `@/export/costsPdf` read it too until `5g-iii-a`
// took the chart out of the shared document on the owner's ruling; the PDF is a
// table now and `app/test/costs-pdf.test.ts` asserts that **not one of these
// hexes appears in it**. `@/api/costs` hands the screen an INDEX —
// `CostSeries.hue` — so no data module ever holds a colour. `R11` skips this file
// and only this file, which is why the ring belongs here and not beside the
// screen.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT THESE COLOURS CANNOT DO, MEASURED AND SAID OUT LOUD
// ----------------------------------------------------------------------------
// Every one clears the 3:1 WCAG non-text floor against all five grounds — the
// worst is `tres` at **3.26:1** on `accionSuave`, and `uno` and `dos` clear
// 5.5:1, so a legend may put a WORD in these colours as well as a swatch.
//
// ⚠️ THEY DO NOT SEPARATE FROM EACH OTHER BY BRIGHTNESS, AND FIVE CATEGORICAL
// COLOURS ON A LIGHT GROUND CANNOT. Mutual ratios run **1.19:1 to 2.65:1**: the
// worst pairs are `dos`/`cuatro` (plum against violet) and `tres`/`cinco` (teal
// against slate), both 1.19 — two greys of the same brightness to a monochrome
// reader, which is precisely the confession this file already makes about
// `accion` and `atencion` at 1.18. ⚠️ A search WAS run for a ring that separated
// in brightness too; it produced three near-identical navies and a garish
// magenta, because optimising adjacent pairs lets the distant ones collapse.
// **The honest version is a tasteful ring plus a structural fallback, and both
// halves of the fallback already exist because the owner asked for them:**
//
//   * the legend pairs every colour with the PROVIDER'S NAME — so the chart
//     obeys *no state is ever announced by colour alone* on its own terms; and
//   * the collapsible MATRIX is the same rows with no colour in it at all
//     (`matrixOf` in `@/api/costs`), which is the complete reading for somebody
//     who cannot use hue — *"As a collapsable you can get the matrix that shows
//     this data"*, 2026-09-24.
//
// ⚠️ SO A WRAPPED RING IS A WART AND NOT A LIE. A product bought from six or
// more suppliers reuses `uno` for the sixth line; the legend still names it and
// the matrix still carries it. Nothing in the pilot is expected to reach five
// suppliers for ONE product — and if a shop does, the picture degrades into the
// table, which is the right direction for it to degrade in.
//
// ⚠️ THE HUES AVOID THE THREE STATE COLOURS ON PURPOSE — nothing near `error`'s
// red (~6°), `atencion`'s amber (~33°) or `accion`'s green (~150°). A chart line
// in the destroy colour would be announcing something about a delivery that went
// perfectly well. ⚠️ `uno` is 1.00:1 against `accion` — the same brightness as
// the action green, a different hue — which matters not at all here because
// `accion` never draws inside the plot, and is recorded so nobody discovers it
// as a surprise.
// ============================================================================

/**
 * One line per provider, in the order `costsFrom` assigns — which is **most
 * recent delivery first**, so the supplier a shop bought from this morning is
 * always `uno` and a one-supplier shop always draws the same colour.
 *
 * ⚠️ THE ORDER OF THIS ARRAY IS PART OF THE DESIGN. The first two entries are
 * the common cases (one or two suppliers for a product) and they are the pair
 * furthest apart in both hue and brightness — 1.32:1, blue against plum. The
 * least distinguishable pairs are pushed to positions only a four- or
 * five-supplier product ever reaches.
 */
export const SERIE: readonly string[] = [
  '#1F5FA8', // uno    — blue
  '#7E2E67', // dos    — plum
  '#3E8E99', // tres   — teal
  '#53307D', // cuatro — violet
  '#6E7787', // cinco  — slate
];

/**
 * The colour for the `n`th series, wrapping. ⚠️ **It wraps rather than throwing
 * or returning a fallback grey**: a sixth supplier's line must still be drawn,
 * and the legend and the matrix are what tell it apart. See the header.
 */
export function serieColour(hue: number): string {
  const ring = SERIE;
  if (ring.length === 0) return PALETTE.tinta;
  const at = ((hue % ring.length) + ring.length) % ring.length;
  return ring[at] as string;
}

// ============================================================================
// C3.18 — TWO DENSITY MODES, AND THE OWNER CHOSE BOTH RATHER THAN A COMPROMISE.
// Plan task 5a-ii.
//
//   "Many users are old; we want to prioritise the visibility of essential
//    things big and at a glance." A normal mode and an elder mode with taller
//    rows, "compromising a bit more on the aesthetics" — fewer rows on screen,
//    leaning harder on search.
//
// ⚠️ IT IS WRITTEN BEFORE THE FIRST SCREEN ON PURPOSE, and the plan says why:
// this is the cheap moment. Retrofitting a second density onto finished screens
// is not a theme change, it is an audit of every hardcoded number in the app —
// and the ones it misses are exactly the rows an old customer cannot read.
//
// SO THE RULE FOR EVERY SCREEN FROM 5d ONWARDS IS ONE LINE: a size that a
// person looks at comes from `useDensity()`, never from a literal. A literal
// `fontSize: 16` is a screen that has only one density and does not say so.
//
// ⚠️ THIS FILE HAS NO COLOURS AND NO FONTS. Density is not a palette. C3.18 is
// about SIZE — what is legible across the counter at arm's length — and the
// two modes differ in nothing else. Mixing a colour scheme in here would make
// "elder" a second theme, and then a screen would have to choose between them.
// ============================================================================

/**
 * Every size a screen is allowed to read. Both modes below are typed as this,
 * which is the cheapest guard available: a token added to one mode and
 * forgotten in the other **fails the typecheck**, not a review.
 */
export interface DensityScale {
  /** List-row height — C3.18's "taller rows", the visible half of the mode. */
  readonly rowHeight: number;
  /** Vertical gap between rows in a list. */
  readonly rowGap: number;
  /** Base spacing unit. Screen padding and stack gaps are multiples of it. */
  readonly space: number;
  /** Minimum side of anything tappable. Never below the platform floor. */
  readonly tapTarget: number;
  /** Ordinary text: product names, provider names, labels. */
  readonly bodySize: number;
  /**
   * The line under a name: a unit, a date, a hint. `8f` named it — it was
   * `bodySize * 0.85`, written out 33 times in 7 files, a size nobody chose but
   * everybody used. The same value, so nothing a person sees moved.
   */
  readonly smallSize: number;
  /** Screen and section headings. */
  readonly titleSize: number;
  /**
   * A title's line — `11.6`, direction A (the owner's yes of 2026-11-26): Archivo's
   * line box is not Nunito's, so a title says its own (26 and 32, the design
   * system's `titulo`), or the header moves by the font's padding.
   */
  readonly titleLine: number;
  /**
   * A heading over a block — `11.6`: the spaced capitals become this, in the
   * titles' face and in sentence case (the design system's `encabezado`).
   */
  readonly headingSize: number;
  /** Its line. */
  readonly headingLine: number;
  /**
   * A price or a total. Its own token because it is the number the mode exists
   * for: the thing that must be readable "big and at a glance".
   */
  readonly moneySize: number;
  /**
   * ⚠️ `11.6`: A SCREEN'S ONE BIG NUMBER — *Inicio*'s total — in Archivo Condensed
   * Bold with tabular figures (`@/theme/letra`'s `letraNumero`), the design system's
   * `numero`. One per screen; money in rows, carts and buttons stays `moneySize`.
   */
  readonly numeroSize: number;
  /** Its line. */
  readonly numeroLine: number;
  /** Icon side. Paired with a word, always (C12.1) — never on its own. */
  readonly iconSize: number;
  /** The Spanish word under a tab-bar icon (C12.1). */
  readonly tabLabelSize: number;
  /** Tab-bar height, excluding the device's safe-area inset. */
  readonly tabBarHeight: number;
  /**
   * The side of a product's picture square on Vender's row — `8g`, the owner's
   * *B · Mostrador*, 2026-10-15. He traded rows on screen for it: *"I'm willing
   * to sacrifice some of the canvas height per product."* It is what sets the
   * row's height, so `Letra grande`'s larger words fit in the room it makes.
   */
  readonly retratoSize: number;
  /**
   * The side of the shop's watermark in the tab screens' band — `8g`, the
   * owner's option C. Faint and cut by the band's edge, so its size is felt
   * more than seen; larger at `Letra grande` only because the band is taller.
   */
  readonly selloSize: number;
}

/**
 * ⚠️ THE FLOOR IS NOT A STYLE CHOICE. 44pt is Apple's minimum touch target and
 * 48dp is Android's; the larger of the two is the number both modes must clear,
 * INCLUDING the normal one. C3.18 makes elder mode bigger — it does not make
 * normal mode a place where a floor stops applying.
 */
export const MIN_TAP_TARGET = 48;

/** The default. Nothing about it is "small" — it is a shop, not a dashboard. */
const normal: DensityScale = {
  rowHeight: 56,
  rowGap: 8,
  space: 12,
  tapTarget: 48,
  bodySize: 16,
  smallSize: 13.6,
  titleSize: 22,
  titleLine: 26,
  headingSize: 16,
  headingLine: 20,
  moneySize: 20,
  numeroSize: 34,
  numeroLine: 38,
  iconSize: 24,
  tabLabelSize: 12,
  tabBarHeight: 56,
  retratoSize: 80,
  selloSize: 110,
};

/**
 * ⚠️ EVERY TOKEN IS STRICTLY LARGER THAN NORMAL'S, and that is the promise C3.18
 * bought — not "different", larger. `app/test/density.test.ts` asserts it token
 * by token, because the failure mode is not someone deleting elder mode: it is
 * someone tuning one screen, nudging a normal-mode number up to match, and
 * quietly leaving one token where the two modes are the same size.
 *
 * The cost is accepted, in the owner's words: fewer rows on screen, leaning
 * harder on search. `rowHeight` here is ~36% taller, so a list that showed
 * eleven rows shows eight.
 */
const elder: DensityScale = {
  rowHeight: 76,
  rowGap: 12,
  space: 16,
  tapTarget: 60,
  bodySize: 20,
  smallSize: 17,
  titleSize: 28,
  titleLine: 32,
  headingSize: 20,
  headingLine: 24,
  moneySize: 30,
  numeroSize: 44,
  numeroLine: 48,
  iconSize: 32,
  tabLabelSize: 15,
  tabBarHeight: 76,
  retratoSize: 100,
  selloSize: 140,
};

export const DENSITIES = { normal, elder } as const;

/** `'normal' | 'elder'` — derived from the table so the two cannot drift. */
export type DensityMode = keyof typeof DENSITIES;

/** Every mode's name, for iteration. Ordered least to most magnified. */
export const DENSITY_MODES: readonly DensityMode[] = ['normal', 'elder'];

// ============================================================================
// ⚠️ THE CORNERS — `11.6`, direction A · *Mostrador*, the owner's yes of
// 2026-11-26 (Step 11 of the plan; the design system's *Esquinas*). A corner says
// what a thing is before it is read: a sheet is read, a ticket is handed over, a
// stamp is earned, a tag is a price.
//
// ⚠️⚠️ THE ONE SIZE HERE THAT `Letra grande` DOES NOT CHANGE, ON PURPOSE: paper does
// not get rounder when the letters grow. Until `11.6` most of this app's corners
// read `scale.space` (or a fraction of it) and grew with the mode, and the pills
// were made from `tapTarget`. So it is a constant beside the scale, not a
// token in it — `density.test.ts`'s *strictly larger* would refuse it there, and
// rightly — and it lives in this file because `R6` (`conventions-gate.sh`) reads a
// numeric corner anywhere else as a size elder mode cannot change.
//
// A circle stays a circle — a stamp, a kitchen's initials, a dot, a coin — and is
// half its own side, as before; the design system's `esquina-sello` is that.
// ============================================================================
export const ESQUINA = {
  /** A sheet: a list, a card, a bottom sheet's top corners, a band of colour. */
  hoja: 3,
  /** A button, filled or not, and a door. */
  boton: 3,
  /** A field she types in, and the search box. */
  campo: 3,
  /** A chip she picks from a short set, and a badge. No pills. */
  chip: 3,
  /** A price tag's square end (its point is `11.9`'s). */
  etiqueta: 2,
  /** A ticket — a sale, a code handed over: square, its notches `11.9`'s. */
  boleto: 0,
  /** A mark too small to be paper: a bar, a column, a square in a grid. */
  marca: 1,
} as const;

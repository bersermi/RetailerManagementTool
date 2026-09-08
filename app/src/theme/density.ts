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
  /** Screen and section headings. */
  readonly titleSize: number;
  /**
   * A price or a total. Its own token because it is the number the mode exists
   * for: the thing that must be readable "big and at a glance".
   */
  readonly moneySize: number;
  /** Icon side. Paired with a word, always (C12.1) — never on its own. */
  readonly iconSize: number;
  /** The Spanish word under a tab-bar icon (C12.1). */
  readonly tabLabelSize: number;
  /** Tab-bar height, excluding the device's safe-area inset. */
  readonly tabBarHeight: number;
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
  titleSize: 22,
  moneySize: 20,
  iconSize: 24,
  tabLabelSize: 12,
  tabBarHeight: 56,
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
  titleSize: 28,
  moneySize: 30,
  iconSize: 32,
  tabLabelSize: 15,
  tabBarHeight: 76,
};

export const DENSITIES = { normal, elder } as const;

/** `'normal' | 'elder'` — derived from the table so the two cannot drift. */
export type DensityMode = keyof typeof DENSITIES;

/** Every mode's name, for iteration. Ordered least to most magnified. */
export const DENSITY_MODES: readonly DensityMode[] = ['normal', 'elder'];

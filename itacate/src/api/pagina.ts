// ============================================================================
// A KITCHEN'S PAGE AS ITACATE DRAWS IT: ITS FIELDS AND EVERY DEFAULT. Plan task
// `10.5-iv-a-i`, proposal B (the owner's ruling of 2026-11-01,
// https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu).
//
// ⚠️ WERA COCINA'S FILE, CUT TO WHAT A NEIGHBOUR SEES (`cocina/src/api/pagina.ts`,
// plan `10.5-ii`): there a fonda sets her page and sees it as neighbours will; here
// the neighbour sees it. The six colours' codes, each trade's colour and drawing,
// and her initials are A CLAIM ABOUT WHAT A NEIGHBOUR SEES, so they must be the
// same in both apps — a page that wears *Chile* in Wera Cocina's preview and
// *Talavera* here would be the preview lying. Every block below is that file's,
// word for word, and `test/gemelos.test.ts` compares each one with it: a fix to
// one is a fix to both.
//
// ⚠️ NOTHING HERE TALKS TO THE DATABASE: the page arrives inside the door's answer
// (`@/api/cocinas`, `0078`), by the same names `kitchen_page` has.
// ============================================================================

/**
 * The page's fields, by the database's names — what the door sends inside each
 * kitchen (`page`). ⚠️ The door's contract check reads them out of `@/api/cocinas`.
 */
export interface PageFields {
  readonly sentence: string | null;
  readonly color: string | null;
  readonly cover_path: string | null;
  readonly logo_path: string | null;
  readonly maps_link: string | null;
}

/** The six colours, as codes (`kitchen_page_color_known`, `0076`), in the drawing's order. */
export const COLORS = ['chile', 'mole', 'nopal', 'talavera', 'cempasuchil', 'jamaica'] as const;
export type ColorCode = (typeof COLORS)[number];

export function isColor(code: unknown): code is ColorCode {
  return typeof code === 'string' && (COLORS as readonly string[]).includes(code);
}

/** Her page, as this app holds it. Each `null` is that slot's default. */
export interface Page {
  readonly sentence: string | null;
  readonly color: ColorCode | null;
  readonly cover: string | null;
  readonly logo: string | null;
  readonly mapsLink: string | null;
}

/** A page nobody has touched. */
export const EMPTY_PAGE: Page = { sentence: null, color: null, cover: null, logo: null, mapsLink: null };

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/**
 * One row, renamed. ⚠️ A COLOUR THIS BUILD DOES NOT KNOW IS HER DEFAULT, not an
 * error: a later build may offer a seventh, and this one draws what it can.
 */
export function toPage(row: Partial<PageFields> | null | undefined): Page {
  if (row === null || row === undefined) return EMPTY_PAGE;
  return {
    sentence: text(row.sentence),
    color: isColor(row.color) ? row.color : null,
    cover: text(row.cover_path),
    logo: text(row.logo_path),
    mapsLink: text(row.maps_link),
  };
}

// ----------------------------------------------------------------------------
// The defaults — what each empty slot shows
// ----------------------------------------------------------------------------

/**
 * The nine flat drawings, one per trade, drawn white by `store/cocina-itacate/
 * render.sh` from `brand/giros.svg` — Wera Cocina's `src/marca/giros/`, copied
 * byte for byte into this app's (`@/theme/dibujos`).
 */
export const DIBUJOS = ['cazuela', 'plato', 'taza', 'concha', 'bolsa', 'pollo', 'taco', 'elote', 'pescado'] as const;
export type Dibujo = (typeof DIBUJOS)[number];

export interface Defaults {
  readonly color: ColorCode;
  readonly dibujo: Dibujo;
}

/**
 * Each trade's colour and drawing (`0072`'s nine `giro-*` codes for kitchens).
 * ⚠️ A DEFAULT, NEVER A RULE: her colour is hers to choose; this is only what a
 * page shows until she does.
 */
export const POR_GIRO: Readonly<Record<string, Defaults>> = {
  'giro-fonda': { color: 'chile', dibujo: 'cazuela' },
  'giro-restaurante': { color: 'talavera', dibujo: 'plato' },
  'giro-cafeteria': { color: 'mole', dibujo: 'taza' },
  'giro-panaderia': { color: 'cempasuchil', dibujo: 'concha' },
  'giro-comida-para-llevar': { color: 'nopal', dibujo: 'bolsa' },
  'giro-rosticeria': { color: 'chile', dibujo: 'pollo' },
  'giro-taqueria': { color: 'nopal', dibujo: 'taco' },
  'giro-antojitos': { color: 'jamaica', dibujo: 'elote' },
  'giro-mariscos': { color: 'talavera', dibujo: 'pescado' },
};

/** A kitchen with no trade — or one the list no longer has — draws a fonda's. */
export const SIN_GIRO: Defaults = POR_GIRO['giro-fonda'];

export function defaultsFor(giro: string | null): Defaults {
  return (giro !== null ? POR_GIRO[giro] : undefined) ?? SIN_GIRO;
}

/** The colour her page wears: hers, else her trade's. */
export function colorOf(page: Page, giro: string | null): ColorCode {
  return page.color ?? defaultsFor(giro).color;
}

/**
 * Words that open a kitchen's name and say what it is, not who: *Fonda Doña Mari*
 * wears `DM`, as the proposals page drew it, never `FD`. Lower case, with and
 * without their accents. ⚠️ Articles are kept — *Panadería La Espiga* is `LE`, the
 * drawing's other card.
 */
const TRADE_WORDS: ReadonlySet<string> = new Set([
  'fonda', 'cocina', 'cocinita', 'económica', 'economica', 'restaurante', 'restaurant',
  'taquería', 'taqueria', 'tacos', 'panadería', 'panaderia', 'pastelería', 'pasteleria',
  'cafetería', 'cafeteria', 'café', 'cafe', 'rosticería', 'rosticeria', 'pizzería', 'pizzeria',
  'antojitos', 'mariscos', 'marisquería', 'marisqueria', 'comida', 'comidas', 'cenaduría',
  'cenaduria', 'lonchería', 'loncheria', 'de', 'del', 'y',
]);

/**
 * The two letters her circle wears until she gives a logo: the first two words
 * after the ones that say what she is; one word gives its first two letters; a
 * name made only of such words, its own first two words. ⚠️ `toUpperCase()`, not
 * a locale-aware fold — Wera's R10 (`app/src/api/catalog.ts`'s `initials`).
 */
export function kitchenInitials(name: string): string {
  const words = name.trim().split(/[\s-]+/).filter((word) => word.length > 0);
  if (words.length === 0) return '';
  let first = 0;
  while (first < words.length && TRADE_WORDS.has(words[first].toLowerCase())) first += 1;
  const rest = first < words.length ? words.slice(first) : words;
  const letters = (word: string) => Array.from(word);
  const pair = rest.length === 1 ? letters(rest[0]).slice(0, 2).join('') : letters(rest[0])[0] + letters(rest[1])[0];
  return pair.toUpperCase();
}

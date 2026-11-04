// ============================================================================
// HER PAGE IN ITACATE, AS A CONTRACT WITH POSTGRES. Plan task `10.5-ii`, on the
// table and the door `0076` made (`10.5-i-a`): `kitchen_page`, one row per
// kitchen, and `set_kitchen_page`.
//
// ⚠️ PROPOSAL B, HIS RULING OF 2026-11-01 (*"Good, follow your recommendations"*,
// https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu): on one screen, a cover photo,
// her colour out of six and one sentence; her logo if she has one; and — his
// Google ruling of the same night — her own Google Maps link, shown in Itacate as
// *Ver en Google Maps*. EVERY SLOT HAS A DEFAULT, so a page nobody touched looks
// finished: her trade's drawing on her trade's colour, and her initials.
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE, AND NOTHING THAT TALKS (`@/api/
// kitchen`'s split): `test/pagina.test.ts` reads it, and the rules the database
// keeps — the six codes, the sentence's 100 characters on one line, a link that
// opens Google Maps — are held to `0076`'s TEXT there, so the form says what is
// wrong in Spanish before the database answers `22023`.
//
// ⚠️⚠️ ONLY WHAT SHE CHANGED IS SENT (`pagePatch`). `set_kitchen_page` sets the
// keys it is sent and keeps the rest, so a section added to every page later is
// never erased by this build, which does not know it.
//
// ⚠️ ITACATE WILL DRAW THE SAME DEFAULTS (`10.5-iv`): the codes, the trades'
// colours and drawings, and the initials are a claim about what a neighbour sees.
// Its copy names this file.
// ============================================================================

import { guardada, pathOf, type Foto } from '@/api/fotos';

// ----------------------------------------------------------------------------
// The read
// ----------------------------------------------------------------------------

/** One row per kitchen (`0076`), read by her kitchen's people. No row is a page of defaults. */
export const PAGE_TABLE = 'kitchen_page';

/** What this app reads of it. Named, never `*`. ⚠️ One line: the contract check reads it. */
export const PAGE_COLUMNS = 'sentence,color,cover_path,logo_path,maps_link';

/** The column the read is filtered on — the open kitchen's id, as her place's is. */
export const PAGE_OWNER_COLUMN = 'workspace_id';

/** The prefix every page is cached under — what a save invalidates. */
export const PAGES_KEY = ['cocina', 'pagina'] as const;

/** Cached under the login and the kitchen, Cocina's rule (`kitchensKey`). */
export function pageKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...PAGES_KEY, userId ?? '', kitchenId ?? ''];
}

/**
 * The page's fields, by the database's names — what PostgREST sends back and
 * what `set_kitchen_page` reads out of its object. ⚠️ The contract check reads
 * these keys out of here.
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
// Saving — `set_kitchen_page`
// ----------------------------------------------------------------------------

/** Her page's one door (`0076`): the owner or a manager; the keys sent are set, the rest kept. */
export const SET_KITCHEN_PAGE = 'set_kitchen_page';

/** What she changed, by the database's names. A key sent as `null` clears that slot. */
export type PagePatch = Partial<PageFields>;

/** `set_kitchen_page`'s arguments, by the names PostgREST matches on; the contract check reads them. */
export interface SetPageArgs {
  readonly p_workspace_id: string;
  readonly p_page: PagePatch;
}

/** One line of at most this many characters (`kitchen_page_sentence_shape`). */
export const SENTENCE_MAX = 100;
/** A link of at most this many (`google_maps_link_ok`). */
export const LINK_MAX = 1000;

/** The sentence as it is sent: one line, its ends trimmed; blank is none. */
export function cleanSentence(typed: string): string | null {
  const one = typed.replace(/\s*[\r\n]+\s*/g, ' ').trim();
  return one === '' ? null : one;
}

/**
 * `google_maps_link_ok`, the database's rule (`0076`), to the character: https,
 * then one of the addresses Google Maps gives a place — the share button's
 * `maps.app.goo.gl/…`, `goo.gl/maps/…`, a Business Profile's `g.page/…`, or the
 * long `google.com/maps…` and `maps.google.com…`, with `.mx` or without — only
 * a URL's characters, no `..` and no encoded dot, at most 1,000 characters.
 */
const LINK_SHAPE =
  /^https:\/\/(maps\.app\.goo\.gl\/|goo\.gl\/maps\/|g\.page\/|(www\.)?google\.com(\.mx)?\/maps([/?#]|$)|maps\.google\.com(\.mx)?([/?#]|$))[\]A-Za-z0-9._~:/?#@!$&'()*+,;=%[-]*$/;

export function mapsLinkOk(link: string): boolean {
  return link.length <= LINK_MAX && LINK_SHAPE.test(link) && !link.includes('..') && !/%2e/i.test(link);
}

/**
 * The link she pasted, as it is sent, or `null` for none. ⚠️ SHARING A PLACE
 * FROM GOOGLE MAPS CAN COPY ITS NAME AND ADDRESS WITH THE LINK, so when the box
 * holds more than a link the first piece that is one is taken — she should never
 * have to clean up what the share button gave her. `undefined`: she typed
 * something with no Google Maps link in it.
 */
export function linkFrom(typed: string): string | null | undefined {
  const whole = typed.trim();
  if (whole === '') return null;
  if (mapsLinkOk(whole)) return whole;
  for (const piece of whole.split(/\s+/)) {
    const candidate = piece.replace(/^[<("'«]+|[>)"'».,;]+$/g, '');
    if (mapsLinkOk(candidate)) return candidate;
  }
  return undefined;
}

/** Her page as the form holds it: every box a string, every picture a slot. */
export interface PageDraft {
  readonly sentence: string;
  readonly color: ColorCode | null;
  readonly cover: Foto;
  readonly logo: Foto;
  readonly mapsLink: string;
}

/** The form opened on her page as it is saved. */
export function draftOf(page: Page): PageDraft {
  return {
    sentence: page.sentence ?? '',
    color: page.color,
    cover: guardada(page.cover),
    logo: guardada(page.logo),
    mapsLink: page.mapsLink ?? '',
  };
}

/** The first thing wrong with the form, in the order she fills it. */
export type PageIssue = 'sentenceLong' | 'link';

export function checkPage(draft: PageDraft): PageIssue | null {
  const sentence = cleanSentence(draft.sentence);
  if (sentence !== null && sentence.length > SENTENCE_MAX) return 'sentenceLong';
  if (linkFrom(draft.mapsLink) === undefined) return 'link';
  return null;
}

/**
 * What changed between her saved page and the form, by the database's names —
 * and nothing else (see the header). Empty when nothing did. ⚠️ CALL IT ON A
 * CHECKED FORM: a link that is not one is a refusal, not an omission.
 */
export function pagePatch(saved: Page, draft: PageDraft): PagePatch {
  const patch: { -readonly [K in keyof PageFields]?: PageFields[K] } = {};
  const sentence = cleanSentence(draft.sentence);
  if (sentence !== saved.sentence) patch.sentence = sentence;
  if (draft.color !== saved.color) patch.color = draft.color;
  const cover = pathOf(draft.cover);
  if (cover !== saved.cover) patch.cover_path = cover;
  const logo = pathOf(draft.logo);
  if (logo !== saved.logo) patch.logo_path = logo;
  const link = linkFrom(draft.mapsLink);
  if (link === undefined) throw new RangeError('the link was not checked before it was sent');
  if (link !== saved.mapsLink) patch.maps_link = link;
  return patch;
}

export function setPageArgs(kitchenId: string, patch: PagePatch): SetPageArgs {
  return { p_workspace_id: kitchenId, p_page: patch };
}

/** Her page with the form laid over it — what the preview draws while she edits. */
export function pageWith(draft: PageDraft): Page {
  const link = linkFrom(draft.mapsLink);
  return {
    sentence: cleanSentence(draft.sentence),
    color: draft.color,
    cover: pathOf(draft.cover),
    logo: pathOf(draft.logo),
    mapsLink: link === undefined ? null : link,
  };
}

// ----------------------------------------------------------------------------
// The defaults — what each empty slot shows
// ----------------------------------------------------------------------------

/**
 * The nine flat drawings, one per trade, drawn white by `store/cocina-itacate/
 * render.sh` from `brand/giros.svg` into `src/marca/giros/` (`@/theme/dibujos`).
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

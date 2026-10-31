// ============================================================================
// WHAT A KITCHEN PUBLISHES, AS A CONTRACT WITH POSTGRES. Plan task `10.4b-iv-a`
// — slice 1's screens, on the tables `0072` made (plan `10.4a`).
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE, AND NOTHING THAT TALKS
// (`@/api/kitchen`'s split): `@/api/calls` imports the live client, so the table,
// the columns, the embed, the filter, the order, the functions and their
// arguments are written once, here, where `test/listing.test.ts` reads them and
// `docs/checks/10.4b-iv-a-listing-contract.sh` reads them OUT OF THIS FILE and
// asks a real PostgREST the question the app asks.
//
// ⚠️⚠️ THE RULES ARE THE DATABASE'S (`publish_listing`, `0072`), checked here
// first so the form says what is wrong in Spanish instead of sending what comes
// back `22023`: one to ten lines; a name of at most 80 characters and a
// description of at most 200; a price in pesos and centavos above zero and below
// 100,000; a count, a whole number from 1 to 999; a usual price above the price;
// tags from the fixed six. The window's rules are `@/lib/ventana`'s.
//
// ⚠️ PROPOSAL B, HIS CHOICE OF 2026-10-29 (*"B, and yes to the directions line"*):
// each line is a dish or, with one switch, a surprise bag — the description asks
// *¿Qué suele llevar?* and she may add what it is usually worth, the *vale*. A
// dish shows the drawing's fields, and no *vale* is sent for one.
//
// ⚠️ MONEY IS INTEGER CENTAVOS, FROM `packages/money` (ADR-035 §2.11): a typed
// price is read by `parseDecimal`, never `Number()`, and sent as the decimal
// string `formatDecimal` writes, as Wera's cart sends one. A typed figure is
// cleaned as Wera's `parsePesos` cleans it (`app/src/api/catalogWrite.ts`): the
// `$`, the spaces and the thousands commas go.
//
// ⚠️ THE ID IS THE PHONE'S, so a publication sent twice — a retry over a bad
// connection — is ONE publication: `publish_listing` returns the one it already
// holds and compares nothing. So the id is kept for a retry of the SAME form and
// a new one made once she changed anything (`attemptFor`): an edit sent under
// the old id would come back "published" while the database kept the first.
//
// ⚠️ HER LIST IS READ BY THE KITCHEN'S ID, as her place is (`@/api/place`): the
// walls show a login every kitchen she belongs to, and the list is the open one's.
// ============================================================================

import { SCALE, formatDecimal, parseDecimal } from '@tienda/money';

import { formatMXN } from '@/format/mxn';
import { repeatVentana, type Ventana } from '@/lib/ventana';
import { ES } from '@/strings';

// ----------------------------------------------------------------------------
// The read — her list
// ----------------------------------------------------------------------------

/** A publication: a pickup window at one kitchen (`0072`). */
export const LISTING_TABLE = 'listing';

/** Its lines, embedded — the to-many side, so the embed's own order sorts them. */
export const LINES_TABLE = 'listing_line';

/**
 * What this app reads: the window, whether it was withdrawn, and every line.
 * Named, never `*`; the embed is `LINES_TABLE`'s. ⚠️ ONE LINE: the contract
 * check reads it with one `sed`.
 */
export const LISTING_COLUMNS = 'id,location_id,pickup_start,pickup_end,created_at,withdrawn_at,listing_line(line_no,name,description,tags,unit_price,quantity,surprise,usual_price)';

/** ⚠️ The column the list is filtered on — the open kitchen's id. See the header. */
export const LISTING_OWNER_COLUMN = 'workspace_id';

/**
 * The order in PostgREST's own spelling, comma-separated, each `column.direction`:
 * the newest publication first. ⚠️ THE DIRECTION IS PART OF THE CLAIM, so the
 * contract check sends exactly this and a list turned oldest-first goes red.
 */
export const LISTING_ORDER = 'created_at.desc,id.desc';

/** One term of `LISTING_ORDER` as supabase-js takes it. */
export function orderTerm(term: string): { readonly column: string; readonly ascending: boolean } {
  const [column, way] = term.split('.');
  return { column, ascending: way !== 'desc' };
}

/** The lines inside each publication, ascending: her order (`line_no`, `0072`). */
export const LINE_ORDER = 'line_no';

/** Her last ten publications: what *Repetir* starts from, and today's among them. */
export const LISTING_LIMIT = 10;

/** The prefix every list is cached under — what a write invalidates. */
export const LISTINGS_KEY = ['cocina', 'publicaciones'] as const;

/** Cached under the login and the kitchen, as `placeKey` is. */
export function listingsKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...LISTINGS_KEY, userId ?? '', kitchenId ?? ''];
}

/** A line as PostgREST sends it — a `numeric` arrives as a JSON number, and is read as text too. */
export interface LineRow {
  readonly line_no: number;
  readonly name: string;
  readonly description: string | null;
  readonly tags: readonly string[] | null;
  readonly unit_price: number | string;
  readonly quantity: number | string;
  readonly surprise: boolean;
  readonly usual_price: number | string | null;
}

/** A publication as PostgREST sends it. */
export interface ListingRow {
  readonly id: string;
  readonly location_id: string;
  readonly pickup_start: string;
  readonly pickup_end: string;
  readonly created_at: string;
  readonly withdrawn_at: string | null;
  readonly listing_line: readonly LineRow[] | null;
}

/** The fixed list of tags, as codes (`listing_line_tags_known`, `0072`), in the drawing's order. */
export const TAGS = ['pica', 'cerdo', 'mariscos', 'cacahuate', 'lacteos', 'gluten'] as const;
export type Tag = (typeof TAGS)[number];

/** A line, as this app holds it. Money in integer centavos. */
export interface Line {
  readonly name: string;
  readonly description: string | null;
  readonly tags: readonly Tag[];
  readonly priceCentavos: number;
  readonly count: number;
  readonly surprise: boolean;
  readonly usualCentavos: number | null;
}

/** A publication, as this app holds it. */
export interface Listing {
  readonly id: string;
  readonly placeId: string;
  readonly start: Date;
  readonly end: Date;
  readonly withdrawnAt: Date | null;
  readonly lines: readonly Line[];
}

/**
 * A `numeric` as centavos. ⚠️ A JSON NUMBER IS WRITTEN BACK AS ITS TEXT before
 * `parseDecimal` reads it — `65.5` is `"65.5"`, exactly — so no peso-valued
 * float is multiplied anywhere; a value with more than two decimals throws.
 */
export function centavosOf(value: number | string): number {
  return parseDecimal(typeof value === 'number' ? String(value) : value.trim(), SCALE.money);
}

/** A count read back: the database holds whole numbers from 1 to 999 here. */
function countOf(value: number | string): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`a count of ${String(value)}`);
  return n;
}

/** One row, renamed, its lines in her order. The only place that knows both spellings. Throws on a value it cannot read. */
export function toListing(row: ListingRow): Listing {
  const lines = [...(row.listing_line ?? [])].sort((a, b) => a.line_no - b.line_no);
  return {
    id: row.id,
    placeId: row.location_id,
    start: new Date(row.pickup_start),
    end: new Date(row.pickup_end),
    withdrawnAt: row.withdrawn_at === null ? null : new Date(row.withdrawn_at),
    lines: lines.map((line) => ({
      name: line.name,
      description: line.description === null || line.description.trim() === '' ? null : line.description,
      tags: TAGS.filter((tag) => (line.tags ?? []).includes(tag)),
      priceCentavos: centavosOf(line.unit_price),
      count: countOf(line.quantity),
      surprise: line.surprise === true,
      usualCentavos: line.usual_price === null ? null : centavosOf(line.usual_price),
    })),
  };
}

/**
 * The read's answer as a list. ⚠️ A ROW IT CANNOT READ IS DROPPED, not drawn
 * wrong and not allowed to blank the whole list — `girosFrom`'s tolerance.
 */
export function listingsFrom(data: unknown): Listing[] {
  if (!Array.isArray(data)) return [];
  const listings: Listing[] = [];
  for (const row of data) {
    try {
      const listing = toListing(row as ListingRow);
      if (Number.isNaN(listing.start.getTime()) || Number.isNaN(listing.end.getTime())) continue;
      listings.push(listing);
    } catch {
      // unreadable: left out
    }
  }
  return listings;
}

/**
 * Where a publication stands. ⚠️ *ON OFFER* IS `0072`'s: not withdrawn and the
 * window not ended — and, from `10.5b`, something left, counted from the
 * reservations, of which there are none yet.
 */
export type ListingState = 'oferta' | 'terminada' | 'retirada';

export function listingState(listing: Listing, now: Date): ListingState {
  if (listing.withdrawnAt !== null) return 'retirada';
  return listing.end.getTime() <= now.getTime() ? 'terminada' : 'oferta';
}

/** Her list as it is drawn: what is on offer first, the soonest first; then the rest, newest first. */
export function inOrder(listings: readonly Listing[], now: Date): Listing[] {
  const onOffer = listings
    .filter((l) => listingState(l, now) === 'oferta')
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  return [...onOffer, ...listings.filter((l) => listingState(l, now) !== 'oferta')];
}

// ----------------------------------------------------------------------------
// What she types — the form
// ----------------------------------------------------------------------------

/** One to ten lines (`0072`). */
export const MAX_LINES = 10;
/** A name, trimmed, of at most this many characters. */
export const NAME_MAX = 80;
/** A description, trimmed, of at most this many. */
export const DESCRIPTION_MAX = 200;
/** A count is a whole number from 1 to this. */
export const COUNT_MAX = 999;
/** ⚠️ Below 100,000 pesos: `publish_listing` refuses `>= 100000`. In centavos. */
export const PRICE_CEILING_CENTAVOS = 10_000_000;

/** A line of the form: every box a string, as a `TextInput` gives it. */
export interface LineDraft {
  /** The form's own handle for the line; never sent. */
  readonly key: string;
  readonly surprise: boolean;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly Tag[];
  readonly price: string;
  readonly count: string;
  /** What it is usually worth — read only for a surprise bag. */
  readonly usual: string;
}

/** A line nobody has typed into: a dish, nothing chosen. */
export function emptyLine(key: string): LineDraft {
  return { key, surprise: false, name: '', description: '', tags: [], price: '', count: '', usual: '' };
}

/** What a typed price is once the decoration is off — Wera's `cleanPesos`, to the character. */
function cleanPesos(typed: string): string {
  return typed.replace(/[\s,$]/g, '');
}

/**
 * A typed price as integer centavos, or `null` when it is not one — Wera's
 * `parsePesos`: three decimals, a minus sign, an exponent or a word are refused,
 * never repaired. A price this app guessed at is a price she charges.
 */
export function parsePesos(typed: string): number | null {
  const figure = cleanPesos(typed);
  if (figure === '') return null;
  try {
    const centavos = parseDecimal(figure, SCALE.money);
    return centavos < 0 ? null : centavos;
  } catch {
    return null;
  }
}

/** A typed count, or `null`: digits only, 1 to 999. */
export function parseCount(typed: string): number | null {
  const text = typed.trim();
  if (!/^[0-9]{1,3}$/.test(text)) return null;
  const n = Number(text);
  return n >= 1 && n <= COUNT_MAX ? n : null;
}

/** The first thing wrong with a line, in the order she fills it. */
export type LineIssue =
  | 'name'
  | 'nameLong'
  | 'descriptionLong'
  | 'price'
  | 'priceShape'
  | 'count'
  | 'countShape'
  | 'usualShape'
  | 'usualLow';

export function checkLine(line: LineDraft): LineIssue | null {
  const name = line.name.trim();
  if (name === '') return 'name';
  if (name.length > NAME_MAX) return 'nameLong';
  if (line.description.trim().length > DESCRIPTION_MAX) return 'descriptionLong';
  if (cleanPesos(line.price) === '') return 'price';
  const price = parsePesos(line.price);
  if (price === null || price <= 0 || price >= PRICE_CEILING_CENTAVOS) return 'priceShape';
  if (line.count.trim() === '') return 'count';
  if (parseCount(line.count) === null) return 'countShape';
  if (line.surprise && cleanPesos(line.usual) !== '') {
    const usual = parsePesos(line.usual);
    if (usual === null || usual >= PRICE_CEILING_CENTAVOS) return 'usualShape';
    if (usual <= price) return 'usualLow';
  }
  return null;
}

/** What is wrong with the whole form, and on which line (counted from 1), or `null`. */
export type FormIssue = { readonly line: number; readonly issue: LineIssue } | { readonly line: null; readonly issue: 'noLines' | 'tooMany' };

export function checkLines(lines: readonly LineDraft[]): FormIssue | null {
  if (lines.length === 0) return { line: null, issue: 'noLines' };
  if (lines.length > MAX_LINES) return { line: null, issue: 'tooMany' };
  for (let i = 0; i < lines.length; i += 1) {
    const issue = checkLine(lines[i]);
    if (issue !== null) return { line: i + 1, issue };
  }
  return null;
}

/**
 * The sentence a problem becomes. ⚠️ A LINE'S PROBLEM NAMES THE LINE AS ITS CARD
 * DOES — *Platillo 2: escribe el precio.* — because with ten lines one red
 * sentence above *Publicar* must say which; with one line it says the same.
 */
export function issueSentence(issue: FormIssue, lines: readonly LineDraft[]): string {
  if (issue.line === null) return ES.publicar.errores[issue.issue];
  const surprise = lines[issue.line - 1]?.surprise ?? false;
  return ES.publicar.errores.enRenglon(ES.publicar.renglon(surprise, issue.line), ES.publicar.errores.linea[issue.issue]);
}

/**
 * One line's figures, as her list shows them — *4 a $65*; a bag *Bolsa sorpresa ·
 * 5 a $45 · vale $90*; then its tags, *· Pica · Cerdo*.
 */
export function lineDetail(line: Line): string {
  const parts: string[] = [];
  if (line.surprise) parts.push(ES.publicar.bolsa);
  parts.push(ES.publicaciones.cantidad(line.count, formatMXN(line.priceCentavos)));
  if (line.usualCentavos !== null) parts.push(ES.publicaciones.vale(formatMXN(line.usualCentavos)));
  for (const tag of line.tags) parts.push(ES.publicar.etiqueta[tag]);
  return parts.join(' · ');
}

// ----------------------------------------------------------------------------
// Publishing — `publish_listing`
// ----------------------------------------------------------------------------

/** One call publishes the window and its lines together (`0072`). */
export const PUBLISH_LISTING = 'publish_listing';

/** `publish_listing`'s arguments, by the names PostgREST matches on; the contract check reads them out of here. */
export interface PublishArgs {
  readonly p_id: string;
  readonly p_location_id: string;
  readonly p_pickup_start: string;
  readonly p_pickup_end: string;
  readonly p_lines: readonly LineBody[];
}

/**
 * One line as `publish_listing` reads it (`0072`'s header). ⚠️ KEYS IT DOES NOT
 * KNOW ARE IGNORED, so a misspelt key is a line without that value — a price
 * misspelt is refused, a *vale* misspelt silently dropped. The contract check
 * reads these keys out of here and asks for each one back.
 */
export interface LineBody {
  readonly name: string;
  readonly description: string | null;
  readonly tags: readonly Tag[];
  readonly unit_price: string;
  readonly quantity: number;
  readonly surprise: boolean;
  readonly usual_price: string | null;
}

function required<T>(value: T | null, what: string): T {
  if (value === null) throw new RangeError(`${what} was not checked before it was sent`);
  return value;
}

/** A checked line as the database is sent it: trimmed, money as two-decimal text, tags in the fixed order. */
export function lineBody(line: LineDraft): LineBody {
  const description = line.description.trim();
  const usual = line.surprise && cleanPesos(line.usual) !== '' ? required(parsePesos(line.usual), 'a vale') : null;
  return {
    name: line.name.trim(),
    description: description === '' ? null : description,
    tags: TAGS.filter((tag) => line.tags.includes(tag)),
    unit_price: formatDecimal(required(parsePesos(line.price), 'a price'), SCALE.money),
    quantity: required(parseCount(line.count), 'a count'),
    surprise: line.surprise,
    usual_price: usual === null ? null : formatDecimal(usual, SCALE.money),
  };
}

/** Everything but the id — what `attemptFor` compares. */
export type PublishBody = Omit<PublishArgs, 'p_id'>;

/** The body for checked lines and a checked window at her kitchen's place. */
export function publishBody(placeId: string, lines: readonly LineDraft[], ventana: Ventana): PublishBody {
  return {
    p_location_id: placeId,
    p_pickup_start: ventana.start.toISOString(),
    p_pickup_end: ventana.end.toISOString(),
    p_lines: lines.map(lineBody),
  };
}

/** One press of *Publicar*: the id it was sent under and what was sent. */
export interface Attempt {
  readonly id: string;
  readonly sent: string;
}

/**
 * The id to publish under. ⚠️ THE LAST ATTEMPT'S WHEN NOTHING CHANGED — a retry
 * after *Sin conexión* is the same publication, never a second — and A NEW ONE
 * WHEN ANYTHING DID, because the database answers an id it holds with that
 * publication as it was, unread (see the header).
 */
export function attemptFor(last: Attempt | null, body: PublishBody, mint: () => string): Attempt {
  const sent = JSON.stringify(body);
  return last !== null && last.sent === sent ? last : { id: mint(), sent };
}

/** The arguments for one press: the attempt's id, and the body it was made for. */
export function publishArgs(attempt: Attempt, body: PublishBody): PublishArgs {
  return { p_id: attempt.id, ...body };
}

/**
 * The made publication, as her list holds it — drawn at once, before the re-read
 * answers. ⚠️ `publish_listing` returns the id it was sent, a retry included.
 */
export function listingFrom(args: PublishArgs): Listing {
  return {
    id: args.p_id,
    placeId: args.p_location_id,
    start: new Date(args.p_pickup_start),
    end: new Date(args.p_pickup_end),
    withdrawnAt: null,
    lines: args.p_lines.map((line) => ({
      name: line.name,
      description: line.description,
      tags: line.tags,
      priceCentavos: centavosOf(line.unit_price),
      count: line.quantity,
      surprise: line.surprise,
      usualCentavos: line.usual_price === null ? null : centavosOf(line.usual_price),
    })),
  };
}

/** Her list with the made one in front, or as it was when it is already there (a retry). */
export function withListing(listings: readonly Listing[] | undefined, made: Listing): Listing[] | undefined {
  if (listings === undefined) return undefined;
  if (listings.some((l) => l.id === made.id)) return [...listings];
  return [made, ...listings];
}

// ----------------------------------------------------------------------------
// Withdrawing — `withdraw_listing`
// ----------------------------------------------------------------------------

/** The owner or a manager takes a publication down; withdrawn once, a retry keeps the first moment (`0072`). */
export const WITHDRAW_LISTING = 'withdraw_listing';

/** `withdraw_listing`'s one argument. */
export interface WithdrawArgs {
  readonly p_id: string;
}

/** Her list with that one withdrawn now — drawn at once, before the re-read answers. */
export function withWithdrawn(listings: readonly Listing[] | undefined, id: string, at: Date): Listing[] | undefined {
  if (listings === undefined) return undefined;
  return listings.map((l) => (l.id === id && l.withdrawnAt === null ? { ...l, withdrawnAt: at } : l));
}

// ----------------------------------------------------------------------------
// *Repetir* — a past publication, ready to publish again
// ----------------------------------------------------------------------------

/** Centavos as she would type them: `65`, `65.50`. */
export function pesosText(centavos: number): string {
  const text = formatDecimal(centavos, SCALE.money);
  return text.endsWith('.00') ? text.slice(0, -3) : text;
}

/**
 * The form *Repetir* opens: her lines as she published them — each with a new
 * handle — and the window's hours on the next day they have not ended
 * (`repeatVentana`). ⚠️ NOTHING IS SENT UNTIL SHE PRESSES *PUBLICAR*: a
 * repeated publication is a new one, under a new id.
 */
export function repeatDraft(
  listing: Listing,
  now: Date,
  mint: () => string,
): { readonly lines: LineDraft[]; readonly ventana: Ventana } {
  return {
    lines: listing.lines.slice(0, MAX_LINES).map((line) => ({
      key: mint(),
      surprise: line.surprise,
      name: line.name,
      description: line.description ?? '',
      tags: line.tags,
      price: pesosText(line.priceCentavos),
      count: String(line.count),
      usual: line.surprise && line.usualCentavos !== null ? pesosText(line.usualCentavos) : '',
    })),
    ventana: repeatVentana(listing.start, listing.end, now),
  };
}

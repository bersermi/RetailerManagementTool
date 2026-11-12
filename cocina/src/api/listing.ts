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
// *¿Qué suele llevar?* for a bag.
//
// ⚠️⚠️ `10.5-v-d`: THE *VALE* IS REQUIRED, ON EVERY LINE — a dish's and a bag's alike (the
// owner's ruling of 2026-11-06: *"Lo que vale normalmente must be filled in"*), so every
// card in Itacate shows the usual price struck through and the saving, and its line *a
// mejor precio* is true of every offer published from this update on. Until then a dish
// never carried one. ⚠️ THE DATABASE DOES NOT REQUIRE IT and must not: `usual_price`
// stays nullable (`0072`), so a build in the field still publishes without it (the field
// rule). The phone is where the rule lives; `publish_listing` only refuses one not above
// the price. So *Repetir* of an offer published before the rule opens the form (`@/lib/
// hoy`'s `planDeRepetir` checks with `checkLines`) and asks for it once.
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
//
// ⚠️ `10.5-ii`: A PHOTO PER DISH, ONE MORE KEY OF EACH LINE (`image_path`, `0076`)
// — `publish_listing`'s signature unchanged, so a build that sends none publishes
// as before. The photo goes up BEFORE the line that names it (`@/api/hooks`'s
// `usePublish`), under the path made when it was taken, so a retry is the same
// photo and the same publication. *Repetir* sends yesterday's path again: a dish
// she sells every week is photographed once (proposal B).
//
// ⚠️⚠️ `10.5b-iv-c` — HOW EACH DISH MAY BE EATEN, AND − AND + (`0079`, the owner's calls 17
// and 26 of 2026-11-05):
//   - EACH LINE NARROWS HER KITCHEN'S WAYS, never widens them (`publish_listing` refuses a
//     way her kitchen does not offer): two more keys of each line, `para_llevar` and
//     `para_aqui`, sent only when her kitchen offers both — else `null`, the kitchen's own,
//     so a setting changed on another phone is never contradicted by a stale read here. A
//     surprise bag is always *para llevar*, whatever is sent. A new form starts with both on
//     (*"What her kitchen allows, all on"*); *Repetir* keeps each dish's ways as published,
//     narrowed to what her kitchen offers now (`repeatDraft`).
//   - THE READ BRINGS EACH LINE'S WAYS AND THE OFFER'S *DESECHABLE* (copied when published),
//     for her preview (`@/lib/comoLaVen`) and *Repetir*.
//   - − AND + ARE `set_listing_quantity`: how many she offers NOW, a whole number 0 to 999,
//     never below what is reserved (`TD019`) — the price and the dish never change. ⚠️ SO A
//     LINE'S COUNT MAY BE 0 since `0079`: `countOf` reads it, where until this row it refused
//     it and the whole offer was dropped from her list (found by `10.5b-iv-a`).
// ============================================================================

import { SCALE, formatDecimal, parseDecimal } from '@tienda/money';

import { apiErrorMessage } from '@/api/errors';
import { NINGUNA, guardada, pathOf, porSubir, type Foto, type FotoNueva } from '@/api/fotos';
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
export const LISTING_COLUMNS = 'id,location_id,pickup_start,pickup_end,created_at,withdrawn_at,container_price,listing_line(line_no,name,description,tags,unit_price,quantity,surprise,usual_price,image_path,para_llevar,para_aqui)';

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

/**
 * Her last 60 publications: what *Repetir* starts from, and today's among them — and,
 * since `10.5-v-c-ii`, four weeks at two a day, which her reminder's two weeks
 * (`@/lib/recordatorio`) and the four-week summary of her page as neighbours see it
 * (`@/lib/comoLaVen`) are worked out from. Ten, until then.
 */
export const LISTING_LIMIT = 60;

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
  /** `10.5-ii`: the dish's photo, `<kitchen>/<uuid>` in the bucket `cocina` (`0076`). */
  readonly image_path?: string | null;
  /** `10.5b-iv-c`: whether it may be taken away, and eaten at her kitchen (`0079`). */
  readonly para_llevar?: boolean;
  readonly para_aqui?: boolean;
}

/** A publication as PostgREST sends it. */
export interface ListingRow {
  readonly id: string;
  readonly location_id: string;
  readonly pickup_start: string;
  readonly pickup_end: string;
  readonly created_at: string;
  readonly withdrawn_at: string | null;
  /** `10.5b-iv-c`: the *desechable*'s price as her kitchen stated it when this was published (`0079`). */
  readonly container_price?: number | string | null;
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
  /** Its photo's path, or `null` — her kitchen's drawing. */
  readonly imagePath: string | null;
  /** `10.5b-iv-c`: it may be taken away (`para_llevar`). */
  readonly llevar: boolean;
  /** `10.5b-iv-c`: it may be eaten at her kitchen (`para_aqui`). */
  readonly aqui: boolean;
}

/** A publication, as this app holds it. */
export interface Listing {
  readonly id: string;
  readonly placeId: string;
  readonly start: Date;
  readonly end: Date;
  /**
   * When it was published — the database's clock (`created_at`), or the phone's for one
   * drawn before the re-read answers. ⚠️ `10.5-v-c-i`: what tells *Deshacer* from *Ya se
   * terminó* (`@/lib/hoy`'s `deshecha`) and her last day's offers for *Repetir*.
   */
  readonly createdAt: Date;
  readonly withdrawnAt: Date | null;
  /** `10.5b-iv-c`: the *desechable* copied when it was published, or `null` — no charge. */
  readonly desechableCentavos: number | null;
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

/**
 * A count read back: a whole number from 0 to 999. ⚠️ 0 SINCE `0079`: − may take a line to
 * nothing when nothing of it is reserved (`listing_line_quantity_not_negative`). Until
 * `10.5b-iv-c` this refused 0, and `listingsFrom` dropped the whole offer from her list.
 */
export function countOf(value: number | string): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`a count of ${String(value)}`);
  return n;
}

/** The *desechable* read back: pesos above zero, or `null` — no charge. */
function desechableOf(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const centavos = centavosOf(value);
  return centavos > 0 ? centavos : null;
}

/** One row, renamed, its lines in her order. The only place that knows both spellings. Throws on a value it cannot read. */
export function toListing(row: ListingRow): Listing {
  const lines = [...(row.listing_line ?? [])].sort((a, b) => a.line_no - b.line_no);
  return {
    id: row.id,
    placeId: row.location_id,
    start: new Date(row.pickup_start),
    end: new Date(row.pickup_end),
    createdAt: new Date(row.created_at),
    withdrawnAt: row.withdrawn_at === null ? null : new Date(row.withdrawn_at),
    desechableCentavos: desechableOf(row.container_price),
    lines: lines.map((line) => ({
      name: line.name,
      description: line.description === null || line.description.trim() === '' ? null : line.description,
      tags: TAGS.filter((tag) => (line.tags ?? []).includes(tag)),
      priceCentavos: centavosOf(line.unit_price),
      count: countOf(line.quantity),
      surprise: line.surprise === true,
      usualCentavos: line.usual_price === null ? null : centavosOf(line.usual_price),
      imagePath: typeof line.image_path === 'string' && line.image_path.trim() !== '' ? line.image_path : null,
      // The columns' defaults (`0079`) for a row read before the column was: to go, not here.
      llevar: line.para_llevar !== false,
      aqui: line.para_aqui === true,
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
      if ([listing.start, listing.end, listing.createdAt].some((at) => Number.isNaN(at.getTime()))) continue;
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
  /** What it is usually worth — the *vale*, required on every line since `10.5-v-d`. */
  readonly usual: string;
  /** `10.5-ii`: its photo — none, one already saved (*Repetir*), or one just taken. */
  readonly foto: Foto;
  /**
   * `10.5b-iv-c`: her choice for this dish when her kitchen offers both ways — *para llevar*,
   * *para comer aquí*, or both. Read only then (`comoSeComeDe`); a bag is always to go.
   */
  readonly llevar: boolean;
  readonly aqui: boolean;
}

/** The ways her kitchen hands plates over — `@/api/ajustes`' `Ajustes` is one. */
export interface ComoSeCome {
  readonly llevar: boolean;
  readonly aqui: boolean;
}

/** Whether her kitchen offers both ways — the only case the form asks this dish. */
export function ofreceLasDos(cocina: ComoSeCome | null): boolean {
  return cocina !== null && cocina.llevar && cocina.aqui;
}

/**
 * A line nobody has typed into: a dish, nothing chosen, no photo — and, ⚠️ `10.5b-iv-c`, how it may
 * be eaten as she last chose it on this phone (`@/lib/eleccion`, *"The form starts with her last
 * choice"*), else every way her kitchen offers (*"What her kitchen allows, all on"*).
 */
export function emptyLine(key: string, eleccion: ComoSeCome = { llevar: true, aqui: true }): LineDraft {
  return { key, surprise: false, name: '', description: '', tags: [], price: '', count: '', usual: '', foto: NINGUNA, llevar: eleccion.llevar, aqui: eleccion.aqui };
}

/** The photos taken on this form that must go up before it is published, each once. */
export function fotosPorSubir(lines: readonly LineDraft[]): FotoNueva[] {
  return porSubir(lines.map((line) => line.foto));
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
  | 'usual'
  | 'usualShape'
  | 'usualLow'
  | 'comer';

/**
 * ⚠️ `10.5b-iv-c`: `cocina` is her kitchen's ways, or `null` while they are not read — then
 * nothing is asked of the dish and it is sent as the kitchen's own (`comoSeComeDe`).
 */
export function checkLine(line: LineDraft, cocina: ComoSeCome | null = null): LineIssue | null {
  const name = line.name.trim();
  if (name === '') return 'name';
  if (name.length > NAME_MAX) return 'nameLong';
  if (line.description.trim().length > DESCRIPTION_MAX) return 'descriptionLong';
  if (cleanPesos(line.price) === '') return 'price';
  const price = parsePesos(line.price);
  if (price === null || price <= 0 || price >= PRICE_CEILING_CENTAVOS) return 'priceShape';
  if (line.count.trim() === '') return 'count';
  if (parseCount(line.count) === null) return 'countShape';
  if (cleanPesos(line.usual) === '') return 'usual';
  const usual = parsePesos(line.usual);
  if (usual === null || usual >= PRICE_CEILING_CENTAVOS) return 'usualShape';
  if (usual <= price) return 'usualLow';
  // `10.5b-iv-c`: with both ways open she picks at least one (`publish_listing`, `22023`).
  if (!line.surprise && ofreceLasDos(cocina) && !line.llevar && !line.aqui) return 'comer';
  return null;
}

/** What is wrong with the whole form, and on which line (counted from 1), or `null`. */
export type FormIssue = { readonly line: number; readonly issue: LineIssue } | { readonly line: null; readonly issue: 'noLines' | 'tooMany' };

export function checkLines(lines: readonly LineDraft[], cocina: ComoSeCome | null = null): FormIssue | null {
  if (lines.length === 0) return { line: null, issue: 'noLines' };
  if (lines.length > MAX_LINES) return { line: null, issue: 'tooMany' };
  for (let i = 0; i < lines.length; i += 1) {
    const issue = checkLine(lines[i], cocina);
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
  readonly image_path: string | null;
  /**
   * `10.5b-iv-c`: how it may be eaten — sent only when her kitchen offers both ways, else
   * `null`: the kitchen's own (`publish_listing`'s `coalesce`). See the header.
   */
  readonly para_llevar: boolean | null;
  readonly para_aqui: boolean | null;
}

/**
 * How one dish is sent: her choice when her kitchen offers both ways; `null` for the
 * kitchen's own otherwise — one way only, a surprise bag (always to go), or her ways not
 * read yet. ⚠️ NEVER A WAY HER KITCHEN DOES NOT OFFER, which `publish_listing` refuses.
 */
export function comoSeComeDe(line: LineDraft, cocina: ComoSeCome | null): { readonly para_llevar: boolean | null; readonly para_aqui: boolean | null } {
  if (line.surprise || !ofreceLasDos(cocina)) return { para_llevar: null, para_aqui: null };
  return { para_llevar: line.llevar, para_aqui: line.aqui };
}

function required<T>(value: T | null, what: string): T {
  if (value === null) throw new RangeError(`${what} was not checked before it was sent`);
  return value;
}

/** A checked line as the database is sent it: trimmed, money as two-decimal text, tags in the fixed order. */
export function lineBody(line: LineDraft, cocina: ComoSeCome | null = null): LineBody {
  const description = line.description.trim();
  const usual = required(parsePesos(line.usual), 'a vale');
  return {
    name: line.name.trim(),
    description: description === '' ? null : description,
    tags: TAGS.filter((tag) => line.tags.includes(tag)),
    unit_price: formatDecimal(required(parsePesos(line.price), 'a price'), SCALE.money),
    quantity: required(parseCount(line.count), 'a count'),
    surprise: line.surprise,
    usual_price: formatDecimal(usual, SCALE.money),
    image_path: pathOf(line.foto),
    ...comoSeComeDe(line, cocina),
  };
}

/** Everything but the id — what `attemptFor` compares. */
export type PublishBody = Omit<PublishArgs, 'p_id'>;

/** The body for checked lines and a checked window at her kitchen's place, with her kitchen's ways when read. */
export function publishBody(placeId: string, lines: readonly LineDraft[], ventana: Ventana, cocina: ComoSeCome | null = null): PublishBody {
  return {
    p_location_id: placeId,
    p_pickup_start: ventana.start.toISOString(),
    p_pickup_end: ventana.end.toISOString(),
    p_lines: lines.map((line) => lineBody(line, cocina)),
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
 * answers. ⚠️ `publish_listing` returns the id it was sent, a retry included; when it
 * was published is the phone's clock until the re-read brings the database's.
 */
export function listingFrom(args: PublishArgs, at: Date = new Date()): Listing {
  return {
    id: args.p_id,
    placeId: args.p_location_id,
    start: new Date(args.p_pickup_start),
    end: new Date(args.p_pickup_end),
    createdAt: at,
    withdrawnAt: null,
    // The kitchen's copy lands with the re-read; until then it is drawn with none.
    desechableCentavos: null,
    lines: args.p_lines.map((line) => ({
      name: line.name,
      description: line.description,
      tags: line.tags,
      priceCentavos: centavosOf(line.unit_price),
      count: line.quantity,
      surprise: line.surprise,
      usualCentavos: line.usual_price === null ? null : centavosOf(line.usual_price),
      imagePath: line.image_path,
      // `null` is the kitchen's own, which the re-read brings; to go until then.
      llevar: line.surprise || line.para_llevar !== false,
      aqui: !line.surprise && line.para_aqui === true,
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
 * ⚠️ `10.5b-iv-c`: A DISH'S WAYS, REPEATED — as she published them, narrowed to what her
 * kitchen offers now; when that leaves none (she switched that way off since), every way
 * her kitchen offers. Unread, the dish's own: `comoSeComeDe` then sends the kitchen's.
 */
export function eleccionRepetida(line: Line, cocina: ComoSeCome | null): ComoSeCome {
  // ⚠️ The columns' defaults for a copy kept on the phone by the build before `10.5b-iv-c` (`@/api/persist`).
  const suyo = { llevar: line.llevar !== false, aqui: line.aqui === true };
  if (cocina === null) return suyo;
  const llevar = suyo.llevar && cocina.llevar;
  const aqui = suyo.aqui && cocina.aqui;
  return llevar || aqui ? { llevar, aqui } : { llevar: cocina.llevar, aqui: cocina.aqui };
}

/**
 * The form *Repetir* opens: her lines as she published them — each with a new
 * handle and its photo, already saved — and the window's hours on the next day
 * they have not ended (`repeatVentana`). ⚠️ NOTHING IS SENT UNTIL SHE PRESSES
 * *PUBLICAR*: a repeated publication is a new one, under a new id.
 */
export function repeatDraft(
  listing: Listing,
  now: Date,
  mint: () => string,
  cocina: ComoSeCome | null = null,
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
      // ⚠️ `10.5-v-d`: a dish's too. One published before the rule has none, and the form asks.
      usual: line.usualCentavos !== null ? pesosText(line.usualCentavos) : '',
      foto: guardada(line.imagePath),
      ...eleccionRepetida(line, cocina),
    })),
    ventana: repeatVentana(listing.start, listing.end, now),
  };
}

// ----------------------------------------------------------------------------
// − and + — `set_listing_quantity` (`0079`, call 17; `10.5b-iv-c`)
// ----------------------------------------------------------------------------

/** How many of one line she offers now — the owner or a manager, never below what is reserved. */
export const SET_LISTING_QUANTITY = 'set_listing_quantity';

/** Its arguments, by the names PostgREST matches on; the contract check reads them out of here. */
export interface SetQuantityArgs {
  readonly p_listing_id: string;
  readonly p_line_no: number;
  readonly p_quantity: number;
}

/** What it answers, by the database's names: decimal text, read by `countOf`. ⚠️ The contract check reads these keys. */
export interface QuantityRow {
  readonly quantity: string;
  readonly taken: string;
}

/** − and + move one plate; the database takes 0 to 999. */
export const CANTIDAD_MAXIMA = COUNT_MAX;

/** `set_listing_quantity`'s refusals this app turns into sentences (`0079`'s header). */
export const QUANTITY_CODES = {
  /** Below what is reserved — a neighbour reserved while she tapped −. */
  TD019: 'apartados',
  /** Withdrawn, or its window over. */
  TD015: 'terminada',
} as const;

export function setQuantityArgs(listingId: string, lineNo: number, quantity: number): SetQuantityArgs {
  return { p_listing_id: listingId, p_line_no: lineNo, p_quantity: quantity };
}

/** The answer read: how many she offers and how many are taken. Throws on one it cannot read. */
export function cantidadFrom(data: unknown): { readonly count: number; readonly taken: number } {
  const row = (typeof data === 'object' && data !== null ? data : {}) as Partial<QuantityRow>;
  if (row.quantity === undefined || row.taken === undefined) throw new RangeError(`${SET_LISTING_QUANTITY} answered ${JSON.stringify(data)}`);
  return { count: countOf(row.quantity), taken: countOf(row.taken) };
}

/**
 * What one tap asks for, or `null` — nothing to send: never below what is taken, never
 * below 0 or above 999. The database checks the same and answers `TD019`.
 */
export function cantidadPedida(count: number, taken: number, paso: 1 | -1): number | null {
  const next = count + paso;
  if (next < 0 || next > CANTIDAD_MAXIMA || next < taken) return null;
  return next;
}

/** Her list with one line's count set — drawn at once, before the database answers. */
export function withCantidad(listings: readonly Listing[] | undefined, id: string, lineNo: number, count: number): Listing[] | undefined {
  if (listings === undefined) return undefined;
  return listings.map((l) =>
    l.id !== id ? l : { ...l, lines: l.lines.map((line, i) => (i + 1 === lineNo ? { ...line, count } : line)) },
  );
}

/** Whether a refused − was `TD019`: a neighbour reserved meanwhile, so what is taken moved. */
export function esApartado(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  return QUANTITY_CODES[code as keyof typeof QUANTITY_CODES] === 'apartados';
}

/** The Spanish sentence for a refused − or +: `TD019` and `TD015` are hers to read; anything else is the app's table. */
export function cantidadErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  if (typeof code === 'string' && code in QUANTITY_CODES) return ES.ofertas[QUANTITY_CODES[code as keyof typeof QUANTITY_CODES]];
  return apiErrorMessage(error);
}

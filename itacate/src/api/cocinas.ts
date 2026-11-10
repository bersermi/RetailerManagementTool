// ============================================================================
// THE DOOR, AS A CONTRACT WITH POSTGRES. Plan task `10.5-iv-a-i`, on `0078`'s
// `on_offer_now()` (`10.5-i-b-i`) — ADR-035 §2.7's one door: everything a
// neighbour reads of any kitchen comes through it, because she belongs to no
// business and every policy denies her.
//
// ⚠️ ITS ANSWER IS A CONTRACT THAT GROWS ONLY BY KEYS (`0078`): the interfaces
// below name the keys THIS APP reads, by the database's names, one per line, and
// `docs/checks/10.5-iv-a-door-contract.sh` reads those names out of this file and
// asks a real PostgREST for each one, signed in as a neighbour. A key the door
// adds later is ignored here; a key this file misspells is a 200 with nothing in
// it — the typecheck, the suite and the bundler all pass over it — which only that
// check sees.
//
// ⚠️ MONEY AND QUANTITIES ARRIVE AS DECIMAL STRINGS (`"65.00"`, `"4.000"`) and are
// read by `parseDecimal` (`packages/money`, ADR-035 §2.11) into integer centavos
// and thousandths: no float ever holds a peso. A point arrives as JSON numbers.
// An instant arrives as Postgres writes it — up to six decimals of a second — and
// is cut to three before any engine reads it (Wera Cocina's `toMilliseconds`).
//
// ⚠️ A KITCHEN IT CANNOT READ IS DROPPED, NEVER THE LIST — Wera Cocina's
// `listingsFrom` tolerance: a dish it cannot read leaves its publication, and a
// publication left with none leaves its kitchen.
//
// ⚠️ GOOGLE'S POINT IS READ HERE AND KEPT NOWHERE: the door hands out each
// kitchen's point to draw — her own pin, else Google's 30-day copy (`0078`) — and
// this app holds it in memory only, for distance and order on her phone (ADR-035
// §2.2: never a filter, a sort or a count on the server; §2.7: the phone works out
// distance and order). Nothing here writes to the database.
//
// Everything with a right answer is here, and nothing that talks: the call is
// `@/api/calls`' `onOfferNow`, the hook `@/api/hooks`' `useCocinas`. Since
// `10.5-iv-a-ii`, beside it, the kitchens' trades' names (`kitchen_giros()`, at the
// foot), which a kitchen's page draws under her name.
//
// ⚠️ SINCE `10.5b-iii-a` (SHE RESERVES) IT READS WHAT RESERVING NEEDS, `0079`'s and
// `0080`'s keys: how each kitchen takes payment (`payment` — cash always, a card or a
// transfer when she says so) and the ways she hands plates over (`eat`), who may
// reserve there by score (`min_score`), each offer's *desechable* (`container_price`)
// and each line's two ways (`para_llevar`, `para_aqui`). Since `0079` a line's
// `quantity` is what is LEFT once neighbours reserve, and a line with nothing left is
// not sent. ⚠️ SINCE `10.5b-iii-b` (AFTER THE PLATE) ALSO `0080`'s `stars` — the
// neighbours' stars about each kitchen, from five ratings, counted the day after, with
// her three most given good tags — which the cards and both pages draw.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import { toPage, type Page } from '@/api/pagina';

/** The one door (`0078`): no arguments — for the pilot it takes no area. */
export const ON_OFFER_NOW = 'on_offer_now';

/** The prefix every answer is cached under — in memory, keyed on the login. */
export const COCINAS_KEY = ['itacate', 'cocinas'] as const;

/** Cached under the login, Wera Cocina's rule: a read is scoped to whoever holds the session. */
export function cocinasKey(userId: string | null): readonly unknown[] {
  return [...COCINAS_KEY, userId ?? ''];
}

// ----------------------------------------------------------------------------
// The answer, by the database's names — ⚠️ the contract check reads each field
// ----------------------------------------------------------------------------

/** One kitchen a neighbour may see: on offer now, or quiet — published in the last 14 days. */
export interface KitchenRow {
  readonly id: string;
  readonly name: string;
  readonly giro: string | null;
  readonly address: AddressRow | null;
  readonly directions: string | null;
  readonly point: PointRow | null;
  readonly page: PageRow | null;
  readonly on_offer: readonly OfferRow[] | null;
  readonly summary: SummaryRow | null;
  /** `0079`: how she takes payment — `efectivo` always, `tarjeta` and `transferencia` when she says so. */
  readonly payment: readonly string[] | null;
  /** `0079`: the ways she hands plates over — `llevar`, `aqui`, at least one. */
  readonly eat: readonly string[] | null;
  /** `0080`: who may reserve here by score — 75, 80 or 85 per cent — or `null`, everyone. */
  readonly min_score: number | null;
  /** `0080`: the neighbours' stars, from five ratings — else `null`. */
  readonly stars: StarsRow | null;
}

/** `0080`: her stars, counted the day after, and her three most given good tags. */
export interface StarsRow {
  /** The average to one decimal, as text: `"4.8"`. */
  readonly average: string;
  readonly count: number;
  readonly tags: readonly string[] | null;
}

/** Her address, as she gave it in Wera Cocina's five boxes. */
export interface AddressRow {
  readonly street: string | null;
  readonly street_number: string | null;
  readonly colonia: string | null;
  readonly city: string | null;
  readonly postal_code: string | null;
}

/** Where she is drawn: her own pin, else Google's 30-day copy; the door says which. */
export interface PointRow {
  readonly lat: number;
  readonly lng: number;
  readonly source: string;
}

/** Her page in Itacate (`kitchen_page`, `0076`), when she made one. */
export interface PageRow {
  readonly sentence: string | null;
  readonly color: string | null;
  readonly cover_path: string | null;
  readonly logo_path: string | null;
  readonly maps_link: string | null;
}

/** One publication on offer now: not withdrawn, its window not over. */
export interface OfferRow {
  readonly id: string;
  readonly pickup_start: string;
  readonly pickup_end: string;
  readonly lines: readonly LineRow[] | null;
  /** `0079`: the *desechable* as she stated it when she published, or `null` — no charge. */
  readonly container_price: string | null;
}

/** One dish or surprise bag of it. */
export interface LineRow {
  readonly line_no: number;
  readonly name: string;
  readonly description: string | null;
  readonly tags: readonly string[] | null;
  readonly unit_price: string;
  readonly quantity: string;
  readonly surprise: boolean;
  readonly usual_price: string | null;
  readonly image_path: string | null;
  /** `0079`: this dish can be taken away. A surprise bag always can, and only that. */
  readonly para_llevar: boolean;
  /** `0079`: this dish can be eaten at her kitchen. */
  readonly para_aqui: boolean;
}

/** What she usually publishes, over four weeks, in her kitchen's own zone — never the raw history. */
export interface SummaryRow {
  readonly weekdays: readonly number[] | null;
  readonly usual_hour: number | null;
  readonly last_day: string | null;
  readonly repeats: readonly RepeatRow[] | null;
}

/** A dish she published on two days or more. */
export interface RepeatRow {
  readonly name: string;
  readonly times: number;
  readonly usual_price: string | null;
}

/** Whose point the door sends (`0078`): her own pin, or Google's copy for her address. */
export const POINT_SOURCES = ['pin', 'google'] as const;
export type PointSource = (typeof POINT_SOURCES)[number];

/** How a neighbour may pay (`0079`): cash always, first; a card or a transfer when the kitchen takes them. */
export const PAGOS = ['efectivo', 'tarjeta', 'transferencia'] as const;
export type Pago = (typeof PAGOS)[number];

/** How a plate is eaten (`0079`): taken away first, or at her kitchen. */
export const COMERES = ['llevar', 'aqui'] as const;
export type Comer = (typeof COMERES)[number];

/**
 * The good tags a neighbour may tap after four or five stars (`0080`'s closed list) — the
 * only ones the door sends, her three most given, and the only ones a kitchen's page shows.
 */
export const ETIQUETAS_BUENAS = ['lista_a_tiempo', 'buena_porcion', 'muy_rica', 'me_atendieron_bien'] as const;
export type EtiquetaBuena = (typeof ETIQUETAS_BUENAS)[number];

/** The fixed list of tags, as codes (`listing_line_tags_known`, `0072`) — Wera Cocina's `TAGS`. */
export const TAGS = ['pica', 'cerdo', 'mariscos', 'cacahuate', 'lacteos', 'gluten'] as const;
export type Tag = (typeof TAGS)[number];

// ----------------------------------------------------------------------------
// The answer, as this app holds it
// ----------------------------------------------------------------------------

/** A place on the map. */
export interface Punto {
  readonly latitude: number;
  readonly longitude: number;
}

/** A kitchen's point, and whose it is. */
export interface Point extends Punto {
  readonly source: PointSource;
}

/** Her address — each part as she wrote it, `''` when she left it out. */
export interface Address {
  readonly street: string;
  readonly number: string;
  readonly colonia: string;
  readonly city: string;
  readonly postalCode: string;
}

/** A dish or a bag. Money in integer centavos. */
export interface Dish {
  readonly lineNo: number;
  readonly name: string;
  readonly description: string | null;
  readonly tags: readonly Tag[];
  readonly priceCentavos: number;
  /** How many she offered — a whole number, or `null` for a fraction (a shop's *Ofrecer*, later). */
  readonly count: number | null;
  readonly surprise: boolean;
  readonly usualCentavos: number | null;
  /** Its photo's path in the bucket, or `null` — her trade's drawing. */
  readonly photo: string | null;
  /** It can be taken away (`para_llevar`). */
  readonly llevar: boolean;
  /** It can be eaten at her kitchen (`para_aqui`). */
  readonly aqui: boolean;
}

/** A publication on offer. */
export interface Offer {
  readonly id: string;
  readonly start: Date;
  readonly end: Date;
  readonly dishes: readonly Dish[];
  /** The *desechable* in centavos, added when she takes it away — `null`, no charge. */
  readonly desechableCentavos: number | null;
}

/** A dish she repeats. */
export interface Repeat {
  readonly name: string;
  readonly times: number;
  readonly usualCentavos: number | null;
}

/** What she usually publishes, over four weeks. */
export interface Summary {
  /** Publications per weekday, Monday first (ISO's order), seven numbers. */
  readonly weekdays: readonly number[];
  /** The hour she usually publishes for, in her kitchen's zone, 0–23. */
  readonly usualHour: number | null;
  /** The last day she published for, `YYYY-MM-DD` in her kitchen's zone. */
  readonly lastDay: string | null;
  readonly repeats: readonly Repeat[];
}

/** A kitchen, as the list draws it. */
export interface Kitchen {
  readonly id: string;
  readonly name: string;
  readonly giro: string | null;
  readonly address: Address;
  readonly directions: string | null;
  readonly point: Point | null;
  readonly page: Page;
  /** What she has on offer, the earliest window first. */
  readonly offers: readonly Offer[];
  readonly summary: Summary;
  /** How she takes payment, cash first and always there. */
  readonly pagos: readonly Pago[];
  /** The ways she hands plates over, *para llevar* first — at least one. */
  readonly comeres: readonly Comer[];
  /** Who may reserve here by score — more than this per cent — or `null`, everyone. */
  readonly minScore: number | null;
  /** The neighbours' stars, from five ratings — `null` until then (*Todavía sin calificaciones*). */
  readonly estrellas: Estrellas | null;
}

/** A kitchen's stars, as the cards and her page draw them. */
export interface Estrellas {
  /** The average to one decimal, as the door wrote it: *4.8*. */
  readonly promedio: string;
  readonly cuantas: number;
  /** Her most given good tags, the most given first. */
  readonly etiquetas: readonly EtiquetaBuena[];
}

// ----------------------------------------------------------------------------
// Reading it
// ----------------------------------------------------------------------------

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const orNull = (value: unknown): string | null => (text(value) === '' ? null : text(value));
const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/** A money string as centavos. Throws on anything `parseDecimal` refuses — a number included. */
export function centavosOf(value: unknown): number {
  if (typeof value !== 'string') throw new TypeError(`money as ${typeof value}`);
  const centavos = parseDecimal(value.trim(), SCALE.money);
  if (centavos <= 0) throw new RangeError(`a price of ${value}`);
  return centavos;
}

/** A quantity string as a whole count, or `null` when it holds a fraction. Throws on anything else. */
export function countOf(value: unknown): number | null {
  if (typeof value !== 'string') throw new TypeError(`a quantity as ${typeof value}`);
  const thousandths = parseDecimal(value.trim(), SCALE.quantity);
  if (thousandths <= 0) throw new RangeError(`a quantity of ${value}`);
  return thousandths % 1000 === 0 ? thousandths / 1000 : null;
}

/**
 * A `timestamptz` as Postgres writes it, cut to milliseconds: up to six decimals
 * of a second arrive, and a phone's engine need not read more than three — Wera
 * Cocina's `toMilliseconds` (`cocina/src/api/place.ts`). ⚠️ Node reads six, so only
 * this function's own test sees the cut.
 */
export function aMilisegundos(value: string): string {
  return value.trim().replace(/(\.\d{3})\d+/, '$1');
}

/** An instant as Postgres writes it, cut to milliseconds before the engine reads it. Throws when unreadable. */
export function instantOf(value: unknown): Date {
  const ms = Date.parse(aMilisegundos(text(value)));
  if (!Number.isFinite(ms)) throw new RangeError(`an instant of ${String(value)}`);
  return new Date(ms);
}

/** Her point, or `null` — a source this build does not know is still a point to measure from. */
export function pointOf(value: unknown): Point | null {
  const p = object(value);
  if (p === null) return null;
  const latitude = p.lat;
  const longitude = p.lng;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude, source: p.source === 'pin' ? 'pin' : 'google' };
}

export function addressOf(value: unknown): Address {
  const a = object(value) ?? {};
  return {
    street: text(a.street),
    number: text(a.street_number),
    colonia: text(a.colonia),
    city: text(a.city),
    postalCode: text(a.postal_code),
  };
}

/** One line; throws when it cannot be read. */
function dishOf(value: unknown): Dish {
  const l = object(value);
  if (l === null) throw new TypeError('a line that is not an object');
  const name = text(l.name);
  if (name === '' || typeof l.line_no !== 'number') throw new RangeError('a line with no name or number');
  const usual = l.usual_price === null || l.usual_price === undefined ? null : centavosOf(l.usual_price);
  return {
    lineNo: l.line_no,
    name,
    description: orNull(l.description),
    tags: TAGS.filter((tag) => list(l.tags).includes(tag)),
    priceCentavos: centavosOf(l.unit_price),
    count: countOf(l.quantity),
    surprise: l.surprise === true,
    usualCentavos: usual,
    photo: orNull(l.image_path),
    // `0079`: a line the door sends always carries both; an older door's had neither — to go.
    llevar: l.para_llevar !== false,
    aqui: l.para_aqui === true,
  };
}

/** The *desechable*'s price, or `null` — none, or one it cannot read (a charge never invented). */
export function desechableOf(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  try {
    return centavosOf(value);
  } catch {
    return null;
  }
}

/** One publication with the lines it can read, or `null` when none is left. */
function offerOf(value: unknown): Offer | null {
  const o = object(value);
  if (o === null || text(o.id) === '') return null;
  const dishes: Dish[] = [];
  for (const line of list(o.lines)) {
    try {
      dishes.push(dishOf(line));
    } catch {
      // A dish it cannot read is left out; the rest of her publication still shows.
    }
  }
  if (dishes.length === 0) return null;
  return {
    id: text(o.id),
    start: instantOf(o.pickup_start),
    end: instantOf(o.pickup_end),
    dishes: dishes.sort((a, b) => a.lineNo - b.lineNo),
    desechableCentavos: desechableOf(o.container_price),
  };
}

/** How she takes payment: cash always, first, then what the door says she takes, in `PAGOS`' order. */
export function pagosOf(value: unknown): Pago[] {
  const dichos = list(value);
  return PAGOS.filter((pago) => pago === 'efectivo' || dichos.includes(pago));
}

/** The ways she hands plates over, in `COMERES`' order — none read is *para llevar*, the door's own default. */
export function comeresOf(value: unknown): Comer[] {
  const dichos = list(value);
  const comeres = COMERES.filter((comer) => dichos.includes(comer));
  return comeres.length > 0 ? comeres : ['llevar'];
}

/**
 * Her stars as the door sends them, or `null` — fewer than five ratings, or an average it
 * cannot read (one to five, one decimal). Only the good tags it knows are kept.
 */
export function estrellasOf(value: unknown): Estrellas | null {
  const s = object(value);
  if (s === null) return null;
  const promedio = text(s.average);
  const valor = Number(promedio);
  if (!/^[1-5](\.[0-9])?$/.test(promedio) || valor < 1 || valor > 5) return null;
  if (typeof s.count !== 'number' || !Number.isInteger(s.count) || s.count < 1) return null;
  const dichas = list(s.tags);
  const etiquetas = dichas.filter((t): t is EtiquetaBuena => (ETIQUETAS_BUENAS as readonly unknown[]).includes(t));
  return { promedio, cuantas: s.count, etiquetas: [...new Set(etiquetas)] };
}

/** Who may reserve by score — a whole per cent, else everyone (`null`). */
export function minScoreOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value < 100 ? value : null;
}

function summaryOf(value: unknown): Summary {
  const s = object(value) ?? {};
  const days = list(s.weekdays);
  const weekdays =
    days.length === 7 && days.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0)
      ? (days as number[])
      : [0, 0, 0, 0, 0, 0, 0];
  const hour = s.usual_hour;
  const lastDay = text(s.last_day);
  const repeats: Repeat[] = [];
  for (const r of list(s.repeats)) {
    const row = object(r);
    if (row === null || text(row.name) === '' || typeof row.times !== 'number') continue;
    let usualCentavos: number | null = null;
    try {
      usualCentavos = row.usual_price === null || row.usual_price === undefined ? null : centavosOf(row.usual_price);
    } catch {
      usualCentavos = null;
    }
    repeats.push({ name: text(row.name), times: row.times, usualCentavos });
  }
  return {
    weekdays,
    usualHour: typeof hour === 'number' && Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null,
    lastDay: /^\d{4}-\d{2}-\d{2}$/.test(lastDay) ? lastDay : null,
    repeats,
  };
}

/** One kitchen of the door's answer. The only place that knows both spellings. Throws when it cannot be read. */
export function toKitchen(row: KitchenRow): Kitchen {
  const k = object(row);
  if (k === null) throw new TypeError('a kitchen that is not an object');
  const id = text(k.id);
  const name = text(k.name);
  if (id === '' || name === '') throw new RangeError('a kitchen with no id or name');
  const offers: Offer[] = [];
  for (const o of list(k.on_offer)) {
    try {
      const offer = offerOf(o);
      if (offer !== null) offers.push(offer);
    } catch {
      // A publication it cannot read is left out; her kitchen still shows.
    }
  }
  offers.sort((a, b) => a.start.getTime() - b.start.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    id,
    name,
    giro: orNull(k.giro),
    address: addressOf(k.address),
    directions: orNull(k.directions),
    point: pointOf(k.point),
    page: toPage(object(k.page) ?? null),
    offers,
    summary: summaryOf(k.summary),
    pagos: pagosOf(k.payment),
    comeres: comeresOf(k.eat),
    minScore: minScoreOf(k.min_score),
    estrellas: estrellasOf(k.stars),
  };
}

/**
 * The door's answer as a list. ⚠️ A KITCHEN IT CANNOT READ IS DROPPED, not drawn
 * wrong and not allowed to blank the whole list.
 */
export function kitchensFrom(data: unknown): Kitchen[] {
  const kitchens: Kitchen[] = [];
  for (const row of list(data)) {
    try {
      kitchens.push(toKitchen(row as KitchenRow));
    } catch {
      // Dropped, as Wera Cocina's `listingsFrom` drops a row it cannot read.
    }
  }
  return kitchens;
}

// ----------------------------------------------------------------------------
// Her trade's name — the kitchens' own list (`0072`), read beside the door
// ----------------------------------------------------------------------------
// ⚠️ `10.5-iv-a-ii`: HER PAGE SAYS WHAT SHE IS UNDER HER NAME — *Fonda o cocina
// económica* — as Wera Cocina's preview of it does (`cocina/src/ui/Portada.tsx`).
// The door sends her trade's CODE (`giro`); its name is a row the owner edits in the
// dashboard (`catalogo.tag`, `0072`), so it is read, never copied into this app:
// `kitchen_giros()` answers anyone signed in and reads no business's rows — the
// catalogue, not a second door into anyone's data (ADR-035 §2.7). Wera Cocina's
// names, copied from `cocina/src/api/kitchen.ts`, and `test/gemelos.test.ts` holds
// each block to it; `docs/checks/10.5-iv-a-door-contract.sh` asks for it as a
// neighbour, by the names below.

/** The kitchens' trades, in their order (`0072`): `[{code, label}]`. */
export const KITCHEN_GIROS = 'kitchen_giros';

/** Cached in memory under the login, as every read here — the list is the same for everyone. */
export function girosKey(userId: string | null): readonly unknown[] {
  return ['itacate', 'giros', userId ?? ''];
}

/** One trade: `giro-fonda`, *Fonda o cocina económica*. */
export interface Giro {
  readonly code: string;
  readonly label: string;
}

/**
 * The function's answer as a list. ⚠️ TOLERANT ON PURPOSE: a row without a
 * code or a label is dropped rather than drawn as a blank choice — the rows are
 * edited by hand in the dashboard (`catalogo.tag`, `0072`'s header).
 */
export function girosFrom(data: unknown): Giro[] {
  if (!Array.isArray(data)) return [];
  const giros: Giro[] = [];
  for (const row of data) {
    if (typeof row !== 'object' || row === null) continue;
    const { code, label } = row as { code?: unknown; label?: unknown };
    if (typeof code === 'string' && code !== '' && typeof label === 'string' && label.trim() !== '') {
      giros.push({ code, label: label.trim() });
    }
  }
  return giros;
}

/** Her trade's name, or `null` — none chosen, or one the list no longer has. */
export function giroLabel(giros: readonly Giro[] | null | undefined, code: string | null): string | null {
  if (code === null || giros === null || giros === undefined) return null;
  return giros.find((giro) => giro.code === code)?.label ?? null;
}

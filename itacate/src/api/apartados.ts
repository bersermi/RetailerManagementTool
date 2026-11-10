// ============================================================================
// HER RESERVATIONS, AS A CONTRACT WITH POSTGRES. Plan task `10.5b-iii-a` (she
// reserves and collects), on `0079`'s four functions (`10.5b-i`) and `0080`'s two of
// hers that reserving needs (`10.5b-ii-b`) — ADR-035 §2.7, *What is hers*: every one is
// keyed on her own id, and none is a door into anyone else's rows.
//
//   reserve_plate          one plate of one dish, at her hour, by her method
//   my_reservations        hers: every one still to collect and her last 30 days
//   cancel_my_reservation  *Cancelar* until an hour before her hour, then *No voy a poder ir*
//   confirm_my_pickup      *Ya lo tengo*
//   give_my_yes            her express yes, once, before her first reservation
//   my_standing            her yes, her score, each label's count, how many she may hold
//
// ⚠️ THE ANSWERS ARE CONTRACTS THAT GROW ONLY BY KEYS, as the door's (`@/api/cocinas`):
// the interfaces below name the keys THIS APP reads, by the database's names, one per
// line, and `docs/checks/10.5b-iii-a-reserving-contract.sh` reads those names — and every
// function's name and argument — out of this file and asks a real PostgREST for each,
// signed in as a neighbour. PostgREST matches a function BY ITS ARGUMENTS' NAMES, so a
// misspelt `p_` name is a 404, and a misspelt key a 200 with that part missing.
//
// ⚠️ THE ID IS THE PHONE'S (`0079`): made when she opens the sheet and kept for a retry
// of the same reservation, so a tap that times out and is sent again is the same plate,
// never a second one — `reserve_plate` answers an id it holds with that reservation.
//
// ⚠️ MONEY AND QUANTITIES ARRIVE AS DECIMAL STRINGS and are read by `parseDecimal`
// (`@tienda/money`), as the door's are. Only the METHOD she pays by is stored — never an
// amount paid, a card or an account (the owner's ruling of 2026-11-05).
//
// Everything with a right answer is here, and nothing that talks: the calls are
// `@/api/calls`', the hooks `@/api/hooks`'.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import { COMERES, PAGOS, addressOf, centavosOf, desechableOf, instantOf, type Address, type Comer, type Pago } from '@/api/cocinas';
import { toPage, type Page } from '@/api/pagina';

/** `0079`: one plate, at her hour, by her method. Answers `{id, code}`. */
export const RESERVE_PLATE = 'reserve_plate';
/** `0079`: hers, and nobody else's. */
export const MY_RESERVATIONS = 'my_reservations';
/** `0079`: gives her plate back — `cancelado`, or `no_va` within the hour before hers. */
export const CANCEL_MY_RESERVATION = 'cancel_my_reservation';
/** `0079`: *Ya lo tengo*. */
export const CONFIRM_MY_PICKUP = 'confirm_my_pickup';
/** `0080`: her express yes, once. */
export const GIVE_MY_YES = 'give_my_yes';
/** `0080`: her own standing. */
export const MY_STANDING = 'my_standing';

/** Her reservations, cached in memory under the login, as every read here. */
export const APARTADOS_KEY = ['itacate', 'apartados'] as const;
export function apartadosKey(userId: string | null): readonly unknown[] {
  return [...APARTADOS_KEY, userId ?? ''];
}

/** Her standing, the same way. */
export const POSICION_KEY = ['itacate', 'posicion'] as const;
export function posicionKey(userId: string | null): readonly unknown[] {
  return [...POSICION_KEY, userId ?? ''];
}

// ----------------------------------------------------------------------------
// What is sent — ⚠️ the contract check reads each `p_` name
// ----------------------------------------------------------------------------

/** `reserve_plate`'s arguments, by their names. */
export interface ReserveArgs {
  readonly p_id: string;
  readonly p_listing_id: string;
  readonly p_line_no: number;
  readonly p_pickup_at: string;
  readonly p_payment: Pago;
  readonly p_eat: Comer;
}

/** `cancel_my_reservation`'s and `confirm_my_pickup`'s one argument. */
export interface ReservationIdArgs {
  readonly p_id: string;
}

/** A reservation as she chose it on the sheet. */
export interface Eleccion {
  /** The reservation's id, the phone's — kept for a retry. */
  readonly id: string;
  readonly ofertaId: string;
  readonly lineNo: number;
  readonly hora: Date;
  readonly pago: Pago;
  readonly comer: Comer;
}

export function reserveArgs(eleccion: Eleccion): ReserveArgs {
  return {
    p_id: eleccion.id,
    p_listing_id: eleccion.ofertaId,
    p_line_no: eleccion.lineNo,
    p_pickup_at: eleccion.hora.toISOString(),
    p_payment: eleccion.pago,
    p_eat: eleccion.comer,
  };
}

export function reservationIdArgs(id: string): ReservationIdArgs {
  return { p_id: id };
}

// ----------------------------------------------------------------------------
// What comes back, by the database's names — ⚠️ the contract check reads each field
// ----------------------------------------------------------------------------

/** `reserve_plate`'s answer. */
export interface ReservedRow {
  readonly id: string;
  readonly code: number;
}

/** One of `my_reservations`' rows. */
export interface ReservationRow {
  readonly id: string;
  readonly code: number;
  readonly state: string;
  readonly pickup_at: string;
  readonly held_until: string;
  readonly cancel_until: string;
  readonly payment: string;
  readonly eat: string;
  /** `0080`: why the kitchen cancelled, when it did. */
  readonly cancel_reason: string | null;
  readonly kitchen: ReservationKitchenRow | null;
  readonly lines: readonly ReservationLineRow[] | null;
}

/** The kitchen she reserved at — never its point (Google's copy is handed out only by the door). */
export interface ReservationKitchenRow {
  readonly id: string;
  readonly name: string;
  readonly giro: string | null;
  readonly address: ReservationAddressRow | null;
  readonly directions: string | null;
  readonly page: ReservationPageRow | null;
}

/** Her address, in Wera Cocina's five boxes. */
export interface ReservationAddressRow {
  readonly street: string | null;
  readonly street_number: string | null;
  readonly colonia: string | null;
  readonly city: string | null;
  readonly postal_code: string | null;
}

/** As much of her page as the ticket's circle wears. */
export interface ReservationPageRow {
  readonly color: string | null;
  readonly logo_path: string | null;
}

/** What she reserved, at its price as it was. */
export interface ReservationLineRow {
  readonly line_no: number;
  readonly name: string;
  readonly surprise: boolean;
  readonly quantity: string;
  readonly unit_price: string;
  readonly container_price: string | null;
}

/** `my_standing`'s answer. */
export interface StandingRow {
  /** When she gave her express yes, or `null` — Itacate asks before her first reservation. */
  readonly yes_at: string | null;
  /** From her third thumb; before it `null`, *Nueva en Itacate*. */
  readonly score: ScoreRow | null;
  /** How many of each label her counted thumbs carry — never which kitchen, never when. */
  readonly labels: Readonly<Record<string, number>> | null;
  /** How many she may hold still to collect now: one until her first pickup, then three. */
  readonly limit: number;
  /** How many she holds. */
  readonly holding: number;
}

/** Her score: thumbs up among the thumbs it counts. */
export interface ScoreRow {
  readonly up: number;
  readonly total: number;
}

/** A reservation's state, read from its moments by `reservation_state` (`0079`, `0080`). */
export const ESTADOS = ['apartado', 'recogido', 'cancelado', 'no_va', 'liberado', 'cancelado_cocina'] as const;
export type Estado = (typeof ESTADOS)[number];

/** Why a kitchen cancelled (`0080`'s short list) — switched off, so none yet. */
export const RAZONES = ['se_acabo', 'cerramos', 'otro'] as const;
export type Razon = (typeof RAZONES)[number];

/** The fonda's five labels (`0080`), in the order *Tú* lists them — the final design's. */
export const ETIQUETAS = ['a_tiempo', 'amable', 'tarde', 'no_se_presento', 'pago'] as const;
export type Etiqueta = (typeof ETIQUETAS)[number];

// ----------------------------------------------------------------------------
// As this app holds them
// ----------------------------------------------------------------------------

/** The kitchen of a reservation. */
export interface CocinaDelApartado {
  readonly id: string;
  readonly nombre: string;
  readonly giro: string | null;
  readonly direccion: Address;
  readonly indicaciones: string | null;
  readonly pagina: Page;
}

/** What she reserved. Money in centavos. */
export interface Plato {
  readonly lineNo: number;
  readonly nombre: string;
  readonly sorpresa: boolean;
  readonly cantidad: number;
  readonly precioCentavos: number;
  /** The *desechable* charged with it — only when she takes it away. */
  readonly desechableCentavos: number | null;
}

export interface Apartado {
  readonly id: string;
  /** The three digits she says at the counter. */
  readonly codigo: string;
  readonly estado: Estado;
  readonly hora: Date;
  /** The window's end: the kitchen keeps it until then. */
  readonly guardadaHasta: Date;
  /** An hour before her hour — then *Cancelar* becomes *No voy a poder ir*. */
  readonly cancelarHasta: Date;
  readonly pago: Pago;
  readonly comer: Comer;
  readonly razon: Razon | null;
  readonly cocina: CocinaDelApartado;
  readonly platos: readonly Plato[];
  /** What she pays: every plate and its *desechable*. */
  readonly totalCentavos: number;
}

export interface Posicion {
  readonly siDesde: Date | null;
  readonly calificacion: { readonly up: number; readonly total: number } | null;
  readonly etiquetas: Readonly<Record<Etiqueta, number>>;
  readonly limite: number;
  readonly tiene: number;
}

// ----------------------------------------------------------------------------
// Reading them
// ----------------------------------------------------------------------------

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const orNull = (value: unknown): string | null => (text(value) === '' ? null : text(value));
const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

/** A three-digit code (`100` to `999`) as she says it. Throws on anything else. */
export function codigoOf(value: unknown): string {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 100 || value > 999) {
    throw new RangeError(`a code of ${String(value)}`);
  }
  return String(value);
}

/** How many plates — a whole number of at least one. Throws on anything else. */
function cantidadOf(value: unknown): number {
  if (typeof value !== 'string') throw new TypeError(`a quantity as ${typeof value}`);
  const thousandths = parseDecimal(value.trim(), SCALE.quantity);
  if (thousandths <= 0 || thousandths % 1000 !== 0) throw new RangeError(`a quantity of ${value}`);
  return thousandths / 1000;
}

function platoOf(value: unknown): Plato {
  const l = object(value);
  if (l === null || typeof l.line_no !== 'number' || text(l.name) === '') throw new RangeError('a line with no number or name');
  return {
    lineNo: l.line_no,
    nombre: text(l.name),
    sorpresa: l.surprise === true,
    cantidad: cantidadOf(l.quantity),
    precioCentavos: centavosOf(l.unit_price),
    desechableCentavos: desechableOf(l.container_price),
  };
}

/** One reservation; throws when it cannot be read. */
export function apartadoOf(value: unknown): Apartado {
  const r = object(value);
  if (r === null || text(r.id) === '') throw new TypeError('a reservation with no id');
  if (!isOneOf(ESTADOS, r.state)) throw new RangeError(`a state of ${String(r.state)}`);
  if (!isOneOf(PAGOS, r.payment)) throw new RangeError(`a payment of ${String(r.payment)}`);
  if (!isOneOf(COMERES, r.eat)) throw new RangeError(`a way of ${String(r.eat)}`);
  const k = object(r.kitchen);
  if (k === null || text(k.id) === '' || text(k.name) === '') throw new RangeError('a reservation with no kitchen');
  const platos = list(r.lines).map(platoOf);
  if (platos.length === 0) throw new RangeError('a reservation with nothing in it');
  const totalCentavos = platos.reduce((sum, p) => sum + p.cantidad * (p.precioCentavos + (p.desechableCentavos ?? 0)), 0);
  return {
    id: text(r.id),
    codigo: codigoOf(r.code),
    estado: r.state,
    hora: instantOf(r.pickup_at),
    guardadaHasta: instantOf(r.held_until),
    cancelarHasta: instantOf(r.cancel_until),
    pago: r.payment,
    comer: r.eat,
    razon: isOneOf(RAZONES, r.cancel_reason) ? r.cancel_reason : null,
    cocina: {
      id: text(k.id),
      nombre: text(k.name),
      giro: orNull(k.giro),
      direccion: addressOf(k.address),
      indicaciones: orNull(k.directions),
      pagina: toPage(object(k.page) ?? null),
    },
    platos: platos.sort((a, b) => a.lineNo - b.lineNo),
    totalCentavos,
  };
}

/**
 * `my_reservations`' answer as a list. ⚠️ ONE IT CANNOT READ IS LEFT OUT, never the
 * list — the door's tolerance (`kitchensFrom`): a reservation she holds must not
 * blank the ones she can read.
 */
export function apartadosFrom(data: unknown): Apartado[] {
  const apartados: Apartado[] = [];
  for (const row of list(data)) {
    try {
      apartados.push(apartadoOf(row));
    } catch {
      // Left out; the rest still shows.
    }
  }
  return apartados;
}

/** `reserve_plate`'s answer: the code she says at the counter. Throws when it cannot be read. */
export function reservadoFrom(data: unknown): { readonly id: string; readonly codigo: string } {
  const r = object(data);
  if (r === null || text(r.id) === '') throw new TypeError('no reservation came back');
  return { id: text(r.id), codigo: codigoOf(r.code) };
}

const count = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);

/** `my_standing`'s answer. A field it cannot read is the safest reading: no yes, no score, one at a time. */
export function posicionFrom(data: unknown): Posicion {
  const s = object(data) ?? {};
  const score = object(s.score);
  const up = count(score?.up);
  const total = count(score?.total);
  const labels = object(s.labels) ?? {};
  const etiquetas = Object.fromEntries(ETIQUETAS.map((e) => [e, count(labels[e])])) as Record<Etiqueta, number>;
  let siDesde: Date | null = null;
  try {
    siDesde = s.yes_at === null || s.yes_at === undefined ? null : instantOf(s.yes_at);
  } catch {
    siDesde = null;
  }
  return {
    siDesde,
    calificacion: score !== null && total > 0 && up <= total ? { up, total } : null,
    etiquetas,
    limite: count(s.limit) > 0 ? count(s.limit) : 1,
    tiene: count(s.holding),
  };
}

// ----------------------------------------------------------------------------
// When a call is refused — `0079`'s and `0080`'s codes, each with what she can do
// ----------------------------------------------------------------------------

/**
 * Why reserving, cancelling or *Ya lo tengo* did not go through. The keys of
 * `ES.apartar.fallas`, so a sentence cannot be typed in place.
 */
export type Falla =
  | 'yaNoHay'
  | 'limite'
  | 'tuCocina'
  | 'calificacion'
  | 'sinSi'
  | 'cambio'
  | 'yaNoPendiente'
  | 'sesion'
  | 'sinSenal'
  | 'otra';

/** The codes the database answers with (`0079`'s and `0080`'s headers), and the falla each is. */
export const POR_CODIGO: Readonly<Record<string, Falla>> = {
  // The offer is withdrawn, its window over, or nothing is left of that dish.
  TD015: 'yaNoHay',
  // She holds as many as she may now — one, or three.
  TD016: 'limite',
  // She is one of that kitchen's own people.
  TD017: 'tuCocina',
  // Collected already, or its window over: nothing left to cancel or confirm.
  TD018: 'yaNoPendiente',
  // The kitchen reserves for neighbours above its score, and hers is not.
  TD020: 'calificacion',
  // She has not yet given her express yes.
  TD021: 'sinSi',
  // An hour that is no longer one she may pick, or a method or way the kitchen no longer offers.
  '22023': 'cambio',
  // The session is gone.
  '42501': 'sesion',
  PGRST301: 'sesion',
};

/** The falla for a failed call. Takes `unknown`: a dead link throws a `TypeError`. */
export function fallaDe(error: unknown): Falla {
  if (typeof error !== 'object' || error === null) return 'otra';
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && code in POR_CODIGO) return POR_CODIGO[code];
  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && /network request failed|fetch failed|aborted/i.test(message)) return 'sinSenal';
  return 'otra';
}

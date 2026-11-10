// ============================================================================
// HER KITCHEN'S RESERVATIONS, AS A CONTRACT WITH POSTGRES. Plan task `10.5b-iv-a`
// (she sees and hands over), on `0079`'s table and handover (`10.5b-i`) and `0080`'s
// two functions of the kitchen's side that it needs (`10.5b-ii-b`). ADR-035 §2.7:
// the seller's side under the ordinary walls — her kitchen's reservations are read
// from the table, as its members may (`reservation_select`, every column but who
// reserved), and what she writes goes through `security definer` functions that check
// she is one of that kitchen's people.
//
//   reservation             the table: the code, her hour, how it is paid and eaten,
//                           the moments; its lines, each with its dish's name
//   reservation_neighbours  for each of the last 30 days' orders: the neighbour's short
//                           name and score while the order waits, its thumb, and until
//                           when a first thumb may be given
//   hand_over_reservation   *Ya cobré y lo entregué* — always recorded; *Sí pasó* too
//   rate_neighbour          the fonda's thumb, with his labels
//
// ⚠️ THE ANSWERS ARE CONTRACTS THAT GROW ONLY BY KEYS: the interfaces below name the
// keys THIS APP reads, by the database's names, one per line, and
// `docs/checks/10.5b-iv-a-handover-contract.sh` reads those names — every function's
// name and argument, the columns and the embed — out of this file and asks a real
// PostgREST for each, signed in as a fonda. PostgREST matches a function BY ITS
// ARGUMENTS' NAMES, so a misspelt `p_` name is a 404; a misspelt column a 400; a
// misspelt key of a jsonb answer a 200 with that part missing.
//
// ⚠️ THE STATE IS READ FROM THE MOMENTS, HERE, AS THE DATABASE READS IT
// (`reservation_state`, granted to nobody): `estadoDe` is the one definition's body
// repeated, and `test/apartados.test.ts` holds it to whichever migration defines the
// function last. So is WHAT IS TAKEN of a line (`listing_line_taken`, `tomado`).
//
// ⚠️ "TODAY" IS THE PHONE'S DAY, as every rule of this app's (`@/lib/ventana`): the
// phone is in her kitchen, and `pickup_day` is the day she collects in the kitchen's
// zone.
//
// Everything with a right answer is here, and nothing that talks: the calls are
// `@/api/calls`', the hooks `@/api/hooks`'.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

// ----------------------------------------------------------------------------
// The read — her kitchen's reservations
// ----------------------------------------------------------------------------

/** `0079`: one row per reservation; its members read every column but who reserved. */
export const RESERVATION_TABLE = 'reservation';

/** Its lines, embedded — the to-many side, so the embed's own order sorts them. */
export const RESERVATION_LINES_TABLE = 'reservation_line';

/**
 * What this app reads: the code, the hour, how it is paid and eaten, every moment, and
 * each line with its dish's name and number in the offer. Named, never `*` — ⚠️ `buyer_id`
 * IS GRANTED TO NOBODY, and a `*` would be refused. ⚠️ ONE LINE: the contract check
 * reads it with one `sed`.
 */
export const RESERVATION_COLUMNS = 'id,listing_id,code,pickup_at,pickup_day,held_until,payment,eat,created_at,cancelled_at,cancelled_by,handed_over_at,picked_up_at,reservation_line(line_no,quantity,unit_price,container_price,listing_line(line_no,name,surprise))';

/** The column the read is filtered on — the open kitchen's id. The walls show a login every kitchen she belongs to. */
export const RESERVATION_OWNER_COLUMN = 'workspace_id';

/** The day she collects, which the read is bounded by. */
export const RESERVATION_DAY_COLUMN = 'pickup_day';

/** Her hour first, the soonest first — PostgREST's own spelling, `column.direction`. */
export const RESERVATION_ORDER = 'pickup_at.asc,id.asc';

/** The lines inside each reservation, in their order. */
export const RESERVATION_LINE_ORDER = 'line_no';

/**
 * How far back *Historial* reaches: 30 days — `reservation_neighbours`' own reach, so an
 * order never shows without the line about who reserved it.
 */
export const HISTORIAL_DIAS = 30;

/** `0080`: the neighbour on each order, and its thumb. */
export const RESERVATION_NEIGHBOURS = 'reservation_neighbours';
/** `0079`/`0080`: *Ya cobré y lo entregué*, and *Sí pasó*. Answers `recogido`. */
export const HAND_OVER_RESERVATION = 'hand_over_reservation';
/** `0080`: the fonda's thumb. */
export const RATE_NEIGHBOUR = 'rate_neighbour';

/** The prefix every read of her reservations is cached under — what a write invalidates. */
export const APARTADOS_KEY = ['cocina', 'apartados'] as const;

/** Cached under the login and the kitchen, Cocina's rule (`listingsKey`). */
export function apartadosKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...APARTADOS_KEY, userId ?? '', kitchenId ?? ''];
}

/** The first day the read asks for: 30 days before the phone's today, as `YYYY-MM-DD`. */
export function desdeDia(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - HISTORIAL_DIAS);
  return diaTexto(d);
}

/** A date as Postgres writes a `date`, in the phone's day. */
export function diaTexto(at: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`;
}

// ----------------------------------------------------------------------------
// What is sent — ⚠️ the contract check reads each `p_` name
// ----------------------------------------------------------------------------

/** `reservation_neighbours`' one argument. */
export interface NeighboursArgs {
  readonly p_workspace_id: string;
}

/** `hand_over_reservation`'s arguments: the reservation, and when it happened on her phone. */
export interface HandOverArgs {
  readonly p_id: string;
  readonly p_at: string;
}

/** `rate_neighbour`'s arguments. ⚠️ EACH CALL SETS THE THUMB AND ITS LABELS TOGETHER. */
export interface RateNeighbourArgs {
  readonly p_reservation_id: string;
  readonly p_up: boolean;
  readonly p_labels: readonly Etiqueta[];
  readonly p_at: string;
}

export function neighboursArgs(kitchenId: string): NeighboursArgs {
  return { p_workspace_id: kitchenId };
}

export function handOverArgs(id: string, at: Date): HandOverArgs {
  return { p_id: id, p_at: at.toISOString() };
}

/** Her thumb as she gave it — the labels of its side only, in the list's order. */
export function rateNeighbourArgs(id: string, pulgar: { readonly arriba: boolean; readonly etiquetas: readonly string[] }, at: Date): RateNeighbourArgs {
  return {
    p_reservation_id: id,
    p_up: pulgar.arriba,
    p_labels: etiquetasDelLado(pulgar.arriba, pulgar.etiquetas),
    p_at: at.toISOString(),
  };
}

/** *No se presentó* — a thumb down with that label alone, the only one a plate that *se liberó* takes. */
export function noSePresentoArgs(id: string, at: Date): RateNeighbourArgs {
  return { p_reservation_id: id, p_up: false, p_labels: [NO_SE_PRESENTO], p_at: at.toISOString() };
}

// ----------------------------------------------------------------------------
// What comes back, by the database's names — ⚠️ the contract check reads each field
// ----------------------------------------------------------------------------

/** A reservation as PostgREST sends it. A `numeric` arrives as a JSON number, and is read as text too. */
export interface ReservationRow {
  readonly id: string;
  readonly listing_id: string;
  readonly code: number;
  readonly pickup_at: string;
  readonly pickup_day: string;
  readonly held_until: string;
  readonly payment: string;
  readonly eat: string;
  readonly created_at: string;
  readonly cancelled_at: string | null;
  readonly cancelled_by: string | null;
  readonly handed_over_at: string | null;
  readonly picked_up_at: string | null;
  readonly reservation_line: readonly ReservationLineRow[] | null;
}

/** One of its lines: how many, at the price and *desechable* she reserved them at. */
export interface ReservationLineRow {
  readonly line_no: number;
  readonly quantity: number | string;
  readonly unit_price: number | string;
  readonly container_price: number | string | null;
  readonly listing_line: ReservationDishRow | null;
}

/** The offer's line it holds — its number in the offer, its name, whether it is a bag. */
export interface ReservationDishRow {
  readonly line_no: number;
  readonly name: string;
  readonly surprise: boolean;
}

/** One of `reservation_neighbours`' rows. */
export interface NeighbourEntryRow {
  readonly id: string;
  /** While the order waits or waits for its thumb; else `null` — the name is never kept past it. */
  readonly neighbour: NeighbourRow | null;
  /** This kitchen's thumb on it, or the clock's *No se presentó*; else `null`. */
  readonly thumb: ThumbRow | null;
  /** Until when a first thumb may be given, while it may; else `null`. */
  readonly rate_until: string | null;
}

/** *Ana R.* and her score. */
export interface NeighbourRow {
  readonly name: string | null;
  /** From her third thumb; before it `null`, *Nueva en Itacate*. */
  readonly score: ScoreRow | null;
}

/** Her score: thumbs up among the thumbs it counts. */
export interface ScoreRow {
  readonly up: number;
  readonly total: number;
}

/** A thumb on one order. */
export interface ThumbRow {
  readonly up: boolean;
  readonly labels: readonly string[];
  readonly given_at: string;
  /** Until when it may be changed; `null` for the clock's. */
  readonly change_until: string | null;
  /** The clock's *No se presentó*: a plate that *se liberó* and went 24 hours unrated. */
  readonly clock: boolean;
}

/** `rate_neighbour`'s answer. */
export interface RatedNeighbourRow {
  readonly up: boolean;
  readonly labels: readonly string[];
  readonly given_at: string;
  readonly change_until: string;
}

/** A reservation's state, read from its moments (`reservation_state`, `0079`, `0080`). */
export const ESTADOS = ['apartado', 'recogido', 'cancelado', 'no_va', 'liberado', 'cancelado_cocina'] as const;
export type Estado = (typeof ESTADOS)[number];

/** How she pays (`reservation_payment_known`, `0079`), cash first. */
export const PAGOS = ['efectivo', 'tarjeta', 'transferencia'] as const;
export type Pago = (typeof PAGOS)[number];

/** How it is eaten (`reservation_eat_known`, `0079`): the kitchen packs it, or serves it. */
export const COMERES = ['llevar', 'aqui'] as const;
export type Comer = (typeof COMERES)[number];

/**
 * ⚠️ THE FONDA'S FIVE LABELS (`0080`'s closed list), each only where it can be true: after
 * a pickup, *Llegó a tiempo* and *Persona amable* with a thumb up, *Se presentó tarde* and
 * *Problemas con el pago* with a thumb down; *No se presentó* alone, once the window ended
 * with no handover.
 */
export const ETIQUETAS_ARRIBA = ['a_tiempo', 'amable'] as const;
export const ETIQUETAS_ABAJO = ['tarde', 'pago'] as const;
export const NO_SE_PRESENTO = 'no_se_presento';
export const ETIQUETAS = [...ETIQUETAS_ARRIBA, ...ETIQUETAS_ABAJO, NO_SE_PRESENTO] as const;
export type Etiqueta = (typeof ETIQUETAS)[number];

/** The labels she may tap after a pickup, with this thumb. */
export function etiquetasPara(arriba: boolean): readonly Etiqueta[] {
  return arriba ? ETIQUETAS_ARRIBA : ETIQUETAS_ABAJO;
}

/** Of what she tapped, only those of the thumb's side, in the list's order — a change of thumb drops the other side's. */
export function etiquetasDelLado(arriba: boolean, etiquetas: readonly string[]): Etiqueta[] {
  return etiquetasPara(arriba).filter((etiqueta) => etiquetas.includes(etiqueta));
}

// ----------------------------------------------------------------------------
// The two definitions the database keeps, repeated
// ----------------------------------------------------------------------------

/** The moments a reservation's state is read from. */
export interface Momentos {
  readonly canceladaEn: Date | null;
  readonly canceladaPorLaCocina: boolean;
  readonly entregadaEn: Date | null;
  readonly recogidaEn: Date | null;
  readonly guardadaHasta: Date;
  readonly hora: Date;
}

/** One hour before her hour: a cancel inside it is *No voy a poder ir* (`no_va`). */
export const HORA_ANTES_MS = 60 * 60_000;

/**
 * ⚠️ `reservation_state` (`0080`), clause for clause: a handover or her *Ya lo tengo* wins;
 * then the kitchen's cancel; then hers, within the hour before her hour or not; then the
 * window over; else pending. `test/apartados.test.ts` holds it to the migration's text.
 */
export function estadoDe(m: Momentos, now: Date): Estado {
  if (m.entregadaEn !== null || m.recogidaEn !== null) return 'recogido';
  if (m.canceladaEn !== null && m.canceladaPorLaCocina) return 'cancelado_cocina';
  if (m.canceladaEn !== null) {
    return m.canceladaEn.getTime() >= m.hora.getTime() - HORA_ANTES_MS ? 'no_va' : 'cancelado';
  }
  if (m.guardadaHasta.getTime() <= now.getTime()) return 'liberado';
  return 'apartado';
}

/**
 * ⚠️ `listing_line_taken` (`0079`): whether a reservation's plates are TAKEN — not
 * cancelled, or cancelled and handed over all the same. A plate that *se liberó* stays
 * taken. What is left of a line is what she offers less every taken plate of it.
 */
export function tomado(m: Momentos): boolean {
  return m.canceladaEn === null || m.entregadaEn !== null || m.recogidaEn !== null;
}

// ----------------------------------------------------------------------------
// As this app holds them
// ----------------------------------------------------------------------------

/** What is reserved of one dish. Money in centavos. */
export interface Plato {
  /** Its line in the offer — what *Quedan* counts against. */
  readonly lineaDeOferta: number;
  readonly nombre: string;
  readonly sorpresa: boolean;
  readonly cantidad: number;
  readonly precioCentavos: number;
  /** The *desechable* charged with each — only when it is taken away and she charges for one. */
  readonly desechableCentavos: number | null;
}

/** One reservation at her kitchen. */
export interface Reserva extends Momentos {
  readonly id: string;
  readonly ofertaId: string;
  /** The three digits the neighbour says at the counter. */
  readonly codigo: string;
  /** The day she collects, `YYYY-MM-DD` — the day the code is unique on. */
  readonly dia: string;
  readonly creadaEn: Date;
  readonly pago: Pago;
  readonly comer: Comer;
  readonly platos: readonly Plato[];
  /** What to charge: every plate and its *desechable*. */
  readonly cobroCentavos: number;
  /** Of that, the *desechables*. */
  readonly desechablesCentavos: number;
}

/** The neighbour on an order, while the order waits for her or for its thumb. */
export interface Vecino {
  /** *Ana R.*, or `null` when her account keeps no name. */
  readonly nombre: string | null;
  /** From her third thumb; before it `null`, *Nueva en Itacate*. */
  readonly calificacion: { readonly up: number; readonly total: number } | null;
}

/** The thumb on an order. */
export interface Pulgar {
  readonly arriba: boolean;
  readonly etiquetas: readonly Etiqueta[];
  readonly dadoEn: Date;
  /** Until when she may change it; `null` for the clock's. */
  readonly cambiarHasta: Date | null;
  /** The clock's *No se presentó*, never a person's. */
  readonly reloj: boolean;
}

/** What `reservation_neighbours` says of one order. */
export interface SobreElVecino {
  readonly vecino: Vecino | null;
  readonly pulgar: Pulgar | null;
  readonly calificarHasta: Date | null;
}

// ----------------------------------------------------------------------------
// Reading them
// ----------------------------------------------------------------------------

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

/** A moment; throws when it cannot be read. */
function instantOf(value: unknown): Date {
  const at = new Date(text(value));
  if (text(value) === '' || Number.isNaN(at.getTime())) throw new RangeError(`a moment of ${String(value)}`);
  return at;
}

/** A moment the database may send as `null`; one it cannot read is `null` too — nothing offered on a guess. */
function momentoOrNull(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  try {
    return instantOf(value);
  } catch {
    return null;
  }
}

/** A `numeric` written back as its text, so no peso-valued float is multiplied anywhere. */
const decimalText = (value: unknown): string => (typeof value === 'number' ? String(value) : text(value));

/** Money as centavos — above zero. Throws on anything else. */
function centavosOf(value: unknown): number {
  const centavos = parseDecimal(decimalText(value), SCALE.money);
  if (centavos <= 0) throw new RangeError(`a price of ${String(value)}`);
  return centavos;
}

/** The *desechable* — none, or above zero. */
function desechableOf(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return centavosOf(value);
}

/** How many plates — a whole number of at least one. Throws on anything else. */
function cantidadOf(value: unknown): number {
  const thousandths = parseDecimal(decimalText(value), SCALE.quantity);
  if (thousandths <= 0 || thousandths % 1000 !== 0) throw new RangeError(`a quantity of ${String(value)}`);
  return thousandths / 1000;
}

/** A three-digit code (`100` to `999`) as she hears it. Throws on anything else. */
export function codigoOf(value: unknown): string {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 100 || value > 999) {
    throw new RangeError(`a code of ${String(value)}`);
  }
  return String(value);
}

function platoOf(value: unknown): Plato {
  const l = object(value);
  const dish = object(l?.listing_line);
  if (l === null || dish === null || typeof dish.line_no !== 'number' || text(dish.name) === '') {
    throw new RangeError('a line with no dish');
  }
  return {
    lineaDeOferta: dish.line_no,
    nombre: text(dish.name),
    sorpresa: dish.surprise === true,
    cantidad: cantidadOf(l.quantity),
    precioCentavos: centavosOf(l.unit_price),
    desechableCentavos: desechableOf(l.container_price),
  };
}

/** One reservation; throws when it cannot be read. */
export function reservaOf(value: unknown): Reserva {
  const r = object(value);
  if (r === null || text(r.id) === '' || text(r.listing_id) === '') throw new TypeError('a reservation with no id');
  if (!isOneOf(PAGOS, r.payment)) throw new RangeError(`a payment of ${String(r.payment)}`);
  if (!isOneOf(COMERES, r.eat)) throw new RangeError(`a way of ${String(r.eat)}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(r.pickup_day))) throw new RangeError(`a day of ${String(r.pickup_day)}`);
  const lines = [...list(r.reservation_line)].sort(
    (a, b) => Number(object(a)?.line_no ?? 0) - Number(object(b)?.line_no ?? 0),
  );
  const platos = lines.map(platoOf);
  if (platos.length === 0) throw new RangeError('a reservation with nothing in it');
  const desechablesCentavos = platos.reduce((sum, p) => sum + p.cantidad * (p.desechableCentavos ?? 0), 0);
  const cobroCentavos = platos.reduce((sum, p) => sum + p.cantidad * p.precioCentavos, 0) + desechablesCentavos;
  return {
    id: text(r.id),
    ofertaId: text(r.listing_id),
    codigo: codigoOf(r.code),
    dia: text(r.pickup_day),
    hora: instantOf(r.pickup_at),
    guardadaHasta: instantOf(r.held_until),
    creadaEn: instantOf(r.created_at),
    canceladaEn: momentoOrNull(r.cancelled_at),
    canceladaPorLaCocina: text(r.cancelled_by) !== '',
    entregadaEn: momentoOrNull(r.handed_over_at),
    recogidaEn: momentoOrNull(r.picked_up_at),
    pago: r.payment,
    comer: r.eat,
    platos,
    cobroCentavos,
    desechablesCentavos,
  };
}

/**
 * The read's answer as a list. ⚠️ ONE IT CANNOT READ IS LEFT OUT, never the list — the
 * door's tolerance: an order she must hand over must not blank the ones she can read.
 */
export function reservasFrom(data: unknown): Reserva[] {
  const reservas: Reserva[] = [];
  for (const row of list(data)) {
    try {
      reservas.push(reservaOf(row));
    } catch {
      // Left out; the rest still shows.
    }
  }
  return reservas;
}

const count = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);

function vecinoOf(value: unknown): Vecino | null {
  const n = object(value);
  if (n === null) return null;
  const score = object(n.score);
  const up = count(score?.up);
  const total = count(score?.total);
  return {
    nombre: text(n.name) === '' ? null : text(n.name),
    calificacion: score !== null && total > 0 && up <= total ? { up, total } : null,
  };
}

function pulgarOf(value: unknown): Pulgar | null {
  const t = object(value);
  if (t === null || typeof t.up !== 'boolean') return null;
  const dadoEn = momentoOrNull(t.given_at);
  if (dadoEn === null) return null;
  const etiquetas = list(t.labels).filter((l): l is Etiqueta => isOneOf(ETIQUETAS, l));
  return {
    arriba: t.up,
    etiquetas: ETIQUETAS.filter((e) => etiquetas.includes(e)),
    dadoEn,
    cambiarHasta: momentoOrNull(t.change_until),
    reloj: t.clock === true,
  };
}

/** `reservation_neighbours`' answer, by the reservation's id. A row it cannot read is left out. */
export function vecinosFrom(data: unknown): Record<string, SobreElVecino> {
  const out: Record<string, SobreElVecino> = {};
  for (const row of list(data)) {
    const r = object(row);
    if (r === null || text(r.id) === '') continue;
    out[text(r.id)] = {
      vecino: vecinoOf(r.neighbour),
      pulgar: pulgarOf(r.thumb),
      calificarHasta: momentoOrNull(r.rate_until),
    };
  }
  return out;
}

/** `rate_neighbour`'s answer: the thumb it kept. Throws when it cannot be read. */
export function pulgarDadoFrom(data: unknown): Pulgar {
  const pulgar = pulgarOf(data);
  if (pulgar === null) throw new TypeError('no thumb came back');
  return pulgar;
}

/** `hand_over_reservation`'s answer: the state it left — always `recogido`. Throws on anything else. */
export function entregadoFrom(data: unknown): 'recogido' {
  if (data !== 'recogido') throw new TypeError(`a handover answered ${String(data)}`);
  return data;
}

// ----------------------------------------------------------------------------
// When a call is refused — `0079`'s and `0080`'s codes, each with what she can do
// ----------------------------------------------------------------------------

/** Why a handover or a thumb did not go through. The keys of `ES.apartados.fallas`, so a sentence cannot be typed in place. */
export type Falla = 'sesion' | 'cambio' | 'yaNoSeCalifica' | 'sinSenal' | 'otra';

/** The codes the database answers with (`0079`'s and `0080`'s headers), and the falla each is. */
export const POR_CODIGO: Readonly<Record<string, Falla>> = {
  // Not at one of her kitchens any more, or the session is gone.
  '42501': 'sesion',
  PGRST301: 'sesion',
  // A label that cannot be true there now — the order changed under her thumb.
  '22023': 'cambio',
  // Nothing to rate there now: still pending, cancelled, her account gone, or its 24 hours over.
  TD022: 'yaNoSeCalifica',
};

/** The falla for a failed call. Takes `unknown`: a dead link throws a `TypeError`. */
export function fallaDe(error: unknown): Falla {
  if (typeof error !== 'object' || error === null) return 'otra';
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && code in POR_CODIGO) return POR_CODIGO[code];
  const name = (error as { name?: unknown }).name;
  if (name === 'AuthRetryableFetchError') return 'sinSenal';
  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && /network request failed|fetch failed|aborted|timed out/i.test(message)) return 'sinSenal';
  return 'otra';
}

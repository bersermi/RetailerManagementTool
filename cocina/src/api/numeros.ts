// ============================================================================
// HER NUMBERS — A CONTRACT WITH POSTGRES. Plan task `10.9f`, on `0086`'s `kitchen_numbers` (the
// owner's rulings G24–G27 of 2026-11-17: answers, not indicators, for *Día · Semana · Mes*, each
// against the period before; only what passes through Itacate; the figures about people from five
// neighbours; the owner only). Drawn by the same row: *Tus números* and its tile on *Hoy*.
//
// ⚠️ THE OWNER'S ALONE (G18): a helper is refused (`42501`), a shop too (`TD013`) — and a helper's
// *Hoy* has no tile for them (`@/lib/ayudante`' `mosaicosPara`).
// ⚠️ COUNTS ONLY: the database never sends a name, an id or an order. ⚠️ THE FLOOR OF FIVE IS THE
// DATABASE'S: under five neighbours in a period, `neighbours` and `returning` arrive `null`, and a
// screen draws *Aparece desde cinco vecinos* — a phone never holds a number it must not show.
// ⚠️ AN ANSWER THIS BUILD CANNOT READ IS `null`, and the screen says it could not read them — never
// a 0 that is not one.
//
// The names below are read OUT OF THIS FILE by `docs/checks/10.9f-numbers-contract.sh`, which asks a
// real PostgREST with each; `test/numeros.test.ts` holds them to `0086`'s TEXT.
// ============================================================================

/** `0086`'s one door: her kitchen's numbers, now — the owner's. */
export const KITCHEN_NUMBERS = 'kitchen_numbers';

/** What the database refuses, by its SQLSTATE: not her kitchen's owner; a shop. */
export const NO_ES_LA_DUENA = '42501';
export const ES_TIENDA = 'TD013';

/** The floor under which the figures about people are not shown (G27). */
export const PISO_DE_VECINOS = 5;

export interface NumbersArgs {
  readonly p_workspace_id: string;
}

export function numbersArgs(kitchenId: string): NumbersArgs {
  return { p_workspace_id: kitchenId };
}

/** Her pick on the screen: *Día · Semana · Mes*. */
export const PERIODOS = ['dia', 'semana', 'mes'] as const;
export type Periodo = (typeof PERIODOS)[number];

/** The period before: the whole of it. */
export interface Antes {
  readonly from: string;
  readonly to: string;
  readonly plates: number;
  readonly cents: number;
  readonly visits: number;
  readonly walk_ins: number;
  /** `null` under five neighbours. */
  readonly neighbours: number | null;
}

/** One period, today included. */
export interface EnElPeriodo extends Antes {
  /** Of `neighbours`, those with a visit before the period; `null` under five neighbours. */
  readonly returning: number | null;
  /** Visits by day of the week, Monday first — seven. */
  readonly days: readonly number[];
  /** Visits by hour, 0 to 23 — twenty-four. */
  readonly hours: readonly number[];
  readonly prev: Antes;
}

export interface Numeros {
  /** The day they were counted on, in her kitchen's zone (YYYY-MM-DD). */
  readonly day: string;
  /** Her first visit ever — `null` until her first: *Empiezan con tu primera entrega*. */
  readonly since: string | null;
  readonly dia: EnElPeriodo;
  readonly semana: EnElPeriodo;
  readonly mes: EnElPeriodo;
}

/** The prefix her numbers are cached under. */
export const NUMEROS_KEY = ['cocina', 'numeros'] as const;

/** Cached under the login and the kitchen, Cocina's rule. */
export function numerosKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...NUMEROS_KEY, userId ?? '', kitchenId ?? ''];
}

// ---- reading the answer ---------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isCount(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}
function isAmount(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}
function isDay(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function isCounts(v: unknown, n: number): v is number[] {
  return Array.isArray(v) && v.length === n && v.every(isCount);
}
/** A figure about people: a count, or `null` under the floor. Anything else is not one. */
function personas(v: unknown): number | null | undefined {
  if (v === null) return null;
  return isCount(v) ? v : undefined;
}

function antesFrom(data: unknown): Antes | null {
  if (!isObject(data) || !isDay(data.from) || !isDay(data.to)) return null;
  if (!isAmount(data.plates) || !isCount(data.cents) || !isCount(data.visits) || !isCount(data.walk_ins)) return null;
  const neighbours = personas(data.neighbours);
  if (neighbours === undefined) return null;
  return { from: data.from, to: data.to, plates: data.plates, cents: data.cents, visits: data.visits, walk_ins: data.walk_ins, neighbours };
}

function periodoFrom(data: unknown): EnElPeriodo | null {
  const antes = antesFrom(data);
  if (antes === null || !isObject(data)) return null;
  const returning = personas(data.returning);
  const prev = antesFrom(data.prev);
  if (returning === undefined || prev === null || !isCounts(data.days, 7) || !isCounts(data.hours, 24)) return null;
  return { ...antes, returning, days: data.days, hours: data.hours, prev };
}

/** `kitchen_numbers`' answer, or `null` when this build cannot read it. */
export function numerosFrom(data: unknown): Numeros | null {
  if (!isObject(data) || !isDay(data.day)) return null;
  if (data.since !== null && (typeof data.since !== 'string' || Number.isNaN(new Date(data.since).getTime()))) return null;
  const dia = periodoFrom(data.dia);
  const semana = periodoFrom(data.semana);
  const mes = periodoFrom(data.mes);
  if (dia === null || semana === null || mes === null) return null;
  return { day: data.day, since: data.since, dia, semana, mes };
}

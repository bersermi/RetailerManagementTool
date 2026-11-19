// ============================================================================
// PROMOTIONS, AS THE KITCHEN SEES THEM — A CONTRACT WITH POSTGRES. Plan task `10.9g-i`, on `0087`
// (the owner's rulings of 2026-11-05, calls 23–25, and G18, G28–G30 and G36 of 2026-11-16 and 17).
// Drawn by `10.9g-ii`: *Promociones* from its tile on *Hoy*, *Nueva promoción* with its live preview,
// *Tu promoción* with *Terminarla hoy* or *Usarla otra vez*, and *¿Es parte de una promoción?* in
// *Publicar* (`@/api/listing`'s `p_promotion_id`).
//
// ⚠️ WHO DOES WHAT (G18, G36): making, ending and undoing one are the OWNER's (`42501` for a
// helper); reading her kitchen's promotions is ANY MEMBER's — a helper publishes, and *Publicar*
// asks her which runs.
// ⚠️ A PROMOTION IS NEVER EDITED: she ends it and makes another (*Usarla otra vez* fills the form
// from an old one — this phone's work). Its conditions are written here, with her kitchen's name and
// address, and she may change them; the database keeps what she published and never rewrites it.
// ⚠️ IT BEGINS THE DAY IT IS MADE and ends at the close of its last day in her kitchen's zone, eight
// weeks on at most. Up to three run at once (`TD029`); *Para tus clientes* only while her loyalty
// card is open (`TD030`); *Deshacer* within two minutes of its making (`TD032` after, and the screen
// offers *Terminarla hoy*). Her phone makes the id, so a retry is the same promotion. Ending or undoing
// one that is not there (undone on her other phone) answers her list, as a retry does.
// ⚠️ WERA'S SWITCH (`promociones`) KEEPS IT OFF FOR EVERYONE until his product analyst rules: making
// one is refused `TD024`, and Wera Cocina offers it nowhere (`@/lib/loQueUsas`' `PANTALLA_DE`, which
// `10.9g-ii` gives its screen).
//
// The names below are read OUT OF THIS FILE by `docs/checks/10.9g-i-promotions-contract.sh`, which
// asks a real PostgREST with each; `test/promociones.test.ts` holds them to `0087`'s TEXT.
// ============================================================================

/** `0087`'s read and three writes for her kitchen's promotions. */
export const KITCHEN_PROMOTIONS = 'kitchen_promotions';
export const CREATE_PROMOTION = 'create_promotion';
export const END_PROMOTION = 'end_promotion';
export const UNDO_PROMOTION = 'undo_promotion';

/** The four kinds, each the mark neighbours see (call 25). *Para tus clientes* only with her card open. */
export const TIPOS = ['nuevo', 'temporada', 'dia', 'clientes'] as const;
export type Tipo = (typeof TIPOS)[number];

/** Its days: ISO weekdays, 1 Monday to 7 Sunday; all seven is *Todos*. *Un día especial* names one to six. */
export const DIAS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Dia = (typeof DIAS)[number];

/** The bounds `0087` holds: what (1–40), more (≤ 80), conditions (1–400), eight weeks, three at once. */
export const LO_QUE_MAX = 40;
export const MAS_MAX = 80;
export const CONDICIONES_MAX = 400;
export const DIAS_MAX = 56;
export const ACTIVAS_MAX = 3;
/** *Deshacer*'s margin in the database: the screen's eight seconds and a slow signal. */
export const DESHACER_SEGUNDOS = 120;

/** What the database refuses, by its SQLSTATE. */
export const NO_ES_DUENA = '42501';
export const FUERA_DE_RANGO = '22023';
export const ES_TIENDA = 'TD013';
export const NO_SE_OFRECE = 'TD024';
export const TRES_ACTIVAS = 'TD029';
export const SIN_TARJETA = 'TD030';
export const NO_SE_PUEDE_UNIR = 'TD031';
export const YA_NO_SE_DESHACE = 'TD032';

export interface KitchenArgs {
  readonly p_workspace_id: string;
}

export interface CreateArgs {
  readonly p_workspace_id: string;
  readonly p_id: string;
  readonly p_kind: Tipo;
  readonly p_what: string;
  readonly p_more: string | null;
  readonly p_image_path: string | null;
  readonly p_days: readonly Dia[];
  readonly p_ends_on: string;
  readonly p_conditions: string;
}

export interface PromotionArgs {
  readonly p_workspace_id: string;
  readonly p_id: string;
}

/** What *Nueva promoción* hands over once every field is checked on the phone. */
export interface Borrador {
  readonly tipo: Tipo;
  readonly loQue: string;
  readonly mas: string;
  readonly foto: string | null;
  readonly dias: readonly Dia[];
  /** Her last day, in her kitchen's zone (YYYY-MM-DD). */
  readonly hasta: string;
  readonly condiciones: string;
}

export function kitchenArgs(kitchenId: string): KitchenArgs {
  return { p_workspace_id: kitchenId };
}

/** The call for one press of *Publicar promoción*: trimmed, its days once each and in order, more and the photo `null` when none. */
export function createArgs(kitchenId: string, id: string, b: Borrador): CreateArgs {
  const mas = b.mas.trim();
  return {
    p_workspace_id: kitchenId,
    p_id: id,
    p_kind: b.tipo,
    p_what: b.loQue.trim(),
    p_more: mas === '' ? null : mas,
    p_image_path: b.foto,
    p_days: DIAS.filter((d) => b.dias.includes(d)),
    p_ends_on: b.hasta,
    p_conditions: b.condiciones.trim(),
  };
}

export function promotionArgs(kitchenId: string, id: string): PromotionArgs {
  return { p_workspace_id: kitchenId, p_id: id };
}

// ---- the answer, as the database writes it ---------------------------------------------------

/** `kitchen_promotions` — and what each write answers. */
export interface PromotionsRow {
  /** Her kitchen's day (YYYY-MM-DD). */
  readonly day: string;
  readonly max: number;
  readonly running: number;
  /** Whether *Para tus clientes* may be made now: her card open, and Wera's card on. */
  readonly card_open: boolean;
  /** The running ones first, newest first; then the last ten that ended. */
  readonly promotions: readonly PromotionRow[];
}

export interface PromotionRow {
  readonly id: string;
  readonly kind: Tipo;
  readonly what: string;
  readonly more: string | null;
  readonly image_path: string | null;
  readonly days: readonly Dia[];
  readonly starts_on: string;
  readonly ends_on: string;
  readonly conditions: string;
  readonly created_at: string;
  readonly state: Estado;
  /** The day it ended — *Terminarla hoy*'s, else its last; `null` while it runs. */
  readonly ended_on: string | null;
  /** A neighbour sees it now: running, Wera's switch and her choice on, *Para tus clientes* with her card open. */
  readonly shown: boolean;
  /** Hers picked up today that wear its mark in Itacate now — 0 while it is not shown. */
  readonly offers_today: number;
}

export const ESTADOS = ['activa', 'terminada'] as const;
export type Estado = (typeof ESTADOS)[number];

// ---- read, never trusted ---------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isText = (v: unknown): v is string => typeof v === 'string';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v: unknown): v is string => isText(v) && DAY.test(v);

function promotionFrom(v: unknown): PromotionRow | null {
  if (!isObject(v)) return null;
  const { id, kind, what, more, image_path, days, starts_on, ends_on, conditions, created_at, state, ended_on, shown, offers_today } = v;
  if (!isText(id) || !(TIPOS as readonly unknown[]).includes(kind) || !isText(what) || !isText(conditions)) return null;
  if (more !== null && !isText(more)) return null;
  if (image_path !== null && !isText(image_path)) return null;
  if (!Array.isArray(days) || days.length === 0 || !days.every((d) => (DIAS as readonly unknown[]).includes(d))) return null;
  if (!isDay(starts_on) || !isDay(ends_on) || !isText(created_at)) return null;
  if (!(ESTADOS as readonly unknown[]).includes(state)) return null;
  if (ended_on !== null && !isDay(ended_on)) return null;
  if (typeof shown !== 'boolean' || !isCount(offers_today)) return null;
  return {
    id,
    kind: kind as Tipo,
    what,
    more,
    image_path,
    days: days as Dia[],
    starts_on,
    ends_on,
    conditions,
    created_at,
    state: state as Estado,
    ended_on,
    shown,
    offers_today,
  };
}

/**
 * `kitchen_promotions`' answer — or any write's — or null when it is not one. ⚠️ A PROMOTION THIS
 * BUILD CANNOT READ IS LEFT OUT, never the list: a kind added later is a new mark this build does
 * not draw. The counts are the database's, so *Tienes tres activas* holds whatever was left out.
 */
export function promocionesFrom(data: unknown): PromotionsRow | null {
  if (!isObject(data)) return null;
  const { day, max, running, card_open, promotions } = data;
  if (!isDay(day) || !isCount(max) || !isCount(running) || typeof card_open !== 'boolean') return null;
  if (!Array.isArray(promotions)) return null;
  const read: PromotionRow[] = [];
  for (const p of promotions) {
    const row = promotionFrom(p);
    if (row !== null) read.push(row);
  }
  return { day, max, running, card_open, promotions: read };
}

/** ISO weekday (1 Monday … 7 Sunday) of a day written YYYY-MM-DD — the calendar's, never the phone's zone. */
export function diaDeLaSemana(day: string): Dia {
  const [y, m, d] = day.split('-').map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (js === 0 ? 7 : js) as Dia;
}

/**
 * The ones *¿Es parte de una promoción?* offers for an offer picked up on `day` (YYYY-MM-DD, her
 * kitchen's zone): running, shown, `day` between its first and last, and one of its weekdays — what
 * `publish_listing` takes; anything else it refuses `TD031`, the whole publication with it.
 */
export function activasEl(row: PromotionsRow | null, day: string): readonly PromotionRow[] {
  if (row === null || !DAY.test(day)) return [];
  const dow = diaDeLaSemana(day);
  return row.promotions.filter(
    (p) => p.state === 'activa' && p.shown && p.starts_on <= day && day <= p.ends_on && p.days.includes(dow),
  );
}

/** The prefix her kitchen's promotions are cached under. */
export const PROMOCIONES_KEY = ['cocina', 'promociones'] as const;

/** Cached under the login and the kitchen, Cocina's rule. */
export function promocionesKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...PROMOCIONES_KEY, userId ?? '', kitchenId ?? ''];
}

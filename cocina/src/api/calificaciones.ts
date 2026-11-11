// ============================================================================
// HER STARS, AS THE KITCHEN MAY SEE THEM — A CONTRACT WITH POSTGRES. Plan task
// `10.5b-iv-c`, on `0080`'s `my_kitchen_ratings` (`10.5b-ii-b`): *Mi cocina › Tus
// calificaciones*, and the stars on her preview (*Así la ven*).
//
// ⚠️ WHAT THE OWNER RULED (Q3 of `10.5b-ii`, 2026-11-10): she sees the neighbours'
// stars THE DAY AFTER, MIXED, NEVER WHO — from five; below five, how many there are
// and nothing else. The database keeps every one of those promises
// (`kitchen_ratings_counted`): this module only reads what it is sent, and nothing
// here could tell her who gave which — no order, no code, no name, no moment arrives.
// Her note to Wera never arrives either.
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE, AND NOTHING THAT TALKS. The names
// below are read OUT OF THIS FILE by `docs/checks/10.5b-iv-c-settings-contract.sh`,
// which asks a real PostgREST below five and from five; `test/calificaciones.test.ts`
// holds the tags and the door's rule (`estrellasDe`) to `0080`'s TEXT.
// ============================================================================

import type { EtiquetaBuena, Estrellas } from '@/vecinos/cocinas';

/** `0080`'s function: her kitchen's stars, any member. */
export const MY_KITCHEN_RATINGS = 'my_kitchen_ratings';

/** Its one argument, by the name PostgREST matches on. */
export interface RatingsArgs {
  readonly p_workspace_id: string;
}

export function ratingsArgs(kitchenId: string): RatingsArgs {
  return { p_workspace_id: kitchenId };
}

/** Below this many, only the count (`if v_count < 5`) — and the door shows no stars. */
export const DESDE = 5;

/**
 * The answer, by the database's names. ⚠️ The contract check reads these keys out of
 * here and asks for each from five; below five only `count` comes.
 */
export interface RatingsRow {
  readonly count: number;
  readonly average?: string;
  readonly tags?: Readonly<Record<string, number>>;
  readonly yesterday?: readonly YesterdayRow[];
}

/** One of yesterday's ratings, mixed: stars and tags, and nothing else. */
export interface YesterdayRow {
  readonly stars: number;
  readonly tags: readonly string[];
}

/** The eight tags, in `my_kitchen_ratings`' own order: the good four, then the other four. */
export const ETIQUETAS = [
  'lista_a_tiempo',
  'buena_porcion',
  'muy_rica',
  'me_atendieron_bien',
  'tuve_que_esperar',
  'porcion_chica',
  'no_me_gusto',
  'me_atendieron_mal',
] as const;
export type Etiqueta = (typeof ETIQUETAS)[number];

/** The good four — the ones the door shows a neighbour (`ETIQUETAS_BUENAS`, Itacate's). */
export const BUENAS: readonly Etiqueta[] = ETIQUETAS.slice(0, 4);

/** How many of her kitchen's top good tags the door shows (`limit 3`). */
export const ETIQUETAS_EN_LA_PUERTA = 3;

/** One tag and how many times it was given. */
export interface Veces {
  readonly etiqueta: Etiqueta;
  readonly veces: number;
}

/** Her stars, as this app holds them. */
export type Calificaciones =
  | { readonly kind: 'pocas'; readonly cuantas: number }
  | {
      readonly kind: 'listas';
      readonly cuantas: number;
      /** The average to one decimal, as the database wrote it: *4.7*. */
      readonly promedio: string;
      /** Each tag given at least once, the most given first, then in the database's order. */
      readonly etiquetas: readonly Veces[];
      /** Yesterday's, mixed as they came — never in the order they were given. */
      readonly ayer: readonly { readonly estrellas: number; readonly etiquetas: readonly Etiqueta[] }[];
    };

function esEtiqueta(value: unknown): value is Etiqueta {
  return typeof value === 'string' && (ETIQUETAS as readonly string[]).includes(value);
}

/**
 * The answer read. ⚠️ A TAG THIS BUILD DOES NOT KNOW IS LEFT OUT, never an error; an
 * answer it cannot read at all is *no ratings yet* — `null` — and the screen says it could
 * not read them.
 */
export function calificacionesFrom(data: unknown): Calificaciones | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const row = data as Partial<RatingsRow>;
  const cuantas = row.count;
  if (typeof cuantas !== 'number' || !Number.isInteger(cuantas) || cuantas < 0) return null;
  const promedio = typeof row.average === 'string' ? row.average.trim() : '';
  if (cuantas < DESDE || !/^[1-5](\.[0-9])?$/.test(promedio)) return { kind: 'pocas', cuantas };
  const dichas = typeof row.tags === 'object' && row.tags !== null ? row.tags : {};
  const etiquetas: Veces[] = ETIQUETAS.map((etiqueta) => ({ etiqueta, veces: dichas[etiqueta] }))
    .filter((v): v is Veces => typeof v.veces === 'number' && Number.isInteger(v.veces) && v.veces > 0)
    .sort((a, b) => b.veces - a.veces || ETIQUETAS.indexOf(a.etiqueta) - ETIQUETAS.indexOf(b.etiqueta));
  const ayer = (Array.isArray(row.yesterday) ? row.yesterday : [])
    .filter((r): r is YesterdayRow => typeof r === 'object' && r !== null && Number.isInteger(r.stars) && r.stars >= 1 && r.stars <= 5)
    .map((r) => ({ estrellas: r.stars, etiquetas: (Array.isArray(r.tags) ? r.tags : []).filter(esEtiqueta) }));
  return { kind: 'listas', cuantas, promedio, etiquetas, ayer };
}

/**
 * ⚠️ HER STARS AS THE DOOR SENDS THEM TO A NEIGHBOUR (`on_offer_now`'s `stars`, `0080`),
 * worked out again from her own answer for *Así la ven*: from five, the average, the count
 * and her three most given GOOD tags — the most given first, then by the tag's name — a tag
 * given never not listed. Below five, none: *Todavía sin calificaciones*. Both answers are
 * counted from the same ratings (`kitchen_ratings_counted`), so they agree.
 */
export function estrellasDe(calificaciones: Calificaciones | null): Estrellas | null {
  if (calificaciones === null || calificaciones.kind !== 'listas') return null;
  const buenas = calificaciones.etiquetas
    .filter((v) => BUENAS.includes(v.etiqueta))
    .sort((a, b) => b.veces - a.veces || (a.etiqueta < b.etiqueta ? -1 : a.etiqueta > b.etiqueta ? 1 : 0))
    .slice(0, ETIQUETAS_EN_LA_PUERTA)
    .map((v) => v.etiqueta as EtiquetaBuena);
  return { promedio: calificaciones.promedio, cuantas: calificaciones.cuantas, etiquetas: buenas };
}

/** The prefix her stars are cached under. */
export const CALIFICACIONES_KEY = ['cocina', 'calificaciones'] as const;

/** Cached under the login and the kitchen, Cocina's rule. */
export function calificacionesKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...CALIFICACIONES_KEY, userId ?? '', kitchenId ?? ''];
}

/**
 * Read again at most every half hour: they move once a day (the day after), so a read per
 * open of the screen would spend her data for nothing.
 */
export const CALIFICACIONES_FRESCAS_MS = 30 * 60_000;

// ============================================================================
// THE KITCHENS SHE FOLLOWS — A CONTRACT WITH POSTGRES. Plan task `10.9d-i`, on `0084`'s
// `set_my_follow` and `my_follows` (the owner's rulings G19–G23 of 2026-11-17): she follows a
// kitchen from its page (*Seguir*), and rings its bell apart (*Avísame cuando publique*);
// *Mis cocinas* lists the kitchens she follows, whether each published today, and a kitchen
// that left reads *dejó Itacate* there for 30 days. Drawn by `10.9d-ii`.
//
// ⚠️ HERS ALONE, KEYED ON HER LOGIN: both functions read `auth.uid()`; nothing here names her,
// and no kitchen ever reads who follows it (it reads how many, `kitchen_followers`).
// ⚠️ TWO SWITCHES, EITHER ALONE: `p_following` and `p_bell` each `null` to leave as it is; both
// off and her row is gone. ⚠️ THE BELL IS STORED, NOT RUNG — its message is `10.9h`'s, and
// its default his product analyst's: off until she taps it.
// ⚠️ A KITCHEN HERE NEED NOT BE IN THE DOOR: one quiet for more than two weeks is still hers
// to follow, so *Mis cocinas* draws from this answer, never from `on_offer_now`'s.
//
// ⚠️ AN ANSWER IT CANNOT READ AT ALL IS `null`; a kitchen it cannot read is left out, never
// the list (the door's rule, `@/api/cocinas`). The names below are read OUT OF THIS FILE by
// `docs/checks/10.9d-i-following-contract.sh`, which asks a real PostgREST with each;
// `test/siguiendo.test.ts` holds them to `0084`'s TEXT.
// ============================================================================

import { aMilisegundos } from '@/api/cocinas';
import { toPage, type Page, type PageFields } from '@/api/pagina';

/** `0084`'s write: following and the bell, either or both. */
export const SET_MY_FOLLOW = 'set_my_follow';
/** `0084`'s read: the kitchens she follows or rings, and those that left in 30 days. */
export const MY_FOLLOWS = 'my_follows';

/** `TD026`: not a kitchen in Itacate — deleted since her page was read, or never one. */
export const NO_ES_COCINA = 'TD026';

/** How long a kitchen that left stays in *Mis cocinas* as *dejó Itacate* (G23). */
export const DIAS_QUE_SE_VE_QUE_SE_FUE = 30;

/** The prefix her follows are cached under. */
export const SIGUIENDO_KEY = ['itacate', 'siguiendo'] as const;

/** Cached under the login, Itacate's rule. */
export function siguiendoKey(userId: string | null): readonly unknown[] {
  return [...SIGUIENDO_KEY, userId ?? ''];
}

// ----------------------------------------------------------------------------
// The arguments, by the names PostgREST matches on
// ----------------------------------------------------------------------------

export interface FollowArgs {
  readonly p_workspace_id: string;
  /** `true` *Seguir*, `false` *Dejar de seguir*, `null` as it is. */
  readonly p_following: boolean | null;
  /** `true` the bell on, `false` off, `null` as it is. */
  readonly p_bell: boolean | null;
}

/** What she changes on one kitchen: either switch, or both. */
export interface Cambio {
  readonly siguiendo?: boolean;
  readonly campana?: boolean;
}

export function followArgs(kitchenId: string, cambio: Cambio): FollowArgs {
  return { p_workspace_id: kitchenId, p_following: cambio.siguiendo ?? null, p_bell: cambio.campana ?? null };
}

// ----------------------------------------------------------------------------
// The answers, by the database's names — ⚠️ the contract check reads each key
// ----------------------------------------------------------------------------

/** What `set_my_follow` answers: the two switches as the database now holds them. */
export interface FollowStateRow {
  readonly following: boolean;
  readonly bell: boolean;
}

/** What `my_follows` answers. */
export interface FollowsRow {
  readonly kitchens: readonly FollowRow[];
  readonly gone: readonly GoneRow[];
}

/** One kitchen she follows or rings. */
export interface FollowRow {
  readonly id: string;
  readonly name: string;
  readonly giro: string | null;
  readonly colonia: string | null;
  /** Her page's colour and pictures (`0076`), or `null` before she made one. */
  readonly page: Pick<PageFields, 'color' | 'logo_path' | 'cover_path'> | null;
  readonly following: boolean;
  readonly bell: boolean;
  /** When she first followed or rang it. */
  readonly since: string;
  /** The door's `summary.last_day` (`0078`): the last day it published for, in its zone, over four weeks. */
  readonly last_day: string | null;
}

/** A kitchen she followed that left Itacate. */
export interface GoneRow {
  readonly id: string;
  readonly name: string;
  readonly gone_at: string;
}

/** Her two switches on one kitchen, as this app holds them. */
export interface Switches {
  readonly siguiendo: boolean;
  readonly campana: boolean;
}

/** One kitchen of hers, as this app holds it. */
export interface Seguida extends Switches {
  readonly id: string;
  readonly nombre: string;
  readonly giro: string | null;
  readonly colonia: string | null;
  readonly pagina: Page;
  readonly desde: Date;
  /** `YYYY-MM-DD`, or `null` when it published nothing in four weeks. */
  readonly ultimoDia: string | null;
}

/** A kitchen of hers that left. */
export interface SeFue {
  readonly id: string;
  readonly nombre: string;
  readonly cuando: Date;
}

export interface Siguiendo {
  readonly cocinas: readonly Seguida[];
  readonly seFueron: readonly SeFue[];
}

/** Nothing followed: what she has before her first *Seguir*. */
export const NINGUNA: Siguiendo = { cocinas: [], seFueron: [] };

function texto(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function instante(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(aMilisegundos(value));
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function dia(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** The two switches `set_my_follow` answers, or `null` when it is not that. */
export function switchesFrom(data: unknown): Switches | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const { following, bell } = data as Partial<FollowStateRow>;
  if (typeof following !== 'boolean' || typeof bell !== 'boolean') return null;
  return { siguiendo: following, campana: bell };
}

function seguidaOf(value: unknown): Seguida | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Partial<FollowRow>;
  const id = texto(row.id);
  const nombre = texto(row.name);
  const desde = instante(row.since);
  if (id === null || nombre === null || desde === null) return null;
  if (typeof row.following !== 'boolean' || typeof row.bell !== 'boolean') return null;
  return {
    id,
    nombre,
    giro: texto(row.giro),
    colonia: texto(row.colonia),
    pagina: toPage(row.page),
    siguiendo: row.following,
    campana: row.bell,
    desde,
    ultimoDia: dia(row.last_day),
  };
}

function seFueOf(value: unknown): SeFue | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Partial<GoneRow>;
  const id = texto(row.id);
  const nombre = texto(row.name);
  const cuando = instante(row.gone_at);
  return id === null || nombre === null || cuando === null ? null : { id, nombre, cuando };
}

/**
 * `my_follows`' answer read. ⚠️ A KITCHEN IT CANNOT READ IS LEFT OUT, never the list; an answer
 * that is not the two lists at all is `null`.
 */
export function siguiendoFrom(data: unknown): Siguiendo | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const row = data as Partial<FollowsRow>;
  if (!Array.isArray(row.kitchens) || !Array.isArray(row.gone)) return null;
  return {
    cocinas: (row.kitchens as readonly unknown[]).map(seguidaOf).filter((s): s is Seguida => s !== null),
    seFueron: (row.gone as readonly unknown[]).map(seFueOf).filter((s): s is SeFue => s !== null),
  };
}

/** Her switches on one kitchen — both off when she neither follows nor rings it. */
export function switchesDe(siguiendo: Siguiendo | null | undefined, kitchenId: string): Switches {
  const s = siguiendo?.cocinas.find((c) => c.id === kitchenId);
  return s === undefined ? { siguiendo: false, campana: false } : { siguiendo: s.siguiendo, campana: s.campana };
}

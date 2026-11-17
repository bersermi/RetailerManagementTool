// ============================================================================
// WHAT HER KITCHEN USES — A CONTRACT WITH POSTGRES. Plan task `10.9a-i`, on `0081`'s
// `my_kitchen_features`, `set_kitchen_features` and `send_menu_request` — the frame every
// service lands on (the owner's rulings of 2026-11-16 and 17: each kitchen picks what she
// uses, in the first run's *¿Qué más quieres usar?* and in *Mi cocina › Lo que usas*, and
// *Hoy* grows a tile per feature she uses).
//
// ⚠️ PER KITCHEN, NEVER PER PHONE: her choices live in the database (`servicio.kitchen_feature`),
// so her helpers' phones (`10.9b`) draw the same *Hoy*. Every member reads them; ONLY THE
// OWNER WRITES them, and only the owner writes about the menu — the database refuses
// anyone else (`42501`).
//
// ⚠️ TWO LAYERS DECIDE WHAT SHE IS OFFERED: Wera's switch for everyone (`available`) —
// a feature not built, or built and kept off (promotions until his product analyst rules),
// is offered nowhere and cannot be turned on (`TD024`) — and her own choice. *Próximamente*
// (*Tu menú*, *Cuéntanos cómo necesitas tu menú*) shows only while `proximamente` is on:
// after both stores approve the app.
//
// ⚠️ A FEATURE OR A STATE THIS BUILD DOES NOT KNOW IS LEFT OUT, never an error — so a build
// in her hand survives the feature that comes after it (Itacate's rule for the door, the same
// row). An answer it cannot read at all is `null`, and a screen says it could not read it.
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE, AND NOTHING THAT TALKS. The names below are
// read OUT OF THIS FILE by `docs/checks/10.9a-i-features-contract.sh`, which asks a real
// PostgREST with each; `test/servicios.test.ts` holds the lists and the limit to `0081`'s TEXT.
// ============================================================================

import { SERVICIOS_VISTOS, type ServicioVisto } from '@/vecinos/cocinas';

/** `0081`'s read: her kitchen's choices, what Wera offers, Próximamente — any member. */
export const MY_KITCHEN_FEATURES = 'my_kitchen_features';
/** `0081`'s write: one or several choices at once — the owner only. */
export const SET_KITCHEN_FEATURES = 'set_kitchen_features';
/** `0081`'s *Cuéntanos cómo necesitas tu menú* — the owner only; kept, never sent anywhere. */
export const SEND_MENU_REQUEST = 'send_menu_request';

/** The features, in the family-shell page's fixed order — the order of *Hoy*'s tiles. */
export const SERVICIOS = ['tarjeta', 'promociones', 'numeros', 'menu'] as const;
export type Servicio = (typeof SERVICIOS)[number];

/** What she said of each: she uses it, she does not, or *Me interesa*. */
export const ESTADOS = ['on', 'off', 'interesada'] as const;
export type Estado = (typeof ESTADOS)[number];

/**
 * ⚠️ WHAT A NEIGHBOUR SEES HER KITCHEN USE — the door's `features` (`on_offer_now`, `0081`):
 * the card and promotions, never her numbers, which are hers alone — Itacate's own list
 * (`SERVICIOS_VISTOS`, copied into `@/vecinos/`). *Así la ven* works it out again from her own
 * answer (`enLaPuerta`), never from the door.
 */
export const EN_LA_PUERTA: readonly ServicioVisto[] = SERVICIOS_VISTOS;

/** What *Cuéntanos cómo necesitas tu menú* takes: 1 to this many characters, trimmed. */
export const MENU_MAXIMO = 500;

/** `TD024`: on, for a feature Wera has switched off for everyone. */
export const NO_SE_OFRECE = 'TD024';

// ----------------------------------------------------------------------------
// The arguments, by the names PostgREST matches on
// ----------------------------------------------------------------------------

export interface FeaturesArgs {
  readonly p_workspace_id: string;
}

export interface SetFeaturesArgs {
  readonly p_workspace_id: string;
  /** `{feature: state}` — every key known, or the database refuses all of it (`22023`). */
  readonly p_choices: Readonly<Partial<Record<Servicio, Estado>>>;
}

export interface MenuRequestArgs {
  readonly p_workspace_id: string;
  readonly p_text: string;
}

export function featuresArgs(kitchenId: string): FeaturesArgs {
  return { p_workspace_id: kitchenId };
}

export function setFeaturesArgs(kitchenId: string, choices: Readonly<Partial<Record<Servicio, Estado>>>): SetFeaturesArgs {
  return { p_workspace_id: kitchenId, p_choices: choices };
}

export function menuRequestArgs(kitchenId: string, text: string): MenuRequestArgs {
  return { p_workspace_id: kitchenId, p_text: text.trim() };
}

// ----------------------------------------------------------------------------
// The answer, by the database's names — ⚠️ the contract check reads each key
// ----------------------------------------------------------------------------

/** What every one of the three functions answers. */
export interface FeaturesRow {
  readonly features: readonly FeatureRow[];
  readonly available: readonly string[];
  readonly proximamente: boolean;
  readonly menu_requests: number;
}

/** One choice of hers. */
export interface FeatureRow {
  readonly feature: string;
  readonly state: string;
  /** When the state last changed, as Postgres writes it. */
  readonly since: string;
}

/** One feature she chose, as this app holds it. */
export interface Eleccion {
  readonly estado: Estado;
  readonly desde: Date;
}

/** What her kitchen uses, as this app holds it. */
export interface LoQueUsa {
  /** Her choices — a feature she never chose is absent (*Decidir después*). */
  readonly elecciones: Readonly<Partial<Record<Servicio, Eleccion>>>;
  /** What Wera offers now, in the fixed order. */
  readonly ofrecidos: readonly Servicio[];
  /** Whether every *Próximamente* may show — after both stores approve. */
  readonly proximamente: boolean;
  /** How many times her kitchen told us about the menu. */
  readonly pedidosDeMenu: number;
}

/** Nothing chosen and nothing offered: what a kitchen has before her first choice. */
export const NADA: LoQueUsa = { elecciones: {}, ofrecidos: [], proximamente: false, pedidosDeMenu: 0 };

const esServicio = (value: unknown): value is Servicio =>
  typeof value === 'string' && (SERVICIOS as readonly string[]).includes(value);
const esEstado = (value: unknown): value is Estado => typeof value === 'string' && (ESTADOS as readonly string[]).includes(value);

/** An instant as Postgres writes it — up to six decimals of a second — cut to three for every engine. */
function instante(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const cut = value.replace(/(\.\d{3})\d+/, '$1');
  const date = new Date(cut);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The answer read. ⚠️ A FEATURE OR A STATE THIS BUILD DOES NOT KNOW IS LEFT OUT; an answer it
 * cannot read at all is `null`.
 */
export function loQueUsaFrom(data: unknown): LoQueUsa | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const row = data as Partial<FeaturesRow>;
  if (!Array.isArray(row.features) || !Array.isArray(row.available)) return null;
  const elecciones: Partial<Record<Servicio, Eleccion>> = {};
  for (const f of row.features as readonly unknown[]) {
    if (typeof f !== 'object' || f === null) continue;
    const { feature, state, since } = f as Partial<FeatureRow>;
    const desde = instante(since);
    if (esServicio(feature) && esEstado(state) && desde !== null) elecciones[feature] = { estado: state, desde };
  }
  const dichos = row.available as readonly unknown[];
  const ofrecidos = SERVICIOS.filter((s) => dichos.includes(s));
  const pedidos = row.menu_requests;
  return {
    elecciones,
    ofrecidos,
    proximamente: row.proximamente === true,
    pedidosDeMenu: typeof pedidos === 'number' && Number.isInteger(pedidos) && pedidos > 0 ? pedidos : 0,
  };
}

/** The features she uses — on, and offered by Wera now — in the fixed order: *Hoy*'s tiles. */
export function enUso(loQueUsa: LoQueUsa): Servicio[] {
  return SERVICIOS.filter((s) => loQueUsa.elecciones[s]?.estado === 'on' && loQueUsa.ofrecidos.includes(s));
}

/** What the door says her kitchen uses (`features`): what she uses that a neighbour sees, in its order. */
export function enLaPuerta(loQueUsa: LoQueUsa | null): ServicioVisto[] {
  if (loQueUsa === null) return [];
  const usados = enUso(loQueUsa);
  return EN_LA_PUERTA.filter((s) => usados.includes(s));
}

/** The prefix her kitchen's choices are cached under. */
export const SERVICIOS_KEY = ['cocina', 'servicios'] as const;

/** Cached under the login and the kitchen, Cocina's rule. */
export function serviciosKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...SERVICIOS_KEY, userId ?? '', kitchenId ?? ''];
}

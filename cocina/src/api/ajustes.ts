// ============================================================================
// HER SETTINGS, AS A CONTRACT WITH POSTGRES. Plan task `10.5b-iv-c`, on the six
// columns `0079` and `0080` added to `kitchen_page` — one row per kitchen, no row a
// kitchen of defaults — and their one door, `set_kitchen_page` (`@/api/pagina`'s).
//
// ⚠️ WHAT THE OWNER RULED (slice 3's design of 2026-11-05 and `10.5b-ii`'s final design
// of 2026-11-10), each a row of *Mi cocina*:
//   - *CÓMO TE PAGAN*: cash always; *Tarjeta* (her own terminal) and *Transferencia* (to
//     the account she gives at the counter), each a yes or no, off at first. ⚠️ NEVER AN
//     ACCOUNT, A CARD OR AN AMOUNT: Wera Cocina keeps how she is paid, nothing else.
//   - *CÓMO SE COME*: *Para llevar* (on at first) and *Para comer aquí* (off), AT LEAST
//     ONE — the database refuses none (`kitchen_page_one_way_at_least`), and so does the
//     screen, before it is asked.
//   - *EL DESECHABLE*: a price, or none — added when a neighbour takes a plate away, and
//     copied onto each offer when it is published (`publish_listing`).
//   - *AJUSTES DE APARTADOS › QUIÉN PUEDE APARTAR*: *Todos* (`null`), *Más de 75%*, *80%*
//     or *85%* of thumbs up, and no other option (`kitchen_page_min_score_known`); a new
//     neighbour always passes; nobody is cancelled by it. ⚠️ NOTHING ON *HOY* OR
//     *APARTADOS* NAMES IT (the final design): one screen deep, for a fonda who explores.
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE, AND NOTHING THAT TALKS (`@/api/kitchen`'s
// split): the words are `@/lib/ajustes`'. `test/ajustes.test.ts` holds every rule to
// `0079`'s and `0080`'s TEXT, and `docs/checks/10.5b-iv-c-settings-contract.sh` reads the
// names below OUT OF THIS FILE and asks a real PostgREST.
//
// ⚠️⚠️ ONLY WHAT SHE CHANGED IS SENT — one key a tap (`@/api/pagina`'s rule): the door sets
// the keys it is sent and keeps the rest, so a setting a later build adds is never erased
// by this one, and her page's fields are never touched from here.
//
// ⚠️ READ APART FROM HER PAGE, ON PURPOSE: `Page` is the door's own shape, which Itacate's
// two pages are drawn from (`@/vecinos/`, held to Itacate's files) — her settings joining
// it would move a type that is not this app's alone. One small read more.
// ⚠️ NOT KEPT ON THE PHONE (`@/api/persist`): nothing at the counter needs them with no
// signal — publishing is online — and the plan's row says they join it only if it does.
// ============================================================================

import { SCALE, formatDecimal, parseDecimal } from '@tienda/money';

// ----------------------------------------------------------------------------
// The read
// ----------------------------------------------------------------------------

/** Her page's table — her settings are six of its columns (`0079`, `0080`). */
export const AJUSTES_TABLE = 'kitchen_page';

/** What this app reads of it for her settings. Named, never `*`. ⚠️ One line: the contract check reads it. */
export const AJUSTES_COLUMNS = 'accepts_card,accepts_transfer,para_llevar,para_aqui,container_price,min_score';

/** The column the read is filtered on — the open kitchen's id, as her page's is. */
export const AJUSTES_OWNER_COLUMN = 'workspace_id';

/** The prefix every kitchen's settings are cached under — what a save invalidates. */
export const AJUSTES_KEY = ['cocina', 'ajustes'] as const;

/** Cached under the login and the kitchen, Cocina's rule (`kitchensKey`). */
export function ajustesKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...AJUSTES_KEY, userId ?? '', kitchenId ?? ''];
}

/**
 * Her settings by the database's names — what PostgREST sends back, and the keys
 * `set_kitchen_page` reads out of its object. ⚠️ The contract check reads these keys out
 * of here and sets each one through the door.
 */
export interface AjustesFields {
  readonly accepts_card: boolean;
  readonly accepts_transfer: boolean;
  readonly para_llevar: boolean;
  readonly para_aqui: boolean;
  /** Pesos as PostgREST sends a `numeric` — a number, read as its text — or `null`, no charge. */
  readonly container_price: number | string | null;
  readonly min_score: number | null;
}

/** Who may reserve, by score: strictly more than this share of thumbs up (`0080`). `null` is *Todos*. */
export const MIN_SCORES = [75, 80, 85] as const;
export type MinScore = (typeof MIN_SCORES)[number];

export function isMinScore(value: unknown): value is MinScore {
  return typeof value === 'number' && (MIN_SCORES as readonly number[]).includes(value);
}

/** Her settings, as this app holds them. Money in integer centavos. */
export interface Ajustes {
  readonly tarjeta: boolean;
  readonly transferencia: boolean;
  readonly llevar: boolean;
  readonly aqui: boolean;
  /** The *desechable*'s price, or `null` — she does not charge for it. */
  readonly desechableCentavos: number | null;
  readonly minScore: MinScore | null;
}

/**
 * A kitchen nobody has set: the columns' defaults (`0079`'s `default false` / `true`,
 * `0080`'s NULL) — and the door's `coalesce`s for a kitchen with no row at all.
 */
export const AJUSTES_INICIALES: Ajustes = {
  tarjeta: false,
  transferencia: false,
  llevar: true,
  aqui: false,
  desechableCentavos: null,
  minScore: null,
};

function centavosDe(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  try {
    const centavos = parseDecimal(typeof value === 'number' ? String(value) : value.trim(), SCALE.money);
    return centavos > 0 ? centavos : null;
  } catch {
    return null;
  }
}

/**
 * One row, renamed; no row is a kitchen of defaults. ⚠️ A VALUE THIS BUILD DOES NOT KNOW
 * READS AS ITS DEFAULT, never as an error: a later build may offer *Más de 90%*, and this
 * one draws what it can — its screen then marks no option, and sends nothing until she taps.
 */
export function toAjustes(row: Partial<AjustesFields> | null | undefined): Ajustes {
  if (row === null || row === undefined) return AJUSTES_INICIALES;
  const sino = (value: unknown, defecto: boolean) => (typeof value === 'boolean' ? value : defecto);
  const llevar = sino(row.para_llevar, AJUSTES_INICIALES.llevar);
  const aqui = sino(row.para_aqui, AJUSTES_INICIALES.aqui);
  return {
    tarjeta: sino(row.accepts_card, false),
    transferencia: sino(row.accepts_transfer, false),
    // The database keeps one at least; a row that says neither is read as its default.
    llevar: llevar || !aqui,
    aqui,
    desechableCentavos: centavosDe(row.container_price),
    minScore: isMinScore(row.min_score) ? row.min_score : null,
  };
}

// ----------------------------------------------------------------------------
// Saving — `set_kitchen_page`, one key a tap
// ----------------------------------------------------------------------------

/** What one tap changes, by the database's names. `container_price` is pesos as text, or `null`. */
export interface AjustesPatch {
  readonly accepts_card?: boolean;
  readonly accepts_transfer?: boolean;
  readonly para_llevar?: boolean;
  readonly para_aqui?: boolean;
  readonly container_price?: string | null;
  readonly min_score?: MinScore | null;
}

/** `set_kitchen_page`'s arguments for a setting, by the names PostgREST matches on (`@/api/pagina`'s `SetPageArgs`). */
export interface SetAjustesArgs {
  readonly p_workspace_id: string;
  readonly p_page: AjustesPatch;
}

export function setAjustesArgs(kitchenId: string, patch: AjustesPatch): SetAjustesArgs {
  return { p_workspace_id: kitchenId, p_page: patch };
}

/** The two ways she may take payment besides cash, which is always taken. */
export type PagoOpcional = 'tarjeta' | 'transferencia';

/** *Tarjeta* or *Transferencia* switched. */
export function pagoPatch(pago: PagoOpcional, on: boolean): AjustesPatch {
  return pago === 'tarjeta' ? { accepts_card: on } : { accepts_transfer: on };
}

/** The two ways a plate is handed over. */
export type Comer = 'llevar' | 'aqui';

/**
 * *Para llevar* or *Para comer aquí* switched — or `null`, nothing to send, when it would
 * leave her kitchen with neither: the database refuses that (`22023`), so the switch is
 * never offered off (the screen says *Al menos una*).
 */
export function comerPatch(ajustes: Ajustes, comer: Comer, on: boolean): AjustesPatch | null {
  const llevar = comer === 'llevar' ? on : ajustes.llevar;
  const aqui = comer === 'aqui' ? on : ajustes.aqui;
  if (!llevar && !aqui) return null;
  return comer === 'llevar' ? { para_llevar: on } : { para_aqui: on };
}

/** Whether switching that way off would leave her kitchen with none. */
export function esLaUnica(ajustes: Ajustes, comer: Comer): boolean {
  return comer === 'llevar' ? ajustes.llevar && !ajustes.aqui : ajustes.aqui && !ajustes.llevar;
}

/** *Quién puede apartar*: one of the four. */
export function minScorePatch(minScore: MinScore | null): AjustesPatch {
  return { min_score: minScore };
}

/** Below 100,000 pesos, as every price here (`kitchen_page_container_price_shape`). In centavos. */
export const DESECHABLE_TECHO_CENTAVOS = 10_000_000;

/** What is wrong with the *desechable* she typed, or `null`. */
export type DesechableIssue = 'vacio' | 'forma';

/**
 * The price she typed as centavos, or why not — Wera's `parsePesos`' cleaning (`$`, spaces
 * and thousands commas go; three decimals, a sign or a word are refused, never repaired),
 * above zero and below 100,000: what the database takes.
 */
export function desechableDe(typed: string): { readonly centavos: number } | { readonly issue: DesechableIssue } {
  const figure = typed.replace(/[\s,$]/g, '');
  if (figure === '') return { issue: 'vacio' };
  try {
    const centavos = parseDecimal(figure, SCALE.money);
    if (centavos <= 0 || centavos >= DESECHABLE_TECHO_CENTAVOS) return { issue: 'forma' };
    return { centavos };
  } catch {
    return { issue: 'forma' };
  }
}

/** *Guardar* with a price (centavos), or *No lo cobro* (`null`): pesos as the door reads them. */
export function desechablePatch(centavos: number | null): AjustesPatch {
  return { container_price: centavos === null ? null : formatDecimal(centavos, SCALE.money) };
}

/** Her settings with one tap laid over them — drawn at once, before the door answers. */
export function ajustesCon(ajustes: Ajustes, patch: AjustesPatch): Ajustes {
  return {
    tarjeta: patch.accepts_card ?? ajustes.tarjeta,
    transferencia: patch.accepts_transfer ?? ajustes.transferencia,
    llevar: patch.para_llevar ?? ajustes.llevar,
    aqui: patch.para_aqui ?? ajustes.aqui,
    desechableCentavos:
      patch.container_price === undefined ? ajustes.desechableCentavos : patch.container_price === null ? null : centavosDe(patch.container_price),
    minScore: patch.min_score === undefined ? ajustes.minScore : patch.min_score,
  };
}

/** The settings as the screen's text box shows them: `5`, `5.50`, or nothing. */
export function desechableTexto(centavos: number | null): string {
  if (centavos === null) return '';
  const text = formatDecimal(centavos, SCALE.money);
  return text.endsWith('.00') ? text.slice(0, -3) : text;
}

// ----------------------------------------------------------------------------
// What the door sends of them — for *Así la ven* (`@/lib/comoLaVen`)
// ----------------------------------------------------------------------------

/** How she takes payment, as the door lists it: cash always and first, then card, then transfer (`0079`). */
export function pagosDe(ajustes: Ajustes): ('efectivo' | 'tarjeta' | 'transferencia')[] {
  return ['efectivo', ...(ajustes.tarjeta ? (['tarjeta'] as const) : []), ...(ajustes.transferencia ? (['transferencia'] as const) : [])];
}

/** The ways she hands plates over, as the door lists them: *para llevar* first (`0079`). */
export function comeresDe(ajustes: Ajustes): Comer[] {
  return [...(ajustes.llevar ? (['llevar'] as const) : []), ...(ajustes.aqui ? (['aqui'] as const) : [])];
}

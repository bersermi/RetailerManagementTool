// ============================================================================
// THE LOYALTY CARD, AS THE KITCHEN SEES IT — A CONTRACT WITH POSTGRES. Plan task `10.9e-i`, on
// `0085` (the owner's rulings G4–G19 and G34 of 2026-11-16 and 17). Drawn by `10.9e-ii`: the setup
// on one screen with *Activar*, the card's screen and its tile on *Hoy*, *Sellar* with its code
// and its lines, *Escanear a tu cliente* and *Ana · 5 de 8 · 2 premios*, *Cerrar la tarjeta*.
//
// ⚠️ WHO DOES WHAT (G18): the terms and closing are the OWNER's (`42501` for a helper); reading the
// card, a phone's key, scanning a neighbour, a stamp and a reward are ANY MEMBER's.
// ⚠️ A SCAN IS ANSWERED, NOT REFUSED: a code that fits nothing, two phones at once, her own people,
// a card closed, a stamp already today — each is a `result`, so a miss the database counts is
// kept. A refusal is a wall or a wrong input (the codes below).
// ⚠️ WITH NO SIGNAL the phone works its code out alone (`@/lib/codigo`), and a stamp or a reward
// from a scan it cannot send goes from its queue with the scan's moment (`p_at`), checked then —
// up to 7 days back. ⚠️ ONE REWARD A SCAN: a minute of her code that gave a reward gives no second
// one (`ya_usado`) — for her next reward she shows the next minute's code. ⚠️ ALWAYS A POST: a code
// is never checked in a read-only call (`25006`), so PostgREST's GET is refused.
//
// The names below are read OUT OF THIS FILE by `docs/checks/10.9e-i-card-contract.sh`, which asks a
// real PostgREST with each; `test/tarjeta.test.ts` holds them to `0085`'s TEXT.
// ============================================================================

/** `0085`'s writes and reads for her kitchen's card. */
export const SET_CARD_TERMS = 'set_card_terms';
export const CLOSE_CARD = 'close_card';
export const KITCHEN_CARD = 'kitchen_card';
export const REGISTER_KITCHEN_KEY = 'register_kitchen_key';
export const CARD_OF_CODE = 'card_of_code';
export const GIVE_STAMP = 'give_stamp';
export const GIVE_REWARD = 'give_reward';

/** The terms' bounds (G7, G34): a reward of 1 to 60 characters, 4 to 12 stamps. */
export const PREMIO_MAX = 60;
export const SELLOS_MIN = 4;
export const SELLOS_MAX = 12;
/** When her stamps are erased if she does not come back (G15): 0 is *Nunca*. Nothing pre-chosen. */
export const DIAS_SIN_VENIR = [0, 15, 30, 45, 60] as const;
export type DiasSinVenir = (typeof DIAS_SIN_VENIR)[number];
/** How long a closed card is kept for those who started it (G12). */
export const DIAS_AL_CERRAR = 30;

/** What the database refuses, by its SQLSTATE. */
export const NO_ES_DUENA = '42501';
export const FUERA_DE_RANGO = '22023';
export const ES_TIENDA = 'TD013';
export const NO_SE_OFRECE = 'TD024';
export const NO_ES_SU_PREMIO = 'TD027';
export const DEMASIADOS_INTENTOS = 'TD028';
export const SOLO_LECTURA = '25006';

export interface TermsArgs {
  readonly p_workspace_id: string;
  readonly p_reward: string;
  readonly p_stamps: number;
  readonly p_expiry_days: DiasSinVenir;
}

export interface KitchenArgs {
  readonly p_workspace_id: string;
}

export interface CodeArgs {
  readonly p_workspace_id: string;
  readonly p_code: string;
  readonly p_key: string | null;
}

export interface StampArgs {
  readonly p_workspace_id: string;
  readonly p_code: string;
  readonly p_key: string | null;
  readonly p_at: string | null;
}

export interface RewardArgs {
  readonly p_workspace_id: string;
  readonly p_code: string;
  readonly p_reward_id: string;
  readonly p_key: string | null;
  readonly p_at: string | null;
}

export function termsArgs(kitchenId: string, reward: string, stamps: number, days: DiasSinVenir): TermsArgs {
  return { p_workspace_id: kitchenId, p_reward: reward, p_stamps: stamps, p_expiry_days: days };
}
export function kitchenArgs(kitchenId: string): KitchenArgs {
  return { p_workspace_id: kitchenId };
}
export function codeArgs(kitchenId: string, code: string, key: string | null): CodeArgs {
  return { p_workspace_id: kitchenId, p_code: code, p_key: key };
}
export function stampArgs(kitchenId: string, code: string, key: string | null, at: string | null): StampArgs {
  return { p_workspace_id: kitchenId, p_code: code, p_key: key, p_at: at };
}
export function rewardArgs(
  kitchenId: string,
  code: string,
  rewardId: string,
  key: string | null,
  at: string | null,
): RewardArgs {
  return { p_workspace_id: kitchenId, p_code: code, p_reward_id: rewardId, p_key: key, p_at: at };
}

// ---- the answers, as the database writes them ------------------------------------------------

/** `kitchen_card` — the card's screen, *Hoy*'s tile, *Sellar*'s lines. */
export interface KitchenCardRow {
  readonly terms: TermsRow | null;
  readonly open: boolean;
  readonly closed_at: string | null;
  readonly kept_until: string | null;
  readonly cards: number;
  readonly stamps_today: number;
  readonly rewards_to_give: number;
  readonly today: readonly TodayRow[];
}

export interface TermsRow {
  readonly reward: string;
  readonly stamps: number;
  readonly expiry_days: number | null;
  readonly since: string;
}

/** One of today's lines: a stamp (*sello 3 de 8*), the last one (*completó su tarjeta*), a reward given. */
export interface TodayRow {
  readonly at: string;
  readonly kind: 'sello' | 'gano' | 'cobro';
  readonly name: string | null;
  readonly stamps: number | null;
  readonly of: number | null;
  readonly reward: string | null;
  readonly via: 'entrega' | 'su_codigo' | 'codigo_cocina';
}

/** `register_kitchen_key` — this phone's key and secret, handed once. */
export interface KeyRow {
  readonly key: string;
  readonly secret: string;
}

/** A neighbour's card at this kitchen, as `card_of_code`, `give_stamp` and `give_reward` answer it. */
export interface CardRow {
  readonly result: Resultado;
  readonly name?: string | null;
  readonly claimed?: string;
  readonly stamps?: number;
  readonly of?: number | null;
  readonly reward?: string | null;
  readonly expiry_days?: number | null;
  readonly expires_on?: string | null;
  readonly stamped_today?: boolean;
  readonly rewards?: readonly RewardRow[];
  readonly open?: boolean;
  readonly kept_until?: string | null;
}

export interface RewardRow {
  readonly id: string;
  readonly reward: string;
  readonly won_at: string;
}

/** Every result a scan can answer (`0085`'s list). */
export const RESULTADOS = [
  'suya',
  'primer',
  'sello',
  'gano',
  'ya_hoy',
  'cobrado',
  'ya_cobrado',
  'ya_usado',
  'cerrada',
  'propia',
  'no_valido',
  'repite',
] as const;
export type Resultado = (typeof RESULTADOS)[number];

// ---- read, never trusted ---------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isText = (v: unknown): v is string => typeof v === 'string';

function termsFrom(v: unknown): TermsRow | null {
  if (!isObject(v)) return null;
  const { reward, stamps, expiry_days, since } = v;
  if (!isText(reward) || !isCount(stamps) || !isText(since)) return null;
  if (expiry_days !== null && !isCount(expiry_days)) return null;
  return { reward, stamps, expiry_days, since };
}

function rewardFrom(v: unknown): RewardRow | null {
  if (!isObject(v) || !isText(v.id) || !isText(v.reward) || !isText(v.won_at)) return null;
  return { id: v.id, reward: v.reward, won_at: v.won_at };
}

/** `kitchen_card`'s answer, or null when it is not one — a screen draws nothing for it, never zeros. */
export function kitchenCardFrom(data: unknown): KitchenCardRow | null {
  if (!isObject(data)) return null;
  const terms = data.terms === null ? null : termsFrom(data.terms);
  if (data.terms !== null && terms === null) return null;
  if (typeof data.open !== 'boolean') return null;
  if (!isCount(data.cards) || !isCount(data.stamps_today) || !isCount(data.rewards_to_give)) return null;
  if (!Array.isArray(data.today)) return null;
  const today: TodayRow[] = [];
  for (const line of data.today) {
    if (!isObject(line) || !isText(line.at)) return null;
    if (line.kind !== 'sello' && line.kind !== 'gano' && line.kind !== 'cobro') return null;
    if (line.via !== 'entrega' && line.via !== 'su_codigo' && line.via !== 'codigo_cocina') return null;
    today.push({
      at: line.at,
      kind: line.kind,
      name: isText(line.name) ? line.name : null,
      stamps: isCount(line.stamps) ? line.stamps : null,
      of: isCount(line.of) ? line.of : null,
      reward: isText(line.reward) ? line.reward : null,
      via: line.via,
    });
  }
  return {
    terms,
    open: data.open,
    closed_at: isText(data.closed_at) ? data.closed_at : null,
    kept_until: isText(data.kept_until) ? data.kept_until : null,
    cards: data.cards,
    stamps_today: data.stamps_today,
    rewards_to_give: data.rewards_to_give,
    today,
  };
}

/** `register_kitchen_key`'s answer, or null. */
export function keyFrom(data: unknown): KeyRow | null {
  if (!isObject(data) || !isText(data.key) || !isText(data.secret) || !/^[0-9a-f]{40}$/.test(data.secret)) return null;
  return { key: data.key, secret: data.secret };
}

/** A scan's answer, or null when it carries no result this app knows. */
export function cardFrom(data: unknown): CardRow | null {
  if (!isObject(data) || !(RESULTADOS as readonly unknown[]).includes(data.result)) return null;
  const rewards: RewardRow[] = [];
  if (data.rewards !== undefined) {
    if (!Array.isArray(data.rewards)) return null;
    for (const r of data.rewards) {
      const row = rewardFrom(r);
      if (row === null) return null;
      rewards.push(row);
    }
  }
  return {
    result: data.result as Resultado,
    name: isText(data.name) ? data.name : null,
    claimed: isText(data.claimed) ? data.claimed : undefined,
    stamps: isCount(data.stamps) ? data.stamps : undefined,
    of: isCount(data.of) ? data.of : null,
    reward: isText(data.reward) ? data.reward : null,
    expiry_days: isCount(data.expiry_days) ? data.expiry_days : null,
    expires_on: isText(data.expires_on) ? data.expires_on : null,
    stamped_today: typeof data.stamped_today === 'boolean' ? data.stamped_today : undefined,
    rewards,
    open: typeof data.open === 'boolean' ? data.open : undefined,
    kept_until: isText(data.kept_until) ? data.kept_until : null,
  };
}

/** The prefix her kitchen's card is cached under. */
export const TARJETA_KEY = ['cocina', 'tarjeta'] as const;

/** Cached under the login and the kitchen, Cocina's rule. */
export function tarjetaKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...TARJETA_KEY, userId ?? '', kitchenId ?? ''];
}

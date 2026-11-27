// ============================================================================
// HER LOYALTY CARDS — A CONTRACT WITH POSTGRES. Plan task `10.9e-i`, on `0085` (the owner's rulings
// G4–G17, G38 and G41 of 2026-11-16 and 17). Drawn by `10.9e-iii`: her card in the kitchen's colour
// and logo, its conditions before her first stamp, *Escanear* and *Mi código* at the top of *Mis
// cocinas*, *2 premios por cobrar* and she chooses which, *¿Cobrar tu premio ahora?*, the
// celebration, *Vence el … si no vienes*, her progress as a mark in *Cerca*.
//
// ⚠️ KEYED ON HER: every function reads and writes her own rows only (`auth.uid()`). A kitchen's
// terms before her first stamp (G12) come through THE ONE DOOR — `on_offer_now`'s `card`, declared in
// `@/api/cocinas` — never a function of their own (ADR-035 §2.7).
// ⚠️ A SCAN IS ANSWERED, NOT REFUSED: a code that fits nothing, two phones at once, her own kitchen,
// a card closed, a stamp already today — each is a `result`, so a miss the database counts is
// kept. A refusal is a wall or a wrong input (the codes below).
// ⚠️ HER CODE IS WORKED OUT ON HER PHONE (`@/lib/codigo`) from the secret `register_my_key` hands
// it once; the kitchen's code is checked the moment she sends it — her phone needs signal to scan.
// ⚠️ HER MARK IN *CERCA* (G38) is read from `my_cards` by kitchen id, on her phone: the door is not
// re-made for it.
//
// The names below are read OUT OF THIS FILE by `docs/checks/10.9e-i-card-contract.sh`, which asks a
// real PostgREST with each; `test/tarjeta.test.ts` holds them to `0085`'s TEXT.
// ============================================================================

/** `0085`'s four for her. */
export const REGISTER_MY_KEY = 'register_my_key';
export const MY_CARDS = 'my_cards';
export const STAMP_WITH_CODE = 'stamp_with_code';
export const CLAIM_WITH_CODE = 'claim_with_code';

/** What the database refuses, by its SQLSTATE. */
export const FUERA_DE_RANGO = '22023';
export const NO_SE_OFRECE = 'TD024';
export const NO_ES_TU_PREMIO = 'TD027';
export const DEMASIADOS_INTENTOS = 'TD028';
/** A code is never checked in a read-only call — PostgREST's GET — so every call here is a POST. */
export const SOLO_LECTURA = '25006';

export interface StampWithCodeArgs {
  readonly p_code: string;
  readonly p_workspace_id: string | null;
  readonly p_key: string | null;
}

export interface ClaimWithCodeArgs {
  readonly p_reward_id: string;
  readonly p_code: string;
  readonly p_key: string | null;
}

export function stampWithCodeArgs(code: string, kitchenId: string | null, key: string | null): StampWithCodeArgs {
  return { p_code: code, p_workspace_id: kitchenId, p_key: key };
}
export function claimWithCodeArgs(rewardId: string, code: string, key: string | null): ClaimWithCodeArgs {
  return { p_reward_id: rewardId, p_code: code, p_key: key };
}

// ---- the answers, as the database writes them ------------------------------------------------

/** `register_my_key` — this phone's key and secret, handed once. */
export interface KeyRow {
  readonly key: string;
  readonly secret: string;
}

/** Her card at a kitchen — the part every answer about a card carries. */
export interface CardStateRow {
  readonly stamps: number;
  readonly of: number | null;
  readonly reward: string | null;
  readonly expiry_days: number | null;
  /** `10.9m` (`0099`): HER card's condition — what it started on — else the one she would start on; `null` for none. */
  readonly conditions: string | null;
  readonly expires_on: string | null;
  readonly stamped_today: boolean;
  readonly rewards: readonly RewardRow[];
  readonly open: boolean;
  readonly kept_until: string | null;
}

export interface RewardRow {
  readonly id: string;
  readonly reward: string;
  readonly won_at: string;
}

/** One of `my_cards`' kitchens: who, in its colour and logo (G41), and her card there. */
export interface MyCardRow extends CardStateRow {
  readonly id: string;
  readonly name: string;
  readonly colonia: string | null;
  readonly page: { readonly color: string | null; readonly logo_path: string | null } | null;
}

/** A scan's answer: `stamp_with_code` and `claim_with_code`. */
export interface ScanRow {
  readonly result: Resultado;
  readonly kitchen: { readonly id: string; readonly name: string } | null;
  readonly claimed: string | null;
  readonly card: CardStateRow | null;
}

/** Every result her scan can answer (`0085`'s list). */
export const RESULTADOS = [
  'primer',
  'sello',
  'gano',
  'ya_hoy',
  'cobrado',
  'ya_cobrado',
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
const textOrNull = (v: unknown): string | null => (isText(v) ? v : null);
/** A condition as read: her words, else `null` — an empty or missing one (an answer from before `0099`) is none. */
const condicionDe = (v: unknown): string | null => (isText(v) && v.trim().length > 0 ? v : null);

function rewardFrom(v: unknown): RewardRow | null {
  if (!isObject(v) || !isText(v.id) || !isText(v.reward) || !isText(v.won_at)) return null;
  return { id: v.id, reward: v.reward, won_at: v.won_at };
}

/** Her card's part of an answer, or null when it is not one. */
export function cardStateFrom(v: unknown): CardStateRow | null {
  if (!isObject(v) || !isCount(v.stamps) || typeof v.stamped_today !== 'boolean' || typeof v.open !== 'boolean') {
    return null;
  }
  if (!Array.isArray(v.rewards)) return null;
  const rewards: RewardRow[] = [];
  for (const r of v.rewards) {
    const row = rewardFrom(r);
    if (row === null) return null;
    rewards.push(row);
  }
  return {
    stamps: v.stamps,
    of: isCount(v.of) ? v.of : null,
    reward: textOrNull(v.reward),
    expiry_days: isCount(v.expiry_days) ? v.expiry_days : null,
    conditions: condicionDe(v.conditions),
    expires_on: textOrNull(v.expires_on),
    stamped_today: v.stamped_today,
    rewards,
    open: v.open,
    kept_until: textOrNull(v.kept_until),
  };
}

/** `my_cards`' answer, or null — a screen draws nothing for it, never an empty list that is not one. */
export function myCardsFrom(data: unknown): MyCardRow[] | null {
  if (!Array.isArray(data)) return null;
  const out: MyCardRow[] = [];
  for (const k of data) {
    const card = cardStateFrom(k);
    if (card === null || !isObject(k) || !isText(k.id) || !isText(k.name)) return null;
    const page = isObject(k.page) ? { color: textOrNull(k.page.color), logo_path: textOrNull(k.page.logo_path) } : null;
    out.push({ ...card, id: k.id, name: k.name, colonia: textOrNull(k.colonia), page });
  }
  return out;
}

/** `register_my_key`'s answer, or null. */
export function keyFrom(data: unknown): KeyRow | null {
  if (!isObject(data) || !isText(data.key) || !isText(data.secret) || !/^[0-9a-f]{40}$/.test(data.secret)) return null;
  return { key: data.key, secret: data.secret };
}

/** A scan's answer, or null when it carries no result this app knows. */
export function scanFrom(data: unknown): ScanRow | null {
  if (!isObject(data) || !(RESULTADOS as readonly unknown[]).includes(data.result)) return null;
  const k = data.kitchen;
  return {
    result: data.result as Resultado,
    kitchen: isObject(k) && isText(k.id) && isText(k.name) ? { id: k.id, name: k.name } : null,
    claimed: textOrNull(data.claimed),
    card: cardStateFrom(data),
  };
}

/** Her progress at a kitchen as *Cerca*'s mark (G38): *5/8*, or null with no stamp going. */
export function marcaDe(card: CardStateRow | undefined): string | null {
  if (card === undefined || card.stamps === 0 || card.of === null) return null;
  return `${card.stamps}/${card.of}`;
}

/** The prefix her cards are cached under. */
export const TARJETAS_KEY = ['itacate', 'tarjetas'] as const;

/** Cached under the login. */
export function tarjetasKey(userId: string | null): readonly unknown[] {
  return [...TARJETAS_KEY, userId ?? ''];
}

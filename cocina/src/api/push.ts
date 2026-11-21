// ============================================================================
// HER PHONE'S MESSAGES FROM THE SERVER — A CONTRACT WITH POSTGRES. Plan task `10.5b-v-ii`, on
// `0092`'s five doors (call 14 of 2026-11-05; the tables as drawn by `10.5c-i`, ruled by the
// owner on 2026-11-20): this phone's token sent on each open and retired at *Cerrar sesión*,
// the kinds of message with her switch for each, and a tap counted with nobody kept.
//
// ⚠️ A KIND IS A ROW, NOT CODE: the database answers each kind's Android channel, the name her
// phone's settings show for it, its importance, the words of its switch and what a tap opens.
// The app makes its channels and draws its switches from that answer, so a new kind is a row the
// owner inserts, with no build. A kind this build cannot read is left out (`kindsFrom`).
// ⚠️ HER SWITCH IS HERS, NOT THE PHONE'S: one answer for every phone of hers — the sender reads
// it before every message.
// ⚠️ AN IPHONE HAS NO CHANNELS: it sends none, and the server does not ask it for one.
//
// The names below are read OUT OF THIS FILE by `docs/checks/10.5b-v-ii-push-contract.sh`, which
// asks a real PostgREST with each; `test/push.test.ts` holds them to `0092`'s TEXT.
// ============================================================================

/** `0092`: this phone's token for her, on each open and when it changes. */
export const REGISTER_PUSH_TOKEN = 'register_push_token';
/** `0092`: *Cerrar sesión* — this phone stops getting her messages. */
export const RETIRE_PUSH_TOKEN = 'retire_push_token';
/** `0092`: the kinds of this app, with her switch for each. */
export const MY_NOTIFICATION_KINDS = 'my_notification_kinds';
/** `0092`: her switch for one kind. Answers her kinds again. */
export const SET_NOTIFICATION_SWITCH = 'set_notification_switch';
/** `0092`: a tap on a message, plus one on today's count — nobody kept. */
export const COUNT_NOTIFICATION_TAP = 'count_notification_tap';

/** This app, as the database names it. */
export const APP = 'cocina';
/** The one kind this build knows by name: a new reservation or a cancellation. */
export const APARTADOS = 'apartados';

export type Plataforma = 'ios' | 'android';

export interface RegisterArgs {
  readonly p_app: string;
  readonly p_token: string;
  readonly p_platform: Plataforma;
  readonly p_allowed: boolean;
  readonly p_channels: readonly string[];
  readonly p_silenced: readonly string[];
  readonly p_replaces: string | null;
}

export interface RetireArgs {
  readonly p_app: string;
  readonly p_token: string;
}

export interface KindsArgs {
  readonly p_app: string;
}

export interface SwitchArgs {
  readonly p_kind: string;
  readonly p_on: boolean;
}

export interface TapArgs {
  readonly p_kind: string;
}

/** One kind as the database answers it — every key `my_notification_kinds` sends. */
export interface KindRow {
  readonly kind: string;
  readonly class: string;
  readonly channel: string;
  readonly channel_name: string;
  readonly importance: string;
  readonly label: string;
  readonly detail: string | null;
  readonly opens: string;
  readonly is_on: boolean;
}

export type Importancia = 'alta' | 'normal' | 'baja';

/** A kind as this app uses it. */
export interface Aviso {
  readonly kind: string;
  readonly canal: string;
  readonly nombreDelCanal: string;
  readonly importancia: Importancia;
  readonly titulo: string;
  readonly detalle: string | null;
  readonly abre: string;
  readonly encendido: boolean;
  /** A service kind — the only class she switches here (`0092` refuses the others). */
  readonly deServicio: boolean;
}

export function registerArgs(
  token: string,
  platform: Plataforma,
  allowed: boolean,
  channels: readonly string[],
  silenced: readonly string[],
  replaces: string | null,
): RegisterArgs {
  return {
    p_app: APP,
    p_token: token,
    p_platform: platform,
    p_allowed: allowed,
    p_channels: platform === 'ios' ? [] : channels,
    p_silenced: platform === 'ios' ? [] : silenced,
    p_replaces: replaces !== null && replaces !== token ? replaces : null,
  };
}

export function retireArgs(token: string): RetireArgs {
  return { p_app: APP, p_token: token };
}

export function kindsArgs(): KindsArgs {
  return { p_app: APP };
}

export function switchArgs(kind: string, on: boolean): SwitchArgs {
  return { p_kind: kind, p_on: on };
}

export function tapArgs(kind: string): TapArgs {
  return { p_kind: kind };
}

const IMPORTANCIAS: readonly Importancia[] = ['alta', 'normal', 'baja'];
const NOMBRE = /^[A-Za-z0-9_.-]{1,64}$/;

function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

/** One kind read, or `null` when this build cannot read it — then it is left out, never guessed. */
export function avisoFrom(row: unknown): Aviso | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Partial<Record<keyof KindRow, unknown>>;
  const kind = texto(r.kind);
  const canal = texto(r.channel);
  const nombreDelCanal = texto(r.channel_name);
  const titulo = texto(r.label);
  const abre = texto(r.opens);
  const clase = texto(r.class);
  if (kind === null || canal === null || !NOMBRE.test(canal) || nombreDelCanal === null || titulo === null) return null;
  if (abre === null || clase === null || typeof r.is_on !== 'boolean') return null;
  const importancia = IMPORTANCIAS.find((i) => i === r.importance) ?? 'normal';
  return {
    kind,
    canal,
    nombreDelCanal,
    importancia,
    titulo,
    detalle: texto(r.detail),
    abre,
    encendido: r.is_on,
    deServicio: clase === 'servicio',
  };
}

/** The answer read: the kinds this build can read, in the order sent. Not a list — an error. */
export function kindsFrom(data: unknown): readonly Aviso[] | null {
  if (!Array.isArray(data)) return null;
  return data.map(avisoFrom).filter((a): a is Aviso => a !== null);
}

/** The prefix her kinds are cached under. */
export const AVISOS_KEY = ['cocina', 'avisos'] as const;

/** Cached under the login — every phone of hers reads the same switch. */
export function avisosKey(userId: string | null): readonly unknown[] {
  return [...AVISOS_KEY, userId ?? ''];
}

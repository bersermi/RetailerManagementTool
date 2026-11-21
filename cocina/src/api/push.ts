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
// ⚠️ SINCE `10.5c-iii` ALSO `0093`'S THREE: her answer to *Novedades de Wera Cocina*, read and given on the
// sheet's words (a promotion kind is never switched: its `is_on` is her latest answer), and a campaign's tap
// reported with its send's number — Itacate's file says the same (`itacate/src/api/push.ts`).
//
// The names below are read OUT OF THIS FILE by `docs/checks/10.5b-v-ii-push-contract.sh` and
// `docs/checks/10.5c-iii-consent-contract.sh`, which ask a real PostgREST with each; `test/push.test.ts`
// holds them to `0092`'s and `0093`'s TEXT.
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
/** `0093`: her answers to *Novedades* in this app — each purpose's latest, or `null` never asked. */
export const MY_CONSENT = 'my_consent';
/** `0093`: her yes or no, on one version of words the analyst approved. Answers `my_consent`'s answer. */
export const SET_MY_CONSENT = 'set_my_consent';
/** `0093`: a tap on a campaign's message, with the send's number it carries. */
export const COUNT_CAMPAIGN_TAP = 'count_campaign_tap';

/** This app, as the database names it. */
export const APP = 'cocina';
/** The one kind this build knows by name: a new reservation or a cancellation. */
export const APARTADOS = 'apartados';

/**
 * ⚠️ THE VERSION OF THE SHEET'S WORDS THIS BUILD SHOWS — the key `set_my_consent` is given, and the one the
 * analyst's approval inserts (`docs/runbooks/campaigns.sql`, *on 1*, with the text exactly as `ES.novedades.hoja`
 * draws it — `test/push.test.ts` holds the two equal). Until that row exists the database refuses every answer
 * on it (22023): nobody can say yes before she approves.
 */
export const PALABRAS = 'cocina-hoja-1';

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

export interface ConsentArgs {
  readonly p_app: string;
}

export interface AnswerArgs {
  readonly p_words: string;
  readonly p_answer: boolean;
}

export interface CampaignTapArgs {
  readonly p_send: number;
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

/** `my_consent`'s answer — one key per purpose, each her latest answer or `null`. */
export interface ConsentRow {
  readonly promociones: AnswerRow | null;
  readonly medir_promociones: AnswerRow | null;
}

/** Her latest answer for one purpose: yes or no, on which words, when. */
export interface AnswerRow {
  readonly answer: boolean;
  readonly words: string;
  readonly at: string;
}

export type Importancia = 'alta' | 'normal' | 'baja';
/** `0092`'s three classes: follows her action, asked by her, needs her yes. */
export type Clase = 'servicio' | 'a_pedido' | 'promocion';

/** Her answer for one purpose, as this app reads it. */
export interface Respuesta {
  readonly si: boolean;
  readonly palabras: string;
  readonly en: Date;
}

/** Her answers to *Novedades*: receiving them, and counting what each did. `null`: never asked. */
export interface Consentimiento {
  readonly ofertas: Respuesta | null;
  readonly medir: Respuesta | null;
}

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
  /** A service kind — the class she switches here (`0092` refuses a promotion). */
  readonly deServicio: boolean;
  /** Its class — a promotion kind is drawn as *Novedades*, its switch her answer (`10.5c-iii`). */
  readonly clase: Clase;
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

export function consentArgs(): ConsentArgs {
  return { p_app: APP };
}

/** Her answer on the words this build shows. */
export function answerArgs(si: boolean): AnswerArgs {
  return { p_words: PALABRAS, p_answer: si };
}

export function campaignTapArgs(send: number): CampaignTapArgs {
  return { p_send: send };
}

const IMPORTANCIAS: readonly Importancia[] = ['alta', 'normal', 'baja'];
const CLASES: readonly Clase[] = ['servicio', 'a_pedido', 'promocion'];
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
  const clase = CLASES.find((c) => c === r.class);
  if (kind === null || canal === null || !NOMBRE.test(canal) || nombreDelCanal === null || titulo === null) return null;
  if (abre === null || clase === undefined || typeof r.is_on !== 'boolean') return null;
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
    clase,
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

function respuestaFrom(v: unknown): Respuesta | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'object') return undefined;
  const r = v as Partial<Record<keyof AnswerRow, unknown>>;
  const palabras = texto(r.words);
  const en = typeof r.at === 'string' ? new Date(r.at) : null;
  if (typeof r.answer !== 'boolean' || palabras === null || en === null || Number.isNaN(en.getTime())) return undefined;
  return { si: r.answer, palabras, en };
}

/** `my_consent`'s answer read, or `null` when this build cannot read it. */
export function consentFrom(data: unknown): Consentimiento | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const d = data as Partial<Record<keyof ConsentRow, unknown>>;
  const ofertas = respuestaFrom(d.promociones ?? null);
  const medir = respuestaFrom(d.medir_promociones ?? null);
  if (ofertas === undefined || medir === undefined) return null;
  return { ofertas, medir };
}

/** The prefix her answers to *Novedades* are cached under. */
export const CONSENTIMIENTO_KEY = ['cocina', 'consentimiento'] as const;

export function consentimientoKey(userId: string | null): readonly unknown[] {
  return [...CONSENTIMIENTO_KEY, userId ?? ''];
}

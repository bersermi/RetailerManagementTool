// ============================================================================
// A HELPER'S CODE, AND JOINING WITH IT, AS A CONTRACT WITH POSTGRES. Plan task `10.9b-iii` —
// the owner's ruling of 2026-11-18 (*"Agree with your recommendation."*): a code for ONE person,
// good for 24 HOURS, 16 characters typed in four groups of four (Wera's own invitation), no
// address asked, and she joins as a helper AT ONCE; G18: inviting is the owner's. Three claims,
// each a name the database answers (`0083`, and `0028`'s `redeem_invite`):
//
//   1. *INVITAR A ALGUIEN* — `invite_helper(p_workspace_id)`: the owner asks, the answer is
//      `{token, expires_at}`, and the token is shown once (only its hash is kept). Each ask is a
//      new code; an earlier one keeps its 24 hours.
//   2. *UNIRME A FONDA DOÑA MARI* — `kitchen_of_code(p_token)`: whoever holds a live code is told
//      the kitchen's name before she joins, `{kitchen_name}`.
//   3. JOINING — `redeem_invite(p_token)`, as it is (`0028`, last made by `0036`): holding the code
//      is the proof; it writes her `staff` membership with her name and the kitchen's place, and
//      answers `{workspace_id, workspace_name, role, …}`.
//   Their refusals are one family: `TD005` the code will never work (none, or someone else used
//   it), `TD003` it expired — both *ask for another*; `TD013` a shop, which never invites so.
//
// ⚠️ THE CODE IS WERA'S, COPIED (`app/src/api/redeem.ts`' `normalizeCredential`, `TOKEN_LENGTH`;
// `app/src/api/invites.ts`' `groupedToken`): `normalize_workspace_code` (`0027`) strips every
// grouping and maps Crockford's `I`/`L` → `1` and `O` → `0` inside the hash, so the grouping is a
// RENDERING and never a value — the normalised sixteen are what is sent. `test/invitar.test.ts`
// runs Wera's two functions beside these.
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE, AND NOTHING THAT TALKS (`@/api/kitchen`'s split):
// `docs/checks/10.9b-ii-team-contract.sh` reads every name below OUT OF THIS FILE and asks a real
// PostgREST — the owner asks, the helper reads the name and joins, as a real owner and a real helper.
// ============================================================================

import { apiErrorMessage } from '@/api/errors';
import { ES } from '@/strings';

// ----------------------------------------------------------------------------
// The code itself — Wera's
// ----------------------------------------------------------------------------

/** Sixteen characters of Crockford's alphabet: 80 bits (`0028`). */
export const CODE_LENGTH = 16;

/**
 * What she typed, as the database will read it — `normalize_workspace_code` on this side of the
 * wire (Wera's `normalizeCredential`): the grouping gone, upper case, `I`/`L` → `1`, `O` → `0`.
 * `U` survives and matches nothing, as in the database.
 */
export function normalizarCodigo(raw: string): string {
  return raw
    .replace(/[^0-9A-Za-z]/g, '')
    .toUpperCase()
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
}

/** The sixteen, in four groups of four a person reads aloud (Wera's `groupedToken`). Anything else untouched. */
export function codigoAgrupado(codigo: string): string {
  if (codigo.length !== CODE_LENGTH) return codigo;
  return `${codigo.slice(0, 4)} ${codigo.slice(4, 8)} ${codigo.slice(8, 12)} ${codigo.slice(12)}`;
}

/** Four groups of four, as `codigoAgrupado` draws them and *Compartir el código* sends them. */
const AGRUPADO = /(?:^|[^0-9A-Za-z])([0-9A-Za-z]{4})[ -]([0-9A-Za-z]{4})[ -]([0-9A-Za-z]{4})[ -]([0-9A-Za-z]{4})(?![0-9A-Za-z])/g;

/**
 * What the box shows as she types: normalised, cut at sixteen, grouped as far as it goes
 * (`ABCD EF`). ⚠️ A WHOLE MESSAGE PASTED — what *Compartir el código* sent her on WhatsApp — gives
 * its code: the LAST four groups of four in it (the kitchen's name comes before the code). ⚠️ A
 * RENDERING: what is sent is `normalizarCodigo`'s.
 */
export function codigoAlEscribir(raw: string): string {
  const grupos = raw.length > CODE_LENGTH + 3 ? [...raw.matchAll(AGRUPADO)] : [];
  const fuente = grupos.length > 0 ? grupos[grupos.length - 1].slice(1, 5).join('') : raw;
  const codigo = normalizarCodigo(fuente).slice(0, CODE_LENGTH);
  return (codigo.match(/.{1,4}/g) ?? []).join(' ');
}

/** The code she typed, once it is whole — else `null`, and nothing is asked. */
export function codigoCompleto(raw: string): string | null {
  const codigo = normalizarCodigo(raw);
  return codigo.length === CODE_LENGTH ? codigo : null;
}

// ----------------------------------------------------------------------------
// 1. *Invitar a alguien* — `invite_helper` (`0083`)
// ----------------------------------------------------------------------------

/** `0083`'s function: the owner of a kitchen asks for a helper's code. */
export const INVITE_HELPER = 'invite_helper';

/** Its argument, by the name PostgREST matches on. */
export interface InviteArgs {
  readonly p_workspace_id: string;
}

export function inviteArgs(kitchenId: string): InviteArgs {
  return { p_workspace_id: kitchenId };
}

/** Its answer, as PostgREST sends it — the contract check reads these keys. */
export interface InviteAnswer {
  readonly token: string;
  readonly expires_at: string;
}

/** A code made for her to hand over: the sixteen, and when it stops working. */
export interface Invitacion {
  readonly codigo: string;
  readonly vence: Date;
}

/** The answer, read — or `null` when it is not one (no code is drawn from a malformed answer). */
export function invitacionFrom(data: unknown): Invitacion | null {
  if (typeof data !== 'object' || data === null) return null;
  const { token, expires_at } = data as Partial<Record<keyof InviteAnswer, unknown>>;
  if (typeof token !== 'string' || typeof expires_at !== 'string') return null;
  const codigo = normalizarCodigo(token);
  const vence = new Date(expires_at);
  if (codigo.length !== CODE_LENGTH || Number.isNaN(vence.getTime())) return null;
  return { codigo, vence };
}

// ----------------------------------------------------------------------------
// 2. *Unirme a …* — `kitchen_of_code` (`0083`)
// ----------------------------------------------------------------------------

/** `0083`'s function: the name of the kitchen a live code would join. */
export const KITCHEN_OF_CODE = 'kitchen_of_code';

/** The argument both `kitchen_of_code` and `redeem_invite` take, by the name PostgREST matches on. */
export interface CodeArgs {
  readonly p_token: string;
}

export function codeArgs(codigo: string): CodeArgs {
  return { p_token: normalizarCodigo(codigo) };
}

/** Its answer, as PostgREST sends it. */
export interface KitchenOfCode {
  readonly kitchen_name: string;
}

/** The kitchen's name, or `null` when the answer carries none. */
export function nombreDeCocinaFrom(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const name = (data as Partial<Record<keyof KitchenOfCode, unknown>>).kitchen_name;
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : null;
}

/** The query key the name is cached under; the login and the code are appended (`codigoKey`). Not kept on the phone. */
export const CODIGO_KEY = ['cocina', 'codigo'] as const;

export function codigoKey(userId: string | null, codigo: string | null): readonly unknown[] {
  return [...CODIGO_KEY, userId ?? '', codigo ?? ''];
}

// ----------------------------------------------------------------------------
// 3. Joining — `redeem_invite` (`0028`, last made by `0036`)
// ----------------------------------------------------------------------------

/** Wera's door, as it is: holding the code is the proof. */
export const REDEEM_INVITE = 'redeem_invite';

/** What this app reads of its answer — the contract check reads these keys. */
export interface JoinAnswer {
  readonly workspace_id: string;
  readonly workspace_name: string;
  readonly role: string;
}

/** The kitchen she joined, read — or `null`. */
export function unidaFrom(data: unknown): { readonly kitchenId: string; readonly nombre: string } | null {
  if (typeof data !== 'object' || data === null) return null;
  const { workspace_id, workspace_name } = data as Partial<Record<keyof JoinAnswer, unknown>>;
  if (typeof workspace_id !== 'string' || workspace_id === '' || typeof workspace_name !== 'string') return null;
  return { kitchenId: workspace_id, nombre: workspace_name };
}

// ----------------------------------------------------------------------------
// The refusals, in words
// ----------------------------------------------------------------------------

/** `0036`'s, reused by `0083`: the code will never work — none, or someone else used it. */
export const CODE_DEAD = 'TD005';

/** `0021`'s, reused by `0028` and `0083`: the code expired, or a newer one replaced it. */
export const CODE_EXPIRED = 'TD003';

/** Why a code she typed does not join her, in words: ask for another, or the usual sentence. */
export function codigoErrorMessage(thrown: unknown): string {
  const code = codeOf(thrown);
  if (code === CODE_DEAD) return ES.unirme.noSirve;
  if (code === CODE_EXPIRED) return ES.unirme.vencio;
  return apiErrorMessage(thrown);
}

/** Whether the refusal is the database's last word on this code — so it is not asked again. */
export function esRechazoDelCodigo(thrown: unknown): boolean {
  const code = codeOf(thrown);
  return code === CODE_DEAD || code === CODE_EXPIRED || code === '22023';
}

/** The sentence that carries the code to WhatsApp (Wera's `inviteShareText`): it names the kitchen. */
export function compartirTexto(cocina: string, invitacion: Invitacion, hora: string): string {
  return ES.invitar.mensaje(cocina, codigoAgrupado(invitacion.codigo), hora);
}

function codeOf(thrown: unknown): unknown {
  return typeof thrown === 'object' && thrown !== null ? (thrown as { code?: unknown }).code : undefined;
}

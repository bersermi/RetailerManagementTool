// ============================================================================
// WHERE SHE IS — EVERY DECISION, PURE. Plan task `10.5-iv-a-i`.
//
// ⚠️ THE RULINGS THIS FILE KEEPS:
//   - on opening, the phone's last known location, then a fresh one; re-sorted as
//     she walks while the app is open; asked again on a pull or a return (2026-11-01,
//     question 6) — the asking is `@/lib/useUbicacion`'s;
//   - ⚠️ IT NEVER LEAVES THE PHONE (2026-11-04, night): nothing here is sent anywhere;
//   - declined, or an approximate location (Android 12's *Aproximada*, an iPhone's
//     *Ubicación exacta* off): her postal code, typed (2026-11-03) — the map joins it
//     in `10.5-iv-b`;
//   - outside Wera Cocina's search zone: *Itacate aún no llega a tu zona*
//     (2026-11-04, night);
//   - ⚠️ since `10.5-v-b`, a postal code at her pick, even with her location on
//     (2026-11-05, answer 5) — and while she searches from one, her phone is not asked.
// ⚠️ ONLY WHILE THE APP IS OPEN: `app.json` blocks background location on Android
// and carries no *always* sentence on an iPhone (`10.2a`); this file decides from
// what the foreground permission answered.
// ============================================================================

import type { Punto } from '@/api/cocinas';
import type { Respuesta } from '@/lib/google';
import { enLaZona } from '@/lib/zona';
import { ES } from '@/strings';

/** What the phone answered when asked for her location — `expo-location`'s fields, as plain data. */
export interface PermisoDeUbicacion {
  readonly granted: boolean;
  readonly ios?: { readonly accuracy?: string } | null;
  readonly android?: { readonly accuracy?: string } | null;
}

/**
 * What her answer allows. ⚠️ APPROXIMATE IS READ FROM THE PERMISSION, not guessed
 * from a fix: an iPhone says `reduced` when *Ubicación exacta* is off, Android 12
 * and later `coarse` when she chose *Aproximada*.
 */
export function permisoDe(respuesta: PermisoDeUbicacion): 'precisa' | 'aproximada' | 'negada' {
  if (!respuesta.granted) return 'negada';
  if (respuesta.ios?.accuracy === 'reduced' || respuesta.android?.accuracy === 'coarse') return 'aproximada';
  return 'precisa';
}

/** Where her phone says she is — `@/lib/useUbicacion` keeps it, this file reads it. */
export type DondeEstoy =
  | { readonly kind: 'buscando' }
  | { readonly kind: 'aqui'; readonly punto: Punto }
  | { readonly kind: 'sin-permiso' }
  | { readonly kind: 'aproximada' }
  | { readonly kind: 'sin-ubicacion' };

/** A postal code she typed and Google placed — in memory only, never kept. */
export interface Codigo {
  readonly cp: string;
  readonly punto: Punto;
}

/** Where the list is measured from, or why there is no list yet. */
export type Origen =
  | { readonly kind: 'buscando' }
  | { readonly kind: 'aqui'; readonly punto: Punto }
  | { readonly kind: 'codigo'; readonly cp: string; readonly punto: Punto }
  | { readonly kind: 'pide-codigo'; readonly porque: 'sin-permiso' | 'aproximada' | 'sin-ubicacion' }
  | { readonly kind: 'fuera' };

/**
 * ⚠️ HER PICK FIRST (`10.5-v-b`, the owner's answer 5 of 2026-11-05: *"We can let the
 * user pick the codigo postal or use her location"*): a postal code she picked is
 * where the list is measured from, even with her location on, until she picks *Mi
 * ubicación* again (`@/lib/DondeBuscarProvider`) — it reversed `10.5-iv-a-i`'s rule,
 * under which a precise location always won. Without a code: her location inside the
 * zone; outside it, *Itacate aún no llega a tu zona*; declined, approximate or not
 * found, the box.
 */
export function origenDe(donde: DondeEstoy, codigo: Codigo | null): Origen {
  if (codigo !== null) return { kind: 'codigo', cp: codigo.cp, punto: codigo.punto };
  if (donde.kind === 'aqui') return enLaZona(donde.punto) ? { kind: 'aqui', punto: donde.punto } : { kind: 'fuera' };
  if (donde.kind === 'buscando') return { kind: 'buscando' };
  return { kind: 'pide-codigo', porque: donde.kind };
}

/** The point the list is measured from, or `null` while there is none. */
export function puntoDeOrigen(origen: Origen): Punto | null {
  return origen.kind === 'aqui' || origen.kind === 'codigo' ? origen.punto : null;
}

/**
 * ⚠️ *USAR MI UBICACIÓN*, UNDER THE POSTAL CODE'S BOX — her way back to her location
 * (`10.5-iv-a-i`, found on the emulator: a request the phone answered *no* with no
 * dialog shown, its permission screen frozen, left her the postal code alone). The
 * permission is asked for on its own once only; this button asks again where the
 * phone still allows it — Android after one *no* — else opens the app's page in
 * Settings, where she can allow it; on her way back the whole question is asked
 * again. Not found at all (location off, no fix): it simply asks again.
 */
export function comoPedirla(
  porque: 'sin-permiso' | 'aproximada' | 'sin-ubicacion',
  puedePreguntar: boolean,
): 'preguntar' | 'ajustes' | 'otra-vez' {
  if (porque === 'sin-ubicacion') return 'otra-vez';
  if (porque === 'sin-permiso' && puedePreguntar) return 'preguntar';
  return 'ajustes';
}

/** Why the postal code is asked for — the line above its box. */
export function motivoDe(porque: 'sin-permiso' | 'aproximada' | 'sin-ubicacion'): string {
  if (porque === 'sin-permiso') return ES.cerca.sinPermiso;
  if (porque === 'aproximada') return ES.cerca.aproximada;
  return ES.cerca.sinUbicacion;
}

/** What she is told when Google could not place the code she typed. */
export function mensajeDelCodigo(respuesta: Exclude<Respuesta, { readonly kind: 'punto' }>): string {
  if (respuesta.kind === 'ninguna') return ES.cerca.codigo.ninguno;
  if (respuesta.kind === 'fuera') return ES.cerca.codigo.fuera;
  if (respuesta.kind === 'sin-senal') return ES.cerca.codigo.sinSenal;
  return ES.cerca.codigo.falla;
}

/**
 * How far she must move before the list is sorted again, in metres, and how often
 * her phone is asked at most while the app is open. ⚠️ A sort, not a request: her
 * location never leaves the phone, so walking costs nothing but the battery.
 */
export const CADA_METROS = 50;
export const CADA_MS = 30_000;

/** A last known location older than this is not used — a fresh one is asked for anyway. */
export const ULTIMA_VALE_MS = 10 * 60_000;

/** How long a fresh location is waited for before the list says it could not find her. */
export const ESPERA_MS = 15_000;

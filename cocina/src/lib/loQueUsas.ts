import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';

import { apiErrorMessage } from '@/api/errors';
import { NO_SE_OFRECE, SERVICIOS, type Estado, type LoQueUsa, type Servicio } from '@/api/servicios';
import { ES } from '@/strings';

// ============================================================================
// HER CHOICES — WHAT SHE IS OFFERED, WHAT EACH TAP SENDS, WHAT EACH ROW SAYS, PURE.
// Plan task `10.9a-ii`, on `10.9a-i`'s functions (`@/api/servicios`, `0081`). The owner's
// rulings of 2026-11-16 and 17 (the family-shell page, round 7; G32, G33, G44, G45):
//   - THE FIRST RUN'S THIRD STEP, *¿Qué más quieres usar?* — her need first and the feature
//     under it, nothing pre-checked; *Seguir* sends `on` for what she picked and `off` for the
//     rest she was shown, in ONE call (`eleccionesDe`); *Decidir después* sends nothing;
//   - *MI COCINA › LO QUE USAS* — each feature offered with its state (`filasDe`); off, a tap
//     opens what it is and *Activar*; *Tu menú · Próximamente* with *Me interesa* (`menuDe`);
//   - *CUÉNTANOS CÓMO NECESITAS TU MENÚ* at the foot of *Hoy* (`cuentanosEnHoy`).
//
// ⚠️⚠️ TWO GATES DECIDE WHAT SHE IS OFFERED, AND THIS FILE HOLDS THE SECOND. The first is
// Wera's switch for everyone (`available`, the database's). The second is THIS BUILD:
// `PANTALLA_DE` names the screen of each feature built into it, and a feature with none is
// offered nowhere (`elegibles`), even with its switch on — so a phone still on an older
// update never offers a feature whose screens it does not carry (each feature ships over
// the air, and a phone takes an update a launch late). EMPTY UNTIL THE CARD (`10.9e`):
// every feature's own row adds its screen here, and its setup to `PREPARAR` if it has one.
//
// ⚠️ THE FIRST RUN'S STEP COUNT IS THE BUILD'S (`pasos`): *Paso 1 de N* is drawn before her
// kitchen exists, and the database answers what is offered only to a kitchen's member. So
// the count is 3 when this build carries a feature to pick, else 2 — today 2 (the
// recommendation `10.9a-i` left this row, decision (i)). The day a feature is built and its
// switch is still off for everyone, the count says 3 and the third step goes straight on
// (`elegibles` empty): the row that builds a feature turns its switch on with it.
//
// ⚠️ PER KITCHEN, NEVER PER PHONE — her choices, *Me interesa* and whether she told us about
// the menu are the database's; only *Cuéntanos* closed with its ✕ is this phone's
// (`@/lib/puerta`), as *Tu página* closed is. `test/loQueUsas.test.ts` pins every rule.
// ============================================================================

/**
 * ⚠️ THE FEATURES BUILT INTO THIS BUILD, AND THE ONE SCREEN EACH OPENS — its tile on *Hoy* and
 * its row in *Lo que usas* (the shell's rule: a service never lives in two places). Empty
 * until `10.9e` (the card), `10.9f` (her numbers), `10.9g` (promotions). Never the menu,
 * which is *Próximamente* until its own session.
 */
export const PANTALLA_DE: Pantallas = {};

/** A feature's setup, opened by *Activar* before *Listo* — only the card has one (`10.9e`). */
export const PREPARAR: Pantallas = {};

/**
 * Each feature's picture — its row in *Lo que usas*, its *Activar*, *Cuéntanos*' line, and later its
 * tile (`10.9a-iii`). `test/loQueUsas.test.ts` holds each to the icon set's glyph map: a name not in
 * it is a blank square.
 */
export const ICONO_DE: Readonly<Record<Servicio, ComponentProps<typeof MaterialCommunityIcons>['name']>> = {
  tarjeta: 'stamper',
  promociones: 'creation',
  numeros: 'chart-bar',
  menu: 'book-open-variant',
};

/** A feature she can pick: every one but the menu, which is *Próximamente* until its own session. */
export type Elegible = Exclude<Servicio, 'menu'>;

/** A screen per feature built here. */
export type Pantallas = Readonly<Partial<Record<Elegible, Href>>>;

const esElegible = (s: Servicio): s is Elegible => s !== 'menu';

/** The features this build carries, in the fixed order. */
export function construidos(pantallas: Pantallas = PANTALLA_DE): Elegible[] {
  return SERVICIOS.filter(esElegible).filter((s) => pantallas[s] !== undefined);
}

/** What she may pick or turn on: offered by Wera now AND built here, in the fixed order. */
export function elegibles(loQueUsa: LoQueUsa, hechos: readonly Elegible[] = construidos()): Elegible[] {
  return loQueUsa.ofrecidos.filter(esElegible).filter((s) => hechos.includes(s));
}

/** How many steps the first run has — known before her kitchen exists, so from the build alone. */
export function pasos(hechos: readonly Elegible[] = construidos()): 2 | 3 {
  return hechos.length > 0 ? 3 : 2;
}

/** The first run's *Paso n de N*. */
export function pasoDe(n: number, hechos: readonly Elegible[] = construidos()): string {
  return ES.registro.paso(n, pasos(hechos));
}

/**
 * *Seguir*: `on` for each she picked, `off` for the rest she was shown — one call, so the
 * database never holds half her answer. A pick of something no longer shown is dropped.
 */
export function eleccionesDe(mostrados: readonly Elegible[], elegidos: ReadonlySet<Elegible>): Partial<Record<Servicio, Estado>> {
  const elecciones: Partial<Record<Servicio, Estado>> = {};
  for (const s of mostrados) elecciones[s] = elegidos.has(s) ? 'on' : 'off';
  return elecciones;
}

/** Whether the third step shows *Tu menú a la mano · Próximamente* — greyed, never picked. */
export function menuEnLaEleccion(loQueUsa: LoQueUsa): boolean {
  return loQueUsa.proximamente;
}

/** One row of *Lo que usas*: a feature offered, and whether she uses it. */
export interface FilaDeServicio {
  readonly servicio: Elegible;
  readonly usa: boolean;
  /** Its screen while she uses it; `null` opens *Activar*. */
  readonly abre: Href | null;
}

/** *Lo que usas*' features, in the fixed order. `interesada` reads as not used. */
export function filasDe(loQueUsa: LoQueUsa, pantallas: Pantallas = PANTALLA_DE): FilaDeServicio[] {
  return elegibles(loQueUsa, construidos(pantallas)).map((servicio) => {
    const usa = loQueUsa.elecciones[servicio]?.estado === 'on';
    return { servicio, usa, abre: usa ? (pantallas[servicio] ?? null) : null };
  });
}

/** *Tu menú · Próximamente* in *Lo que usas*: drawn while every *Próximamente* may show; *Anotado* once she said *Me interesa*. */
export function menuDe(loQueUsa: LoQueUsa): { readonly anotado: boolean } | null {
  if (!loQueUsa.proximamente) return null;
  return { anotado: loQueUsa.elecciones.menu?.estado === 'interesada' };
}

/** Whether *Lo que usas* has anything to draw. */
export function hayLoQueUsas(loQueUsa: LoQueUsa, pantallas: Pantallas = PANTALLA_DE): boolean {
  return filasDe(loQueUsa, pantallas).length > 0 || menuDe(loQueUsa) !== null;
}

/** What a row says under the feature's name: *En tu Hoy*, or *No la usas* in its gender. */
export function detalleDe(fila: FilaDeServicio): string {
  return fila.usa ? ES.loQueUsas.enTuHoy : ES.loQueUsas.noUsas[fila.servicio];
}

/**
 * *Cuéntanos cómo necesitas tu menú* at the foot of *Hoy*: while every *Próximamente* may show,
 * until her kitchen told us once (the database counts it) or she closed it on this phone.
 * Unread, it waits — never drawn and then taken away.
 */
export function cuentanosEnHoy(loQueUsa: LoQueUsa | undefined, cerrado: boolean): boolean {
  return loQueUsa !== undefined && loQueUsa.proximamente && loQueUsa.pedidosDeMenu === 0 && !cerrado;
}

/** What she typed under *Cuéntanos*, checked as the database checks it — `null` when it may go. */
export function revisarMenu(texto: string): string | null {
  return texto.trim().length === 0 ? ES.cuentanos.vacio : null;
}

/** A refused or failed choice, in words: `TD024`, the feature switched off meanwhile, said so. */
export function servicioErrorMessage(thrown: unknown): string {
  const code = typeof thrown === 'object' && thrown !== null ? (thrown as { code?: unknown }).code : undefined;
  return code === NO_SE_OFRECE ? ES.loQueUsas.noDisponible : apiErrorMessage(thrown);
}

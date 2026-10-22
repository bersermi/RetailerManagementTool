// ============================================================================
// *CONOCE WERA* — WHICH CARDS, AND WHETHER THE STORY OPENS BY ITSELF. Plan task
// `8g`, the owner's ruling of 2026-10-21: *"Go with A and D1, your
// recommendations"* — a story like *Tu semana*, real screens, the Vender card
// moving — over the proposal page (https://claude.ai/artifact/S9ZbpNCmPvPEnpU7E7vgzA).
//
// The route (`src/app/recorrido.tsx`) draws; this file decides, so a suite can
// hold the two rules a phone cannot be asked about:
//
// ⚠️ WHO GETS WHICH STORY. An owner and an Encargado get eight cards: deliveries,
// costs and *Te lo compro* are theirs. An Empleado gets four — selling, no
// signal, correcting her own sales, Merma — because a card promising what she
// cannot open is the app talking past her. A role not yet read is the short one.
//
// ⚠️⚠️ WHEN IT OPENS BY ITSELF — ONCE ON EVERY PHONE. The owner's ruling of
// 2026-10-22, after his first user: *"Make the Recorrido display regardless if
// the device had already downloaded the app before."* Until then it opened by
// itself only for a shop in its first three days of selling, and a phone that
// had Wera before the update got the card on Inicio instead. Now any phone that
// has not seen it gets it, once, on the next Vender or Inicio — after an
// arrival's line has been read — and never over a basket she is ringing up:
// then it waits for the next time the screen comes up. The card on Inicio stays
// for a phone where it was closed before it opened, and Ajustes keeps it.
// ============================================================================

import type { Role } from '@/api/members';

/** One card of the story, in the order a person meets it. */
export type Tarjeta =
  | 'hola'
  | 'vender'
  | 'comprar'
  | 'productos'
  | 'merma'
  | 'numeros'
  | 'descubre'
  | 'listo'
  | 'venderEmpleado'
  | 'sinSenal'
  | 'corrige'
  | 'mermaEmpleado';

/** The owner's and the Encargado's story. */
export const RECORRIDO_DUENO: readonly Tarjeta[] = [
  'hola',
  'vender',
  'comprar',
  'productos',
  'merma',
  'numeros',
  'descubre',
  'listo',
];

/** The Empleado's. Its last card is its Merma card, which says *a vender*. */
export const RECORRIDO_EMPLEADO: readonly Tarjeta[] = ['venderEmpleado', 'sinSenal', 'corrige', 'mermaEmpleado'];

/**
 * HOW LONG A CARD STAYS — ⚠️ THE OWNER'S CORRECTION OF 2026-10-22: six and a
 * half seconds a card was *"too little to understand what the screen is about
 * and read"*. So a card now stays as long as its own words take to read slowly
 * — about two and a half words a second, for the customers C3.18 says are
 * often older — plus time to look at the real screen under them, between a
 * floor and a ceiling. A tap still moves on at once, and a held finger holds it.
 */
export const START_MS = 2_000;
export const MS_PER_WORD = 380;
export const PICTURE_MS = 4_000;
export const MIN_CARD_MS = 8_000;
export const MAX_CARD_MS = 20_000;

/** The words in a card's text, as a reader meets them. */
export function palabras(text: string): number {
  return text.split(/\s+/).filter((word) => word !== '').length;
}

/** How long this card stays: its words read slowly, then a look at its screen. */
export function cardMs(text: string, withPicture: boolean): number {
  const ms = START_MS + palabras(text) * MS_PER_WORD + (withPicture ? PICTURE_MS : 0);
  return Math.min(MAX_CARD_MS, Math.max(MIN_CARD_MS, ms));
}

/** The story for her role in this shop. */
export function recorridoDe(role: Role | null): readonly Tarjeta[] {
  return role === 'owner' || role === 'manager' ? RECORRIDO_DUENO : RECORRIDO_EMPLEADO;
}

/** What `abrePorSiSolo` is asked. */
export interface Momento {
  /** This phone has opened the story, or closed its card on Inicio. */
  readonly seen: boolean;
  /** Vender's basket has lines: she is in the middle of a sale. */
  readonly selling: boolean;
}

/** Does the story open by itself now? Once on every phone, never over a sale. */
export function abrePorSiSolo(m: Momento): boolean {
  return !m.seen && !m.selling;
}

/** The card a story closes on is never left by itself: it holds the way out. */
export function esUltima(cards: readonly Tarjeta[], index: number): boolean {
  return index >= cards.length - 1;
}

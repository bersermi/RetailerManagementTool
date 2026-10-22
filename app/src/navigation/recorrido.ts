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
// ⚠️⚠️ WHEN IT OPENS BY ITSELF — ONCE PER PHONE, AND ONLY IN THE FIRST DAYS.
// An update reaches a phone in the background and shows from the NEXT open, so a
// tester who installs after it is published creates her shop on the build's
// own version and never meets an "after the shop is created" moment. Hence two
// doors, either enough: she has just arrived (opened her shop, or been let into
// one) on this version; or the shop is in its first `NEW_SHOP_DAYS` days of
// selling, counted as Números' *Llevas N días con Wera* counts them, from the
// first sale (`shopAge`). A shop with no sales yet is new. A shop whose sales
// have not been read says nothing yet: the decision waits, rather than opening
// a tutorial over someone who has sold for months because her history was slow.
// Everyone else gets the card on Inicio, and Ajustes keeps it.
// ============================================================================

import type { Role } from '@/api/members';
import type { SalesState } from '@/api/sales';

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

/** How many days of selling a shop is "new" for: three, the owner's ruling. */
export const NEW_SHOP_DAYS = 3;

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
  /** She has just opened her shop or been let into one, on this version. */
  readonly arrived: boolean;
  /** Whether the shop's sales have been read, and found. */
  readonly salesState: SalesState;
  /** Days since the first sale, the first counted as 1 — `shopAge`. */
  readonly shopAge: number | null;
}

/** Does the story open by itself now? */
export function abrePorSiSolo(m: Momento): boolean {
  if (m.seen) return false;
  if (m.arrived) return true;
  if (m.salesState === 'nothing') return true;
  if (m.salesState !== 'sales' || m.shopAge === null) return false;
  return m.shopAge <= NEW_SHOP_DAYS;
}

/** The card a story closes on is never left by itself: it holds the way out. */
export function esUltima(cards: readonly Tarjeta[], index: number): boolean {
  return index >= cards.length - 1;
}

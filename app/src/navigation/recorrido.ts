// ============================================================================
// *CONOCE WERA* — WHICH CARDS, AND WHETHER THE STORY OPENS BY ITSELF. Plan task
// `8g`, the owner's ruling of 2026-10-21: *"Go with A and D1, your
// recommendations"* — a story like *Tu semana*, real screens, the Vender card
// moving — over the proposal page (https://claude.ai/artifact/S9ZbpNCmPvPEnpU7E7vgzA).
//
// The route (`src/app/recorrido.tsx`) draws; this file decides, so a suite can
// hold the two rules a phone cannot be asked about:
//
// ⚠️ WHO GETS WHICH STORY. An owner and an Encargado get eight cards: costs,
// prices and *Te lo compro* are theirs. An Empleado gets five — selling, the
// deliveries she records, no signal, correcting her own sales, Merma — because
// a card promising what she cannot open is the app talking past her. A role not
// yet read is the short one. ⚠️ HER COMPRAR CARD (`5R-o`, the owner's yes of
// 2026-11-18) HAS NO PICTURE: the owner's shows a product's costs, a room closed
// to her (`CERRADAS_AL_EMPLEADO`), and no picture of Comprar itself was taken.
// It sits second, as the owner's does, so no two cards in a row share a ground.
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
//
// ⚠️⚠️ ONCE PER STORY, NOT PER PHONE — `5R-n`, the owner's ruling of 2026-11-17.
// A tester joined his shop as *Empleado*, saw her four cards, and that phone
// would never have opened the owner's eight on his own store. Now each story is
// remembered by itself (`RECORRIDO_KEYS`, `@/offline/ensenar`): a phone that saw
// the Empleado's opens the owner's the first time it is an owner or Encargado,
// and the other way round; a story seen stays seen. ⚠️ THE ONE MARK OF BEFORE
// (`RECORRIDO_KEY`) said only *a story*, never which: it becomes the story of the
// first role this phone is read as after the update (`vioSuHistoria`) — on every
// phone that opened it so far that is the role it had then. ⚠️ A ROLE NOT YET READ
// OPENS NOTHING and adopts nothing: which story is hers is not known yet.
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
  | 'comprarEmpleado'
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
export const RECORRIDO_EMPLEADO: readonly Tarjeta[] = [
  'venderEmpleado',
  'comprarEmpleado',
  'sinSenal',
  'corrige',
  'mermaEmpleado',
];

/** The cards with no real screen under their words. */
export const SIN_PANTALLA: readonly Tarjeta[] = ['hola', 'listo', 'comprarEmpleado'];

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

/** ⚠️ `5R-n`: the two stories, each remembered by itself. */
export type Historia = 'dueno' | 'empleado';

/** Her story: the owner's and the Encargado's eight, or the Empleado's four. */
export function historiaDe(role: Role | null): Historia {
  return role === 'owner' || role === 'manager' ? 'dueno' : 'empleado';
}

/** The story for her role in this shop. */
export function recorridoDe(role: Role | null): readonly Tarjeta[] {
  return historiaDe(role) === 'dueno' ? RECORRIDO_DUENO : RECORRIDO_EMPLEADO;
}

/** What this phone remembers: each story's own mark, and the one mark of before `5R-n`. */
export interface Recuerdo {
  readonly dueno: boolean;
  readonly empleado: boolean;
  /** `RECORRIDO_KEY`: a story was opened, or its card closed — never which. */
  readonly antes: boolean;
}

/**
 * Has this phone seen her story — and does the mark of before become that
 * story's now (`adopta`, written by the caller)? ⚠️ THE OLD MARK BELONGS TO ONE
 * STORY ONLY: once either story has a mark of its own, it counts for nothing.
 */
export function vioSuHistoria(historia: Historia, r: Recuerdo): { readonly vista: boolean; readonly adopta: boolean } {
  if (r[historia]) return { vista: true, adopta: false };
  const otra: Historia = historia === 'dueno' ? 'empleado' : 'dueno';
  if (r.antes && !r[otra]) return { vista: true, adopta: true };
  return { vista: false, adopta: false };
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

// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT A FINGER DID ON A CARD — `5R-t`, the owner's report of 2026-11-23:
// *"The timer for each slide is behaving strange, it is not switching and
// reseting well after a user moves from one slide to the other. Also, we should
// allow the user to move by swiping the slides, not just by tapping."*
//
// ⚠️ THE CAUSE, MEASURED IN REACT NATIVE'S OWN `Pressability`: the card was a
// `Pressable` that paused on `onPressIn`, resumed on `onPressOut` and moved on
// `onPress`. A press shorter than its `minPressDuration` (130 ms — every quick
// tap) fires `onPress` FIRST and `onPressOut` 130 ms later, so the tap moved to
// the next card and then resumed THAT card's bar from where the old one had been
// paused: a new card half full, ending early or late. A slower tap fired them the
// other way round and worked — which is why it looked random.
//
// ⚠️ SO ONE HANDLER DECIDES, ONCE, WHEN THE FINGER LIFTS: this function. A swipe
// moves a card (left: the next one; right: the one before); a quick tap moves as
// it always did (the left third back, the rest on); anything else — a finger
// held, a swipe given up halfway — leaves the card where it was and its bar runs
// on from where it stopped. A card that is moved to always starts from zero.
// ----------------------------------------------------------------------------

/** How far a finger may wander and still be a tap — in points, not a size anyone looks at. */
export const TAP_SLOP = 10;
/** A finger down longer than this was holding the card, not tapping it. */
export const HOLD_MS = 350;
/** A swipe moves a card once it has travelled this share of the card's width… */
export const SWIPE_SHARE = 0.18;
/** …or flicked faster than this (points per millisecond), past `FLING_MIN` points. */
export const FLING_SPEED = 0.35;
export const FLING_MIN = 24;

/** What a finger lifted from a card meant. */
export type Gesto = 'adelante' | 'atras' | 'sigue';

/** One touch, from the finger going down to it lifting. */
export interface Dedo {
  /** Travel since it went down, in points: `dx` negative is a swipe to the left. */
  readonly dx: number;
  readonly dy: number;
  /** Horizontal speed when it lifted, in points per millisecond. */
  readonly vx: number;
  /** How long it was down. */
  readonly ms: number;
  /** Where it went down, across the screen — a tap's third is the screen's. */
  readonly x: number;
  /** The screen's width. */
  readonly width: number;
}

/** A swipe, a tap or a hold — decided once, as the finger lifts. */
export function gestoDe(d: Dedo): Gesto {
  const across = Math.abs(d.dx);
  const down = Math.abs(d.dy);
  if (across > down) {
    const far = across >= d.width * SWIPE_SHARE;
    const flung = Math.abs(d.vx) >= FLING_SPEED && across >= FLING_MIN;
    if (far || flung) return d.dx < 0 ? 'adelante' : 'atras';
  }
  if (across <= TAP_SLOP && down <= TAP_SLOP && d.ms < HOLD_MS) {
    return d.x < d.width / 3 ? 'atras' : 'adelante';
  }
  return 'sigue';
}

/**
 * The card a gesture moves to — or `null`: it stays where it is and its bar runs
 * on. ⚠️ Nothing before the first card, and nothing after the last: the last one
 * holds the way out (`esUltima`), so a swipe past it does not close the story.
 */
export function destino(index: number, count: number, gesto: Gesto): number | null {
  if (gesto === 'sigue') return null;
  const next = gesto === 'adelante' ? index + 1 : index - 1;
  if (next < 0 || next > count - 1) return null;
  return next;
}

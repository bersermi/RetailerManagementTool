// ============================================================================
// TEACHING IT ONCE. Plan task `8g`, the offline report's *"Teaching it, quietly"*
// (ruled 2026-10-20 by the owner: *"Do all the fixes"*) — and his words before
// it: *"We will want the users to understand this during the onboarding in a
// subtle way."*
//
// ⚠️ NO TUTORIAL, TWO MOMENTS, EACH ONCE ON THIS PHONE: the first sale, where a
// line under *Vendido* says that Wera works without internet, and the first time
// the signal drops, where the notice says a little more. A third — *Te lo
// compro* and *Agregar del catálogo* saying they need a signal at their doors —
// is not a hint at all: it is what those doors say every time.
//
// ⚠️ PER PHONE AND NOT PER PERSON, on purpose: it is in the device store beside
// the session, a sign-out does not reset it, and a second cashier on the same
// phone was standing beside the first.
// ============================================================================

import type { Role } from '@/api/members';
import { readKey, writeKey, type DeviceStore } from '@/lib/store';
import { historiaDe, vioSuHistoria, type Historia } from '@/navigation/recorrido';

/** The first sale's line has been shown on this phone. */
export const FIRST_SALE_KEY = 'wera.taught.first-sale';

/** The first outage's longer notice has been shown on this phone. */
export const FIRST_OUTAGE_KEY = 'wera.taught.first-outage';

/** `8g`, 2026-10-21: the opening — the cow turning into the logo — has played on this phone. */
export const OPENING_KEY = 'wera.taught.opening';
/**
 * `8g`, 2026-10-21: *Conoce Wera*, the tutorial, has been opened — or its card
 * on Inicio closed — on this phone. ⚠️ A TUTORIAL AFTER ALL, AT HIS ASK OF THE
 * SAME DAY, and it does not reverse the line above this file's header: working
 * without signal is still taught at its two moments, and the story only names it.
 */
export const RECORRIDO_KEY = 'wera.taught.recorrido';

/**
 * ⚠️ `5R-n`, 2026-11-17: EACH STORY'S OWN MARK — *Conoce Wera* once per story,
 * not per phone (`@/navigation/recorrido`). `RECORRIDO_KEY` above is the mark of
 * before, which said only that a story was seen; it is read, never written again.
 */
export const RECORRIDO_KEYS: Readonly<Record<Historia, string>> = {
  dueno: 'wera.taught.recorrido.dueno',
  empleado: 'wera.taught.recorrido.empleado',
};

/**
 * Has this phone seen the story of her role? `null` while her role is not read —
 * then nothing opens and nothing is adopted. ⚠️ IT WRITES WHEN THE OLD MARK
 * BECOMES THIS STORY'S (`vioSuHistoria`), so the other story never inherits it.
 */
export function historiaVista(store: DeviceStore | undefined, role: Role | null): boolean | null {
  if (role === null) return null;
  const historia = historiaDe(role);
  const { vista, adopta } = vioSuHistoria(historia, {
    dueno: readKey(store, RECORRIDO_KEYS.dueno) !== null,
    empleado: readKey(store, RECORRIDO_KEYS.empleado) !== null,
    antes: readKey(store, RECORRIDO_KEY) !== null,
  });
  if (adopta) writeKey(store, RECORRIDO_KEYS[historia], '1');
  return vista;
}

/** Her story has been opened, or its card on Inicio closed. */
export function marcarHistoria(store: DeviceStore | undefined, role: Role | null): void {
  writeKey(store, RECORRIDO_KEYS[historiaDe(role)], '1');
}

/**
 * Is this the first time — and if so, it no longer will be.
 *
 * ⚠️ IT WRITES AS IT ANSWERS, so two callers in one moment cannot both teach.
 * ⚠️ NO STORE (node, a web build's first frames) IS NEVER THE FIRST TIME: a
 * hint shown on every launch because nothing could remember it is a nag.
 */
export function firstTime(store: DeviceStore | undefined, key: string): boolean {
  if (store === undefined) return false;
  if (readKey(store, key) !== null) return false;
  writeKey(store, key, '1');
  return readKey(store, key) !== null;
}

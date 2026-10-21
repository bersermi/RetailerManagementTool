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

import { readKey, writeKey, type DeviceStore } from '@/lib/store';

/** The first sale's line has been shown on this phone. */
export const FIRST_SALE_KEY = 'wera.taught.first-sale';

/** The first outage's longer notice has been shown on this phone. */
export const FIRST_OUTAGE_KEY = 'wera.taught.first-outage';

/** `8g`, 2026-10-21: the opening — the cow turning into the logo — has played on this phone. */
export const OPENING_KEY = 'wera.taught.opening';

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

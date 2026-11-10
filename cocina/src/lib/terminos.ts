// ============================================================================
// THE TERMS, ACCEPTED ONCE BEFORE HER FIRST THUMB. Plan task `10.5b-iv-a`, the owner's
// final design of 2026-11-10 (*"the terms accepted once before her first thumb"*): a thumb
// about a person, seen by other kitchens, is user content for Google, and the fonda
// accepts the terms before she gives one. Itacate's neighbour accepts them with her
// express yes (`10.5b-iii-b`).
//
// ⚠️ KEPT ON THIS PHONE, PER LOGIN — the option that needs no migration, built while the
// owner rules where it is kept (the plan's decisions block): a second phone asks again, and
// nothing on the server records when she said yes. A record of its own is a migration
// (`10.5b-vi`'s, before Wera Cocina reaches anyone but him). Pure, so the suite reads it.
// ============================================================================

import { readKey, writeKey, type DeviceStore } from '@/lib/store';

/** The key her yes is kept under on this phone — one per login, so the next person on it is asked. */
export function terminosKey(userId: string): string {
  return `cocina.terminos.${userId}`;
}

/** Whether she accepted the terms on this phone. A phone that cannot read says no: she is asked again. */
export function aceptoTerminos(store: DeviceStore | undefined, userId: string | null): boolean {
  if (userId === null) return false;
  return readKey(store, terminosKey(userId)) !== null;
}

/** Her yes, with its moment. A phone that cannot write asks her again next time — never a screen that fails. */
export function aceptarTerminos(store: DeviceStore | undefined, userId: string, now: Date): void {
  writeKey(store, terminosKey(userId), now.toISOString());
}

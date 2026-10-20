// ============================================================================
// WHAT A READ THAT NEEDS THE SERVER SAYS WHEN THERE IS NO SIGNAL. Plan task
// `8g`, the offline report's round 3 (ruled 2026-10-20: *"Do all the fixes"*).
//
// ⚠️⚠️ ONE RULE FOR EVERY SCREEN, so a card in Números and a page in Precios
// cannot answer the same situation two ways. Measured on the Android emulator
// that day: offline, Números spun and then said *Sin dato*, Inicio said
// *Todavía no hay ventas* in a shop that had them, and the discoveries said
// *Se abren pronto* in a shop that had opened them. A read that has NOTHING to
// show and is waiting for a signal says `ES.offline.whenSignal` instead — and a
// read that has something (the last good copy) shows it, whatever its last
// attempt said.
//
// ⚠️ PURE, so `app/test/offline-senal.test.ts` reads it; the signal itself is
// `useOnline()`.
// ============================================================================

import type { Online } from '@/api/connectivity';

/**
 * Is this read waiting for a signal it does not have?
 *
 * ⚠️ `known` IS WHETHER THERE IS ANYTHING TO DRAW — data in hand, from this
 * session or the phone's copy. With something to draw the answer is always
 * `false`: the last good copy beats the sentence. And `null` (nothing has read
 * the network yet) is never offline.
 */
export function waitsForSignal(online: Online, known: boolean): boolean {
  return online === false && !known;
}

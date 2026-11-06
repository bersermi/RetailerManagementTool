// ============================================================================
// HOW WERA COCINA MOVES — THE NUMBERS, PURE. Plan task `10.5-v-c-i`, the owner's
// ruling of 2026-11-05 (the family-shell page's *Motion*): one staggered entrance per
// screen, as Itacate's (`itacate/src/theme/movimiento.ts`, `10.5-v-b`) — and the
// toast that carries *Deshacer*, which rises from the foot and leaves on its own.
//
// ⚠️ ADR-035 §2.11's MOTION ROW: `transform` and `opacity` only — they run on the
// compositor, which two low-end Androids can afford; layout, colour, shadow and blur do
// not. `test/pestanas.test.ts` reads every animated style in `src/` and refuses any
// other key. The drawing is `@/ui/Llega` (the entrance) and `@/ui/Nota` (the toast),
// on Reanimated — in this app's first build since `10.2a`, imported for the first time
// here. NO CHECK CAN SEE A FRAME MOVE (§2.11): the phone is the instrument.
// ============================================================================

/**
 * *Arrive* — a screen's blocks fade in and rise 8 px, 40 ms apart, on its first frame.
 * Itacate's numbers, the same family. ⚠️ ONLY THE FIRST FEW MOVE: a block past `ultimo`
 * is below the fold on any phone, so it is simply there.
 */
export const LLEGADA = {
  /** How far each block rises, in points. */
  distancia: 8,
  /** How long each block takes, in milliseconds. */
  duracion: 240,
  /** The gap between one block and the next, in milliseconds. */
  entreUno: 40,
  /** The last position that arrives; every block after it is drawn still. */
  ultimo: 6,
} as const;

/** How long block `i` of a screen waits before it arrives — `null` for a block drawn still. */
export function retrasoDe(i: number): number | null {
  const posicion = Math.max(0, Math.floor(i));
  return posicion > LLEGADA.ultimo ? null : posicion * LLEGADA.entreUno;
}

/**
 * The toast — *Publicaste …* with *Deshacer* (the family-shell page's `toast`): it rises
 * 12 px as it fades in, and fades out where it is. ⚠️ HOW LONG IT STAYS IS THE ROW'S,
 * NOT THE MOTION'S: *Deshacer* for 8 seconds after publishing or *Repetir* (the owner's
 * ruling of 2026-11-05, call 19), and a toast with nothing to undo leaves sooner.
 */
export const NOTA = {
  /** How far it rises as it arrives, in points. */
  distancia: 12,
  /** Its fade in and its fade out, in milliseconds. */
  duracion: 200,
  /** How long *Deshacer* can be pressed — the ruling's 8 seconds. */
  conDeshacer: 8_000,
  /** How long a toast with nothing to undo stays. */
  solo: 4_000,
} as const;

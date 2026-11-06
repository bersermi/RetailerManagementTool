// ============================================================================
// HOW ITACATE MOVES — THE NUMBERS, PURE. Plan task `10.5-v-b`, the owner's ruling of
// 2026-11-05 (the family-shell page's *Motion*): one staggered entrance per screen,
// and a sheet that slides up with a slight spring.
//
// ⚠️ ADR-035 §2.11's MOTION ROW: `transform` and `opacity` only — they run on the
// compositor, which two low-end Androids can afford; layout, colour, shadow and blur do
// not. `test/pestanas.test.ts` reads every animated style in `src/` and refuses any
// other key. The drawing is `@/ui/Llega` (the entrance) and `@/ui/Hoja` (the sheet), on
// Reanimated — in this app's first build since `10.2a`, imported for the first time
// here. NO CHECK CAN SEE A FRAME MOVE (§2.11): the phone is the instrument.
// ============================================================================

/**
 * *Arrive* — a screen's blocks fade in and rise 8 px, 40 ms apart, on its first frame.
 * ⚠️ ONLY THE FIRST FEW MOVE: a block past `ultimo` is below the fold on any phone (a
 * card is taller than a sixth of a screen), and a list mounts its far cards as she
 * scrolls — animated, they would arrive one by one under her thumb, the scattered
 * movement §2.11 refuses. So they are simply there.
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
 * *Sheet* — it slides up from below with a slight spring, over a veil that fades in.
 * ⚠️ "Slight" is a damping ratio a little under 1: it overshoots by a few points and
 * settles, never bounces twice (`razonDeAmortiguamiento`).
 */
export const HOJA = {
  /** The veil's fade, in milliseconds. */
  velo: 200,
  /** How dark the veil gets over the screen. */
  veloOpacidad: 0.42,
  /** Reanimated's spring for the sheet's rise. */
  resorte: { damping: 24, stiffness: 260, mass: 1 },
  /** Where the sheet starts, below its resting place, before it has been measured. */
  desde: 480,
} as const;

/** A spring's damping ratio: 1 never overshoots, lower overshoots more. */
export function razonDeAmortiguamiento(resorte: { damping: number; stiffness: number; mass: number }): number {
  return resorte.damping / (2 * Math.sqrt(resorte.stiffness * resorte.mass));
}

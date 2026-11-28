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

// ============================================================================
// ⚠️ `11.8-ii`: THE COUNTER'S MOTIONS — `brand/mostrador/movimiento.json`'s, number for number, as the design
// system's *Movimiento* card plays them (https://claude.ai/artifact/WhCNyqR8PhzkFom7gavTX5). ONE BLOCK IN BOTH
// SIBLINGS, and `test/movimiento.test.ts` in each holds it to the file and to the other app's. Each answers
// something she did, the moment it is kept on her phone (C10.3); none is a screen's arrival, and none blocks a
// touch. Drawn by `@/ui/Movimientos` (Reanimated): a keyframe's curve is the easing from it to the next, and
// every property moves between the keyframes on that one curve — what CSS, Reanimated 4 and the page all read.
// *El total rueda* is not here: his word of 2026-11-27 keeps Wera Cocina's *Quedan 9 de 14* still.
// ============================================================================

/** A keyframe: where it sits in the motion (0 to 1), what it shows there, and the curve to the next one. */
export type Fotograma = {
  readonly en: number;
  readonly opacity?: number;
  readonly translateX?: number;
  readonly translateY?: number;
  readonly scale?: number;
  readonly rotate?: number;
  readonly curva?: readonly [number, number, number, number];
};

/** A motion: how long, from when, about which point, and its keyframes. */
export type Movimiento = {
  readonly duracion: number;
  readonly retraso: number;
  readonly origen: string;
  readonly fotogramas: readonly Fotograma[];
};

/**
 * *El sello cae* — a stamp is pressed: down from a little above, larger and turned further, a touch too far, then
 * its resting turn (the turn is ADDED to the stamp's own: `@/ui/Mostrador`'s `OBJETOS.giros`, `palabra.giro`).
 */
export const SELLO = {
  duracion: 260,
  retraso: 0,
  origen: 'center',
  fotogramas: [
    { en: 0, opacity: 0, scale: 1.6, rotate: -12, curva: [0.5, 0, 0.9, 0.45] },
    { en: 0.55, opacity: 1, scale: 0.94, rotate: 2, curva: [0.2, 0.8, 0.3, 1] },
    { en: 1, opacity: 1, scale: 1, rotate: 0 },
  ],
} as const satisfies Movimiento;

/** *El talón se arranca* — the stub swings off about its corner at the perforation, and is gone. */
export const TALON = {
  duracion: 200,
  retraso: 0,
  origen: 'left top',
  fotogramas: [
    { en: 0, opacity: 1, translateX: 0, translateY: 0, rotate: 0, curva: [0.5, 0, 0.75, 0] },
    { en: 1, opacity: 0, translateX: 22, translateY: -6, rotate: 10 },
  ],
} as const satisfies Movimiento;

/**
 * Wera Cocina's handover as one gesture (`secuencias.entregar`): the stub tears at once and *Entregado* starts as it
 * lets go, so both have ended `ENTREGAR.sello + SELLO.duracion` = 300 ms after her tap.
 */
export const ENTREGAR = { talon: 0, sello: 40 } as const;

/** What answers a tap has ended within this many milliseconds of it (ADR-035 §2.11; the file's `conToque`). */
export const CON_TOQUE = 300;

/** One leg of a motion: the keyframe it runs to, how long it takes, and the curve it runs on. */
export type Tramo = { readonly hasta: number; readonly duracion: number; readonly curva: readonly [number, number, number, number] };

/** A motion's legs, keyframe to keyframe — their lengths add up to the motion's. */
export function tramosDe(m: Movimiento): Tramo[] {
  return m.fotogramas.slice(1).map((f, i) => {
    const antes = m.fotogramas[i];
    return { hasta: f.en, duracion: (f.en - antes.en) * m.duracion, curva: antes.curva ?? [0, 0, 1, 1] };
  });
}

/** Where each keyframe sits, 0 to 1 — the input of every property's interpolation. */
export function puntosDe(m: Movimiento): number[] {
  return m.fotogramas.map((f) => f.en);
}

/** One property's value at each keyframe: what the keyframe says, else the one before's, else the property's rest. */
export function valoresDe(m: Movimiento, propiedad: 'opacity' | 'translateX' | 'translateY' | 'scale' | 'rotate'): number[] {
  let ultimo = propiedad === 'opacity' || propiedad === 'scale' ? 1 : 0;
  return m.fotogramas.map((f) => {
    const v = f[propiedad];
    if (v !== undefined) ultimo = v;
    return ultimo;
  });
}

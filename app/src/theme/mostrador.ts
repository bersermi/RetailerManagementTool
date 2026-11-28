// ============================================================================
// THE COUNTER'S OBJECTS AND MOTIONS IN WERA — plan task `11.9`, direction A ·
// *Mostrador* (row `11.2`'s `brand/mostrador/objetos.json` and `movimiento.json`;
// his yes at `11.5-i`, 2026-11-26, on the screens the never-merged branch
// `11.5-i-pantallas-wera` drew, calls 1–8 as recommended — call 8 is the
// register's stagger, 40 ms a place).
//
// A shape per job, and a motion that mirrors the act:
//   - *Venta registrada*, *Compra registrada*, *Merma registrada* are a STAMP
//     with a word (`@/ui/Hecho`), and it is pressed — *El sello cae*;
//   - *Lo último* on Inicio is a RECEIPT, its foot torn in teeth, and a sale she
//     has not seen feeds out at its top — *Sale el recibo*;
//   - *Hoy*'s total rolls like a register, units first, each place to the left
//     a moment later — *El total rueda*;
//   - the tab she is on is underlined by a marker's STROKE.
//
// ⚠️ THE NUMBERS ARE THE FILES', AND `app/test/mostrador.test.ts` HOLDS THEM
// EQUAL — a curve or a millisecond nudged here alone turns it red. Pure data and
// pure arithmetic: no React, so the suite reads it without reaching a component
// (`R2`). The players are `@/lib/movimiento`'s `recorrer` and the three files
// above.
//
// ⚠️ `R6`: THESE ARE AN OBJECT'S MEASURES, NOT SIZES *LETRA GRANDE* CHANGES —
// paper does not get thicker when the letters grow, as `ESQUINA`'s corners do
// not. The word on a stamp is live text at the heading's size, which is the
// mode's. The stroke has its two sizes in the file itself.
//
// ⚠️ NO CHECK CAN SEE A FRAME MOVE (ADR-035 §2.11): the session's recordings on
// the emulator and his look are the evidence (`R9`).
// ============================================================================

/** `objetos.json`'s measures, in points. A picture's size is its drawing's. */
export const OBJETOS = {
  /**
   * A stamp with a word: two rules in the ink (2.5 outside, 1.5 inside, 2
   * apart), the word inside, the whole turned −4°.
   */
  palabra: { bordeFuera: 2.5, entre: 2, bordeDentro: 1.5, rellenoVertical: 4, rellenoHorizontal: 10, giro: -4 },
  /**
   * The marker's stroke under the tab in use — its drawing at *Normal*, a
   * little larger at *Letra grande* — and the point of air above it.
   */
  trazo: { normal: [34, 5], grande: [40, 6], aire: 1 },
  /** A receipt's foot: teeth `paso` apart and `alto` deep. */
  diente: { paso: 12, alto: 6 },
} as const;

/** A keyframe: where it sits in the motion (0 to 1), what it shows there, and the curve to the next. */
export interface Fotograma {
  readonly en: number;
  readonly opacity?: number;
  readonly translateY?: number;
  readonly scale?: number;
  readonly rotate?: number;
  readonly curva?: readonly [number, number, number, number];
}

/** A motion: how long, after how long, and its keyframes. */
export interface Movimiento {
  readonly duracion: number;
  readonly retraso: number;
  readonly fotogramas: readonly Fotograma[];
}

/**
 * *El sello cae* — 260 ms: it comes down from a little above, larger and turned
 * further, lands a touch too far and settles at its resting turn. A turn here is
 * ADDED to the stamp's own (`OBJETOS.palabra.giro`). It ends inside the 300 ms a
 * tap may wait (`movimiento.json`, `conToque`).
 */
export const SELLO: Movimiento = {
  duracion: 260,
  retraso: 0,
  fotogramas: [
    { en: 0, opacity: 0, scale: 1.6, rotate: -12, curva: [0.5, 0, 0.9, 0.45] },
    { en: 0.55, opacity: 1, scale: 0.94, rotate: 2, curva: [0.2, 0.8, 0.3, 1] },
    { en: 1, opacity: 1, scale: 1, rotate: 0 },
  ],
};

/**
 * *Sale el recibo* — 380 ms: everything under *Lo último*'s heading starts one
 * row higher, hidden by the heading's edge, and slides down. `translateY` is in
 * rows (`movimiento.json`'s `unidad: fila`).
 */
export const RECIBO: Movimiento = {
  duracion: 380,
  retraso: 0,
  fotogramas: [
    { en: 0, translateY: -1, curva: [0.2, 0.8, 0.3, 1] },
    { en: 1, translateY: 0 },
  ],
};

/**
 * *El total rueda* — each digit a wheel turning from the number she saw to the
 * new one in 700 ms on its curve, the units first and each place to the left
 * `cada` ms later (call 8). Today's roll, kept, with the stagger added.
 */
export const RODILLO = {
  duracion: 700,
  curva: [0.33, 1, 0.68, 1],
  escalonado: { cada: 40 },
} as const;

/** One leg of a motion: run to `hasta` (0 to 1) in `duracion` ms on `curva`. */
export interface Tramo {
  readonly hasta: number;
  readonly duracion: number;
  readonly curva: readonly [number, number, number, number];
}

/** The straight line — the curve a keyframe without one goes on. */
const RECTA = [0, 0, 1, 1] as const;

/**
 * A motion as legs of one value running 0 → 1, each leg to the next keyframe on
 * the curve the keyframe it leaves names. Their durations add up to the motion's.
 */
export function tramosDe(m: Movimiento): readonly Tramo[] {
  return m.fotogramas.slice(1).map((f, i) => {
    const desde = m.fotogramas[i];
    return { hasta: f.en, duracion: (f.en - desde.en) * m.duracion, curva: desde.curva ?? RECTA };
  });
}

/** Where each keyframe sits, 0 to 1 — an interpolation's input range. */
export function puntosDe(m: Movimiento): readonly number[] {
  return m.fotogramas.map((f) => f.en);
}

/** One property at each keyframe; a keyframe that does not name it shows its resting value. */
export function valoresDe(m: Movimiento, prop: 'opacity' | 'translateY' | 'scale' | 'rotate'): readonly number[] {
  const reposo = prop === 'opacity' || prop === 'scale' ? 1 : 0;
  return m.fotogramas.map((f) => f[prop] ?? reposo);
}

/**
 * How long a wheel waits before it turns: `lugar` places from the right, the
 * units at 0. Separators are not wheels and do not count — `$1,004.50`'s
 * thousands wait five places' worth, as its five digits to their right.
 */
export function retrasoDeRueda(lugar: number): number {
  return Math.max(0, Math.floor(lugar)) * RODILLO.escalonado.cada;
}

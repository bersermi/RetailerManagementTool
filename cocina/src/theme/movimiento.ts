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

/**
 * ⚠️ `10.9a-iii`: *PUBLICAR* GLOWS — once each time she opens the app, on her first three days with no
 * offer (the owner's nudges, ruled 2026-11-17; the family-shell page's `breath`: a ring of the green
 * spreading 16 px and fading, twice, 1.7 s each, after 0.45 s). Drawn by `@/ui/Brillo` as a ring that
 * grows and fades — `transform` and `opacity`, never a shadow (ADR-035 §2.11).
 */
export const BRILLO = {
  /** How far the ring spreads beyond the button, in points. */
  alcance: 16,
  /** One pulse, in milliseconds. */
  duracion: 1_700,
  /** Before the first, so the screen has arrived. */
  retraso: 450,
  /** How many pulses. */
  veces: 2,
  /** How strong the ring starts. */
  opacidad: 0.55,
} as const;

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

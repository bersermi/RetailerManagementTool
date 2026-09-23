// ============================================================================
// THE BLINK THAT SAYS *THIS ONE IS NEW* — as data, not as an animation. Plan
// task `5e-ii`, reworked 2026-09-23 on the owner's ruling.
//
// ⚠️⚠️ WHY THE TIMING IS HERE AND THE `Animated` CALL IS NOT. §2.11 refuses
// suites over rendering, and `R2` keeps the suite reaching no component — so an
// animation written entirely inside a screen is an animation no instrument in
// this repository can read. `src/navigation/inicio.ts` made the same trade for
// the order of Inicio's bands: the DECISION is a value a node suite loads, and
// the React that acts on it decides nothing (`R3`). ⚠️ This module deliberately
// imports NOTHING — not `react-native`, not `Animated` — which is what keeps it
// loadable under Node.
//
// ⚠️⚠️ OPACITY ONLY, AND THAT IS §2.11's MOTION RULE RATHER THAN A PREFERENCE.
// `transform` and `opacity` are the two properties that run on the compositor;
// animating layout, colour, shadow or blur does not, and C1.1 puts two LOW-END
// ANDROIDS among the pilot's four phones. ⚠️ It is also why the blink carries no
// colour: the owner asked for *"an intermitent animation… don't [add] any other
// indicator like a line or anything"*, so the row is never tinted, ruled or
// badged — and a tint would have broken the motion rule on the way.
//
// ⚠️ IT ENDS. A row that blinked for ever would be a state nobody can clear, on
// the one screen a shopkeeper keeps open — so the sequence is finite and rests at
// full opacity, which is what every other row already looks like.
//
// ⚠️⚠️ WHAT NO CHECK HERE CAN SEE (`R9`, §2.11): whether three blinks read as
// *this is the one you just made* rather than as a rendering fault, and whether
// 260ms is a blink or a flicker on a phone rather than in a number. **The
// instrument is the owner's phone**, at this task.
// ============================================================================

/**
 * How many times the new row dims and comes back.
 *
 * ⚠️ THREE, AND THE TWO NEIGHBOURING ANSWERS ARE BOTH WORSE. One is a dropped
 * frame — indistinguishable from the list settling after a scroll, which is
 * exactly what has just happened. Five is long enough that a shopkeeper waits
 * for it to stop before touching the screen.
 */
export const NEW_PRODUCT_BLINKS = 3;

/** How long one half of a blink takes, in milliseconds. */
export const PULSE_HALF_MS = 260;

/**
 * How far down the dim goes.
 *
 * ⚠️ NOT TO ZERO. A row that vanishes entirely reads as the list re-rendering —
 * or worse, as the product being deleted a second after it was made. It fades
 * and comes back, which reads as attention.
 */
export const PULSE_DIM = 0.35;

/** One leg of the blink: where the opacity goes, and how long it takes. */
export interface PulseStep {
  readonly toValue: number;
  readonly duration: number;
}

/**
 * The whole blink, as a list of legs — dim, back, dim, back, …, resting at 1.
 *
 * ⚠️⚠️ IT RESTS AT `1` AND THE LAST LEG IS ALWAYS THE WAY BACK UP, which is the
 * property worth asserting rather than trusting: an odd number of legs would
 * leave the row permanently dimmed, and a dimmed row on a price list reads as
 * *unavailable* — a state this app means somewhere else (C3.12's dash) and must
 * not imply here by accident.
 */
export function pulseSequence(blinks: number = NEW_PRODUCT_BLINKS): readonly PulseStep[] {
  const steps: PulseStep[] = [];
  for (let i = 0; i < Math.max(0, blinks); i += 1) {
    steps.push({ toValue: PULSE_DIM, duration: PULSE_HALF_MS });
    steps.push({ toValue: 1, duration: PULSE_HALF_MS });
  }
  return steps;
}

/** How long the whole blink lasts — what a caller waits for, spelled once. */
export function pulseTotalMs(blinks: number = NEW_PRODUCT_BLINKS): number {
  return pulseSequence(blinks).reduce((total, step) => total + step.duration, 0);
}

// ----------------------------------------------------------------------------
// THE BANNER THAT FADES — the family being released, said once and then gone
// ----------------------------------------------------------------------------

/** How long the released-family banner is fully readable before it leaves. */
export const BANNER_HOLD_MS = 2600;

/** How long it takes to arrive, and to go. */
export const BANNER_FADE_MS = 220;

/**
 * The banner's whole life: in, hold, out.
 *
 * ⚠️⚠️ IT HOLDS LONG ENOUGH TO READ, WHICH IS THE ONLY NUMBER HERE THAT MATTERS.
 * The owner asked for a banner *"that fades"*, and a sentence of eight Spanish
 * words at a counter is about two seconds of reading — so a fade that began at
 * 800ms would be a message nobody finished. ⚠️ And it ENDS at `0`: the family was
 * released, he has been told why, and a banner that stayed would be a warning
 * about a state he has already accepted.
 *
 * ⚠️ THE HOLD IS A `duration` ON AN OPACITY THAT DOES NOT MOVE, rather than a
 * `setTimeout`. One sequence owns the whole life of the thing, so cancelling it —
 * which happens every time he taps another unit — cannot leave a timer behind
 * that fires against a banner that is already gone.
 */
export function bannerSequence(): readonly PulseStep[] {
  return [
    { toValue: 1, duration: BANNER_FADE_MS },
    { toValue: 1, duration: BANNER_HOLD_MS },
    { toValue: 0, duration: BANNER_FADE_MS },
  ];
}

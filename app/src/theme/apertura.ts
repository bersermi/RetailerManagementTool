// ============================================================================
// THE OPENING — THE COW TURNS INTO THE LOGO. `8g`, the owner's note of
// 2026-10-21: *"an animation when opening the app for the first time with our
// cow that turns into the logo in the middle of the screen."* Played once per
// phone, on the welcome (`(auth)/hola`); the steps were his to see first, on
// https://claude.ai/artifact/DyN8SjULFMpdCbwCDqnH7U.
//
// ⚠️ IT STARTS ON THE SPLASH'S OWN FRAME, so the hand-off from the native
// splash cannot be seen: the rust cow, in the middle of the screen, at the
// size the splash draws her. The splash draws `splash-icon.png` 140 points wide
// (`app.json`), and that picture is the mark's view box cropped to 452 of its
// 512 units (`brand/render-icons.sh`), so the whole 512-unit box is
// 140 × 512 / 452 points. ⚠️ THAT IS WHY THESE SIZES ARE NOT `useDensity()`'S
// (`R6`): the native splash has one size, and the first frame must equal it.
// The size she settles at IS the density's (`selloSize`).
//
// ⚠️ IT ENDS ON THE ICON'S PICTURE: the cream cow on the rust square, the mark
// at 512 of the icon's 652 units (`render-icons.sh`, `-70 -70 652 652`).
// ============================================================================

/** The splash picture's width in points — `app.json`, `expo-splash-screen`. */
export const SPLASH_IMAGE_WIDTH = 140;
/** How much of the mark's 512-unit box the splash picture shows across. */
export const SPLASH_VIEW_UNITS = 452;
export const MARK_UNITS = 512;
/** The icon's view box across, the mark's 512 units centred in it. */
export const ICON_VIEW_UNITS = 652;

/** The cow's whole box, in points, on the splash's frame. */
export const COW_BOX = (SPLASH_IMAGE_WIDTH * MARK_UNITS) / SPLASH_VIEW_UNITS;
/** The icon's square around her at that size. */
export const SQUARE_SIDE = (COW_BOX * ICON_VIEW_UNITS) / MARK_UNITS;
/** An app icon's corner, as a share of its side. */
export const SQUARE_CORNER = 0.2237;

/** The steps, in milliseconds from the first frame — the page he saw. */
export const OPENING = {
  squareFrom: 200,
  squareFor: 520,
  // ⚠️ MEASURED ON THE EMULATOR: the square, rust, reaches her before she is
  // cream, and a rust cow on a rust square is not there. So she turns as it
  // grows — begun with it, done before it is full.
  creamFrom: 200,
  creamFor: 280,
  nodFrom: 600,
  nodFor: 450,
  riseFrom: 1_050,
  riseFor: 600,
  doorsFrom: 1_450,
  doorsEach: 90,
  doorsFor: 380,
} as const;

/** How far she nods, in degrees, before she settles. */
export const NOD_DEGREES = 7;

/** The whole opening, for a check that it stays under two seconds. */
export function openingLength(doors: number): number {
  return Math.max(
    OPENING.riseFrom + OPENING.riseFor,
    OPENING.doorsFrom + OPENING.doorsEach * Math.max(0, doors - 1) + OPENING.doorsFor,
  );
}

/** The scale at which the square, settled, is `side` points across. */
export function settledScale(side: number): number {
  return side / SQUARE_SIDE;
}

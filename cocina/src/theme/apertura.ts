// ============================================================================
// THE OPENING — THE COW TURNS INTO WERA COCINA'S ICON. Plan task `10.5-v-d`, the first
// run as the family-shell page drew it (ruled 2026-11-05): *"the cow's opening on
// Cocina's green"*, Wera's opening (`app/src/theme/apertura.ts`, `8g`) in this app's
// colours. Played once per phone, on the opening screen (`(auth)/hola`).
//
// ⚠️ IT STARTS ON THE SPLASH'S OWN FRAME, so the hand-off from the native splash cannot
// be seen: the cow in Cocina's green, in the middle of the screen, at the size the
// splash draws her. This app's splash draws `splash-icon.png` 140 points wide
// (`app.json`), and that picture is the mark's view box cropped to 452 of its 512 units
// (`store/cocina-itacate/render.sh`) — the same two numbers as Wera's — so the whole
// 512-unit box is 140 × 512 / 452 points. ⚠️ IT ENDS ON THE ICON'S PICTURE: the cream cow
// on Cocina's green square, the mark at 512 of the icon's 652 units (the same script).
// `test/apertura.test.ts` reads all four numbers off those two files, so a re-drawn
// splash or icon is a red there rather than a jump on her phone.
//
// ⚠️ THE STEPS ARE WERA'S, the ones he saw on his phone — the square, the cow turning
// cream as it grows, a nod, the rise — and the words and buttons after.
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
/** The side she settles at — Wera's seal at its usual size (`selloSize`, `normal`). */
export const SELLO = 110;

/** The steps, in milliseconds from the first frame — Wera's (`8g`). */
export const OPENING = {
  squareFrom: 200,
  squareFor: 520,
  // ⚠️ MEASURED ON WERA'S EMULATOR: the square reaches her before she is cream, and a
  // cow on a square of her own colour is not there. So she turns as it grows.
  creamFrom: 200,
  creamFor: 280,
  nodFrom: 600,
  nodFor: 450,
  riseFrom: 1_050,
  riseFor: 600,
  wordsFrom: 1_450,
  wordsFor: 380,
} as const;

/**
 * ⚠️ MEASURED ON THE EMULATOR, 2026-11-07: ANDROID'S SPLASH LEAVES BY FADING, 400 ms (expo-splash-screen's
 * default `duration`, `SplashScreenModule.kt`), and over the screen behind it — so an opening started as
 * the splash was let go played its square and its nod under the fading splash. On Android the steps wait
 * out the fade: the hand-off is then the splash's frame over the same frame, unseen, and the motion starts
 * on a clear screen. An iPhone's splash does not fade (`fade` defaults to false there), so it waits nothing.
 */
export const SPLASH_FADE_MS = 400;

/** How long the steps wait before the first one: the splash's fade on Android, nothing on an iPhone. */
export function esperaDe(os: string): number {
  return os === 'android' ? SPLASH_FADE_MS : 0;
}

/** How far she nods, in degrees, before she settles. */
export const NOD_DEGREES = 7;

/** The whole opening — under two seconds, as Wera's. */
export function openingLength(): number {
  return Math.max(OPENING.riseFrom + OPENING.riseFor, OPENING.wordsFrom + OPENING.wordsFor);
}

/** The scale at which the square, settled, is `side` points across. */
export function settledScale(side: number): number {
  return side / SQUARE_SIDE;
}

/** The phone's key that says the opening has played here. */
export const OPENING_KEY = 'wera-cocina.apertura';

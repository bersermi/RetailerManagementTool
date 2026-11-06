// ============================================================================
// THE TITLES' LETTERING — NUNITO. Plan task `10.5-v-b`, the owner's ruling of
// 2026-11-05 (the family-shell page: *"Nunito titles in both apps, as Wera"*).
//
// ⚠️ WERA'S FILE, COPIED (`app/src/theme/letra.ts`, plan `8g`, the ruling of
// 2026-10-16, whose header carries the reasons in full): a title is a screen's name,
// a sheet's name and a sheet's one question; everything else stays in the phone's own
// face. ONE weight, ExtraBold, and no `fontWeight` beside the family — on Android a
// custom family asked for a weight it does not have falls back to the system face.
// The `.ttf` travels inside the update (`src/marca/letras/`, Wera's file byte for
// byte, with its licence, the SIL Open Font License 1.1); `expo-font` was in this
// app's first build, so no build carries it. `test/pestanas.test.ts` holds this code
// and the font's bytes to Wera's files.
// ============================================================================

/** The family name `useFonts` registers and every title asks for. */
export const FAMILIA_TITULO = 'Nunito-ExtraBold';

/** What the root layout loads before the first screen draws. */
export const FUENTES = {
  [FAMILIA_TITULO]: require('@/marca/letras/Nunito-ExtraBold.ttf') as number,
};

/** The style a title spreads in: the face, and deliberately no weight. */
export const TITULO = { fontFamily: FAMILIA_TITULO } as const;

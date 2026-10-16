// ============================================================================
// THE TITLES' LETTERING — `8g`, the owner's ruling of 2026-10-16: **Nunito**.
//
// Shown four ways on real screens from the emulator (the phone's own face,
// Fraunces, Nunito and Bitter, titles only), he chose the rounded one. A title
// is a screen's name in its band, a sheet's name (*Carrito*) and a sheet's one
// question (*¿A cómo lo vendes?*). **Everything else stays in the phone's own
// face** — names, prices, quantities, buttons — the words read four hundred
// times a day, where the system face is the most legible at small sizes and
// lines its numerals up in columns.
//
// ⚠️⚠️ IT IS NOT A DOWNLOAD, WHICH IS WHY `palette.ts`'s OLD SENTENCE NO LONGER
// FORBIDS IT. That file said *"a brand face is a download"* and a shop without
// signal cannot afford one. This one is not fetched: the `.ttf` travels inside
// the update like the band's drawings (`@/marca`), so it is on the phone before
// the first frame that needs it, offline included. `expo-font` was already in
// the native build, so no new build carries it.
//
// ⚠️ ONE WEIGHT, ExtraBold (800), and only that file: a title is never another
// weight. `fontWeight` is NOT set beside the family — on Android a custom family
// with a weight it does not have falls back to the system face.
//
// ⚠️ THE LICENCE TRAVELS WITH IT: `@/marca/letras/OFL-Nunito.txt`, the SIL Open
// Font License 1.1, which allows bundling the font in an app.
// ============================================================================

/** The family name `useFonts` registers and every title asks for. */
export const FAMILIA_TITULO = 'Nunito-ExtraBold';

/** What the root layout loads before the first screen draws. */
export const FUENTES = {
  [FAMILIA_TITULO]: require('@/marca/letras/Nunito-ExtraBold.ttf') as number,
};

/** The style a title spreads in: the face, and deliberately no weight. */
export const TITULO = { fontFamily: FAMILIA_TITULO } as const;

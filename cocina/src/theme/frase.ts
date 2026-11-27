// ============================================================================
// A KITCHEN'S OWN PHRASE, IN HER HAND — `11.7-ii`, direction A · *Mostrador*
// (`11.1`'s type: Mansalva 20/26; `11.5-ii`'s decision (c), his yes
// of 2026-11-26). The one sentence under her name on her page (`0076`'s
// `sentence`), wherever her page is drawn: the neighbours' app's page, Wera
// Cocina's copy of it, and the head Wera Cocina previews as she writes it.
//
// ⚠️ NOT WERA'S: `@/theme/letra` and `@/marca/fuentes` are Wera's files code for
// code, and Wera draws no phrase — so the face lives here, and its file in
// `src/marca/frase/` (with the SIL Open Font License 1.1), loaded by
// `@/marca/fuenteDeFrase` beside Wera's two. The two siblings' copies of this
// file are one file (`test/esquinas.test.ts`), and both files are
// `brand/letras/`'s byte for byte. One weight, so never a `fontWeight` beside it.
// The size is the design system's, fixed: this app has one scale, and the
// phone's own larger text grows it.
// ============================================================================

/** The family name `useFonts` registers and her phrase asks for. */
export const FAMILIA_FRASE = 'Mansalva-Regular';

/** Her phrase: Mansalva at 20 on a line of 26. */
export function letraFrase() {
  return { fontFamily: FAMILIA_FRASE, includeFontPadding: false, fontSize: 20, lineHeight: 26 };
}

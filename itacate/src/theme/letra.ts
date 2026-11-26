// ============================================================================
// THE TITLES' LETTERING — **ARCHIVO**, since `11.7-i`: direction A · *Mostrador*,
// the owner's yes of 2026-11-26 on this app's real screens (`11.5-ii`: *"Yes on
// 11.5-ii, as recommended"*). It replaces Nunito, which this app had worn since
// `10.5-v-b` as Wera's did, and which Wera's own move to Archivo (`11.6`) gave way.
//
// ⚠️ WERA'S FILE, CODE FOR CODE (`app/src/theme/letra.ts`, whose header carries
// the reasons in full): a TITLE (`letraTitulo`), a HEADING over a block where the
// spaced capitals were (`letraEncabezado`, its words written in sentence case in
// `@/strings`), and a screen's ONE BIG NUMBER (`letraNumero`, Archivo Condensed
// with its figures in columns); everything else stays in the phone's own face.
// One weight per file and never a `fontWeight` beside the family; a line height
// with every size, since Archivo's line box is not Nunito's.
//
// ⚠️ THIS APP HAS ONE SIZE, NOT WERA'S TWO: the scale handed in is always
// `@/theme/palette`'s `SIZE`, Wera's `normal` row (no *Letra grande* here — the
// phone's own larger text scales it), so `@/theme/density` only names its type.
// The files are Wera's byte for byte (`src/marca/letras/`, with the SIL Open Font
// License 1.1), loaded by `@/marca/fuentes` before the first screen;
// `test/pestanas.test.ts` holds this code, that loader and the bytes to Wera's.
// ============================================================================

import type { DensityScale } from '@/theme/density';

/** The family name `useFonts` registers and every title and heading asks for. */
export const FAMILIA_TITULO = 'ArchivoSemiExpanded-ExtraBold';

/** The big number's family. */
export const FAMILIA_NUMERO = 'ArchivoCondensed-Bold';

/**
 * The style a title spreads in: the face, and deliberately no weight. ⚠️ Beside a
 * size that is not a token (a week's figure at twice a title) it keeps the font's
 * own line; a title at `titleSize` takes `letraTitulo(scale)` and its line instead.
 */
export const TITULO = { fontFamily: FAMILIA_TITULO } as const;

/** A screen's, a sheet's or a question's title at the mode's size, with its line. */
export function letraTitulo(scale: DensityScale) {
  return { ...TITULO, includeFontPadding: false, fontSize: scale.titleSize, lineHeight: scale.titleLine };
}

/**
 * A heading over a block: the titles' face at a heading's size, in `tinta` unless
 * its block's colour is asked for. ⚠️ Its words are written in sentence case in
 * `@/strings` — never a `textTransform`, which would capitalise a shop's name.
 */
export function letraEncabezado(scale: DensityScale) {
  return { ...TITULO, includeFontPadding: false, fontSize: scale.headingSize, lineHeight: scale.headingLine };
}

/** The screen's one big number, its figures in columns. */
export function letraNumero(scale: DensityScale) {
  return {
    fontFamily: FAMILIA_NUMERO,
    includeFontPadding: false,
    fontSize: scale.numeroSize,
    lineHeight: scale.numeroLine,
    fontVariant: ['tabular-nums' as const],
  };
}

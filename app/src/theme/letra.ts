// ============================================================================
// THE TITLES' LETTERING — **ARCHIVO**, since `11.6`: direction A · *Mostrador*,
// the owner's yes of 2026-11-26 on real screens (`11.5-i`: *"As recommended, all
// of them"* — Archivo for titles, call 1's cut for the big number, call 2's face
// for the headings). It replaces Nunito, his `8g` ruling of 2026-10-16, which the
// same answer gave way.
//
// THREE USES, AND EVERYTHING ELSE STAYS IN THE PHONE'S OWN FACE — names, prices
// in lists, quantities, buttons: the words read four hundred times a day, where
// the system face is the most legible at small sizes.
//
//   * a TITLE — a screen's name in its band, a sheet's name (*Carrito*), a sheet's
//     one question (*¿A cómo lo vendes?*): Archivo SemiExpanded ExtraBold, `letraTitulo`;
//   * a HEADING over a block, where spaced capitals were (*HOY* → *Hoy*): the same
//     file at a heading's size, `letraEncabezado`, in sentence case;
//   * a screen's ONE BIG NUMBER — *Inicio*'s total: Archivo Condensed Bold with
//     tabular figures, `letraNumero`. Its figures are proportional by default, so it
//     asks for `tabular-nums`; `11.5-i` measured a column held on both platforms
//     with it (spread 0.00 pt) and not without (8.76 pt Android, 8.33 iOS).
//
// ⚠️⚠️ NOT A DOWNLOAD. The `.ttf` files travel inside the update like the band's
// drawings (`@/marca`), so they are on the phone before the first frame that
// needs them, offline included; `expo-font` was already in the native build.
//
// ⚠️ ONE WEIGHT PER FILE, and `fontWeight` is NEVER set beside the family — on
// Android a custom family asked for a weight it does not have falls back to the
// system face.
//
// ⚠️ A LINE HEIGHT IS SET WITH EVERY SIZE: Archivo's line box is not Nunito's
// (ascent 878, descent 210 against 1,011 and 353 per 1,000 — `brand/letras/
// README.md`), so an unset one moves every header. The sizes and lines are
// `density.ts`'s tokens; `includeFontPadding: false` keeps Android's extra
// padding off them.
//
// ⚠️ THE LICENCE TRAVELS WITH THEM: `@/marca/letras/OFL-Archivo.txt`, the SIL Open
// Font License 1.1, which allows bundling the font in an app. The files are
// `brand/letras/`'s, byte for byte (`app/test/letra.test.ts`).
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

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

import { Platform } from 'react-native';

import { CON_ARCHIVO, ES_A, esGrande } from '@/theme/piel';

// ⚠️ 11.5-i (never merged): the face depends on the skin key (`@/theme/piel`).
const NUNITO = 'Nunito-ExtraBold';
const ARCHIVO_TITULO = 'ArchivoSemiExpanded-ExtraBold';
const ARCHIVO_NUMERO = 'ArchivoCondensed-Bold';

/** The family name `useFonts` registers and every title asks for. */
export const FAMILIA_TITULO = CON_ARCHIVO ? ARCHIVO_TITULO : NUNITO;

/** What the root layout loads before the first screen draws. */
export const FUENTES = {
  [NUNITO]: require('@/marca/letras/Nunito-ExtraBold.ttf') as number,
  [ARCHIVO_TITULO]: require('@/marca/letras/ArchivoSemiExpanded-ExtraBold.ttf') as number,
  [ARCHIVO_NUMERO]: require('@/marca/letras/ArchivoCondensed-Bold.ttf') as number,
  WeraIconos: require('@/marca/iconos/WeraIconos.ttf') as number,
};

/** The style a title spreads in: the face, and deliberately no weight. */
export const TITULO = { fontFamily: FAMILIA_TITULO } as const;

/** A title's line under A (11.1: 22/26, 28/32); today none is set. */
export function lineaTitulo(scale: { titleSize: number }): object {
  if (!ES_A) return {};
  return { lineHeight: esGrande(scale) ? 32 : 26, ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}) };
}

/** A heading — the spaced capitals become this under A (11.1: 16/20, 20/24). */
export function encabezado(scale: { titleSize: number }): object {
  const grande = esGrande(scale);
  return {
    fontFamily: FAMILIA_TITULO,
    fontSize: grande ? 20 : 16,
    lineHeight: grande ? 24 : 20,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  };
}

/** The screen's one big number (11.1: 34/38, 44/48; tabular figures). */
export function numero(scale: { titleSize: number }): { fontFamily: string; fontSize: number; lineHeight: number; fontVariant: ['tabular-nums'] } {
  const grande = esGrande(scale);
  return {
    fontFamily: CON_ARCHIVO ? ARCHIVO_NUMERO : NUNITO,
    fontSize: grande ? 44 : 34,
    lineHeight: grande ? 48 : 38,
    fontVariant: ['tabular-nums'],
  };
}

export const FAMILIA_NUMERO = CON_ARCHIVO ? ARCHIVO_NUMERO : NUNITO;

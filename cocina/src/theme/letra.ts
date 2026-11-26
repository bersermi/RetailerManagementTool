// ============================================================================
// THE TITLES' LETTERING — NUNITO. Plan task `10.5-v-c-i`, the owner's ruling of
// 2026-11-05 (the family-shell page: *"Nunito titles in both apps, as Wera"*);
// Itacate's since `10.5-v-b` (`itacate/src/theme/letra.ts`).
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

import { Platform } from 'react-native';

import { ES_A } from '@/theme/piel';

// ⚠️ 11.5-ii (never merged): the face depends on the skin key (`@/theme/piel`).
const NUNITO = 'Nunito-ExtraBold';
const ARCHIVO_TITULO = 'ArchivoSemiExpanded-ExtraBold';
const ARCHIVO_NUMERO = 'ArchivoCondensed-Bold';
const MANSALVA = 'Mansalva-Regular';

/** The family name `useFonts` registers and every title asks for. */
export const FAMILIA_TITULO = ES_A ? ARCHIVO_TITULO : NUNITO;

/** What the root layout loads before the first screen draws. */
export const FUENTES = {
  [NUNITO]: require('@/marca/letras/Nunito-ExtraBold.ttf') as number,
  [ARCHIVO_TITULO]: require('@/marca/letras/ArchivoSemiExpanded-ExtraBold.ttf') as number,
  [ARCHIVO_NUMERO]: require('@/marca/letras/ArchivoCondensed-Bold.ttf') as number,
  [MANSALVA]: require('@/marca/letras/Mansalva-Regular.ttf') as number,
  WeraIconos: require('@/marca/iconos/WeraIconos.ttf') as number,
};

const SIN_RELLENO = Platform.OS === 'android' ? { includeFontPadding: false } : {};

/** The style a title spreads in: the face, and deliberately no weight — under A with its line (11.1: 22/26). */
export const TITULO = (ES_A ? { fontFamily: FAMILIA_TITULO, ...SIN_RELLENO } : { fontFamily: FAMILIA_TITULO }) as { fontFamily: string };

/** A title's line under A for a size (11.1: 22/26 — four points over the size). */
export function lineaDe(size: number): object {
  return ES_A ? { lineHeight: Math.round(size + 4) } : {};
}

/** A heading — the spaced capitals become this under A (11.1: 16/20). */
export const ENCABEZADO = { fontFamily: ARCHIVO_TITULO, fontSize: 16, lineHeight: 20, ...SIN_RELLENO } as const;

/** The screen's one big number (11.1: 34/38; tabular figures, measured at 11.5-i). */
export const NUMERO = { fontFamily: ARCHIVO_NUMERO, fontSize: 34, lineHeight: 38, fontVariant: ['tabular-nums'] as ['tabular-nums'], ...SIN_RELLENO };

/** A kitchen's own phrase (11.1: Mansalva 20/26). */
export const FRASE = { fontFamily: MANSALVA, fontSize: 20, lineHeight: 26, ...SIN_RELLENO } as const;

/** A reward won (11.1: Mansalva 32/38). */
export const PREMIO = { fontFamily: MANSALVA, fontSize: 32, lineHeight: 38, ...SIN_RELLENO } as const;

/**
 * ⚠️ 11.5-ii: a heading written in capitals, in sentence case — the strings stay as they are; only their case
 * changes on screen (11.1's *Words*).
 */
export function oracion(t: string): string {
  if (t !== t.toLocaleUpperCase('es-MX')) return t;
  const l = t.toLocaleLowerCase('es-MX');
  for (let i = 0; i < l.length; i += 1) {
    const c = l.charAt(i);
    if (c.toLocaleUpperCase('es-MX') !== c) return l.slice(0, i) + c.toLocaleUpperCase('es-MX') + l.slice(i + 1);
  }
  return l;
}

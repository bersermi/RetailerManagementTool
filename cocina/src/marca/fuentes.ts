// ============================================================================
// THE FONT FILES, AS THE ROOT LAYOUT LOADS THEM — `11.7-i`, Wera's file code for
// code (`app/src/marca/fuentes.ts`, `11.6`). `@/theme/letra` names the families;
// this file only hands `useFonts` the files, so a test can read the styles
// without loading a `.ttf` (Vitest cannot `require` one).
// ============================================================================
import { FAMILIA_NUMERO, FAMILIA_TITULO } from '@/theme/letra';

/** What the root layout loads before the first screen draws. */
export const FUENTES = {
  [FAMILIA_TITULO]: require('@/marca/letras/ArchivoSemiExpanded-ExtraBold.ttf') as number,
  [FAMILIA_NUMERO]: require('@/marca/letras/ArchivoCondensed-Bold.ttf') as number,
};

// ============================================================================
// THE FONT FILES, AS THE ROOT LAYOUT LOADS THEM — `11.6`. `@/theme/letra` names
// the families and says why these; this file only hands `useFonts` the files,
// so a test can read the styles without loading a `.ttf` (Vitest cannot
// `require` one). `app/test/letra.test.ts` holds the files to `brand/letras/`.
// ============================================================================
import { FAMILIA_NUMERO, FAMILIA_TITULO } from '@/theme/letra';

/** What the root layout loads before the first screen draws. */
export const FUENTES = {
  [FAMILIA_TITULO]: require('@/marca/letras/ArchivoSemiExpanded-ExtraBold.ttf') as number,
  [FAMILIA_NUMERO]: require('@/marca/letras/ArchivoCondensed-Bold.ttf') as number,
};

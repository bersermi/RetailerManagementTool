// ============================================================================
// THE FONT FILES, AS THE ROOT LAYOUT LOADS THEM — `11.6`. `@/theme/letra` names
// the families and says why these; this file only hands `useFonts` the files,
// so a test can read the styles without loading a `.ttf` (Vitest cannot
// `require` one). `app/test/letra.test.ts` holds the files to `brand/letras/`.
// ============================================================================
import { FAMILIA_NUMERO, FAMILIA_TITULO } from '@/theme/letra';
import { FAMILIA_ICONOS } from '@/marca/glifos';

/** What the root layout loads before the first screen draws. */
export const FUENTES = {
  [FAMILIA_TITULO]: require('@/marca/letras/ArchivoSemiExpanded-ExtraBold.ttf') as number,
  [FAMILIA_NUMERO]: require('@/marca/letras/ArchivoCondensed-Bold.ttf') as number,
  // `11.10-i`: the drawn icons, so none draws blank while its font loads.
  [FAMILIA_ICONOS]: require('@/marca/iconos/WeraIconos.ttf') as number,
};

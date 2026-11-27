// ============================================================================
// HER PHRASE'S FONT FILE, AS THE ROOT LAYOUT LOADS IT — `11.7-ii`. `@/theme/frase`
// names the family; this file only hands `useFonts` the file, beside
// `@/marca/fuentes`' two, so a test can read the style without loading a `.ttf`.
// ============================================================================
import { FAMILIA_FRASE } from '@/theme/frase';

/** What the root layout loads before the first screen draws, with `FUENTES`. */
export const FUENTE_DE_FRASE = {
  [FAMILIA_FRASE]: require('@/marca/frase/Mansalva-Regular.ttf') as number,
};

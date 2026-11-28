// ============================================================================
// THE ICON FONT'S NAMES — `11.10-i` (2026-11-28). One file in the three apps,
// byte for byte (each app's `test/iconos.test.ts`).
//
// The drawings of `brand/iconos/` (rows `11.3-i` and `11.3-ii`, his word on
// their line of 2026-11-26) are built into one font, and its map is keyed by
// the names the apps wrote for MaterialCommunityIcons — so a screen names a
// glyph as it did, and a name the font does not draw is a type error.
// `@/ui/Icono` draws them; `@/marca/fuentes` loads the font with the others.
// ============================================================================
import GLIFOS from '@/marca/iconos/WeraIconos.json';

export { GLIFOS };

/** The font's family, as `@/marca/fuentes` loads it and `@/ui/Icono` draws it. */
export const FAMILIA_ICONOS = 'WeraIconos';

/**
 * Every name an icon can be given: the font's, and `whatsapp` — WhatsApp's own
 * mark, never in the font (`brand/marcas/README.md`), which `@/ui/Icono` still
 * draws as the apps did before.
 */
export type NombreIcono = keyof typeof GLIFOS | 'whatsapp';

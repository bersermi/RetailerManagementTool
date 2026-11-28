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
 * mark, never in the font: `@/ui/Icono` draws Meta's picture for it
 * (`brand/marcas/README.md`, `11.10-iii`).
 */
export type NombreIcono = keyof typeof GLIFOS | 'whatsapp';

/**
 * Which of Meta's two glyphs a place gets, from the colour the place asks its
 * icon for — Meta's rules let neither be tinted (`11.10-iii`). A light colour
 * means the icon sits on a filled ground (a `principal` button's white word), so
 * it takes Meta's white glyph; anything else, on the white sheet or a pale fill,
 * takes Meta's green one.
 */
export function varianteDeWhatsapp(color: unknown): 'verde' | 'blanco' {
  if (typeof color !== 'string') return 'verde';
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex === null) return 'verde';
  const canal = (i: number) => {
    const c = parseInt(hex[1].slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luz = 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
  return luz > 0.5 ? 'blanco' : 'verde';
}

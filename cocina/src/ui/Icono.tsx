// ============================================================================
// THE APPS' ICONS — `11.10-i` (2026-11-28). One file in the three apps, byte for
// byte: Wera's `test/iconos.test.ts` holds this one and its font to
// `brand/iconos/`, and each sibling's holds its copy to this one.
//
// Every icon is a drawing of `brand/iconos/`, from one font that sits where
// MaterialCommunityIcons' sat — the same em, ascent and descent, so a glyph
// lands in the same box of the same `<Text>` at every size on both platforms
// (`brand/iconos/iconos.mjs` compares the two fonts). Its names are
// `@/marca/glifos`'. The root layout loads the font with the others
// (`@/marca/fuentes`), so no icon draws blank while it loads.
//
// ⚠️ `whatsapp` is WhatsApp's own mark: never ours to draw, and Meta's rules
// forbid a redrawn or recoloured one (`brand/marcas/README.md`). Since
// `11.10-iii` it is Meta's own glyph as a picture, green or white as
// `@/marca/glifos`' `varianteDeWhatsapp` reads the colour asked for, never
// tinted; it fills five sixths of the icon's box, as a drawing fills its 24-unit
// square, so it sits where the old glyph sat.
// ============================================================================
import createIconSet from '@expo/vector-icons/createIconSet';
import type { ComponentProps } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { FAMILIA_ICONOS, GLIFOS, type NombreIcono, varianteDeWhatsapp } from '@/marca/glifos';

const Dibujados = createIconSet(GLIFOS, FAMILIA_ICONOS, require('@/marca/iconos/WeraIconos.ttf') as number);

type Props = Omit<ComponentProps<typeof Dibujados>, 'name'> & { readonly name: NombreIcono };

const WHATSAPP = {
  verde: require('@/marca/whatsapp/verde.png') as number,
  blanco: require('@/marca/whatsapp/blanco.png') as number,
};

export function Icono({ name, ...props }: Props) {
  if (name === 'whatsapp') {
    const lado = props.size ?? 12;
    return (
      <Image
        source={WHATSAPP[varianteDeWhatsapp(props.color)]}
        accessibilityIgnoresInvertColors
        style={[{ width: (lado * 5) / 6, height: (lado * 5) / 6, margin: lado / 12 }, props.style as StyleProp<ImageStyle>]}
      />
    );
  }
  return <Dibujados name={name} {...props} />;
}

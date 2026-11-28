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
// forbid a redrawn or recoloured one (`brand/marcas/README.md`). Until the
// official glyph is in `brand/marcas/`, it is drawn as it was before this row.
// ============================================================================
import createIconSet from '@expo/vector-icons/createIconSet';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { FAMILIA_ICONOS, GLIFOS, type NombreIcono } from '@/marca/glifos';

const Dibujados = createIconSet(GLIFOS, FAMILIA_ICONOS, require('@/marca/iconos/WeraIconos.ttf') as number);

type Props = Omit<ComponentProps<typeof Dibujados>, 'name'> & { readonly name: NombreIcono };

export function Icono({ name, ...props }: Props) {
  if (name === 'whatsapp') return <MaterialCommunityIcons name="whatsapp" {...props} />;
  return <Dibujados name={name} {...props} />;
}

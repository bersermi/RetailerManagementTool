// ============================================================================
// THE SEVEN DRAWINGS, ONE PER GIRO, AS THE APP LOADS THEM — `8g`, the owner's option C,
// 2026-10-15: the shop's watermark in the tab screens' band.
//
// ⚠️ THE PNGs ARE DRAWN FROM `brand/giros/*.svg` BY `brand/render-giros.sh`, by
// hand, like the icon. This file only names them. A replacement drawing needs
// no code: keep the file name, re-run the script, and ship.
//
// ⚠️ `require` AND NOT `import`, ON PURPOSE: `expo-env.d.ts`, which teaches
// TypeScript what an image import is, is generated and not committed, so CI's
// typecheck would refuse an `import` of a `.png` that passes here. Measured
// 2026-10-15 by typechecking with that file moved away.
// ============================================================================
import type { ImageSourcePropType } from 'react-native';
import type { Emblema } from '@/api/emblema';

export const DIBUJOS: Readonly<Record<Emblema, ImageSourcePropType>> = {
  polleria: require('@/marca/giros/polleria.png') as ImageSourcePropType,
  carniceria: require('@/marca/giros/carniceria.png') as ImageSourcePropType,
  verduleria: require('@/marca/giros/verduleria.png') as ImageSourcePropType,
  fruteria: require('@/marca/giros/fruteria.png') as ImageSourcePropType,
  abarrotes: require('@/marca/giros/abarrotes.png') as ImageSourcePropType,
  cremeria: require('@/marca/giros/cremeria.png') as ImageSourcePropType,
  materias: require('@/marca/giros/materias.png') as ImageSourcePropType,
};

// ⚠️ 11.5-ii (never merged): the drawn icons (row 11.3-i, brand/iconos/) wherever a glyph is drawn,
// under direction A; MaterialCommunityIcons' otherwise. Every file that imported MaterialCommunityIcons
// imports this instead, on this branch only — row 11.10 is the real swap. Wera's twin: 11.5-i's.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import createIconSet from '@expo/vector-icons/createIconSet';
import type { ComponentProps } from 'react';

import mapa from '@/marca/iconos/WeraIconos.json';
import { ES_A } from '@/theme/piel';

const Dibujados = createIconSet(mapa as Record<string, number>, 'WeraIconos', require('@/marca/iconos/WeraIconos.ttf'));

type Props = ComponentProps<typeof MaterialCommunityIcons>;

function Icono(props: Props) {
  if (ES_A && (props.name as string) in mapa) return <Dibujados {...(props as ComponentProps<typeof Dibujados>)} />;
  return <MaterialCommunityIcons {...props} />;
}

export default Object.assign(Icono, { glyphMap: MaterialCommunityIcons.glyphMap });

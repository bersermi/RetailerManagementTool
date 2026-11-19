import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import type { Kitchen } from '@/api/cocinas';
import { cocinaDe } from '@/lib/apartados';
import { fijadoTextos, type Fijado } from '@/lib/misCocinas';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Circulo } from '@/ui/Circulo';

// ============================================================================
// HER RESERVATION, PINNED. Plan task `10.9d-ii`, the owner's ruling G39 of 2026-11-17, as the
// family-shell page draws stage 3 (`pinRes`): at the top of *Cerca* — in the sheet's head, so it
// shows at every height of the list — and heading *Mis cocinas*: the kitchen's circle, *Tu
// apartado · hoy a las 17:45*, *Fonda Doña Mari · código 318*, a chevron; a tap opens *Apartados*
// over the tabs, where her ticket, her swipe and *¿Cambio de planes?* are. What it says is
// `@/lib/misCocinas`' (`fijadoDe`, `fijadoTextos`), pinned by `test/misCocinas.test.ts`. ⚠️ A
// CANCEL BY THE KITCHEN is said in the error's colour: she must not walk over for nothing.
// NO CHECK CAN SEE THIS (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function ApartadoFijado({
  fijado,
  puerta,
  ahora,
  onPress,
}: {
  fijado: Fijado;
  /** The kitchen as the door sends it, for her circle — else what her reservation carries. */
  puerta: Kitchen | undefined;
  ahora: Date;
  onPress: () => void;
}) {
  const { titulo, detalle } = fijadoTextos(fijado, ahora);
  const aviso = fijado.kind === 'aviso';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${detalle}.`}
      accessibilityHint={ES.fijado.ayuda}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.space,
        minHeight: SIZE.tapTarget + SIZE.rowGap,
        paddingHorizontal: SIZE.space,
        paddingVertical: SIZE.rowGap,
        borderRadius: SIZE.space,
        borderWidth: 1,
        borderColor: aviso ? PALETTE.error : PALETTE.accion,
        backgroundColor: pressed ? PALETTE.accionSuave : PALETTE.superficie,
      })}
    >
      <Circulo cocina={cocinaDe(fijado.apartado, puerta)} size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: aviso ? PALETTE.error : PALETTE.tinta }}>{titulo}</Text>
        <Text numberOfLines={1} style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>
          {detalle}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={PALETTE.tintaApagada} />
    </Pressable>
  );
}

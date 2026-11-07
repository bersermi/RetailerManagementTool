import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import { diasTexto, horaTexto, type Propuesta } from '@/lib/recordatorio';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// HER REMINDER'S QUESTION, ONCE, UNDER THE DOORS ON *HOY*. Plan task `10.5-v-c-ii`, as the
// family-shell page draws it (round 6's fifth zone): a bell, *¿Te recordamos a las 16:00,
// de lunes a sábado?* with *Sueles publicar hacia las 16:10.* under it, a ✕ for *No,
// gracias*, then *Sí, recuérdame* and *Otra hora*. She answers it one time — either
// answer, the ✕ included, and it never comes back on this phone; the reminder then lives
// in *Mi cocina*. When it is drawn is `@/lib/recordatorio`'s `preguntar`.
// ============================================================================

export function PreguntaRecordatorio({
  propuesta,
  ocupado,
  onSi,
  onOtraHora,
  onNo,
}: {
  propuesta: Propuesta;
  ocupado: boolean;
  onSi: () => void;
  onOtraHora: () => void;
  onNo: () => void;
}) {
  return (
    <View
      style={{
        gap: SIZE.space,
        padding: SIZE.space,
        borderRadius: SIZE.space,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SIZE.rowGap + 2 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: PALETTE.accionSuave,
          }}
        >
          <MaterialCommunityIcons name="bell-outline" size={20} color={PALETTE.accion} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', lineHeight: 21, color: PALETTE.tinta }}>
            {ES.recordatorio.pregunta(horaTexto(propuesta.hora), diasTexto(propuesta.dias))}
          </Text>
          <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>
            {ES.recordatorio.costumbre(horaTexto(propuesta.costumbre))}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.recordatorio.noGracias}
          onPress={onNo}
          hitSlop={SIZE.rowGap}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="close" size={18} color={PALETTE.tintaApagada} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
        <View style={{ flex: 1.3 }}>
          <BotonLleno variante="principal" label={ES.recordatorio.si} busy={ocupado} onPress={onSi} />
        </View>
        <View style={{ flex: 1 }}>
          <BotonLleno label={ES.recordatorio.otraHora} onPress={onOtraHora} />
        </View>
      </View>
    </View>
  );
}

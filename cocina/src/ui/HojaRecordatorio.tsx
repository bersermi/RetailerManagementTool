import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { diasTexto, horasDe, horaTexto, type Dia } from '@/lib/recordatorio';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// *RECORDATORIO DIARIO* — THE SHEET. Plan task `10.5-v-c-ii`, as the family-shell page
// draws it (`remSheet`): *Sueles publicar hacia las 16:10, de lunes a sábado. ¿A qué
// hora te avisamos?*, four hours around hers as chips, the notification as it will
// look, then *Encender recordatorio* — or, while it is on, *Guardar* and *Apagarlo*.
// Opened by *Otra hora* on *Hoy* and by her row in *Mi cocina*; one tap changes or turns
// it off. Her days are the rule's, never typed here.
//
// ⚠️ A SHEET WITHOUT A NEW PART: React Native's own `Modal`, faded in over a dim ground
// that closes it — no Reanimated, which this app's motion keeps to `@/ui/Llega` and
// `@/ui/Nota` (`test/pestanas.test.ts`). NO CHECK CAN SEE IT (ADR-035 §2.11).
// ============================================================================

export function HojaRecordatorio({
  visible,
  hora,
  dias,
  costumbre,
  encendido,
  ocupado,
  onCerrar,
  onGuardar,
  onApagar,
}: {
  visible: boolean;
  /** The hour it starts on — hers, or the rule's — in minutes after midnight. */
  hora: number;
  dias: readonly Dia[];
  /** When she usually publishes now, in minutes — `null` when the rule has nothing to say. */
  costumbre: number | null;
  encendido: boolean;
  ocupado: boolean;
  onCerrar: () => void;
  onGuardar: (hora: number) => void;
  onApagar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [elegida, setElegida] = useState(hora);
  // Each time it opens, it starts from her hour.
  useEffect(() => {
    if (visible) setElegida(hora);
  }, [visible, hora]);

  const linea =
    costumbre === null ? ES.recordatorio.hojaDias(diasTexto(dias)) : ES.recordatorio.hojaCostumbre(horaTexto(costumbre), diasTexto(dias));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onCerrar}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32, 29, 22, 0.45)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={ES.recordatorio.cerrar} onPress={onCerrar} style={{ flex: 1 }} />
        <View
          style={{
            gap: SIZE.space,
            padding: SIZE.space * 1.5,
            paddingBottom: SIZE.space * 1.5 + insets.bottom,
            borderTopLeftRadius: SIZE.space * 1.5,
            borderTopRightRadius: SIZE.space * 1.5,
            backgroundColor: PALETTE.superficie,
          }}
        >
          <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta }}>
            {ES.recordatorio.titulo}
          </Text>
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>
            {linea} {ES.recordatorio.hojaPregunta}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.rowGap }}>
            {horasDe(hora).map((h) => {
              const on = h === elegida;
              return (
                <Pressable
                  key={h}
                  accessibilityRole="radio"
                  accessibilityLabel={ES.recordatorio.horaAyuda(horaTexto(h))}
                  accessibilityState={{ selected: on }}
                  onPress={() => setElegida(h)}
                  style={{
                    minHeight: SIZE.tapTarget - 4,
                    minWidth: SIZE.tapTarget + SIZE.space * 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: SIZE.space,
                    borderRadius: 999,
                    borderWidth: on ? 2 : 1,
                    borderColor: on ? PALETTE.accion : PALETTE.linea,
                    backgroundColor: on ? PALETTE.accionSuave : PALETTE.superficie,
                  }}
                >
                  <Text style={{ fontSize: SIZE.bodySize, fontWeight: on ? '700' : '500', color: on ? PALETTE.accion : PALETTE.tinta }}>
                    {horaTexto(h)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 2, padding: SIZE.space, borderRadius: SIZE.space, backgroundColor: PALETTE.banda }}>
            <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.recordatorio.asiSeVera}</Text>
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{ES.recordatorio.avisoTitulo}</Text>
            <Text style={{ fontSize: SIZE.bodySize - 1, color: PALETTE.tinta }}>{ES.recordatorio.avisoTexto}</Text>
          </View>

          <BotonLleno
            variante="principal"
            label={encendido ? ES.recordatorio.guardar : ES.recordatorio.encender}
            busy={ocupado}
            onPress={() => onGuardar(elegida)}
          />
          {encendido && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ES.recordatorio.apagar}
              onPress={onApagar}
              style={{ minHeight: SIZE.tapTarget, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{ES.recordatorio.apagar}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

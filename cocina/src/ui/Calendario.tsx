import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { calendarioDe, conSuDia } from '@/lib/promociones';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// *OTRA FECHA…* — HER PROMOTION'S LAST DAY, FROM A CALENDAR OF THE EIGHT WEEKS IT MAY RUN. Plan task `10.9g-ii`
// (the drawing: *"Otra fecha: un calendario, hasta ocho semanas"*). ⚠️ NO NATIVE PICKER: a date picker is a native
// module, and a native module is a new store build — so the weeks are drawn here, Monday first, from this week to
// the one holding her last possible day (`@/lib/promociones`' `calendarioDe`), every day from today to eight weeks
// on a tap, the rest blank. A tap picks the day and closes. React Native's `Modal`, as every sheet here.
// ============================================================================

export function Calendario({
  visible,
  hoy,
  elegido,
  onElegir,
  onCerrar,
}: {
  visible: boolean;
  hoy: string;
  elegido: string | null;
  onElegir: (dia: string) => void;
  onCerrar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const semanas = calendarioDe(hoy);
  const celda = { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: SIZE.tapTarget - 4 } as const;
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onCerrar}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32, 29, 22, 0.45)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={ES.nuevaPromocion.calendarioCerrar} onPress={onCerrar} style={{ flex: 1 }} />
        <View
          style={{
            maxHeight: '85%',
            backgroundColor: PALETTE.fondo,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            padding: SIZE.space * 1.5,
            paddingBottom: insets.bottom + SIZE.space * 1.5,
            gap: SIZE.space,
          }}
        >
          <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta }}>
            {ES.nuevaPromocion.calendario}
          </Text>
          <View style={{ flexDirection: 'row' }}>
            {ES.promociones.diasCortos.map((d) => (
              <View key={d} style={celda}>
                <Text style={{ fontSize: SIZE.smallSize - 1, fontWeight: '700', color: PALETTE.tintaApagada }}>{d}</Text>
              </View>
            ))}
          </View>
          <ScrollView contentContainerStyle={{ gap: 2 }}>
            {semanas.map((semana) => (
              <View key={semana.dias.map((d) => d?.dia ?? '').join('|') + (semana.mes ?? '')} style={{ gap: 2 }}>
                {semana.mes !== null && (
                  <Text style={{ marginTop: SIZE.rowGap, fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tinta }}>{semana.mes}</Text>
                )}
                <View style={{ flexDirection: 'row' }}>
                  {semana.dias.map((d, i) =>
                    d === null ? (
                      <View key={i} style={celda} />
                    ) : (
                      <Pressable
                        key={d.dia}
                        accessibilityRole="button"
                        accessibilityLabel={conSuDia(d.dia)}
                        accessibilityState={{ selected: elegido === d.dia }}
                        onPress={() => onElegir(d.dia)}
                        style={celda}
                      >
                        {({ pressed }) => (
                          <View
                            style={{
                              width: SIZE.tapTarget - 8,
                              height: SIZE.tapTarget - 8,
                              borderRadius: (SIZE.tapTarget - 8) / 2,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: d.dia === hoy ? 1 : 0,
                              borderColor: PALETTE.accion,
                              backgroundColor: elegido === d.dia ? PALETTE.accion : pressed ? PALETTE.accionSuave : 'transparent',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: SIZE.bodySize,
                                fontWeight: elegido === d.dia ? '800' : '600',
                                color: elegido === d.dia ? PALETTE.superficie : PALETTE.tinta,
                              }}
                            >
                              {d.numero}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
          <BotonLleno variante="discreto" label={ES.nuevaPromocion.calendarioCerrar} onPress={onCerrar} />
        </View>
      </View>
    </Modal>
  );
}

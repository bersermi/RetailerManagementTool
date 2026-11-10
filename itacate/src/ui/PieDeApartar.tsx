import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Pie } from '@/lib/apartar';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// THE DISH PAGE'S FOOT — *APARTAR · $65*, OR WHY NOT. Plan task `10.5b-iii-a`, the
// family-shell page's stage 2 (*Apartar · $65*, *Ya lo apartaste · ver tu código*, *Ya
// tienes un apartado*) and `10.5b-ii`'s final design (a kitchen above her score: *Esta
// cocina aparta a quien tiene más de 80% de 👍. Tú tienes 78%.*, *Apartar* greyed, *Ver
// tu calificación*). Which one is `@/lib/apartar`'s `pieDe`.
//
// ⚠️ STATE FIRST (ADR-035 §2.8): what stops her is said above the button it greys, never
// discovered by tapping. A greyed button takes no tap and a screen reader hears it
// disabled. NO CHECK CAN SEE THIS SCREEN (§2.11): the phone is its instrument.
// ============================================================================

export function PieDeApartar({
  pie,
  precio,
  onApartar,
  onVerApartados,
  onVerCalificacion,
  falla = null,
  onReintentar,
}: {
  pie: Pie;
  /** The dish's price, as the button says it. */
  precio: string;
  onApartar: () => void;
  onVerApartados: () => void;
  onVerCalificacion: () => void;
  /** Why her reservations or her standing could not be read (`pie.kind === 'falla'`). */
  falla?: string | null;
  onReintentar?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingHorizontal: SIZE.space * 1.5,
        paddingTop: SIZE.space,
        paddingBottom: insets.bottom + SIZE.space,
        gap: SIZE.rowGap,
        borderTopWidth: 1,
        borderTopColor: PALETTE.linea,
        backgroundColor: PALETTE.fondo,
      }}
    >
      {pie.kind === 'calificacion' && (
        <View style={{ gap: SIZE.rowGap / 2 }}>
          <Text
            style={{
              fontSize: SIZE.smallSize,
              lineHeight: 19,
              color: PALETTE.accion,
              backgroundColor: PALETTE.accionSuave,
              borderRadius: SIZE.rowGap,
              paddingHorizontal: SIZE.space - 2,
              paddingVertical: SIZE.rowGap,
              overflow: 'hidden',
            }}
          >
            {ES.apartar.calificacion(pie.minimo, pie.suyo)}
          </Text>
          <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.apartar.calificacionDetalle}</Text>
        </View>
      )}
      {pie.kind === 'sinHoras' && (
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.apartar.enMostrador}</Text>
      )}
      {pie.kind === 'falla' && (
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, fontWeight: '600', color: PALETTE.error }}>{falla ?? ES.apartar.fallas.otra}</Text>
      )}

      {pie.kind === 'apartar' && <BotonLleno label={ES.apartar.boton(precio)} variante="principal" onPress={onApartar} />}
      {pie.kind === 'cargando' && <BotonLleno label={ES.apartar.boton(precio)} variante="principal" busy onPress={onApartar} />}
      {pie.kind === 'yaLoApartaste' && (
        <BotonLleno label={ES.apartar.yaLoApartaste} icon="ticket-confirmation-outline" onPress={onVerApartados} />
      )}
      {pie.kind === 'limite' && <Apagado texto={ES.apartar.limite(pie.limite)} />}
      {pie.kind === 'calificacion' && <Apagado texto={ES.apartar.boton(precio)} />}
      {pie.kind === 'sinHoras' && <Apagado texto={ES.apartar.sinHoras} />}
      {pie.kind === 'falla' && <Apagado texto={ES.apartar.boton(precio)} />}

      {pie.kind === 'limite' && <Liga texto={ES.apartar.verTusApartados} onPress={onVerApartados} />}
      {pie.kind === 'calificacion' && <Liga texto={ES.apartar.verTuCalificacion} onPress={onVerCalificacion} />}
      {pie.kind === 'falla' && onReintentar !== undefined && <Liga texto={ES.apartar.reintentar} onPress={onReintentar} />}
    </View>
  );
}

/** A button she cannot tap, greyed, which a screen reader hears disabled. */
function Apagado({ texto }: { texto: string }) {
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ disabled: true }}
      style={{
        minHeight: SIZE.tapTarget,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SIZE.space,
        borderRadius: SIZE.space / 2,
        backgroundColor: PALETTE.linea,
      }}
    >
      <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tintaApagada }}>{texto}</Text>
    </View>
  );
}

/** A line of text that opens something — her reservations, her score. */
function Liga({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={texto}
      onPress={onPress}
      hitSlop={SIZE.rowGap}
      style={({ pressed }) => ({ minHeight: SIZE.tapTarget - SIZE.rowGap, justifyContent: 'center', alignSelf: 'center', opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.accion }}>{texto}</Text>
    </Pressable>
  );
}

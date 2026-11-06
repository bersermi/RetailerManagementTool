import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// *HOY*'S DOORS — EACH WITH ITS NUMBER, TWO PER ROW (the family-shell page's zone 4,
// `hubTile`). Plan task `10.5-v-c-i`. Today one: *Tu página · 3 de 5*; the services'
// cards join as each ships — *De las tiendas* (`10.6b`), *Clientes*, *Esta semana* —
// and an odd one out takes its row's width.
//
// ⚠️ A DOOR SHE MAY CLOSE CARRIES A ✕ (`onCerrar`), apart from the door itself so a tap
// meant for one never lands on the other; what closing means is the screen's.
// ============================================================================

export interface PuertaDeHoy {
  readonly key: string;
  readonly icono: ComponentProps<typeof MaterialCommunityIcons>['name'];
  readonly titulo: string;
  /** Its number, big: *3 de 5*. */
  readonly valor: string;
  /** The line under it: *Faltan tu frase y tu foto de portada*. */
  readonly detalle: string;
  readonly onPress: () => void;
  /** The ✕, when she may close it. */
  readonly onCerrar?: () => void;
}

export function Puertas({ puertas }: { puertas: readonly PuertaDeHoy[] }) {
  const filas: PuertaDeHoy[][] = [];
  for (let i = 0; i < puertas.length; i += 2) filas.push(puertas.slice(i, i + 2));
  return (
    <View style={{ gap: SIZE.rowGap + 2 }}>
      {filas.map((fila) => (
        <View key={fila.map((p) => p.key).join('+')} style={{ flexDirection: 'row', gap: SIZE.rowGap + 2 }}>
          {fila.map((puerta) => (
            <Puerta key={puerta.key} puerta={puerta} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Puerta({ puerta }: { puerta: PuertaDeHoy }) {
  return (
    <View style={{ flex: 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${puerta.titulo}, ${puerta.valor}. ${puerta.detalle}`}
        onPress={puerta.onPress}
        style={({ pressed }) => ({
          gap: 4,
          minHeight: SIZE.tapTarget * 2,
          padding: SIZE.space,
          paddingRight: puerta.onCerrar !== undefined ? SIZE.tapTarget : SIZE.space,
          borderRadius: SIZE.space,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name={puerta.icono} size={16} color={PALETTE.accion} />
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada }}>{puerta.titulo}</Text>
        </View>
        <Text style={{ fontSize: SIZE.titleSize, fontWeight: '800', color: PALETTE.tinta }}>{puerta.valor}</Text>
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{puerta.detalle}</Text>
      </Pressable>
      {puerta.onCerrar !== undefined && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.puertas.quitar}: ${puerta.titulo}`}
          onPress={puerta.onCerrar}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: SIZE.tapTarget,
            height: SIZE.tapTarget,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="close" size={18} color={PALETTE.tintaApagada} />
        </Pressable>
      )}
    </View>
  );
}

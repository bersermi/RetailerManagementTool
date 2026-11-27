import { Pressable, Text, View } from 'react-native';

import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';

// ============================================================================
// A ROW OF CHIPS, ONE CHOSEN — the card's setup (`10.9e-ii`, the family-shell page's `.chips`): how many
// stamps, when they are erased. ⚠️ NOTHING PRE-CHOSEN (G34): until she taps, none is filled; `sugerida`
// draws one dashed as a hint, never a value — the screen reader says *sugerido*, and nothing is sent.
// ⚠️ `10.9k`: `otro` is a last chip that OPENS something (*Otro…*, the days typed): dashed until it holds
// her choice, then drawn chosen with its words (*21 días*); a tap opens it again.
// ============================================================================

export function Fichas<T extends string | number>({
  titulo,
  opciones,
  elegida,
  sugerida = null,
  onElegir,
  otro = null,
}: {
  titulo: string;
  opciones: readonly { readonly valor: T; readonly texto: string }[];
  elegida: T | null;
  sugerida?: T | null;
  onElegir: (valor: T) => void;
  otro?: { readonly texto: string; readonly elegido: boolean; readonly onAbrir: () => void } | null;
}) {
  return (
    <View style={{ gap: SIZE.rowGap }}>
      <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>{titulo}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={titulo} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.rowGap }}>
        {opciones.map((o) => {
          const on = elegida === o.valor;
          const pista = elegida === null && sugerida === o.valor;
          return (
            <Pressable
              key={String(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={pista ? `${o.texto}, ${ES.prepararTarjeta.sugerido}` : o.texto}
              onPress={() => onElegir(o.valor)}
              style={({ pressed }) => ({
                minWidth: SIZE.tapTarget,
                minHeight: SIZE.tapTarget - 4,
                paddingHorizontal: SIZE.space,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: ESQUINA.chip,
                borderWidth: pista ? 1.5 : 1,
                borderStyle: pista ? 'dashed' : 'solid',
                borderColor: on || pista ? PALETTE.accion : PALETTE.linea,
                backgroundColor: on ? PALETTE.accion : pressed ? PALETTE.accionSuave : PALETTE.superficie,
              })}
            >
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: on ? PALETTE.superficie : PALETTE.tinta }}>{o.texto}</Text>
            </Pressable>
          );
        })}
        {otro !== null && (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: otro.elegido }}
            accessibilityLabel={otro.texto}
            onPress={otro.onAbrir}
            style={({ pressed }) => ({
              minWidth: SIZE.tapTarget,
              minHeight: SIZE.tapTarget - 4,
              paddingHorizontal: SIZE.space,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: ESQUINA.chip,
              borderWidth: otro.elegido ? 1 : 1.5,
              borderStyle: otro.elegido ? 'solid' : 'dashed',
              borderColor: PALETTE.accion,
              backgroundColor: otro.elegido ? PALETTE.accion : pressed ? PALETTE.accionSuave : PALETTE.superficie,
            })}
          >
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: otro.elegido ? PALETTE.superficie : PALETTE.accion }}>{otro.texto}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

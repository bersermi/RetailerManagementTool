import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import { DIGITOS } from '@/lib/apartados';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// THE CODE, TYPED — *Entregar un apartado*'s three boxes and its keypad. Plan task
// `10.5b-iv-a`, slice 3's handover as the family-shell page draws it (`codeSheet`): three
// boxes that fill as she taps, red when the code is not one of today's, and a keypad of
// its own — big keys at the counter, no system keyboard over the screen, nothing to
// focus. What a key does is `@/lib/apartados`' `teclear`.
// ============================================================================

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'borrar'] as const;

export function Casillas({ codigo, mal }: { codigo: string; mal: boolean }) {
  return (
    <View accessible accessibilityLabel={codigo.split('').join(' ')} style={{ flexDirection: 'row', justifyContent: 'center', gap: SIZE.space }}>
      {Array.from({ length: DIGITOS }, (_, i) => {
        const digito = codigo[i] ?? '';
        return (
          <View
            key={i}
            style={{
              width: 58,
              height: 66,
              borderRadius: SIZE.space,
              borderWidth: 2,
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: mal ? PALETTE.error : digito !== '' ? PALETTE.accion : PALETTE.linea,
              backgroundColor: PALETTE.superficie,
            }}
          >
            <Text style={{ ...TITULO, fontSize: 34, color: mal ? PALETTE.error : PALETTE.tinta }}>{digito}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function Teclado({ onTecla }: { onTecla: (tecla: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SIZE.rowGap, maxWidth: 3 * 92 + 2 * SIZE.rowGap, alignSelf: 'center' }}>
      {TECLAS.map((tecla, i) =>
        tecla === '' ? (
          <View key={`hueco-${i}`} style={{ width: 92, height: 56 }} />
        ) : (
          <Pressable
            key={tecla}
            accessibilityRole="button"
            accessibilityLabel={tecla === 'borrar' ? ES.entregar.borrar : tecla}
            onPress={() => onTecla(tecla)}
            style={({ pressed }) => ({
              width: 92,
              height: 56,
              borderRadius: SIZE.space,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? PALETTE.accionSuave : PALETTE.superficie,
              borderWidth: 1,
              borderColor: PALETTE.linea,
            })}
          >
            {tecla === 'borrar' ? (
              <MaterialCommunityIcons name="backspace-outline" size={26} color={PALETTE.tinta} />
            ) : (
              <Text style={{ fontSize: 26, fontWeight: '600', color: PALETTE.tinta }}>{tecla}</Text>
            )}
          </Pressable>
        ),
      )}
    </View>
  );
}

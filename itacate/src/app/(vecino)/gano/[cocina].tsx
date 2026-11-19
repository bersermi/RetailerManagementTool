import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCocinas, useTarjetas } from '@/api/hooks';
import { parametro } from '@/lib/paginas';
import { colorDeTarjeta, enFrase } from '@/lib/tarjeta';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Llega } from '@/ui/Llega';

// ============================================================================
// *¡GANASTE …!* — THE CELEBRATION. Plan task `10.9e-iii` (G11: *"a nice animation showing she won something"*;
// G17: on the spot or at her next open; the family-shell page's `iGano`): Wera's cow on the kitchen's colour
// with a gift, a star and a stamp around it, *¡Ganaste una comida corrida!*, *En Fonda Doña Mari. Cóbralo
// cuando quieras: escanea su código o enséñale el tuyo.*, *Ver mis premios* and *Después*. Opened by
// `@/lib/Festejos` alone, once per reward (`@/lib/festejado`).
// ⚠️ THE MOVEMENT IS `@/ui/Llega`'S (one staggered entrance, transform and opacity — ADR-035 §2.11): Reanimated is
// imported by four modules only (`test/pestanas.test.ts`). NO CHECK CAN SEE THIS SCREEN: the phone is its instrument.
// ============================================================================

/** The cow, Wera's mark, in its rust — the one *Tú* signs with (`app/src/marca/vaca-oxido.png`, byte for byte). */
const VACA = require('@/marca/vaca-oxido.png') as number;

export default function Gano() {
  const params = useLocalSearchParams<{ cocina: string; premio?: string }>();
  const cocinaId = parametro(params.cocina);
  const premioId = parametro(params.premio);
  const insets = useSafeAreaInsets();
  const tarjetas = useTarjetas();
  const cocinas = useCocinas();
  const card = tarjetas.data?.find((c) => c.id === cocinaId);
  const puerta = cocinas.data?.find((k) => k.id === cocinaId) ?? null;
  const premio = card?.rewards.find((r) => r.id === premioId) ?? card?.rewards[0] ?? null;
  const nombre = card?.name ?? puerta?.name ?? '';
  const hue = card === undefined ? PALETTE.accion : HUES[colorDeTarjeta(card, puerta)];
  const despues = () => (router.canGoBack() ? router.back() : router.replace('/mis-cocinas'));

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top, paddingBottom: insets.bottom + SIZE.space * 2 }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: SIZE.space * 1.5, paddingHorizontal: SIZE.space * 2 }}>
        <Llega i={0}>
          <View style={{ width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center', backgroundColor: hue }}>
            <View style={{ width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.superficie }}>
              <Image source={VACA} style={{ width: 66, height: 66 }} accessibilityIgnoresInvertColors />
            </View>
            <Insignia icono="gift-outline" top={-6} left={-4} color={hue} />
            <Insignia icono="star" top={8} left={122} color={hue} />
            <Insignia icono="stamper" top={118} left={110} color={hue} />
          </View>
        </Llega>
        <Llega i={1} style={{ gap: SIZE.rowGap, alignItems: 'center' }}>
          <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize + 2, ...TITULO, color: PALETTE.tinta, textAlign: 'center' }}>
            {ES.gano.titulo(enFrase(premio?.reward ?? card?.reward ?? ''))}
          </Text>
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada, textAlign: 'center' }}>{ES.gano.detalle(nombre)}</Text>
        </Llega>
      </View>
      <Llega i={2} style={{ gap: SIZE.rowGap, paddingHorizontal: SIZE.space * 1.5 }}>
        <BotonLleno
          variante="principal"
          label={ES.gano.ver}
          onPress={() => router.replace({ pathname: '/premios/[cocina]', params: { cocina: cocinaId } })}
        />
        <BotonLleno variante="discreto" label={ES.gano.despues} onPress={despues} />
      </Llega>
    </View>
  );
}

/** One of the three small marks around the cow (the page's `gt`): a white disc, the kitchen's colour inside. */
function Insignia({ icono, top, left, color }: { icono: 'gift-outline' | 'star' | 'stamper'; top: number; left: number; color: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        top,
        left,
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: PALETTE.superficie,
        borderWidth: 2,
        borderColor: color,
      }}
    >
      <MaterialCommunityIcons name={icono} size={18} color={color} />
    </View>
  );
}

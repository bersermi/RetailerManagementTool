import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCocinas, useTarjetas } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { marcarFestejados } from '@/lib/festejado';
import { deviceStore } from '@/lib/store';
import { parametro } from '@/lib/paginas';
import { colorDeTarjeta, enFrase } from '@/lib/tarjeta';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { ESQUINA } from '@/theme/density';
import { PREMIO } from '@/theme/dibujos';
import { letraPremio } from '@/theme/frase';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Llega } from '@/ui/Llega';

// ============================================================================
// *¡GANASTE …!* — THE CELEBRATION. Plan task `10.9e-iii` (G11: *"a nice animation showing she won something"*;
// G17: on the spot or at her next open; the family-shell page's `iGano`): Wera's cow on the kitchen's colour
// with a gift, a star and a stamp around it, *¡Ganaste una comida corrida!*, *En Fonda Doña Mari. Cóbralo
// cuando quieras: escanea su código o enséñale el tuyo.*, *Ver mis premios* and *Después*. Opened by
// `@/lib/Festejos` alone, once per reward — and it is THIS screen, once open, that keeps the rewards as celebrated
// (`vistos`, `@/lib/festejado`).
// ⚠️ `11.8-i`: THE REWARD WON IN HER HAND — *¡Ganaste …!* in Mansalva (`@/theme/frase`'s `letraPremio`, the design
// system's *Mano*).
// ⚠️ `11.10-ii` — ROW `11.4`'S *PREMIO*, AS HE RULED IT (call 13, 2026-11-26, *as drawn*): ONE SHEET OF THE KITCHEN'S
// COLOUR holding the drawn gift, its lid coming off, in white at 150 points, above the reward in Mansalva and the
// sentence, both white on her colour (each of the six clears 4.5:1 under white: cempasúchil's 5.1 the least) — in
// place of the disc, the rust cow and the three badges it was. The cow stays on her card's stamps. The buttons are
// unchanged.
// ⚠️ THE MOVEMENT IS `@/ui/Llega`'S (one staggered entrance, transform and opacity — ADR-035 §2.11): Reanimated is
// imported by four modules only (`test/pestanas.test.ts`). NO CHECK CAN SEE THIS SCREEN: the phone is its instrument.
// ============================================================================

/** The gift's side, in points (`brand/dibujos/dibujos.json`'s `premio`: drawn at 160, shown at 150 as `11.4` drew it). */
const LADO_PREMIO = 150;

export default function Gano() {
  const params = useLocalSearchParams<{ cocina: string; premio?: string; vistos?: string }>();
  const cocinaId = parametro(params.cocina);
  const premioId = parametro(params.premio);
  const vistos = parametro(params.vistos);
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  // ⚠️ Kept HERE, once the screen is open: a celebration that never reached the screen is not marked as seen.
  useEffect(() => {
    if (userId !== null && vistos !== '') marcarFestejados(deviceStore(), userId, vistos.split(','));
  }, [userId, vistos]);
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
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SIZE.space * 1.5 }}>
        <Llega i={0}>
          <View style={{ alignItems: 'center', gap: SIZE.space, paddingVertical: SIZE.space * 2, paddingHorizontal: SIZE.space * 1.5, borderRadius: ESQUINA.hoja, backgroundColor: hue }}>
            <Image
              source={PREMIO}
              accessibilityElementsHidden
              importantForAccessibility="no"
              resizeMode="contain"
              style={{ width: LADO_PREMIO, height: LADO_PREMIO, tintColor: PALETTE.superficie }}
            />
            <Text accessibilityRole="header" style={{ ...letraPremio(), color: PALETTE.superficie, textAlign: 'center' }}>
              {ES.gano.titulo(enFrase(premio?.reward ?? card?.reward ?? ''))}
            </Text>
            <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.superficie, textAlign: 'center' }}>{ES.gano.detalle(nombre)}</Text>
          </View>
        </Llega>
      </View>
      <Llega i={1} style={{ gap: SIZE.rowGap, paddingHorizontal: SIZE.space * 1.5 }}>
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

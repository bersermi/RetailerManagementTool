import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { apiErrorMessage } from '@/api/errors';
import { useCocinas, useTarjetas } from '@/api/hooks';
import { parametro } from '@/lib/paginas';
import { colorDeTarjeta, premiosDe } from '@/lib/tarjeta';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Llega } from '@/ui/Llega';

// ============================================================================
// *TUS PREMIOS EN …* — HER REWARDS AT ONE KITCHEN, AND SHE CHOOSES WHICH TO CLAIM. Plan task `10.9e-iii` (G11,
// round 3: a stack, *2 premios por cobrar*, each with what it is and when she won it — *"giving the option of
// which reward to claim by default is more simple"*; the family-shell page's `iPremios`). *Cobrar* opens *Mi
// código* as *Cobras: …* — her code naming that reward, which the kitchen scans (`10.9e-ii`) — from where *O
// escanea su código* claims it the other way. *Se cobra en la cocina, como un sello*. A reward claimed, or gone,
// leaves the list as her cards are read again. NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11).
// ============================================================================

export default function Premios() {
  const cocinaId = parametro(useLocalSearchParams<{ cocina: string }>().cocina);
  const tarjetas = useTarjetas();
  const cocinas = useCocinas();
  const card = tarjetas.data?.find((c) => c.id === cocinaId);
  const puerta = cocinas.data?.find((k) => k.id === cocinaId) ?? null;
  const nombre = card?.name ?? puerta?.name ?? '';
  const hue = card === undefined ? PALETTE.accion : HUES[colorDeTarjeta(card, puerta)];
  const premios = premiosDe(card?.rewards ?? []);
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/mis-cocinas'));

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.premios.titulo(nombre)} volver={{ label: ES.premios.volver, onPress: volver }} />
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 6, gap: SIZE.space }}>
        {tarjetas.data === undefined ? (
          <View style={{ alignItems: 'center', gap: SIZE.space, paddingVertical: SIZE.space * 2 }}>
            {tarjetas.isError ? (
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{apiErrorMessage(tarjetas.error)}</Text>
            ) : (
              <ActivityIndicator color={PALETTE.accion} />
            )}
          </View>
        ) : premios.length === 0 ? (
          <View style={{ alignItems: 'center', gap: SIZE.rowGap, padding: SIZE.space * 2, borderRadius: SIZE.space, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
            <MaterialCommunityIcons name="gift-outline" size={40} color={PALETTE.linea} />
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta, textAlign: 'center' }}>{ES.premios.ninguno}</Text>
          </View>
        ) : (
          <>
            {premios.length > 1 && <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.premios.elige}</Text>}
            {premios.map((p, i) => (
              <Llega key={p.id} i={i}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SIZE.space,
                    padding: SIZE.space,
                    borderRadius: SIZE.space,
                    borderWidth: 1.5,
                    borderColor: hue,
                    backgroundColor: PALETTE.superficie,
                  }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: hue }}>
                    <MaterialCommunityIcons name="gift-outline" size={22} color={PALETTE.superficie} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{p.que}</Text>
                    <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{p.cuando}</Text>
                  </View>
                  <BotonLleno variante="principal" label={ES.premios.cobrar} onPress={() => router.push({ pathname: '/mi-codigo', params: { premio: p.id } })} />
                </View>
              </Llega>
            ))}
          </>
        )}
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.premios.nota}</Text>
      </ScrollView>
    </View>
  );
}

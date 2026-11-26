import MaterialCommunityIcons from '@/marca/Icono';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useElegirServicios, useKitchen, useServicios } from '@/api/hooks';
import { ICONO_DE, PREPARAR, filasDe, type Elegible } from '@/lib/loQueUsas';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Llega } from '@/ui/Llega';
import { volverAMiCocina } from '@/ui/PantallaDeAjustes';

// ============================================================================
// *ACTIVAR* — WHAT A FEATURE IS, WHAT IT ASKS OF HER, AND ONE BUTTON. Plan task `10.9a-ii`,
// the owner's ruling of 2026-11-16 (arrangement A: *"on → one picture, one sentence, what it
// asks of her → Activar → its setup (only the card has one) → the tile arrives on Hoy"*),
// as the family-shell page draws it (`cActivar`, `cListo`). Opened from *Mi cocina › Lo que
// usas* by a feature she does not use.
//
// ⚠️ *ACTIVAR* WAITS FOR THE DATABASE (`set_kitchen_features`, `on`): her tile on *Hoy* and the
// word on her page in Itacate follow it. Then the feature's setup when it has one (`PREPARAR`,
// the card's, `10.9e`) — else *Listo, ya está en tu Hoy* and *Ver mi Hoy*. ⚠️ A FEATURE NO LONGER
// OFFERED (Wera switched it off, `TD024`, or this build does not carry it) is said in words, never
// drawn with a button that would be refused. Turning a feature off is in its own screen (each
// feature's row). NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================
export default function Activar() {
  const insets = useSafeAreaInsets();
  const { servicio } = useLocalSearchParams<{ servicio: string }>();
  const kitchen = useKitchen();
  const servicios = useServicios(kitchen?.id ?? null);
  const { elegir, busy } = useElegirServicios(kitchen?.id ?? null);
  const [problema, setProblema] = useState<string | null>(null);
  const [listo, setListo] = useState<Elegible | null>(null);

  const banda = <Banda titulo={ES.loQueUsas.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.loQueUsas.volver, onPress: volverAMiCocina }} />;
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  if (listo !== null) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top, paddingBottom: insets.bottom + SIZE.space * 2 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZE.space * 2, gap: SIZE.space }}>
          <Llega i={0}>
            <MaterialCommunityIcons name="check-circle" size={SIZE.iconSize * 3} color={PALETTE.accion} />
          </Llega>
          <Llega i={1}>
            <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize + 2, ...TITULO, color: PALETTE.tinta, textAlign: 'center' }}>
              {ES.loQueUsas.listo}
            </Text>
          </Llega>
          <Llega i={2}>
            <Text style={{ ...quiet, textAlign: 'center' }}>{ES.loQueUsas.nombre[listo]}</Text>
          </Llega>
        </View>
        <Llega i={3} style={{ paddingHorizontal: SIZE.space * 2 }}>
          <BotonLleno variante="principal" label={ES.loQueUsas.verMiHoy} onPress={() => router.dismissTo('/')} />
        </Llega>
      </View>
    );
  }

  if (servicios.data === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <View style={{ padding: SIZE.space * 2, gap: SIZE.space }}>
          {servicios.isError ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.queMas.sinLeer}</Text>
              <BotonLleno label={ES.queMas.otraVez} busy={servicios.isFetching} onPress={() => void servicios.refetch()} />
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={quiet}>{ES.queMas.leyendo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Only a feature offered here and not in use has this screen.
  const fila = filasDe(servicios.data).find((f) => f.servicio === servicio && !f.usa) ?? null;
  if (fila === null) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <Text style={{ margin: SIZE.space * 2, fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{problema ?? ES.loQueUsas.noDisponible}</Text>
      </View>
    );
  }
  const x = fila.servicio;

  async function activar() {
    setProblema(null);
    const fallo = await elegir({ [x]: 'on' });
    if (fallo !== null) return setProblema(fallo);
    const preparar = PREPARAR[x];
    if (preparar !== undefined) router.replace(preparar);
    else setListo(x);
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 2, gap: SIZE.space * 1.5 }}>
        <Llega i={0} style={{ alignItems: 'center', gap: SIZE.rowGap, paddingTop: SIZE.space }}>
          <MaterialCommunityIcons name={ICONO_DE[x]} size={SIZE.iconSize * 2.6} color={PALETTE.accion} />
          <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize + 2, ...TITULO, color: PALETTE.tinta, textAlign: 'center' }}>
            {ES.loQueUsas.necesidad[x]}
          </Text>
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.accion }}>{ES.loQueUsas.nombre[x]}</Text>
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta, textAlign: 'center' }}>{ES.loQueUsas.frase[x]}</Text>
        </Llega>
        <Llega
          i={1}
          style={{ backgroundColor: PALETTE.superficie, borderWidth: 1, borderColor: PALETTE.linea, borderRadius: 14, padding: SIZE.space, gap: 4 }}
        >
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: PALETTE.tintaApagada }}>
            {ES.loQueUsas.loQueTePide}
          </Text>
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{ES.loQueUsas.pide[x]}</Text>
        </Llega>
        {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
      </ScrollView>
      <View style={{ paddingHorizontal: SIZE.space * 2, paddingTop: SIZE.space, paddingBottom: insets.bottom + SIZE.space, borderTopWidth: 1, borderTopColor: PALETTE.linea }}>
        <BotonLleno variante="principal" label={busy ? ES.loQueUsas.activando : ES.loQueUsas.activar} busy={busy} onPress={() => void activar()} />
      </View>
    </View>
  );
}

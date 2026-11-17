import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useElegirServicios, useKitchen, useServicios } from '@/api/hooks';
import { eleccionesDe, elegibles, menuEnLaEleccion, pasoDe, type Elegible } from '@/lib/loQueUsas';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Casilla } from '@/ui/Casilla';
import { Llega } from '@/ui/Llega';

// ============================================================================
// *¿QUÉ MÁS QUIERES USAR?* — THE FIRST RUN'S THIRD STEP. Plan task `10.9a-ii`, the owner's
// rulings of 2026-11-16 and 17 (G32, G33; the family-shell page, round 7): *Paso 3 de 3*,
// right after *Registrar mi cocina*, where the guard sends a kitchen just made while this
// build carries a feature to pick (`@/auth/guard`). It replaced *¿Qué ofreces hoy?*: no first
// offer inside the first run.
//
// ⚠️ HER NEED FIRST AND THE FEATURE UNDER IT, NOTHING PRE-CHECKED (a box that arrived ticked
// would be the app choosing for her). Only what Wera offers now AND this build carries
// (`@/lib/loQueUsas`' `elegibles`); *Tu menú a la mano · Próximamente* greyed, never picked,
// while every *Próximamente* may show. ⚠️ *SEGUIR* SENDS ONE CALL — `on` for each she picked,
// `off` for the rest she was shown (`eleccionesDe`) — and waits for it: her choices draw tiles
// on *Hoy*. *DECIDIR DESPUÉS* SENDS NOTHING. Either way the first run ends on her page as her
// neighbours see it (`/ya-estas`), then *Hoy*; the card's setup is not done here.
//
// ⚠️ WHEN THE DATABASE OFFERS NOTHING THIS BUILD CARRIES (a feature built and still switched off
// for everyone) THE STEP GOES STRAIGHT ON — the count the first two steps drew was the build's.
// ⚠️ ANDROID'S BACK LEAVES THE FIRST RUN FOR *HOY*, sending nothing: her kitchen is made, and
// *Lo que usas* in *Mi cocina* holds the same choice. NO CHECK CAN SEE THIS SCREEN (ADR-035
// §2.11): the phone is its instrument.
// ============================================================================
export default function QueMas() {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const servicios = useServicios(kitchen?.id ?? null);
  const { elegir, busy } = useElegirServicios(kitchen?.id ?? null);
  const [elegidos, setElegidos] = useState<ReadonlySet<Elegible>>(new Set());
  const [problema, setProblema] = useState<string | null>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/');
      return true;
    });
    return () => sub.remove();
  }, []);

  const mostrados = servicios.data === undefined ? null : elegibles(servicios.data);
  const nada = mostrados !== null && mostrados.length === 0;
  useEffect(() => {
    if (nada) router.replace('/ya-estas');
  }, [nada]);

  const despues = () => router.replace('/ya-estas');

  async function seguir() {
    if (mostrados === null || busy) return;
    setProblema(null);
    const problema = await elegir(eleccionesDe(mostrados, elegidos));
    if (problema !== null) return setProblema(problema);
    router.replace('/ya-estas');
  }

  function cambiar(servicio: Elegible) {
    setElegidos((antes) => {
      const nuevos = new Set(antes);
      if (nuevos.has(servicio)) nuevos.delete(servicio);
      else nuevos.add(servicio);
      return nuevos;
    });
  }

  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;
  const marco = { flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top + SIZE.space * 2, paddingBottom: insets.bottom + SIZE.space * 2 } as const;
  const paso = (
    <Text style={{ paddingHorizontal: SIZE.space * 2, fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>{pasoDe(3)}</Text>
  );

  if (servicios.data === undefined || mostrados === null || nada) {
    return (
      <View style={marco}>
        {paso}
        <View style={{ flex: 1, padding: SIZE.space * 2, gap: SIZE.space }}>
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
        <View style={{ paddingHorizontal: SIZE.space * 2 }}>
          <BotonLleno variante="discreto" label={ES.queMas.despues} onPress={despues} />
        </View>
      </View>
    );
  }

  const opcion = (fuerte: string, nota: string, apagada = false) => (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: apagada ? PALETTE.tintaApagada : PALETTE.tinta }}>{fuerte}</Text>
      <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{nota}</Text>
    </View>
  );
  const caja = { backgroundColor: PALETTE.superficie, borderWidth: 1, borderColor: PALETTE.linea, borderRadius: 14, paddingHorizontal: SIZE.space, paddingVertical: SIZE.rowGap } as const;

  return (
    <View style={marco}>
      {paso}
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 2, gap: SIZE.space }}>
        <Llega i={0}>
          <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize + 4, ...TITULO, color: PALETTE.tinta }}>
            {ES.queMas.titulo}
          </Text>
        </Llega>
        <Llega i={1} style={{ gap: SIZE.rowGap }}>
          {mostrados.map((servicio) => (
            <View key={servicio} style={[caja, elegidos.has(servicio) && { borderColor: PALETTE.accion, backgroundColor: PALETTE.accionSuave }]}>
              <Casilla
                ticked={elegidos.has(servicio)}
                onToggle={() => cambiar(servicio)}
                label={`${ES.loQueUsas.necesidad[servicio]}. ${ES.loQueUsas.nombre[servicio]}`}
                disabled={busy}
              >
                {opcion(ES.loQueUsas.necesidad[servicio], ES.loQueUsas.nombre[servicio])}
              </Casilla>
            </View>
          ))}
          {menuEnLaEleccion(servicios.data) && (
            <View style={caja}>
              <Casilla ticked={false} onToggle={() => {}} label={`${ES.loQueUsas.necesidad.menu}. ${ES.loQueUsas.proximamente}`} disabled>
                {opcion(ES.loQueUsas.necesidad.menu, ES.loQueUsas.proximamente, true)}
              </Casilla>
            </View>
          )}
        </Llega>
        {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
      </ScrollView>
      <Llega i={2} style={{ paddingHorizontal: SIZE.space * 2, gap: SIZE.rowGap }}>
        <BotonLleno variante="principal" label={ES.queMas.seguir} busy={busy} onPress={() => void seguir()} />
        <BotonLleno variante="discreto" label={ES.queMas.despues} onPress={despues} />
      </Llega>
    </View>
  );
}

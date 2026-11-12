import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Calificaciones } from '@/api/calificaciones';
import { useCalificaciones, useKitchen } from '@/api/hooks';
import { estrellasTexto } from '@/lib/ajustes';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Llega } from '@/ui/Llega';
import { Aclaracion, volverAMiCocina } from '@/ui/PantallaDeAjustes';

// ============================================================================
// *TUS CALIFICACIONES* — plan task `10.5b-iv-c`, on `0080`'s `my_kitchen_ratings`; drawn by
// `10.5b-ii`'s page (round 1's *her ratings* phone, its words) and ruled in its Q3 (2026-11-10):
// THE DAY AFTER, MIXED, NEVER WHO, FROM FIVE. From five: her average and how many, that
// neighbours see it on her page, *Lo que más dicen* (each tag given, the most given first) and
// *De ayer, en desorden* (yesterday's stars and tags, as the database mixed them). Below five:
// how many, and that she and her neighbours see them from the fifth. Nothing here can say who:
// no order, code, name or moment ever arrives. Her neighbours' notes are Wera's alone.
// ⚠️ NOT DRAWN: the round-1 phone's *Reportar* — no function takes a report, and *Hubo un
// problema* on an order already reaches him.
// ============================================================================

export default function TusCalificaciones() {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const lectura = useCalificaciones(kitchen?.id ?? null);
  const c = ES.ajustes.calificaciones;
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={c.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.ajustes.volver, onPress: volverAMiCocina }} />
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3 + insets.bottom, gap: SIZE.space * 1.5 }}>
        {lectura.data === undefined ? (
          lectura.isError ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{c.sinLeer}</Text>
              <BotonLleno label={ES.ajustes.otraVez} busy={lectura.isFetching} onPress={() => void lectura.refetch()} />
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={quiet}>{ES.ajustes.leyendo}</Text>
            </View>
          )
        ) : (
          <Lo calificaciones={lectura.data} />
        )}
        <BotonLleno variante="principal" label={ES.ajustes.listo} onPress={() => (router.canGoBack() ? router.back() : volverAMiCocina())} />
      </ScrollView>
    </View>
  );
}

function Lo({ calificaciones }: { calificaciones: Calificaciones | null }) {
  const c = ES.ajustes.calificaciones;
  const tarjeta = {
    gap: SIZE.rowGap,
    padding: SIZE.space * 1.25,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.linea,
    backgroundColor: PALETTE.superficie,
  } as const;
  const subtitulo = { fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada } as const;

  if (calificaciones === null || calificaciones.kind === 'pocas') {
    return (
      <Llega i={0} style={{ gap: SIZE.space }}>
        <View style={tarjeta}>
          <Text style={{ fontSize: SIZE.bodySize + 2, fontWeight: '700', color: PALETTE.tinta }}>
            {c.pocas(calificaciones?.cuantas ?? 0)}
          </Text>
          <Aclaracion>{c.desdeLaQuinta}</Aclaracion>
        </View>
        <Aclaracion>{c.alDiaSiguiente}</Aclaracion>
        <Aclaracion>{c.nuncaQuien}</Aclaracion>
      </Llega>
    );
  }

  return (
    <Llega i={0} style={{ gap: SIZE.space }}>
      <View style={tarjeta}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: SIZE.space }}>
          <Text
            accessibilityLabel={c.promedioAyuda(calificaciones.promedio, calificaciones.cuantas)}
            style={{ fontSize: 30, ...TITULO, color: PALETTE.tinta }}
          >
            <Text style={{ color: PALETTE.estrella }}>★</Text> {calificaciones.promedio}
          </Text>
          <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{c.cuantas(calificaciones.cuantas)}</Text>
        </View>
        <Aclaracion>{c.enTuPagina}</Aclaracion>
      </View>

      {calificaciones.etiquetas.length > 0 && (
        <View style={tarjeta}>
          <Text style={subtitulo}>{c.loQueDicen}</Text>
          {calificaciones.etiquetas.map((v) => (
            <View key={v.etiqueta} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SIZE.space }}>
              <Text style={{ fontSize: SIZE.bodySize - 1, color: PALETTE.tinta }}>{c.etiqueta[v.etiqueta]}</Text>
              <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.tinta }}>{v.veces}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={tarjeta}>
        <Text style={subtitulo}>{c.deAyer}</Text>
        {calificaciones.ayer.length === 0 ? (
          <Aclaracion>{c.sinAyer}</Aclaracion>
        ) : (
          calificaciones.ayer.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SIZE.space }}>
              <Text accessibilityLabel={c.estrellasAyuda(r.estrellas)} style={{ fontSize: SIZE.bodySize, color: PALETTE.estrella }}>
                {estrellasTexto(r.estrellas)}
              </Text>
              <Text style={{ flexShrink: 1, textAlign: 'right', fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>
                {r.etiquetas.map((e) => c.etiqueta[e]).join(ES.miCocina.separador)}
              </Text>
            </View>
          ))
        )}
      </View>
      <Aclaracion>{c.alDiaSiguiente}</Aclaracion>
      <Aclaracion>{c.nuncaQuien}</Aclaracion>
    </Llega>
  );
}

import { Icono } from '@/ui/Icono';
import { router } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Calificaciones } from '@/api/calificaciones';
import { useCalificaciones, useKitchen } from '@/api/hooks';
import { whatsappUrl } from '@/auth/support';
import { estrellasTexto, reporteTexto } from '@/lib/ajustes';
import { SUPPORT_WHATSAPP } from '@/lib/supportWhatsapp';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
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
// ⚠️ `10.9i` (his ruling of 2026-11-19, D5): *REPORTAR* ON EACH OF YESTERDAY'S RATINGS — the
// round-1 phone's — opens WhatsApp to him with that rating's stars and tags and her kitchen's
// name (`@/lib/ajustes`' `reporteTexto`), as *Hubo un problema* does on an order. No function
// takes a report: he removes a rating by hand. With no support number in the build, nothing is
// drawn, as *Hubo un problema*.
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
          <Lo calificaciones={lectura.data} cocina={kitchen?.displayName ?? null} />
        )}
        <BotonLleno variante="principal" label={ES.ajustes.listo} onPress={() => (router.canGoBack() ? router.back() : volverAMiCocina())} />
      </ScrollView>
    </View>
  );
}

function Lo({ calificaciones, cocina }: { calificaciones: Calificaciones | null; cocina: string | null }) {
  const c = ES.ajustes.calificaciones;
  const tarjeta = {
    gap: SIZE.rowGap,
    padding: SIZE.space * 1.25,
    borderRadius: ESQUINA.hoja,
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
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text accessibilityLabel={c.estrellasAyuda(r.estrellas)} style={{ fontSize: SIZE.bodySize, color: PALETTE.estrella }}>
                  {estrellasTexto(r.estrellas)}
                </Text>
                {r.etiquetas.length > 0 && (
                  <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>
                    {r.etiquetas.map((e) => c.etiqueta[e]).join(ES.miCocina.separador)}
                  </Text>
                )}
              </View>
              {SUPPORT_WHATSAPP !== null && cocina !== null && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={c.reportarAyuda(r.estrellas)}
                  onPress={() => void Linking.openURL(whatsappUrl(SUPPORT_WHATSAPP as string, reporteTexto(r, cocina)))}
                  hitSlop={SIZE.rowGap}
                  style={{ minHeight: SIZE.tapTarget, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SIZE.rowGap }}
                >
                  <Icono name="whatsapp" size={SIZE.smallSize + 4} color={PALETTE.accion} />
                  <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.accion }}>{c.reportar}</Text>
                </Pressable>
              )}
            </View>
          ))
        )}
      </View>
      <Aclaracion>{c.alDiaSiguiente}</Aclaracion>
      <Aclaracion>{c.nuncaQuien}</Aclaracion>
    </Llega>
  );
}

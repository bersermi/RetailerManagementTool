import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { esDuena } from '@/api/equipo';
import { useCerrarTarjeta, useKitchen, usePage, useServicios, useSuRol, useTarjeta } from '@/api/hooks';
import { colorOf } from '@/api/pagina';
import { useNota } from '@/lib/NotaProvider';
import { cuentasDe, diaDeTexto, seLee, tarjetaGuardada, tarjetaViva } from '@/lib/tarjeta';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { FAMILIA_NUMERO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { AsiFunciona, useAsiFunciona } from '@/ui/AsiFunciona';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Fila } from '@/ui/Fila';
import { Grupo } from '@/ui/Grupo';
import { HojaConfirmar } from '@/ui/HojaConfirmar';
import { Llega } from '@/ui/Llega';
import { TarjetaDeLealtad } from '@/ui/TarjetaDeLealtad';

// ============================================================================
// THE CARD'S ONE SCREEN — its tile on *Hoy* opens it, as does *Lo que usas* while she uses it (the
// shell's rule: a service never lives in two places). Plan task `10.9e-ii`, the family-shell page's
// `cTarjeta`: *Así funciona* the first time; the card as her neighbours see it; its three counts —
// cards going, stamps today, rewards to give (`kitchen_card`); *Sellar*; then the owner's — *Tu cartel
// para el mostrador*, *Cambiar el premio, los sellos o cuándo se borran* (new cards only, G12) and
// *Cerrar la tarjeta* behind a sheet (G12: nobody starts a new one; those started finish and claim
// for 30 days).
// ⚠️ NOT SET UP YET, the owner is sent to its setup — her dashed tile opens here — and a helper reads
// that it is not. ⚠️ CLOSED, it stays while its 30 days run (`tarjetaGuardada`): the counts, *Sellar*
// for their last stamps and rewards, until when, and *Abrirla otra vez*. ⚠️ A HELPER (G18) sees the
// counts and *Sellar*, never the poster, the terms or closing.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export default function Tarjeta() {
  const kitchen = useKitchen();
  const kitchenId = kitchen?.id ?? null;
  const servicios = useServicios(kitchenId);
  const tarjeta = useTarjeta(kitchenId, { activa: seLee(servicios.data) });
  const page = usePage(kitchenId);
  const rol = useSuRol(kitchenId).data;
  const duena = esDuena(rol);
  const { cerrar, busy: cerrando } = useCerrarTarjeta(kitchenId);
  const { avisar } = useNota();
  const ahora = useAhora(60_000);
  const [hoja, setHoja] = useState(false);
  const asi = useAsiFunciona(kitchenId ?? '', 'tarjeta');

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const banda = <Banda titulo={ES.tarjeta.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.pestanas.hoy, onPress: volver }} />;
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  if (kitchen === null || tarjeta.data === undefined || page.data === undefined) {
    const fallo = tarjeta.isError || page.isError;
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <View style={{ padding: SIZE.space * 2, gap: SIZE.space }}>
          {fallo ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.tarjeta.sinLeer}</Text>
              <BotonLleno
                label={ES.tarjeta.otraVez}
                busy={tarjeta.isFetching || page.isFetching}
                onPress={() => {
                  void tarjeta.refetch();
                  void page.refetch();
                }}
              />
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={quiet}>{ES.tarjeta.leyendo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const card = tarjeta.data;
  if (card.terms === null || (!card.open && !tarjetaGuardada(card, ahora))) {
    // Never set up — or closed and its 30 days over: the owner prepares it; a helper reads it is not.
    if (duena) return <Redirect href="/preparar-tarjeta" />;
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <Text style={{ margin: SIZE.space * 2, fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.tarjeta.sinPreparar}</Text>
      </View>
    );
  }

  const terms = card.terms;
  const viva = tarjetaViva(card, ahora);
  const muestra = Math.min(3, terms.stamps - 1);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 6, gap: SIZE.space * 1.5 }}>
        {asi.visible && kitchenId !== null && (
          <Llega i={0}>
            <AsiFunciona servicio="tarjeta" onCerrar={asi.cerrar} />
          </Llega>
        )}
        <Llega i={1} style={{ gap: SIZE.rowGap }}>
          <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.tarjeta.asiLaVen}</Text>
          <TarjetaDeLealtad
            cocinaId={kitchen.id}
            nombre={kitchen.displayName}
            color={colorOf(page.data, kitchen.giroPrincipal)}
            logo={page.data.logo}
            sellos={muestra}
            de={terms.stamps}
            premio={terms.reward}
            dias={terms.expiry_days ?? 0}
          />
        </Llega>
        {!card.open && (
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, fontWeight: '600', color: PALETTE.tinta }}>
            {(duena ? ES.tarjeta.cerradaHasta : ES.tarjeta.cerradaHastaAyudante)(diaDeTexto(card.kept_until) ?? '')}
          </Text>
        )}
        <Llega i={2} style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
          {cuentasDe(card).map((c) => (
            <View
              key={c.que}
              style={{ flex: 1, padding: SIZE.space, gap: 2, borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.superficie }}
            >
              <Text style={{ fontSize: SIZE.titleSize + 4, lineHeight: SIZE.titleSize + 8, fontFamily: FAMILIA_NUMERO, fontVariant: ['tabular-nums'], color: PALETTE.tinta }}>{c.n}</Text>
              <Text style={{ fontSize: SIZE.smallSize - 1, lineHeight: 16, color: PALETTE.tintaApagada }}>{c.que}</Text>
            </View>
          ))}
        </Llega>
        {viva && (
          <Llega i={3}>
            <BotonLleno variante="principal" icon="qrcode" label={ES.tarjeta.sellar} onPress={() => router.push('/sellar')} />
          </Llega>
        )}
        {duena && (
          <Llega i={4}>
            {card.open ? (
              <Grupo>
                <Fila icono="file-document-outline" titulo={ES.tarjeta.cartel} detalle={ES.tarjeta.cartelDetalle} onPress={() => router.push('/cartel')} />
                <Fila icono="gift-outline" titulo={ES.tarjeta.cambiar} detalle={ES.tarjeta.cambiarDetalle} onPress={() => router.push('/preparar-tarjeta')} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={ES.tarjeta.cerrar}
                  onPress={() => setHoja(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SIZE.space,
                    minHeight: SIZE.tapTarget + 8,
                    paddingHorizontal: SIZE.space,
                    backgroundColor: pressed ? PALETTE.marcaSuave : PALETTE.superficie,
                  })}
                >
                  <MaterialCommunityIcons name="close" size={SIZE.iconSize} color={PALETTE.error} />
                  <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.error }}>{ES.tarjeta.cerrar}</Text>
                </Pressable>
              </Grupo>
            ) : (
              <Grupo>
                <Fila icono="restore" titulo={ES.tarjeta.abrirOtraVez} detalle={ES.tarjeta.abrirOtraVezDetalle} onPress={() => router.push('/preparar-tarjeta')} />
              </Grupo>
            )}
          </Llega>
        )}
      </ScrollView>
      <HojaConfirmar
        visible={hoja}
        titulo={ES.tarjeta.cerrarTitulo}
        texto={ES.tarjeta.cerrarTexto}
        confirmar={ES.tarjeta.cerrar}
        confirmando={ES.tarjeta.cerrando}
        cancelar={ES.tarjeta.seguirConElla}
        ocupado={cerrando}
        onCerrar={() => setHoja(false)}
        onConfirmar={async () => {
          const fallo = await cerrar();
          if (fallo !== null) return fallo;
          setHoja(false);
          avisar(ES.tarjeta.cerradaNota);
          return null;
        }}
      />
    </View>
  );
}

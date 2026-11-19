import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import type { Kitchen } from '@/api/cocinas';
import { useCocinas, useMiLlave, useTarjetas } from '@/api/hooks';
import type { MyCardRow } from '@/api/tarjeta';
import { codigoEn, comoSeLee, secretoDe, textoDelQR } from '@/lib/codigo';
import { parametro } from '@/lib/paginas';
import { condicionesDeSuTarjeta, enFrase, novedadDe, vistaDe, type Novedad } from '@/lib/tarjeta';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { CodigoQR } from '@/ui/CodigoQR';
import { HojaCobrar } from '@/ui/HojaCobrar';
import { Llega } from '@/ui/Llega';
import { TarjetaDeLealtad } from '@/ui/TarjetaDeLealtad';

// ============================================================================
// *MI CÓDIGO* — HER CODE, FOR THE KITCHEN TO SCAN. Plan task `10.9e-iii` (G10, G16; the family-shell page's
// `iMiCodigo`): the QR (`WERA1:v:<key>:<six digits>`) and its six digits, *Cambia cada minuto*, worked out ON
// HER PHONE every minute from the key it was handed once (`useMiLlave`, `@/lib/codigo`) — ⚠️ WITH NO SIGNAL
// TOO, once the key is kept. The kitchen scans it (*Escanear a tu cliente*, `10.9e-ii`) and gives her stamp.
//   - `premio`: ***COBRAS: …*** — the reward she chose in *Tus premios* (round 3), named in the QR as a fifth
//     part (`10.9e-ii`): the kitchen's scan gives that one at once. *O escanea su código* claims it the other way.
//   - ⚠️ THE KITCHEN'S SCAN TELLS HER PHONE NOTHING: while this screen is in front her cards are read every five
//     seconds (`useTarjetas({ vivo })`) and compared (`novedadDe`) — *Sello en … · 3 de 8*, *Tu primer sello en …*
//     with its conditions, *Cobraste … en …*; a stamp at a kitchen where she has a reward asks *¿Cobrar tu premio
//     ahora?*, and her choice turns this screen into *Cobras: …*. The last stamp's *¡Ganaste!* is `@/lib/Festejos`'.
// ⚠️ A PHONE WHOSE CLOCK RUNS FAR OFF SHOWS A CODE THE DATABASE WILL NOT TAKE: only this minute and the one
// before fit. NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export default function MiCodigo() {
  const params = useLocalSearchParams<{ premio?: string }>();
  const [premioId, setPremioId] = useState<string | null>(parametro(params.premio) || null);
  const enFrente = useIsFocused();
  const tarjetas = useTarjetas({ vivo: enFrente });
  const cocinas = useCocinas();
  const { estado, reintentar, renovar, renovando, renovarFallo } = useMiLlave();
  const ahora = useAhora(1_000);
  const [novedad, setNovedad] = useState<Novedad | null>(null);
  const [hoja, setHoja] = useState<MyCardRow | null>(null);

  // ⚠️ What her cards were when this screen opened: read fresh once on arrival, so a stamp given before she
  // opened it is not said as this scan's.
  const montado = useRef(Date.now());
  const base = useRef<readonly MyCardRow[] | null>(null);
  const { refetch } = tarjetas;
  useEffect(() => {
    void refetch();
  }, [refetch]);
  useEffect(() => {
    const data = tarjetas.data;
    if (data === undefined || tarjetas.dataUpdatedAt < montado.current) return;
    if (base.current === null) {
      base.current = data;
      return;
    }
    const nueva = novedadDe(base.current, data);
    base.current = data;
    // ⚠️ ONLY THE SCREEN IN FRONT SPEAKS (the review of `10.9e-iii`): a second *Mi código* under another screen —
    // *Cobrar* from *Tus premios*, *O escanea su código* — keeps its record and says nothing: never a sheet over
    // the screen in front, never *Cobraste …* replayed on the way back.
    if (nueva === null || !enFrente) return;
    if (nueva.kind === 'cobrado') setPremioId(null);
    if (nueva.kind !== 'gano') setNovedad(nueva);
    if ((nueva.kind === 'sello' || nueva.kind === 'primer') && nueva.card.rewards.length > 0) setHoja(nueva.card);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `enFrente` read, not a reason to compare again
  }, [tarjetas.data, tarjetas.dataUpdatedAt]);

  const premio = premioId === null ? null : (tarjetas.data ?? []).flatMap((c) => c.rewards.map((r) => ({ r, c }))).find((x) => x.r.id === premioId) ?? null;
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/mis-cocinas'));
  const quiet = { fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada } as const;

  const secreto = estado.tipo === 'lista' ? secretoDe(estado.llave.secreto) : null;
  const codigo = secreto === null ? null : codigoEn(secreto, ahora.getTime());
  const puertaDe = (id: string): Kitchen | null => cocinas.data?.find((k) => k.id === id) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda
        titulo={premio === null ? ES.miCodigo.titulo : ES.miCodigo.cobras(enFrase(premio.r.reward))}
        volver={{ label: ES.miCodigo.volver, onPress: volver }}
      />
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 6, gap: SIZE.space * 1.5 }}>
        {novedad !== null ? (
          <LoQuePaso novedad={novedad} puertaDe={puertaDe} onListo={() => setNovedad(null)} quiet={quiet} />
        ) : (
          <>
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>
              {premio === null ? ES.miCodigo.detalle : ES.miCodigo.cobrasDetalle(premio.c.name)}
            </Text>
            <Llega
              i={0}
              style={{ alignItems: 'center', gap: SIZE.rowGap, padding: SIZE.space * 1.5, borderRadius: 18, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}
            >
              {estado.tipo === 'lista' && codigo !== null ? (
                <>
                  <CodigoQR texto={textoDelQR('v', estado.llave.key, codigo, premio === null ? null : premio.r.id)} lado={220} etiqueta={ES.miCodigo.etiquetaQR} />
                  <Text
                    accessibilityLabel={codigo.split('').join(' ')}
                    style={{ fontSize: SIZE.titleSize + 8, ...TITULO, letterSpacing: 3, color: PALETTE.tinta, fontVariant: ['tabular-nums'] }}
                  >
                    {comoSeLee(codigo)}
                  </Text>
                  <Text style={quiet}>{ES.miCodigo.cambia}</Text>
                </>
              ) : estado.tipo === 'preparando' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, minHeight: 120 }}>
                  <ActivityIndicator color={PALETTE.accion} />
                  <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.miCodigo.preparando}</Text>
                </View>
              ) : estado.tipo === 'sinSenal' ? (
                <View style={{ alignItems: 'center', gap: SIZE.rowGap, minHeight: 120, justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="wifi-off" size={28} color={PALETTE.tintaApagada} />
                  <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta, textAlign: 'center' }}>{ES.miCodigo.sinSenal}</Text>
                  <BotonLleno label={ES.miCodigo.otraVez} onPress={reintentar} />
                </View>
              ) : (
                <View style={{ gap: SIZE.rowGap, alignSelf: 'stretch' }}>
                  <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.miCodigo.fallo}</Text>
                  {estado.tipo === 'fallo' && estado.problema !== '' && <Text style={quiet}>{estado.problema}</Text>}
                  <BotonLleno label={ES.miCodigo.otraVez} onPress={reintentar} />
                </View>
              )}
            </Llega>
            {premio !== null && (
              <Llega i={1}>
                <BotonLleno
                  icon="camera-outline"
                  label={ES.miCodigo.oEscanea}
                  onPress={() => router.push({ pathname: '/escanear', params: { premio: premio.r.id, cocina: premio.c.id } })}
                />
              </Llega>
            )}
            {estado.tipo === 'lista' && (
              <Text accessibilityRole="button" onPress={renovando ? undefined : renovar} style={{ ...quiet, textAlign: 'center', textDecorationLine: 'underline' }}>
                {renovando ? ES.miCodigo.renovando : ES.miCodigo.renovar}
              </Text>
            )}
            {estado.tipo === 'lista' && renovarFallo !== null && !renovando && (
              <Text style={{ ...quiet, textAlign: 'center' }}>{renovarFallo === 'sinSenal' ? ES.api.errors.offline : renovarFallo}</Text>
            )}
          </>
        )}
      </ScrollView>
      <HojaCobrar
        visible={hoja !== null}
        cocina={hoja?.name ?? ''}
        premios={hoja?.rewards ?? []}
        busy={false}
        onElegir={(id) => {
          setHoja(null);
          setNovedad(null);
          setPremioId(id);
        }}
        onCerrar={() => setHoja(null)}
      />
    </View>
  );
}

/** What the kitchen's scan did: its line, her card there, and — on a card she just started — its conditions. */
function LoQuePaso({
  novedad,
  puertaDe,
  onListo,
  quiet,
}: {
  novedad: Novedad;
  puertaDe: (id: string) => Kitchen | null;
  onListo: () => void;
  quiet: { readonly fontSize: number; readonly lineHeight: number; readonly color: string };
}) {
  const R = ES.escanear.resultado;
  const puerta = puertaDe(novedad.cocina.id);
  const titulo =
    novedad.kind === 'cobrado'
      ? ES.miCodigo.cobraste(enFrase(novedad.premio), novedad.cocina.name)
      : novedad.kind === 'primer'
        ? R.primer(novedad.cocina.name)
        : novedad.kind === 'sello'
          ? R.sello(novedad.cocina.name, novedad.card.stamps, novedad.card.of ?? 0)
          : R.gano(novedad.cocina.name);
  const card = novedad.kind === 'primer' || novedad.kind === 'sello' ? novedad.card : null;
  const vista = card === null ? null : vistaDe(card, puerta);
  const condiciones = novedad.kind === 'primer' ? condicionesDeSuTarjeta(novedad.card, puerta) : null;
  return (
    <>
      <Llega i={0} style={{ alignItems: 'center', gap: SIZE.rowGap, paddingVertical: SIZE.space }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: PALETTE.accionSuave,
            borderWidth: 1,
            borderColor: PALETTE.accion,
          }}
        >
          <MaterialCommunityIcons name="check" size={30} color={PALETTE.accion} />
        </View>
        <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize - 4, fontWeight: '800', color: PALETTE.tinta, textAlign: 'center' }}>
          {titulo}
        </Text>
      </Llega>
      {vista !== null && (
        <Llega i={1}>
          <TarjetaDeLealtad vista={vista} onPremios={() => router.push({ pathname: '/premios/[cocina]', params: { cocina: vista.cocinaId } })} />
        </Llega>
      )}
      {condiciones !== null && (
        <Llega i={2} style={{ gap: SIZE.rowGap / 2 }}>
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada }}>{ES.tarjeta.condiciones}</Text>
          <Text style={quiet}>{condiciones}</Text>
        </Llega>
      )}
      <Llega i={3}>
        <BotonLleno variante="principal" label={ES.escanear.entendido} onPress={onListo} />
      </Llega>
    </>
  );
}

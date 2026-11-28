import { Icono } from '@/ui/Icono';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { deLaCocina, escaneosEnCola, rechazosDeTarjeta } from '@/api/cola';
import { useKitchen, useLlaveSellar, useServicios, useTarjeta } from '@/api/hooks';
import type { CardRow } from '@/api/tarjeta';
import { useAuth } from '@/auth/AuthProvider';
import { useCola } from '@/lib/cola';
import { codigoEn, comoSeLee, secretoDe, segundosQueQuedan, textoDelQR } from '@/lib/codigo';
import { useNota } from '@/lib/NotaProvider';
import { LINEA_NUEVA_MS, cambiaEn, deHoy, lineaDe, resultadoDe, seLee, tarjetaErrorMessage } from '@/lib/tarjeta';
import { useAhora } from '@/lib/useAhora';
import { useFestejoDelSello } from '@/lib/useFestejos';
import { useSenal } from '@/lib/useSenal';
import { clockOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { TITULO, letraEncabezado } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { CodigoQR } from '@/ui/CodigoQR';
import { Llega } from '@/ui/Llega';

// ============================================================================
// *SELLAR* — THIS PHONE'S CODE, AND WHAT HAPPENS WITH IT (G10, G16, G19; the family-shell page's
// `cSellar`). Plan task `10.9e-ii`.
//   - THE CODE: this phone's key (`register_kitchen_key`, asked once and kept — `useLlaveSellar`), the QR
//     (`WERA1:c:<key>:<six digits>`) and its six digits, worked out ON THE PHONE every minute
//     (`@/lib/codigo`, RFC 6238), with *Cambia en 0:42* and a bar — ⚠️ WITH NO SIGNAL TOO: that is the
//     ruling. A neighbour scans it from Itacate (`stamp_with_code`, `10.9e-iii`), and the database checks
//     it against this phone's secret at that moment; a code lives its minute and the one before.
//   - *ESCANEAR A TU CLIENTE* (`/escanear`): her code, the other way round.
//   - TODAY'S LINES, as they happen: read every five seconds while the screen is up (`kitchen_card`) —
//     *Ana R. · sello 3 de 8*, *Laura · cobra su premio: una comida corrida · entrégaselo* — each new one
//     said in a toast too; then the scans still on this phone and the ones that went late and gave
//     nothing (`@/api/cola`).
// ⚠️ A PHONE WHOSE CLOCK RUNS FAR OFF SHOWS A CODE THE DATABASE WILL NOT TAKE (the review of `10.9e-i`):
// only this minute and the one before fit. Phones set their clocks from the network; nothing here
// corrects one. NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export default function Sellar() {
  const kitchen = useKitchen();
  const kitchenId = kitchen?.id ?? null;
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const servicios = useServicios(kitchenId);
  // ⚠️ Read every five seconds only while it is the screen in front — not under *Escanear* (the review of `10.9e-ii`).
  const enFrente = useIsFocused();
  const tarjeta = useTarjeta(kitchenId, { activa: seLee(servicios.data), vivo: enFrente });
  const { estado, reintentar, renovar, renovando } = useLlaveSellar(kitchenId);
  const senal = useSenal();
  const cola = useCola();
  const ahora = useAhora(1_000);
  const { avisar } = useNota();

  const card = deHoy(tarjeta.data, tarjeta.data === undefined ? null : tarjeta.dataUpdatedAt, ahora);
  // A new line while the screen is up is said in a toast too (the page's *Carmen escaneó tu código: un sello*) —
  // only in front, and only a line of the last two minutes: one already there when it opened is not news.
  const ultima = card?.today[0] ?? null;
  const vista = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (card === undefined) return;
    const clave = ultima === null ? null : lineaDe(ultima).clave;
    const reciente = ultima !== null && Date.now() - new Date(ultima.at).getTime() < LINEA_NUEVA_MS;
    if (enFrente && reciente && vista.current !== undefined && clave !== null && clave !== vista.current && ultima !== null) {
      const linea = lineaDe(ultima);
      avisar(`${linea.quien} · ${linea.que}`);
    }
    vista.current = clave;
  }, [card, ultima, avisar, enFrente]);
  // ⚠️ AFTER the line's toast: her first stamp's celebration takes its place (effects run in this order).
  useFestejoDelSello(kitchenId, card);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const quiet = { fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada } as const;

  const secreto = estado.tipo === 'lista' ? secretoDe(estado.llave.secreto) : null;
  const codigo = secreto === null ? null : codigoEn(secreto, ahora.getTime());
  const queda = segundosQueQuedan(ahora.getTime());

  const envios = deLaCocina(cola, userId, kitchenId);
  const enCola = escaneosEnCola(envios);
  const rechazos = rechazosDeTarjeta(cola, userId, kitchenId, ahora);
  const lineas = (card?.today ?? []).map(lineaDe);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.sellar.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.sellar.volver, onPress: volver }} />
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 6, gap: SIZE.space * 1.5 }}>
        <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.sellar.detalle}</Text>
        <Llega
          i={0}
          style={{ alignItems: 'center', gap: SIZE.rowGap, padding: SIZE.space * 1.5, borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.superficie }}
        >
          {estado.tipo === 'lista' && codigo !== null ? (
            <>
              <CodigoQR texto={textoDelQR('c', estado.llave.key, codigo)} lado={200} etiqueta={ES.sellar.etiquetaQR} />
              <Text
                accessibilityLabel={codigo.split('').join(' ')}
                style={{ fontSize: SIZE.titleSize + 8, ...TITULO, letterSpacing: 3, color: PALETTE.tinta, fontVariant: ['tabular-nums'] }}
              >
                {comoSeLee(codigo)}
              </Text>
              <View style={{ width: 200, height: 6, borderRadius: ESQUINA.marca, backgroundColor: PALETTE.accionSuave, overflow: 'hidden' }}>
                <View style={{ width: `${(queda / 60) * 100}%`, height: 6, backgroundColor: PALETTE.accion }} />
              </View>
              <Text style={quiet}>{ES.sellar.cambiaEn(cambiaEn(ahora.getTime()))}</Text>
            </>
          ) : estado.tipo === 'preparando' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, minHeight: 120 }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.sellar.preparando}</Text>
            </View>
          ) : estado.tipo === 'sinSenal' ? (
            <View style={{ alignItems: 'center', gap: SIZE.rowGap, minHeight: 120, justifyContent: 'center' }}>
              <Icono name="wifi-off" size={28} color={PALETTE.tintaApagada} />
              <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta, textAlign: 'center' }}>{ES.sellar.sinLlave}</Text>
            </View>
          ) : (
            <View style={{ gap: SIZE.rowGap, alignSelf: 'stretch' }}>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.sellar.sinLlaveFallo}</Text>
              {estado.tipo === 'fallo' && estado.problema !== '' && <Text style={quiet}>{estado.problema}</Text>}
              <BotonLleno label={ES.sellar.otraVez} onPress={reintentar} />
            </View>
          )}
        </Llega>
        <Llega i={1}>
          <BotonLleno variante="principal" icon="camera-outline" label={ES.sellar.escanear} onPress={() => router.push('/escanear')} />
        </Llega>
        {estado.tipo === 'lista' && senal !== false && (
          <Text accessibilityRole="button" onPress={renovando ? undefined : renovar} style={{ ...quiet, textAlign: 'center', textDecorationLine: 'underline' }}>
            {renovando ? ES.sellar.renovando : ES.sellar.renovar}
          </Text>
        )}
        {senal === false && estado.tipo === 'lista' && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SIZE.rowGap }}>
            <Icono name="wifi-off" size={18} color={PALETTE.tintaApagada} style={{ marginTop: 1 }} />
            <Text style={{ ...quiet, flex: 1 }}>{ES.sellar.sinSenal}</Text>
          </View>
        )}
        <Llega i={2} style={{ gap: SIZE.rowGap }}>
          <Text style={{ ...letraEncabezado(SIZE), color: PALETTE.tinta }}>
            {ES.sellar.hoy}
          </Text>
          <View style={{ borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.superficie, overflow: 'hidden' }}>
            {enCola.map((e) => (
              <Renglon
                key={`cola:${e.reserva}`}
                icono="cloud-upload-outline"
                arriba={e.tipo === 'sello' ? ES.sellar.enCola.sello : ES.sellar.enCola.premio}
                abajo={ES.sellar.enCola.detalle(clockOf(new Date(e.en)))}
              />
            ))}
            {rechazos.map((r) => (
              <Renglon
                key={`no:${r.reserva}`}
                icono="alert-circle-outline"
                color={PALETTE.error}
                arriba={
                  r.tipo === 'premio'
                    ? ES.sellar.noSeDio.premio(clockOf(new Date(r.escaneo ?? r.en)))
                    : ES.sellar.noSeDio.sello(clockOf(new Date(r.escaneo ?? r.en)))
                }
                abajo={
                  r.resultado !== undefined
                    ? (resultadoDe({ result: r.resultado as CardRow['result'], name: r.nombre ?? null })?.texto ?? '')
                    : tarjetaErrorMessage({ code: r.codigo, message: r.mensaje })
                }
              />
            ))}
            {lineas.map((l) => (
              <Renglon key={l.clave} icono={l.entregar ? 'gift-outline' : 'stamper'} arriba={`${l.quien} · ${l.que}`} abajo={l.detalle} resaltar={l.entregar} />
            ))}
            {enCola.length === 0 && rechazos.length === 0 && lineas.length === 0 && (
              <Text style={{ ...quiet, padding: SIZE.space }}>{tarjeta.data === undefined ? ES.tarjeta.leyendo : ES.sellar.nadieHoy}</Text>
            )}
          </View>
        </Llega>
      </ScrollView>
    </View>
  );
}

function Renglon({
  icono,
  arriba,
  abajo,
  color = PALETTE.accion,
  resaltar = false,
}: {
  icono: 'cloud-upload-outline' | 'alert-circle-outline' | 'gift-outline' | 'stamper';
  arriba: string;
  abajo: string;
  color?: string;
  resaltar?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.space,
        padding: SIZE.space,
        borderTopWidth: 1,
        borderTopColor: PALETTE.linea,
        marginTop: -1,
        backgroundColor: resaltar ? PALETTE.marcaSuave : PALETTE.superficie,
      }}
    >
      <Icono name={icono} size={SIZE.iconSize} color={resaltar ? PALETTE.marca : color} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tinta }}>{arriba}</Text>
        {abajo !== '' && <Text style={{ fontSize: SIZE.smallSize - 0.5, lineHeight: 18, color: PALETTE.tintaApagada }}>{abajo}</Text>}
      </View>
    </View>
  );
}

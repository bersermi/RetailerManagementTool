import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useApartados, useKitchen, useKitchenGiros, useListings, usePage, usePlace } from '@/api/hooks';
import { giroLabel, type Kitchen } from '@/api/kitchen';
import { addressComplete } from '@/api/place';
import { entregadosHoy, loQueSigue, ordenesDe, tomadosDe } from '@/lib/apartados';
import { chipDe, diaDe, estadoDe, faltaDeLaPagina, faltanDe, nombreDe, repetibles, PENDIENTES } from '@/lib/hoy';
import { useNota } from '@/lib/NotaProvider';
import { useRecordatorio } from '@/lib/RecordatorioProvider';
import { preguntar } from '@/lib/recordatorio';
import { usePuertaCerrada } from '@/lib/puerta';
import { useAhora } from '@/lib/useAhora';
import { useRepetir } from '@/lib/useRepetir';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { DiaDeHoy } from '@/ui/DiaDeHoy';
import { LeyendoCocina } from '@/ui/LeyendoCocina';
import { Llega } from '@/ui/Llega';
import { LoQueSigue } from '@/ui/LoQueSigue';
import { PreguntaRecordatorio } from '@/ui/PreguntaRecordatorio';
import { Puertas, type PuertaDeHoy } from '@/ui/Puertas';
import { SinSenal } from '@/ui/SinSenal';

// ============================================================================
// *HOY* — A HUB. Plan task `10.5-v-c-i`, the owner's directions of 2026-11-06 (the
// family-shell page's round 6): *"show the users everything in a dashborad/hub way,
// for them to easily reach the main actions with some indicators such as remaining
// items"*. Every launch opens here. Top to bottom, each zone a number and a door:
//   1. THE DAY (`@/ui/DiaDeHoy`) — what is on offer, until when, the time left; the
//      whole card opens *Tus ofertas*;
//   2. *LO QUE SIGUE* (`@/ui/LoQueSigue`, `10.5b-iv-a`) — the next handover, its hour, its
//      code and what to charge, with *Entregar*, and how many more; drawn only while something
//      is still to hand over. Since the same row the day's card says what is LEFT, *Quedan 4
//      de 8*, and how many she handed over, from her reservations (`useApartados`, the same
//      query the tab reads);
//   3. THE ONE ACTION — *Publicar una oferta*, and her last day's offers as *Repetir*
//      chips, one tap each, with *Deshacer* (`@/lib/useRepetir`);
//   4. THE DOORS (`@/ui/Puertas`) — *Tu página · 3 de 5*, which she closes with its ✕
//      (*Deshacer* in the toast); the services' cards join as each ships;
//   5. HER REMINDER'S QUESTION, ONCE (`@/ui/PreguntaRecordatorio`, `10.5-v-c-ii`) — after
//      her third offer, while the rule finds her hour and her days; either answer and it
//      is gone from this phone, the reminder kept in *Mi cocina*.
//   0. `10.5b-iv-b`: ABOVE THEM, WITH NO SIGNAL OR WHILE ANYTHING WAITS (`@/ui/SinSenal`) — when what
//      she sees was read, and what is still on the phone to send. Her kitchen, her offers and her
//      orders are the phone's copy then (`@/api/persist`), so *Lo que sigue* works with no signal.
// ⚠️ NOTHING ON *HOY* IS EDITED IN PLACE: correcting a count is in *Tus ofertas*.
// *Así te ven los vecinos* left *Hoy* for *Mi cocina* (his direction).
//
// ⚠️ WHAT EACH ZONE SAYS IS `@/lib/hoy`'s, PURE, pinned by `test/hoy.test.ts`; the clock
// is read again every half minute while the screen is up, so the bar shortens and an
// ended window moves to *Terminada* on its own. ⚠️ `unknown` IS NOT `none`: her list not
// read yet is a wheel, a failed read a sentence and *Intentar de nuevo*. The door waits
// for every read it counts, so it never shows a count that changes under her thumb.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** How often the clock is read again while *Hoy* is up. */
const CADA_MEDIO_MINUTO = 30_000;

export default function Hoy() {
  const kitchen = useKitchen();
  if (kitchen === null) return <LeyendoCocina titulo={ES.nombre} />;
  // Keyed on the kitchen: when one goes and her next-made opens, its door is its own.
  return <HoyDe key={kitchen.id} kitchen={kitchen} />;
}

function HoyDe({ kitchen }: { kitchen: Kitchen }) {
  const giros = useKitchenGiros();
  const place = usePlace(kitchen.id);
  const page = usePage(kitchen.id);
  const listings = useListings(kitchen.id);
  const apartados = useApartados(kitchen.id);
  const ahora = useAhora(CADA_MEDIO_MINUTO);
  const [cerrada, setCerrada] = usePuertaCerrada(kitchen.id);
  const { avisar } = useNota();
  const { repetir, busyId } = useRepetir(kitchen);
  const recordatorio = useRecordatorio();

  const trade = giroLabel(giros.data, kitchen.giroPrincipal);
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  const chips = listings.data === undefined ? [] : repetibles(listings.data, ahora);
  // ⚠️ `10.5b-iv-a`: until her reservations are read the card counts what is on offer.
  const ordenes = apartados.data === undefined ? null : ordenesDe(apartados.data.reservas, apartados.data.vecinos, ahora);
  const cuentas =
    apartados.data === undefined || ordenes === null
      ? null
      : { tomados: tomadosDe(apartados.data.reservas), entregados: entregadosHoy(ordenes, ahora) };
  const sigue = ordenes === null ? null : loQueSigue(ordenes, ahora);

  const puertas: PuertaDeHoy[] = [];
  if (!cerrada && listings.data !== undefined && place.data !== undefined && page.data !== undefined) {
    const faltan = faltanDe(
      estadoDe({
        giro: kitchen.giroPrincipal,
        direccionCompleta: addressComplete(place.data),
        frase: page.data.sentence,
        portada: page.data.cover,
        listings: listings.data,
      }),
    );
    if (faltan.length > 0) {
      puertas.push({
        key: 'pagina',
        icono: 'storefront-outline',
        titulo: ES.puertas.pagina,
        valor: ES.pendientes.cuenta(PENDIENTES.length - faltan.length, PENDIENTES.length),
        detalle: faltaDeLaPagina(faltan),
        onPress: () => router.navigate('/mi-cocina'),
        onCerrar: () => {
          setCerrada(true);
          avisar(ES.nota.paginaCerrada, () => setCerrada(false));
        },
      });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={kitchen.displayName} antetitulo={trade ?? ES.cocina.antetitulo} />
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 8, gap: SIZE.space * 1.5 }}>
        <SinSenal sinSenal={apartados.sinSenal} leidoEn={apartados.leidoEn} porEnviar={apartados.porEnviar} ahora={ahora} />
        <Llega i={0}>
          {listings.data !== undefined ? (
            <DiaDeHoy dia={diaDe(listings.data, ahora, cuentas)} ahora={ahora} onPress={() => router.push('/ofertas')} />
          ) : listings.isError ? (
            <View style={{ gap: SIZE.rowGap }}>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.publicaciones.sinLeer}</Text>
              <BotonLleno label={ES.cocina.otraVez} busy={listings.isFetching} onPress={() => void listings.refetch()} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, minHeight: SIZE.tapTarget * 2 }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={quiet}>{ES.publicaciones.leyendo}</Text>
            </View>
          )}
        </Llega>

        {sigue !== null && (
          <Llega i={1}>
            <LoQueSigue
              siguiente={sigue.siguiente}
              mas={sigue.mas}
              ahora={ahora}
              onEntregar={() => router.push('/entregar')}
              onApartados={() => router.navigate('/apartados')}
            />
          </Llega>
        )}

        <Llega i={2} style={{ gap: SIZE.rowGap + 2 }}>
          <BotonLleno variante="principal" icon="plus" label={ES.publicar.abrir} onPress={() => router.push('/publicar')} />
          {chips.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SIZE.rowGap, alignItems: 'center' }}>
              <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>{ES.hoy.repetir}</Text>
              {chips.map((listing) => {
                const busy = busyId === listing.id;
                return (
                  <Pressable
                    key={listing.id}
                    accessibilityRole="button"
                    accessibilityLabel={ES.hoy.chipAyuda(nombreDe(listing))}
                    accessibilityState={{ disabled: busyId !== null }}
                    disabled={busyId !== null}
                    onPress={() => void repetir(listing)}
                    style={({ pressed }) => ({
                      minHeight: SIZE.tapTarget - 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: SIZE.space,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: PALETTE.accion,
                      backgroundColor: pressed ? PALETTE.accionSuave : PALETTE.superficie,
                      opacity: busyId !== null && !busy ? 0.6 : 1,
                    })}
                  >
                    {busy ? (
                      <ActivityIndicator color={PALETTE.accion} />
                    ) : (
                      <MaterialCommunityIcons name="repeat" size={16} color={PALETTE.accion} />
                    )}
                    <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{chipDe(listing)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Llega>

        {puertas.length > 0 && (
          <Llega i={3}>
            <Puertas puertas={puertas} />
          </Llega>
        )}

        {recordatorio.propuesta !== null && preguntar(recordatorio.guardado, recordatorio.propuesta) && (
          <Llega i={4}>
            <PreguntaRecordatorio
              propuesta={recordatorio.propuesta}
              ocupado={recordatorio.ocupado}
              onSi={recordatorio.si}
              onOtraHora={recordatorio.abrirHoja}
              onNo={recordatorio.noGracias}
            />
          </Llega>
        )}
      </ScrollView>
    </View>
  );
}

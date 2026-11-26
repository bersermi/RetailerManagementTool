import MaterialCommunityIcons from '@/marca/Icono';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { esDuena } from '@/api/equipo';
import {
  useApartados,
  useContarMenu,
  useKitchen,
  useKitchenGiros,
  useListings,
  useNumeros,
  usePage,
  usePlace,
  usePromociones,
  useSeguidores,
  useServicios,
  useSuRol,
  useTarjeta,
} from '@/api/hooks';
import { giroLabel, type Kitchen } from '@/api/kitchen';
import type { Numeros } from '@/api/numeros';
import type { PromotionsRow } from '@/api/promociones';
import { addressComplete } from '@/api/place';
import { entregadosHoy, loQueSigue, ordenesDe, tomadosDe } from '@/lib/apartados';
import { mosaicosPara } from '@/lib/ayudante';
import { cerrarServicio, useMemoria, verHoy, type Linea } from '@/lib/empujones';
import { chipDe, diaDe, estadoDe, ICONO_DE_PENDIENTE, nombreDe, repetibles } from '@/lib/hoy';
import { cuentanosEnHoy, ICONO_DE, mosaicosDe, PANTALLA_DE, type Elegible, type EnVivo } from '@/lib/loQueUsas';
import { useNota } from '@/lib/NotaProvider';
import { enVivoDe as numerosEnVivo, leidoHoy, veSusNumeros } from '@/lib/numeros';
import { enVivoDe as promocionesEnVivo, seLeen as seLeenPromociones } from '@/lib/promociones';
import { useRecordatorio } from '@/lib/RecordatorioProvider';
import { preguntar } from '@/lib/recordatorio';
import { usePuertaCerrada } from '@/lib/puerta';
import { deHoy, enVivoDe, seLee, tarjetaGuardada } from '@/lib/tarjeta';
import { useAhora } from '@/lib/useAhora';
import { useFestejoDelSello } from '@/lib/useFestejos';
import { useAlAbrir } from '@/lib/useGoogle';
import { useRepetir } from '@/lib/useRepetir';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { esq } from '@/theme/piel';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Brillo } from '@/ui/Brillo';
import { HojaCuentanos, LineaCuentanos } from '@/ui/Cuentanos';
import { DiaDeHoy, Invitacion } from '@/ui/DiaDeHoy';
import { LeyendoCocina } from '@/ui/LeyendoCocina';
import { LineaEmpujon } from '@/ui/LineaEmpujon';
import { Llega } from '@/ui/Llega';
import { LoQueSigue } from '@/ui/LoQueSigue';
import { Mosaicos } from '@/ui/Mosaicos';
import { PreguntaRecordatorio } from '@/ui/PreguntaRecordatorio';
import { SinSenal } from '@/ui/SinSenal';

// ============================================================================
// *HOY* — A HUB. Plan task `10.5-v-c-i`, the owner's directions of 2026-11-06 (the
// family-shell page's round 6): *"show the users everything in a dashborad/hub way,
// for them to easily reach the main actions with some indicators such as remaining
// items"*. Every launch opens here. Top to bottom, each zone a number and a door:
//   1. THE DAY (`@/ui/DiaDeHoy`) — what is on offer, until when, the time left; the
//      whole card opens *Tus ofertas*. ⚠️ `10.9d-ii` (G22): and *Te siguen 38 vecinos*, how many
//      neighbours follow her kitchen, never who (`useSeguidores`) — her helpers see it too. ⚠️ `10.9a-iii`: until her first offer, the invitation
//      instead — *¿Tienes alguna oferta? Publícala y tus vecinos la verán* — opening *Publicar*;
//   1b. `10.9a-iii`: UNDER IT, AT MOST ONE QUIET LINE (`@/ui/LineaEmpujon`) — her page's next
//      missing part, or a feature she did not pick; only on a day she published; ✕ with *Deshacer*;
//   2. *LO QUE SIGUE* (`@/ui/LoQueSigue`, `10.5b-iv-a`) — the next handover, its hour, its
//      code and what to charge, with *Entregar*, and how many more; drawn only while something
//      is still to hand over. Since the same row the day's card says what is LEFT, *Quedan 4
//      de 8*, and how many she handed over, from her reservations (`useApartados`, the same
//      query the tab reads);
//   3. THE ONE ACTION — *Publicar una oferta*, and her last day's offers as *Repetir*
//      chips, one tap each, with *Deshacer* (`@/lib/useRepetir`). `10.9a-iii`: until her first
//      offer it glows once each time she opens the app, on her first three days (`@/ui/Brillo`);
//   4. `10.9a-iii`: THE TILES (`@/ui/Mosaicos`) — one per feature she uses, in the fixed order,
//      each opening its one screen; dashed until set up. They took the place of *Tu página · 3 de 5*,
//      gone with every count of what she has not done. ⚠️ `10.9e-ii`: THE CARD'S — *6 sellos hoy*,
//      *1 premio por entregar* with its dot, and *Sellar* on it (`kitchen_card`, kept on the phone so it
//      draws with no signal); closed, it stays while its 30 days run; unread, it waits. ⚠️ `10.9f`: HER
//      NUMBERS' — this week's plates against the whole week before (`kitchen_numbers`, the owner's alone),
//      *Empiezan con tu primera entrega* dashed until her first visit; unread, it waits; a failed read says so.
//      ⚠️ `10.9g-ii`: PROMOTIONS' — the newest running, *Hasta el 30 de noviembre · y 1 más*, or *Ninguna ahora*;
//      *Crea tu primera promoción* dashed until her first (`kitchen_promotions`, the owner's tile); unread, it waits;
//   5. HER REMINDER'S QUESTION, ONCE (`@/ui/PreguntaRecordatorio`, `10.5-v-c-ii`) — after
//      her third offer, while the rule finds her hour and her days; either answer and it
//      is gone from this phone, the reminder kept in *Mi cocina*.
//   6. `10.9a-ii`: AT THE FOOT, *CUÉNTANOS CÓMO NECESITAS TU MENÚ* (`@/ui/Cuentanos`, G45) — while
//      every *Próximamente* may show (after both stores approve), until her kitchen told us once
//      or she closed it with ✕ on this phone (`@/lib/loQueUsas`' `cuentanosEnHoy`). Absent today.
//   0. `10.5b-iv-b`: ABOVE THEM, WITH NO SIGNAL OR WHILE ANYTHING WAITS (`@/ui/SinSenal`) — when what
//      she sees was read, and what is still on the phone to send. Her kitchen, her offers and her
//      orders are the phone's copy then (`@/api/persist`), so *Lo que sigue* works with no signal.
// ⚠️ `10.9a-iii`: WHAT THE NUDGES SAY IS `@/lib/empujones`' (`verHoy`), PURE, pinned by
// `test/empujones.test.ts`; what was seen is kept on this phone, per kitchen, marked once a day
// from an effect (`registrar`). *Cuéntanos* is a *Próximamente*, not a nudge line.
// ⚠️⚠️ `10.9b-ii`: A HELPER'S *HOY* (the family-shell page's *Ayudante*; G18, G36) — her role is read
// per kitchen and kept on the phone (`useSuRol`). She sees the day's card, *Lo que sigue* with
// *Entregar*, *Publicar* and *Repetir* — and the invitation and its glow, which are publishing's —
// and, once the card exists (`10.9e`), its tile (`@/lib/ayudante`' `mosaicosPara`). NEVER the other
// tiles, the line about her page or the features (`verHoy`'s `duena`), the reminder's question or
// *Cuéntanos*: each is the owner's. The band says *Ayudas en esta cocina*. ⚠️ UNTIL HER ROLE IS READ,
// NOBODY IS THE OWNER: what is hers fades in, and is never shown to a helper and taken away.
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

/**
 * `10.9e-ii`: the card's live words, with *Sellar* on its tile (the page's `cardTile`). ⚠️ `10.9f`: and her
 * numbers' — `undefined` while unread (no words: the tile waits), `null` when the read failed. ⚠️ `10.9g-ii`: and
 * promotions', the same way.
 */
function vivosDe(
  card: Parameters<typeof enVivoDe>[0],
  numeros: Numeros | null | undefined,
  promociones: PromotionsRow | null | undefined,
  ahora: Date,
): Partial<Record<Elegible, EnVivo>> {
  const vivos: Partial<Record<Elegible, EnVivo>> = {};
  const vivo = enVivoDe(card, ahora);
  if (vivo !== null) vivos.tarjeta = { ...vivo, accion: { etiqueta: ES.tarjeta.sellar, abre: '/sellar' } };
  const cuentas = numeros === undefined ? null : numerosEnVivo(numeros);
  if (cuentas !== null) vivos.numeros = cuentas;
  const corren = promociones === undefined ? null : promocionesEnVivo(promociones);
  if (corren !== null) vivos.promociones = corren;
  return vivos;
}

/** `10.9e-ii`: the card closed, while those who started it may finish it — its tile stays (G12). */
function ademasDe(card: Parameters<typeof enVivoDe>[0], ahora: Date): Elegible[] {
  return tarjetaGuardada(card, ahora) ? ['tarjeta'] : [];
}


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
  const seguidores = useSeguidores(kitchen.id);
  const ahora = useAhora(CADA_MEDIO_MINUTO);
  // `10.9b-ii`: what is the owner's is drawn for the owner alone — not while her role is unread.
  const rol = useSuRol(kitchen.id).data;
  const duena = esDuena(rol);
  const ayudante = rol !== undefined && rol !== null && !duena;
  // `10.9a-iii`: her page's line ended with its ✕ — the key her page's door kept since `10.5-v-c-i`.
  const [cerrada, setCerrada] = usePuertaCerrada(kitchen.id);
  const [memoria, cambiar] = useMemoria(kitchen.id);
  const abierto = useAlAbrir();
  const { avisar } = useNota();
  const { repetir, busyId } = useRepetir(kitchen);
  const recordatorio = useRecordatorio();
  // `10.9a-ii`: *Cuéntanos*, at the foot.
  const servicios = useServicios(kitchen.id);
  const [menuCerrado, setMenuCerrado] = usePuertaCerrada(kitchen.id, 'menu');
  const { enviar, busy: enviando } = useContarMenu(kitchen.id);
  // `10.9e-ii`: her card's tile — its words, *Sellar* on it, and her first stamp celebrated.
  const tarjetaLeida = useTarjeta(kitchen.id, { activa: seLee(servicios.data) });
  // ⚠️ A copy read on another day says nothing of today (`deHoy`).
  const tarjetaDeHoy = deHoy(tarjetaLeida.data, tarjetaLeida.data === undefined ? null : tarjetaLeida.dataUpdatedAt, ahora);
  useFestejoDelSello(kitchen.id, tarjetaDeHoy);
  // ⚠️ `10.9f`: her numbers' tile — asked only on the owner's phone, while she uses them and this build carries them.
  const numerosLeidos = useNumeros(kitchen.id, { activa: veSusNumeros(servicios.data, duena) });
  const numerosDeHoy =
    numerosLeidos.data !== undefined && leidoHoy(numerosLeidos.dataUpdatedAt, ahora) ? numerosLeidos.data : undefined;
  // A read from another day is read again (`leidoHoy`) — not while one failed, which the tile says.
  // ⚠️ With no signal the read PAUSES rather than fail — the tile says it could not read them either way.
  const numerosSinLeer = numerosLeidos.isError || numerosLeidos.fetchStatus === 'paused';
  const numerosOtraVez = numerosLeidos.data !== undefined && numerosDeHoy === undefined && !numerosLeidos.isFetching && !numerosSinLeer;
  const { refetch: releerNumeros } = numerosLeidos;
  useEffect(() => {
    if (numerosOtraVez) void releerNumeros();
  }, [numerosOtraVez, releerNumeros]);
  // ⚠️ `10.9g-ii`: promotions' tile — the owner's, asked only while she uses them and this build carries them.
  const promocionesLeidas = usePromociones(kitchen.id, { activa: duena && seLeenPromociones(servicios.data) });
  const promocionesSinLeer = promocionesLeidas.isError || promocionesLeidas.fetchStatus === 'paused';
  // Read wins over a later refetch that failed; with none, a failed or paused read is said (`null`).
  const promocionesVivas = promocionesLeidas.data ?? (promocionesSinLeer ? null : undefined);
  const [hojaMenu, setHojaMenu] = useState(false);

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

  // ⚠️ `10.9a-iii`: the nudges — each waits for the reads it counts.
  const estado =
    place.data === undefined || page.data === undefined || listings.data === undefined
      ? null
      : estadoDe({
          giro: kitchen.giroPrincipal,
          direccionCompleta: addressComplete(place.data),
          frase: page.data.sentence,
          portada: page.data.cover,
          listings: listings.data,
        });
  const vista =
    listings.data === undefined
      ? null
      : verHoy(memoria, { listings: listings.data, estado, loQueUsa: servicios.data ?? null, paginaCerrada: cerrada, ahora, duena });
  // Today's marks — the glow's day, the line's day — once each time what they mark changes.
  const marca = vista?.marca ?? null;
  useEffect(() => {
    if (vista !== null) cambiar(vista.registrar);
    // `marca` names everything `registrar` marks; the function itself is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca, cambiar]);
  // Today's read wins over a later refetch that failed; with none, a failed or paused read is said (`null`).
  const numerosVivos = numerosDeHoy ?? (numerosSinLeer ? null : undefined);
  const mosaicos = mosaicosPara(mosaicosDe(servicios.data, vivosDe(tarjetaDeHoy, numerosVivos, promocionesVivas, ahora), PANTALLA_DE, ademasDe(tarjetaDeHoy, ahora)), duena)
    // ⚠️ The card's tile waits for its read: never *Prepara tu tarjeta* drawn and then taken away.
    .filter((m) => m.servicio !== 'tarjeta' || tarjetaDeHoy !== undefined || tarjetaLeida.isError)
    // ⚠️ `10.9f`: and so does her numbers' — never *Empiezan con tu primera entrega* over a kitchen that has some.
    .filter((m) => m.servicio !== 'numeros' || numerosVivos !== undefined)
    // ⚠️ `10.9g-ii`: and promotions' — never *Crea tu primera promoción* over a kitchen that has one running.
    .filter((m) => m.servicio !== 'promociones' || promocionesVivas !== undefined);

  function abrirLinea(linea: Linea) {
    router.push(linea.abre);
  }

  function cerrarLinea(linea: Linea) {
    if (linea.kind === 'pagina') {
      setCerrada(true);
      avisar(ES.nota.paginaCerrada, () => setCerrada(false));
      return;
    }
    cambiar((m) => cerrarServicio(m, linea.servicio, true));
    avisar(ES.empujon.servicioQuitado, () => cambiar((m) => cerrarServicio(m, linea.servicio, false)));
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={kitchen.displayName} antetitulo={ayudante ? ES.ayudante.antetitulo : (trade ?? ES.cocina.antetitulo)} />
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 8, gap: SIZE.space * 1.5 }}>
        <SinSenal sinSenal={apartados.sinSenal} leidoEn={apartados.leidoEn} porEnviar={apartados.porEnviar} ahora={ahora} />
        <Llega i={0}>
          {vista?.invitacion ? (
            <Invitacion onPress={() => router.push('/publicar')} />
          ) : listings.data !== undefined ? (
            <DiaDeHoy
              dia={diaDe(listings.data, ahora, cuentas)}
              ahora={ahora}
              teSiguen={seguidores.data ?? null}
              onPress={() => router.push('/ofertas')}
            />
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

        {vista?.linea != null && (
          <LineaEmpujon
            icono={vista.linea.kind === 'pagina' ? ICONO_DE_PENDIENTE[vista.linea.pendiente] : ICONO_DE[vista.linea.servicio]}
            texto={vista.linea.kind === 'pagina' ? ES.empujon.pagina[vista.linea.pendiente] : ES.empujon.servicio[vista.linea.servicio]}
            onPress={() => abrirLinea(vista.linea as Linea)}
            onCerrar={() => cerrarLinea(vista.linea as Linea)}
          />
        )}

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
          <Brillo activo={vista?.brilla === true} vez={abierto}>
            <BotonLleno variante="principal" icon="plus" label={ES.publicar.abrir} onPress={() => router.push('/publicar')} />
          </Brillo>
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
                      borderRadius: esq(999),
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

        {mosaicos.length > 0 && (
          <Llega i={3}>
            <Mosaicos mosaicos={mosaicos} />
          </Llega>
        )}

        {duena && recordatorio.propuesta !== null && preguntar(recordatorio.guardado, recordatorio.propuesta) && (
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

        {duena && cuentanosEnHoy(servicios.data, menuCerrado) && (
          <Llega i={5}>
            <LineaCuentanos
              onAbrir={() => setHojaMenu(true)}
              onCerrar={() => {
                setMenuCerrado(true);
                avisar(ES.cuentanos.quitado, () => setMenuCerrado(false));
              }}
            />
          </Llega>
        )}
      </ScrollView>
      <HojaCuentanos
        visible={hojaMenu}
        ocupado={enviando}
        onCerrar={() => setHojaMenu(false)}
        onEnviar={async (texto) => {
          const problema = await enviar(texto);
          if (problema === null) {
            setHojaMenu(false);
            avisar(ES.cuentanos.gracias);
          }
          return problema;
        }}
      />
    </View>
  );
}

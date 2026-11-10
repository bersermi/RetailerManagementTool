import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { apiErrorMessage } from '@/api/errors';
import { useApartados, useCocinas, usePosicion } from '@/api/hooks';
import type { Dish, Kitchen, Offer } from '@/api/cocinas';
import { formatMXN } from '@/format/mxn';
import { esDeEstePlatillo, pieDe } from '@/lib/apartar';
import { distanciaTexto } from '@/lib/distancia';
import { useDistancia } from '@/lib/DistanciasProvider';
import { lineaDe, parametro, platilloDe } from '@/lib/paginas';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { FilaCocina } from '@/ui/FilaCocina';
import { HojaApartar } from '@/ui/HojaApartar';
import { PaginaDePlatillo } from '@/ui/PaginaDePlatillo';
import { PaginaVacia } from '@/ui/PaginaVacia';
import { PieDeApartar } from '@/ui/PieDeApartar';

// ============================================================================
// A DISH'S PAGE — ITS ROUTE. Plan task `10.5-iv-a-ii`, proposal B (the owner's ruling
// of 2026-11-01). What it draws is `@/ui/PaginaDePlatillo`'s since `10.5-v-c-ii`, the
// same screen Wera Cocina's *Así la ven* draws.
//
// ⚠️ THE DISH IS THE LIST'S, found by her kitchen, its publication and its line in the
// door's answer (in memory). A window that ends while she reads turns the page into
// *Este platillo ya no está en oferta*, with her kitchen's row still there while the
// door sends her (`@/lib/paginas`' `platilloDe`).
//
// ⚠️ SINCE `10.5b-iii-a` IT RESERVES: the page's foot is *Apartar · $65*, or why not
// (`@/lib/apartar`'s `pieDe`, over her reservations and her standing), and *Apartar* opens
// the sheet (`@/ui/HojaApartar`) — her yes first, the one time it is owed. Her code and
// her score are tabs: the page is closed back to them (`router.dismissTo`), never pushed
// over (a tab pushed from a stack screen stacks the tabs again). ⚠️ THE SHEET KEEPS THE DISH
// IT OPENED ON (`abierta`), and is drawn whatever the page draws: the door is read again
// after she reserves, and once the LAST plate is hers it no longer sends the dish — the
// page turns into *ya no está en oferta*, and the sheet with her code must not go with it
// (found by the review of `10.5b-iii-a`). That page then still leads to her code. ⚠️ NO
// CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** How often the page is made again while she reads, so an ended window is over on screen. */
const CADA_MINUTO = 60_000;

export default function PaginaDelPlatillo() {
  const params = useLocalSearchParams<{ cocina: string; oferta: string; linea: string }>();
  const cocinaId = parametro(params.cocina);
  const cocinas = useCocinas();
  const ahora = useAhora(CADA_MINUTO);
  const metros = useDistancia(cocinaId);
  const distancia = metros === null ? null : distanciaTexto(metros);
  const apartados = useApartados();
  const posicion = usePosicion();
  const [apartando, setApartando] = useState(false);
  /** The dish the sheet opened on — kept while the sheet is open and after, see the header. */
  const [abierta, setAbierta] = useState<{ readonly cocina: Kitchen; readonly oferta: Offer; readonly platillo: Dish } | null>(null);

  const estado = platilloDe(cocinas.data, cocinaId, parametro(params.oferta), lineaDe(parametro(params.linea)), ahora);
  const abrirCocina = (id: string) => router.push({ pathname: '/cocina/[id]', params: { id } });
  const verApartados = () => {
    setApartando(false);
    router.dismissTo('/apartados');
  };

  const hoja =
    abierta === null ? null : (
      <HojaApartar
        key="hoja"
        visible={apartando}
        cocina={abierta.cocina}
        oferta={abierta.oferta}
        platillo={abierta.platillo}
        distancia={distancia}
        posicion={posicion.data}
        ahora={ahora}
        onCerrar={() => setApartando(false)}
        onVerApartado={verApartados}
      />
    );

  if (estado.kind === 'terminado') {
    let pagina;
    if (cocinas.data === undefined && cocinas.isPending) pagina = <PaginaVacia key="pagina" texto={ES.platillo.cargando} esperando />;
    else if (cocinas.data === undefined && cocinas.isError) pagina = <PaginaVacia key="pagina" texto={apiErrorMessage(cocinas.error)} />;
    else {
      const { cocina } = estado;
      // She took its last plate here: the dish is gone from the door, her code is not.
      const suyo =
        abierta === null
          ? undefined
          : apartados.data?.find((a) => a.estado === 'apartado' && esDeEstePlatillo(a, abierta.cocina, abierta.oferta, abierta.platillo));
      pagina = (
        <PaginaVacia key="pagina" texto={ES.platillo.terminado}>
          {cocina !== null && <FilaCocina cocina={cocina} distancia={distancia} onPress={() => abrirCocina(cocina.id)} />}
          {suyo !== undefined && (
            <View style={{ alignSelf: 'stretch', paddingTop: SIZE.space }}>
              <BotonLleno label={ES.apartar.yaLoApartaste} icon="ticket-confirmation-outline" onPress={verApartados} />
            </View>
          )}
        </PaginaVacia>
      );
    }
    return (
      <>
        {pagina}
        {hoja}
      </>
    );
  }

  const { cocina, oferta, platillo } = estado;
  const fallo =
    (apartados.data === undefined && apartados.isError) || (posicion.data === undefined && posicion.isError);
  const pie = pieDe({ cocina, oferta, platillo, apartados: apartados.data, posicion: posicion.data, fallo, ahora });
  return (
    <>
      <PaginaDePlatillo
        key="pagina"
        cocina={cocina}
        oferta={oferta}
        platillo={platillo}
        distancia={distancia}
        ahora={ahora}
        onCocina={() => abrirCocina(cocina.id)}
        pie={
          <PieDeApartar
            pie={pie}
            precio={formatMXN(platillo.priceCentavos)}
            onApartar={() => {
              setAbierta({ cocina, oferta, platillo });
              setApartando(true);
            }}
            onVerApartados={verApartados}
            onVerCalificacion={() => router.dismissTo('/tu')}
            falla={fallo ? apiErrorMessage(apartados.error ?? posicion.error) : null}
            onReintentar={() => {
              void apartados.refetch();
              void posicion.refetch();
            }}
          />
        }
      />
      {hoja}
    </>
  );
}

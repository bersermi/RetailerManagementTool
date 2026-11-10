import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { apiErrorMessage } from '@/api/errors';
import { useApartados, useCocinas, usePosicion } from '@/api/hooks';
import { formatMXN } from '@/format/mxn';
import { pieDe } from '@/lib/apartar';
import { distanciaTexto } from '@/lib/distancia';
import { useDistancia } from '@/lib/DistanciasProvider';
import { lineaDe, parametro, platilloDe } from '@/lib/paginas';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
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
// over (a tab pushed from a stack screen stacks the tabs again). ⚠️ NO CHECK CAN SEE THIS
// SCREEN (ADR-035 §2.11): the phone is its instrument.
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

  const estado = platilloDe(cocinas.data, cocinaId, parametro(params.oferta), lineaDe(parametro(params.linea)), ahora);
  const abrirCocina = (id: string) => router.push({ pathname: '/cocina/[id]', params: { id } });

  if (estado.kind === 'terminado') {
    if (cocinas.data === undefined && cocinas.isPending) return <PaginaVacia texto={ES.platillo.cargando} esperando />;
    if (cocinas.data === undefined && cocinas.isError) return <PaginaVacia texto={apiErrorMessage(cocinas.error)} />;
    const { cocina } = estado;
    return (
      <PaginaVacia texto={ES.platillo.terminado}>
        {cocina !== null && <FilaCocina cocina={cocina} distancia={distancia} onPress={() => abrirCocina(cocina.id)} />}
      </PaginaVacia>
    );
  }

  const { cocina, oferta, platillo } = estado;
  const pie = pieDe({ cocina, oferta, platillo, apartados: apartados.data, posicion: posicion.data, ahora });
  const verApartados = () => {
    setApartando(false);
    router.dismissTo('/apartados');
  };
  return (
    <>
      <PaginaDePlatillo
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
            onApartar={() => setApartando(true)}
            onVerApartados={verApartados}
            onVerCalificacion={() => router.dismissTo('/tu')}
          />
        }
      />
      <HojaApartar
        visible={apartando}
        cocina={cocina}
        oferta={oferta}
        platillo={platillo}
        distancia={distancia}
        posicion={posicion.data}
        ahora={ahora}
        onCerrar={() => setApartando(false)}
        onVerApartado={verApartados}
      />
    </>
  );
}

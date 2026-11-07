import { router, useLocalSearchParams } from 'expo-router';

import { apiErrorMessage } from '@/api/errors';
import { useCocinas } from '@/api/hooks';
import { distanciaTexto } from '@/lib/distancia';
import { useDistancia } from '@/lib/DistanciasProvider';
import { lineaDe, parametro, platilloDe } from '@/lib/paginas';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { FilaCocina } from '@/ui/FilaCocina';
import { PaginaDePlatillo } from '@/ui/PaginaDePlatillo';
import { PaginaVacia } from '@/ui/PaginaVacia';

// ============================================================================
// A DISH'S PAGE — ITS ROUTE. Plan task `10.5-iv-a-ii`, proposal B (the owner's ruling
// of 2026-11-01). What it draws is `@/ui/PaginaDePlatillo`'s since `10.5-v-c-ii`, the
// same screen Wera Cocina's *Así la ven* draws.
//
// ⚠️ THE DISH IS THE LIST'S, found by her kitchen, its publication and its line in the
// door's answer (in memory). A window that ends while she reads turns the page into
// *Este platillo ya no está en oferta*, with her kitchen's row still there while the
// door sends her (`@/lib/paginas`' `platilloDe`). ⚠️ NO CHECK CAN SEE THIS SCREEN
// (ADR-035 §2.11): the phone is its instrument.
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
  return (
    <PaginaDePlatillo
      cocina={cocina}
      oferta={oferta}
      platillo={platillo}
      distancia={distancia}
      ahora={ahora}
      onCocina={() => abrirCocina(cocina.id)}
    />
  );
}

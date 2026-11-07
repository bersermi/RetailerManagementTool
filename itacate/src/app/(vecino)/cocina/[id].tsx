import { router, useLocalSearchParams } from 'expo-router';

import { giroLabel } from '@/api/cocinas';
import { apiErrorMessage } from '@/api/errors';
import { useCocinas, useGiros } from '@/api/hooks';
import { distanciaTexto } from '@/lib/distancia';
import { useDistancia } from '@/lib/DistanciasProvider';
import { cocinaDe, parametro } from '@/lib/paginas';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { PaginaDeCocina } from '@/ui/PaginaDeCocina';
import { PaginaVacia } from '@/ui/PaginaVacia';

// ============================================================================
// A KITCHEN'S OWN PAGE — ITS ROUTE. Plan task `10.5-iv-a-ii`, proposal B (the owner's
// ruling of 2026-11-01), opened from the list — a quiet kitchen's card — or from a
// dish's page. What it draws is `@/ui/PaginaDeCocina`'s since `10.5-v-c-ii`, the same
// screen Wera Cocina's *Ver como la ven* draws.
//
// ⚠️ NOTHING NEW IS ASKED OF THE DATABASE: the kitchen is the list's, found by her id in
// the door's answer (in memory); a pull asks the door again, as the list's does. Her
// trade's name is `kitchen_giros()`'s. The distance is the list's (`useDistancia`): this
// screen never learns where the neighbour is. ⚠️ NO CHECK CAN SEE THIS SCREEN (ADR-035
// §2.11): the phone is its instrument.
// ============================================================================

/** How often the page is made again while she reads, so an ended window drops from *Hoy*. */
const CADA_MINUTO = 60_000;

export default function PaginaDeLaCocina() {
  const id = parametro(useLocalSearchParams<{ id: string }>().id);
  const cocinas = useCocinas();
  const giros = useGiros();
  const ahora = useAhora(CADA_MINUTO);
  const metros = useDistancia(id);

  const cocina = cocinaDe(cocinas.data, id);
  if (cocina === null) {
    if (cocinas.data === undefined && cocinas.isPending) return <PaginaVacia texto={ES.pagina.cargando} esperando />;
    if (cocinas.data === undefined && cocinas.isError) return <PaginaVacia texto={apiErrorMessage(cocinas.error)} />;
    return <PaginaVacia texto={ES.pagina.yaNoEsta} />;
  }

  return (
    <PaginaDeCocina
      cocina={cocina}
      giroNombre={giroLabel(giros.data, cocina.giro)}
      distancia={metros === null ? null : distanciaTexto(metros)}
      ahora={ahora}
      onRefrescar={() => cocinas.refetch()}
      onPlatillo={(oferta, platillo) =>
        router.push({
          pathname: '/platillo/[cocina]/[oferta]/[linea]',
          params: { cocina: cocina.id, oferta: oferta.id, linea: String(platillo.lineNo) },
        })
      }
    />
  );
}

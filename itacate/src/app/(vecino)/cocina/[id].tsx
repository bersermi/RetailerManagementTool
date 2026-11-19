import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { giroLabel } from '@/api/cocinas';
import { apiErrorMessage } from '@/api/errors';
import { useCocinas, useGiros, useSiguiendo } from '@/api/hooks';
import type { Seguida } from '@/api/siguiendo';
import { distanciaTexto } from '@/lib/distancia';
import { useDistancia } from '@/lib/DistanciasProvider';
import { cocinaDe, parametro } from '@/lib/paginas';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { PaginaDeCocina } from '@/ui/PaginaDeCocina';
import { PaginaSeguida } from '@/ui/PaginaSeguida';
import { PaginaVacia } from '@/ui/PaginaVacia';
import { SeccionTarjeta } from '@/ui/SeccionTarjeta';
import { Seguir } from '@/ui/Seguir';

// ============================================================================
// A KITCHEN'S OWN PAGE — ITS ROUTE. Plan task `10.5-iv-a-ii`, proposal B (the owner's
// ruling of 2026-11-01), opened from the list — a quiet kitchen's card — or from a
// dish's page, and since `10.9d-ii` from *Mis cocinas*. What it draws is
// `@/ui/PaginaDeCocina`'s since `10.5-v-c-ii`, the same screen Wera Cocina's *Ver como la
// ven* draws — with, since `10.9d-ii`, *Seguir* and its bell handed to it (`@/ui/Seguir`), and since
// `10.9e-iii` her loyalty card there or the kitchen's invitation (`@/ui/SeccionTarjeta`).
//
// ⚠️ THE KITCHEN IS THE LIST'S, found by her id in the door's answer (in memory); a pull asks
// the door again, as the list's does. Her trade's name is `kitchen_giros()`'s. The distance is
// the list's (`useDistancia`): this screen never learns where the neighbour is.
// ⚠️ `10.9d-ii`: A KITCHEN SHE FOLLOWS THAT THE DOOR NO LONGER SENDS (quiet for more than two
// weeks) opens a page of its own from `my_follows`' row (`@/ui/PaginaSeguida`), never *Esta
// cocina ya no está en Itacate* — and ⚠️ KEEPS IT once seen: she may stop following it from that page,
// and her list read again no longer holds it, yet the kitchen is still in Itacate (found by the review
// of `10.9d-ii`). A read of her list that fails is said as itself, never *ya no está*.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11).
// ============================================================================

/** How often the page is made again while she reads, so an ended window drops from *Hoy*. */
const CADA_MINUTO = 60_000;

export default function PaginaDeLaCocina() {
  const id = parametro(useLocalSearchParams<{ id: string }>().id);
  const cocinas = useCocinas();
  const giros = useGiros();
  const siguiendo = useSiguiendo();
  const ahora = useAhora(CADA_MINUTO);
  const metros = useDistancia(id);
  const leida = siguiendo.data?.cocinas.find((s) => s.id === id);
  /** The followed row last seen for this kitchen — kept while she stays on its page. */
  const [vista, setVista] = useState<Seguida | null>(null);
  useEffect(() => {
    if (leida !== undefined) setVista(leida);
  }, [leida]);

  const cocina = cocinaDe(cocinas.data, id);
  if (cocina === null) {
    if (cocinas.data === undefined && cocinas.isPending) return <PaginaVacia texto={ES.pagina.cargando} esperando />;
    if (cocinas.data === undefined && cocinas.isError) return <PaginaVacia texto={apiErrorMessage(cocinas.error)} />;
    const seguida = leida ?? vista;
    if (seguida !== null) return <PaginaSeguida seguida={seguida} giroNombre={giroLabel(giros.data, seguida.giro)} ahora={ahora} />;
    if (siguiendo.data === undefined && siguiendo.isPending) return <PaginaVacia texto={ES.pagina.cargando} esperando />;
    if (siguiendo.data === undefined && siguiendo.isError) return <PaginaVacia texto={apiErrorMessage(siguiendo.error)} />;
    return <PaginaVacia texto={ES.pagina.yaNoEsta} />;
  }

  return (
    <PaginaDeCocina
      cocina={cocina}
      giroNombre={giroLabel(giros.data, cocina.giro)}
      distancia={metros === null ? null : distanciaTexto(metros)}
      ahora={ahora}
      onRefrescar={() => Promise.all([cocinas.refetch(), siguiendo.refetch()])}
      seguir={<Seguir cocinaId={cocina.id} nombre={cocina.name} />}
      tarjeta={<SeccionTarjeta cocina={cocina} />}
      onPlatillo={(oferta, platillo) =>
        router.push({
          pathname: '/platillo/[cocina]/[oferta]/[linea]',
          params: { cocina: cocina.id, oferta: oferta.id, linea: String(platillo.lineNo) },
        })
      }
    />
  );
}

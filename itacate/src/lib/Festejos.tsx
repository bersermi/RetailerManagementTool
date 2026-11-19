import { router } from 'expo-router';
import { useEffect } from 'react';

import { useTarjetas } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { festejados } from '@/lib/festejado';
import { deviceStore } from '@/lib/store';
import { festejoDe } from '@/lib/tarjeta';

// ============================================================================
// *¡GANASTE!* — ON THE SPOT OR AT HER NEXT OPEN. Plan task `10.9e-iii` (G11, G17). Mounted with the tabs, beside
// `@/lib/Recordatorios`, and draws nothing: at every read of her cards (`useTarjetas` — after each scan, every five
// seconds under *Mi código*, and when the app comes back to the front) it asks for a reward this phone has not
// celebrated (`festejoDe`, `@/lib/festejado`, by id), and opens *¡Ganaste …!* over whatever is on the screen —
// once per app run (`empujados`, in memory: a phone whose disk refuses a write still never opens it twice — the review
// of `10.9e-iii`). ⚠️ THE SCREEN ITSELF KEEPS THE IDS, WHEN IT OPENS (`(vecino)/gano/[cocina]`): a push the app lost
// while it started (seen once on the emulator, not reproduced) is celebrated at the next open, never marked unseen.
// ⚠️ THE ONE PLACE THAT CELEBRATES: *Escanear* and *Mi código* say *Completaste tu tarjeta* and leave the
// celebration to this, so the kitchen's scan, her scan and a handover's stamp (the kitchen's *Entregar*, while her
// app was closed) all celebrate the same way. A push for it is the analyst's (`10.9h`).
// ⚠️ IT OPENS ONCE THE APP HAS SETTLED (`ESPERA_MS` after her cards are read): pushed while the app was
// still mounting its first screens — her next open, the case it exists for — the screen arrived with its parts
// invisible, its entrance (`@/ui/Llega`) dropped before its views were attached (found on the emulator, `10.9e-iii`).
// ============================================================================

/**
 * How long after her cards are read the celebration opens — past the first screens' mounting and their own
 * entrance. (React Native 0.86 deprecates `InteractionManager`, which said the same thing.)
 */
export const ESPERA_MS = 900;

/** The rewards this app run has celebrated — the guard when the phone's store cannot keep them. */
const empujados = new Set<string>();

export function Festejos() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const tarjetas = useTarjetas();
  const data = tarjetas.data;
  useEffect(() => {
    if (userId === null || data === undefined) return;
    const guardados = festejados(deviceStore(), userId);
    const vistos = guardados === null && empujados.size === 0 ? null : new Set([...(guardados ?? []), ...empujados]);
    const festejo = festejoDe(data, vistos);
    if (festejo === null) return;
    const reloj = setTimeout(() => {
      // Held before the screen opens: a read that lands meanwhile never opens it twice in this run.
      for (const id of festejo.ids) empujados.add(id);
      router.push({ pathname: '/gano/[cocina]', params: { cocina: festejo.cocina.id, premio: festejo.premio.id, vistos: festejo.ids.join(',') } });
    }, ESPERA_MS);
    return () => clearTimeout(reloj);
  }, [userId, data]);
  return null;
}

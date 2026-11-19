import { router } from 'expo-router';
import { useEffect } from 'react';

import { useTarjetas } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { festejadoHasta, marcarFestejado } from '@/lib/festejado';
import { deviceStore } from '@/lib/store';
import { festejoDe } from '@/lib/tarjeta';

// ============================================================================
// *¡GANASTE!* — ON THE SPOT OR AT HER NEXT OPEN. Plan task `10.9e-iii` (G11, G17). Mounted with the tabs, beside
// `@/lib/Recordatorios`, and draws nothing: at every read of her cards (`useTarjetas` — after each scan, every five
// seconds under *Mi código*, and when the app comes back to the front) it asks for a reward won after the last one
// this phone celebrated (`festejoDe`, `@/lib/festejado`), and opens *¡Ganaste …!* over whatever is on the screen —
// once: the moment is kept BEFORE the screen opens, so a second read never opens it twice.
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

export function Festejos() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const tarjetas = useTarjetas();
  const data = tarjetas.data;
  useEffect(() => {
    if (userId === null || data === undefined) return;
    const festejo = festejoDe(data, festejadoHasta(deviceStore(), userId));
    if (festejo === null) return;
    const reloj = setTimeout(() => {
      // Kept before the screen opens: a read that lands meanwhile never opens it twice.
      marcarFestejado(deviceStore(), userId, festejo.premio.won_at);
      router.push({ pathname: '/gano/[cocina]', params: { cocina: festejo.cocina.id, premio: festejo.premio.id } });
    }, ESPERA_MS);
    return () => clearTimeout(reloj);
  }, [userId, data]);
  return null;
}

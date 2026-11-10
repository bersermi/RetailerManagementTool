import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { APARTADOS_KEY } from '@/api/apartados';
import { dibujarLlegada } from '@/api/llegada';
import { guardarYa } from '@/api/persist';
import { useAuth } from '@/auth/AuthProvider';
import { drenarCola, setAlLlegar, setUsuarioDeCola } from '@/lib/cola';
import { onDrain, queued, start } from '@/lib/connectivityMonitor';

// ============================================================================
// THE SIGNAL AND THE QUEUE, STARTED FOR THE APP'S LIFE. Plan task `10.5b-iv-b`.
// Mounted inside `AuthProvider` (whose login the queue sends for) and
// `QueryProvider` (whose cache a landed send is drawn into), around everything
// else (`src/app/_layout.tsx`).
//
// ⚠️ A LANDED SEND IS DRAWN INTO THE CACHED READ AND THE CACHE SAVED BEFORE IT
// LEAVES THE QUEUE (`@/api/llegada`, then `@/api/cola`'s drain removes it): until the
// re-read answers, the screen is drawn from that copy, so the order she handed over
// never flickers back to *por entregar* — nor after a restart with no signal. Wera
// does the same with a price (`app/src/api/QueryProvider.tsx`, `onPriceSettled`).
// ⚠️ A read in flight is cancelled before it is drawn (the review of `10.5b-iv-b`).
// ⚠️ HER RESERVATIONS ARE READ AGAIN ONCE A DRAIN LANDED SOMETHING, not once per send.
// ⚠️ A NEW LOGIN IS A REASON TO DRAIN: her sends waited for her to come back in.
// ============================================================================

export function ColaProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    // ⚠️ Drawn (a read in flight cancelled first, each read's age kept — `@/api/llegada`), then SAVED, then removed.
    setAlLlegar(async (envio, respuesta) => {
      await dibujarLlegada(client, envio, respuesta);
      guardarYa();
    });
    const sinDrenaje = onDrain((drenado) => {
      if (drenado.landed > 0) void client.invalidateQueries({ queryKey: APARTADOS_KEY });
    });
    const parar = start(drenarCola);
    return () => {
      parar();
      sinDrenaje();
      setAlLlegar(null);
    };
  }, [client]);

  useEffect(() => {
    setUsuarioDeCola(userId);
    if (userId !== null) queued();
  }, [userId]);

  return <>{children}</>;
}

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { APARTADOS_KEY, POSICION_KEY, type Apartado } from '@/api/apartados';
import { COCINAS_KEY } from '@/api/cocinas';
import { useAuth } from '@/auth/AuthProvider';
import { drenarCola, setAlLlegar, setUsuarioDeCola } from '@/lib/cola';
import { onDrain, queued, start } from '@/lib/connectivityMonitor';

// ============================================================================
// THE SIGNAL AND HER *YA LO TENGO* QUEUE, STARTED FOR THE APP'S LIFE. Plan task
// `10.9j-ii-a` — Wera Cocina's `cocina/src/lib/ColaProvider.tsx` (`10.5b-iv-b`), cut to
// her one kind. Mounted inside `AuthProvider` (whose login the queue sends for) and
// `QueryProvider` (whose cache a landed send is drawn into), around everything else
// (`src/app/_layout.tsx`).
//
// ⚠️ A LANDED SWIPE IS DRAWN INTO THE CACHED READ BEFORE IT LEAVES THE QUEUE: a read in
// flight is cancelled first (one that started before the send landed would write the list
// from before it — Wera Cocina's review of `10.5b-iv-b`), then that reservation is collected
// in the copy — so her ticket never flickers back between the queue and the re-read.
// ⚠️ HER RESERVATIONS, HER STANDING AND THE DOOR ARE READ AGAIN ONCE A DRAIN LANDED SOMETHING,
// not once per send: the swipe lets her hold three, and gives her stars their window.
// ⚠️ A NEW LOGIN IS A REASON TO DRAIN: her sends waited for her to come back in.
// ============================================================================

export function ColaProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    setAlLlegar(async (envio) => {
      await client.cancelQueries({ queryKey: APARTADOS_KEY });
      client.setQueriesData<Apartado[]>({ queryKey: APARTADOS_KEY }, (lista) =>
        lista?.map((a): Apartado => (a.id === envio.reserva && a.estado !== 'recogido' ? { ...a, estado: 'recogido', sello: null } : a)),
      );
    });
    const sinDrenaje = onDrain((drenado) => {
      if (drenado.landed > 0) {
        void client.invalidateQueries({ queryKey: APARTADOS_KEY });
        void client.invalidateQueries({ queryKey: POSICION_KEY });
        void client.invalidateQueries({ queryKey: COCINAS_KEY });
      }
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

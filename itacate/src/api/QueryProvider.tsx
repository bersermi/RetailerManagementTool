// ============================================================================
// TANSTACK QUERY, THE ONLY SERVER-STATE LAYER THIS APP HAS (ADR-035 §2.11).
// Plan task `10.5-iii-a`.
//
// ⚠️ WERA'S CLIENT, WITHOUT ITS DISK (`app/src/api/QueryProvider.tsx`; Wera
// Cocina's copy is `cocina/src/api/QueryProvider.tsx`): the same retry policy —
// twice, and never a read that ran out of time, which would otherwise wait
// minutes to say so (`@/lib/plazo`) — and a read is renewed when the app comes
// back to the front. Nothing here is needed offline yet, so nothing is kept, and
// the cache dies with the app.
//
// ⚠️ NOTHING READS THROUGH IT YET: signing in reads nothing from the database.
// It is mounted now so the first read — her way out's (`10.5-iii-b`), the door's
// (`10.5-iv`) — adds a hook and touches no root. Every read here is scoped to
// whoever holds the session, so its key carries the login, as Wera Cocina's does.
//
// ⚠️ ONE CLIENT PER MOUNT, held in state and never at module scope, as Wera's.
// ============================================================================

import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { isTimedOut } from '@/lib/plazo';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failures, error) => failures < 2 && !isTimedOut(error),
            staleTime: 60_000,
            refetchOnWindowFocus: true,
          },
          mutations: { retry: 0, networkMode: 'always' },
        },
      }),
  );

  // React Native has no window focus: the app coming to the front is it.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') focusManager.setFocused(true);
      else if (state === 'background') focusManager.setFocused(false);
    });
    return () => sub.remove();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

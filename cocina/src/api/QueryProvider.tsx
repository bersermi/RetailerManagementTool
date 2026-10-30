// ============================================================================
// TANSTACK QUERY, THE ONLY SERVER-STATE LAYER THIS APP HAS (ADR-035 §2.11).
// Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S CLIENT, WITHOUT ITS DISK (`app/src/api/QueryProvider.tsx`): the
// same retry policy — twice, and never a read that ran out of time, which would
// otherwise wait minutes to say so (`@/lib/plazo`) — and a read is renewed when
// the app comes back to the front. Wera keeps a shop's catalog on the phone so
// it sells with no signal (`6d`); nothing here is needed offline yet, so nothing
// is kept, and the cache dies with the app.
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

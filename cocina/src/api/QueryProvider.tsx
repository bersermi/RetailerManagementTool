// ============================================================================
// TANSTACK QUERY, THE ONLY SERVER-STATE LAYER THIS APP HAS (ADR-035 §2.11).
// Plan tasks `10.4b-iii-a` and `10.5b-iv-b` (the handover with no signal).
//
// ⚠️ WERA'S CLIENT (`app/src/api/QueryProvider.tsx`): the same retry policy —
// twice, and never a read that ran out of time, which would otherwise wait
// minutes to say so (`@/lib/plazo`); a read renewed when the app comes back to
// the front; and since `10.5b-iv-b` THE SIGNAL handed to the library
// (`onlineManager`, from `@/lib/connectivityMonitor` — the app's one signal), so
// a read with no signal waits with its last copy on screen and goes by itself
// when the signal returns, and A NAMED SET OF READS KEPT ON THE PHONE — every
// decision about which, and why, is `@/api/persist`'s; this file is the binding.
//
// ⚠️⚠️ NOT WERA'S LIBRARY: TanStack's own `hydrate`, as the client is built, from
// a store that is synchronous — so the first frame already has her kitchen and
// her orders, and a cold start with no signal goes straight to them (the guard
// waits for her kitchens and nothing else). Saved with `dehydrate` at most every
// three seconds while the cache moves, and at once when the app leaves the front
// or a queued send lands (`setSaveNow`).
//
// ⚠️ ONE CLIENT PER MOUNT, held in state and never at module scope, as Wera's.
// ============================================================================

import { QueryClient, QueryClientProvider, dehydrate, focusManager, hydrate, onlineManager, type DehydratedState } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  CACHE_GC_TIME,
  CACHE_THROTTLE_MS,
  PERSISTED_KEYS,
  guardar,
  restaurar,
  setMemoryForgetter,
  setSaveNow,
  shouldPersistQuery,
} from '@/api/persist';
import { online, subscribe } from '@/lib/connectivityMonitor';
import { isTimedOut } from '@/lib/plazo';
import { deviceStore } from '@/lib/store';

function buildClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failures, error) => failures < 2 && !isTimedOut(error),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
      },
      // ⚠️ `always`: with the signal handed to the library, the default would HOLD a write in
      // memory while offline — a *Guardar* that spins and is lost when the app closes. Her
      // handovers and thumbs never go through a mutation (`@/api/cola`); every other write
      // still says *Sin conexión* at once, as before.
      mutations: { retry: 0, networkMode: 'always' },
    },
  });
  // ⚠️ THE KEPT READS ARE NEVER COLLECTED: the save walks the live cache, and one collected
  // after five minutes unobserved would be left out of the next (Wera's measured trap).
  for (const key of PERSISTED_KEYS) client.setQueryDefaults(key, { gcTime: CACHE_GC_TIME });
  // ⚠️ BEFORE THE FIRST FRAME: the store is synchronous.
  const guardado = restaurar<DehydratedState>(deviceStore());
  if (guardado !== null) hydrate(client, guardado);
  return client;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(buildClient);

  // The save: at most every three seconds while the cache moves; at once on demand.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      guardar(deviceStore(), dehydrate(client, { shouldDehydrateQuery: shouldPersistQuery, shouldDehydrateMutation: () => false }));
    };
    const unsubscribe = client.getQueryCache().subscribe(() => {
      if (timer === null) timer = setTimeout(save, CACHE_THROTTLE_MS);
    });
    setSaveNow(save);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') save();
    });
    return () => {
      unsubscribe();
      sub.remove();
      setSaveNow(null);
      if (timer !== null) clearTimeout(timer);
    };
  }, [client]);

  // ⚠️ *Cerrar sesión* empties this client (`forgetCache`) — or its next save writes her kitchen back.
  useEffect(() => {
    setMemoryForgetter(() => client.clear());
    return () => setMemoryForgetter(null);
  }, [client]);

  // ⚠️ THE SIGNAL, HANDED TO THE LIBRARY — `null`, nothing read yet, is online (the library's
  // own default, so a launch reads at once).
  useEffect(() => {
    onlineManager.setOnline(online() !== false);
    return subscribe((next) => onlineManager.setOnline(next !== false));
  }, []);

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

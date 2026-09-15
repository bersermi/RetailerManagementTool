// ============================================================================
// SERVER STATE, AND IT IS THE LIBRARY ADR-035 NAMED. Plan task 5b-i.
//
// §2.11: "Server state: TanStack Query, EXCLUSIVELY. Staleness, refetching and
// invalidation are exactly what hand-rolled fetching gets wrong. §2.6 already
// requires reads served from cache with *visible* staleness; this provides that
// flag rather than reinventing it."
//
// ⚠️ IT ARRIVES AT THE FIRST SERVER READ THIS APP EVER DOES, ON PURPOSE. Nothing
// before `5b-i` read a row from Postgres — `5a` is an auth shell, a theme scale
// and a money formatter — so this is the cheapest moment there will ever be to
// introduce it, and the most expensive thing that could happen instead is that
// `5b-ii` and `5b-iii` each invent their own read and `5b.5` then documents a
// pattern the ADR does not describe. The sizing's own argument for re-pointing
// `5b.5` at this task is this paragraph.
//
// ⚠️ IT IS MOUNTED INSIDE `AuthProvider` AND OUTSIDE EVERYTHING ELSE, and the
// order matters in one direction: every query here is scoped to whoever holds
// the session, so the provider that knows who that is has to be above it.
//
// ⚠️ WHAT THIS DELIBERATELY DOES NOT DO: persistence, `onlineManager`, and the
// retry-when-the-signal-returns behaviour a shop with no connection needs. That
// is `5c`, which owns the outbox and the "Sin conexion a internet" line, and
// building half of it here would be a second queue for the one `5c` designs.
// ============================================================================

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';

/**
 * ⚠️ ONE CLIENT PER MOUNT, HELD IN STATE AND NOT AT MODULE SCOPE. A client
 * built at import time is shared by every render of every fast-refresh in
 * development and survives a sign-out, which is how one shopkeeper's cached
 * rows get served to the next person to sign in on the same phone. `useState`
 * with an initialiser builds it once per mount and lets it go with the tree.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ⚠️ THE PILOT STORE IS OFFLINE A LOT, so a read that fails is far
            // more often a dead connection than a dead server. Two retries cost
            // a few seconds; zero retries put "algo salio mal" on the screen of
            // a shop whose signal came back one second later.
            retry: 2,
            // A shop's own name and IVA flag do not change while the app is
            // open. This is not a cache policy for the ledger — `5d` onwards
            // set their own, against screens that exist.
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
          // ⚠️ WRITES ARE NOT RETRIED HERE AND THAT IS NOT AN OVERSIGHT. A
          // retried write is a second row unless something makes it idempotent,
          // and the thing that does — client-generated document uuids, §2.6 —
          // is `5c`'s. `onboard_workspace` has no such key: two calls create two
          // shops.
          mutations: { retry: 0 },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

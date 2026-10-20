// ============================================================================
// WHETHER THE SHOP HAS A SIGNAL, FOR A SCREEN. Plan task `8g`, the offline
// report's round 3 (ruled 2026-10-20).
//
// ⚠️ IT READS THE SIGNAL, NEVER THE LIBRARY — `@/lib/connectivityMonitor`'s
// `online()` and `subscribe()`, the same two `OfflineSurfaces` reads, so a
// screen saying *Se ve cuando haya señal* and the notice at the bottom can never
// disagree about whether the shop is online.
//
// ⚠️ `null` IS UNKNOWN AND IS NOT OFFLINE: nothing has read the network yet, and
// a screen must not tell a shop with a signal that it has none.
// ============================================================================

import { useEffect, useState } from 'react';

import type { Online } from '@/api/connectivity';
import { online, subscribe } from '@/lib/connectivityMonitor';

export function useOnline(): Online {
  const [now, setNow] = useState<Online>(() => online());
  useEffect(() => {
    setNow(online());
    return subscribe(setNow);
  }, []);
  return now;
}

import { useSyncExternalStore } from 'react';

import type { Online } from '@/api/connectivity';
import { online, subscribe } from '@/lib/connectivityMonitor';

// ============================================================================
// THE SIGNAL, FOR A SCREEN. Plan task `10.9j-ii-a` — Wera Cocina's `cocina/src/lib/useSenal.ts`,
// copied (`10.5b-iv-b`). ⚠️ READ FROM THE APP'S ONE
// SIGNAL (`@/lib/connectivityMonitor`), never from `expo-network` — the line
// that says she has no signal and the drain of her *Ya lo tengo* must never disagree
// (ADR-035 §2.11). `null` is "nobody has looked yet", and is not "no signal".
// ============================================================================

export function useSenal(): Online {
  return useSyncExternalStore(subscribe, online, online);
}

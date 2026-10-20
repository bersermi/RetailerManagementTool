// ============================================================================
// THE PULL'S HOOK — `@/offline/jalar` holds the rules; this is their wire to
// the data library and the signal. Plan task `8g` (the offline report's E,
// ruled 2026-10-20).
//
// ⚠️ IT RE-READS EVERY READ ON SCREEN (`type: 'active'`), not a list a screen
// keeps: a screen that named its reads would be a second place to forget one.
// ============================================================================

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { OFFLINE_PULL_MS, REFRESH_CAP_MS, refetchesOnPull } from '@/offline/jalar';
import { online } from '@/lib/connectivityMonitor';

/** A pause, as a promise. */
function pause(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

export function useRefresh(): { readonly refreshing: boolean; readonly onRefresh: () => void } {
  const queries = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const work = refetchesOnPull(online())
      ? Promise.race([queries.refetchQueries({ type: 'active' }), pause(REFRESH_CAP_MS)])
      : pause(OFFLINE_PULL_MS);
    void work.catch(() => {}).finally(() => setRefreshing(false));
  }, [queries]);
  return { refreshing, onRefresh };
}

// ============================================================================
// WHAT A CAPTURE SCREEN HANDS THE RECORDER — one hook, three screens.
// Plan task `5P-a`.
//
// Vender, Comprar and Desperdicio each call it once and do three things with
// what it returns: put `onTouchStart` on their root view, call `committed()`
// FIRST in their commit handler, and call `confirmed()` when their
// confirmation mounts. Focus and blur are this hook's, so no screen has to
// remember them.
//
// ⚠️ `onTouchStart` AND NOT A PRESS HANDLER. It fires for every finger-down in
// the screen's React tree — a product, the search box, a scroll, the slide —
// and claims nothing, so no control behaves differently for being measured.
// React Native bubbles it through the COMPONENT tree, which is what should
// carry it into the basket's `Modal`; that is a claim about the renderer that
// only a phone can confirm, and the plan's look-question names it.
//
// ⚠️ On a build without the pilot flag every function is the recorder's no-op,
// and the focus effect still runs because a hook may not be conditional.
// ============================================================================

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';

import { PILOT_BUILD } from '@/lib/pilotFlag';
import { blur, commit, confirmed, focus, setContext, touch, venderReady } from '@/pilot/recorder';
import type { Screen } from '@/pilot/readings';

export interface PilotVisit {
  readonly onTouchStart: (() => void) | undefined;
  readonly committed: () => void;
  readonly confirmed: () => void;
}

export function usePilotVisit(
  screen: Screen,
  workspaceId: string | null,
  locationId: string | null,
  /** Vender only: its catalog is drawn, so a cold open can be stamped. */
  ready: boolean = false,
): PilotVisit {
  useEffect(() => {
    setContext(workspaceId, locationId);
  }, [workspaceId, locationId]);

  useEffect(() => {
    if (screen === 'vender' && ready) venderReady();
  }, [screen, ready]);

  useFocusEffect(
    useCallback(() => {
      focus(screen);
      return () => blur(screen);
    }, [screen]),
  );

  return useMemo(
    () => ({
      // ⚠️ `undefined` on a store build, so the view carries no handler at all.
      onTouchStart: PILOT_BUILD === null ? undefined : () => touch(screen),
      committed: () => commit(screen),
      confirmed: () => confirmed(screen),
    }),
    [screen],
  );
}

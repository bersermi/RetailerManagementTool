// ============================================================================
// LEAVING A SCREEN — what a *back* does where it should not simply close it.
// Plan task `8g`, the owner's review of the screens' flow (2026-10-20): *"go
// ahead with the fixes"*.
//
// Two shapes, one rule:
//
//   * `useBackStaysHere` — a screen with pages inside it (Números' sales page,
//     Ajustes' pages, a supplier's *Editar*): back returns to the screen's first
//     page instead of closing it.
//   * `useAskBeforeLeaving` — a form with something typed: back asks *¿Salir sin
//     guardar?* first (`@/ui/Pregunta`), and only *Salir sin guardar* leaves.
//
// ⚠️⚠️ BOTH ARE `usePreventRemove` AND NEVER A `BackHandler`. A `BackHandler`
// stays armed while another screen sits on top, so back on *Precios* reset
// Números underneath and did nothing visible — measured on the emulator. This
// intercepts only THIS screen being closed, by Android's button, *Volver*, or
// the iPhone's swipe.
//
// ⚠️⚠️ AND ONLY A *BACK* IS INTERCEPTED (`isGoingBack`). The sign-in gate closes
// screens with a `REPLACE` when a session ends, a form that saved leaves with a
// `POP_TO`: those pass straight through, or signing out from an Ajustes page
// would be stuck behind its own guard. ⚠️ A form that saved and leaves with a
// plain back calls `pass()` first: the guard is armed from the last render, and
// a state change made in the same handler arrives too late to disarm it.
// ============================================================================

import { useNavigation } from 'expo-router';
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';

import { isGoingBack } from '@/navigation/volver';

export { currentTabGuard, isGoingBack, setTabGuard, type TabGuard } from '@/navigation/volver';


/** While `active`, a back runs `onBack` instead of closing the screen. */
export function useBackStaysHere(active: boolean, onBack: () => void): void {
  const navigation = useNavigation();
  usePreventRemove(active, ({ data }) => {
    if (isGoingBack(data.action)) onBack();
    else navigation.dispatch(data.action);
  });
}

/**
 * While `dirty`, a back is held and the screen asks; `go` lets it through.
 * ⚠️ `asking` is what the screen draws its `Pregunta` from.
 */
export function useAskBeforeLeaving(dirty: boolean): {
  readonly asking: boolean;
  readonly keep: () => void;
  readonly go: () => void;
  /** Let the next back through — called by a form that saved, right before it leaves. */
  readonly pass: () => void;
} {
  const navigation = useNavigation();
  const [held, setHeld] = useState<NavigationAction | null>(null);
  const passing = useRef(false);
  usePreventRemove(dirty, ({ data }) => {
    if (passing.current || !isGoingBack(data.action)) navigation.dispatch(data.action);
    else setHeld(data.action);
  });
  return {
    pass: () => {
      passing.current = true;
    },
    asking: held !== null,
    keep: () => setHeld(null),
    go: () => {
      const action = held;
      setHeld(null);
      if (action !== null) navigation.dispatch(action);
    },
  };
}

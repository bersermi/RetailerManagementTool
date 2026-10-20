// ============================================================================
// WHAT COUNTS AS GOING BACK, AND THE ONE TAB GUARD — the parts of
// `@/navigation/salida` that are values rather than hooks, kept apart so the
// suite can read them (`R2`: a test reaches no component, and `salida` imports
// the router). Plan task `8g`, the owner's review of the screens' flow,
// 2026-10-20.
// ============================================================================

/**
 * A person going back — Android's button, `router.back()`, the iPhone's swipe.
 * ⚠️ Nothing else: the sign-in gate's `REPLACE` and a saved form's `POP_TO` must
 * pass a screen's guard, or signing out from an Ajustes page would be stuck.
 */
export function isGoingBack(action: { readonly type: string }): boolean {
  return action.type === 'GO_BACK' || action.type === 'POP';
}

// ---------------------------------------------------------------- the tabs --
//
// ⚠️ A TAB IS NEVER CLOSED, so `usePreventRemove` never fires for one — and the
// owner's ruling for *Te lo compro* (2026-10-20) is that leaving it resets it,
// after asking when something was filled in. So the screen that needs it
// registers ONE guard while it is focused, and the tab bar (`(tabs)/_layout`)
// hands every tab press to it before switching.

/** What a focused tab does when one of the tabs is pressed: `go` switches. */
export interface TabGuard {
  readonly onLeave: (go: () => void) => void;
}

let tabGuard: TabGuard | null = null;

/** Registered by a focused tab screen; `null` when it blurs. */
export function setTabGuard(guard: TabGuard | null): void {
  tabGuard = guard;
}

/** The guard the tab bar asks first, if any. */
export function currentTabGuard(): TabGuard | null {
  return tabGuard;
}

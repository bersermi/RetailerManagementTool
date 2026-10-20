// ============================================================================
// THE PULL-TO-REFRESH CONTROL, IN THE APP'S COLOURS. Plan task `8g` (the
// offline report's E, ruled 2026-10-20) — the rules are `@/offline/jalar`.
//
// ⚠️ `R14`: drawn by every reading screen that offers the pull, so it lives here
// from its first day. It is the platform's own `RefreshControl` — the gesture a
// person already knows — and it forwards every prop, children included, because
// a `ScrollView` clones its `refreshControl` around itself on Android.
// ============================================================================

import { RefreshControl, type RefreshControlProps } from 'react-native';

import { PALETTE } from '@/theme/palette';

export function Jalar(props: RefreshControlProps) {
  return (
    <RefreshControl
      colors={[PALETTE.accion]}
      tintColor={PALETTE.accion}
      progressBackgroundColor={PALETTE.superficie}
      {...props}
    />
  );
}

// ============================================================================
// WHERE A COUNTER STARTS ON THE SCREEN, FOR ITS KEYBOARD ROOM — the acting half
// of `desfaseTeclado` (`@/lib/teclado`). Plan task `8g`, 2026-10-22.
//
// Vender, Comprar and Merma each sit in a `KeyboardAvoidingView` under the tab
// navigator's header. On Android 15+ the room it makes is short by that header
// unless it is told where it starts (measured on the emulator: the sticky bar
// 145 px under the keys). This measures it once laid out, in window
// coordinates, and hands back the offset — iOS's tuned figure untouched.
// ============================================================================

import { useCallback, useState } from 'react';
import { Platform, type LayoutChangeEvent, type View } from 'react-native';

import { desfaseTeclado } from '@/lib/teclado';

/** `onLayout` for the `KeyboardAvoidingView`, and the offset to give it. */
export function useDesfaseTeclado(tuned: number): {
  onLayout: (e: LayoutChangeEvent) => void;
  offset: number;
} {
  const [top, setTop] = useState<number | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    (e.target as unknown as View).measureInWindow((_x, y) => setTop(y));
  }, []);
  return { onLayout, offset: desfaseTeclado(Platform.OS, Platform.Version, tuned, top) };
}

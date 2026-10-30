// ============================================================================
// A FORM THAT KEEPS THE FIELD BEING TYPED IN ABOVE THE KEYBOARD. Plan task
// `10.4b-iii-a`.
//
// ⚠️ WERA'S `Formulario`, COPIED (`app/src/ui/Formulario.tsx`, plan `8g`, whose
// header has the measurements): a scroll view that, while the keyboard is up,
// adds the keyboard's height to its foot and scrolls the focused field to
// `SIZE.space * 2` above it — and watches for focus moving to the next box,
// which raises no keyboard event. `@/lib/teclado` decides how far.
// Sign-in draws it now; `10.4b-iii-b`'s kitchen form draws it next.
// ============================================================================

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

import { desplazamiento } from '@/lib/teclado';
import { SIZE } from '@/theme/palette';

/** How often focus is checked while the keyboard is up. */
const WATCH_MS = 300;

export function Formulario({
  children,
  contentContainerStyle,
  onScroll,
  ...scroll
}: ScrollViewProps & { children: ReactNode }) {
  const view = useRef<ScrollView>(null);
  const offset = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const shown = useRef<unknown>(null);
  const [room, setRoom] = useState(0);
  const margin = SIZE.space * 2;

  const reveal = useCallback(() => {
    const top = keyboardTop.current;
    const input = TextInput.State.currentlyFocusedInput();
    shown.current = input;
    if (top === null || input === null) return;
    input.measureInWindow((_x, y, _w, height) => {
      const by = desplazamiento(y, height, top, margin);
      if (by > 0) view.current?.scrollTo({ y: offset.current + by, animated: true });
    });
  }, [margin]);

  useEffect(() => {
    let watch: ReturnType<typeof setInterval> | null = null;
    const up = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      setRoom(e.endCoordinates.height);
      requestAnimationFrame(reveal);
      if (watch === null) {
        watch = setInterval(() => {
          if (TextInput.State.currentlyFocusedInput() !== shown.current) reveal();
        }, WATCH_MS);
      }
    });
    const down = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      shown.current = null;
      setRoom(0);
      if (watch !== null) clearInterval(watch);
      watch = null;
    });
    return () => {
      up.remove();
      down.remove();
      if (watch !== null) clearInterval(watch);
    };
  }, [reveal]);

  const base = StyleSheet.flatten(contentContainerStyle) ?? {};
  const foot =
    [base.paddingBottom, base.paddingVertical, base.padding].find((v): v is number => typeof v === 'number') ?? 0;

  return (
    <ScrollView
      ref={view}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      {...scroll}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        offset.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      }}
      contentContainerStyle={[contentContainerStyle, room > 0 ? { paddingBottom: foot + room } : null]}
    >
      {children}
    </ScrollView>
  );
}

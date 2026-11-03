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
//
// ⚠️ ONE DIFFERENCE FROM WERA'S, `10.4g-i`: a SEARCH box goes to the TOP of the
// form when focused (`useArriba`, `@/lib/teclado`'s `hastaArriba`), not just above
// the keyboard — Google's suggestions open under it (`@/ui/Direccion`), and a box
// held just above the keys would hide every row behind them. The keyboard's room
// at the foot is what lets it scroll that far.
// ============================================================================

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

import { desplazamiento, hastaArriba } from '@/lib/teclado';
import { SIZE } from '@/theme/palette';

/** How often focus is checked while the keyboard is up. */
const WATCH_MS = 300;

/**
 * The boxes this form brings to its top when focused. ⚠️ FOUND BY IDENTITY: the
 * object `TextInput.State.currentlyFocusedInput()` returns is the one the box's
 * `ref` receives (React Native 0.86's `TextInput.js`, `focusInput(inputRef.current)`).
 */
const ARRIBA = createContext<Set<unknown> | null>(null);

/** Marks a search box as one the form brings to its top when it is focused. Outside a form, nothing. */
export function useArriba(caja: RefObject<TextInput | null>) {
  const arriba = useContext(ARRIBA);
  useEffect(() => {
    const box = caja.current;
    if (arriba === null || box === null) return undefined;
    arriba.add(box);
    return () => {
      arriba.delete(box);
    };
  }, [arriba, caja]);
}

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
  const [arriba] = useState(() => new Set<unknown>());
  const margin = SIZE.space * 2;

  const reveal = useCallback(() => {
    const top = keyboardTop.current;
    const input = TextInput.State.currentlyFocusedInput();
    shown.current = input;
    if (top === null || input === null) return;
    if (arriba.has(input)) {
      view.current?.getNativeScrollRef()?.measureInWindow((_fx, formTop) => {
        input.measureInWindow((_x, y) => {
          const by = hastaArriba(y, formTop, SIZE.space);
          if (by !== 0) view.current?.scrollTo({ y: Math.max(0, offset.current + by), animated: true });
        });
      });
      return;
    }
    input.measureInWindow((_x, y, _w, height) => {
      const by = desplazamiento(y, height, top, margin);
      if (by > 0) view.current?.scrollTo({ y: offset.current + by, animated: true });
    });
  }, [margin, arriba]);

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
      <ARRIBA.Provider value={arriba}>{children}</ARRIBA.Provider>
    </ScrollView>
  );
}

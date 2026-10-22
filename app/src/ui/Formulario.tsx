// ============================================================================
// A FORM THAT KEEPS WHAT YOU TYPE IN VIEW. Plan task `8g`, the owner's first
// user (2026-10-22): *"he cannot see what he's typing as a password when
// registering"* — and the owner's ask to fix *"the way the screen scrolls or
// allows you to scroll to see what you're typing"* everywhere.
//
// A `ScrollView` for the app's forms (Entrar, Tu tienda, Ajustes, a product, a
// supplier) that does the two things none of them did:
//
//   1. ROOM. While the keyboard is up, the content gets the keyboard's height
//      as extra room at its foot, so every field and button can be scrolled
//      above it. Neither an iPhone nor an Android 15+ phone shortens the screen
//      for the keyboard (`@/lib/teclado`), so without this the foot of a form —
//      Entrar's *Acepto* and *Crear cuenta* — sat under the keys, unreachable.
//   2. THE FIELD. When the keyboard comes up, and whenever the field being
//      typed in changes while it is up (the keyboard's own *Siguiente* moves it),
//      the field is scrolled to end a little above the keyboard if it does not
//      already. Measured in window coordinates on both sides, which is what
//      makes it right inside Ajustes' sheet as well as on a full screen.
//
// ⚠️ THE FIELD IS FOUND, NOT ANNOUNCED: `TextInput.State.currentlyFocusedInput()`
// is read when the keyboard comes up and every few hundred milliseconds while
// it stays, so a form's fields need no wiring and a field added later is
// covered. The check stops when the keyboard goes.
//
// ⚠️ IT DOES NOT DISMISS THE KEYBOARD ON A DRAG: she may scroll to read what she
// typed, or to reach the button, with the keyboard still up — the room is there
// for exactly that. A tap outside a field still closes it, as everywhere
// (`keyboardShouldPersistTaps="handled"` lets a button take the first tap).
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
import { useDensity } from '@/theme/DensityProvider';

/** How often the focused field is checked while the keyboard is up. */
const WATCH_MS = 300;
/** A screen whose content has no foot of its own. */
const NO_FOOT = 0;

export function Formulario({
  children,
  contentContainerStyle,
  onScroll,
  ...scroll
}: ScrollViewProps & { children: ReactNode }) {
  const { scale } = useDensity();
  const view = useRef<ScrollView>(null);
  const offset = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const shown = useRef<unknown>(null);
  const [room, setRoom] = useState(0);
  const margin = scale.space * 2;

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
      // A frame for the room to be laid out before the scroll that needs it.
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

  // The foot the screen gave its content, so the keyboard's room is added to it.
  const base = StyleSheet.flatten(contentContainerStyle) ?? {};
  const foot = [base.paddingBottom, base.paddingVertical, base.padding].find((v): v is number => typeof v === 'number') ?? NO_FOOT;

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

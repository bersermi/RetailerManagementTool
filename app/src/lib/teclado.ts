// ============================================================================
// WHO MAKES ROOM FOR THE KEYBOARD — THE APP OR THE PHONE. Plan task `8g`, the
// owner's first user (2026-10-22): *"he cannot see what he's typing as a
// password when registering"*, and his own ask, *"find and fix any potential
// confusing or odd behaviour with the keyboard/numeric keypad across the app"*.
//
// ⚠️⚠️ MEASURED ON THE EMULATOR (Android 16), NOT ASSUMED: with the keyboard up,
// Wera's window stayed the full 1080 × 2400 — `adjust=resize` is set, and
// `EDGE_TO_EDGE_ENFORCED` overrides it. From Android 15 (API 35), an app that
// targets it (Wera targets 36) is drawn edge to edge and the system no longer
// shortens the window for the keyboard: the app must make the room itself, as
// it always had to on iPhone. Vender, Comprar and Merma said *"Expo sets
// `softwareKeyboardLayoutMode: "resize"`, so Android's window is already
// shortened"* — true on Android 14 and older, false on every newer phone.
//
// ⚠️ SO THE ANSWER IS THE PHONE'S VERSION, NOT ITS PLATFORM: an older Android
// still resizes, and padding there as well would count the keyboard twice.
// ============================================================================

/** The first Android whose system stops resizing an app that targets it. */
export const ANDROID_EDGE_TO_EDGE_API = 35;

/**
 * `KeyboardAvoidingView`'s `behavior` for this phone: `padding` where the app
 * must make room itself, nothing where the system already has.
 */
export function comportamientoTeclado(os: string, version: number | string): 'padding' | undefined {
  if (os === 'ios') return 'padding';
  if (os !== 'android') return undefined;
  const api = typeof version === 'number' ? version : Number.parseInt(version, 10);
  return Number.isFinite(api) && api >= ANDROID_EDGE_TO_EDGE_API ? 'padding' : undefined;
}

/**
 * `KeyboardAvoidingView`'s `keyboardVerticalOffset` on a counter (Vender,
 * Comprar, Merma). iOS keeps its tuned figure, the tab bar and the device's
 * bottom inset. ⚠️ ON ANDROID 15+ IT IS WHERE THE COUNTER STARTS ON THE SCREEN —
 * measured 2026-10-22 on the emulator: with the tuned figure the sticky bar sat
 * 145 px (≈ 55 dp, the screen's header) under the keyboard, because the view
 * measures its own bottom from below the header. React Native's own definition
 * of the offset is that distance, `windowTop`; `null` until it is measured.
 */
export function desfaseTeclado(os: string, version: number | string, tuned: number, windowTop: number | null): number {
  if (comportamientoTeclado(os, version) !== 'padding' || os === 'ios') return tuned;
  return windowTop ?? tuned;
}

/**
 * How far to scroll so a field ends `margin` above the keyboard — `0` when it
 * already does. All in the same window coordinates: the field's top and height
 * as `measureInWindow` gives them, the keyboard's top as its event does.
 */
export function desplazamiento(fieldTop: number, fieldHeight: number, keyboardTop: number, margin: number): number {
  return Math.max(0, fieldTop + fieldHeight + margin - keyboardTop);
}

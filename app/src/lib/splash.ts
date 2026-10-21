// ============================================================================
// WHEN THE NATIVE SPLASH LETS GO — `8g`, 2026-10-21, for the opening.
//
// Measured on the emulator the first time the cow played: the splash hid on
// the first render, so Inicio showed for a frame before the guard sent a
// stranger to the welcome, and the square grew empty because the cow's
// pictures were still loading. So the splash is held until the screen behind
// it is the one she will see: the welcome lets go once its pictures are in
// (`(auth)/hola`), every other screen once the guard has nowhere to send her
// (`Gate`).
//
// ⚠️ A SPLASH THAT NEVER LETS GO IS AN APP THAT NEVER OPENS, so it lets go by
// itself after `SPLASH_SAFETY_MS` whatever happened — a failed picture, a
// screen that forgot. Both calls are safe to repeat.
// ============================================================================
import * as SplashScreen from 'expo-splash-screen';

/** The longest the splash is ever held past the first render. */
export const SPLASH_SAFETY_MS = 4_000;

let held = false;
let released = false;

/** Called once, before the first render, from the root layout's module. */
export function holdSplash(): void {
  if (held) return;
  held = true;
  void SplashScreen.preventAutoHideAsync().catch(() => {});
  setTimeout(releaseSplash, SPLASH_SAFETY_MS);
}

export function releaseSplash(): void {
  if (released) return;
  released = true;
  void SplashScreen.hideAsync().catch(() => {});
}

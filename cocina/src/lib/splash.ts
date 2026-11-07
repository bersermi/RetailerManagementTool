// ============================================================================
// WHEN THE NATIVE SPLASH LETS GO. Plan task `10.5-v-d`, for the opening.
//
// ⚠️ WERA'S `app/src/lib/splash.ts` (`8g`), COPIED: the splash is held until the screen
// behind it is the one she will see — the opening lets go once the cow's pictures are
// in (`(auth)/hola`), every other screen once the guard has nowhere to send her
// (`Gate`). Without it the square grows empty while the pictures load, and *Hoy* shows
// for a frame before the guard sends a stranger to the opening — both measured on
// Wera's emulator the first time its cow played.
//
// ⚠️ A SPLASH THAT NEVER LETS GO IS AN APP THAT NEVER OPENS, so it lets go by itself
// after `SPLASH_SAFETY_MS` whatever happened. Both calls are safe to repeat.
// `expo-splash-screen` is in every build of this app (`app.json`'s plugin), so this is
// JavaScript only.
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

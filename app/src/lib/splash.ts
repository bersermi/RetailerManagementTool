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
//
// ⚠️⚠️ `5R-n`: AND A FIRST OPEN WAITING FOR THE NEWEST UPDATE HOLDS IT LONGER
// (`@/lib/estreno`). While it waits no screen is mounted and every release is
// ignored; when the wait ends, the screen that mounts gets a fresh
// `SPLASH_SAFETY_MS` of its own — so the welcome still lets go once its cow is
// in, not over an empty square. ⚠️ THE WAIT ENDS BY ITSELF too, a second past
// its own limit, whatever the code that should have ended it did.
// ============================================================================
import * as SplashScreen from 'expo-splash-screen';

import { ESPERA_MAXIMA_MS } from '@/lib/estreno';

/** The longest the splash is ever held past the first render. */
export const SPLASH_SAFETY_MS = 4_000;

let held = false;
let released = false;
let waiting = false;

/** Called once, before the first render, from the root layout's module. */
export function holdSplash(): void {
  if (held) return;
  held = true;
  void SplashScreen.preventAutoHideAsync().catch(() => {});
  setTimeout(releaseSplash, SPLASH_SAFETY_MS);
}

/** ⚠️ `5R-n`: a first open may wait for the newest update — hold until `endUpdateWait`. */
export function holdSplashForUpdate(): void {
  if (released || waiting) return;
  waiting = true;
  setTimeout(endUpdateWait, ESPERA_MAXIMA_MS + 1_000);
}

/** The wait is over: the screen that now mounts lets go, or its own safety does. */
export function endUpdateWait(): void {
  if (!waiting) return;
  waiting = false;
  setTimeout(releaseSplash, SPLASH_SAFETY_MS);
}

export function releaseSplash(): void {
  if (released || waiting) return;
  released = true;
  void SplashScreen.hideAsync().catch(() => {});
}

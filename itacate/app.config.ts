import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { ConfigContext, ExpoConfig } from 'expo/config';

// ============================================================================
// THE TWO VALUES A STORE BUILD CARRIES AND THIS PUBLIC REPOSITORY DOES NOT.
// Plan task `10.2a`; `app.json` holds everything else. ⚠️ Its twin,
// `cocina/app.config.ts`, moved ahead in `10.4g-i`: Wera Cocina carries the
// iPhone map key too (Google's map and search on both phones) and hands both keys
// to its search through `extra.google`. This one is as it was — Itacate draws
// Apple's map on an iPhone and asks no search — until Itacate's own map
// (`10.5-iv`); change both then.
//
//   GOOGLE_MAPS_ANDROID_API_KEY — the map on Android (Apple Maps needs no key)
//   google-services.json        — push on Android (Firebase)
//
// Both live in EAS's environment (the wera-app organization's variables, set by
// the owner: plan `10.2b`, the handbook's *Before the two new apps' first builds*).
// `eas-pre-install.sh` copies the Firebase file here before anything installs,
// so prebuild finds it, and REFUSES an Android store build that lacks either:
// a key a store build was made without cannot be added over the air.
//
// ⚠️ WITHOUT THE KEY, A PLACEHOLDER — NOT NOTHING. Measured 2026-10-27 on the
// emulator: with no key in the manifest the map throws *API key not found* as it
// renders and React drops the whole screen — a blank white app. With a wrong key
// it draws an empty map and the rest of the screen. So a build made without the
// key (a local one) opens, and shows that its map has none.
//
// ⚠️ NEITHER IS PART OF THE RUNTIME. `fingerprint.config.js` drops both from the
// hash, so this Mac, CI and EAS compute the same runtime with or without them.
// Without that, the hash computed here and the one EAS computes would differ:
// the cloud build refuses, and an update goes to a runtime no phone has.
// `test/runtime.test.ts` measures it with stand-in values.
// ============================================================================

export const MAPS_KEY_ENV = 'GOOGLE_MAPS_ANDROID_API_KEY';
export const MAPS_KEY_PLACEHOLDER = 'sin-clave';
export const GOOGLE_SERVICES_FILE = 'google-services.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsKey = process.env[MAPS_KEY_ENV] || MAPS_KEY_PLACEHOLDER;
  const hasGoogleServices = existsSync(join(__dirname, GOOGLE_SERVICES_FILE));
  return {
    ...config,
    name: config.name ?? 'Itacate',
    slug: config.slug ?? 'itacate',
    android: {
      ...config.android,
      ...(hasGoogleServices ? { googleServicesFile: `./${GOOGLE_SERVICES_FILE}` } : {}),
    },
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', { androidGoogleMapsApiKey: mapsKey }],
    ],
  };
};

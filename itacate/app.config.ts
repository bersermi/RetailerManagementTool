import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { ConfigContext, ExpoConfig } from 'expo/config';

// ============================================================================
// THE VALUES A STORE BUILD CARRIES AND THIS PUBLIC REPOSITORY DOES NOT. Plan tasks
// `10.2a` and `10.5-iv-a-i`; `app.json` holds everything else.
//
//   GOOGLE_MAPS_ANDROID_API_KEY — the map on Android, and, since `10.5-iv-a-i`,
//                                 Google's Geocoding from an Android phone
//   GOOGLE_MAPS_IOS_API_KEY     — Google's Geocoding from an iPhone (`10.5-iv-a-i`);
//                                 NOT the iPhone's map yet
//   google-services.json        — push on Android (Firebase)
//
// All three live in EAS's environment (the wera-app organization's variables, set by
// the owner: plan `10.2b`, the handbook's *Before the two new apps' first builds*,
// and the iPhone key a session's on 2026-11-03, plan `10.4g-i`). `eas-pre-install.sh`
// copies the Firebase file here before anything installs, so prebuild finds it, and
// REFUSES an Android store build that lacks the file or the Android key: a key a
// store build was made without cannot be added over the air.
//
// ⚠️ THE TWO KEYS GO TWO WAYS SINCE `10.5-iv-a-i`, as in Wera Cocina
// (`cocina/app.config.ts`, `10.4g-i`): the Android key into `react-native-maps`'
// options, which compile it into the app's manifest; and BOTH into `extra.google`,
// where her phone's questions to Google read its own (`@/lib/useGoogle`) — the same
// values, never a second variable for either. Expo writes `extra` into every update
// it publishes, so the update runbook refuses to publish without both
// (`test/support.test.ts`). ⚠️ THE IPHONE KEY IS NOT IN THE MAP'S OPTIONS: its
// presence there compiles Google's map into an iPhone build — a native change, and
// Itacate's map is `10.5-iv-b`'s, with its first iPhone build. Change both then.
//
// ⚠️ WITHOUT A KEY, A PLACEHOLDER — NOT NOTHING. Measured 2026-10-27 on the
// emulator: with no key in the manifest the map throws *API key not found* as it
// renders and React drops the whole screen — a blank white app. With a wrong key
// it draws an empty map and the rest of the screen. So a build made without the
// keys (a local one) opens and asks Google nothing (`@/lib/google`'s `claveDe`
// refuses the placeholder).
//
// ⚠️ NONE IS PART OF THE RUNTIME. `fingerprint.config.js` drops the Android key from
// the map's options and the whole of `extra.google`, and ignores the Firebase file,
// so this Mac, CI and EAS compute the same runtime with or without them — and the
// runtime is the one Itacate's test build in the field carries, so the update
// reaches it (measured by `10.5-iv-a-i` on both platforms). Without that, the hash
// computed here and the one EAS computes would differ: the cloud build refuses,
// and an update goes to a runtime no phone has. `test/runtime.test.ts` measures it
// with stand-in values.
// ============================================================================

export const MAPS_KEY_ENV = 'GOOGLE_MAPS_ANDROID_API_KEY';
export const IOS_MAPS_KEY_ENV = 'GOOGLE_MAPS_IOS_API_KEY';
export const MAPS_KEY_PLACEHOLDER = 'sin-clave';
export const GOOGLE_SERVICES_FILE = 'google-services.json';

/** The variables the bundle reads through `extra` — the update runbook's list for Itacate names each. */
export const EXTRA_ENV = [MAPS_KEY_ENV, IOS_MAPS_KEY_ENV] as const;

export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsKey = process.env[MAPS_KEY_ENV] || MAPS_KEY_PLACEHOLDER;
  const iosKey = process.env[IOS_MAPS_KEY_ENV] || MAPS_KEY_PLACEHOLDER;
  const hasGoogleServices = existsSync(join(__dirname, GOOGLE_SERVICES_FILE));
  return {
    ...config,
    name: config.name ?? 'Itacate',
    slug: config.slug ?? 'itacate',
    android: {
      ...config.android,
      ...(hasGoogleServices ? { googleServicesFile: `./${GOOGLE_SERVICES_FILE}` } : {}),
    },
    extra: { ...config.extra, google: { android: mapsKey, ios: iosKey } },
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', { androidGoogleMapsApiKey: mapsKey }],
    ],
  };
};

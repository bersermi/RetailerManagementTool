import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { ConfigContext, ExpoConfig } from 'expo/config';

// ============================================================================
// THE VALUES A STORE BUILD CARRIES AND THIS PUBLIC REPOSITORY DOES NOT.
// Plan tasks `10.2a` and `10.4g-i`; `app.json` holds everything else.
//
//   GOOGLE_MAPS_ANDROID_API_KEY — Google's map on Android, and its search there
//   GOOGLE_MAPS_IOS_API_KEY     — Google's map on an iPhone, and its search there (`10.4g-i`)
//   google-services.json        — push on Android (Firebase)
//
// All three live in EAS's environment (the wera-app organization's variables: the
// owner's, plan `10.2b`, and the iPhone key a session's, 2026-11-03, from the key
// he made — the handbook's *Google's search for Wera Cocina*). `eas-pre-install.sh`
// copies the Firebase file here before anything installs, so prebuild finds it,
// and REFUSES a store build without what its platform needs: a key a store build
// was made without cannot be added over the air.
//
// ⚠️ THE TWO KEYS GO TWO WAYS. Into `react-native-maps`' options, which compile
// them into the app — Android's manifest; the iPhone's `Info.plist`, its
// AppDelegate and Google's map itself, which the iPhone key's presence adds to the
// build (`plugin/build/ios.js`, 1.27.2). And into `extra.google`, where the search
// reads each phone's own (`@/lib/useGoogle`) — the same value, never a second
// variable for it. Expo writes `extra` into the build and into every update, so
// the update runbook refuses to publish without both (`test/support.test.ts`).
//
// ⚠️ WITHOUT A KEY, A PLACEHOLDER — NOT NOTHING. Measured 2026-10-27 on the
// emulator: with no key in the manifest the map throws *API key not found* as it
// renders and React drops the whole screen — a blank white app. With a wrong key
// it draws an empty map and the rest of the screen. So a build made without the
// keys (a local one) opens, shows that its map has none, and draws no search
// (`@/lib/google`'s `claveDe` refuses the placeholder). The placeholder also keeps
// the iPhone's Google map in every build, local ones too.
//
// ⚠️ NONE IS PART OF THE RUNTIME. `fingerprint.config.js` drops the Android key,
// masks the iPhone's — its presence is native, its value is not — and ignores the
// Firebase file, so this Mac, CI and EAS compute the same runtime with or without
// them. Without that, the hash computed here and the one EAS computes would
// differ: the cloud build refuses, and an update goes to a runtime no phone has.
// `test/runtime.test.ts` measures it with stand-in values.
//
// ⚠️ ITS TWIN, `itacate/app.config.ts`, IS AS IT WAS BEFORE `10.4g-i`: Itacate's
// map is still the skeleton's, on Apple's map on an iPhone, and asks no search.
// The iPhone key reaches it when its own map does (`10.5-iv`) — change both then.
// ============================================================================

export const MAPS_KEY_ENV = 'GOOGLE_MAPS_ANDROID_API_KEY';
export const IOS_MAPS_KEY_ENV = 'GOOGLE_MAPS_IOS_API_KEY';
export const MAPS_KEY_PLACEHOLDER = 'sin-clave';
export const GOOGLE_SERVICES_FILE = 'google-services.json';

/** The variables the bundle reads through `extra` — the update runbook's list for Wera Cocina names each. */
export const EXTRA_ENV = [MAPS_KEY_ENV, IOS_MAPS_KEY_ENV] as const;

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidKey = process.env[MAPS_KEY_ENV] || MAPS_KEY_PLACEHOLDER;
  const iosKey = process.env[IOS_MAPS_KEY_ENV] || MAPS_KEY_PLACEHOLDER;
  const hasGoogleServices = existsSync(join(__dirname, GOOGLE_SERVICES_FILE));
  return {
    ...config,
    name: config.name ?? 'Wera Cocina',
    slug: config.slug ?? 'cocina',
    android: {
      ...config.android,
      ...(hasGoogleServices ? { googleServicesFile: `./${GOOGLE_SERVICES_FILE}` } : {}),
    },
    extra: { ...config.extra, google: { android: androidKey, ios: iosKey } },
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', { androidGoogleMapsApiKey: androidKey, iosGoogleMapsApiKey: iosKey }],
    ],
  };
};

// ============================================================================
// WHICH BUILDS AN OVER-THE-AIR UPDATE MAY REACH. Plan tasks `10.2a` and `10.4g-i`.
// ⚠️ Its twin, `itacate/fingerprint.config.js`, is as it was before `10.4g-i`:
// Itacate carries no iPhone key yet — change both when it does (`10.5-iv`).
//
// The same rules as `app/fingerprint.config.js` (Wera's, measured 2026-10-10:
// version numbers, masked-view's manifest a local Android build rewrites inside
// `node_modules`, Kotlin's `.kotlin/` files), plus the values `app.config.ts`
// takes from EAS's environment:
//   - the Android map key, removed from the config before it is hashed;
//   - the iPhone map key, MASKED, not removed: its presence is what compiles
//     Google's map into an iPhone build (`react-native-maps`' plugin), so a config
//     without it must hash as another runtime — measured 2026-11-03, it moves the
//     runtime of both platforms;
//   - both keys' copies in `extra.google`, which the search reads, masked;
//   - `google-services.json`, ignored as a file.
// None of the values is JavaScript's business to hash, and all exist on EAS and not
// here — so a hash that included them would differ between this Mac and the cloud
// build. `test/runtime.test.ts` computes the runtime with and without stand-ins
// for all of them and requires one answer.
//
// ⚠️ IF THIS FILE THROWS WHILE LOADING, @expo/fingerprint USES AN EMPTY CONFIG
// AND SAYS NOTHING (Config.js, 0.20.12) — every rule here would be dropped
// silently. The same test is what notices.
// ============================================================================
const { SourceSkips } = require('@expo/fingerprint');

/** What a key's value is replaced by before the config is hashed. */
const OCULTA = 'clave-oculta';

/** The config with the keys' values taken out; anything else passes untouched. */
function withoutMapsKey(source, chunk) {
  if (source.type !== 'contents' || source.id !== 'expoConfig' || typeof chunk !== 'string') {
    return chunk;
  }
  let config;
  try {
    config = JSON.parse(chunk);
  } catch {
    return chunk;
  }
  for (const plugin of config.plugins ?? []) {
    if (Array.isArray(plugin) && plugin[0] === 'react-native-maps' && plugin[1]) {
      delete plugin[1].androidGoogleMapsApiKey;
      if (plugin[1].iosGoogleMapsApiKey) plugin[1].iosGoogleMapsApiKey = OCULTA;
    }
  }
  if (config.extra && config.extra.google) {
    config.extra.google = { android: OCULTA, ios: OCULTA };
  }
  return JSON.stringify(config);
}

module.exports = {
  sourceSkips:
    SourceSkips.ExpoConfigVersions | SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun,
  ignorePaths: [
    '**/.kotlin/**/*',
    '**/@react-native-masked-view/masked-view/android/src/main/AndroidManifest.xml',
    // ⚠️ Measured 2026-10-27 (`10.2b`): a local `pod install` REWRITES this header inside
    // node_modules (react-native-maps records whether Google's iOS map is in use). EAS
    // computes the runtime before its pod install, so every EAS build made from this Mac
    // failed on a runtime mismatch, Android's too. The header changes only with the
    // package's version (its package.json is still hashed) or the config (hashed).
    '**/react-native-maps/ios/AirMaps/RNMapsDefines.h',
    'google-services.json',
  ],
  fileHookTransform: withoutMapsKey,
};

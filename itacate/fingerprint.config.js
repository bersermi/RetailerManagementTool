// ============================================================================
// WHICH BUILDS AN OVER-THE-AIR UPDATE MAY REACH. Plan tasks `10.2a` and
// `10.5-iv-a-i`. ⚠️ Its twin, `cocina/fingerprint.config.js`, moved ahead in `10.4g-i`:
// it MASKS the iPhone map key, whose presence in the map's options is native — Itacate
// carries no iPhone key in the map's options until its own map (`10.5-iv-b`); change
// both then.
//
// The same rules as `app/fingerprint.config.js` (Wera's, measured 2026-10-10:
// version numbers, masked-view's manifest a local Android build rewrites inside
// `node_modules`, Kotlin's `.kotlin/` files), plus the values `app.config.ts`
// takes from EAS's environment:
//   - the Android map key, removed from the map's options before it is hashed;
//   - ⚠️ `extra.google` — both keys, read by her phone's questions to Google since
//     `10.5-iv-a-i` — REMOVED WHOLE, not masked as Wera Cocina's are: `extra` is
//     JavaScript's business (Expo writes it into every update), and with it gone the
//     config hashes exactly as it did before `10.5-iv-a-i`, so the runtime is the one
//     Itacate's test build in the field carries and the update reaches it (measured
//     on both platforms by `10.5-iv-a-i`);
//   - `google-services.json`, ignored as a file.
// None is JavaScript's to hash, and all exist on EAS and not here — so a hash that
// included them would differ between this Mac and the cloud build.
// `test/runtime.test.ts` computes the runtime with and without stand-ins for all of
// them and requires one answer.
//
// ⚠️ IF THIS FILE THROWS WHILE LOADING, @expo/fingerprint USES AN EMPTY CONFIG
// AND SAYS NOTHING (Config.js, 0.20.12) — every rule here would be dropped
// silently. The same test is what notices.
// ============================================================================
const { SourceSkips } = require('@expo/fingerprint');

/** The config with the keys taken out; anything else passes untouched. */
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
    }
  }
  if (config.extra && config.extra.google) {
    delete config.extra.google;
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

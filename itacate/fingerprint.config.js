// ============================================================================
// WHICH BUILDS AN OVER-THE-AIR UPDATE MAY REACH. Plan tasks `10.2a`, `10.5-iv-a-i`
// and `10.5-iv-b-i`.
//
// The same rules as `app/fingerprint.config.js` (Wera's, measured 2026-10-10:
// version numbers, masked-view's manifest a local Android build rewrites inside
// `node_modules`, Kotlin's `.kotlin/` files), plus the values `app.config.ts`
// takes from EAS's environment:
//   - the Android map key, removed from the map's options before it is hashed;
//   - ⚠️⚠️ SINCE `10.5-iv-b-i`, THE IPHONE MAP KEY AND THE IPHONE'S ICON, REMOVED from
//     what is hashed for BOTH platforms — the config is hashed as one text, the same
//     for Android and the iPhone (`@expo/fingerprint` 0.20.12, `sourcer/Expo.js`), and
//     neither touches Android's build: so Android's runtime is the one Itacate's test
//     build in the field carries, and Itacate's map reaches it as an update. Unlike
//     Wera Cocina's twin, which MASKS the iPhone key (its runtime moved anyway, in
//     `10.4g-i`), the key is removed: masked, it would still be new text in Android's
//     hash. The iPhone loses nothing: its icon's FILE is hashed for the iPhone alone
//     (`collectIosIcons`), and the key is in every build from its first — no iPhone build
//     of Itacate existed before the key's presence (`test/runtime.test.ts` holds it there);
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

/** The config with the keys and the iPhone's icon path taken out; anything else passes untouched. */
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
      delete plugin[1].iosGoogleMapsApiKey;
    }
  }
  if (config.ios && config.ios.icon) {
    delete config.ios.icon;
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

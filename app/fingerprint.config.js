// ============================================================================
// WHICH BUILDS AN OVER-THE-AIR UPDATE MAY REACH. Plan task 5R-b.
//
// `app.json` sets `runtimeVersion: { policy: 'fingerprint' }`: the runtime is a
// hash of everything native, and EAS Update hands an update only to a binary
// whose hash matches. That is what stops a JS bundle that needs a native module
// from landing on a phone built without it — a crash nothing in CI can see,
// because no workflow compiles this app.
//
// ⚠️ THE HASH MUST COME OUT THE SAME ON THIS MAC AS ON A CLEAN `npm ci`.
// `eas build` computes it here and EAS computes it again on a fresh install,
// and the build FAILS if they differ (@expo/build-tools 24.12.1:
// "Runtime version calculated on local machine not equal to runtime version
// calculated during build"). `eas update` computes it here too, and if it is
// wrong it publishes to a runtime no phone has and still reports success.
// Measured 2026-10-10, three things moved it with no edit by anyone:
//   - `version` / `ios.buildNumber` — EAS's auto-increment would put two
//     natively identical builds on two runtimes. Skipped below.
//   - a local Android build rewrites masked-view's AndroidManifest.xml inside
//     `node_modules` (it strips `package=`). Ignored below: the file changes
//     only with the package's version, and its package.json is still hashed.
//   - Kotlin 2 leaves `.kotlin/` session files beside the Gradle plugins while
//     a build runs. Ignored below, like the `build/` and `.gradle/` the
//     defaults already ignore.
// A config `sourceSkips` REPLACES the default one, so the default is kept here.
// ============================================================================
const { SourceSkips } = require('@expo/fingerprint');

module.exports = {
  sourceSkips:
    SourceSkips.ExpoConfigVersions | SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun,
  ignorePaths: [
    '**/.kotlin/**/*',
    '**/@react-native-masked-view/masked-view/android/src/main/AndroidManifest.xml',
  ],
};

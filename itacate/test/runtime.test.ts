import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createFingerprintAsync } from '@expo/fingerprint';
import { afterAll, describe, expect, it } from 'vitest';

// ============================================================================
// THE RUNTIME DOES NOT DEPEND ON THE SECRETS — AND IS THE ONE ITACATE'S TEST BUILD
// IN THE FIELD CARRIES. Plan tasks `10.2a`, `10.5-iv-a-i` and `10.5-iv-b-i`.
//
// ⚠️⚠️ SINCE `10.5-iv-b-i` THE IPHONE KEY IS IN THE MAP'S OPTIONS — ALWAYS, THE
// PLACEHOLDER AT WORST — and the iPhone has an icon of its own (`ios.icon`, the cow on
// Itacate's blue): its presence compiles Google's map into every iPhone build, which
// Google's terms require of Google's points (3.2.3(e)). Neither touches Android's build,
// and `fingerprint.config.js` takes both out of the config before it is hashed, so
// Android's runtime stays the field build's and the map reaches it as an update. The
// iPhone's icon FILE is still hashed, for the iPhone alone — read below off the
// fingerprint's own list of sources.
//
// EAS has the two keys and google-services.json; this Mac and CI do not. The
// runtime an update is published to is computed on this Mac, and the one a build
// carries is computed on EAS, so if the secrets entered the hash the two would
// disagree: the build refuses, or an update reaches nobody and still says
// "Published!". `fingerprint.config.js` drops each. This computes the runtime with
// the same command the update runbook uses, without the secrets and with stand-ins
// for all three, on both platforms, and requires one answer.
//
// ⚠️ NOT VACUOUS: before comparing, it shows the stand-ins reached the config — the
// Android key in react-native-maps' options, both keys in `extra.google`, the file
// as `googleServicesFile`. Equal hashes over a config the stand-ins never reached
// would prove nothing.
//
// ⚠️ AND PINNED TO THE FIELD (`10.5-iv-a-i`): the Android runtime must be the one
// Itacate's only test build carries (`2b638d21`, plan `10.2b`; the update of
// `10.5-iii-b` went to it) — a change that moves it strands every update until a
// new build, as `docs/checks/wera-runtime.sh` holds Wera's. No iPhone build exists,
// so the iPhone's runtime is held equal with and without the keys only. A new build
// moves the pin, in the PR that makes it.
// ============================================================================

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIREBASE = join(ROOT, 'google-services.json');
const STAND_IN_KEY = 'clave-de-prueba-10-2a';
const STAND_IN_IOS_KEY = 'clave-de-prueba-10-5-iv-a-i';

/** The runtime of build `2b638d21`, Itacate's Android test build — read off the update that reached it (`10.5-iii-b`). */
const RUNTIME_DE_SU_BUILD_ANDROID = '4de35b0b452e9511322b8cd61b27f70508aa8d3d';

function npx(args: string[], withSecrets: boolean): string {
  const env = { ...process.env };
  delete env.GOOGLE_MAPS_ANDROID_API_KEY;
  delete env.GOOGLE_MAPS_IOS_API_KEY;
  if (withSecrets) {
    env.GOOGLE_MAPS_ANDROID_API_KEY = STAND_IN_KEY;
    env.GOOGLE_MAPS_IOS_API_KEY = STAND_IN_IOS_KEY;
  }
  return execFileSync('npx', args, { cwd: ROOT, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function runtime(platform: 'ios' | 'android', withSecrets: boolean): string {
  const hash = JSON.parse(npx(['expo-updates', 'fingerprint:generate', '--platform', platform], withSecrets)).hash;
  expect(hash).toMatch(/^[0-9a-f]{40}$/);
  return hash;
}

function config(withSecrets: boolean) {
  return JSON.parse(npx(['expo', 'config', '--json', '--type', 'prebuild'], withSecrets));
}

function mapsOptions(cfg: { plugins?: unknown[] }) {
  const entry = (cfg.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'react-native-maps');
  return (entry as [string, { androidGoogleMapsApiKey?: string; iosGoogleMapsApiKey?: string }] | undefined)?.[1];
}

describe('the runtime ignores the two keys and google-services.json', () => {
  const hadFirebase = existsSync(FIREBASE);
  afterAll(() => {
    if (!hadFirebase) rmSync(FIREBASE, { force: true });
  });

  it('without them: the placeholder for each key — the iPhone’s in the map’s options too — and no Firebase file', () => {
    if (hadFirebase) return; // a real file is here; the comparison below still runs
    const cfg = config(false);
    expect(mapsOptions(cfg)?.androidGoogleMapsApiKey).toBe('sin-clave');
    // ⚠️ Present even without the key: Google's map is compiled into EVERY iPhone build.
    expect(mapsOptions(cfg)?.iosGoogleMapsApiKey).toBe('sin-clave');
    expect(cfg.extra?.google).toEqual({ android: 'sin-clave', ios: 'sin-clave' });
    expect(cfg.android?.googleServicesFile).toBeUndefined();
  }, 120_000);

  it('the same runtime with stand-ins for all three, on both platforms — Android’s the field build’s', () => {
    const without = { ios: runtime('ios', false), android: runtime('android', false) };
    expect(without.android).toBe(RUNTIME_DE_SU_BUILD_ANDROID);

    if (!hadFirebase) writeFileSync(FIREBASE, JSON.stringify({ project_info: { project_id: 'prueba' } }));
    const cfg = config(true);
    expect(mapsOptions(cfg)?.androidGoogleMapsApiKey).toBe(STAND_IN_KEY);
    expect(mapsOptions(cfg)?.iosGoogleMapsApiKey).toBe(STAND_IN_IOS_KEY);
    expect(cfg.extra?.google).toEqual({ android: STAND_IN_KEY, ios: STAND_IN_IOS_KEY });
    expect(cfg.android?.googleServicesFile).toBe('./google-services.json');

    expect(runtime('ios', true)).toBe(without.ios);
    expect(runtime('android', true)).toBe(without.android);
  }, 240_000);
});

describe('the iPhone’s icon is its own, and hashed for the iPhone alone (`10.5-iv-b-i`)', () => {
  it('is `ios.icon`, and the top-level icon — Android’s below 8 — stays Wera’s', () => {
    const app = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo;
    expect(app.ios.icon).toBe('./assets/images/icon.png');
    expect(app.icon).toBe('../app/assets/images/icon.png');
  });

  // ⚠️ Its key and its path are taken out of the config's text before hashing — that the
  // Android runtime above is still the field build's, with both in the config, is the proof
  // (the fingerprint's debug listing shows the text BEFORE `fileHookTransform`).
  it('the iPhone’s runtime reads the icon’s file, Android’s does not', async () => {
    const files = async (platform: 'ios' | 'android') => {
      const print = await createFingerprintAsync(ROOT, { platforms: [platform], debug: true });
      return (print.sources as { filePath?: string }[]).map((source) => source.filePath).filter(Boolean);
    };
    expect(await files('ios')).toContain('assets/images/icon.png');
    expect(await files('android')).not.toContain('assets/images/icon.png');
  }, 120_000);
});

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

// ============================================================================
// THE RUNTIME DOES NOT DEPEND ON THE SECRETS — AND IS THE ONE ITACATE'S TEST BUILD
// IN THE FIELD CARRIES. Plan tasks `10.2a` and `10.5-iv-a-i`.
// ⚠️ Its twin in `cocina/test/` also holds the iPhone key IN THE MAP'S OPTIONS,
// where its presence compiles Google's map into an iPhone build: Itacate carries it
// only in `extra.google` until its own map (`10.5-iv-b`) — change both then.
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

  it('without them: the placeholder for each key, no iPhone key in the map’s options, no Firebase file', () => {
    if (hadFirebase) return; // a real file is here; the comparison below still runs
    const cfg = config(false);
    expect(mapsOptions(cfg)?.androidGoogleMapsApiKey).toBe('sin-clave');
    expect(mapsOptions(cfg)?.iosGoogleMapsApiKey).toBeUndefined();
    expect(cfg.extra?.google).toEqual({ android: 'sin-clave', ios: 'sin-clave' });
    expect(cfg.android?.googleServicesFile).toBeUndefined();
  }, 120_000);

  it('the same runtime with stand-ins for all three, on both platforms — Android’s the field build’s', () => {
    const without = { ios: runtime('ios', false), android: runtime('android', false) };
    expect(without.android).toBe(RUNTIME_DE_SU_BUILD_ANDROID);

    if (!hadFirebase) writeFileSync(FIREBASE, JSON.stringify({ project_info: { project_id: 'prueba' } }));
    const cfg = config(true);
    expect(mapsOptions(cfg)?.androidGoogleMapsApiKey).toBe(STAND_IN_KEY);
    expect(mapsOptions(cfg)?.iosGoogleMapsApiKey).toBeUndefined();
    expect(cfg.extra?.google).toEqual({ android: STAND_IN_KEY, ios: STAND_IN_IOS_KEY });
    expect(cfg.android?.googleServicesFile).toBe('./google-services.json');

    expect(runtime('ios', true)).toBe(without.ios);
    expect(runtime('android', true)).toBe(without.android);
  }, 240_000);
});

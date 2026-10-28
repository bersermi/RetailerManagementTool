import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

// ============================================================================
// THE RUNTIME DOES NOT DEPEND ON THE TWO SECRETS. Plan task `10.2a`.
// ⚠️ The same test is in `itacate/test/` — change both.
//
// EAS has the map key and google-services.json; this Mac and CI do not. The
// runtime an update is published to is computed on this Mac, and the one a
// build carries is computed on EAS, so if the secrets entered the hash the two
// would disagree: the build refuses, or an update reaches nobody and still says
// "Published!". `fingerprint.config.js` drops both. This computes the runtime
// with the same command the update runbook uses, without the secrets and with
// stand-ins for both, on both platforms, and requires one answer.
//
// ⚠️ NOT VACUOUS: before comparing, it shows the stand-ins reached the config —
// the key in react-native-maps' options, the file as `googleServicesFile`. Equal
// hashes over a config the stand-ins never reached would prove nothing.
// ============================================================================

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIREBASE = join(ROOT, 'google-services.json');
const STAND_IN_KEY = 'clave-de-prueba-10-2a';

function npx(args: string[], withSecrets: boolean): string {
  const env = { ...process.env };
  delete env.GOOGLE_MAPS_ANDROID_API_KEY;
  if (withSecrets) env.GOOGLE_MAPS_ANDROID_API_KEY = STAND_IN_KEY;
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
  return (entry as [string, { androidGoogleMapsApiKey?: string }] | undefined)?.[1];
}

describe('the runtime ignores the map key and google-services.json', () => {
  const hadFirebase = existsSync(FIREBASE);
  afterAll(() => {
    if (!hadFirebase) rmSync(FIREBASE, { force: true });
  });

  it('without them: the placeholder key, no Firebase file', () => {
    if (hadFirebase) return; // a real file is here; the comparison below still runs
    const cfg = config(false);
    expect(mapsOptions(cfg)?.androidGoogleMapsApiKey).toBe('sin-clave');
    expect(cfg.android?.googleServicesFile).toBeUndefined();
  }, 120_000);

  it('the same runtime with stand-ins for both, on both platforms', () => {
    const without = { ios: runtime('ios', false), android: runtime('android', false) };

    if (!hadFirebase) writeFileSync(FIREBASE, JSON.stringify({ project_info: { project_id: 'prueba' } }));
    const cfg = config(true);
    expect(mapsOptions(cfg)?.androidGoogleMapsApiKey).toBe(STAND_IN_KEY);
    expect(cfg.android?.googleServicesFile).toBe('./google-services.json');

    expect(runtime('ios', true)).toBe(without.ios);
    expect(runtime('android', true)).toBe(without.android);
  }, 240_000);
});

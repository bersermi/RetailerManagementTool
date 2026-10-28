import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// ============================================================================
// WHO THIS APP IS, TO THE STORES AND TO SIGN-IN. Plan task `10.2a`.
//
// ⚠️ THE ID BECOMES PERMANENT AT THE FIRST UPLOAD to Google Play or App Store
// Connect — ruled by the owner on 2026-10-27 (plan `10.2a`). It is also
// the deep-link scheme, as in Wera (`app/src/auth/oauth.ts`): a sign-in that
// leaves for Google comes back to `<id>://auth/callback`, a string the Supabase
// dashboard must also hold. Three copies of one string drifting apart is the
// failure, so this reads `app.json` and requires one.
//
// And what this app may ask the person for: the camera (photos of what a fonda
// publishes) and notifications — never her location, which is blocked even if
// a library declares it (plan `10.2a`: the fonda's pin is set on a map).
// ============================================================================

const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const ID = 'mx.wera.cocina';

describe('identity', () => {
  it('one id: iOS bundle, Android package and the sign-in scheme', () => {
    expect(app.ios.bundleIdentifier).toBe(ID);
    expect(app.android.package).toBe(ID);
    expect(app.scheme).toBe(ID);
  });

  it('a runtime that is a fingerprint, as Wera’s', () => {
    expect(app.runtimeVersion).toEqual({ policy: 'fingerprint' });
  });
});

describe('what it may ask for', () => {
  const plugins: unknown[] = app.plugins;
  const named = (name: string) =>
    plugins.find((p) => p === name || (Array.isArray(p) && p[0] === name));

  it('notifications, and the camera with a Spanish reason and no gallery or microphone', () => {
    expect(named('expo-notifications')).toBeTruthy();
    const [, camera] = named('expo-image-picker') as [string, Record<string, unknown>];
    expect(camera.cameraPermission).toMatch(/cámara/);
    expect(camera.photosPermission).toBe(false);
    expect(camera.microphonePermission).toBe(false);
  });

  it('never the location', () => {
    expect(named('expo-location')).toBeUndefined();
    for (const p of [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
    ]) {
      expect(app.android.blockedPermissions).toContain(p);
    }
  });
});

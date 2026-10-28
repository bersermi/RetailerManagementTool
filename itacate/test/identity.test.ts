import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// ============================================================================
// WHO THIS APP IS, TO THE STORES AND TO SIGN-IN. Plan task `10.2a`.
//
// ⚠️ THE ID BECOMES PERMANENT AT THE FIRST UPLOAD to Google Play or App Store
// Connect — ruled by the owner on 2026-10-27 (plan `10.2a`). It says
// `vecino`, not the app's name, on purpose: *Itacate* waits on the owner's IMPI
// search, and a display name can change where an id cannot. It is also the
// deep-link scheme, as in Wera (`app/src/auth/oauth.ts`): a sign-in that leaves
// for Google comes back to `<id>://auth/callback`, a string the Supabase
// dashboard must also hold. This reads `app.json` and requires one string.
//
// And what this app may ask the person for: her location only while the app is
// open (to show what is near), and notifications. Never in the background,
// never the camera.
// ============================================================================

const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const ID = 'mx.wera.vecino';

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

  it('location while the app is open, with a Spanish reason — and nothing “always”', () => {
    const [, location] = named('expo-location') as [string, Record<string, unknown>];
    expect(location.locationWhenInUsePermission).toMatch(/ubicación/);
    expect(location.locationAlwaysAndWhenInUsePermission).toBe(false);
    expect(location.locationAlwaysPermission).toBe(false);
    expect(location.isIosBackgroundLocationEnabled).toBe(false);
    expect(location.isAndroidBackgroundLocationEnabled).toBe(false);
    expect(location.isAndroidForegroundServiceEnabled).toBe(false);
    expect(app.android.blockedPermissions).toContain('android.permission.ACCESS_BACKGROUND_LOCATION');
  });

  it('notifications, and never the camera', () => {
    expect(named('expo-notifications')).toBeTruthy();
    expect(named('expo-image-picker')).toBeUndefined();
  });
});

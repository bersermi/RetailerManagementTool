import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// ============================================================================
// WHAT THE APP IS CALLED, AND THE ONE STRING THAT HAS A COPY IN SOMEBODY ELSE'S
// DASHBOARD. Plan task 5a-iii-a.
//
// ⚠️ WHY A SUITE READS A CONFIG FILE. `app.json` is not code and nothing here
// renders — but three of its values are a CONTRACT WITH THINGS OUTSIDE THIS
// REPOSITORY, and two of those cannot be changed back:
//
//   * `ios.bundleIdentifier` / `android.package` — permanent once an app with
//     that id holds data on a device, and permanent at submission. `5a-iv` puts
//     a build on the owner's own iPhone, which is the moment it sets.
//   * `scheme` — the redirect target `5a-iii-b` must add to the Supabase
//     dashboard's allow-list as `mx.bserafin.wera://**`. ⚠️ THE COPY IN THE
//     DASHBOARD IS NOT IN THIS REPOSITORY AND NO FILE HERE CAN SEE IT. A
//     scheme quietly edited to something tidier is a Google sign-in where the
//     browser opens and never comes back — the exact failure the plan names as
//     `5a-iii-b`'s whole risk, and it looks identical to a hang.
//
// So the scheme and the bundle id are asserted to be THE SAME STRING. They do
// not have to be; making them so means there is one value to keep in step with
// the dashboard instead of two, and a check that can notice.
// ============================================================================

const BUNDLE_ID = 'mx.bserafin.wera';

const app = JSON.parse(
  readFileSync(fileURLToPath(new URL('../app.json', import.meta.url)), 'utf8'),
) as {
  expo: {
    name: string;
    slug: string;
    scheme: string;
    platforms: string[];
    ios: { bundleIdentifier?: string };
    android: { package?: string };
  };
};

describe('the app is Wera, on one identity', () => {
  // ⚠️ THE REPOSITORY AND THE PACKAGES STAY `tienda` DELIBERATELY — that is the
  // codebase's name and the `@tienda/*` scope. `Wera` is what the shopkeeper's
  // home screen says, and this file is the boundary between the two.
  it('is named Wera where a person can read it', () => {
    expect(app.expo.name).toBe('Wera');
  });

  it('carries the same bundle identifier on both platforms', () => {
    expect(app.expo.ios.bundleIdentifier).toBe(BUNDLE_ID);
    expect(app.expo.android.package).toBe(BUNDLE_ID);
  });

  // The load-bearing one: this is the half of 5a-iii-b's redirect that lives in
  // a file. The other half is in the Supabase dashboard.
  it('uses the bundle identifier as the deep-link scheme', () => {
    expect(app.expo.scheme).toBe(BUNDLE_ID);
  });

  // C1.1: both platforms from creation, because a platform added later is a
  // config change nobody reviews.
  it('still declares both platforms', () => {
    expect([...app.expo.platforms].sort()).toEqual(['android', 'ios']);
  });
});

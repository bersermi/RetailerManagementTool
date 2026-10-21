// `@/theme/apertura` — the opening, the cow turning into the logo (`8g`, the
// owner's note of 2026-10-21). The motion is the phone's to show (`R9`); what
// is pinned is that it starts on the native splash's frame and ends on the
// icon's picture, read off the two files that draw those, so a change to
// either is a red here rather than a jump on his phone.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  COW_BOX,
  ICON_VIEW_UNITS,
  MARK_UNITS,
  SPLASH_IMAGE_WIDTH,
  SPLASH_VIEW_UNITS,
  SQUARE_SIDE,
  openingLength,
  settledScale,
} from '@/theme/apertura';

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');

describe('the opening starts where the splash leaves her', () => {
  it('uses the width the splash draws its picture at', () => {
    const app = JSON.parse(read('../app.json')) as {
      expo: { plugins: (string | [string, { imageWidth?: number }])[] };
    };
    const splash = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen');
    expect(Array.isArray(splash) ? splash[1].imageWidth : null).toBe(SPLASH_IMAGE_WIDTH);
  });

  it('uses the view boxes the icon script draws the splash and the icon from', () => {
    const script = read('../../brand/render-icons.sh');
    expect(script).toMatch(new RegExp(`draw splash\\s+\\d+\\s+\\d+ "\\d+ \\d+ ${SPLASH_VIEW_UNITS} \\d+"`));
    expect(script).toMatch(new RegExp(`draw icon\\s+\\d+ \\d+ "-70 -70 ${ICON_VIEW_UNITS} ${ICON_VIEW_UNITS}"`));
    expect(read('../../brand/wera-mark.svg')).toContain(`viewBox="0 0 ${MARK_UNITS} ${MARK_UNITS}"`);
  });

  it('puts the whole mark at the size the splash shows it, and the icon square around it', () => {
    expect(COW_BOX).toBeCloseTo(158.58, 1);
    expect(SQUARE_SIDE / COW_BOX).toBeCloseTo(ICON_VIEW_UNITS / MARK_UNITS, 6);
  });
});

describe('the opening ends at the density’s seal', () => {
  it('settles the square at the side it is given', () => {
    expect(SQUARE_SIDE * settledScale(110)).toBeCloseTo(110, 6);
    expect(settledScale(SQUARE_SIDE)).toBe(1);
  });

  it('is over in under two seconds, as the page he saw', () => {
    expect(openingLength(1)).toBeLessThan(2_000);
    expect(openingLength(1)).toBeGreaterThan(1_000);
  });
});

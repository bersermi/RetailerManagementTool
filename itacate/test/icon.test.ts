import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { PALETTE } from '@/theme/palette';

// ============================================================================
// ITACATE'S IPHONE ICON — THE COW ON ITACATE'S BLUE. Plan task `10.5-iv-b-i`, the
// owner's ruling of 2026-11-05 (the family-shell page's call 6: *"Itacate in its own
// blue, and the cow on that blue as its icon on both phones — in Itacate's first iPhone
// build"*). Android 8 and later already draw it (the adaptive icon: Wera's cream mark on
// `adaptiveIcon.backgroundColor`); the iPhone drew Wera's rust icon until this file.
//
// ⚠️ `ios.icon` ALONE: the top-level `icon` is also Android's launcher icon below
// Android 8, and changing it would move Itacate's Android runtime (`test/runtime.test.ts`).
// Drawn by `store/cocina-itacate/render.sh itacate-icono` from `brand/wera-mark.svg`.
//
// ⚠️ THE ICON MUST HAVE NO ALPHA CHANNEL: App Store Connect refuses the upload of one
// that has — at the first submission, long after the build. The PNG reader is Wera
// Cocina's (`cocina/test/icon.test.ts`), copied.
// ============================================================================

const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;

const BLUE = PALETTE.accion; // #24476B — the ground of Itacate's Android icon since `10.2a`
const CREAM = '#FFF8EC'; // the mark's cream, as on Wera's icon (`brand/render-icons.sh`)

type Png = { width: number; height: number; channels: 3 | 4; pixels: Buffer };

/** An 8-bit, non-interlaced RGB or RGBA PNG, decoded — what Chrome and `sips` write. */
function readPng(path: string): Png {
  const file = readFileSync(new URL(`../${path}`, import.meta.url));
  const idat: Buffer[] = [];
  let width = 0;
  let height = 0;
  let header = Buffer.alloc(0);
  for (let at = 8; at < file.length; ) {
    const length = file.readUInt32BE(at);
    const kind = file.toString('latin1', at + 4, at + 8);
    const data = file.subarray(at + 8, at + 8 + length);
    if (kind === 'IHDR') header = data;
    if (kind === 'IDAT') idat.push(data);
    at += 12 + length;
  }
  width = header.readUInt32BE(0);
  height = header.readUInt32BE(4);
  expect({ depth: header[8], interlace: header[12] }).toEqual({ depth: 8, interlace: 0 });
  expect([2, 6]).toContain(header[9]); // 2 RGB, 6 RGBA
  const channels = header[9] === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const corner = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0;
      const p = left + up - corner;
      const [pa, pb, pc] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - corner)];
      const predicted = [
        0,
        left,
        up,
        (left + up) >> 1,
        pa <= pb && pa <= pc ? left : pb <= pc ? up : corner,
      ][filter];
      pixels[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + predicted) & 0xff;
    }
  }
  return { width, height, channels, pixels };
}

const hex = (png: Png, i: number) =>
  `#${[0, 1, 2].map((c) => png.pixels[i + c].toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** How many fully opaque pixels each colour has, most first. */
function opaqueColours(png: Png): [string, number][] {
  const counts = new Map<string, number>();
  for (let i = 0; i < png.pixels.length; i += png.channels) {
    if (png.channels === 4 && png.pixels[i + 3] !== 255) continue;
    counts.set(hex(png, i), (counts.get(hex(png, i)) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}

describe('the iPhone’s icon', () => {
  it('is this app’s own file, for the iPhone alone', () => {
    expect(app.ios.icon).toBe('./assets/images/icon.png');
  });

  it('is 1024 square with no alpha channel, which App Store Connect requires', () => {
    const icon = readPng(app.ios.icon);
    expect({ width: icon.width, height: icon.height, channels: icon.channels }).toEqual({
      width: 1024,
      height: 1024,
      channels: 3,
    });
  });

  it('is the cream cow on Itacate’s blue — the ground Android’s adaptive icon carries', () => {
    const icon = readPng(app.ios.icon);
    expect(app.android.adaptiveIcon.backgroundColor).toBe(BLUE);
    expect(hex(icon, 0)).toBe(BLUE);
    const [ground, mark] = opaqueColours(icon);
    expect([ground[0], mark[0]]).toEqual([BLUE, CREAM]);
    expect((ground[1] + mark[1]) / (icon.width * icon.height)).toBeGreaterThan(0.97);
  });
});

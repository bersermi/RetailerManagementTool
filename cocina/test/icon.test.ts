import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { PALETTE } from '@/theme/palette';

// ============================================================================
// WERA COCINA'S OWN ICON AND LAUNCH SCREEN. Plan task `10.4d-ii`, the owner's two
// rulings of 2026-11-02: the icon is Wera's cream cow on this app's green, on both
// platforms; the launch screen, the same cow in this app's green on the cream.
//
// Both are this app's own files (`assets/images/`, drawn by
// `store/cocina-itacate/render.sh` from `brand/wera-mark.svg`), nothing in Wera's
// folder. `icon` is the iPhone's icon AND Android's launcher icon below Android 8
// (Expo 57 draws the legacy icon from the same field); Android 8 and later draw the
// adaptive icon, Wera's cream foreground on `adaptiveIcon.backgroundColor`.
//
// ⚠️ THE ICON MUST HAVE NO ALPHA CHANNEL: App Store Connect refuses the upload of
// one that has — at the first submission (`10.5b`), weeks after the build. So this
// reads the pixels: a picture re-drawn in another colour, or with an alpha channel,
// fails here and not at Apple.
// ============================================================================

const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const splash = (app.plugins as unknown[]).find(
  (p): p is [string, { backgroundColor: string; image: string }] => Array.isArray(p) && p[0] === 'expo-splash-screen',
)?.[1];

const GREEN = PALETTE.accion; // #1C6B4B — the colour of Cocina's Android icon since `10.2a`
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

describe('the icon', () => {
  it('is this app’s own file, not Wera’s', () => {
    expect(app.icon).toBe('./assets/images/icon.png');
  });

  it('is 1024 square with no alpha channel, which App Store Connect requires', () => {
    const icon = readPng(app.icon);
    expect({ width: icon.width, height: icon.height, channels: icon.channels }).toEqual({
      width: 1024,
      height: 1024,
      channels: 3,
    });
  });

  it('is the cream cow on this app’s green — the ground Android’s adaptive icon carries', () => {
    const icon = readPng(app.icon);
    expect(app.android.adaptiveIcon.backgroundColor).toBe(GREEN);
    expect(hex(icon, 0)).toBe(GREEN);
    const [ground, mark] = opaqueColours(icon);
    expect([ground[0], mark[0]]).toEqual([GREEN, CREAM]);
    expect((ground[1] + mark[1]) / (icon.width * icon.height)).toBeGreaterThan(0.97);
  });
});

describe('the launch screen', () => {
  it('is this app’s own cow, on the app’s cream', () => {
    expect(splash?.image).toBe('./assets/images/splash-icon.png');
    expect(splash?.backgroundColor).toBe(PALETTE.fondo);
  });

  it('is the cow in this app’s green on nothing, so the cream shows round it and through it', () => {
    const cow = readPng(splash!.image);
    expect(cow.channels).toBe(4);
    expect(cow.pixels[3]).toBe(0); // the corner is transparent
    const colours = opaqueColours(cow);
    expect(colours.map(([colour]) => colour)).toEqual([GREEN]);
    expect(colours[0][1] / (cow.width * cow.height)).toBeGreaterThan(0.25);
  });
});

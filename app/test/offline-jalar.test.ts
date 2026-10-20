// ============================================================================
// PULLING DOWN TO REFRESH — `@/offline/jalar`, plan task `8g` (the offline
// report's E, ruled 2026-10-20).
// ============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { OFFLINE_PULL_MS, REFRESH_CAP_MS, refetchesOnPull } from '@/offline/jalar';

describe('what a pull does', () => {
  it('asks the server when there is a signal, or when nothing has read the network yet', () => {
    expect(refetchesOnPull(true)).toBe(true);
    expect(refetchesOnPull(null)).toBe(true);
  });

  it('asks nothing offline, and lets the spinner go almost at once', () => {
    expect(refetchesOnPull(false)).toBe(false);
    expect(OFFLINE_PULL_MS).toBeLessThan(1_000);
  });

  it('never lets the spinner hang on a link with no internet behind it', () => {
    expect(REFRESH_CAP_MS).toBeGreaterThan(OFFLINE_PULL_MS);
    expect(REFRESH_CAP_MS).toBeLessThanOrEqual(10_000);
  });
});

describe('the pull is never on a counter', () => {
  // ⚠️⚠️ THE OWNER'S ROUND, SAID IN THE REPORT: a pull while selling would
  // reload the list under her thumb. Read as text — a component is out of reach.
  const SRC = fileURLToPath(new URL('../src/app/(tabs)', import.meta.url));
  for (const counter of ['vender.tsx', 'comprar.tsx', 'desperdicio.tsx']) {
    it(`${counter} draws no refresh control`, () => {
      const text = readFileSync(`${SRC}/${counter}`, 'utf8');
      expect(text.length).toBeGreaterThan(400);
      expect(text).not.toMatch(/refreshControl|<Jalar|RefreshControl/);
    });
  }
});

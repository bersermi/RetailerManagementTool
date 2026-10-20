// ============================================================================
// TEACHING IT ONCE — `@/offline/ensenar`, plan task `8g` (the offline report's
// *"Teaching it, quietly"*, ruled 2026-10-20).
// ============================================================================

import { describe, expect, it } from 'vitest';

import { FIRST_OUTAGE_KEY, FIRST_SALE_KEY, firstTime } from '@/offline/ensenar';
import type { DeviceStore } from '@/lib/store';
import { ES } from '@/strings';

function memory(): DeviceStore & { held: Record<string, string> } {
  const held: Record<string, string> = {};
  return {
    held,
    getItem: (key) => held[key] ?? null,
    setItem: (key, value) => {
      held[key] = value;
    },
    removeItem: (key) => {
      delete held[key];
    },
  };
}

describe('each hint is shown once on a phone', () => {
  it('is the first time once, and never again', () => {
    const store = memory();
    expect(firstTime(store, FIRST_SALE_KEY)).toBe(true);
    expect(firstTime(store, FIRST_SALE_KEY)).toBe(false);
    expect(firstTime(store, FIRST_SALE_KEY)).toBe(false);
  });

  it('keeps the two moments apart', () => {
    const store = memory();
    expect(firstTime(store, FIRST_SALE_KEY)).toBe(true);
    expect(firstTime(store, FIRST_OUTAGE_KEY)).toBe(true);
  });

  it('never teaches on a phone that cannot remember — a hint on every launch is a nag', () => {
    expect(firstTime(undefined, FIRST_SALE_KEY)).toBe(false);
    const forgetful: DeviceStore = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    expect(firstTime(forgetful, FIRST_SALE_KEY)).toBe(false);
  });

  it('survives a store that throws, as the store module promises', () => {
    const broken: DeviceStore = {
      getItem: () => {
        throw new Error('disk full');
      },
      setItem: () => {
        throw new Error('disk full');
      },
      removeItem: () => {},
    };
    expect(() => firstTime(broken, FIRST_SALE_KEY)).not.toThrow();
  });

  it('says what the owner was shown', () => {
    expect(ES.offline.firstSale).toBe(
      'Wera funciona sin internet: si se va la señal, tus ventas se guardan en el teléfono y se envían solas.',
    );
    expect(ES.offline.firstNotice).toBe('Sin internet: puedes seguir vendiendo');
  });
});

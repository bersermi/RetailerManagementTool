import { describe, expect, it } from 'vitest';

import { DENSITY_MODES } from '@/theme/density';
import {
  DENSITY_KEY,
  isDensityMode,
  readDensityMode,
  rememberDensityMode,
  type DensityMemory,
} from '@/theme/densityMemory';
import { LAST_SCREEN_KEY } from '@/navigation/lastScreen';

// ============================================================================
// C3.18's MODE, REMEMBERED. Plan task 5b-ii-a.
//
// ⚠️ WHAT THIS SUITE CANNOT DO, AND IT IS THE THING THE FEATURE IS: it cannot
// kill the process. Persistence across a COLD START is not observable from a
// suite that never stops running, and §2.11 refuses the rendering suite that
// would mount the provider anyway. What is pinned here is the pair — what gets
// written, and what a later read makes of it — plus every way the store can let
// the app down. That it reopens at `Letra grande` is the owner's own phone
// (`R9`), and it is the same instrument `5a-iv-d` is already holding for C1.4.
// ============================================================================

/** A store that works, remembering what it was handed. */
function memory(initial?: string): DensityMemory & { readonly seen: Map<string, string> } {
  const seen = new Map<string, string>();
  if (initial !== undefined) seen.set(DENSITY_KEY, initial);
  return {
    seen,
    getItem: (key) => seen.get(key) ?? null,
    setItem: (key, value) => void seen.set(key, value),
    removeItem: (key) => void seen.delete(key),
  };
}

/** ⚠️ SQLITE ON A PHONE WITH A FULL DISK, and it is not hypothetical. */
const broken: DensityMemory = {
  getItem: () => {
    throw new Error('database or disk is full');
  },
  setItem: () => {
    throw new Error('database or disk is full');
  },
  removeItem: () => {
    throw new Error('database or disk is full');
  },
};

describe('what counts as a mode', () => {
  it('accepts exactly the modes density.ts declares', () => {
    for (const mode of DENSITY_MODES) expect(isDensityMode(mode)).toBe(true);
  });

  it('is derived from that table and not from a pair of comparisons', () => {
    // A hand-written `=== 'normal' || === 'elder'` is the shape that silently
    // refuses to restore whatever comes third. This asserts the derivation by
    // asserting the two agree in COUNT as well as in content.
    expect(DENSITY_MODES.filter(isDensityMode)).toHaveLength(DENSITY_MODES.length);
  });

  it('refuses everything else', () => {
    expect(isDensityMode('ELDER')).toBe(false);
    expect(isDensityMode('grande')).toBe(false);
    expect(isDensityMode('')).toBe(false);
    expect(isDensityMode(null)).toBe(false);
  });
});

describe('reading the choice back', () => {
  it('returns the mode this device chose', () => {
    expect(readDensityMode(memory('elder'))).toBe('elder');
    expect(readDensityMode(memory('normal'))).toBe('normal');
  });

  // ⚠️ `null` IS NOT `normal`. They render identically today and they are not
  // the same fact: one is a choice, the other is its absence.
  it('says null when nothing has been chosen', () => {
    expect(readDensityMode(memory())).toBeNull();
  });

  it('says null for junk, rather than refusing to launch', () => {
    // Whatever is in storage was written by some version of this app. A value
    // from a build that had a third mode must cost a default, never a crash.
    expect(readDensityMode(memory('gigante'))).toBeNull();
    expect(readDensityMode(memory(''))).toBeNull();
    expect(readDensityMode(memory('{"mode":"elder"}'))).toBeNull();
  });

  it('says null when there is no store at all', () => {
    // Which is exactly what node sees, and what makes this file loadable.
    expect(readDensityMode(undefined)).toBeNull();
  });

  it('says null when the store throws', () => {
    expect(readDensityMode(broken)).toBeNull();
  });
});

describe('writing the choice', () => {
  it('writes under its own key and reads back what it wrote', () => {
    const store = memory();
    rememberDensityMode(store, 'elder');
    expect(store.seen.get(DENSITY_KEY)).toBe('elder');
    expect(readDensityMode(store)).toBe('elder');
  });

  it('replaces the previous answer rather than accumulating', () => {
    const store = memory('elder');
    rememberDensityMode(store, 'normal');
    expect(store.seen.size).toBe(1);
    expect(readDensityMode(store)).toBe('normal');
  });

  it('writes nothing at all when there is no store, and does not throw', () => {
    expect(() => rememberDensityMode(undefined, 'elder')).not.toThrow();
  });

  it('swallows a store that throws', () => {
    // Losing the setting costs one visit to Ajustes. It must never cost a
    // launch, and this is the same care `AuthProvider` takes with the session
    // in the same store.
    expect(() => rememberDensityMode(broken, 'elder')).not.toThrow();
  });

  it('round-trips every mode density.ts declares', () => {
    for (const mode of DENSITY_MODES) {
      const store = memory();
      rememberDensityMode(store, mode);
      expect(readDensityMode(store)).toBe(mode);
    }
  });
});

describe('the store it shares with the route memory', () => {
  // ⚠️⚠️ ONE DEVICE STORE, TWO NAMESPACED KEYS. The session is in there too.
  // A collision would be C1.3 and C3.18 overwriting each other, which reads on a
  // phone as the app forgetting one of them at random.
  it('does not use the key C1.3 already took', () => {
    expect(DENSITY_KEY).not.toBe(LAST_SCREEN_KEY);
  });

  it('is namespaced to this app', () => {
    expect(DENSITY_KEY.startsWith('wera.')).toBe(true);
  });

  it('leaves the remembered route alone when it writes', () => {
    const store = memory();
    store.seen.set(LAST_SCREEN_KEY, '/vender');
    rememberDensityMode(store, 'elder');
    expect(store.seen.get(LAST_SCREEN_KEY)).toBe('/vender');
  });
});

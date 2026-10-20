// ============================================================================
// THE ONE RULE FOR A READ THAT NEEDS THE SERVER, WITH NO SIGNAL — `@/offline/senal`,
// plan task `8g` (the offline report's round 3, ruled 2026-10-20).
// ============================================================================

import { describe, expect, it } from 'vitest';

import { waitsForSignal } from '@/offline/senal';
import { ES } from '@/strings';

describe('when a card says *Se ve cuando haya señal*', () => {
  it('says it offline when there is nothing to draw', () => {
    expect(waitsForSignal(false, false)).toBe(true);
  });

  it('draws the last good copy instead, whatever the signal', () => {
    expect(waitsForSignal(false, true)).toBe(false);
  });

  it('never says it online — a read in flight is a spinner, a failure is its own message', () => {
    expect(waitsForSignal(true, false)).toBe(false);
  });

  it('never says it before anything has read the network', () => {
    // ⚠️ `null` IS UNKNOWN, NOT OFFLINE: a launch must not accuse the shop's wifi.
    expect(waitsForSignal(null, false)).toBe(false);
  });

  it('is the sentence the owner was shown, and promises nothing she has to do', () => {
    expect(ES.offline.whenSignal).toBe('Se ve cuando haya señal');
    expect(ES.offline.collectNeedsSignal).toBe('Para pedir que pasemos necesitas internet');
  });
});

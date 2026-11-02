import { afterEach, describe, expect, it, vi } from 'vitest';

import { LIMITE_MS } from '@/lib/buscar';

// ============================================================================
// ONE QUESTION TO THE PHONE'S OWN GEOCODER. Plan task `10.4d`.
//
// `@/lib/telefono` reads the native module once, as it loads
// (`requireOptionalNativeModule`), so each case loads it afresh with the module
// it needs standing in for the phone's: the one that answers, the one that
// refuses, the one that never answers — and a build without it, which is every
// build made before this row. What the phone's answers SAY is
// `test/buscar.test.ts`'s; here, only what reaches it and what comes back.
// ============================================================================

const fake = vi.hoisted(() => ({ modulo: null as null | { buscar: ReturnType<typeof vi.fn> } }));
vi.mock('expo', () => ({ requireOptionalNativeModule: (name: string) => (name === 'Geocodificador' ? fake.modulo : null) }));

const PUERTA = { latitude: 19.41531, longitude: -99.16541, calle: 'Calle Durango', numero: '220', colonia: 'Roma Norte', ciudad: 'Ciudad de México', cp: '06700' };

async function conModulo(buscar: ReturnType<typeof vi.fn> | null) {
  fake.modulo = buscar === null ? null : { buscar };
  vi.resetModules();
  return import('@/lib/telefono');
}

afterEach(() => {
  vi.useRealTimers();
  fake.modulo = null;
});

describe('one question to the phone', () => {
  it('asks the module what she typed, inside the Valle de México, for five answers — and reads them', async () => {
    const buscar = vi.fn(() => Promise.resolve([PUERTA]));
    const { preguntarAlTelefono } = await conModulo(buscar);
    const result = await preguntarAlTelefono('Durango 220, Roma Norte, Cuauhtémoc, 06700');
    expect(buscar).toHaveBeenCalledExactlyOnceWith('Durango 220, Roma Norte, Cuauhtémoc, 06700', [19.05, -99.4, 19.75, -98.85], 5);
    expect(result).toMatchObject({ kind: 'respuestas', respuestas: [{ titulo: 'Calle Durango 220', conNumero: true }] });
  });

  it('nothing found is nothing found', async () => {
    const { preguntarAlTelefono } = await conModulo(vi.fn(() => Promise.resolve([])));
    await expect(preguntarAlTelefono('Durango 220')).resolves.toEqual({ kind: 'ninguna' });
  });

  it('a refusal — no signal, no geocoder on the phone, anything — is a failure, never thrown', async () => {
    const { preguntarAlTelefono } = await conModulo(vi.fn(() => Promise.reject(new Error('ERR_GEOCODIFICADOR'))));
    await expect(preguntarAlTelefono('Durango 220')).resolves.toEqual({ kind: 'falla' });
  });

  it('no answer in eight seconds is a failure, and a late answer is ignored', async () => {
    vi.useFakeTimers();
    let answer: (rows: unknown) => void = () => {};
    const { preguntarAlTelefono } = await conModulo(vi.fn(() => new Promise((resolve) => (answer = resolve))));
    const pending = preguntarAlTelefono('Durango 220');
    await vi.advanceTimersByTimeAsync(LIMITE_MS - 1);
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ kind: 'falla' });
    answer([PUERTA]);
    await expect(pending).resolves.toEqual({ kind: 'falla' });
  });

  it('a build without the module asks nothing and says it failed — so LocationIQ is asked, as before this row', async () => {
    const { preguntarAlTelefono } = await conModulo(null);
    await expect(preguntarAlTelefono('Durango 220')).resolves.toEqual({ kind: 'falla' });
  });
});

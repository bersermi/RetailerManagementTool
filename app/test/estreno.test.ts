import { describe, expect, it } from 'vitest';

import { ESPERA_MAXIMA_MS, pasoDe, type Arranque } from '@/lib/estreno';

// ============================================================================
// A NEW PHONE'S FIRST OPEN TAKES THE NEWEST UPDATE — `@/lib/estreno`, plan task
// `5R-n` (the owner's question of 2026-11-17: *"Can't the user get the latest
// version out of the box?"*). Every answer `pasoDe` gives.
//
// ⚠️ WHAT THIS CANNOT SEE (`R9`): that the splash really waits, that the app
// reopens into the update, and what the moment between the two codes looks
// like. That is a build's own first open — the emulator's copy, and his phones
// in `5R-p` (it runs only from `5R-o`'s store builds on).
// ============================================================================

/** A store build's first open, nobody signed in, its check still running, a second in. */
const PRIMERA: Arranque = {
  activo: true,
  embebido: true,
  sesion: 'nadie',
  buscando: true,
  lista: false,
  ms: 1_000,
  recargando: false,
};

describe('the launches that never wait', () => {
  it('opens at once on a downloaded update — every launch but a build’s first code', () => {
    expect(pasoDe({ ...PRIMERA, embebido: false })).toBe('abrir');
    expect(pasoDe({ ...PRIMERA, embebido: false, lista: true })).toBe('abrir');
  });

  it('opens at once where expo-updates does not run — Metro, a web build', () => {
    expect(pasoDe({ ...PRIMERA, activo: false })).toBe('abrir');
  });

  it('never keeps a shop waiting: somebody signed in opens at once, an update waiting or not', () => {
    expect(pasoDe({ ...PRIMERA, sesion: 'alguien' })).toBe('abrir');
    expect(pasoDe({ ...PRIMERA, sesion: 'alguien', lista: true })).toBe('abrir');
  });
});

describe('a first open with nobody signed in', () => {
  it('waits while expo-updates’ own check runs', () => {
    expect(pasoDe(PRIMERA)).toBe('esperar');
  });

  it('reopens into an update the check downloaded', () => {
    expect(pasoDe({ ...PRIMERA, buscando: false, lista: true })).toBe('recargar');
  });

  it('opens on its own code when the check found nothing, or failed', () => {
    expect(pasoDe({ ...PRIMERA, buscando: false })).toBe('abrir');
  });

  it('waits no longer than the limit — no signal, a slow one — and opens on its own code', () => {
    expect(ESPERA_MAXIMA_MS).toBe(5_000);
    expect(pasoDe({ ...PRIMERA, ms: ESPERA_MAXIMA_MS - 1 })).toBe('esperar');
    expect(pasoDe({ ...PRIMERA, ms: ESPERA_MAXIMA_MS })).toBe('abrir');
  });

  it('still reopens into an update finished at the limit’s edge — the splash is still up', () => {
    expect(pasoDe({ ...PRIMERA, buscando: false, lista: true, ms: ESPERA_MAXIMA_MS + 100 })).toBe('recargar');
  });
});

describe('before the session is read', () => {
  it('decides nothing — never reopens a phone that may be signed in', () => {
    expect(pasoDe({ ...PRIMERA, sesion: 'sinLeer' })).toBe('esperar');
    expect(pasoDe({ ...PRIMERA, sesion: 'sinLeer', buscando: false, lista: true })).toBe('esperar');
  });

  it('but never past the limit', () => {
    expect(pasoDe({ ...PRIMERA, sesion: 'sinLeer', ms: ESPERA_MAXIMA_MS })).toBe('abrir');
  });
});

// ⚠️ MEASURED ON THE EMULATOR, 2026-11-17: as expo-updates restarts it resets its
// state to nothing checking, nothing pending — read again, that opened the app on
// the old code for a moment, and the welcome spent the once-per-phone opening there.
describe('once the reload is asked for', () => {
  const pedida: Arranque = { ...PRIMERA, buscando: false, lista: false, recargando: true };

  it('keeps waiting for it while expo-updates resets its state, never opening the old code', () => {
    expect(pasoDe(pedida)).toBe('recargar');
  });

  it('even past the limit — the reload’s own watchdog opens if it never comes', () => {
    expect(pasoDe({ ...pedida, ms: ESPERA_MAXIMA_MS * 2 })).toBe('recargar');
  });
});

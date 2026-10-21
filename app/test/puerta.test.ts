// `@/auth/puerta` — which door she came in by (`8g`, the owner's ruling of
// 2026-10-21: *"We will do the 2 door version"*), kept on the phone through the
// account step, so the screen after it is only her half.
import { describe, expect, it } from 'vitest';

import { PUERTA_KEY, puertaOf, readPuerta, writePuerta } from '@/auth/puerta';
import type { DeviceStore } from '@/lib/store';

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

describe('the door she chose', () => {
  it('is one of the two, and nothing else is a door', () => {
    expect(puertaOf('abrir')).toBe('abrir');
    expect(puertaOf('invitada')).toBe('invitada');
    for (const other of ['', 'entrar', 'Abrir', null, undefined, 3, ['abrir']]) {
      expect(puertaOf(other)).toBeNull();
    }
  });

  it('survives on the phone, and *Entrar* forgets it', () => {
    const store = memory();
    expect(readPuerta(store)).toBeNull();
    writePuerta(store, 'invitada');
    expect(store.held[PUERTA_KEY]).toBe('invitada');
    expect(readPuerta(store)).toBe('invitada');
    writePuerta(store, null);
    expect(readPuerta(store)).toBeNull();
    expect(PUERTA_KEY in store.held).toBe(false);
  });

  it('is never read from a phone with no store', () => {
    expect(readPuerta(undefined)).toBeNull();
    writePuerta(undefined, 'abrir');
  });
});

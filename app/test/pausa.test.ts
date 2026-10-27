// ============================================================================
// TE LO COMPRO IS PAUSED — `@/navigation/pausa`, plan task `10.0a`, the owner's
// ruling of 2026-10-27 (*"Yes to both"*: hide it, and lift Merma's address gate
// until *Ofrecer* exists). The value as shipped, and what each screen is told
// in BOTH states: paused, and open exactly as it was before — so resuming it is
// one line and changes nothing else.
//
// ⚠️ WHAT THIS CANNOT SEE (`R9`): that Merma, Inicio and the tutorial obey these
// answers. That is the owner's phone.
// ============================================================================

import { describe, expect, it } from 'vitest';

import { canWriteCatalog } from '@/api/catalogWrite';
import type { Role } from '@/api/members';
import {
  TE_LO_COMPRO,
  mermaConPuertas,
  mermaPideDireccion,
  recorridoPrometeTeLoCompro,
  veTeLoCompro,
} from '@/navigation/pausa';

/** Every answer a membership read can give, *not known yet* included. */
const EVERY_ROLE: readonly (Role | null)[] = ['owner', 'manager', 'staff', null];

describe('the version shipped', () => {
  it('has Te lo compro paused — resuming it is a ruling, not an edit', () => {
    expect(TE_LO_COMPRO).toBe('pausado');
  });
});

describe('while Te lo compro is paused', () => {
  it('opens Merma on Tirar for every role, a role not yet read included', () => {
    for (const role of EVERY_ROLE) expect(mermaConPuertas('pausado', role), String(role)).toBe(false);
  });

  it('asks nobody for the store’s address first, whether or not it has one', () => {
    expect(mermaPideDireccion('pausado', true)).toBe(false);
    expect(mermaPideDireccion('pausado', false)).toBe(false);
  });

  it('shows nobody the switch, the next pickup or Rescatado', () => {
    for (const role of EVERY_ROLE) expect(veTeLoCompro('pausado', role), String(role)).toBe(false);
  });

  it('never promises a pickup in the tutorial, whatever Wera knows about the zone', () => {
    expect(recorridoPrometeTeLoCompro('pausado', false)).toBe(false);
    expect(recorridoPrometeTeLoCompro('pausado', true)).toBe(false);
  });
});

describe('open, exactly as before `10.0a`', () => {
  it('draws the doors for an owner, an Encargado and a role not yet read, and sends a cashier to Tirar', () => {
    expect(mermaConPuertas('abierto', 'owner')).toBe(true);
    expect(mermaConPuertas('abierto', 'manager')).toBe(true);
    expect(mermaConPuertas('abierto', null)).toBe(true);
    expect(mermaConPuertas('abierto', 'staff')).toBe(false);
  });

  it('asks for a missing address before anything else, whatever her role (`8q`)', () => {
    expect(mermaPideDireccion('abierto', true)).toBe(true);
    expect(mermaPideDireccion('abierto', false)).toBe(false);
  });

  it('shows what Te lo compro did to whoever may write the catalog, and to nobody else', () => {
    for (const role of EVERY_ROLE) {
      expect(veTeLoCompro('abierto', role), String(role)).toBe(canWriteCatalog(role));
    }
    expect(veTeLoCompro('abierto', 'owner')).toBe(true);
    expect(veTeLoCompro('abierto', 'manager')).toBe(true);
    expect(veTeLoCompro('abierto', 'staff')).toBe(false);
    expect(veTeLoCompro('abierto', null)).toBe(false);
  });

  it('promises a pickup in the tutorial unless Wera already knows it cannot reach the store', () => {
    expect(recorridoPrometeTeLoCompro('abierto', false)).toBe(true);
    expect(recorridoPrometeTeLoCompro('abierto', true)).toBe(false);
  });
});

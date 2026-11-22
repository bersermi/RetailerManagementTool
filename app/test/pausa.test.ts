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
  PROXIMAMENTE,
  TE_LO_COMPRO,
  mermaConPuertas,
  mermaPideDireccion,
  mermaProximamente,
  recorridoPrometeTeLoCompro,
  veTeLoCompro,
} from '@/navigation/pausa';
import { ES } from '@/strings';

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

// ============================================================================
// MERMA'S *PRÓXIMAMENTE* — `5R-n`, the owner's ruling of 2026-11-17. Built
// switched off (the update to the 1.0 builds and the 1.1 build Apple reviewed
// must not show it); switched on by `5R-p` on 2026-11-22, once both stores had
// approved 1.1. Both states held here.
// ============================================================================

describe('Merma’s Próximamente, as shipped', () => {
  it('is on — `5R-p` switched it on once both stores approved 1.1', () => {
    expect(PROXIMAMENTE).toBe('encendido');
  });

  it('draws, as shipped, for an owner and an Encargado and for nobody else', () => {
    for (const role of EVERY_ROLE) {
      expect(mermaProximamente(PROXIMAMENTE, TE_LO_COMPRO, role), String(role)).toBe(canWriteCatalog(role));
    }
  });

  it('draws for nobody while off', () => {
    for (const role of EVERY_ROLE) expect(mermaProximamente('apagado', TE_LO_COMPRO, role), String(role)).toBe(false);
  });
});

describe('Merma’s Próximamente, switched on', () => {
  it('draws for an owner and an Encargado while Te lo compro is paused', () => {
    expect(mermaProximamente('encendido', 'pausado', 'owner')).toBe(true);
    expect(mermaProximamente('encendido', 'pausado', 'manager')).toBe(true);
  });

  it('never for an Empleado, nor a role not yet read — her Merma is her work', () => {
    expect(mermaProximamente('encendido', 'pausado', 'staff')).toBe(false);
    expect(mermaProximamente('encendido', 'pausado', null)).toBe(false);
  });

  it('never once Te lo compro is open again — then its door is the real thing', () => {
    for (const role of EVERY_ROLE) expect(mermaProximamente('encendido', 'abierto', role), String(role)).toBe(false);
  });

  it('names the two, Te lo compro in the word its door already uses', () => {
    expect(ES.waste.proximamente.title).toBe('Próximamente');
    expect(ES.waste.doors.compro).toBe('Te lo compro');
    expect(ES.waste.proximamente.ofrecer).toBe('Ofrecer a las cocinas');
  });
});

// `@/auth/llegada` — the line said once on arrival (`8g`, the owner's rulings
// of 2026-10-21). What a shopkeeper reads, and that she reads it once.
import { describe, expect, it } from 'vitest';

import { announceArrival, arrivalFor, takeArrival } from '@/auth/llegada';
import { ES } from '@/strings';

describe('the line on arrival', () => {
  it('tells the owner who has just opened her shop that it is ready', () => {
    expect(arrivalFor('owner', 'Abarrotes Ana')).toEqual({ word: 'Tu tienda está lista' });
    expect(arrivalFor('owner', null)).toEqual({ word: ES.arrival.opened });
  });

  it('tells the Empleado who has just joined which shop she is in', () => {
    expect(arrivalFor('staff', 'Abarrotes Ana')).toEqual({ word: 'Ya estás en Abarrotes Ana' });
    expect(arrivalFor('staff', '  Abarrotes Ana ')).toEqual({ word: 'Ya estás en Abarrotes Ana' });
  });

  it('says nothing to an Encargado, nor without a shop name or a role', () => {
    expect(arrivalFor('manager', 'Abarrotes Ana')).toBeNull();
    expect(arrivalFor('staff', null)).toBeNull();
    expect(arrivalFor('staff', '  ')).toBeNull();
    expect(arrivalFor(null, 'Abarrotes Ana')).toBeNull();
  });

  it('is taken once, then never again', () => {
    announceArrival(arrivalFor('staff', 'Abarrotes Ana'));
    expect(takeArrival()).toEqual({ word: 'Ya estás en Abarrotes Ana' });
    expect(takeArrival()).toBeNull();
    announceArrival(null);
    expect(takeArrival()).toBeNull();
  });
});

// `14.1`: the counter's number pad reads like the scale (the owner's answer A of
// 2026-11-27). These pin what a shopkeeper sees on the pad and the quantity the
// basket — and so the ledger — receives from it.
import { describe, expect, it } from 'vitest';

import { unitFactorsFrom, type UnitRow } from '@/api/catalog';
import { stepOf } from '@/cart/cart';
import {
  MAX_DIGITOS,
  TECLAS,
  baseDe,
  fichasDe,
  teclear,
  tecladoDe,
  textoDe,
  type Tecla,
  type Teclado,
} from '@/cart/bascula';
import { qtyShown } from '@/cart/quantity';

const UNITS: readonly UnitRow[] = [
  { code: 'g', dimension: 'mass', base_code: 'g', factor_to_base: '1.000000', display_order: 40 },
  { code: 'kg', dimension: 'mass', base_code: 'g', factor_to_base: '1000.000000', display_order: 10 },
  { code: '250g', dimension: 'mass', base_code: 'g', factor_to_base: '250.000000', display_order: 25 },
  { code: 'l', dimension: 'volume', base_code: 'ml', factor_to_base: '1000.000000', display_order: 10 },
  { code: 'ml', dimension: 'volume', base_code: 'ml', factor_to_base: '1.000000', display_order: 40 },
  { code: 'pza', dimension: 'count', base_code: 'pza', factor_to_base: '1.000000', display_order: 10 },
  { code: 'manojo', dimension: 'count', base_code: 'pza', factor_to_base: '1.000000', display_order: 15 },
];
const FACTORS = unitFactorsFrom(UNITS);

function keyed(keys: readonly Tecla[], teclado: Teclado): string {
  return keys.reduce((digitos, tecla) => teclear(digitos, tecla, teclado), '');
}

describe('the pad reads like the scale', () => {
  it('keys a kilo product from the right, three decimals always shown', () => {
    expect(textoDe(keyed(['7', '3', '0'], 'balanza'), 'balanza')).toBe('0.730');
    expect(textoDe(keyed(['1', '2', '5', '0'], 'balanza'), 'balanza')).toBe('1.250');
    expect(textoDe(keyed(['5'], 'balanza'), 'balanza')).toBe('0.005');
    expect(textoDe('', 'balanza')).toBe('0.000');
  });

  it('drops a leading zero, as the scale never shows one', () => {
    expect(keyed(['0', '7', '3', '0'], 'balanza')).toBe('730');
    expect(keyed(['0', '0'], 'cuenta')).toBe('');
  });

  it('counts pieces, bunches and grams whole', () => {
    expect(textoDe(keyed(['1', '5'], 'cuenta'), 'cuenta')).toBe('15');
    expect(textoDe('', 'cuenta')).toBe('0');
  });

  it('erases the last digit, and clears all of them', () => {
    expect(keyed(['7', '3', '0', 'borrar'], 'balanza')).toBe('73');
    expect(keyed(['7', '3', 'limpiar'], 'balanza')).toBe('');
    expect(keyed(['borrar'], 'cuenta')).toBe('');
  });

  it('refuses a digit past the scale rather than dropping the first', () => {
    const full = keyed(['9', '9', '9', '9', '9', '9'], 'balanza');
    expect(full).toHaveLength(MAX_DIGITOS.balanza);
    expect(teclear(full, '1', 'balanza')).toBe(full);
    expect(textoDe(full, 'balanza')).toBe('999.999');
  });

  it('reads decimals only where the scale shows them', () => {
    expect(tecladoDe('kg')).toBe('balanza');
    expect(tecladoDe('l')).toBe('balanza');
    for (const unit of ['g', 'ml', 'pza', 'manojo']) expect(tecladoDe(unit)).toBe('cuenta');
  });

  it('draws twelve keys, every digit once', () => {
    expect(TECLAS).toHaveLength(12);
    expect(TECLAS.filter((t) => /^\d$/.test(t)).sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });
});

describe('what the basket receives', () => {
  it('0.730 kg is 730 grams, at the cart scale', () => {
    expect(baseDe('730', 'kg', FACTORS)).toBe(730_000);
    expect(baseDe('1000', 'kg', FACTORS)).toBe(stepOf('kg', FACTORS));
  });

  it('a count is that many of the unit', () => {
    expect(baseDe('15', 'manojo', FACTORS)).toBe(15_000);
    expect(baseDe('250', 'g', FACTORS)).toBe(250_000);
  });

  it('nothing keyed, or a zero, is no quantity', () => {
    expect(baseDe('', 'kg', FACTORS)).toBeNull();
    expect(baseDe('0', 'pza', FACTORS)).toBeNull();
  });

  it('reads back as the box shows it', () => {
    expect(qtyShown(baseDe('730', 'kg', FACTORS)!, 'kg', FACTORS)).toBe('0.730');
    expect(qtyShown(baseDe('2000', 'kg', FACTORS)!, 'kg', FACTORS)).toBe('2');
  });
});

describe('the chips are best guesses', () => {
  it('a kilo product gets the quarters a counter says', () => {
    expect(fichasDe('kg').map((f) => f.etiqueta)).toEqual(['¼ kg', '½ kg', '¾ kg', '1 kg', '1½ kg', '2 kg']);
    expect(fichasDe('kg').map((f) => baseDe(f.digitos, 'kg', FACTORS))).toEqual([
      250_000, 500_000, 750_000, 1_000_000, 1_500_000, 2_000_000,
    ]);
  });

  it('a product shown in grams gets grams, named as a counter names them', () => {
    expect(fichasDe('g').map((f) => f.etiqueta)).toEqual(['100 gr', '¼ kg', '½ kg', '¾ kg', '1 kg']);
    expect(fichasDe('g').map((f) => baseDe(f.digitos, 'g', FACTORS))).toEqual([
      100_000, 250_000, 500_000, 750_000, 1_000_000,
    ]);
  });

  it('a counted product gets no chips: its keys are the count', () => {
    expect(fichasDe('manojo')).toEqual([]);
    expect(fichasDe('pza')).toEqual([]);
  });

  it('every chip is something the pad itself could have keyed', () => {
    for (const unit of ['kg', 'l', 'g', 'ml', 'pza', 'manojo']) {
      const teclado = tecladoDe(unit);
      for (const f of fichasDe(unit)) {
        expect(keyed([...f.digitos] as Tecla[], teclado)).toBe(f.digitos);
      }
    }
  });
});

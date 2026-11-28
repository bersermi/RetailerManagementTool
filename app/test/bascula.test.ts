// `14.1`: the counter's number pad reads like the scale (the owner's answer A of
// 2026-11-27). These pin what a shopkeeper sees on the pad and the quantity the
// basket — and so the ledger — receives from it. `14.3`: Comprar's pad keeps a
// decimal point (call 5), and takes the cost the ledger records.
import { describe, expect, it } from 'vitest';

import { unitFactorsFrom, type UnitRow } from '@/api/catalog';
import { stepOf } from '@/cart/cart';
import { costShown } from '@/api/providers';
import {
  DECIMALES_COSTO,
  MAX_DIGITOS,
  MAX_ENTEROS,
  TECLAS,
  TECLAS_PUNTO,
  baseDe,
  cantidadDe,
  costoDe,
  decimalesDe,
  escribir,
  fichasDe,
  fichasDeCompra,
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

function typed(keys: readonly Tecla[], decimales: number, enteros: number): string {
  return keys.reduce((texto, tecla) => escribir(texto, tecla, decimales, enteros), '');
}

describe('Comprar’s pad keeps a decimal point (14.3, call 5)', () => {
  const kilos = decimalesDe('kg');

  it('types left to right, as a delivery note is written: 2, 5 is 25 kg', () => {
    expect(typed(['2', '5'], kilos, MAX_ENTEROS.cantidad)).toBe('25');
    expect(cantidadDe('25', 'kg', FACTORS)).toBe(25 * stepOf('kg', FACTORS)!);
  });

  it('takes a point and up to three decimals on a kilo, and refuses the fourth', () => {
    expect(typed(['1', '2', 'punto', '5'], kilos, MAX_ENTEROS.cantidad)).toBe('12.5');
    expect(typed(['0', 'punto', '7', '3', '0', '1'], kilos, MAX_ENTEROS.cantidad)).toBe('0.730');
    expect(cantidadDe('0.730', 'kg', FACTORS)).toBe(730_000);
  });

  it('reads a point first as 0., and refuses a second point', () => {
    expect(typed(['punto', '5'], kilos, MAX_ENTEROS.cantidad)).toBe('0.5');
    expect(typed(['1', 'punto', 'punto', '2'], kilos, MAX_ENTEROS.cantidad)).toBe('1.2');
  });

  it('takes no point at all on a count: pieces, bunches and grams are whole', () => {
    for (const unit of ['pza', 'manojo', 'g', 'ml']) {
      expect(decimalesDe(unit)).toBe(0);
      expect(typed(['1', 'punto', '5'], decimalesDe(unit), MAX_ENTEROS.cantidad)).toBe('15');
    }
    expect(decimalesDe('l')).toBe(3);
  });

  it('drops a leading zero but keeps the one before a point', () => {
    expect(typed(['0', '7'], kilos, MAX_ENTEROS.cantidad)).toBe('7');
    expect(typed(['0', '0'], kilos, MAX_ENTEROS.cantidad)).toBe('0');
    expect(typed(['0', 'punto', '2'], kilos, MAX_ENTEROS.cantidad)).toBe('0.2');
  });

  it('refuses a whole digit past the box rather than dropping the first', () => {
    const full = typed(['9', '9', '9', '9', '9'], kilos, MAX_ENTEROS.cantidad);
    expect(escribir(full, '1', kilos, MAX_ENTEROS.cantidad)).toBe(full);
    expect(escribir(full, 'punto', kilos, MAX_ENTEROS.cantidad)).toBe('99999.');
  });

  it('erases the last key, a point included', () => {
    expect(typed(['1', 'punto', 'borrar', '5'], kilos, MAX_ENTEROS.cantidad)).toBe('15');
    expect(typed(['borrar'], kilos, MAX_ENTEROS.cantidad)).toBe('');
  });

  it('reads a point left at the end as the figure before it, and nothing or zero as no quantity', () => {
    expect(cantidadDe('12.', 'kg', FACTORS)).toBe(cantidadDe('12', 'kg', FACTORS));
    expect(cantidadDe('', 'kg', FACTORS)).toBeNull();
    expect(cantidadDe('0', 'pza', FACTORS)).toBeNull();
    expect(cantidadDe('0.', 'kg', FACTORS)).toBeNull();
  });

  it('draws the point where Vender’s pad clears, and every digit once', () => {
    expect(TECLAS_PUNTO).toHaveLength(12);
    expect(TECLAS_PUNTO[9]).toBe('punto');
    expect(TECLAS[9]).toBe('limpiar');
    expect(TECLAS_PUNTO.filter((t) => /^\d$/.test(t)).sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('leaves Vender’s scale alone if a point ever reached it', () => {
    expect(teclear('73', 'punto', 'balanza')).toBe('73');
  });
});

describe('the cost Comprar’s pad sends (14.3)', () => {
  it('is net per base at scale 6, per the product’s price unit — $16.10 a kilo is 1.61 centavos a gram', () => {
    expect(costoDe('16.10', 'kg', FACTORS)).toBe('0.016100');
    expect(costoDe('8', 'manojo', FACTORS)).toBe('8.000000');
  });

  it('takes two decimals and refuses a third', () => {
    expect(DECIMALES_COSTO).toBe(2);
    expect(typed(['1', '6', 'punto', '1', '0', '9'], DECIMALES_COSTO, MAX_ENTEROS.costo)).toBe('16.10');
  });

  it('reads back into the box as she keyed it — the round trip the card’s box kept', () => {
    for (const keyed of ['16.10', '8.50', '135', '0.75']) {
      const perBase = costoDe(keyed, 'kg', FACTORS);
      expect(perBase).not.toBeNull();
      expect(Number(costShown(perBase, 'kg', FACTORS))).toBe(Number(keyed));
    }
  });

  it('is nothing for an empty box or a unit this phone has not read; a zero is a cost', () => {
    expect(costoDe('', 'kg', FACTORS)).toBeNull();
    expect(costoDe('16', 'caja', FACTORS)).toBeNull();
    expect(costoDe('0', 'kg', FACTORS)).toBe('0.000000');
    expect(costoDe('16.', 'kg', FACTORS)).toBe(costoDe('16', 'kg', FACTORS));
  });
});

describe('Comprar’s chips are what arrives (14.3)', () => {
  it('whole kilos as a delivery comes in, dozens of a count, none in grams', () => {
    expect(fichasDeCompra('kg').map((f) => f.etiqueta)).toEqual(['5 kg', '10 kg', '20 kg', '25 kg', '50 kg']);
    expect(fichasDeCompra('manojo').map((f) => f.digitos)).toEqual(['6', '12', '24', '36']);
    expect(fichasDeCompra('g')).toEqual([]);
  });

  it('every chip is something the pad itself could have keyed', () => {
    for (const unit of ['kg', 'l', 'pza', 'manojo']) {
      for (const f of fichasDeCompra(unit)) {
        expect(typed([...f.digitos] as Tecla[], decimalesDe(unit), MAX_ENTEROS.cantidad)).toBe(f.digitos);
        expect(cantidadDe(f.digitos, unit, FACTORS)).not.toBeNull();
      }
    }
  });
});

// `14.5`: how a product arrives (the owner's call 10 of 2026-11-27) — the pack a
// row carries, what Comprar's pad turns *2 cajas de 13 kg a $209.30* into, and what
// the phone keeps of how she keyed it. These pin the line `record_purchase` stores
// and the figures a shopkeeper reads before she slides.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lineAnchorCentavos, parseDecimal } from '@tienda/money';
import { describe, expect, it } from 'vitest';

import { PACK_WORDS, packOf, type CatalogEntry, type UnitFactors } from '@/api/catalog';
import { packPatch } from '@/api/catalogEdit';
import {
  baseDeLlegada,
  contenidoBase,
  costoAlCambiar,
  costoDePaquete,
  costoPorBase,
  entran,
  guardarLlegadas,
  leerLlegadas,
  lineaDe,
  modoInicial,
  notaDeTrae,
  palabraDe,
  paqueteDe,
  paquetesDe,
  recordar,
  traeDe,
  traeInicial,
  type Llegada,
} from '@/cart/paquete';
import { ES } from '@/strings';

const FACTORS: UnitFactors = {
  kg: '1000.000000',
  g: '1.000000',
  '250g': '250.000000',
  pza: '1.000000',
  manojo: '1.000000',
};

const CAJA = { word: 'caja', holds: '13.000' } as const;

function entry(over: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    prebuilt: true,
    picture: null,
    pack: CAJA,
    id: 'v-jitomate',
    name: 'Jitomate saladet',
    familyId: 'verduras',
    familyName: 'Verduras',
    priceUnit: 'kg',
    baseUnit: 'g',
    centavos: 2600,
    perBase: '0.026000',
    priceScope: null,
    price: '$26.00 por kg',
    initials: 'JS',
    term: 'jitomate saladet verduras',
    ...over,
  };
}

/** What `record_purchase` stores for the line: `round(cost per base × qty base, 2)`. */
const lineCentavos = (perBase: string, base: number) => lineAnchorCentavos(parseDecimal(perBase, 6), base);

describe('the pack a row carries (`0101`)', () => {
  it('reads the word and the size as text', () => {
    expect(packOf({ pack_word: 'caja', pack_size: '13.000' })).toEqual({ word: 'caja', holds: '13.000' });
    expect(packOf({ pack_word: 'manojo_grande', pack_size: '40.000' })).toEqual({ word: 'manojo_grande', holds: '40.000' });
  });

  it('is loose with no word, with a word this build does not know, or with nothing held', () => {
    expect(packOf({ pack_word: null, pack_size: '1.000' })).toBeNull();
    expect(packOf({ pack_word: null, pack_size: '60.000' })).toBeNull(); // the hosted chayote of 2026-10
    expect(packOf({ pack_word: 'huacal', pack_size: '20.000' })).toBeNull();
    expect(packOf({ pack_word: 'caja', pack_size: '0.000' })).toBeNull();
    expect(packOf({})).toBeNull(); // a row persisted before `14.5`
  });

  it('knows the database’s eight words, read out of `0101`', () => {
    const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/0101_how_a_product_arrives.sql'), 'utf8');
    const listed = /product_variant_pack_word_known check \(\s*pack_word is null\s*or pack_word in \(([^)]*)\)/.exec(sql);
    expect(listed).not.toBeNull();
    const codes = (listed?.[1] ?? '').split(',').map((c) => c.trim().replace(/'/g, ''));
    expect([...codes].sort()).toEqual([...PACK_WORDS].sort());
  });

  it('says each word one and many', () => {
    for (const word of PACK_WORDS) {
      expect(ES.packs[word].one.length).toBeGreaterThan(0);
      expect(ES.packs[word].many).not.toBe(ES.packs[word].one);
    }
    expect(palabraDe('caja', 1)).toBe('caja');
    expect(palabraDe('caja', 2)).toBe('cajas');
    expect(palabraDe('caja', 0)).toBe('cajas');
    expect(palabraDe('costal', 3)).toBe('costales');
    expect(palabraDe('manojo_grande', 2)).toBe('manojos grandes');
  });
});

describe('where the pad offers a pack', () => {
  it('on a product counted in the unit it is sold in', () => {
    expect(paqueteDe(entry())).toEqual(CAJA);
    expect(paqueteDe(entry({ priceUnit: 'pza', baseUnit: 'pza', pack: { word: 'docena', holds: '12.000' } }))).not.toBeNull();
  });

  it('never on a loose product, nor on one priced per 250 g — keyed in grams, a caja of 13 means nothing', () => {
    expect(paqueteDe(entry({ pack: null }))).toBeNull();
    expect(paqueteDe(entry({ priceUnit: '250g' }))).toBeNull();
  });

  it('reads what one holds as she says it', () => {
    expect(traeDe(CAJA)).toBe('13');
    expect(traeDe({ word: 'caja', holds: '21.500' })).toBe('21.5');
    expect(traeDe({ word: 'caja', holds: '0.250' })).toBe('0.25');
    expect(traeDe({ word: 'docena', holds: '12.000' })).toBe('12');
  });
});

describe('what arrived: the packs times what each held', () => {
  it('counts whole packs only, up to 999', () => {
    expect(paquetesDe('2')).toBe(2);
    expect(paquetesDe('999')).toBe(999);
    for (const no of ['', '0', '2.5', '1000', 'x']) expect(paquetesDe(no)).toBeNull();
  });

  it('two cajas of 13 kg are 26 kg — 26,000 g, at scale 3', () => {
    expect(baseDeLlegada('2', '13', 'kg', FACTORS)).toBe(26_000_000);
    expect(baseDeLlegada('2', '13.5', 'kg', FACTORS)).toBe(27_000_000);
    expect(baseDeLlegada('3', '13.', 'kg', FACTORS)).toBe(39_000_000); // a point left at the end
  });

  it('two docenas of lechugas are 24 pieces', () => {
    expect(baseDeLlegada('2', '12', 'pza', FACTORS)).toBe(24_000);
  });

  it('is nothing until both are figures', () => {
    expect(baseDeLlegada('', '13', 'kg', FACTORS)).toBeNull();
    expect(baseDeLlegada('2', '', 'kg', FACTORS)).toBeNull();
    expect(baseDeLlegada('2', '0', 'kg', FACTORS)).toBeNull();
    expect(contenidoBase('13', 'kg', {})).toBeNull(); // a unit this phone has not read
  });
});

describe('what it cost: a caja’s cost per gram, as `record_purchase` takes it', () => {
  it('$209.30 a caja of 13 kg is $16.10 a kilo, exactly — and two cajas are $418.60', () => {
    const perBase = costoPorBase('209.30', '13', 'kg', FACTORS);
    expect(perBase).toBe('0.016100');
    expect(lineCentavos(perBase as string, 26_000_000)).toBe(41_860);
  });

  it('⚠️ $200 a caja of 13 kg is the nearest six decimals — so two cajas are $400.01, the ledger’s own figure', () => {
    const perBase = costoPorBase('200', '13', 'kg', FACTORS);
    expect(perBase).toBe('0.015385');
    expect(lineCentavos(perBase as string, 26_000_000)).toBe(40_001);
  });

  it('stays within half a millionth of a peso per gram: never more than 1.3 centavos on 26 kg', () => {
    for (let pesos = 150; pesos <= 260; pesos += 1.37) {
      const typed = pesos.toFixed(2);
      const perBase = costoPorBase(typed, '13', 'kg', FACTORS) as string;
      const off = Math.abs(lineCentavos(perBase, 26_000_000) - 2 * Math.round(Number(typed) * 100));
      expect(off).toBeLessThanOrEqual(1.3);
    }
  });

  it('a docena at $180 is $15 a piece; a zero is a cost; an empty box is none', () => {
    expect(costoPorBase('180', '12', 'pza', FACTORS)).toBe('15.000000');
    expect(costoPorBase('0', '13', 'kg', FACTORS)).toBe('0.000000');
    expect(costoPorBase('', '13', 'kg', FACTORS)).toBeNull();
    expect(costoPorBase('209.30', '', 'kg', FACTORS)).toBeNull();
  });

  it('fills a caja’s box from the last cost per gram — $16.10 a kilo is $209.30 a caja of 13', () => {
    expect(costoDePaquete('0.016100', '13', 'kg', FACTORS)).toBe('209.30');
    expect(costoDePaquete('0.015385', '13', 'kg', FACTORS)).toBe('200.01');
    expect(costoDePaquete('0.016100', '', 'kg', FACTORS)).toBeNull();
  });

  it('converts a cost she typed when she switches caja and kilos, to the centavo', () => {
    expect(costoAlCambiar('209.30', 'suelto', '13')).toBe('16.10');
    expect(costoAlCambiar('16.10', 'paquete', '13')).toBe('209.30');
    expect(costoAlCambiar('180', 'suelto', '12')).toBe('15.00');
    expect(costoAlCambiar('', 'suelto', '13')).toBe('');
    expect(costoAlCambiar('209.30', 'suelto', '')).toBe('209.30');
  });

  it('says what enters the shop: 26 kg at $16.10 a kilo', () => {
    expect(entran(26_000_000, '0.016100', entry(), FACTORS)).toEqual({ cantidad: '26', centavos: 1610 });
    expect(entran(null, '0.016100', entry(), FACTORS)).toBeNull();
    expect(entran(26_000_000, null, entry(), FACTORS)).toBeNull();
  });
});

describe('what the phone keeps (call 10: the last she typed shows next time)', () => {
  const enCajas: Llegada = {
    modo: 'paquete',
    trae: '12.5',
    linea: { cuantos: '2', costo: '200', base: 25_000_000, perBase: '0.016000' },
  };

  it('opens on the pack, or on the mode she used last', () => {
    expect(modoInicial(entry(), undefined)).toBe('paquete');
    expect(modoInicial(entry(), { modo: 'suelto', trae: '13', linea: null })).toBe('suelto');
    expect(modoInicial(entry({ pack: null }), enCajas)).toBe('suelto');
  });

  it('holds what her last caja held, else the product’s own pack', () => {
    expect(traeInicial(entry(), enCajas)).toBe('12.5');
    expect(traeInicial(entry(), undefined)).toBe('13');
    expect(traeInicial(entry(), { modo: 'paquete', trae: '', linea: null })).toBe('13');
    expect(traeInicial(entry({ pack: null }), enCajas)).toBe('');
  });

  it('says where the content came from — never a doubt on a docena', () => {
    expect(notaDeTrae(CAJA, undefined, '13')).toBe('aproximado');
    expect(notaDeTrae(CAJA, enCajas, '12.5')).toBe('ultima');
    expect(notaDeTrae(CAJA, enCajas, '14')).toBeNull(); // she is typing another
    expect(notaDeTrae({ word: 'docena', holds: '12.000' }, undefined, '12')).toBeNull();
    expect(notaDeTrae(null, enCajas, '12.5')).toBeNull();
  });

  it('reopens a line in cajas only while the basket holds exactly what that pad sent', () => {
    expect(lineaDe(enCajas, 25_000_000, '0.016000')).toEqual(enCajas.linea);
    expect(lineaDe(enCajas, 26_000_000, '0.016000')).toBeNull(); // a kilo added another way
    expect(lineaDe(enCajas, 25_000_000, '0.017000')).toBeNull(); // the cost changed
    expect(lineaDe(enCajas, 25_000_000, undefined)).toBeNull(); // the provider changed: no cost
    expect(lineaDe(enCajas, 0, '0.016000')).toBeNull();
    expect(lineaDe(undefined, 25_000_000, '0.016000')).toBeNull();
  });

  it('keeps the content she typed after a delivery in cajas, and keeps it through one in kilos', () => {
    const one = recordar({}, 'v', 'paquete', '13.', enCajas.linea);
    expect(one.v).toEqual({ modo: 'paquete', trae: '13', linea: enCajas.linea });
    const two = recordar(one, 'v', 'suelto', '', null);
    expect(two.v).toEqual({ modo: 'suelto', trae: '13', linea: null });
    expect(recordar({}, 'v', 'paquete', '13.50', null).v?.trae).toBe('13.5');
  });

  it('reads back what it wrote, and nothing of what it did not', () => {
    const kept = { v: enCajas, w: { modo: 'suelto', trae: '', linea: null } as Llegada };
    expect(leerLlegadas(guardarLlegadas(kept))).toEqual(kept);
    expect(leerLlegadas(null)).toEqual({});
    expect(leerLlegadas('not json')).toEqual({});
    expect(leerLlegadas('[1,2]')).toEqual({});
    expect(leerLlegadas('{"v":{"modo":"caja","trae":"13"},"w":{"modo":"suelto","trae":"13"}}')).toEqual({
      w: { modo: 'suelto', trae: '13', linea: null },
    });
  });
});

describe('the pack set on the product’s page (`PackPatch`)', () => {
  it('sends a word with what one holds, or loose at 1', () => {
    expect(packPatch('caja', '13')).toEqual({ pack_word: 'caja', pack_size: '13' });
    expect(packPatch('arpilla', '30.5')).toEqual({ pack_word: 'arpilla', pack_size: '30.5' });
    expect(packPatch(null, '')).toEqual({ pack_word: null, pack_size: '1' });
  });

  it('refuses nothing held, more than three decimals and more than five whole digits', () => {
    for (const no of ['', '0', '0.000', '1.2345', '123456', 'x']) expect(packPatch('caja', no)).toBeNull();
  });
});

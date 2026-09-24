import { describe, expect, it } from 'vitest';

import {
  CATALOG_KEY,
  CATALOG_ORDER_COLUMN,
  CATALOG_SELECT,
  FAMILY_COLUMNS,
  PRICE_COLUMNS,
  PRICE_STARTS_COLUMN,
  PRICE_TABLE,
  UNITS_KEY,
  UNIT_COLUMNS,
  VARIANT_COLUMNS,
  catalogFrom,
  catalogLine,
  emptyLineKey,
  familyLine,
  familyLineKey,
  familyTitle,
  familyView,
  initials,
  isoDay,
  matches,
  priceCentavos,
  priceEndsAfter,
  priceFor,
  priceLabel,
  search,
  searchKey,
  searchTerm,
  unitFactorsFrom,
  type PriceRow,
  type UnitRow,
  type VariantRow,
} from '@/api/catalog';
import { ES } from '@/strings';

// ============================================================================
// THE SHOP'S OWN PRODUCTS. Plan task 5d-i.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR AND WHAT IT CANNOT DO, STATED TOGETHER — the
// sentence `api-workspace.test.ts` and `api-members.test.ts` both open with,
// and it is truer here than on either of them. Every assertion below pins a
// STRING this app sends to PostgREST or a DECISION about what a row shows. It
// can prove the app is consistent with itself.
//
// IT CANNOT PROVE THE DATABASE AGREES. Nothing in TypeScript has read `0001` or
// `0002`: rename `price_unit_code` here and every line below still passes while
// the real read comes back `400 — column product_variant.price_unit_code does
// not exist` on a phone in a shop. THAT is
// `docs/checks/5d-i-catalog-contract.sh`, which posts these exact column lists
// to a reset database over HTTP, with a real family, real variants, an expired
// price and a location-scoped one, and reads what comes back.
//
// ⚠️ AND IT CANNOT SEE A SCREEN, because there is no screen: this task ships
// none. `5d-ii` draws the list from `catalogFrom`'s output and `5d-iii` opens a
// family from it, and the instrument for both is the owner's phone (`R9`).
// ============================================================================

const FAMILY = '11111111-1111-4111-8111-111111111111';
const STORE = '22222222-2222-4222-8222-222222222222';
const OTHER_STORE = '33333333-3333-4333-8333-333333333333';

/** The ten rows `0001` seeds, as PostgREST sends them with `::text`. */
const UNITS: readonly UnitRow[] = [
  { code: 'g', dimension: 'mass', factor_to_base: '1.000000', display_order: 40 },
  { code: 'kg', dimension: 'mass', factor_to_base: '1000.000000', display_order: 10 },
  { code: '500g', dimension: 'mass', factor_to_base: '500.000000', display_order: 20 },
  { code: '250g', dimension: 'mass', factor_to_base: '250.000000', display_order: 25 },
  { code: '100g', dimension: 'mass', factor_to_base: '100.000000', display_order: 30 },
  { code: 'pza', dimension: 'count', factor_to_base: '1.000000', display_order: 10 },
];

const FACTORS = unitFactorsFrom(UNITS);

function price(price_per_base: string, location_id: string | null = null): PriceRow {
  return { price_per_base, location_id };
}

function variant(
  id: string,
  name: string,
  price_unit_code: string,
  prices: readonly PriceRow[],
  is_active = true,
  familyName = 'Pollo',
  base_unit_code = 'g',
): VariantRow {
  return {
    id,
    name,
    family_id: FAMILY,
    price_unit_code,
    base_unit_code,
    is_active,
    product_family: { id: FAMILY, name: familyName },
    price_list: prices,
  };
}

describe('the contract — every string this app sends to PostgREST', () => {
  it('names its columns and never asks for everything', () => {
    for (const list of [VARIANT_COLUMNS, FAMILY_COLUMNS, PRICE_COLUMNS, UNIT_COLUMNS]) {
      expect(list).not.toContain('*');
    }
  });

  it('keeps enforce_stock off the wire — C8.8: no pilot screen may expose it', () => {
    expect(VARIANT_COLUMNS).not.toContain('enforce_stock');
  });

  // ⚠️ THE CAST IS THE WHOLE MONEY ARGUMENT. A bare numeric arrives as a JSON
  // number, which is a double, and `parseDecimal` refuses a number outright.
  it('asks for both numerics as text', () => {
    expect(PRICE_COLUMNS).toContain('price_per_base::text');
    expect(UNIT_COLUMNS).toContain('factor_to_base::text');
  });

  it('embeds the family and the prices in one select, neither of them inner', () => {
    expect(CATALOG_SELECT).toContain(`product_family(${FAMILY_COLUMNS})`);
    expect(CATALOG_SELECT).toContain(`${PRICE_TABLE}(${PRICE_COLUMNS})`);
    expect(CATALOG_SELECT).not.toContain('!inner');
  });

  it('orders by name in the database, not on the phone', () => {
    expect(CATALOG_ORDER_COLUMN).toBe('name');
  });

  it('caches the two reads under different keys', () => {
    expect(CATALOG_KEY).not.toEqual(UNITS_KEY);
  });

  // ⚠️ THE WINDOW IS THE QUERY'S ONLY HOME, so these two strings are the whole
  // of *"which price is today's"* on this side of the wire.
  it('asks for a row that has started and has not ended', () => {
    expect(PRICE_STARTS_COLUMN).toBe('effective_from');
    expect(priceEndsAfter('2026-09-22')).toBe(
      'effective_to.is.null,effective_to.gt.2026-09-22',
    );
  });
});

describe('isoDay — the shop’s day, never UTC', () => {
  it('spells a date the way Postgres does', () => {
    expect(isoDay(new Date(2026, 8, 22, 23, 30))).toBe('2026-09-22');
  });

  it('pads a single-digit month and day', () => {
    expect(isoDay(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });

  // ⚠️ THE ONE THAT WOULD HAVE BEEN WRONG WITH `toISOString()`. Late evening in
  // Mexico is already tomorrow in UTC, and a price change a day early is a
  // price on the shelf the till does not charge.
  it('does not roll over on a late evening', () => {
    const evening = new Date(2026, 8, 22, 19, 0);
    expect(isoDay(evening)).toBe('2026-09-22');
  });
});

describe('priceFor — which of a shop’s prices is this store’s', () => {
  it('has nothing to say when the shop has not priced it', () => {
    expect(priceFor([], STORE)).toBeNull();
    expect(priceFor(null, STORE)).toBeNull();
    expect(priceFor(undefined, null)).toBeNull();
  });

  it('takes the shop-wide price when there is only one', () => {
    expect(priceFor([price('0.035000')], STORE)?.price_per_base).toBe('0.035000');
  });

  // ⚠️ THE ONE THAT MATTERS: reading the default while a store price exists is
  // a number on screen the till would not charge.
  it('prefers this store’s own price over the shop-wide one', () => {
    const rows = [price('0.035000'), price('0.041000', STORE)];
    expect(priceFor(rows, STORE)?.price_per_base).toBe('0.041000');
  });

  it('ignores another store’s price entirely', () => {
    const rows = [price('0.035000'), price('0.041000', OTHER_STORE)];
    expect(priceFor(rows, STORE)?.price_per_base).toBe('0.035000');
  });

  it('falls back to the shop-wide price when this phone knows no store', () => {
    const rows = [price('0.035000'), price('0.041000', STORE)];
    expect(priceFor(rows, null)?.price_per_base).toBe('0.035000');
  });

  // ⚠️ A store-only price with no shop-wide row is `null` for anybody standing
  // somewhere else, and that is C3.12's dash rather than a borrowed number.
  it('is null when only another store has a price', () => {
    expect(priceFor([price('0.041000', OTHER_STORE)], STORE)).toBeNull();
  });
});

describe('priceCentavos — the ledger’s arithmetic, on a quantity of one', () => {
  // ⚠️ C3.10's three examples, reproduced from the numbers a shop would store.
  it('prices a kilo', () => {
    expect(priceCentavos('0.035000', '1000.000000')).toBe(3500);
  });

  it('prices a quarter kilo', () => {
    expect(priceCentavos('0.036000', '250.000000')).toBe(900);
  });

  it('prices a piece', () => {
    expect(priceCentavos('2.000000', '1.000000')).toBe(200);
  });

  it('prices a gram, where the price unit IS the base unit', () => {
    expect(priceCentavos('0.035000', '1.000000')).toBe(4);
  });

  // ⚠️ HALF-UP AWAY FROM ZERO, which is Postgres's rule and not `Math.round`'s.
  // 0.0355 per gram over 100 g is 3.55 pesos: 355 centavos exactly.
  it('rounds the way the database rounds', () => {
    expect(priceCentavos('0.035500', '100.000000')).toBe(355);
    expect(priceCentavos('0.000125', '100.000000')).toBe(1);
  });

  it('is zero for a price of zero, which is a price and not an absence', () => {
    expect(priceCentavos('0.000000', '1000.000000')).toBe(0);
  });

  // ⚠️ EVERY THROW THE MONEY PATH RAISES BECOMES NULL rather than a crash.
  it('refuses what it cannot be exact about', () => {
    expect(priceCentavos('3.5e-2', '1000.000000')).toBeNull();
    expect(priceCentavos('0.0350001', '1000.000000')).toBeNull();
    expect(priceCentavos('', '1000.000000')).toBeNull();
    expect(priceCentavos('0.035000', 'kilo')).toBeNull();
  });
});

describe('priceLabel — C3.10 and C3.12, which are different facts', () => {
  // ⚠️⚠️ C3.10 WRITES ITS EXAMPLES AS `$35.00 / kg` AND C12.2 SAYS CENTAVOS
  // ARE HIDDEN WHEN ZERO. Both are the owner's, from the same interview, and
  // they disagree about the two digits — so the later, narrower rule wins:
  // C12.2 is about how a NUMBER is written and has a formatter and twenty-six
  // assertions behind it, while C3.10 is about the UNIT never being absent and
  // its examples are illustrative. `$35 / kg` keeps both promises.
  it('never shows a price without its unit', () => {
    expect(priceLabel(3500, 'kg')).toBe('$35 / kg');
    expect(priceLabel(900, '250g')).toBe('$9 / 250 gr');
    expect(priceLabel(200, 'pza')).toBe('$2 / pza');
  });

  it('shows the centavos when there are any — C12.2, exactly two', () => {
    expect(priceLabel(3550, 'kg')).toBe('$35.50 / kg');
    expect(priceLabel(123456, 'kg')).toBe('$1,234.56 / kg');
  });

  // ⚠️ THE DATABASE'S SPELLING IS NOT THE SHOPKEEPER'S. `250g` is a code.
  it('renders the word and not the code', () => {
    expect(priceLabel(900, '250g')).toContain('250 gr');
    expect(priceLabel(900, '250g')).not.toContain('250g ');
  });

  it('falls back to the code for a unit no migration has taught us yet', () => {
    expect(priceLabel(100, 'barril')).toBe('$1 / barril');
  });

  // ⚠️⚠️ C3.12. These two must never render alike: a zero is a price the owner
  // set and sells at, a dash is a question nobody has answered.
  it('shows a dash for no price and a zero for a zero', () => {
    expect(priceLabel(null, 'kg')).toBe(ES.catalog.noPrice);
    expect(priceLabel(null, 'kg')).not.toContain('0');
    expect(priceLabel(0, 'kg')).toBe('$0 / kg');
  });
});

describe('initials — C8.14’s two letters', () => {
  it('takes one letter from each of the first two words', () => {
    expect(initials('Pollo entero')).toBe('PE');
    expect(initials('Pechuga sin hueso')).toBe('PS');
  });

  it('takes the first two letters of a single word', () => {
    expect(initials('Pechuga')).toBe('PE');
  });

  it('survives the spacing a person actually types', () => {
    expect(initials('  queso   oaxaca ')).toBe('QO');
  });

  it('keeps a Spanish letter a Spanish letter', () => {
    expect(initials('Ñoquis')).toBe('ÑO');
    expect(initials('ñame')).toBe('ÑA');
  });

  it('has nothing to say about nothing', () => {
    expect(initials('   ')).toBe('');
  });
});

describe('searchKey — the database’s own folding, copied', () => {
  // ⚠️ `normalize_name` is `lower(btrim(regexp_replace(name, '\\s+', ' ', 'g')))`.
  it('lowercases, trims and collapses whitespace', () => {
    expect(searchKey('  Pollo   Entero ')).toBe('pollo entero');
  });

  // ⚠️ AND IT DOES NOT FOLD ACCENTS, because `0002` deliberately does not:
  // "Platano and Plátano being distinct is acceptable, silently merging them is
  // not" — that is the uniqueness rule, and this is the same rule.
  it('leaves an accent where it is', () => {
    expect(searchKey('Plátano')).toBe('plátano');
  });
});

describe('searchTerm — the folding `0002` said belongs at search time', () => {
  it('folds every accented letter Spanish has', () => {
    expect(searchTerm('Plátano')).toBe('platano');
    expect(searchTerm('Jalapeño')).toBe('jalapeno');
    expect(searchTerm('ÁÉÍÓÚÜÑ')).toBe('aeiouun');
    expect(searchTerm('café')).toBe('cafe');
  });

  it('still does everything searchKey does', () => {
    expect(searchTerm('  CAFÉ  con   leche ')).toBe('cafe con leche');
  });

  it('leaves an unaccented name alone', () => {
    expect(searchTerm('Pechuga')).toBe('pechuga');
  });
});

describe('catalogFrom — one read, turned into rows a screen can draw', () => {
  const rows: readonly VariantRow[] = [
    variant('a', 'Pechuga', 'kg', [price('0.035000'), price('0.041000', STORE)]),
    variant('b', 'Pollo entero', '250g', [price('0.036000')]),
    variant('c', 'Sin precio', 'kg', []),
    variant('d', 'Descontinuado', 'kg', [price('0.050000')], false),
  ];

  it('drops a variant the shop has retired', () => {
    const entries = catalogFrom(rows, FACTORS, null);
    expect(entries.map((entry) => entry.name)).toEqual([
      'Pechuga',
      'Pollo entero',
      'Sin precio',
    ]);
  });

  it('keeps the database’s order and does not re-sort', () => {
    const backwards = [rows[1], rows[0]];
    expect(catalogFrom(backwards, FACTORS, null).map((entry) => entry.name)).toEqual([
      'Pollo entero',
      'Pechuga',
    ]);
  });

  it('prices each row in its own price unit', () => {
    const entries = catalogFrom(rows, FACTORS, null);
    expect(entries[0].price).toBe('$35 / kg');
    expect(entries[1].price).toBe('$9 / 250 gr');
  });

  it('uses this store’s price when it knows the store', () => {
    expect(catalogFrom(rows, FACTORS, STORE)[0].price).toBe('$41 / kg');
  });

  it('shows a dash where nobody has set a price', () => {
    const entry = catalogFrom(rows, FACTORS, null)[2];
    expect(entry.centavos).toBeNull();
    expect(entry.price).toBe(ES.catalog.noPrice);
  });

  // ⚠️ AN UNKNOWN UNIT IS A DASH, NEVER A GUESS OF 1. Reading a kilo as a gram
  // would divide a shelf price by a thousand and look entirely plausible.
  it('shows a dash rather than guessing at a unit it has no factor for', () => {
    const odd = [variant('e', 'Barril', 'barril', [price('0.035000')])];
    expect(catalogFrom(odd, FACTORS, null)[0].centavos).toBeNull();
  });

  it('carries the family, the initials and the price unit', () => {
    const entry = catalogFrom(rows, FACTORS, null)[0];
    expect(entry.familyName).toBe('Pollo');
    expect(entry.familyId).toBe(FAMILY);
    expect(entry.initials).toBe('PE');
    expect(entry.priceUnit).toBe('kg');
  });

  it('survives an embed that came back empty', () => {
    const orphan: VariantRow = { ...variant('f', 'Huérfano', 'kg', []), product_family: null };
    const entry = catalogFrom([orphan], FACTORS, null)[0];
    expect(entry.familyName).toBe('');
    expect(entry.term).toContain('huerfano');
  });

  it('has nothing to show before the read comes back', () => {
    expect(catalogFrom(undefined, FACTORS, null)).toEqual([]);
    expect(catalogFrom(null, FACTORS, null)).toEqual([]);
  });

  // ⚠️ THE UNITS ARRIVE ON THEIR OWN QUERY, so this is the state between the two
  // reads landing — every row a dash, which is why `useCatalog` counts the
  // units towards `loading`.
  it('prices nothing at all with no factors', () => {
    expect(catalogFrom(rows, {}, null).every((entry) => entry.centavos === null)).toBe(true);
  });
});

describe('search — what a shopkeeper types finds', () => {
  const entries = catalogFrom(
    [
      variant('a', 'Pechuga', 'kg', [price('0.035000')]),
      variant('b', 'Plátano macho', 'kg', [price('0.020000')], true, 'Frutas'),
      variant('c', 'Jalapeño', 'kg', [price('0.030000')], true, 'Verduras'),
    ],
    FACTORS,
    null,
  );

  it('shows everything when the box is empty', () => {
    expect(search(entries, '')).toHaveLength(3);
    expect(search(entries, '   ')).toHaveLength(3);
  });

  it('finds a name typed without its accent', () => {
    expect(search(entries, 'platano').map((entry) => entry.name)).toEqual(['Plátano macho']);
    expect(search(entries, 'jalapeno').map((entry) => entry.name)).toEqual(['Jalapeño']);
  });

  it('finds a name typed WITH its accent', () => {
    expect(search(entries, 'Plátano')).toHaveLength(1);
  });

  // ⚠️ THE FAMILY COUNTS, because it is the word a shopkeeper thinks in and the
  // row already shows it under the name.
  it('finds a product by its family', () => {
    expect(search(entries, 'frutas').map((entry) => entry.name)).toEqual(['Plátano macho']);
  });

  it('matches part of a word, anywhere in it', () => {
    expect(search(entries, 'chug').map((entry) => entry.name)).toEqual(['Pechuga']);
  });

  it('finds nothing when the shop does not sell it', () => {
    expect(search(entries, 'tornillos')).toHaveLength(0);
  });

  it('is the same decision as matches, one row at a time', () => {
    expect(matches(entries[0], 'pechuga')).toBe(true);
    expect(matches(entries[0], 'platano')).toBe(false);
  });
});

describe('unitFactorsFrom — the map 5c-iv-b refused to hard-code', () => {
  it('keys every factor by its code, as the text Postgres stored', () => {
    expect(FACTORS.kg).toBe('1000.000000');
    expect(FACTORS['250g']).toBe('250.000000');
    expect(FACTORS.pza).toBe('1.000000');
  });

  it('is empty before the read comes back, and says nothing false', () => {
    expect(unitFactorsFrom(undefined)).toEqual({});
    expect(unitFactorsFrom(null)).toEqual({});
  });

  // ⚠️ THE SHAPE `@/offline/deadLetters` TAKES AS AN ARGUMENT. `5f` is the row
  // that hands this over; nothing here reaches across that boundary to do it.
  it('is a plain record of decimal strings at scale 6', () => {
    for (const value of Object.values(FACTORS)) {
      expect(value).toMatch(/^\d+\.\d{6}$/);
    }
  });
});

describe('emptyLineKey — the three things an empty list means', () => {
  // ⚠️ THE READ HAS NOT LANDED. Saying "no products" for the second before the
  // rows arrive is a screen that lies on every cold open.
  it('says it is loading while the read is out, typed or not', () => {
    expect(emptyLineKey(true, '')).toBe('loading');
    expect(emptyLineKey(true, 'pechuga')).toBe('loading');
  });

  // ⚠️⚠️ THE TWO THAT MUST NOT COLLAPSE. A shopkeeper with a hundred products
  // who mistypes a name must not be told her catalog is empty — she is the
  // merchant C8.2 describes, and the sentence would be false.
  it('tells an empty catalog apart from an empty search', () => {
    expect(emptyLineKey(false, '')).toBe('empty');
    expect(emptyLineKey(false, 'tornillos')).toBe('noMatches');
  });

  // ⚠️ WHITESPACE IS NOT A SEARCH: `matches` treats a blank box as matching
  // everything, so a box holding three spaces is not "nothing found".
  it('treats a box of spaces as an empty box', () => {
    expect(emptyLineKey(false, '   ')).toBe('empty');
  });

  // ⚠️ IT RETURNS A KEY AND NEVER A SENTENCE — the shape `@/api/errors` uses,
  // and what keeps every Spanish word in one file (`R4`).
  it('returns a key ES.catalog actually has', () => {
    for (const typed of ['', 'x']) {
      for (const loading of [true, false]) {
        expect(ES.catalog[emptyLineKey(loading, typed)]).toBeTypeOf('string');
      }
    }
  });
});

// ============================================================================
// LA FAMILIA — plan task `5d-iii`, and the three decisions that screen makes
// that a machine can read. Everything else about it is rendering, which §2.11
// keeps out of scope and `R9` routes to the owner's phone.
// ============================================================================

describe('familyView — one family, out of the catalog already in hand', () => {
  const OTHER_FAMILY = '44444444-4444-4444-8444-444444444444';

  /** Two families in one catalog, which is what every real shop has. */
  const ENTRIES = catalogFrom(
    [
      variant('a', 'Queso Oaxaca 250 g', '250g', [price('0.120000')]),
      variant('b', 'Queso Oaxaca 500 g', '500g', [price('0.120000')]),
      { ...variant('c', 'Plátano macho', 'kg', [price('0.020000')]), family_id: OTHER_FAMILY,
        product_family: { id: OTHER_FAMILY, name: 'Frutas' } },
      variant('d', 'Queso Oaxaca 1 kg', 'kg', []),
    ],
    FACTORS,
    null,
  );

  it('collects the family the tapped row belongs to, and nothing else', () => {
    const view = familyView(ENTRIES, FAMILY, 'b');
    expect(view.variants.map((entry) => entry.id)).toEqual(['a', 'b', 'd']);
  });

  // ⚠️ THE ORDER IS THE DATABASE'S — `order=name` on the query — and a sort
  // here would be a second answer to which variant comes first, decided by
  // whatever collation Hermes has rather than by the one Postgres applied.
  it('keeps the order the rows arrived in', () => {
    const backwards = [...ENTRIES].reverse();
    expect(familyView(backwards, FAMILY, 'b').variants.map((entry) => entry.id)).toEqual([
      'd',
      'b',
      'a',
    ]);
  });

  it('marks the variant that was tapped', () => {
    expect(familyView(ENTRIES, FAMILY, 'b').selectedId).toBe('b');
  });

  // ⚠️⚠️ THE ONE THAT MUST NOT BECOME A FALLBACK. Área 13's ruling 4 is that
  // the preselected variant carries NO LEGEND, so the mark is the only thing
  // saying *this is the one you came from* — and marking the first row when the
  // id does not belong here would put that claim on a product she never
  // touched, with nothing on the screen to correct it.
  it('marks nothing when the id is not in this family', () => {
    expect(familyView(ENTRIES, FAMILY, 'c').selectedId).toBeNull();
    expect(familyView(ENTRIES, FAMILY, 'nope').selectedId).toBeNull();
  });

  it('marks nothing when the route lost the parameter', () => {
    expect(familyView(ENTRIES, FAMILY, undefined).selectedId).toBeNull();
    expect(familyView(ENTRIES, FAMILY, '').selectedId).toBeNull();
  });

  // ⚠️ AN EMPTY FAMILY ID IS AN EMPTY FAMILY, NEVER THE WHOLE CATALOG. A
  // missing route parameter must not match every variant whose family failed
  // to embed — that is a screen showing a shop's entire catalog under one
  // heading.
  it('shows nothing at all without a family', () => {
    expect(familyView(ENTRIES, '', 'a').variants).toHaveLength(0);
    expect(familyView(ENTRIES, null, 'a').variants).toHaveLength(0);
    expect(familyView(ENTRIES, undefined, 'a').variants).toHaveLength(0);
  });

  it('is empty while the catalog read is still out', () => {
    expect(familyView([], FAMILY, 'a').variants).toHaveLength(0);
    expect(familyView([], FAMILY, 'a').selectedId).toBeNull();
  });

  // ⚠️ `catalogFrom` ALREADY DROPS A DISCONTINUED VARIANT, and this screen
  // inherits that rather than deciding it again: the policy does not filter, so
  // the rule lives in one place.
  it('never lists a variant the shop stopped selling', () => {
    const withRetired = catalogFrom(
      [
        variant('a', 'Queso Oaxaca 250 g', '250g', [price('0.120000')]),
        variant('e', 'Queso Oaxaca 2 kg', 'kg', [price('0.120000')], false),
      ],
      FACTORS,
      null,
    );
    expect(familyView(withRetired, FAMILY, 'a').variants.map((entry) => entry.id)).toEqual(['a']);
  });

  it('names the banda after the family itself', () => {
    expect(familyView(ENTRIES, FAMILY, 'a').title).toBe('Pollo');
    expect(familyView(ENTRIES, OTHER_FAMILY, 'c').title).toBe('Frutas');
  });

  // ⚠️ THE EMBED CAN COME BACK EMPTY — `product_family` is an embedded resource,
  // and `catalogFrom` turns a missing one into `''`. On Productos that is one
  // absent line under a name; here it would be a screen with no heading at all.
  it('falls back to a word when no variant carries the family name', () => {
    const orphans = catalogFrom(
      [{ ...variant('f', 'Huérfano', 'kg', [price('0.020000')]), product_family: null }],
      FACTORS,
      null,
    );
    expect(familyView(orphans, FAMILY, 'f').title).toBe(ES.family.title);
    expect(familyTitle('')).toBe(ES.family.title);
    expect(familyTitle('   ')).toBe(ES.family.title);
    expect(familyTitle('Quesos')).toBe('Quesos');
  });
});

describe('familyLineKey — the two things an empty family screen means', () => {
  // ⚠️⚠️ THEY MUST NOT COLLAPSE, AND IT IS SHARPER HERE THAN ON PRODUCTOS. This
  // screen is reached by TAPPING a row, so a cold open with the link out would
  // otherwise tell a shopkeeper that the product in her hand has been deleted.
  it('tells a read that has not landed from a product that is gone', () => {
    expect(familyLineKey(true)).toBe('loading');
    expect(familyLineKey(false)).toBe('missing');
  });

  // ⚠️ A KEY AND NEVER A SENTENCE — `emptyLineKey`'s shape, and what keeps every
  // Spanish word in one file (`R4`).
  it('returns a key ES.family actually has', () => {
    for (const loading of [true, false]) {
      expect(ES.family[familyLineKey(loading)]).toBeTypeOf('string');
    }
  });
});

// ============================================================================
// THE FOURTH STATE — found by the owner on his own phone on 2026-09-22, and no
// assertion in this file could have found it. Productos sat on *Cargando
// productos…* for ever against a project whose schema had never been deployed,
// because `loading` is `data === undefined` and SO IS A FAILED QUERY.
// ============================================================================

describe('catalogLine — a failed read never wears a loading sentence', () => {
  // ⚠️⚠️ THE BUG, AS AN ASSERTION. This is the exact state the phone was in.
  it('says the read failed instead of saying it is loading', () => {
    expect(catalogLine(true, '', 'unknown')).toBe(ES.api.errors.unknown);
    expect(catalogLine(true, '', 'unknown')).not.toBe(ES.catalog.loading);
  });

  // ⚠️ FAILURE OUTRANKS LOADING BECAUSE TANSTACK RETRIES TWICE: a query that
  // has failed can still be fetching, and preferring *loading* would put the
  // endless spinner back on every retry.
  it('keeps saying so while it retries', () => {
    for (const loading of [true, false]) {
      expect(catalogLine(loading, 'pechuga', 'offline')).toBe(ES.api.errors.offline);
    }
  });

  // ⚠️⚠️ AND IT NEVER TELLS HER THE SHOP IS EMPTY WHEN THE APP COULD NOT ASK.
  // *Todavía no hay productos* is the one empty-state sentence a shopkeeper
  // would ACT on — by adding products she already has.
  it('never says the catalog is empty on a failure', () => {
    expect(catalogLine(false, '', 'sessionEnded')).not.toBe(ES.catalog.empty);
    expect(catalogLine(false, '', 'sessionEnded')).toBe(ES.api.errors.sessionEnded);
  });

  it('is exactly the old three sentences when nothing failed', () => {
    expect(catalogLine(true, '', null)).toBe(ES.catalog.loading);
    expect(catalogLine(false, '', null)).toBe(ES.catalog.empty);
    expect(catalogLine(false, 'tornillos', null)).toBe(ES.catalog.noMatches);
  });

  // ⚠️ EVERY KEY `apiErrorKey` CAN RETURN HAS A SENTENCE, which is what stops
  // this returning `undefined` on the one path nobody renders in a suite.
  it('resolves every api error key to a real sentence', () => {
    for (const key of Object.keys(ES.api.errors) as (keyof typeof ES.api.errors)[]) {
      expect(catalogLine(false, '', key)).toBeTypeOf('string');
      expect(catalogLine(false, '', key).length).toBeGreaterThan(0);
    }
  });
});

describe('familyLine — and here the wrong sentence deletes a product', () => {
  // ⚠️⚠️ THE SHARPEST CASE IN THE APP. This screen is reached by TAPPING a
  // product, so falling through to *ya no está en el catálogo* on a failed read
  // tells a shopkeeper the thing in her hand has been deleted.
  it('never says the product is gone when the read failed', () => {
    expect(familyLine(false, 'unknown')).not.toBe(ES.family.missing);
    expect(familyLine(false, 'unknown')).toBe(ES.api.errors.unknown);
  });

  it('says so while it retries, and keeps the old two otherwise', () => {
    expect(familyLine(true, 'offline')).toBe(ES.api.errors.offline);
    expect(familyLine(true, null)).toBe(ES.family.loading);
    expect(familyLine(false, null)).toBe(ES.family.missing);
  });
});

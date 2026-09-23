import { describe, expect, it } from 'vitest';

import {
  CATALOG_WRITE_REFUSALS,
  FAMILY_INSERT_COLUMNS,
  INSERT_RETURNING,
  PRICE_INSERT_COLUMNS,
  VARIANT_INSERT_COLUMNS,
  WRITE_ORDER,
  catalogWriteErrorMessage,
  checkProduct,
  createLine,
  familiesFrom,
  familyRow,
  parsePesos,
  priceRow,
  pricePerBase,
  retryDraft,
  suggestFamily,
  unitColumns,
  variantRow,
  type CreateFailed,
  type ProductDraft,
} from '@/api/catalogWrite';
import {
  catalogFrom,
  priceCentavos,
  unitFactorsFrom,
  type UnitRow,
  type VariantRow,
} from '@/api/catalog';
import { ES } from '@/strings';

// ============================================================================
// THE SHOP MAKING A PRODUCT. Plan task `5e-i`.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR AND WHAT IT CANNOT DO, STATED TOGETHER — the
// sentence `api-catalog.test.ts` opens with, and on this task the gap is wider
// than it has ever been. Every assertion below pins a ROW this app posts, a
// piece of ARITHMETIC, or a SENTENCE a refusal becomes. It can prove the app is
// consistent with itself, and it proves one thing more than usual: that the
// price a shopkeeper types survives a round trip through `pricePerBase` and back
// through `@/api/catalog`'s `priceCentavos` unchanged, for all ten units.
//
// ⚠️⚠️ IT CANNOT PROVE THE FENCE. `product_variant_insert` is
// `has_role(…, 'manager')` in `0002`; nothing in TypeScript has ever read a
// policy, and `CREATE POLICY` is not even in the knowledge graph. A cashier
// being refused is `docs/checks/5e-i-catalog-write-contract.sh` and nothing
// else in this repository — the codes below are what that check MEASURED on
// 2026-09-22, written back here as fixtures so the mapping has a fast home.
//
// ⚠️ AND IT CANNOT SEE A FORM, because this task ships none. `5e-ii` draws the
// four fields and the instrument for that is the owner's phone (`R9`).
// ============================================================================

const POLLO = '11111111-1111-4111-8111-111111111111';
const CERDO = '22222222-2222-4222-8222-222222222222';
const SHOP = '99999999-9999-4999-8999-999999999999';
const VARIANT_ID = '44444444-4444-4444-8444-444444444444';

/** The ten rows `0001` seeds, as PostgREST sends them with `::text`. */
const UNITS: readonly UnitRow[] = [
  { code: 'kg', dimension: 'mass', factor_to_base: '1000.000000', display_order: 10 },
  { code: 'g', dimension: 'mass', factor_to_base: '1.000000', display_order: 40 },
  { code: '500g', dimension: 'mass', factor_to_base: '500.000000', display_order: 20 },
  { code: '250g', dimension: 'mass', factor_to_base: '250.000000', display_order: 25 },
  { code: '100g', dimension: 'mass', factor_to_base: '100.000000', display_order: 30 },
  { code: 'l', dimension: 'volume', factor_to_base: '1000.000000', display_order: 10 },
  { code: 'ml', dimension: 'volume', factor_to_base: '1.000000', display_order: 40 },
  { code: '500ml', dimension: 'volume', factor_to_base: '500.000000', display_order: 20 },
  { code: '100ml', dimension: 'volume', factor_to_base: '100.000000', display_order: 30 },
  { code: 'pza', dimension: 'count', factor_to_base: '1.000000', display_order: 10 },
];

const FACTORS = unitFactorsFrom(UNITS);

function variant(id: string, name: string, familyId: string, familyName: string): VariantRow {
  return {
    id,
    name,
    family_id: familyId,
    price_unit_code: 'kg',
    is_active: true,
    product_family: { id: familyId, name: familyName },
    price_list: [],
  };
}

/** The catalog a phone holds: two families, three products. */
const ENTRIES = catalogFrom(
  [
    variant('a', 'Pierna', POLLO, 'Pollo'),
    variant('b', 'Pechuga', POLLO, 'Pollo'),
    variant('c', 'Chuleta', CERDO, 'Cerdo'),
  ],
  FACTORS,
  null,
);

function draft(over: Partial<ProductDraft> = {}): ProductDraft {
  return {
    name: 'Muslo',
    familyId: POLLO,
    familyName: 'Pollo',
    unitCode: 'kg',
    pricePesos: '35.00',
    ...over,
  };
}

function refusal(code: string, message: string): unknown {
  return { code, message, details: null, hint: null };
}

// ----------------------------------------------------------------------------

describe('the order of the three writes — a deliverable, not an implementation detail', () => {
  it('is family, then variant, then price', () => {
    expect(WRITE_ORDER).toEqual(['product_family', 'product_variant', 'price_list']);
  });

  // ⚠️ THE ORDER IS THE FOREIGN KEYS' AND NOT A PREFERENCE. `price_list_variant_fk`
  // and `product_variant_family_fk` are composite keys, so either row posted
  // early is a `23503` against a real database — which is what
  // `docs/checks/5e-i-catalog-write-contract.sh` drives rather than asserts.
  it('puts each row after the one it points at', () => {
    expect(WRITE_ORDER.indexOf('product_family')).toBeLessThan(
      WRITE_ORDER.indexOf('product_variant'),
    );
    expect(WRITE_ORDER.indexOf('product_variant')).toBeLessThan(WRITE_ORDER.indexOf('price_list'));
  });
});

describe('the contract — every column this app posts', () => {
  it('names its columns and never asks for everything', () => {
    for (const list of [
      FAMILY_INSERT_COLUMNS,
      VARIANT_INSERT_COLUMNS,
      PRICE_INSERT_COLUMNS,
      INSERT_RETURNING,
    ]) {
      expect(list).not.toContain('*');
    }
  });

  // ⚠️⚠️ C8.8: NO PILOT SCREEN MAY EXPOSE `enforce_stock`, and this is the one
  // form that would ever have been tempted to send it. `tax_rate` and
  // `pack_size` are `5e-iii`'s, set once and never guessed.
  it('sends neither enforce_stock, tax_rate nor pack_size', () => {
    for (const column of ['enforce_stock', 'tax_rate', 'pack_size']) {
      expect(VARIANT_INSERT_COLUMNS).not.toContain(column);
    }
    expect(Object.keys(variantRow(SHOP, POLLO, draft()))).not.toContain('enforce_stock');
  });

  // ⚠️ THE BUILDERS AND THE COLUMN LISTS ARE TWO COPIES OF ONE CLAIM, forty
  // lines apart, which is exactly the shape this repository has recorded six
  // stale-duplicate defects of. So they are compared rather than both trusted.
  it('builds rows whose keys are the column lists, exactly', () => {
    expect(Object.keys(familyRow(SHOP, 'Pollo')).sort()).toEqual(
      FAMILY_INSERT_COLUMNS.split(',').sort(),
    );
    expect(Object.keys(variantRow(SHOP, POLLO, draft())).sort()).toEqual(
      VARIANT_INSERT_COLUMNS.split(',').sort(),
    );
    expect(Object.keys(priceRow(SHOP, VARIANT_ID, '0.035000', '2026-09-22')).sort()).toEqual(
      PRICE_INSERT_COLUMNS.split(',').sort(),
    );
  });

  it('opens the price shop-wide and with no end', () => {
    const row = priceRow(SHOP, VARIANT_ID, '0.035000', '2026-09-22');
    expect(row.location_id).toBeNull();
    expect(row.effective_to).toBeNull();
    expect(row.effective_from).toBe('2026-09-22');
  });

  // ⚠️ THE BANDA LA FAMILIA DRAWS PRINTS THIS STRING. `normalize_name` folds the
  // key and not the stored name, so an untrimmed name is invisible until it is
  // on a heading.
  it('trims the names it stores, the way normalize_name folds the key', () => {
    expect(familyRow(SHOP, '  Pollo   entero ').name).toBe('Pollo entero');
    expect(variantRow(SHOP, POLLO, draft({ name: ' Muslo  con   hueso ' })).name).toBe(
      'Muslo con hueso',
    );
  });
});

describe('C8.10 — one question at the form, four columns in the row', () => {
  it('writes the chosen unit into all four not-null unit columns', () => {
    expect(unitColumns('kg')).toEqual({
      base_unit_code: 'kg',
      purchase_unit_code: 'kg',
      sell_unit_code: 'kg',
      price_unit_code: 'kg',
    });
  });

  // ⚠️⚠️ THIS IS WHAT MAKES `product_variant_units_same_dimension_trg`
  // UNREACHABLE — four copies of one code cannot span two dimensions — which is
  // why there is no sentence in this app for that `23514`.
  it('cannot produce a row that spans two dimensions', () => {
    for (const code of Object.keys(FACTORS)) {
      const codes = Object.values(unitColumns(code));
      expect(new Set(codes).size).toBe(1);
    }
  });

  it('puts all four on the variant row', () => {
    const row = variantRow(SHOP, POLLO, draft({ unitCode: '250g' }));
    expect(row.base_unit_code).toBe('250g');
    expect(row.purchase_unit_code).toBe('250g');
    expect(row.sell_unit_code).toBe('250g');
    expect(row.price_unit_code).toBe('250g');
  });
});

describe('the typed peso figure', () => {
  it('reads plain pesos and centavos as integer centavos', () => {
    expect(parsePesos('35')).toBe(3500);
    expect(parsePesos('35.50')).toBe(3550);
    expect(parsePesos('0')).toBe(0);
    expect(parsePesos('0.05')).toBe(5);
  });

  // ⚠️ C12.2 RENDERS `$1,234.50`, so a shopkeeper copying what the app showed
  // her must be able to type it back.
  it('accepts what formatMXN printed — the peso sign, the thousands comma, spaces', () => {
    expect(parsePesos('$1,234.50')).toBe(123450);
    expect(parsePesos(' 35.00 ')).toBe(3500);
  });

  // ⚠️ REFUSED RATHER THAN REPAIRED. A price this app guessed at is a price the
  // shop charges.
  it('refuses anything that is not a plain figure', () => {
    for (const typed of ['', '   ', 'abc', '3e2', '1.2.3', '35.555', '-5', '35 pesos']) {
      expect(parsePesos(typed)).toBeNull();
    }
  });

  // ⚠️ `Number('35.35') * 100` is `3534.9999999999995`. The whole money path
  // exists to make that unrepresentable, and this is the first place in the app
  // that reads money a person typed.
  it('never goes through a float', () => {
    expect(parsePesos('35.35')).toBe(3535);
    expect(parsePesos('0.07')).toBe(7);
    expect(parsePesos('1234567.89')).toBe(123456789);
  });
});

describe('the price, inverted — the exact inverse of what 5d-i shipped', () => {
  // C3.10's own three examples, from the other side.
  it('turns $35.00 / kg into price_per_base', () => {
    expect(pricePerBase(3500, FACTORS.kg)).toBe('0.035000');
  });
  it('turns $9.00 / 250 gr into price_per_base', () => {
    expect(pricePerBase(900, FACTORS['250g'])).toBe('0.036000');
  });
  it('turns $2.00 / pza into price_per_base', () => {
    expect(pricePerBase(200, FACTORS.pza)).toBe('2.000000');
  });

  // ⚠️⚠️ THE ASSERTION THAT MATTERS: what a shopkeeper types is what Productos
  // reads back a second later. `priceCentavos` is `@/api/catalog`'s and this is
  // the only place the two are put back to back.
  it('round-trips through priceCentavos for all ten units and a spread of prices', () => {
    for (const unit of UNITS) {
      for (const centavos of [0, 1, 5, 99, 100, 200, 900, 3500, 3535, 99999, 123450]) {
        const perBase = pricePerBase(centavos, unit.factor_to_base);
        expect(perBase).not.toBeNull();
        expect(priceCentavos(perBase as string, unit.factor_to_base)).toBe(centavos);
      }
    }
  });

  it('is a decimal string at the scale price_per_base holds', () => {
    for (const unit of UNITS) {
      expect(pricePerBase(3500, unit.factor_to_base)).toMatch(/^\d+\.\d{6}$/);
    }
  });

  // ⚠️ EVERY THROW THE MONEY PATH RAISES BECOMES `null` — a corrupt `unit` row
  // is not a shopkeeper's problem, and `checkProduct` is what keeps it off the
  // wire.
  it('answers null rather than throwing on a factor it cannot read', () => {
    expect(pricePerBase(3500, '')).toBeNull();
    expect(pricePerBase(3500, 'kilo')).toBeNull();
    expect(pricePerBase(Number.MAX_SAFE_INTEGER, FACTORS.kg)).toBeNull();
  });
});

describe('the family, suggested from the typed name', () => {
  it('lists each family of the held catalog once, in the database order', () => {
    expect(familiesFrom(ENTRIES)).toEqual([
      { id: POLLO, name: 'Pollo' },
      { id: CERDO, name: 'Cerdo' },
    ]);
  });

  it('attaches to a family the typed name contains', () => {
    expect(suggestFamily(ENTRIES, 'Pierna de pollo')).toEqual({
      familyId: POLLO,
      familyName: 'Pollo',
    });
  });

  // ⚠️⚠️ `0002` REFUSES TO FOLD ACCENTS IN `normalize_name` AND ASKS FOR
  // SEARCH-TIME FOLDING BY NAME. A shopkeeper hunting for a family types what
  // is quickest.
  it('folds accents when it matches, the way searchTerm does', () => {
    const entries = catalogFrom([variant('d', 'Macho', POLLO, 'Plátano')], FACTORS, null);
    expect(suggestFamily(entries, 'platano tabasco').familyId).toBe(POLLO);
  });

  // ⚠️ WHOLE WORDS AND NOT A SUBSTRING. `includes` would match `Res` inside
  // `Refresco`, and a form that proposes the wrong family by default is worse
  // than one that proposes none.
  it('does not match a family hiding inside a longer word', () => {
    const entries = catalogFrom([variant('e', 'Costilla', CERDO, 'Res')], FACTORS, null);
    expect(suggestFamily(entries, 'Refresco de cola').familyId).toBeNull();
  });

  it('prefers the longest match when two families fit', () => {
    const entries = catalogFrom(
      [
        variant('f', 'Entero', POLLO, 'Pollo'),
        variant('g', 'Cruda', CERDO, 'Pierna de pollo'),
      ],
      FACTORS,
      null,
    );
    expect(suggestFamily(entries, 'Pierna de pollo ahumada').familyName).toBe('Pierna de pollo');
  });

  // ⚠️ THE WHOLE TYPED NAME AND NOT ITS FIRST WORD: `Agua mineral` becoming a
  // family called `Agua` is the app being clever about a substance it knows
  // nothing about, and `Jitomate` / `Jitomate a granel` is what a family of one
  // looks like before it grows variants.
  it('proposes a new family named for the whole typed product when none fits', () => {
    expect(suggestFamily(ENTRIES, '  Agua   mineral ')).toEqual({
      familyId: null,
      familyName: 'Agua mineral',
    });
  });

  it('proposes nothing out of an empty box', () => {
    expect(suggestFamily(ENTRIES, '   ')).toEqual({ familyId: null, familyName: '' });
  });
});

describe('the four fields, before Postgres is asked', () => {
  it('passes a draft the database will accept', () => {
    expect(checkProduct(draft(), ENTRIES, FACTORS)).toBeNull();
  });

  it('refuses each field in the form reading order', () => {
    expect(checkProduct(draft({ name: '  ' }), ENTRIES, FACTORS)).toBe('nameMissing');
    expect(checkProduct(draft({ familyId: null, familyName: ' ' }), ENTRIES, FACTORS)).toBe(
      'familyMissing',
    );
    expect(checkProduct(draft({ unitCode: 'arroba' }), ENTRIES, FACTORS)).toBe('unitMissing');
    expect(checkProduct(draft({ pricePesos: '' }), ENTRIES, FACTORS)).toBe('priceMissing');
    expect(checkProduct(draft({ pricePesos: 'gratis' }), ENTRIES, FACTORS)).toBe('priceMissing');
  });

  it('takes a new family by name, with no id', () => {
    expect(checkProduct(draft({ familyId: null, familyName: 'Res' }), ENTRIES, FACTORS)).toBeNull();
  });

  // ⚠️⚠️ SHOP-WIDE, NOT PER FAMILY. `product_variant_name_unique` is
  // `(workspace_id, normalized_name)`, measured 2026-09-22: `Pierna` under Pollo
  // really does refuse `Pierna` under Cerdo.
  it('catches a name the shop already uses, even under another family', () => {
    expect(checkProduct(draft({ name: 'Pierna', familyId: CERDO }), ENTRIES, FACTORS)).toBe(
      'duplicate',
    );
  });

  // ⚠️ THE DATABASE FOLDS CASE AND SPACES, AND NOT ACCENTS — so this check must
  // fold exactly that much. Folding accents here would refuse a product the
  // database would have taken.
  it('folds the way normalize_name folds, and no further', () => {
    expect(checkProduct(draft({ name: '  pierna  ' }), ENTRIES, FACTORS)).toBe('duplicate');
    expect(checkProduct(draft({ name: 'Piérna' }), ENTRIES, FACTORS)).toBeNull();
  });

  it('answers a key of ES.catalog.issues and never a sentence', () => {
    const issue = checkProduct(draft({ name: '' }), ENTRIES, FACTORS);
    expect(issue).not.toBeNull();
    expect(ES.catalog.issues[issue as keyof typeof ES.catalog.issues]).toBeTypeOf('string');
  });
});

describe('the two refusals a shopkeeper can actually reach', () => {
  // ⚠️ MEASURED 2026-09-22 AGAINST THE APPLIED SCHEMA: HTTP 409, `details: null`,
  // and the constraint name only in the message.
  it('tells the two duplicates apart by constraint name', () => {
    expect(
      catalogWriteErrorMessage(
        refusal('23505', 'duplicate key value violates unique constraint "product_variant_name_unique"'),
      ),
    ).toBe(ES.catalog.errors.duplicate);
    expect(
      catalogWriteErrorMessage(
        refusal('23505', 'duplicate key value violates unique constraint "product_family_name_unique"'),
      ),
    ).toBe(ES.catalog.errors.familyExists);
  });

  it('falls back to the product sentence for a 23505 it does not recognise', () => {
    expect(catalogWriteErrorMessage(refusal('23505', 'duplicate key value'))).toBe(
      ES.catalog.errors.duplicate,
    );
  });

  // ⚠️⚠️ THE ONE THAT WOULD HAVE SHIPPED WRONG. `@/api/errors` maps `42501` to
  // *"Tu sesión se cerró"*, which on this path is a cashier being sent round a
  // loop she cannot leave.
  it('says a cashier is not allowed, and does not send her to sign in again', () => {
    const refused = refusal(
      '42501',
      'new row violates row-level security policy for table "product_variant"',
    );
    expect(catalogWriteErrorMessage(refused)).toBe(ES.catalog.errors.notAllowed);
    expect(catalogWriteErrorMessage(refused)).not.toBe(ES.api.errors.sessionEnded);
  });

  // ⚠️ THE SECOND ONE THAT WOULD HAVE SHIPPED WRONG: `23514` is
  // `nameMissing` API-wide — *"Escribe el nombre de tu tienda."* — because
  // `0027` raises it on a blank SHOP name.
  it('does not tell a shopkeeper adding a product to name her shop', () => {
    const refused = refusal(
      '23514',
      'new row for relation "product_variant" violates check constraint "product_variant_name_not_blank"',
    );
    expect(catalogWriteErrorMessage(refused)).toBe(ES.catalog.errors.rejected);
    expect(catalogWriteErrorMessage(refused)).not.toBe(ES.api.errors.nameMissing);
  });

  it('sends everything else down the sentence every other screen gives', () => {
    expect(catalogWriteErrorMessage({ name: 'AuthRetryableFetchError' })).toBe(
      ES.api.errors.offline,
    );
    expect(catalogWriteErrorMessage(new Error('boom'))).toBe(ES.api.errors.unknown);
    expect(catalogWriteErrorMessage(refusal('PGRST301', 'JWT expired'))).toBe(
      ES.api.errors.sessionEnded,
    );
  });

  it('maps every constraint it knows to a key of ES.catalog.errors', () => {
    for (const key of Object.values(CATALOG_WRITE_REFUSALS)) {
      expect(ES.catalog.errors[key]).toBeTypeOf('string');
    }
  });
});

describe('what a partial write leaves behind', () => {
  function failed(over: Partial<CreateFailed>): CreateFailed {
    return {
      ok: false,
      failed: 'product_variant',
      familyId: POLLO,
      variantId: null,
      error: refusal('23505', 'duplicate key value violates unique constraint "product_variant_name_unique"'),
      ...over,
    };
  }

  // ⚠️⚠️ WITHOUT THIS THE SECOND ATTEMPT IS REFUSED FOR THE FIRST ATTEMPT'S OWN
  // WORK: the family landed, and re-posting the same draft asks the database to
  // create it again.
  it('carries the family the first attempt created into the retry', () => {
    const original = draft({ familyId: null, familyName: 'Pollo' });
    expect(retryDraft(original, failed({ familyId: POLLO })).familyId).toBe(POLLO);
  });

  it('changes nothing when the family itself is what failed', () => {
    const original = draft({ familyId: null, familyName: 'Pollo' });
    expect(retryDraft(original, failed({ failed: 'product_family', familyId: null }))).toEqual(
      original,
    );
  });

  // ⚠️⚠️ A FAILURE AT THE PRICE IS NOT A FAILURE TO SAVE THE PRODUCT. The
  // variant landed and the product is on Productos wearing C3.12's dash;
  // *"no se pudo guardar"* would send her to type it all again and the second
  // attempt is refused by the row the first one made.
  it('says the product saved and its price did not', () => {
    expect(createLine(failed({ failed: 'price_list', variantId: VARIANT_ID }))).toBe(
      ES.catalog.errors.priceNotSaved,
    );
  });

  it('gives the refusal itself for the two steps that saved no product', () => {
    expect(createLine(failed({ failed: 'product_variant' }))).toBe(ES.catalog.errors.duplicate);
    expect(
      createLine(
        failed({
          failed: 'product_family',
          familyId: null,
          error: refusal('42501', 'new row violates row-level security policy for table "product_family"'),
        }),
      ),
    ).toBe(ES.catalog.errors.notAllowed);
  });

  // ⚠️ EVERY STEP OF `WRITE_ORDER` HAS A SENTENCE, and the loop is what makes a
  // fourth row added later go red here rather than render `undefined`.
  it('has a sentence for a failure at every step', () => {
    for (const step of WRITE_ORDER) {
      expect(createLine(failed({ failed: step }))).toBeTypeOf('string');
      expect(createLine(failed({ failed: step }))).not.toBe('');
    }
  });
});

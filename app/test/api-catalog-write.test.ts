import { describe, expect, it } from 'vitest';

import {
  CATALOG_WRITE_REFUSALS,
  FAMILY_MIRROR,
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
  noPriceNoticeKey,
  priceOmitted,
  priceRow,
  pricePerBase,
  retryDraft,
  unitColumns,
  unitOrder,
  canWriteCatalog,
  catalogRows,
  chooseFamily,
  chooseUnit,
  familyUnit,
  resolveFamily,
  searchFamilies,
  variantRow,
  type CreateFailed,
  type FamilyChoice,
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
    base_unit_code: 'g',
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

describe('the families this shop has, and the search that finds one', () => {
  // ⚠️⚠️ `suggestFamily` WAS DELETED ON 2026-09-23 BY THE OWNER'S RULING and its
  // matching survives here as tier 1. It attached `Pierna de pollo` to `Pollo`
  // with nothing on screen saying a choice had been made; he held the form and
  // said it "looks as a decision already made, not as a suggestion". The matching
  // was never the mistake — the silence was.
  it('lists every family once, in the catalog order, ignoring variants', () => {
    expect(familiesFrom(ENTRIES)).toEqual([
      { id: POLLO, name: 'Pollo' },
      { id: CERDO, name: 'Cerdo' },
    ]);
  });

  it('gives every family back for an empty box — the list he scrolls', () => {
    expect(searchFamilies(ENTRIES, '')).toEqual(familiesFrom(ENTRIES));
    expect(searchFamilies(ENTRIES, '   ')).toEqual(familiesFrom(ENTRIES));
  });

  it('finds a family by a whole word inside the name he typed', () => {
    expect(searchFamilies(ENTRIES, 'Pierna de pollo').map((f) => f.name)).toEqual(['Pollo']);
  });

  it('finds a family while he is still half-typing it', () => {
    expect(searchFamilies(ENTRIES, 'poll').map((f) => f.name)).toEqual(['Pollo']);
  });

  // ⚠️ THE FOLD IS `searchTerm`'s AND THEREFORE FOLDS ACCENTS, which is the
  // opposite of the duplicate pre-check and deliberate in both places: `0002` put
  // accent folding in the QUERY and kept it out of the uniqueness rule.
  it('folds accents, because hunting for a family is a search', () => {
    const shop = catalogFrom([variant('z', 'Macho', 'F9', 'Plátano')], FACTORS, null);
    expect(searchFamilies(shop, 'platano').map((f) => f.name)).toEqual(['Plátano']);
  });

  // ⚠️⚠️ THE RANKING IS THE WHOLE VALUE OF THIS SEARCH — scenario 3 is the moment
  // he realises `Pollo` is already there, and a plain filter buries it under the
  // longer name that also matched.
  it('puts the shorter, whole-word family above the longer one', () => {
    const shop = catalogFrom(
      [
        variant('a', 'Rostizado', 'F1', 'Pollo rostizado'),
        variant('b', 'Pechuga', POLLO, 'Pollo'),
      ],
      FACTORS,
      null,
    );
    expect(searchFamilies(shop, 'pollo').map((f) => f.name)).toEqual(['Pollo', 'Pollo rostizado']);
  });

  it('answers nothing when nothing matches, rather than everything', () => {
    expect(searchFamilies(ENTRIES, 'queso')).toEqual([]);
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
    expect(checkProduct(draft({ pricePesos: 'gratis' }), ENTRIES, FACTORS)).toBe('priceUnreadable');
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

describe('a product with no price — the owner\'s ruling of 2026-09-22', () => {
  // ⚠️⚠️ THE RULING REVERSED WHAT `5e-i` SHIPPED THAT MORNING. The price was
  // REQUIRED, on the reading that C8.9 lists it among the four fields; the owner
  // overrode it — *"allow the user to create a product without a sell nor
  // purchasing price, but highlight he's doing so"* — which is the smaller,
  // kinder thing, and the sixth time on this project he has taken it.
  it('lets an empty price box through', () => {
    for (const typed of ['', '   ', '$', ' $ ']) {
      expect(checkProduct(draft({ pricePesos: typed }), ENTRIES, FACTORS)).toBeNull();
    }
  });

  // ⚠️ EMPTY AND UNREADABLE ARE NOW TWO FACTS, AND BEFORE THE RULING THEY WERE
  // ONE. A box with `gratis` in it is still a refusal: a price this app guessed
  // at is a price the shop charges.
  it('still refuses a box holding something that is not a price', () => {
    for (const typed of ['gratis', 'abc', '3e2', '35.555', '-5']) {
      expect(priceOmitted(typed)).toBe(false);
      expect(checkProduct(draft({ pricePesos: typed }), ENTRIES, FACTORS)).toBe('priceUnreadable');
    }
  });

  // ⚠️⚠️ `priceOmitted` AND `parsePesos` MUST AGREE ABOUT WHAT *EMPTY* MEANS,
  // which is why one function does the cleaning for both. If they disagreed,
  // `checkProduct` would let a draft through that `createProduct` then treated
  // as a bug — or the reverse, and a shopkeeper would be refused a product the
  // owner ruled he may create.
  it('agrees with parsePesos about which boxes are empty', () => {
    for (const typed of ['', '  ', '$', ' , ', '35', '0', 'abc', '$1,234.50']) {
      if (priceOmitted(typed)) expect(parsePesos(typed)).toBeNull();
    }
    expect(priceOmitted('0')).toBe(false);
    expect(parsePesos('0')).toBe(0);
  });

  // ⚠️⚠️ `$0.00` AND NO PRICE ARE NOT THE SAME PRODUCT — C3.12, and it is the
  // reason the third row is omitted rather than posted as zero. A zero is a
  // price the owner SET and sells at; no row is a question nobody has answered.
  it('treats a typed zero as a price, not as an omission', () => {
    expect(priceOmitted('0')).toBe(false);
    expect(noPriceNoticeKey(draft({ pricePesos: '0' }), ENTRIES, FACTORS)).toBeNull();
    expect(checkProduct(draft({ pricePesos: '0' }), ENTRIES, FACTORS)).toBeNull();
    expect(pricePerBase(0, FACTORS.kg)).toBe('0.000000');
  });

  it('says something only when the price is the thing that is missing', () => {
    expect(noPriceNoticeKey(draft({ pricePesos: '' }), ENTRIES, FACTORS)).toBe('noPrice');
    expect(noPriceNoticeKey(draft({ pricePesos: '  ' }), ENTRIES, FACTORS)).toBe('noPrice');
    expect(noPriceNoticeKey(draft(), ENTRIES, FACTORS)).toBeNull();
    expect(noPriceNoticeKey(draft({ pricePesos: 'gratis' }), ENTRIES, FACTORS)).toBeNull();
  });

  // ⚠️⚠️ THE PRICE BOX STARTS EMPTY, so a notice keyed on emptiness ALONE would
  // be on screen before a single character is typed — a warning about a product
  // that does not exist yet, on every visit, which is how a shopkeeper learns to
  // read past it. It appears when the sentence becomes TRUE, which is why the
  // sentence is in the future tense.
  it('stays quiet until the rest of the draft is one the database would accept', () => {
    const bare: ProductDraft = {
      name: '',
      familyId: null,
      familyName: '',
      unitCode: '',
      pricePesos: '',
    };
    expect(noPriceNoticeKey(bare, ENTRIES, FACTORS)).toBeNull();
    expect(noPriceNoticeKey({ ...bare, name: 'Muslo' }, ENTRIES, FACTORS)).toBeNull();
    expect(
      noPriceNoticeKey({ ...bare, name: 'Muslo', familyName: 'Pollo' }, ENTRIES, FACTORS),
    ).toBeNull();
    expect(
      noPriceNoticeKey(
        { ...bare, name: 'Muslo', familyName: 'Pollo', unitCode: 'kg' },
        ENTRIES,
        FACTORS,
      ),
    ).toBe('noPrice');
  });

  // ⚠️ A REFUSAL OUTRANKS IT, and it falls out of asking `checkProduct` first
  // rather than being a second rule: a name the shop already uses is something
  // he must fix, and stacking "and by the way there is no price" under it is two
  // messages about one box.
  it('says nothing while a refusal is standing', () => {
    expect(
      noPriceNoticeKey(draft({ name: 'Pierna', pricePesos: '' }), ENTRIES, FACTORS),
    ).toBeNull();
    expect(checkProduct(draft({ name: 'Pierna', pricePesos: '' }), ENTRIES, FACTORS)).toBe(
      'duplicate',
    );
  });

  // ⚠️ IT ANSWERS A KEY AND NEVER A SENTENCE (`R4`), the shape `checkProduct`
  // and `emptyLineKey` already use.
  it('answers a key of ES.catalog.notice', () => {
    const key = noPriceNoticeKey(draft({ pricePesos: '' }), ENTRIES, FACTORS);
    expect(key).not.toBeNull();
    expect(ES.catalog.notice[key as keyof typeof ES.catalog.notice]).toBeTypeOf('string');
  });

  // ⚠️⚠️ THE SENTENCE NAMES THE CONSEQUENCE AND NOT THE STATE, which is the
  // owner's own point: C3.12 is his earlier ruling that a transaction cannot be
  // concreted without a price, so what he cannot see from this form is that
  // Vender and Comprar will both stop and ask him.
  // ⚠️⚠️ REWRITTEN 2026-09-23 BY THE OWNER'S OWN REWORDING, AND HIS VERSION IS
  // MORE CORRECT THAN THE ONE IT REPLACED. The old sentence said *"cuando lo
  // compres o lo vendas"* and this assertion pinned both verbs — but **Comprar
  // never needed this price**: `price_list` is not read by any function in any
  // migration (`from`/`join` count is zero across all of them), `record_purchase`
  // prices each line from the `p_lines` the caller sends, and the only reader is
  // `priceFor` in `@/api/catalog`, prefilling a SELL price. So naming Comprar was
  // a promise about a screen that will not stop him. ⚠️ The assertion now pins
  // what the sentence claims rather than the words it used: it names selling, and
  // it does NOT merely restate the state he can already see.
  it('names the counter that will stop him, and only that one', () => {
    expect(ES.catalog.notice.noPrice).toMatch(/vender/);
    expect(ES.catalog.notice.noPrice).not.toMatch(/compr/);
  });

  // ⚠️ IT NAMES A CONSEQUENCE AND NOT A STATE. *"Este producto no tiene precio"*
  // is what he just typed; what he cannot see from this form is that Vender will
  // stop and ask him, which is C3.12 — the owner's own earlier ruling.
  it('does not restate the empty box back at him', () => {
    expect(ES.catalog.notice.noPrice).not.toMatch(/no tendrá precio/);
    expect(ES.catalog.notice.noPrice).not.toMatch(/no tiene precio/);
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

  // ⚠️⚠️ A PRICE THAT WILL NOT CONVERT MUST STOP THE WRITE BEFORE IT STARTS, not
  // after two rows have landed. The case that makes it real is not a typo: it is
  // the `unit` read not having landed, which leaves `factors` empty — and a
  // create that discovered that AFTER inserting would leave a real product on
  // Productos wearing C3.12's dash, made by a phone that never had the factors
  // to price it. `createProduct` computes it first; this is the piece of that
  // decision a node suite can hold.
  it('knows a draft is unpriceable before anything is posted', () => {
    const noFactors = {};
    expect(checkProduct(draft(), ENTRIES, noFactors)).toBe('unitMissing');
    expect(pricePerBase(3500, noFactors['kg' as keyof typeof noFactors] ?? '')).toBeNull();
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

// ============================================================================
// WHAT THE FORM AND THE LIST DECIDE, DECIDED IN THE MODULE. Plan task `5e-ii`,
// REWORKED 2026-09-23 on the owner's ruling after he held the first version.
//
// ⚠️⚠️ EVERY ASSERTION BELOW IS A RULE HE STATED IN PROSE, TURNED INTO A VALUE.
// *A proposal must not look like a decision already made* is not checkable; *the
// family mirrors the typed name* and *a conflicting unit releases the family* are.
// That split is `R3`, and it is why the JSX above holds keystrokes and no opinions.
//
// ⚠️ WHAT IT STILL CANNOT SEE is whether a hint READS as a hint, whether the
// family search finds what he means, whether the released banner is legible before
// it fades, or whether the blink reads as *this is the one you just made*. `R9`,
// §2.11, and the owner's phone.
// ============================================================================

describe('the manager fence, drawn rather than discovered', () => {
  // ⚠️ `0002`'s OWN PREDICATE ON ALL THREE TABLES, `has_role(…, 'manager')`.
  // ⚠️⚠️ THIS SUITE CANNOT PROVE THE POLICY, only that the app agrees with what
  // somebody wrote down about it. `docs/checks/5e-i-catalog-write-contract.sh` is
  // the only instrument that asks a real database.
  it('admits the owner and a manager', () => {
    expect(canWriteCatalog('owner')).toBe(true);
    expect(canWriteCatalog('manager')).toBe(true);
  });

  it('keeps a cashier off the control entirely', () => {
    expect(canWriteCatalog('staff')).toBe(false);
  });

  // ⚠️ `null` IS "NOT KNOWN" AND NOT "NO AUTHORITY" — `roleOf`'s distinction.
  it('refuses while the role is still unknown', () => {
    expect(canWriteCatalog(null)).toBe(false);
  });
});

describe('the list that creates — Productos, where Agregar used to be', () => {
  it('is just the products while the search still matches something', () => {
    const rows = catalogRows(ENTRIES, 'pollo', true);
    expect(rows).toHaveLength(ENTRIES.length);
    expect(rows.every((row) => row.kind === 'product')).toBe(true);
  });

  // ⚠️⚠️ THE ANTI-DUPLICATE MECHANISM, AS ONE ASSERTION. The door opens only once
  // the list has nothing left to show him — which is the whole of the owner's
  // *"this allows us to discard partially duplicate product creation"*.
  it('appends the create row only when the search found nothing', () => {
    expect(catalogRows([], 'Pechuga sin hueso', true)).toEqual([
      { kind: 'create', name: 'Pechuga sin hueso' },
    ]);
  });

  it('carries the typed name, so the form is handed the word he typed', () => {
    const rows = catalogRows([], '  Pierna   de pollo  ', true);
    expect(rows[0]).toEqual({ kind: 'create', name: 'Pierna de pollo' });
  });

  // ⚠️ A BLANK BOX IS NOT A SEARCH THAT FOUND NOTHING — a create row with no name
  // in it would be `Agregar` back again, wearing a list row.
  it('offers nothing to create from an empty box, spaces included', () => {
    expect(catalogRows([], '', true)).toEqual([]);
    expect(catalogRows([], '   ', true)).toEqual([]);
  });

  // ⚠️⚠️ THE FENCE IS IN THE ROWS AND NOT IN THE SCREEN. A cashier gets a list
  // with no door in it; the refusal on the other side is a bare `42501`.
  it('never hands a cashier a door she will be refused', () => {
    expect(catalogRows([], 'Pechuga', false)).toEqual([]);
  });
});

describe("the family: a mirror, not a match — the owner's ruling of 2026-09-23", () => {
  // ⚠️⚠️ THE RULING, AS ONE ASSERTION. The old default searched the catalog and
  // attached `Pierna de pollo` to `Pollo`. The new one proposes the typed name.
  it('mirrors the product name instead of matching a family behind his back', () => {
    expect(resolveFamily(FAMILY_MIRROR, 'Pierna de pollo')).toEqual({
      familyId: null,
      familyName: 'Pierna de pollo',
    });
  });

  it('collapses the mirror the way the database will', () => {
    expect(resolveFamily(FAMILY_MIRROR, '  Queso   Oaxaca  ').familyName).toBe('Queso Oaxaca');
  });

  // ⚠️ THE OVERRIDE OUTRANKS EVERYTHING, and the opposite is the bug: a form that
  // re-derived the family would undo his choice on the next keystroke.
  it('keeps a chosen family while the product name goes on changing', () => {
    const chosen: FamilyChoice = { kind: 'chosen', id: CERDO, name: 'Cerdo' };
    expect(resolveFamily(chosen, 'Pierna de pollo')).toEqual({
      familyId: CERDO,
      familyName: 'Cerdo',
    });
  });

  it('creates the family he typed, and never the mirror', () => {
    expect(resolveFamily({ kind: 'new', name: '  Queso   Oaxaca ' }, 'Pechuga')).toEqual({
      familyId: null,
      familyName: 'Queso Oaxaca',
    });
  });

  // ⚠️ AN EMPTY NEW-FAMILY BOX STAYS `new` AND IS REFUSED BY `checkProduct`,
  // rather than falling back to a mirror he had just decided against.
  it('does not fall back to the mirror when the box is empty', () => {
    expect(resolveFamily({ kind: 'new', name: '   ' }, 'Pechuga')).toEqual({
      familyId: null,
      familyName: '',
    });
    expect(checkProduct({ ...draft(), familyId: null, familyName: '' }, [], FACTORS)).toBe(
      'familyMissing',
    );
  });
});

describe('C8.5 — the unit and the family policing each other', () => {
  const LECHE = '33333333-3333-4333-8333-333333333333';
  const HUEVO = '44444444-4444-4444-8444-444444444444';
  const SHOP = catalogFrom(
    [
      variant('a', 'Pechuga', POLLO, 'Pollo'),
      { ...variant('d', 'Leche entera', LECHE, 'Leche'), price_unit_code: 'l' },
      { ...variant('e', 'Huevo', HUEVO, 'Huevo'), price_unit_code: 'pza' },
    ],
    FACTORS,
    null,
  );
  const POLLO_F = { id: POLLO, name: 'Pollo' };
  const LECHE_F = { id: LECHE, name: 'Leche' };

  // ⚠️⚠️ ALL TEN UNITS, ALWAYS — WHICH REVERSES WHAT THIS MODULE DID YESTERDAY.
  // The owner replaced a narrowed picker with a rule he can see.
  it('offers all ten units whatever the family is', () => {
    expect(unitOrder(UNITS)).toHaveLength(UNITS.length);
  });

  // ⚠️ THE ORDER IS `0001`'s `display_order`, AND THIS IS WHAT MAKES THAT TRUE
  // RATHER THAN LUCKY: `catalogUnits` asks for no `order=`.
  it('puts the picker in the same order however the read arrives', () => {
    expect(unitOrder([...UNITS].reverse())).toEqual(unitOrder(UNITS));
    expect(unitOrder(UNITS)).toEqual([
      'kg', 'l', 'pza', '500g', '500ml', '250g', '100g', '100ml', 'g', 'ml',
    ]);
  });

  it('knows what an existing family is already priced in', () => {
    expect(familyUnit(SHOP, POLLO)).toBe('kg');
    expect(familyUnit(SHOP, LECHE)).toBe('l');
    expect(familyUnit(SHOP, 'a-family-nobody-has-used')).toBe('');
    expect(familyUnit(SHOP, null)).toBe('');
  });

  // ⚠️ THE PRESELECT IS THE OWNER'S RULE — one tap saved on the commonest create
  // in the shop: another cut of chicken, in kilos, like every other cut.
  it('preselects the family unit when he picks a family', () => {
    const out = chooseFamily(POLLO_F, '', SHOP, UNITS);
    expect(out.family).toEqual({ kind: 'chosen', id: POLLO, name: 'Pollo' });
    expect(out.unitCode).toBe('kg');
    expect(out.released).toBe(false);
  });

  it('leaves a compatible unit he already chose alone', () => {
    expect(chooseFamily(POLLO_F, '250g', SHOP, UNITS).unitCode).toBe('250g');
  });

  it("overrides a unit the family it just joined cannot hold", () => {
    expect(chooseFamily(POLLO_F, 'l', SHOP, UNITS).unitCode).toBe('kg');
  });

  // ⚠️⚠️ THE OWNER'S RULE IN HIS OWN WORDS: "if the user selects a different unit,
  // the family defaults to the variant again and shows a small banner."
  it('releases a chosen family when the unit cannot live in it', () => {
    const chosen: FamilyChoice = { kind: 'chosen', id: POLLO, name: 'Pollo' };
    const out = chooseUnit(chosen, 'l', SHOP, UNITS);
    expect(out.family).toEqual(FAMILY_MIRROR);
    expect(out.unitCode).toBe('l');
    expect(out.released).toBe(true);
  });

  // ⚠️⚠️ THE DIMENSION AND NOT THE EXACT UNIT, which is a reading of two of his
  // own sentences that disagree: the banner says "la misma unidad de medida" and
  // C8.5 says a family's variants "all share kg/gr" — two units, one dimension. A
  // pollería pricing Menudencias per 100g inside a kg family is real.
  it('does not release the family for another weight in the same family', () => {
    const chosen: FamilyChoice = { kind: 'chosen', id: POLLO, name: 'Pollo' };
    for (const code of ['250g', '100g', 'g', '500g', 'kg']) {
      expect(chooseUnit(chosen, code, SHOP, UNITS).released).toBe(false);
    }
  });

  it('releases it for a volume and for a count', () => {
    const chosen: FamilyChoice = { kind: 'chosen', id: POLLO, name: 'Pollo' };
    expect(chooseUnit(chosen, 'ml', SHOP, UNITS).released).toBe(true);
    expect(chooseUnit(chosen, 'pza', SHOP, UNITS).released).toBe(true);
  });

  // ⚠️ A MIRROR AND A TYPED-NEW FAMILY HAVE NO SIBLINGS TO DISAGREE WITH, so
  // nothing can release them — and releasing a name he typed himself would be the
  // app throwing away the one field it is sure about.
  it('never releases a mirror or a family he typed', () => {
    expect(chooseUnit(FAMILY_MIRROR, 'pza', SHOP, UNITS).released).toBe(false);
    expect(chooseUnit({ kind: 'new', name: 'Huevo' }, 'pza', SHOP, UNITS).released).toBe(false);
  });

  // ⚠️ AN UNKNOWN UNIT RELEASES NOTHING: if the `unit` read has not landed,
  // `dimensions` has no answer, and punishing him for a slow connection is wrong.
  it('releases nothing while the unit read has not landed', () => {
    const chosen: FamilyChoice = { kind: 'chosen', id: POLLO, name: 'Pollo' };
    expect(chooseUnit(chosen, 'pza', SHOP, []).released).toBe(false);
  });

  it('releases nothing for a family that has no unit of its own yet', () => {
    const chosen: FamilyChoice = { kind: 'chosen', id: 'empty-family', name: 'Nueva' };
    expect(chooseUnit(chosen, 'pza', SHOP, UNITS).released).toBe(false);
  });
});

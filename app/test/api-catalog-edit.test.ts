import { describe, expect, it } from 'vitest';

import {
  ACTIVE_PATCH_COLUMNS,
  EDIT_ORDER,
  NAME_PATCH_COLUMNS,
  PRICE_CLOSE_COLUMNS,
  PRICE_EDIT_COLUMNS,
  PRICE_EDIT_TABLE,
  PRICE_INSERT_COLUMNS,
  PRICE_REPRICE_COLUMNS,
  SETTINGS_PATCH_COLUMNS,
  UPDATE_RETURNING,
  VARIANT_EDIT_COLUMNS,
  VARIANT_TABLE,
  activePatch,
  catalogEditErrorMessage,
  checkEdit,
  editLine,
  editPlan,
  editPricePerBase,
  editTouches,
  namePatch,
  packSizeOf,
  parsePackSize,
  parseTaxRate,
  priceChange,
  priceChangeLine,
  retryChange,
  taxPercentOf,
  variantSettings,
  type EditFailed,
  type EditSubject,
  type PriceChangeFailed,
  type PriceInForce,
  type VariantEdit,
} from '@/api/catalogEdit';
import { catalogFrom, priceCentavos, unitFactorsFrom, type UnitRow, type VariantRow } from '@/api/catalog';
import { pricePerBase } from '@/api/catalogWrite';
import { ES } from '@/strings';

// ============================================================================
// `5e-iii-a` — THE EDIT AS A CONTRACT WITH POSTGRES.
//
// ⚠️ WHAT THIS SUITE CAN AND CANNOT SAY. It reads `app/src/api/catalogEdit.ts`
// and nothing else; not one assertion here has read `0002`. The names, the
// fences and the round trip are `docs/checks/5e-iii-a-catalog-edit-contract.sh`,
// which drives a real PostgREST. What is here is the half with a right answer a
// node process can compute: the three branches of the dated window, the two
// figures, and which sentence a refusal becomes.
// ============================================================================

const TODAY = '2026-09-23';
const YESTERDAY = '2026-09-22';
const WORKSPACE = 'ws-1';
const VARIANT = 'v-1';
const STORE = 'loc-1';

function row(over: Partial<PriceInForce> = {}): PriceInForce {
  return {
    id: 'p-1',
    price_per_base: '0.035000',
    location_id: null,
    effective_from: YESTERDAY,
    effective_to: null,
    ...over,
  };
}

const UNITS: readonly UnitRow[] = [
  { code: 'kg', dimension: 'mass', factor_to_base: '1000.000000', display_order: 1 },
  { code: '250g', dimension: 'mass', factor_to_base: '250.000000', display_order: 2 },
  { code: 'pza', dimension: 'count', factor_to_base: '1.000000', display_order: 3 },
];
const FACTORS = unitFactorsFrom(UNITS);

function variant(over: Partial<VariantRow> = {}): VariantRow {
  return {
    id: VARIANT,
    name: 'Pechuga',
    family_id: 'f-1',
    price_unit_code: 'kg',
    is_active: true,
    product_family: { id: 'f-1', name: 'Pollo' },
    price_list: [{ price_per_base: '0.035000', location_id: null }],
    ...over,
  } as VariantRow;
}

const EDIT: VariantEdit = { name: 'Pechuga', taxPercent: '', packSize: '' };

// ----------------------------------------------------------------------------
describe('the columns, spelled once (R13)', () => {
  it('asks for the two columns the catalog read does not carry', () => {
    expect(PRICE_EDIT_COLUMNS.split(',')).toEqual([
      'id',
      'price_per_base::text',
      'location_id',
      'effective_from',
      'effective_to',
    ]);
  });

  it('patches three separate bodies on product_variant, never one', () => {
    expect(VARIANT_TABLE).toBe('product_variant');
    expect(NAME_PATCH_COLUMNS).toBe('name');
    expect(SETTINGS_PATCH_COLUMNS).toBe('tax_rate,pack_size');
    expect(ACTIVE_PATCH_COLUMNS).toBe('is_active');
  });

  it('never names enforce_stock — C8.8, and a column absent cannot be drawn', () => {
    const every = [
      NAME_PATCH_COLUMNS,
      SETTINGS_PATCH_COLUMNS,
      ACTIVE_PATCH_COLUMNS,
      PRICE_CLOSE_COLUMNS,
      PRICE_REPRICE_COLUMNS,
      PRICE_INSERT_COLUMNS,
      PRICE_EDIT_COLUMNS,
    ].join(',');
    expect(every).not.toContain('enforce_stock');
  });

  it('asks a patch back for its id and never a star (R13)', () => {
    expect(UPDATE_RETURNING).toBe('id');
    expect(PRICE_EDIT_TABLE).toBe('price_list');
  });
});

// ----------------------------------------------------------------------------
describe('the dated window — the three branches', () => {
  it('opens a first price for a product that had none, shop-wide', () => {
    const plan = priceChange(WORKSPACE, VARIANT, [], null, TODAY, '0.040000');
    expect(plan.kind).toBe('open');
    if (plan.kind !== 'open') throw new Error('branch');
    expect(plan.open).toEqual({
      workspace_id: WORKSPACE,
      variant_id: VARIANT,
      location_id: null,
      price_per_base: '0.040000',
      effective_from: TODAY,
      effective_to: null,
    });
  });

  it('closes yesterday at today and opens a new row — the ordinary change', () => {
    const plan = priceChange(WORKSPACE, VARIANT, [row()], null, TODAY, '0.040000');
    expect(plan.kind).toBe('closeAndOpen');
    if (plan.kind !== 'closeAndOpen') throw new Error('branch');
    expect(plan.closeRowId).toBe('p-1');
    expect(plan.closePatch).toEqual({ effective_to: TODAY });
    expect(plan.open.effective_from).toBe(TODAY);
    expect(plan.open.effective_to).toBeNull();
  });

  it('⚠️ updates in place when the row in force STARTED TODAY', () => {
    // `price_list_range_ordered` is `effective_to > effective_from`, so closing a
    // row that began today is a zero-length range and Postgres refuses it. This
    // is the second correction of one morning — the branch a screen would never
    // think to write, and the one a shopkeeper reaches while watching.
    const plan = priceChange(
      WORKSPACE,
      VARIANT,
      [row({ effective_from: TODAY })],
      null,
      TODAY,
      '0.040000',
    );
    expect(plan.kind).toBe('reprice');
    if (plan.kind !== 'reprice') throw new Error('branch');
    expect(plan.rowId).toBe('p-1');
    expect(plan.patch).toEqual({ price_per_base: '0.040000' });
  });

  it('⚠️ never closes and re-opens an identical price', () => {
    const plan = priceChange(WORKSPACE, VARIANT, [row()], null, TODAY, '0.035000');
    expect(plan.kind).toBe('unchanged');
  });

  it('⚠️ inherits the scope of the row it is replacing, and never invents one', () => {
    const plan = priceChange(
      WORKSPACE,
      VARIANT,
      [row({ location_id: STORE, id: 'p-store' })],
      STORE,
      TODAY,
      '0.040000',
    );
    if (plan.kind !== 'closeAndOpen') throw new Error('branch');
    expect(plan.closeRowId).toBe('p-store');
    expect(plan.open.location_id).toBe(STORE);
  });

  it("⚠️ edits the store's own row when standing in that store, not the shop-wide one", () => {
    const rows = [row({ id: 'p-shop' }), row({ id: 'p-store', location_id: STORE })];
    const plan = priceChange(WORKSPACE, VARIANT, rows, STORE, TODAY, '0.040000');
    if (plan.kind !== 'closeAndOpen') throw new Error('branch');
    expect(plan.closeRowId).toBe('p-store');
  });

  it('falls back to the shop-wide row when this store has none of its own', () => {
    const plan = priceChange(WORKSPACE, VARIANT, [row({ id: 'p-shop' })], STORE, TODAY, '0.040000');
    if (plan.kind !== 'closeAndOpen') throw new Error('branch');
    expect(plan.closeRowId).toBe('p-shop');
    expect(plan.open.location_id).toBeNull();
  });

  it('treats a missing read as no price rather than throwing', () => {
    expect(priceChange(WORKSPACE, VARIANT, undefined, null, TODAY, '0.040000').kind).toBe('open');
    expect(priceChange(WORKSPACE, VARIANT, null, null, TODAY, '0.040000').kind).toBe('open');
  });

  it('opens with PRICE_INSERT_COLUMNS and nothing else', () => {
    const plan = priceChange(WORKSPACE, VARIANT, [], null, TODAY, '0.040000');
    if (plan.kind !== 'open') throw new Error('branch');
    expect(Object.keys(plan.open).sort()).toEqual(PRICE_INSERT_COLUMNS.split(',').sort());
  });
});

// ----------------------------------------------------------------------------
describe('the half-done change — the partial state this app has never had', () => {
  it('⚠️ re-opens rather than re-closing after a close that landed', () => {
    const plan = priceChange(WORKSPACE, VARIANT, [row()], null, TODAY, '0.040000');
    const failed: PriceChangeFailed = { ok: false, failed: 'open', closed: true, error: null };
    const again = retryChange(plan, failed);
    expect(again.kind).toBe('open');
    if (again.kind !== 'open') throw new Error('branch');
    if (plan.kind !== 'closeAndOpen') throw new Error('branch');
    expect(again.open).toEqual(plan.open);
  });

  it('retries the whole plan when the close itself failed — nothing landed', () => {
    const plan = priceChange(WORKSPACE, VARIANT, [row()], null, TODAY, '0.040000');
    const failed: PriceChangeFailed = { ok: false, failed: 'close', closed: false, error: null };
    expect(retryChange(plan, failed)).toEqual(plan);
  });

  it('retries a reprice as itself — one call either happened or did not', () => {
    const plan = priceChange(
      WORKSPACE,
      VARIANT,
      [row({ effective_from: TODAY })],
      null,
      TODAY,
      '0.040000',
    );
    const failed: PriceChangeFailed = { ok: false, failed: 'reprice', closed: false, error: null };
    expect(retryChange(plan, failed)).toEqual(plan);
  });

  it('⚠️ says the price is GONE, not that nothing was saved', () => {
    const failed: PriceChangeFailed = { ok: false, failed: 'open', closed: true, error: null };
    expect(priceChangeLine(failed)).toBe(ES.catalog.errors.priceGone);
    expect(priceChangeLine(failed)).not.toBe(ES.catalog.errors.rejected);
  });

  it('gives an ordinary refusal its ordinary sentence when nothing was closed', () => {
    const failed: PriceChangeFailed = {
      ok: false,
      failed: 'close',
      closed: false,
      error: { code: '42501' },
    };
    expect(priceChangeLine(failed)).toBe(ES.catalog.errors.notAllowedEdit);
  });
});

// ----------------------------------------------------------------------------
describe('the two figures set once and never guessed', () => {
  it('⚠️ takes a PERCENTAGE and writes a RATE — 16 becomes 0.1600', () => {
    expect(parseTaxRate('16')).toBe('0.1600');
    expect(parseTaxRate('0')).toBe('0.0000');
    expect(parseTaxRate('8.5')).toBe('0.0850');
    expect(parseTaxRate('16.25')).toBe('0.1625');
  });

  it('reads the percent sign and the spaces off first', () => {
    expect(parseTaxRate(' 16 % ')).toBe('0.1600');
  });

  it('⚠️ refuses 100 and above — product_variant_tax_rate_sane is tax_rate < 1', () => {
    expect(parseTaxRate('100')).toBeNull();
    expect(parseTaxRate('150')).toBeNull();
  });

  it('refuses a negative, an exponent, and more precision than the column holds', () => {
    expect(parseTaxRate('-1')).toBeNull();
    expect(parseTaxRate('1e2')).toBeNull();
    expect(parseTaxRate('16.255')).toBeNull();
    expect(parseTaxRate('gratis')).toBeNull();
  });

  it('⚠️ answers null for an EMPTY box, which means leave it alone', () => {
    expect(parseTaxRate('')).toBeNull();
    expect(parseTaxRate('   ')).toBeNull();
    expect(parsePackSize('')).toBeNull();
  });

  it('writes a pack size at the scale the column holds', () => {
    expect(parsePackSize('24')).toBe('24.000');
    expect(parsePackSize('1.5')).toBe('1.500');
    expect(parsePackSize('1,000')).toBe('1000.000');
  });

  it('⚠️ refuses zero as well as a negative — a case of nothing is not a case', () => {
    expect(parsePackSize('0')).toBeNull();
    expect(parsePackSize('-4')).toBeNull();
    expect(parsePackSize('0.0001')).toBeNull();
  });

  it('⚠️ sends only the boxes that were filled in', () => {
    expect(variantSettings(EDIT)).toBeNull();
    expect(variantSettings({ ...EDIT, taxPercent: '16' })).toEqual({ tax_rate: '0.1600' });
    expect(variantSettings({ ...EDIT, packSize: '24' })).toEqual({ pack_size: '24.000' });
    expect(variantSettings({ ...EDIT, taxPercent: '16', packSize: '24' })).toEqual({
      tax_rate: '0.1600',
      pack_size: '24.000',
    });
  });

  it('sends only the columns SETTINGS_PATCH_COLUMNS names', () => {
    const patch = variantSettings({ ...EDIT, taxPercent: '16', packSize: '24' });
    expect(Object.keys(patch ?? {}).sort()).toEqual(SETTINGS_PATCH_COLUMNS.split(',').sort());
  });
});

// ----------------------------------------------------------------------------
describe('the rename', () => {
  it('folds the name the way normalize_name will', () => {
    expect(namePatch('Pechuga', '  Pechuga   sin  hueso ')).toEqual({ name: 'Pechuga sin hueso' });
  });

  it('⚠️ is not a rename when only the whitespace moved', () => {
    expect(namePatch('Pechuga', ' Pechuga ')).toBeNull();
    expect(namePatch('Pechuga sin hueso', 'Pechuga  sin  hueso')).toBeNull();
  });

  it('answers null for an empty box rather than an empty patch', () => {
    expect(namePatch('Pechuga', '   ')).toBeNull();
  });

  it('sends only the column NAME_PATCH_COLUMNS names', () => {
    expect(Object.keys(namePatch('Pechuga', 'Pierna') ?? {})).toEqual(
      NAME_PATCH_COLUMNS.split(','),
    );
  });
});

// ----------------------------------------------------------------------------
describe('retiring a product', () => {
  it('is is_active and never a delete', () => {
    expect(activePatch(false)).toEqual({ is_active: false });
    expect(activePatch(true)).toEqual({ is_active: true });
    expect(Object.keys(activePatch(false))).toEqual(ACTIVE_PATCH_COLUMNS.split(','));
  });
});

// ----------------------------------------------------------------------------
describe('what the form must not send', () => {
  const entries = catalogFrom([variant(), variant({ id: 'v-2', name: 'Pierna' })], FACTORS, null);

  it('refuses a name that is only spaces', () => {
    expect(checkEdit(VARIANT, { ...EDIT, name: '  ' }, '', entries, FACTORS, 'kg')).toBe(
      'nameMissing',
    );
  });

  it('⚠️ does NOT call the product being edited a duplicate of itself', () => {
    expect(checkEdit(VARIANT, EDIT, '', entries, FACTORS, 'kg')).toBeNull();
    expect(checkEdit(VARIANT, { ...EDIT, name: 'PECHUGA' }, '', entries, FACTORS, 'kg')).toBeNull();
  });

  it('refuses a name another product in the shop already holds', () => {
    expect(checkEdit(VARIANT, { ...EDIT, name: 'Pierna' }, '', entries, FACTORS, 'kg')).toBe(
      'duplicate',
    );
  });

  it('⚠️ folds case and spaces and NOT accents, exactly as normalize_name does', () => {
    const accented = catalogFrom([variant({ id: 'v-3', name: 'Platano' })], FACTORS, null);
    expect(checkEdit(VARIANT, { ...EDIT, name: 'Plátano' }, '', accented, FACTORS, 'kg')).toBeNull();
    expect(checkEdit(VARIANT, { ...EDIT, name: ' platano ' }, '', accented, FACTORS, 'kg')).toBe(
      'duplicate',
    );
  });

  it('names the box that is unreadable, in the form’s reading order', () => {
    expect(checkEdit(VARIANT, { ...EDIT, taxPercent: '200' }, '', entries, FACTORS, 'kg')).toBe(
      'taxUnreadable',
    );
    expect(checkEdit(VARIANT, { ...EDIT, packSize: '0' }, '', entries, FACTORS, 'kg')).toBe(
      'packUnreadable',
    );
    expect(checkEdit(VARIANT, EDIT, 'gratis', entries, FACTORS, 'kg')).toBe('priceUnreadable');
  });

  it('⚠️ lets an empty price box through — it is not an instruction to un-price', () => {
    expect(checkEdit(VARIANT, EDIT, '', entries, FACTORS, 'kg')).toBeNull();
    expect(editPricePerBase('', FACTORS.kg)).toBeNull();
  });

  it('refuses a price it cannot convert because the unit read has not landed', () => {
    expect(checkEdit(VARIANT, EDIT, '35.00', entries, {}, 'kg')).toBe('priceUnreadable');
  });

  it('every issue key is a sentence and not a code', () => {
    for (const sentence of Object.values(ES.catalog.editIssues)) {
      expect(sentence).toMatch(/[a-záéíóúñ]/);
      expect(sentence).not.toMatch(/^[0-9A-Z_]+$/);
    }
  });
});

// ----------------------------------------------------------------------------
describe('the price the edit writes is the price the catalog reads back', () => {
  it('⚠️ is catalogWrite’s own inverse and not a second one', () => {
    expect(editPricePerBase('35.00', FACTORS.kg)).toBe(pricePerBase(3500, FACTORS.kg));
  });

  it('round-trips through priceCentavos for every seeded unit', () => {
    for (const unit of UNITS) {
      const perBase = editPricePerBase('35.00', FACTORS[unit.code]);
      expect(perBase).not.toBeNull();
      expect(priceCentavos(perBase as string, FACTORS[unit.code])).toBe(3500);
    }
  });

  it('refuses a figure with more decimals than the money column holds', () => {
    expect(editPricePerBase('35.005', FACTORS.kg)).toBeNull();
  });
});

// ----------------------------------------------------------------------------
describe('the refusals a shopkeeper can actually reach', () => {
  it('⚠️ 42501 says CHANGE and not ADD — the verb is the whole point', () => {
    expect(catalogEditErrorMessage({ code: '42501' })).toBe(ES.catalog.errors.notAllowedEdit);
    expect(catalogEditErrorMessage({ code: '42501' })).not.toBe(ES.catalog.errors.notAllowed);
  });

  it('⚠️ 42501 is never the sign-in loop', () => {
    expect(catalogEditErrorMessage({ code: '42501' })).not.toBe(ES.api.errors.sessionEnded);
  });

  it('⚠️⚠️ a zero-row UPDATE is the fence, not a mystery — measured 2026-09-23', () => {
    // A `using` clause does not refuse an UPDATE, it hides the row: PostgREST
    // answers 200 and `[]`, and `.single()` turns that into a 406 `PGRST116`.
    // Without this mapping a cashier is told *"algo salió mal"* about a rename
    // that was refused, or — with no `.single()` at all — told it worked.
    expect(catalogEditErrorMessage({ code: 'PGRST116' })).toBe(ES.catalog.errors.notAllowedEdit);
    expect(catalogEditErrorMessage({ code: 'PGRST116' })).not.toBe(ES.api.errors.unknown);
  });

  it('⚠️ 23P01 sends her back to the product, not to the price box', () => {
    expect(catalogEditErrorMessage({ code: '23P01' })).toBe(ES.catalog.errors.overlap);
  });

  it('names the constraint a duplicate came from', () => {
    expect(
      catalogEditErrorMessage({
        code: '23505',
        message: 'duplicate key value violates unique constraint "product_variant_name_unique"',
      }),
    ).toBe(ES.catalog.errors.duplicate);
  });

  it('⚠️ 23514 is the honest catch-all and never the shop-name sentence', () => {
    const said = catalogEditErrorMessage({ code: '23514' });
    expect(said).toBe(ES.catalog.errors.rejected);
    expect(said).not.toBe(ES.api.errors.nameMissing);
  });

  it('everything else keeps the one sentence this app gives for a lost link', () => {
    expect(catalogEditErrorMessage({ message: 'Network request failed' })).toBe(
      ES.api.errors.offline,
    );
  });
});

// ----------------------------------------------------------------------------
// `5e-iii-b` — THE FORM'S HALF THAT IS STILL NOT RENDERING.
//
// ⚠️⚠️ `5e-iii-b`'s ROW SAID EVERY JUDGEMENT LEFT IN IT WAS RENDERING, AND THAT
// WAS THE ONE THING THE SIZING GOT WRONG. `Editar` is FOUR writes behind one
// button across two tables with no transaction between them; *which goes first*,
// *what a failure leaves* and *what an untouched box means* are questions with
// right answers, and this block is where they are read.
// ----------------------------------------------------------------------------

const SUBJECT: EditSubject = {
  workspaceId: WORKSPACE,
  variantId: VARIANT,
  name: 'Pechuga',
  priceUnit: 'kg',
  locationId: null,
  factors: FACTORS,
  today: TODAY,
};

describe('the two figures shown beside the boxes that change them', () => {
  it('⚠️⚠️ renders the RATE back as the PERCENTAGE a shopkeeper knows', () => {
    // `0002`: "IVA as a rate, not a percentage: 0.1600, not 16." A screen that
    // printed the column would be telling him his IVA is sixteen hundredths of
    // a percent, on the one figure that is a sixteen-fold error in the ledger.
    expect(taxPercentOf('0.1600')).toBe('16');
    expect(taxPercentOf('0.0000')).toBe('0');
    expect(taxPercentOf('0.0825')).toBe('8.25');
  });

  it('⚠️ it is exactly the inverse of `parseTaxRate`, both ways', () => {
    for (const typed of ['0', '8', '16', '16.5', '8.25', '99.99']) {
      expect(taxPercentOf(parseTaxRate(typed) as string)).toBe(typed);
    }
  });

  it('renders the pack size without the column\'s trailing zeros', () => {
    expect(packSizeOf('24.000')).toBe('24');
    expect(packSizeOf('1.000')).toBe('1');
    expect(packSizeOf('0.500')).toBe('0.5');
  });

  it('⚠️ the point goes with its zeros — `24.000` is `24` and never `24.`', () => {
    // Trimming the zeros and leaving the point is the shape this would take if
    // it were written in one `replace`, and it is the one a screen would render.
    expect(packSizeOf('24.000')).not.toContain('.');
    expect(taxPercentOf('0.1000')).toBe('10');
    expect(packSizeOf('100.000')).toBe('100');
  });

  it('⚠️ a figure the column could not have held draws nothing at all', () => {
    // Ours to notice, not his ([[users-dont-do-bookkeeping]]): a label with
    // nothing after it reads as a figure that failed to load.
    expect(taxPercentOf('')).toBe('');
    expect(packSizeOf('not a number')).toBe('');
  });

  it('the read asks for both columns as text, and never for enforce_stock', () => {
    expect(VARIANT_EDIT_COLUMNS.split(',')).toEqual(['id', 'tax_rate::text', 'pack_size::text']);
    expect(VARIANT_EDIT_COLUMNS).not.toContain('enforce_stock');
  });
});

describe('what one tap of Guardar owes', () => {
  it('⚠️⚠️ a form nobody touched makes NO round trip at all', () => {
    // He opened `Editar`, read it, and tapped Guardar. Closing and re-opening an
    // identical price row would write a change into the shop's price history
    // that never happened — and the pilot store loses its link half the day.
    const plan = editPlan(SUBJECT, EDIT, '', [row()]);
    expect(plan.name).toBeNull();
    expect(plan.settings).toBeNull();
    expect(plan.price.kind).toBe('unchanged');
    expect(editTouches(plan)).toBe(false);
  });

  it('⚠️ an EMPTY price box leaves the price alone — it does not remove it', () => {
    // `price_list_delete` exists in `0002` and is deliberately unreachable from
    // this app: *no price* and *price withdrawn today* are different facts.
    const plan = editPlan(SUBJECT, { ...EDIT, name: 'Pechuga entera' }, '', [row()]);
    expect(plan.name).toEqual({ name: 'Pechuga entera' });
    expect(plan.price.kind).toBe('unchanged');
  });

  it('⚠️ an untouched IVA box sends no column, even when the name changed', () => {
    const plan = editPlan(SUBJECT, { ...EDIT, name: 'Pechuga entera' }, '', [row()]);
    expect(plan.settings).toBeNull();
  });

  it('carries the price through `priceChange` rather than deciding again', () => {
    const plan = editPlan(SUBJECT, EDIT, '40.00', [row()]);
    expect(plan.price.kind).toBe('closeAndOpen');
    expect(editTouches(plan)).toBe(true);
  });

  it('⚠️ the same-day branch survives the trip through `editPlan`', () => {
    const plan = editPlan(SUBJECT, EDIT, '40.00', [row({ effective_from: TODAY })]);
    expect(plan.price.kind).toBe('reprice');
  });

  it('⚠️ an unpriced product is the `open` branch and is priced SHOP-WIDE', () => {
    const plan = editPlan(SUBJECT, EDIT, '40.00', []);
    expect(plan.price.kind).toBe('open');
    if (plan.price.kind === 'open') expect(plan.price.open.location_id).toBeNull();
  });

  it('⚠️⚠️ the scope of a change is the one the read RESOLVED, never the phone\'s', () => {
    // A phone standing in a store, correcting a price the shop set for every
    // store. `5e-i`'s decision A: nothing here ever creates a store-scoped price
    // for a shop that did not have one — that would be this app answering a
    // question C8.9 never asked, and the shop's other store would keep the old
    // figure with nothing on screen saying which store the new one was for.
    const shopWide = editPlan({ ...SUBJECT, locationId: STORE }, EDIT, '40.00', [row()]);
    if (shopWide.price.kind === 'closeAndOpen') {
      expect(shopWide.price.open.location_id).toBeNull();
    } else {
      throw new Error(`expected closeAndOpen, got ${shopWide.price.kind}`);
    }

    // And a store that DOES price itself keeps its own scope.
    const ownPrice = editPlan({ ...SUBJECT, locationId: STORE }, EDIT, '40.00', [
      row({ location_id: STORE }),
    ]);
    if (ownPrice.price.kind === 'closeAndOpen') {
      expect(ownPrice.price.open.location_id).toBe(STORE);
    } else {
      throw new Error(`expected closeAndOpen, got ${ownPrice.price.kind}`);
    }
  });

  it('⚠️ the peso figure is divided by the PRICE unit and not by the base one', () => {
    // `$45 / 250g` is `0.18` per gram. A plan that divided by the base unit
    // would price the shop at a quarter of what it charges.
    const plan = editPlan({ ...SUBJECT, priceUnit: '250g' }, EDIT, '45.00', []);
    if (plan.price.kind === 'open') {
      expect(plan.price.open.price_per_base).toBe(pricePerBase(4500, '250.000000'));
    } else {
      throw new Error(`expected open, got ${plan.price.kind}`);
    }
  });
});

describe('the order the four writes go in', () => {
  it('⚠️⚠️ the name goes FIRST, because it is the one that can be refused 23505', () => {
    // `product_variant_name_unique` is shop-wide. Stopping there leaves the IVA
    // and the pack size as they were; the other way round a shopkeeper whose
    // rename was refused has had his tax rate changed under a name he is about
    // to abandon.
    expect(EDIT_ORDER[0]).toBe('name');
  });

  it('⚠️⚠️ the price goes LAST, because it is the only step that can half-happen', () => {
    // `changePrice` closes before it opens, so the worst state this app can
    // reach is also the last thing it can reach — with nothing written after it.
    expect(EDIT_ORDER[EDIT_ORDER.length - 1]).toBe('price');
  });

  it('every step of a plan is in the order, and the order invents none', () => {
    expect([...EDIT_ORDER].sort()).toEqual(['name', 'price', 'settings']);
  });
});

describe('what a failed save says', () => {
  it('⚠️ a refused rename is the edit sentence and not the create one', () => {
    const said = editLine({ ok: false, failed: 'name', error: { code: '42501' } } as EditFailed);
    expect(said).toBe(ES.catalog.errors.notAllowedEdit);
    expect(said).not.toBe(ES.catalog.errors.notAllowed);
  });

  it('⚠️⚠️ a failure AFTER the close says the price is GONE, not that nothing happened', () => {
    const failed: PriceChangeFailed = {
      ok: false,
      failed: 'open',
      closed: true,
      error: { message: 'Network request failed' },
    };
    expect(editLine({ ok: false, failed: 'price', price: failed })).toBe(
      ES.catalog.errors.priceGone,
    );
  });

  it('a price failure with nothing landed keeps the ordinary sentence', () => {
    const failed: PriceChangeFailed = {
      ok: false,
      failed: 'close',
      closed: false,
      error: { message: 'Network request failed' },
    };
    expect(editLine({ ok: false, failed: 'price', price: failed })).toBe(ES.api.errors.offline);
  });
});

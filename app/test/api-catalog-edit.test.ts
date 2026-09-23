import { describe, expect, it } from 'vitest';

import {
  ACTIVE_PATCH_COLUMNS,
  NAME_PATCH_COLUMNS,
  PRICE_CLOSE_COLUMNS,
  PRICE_EDIT_COLUMNS,
  PRICE_EDIT_TABLE,
  PRICE_INSERT_COLUMNS,
  PRICE_REPRICE_COLUMNS,
  SETTINGS_PATCH_COLUMNS,
  UPDATE_RETURNING,
  VARIANT_TABLE,
  activePatch,
  catalogEditErrorMessage,
  checkEdit,
  editPricePerBase,
  namePatch,
  parsePackSize,
  parseTaxRate,
  priceChange,
  priceChangeLine,
  retryChange,
  variantSettings,
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

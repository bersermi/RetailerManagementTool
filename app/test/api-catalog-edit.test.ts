import { describe, expect, it } from 'vitest';

import {
  ACTIVE_PATCH_COLUMNS,
  EDIT_ORDER,
  NAME_PATCH_COLUMNS,
  SETTINGS_PATCH_COLUMNS,
  UPDATE_RETURNING,
  VARIANT_EDIT_COLUMNS,
  VARIANT_TABLE,
  activePatch,
  canRetireProduct,
  catalogEditErrorMessage,
  checkEdit,
  editLine,
  editPlan,
  editTouches,
  namePatch,
  packSizeOf,
  parsePackSize,
  parseTaxRate,
  taxPercentOf,
  variantSettings,
  type EditFailed,
  type VariantEdit,
  type VariantSettingsRow,
} from '@/api/catalogEdit';
import { catalogFrom, unitFactorsFrom, type UnitRow, type VariantRow } from '@/api/catalog';
import { ES } from '@/strings';

// ============================================================================
// `5e-iii-a` — THE EDIT AS A CONTRACT WITH POSTGRES.
//
// ⚠️ WHAT THIS SUITE CAN AND CANNOT SAY. It reads `app/src/api/catalogEdit.ts`
// and nothing else; not one assertion here has read `0002`. The names, the
// fences and the round trip are `docs/checks/5e-iii-a-catalog-edit-contract.sh`,
// which drives a real PostgREST. What is here is the half with a right answer a
// node process can compute: the two figures, the rename, and which sentence a
// refusal becomes. ⚠️ The price left this module at `8i` — its suite is
// `app/test/api-shelf-price.test.ts`.
// ============================================================================

const VARIANT = 'v-1';

const UNITS: readonly UnitRow[] = [
  { code: 'kg', dimension: 'mass', base_code: 'g', factor_to_base: '1000.000000', display_order: 1 },
  { code: '250g', dimension: 'mass', base_code: 'g', factor_to_base: '250.000000', display_order: 2 },
  { code: 'pza', dimension: 'count', base_code: 'pza', factor_to_base: '1.000000', display_order: 3 },
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
    ].join(',');
    expect(every).not.toContain('enforce_stock');
  });

  it('asks a patch back for its id and never a star (R13)', () => {
    expect(UPDATE_RETURNING).toBe('id');
  });
});

// ----------------------------------------------------------------------------
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
    expect(checkEdit(VARIANT, { ...EDIT, name: '  ' }, entries)).toBe(
      'nameMissing',
    );
  });

  it('⚠️ does NOT call the product being edited a duplicate of itself', () => {
    expect(checkEdit(VARIANT, EDIT, entries)).toBeNull();
    expect(checkEdit(VARIANT, { ...EDIT, name: 'PECHUGA' }, entries)).toBeNull();
  });

  it('refuses a name another product in the shop already holds', () => {
    expect(checkEdit(VARIANT, { ...EDIT, name: 'Pierna' }, entries)).toBe(
      'duplicate',
    );
  });

  it('⚠️ folds case and spaces and NOT accents, exactly as normalize_name does', () => {
    const accented = catalogFrom([variant({ id: 'v-3', name: 'Platano' })], FACTORS, null);
    expect(checkEdit(VARIANT, { ...EDIT, name: 'Plátano' }, accented)).toBeNull();
    expect(checkEdit(VARIANT, { ...EDIT, name: ' platano ' }, accented)).toBe(
      'duplicate',
    );
  });

  it('names the box that is unreadable, in the form’s reading order', () => {
    expect(checkEdit(VARIANT, { ...EDIT, taxPercent: '200' }, entries)).toBe(
      'taxUnreadable',
    );
    expect(checkEdit(VARIANT, { ...EDIT, packSize: '0' }, entries)).toBe(
      'packUnreadable',
    );
  });

  it('every issue key is a sentence and not a code', () => {
    for (const sentence of Object.values(ES.catalog.editIssues)) {
      expect(sentence).toMatch(/[a-záéíóúñ]/);
      expect(sentence).not.toMatch(/^[0-9A-Z_]+$/);
    }
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
// WAS THE ONE THING THE SIZING GOT WRONG. `Editar` is more than one write behind
// one button with no transaction between them; *which goes first*,
// *what a failure leaves* and *what an untouched box means* are questions with
// right answers, and this block is where they are read.
// ----------------------------------------------------------------------------


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

  it('the read asks for both FIGURES as text, the marker as a boolean, and never for enforce_stock', () => {
    // ⚠️⚠️ WIDENED BY `6c`, 2026-09-27 — AND IT WAS RIGHT WHEN IT WAS WRITTEN.
    // `is_prebuilt` is the third column and it decides whether the retire control
    // is drawn at all. The assertion is kept as an exact ordered list rather than
    // relaxed to `toContain`, because that is what makes a column added by accident
    // a red rather than a shrug.
    expect(VARIANT_EDIT_COLUMNS.split(',')).toEqual([
      'id',
      'tax_rate::text',
      'pack_size::text',
      'is_prebuilt',
    ]);
    expect(VARIANT_EDIT_COLUMNS).not.toContain('enforce_stock');
  });

  it('⚠️⚠️ the marker is NOT cast to text, because the string `false` is truthy', () => {
    // The two figures are `::text` because `numeric` arrives as a JSON double and
    // `parseDecimal` refuses one outright. A boolean has no such problem, and a
    // cast one would reach `canRetireProduct` as `'false'` — which passes `!settings
    // .is_prebuilt` as FALSE and hides the control on every product the shop made.
    expect(VARIANT_EDIT_COLUMNS).toContain('is_prebuilt');
    expect(VARIANT_EDIT_COLUMNS).not.toContain('is_prebuilt::text');
  });
});

// ============================================================================
// WHOSE PRODUCT IS IT — `6c`, and the control that was drawn on nothing for four days
// ============================================================================
describe('may this product be retired', () => {
  const his: VariantSettingsRow = {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    tax_rate: '0.0000',
    pack_size: '1.000',
    is_prebuilt: false,
  };
  const ours: VariantSettingsRow = { ...his, is_prebuilt: true };

  it('a product the shop created can be retired', () => {
    expect(canRetireProduct(his, true)).toBe(true);
  });

  it('⚠️⚠️ since `0054` a product that came with the app can be retired too', () => {
    // The owner's rule of 2026-09-23 (*"the user can only Retirar or Eliminar things
    // he created"*) gave way on 2026-10-14, when onboarding stopped offering a
    // per-product list: a shop removes what it does not sell afterwards, from here.
    expect(canRetireProduct(ours, true)).toBe(true);
  });

  it('⚠️ a read that has not landed draws nothing, rather than guessing', () => {
    // `null` is *the one-variant settings read is still out*. Drawing on a guess is
    // how the defect above happened, and an optimistic default would reproduce it
    // for exactly as long as the read takes.
    expect(canRetireProduct(null, true)).toBe(false);
  });

  it('⚠️⚠️ the two reasons are kept apart: not allowed, and not yours', () => {
    // Folding them into one boolean would make *you may not write the catalog* and
    // *this row is not yours* indistinguishable — and they need different sentences,
    // which is why `catalogEditErrorMessage` maps `23001` away from `notAllowedEdit`.
    expect(canRetireProduct(his, false)).toBe(false);
    expect(canRetireProduct(ours, false)).toBe(false);
  });

  it('⚠️ the marker is never consulted for anything but the retire control', () => {
    // A prebuilt product must stay renameable and repriceable — that is `0042`'s
    // Finding 1, and a policy predicate on `is_prebuilt` would have broken it. So
    // nothing that builds a WRITE may read the marker.
    expect(namePatch('Jitomate', 'Jitomate bola')).toEqual({ name: 'Jitomate bola' });
    expect(
      variantSettings({ name: 'Jitomate', taxPercent: '16', packSize: '' }),
    ).toEqual({ tax_rate: '0.1600' });
    expect(Object.keys(activePatch(false))).not.toContain('is_prebuilt');
  });
});

// ============================================================================
// `23001` — `0042`'s FENCE, ARRIVING AS AN HTTP 400
// ============================================================================
describe('a refusal that means the row is not yours', () => {
  it('⚠️⚠️ `23001` gets its own sentence and not the permission one', () => {
    // Measured over a real PostgREST on 2026-09-27:
    //   400 {"code":"23001","message":"a prebuilt product_variant cannot be retired: …"}
    // NOT a 403 and NOT a 409 ([[custom-sqlstate-arrives-as-400]]). The sentence must
    // not be `notAllowedEdit`, because the same manager MAY rename and reprice this
    // product — saying *only an owner or a manager can change a product* would be
    // false about the person and about the row at once.
    expect(catalogEditErrorMessage({ code: '23001', message: 'a prebuilt product_variant cannot be retired: Jitomate' }))
      .toBe(ES.catalog.errors.notYours);
    expect(catalogEditErrorMessage({ code: '23001' })).not.toBe(ES.catalog.errors.notAllowedEdit);
  });

  it('⚠️ and it never says `prebuilt`, `is_prebuilt` or anything about a catalog we maintain', () => {
    // Where a row came from is ours to know ([[users-dont-do-bookkeeping]]).
    const said = ES.catalog.errors.notYours;
    for (const internal of ['prebuilt', 'is_prebuilt', 'catálogo que', '23001', 'product_variant']) {
      expect(said).not.toContain(internal);
    }
  });

  it('⚠️ it says what he CAN still do, which is the half that stops it reading as a refusal of him', () => {
    expect(ES.catalog.errors.notYours).toContain('nombre');
    expect(ES.catalog.errors.notYours).toContain('precio');
  });

  it('the other refusals on this path are untouched', () => {
    expect(catalogEditErrorMessage({ code: '42501' })).toBe(ES.catalog.errors.notAllowedEdit);
    expect(catalogEditErrorMessage({ code: 'PGRST116' })).toBe(ES.catalog.errors.notAllowedEdit);
  });
});

describe('what one tap of Guardar owes', () => {
  it('⚠️⚠️ a form nobody touched makes NO round trip at all', () => {
    // He opened `Editar`, read it, and tapped Guardar — on a link the pilot
    // store loses half the day.
    const plan = editPlan('Pechuga', EDIT);
    expect(plan.name).toBeNull();
    expect(plan.settings).toBeNull();
    expect(editTouches(plan)).toBe(false);
  });

  it('a rename is the one write it owes', () => {
    const plan = editPlan('Pechuga', { ...EDIT, name: 'Pechuga entera' });
    expect(plan.name).toEqual({ name: 'Pechuga entera' });
    expect(editTouches(plan)).toBe(true);
  });

  it('⚠️ an untouched IVA box sends no column, even when the name changed', () => {
    const plan = editPlan('Pechuga', { ...EDIT, name: 'Pechuga entera' });
    expect(plan.settings).toBeNull();
  });

  it('⚠️ there is no price in it since `8i` — the price sheet queues its own', () => {
    expect(Object.keys(editPlan('Pechuga', EDIT)).sort()).toEqual(['name', 'settings']);
  });
});

describe('the order the writes go in', () => {
  it('⚠️⚠️ the name goes FIRST, because it is the one that can be refused 23505', () => {
    // `product_variant_name_unique` is shop-wide. Stopping there leaves the IVA
    // and the pack size as they were; the other way round a shopkeeper whose
    // rename was refused has had his tax rate changed under a name he is about
    // to abandon.
    expect(EDIT_ORDER[0]).toBe('name');
  });

  it('every step of a plan is in the order, and the order invents none', () => {
    expect([...EDIT_ORDER].sort()).toEqual(['name', 'settings']);
  });
});

describe('what a failed save says', () => {
  it('⚠️ a refused rename is the edit sentence and not the create one', () => {
    const said = editLine({ ok: false, failed: 'name', error: { code: '42501' } } as EditFailed);
    expect(said).toBe(ES.catalog.errors.notAllowedEdit);
    expect(said).not.toBe(ES.catalog.errors.notAllowed);
  });

  it('a lost link keeps the one sentence this app gives for it', () => {
    const said = editLine({ ok: false, failed: 'settings', error: { message: 'Network request failed' } });
    expect(said).toBe(ES.api.errors.offline);
  });
});

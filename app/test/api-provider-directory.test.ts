import { describe, expect, it } from 'vitest';

import {
  ACTIVE_PATCH_COLUMNS,
  CONTACT_PATCH_COLUMNS,
  DETAIL_COLUMNS,
  DETAIL_ID_COLUMN,
  DIRECTORY_TABLE,
  EMPTY_DRAFT,
  INSERT_COLUMNS,
  NAME_PATCH_COLUMNS,
  WRITE_RETURNING,
  canRetire,
  canWriteProviders,
  checkProvider,
  detailFrom,
  draftOf,
  issueLine,
  matchesProvider,
  providerInsert,
  providerKey,
  providerLine,
  providerName,
  providerPatch,
  providerRows,
  providerWriteErrorMessage,
  retirePatch,
  type ProviderDetail,
  type ProviderDetailRow,
  type ProviderDraft,
} from '@/api/providerDirectory';
import { PROVIDER_COLUMNS, type Provider } from '@/api/providers';
import { ES } from '@/strings';

// ============================================================================
// PROVEEDORES — THE DIRECTORY AND ITS TWO WRITES. Plan task `6b`.
//
// ⚠️ EVERY ASSERTION HERE IS ABOUT A RULE THIS APP DECIDES. What the DATABASE
// answers is `docs/checks/6b-provider-directory-contract.sh`'s, over real HTTP —
// the two are deliberately different instruments, because nothing in TypeScript
// has ever read `0002`, and a renamed column is a 400 the typecheck, the bundler
// and this file all pass straight over.
//
// ⚠️⚠️ AND THE ONE CLAIM NEITHER INSTRUMENT CAN MAKE IS NAMED HERE RATHER THAN
// LEFT OUT: that `Quitar proveedor` is the RIGHT answer for a supplier rather
// than merely the same answer as for a product. That is a question for the owner
// and it is parked in ⛔ DECISIONS OWED.
// ============================================================================

const GENERIC: Provider = { id: 'g1', name: 'Genérico', isGeneric: true };
const CENTRO: Provider = { id: 'p1', name: 'Bodega del Centro', isGeneric: false };
const PEÑA: Provider = { id: 'p2', name: 'Abarrotes Peña', isGeneric: false };

const SHOP: readonly Provider[] = [GENERIC, CENTRO, PEÑA];

function detail(over: Partial<ProviderDetail> = {}): ProviderDetail {
  return {
    id: 'p1',
    name: 'Bodega del Centro',
    isGeneric: false,
    isActive: true,
    contact: 'Doña Mati',
    phone: '55 1234 5678',
    address: 'Av. Juárez 12',
    ...over,
  };
}

function draft(over: Partial<ProviderDraft> = {}): ProviderDraft {
  return { name: 'Bodega del Centro', contact: '', phone: '', address: '', ...over };
}

describe('the detail read asks for the three columns Comprar never does', () => {
  // ⚠️⚠️ THIS IS THE ASSERTION THAT KEEPS `5g-i`'s BANNED LIST HONEST FROM THE
  // OTHER SIDE. That check asserts `contact_name`, `phone` and `address_line1`
  // never reach a phone through `PROVIDER_COLUMNS`; this asserts they DO reach it
  // through `DETAIL_COLUMNS`, which is what makes the first one a boundary rather
  // than a prohibition. Widening the list read to satisfy the directory would turn
  // that check red — deliberately.
  it('carries the three directory columns', () => {
    for (const column of ['contact_name', 'phone', 'address_line1']) {
      expect(DETAIL_COLUMNS.split(',')).toContain(column);
    }
  });

  it('carries the four the list read already has', () => {
    for (const column of PROVIDER_COLUMNS.split(',')) {
      expect(DETAIL_COLUMNS.split(',')).toContain(column);
    }
  });

  // ⚠️ `normalized_name` IS `generated always` AND CARRIES THE UNIQUENESS
  // CONSTRAINT. A phone holding it would hold a second answer to *what is this
  // supplier called*, and `searchTerm` is what folds a name for comparison here.
  it('asks for no generated or bookkeeping column', () => {
    for (const column of ['normalized_name', 'workspace_id', 'created_at', 'updated_at']) {
      expect(DETAIL_COLUMNS.split(',')).not.toContain(column);
    }
  });

  it('names the table and the filter column once each', () => {
    expect(DIRECTORY_TABLE).toBe('provider');
    expect(DETAIL_ID_COLUMN).toBe('id');
  });

  // ⚠️ THE PROVIDER IS IN THE KEY. One key for every supplier would serve the last
  // one's contact details to the next — the `memoryKey` argument one file over,
  // arriving through TanStack instead of through a fallback.
  it('keys one supplier under her own id', () => {
    expect(providerKey('p1')).not.toEqual(providerKey('p2'));
    expect(providerKey(null)).toEqual(providerKey(''));
  });
});

describe('a row becomes the form the screen holds', () => {
  const row: ProviderDetailRow = {
    id: 'p1',
    name: 'Bodega del Centro',
    is_generic: false,
    is_active: true,
    contact_name: 'Doña Mati',
    phone: '55 1234 5678',
    address_line1: 'Av. Juárez 12',
  };

  it('reads every column across', () => {
    expect(detailFrom(row)).toEqual(detail());
  });

  // ⚠️⚠️ `null` BECOMES `''` AND THAT IS NOT COSMETIC: each one is about to be a
  // `TextInput`'s `value`, and React Native treats `null` there as UNCONTROLLED — a
  // box that accepts typing and then loses it on the next render.
  it('turns an absent contact, phone and address into empty strings', () => {
    const bare = detailFrom({ ...row, contact_name: null, phone: null, address_line1: null });
    expect(bare).not.toBeNull();
    expect(bare?.contact).toBe('');
    expect(bare?.phone).toBe('');
    expect(bare?.address).toBe('');
  });

  // ⚠️ A READ THAT CAME BACK EMPTY IS `null`, and the SCREEN is what parts *not
  // back yet* from *this supplier is gone* — `useProviderDetail`'s `loading`.
  it('answers null for nothing at all', () => {
    expect(detailFrom(null)).toBeNull();
    expect(detailFrom(undefined)).toBeNull();
  });

  it('seeds the form from what the shop holds', () => {
    expect(draftOf(detail())).toEqual({
      name: 'Bodega del Centro',
      contact: 'Doña Mati',
      phone: '55 1234 5678',
      address: 'Av. Juárez 12',
    });
  });

  it('starts an empty form with four empty strings and never a null', () => {
    for (const value of Object.values(EMPTY_DRAFT)) expect(value).toBe('');
  });
});

describe('the fence is the applied policy and nothing more', () => {
  it('lets an owner and a manager write', () => {
    expect(canWriteProviders('owner')).toBe(true);
    expect(canWriteProviders('manager')).toBe(true);
  });

  it('refuses a cashier, because provider_insert and provider_update are manager', () => {
    expect(canWriteProviders('staff')).toBe(false);
  });

  // ⚠️ `null` IS *NOT KNOWN YET* AND IS FENCED OUT WITH HER: answering true while
  // the membership read is in flight would draw a create row on a phone that has
  // not been told who is holding it, and the tap would be a 403.
  it('refuses a phone that has not been told who is holding it', () => {
    expect(canWriteProviders(null)).toBe(false);
  });
});

describe('three reasons a supplier cannot be retired, kept as three things', () => {
  it('retires an ordinary active supplier for a manager', () => {
    expect(canRetire(detail(), true)).toBe(true);
  });

  it('refuses when the person may not write', () => {
    expect(canRetire(detail(), false)).toBe(false);
  });

  // ⚠️⚠️ THE FENCE THE DATABASE DOES NOT HOLD. `provider_protect_generic` refuses a
  // DELETE and a demotion and STOPS THERE — nothing prevents `is_active` false, and
  // a shop whose catch-all supplier was switched off would open Comprar with no
  // default at all. `docs/checks/6b-provider-directory-contract.sh` measures that
  // the database really would have allowed it.
  it('refuses the generic row even for an owner', () => {
    expect(canRetire(detail({ isGeneric: true }), true)).toBe(false);
  });

  // ⚠️ ABSENT RATHER THAN IDEMPOTENT: a second `is_active = false` is a 200 that
  // changes nothing and reads to a shopkeeper as having worked.
  it('refuses one that is already retired', () => {
    expect(canRetire(detail({ isActive: false }), true)).toBe(false);
  });

  it('refuses when there is no supplier to retire', () => {
    expect(canRetire(null, true)).toBe(false);
  });
});

describe('the search folds what 0002 says it should and nothing else', () => {
  it('matches everything on an empty box', () => {
    for (const provider of SHOP) expect(matchesProvider(provider, '')).toBe(true);
  });

  it('matches on a fragment, folding case and whitespace', () => {
    expect(matchesProvider(CENTRO, '  BODEGA   del ')).toBe(true);
  });

  // ⚠️⚠️ THE ACCENT FOLD IS `0002`'s OWN DIVISION OF LABOUR: that migration refuses
  // to fold accents in `normalize_name` and ends the paragraph with *"search-time
  // folding belongs in the query"*. A list that will not find `Peña` unless she
  // reaches for the accent is a list she stops using.
  it('finds Peña by typing pena', () => {
    expect(matchesProvider(PEÑA, 'pena')).toBe(true);
    expect(matchesProvider(PEÑA, 'peña')).toBe(true);
  });

  it('does not match a supplier the shop does not have', () => {
    expect(matchesProvider(CENTRO, 'ferretería')).toBe(false);
  });
});

describe('the rows the directory draws, and the door at the end of a fruitless search', () => {
  it('draws every supplier when nothing is typed, in the order it was given them', () => {
    const rows = providerRows(SHOP, '', true);
    expect(rows.map((row) => (row.kind === 'provider' ? row.provider.id : 'crear'))).toEqual([
      'g1',
      'p1',
      'p2',
    ]);
  });

  it('filters to what matches', () => {
    const rows = providerRows(SHOP, 'bodega', true);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind === 'provider' && rows[0].provider.id).toBe('p1');
  });

  // ⚠️⚠️ THE ANTI-DUPLICATE MECHANISM, AND IT ONLY WORKS BECAUSE THE DOOR IS LAST.
  // `provider_name_unique` is on `normalized_name`, which folds case and whitespace
  // and NOT accents — so *Bodega Centro* and *Bodega del Centro* are two rows
  // Postgres accepts happily, and `provider_price_memory` then splits down the
  // middle. The list is what prevents it, and only if it is read first.
  it('offers the create row only once nothing matches', () => {
    expect(providerRows(SHOP, 'bodega', true).some((row) => row.kind === 'create')).toBe(false);
    const rows = providerRows(SHOP, 'Ferretería El Águila', true);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind === 'create' && rows[0].name).toBe('Ferretería El Águila');
  });

  it('carries the typed name collapsed, so the form is handed what she meant', () => {
    const rows = providerRows(SHOP, '  Frutas   del   Valle  ', true);
    expect(rows[0].kind === 'create' && rows[0].name).toBe('Frutas del Valle');
  });

  // ⚠️ A BLANK BOX IS NOT A SEARCH THAT FOUND NOTHING — a create row with no name
  // in it would be `Agregar` back again, wearing a list row.
  it('offers no create row for a box holding only spaces', () => {
    expect(providerRows([], '   ', true)).toEqual([]);
  });

  // ⚠️ THE ONE THING THIS FUNCTION MUST NEVER DO IS RETURN A DOOR SHE WILL BE
  // REFUSED. `provider_insert` is `has_role(…, 'manager')`, and plainly absent beats
  // looking live and refusing silently.
  it('hands a cashier no create row, however fruitless her search', () => {
    expect(providerRows(SHOP, 'Ferretería', false)).toEqual([]);
  });
});

describe('the one line an empty directory shows', () => {
  it('puts a failed read ahead of everything, even while it retries', () => {
    expect(providerLine(true, '', 'offline')).toBe(ES.api.errors.offline);
    expect(providerLine(false, 'bodega', 'unknown')).toBe(ES.api.errors.unknown);
  });

  it('says it is still asking while it is', () => {
    expect(providerLine(true, '', null)).toBe(ES.providers.empty.loading);
  });

  // ⚠️ IT NEVER SAYS *todavía no tienes proveedores* ON A FAILURE: she would go and
  // add a supplier she already has, because the app told her the shop had none.
  it('tells a search that found nothing apart from a shop that has nothing', () => {
    expect(providerLine(false, 'bodega', null)).toBe(ES.providers.empty.noMatch);
    expect(providerLine(false, '', null)).toBe(ES.providers.empty.none);
    expect(ES.providers.empty.noMatch).not.toBe(ES.providers.empty.none);
  });

  it('treats a box of spaces as an empty box', () => {
    expect(providerLine(false, '   ', null)).toBe(ES.providers.empty.none);
  });
});

describe('what an insert sends, and what it must not', () => {
  it('names the five columns it writes', () => {
    expect(INSERT_COLUMNS.split(',')).toEqual([
      'workspace_id',
      'name',
      'contact_name',
      'phone',
      'address_line1',
    ]);
  });

  // ⚠️⚠️ `is_generic` CANNOT BE HERE. Exactly one per workspace, created by
  // `onboard_workspace`, and `provider_one_generic_per_workspace_idx` is a partial
  // unique index — a second one is a `23505` on an index whose name says nothing a
  // shopkeeper could act on. ⚠️ `is_active` defaults to true, and sending it would
  // be this app restating a default it does not own.
  it('sends neither is_generic nor is_active', () => {
    expect(INSERT_COLUMNS).not.toContain('is_generic');
    expect(INSERT_COLUMNS).not.toContain('is_active');
    const row = providerInsert(draft(), 'w1');
    expect(Object.keys(row).sort()).toEqual(INSERT_COLUMNS.split(',').sort());
  });

  it('sends the workspace, because provider has no default for it', () => {
    expect(providerInsert(draft(), 'w1').workspace_id).toBe('w1');
  });

  it('collapses the name, because normalize_name will anyway', () => {
    expect(providerInsert(draft({ name: '  Bodega   del  Centro ' }), 'w1').name).toBe(
      'Bodega del Centro',
    );
    expect(providerName('  Peña   y  Asociados ')).toBe('Peña y Asociados');
  });

  // ⚠️ THE ACCENT SURVIVES. `0002` refuses to fold accents on purpose, and `Peña`
  // must stay `Peña` on the page — folding here would store the comparison form.
  it('stores the accent rather than the folded form', () => {
    expect(providerInsert(draft({ name: 'Abarrotes Peña' }), 'w1').name).toBe('Abarrotes Peña');
  });

  // ⚠️⚠️ EMPTY MEANS ABSENT, ONCE. `contact_name = ''` is a contact this shop HAS —
  // the screen draws the dash for both, so the two states would be
  // indistinguishable on the page while being different rows in Postgres.
  it('turns an untouched optional box into null and never an empty string', () => {
    const row = providerInsert(draft({ contact: '  ', phone: '', address: '\t' }), 'w1');
    expect(row.contact_name).toBeNull();
    expect(row.phone).toBeNull();
    expect(row.address_line1).toBeNull();
  });

  it('keeps a phone exactly as she wrote it, spaces and all', () => {
    expect(providerInsert(draft({ phone: '55 1234 5678' }), 'w1').phone).toBe('55 1234 5678');
  });
});

describe('what this form refuses before it asks the database', () => {
  it('refuses a blank name, which provider_name_not_blank refuses too', () => {
    expect(checkProvider(draft({ name: '' }), SHOP)).toBe('nameBlank');
    expect(checkProvider(draft({ name: '   ' }), SHOP)).toBe('nameBlank');
  });

  it('accepts a name the shop does not have', () => {
    expect(checkProvider(draft({ name: 'Frutas del Valle' }), SHOP)).toBeNull();
  });

  it('refuses a name that folds onto one it does', () => {
    expect(checkProvider(draft({ name: 'bodega   DEL centro' }), SHOP)).toBe('duplicate');
  });

  // ⚠️⚠️ THIS IS THE ONE PLACE THIS APP IS DELIBERATELY STRICTER THAN ITS SCHEMA.
  // `normalize_name` does not fold accents, so `Pena` and `Peña` are two LEGAL rows;
  // `searchTerm` folds them, so this refuses the second. **Wider is the safe
  // direction** — it refuses something the database would have allowed, with a
  // sentence, where the other way round is a `23505` on a name the screen had just
  // shown as available.
  it('refuses Pena when the shop has Peña, which the database would have allowed', () => {
    expect(checkProvider(draft({ name: 'Abarrotes Pena' }), SHOP)).toBe('duplicate');
  });

  // ⚠️ WITHOUT `exceptId`, SAVING A FORM WITH AN UNTOUCHED NAME REFUSES ITSELF AS A
  // DUPLICATE OF ITSELF.
  it('does not refuse a supplier for being herself', () => {
    expect(checkProvider(draft({ name: 'Bodega del Centro' }), SHOP, 'p1')).toBeNull();
    expect(checkProvider(draft({ name: 'Abarrotes Peña' }), SHOP, 'p1')).toBe('duplicate');
  });

  // ⚠️⚠️ THE LOCAL HALF AND THE WIRE HALF SAY THE SAME THING ON PURPOSE. It is one
  // fact from two sides, and the local one cannot be complete: it cannot see a
  // supplier added on another phone, nor a RETIRED one, which `providersFrom` drops
  // and the unique index still counts.
  it('says the same sentence the database version does', () => {
    expect(issueLine('duplicate')).toBe(ES.providers.errors.duplicate);
    expect(issueLine(null)).toBe('');
    expect(issueLine('nameBlank')).toBe(ES.providers.issues.nameBlank);
  });
});

describe('the patch that turns this supplier into this draft', () => {
  it('names the columns each kind of change touches', () => {
    expect(NAME_PATCH_COLUMNS).toBe('name');
    expect(CONTACT_PATCH_COLUMNS).toBe('contact_name,phone,address_line1');
    expect(ACTIVE_PATCH_COLUMNS).toBe('is_active');
  });

  // ⚠️⚠️ AND IT ASKS FOR THE ROW BACK, WHICH IS THE ONLY WAY THE FENCE IS VISIBLE ON
  // A PATCH: an RLS UPDATE refusal is 200 with `[]`, so a PATCH that asked for
  // nothing back reports success for a write that never happened.
  it('asks for the id back on every write', () => {
    expect(WRITE_RETURNING).toBe('id');
  });

  it('sends nothing at all when nothing moved', () => {
    expect(providerPatch(detail(), draftOf(detail()))).toBeNull();
  });

  // ⚠️ EVERY COMPARISON IS AGAINST THE STORED FORM AND NOT THE TYPED ONE, so
  // re-typing a name with a trailing space is correctly NOT a change.
  it('does not call a re-typed identical name a change', () => {
    const held = detail();
    expect(providerPatch(held, { ...draftOf(held), name: '  Bodega del Centro  ' })).toBeNull();
  });

  it('sends only the column that moved', () => {
    const held = detail();
    expect(providerPatch(held, { ...draftOf(held), name: 'Bodega Centro' })).toEqual({
      name: 'Bodega Centro',
    });
    expect(providerPatch(held, { ...draftOf(held), phone: '55 0000 0000' })).toEqual({
      phone: '55 0000 0000',
    });
  });

  // ⚠️⚠️ ONE PATCH AND NOT FOUR, WHICH IS THE OPPOSITE OF `editPlan` ONE MODULE OVER
  // AND IS RIGHT FOR THE OPPOSITE REASON. That one splits a rename from a
  // re-pricing because they are two TABLES and the second can fail after the first
  // succeeded. All four columns here are on `provider`: one PATCH, one statement,
  // no partial state to have a sentence for.
  it('sends all four in one patch when all four moved', () => {
    expect(
      providerPatch(detail(), {
        name: 'Bodega Nueva',
        contact: 'Don Beto',
        phone: '55 9999 0000',
        address: 'Calle 5 de Mayo 3',
      }),
    ).toEqual({
      name: 'Bodega Nueva',
      contact_name: 'Don Beto',
      phone: '55 9999 0000',
      address_line1: 'Calle 5 de Mayo 3',
    });
  });

  // ⚠️ CLEARING A BOX IS A REAL CHANGE AND IT SENDS `null`, not `''`. A supplier
  // whose phone number is wrong must be able to have it removed.
  it('clears a contact detail to null rather than to an empty string', () => {
    const patch = providerPatch(detail(), { ...draftOf(detail()), phone: '' });
    expect(patch).toEqual({ phone: null });
  });

  it('does not call an already-empty box being left empty a change', () => {
    const bare = detail({ contact: '', phone: '', address: '' });
    expect(providerPatch(bare, draftOf(bare))).toBeNull();
  });

  it('retires with is_active false and touches nothing else', () => {
    expect(retirePatch()).toEqual({ is_active: false });
  });
});

describe('the sentence a failed provider write shows', () => {
  it('maps 23505 to the duplicate sentence', () => {
    expect(providerWriteErrorMessage({ code: '23505' })).toBe(ES.providers.errors.duplicate);
  });

  // ⚠️⚠️ TWO DIFFERENT WIRE SHAPES FOR ONE FENCE, AND BOTH HAVE TO MAP. An INSERT a
  // cashier is refused is `42501` on an HTTP 403; her PATCH is **200 with `[]`**
  // turned into `PGRST116` by `.single()`, because `provider_update`'s `using`
  // clause hides the row rather than refusing the write.
  it('maps both shapes of the manager fence to the same sentence', () => {
    expect(providerWriteErrorMessage({ code: '42501' })).toBe(ES.providers.errors.notAllowed);
    expect(providerWriteErrorMessage({ code: 'PGRST116' })).toBe(ES.providers.errors.notAllowed);
  });

  // ⚠️ AND IT IS NOT *tu sesión se cerró*, which would send her to sign in again in
  // a loop with no end in it.
  it('does not send a refused cashier to sign in again', () => {
    expect(providerWriteErrorMessage({ code: '42501' })).not.toBe(ES.api.errors.sessionEnded);
  });

  it('maps the generic row trigger to its own sentence', () => {
    expect(providerWriteErrorMessage({ code: '23001' })).toBe(ES.providers.errors.generic);
  });

  // ⚠️ A ROW WE SHOULD NEVER HAVE SENT. `checkProvider` makes all three
  // unreachable, so reaching one is OUR mistake deployed — dressing it in a helpful
  // sentence would hide the one class of failure that must be fixed rather than
  // retried.
  it('maps a row this app should never have sent to the honest catch-all', () => {
    for (const code of ['23514', '23502', '23503']) {
      expect(providerWriteErrorMessage({ code })).toBe(ES.providers.errors.rejected);
    }
  });

  // ⚠️ EVERYTHING UNRECOGNISED GOES DOWN `apiErrorMessage`, so *sin conexión* stays
  // the one sentence this app gives for a lost link — and offline is the pilot
  // store's normal write path.
  it('lets a lost connection keep its own sentence', () => {
    expect(providerWriteErrorMessage(new TypeError('Network request failed'))).toBe(
      ES.api.errors.offline,
    );
    expect(providerWriteErrorMessage('a string')).toBe(ES.api.errors.unknown);
    expect(providerWriteErrorMessage(null)).toBe(ES.api.errors.unknown);
  });
});

describe('the vocabulary says what the database can actually do', () => {
  // ⚠️⚠️ `0002` GIVES `provider` NO DELETE POLICY AT ALL, so a word promising a
  // removal would promise something the database refuses to perform. *Quitar* is
  // the truth rather than a softening.
  it('never offers to delete a supplier', () => {
    expect(ES.providers.edit.retire).not.toContain('Eliminar');
    expect(ES.providers.edit.retireConfirm).not.toContain('Eliminar');
  });

  // ⚠️ THE TWO HALVES SAID SEPARATELY, because *se quitará* alone is the sentence a
  // shopkeeper reads as *my purchase history is gone*.
  it('says what stays as well as what goes', () => {
    expect(ES.providers.edit.retireOnce.length).toBeGreaterThan(40);
    expect(ES.providers.edit.retireAsk).not.toBe(ES.providers.edit.retireOnce);
  });

  // ⚠️ THE MODULE'S WORD IS `ES.providers.title` AND INICIO READS IT FROM THERE —
  // `app/test/inicio.test.ts` is what pins that half. A second spelling of a room's
  // name is this repository's stale-duplicate defect in its cheapest form.
  it('spells the module once', () => {
    expect(ES.providers.title).toBe('Proveedores');
  });

  // ⚠️⚠️ `R16`: THE SEARCH BOX'S WORD IS THE CALLER'S SINCE `6b`, and this is the
  // assertion that says the two callers disagree on purpose. A `Buscador` that
  // spelled one screen's word inside itself could not be drawn over the other.
  it('does not search for a product on the supplier screen', () => {
    expect(ES.providers.search).not.toBe(ES.catalog.search);
  });
});

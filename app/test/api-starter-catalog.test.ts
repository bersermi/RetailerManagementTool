// The starter catalog's contract and its decisions — plan task `9d`.
//
// ⚠️ THE FIXTURE IS SHAPED LIKE `0045`, NOT COPIED FROM IT. Two giros sharing a
// product (Huevo blanco), two families, and a category tag that is never
// offered as a giro. What the real template holds is `docs/checks/9d-starter-
// catalog-contract.sh`'s to read off the wire.

import { describe, expect, it } from 'vitest';

import {
  CATALOG_TEMPLATE,
  EMPTY_TEMPLATE,
  IMPORT_CATALOG,
  NOTHING_HELD,
  TEMPLATE_KEY,
  alreadyIn,
  choiceFrom,
  giroChoices,
  holdingFrom,
  importArgs,
  importCount,
  importResultFrom,
  offeredGroups,
  templateFrom,
  toggled,
  type Template,
} from '@/api/starterCatalog';
import { shouldPersistKey } from '@/api/persist';

const WIRE = {
  tags: [
    { code: 'cat-huevo', kind: 'categoria', label: 'Huevo' },
    { code: 'giro-polleria', kind: 'giro', label: 'Pollería' },
    { code: 'giro-cremeria', kind: 'giro', label: 'Cremería' },
    { code: 'giro-fruteria', kind: 'giro', label: 'Frutería' },
  ],
  families: [
    { code: 'huevo', name: 'Huevo' },
    { code: 'pollo', name: 'Pollo' },
  ],
  products: [
    { code: 'pechuga', family: 'pollo', name: 'Pechuga entera', base_unit: 'g', pack_size: '1.000', tax_rate: '0.0000', tags: ['giro-polleria'] },
    { code: 'pierna', family: 'pollo', name: 'Pierna', tags: ['giro-polleria'] },
    { code: 'huevo-blanco', family: 'huevo', name: 'Huevo blanco', tags: ['cat-huevo', 'giro-cremeria', 'giro-polleria'] },
    { code: 'queso', family: 'queso', name: 'Queso fresco', tags: ['giro-cremeria'] },
  ],
};

const T: Template = templateFrom(WIRE);
const set = (...codes: string[]): ReadonlySet<string> => new Set(codes);

describe('the contract', () => {
  it('names both RPCs as 0044 declared them', () => {
    expect(CATALOG_TEMPLATE).toBe('catalog_template');
    expect(IMPORT_CATALOG).toBe('import_catalog');
  });

  it('caches the template in memory only — the import needs signal, so a stored picker would offer a button that fails', () => {
    expect(shouldPersistKey(TEMPLATE_KEY)).toBe(false);
  });

  it('sends the arguments by their p_ names, with the exclusions sorted', () => {
    expect(importArgs('ws-1', { giros: ['giro-polleria'], excluded: ['pierna', 'alitas'] })).toEqual({
      p_workspace_id: 'ws-1',
      p_tags: ['giro-polleria'],
      p_exclude: ['alitas', 'pierna'],
    });
  });

  it('sends nothing when no giro is chosen — that is Omitir, and 0044 would refuse it with 23514', () => {
    expect(importArgs('ws-1', { giros: [], excluded: [] })).toBeNull();
  });

  it('reads {imported, skipped} and throws, naming the shape, on anything else', () => {
    expect(importResultFrom({ imported: 23, skipped: 1 })).toEqual({ imported: 23, skipped: 1 });
    expect(() => importResultFrom({ imported: '23' })).toThrow(/import_catalog returned \{"imported":"23"\}/);
    expect(() => importResultFrom(null)).toThrow(/expected \{imported, skipped\}/);
  });
});

describe('templateFrom', () => {
  it('keeps every readable row and carries names and tags only', () => {
    expect(T.tags.map((t) => t.code)).toEqual(['cat-huevo', 'giro-polleria', 'giro-cremeria', 'giro-fruteria']);
    expect(T.products[0]).toEqual({ code: 'pechuga', family: 'pollo', name: 'Pechuga entera', tags: ['giro-polleria'] });
  });

  it('drops a row it cannot read rather than guessing at it', () => {
    const t = templateFrom({
      tags: [{ code: 'x', kind: 'marca', label: 'X' }, { code: 'y', kind: 'giro' }, 'nope'],
      families: [{ code: 'f' }],
      products: [{ code: 'p', name: 'P' }, { code: 'q', family: 'f', name: 'Q', tags: ['a', 3] }],
    });
    expect(t.tags).toEqual([]);
    expect(t.families).toEqual([]);
    expect(t.products).toEqual([{ code: 'q', family: 'f', name: 'Q', tags: ['a'] }]);
  });

  it('reads an answer that is not the three-list object as the empty template', () => {
    expect(templateFrom(null)).toEqual(EMPTY_TEMPLATE);
    expect(templateFrom([])).toEqual(EMPTY_TEMPLATE);
    expect(templateFrom('{}')).toEqual(EMPTY_TEMPLATE);
  });
});

describe('what the shop already holds — the import\'s own rule', () => {
  it('a product is held by its template code', () => {
    const holding = holdingFrom([{ name: 'Pechuga sin hueso', template_code: 'pechuga' }]);
    expect(alreadyIn(T.products[0], holding)).toBe(true);
  });

  it('or by a product of the same name, folded as normalize_name folds it — the shop\'s own row', () => {
    const holding = holdingFrom([{ name: '  PIERNA ', template_code: null }]);
    expect(alreadyIn(T.products[1], holding)).toBe(true);
  });

  it('but accents are not folded, because normalize_name does not fold them', () => {
    const t = templateFrom({ ...WIRE, products: [{ code: 'platano', family: 'pollo', name: 'Plátano', tags: ['giro-polleria'] }] });
    expect(alreadyIn(t.products[0], holdingFrom([{ name: 'Platano', template_code: null }]))).toBe(false);
  });

  it('a RETIRED product still holds its name — the database\'s unique index ignores is_active', () => {
    // holdingFrom takes the whole read; it has no is_active to look at, by design.
    const holding = holdingFrom([{ name: 'Pierna', template_code: null }]);
    expect(giroChoices(T, holding).find((g) => g.code === 'giro-polleria')?.count).toBe(2);
  });
});

describe('the giros offered', () => {
  it('only giros, in the template\'s order, each with what it would bring', () => {
    expect(giroChoices(T, NOTHING_HELD)).toEqual([
      { code: 'giro-polleria', label: 'Pollería', count: 3 },
      { code: 'giro-cremeria', label: 'Cremería', count: 2 },
    ]);
  });

  it('a giro with nothing left to bring is not offered — Frutería has no content yet', () => {
    expect(giroChoices(T, NOTHING_HELD).map((g) => g.code)).not.toContain('giro-fruteria');
  });

  it('a giro whose every product the shop holds disappears, and the shared one leaves both counts', () => {
    const holding = holdingFrom([
      { name: 'x', template_code: 'pechuga' },
      { name: 'y', template_code: 'pierna' },
      { name: 'z', template_code: 'huevo-blanco' },
    ]);
    expect(giroChoices(T, holding)).toEqual([{ code: 'giro-cremeria', label: 'Cremería', count: 1 }]);
  });
});

describe('the untick list', () => {
  it('groups by family in the template\'s product order, and a product two chosen giros share appears ONCE', () => {
    const groups = offeredGroups(T, set('giro-polleria', 'giro-cremeria'), NOTHING_HELD);
    expect(groups.map((g) => [g.name, g.products.map((p) => p.code)])).toEqual([
      ['Pollo', ['pechuga', 'pierna']],
      ['Huevo', ['huevo-blanco']],
      ['queso', ['queso']],
    ]);
  });

  it('a family the template does not list falls back to its code rather than to nothing', () => {
    const groups = offeredGroups(T, set('giro-cremeria'), NOTHING_HELD);
    expect(groups.find((g) => g.code === 'queso')?.name).toBe('queso');
  });

  it('counts what Importar would bring: offered minus unticked', () => {
    const groups = offeredGroups(T, set('giro-polleria'), NOTHING_HELD);
    expect(importCount(groups, set())).toBe(3);
    expect(importCount(groups, set('pierna'))).toBe(2);
    expect(importCount(groups, set('pierna', 'queso'))).toBe(2);
  });

  it('a tick flips into a NEW set, and the old one is untouched — React compares by reference', () => {
    const before = set('pierna');
    const after = toggled(before, 'pechuga');
    expect([...after].sort()).toEqual(['pechuga', 'pierna']);
    expect([...before]).toEqual(['pierna']);
    expect([...toggled(after, 'pierna')]).toEqual(['pechuga']);
  });
});

describe('the choice the screens send', () => {
  it('nothing chosen is Omitir — null, and no call', () => {
    expect(choiceFrom(T, set(), set('pierna'), NOTHING_HELD)).toBeNull();
    expect(choiceFrom(null, set('giro-polleria'), set(), NOTHING_HELD)).toBeNull();
  });

  it('giros go in the template\'s order whatever order they were tapped in', () => {
    expect(choiceFrom(T, set('giro-cremeria', 'giro-polleria'), set(), NOTHING_HELD)?.giros).toEqual([
      'giro-polleria',
      'giro-cremeria',
    ]);
  });

  it('an exclusion under a giro later unchosen is not sent — it is not a decision about anything imported', () => {
    // Queso unticked under Cremería, then Cremería unchosen.
    const choice = choiceFrom(T, set('giro-polleria'), set('queso', 'pierna'), NOTHING_HELD);
    expect(choice).toEqual({ giros: ['giro-polleria'], excluded: ['pierna'] });
  });
});

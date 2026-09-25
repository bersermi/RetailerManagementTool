import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SORT,
  MEMORY_COLUMNS,
  MEMORY_PROVIDER_COLUMN,
  MEMORY_TABLE,
  PROVIDERS_KEY,
  PROVIDER_COLUMNS,
  PROVIDER_ORDER_COLUMN,
  defaultProvider,
  memoryFor,
  memoryKey,
  canReadMemory,
  costNote,
  costShown,
  lastPurchasedFor,
  memoryState,
  providerById,
  sortedForBuying,
  providersFrom,
  quotesFor,
  typedPerBase,
  type MemoryRow,
  type ProviderRow,
} from '@/api/providers';
import type { CatalogEntry, UnitFactors } from '@/api/catalog';

// ============================================================================
// WHO THE SHOP BUYS FROM, AND WHAT THEY CHARGED. Plan task `5g-i`.
//
// ⚠️ EVERY ASSERTION HERE IS ABOUT A RULE THIS APP DECIDES. What the DATABASE
// answers is `docs/checks/5g-i-purchase-contract.sh`'s, over real HTTP — the
// two are deliberately different instruments, because nothing in TypeScript has
// ever read `0002` or `0008` and a renamed column is a 400 the typecheck, the
// bundler and this file all pass straight over.
// ============================================================================

const FACTORS: UnitFactors = {
  g: '1.000000',
  kg: '1000.000000',
  '250g': '250.000000',
  pza: '1.000000',
};

function provider(over: Partial<ProviderRow> = {}): ProviderRow {
  return {
    id: 'p-1',
    name: 'Bodega del Centro',
    is_generic: false,
    is_active: true,
    ...over,
  };
}

function memory(over: Partial<MemoryRow> = {}): MemoryRow {
  return {
    provider_id: 'p-1',
    variant_id: 'v-1',
    unit_price_net_per_base: '0.018000',
    last_qty_display_unit: 'kg',
    last_purchased_at: '2026-09-20T10:00:00+00:00',
    ...over,
  };
}

describe('the contract with the database', () => {
  // ⚠️ `R13`: the columns are written once, here, and read by the live check.
  it('names the provider columns and never asks for `*`', () => {
    expect(PROVIDER_COLUMNS).toBe('id,name,is_generic,is_active');
    expect(PROVIDER_COLUMNS).not.toContain('*');
  });

  // ⚠️ Proveedores is step 6's own screen and Comprar draws none of these. A
  // column the app never asks for is a column that never reaches a phone.
  it('leaves the directory columns Comprar does not draw on the server', () => {
    for (const column of ['contact_name', 'phone', 'address_line1']) {
      expect(PROVIDER_COLUMNS).not.toContain(column);
    }
  });

  // ⚠️⚠️ THE CAST IS THE ASSERTION. A bare numeric arrives as a JSON number,
  // which is a double, and `parseDecimal` refuses a number argument outright.
  it('casts the remembered price to text', () => {
    expect(MEMORY_COLUMNS).toContain('unit_price_net_per_base::text');
  });

  it('reads the denomination she typed last time', () => {
    expect(MEMORY_COLUMNS).toContain('last_qty_display_unit');
  });

  it('spells the view and its filter column once', () => {
    expect(MEMORY_TABLE).toBe('provider_price_memory');
    expect(MEMORY_PROVIDER_COLUMN).toBe('provider_id');
  });

  it('orders providers in the database rather than in this runtime', () => {
    expect(PROVIDER_ORDER_COLUMN).toBe('name');
  });

  // ⚠️⚠️ THE CACHE'S HALF OF *never across providers*. One key for all of them
  // serves the last provider's prices to the next one.
  it('puts the provider in the memory query key', () => {
    expect(memoryKey('p-1')).not.toEqual(memoryKey('p-2'));
    expect(memoryKey('p-1')).toEqual(['providers', 'memory', 'p-1']);
    expect(PROVIDERS_KEY).toEqual(['providers', 'list']);
  });

  it('gives a null provider a key of its own rather than throwing', () => {
    expect(memoryKey(null)).toEqual(['providers', 'memory', '']);
  });
});

describe('the picker', () => {
  it('drops a retired provider', () => {
    const list = providersFrom([provider(), provider({ id: 'p-2', is_active: false })]);
    expect(list.map((p) => p.id)).toEqual(['p-1']);
  });

  // ⚠️⚠️ `provider_protect_generic` refuses a DELETE and a DEMOTION and stops
  // there. A shop whose catch-all had been deactivated would open Comprar with
  // no default and `record_purchase` refusing every delivery for want of one.
  it('keeps the generic provider even when it has been deactivated', () => {
    const list = providersFrom([provider({ id: 'g', is_generic: true, is_active: false })]);
    expect(list.map((p) => p.id)).toEqual(['g']);
  });

  // ⚠️ A PROMOTION AND NOT A SORT: the rest keep `order=name`'s own order.
  it('puts the generic row first and leaves the rest as the database sent them', () => {
    const list = providersFrom([
      provider({ id: 'a', name: 'Abarrotes' }),
      provider({ id: 'g', name: 'Compra directa', is_generic: true }),
      provider({ id: 'z', name: 'Zafiro' }),
    ]);
    expect(list.map((p) => p.id)).toEqual(['g', 'a', 'z']);
  });

  it('is empty rather than throwing while the read is in flight', () => {
    expect(providersFrom(undefined)).toEqual([]);
    expect(providersFrom(null)).toEqual([]);
  });

  // ⚠️ F6 and not *the first one*, which the order makes true today and is a
  // different claim: a shop with no generic row must open on nobody.
  it('defaults to the generic provider and to nobody when there is none', () => {
    expect(defaultProvider(providersFrom([provider({ id: 'g', is_generic: true })]))?.id).toBe('g');
    expect(defaultProvider(providersFrom([provider()]))).toBeNull();
  });

  it('finds a provider by id, and answers null for nobody', () => {
    const list = providersFrom([provider()]);
    expect(providerById(list, 'p-1')?.name).toBe('Bodega del Centro');
    expect(providerById(list, 'nope')).toBeNull();
    expect(providerById(list, null)).toBeNull();
  });
});

describe('the price memory', () => {
  // ⚠️⚠️ THE ONE RULE §2.8 SAYS THE OPERATOR CANNOT CATCH FOR US.
  it('never carries another provider’s price', () => {
    const rows = [memory(), memory({ provider_id: 'p-2', variant_id: 'v-2' })];
    expect(quotesFor(rows, 'p-1')).toEqual({ 'v-1': '0.018000' });
  });

  it('remembers nothing at all when no provider is chosen', () => {
    expect(quotesFor([memory()], null)).toEqual({});
  });

  it('is empty rather than throwing while the read is in flight', () => {
    expect(quotesFor(undefined, 'p-1')).toEqual({});
  });

  // ⚠️ PER BASE AND NOT CONVERTED — `Quotes` is what `record_purchase` is sent.
  it('hands the basket the figure exactly as Postgres spelled it', () => {
    expect(quotesFor([memory({ unit_price_net_per_base: '0.018500' })], 'p-1')).toEqual({
      'v-1': '0.018500',
    });
  });

  // 0.018 per gram × 1000 g = $18.00 / kg.
  it('reads a per-base figure back as a price per PRICE unit', () => {
    const m = memoryFor([memory()], 'p-1', 'v-1', 'kg', FACTORS);
    expect(m?.centavos).toBe(1800);
    expect(m?.price).toBe('$18 / kg');
    expect(m?.perBase).toBe('0.018000');
  });

  // The same remembered figure, read against a quarter-kilo: $4.50 / 250 gr.
  it('reads the same figure differently for a differently priced variant', () => {
    const m = memoryFor([memory()], 'p-1', 'v-1', '250g', FACTORS);
    expect(m?.centavos).toBe(450);
    expect(m?.price).toBe('$4.50 / 250 gr');
  });

  // ⚠️ She may have bought a case last month and kilos this week.
  it('carries the denomination she typed last time beside the figure', () => {
    const m = memoryFor([memory({ last_qty_display_unit: '250g' })], 'p-1', 'v-1', 'kg', FACTORS);
    expect(m?.lastUnit).toBe('250g');
    expect(m?.price).toBe('$18 / kg');
  });

  it('survives a memory that carried no denomination', () => {
    const m = memoryFor([memory({ last_qty_display_unit: null })], 'p-1', 'v-1', 'kg', FACTORS);
    expect(m?.lastUnit).toBeNull();
  });

  // ⚠️ C3.12 — no memory is a DASH and never a zero.
  it('is null for a pairing nobody has bought', () => {
    expect(memoryFor([memory()], 'p-1', 'v-other', 'kg', FACTORS)).toBeNull();
    expect(memoryFor([memory()], 'p-2', 'v-1', 'kg', FACTORS)).toBeNull();
  });

  // ⚠️ *A null is a unit this phone has not read*, not a zero.
  it('refuses to price against a unit the phone has not read', () => {
    const m = memoryFor([memory()], 'p-1', 'v-1', 'caja', FACTORS);
    expect(m?.centavos).toBeNull();
    expect(m?.perBase).toBe('0.018000');
  });
});

describe('a price somebody types', () => {
  // ⚠️ The exact inverse of `priceCentavos`: $18.00 / kg is 0.018 per gram.
  it('turns a typed price per price unit into what record_purchase wants', () => {
    expect(typedPerBase(1800, 'kg', FACTORS)).toBe('0.018000');
    expect(typedPerBase(450, '250g', FACTORS)).toBe('0.018000');
    expect(typedPerBase(250, 'pza', FACTORS)).toBe('2.500000');
  });

  // ⚠️⚠️ THE ROUND TRIP IS THE ASSERTION, because the two functions are the only
  // two places that could disagree about what `$8.50 / kg` is.
  it('round-trips through the memory reader without losing a centavo', () => {
    for (const [unit, centavos] of [
      ['kg', 1800],
      ['250g', 450],
      ['g', 3],
      ['pza', 250],
    ] as const) {
      const perBase = typedPerBase(centavos, unit, FACTORS);
      expect(perBase).not.toBeNull();
      const m = memoryFor(
        [memory({ unit_price_net_per_base: perBase as string })],
        'p-1',
        'v-1',
        unit,
        FACTORS,
      );
      expect(m?.centavos).toBe(centavos);
    }
  });

  // ⚠️ C3.14's explicit zero is a SALE rule; a purchase at zero is still a
  // figure somebody typed, and the schema allows it (`purchase_line_price_
  // non_negative`). It is the ABSENT price C3.13 blocks, not this one.
  it('accepts an explicit zero and refuses a negative one', () => {
    expect(typedPerBase(0, 'kg', FACTORS)).toBe('0.000000');
    expect(typedPerBase(-1, 'kg', FACTORS)).toBeNull();
  });

  it('refuses to guess against a unit the phone has not read', () => {
    expect(typedPerBase(1800, 'caja', FACTORS)).toBeNull();
  });

  it('answers null for no price at all rather than zero', () => {
    expect(typedPerBase(null, 'kg', FACTORS)).toBeNull();
  });
});

describe('what an empty memory means', () => {
  // ⚠️⚠️ THE WHOLE REASON THIS FUNCTION EXISTS: 200-and-empty is BOTH a designed
  // state and an invisible refusal, measured against a real database 2026-09-24.
  it('separates a new pairing from a fence the reader cannot see', () => {
    expect(memoryState([], 'p-1', 'v-1', true)).toBe('new-pairing');
    expect(memoryState([], 'p-1', 'v-1', false)).toBe('unreadable');
  });

  it('says remembered when the pairing is there, whoever is asking', () => {
    expect(memoryState([memory()], 'p-1', 'v-1', true)).toBe('remembered');
    expect(memoryState([memory()], 'p-1', 'v-1', false)).toBe('remembered');
  });

  // ⚠️ *Not back yet* must never render as *there is nothing* — `membershipFrom`'s
  // rule, and the one that stopped Productos saying the shop was empty.
  it('says unknown while the read is in flight or no provider is chosen', () => {
    expect(memoryState(undefined, 'p-1', 'v-1', true)).toBe('unknown');
    expect(memoryState(null, 'p-1', 'v-1', true)).toBe('unknown');
    expect(memoryState([], null, 'v-1', true)).toBe('unknown');
  });

  // ⚠️ `R4`: none of these is a Spanish sentence, because none may reach a person
  // until the owner has said what a cashier is told.
  it('states none of itself in Spanish', () => {
    for (const state of ['remembered', 'new-pairing', 'unreadable', 'unknown']) {
      expect(state).toMatch(/^[a-z-]+$/);
    }
  });
});

// ============================================================================
// WHAT COMPRAR'S SCREEN NEEDED AND `5g-i` COULD NOT SUPPLY. Plan task `5g-ii`.
//
// ⚠️ THESE TWO ARE THE ONLY PART OF `5g-ii` AN INSTRUMENT IN THIS REPOSITORY CAN
// LOOK AT. Everything else in that row is rendering, navigation or layout, which
// §2.11 fences out of the suite and `R9` fences onto the owner's phone — so the
// two things it DID push down into a module are asserted here rather than
// reviewed by eye inside a 1,700-line screen.
// ============================================================================

describe('who may read the price memory', () => {
  // ⚠️⚠️ IT IS A CLAIM ABOUT `0003:558`, NOT A PREFERENCE.
  // `provider_price_memory` is `security_invoker` over `purchase` and
  // `purchase_line`, and both policies are `has_role(workspace_id, 'manager')`.
  // ⚠️⚠️ INVERTED BY `0040` ON 2026-09-25. It read *manager and above* from the day
  // it was written; the decision maker ruled *"Empleada should be able to see the
  // both the purchase records and the prices"*, `0040` dropped the role gate from
  // `purchase_select` and `purchase_line_select`, and **this predicate follows the
  // applied policy rather than leading it.**
  // ⚠️ `docs/checks/5g-i-purchase-contract.sh` assertion 10 is what proves the
  // DATABASE agrees — it drives a real cashier over HTTP. This asserts only that the
  // app stopped fencing her.
  it('is every known role, which is what the view inherits since 0040', () => {
    expect(canReadMemory('owner')).toBe(true);
    expect(canReadMemory('manager')).toBe(true);
    expect(canReadMemory('staff')).toBe(true);
  });

  // ⚠️ `null` IS *NOT KNOWN* AND IS LOAD-BEARING HERE RATHER THAN DEFENSIVE.
  // Answering `true` while the membership read is out would make `memoryState`
  // report `new-pairing` on every row of a phone that has not been told who is
  // holding it — the exact confusion `unreadable` exists to prevent.
  it('refuses a role that has not come back yet', () => {
    expect(canReadMemory(null)).toBe(false);
  });

  // ⚠️⚠️ WHAT THIS SUITE CANNOT REACH, SAID HERE RATHER THAN CLAIMED. The
  // implementation is a THRESHOLD over `ROLES` and not `role !== 'staff'`, for
  // `canWriteCatalog`'s recorded reason: a fourth role added by a migration must
  // land on the correct side by itself. ⚠️ **The two spellings are
  // indistinguishable from here** — they agree on all three roles that exist, and
  // `Role` is a union so no test may pass a fourth. **That was measured**: a
  // falsification replacing the body with `role !== 'staff'` left every assertion
  // above green except the `null` one.
  // ⚠️ So the claim lives in the function's own header, which is `R9`'s
  // convention — an unseeable deliverable gets written down — and the ONE half a
  // test can hold is asserted above: `null` is refused.
  // ⚠️⚠️ AND `null` IS STILL REFUSED, WHICH IS NOW THE WHOLE OF WHAT THIS FUNCTION
  // DECIDES. *Not known yet* must not answer `true`: `memoryState` would report
  // `new-pairing` on every row of a phone that has simply not been told who is
  // holding it, and Comprar would draw *Primera vez con este proveedor* over a
  // catalog the shop buys weekly — the exact falsehood the 2026-09-25 rulings
  // removed, arriving through a membership read instead of through a fence.
  it('still refuses the role that is not known, which is now the only thing it decides', () => {
    expect(canReadMemory(null)).toBe(false);
  });
});

describe('what the cost box reads', () => {
  // ⚠️ `0.018000` per gram is `$18.00 / kg`, and the box shows the figure a
  // person would type — no `$`, no thousands comma: it is going into a
  // `TextInput` under a moving cursor.
  it('turns a stored per-base figure into pesos per price unit', () => {
    expect(costShown('0.018000', 'kg', FACTORS)).toBe('18.00');
    expect(costShown('0.018000', '250g', FACTORS)).toBe('4.50');
    expect(costShown('0.018000', 'g', FACTORS)).toBe('0.02');
  });

  // ⚠️⚠️ AN EMPTY BOX AND NOT C3.12's DASH. The dash is what a READ-ONLY price
  // shows; a box holding `—` is a box whose first keystroke produces `—8`.
  it('is empty when there is nothing to put in it', () => {
    expect(costShown(undefined, 'kg', FACTORS)).toBe('');
    expect(costShown(null, 'kg', FACTORS)).toBe('');
    expect(costShown('', 'kg', FACTORS)).toBe('');
  });

  // ⚠️ A UNIT THIS PHONE HAS NOT READ IS EMPTY AND NOT A GUESS — `stepOf`'s rule,
  // and the reason C3.13 blocks the commit rather than sending something.
  it('is empty for a unit the phone has not read', () => {
    expect(costShown('0.018000', 'caja', FACTORS)).toBe('');
  });

  // ⚠️⚠️ THE CLAIM THAT MATTERS, AND IT IS THE ROUND TRIP RATHER THAN EITHER
  // HALF. The store holds what `record_purchase` will be SENT and the box shows
  // it back; if `costShown` and `typedPerBase` disagreed by one centavo, a price
  // she typed would return as a DIFFERENT price and nothing on the screen would
  // say which one the ledger got.
  it('agrees with typedPerBase in both directions, at every price unit', () => {
    for (const unit of ['g', 'kg', '250g', 'pza']) {
      for (const centavos of [1, 50, 99, 850, 1800, 123456]) {
        const perBase = typedPerBase(centavos, unit, FACTORS);
        expect(perBase).not.toBeNull();
        // What the box shows is exactly what she typed, to the centavo.
        expect(costShown(perBase, unit, FACTORS)).toBe(
          `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`,
        );
      }
    }
  });

  // ⚠️ AND THE OTHER DIRECTION OF THE SAME IDENTITY: a figure read back out of
  // the box and re-committed must not move. This is what a shopkeeper does every
  // time she taps a prefilled row and leaves it alone.
  it('is stable under a read-then-write of a remembered figure', () => {
    const remembered = '0.018000';
    const shown = costShown(remembered, 'kg', FACTORS);
    const again = typedPerBase(Number(shown.replace('.', '')), 'kg', FACTORS);
    expect(costShown(again, 'kg', FACTORS)).toBe(shown);
  });

  // ⚠️ AN EXPLICIT ZERO SURVIVES AS A ZERO. `typedPerBase` accepts one — the
  // schema does too (`purchase_line_price_non_negative`) — and it is the ABSENT
  // cost C3.13 blocks, not a free delivery somebody meant.
  it('shows an explicit zero rather than an empty box', () => {
    expect(costShown(typedPerBase(0, 'kg', FACTORS), 'kg', FACTORS)).toBe('0.00');
  });
});

describe('which sentence goes under the cost box', () => {
  const memo = { perBase: '0.018000', centavos: 1800, price: '$18.00 / kg', lastUnit: 'kg' };

  it('names where a prefilled figure came from', () => {
    expect(costNote('remembered', memo)).toBe('last-paid');
  });

  it('asks §2.8s question in the middle state', () => {
    expect(costNote('new-pairing', null)).toBe('new-pairing');
  });

  // ⚠️⚠️ THE RULING OF 2026-09-25, AND THIS IS THE ONLY THING IN THIS REPOSITORY
  // THAT HOLDS IT. The owner ruled *"Comprar should be for any role for now"* —
  // so an Empleada uses this screen, her memory read is empty on EVERY row
  // (`provider_price_memory` is manager-and-above, `0003:558`), and
  // `Primera vez con este proveedor` would be **false on every row her shop buys
  // weekly**. `5g-ii` shipped it saying exactly that; one sentence from him
  // overturned it. ⚠️ The box stays empty and required, which IS true for her.
  it('says nothing at all when the memory is fenced rather than absent', () => {
    expect(costNote('unreadable', null)).toBeNull();
    expect(costNote('unreadable', memo)).toBeNull();
  });

  // ⚠️ *Not back yet* must never render as *there is nothing* — the same
  // distinction `membershipFrom` makes, and the reason `MemoryState` has four
  // answers rather than three even though two of them are silent today.
  it('says nothing while the read is still in flight', () => {
    expect(costNote('unknown', null)).toBeNull();
  });

  // ⚠️ A STATE THAT CLAIMS TO KNOW AND CARRIES NOTHING IS A BUG, and announcing it
  // as *first time* would hide it behind a legitimate-looking sentence.
  it('falls silent rather than claiming a first time it cannot support', () => {
    expect(costNote('remembered', null)).toBeNull();
  });
});

// ============================================================================
// THE ORDER COMPRAR'S CATALOG IS DRAWN IN. Plan task `5g-ii-c`, off the owner's
// own round on his phone: *"the preselected sorter is Recientes but you can also
// pick A-Z."*
//
// ⚠️ THE PILLS THEMSELVES ARE RENDERING AND `R9` FENCES THEM TO HIS PHONE. What
// is here is the only part with a right answer: which row comes first.
// ============================================================================

function entry(over: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id: 'v-1',
    name: 'Manzana',
    familyId: 'f-1',
    familyName: 'Fruta',
    priceUnit: 'kg',
    baseUnit: 'g',
    centavos: 1800,
    perBase: '0.018000',
    price: '$18.00 / kg',
    initials: 'MA',
    term: 'manzana fruta',
    ...over,
  };
}

describe('the order Comprar draws the catalog in', () => {
  const A = entry({ id: 'a', name: 'Zanahoria' });
  const B = entry({ id: 'b', name: 'Ávila queso' });
  const C = entry({ id: 'c', name: 'manzana' });
  const all = [A, B, C] as const;

  it('opens on Recientes, the word the owner chose', () => {
    expect(DEFAULT_SORT).toBe('recent');
  });

  // ⚠️⚠️ FOLDED, NOT `localeCompare` — `R10` bans `Intl.Collator` outright ("a
  // function on Android and unasked on iOS"), and `localeCompare` is the same
  // machinery behind a friendlier name. `searchTerm` strips the accent, so `Ávila`
  // sorts where a Spanish reader expects it and no ICU is on the path.
  it('sorts A-Z on the folded name, so an accent does not sort last', () => {
    expect(sortedForBuying(all, 'az', {}).map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  // ⚠️ AND CASE DOES NOT DECIDE IT EITHER: a raw `<` would put every capital
  // before every lower-case letter, so `Zanahoria` would beat `manzana`.
  it('sorts A-Z without case deciding it', () => {
    const ids = sortedForBuying([A, C] as const, 'az', {}).map((e) => e.id);
    expect(ids).toEqual(['c', 'a']);
  });

  it('sorts Recientes by what this provider sold last, newest first', () => {
    const when = { a: '2026-09-01T00:00:00+00:00', c: '2026-09-20T00:00:00+00:00' };
    expect(sortedForBuying(all, 'recent', when).map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });

  // ⚠️⚠️ THIS ASSERTION IS WEAKER THAN IT LOOKS AND THE COMMENT SAYS SO, because a
  // falsification proved it. It was written to catch *a missing date treated as an
  // empty string*; replacing the `undefined` branches with `aw ?? ''` left it — and
  // every other assertion here — GREEN, because under a descending compare an empty
  // string is the oldest instant and sinks anyway. **What it does hold is the
  // OUTCOME**: an unbought product ends up last. What it cannot see is which of two
  // correct implementations produced that.
  it('sinks a product this provider has never sold, never floats it', () => {
    const when = { a: '2026-09-01T00:00:00+00:00' };
    expect(sortedForBuying(all, 'recent', when).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  // ⚠️ THE WART, ASSERTED SO IT IS A KNOWN SHAPE RATHER THAN A SURPRISE: on a
  // brand-new provider nothing has a date, every row ties, and the order falls
  // back to the one Postgres sent. `5g-ii-c`'s row records the alternative.
  it('falls back to the incoming order on a provider with no history at all', () => {
    expect(sortedForBuying(all, 'recent', {}).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  // ⚠️ IT NEVER SORTS IN PLACE. The array handed in is TanStack Query's cached
  // value, and sorting that would mutate the cache — the next render would read an
  // order nobody chose.
  it('leaves the array it was given alone', () => {
    const given = [A, B, C];
    sortedForBuying(given, 'az', {});
    expect(given.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('when this provider last sold each product', () => {
  it('keys the date by variant, for one provider only', () => {
    const rows = [
      memory({ provider_id: 'p-1', variant_id: 'v-1', last_purchased_at: '2026-09-20T00:00:00+00:00' }),
      memory({ provider_id: 'p-2', variant_id: 'v-2', last_purchased_at: '2026-09-21T00:00:00+00:00' }),
    ];
    expect(lastPurchasedFor(rows, 'p-1')).toEqual({ 'v-1': '2026-09-20T00:00:00+00:00' });
  });

  // ⚠️ A ROW THE VIEW SENT WITH NO DATE IS NOT A KEY AT ALL, because `sortedForBuying`
  // distinguishes *absent* from *old* and an empty string would read as the oldest
  // possible instant.
  it('drops a row carrying no date rather than keying it empty', () => {
    expect(lastPurchasedFor([memory({ last_purchased_at: null })], 'p-1')).toEqual({});
  });

  it('is empty before a provider is chosen', () => {
    expect(lastPurchasedFor([memory()], null)).toEqual({});
  });

  // ⚠️ THE COLUMN IS ASKED FOR, which is what makes all of the above reachable on a
  // phone. `docs/checks/5g-i-purchase-contract.sh` is what proves the DATABASE still
  // sends it; this asserts the app still asks.
  it('asks the view for the date at all', () => {
    expect(MEMORY_COLUMNS).toContain('last_purchased_at');
  });
});

// ============================================================================
// THE DOCUMENT THAT HAS NOT BEEN SENT YET — the whole instrument for plan task
// `5h-ii-c`.
//
// ⚠️⚠️ WHAT THIS SUITE IS ACTUALLY FOR, AND IT IS NOT THE RENDERING. Everything
// here is a claim about a write that exists ONLY on a phone with no signal — the
// pilot store's ordinary condition ([[pilot-store-is-offline-a-lot]]) — so there
// is no server to ask, no contract check that can drive it, and no fixture a
// database can hold. **This file is the only instrument these rules will ever
// have**, which is the opposite of `5h-ii-a` and `5h-ii-b`, whose claims were all
// about the wire.
//
// THE RULES THAT WOULD HAVE GONE IN WRONG SILENTLY:
//
//   1. A `dead` ROW IS NOT SHOWN AND A `flushing` ONE IS. The first has its own
//      banner and §2.6 says replay is ours; the second is about to land and she
//      has every reason to expect to see it.
//   2. ONLY A `pending` ROW MAY BE DROPPED. `flushing` has an RPC in the air whose
//      reply may be a success, so deleting it destroys the phone's only record of
//      a write that LANDED.
//   3. A QUEUED ROW WHOSE ID IS ALREADY IN THE SERVER'S LIST DISAPPEARS. The
//      client uuid IS the server row's id, so the window between a successful
//      RPC and `forget` would otherwise show one delivery twice.
//   4. `createdBy` IS `null`, WHICH MAKES `mayCorrect` ANSWER `true` — the
//      owner's ruling of 2026-09-26 satisfied by the data rather than by a
//      branch. A later tightening of `mayCorrect` that stopped failing open would
//      silently fence this whole list, and only this assertion would see it.
//   5. `prefillOf` REBUILDS THE CART FROM AN UNSENT ROW UNCHANGED, prices and
//      all, because the queue stores the very string `record_purchase` takes.
//   6. THE DAY IS THE DEVICE'S AND COMES FROM `queuedAt`, not from `Date.now()`
//      and not from a UTC slice — so it does not move when the row lands.
//   7. `waste` AND `transfer` ARE NOT DOCUMENTS HERE. `WriteKind` has four
//      members and this list has two.
//
// ⚠️ THE REST IS `R9`: whether the group reads as separate from the seven days
// below it is the owner's phone, and nothing here pretends otherwise.
// ============================================================================

import { describe, expect, it } from 'vitest';

import { mayCorrect, prefillOf } from '@/api/corrections';
import type { CatalogEntry } from '@/api/catalog';
import { DOCUMENT_KINDS, type ShopDocument } from '@/api/documents';
import { DROPPABLE_STATE, WRITE_KINDS, type OutboxState, type QueuedWrite, type WriteKind } from '@/api/outbox';
import type { Provider } from '@/api/providers';
import { NO_UNIT_FACTORS, type UnitFactors } from '@/offline/deadLetters';
import {
  NOTHING_UNSENT,
  UNSENT_STATES,
  correctionAsk,
  droppable,
  unsentDocuments,
} from '@/offline/unsent';
import { ES } from '@/strings';

/** `0001`'s own seed, as the units these cases need. */
const FACTORS: UnitFactors = {
  kg: '1000.000000',
  g: '1.000000',
  pza: '1.000000',
};

const JUAN = '11111111-1111-4111-8111-111111111111';
const GENERIC = '22222222-2222-4222-8222-222222222222';
const TOMATE = '33333333-3333-4333-8333-333333333333';
const CEBOLLA = '44444444-4444-4444-8444-444444444444';
const SHOP = '55555555-5555-4555-8555-555555555555';
const STORE = '66666666-6666-4666-8666-666666666666';

const PROVIDERS: readonly Provider[] = [
  { id: JUAN, name: 'Juan Frutas', isGeneric: false },
  { id: GENERIC, name: 'Genérico', isGeneric: true },
];

function entry(id: string, name: string): CatalogEntry {
  return {
    id,
    name,
    familyId: 'f',
    familyName: 'Verdura',
    priceUnit: 'kg',
    baseUnit: 'g',
    centavos: 1000,
    perBase: '0.010000',
    price: '$10.00',
    initials: 'V',
    term: name.toLowerCase(),
  };
}

const ENTRIES: readonly CatalogEntry[] = [entry(TOMATE, 'Tomate'), entry(CEBOLLA, 'Cebolla')];

/**
 * A queued delivery.
 *
 * ⚠️ THE PAYLOAD IS `draftOf`'s OWN SHAPE AND NOT A GUESS — `location_id`,
 * `provider_id` and a `lines` array of `variant_id` / `qty_display` /
 * `qty_display_unit` / `unit_price_net_per_base`, keyed by ARGUMENT NAME with no
 * `p_` prefix, which is `0026`'s spelling and what the queue actually stores.
 */
function purchase(over: Partial<QueuedWrite> = {}): QueuedWrite {
  return {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    workspaceId: SHOP,
    kind: 'purchase',
    state: 'pending',
    attempts: 0,
    // ⚠️ A LOCAL INSTANT AND NOT A `Z` STRING — [[local-time-tests-need-a-pinned-tz]].
    // The Mac this runs on is UTC−6 and CI is UTC, and `dayOf` answers the
    // DEVICE's day, so a fixture built from a local `Date` holds on both.
    queuedAt: new Date(2026, 8, 25, 19, 30, 0).toISOString(),
    payload: {
      location_id: STORE,
      provider_id: JUAN,
      lines: [
        {
          variant_id: TOMATE,
          qty_display: '12.000',
          qty_display_unit: 'kg',
          unit_price_net_per_base: '0.020000',
        },
      ],
    },
    ...over,
  };
}

function sale(over: Partial<QueuedWrite> = {}): QueuedWrite {
  return {
    id: 'bbbbbbbb-0000-4000-8000-000000000002',
    workspaceId: SHOP,
    kind: 'sale',
    state: 'pending',
    attempts: 0,
    queuedAt: new Date(2026, 8, 25, 11, 0, 0).toISOString(),
    payload: {
      location_id: STORE,
      lines: [
        {
          variant_id: CEBOLLA,
          qty_display: '2.000',
          qty_display_unit: 'kg',
          unit_price_gross_per_base: '0.035000',
        },
      ],
    },
    ...over,
  };
}

/**
 * A queued WRITE-OFF — the shape `6a-i`'s cart puts in the outbox.
 *
 * ⚠️ ONE CAUSE ON EVERY LINE, because that is what `6a-i` sends: the cause is
 * chosen BEFORE the catalog and is the document's, while `0019` stores it on
 * each LINE. The mixed shape is reachable through `record_waste` and not through
 * this app, and the test below builds it by hand for exactly that reason.
 *
 * ⚠️ `unit_price_gross_per_base` AND NOT THE NET SPELLING — `0019` takes gross
 * (`PRICE_KEY.waste`), which is the sale side's, because `MONEY_KIND.waste` is
 * `'sell'`.
 */
function wasteWrite(over: Partial<QueuedWrite> = {}): QueuedWrite {
  return {
    id: 'cccccccc-0000-4000-8000-000000000003',
    workspaceId: SHOP,
    kind: 'waste',
    state: 'pending',
    attempts: 0,
    queuedAt: new Date(2026, 8, 25, 16, 0, 0).toISOString(),
    payload: {
      location_id: STORE,
      lines: [
        {
          variant_id: TOMATE,
          qty_display: '4.000',
          qty_display_unit: 'kg',
          unit_price_gross_per_base: '0.035000',
          reason: 'caducado',
        },
      ],
    },
    ...over,
  };
}

function shown(queue: readonly QueuedWrite[], kind = DOCUMENT_KINDS[0], landed: readonly ShopDocument[] = []) {
  return unsentDocuments({
    queue,
    kind,
    factors: FACTORS,
    entries: ENTRIES,
    providers: PROVIDERS,
    landed,
  });
}

describe('which rows the unsent group shows', () => {
  it('reads a delivery a shopkeeper would recognise', () => {
    const [one, ...rest] = shown([purchase()]);
    expect(rest).toEqual([]);
    expect(one.id).toBe('aaaaaaaa-0000-4000-8000-000000000001');
    expect(one.kind).toBe('purchase');
    expect(one.counterparty).toBe('Juan Frutas');
    expect(one.providerId).toBe(JUAN);
    // 12 kg at 0.02 per gram: 12 × 1000 × 0.02 = 240 pesos, NET, and a purchase
    // line is net so that is the whole of it.
    expect(one.grossCentavos).toBe(24_000);
    // ⚠️ `$240` AND NOT `$240.00` — C12.2: the centavos are hidden at zero and
    // exactly two when present, and `formatMXN` is the one answer to that.
    expect(one.amount).toBe('$240');
    expect(one.lines).toHaveLength(1);
    expect(one.lines[0].name).toBe('Tomate');
    expect(one.lines[0].quantity).toBe('12 kg');
    expect(one.lines[0].amount).toBe('$240');
  });

  // RULE 1. Two states show and one does not, and the reasons are different.
  it('shows pending and flushing, and never a dead letter', () => {
    expect([...UNSENT_STATES]).toEqual(['pending', 'flushing']);
    for (const state of ['pending', 'flushing'] as const) {
      expect(shown([purchase({ state })])).toHaveLength(1);
    }
    expect(shown([purchase({ state: 'dead' })])).toEqual([]);
  });

  // RULE 7. `WriteKind` has four members; a document has two.
  it('shows only the two kinds this list is about', () => {
    expect([...WRITE_KINDS]).toEqual(['purchase', 'sale', 'waste', 'transfer']);
    for (const kind of ['waste', 'transfer'] as WriteKind[]) {
      expect(shown([purchase({ kind })])).toEqual([]);
      expect(shown([purchase({ kind })], 'sale')).toEqual([]);
    }
  });

  it('keeps each kind to its own tab', () => {
    const queue = [purchase(), sale()];
    expect(shown(queue, 'purchase').map((d) => d.kind)).toEqual(['purchase']);
    expect(shown(queue, 'sale').map((d) => d.kind)).toEqual(['sale']);
  });

  // RULE 3. The window between a successful RPC and `forget`.
  it('drops a queued row the server has already answered with', () => {
    const queued = purchase({ state: 'flushing' });
    const landed = [{ id: queued.id } as ShopDocument];
    expect(shown([queued])).toHaveLength(1);
    expect(shown([queued], 'purchase', landed)).toEqual([]);
  });

  // ⚠️ AGAINST A CALENDAR AND NOT AGAINST THE ARRAY'S OWN ORDER —
  // [[assert-against-a-calendar-not-the-array]]. The queue is read OLDEST first
  // by `readQueue`, so this is the reversal and the fixture says so by being
  // given in the wrong order.
  it('puts the newest first, whatever order the queue was read in', () => {
    const older = purchase({ id: 'aaaaaaaa-0000-4000-8000-00000000000a', queuedAt: new Date(2026, 8, 24, 8, 0).toISOString() });
    const newer = purchase({ id: 'aaaaaaaa-0000-4000-8000-00000000000b', queuedAt: new Date(2026, 8, 26, 8, 0).toISOString() });
    expect(shown([older, newer]).map((d) => d.day)).toEqual(['2026-09-26', '2026-09-24']);
    expect(shown([newer, older]).map((d) => d.day)).toEqual(['2026-09-26', '2026-09-24']);
  });

  // ⚠️ A TOTAL ORDER AND NOT MERELY A DESCENDING ONE: one basket committed twice
  // in the same millisecond is exactly the duplicate this screen exists to catch.
  it('breaks a tie on the id so the list cannot reshuffle', () => {
    const at = new Date(2026, 8, 25, 9, 0).toISOString();
    const first = purchase({ id: 'aaaaaaaa-0000-4000-8000-00000000000a', queuedAt: at });
    const second = purchase({ id: 'aaaaaaaa-0000-4000-8000-00000000000b', queuedAt: at });
    expect(shown([first, second]).map((d) => d.id)).toEqual([second.id, first.id]);
    expect(shown([second, first]).map((d) => d.id)).toEqual([second.id, first.id]);
  });

  // RULE 6. The device's day, off `queuedAt`.
  it('names the day the shopkeeper was standing in, not the UTC one', () => {
    // 19:30 local on the 25th. In a UTC−6 shop the UTC instant is the 26th, and
    // `slice(0, 10)` would say so — which is the `Costos` defect `5g-iii-b` fixed.
    const at = new Date(2026, 8, 25, 19, 30, 0);
    const [one] = shown([purchase({ queuedAt: at.toISOString() })]);
    expect(one.day).toBe('2026-09-25');
    expect(one.at).toBe(at.toISOString());
  });

  it('drops a row whose queuedAt is not an instant rather than rendering NaN', () => {
    expect(shown([purchase({ queuedAt: 'el martes' })])).toEqual([]);
    expect(shown([purchase({ queuedAt: '' })])).toEqual([]);
  });

  it('is an empty list when the queue is empty', () => {
    expect(shown([])).toEqual([]);
    expect(NOTHING_UNSENT).toEqual([]);
    expect(Object.isFrozen(NOTHING_UNSENT)).toBe(true);
  });
});

describe('what an unsent row says when this phone knows less', () => {
  // ⚠️⚠️ THE LIKELY CASE RATHER THAN THE RARE ONE: `QueryProvider` persists
  // nothing, so a phone restarted with no signal has an EMPTY catalog.
  it('prices a delivery it cannot name a single line of', () => {
    const [one] = unsentDocuments({
      queue: [purchase()],
      kind: 'purchase',
      factors: FACTORS,
      entries: [],
      providers: PROVIDERS,
      landed: [],
    });
    expect(one.amount).toBe('$240');
    expect(one.lines[0].name).toBe(ES.documents.unknownProduct);
    // ⚠️ THE VARIANT ID SURVIVES, which is what lets `prefillOf` rebuild the cart
    // even though nothing on screen could be named.
    expect(one.lines[0].variantId).toBe(TOMATE);
  });

  // ⚠️ WITHHELD AND NEVER `$0.00`: a delivery worth nothing and one this phone
  // could not price look identical to a shopkeeper and are opposites.
  it('withholds the figure when the unit table has not arrived', () => {
    const [one] = unsentDocuments({
      queue: [purchase()],
      kind: 'purchase',
      factors: NO_UNIT_FACTORS,
      entries: ENTRIES,
      providers: PROVIDERS,
      landed: [],
    });
    expect(one.grossCentavos).toBeNull();
    expect(one.amount).toBe(ES.documents.noFigure);
    expect(one.amount).not.toContain('0.00');
  });

  it('shows no counterparty until the directory arrives, and never a uuid', () => {
    const [one] = unsentDocuments({
      queue: [purchase()],
      kind: 'purchase',
      factors: FACTORS,
      entries: ENTRIES,
      providers: [],
      landed: [],
    });
    expect(one.counterparty).toBeNull();
    expect(one.providerId).toBe(JUAN);
  });

  it('calls a direct purchase what a shopkeeper calls it', () => {
    const [one] = shown([purchase({ payload: { ...purchase().payload, provider_id: GENERIC } })]);
    expect(one.counterparty).toBe(ES.costs.generic);
    expect(one.counterparty).not.toBe('Genérico');
  });

  it('gives a sale no counterparty at all', () => {
    const [one] = shown([sale()], 'sale');
    expect(one.counterparty).toBeNull();
    expect(one.providerId).toBeNull();
  });

  it('survives a payload with no lines rather than throwing at a counter', () => {
    const [one] = shown([purchase({ payload: { location_id: STORE, provider_id: JUAN } })]);
    expect(one.lines).toEqual([]);
    expect(one.amount).toBe(ES.documents.noFigure);
  });
});

describe('who may take one out of the queue, and which', () => {
  // RULE 2. The client's reading of the fence. The enforcement is one SQL
  // predicate in `@/lib/outboxDb`, bound to the same constant.
  it('drops a pending row and refuses the other two', () => {
    expect(DROPPABLE_STATE).toBe('pending');
    expect(droppable(purchase({ state: 'pending' }))).toBe(true);
    expect(droppable(purchase({ state: 'flushing' }))).toBe(false);
    expect(droppable(purchase({ state: 'dead' }))).toBe(false);
  });

  it('agrees with the state list about which shown row is droppable', () => {
    // Every state this list shows is either droppable or explicitly not, and
    // there is no fourth answer — a state added to `OUTBOX_STATES` without a
    // reading here is what this walks.
    const seen = new Set<OutboxState>();
    for (const state of UNSENT_STATES) {
      seen.add(state);
      expect(typeof droppable(purchase({ state }))).toBe('boolean');
    }
    expect(seen.has(DROPPABLE_STATE)).toBe(true);
  });

  // RULE 4. The owner's ruling of 2026-09-26 — anybody signed in on the phone the
  // row is sitting on — held by the DATA and not by a branch.
  it('lets every role correct an unsent row, because nothing recorded an author', () => {
    const [one] = shown([purchase()]);
    expect(one.createdBy).toBeNull();
    const somebodyElse = '77777777-7777-4777-8777-777777777777';
    for (const role of ['owner', 'manager', 'staff'] as const) {
      expect(mayCorrect(one, role, somebodyElse)).toBe(true);
    }
    expect(mayCorrect(one, null, null)).toBe(true);
  });
});

describe('re-keying an unsent note', () => {
  // RULE 5. `prefillOf` unchanged, and the buy-side price round-trips to the
  // digit because the queue stores the very string `record_purchase` takes.
  it('rebuilds the delivery exactly, prices and all', () => {
    const [one] = shown([purchase()]);
    const prefill = prefillOf(one);
    expect(prefill.kind).toBe('buy');
    expect(prefill.providerId).toBe(JUAN);
    expect(prefill.dropped).toBe(0);
    // 12 kg in thousandths of a gram — the integer a `CartLine` holds.
    expect(prefill.lines).toEqual([{ variantId: TOMATE, base: 12_000_000 }]);
    expect(prefill.quotes[TOMATE]).toBe('0.020000');
  });

  // ⚠️ THE SALE SIDE IS RE-PRICED AT THE SHELF, which is `5h-ii-b`'s reported
  // decision and is unchanged here: the payload carries a GROSS per base and
  // `sale_line` stores a NET, so this phone holds no figure `setPrice` could take.
  it('hands a sale no price, so Vender quotes the shelf', () => {
    const [one] = shown([sale()], 'sale');
    expect(one.lines[0].perBase).toBeNull();
    expect(prefillOf(one).quotes).toEqual({});
    expect(prefillOf(one).lines).toEqual([{ variantId: CEBOLLA, base: 2_000_000 }]);
  });

  // ⚠️ A SHORT CART SHE CAN SEE BEATS A WRONG NUMBER IN THE LEDGER — `prefillOf`
  // drops a line with no readable base and COUNTS it.
  it('drops a line it cannot convert and says how many', () => {
    const [one] = shown([
      purchase({
        payload: {
          location_id: STORE,
          provider_id: JUAN,
          lines: [
            { variant_id: TOMATE, qty_display: '12.000', qty_display_unit: 'kg', unit_price_net_per_base: '0.020000' },
            // ⚠️ AN UNKNOWN UNIT IS `null` AND NEVER A GUESS OF 1 — reading `arroba`
            // as a gram would divide the quantity by a thousand and look plausible.
            { variant_id: CEBOLLA, qty_display: '3.000', qty_display_unit: 'arroba', unit_price_net_per_base: '0.010000' },
          ],
        },
      }),
    ]);
    expect(one.lines).toHaveLength(2);
    expect(one.lines[1].base).toBeNull();
    expect(one.lines[1].amount).toBe(ES.documents.noFigure);
    // ⚠️ AND THE DOCUMENT'S OWN TOTAL IS WITHHELD RATHER THAN SHRUNK: one
    // unreadable line poisons the whole figure, which is `writeCentavos`' rule.
    expect(one.amount).toBe(ES.documents.noFigure);
    const prefill = prefillOf(one);
    expect(prefill.lines).toEqual([{ variantId: TOMATE, base: 12_000_000 }]);
    expect(prefill.dropped).toBe(1);
  });

  it('gives each line a key that is unique and is obviously not a ledger id', () => {
    const [one] = shown([
      purchase({
        payload: {
          location_id: STORE,
          provider_id: JUAN,
          lines: [
            { variant_id: TOMATE, qty_display: '1.000', qty_display_unit: 'kg', unit_price_net_per_base: '0.010000' },
            { variant_id: CEBOLLA, qty_display: '2.000', qty_display_unit: 'kg', unit_price_net_per_base: '0.010000' },
          ],
        },
      }),
    ]);
    const keys = one.lines.map((l) => l.id);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key.startsWith(`${one.id}:`)).toBe(true);
  });
});

describe('what she is asked before it happens', () => {
  // ⚠️⚠️ THE TWO PAIRS ARE DIFFERENT SENTENCES AND NOT ONE WITH A NOUN SWAPPED,
  // because the ANSWER differs: a voided note stays in the ledger behind a mirror
  // image of itself, an unsent one was never recorded at all.
  it('asks a different question about a note that never left the phone', () => {
    expect(correctionAsk('corregir', false)).toBe(ES.documents.correctAsk);
    expect(correctionAsk('eliminar', false)).toBe(ES.documents.removeAsk);
    expect(correctionAsk('corregir', true)).toBe(ES.documents.unsentCorrectAsk);
    expect(correctionAsk('eliminar', true)).toBe(ES.documents.unsentRemoveAsk);
    expect(correctionAsk('corregir', true)).not.toBe(correctionAsk('corregir', false));
    expect(correctionAsk('eliminar', true)).not.toBe(correctionAsk('eliminar', false));
  });

  // ⚠️ THE ONE FACT THE UNSENT PAIR MUST CARRY: nothing is recorded. It is the
  // difference the owner was shown before he ruled, and a reworded copy of the
  // landed question would have lost it.
  it('tells her an unsent note leaves no record, and the landed one does not claim that', () => {
    expect(ES.documents.unsentRemoveAsk).toContain('no va a quedar registrada');
    expect(ES.documents.removeAsk).not.toContain('registrada');
  });

  // ⚠️ SHE IS NEVER HANDED OUR INTERNAL STATE — [[users-dont-do-bookkeeping]].
  it('says none of the words the queue is called in this repository', () => {
    const said = [
      ES.documents.unsent,
      ES.documents.unsentNote,
      ES.documents.unsentCorrectAsk,
      ES.documents.unsentRemoveAsk,
      ES.documents.unsentGone,
    ].join(' ').toLowerCase();
    for (const ours of ['cola', 'outbox', 'pendiente', 'sincroniz', 'estado', 'error', 'falló']) {
      expect(said).not.toContain(ours);
    }
  });

  // ⚠️ THE REFUSAL IS GOOD NEWS AND MUST READ AS SUCH: the note is fine, it is in
  // the shop's records, and the list below is where it now lives.
  it('sends her to the list below when the drain got there first', () => {
    expect(ES.documents.unsentGone).toContain('ya se envió');
    expect(ES.documents.unsentGone).toContain('abajo');
  });
});

// ----------------------------------------------------------------------------
describe('a write-off that has not been sent — the gap 5h-ii-c named, closing', () => {
  // ⚠️⚠️ THIS IS THE ASSERTION `5h-ii-c` WROTE ITS OWN GAP PARAGRAPH FOR: *"a
  // queued waste is therefore invisible here… it closes when `6a` gets a list of
  // its own."* It closed by `DocumentKind` gaining a member and NOT by an edit
  // to `unsentDocuments` — the kind filter is a comparison rather than a guard,
  // which is what made it free.
  it('appears in the unsent list now that waste is a document kind', () => {
    const list = shown([wasteWrite()], 'waste');
    expect(list).toHaveLength(1);
    expect(list[0]?.kind).toBe('waste');
    expect(list[0]?.lines[0]?.quantity).toBe('4 kg');
  });

  it('stays out of the other two tabs', () => {
    expect(shown([wasteWrite()], 'purchase')).toHaveLength(0);
    expect(shown([wasteWrite()], 'sale')).toHaveLength(0);
  });

  // ⚠️⚠️ THE QUEUED ROW AND THE LANDED ROW MUST WITHHOLD MONEY THE SAME WAY, OR
  // THE SAME DOCUMENT CHANGES SHAPE THE MOMENT IT SYNCS. The arithmetic differs
  // — this path reads the payload, `documentsFrom` reads `total_net` — and the
  // WITHHOLDING is the part that has to agree. Área 9's ruling.
  it('shows no peso figure, exactly as the landed one does not', () => {
    const [document] = shown([wasteWrite()], 'waste');
    expect(document?.amount).toBeNull();
    expect(document?.grossCentavos).toBeNull();
    expect(document?.lines[0]?.amount).toBeNull();
  });

  // ⚠️ AND A QUEUED DELIVERY STILL SHOWS ITS FIGURE, which is the control: the
  // nulls above must be about the kind rather than about a path that stopped
  // pricing anything.
  it('leaves a queued delivery’s figure alone', () => {
    const [document] = shown([purchase()], 'purchase');
    expect(document?.amount).not.toBeNull();
    expect(document?.grossCentavos).not.toBeNull();
  });

  it('carries the cause, off the payload key 0019 reads it under', () => {
    const [document] = shown([wasteWrite()], 'waste');
    expect(document?.cause).toBe(ES.waste.reason.caducado);
    expect(document?.lines[0]?.reason).toBe(ES.waste.reason.caducado);
  });

  // ⚠️ A CAUSE A BUILD NO LONGER KNOWS — the restored-basket case `isWasteReason`
  // exists for. It says nothing rather than rendering the stored string.
  it('says nothing for a cause this build does not know', () => {
    const [document] = shown(
      [
        wasteWrite({
          payload: {
            location_id: STORE,
            lines: [
              {
                variant_id: TOMATE,
                qty_display: '4.000',
                qty_display_unit: 'kg',
                unit_price_gross_per_base: '0.035000',
                reason: 'se lo comió el gato',
              },
            ],
          },
        }),
      ],
      'waste',
    );
    expect(document?.lines[0]?.reason).toBeNull();
    expect(document?.cause).toBeNull();
  });

  it('answers null for the document’s cause when its lines disagree', () => {
    const [document] = shown(
      [
        wasteWrite({
          payload: {
            location_id: STORE,
            lines: [
              { variant_id: TOMATE, qty_display: '4.000', qty_display_unit: 'kg',
                unit_price_gross_per_base: '0.035000', reason: 'caducado' },
              { variant_id: CEBOLLA, qty_display: '1.000', qty_display_unit: 'kg',
                unit_price_gross_per_base: '0.035000', reason: 'dañado' },
            ],
          },
        }),
      ],
      'waste',
    );
    expect(document?.cause).toBeNull();
    expect(document?.lines.map((one) => one.reason)).toEqual([
      ES.waste.reason.caducado,
      ES.waste.reason['dañado'],
    ]);
  });

  // ⚠️ A TRANSFER IS STILL DROPPED, by the same one comparison — it has no list
  // and no counterparty. Asserted so the third kind arriving does not read as
  // *every WriteKind now shows*.
  it('still drops a transfer, which has no list at all', () => {
    for (const kind of DOCUMENT_KINDS) {
      expect(shown([wasteWrite({ kind: 'transfer' } as Partial<QueuedWrite>)], kind)).toHaveLength(0);
    }
  });
});


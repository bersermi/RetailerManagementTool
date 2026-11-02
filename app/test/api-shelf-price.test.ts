import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  catalogFrom,
  priceCentavos,
  unitFactorsFrom,
  type CatalogEntry,
  type UnitRow,
  type VariantRow,
} from '@/api/catalog';
import { pricePerBase } from '@/api/catalogWrite';
import type { FlushReport, Flusher } from '@/api/flush';
import {
  SET_SHELF_PRICE,
  SHELF_PRICE_ARGUMENTS,
  bothFlushers,
  bothReports,
  createPriceFlusher,
  priceArgs,
  priceDrainOrder,
  pricePlan,
  priceReplyFrom,
  queuePrice,
  refusedForGood,
  withLandedPrice,
  withWaitingPrices,
  type PriceDraft,
  type PriceFlushReport,
  type PriceOutcome,
  type PriceState,
  type QueuedPrice,
} from '@/api/shelfPrice';

// ============================================================================
// `8i` — A PRICE SET WITH OR WITHOUT SIGNAL. `@/api/shelfPrice` is the whole of
// what the phone decides; `0074`'s suite (`supabase/tests/0074_…`) is what the
// database decides, and `docs/checks/8i-shelf-price-contract.sh` is the two
// meeting over a real PostgREST. This file reads the migration only as TEXT, to
// hold the names the app sends to the ones it declares.
// ============================================================================

const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');
const MIGRATION = read('../../supabase/migrations/0074_a_price_set_without_signal.sql');

const SHOP = 'aaaaaaaa-0000-4000-8000-000000000001';
const OTHER_SHOP = 'aaaaaaaa-0000-4000-8000-000000000002';
const STORE = 'bbbbbbbb-0000-4000-8000-000000000001';
const PEPSI = 'cccccccc-0000-4000-8000-000000000001';
const LECHE = 'cccccccc-0000-4000-8000-000000000002';
const TODAY = '2026-11-01';

const UNITS: readonly UnitRow[] = [
  { code: 'kg', dimension: 'mass', base_code: 'g', factor_to_base: '1000.000000', display_order: 1 },
  { code: '250g', dimension: 'mass', base_code: 'g', factor_to_base: '250.000000', display_order: 2 },
  { code: 'pza', dimension: 'count', base_code: 'pza', factor_to_base: '1.000000', display_order: 3 },
];
const FACTORS = unitFactorsFrom(UNITS);

function variant(over: Partial<VariantRow> = {}): VariantRow {
  return {
    id: PEPSI,
    name: 'Pepsi 600 ml',
    family_id: 'f-1',
    price_unit_code: 'pza',
    base_unit_code: 'pza',
    is_active: true,
    template_code: null,
    is_prebuilt: true,
    product_family: { id: 'f-1', name: 'Refrescos' },
    price_list: [{ price_per_base: '17.000000', location_id: null }],
    ...over,
  };
}

function entryOf(row: VariantRow, locationId: string | null = null): CatalogEntry {
  const [entry] = catalogFrom([row], FACTORS, locationId);
  return entry;
}

function waiting(over: Partial<QueuedPrice> = {}): QueuedPrice {
  return {
    id: 'dddddddd-0000-4000-8000-000000000001',
    workspaceId: SHOP,
    variantId: PEPSI,
    locationId: null,
    pricePerBase: '20.000000',
    day: TODAY,
    seen: '17.000000',
    state: 'pending',
    attempts: 0,
    queuedAt: '2026-11-01T15:00:00.000Z',
    ...over,
  };
}

// ----------------------------------------------------------------------------
describe('what the app sends is what `0074` declares (R13)', () => {
  it('calls the function the migration creates', () => {
    expect(SET_SHELF_PRICE).toBe('set_shelf_price');
    expect(MIGRATION).toContain(`create function public.${SET_SHELF_PRICE}(`);
  });

  it('⚠️ sends exactly the arguments it declares, in its order — a misspelt one is PGRST202', () => {
    const head = MIGRATION.slice(MIGRATION.indexOf(`create function public.${SET_SHELF_PRICE}(`));
    const declared = head
      .slice(head.indexOf('(') + 1, head.indexOf(')\nreturns'))
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0]);
    expect(declared).toEqual([...SHELF_PRICE_ARGUMENTS]);
    expect(Object.keys(priceArgs(waiting()))).toEqual([...SHELF_PRICE_ARGUMENTS]);
  });

  it('reads the two keys the function answers with', () => {
    expect(MIGRATION).toContain("jsonb_build_object('applied', true, 'already_recorded', true)");
    expect(MIGRATION).toContain("jsonb_build_object('applied', false, 'already_recorded', false)");
  });

  it('sends the price and the day as the phone holds them, and her scope and what she saw', () => {
    expect(priceArgs(waiting({ locationId: STORE, seen: null }))).toEqual({
      p_id: 'dddddddd-0000-4000-8000-000000000001',
      p_variant_id: PEPSI,
      p_price_per_base: '20.000000',
      p_day: TODAY,
      p_location_id: STORE,
      p_seen_price: null,
    });
  });
});

// ----------------------------------------------------------------------------
describe('what one tap of Guardar on the price sheet is', () => {
  const plan = (entry: CatalogEntry, typed: string, factors = FACTORS) =>
    pricePlan({ workspaceId: SHOP, entry, typed, factors, today: TODAY });

  it('an empty box is nothing — it never removes a price', () => {
    expect(plan(entryOf(variant()), '').kind).toBe('empty');
    expect(plan(entryOf(variant()), '  $ ').kind).toBe('empty');
  });

  it('a figure that is not a price says so', () => {
    expect(plan(entryOf(variant()), 'gratis').kind).toBe('unreadable');
    // more decimals than the money column holds
    expect(plan(entryOf(variant()), '35.005').kind).toBe('unreadable');
  });

  it('⚠️ a price it cannot convert because the units have not been read is unreadable, not zero', () => {
    expect(plan(entryOf(variant()), '20', {}).kind).toBe('unreadable');
  });

  it('⚠️ the price it already has is unchanged — no change that never happened in the history', () => {
    expect(plan(entryOf(variant()), '17').kind).toBe('unchanged');
    expect(plan(entryOf(variant()), '$17.00').kind).toBe('unchanged');
  });

  it('a change carries the price she saw, so the shop can tell if somebody changed it since', () => {
    const p = plan(entryOf(variant()), '20');
    expect(p).toEqual({
      kind: 'set',
      draft: {
        workspaceId: SHOP,
        variantId: PEPSI,
        locationId: null,
        pricePerBase: '20.000000',
        day: TODAY,
        seen: '17.000000',
      },
    });
  });

  it('⚠️ a product with no price is priced SHOP-WIDE, seen as none — 5e-i’s decision A', () => {
    const p = plan(entryOf(variant({ price_list: [] })), '18');
    expect(p.kind).toBe('set');
    if (p.kind === 'set') {
      expect(p.draft.locationId).toBeNull();
      expect(p.draft.seen).toBeNull();
    }
  });

  it('⚠️⚠️ a store’s own price is changed as a store price, never as the shop-wide one', () => {
    const row = variant({
      price_list: [
        { price_per_base: '17.000000', location_id: null },
        { price_per_base: '19.000000', location_id: STORE },
      ],
    });
    const atTheStore = plan(entryOf(row, STORE), '21');
    expect(atTheStore.kind === 'set' && atTheStore.draft.locationId).toBe(STORE);
    expect(atTheStore.kind === 'set' && atTheStore.draft.seen).toBe('19.000000');
    // a phone standing in a store with no price of its own changes the shop-wide one
    const shopWide = plan(entryOf(variant(), STORE), '21');
    expect(shopWide.kind === 'set' && shopWide.draft.locationId).toBeNull();
  });

  it('⚠️ the peso figure is divided by the PRICE unit — $45 / 250 g is 0.18 a gram', () => {
    const p = plan(entryOf(variant({ price_unit_code: '250g', base_unit_code: 'g', price_list: [] })), '45');
    expect(p.kind === 'set' && p.draft.pricePerBase).toBe(pricePerBase(4500, '250.000000'));
  });

  it('round-trips through the catalog’s own arithmetic for every seeded unit', () => {
    for (const unit of UNITS) {
      const row = variant({ price_unit_code: unit.code, base_unit_code: unit.base_code, price_list: [] });
      const p = plan(entryOf(row), '35.00');
      expect(p.kind, unit.code).toBe('set');
      if (p.kind === 'set') expect(priceCentavos(p.draft.pricePerBase, FACTORS[unit.code])).toBe(3500);
    }
  });
});

// ----------------------------------------------------------------------------
describe('a price on the phone', () => {
  const draft: PriceDraft = {
    workspaceId: SHOP.toUpperCase(),
    variantId: PEPSI,
    locationId: null,
    pricePerBase: '20.000000',
    day: TODAY,
    seen: null,
  };

  it('waits pending, never tried, under the id made for it — lower-cased', () => {
    const p = queuePrice(draft, { id: 'DDDDDDDD-0000-4000-8000-000000000009', now: '2026-11-01T15:00:00.000Z' });
    expect(p).toEqual({
      ...draft,
      workspaceId: SHOP,
      id: 'dddddddd-0000-4000-8000-000000000009',
      state: 'pending',
      attempts: 0,
      queuedAt: '2026-11-01T15:00:00.000Z',
    });
  });

  it('⚠️ refuses a draft no flush could ever send, rather than leaving it on the phone for good', () => {
    const stamp = { id: 'dddddddd-0000-4000-8000-000000000009', now: '2026-11-01T15:00:00.000Z' };
    expect(queuePrice(draft, { ...stamp, id: 'not-a-uuid' })).toBeNull();
    expect(queuePrice({ ...draft, workspaceId: 'shop' }, stamp)).toBeNull();
    expect(queuePrice({ ...draft, variantId: 'v-1' }, stamp)).toBeNull();
    expect(queuePrice({ ...draft, locationId: 'store' }, stamp)).toBeNull();
    expect(queuePrice({ ...draft, pricePerBase: '-1' }, stamp)).toBeNull();
    expect(queuePrice({ ...draft, pricePerBase: '0.0000001' }, stamp)).toBeNull();
    expect(queuePrice({ ...draft, seen: 'diecisiete' }, stamp)).toBeNull();
    expect(queuePrice({ ...draft, day: '1/11/2026' }, stamp)).toBeNull();
  });
});

// ----------------------------------------------------------------------------
describe('what the shop answered', () => {
  it('her price is the shop’s now — a retry of one it already had included', () => {
    expect(priceReplyFrom({ applied: true, already_recorded: false })).toEqual({ read: true, outcome: 'applied' });
    expect(priceReplyFrom({ applied: true, already_recorded: true })).toEqual({ read: true, outcome: 'applied' });
  });

  it('somebody changed it since: theirs stays', () => {
    expect(priceReplyFrom({ applied: false, already_recorded: false })).toEqual({
      read: true,
      outcome: 'superseded',
    });
  });

  it('⚠️ an answer it cannot read is a retry, never a success', () => {
    for (const odd of [null, [], {}, 'ok', { applied: 'true', already_recorded: false }, { applied: true }]) {
      expect(priceReplyFrom(odd)).toEqual({ read: false });
    }
  });

  it('⚠️⚠️ refused for good is the outbox’s own list — and a disagreeing build is a retry', () => {
    for (const code of ['42501', '22023', '22P02', '23502', '23503', '23505', '23514']) {
      expect(refusedForGood({ code }), code).toBe(true);
    }
    // no function by that name: fixed by the next deploy, so never dropped
    expect(refusedForGood({ code: 'PGRST202' })).toBe(false);
    // the session went stale on the way; the next call refreshes it
    expect(refusedForGood({ code: 'PGRST301' })).toBe(false);
    expect(refusedForGood({ code: 'XX000' })).toBe(false);
    expect(refusedForGood({ message: 'Network request failed' })).toBe(false);
    expect(refusedForGood(new Error('timeout'))).toBe(false);
  });
});

// ----------------------------------------------------------------------------
describe('the price on screen while it waits', () => {
  const rows = [
    variant(),
    variant({
      id: LECHE,
      name: 'Leche',
      price_list: [
        { price_per_base: '25.000000', location_id: null },
        { price_per_base: '27.000000', location_id: STORE },
      ],
    }),
  ];

  it('⚠️ nothing waiting is the read itself — not a copy', () => {
    expect(withWaitingPrices(rows, [], SHOP)).toBe(rows);
    expect(withWaitingPrices(undefined, [waiting()], SHOP)).toBeUndefined();
  });

  it('⚠️⚠️ the price she typed is the price every screen reads, from the moment she typed it', () => {
    const [pepsi] = catalogFrom(withWaitingPrices(rows, [waiting()], SHOP), FACTORS, null);
    expect(pepsi.perBase).toBe('20.000000');
    expect(pepsi.centavos).toBe(2000);
  });

  it('a first price makes an unpriced product priced — so `+` counts and the slide charges it', () => {
    const unpriced = [variant({ price_list: [] })];
    const [pepsi] = catalogFrom(withWaitingPrices(unpriced, [waiting({ seen: null })], SHOP), FACTORS, null);
    expect(pepsi.centavos).toBe(2000);
    expect(pepsi.priceScope).toBeNull();
  });

  it('⚠️ it replaces its own scope and nothing else — a store still reads its own price', () => {
    const shopWide = waiting({ id: 'dddddddd-0000-4000-8000-000000000002', variantId: LECHE, pricePerBase: '26.000000' });
    const laid = withWaitingPrices(rows, [shopWide], SHOP);
    const atStore = catalogFrom(laid, FACTORS, STORE).find((e) => e.id === LECHE);
    const anywhere = catalogFrom(laid, FACTORS, null).find((e) => e.id === LECHE);
    expect(atStore?.perBase).toBe('27.000000');
    expect(atStore?.priceScope).toBe(STORE);
    expect(anywhere?.perBase).toBe('26.000000');
  });

  it('of two waiting for one product, the newest typed is the one on screen', () => {
    const first = waiting({ id: 'dddddddd-0000-4000-8000-000000000003', pricePerBase: '20.000000', queuedAt: '2026-11-01T15:00:00.000Z' });
    const second = waiting({ id: 'dddddddd-0000-4000-8000-000000000004', pricePerBase: '22.000000', seen: '20.000000', queuedAt: '2026-11-01T15:05:00.000Z' });
    const [pepsi] = catalogFrom(withWaitingPrices(rows, [second, first], SHOP), FACTORS, null);
    expect(pepsi.perBase).toBe('22.000000');
  });

  it('⚠️ another shop’s waiting prices are not this catalog’s', () => {
    expect(withWaitingPrices(rows, [waiting({ workspaceId: OTHER_SHOP })], SHOP)).toBe(rows);
    expect(withWaitingPrices(rows, [waiting()], null)).toBe(rows);
  });

  it('a price that landed is written into the cached read for its product and scope only', () => {
    const landed = withLandedPrice(rows, waiting({ variantId: LECHE, pricePerBase: '26.000000' }));
    expect(landed?.find((r) => r.id === LECHE)?.price_list).toEqual([
      { price_per_base: '27.000000', location_id: STORE },
      { price_per_base: '26.000000', location_id: null },
    ]);
    expect(landed?.find((r) => r.id === PEPSI)).toBe(rows[0]);
    expect(withLandedPrice(undefined, waiting())).toBeUndefined();
  });
});

// ----------------------------------------------------------------------------
// THE DRAIN, with every port a stand-in
// ----------------------------------------------------------------------------

function table(initial: readonly QueuedPrice[]) {
  let rows = [...initial];
  const log: string[] = [];
  return {
    log,
    rows: () => rows,
    ports: (send: (args: Readonly<Record<string, unknown>>) => Promise<unknown>) => ({
      read: () => rows,
      settle: (id: string, state: PriceState, attempts: number) => {
        log.push(`settle ${id.slice(-1)} ${state} ${attempts}`);
        rows = rows.map((r) => (r.id === id ? { ...r, state, attempts } : r));
      },
      forget: (id: string) => {
        log.push(`forget ${id.slice(-1)}`);
        rows = rows.filter((r) => r.id !== id);
      },
      send: (args: Readonly<Record<string, unknown>>) => {
        log.push(`send ${String(args.p_id).slice(-1)}`);
        return send(args);
      },
      settled: (price: QueuedPrice, outcome: PriceOutcome) => {
        log.push(`settled ${price.id.slice(-1)} ${outcome}`);
      },
    }),
  };
}

const p1 = waiting({ id: 'dddddddd-0000-4000-8000-000000000001', queuedAt: '2026-11-01T15:00:00.000Z' });
const p2 = waiting({ id: 'dddddddd-0000-4000-8000-000000000002', queuedAt: '2026-11-01T15:01:00.000Z' });
const p3 = waiting({ id: 'dddddddd-0000-4000-8000-000000000003', queuedAt: '2026-11-01T15:02:00.000Z' });

describe('the drain', () => {
  it('sends oldest first, and tells the cache BEFORE the price leaves the table', async () => {
    const t = table([p2, p1]);
    const report = await createPriceFlusher(t.ports(async () => ({ applied: true, already_recorded: false }))).flush();
    expect(report).toEqual({ stop: 'drained', landed: 2, superseded: 0, refused: 0 });
    expect(t.log).toEqual([
      'settle 1 flushing 1', 'send 1', 'settled 1 applied', 'forget 1',
      'settle 2 flushing 1', 'send 2', 'settled 2 applied', 'forget 2',
    ]);
    expect(t.rows()).toEqual([]);
  });

  it('a price that lost to a newer one leaves the phone, and the drain carries on', async () => {
    const answers = [{ applied: false, already_recorded: false }, { applied: true, already_recorded: false }];
    const t = table([p1, p2]);
    const report = await createPriceFlusher(t.ports(async () => answers.shift())).flush();
    expect(report).toEqual({ stop: 'drained', landed: 1, superseded: 1, refused: 0 });
    expect(t.log).toContain('settled 1 superseded');
    expect(t.rows()).toEqual([]);
  });

  it('⚠️⚠️ a price refused for good is dropped — never reported, never blocking the next', async () => {
    const t = table([p1, p2]);
    let first = true;
    const report = await createPriceFlusher(
      t.ports(async () => {
        if (first) {
          first = false;
          throw { code: '42501', message: 'set_shelf_price: only the owner or a manager sets a price' };
        }
        return { applied: true, already_recorded: false };
      }),
    ).flush();
    expect(report).toEqual({ stop: 'drained', landed: 1, superseded: 0, refused: 1 });
    expect(t.log).toContain('settled 1 refused');
    expect(t.rows()).toEqual([]);
  });

  it('⚠️ no signal stops the drain with the price back to pending — the rest wait their turn', async () => {
    const t = table([p1, p2, p3]);
    const report = await createPriceFlusher(
      t.ports(async () => {
        throw { message: 'Network request failed' };
      }),
    ).flush();
    expect(report).toEqual({ stop: 'failed', landed: 0, superseded: 0, refused: 0 });
    expect(t.log).toEqual(['settle 1 flushing 1', 'send 1', 'settle 1 pending 1']);
    expect(t.rows().map((r) => r.state)).toEqual(['pending', 'pending', 'pending']);
  });

  it('⚠️ an odd reply is a retry, never a success', async () => {
    const t = table([p1]);
    const report = await createPriceFlusher(t.ports(async () => 'ok')).flush();
    expect(report.stop).toBe('failed');
    expect(t.rows()).toHaveLength(1);
  });

  it('a price left in flight by a killed app is sent again — the id makes it free', async () => {
    const t = table([{ ...p1, state: 'flushing', attempts: 1 }]);
    const report = await createPriceFlusher(t.ports(async () => ({ applied: true, already_recorded: true }))).flush();
    expect(report.landed).toBe(1);
    expect(t.log).toEqual(['settle 1 pending 1', 'settle 1 flushing 2', 'send 1', 'settled 1 applied', 'forget 1']);
  });

  it('is single-flight: a second call while one runs is busy, not a second pass', async () => {
    let release: () => void = () => undefined;
    const t = table([p1]);
    const flusher = createPriceFlusher(
      t.ports(
        () =>
          new Promise((done) => {
            release = () => done({ applied: true, already_recorded: false });
          }),
      ),
    );
    const first = flusher.flush();
    expect(await flusher.flush()).toEqual({ stop: 'busy', landed: 0, superseded: 0, refused: 0 });
    release();
    expect((await first).landed).toBe(1);
  });

  it('only pending prices are sent, oldest first, ties by id', () => {
    const tie = waiting({ id: 'dddddddd-0000-4000-8000-00000000000a', queuedAt: p1.queuedAt });
    expect(priceDrainOrder([p2, tie, { ...p3, state: 'flushing' }, p1]).map((p) => p.id.slice(-1))).toEqual([
      '1', 'a', '2',
    ]);
  });
});

describe('one drain over the ledger and the prices', () => {
  const ledgerReport = (over: Partial<FlushReport> = {}): FlushReport => ({
    stop: 'drained',
    recovered: 0,
    landed: 0,
    alreadyRecorded: 0,
    retried: 0,
    deadLettered: 0,
    downgraded: 0,
    ...over,
  });
  const priceReport = (over: Partial<PriceFlushReport> = {}): PriceFlushReport => ({
    stop: 'drained',
    landed: 0,
    superseded: 0,
    refused: 0,
    ...over,
  });

  it('⚠️ a price that landed counts as landed — the reconnect toast’s *ya se guardaron*', () => {
    expect(bothReports(ledgerReport({ landed: 2 }), priceReport({ landed: 1 })).landed).toBe(3);
  });

  it('either failing is failing, so the retry ladder runs again', () => {
    expect(bothReports(ledgerReport({ stop: 'failed' }), priceReport()).stop).toBe('failed');
    expect(bothReports(ledgerReport(), priceReport({ stop: 'failed' })).stop).toBe('failed');
    expect(bothReports(ledgerReport(), priceReport()).stop).toBe('drained');
  });

  it('⚠️⚠️ the ledger drains first and the prices always get their turn', async () => {
    const order: string[] = [];
    const ledger: Flusher = {
      flush: async () => {
        order.push('ledger');
        return ledgerReport({ stop: 'failed' });
      },
    };
    const prices = {
      flush: async () => {
        order.push('prices');
        return priceReport({ landed: 1 });
      },
    };
    const report = await bothFlushers(ledger, prices).flush();
    expect(order).toEqual(['ledger', 'prices']);
    expect(report.stop).toBe('failed');
    expect(report.landed).toBe(1);
  });

  it('is single-flight as a whole', async () => {
    let release: () => void = () => undefined;
    const ledger: Flusher = {
      flush: () =>
        new Promise((done) => {
          release = () => done(ledgerReport());
        }),
    };
    const both = bothFlushers(ledger, { flush: async () => priceReport() });
    const first = both.flush();
    expect((await both.flush()).stop).toBe('busy');
    release();
    expect((await first).stop).toBe('drained');
  });
});

// ----------------------------------------------------------------------------
// THE WIRING NO NODE SUITE CAN LOAD, READ AS TEXT
// ----------------------------------------------------------------------------

describe('the wiring', () => {
  const flushRunner = read('../src/lib/flushRunner.ts');
  const commitRunner = read('../src/lib/commitRunner.ts');
  const outboxDb = read('../src/lib/outboxDb.ts');
  const provider = read('../src/api/QueryProvider.tsx');
  const hooks = read('../src/api/hooks.ts');

  it('the app’s one flusher drains the ledger, then the prices', () => {
    expect(flushRunner).toMatch(/instance = bothFlushers\(ledger, prices\);/);
    expect(flushRunner).toMatch(/send: sendShelfPrice,/);
    expect(flushRunner).toMatch(/settled: announcePriceSettled,/);
    // the overlay re-reads once a price has left the table
    expect(flushRunner).toMatch(/forgetPrice\(outboxDb\(\), id\);\s*announcePricesChanged\(\);/);
  });

  it('⚠️ a price is on disk before the screen is told, and the screen before the drain', () => {
    const body = commitRunner.slice(commitRunner.indexOf('export function commitPrice('));
    const order = ['enqueuePrice(outboxDb(), price);', 'announcePricesChanged();', 'queued();'].map((s) =>
      body.indexOf(s),
    );
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('the phone’s table is version 3, and its own table — not a fifth kind in the outbox', () => {
    expect(outboxDb).toMatch(/const SCHEMA_VERSION = 3;/);
    expect(outboxDb).toMatch(/create table if not exists queued_price \(/);
  });

  it('⚠️ every screen reads its prices through the overlay', () => {
    expect(hooks).toMatch(/catalogFrom\(\s*withWaitingPrices\(variants\.data, waiting, shopId\),/);
  });

  it('a price the shop has is written into the cached catalog; one that lost is read again', () => {
    expect(provider).toMatch(/onPriceSettled\(\(price, outcome\) => \{/);
    expect(provider).toMatch(/if \(outcome === 'applied'\) \{\s*client\.setQueryData/);
    expect(provider).toMatch(/withLandedPrice\(rows, price\)/);
    expect(provider).toMatch(/void client\.invalidateQueries\(\{ queryKey: CATALOG_KEY \}\);/);
  });
});

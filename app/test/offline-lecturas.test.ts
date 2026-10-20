import { describe, expect, it } from 'vitest';

import {
  NOTHING_READ,
  documentsLine,
  documentsSpin,
  feedLine,
  shownAmount,
  type DocumentKind,
} from '@/api/documents';
import {
  bestDay,
  boughtBlock,
  compareLine,
  monthSales,
  soldBlock,
  thrownBlock,
  wasteAmount,
  type MonthPurchases,
  type MonthWaste,
} from '@/api/month';
import { historyOf, salesFrom, salesLine, salesStreak, type SalesRow } from '@/api/sales';
import { thrownWords, weekWaits } from '@/api/semana';
import { takingsFrom, takingsLine } from '@/api/today';
import { reasonLabel } from '@/api/waste';
import { ES } from '@/strings';

// ============================================================================
// THE READING SCREENS WITH NO SIGNAL — `8g`, 2026-10-20, the offline report's
// round 3 (the owner's *"Do all the fixes"*). Números, Inicio, Tu semana and Lo
// último, over the one rule in `@/offline/senal`:
//
//   * a read the phone HOLDS is drawn, whatever its last refresh said;
//   * a read it does not hold, with no signal, says `ES.offline.whenSignal` in
//     place of a spinner the library has paused or a *nothing* nobody read;
//   * online — `true`, or `null`, which is unknown and never offline — every
//     line is what it was before this round.
//
// ⚠️ NOTHING HERE READS A LOCAL CLOCK: every day is a `YYYY-MM-DD` string and
// every function under test is calendar arithmetic on it, so no `TZ` is pinned.
// ⚠️ What a screen DRAWS with these words is `R9`'s and the owner's phone's.
// ============================================================================

const TODAY = '2026-10-20';
const MONTH = '2026-10-01';
const WHEN = ES.offline.whenSignal;
const BASES = { pza: 'pza' };

function row(day: string, gross: string): SalesRow {
  return {
    day,
    variant_id: 'coca',
    variant_name: 'Coca-Cola 600 ml',
    family_id: 'f',
    family_name: 'Abarrotes',
    base_unit_code: 'pza',
    qty_base_sold: '1',
    revenue_gross: gross,
  };
}

const NOT_READ = salesFrom(undefined, BASES);
const NONE = salesFrom([], BASES);
const SOLD = salesFrom([row('2026-09-01', '100.00'), row('2026-10-05', '300.00')], BASES);

describe('Números — the sales page', () => {
  it('says the sentence with no signal and nothing read, failed or paused', () => {
    expect(salesLine('unknown', null, false)).toBe(WHEN);
    expect(salesLine('unknown', 'offline', false)).toBe(WHEN);
  });

  it('online it is the spinner and the failure, as before', () => {
    expect(salesLine('unknown', null, true)).toBe('');
    expect(salesLine('unknown', 'offline', true)).toBe(ES.api.errors.offline);
    // ⚠️ `null` is unknown, never offline: a launch does not accuse the wifi.
    expect(salesLine('unknown', null, null)).toBe('');
  });

  it('draws the six months it holds over a refresh that failed', () => {
    expect(salesLine('sales', 'offline', true)).toBe('');
    expect(salesLine('sales', 'offline', false)).toBe('');
    expect(salesLine('nothing', 'offline', false)).toBe(ES.numbers.nothing);
  });
});

describe('Números — Tu mes, VENDISTE', () => {
  const sold = (sales: typeof SOLD) => monthSales(sales.days, MONTH, TODAY);

  it('is Sin dato and the sentence offline with nothing read — never a spinner', () => {
    expect(soldBlock('unknown', null, sold(NOT_READ), false)).toEqual({
      amount: ES.documents.noFigure,
      line: WHEN,
      trend: null,
    });
    expect(soldBlock('unknown', 'offline', sold(NOT_READ), false).line).toBe(WHEN);
  });

  it('online it spins while the read is out and says the failure after, as before', () => {
    expect(soldBlock('unknown', null, sold(NOT_READ), true).amount).toBeNull();
    expect(soldBlock('unknown', null, sold(NOT_READ), null).amount).toBeNull();
    expect(soldBlock('unknown', 'offline', sold(NOT_READ), true)).toEqual({
      amount: ES.documents.noFigure,
      line: ES.api.errors.offline,
      trend: null,
    });
  });

  it('draws the month it holds over a failed refresh, with its comparison and arrow', () => {
    const block = soldBlock(SOLD.state, 'offline', sold(SOLD), false);
    expect(block.amount).toBe(shownAmount(300_00));
    expect(block.line).toBe(compareLine(sold(SOLD)));
    expect(block.line).not.toBe(WHEN);
    expect(block.trend).toBe('up');
  });

  it('a month with nothing sold is $0, and never the sentence', () => {
    expect(soldBlock('nothing', null, sold(NONE), false)).toEqual({ amount: shownAmount(0), line: '', trend: null });
  });

  it('a figure that would not parse is still the failure, signal or not', () => {
    expect(soldBlock('unreadable', null, sold(NOT_READ), false).line).toBe(ES.api.errors.unknown);
  });
});

describe('Números — Tu mes, COMPRASTE and SE TIRÓ', () => {
  const bought: MonthPurchases = { centavos: 1_250_00, deliveries: 3, top: 'Bimbo', suppliers: 2 };
  const thrown: MonthWaste = { pieces: 4, kilos: 0, litres: 0, writeOffs: 2, topReason: 'caducado' };

  it('say the sentence offline with nothing read, whatever the attempt said', () => {
    for (const failed of [null, 'offline'] as const) {
      expect(boughtBlock(null, failed, false)).toEqual({ amount: ES.documents.noFigure, line: WHEN, trend: null });
      expect(thrownBlock(null, failed, false)).toEqual({ amount: ES.documents.noFigure, line: WHEN, trend: null });
    }
  });

  it('online they spin, then say they could not read — as before', () => {
    expect(boughtBlock(null, null, true).amount).toBeNull();
    expect(thrownBlock(null, null, null).amount).toBeNull();
    expect(boughtBlock(null, 'offline', true).line).toBe(ES.numbers.mes.unreadable);
    expect(thrownBlock(null, 'unknown', true).line).toBe(ES.numbers.mes.unreadable);
  });

  // ⚠️⚠️ THE FLIP: one failure used to put *Sin dato* over a figure in hand.
  it('draw the figures they hold over a failed refresh', () => {
    expect(boughtBlock(bought, 'offline', true)).toEqual({
      amount: shownAmount(1_250_00),
      line: ES.numbers.mes.purchases(3, 'Bimbo'),
      trend: null,
    });
    expect(thrownBlock(thrown, 'offline', false)).toEqual({
      amount: wasteAmount(thrown),
      line: ES.numbers.mes.topReason(reasonLabel('caducado')),
      trend: null,
    });
  });
});

describe('Números — the discoveries count history only once it is read', () => {
  it('unread six months are no history at all, never *En 7 días*', () => {
    expect(historyOf(NOT_READ)).toBeNull();
    expect(historyOf(salesFrom([row('2026-10-01', 'cien')], BASES))).toBeNull();
    expect(bestDay(historyOf(NOT_READ), TODAY)).toBeNull();
  });

  it('a shop that has truly sold nothing still sees what opens soon', () => {
    expect(historyOf(NONE)).toEqual([]);
    expect(bestDay(historyOf(NONE), TODAY)).toEqual({ locked: true, have: 0, need: 7 });
  });
});

describe('Inicio — Hoy', () => {
  const full = takingsFrom([{ id: 's1', total_net: '100.00', total_tax: '16.00', reversal_of: null }]);

  it('says the sentence with no signal and nothing read, never *Cargando…*', () => {
    expect(takingsLine(true, null, takingsFrom(undefined), false)).toBe(WHEN);
    expect(takingsLine(true, 'offline', takingsFrom(undefined), false)).toBe(WHEN);
  });

  it('online it loads and fails as before; an unknown signal is not offline', () => {
    expect(takingsLine(true, null, takingsFrom(undefined), true)).toBe(ES.home.loading);
    expect(takingsLine(true, null, takingsFrom(undefined), null)).toBe(ES.home.loading);
    expect(takingsLine(true, 'offline', takingsFrom(undefined), true)).toBe(ES.api.errors.offline);
  });

  it('counts the rows the phone holds, whatever the last refresh said', () => {
    expect(takingsLine(false, 'offline', full, false)).toBe(ES.home.sales(1));
    expect(takingsLine(false, null, takingsFrom([]), false)).toBe(ES.home.sales(0));
  });
});

describe('Inicio — la racha', () => {
  // ⚠️ Today's takings are on the phone and the six months are not: offline
  // after a restart a long streak read *1 día seguido*.
  it('is no streak at all until the six months are read', () => {
    expect(salesStreak(historyOf(NOT_READ), TODAY, true)).toBeNull();
    expect(salesStreak(historyOf(NONE), TODAY, true)).toBe(1);
  });
});

describe('Inicio — Lo último', () => {
  it('says the sentence offline when the week was never read and nothing is unsent', () => {
    expect(feedLine(0, 'unknown', false)).toBe(WHEN);
  });

  it('draws a sale still on the phone rather than either sentence', () => {
    expect(feedLine(1, 'unknown', false)).toBe('');
  });

  it('says *no sales* only when the week was read and held none', () => {
    expect(feedLine(0, 'nothing', false)).toBe(ES.home.feed.none);
    expect(feedLine(0, 'nothing', true)).toBe(ES.home.feed.none);
  });

  it('online it is what it was', () => {
    expect(feedLine(0, 'unknown', true)).toBe(ES.home.feed.none);
    expect(feedLine(0, 'unknown', null)).toBe(ES.home.feed.none);
    expect(feedLine(3, 'some', true)).toBe('');
  });
});

describe('Tu semana', () => {
  const pan = { name: 'Pan de caja', quantity: '3 piezas', reason: 'caducado' as const };

  it('says the sentence on the fourth card when the week’s write-offs were never read', () => {
    expect(thrownWords(null, false, false)).toEqual({ big: WHEN, tip: '' });
  });

  it('says nothing was thrown only when the read answered so', () => {
    expect(thrownWords(null, true, false)).toEqual({
      big: ES.numbers.semana.nothingThrown,
      tip: ES.numbers.semana.nothingTip,
    });
  });

  it('names what was thrown, signal or not', () => {
    expect(thrownWords(pan, true, false)).toEqual({
      big: ES.numbers.semana.thrownBig('3 piezas', 'Pan de caja'),
      tip: ES.numbers.semana.thrownTip('caducado'),
    });
  });

  // ⚠️ ONLINE IS UNCHANGED BY THIS ROUND'S BRIEF, and that includes a read in
  // flight saying *No se tiró nada* — reported to the owner, not decided here.
  it('online it is what it was', () => {
    expect(thrownWords(null, false, true).big).toBe(ES.numbers.semana.nothingThrown);
    expect(thrownWords(null, false, null).big).toBe(ES.numbers.semana.nothingThrown);
  });

  it('the story waits for a signal only when the six months were never read', () => {
    expect(weekWaits('unknown', false)).toBe(true);
    expect(weekWaits('unknown', true)).toBe(false);
    expect(weekWaits('unknown', null)).toBe(false);
    expect(weekWaits('sales', false)).toBe(false);
    expect(weekWaits('unreadable', false)).toBe(false);
  });
});

describe('Lo último — the list', () => {
  const KINDS: readonly DocumentKind[] = ['sale', 'purchase', 'waste'];

  it('says the sentence with no spinner when the week was never read and there is no signal', () => {
    for (const kind of KINDS) {
      for (const failed of [null, 'offline'] as const) {
        const read = { ...NOTHING_READ, failed };
        expect(documentsLine(kind, read, false)).toBe(WHEN);
        expect(documentsSpin(read, false)).toBe(false);
      }
    }
  });

  it('online the spinner turns beside its sentence, as before', () => {
    expect(documentsSpin({ ...NOTHING_READ, failed: null }, true)).toBe(true);
    expect(documentsSpin({ ...NOTHING_READ, failed: null }, null)).toBe(true);
    expect(documentsSpin({ ...NOTHING_READ, failed: 'offline' }, true)).toBe(true);
    expect(documentsLine('sale', { ...NOTHING_READ, failed: null }, true)).toBe(ES.documents.loading);
  });

  it('a week it read is never a spinner, signal or not', () => {
    expect(documentsSpin({ state: 'nothing', documents: [], failed: 'offline' }, false)).toBe(false);
    expect(documentsLine('purchase', { state: 'nothing', documents: [], failed: 'offline' }, false)).toBe(
      ES.documents.nothing.purchase,
    );
  });
});

describe('the sentence', () => {
  it('is the one the owner was shown', () => {
    expect(WHEN).toBe('Se ve cuando haya señal');
  });
});

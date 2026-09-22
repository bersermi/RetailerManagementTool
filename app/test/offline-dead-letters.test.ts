// ============================================================================
// WHAT THE DEAD QUEUE IS WORTH — the whole instrument for plan task 5c-iv-b.
//
// ⚠️⚠️ THIS IS THE HALF OF `5c-iv` THAT HAS A RIGHT ANSWER, AND IT IS THE HALF
// THAT DISAGREES WITH A LEDGER WHEN IT IS WRONG. §2.10's nightly production
// check prices the same `failed_write.payload` with the same module on the
// server side, so a peso figure reached differently here is a number that
// contradicts the vendor's own monitoring — not a banner that looks odd.
//
// THE FIVE RULES THAT WOULD HAVE GONE IN WRONG SILENTLY:
//
//   1. A PURCHASE LINE IS **NET** AND A SALE LINE IS **GROSS** (§2.5 rule 2).
//      Reading a purchase as gross understates it by the IVA on it, and
//      nothing on the shelf looks wrong.
//   2. THE UNIT CONVERSION IS `round(qty_display * factor_to_base, 3)`,
//      HALF-UP AWAY FROM ZERO — Postgres's `round(numeric)`, not
//      `Math.round`, and rounded THERE rather than at the end.
//   3. AN ABSENT `qty_display_unit` IS THE BASE UNIT, FACTOR EXACTLY 1
//      (`0001`'s `unit_base_is_identity`) — the one case that needs no map.
//   4. AN UNPRICEABLE LINE POISONS ITS WHOLE DOCUMENT rather than being
//      skipped, because a smaller sum looks exactly like a correct one.
//   5. A TRANSFER IS WORTH NOTHING AND IS KNOWN TO BE, which is a different
//      answer from "could not be read" and must not collapse into it.
//
// ⚠️ THE REST IS `R9`: whether a banner at the top of every screen is the
// least invasive thing that works is the owner's phone, and nothing here
// pretends otherwise.
// ============================================================================

import { describe, expect, it } from 'vitest';

import type { QueuedWrite, WriteKind, WritePayload } from '@/api/outbox';
import {
  NOTHING_DEAD,
  NO_UNIT_FACTORS,
  PRICE_KEY,
  canSeeDeadLetters,
  deadLetters,
  lineCentavos,
  showsBanner,
  showsValue,
  valueOf,
  writeCentavos,
  type UnitFactors,
} from '@/offline/deadLetters';

/** `0001`'s own seed, as the four units these cases need. */
const FACTORS: UnitFactors = {
  g: '1.000000',
  kg: '1000.000000',
  '100g': '100.000000',
  pza: '1.000000',
  // ⚠️⚠️ NOT ONE OF `0001`'s TEN, AND IT IS HERE TO MAKE RULE 2 ABOVE
  // FALSIFIABLE AT ALL. Every seeded factor is a whole number, so
  // `round(qty_display * factor_to_base, 3)` is a no-op on today's data and an
  // implementation that skipped it would pass every other case in this file.
  // `unit.factor_to_base` is `numeric(14,6)`, so the column permits this and
  // the rule has to hold for it.
  fraccion: '0.000500',
};

let seq = 0;
function uuid(): string {
  seq += 1;
  return `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
}

function write(
  kind: WriteKind,
  payload: WritePayload,
  state: QueuedWrite['state'] = 'dead',
): QueuedWrite {
  return {
    id: uuid(),
    workspaceId: '11111111-1111-4111-8111-111111111111',
    kind,
    payload,
    state,
    attempts: 3,
    queuedAt: '2026-09-22T09:00:00.000Z',
  };
}

/** One sale line: a gross price per base unit, a display quantity, a unit. */
function sold(gross: string, qty: string, unit?: string): WritePayload {
  return {
    variant_id: uuid(),
    unit_price_gross_per_base: gross,
    qty_display: qty,
    ...(unit === undefined ? {} : { qty_display_unit: unit }),
  };
}

function doc(lines: readonly WritePayload[]): WritePayload {
  return { location_id: uuid(), lines };
}

describe('which rows the banner counts', () => {
  it('counts the dead and nothing else', () => {
    const queue = [
      write('sale', doc([sold('0.073000', '250.000', 'g')]), 'pending'),
      write('sale', doc([sold('0.073000', '250.000', 'g')]), 'flushing'),
      write('sale', doc([sold('0.073000', '250.000', 'g')]), 'dead'),
    ];
    expect(deadLetters(queue).map((w) => w.state)).toEqual(['dead']);
  });

  // ⚠️ THE POINT OF THE RULE: being offline all morning is the pilot shop's
  // ordinary condition, so a banner that counted `pending` rows would alarm a
  // manager about writes that are perfectly fine.
  it('an empty queue and a queue of healthy rows are the same answer', () => {
    const healthy = [write('sale', doc([sold('1.000000', '1.000', 'pza')]), 'pending')];
    expect(valueOf([], NO_UNIT_FACTORS)).toEqual(NOTHING_DEAD);
    expect(valueOf(healthy, NO_UNIT_FACTORS)).toEqual(NOTHING_DEAD);
  });
});

describe('a line is priced the way the document is priced', () => {
  // ⚠️ §2.5 RULE 2, AND THE TWO KEYS ARE NOT INTERCHANGEABLE.
  it('reads a sale gross and a purchase net, by the key each kind carries', () => {
    expect(PRICE_KEY.sale).toBe('unit_price_gross_per_base');
    expect(PRICE_KEY.waste).toBe('unit_price_gross_per_base');
    expect(PRICE_KEY.purchase).toBe('unit_price_net_per_base');
    expect(PRICE_KEY.transfer).toBeNull();
  });

  it('prices a sale line from its gross key', () => {
    // $11.60 the piece, one piece.
    expect(lineCentavos('sale', sold('11.600000', '1.000', 'pza'), FACTORS)).toBe(1160);
  });

  it('will not read a purchase line through the sale key', () => {
    const line = { qty_display: '1.000', qty_display_unit: 'pza', unit_price_net_per_base: '11.600000' };
    expect(lineCentavos('purchase', line, FACTORS)).toBe(1160);
    // The same object read as a sale carries no gross key at all.
    expect(lineCentavos('sale', line, FACTORS)).toBeNull();
  });

  // ⚠️ THE CONVERSION IS THE SERVER'S: 250 g at $0.073 the gram is $18.25,
  // and the kilo price of the same goods is a thousand times the factor.
  it('converts the display quantity to base units before pricing it', () => {
    expect(lineCentavos('sale', sold('0.073000', '250.000', 'g'), FACTORS)).toBe(1825);
    expect(lineCentavos('sale', sold('0.073000', '0.250', 'kg'), FACTORS)).toBe(1825);
    expect(lineCentavos('sale', sold('0.073000', '2.500', '100g'), FACTORS)).toBe(1825);
  });

  // ⚠️⚠️ THE QUANTITY IS ROUNDED TO THE THOUSANDTH *BEFORE* IT IS PRICED, half
  // up, which is what `0016`–`0020` do — `round(qty_display * factor_to_base,
  // 3)` — and carrying the unrounded quantity into the anchor instead gives
  // half the answer here. One unit of a factor of 0.0005 is half a base unit,
  // which the ledger rounds UP to one.
  it('rounds the converted quantity to the thousandth before pricing it', () => {
    expect(lineCentavos('sale', sold('1000.000000', '1.000', 'fraccion'), FACTORS)).toBe(100);
  });

  // ⚠️ RULE 3's ANCHOR IS WHERE THE ONLY HALF-CENTAVO TIE IN THE WHOLE RULE
  // CAN OCCUR, and `packages/money`'s header names this exact line: 250 g at
  // $0.26 the kilo is 6.499999999999999 in doubles and rounds DOWN to 6, and
  // is 6.5 exactly in integers and rounds UP to 7.
  it('rounds the anchor half-up in integers, where a double would round down', () => {
    expect(lineCentavos('sale', sold('0.000260', '250.000', 'g'), FACTORS)).toBe(7);
  });

  // ⚠️ `unit_base_is_identity`: a base unit's factor is exactly 1, so the one
  // case that needs no map at all is the one the app can already price today.
  it('treats an absent display unit as the base unit, with no map', () => {
    expect(lineCentavos('sale', sold('11.600000', '1.000'), NO_UNIT_FACTORS)).toBe(1160);
    expect(lineCentavos('sale', sold('11.600000', '1.000', ''), NO_UNIT_FACTORS)).toBe(1160);
  });

  // ⚠️ THE FAILURE THAT WOULD LOOK PLAUSIBLE: reading `kg` as a gram divides a
  // dead purchase's value by a thousand and shows a tidy small number.
  it('refuses an unknown unit rather than assuming a factor of one', () => {
    expect(lineCentavos('sale', sold('0.073000', '0.250', 'kg'), NO_UNIT_FACTORS)).toBeNull();
    expect(lineCentavos('sale', sold('0.073000', '1.000', 'arroba'), FACTORS)).toBeNull();
  });

  it('refuses a line that is not an object, or whose values are not strings', () => {
    expect(lineCentavos('sale', null, FACTORS)).toBeNull();
    expect(lineCentavos('sale', ['11.600000', '1.000'], FACTORS)).toBeNull();
    // ⚠️ A JSON NUMBER IS A DOUBLE, which is the whole reason the money path
    // takes strings — `parseDecimal` refuses one outright.
    expect(lineCentavos('sale', { unit_price_gross_per_base: 11.6, qty_display: '1.000' }, FACTORS))
      .toBeNull();
    expect(lineCentavos('sale', { unit_price_gross_per_base: '11.600000' }, FACTORS)).toBeNull();
  });

  it('refuses a decimal the column could not hold, rather than truncating it', () => {
    // `qty_display` is numeric(14,3); a fourth decimal is a rounding nobody asked for.
    expect(lineCentavos('sale', sold('11.600000', '1.0005', 'pza'), FACTORS)).toBeNull();
    expect(lineCentavos('sale', sold('1.0000005', '1.000', 'pza'), FACTORS)).toBeNull();
  });

  // ⚠️ PRICELESS BY DESIGN, NOT BY OMISSION — and the two must not collapse.
  it('prices a transfer line at nothing, and says so as a number', () => {
    expect(lineCentavos('transfer', { variant_id: uuid(), qty_display: '5.000' }, FACTORS)).toBe(0);
    expect(lineCentavos('transfer', null, FACTORS)).toBe(0);
  });
});

describe('a document is the sum of its rounded lines', () => {
  // ⚠️ §2.5 RULE 5. A total rounded on its own fails to equal the lines it is
  // made of, which is the one place a customer checks the arithmetic by hand.
  it('adds the lines after each has been rounded', () => {
    const payload = doc([
      sold('0.000260', '250.000', 'g'), // 7
      sold('0.000260', '250.000', 'g'), // 7
    ]);
    expect(writeCentavos(write('sale', payload), FACTORS)).toBe(14);
  });

  it('refuses a payload with no lines, or lines that are not an array', () => {
    expect(writeCentavos(write('sale', { location_id: uuid() }), FACTORS)).toBeNull();
    expect(writeCentavos(write('sale', { lines: [] }), FACTORS)).toBeNull();
    expect(writeCentavos(write('sale', { lines: 'one' }), FACTORS)).toBeNull();
  });

  // ⚠️⚠️ THE RULE THAT IS SILENT WHEN IT IS WRONG. Two readable lines out of
  // three is a smaller number that looks exactly like a correct one.
  it('one unreadable line makes the whole document unpriceable', () => {
    const payload = doc([
      sold('11.600000', '1.000', 'pza'),
      sold('11.600000', '1.000', 'arroba'),
    ]);
    expect(writeCentavos(write('sale', payload), FACTORS)).toBeNull();
  });
});

describe('the three numbers the banner is drawn from', () => {
  it('counts every dead document and sums the ones it could price', () => {
    const queue = [
      write('sale', doc([sold('11.600000', '1.000', 'pza')])),
      write('sale', doc([sold('0.073000', '0.250', 'kg')])),
    ];
    expect(valueOf(queue, FACTORS)).toEqual({ count: 2, centavos: 1160 + 1825, complete: true });
  });

  // ⚠️ THE COUNT IS NEVER LOSSY AND THE FIGURE CAN BE. A document is either
  // dead or it is not; what it was worth is a question the payload may not
  // answer, and the honest degradation is to show the count alone.
  it('still counts a document it could not price, and stops being complete', () => {
    const queue = [
      // Quoted in the variant's own base unit — exact with no map at all.
      write('sale', doc([sold('11.600000', '1.000')])),
      write('sale', doc([sold('0.073000', '0.250', 'kg')])),
    ];
    const value = valueOf(queue, NO_UNIT_FACTORS);
    expect(value.count).toBe(2);
    expect(value.centavos).toBe(1160);
    expect(value.complete).toBe(false);
    expect(showsValue(value)).toBe(false);
  });

  // ⚠️ A DEAD TRANSFER IS WORTH NOTHING AND THAT IS AN ANSWER, so it must not
  // drag the figure of the sales beside it into "incomplete".
  it('a dead transfer is complete and worth nothing', () => {
    const transfer = write('transfer', doc([{ variant_id: uuid(), qty_display: '5.000' }]));
    expect(valueOf([transfer], NO_UNIT_FACTORS)).toEqual({
      count: 1,
      centavos: 0,
      complete: true,
    });
    expect(
      valueOf([transfer, write('sale', doc([sold('11.600000', '1.000')]))], NO_UNIT_FACTORS),
    ).toEqual({ count: 2, centavos: 1160, complete: true });
  });

  // ⚠️ `$0.00` READS AS A BROKEN SCREEN, NOT AS A FACT — and C3.17 fences
  // `atencion` to a line priced `$0.00` precisely because that number means
  // "somebody forgot a price" everywhere else in this app.
  it('shows no figure when there is nothing to show', () => {
    expect(showsValue({ count: 1, centavos: 0, complete: true })).toBe(false);
    expect(showsValue({ count: 1, centavos: 1, complete: true })).toBe(true);
    expect(showsValue({ count: 1, centavos: 1160, complete: false })).toBe(false);
  });
});

describe('who may see it', () => {
  // ⚠️⚠️ THE FENCE IS MANAGER AND THE NEIGHBOURING TABLE IS OWNER, and the
  // difference is what the surface hands over: `failed_write_select` gives up
  // `payload`, which can carry cost for any kind; this gives up a count and a
  // figure. §2.7 makes cost manager-and-above at the loosest.
  it('is manager and above, never the person at the counter', () => {
    expect(canSeeDeadLetters('owner')).toBe(true);
    expect(canSeeDeadLetters('manager')).toBe(true);
    expect(canSeeDeadLetters('staff')).toBe(false);
  });

  // ⚠️ `null` IS "NOT KNOWN YET", and drawing on it is a cashier seeing the
  // banner for the second the roster read is out.
  it('draws nothing while the role is unknown', () => {
    expect(canSeeDeadLetters(null)).toBe(false);
    expect(showsBanner(null, { count: 3, centavos: 500, complete: true }, null)).toBe(false);
  });

  it('draws nothing for a cashier, however many are dead', () => {
    expect(showsBanner('staff', { count: 9, centavos: 90_000, complete: true }, null)).toBe(false);
  });
});

describe('the dismissal is keyed to the count, not to the screen', () => {
  const three = { count: 3, centavos: 500, complete: true };

  it('shows when something is dead and nothing has been dismissed', () => {
    expect(showsBanner('manager', three, null)).toBe(true);
  });

  it('shows nothing when nothing is dead', () => {
    expect(showsBanner('manager', NOTHING_DEAD, null)).toBe(false);
  });

  // ⚠️⚠️ THIS IS THE OPPOSITE OF `5c-iv-a`'s RULE, DELIBERATELY. Being offline
  // comes and goes, so that dismissal dies with the screen. A dead letter does
  // not go away on its own — recovery is ours, by hand — so re-offering it on
  // every navigation is nagging somebody about something she has already done
  // everything she can about.
  it('stays dismissed while the count does not change', () => {
    expect(showsBanner('manager', three, 3)).toBe(false);
  });

  it('comes back when a fourth one dies', () => {
    expect(showsBanner('manager', { ...three, count: 4 }, 3)).toBe(true);
  });

  // ⚠️ A REPLAY TAKES ROWS OUT OF THE QUEUE, so the count can fall. A fall must
  // not re-arm the banner: nothing new has happened to tell anybody about.
  it('does not come back when the count falls', () => {
    expect(showsBanner('manager', { ...three, count: 2 }, 3)).toBe(false);
  });
});

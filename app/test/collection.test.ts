import { describe, expect, it } from 'vitest';

import {
  NO_PREFILL,
  PICKUP_DAYS_AHEAD,
  STATUSES,
  addressComplete,
  addressPatch,
  cancelCollectionArgs,
  checkAddress,
  collectionErrorMessage,
  draftReady,
  formatSlot,
  pickupDays,
  pickupBands,
  dayBookable,
  pickupTimes,
  prefillFrom,
  reachesArgs,
  requestCollectionArgs,
  sentToday,
  slotEnd,
  slotTooSoon,
  TOO_SOON_CODE,
  PICKUP_LEAD_MINUTES,
  slotValid,
  toCollectionRequest,
  toStoreAddress,
  whatsappMessage,
  type AddressForm,
  type CollectionDraft,
  type CollectionRequest,
} from '@/api/collection';
import { ES } from '@/strings';

// ============================================================================
// `8k` — TE LO COMPRO AND THE STORE'S ADDRESS, the half with a right answer.
// The owner, 2026-10-16: street, number, ciudad and código postal required; a
// picker in multiples of fifteen minutes from 7 a.m. to 7 p.m. The database's
// half is `supabase/tests/0058_*` and `0059_*`; the wire's is
// `docs/checks/8k-collection-contract.sh`.
// ============================================================================

const FULL: AddressForm = {
  street: ' Sabino ',
  number: '120',
  colonia: '',
  city: 'Ciudad de México',
  postalCode: '06400',
};

describe('8k — the store address the owner requires', () => {
  it('takes the four he named and lets the colonia stay empty', () => {
    expect(checkAddress(FULL)).toBeNull();
  });

  it('names the first missing field, in the order a person fills the form', () => {
    expect(checkAddress({ ...FULL, street: '  ' })).toBe('street');
    expect(checkAddress({ ...FULL, number: '' })).toBe('number');
    expect(checkAddress({ ...FULL, city: '' })).toBe('city');
    expect(checkAddress({ ...FULL, street: '', city: '' })).toBe('street');
  });

  it('wants five digits for the código postal — the leading zero is part of it', () => {
    expect(checkAddress({ ...FULL, postalCode: '6400' })).toBe('postalCode');
    expect(checkAddress({ ...FULL, postalCode: '06 400' })).toBe('postalCode');
    expect(checkAddress({ ...FULL, postalCode: '064000' })).toBe('postalCode');
    expect(checkAddress({ ...FULL, postalCode: ' 06470 ' })).toBeNull();
  });

  it('every issue it can name has a sentence', () => {
    for (const issue of ['street', 'number', 'city', 'postalCode'] as const) {
      expect(ES.address.issues[issue].length).toBeGreaterThan(0);
    }
  });

  it('writes the row trimmed, and an empty colonia as null — 0058 refuses a blank', () => {
    expect(addressPatch(FULL)).toEqual({
      street: 'Sabino',
      street_number: '120',
      colonia: null,
      city: 'Ciudad de México',
      postal_code: '06400',
    });
    expect(addressPatch({ ...FULL, colonia: ' Santa María la Ribera ' }).colonia).toBe(
      'Santa María la Ribera',
    );
  });

  it('reads a row with no address as empty strings, and as not enough for a pickup', () => {
    const none = toStoreAddress({
      id: 'loc-1', name: 'Tienda', street: null, street_number: null,
      colonia: null, city: null, postal_code: null,
    });
    expect(none.street).toBe('');
    expect(addressComplete(none)).toBe(false);
    expect(addressComplete(null)).toBe(false);
    const full = toStoreAddress({
      id: 'loc-1', name: 'Tienda', street: 'Sabino', street_number: '120',
      colonia: null, city: 'CDMX', postal_code: '06400',
    });
    expect(addressComplete(full)).toBe(true);
  });

  it('asks the area with the code trimmed', () => {
    expect(reachesArgs(' 06400 ')).toEqual({ p_postal_code: '06400' });
  });
});

describe('8l — the owner\'s picker: one quarter of an hour, starting 7:00 to 18:45 (0060)', () => {
  const times = pickupTimes();

  it('offers forty-eight starts, from 07:00 to 18:45 — the last quarter ends at 19:00', () => {
    expect(times).toHaveLength(48);
    expect(times[0]).toBe('07:00');
    expect(times[1]).toBe('07:15');
    expect(times[times.length - 1]).toBe('18:45');
  });

  it('offers nothing off the quarter hour', () => {
    for (const t of times) expect(['00', '15', '30', '45']).toContain(t.slice(3));
  });

  it('⚠️ the owner\'s example: 9:45 is 9:45 to 10:00', () => {
    expect(slotEnd('09:45')).toBe('10:00');
    expect(slotEnd('18:45')).toBe('19:00');
    expect(slotEnd('07:00')).toBe('07:15');
  });

  it('refuses what 0060 refuses', () => {
    expect(slotValid('19:00')).toBe(false);
    expect(slotValid('06:45')).toBe(false);
    expect(slotValid('09:10')).toBe(false);
    expect(slotValid('9:00')).toBe(false);
    expect(slotEnd('19:00')).toBeNull();
  });

  it('⚠️ option A (the owner, 2026-10-16): a whole day is every start, in three parts', () => {
    const bands = pickupBands('2026-10-17', '2026-10-16', '09:07');
    expect(bands.map((b) => b.band)).toEqual(['manana', 'tarde', 'atardecer']);
    expect(bands.flatMap((b) => b.starts)).toEqual(times);
    expect(bands[0]!.starts[0]).toBe('07:00');
    expect(bands[0]!.starts[bands[0]!.starts.length - 1]).toBe('11:45');
    expect(bands[1]!.starts[0]).toBe('12:00');
    expect(bands[2]!.starts[0]).toBe('16:00');
    expect(bands[2]!.starts[bands[2]!.starts.length - 1]).toBe('18:45');
  });

  it('⚠️ and today draws nothing inside the five hours — the grid starts at the first it can book', () => {
    // 9:07 → 14:15 is the first; the morning is gone entirely.
    const bands = pickupBands('2026-10-16', '2026-10-16', '09:07');
    expect(bands.map((b) => b.band)).toEqual(['tarde', 'atardecer']);
    expect(bands[0]!.starts[0]).toBe('14:15');
    // 14:00 → nothing left today, and the day says so.
    expect(pickupBands('2026-10-16', '2026-10-16', '14:00')).toEqual([]);
    expect(dayBookable('2026-10-16', '2026-10-16', '14:00')).toBe(false);
    expect(dayBookable('2026-10-17', '2026-10-16', '14:00')).toBe(true);
  });

  it('has a word for each part of the day', () => {
    for (const b of ['manana', 'tarde', 'atardecer'] as const) {
      expect(ES.collection.bands[b].length).toBeGreaterThan(0);
    }
  });

  it('⚠️ the owner\'s five hours (0061): nothing sooner is offered, counted across midnight', () => {
    expect(PICKUP_LEAD_MINUTES).toBe(300);
    // 09:07 → the first open quarter is 14:15.
    expect(slotTooSoon('2026-10-16', '14:00', '2026-10-16', '09:07')).toBe(true);
    expect(slotTooSoon('2026-10-16', '14:15', '2026-10-16', '09:07')).toBe(false);
    // Exactly five hours is enough.
    expect(slotTooSoon('2026-10-16', '14:00', '2026-10-16', '09:00')).toBe(false);
    // 14:00 → today is closed (18:45 is 4h45 away), tomorrow is open.
    expect(slotTooSoon('2026-10-16', '18:45', '2026-10-16', '14:00')).toBe(true);
    expect(slotTooSoon('2026-10-17', '07:00', '2026-10-16', '14:00')).toBe(false);
    // 03:00 → tomorrow's 07:00 is 28 hours away; today's 07:00 is four.
    expect(slotTooSoon('2026-10-16', '07:00', '2026-10-16', '03:00')).toBe(true);
    expect(slotTooSoon('2026-10-16', '08:00', '2026-10-16', '03:00')).toBe(false);
    // 23:30 → tomorrow's 07:00 is 7h30 away; a day gone is gone.
    expect(slotTooSoon('2026-10-17', '07:00', '2026-10-16', '23:30')).toBe(false);
    expect(slotTooSoon('2026-10-15', '18:45', '2026-10-16', '07:00')).toBe(true);
  });

  it('offers today and the fourteen days after it, across a month', () => {
    const days = pickupDays('2026-10-25');
    expect(days).toHaveLength(PICKUP_DAYS_AHEAD + 1);
    expect(days[0]).toBe('2026-10-25');
    expect(days[7]).toBe('2026-11-01');
    expect(days[14]).toBe('2026-11-08');
  });

  it('crosses a year, and reads nothing it cannot read', () => {
    expect(pickupDays('2026-12-31')[1]).toBe('2027-01-01');
    expect(pickupDays('31/12/2026')).toEqual([]);
  });

  it('says a pickup the way the drawing does', () => {
    expect(formatSlot('2026-10-17', '09:45', '2026-10-16')).toBe('Mañana · 9:45 a 10:00');
    expect(formatSlot('2026-10-17', '09:45', '2026-10-16', true)).toBe('Mañana sábado 17, entre 9:45 y 10:00');
    expect(formatSlot('2026-10-19', '11:00', '2026-10-16')).toBe('Lun 19 · 11:00 a 11:15');
  });
});

describe('8k — what a request sends, and how it reads back', () => {
  const draft: CollectionDraft = {
    id: 'req-1',
    locationId: 'loc-1',
    day: '2026-10-17',
    at: '09:45',
    line: {
      variantId: 'var-1', qty: ' 2.5 ', unit: 'kg', condition: 'por caducar',
      packaging: 'cerrado', keeping: 'refrigerado', expiryDate: '2026-10-20',
    },
    photos: [],
    note: '   ',
  };

  it('sends 0059\'s argument names, one line, the quarter\'s end, and a blank note as null', () => {
    expect(requestCollectionArgs(draft)).toEqual({
      p_id: 'req-1',
      p_location_id: 'loc-1',
      p_pickup_date: '2026-10-17',
      p_window_start: '09:45',
      p_window_end: '10:00',
      p_lines: [
        {
          variant_id: 'var-1', qty_display: '2.5', qty_display_unit: 'kg',
          condition: 'por caducar', packaging: 'cerrado', keeping: 'refrigerado',
          expiry_date: '2026-10-20',
        },
      ],
      p_photos: [],
      p_note: null,
    });
    expect(cancelCollectionArgs('req-1')).toEqual({ p_id: 'req-1' });
  });

  it('reads PostgREST\'s HH:MM:SS as the picker\'s HH:MM, and only enviada may be called off', () => {
    const row = {
      id: 'req-1', status: 'enviada' as const, pickup_date: '2026-10-17',
      window_start: '09:00:00', window_end: '10:30:00', lines: [], photos: ['a', 'b'],
      note: null, created_at: '2026-10-16T18:00:00+00:00',
    };
    const read = toCollectionRequest(row);
    expect(read.from).toBe('09:00');
    expect(read.to).toBe('10:30');
    expect(read.photoCount).toBe(2);
    expect(read.cancellable).toBe(true);
    expect(toCollectionRequest({ ...row, status: 'confirmada' }).cancellable).toBe(false);
  });

  it('says 0059\'s and 0061\'s refusals in words, and leaves the rest to every other call\'s', () => {
    expect(collectionErrorMessage({ code: 'TD008' })).toBe(ES.collection.errors.noAddress);
    expect(collectionErrorMessage({ code: 'TD009' })).toBe(ES.collection.errors.outsideArea);
    expect(collectionErrorMessage({ code: 'TD010' })).toBe(ES.collection.errors.tooLateToCancel);
    expect(TOO_SOON_CODE).toBe('TD011');
    expect(collectionErrorMessage({ code: 'TD011' })).toBe(ES.collection.errors.tooSoon);
    expect(collectionErrorMessage({ code: '42501' })).toBe(ES.api.errors.sessionEnded);
  });

  it('has a word for every condition, packaging, keeping and status 0059 knows', () => {
    for (const c of ['bueno', 'por caducar', 'caducado', 'magullado'] as const) {
      expect(ES.collection.conditions[c].length).toBeGreaterThan(0);
    }
    for (const s of ['enviada', 'confirmada', 'recogida', 'cancelada', 'rechazada'] as const) {
      expect(ES.collection.statuses[s].length).toBeGreaterThan(0);
    }
  });

  it('⚠️ knows the five statuses 0060 allows — rechazada is the owner\'s fifth', () => {
    expect([...STATUSES]).toEqual(['enviada', 'confirmada', 'recogida', 'cancelada', 'rechazada']);
    const row = {
      id: 'r', status: 'rechazada' as const, pickup_date: '2026-10-17', window_start: '09:00:00',
      window_end: '09:15:00', lines: [], photos: [], note: null, created_at: '2026-10-16T18:00:00+00:00',
    };
    expect(toCollectionRequest(row).cancellable).toBe(false);
  });
});

function req(over: Partial<CollectionRequest> & { createdAt: string }): CollectionRequest {
  return {
    id: 'r', status: 'enviada', day: '2026-10-17', from: '09:45', to: '10:00',
    lines: [{
      variant_id: 'v', variant_name: 'Alas de pollo', qty_display: '2', qty_display_unit: 'kg',
      condition: 'magullado', packaging: 'abierto', keeping: 'congelado', expiry_date: '2026-10-18',
    }],
    photoCount: 0, note: null, cancellable: true, ...over,
  };
}

describe('8l — the next request starts with the previous one\'s answers', () => {
  it('carries how it is, its packaging, its keeping, its expiry and its pickup — never the product', () => {
    const p = prefillFrom([req({ createdAt: '2026-10-16T15:00:00Z' })], '2026-10-16', '10:00');
    expect(p).toEqual({
      condition: 'magullado', packaging: 'abierto', keeping: 'congelado',
      expiryDate: '2026-10-18', day: '2026-10-17', at: '09:45',
    });
  });

  it('takes the NEWEST request, whatever order they arrive in', () => {
    const older = req({ createdAt: '2026-10-15T15:00:00Z', lines: [{ ...req({ createdAt: '' }).lines[0]!, condition: 'bueno' }] });
    const newer = req({ createdAt: '2026-10-16T15:00:00Z' });
    expect(prefillFrom([older, newer], '2026-10-16', '10:00').condition).toBe('magullado');
    expect(prefillFrom([newer, older], '2026-10-16', '10:00').condition).toBe('magullado');
  });

  it('⚠️ drops a pickup that can no longer be booked, and keeps the rest', () => {
    const past = prefillFrom([req({ createdAt: '2026-10-14T15:00:00Z', day: '2026-10-15' })], '2026-10-16', '08:00');
    expect(past.day).toBeNull();
    expect(past.at).toBeNull();
    expect(past.condition).toBe('magullado');
    const begun = prefillFrom([req({ createdAt: '2026-10-16T13:00:00Z', day: '2026-10-16', from: '09:45' })], '2026-10-16', '10:30');
    expect(begun.day).toBeNull();
    // ⚠️ AND ONE NOW INSIDE THE FIVE HOURS (0061) — 13:00 is four hours from 09:00.
    const near = prefillFrom([req({ createdAt: '2026-10-16T13:00:00Z', day: '2026-10-16', from: '13:00' })], '2026-10-16', '09:00');
    expect(near.at).toBeNull();
  });

  it('starts with nothing chosen when there is no request yet', () => {
    expect(prefillFrom([], '2026-10-16', '10:00')).toEqual(NO_PREFILL);
  });

  it('is ready only when every question has an answer — sin fecha is an answer', () => {
    const answered = { qty: '2', condition: 'bueno' as const, packaging: 'cerrado' as const, keeping: 'ambiente' as const, expiryDate: null };
    expect(draftReady(answered)).toBe(true);
    expect(draftReady({ ...answered, expiryDate: undefined })).toBe(false);
    expect(draftReady({ ...answered, condition: null })).toBe(false);
    expect(draftReady({ ...answered, qty: '0' })).toBe(false);
    expect(draftReady({ ...answered, qty: '2.5555' })).toBe(false);
    expect(draftReady({ ...answered, qty: ' 2.5 ' })).toBe(true);
  });
});

describe('8l — one WhatsApp with all of today\'s', () => {
  const today = '2026-10-16';
  // ⚠️ NOON UTC: the same calendar day on this Mac (UTC−6) and on CI (UTC).
  const mine = [
    req({ id: 'a', createdAt: '2026-10-16T18:00:00Z' }),
    req({ id: 'b', createdAt: '2026-10-16T17:00:00Z', status: 'cancelada', cancellable: false }),
    req({ id: 'c', createdAt: '2026-10-14T18:00:00Z' }),
  ];

  it('is about the requests sent today and still enviada', () => {
    expect(sentToday(mine, today).map((r) => r.id)).toEqual(['a']);
  });

  it('names the shop, each product with its condition and pickup, and the address', () => {
    const address = toStoreAddress({
      id: 'l', name: 'Tienda', street: 'Sabino', street_number: '120',
      colonia: 'Santa María la Ribera', city: 'Ciudad de México', postal_code: '06400',
    });
    expect(whatsappMessage(sentToday(mine, today), 'Pollería Doña Rosa', address, today)).toBe(
      'Hola Wera, soy de Pollería Doña Rosa. Hoy les pedí que recojan:\n' +
        '• Alas de pollo · 2 kg · Mallugado · Mañana · 9:45 a 10:00\n' +
        'En Sabino 120, Santa María la Ribera, Ciudad de México, C.P. 06400.',
    );
  });
});

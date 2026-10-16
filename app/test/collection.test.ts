import { describe, expect, it } from 'vitest';

import {
  PICKUP_DAYS_AHEAD,
  addressComplete,
  addressPatch,
  cancelCollectionArgs,
  checkAddress,
  collectionErrorMessage,
  pickupDays,
  pickupTimes,
  reachesArgs,
  requestCollectionArgs,
  toCollectionRequest,
  toStoreAddress,
  windowValid,
  type AddressForm,
  type CollectionDraft,
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

describe('8k — the owner\'s picker: fifteen minutes at a time, 7:00 to 19:00', () => {
  const times = pickupTimes();

  it('offers forty-nine times, from 07:00 to 19:00 inclusive', () => {
    expect(times).toHaveLength(49);
    expect(times[0]).toBe('07:00');
    expect(times[1]).toBe('07:15');
    expect(times[times.length - 1]).toBe('19:00');
  });

  it('offers nothing off the quarter hour', () => {
    for (const t of times) expect(['00', '15', '30', '45']).toContain(t.slice(3));
  });

  it('accepts a window inside the day, on the quarter hour, start before end', () => {
    expect(windowValid('07:00', '19:00')).toBe(true);
    expect(windowValid('09:15', '09:30')).toBe(true);
  });

  it('refuses what 0059 refuses', () => {
    expect(windowValid('06:45', '08:00')).toBe(false);
    expect(windowValid('18:00', '19:15')).toBe(false);
    expect(windowValid('10:00', '10:00')).toBe(false);
    expect(windowValid('11:00', '10:00')).toBe(false);
    expect(windowValid('09:10', '10:00')).toBe(false);
    expect(windowValid('9:00', '10:00')).toBe(false);
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
});

describe('8k — what a request sends, and how it reads back', () => {
  const draft: CollectionDraft = {
    id: 'req-1',
    locationId: 'loc-1',
    day: '2026-10-17',
    from: '09:00',
    to: '10:30',
    lines: [
      {
        variantId: 'var-1', qty: ' 2.5 ', unit: 'kg', condition: 'por caducar',
        packaging: 'cerrado', keeping: 'refrigerado', expiryDate: '2026-10-20',
      },
    ],
    photos: [],
    note: '   ',
  };

  it('sends 0059\'s argument names, the quantity trimmed, and a blank note as null', () => {
    expect(requestCollectionArgs(draft)).toEqual({
      p_id: 'req-1',
      p_location_id: 'loc-1',
      p_pickup_date: '2026-10-17',
      p_window_start: '09:00',
      p_window_end: '10:30',
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

  it('says 0059\'s three refusals in words, and leaves the rest to every other call\'s', () => {
    expect(collectionErrorMessage({ code: 'TD008' })).toBe(ES.collection.errors.noAddress);
    expect(collectionErrorMessage({ code: 'TD009' })).toBe(ES.collection.errors.outsideArea);
    expect(collectionErrorMessage({ code: 'TD010' })).toBe(ES.collection.errors.tooLateToCancel);
    expect(collectionErrorMessage({ code: '42501' })).toBe(ES.api.errors.sessionEnded);
  });

  it('has a word for every condition, packaging, keeping and status 0059 knows', () => {
    for (const c of ['bueno', 'por caducar', 'caducado', 'magullado'] as const) {
      expect(ES.collection.conditions[c].length).toBeGreaterThan(0);
    }
    for (const s of ['enviada', 'confirmada', 'recogida', 'cancelada'] as const) {
      expect(ES.collection.statuses[s].length).toBeGreaterThan(0);
    }
  });
});

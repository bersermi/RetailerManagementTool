import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  DIRECTIONS_MAX,
  EMPTY_ADDRESS,
  PLACES_KEY,
  PLACE_ACTIVE_COLUMN,
  PLACE_COLUMNS,
  PLACE_ORDER,
  PLACE_OWNER_COLUMN,
  PLACE_TABLE,
  POSTAL_CODE_SHAPE,
  SET_STORE_ADDRESS,
  SET_STORE_PIN,
  addressComplete,
  addressLine,
  checkAddress,
  directionsFrom,
  pinFrom,
  placeKey,
  sameAddress,
  setStoreAddressArgs,
  setStorePinArgs,
  sixDecimals,
  toPlace,
  type PlaceRow,
} from '@/api/place';
import { ES } from '@/strings';
import { ES as WERA } from '../../app/src/strings';

// ============================================================================
// WHERE HER KITCHEN HANDS FOOD OVER: the read, the address and the pin, as the
// app sends them. Plan task `10.4b-iii-b`.
//
// ⚠️ WHAT ONLY A REAL DATABASE CAN SAY — that the names are ones PostgREST
// answers, that the read is HER KITCHEN'S place and never her shop's store, and
// that what is written reads back — is `docs/checks/10.4b-iii-a-cocina-contract.sh`,
// which reads the names OUT OF `src/api/place.ts`. Here: the values, the rules,
// and Wera's words, held against Wera's file.
// ============================================================================

const SRC = new URL('../src/', import.meta.url);
const code = (path: string) =>
  readFileSync(new URL(path, SRC), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
const wera = (path: string) => readFileSync(new URL(`../../app/src/${path}`, import.meta.url), 'utf8');

const ROW: PlaceRow = {
  id: 'p-1',
  name: 'Fonda Doña Lupe',
  street: 'Fresno',
  street_number: '45',
  colonia: 'Santa María la Ribera',
  city: 'Cuauhtémoc',
  postal_code: '06400',
  pin_lat: 19.451234,
  pin_lng: -99.159876,
  directions: 'Portón verde',
};

describe('her kitchen’s place, as the app asks for it', () => {
  it('names the table, the columns, the filter and the order once', () => {
    expect(PLACE_TABLE).toBe('location');
    expect(PLACE_COLUMNS).toBe('id,name,street,street_number,colonia,city,postal_code,pin_lat,pin_lng,directions');
    expect(PLACE_COLUMNS).not.toContain('*');
    expect(PLACE_OWNER_COLUMN).toBe('workspace_id');
    expect(PLACE_ACTIVE_COLUMN).toBe('is_active');
    expect(PLACE_ORDER).toBe('created_at,id');
  });

  it('and the read sends exactly those — filtered on THE KITCHEN, the first-made first, one row', () => {
    const calls = code('api/calls.ts');
    expect(calls).toMatch(
      /\.from\(PLACE_TABLE\)\s*\.select\(PLACE_COLUMNS\)\s*\.eq\(PLACE_OWNER_COLUMN, kitchenId\)\s*\.eq\(PLACE_ACTIVE_COLUMN, true\)/,
    );
    expect(calls).toMatch(/PLACE_ORDER\.split\(','\)\) query = query\.order\(column\)/);
    expect(calls).toMatch(/await query\.limit\(1\)/);
  });

  it('caches under the login and the kitchen', () => {
    expect(placeKey('u-1', 'k-1')).toEqual([...PLACES_KEY, 'u-1', 'k-1']);
    expect(placeKey('u-1', 'k-1')).not.toEqual(placeKey('u-2', 'k-1'));
    expect(code('api/hooks.ts')).toMatch(/queryKey: placeKey\(userId, kitchenId\)/);
  });

  it('renames a row: an absent address field is empty, a blank line of directions is none', () => {
    expect(toPlace(ROW)).toEqual({
      id: 'p-1',
      name: 'Fonda Doña Lupe',
      address: { street: 'Fresno', number: '45', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postalCode: '06400' },
      pin: { latitude: 19.451234, longitude: -99.159876 },
      directions: 'Portón verde',
    });
    const bare = toPlace({ ...ROW, street: null, colonia: null, pin_lat: null, pin_lng: null, directions: '  ' });
    expect(bare.address.street).toBe('');
    expect(bare.address.colonia).toBe('');
    expect(bare.pin).toBeNull();
    expect(bare.directions).toBeNull();
  });

  it('a pin is both numbers or none — and a number sent as text is still a pin', () => {
    expect(pinFrom(19.4, null)).toBeNull();
    expect(pinFrom(null, -99.1)).toBeNull();
    expect(pinFrom('19.451234', '-99.159876')).toEqual({ latitude: 19.451234, longitude: -99.159876 });
    expect(pinFrom('x', '-99.1')).toBeNull();
  });
});

describe('the address: Wera’s five boxes, Wera’s rule, Wera’s words', () => {
  const FULL = { street: ' Fresno ', number: '45 ', colonia: '  ', city: 'Cuauhtémoc', postalCode: ' 06400 ' };

  it('asks the owner’s four, in the screen’s order; the colonia may stay empty', () => {
    expect(checkAddress(EMPTY_ADDRESS)).toBe('street');
    expect(checkAddress({ ...FULL, number: '' })).toBe('number');
    expect(checkAddress({ ...FULL, city: ' ' })).toBe('city');
    expect(checkAddress({ ...FULL, postalCode: '6400' })).toBe('postalCode');
    expect(checkAddress({ ...FULL, postalCode: '064000' })).toBe('postalCode');
    expect(checkAddress(FULL)).toBeNull();
  });

  it('the postal code’s shape is Wera’s, character for character', () => {
    const weraShape = /export const POSTAL_CODE_SHAPE = (\/[^\n]+\/);/.exec(wera('api/collection.ts'))?.[1];
    expect(weraShape).toBe(String(POSTAL_CODE_SHAPE));
  });

  it('is sent trimmed, an empty colonia as null — `set_store_address`’s six names', () => {
    expect(SET_STORE_ADDRESS).toBe('set_store_address');
    expect(setStoreAddressArgs('p-1', FULL)).toEqual({
      p_location_id: 'p-1',
      p_street: 'Fresno',
      p_street_number: '45',
      p_colonia: null,
      p_city: 'Cuauhtémoc',
      p_postal_code: '06400',
    });
    expect(code('api/calls.ts')).toMatch(/supabase\.rpc\(SET_STORE_ADDRESS, args\)/);
  });

  it('a change is judged as it would be sent: spaces are not a change', () => {
    const stored = toPlace(ROW).address;
    expect(sameAddress(stored, { ...stored, street: ' Fresno  ' })).toBe(true);
    expect(sameAddress(stored, { ...stored, number: '47' })).toBe(false);
  });

  it('reads back in Wera’s one line, and says nothing of an address that is not whole', () => {
    const place = toPlace(ROW);
    expect(addressComplete(place)).toBe(true);
    expect(addressLine(place)).toBe('Fresno 45, Santa María la Ribera, Cuauhtémoc, C.P. 06400');
    expect(addressLine(place)).toBe(WERA.address.line('Fresno', '45', 'Santa María la Ribera', 'Cuauhtémoc', '06400'));
    expect(addressLine(toPlace({ ...ROW, colonia: null }))).toBe('Fresno 45, Cuauhtémoc, C.P. 06400');
    expect(addressLine(toPlace({ ...ROW, postal_code: null }))).toBeNull();
    expect(addressLine(null)).toBeNull();
  });

  it('every label and refusal is Wera’s, word for word — one person may give an address in both apps', () => {
    for (const key of ['street', 'number', 'colonia', 'city', 'postalCode', 'done'] as const) {
      expect(ES.address[key], key).toBe(WERA.address[key]);
    }
    for (const [key, sentence] of Object.entries(ES.address.issues)) {
      expect(WERA.address.issues[key as keyof typeof WERA.address.issues], key).toBe(sentence);
    }
  });
});

describe('the pin and its one line of directions', () => {
  it('`set_store_pin`’s four names; six decimals, as the column keeps them', () => {
    expect(SET_STORE_PIN).toBe('set_store_pin');
    expect(setStorePinArgs('p-1', { latitude: 19.45123449, longitude: -99.15987651 }, ' Portón verde ')).toEqual({
      p_location_id: 'p-1',
      p_lat: 19.451234,
      p_lng: -99.159877,
      p_directions: 'Portón verde',
    });
    expect(sixDecimals(19.4512345)).toBeCloseTo(19.451235, 6);
    expect(code('api/calls.ts')).toMatch(/supabase\.rpc\(SET_STORE_PIN, args\)/);
  });

  it('the line is one line — a pasted break becomes a space — and blank is none, never refused', () => {
    expect(directionsFrom('')).toBeNull();
    expect(directionsFrom('   ')).toBeNull();
    expect(directionsFrom('Portón verde,\r\njunto a la farmacia')).toBe('Portón verde, junto a la farmacia');
    expect(directionsFrom('Portón   verde')).toBe('Portón verde');
  });

  it('and never longer than the column allows, counted as Postgres counts — by character', () => {
    expect(DIRECTIONS_MAX).toBe(140);
    const long = 'ñ'.repeat(200);
    expect([...(directionsFrom(long) ?? '')].length).toBe(140);
    expect(code('ui/PantallaPunto.tsx')).toMatch(/maxLength=\{DIRECTIONS_MAX\}/);
  });
});

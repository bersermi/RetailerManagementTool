// ============================================================================
// WHERE HER KITCHEN HANDS FOOD OVER, AS A CONTRACT WITH POSTGRES — its address
// and its pin. Plan task `10.4b-iii-b`.
//
// ⚠️ A KITCHEN'S PLACE IS A `location` ROW (ADR-035 §2.3, as a shop's store):
// `onboard_workspace` makes the first one, named after the kitchen, and a chain's
// branches will be more rows. Everything here names the first ACTIVE one of a
// given kitchen, ordered by when it was made — the one `onboard_workspace` made.
//
// ⚠️⚠️ THE READ IS FILTERED ON THE KITCHEN, AND THAT FILTER IS WHAT KEEPS A
// SHOP'S STORE OUT. The walls let a login read every place of every business she
// belongs to (`my_locations()`), so for a shop's owner who makes a kitchen here,
// an unfiltered read's first row is her SHOP's store — made earlier — and her
// kitchen's address and pin would be written onto it (`10.4b-ii`'s defect, one
// app over). `docs/checks/10.4b-iii-a-cocina-contract.sh` asks it of a login
// with a shop and two kitchens, reading the names OUT OF THIS FILE.
//
// ⚠️ THE ADDRESS IS WERA'S FIVE BOXES AND WERA'S RULE, COPIED
// (`app/src/api/collection.ts`, plan `8k`, the owner's ruling of 2026-10-16:
// *"at least Street, number, ciudad and Código Postal"*; the colonia is asked
// and may stay empty). A fix to one is a fix to both; the words are held
// against Wera's file by `test/place.test.ts`.
//
// ⚠️ THE PIN IS THE OWNER'S (`set_store_pin`, `0072`): exact, six decimals,
// with one optional line of directions — his answers of 2026-10-28 (*"as
// precise as possible"*) and 2026-10-29 (*"yes to the directions line"*).
// ============================================================================

import { ES } from '@/strings';

// ----------------------------------------------------------------------------
// The read
// ----------------------------------------------------------------------------

/** The table a kitchen's place lives in. */
export const PLACE_TABLE = 'location';

/** What this app reads of it: the address `0058` added and the pin `0072` did. Named, never `*`. */
export const PLACE_COLUMNS = 'id,name,street,street_number,colonia,city,postal_code,pin_lat,pin_lng,directions';

/** ⚠️ The column the read is filtered on — the kitchen's id. See the header. */
export const PLACE_OWNER_COLUMN = 'workspace_id';

/** Only a place still in use; `is_active` is `0001`'s. */
export const PLACE_ACTIVE_COLUMN = 'is_active';

/** The order, comma-separated, each ascending: the first-made place is hers. */
export const PLACE_ORDER = 'created_at,id';

/** The prefix every place is cached under — what a write invalidates. */
export const PLACES_KEY = ['cocina', 'lugar'] as const;

/** Cached under the login and the kitchen, as `kitchensKey` is under the login. */
export function placeKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...PLACES_KEY, userId ?? '', kitchenId ?? ''];
}

/** The row as PostgREST sends it — a `numeric` arrives as a JSON number. */
export interface PlaceRow {
  readonly id: string;
  readonly name: string;
  readonly street: string | null;
  readonly street_number: string | null;
  readonly colonia: string | null;
  readonly city: string | null;
  readonly postal_code: string | null;
  readonly pin_lat: number | string | null;
  readonly pin_lng: number | string | null;
  readonly directions: string | null;
}

/** A point on the map — `react-native-maps`' own shape. */
export interface Pin {
  readonly latitude: number;
  readonly longitude: number;
}

/** Her kitchen's place, as this app holds it. An absent address field is `''`. */
export interface Place {
  readonly id: string;
  readonly name: string;
  readonly address: AddressForm;
  readonly pin: Pin | null;
  readonly directions: string | null;
}

/** One row, renamed. The only place in this app that knows both spellings. */
export function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    address: {
      street: row.street ?? '',
      number: row.street_number ?? '',
      colonia: row.colonia ?? '',
      city: row.city ?? '',
      postalCode: row.postal_code ?? '',
    },
    pin: pinFrom(row.pin_lat, row.pin_lng),
    directions: row.directions === null || row.directions.trim() === '' ? null : row.directions,
  };
}

/**
 * Both numbers or no pin — `location_pin_whole` (`0072`) stores them together.
 * ⚠️ A STRING IS READ TOO: PostgREST sends `numeric` as a number, but a value
 * that arrived as text must not become "no pin" and send her to set it again.
 */
export function pinFrom(lat: number | string | null, lng: number | string | null): Pin | null {
  if (lat === null || lng === null) return null;
  const latitude = typeof lat === 'number' ? lat : Number(lat);
  const longitude = typeof lng === 'number' ? lng : Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

// ----------------------------------------------------------------------------
// The address — Wera's five boxes (`app/src/api/collection.ts`)
// ----------------------------------------------------------------------------

/** What a person types; every field a string, as a `TextInput` gives it. */
export interface AddressForm {
  readonly street: string;
  readonly number: string;
  readonly colonia: string;
  readonly city: string;
  readonly postalCode: string;
}

/** A form nobody has typed into yet. */
export const EMPTY_ADDRESS: AddressForm = { street: '', number: '', colonia: '', city: '', postalCode: '' };

/** The first thing wrong with a form, in the order a person fills it. */
export type AddressIssue = 'street' | 'number' | 'city' | 'postalCode';

/** Five digits, leading zero and all — `0058`'s CHECK. CDMX's start with 0. */
export const POSTAL_CODE_SHAPE = /^[0-9]{5}$/;

/** ⚠️ THE OWNER'S FOUR. The colonia is asked for and may be left empty. */
export function checkAddress(form: AddressForm): AddressIssue | null {
  if (form.street.trim() === '') return 'street';
  if (form.number.trim() === '') return 'number';
  if (form.city.trim() === '') return 'city';
  if (!POSTAL_CODE_SHAPE.test(form.postalCode.trim())) return 'postalCode';
  return null;
}

/** Has her place a whole address? The same four, read back. */
export function addressComplete(place: Place | null): boolean {
  return place !== null && checkAddress(place.address) === null;
}

/** Her address in one line — Wera's `ES.address.line` — or `null` when it is not whole. */
export function addressLine(place: Place | null): string | null {
  if (place === null || !addressComplete(place)) return null;
  const a = place.address;
  return ES.address.line(a.street.trim(), a.number.trim(), a.colonia.trim(), a.city.trim(), a.postalCode.trim());
}

/**
 * ⚠️ THE ONE DOOR AN ADDRESS IS WRITTEN THROUGH (`0069`): anyone the place is
 * visible to fills an address that is not complete; changing a complete one is
 * the owner's — which she is, having made the kitchen.
 */
export const SET_STORE_ADDRESS = 'set_store_address';

/** `set_store_address`'s arguments, by the names PostgREST matches on. */
export interface SetStoreAddressArgs {
  readonly p_location_id: string;
  readonly p_street: string;
  readonly p_street_number: string;
  readonly p_colonia: string | null;
  readonly p_city: string;
  readonly p_postal_code: string;
}

/** Trimmed, and an empty colonia is `null`, which `0058` allows. */
export function setStoreAddressArgs(placeId: string, form: AddressForm): SetStoreAddressArgs {
  const colonia = form.colonia.trim();
  return {
    p_location_id: placeId,
    p_street: form.street.trim(),
    p_street_number: form.number.trim(),
    p_colonia: colonia === '' ? null : colonia,
    p_city: form.city.trim(),
    p_postal_code: form.postalCode.trim(),
  };
}

/** Did she change anything? Compared as it would be sent. */
export function sameAddress(a: AddressForm, b: AddressForm): boolean {
  const x = setStoreAddressArgs('', a);
  const y = setStoreAddressArgs('', b);
  return (
    x.p_street === y.p_street &&
    x.p_street_number === y.p_street_number &&
    x.p_colonia === y.p_colonia &&
    x.p_city === y.p_city &&
    x.p_postal_code === y.p_postal_code
  );
}

// ----------------------------------------------------------------------------
// The pin and its one line of directions — `0072`
// ----------------------------------------------------------------------------

/** The owner sets her pin; `TD012` for anyone else, `22023` for a pin that is not one. */
export const SET_STORE_PIN = 'set_store_pin';

/** `set_store_pin`'s arguments, by the names PostgREST matches on. */
export interface SetStorePinArgs {
  readonly p_location_id: string;
  readonly p_lat: number;
  readonly p_lng: number;
  readonly p_directions: string | null;
}

/** `location_directions_one_line`: at most this many characters, one line. */
export const DIRECTIONS_MAX = 140;

/**
 * What she typed beside the pin, as it will be stored: one line — a pasted line
 * break becomes a space —, trimmed, at most `DIRECTIONS_MAX` characters, and
 * blank is `null` (none). ⚠️ NEVER REFUSED: the box stops at the limit, and a
 * sentence about a rule she cannot see would be the app's problem handed to her.
 */
export function directionsFrom(text: string): string | null {
  const line = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (line === '') return null;
  return [...line].slice(0, DIRECTIONS_MAX).join('').trim();
}

/**
 * Six decimals — about 11 cm, the column's own precision — so the pin sent is
 * the pin stored (`set_store_pin` rounds the same way).
 */
export function sixDecimals(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function setStorePinArgs(placeId: string, pin: Pin, directions: string): SetStorePinArgs {
  return {
    p_location_id: placeId,
    p_lat: sixDecimals(pin.latitude),
    p_lng: sixDecimals(pin.longitude),
    p_directions: directionsFrom(directions),
  };
}

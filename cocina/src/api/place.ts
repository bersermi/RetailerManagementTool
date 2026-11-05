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
// ⚠️⚠️ AND SINCE `10.4h` IT IS OPTIONAL — HER OWN POINT, ONLY IF SHE SETS ONE (his
// ruling of 2026-11-03, address first: *"The pin is only indicative"*). Her line
// of directions is saved without it (`set_store_directions`) and her point is
// cleared when her street or number changes (`clear_store_pin`), both `0075`'s,
// both the owner's. ⚠️ `set_store_pin` STILL WRITES THE LINE WITH THE PIN, every
// call: a pin sent without her line erases it (`setStorePinArgs` takes it).
//
// ⚠️⚠️ AND SINCE `10.5-i-b-ii`, GOOGLE'S POINT FOR HER ADDRESS — A 30-DAY COPY
// (`set_google_point`, `0078`; the owner's ruling of 2026-11-04, night), with
// Google's ID for the place she picked. It is the point her kitchen is drawn at
// while she has no pin of her own: in Itacate, and on her own small map. Written
// AFTER her address, always — `0078`'s trigger clears it whenever any part of her
// address changes. The section at the foot says the rest.
// ============================================================================

import { ES } from '@/strings';

// ----------------------------------------------------------------------------
// The read
// ----------------------------------------------------------------------------

/** The table a kitchen's place lives in. */
export const PLACE_TABLE = 'location';

/**
 * What this app reads of it: the address `0058` added, the pin `0072` did, and
 * Google's point `0078` did (`10.5-i-b-ii`). Named, never `*`. ⚠️ ON ONE LINE: the
 * contract check reads it out of this file line by line.
 */
export const PLACE_COLUMNS = 'id,name,street,street_number,colonia,city,postal_code,pin_lat,pin_lng,directions,google_place_id,google_lat,google_lng,google_at';

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
  readonly google_place_id: string | null;
  readonly google_lat: number | string | null;
  readonly google_lng: number | string | null;
  /** A `timestamptz`, as PostgREST sends it: `2026-11-04T23:50:01.123456+00:00`. */
  readonly google_at: string | null;
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
  /** Google's point for her address, as the database keeps it — a 30-day copy (`0078`); `null` when there is none. */
  readonly google: StoredGooglePoint | null;
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
    google: googleFrom(row),
  };
}

/** Point and moment together or none (`location_google_point_whole`, `0078`); the ID only beside them. */
function googleFrom(row: PlaceRow): StoredGooglePoint | null {
  const pin = pinFrom(row.google_lat, row.google_lng);
  if (pin === null || typeof row.google_at !== 'string' || row.google_at.trim() === '') return null;
  const placeId = typeof row.google_place_id === 'string' && row.google_place_id.trim() !== '' ? row.google_place_id : null;
  return { pin, placeId, at: row.google_at };
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

/** Two pins are one when they are one at six decimals — what is stored. */
export function samePin(a: Pin | null, b: Pin | null): boolean {
  if (a === null || b === null) return a === b;
  return sixDecimals(a.latitude) === sixDecimals(b.latitude) && sixDecimals(a.longitude) === sixDecimals(b.longitude);
}

// ----------------------------------------------------------------------------
// Her line with no pin, and her pin cleared — `0075`, plan `10.4h`
// ----------------------------------------------------------------------------

/** Her line of directions alone, the pin untouched; `TD012` and `22023` as `set_store_pin`. */
export const SET_STORE_DIRECTIONS = 'set_store_directions';

/** `set_store_directions`'s arguments, by the names PostgREST matches on. */
export interface SetStoreDirectionsArgs {
  readonly p_location_id: string;
  readonly p_directions: string | null;
}

export function setStoreDirectionsArgs(placeId: string, directions: string): SetStoreDirectionsArgs {
  return { p_location_id: placeId, p_directions: directionsFrom(directions) };
}

/** Her own pin cleared, her line untouched; a place with no pin answers the same. `TD012` for anyone else. */
export const CLEAR_STORE_PIN = 'clear_store_pin';

/** `clear_store_pin`'s argument, by the name PostgREST matches on. */
export interface ClearStorePinArgs {
  readonly p_location_id: string;
}

export function clearStorePinArgs(placeId: string): ClearStorePinArgs {
  return { p_location_id: placeId };
}

// ----------------------------------------------------------------------------
// Google's point for her address, a 30-day copy — `0078`, plan `10.5-i-b-ii`
// ----------------------------------------------------------------------------
//
// ⚠️⚠️ THE OWNER'S RULING OF 2026-11-04, NIGHT (*"Yes, record it and follow your
// recommendation"*): her kitchen is drawn at Google's point for her address, kept
// as a 30-DAY COPY (Google's Service Specific Terms §14.3 for Places, §6.3.1 for
// Geocoding) — written when she registers or changes her address, asked again
// when the app opens and the copy is over `GOOGLE_REFRESH_DAYS` old, and cleared by
// the database every night once it is 29 days old (`0078`'s job), so nothing here
// has to delete it. Google's ID for the place she picked rides with it, so the
// refresh asks Google for that place again.
//
// ⚠️ ONLY THE POINT AND THE ID — NEVER WHAT GOOGLE NAMES (the street under her
// pin, the suggestions' list): what Google answers reaches this layer as a
// `GooglePoint` and nothing else, and no module of this layer asks Google.
// ⚠️ NONE WHILE SHE HAS A PIN OF HER OWN: hers wins everywhere — in Itacate's door
// and on her small map — so a copy of Google's would be kept for nothing.
// ⚠️⚠️ AFTER HER ADDRESS, ALWAYS: `0078`'s trigger clears the copy whenever any
// part of her address changes (it was Google's answer for the old one), so a
// point sent before the address it belongs to is erased by it, with no error.
// `@/api/registro` and `@/api/direccion` send it last.

/** What is kept of where Google places her address: its point, and Google's ID for the place she picked. */
export interface GooglePoint {
  readonly pin: Pin;
  /** The suggestion she picked (Places); `null` for Geocoding's answer to her boxes, which keeps no ID. */
  readonly placeId: string | null;
}

/** The copy as the database holds it, with the moment it stamped it. */
export interface StoredGooglePoint extends GooglePoint {
  /** `google_at`: when `set_google_point` ran — never a date a phone sent. */
  readonly at: string;
}

/** The one door it is written through (`0078`): her kitchen's owner; `TD012` anyone else, `TD013` a shop, `22023` not a point. */
export const SET_GOOGLE_POINT = 'set_google_point';

/** `set_google_point`'s arguments, by the names PostgREST matches on. */
export interface SetGooglePointArgs {
  readonly p_location_id: string;
  readonly p_lat: number;
  readonly p_lng: number;
  readonly p_place_id: string | null;
}

/** `location_google_place_id_shape` (`0078`): an ID is at most this many characters. */
export const GOOGLE_PLACE_ID_MAX = 512;

/**
 * Six decimals, as the column keeps them; the ID trimmed — and none when it is
 * blank or longer than the column takes, so the point is kept either way.
 */
export function setGooglePointArgs(placeId: string, google: GooglePoint): SetGooglePointArgs {
  const id = (google.placeId ?? '').trim();
  return {
    p_location_id: placeId,
    p_lat: sixDecimals(google.pin.latitude),
    p_lng: sixDecimals(google.pin.longitude),
    p_place_id: id === '' || [...id].length > GOOGLE_PLACE_ID_MAX ? null : id,
  };
}

/**
 * ⚠️ THE RULING'S 7 DAYS: the copy is asked again once it is older than this. A
 * kitchen Itacate shows published within 14 days, so the point a neighbour sees
 * is at most about three weeks old — and never 30 (the nightly job).
 */
export const GOOGLE_REFRESH_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A moment as PostgREST sends it, cut to milliseconds. ⚠️ Postgres sends six
 * decimals of a second and JavaScript's date format is written with three: Node
 * reads more, and an engine that read only three would see every copy as never
 * stamped — so the phone is never asked to.
 */
export function toMilliseconds(value: string): string {
  return value.trim().replace(/(\.\d{3})\d+/, '$1');
}

/** A `timestamptz` as PostgREST sends it, in ms since 1970 — or `null`. */
export function instantFrom(value: string | null): number | null {
  if (value === null) return null;
  const ms = Date.parse(toMilliseconds(value));
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Is Google's point due to be asked again, at `now` by this phone's clock? Yes
 * with none, yes once older than `GOOGLE_REFRESH_DAYS`, and yes when its moment
 * cannot be read — a copy never refreshed would sit until the nightly job.
 */
export function googlePointDue(google: StoredGooglePoint | null, now: number): boolean {
  if (google === null) return true;
  const at = instantFrom(google.at);
  return at === null || now - at > GOOGLE_REFRESH_DAYS * DAY_MS;
}

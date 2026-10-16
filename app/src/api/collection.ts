// ============================================================================
// TE LO COMPRO, AND THE STORE'S ADDRESS IT NEEDS — the app's half of `0058` and
// `0059`. Plan task `8k`, the owner's brief and rulings of 2026-10-16.
//
// ⚠️⚠️ A MODULE IN `src/api/` IS A CLAIM ABOUT THE APPLIED SCHEMA (`app/CLAUDE.md`),
// and this one's wire behaviour is `docs/checks/8k-collection-contract.sh`'s,
// against a real PostgREST — never a typecheck's. Every name the database
// declares is written here once (`R13`): the columns, the two RPCs and their
// `p_` arguments, the three refusal codes and the vocabulary a line may carry.
//
// ⚠️ THE STORE'S ADDRESS IS READ WITH ITS OWN COLUMN LIST, NOT `LOCATION_COLUMNS`.
// That one (`@/api/invites`) is the picker's `id,name`, and its falsifier pins
// the exact line; a store's address is a different question asked of the same
// rows.
//
// ⚠️ WHAT HAS A RIGHT ANSWER IS HERE AND IN `app/test/collection.test.ts` (`R3`):
// whether an address is complete, the picker's fifteen-minute times from 7:00 to
// 19:00, the days a pickup may be on, and the arguments a draft becomes.
// ============================================================================

import { apiErrorMessage } from '@/api/errors';
import { ES } from '@/strings';

/** `0058`'s five columns, and the row's id to write them back by. */
export const STORE_ADDRESS_COLUMNS = 'id,name,street,street_number,colonia,city,postal_code';

/** The store's address, cached apart from the shop list it does not change. */
export const STORE_ADDRESS_KEY = ['location', 'address'] as const;

export interface StoreAddressRow {
  readonly id: string;
  readonly name: string;
  readonly street: string | null;
  readonly street_number: string | null;
  readonly colonia: string | null;
  readonly city: string | null;
  readonly postal_code: string | null;
}

export interface StoreAddress {
  readonly locationId: string;
  readonly storeName: string;
  readonly street: string;
  readonly number: string;
  readonly colonia: string;
  readonly city: string;
  readonly postalCode: string;
}

/** A row as the app reads it — an absent field is `''`, never `null`. */
export function toStoreAddress(row: StoreAddressRow): StoreAddress {
  return {
    locationId: row.id,
    storeName: row.name,
    street: row.street ?? '',
    number: row.street_number ?? '',
    colonia: row.colonia ?? '',
    city: row.city ?? '',
    postalCode: row.postal_code ?? '',
  };
}

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

/** The stored address as a form, to edit it. */
export function addressForm(address: StoreAddress | null): AddressForm {
  if (address === null) return EMPTY_ADDRESS;
  return {
    street: address.street,
    number: address.number,
    colonia: address.colonia,
    city: address.city,
    postalCode: address.postalCode,
  };
}

/** The first thing wrong with a form, in the order a person fills it. */
export type AddressIssue = 'street' | 'number' | 'city' | 'postalCode';

/** Five digits, leading zero and all — `0058`'s CHECK, said once for the app. */
export const POSTAL_CODE_SHAPE = /^[0-9]{5}$/;

/**
 * ⚠️ THE OWNER'S FOUR — *"at least Street, number, ciudad and Código Postal"*.
 * The colonia is asked for and may be left empty.
 */
export function checkAddress(form: AddressForm): AddressIssue | null {
  if (form.street.trim() === '') return 'street';
  if (form.number.trim() === '') return 'number';
  if (form.city.trim() === '') return 'city';
  if (!POSTAL_CODE_SHAPE.test(form.postalCode.trim())) return 'postalCode';
  return null;
}

/** Is the stored address enough for a pickup? The same four, read back. */
export function addressComplete(address: StoreAddress | null): boolean {
  if (address === null) return false;
  return checkAddress(address) === null;
}

/** The row's columns, trimmed; an empty colonia is `null`, which `0058` allows. */
export interface AddressPatch {
  readonly street: string;
  readonly street_number: string;
  readonly colonia: string | null;
  readonly city: string;
  readonly postal_code: string;
}

export function addressPatch(form: AddressForm): AddressPatch {
  const colonia = form.colonia.trim();
  return {
    street: form.street.trim(),
    street_number: form.number.trim(),
    colonia: colonia === '' ? null : colonia,
    city: form.city.trim(),
    postal_code: form.postalCode.trim(),
  };
}

// ----------------------------------------------------------------------------
// Where the service reaches — `0058`'s one door
// ----------------------------------------------------------------------------

export const COLLECTION_REACHES = 'collection_reaches';

export interface ReachesArgs {
  readonly p_postal_code: string;
}

export function reachesArgs(postalCode: string): ReachesArgs {
  return { p_postal_code: postalCode.trim() };
}

/** Cached per código postal: the answer changes when Wera's owner adds a row. */
export function reachesKey(postalCode: string): readonly unknown[] {
  return ['collection', 'reaches', postalCode.trim()];
}

// ----------------------------------------------------------------------------
// A request — `0059`
// ----------------------------------------------------------------------------

export const REQUEST_COLLECTION = 'request_collection';
export const CANCEL_COLLECTION = 'cancel_collection_request';

/** `request_collection`'s arguments, by the names PostgREST matches on. */
export interface RequestCollectionArgs {
  readonly p_id: string;
  readonly p_location_id: string;
  readonly p_pickup_date: string;
  readonly p_window_start: string;
  readonly p_window_end: string;
  readonly p_lines: readonly WireLine[];
  readonly p_photos: readonly string[];
  readonly p_note: string | null;
}

export interface CancelCollectionArgs {
  readonly p_id: string;
}

/** The three vocabularies a line may carry, as `0059` spells them. */
export const CONDITIONS = ['bueno', 'por caducar', 'caducado', 'magullado'] as const;
export const PACKAGINGS = ['cerrado', 'abierto'] as const;
export const KEEPINGS = ['ambiente', 'refrigerado', 'congelado'] as const;

export type Condition = (typeof CONDITIONS)[number];
export type Packaging = (typeof PACKAGINGS)[number];
export type Keeping = (typeof KEEPINGS)[number];

/** A line on the wire — `0059`'s keys. */
export interface WireLine {
  readonly variant_id: string;
  readonly qty_display: string;
  readonly qty_display_unit: string;
  readonly condition: Condition;
  readonly packaging: Packaging;
  readonly keeping: Keeping;
  readonly expiry_date: string | null;
}

export interface CollectionLineDraft {
  readonly variantId: string;
  /** As typed, a decimal with a point: `2.5`. */
  readonly qty: string;
  readonly unit: string;
  readonly condition: Condition;
  readonly packaging: Packaging;
  readonly keeping: Keeping;
  /** `YYYY-MM-DD`, or `null` when nobody read one. */
  readonly expiryDate: string | null;
}

export interface CollectionDraft {
  /** The client's id — `0059`'s idempotency key. */
  readonly id: string;
  readonly locationId: string;
  /** `YYYY-MM-DD`. */
  readonly day: string;
  /** `HH:MM`, one of `pickupTimes()`. */
  readonly from: string;
  readonly to: string;
  readonly lines: readonly CollectionLineDraft[];
  readonly photos: readonly string[];
  readonly note: string;
}

export function requestCollectionArgs(draft: CollectionDraft): RequestCollectionArgs {
  const note = draft.note.trim();
  return {
    p_id: draft.id,
    p_location_id: draft.locationId,
    p_pickup_date: draft.day,
    p_window_start: draft.from,
    p_window_end: draft.to,
    p_lines: draft.lines.map((line) => ({
      variant_id: line.variantId,
      qty_display: line.qty.trim(),
      qty_display_unit: line.unit,
      condition: line.condition,
      packaging: line.packaging,
      keeping: line.keeping,
      expiry_date: line.expiryDate,
    })),
    p_photos: draft.photos,
    p_note: note === '' ? null : note,
  };
}

export function cancelCollectionArgs(id: string): CancelCollectionArgs {
  return { p_id: id };
}

/** The refusals `0059` names. Everything else is `ES.api.errors`' business. */
export const NO_ADDRESS_CODE = 'TD008';
export const OUTSIDE_AREA_CODE = 'TD009';
export const TOO_LATE_TO_CANCEL_CODE = 'TD010';

/**
 * The Spanish sentence for a refused request or cancellation — `0059`'s three
 * by name, everything else as every other call says it (`R12`).
 */
export function collectionErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  if (code === NO_ADDRESS_CODE) return ES.collection.errors.noAddress;
  if (code === OUTSIDE_AREA_CODE) return ES.collection.errors.outsideArea;
  if (code === TOO_LATE_TO_CANCEL_CODE) return ES.collection.errors.tooLateToCancel;
  return apiErrorMessage(error);
}

// ----------------------------------------------------------------------------
// The shop's requests, as it reads them back
// ----------------------------------------------------------------------------

export const COLLECTION_COLUMNS =
  'id,status,pickup_date,window_start,window_end,lines,photos,note,created_at';

export const COLLECTION_KEY = ['collection', 'requests'] as const;

export const STATUSES = ['enviada', 'confirmada', 'recogida', 'cancelada'] as const;
export type CollectionStatus = (typeof STATUSES)[number];

export interface CollectionLineRow {
  readonly variant_id: string;
  readonly variant_name: string;
  readonly qty_display: number | string;
  readonly qty_display_unit: string;
  readonly condition: Condition;
  readonly packaging: Packaging;
  readonly keeping: Keeping;
  readonly expiry_date: string | null;
}

export interface CollectionRow {
  readonly id: string;
  readonly status: CollectionStatus;
  readonly pickup_date: string;
  readonly window_start: string;
  readonly window_end: string;
  readonly lines: readonly CollectionLineRow[];
  readonly photos: readonly string[];
  readonly note: string | null;
  readonly created_at: string;
}

export interface CollectionRequest {
  readonly id: string;
  readonly status: CollectionStatus;
  readonly day: string;
  /** `HH:MM` — PostgREST sends a `time` as `HH:MM:SS`. */
  readonly from: string;
  readonly to: string;
  readonly lines: readonly CollectionLineRow[];
  readonly photoCount: number;
  readonly note: string | null;
  readonly createdAt: string;
  /** Only an `enviada` request may be called off by the shop (`TD010`). */
  readonly cancellable: boolean;
}

export function toCollectionRequest(row: CollectionRow): CollectionRequest {
  return {
    id: row.id,
    status: row.status,
    day: row.pickup_date,
    from: row.window_start.slice(0, 5),
    to: row.window_end.slice(0, 5),
    lines: row.lines,
    photoCount: row.photos.length,
    note: row.note,
    createdAt: row.created_at,
    cancellable: row.status === 'enviada',
  };
}

// ----------------------------------------------------------------------------
// The owner's picker — fifteen minutes at a time, from 7:00 to 19:00
// ----------------------------------------------------------------------------

/** *"multiples of 15 minutes spanning from 7 a.m. to 7 p.m."* — `0059`'s CHECK. */
export const PICKUP_OPENS_MINUTES = 7 * 60;
export const PICKUP_CLOSES_MINUTES = 19 * 60;
export const PICKUP_STEP_MINUTES = 15;
/** Today and the fourteen days after it — `0059` refuses anything further. */
export const PICKUP_DAYS_AHEAD = 14;

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function minutesOf(time: string): number | null {
  const match = /^([0-9]{2}):([0-9]{2})$/.exec(time);
  if (match === null) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Every time the picker offers, `07:00` … `19:00`, forty-nine of them. */
export function pickupTimes(): readonly string[] {
  const times: string[] = [];
  for (let t = PICKUP_OPENS_MINUTES; t <= PICKUP_CLOSES_MINUTES; t += PICKUP_STEP_MINUTES) {
    times.push(clock(t));
  }
  return times;
}

/** A window `0059` accepts: inside the day, on the quarter hour, and not empty. */
export function windowValid(from: string, to: string): boolean {
  const start = minutesOf(from);
  const end = minutesOf(to);
  if (start === null || end === null) return false;
  return (
    start >= PICKUP_OPENS_MINUTES &&
    end <= PICKUP_CLOSES_MINUTES &&
    start < end &&
    start % PICKUP_STEP_MINUTES === 0 &&
    end % PICKUP_STEP_MINUTES === 0
  );
}

/**
 * The days a pickup may be on, starting at `today` (`YYYY-MM-DD`, the store's
 * own day). ⚠️ CALENDAR ARITHMETIC ON THE DATE ALONE — built at noon UTC so no
 * timezone and no daylight-saving change can move a day.
 */
export function pickupDays(today: string): readonly string[] {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(today);
  if (match === null) return [];
  const base = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  const days: string[] = [];
  for (let i = 0; i <= PICKUP_DAYS_AHEAD; i += 1) {
    days.push(new Date(base + i * 86_400_000).toISOString().slice(0, 10));
  }
  return days;
}

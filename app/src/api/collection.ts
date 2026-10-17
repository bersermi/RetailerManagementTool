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
//
// ⚠️⚠️ `0060` REDREW IT, THE OWNER'S RULINGS OF 2026-10-16 (`8l`): **one product
// per request** — *"that allows me to promote each product easier"* — and **one
// quarter of an hour**, not a from–till window: *"If the user picks 9:45 then he
// should be able to dispatch the waste from 9:45 to 10:00."* So a draft carries
// ONE line and ONE start; the end is the start plus fifteen minutes, computed
// here and checked again by `0060`. And `rechazada`, the fifth status.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import { apiErrorMessage } from '@/api/errors';
import { isoDay } from '@/api/catalog';
import { addDays, daysFrom, formatClock, formatPickupDay } from '@/format/date';
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
  /** `HH:MM`, one of `pickupTimes()` — the quarter the pickup starts on. */
  readonly at: string;
  /** ⚠️ ONE PRODUCT (`0060`). */
  readonly line: CollectionLineDraft;
  readonly photos: readonly string[];
  readonly note: string;
}

export function requestCollectionArgs(draft: CollectionDraft): RequestCollectionArgs {
  const note = draft.note.trim();
  const line = draft.line;
  return {
    p_id: draft.id,
    p_location_id: draft.locationId,
    p_pickup_date: draft.day,
    p_window_start: draft.at,
    // ⚠️ AN UNREADABLE START IS SENT AS ITS OWN END and `0060` refuses it
    // (`22023`) — the screen offers only `pickupTimes()`, so this is the brace.
    p_window_end: slotEnd(draft.at) ?? draft.at,
    // ⚠️ STILL A LIST OF ONE: the shape `0059` stored does not change (`0060`).
    p_lines: [
      {
        variant_id: line.variantId,
        qty_display: line.qty.trim(),
        qty_display_unit: line.unit,
        condition: line.condition,
        packaging: line.packaging,
        keeping: line.keeping,
        expiry_date: line.expiryDate,
      },
    ],
    p_photos: draft.photos,
    p_note: note === '' ? null : note,
  };
}

export function cancelCollectionArgs(id: string): CancelCollectionArgs {
  return { p_id: id };
}

// ----------------------------------------------------------------------------
// ⚠️ `8m` — THE PHOTOS. `0060` made the private bucket `merma` and its fence
// (`merma_path_ok`: the first folder is a shop the caller owns or manages), and
// `request_collection` refuses a path that is not `<shop>/<request>/<file>`. So
// a photo is uploaded under the request's own id BEFORE the request is sent,
// and the request carries the paths.
// ----------------------------------------------------------------------------

export const MERMA_BUCKET = 'merma';
/** At most three photos of one product — enough to judge it, few enough to send on a weak signal. */
export const MAX_PHOTOS = 3;
export const PHOTO_CONTENT_TYPE = 'image/jpeg';
/** The code a failed upload carries to `collectionErrorMessage` — the client's, not the database's. */
export const PHOTO_UPLOAD_FAILED = 'photo-upload';

/** `<shop>/<request>/<file>.jpg` — `0060`'s shape, the file named once, when it is taken. */
export function photoPath(workspaceId: string, requestId: string, fileId: string): string {
  return `${workspaceId}/${requestId}/${fileId}.jpg`;
}

/**
 * ⚠️ A RETRY UPLOADS THE SAME PATH AGAIN, and `merma` has no UPDATE policy, so
 * Storage answers that it already exists — which is the photo, already there.
 */
export function alreadyStored(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { statusCode, message } = error as { statusCode?: unknown; message?: unknown };
  if (statusCode === '409' || statusCode === 409) return true;
  return typeof message === 'string' && /already exists|duplicate/i.test(message);
}

/** The refusals `0059` names. Everything else is `ES.api.errors`' business. */
export const NO_ADDRESS_CODE = 'TD008';
export const OUTSIDE_AREA_CODE = 'TD009';
export const TOO_LATE_TO_CANCEL_CODE = 'TD010';
/** ⚠️ `0061`: a pickup that starts less than five hours after the request. */
export const TOO_SOON_CODE = 'TD011';

/**
 * The Spanish sentence for a refused request or cancellation — `0059`'s three
 * by name, everything else as every other call says it (`R12`).
 */
export function collectionErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  if (code === NO_ADDRESS_CODE) return ES.collection.errors.noAddress;
  if (code === OUTSIDE_AREA_CODE) return ES.collection.errors.outsideArea;
  if (code === TOO_LATE_TO_CANCEL_CODE) return ES.collection.errors.tooLateToCancel;
  if (code === TOO_SOON_CODE) return ES.collection.errors.tooSoon;
  if (code === PHOTO_UPLOAD_FAILED) return ES.collection.errors.photoUpload;
  return apiErrorMessage(error);
}

// ----------------------------------------------------------------------------
// The shop's requests, as it reads them back
// ----------------------------------------------------------------------------

export const COLLECTION_COLUMNS =
  'id,status,pickup_date,window_start,window_end,lines,photos,note,created_at,wera_paid::text';

export const COLLECTION_KEY = ['collection', 'requests'] as const;

/**
 * ⚠️ `rechazada` IS `0060`'s, the owner's 2026-10-16: Wera looked and will not
 * collect it. Like `confirmada` and `recogida` it is Wera's to set, from the
 * dashboard; the shop sets only `cancelada`, and only from `enviada`.
 */
export const STATUSES = ['enviada', 'confirmada', 'recogida', 'cancelada', 'rechazada'] as const;
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
  /**
   * ⚠️ `0062`: what Wera paid, in pesos, as a decimal STRING (the `::text`
   * cast — a bare `numeric` arrives as a JSON number). Typed by the owner in
   * the dashboard; `null` until he does.
   */
  readonly wera_paid: string | null;
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
  /** What Wera paid for it, in centavos — `null` until the owner types it (`0062`). */
  readonly paidCentavos: number | null;
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
    paidCentavos: paidOf(row.wera_paid),
  };
}

/** ⚠️ An amount that will not parse is no amount, never a zero. */
function paidOf(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value === '') return null;
  try {
    return parseDecimal(value, SCALE.money);
  } catch {
    return null;
  }
}

/**
 * Inicio's *Rescatado* (`8n`, the owner's ruling of 2026-10-17: *"What Wera
 * paid"*) — every amount Wera has paid the shop, in centavos. ⚠️ EVERY AMOUNT
 * THAT IS THERE, whatever the status says: `0062` deliberately does not tie
 * the two, because the dashboard saves one cell at a time.
 */
export function rescued(requests: readonly CollectionRequest[]): number {
  let total = 0;
  for (const r of requests) if (r.paidCentavos !== null) total += r.paidCentavos;
  return total;
}

// ----------------------------------------------------------------------------
// The owner's picker — one quarter of an hour, starting from 7:00 to 18:45
// ----------------------------------------------------------------------------

/**
 * *"multiples of 15 minutes spanning from 7 a.m. to 7 p.m."*, and since `0060`
 * a pickup IS one of those quarters: the last one starts at 18:45 and ends at
 * 19:00.
 */
export const PICKUP_OPENS_MINUTES = 7 * 60;
export const PICKUP_CLOSES_MINUTES = 19 * 60;
export const PICKUP_STEP_MINUTES = 15;
/** Today and the fourteen days after it — `0059` refuses anything further. */
export const PICKUP_DAYS_AHEAD = 14;
/**
 * ⚠️ `0061`, THE OWNER'S: *"request a pick up only 5 hours apart from the moment
 * he is recording the waste."* The picker offers only starts this far out;
 * `0061` refuses below four and a half hours (the half hour is her review time).
 */
export const PICKUP_LEAD_MINUTES = 5 * 60;

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

/** A start `0060` accepts: on the quarter, from 07:00 to 18:45. */
export function slotValid(at: string): boolean {
  const start = minutesOf(at);
  if (start === null) return false;
  return (
    start >= PICKUP_OPENS_MINUTES &&
    start + PICKUP_STEP_MINUTES <= PICKUP_CLOSES_MINUTES &&
    start % PICKUP_STEP_MINUTES === 0
  );
}

/** The end of the quarter that starts at `at` — `09:45` → `10:00` — or `null`. */
export function slotEnd(at: string): string | null {
  if (!slotValid(at)) return null;
  return clock((minutesOf(at) ?? 0) + PICKUP_STEP_MINUTES);
}

/** Every start the picker offers, `07:00` … `18:45`, forty-eight of them. */
export function pickupTimes(): readonly string[] {
  const times: string[] = [];
  for (let t = PICKUP_OPENS_MINUTES; t + PICKUP_STEP_MINUTES <= PICKUP_CLOSES_MINUTES; t += PICKUP_STEP_MINUTES) {
    times.push(clock(t));
  }
  return times;
}

/**
 * ⚠️ THE OWNER'S PICKER, OPTION A (2026-10-16): every start of the day that can
 * still be booked, one tap each, in three parts of the day. A part with nothing
 * left is not drawn, and a start inside the five hours is not drawn at all —
 * the grid begins at the first one `0061` will take.
 */
export const PICKUP_BANDS = ['manana', 'tarde', 'atardecer'] as const;
export type PickupBand = (typeof PICKUP_BANDS)[number];

/** Where each part of the day begins, in minutes — 7:00, 12:00 and 16:00. */
const BAND_STARTS: Readonly<Record<PickupBand, number>> = { manana: 7 * 60, tarde: 12 * 60, atardecer: 16 * 60 };

function bandOf(minutes: number): PickupBand {
  if (minutes >= BAND_STARTS.atardecer) return 'atardecer';
  if (minutes >= BAND_STARTS.tarde) return 'tarde';
  return 'manana';
}

export interface PickupBandSlots {
  readonly band: PickupBand;
  /** `HH:MM`, in order. */
  readonly starts: readonly string[];
}

/** The day's bookable starts, by part of the day — empty parts left out. */
export function pickupBands(day: string, today: string, now: string): readonly PickupBandSlots[] {
  const bands: { band: PickupBand; starts: string[] }[] = [];
  for (const at of pickupTimes()) {
    if (slotTooSoon(day, at, today, now)) continue;
    const band = bandOf(minutesOf(at) ?? 0);
    const last = bands[bands.length - 1];
    if (last !== undefined && last.band === band) last.starts.push(at);
    else bands.push({ band, starts: [at] });
  }
  return bands;
}

/** Can anything still be booked on this day? */
export function dayBookable(day: string, today: string, now: string): boolean {
  return pickupBands(day, today, now).length > 0;
}

/**
 * Is this quarter too soon to book — less than five hours from `now`, or gone?
 * ⚠️ `0061`'s rule as the picker draws it, counted across midnight: at 22:00 the
 * first open quarter is tomorrow's 07:00, at 05:00 it is today's 10:00. `now` is
 * the device's `HH:MM`, the shop's own clock.
 */
export function slotTooSoon(day: string, at: string, today: string, now: string): boolean {
  const away = daysFrom(today, day);
  const start = minutesOf(at);
  const current = minutesOf(now);
  if (away === null || start === null || current === null) return true;
  return away * 24 * 60 + start < current + PICKUP_LEAD_MINUTES;
}

/**
 * The days a pickup may be on, starting at `today` (`YYYY-MM-DD`, the store's
 * own day). ⚠️ CALENDAR ARITHMETIC ON THE DATE ALONE — built at noon UTC so no
 * timezone and no daylight-saving change can move a day.
 */
export function pickupDays(today: string): readonly string[] {
  const days: string[] = [];
  for (let i = 0; i <= PICKUP_DAYS_AHEAD; i += 1) {
    const day = addDays(today, i);
    if (day === null) return [];
    days.push(day);
  }
  return days;
}

/** A pickup as one phrase — `Mañana · 9:45 a 10:00`, or the long form for a box. */
export function formatSlot(day: string, at: string, today: string, long = false): string {
  const end = slotEnd(at) ?? at;
  return long
    ? ES.collection.slotLong(formatPickupDay(day, today, true), formatClock(at), formatClock(end))
    : ES.collection.slotShort(formatPickupDay(day, today), formatClock(at), formatClock(end));
}

// ----------------------------------------------------------------------------
// The previous request's answers — the owner's *"prefill each entry with the
// equivalent values of the previous one"*
// ----------------------------------------------------------------------------

/**
 * What a new request starts with. ⚠️ EVERYTHING BUT THE PRODUCT AND ITS
 * QUANTITY: the next request is a DIFFERENT product (*Otro producto, con los
 * mismos datos*), and a quantity is in that product's unit.
 */
export interface CollectionPrefill {
  readonly condition: Condition | null;
  readonly packaging: Packaging | null;
  readonly keeping: Keeping | null;
  /** `undefined` is *not answered yet*; `null` is *sin fecha*, answered. */
  readonly expiryDate: string | null | undefined;
  readonly day: string | null;
  readonly at: string | null;
}

export const NO_PREFILL: CollectionPrefill = {
  condition: null,
  packaging: null,
  keeping: null,
  expiryDate: undefined,
  day: null,
  at: null,
};

/**
 * The newest request's answers, as the next one's starting point — or nothing
 * chosen when there is none. ⚠️ A PICKUP THAT CAN NO LONGER BE BOOKED IS NOT
 * CARRIED: a day gone by, or a quarter already begun today, comes back empty
 * rather than as a choice `0060` or the screen would refuse.
 *
 * ⚠️⚠️ THE OWNER'S STANDING RULE IS THAT A PROPOSAL MUST NOT LOOK DECIDED, so
 * the screen says these came from the previous request, in a band above them.
 */
export function prefillFrom(
  requests: readonly CollectionRequest[],
  today: string,
  now: string,
): CollectionPrefill {
  const newest = [...requests].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const line = newest?.lines[0];
  if (newest === undefined || line === undefined) return NO_PREFILL;
  const bookable = !slotTooSoon(newest.day, newest.from, today, now) && slotValid(newest.from);
  return {
    condition: line.condition,
    packaging: line.packaging,
    keeping: line.keeping,
    expiryDate: line.expiry_date,
    day: bookable ? newest.day : null,
    at: bookable ? newest.from : null,
  };
}

/** Has every question a request needs been answered? */
export function draftReady(p: {
  readonly qty: string;
  readonly condition: Condition | null;
  readonly packaging: Packaging | null;
  readonly keeping: Keeping | null;
  readonly expiryDate: string | null | undefined;
}): boolean {
  return (
    /^[0-9]+(\.[0-9]{1,3})?$/.test(p.qty.trim()) &&
    Number(p.qty) > 0 &&
    p.condition !== null &&
    p.packaging !== null &&
    p.keeping !== null &&
    p.expiryDate !== undefined
  );
}

// ----------------------------------------------------------------------------
// *Avisar a Wera por WhatsApp* — one message with all of today's
// ----------------------------------------------------------------------------

/**
 * The requests the message is about: sent today, on the device's day, and
 * still `enviada`. ⚠️ A CALLED-OFF ONE IS NOT IN IT — Wera has nothing to
 * collect — and nor is one Wera has already answered.
 */
export function sentToday(requests: readonly CollectionRequest[], today: string): readonly CollectionRequest[] {
  return requests.filter((r) => r.status === 'enviada' && isoDay(new Date(r.createdAt)) === today);
}

/** A product and how much of it — `Alas de pollo · 2 kg`; the unit's word, never its code. */
export function productAmount(name: string, qty: string, unitCode: string): string {
  const unit = ES.units[unitCode as keyof typeof ES.units] ?? unitCode;
  return ES.collection.amount(name, qty, unit);
}

/** The line a request is in the message and in the list — `Alas de pollo · 2 kg`. */
export function requestTitle(r: CollectionRequest): string {
  const line = r.lines[0];
  if (line === undefined) return '';
  return productAmount(line.variant_name, String(line.qty_display), line.qty_display_unit);
}

/** The whole message — the words are `ES.collection.whatsapp`'s. */
export function whatsappMessage(
  requests: readonly CollectionRequest[],
  shop: string,
  address: StoreAddress | null,
  today: string,
): string {
  const lines = requests.map((r) => {
    const line = r.lines[0];
    const condition = line === undefined ? '' : ES.collection.conditions[line.condition];
    return ES.collection.whatsapp.item(requestTitle(r), condition, formatSlot(r.day, r.from, today));
  });
  const where = address === null ? '' : storeAddressLine(address);
  return ES.collection.whatsapp.message(shop, lines, where);
}

/** The store's address in one line — `Sabino 120, Santa María la Ribera, Ciudad de México, C.P. 06400`. */
export function storeAddressLine(a: StoreAddress): string {
  return ES.address.line(a.street, a.number, a.colonia, a.city, a.postalCode);
}

// ----------------------------------------------------------------------------
// ⚠️ INICIO'S *PRÓXIMA RECOLECCIÓN* (`8g`, 2026-10-16)
// ----------------------------------------------------------------------------

/** Minutes from `now` until the quarter `at` on `day` begins — negative once it has. */
export function minutesUntil(day: string, at: string, today: string, now: string): number | null {
  const away = daysFrom(today, day);
  const start = minutesOf(at);
  const current = minutesOf(now);
  if (away === null || start === null || current === null) return null;
  return away * 24 * 60 + start - current;
}

/**
 * The next pickup still to come — `enviada` or `confirmada`, its quarter not
 * yet begun — or `null`, and then Inicio draws no card at all.
 */
export function nextPickup(
  requests: readonly CollectionRequest[],
  today: string,
  now: string,
): CollectionRequest | null {
  let next: CollectionRequest | null = null;
  let soonest = Number.POSITIVE_INFINITY;
  for (const r of requests) {
    if (r.status !== 'enviada' && r.status !== 'confirmada') continue;
    const m = minutesUntil(r.day, r.from, today, now);
    if (m === null || m <= 0 || m >= soonest) continue;
    soonest = m;
    next = r;
  }
  return next;
}

/** How long until a pickup, the way a person says it — *faltan 20 h*. */
export function untilLabel(minutes: number): string {
  if (minutes < 60) return ES.home.pickup.minutes(Math.max(1, minutes));
  if (minutes < 48 * 60) return ES.home.pickup.hours(Math.round(minutes / 60));
  return ES.home.pickup.days(Math.round(minutes / (24 * 60)));
}


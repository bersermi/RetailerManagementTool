// ============================================================================
// MAKING HER KITCHEN, IN ORDER. Plan tasks `10.4b-iii-b` and `10.4h` (address
// first: the pin is hers only if she sets one).
//
// The writes, as Wera's onboarding makes a shop (`app/src/api/hooks.ts`,
// `useOnboardWorkspace`): the kitchen (`onboard_workspace` with the kind), then
// her trade, her address, and — only when she set her own point — her pin with
// her line of directions; else her line alone, when she wrote one (`0075`).
// ⚠️⚠️ AND LAST, WHEN SHE SET NO POINT OF HER OWN, GOOGLE'S POINT FOR HER ADDRESS
// (`set_google_point`, `0078`, plan `10.5-i-b-ii`) — what the small map drew: her
// pick's, with its ID, or Geocoding's for her boxes. LAST BECAUSE A NEW ADDRESS
// CLEARS IT (`0078`'s trigger), and only once her address landed: it is Google's
// answer for that address. Its failure is no step missing — nothing on screen
// says Google's point exists — and her kitchen's screen asks Google again for it
// (`useDondeEstaSuCocina`, outside this layer).
//
// ⚠️⚠️ ONLY THE FIRST CAN FAIL THE SIGN-UP. Once `onboard_workspace` answers,
// the kitchen exists, and a later step that fails leaves it made — Wera's rule —
// because her kitchen's screen is the second door for each one: it shows what
// she gave and asks for whatever is missing. She is never shown an error about
// a step she can finish there (users don't do bookkeeping).
//
// ⚠️ ALL OF THEM BEFORE THE KITCHENS READ IS REFRESHED, AND THAT ORDER IS THE
// MECHANISM (Wera's `9d`): the guard moves her to her kitchen the moment the
// read answers with one (`@/auth/guard`), so the kitchen must be whole by then
// — or her screen opens without the address and fills a moment later.
//
// ⚠️ PURE: the calls are handed in (`@/api/calls`' `kitchenCalls` on the phone),
// so `test/registro.test.ts` can fail each one and watch the rest.
// ============================================================================

import { puntoVigente, type SuDireccion } from '@/api/direccion';
import { checkKitchenName, onboardArgs, type Kitchen, type OnboardArgs } from '@/api/kitchen';
import {
  EMPTY_ADDRESS,
  checkAddress,
  directionsFrom,
  setGooglePointArgs,
  setStoreAddressArgs,
  setStoreDirectionsArgs,
  setStorePinArgs,
  type AddressForm,
  type AddressIssue,
  type GooglePoint,
  type Pin,
  type Place,
  type SetGooglePointArgs,
  type SetStoreAddressArgs,
  type SetStoreDirectionsArgs,
  type SetStorePinArgs,
} from '@/api/place';

/**
 * What the sign-up collects, before it is checked: her kitchen's name and her
 * trade (*Registra tu cocina*), then her address, her line of directions and —
 * only if she sets one — her own point (*¿Dónde está tu cocina?*). Kept while
 * she steps back and forth (`@/lib/borrador`), so a step back to fix a typo
 * loses nothing.
 */
export interface Borrador extends SuDireccion {
  readonly name: string;
  readonly giro: string | null;
}

/** Nothing typed, nothing chosen — her trade included (a proposal must not look decided). */
export const BORRADOR_VACIO: Borrador = { name: '', giro: null, address: EMPTY_ADDRESS, directions: '', punto: null };

/** What the first screen still needs, in its order — her name, then her trade. */
export function pasoUno(borrador: Borrador): 'name' | 'giro' | null {
  if (checkKitchenName(borrador.name) === null) return 'name';
  if (borrador.giro === null) return 'giro';
  return null;
}

/** The first thing the sign-up still needs, in the order the screens ask it. */
export type FormIssue = 'name' | 'giro' | AddressIssue;

export function formIssue(borrador: Borrador): FormIssue | null {
  return pasoUno(borrador) ?? checkAddress(borrador.address);
}

/**
 * The draft *Registrar mi cocina* sends, or `null` while anything is missing. ⚠️ Her
 * point is not needed. ⚠️ `google` is where the small map placed her address as she
 * pressed it (`10.5-i-b-ii`) — `null` while Google had not answered — and is dropped
 * when she set her own point, which wins everywhere.
 */
export function draftFrom(borrador: Borrador, google: GooglePoint | null = null): Draft | null {
  const name = checkKitchenName(borrador.name);
  if (name === null || borrador.giro === null) return null;
  if (checkAddress(borrador.address) !== null) return null;
  const pin = puntoVigente(borrador);
  return { name, giro: borrador.giro, address: borrador.address, pin, directions: borrador.directions, google: pin === null ? google : null };
}

/** Everything the sign-up collects, checked. */
export interface Draft {
  readonly name: string;
  readonly giro: string;
  readonly address: AddressForm;
  /** Her own point, when she set one for this street and number; `null` — the usual — when not. */
  readonly pin: Pin | null;
  /** As she typed it; `directionsFrom` makes it one line, or none. */
  readonly directions: string;
  /** Google's point for her address, kept as Google's 30-day copy (`0078`); `null` with a pin of her own, or none from Google. */
  readonly google: GooglePoint | null;
}

/** The round trips, as `@/api/calls` makes them. */
export interface KitchenCalls {
  readonly onboard: (args: OnboardArgs) => Promise<string>;
  readonly setGiro: (kitchenId: string, giro: string) => Promise<void>;
  readonly firstPlace: (kitchenId: string) => Promise<Place | null>;
  readonly setAddress: (args: SetStoreAddressArgs) => Promise<void>;
  readonly setPin: (args: SetStorePinArgs) => Promise<void>;
  readonly setDirections: (args: SetStoreDirectionsArgs) => Promise<void>;
  readonly setGooglePoint: (args: SetGooglePointArgs) => Promise<void>;
}

/** What a later step could not write, which her kitchen's screen asks for again. */
export type Missing = 'giro' | 'address' | 'pin' | 'directions';

export interface Made {
  readonly kitchenId: string;
  readonly missing: readonly Missing[];
}

/**
 * Makes her kitchen. Throws only when the kitchen itself was not made.
 * ⚠️ THE PLACE IS THE ONE `onboard_workspace` JUST MADE, read by the new
 * kitchen's id — never "the first place she can see", which for a shop's owner
 * is her shop's store (`@/api/place`'s header).
 */
export async function makeKitchen(draft: Draft, calls: KitchenCalls): Promise<Made> {
  const kitchenId = await calls.onboard(onboardArgs(draft.name));
  const missing: Missing[] = [];
  const withLine = directionsFrom(draft.directions) !== null;

  try {
    await calls.setGiro(kitchenId, draft.giro);
  } catch {
    missing.push('giro');
  }

  let place: Place | null = null;
  try {
    place = await calls.firstPlace(kitchenId);
  } catch {
    place = null;
  }
  if (place === null) {
    const rest: Missing[] = ['address'];
    if (draft.pin !== null) rest.push('pin');
    else if (withLine) rest.push('directions');
    return { kitchenId, missing: [...missing, ...rest] };
  }

  let addressLanded = true;
  try {
    await calls.setAddress(setStoreAddressArgs(place.id, draft.address));
  } catch {
    addressLanded = false;
    missing.push('address');
  }
  if (draft.pin !== null) {
    // ⚠️ Her line goes with her point: `set_store_pin` writes both, every call.
    try {
      await calls.setPin(setStorePinArgs(place.id, draft.pin, draft.directions));
    } catch {
      missing.push('pin');
    }
  } else if (withLine) {
    try {
      await calls.setDirections(setStoreDirectionsArgs(place.id, draft.directions));
    } catch {
      missing.push('directions');
    }
  }
  // ⚠️ LAST, AND ONLY ON THE ADDRESS IT BELONGS TO (the header): never with her own point.
  if (draft.pin === null && draft.google !== null && addressLanded) {
    try {
      await calls.setGooglePoint(setGooglePointArgs(place.id, draft.google));
    } catch {
      // Nothing to tell her: her kitchen's screen asks Google again.
    }
  }
  return { kitchenId, missing };
}

/**
 * Her list of kitchens with the one just made — written into the cache the
 * moment it exists. ⚠️ WITHOUT IT, THE SIGN-UP COULD HANG ON A RE-READ: the guard
 * moves her only when her kitchens say she has one, and a re-read sent as the
 * signal drops would leave her on the last screen with nothing to do. The
 * re-read still goes out and replaces this with the database's answer.
 */
export function withKitchen(kitchens: readonly Kitchen[] | undefined, made: Made, draft: Draft): Kitchen[] {
  const list = [...(kitchens ?? [])];
  if (list.some((kitchen) => kitchen.id === made.kitchenId)) return list;
  const giroPrincipal = made.missing.includes('giro') ? null : draft.giro;
  return [...list, { id: made.kitchenId, displayName: draft.name, giroPrincipal }];
}

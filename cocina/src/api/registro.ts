// ============================================================================
// MAKING HER KITCHEN, IN ORDER. Plan task `10.4b-iii-b`.
//
// Four writes, as Wera's onboarding makes a shop (`app/src/api/hooks.ts`,
// `useOnboardWorkspace`): the kitchen (`onboard_workspace` with the kind), then
// her trade, her address and her pin on the place it made.
//
// ⚠️⚠️ ONLY THE FIRST CAN FAIL THE SIGN-UP. Once `onboard_workspace` answers,
// the kitchen exists, and a later step that fails leaves it made — Wera's rule —
// because her kitchen's screen is the second door for each one: it shows what
// she gave and asks for whatever is missing. She is never shown an error about
// a step she can finish there (users don't do bookkeeping).
//
// ⚠️ ALL FOUR BEFORE THE KITCHENS READ IS REFRESHED, AND THAT ORDER IS THE
// MECHANISM (Wera's `9d`): the guard moves her to her kitchen the moment the
// read answers with one (`@/auth/guard`), so the kitchen must be whole by then
// — or her screen opens without the address and fills a moment later.
//
// ⚠️ PURE: the calls are handed in (`@/api/calls`' `kitchenCalls` on the phone),
// so `test/registro.test.ts` can fail each one and watch the rest.
// ============================================================================

import { checkKitchenName, onboardArgs, type Kitchen, type OnboardArgs } from '@/api/kitchen';
import {
  EMPTY_ADDRESS,
  checkAddress,
  setStoreAddressArgs,
  setStorePinArgs,
  type AddressForm,
  type AddressIssue,
  type Pin,
  type Place,
  type SetStoreAddressArgs,
  type SetStorePinArgs,
} from '@/api/place';

/**
 * What the two sign-up screens collect, before it is checked: the form (her
 * kitchen's name, her trade, her address), then the map (the pin and its line).
 * Kept while she steps back and forth (`@/lib/borrador`), so a step back to fix
 * a typo does not lose the pin.
 */
export interface Borrador {
  readonly name: string;
  readonly giro: string | null;
  readonly address: AddressForm;
  readonly pin: Pin | null;
  readonly directions: string;
}

/** Nothing typed, nothing chosen — her trade included (a proposal must not look decided). */
export const BORRADOR_VACIO: Borrador = { name: '', giro: null, address: EMPTY_ADDRESS, pin: null, directions: '' };

/** The first thing the form still needs, in the order the screen asks it. */
export type FormIssue = 'name' | 'giro' | AddressIssue;

export function formIssue(borrador: Borrador): FormIssue | null {
  if (checkKitchenName(borrador.name) === null) return 'name';
  if (borrador.giro === null) return 'giro';
  return checkAddress(borrador.address);
}

/** The draft the map's button sends, or `null` while anything is missing — the pin included. */
export function draftFrom(borrador: Borrador): Draft | null {
  const name = checkKitchenName(borrador.name);
  if (name === null || borrador.giro === null || borrador.pin === null) return null;
  if (checkAddress(borrador.address) !== null) return null;
  return { name, giro: borrador.giro, address: borrador.address, pin: borrador.pin, directions: borrador.directions };
}

/** Everything the two sign-up screens collect, checked. */
export interface Draft {
  readonly name: string;
  readonly giro: string;
  readonly address: AddressForm;
  readonly pin: Pin;
  /** As she typed it; `setStorePinArgs` makes it one line, or none. */
  readonly directions: string;
}

/** The round trips, as `@/api/calls` makes them. */
export interface KitchenCalls {
  readonly onboard: (args: OnboardArgs) => Promise<string>;
  readonly setGiro: (kitchenId: string, giro: string) => Promise<void>;
  readonly firstPlace: (kitchenId: string) => Promise<Place | null>;
  readonly setAddress: (args: SetStoreAddressArgs) => Promise<void>;
  readonly setPin: (args: SetStorePinArgs) => Promise<void>;
}

/** What a later step could not write, which her kitchen's screen asks for again. */
export type Missing = 'giro' | 'address' | 'pin';

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
  if (place === null) return { kitchenId, missing: [...missing, 'address', 'pin'] };

  try {
    await calls.setAddress(setStoreAddressArgs(place.id, draft.address));
  } catch {
    missing.push('address');
  }
  try {
    await calls.setPin(setStorePinArgs(place.id, draft.pin, draft.directions));
  } catch {
    missing.push('pin');
  }
  return { kitchenId, missing };
}

/**
 * Her list of kitchens with the one just made — written into the cache the
 * moment it exists. ⚠️ WITHOUT IT, THE SIGN-UP COULD HANG ON A RE-READ: the guard
 * moves her only when her kitchens say she has one, and a re-read sent as the
 * signal drops would leave her on the map with nothing to do. The re-read still
 * goes out and replaces this with the database's answer.
 */
export function withKitchen(kitchens: readonly Kitchen[] | undefined, made: Made, draft: Draft): Kitchen[] {
  const list = [...(kitchens ?? [])];
  if (list.some((kitchen) => kitchen.id === made.kitchenId)) return list;
  const giroPrincipal = made.missing.includes('giro') ? null : draft.giro;
  return [...list, { id: made.kitchenId, displayName: draft.name, giroPrincipal }];
}

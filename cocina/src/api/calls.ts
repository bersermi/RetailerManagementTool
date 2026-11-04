// ============================================================================
// EVERY ROUND TRIP THIS APP MAKES TO THE DATABASE. Plan tasks `10.4b-iii-a` (her
// kitchens), `10.4b-iii-b` (making one: her trade, her address, her pin),
// `10.4b-iii-c` (her way out: what goes with her account, the deletion, Apple),
// `10.5-iii-c` (her kitchen deleted alone, her login kept),
// `10.4b-iv-a` (what she publishes: her list, publishing, withdrawing),
// `10.4h` (address first: her line with no pin, and her pin cleared) and `10.5-ii`
// (her page in Itacate, and the pictures that go up before what points at them).
//
// ⚠️ THE IMPURE HALF OF `src/api/` (ADR-035 §2.11): the only module here that
// imports the live client, so no node suite can load it; every name it sends is
// a constant from a pure module beside it (`@/api/kitchen`, `@/api/place`,
// `@/api/account`, `@/api/listing`, `@/api/pagina`, `@/api/fotos`), which the
// suite and the contract checks read. Screens reach these through `@/api/hooks`.
// ============================================================================

import type { FunctionRegion } from '@supabase/supabase-js';

import {
  APPLE_REVOKE,
  APPLE_REVOKE_REGION,
  APPLE_REVOKE_TIMEOUT_MS,
  DELETE_MY_ACCOUNT,
  DELETE_MY_BUSINESS,
  OWNERS_TABLE,
  OWNER_ACTIVE_COLUMN,
  OWNER_COLUMNS,
  OWNER_ROLE,
  OWNER_ROLE_COLUMN,
  deletedFrom,
  revokeBody,
  type DeleteArgs,
  type DeleteBusinessArgs,
  type Deleted,
  type OwnerRow,
} from '@/api/account';
import type { DireccionCalls } from '@/api/direccion';
import {
  PHOTO_BUCKET,
  PHOTO_TYPE,
  alreadyStored,
  bytesOf,
  photoHeaders,
  photoUrl,
  type FotoNueva,
  type PhotoSize,
} from '@/api/fotos';
import {
  COCINA_KIND,
  GIRO_COLUMN,
  KIND_COLUMN,
  KITCHEN_COLUMNS,
  KITCHEN_GIROS,
  KITCHEN_ORDER,
  ONBOARD_WORKSPACE,
  WORKSPACE_TABLE,
  girosFrom,
  toKitchen,
  type Giro,
  type Kitchen,
  type KitchenRow,
  type OnboardArgs,
} from '@/api/kitchen';
import {
  LINES_TABLE,
  LINE_ORDER,
  LISTING_COLUMNS,
  LISTING_LIMIT,
  LISTING_ORDER,
  LISTING_OWNER_COLUMN,
  LISTING_TABLE,
  PUBLISH_LISTING,
  WITHDRAW_LISTING,
  listingsFrom,
  orderTerm,
  type Listing,
  type PublishArgs,
  type WithdrawArgs,
} from '@/api/listing';
import {
  CLEAR_STORE_PIN,
  PLACE_ACTIVE_COLUMN,
  PLACE_COLUMNS,
  PLACE_ORDER,
  PLACE_OWNER_COLUMN,
  PLACE_TABLE,
  SET_STORE_ADDRESS,
  SET_STORE_DIRECTIONS,
  SET_STORE_PIN,
  toPlace,
  type ClearStorePinArgs,
  type Place,
  type PlaceRow,
  type SetStoreAddressArgs,
  type SetStoreDirectionsArgs,
  type SetStorePinArgs,
} from '@/api/place';
import {
  PAGE_COLUMNS,
  PAGE_OWNER_COLUMN,
  PAGE_TABLE,
  SET_KITCHEN_PAGE,
  toPage,
  type Page,
  type PageFields,
  type SetPageArgs,
} from '@/api/pagina';
import type { KitchenCalls } from '@/api/registro';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/lib/supabase';

/**
 * Her kitchens, the first-made first. An empty array is an answer — "no kitchen
 * yet" — not a failure: `workspace_select` (`0001`) returns exactly the
 * businesses she is an active member of, and the filter keeps the shops out.
 */
export async function myKitchens(): Promise<Kitchen[]> {
  let query = supabase.from(WORKSPACE_TABLE).select(KITCHEN_COLUMNS).eq(KIND_COLUMN, COCINA_KIND);
  for (const column of KITCHEN_ORDER.split(',')) query = query.order(column);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as KitchenRow[]).map(toKitchen);
}

/** The kitchens' trades, in their order (`kitchen_giros()`, `0072`). */
export async function kitchenGiros(): Promise<Giro[]> {
  const { data, error } = await supabase.rpc(KITCHEN_GIROS);
  if (error) throw error;
  return girosFrom(data);
}

/** Makes her kitchen — the business, her owner membership and its first place — and returns its id. */
export async function onboardKitchen(args: OnboardArgs): Promise<string> {
  const { data, error } = await supabase.rpc(ONBOARD_WORKSPACE, args);
  if (error) throw error;
  if (typeof data !== 'string') throw new Error(`${ONBOARD_WORKSPACE} returned ${typeof data}, expected a kitchen id`);
  return data;
}

/**
 * Her trade, by the owner's plain update (Wera's `setMainGiro`). ⚠️
 * `.select().single()` AND NOT A BARE UPDATE: a refusal is a 200 with no row,
 * which would otherwise come back looking saved.
 */
export async function setKitchenGiro(kitchenId: string, giro: string): Promise<void> {
  const { error } = await supabase
    .from(WORKSPACE_TABLE)
    .update({ [GIRO_COLUMN]: giro })
    .eq('id', kitchenId)
    .select('id')
    .single();
  if (error) throw error;
}

/**
 * Her kitchen's place — the first active one of THIS kitchen, or `null`.
 * ⚠️ FILTERED ON THE KITCHEN: unfiltered, a shop's owner's first place is her
 * shop's store (`@/api/place`'s header).
 */
export async function firstPlace(kitchenId: string): Promise<Place | null> {
  let query = supabase
    .from(PLACE_TABLE)
    .select(PLACE_COLUMNS)
    .eq(PLACE_OWNER_COLUMN, kitchenId)
    .eq(PLACE_ACTIVE_COLUMN, true);
  for (const column of PLACE_ORDER.split(',')) query = query.order(column);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  const rows = (data ?? []) as unknown as PlaceRow[];
  return rows.length === 0 ? null : toPlace(rows[0]);
}

/** Her address, through `set_store_address` (`0069`). */
export async function setPlaceAddress(args: SetStoreAddressArgs): Promise<void> {
  const { error } = await supabase.rpc(SET_STORE_ADDRESS, args);
  if (error) throw error;
}

/** Her pin and its line of directions, through `set_store_pin` (`0072`). ⚠️ It writes both, every call. */
export async function setPlacePin(args: SetStorePinArgs): Promise<void> {
  const { error } = await supabase.rpc(SET_STORE_PIN, args);
  if (error) throw error;
}

/** Her line of directions alone, through `set_store_directions` (`0075`); her pin untouched. */
export async function setPlaceDirections(args: SetStoreDirectionsArgs): Promise<void> {
  const { error } = await supabase.rpc(SET_STORE_DIRECTIONS, args);
  if (error) throw error;
}

/** Her own pin cleared, through `clear_store_pin` (`0075`); her line untouched. */
export async function clearPlacePin(args: ClearStorePinArgs): Promise<void> {
  const { error } = await supabase.rpc(CLEAR_STORE_PIN, args);
  if (error) throw error;
}

/**
 * Her last publications at this kitchen, the newest first, each with its lines
 * in her order. ⚠️ FILTERED ON THE KITCHEN (`@/api/listing`'s header): the walls
 * show a login every kitchen she belongs to. ⚠️ THE LINES' ORDER IS THE EMBED'S
 * OWN (`referencedTable`) — to-many, so it sorts the lines inside each one.
 */
export async function myListings(kitchenId: string): Promise<Listing[]> {
  let query = supabase.from(LISTING_TABLE).select(LISTING_COLUMNS).eq(LISTING_OWNER_COLUMN, kitchenId);
  for (const { column, ascending } of LISTING_ORDER.split(',').map(orderTerm)) query = query.order(column, { ascending });
  const { data, error } = await query.order(LINE_ORDER, { referencedTable: LINES_TABLE }).limit(LISTING_LIMIT);
  if (error) throw error;
  return listingsFrom(data);
}

/** Publishes the window and its lines in one call (`0072`). ⚠️ The id is the phone's; a retry returns it. */
export async function publishListing(args: PublishArgs): Promise<string> {
  const { data, error } = await supabase.rpc(PUBLISH_LISTING, args);
  if (error) throw error;
  if (typeof data !== 'string') throw new Error(`${PUBLISH_LISTING} returned ${typeof data}, expected the publication's id`);
  return data;
}

/** Takes a publication down (`0072`); a second call keeps the first moment. */
export async function withdrawListing(args: WithdrawArgs): Promise<void> {
  const { error } = await supabase.rpc(WITHDRAW_LISTING, args);
  if (error) throw error;
}

/**
 * Her page (`10.5-ii`, `0076`): the open kitchen's row, or the page of defaults
 * when she has never saved one — no row is an answer, not a failure.
 */
export async function kitchenPage(kitchenId: string): Promise<Page> {
  const { data, error } = await supabase.from(PAGE_TABLE).select(PAGE_COLUMNS).eq(PAGE_OWNER_COLUMN, kitchenId).maybeSingle();
  if (error) throw error;
  return toPage(data as Partial<PageFields> | null);
}

/** What she changed on her page, through its one door (`0076`); it answers with the page as saved. */
export async function setKitchenPage(args: SetPageArgs): Promise<Page> {
  const { data, error } = await supabase.rpc(SET_KITCHEN_PAGE, args);
  if (error) throw error;
  return toPage(data as Partial<PageFields> | null);
}

/**
 * ⚠️ `10.5-ii`: EVERY FILE OF EVERY PICTURE TAKEN, into `cocina`, before what
 * points at it is saved — so a page or a dish never names a file that is not
 * there. One file at a time, the large one first. Already there is a success: the
 * retry of a save whose first attempt got this far (`alreadyStored`). Anything
 * else throws, and nothing is saved.
 */
export async function uploadPictures(fotos: readonly FotoNueva[]): Promise<void> {
  for (const foto of fotos) {
    for (const archivo of foto.archivos) {
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(`${foto.path}/${archivo.name}`, bytesOf(archivo.base64), { contentType: PHOTO_TYPE, upsert: false });
      if (error !== null && !alreadyStored(error)) throw error;
    }
  }
}

/**
 * ⚠️ `10.5-ii`: WHERE ONE SAVED PICTURE'S FILE IS, AND THE HEADERS THAT OPEN IT —
 * her own token, so the bucket's walls decide (`0076`) — Wera's `photoRequest`.
 * ⚠️ THE TOKEN IS HANDED IN, from `useAuth()`'s session: `supabase.auth` has
 * exactly one caller (`test/data-layer.test.ts`).
 */
export function photoRequest(
  path: string,
  size: PhotoSize,
  token: string,
): { readonly uri: string; readonly headers: Record<string, string> } {
  return { uri: photoUrl(SUPABASE_URL, path, size), headers: photoHeaders(token, SUPABASE_PUBLISHABLE_KEY) };
}

/** The writes and the read that make her kitchen, for `@/api/registro`. */
export const kitchenCalls: KitchenCalls = {
  onboard: onboardKitchen,
  setGiro: setKitchenGiro,
  firstPlace,
  setAddress: setPlaceAddress,
  setPin: setPlacePin,
  setDirections: setPlaceDirections,
};

/** The writes her address screen's *Guardar* sends, for `@/api/direccion`. */
export const direccionCalls: DireccionCalls = {
  setAddress: setPlaceAddress,
  setPin: setPlacePin,
  clearPin: clearPlacePin,
  setDirections: setPlaceDirections,
};

/**
 * Every active owner of every business she belongs to (`10.4b-iii-c`) — what
 * `businessesThatGo` reads to say which businesses go with her account. ⚠️ Not
 * filtered by kind: her shop in Wera goes too.
 */
export async function accountOwners(): Promise<OwnerRow[]> {
  const { data, error } = await supabase
    .from(OWNERS_TABLE)
    .select(OWNER_COLUMNS)
    .eq(OWNER_ROLE_COLUMN, OWNER_ROLE)
    .eq(OWNER_ACTIVE_COLUMN, true);
  if (error) throw error;
  return (data ?? []) as unknown as OwnerRow[];
}

/** Deletes her account (`0073`). ⚠️ The arguments arrive built by `deleteArgs`: a name for each business. */
export async function deleteMyAccount(args: DeleteArgs): Promise<Deleted> {
  const { data, error } = await supabase.rpc(DELETE_MY_ACCOUNT, args);
  if (error) throw error;
  return deletedFrom(data);
}

/**
 * Deletes one kitchen she alone owns and keeps her login (`0077`, `10.5-iii-c`).
 * ⚠️ The arguments arrive built by `deleteKitchenArgs`: the kitchen's id and the
 * name she typed. No Apple: no login goes.
 */
export async function deleteMyBusiness(args: DeleteBusinessArgs): Promise<void> {
  const { error } = await supabase.rpc(DELETE_MY_BUSINESS, args);
  if (error) throw error;
}

/**
 * Tells Apple she is leaving (Wera's `5R-k`). ⚠️ THE ONLY CALL HERE THAT IS NOT
 * TO POSTGRES: the Edge Function `@/api/account` names, with her own session,
 * told the code is Cocina's (`revokeBody`). It throws like every wrapper here,
 * and its one caller catches: a deletion is never refused because Apple, or the
 * function, could not be reached.
 */
export async function revokeApple(code: string): Promise<void> {
  const { error } = await supabase.functions.invoke(APPLE_REVOKE, {
    body: revokeBody(code),
    region: APPLE_REVOKE_REGION as FunctionRegion,
    timeout: APPLE_REVOKE_TIMEOUT_MS,
  });
  if (error) throw error;
}

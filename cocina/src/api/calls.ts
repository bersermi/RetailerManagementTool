// ============================================================================
// EVERY ROUND TRIP THIS APP MAKES TO THE DATABASE. Plan tasks `10.4b-iii-a` (her
// kitchens), `10.4b-iii-b` (making one: her trade, her address, her pin) and
// `10.4b-iii-c` (her way out: what goes with her account, the deletion, Apple).
//
// ⚠️ THE IMPURE HALF OF `src/api/` (ADR-035 §2.11): the only module here that
// imports the live client, so no node suite can load it; every name it sends is
// a constant from a pure module beside it (`@/api/kitchen`, `@/api/place`,
// `@/api/account`), which the suite and the contract checks read. Screens reach
// these through `@/api/hooks`.
// ============================================================================

import type { FunctionRegion } from '@supabase/supabase-js';

import {
  APPLE_REVOKE,
  APPLE_REVOKE_REGION,
  APPLE_REVOKE_TIMEOUT_MS,
  DELETE_MY_ACCOUNT,
  OWNERS_TABLE,
  OWNER_ACTIVE_COLUMN,
  OWNER_COLUMNS,
  OWNER_ROLE,
  OWNER_ROLE_COLUMN,
  deletedFrom,
  revokeBody,
  type DeleteArgs,
  type Deleted,
  type OwnerRow,
} from '@/api/account';
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
  PLACE_ACTIVE_COLUMN,
  PLACE_COLUMNS,
  PLACE_ORDER,
  PLACE_OWNER_COLUMN,
  PLACE_TABLE,
  SET_STORE_ADDRESS,
  SET_STORE_PIN,
  toPlace,
  type Place,
  type PlaceRow,
  type SetStoreAddressArgs,
  type SetStorePinArgs,
} from '@/api/place';
import type { KitchenCalls } from '@/api/registro';
import { supabase } from '@/lib/supabase';

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

/** Her pin and its line of directions, through `set_store_pin` (`0072`). */
export async function setPlacePin(args: SetStorePinArgs): Promise<void> {
  const { error } = await supabase.rpc(SET_STORE_PIN, args);
  if (error) throw error;
}

/** The four writes and the read that make her kitchen, for `@/api/registro`. */
export const kitchenCalls: KitchenCalls = {
  onboard: onboardKitchen,
  setGiro: setKitchenGiro,
  firstPlace,
  setAddress: setPlaceAddress,
  setPin: setPlacePin,
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

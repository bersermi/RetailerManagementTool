// ============================================================================
// EVERY ROUND TRIP THIS APP MAKES TO THE DATABASE. Plan tasks `10.5-iii-b` (her
// way out: what goes with her account, the deletion, Apple), `10.5-iv-a-i` (the
// door, and the kitchens' photos), `10.5-iv-a-ii` (the trades' names) and
// `10.5b-iii-a` (her reservations: reserving, cancelling, *Ya lo tengo*, her yes and
// her standing) and `10.5b-iii-b` (her stars about the kitchen).
//
// ⚠️ THE IMPURE HALF OF `src/api/` (ADR-035 §2.11), as Wera's and Wera Cocina's
// (`app/src/api/calls.ts`, `cocina/src/api/calls.ts`): the only module here that
// imports the live client besides the provider, so no node suite can load it;
// every name it sends is a constant from the pure modules beside it
// (`@/api/account`, `@/api/cocinas`, `@/api/fotos`), which the suite and the
// contract checks read. Screens reach these through `@/api/hooks`.
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
  CANCEL_MY_RESERVATION,
  CONFIRM_MY_PICKUP,
  GIVE_MY_YES,
  MY_RESERVATIONS,
  MY_STANDING,
  RATE_KITCHEN,
  RESERVE_PLATE,
  apartadosFrom,
  calificadoFrom,
  posicionFrom,
  rateArgs,
  reservadoFrom,
  reservationIdArgs,
  reserveArgs,
  type Apartado,
  type Calificacion,
  type Eleccion,
  type Posicion,
} from '@/api/apartados';
import { KITCHEN_GIROS, ON_OFFER_NOW, girosFrom, kitchensFrom, type Giro, type Kitchen } from '@/api/cocinas';
import { photoHeaders, photoUrl, type PhotoSize } from '@/api/fotos';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/lib/supabase';

/**
 * ⚠️ `10.5-iv-a-i`: THE ONE DOOR (`0078`) — every kitchen a neighbour may see, with
 * what it offers and the point to draw. No arguments: for the pilot it takes no
 * area, so nothing of where she is is sent (the owner's ruling of 2026-11-04,
 * night). A kitchen it cannot read is dropped by `kitchensFrom`, never the list.
 */
export async function onOfferNow(): Promise<Kitchen[]> {
  const { data, error } = await supabase.rpc(ON_OFFER_NOW);
  if (error) throw error;
  return kitchensFrom(data);
}

/**
 * ⚠️ `10.5-iv-a-ii`: the kitchens' trades, in their order (`kitchen_giros()`, `0072`)
 * — Wera Cocina's `kitchenGiros`. Only their names, for her page's line under her
 * name: the catalogue, read by anyone signed in, never a business's rows.
 */
export async function kitchenGiros(): Promise<Giro[]> {
  const { data, error } = await supabase.rpc(KITCHEN_GIROS);
  if (error) throw error;
  return girosFrom(data);
}

/**
 * Where one of a kitchen's pictures is, and the headers that open it — HER OWN
 * token, so the bucket's walls decide (`0076`: anyone signed in, while the kitchen
 * exists) — Wera Cocina's `photoRequest`. ⚠️ The token is handed in, from
 * `useAuth()`'s session: `supabase.auth` has exactly one caller
 * (`test/data-layer.test.ts`).
 */
export function photoRequest(
  path: string,
  size: PhotoSize,
  token: string,
): { readonly uri: string; readonly headers: Record<string, string> } {
  return { uri: photoUrl(SUPABASE_URL, path, size), headers: photoHeaders(token, SUPABASE_PUBLISHABLE_KEY) };
}

/**
 * Every active owner of every business she belongs to — what `businessesThatGo`
 * reads to say which businesses go with her account. A neighbour belongs to
 * none: `[]`, an answer and not a failure. ⚠️ Not filtered by kind: her shop in
 * Wera goes too, as her kitchen in Wera Cocina does.
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
 * told the code is Itacate's (`revokeBody`). It throws like every wrapper here,
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

/**
 * ⚠️ `10.5b-iii-a`: ONE PLATE, AT HER HOUR, BY HER METHOD (`0079`'s `reserve_plate`,
 * `0080`'s refusals). The id is the phone's: a retry of the same choice answers the
 * reservation already made, never a second one.
 */
export async function reservePlate(eleccion: Eleccion): Promise<{ readonly id: string; readonly codigo: string }> {
  const { data, error } = await supabase.rpc(RESERVE_PLATE, reserveArgs(eleccion));
  if (error) throw error;
  return reservadoFrom(data);
}

/** Hers: every reservation still to collect and her last 30 days (`0079`, `0080`). */
export async function myReservations(): Promise<Apartado[]> {
  const { data, error } = await supabase.rpc(MY_RESERVATIONS);
  if (error) throw error;
  return apartadosFrom(data);
}

/** Gives her plate back — the state it left, `cancelado` or `no_va` (`0079`). */
export async function cancelMyReservation(id: string): Promise<string> {
  const { data, error } = await supabase.rpc(CANCEL_MY_RESERVATION, reservationIdArgs(id));
  if (error) throw error;
  return typeof data === 'string' ? data : '';
}

/** *Ya lo tengo* (`0079`). */
export async function confirmMyPickup(id: string): Promise<string> {
  const { data, error } = await supabase.rpc(CONFIRM_MY_PICKUP, reservationIdArgs(id));
  if (error) throw error;
  return typeof data === 'string' ? data : '';
}

/** Her express yes, once (`0080`); a second call answers the first moment. */
export async function giveMyYes(): Promise<void> {
  const { error } = await supabase.rpc(GIVE_MY_YES);
  if (error) throw error;
}

/** Her own standing (`0080`): her yes, her score, each label's count, how many she may hold. */
export async function myStanding(): Promise<Posicion> {
  const { data, error } = await supabase.rpc(MY_STANDING);
  if (error) throw error;
  return posicionFrom(data);
}

/**
 * Her stars about the kitchen of a plate she collected (`0080`), with the tags of their
 * band and a note only Wera reads. Each call sets all three.
 */
export async function rateKitchen(id: string, calificacion: Calificacion): Promise<{ readonly estrellas: number }> {
  const { data, error } = await supabase.rpc(RATE_KITCHEN, rateArgs(id, calificacion));
  if (error) throw error;
  return calificadoFrom(data);
}

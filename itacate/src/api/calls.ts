// ============================================================================
// EVERY ROUND TRIP THIS APP MAKES TO THE DATABASE. Plan task `10.5-iii-b` (her
// way out: what goes with her account, the deletion, Apple).
//
// ⚠️ THE IMPURE HALF OF `src/api/` (ADR-035 §2.11), as Wera's and Wera Cocina's
// (`app/src/api/calls.ts`, `cocina/src/api/calls.ts`): the only module here that
// imports the live client besides the provider, so no node suite can load it;
// every name it sends is a constant from the pure module beside it
// (`@/api/account`), which the suite and the contract checks read. Screens reach
// these through `@/api/hooks`. The door (`10.5-iv`) adds its call here.
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
import { supabase } from '@/lib/supabase';

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

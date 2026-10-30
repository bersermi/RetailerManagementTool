// ============================================================================
// EVERY ROUND TRIP THIS APP MAKES TO THE DATABASE. Plan task `10.4b-iii-a`.
//
// ⚠️ THE IMPURE HALF OF `src/api/` (ADR-035 §2.11): the only module here that
// imports the live client, so no node suite can load it; every name it sends is
// a constant from a pure module beside it (`@/api/kitchen`), which the suite and
// the contract check read. Screens reach these through `@/api/hooks`.
// ============================================================================

import {
  COCINA_KIND,
  KIND_COLUMN,
  KITCHEN_COLUMNS,
  KITCHEN_ORDER,
  WORKSPACE_TABLE,
  toKitchen,
  type Kitchen,
  type KitchenRow,
} from '@/api/kitchen';
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

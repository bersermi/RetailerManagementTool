// ============================================================================
// HOW MANY NEIGHBOURS FOLLOW HER KITCHEN — A CONTRACT WITH POSTGRES. Plan task `10.9d-i`, on
// `0084`'s `kitchen_followers` (the owner's ruling G22 of 2026-11-17: *Te siguen N*, never
// who). Drawn by `10.9d-ii`: on the day's card on *Hoy*, and before *Eliminar esta cocina*,
// warned and never blocked (G23).
//
// ⚠️ A NUMBER AND ONLY A NUMBER: the database answers how many follow her kitchen — never who,
// never when — and a neighbour who only rings its bell is not counted. ⚠️ EVERY MEMBER READS
// IT, her helpers too (a helper's *Hoy* draws the day's card); anyone else is refused
// (`42501`), a shop too (`TD013`).
//
// ⚠️ AN ANSWER THAT IS NOT A COUNT IS `null`, and a screen draws nothing for it — never a 0
// that is not one. The names below are read OUT OF THIS FILE by
// `docs/checks/10.9d-i-following-contract.sh`, which asks a real PostgREST with each;
// `test/seguidores.test.ts` holds them to `0084`'s TEXT.
// ============================================================================

/** `0084`'s read: how many neighbours follow her kitchen — any member. */
export const KITCHEN_FOLLOWERS = 'kitchen_followers';

export interface FollowersArgs {
  readonly p_workspace_id: string;
}

export function followersArgs(kitchenId: string): FollowersArgs {
  return { p_workspace_id: kitchenId };
}

/** The answer read: a whole number from zero, or `null` when it is not one. */
export function teSiguenFrom(data: unknown): number | null {
  return typeof data === 'number' && Number.isInteger(data) && data >= 0 ? data : null;
}

/** The prefix her kitchen's count is cached under. */
export const SEGUIDORES_KEY = ['cocina', 'seguidores'] as const;

/** Cached under the login and the kitchen, Cocina's rule. */
export function seguidoresKey(userId: string | null, kitchenId: string | null): readonly unknown[] {
  return [...SEGUIDORES_KEY, userId ?? '', kitchenId ?? ''];
}

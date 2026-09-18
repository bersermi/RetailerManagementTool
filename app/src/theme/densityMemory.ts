// ============================================================================
// C3.18's MODE, REMEMBERED. Plan task 5b-ii-a, and it closes a seam that has
// been open since `5a-ii`.
//
// `DensityProvider` has always said so in its own header: *"the choice is not
// persisted yet, and that is a seam, not an oversight… storage arrives with the
// session in 5a-iii and the settings surface in 5b's Ajustes."* `5a-iii-b`
// built the storage and deliberately did NOT write this, because the only
// control that could have set it was the temporary switch on Inicio — and
// *"persisting it behind a placeholder switch would put the write in the file
// that gets deleted."* That file is deleted by this task, and the switch it
// carried now lives on a surface that is not going anywhere.
//
// ⚠️⚠️ IT IS A DEVICE SETTING AND NEVER A WORKSPACE ONE (`5a-ii` decision 4).
// An elder shopkeeper and their twenty-year-old nephew share a shop and do not
// share a pair of eyes, and C1.5 says they do not share a phone either — there
// is no shared till. So this is the device's answer, written beside the route
// memory in the same store, and NOTHING about it is ever sent to Postgres.
// `workspace_setting` is where a SHOP's preferences live and this is not one.
//
// ⚠️ THE RULES ARE SPLIT FROM THE STORAGE, exactly as `lastScreen.ts` splits
// them and for the same reason: passing the store in as an argument is what
// makes every line below readable by `app/test/density-memory.test.ts`,
// including what happens when there is no store at all.
// ============================================================================

import { DENSITY_MODES, type DensityMode } from '@/theme/density';
import { deviceStore, readKey, writeKey, type DeviceStore } from '@/lib/store';

/** The storage key. Namespaced, because the session and the route share this store. */
export const DENSITY_KEY = 'wera.density';

/**
 * As much of `Storage` as this file uses. ⚠️ THE SAME ONE `lastScreen.ts` TAKES
 * — one interface, in `@/lib/store`, because there are now two readers of one
 * device store and two copies of it would be the thirteenth stale duplicate
 * recorded in this repository.
 */
export type DensityMemory = DeviceStore;

/** The store, if there is one. See `@/lib/store` for why it is read lazily. */
export function densityMemory(): DensityMemory | undefined {
  return deviceStore();
}

/**
 * Is this string one of C3.18's two modes?
 *
 * ⚠️ IT IS DERIVED FROM `DENSITY_MODES` AND NOT A PAIR OF COMPARISONS, so a
 * third mode added to `density.ts` is readable from storage the day it exists.
 * A hand-written `=== 'normal' || === 'elder'` is the shape that silently
 * refuses to restore whatever comes third.
 */
export function isDensityMode(value: string | null): value is DensityMode {
  return value !== null && (DENSITY_MODES as readonly string[]).includes(value);
}

/**
 * The mode this device chose, or `null` for "nothing usable stored".
 *
 * ⚠️ `null` IS NOT `'normal'`, AND THE DIFFERENCE IS WHOSE DECISION IT IS.
 * `normal` is the default the app picks for somebody who has never chosen;
 * `null` is the absence of a choice. They render identically today and they are
 * not the same fact — the moment anything wants to know whether this person has
 * ever been to Ajustes, collapsing them here is the answer already lost.
 *
 * Junk in the store — a value written by a version of this app that had a third
 * mode, a half-written row, anything at all — reads as `null` and the app opens
 * at `normal`. Nothing kept here is worth refusing to launch over.
 */
export function readDensityMode(memory: DensityMemory | undefined): DensityMode | null {
  const stored = readKey(memory, DENSITY_KEY);
  return isDensityMode(stored) ? stored : null;
}

/**
 * Remember the mode.
 *
 * ⚠️ IT WRITES ONLY A VALUE `readDensityMode` WOULD ACCEPT — the same filter
 * `rememberLastScreen` puts on the way in, for the same reason: a store that
 * accumulates values nothing will ever read back is a store whose next reader
 * has to work out which entries meant anything.
 */
export function rememberDensityMode(memory: DensityMemory | undefined, mode: DensityMode): void {
  if (!isDensityMode(mode)) return;
  writeKey(memory, DENSITY_KEY, mode);
}

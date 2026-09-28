// ============================================================================
// THE PILOT'S READINGS ON THE WIRE — `0043`'s function, its table, and who may
// read it back. Plan task `5P-a`.
//
// ⚠️ A CONTRACT MODULE: names and shapes written once (`R13`), and every
// decision about them, in a file `app/test/api-pilot.test.ts` can load.
// `@/api/calls` makes the two calls and decides nothing.
//
// ⚠️⚠️ THE MEMBER IS NOT HERE, AND THAT IS `0043`'S DECISION 1 BEING OBEYED.
// A reading names the person who was signed in (the decision maker's ruling of
// 2026-09-28) — but the FUNCTION stamps it off `auth.uid()`. There is no key for
// it in the payload, so no phone can file a reading under somebody else.
//
// ⚠️ OWNER ONLY READS IT BACK — ruling 45. `pilot_reading_select` answers a
// manager with ZERO ROWS AND NO ERROR, which on a panel is *no readings yet*: a
// false statement. So the read is not ASKED for anybody else (`canRead`), the
// shape `approvals.ts` established for the same reason.
// ============================================================================

import type { Role } from '@/api/members';
import type { Reading } from '@/pilot/readings';

export const RECORD_PILOT_READINGS = 'record_pilot_readings';

/** `0043` refuses a batch above 500; this stays under it with room. */
export const SEND_BATCH = 200;

export const PILOT_TABLE = 'pilot_reading';

/** What the panel reads — no member, no device, no id: it summarises, it does not list. */
export const PILOT_COLUMNS = 'kind,screen,value,occurred_at';

export const PILOT_TIME_COLUMN = 'occurred_at';

export const PILOT_WORKSPACE_COLUMN = 'workspace_id';

/**
 * ⚠️ `id` IS THE TIEBREAK AND IT IS NOT IN `PILOT_COLUMNS`. PostgREST orders by
 * a column it does not return; the order only has to be TOTAL, or two pages
 * can share a row and miss another when two readings carry one instant.
 */
export const PILOT_TIEBREAK = 'id';

/** Below PostgREST's `max_rows` (1000), which truncates without saying so. */
export const PILOT_PAGE = 500;

/** How far back the panel reads: the pilot's week, and §5's *five consecutive days*. */
export const PILOT_DAYS = 7;

/** One stored reading as the panel receives it. */
export interface PilotRow {
  readonly kind: string;
  readonly screen: string;
  readonly value: number;
  readonly occurred_at: string;
}

/** `record_pilot_readings`' arguments, `p_`-prefixed as `0043` names them. */
export function sendArgs(
  workspaceId: string,
  readings: readonly Reading[],
  deviceId: string,
  build: string,
): { p_workspace_id: string; p_readings: readonly Record<string, unknown>[] } {
  return {
    p_workspace_id: workspaceId,
    p_readings: readings.map((reading) => ({
      id: reading.id,
      location_id: reading.locationId,
      device_id: deviceId,
      kind: reading.kind,
      screen: reading.screen,
      value: reading.value,
      occurred_at: reading.occurredAt,
      build,
    })),
  };
}

/** Whether to ask for the readings at all. Ruling 45: the owner, and nobody else. */
export function canRead(role: Role | null): boolean {
  return role === 'owner';
}

/** The first instant the panel reads from: local midnight, `PILOT_DAYS - 1` days before `now`. */
export function pilotSince(now: Date): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (PILOT_DAYS - 1));
  return start.toISOString();
}

/** Local midnight of `now`'s own day, as the instant a *today* filter starts at. */
export function todayStart(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function pilotKey(workspaceId: string | null, since: string): readonly unknown[] {
  return ['pilot-readings', workspaceId, since];
}

/**
 * ⚠️ A SEND THAT CAME BACK WITH A CODE IS DROPPED, NOT RETRIED. A refusal from
 * `0043` — a location that left the shop, a member deactivated — will be
 * refused again on every attempt, and a readings batch that can never land
 * must not sit in front of the ones that can. A send with NO code is the
 * network, and waits for the next chance.
 */
export function droppable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code !== '';
}

/** The rows the panel's *today* speaks about: those at or after local midnight. */
export function todayRows(rows: readonly PilotRow[], now: Date): readonly PilotRow[] {
  const start = todayStart(now);
  return rows.filter((row) => Date.parse(row.occurred_at) >= start);
}

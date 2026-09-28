import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  PILOT_COLUMNS,
  PILOT_DAYS,
  PILOT_PAGE,
  PILOT_TABLE,
  PILOT_TIEBREAK,
  PILOT_TIME_COLUMN,
  PILOT_WORKSPACE_COLUMN,
  RECORD_PILOT_READINGS,
  SEND_BATCH,
  canRead,
  droppable,
  pilotKey,
  pilotSince,
  sendArgs,
  todayRows,
  todayStart,
  type PilotRow,
} from '@/api/pilot';
import type { Reading } from '@/pilot/readings';

// ============================================================================
// @/api/pilot — `0043` on the wire. Plan task `5P-a`.
//
// ⚠️ The names are compared to the MIGRATION, read as text: a column or an
// argument spelled differently here is a 400 on every send, and a send that
// comes back with a code is DROPPED (`droppable`) — the readings lost, and
// nothing red. The last block reads the SCREENS and the RECORDER as text,
// because `R2` keeps components out of this suite and the binding is the part
// that would otherwise be invisible.
// ============================================================================

const ROOT = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');
const MIGRATION = read('supabase/migrations/0043_pilot_reading.sql');

const READING: Reading = {
  id: '11111111-1111-4111-8111-111111111111',
  workspaceId: 'ws',
  locationId: 'loc',
  kind: 'taps',
  screen: 'vender',
  value: 3,
  occurredAt: '2026-09-28T17:00:00.000Z',
};

describe('the contract is 0043’s', () => {
  it('calls the function 0043 creates, with its two arguments', () => {
    expect(RECORD_PILOT_READINGS).toBe('record_pilot_readings');
    expect(MIGRATION).toMatch(
      /create function public\.record_pilot_readings\(\s*p_workspace_id uuid,\s*p_readings\s+jsonb\s*\)/,
    );
    expect(Object.keys(sendArgs('ws', [READING], 'dev', 'b'))).toEqual(['p_workspace_id', 'p_readings']);
  });

  it('sends each reading under exactly the keys the function reads', () => {
    const [sent] = sendArgs('ws', [READING], 'dev', 'b').p_readings;
    const keys = Object.keys(sent).sort();
    expect(keys).toEqual(
      ['build', 'device_id', 'id', 'kind', 'location_id', 'occurred_at', 'screen', 'value'].sort(),
    );
    for (const key of keys) expect(MIGRATION).toContain(`r ->> '${key}'`);
  });

  it('⚠️ sends NO member — 0043 stamps it off auth.uid(), decision 1', () => {
    const [sent] = sendArgs('ws', [READING], 'dev', 'b').p_readings;
    expect(Object.keys(sent).some((key) => /member|user/.test(key))).toBe(false);
  });

  it('puts the device and the build on every reading', () => {
    const { p_readings } = sendArgs('ws', [READING, { ...READING, id: 'x' }], 'dev-1', 'build-7');
    for (const sent of p_readings) expect(sent).toMatchObject({ device_id: 'dev-1', build: 'build-7' });
  });

  it('keeps a batch under 0043’s refusal at 500', () => {
    expect(MIGRATION).toMatch(/jsonb_array_length\(p_readings\) > 500/);
    expect(SEND_BATCH).toBeLessThanOrEqual(500);
  });

  it('reads a table and columns 0043 creates', () => {
    expect(MIGRATION).toContain(`create table public.${PILOT_TABLE} (`);
    for (const column of [
      ...PILOT_COLUMNS.split(','),
      PILOT_TIME_COLUMN,
      PILOT_WORKSPACE_COLUMN,
      PILOT_TIEBREAK,
    ]) {
      expect(MIGRATION).toMatch(new RegExp(`^  ${column}\\s+`, 'm'));
    }
  });

  it('never asks for the member, the device or the id — it summarises, it does not list', () => {
    expect(PILOT_COLUMNS.split(',')).not.toContain('member_id');
    expect(PILOT_COLUMNS.split(',')).not.toContain('device_id');
    expect(PILOT_COLUMNS.split(',')).not.toContain('id');
  });

  it('pages below PostgREST’s max_rows of 1000', () => {
    expect(PILOT_PAGE).toBeLessThan(1000);
  });
});

describe('who reads it back — ruling 45', () => {
  it('asks for the owner and for nobody else', () => {
    expect(canRead('owner')).toBe(true);
    expect(canRead('manager')).toBe(false);
    expect(canRead('staff')).toBe(false);
    expect(canRead(null)).toBe(false);
  });

  it('agrees with the policy 0043 writes', () => {
    expect(MIGRATION).toMatch(/public\.has_role\(workspace_id, 'owner'\)/);
  });
});

describe('what a failed send means', () => {
  it('drops a refusal — it has a code and will be refused again', () => {
    expect(droppable({ code: '22023', message: 'x' })).toBe(true);
    expect(droppable({ code: '42501' })).toBe(true);
  });

  it('keeps the network — no code, and the next chance may land it', () => {
    expect(droppable(new TypeError('Network request failed'))).toBe(false);
    expect(droppable({ code: '' })).toBe(false);
    expect(droppable(null)).toBe(false);
  });
});

describe('the window', () => {
  // ⚠️ LOCAL instants, so this holds on a UTC−6 Mac and a UTC runner alike.
  const evening = new Date(2026, 8, 28, 21, 30);

  it('starts at local midnight, PILOT_DAYS − 1 days back', () => {
    expect(PILOT_DAYS).toBe(7);
    expect(new Date(pilotSince(evening)).getTime()).toBe(new Date(2026, 8, 22).getTime());
  });

  it('crosses a month boundary', () => {
    expect(new Date(pilotSince(new Date(2026, 9, 2, 10))).getTime()).toBe(new Date(2026, 8, 26).getTime());
  });

  it('keeps today’s rows from local midnight on', () => {
    const at = (d: Date): PilotRow => ({ kind: 'taps', screen: 'vender', value: 1, occurred_at: d.toISOString() });
    const kept = todayRows(
      [at(new Date(2026, 8, 27, 23, 59)), at(new Date(2026, 8, 28, 0, 0)), at(new Date(2026, 8, 28, 20))],
      evening,
    );
    expect(kept).toHaveLength(2);
    expect(todayStart(evening)).toBe(new Date(2026, 8, 28).getTime());
  });

  it('keys the read on the shop and the window', () => {
    expect(pilotKey('ws', 'since')).toEqual(['pilot-readings', 'ws', 'since']);
  });
});

describe('the wiring — read as text, because R2 keeps components out of this suite', () => {
  const RECORDER = read('app/src/pilot/recorder.ts');

  it('every export of the recorder is a no-op without the flag, on its first line', () => {
    const exported = [...RECORDER.matchAll(/export (?:async )?function (\w+)\([^)]*\)[^{]*\{\n([^\n]*)/g)];
    expect(exported.length).toBeGreaterThanOrEqual(9);
    for (const [, name, first] of exported) {
      expect(first, name).toMatch(/if \(PILOT_BUILD === null/);
    }
  });

  it.each([
    ['vender', "usePilotVisit('vender', workspace?.id ?? null, locationId, !loading && entries.length > 0)"],
    ['comprar', "usePilotVisit('comprar', workspace?.id ?? null, locationId)"],
    ['desperdicio', "usePilotVisit('desperdicio', workspace?.id ?? null, locationId)"],
  ])('%s is measured: the hook, its root view, the commit and the confirmation', (screen, call) => {
    const text = read(`app/src/app/(tabs)/${screen}.tsx`);
    expect(text).toContain(call);
    expect(text).toMatch(/return \(\n    <KeyboardAvoidingView\n      onTouchStart=\{pilot\.onTouchStart\}/);
    // ⚠️ FIRST in the commit, so the clock starts at the gesture.
    expect(text).toMatch(/const commit = useCallback\(\(\) => \{\n    if \(basketful === null\) return;\n    pilot\.committed\(\);/);
    expect(text).toMatch(/pilot\.confirmed\(\);/);
  });

  it('times the round trip only on a reply that landed', () => {
    const runner = read('app/src/lib/flushRunner.ts');
    expect(runner).toMatch(
      /const data = await sendQueuedWrite\(kind, args\);\n\s+landed\(kind, performance\.now\(\) - from\);/,
    );
  });

  it('opens the panel only on a pilot build, and only for the owner', () => {
    const ajustes = read('app/src/app/ajustes.tsx');
    expect(ajustes).toContain('const canOpen = PILOT_BUILD !== null && canRead(role);');
    expect(ajustes).toContain('onLongPress={canOpen ? () => setReadings(true) : undefined}');
  });
});

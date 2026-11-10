import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  AUTH_RETRY_CEILING_MS,
  OFFLINE_SETTLE_MS,
  UNKNOWN,
  attemptSchedule,
  polling,
  step,
  type Conn,
} from '@/api/connectivity';

// ============================================================================
// THE SIGNAL — WERA'S MACHINE, COPIED. Plan task `10.5b-iv-b` (`@/api/connectivity`,
// `@/lib/connectivityMonitor`). ADR-035 §2.11: `expo-network`, read through ONE module.
//
// ⚠️ THE MACHINE IS HELD TO WERA'S FILE, code for code below the imports, comments and
// spacing folded (`app/src/api/connectivity.ts` — `cocina-itacate.yml` fires on it): every
// number in it is a measurement Wera made on two devices, so a fix there is a fix here.
// Wera's own suite runs its every transition; the ones her queue leans on are run here too.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'cocina/src');
const fold = (code: string) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
    .replace(/\s+/g, ' ')
    .trim();
const IMPORT = /^import\s[\s\S]*?\sfrom\s'[^']+';$/gm;
const sinImports = (text: string) => text.replace(IMPORT, '');

function sources(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('Wera’s machine, copied', () => {
  it('code for code below the imports — a fix to one is a fix to both', () => {
    const ours = readFileSync(join(SRC, 'api/connectivity.ts'), 'utf8');
    const theirs = readFileSync(join(ROOT, 'app/src/api/connectivity.ts'), 'utf8');
    expect(fold(sinImports(ours))).toBe(fold(sinImports(theirs)));
    expect(ours).toMatch(/ITS TWIN IS `app\/src\/api\/connectivity\.ts`/);
  });

  it('and a change to either breaks the match (the comparison is not vacuous)', () => {
    const ours = readFileSync(join(SRC, 'api/connectivity.ts'), 'utf8');
    expect(fold(sinImports(ours.replace('OFFLINE_SETTLE_MS = 2_000', 'OFFLINE_SETTLE_MS = 3_000')))).not.toBe(fold(sinImports(ours)));
  });

  it('⚠️ `expo-network` is imported by the monitor and nothing else — the line and the drain read one signal', () => {
    const importers = sources()
      .filter((path) => /from 'expo-network'/.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(SRC.length + 1));
    expect(importers).toEqual(['lib/connectivityMonitor.ts']);
    expect(readFileSync(join(SRC, 'lib/connectivityMonitor.ts'), 'utf8')).toMatch(/connected: event\.isConnected !== false/);
  });
});

describe('the transitions her queue leans on', () => {
  const online: Conn = { ...UNKNOWN, online: true };

  it('the first reading of a launch is a reconnect — a phone killed with a full queue drains it on the way back in', () => {
    expect(step(UNKNOWN, { kind: 'reading', connected: true }, 0)).toMatchObject({ flush: true, changed: true, conn: { online: true } });
  });

  it('a handover queued with signal is sent at once; without it, it waits for the reconnect', () => {
    expect(step(online, { kind: 'queued' }, 0).flush).toBe(true);
    expect(step({ ...UNKNOWN, online: false }, { kind: 'queued' }, 0).flush).toBe(false);
    expect(step({ ...UNKNOWN, online: false }, { kind: 'reading', connected: true }, 0).flush).toBe(true);
  });

  it('a drop is believed after two seconds — a wifi→cellular blip never says she has no signal', () => {
    const armado = step(online, { kind: 'reading', connected: false }, 0).conn;
    expect(armado.online).toBe(true);
    expect(step(armado, { kind: 'settle' }, OFFLINE_SETTLE_MS - 1).conn.online).toBe(true);
    expect(step(armado, { kind: 'settle' }, OFFLINE_SETTLE_MS).conn.online).toBe(false);
    expect(polling(step(armado, { kind: 'settle' }, OFFLINE_SETTLE_MS).conn)).toBe(true);
  });

  it('a drain that stopped is tried again on a ladder that outlasts the auth layer’s 90 seconds of cached refusals', () => {
    const fallo = step(online, { kind: 'flushed', stop: 'failed' }, 1_000).conn;
    expect(fallo.dueAt).toBe(6_000);
    expect(step(fallo, { kind: 'due' }, 6_000).flush).toBe(true);
    expect(step(online, { kind: 'flushed', stop: 'busy' }, 0).conn.dueAt).toBeNull();
    const intentos = attemptSchedule(6);
    expect(intentos.some((t) => t > AUTH_RETRY_CEILING_MS)).toBe(true);
  });

  it('coming back to the front drains — a phone online in a pocket produces no new reading', () => {
    expect(step({ ...online, foreground: false }, { kind: 'foreground' }, 0).flush).toBe(true);
  });
});

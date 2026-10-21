// ============================================================================
// EVERY REQUEST HAS A TIME LIMIT — `@/lib/plazo`, plan task `8g` (ruled
// 2026-10-20: *"Go ahead with the request time limit before the Android users"*).
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: it drives the wrapper with a fake `fetch`
// and a fake clock, and reads `@/lib/supabase` as text to see the wrapper is
// the client's. Whether Android's real request is cancelled when the signal
// aborts is the emulator's, and the status log records that reading.
// ============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { apiErrorKey } from '@/api/errors';
import { authErrorKey } from '@/auth/errors';
import {
  LIMIT_MS,
  LONG_LIMIT_MS,
  UPLOAD_LIMIT_MS,
  isTimedOut,
  limitFor,
  timedOutError,
  timedOutMessage,
  withLimit,
  type Timers,
} from '@/lib/plazo';

const API = 'https://hweutzjhzvioswnjzqki.supabase.co';

/** A clock the test moves by hand. */
function clock(): Timers & { advance: (ms: number) => void; pending: () => number } {
  let now = 0;
  let next = 1;
  const due = new Map<number, { at: number; run: () => void }>();
  return {
    set: (run, ms) => {
      const id = next++;
      due.set(id, { at: now + ms, run });
      return id;
    },
    clear: (handle) => {
      due.delete(handle as number);
    },
    advance: (ms) => {
      now += ms;
      for (const [id, t] of [...due]) {
        if (t.at <= now) {
          due.delete(id);
          t.run();
        }
      }
    },
    pending: () => due.size,
  };
}

/** A `fetch` that never answers, and fails the way a real one does when aborted. */
function silent(): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return (_input, init) =>
    new Promise((_resolve, reject) => {
      // As a real `fetch` does: a signal already aborted is refused at the start.
      if (init?.signal?.aborted) return reject(new Error('Aborted'));
      init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
    });
}

describe('how long each request may take', () => {
  it('gives a photo going up the longest', () => {
    expect(limitFor(`${API}/storage/v1/object/merma/w/r/f.jpg`, 'POST')).toBe(UPLOAD_LIMIT_MS);
    expect(limitFor(`${API}/storage/v1/object/productos/w/v.jpg`, 'PUT')).toBe(UPLOAD_LIMIT_MS);
  });

  it('gives the catalog read and the catalog import the long limit — the measured 382 KB', () => {
    expect(limitFor(`${API}/rest/v1/product_variant?select=id,name`, 'GET')).toBe(LONG_LIMIT_MS);
    expect(limitFor(`${API}/rest/v1/rpc/import_catalog`, 'POST')).toBe(LONG_LIMIT_MS);
  });

  it('gives everything else the short one', () => {
    expect(limitFor(`${API}/rest/v1/sale?select=id`, 'GET')).toBe(LIMIT_MS);
    expect(limitFor(`${API}/rest/v1/rpc/record_sale`, 'POST')).toBe(LIMIT_MS);
    expect(limitFor(`${API}/auth/v1/token?grant_type=refresh_token`, 'POST')).toBe(LIMIT_MS);
    expect(limitFor(`${API}/functions/v1/apple-revoke`, 'POST')).toBe(LIMIT_MS);
    // A product's PATCH is a write, not the catalog read.
    expect(limitFor(`${API}/rest/v1/product_variant?id=eq.1`, 'PATCH')).toBe(LIMIT_MS);
    // A photo READ through the client is not an upload.
    expect(limitFor(`${API}/storage/v1/object/sign/merma/x.jpg`, 'GET')).toBe(LIMIT_MS);
  });

  it('reads a URL object and a request-like object as well as a string', () => {
    expect(limitFor(new URL(`${API}/rest/v1/product_variant`), 'GET')).toBe(LONG_LIMIT_MS);
    expect(limitFor({ url: `${API}/storage/v1/object/merma/a.jpg` }, 'POST')).toBe(UPLOAD_LIMIT_MS);
    expect(limitFor(`${API}/rest/v1/product_variant`, undefined)).toBe(LONG_LIMIT_MS);
  });

  it('keeps the limits in the order the measurements put them', () => {
    expect(LIMIT_MS).toBeLessThan(LONG_LIMIT_MS);
    expect(LONG_LIMIT_MS).toBeLessThan(UPLOAD_LIMIT_MS);
    // 382 KB at 100 kbps is about 31 s — the catalog's limit must clear it.
    expect(LONG_LIMIT_MS).toBeGreaterThan((382_474 * 8) / 100_000 * 1000);
  });
});

describe('a request that never answers', () => {
  it('fails at its limit, as a lost link', async () => {
    const t = clock();
    const limited = withLimit(silent(), t);
    const answer = limited(`${API}/rest/v1/sale`, { method: 'GET' });
    t.advance(LIMIT_MS - 1);
    let settled = false;
    void answer.then(
      () => (settled = true),
      () => (settled = true),
    );
    await Promise.resolve();
    expect(settled).toBe(false);
    t.advance(1);
    await expect(answer).rejects.toThrow(timedOutMessage(LIMIT_MS));
    // ⚠️ NAMED `AbortError`: postgrest-js retries any other thrown failure of a
    // read three times, 30 s each — measured on the emulator.
    await expect(answer).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('is read as *Sin conexión* by every layer that already knows a lost link', async () => {
    // ⚠️⚠️ THE REASON THE FAILURE IS A `TypeError: Network request failed`: the
    // screens' message, the sign-in's message and Te lo compro's hold all
    // recognise that and nothing new.
    const t = clock();
    const answer = withLimit(silent(), t)(`${API}/rest/v1/rpc/record_sale`, { method: 'POST' });
    t.advance(LIMIT_MS);
    const thrown = await answer.catch((e: unknown) => e);
    expect(apiErrorKey(thrown)).toBe('offline');
    expect(authErrorKey(thrown)).toBe('offline');
    // As postgrest-js reports it: `${name}: ${message}`.
    const asPostgrest = { message: `TypeError: ${(thrown as Error).message}`, code: '' };
    expect(apiErrorKey(asPostgrest)).toBe('offline');
  });

  it('waits the long limit for the catalog', async () => {
    const t = clock();
    const answer = withLimit(silent(), t)(`${API}/rest/v1/product_variant?select=id`, { method: 'GET' });
    const caught = answer.catch((e: unknown) => e);
    t.advance(LIMIT_MS);
    t.advance(LONG_LIMIT_MS - LIMIT_MS - 1);
    expect(t.pending()).toBe(1);
    t.advance(1);
    expect(String(await caught)).toContain(timedOutMessage(LONG_LIMIT_MS));
  });
});

describe('telling a timeout from any other failure', () => {
  it('knows its own error, thrown or as postgrest-js reports it', () => {
    expect(isTimedOut(timedOutError(LIMIT_MS))).toBe(true);
    expect(isTimedOut({ message: `AbortError: ${timedOutMessage(LONG_LIMIT_MS)}`, code: '' })).toBe(true);
  });

  it('does not take a lost link, a refusal or nothing for one', () => {
    expect(isTimedOut(new TypeError('Network request failed'))).toBe(false);
    expect(isTimedOut({ code: 'TD003', message: 'too soon' })).toBe(false);
    expect(isTimedOut(null)).toBe(false);
    expect(isTimedOut('no answer in 30 s')).toBe(false);
  });
});

describe('nobody retries a request that already waited its whole limit', () => {
  // ⚠️⚠️ MEASURED ON THE EMULATOR, 2026-10-20, gateway paused: with the limit
  // alone a hung read took ~6 minutes to fail — postgrest-js's three retries
  // times the data library's two.
  it('postgrest-js still throws an `AbortError` straight through (a pin on the library)', () => {
    const lib = readFileSync(
      fileURLToPath(new URL('../../node_modules/@supabase/postgrest-js/dist/index.mjs', import.meta.url)),
      'utf8',
    );
    expect(lib).toMatch(/name\) === "AbortError"[^\n]*throw fetchError/);
  });

  it('the data library does not retry a timed-out read', () => {
    const provider = readFileSync(fileURLToPath(new URL('../src/api/QueryProvider.tsx', import.meta.url)), 'utf8');
    expect(provider).toMatch(/retry: \(failures, error\) => failures < 2 && !isTimedOut\(error\)/);
  });
});

describe('a request that answers', () => {
  it('is handed back untouched, and its timer is gone', async () => {
    const t = clock();
    const ok = new Response('[]', { status: 200 });
    const answer = await withLimit(async () => ok, t)(`${API}/rest/v1/sale`);
    expect(answer).toBe(ok);
    expect(t.pending()).toBe(0);
  });

  it('keeps its own failure when it fails before the limit', async () => {
    const t = clock();
    const refused = new TypeError('Network request failed');
    const answer = withLimit(async () => {
      throw refused;
    }, t)(`${API}/rest/v1/sale`);
    await expect(answer).rejects.toBe(refused);
    expect(t.pending()).toBe(0);
  });
});

describe('a caller’s own abort', () => {
  it('still aborts the request, and is not reported as a timeout', async () => {
    const t = clock();
    const mine = new AbortController();
    const answer = withLimit(silent(), t)(`${API}/rest/v1/sale`, { signal: mine.signal });
    mine.abort();
    const thrown = await answer.catch((e: unknown) => e);
    expect(String(thrown)).not.toContain('no answer in');
    expect(t.pending()).toBe(0);
  });

  it('aborts at once when handed an already-aborted signal', async () => {
    const t = clock();
    const mine = new AbortController();
    mine.abort();
    const answer = withLimit(silent(), t)(`${API}/rest/v1/sale`, { signal: mine.signal });
    await expect(answer).rejects.toThrow('Aborted');
  });
});

describe('the client is the one that carries it', () => {
  // ⚠️ `@/lib/supabase` IS UNTESTABLE AT IMPORT (side effects), so it is read as
  // text — comments stripped, so prose naming the setting cannot pass for it.
  // ⚠️ LINE COMMENTS FIRST: its header says `test/**`, which a block-comment
  // pattern run first reads as an opening `/*` and eats the imports with.
  const code = readFileSync(fileURLToPath(new URL('../src/lib/supabase.ts', import.meta.url)), 'utf8')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');

  it('reads a real file', () => {
    expect(code).toMatch(/createClient\(/);
  });

  it('hands every request of the client the limited fetch', () => {
    expect(code).toMatch(/from '@\/lib\/plazo'/);
    expect(code).toMatch(/global:\s*\{\s*fetch:\s*withLimit\(fetch\)\s*\}/);
  });
});

// ============================================================================
// TE LO COMPRO WITHOUT A SIGNAL — `@/offline/teLoCompro`, plan task `8g` (the
// offline report's round 3, ruled 2026-10-20: *"Do all the fixes"*).
//
// ⚠️ THE LAST BLOCK DRIVES THE REAL DATA LIBRARY, NOT A COPY OF ITS RULES. The
// send's waiting is TanStack's `networkMode: 'online'` plus our `retry`, and
// whether a held send resumes once, gives up, or stays dropped is the library's
// behaviour — so it is asserted against a real `QueryClient` and the closure the
// hook hands it (`sendRetry`). The hook itself is read as TEXT, the only way a
// node suite can see its wiring (`api-persist.test.ts` does the same).
// ============================================================================

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { MutationObserver, QueryClient, onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PHOTO_UPLOAD_FAILED, TOO_SOON_CODE } from '@/api/collection';
import { OFFLINE_SETTLE_MS } from '@/api/connectivity';
import {
  COLLECTION_SEND_KEY,
  SEND_ABANDONED,
  SEND_ONLINE_RETRIES,
  SEND_RETRY_MS,
  afterSendFailure,
  comproFace,
  sendButton,
  sendLostSignal,
  sendRetry,
  type DoorFace,
} from '@/offline/teLoCompro';
import { ES } from '@/strings';

const FACES: readonly DoorFace[] = ['checking', 'noAddress', 'outside', 'open'];

/** What supabase-js hands back when the link is gone — `api-errors.test.ts`'s shapes. */
const LOST_RPC = { message: 'TypeError: Network request failed', details: '', hint: '', code: '' };
const LOST_PHOTO = { code: PHOTO_UPLOAD_FAILED, cause: { name: 'StorageUnknownError', message: 'Network request failed' } };

describe('the door, offline', () => {
  it('is shut and needs a signal, whatever the store last said — the zone cached or not', () => {
    for (const face of FACES) expect(comproFace(face, false), face).toBe('needsSignal');
  });

  it('is exactly the store’s face online, and while the signal is unknown', () => {
    for (const face of FACES) {
      expect(comproFace(face, true), face).toBe(face);
      // ⚠️ `null` IS UNKNOWN, NOT OFFLINE: a launch must not shut a door that may be open.
      expect(comproFace(face, null), face).toBe(face);
    }
  });

  it('never shuts on a request already open — the signal dropping leaves the form standing', () => {
    expect(comproFace('open', false, true)).toBe('open');
    expect(comproFace('open', true, true)).toBe('open');
  });

  it('but a form that was never drawn does not open offline', () => {
    expect(comproFace('open', false, false)).toBe('needsSignal');
    // And `inside` keeps only an OPEN door: a store that stopped being reachable is not.
    expect(comproFace('outside', false, true)).toBe('needsSignal');
    expect(comproFace('noAddress', true, true)).toBe('noAddress');
  });

  it('says the sentence the owner approved', () => {
    expect(ES.offline.collectNeedsSignal).toBe('Para pedir que pasemos necesitas internet');
  });
});

describe('*Guardar solicitud*', () => {
  it('is today’s button when nothing is being sent', () => {
    for (const online of [true, false, null] as const) {
      expect(sendButton(false, false, online)).toEqual({
        label: ES.collection.next.guardar,
        busy: false,
        waiting: false,
      });
    }
  });

  it('spins with its own word while a send is in flight, as before', () => {
    expect(sendButton(true, false, true)).toEqual({ label: ES.collection.next.guardar, busy: true, waiting: false });
    expect(sendButton(true, false, null)).toEqual({ label: ES.collection.next.guardar, busy: true, waiting: false });
  });

  it('says it goes with the signal, and cannot be pressed again, while the send is held', () => {
    expect(sendButton(true, true, false)).toEqual({ label: ES.offline.sendsWithSignal, busy: true, waiting: true });
    // Held for any reason the library has — the signal's word is what she reads.
    expect(sendButton(true, true, true)).toEqual({ label: ES.offline.sendsWithSignal, busy: true, waiting: true });
  });

  it('says it as soon as the signal is gone, even before the attempt in the air has failed', () => {
    expect(sendButton(true, false, false)).toEqual({ label: ES.offline.sendsWithSignal, busy: true, waiting: true });
  });

  it('is the sentence the owner approved', () => {
    expect(ES.offline.sendsWithSignal).toBe('Se envía cuando haya señal');
  });
});

describe('which failures try again', () => {
  it('knows a lost link from the RPC and from a photo half up', () => {
    expect(sendLostSignal(LOST_RPC)).toBe(true);
    expect(sendLostSignal(new TypeError('Network request failed'))).toBe(true);
    expect(sendLostSignal(LOST_PHOTO)).toBe(true);
  });

  it('never takes a refusal for a lost link — it is an answer, said at once', () => {
    expect(sendLostSignal({ code: TOO_SOON_CODE, message: 'too soon' })).toBe(false);
    expect(sendLostSignal({ code: '42501', message: 'permission denied' })).toBe(false);
    // A photo Storage REFUSED is not a photo the link lost.
    expect(sendLostSignal({ code: PHOTO_UPLOAD_FAILED, cause: { statusCode: '403', message: 'denied' } })).toBe(false);
    expect(sendLostSignal({ code: SEND_ABANDONED })).toBe(false);
    expect(sendLostSignal(null)).toBe(false);
  });

  it('offline, always tries again — the library holds it — and starts the count over', () => {
    expect(afterSendFailure(SEND_ONLINE_RETRIES, LOST_RPC, false)).toEqual({ retry: true, strikes: 0 });
  });

  it('online, tries a few more times, then ends in words rather than spinning for ever', () => {
    let strikes = 0;
    for (let i = 0; i < SEND_ONLINE_RETRIES; i += 1) {
      const next = afterSendFailure(strikes, LOST_RPC, true);
      expect(next.retry).toBe(true);
      strikes = next.strikes;
    }
    expect(afterSendFailure(strikes, LOST_RPC, true).retry).toBe(false);
    // Unknown is online.
    expect(afterSendFailure(SEND_ONLINE_RETRIES, LOST_RPC, null).retry).toBe(false);
  });

  it('never retries a refusal or an abandoned send, signal or not', () => {
    for (const online of [true, false, null] as const) {
      expect(afterSendFailure(0, { code: TOO_SOON_CODE }, online).retry).toBe(false);
      expect(afterSendFailure(0, { code: SEND_ABANDONED }, online).retry).toBe(false);
    }
  });

  it('waits longer than the signal takes to believe a drop, so the retry is held, not spent', () => {
    expect(SEND_RETRY_MS).toBeGreaterThan(OFFLINE_SETTLE_MS);
  });
});

describe('the real data library, with the closure the hook hands it', () => {
  // ⚠️ `onlineManager` IS A PROCESS-WIDE SINGLETON: every test leaves it online.
  let client: QueryClient;
  beforeEach(() => {
    vi.useFakeTimers();
    onlineManager.setOnline(true);
    client = new QueryClient();
    client.mount();
  });
  afterEach(() => {
    client.unmount();
    onlineManager.setOnline(true);
    vi.useRealTimers();
  });

  /** A send as the hook builds it, over a fake server that counts what reaches it. */
  function send(attempt: () => Promise<void>) {
    const strikes = { current: 0 };
    const observer = new MutationObserver(client, {
      mutationKey: COLLECTION_SEND_KEY,
      networkMode: 'online',
      retry: sendRetry(strikes, () => onlineManager.isOnline()),
      retryDelay: SEND_RETRY_MS,
      mutationFn: attempt,
    });
    const settled = observer.mutate(undefined).then(
      () => 'sent',
      () => 'failed',
    );
    return { observer, settled };
  }

  it('tapped offline: nothing leaves the phone, it is held, and goes once on the reconnect', async () => {
    onlineManager.setOnline(false);
    const reached = vi.fn(async () => {});
    const { observer, settled } = send(reached);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reached).not.toHaveBeenCalled();
    expect(observer.getCurrentResult().isPaused).toBe(true);
    expect(observer.getCurrentResult().isPending).toBe(true);

    onlineManager.setOnline(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(await settled).toBe('sent');
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it('the link lost mid-send: tried again once the signal says so, held, and sent on the reconnect', async () => {
    let calls = 0;
    const reached = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        // The signal settles after the attempt has already failed.
        setTimeout(() => onlineManager.setOnline(false), OFFLINE_SETTLE_MS);
        throw LOST_RPC;
      }
    });
    const { observer, settled } = send(reached);
    await vi.advanceTimersByTimeAsync(SEND_RETRY_MS + 1);
    expect(reached).toHaveBeenCalledTimes(1);
    expect(observer.getCurrentResult().isPaused).toBe(true);

    onlineManager.setOnline(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(await settled).toBe('sent');
    expect(reached).toHaveBeenCalledTimes(2);
  });

  it('a refusal is said at once — one attempt, no retry', async () => {
    const reached = vi.fn(async () => {
      throw { code: TOO_SOON_CODE };
    });
    const { settled } = send(reached);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await settled).toBe('failed');
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it('online with a dead link, it ends in words after its tries — never spins for ever', async () => {
    const reached = vi.fn(async () => {
      throw LOST_RPC;
    });
    const { settled } = send(reached);
    await vi.advanceTimersByTimeAsync(SEND_RETRY_MS * (SEND_ONLINE_RETRIES + 1));
    expect(await settled).toBe('failed');
    expect(reached).toHaveBeenCalledTimes(1 + SEND_ONLINE_RETRIES);
  });

  it('a held send dropped from the cache — she left — is never resumed by a reconnect', async () => {
    onlineManager.setOnline(false);
    const reached = vi.fn(async () => {});
    send(reached);
    await vi.advanceTimersByTimeAsync(0);
    const sends = client.getMutationCache();
    const held = sends.findAll({ mutationKey: COLLECTION_SEND_KEY });
    expect(held).toHaveLength(1);
    for (const m of held) if (m.state.status === 'pending') sends.remove(m);

    onlineManager.setOnline(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reached).not.toHaveBeenCalled();
  });
});

describe('the hook is wired to those rules', () => {
  const hooks = readFileSync(resolve(__dirname, '..', 'src', 'api', 'hooks.ts'), 'utf8');
  const body = hooks.slice(hooks.indexOf('export function useRequestCollection'), hooks.indexOf('export interface LocalPhoto'));

  it('reads the hook it means to', () => {
    expect(body.length).toBeGreaterThan(200);
  });

  it('holds the send for a signal, retries by `sendRetry`, under its own key', () => {
    expect(body).toMatch(/mutationKey: COLLECTION_SEND_KEY/);
    expect(body).toMatch(/networkMode: 'online'/);
    expect(body).toMatch(/retry: sendRetry\(strikes, online\)/);
    expect(body).toMatch(/retryDelay: SEND_RETRY_MS/);
  });

  it('and is the only write in the file that overrides the provider’s `always`', () => {
    // A code line, not the prose above the hook that names the setting.
    expect(hooks.match(/^\s*networkMode: 'online',$/gm)).toHaveLength(1);
  });

  it('checks the form is still there before each step that reaches the network', () => {
    const fn = body.slice(body.indexOf('mutationFn'), body.indexOf('onSuccess'));
    expect(fn.indexOf('here.current')).toBeLessThan(fn.indexOf('uploadMermaPhoto'));
    expect(fn.lastIndexOf('here.current')).toBeLessThan(fn.indexOf('requestCollection'));
    expect(fn.lastIndexOf('here.current')).toBeGreaterThan(fn.indexOf('uploadMermaPhoto'));
  });

  it('does not make the saved screen wait for the list to be re-read', () => {
    // ⚠️⚠️ MEASURED ON THE EMULATOR, 2026-10-20: a held send landed on the
    // reconnect and the screen never reached *Solicitud guardada* — the list's
    // read had hung on a dead link (Android has no request timeout), and an
    // awaited `invalidateQueries` hands back that very fetch for a query with
    // no data yet.
    const done = body.slice(body.indexOf('onSuccess'), body.indexOf('useEffect'));
    expect(done).toMatch(/void queries\.invalidateQueries\(\{ queryKey: COLLECTION_KEY \}\)/);
    expect(done).not.toMatch(/await queries\.invalidateQueries/);
  });
});

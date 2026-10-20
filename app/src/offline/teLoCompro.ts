// ============================================================================
// TE LO COMPRO WITHOUT A SIGNAL — the door, the send that waits, and when a
// failed send tries again. Plan task `8g`, 2026-10-20, the offline report's
// round 3 (the owner's *"Do all the fixes"*), its D: *"offline, the door reads
// Para pedir que pasemos necesitas internet and doesn't open the form. If the
// signal drops mid-way, her request stays and Guardar solicitud waits for the
// signal instead of failing. It comes back by itself, with no retry button."*
//
// ⚠️⚠️ MEASURED BEFORE IT WAS WRITTEN, on the Android emulator that day: opened
// with no signal the door said *Revisando tu zona…* for ever, and a form filled
// in offline was refused only at its last tap, with *Sin conexión a internet*.
//
// ⚠️ PURE, so `app/test/offline-te-lo-compro.test.ts` reads every decision here
// (`R3`); the screen (`app/(tabs)/desperdicio.tsx`) and the hook
// (`useRequestCollection`) only act on them. The signal is `useOnline()` on the
// screen and `@/lib/connectivityMonitor`'s `online()` in the hook — the app's
// one signal, never a second library.
//
// ⚠️ `null` IS UNKNOWN AND IS NEVER OFFLINE, here as in `@/offline/senal`: a
// launch that has not read the network yet draws the door exactly as before.
// ============================================================================

import type { Online } from '@/api/connectivity';
import { PHOTO_UPLOAD_FAILED } from '@/api/collection';
import { apiErrorKey } from '@/api/errors';
import { ES } from '@/strings';

// ----------------------------------------------------------------------------
// The door
// ----------------------------------------------------------------------------

/** Where Te lo compro stands for this store, as the screen read it — the door's four faces. */
export type DoorFace = 'checking' | 'noAddress' | 'outside' | 'open';

/** What the door draws: one of the four, or *you need a signal to ask*. */
export type ComproFace = DoorFace | 'needsSignal';

/**
 * The face Te lo compro shows.
 *
 * ⚠️⚠️ OFFLINE, EVERY FACE IS `needsSignal`, WHETHER OR NOT THE ZONE IS CACHED.
 * An `open` door would lead to a form that cannot be sent; `checking` would spin
 * for ever (the address and the zone are not persisted, so a cold offline launch
 * never learns them); and a cached `outside` or `noAddress` may already be
 * stale — Wera adds a código postal, the owner types the address on another
 * phone — so the one thing that is certainly true offline is that asking needs
 * a signal. Online, and while the signal is unknown, the face is the store's.
 *
 * ⚠️ `inside` IS A REQUEST ALREADY OPEN. The door closes to ENTERING, never on
 * her: once the form is drawn, a signal that drops leaves it standing, and what
 * she filled in waits with the send (`sendButton`). Without it, the switch's
 * side would swap the form for the closed card the moment the signal went, and
 * her request with it.
 */
export function comproFace(face: DoorFace, online: Online, inside = false): ComproFace {
  if (inside && face === 'open') return 'open';
  if (online === false) return 'needsSignal';
  return face;
}

// ----------------------------------------------------------------------------
// *Guardar solicitud*
// ----------------------------------------------------------------------------

/** The last step's button: its word, and whether it is inert. */
export interface SendButton {
  readonly label: string;
  /** Spinning and not pressable — a send is in flight or waiting. */
  readonly busy: boolean;
  /**
   * ⚠️ WAITING FOR THE SIGNAL: what is waiting is what she had filled in when
   * she tapped, so the form holds still — no *Atrás*, no typing in the note —
   * or an edit made meanwhile would look sent and not be.
   */
  readonly waiting: boolean;
}

/**
 * *Guardar solicitud*, *Guardar solicitud* spinning, or *Se envía cuando haya
 * señal* spinning.
 *
 * ⚠️ `paused` IS THE DATA LIBRARY'S: the send is held until `onlineManager`
 * says online, and goes by itself then. ⚠️ AND A SEND STILL IN FLIGHT WHEN THE
 * SIGNAL IS GONE ALREADY SAYS IT WILL WAIT — the signal settles two seconds
 * after the link drops (`OFFLINE_SETTLE_MS`), so by then the attempt in the air
 * is lost or about to be, and the next one is held (`afterSendFailure`).
 *
 * ⚠️ `busy` AND NOT `off` WHILE IT WAITS: `off` is BotonLleno's *a step not yet
 * answered*, and nothing is unanswered — the request is on its way.
 */
export function sendButton(pending: boolean, paused: boolean, online: Online): SendButton {
  if (!pending) return { label: ES.collection.next.guardar, busy: false, waiting: false };
  if (paused || online === false) return { label: ES.offline.sendsWithSignal, busy: true, waiting: true };
  return { label: ES.collection.next.guardar, busy: true, waiting: false };
}

// ----------------------------------------------------------------------------
// When a failed send tries again
// ----------------------------------------------------------------------------

/**
 * The send's mutation key — so the hook can find its own send in the library's
 * cache and drop it when the form goes away.
 *
 * ⚠️⚠️ NEVER REGISTER `setMutationDefaults` FOR IT. A send held for a signal is
 * written to the phone with the cache (the library dehydrates a paused mutation
 * by default, and `QueryProvider` does not say otherwise); a restored one has
 * no `mutationFn`, fails on its first resume and is never sent — which is what
 * makes *closing the app loses a waiting request* true. Defaults with a
 * `mutationFn` here would send a request days later, from a form nobody sees.
 */
export const COLLECTION_SEND_KEY = ['collection', 'send'] as const;

/**
 * What a send throws when the form it belongs to is gone — she left, and the
 * leave-guard asked first. The client's, never the database's.
 */
export const SEND_ABANDONED = 'send-abandoned';

/**
 * The gap before a failed send tries again.
 *
 * ⚠️ LONGER THAN THE SIGNAL TAKES TO SETTLE (`OFFLINE_SETTLE_MS`, two seconds),
 * on purpose: a send that failed because the link just dropped is retried after
 * the signal has had time to say so, and the library then HOLDS the retry
 * rather than spending it on a dead link. `app/test/offline-te-lo-compro.test.ts`
 * holds the two numbers to that order.
 */
export const SEND_RETRY_MS = 3_000;

/**
 * How many times in a row a send that lost its link tries again while the
 * signal still says online — the two seconds before the signal believes the
 * drop, or a link that came back a moment before it carries anything.
 *
 * ⚠️ BOUNDED SO AN ONLINE FAILURE STILL ENDS IN WORDS: a shop whose signal says
 * online and whose server cannot be reached is told *Sin conexión a internet*
 * after these, as before — a few seconds later, never a spinner for ever.
 */
export const SEND_ONLINE_RETRIES = 2;

/**
 * Did this send fail because the link did — no answer at all, rather than a
 * refusal? ⚠️ A PHOTO'S UPLOAD WRAPS ITS CAUSE (`PHOTO_UPLOAD_FAILED`), and a
 * photo going up is the longest part of a send, so the cause is read too.
 */
export function sendLostSignal(error: unknown): boolean {
  if (apiErrorKey(error) === 'offline') return true;
  if (typeof error !== 'object' || error === null) return false;
  const { code, cause } = error as { code?: unknown; cause?: unknown };
  return code === PHOTO_UPLOAD_FAILED && apiErrorKey(cause) === 'offline';
}

export interface SendRetry {
  readonly retry: boolean;
  /** Consecutive tries spent while the signal said online — the hook keeps it. */
  readonly strikes: number;
}

/**
 * After a send fails: try again, or say why.
 *
 * ⚠️⚠️ ONLY A LOST LINK IS RETRIED, AND A RETRY CANNOT MAKE A SECOND REQUEST.
 * A refusal — outside the area (`TD009`), too soon (`TD011`), a session gone —
 * is an answer and is said at once, as before. A lost link is retried because
 * the send is idempotent end to end: each photo goes to the path named when it
 * was taken (`alreadyStored` is a success), and `request_collection` returns
 * the request already recorded under the draft's id (`0061`'s
 * `already_recorded`). So a send whose answer was lost in the air, retried,
 * lands once.
 *
 * ⚠️ OFFLINE IT ALWAYS TRIES AGAIN — the data library holds the retry until the
 * signal returns, so *again* means *when there is a signal* — and the count
 * starts over. Online it tries `SEND_ONLINE_RETRIES` more times, then gives up.
 */
export function afterSendFailure(strikes: number, error: unknown, online: Online): SendRetry {
  if (!sendLostSignal(error)) return { retry: false, strikes };
  if (online === false) return { retry: true, strikes: 0 };
  if (strikes < SEND_ONLINE_RETRIES) return { retry: true, strikes: strikes + 1 };
  return { retry: false, strikes };
}

/**
 * The send's `retry`, as the data library calls it: `afterSendFailure` over a
 * count kept between tries and the signal read at the moment of each failure.
 *
 * ⚠️ THE LIBRARY'S OWN `failures` IS NOT USED, ON PURPOSE: it never starts over,
 * so a send held for an hour would reach the reconnect with its online tries
 * already spent. `strikes` is the hook's — zeroed when a send starts and
 * whenever one is held. ⚠️ Taken as `{ current }` and a function so the suite
 * can hand the real library the same closure the hook does.
 */
export function sendRetry(
  strikes: { current: number },
  online: () => Online,
): (failures: number, error: unknown) => boolean {
  return (_failures, error) => {
    const next = afterSendFailure(strikes.current, error, online());
    strikes.current = next.strikes;
    return next.retry;
  };
}

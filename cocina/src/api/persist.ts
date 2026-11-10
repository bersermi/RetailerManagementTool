// ============================================================================
// WHAT WERA COCINA KEEPS ON THE PHONE, SO THE COUNTER WORKS WITH NO SIGNAL. Plan
// task `10.5b-iv-b` (the owner's questions 7–10 of 2026-11-05: *"it works without
// signal (today's reservations saved on her phone)"*), and this app's first saved
// cache. ADR-035 §2.6: reads serve from cache with visible staleness.
//
// ⚠️ WERA'S POLICY, CUT TO THIS APP (`app/src/api/persist.ts`, `6d`, and every trap
// it measured): a NAMED list of reads, never the whole cache; a query is written
// while it holds data, whatever its last attempt said, and written AS the success it
// last was (`asLastGood`) — Wera's second offline restart lost its catalog until that
// rule; the buster is a SHAPE VERSION, never the person signed in; and it is
// forgotten on *Cerrar sesión* alone, memory first, never on `session === null`,
// which is also what a failed renewal with no signal looks like.
//
// ⚠️⚠️ THE ALLOW-LIST IS WHAT A COLD START WITH NO SIGNAL NEEDS TO HAND A PLATE OVER:
//   - her kitchens (`['cocina', 'mias']`) — without them the guard never leaves the
//     first frame: `membership` stays `unknown`;
//   - her offers (`['cocina', 'publicaciones']`) — *Hoy*'s card, and whether today's
//     orders are read every minute (`vivo`);
//   - her reservations (`['cocina', 'apartados']`: today's and later's, the 30 days
//     before, and who reserved each) — *Apartados*, *Entregar un apartado*, *Lo que
//     sigue*, her thumb.
// Nothing else: her page, her place and the trades are read when she opens them, and
// none is needed at the counter. ⚠️ WHO RESERVED EACH IS KEPT TOO — the neighbour's
// short name and score, while the order waits or waits for its thumb (`0080`): what the
// screen already shows her, kept so her thumb is offered with no signal. The next read
// drops a name as the database stops sending it; *Cerrar sesión* drops all of it. The
// aviso names it (`10.5b-vi`).
//
// ⚠️ IT IS NOT WERA'S LIBRARY BINDING: TanStack's own `dehydrate` and `hydrate`, over
// the phone's store, which is synchronous (`@/lib/store` — `expo-sqlite`'s
// `localStorage`). So the cache is in place BEFORE THE FIRST FRAME (`@/api/QueryProvider`
// hydrates as it builds the client): no restoring state, no screen drawn empty first,
// and no new dependency — which would move the root lockfile, and an install here can
// move Wera's runtime.
//
// ⚠️⚠️ AND IT KEEPS DATES: her reservations and her offers hold `Date`s (the moments
// her hour, its window and her handover are read from), and `JSON` writes a `Date` as a
// string that nothing reads back as one — a restored order would throw on `getTime`.
// `aTexto` writes each `Date` as `{ "$fecha": iso }`; `deTexto` reads it back.
//
// Nothing here talks or opens anything: `@/api/QueryProvider` binds it.
// ============================================================================

import { APARTADOS_KEY } from '@/api/apartados';
import { KITCHENS_KEY } from '@/api/kitchen';
import { LISTINGS_KEY } from '@/api/listing';
import { readKey, removeKey, writeKey, type DeviceStore } from '@/lib/store';

/** The one key the cache is written under. ⚠️ Namespaced: the store holds the session and the queue too. */
export const CACHE_KEY = 'cocina.query-cache';

/**
 * The shape of what is written. ⚠️ BUMP IT WHEN A KEPT READ'S SHAPE CHANGES — a field
 * renamed or a key re-cut; a phone holding another shape starts empty rather than handing
 * this code rows it cannot read. A NEW key on the list is not a new shape.
 */
export const CACHE_SHAPE = 'v1';

/** How long a kept read is held in memory — for ever, or the next save leaves out what was collected (Wera's `gcTime` trap). */
export const CACHE_GC_TIME = Infinity;

/** At most one save every three seconds (Wera's throttle: a save is a `JSON.stringify` and a SQLite write on the JS thread). */
export const CACHE_THROTTLE_MS = 3_000;

/** The reads kept, as key prefixes. Everything else is refused. */
export const PERSISTED_KEYS: readonly (readonly string[])[] = [KITCHENS_KEY, LISTINGS_KEY, APARTADOS_KEY];

/** One of the three — a prefix match, one way: a key shorter than a root never matches. */
export function shouldPersistKey(key: readonly unknown[]): boolean {
  return PERSISTED_KEYS.some((root) => root.every((segment, at) => key[at] === segment));
}

/** As much of a TanStack query as the decision reads. */
export interface PersistableQuery {
  readonly queryKey: readonly unknown[];
  readonly state: { readonly status: string; readonly data?: unknown };
}

/** Written while it holds data — a read that resolved and then failed to refresh still holds her orders. */
export function shouldPersistQuery(query: PersistableQuery): boolean {
  const { status, data } = query.state;
  const holdsData = status === 'success' || (status === 'error' && data !== undefined);
  return holdsData && shouldPersistKey(query.queryKey);
}

/** As much of a dehydrated client as this file rewrites. */
export interface PersistedShape {
  readonly queries: readonly { readonly state: { readonly status: string; readonly data?: unknown } }[];
}

/**
 * Every query that failed a refresh, written as the success it last was: `hydrate` keeps an
 * `error` status as it is, and a screen that checks the failure first would draw it over the
 * orders it holds. Its `dataUpdatedAt` is untouched, so the copy is exactly as old as it is.
 */
export function asLastGood<T extends PersistedShape>(client: T): T {
  return {
    ...client,
    queries: client.queries.map((query) =>
      query.state.status === 'error' && query.state.data !== undefined
        ? { ...query, state: { ...query.state, status: 'success', error: null, fetchFailureCount: 0, fetchFailureReason: null } }
        : query,
    ),
  };
}

/** How a `Date` is written. ⚠️ A key no row of this app's has. */
const FECHA = '$fecha';

/**
 * The cache as text: its shape, and every `Date` as `{ "$fecha": iso }`. ⚠️ THE REPLACER READS
 * `this[key]`, NOT `value`: `JSON.stringify` calls a `Date`'s `toJSON` before the replacer sees it.
 */
export function aTexto(client: PersistedShape): string {
  return JSON.stringify({ forma: CACHE_SHAPE, client: asLastGood(client) }, function (this: Record<string, unknown>, key, value) {
    const raw = this[key];
    if (raw instanceof Date) return { [FECHA]: Number.isNaN(raw.getTime()) ? null : raw.toISOString() };
    return value;
  });
}

/**
 * The text read back, or `null` — another shape, or anything that will not parse. ⚠️ NEVER
 * THROWS: a launch must not fail on the phone's disk; it starts empty and reads again.
 */
export function deTexto<T>(texto: string | null): T | null {
  if (texto === null) return null;
  try {
    const parsed = JSON.parse(texto, (_key, value: unknown) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const keys = Object.keys(value);
        if (keys.length === 1 && keys[0] === FECHA) {
          const iso = (value as Record<string, unknown>)[FECHA];
          return typeof iso === 'string' ? new Date(iso) : new Date(Number.NaN);
        }
      }
      return value;
    }) as { forma?: unknown; client?: unknown };
    if (parsed?.forma !== CACHE_SHAPE || typeof parsed.client !== 'object' || parsed.client === null) return null;
    const client = parsed.client as { queries?: unknown };
    if (!Array.isArray(client.queries)) return null;
    return parsed.client as T;
  } catch {
    return null;
  }
}

/** The stored cache, or `null`. */
export function restaurar<T>(store: DeviceStore | undefined): T | null {
  return deTexto<T>(readKey(store, CACHE_KEY));
}

/**
 * The cache written — or, with nothing to keep, its key removed. ⚠️ AFTER *CERRAR SESIÓN* the cleared
 * client's next save was an empty cache written back under the key (found on the emulator), so the
 * phone still "had" one. Every failure swallowed by `writeKey`: a full disk costs a read, never a screen.
 */
export function guardar(store: DeviceStore | undefined, client: PersistedShape): void {
  if (client.queries.length === 0) removeKey(store, CACHE_KEY);
  else writeKey(store, CACHE_KEY, aTexto(client));
}

/**
 * Forget it — ⚠️ ON *CERRAR SESIÓN* AND NOWHERE ELSE (`AuthProvider.signOut`): the next person
 * to hold the phone is a different one. Memory first (`setMemoryForgetter`): the client is
 * mounted for the app's life, and its next save would write everything back (Wera, measured
 * 2026-10-20). ⚠️ The queue is not this: `@/api/cola` outlives a sign-out, per login.
 */
export function forgetCache(store: DeviceStore | undefined): void {
  forgetMemory?.();
  removeKey(store, CACHE_KEY);
}

let forgetMemory: (() => void) | null = null;

/** `QueryProvider` hands over its client's `clear` while it is mounted — `AuthProvider` sits above it and cannot reach it. */
export function setMemoryForgetter(forget: (() => void) | null): void {
  forgetMemory = forget;
}

let saveNow: (() => void) | null = null;

/**
 * ⚠️ SAVE NOW, NOT IN THREE SECONDS — called by the queue when a send landed, between drawing
 * it into the cache and removing it from the queue (`@/lib/cola`). Otherwise a phone killed
 * in those three seconds keeps neither: the queue no longer has the handover and the saved
 * cache never had it, so with no signal the order is *por entregar* again.
 */
export function guardarYa(): void {
  saveNow?.();
}

/** `QueryProvider` hands over its save while it is mounted. */
export function setSaveNow(save: (() => void) | null): void {
  saveNow = save;
}

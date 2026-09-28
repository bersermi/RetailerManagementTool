// ============================================================================
// WHAT SURVIVES THE APP BEING KILLED. Plan task `6d`.
//
// ⚠️⚠️ WHAT THIS SUITE CAN SEE AND WHAT IT CANNOT, SAID FIRST. It reads
// `@/api/persist` against the key definitions in the eleven modules that own
// them, so it can prove that the allow-list still names keys this app actually
// queries, that the refused ones are refused, and that a failed read is never
// written to disk. **It cannot prove that anything reaches the phone's SQLite**
// — `createSyncStoragePersister`, `expo-sqlite` and the mount are all in
// `@/api/QueryProvider`, which no node suite can load. That half is a person
// with a phone in airplane mode, and `6d`'s row says exactly what to tap.
//
// ⚠️⚠️ THE ASSERTION THAT EARNS ITS KEEP IS THE SECOND BLOCK, AND IT IS NOT
// ABOUT PERSISTENCE AT ALL. `PERSISTED_KEYS` is six string literals. The keys
// it is meant to name are built in `@/api/catalog`, `@/api/workspace`,
// `@/api/invites` and `@/api/providers`, and **nothing connects the two**: rename
// `CATALOG_KEY` to `['catalog', 'products']` and the app compiles, the app runs,
// every test but this one passes, and the catalog silently stops being written
// to disk. Typing is no help — both sides are `readonly string[]`.
//
// ⚠️ IT REACHES NO COMPONENT (`R2`) and it is `.ts`.
// ============================================================================

import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CATALOG_KEY, UNITS_KEY } from '@/api/catalog';
import { PRICE_EDIT_KEY, VARIANT_EDIT_KEY } from '@/api/catalogEdit';
import { costsKey } from '@/api/costs';
import { documentsKey } from '@/api/documents';
import { LOCATIONS_KEY } from '@/api/invites';
import { MAGNITUDE_KEY } from '@/api/magnitude';
import { INVITES_KEY, MEMBERS_KEY } from '@/api/members';
import { PENDING_REQUESTS_KEY } from '@/api/approvals';
import {
  CACHE_GC_TIME,
  CACHE_KEY,
  CACHE_MAX_AGE,
  CACHE_SHAPE,
  CACHE_THROTTLE_MS,
  PERSISTED_KEYS,
  cacheMemory,
  forgetCache,
  shouldPersistKey,
  shouldPersistQuery,
} from '@/api/persist';
import { PROVIDERS_KEY, memoryKey } from '@/api/providers';
import { MY_REQUESTS_KEY } from '@/api/requests';
import { TODAY_KEY } from '@/api/today';
import { MY_WORKSPACES_KEY } from '@/api/workspace';
import type { DeviceStore } from '@/lib/store';

/** A `success` query on a given key — the shape `shouldDehydrateQuery` is handed. */
function resolved(queryKey: readonly unknown[]) {
  return { queryKey, state: { status: 'success' } };
}

describe('the allow-list is a decision, and its size is the part that is checked', () => {
  it('is exactly six roots, because a seventh decides what a shopkeeper may be shown offline', () => {
    // ⚠️ A COUNT AND NOT A SNAPSHOT, which would be this file asserting itself.
    // What is load-bearing is that the SIZE is fixed: every entry here is a row
    // written to a phone's disk and read back as fact when there is no signal,
    // and `@/api/persist`'s header carries the one rule a seventh has to pass —
    // a stale answer must beat no answer, and must not be a false statement.
    expect(PERSISTED_KEYS).toHaveLength(6);
  });

  it('names no root twice, and no root is empty', () => {
    // ⚠️ AN EMPTY ROOT WOULD PERSIST THE ENTIRE CACHE and `every` on `[]` is
    // `true`, so it would do it silently and pass every other test in this file.
    for (const root of PERSISTED_KEYS) expect(root.length).toBeGreaterThan(0);
    const spellings = PERSISTED_KEYS.map((root) => root.join('/'));
    expect(new Set(spellings).size).toBe(PERSISTED_KEYS.length);
  });
});

describe('every persisted root still names a key this app queries', () => {
  // ⚠️⚠️ THIS IS THE BLOCK THE HEADER IS ABOUT. Each case imports the key from
  // the module that DEFINES it, so a rename over there turns this red rather
  // than turning persistence off.

  it('persists the shop itself — `draftOf` takes its id and its IVA flag', () => {
    expect(shouldPersistKey(MY_WORKSPACES_KEY)).toBe(true);
  });

  it('persists the locations, without which a basket is refused outright', () => {
    // ⚠️⚠️ THE ONE MOST LIKELY TO BE READ AS OPTIONAL AND IS NOT. `useCatalog`
    // resolves `locationId` from this read alone; `draftOf` answers a null
    // location with `no-location`, so `canCommit` is false and the commit
    // control is NOT DRAWN. Without this entry a cold start with no signal
    // cannot ring up a sale at all — see `@/api/persist`'s header.
    expect(shouldPersistKey(LOCATIONS_KEY)).toBe(true);
  });

  it('persists the catalog and the units it is priced in', () => {
    expect(shouldPersistKey(CATALOG_KEY)).toBe(true);
    expect(shouldPersistKey(UNITS_KEY)).toBe(true);
  });

  it('persists the supplier list and what each supplier last charged', () => {
    expect(shouldPersistKey(PROVIDERS_KEY)).toBe(true);
    // ⚠️ A FAMILY AND NOT A KEY — the provider's id is the segment under it, so
    // this is the assertion that the match is a PREFIX. Without the memory every
    // row on Comprar is C3.12's dash, which C3.13 blocks the commit on.
    expect(shouldPersistKey(memoryKey('a3f1'))).toBe(true);
    expect(shouldPersistKey(memoryKey(null))).toBe(true);
  });
});

describe('nothing derived from the ledger is written to disk', () => {
  // ⚠️ EACH OF THESE IS IMPORTED FROM ITS OWN MODULE for the same reason the
  // block above is: a key renamed into the persisted namespace by accident —
  // `['catalog', …]` is two words away from most of these — would start writing
  // money to disk, and nothing else in this repository would notice.

  it("refuses today's takings, because a figure labelled today is not merely stale", () => {
    expect(shouldPersistKey(TODAY_KEY)).toBe(false);
  });

  it('refuses `Lo último`, because `useUnsent` already answers it truthfully offline', () => {
    expect(shouldPersistKey(documentsKey('sale'))).toBe(false);
    expect(shouldPersistKey(documentsKey('purchase'))).toBe(false);
  });

  it('refuses the cost history and the typical quantities', () => {
    expect(shouldPersistKey(costsKey('a3f1'))).toBe(false);
    expect(shouldPersistKey(MAGNITUDE_KEY)).toBe(false);
  });

  it('refuses everything that answers *who may do what*', () => {
    // ⚠️ THE REAL FENCE IS RLS, ON A SERVER THIS PHONE CANNOT REACH. A restored
    // roster is a stale answer about permission, which is the one kind of stale
    // answer that is never better than none.
    expect(shouldPersistKey(MEMBERS_KEY)).toBe(false);
    expect(shouldPersistKey(INVITES_KEY)).toBe(false);
    expect(shouldPersistKey(PENDING_REQUESTS_KEY)).toBe(false);
    expect(shouldPersistKey(MY_REQUESTS_KEY)).toBe(false);
  });

  it("refuses `Editar`'s per-variant reads, which could not be saved offline anyway", () => {
    // ⚠️ THESE TWO SHARE A NAMESPACE WITH THE CATALOG — `['catalog', 'prices']`
    // beside `['catalog', 'variants']` — so they are the closest thing this app
    // has to a key that a prefix match could swallow by mistake.
    expect(shouldPersistKey([...PRICE_EDIT_KEY, 'a3f1'])).toBe(false);
    expect(shouldPersistKey([...VARIANT_EDIT_KEY, 'a3f1'])).toBe(false);
  });

  it('refuses a bare namespace, so an invalidation sweep is never persisted', () => {
    // ⚠️ THE MATCH IS A PREFIX IN ONE DIRECTION ONLY. `['workspace']` is what
    // `@/api/approvals` describes sweeping with; a key SHORTER than a root must
    // not match it.
    expect(shouldPersistKey(['workspace'])).toBe(false);
    expect(shouldPersistKey(['catalog'])).toBe(false);
    expect(shouldPersistKey(['providers'])).toBe(false);
    expect(shouldPersistKey([])).toBe(false);
  });
});

describe('a read that failed is never written to disk', () => {
  // ⚠️⚠️ THE FAILURE THIS PREVENTS IS THE EXACT ONE `6d` EXISTS TO FIX, ARRIVING
  // THROUGH THE FIX. A shop with no signal produces an `error` query on every
  // read it makes; persisting one hydrates the failure on the next cold start,
  // so the app would restore the empty screen from a cache that looks healthy.

  it('writes a resolved catalog', () => {
    expect(shouldPersistQuery(resolved(CATALOG_KEY))).toBe(true);
  });

  it('refuses a catalog read that is still out', () => {
    expect(shouldPersistQuery({ queryKey: CATALOG_KEY, state: { status: 'pending' } })).toBe(false);
  });

  it('refuses a catalog read that failed', () => {
    expect(shouldPersistQuery({ queryKey: CATALOG_KEY, state: { status: 'error' } })).toBe(false);
  });

  it('refuses a resolved read that is not on the list', () => {
    expect(shouldPersistQuery(resolved(TODAY_KEY))).toBe(false);
  });
});

describe('the two durations, and the relationship between them', () => {
  it('trusts a restored cache for ever, which is a decision and not the default', () => {
    // ⚠️⚠️ THE LIBRARY'S OWN DEFAULT IS 86_400_000 — TWENTY-FOUR HOURS — and
    // taking it would empty the catalog of a shop that spent a weekend without
    // signal, which is the condition this row was written for. ✅ Ruled by the
    // owner 2026-09-28 (the thirty-third ruling); reversing it is this constant.
    expect(CACHE_MAX_AGE).toBe(Infinity);
    expect(CACHE_MAX_AGE).not.toBe(86_400_000);
  });

  it('keeps a persisted query in memory for at least as long as it trusts it', () => {
    // ⚠️⚠️ THE INVARIANT THAT WOULD OTHERWISE SHIP BROKEN AND INVISIBLE.
    // Dehydration walks the LIVE cache, so a query collected by `gcTime` is a
    // query the next save omits — the catalog would be written once and then
    // silently written back out. `gcTime` BELOW `maxAge` is a cache that
    // promises more than it keeps.
    expect(CACHE_GC_TIME).toBeGreaterThanOrEqual(CACHE_MAX_AGE);
  });

  it('throttles the disk harder than the library does, because the write is on the JS thread', () => {
    expect(CACHE_THROTTLE_MS).toBeGreaterThan(1_000);
  });
});

describe('the key it is stored under, and forgetting it', () => {
  it('is namespaced, because this store also holds the session', () => {
    // ⚠️ THE LIBRARY'S DEFAULT IS `REACT_QUERY_OFFLINE_CACHE`, which says
    // nothing about which app wrote it and sits in the same SQLite table the
    // Supabase session does.
    expect(CACHE_KEY).toBe('wera.query-cache');
    expect(CACHE_KEY).not.toBe('REACT_QUERY_OFFLINE_CACHE');
  });

  it('carries a shape version, so a phone holding the old shape discards it', () => {
    expect(CACHE_SHAPE).not.toBe('');
  });

  it('forgets the cache and leaves the session alone', () => {
    // ⚠️⚠️ THE ASSERTION IS THE SECOND HALF. `forgetCache` reaches into the
    // store that holds the Supabase session and the remembered route; removing
    // one key too many here signs a shopkeeper out of a shop she is standing in.
    const held: Record<string, string> = {
      'wera.query-cache': '{"buster":"v1"}',
      'sb-hweutzjhzvioswnjzqki-auth-token': '{"access_token":"…"}',
      'wera.last-screen': '/productos',
    };
    const store: DeviceStore = {
      getItem: (key) => held[key] ?? null,
      setItem: (key, value) => {
        held[key] = value;
      },
      removeItem: (key) => {
        delete held[key];
      },
    };

    forgetCache(store);

    expect(held['wera.query-cache']).toBeUndefined();
    expect(Object.keys(held).sort()).toEqual([
      'sb-hweutzjhzvioswnjzqki-auth-token',
      'wera.last-screen',
    ]);
  });

  it('survives a phone with no store at all', () => {
    // ⚠️ `undefined` IS A LEGITIMATE VALUE OF `cacheMemory()` — it is what node
    // sees, and it is what the first frames of a web build see. A log-out that
    // threw here would be a person unable to sign out of a device with a full
    // disk.
    expect(cacheMemory()).toBeUndefined();
    expect(() => forgetCache(undefined)).not.toThrow();
  });
});

// ============================================================================
// ⚠️⚠️ THE WIRING, READ AS TEXT — AND IT IS HERE BECAUSE NOTHING ELSE IN THIS
// REPOSITORY CAN SEE IT.
//
// Every block above proves the POLICY: which keys, which statuses, which
// durations. None of them proves that `@/api/QueryProvider` actually asks. That
// file imports `expo-sqlite` transitively and is a component, so `R2` and
// `vitest.config.ts` both keep it out of this suite — and the failure mode is
// the quiet one: reimplement the predicate inline, or drop the `gcTime` loop,
// and all 23 assertions above stay green while nothing is written to the phone.
//
// ⚠️ SO IT ASSERTS THE CONSEQUENCE IT CAN REACH — that the binding names the
// policy rather than restating it — and leaves the behaviour to a phone in
// airplane mode. That is the same trade `auth-errors.test.ts`'s *"the library
// has exactly one caller"* block makes, and the same limit.
//
// ⚠️⚠️ COMMENTS ARE STRIPPED FIRST, AND THAT IS NOT A DETAIL. `QueryProvider`'s
// own header discusses `forgetCache` in prose; a matcher that read it would
// report the sign-out path as wired from a file that does not call it. It is
// the defect `conventions-gate.sh` spends a paragraph on.
// ============================================================================

describe('the binding names the policy rather than restating it', () => {
  const SRC = fileURLToPath(new URL('../src', import.meta.url));

  /** One source file with its comments removed. */
  function code(rel: string): string {
    return readFileSync(`${SRC}/${rel}`, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
  }

  const provider = code('api/QueryProvider.tsx');
  const auth = code('auth/AuthProvider.tsx');

  it('reads two real files, so nothing below can pass vacuously', () => {
    // ⚠️ RULE 4. A typo in either path throws, but a comment stripper that ate
    // the whole file would leave every `not.toMatch` below green.
    expect(provider.length).toBeGreaterThan(400);
    expect(auth.length).toBeGreaterThan(400);
    expect(provider).toMatch(/QueryClient/);
  });

  it('mounts the persisting provider and no longer mounts a bare one', () => {
    expect(provider).toMatch(/<PersistQueryClientProvider/);
    expect(provider).not.toMatch(/<QueryClientProvider/);
  });

  it('hands the dehydrate step this module’s predicate, not one of its own', () => {
    expect(provider).toMatch(/shouldDehydrateQuery:\s*shouldPersistQuery/);
  });

  it('takes both durations from here, so neither can be inlined at the mount', () => {
    expect(provider).toMatch(/maxAge:\s*CACHE_MAX_AGE/);
    expect(provider).toMatch(/buster:\s*CACHE_SHAPE/);
    expect(provider).toMatch(/key:\s*CACHE_KEY/);
  });

  it('sets the keep-in-memory default from the same list it persists', () => {
    // ⚠️⚠️ THE ONE THAT FAILS SILENTLY IF IT GOES. Drop this loop and the
    // default `gcTime` of five minutes collects the catalog out of the cache
    // between two saves — persisted once, then silently un-persisted, with no
    // error anywhere. See `@/api/persist`'s header.
    expect(provider).toMatch(/of\s+PERSISTED_KEYS[\s\S]{0,120}gcTime:\s*CACHE_GC_TIME/);
  });

  it('forgets the cache on the log-out and on nothing else', () => {
    // ⚠️⚠️ THE DESIGN DECISION THIS PINS IS THE ONE THAT WOULD DESTROY THE ROW
    // IF IT MOVED. `onAuthStateChange` nulls the session on a failed token
    // refresh as well as on a log-out, and a failed refresh is what a shop with
    // no signal has all day — so a `forgetCache` reached from a session effect
    // would wipe the offline catalog at the one moment it is the only catalog
    // there is. `signOut` is the one deliberate "I am done" act in this app.
    const callers = globSync('**/*.{ts,tsx}', { cwd: SRC })
      .sort()
      .filter((rel) => rel !== 'api/persist.ts' && /forgetCache\s*\(/.test(code(rel)));
    expect(callers).toEqual(['auth/AuthProvider.tsx']);
    expect(auth).toMatch(/signOut\s*=\s*useCallback[\s\S]{0,900}forgetCache\(cacheMemory\(\)\)/);
  });
});

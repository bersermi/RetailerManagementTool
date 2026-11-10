import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { QueryClient, dehydrate, hydrate, type DehydratedState } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { apartadosKey, reservasFrom, vecinosFrom, type Reserva } from '@/api/apartados';
import { kitchensKey } from '@/api/kitchen';
import { listingsKey } from '@/api/listing';
import { pageKey } from '@/api/pagina';
import {
  CACHE_GC_TIME,
  CACHE_KEY,
  CACHE_SHAPE,
  PERSISTED_KEYS,
  aTexto,
  asLastGood,
  deTexto,
  forgetCache,
  guardar,
  restaurar,
  setMemoryForgetter,
  shouldPersistKey,
  shouldPersistQuery,
} from '@/api/persist';
import type { DeviceStore } from '@/lib/store';

// ============================================================================
// WHAT WERA COCINA KEEPS ON THE PHONE. Plan task `10.5b-iv-b` (`@/api/persist`): the
// counter works with no signal from a cold start — her kitchen, her offers, her
// reservations and who reserved each — and nothing else is kept.
//
// ⚠️ THE ROUND TRIP IS TANSTACK'S OWN, RUN HERE: a client holding her reservations as
// this app holds them (with `Date`s), dehydrated as `@/api/QueryProvider` does, written,
// read back and hydrated into a NEW client — whose orders must answer `getTime`. A copy
// that came back with strings for moments would throw on the first screen that reads
// an hour, on the morning she has no signal.
// ============================================================================

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const code = (path: string) => readFileSync(join(SRC, path), 'utf8');

function memoria(): DeviceStore & { readonly datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

const fila = {
  id: 'r1',
  listing_id: 'o1',
  code: 347,
  pickup_at: '2026-11-10T20:45:00+00:00',
  pickup_day: '2026-11-10',
  held_until: '2026-11-10T22:00:00+00:00',
  payment: 'efectivo',
  eat: 'llevar',
  created_at: '2026-11-10T19:10:00+00:00',
  cancelled_at: null,
  cancelled_by: null,
  handed_over_at: null,
  picked_up_at: null,
  reservation_line: [{ line_no: 1, quantity: 1, unit_price: 60, container_price: 5, listing_line: { line_no: 1, name: 'Mole con arroz', surprise: false } }],
};

describe('the reads kept — what a cold start with no signal needs at the counter, and nothing else', () => {
  it('her kitchens, her offers and her reservations; never her page, her place or the trades', () => {
    expect(PERSISTED_KEYS).toEqual([
      ['cocina', 'mias'],
      ['cocina', 'publicaciones'],
      ['cocina', 'apartados'],
    ]);
    expect(shouldPersistKey(kitchensKey('u1'))).toBe(true);
    expect(shouldPersistKey(listingsKey('u1', 'k1'))).toBe(true);
    for (const lectura of ['hoy', 'antes', 'vecinos']) expect(shouldPersistKey(apartadosKey('u1', 'k1', lectura))).toBe(true);
    expect(shouldPersistKey(pageKey('u1', 'k1'))).toBe(false);
    expect(shouldPersistKey(['cocina'])).toBe(false);
    expect(shouldPersistKey(['cocina', 'giros'])).toBe(false);
  });

  it('a read is written while it holds data — a refresh that failed still holds her orders; one never answered has nothing', () => {
    const key = apartadosKey('u1', 'k1', 'hoy');
    expect(shouldPersistQuery({ queryKey: key, state: { status: 'success', data: [] } })).toBe(true);
    expect(shouldPersistQuery({ queryKey: key, state: { status: 'error', data: [] } })).toBe(true);
    expect(shouldPersistQuery({ queryKey: key, state: { status: 'error' } })).toBe(false);
    expect(shouldPersistQuery({ queryKey: key, state: { status: 'pending' } })).toBe(false);
  });

  it('and written as the success it last was, its age untouched', () => {
    const client = { queries: [{ state: { status: 'error', data: [1], dataUpdatedAt: 5, error: { message: 'x' }, fetchFailureCount: 2 } }] };
    expect(asLastGood(client).queries[0].state).toMatchObject({ status: 'success', data: [1], dataUpdatedAt: 5, error: null, fetchFailureCount: 0 });
  });

  it('⚠️ the kept reads are never collected — the save walks the live cache (Wera’s `gcTime` trap)', () => {
    expect(CACHE_GC_TIME).toBe(Infinity);
    const provider = code('api/QueryProvider.tsx');
    expect(provider).toMatch(/for \(const key of PERSISTED_KEYS\) client\.setQueryDefaults\(key, \{ gcTime: CACHE_GC_TIME \}\);/);
    expect(provider).toMatch(/shouldDehydrateQuery: shouldPersistQuery, shouldDehydrateMutation: \(\) => false/);
  });
});

describe('the round trip — TanStack’s own, with her orders’ moments', () => {
  it('⚠️ a client with her reservations, dehydrated, written, read back and hydrated: every moment is a Date again', () => {
    const viejo = new QueryClient();
    const key = apartadosKey('u1', 'k1', 'hoy');
    viejo.setQueryData(key, reservasFrom([fila]));
    viejo.setQueryData(apartadosKey('u1', 'k1', 'vecinos'), vecinosFrom([{ id: 'r1', neighbour: { name: 'Ana R.', score: null }, thumb: null, rate_until: '2026-11-11T22:00:00+00:00' }]));
    viejo.setQueryData(pageKey('u1', 'k1'), { sentence: 'no se guarda' });
    const store = memoria();
    guardar(store, dehydrate(viejo, { shouldDehydrateQuery: shouldPersistQuery }));

    const nuevo = new QueryClient();
    const guardado = restaurar<DehydratedState>(store);
    expect(guardado).not.toBeNull();
    hydrate(nuevo, guardado as DehydratedState);
    const [r] = nuevo.getQueryData<Reserva[]>(key) as Reserva[];
    expect(r.hora).toBeInstanceOf(Date);
    expect(r.hora.getTime()).toBe(Date.parse('2026-11-10T20:45:00Z'));
    expect(r.guardadaHasta.toISOString()).toBe('2026-11-10T22:00:00.000Z');
    expect(r.entregadaEn).toBeNull();
    expect(r).toEqual(reservasFrom([fila])[0]);
    expect(nuevo.getQueryData<Record<string, { calificarHasta: Date }>>(apartadosKey('u1', 'k1', 'vecinos'))?.r1.calificarHasta).toBeInstanceOf(Date);
    // Never what is not on the list.
    expect(nuevo.getQueryData(pageKey('u1', 'k1'))).toBeUndefined();
  });

  it('a copy of another shape, or that will not parse, is nothing — a launch never fails on the phone’s disk', () => {
    const store = memoria();
    store.datos.set(CACHE_KEY, JSON.stringify({ forma: 'v0', client: { queries: [] } }));
    expect(restaurar(store)).toBeNull();
    store.datos.set(CACHE_KEY, '{"forma":');
    expect(restaurar(store)).toBeNull();
    expect(restaurar(undefined)).toBeNull();
    expect(deTexto(null)).toBeNull();
    expect(JSON.parse(aTexto({ queries: [] })).forma).toBe(CACHE_SHAPE);
  });

  it('a Date anywhere is written as `$fecha` — the replacer reads the holder, because `toJSON` runs first', () => {
    const texto = aTexto({ queries: [{ state: { status: 'success', data: { a: [new Date('2026-11-10T00:00:00Z')], b: new Date(Number.NaN) } } }] });
    expect(texto).toContain('{"$fecha":"2026-11-10T00:00:00.000Z"}');
    expect(texto).toContain('{"$fecha":null}');
    const back = deTexto<{ queries: { state: { data: { a: Date[]; b: Date } } }[] }>(texto);
    expect(back?.queries[0].state.data.a[0]).toEqual(new Date('2026-11-10T00:00:00Z'));
    expect(Number.isNaN(back?.queries[0].state.data.b.getTime())).toBe(true);
  });
});

describe('forgotten on Cerrar sesión, and only there', () => {
  it('a save with nothing to keep removes the key — the cleared client’s next save never writes an empty cache back (found on the emulator)', () => {
    const store = memoria();
    store.datos.set(CACHE_KEY, 'x');
    guardar(store, { queries: [] });
    expect(store.datos.has(CACHE_KEY)).toBe(false);
    guardar(store, { queries: [{ state: { status: 'success', data: [] } }] });
    expect(store.datos.has(CACHE_KEY)).toBe(true);
  });

  it('memory first, then the key — or the next save writes her kitchen back', () => {
    const store = memoria();
    store.datos.set(CACHE_KEY, 'x');
    store.datos.set('cocina.cola', 'y');
    const orden: string[] = [];
    setMemoryForgetter(() => orden.push('memoria'));
    forgetCache(store);
    setMemoryForgetter(null);
    expect(orden).toEqual(['memoria']);
    expect(store.datos.has(CACHE_KEY)).toBe(false);
    // ⚠️ Her queue is not this: it is sent when she comes back in.
    expect(store.datos.get('cocina.cola')).toBe('y');
  });

  it('⚠️ from the sign-out, after the session is gone — never on `session === null`, which a failed renewal with no signal also is', () => {
    const provider = code('auth/AuthProvider.tsx');
    expect(provider).toMatch(/const signOut = useCallback\(async \(\) => \{[\s\S]*?forgetCache\(deviceStore\(\)\);\s*\}, \[\]\);/);
    expect(provider.match(/forgetCache\(/g)).toHaveLength(1);
  });

  it('hydrated before the first frame, from the synchronous store', () => {
    expect(code('api/QueryProvider.tsx')).toMatch(/const guardado = restaurar<DehydratedState>\(deviceStore\(\)\);\s*if \(guardado !== null\) hydrate\(client, guardado\);/);
    expect(code('api/QueryProvider.tsx')).toMatch(/const \[client\] = useState\(buildClient\);/);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { apartadosFrom } from '@/api/apartados';
import { BOLETOS_FORMA, BOLETOS_KEY, BOLETO_DESPUES_MS, aGuardar, guardarBoletos, leerBoletos, olvidarBoletos } from '@/lib/boletos';
import type { DeviceStore } from '@/lib/store';

// ============================================================================
// HER TICKETS, KEPT ON HER PHONE. Plan task `10.9j-ii-a` (`@/lib/boletos`; the owner's J1 of
// 2026-11-20): only what is still to collect — what the database sealed — without photos, with
// the moment it was read, per login, not read back a day past its window, and gone at *Cerrar
// sesión*. Itacate's one read on the disk, so every edge of it is pinned here.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ANA = 'u-ana';
const LEIDO = new Date('2026-11-20T19:40:00.000Z');

function memoria(): DeviceStore & { readonly datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

/** One of `my_reservations`' rows as `0088` writes it. */
function fila(id: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    code: 418,
    state: 'apartado',
    pickup_at: '2026-11-20T20:30:00+00:00',
    held_until: '2026-11-20T22:00:00+00:00',
    cancel_until: '2026-11-20T19:30:00+00:00',
    payment: 'efectivo',
    eat: 'llevar',
    cancel_reason: null,
    rate_until: null,
    my_rating: null,
    kitchen: {
      id: 'k-1',
      name: 'Fonda Doña Mari',
      giro: 'giro-fonda',
      address: { street: 'Sabino', street_number: '120', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postal_code: '06400' },
      directions: 'Portón verde',
      page: { color: 'chile', logo_path: 'k-1/logo.jpg', maps_link: null },
    },
    lines: [{ line_no: 1, name: 'Pozole rojo', surprise: false, image_path: 'k-1/pozole.jpg', quantity: '1.000', unit_price: '85.00', container_price: '5.00' }],
    seal: `s1|${id}|k1|1|418|1763670600|efectivo|llevar|1.000|85.00|5.00|0|Pozole rojo|0123456789abcdef0123`,
    ...over,
  };
}

describe('what of a read is kept', () => {
  it('only what the database sealed — still to collect; her history stays in memory', () => {
    const lectura = [fila('r-1'), fila('r-2', { state: 'recogido', seal: null }), fila('r-3', { state: 'cancelado', seal: null })];
    expect(aGuardar(lectura).map((f) => (f as { id: string }).id)).toEqual(['r-1']);
  });

  it('⚠️ no photos: the kitchen’s logo and each dish’s picture are blanked; everything else as it came', () => {
    const [guardada] = aGuardar([fila('r-1')]) as Record<string, any>[];
    expect(guardada.kitchen.page.logo_path).toBeNull();
    expect(guardada.lines[0].image_path).toBeNull();
    expect(guardada.kitchen.page.color).toBe('chile');
    expect(guardada.kitchen.address.street).toBe('Sabino');
    expect(guardada.lines[0].name).toBe('Pozole rojo');
    expect(guardada.seal).toBe(fila('r-1').seal);
    expect(JSON.stringify(guardada)).not.toMatch(/\.jpg/);
  });

  it('what was not a list keeps nothing', () => {
    expect(aGuardar(null)).toEqual([]);
    expect(aGuardar({ error: 'x' })).toEqual([]);
  });
});

describe('written and read back', () => {
  it('her tickets come back for her login, with the moment they were read, read as a live answer is', () => {
    const store = memoria();
    guardarBoletos(store, ANA, LEIDO, [fila('r-1'), fila('r-2', { seal: null, state: 'recogido' })]);
    expect([...store.datos.keys()]).toEqual([BOLETOS_KEY]);
    expect(BOLETOS_KEY).toBe('itacate.boletos');
    const leidos = leerBoletos(store, ANA, LEIDO);
    expect(leidos?.leidoEn).toEqual(LEIDO);
    const [apartado] = apartadosFrom(leidos?.filas);
    expect(apartado.codigo).toBe('418');
    expect(apartado.sello).toBe(fila('r-1').seal);
    expect(apartado.cocina.pagina.logo).toBeNull();
  });

  it('another login reads nothing of hers', () => {
    const store = memoria();
    guardarBoletos(store, ANA, LEIDO, [fila('r-1')]);
    expect(leerBoletos(store, 'u-beto', LEIDO)).toBeNull();
    expect(leerBoletos(store, null, LEIDO)).toBeNull();
  });

  it('a read with nothing still to collect removes the key — never an empty list left behind', () => {
    const store = memoria();
    guardarBoletos(store, ANA, LEIDO, [fila('r-1')]);
    guardarBoletos(store, ANA, LEIDO, [fila('r-1', { state: 'recogido', seal: null })]);
    expect(store.datos.has(BOLETOS_KEY)).toBe(false);
  });

  it('⚠️ a day past its window it is not read back, even with no read since to write over it', () => {
    const store = memoria();
    guardarBoletos(store, ANA, LEIDO, [fila('r-1'), fila('r-2', { held_until: '2026-11-21T22:00:00+00:00' })]);
    const hasta = new Date('2026-11-20T22:00:00Z').getTime() + BOLETO_DESPUES_MS;
    expect(leerBoletos(store, ANA, new Date(hasta))?.filas).toHaveLength(2);
    expect(leerBoletos(store, ANA, new Date(hasta + 1))?.filas.map((f) => (f as { id: string }).id)).toEqual(['r-2']);
    expect(leerBoletos(store, ANA, new Date(new Date('2026-11-21T22:00:00Z').getTime() + BOLETO_DESPUES_MS + 1))).toBeNull();
  });

  it('another shape, or text that is not JSON: nothing — never a ticket this build cannot vouch for', () => {
    const store = memoria();
    store.setItem(BOLETOS_KEY, JSON.stringify({ forma: BOLETOS_FORMA + 1, usuario: ANA, leidoEn: LEIDO.toISOString(), filas: [fila('r-1')] }));
    expect(leerBoletos(store, ANA, LEIDO)).toBeNull();
    store.setItem(BOLETOS_KEY, '{nope');
    expect(leerBoletos(store, ANA, LEIDO)).toBeNull();
    expect(leerBoletos(undefined, ANA, LEIDO)).toBeNull();
  });

  it('*Cerrar sesión* forgets them', () => {
    const store = memoria();
    guardarBoletos(store, ANA, LEIDO, [fila('r-1')]);
    olvidarBoletos(store);
    expect(store.datos.size).toBe(0);
  });
});

describe('who keeps them, and when they go', () => {
  const src = (path: string) => readFileSync(join(ROOT, 'itacate/src', path), 'utf8');

  it('⚠️ forgotten at Cerrar sesión, first — in the one function that ends a session', () => {
    expect(src('auth/AuthProvider.tsx')).toMatch(/const signOut = useCallback\(async \(\) => \{\s*olvidarBoletos\(deviceStore\(\)\);/);
  });

  it('written by every read of her reservations with signal, and read back to start a launch with none', () => {
    const hooks = src('api/hooks.ts');
    expect(hooks).toMatch(/guardarBoletos\(deviceStore\(\), userId, new Date\(\), filas\)/);
    expect(hooks).toMatch(/initialData: \(\) => \{\s*const guardados = leerBoletos\(deviceStore\(\), userId, new Date\(\)\);/);
    expect(hooks).toMatch(/initialDataUpdatedAt: \(\) => leerBoletos\(deviceStore\(\), userId, new Date\(\)\)\?\.leidoEn\.getTime\(\)/);
  });
});

// ============================================================================
// CONOCE WERA — `@/navigation/recorrido`, plan task `8g` (the owner's ruling of
// 2026-10-21, *"Go with A and D1, your recommendations"*). Who gets which story,
// and when it opens by itself: the two answers no phone can be asked for.
// ============================================================================

import { describe, expect, it } from 'vitest';

import {
  MAX_CARD_MS,
  MIN_CARD_MS,
  PICTURE_MS,
  cardMs,
  palabras,
  RECORRIDO_DUENO,
  RECORRIDO_EMPLEADO,
  SIN_PANTALLA,
  abrePorSiSolo,
  esUltima,
  historiaDe,
  recorridoDe,
  vioSuHistoria,
  type Momento,
  type Recuerdo,
} from '@/navigation/recorrido';
import type { DeviceStore } from '@/lib/store';
import {
  FIRST_OUTAGE_KEY,
  FIRST_SALE_KEY,
  OPENING_KEY,
  RECORRIDO_KEY,
  RECORRIDO_KEYS,
  historiaVista,
  marcarHistoria,
} from '@/offline/ensenar';
import { ES } from '@/strings';


describe('who gets which story', () => {
  it('gives an owner and an Encargado the eight cards, with deliveries, costs and Te lo compro', () => {
    expect(recorridoDe('owner')).toEqual(RECORRIDO_DUENO);
    expect(recorridoDe('manager')).toEqual(RECORRIDO_DUENO);
    expect(RECORRIDO_DUENO).toHaveLength(8);
    expect(RECORRIDO_DUENO).toContain('comprar');
    expect(RECORRIDO_DUENO).toContain('merma');
  });

  it('gives an Empleado five, and none of them promises what she cannot open', () => {
    expect(recorridoDe('staff')).toEqual(RECORRIDO_EMPLEADO);
    expect(RECORRIDO_EMPLEADO).toHaveLength(5);
    // ⚠️ `5R-o`: Comprar is hers since 2026-11-17 — her own card, second, as the owner's is.
    expect(RECORRIDO_EMPLEADO[1]).toBe('comprarEmpleado');
    expect(SIN_PANTALLA).toContain('comprarEmpleado');
    for (const owners of ['comprar', 'productos', 'numeros', 'descubre'] as const) {
      expect(RECORRIDO_EMPLEADO).not.toContain(owners);
    }
  });

  it('gives a role not yet read the short story, never the owner’s', () => {
    expect(recorridoDe(null)).toEqual(RECORRIDO_EMPLEADO);
  });

  it('opens on the hello card and closes on the one that holds the way out', () => {
    expect(RECORRIDO_DUENO[0]).toBe('hola');
    expect(RECORRIDO_DUENO[RECORRIDO_DUENO.length - 1]).toBe('listo');
    expect(esUltima(RECORRIDO_DUENO, RECORRIDO_DUENO.length - 1)).toBe(true);
    expect(esUltima(RECORRIDO_DUENO, 0)).toBe(false);
  });

  it('has every card in the owner’s words, his two edits and his two lines included', () => {
    for (const card of [...RECORRIDO_DUENO, ...RECORRIDO_EMPLEADO]) {
      expect(ES.recorrido.cards[card].title.length).toBeGreaterThan(0);
      expect(ES.recorrido.cards[card].line.length).toBeGreaterThan(0);
    }
    expect(ES.recorrido.cards.comprar.title).toBe('Conoce tus costos y que no te coman');
    expect(ES.recorrido.cards.comprar.line).toBe(
      'Anota lo que te entrega cada proveedor. Wera te ayuda a ajustar tus precios.',
    );
    expect(ES.recorrido.cards.productos.title).toBe('¿Sabes cuánto te deja cada producto?');
    expect(ES.recorrido.cards.numeros.title).toBe('Ten tus cuentas en orden y tus números a la mano');
    expect(ES.recorrido.cards.comprarEmpleado.title).toBe('Cuando llega el proveedor');
    expect(ES.recorrido.cards.comprarEmpleado.line).toBe(
      'En Comprar anotas lo que te entregó y cuánto costó. Wera recuerda el último precio.',
    );
  });
});

describe('when the story opens by itself — once on every phone (his ruling of 2026-10-22)', () => {
  const unseen: Momento = { seen: false, selling: false };

  it('opens on a phone that has not seen it, whether it had Wera before or not', () => {
    expect(abrePorSiSolo(unseen)).toBe(true);
  });

  it('never again once this phone has opened it, or closed its card', () => {
    expect(abrePorSiSolo({ ...unseen, seen: true })).toBe(false);
  });

  it('never over a basket she is ringing up — it waits for the next time', () => {
    expect(abrePorSiSolo({ ...unseen, selling: true })).toBe(false);
  });
});

describe('how long a card stays — his correction of 2026-10-22, "too little to … read"', () => {
  it('counts the words a reader meets', () => {
    expect(palabras('Vende en segundos, aunque se vaya la señal')).toBe(8);
    expect(palabras('  dos   palabras ')).toBe(2);
    expect(palabras('')).toBe(0);
  });

  it('gives longer words more time, and a real screen more time still', () => {
    const short = cardMs('Una línea corta de prueba', true);
    const long = cardMs('Una línea bastante más larga que la anterior y que tarda en leerse con calma', true);
    expect(long).toBeGreaterThan(short);
    expect(cardMs('Una línea corta de prueba', true) - cardMs('Una línea corta de prueba', false)).toBeLessThanOrEqual(PICTURE_MS);
  });

  it('never leaves a card for less than the floor or more than the ceiling', () => {
    expect(cardMs('', false)).toBe(MIN_CARD_MS);
    expect(cardMs('palabra '.repeat(200), true)).toBe(MAX_CARD_MS);
  });

  it('keeps every real card at least twice the old six and a half seconds where it shows a screen', () => {
    for (const card of [...RECORRIDO_DUENO, ...RECORRIDO_EMPLEADO]) {
      const words = ES.recorrido.cards[card];
      const screen = !SIN_PANTALLA.includes(card);
      const ms = cardMs(`${words.title} ${words.line}`, screen);
      expect(ms).toBeGreaterThanOrEqual(MIN_CARD_MS);
      expect(ms).toBeLessThanOrEqual(MAX_CARD_MS);
      if (screen) expect(ms).toBeGreaterThanOrEqual(10_000);
    }
  });
});

describe('the keys it is remembered by', () => {
  it('are their own, apart from the other things taught once and from each other', () => {
    const keys = [FIRST_SALE_KEY, FIRST_OUTAGE_KEY, OPENING_KEY, RECORRIDO_KEY, RECORRIDO_KEYS.dueno, RECORRIDO_KEYS.empleado];
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys.slice(3)) expect(key.startsWith('wera.taught.')).toBe(true);
  });

  // ⚠️ A RENAMED KEY IS EVERY PHONE SEEING ITS STORY AGAIN: the old one is pinned.
  it('still reads the mark every phone wrote before 5R-n', () => {
    expect(RECORRIDO_KEY).toBe('wera.taught.recorrido');
  });
});

// ============================================================================
// ONCE PER STORY, NOT PER PHONE — `5R-n`, the owner's ruling of 2026-11-17.
// ============================================================================

const nada: Recuerdo = { dueno: false, empleado: false, antes: false };

describe('once per story, not per phone (5R-n)', () => {
  it('names the owner’s story for an owner and an Encargado, hers for everyone else', () => {
    expect(historiaDe('owner')).toBe('dueno');
    expect(historiaDe('manager')).toBe('dueno');
    expect(historiaDe('staff')).toBe('empleado');
    expect(historiaDe(null)).toBe('empleado');
  });

  it('opens the owner’s eight on a phone that saw only the Empleado’s four — and the other way round', () => {
    expect(vioSuHistoria('dueno', { ...nada, empleado: true })).toEqual({ vista: false, adopta: false });
    expect(vioSuHistoria('empleado', { ...nada, dueno: true })).toEqual({ vista: false, adopta: false });
  });

  it('keeps a story seen once it was seen, whatever the other', () => {
    expect(vioSuHistoria('dueno', { ...nada, dueno: true, empleado: true }).vista).toBe(true);
    expect(vioSuHistoria('empleado', { ...nada, empleado: true }).vista).toBe(true);
  });

  it('gives the mark of before to the first story asked about, once — the other never inherits it', () => {
    expect(vioSuHistoria('dueno', { ...nada, antes: true })).toEqual({ vista: true, adopta: true });
    // After the adoption the owner's story has its own mark; the Empleado's is unseen.
    expect(vioSuHistoria('empleado', { dueno: true, empleado: false, antes: true })).toEqual({ vista: false, adopta: false });
  });

  it('opens on a phone that saw neither', () => {
    expect(vioSuHistoria('dueno', nada).vista).toBe(false);
    expect(vioSuHistoria('empleado', nada).vista).toBe(false);
  });
});

/** A device store in memory — the phone's own is `localStorage` over SQLite. */
function memoria(start: Record<string, string> = {}): DeviceStore & { readonly data: Map<string, string> } {
  const data = new Map(Object.entries(start));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe('what this phone writes (5R-n)', () => {
  it('decides nothing and writes nothing while her role is not read', () => {
    const store = memoria({ [RECORRIDO_KEY]: '1' });
    expect(historiaVista(store, null)).toBeNull();
    expect([...store.data.keys()]).toEqual([RECORRIDO_KEY]);
  });

  it('writes the mark of before into the first role’s story, so the tester’s phone opens the other one later', () => {
    const store = memoria({ [RECORRIDO_KEY]: '1' });
    expect(historiaVista(store, 'staff')).toBe(true);
    expect(store.data.get(RECORRIDO_KEYS.empleado)).toBe('1');
    expect(historiaVista(store, 'owner')).toBe(false);
  });

  it('marks the story of her role when it is opened or its card closed, and only that one', () => {
    const store = memoria();
    marcarHistoria(store, 'manager');
    expect(historiaVista(store, 'owner')).toBe(true);
    expect(historiaVista(store, 'staff')).toBe(false);
  });
});

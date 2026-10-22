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
  abrePorSiSolo,
  esUltima,
  recorridoDe,
  type Momento,
} from '@/navigation/recorrido';
import { FIRST_OUTAGE_KEY, FIRST_SALE_KEY, OPENING_KEY, RECORRIDO_KEY } from '@/offline/ensenar';
import { ES } from '@/strings';


describe('who gets which story', () => {
  it('gives an owner and an Encargado the eight cards, with deliveries, costs and Te lo compro', () => {
    expect(recorridoDe('owner')).toEqual(RECORRIDO_DUENO);
    expect(recorridoDe('manager')).toEqual(RECORRIDO_DUENO);
    expect(RECORRIDO_DUENO).toHaveLength(8);
    expect(RECORRIDO_DUENO).toContain('comprar');
    expect(RECORRIDO_DUENO).toContain('merma');
  });

  it('gives an Empleado four, and none of them promises what she cannot open', () => {
    expect(recorridoDe('staff')).toEqual(RECORRIDO_EMPLEADO);
    expect(RECORRIDO_EMPLEADO).toHaveLength(4);
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
      const ms = cardMs(`${words.title} ${words.line}`, card !== 'hola' && card !== 'listo');
      expect(ms).toBeGreaterThanOrEqual(MIN_CARD_MS);
      expect(ms).toBeLessThanOrEqual(MAX_CARD_MS);
      if (card !== 'hola' && card !== 'listo') expect(ms).toBeGreaterThanOrEqual(10_000);
    }
  });
});

describe('the key it is remembered by', () => {
  it('is its own, apart from the other things taught once', () => {
    const keys = [FIRST_SALE_KEY, FIRST_OUTAGE_KEY, OPENING_KEY, RECORRIDO_KEY];
    expect(new Set(keys).size).toBe(keys.length);
    expect(RECORRIDO_KEY.startsWith('wera.taught.')).toBe(true);
  });
});

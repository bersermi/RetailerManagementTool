// ============================================================================
// THE HEADINGS IN SENTENCE CASE — `11.6`, direction A · *Mostrador* (the owner's
// yes of 2026-11-26). The spaced capitals became headings, and the only words
// Step 11 changes are their case: *TU MES* → *Tu mes*.
//
// ⚠️ A VALUE A CUSTOMER SEES (ADR-035 §2.11): the words on the screen. Two
// halves — the words are WRITTEN in sentence case in `@/strings`, and
// `@/format/oracion` capitalises only the first letter of one that arrives built.
// ============================================================================

import { describe, expect, it } from 'vitest';

import { enOracion } from '@/format/oracion';
import { ES } from '@/strings';

describe('`11.6` — a heading’s first letter, and nothing else', () => {
  it('capitalises a date that arrives in lower case', () => {
    expect(enOracion('lunes 3 · 2 ventas')).toBe('Lunes 3 · 2 ventas');
    expect(enOracion('noviembre')).toBe('Noviembre');
  });

  it('keeps a name’s own capitals — never a lower-casing', () => {
    expect(enOracion('Más de Coca-Cola')).toBe('Más de Coca-Cola');
    expect(enOracion('Tu semana · 3 al 9 de nov')).toBe('Tu semana · 3 al 9 de nov');
  });

  it('reads past an opening question or exclamation mark, and leaves a figure alone', () => {
    expect(enOracion('¿cómo está?')).toBe('¿Cómo está?');
    expect(enOracion('¡listo!')).toBe('¡Listo!');
    expect(enOracion('3 de noviembre')).toBe('3 de noviembre');
    expect(enOracion('')).toBe('');
  });
});

describe('`11.6` — no word in `@/strings` is written in capitals any more', () => {
  it('every string the app shows, walked: none is a run of capitals but an abbreviation', () => {
    // An abbreviation is a word, not a heading: *IVA*, *PDF*, *CSV*.
    const ABBREVIATIONS = new Set(['IVA', 'PDF', 'CSV', 'WhatsApp']);
    const seen: string[] = [];
    const shouted: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === 'string') {
        seen.push(path);
        const letters = value.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
        const isShouted = letters.length >= 4 && letters === letters.toLocaleUpperCase('es-MX') && !ABBREVIATIONS.has(value.trim());
        if (isShouted) shouted.push(`${path}: ${value}`);
      } else if (value !== null && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      }
    };
    walk(ES, 'ES');
    expect(seen.length, 'no strings were walked').toBeGreaterThan(500);
    expect(shouted, 'a heading in capitals — write it in sentence case').toEqual([]);
  });
});

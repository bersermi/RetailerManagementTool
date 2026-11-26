// ============================================================================
// THE HEADINGS IN SENTENCE CASE — `11.7-i`, direction A · *Mostrador* (the owner's
// yes of 2026-11-26 on this app's screens, `11.5-ii`), as Wera's since `11.6`
// (`app/test/oracion.test.ts`, this file's twin). The spaced capitals became headings, and the only words
// Step 11 changes are their case: *LO QUE SIGUE* → *Lo que sigue*.
//
// ⚠️ A VALUE A CUSTOMER SEES (ADR-035 §2.11): the words on the screen, WRITTEN in
// sentence case in `@/strings`. Until `11.7-i` this app capitalised them with a
// style (`textTransform`), which `test/pestanas.test.ts` now refuses; no heading
// here arrives built, so Wera's `@/format/oracion` is not copied — the row that
// builds one copies it.
// ============================================================================

import { describe, expect, it } from 'vitest';

import { ES } from '@/strings';

describe('`11.7-i` — no word in `@/strings` is written in capitals', () => {
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
    expect(seen.length, 'no strings were walked').toBeGreaterThan(200);
    expect(shouted, 'a heading in capitals — write it in sentence case').toEqual([]);
  });
});

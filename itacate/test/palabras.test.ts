import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ES } from '@/strings';

// ============================================================================
// THE WORDS. Plan task `10.5-v-a` — the owner's ruling of 2026-11-05: no word that
// makes the food sound left over anywhere a fonda or a neighbour reads, and no
// sentence saying there are no penalties; the app's line, *La comida del día de tu
// colonia, a mejor precio*, where it first greets her.
//
// ⚠️ EVERY WORD ON A SCREEN IS IN `src/strings.ts` (`test/data-layer.test.ts`), so
// that file, its comments stripped, is the whole of what she can read here — the
// comments keep the old words as history. Wera Cocina's twin is
// `cocina/test/palabras.test.ts`, which also reads the aviso. The quiet kitchen's
// line and her page's two titles are pinned where they are made, word for word
// (`test/lista.test.ts`, `test/paginas.test.ts`).
// ============================================================================

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
// Whole-line `//` comments first, as `test/data-layer.test.ts` strips them.
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** The family-shell page's *Never* column, as whole words — *sobre ti* is not *sobra*. */
const SOBRAS =
  /(?<!\p{L})(sobra|sobras|sobró|sobraron|sobrante|sobrantes|sobrado|sobrada|sobrados|sobradas|restos|desperdicio|merma|excedente|excedentes|rescatado|rescatada|rescatados|rescatadas)(?!\p{L})/giu;
/** And nothing that speaks of penalties. */
const CASTIGOS = /(?<!\p{L})(castigo|castigos|penalización|penalizaciones|penalidad|multa|multas|sanción|sanciones)(?!\p{L})/giu;

/**
 * ⚠️ ONE SENTENCE NAMES WERA'S *MERMA*, AND MAY: a shop's owner deleting her account here
 * is pointed to her own month download in Wera — *ventas, compras y merma*, the names of
 * Wera's modules (`ES.account.shopRecords`, Wera's words). The row exempts Wera's *Merma*;
 * this one line is the only place it is let through.
 */
const sentences = () => code('strings.ts').replace(/^\s*shopRecords: '[^']*',$/m, '');

describe('no word that makes the food sound left over', () => {
  it('in any sentence Itacate shows', () => {
    expect(sentences().match(SOBRAS)).toBeNull();
  });

  it('but Wera’s own Merma, named to a shop’s owner — one line, about her shop in Wera', () => {
    expect(ES.account.shopRecords).toMatch(/tu tienda en Wera/);
    expect(code('strings.ts').match(SOBRAS)).toEqual(['merma']);
  });

  it('and no sentence about penalties', () => {
    expect(sentences().match(CASTIGOS)).toBeNull();
  });

  it('the guard itself sees the old words, and passes over *sobre*', () => {
    expect('Comidas rescatadas'.match(SOBRAS)).toEqual(['rescatadas']);
    expect('Lo que sobró'.match(SOBRAS)).toEqual(['sobró']);
    expect('Una frase sobre tu cocina'.match(SOBRAS)).toBeNull();
  });
});

describe('the ruled words, word for word', () => {
  // Asserted as text, never read back from `ES` into itself.
  it('a quiet kitchen has no offers now, says a screen reader — never "sin nada en oferta"', () => {
    expect(ES.cerca.abrirCocina('Fonda Doña Mari')).toBe('Fonda Doña Mari, sin ofertas ahora');
  });

  it('her page: Lo que suele ofrecer, and Por hoy ya se terminó', () => {
    expect(ES.pagina.loQueSuele).toBe('Lo que suele ofrecer');
    expect(ES.pagina.nadaPorHoy).toBe('Por hoy ya se terminó');
  });

  it('the app’s line is La comida del día de tu colonia, a mejor precio, and the way in shows it first', () => {
    expect(ES.lema).toBe('La comida del día de tu colonia, a mejor precio');
    const screen = code('app/(auth)/entrar.tsx');
    expect(screen).toMatch(/\{ES\.lema\}/);
    // First: above the providers' buttons.
    expect(screen.indexOf('{ES.lema}')).toBeLessThan(screen.indexOf('ES.auth.google'));
  });
});

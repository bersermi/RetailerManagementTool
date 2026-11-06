import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ES } from '@/strings';

// ============================================================================
// THE WORDS. Plan task `10.5-v-a` — the owner's ruling of 2026-11-05: no word that
// makes the food sound left over anywhere a fonda or a neighbour reads, and no
// sentence saying there are no penalties. *Publicar una oferta*, *Tu oferta de hoy*,
// and the app's line, *Vende hasta el último plato*, where it first greets her.
//
// ⚠️ EVERY WORD ON A SCREEN IS IN `src/strings.ts` (`test/data-layer.test.ts`), so
// that file, its comments stripped, is the whole of what she can read here — the
// comments keep the old words as history. Itacate's twin is
// `itacate/test/palabras.test.ts`. The aviso is read too: its sign-in opens it, and
// `cocina-itacate.yml` fires on it. ⚠️ Wera's *Merma* is the shopkeeper's own module
// and not this rule's: nothing here reads `app/`.
// ============================================================================

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
// Whole-line `//` comments first, as `test/data-layer.test.ts` strips them.
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const AVISO = readFileSync(
  fileURLToPath(new URL('../../site/privacidad/cocina-e-itacate/index.html', import.meta.url)),
  'utf8',
);

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
  it('in any sentence Wera Cocina shows', () => {
    expect(sentences().match(SOBRAS)).toBeNull();
  });

  it('but Wera’s own Merma, named to a shop’s owner — one line, about her shop in Wera', () => {
    expect(ES.account.shopRecords).toMatch(/tu tienda en Wera/);
    expect(code('strings.ts').match(SOBRAS)).toEqual(['merma']);
  });

  it('in the aviso its sign-in opens', () => {
    expect(AVISO.match(SOBRAS)).toBeNull();
  });

  it('and no sentence about penalties, in either', () => {
    expect(sentences().match(CASTIGOS)).toBeNull();
    expect(AVISO.match(CASTIGOS)).toBeNull();
  });

  it('the guard itself sees the old words, and passes over *sobre*', () => {
    expect('Publicar lo que te sobra'.match(SOBRAS)).toEqual(['sobra']);
    expect('lo que te sobró del día'.match(SOBRAS)).toEqual(['sobró']);
    expect('Una frase sobre tu cocina'.match(SOBRAS)).toBeNull();
  });
});

describe('the ruled words, word for word', () => {
  // Asserted as text, never read back from `ES` into itself.
  it('her button is Publicar una oferta, and its screen Tu oferta de hoy', () => {
    expect(ES.publicar.abrir).toBe('Publicar una oferta');
    expect(ES.publicar.titulo).toBe('Tu oferta de hoy');
  });

  it('the app’s line is Vende hasta el último plato, and the way in shows it first', () => {
    expect(ES.lema).toBe('Vende hasta el último plato');
    const screen = code('app/(auth)/entrar.tsx');
    expect(screen).toMatch(/\{ES\.lema\}/);
    // First: above the providers' buttons.
    expect(screen.indexOf('{ES.lema}')).toBeLessThan(screen.indexOf('ES.auth.google'));
  });
});

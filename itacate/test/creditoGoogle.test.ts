import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ES } from '@/strings';

// ============================================================================
// *GOOGLE MAPS*, WHERE GOOGLE'S MAP MAY NOT SHOW. Plan task `10.5-iv-b-iii`, the owner's
// ruling D6 of 2026-11-19 (*"agree"*): *"the words Google Maps, small and grey, at the foot
// of the full list and under the distance on a kitchen's page and a dish's"* — every
// distance Itacate shows is worked out from Google's point for a kitchen's address, and
// the list at full height and both pages hide the map and its logo. Wera Cocina's copies of
// the two pages are handed no distance, so they draw none (`cocina/test/vecinos.test.ts`).
//
// ⚠️ WHAT THIS CANNOT SEE: that it draws (ADR-035 §2.11). The session's emulator run and the
// owner's look are its evidence.
// ============================================================================

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const code = (path: string) =>
  readFileSync(join(SRC, path), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

function sources(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('the words, as Google’s attribution rules write them where its logo does not fit', () => {
  const credito = code('ui/CreditoDeGoogle.tsx');

  it('*Google Maps* — Google’s text, untranslated, on one line', () => {
    expect(ES.cerca.creditoGoogle).toBe('Google Maps');
    expect(credito).toMatch(/<Text\s+numberOfLines=\{1\}/);
    expect(credito).toMatch(/\{ES\.cerca\.creditoGoogle\}/);
  });

  it('small and grey: 12 points, weight 400, Google’s grey, Roboto on Android — Wera Cocina’s credit’s', () => {
    expect(credito).toMatch(/const GRIS_DE_GOOGLE = '#5E5E5E';/);
    expect(credito).toMatch(/fontFamily: Platform\.OS === 'android' \? 'Roboto' : undefined,\s*fontWeight: '400',\s*fontSize: 12,\s*color: GRIS_DE_GOOGLE,/);
    const suyo = readFileSync(join(SRC, '../../cocina/src/ui/Buscador.tsx'), 'utf8');
    expect(suyo).toMatch(/const GRIS_DE_GOOGLE = '#5E5E5E';/);
    expect(suyo).toMatch(/fontSize: 12,/);
  });
});

describe('where it goes — the three places the ruling names, and nowhere else', () => {
  it('drawn by exactly the list, a kitchen’s page and a dish’s kitchen row', () => {
    const users = sources()
      .filter((path) => /<CreditoDeGoogle \/>/.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(SRC.length + 1))
      .sort();
    expect(users).toEqual(['app/(vecino)/(tabs)/index.tsx', 'ui/FilaCocina.tsx', 'ui/PaginaDeCocina.tsx']);
  });

  it('at the foot of the list, while it shows a card — the list at full height hides the map', () => {
    expect(code('app/(vecino)/(tabs)/index.tsx')).toMatch(
      /ListFooterComponent=\{\s*visibles > 0 \? \(\s*<View style=\{\{ alignItems: 'flex-end' \}\}>\s*<CreditoDeGoogle \/>\s*<\/View>\s*\) : null\s*\}/,
    );
  });

  it('under the distance on a kitchen’s page, and only with one', () => {
    expect(code('ui/PaginaDeCocina.tsx')).toMatch(
      /\{distancia !== null && \(\s*<Text[^>]*>\{distancia\}<\/Text>\s*\)\}\s*\{distancia !== null && <CreditoDeGoogle \/>\}/,
    );
  });

  it('under the distance on a dish’s page — its kitchen’s row, *350 m · ★ 4.8* — and only with one', () => {
    expect(code('ui/FilaCocina.tsx')).toMatch(
      /\{debajo !== null && <Text[^>]*>\{debajo\}<\/Text>\}\s*\{distancia !== null && <CreditoDeGoogle \/>\}/,
    );
    expect(code('ui/PaginaDePlatillo.tsx')).toMatch(/<FilaCocina cocina=\{cocina\} distancia=\{distancia\} onPress=\{onCocina\} \/>/);
  });

  it('never on the map itself, whose own logo stays in sight above the list', () => {
    expect(code('ui/MapaDeCocinas.tsx')).not.toMatch(/CreditoDeGoogle|creditoGoogle/);
  });
});

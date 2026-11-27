import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ESQUINA } from '@/theme/density';
import { FAMILIA_FRASE, letraFrase } from '@/theme/frase';
import { cartelHtml } from '@/lib/cartel';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// A CORNER PER ROLE, AND SHEETS ON THE COUNTER — plan task `11.7-ii`, direction A · *Mostrador* (his
// yes at `11.5-ii`, 2026-11-26, as `11.6` built it in Wera; the design system's *Esquinas*, *Hoja*,
// *Chip* and *Pestanas*). Every corner in `src/` names its role — `ESQUINA`, Wera's block code for
// code — or is a circle, half its own side; no pills. A white sheet on the counter has no plain
// `linea` edge (its edge on the grey does the separating), the headers have no line under them, the
// tab bar is a white sheet with a `linea` top edge, and a kitchen's page draws her phrase in her
// hand (Mansalva, `brand/letras/`'s file) and her dishes on a white sheet.
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: it reads source as text. That a corner is the right role for what
// it draws, and that a sheet reads on the counter, is the screens' — the session's emulator and
// Simulator shots and his look are that evidence.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'cocina/src');
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const bytes = (path: string) => createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex');
const fold = (text: string) => text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();

function sources(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}
const files = sources().map((path) => ({ name: path.slice(SRC.length + 1), text: code(path.slice(SRC.length + 1)) }));

/** `export const ESQUINA = { … } as const;` out of a file. */
function bloque(text: string): string {
  const start = text.indexOf('export const ESQUINA = {');
  if (start < 0) throw new Error('no ESQUINA block');
  return text.slice(start, text.indexOf('} as const;', start) + '} as const;'.length);
}

/** Every corner a style sets — `borderRadius`, one corner's radius, Apple's button's `cornerRadius` — with its object. */
function esquinas(): { file: string; value: string; objeto: string }[] {
  return files.flatMap(({ name, text }) =>
    [...text.matchAll(/border(?:Top|Bottom)?(?:Left|Right)?Radius:\s*([^,}\n]+?)\s*(?=[,}\n])|cornerRadius=\{([^}]+)\}/g)].map((m) => ({
      file: name,
      value: (m[1] ?? m[2]).trim(),
      objeto: objetoEn(text, m.index ?? 0),
    })),
  );
}

/** A circle written as a number: its own object's width and height are both twice it. */
function esCirculo(value: string, objeto: string): boolean {
  if (!/^\d+(\.\d+)?$/.test(value)) return false;
  const lado = Number(value) * 2;
  const ancho = /\bwidth: (\d+(?:\.\d+)?)\b/.exec(objeto);
  const alto = /\bheight: (\d+(?:\.\d+)?)\b/.exec(objeto);
  return ancho !== null && alto !== null && Number(ancho[1]) === lado && Number(alto[1]) === lado;
}

const ROL = /^ESQUINA\.(hoja|boton|campo|chip|etiqueta|boleto|marca)$/;
/** A circle: half its own side — `size / 2`, `(SIZE.tapTarget - 8) / 2`. */
const CIRCULO = /^(\([^()]+\)|[A-Za-z_.]+)\s*\/\s*2$/;

/** Corners that are neither: each a drawing, not paper. */
const DIBUJOS: Readonly<Record<string, string>> = {
  // The opening's square — the app's own icon, drawn as Wera's `(auth)/hola.tsx` draws its own.
  'ui/Apertura.tsx SQUARE_SIDE * SQUARE_CORNER': 'the opening',
};

/** The object literal around a position: from its unmatched `{` to the `}` that closes it. */
function objetoEn(text: string, at: number): string {
  let depth = 0;
  let start = at;
  for (; start > 0; start -= 1) {
    const c = text[start];
    if (c === '}') depth += 1;
    if (c === '{') {
      if (depth === 0) break;
      depth -= 1;
    }
  }
  depth = 0;
  let end = at;
  for (; end < text.length; end += 1) {
    const c = text[end];
    if (c === '{') depth += 1;
    if (c === '}') {
      if (depth === 0) break;
      depth -= 1;
    }
  }
  return text.slice(start, end + 1);
}

/** Sheets that keep a `linea` edge on purpose — each says why. */
const CON_BORDE: Readonly<Record<string, string>> = {
  // A map's frame: the grey placeholder or the map itself needs its edge on the counter.
  'ui/MapaFijo.tsx': 'the map’s frame',
  // Over the map: a label and her search's suggestions float on Google's tiles, not on the counter.
  'ui/MapaPunto.tsx': 'over the map',
  'ui/Buscador.tsx': 'over the map',
  // A dish's line being written: the counter's grey box inside her form, edged as a field is.
  'ui/Renglon.tsx': 'a box she fills',
  // A photo's empty slot, her cover or her logo: edged as a field is, until she fills it.
  'ui/CampoFoto.tsx': 'a photo she adds',
};

describe('a corner per role — Wera’s `ESQUINA`, and no pills (`11.7-ii`)', () => {
  it('`@/theme/density`’s `ESQUINA` is Wera’s block, code for code', () => {
    const wera = readFileSync(join(ROOT, 'app/src/theme/density.ts'), 'utf8');
    expect(fold(bloque(read('theme/density.ts')))).toBe(fold(bloque(wera)));
    expect(ESQUINA).toEqual({ hoja: 3, boton: 3, campo: 3, chip: 3, etiqueta: 2, boleto: 0, marca: 1 });
  });

  it('every corner names its role or is a circle — never a number, a pill, or a size that grows', () => {
    const todas = esquinas();
    expect(todas.length).toBeGreaterThan(140);
    const sueltas = todas.filter(({ file, value, objeto }) => {
      if (ROL.test(value) || CIRCULO.test(value) || esCirculo(value, objeto)) return false;
      // A ternary: each of its two answers is a role or a circle (a logo round, a cover square).
      const t = /^[^?]+\?\s*(.+?)\s*:\s*(.+)$/.exec(value);
      if (t !== null && [t[1], t[2]].every((v) => ROL.test(v) || CIRCULO.test(v))) return false;
      return DIBUJOS[`${file} ${value}`] === undefined;
    });
    expect(sueltas).toEqual([]);
  });

  it('the trap the regex could hide: a pill, a number and a corner that grows are each refused', () => {
    for (const bad of ['999', '14', 'SIZE.space', 'SIZE.tapTarget']) expect(ROL.test(bad) || CIRCULO.test(bad), bad).toBe(false);
    expect(CIRCULO.test('size / 2')).toBe(true);
    expect(CIRCULO.test('(DOT + 8) / 2')).toBe(true);
    expect(esCirculo('18', '{ width: 36, height: 36, borderRadius: 18 }')).toBe(true);
    expect(esCirculo('14', '{ width: 46, height: 28, borderRadius: 14 }')).toBe(false);
    expect(esCirculo('18', '{ padding: 12, borderRadius: 18 }')).toBe(false);
  });

  it('every exception is still where it was — none left behind once its drawing moves', () => {
    const todas = new Set(esquinas().map(({ file, value }) => `${file} ${value}`));
    for (const key of Object.keys(DIBUJOS)) expect(todas.has(key), key).toBe(true);
  });
});

describe('sheets on the counter — no plain edge, no shadow; the headers and the tab bar (`11.7-ii`)', () => {
  it('a sheet (`ESQUINA.hoja`) with a plain `linea` edge is one of the few that say why', () => {
    const conBorde = files.flatMap(({ name, text }) =>
      [...text.matchAll(/ESQUINA\.hoja/g)]
        .map((m) => objetoEn(text, m.index ?? 0))
        .filter((o) => /borderColor: PALETTE\.linea\b/.test(o) && /borderWidth: (?!0\b)[\d.]+/.test(o) && !/borderStyle: 'dashed'/.test(o))
        .map(() => name),
    );
    expect([...new Set(conBorde)].sort()).toEqual(Object.keys(CON_BORDE).sort());
  });

  it('the headers have no line under them', () => {
    for (const path of ['ui/Banda.tsx']) expect(code(path), path).not.toMatch(/borderBottomWidth/);
  });

  it('the tab bar is a white sheet with a `linea` top edge, and the tab in use wears no pill', () => {
    const bar = code('ui/Pestanas.tsx');
    expect(bar).toMatch(/backgroundColor: PALETTE\.superficie,\s*borderTopWidth: 1,\s*borderTopColor: PALETTE\.linea,/);
    expect(bar).not.toMatch(/accionSuave/);
  });

});

describe('her phrase in her hand — Mansalva on her page (`11.7-ii`, `11.5-ii`’s decision (c))', () => {
  it('the font and its licence are `brand/letras/`’s files, byte for byte', () => {
    for (const file of ['Mansalva-Regular.ttf', 'OFL-Mansalva.txt']) {
      expect(bytes(`cocina/src/marca/frase/${file}`), file).toBe(bytes(`brand/letras/${file}`));
    }
    expect(readdirSync(join(SRC, 'marca/frase')).sort()).toEqual(['Mansalva-Regular.ttf', 'OFL-Mansalva.txt']);
  });

  it('one family, one weight, with its line — the design system’s 20/26', () => {
    expect(FAMILIA_FRASE).toBe('Mansalva-Regular');
    expect(letraFrase()).toEqual({ fontFamily: 'Mansalva-Regular', includeFontPadding: false, fontSize: 20, lineHeight: 26 });
    expect(code('marca/fuenteDeFrase.ts')).toMatch(/\[FAMILIA_FRASE\]: require\('@\/marca\/frase\/Mansalva-Regular\.ttf'\)/);
    for (const file of files) expect(file.text, file.name).not.toMatch(/\.\.\.letraFrase\(\)[^}]*fontWeight/);
  });

  it('`@/theme/frase` and `@/marca/fuenteDeFrase` are one file in both siblings', () => {
    for (const path of ['theme/frase.ts', 'marca/fuenteDeFrase.ts']) {
      expect(fold(read(path)), path).toBe(fold(readFileSync(join(ROOT, 'itacate/src', path), 'utf8')));
    }
  });

  it('her page draws her phrase in it, and her day’s dishes and what she usually offers on white sheets', () => {
    const pagina = code('vecinos/ui/PaginaDeCocina.tsx');
    expect(pagina).toMatch(/<Text style=\{\{ \.\.\.letraFrase\(\), color: PALETTE\.tinta \}\}>\{cocina\.page\.sentence\}<\/Text>/);
    expect(pagina).toMatch(/const HOJA = \{ marginTop: SIZE\.rowGap, paddingHorizontal: SIZE\.space, borderRadius: ESQUINA\.hoja, backgroundColor: PALETTE\.superficie \} as const;/);
    expect(pagina.match(/<View style=\{HOJA\}>/g)?.length).toBe(2);
  });

  it('and so does the head she previews as she writes it (`@/ui/Portada`, *Así te ven tus vecinos*)', () => {
    expect(code('ui/Portada.tsx')).toMatch(/\{frase !== null && <Text style=\{\{ \.\.\.letraFrase\(\), color: PALETTE\.tinta \}\}>\{frase\}<\/Text>\}/);
  });
});

describe('the counter poster’s two inks are the palette’s (`11.7-ii`)', () => {
  it('its words in `tinta` and `tintaApagada` — B’s two inks gone, nothing written as a hex but the QR’s', () => {
    const html = cartelHtml({ id: 'k', nombre: 'Fonda Doña Mari', iniciales: 'DM', color: '#1C6B4B', logo: null, direccion: 'Sabino 12', tarjeta: null });
    expect(html).toContain(`color: ${PALETTE.tinta}; }`);
    expect(html).toContain(`.dir { font-size: 5mm; color: ${PALETTE.tintaApagada}; }`);
    expect(html).not.toMatch(/#201D16|#6F675A/i);
    expect(code('lib/cartel.ts')).not.toMatch(/color: #[0-9A-Fa-f]{6}/);
  });
});

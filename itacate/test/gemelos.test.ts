import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as fotos from '@/api/fotos';
import { DIBUJOS, kitchenInitials } from '@/api/pagina';
import { formatMXN } from '@/format/mxn';
import { clockOf, dayOf, daysFrom, momentOf, slotOf } from '@/lib/ventana';
import { ZONA_DE_BUSQUEDA } from '@/lib/zona';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import * as fotosDeCocina from '../../cocina/src/api/fotos';
import * as ventanaDeCocina from '../../cocina/src/lib/ventana';
import { ES as COCINA } from '../../cocina/src/strings';
import { HUES as HUES_DE_COCINA } from '../../cocina/src/theme/colores';
import { formatMXN as weraFormatMXN } from '../../app/src/format/mxn';

// ============================================================================
// EVERY COPY OF WERA COCINA'S, HELD TO ITS FILE. Plan task `10.5-iv-a-i`.
//
// ⚠️ ONE CLAIM, TWO APPS: what a fonda sees in *Tu página en Itacate* is what a
// neighbour sees here — her colour, her trade's drawing, her initials, her photos'
// names, her prices, her window's words, the zone. Each app's `@/` is its own
// `src/`, so Itacate cannot import Wera Cocina's modules; it copies them, each copy
// names its twin, and this file holds every copy to the TWIN'S FILE, never to a
// second spelling written here:
//   - where Wera Cocina's file loads under this app's `@/` (no import, or only one
//     this app also has), both run over the same inputs;
//   - where it cannot — `cocina/src/api/pagina.ts` imports what Itacate does not
//     carry, `cocina/src/lib/google.ts` half of Wera Cocina — the CODE of each
//     block is compared, comments and spacing aside;
//   - the nine drawings, by their bytes.
// A fix to one is a fix to both, in one PR — or this file is red.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const itacate = (path: string) => readFileSync(join(ROOT, 'itacate/src', path), 'utf8');
const cocina = (path: string) => readFileSync(join(ROOT, 'cocina/src', path), 'utf8');

/**
 * A block of code — from the line that starts it to its closing line at the margin
 * (`}`, `]`, `)`), or that one line when it ends the statement — with comments and
 * spacing folded.
 */
function bloque(text: string, inicio: string): string {
  const lines = text.split('\n');
  const first = lines.findIndex((line) => line.startsWith(inicio));
  if (first < 0) throw new Error(`no line starts with: ${inicio}`);
  const taken = [lines[first]];
  if (lines[first].trimEnd().endsWith(';')) return fold(taken.join('\n'));
  for (let i = first + 1; i < lines.length; i += 1) {
    taken.push(lines[i]);
    if (/^[}\])]/.test(lines[i])) break;
  }
  return fold(taken.join('\n'));
}
/** ⚠️ A comment is `//` after a space or at a line's start — never the one inside `https://`. */
const fold = (code: string) => code.replace(/(^|\s)\/\/.*$/gm, '$1').replace(/\s+/g, ' ').trim();

describe('the page’s defaults — `cocina/src/api/pagina.ts`, block by block', () => {
  const ours = itacate('api/pagina.ts');
  const theirs = cocina('api/pagina.ts');
  const blocks = [
    'export interface PageFields {',
    'export const COLORS =',
    'export type ColorCode =',
    'export function isColor(',
    'export interface Page {',
    'export const EMPTY_PAGE:',
    'function text(',
    'export function toPage(',
    'export const DIBUJOS =',
    'export type Dibujo =',
    'export interface Defaults {',
    'export const POR_GIRO:',
    'export const SIN_GIRO:',
    'export function defaultsFor(',
    'export function colorOf(',
    'const TRADE_WORDS:',
    'export function kitchenInitials(',
  ];
  for (const inicio of blocks) {
    it(inicio, () => {
      expect(bloque(ours, inicio)).toBe(bloque(theirs, inicio));
    });
  }

  it('and the initials it draws are the drawing’s', () => {
    expect(kitchenInitials('Fonda Doña Mari')).toBe('DM');
    expect(kitchenInitials('Panadería La Espiga')).toBe('LE');
  });
});

describe('the six hues — `cocina/src/theme/colores.ts`', () => {
  it('are Wera Cocina’s, one for one', () => {
    expect(HUES).toEqual(HUES_DE_COCINA);
  });
});

describe('the photos’ names — `cocina/src/api/fotos.ts`, which loads here and runs beside ours', () => {
  const KITCHEN = 'b1d0c0de-0000-4000-8000-000000000001';
  const PATH = `${KITCHEN}/c0ffee00-0000-4000-8000-0000000000aa`;

  it('the bucket, the two files, the sizes and the shapes', () => {
    expect(fotos.PHOTO_BUCKET).toBe(fotosDeCocina.PHOTO_BUCKET);
    expect(fotos.LARGE_FILE).toBe(fotosDeCocina.LARGE_FILE);
    expect(fotos.SMALL_FILE).toBe(fotosDeCocina.SMALL_FILE);
    expect(fotos.PHOTO_SIDES).toEqual(fotosDeCocina.PHOTO_SIDES);
    expect(fotos.FILE_OF).toEqual(fotosDeCocina.FILE_OF);
    expect(fotos.FORMAS).toEqual(fotosDeCocina.FORMAS);
    for (const forma of ['portada', 'logo', 'platillo'] as const) expect(fotos.ratioOf(forma)).toBe(fotosDeCocina.ratioOf(forma));
  });

  it('where a file is, and what opens it', () => {
    for (const size of ['grande', 'chica'] as const) {
      expect(fotos.photoFile(PATH, size)).toBe(fotosDeCocina.photoFile(PATH, size));
      expect(fotos.photoUrl('https://x.supabase.co/', PATH, size)).toBe(fotosDeCocina.photoUrl('https://x.supabase.co/', PATH, size));
    }
    expect(fotos.photoHeaders('t', 'k')).toEqual(fotosDeCocina.photoHeaders('t', 'k'));
  });

  it('`0076`’s rule for a picture in her own folder — and nothing else is asked for', () => {
    for (const path of [PATH, PATH.toUpperCase(), `${KITCHEN}/no-es-un-uuid`, `otra/${PATH}`, `${KITCHEN.replace('1', '2')}/c0ffee00-0000-4000-8000-0000000000aa`]) {
      expect(fotos.isPicturePath(path, KITCHEN), path).toBe(fotosDeCocina.isPicturePath(path, KITCHEN));
    }
    expect(fotos.isPicturePath(PATH, KITCHEN)).toBe(true);
  });
});

describe('the nine drawings — Wera Cocina’s PNGs, by their bytes', () => {
  const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const ours = join(ROOT, 'itacate/src/marca/giros');
  const theirs = join(ROOT, 'cocina/src/marca/giros');

  it('one file per drawing, the same files as Wera Cocina’s', () => {
    expect(readdirSync(ours).sort()).toEqual(DIBUJOS.map((d) => `${d}.png`).sort());
    expect(readdirSync(ours).sort()).toEqual(readdirSync(theirs).sort());
  });

  it('each one byte for byte — a re-drawing there is copied here', () => {
    for (const dibujo of DIBUJOS) expect(sha(join(ours, `${dibujo}.png`)), dibujo).toBe(sha(join(theirs, `${dibujo}.png`)));
  });

  it('each one in the bundle, under its own name', () => {
    const table = itacate('theme/dibujos.ts');
    for (const dibujo of DIBUJOS) expect(table).toContain(`${dibujo}: require('@/marca/giros/${dibujo}.png') as ImageSourcePropType,`);
  });

  it('drawn by components whose code is Wera Cocina’s', () => {
    for (const [file, inicio] of [['ui/Dibujo.tsx', 'export function Dibujo('], ['ui/Dibujo.tsx', 'function Portada('], ['ui/Dibujo.tsx', 'const PATRON:'], ['ui/Iniciales.tsx', 'export function Iniciales(']] as const) {
      expect(bloque(itacate(file), inicio), `${file} ${inicio}`).toBe(bloque(cocina(file), inicio));
    }
  });
});

describe('a price — Wera’s `formatMXN`, through Wera Cocina’s copy', () => {
  it('reads as it does in Wera, amount for amount', () => {
    for (const centavos of [0, 1, 50, 100, 4500, 6000, 6550, 12_000, 99_999, 123_450, 10_000_000, -6550]) {
      expect(formatMXN(centavos), String(centavos)).toBe(weraFormatMXN(centavos));
    }
  });

  it('and its code below the header is Wera Cocina’s', () => {
    const below = (text: string) => text.slice(text.indexOf('const SHAPE'));
    expect(below(itacate('format/mxn.ts'))).toBe(below(cocina('format/mxn.ts')));
  });
});

describe('a window’s words — `cocina/src/lib/ventana.ts`, run beside ours', () => {
  const ZONE = 'America/Mexico_City';
  let before: string | undefined;
  beforeAll(() => {
    before = process.env.TZ;
    process.env.TZ = ZONE;
  });
  afterAll(() => {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  });

  it('the same day, clock, moment and window for the same instants', () => {
    const now = new Date(2026, 10, 5, 16, 0);
    const moments = [
      new Date(2026, 10, 5, 17, 30),
      new Date(2026, 10, 6, 9, 45),
      new Date(2026, 10, 4, 23, 0),
      new Date(2026, 10, 9, 13, 15),
    ];
    for (const at of moments) {
      expect(daysFrom(now, at)).toBe(ventanaDeCocina.daysFrom(now, at));
      expect(clockOf(at)).toBe(ventanaDeCocina.clockOf(at));
      expect(dayOf(at, now)).toBe(ventanaDeCocina.dayOf(at, now));
      expect(momentOf(at, now)).toBe(ventanaDeCocina.momentOf(at, now));
    }
    const windows = [
      { start: new Date(2026, 10, 5, 17, 30), end: new Date(2026, 10, 5, 18, 15) },
      { start: new Date(2026, 10, 5, 22, 0), end: new Date(2026, 10, 6, 1, 0) },
    ];
    for (const v of windows) expect(slotOf(v, now)).toBe(ventanaDeCocina.slotOf(v, now));
    expect(slotOf(windows[1], now)).toBe('Hoy · 22:00 a mañana 1:00');
  });

  it('and its words are Wera Cocina’s, word for word', () => {
    expect(ES.fechas.hoy).toBe(COCINA.fechas.hoy);
    expect(ES.fechas.manana).toBe(COCINA.fechas.manana);
    expect(ES.fechas.ayer).toBe(COCINA.fechas.ayer);
    expect([...ES.fechas.dias]).toEqual([...COCINA.fechas.dias]);
    expect(ES.fechas.dia('Lun', 27)).toBe(COCINA.fechas.dia('Lun', 27));
    expect(ES.fechas.momento('Hoy', '17:00')).toBe(COCINA.fechas.momento('Hoy', '17:00'));
    expect(ES.fechas.horario('Hoy', '17:00', '18:00')).toBe(COCINA.fechas.horario('Hoy', '17:00', '18:00'));
  });
});

describe('Google — `cocina/src/lib/google.ts`, the zone and the rules Itacate shares', () => {
  const ours = itacate('lib/google.ts');
  const theirs = cocina('lib/google.ts');

  it('the zone is Wera Cocina’s search zone, character for character', () => {
    const zona = /export const ZONA_DE_BUSQUEDA = '([^']+)';/.exec(theirs)?.[1];
    expect(ZONA_DE_BUSQUEDA).toBe(zona);
    expect(bloque(itacate('lib/zona.ts'), 'export const RECTANGULO =')).toBe(bloque(theirs, 'export const RECTANGULO ='));
  });

  it('the key’s shape, the headers, Geocoding’s question and its bounds are Wera Cocina’s code — with this app’s id and signature', () => {
    for (const inicio of ['export function claveDe(', 'export function cabecerasDeLaApp(', 'export function urlDeGeocodificar(', 'const BOUNDS =', 'export const GEOCODING_URL =', 'export const REGION =', 'export const LIMITE_MS =']) {
      expect(bloque(ours, inicio), inicio).toBe(bloque(theirs, inicio));
    }
    expect(bloque(ours, 'export const ID_DE_LA_APP =')).not.toBe(bloque(theirs, 'export const ID_DE_LA_APP ='));
    expect(bloque(ours, 'export const FIRMA_ANDROID =')).not.toBe(bloque(theirs, 'export const FIRMA_ANDROID ='));
  });
});

describe('the tags — `cocina/src/api/listing.ts`', () => {
  it('the same six codes, in the same order', () => {
    expect(bloque(itacate('api/cocinas.ts'), 'export const TAGS =')).toBe(bloque(cocina('api/listing.ts'), 'export const TAGS ='));
  });
});

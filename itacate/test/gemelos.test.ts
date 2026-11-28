import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as fotos from '@/api/fotos';
import * as codigo from '@/lib/codigo';
import * as escaner from '@/lib/escaner';
import * as qr from '@/lib/qr';
import { DIBUJOS, kitchenInitials } from '@/api/pagina';
import { formatMXN } from '@/format/mxn';
import { clockOf, dayOf, daysFrom, momentOf, slotOf } from '@/lib/ventana';
import { ZONA_DE_BUSQUEDA } from '@/lib/zona';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { PALETTE } from '@/theme/palette';
import * as fotosDeCocina from '../../cocina/src/api/fotos';
import * as codigoDeCocina from '../../cocina/src/lib/codigo';
import * as escanerDeCocina from '../../cocina/src/lib/escaner';
import * as qrDeCocina from '../../cocina/src/lib/qr';
import * as ventanaDeCocina from '../../cocina/src/lib/ventana';
import { ES as COCINA } from '../../cocina/src/strings';
import { HUES as HUES_DE_COCINA } from '../../cocina/src/theme/colores';
import { PALETTE as PALETA_DE_COCINA } from '../../cocina/src/theme/palette';
import { formatMXN as weraFormatMXN } from '../../app/src/format/mxn';

// ============================================================================
// EVERY COPY OF WERA COCINA'S, HELD TO ITS FILE. Plan tasks `10.5-iv-a-i` and
// `10.5-iv-a-ii` (her link's rule, her trade's name, the tags' words).
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
    // `10.5-iv-a-ii`: the rule *Ver en Google Maps* asks before it opens her link —
    // the one Wera Cocina asks of what she pastes, which is the database's.
    'export const LINK_MAX =',
    'const LINK_SHAPE =',
    'export function mapsLinkOk(',
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

describe('the nine trades’ drawings — Wera Cocina’s pictures, by their bytes (`11.10-ii`: `brand/dibujos/`’s line)', () => {
  const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const ours = join(ROOT, 'itacate/src/marca/dibujos');
  const theirs = join(ROOT, 'cocina/src/marca/dibujos');
  const DENSIDADES = ['', '@2x', '@3x'];

  it('each one byte for byte, at every density — a re-drawing there is copied here', () => {
    for (const dibujo of DIBUJOS) {
      for (const s of DENSIDADES) expect(sha(join(ours, `${dibujo}${s}.png`)), `${dibujo}${s}`).toBe(sha(join(theirs, `${dibujo}${s}.png`)));
    }
  });

  it('each one in the bundle, under its own name, as Wera Cocina’s table says it', () => {
    expect(bloque(itacate('theme/dibujos.ts'), 'export const DIBUJO:')).toBe(bloque(cocina('theme/dibujos.ts'), 'export const DIBUJO:'));
    for (const dibujo of DIBUJOS) expect(itacate('theme/dibujos.ts')).toContain(`${dibujo}: require('@/marca/dibujos/${dibujo}.png') as ImageSourcePropType,`);
  });

  it('drawn by components whose code is Wera Cocina’s', () => {
    for (const [file, inicio] of [
      ['ui/Dibujo.tsx', 'const ALTO ='],
      ['ui/Dibujo.tsx', 'export function Dibujo('],
      ['ui/Dibujo.tsx', 'export const LADO_VACIO ='],
      ['ui/Dibujo.tsx', 'export function DibujoVacio('],
      ['ui/Iniciales.tsx', 'export function Iniciales('],
    ] as const) {
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

  it('and, on a dish’s page, the same six words she ticked (`10.5-iv-a-ii`)', () => {
    expect(ES.platillo.etiqueta).toEqual(COCINA.publicar.etiqueta);
  });
});

describe('her page’s words that Wera Cocina showed her first — `cocina/src/strings.ts` (`10.5-iv-a-ii`)', () => {
  it('*Ver en Google Maps ›*, as her preview says it', () => {
    expect(ES.pagina.verEnMaps).toBe(COCINA.pagina.verEnMaps);
  });
});

describe('her trade’s name — `cocina/src/api/kitchen.ts`, block by block (`10.5-iv-a-ii`)', () => {
  const ours = itacate('api/cocinas.ts');
  const theirs = cocina('api/kitchen.ts');
  for (const inicio of ['export const KITCHEN_GIROS =', 'export interface Giro {', 'export function girosFrom(', 'export function giroLabel(']) {
    it(inicio, () => {
      expect(bloque(ours, inicio)).toBe(bloque(theirs, inicio));
    });
  }
});

describe('the loyalty card’s codes — `cocina/src/lib/codigo.ts`, code for code (`10.9e-i`)', () => {
  // ⚠️ The kitchen's phone shows a code and her phone scans it, and the other way round: one
  // algorithm, or no stamp is ever given. Its code, comments aside, and both run over the same inputs.
  const sinComentarios = (text: string) =>
    fold(text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));

  it('the same code, line for line', () => {
    expect(sinComentarios(itacate('lib/codigo.ts'))).toBe(sinComentarios(cocina('lib/codigo.ts')));
  });

  it('the same six digits, minute after minute, for the same secret', () => {
    const secret = codigo.secretoDe('00112233445566778899aabbccddeeff00112233') as Uint8Array;
    const start = Date.parse('2026-11-19T17:00:00Z');
    for (let minute = 0; minute < 120; minute += 1) {
      const ms = start + minute * 60_000;
      expect(codigo.codigoEn(secret, ms)).toBe(codigoDeCocina.codigoEn(secret, ms));
    }
    const key = '0085aaaa-0000-4000-8000-000000000001';
    expect(codigo.leerQR(codigoDeCocina.textoDelQR('c', key, '482190'))).toEqual({ lado: 'c', key, code: '482190' });
  });
});

describe('the loyalty card’s scanner and QR — Wera Cocina’s files, code for code (`10.9e-iii`)', () => {
  // ⚠️ One camera box and one QR drawing across the two apps: her *Escanear* is the kitchen's *Escanear a tu
  // cliente*, and her *Mi código* draws its grid as *Sellar* does. Each copy names its twin in its header.
  const sinComentarios = (text: string) =>
    fold(text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));

  for (const file of ['lib/escaner.ts', 'ui/Escaner.tsx', 'lib/qr.ts', 'ui/CodigoQR.tsx']) {
    it(`${file} is cocina/src/${file}`, () => {
      expect(sinComentarios(itacate(file))).toBe(sinComentarios(cocina(file)));
      expect(itacate(file)).toContain(`cocina/src/${file}`);
    });
  }

  it('the same box for the same permission', () => {
    const permisos = [
      null,
      { granted: true, status: 'granted', canAskAgain: true },
      { granted: false, status: 'undetermined', canAskAgain: true },
      { granted: false, status: 'undetermined', canAskAgain: false },
      { granted: false, status: 'denied', canAskAgain: true },
      { granted: false, status: 'denied', canAskAgain: false },
    ] as const;
    for (const permiso of permisos) expect(escaner.cajaDelEscaner(permiso)).toBe(escanerDeCocina.cajaDelEscaner(permiso));
  });

  it('the same grid for the same code', () => {
    const texto = 'WERA1:v:0085aaaa-0000-4000-8000-000000000001:482190:0085aaaa-0000-4000-8000-000000000009';
    expect(qr.tramosQR(qr.matrizQR(texto))).toEqual(qrDeCocina.tramosQR(qrDeCocina.matrizQR(texto)));
  });
});

describe('the card’s conditions — what a fonda set up is what her neighbour accepts (G12, `10.9e-iii`)', () => {
  const ours = itacate('lib/tarjeta.ts');
  const theirs = cocina('lib/tarjeta.ts');
  for (const inicio of ['export function enFrase(', 'export function enOracion(', 'export function condicionesDe(', 'export function direccionCorta(', 'export function diaDe(', 'export function diaDeTexto(']) {
    it(inicio, () => {
      expect(bloque(ours, inicio)).toBe(bloque(theirs, inicio));
    });
  }

  it('`10.9k`: how long her stamps wait, said the same way — `siPasan`, code for code', () => {
    expect(bloque(itacate('strings.ts'), 'function siPasan(')).toBe(bloque(cocina('strings.ts'), 'function siPasan('));
  });

  it('the words, value for value', () => {
    expect(ES.condiciones.junta(8, 'Fonda Doña Mari', 'una comida corrida')).toBe(COCINA.condiciones.junta(8, 'Fonda Doña Mari', 'una comida corrida'));
    expect(ES.condiciones.uno).toBe(COCINA.condiciones.uno);
    // `10.9k`: the chips' weeks and months, *Otro…*'s days, and the days `0085` let in.
    for (const dias of [14, 15, 21, 30, 45, 60, 90, 120, 365]) {
      expect(ES.condiciones.seBorran(dias), String(dias)).toBe(COCINA.condiciones.seBorran(dias));
    }
    expect(ES.condiciones.noSeBorran).toBe(COCINA.condiciones.noSeBorran);
    expect(ES.condiciones.promesa('Fonda Doña Mari', 'Sabino 52, Santa María la Ribera')).toBe(COCINA.condiciones.promesa('Fonda Doña Mari', 'Sabino 52, Santa María la Ribera'));
    expect(ES.condiciones.promesa('Fonda Doña Mari', null)).toBe(COCINA.condiciones.promesa('Fonda Doña Mari', null));
    expect([...ES.fechas.meses]).toEqual([...COCINA.fechas.meses]);
    expect(ES.fechas.delMes(18, 'diciembre')).toBe(COCINA.fechas.delMes(18, 'diciembre'));
  });

  it('her card’s words where both apps draw it: its name, the count, what it gives', () => {
    expect(ES.tarjeta.nombre).toBe(COCINA.tarjeta.nombre);
    expect(ES.tarjeta.cuenta(3, 8)).toBe(COCINA.tarjeta.cuenta(3, 8));
    expect(ES.tarjeta.igual(8, 'una comida corrida')).toBe(COCINA.tarjeta.igual(8, 'una comida corrida'));
  });
});

describe('a promotion’s band and mark — Wera Cocina’s, what a fonda was shown (`10.9g-iii`)', () => {
  // ⚠️ *Así la verán en tu página* (`10.9g-ii`) is what her neighbour sees: the band's component code for code, the
  // words and kinds block for block, every word value for value, and the band's tint.
  const sinComentarios = (text: string) =>
    fold(text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));

  it('ui/BandaPromocion.tsx is cocina/src/ui/BandaPromocion.tsx', () => {
    expect(sinComentarios(itacate('ui/BandaPromocion.tsx'))).toBe(sinComentarios(cocina('ui/BandaPromocion.tsx')));
    expect(itacate('ui/BandaPromocion.tsx')).toContain('cocina/src/ui/BandaPromocion.tsx');
  });

  const ours = itacate('lib/promociones.ts');
  const theirs = cocina('lib/promociones.ts');
  it('lib/promociones.ts names its twin', () => {
    expect(ours).toContain('cocina/src/lib/promociones.ts');
  });
  for (const inicio of [
    'export const ICONO_DE_TIPO:',
    'export function delMes(',
    'export function sonTodos(',
    'export function diasTexto(',
    'export function marcaDe(',
    'export function enUnaLinea(',
    'export interface Banda {',
    'export function bandaDe(',
  ]) {
    it(`lib/promociones.ts ${inicio}`, () => {
      expect(bloque(ours, inicio)).toBe(bloque(theirs, inicio));
    });
  }

  for (const inicio of ['export const TIPOS =', 'export type Tipo =', 'export const DIAS =', 'export type Dia =']) {
    it(`api/cocinas.ts ${inicio} is cocina/src/api/promociones.ts’`, () => {
      expect(bloque(itacate('api/cocinas.ts'), inicio)).toBe(bloque(cocina('api/promociones.ts'), inicio));
    });
  }

  it('the words, value for value', () => {
    expect(ES.promociones.marcas).toEqual(COCINA.promociones.marcas);
    expect(ES.promociones.ejemplos).toEqual(COCINA.promociones.ejemplos);
    expect(ES.promociones.todosLosDias).toBe(COCINA.promociones.todosLosDias);
    expect([...ES.promociones.losDias]).toEqual([...COCINA.promociones.losDias]);
    expect(ES.promociones.los('lunes y jueves')).toBe(COCINA.promociones.los('lunes y jueves'));
    expect(ES.promociones.hastaEl('17 de diciembre')).toBe(COCINA.promociones.hastaEl('17 de diciembre'));
  });

  it('the band’s tint is Wera Cocina’s', () => {
    expect(PALETTE.marcaSuave).toBe(PALETA_DE_COCINA.marcaSuave);
    expect(PALETTE.marca).toBe(PALETA_DE_COCINA.marca);
  });
});

describe('the counter with no signal — Wera Cocina’s signal, words and queue’s rules (`10.9j-ii-a`)', () => {
  // ⚠️ One signal across the two apps' counters: what makes Wera Cocina's *Sin señal* and drain trustworthy (Wera's
  // measurements, through its copy) is what makes hers. The machine itself is held to WERA's file by `test/senal.test.ts`.
  const sinComentarios = (text: string) =>
    fold(text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));

  for (const file of ['lib/connectivityMonitor.ts', 'lib/useSenal.ts']) {
    it(`${file} is cocina/src/${file}`, () => {
      expect(sinComentarios(itacate(file))).toBe(sinComentarios(cocina(file)));
      expect(itacate(file)).toContain(`cocina/src/${file}`);
    });
  }

  it('her queue’s word for why a drain stopped and the codes of an unrenewed sign-in are Wera Cocina’s', () => {
    for (const inicio of ['export type FlushStop =', 'export const CODIGOS_DE_SESION:', 'export interface Drenado {']) {
      expect(bloque(itacate('api/cola.ts'), inicio), inicio).toBe(bloque(cocina('api/cola.ts'), inicio));
    }
    expect(itacate('api/cola.ts')).toContain('cocina/src/api/cola.ts');
  });

  it('*Sin señal. Lo que ves se leyó a las 13:40.* — the family says it one way', () => {
    expect(ES.senal.sinSenal(null, '13:40')).toBe(COCINA.cola.sinSenal(null, '13:40'));
    expect(ES.senal.sinSenal('ayer', '21:40')).toBe(COCINA.cola.sinSenal('ayer', '21:40'));
    expect(ES.senal.sinDatos).toBe(COCINA.cola.sinDatos);
  });
});

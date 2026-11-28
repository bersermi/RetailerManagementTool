import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ES } from '@/strings';
import { FAMILIA_FRASE, letraPremio } from '@/theme/frase';
import { FAMILIA_NUMERO } from '@/theme/letra';

// ============================================================================
// THE COUNTER'S OBJECTS — plan task `11.8-i`, direction A · *Mostrador* (row `11.2`'s objects,
// `brand/mostrador/objetos.json`; his yes at `11.5-ii`, 2026-11-26). `@/ui/Mostrador` draws the
// ticket, the stamps, the tag and the tab's stroke from pictures that are `brand/mostrador/png/`'s
// byte for byte and from measures that are `objetos.json`'s; it is one file in both siblings; and
// each place `11.7-ii` left to `11.8` draws its object.
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: it reads source and bytes. That a notch bites where the ticket
// tears, a stamp reads as pressed and a tag as a tag is the screens' — the session's emulator and
// Simulator shots and his look are that evidence (ADR-035 §2.11).
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const APP = 'itacate';
const OTRA = 'cocina';
const SRC = join(ROOT, APP, 'src');
const leer = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const code = (path: string) => readFileSync(join(SRC, path), 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const sha = (path: string) => createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex');
/** A PNG's size in pixels, from its header. */
function tamano(path: string): [number, number] {
  const png = readFileSync(join(ROOT, path));
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

const objetos = JSON.parse(leer('brand/mostrador/objetos.json'));
/** `@/ui/Mostrador`'s `OBJETOS`, read as the file writes it — the module draws pictures a test cannot load. */
function OBJETOS(): Record<string, unknown> {
  const text = code('ui/Mostrador.tsx');
  const start = text.indexOf('export const OBJETOS = {');
  const body = text.slice(start + 'export const OBJETOS = '.length, text.indexOf('} as const;', start) + 1);
  return Function(`return (${body});`)() as Record<string, unknown>;
}

/** The drawings this app draws, and every density of each. */
const DIBUJOS = ['motas', 'muesca', 'punta-etiqueta', 'sello-vaca', 'trazo-pestana'];
const PNGS = DIBUJOS.flatMap((d) => [`${d}.png`, `${d}@2x.png`, `${d}@3x.png`]).sort();

describe('the pictures are `brand/mostrador/png/`’s, byte for byte (`11.8-i`)', () => {
  it('`@/marca/mostrador/` holds the five drawings at 1×, 2× and 3× — and no paper (his word of 2026-11-26)', () => {
    expect(readdirSync(join(SRC, 'marca/mostrador')).sort()).toEqual(PNGS);
  });

  it('each one the same bytes as its source', () => {
    for (const png of PNGS) expect(sha(`${APP}/src/marca/mostrador/${png}`), png).toBe(sha(`brand/mostrador/png/${png}`));
  });

  it('each one asked for by `@/ui/Mostrador`, at 1× (the phone picks its density)', () => {
    const text = code('ui/Mostrador.tsx');
    for (const d of DIBUJOS) expect(text, d).toContain(`require('@/marca/mostrador/${d}.png')`);
  });
});

describe('`@/ui/Mostrador`’s measures are `objetos.json`’s (`11.8-i`)', () => {
  const o = OBJETOS() as {
    muesca: { ancho: number; alto: number };
    perforacion: { raya: number; hueco: number; grueso: number };
    selloVaca: number;
    palabra: Record<string, number>;
    giros: number[];
    etiqueta: Record<string, number>;
    trazo: { ancho: number; alto: number };
  };

  it('a ticket’s notch is its drawing’s size, and the perforation’s dashes the file’s', () => {
    expect([o.muesca.ancho, o.muesca.alto]).toEqual(tamano('brand/mostrador/png/muesca.png'));
    expect(o.muesca.alto).toBeGreaterThanOrEqual(objetos.boleto.muesca.radio * 2);
    const { raya, hueco, grueso } = objetos.boleto.perforacion;
    expect(o.perforacion).toEqual({ raya, hueco, grueso });
  });

  it('her card’s stamp is the cow’s drawing at its size, and each place turns as the file says', () => {
    expect([o.selloVaca, o.selloVaca]).toEqual(tamano('brand/mostrador/png/sello-vaca.png'));
    expect(o.giros).toEqual(objetos.sello.giros);
  });

  it('a stamp with a word: two rules, their gap, its padding and its turn', () => {
    const p = objetos.sello.palabra;
    expect(o.palabra).toEqual({
      bordeFuera: p.bordeFuera,
      entre: p.entre,
      bordeDentro: p.bordeDentro,
      rellenoVertical: p.rellenoVertical,
      rellenoHorizontal: p.rellenoHorizontal,
      giro: p.giro,
    });
    expect(p.esquina).toBe(3);
    expect(code('ui/Mostrador.tsx')).toMatch(/borderRadius: ESQUINA\.hoja,\s*transform: \[\{ rotate: `\$\{p\.giro\}deg` \}\]/);
  });

  it('a tag: the point half as wide as it is tall, one point under the price', () => {
    const e = objetos.etiqueta;
    expect(o.etiqueta).toEqual({ proporcion: e.punta.proporcion, solape: e.punta.solape, rellenoVertical: e.rellenoVertical, rellenoHorizontal: e.rellenoHorizontal });
    const [ancho, alto] = tamano('brand/mostrador/png/punta-etiqueta.png');
    expect(ancho / alto).toBe(e.punta.proporcion);
  });

  it('the tab’s stroke at Normal’s size — the siblings have no *Letra grande*', () => {
    expect([o.trazo.ancho, o.trazo.alto]).toEqual(objetos.pestana.trazo.normal);
    expect([o.trazo.ancho, o.trazo.alto]).toEqual(tamano('brand/mostrador/png/trazo-pestana.png'));
  });

  it('a stamp’s word is the app’s own — *Entregado*, one of the words `objetos.json` allows', () => {
    expect(objetos.sello.palabra.palabras).toContain('Entregado');
  });
});

describe('one file in both siblings (`11.8-i`)', () => {
  it(`${APP}/src/ui/Mostrador.tsx is ${OTRA}/src/ui/Mostrador.tsx`, () => {
    expect(leer(`${APP}/src/ui/Mostrador.tsx`)).toBe(leer(`${OTRA}/src/ui/Mostrador.tsx`));
  });

  it('and so is this test, but for which app it reads', () => {
    const ours = leer(`${APP}/test/mostrador.test.ts`);
    const theirs = leer(`${OTRA}/test/mostrador.test.ts`);
    const neutro = (t: string) =>
      t
        .slice(t.indexOf('const ROOT ='))
        .replace(/^const APP = .*$/m, '')
        .replace(/^const OTRA = .*$/m, '')
        .replace(/^describe\('where[\s\S]*$/m, '');
    expect(neutro(ours)).toBe(neutro(theirs));
  });
});

describe('a reward won, in her hand (`11.8-i`, the design system’s *Mano*)', () => {
  it('Mansalva at 32 on a line of 38, one weight', () => {
    expect(letraPremio()).toEqual({ fontFamily: FAMILIA_FRASE, includeFontPadding: false, fontSize: 32, lineHeight: 38 });
  });
});

describe('where the neighbours’ app draws them — what `11.7-ii` left to `11.8` (`11.8-i`)', () => {
  it('the tab in use has the marker’s stroke under its word, in the tab’s colour', () => {
    expect(code('ui/Pestanas.tsx')).toMatch(/<Text style=\{\{ fontSize: 12, fontWeight: enUso \? '700' : '500', color \}\}>\{pestana\.label\}<\/Text>\s*<Trazo on=\{enUso\} color=\{PALETTE\.accion\} \/>/);
  });

  it('her apartado is a ticket — *Ya lo tengo* and *¿Cambio de planes?* on its stub, her code in the number’s face', () => {
    const boleto = code('ui/BoletoApartado.tsx');
    expect(boleto).toMatch(/<Boleto\s+arranca=\{arranca\}\s+onArrancado=\{onArrancado\}\s+cuerpo=/);
    expect(boleto.slice(boleto.indexOf('talon={'))).toMatch(/<Deslizar[\s\S]*onListo=\{onYaLoTengo\}[\s\S]*onPress=\{onCambioDePlanes\}/);
    expect(boleto).toMatch(/const CODIGO = \{ fontFamily: FAMILIA_NUMERO, includeFontPadding: false, fontSize: 48, lineHeight: 54, letterSpacing: 8, fontVariant: \['tabular-nums' as const\] \};/);
    expect(boleto).toMatch(/style=\{\{ \.\.\.CODIGO, color: PALETTE\.tinta \}\}/);
    expect(FAMILIA_NUMERO).toBe('ArchivoCondensed-Bold');
  });

  it('her card’s stamps are the Wera cow, each at its place’s turn — the stock glyph gone from it', () => {
    const tarjeta = code('ui/TarjetaDeLealtad.tsx');
    expect(tarjeta).toMatch(/\{lleno && \(\s*<Cae cae=\{nuevos\.cae && i >= \(nuevos\.desde \?\? 0\)\}>\s*<SelloVaca i=\{i\} tinta=\{PALETTE\.superficie\} \/>\s*<\/Cae>\s*\)\}/);
    expect(tarjeta).not.toMatch(/name="cow"/);
  });

  it('a price on a list is a tag; the dish’s own page keeps its large price', () => {
    const precio = code('ui/Precio.tsx');
    expect(precio).toMatch(/\{grande \? \(\s*<Text style=\{\{ fontSize: SIZE\.titleSize[\s\S]*?\) : \(\s*<Etiqueta>/);
  });

  it('*¡Ganaste …!* is set in her hand — Mansalva — and its words are the app’s', () => {
    // ⚠️ `11.10-ii`: white, on the sheet of her colour (`test/dibujos.test.ts`).
    expect(code('app/(vecino)/gano/[cocina].tsx')).toMatch(/<Text accessibilityRole="header" style=\{\{ \.\.\.letraPremio\(\), color: PALETTE\.superficie, textAlign: 'center' \}\}>\s*\{ES\.gano\.titulo\(/);
    expect(ES.gano.titulo('una comida corrida')).toBe('¡Ganaste una comida corrida!');
  });
});

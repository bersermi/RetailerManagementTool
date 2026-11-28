// ============================================================================
// THE COUNTER'S OBJECTS AND MOTIONS IN WERA — plan task `11.9`, direction A ·
// *Mostrador* (row `11.2`'s `brand/mostrador/objetos.json` and `movimiento.json`;
// his yes at `11.5-i`, 2026-11-26). `@/theme/mostrador` carries the numbers the
// stamp (`@/ui/Hecho`), the receipt and the register (Inicio) and the tab's
// stroke (`(tabs)/_layout.tsx`) are drawn and moved by; `@/marca/mostrador/`
// the pictures. This suite holds both to `brand/`: a curve, a millisecond or a
// picture's byte changed on one side alone turns it red.
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE (ADR-035 §2.11): it reads numbers, bytes and
// source text, and reaches no component (`R2`). That the stamp reads as pressed,
// the receipt's line comes out at its top and the register turns units first is
// the screens' — the session's recordings on the emulator and his look.
// ============================================================================

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ES } from '@/strings';
import {
  OBJETOS,
  RECIBO,
  RODILLO,
  SELLO,
  puntosDe,
  retrasoDeRueda,
  tramosDe,
  valoresDe,
} from '@/theme/mostrador';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'app', 'src');
const leer = (path: string) => readFileSync(join(ROOT, path), 'utf8');
/** A source file with its comments stripped, so a sentence about a call is not the call. */
const code = (path: string) =>
  readFileSync(join(SRC, path), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
const sha = (path: string) => createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex');
/** A PNG's size in pixels, from its header. */
function tamano(path: string): [number, number] {
  const png = readFileSync(join(ROOT, path));
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

const objetos = JSON.parse(leer('brand/mostrador/objetos.json'));
const movimiento = JSON.parse(leer('brand/mostrador/movimiento.json'));

/** The drawings Wera draws: the tag's point (`14.2`), the stamp's specks and the tab's stroke (`11.9`). */
const DIBUJOS = ['motas', 'punta-etiqueta', 'trazo-pestana'];
const PNGS = DIBUJOS.flatMap((d) => [`${d}.png`, `${d}@2x.png`, `${d}@3x.png`]).sort();

describe('the pictures are `brand/mostrador/png/`’s, byte for byte (`11.9`)', () => {
  it('`@/marca/mostrador/` holds three drawings at 1×, 2× and 3× — and no paper (his word of 2026-11-26)', () => {
    expect(readdirSync(join(SRC, 'marca/mostrador')).sort()).toEqual(PNGS);
  });

  it('each one the same bytes as its source', () => {
    for (const png of PNGS) expect(sha(`app/src/marca/mostrador/${png}`), png).toBe(sha(`brand/mostrador/png/${png}`));
  });

  it('the specks are the stamp’s and the stroke is the tab bar’s, each asked for at 1× (the phone picks its density)', () => {
    expect(code('ui/Hecho.tsx')).toContain("require('@/marca/mostrador/motas.png')");
    expect(code('app/(tabs)/_layout.tsx')).toContain("require('@/marca/mostrador/trazo-pestana.png')");
  });
});

describe('`@/theme/mostrador`’s measures are `objetos.json`’s (`11.9`)', () => {
  it('a stamp with a word: two rules, their gap, its padding and its turn', () => {
    const p = objetos.sello.palabra;
    expect(OBJETOS.palabra).toEqual({
      bordeFuera: p.bordeFuera,
      entre: p.entre,
      bordeDentro: p.bordeDentro,
      rellenoVertical: p.rellenoVertical,
      rellenoHorizontal: p.rellenoHorizontal,
      giro: p.giro,
    });
  });

  it('every word Wera stamps is one the file allows — *Venta*, *Compra* and *Merma registrada*', () => {
    for (const word of [ES.sell.sold, ES.buy.recorded, ES.waste.recorded]) expect(objetos.sello.palabra.palabras).toContain(word);
  });

  it('the tab’s stroke: its drawing’s size at *Normal*, the file’s larger one at *Letra grande*', () => {
    expect([...OBJETOS.trazo.normal]).toEqual(objetos.pestana.trazo.normal);
    expect([...OBJETOS.trazo.grande]).toEqual(objetos.pestana.trazo.grande);
    expect([...OBJETOS.trazo.normal]).toEqual(tamano('brand/mostrador/png/trazo-pestana.png'));
  });

  it('a receipt’s teeth: 12 apart, 6 deep — half the tooth’s width, so a turned square’s lower half is the tooth', () => {
    expect(OBJETOS.diente).toEqual({ paso: objetos.recibo.diente.paso, alto: objetos.recibo.diente.alto });
    expect(OBJETOS.diente.alto).toBe(OBJETOS.diente.paso / 2);
  });
});

describe('`@/theme/mostrador`’s motions are `movimiento.json`’s (`11.9`)', () => {
  it('*El sello cae*: 260 ms, its three keyframes and their curves', () => {
    const m = movimiento.movimientos.sello;
    expect(SELLO).toEqual({ duracion: m.duracion, retraso: m.retraso, fotogramas: m.fotogramas });
  });

  it('*Sale el recibo*: 380 ms, one row up to its place', () => {
    const m = movimiento.movimientos.recibo;
    expect(RECIBO).toEqual({ duracion: m.duracion, retraso: m.retraso, fotogramas: m.fotogramas });
    expect(m.unidad).toBe('fila');
  });

  it('*El total rueda*: 700 ms on its curve, each place 40 ms after the one to its right (call 8)', () => {
    const m = movimiento.movimientos.rodillo;
    expect(RODILLO.duracion).toBe(m.duracion);
    expect([...RODILLO.curva]).toEqual(m.fotogramas[0].curva);
    expect(RODILLO.escalonado.cada).toBe(m.escalonado.cada);
    expect(m.escalonado.desde).toBe('derecha');
  });

  it('the units turn at once and each place to the left one step later', () => {
    expect([0, 1, 2, 5].map(retrasoDeRueda)).toEqual([0, 40, 80, 200]);
    expect(retrasoDeRueda(-1)).toBe(0);
  });

  it('a motion’s legs run 0 → 1 on the curve each keyframe names, and add up to its length', () => {
    for (const m of [SELLO, RECIBO]) {
      const legs = tramosDe(m);
      expect(legs.map((l) => l.hasta)).toEqual(puntosDe(m).slice(1));
      expect(legs.reduce((sum, l) => sum + l.duracion, 0)).toBeCloseTo(m.duracion, 9);
      expect(legs.map((l) => l.curva)).toEqual(m.fotogramas.slice(0, -1).map((f) => f.curva));
    }
    expect(valoresDe(SELLO, 'rotate')).toEqual([-12, 2, 0]);
    expect(valoresDe(RECIBO, 'opacity')).toEqual([1, 1]);
  });

  it('the stamp answers a tap, so it has landed inside the 300 ms a tap may wait (ADR-035 §2.11)', () => {
    expect(movimiento.movimientos.sello.conToque).toBe(true);
    expect(SELLO.retraso + SELLO.duracion).toBeLessThanOrEqual(movimiento.reglas.conToque);
  });

  it('`transform` and `opacity` only: no other property is keyed', () => {
    const allowed = new Set(['en', 'curva', ...movimiento.reglas.propiedades]);
    for (const m of [SELLO, RECIBO]) for (const f of m.fotogramas) for (const k of Object.keys(f)) expect(allowed.has(k), k).toBe(true);
  });
});

describe('the three places play them, and stand still when the phone asks for less (`11.9`)', () => {
  it('the stamp lands with `SELLO` and reads the phone’s *reduce motion*', () => {
    const text = code('ui/Hecho.tsx');
    expect(text).toContain('recorrer(cae, SELLO)');
    expect(text).toContain('useReduceMotion()');
    expect(text).not.toMatch(/<Icono\b/); // no check mark: the stamp is the word
    expect(text).not.toMatch(/elevation|shadow/);
  });

  it('Inicio feeds the receipt with `RECIBO` and turns the register with `RODILLO`, both under *reduce motion*', () => {
    const text = code('app/(tabs)/index.tsx');
    expect(text).toContain('recorrer(t, RECIBO)');
    expect(text).toContain('delay: retrasoDeRueda(place)');
    expect(text).toContain('duration: RODILLO.duracion');
    expect(text.match(/useReduceMotion\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});

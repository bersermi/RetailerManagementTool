import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { CardRow } from '@/api/tarjeta';
import { selloDado } from '@/lib/tarjeta';
import * as MOVIMIENTO from '@/theme/movimiento';
import { CON_TOQUE, ENTREGAR, SELLO, TALON, puntosDe, tramosDe, valoresDe, type Movimiento } from '@/theme/movimiento';

// ============================================================================
// THE COUNTER'S MOTIONS — plan task `11.8-ii`, direction A · *Mostrador*. `@/theme/movimiento`'s `SELLO`, `TALON`
// and `ENTREGAR` are `brand/mostrador/movimiento.json`'s, number for number — the file the design system's
// *Movimiento* card plays byte for byte, so what he saw there is what the phone plays; `@/ui/Movimientos` draws
// them from there alone, one file in both siblings; each is started by what she did, blocks no touch, and stands
// still when the phone asks for less. Its twin is the neighbours' app's (`itacate/test/movimiento.test.ts`).
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: it reads numbers and source. That a stamp reads as pressed and a stub as torn —
// and that each starts at the right moment on a real phone — is the session's recordings and his look (ADR-035
// §2.11: no check can see a frame move).
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const APP = 'cocina';
const OTRA = 'itacate';
const leer = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const code = (path: string) => leer(`${APP}/src/${path}`).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const archivo = JSON.parse(leer('brand/mostrador/movimiento.json')) as {
  reglas: { propiedades: string[]; conToque: number };
  movimientos: Record<string, Movimiento & { conToque: boolean }>;
  secuencias: { entregar: { pasos: { movimiento: string; en: number }[] } };
};

/** A motion as the file writes it, without what only the page reads (its name, its words, where it plays). */
function delArchivo(nombre: string): Movimiento {
  const { duracion, retraso, origen, fotogramas } = archivo.movimientos[nombre];
  return { duracion, retraso, origen, fotogramas };
}

describe('the numbers are `movimiento.json`’s (`11.8-ii`)', () => {
  it('*El sello cae* and *El talón se arranca*, keyframe for keyframe — every value and every curve', () => {
    expect(SELLO).toEqual(delArchivo('sello'));
    expect(TALON).toEqual(delArchivo('talon'));
  });

  it('the handover as one gesture: the stub at once, *Entregado* as it lets go — the file’s sequence', () => {
    const pasos = Object.fromEntries(archivo.secuencias.entregar.pasos.map((p) => [p.movimiento, p.en]));
    expect(ENTREGAR).toEqual(pasos);
  });

  it('what answers a tap has ended within the file’s 300 ms — each alone and the handover whole', () => {
    expect(CON_TOQUE).toBe(archivo.reglas.conToque);
    expect(archivo.movimientos.sello.conToque && archivo.movimientos.talon.conToque).toBe(true);
    expect(SELLO.retraso + SELLO.duracion).toBeLessThanOrEqual(CON_TOQUE);
    expect(TALON.retraso + TALON.duracion).toBeLessThanOrEqual(CON_TOQUE);
    expect(Math.max(ENTREGAR.talon + TALON.duracion, ENTREGAR.sello + SELLO.duracion)).toBeLessThanOrEqual(CON_TOQUE);
  });

  it('only the file’s properties move', () => {
    for (const m of [SELLO, TALON] as Movimiento[]) {
      for (const f of m.fotogramas) {
        for (const clave of Object.keys(f).filter((k) => k !== 'en' && k !== 'curva')) expect(archivo.reglas.propiedades, clave).toContain(clave);
      }
    }
  });

  it('⚠️ *El total rueda* is not here — his word of 2026-11-27 keeps Wera Cocina’s *Quedan 9 de 14* still', () => {
    expect(Object.keys(MOVIMIENTO).filter((k) => /rodillo|rueda/i.test(k))).toEqual([]);
    expect(leer(`${APP}/src/ui/Movimientos.tsx`)).not.toMatch(/rodillo|RODILLO/);
  });
});

describe('how a motion is played — leg by leg, each on its curve (`11.8-ii`)', () => {
  it('its legs run keyframe to keyframe and add up to the motion', () => {
    for (const m of [SELLO, TALON] as Movimiento[]) {
      const tramos = tramosDe(m);
      expect(tramos).toHaveLength(m.fotogramas.length - 1);
      expect(tramos.reduce((suma, t) => suma + t.duracion, 0)).toBeCloseTo(m.duracion, 9);
      expect(tramos.map((t) => t.hasta)).toEqual(m.fotogramas.slice(1).map((f) => f.en));
      tramos.forEach((t, i) => expect(t.curva).toEqual(m.fotogramas[i].curva));
    }
    expect(tramosDe(SELLO).map((t) => Math.round(t.duracion))).toEqual([143, 117]);
  });

  it('each property at each keyframe — what the keyframe says, else what it was, else its rest', () => {
    expect(puntosDe(SELLO)).toEqual([0, 0.55, 1]);
    expect(valoresDe(SELLO, 'opacity')).toEqual([0, 1, 1]);
    expect(valoresDe(SELLO, 'scale')).toEqual([1.6, 0.94, 1]);
    expect(valoresDe(SELLO, 'rotate')).toEqual([-12, 2, 0]);
    expect(valoresDe(SELLO, 'translateX')).toEqual([0, 0, 0]);
    expect(valoresDe(TALON, 'translateX')).toEqual([0, 22]);
    expect(valoresDe(TALON, 'translateY')).toEqual([0, -6]);
    expect(valoresDe(TALON, 'scale')).toEqual([1, 1]);
    const carga: Movimiento = { duracion: 100, retraso: 0, origen: 'center', fotogramas: [{ en: 0, scale: 2, curva: [0, 0, 1, 1] }, { en: 0.5, curva: [0, 0, 1, 1] }, { en: 1, scale: 1 }] };
    expect(valoresDe(carga, 'scale')).toEqual([2, 2, 1]);
  });
});

describe('`@/ui/Movimientos` — one file in both siblings, its numbers the theme’s (`11.8-ii`)', () => {
  const texto = code('ui/Movimientos.tsx');

  it('is the neighbours’ app’s file, byte for byte — and the theme’s block of motions is the same in both', () => {
    expect(leer(`${APP}/src/ui/Movimientos.tsx`)).toBe(leer(`${OTRA}/src/ui/Movimientos.tsx`));
    const bloque = (app: string) => {
      const text = leer(`${app}/src/theme/movimiento.ts`);
      return text.slice(text.indexOf("// ⚠️ `11.8-ii`: THE COUNTER'S MOTIONS"));
    };
    expect(bloque(APP).length).toBeGreaterThan(1000);
    expect(bloque(APP)).toBe(bloque(OTRA));
  });

  it('every duration, delay and curve read from the theme — no number of its own', () => {
    expect(texto).toMatch(/import \{ SELLO, TALON, puntosDe, tramosDe, valoresDe, type Movimiento \} from '@\/theme\/movimiento';/);
    expect(texto).not.toMatch(/duration: \d|withDelay\(\d|Easing\.(out|in|inOut|cubic)/);
    expect(texto).toMatch(/duration: t\.duracion, easing: Easing\.bezier\(t\.curva\[0\], t\.curva\[1\], t\.curva\[2\], t\.curva\[3\]\)/);
    expect(texto).toMatch(/recorrer\(SELLO, SELLO\.retraso \+ retraso\)/);
    expect(texto).toMatch(/recorrer\(TALON, TALON\.retraso \+ retraso, termino\)/);
    expect(texto).toMatch(/transformOrigin: SELLO\.origen/);
    expect(texto).toMatch(/transformOrigin: TALON\.origen/);
  });

  it('one transform in the file’s order — translate, scale, turn', () => {
    expect(texto).toMatch(/transform: \[\{ scale: interpolate\(p\.value, SELLO_EN, SELLO_ESCALA\) \}, \{ rotate: `\$\{interpolate\(p\.value, SELLO_EN, SELLO_GIRO\)\}deg` \}\]/);
    expect(texto).toMatch(/\{ translateX: interpolate\(p\.value, TALON_EN, TALON_X\) \},\s*\{ translateY: interpolate\(p\.value, TALON_EN, TALON_Y\) \},\s*\{ rotate: `\$\{interpolate\(p\.value, TALON_EN, TALON_GIRO\)\}deg` \},/);
  });

  it('a phone set to reduce motion sees each one’s last keyframe at once — every timing, the sequence and the delay', () => {
    expect(texto).toMatch(/const SISTEMA = ReduceMotion\.System;/);
    expect(texto).toMatch(/reduceMotion: SISTEMA/);
    expect(texto).toMatch(/withDelay\(retraso, withSequence\(SISTEMA, \.\.\.pasos\), SISTEMA\)/);
  });

  it('started by what happened, from an effect, each when it turns on — and never blocking a touch while it plays', () => {
    expect(texto).toMatch(/useEffect\(\(\) => \{\s*if \(!cae\) return;[\s\S]*?\}, \[cae\]\);/);
    expect(texto).toMatch(/const p = useSharedValue\(cae \? 0 : 1\);/);
    expect(texto).toMatch(/useEffect\(\(\) => \{\s*if \(!arranca\) return;\s*const termino = \(\) => fin\.current\(\);[\s\S]*?\}, \[arranca\]\);/);
    // A stamp is never pressed; a stub is, until it tears.
    expect(texto.match(/<Animated\.View pointerEvents="none"/g)).toHaveLength(1);
    expect(texto).toMatch(/<Animated\.View pointerEvents=\{arranca \? 'none' : 'auto'\}/);
  });

  it('the stub is let go only once it has gone — the last leg’s end, and only when it ended', () => {
    expect(texto).toMatch(/i === tramos\.length - 1 && alFin !== undefined/);
    expect(texto).toMatch(/if \(terminado === true\) runOnJS\(alFin\)\(\);/);
  });

  it('⚠️ every stub sits in its `Arranca` from the start — what it holds is not remounted as it tears — and the ticket keeps one tree with a stub or without', () => {
    const mostrador = code('ui/Mostrador.tsx');
    expect(mostrador).toMatch(/\{conTalon && \(\s*<Arranca arranca=\{arranca\} onFin=\{\(\) => onArrancado\?\.\(\)\}>\s*\{parteDelTalon\}\s*<\/Arranca>\s*\)\}/);
    expect(mostrador).not.toMatch(/if \(talon === null[^\n]*return/);
  });
});

describe('where Wera Cocina plays them (`11.8-ii`)', () => {
  it('the handover is one gesture: her tap queues it, then the stub she tapped tears and *Entregado* lands 40 ms later', () => {
    const entregar = code('app/(cocina)/entregar.tsx');
    // Queued first (C10.3), then drawn: the order handed over here, her thumb's panel, and its stub tearing.
    expect(entregar).toMatch(/entregar\(o\.id\);\s*setEntregadaAqui\(o\.id\);\s*setPanelPara\(o\.id\);\s*setArrancando\(o\.id\);/);
    expect(entregar).toMatch(/arranca=\{arrancando === orden\.id\}\s*onArrancado=\{\(\) => setArrancando\(null\)\}/);
    expect(entregar).toMatch(/function otroCodigo\(\) \{[\s\S]*?setArrancando\(null\);[\s\S]*?\}/);
    // What is left of the ticket carries the stub only while it tears, and *Entregado* lands on it as the stub lets go.
    expect(entregar).toMatch(/talon=\{arranca \? boton : null\}\s*arranca=\{arranca\}\s*onArrancado=\{onArrancado\}/);
    expect(entregar).toMatch(/<Cae cae=\{arranca\} retraso=\{ENTREGAR\.sello\}>\s*<SelloPalabra texto=\{ES\.apartado\.entregado\} tinta=\{PALETTE\.accion\} \/>\s*<\/Cae>/);
  });

  it('the stamp she gives on *Escanear a tu cliente* lands beside what the answer said — the cow, in her green, turned as that place is', () => {
    const escanear = code('app/(cocina)/escanear.tsx');
    expect(escanear).toMatch(/const dado = selloDado\(card\);/);
    expect(escanear).toMatch(/dado !== null \? \(\s*<View[^>]*>\s*<Cae cae>\s*<SelloVaca i=\{dado\} tinta=\{PALETTE\.accion\} \/>\s*<\/Cae>/);
  });

  it('`selloDado`: the place of the stamp an answer gave — none for a look, a refusal or a reward handed out', () => {
    const de = (result: CardRow['result'], stamps: number | null, of: number | null) => ({ result, stamps, of }) as unknown as CardRow;
    expect(selloDado(de('primer', 1, 8))).toBe(0);
    expect(selloDado(de('sello', 6, 8))).toBe(5);
    // The card that won is back to zero (G17): its last place was the one stamped.
    expect(selloDado(de('gano', 0, 8))).toBe(7);
    for (const result of ['suya', 'ya_hoy', 'cobrado', 'ya_cobrado', 'ya_usado', 'cerrada', 'propia', 'no_valido', 'repite'] as const) {
      expect(selloDado(de(result, 3, 8)), result).toBeNull();
    }
  });

  it('⚠️ his word of 2026-11-27: the day’s number on *Hoy* does not roll — nothing on *Hoy* moves but its arrival', () => {
    expect(code('ui/DiaDeHoy.tsx')).not.toMatch(/@\/ui\/Movimientos/);
    expect(code('app/(cocina)/(tabs)/index.tsx')).not.toMatch(/@\/ui\/Movimientos/);
  });
});

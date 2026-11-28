import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { Apartado } from '@/api/apartados';
import { conElQueSeArranca } from '@/lib/apartados';
import { MAXIMO, SELLOS_VISTOS_KEY, marcarSellosVistos, primerSelloNuevo, sellosVistos } from '@/lib/sellosVistos';
import type { DeviceStore } from '@/lib/store';
import * as MOVIMIENTO from '@/theme/movimiento';
import { CON_TOQUE, ENTREGAR, SELLO, TALON, puntosDe, tramosDe, valoresDe, type Movimiento } from '@/theme/movimiento';

// ============================================================================
// THE COUNTER'S MOTIONS — plan task `11.8-ii`, direction A · *Mostrador*. `@/theme/movimiento`'s `SELLO`, `TALON`
// and `ENTREGAR` are `brand/mostrador/movimiento.json`'s, number for number — the file the design system's
// *Movimiento* card plays byte for byte, so what he saw there is what the phone plays; `@/ui/Movimientos` draws
// them from there alone, one file in both siblings; each is started by what she did, blocks no touch, and stands
// still when the phone asks for less. Its twin is Wera Cocina's (`cocina/test/movimiento.test.ts`).
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: it reads numbers and source. That a stamp reads as pressed and a stub as torn —
// and that each starts at the right moment on a real phone — is the session's recordings and his look (ADR-035
// §2.11: no check can see a frame move).
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const APP = 'itacate';
const OTRA = 'cocina';
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

  it('is Wera Cocina’s file, byte for byte — and the theme’s block of motions is the same in both', () => {
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

function memoria(): DeviceStore & { readonly datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

describe('a new stamp on her card lands — the count she last saw, kept on her phone per card (`11.8-ii`)', () => {
  const MARI = '11111111-1111-4111-8111-111111111111';
  const LUPE = '22222222-2222-4222-8222-222222222222';

  it('nothing kept for a card: nothing lands; then the stamps beyond what she saw', () => {
    expect(primerSelloNuevo(null, 5)).toBeNull();
    expect(primerSelloNuevo(5, 5)).toBeNull();
    expect(primerSelloNuevo(5, 6)).toBe(5);
    expect(primerSelloNuevo(4, 6)).toBe(4);
    // Her first stamp, after the kitchen's invitation kept 0.
    expect(primerSelloNuevo(0, 1)).toBe(0);
    // A reward won empties the card; stamps that lapsed: fewer, nothing lands.
    expect(primerSelloNuevo(7, 0)).toBeNull();
    expect(primerSelloNuevo(3, 1)).toBeNull();
  });

  it('kept per login and per card, under one key, every other login’s untouched — and it outlives *Cerrar sesión*', () => {
    const store = memoria();
    expect(sellosVistos(store, 'ana', MARI)).toBeNull();
    marcarSellosVistos(store, 'ana', MARI, 3);
    marcarSellosVistos(store, 'ana', LUPE, 0);
    marcarSellosVistos(store, 'luis', MARI, 7);
    expect(sellosVistos(store, 'ana', MARI)).toBe(3);
    expect(sellosVistos(store, 'ana', LUPE)).toBe(0);
    expect(sellosVistos(store, 'luis', MARI)).toBe(7);
    marcarSellosVistos(store, 'ana', MARI, 4);
    expect(sellosVistos(store, 'ana', MARI)).toBe(4);
    expect(sellosVistos(store, 'luis', MARI)).toBe(7);
    expect([...store.datos.keys()]).toEqual([SELLOS_VISTOS_KEY]);
    // Nothing signs it out: no session code removes the key (the rewards celebrated are kept the same way).
    expect(leer(`${APP}/src/auth/AuthProvider.tsx`)).not.toMatch(/SELLOS_VISTOS_KEY|sellos-vistos/);
  });

  it('⚠️ a new stamp waits until its row is on screen — her card sits under the dishes on a kitchen’s page — its place empty meanwhile', () => {
    const hook = code('lib/useSellosNuevos.ts');
    expect(hook).toMatch(/if \(desde === null \|\| enVista\) return;/);
    expect(hook).toMatch(/fila\.current\?\.measureInWindow\(\(_x, y, _ancho, h\) => \{\s*if \(h > 0 && y >= 0 && y \+ h <= alto\) setEnVista\(true\);/);
    expect(hook).toMatch(/const cada = setInterval\(mirar, MIRAR_CADA\);\s*return \(\) => clearInterval\(cada\);/);
    expect(code('ui/TarjetaDeLealtad.tsx')).toMatch(/const lleno = i < vista\.sellos && !\(nuevos\.desde !== null && !nuevos\.cae && i >= nuevos\.desde\);/);
  });

  it('the last 60 cards a login looked at; a count that is no count is never kept, nor read', () => {
    const store = memoria();
    const cocinas = Array.from({ length: 70 }, (_, n) => `cccc${String(n).padStart(4, '0')}-0000-4000-8000-000000000000`);
    for (const id of cocinas) marcarSellosVistos(store, 'ana', id, 2);
    expect(sellosVistos(store, 'ana', cocinas[0])).toBeNull();
    expect(sellosVistos(store, 'ana', cocinas[69])).toBe(2);
    expect(Object.keys(JSON.parse(store.datos.get(SELLOS_VISTOS_KEY) ?? '{}').ana)).toHaveLength(MAXIMO);
    // Looked at again, a card is the newest.
    marcarSellosVistos(store, 'ana', cocinas[10], 3);
    for (const id of cocinas.slice(70 - MAXIMO + 1, 70)) marcarSellosVistos(store, 'ana', id, 2);
    expect(sellosVistos(store, 'ana', cocinas[10])).toBe(3);
    marcarSellosVistos(store, 'ana', MARI, -1);
    marcarSellosVistos(store, 'ana', MARI, 2.5);
    expect(sellosVistos(store, 'ana', MARI)).toBeNull();
    store.datos.set(SELLOS_VISTOS_KEY, '{"ana":{"' + MARI + '":"tres"}}');
    expect(sellosVistos(store, 'ana', MARI)).toBeNull();
    store.datos.set(SELLOS_VISTOS_KEY, 'no es json');
    expect(sellosVistos(store, 'ana', MARI)).toBeNull();
    // A phone with no store keeps nothing — never a card that fails.
    expect(() => marcarSellosVistos(undefined, 'ana', MARI, 1)).not.toThrow();
    expect(sellosVistos(undefined, 'ana', MARI)).toBeNull();
  });

  it('read before the card’s first frame, kept only while it is in front — and every card lands its new stamps', () => {
    const hook = code('lib/useSellosNuevos.ts');
    expect(hook).toMatch(/useState<number \| null>\(\(\) => \(usuario === null \? null : sellosVistos\(deviceStore\(\), usuario, cocinaId\)\)\)/);
    expect(hook).toMatch(/const desde = enFrente \? primerSelloNuevo\(visto, sellos\) : null;/);
    expect(hook).toMatch(/if \(usuario === null \|\| !enFrente\) return;\s*if \(desde !== null && !enVista\) return;\s*marcarSellosVistos\(deviceStore\(\), usuario, cocinaId, sellos\);/);
    expect(hook).toMatch(/return \{ desde, cae: desde !== null && enVista \};/);
    const tarjeta = code('ui/TarjetaDeLealtad.tsx');
    expect(tarjeta).toMatch(/const nuevos = useSellosNuevos\(vista\.cocinaId, vista\.sellos, fila\);/);
    expect(tarjeta).toMatch(/<View ref=\{fila\} style=\{\{ flexDirection: 'row'/);
    // ⚠️ The invitation keeps 0 only once her cards are read — before that, she may have one.
    expect(code('ui/SeccionTarjeta.tsx')).toMatch(/useInvitacionVista\(cocina\.id, tarjetas\.data !== undefined && vista === null && terminos !== null && cocina\.tarjeta !== null\);/);
  });
});

describe('her ticket’s stub tears when she has it — the ticket kept in its place while it goes (`11.8-ii`)', () => {
  const a = (id: string) => ({ id }) as unknown as Apartado;

  it('`conElQueSeArranca`: the swiped ticket back at its place, last if fewer are left, never twice', () => {
    const [x, y, z] = [a('x'), a('y'), a('z')];
    expect(conElQueSeArranca([y, z], null)).toEqual([y, z]);
    expect(conElQueSeArranca([y, z], { apartado: x, i: 0 }).map((t) => t.id)).toEqual(['x', 'y', 'z']);
    expect(conElQueSeArranca([x, z], { apartado: y, i: 1 }).map((t) => t.id)).toEqual(['x', 'y', 'z']);
    expect(conElQueSeArranca([], { apartado: x, i: 3 }).map((t) => t.id)).toEqual(['x']);
    expect(conElQueSeArranca([x, y], { apartado: x, i: 0 }).map((t) => t.id)).toEqual(['x', 'y']);
  });

  it('*Apartados*: the ticket she swiped tears in its place, and *Ya lo tienes* comes once it has gone', () => {
    const screen = code('app/(vecino)/apartados.tsx');
    expect(screen).toMatch(/if \(confirmar\(apartado\.id\)\) \{\s*setRecogido\(apartado\);\s*if \(i !== undefined\) setArrancando\(\{ apartado, i \}\);/);
    expect(screen).toMatch(/const pendientes = secciones === null \? \[\] : conElQueSeArranca\(secciones\.pendientes, arrancando\);/);
    expect(screen).toMatch(/arranca=\{arrancando\?\.apartado\.id === apartado\.id\}\s*onArrancado=\{\(\) => setArrancando\(null\)\}\s*onYaLoTengo=\{\(\) => yaLoTengo\(apartado, i\)\}/);
    expect(screen).toMatch(/\{recogido !== null && arrancando === null && \(/);
    expect(screen).not.toMatch(/secciones\.pendientes\.map/);
    // A plate *por confirmar* is a sheet with no stub: *Ya lo tienes* at once.
    expect(screen).toMatch(/onListo=\{\(\) => yaLoTengo\(apartado\)\}/);
    // Leaving the screen ends it.
    expect(screen).toMatch(/useCallback\(\(\) => \(\) => \{\s*setRecogido\(null\);\s*setArrancando\(null\);/);
  });

  it('her ticket hands both to its `Boleto`', () => {
    expect(code('ui/BoletoApartado.tsx')).toMatch(/<Boleto\s+arranca=\{arranca\}\s+onArrancado=\{onArrancado\}/);
  });

  it('⚠️ the swipe’s words take two lines at the phone’s larger text — the track as tall as they need, the thumb centred', () => {
    const swipe = code('ui/Deslizar.tsx');
    expect(swipe).toMatch(/numberOfLines=\{2\}/);
    expect(swipe).not.toMatch(/numberOfLines=\{1\}/);
    expect(swipe).toMatch(/minHeight: ALTO,/);
    expect(swipe).not.toMatch(/\bheight: ALTO\b/);
    expect(swipe).toMatch(/top: '50%',\s*marginTop: -PULGAR \/ 2,/);
    expect(swipe).toMatch(/paddingLeft: PULGAR \+ 8 \+ SIZE\.rowGap,/);
  });
});

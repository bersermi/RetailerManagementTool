// ============================================================================
// THE DRAWINGS OF WERA'S SCREENS WITH NOTHING YET — plan task `11.10-ii`, row
// `11.4`'s *vacíos* (his call 13, ruled as drawn on 2026-11-26): *Lo último*'s
// receipt in each tab's counter colour, *Números*' chart, *Proveedores*' hand truck
// and *Solicitudes*' door, each above its sentence, 96 points (120 at *Letra
// grande*). `brand/dibujos/dibujos.json` names every place.
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: it reads source and bytes — that every picture is
// `brand/dibujos/png/`'s, that every place the inventory names draws its drawing in
// its ink, and that *Proveedores* draws it only on *nothing yet*. How it sits on the
// screen, at both densities and on both platforms, is the session's emulator and
// Simulator shots and his look (ADR-035 §2.11); that each picture is its SVG is
// `brand/dibujos/dibujos.mjs`'s.
// ============================================================================

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { ApiMessageKey } from '@/api/errors';
import { providerLine, providerNothingYet } from '@/api/providerDirectory';
import { salesLine, salesNothingYet, type SalesState } from '@/api/sales';
import { ES } from '@/strings';
import { DENSITIES } from '@/theme/density';

const APP = 'app';
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, APP, 'src');
const sha = (path: string) => createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex');
/** Source with its comments removed, so a sentence about a thing is not the thing. */
const code = (path: string) =>
  readFileSync(join(ROOT, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

interface Lugar {
  readonly app: string;
  readonly archivo: string;
  readonly busca: string;
  readonly tinta: readonly string[];
}
const INVENTARIO = JSON.parse(readFileSync(join(ROOT, 'brand/dibujos/dibujos.json'), 'utf8')) as {
  readonly reglas: { readonly vacio: string };
  readonly dibujos: Readonly<Record<string, { readonly tipo: string; readonly donde?: readonly Lugar[] }>>;
};
const VACIOS = Object.entries(INVENTARIO.dibujos).flatMap(([nombre, e]) =>
  (e.donde ?? []).filter((l) => l.app === APP && e.tipo === 'vacio').map((l) => ({ nombre, ...l })),
);
const SUYOS = [...new Set(VACIOS.map((v) => v.nombre))].sort();
const DENSIDADES = ['', '@2x', '@3x'];

describe('`11.10-ii` — the pictures are `brand/dibujos/png/`’s, byte for byte', () => {
  it('`src/marca/vacios/` holds the four drawings the inventory places in Wera, at 1×, 2× and 3×, and nothing else', () => {
    expect(SUYOS).toEqual(['barras', 'diablito', 'puerta', 'recibo']);
    expect(readdirSync(join(SRC, 'marca/vacios')).sort()).toEqual(SUYOS.flatMap((d) => DENSIDADES.map((s) => `${d}${s}.png`)).sort());
  });

  it('each one is its source’s bytes — a drawing redrawn there is copied here in the same PR', () => {
    for (const dibujo of SUYOS) {
      for (const s of DENSIDADES) expect(sha(`${APP}/src/marca/vacios/${dibujo}${s}.png`), `${dibujo}${s}`).toBe(sha(`brand/dibujos/png/${dibujo}${s}.png`));
    }
  });

  it('each one asked for by `@/marca/vacios`, at 1× and by its name (the phone picks its density)', () => {
    const tabla = code(`${APP}/src/marca/vacios.ts`);
    for (const dibujo of SUYOS) expect(tabla, dibujo).toContain(`${dibujo}: require('@/marca/vacios/${dibujo}.png') as ImageSourcePropType,`);
    expect(tabla).not.toMatch(/@2x|@3x/);
  });
});

describe('each empty screen draws its drawing above its sentence, at the density’s size, in its ink', () => {
  it('96 points, 120 at *Letra grande* — the rule’s numbers', () => {
    expect(INVENTARIO.reglas.vacio).toMatch(/96 points \(Wera's Letra grande 120\)/);
    expect(DENSITIES.normal.dibujoSize).toBe(96);
    expect(DENSITIES.elder.dibujoSize).toBe(120);
    expect(code(`${APP}/src/ui/DibujoVacio.tsx`)).toMatch(/source=\{VACIOS\[dibujo\]\}[\s\S]*?width: scale\.dibujoSize, height: scale\.dibujoSize, tintColor: color/);
  });

  it('every place the inventory names for Wera draws its drawing, and still says its sentence', () => {
    expect(VACIOS.length).toBe(5);
    for (const v of VACIOS) {
      const pantalla = code(v.archivo);
      expect(pantalla, v.archivo).toContain(v.busca);
      expect(pantalla, v.archivo).toMatch(new RegExp(`<(Vacio|DibujoVacio)\\b[^>]*?dibujo(=\\{[^}]*'${v.nombre}'|="${v.nombre}")`));
    }
  });

  it('in its ink: *Lo último* its counter’s colour, tab by tab; the others `accion`', () => {
    const tinta = Object.fromEntries(VACIOS.map((v) => [v.nombre, v.tinta]));
    expect(tinta.recibo).toEqual(['accion', 'compra', 'desperdicio']);
    const documentos = code(`${APP}/src/app/documentos.tsx`);
    expect(documentos).toMatch(/<DibujoVacio dibujo="recibo" color=\{tone\.ink\} \/>/);
    expect(documentos).toMatch(/sale: \{ ink: PALETTE\.accion,[\s\S]*?purchase: \{ ink: PALETTE\.compra,[\s\S]*?waste: \{ ink: PALETTE\.desperdicio,/);
    for (const nombre of ['barras', 'diablito', 'puerta']) expect(tinta[nombre], nombre).toEqual(['accion']);
    expect(code(`${APP}/src/app/solicitudes.tsx`)).toMatch(/<DibujoVacio dibujo="puerta" color=\{PALETTE\.accion\} \/>/);
    expect(code(`${APP}/src/ui/Vacio.tsx`)).toMatch(/<DibujoVacio dibujo=\{dibujo\} color=\{PALETTE\.accion\} \/>/);
  });

  it('and the soft discs with today’s glyphs are gone from *Lo último* and *Solicitudes*', () => {
    expect(code(`${APP}/src/app/documentos.tsx`)).not.toMatch(/KIND_ICON|cash-register|basket-minus-outline/);
    expect(code(`${APP}/src/app/solicitudes.tsx`)).not.toMatch(/door-open/);
  });
});

describe('*Proveedores* draws its hand truck on *nothing yet* only — never loading, without signal, on a failure or when nothing matched', () => {
  it('`providerNothingYet` is true exactly where `providerLine` says *todavía no tienes proveedores*', () => {
    const fallos: (ApiMessageKey | null)[] = [null, 'offline', 'unknown'];
    let vistos = 0;
    for (const loading of [true, false]) {
      for (const typed of ['', '  ', 'bodega']) {
        for (const failed of fallos) {
          for (const online of [true, false, null] as const) {
            const linea = providerLine(loading, typed, failed, online);
            expect(providerNothingYet(loading, typed), `${loading} «${typed}» ${failed} ${online}: ${linea}`).toBe(linea === ES.providers.empty.none);
            if (linea === ES.providers.empty.none) vistos += 1;
          }
        }
      }
    }
    expect(vistos).toBeGreaterThan(0);
  });

  it('and *Números* draws its chart over *todavía no hay ventas que contar* only — `salesNothingYet` beside `salesLine`', () => {
    const estados: SalesState[] = ['unknown', 'unreadable', 'nothing', 'sales'];
    for (const state of estados) {
      for (const failed of [null, 'offline', 'unknown'] as (ApiMessageKey | null)[]) {
        for (const online of [true, false, null] as const) {
          expect(salesNothingYet(state), `${state} ${failed} ${online}`).toBe(salesLine(state, failed, online) === ES.numbers.nothing);
        }
      }
    }
    expect(code(`${APP}/src/app/numeros.tsx`)).toMatch(/<Vacio line=\{line\} dibujo=\{salesNothingYet\(sales\.state\) \? 'barras' : undefined\} \/>/);
  });

  it('and the screen asks it, beside the line', () => {
    expect(code(`${APP}/src/app/proveedores.tsx`)).toMatch(
      /line=\{providerLine\(loading, typed, failed, online\)\}\s*dibujo=\{providerNothingYet\(loading, typed\) \? 'diablito' : undefined\}/,
    );
  });
});

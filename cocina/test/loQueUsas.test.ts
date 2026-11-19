import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { MENU_MAXIMO, NADA, SERVICIOS, type LoQueUsa } from '@/api/servicios';
import {
  ICONO_DE,
  PANTALLA_DE,
  PASOS_DE,
  mosaicosDe,
  PREPARAR,
  construidos,
  cuentanosEnHoy,
  detalleDe,
  eleccionesDe,
  elegibles,
  filasDe,
  hayLoQueUsas,
  menuDe,
  menuEnLaEleccion,
  pasoDe,
  pasos,
  revisarMenu,
  servicioErrorMessage,
  type Elegible,
  type Pantallas,
} from '@/lib/loQueUsas';
import { clavePuerta, guardarPuerta, puertaCerrada } from '@/lib/puerta';
import type { DeviceStore } from '@/lib/store';
import { ES } from '@/strings';

// ============================================================================
// HER CHOICES. Plan task `10.9a-ii`, on `10.9a-i`'s functions (`0081`): the first run's third
// step, *Mi cocina › Lo que usas* and *Cuéntanos* at the foot of *Hoy* — the owner's rulings of
// 2026-11-16 and 17 (G32, G33, G44, G45; *Tu menú a la mano* his rewording).
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: the rules, pure, and the wiring read as text. That the step,
// the section and the line draw — every switch off on the live project today, so none of them
// shows there — is the emulator's against a local shop with its switches on (ADR-035 §2.11).
// What the database answers to each call is `docs/checks/10.9a-i-features-contract.sh`'s.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const code = (path: string) => readFileSync(join(ROOT, 'cocina/src', path), 'utf8').replace(/^\s*\/\/.*$/gm, '');

const GLYPHS = JSON.parse(
  readFileSync(
    createRequire(import.meta.url).resolve('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'),
    'utf8',
  ),
) as Record<string, number>;

const DESDE = new Date('2026-11-17T18:00:00Z');

/** A kitchen's answer, read: what Wera offers, her choices, Próximamente, her requests. */
function loQueUsa(over: Partial<LoQueUsa> = {}): LoQueUsa {
  return { ...NADA, ...over };
}

/** A build that carries every feature but the menu — the screens' paths are only names here. */
const TODO: Pantallas = { tarjeta: '/', promociones: '/', numeros: '/' };

describe('what this build carries — the card since `10.9e-ii`, so the first run is three steps', () => {
  it('the card’s screen and its setup; her numbers (`10.9f`) and promotions (`10.9g`) add theirs', () => {
    expect(PANTALLA_DE).toEqual({ tarjeta: '/tarjeta' });
    expect(PREPARAR).toEqual({ tarjeta: '/preparar-tarjeta' });
    expect(construidos()).toEqual(['tarjeta']);
  });

  it('the count is the build’s: 3 with a feature built, 2 with none — never the menu, which is Próximamente', () => {
    expect(pasos()).toBe(3);
    expect([pasoDe(1), pasoDe(2), pasoDe(3)]).toEqual(['Paso 1 de 3', 'Paso 2 de 3', 'Paso 3 de 3']);
    expect(pasos([])).toBe(2);
    expect(pasos(construidos(TODO))).toBe(3);
    expect(pasoDe(3, construidos(TODO))).toBe('Paso 3 de 3');
    expect(construidos({ menu: '/' } as unknown as Pantallas)).toEqual([]);
  });

  it('in the fixed order, whatever order the screens are named in', () => {
    expect(construidos({ numeros: '/', tarjeta: '/' })).toEqual(['tarjeta', 'numeros']);
  });
});

describe('what she may pick — offered by Wera now AND built here', () => {
  it('both gates: a feature switched off, or not built, is offered nowhere', () => {
    const hechos = construidos({ tarjeta: '/', numeros: '/' });
    expect(elegibles(loQueUsa({ ofrecidos: ['tarjeta', 'promociones', 'numeros'] }), hechos)).toEqual(['tarjeta', 'numeros']);
    expect(elegibles(loQueUsa({ ofrecidos: ['promociones'] }), hechos)).toEqual([]);
    // This build: the card alone — her numbers, switched on, are offered nowhere until `10.9f` builds them.
    expect(elegibles(loQueUsa({ ofrecidos: ['tarjeta', 'numeros'] }))).toEqual(['tarjeta']);
    expect(elegibles(loQueUsa({ ofrecidos: ['numeros'] }))).toEqual([]);
  });

  it('never the menu, even switched on', () => {
    expect(elegibles(loQueUsa({ ofrecidos: ['menu', 'numeros'] }), construidos(TODO))).toEqual(['numeros']);
  });

  it('*Tu menú a la mano · Próximamente* on the step only while every Próximamente may show', () => {
    expect(menuEnLaEleccion(loQueUsa())).toBe(false);
    expect(menuEnLaEleccion(loQueUsa({ proximamente: true }))).toBe(true);
  });
});

describe('*Seguir* — one call: on for what she picked, off for the rest she was shown', () => {
  const mostrados: Elegible[] = ['tarjeta', 'promociones', 'numeros'];

  it('nothing pre-checked: nothing picked sends every one off', () => {
    expect(eleccionesDe(mostrados, new Set())).toEqual({ tarjeta: 'off', promociones: 'off', numeros: 'off' });
  });

  it('her picks on, the rest off', () => {
    expect(eleccionesDe(mostrados, new Set<Elegible>(['numeros', 'tarjeta']))).toEqual({ tarjeta: 'on', promociones: 'off', numeros: 'on' });
  });

  it('a pick of something no longer shown is dropped — never `on` for a feature Wera took away', () => {
    expect(eleccionesDe(['numeros'], new Set<Elegible>(['tarjeta', 'numeros']))).toEqual({ numeros: 'on' });
  });

  it('every key is a feature and every value a state the database takes', () => {
    const elecciones = eleccionesDe(mostrados, new Set<Elegible>(['promociones']));
    for (const [k, v] of Object.entries(elecciones)) {
      expect(SERVICIOS as readonly string[]).toContain(k);
      expect(['on', 'off']).toContain(v);
    }
  });
});

describe('*Lo que usas* — each feature offered, with its state', () => {
  const pantallas: Pantallas = { tarjeta: '/', numeros: '/ofertas' };
  const elegido = (estado: 'on' | 'off' | 'interesada') => ({ estado, desde: DESDE });

  it('her choice read: on is used, and opens its screen; off, interesada and no choice open Activar', () => {
    const lq = loQueUsa({
      ofrecidos: ['tarjeta', 'promociones', 'numeros'],
      elecciones: { tarjeta: elegido('interesada'), numeros: elegido('on') },
    });
    expect(filasDe(lq, pantallas)).toEqual([
      { servicio: 'tarjeta', usa: false, abre: null },
      { servicio: 'numeros', usa: true, abre: '/ofertas' },
    ]);
  });

  it('a feature she turned on that Wera switched off is not listed — and comes back with the switch', () => {
    const lq = loQueUsa({ ofrecidos: ['numeros'], elecciones: { tarjeta: elegido('on'), numeros: elegido('off') } });
    expect(filasDe(lq, pantallas).map((f) => f.servicio)).toEqual(['numeros']);
    expect(filasDe({ ...lq, ofrecidos: ['tarjeta', 'numeros'] }, pantallas).map((f) => [f.servicio, f.usa])).toEqual([
      ['tarjeta', true],
      ['numeros', false],
    ]);
  });

  it('what each row says: *En tu Hoy*, or *No la usas* in its gender', () => {
    expect(detalleDe({ servicio: 'tarjeta', usa: false, abre: null })).toBe('No la usas');
    expect(detalleDe({ servicio: 'promociones', usa: false, abre: null })).toBe('No las usas');
    expect(detalleDe({ servicio: 'numeros', usa: false, abre: null })).toBe('No los usas');
    expect(detalleDe({ servicio: 'numeros', usa: true, abre: '/' })).toBe('En tu Hoy');
  });

  it('*Tu menú · Próximamente* while every Próximamente may show; *Anotado* once she said *Me interesa*', () => {
    expect(menuDe(loQueUsa())).toBeNull();
    expect(menuDe(loQueUsa({ proximamente: true }))).toEqual({ anotado: false });
    expect(menuDe(loQueUsa({ proximamente: true, elecciones: { menu: elegido('interesada') } }))).toEqual({ anotado: true });
    expect(menuDe(loQueUsa({ proximamente: true, elecciones: { menu: elegido('off') } }))).toEqual({ anotado: false });
  });

  it('nothing to draw, nothing drawn — which is every kitchen while Wera’s switches are off', () => {
    expect(hayLoQueUsas(NADA)).toBe(false);
    expect(hayLoQueUsas(loQueUsa({ ofrecidos: ['promociones', 'numeros'] }))).toBe(false);
    // `10.9e-ii`: the card is built, so the day its switch goes on (`10.9e-iii`) it is offered.
    expect(hayLoQueUsas(loQueUsa({ ofrecidos: ['tarjeta', 'promociones', 'numeros'] }))).toBe(true);
    expect(hayLoQueUsas(loQueUsa({ ofrecidos: ['tarjeta'] }), pantallas)).toBe(true);
    expect(hayLoQueUsas(loQueUsa({ proximamente: true }))).toBe(true);
  });
});

describe('*Cuéntanos cómo necesitas tu menú* at the foot of *Hoy*', () => {
  it('while every Próximamente may show, until her kitchen told us once or she closed it here — and never while unread', () => {
    const abierto = loQueUsa({ proximamente: true });
    expect(cuentanosEnHoy(abierto, false)).toBe(true);
    expect(cuentanosEnHoy(undefined, false)).toBe(false);
    expect(cuentanosEnHoy(loQueUsa(), false)).toBe(false);
    expect(cuentanosEnHoy({ ...abierto, pedidosDeMenu: 1 }, false)).toBe(false);
    expect(cuentanosEnHoy(abierto, true)).toBe(false);
  });

  it('something to send: blank is refused on the phone, as the database refuses it (`22023`)', () => {
    expect(revisarMenu('   \n ')).toBe(ES.cuentanos.vacio);
    expect(revisarMenu('Con precios, cada lunes')).toBeNull();
  });

  it('its ✕ is this phone’s, per kitchen, under a key of its own — her page’s door keeps its key', () => {
    const map = new Map<string, string>();
    const store: DeviceStore = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
    guardarPuerta(store, 'k-1', true, 'menu');
    expect(puertaCerrada(store, 'k-1', 'menu')).toBe(true);
    expect(puertaCerrada(store, 'k-1')).toBe(false);
    expect(puertaCerrada(store, 'k-2', 'menu')).toBe(false);
    expect([...map.keys()]).toEqual(['wera-cocina.hoy.menu-cerrado.k-1']);
    expect(clavePuerta('k-1')).toBe('wera-cocina.hoy.pagina-cerrada.k-1');
    guardarPuerta(store, 'k-1', false, 'menu');
    expect(map.size).toBe(0);
  });

  it('the sheet takes `0081`’s limit, and pads for the keyboard on BOTH phones (a Modal’s window is never resized on Android)', () => {
    expect(MENU_MAXIMO).toBe(500);
    const hoja = code('ui/Cuentanos.tsx');
    expect(hoja).toMatch(/maxLength=\{MENU_MAXIMO\}/);
    expect(hoja).toMatch(/<KeyboardAvoidingView behavior="padding"/);
  });
});

describe('a refusal, in words', () => {
  it('`TD024` — Wera switched it off while she looked — says so', () => {
    expect(servicioErrorMessage({ code: 'TD024', message: 'tarjeta is not offered now' })).toBe('Ya no está disponible.');
  });

  it('anything else is the app’s usual sentence', () => {
    expect(servicioErrorMessage({ code: '42501' })).toBe(ES.api.errors.sessionEnded);
    expect(servicioErrorMessage(new TypeError('Network request failed'))).toBe(ES.api.errors.offline);
  });
});

describe('the words — the ruled ones, and the drawing’s', () => {
  it('her need first and the feature under it (G33; *Tu menú a la mano*, his rewording of 2026-11-17)', () => {
    expect(SERVICIOS.map((s) => [ES.loQueUsas.necesidad[s], ES.loQueUsas.nombre[s]])).toEqual([
      ['Que regresen', 'Tarjeta de lealtad'],
      ['Dar a conocer algo nuevo', 'Promociones'],
      ['Saber cómo te va', 'Tus números'],
      ['Tu menú a la mano', 'Tu menú'],
    ]);
    expect(ES.queMas.titulo).toBe('¿Qué más quieres usar?');
    expect(ES.loQueUsas).toMatchObject({ titulo: 'Lo que usas', activar: 'Activar', listo: 'Listo, ya está en tu Hoy', meInteresa: 'Me interesa', proximamente: 'Próximamente' });
    expect(ES.cuentanos).toMatchObject({ titulo: 'Cuéntanos cómo necesitas tu menú', gracias: 'Gracias, lo leemos todo' });
  });

  it('every feature’s picture is in the icon set the app draws with — and `10.9a-iii`’s three per *Así funciona*', () => {
    for (const s of SERVICIOS) expect(GLYPHS[ICONO_DE[s]], ICONO_DE[s]).toBeTypeOf('number');
    for (const icono of Object.values(PASOS_DE).flat()) expect(GLYPHS[icono], icono).toBeTypeOf('number');
    for (const [s, pasos] of Object.entries(ES.asiFunciona.pasos)) expect(PASOS_DE[s as Elegible]).toHaveLength(pasos.length);
  });
});

describe('`10.9a-iii`: *Hoy*’s tiles — one per feature she uses that this build carries, in the fixed order', () => {
  const pantallas: Pantallas = { tarjeta: '/tarjeta' as never, numeros: '/numeros' as never };
  const usa = (...on: Elegible[]): LoQueUsa =>
    loQueUsa({
      ofrecidos: ['tarjeta', 'promociones', 'numeros'],
      elecciones: Object.fromEntries(on.map((s) => [s, { estado: 'on', desde: DESDE }])),
    });

  it('this build: the card’s alone; none unread', () => {
    expect(mosaicosDe(usa('tarjeta', 'promociones', 'numeros'))).toEqual([{ servicio: 'tarjeta', abre: '/tarjeta', vivo: null }]);
    expect(mosaicosDe(undefined, {}, pantallas)).toEqual([]);
  });

  it('⚠️ `10.9e-ii`: a feature turned off that still has work here — the card closed, its 30 days running — keeps its tile, in its place', () => {
    const vivo = { valor: '0 sellos hoy', detalle: 'Cerrada · la completan hasta el 18 de diciembre', porHacer: false };
    // Off in her choices: no tile — unless the screen says it still has work.
    expect(mosaicosDe(usa('numeros'), { tarjeta: vivo }, pantallas)).toEqual([{ servicio: 'numeros', abre: '/numeros', vivo: null }]);
    expect(mosaicosDe(usa('numeros'), { tarjeta: vivo }, pantallas, ['tarjeta'])).toEqual([
      { servicio: 'tarjeta', abre: '/tarjeta', vivo },
      { servicio: 'numeros', abre: '/numeros', vivo: null },
    ]);
    // Never for a feature this build does not carry.
    expect(mosaicosDe(usa(), {}, { numeros: '/numeros' } as unknown as Pantallas, ['tarjeta'])).toEqual([]);
  });

  it('only what she uses AND this build carries, card before numbers whatever she picked first; first-time until its row hands its words', () => {
    expect(mosaicosDe(usa('numeros', 'tarjeta', 'promociones'), {}, pantallas)).toEqual([
      { servicio: 'tarjeta', abre: '/tarjeta', vivo: null },
      { servicio: 'numeros', abre: '/numeros', vivo: null },
    ]);
    const vivo = { valor: '6 sellos hoy', detalle: '2 premios por entregar', porHacer: true };
    expect(mosaicosDe(usa('tarjeta'), { tarjeta: vivo }, pantallas)).toEqual([{ servicio: 'tarjeta', abre: '/tarjeta', vivo }]);
    // Off, *interesada*, or switched off by Wera: no tile.
    const apagada = loQueUsa({ ofrecidos: ['numeros'], elecciones: { tarjeta: { estado: 'on', desde: DESDE }, numeros: { estado: 'off', desde: DESDE } } });
    expect(mosaicosDe(apagada, {}, pantallas)).toEqual([]);
  });

  it('a feature picked and not set up says what it asks — the page’s words', () => {
    expect(ES.mosaicos.primera).toEqual({
      tarjeta: ['Prepara tu tarjeta', 'Tu premio y cuántos sellos'],
      promociones: ['Crea tu primera promoción', 'Algo nuevo, de temporada o tu día'],
      numeros: ['Empiezan con tu primera entrega', 'Se llenan solos'],
    });
    const tile = code('ui/Mosaicos.tsx');
    expect(tile).toMatch(/onPress=\{\(\) => router\.push\(mosaico\.abre\)\}/);
    expect(tile).toMatch(/borderStyle: primera \? 'dashed' : 'solid'/);
    expect(code('app/(cocina)/(tabs)/index.tsx')).toMatch(/const mosaicos = mosaicosPara\(mosaicosDe\(servicios\.data, vivosDe\(tarjetaDeHoy, ahora\), PANTALLA_DE, ademasDe\(tarjetaDeHoy, ahora\)\), duena\)/);
  });
});

describe('the wiring, read as text', () => {
  it('*Lo que usas* sits at the top of *Mi cocina*, above her page', () => {
    const mi = code('app/(cocina)/(tabs)/mi-cocina.tsx');
    const usas = mi.indexOf('<LoQueUsas kitchenId={kitchen.id}');
    expect(usas).toBeGreaterThan(-1);
    expect(usas).toBeLessThan(mi.indexOf('<Portada'));
  });

  it('off, a row opens *Activar*; *Me interesa* writes `interesada`, and nothing else is written from the section', () => {
    const usas = code('ui/LoQueUsas.tsx');
    expect(usas).toMatch(/!fila\.usa\s*\?\s*\(\) => router\.push\(\{ pathname: '\/activar\/\[servicio\]', params: \{ servicio: fila\.servicio \} \}\)/);
    expect(usas.match(/elegir\(/g)).toEqual(['elegir(']);
    expect(usas).toMatch(/await elegir\(\{ menu: 'interesada' \}\)/);
  });

  it('*Activar* sends `on` for its feature alone, then its setup if it has one, else *Listo*', () => {
    const activar = code('app/(cocina)/activar/[servicio].tsx');
    expect(activar).toMatch(/const fallo = await elegir\(\{ \[x\]: 'on' \}\);/);
    expect(activar).toMatch(/const preparar = PREPARAR\[x\];\s*if \(preparar !== undefined\) router\.replace\(preparar\);\s*else setListo\(x\);/);
    expect(activar).toMatch(/filasDe\(servicios\.data\)\.find\(\(f\) => f\.servicio === servicio && !f\.usa\)/);
  });

  it('*Cuéntanos* closes the sheet only once it landed, and its ✕ has *Deshacer*', () => {
    const hoy = code('app/(cocina)/(tabs)/index.tsx');
    expect(hoy).toMatch(/\{duena && cuentanosEnHoy\(servicios\.data, menuCerrado\) && \(/);
    expect(hoy).toMatch(/const \[menuCerrado, setMenuCerrado\] = usePuertaCerrada\(kitchen\.id, 'menu'\);/);
    expect(hoy).toMatch(/avisar\(ES\.cuentanos\.quitado, \(\) => setMenuCerrado\(false\)\)/);
    expect(hoy).toMatch(/const problema = await enviar\(texto\);\s*if \(problema === null\) \{\s*setHojaMenu\(false\);\s*avisar\(ES\.cuentanos\.gracias\);/);
  });
});

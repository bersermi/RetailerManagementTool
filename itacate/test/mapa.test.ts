import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { Dish, Kitchen, Offer, Punto } from '@/api/cocinas';
import { EMPTY_PAGE } from '@/api/pagina';
import { metrosEntre } from '@/lib/distancia';
import { tarjetasDe } from '@/lib/lista';
import {
  CENTRO_DE_LA_CIUDAD,
  DIAMETRO,
  JUNTOS,
  LANZADA,
  MISMO_LUGAR_M,
  NIVEL_INICIAL,
  ZOOM_CERCA,
  ZOOM_CIUDAD,
  agrupar,
  alTocarGrupo,
  camaraDe,
  claveDeOrigen,
  escondido,
  nivelAlSoltar,
  paddingDelMapa,
  partir,
  pinesDe,
  posicionesDe,
  separacionEnPantalla,
  siguienteAlTocar,
  type Pin,
} from '@/lib/mapa';
import { ES } from '@/strings';

// ============================================================================
// THE MAP, WITH THE LIST SLIDING OVER IT. Plan task `10.5-iv-b-i`, the owner's
// answers of 2026-11-05 (C; her location or her postal code, at her pick) and his
// rulings of 2026-11-03 (pins that overlap as one bigger pin with how many it holds,
// until she zooms in) and 2026-11-04, night (every kitchen a pin, wherever she moves
// the map). The rules are `@/lib/mapa`'s, pure; the wiring is read off the files —
// a map no suite can load (ADR-035 §2.11), seen on the iPhone Simulator with the app's
// own key and on the Android emulator for the sheet.
// ============================================================================

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

function sources(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}
const files = sources().map((path) => ({ name: path.slice(SRC.length + 1), text: readFileSync(path, 'utf8') }));

const AHORA = new Date('2026-11-07T20:00:00-06:00');
const hora = (h: number) => new Date(AHORA.getTime() + h * 3_600_000);

const DONA_MARI: Punto = { latitude: 19.4521, longitude: -99.1601 };
/** About 75 m from Doña Mari: the same corner. */
const ANA: Punto = { latitude: 19.4526, longitude: -99.1596 };
/** About 550 m away. */
const ESPIGA: Punto = { latitude: 19.4535, longitude: -99.155 };

function plato(lineNo: number): Dish {
  return { lineNo, name: `Plato ${lineNo}`, description: null, tags: [], priceCentavos: 5500, count: 3, surprise: false, usualCentavos: 9000, photo: null };
}
function oferta(id: string, desde: Date, hasta: Date): Offer {
  return { id, start: desde, end: hasta, dishes: [plato(1)] };
}
function cocina(id: string, point: Punto | null, offers: Offer[], giro: string | null = 'giro-fonda'): Kitchen {
  return {
    id,
    name: `Cocina ${id}`,
    giro,
    address: { street: 'Sabino', number: '12', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postalCode: '06400' },
    directions: null,
    point: point === null ? null : { ...point, source: 'pin' },
    page: EMPTY_PAGE,
    offers,
    summary: { weekdays: [0, 0, 0, 0, 0, 0, 0], usualHour: null, lastDay: null, repeats: [] },
  };
}
function pin(id: string, punto: Punto, enOferta = true): Pin {
  return { id, nombre: id, punto, enOferta, color: 'chile', dibujo: 'cazuela' };
}

/** About ZOOM_CERCA on a phone 400 points wide: the width shows ~1.7 km. */
const DELTA_CERCA = 0.017;
const ANCHO = 400;

describe('the pins — every kitchen the door sends that has a point', () => {
  it('on offer, or faded when quiet; a window that ended is quiet; a window later today is on offer', () => {
    const cocinas = [
      cocina('a', DONA_MARI, [oferta('o1', hora(-1), hora(2))]),
      cocina('b', ESPIGA, [oferta('o2', hora(1), hora(2))]),
      cocina('c', ANA, [oferta('o3', hora(-3), hora(-1))]),
      cocina('d', ANA, []),
    ];
    const pines = pinesDe(cocinas, new Map(), AHORA);
    expect(pines.map((p) => [p.id, p.enOferta])).toEqual([
      ['a', true],
      ['b', true],
      ['c', false],
      ['d', false],
    ]);
  });

  it('at the list’s point: the door’s, else where her phone found its address — and none without either', () => {
    const buscado: Punto = { latitude: 19.44, longitude: -99.15 };
    const pines = pinesDe([cocina('a', null, []), cocina('b', null, [])], new Map([['a', buscado]]), AHORA);
    expect(pines).toEqual([expect.objectContaining({ id: 'a', punto: buscado })]);
  });

  it('wears her colour and her trade’s drawing, as her card does', () => {
    const [mariscos] = pinesDe([cocina('a', DONA_MARI, [], 'giro-mariscos')], new Map(), AHORA);
    expect([mariscos.color, mariscos.dibujo]).toEqual(['talavera', 'pescado']);
    const [sinGiro] = pinesDe([cocina('a', DONA_MARI, [], null)], new Map(), AHORA);
    expect([sinGiro.color, sinGiro.dibujo]).toEqual(['chile', 'cazuela']);
  });

  it('never filters by distance: a kitchen across the city is a pin too', () => {
    const lejos: Punto = { latitude: 19.35, longitude: -99.162 };
    expect(metrosEntre(DONA_MARI, lejos)).toBeGreaterThan(10_000);
    expect(pinesDe([cocina('a', DONA_MARI, []), cocina('z', lejos, [])], new Map(), AHORA)).toHaveLength(2);
  });
});

describe('pins that overlap are one bigger pin with how many it holds, until she zooms in (2026-11-03)', () => {
  it('measures on her screen: Mercator, a pin’s width apart', () => {
    expect(JUNTOS).toBe(DIAMETRO);
    // 75 m apart is about 16 points at the opening zoom — they overlap.
    expect(separacionEnPantalla(DONA_MARI, ANA, ANCHO, DELTA_CERCA)).toBeLessThan(JUNTOS);
    // 550 m is far more than a pin.
    expect(separacionEnPantalla(DONA_MARI, ESPIGA, ANCHO, DELTA_CERCA)).toBeGreaterThan(JUNTOS * 3);
    // Zoomed in eight times, the same corner parts.
    expect(separacionEnPantalla(DONA_MARI, ANA, ANCHO, DELTA_CERCA / 8)).toBeGreaterThan(JUNTOS);
  });

  it('two kitchens on one corner are one circle of 2, at their middle; a third farther off stands alone', () => {
    const marcas = agrupar([pin('mari', DONA_MARI), pin('ana', ANA), pin('espiga', ESPIGA)], DELTA_CERCA, ANCHO);
    const grupo = marcas.find((m) => m.kind === 'grupo');
    expect(marcas).toHaveLength(2);
    expect(grupo).toMatchObject({ kind: 'grupo', key: 'grupo:ana,mari', enOferta: true });
    if (grupo?.kind !== 'grupo') throw new Error('no group');
    expect(grupo.punto.latitude).toBeCloseTo((DONA_MARI.latitude + ANA.latitude) / 2, 9);
    expect(marcas.find((m) => m.kind === 'pin')).toMatchObject({ key: 'pin:espiga' });
  });

  it('parts as she zooms in, and gathers the whole neighbourhood over the city', () => {
    const tres = [pin('mari', DONA_MARI), pin('ana', ANA), pin('espiga', ESPIGA)];
    expect(agrupar(tres, DELTA_CERCA / 8, ANCHO).every((m) => m.kind === 'pin')).toBe(true);
    const ciudad = agrupar(tres, 0.35, ANCHO);
    expect(ciudad).toEqual([expect.objectContaining({ kind: 'grupo', key: 'grupo:ana,espiga,mari' })]);
  });

  it('a group of quiet kitchens is faded too; one on offer is enough to draw it whole', () => {
    expect(agrupar([pin('a', DONA_MARI, false), pin('b', ANA, false)], DELTA_CERCA, ANCHO)[0]).toMatchObject({ enOferta: false });
    expect(agrupar([pin('a', DONA_MARI, false), pin('b', ANA, true)], DELTA_CERCA, ANCHO)[0]).toMatchObject({ enOferta: true });
  });

  it('a kitchen she tapped is never hidden in a group', () => {
    const marcas = agrupar([pin('mari', DONA_MARI), pin('ana', ANA)], DELTA_CERCA, ANCHO, new Set(['ana']));
    expect(marcas.map((m) => m.key).sort()).toEqual(['pin:ana', 'pin:mari']);
  });

  it('stable: the same pins in another order make the same marks', () => {
    const a = agrupar([pin('mari', DONA_MARI), pin('ana', ANA), pin('espiga', ESPIGA)], DELTA_CERCA, ANCHO);
    const b = agrupar([pin('espiga', ESPIGA), pin('ana', ANA), pin('mari', DONA_MARI)], DELTA_CERCA, ANCHO);
    expect(a.map((m) => m.key).sort()).toEqual(b.map((m) => m.key).sort());
  });

  it('before the map says its size and zoom, every pin stands alone', () => {
    expect(agrupar([pin('mari', DONA_MARI), pin('ana', ANA)], null, ANCHO).map((m) => m.kind)).toEqual(['pin', 'pin']);
    expect(agrupar([pin('mari', DONA_MARI), pin('ana', ANA)], DELTA_CERCA, 0).map((m) => m.kind)).toEqual(['pin', 'pin']);
  });

  it('a tap on a group comes closer — or, when its kitchens share one spot, shows them all', () => {
    expect(alTocarGrupo([pin('mari', DONA_MARI), pin('ana', ANA)])).toEqual({ kind: 'acercar', puntos: [DONA_MARI, ANA] });
    const mismoEdificio: Punto = { latitude: DONA_MARI.latitude + 0.0001, longitude: DONA_MARI.longitude };
    expect(metrosEntre(DONA_MARI, mismoEdificio)).toBeLessThan(MISMO_LUGAR_M);
    expect(alTocarGrupo([pin('mari', DONA_MARI), pin('vecina', mismoEdificio)])).toEqual({ kind: 'elegir', ids: ['mari', 'vecina'] });
  });
});

describe('the list sliding over the map — three heights, as drawn', () => {
  // A phone: *Cerca* 760 points tall, its clock 54, the sheet's head 112.
  const P = posicionesDe(760, 62, 112);

  it('full under the clock, half-way at 42 %, low with only the head showing — and it opens half-way', () => {
    expect(P).toEqual({ lleno: 62, medio: 319, bajo: 648 });
    expect(NIVEL_INICIAL).toBe('medio');
  });

  it('half-way never above full nor below low, on any phone', () => {
    expect(posicionesDe(300, 62, 112)).toEqual({ lleno: 62, medio: 126, bajo: 188 });
    expect(posicionesDe(150, 62, 112)).toEqual({ lleno: 62, medio: 62, bajo: 62 });
  });

  it('a drag lets go at the nearest height; a flick goes on to the next one its way', () => {
    expect(nivelAlSoltar(300, 0, P)).toBe('medio');
    expect(nivelAlSoltar(150, 0, P)).toBe('lleno');
    expect(nivelAlSoltar(600, 0, P)).toBe('bajo');
    expect(nivelAlSoltar(300, -LANZADA, P)).toBe('lleno');
    expect(nivelAlSoltar(300, LANZADA, P)).toBe('medio');
    expect(nivelAlSoltar(330, LANZADA, P)).toBe('bajo');
    expect(nivelAlSoltar(640, -LANZADA, P)).toBe('medio');
    // A flick past the end stays at the end.
    expect(nivelAlSoltar(62, -LANZADA * 3, P)).toBe('lleno');
    expect(nivelAlSoltar(648, LANZADA * 3, P)).toBe('bajo');
  });

  it('a tap on the handle: full and low go half-way, half-way goes full — and its words say so', () => {
    expect(siguienteAlTocar('lleno')).toBe('medio');
    expect(siguienteAlTocar('bajo')).toBe('medio');
    expect(siguienteAlTocar('medio')).toBe('lleno');
    expect([ES.mapa.subir, ES.mapa.bajar]).toEqual(['Subir la lista', 'Bajar la lista']);
  });

  it('⚠️ the map’s foot is the sheet’s top, so Google’s logo stays above the list — half-way’s while the list is full', () => {
    expect(paddingDelMapa('medio', P, 760, 54)).toEqual({ top: 54, right: 0, bottom: 760 - 319, left: 0 });
    expect(paddingDelMapa('bajo', P, 760, 54)).toEqual({ top: 54, right: 0, bottom: 112, left: 0 });
    expect(paddingDelMapa('lleno', P, 760, 54)).toEqual(paddingDelMapa('medio', P, 760, 54));
  });

  it('the list keeps room at its foot for the part hidden below the screen, so its last card can be read', () => {
    expect(escondido('lleno', P)).toBe(0);
    expect(escondido('medio', P)).toBe(319 - 62);
    expect(escondido('bajo', P)).toBe(648 - 62);
  });
});

describe('where the map opens, and when it flies', () => {
  it('on her, close enough for the kitchens within about a kilometre; over the city while there is nowhere', () => {
    expect(camaraDe(DONA_MARI)).toEqual({ center: DONA_MARI, zoom: ZOOM_CERCA, heading: 0, pitch: 0 });
    expect(camaraDe(null)).toEqual({ center: CENTRO_DE_LA_CIUDAD, zoom: ZOOM_CIUDAD, heading: 0, pitch: 0 });
    // Google's zoom 15 at Mexico City's latitude: ~4.5 m a point, so a 400-point phone shows ~1.8 km across.
    const metrosPorPunto = (156_543.03 * Math.cos((19.43 * Math.PI) / 180)) / 2 ** ZOOM_CERCA;
    expect(metrosPorPunto * 400).toBeGreaterThan(1_500);
    expect(metrosPorPunto * 400).toBeLessThan(2_200);
  });

  it('⚠️ flies when where she searches from changes — never as she walks', () => {
    const aqui1 = claveDeOrigen({ kind: 'aqui', punto: DONA_MARI });
    const aqui2 = claveDeOrigen({ kind: 'aqui', punto: ESPIGA });
    expect(aqui1).toBe(aqui2);
    expect(claveDeOrigen({ kind: 'codigo', cp: '06400', punto: DONA_MARI })).toBe('codigo:06400');
    expect(claveDeOrigen({ kind: 'codigo', cp: '06700', punto: DONA_MARI })).not.toBe('codigo:06400');
    expect(claveDeOrigen({ kind: 'buscando' })).toBe('ninguno');
    expect(claveDeOrigen({ kind: 'pide-codigo', porque: 'sin-permiso' })).toBe('ninguno');
    expect(claveDeOrigen({ kind: 'fuera' })).toBe('ninguno');
  });
});

describe('a pin she taps — *En el mapa*, as drawn', () => {
  it('its kitchen’s cards first, in the list’s order, and the rest under them', () => {
    const cocinas = [
      cocina('a', DONA_MARI, [oferta('o1', hora(-1), hora(2))]),
      cocina('b', ESPIGA, [oferta('o2', hora(-1), hora(2))]),
      cocina('c', ANA, []),
    ];
    const tarjetas = tarjetasDe(cocinas, DONA_MARI, new Map(), AHORA);
    const { enElMapa, resto } = partir(tarjetas, new Set(['b', 'c']));
    expect(enElMapa.map((t) => t.cocina.id)).toEqual(tarjetas.filter((t) => t.cocina.id !== 'a').map((t) => t.cocina.id));
    expect(resto.map((t) => t.cocina.id)).toEqual(['a']);
    expect(partir(tarjetas, new Set())).toEqual({ enElMapa: [], resto: tarjetas });
    expect([ES.mapa.enElMapa, ES.mapa.quitar]).toEqual(['En el mapa', 'Quitar']);
  });
});

describe('the wiring — Google’s map on both phones, and nothing of hers to Google', () => {
  const mapa = code('ui/MapaDeCocinas.tsx');

  it('⚠️ Google’s map on BOTH phones: Google’s points may be drawn on Google’s map alone (3.2.3(e))', () => {
    expect(mapa).toMatch(/provider=\{PROVIDER_GOOGLE\}/);
    const mapas = files.filter((f) => /from 'react-native-maps'/.test(f.text)).map((f) => f.name);
    expect(mapas).toEqual(['ui/MapaDeCocinas.tsx']);
    expect((mapa.match(/<MapView\s+ref=/g) ?? []).length).toBe(1);
  });

  it('⚠️ her dot is Itacate’s marker at the list’s point — Google’s own location layer stays off', () => {
    expect(mapa).toMatch(/showsUserLocation=\{false\}/);
    expect(mapa).toMatch(/showsMyLocationButton=\{false\}/);
    expect(mapa).toMatch(/\{desde !== null && <SuPunto key="su-punto" punto=\{desde\} cp=\{cp\} \/>\}/);
    // The map never asks the phone, nor reads her pick: it is handed the point the list measures from.
    expect(mapa).not.toMatch(/expo-location|@\/lib\/useUbicacion|@\/lib\/DondeBuscarProvider|@\/lib\/ubicacion'/);
    const list = code('app/(vecino)/(tabs)/index.tsx');
    expect(list).toMatch(/<MapaDeCocinas\s+pines=\{pines\}\s+desde=\{desde\}/);
  });

  it('Google’s businesses hidden, its logo in sight: the padding is the sheet’s, nothing drawn at the map’s foot', () => {
    expect(mapa).toMatch(/customMapStyle=\{SIN_NEGOCIOS\}/);
    expect(read('ui/MapaDeCocinas.tsx')).toMatch(/export const SIN_NEGOCIOS = \[\{ featureType: 'poi', stylers: \[\{ visibility: 'off' \}\] \}\];/);
    // Wera Cocina's spelling of the same style.
    expect(readFileSync(join(SRC, '../../cocina/src/ui/MapaPunto.tsx'), 'utf8')).toMatch(
      /export const SIN_NEGOCIOS = \[\{ featureType: 'poi', stylers: \[\{ visibility: 'off' \}\] \}\];/,
    );
    expect(mapa).toMatch(/mapPadding=\{padding\}/);
    expect(code('app/(vecino)/(tabs)/index.tsx')).toMatch(/paddingDelMapa\(nivel, posiciones, alto, insets\.top\)/);
    // The one button over the map sits at its top; nothing of ours is placed at its foot.
    expect(mapa).toMatch(/position: 'absolute',\s*top: padding\.top \+ SIZE\.space,/);
    expect(mapa).not.toMatch(/position: 'absolute',[^}]*\bbottom:/);
  });

  it('a marker stops redrawing once its picture is in, and a changed look is a new marker', () => {
    expect((mapa.match(/tracksViewChanges=\{!quieto\}/g) ?? []).length).toBe(3);
    expect(mapa).toMatch(/key=\{`\$\{marca\.key\}:\$\{elegidas\.has\(marca\.pin\.id\) \? 'e' : 'n'\}`\}/);
  });

  it('the gestures’ root wraps the app, and only the sheet listens to a drag', () => {
    expect(code('app/_layout.tsx')).toMatch(/<GestureHandlerRootView style=\{\{ flex: 1 \}\}>/);
    const gestos = files.filter((f) => /from 'react-native-gesture-handler'/.test(f.text)).map((f) => f.name);
    expect(gestos.sort()).toEqual(['app/_layout.tsx', 'ui/HojaDeLista.tsx']);
  });
});

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Reserva } from '@/api/apartados';
import type { Line, Listing } from '@/api/listing';
import { NADA, type LoQueUsa } from '@/api/servicios';
import {
  DIAS_ANTES_DE_OFRECER,
  DIAS_ENTRE_SERVICIOS,
  DIAS_POR_PARTE,
  DIAS_QUE_BRILLA,
  MEMORIA_VACIA,
  asiFuncionaVisible,
  asiFuncionaVisto,
  cambiarMemoria,
  cerrarServicio,
  clave,
  diasEntre,
  hayDe,
  leerMemoria,
  memoriaDe,
  nuncaPublico,
  ofertaFestejada,
  primeraDe,
  ofertaDeEstreno,
  primerasDe,
  verHoy,
  type EntradaDeHoy,
  type Memoria,
} from '@/lib/empujones';
import { ICONO_DE_PENDIENTE, PENDIENTES, type Estado } from '@/lib/hoy';
import type { Elegible } from '@/lib/loQueUsas';
import type { DeviceStore } from '@/lib/store';
import { ES } from '@/strings';

// ============================================================================
// THE NUDGES AND THE FIRSTS. Plan task `10.9a-iii`, the owner's rulings of 2026-11-16 and 17 (G31,
// G32 and the nudges; the family-shell page, round 7): what *Hoy* invites, when, and what this phone
// remembers of it — pure, against a calendar.
//
// ⚠️ IN MEXICO CITY'S ZONE, ASSERTED TO HAVE TAKEN (`test/hoy.test.ts`'s rule): "today" is the
// phone's day, and a day boundary checked under UTC proves nothing. The calendar: November 2026 —
// Monday the 16th is her first day. ⚠️ EVERY LOCAL MOMENT IS BUILT INSIDE ITS `it`, after the pin.
// ⚠️ WHAT THIS CANNOT SEE: that the line, the glow, the tiles or a celebration draw — the phone is
// their instrument (ADR-035 §2.11). The screens' wiring is read as text at the foot.
// ============================================================================

let before: string | undefined;
beforeAll(() => {
  before = process.env.TZ;
  process.env.TZ = 'America/Mexico_City';
});
afterAll(() => {
  if (before === undefined) delete process.env.TZ;
  else process.env.TZ = before;
});

/** A local moment in November 2026. */
const nov = (day: number, hour = 16, minute = 0) => new Date(2026, 10, day, hour, minute);

const linea = (name: string): Line => ({
  name,
  description: null,
  tags: [],
  priceCentavos: 6500,
  count: 8,
  surprise: false,
  usualCentavos: 12000,
  imagePath: null,
  llevar: true,
  aqui: false,
});

/** An offer of hers on `day`, 17:00 to 19:00, published at 16:40. */
function oferta(id: string, day: number, withdrawnAt: Date | null = null): Listing {
  return {
    id,
    placeId: 'place-1',
    start: nov(day, 17),
    end: nov(day, 19),
    createdAt: nov(day, 16, 40),
    withdrawnAt,
    desechableCentavos: null,
    lines: [linea('Comida corrida')],
  };
}

/** Her page with the sentence and the cover missing — what a new kitchen has after the sign-up. */
const SIN_FRASE_NI_PORTADA: Estado = { giro: true, direccion: true, frase: false, oferta: true, portada: false };
const COMPLETA: Estado = { giro: true, direccion: true, frase: true, oferta: true, portada: true };

function entrada(over: Partial<EntradaDeHoy> & { ahora: Date }): EntradaDeHoy {
  return { listings: [], estado: COMPLETA, loQueUsa: NADA, paginaCerrada: false, hechos: [], ...over };
}

/** What she sees at `x.ahora`, with today's marks made — as *Hoy* does on every open. */
function abrir(m: Memoria, x: EntradaDeHoy) {
  const vista = verHoy(m, x);
  return { vista, memoria: vista.registrar(m) };
}

function memoriaDelTelefono(): DeviceStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

describe('the calendar these cases are written against', () => {
  it('is Mexico City’s, and 16 November 2026 is a Monday', () => {
    expect(nov(16).getTimezoneOffset()).toBe(360);
    expect(nov(16).getDay()).toBe(1);
    expect(diasEntre('2026-11-16', '2026-11-30')).toBe(14);
    expect(diasEntre('2026-11-28', '2026-12-05')).toBe(7);
    expect(nov(31, 18)).toEqual(new Date(2026, 11, 1, 18));
  });
});

describe('the record — this phone’s, one per kitchen, nothing sent anywhere', () => {
  it('kept under a key of its own per kitchen; what it cannot read is an empty record, never an error', () => {
    expect(clave('k-1')).toBe('wera-cocina.hoy.empujones.k-1');
    expect(memoriaDe(null)).toEqual(MEMORIA_VACIA);
    expect(memoriaDe('{not json')).toEqual(MEMORIA_VACIA);
    expect(memoriaDe('[1,2]')).toEqual(MEMORIA_VACIA);
    // An unknown part, a bad day and a fourth glow day are left out.
    const leida = memoriaDe(
      JSON.stringify({
        desde: '2026-11-16',
        sinOferta: ['2026-11-16', 'ayer', '2026-11-17', '2026-11-18', '2026-11-19'],
        pagina: { frase: ['2026-11-16'], logo: ['2026-11-16'] },
        servicio: { tarjeta: { dia: '2026-11-30', cerrado: true }, menu: { dia: '2026-11-30' } },
        apartado: 'cero',
        entrega: 'quizá',
        vistos: ['tarjeta', 'menu'],
      }),
    );
    expect(leida).toEqual({
      desde: '2026-11-16',
      sinOferta: ['2026-11-16', '2026-11-17', '2026-11-18'],
      pagina: { frase: ['2026-11-16'] },
      servicio: { tarjeta: { dia: '2026-11-30', cerrado: true } },
      oferta: false,
      apartado: 'cero',
      entrega: null,
      vistos: ['tarjeta'],
    });
  });

  it('⚠️ read, changed and written at once — a copy held elsewhere never writes its old fields back; written only when it changed', () => {
    const store = memoriaDelTelefono();
    const deHoy = leerMemoria(store, 'k-1'); // *Hoy*'s copy, read at mount
    cambiarMemoria(store, 'k-1', (m) => ({ ...m, apartado: 'cero' })); // the tabs' layout
    cambiarMemoria(store, 'k-1', (m) => ({ ...m, desde: '2026-11-16' })); // *Hoy* marks its day on the fresh record
    expect(deHoy.apartado).toBeNull();
    expect(leerMemoria(store, 'k-1')).toMatchObject({ apartado: 'cero', desde: '2026-11-16' });
    expect(leerMemoria(store, 'k-2')).toEqual(MEMORIA_VACIA);
    const escrito = store.map.get(clave('k-1'));
    let escrituras = 0;
    const contada: DeviceStore = { ...store, setItem: (k, v) => ((escrituras += 1), store.setItem(k, v)) };
    cambiarMemoria(contada, 'k-1', (m) => m);
    cambiarMemoria(contada, 'k-1', (m) => ({ ...m }));
    expect(escrituras).toBe(0);
    expect(store.map.get(clave('k-1'))).toBe(escrito);
  });

  it('a store that fails reads as an empty record, and a write that fails is swallowed', () => {
    const roto: DeviceStore = {
      getItem: () => {
        throw new Error('disk');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('disk');
      },
    };
    expect(leerMemoria(roto, 'k-1')).toEqual(MEMORIA_VACIA);
    expect(() => cambiarMemoria(roto, 'k-1', (m) => ({ ...m, oferta: true }))).not.toThrow();
    expect(leerMemoria(undefined, 'k-1')).toEqual(MEMORIA_VACIA);
  });
});

describe('until her first offer: the invitation, and Publicar glows on her first three days', () => {
  it('she never published — no offer, or only one taken back by Deshacer', () => {
    expect(nuncaPublico([])).toBe(true);
    expect(nuncaPublico([oferta('d', 16, nov(16, 16, 40))])).toBe(true);
    expect(nuncaPublico([oferta('a', 10)])).toBe(false);
    expect(verHoy(MEMORIA_VACIA, entrada({ ahora: nov(16) })).invitacion).toBe(true);
    expect(verHoy(MEMORIA_VACIA, entrada({ ahora: nov(16), listings: [oferta('a', 10)] })).invitacion).toBe(false);
  });

  it('glows at every open of her first three days with none — days she opened the app, not days on the calendar', () => {
    let m = MEMORIA_VACIA;
    const brilla: boolean[] = [];
    for (const at of [nov(16, 9), nov(16, 18), nov(17), nov(20), nov(21, 8), nov(21, 20), nov(22)]) {
      const { vista, memoria } = abrir(m, entrada({ ahora: at }));
      brilla.push(vista.brilla);
      m = memoria;
    }
    // Monday twice, Tuesday, (nothing Wed–Thu), Friday — then Saturday is her fourth day.
    expect(brilla).toEqual([true, true, true, true, false, false, false]);
    expect(m.sinOferta).toEqual(['2026-11-16', '2026-11-17', '2026-11-20']);
    expect(m.desde).toBe('2026-11-16');
    expect(DIAS_QUE_BRILLA).toBe(3);
  });

  it('never once she has an offer — the invitation and the glow both go', () => {
    const { memoria } = abrir(MEMORIA_VACIA, entrada({ ahora: nov(16) }));
    const vista = verHoy(memoria, entrada({ ahora: nov(16, 18), listings: [oferta('a', 16)] }));
    expect([vista.invitacion, vista.brilla]).toEqual([false, false]);
  });

  it('today’s marks are the same however often they are made, and named by one string', () => {
    const x = entrada({ ahora: nov(16) });
    const vista = verHoy(MEMORIA_VACIA, x);
    const una = vista.registrar(MEMORIA_VACIA);
    expect(vista.registrar(una)).toEqual(una);
    expect(vista.marca).toBe('2026-11-16|nunca|-');
    expect(verHoy(una, x).marca).toBe(vista.marca);
  });
});

describe('her first offer, celebrated — and never again', () => {
  it('only when she never published, this phone never celebrated it, and her list is read', () => {
    expect(ofertaDeEstreno(MEMORIA_VACIA, [])).toBe(true);
    expect(ofertaDeEstreno(MEMORIA_VACIA, [oferta('d', 16, nov(16, 16, 40))])).toBe(true);
    expect(ofertaDeEstreno(MEMORIA_VACIA, undefined)).toBe(false);
    expect(ofertaDeEstreno(MEMORIA_VACIA, [oferta('a', 10)])).toBe(false);
    // Taken back by Deshacer and published again: not a second first.
    expect(ofertaDeEstreno(ofertaFestejada(MEMORIA_VACIA), [oferta('d', 16, nov(16, 16, 40))])).toBe(false);
    expect(ES.festejo.oferta).toBe('¡Ya te ven en Itacate!');
  });
});

describe('her page’s missing parts — one quiet line, one part at a time, on days she publishes, three days each', () => {
  it('nothing before her first offer, nothing on a day she did not publish', () => {
    expect(verHoy(MEMORIA_VACIA, entrada({ ahora: nov(16), estado: SIN_FRASE_NI_PORTADA })).linea).toBeNull();
    const ayer = entrada({ ahora: nov(17), estado: SIN_FRASE_NI_PORTADA, listings: [oferta('a', 16)] });
    expect(verHoy(MEMORIA_VACIA, ayer).linea).toBeNull();
  });

  it('the parts in the page’s order, each on three days she publishes, then the next; then nothing', () => {
    let m = MEMORIA_VACIA;
    const vistas: (string | null)[] = [];
    const listings: Listing[] = [];
    for (const day of [16, 17, 18, 19, 20, 21, 23, 24]) {
      listings.push(oferta(`o-${day}`, day));
      // Twice each day she publishes: the second open does not count a second day.
      for (const hour of [17, 18]) {
        const { vista, memoria } = abrir(m, entrada({ ahora: nov(day, hour), estado: SIN_FRASE_NI_PORTADA, listings: [...listings] }));
        if (hour === 18) vistas.push(vista.linea?.kind === 'pagina' ? vista.linea.pendiente : null);
        m = memoria;
      }
    }
    expect(vistas).toEqual(['frase', 'frase', 'frase', 'portada', 'portada', 'portada', null, null]);
    expect(m.pagina).toEqual({
      frase: ['2026-11-16', '2026-11-17', '2026-11-18'],
      portada: ['2026-11-19', '2026-11-20', '2026-11-21'],
    });
    expect(DIAS_POR_PARTE).toBe(3);
  });

  it('a part done drops out at once; the line opens where it is done', () => {
    const conFrase: Estado = { ...SIN_FRASE_NI_PORTADA, frase: true };
    const linea = verHoy(MEMORIA_VACIA, entrada({ ahora: nov(16, 18), estado: conFrase, listings: [oferta('a', 16)] })).linea;
    expect(linea).toEqual({ kind: 'pagina', pendiente: 'portada', abre: '/pagina' });
    const sinGiro: Estado = { ...COMPLETA, giro: false };
    expect(verHoy(MEMORIA_VACIA, entrada({ ahora: nov(16, 18), estado: sinGiro, listings: [oferta('a', 16)] })).linea).toEqual({
      kind: 'pagina',
      pendiente: 'nombreGiro',
      abre: '/giro',
    });
  });

  it('✕ ends it for good; and it waits for every read it counts', () => {
    const hoy = { ahora: nov(16, 18), estado: SIN_FRASE_NI_PORTADA, listings: [oferta('a', 16)] };
    expect(verHoy(MEMORIA_VACIA, entrada({ ...hoy, paginaCerrada: true })).linea).toBeNull();
    expect(verHoy(MEMORIA_VACIA, entrada({ ...hoy, estado: null })).linea).toBeNull();
    expect(verHoy(MEMORIA_VACIA, entrada({ ...hoy, loQueUsa: null })).linea).toBeNull();
  });

  it('the words: the photo’s the page’s, one per part — never her first offer, which is the invitation’s', () => {
    expect(ES.empujon.pagina.portada).toBe('Agrega una foto de tu cocina');
    expect(Object.keys(ES.empujon.pagina).sort()).toEqual(['direccion', 'frase', 'nombreGiro', 'portada']);
    expect(ES.invitacion).toEqual({ titulo: '¿Tienes alguna oferta?', texto: 'Publícala y tus vecinos la verán.' });
  });
});

describe('a feature she did not pick — off Hoy two weeks, then one line each, on one day, a week apart', () => {
  const ofrece = (elecciones: LoQueUsa['elecciones'] = {}): LoQueUsa => ({
    ...NADA,
    ofrecidos: ['tarjeta', 'promociones', 'numeros'],
    elecciones,
  });
  const hechos: Elegible[] = ['tarjeta', 'numeros'];

  /** Her *Hoy* opened each day she publishes, her first day Monday the 16th (`nov(31)` is 1 December). */
  function recorrido(days: readonly number[], loQueUsa: LoQueUsa, cerrar: number | null = null) {
    let m: Memoria = { ...MEMORIA_VACIA, desde: '2026-11-16' };
    const vistos: (string | null)[] = [];
    for (const day of days) {
      const x = entrada({ ahora: nov(day, 18), listings: [oferta(`o-${day}`, day)], loQueUsa, hechos });
      const { vista, memoria } = abrir(m, x);
      m = memoria;
      vistos.push(vista.linea?.kind === 'servicio' ? vista.linea.servicio : null);
      if (day === cerrar && vista.linea?.kind === 'servicio') {
        m = cerrarServicio(m, vista.linea.servicio, true);
        vistos.push(verHoy(m, x).linea === null ? 'cerrada' : 'abierta');
      }
    }
    return { vistos, m };
  }

  it('nothing for two weeks; then the card on one day, a week later her numbers; promotions never — not built here', () => {
    const { vistos, m } = recorrido([29, 30, 31, 36, 37, 38, 44], ofrece());
    // 29 Nov is day 13; 30 Nov day 14 — the card, again later that day; 1 Dec none (its day was the 30th);
    // 6 Dec is six days on; 7 Dec a week on — her numbers; 8 Dec and 14 Dec nothing left.
    expect(vistos).toEqual([null, 'tarjeta', null, null, 'numeros', null, null]);
    expect(m.servicio).toEqual({ tarjeta: { dia: '2026-11-30', cerrado: false }, numeros: { dia: '2026-12-07', cerrado: false } });
    expect([DIAS_ANTES_DE_OFRECER, DIAS_ENTRE_SERVICIOS]).toEqual([14, 7]);
  });

  it('✕ takes it away for the rest of its day, with Deshacer; a feature she uses is never offered', () => {
    const { vistos } = recorrido([30], ofrece(), 30);
    expect(vistos).toEqual(['tarjeta', 'cerrada']);
    const m = cerrarServicio({ ...MEMORIA_VACIA, servicio: { tarjeta: { dia: '2026-11-30', cerrado: true } } }, 'tarjeta', false);
    expect(m.servicio.tarjeta).toEqual({ dia: '2026-11-30', cerrado: false });
    const usa = recorrido([30, 37], ofrece({ tarjeta: { estado: 'on', desde: nov(16) } }));
    expect(usa.vistos).toEqual(['numeros', null]);
  });

  it('⚠️ never in this build: no feature is built, so nothing is offered however long she waits', () => {
    const x = entrada({ ahora: nov(30, 18), listings: [oferta('a', 30)], loQueUsa: ofrece() });
    const { hechos: _ignorado, ...sinHechos } = x;
    expect(verHoy({ ...MEMORIA_VACIA, desde: '2026-11-01' }, sinHechos).linea).toBeNull();
  });

  it('her page comes first: at most one line on Hoy', () => {
    const x = entrada({ ahora: nov(30, 18), estado: SIN_FRASE_NI_PORTADA, listings: [oferta('a', 30)], loQueUsa: ofrece(), hechos });
    expect(verHoy({ ...MEMORIA_VACIA, desde: '2026-11-01' }, x).linea?.kind).toBe('pagina');
    expect(verHoy({ ...MEMORIA_VACIA, desde: '2026-11-01' }, { ...x, paginaCerrada: true }).linea?.kind).toBe('servicio');
  });

  it('the words are the page’s, each opening its Activar', () => {
    expect(ES.empujon.servicio).toEqual({
      tarjeta: '¿Quieres que regresen? Prueba la tarjeta de lealtad',
      promociones: '¿Algo nuevo que contar? Prueba las promociones',
      numeros: '¿Quieres saber cómo te va? Mira tus números',
    });
    const x = entrada({ ahora: nov(30, 18), listings: [oferta('a', 30)], loQueUsa: ofrece(), hechos });
    expect(verHoy({ ...MEMORIA_VACIA, desde: '2026-11-01' }, x).linea).toEqual({ kind: 'servicio', servicio: 'tarjeta', abre: '/activar/tarjeta' });
  });
});

describe('her first reservation and her first handover — only a first this phone saw the zero of', () => {
  const sin = (n: number): Reserva[] => Array.from({ length: n }, () => ({ entregadaEn: null }) as Reserva);
  const entregada = { entregadaEn: nov(16, 18) } as Reserva;

  it('one first, read again', () => {
    expect(primeraDe(null, false)).toEqual({ ahora: 'cero', festejar: false });
    expect(primeraDe('cero', false)).toEqual({ ahora: 'cero', festejar: false });
    expect(primeraDe('cero', true)).toEqual({ ahora: 'hecha', festejar: true });
    expect(primeraDe(null, true)).toEqual({ ahora: 'hecha', festejar: false });
    expect(primeraDe('hecha', true)).toEqual({ ahora: 'hecha', festejar: false });
    expect(primeraDe('hecha', false)).toEqual({ ahora: 'hecha', festejar: false });
  });

  it('her history read empty, then a reservation, then its handover: two celebrations, then none', () => {
    let m = MEMORIA_VACIA;
    const festejos: (string | null)[] = [];
    for (const reservas of [sin(0), sin(0), sin(1), sin(2), [entregada, ...sin(1)], [entregada]]) {
      const r = primerasDe(m, hayDe(reservas));
      festejos.push(r.festejo);
      m = r.memoria;
    }
    expect(festejos).toEqual([null, null, 'apartado', null, 'entrega', null]);
    expect([ES.festejo.apartado, ES.festejo.entrega]).toEqual(['¡Tu primer apartado!', '¡Tu primera entrega!']);
  });

  it('⚠️ a phone that meets her history already holding one celebrates nothing; both in one read is the handover’s', () => {
    expect(primerasDe(MEMORIA_VACIA, hayDe([entregada])).festejo).toBeNull();
    const cero = primerasDe(MEMORIA_VACIA, hayDe([])).memoria;
    expect(primerasDe(cero, hayDe([entregada])).festejo).toBe('entrega');
    expect(primerasDe(cero, hayDe([entregada])).memoria).toMatchObject({ apartado: 'hecha', entrega: 'hecha' });
    // Nothing new: the very same record, so nothing is written.
    expect(primerasDe(cero, hayDe([])).memoria).toBe(cero);
  });
});

describe('Así funciona — until she uses the feature or closes it, on this phone', () => {
  it('shows, then never again for that feature', () => {
    expect(asiFuncionaVisible(MEMORIA_VACIA, 'tarjeta')).toBe(true);
    const visto = asiFuncionaVisto(MEMORIA_VACIA, 'tarjeta');
    expect(asiFuncionaVisible(visto, 'tarjeta')).toBe(false);
    expect(asiFuncionaVisible(visto, 'numeros')).toBe(true);
    expect(asiFuncionaVisto(visto, 'tarjeta')).toBe(visto);
  });

  it('three pictures per feature, the page’s words', () => {
    for (const pasos of Object.values(ES.asiFunciona.pasos)) expect(pasos).toHaveLength(3);
    expect(ES.asiFunciona.pasos.tarjeta).toEqual(['Eliges tu premio y cuántos sellos', 'Te enseñan su código, o escanean el tuyo', 'Al completarla, le das su premio']);
    expect(ES.asiFunciona.titulo).toBe('Así funciona');
  });
});

describe('the pictures are in the icon set the app draws with', () => {
  const GLYPHS = JSON.parse(
    readFileSync(
      createRequire(import.meta.url).resolve('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'),
      'utf8',
    ),
  ) as Record<string, number>;
  it('each part of her page', () => {
    for (const p of PENDIENTES) expect(GLYPHS[ICONO_DE_PENDIENTE[p]], ICONO_DE_PENDIENTE[p]).toBeTypeOf('number');
  });
});

// ----------------------------------------------------------------------------
// The wiring, read as text — whether it draws is the phone's to show.
// ----------------------------------------------------------------------------

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const code = (path: string) =>
  readFileSync(join(SRC, path), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

describe('the wiring', () => {
  it('Hoy marks today once each time what it marks changes, and *Cuéntanos* is not its line', () => {
    const hoy = code('app/(cocina)/(tabs)/index.tsx');
    expect(hoy).toMatch(/useEffect\(\(\) => \{\s*if \(vista !== null\) cambiar\(vista\.registrar\);\s*\}, \[marca, cambiar\]\);/);
    expect(hoy).toMatch(/verHoy\(memoria, \{ listings: listings\.data, estado, loQueUsa: servicios\.data \?\? null, paginaCerrada: cerrada, ahora \}\)/);
    expect(hoy.match(/<LineaEmpujon/g)).toHaveLength(1);
    // A feature's ✕ has its Deshacer.
    expect(hoy).toMatch(/avisar\(ES\.empujon\.servicioQuitado, \(\) => cambiar\(\(m\) => cerrarServicio\(m, linea\.servicio, false\)\)\);/);
  });

  it('her first offer is read BEFORE it is sent, and keeps its Deshacer', () => {
    const publicar = code('app/(cocina)/publicar.tsx');
    const lee = publicar.indexOf('const estreno = ofertaDeEstreno(leerMemoria(deviceStore(), kitchen.id), listings.data);');
    expect(lee).toBeGreaterThan(0);
    expect(lee).toBeLessThan(publicar.indexOf('await publish('));
    expect(publicar).toMatch(/avisarPublicada\(estreno \? ES\.festejo\.oferta : ES\.nota\.publicaste\(nombreDe\(\{ lines: body\.p_lines \}\)\), kitchen\.id, id, estreno\);/);
  });

  it('her first reservation and handover are watched once, from the tabs’ layout, on the read it already makes', () => {
    const layout = code('app/(cocina)/(tabs)/_layout.tsx');
    expect(layout).toMatch(/useFestejos\(kitchen\?\.id \?\? null, apartados\.data\?\.reservas\);/);
    const hook = code('lib/useFestejos.ts');
    expect(hook).toMatch(/\}, \[kitchenId, apartado, entrega, festejar\]\);/);
    expect(hook).toMatch(/if \(festejo !== null\) festejar\(ES\.festejo\[festejo\]\);/);
  });

  it('a celebration is the toast in the green, with the cow', () => {
    const nota = code('ui/Nota.tsx');
    expect(nota).toMatch(/backgroundColor: festejo \? PALETTE\.accion : PALETTE\.tinta/);
    expect(nota).toMatch(/const VACA = require\('@\/marca\/vaca-crema\.png'\) as number;/);
    expect(code('lib/NotaProvider.tsx')).toMatch(/festejar: \(texto\) => mostrar\(texto, null, true\),/);
  });
});

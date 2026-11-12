import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Line, Listing } from '@/api/listing';
import {
  OFERTAS_ANTES_DE_PREGUNTAR,
  PREFIJO,
  RUTA,
  TOQUE_VIGENTE_MS,
  aLaMediaHora,
  claveRecordatorio,
  costumbreDe,
  cuandoTexto,
  diaDeExpo,
  diasDeCostumbre,
  diasTexto,
  disparosDe,
  guardarRecordatorio,
  horasDe,
  horaTexto,
  leerRecordatorio,
  milisegundosDe,
  preguntar,
  propuestaDe,
  rutaDelToque,
  type Dia,
} from '@/lib/recordatorio';
import type { DeviceStore } from '@/lib/store';
import { ES } from '@/strings';

// ============================================================================
// HER REMINDER. Plan task `10.5-v-c-ii`, the owner's ruling of 2026-11-05 (call 21: *"the
// middle hour of two weeks, rounded down to the half hour, on the days she published at
// least twice; asked after her third offer"*) and the family-shell page's round 6 — the
// rule, the words, what her phone is handed to schedule, what a tap opens, and where it
// is wired, read as text.
//
// ⚠️ IN MEXICO CITY'S ZONE, asserted to have taken, as `test/hoy.test.ts`: her hour and
// her days are the phone's local time. The calendar: Friday 6 November 2026, 16:20. Every
// local moment is built inside its `it`.
// ⚠️ WHAT THIS CANNOT SEE: that a notification fires at her hour on her days, that Android
// 13 asks, that a tap opens *Publicar* — the phone over days is the instrument (ADR-035
// §2.11), and the session's emulator run its first evidence.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'cocina/src');
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

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
const nov = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
/** Friday 6 November 2026, 16:20. */
const ahora = () => nov(6, 16, 20);

const linea = (name = 'Comida corrida'): Line => ({
  name,
  description: null,
  tags: [],
  priceCentavos: 6500,
  count: 8,
  surprise: false,
  usualCentavos: null,
  imagePath: null,
  llevar: true,
  aqui: false,
});
let n = 0;
/** One she published at `creada`, for that evening. */
function pub(creada: Date, extra: Partial<Listing> = {}): Listing {
  n += 1;
  const start = new Date(creada.getTime() + 60 * 60_000);
  return { id: `r${n}`, placeId: 'p1', start, end: new Date(start.getTime() + 2 * 3_600_000), createdAt: creada, withdrawnAt: null, desechableCentavos: null, lines: [linea()], ...extra };
}

/**
 * Her usual fortnight: Monday to Saturday from Saturday 24 October to Friday 6 November, each at
 * 16:00 plus the next of `minutos` — twelve offers, every weekday but Sunday on two dates.
 */
function dosSemanas(minutos: readonly number[]): Listing[] {
  const dias = [
    new Date(2026, 9, 24), new Date(2026, 9, 26), new Date(2026, 9, 27), new Date(2026, 9, 28), new Date(2026, 9, 29),
    new Date(2026, 9, 30), new Date(2026, 9, 31), nov(2, 0), nov(3, 0), nov(4, 0), nov(5, 0), nov(6, 0),
  ];
  return dias.map((dia, i) => pub(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 16, minutos[i % minutos.length])));
}

describe('the zone is pinned', () => {
  it('Mexico City, UTC−6 in November', () => {
    expect(ahora().getTimezoneOffset()).toBe(360);
  });
});

describe('her hour — the middle of two weeks, rounded down to the half hour', () => {
  it('*16:10* is *16:00*; *16:30* stays; *16:59* is *16:30*', () => {
    expect(aLaMediaHora(16 * 60 + 10)).toBe(16 * 60);
    expect(aLaMediaHora(16 * 60 + 30)).toBe(16 * 60 + 30);
    expect(aLaMediaHora(16 * 60 + 59)).toBe(16 * 60 + 30);
    expect(aLaMediaHora(0)).toBe(0);
  });

  it('the middle of her moments: the middle one of an odd count, the earlier middle of an even one', () => {
    const now = ahora();
    expect(costumbreDe([pub(nov(4, 15, 0)), pub(nov(5, 16, 10)), pub(nov(3, 18, 0))], now)).toBe(16 * 60 + 10);
    // One made after `now` is not hers yet.
    expect(costumbreDe([pub(nov(4, 15, 0)), pub(nov(5, 16, 10)), pub(nov(6, 18, 0))], now)).toBe(15 * 60);
    expect(costumbreDe([pub(nov(3, 15, 0)), pub(nov(4, 16, 10)), pub(nov(5, 16, 40)), pub(nov(6, 9, 0))], now)).toBe(15 * 60);
    expect(costumbreDe([], now)).toBeNull();
  });

  it('only her last two weeks count — and never an offer taken back by *Deshacer*', () => {
    const now = ahora();
    // Two weeks before Friday 16:20 is Friday 23 October 16:20: these three are older.
    const viejas = [pub(new Date(2026, 9, 23, 16, 19)), pub(new Date(2026, 9, 20, 9)), pub(new Date(2026, 9, 21, 9))];
    const deshecha = pub(nov(6, 9), { withdrawnAt: nov(6, 9, 0) });
    expect(costumbreDe([...viejas, deshecha, pub(nov(5, 17, 0))], now)).toBe(17 * 60);
  });
});

describe('her days — the weekdays she published on two different dates in two weeks', () => {
  it('Monday to Saturday of a usual fortnight; never Sunday, which she rests', () => {
    expect(diasDeCostumbre(dosSemanas([10]), ahora())).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('twice the same Monday is one Monday', () => {
    const now = ahora();
    expect(diasDeCostumbre([pub(nov(2, 12)), pub(nov(2, 17))], now)).toEqual([]);
    expect(diasDeCostumbre([pub(nov(2, 12)), pub(new Date(2026, 9, 26, 17))], now)).toEqual([1]);
  });
});

describe('when *Hoy* asks', () => {
  it('after her third offer — never before, and never on her first day', () => {
    const now = ahora();
    expect(OFERTAS_ANTES_DE_PREGUNTAR).toBe(3);
    const dos = [pub(nov(5, 16, 10)), pub(nov(6, 16, 10))];
    expect(propuestaDe(dos, now)).toBeNull();
    const primerDia = [pub(nov(6, 12)), pub(nov(6, 14)), pub(nov(6, 16))];
    expect(propuestaDe(primerDia, now)).toBeNull(); // three offers, one date: no day yet
  });

  it('with her hour and her days once the rule finds both — *¿Te recordamos a las 16:00, de lunes a sábado?*', () => {
    const now = ahora();
    const propuesta = propuestaDe(dosSemanas([10, 5, 20]), now);
    expect(propuesta).toEqual({ costumbre: 16 * 60 + 10, hora: 16 * 60, dias: [1, 2, 3, 4, 5, 6] });
    expect(ES.recordatorio.pregunta(horaTexto(propuesta!.hora), diasTexto(propuesta!.dias))).toBe('¿Te recordamos a las 16:00, de lunes a sábado?');
    expect(ES.recordatorio.costumbre(horaTexto(propuesta!.costumbre))).toBe('Sueles publicar hacia las 16:10.');
  });

  it('offers taken back by *Deshacer* never make the three', () => {
    const now = ahora();
    const deshechas = [1, 2, 3].map((d) => pub(nov(d, 16), { withdrawnAt: nov(d, 16, 0) }));
    expect(propuestaDe([...deshechas, pub(new Date(2026, 9, 26, 16)), pub(nov(2, 16, 30))], now)).toBeNull();
  });

  it('once, whatever she answered — the ✕ included', () => {
    const propuesta = { costumbre: 970, hora: 960, dias: [1, 2] as Dia[] };
    expect(preguntar(null, propuesta)).toBe(true);
    expect(preguntar({ encendido: false, hora: 960, dias: [1] }, propuesta)).toBe(false);
    expect(preguntar({ encendido: true, hora: 960, dias: [1] }, propuesta)).toBe(false);
    expect(preguntar(null, null)).toBe(false);
  });
});

describe('the words', () => {
  it('her days: all of them, three or more in a row, else each', () => {
    expect(diasTexto([1, 2, 3, 4, 5, 6, 7])).toBe('todos los días');
    expect(diasTexto([1, 2, 3, 4, 5, 6])).toBe('de lunes a sábado');
    expect(diasTexto([1, 2, 3, 4, 5])).toBe('de lunes a viernes');
    expect(diasTexto([5, 6, 7])).toBe('de viernes a domingo');
    expect(diasTexto([1, 4])).toBe('los lunes y jueves');
    expect(diasTexto([1, 3, 5])).toBe('los lunes, miércoles y viernes');
    expect(diasTexto([6])).toBe('los sábados');
    expect(diasTexto([1, 2])).toBe('los lunes y martes');
  });

  it('the clock is Wera Cocina’s — *16:00*, *9:30*', () => {
    expect(horaTexto(16 * 60)).toBe('16:00');
    expect(horaTexto(9 * 60 + 30)).toBe('9:30');
    expect(cuandoTexto({ hora: 16 * 60, dias: [1, 2, 3, 4, 5, 6] })).toBe('A las 16:00, de lunes a sábado');
  });

  it('the notification is the page’s: *¿Qué ofreces hoy?* · *Publica tu oferta en un minuto.*', () => {
    expect(ES.recordatorio.avisoTitulo).toBe('¿Qué ofreces hoy?');
    expect(ES.recordatorio.avisoTexto).toBe('Publica tu oferta en un minuto.');
    expect(ES.recordatorio.si).toBe('Sí, recuérdame');
    expect(ES.recordatorio.otraHora).toBe('Otra hora');
    expect(ES.recordatorio.noGracias).toBe('No, gracias');
    expect(ES.recordatorio.titulo).toBe('Recordatorio diario');
  });

  it('*Otra hora*: half an hour before hers, hers, and the next two — inside the day', () => {
    expect(horasDe(16 * 60).map(horaTexto)).toEqual(['15:30', '16:00', '16:30', '17:00']);
    expect(horasDe(0).map(horaTexto)).toEqual(['0:00', '0:30', '1:00']);
    expect(horasDe(23 * 60 + 30).map(horaTexto)).toEqual(['23:00', '23:30']);
  });
});

describe('what her phone is handed — one notification per day, every week', () => {
  it('Expo counts its weekdays from Sunday: Monday is 2, Saturday 7, Sunday 1', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => diaDeExpo(d as Dia))).toEqual([2, 3, 4, 5, 6, 7, 1]);
  });

  it('her days at her hour, each under its own name — none while it is off', () => {
    expect(disparosDe({ encendido: true, hora: 16 * 60 + 30, dias: [1, 6] })).toEqual([
      { id: `${PREFIJO}1`, weekday: 2, hour: 16, minute: 30 },
      { id: `${PREFIJO}6`, weekday: 7, hour: 16, minute: 30 },
    ]);
    expect(disparosDe({ encendido: false, hora: 960, dias: [1] })).toEqual([]);
    expect(disparosDe(null)).toEqual([]);
  });

  it('a tap opens *Publicar* — for one of hers, within the hour, on either phone’s clock', () => {
    const now = Date.UTC(2026, 10, 6, 22, 0);
    expect(RUTA).toBe('/publicar');
    expect(TOQUE_VIGENTE_MS).toBe(3_600_000);
    // Android sends milliseconds, an iPhone seconds.
    expect(milisegundosDe(now)).toBe(now);
    expect(milisegundosDe(now / 1000)).toBe(now);
    const ok = { id: `${PREFIJO}5`, date: now - 60_000, ruta: RUTA };
    expect(rutaDelToque(ok, now)).toBe('/publicar');
    expect(rutaDelToque({ ...ok, date: (now - 60_000) / 1000 }, now)).toBe('/publicar');
    expect(rutaDelToque({ ...ok, date: now - 2 * 3_600_000 }, now)).toBeNull();
    expect(rutaDelToque({ ...ok, id: 'otra-cosa' }, now)).toBeNull();
    expect(rutaDelToque({ ...ok, ruta: '/mi-cocina' }, now)).toBeNull();
  });
});

describe('kept on this phone, per kitchen', () => {
  function memoria(): DeviceStore & { readonly data: Map<string, string> } {
    const data = new Map<string, string>();
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
  }

  it('her answer, read back as it was written; another kitchen’s is its own', () => {
    const store = memoria();
    guardarRecordatorio(store, 'k1', { encendido: true, hora: 960, dias: [6, 1] });
    expect(leerRecordatorio(store, 'k1')).toEqual({ encendido: true, hora: 960, dias: [1, 6] });
    expect(leerRecordatorio(store, 'k2')).toBeNull();
    expect(claveRecordatorio('k1')).toBe('wera-cocina.recordatorio.k1');
  });

  it('anything this build cannot read is no answer — the question comes back, never a broken screen', () => {
    const store = memoria();
    for (const basura of ['{', '"si"', '{"encendido":"si","hora":960,"dias":[1]}', '{"encendido":true,"hora":1440,"dias":[1]}', '{"encendido":true,"hora":960,"dias":[]}', '{"encendido":true,"hora":960,"dias":[8]}']) {
      store.setItem(claveRecordatorio('k1'), basura);
      expect(leerRecordatorio(store, 'k1'), basura).toBeNull();
    }
    expect(leerRecordatorio(undefined, 'k1')).toBeNull();
  });
});

describe('the wiring, read as text', () => {
  function sources(dir = SRC): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
    });
  }

  it('one module asks for notifications — and never for a push token', () => {
    const importers = sources()
      .filter((path) => /from 'expo-notifications'/.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(SRC.length + 1));
    expect(importers).toEqual(['lib/avisos.ts']);
    expect(code('lib/avisos.ts')).not.toMatch(/PushToken|registerTaskAsync|setNotificationHandler/);
  });

  it('a weekly trigger on her channel, the channel made before the permission is asked', () => {
    const avisos = code('lib/avisos.ts');
    expect(avisos).toMatch(/type: Notifications\.SchedulableTriggerInputTypes\.WEEKLY,\s*channelId: CANAL,/);
    expect(avisos).toMatch(/await asegurarCanal\(\);\s*const ahora = await Notifications\.getPermissionsAsync\(\);/);
    expect(avisos).toMatch(/content: \{ title: ES\.recordatorio\.avisoTitulo, body: ES\.recordatorio\.avisoTexto, data: \{ ruta: RUTA \} \}/);
    expect(avisos).toMatch(/cola = cola\.then\(paso, paso\);/);
  });

  it('held above both tabs, and cancelled when they leave', () => {
    const tabs = code('app/(cocina)/(tabs)/_layout.tsx');
    expect(tabs).toMatch(/<RecordatorioProvider kitchenId=\{kitchen\?\.id \?\? null\}>\s*<Tabs/);
    const provider = code('lib/RecordatorioProvider.tsx');
    expect(provider).toMatch(/\(\) => \(\) => \{\s*void quitarRecordatorios\(\);\s*\}/);
    expect(provider).toMatch(/useEffect\(\(\) => alTocarUnRecordatorio\(\(\) => router\.push\(RUTA\)\), \[\]\);/);
    expect(provider).toMatch(/\}, \[guardado, abierta\]\);/);
  });

  it('the question on *Hoy*, under the doors; the row in *Mi cocina*, under her trade', () => {
    const hoy = code('app/(cocina)/(tabs)/index.tsx');
    expect(hoy.indexOf('<Puertas')).toBeGreaterThan(0);
    expect(hoy.indexOf('<PreguntaRecordatorio')).toBeGreaterThan(hoy.indexOf('<Puertas'));
    expect(hoy).toMatch(/preguntar\(recordatorio\.guardado, recordatorio\.propuesta\)/);
    const mi = code('app/(cocina)/(tabs)/mi-cocina.tsx');
    expect(mi.indexOf('titulo={ES.recordatorio.titulo}')).toBeGreaterThan(mi.indexOf('titulo={ES.miCocina.giro}'));
    expect(mi.indexOf('titulo={ES.recordatorio.titulo}')).toBeLessThan(mi.indexOf('ES.miCocina.ayuda'));
  });

  it('the build carries the module, its icon and its colour, and asks for nothing more of Android than the library does', () => {
    const app = JSON.parse(readFileSync(join(ROOT, 'cocina/app.json'), 'utf8')).expo;
    const plugin = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-notifications');
    expect(plugin[1]).toEqual({ icon: '../app/assets/images/android-icon-monochrome.png', color: '#1C6B4B' });
    expect(app.android.permissions ?? []).not.toContain('android.permission.SCHEDULE_EXACT_ALARM');
  });
});

describe('the aviso says it, before the reminder ships (the row: *"the aviso changes first"*)', () => {
  const aviso = readFileSync(join(ROOT, 'site/privacidad/cocina-e-itacate/index.html'), 'utf8');

  it('no longer says no app sends notifications', () => {
    expect(aviso).not.toContain('Hoy ninguna de las dos apps envía notificaciones');
  });

  it('says her phone schedules it, from when she usually publishes, and that nothing of it reaches us', () => {
    expect(aviso).toMatch(/Tu recordatorio, en Wera Cocina/);
    expect(aviso).toMatch(/lo programa tu propio teléfono/);
    expect(aviso).toMatch(/no nos llegan/);
  });
});

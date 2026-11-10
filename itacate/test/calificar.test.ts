import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import { PLATE_PENDING_CODE, deleteErrorMessage } from '@/api/account';
import {
  BUENAS_DESDE,
  ETIQUETAS_MALAS,
  NOTA_MAXIMA,
  POR_CODIGO,
  RATE_KITCHEN,
  apartadoOf,
  calificadoFrom,
  etiquetasDeLaBanda,
  etiquetasPara,
  fallaDe,
  porCalificar,
  rateArgs,
  type Apartado,
} from '@/api/apartados';
import { ETIQUETAS_BUENAS, estrellasOf, toKitchen, type Kitchen, type KitchenRow } from '@/api/cocinas';
import { EMPTY_PAGE } from '@/api/pagina';
import { AVISO_URL, TERMINOS_URL } from '@/auth/aviso';
import { EN_USO } from '@/navigation/pestanas';
import { calificacionDe, distanciaYEstrellas, estrellasTexto, pagosDe } from '@/lib/paginas';
import { ANTES_MS, PREFIJO, RUTA, disparosDe, porVenir, rutaDelToque } from '@/lib/recordatorio';
import { ES } from '@/strings';

// ============================================================================
// AFTER THE PLATE. Plan task `10.5b-iii-b`, on `0080` (`10.5b-ii-b`) and `10.5b-ii`'s final
// design of 2026-11-10:
//   - HER STARS ABOUT THE KITCHEN (`rate_kitchen`): one to five, the tags of their band, a
//     note only Wera reads — every limit held to `0080`'s own text;
//   - A KITCHEN'S STARS, as the door sends them (`on_offer_now`'s `stars`, from five ratings,
//     good tags only), on the cards, a dish's kitchen row and her page, with her payment chips;
//   - HER REMINDER, 15 minutes before her hour, scheduled by her own phone;
//   - *ELIMINAR MI CUENTA* SAYING WHY when `TD014` refuses it; and the terms of use beside her yes.
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that `rate_kitchen`'s names and keys reach the applied
// schema — is `docs/checks/10.5b-iii-a-reserving-contract.sh`'s (its group 12). A screen, and a
// notification firing, only a phone can show (ADR-035 §2.11).
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'itacate/src');
const MIGRATIONS = join(ROOT, 'supabase/migrations');
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
/** A file's code with its comments left out. */
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const sql0080 = readFileSync(join(MIGRATIONS, readdirSync(MIGRATIONS).find((n) => n.startsWith('0080_')) as string), 'utf8');

/** A function's text as it is defined LAST. */
function definicion(nombre: string): string {
  const archivos = readdirSync(MIGRATIONS).filter((n) => /^\d{4}_.*\.sql$/.test(n)).sort().reverse();
  for (const archivo of archivos) {
    const sql = readFileSync(join(MIGRATIONS, archivo), 'utf8');
    const at = sql.search(new RegExp(`create (or replace )?function public\\.${nombre}\\(`));
    if (at >= 0) return sql.slice(at, sql.indexOf('$$;', sql.indexOf('$$', at) + 2));
  }
  throw new Error(`no migration defines ${nombre}`);
}

/** An interface's field names, as the contract checks read them. */
function campos(file: string, iface: string): string[] {
  const body = new RegExp(`export interface ${iface} \\{([\\s\\S]*?)\\n\\}`).exec(read(file))?.[1] ?? '';
  return [...body.matchAll(/^\s+readonly ([a-z_]+)\??:/gm)].map((m) => m[1]);
}

const ZONE = 'America/Mexico_City';
const before = process.env.TZ;
process.env.TZ = ZONE;
afterAll(() => {
  if (before === undefined) delete process.env.TZ;
  else process.env.TZ = before;
});

/** One of `my_reservations`' rows, as `0080` writes it. */
function fila(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'r0000000-0000-4000-8000-000000000001',
    code: 347,
    state: 'recogido',
    pickup_at: '2026-11-10T20:30:00+00:00',
    held_until: '2026-11-10T22:00:00+00:00',
    cancel_until: '2026-11-10T19:30:00+00:00',
    payment: 'efectivo',
    eat: 'llevar',
    cancel_reason: null,
    rate_until: '2026-11-11T22:00:00+00:00',
    my_rating: null,
    kitchen: { id: 'k-1', name: 'Fonda Doña Lupe', giro: null, address: null, directions: null, page: null },
    lines: [{ line_no: 1, name: 'Mole con arroz', surprise: false, quantity: '1.000', unit_price: '60.00', container_price: null }],
    ...over,
  };
}
const uno = (over: Record<string, unknown> = {}): Apartado => apartadoOf(fila(over));

describe('her stars about the kitchen — `rate_kitchen`, by `0080`’s names and limits', () => {
  it('the function and each argument by the name PostgREST matches on', () => {
    expect(RATE_KITCHEN).toBe('rate_kitchen');
    const rate = definicion(RATE_KITCHEN);
    expect(campos('api/apartados.ts', 'RateArgs')).toEqual(['p_reservation_id', 'p_stars', 'p_tags', 'p_note']);
    for (const arg of campos('api/apartados.ts', 'RateArgs')) expect(rate, arg).toMatch(new RegExp(`\\b${arg}\\s`));
    for (const key of campos('api/apartados.ts', 'RatedRow')) expect(rate, key).toContain(`'${key}'`);
    expect(code('api/calls.ts')).toMatch(/supabase\.rpc\(RATE_KITCHEN, rateArgs\(id, calificacion\)\)/);
  });

  it('the tags are `0080`’s closed lists, each after its stars, and a note is at most 500', () => {
    expect(sql0080).toContain(
      `(stars >= ${BUENAS_DESDE} and tags <@ array[${ETIQUETAS_BUENAS.map((t) => `'${t}'`).join(', ')}]::text[])`,
    );
    expect(sql0080).toContain(`(stars <= ${BUENAS_DESDE - 1} and tags <@ array[${ETIQUETAS_MALAS.map((t) => `'${t}'`).join(', ')}]::text[])`);
    expect(definicion(RATE_KITCHEN)).toContain(`char_length(v_note) > ${NOTA_MAXIMA}`);
    // Every tag has its words, in her rating and — the good ones — on a kitchen's page.
    for (const t of [...ETIQUETAS_BUENAS, ...ETIQUETAS_MALAS]) expect(ES.apartados.calificar.etiqueta[t], t).toBeTruthy();
    for (const t of ETIQUETAS_BUENAS) expect(ES.pagina.etiqueta[t]).toBe(ES.apartados.calificar.etiqueta[t]);
  });

  it('after four or five stars the good four, after one to three the other four, and nothing outside one to five', () => {
    expect(etiquetasPara(5)).toEqual(ETIQUETAS_BUENAS);
    expect(etiquetasPara(4)).toEqual(ETIQUETAS_BUENAS);
    expect(etiquetasPara(3)).toEqual(ETIQUETAS_MALAS);
    expect(etiquetasPara(1)).toEqual(ETIQUETAS_MALAS);
    expect(etiquetasPara(0)).toEqual([]);
    expect(etiquetasPara(6)).toEqual([]);
    expect(etiquetasPara(4.5)).toEqual([]);
    // A change of stars drops the other band's tags, and keeps the list's order.
    expect(etiquetasDeLaBanda(2, ['muy_rica', 'porcion_chica', 'tuve_que_esperar'])).toEqual(['tuve_que_esperar', 'porcion_chica']);
    expect(etiquetasDeLaBanda(5, ['muy_rica', 'porcion_chica', 'lista_a_tiempo'])).toEqual(['lista_a_tiempo', 'muy_rica']);
  });

  it('what is sent: the stars, the tags of their band, a note trimmed — blank is none — and never past 500', () => {
    expect(rateArgs('r-1', { estrellas: 4, etiquetas: ['muy_rica', 'no_me_gusto'], nota: '  ' })).toEqual({
      p_reservation_id: 'r-1',
      p_stars: 4,
      p_tags: ['muy_rica'],
      p_note: null,
    });
    expect(rateArgs('r-1', { estrellas: 2, etiquetas: [], nota: ' El arroz llegó frío. ' }).p_note).toBe('El arroz llegó frío.');
    expect(rateArgs('r-1', { estrellas: 5, etiquetas: [], nota: 'x'.repeat(600) }).p_note).toHaveLength(NOTA_MAXIMA);
  });

  it('her reservations carry until when she may rate, and her stars once given — tags of their band only', () => {
    const sinCalificar = uno();
    expect(sinCalificar.calificarHasta).toEqual(new Date('2026-11-11T22:00:00Z'));
    expect(sinCalificar.miCalificacion).toBeNull();
    expect(uno({ my_rating: { stars: 4, tags: ['muy_rica', 'porcion_chica'] } }).miCalificacion).toEqual({
      estrellas: 4,
      etiquetas: ['muy_rica'],
    });
    // What it cannot read is none — never a guess.
    expect(uno({ my_rating: { stars: 9, tags: [] } }).miCalificacion).toBeNull();
    expect(uno({ rate_until: 'mañana' }).calificarHasta).toBeNull();
    expect(uno({ rate_until: null, my_rating: null }).calificarHasta).toBeNull();
  });

  it('*Calificar* on a plate she collected, not yet rated, until the database’s moment — and on nothing else', () => {
    const antes = new Date('2026-11-11T21:59:00Z');
    expect(porCalificar(uno(), antes)).toBe(true);
    expect(porCalificar(uno(), new Date('2026-11-11T22:00:01Z'))).toBe(false);
    expect(porCalificar(uno({ my_rating: { stars: 5, tags: [] } }), antes)).toBe(false);
    expect(porCalificar(uno({ state: 'liberado', rate_until: null }), antes)).toBe(false);
    expect(porCalificar(uno({ state: 'cancelado' }), antes)).toBe(false);
  });

  it('her answer is read, and `TD022` is a sentence she understands', () => {
    expect(calificadoFrom({ stars: 3, tags: ['tuve_que_esperar'] })).toEqual({ estrellas: 3 });
    expect(() => calificadoFrom({ stars: 0 })).toThrow();
    expect(() => calificadoFrom(null)).toThrow();
    expect(POR_CODIGO.TD022).toBe('yaNoSeCalifica');
    expect(fallaDe({ code: 'TD022' })).toBe('yaNoSeCalifica');
    expect(ES.apartar.fallas.yaNoSeCalifica).toBe('Este apartado ya no se puede calificar.');
  });

  it('the screen: one tap sends the stars, *Listo* sends them again with her tags and note, on *Apartados*, in a form', () => {
    const calificar = code('ui/Calificar.tsx');
    expect(calificar).toMatch(/function tocarEstrella\(n: number\) \{[\s\S]*?void enviar\(n, tags, nota\);/);
    // One send at a time, in the order tapped, and only the last one's answer said.
    expect(calificar).toMatch(/const paso = cola\.current\.then\(\(\) => calificar\(/);
    expect(calificar).toMatch(/if \(turno === ultimo\.current\) setFalla\(/);
    expect(calificar).toMatch(/if \(await enviar\(estrellas, etiquetas, nota\)\) setGracias\(true\);/);
    expect(calificar).toMatch(/maxLength=\{NOTA_MAXIMA\}/);
    expect(calificar).toMatch(/etiquetasPara\(estrellas\)\.map/);
    const tab = code('app/(vecino)/(tabs)/apartados.tsx');
    // Under *Ya lo tienes*, and under a past plate she may still rate.
    expect(tab).toMatch(/<Calificar key=\{recogido\.id\} apartado=\{recogido\}/);
    expect(tab).toMatch(/porCalificar\(apartado, ahora\)/);
    // ⚠️ Found on the emulator: her one tap is saved and her list read again — the row she opened
    // must stay open (tags, note, *Listo*) rather than turn into her stars at once.
    expect(tab).toMatch(/\{calificando === apartado\.id \? \([\s\S]*?\) : apartado\.miCalificacion !== null \? \(/);
    // A form, so her note stays above the keyboard — never a box inside an Android `Modal`.
    expect(tab).toMatch(/<Formulario[\s\S]*<\/Formulario>/);
    expect(tab).not.toMatch(/<ScrollView/);
    expect(code('ui/Calificar.tsx')).not.toMatch(/@\/ui\/Hoja'/);
  });
});

describe('her terms of use, accepted with her yes — before her first reservation, so before her first rating', () => {
  it('both links above *Acepto y sigo*, and the terms page is in site/', () => {
    expect(TERMINOS_URL).toBe('https://tu-wera.com/terminos/cocina-e-itacate/');
    expect(readFileSync(join(ROOT, 'site/terminos/cocina-e-itacate/index.html'), 'utf8')).toMatch(/<title>Términos de uso/);
    const hoja = code('ui/HojaApartar.tsx');
    expect(hoja).toMatch(/texto: ES\.apartar\.antes\.aviso, url: AVISO_URL/);
    expect(hoja).toMatch(/texto: ES\.apartar\.antes\.terminos, url: TERMINOS_URL/);
    expect(hoja).toMatch(/openBrowserAsync\(enlace\.url\)/);
    expect(ES.apartar.antes.terminos).toBe('Términos de uso');
    expect(AVISO_URL).not.toBe(TERMINOS_URL);
    // And no rating can come before a reservation: `rate_kitchen` rates only a plate she collected.
    expect(definicion(RATE_KITCHEN)).toContain("<> 'recogido' then");
  });
});

describe('a kitchen’s stars, as the door sends them — from five ratings, good tags only', () => {
  it('the keys are `0080`’s door’s, and it sends them only from five', () => {
    const door = definicion('on_offer_now');
    expect(campos('api/cocinas.ts', 'KitchenRow')).toContain('stars');
    expect(door).toContain("'stars', (select case when count(*) >= 5 then jsonb_build_object(");
    for (const key of campos('api/cocinas.ts', 'StarsRow')) expect(door, key).toContain(`'${key}', `);
    expect(campos('api/cocinas.ts', 'StarsRow')).toEqual(['average', 'count', 'tags']);
    expect(door).toContain(`where t.tag in (${ETIQUETAS_BUENAS.map((t) => `'${t}'`).join(', ')})`);
    expect(door).toContain("'average', round(avg(c.stars), 1)::text");
  });

  it('read as the door writes them; anything it cannot read is no stars', () => {
    expect(estrellasOf({ average: '4.8', count: 23, tags: ['lista_a_tiempo', 'muy_rica'] })).toEqual({
      promedio: '4.8',
      cuantas: 23,
      etiquetas: ['lista_a_tiempo', 'muy_rica'],
    });
    expect(estrellasOf({ average: '5.0', count: 5, tags: [] })).toEqual({ promedio: '5.0', cuantas: 5, etiquetas: [] });
    // A tag of the other band, or unknown, is never shown on her page.
    expect(estrellasOf({ average: '3.2', count: 7, tags: ['tuve_que_esperar', 'muy_rica', 'muy_rica'] })?.etiquetas).toEqual(['muy_rica']);
    expect(estrellasOf(null)).toBeNull();
    expect(estrellasOf({ average: 4.8, count: 23, tags: [] })).toBeNull();
    expect(estrellasOf({ average: '0.9', count: 23, tags: [] })).toBeNull();
    expect(estrellasOf({ average: '5.5', count: 23, tags: [] })).toBeNull();
    expect(estrellasOf({ average: '4.85', count: 23, tags: [] })).toBeNull();
    expect(estrellasOf({ average: '4.8', count: 0, tags: [] })).toBeNull();
  });

  const cocina = (over: Partial<Kitchen> = {}): Kitchen => ({
    ...toKitchen({ id: 'k-1', name: 'Fonda Doña Mari', payment: ['efectivo', 'transferencia'] } as unknown as KitchenRow),
    page: EMPTY_PAGE,
    ...over,
  });

  it('a card and a dish’s row: *350 m · ★ 4.8*, either alone', () => {
    const estrellas = { promedio: '4.8', cuantas: 23, etiquetas: [] };
    expect(estrellasTexto(estrellas)).toBe('★ 4.8');
    expect(estrellasTexto(null)).toBeNull();
    expect(distanciaYEstrellas('350 m', estrellas)).toBe('350 m · ★ 4.8');
    expect(distanciaYEstrellas(null, estrellas)).toBe('★ 4.8');
    expect(distanciaYEstrellas('350 m', null)).toBe('350 m');
    expect(distanciaYEstrellas(null, null)).toBeNull();
  });

  it('her page: *4.8 (23 calificaciones)* with her good tags in words, else *Todavía sin calificaciones*', () => {
    expect(calificacionDe(cocina())).toEqual({ kind: 'sin', texto: 'Todavía sin calificaciones' });
    expect(calificacionDe(cocina({ estrellas: { promedio: '4.8', cuantas: 23, etiquetas: ['lista_a_tiempo', 'muy_rica'] } }))).toEqual({
      kind: 'estrellas',
      promedio: '4.8',
      cuantas: '(23 calificaciones)',
      ayuda: '4.8 de 5 estrellas, 23 calificaciones',
      etiquetas: ['Lista a tiempo', 'Muy rica'],
    });
  });

  it('and how she takes payment, as chips: cash always, first', () => {
    expect(pagosDe(cocina()).map((p) => p.texto)).toEqual(['Efectivo', 'Transferencia']);
    expect(pagosDe(cocina({ pagos: ['efectivo'] }))).toEqual([{ pago: 'efectivo', texto: 'Efectivo' }]);
  });

  it('drawn on both cards, a dish’s kitchen row and her page', () => {
    expect(code('ui/TarjetaPlatillo.tsx')).toMatch(/cocina\.estrellas !== null &&/);
    expect(code('ui/TarjetaCocina.tsx')).toMatch(/distanciaYEstrellas\(/);
    expect(code('ui/FilaCocina.tsx')).toMatch(/distanciaYEstrellas\(distancia, cocina\.estrellas\)/);
    const pagina = code('ui/PaginaDeCocina.tsx');
    expect(pagina).toMatch(/calificacionDe\(cocina\)/);
    expect(pagina).toMatch(/pagosDe\(cocina\)/);
    expect(pagina).toMatch(/ES\.pagina\.comoPagas/);
  });
});

describe('her reminder, 15 minutes before her hour — scheduled by her own phone', () => {
  const ahora = new Date('2026-11-10T19:00:00Z');
  const pendiente = (id: string, hora: string, over: Record<string, unknown> = {}) =>
    uno({ id, state: 'apartado', pickup_at: hora, rate_until: null, ...over });

  it('one per reservation still to collect, 15 minutes before her hour, the soonest first', () => {
    const disparos = disparosDe(
      [
        pendiente('b', '2026-11-11T15:00:00Z'),
        pendiente('a', '2026-11-10T20:30:00Z'),
        uno({ id: 'c', state: 'recogido' }),
        pendiente('d', '2026-11-10T20:00:00Z', { state: 'cancelado' }),
      ],
      ahora,
    );
    expect(disparos.map((d) => d.id)).toEqual([`${PREFIJO}a`, `${PREFIJO}b`]);
    expect(disparos[0].cuando).toEqual(new Date('2026-11-10T20:15:00Z'));
    expect(ANTES_MS).toBe(15 * 60_000);
    // In Mexico City's zone: 20:30 UTC is 14:30.
    expect(disparos[0].titulo).toBe('Tu comida estará lista a las 14:30');
    expect(disparos[0].texto).toBe('Fonda Doña Lupe · Tu código: 347');
  });

  it('kept until her hour — Android delivers late — but a new one is scheduled only while its moment is ahead', () => {
    // ⚠️ Her hour 10 minutes away: still wanted (one already held must not be cancelled by this read)…
    const [cerca] = disparosDe([pendiente('a', '2026-11-10T19:10:00Z')], ahora);
    expect(cerca.id).toBe(`${PREFIJO}a`);
    // …but never scheduled anew: its moment has passed.
    expect(porVenir([cerca], ahora.getTime())).toEqual([]);
    // Her hour come: not wanted any more.
    expect(disparosDe([pendiente('a', '2026-11-10T19:00:00Z')], ahora)).toEqual([]);
    const [d] = disparosDe([pendiente('b', '2026-11-10T19:30:00Z')], ahora);
    expect(porVenir([d], d.cuando.getTime() - 1)).toEqual([d]);
    expect(porVenir([d], d.cuando.getTime())).toEqual([]);
  });

  it('a tap on one of hers opens *Apartados* — a tab in use — and on anything else nothing', () => {
    expect(rutaDelToque(`${PREFIJO}r-1`)).toBe(RUTA);
    expect(rutaDelToque('recordatorio:1:16:00')).toBeNull();
    expect(RUTA).toBe('/apartados');
    expect(EN_USO.map((p) => p.ruta)).toContain('apartados');
  });

  it('the one module that imports `expo-notifications`: asked while the phone lets it, never a push token, a dated trigger', () => {
    const quienes = (dir: string): string[] =>
      readdirSync(join(SRC, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? quienes(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
      );
    const importan = quienes('.').filter((f) => /from 'expo-notifications'/.test(read(f)));
    expect(importan).toEqual(['lib/avisos.ts']);
    const avisos = code('lib/avisos.ts');
    expect(avisos).not.toMatch(/getExpoPushTokenAsync|getDevicePushTokenAsync/);
    // Asked while her phone still lets Itacate ask — never "only while undetermined": Android 13
    // reports a permission never asked as denied, and such a check never asked (found on the emulator).
    expect(avisos).toMatch(/if \(ahora\.granted\) return true;\s*if \(!ahora\.canAskAgain\) return false;\s*const respuesta = await Notifications\.requestPermissionsAsync\(\);/);
    expect(avisos).not.toMatch(/PermissionStatus\.UNDETERMINED/);
    expect(avisos).toMatch(/type: Notifications\.SchedulableTriggerInputTypes\.DATE, date: disparo\.cuando, channelId: CANAL/);
    // Without her permission nothing is scheduled. ⚠️ By id, never "cancel all, schedule again": a reading
    // between a reminder's moment and Android's late delivery must not cancel it (the review of 10.5b-iii-b).
    expect(avisos).toMatch(/if \(!\(await Notifications\.getPermissionsAsync\(\)\)\.granted\) return;\s*tiene = await nuestros\(\);/);
    expect(avisos).toMatch(/for \(const id of tiene\) \{\s*if \(quiere\.has\(id\)\) continue;/);
    expect(avisos).toMatch(/disparos\.filter\(\(d\) => !tiene\.includes\(d\.id\)\)/);
    // Shown while Itacate is open too — its own reminders only.
    expect(avisos).toMatch(/const nuestra = rutaDelToque\(notificacion\.request\.identifier\) !== null;/);
    expect(code('lib/Recordatorios.tsx')).toMatch(/useEffect\(\(\) => mostrarRecordatorios\(\), \[\]\);/);
  });

  it('kept in step with her reservations from the tabs, cancelled when they leave, and asked after her first reservation', () => {
    expect(code('app/(vecino)/(tabs)/_layout.tsx')).toMatch(/<Recordatorios \/>/);
    const recordatorios = code('lib/Recordatorios.tsx');
    expect(recordatorios).toMatch(/programarApartados\(disparosDe\(apartados\.data, new Date\(\)\)\)/);
    expect(recordatorios).toMatch(/\}, \[leido\]\);/);
    expect(recordatorios).toMatch(/\(\) => \(\) => \{\s*void quitarApartados\(\);/);
    expect(code('ui/HojaApartar.tsx')).toMatch(/if \(resultado\.ok\) \{[\s\S]*?void pedirPermiso\(\)/);
  });
});

describe('*Eliminar mi cuenta* says why it waits — `TD014`, a plate to hand over at her kitchen', () => {
  it('the code her deletion raises, and its sentence', () => {
    expect(PLATE_PENDING_CODE).toBe('TD014');
    expect(definicion('delete_my_account')).toContain(`errcode = '${PLATE_PENDING_CODE}'`);
    expect(deleteErrorMessage({ code: 'TD014', message: 'a reservation is still to hand over' })).toBe(ES.account.errors.reservaPendiente);
    expect(ES.account.errors.reservaPendiente).toBe(
      'Alguien tiene un apartado por recoger en tu cocina. Podrás eliminar tu cuenta cuando se lo entregues o cuando termine su horario.',
    );
  });
});

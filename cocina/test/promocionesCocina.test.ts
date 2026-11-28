import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { NINGUNA } from '@/api/fotos';
import {
  CONDICIONES_MAX,
  DIAS_MAX,
  LO_QUE_MAX,
  MAS_MAX,
  NO_ES_DUENA,
  NO_SE_OFRECE,
  NO_SE_PUEDE_UNIR,
  SIN_TARJETA,
  TIPOS,
  TRES_ACTIVAS,
  YA_NO_SE_DESHACE,
  createArgs,
  type PromotionRow,
  type PromotionsRow,
} from '@/api/promociones';
import { NADA, type LoQueUsa } from '@/api/servicios';
import { PANTALLA_DE } from '@/lib/loQueUsas';
import {
  ICONO_DE_TIPO,
  NUEVO,
  avisaAlPublicar,
  bandaDe,
  bandaDeFila,
  borradorDe,
  calendarioDe,
  condicionesDe,
  condicionesDelBorrador,
  conSuDia,
  dentroDelPlazo,
  diasTexto,
  enUnaLinea,
  enVivoDe,
  envioDe,
  estadoDe,
  filaDe,
  hastaDe,
  hoyDe,
  marcaDe,
  noSeUne,
  promocionErrorMessage,
  revisar,
  seLeen,
  sumarDias,
  temporadaDe,
  tiposDe,
  tocarDia,
  ultimoDia,
  type Borrador,
} from '@/lib/promociones';
import { detalleDelAviso } from '@/lib/avisoDePromocion';
import { ES } from '@/strings';

// ============================================================================
// PROMOTIONS IN WERA COCINA — EVERY RULE OF `@/lib/promociones`, PINNED. Plan task `10.9g-ii`, the owner's rulings
// of 2026-11-05 (calls 23–25) and G18, G28–G30 of 2026-11-17, as the family-shell page draws stage 4. Against a
// calendar, in Mexico City's zone (the phone's, in the pilot) — and the drawing's own example: Fonda Doña Mari,
// Sabino 12, Santa María la Ribera, on Thursday 5 November 2026.
// ⚠️ WHAT THIS CANNOT SEE: that the screens draw (ADR-035 §2.11). The session's emulator walk is their evidence.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const code = (path: string) => readFileSync(join(ROOT, 'cocina/src', path), 'utf8').replace(/^\s*\/\/.*$/gm, '');
const GLYPHS = JSON.parse(
  readFileSync(
    new URL('../src/marca/iconos/WeraIconos.json', import.meta.url),
    'utf8',
  ),
) as Record<string, number>;

let antes: string | undefined;
beforeAll(() => {
  antes = process.env.TZ;
  process.env.TZ = 'America/Mexico_City';
});
afterAll(() => {
  if (antes === undefined) delete process.env.TZ;
  else process.env.TZ = antes;
});

/** Thursday 5 November 2026 — the drawing's day. */
const JUEVES = '2026-11-05';
const MARI = 'Fonda Doña Mari';
const SABINO = 'Sabino 12, Santa María la Ribera';

function promo(over: Partial<PromotionRow> = {}): PromotionRow {
  return {
    id: 'p1',
    kind: 'nuevo',
    what: 'Enchiladas potosinas',
    more: null,
    image_path: null,
    days: [1, 2, 3, 4, 5, 6, 7],
    starts_on: JUEVES,
    ends_on: '2026-11-30',
    conditions: 'Todos los días…',
    created_at: '2026-11-05T18:00:00Z',
    state: 'activa',
    ended_on: null,
    shown: true,
    offers_today: 0,
    ...over,
  };
}

function lista(promotions: PromotionRow[], over: Partial<PromotionsRow> = {}): PromotionsRow {
  return {
    day: JUEVES,
    max: 3,
    running: promotions.filter((p) => p.state === 'activa').length,
    card_open: true,
    promotions,
    ...over,
  };
}

const borrador = (over: Partial<Borrador> = {}): Borrador => ({ ...NUEVO, loQue: 'Pozole rojo', hasta: { eleccion: 'mes' }, ...over });

describe('the four kinds and their pictures', () => {
  it('in the drawing’s order — Para tus clientes only while her card is open (G28)', () => {
    expect(tiposDe(true)).toEqual([...TIPOS]);
    expect(tiposDe(false)).toEqual(['nuevo', 'temporada', 'dia']);
  });

  it('every kind’s picture is in the icon set — a name not in it is a blank square', () => {
    for (const t of TIPOS) expect(GLYPHS[ICONO_DE_TIPO[t]], ICONO_DE_TIPO[t]).toBeTypeOf('number');
  });

  it('the mark each gives (call 25) — Un día especial’s is its days, Especial before she picks one', () => {
    expect(marcaDe('nuevo', [1, 2, 3, 4, 5, 6, 7])).toBe('Nuevo');
    expect(marcaDe('temporada', [4])).toBe('De temporada');
    expect(marcaDe('clientes', [4])).toBe('Con tu tarjeta de lealtad');
    expect(marcaDe('dia', [4])).toBe('Los jueves');
    expect(marcaDe('dia', [1, 2, 3, 4, 5, 6, 7])).toBe('Especial');
  });
});

describe('its days', () => {
  it('Todos is all seven; a day tapped while all are on is that day alone; none left is Todos again — always in order', () => {
    const todos = [1, 2, 3, 4, 5, 6, 7] as const;
    expect(tocarDia(todos, 4)).toEqual([4]);
    expect(tocarDia([4], 1)).toEqual([1, 4]);
    expect(tocarDia([1, 4], 4)).toEqual([1]);
    expect(tocarDia([1], 1)).toEqual([...todos]);
    expect(tocarDia([5, 2], 'todos')).toEqual([...todos]);
    expect(tocarDia([7], 6)).toEqual([6, 7]);
  });

  it('said as the drawing says them', () => {
    expect(diasTexto([1, 2, 3, 4, 5, 6, 7])).toBe('Todos los días');
    expect(diasTexto([4])).toBe('Los jueves');
    expect(diasTexto([6, 7])).toBe('Los sábados y domingos');
    expect(diasTexto([1, 3, 5])).toBe('Los lunes, miércoles y viernes');
  });
});

describe('¿Hasta cuándo? — against a calendar', () => {
  it('Esta semana is this Sunday; Dos semanas fourteen days on; Fin de mes the month’s last day — the drawing’s three dates', () => {
    expect(hastaDe({ eleccion: 'semana' }, JUEVES)).toBe('2026-11-08');
    expect(hastaDe({ eleccion: 'dos' }, JUEVES)).toBe('2026-11-19');
    expect(hastaDe({ eleccion: 'mes' }, JUEVES)).toBe('2026-11-30');
    expect(conSuDia('2026-11-08')).toBe('domingo 8 de noviembre');
    expect(conSuDia('2026-11-30')).toBe('lunes 30 de noviembre');
  });

  it('on a Sunday this week ends today; across a month and a year the calendar is the calendar’s', () => {
    expect(hastaDe({ eleccion: 'semana' }, '2026-11-08')).toBe('2026-11-08');
    expect(hastaDe({ eleccion: 'semana' }, '2026-12-30')).toBe('2027-01-03');
    expect(hastaDe({ eleccion: 'mes' }, '2027-02-10')).toBe('2027-02-28');
    expect(hastaDe({ eleccion: 'mes' }, '2028-02-10')).toBe('2028-02-29');
    expect(hastaDe({ eleccion: 'otra', dia: '2026-12-20' }, JUEVES)).toBe('2026-12-20');
    expect(sumarDias('2026-12-25', 14)).toBe('2027-01-08');
  });

  it('eight weeks at most — the database’s 56 days — and never before today', () => {
    expect(DIAS_MAX).toBe(56);
    expect(ultimoDia(JUEVES)).toBe('2026-12-31');
    expect(dentroDelPlazo(JUEVES, JUEVES)).toBe(true);
    expect(dentroDelPlazo('2026-12-31', JUEVES)).toBe(true);
    expect(dentroDelPlazo('2027-01-01', JUEVES)).toBe(false);
    expect(dentroDelPlazo('2026-11-04', JUEVES)).toBe(false);
    // Every quick choice fits, whatever the day.
    for (let i = 0; i < 400; i += 1) {
      const hoy = sumarDias('2026-01-01', i);
      for (const eleccion of ['semana', 'dos', 'mes'] as const) expect(dentroDelPlazo(hastaDe({ eleccion }, hoy), hoy), `${eleccion} ${hoy}`).toBe(true);
    }
  });

  it('Otra fecha’s calendar: Monday first, from this week to the one holding her last day, today to eight weeks pickable', () => {
    const semanas = calendarioDe(JUEVES);
    const dias = semanas.flatMap((s) => s.dias).filter((d) => d !== null).map((d) => d.dia);
    expect(dias[0]).toBe(JUEVES);
    expect(dias[dias.length - 1]).toBe('2026-12-31');
    expect(dias).toHaveLength(DIAS_MAX + 1);
    // Thursday sits fourth in its week, Monday to Wednesday blank.
    expect(semanas[0].dias.slice(0, 3)).toEqual([null, null, null]);
    expect(semanas[0].dias[3]).toEqual({ dia: JUEVES, numero: 5 });
    for (const s of semanas) expect(s.dias).toHaveLength(7);
    // A month's name heads the week its first day falls in.
    expect(semanas.map((s) => s.mes).filter((m) => m !== null)).toEqual(['noviembre 2026', 'diciembre 2026']);
  });
});

describe('the conditions, written for her (call 25; LFPC Art. 48 asks for a duration)', () => {
  it('the drawing’s condTxt: her days, from today to her last, her kitchen’s name and address', () => {
    expect(condicionesDe({ tipo: 'nuevo', dias: [1, 2, 3, 4, 5, 6, 7], hasta: '2026-11-30' }, JUEVES, MARI, SABINO)).toBe(
      'Todos los días, del 5 de noviembre al 30 de noviembre de 2026, en Fonda Doña Mari, Sabino 12, Santa María la Ribera.',
    );
    expect(condicionesDe({ tipo: 'clientes', dias: [4], hasta: '2026-11-30' }, JUEVES, MARI, SABINO)).toBe(
      'Con tu tarjeta de lealtad. Los jueves, del 5 de noviembre al 30 de noviembre de 2026, en Fonda Doña Mari, Sabino 12, Santa María la Ribera.',
    );
  });

  it('across a year, both ends carry theirs; before she picks an end, from today; with no whole address, her name alone', () => {
    expect(condicionesDe({ tipo: 'nuevo', dias: [5], hasta: '2027-01-08' }, '2026-12-28', MARI, null)).toBe(
      'Los viernes, del 28 de diciembre de 2026 al 8 de enero de 2027, en Fonda Doña Mari.',
    );
    expect(condicionesDe({ tipo: 'temporada', dias: [1, 2, 3, 4, 5, 6, 7], hasta: null }, JUEVES, MARI, SABINO)).toBe(
      'Todos los días, desde el 5 de noviembre de 2026, en Fonda Doña Mari, Sabino 12, Santa María la Ribera.',
    );
  });

  it('hers after Cambiar, else written from the fields — fit the database’s 400 either way', () => {
    expect(condicionesDelBorrador(borrador({ condiciones: 'Solo en el local.' }), JUEVES, MARI, SABINO)).toBe('Solo en el local.');
    expect(condicionesDelBorrador(borrador(), JUEVES, MARI, SABINO)).toContain('al 30 de noviembre de 2026');
    // A long name and address can pass the database's 400: she is asked to shorten them, never cut mid-sentence.
    const larga = borrador({ tipo: 'clientes', dias: [1, 3, 5] });
    expect(condicionesDelBorrador(larga, JUEVES, 'x'.repeat(120), 'y'.repeat(200)).length).toBeGreaterThan(CONDICIONES_MAX);
    expect(revisar(larga, JUEVES, lista([]), 'x'.repeat(120), 'y'.repeat(200))).toBe('Las condiciones son muy largas: hasta 400 letras. Toca Cambiar y acórtalas.');
    expect(revisar(larga, JUEVES, lista([]), MARI, SABINO)).toBeNull();
  });
});

describe('Publicar promoción — checked before anything is sent, in the order she fills the form', () => {
  const ok = lista([]);
  it('what, then her day, then an end, then within eight weeks; three running and her card are the database’s words too', () => {
    expect(revisar(borrador({ loQue: '  ' }), JUEVES, ok, MARI, SABINO)).toBe('Escribe qué ofreces.');
    expect(revisar(borrador({ tipo: 'dia' }), JUEVES, ok, MARI, SABINO)).toBe('Elige qué día es tu día especial.');
    expect(revisar(borrador({ tipo: 'dia', dias: [4] }), JUEVES, ok, MARI, SABINO)).toBeNull();
    expect(revisar(borrador({ hasta: null }), JUEVES, ok, MARI, SABINO)).toBe('Elige hasta cuándo.');
    expect(revisar(borrador({ hasta: { eleccion: 'otra', dia: '2027-01-01' } }), JUEVES, ok, MARI, SABINO)).toBe('Elige un último día de aquí a ocho semanas.');
    // A day picked yesterday is past at today's press.
    expect(revisar(borrador({ hasta: { eleccion: 'otra', dia: '2026-11-04' } }), JUEVES, ok, MARI, SABINO)).toBe('Elige un último día de aquí a ocho semanas.');
    expect(revisar(borrador({ condiciones: ' \n ' }), JUEVES, ok, MARI, SABINO)).toBe('Escribe las condiciones.');
    const tres = lista([promo({ id: 'a' }), promo({ id: 'b' }), promo({ id: 'c' })]);
    expect(revisar(borrador(), JUEVES, tres, MARI, SABINO)).toBe(ES.promociones.tresActivas);
    expect(revisar(borrador({ tipo: 'clientes' }), JUEVES, lista([], { card_open: false }), MARI, SABINO)).toBe(
      'Para tus clientes necesita tu tarjeta de lealtad abierta.',
    );
    expect(revisar(borrador(), JUEVES, ok, MARI, SABINO)).toBeNull();
  });

  it('what it sends: one line each for what and more — no control character the database would refuse — inside its bounds', () => {
    expect(enUnaLinea(' Pozole\n\trojo  ')).toBe('Pozole rojo');
    const envio = envioDe(
      borrador({ loQue: 'Pozole\nrojo', mas: '\u0007Grande ', dias: [5, 4], hasta: { eleccion: 'dos' }, foto: { kind: 'guardada', path: 'k/f' } }),
      JUEVES,
      MARI,
      SABINO,
    );
    expect(envio).toEqual({
      tipo: 'nuevo',
      loQue: 'Pozole rojo',
      mas: 'Grande',
      foto: 'k/f',
      dias: [5, 4],
      hasta: '2026-11-19',
      condiciones: 'Los jueves y viernes, del 5 de noviembre al 19 de noviembre de 2026, en Fonda Doña Mari, Sabino 12, Santa María la Ribera.',
    });
    expect(envio.loQue.length).toBeLessThanOrEqual(LO_QUE_MAX);
    expect(envio.mas.length).toBeLessThanOrEqual(MAS_MAX);
    // The api's call takes it as it is: its days in order, more `null` when blank.
    const args = createArgs('k', 'id', { ...envio, mas: '' });
    expect(args.p_days).toEqual([4, 5]);
    expect(args.p_more).toBeNull();
    // Her own conditions keep their line breaks.
    expect(envioDe(borrador({ condiciones: 'Uno.\r\nDos.' }), JUEVES, MARI, SABINO).condiciones).toBe('Uno.\nDos.');
  });

  it('Usarla otra vez: kind, what, more, photo and days — never its end or its conditions; her customers’ kind with no card starts as new', () => {
    const vieja = promo({ kind: 'clientes', more: 'Grande', image_path: 'k/p', days: [4], ends_on: '2026-11-12', state: 'terminada' });
    expect(borradorDe(vieja, true)).toEqual({
      tipo: 'clientes',
      loQue: 'Enchiladas potosinas',
      mas: 'Grande',
      foto: { kind: 'guardada', path: 'k/p' },
      dias: [4],
      hasta: null,
      condiciones: null,
      avisar: true,
    });
    expect(borradorDe(vieja, false).tipo).toBe('nuevo');
    expect(borradorDe(promo(), true).foto).toEqual(NINGUNA);
  });
});

describe('her list, its sheet and its tile', () => {
  it('each row: its kind, its days, its end — or when it ended', () => {
    expect(filaDe(promo())).toBe('Platillo nuevo · todos los días · hasta el 30 de noviembre');
    expect(filaDe(promo({ kind: 'dia', days: [4] }))).toBe('Un día especial · los jueves · hasta el 30 de noviembre');
    expect(filaDe(promo({ state: 'terminada', ended_on: '2026-11-18' }))).toBe('Platillo nuevo · terminó el 18 de noviembre');
  });

  it('Tu promoción: seen, and how many of today’s offers wear its mark — the database’s count; or not seen; or ended', () => {
    expect(estadoDe(promo())).toBe('Se ve en tu página.');
    expect(estadoDe(promo({ offers_today: 1 }))).toBe('Se ve en tu página. Una oferta de hoy lleva su marca.');
    expect(estadoDe(promo({ offers_today: 2 }))).toBe('Se ve en tu página. 2 ofertas de hoy llevan su marca.');
    expect(estadoDe(promo({ shown: false }))).toBe('Ahora no se ve en Wera.');
    expect(estadoDe(promo({ state: 'terminada', ended_on: JUEVES }))).toBe('Ya no se ve en Wera.');
  });

  it('the band: the mark, hasta el …, what — the kind’s example until she types — and more', () => {
    expect(bandaDe({ tipo: 'dia', dias: [4], hasta: '2026-11-30', loQue: '', mas: '' })).toEqual({
      tipo: 'dia',
      marca: 'Los jueves',
      hasta: 'hasta el 30 de noviembre',
      loQue: 'Jueves pozolero',
      mas: null,
    });
    expect(bandaDeFila(promo({ more: 'Con tostadas', state: 'terminada' }))).toEqual({
      tipo: 'nuevo',
      marca: 'Nuevo',
      hasta: null,
      loQue: 'Enchiladas potosinas',
      mas: 'Con tostadas',
    });
  });

  it('the tile: first-time before her first ever; the newest running and how many more; none now; a failed read said so', () => {
    expect(enVivoDe(lista([]))).toBeNull();
    expect(enVivoDe(lista([promo({ what: 'Agua de jamaica gratis' })]))).toEqual({
      valor: 'Agua de jamaica gratis',
      detalle: 'Hasta el 30 de noviembre',
      porHacer: false,
    });
    expect(enVivoDe(lista([promo(), promo({ id: 'b' }), promo({ id: 'c', state: 'terminada' })]))?.detalle).toBe('Hasta el 30 de noviembre · y 1 más');
    expect(enVivoDe(lista([promo({ state: 'terminada', ended_on: JUEVES })]))).toEqual({ valor: 'Ninguna ahora', detalle: 'Crea una cuando quieras', porHacer: false });
    expect(enVivoDe(null)).toEqual({ valor: '—', detalle: 'No se pudieron leer', porHacer: false });
  });

  it('read only while she uses them, Wera offers them and this build carries them', () => {
    const usa = (on: boolean): LoQueUsa => ({
      ...NADA,
      ofrecidos: ['promociones'],
      elecciones: on ? { promociones: { estado: 'on', desde: new Date() } } : {},
    });
    expect(seLeen(undefined)).toBe(false);
    expect(seLeen(usa(false))).toBe(false);
    expect(seLeen(usa(true))).toBe(true);
    expect(seLeen(usa(true), ['tarjeta'])).toBe(false);
    expect(seLeen({ ...usa(true), ofrecidos: [] })).toBe(false);
  });
});

describe('refusals in words — every code of `0087`’s this screen meets', () => {
  it('each said as it is', () => {
    const e = (code: string) => promocionErrorMessage({ code });
    expect(e(NO_ES_DUENA)).toBe('Solo la dueña de la cocina crea y termina promociones.');
    expect(e(NO_SE_OFRECE)).toBe('Las promociones todavía no están disponibles.');
    expect(e(TRES_ACTIVAS)).toBe('Tienes tres activas. Termina una para crear otra.');
    expect(e(SIN_TARJETA)).toBe('Para tus clientes necesita tu tarjeta de lealtad abierta.');
    expect(e(NO_SE_PUEDE_UNIR)).toBe('Esa promoción no corre ese día. Elige otra, o publica sin promoción.');
    expect(e(YA_NO_SE_DESHACE)).toBe('Ya no se puede deshacer: termínala hoy en Promociones.');
    expect(e('22023')).toBe(ES.api.errors.revisar);
    expect(noSeUne({ code: NO_SE_PUEDE_UNIR })).toBe(true);
    expect(noSeUne({ code: '22023' })).toBe(false);
  });
});

describe('De temporada’s hint — a hint, never a default', () => {
  it('the posadas, from 1 November to 24 December; none outside', () => {
    expect(temporadaDe(JUEVES)?.ejemplos).toEqual(['Romeritos con mole', 'Bacalao a la vizcaína', 'Ponche de frutas']);
    expect(temporadaDe('2026-12-24')).not.toBeNull();
    expect(temporadaDe('2026-12-25')).toBeNull();
    expect(temporadaDe('2026-10-31')).toBeNull();
    expect(NUEVO.loQue).toBe('');
  });
});

describe('the phone’s day', () => {
  it('is the calendar day in its own zone — late on the 5th in Mexico City is the 5th, though UTC says the 6th', () => {
    expect(hoyDe(new Date('2026-11-06T04:30:00Z'))).toBe(JUEVES);
  });
});

describe('the wiring, read as text', () => {
  it('its one screen is in this build — the tile and Lo que usas open it — and the form is a screen of its own', () => {
    expect(PANTALLA_DE.promociones).toBe('/promociones');
    expect(existsSync(join(ROOT, 'cocina/src/app/(cocina)/promociones.tsx'))).toBe(true);
    expect(existsSync(join(ROOT, 'cocina/src/app/(cocina)/nueva-promocion.tsx'))).toBe(true);
  });

  it('the owner’s (G18): a helper reaching the screen is sent to Hoy, and the form says it is not hers', () => {
    const pantalla = code('app/(cocina)/promociones.tsx');
    expect(pantalla).toContain("if (rol !== undefined && !duena) return <Redirect href=\"/\" />;");
    expect(pantalla).toContain('usePromociones(kitchenId, { activa: duena && seLeen(servicios.data) })');
    expect(code('app/(cocina)/nueva-promocion.tsx')).toContain('if (!esDuena(rol)) {');
  });

  it('Dejar de usar promociones asks first while any runs — her running ones end with it — and offers Deshacer only when none did', () => {
    const pantalla = code('app/(cocina)/promociones.tsx');
    expect(pantalla).toContain('if (corren.length > 0) return setPreguntar(true);');
    expect(pantalla).toContain('if (corren.length > 0) avisar(ES.promociones.dejadas);');
    expect(ES.promociones.dejarTexto(2)).toBe('Tus 2 promociones activas terminan hoy y ya no se ven en Wera.');
  });

  it('a retry is the same promotion: the id is kept while what it sends is unchanged', () => {
    const forma = code('app/(cocina)/nueva-promocion.tsx');
    expect(forma).toContain('if (intento.current === null || intento.current.sent !== sent) intento.current = { id: newId(), sent };');
    expect(forma).toContain('await crear(createArgs(kitchen.id, id, envio), porSubir([b.foto]))');
  });

  it('Deshacer outlives the form: a plain call with the kitchen and the id, never a screen’s mutation', () => {
    const hooks = code('api/hooks.ts');
    const desde = hooks.indexOf('export function useDeshacerPromocion');
    const deshacer = hooks.slice(desde, hooks.indexOf('export ', desde + 10));
    expect(deshacer).toContain('await undoPromotion(promotionArgs(kitchenId, id))');
    expect(deshacer).not.toContain('useMutation');
  });

  it('Publicar asks only while one runs on the window’s day, and sends the pick — dropped when the window leaves its days', () => {
    const publicar = code('app/(cocina)/publicar.tsx');
    expect(publicar).toContain('const ofrecidas = activasEl(promociones.data ?? null, hoyDe(ventana.start));');
    expect(publicar).toContain('const promoElegida = ofrecidas.some((p) => p.id === promo) ? promo : null;');
    expect(publicar).toContain('publishBody(placeId, lines, ventana, ajustes, promoElegida)');
    expect(publicar).toContain('{ofrecidas.length > 0 && (');
    // `TD031` is said in words, and her promotions are read again.
    expect(code('api/hooks.ts')).toMatch(/if \(noSeUne\(thrown\)\) \{\s+void queries\.invalidateQueries\(\{ queryKey: PROMOCIONES_KEY \}\);\s+return promocionErrorMessage\(thrown\);/);
  });

  it('Hoy’s tile waits for its read — never Crea tu primera promoción over a kitchen that has one', () => {
    const hoy = code('app/(cocina)/(tabs)/index.tsx');
    expect(hoy).toContain(".filter((m) => m.servicio !== 'promociones' || promocionesVivas !== undefined);");
    expect(hoy).toContain('const promocionesVivas = promocionesLeidas.data ?? (promocionesSinLeer ? null : undefined);');
  });

  // `10.9h-ii` turned this test: until `0094` it refused the alert's words; now it holds them, as drawn.
  it('Avisar a quienes te siguen: the drawing’s words — the count Hoy’s Te siguen, from the first follower', () => {
    expect(ES.nuevaPromocion.avisar).toBe('Avisar a quienes te siguen');
    expect(detalleDelAviso(38)).toBe('38 vecinos · un solo aviso, al publicarla');
    expect(detalleDelAviso(1)).toBe('1 vecino · un solo aviso, al publicarla');
    // None, or unread (`null` while it waits or failed): never a 0 that is not one — the line without a count.
    expect(detalleDelAviso(0)).toBe('Un solo aviso, al publicarla');
    expect(detalleDelAviso(null)).toBe('Un solo aviso, al publicarla');
    expect(detalleDelAviso(undefined)).toBe('Un solo aviso, al publicarla');
  });

  it('it is on at first, as drawn — a new form and Usarla otra vez — and never part of what create_promotion is sent', () => {
    expect(NUEVO.avisar).toBe(true);
    expect(borradorDe(promo(), true).avisar).toBe(true);
    const b = { ...NUEVO, loQue: 'Pozole', hasta: { eleccion: 'semana' as const } };
    // A retry with the switch changed is the same promotion: what is sent does not carry it.
    expect(envioDe({ ...b, avisar: false }, JUEVES, MARI, SABINO)).toEqual(envioDe(b, JUEVES, MARI, SABINO));
    expect(Object.keys(createArgs('k', 'p', envioDe(b, JUEVES, MARI, SABINO)))).not.toContain('p_notify');
  });

  it('publishing announces it only with her switch on AND the database offering it — unread, refused or dark is no', () => {
    expect(avisaAlPublicar(NUEVO, true)).toBe(true);
    expect(avisaAlPublicar({ ...NUEVO, avisar: false }, true)).toBe(false);
    expect(avisaAlPublicar(NUEVO, false)).toBe(false);
    expect(avisaAlPublicar(NUEVO, undefined)).toBe(false);
  });

  it('the form draws the switch only while promotion_alert_offered answers true, and reads it only on the owner’s phone', () => {
    const forma = code('app/(cocina)/nueva-promocion.tsx');
    expect(forma).toContain('const ofrecido = useAvisoOfrecido(kitchenId, { activa: rol !== undefined && esDuena(rol) });');
    expect(forma).toContain('{ofrecido.data === true && (');
    expect(forma).toContain('detalle={detalleDelAviso(seguidores.data)}');
    expect(forma).toContain('const seguidores = useSeguidores(kitchenId, { activa: ofrecido.data === true });');
  });

  it('the alert is asked after Deshacer’s eight seconds, only for a promotion neighbours see: a tap stops it, a refused one sends it', () => {
    const forma = code('app/(cocina)/nueva-promocion.tsx');
    expect(forma).toContain('const aviso = avisaAlPublicar(b, ofrecido.data) && seVe ? avisarDespues(() => anunciar(kitchenAhora, id)) : null;');
    expect(forma).toMatch(/aviso\?\.cancelar\(\);\s+const problema = await deshacer\(kitchenAhora, id, envio\.foto\);\s+if \(problema !== null\) aviso\?\.yaMismo\(\);/);
    // Both toasts carry it: her first, celebrated, and every later one.
    expect(forma).toContain('avisar(ES.promociones.primera, deshacerla, palabras, true);');
    expect(forma).toContain('avisar(ES.promociones.publicaste(envio.loQue), deshacerla, palabras);');
    // Never asked before it is published: the call comes after create_promotion answered.
    expect(forma.indexOf('await crear(createArgs(')).toBeLessThan(forma.indexOf('avisarDespues('));
  });

  it('Tu promoción never says y avisamos: no answer says whether one was announced, or to how many', () => {
    expect(JSON.stringify(ES.promociones)).not.toMatch(/avisamos/i);
  });

  it('terracotta, never the action’s colour: the band and the mark are drawn in `marca`', () => {
    const banda = code('ui/BandaPromocion.tsx');
    expect(banda).toContain('backgroundColor: PALETTE.marca,');
    expect(banda).toContain('backgroundColor: PALETTE.marcaSuave,');
    expect(banda).not.toContain('PALETTE.accion');
  });
});

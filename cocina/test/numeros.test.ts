import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { KITCHEN_NUMBERS, NUMEROS_KEY, PISO_DE_VECINOS, numbersArgs, numerosFrom, numerosKey, type Numeros } from '@/api/numeros';
import { PERSISTED_KEYS } from '@/api/persist';
import { NADA, type LoQueUsa } from '@/api/servicios';
import { PANTALLA_DE } from '@/lib/loQueUsas';
import {
  PERIODO_INICIAL,
  cifra,
  diasFuertes,
  enVivoDe,
  horasFuertes,
  leidoHoy,
  palabrasDelFestejo,
  respuestasDe,
  resumenDe,
  subtituloDe,
  tarjetaDe,
  veSusNumeros,
} from '@/lib/numeros';
import { ES } from '@/strings';

// ============================================================================
// HER NUMBERS, AS WERA COCINA READS AND SAYS THEM. Plan task `10.9f`, on `0086` (the owner's rulings
// G24–G27 of 2026-11-17; the family-shell page's `cNumeros`).
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that the name and its argument are ones the database answers,
// as the owner and not as her helper — is `docs/checks/10.9f-numbers-contract.sh`'s; WHAT THE DATABASE
// COUNTS is `supabase/tests/0086_her_numbers.sql`'s, against a calendar written by hand. Here: the name,
// the argument and every key in `0086`'s own TEXT; the database's own answer at that calendar's moment
// (`RESPUESTA`, copied from the suite's run, not written by hand) read and said as the screen says it.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MIGRATIONS = join(ROOT, 'supabase/migrations');
const code = (path: string) => readFileSync(join(ROOT, 'cocina/src', path), 'utf8').replace(/^\s*\/\/.*$/gm, '');

/** The text of the last migration that defines `fn` (any schema), its whitespace folded. */
function ultimaQueDefine(fn: string): { readonly file: string; readonly body: string } {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const pattern = new RegExp(`create (or replace )?function ${fn.replace('.', '\\.')}\\(`, 'i');
  const hits = files.filter((f) => pattern.test(readFileSync(join(MIGRATIONS, f), 'utf8')));
  if (hits.length === 0) throw new Error(`no migration defines ${fn}`);
  const file = hits[hits.length - 1];
  const text = readFileSync(join(MIGRATIONS, file), 'utf8');
  const start = text.search(pattern);
  const end = text.indexOf('$$;', text.indexOf('$$', start) + 2);
  return { file, body: text.slice(start, end).replace(/\s+/g, ' ') };
}

/**
 * ⚠️ THE DATABASE'S OWN ANSWER, not written here: `servicio.kitchen_numbers_at` at Thursday 2026-11-19, 14:30 in
 * Mexico City, over `supabase/tests/0086_her_numbers.sql`'s calendar — printed by that suite's run on 2026-11-19
 * and pasted; printed again on 2026-11-20 after `0091` (`10.9l`) added the card's keys. The suite asserts every
 * figure in it against the calendar by hand.
 */
const RESPUESTA = JSON.parse(
  '{"day":"2026-11-19","dia":{"to":"2026-11-19","days":[0,0,0,3,0,0,0],"from":"2026-11-19","prev":{"to":"2026-11-18","from":"2026-11-18","cents":11500,"plates":2,"stamps":2,"visits":3,"walk_ins":1,"neighbours":null,"cards_going":5,"return_days":null,"rewards_won":0,"cards_erased":0,"cards_started":null},"cents":22000,"hours":[0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,0,0,0,0,0,0,0,0,0],"plates":3,"stamps":2,"visits":3,"walk_ins":1,"returning":null,"neighbours":null,"cards_going":null,"return_days":null,"rewards_won":0,"cards_erased":0,"cards_started":null,"cards_one_away":null,"rewards_claimed":0,"stamps_handover":1},"mes":{"to":"2026-11-19","days":[2,2,3,3,1,1,1],"from":"2026-11-01","prev":{"to":"2026-10-31","from":"2026-10-01","cents":13000,"plates":2,"stamps":2,"visits":3,"walk_ins":1,"neighbours":null,"cards_going":null,"return_days":null,"rewards_won":0,"cards_erased":0,"cards_started":null},"cents":90000,"hours":[0,0,0,0,0,0,0,0,0,0,0,0,2,3,3,1,1,0,1,1,0,0,0,1],"plates":14,"stamps":8,"visits":13,"walk_ins":4,"returning":3,"neighbours":6,"cards_going":null,"return_days":null,"rewards_won":0,"cards_erased":0,"cards_started":4,"cards_one_away":null,"rewards_claimed":0,"stamps_handover":3},"since":"2026-10-01T05:30:00+00:00","semana":{"to":"2026-11-19","days":[2,2,3,3,0,0,0],"from":"2026-11-16","prev":{"to":"2026-11-15","from":"2026-11-09","cents":19000,"plates":3,"stamps":1,"visits":3,"walk_ins":1,"neighbours":null,"cards_going":null,"return_days":null,"rewards_won":0,"cards_erased":0,"cards_started":null},"cents":71000,"hours":[0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,1,0,0,1,1,0,0,0,1],"plates":11,"stamps":7,"visits":10,"walk_ins":3,"returning":4,"neighbours":5,"cards_going":null,"return_days":null,"rewards_won":0,"cards_erased":0,"cards_started":3,"cards_one_away":null,"rewards_claimed":0,"stamps_handover":3},"rewards_waiting":0}',
) as unknown;

const leida = (): Numeros => {
  const n = numerosFrom(RESPUESTA);
  if (n === null) throw new Error('the database’s answer did not read');
  return n;
};

describe('the name, held to `0086`', () => {
  it('one function, its one argument by the name PostgREST matches on, answering jsonb', () => {
    expect(KITCHEN_NUMBERS).toBe('kitchen_numbers');
    const { file, body } = ultimaQueDefine(`public.${KITCHEN_NUMBERS}`);
    expect(file).toBe('0086_her_numbers.sql');
    expect(body).toMatch(/kitchen_numbers\(p_workspace_id uuid\) returns jsonb/);
    expect(Object.keys(numbersArgs('k'))).toEqual(['p_workspace_id']);
  });

  it('⚠️ the owner’s alone, a kitchen’s alone, and the answer now — nothing else is a door', () => {
    const { body } = ultimaQueDefine(`public.${KITCHEN_NUMBERS}`);
    expect(body).toContain("not public.has_role(p_workspace_id, 'owner')");
    expect(body).toContain("v_kind is distinct from 'cocina'");
    expect(body).toContain("using errcode = 'TD013'");
    expect(body).toContain('return servicio.kitchen_numbers_at(p_workspace_id, now());');
    const walls = readFileSync(join(ROOT, 'supabase/pgtap/_walls.sql'), 'utf8');
    expect(walls).toContain("('kitchen_numbers')");
    expect(walls).not.toMatch(/\('(kitchen_numbers_at|numbers_in|kitchen_events)'\)/);
  });

  it('every key this build reads is one the database writes', () => {
    const at = ultimaQueDefine('servicio.kitchen_numbers_at').body;
    for (const key of ['day', 'since', 'rewards_waiting', 'dia', 'semana', 'mes']) expect(at, key).toContain(`'${key}'`);
    // Her rows read once (her events, and since `0091` her card's stamps, rewards, terms and erased counts).
    expect(at).toContain('select coalesce(array_agg(e), \'{}\') into v_ev from servicio.kitchen_events(p_workspace_id, v_tz) e;');
    expect(at).toContain("select coalesce(array_agg(s), '{}') into v_st from servicio.card_stamp s where s.workspace_id = p_workspace_id;");
    // The period before is asked without `returning`, the days and the hours (`p_full` false).
    const entero = ultimaQueDefine('servicio.period_numbers').body;
    expect(entero).toContain('servicio.numbers_in(p_events, p_tz, p_prev_from, p_prev_to, false)');
    expect(entero).toContain("'prev'");
    expect(entero).toContain("'cards_going', servicio.cards_going_at(p_stamps, p_terms, p_going_before)");
    const periodo = ultimaQueDefine('servicio.numbers_in').body;
    for (const key of ['from', 'to', 'plates', 'cents', 'visits', 'walk_ins', 'neighbours', 'returning', 'days', 'hours']) {
      expect(periodo, key).toContain(`'${key}',`);
    }
    const tarjeta = ultimaQueDefine('servicio.card_numbers_in').body;
    for (const key of ['stamps', 'rewards_won', 'cards_started', 'return_days', 'cards_erased', 'stamps_handover', 'rewards_claimed']) {
      expect(tarjeta, key).toContain(`'${key}',`);
    }
    const ahora = ultimaQueDefine('servicio.cards_going_now').body;
    for (const key of ['cards_going', 'cards_one_away']) expect(ahora, key).toContain(`'${key}',`);
  });

  it('⚠️ the floor of five is the database’s, and this build’s number is the same', () => {
    const periodo = ultimaQueDefine('servicio.numbers_in').body;
    expect(periodo).toContain(`(select p.n from people p) >= ${PISO_DE_VECINOS} then (select p.n from people p) end`);
    expect(periodo).toContain(`'returning', case when (select p.n from people p) >= ${PISO_DE_VECINOS} then`);
    // `0091`: the card's figures about people — the cards going, the gaps' people — from the same five.
    expect(ultimaQueDefine('servicio.cards_going_now').body).toContain(`select case when count(*) >= ${PISO_DE_VECINOS}`);
    expect(ultimaQueDefine('servicio.cards_going_at').body).toContain(`select case when count(*) >= ${PISO_DE_VECINOS} then count(*)::integer end`);
    expect(ultimaQueDefine('servicio.card_numbers_in').body).toContain(`(select count(distinct g.user_id) from gap g) >= ${PISO_DE_VECINOS} then`);
    expect(PISO_DE_VECINOS).toBe(5);
  });

  it('cached under the login and the kitchen — ⚠️ never on the phone’s disk: a count from another day is not today’s', () => {
    expect(numerosKey('u', 'k')).toEqual([...NUMEROS_KEY, 'u', 'k']);
    expect(numerosKey(null, null)).toEqual([...NUMEROS_KEY, '', '']);
    expect(PERSISTED_KEYS.some((root) => root[0] === NUMEROS_KEY[0] && root[1] === NUMEROS_KEY[1])).toBe(false);
  });
});

describe('the answer read', () => {
  it('the database’s own answer reads whole', () => {
    const n = leida();
    expect(n.day).toBe('2026-11-19');
    expect(n.since).toBe('2026-10-01T05:30:00+00:00');
    expect(n.semana).toMatchObject({ from: '2026-11-16', to: '2026-11-19', plates: 11, cents: 71000, visits: 10, walk_ins: 3, neighbours: 5, returning: 4 });
    expect(n.semana.prev).toEqual({
      from: '2026-11-09',
      to: '2026-11-15',
      plates: 3,
      cents: 19000,
      visits: 3,
      walk_ins: 1,
      neighbours: null,
      stamps: 1,
      rewards_won: 0,
      cards_started: null,
      return_days: null,
      cards_erased: 0,
      cards_going: null,
    });
    expect(n.dia.neighbours).toBeNull();
    expect(n.mes.days).toEqual([2, 2, 3, 3, 1, 1, 1]);
  });

  it('before her first visit: `since` null, and it still reads', () => {
    const vacia = JSON.parse(JSON.stringify(RESPUESTA)) as Record<string, unknown>;
    vacia.since = null;
    expect(numerosFrom(vacia)?.since).toBeNull();
  });

  it('⚠️ anything it cannot read is `null` — never a 0 or a person drawn that is not one', () => {
    const roto = (mutar: (r: Record<string, any>) => void): unknown => {
      const r = JSON.parse(JSON.stringify(RESPUESTA)) as Record<string, any>;
      mutar(r);
      return r;
    };
    expect(numerosFrom(null)).toBeNull();
    expect(numerosFrom([])).toBeNull();
    expect(numerosFrom(roto((r) => delete r.mes))).toBeNull();
    expect(numerosFrom(roto((r) => (r.day = '19/11/2026')))).toBeNull();
    expect(numerosFrom(roto((r) => (r.since = 'ayer')))).toBeNull();
    expect(numerosFrom(roto((r) => (r.semana.neighbours = '5')))).toBeNull();
    expect(numerosFrom(roto((r) => (r.semana.neighbours = -1)))).toBeNull();
    expect(numerosFrom(roto((r) => (r.semana.returning = 2.5)))).toBeNull();
    expect(numerosFrom(roto((r) => (r.semana.days = [1, 2, 3])))).toBeNull();
    expect(numerosFrom(roto((r) => (r.semana.hours = r.semana.hours.slice(1))))).toBeNull();
    expect(numerosFrom(roto((r) => (r.dia.prev.visits = null)))).toBeNull();
    expect(numerosFrom(roto((r) => delete r.dia.prev))).toBeNull();
    expect(numerosFrom(roto((r) => (r.mes.cents = 12.5)))).toBeNull();
    // `0091`'s keys: each read, never assumed — a build reading an answer without them says it could not read it.
    expect(numerosFrom(roto((r) => delete r.rewards_waiting))).toBeNull();
    expect(numerosFrom(roto((r) => delete r.semana.stamps))).toBeNull();
    expect(numerosFrom(roto((r) => delete r.semana.stamps_handover))).toBeNull();
    expect(numerosFrom(roto((r) => (r.semana.cards_going = '6')))).toBeNull();
    expect(numerosFrom(roto((r) => (r.semana.prev.return_days = 2.5)))).toBeNull();
    expect(numerosFrom(roto((r) => delete r.dia.prev.cards_erased))).toBeNull();
    expect(numerosFrom(roto((r) => delete r.mes.cards_one_away))).toBeNull();
  });
});

describe('what the screen says — the drawing’s five questions', () => {
  it('the questions, the periods and the floor, in the drawing’s words', () => {
    expect(ES.numeros.preguntas).toEqual({
      platos: '¿Cuántos platos has entregado?',
      visitas: '¿Cuántas veces vinieron?',
      vecinos: '¿Cuántos vecinos distintos?',
      regresan: '¿Cuántos ya habían venido antes?',
      pesos: '¿Cuánto fue en apartados entregados?',
    });
    expect(ES.numeros.periodos).toEqual({ dia: 'Día', semana: 'Semana', mes: 'Mes' });
    expect(ES.numeros.desdeCinco).toBe('Aparece desde cinco vecinos');
    expect(PERIODO_INICIAL).toBe('semana');
  });

  it('THIS WEEK: each answer against the whole week before; five people shown, the week before under five', () => {
    expect(respuestasDe(leida(), 'semana')).toEqual([
      { clave: 'platos', pregunta: '¿Cuántos platos has entregado?', respuesta: '11', detalle: 'Esta semana · la anterior, 3', barra: null },
      { clave: 'visitas', pregunta: '¿Cuántas veces vinieron?', respuesta: '10 visitas', detalle: '3 sin apartar, con su sello · la anterior, 3', barra: null },
      { clave: 'vecinos', pregunta: '¿Cuántos vecinos distintos?', respuesta: '5', detalle: 'Esta semana · la anterior, menos de cinco', barra: null },
      { clave: 'regresan', pregunta: '¿Cuántos ya habían venido antes?', respuesta: '4 de 5', detalle: '80% regresan', barra: 0.8 },
      {
        clave: 'pesos',
        pregunta: '¿Cuánto fue en apartados entregados?',
        respuesta: '$710',
        detalle: 'A precio publicado: lo que cobraste puede variar · la anterior, $190',
        barra: null,
      },
    ]);
  });

  it('TODAY: three people — under the floor, both figures about people wait for five', () => {
    const r = respuestasDe(leida(), 'dia');
    expect(r.map((x) => [x.respuesta, x.detalle])).toEqual([
      ['3', 'Hoy · ayer, 2'],
      ['3 visitas', '1 sin apartar, con su sello · ayer, 3'],
      ['—', 'Aparece desde cinco vecinos'],
      ['—', 'Aparece desde cinco vecinos'],
      ['$220', 'A precio publicado: lo que cobraste puede variar · ayer, $115'],
    ]);
    expect(r.every((x) => x.barra === null)).toBe(true);
  });

  it('THIS MONTH: six people, three had come before November — the percentage rounded, never a fraction of a person', () => {
    const r = respuestasDe(leida(), 'mes');
    expect(r[0]).toMatchObject({ respuesta: '14', detalle: 'Este mes · el anterior, 2' });
    expect(r[2]).toMatchObject({ respuesta: '6', detalle: 'Este mes · el anterior, menos de cinco' });
    expect(r[3]).toMatchObject({ respuesta: '3 de 6', detalle: '50% regresan' });
    expect(r[3].barra).toBeCloseTo(1 / 2);
    const n = leida();
    const tercio = { ...n, mes: { ...n.mes, returning: 2 } };
    expect(respuestasDe(tercio, 'mes')[3]).toMatchObject({ respuesta: '2 de 6', detalle: '33% regresan' });
  });

  it('no walk-ins: the visits say only the period before; one visit is *una visita*', () => {
    const n = leida();
    const sin = { ...n, semana: { ...n.semana, visits: 1, walk_ins: 0 } };
    expect(respuestasDe(sin, 'semana')[1]).toMatchObject({ respuesta: '1 visita', detalle: 'Esta semana · la anterior, 3' });
  });

  it('a period before with five or more says its count', () => {
    const n = leida();
    const con = { ...n, semana: { ...n.semana, prev: { ...n.semana.prev, neighbours: 7 } } };
    expect(respuestasDe(con, 'semana')[2].detalle).toBe('Esta semana · la anterior, 7');
  });

  it('what is counted, true today: the stamps while her kitchen uses the card — or while its stamps are still counted', () => {
    expect(subtituloDe(true)).toBe('Lo que pasa por Wera: tus apartados y quienes juntan sellos');
    expect(subtituloDe(false)).toBe('Lo que pasa por Wera: tus apartados entregados');
    // The card closed, its walk-ins still in her numbers: *N sin apartar, con su sello* is on the screen, so the subtitle names them.
    expect(subtituloDe(false, leida())).toBe('Lo que pasa por Wera: tus apartados y quienes juntan sellos');
    const n = leida();
    const sinSellos = Object.fromEntries(
      (['dia', 'semana', 'mes'] as const).map((p) => [p, { ...n[p], walk_ins: 0, prev: { ...n[p].prev, walk_ins: 0 } }]),
    );
    expect(subtituloDe(false, { ...n, ...sinSellos })).toBe('Lo que pasa por Wera: tus apartados entregados');
  });

  it('a count as she reads it', () => {
    expect([cifra(0), cifra(41), cifra(1280), cifra(1234567), cifra(2.5), cifra(41.0)]).toEqual(['0', '41', '1,280', '1,234,567', '2.5', '41']);
  });
});

/**
 * ⚠️ `10.9l`: THE DATABASE'S OWN ANSWER WITH A CARD, not written here: `servicio.kitchen_numbers_at` at Thursday
 * 2026-11-19, 14:30 in Mexico City, over `supabase/tests/0091_her_numbers_with_the_card.sql`'s calendar (4 stamps,
 * erased after 14 days) — printed by that suite's run on 2026-11-20, before its nightly job, and pasted. The suite
 * asserts every figure in it against the calendar by hand.
 */
const CON_TARJETA = JSON.parse(
  '{"day":"2026-11-19","dia":{"to":"2026-11-19","days":[0,0,0,4,0,0,0],"from":"2026-11-19","prev":{"to":"2026-11-18","from":"2026-11-18","cents":6000,"plates":1,"stamps":4,"visits":4,"walk_ins":3,"neighbours":null,"cards_going":7,"return_days":null,"rewards_won":1,"cards_erased":0,"cards_started":null},"cents":6000,"hours":[0,0,0,0,0,0,0,0,0,1,0,1,1,1,0,0,0,0,0,0,0,0,0,0],"plates":1,"stamps":3,"visits":4,"walk_ins":3,"returning":null,"neighbours":null,"cards_going":6,"return_days":null,"rewards_won":0,"cards_erased":0,"cards_started":null,"cards_one_away":3,"rewards_claimed":0,"stamps_handover":0},"mes":{"to":"2026-11-19","days":[5,6,5,6,1,1,0],"from":"2026-11-01","prev":{"to":"2026-10-31","from":"2026-10-01","cents":0,"plates":0,"stamps":2,"visits":2,"walk_ins":2,"neighbours":null,"cards_going":null,"return_days":null,"rewards_won":0,"cards_erased":0,"cards_started":null},"cents":24000,"hours":[0,0,0,0,0,0,0,0,0,3,0,1,7,3,2,2,2,0,4,0,0,0,0,0],"plates":4,"stamps":22,"visits":24,"walk_ins":20,"returning":1,"neighbours":8,"cards_going":6,"return_days":3,"rewards_won":2,"cards_erased":2,"cards_started":6,"cards_one_away":3,"rewards_claimed":1,"stamps_handover":2},"since":"2026-10-21T03:30:00+00:00","semana":{"to":"2026-11-19","days":[3,5,4,4,0,0,0],"from":"2026-11-16","prev":{"to":"2026-11-15","from":"2026-11-09","cents":0,"plates":0,"stamps":6,"visits":6,"walk_ins":6,"neighbours":5,"cards_going":null,"return_days":null,"rewards_won":0,"cards_erased":1,"cards_started":2},"cents":24000,"hours":[0,0,0,0,0,0,0,0,0,3,0,1,4,2,1,2,0,0,3,0,0,0,0,0],"plates":4,"stamps":14,"visits":16,"walk_ins":12,"returning":5,"neighbours":8,"cards_going":6,"return_days":2,"rewards_won":2,"cards_erased":0,"cards_started":2,"cards_one_away":3,"rewards_claimed":1,"stamps_handover":2},"rewards_waiting":1}',
) as unknown;

const conTarjetaLeida = (): Numeros => {
  const n = numerosFrom(CON_TARJETA);
  if (n === null) throw new Error('the database’s answer with a card did not read');
  return n;
};

describe('what the screen says — `10.9l`: the summary row and *Tu tarjeta de lealtad*', () => {
  it('the card’s six questions and the two sections, in the drawing’s words', () => {
    expect(ES.numeros.preguntasTarjeta).toEqual({
      sellos: '¿Cuántas de tus visitas juntaron sello?',
      premios: '¿Cuántos premios ganaron?',
      juntan: '¿Cuántos juntan sellos ahora?',
      empezaron: '¿Cuántos empezaron tu tarjeta?',
      vuelven: '¿Cada cuánto vuelven quienes juntan sellos?',
      borradas: '¿Cuántas tarjetas se borraron?',
    });
    expect([ES.numeros.apartados, ES.numeros.tarjeta, ES.numeros.cambiarCuando]).toEqual([
      'Tus apartados',
      'Tu tarjeta de lealtad',
      'Cambiar cuándo se borran',
    ]);
  });

  it('the answer with a card reads whole', () => {
    const n = conTarjetaLeida();
    expect(n.rewards_waiting).toBe(1);
    expect(n.semana).toMatchObject({ stamps: 14, stamps_handover: 2, visits: 16, rewards_won: 2, rewards_claimed: 1, cards_going: 6, cards_one_away: 3 });
    expect(n.semana).toMatchObject({ cards_started: 2, return_days: 2, cards_erased: 0 });
    expect(n.semana.prev).toMatchObject({ stamps: 6, cards_going: null, cards_started: 2, return_days: null, cards_erased: 1 });
    expect(n.dia.prev.cards_going).toBe(7);
  });

  it('THE SUMMARY ROW: *platos · visitas · sellos*, each against the period before — *vecinos* without the card', () => {
    expect(resumenDe(conTarjetaLeida(), 'semana', true)).toEqual([
      { clave: 'platos', cifra: '4', que: 'platos', antes: 'la anterior, 0' },
      { clave: 'visitas', cifra: '16', que: 'visitas', antes: 'la anterior, 6' },
      { clave: 'sellos', cifra: '14', que: 'sellos', antes: 'la anterior, 6' },
    ]);
    expect(resumenDe(conTarjetaLeida(), 'semana', false)[2]).toEqual({ clave: 'vecinos', cifra: '8', que: 'vecinos', antes: 'la anterior, 5' });
    // Today four neighbours: *vecinos* under the floor, in the tile's few words.
    expect(resumenDe(conTarjetaLeida(), 'dia', false)[2]).toEqual({ clave: 'vecinos', cifra: '—', que: 'vecinos', antes: 'aparece desde cinco' });
    expect(resumenDe(leida(), 'semana', false)[2]).toEqual({ clave: 'vecinos', cifra: '5', que: 'vecinos', antes: 'la anterior, menos de cinco' });
    const n = conTarjetaLeida();
    const uno = { ...n, dia: { ...n.dia, plates: 1, visits: 1, stamps: 1 } };
    expect(resumenDe(uno, 'dia', true).map((r) => r.que)).toEqual(['plato', 'visita', 'sello']);
    expect(resumenDe(uno, 'dia', true)[0].antes).toBe('ayer, 1');
  });

  it('THIS WEEK: the six answers, her rule under the last', () => {
    expect(tarjetaDe(conTarjetaLeida(), 'semana', 14)).toEqual([
      {
        clave: 'sellos',
        pregunta: '¿Cuántas de tus visitas juntaron sello?',
        respuesta: '14 de 16',
        detalle: '88% · la anterior, 100%',
        barra: 14 / 16,
        debajo: '2 al entregar un apartado · 12 en el mostrador',
      },
      {
        clave: 'premios',
        pregunta: '¿Cuántos premios ganaron?',
        respuesta: '2',
        detalle: 'Esta semana · la anterior, 0',
        barra: null,
        debajo: 'Cobraron 1 esta semana · 1 por entregar',
      },
      {
        clave: 'juntan',
        pregunta: '¿Cuántos juntan sellos ahora?',
        respuesta: '6 tarjetas',
        detalle: 'hace una semana, menos de cinco',
        barra: null,
        debajo: '3 están a un sello del premio',
      },
      { clave: 'empezaron', pregunta: '¿Cuántos empezaron tu tarjeta?', respuesta: '2', detalle: 'Esta semana · la anterior, 2', barra: null },
      {
        clave: 'vuelven',
        pregunta: '¿Cada cuánto vuelven quienes juntan sellos?',
        respuesta: '2 días',
        detalle: 'Esta semana · la anterior, con menos de cinco vecinos',
        barra: null,
        debajo: 'Entre un sello y el siguiente, la mitad tarda menos',
      },
      {
        clave: 'borradas',
        pregunta: '¿Cuántas tarjetas se borraron?',
        respuesta: '0',
        detalle: 'Esta semana · la anterior, 1',
        barra: null,
        debajo: 'Por pasar 2 semanas sin venir',
        cambiar: true,
      },
    ]);
  });

  it('TODAY: the cards going against yesterday at this hour; new cards and the gaps wait for five; *Nunca* said as hers', () => {
    const r = tarjetaDe(conTarjetaLeida(), 'dia', null);
    expect(r.map((x) => [x.respuesta, x.detalle, x.debajo])).toEqual([
      ['3 de 4', '75% · ayer, 100%', '0 al entregar un apartado · 3 en el mostrador'],
      ['0', 'Hoy · ayer, 1', '1 por entregar'],
      ['6 tarjetas', 'ayer a esta hora, 7', '3 están a un sello del premio'],
      ['—', 'Aparece desde cinco vecinos', undefined],
      ['—', 'Aparece desde cinco vecinos', undefined],
      ['0', 'Hoy · ayer, 0', 'Elegiste que nunca se borren'],
    ]);
  });

  it('THIS MONTH: 2.5 days came back rounded by the database; her rule not read — nothing said under it, the link still there', () => {
    const r = tarjetaDe(conTarjetaLeida(), 'mes', undefined);
    expect(r[0]).toMatchObject({ respuesta: '22 de 24', detalle: '92% · el anterior, 100%', debajo: '2 al entregar un apartado · 20 en el mostrador' });
    expect(r[2]).toMatchObject({ respuesta: '6 tarjetas', detalle: 'hace un mes, menos de cinco' });
    expect(r[3]).toMatchObject({ respuesta: '6', detalle: 'Este mes · el anterior, menos de cinco' });
    expect(r[4]).toMatchObject({ respuesta: '3 días', detalle: 'Este mes · el anterior, con menos de cinco vecinos' });
    expect(r[5]).toEqual({ clave: 'borradas', pregunta: '¿Cuántas tarjetas se borraron?', respuesta: '2', detalle: 'Este mes · el anterior, 0', barra: null, cambiar: true });
  });

  it('her rule in `10.9k`’s words: *1 mes*, *21 días*', () => {
    expect(tarjetaDe(conTarjetaLeida(), 'semana', 30)[5].debajo).toBe('Por pasar 1 mes sin venir');
    expect(tarjetaDe(conTarjetaLeida(), 'semana', 21)[5].debajo).toBe('Por pasar 21 días sin venir');
  });

  it('one of each is said as one; nothing under an answer with nothing to split; no visit at all has no share', () => {
    const n = conTarjetaLeida();
    const uno = {
      ...n,
      rewards_waiting: 0,
      semana: { ...n.semana, stamps: 0, stamps_handover: 0, rewards_claimed: 0, cards_going: 5, cards_one_away: 1, return_days: 1 },
    };
    const r = tarjetaDe(uno, 'semana', 14);
    expect(r[0]).toMatchObject({ respuesta: '0 de 16', detalle: '0% · la anterior, 100%' });
    expect(r[0].debajo).toBeUndefined();
    expect(r[1].debajo).toBeUndefined();
    expect(r[2]).toMatchObject({ respuesta: '5 tarjetas', debajo: '1 está a un sello del premio' });
    expect(r[4].respuesta).toBe('1 día');
    const nadie = { ...n, dia: { ...n.dia, visits: 0, stamps: 0, stamps_handover: 0, prev: { ...n.dia.prev, visits: 0, stamps: 0 } } };
    expect(tarjetaDe(nadie, 'dia', 14)[0]).toMatchObject({ respuesta: '0', detalle: 'Hoy · ayer, sin visitas', barra: null });
    const sinCercanos = { ...n, semana: { ...n.semana, cards_one_away: 0 } };
    expect(tarjetaDe(sinCercanos, 'semana', 14)[2].debajo).toBeUndefined();
  });

  it('without the card, the five answers are today’s, unchanged — the card’s section is the screen’s to leave out', () => {
    expect(respuestasDe(conTarjetaLeida(), 'semana').map((r) => r.clave)).toEqual(['platos', 'visitas', 'vecinos', 'regresan', 'pesos']);
    expect(respuestasDe(conTarjetaLeida(), 'semana').every((r) => r.debajo === undefined && r.cambiar === undefined)).toBe(true);
  });
});

describe('the bars — *Tus días fuertes* and *Tus horas fuertes*', () => {
  it('days: Monday to Sunday, for a week or a month — a single day has none', () => {
    expect(diasFuertes(leida(), 'dia')).toEqual([]);
    expect(diasFuertes(leida(), 'semana')).toEqual([
      { etiqueta: 'Lun', valor: 2 },
      { etiqueta: 'Mar', valor: 2 },
      { etiqueta: 'Mié', valor: 3 },
      { etiqueta: 'Jue', valor: 3 },
      { etiqueta: 'Vie', valor: 0 },
      { etiqueta: 'Sáb', valor: 0 },
      { etiqueta: 'Dom', valor: 0 },
    ]);
    expect(diasFuertes(leida(), 'mes').map((b) => b.valor)).toEqual([2, 2, 3, 3, 1, 1, 1]);
  });

  it('hours: from her first hour with a visit to her last, the empty ones between drawn too', () => {
    expect(horasFuertes(leida(), 'dia')).toEqual([
      { etiqueta: '13 h', valor: 1 },
      { etiqueta: '14 h', valor: 2 },
    ]);
    const semana = horasFuertes(leida(), 'semana');
    expect(semana.map((b) => b.etiqueta)).toEqual(['12 h', '13 h', '14 h', '15 h', '16 h', '17 h', '18 h', '19 h', '20 h', '21 h', '22 h', '23 h']);
    expect(semana.map((b) => b.valor)).toEqual([1, 2, 3, 1, 0, 0, 1, 1, 0, 0, 0, 1]);
  });

  it('nobody came: no bars at all — seven empty ones would say nothing', () => {
    const n = leida();
    const nada = { ...n, semana: { ...n.semana, visits: 0, days: [0, 0, 0, 0, 0, 0, 0], hours: Array(24).fill(0) as number[] } };
    expect(diasFuertes(nada, 'semana')).toEqual([]);
    expect(horasFuertes(nada, 'semana')).toEqual([]);
  });

  it('each set adds up to its period’s visits — the database’s promise, read here', () => {
    for (const p of ['dia', 'semana', 'mes'] as const) {
      const n = leida()[p];
      expect(horasFuertes(leida(), p).reduce((s, b) => s + b.valor, 0), p).toBe(n.visits);
      if (p !== 'dia') expect(diasFuertes(leida(), p).reduce((s, b) => s + b.valor, 0), p).toBe(n.visits);
    }
  });
});

describe('the tile on *Hoy*', () => {
  it('this week’s plates against the whole week before — said as the screen says it, never *N más*', () => {
    expect(enVivoDe(leida())).toEqual({ valor: '11 platos', detalle: 'entregados esta semana · la anterior, 3', porHacer: false });
    const n = leida();
    expect(enVivoDe({ ...n, semana: { ...n.semana, plates: 1 } })?.valor).toBe('1 plato');
  });

  it('before her first visit ever: its first-time state (the page’s words)', () => {
    expect(enVivoDe({ ...leida(), since: null })).toBeNull();
    expect(ES.mosaicos.primera.numeros).toEqual(['Empiezan con tu primera entrega', 'Se llenan solos']);
  });

  it('its read failed or waits for a signal: it says so, without guessing why — never a first time that is not one', () => {
    expect(enVivoDe(null)).toEqual({ valor: '—', detalle: 'No se pudieron leer', porHacer: false });
  });

  it('a read from another day is not today’s, by the phone’s calendar', () => {
    const ahora = new Date(2026, 10, 19, 14, 30);
    expect(leidoHoy(new Date(2026, 10, 19, 0, 1).getTime(), ahora)).toBe(true);
    expect(leidoHoy(new Date(2026, 10, 18, 23, 59).getTime(), ahora)).toBe(false);
    expect(leidoHoy(null, ahora)).toBe(false);
    expect(leidoHoy(0, ahora)).toBe(false);
  });

  it('⚠️ a read that lands after midnight while the clock still says 23:59 is today’s — never asked again and again', () => {
    const relojAtrasado = new Date(2026, 10, 18, 23, 59, 40);
    expect(leidoHoy(new Date(2026, 10, 19, 0, 0, 1).getTime(), relojAtrasado)).toBe(true);
    // …and once the clock ticks past midnight, still today's.
    expect(leidoHoy(new Date(2026, 10, 19, 0, 0, 1).getTime(), new Date(2026, 10, 19, 0, 0, 30))).toBe(true);
  });
});

describe('whose they are', () => {
  const usa = (estado: 'on' | 'off' | 'interesada'): LoQueUsa => ({
    ...NADA,
    ofrecidos: ['tarjeta', 'numeros'],
    elecciones: { numeros: { estado, desde: new Date('2026-11-19T12:00:00Z') } },
  });

  it('⚠️ the owner’s, while she uses them and this build carries them — never a helper’s', () => {
    expect(PANTALLA_DE.numeros).toBe('/numeros');
    expect(veSusNumeros(usa('on'), true)).toBe(true);
    expect(veSusNumeros(usa('on'), false)).toBe(false);
    expect(veSusNumeros(usa('off'), true)).toBe(false);
    expect(veSusNumeros(usa('interesada'), true)).toBe(false);
    expect(veSusNumeros(undefined, true)).toBe(false);
    expect(veSusNumeros(usa('on'), true, ['tarjeta'])).toBe(false);
  });

  it('her first handover says it counts in her numbers — only when she sees them', () => {
    // Never *empiezan hoy*: a walk-in's stamp may have started them before her first plate.
    expect(palabrasDelFestejo('entrega', true)).toBe('¡Tu primera entrega! Ya cuenta en tus números');
    expect(palabrasDelFestejo('entrega', false)).toBe('¡Tu primera entrega!');
    expect(palabrasDelFestejo('apartado', true)).toBe('¡Tu primer apartado!');
  });
});

describe('the wiring, read as text', () => {
  it('the screen asks only as the owner, sends a helper to *Hoy*, and turns them off with one choice and *Deshacer*', () => {
    const pantalla = code('app/(cocina)/numeros.tsx');
    expect(pantalla).toContain('const numeros = useNumeros(kitchenId, { activa: duena });');
    expect(pantalla).toContain("if (rol !== undefined && !duena) return <Redirect href=\"/\" />;");
    expect(pantalla).toContain("const fallo = await elegir({ numeros: 'off' });");
    expect(pantalla).toContain("avisar(ES.numeros.dejados, () => elegir({ numeros: 'on' }),");
    expect(pantalla).toContain('<AsiFunciona servicio="numeros" onCerrar={asi.cerrar} />');
    // `10.9l`: the card's section only while her kitchen uses the card, its link to `10.9k`'s setup.
    expect(pantalla).toContain('{usaTarjeta && (');
    expect(pantalla).toContain("onCambiar={r.cambiar ? () => router.push('/preparar-tarjeta') : undefined}");
    expect(pantalla).toContain('const tarjeta = useTarjeta(kitchenId, { activa: duena && usaTarjeta });');
  });

  it('⚠️ a read from another day is read again — and not while one failed or waits for a signal, which would ask for ever', () => {
    for (const path of ['app/(cocina)/numeros.tsx', 'app/(cocina)/(tabs)/index.tsx']) {
      const src = code(path);
      expect(src, path).toMatch(/leidoHoy\((numeros|numerosLeidos)\.dataUpdatedAt, ahora\)/);
      expect(src, path).toMatch(/\.isError \|\| (numeros|numerosLeidos)\.fetchStatus === 'paused'/);
      expect(src, path).toMatch(/!(numeros|numerosLeidos)\.isFetching && !(sinLeer|numerosSinLeer)/);
    }
  });

  it('⚠️ a plate handed over or a stamp given reads them again — the tile never lags the celebration', () => {
    expect(code('lib/ColaProvider.tsx')).toContain('void client.invalidateQueries({ queryKey: NUMEROS_KEY });');
    expect(code('api/hooks.ts')).toMatch(/invalidateQueries\(\{ queryKey: TARJETA_KEY \}\);\s+void queries\.invalidateQueries\(\{ queryKey: NUMEROS_KEY \}\);\s+return \{ tipo: 'tarjeta', card \};/);
  });

  it('*Hoy*’s tile waits for its read — never *Empiezan con tu primera entrega* over a kitchen that has some', () => {
    const hoy = code('app/(cocina)/(tabs)/index.tsx');
    expect(hoy).toContain(".filter((m) => m.servicio !== 'numeros' || numerosVivos !== undefined)");
    // Today's read wins over a later refetch that failed; with none, a failed or paused read is said.
    expect(hoy).toContain('const numerosVivos = numerosDeHoy ?? (numerosSinLeer ? null : undefined);');
  });
});

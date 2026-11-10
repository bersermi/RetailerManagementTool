import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  COMERES,
  ESTADOS,
  ETIQUETAS,
  ETIQUETAS_ABAJO,
  ETIQUETAS_ARRIBA,
  HISTORIAL_DIAS,
  NO_SE_PRESENTO,
  PAGOS,
  RESERVATION_HISTORY_ORDER,
  RESERVATION_ORDER,
  POR_CODIGO,
  RESERVATION_COLUMNS,
  desdeDia,
  diaTexto,
  estadoDe,
  etiquetasDelLado,
  fallaDe,
  handOverArgs,
  noSePresentoArgs,
  rateNeighbourArgs,
  reservaOf,
  reservasFrom,
  tomado,
  vecinosFrom,
  type Reserva,
  type SobreElVecino,
} from '@/api/apartados';
import { terminosKey, aceptoTerminos, aceptarTerminos } from '@/lib/terminos';
import {
  PRONTO_MS,
  buscarCodigo,
  calificacionTexto,
  cobrasteTexto,
  cobroLargoTexto,
  cuandoTexto,
  conEntrega,
  deHoy,
  entregadosHoy,
  estadoTexto,
  filaTexto,
  firmaDeHoy,
  horaTexto,
  montoTexto,
  pasaTexto,
  historial,
  loQueSigue,
  marcaDe,
  marcaTexto,
  ordenesDe,
  porCalificar,
  porEntregar,
  porcentajeDe,
  siNoLoCalificasTexto,
  sinNoSePresento,
  tarjetaTexto,
  teclear,
  tomadosDe,
  vivo,
  type Orden,
} from '@/lib/apartados';
import type { DeviceStore } from '@/lib/store';
import { ES } from '@/strings';

// ============================================================================
// *APARTADOS* — SHE SEES AND HANDS OVER. Plan task `10.5b-iv-a` (`@/api/apartados`,
// `@/lib/apartados`, the three screens): the owner's final design of 2026-11-10 (its table of
// states) and slice 3's handover (the family-shell page, stage 2).
//
// ⚠️ THE DATABASE'S TWO DEFINITIONS THIS APP REPEATS ARE READ OUT OF THE MIGRATION THAT
// DEFINES EACH LAST — `reservation_state` and `listing_line_taken` — as `test/comoLaVen.test.ts`
// reads the door's: a later migration that changes either turns this file red until the copy
// follows. So are the codes, the labels, the states, and the columns a member may read.
// ⚠️ IN MEXICO CITY'S ZONE, as `test/hoy.test.ts`: "today" and every hour are local. Every
// local moment is built inside its `it`, after the pin. The screens are read as text — no
// suite renders (ADR-035 §2.11); what they look like is the phone's to show.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MIGRATIONS = join(ROOT, 'supabase/migrations');
const SRC = join(ROOT, 'cocina/src');
const code = (path: string) => readFileSync(join(SRC, path), 'utf8');

const migraciones = () => readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const texto = (file: string) => readFileSync(join(MIGRATIONS, file), 'utf8');

/** The body of the last migration that defines `fn`, whitespace folded — the one the database runs. */
function ultimaQueDefine(fn: string): { readonly file: string; readonly body: string } {
  const pattern = new RegExp(`create (or replace )?function public\\.${fn}\\(`, 'i');
  const hits = migraciones().filter((f) => pattern.test(texto(f)));
  if (hits.length === 0) throw new Error(`no migration defines ${fn}`);
  const file = hits[hits.length - 1];
  const t = texto(file);
  const start = t.search(pattern);
  const end = t.indexOf('$$;', t.indexOf('$$', start) + 2);
  return { file, body: t.slice(start, end).replace(/\s+/g, ' ') };
}

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
/** Tuesday 10 November 2026, 14:20 — the final design's *Apartados · Hoy*. */
const ahora = () => nov(10, 14, 20);

/** A reservation as this app holds it — one plate of mole at 14:45, held to 16:00, cash, to go. */
function reserva(id: string, extra: Partial<Reserva> = {}): Reserva {
  return {
    id,
    ofertaId: 'oferta-1',
    codigo: '347',
    dia: '2026-11-10',
    hora: nov(10, 14, 45),
    guardadaHasta: nov(10, 16),
    creadaEn: nov(10, 13, 10),
    canceladaEn: null,
    canceladaPorLaCocina: false,
    entregadaEn: null,
    recogidaEn: null,
    pago: 'efectivo',
    comer: 'llevar',
    platos: [{ lineaDeOferta: 1, nombre: 'Mole con arroz', sorpresa: false, cantidad: 1, precioCentavos: 6000, desechableCentavos: 500 }],
    cobroCentavos: 6500,
    desechablesCentavos: 500,
    ...extra,
  };
}

const ana: SobreElVecino = { vecino: { nombre: 'Ana R.', calificacion: { up: 11, total: 12 } }, pulgar: null, calificarHasta: null };

function orden(id: string, extra: Partial<Reserva> = {}, sobre: SobreElVecino = ana): Orden {
  return ordenesDe([reserva(id, extra)], { [id]: sobre }, ahora())[0];
}

describe('the read — her kitchen’s reservations, as a member may read them', () => {
  it('names every column it reads, never `buyer_id` — granted to nobody — and only columns a member is granted', () => {
    const top = RESERVATION_COLUMNS.slice(0, RESERVATION_COLUMNS.indexOf('reservation_line(')).split(',').filter(Boolean);
    expect(top).not.toContain('buyer_id');
    expect(RESERVATION_COLUMNS).not.toMatch(/\*/);
    const granted = migraciones()
      .flatMap((f) => [...texto(f).matchAll(/grant select \(([^)]*)\)\s+on public\.reservation to authenticated/g)])
      .flatMap((m) => m[1].split(',').map((c) => c.trim()));
    for (const column of top) expect(granted, column).toContain(column);
  });

  it('reaches as far back as `reservation_neighbours` does — 30 days — so no order shows without its line', () => {
    expect(ultimaQueDefine('reservation_neighbours').body).toContain(`::date - ${HISTORIAL_DIAS}`);
    expect(desdeDia(nov(10, 0, 5))).toBe('2026-10-11');
    expect(desdeDia(nov(10, 23, 55))).toBe('2026-10-11');
    expect(diaTexto(nov(1, 0, 30))).toBe('2026-11-01');
  });

  it('reads a row as PostgREST sends it — numbers as JSON numbers, money exact, the desechable charged per plate', () => {
    const row = {
      id: 'r1',
      listing_id: 'o1',
      code: 347,
      pickup_at: '2026-11-10T20:45:00+00:00',
      pickup_day: '2026-11-10',
      held_until: '2026-11-10T22:00:00+00:00',
      payment: 'tarjeta',
      eat: 'llevar',
      created_at: '2026-11-10T19:10:00+00:00',
      cancelled_at: null,
      cancelled_by: null,
      handed_over_at: null,
      picked_up_at: null,
      reservation_line: [
        { line_no: 2, quantity: 2, unit_price: 45.5, container_price: 5, listing_line: { line_no: 3, name: 'Bolsa de pan', surprise: true } },
        { line_no: 1, quantity: '1.000', unit_price: '60.00', container_price: null, listing_line: { line_no: 1, name: 'Mole con arroz', surprise: false } },
      ],
    };
    const r = reservaOf(row);
    expect(r.codigo).toBe('347');
    expect(r.platos.map((p) => [p.lineaDeOferta, p.nombre, p.cantidad, p.precioCentavos, p.desechableCentavos])).toEqual([
      [1, 'Mole con arroz', 1, 6000, null],
      [3, 'Bolsa de pan', 2, 4550, 500],
    ]);
    expect(r.desechablesCentavos).toBe(1000);
    expect(r.cobroCentavos).toBe(6000 + 2 * 4550 + 1000);
    expect(r.canceladaPorLaCocina).toBe(false);
    expect(reservaOf({ ...row, cancelled_at: '2026-11-10T19:30:00Z', cancelled_by: 'u1' }).canceladaPorLaCocina).toBe(true);
  });

  it('leaves out a row it cannot read, never the list', () => {
    const good = {
      id: 'r1', listing_id: 'o1', code: 347, pickup_at: '2026-11-10T20:45:00Z', pickup_day: '2026-11-10', held_until: '2026-11-10T22:00:00Z',
      payment: 'efectivo', eat: 'aqui', created_at: '2026-11-10T19:00:00Z', cancelled_at: null, cancelled_by: null, handed_over_at: null, picked_up_at: null,
      reservation_line: [{ line_no: 1, quantity: 1, unit_price: 60, container_price: null, listing_line: { line_no: 1, name: 'Mole', surprise: false } }],
    };
    const lista = reservasFrom([good, { ...good, id: 'r2', code: 42 }, { ...good, id: 'r3', payment: 'bitcoin' }, { ...good, id: 'r4', reservation_line: [] }, null]);
    expect(lista.map((r) => r.id)).toEqual(['r1']);
    expect(reservasFrom(null)).toEqual([]);
  });

  it('reads what reservation_neighbours says: her name and score, the thumb, the clock’s, until when', () => {
    const vecinos = vecinosFrom([
      { id: 'a', neighbour: { name: 'Ana R.', score: { up: 11, total: 12 } }, thumb: null, rate_until: '2026-11-11T22:00:00Z' },
      { id: 'b', neighbour: { name: 'Rosa M.', score: null }, thumb: null, rate_until: null },
      { id: 'c', neighbour: null, thumb: { up: false, labels: ['no_se_presento'], given_at: '2026-11-10T22:00:00Z', change_until: null, clock: true }, rate_until: null },
      { id: 'd', neighbour: null, thumb: { up: true, labels: ['amable', 'a_tiempo', 'inventada'], given_at: '2026-11-10T21:00:00Z', change_until: '2026-11-11T21:00:00Z', clock: false }, rate_until: null },
      { neighbour: null },
    ]);
    expect(Object.keys(vecinos)).toEqual(['a', 'b', 'c', 'd']);
    expect(vecinos.a.vecino).toEqual({ nombre: 'Ana R.', calificacion: { up: 11, total: 12 } });
    expect(vecinos.b.vecino).toEqual({ nombre: 'Rosa M.', calificacion: null });
    expect(vecinos.c.pulgar).toMatchObject({ arriba: false, etiquetas: ['no_se_presento'], reloj: true, cambiarHasta: null });
    // Labels in the list's order, an unknown one dropped.
    expect(vecinos.d.pulgar?.etiquetas).toEqual(['a_tiempo', 'amable']);
  });
});

describe('the two definitions the database keeps — repeated, and held to its text', () => {
  it('`reservation_state`: a handover or her Ya lo tengo wins; then the kitchen’s cancel; hers within the hour or not; the window over; pending', () => {
    const { body } = ultimaQueDefine('reservation_state');
    expect(body).toContain("when p_handed_over_at is not null or p_picked_up_at is not null then 'recogido'");
    expect(body).toContain("when p_cancelled_at is not null and p_cancelled_by is not null then 'cancelado_cocina'");
    expect(body).toContain("case when p_cancelled_at >= p_pickup_at - interval '1 hour' then 'no_va' else 'cancelado' end");
    expect(body).toContain("when p_held_until <= now() then 'liberado'");
    expect(body).toContain("else 'apartado'");
    // Its states, every one the app knows, and none it does not.
    const estados = [...body.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).filter((s) => !/hour/.test(s));
    expect([...new Set(estados)].sort()).toEqual([...ESTADOS].sort());

    const base = { canceladaEn: null, canceladaPorLaCocina: false, entregadaEn: null, recogidaEn: null, hora: nov(10, 14, 45), guardadaHasta: nov(10, 16) };
    expect(estadoDe(base, ahora())).toBe('apartado');
    expect(estadoDe(base, nov(10, 16))).toBe('liberado');
    expect(estadoDe({ ...base, recogidaEn: nov(10, 14, 50) }, nov(10, 17))).toBe('recogido');
    expect(estadoDe({ ...base, canceladaEn: nov(10, 13, 44) }, ahora())).toBe('cancelado');
    expect(estadoDe({ ...base, canceladaEn: nov(10, 13, 45) }, ahora())).toBe('no_va');
    expect(estadoDe({ ...base, canceladaEn: nov(10, 13), canceladaPorLaCocina: true }, ahora())).toBe('cancelado_cocina');
    // A handover wins over a cancel made while the counter had no signal.
    expect(estadoDe({ ...base, canceladaEn: nov(10, 13), entregadaEn: nov(10, 14) }, ahora())).toBe('recogido');
  });

  it('`listing_line_taken`: taken unless cancelled — and a cancelled plate handed over all the same is taken', () => {
    expect(ultimaQueDefine('listing_line_taken').body).toContain(
      'and (r.cancelled_at is null or r.handed_over_at is not null or r.picked_up_at is not null)',
    );
    const base = { canceladaEn: null, canceladaPorLaCocina: false, entregadaEn: null, recogidaEn: null, hora: nov(10, 14), guardadaHasta: nov(10, 16) };
    expect(tomado(base)).toBe(true);
    expect(tomado({ ...base, canceladaEn: nov(10, 13) })).toBe(false);
    expect(tomado({ ...base, canceladaEn: nov(10, 13), entregadaEn: nov(10, 14) })).toBe(true);
    expect(tomado({ ...base, canceladaEn: nov(10, 13), recogidaEn: nov(10, 14) })).toBe(true);
  });

  it('*Quedan*: every plate taken, by the offer and the dish’s line in it', () => {
    const t = tomadosDe([
      reserva('a'),
      reserva('b', { platos: [{ lineaDeOferta: 1, nombre: 'Mole', sorpresa: false, cantidad: 2, precioCentavos: 6000, desechableCentavos: null }] }),
      reserva('c', { canceladaEn: nov(10, 12) }),
      reserva('d', { ofertaId: 'oferta-2' }),
    ]);
    expect([...t.entries()]).toEqual([
      ['oferta-1:1', 3],
      ['oferta-2:1', 1],
    ]);
  });

  it('the methods, the ways and the labels are the database’s closed lists', () => {
    const t0079 = texto('0079_reserving_and_collecting.sql');
    expect(t0079).toContain(`check (payment in (${PAGOS.map((p) => `'${p}'`).join(', ')}))`);
    expect(t0079).toContain(`check (eat in (${COMERES.map((c) => `'${c}'`).join(', ')}))`);
    const rate = ultimaQueDefine('rate_neighbour').body;
    expect(rate).toContain("array['a_tiempo', 'amable', 'tarde', 'pago', 'no_se_presento']");
    expect([...ETIQUETAS].sort()).toEqual(['a_tiempo', 'amable', 'no_se_presento', 'pago', 'tarde']);
    expect(rate).toContain(`v_labels <@ array[${ETIQUETAS_ARRIBA.map((e) => `'${e}'`).join(', ')}]`);
    expect(rate).toContain(`v_labels <@ array[${ETIQUETAS_ABAJO.map((e) => `'${e}'`).join(', ')}]`);
  });

  it('every refusal it turns into a sentence is one the database raises, and each has its sentence', () => {
    const todas = migraciones().map(texto).join('\n');
    for (const codigo of Object.keys(POR_CODIGO)) {
      if (codigo.startsWith('PGRST')) continue;
      expect(todas, codigo).toContain(`errcode = '${codigo}'`);
    }
    for (const falla of Object.values(POR_CODIGO)) expect(ES.apartados.fallas[falla], falla).toBeTruthy();
    expect(fallaDe({ code: 'TD022' })).toBe('yaNoSeCalifica');
    expect(fallaDe({ code: '42501' })).toBe('sesion');
    expect(fallaDe(new TypeError('Network request failed'))).toBe('sinSenal');
    expect(fallaDe({ message: 'Network request failed: no answer in 30 s' })).toBe('sinSenal');
    expect(fallaDe({ code: 'XX000' })).toBe('otra');
    expect(fallaDe(null)).toBe('otra');
  });
});

describe('what is sent', () => {
  it('a thumb carries only its side’s labels, in the list’s order — a change of thumb drops the other side’s', () => {
    const at = nov(10, 14, 31);
    expect(rateNeighbourArgs('r1', { arriba: true, etiquetas: ['amable', 'tarde', 'a_tiempo'] }, at)).toEqual({
      p_reservation_id: 'r1',
      p_up: true,
      p_labels: ['a_tiempo', 'amable'],
      p_at: at.toISOString(),
    });
    expect(etiquetasDelLado(false, ['amable', 'pago'])).toEqual(['pago']);
    expect(noSePresentoArgs('r2', at)).toEqual({ p_reservation_id: 'r2', p_up: false, p_labels: [NO_SE_PRESENTO], p_at: at.toISOString() });
  });

  it('the handover sends the moment she tapped, for the queue that sends it late (`10.5b-iv-b`)', () => {
    const at = nov(10, 14, 31);
    expect(handOverArgs('r1', at)).toEqual({ p_id: 'r1', p_at: at.toISOString() });
    // Drawn at once, as the database keeps it: never before the order was made, never twice.
    const [r] = conEntrega([reserva('r1')], 'r1', nov(10, 12)) ?? [];
    expect(r.entregadaEn).toEqual(nov(10, 13, 10));
    const [s] = conEntrega([reserva('r1', { entregadaEn: nov(10, 14) })], 'r1', nov(10, 15)) ?? [];
    expect(s.entregadaEn).toEqual(nov(10, 14));
  });
});

describe('Sí pasó, on the phone as in the database', () => {
  it('a handover clears a No se presentó thumb, and only that one (found on the emulator: the panel opened on 👎)', () => {
    const { body } = ultimaQueDefine('hand_over_reservation');
    expect(body).toContain("delete from servicio.reservation_thumb t where t.reservation_id = v_r.id and 'no_se_presento' = any (t.labels);");
    const noShow = { arriba: false, etiquetas: ['no_se_presento' as const], dadoEn: nov(10, 13), cambiarHasta: nov(11, 13), reloj: false };
    const tarde = { arriba: false, etiquetas: ['tarde' as const], dadoEn: nov(10, 13), cambiarHasta: nov(11, 13), reloj: false };
    const vecinos = { a: { ...ana, pulgar: noShow }, b: { ...ana, pulgar: tarde } };
    expect(sinNoSePresento(vecinos, 'a').a.pulgar).toBeNull();
    expect(sinNoSePresento(vecinos, 'b').b.pulgar).toEqual(tarde);
    expect(sinNoSePresento(vecinos, 'z')).toEqual(vecinos);
    expect(code('api/hooks.ts')).toMatch(/vecinos === undefined \? undefined : sinNoSePresento\(vecinos, input\.id\)/);
  });
});

describe('each state: one mark, one action (the final design’s table)', () => {
  it('to hand over: green Entregar; its hour rust 15 minutes before, and after', () => {
    expect(PRONTO_MS).toBe(15 * 60_000);
    expect(marcaDe(orden('a', { hora: nov(10, 14, 45) }), ahora())).toBe('porEntregar');
    expect(marcaDe(orden('a', { hora: nov(10, 14, 35) }), ahora())).toBe('pronto');
    expect(marcaDe(orden('a', { hora: nov(10, 14, 0) }), ahora())).toBe('pronto');
    expect(ES.apartados.en(10)).toBe('en 10 min');
    expect(ES.apartados.en(0)).toBe('es ahora');
    expect(ES.apartados.en(-5)).toBe('hace 5 min');
  });

  it('handed over and not rated: Por calificar, while the database says a first thumb may be given', () => {
    const abierta = { ...ana, calificarHasta: nov(11, 16) };
    expect(marcaDe(orden('a', { entregadaEn: nov(10, 14) }, abierta), ahora())).toBe('porCalificar');
    expect(marcaDe(orden('a', { entregadaEn: nov(10, 14) }, abierta), nov(11, 16, 1))).toBe('entregado');
    const pulgar = { arriba: true, etiquetas: ['a_tiempo' as const], dadoEn: nov(10, 14, 1), cambiarHasta: nov(11, 14, 1), reloj: false };
    const calificada = orden('a', { entregadaEn: nov(10, 14) }, { vecino: null, pulgar, calificarHasta: null });
    expect(marcaDe(calificada, ahora())).toBe('entregado');
    expect(marcaTexto(calificada, ahora())).toBe('Entregado · 👍');
  });

  it('a plate that se liberó: No se presentó and Sí pasó while it may be rated; then the clock’s, or nothing more', () => {
    const libre = { guardadaHasta: nov(10, 14) };
    expect(marcaDe(orden('a', libre, { ...ana, calificarHasta: nov(11, 14) }), ahora())).toBe('seLibero');
    expect(marcaDe(orden('a', libre, { ...ana, calificarHasta: null }), ahora())).toBe('liberado');
    const reloj = { arriba: false, etiquetas: ['no_se_presento' as const], dadoEn: nov(11, 14), cambiarHasta: null, reloj: true };
    expect(marcaDe(orden('a', libre, { vecino: null, pulgar: reloj, calificarHasta: null }), ahora())).toBe('noSePresento');
  });

  it('cancelled, a no-go, the kitchen’s cancel: grey or red, and no action', () => {
    expect(marcaDe(orden('a', { canceladaEn: nov(10, 12) }), ahora())).toBe('cancelo');
    expect(marcaDe(orden('a', { canceladaEn: nov(10, 14) }), ahora())).toBe('noVa');
    expect(marcaDe(orden('a', { canceladaEn: nov(10, 12), canceladaPorLaCocina: true }), ahora())).toBe('canceladoCocina');
  });

  it('the card’s words: the number and what to prepare first, then how and what to charge', () => {
    const o = orden('a');
    expect(tarjetaTexto(o)).toBe('Empácala · Cobra $65 en efectivo');
    expect(tarjetaTexto(orden('b', { comer: 'aqui', pago: 'tarjeta', cobroCentavos: 6000 }))).toBe('Sírvela · Cobra $60 con tarjeta');
    expect(estadoTexto(orden('c', { entregadaEn: nov(10, 13, 34) }, { ...ana, calificarHasta: nov(11, 16) }), ahora())).toBe('Entregado a las 13:34');
    expect(estadoTexto(orden('d', { guardadaHasta: nov(10, 14), hora: nov(9, 15) }, { ...ana, calificarHasta: nov(11, 14) }), ahora())).toBe(
      'Ayer · 15:00 · no pasó por ella',
    );
    expect(siNoLoCalificasTexto(orden('d', { guardadaHasta: nov(10, 14) }, { ...ana, calificarHasta: nov(11, 14) }), ahora())).toBe(
      'Si no lo calificas antes de mañana a las 14:00, cuenta como No se presentó.',
    );
  });

  it('a moment in a sentence never says *hoy a las* — *antes de las 15:23* today, *mañana a las* another day', () => {
    expect(cuandoTexto(nov(10, 15, 23), ahora())).toBe('las 15:23');
    expect(cuandoTexto(nov(11, 15, 23), ahora())).toBe('mañana a las 15:23');
    expect(siNoLoCalificasTexto(orden('d', { guardadaHasta: nov(10, 14) }, { ...ana, calificarHasta: nov(10, 15, 23) }), ahora())).toBe(
      'Si no lo calificas antes de las 15:23, cuenta como No se presentó.',
    );
  });

  it('after the handover, as drawn: *Cobraste $65 en efectivo · 14:31* — or *La serviste a las 14:31*, she charges when she usually does', () => {
    expect(cobrasteTexto(orden('a', { entregadaEn: nov(10, 14, 31) }))).toBe('Cobraste $65 en efectivo · 14:31');
    expect(cobrasteTexto(orden('a', { entregadaEn: nov(10, 14, 31), pago: 'transferencia' }))).toBe('Cobraste $65 por transferencia · 14:31');
    expect(cobrasteTexto(orden('a', { entregadaEn: nov(10, 14, 31), comer: 'aqui' }))).toBe('La serviste a las 14:31');
    expect(cobrasteTexto(orden('a'))).toBeNull();
  });

  it('at the counter, one big line of what to charge — each method its own', () => {
    expect(cobroLargoTexto(orden('a'))).toBe('Cobra $65 en efectivo');
    expect(cobroLargoTexto(orden('a', { pago: 'tarjeta' }))).toBe('Cobra $65 con tu terminal');
    expect(cobroLargoTexto(orden('a', { pago: 'transferencia' }))).toBe('Dale tus datos y revisa en tu banco que llegó $65');
  });

  it('her score rounded down, so it never reads above what it is; Nueva en Itacate before her third thumb', () => {
    expect(porcentajeDe({ up: 11, total: 12 })).toBe(91);
    expect(porcentajeDe({ up: 4, total: 5 })).toBe(80);
    expect(calificacionTexto({ nombre: 'Ana R.', calificacion: { up: 11, total: 12 } })).toBe('👍 91%');
    expect(calificacionTexto({ nombre: 'Rosa M.', calificacion: null })).toBe('Nueva en Itacate');
  });

  it('a past order’s line never carries her name — the day, what it was, the thumb’s labels', () => {
    const pulgar = { arriba: true, etiquetas: ['a_tiempo' as const], dadoEn: nov(9, 15), cambiarHasta: nov(10, 15), reloj: false };
    const o = ordenesDe([reserva('a', { hora: nov(9, 14, 30), entregadaEn: nov(9, 14, 31) })], { a: { vecino: ana.vecino, pulgar, calificarHasta: null } }, ahora())[0];
    expect(filaTexto(o, ahora())).toBe('Ayer · 1 × Mole con arroz · Llegó a tiempo');
    expect(filaTexto(o, ahora())).not.toContain('Ana');
  });
});

describe('where each order goes — Hoy, Historial, the count on the tab', () => {
  const lista = () =>
    ordenesDe(
      [
        reserva('tarde', { codigo: '512', hora: nov(10, 15) }),
        reserva('pronto', { codigo: '347', hora: nov(10, 14, 30) }),
        reserva('entregada', { codigo: '190', entregadaEn: nov(10, 13, 34) }),
        reserva('ayer', { codigo: '208', dia: '2026-11-09', hora: nov(9, 15), guardadaHasta: nov(9, 16), entregadaEn: nov(9, 15, 2) }),
        reserva('libre', { codigo: '455', dia: '2026-11-09', hora: nov(9, 14), guardadaHasta: nov(9, 15) }),
        reserva('cancelada', { codigo: '611', canceladaEn: nov(10, 11) }),
      ],
      {
        entregada: { ...ana, calificarHasta: nov(11, 16) },
        ayer: { ...ana, calificarHasta: nov(10, 16) },
        libre: { ...ana, calificarHasta: nov(10, 15) },
      },
      ahora(),
    );

  it('Hoy: what is still to hand over, her hour first, then what she handed over today and has not rated', () => {
    expect(deHoy(lista(), ahora()).map((o) => o.codigo)).toEqual(['347', '512', '190']);
    expect(porEntregar(lista(), ahora())).toBe(2);
    expect(ES.apartados.resumen(2, 1)).toBe('2 por entregar · 1 por calificar');
    expect(ES.apartados.resumen(0, 0)).toBe('Nada por entregar');
  });

  it('Historial: what waits for her thumb, the soonest to close first; then Anteriores, the newest first', () => {
    const h = historial(lista(), ahora());
    expect(h.porCalificar.map((o) => o.codigo)).toEqual(['455', '208', '190']);
    expect(h.anteriores.map((o) => o.codigo)).toEqual(['611']);
    expect(porCalificar(lista(), ahora())).toBe(3);
  });

  it('Lo que sigue: the next to hand over, and how many more; and how many she handed over today', () => {
    const sigue = loQueSigue(lista(), ahora());
    expect(sigue?.siguiente.codigo).toBe('347');
    expect(sigue?.mas).toBe(1);
    expect(loQueSigue([], ahora())).toBeNull();
    expect(entregadosHoy(lista(), ahora())).toBe(1);
    expect(ES.loQueSigue.mas(1)).toBe('Y 1 apartado más por entregar');
    expect(ES.loQueSigue.detalle('1 × Mole con arroz', 'para llevar', '$60', 'efectivo')).toBe('1 × Mole con arroz para llevar · $60 efectivo');
  });
});

describe('Entregar un apartado — the code typed', () => {
  it('finds a code among today’s orders whatever its state — a handover is always recorded — and not a past day’s', () => {
    const lista = ordenesDe(
      [
        reserva('hoy', { codigo: '347' }),
        reserva('ayer', { codigo: '208', dia: '2026-11-09', hora: nov(9, 15), guardadaHasta: nov(9, 16) }),
        reserva('cancelada', { codigo: '611', canceladaEn: nov(10, 11) }),
      ],
      {},
      ahora(),
    );
    expect(buscarCodigo(lista, '347', ahora())?.id).toBe('hoy');
    expect(buscarCodigo(lista, '208', ahora())).toBeNull();
    expect(buscarCodigo(lista, '611', ahora())?.id).toBe('cancelada');
    expect(buscarCodigo(lista, '34', ahora())).toBeNull();
  });

  it('the keypad: three digits at most, Borrar takes the last', () => {
    expect(['3', '4', '7', '9'].reduce(teclear, '')).toBe('347');
    expect(teclear('34', 'borrar')).toBe('3');
    expect(teclear('', 'borrar')).toBe('');
    expect(teclear('3', 'x')).toBe('3');
  });

  it('the code is the check from every door: only Entregar un apartado hands an order over, but for Sí pasó', () => {
    for (const path of ['app/(cocina)/(tabs)/apartados.tsx', 'app/(cocina)/(tabs)/index.tsx', 'app/(cocina)/apartado/[id].tsx']) {
      const screen = code(path);
      // Every *Entregar* opens the code; the only handover sent from these screens is *Sí pasó*.
      expect(screen, path).not.toMatch(/onEntregar=\{\(\) => (void )?entregar/);
      for (const call of screen.matchAll(/await entregar\(/g)) {
        const before = screen.slice(Math.max(0, (call.index ?? 0) - 260), call.index);
        expect(before, path).toMatch(/siPaso/);
      }
    }
    expect(code('app/(cocina)/entregar.tsx')).toMatch(/buscarCodigo\(ordenes, codigo, ahora\)/);
  });
});

describe('her thumb, and the terms before her first', () => {
  it('one tap is enough: the thumb is sent as she taps it, her labels on Listo — one send at a time', () => {
    const panel = code('ui/CalificarVecino.tsx');
    expect(panel).toMatch(/function tocarPulgar[\s\S]*?if \(ocupado\) return;[\s\S]*?void enviar\(nuevo, quedan\)/);
    expect(panel).toMatch(/async function listo\(\)/);
    expect(panel).toMatch(/if \(!terminos\.aceptados\) return <AntesDeCalificar/);
  });

  it('⚠️ the panel stays open on the order it opened on, with the name it opened with — once rated the name is no longer sent (found on the emulator)', () => {
    const screen = code('app/(cocina)/entregar.tsx');
    expect(screen).toMatch(/const calificando = orden !== null && \(panelPara === orden\.id \|\| recuperada\) && vecino !== null;/);
    expect(screen).toMatch(/orden\.vecino \?\? nombres\.current\.get\(orden\.id\)/);
    expect(screen).toMatch(/setEntregadaAqui\(o\.id\);\s*setPanelPara\(o\.id\);/);
    expect(code('app/(cocina)/apartado/[id].tsx')).toMatch(/nombre=\{orden\.vecino\?\.nombre \?\? nombreVisto\.current\}/);
  });

  it('the terms are kept on this phone per login, so the next person on it is asked', () => {
    const memoria = new Map<string, string>();
    const store: DeviceStore = {
      getItem: (k) => memoria.get(k) ?? null,
      setItem: (k, v) => void memoria.set(k, v),
      removeItem: (k) => void memoria.delete(k),
    };
    expect(aceptoTerminos(store, 'u1')).toBe(false);
    aceptarTerminos(store, 'u1', nov(10, 14));
    expect(aceptoTerminos(store, 'u1')).toBe(true);
    expect(aceptoTerminos(store, 'u2')).toBe(false);
    expect(aceptoTerminos(store, null)).toBe(false);
    expect(aceptoTerminos(undefined, 'u1')).toBe(false);
    expect(memoria.get(terminosKey('u1'))).toBe(nov(10, 14).toISOString());
  });

  it('a no-show is a thumb too: from the list, the terms first, on the order', () => {
    expect(code('app/(cocina)/(tabs)/apartados.tsx')).toMatch(/if \(!terminos\.aceptados\) return abrir\(orden\);/);
    expect(code('app/(cocina)/apartado/[id].tsx')).toMatch(/terminos\.aceptados \? void noSePresento\(\) : setPidiendoTerminos\(true\)/);
  });
});

describe('the tab — read again every minute, and its count', () => {
  it('⚠️ her data is hers to pay: today’s orders every minute while something can change, the 30 days before when the app opens, who reserved each when today’s change', () => {
    const hooks = code('api/hooks.ts');
    expect(hooks).toMatch(/export const APARTADOS_CADA_MS = 60_000;/);
    expect(hooks).toMatch(/queryKey: apartadosKey\(userId, kitchenId, 'hoy', dia\),\s*queryFn: \(\) => myReservations\(kitchenId as string, dia\),[\s\S]*?refetchInterval: \(query\) => \(vivo\(listings\.data, query\.state\.data, new Date\(\)\) \? APARTADOS_CADA_MS : false\)/);
    expect(hooks).toMatch(/queryKey: apartadosKey\(userId, kitchenId, 'antes', dia\),\s*queryFn: \(\) => myReservations\(kitchenId as string, desdeDia\(ahora\), dia\),[\s\S]*?staleTime: HISTORIAL_FRESCO_MS/);
    expect(hooks).toMatch(/queryKey: apartadosKey\(userId, kitchenId, 'vecinos', firma \?\? ''\),/);
    expect(code('api/calls.ts')).toMatch(/if \(antes !== null\) query = query\.lt\(RESERVATION_DAY_COLUMN, antes\);/);
  });

  it('today’s are read every minute only while an offer of hers is not over, or an order still waits', () => {
    const viva = [{ end: nov(10, 16), withdrawnAt: null }];
    expect(vivo(viva, [], ahora())).toBe(true);
    expect(vivo([{ end: nov(10, 14), withdrawnAt: null }], [], ahora())).toBe(false);
    expect(vivo([{ end: nov(10, 16), withdrawnAt: nov(10, 13) }], [], ahora())).toBe(false);
    // Taken back with a plate still to hand over: she may still be told it was cancelled.
    expect(vivo([{ end: nov(10, 16), withdrawnAt: nov(10, 13) }], [reserva('a')], ahora())).toBe(true);
    expect(vivo(undefined, undefined, ahora())).toBe(false);
  });

  it('who reserved each is read again exactly when one of today’s orders arrives or changes state', () => {
    const una = firmaDeHoy([reserva('a')], ahora());
    expect(firmaDeHoy([reserva('a')], ahora())).toBe(una);
    expect(firmaDeHoy([reserva('a'), reserva('b')], ahora())).not.toBe(una);
    expect(firmaDeHoy([reserva('a', { entregadaEn: nov(10, 14) })], ahora())).not.toBe(una);
    // The window ending is a change too — the clock's, with nothing written.
    expect(firmaDeHoy([reserva('a')], nov(10, 16))).not.toBe(una);
  });

  it('the count on Apartados is what waits for her thumb, from the query the tab reads', () => {
    const layout = code('app/(cocina)/(tabs)/_layout.tsx');
    expect(layout).toMatch(/porCalificar\(ordenesDe\(datos\.reservas, datos\.vecinos, ahora\), ahora\)/);
    expect(code('ui/Pestanas.tsx')).toMatch(/const cuenta = cuentas\[pestana\.ruta\] \?\? 0;/);
  });

  it('nothing on Hoy or Apartados names who may reserve (the final design)', () => {
    for (const path of ['app/(cocina)/(tabs)/apartados.tsx', 'app/(cocina)/(tabs)/index.tsx']) {
      expect(code(path), path).not.toMatch(/min_score|minScore|quienPuede/);
    }
  });
});

describe('the review of 10.5b-iv-a — each defect it found, held', () => {
  it('a code is found across midnight: today’s, or one still to hand over on another day — the nearest to now wins', () => {
    const tarde = nov(10, 23, 55);
    const lista = ordenesDe(
      [
        reserva('manana', { codigo: '347', dia: '2026-11-11', hora: nov(11, 0, 15), guardadaHasta: nov(11, 1) }),
        reserva('hoy-ya', { codigo: '347', hora: nov(10, 13), guardadaHasta: nov(10, 14), entregadaEn: nov(10, 13) }),
        reserva('ayer', { codigo: '208', dia: '2026-11-09', hora: nov(9, 15), guardadaHasta: nov(9, 16) }),
      ],
      {},
      tarde,
    );
    expect(buscarCodigo(lista, '347', tarde)?.id).toBe('manana');
    expect(buscarCodigo(lista, '208', tarde)).toBeNull();
    // 00:10 on the 11th, an order of 23:45 on the 10th, its window to 01:00: still to hand over.
    const pasada = nov(11, 0, 10);
    const otra = ordenesDe([reserva('noche', { codigo: '512', dia: '2026-11-10', hora: nov(10, 23, 45), guardadaHasta: nov(11, 1) })], {}, pasada);
    expect(buscarCodigo(otra, '512', pasada)?.id).toBe('noche');
  });

  it('an hour on another day says its day — on a card, on Lo que sigue and on the order', () => {
    expect(horaTexto(nov(10, 14, 30), ahora())).toBe('14:30');
    expect(horaTexto(nov(11, 13), ahora())).toBe('Mañana 13:00');
    expect(pasaTexto(nov(10, 14, 30), ahora())).toBe('Pasa a las 14:30');
    expect(pasaTexto(nov(11, 13), ahora())).toBe('Pasa mañana a las 13:00');
  });

  it('⚠️ she swiped Ya lo tengo first: to the counter it is still to hand over, with what to charge, until its window ends', () => {
    const suya = orden('a', { recogidaEn: nov(10, 14, 10) });
    expect(suya.estado).toBe('recogido');
    expect(marcaDe(suya, ahora())).toBe('porEntregar');
    expect(marcaDe(suya, nov(10, 14, 35))).toBe('pronto');
    expect(montoTexto(suya, ahora())).toBe('Cobra $65 en efectivo');
    expect(marcaDe(suya, nov(10, 16, 1))).toBe('entregado');
    const pantalla = code('app/(cocina)/entregar.tsx');
    expect(pantalla).toMatch(/const recogida = orden\.entregadaEn !== null;/);
    expect(pantalla).toMatch(/: orden\.recogidaEn !== null\s*\? ES\.entregar\.yaLoMarco/);
  });

  it('⚠️ a day after the window, the clock’s — her name gone, and a plate that se liberó unrated carries No se presentó', () => {
    expect(ultimaQueDefine('reservation_neighbours').body).toContain("when s.state = 'liberado' and r.held_until + interval '24 hours' <= now() then");
    expect(ultimaQueDefine('reservation_neighbours').body).toContain("and now() < r.held_until + interval '24 hours' as open");
    const libre = { guardadaHasta: nov(9, 15), hora: nov(9, 14), dia: '2026-11-09' };
    const [antesDelDia] = ordenesDe([reserva('a', libre)], { a: ana }, nov(10, 14, 59));
    expect(antesDelDia.vecino).not.toBeNull();
    expect(antesDelDia.pulgar).toBeNull();
    const [ya] = ordenesDe([reserva('a', libre)], { a: ana }, nov(10, 15));
    expect(ya.vecino).toBeNull();
    expect(ya.pulgar).toMatchObject({ arriba: false, etiquetas: ['no_se_presento'], reloj: true, cambiarHasta: null });
    expect(marcaDe(ya, nov(10, 15))).toBe('noSePresento');
  });

  it('an order that is over never says Cobra: what she charged, or what it came to', () => {
    expect(montoTexto(orden('a', { entregadaEn: nov(10, 14, 31) }), ahora())).toBe('Cobraste $65 en efectivo · 14:31');
    expect(montoTexto(orden('a', { canceladaEn: nov(10, 12) }), ahora())).toBe('Total $65 · efectivo');
    expect(estadoTexto(orden('a', { canceladaEn: nov(10, 12) }), ahora())).toBe('Hoy · 14:45');
  });

  it('the history is read the newest first, so a cut drops the oldest days', () => {
    expect(RESERVATION_ORDER).toBe('pickup_at.asc,id.asc');
    expect(RESERVATION_HISTORY_ORDER).toBe('pickup_at.desc,id.desc');
    expect(code('api/calls.ts')).toMatch(/const order = antes === null \? RESERVATION_ORDER : RESERVATION_HISTORY_ORDER;/);
  });

  it('a lost reply is the screen’s own handover once the re-read finds it; both writes of a released plate wait for each other', () => {
    expect(code('app/(cocina)/entregar.tsx')).toMatch(/const recuperada = orden !== null && intento === orden\.id && orden\.entregadaEn !== null;/);
    const abierta = code('app/(cocina)/apartado/[id].tsx');
    expect(abierta.match(/ocupado=\{(?:calificando === orden\.id \|\| entregando === orden\.id|entregando === orden\.id \|\| calificando === orden\.id)\}/g)?.length).toBe(2);
  });

  it('the words say only what is true: TD022 is more than 24 hours, and a score counts the clock’s too', () => {
    expect(ES.apartados.fallas.yaNoSeCalifica).toBe('Ya no se puede calificar este apartado.');
    expect(ES.apartado.calificaciones(12)).toBe('12 calificaciones');
    expect(ES.apartado.vecina).toBe('Quién lo apartó');
  });
});

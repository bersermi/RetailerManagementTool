import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import {
  APARTADOS_KEY,
  CANCEL_MY_RESERVATION,
  CONFIRM_MY_PICKUP,
  ESTADOS,
  ETIQUETAS,
  GIVE_MY_YES,
  MY_RESERVATIONS,
  MY_STANDING,
  POR_CODIGO,
  POSICION_KEY,
  RATE_KITCHEN,
  RAZONES,
  RESERVE_PLATE,
  apartadoOf,
  apartadosFrom,
  apartadosKey,
  codigoOf,
  fallaDe,
  posicionFrom,
  posicionKey,
  reservadoFrom,
  reservationIdArgs,
  reserveArgs,
  type Apartado,
} from '@/api/apartados';
import type { Kitchen } from '@/api/cocinas';
import {
  anteriorTexto,
  cambioDePlanesTexto,
  cocinaDe,
  comoLlegarDelApartado,
  faltaTexto,
  hayPendientes,
  notaTexto,
  pagoTexto,
  pasaTexto,
  pendientesDe,
  platoTexto,
  porConfirmarTexto,
  puedeCancelar,
  razonTexto,
  seccionesDe,
  YA_LO_TENGO_DESPUES_MS,
} from '@/lib/apartados';
import { DESLIZAR_HASTA, alSoltarConfirma, avanceDe } from '@/lib/deslizar';
import { ES } from '@/strings';

// ============================================================================
// HER RESERVATIONS, AS ITACATE READS AND SAYS THEM. Plan task `10.5b-iii-a`, on `0079`'s
// four functions and `0080`'s two of hers.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that each name and key reaches the applied
// schema, with the values this app reads — is `docs/checks/10.5b-iii-a-reserving-contract.sh`'s,
// which reads them out of `src/api/apartados.ts` and asks as a neighbour (`db.yml`). Here:
// the first line of that claim, every name in the migrations' own text, so a misspelling is
// red before a database starts; what the app makes of an answer; and the ticket's words,
// in Mexico City's zone (the Mac is UTC−6, CI is UTC).
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'itacate/src');
const MIGRATIONS = join(ROOT, 'supabase/migrations');
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');

/** A function's text as it is defined LAST — `0079`'s, or `0080`'s where it re-made it. */
function definicion(nombre: string): string {
  const archivos = readdirSync(MIGRATIONS).filter((n) => /^\d{4}_.*\.sql$/.test(n)).sort().reverse();
  for (const archivo of archivos) {
    const sql = readFileSync(join(MIGRATIONS, archivo), 'utf8');
    const at = sql.search(new RegExp(`create (or replace )?function public\\.${nombre}\\(`));
    if (at >= 0) return sql.slice(at, sql.indexOf('$$;', sql.indexOf('$$', at) + 2));
  }
  throw new Error(`no migration defines ${nombre}`);
}

/** An interface's field names in `src/api/apartados.ts`, as the contract check reads them. */
function campos(iface: string): string[] {
  const body = new RegExp(`export interface ${iface} \\{([\\s\\S]*?)\\n\\}`).exec(read('api/apartados.ts'))?.[1] ?? '';
  return [...body.matchAll(/^\s+readonly ([a-z_]+)\??:/gm)].map((m) => m[1]);
}

// ⚠️ PINNED WHEN THE FILE LOADS, not in `beforeAll`: a `describe` body runs at collection,
// before any hook, and builds its clock then — under CI's UTC it was six hours off.
const ZONE = 'America/Mexico_City';
const before = process.env.TZ;
process.env.TZ = ZONE;
afterAll(() => {
  if (before === undefined) delete process.env.TZ;
  else process.env.TZ = before;
});
/** A local moment in Mexico City — month counted from 1. */
const local = (y: number, mo: number, d: number, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi);

const KITCHEN = 'b1d0c0de-0000-4000-8000-000000000001';

/** One of `my_reservations`' rows, as `0080` writes it — six decimals of a second, money as text. */
function fila(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'r0000000-0000-4000-8000-000000000001',
    code: 347,
    state: 'apartado',
    pickup_at: '2026-11-10T20:30:00+00:00',
    held_until: '2026-11-10T22:00:00.123456+00:00',
    cancel_until: '2026-11-10T19:30:00+00:00',
    payment: 'efectivo',
    eat: 'llevar',
    cancel_reason: null,
    kitchen: {
      id: KITCHEN,
      name: 'Fonda Doña Lupe',
      giro: 'giro-fonda',
      address: { street: 'Sabino', street_number: '12', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postal_code: '06400' },
      directions: 'Portón verde',
      page: { color: 'chile', logo_path: null },
    },
    lines: [{ line_no: 1, name: 'Mole con arroz', surprise: false, quantity: '1.000', unit_price: '60.00', container_price: '5.00' }],
    ...over,
  };
}

const uno = (over: Record<string, unknown> = {}): Apartado => apartadoOf(fila(over));

describe('the seven functions, by their names — every one in the migrations’ text', () => {
  it('`0079`’s four and `0080`’s three', () => {
    expect([RESERVE_PLATE, MY_RESERVATIONS, CANCEL_MY_RESERVATION, CONFIRM_MY_PICKUP]).toEqual([
      'reserve_plate',
      'my_reservations',
      'cancel_my_reservation',
      'confirm_my_pickup',
    ]);
    expect([GIVE_MY_YES, MY_STANDING, RATE_KITCHEN]).toEqual(['give_my_yes', 'my_standing', 'rate_kitchen']);
    for (const nombre of [RESERVE_PLATE, MY_RESERVATIONS, CANCEL_MY_RESERVATION, CONFIRM_MY_PICKUP, GIVE_MY_YES, MY_STANDING, RATE_KITCHEN]) {
      expect(definicion(nombre).length, nombre).toBeGreaterThan(0);
    }
  });

  it('each argument by the name PostgREST matches on', () => {
    const reserve = definicion(RESERVE_PLATE);
    for (const arg of campos('ReserveArgs')) expect(reserve, arg).toMatch(new RegExp(`\\b${arg}\\s`));
    expect(campos('ReserveArgs')).toEqual(['p_id', 'p_listing_id', 'p_line_no', 'p_pickup_at', 'p_payment', 'p_eat']);
    expect(campos('ReservationIdArgs')).toEqual(['p_id']);
    expect(definicion(CANCEL_MY_RESERVATION)).toMatch(/cancel_my_reservation\(p_id uuid\)/);
    expect(definicion(CONFIRM_MY_PICKUP)).toMatch(/confirm_my_pickup\(p_id uuid\)/);
  });

  it('every key read is one the functions write, quoted', () => {
    const lista = definicion(MY_RESERVATIONS);
    for (const iface of ['ReservationRow', 'ReservationKitchenRow', 'ReservationAddressRow', 'ReservationPageRow', 'ReservationLineRow', 'MyRatingRow']) {
      const nombres = campos(iface);
      expect(nombres.length, iface).toBeGreaterThan(0);
      for (const nombre of nombres) expect(lista, `${iface}.${nombre}`).toContain(`'${nombre}'`);
    }
    const reserva = definicion(RESERVE_PLATE);
    for (const nombre of campos('ReservedRow')) expect(reserva, nombre).toContain(`'${nombre}'`);
    const posicion = definicion(MY_STANDING);
    for (const nombre of campos('StandingRow')) expect(posicion, nombre).toContain(`'${nombre}'`);
    for (const nombre of campos('ScoreRow')) expect(posicion, nombre).toContain(`'${nombre}'`);
  });

  it('the states, the kitchen’s reasons and the five labels are the database’s', () => {
    const estado = definicion('reservation_state');
    for (const e of ESTADOS) expect(estado, e).toContain(`'${e}'`);
    const sql0080 = readFileSync(join(MIGRATIONS, readdirSync(MIGRATIONS).find((n) => n.startsWith('0080_')) as string), 'utf8');
    expect(sql0080).toContain(`cancel_reason in (${RAZONES.map((r) => `'${r}'`).join(', ')})`);
    expect(sql0080).toContain("labels <@ array['a_tiempo', 'amable', 'tarde', 'pago', 'no_se_presento']::text[]");
    expect([...ETIQUETAS].sort()).toEqual(['a_tiempo', 'amable', 'no_se_presento', 'pago', 'tarde']);
  });

  it('every refusal mapped is raised by the function that refuses — and `0080`’s by reserve_plate', () => {
    const reserva = definicion(RESERVE_PLATE);
    for (const code of ['TD015', 'TD016', 'TD017', 'TD020', 'TD021', '22023', '42501']) expect(reserva, code).toContain(`errcode = '${code}'`);
    expect(definicion(CANCEL_MY_RESERVATION)).toContain("errcode = 'TD018'");
    expect(definicion(CONFIRM_MY_PICKUP)).toContain("errcode = 'TD018'");
    // `10.5b-iii-b`: her stars refused once there is nothing to rate.
    expect(definicion(RATE_KITCHEN)).toContain("errcode = 'TD022'");
    expect(Object.keys(POR_CODIGO).sort()).toEqual(['22023', '42501', 'PGRST301', 'TD015', 'TD016', 'TD017', 'TD018', 'TD020', 'TD021', 'TD022']);
  });

  it('the calls send these names, through the arguments’ builders', () => {
    const calls = read('api/calls.ts');
    expect(calls).toMatch(/supabase\.rpc\(RESERVE_PLATE, reserveArgs\(eleccion\)\)/);
    expect(calls).toMatch(/supabase\.rpc\(MY_RESERVATIONS\)/);
    expect(calls).toMatch(/supabase\.rpc\(CANCEL_MY_RESERVATION, reservationIdArgs\(id\)\)/);
    expect(calls).toMatch(/supabase\.rpc\(CONFIRM_MY_PICKUP, reservationIdArgs\(id\)\)/);
    expect(calls).toMatch(/supabase\.rpc\(GIVE_MY_YES\)/);
    expect(calls).toMatch(/supabase\.rpc\(MY_STANDING\)/);
  });

  it('cached in memory under the login', () => {
    expect(apartadosKey('u-1')).toEqual([...APARTADOS_KEY, 'u-1']);
    expect(posicionKey(null)).toEqual([...POSICION_KEY, '']);
    expect(apartadosKey('u-1')).not.toEqual(apartadosKey('u-2'));
  });
});

describe('what is sent', () => {
  it('her choice, by the database’s names — her hour as an instant', () => {
    const hora = new Date(Date.UTC(2026, 10, 10, 20, 30));
    expect(reserveArgs({ id: 'r-1', ofertaId: 'o-1', lineNo: 2, hora, pago: 'transferencia', comer: 'aqui' })).toEqual({
      p_id: 'r-1',
      p_listing_id: 'o-1',
      p_line_no: 2,
      p_pickup_at: '2026-11-10T20:30:00.000Z',
      p_payment: 'transferencia',
      p_eat: 'aqui',
    });
    expect(reservationIdArgs('r-1')).toEqual({ p_id: 'r-1' });
  });
});

describe('what comes back', () => {
  it('a reservation, read whole: her code as three digits, the moments, the total with its desechable', () => {
    const a = uno();
    expect(a.codigo).toBe('347');
    expect(a.estado).toBe('apartado');
    expect(a.hora.toISOString()).toBe('2026-11-10T20:30:00.000Z');
    expect(a.guardadaHasta.toISOString()).toBe('2026-11-10T22:00:00.123Z');
    expect(a.cancelarHasta.toISOString()).toBe('2026-11-10T19:30:00.000Z');
    expect([a.pago, a.comer, a.razon]).toEqual(['efectivo', 'llevar', null]);
    expect(a.cocina).toMatchObject({ id: KITCHEN, nombre: 'Fonda Doña Lupe', giro: 'giro-fonda', indicaciones: 'Portón verde' });
    expect(a.cocina.direccion).toEqual({ street: 'Sabino', number: '12', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postalCode: '06400' });
    expect(a.platos).toEqual([{ lineNo: 1, nombre: 'Mole con arroz', sorpresa: false, cantidad: 1, precioCentavos: 6000, desechableCentavos: 500 }]);
    expect(a.totalCentavos).toBe(6500);
  });

  it('one it cannot read is left out, never the list', () => {
    const list = apartadosFrom([fila({ state: 'perdido' }), fila({ code: 42 }), fila({ lines: [] }), fila({ id: 'r-2' })]);
    expect(list.map((a) => a.id)).toEqual(['r-2']);
    expect(apartadosFrom(null)).toEqual([]);
  });

  it('a code is three digits, 100 to 999', () => {
    expect(codigoOf(100)).toBe('100');
    expect(() => codigoOf(99)).toThrow();
    expect(() => codigoOf('347')).toThrow();
    expect(reservadoFrom({ id: 'r-1', code: 512 })).toEqual({ id: 'r-1', codigo: '512' });
    expect(() => reservadoFrom(null)).toThrow();
  });

  it('her standing: her yes, her score from the third thumb, each label’s count, her limit', () => {
    const p = posicionFrom({
      yes_at: '2026-11-10T19:00:00.654321+00:00',
      score: { up: 11, total: 12 },
      total: 12,
      labels: { a_tiempo: 9, amable: 6, tarde: 1, pago: 0, no_se_presento: 0 },
      limit: 3,
      holding: 1,
    });
    expect(p.siDesde?.toISOString()).toBe('2026-11-10T19:00:00.654Z');
    expect(p.calificacion).toEqual({ up: 11, total: 12 });
    expect(p.etiquetas).toEqual({ a_tiempo: 9, amable: 6, tarde: 1, no_se_presento: 0, pago: 0 });
    expect([p.limite, p.tiene]).toEqual([3, 1]);
  });

  it('what it cannot read is the safest reading: no yes, no score, one at a time', () => {
    expect(posicionFrom(null)).toEqual({
      siDesde: null,
      calificacion: null,
      etiquetas: { a_tiempo: 0, amable: 0, tarde: 0, no_se_presento: 0, pago: 0 },
      limite: 1,
      tiene: 0,
    });
    expect(posicionFrom({ yes_at: 'ayer', score: { up: 5, total: 3 }, limit: 0 }).calificacion).toBeNull();
  });
});

describe('when a call is refused', () => {
  it('each code is what she can do about it', () => {
    expect(fallaDe({ code: 'TD015' })).toBe('yaNoHay');
    expect(fallaDe({ code: 'TD016' })).toBe('limite');
    expect(fallaDe({ code: 'TD020' })).toBe('calificacion');
    expect(fallaDe({ code: 'TD021' })).toBe('sinSi');
    expect(fallaDe({ code: '22023' })).toBe('cambio');
    expect(fallaDe({ code: 'TD018' })).toBe('yaNoPendiente');
    expect(fallaDe({ code: '42501' })).toBe('sesion');
    expect(fallaDe(new TypeError('Network request failed'))).toBe('sinSenal');
    expect(fallaDe({ code: 'XX000' })).toBe('otra');
    expect(fallaDe(null)).toBe('otra');
  });

  it('and every one has its sentence', () => {
    for (const falla of new Set([...Object.values(POR_CODIGO), 'sinSenal', 'otra'] as const)) {
      expect(ES.apartar.fallas[falla], falla).toMatch(/\S/);
    }
  });
});

describe('the tab, in four parts', () => {
  const ahora = local(2026, 11, 10, 14, 0);

  it('her tickets soonest first; a kitchen’s cancel while its window is open; a plate to confirm; the rest newest first', () => {
    const tarde = uno({ id: 'p-2', pickup_at: '2026-11-10T22:00:00+00:00' });
    const pronto = uno({ id: 'p-1', pickup_at: '2026-11-10T20:30:00+00:00' });
    const cancelada = uno({ id: 'c-1', state: 'cancelado_cocina', cancel_reason: 'se_acabo' });
    const vieja = uno({ id: 'v-1', state: 'recogido', pickup_at: '2026-11-08T20:30:00+00:00' });
    // Released yesterday at 13:00, Mexico City — more than a day ago: over.
    const ayer = uno({ id: 'v-2', state: 'liberado', pickup_at: '2026-11-09T18:30:00+00:00', held_until: '2026-11-09T19:00:00+00:00' });
    // Released at 13:00 today: she may still say she has it.
    const hoy = uno({ id: 'l-1', state: 'liberado', pickup_at: '2026-11-10T18:30:00+00:00', held_until: '2026-11-10T19:00:00+00:00' });
    const cerrada = uno({ id: 'c-2', state: 'cancelado_cocina', held_until: '2026-11-10T19:00:00+00:00' });
    const s = seccionesDe([vieja, tarde, cancelada, pronto, ayer, hoy, cerrada], ahora);
    expect(s.pendientes.map((a) => a.id)).toEqual(['p-1', 'p-2']);
    expect(s.avisos.map((a) => a.id)).toEqual(['c-1']);
    expect(s.porConfirmar.map((a) => a.id)).toEqual(['l-1']);
    expect(s.anteriores.map((a) => a.id)).toEqual(['c-2', 'v-2', 'v-1']);
    expect(hayPendientes([vieja, tarde])).toBe(true);
    expect(hayPendientes([vieja])).toBe(false);
    expect(hayPendientes(undefined)).toBe(false);
  });

  it('a released plate keeps its swipe for a day after its window — the day `confirm_my_pickup` takes it, and after which the clock counts it', () => {
    expect(YA_LO_TENGO_DESPUES_MS).toBe(24 * 3_600_000);
    expect(definicion('confirm_my_pickup')).toMatch(/now\(\) > v_r\.held_until \+ interval '24 hours'/);
    expect(definicion('neighbour_score')).toMatch(/r\.held_until \+ interval '24 hours' <= now\(\)/);
    const hoy = uno({ id: 'l-1', state: 'liberado', held_until: '2026-11-10T19:00:00+00:00' });
    expect(seccionesDe([hoy], local(2026, 11, 11, 12, 59)).porConfirmar).toHaveLength(1);
    expect(seccionesDe([hoy], local(2026, 11, 11, 13, 0)).porConfirmar).toHaveLength(0);
    expect(seccionesDe([hoy], local(2026, 11, 11, 13, 0)).anteriores).toHaveLength(1);
    expect(porConfirmarTexto(hoy)).toBe('La cocina lo guardó hasta las 13:00. Si ya lo tienes, confírmalo.');
  });

  it('what is still to collect, as one key — the same set in any order, and a handover changes it', () => {
    const a = uno({ id: 'a' });
    const b = uno({ id: 'b' });
    const hecho = uno({ id: 'b', state: 'recogido' });
    expect(pendientesDe([a, b])).toBe(pendientesDe([b, a]));
    expect(pendientesDe([a, hecho])).not.toBe(pendientesDe([a, b]));
    expect(pendientesDe([])).toBe('');
  });
});

describe('her ticket, word for word (Mexico City)', () => {
  const a = uno();
  const ahora = local(2026, 11, 10, 14, 5);

  it('her hour, and how long until it', () => {
    expect(pasaTexto(a.hora, ahora)).toBe('Pasa a las 14:30');
    expect(faltaTexto(a.hora, ahora)).toBe('faltan 25 min');
    expect(faltaTexto(a.hora, local(2026, 11, 10, 12, 30))).toBe('faltan 2 h');
    expect(faltaTexto(a.hora, local(2026, 11, 10, 12, 20))).toBe('faltan 2 h 10 min');
    expect(faltaTexto(a.hora, local(2026, 11, 10, 14, 30))).toBe('ya está lista');
    expect(pasaTexto(local(2026, 11, 11, 13, 0), ahora)).toBe('Pasa mañana a las 13:00');
    expect(pasaTexto(local(2026, 11, 11, 1, 0), ahora)).toBe('Pasa mañana a la 1:00');
    expect(pasaTexto(local(2026, 11, 13, 9, 15), ahora)).toBe('Pasa el Vie 13 a las 9:15');
    // After midnight, a window that started yesterday still holds her plate: its hour alone.
    expect(pasaTexto(local(2026, 11, 10, 23, 45), local(2026, 11, 11, 0, 10))).toBe('Pasa a las 23:45');
  });

  it('how it is handed over, and until when it is kept', () => {
    expect(notaTexto(a)).toBe('Tu comida estará lista y empacada a esa hora. La cocina la guarda hasta las 16:00.');
    expect(notaTexto(uno({ eat: 'aqui' }))).toBe('Te la sirven al llegar, para comer ahí. La cocina la guarda hasta las 16:00.');
    // 1:30 at night is *la* 1:30.
    expect(notaTexto(uno({ held_until: '2026-11-11T07:30:00+00:00' }))).toBe(
      'Tu comida estará lista y empacada a esa hora. La cocina la guarda hasta la 1:30.',
    );
  });

  it('what to pay and how — the dish and its desechable — never an account', () => {
    expect(pagoTexto(a)).toBe('Paga $65 en efectivo al recoger. Si puedes, lleva el importe exacto.');
    expect(pagoTexto(uno({ eat: 'aqui', lines: [{ line_no: 1, name: 'Mole', surprise: false, quantity: '1.000', unit_price: '60.00', container_price: null }] }))).toBe(
      'Paga $60 en efectivo en la cocina. Si puedes, lleva el importe exacto.',
    );
    expect(pagoTexto(uno({ payment: 'tarjeta' }))).toBe('Paga $65 con tarjeta en la cocina.');
    expect(pagoTexto(uno({ payment: 'transferencia' }))).toBe('Transfiere $65 al llegar: la cocina te da sus datos.');
    expect(ES.apartados.conceptoValor(a.codigo)).toBe('Itacate 347');
  });

  it('what she reserved', () => {
    expect(platoTexto(a)).toBe('Mole con arroz · 1 · para llevar');
  });

  it('Cancelar until an hour before her hour, then No voy a poder ir — at the database’s minute', () => {
    expect(puedeCancelar(a, local(2026, 11, 10, 13, 29))).toBe(true);
    expect(cambioDePlanesTexto(a, local(2026, 11, 10, 13, 29))).toBe('¿Cambio de planes? Cancelar, hasta las 13:30');
    expect(puedeCancelar(a, local(2026, 11, 10, 13, 30))).toBe(false);
    expect(cambioDePlanesTexto(a, local(2026, 11, 10, 13, 30))).toBe('No voy a poder ir');
  });

  it('a past one: when, and what became of it — Se liberó, never a word about penalties', () => {
    expect(anteriorTexto(uno({ state: 'recogido' }), ahora)).toBe('Hoy 14:30 · Entregado');
    expect(anteriorTexto(uno({ state: 'liberado', pickup_at: '2026-11-09T20:30:00+00:00' }), ahora)).toBe('Ayer 14:30 · Se liberó');
    expect(anteriorTexto(uno({ state: 'no_va' }), ahora)).toBe('Hoy 14:30 · Lo liberaste');
    expect(anteriorTexto(uno({ state: 'cancelado_cocina' }), ahora)).toBe('Hoy 14:30 · La cocina lo canceló');
  });

  it('why the kitchen cancelled, when it said', () => {
    expect(razonTexto(uno({ state: 'cancelado_cocina', cancel_reason: 'cerramos' }))).toBe('Tuvieron que cerrar.');
    expect(razonTexto(uno({ state: 'cancelado_cocina', cancel_reason: 'otro' }))).toBeNull();
    expect(razonTexto(a)).toBeNull();
  });

  it('Cómo llegar: her own pin while the door sends her; else her address — never Google’s copy', () => {
    const puerta = (point: Kitchen['point']): Kitchen => ({ ...cocinaDe(a, undefined), point });
    expect(comoLlegarDelApartado(a, puerta({ latitude: 19.45, longitude: -99.16, source: 'pin' }))).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=19.45%2C-99.16',
    );
    const porDireccion = 'https://www.google.com/maps/dir/?api=1&destination=Sabino+12%2C+Santa+Mar%C3%ADa+la+Ribera%2C+Cuauht%C3%A9moc%2C+06400';
    expect(comoLlegarDelApartado(a, puerta({ latitude: 19.45, longitude: -99.16, source: 'google' }))).toBe(porDireccion);
    expect(comoLlegarDelApartado(a, undefined)).toBe(porDireccion);
  });
});

describe('Ya lo tengo is a swipe — Wera’s answer to how far is far enough', () => {
  it('85 % of the track, the slide that sells', () => {
    const commit = readFileSync(join(ROOT, 'app/src/cart/commit.ts'), 'utf8');
    expect(commit).toContain(`export const COMMIT_AT = ${DESLIZAR_HASTA};`);
    expect(alSoltarConfirma(85, 100)).toBe(true);
    expect(alSoltarConfirma(84.9, 100)).toBe(false);
    expect(avanceDe(150, 100)).toBe(1);
    expect(avanceDe(-5, 100)).toBe(0);
    expect(avanceDe(10, 0)).toBe(0);
  });

  it('what it says is read through a ref, and a screen reader has one action instead', () => {
    const swipe = read('ui/Deslizar.tsx');
    expect(swipe).toMatch(/const listo = useRef\(onListo\);\s*listo\.current = onListo;/);
    expect(swipe).toMatch(/accessibilityActions=\{\[\{ name: 'activate', label: accion \}\]\}/);
  });
});

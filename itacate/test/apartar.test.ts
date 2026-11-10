import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import { apartadoOf, posicionFrom, type Posicion } from '@/api/apartados';
import type { Dish, Kitchen, Offer } from '@/api/cocinas';
import { EMPTY_PAGE } from '@/api/pagina';
import {
  ANTES_DEL_FIN_MS,
  DESDE_CALIFICACIONES,
  PASO_MS,
  comeresDe,
  esDeEstePlatillo,
  horaVigente,
  horasDe,
  inicialDe,
  pieDe,
  porCalificacion,
  porcentajeDe,
  totalDe,
} from '@/lib/apartar';
import { comerTexto, pagosTexto } from '@/lib/paginas';
import { ES } from '@/strings';

// ============================================================================
// *APARTAR* — THE DISH'S FOOT AND THE SHEET. Plan task `10.5b-iii-a`: slice 3's design
// (the owner's rulings of 2026-11-05) and `10.5b-ii`'s final design (2026-11-10). Every
// rule here is one `reserve_plate` also enforces — read out of its text where a number
// is the database's — so the phone offers only what will be taken. In Mexico City's zone.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MIGRATIONS = join(ROOT, 'supabase/migrations');
const sql = (prefix: string) => readFileSync(join(MIGRATIONS, readdirSync(MIGRATIONS).find((n) => n.startsWith(prefix)) as string), 'utf8');

// ⚠️ PINNED WHEN THE FILE LOADS, not in `beforeAll`: a `describe` body runs at collection,
// before any hook, and builds its clock then — under CI's UTC it was six hours off.
const ZONE = 'America/Mexico_City';
const before = process.env.TZ;
process.env.TZ = ZONE;
afterAll(() => {
  if (before === undefined) delete process.env.TZ;
  else process.env.TZ = before;
});
const local = (y: number, mo: number, d: number, h = 12, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s);

function plato(over: Partial<Dish> = {}): Dish {
  return {
    lineNo: 1,
    name: 'Mole con arroz',
    description: null,
    tags: [],
    priceCentavos: 6000,
    count: 4,
    surprise: false,
    usualCentavos: 12000,
    photo: null,
    llevar: true,
    aqui: false,
    ...over,
  };
}
const oferta = (start: Date, end: Date, over: Partial<Offer> = {}): Offer => ({
  id: 'o-1',
  start,
  end,
  dishes: [plato()],
  desechableCentavos: 500,
  ...over,
});
function cocina(over: Partial<Kitchen> = {}): Kitchen {
  return {
    id: 'k-1',
    name: 'Fonda Doña Lupe',
    giro: 'giro-fonda',
    address: { street: 'Sabino', number: '12', colonia: '', city: '', postalCode: '' },
    directions: null,
    point: null,
    page: EMPTY_PAGE,
    offers: [],
    summary: { weekdays: [0, 0, 0, 0, 0, 0, 0], usualHour: null, lastDay: null, repeats: [] },
    pagos: ['efectivo'],
    comeres: ['llevar'],
    minScore: null,
    estrellas: null,
    ...over,
  };
}
const posicion = (over: Partial<Posicion> = {}): Posicion => ({ ...posicionFrom({ yes_at: '2026-11-10T19:00:00Z', limit: 1 }), ...over });

const clock = (dates: readonly Date[]) => dates.map((d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);

describe('her hour — a quarter hour, from the next one, until 15 minutes before the window ends (call 11)', () => {
  it('the database’s numbers', () => {
    const reserva = sql('0080_');
    expect(PASO_MS).toBe(15 * 60_000);
    expect(ANTES_DEL_FIN_MS).toBe(15 * 60_000);
    expect(reserva).toContain("date_bin('15 minutes', p_pickup_at, timestamptz '2000-01-01 00:00:00+00') <> p_pickup_at");
    expect(reserva).toContain("p_pickup_at > v_listing.pickup_end - interval '15 minutes'");
  });

  it('from the next quarter hour — never one gone — to 15 minutes before the end', () => {
    const o = oferta(local(2026, 11, 10, 14, 0), local(2026, 11, 10, 16, 0));
    expect(clock(horasDe(o, local(2026, 11, 10, 14, 7)))).toEqual(['14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45']);
    expect(clock(horasDe(o, local(2026, 11, 10, 14, 15, 0)))[0]).toBe('14:15');
    expect(clock(horasDe(o, local(2026, 11, 10, 14, 15, 1)))[0]).toBe('14:30');
  });

  it('not before the window opens — a window later today, or tomorrow', () => {
    const o = oferta(local(2026, 11, 10, 17, 0), local(2026, 11, 10, 18, 0));
    expect(clock(horasDe(o, local(2026, 11, 10, 12, 3)))).toEqual(['17:00', '17:15', '17:30', '17:45']);
  });

  it('none, once the window is within 15 minutes of its end', () => {
    const o = oferta(local(2026, 11, 10, 14, 0), local(2026, 11, 10, 16, 0));
    expect(horasDe(o, local(2026, 11, 10, 15, 46))).toEqual([]);
    expect(clock(horasDe(o, local(2026, 11, 10, 15, 45)))).toEqual(['15:45']);
  });

  it('an hour the clock passes while the sheet is open moves to the next', () => {
    const o = oferta(local(2026, 11, 10, 14, 0), local(2026, 11, 10, 16, 0));
    const horas = horasDe(o, local(2026, 11, 10, 14, 31));
    expect(clock([horaVigente(local(2026, 11, 10, 14, 30), horas) as Date])).toEqual(['14:45']);
    expect(clock([horaVigente(local(2026, 11, 10, 15, 0), horas) as Date])).toEqual(['15:00']);
    expect(horaVigente(local(2026, 11, 10, 15, 0), [])).toBeNull();
  });
});

describe('how she eats it — para llevar first (calls 26, 27)', () => {
  it('among the dish’s ways; a dish that says neither is para llevar', () => {
    expect(comeresDe(plato({ llevar: true, aqui: true }))).toEqual(['llevar', 'aqui']);
    expect(comeresDe(plato({ llevar: false, aqui: true }))).toEqual(['aqui']);
    expect(comeresDe(plato({ llevar: false, aqui: false }))).toEqual(['llevar']);
  });

  it('the sheet opens on the first hour, para llevar when it can be, and cash', () => {
    const o = oferta(local(2026, 11, 10, 14, 0), local(2026, 11, 10, 16, 0));
    const inicial = inicialDe(o, plato({ llevar: false, aqui: true }), local(2026, 11, 10, 14, 7));
    expect(clock([inicial.hora as Date])).toEqual(['14:15']);
    expect([inicial.comer, inicial.pago]).toEqual(['aqui', 'efectivo']);
  });
});

describe('the total before she reserves — the desechable only when she takes it away', () => {
  const o = oferta(local(2026, 11, 10, 14, 0), local(2026, 11, 10, 16, 0));

  it('$60 + $5 del desechable, para llevar', () => {
    expect(totalDe(plato(), o, 'llevar')).toEqual({ platillo: 6000, desechable: 500, total: 6500 });
  });

  it('never for a plate eaten there, and never when she charges none', () => {
    expect(totalDe(plato(), o, 'aqui')).toEqual({ platillo: 6000, desechable: null, total: 6000 });
    expect(totalDe(plato(), oferta(o.start, o.end, { desechableCentavos: null }), 'llevar').total).toBe(6000);
  });

  it('as `reserve_plate` stores it — the offer’s desechable on a plate taken away', () => {
    expect(sql('0080_')).toContain("case when v_eat = 'llevar' then v_listing.container_price end");
  });
});

describe('who may reserve — the kitchen’s setting by score (`0080`)', () => {
  it('strictly more, on the exact share; fewer than three thumbs always pass', () => {
    expect(DESDE_CALIFICACIONES).toBe(3);
    expect(sql('0080_')).toContain("(v_score ->> 'up')::integer * 100 <= v_page.min_score * (v_score ->> 'total')::integer");
    expect(porCalificacion(80, { up: 4, total: 5 })).toEqual({ minimo: 80, suyo: 80 });
    expect(porCalificacion(80, { up: 17, total: 20 })).toBeNull();
    expect(porCalificacion(80, { up: 0, total: 2 })).toBeNull();
    expect(porCalificacion(null, { up: 0, total: 20 })).toBeNull();
    expect(porCalificacion(85, null)).toBeNull();
  });

  it('her per cent rounded down, so a neighbour turned away never reads a number above the bar', () => {
    expect(porcentajeDe({ up: 15, total: 19 })).toBe(78);
    expect(porCalificacion(80, { up: 15, total: 19 })).toEqual({ minimo: 80, suyo: 78 });
    expect(porcentajeDe({ up: 11, total: 12 })).toBe(91);
    expect(porcentajeDe({ up: 2, total: 2 })).toBeNull();
    expect(porcentajeDe(null)).toBeNull();
  });

  it('said in the final design’s words', () => {
    expect(ES.apartar.calificacion(80, 78)).toBe('Esta cocina aparta a quien tiene más de 80% de 👍. Tú tienes 78%.');
  });
});

describe('the dish page’s foot — in the order she meets it', () => {
  const ahora = local(2026, 11, 10, 14, 7);
  const o = oferta(local(2026, 11, 10, 14, 0), local(2026, 11, 10, 16, 0));
  const k = cocina();
  const p = plato();
  const suyo = (over: Record<string, unknown> = {}) =>
    apartadoOf({
      id: 'r-1',
      code: 347,
      state: 'apartado',
      pickup_at: '2026-11-10T20:30:00Z',
      held_until: o.end.toISOString(),
      cancel_until: '2026-11-10T19:30:00Z',
      payment: 'efectivo',
      eat: 'llevar',
      cancel_reason: null,
      kitchen: { id: 'k-1', name: 'Fonda Doña Lupe', giro: null, address: null, directions: null, page: null },
      lines: [{ line_no: 1, name: 'Mole con arroz', surprise: false, quantity: '1.000', unit_price: '60.00', container_price: null }],
      ...over,
    });

  it('waits for her reservations and her standing', () => {
    expect(pieDe({ cocina: k, oferta: o, platillo: p, apartados: undefined, posicion: posicion(), ahora }).kind).toBe('cargando');
    expect(pieDe({ cocina: k, oferta: o, platillo: p, apartados: [], posicion: undefined, ahora }).kind).toBe('cargando');
  });

  it('says why, and asks again, when they could not be read — never a spinner that never ends', () => {
    expect(pieDe({ cocina: k, oferta: o, platillo: p, apartados: undefined, posicion: posicion(), fallo: true, ahora }).kind).toBe('falla');
    expect(pieDe({ cocina: k, oferta: o, platillo: p, apartados: [], posicion: undefined, fallo: true, ahora }).kind).toBe('falla');
    // A failed read again with both in hand is not a failure of the foot.
    expect(pieDe({ cocina: k, oferta: o, platillo: p, apartados: [], posicion: posicion(), fallo: true, ahora }).kind).toBe('apartar');
  });

  it('Apartar, when nothing stops her', () => {
    expect(pieDe({ cocina: k, oferta: o, platillo: p, apartados: [], posicion: posicion(), ahora }).kind).toBe('apartar');
  });

  it('this very dish, already hers: her code is one tap away', () => {
    const pie = pieDe({ cocina: k, oferta: o, platillo: p, apartados: [suyo()], posicion: posicion({ tiene: 1 }), ahora });
    expect(pie.kind).toBe('yaLoApartaste');
    expect(esDeEstePlatillo(suyo(), k, o, plato({ lineNo: 2, name: 'Otro' }))).toBe(false);
    expect(esDeEstePlatillo(suyo(), cocina({ id: 'k-2' }), o, p)).toBe(false);
    expect(esDeEstePlatillo(suyo({ held_until: '2026-11-11T00:00:00Z' }), k, o, p)).toBe(false);
  });

  it('a kitchen above her score — said before she taps, before her limit', () => {
    const pie = pieDe({
      cocina: cocina({ minScore: 80 }),
      oferta: o,
      platillo: p,
      apartados: [suyo({ id: 'r-2', kitchen: { id: 'k-9', name: 'Otra', giro: null, address: null, directions: null, page: null } })],
      posicion: posicion({ calificacion: { up: 15, total: 19 }, tiene: 1 }),
      ahora,
    });
    expect(pie).toEqual({ kind: 'calificacion', minimo: 80, suyo: 78 });
  });

  it('as many as she may hold — one until her first pickup, then three', () => {
    const otra = suyo({ kitchen: { id: 'k-9', name: 'Otra', giro: null, address: null, directions: null, page: null } });
    expect(pieDe({ cocina: k, oferta: o, platillo: p, apartados: [otra], posicion: posicion({ limite: 1, tiene: 1 }), ahora })).toEqual({
      kind: 'limite',
      limite: 1,
    });
    expect(pieDe({ cocina: k, oferta: o, platillo: p, apartados: [otra], posicion: posicion({ limite: 3, tiene: 1 }), ahora }).kind).toBe('apartar');
    expect(ES.apartar.limite(1)).toBe('Ya tienes un apartado');
    expect(ES.apartar.limite(3)).toBe('Ya tienes 3 apartados');
  });

  it('too close to the window’s end for any hour', () => {
    expect(pieDe({ cocina: k, oferta: o, platillo: p, apartados: [], posicion: posicion(), ahora: local(2026, 11, 10, 15, 50) }).kind).toBe('sinHoras');
  });
});

describe('the dish page says how it is eaten and how she pays (the family-shell page, stage 2)', () => {
  it('both ways, one, or only there', () => {
    expect(comerTexto(plato({ llevar: true, aqui: true }))).toEqual({ titulo: 'Aquí o para llevar', detalle: 'Tú eliges al apartar', plato: true });
    expect(comerTexto(plato())).toEqual({ titulo: 'Para llevar', detalle: 'La cocina te la empaca', plato: false });
    expect(comerTexto(plato({ llevar: false, aqui: true }))).toEqual({ titulo: 'Solo para comer aquí', detalle: 'Te la sirven en la cocina', plato: true });
  });

  it('cash first, then what she takes', () => {
    expect(pagosTexto(cocina({ pagos: ['efectivo', 'tarjeta', 'transferencia'] }))).toBe('Efectivo · Tarjeta · Transferencia');
    expect(pagosTexto(cocina())).toBe('Efectivo');
  });
});

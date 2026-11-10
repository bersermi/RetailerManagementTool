import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { Reserva, SobreElVecino } from '@/api/apartados';
import {
  COLA_FORMA,
  COLA_KEY,
  NO_ES_DE_SU_COCINA,
  RECHAZO_MS,
  VACIA,
  crearDrenaje,
  deLaCocina,
  desenlaceDe,
  encolar,
  entregaEsperando,
  escribirCola,
  leerCola,
  llamadaDe,
  rechazoDe,
  reservasConCola,
  vecinosConCola,
  type Envio,
  type EstadoDeCola,
  type Llamada,
  type Nuevo,
} from '@/api/cola';
import { marcaDe, ordenesDe, porEnviarTexto } from '@/lib/apartados';
import { ES } from '@/strings';
import { timedOutError } from '@/lib/plazo';
import type { DeviceStore } from '@/lib/store';

// ============================================================================
// THE HANDOVER WITH NO SIGNAL — HER QUEUE. Plan task `10.5b-iv-b` (`@/api/cola`).
//
// ⚠️ THE FAILURES THIS ROW EXISTS FOR ARE INVISIBLE ON A SCREEN AND IN CI'S DATABASE
// CHECK ALIKE: a handover lost or sent twice, a thumb sent ahead of its handover, a
// change of thumb overwritten by the send it replaced, a queue stuck behind one order,
// a session that was not renewed taken for a refusal. Each is run here against a store
// in memory and a database that answers what it is told to — the real database's
// answers are `docs/checks/10.5b-iv-a-handover-contract.sh`'s (its groups for this row).
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MIGRATIONS = join(ROOT, 'supabase/migrations');

function memoria(): DeviceStore & { readonly datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

const T0 = new Date('2026-11-10T20:30:00.000Z');
const at = (min: number) => new Date(T0.getTime() + min * 60_000);

const entrega = (reserva: string, min = 0, extra: Partial<Nuevo> = {}): Nuevo =>
  ({ tipo: 'entrega', usuario: 'u1', cocina: 'k1', reserva, en: at(min), ...extra }) as Nuevo;
const pulgar = (reserva: string, arriba: boolean, etiquetas: string[], min = 0, extra: Partial<Nuevo> = {}): Nuevo =>
  ({ tipo: 'pulgar', usuario: 'u1', cocina: 'k1', reserva, en: at(min), arriba, etiquetas, ...extra }) as Nuevo;

const cola = (...nuevos: Nuevo[]): EstadoDeCola => nuevos.reduce(encolar, VACIA);

describe('what is queued — at most one of each per order', () => {
  it('a handover is queued with her moment; a second for the same order changes nothing (the database keeps the first)', () => {
    const una = cola(entrega('r1', 0));
    expect(una.envios).toEqual([{ tipo: 'entrega', usuario: 'u1', cocina: 'k1', reserva: 'r1', en: at(0).toISOString(), version: 1 }]);
    expect(encolar(una, entrega('r1', 5)).envios).toEqual(una.envios);
  });

  it('a second thumb replaces the first’s content, keeping its moment and its place — and raises its version', () => {
    const c = cola(entrega('r1'), pulgar('r1', true, ['a_tiempo'], 1), entrega('r2', 2), pulgar('r1', false, ['tarde', 'a_tiempo'], 3));
    expect(c.envios.map((e) => `${e.tipo}:${e.reserva}`)).toEqual(['entrega:r1', 'pulgar:r1', 'entrega:r2']);
    expect(c.envios[1]).toMatchObject({ arriba: false, etiquetas: ['tarde'], en: at(1).toISOString(), version: 2 });
  });

  it('labels as the database takes them: those of the thumb’s side, and No se presentó alone', () => {
    expect(cola(pulgar('r1', true, ['amable', 'pago', 'a_tiempo'])).envios[0]).toMatchObject({ etiquetas: ['a_tiempo', 'amable'] });
    expect(cola(pulgar('r1', false, ['no_se_presento', 'tarde'])).envios[0]).toMatchObject({ etiquetas: ['no_se_presento'] });
  });

  it('⚠️ Sí pasó clears a No se presentó still waiting for the same order — `0080`’s handover deletes that thumb', () => {
    const c = cola(pulgar('r1', false, ['no_se_presento']), pulgar('r2', false, ['no_se_presento']), entrega('r1', 1));
    expect(c.envios.map((e) => `${e.tipo}:${e.reserva}`)).toEqual(['pulgar:r2', 'entrega:r1']);
    // A thumb down after a handover is a thumb about the handover, and stays.
    const d = cola(entrega('r3'), pulgar('r3', false, ['tarde']), entrega('r3', 2));
    expect(d.envios.map((e) => `${e.tipo}:${e.reserva}`)).toEqual(['entrega:r3', 'pulgar:r3']);
  });

  it('another login’s sends are its own — the same order handed over by two logins is two sends', () => {
    const c = cola(entrega('r1'), entrega('r1', 1, { usuario: 'u2' }));
    expect(c.envios).toHaveLength(2);
    expect(deLaCocina(c, 'u1', 'k1')).toHaveLength(1);
    expect(deLaCocina(c, 'u1', 'k2')).toHaveLength(0);
    expect(deLaCocina(c, null, 'k1')).toHaveLength(0);
  });

  it('trying again clears the refusal drawn on that order and kind', () => {
    const conRechazo: EstadoDeCola = { envios: [], rechazos: [{ usuario: 'u1', cocina: 'k1', reserva: 'r1', tipo: 'pulgar', falla: 'cambio', en: at(0).toISOString() }] };
    expect(encolar(conRechazo, entrega('r1')).rechazos).toHaveLength(1);
    expect(encolar(conRechazo, pulgar('r1', true, [])).rechazos).toHaveLength(0);
  });
});

describe('what is sent — each function’s arguments, with her phone’s moment', () => {
  it('a handover is `hand_over_reservation`’s; a thumb `rate_neighbour`’s; No se presentó its own', () => {
    const [e, p, n] = cola(entrega('r1', 0), pulgar('r2', true, ['amable'], 1), pulgar('r3', false, ['no_se_presento'], 2)).envios;
    expect(llamadaDe(e)).toEqual({ tipo: 'entrega', args: { p_id: 'r1', p_at: at(0).toISOString() } });
    expect(llamadaDe(p)).toEqual({ tipo: 'pulgar', args: { p_reservation_id: 'r2', p_up: true, p_labels: ['amable'], p_at: at(1).toISOString() } });
    expect(llamadaDe(n)).toEqual({ tipo: 'pulgar', args: { p_reservation_id: 'r3', p_up: false, p_labels: ['no_se_presento'], p_at: at(2).toISOString() } });
  });
});

function reserva(id: string, extra: Partial<Reserva> = {}): Reserva {
  return {
    id,
    ofertaId: 'o1',
    codigo: '347',
    dia: '2026-11-10',
    hora: at(15),
    guardadaHasta: at(90),
    creadaEn: at(-60),
    canceladaEn: null,
    canceladaPorLaCocina: false,
    entregadaEn: null,
    recogidaEn: null,
    pago: 'efectivo',
    comer: 'llevar',
    platos: [{ lineaDeOferta: 1, nombre: 'Mole', sorpresa: false, cantidad: 1, precioCentavos: 6000, desechableCentavos: null }],
    cobroCentavos: 6000,
    desechablesCentavos: 0,
    ...extra,
  };
}

const ana: SobreElVecino = { vecino: { nombre: 'Ana R.', calificacion: null }, pulgar: null, calificarHasta: at(90 + 24 * 60) };

describe('drawn over the read — what waits is what she sees', () => {
  it('a waiting handover: the order handed over at her moment, never before it was made, a recorded one kept', () => {
    const envios = cola(entrega('r1', 2), entrega('r2', 2), entrega('r3', 2)).envios;
    const [r1, r2, r3, r4] = reservasConCola(
      [reserva('r1'), reserva('r2', { creadaEn: at(5) }), reserva('r3', { entregadaEn: at(1) }), reserva('r4')],
      envios,
    );
    expect(r1.entregadaEn).toEqual(at(2));
    expect(r2.entregadaEn).toEqual(at(5));
    expect(r3.entregadaEn).toEqual(at(1));
    expect(r4.entregadaEn).toBeNull();
    expect(entregaEsperando(envios, 'r1')).toBe(true);
    expect(entregaEsperando(envios, 'r4')).toBe(false);
  });

  it('a waiting thumb is the thumb: its name kept, changeable for 24 hours from the first moment — a person’s, never the clock’s', () => {
    const v = vecinosConCola({ r1: ana }, cola(entrega('r1'), pulgar('r1', true, ['a_tiempo'], 3)).envios, [reserva('r1')]);
    expect(v.r1).toEqual({
      vecino: ana.vecino,
      pulgar: { arriba: true, etiquetas: ['a_tiempo'], dadoEn: at(3), cambiarHasta: at(3 + 24 * 60), reloj: false },
      calificarHasta: null,
    });
    // A change of a thumb the database already holds keeps that thumb's moment, as `rate_neighbour` does.
    const ya = { ...ana, pulgar: { arriba: true, etiquetas: [], dadoEn: at(1), cambiarHasta: at(1 + 24 * 60), reloj: false } };
    expect(vecinosConCola({ r1: ya }, cola(pulgar('r1', false, ['tarde'], 9)).envios, []).r1.pulgar).toMatchObject({ arriba: false, dadoEn: at(1) });
    // An order whose neighbour was never read still takes it, nameless.
    expect(vecinosConCola({}, cola(pulgar('r9', true, [])).envios, []).r9.vecino).toBeNull();
  });

  it('⚠️ a waiting handover opens her thumb as the database will once it lands — until her window’s end plus 24 hours (the review of `10.5b-iv-b`)', () => {
    // A pending order's copy carries no `rate_until`: `reservation_neighbours` sends it once collected or released.
    const pendiente: SobreElVecino = { ...ana, calificarHasta: null };
    const handed = vecinosConCola({ r1: pendiente }, cola(entrega('r1', 2)).envios, [reserva('r1')]);
    expect(handed.r1).toEqual({ vecino: ana.vecino, pulgar: null, calificarHasta: at(90 + 24 * 60) });
    // The orders as drawn, then: Calificar, and on the tab's count.
    const [orden] = ordenesDe(reservasConCola([reserva('r1')], cola(entrega('r1', 2)).envios), handed, at(3));
    expect(marcaDe(orden, at(3))).toBe('porCalificar');
    // With no name — her account gone — nothing to rate, as the database says.
    expect(vecinosConCola({ r1: { vecino: null, pulgar: null, calificarHasta: null } }, cola(entrega('r1')).envios, [reserva('r1')]).r1.calificarHasta).toBeNull();
    // A no-show cleared by Sí pasó opens it too.
    const noShow: SobreElVecino = { ...pendiente, pulgar: { arriba: false, etiquetas: ['no_se_presento'], dadoEn: at(91), cambiarHasta: at(91 + 1440), reloj: false } };
    expect(vecinosConCola({ r1: noShow }, cola(entrega('r1', 95)).envios, [reserva('r1')]).r1).toMatchObject({ pulgar: null, calificarHasta: at(90 + 24 * 60) });
  });

  it('what waits, in words — and a refusal drawn on its order for a day', () => {
    expect(porEnviarTexto(cola(entrega('a'), entrega('b'), pulgar('a', true, [])).envios)).toBe('2 entregas y 1 calificación por enviar');
    expect(porEnviarTexto(cola(pulgar('a', true, [])).envios)).toBe('1 calificación por enviar');
    expect(porEnviarTexto([])).toBeNull();
    // Wera's sentence for what waits on the phone, word for word — and in the singular for one.
    const wera = readFileSync(join(ROOT, 'app/src/strings.ts'), 'utf8').match(/unsentNote: '([^']*)'/)?.[1];
    expect(ES.cola.seEnvian(2)).toBe(wera);
    expect(ES.cola.seEnvian(1)).toBe('Todavía está en este teléfono. Se envía sola cuando vuelve la señal.');
    const c: EstadoDeCola = { envios: [], rechazos: [{ usuario: 'u1', cocina: 'k1', reserva: 'r1', tipo: 'pulgar', falla: 'cambio', en: at(0).toISOString() }] };
    expect(rechazoDe(c, 'u1', 'r1', at(10))?.falla).toBe('cambio');
    expect(rechazoDe(c, 'u2', 'r1', at(10))).toBeNull();
    expect(rechazoDe(c, 'u1', 'r1', new Date(at(0).getTime() + RECHAZO_MS))).toBeNull();
  });
});

describe('when a send fails — which failures wait, and which are the database’s last word', () => {
  it('no answer: the drain stops — a dead link, and a request over its time limit', () => {
    expect(desenlaceDe(new TypeError('Network request failed'))).toEqual({ tipo: 'senal' });
    expect(desenlaceDe({ message: 'TypeError: Network request failed', code: '' })).toEqual({ tipo: 'senal' });
    expect(desenlaceDe(timedOutError(30_000))).toEqual({ tipo: 'senal' });
    expect(desenlaceDe({ name: 'AuthRetryableFetchError', message: 'x' })).toEqual({ tipo: 'senal' });
  });

  it('⚠️⚠️ a 42501 is final ONLY with the functions’ own message — with no session, the client roles’ “permission denied” is her sign-in, and waits', () => {
    expect(desenlaceDe({ code: '42501', message: 'hand_over_reservation: that reservation is not at one of your kitchens' })).toEqual({ tipo: 'final', falla: 'sesion' });
    expect(desenlaceDe({ code: '42501', message: 'rate_neighbour: that reservation is not at one of your kitchens' })).toEqual({ tipo: 'final', falla: 'sesion' });
    expect(desenlaceDe({ code: '42501', message: 'permission denied for function hand_over_reservation' })).toEqual({ tipo: 'sesion' });
    expect(desenlaceDe({ code: '42501', message: 'rate_neighbour requires an authenticated caller' })).toEqual({ tipo: 'sesion' });
    expect(desenlaceDe({ code: 'PGRST301', message: 'JWT expired' })).toEqual({ tipo: 'sesion' });
  });

  it('the pattern is the migrations’ text: both functions, as the database runs them, refuse with it', () => {
    const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
    for (const fn of ['hand_over_reservation', 'rate_neighbour']) {
      const pattern = new RegExp(`create (or replace )?function public\\.${fn}\\(`, 'i');
      const last = files.filter((f) => pattern.test(readFileSync(join(MIGRATIONS, f), 'utf8'))).pop() as string;
      const text = readFileSync(join(MIGRATIONS, last), 'utf8');
      const body = text.slice(text.search(pattern), text.indexOf('$$;', text.search(pattern)));
      expect(body, fn).toMatch(new RegExp(`'${fn}: that ${NO_ES_DE_SU_COCINA.source}'\\s*using errcode = '42501'`));
    }
  });

  it('the database’s last word on the send: a label that cannot be true, nothing to rate, a value it cannot read', () => {
    expect(desenlaceDe({ code: '22023', message: 'x' })).toEqual({ tipo: 'final', falla: 'cambio' });
    expect(desenlaceDe({ code: 'TD022', message: 'x' })).toEqual({ tipo: 'final', falla: 'yaNoSeCalifica' });
    expect(desenlaceDe({ code: '22P02', message: 'x' })).toEqual({ tipo: 'final', falla: 'otra' });
  });

  it('anything else waits — for that order only, never the whole queue', () => {
    expect(desenlaceDe({ code: 'PGRST002', message: 'schema cache' })).toEqual({ tipo: 'esperar' });
    expect(desenlaceDe({ code: '57014', message: 'canceling statement' })).toEqual({ tipo: 'esperar' });
    expect(desenlaceDe('?')).toEqual({ tipo: 'esperar' });
  });
});

describe('kept on the phone', () => {
  it('written whole under its own key, read back the same — a refusal older than a day dropped', () => {
    const store = memoria();
    const c: EstadoDeCola = {
      ...cola(entrega('r1'), pulgar('r1', true, ['amable'])),
      rechazos: [
        { usuario: 'u1', cocina: 'k1', reserva: 'r2', tipo: 'entrega', falla: 'sesion', en: at(0).toISOString() },
        { usuario: 'u1', cocina: 'k1', reserva: 'r3', tipo: 'entrega', falla: 'sesion', en: at(-25 * 60).toISOString() },
      ],
    };
    const escrito = escribirCola(store, c, at(1));
    expect(escrito.rechazos.map((r) => r.reserva)).toEqual(['r2']);
    expect(JSON.parse(store.datos.get(COLA_KEY) as string).forma).toBe(COLA_FORMA);
    expect(leerCola(store)).toEqual(escrito);
  });

  it('a blob of another shape, or that will not parse, is an empty queue — and a send it cannot read is left out, never the queue', () => {
    const store = memoria();
    store.datos.set(COLA_KEY, JSON.stringify({ forma: COLA_FORMA + 1, envios: [{ tipo: 'entrega' }] }));
    expect(leerCola(store)).toEqual(VACIA);
    store.datos.set(COLA_KEY, '{');
    expect(leerCola(store)).toEqual(VACIA);
    store.datos.set(COLA_KEY, JSON.stringify({ forma: COLA_FORMA, envios: [{ tipo: 'nada' }, ...cola(entrega('r1')).envios], rechazos: [] }));
    expect(leerCola(store).envios.map((e) => e.reserva)).toEqual(['r1']);
    expect(leerCola(undefined)).toEqual(VACIA);
  });
});

/** A database that answers each call as the test says, and the ports around it, over a store in memory. */
function banco(responde: (llamada: Llamada, n: number) => unknown | Promise<unknown>, usuario: string | null = 'u1') {
  const store = memoria();
  const enviadas: Llamada[] = [];
  const llegadas: Envio[] = [];
  const login = { actual: usuario };
  const puertos = {
    leer: () => leerCola(store),
    escribir: (e: EstadoDeCola) => void escribirCola(store, e, T0),
    usuario: () => login.actual,
    enviar: async (llamada: Llamada) => {
      enviadas.push(llamada);
      const r = await responde(llamada, enviadas.length);
      if (r instanceof Error || (typeof r === 'object' && r !== null && 'code' in r)) throw r;
      return r;
    },
    llego: async (envio: Envio) => {
      // ⚠️ Drawn into the cache BEFORE it leaves the queue — and awaited: a read in flight is cancelled first.
      await Promise.resolve();
      expect(leerCola(store).envios.some((e) => e.tipo === envio.tipo && e.reserva === envio.reserva)).toBe(true);
      llegadas.push(envio);
    },
    ahora: () => T0,
  };
  const encola = (...nuevos: Nuevo[]) => escribirCola(store, nuevos.reduce(encolar, leerCola(store)), T0);
  return { store, enviadas, llegadas, puertos, encola, login, drenaje: crearDrenaje(puertos) };
}

const quien = (l: Llamada) => `${l.tipo}:${'p_id' in l.args ? l.args.p_id : l.args.p_reservation_id}`;

describe('the drain', () => {
  it('sends in the order she made them and empties the queue — `drained`', async () => {
    const b = banco(() => 'recogido');
    b.encola(entrega('r1'), pulgar('r1', true, ['a_tiempo']), entrega('r2'));
    expect(await b.drenaje.drenar()).toEqual({ stop: 'drained', llegaron: 3, rechazados: 0 });
    expect(b.enviadas.map(quien)).toEqual(['entrega:r1', 'pulgar:r1', 'entrega:r2']);
    expect(leerCola(b.store).envios).toEqual([]);
  });

  it('⚠️ no signal: it stops at once, nothing removed, the rest not tried — `failed`, and the ladder tries again', async () => {
    const b = banco(() => new TypeError('Network request failed'));
    b.encola(entrega('r1'), entrega('r2'));
    expect(await b.drenaje.drenar()).toMatchObject({ stop: 'failed', llegaron: 0 });
    expect(b.enviadas).toHaveLength(1);
    expect(leerCola(b.store).envios).toHaveLength(2);
  });

  it('⚠️⚠️ a thumb never goes ahead of its handover: an order whose handover waits keeps its thumb waiting — the others go on', async () => {
    const b = banco((l) => (quien(l) === 'entrega:r1' ? { code: 'PGRST002', message: 'schema cache' } : 'ok'));
    b.encola(entrega('r1'), pulgar('r1', true, []), entrega('r2'), pulgar('r2', false, ['tarde']));
    expect(await b.drenaje.drenar()).toMatchObject({ stop: 'failed', llegaron: 2 });
    expect(b.enviadas.map(quien)).toEqual(['entrega:r1', 'entrega:r2', 'pulgar:r2']);
    expect(leerCola(b.store).envios.map((e) => `${e.tipo}:${e.reserva}`)).toEqual(['entrega:r1', 'pulgar:r1']);
  });

  it('⚠️ her sign-in not renewed (the publishable key’s “permission denied”): stops, nothing removed, nothing drawn as refused', async () => {
    const b = banco(() => ({ code: '42501', message: 'permission denied for function hand_over_reservation' }));
    b.encola(entrega('r1'), entrega('r2'));
    expect(await b.drenaje.drenar()).toEqual({ stop: 'failed', llegaron: 0, rechazados: 0 });
    expect(leerCola(b.store)).toMatchObject({ envios: [{ reserva: 'r1' }, { reserva: 'r2' }], rechazos: [] });
  });

  it('the database’s last word: removed, drawn on its order, and the drain goes on', async () => {
    const b = banco((l) => (quien(l) === 'pulgar:r1' ? { code: 'TD022', message: 'over' } : 'ok'));
    b.encola(entrega('r1'), pulgar('r1', true, []), entrega('r2'));
    expect(await b.drenaje.drenar()).toEqual({ stop: 'drained', llegaron: 2, rechazados: 1 });
    expect(leerCola(b.store)).toMatchObject({
      envios: [],
      rechazos: [{ usuario: 'u1', cocina: 'k1', reserva: 'r1', tipo: 'pulgar', falla: 'yaNoSeCalifica', en: T0.toISOString() }],
    });
  });

  it('⚠️ a thumb changed while its send was on the way is not removed by that send’s answer — her change goes next, in the same drain', async () => {
    let b: ReturnType<typeof banco>;
    b = banco((l, n) => {
      if (n === 1) b.encola(pulgar('r1', false, ['tarde'], 5));
      return 'ok';
    });
    b.encola(pulgar('r1', true, ['a_tiempo']));
    expect(await b.drenaje.drenar()).toMatchObject({ stop: 'drained', llegaron: 2 });
    expect(b.enviadas.map((l) => (l.tipo === 'pulgar' ? `${l.args.p_up}:${l.args.p_labels.join()}:${l.args.p_at}` : ''))).toEqual([
      `true:a_tiempo:${at(0).toISOString()}`,
      `false:tarde:${at(0).toISOString()}`,
    ]);
    expect(leerCola(b.store).envios).toEqual([]);
  });

  it('a send she makes while the drain runs goes in the same drain', async () => {
    let b: ReturnType<typeof banco>;
    b = banco((_l, n) => {
      if (n === 1) b.encola(entrega('r2', 1));
      return 'ok';
    });
    b.encola(entrega('r1'));
    expect(await b.drenaje.drenar()).toMatchObject({ stop: 'drained', llegaron: 2 });
    expect(b.enviadas.map(quien)).toEqual(['entrega:r1', 'entrega:r2']);
  });

  it('⚠️ one drain at a time: a second while one runs is `busy` and sends nothing — one handover is never sent twice at once', async () => {
    let suelta: (v: unknown) => void = () => {};
    const b = banco(() => new Promise((resolve) => (suelta = resolve)));
    b.encola(entrega('r1'));
    const primera = b.drenaje.drenar();
    expect(await b.drenaje.drenar()).toEqual({ stop: 'busy', llegaron: 0, rechazados: 0 });
    suelta('recogido');
    expect(await primera).toMatchObject({ stop: 'drained', llegaron: 1 });
    expect(b.enviadas).toHaveLength(1);
  });

  it('⚠️ a new login ends the drain — her sends never go under the next person’s session (the review of `10.5b-iv-b`)', async () => {
    let b: ReturnType<typeof banco>;
    b = banco((_l, n) => {
      if (n === 1) b.login.actual = 'u2';
      return 'ok';
    });
    b.encola(entrega('r1'), entrega('r2'), entrega('r3'));
    expect(await b.drenaje.drenar()).toMatchObject({ stop: 'failed', llegaron: 1 });
    expect(b.enviadas.map(quien)).toEqual(['entrega:r1']);
    expect(leerCola(b.store).envios.map((e) => e.reserva)).toEqual(['r2', 'r3']);
  });

  it('⚠️ a send she replaced while it was on its way draws no refusal — Sí pasó after a No se presentó (the review of `10.5b-iv-b`)', async () => {
    let b: ReturnType<typeof banco>;
    b = banco((l, n) => {
      if (n === 1) {
        b.encola(entrega('r1', 5));
        return { code: '22023', message: 'a label that cannot be true' };
      }
      return 'recogido';
    });
    b.encola(pulgar('r1', false, ['no_se_presento']));
    expect(await b.drenaje.drenar()).toMatchObject({ stop: 'drained', llegaron: 1, rechazados: 0 });
    expect(leerCola(b.store)).toEqual({ envios: [], rechazos: [] });
    expect(b.enviadas.map(quien)).toEqual(['pulgar:r1', 'entrega:r1']);
  });

  it('only the login signed in: another’s sends wait for her; signed out, nothing goes', async () => {
    const b = banco(() => 'ok');
    b.encola(entrega('r1', 0, { usuario: 'u2' }), entrega('r2'));
    expect(await b.drenaje.drenar()).toMatchObject({ stop: 'drained', llegaron: 1 });
    expect(leerCola(b.store).envios.map((e) => e.usuario)).toEqual(['u2']);
    const fuera = banco(() => 'ok', null);
    fuera.encola(entrega('r1'));
    expect(await fuera.drenaje.drenar()).toMatchObject({ stop: 'drained', llegaron: 0 });
    expect(fuera.enviadas).toHaveLength(0);
  });
});

describe('the wiring — what no node suite can run, held by its text', () => {
  const SRC = fileURLToPath(new URL('../src', import.meta.url));
  const code = (path: string) => readFileSync(join(SRC, path), 'utf8');

  it('a write is on the phone before the screen moves: enqueued synchronously, then the signal told', () => {
    expect(code('lib/cola.ts')).toMatch(/export function encolarEnvio\(nuevo: Nuevo\): void \{\s*escribir\(encolar\(actual\(\), nuevo\)\);\s*queued\(\);/);
    expect(code('api/hooks.ts')).toMatch(/encolarEnvio\(\{ tipo: 'entrega', usuario: userId, cocina: kitchenId, reserva: id, en: new Date\(\) \}\)/);
  });

  it('a landed send is drawn into the cached read and the cache saved, before the drain removes it', () => {
    const provider = code('lib/ColaProvider.tsx');
    expect(provider).toMatch(/await dibujarLlegada\(client, envio, respuesta\);\s*guardarYa\(\);/);
    expect(code('api/cola.ts')).toMatch(/await puertos\.llego\(envio, respuesta\);/);
    expect(code('lib/cola.ts')).toMatch(/llego: \(envio, respuesta\) => alLlegar\?\.\(envio, respuesta\)/);
    // Until the provider is mounted, nothing is sent — the queue keeps it.
    expect(code('lib/cola.ts')).toMatch(/usuario: \(\) => \(alLlegar === null \? null : usuario\)/);
  });

  it('the queue is one key of its own in the phone’s store — never the session’s, never the cache’s', () => {
    expect(COLA_KEY).toBe('cocina.cola');
    expect(code('auth/AuthProvider.tsx')).not.toMatch(/COLA_KEY|cocina\.cola/);
  });
});

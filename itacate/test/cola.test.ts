import { describe, expect, it } from 'vitest';

import { apartadoOf, type Apartado } from '@/api/apartados';
import {
  COLA_FORMA,
  COLA_KEY,
  RECHAZO_MS,
  VACIA,
  apartadosConCola,
  crearDrenaje,
  deLaUsuaria,
  desenlaceDe,
  encolar,
  escribirCola,
  leerCola,
  llamadaDe,
  rechazoDe,
  recogiEsperando,
  type EstadoDeCola,
  type Llamada,
  type PuertosDeCola,
} from '@/api/cola';
import type { DeviceStore } from '@/lib/store';

// ============================================================================
// HER *YA LO TENGO*, KEPT ON THE PHONE UNTIL IT GOES. Plan task `10.9j-ii-a` (`@/api/cola`; the
// owner's J4 of 2026-11-20). Every rule of the queue, run against a store in memory and sends
// handed in — what a swipe with no signal does, what comes back, and who it is sent for.
// ============================================================================

const ANA = 'u-ana';
const BETO = 'u-beto';
const T0 = new Date('2026-11-20T20:31:00.000Z');

/** A store in memory, as the phone's SQLite is under `localStorage`. */
function memoria(): DeviceStore & { readonly datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

/** One of `my_reservations`' rows, read. */
function apartado(id: string, over: Record<string, unknown> = {}): Apartado {
  return apartadoOf({
    id,
    code: 418,
    state: 'apartado',
    pickup_at: '2026-11-20T20:30:00+00:00',
    held_until: '2026-11-20T22:00:00+00:00',
    cancel_until: '2026-11-20T19:30:00+00:00',
    payment: 'efectivo',
    eat: 'llevar',
    cancel_reason: null,
    kitchen: { id: 'k-1', name: 'Fonda Doña Mari', giro: null, address: null, directions: null, page: null },
    lines: [{ line_no: 1, name: 'Pozole rojo', surprise: false, quantity: '1.000', unit_price: '85.00', container_price: null }],
    seal: 's1|abc|def|1|418|1763670600|efectivo|llevar|1.000|85.00||0|Pozole rojo|0123456789abcdef0123',
    ...over,
  });
}

const swipe = (usuario: string, reserva: string, en = T0) => ({ tipo: 'recogi' as const, usuario, reserva, en });

describe('queued: one swipe per reservation, with her minute', () => {
  it('a swipe is kept with the minute she swiped, for her login', () => {
    const estado = encolar(VACIA, swipe(ANA, 'r-1'));
    expect(estado.envios).toEqual([{ tipo: 'recogi', usuario: ANA, reserva: 'r-1', en: T0.toISOString() }]);
  });

  it('a second swipe of the same reservation changes nothing — the first minute is hers, as the database keeps the first', () => {
    const una = encolar(VACIA, swipe(ANA, 'r-1'));
    const otra = encolar(una, swipe(ANA, 'r-1', new Date(T0.getTime() + 60_000)));
    expect(otra.envios).toEqual(una.envios);
  });

  it('two reservations, or two logins, are two swipes', () => {
    const estado = encolar(encolar(encolar(VACIA, swipe(ANA, 'r-1')), swipe(ANA, 'r-2')), swipe(BETO, 'r-1'));
    expect(estado.envios.map((e) => `${e.usuario}:${e.reserva}`)).toEqual([`${ANA}:r-1`, `${ANA}:r-2`, `${BETO}:r-1`]);
    expect(deLaUsuaria(estado, ANA).map((e) => e.reserva)).toEqual(['r-1', 'r-2']);
    expect(deLaUsuaria(estado, null)).toEqual([]);
  });

  it('swiping again clears a refusal drawn on that reservation — she is trying again', () => {
    const conRechazo: EstadoDeCola = {
      envios: [],
      rechazos: [{ usuario: ANA, reserva: 'r-1', tipo: 'recogi', falla: 'yaNoPendiente', en: T0.toISOString() }],
    };
    expect(encolar(conRechazo, swipe(ANA, 'r-1')).rechazos).toEqual([]);
  });

  it('sent as `confirm_my_pickup(p_id, p_at)`, her minute as `p_at` (J4)', () => {
    const [envio] = encolar(VACIA, swipe(ANA, 'r-1')).envios;
    expect(llamadaDe(envio)).toEqual({ tipo: 'recogi', args: { p_id: 'r-1', p_at: T0.toISOString() } });
  });
});

describe('drawn over the read — the plate she swiped is collected at once', () => {
  it('collected, and its QR gone; the others as the read says', () => {
    const lista = [apartado('r-1'), apartado('r-2')];
    const [uno, dos] = apartadosConCola(lista, encolar(VACIA, swipe(ANA, 'r-1')).envios);
    expect(uno.estado).toBe('recogido');
    expect(uno.sello).toBeNull();
    expect(dos.estado).toBe('apartado');
    expect(dos.sello).not.toBeNull();
  });

  it('⚠️ its stars wait: no `rate_until` until the swipe lands, so Calificar is not offered', () => {
    const [uno] = apartadosConCola([apartado('r-1')], encolar(VACIA, swipe(ANA, 'r-1')).envios);
    expect(uno.calificarHasta).toBeNull();
  });

  it('nothing waiting is the read itself; a reservation already collected is left as the database says', () => {
    const lista = [apartado('r-1', { state: 'recogido', seal: null, rate_until: '2026-11-21T22:00:00+00:00' })];
    expect(apartadosConCola(lista, [])).toEqual(lista);
    expect(apartadosConCola(lista, encolar(VACIA, swipe(ANA, 'r-1')).envios)).toEqual(lista);
  });

  it('whether her swipe is still on the phone', () => {
    const { envios } = encolar(VACIA, swipe(ANA, 'r-1'));
    expect(recogiEsperando(envios, 'r-1')).toBe(true);
    expect(recogiEsperando(envios, 'r-2')).toBe(false);
  });

  it('a refusal is drawn on its reservation for a day, for her login only', () => {
    const estado: EstadoDeCola = {
      envios: [],
      rechazos: [{ usuario: ANA, reserva: 'r-1', tipo: 'recogi', falla: 'yaNoPendiente', en: T0.toISOString() }],
    };
    expect(rechazoDe(estado, ANA, 'r-1', new Date(T0.getTime() + RECHAZO_MS - 1))?.falla).toBe('yaNoPendiente');
    expect(rechazoDe(estado, ANA, 'r-1', new Date(T0.getTime() + RECHAZO_MS))).toBeNull();
    expect(rechazoDe(estado, BETO, 'r-1', T0)).toBeNull();
    expect(rechazoDe(estado, null, 'r-1', T0)).toBeNull();
  });
});

describe('when a send fails — which failures wait, and which are the database’s last word', () => {
  it('no signal stops the drain; the ladder tries again', () => {
    expect(desenlaceDe(new TypeError('Network request failed'))).toEqual({ tipo: 'senal' });
  });

  it('her sign-in not renewed stops it the same way — a 42501 that is not the function’s own, or a refused token', () => {
    expect(desenlaceDe({ code: '42501', message: 'permission denied for function confirm_my_pickup' })).toEqual({ tipo: 'sesion' });
    for (const code of ['PGRST301', 'PGRST302', 'PGRST303']) expect(desenlaceDe({ code, message: 'JWT' })).toEqual({ tipo: 'sesion' });
  });

  it('the database’s last word: TD018 (cancelled, or her minute more than a day after its window), the function’s own 42501, a value it cannot read', () => {
    expect(desenlaceDe({ code: 'TD018', message: 'confirm_my_pickup: that reservation is no longer pending' })).toEqual({ tipo: 'final', falla: 'yaNoPendiente' });
    expect(desenlaceDe({ code: '42501', message: 'confirm_my_pickup: that reservation is not one of yours' })).toEqual({ tipo: 'final', falla: 'sesion' });
    expect(desenlaceDe({ code: '22P02', message: 'invalid input syntax' })).toEqual({ tipo: 'final', falla: 'otra' });
  });

  it('anything else waits', () => {
    expect(desenlaceDe({ code: '57014', message: 'canceling statement' })).toEqual({ tipo: 'esperar' });
    expect(desenlaceDe('raro')).toEqual({ tipo: 'esperar' });
  });
});

describe('the store — its own key, read and written whole', () => {
  it('written and read back, under its own namespaced key', () => {
    const store = memoria();
    const estado = encolar(VACIA, swipe(ANA, 'r-1'));
    escribirCola(store, estado, T0);
    expect([...store.datos.keys()]).toEqual([COLA_KEY]);
    expect(COLA_KEY).toBe('itacate.cola');
    expect(leerCola(store)).toEqual(estado);
  });

  it('nothing, another shape, or text that is not JSON: empty — never something nobody asked for', () => {
    const store = memoria();
    expect(leerCola(store)).toEqual(VACIA);
    store.setItem(COLA_KEY, JSON.stringify({ forma: COLA_FORMA + 1, envios: [{ tipo: 'recogi', usuario: ANA, reserva: 'r', en: T0.toISOString() }] }));
    expect(leerCola(store)).toEqual(VACIA);
    store.setItem(COLA_KEY, '{nope');
    expect(leerCola(store)).toEqual(VACIA);
    expect(leerCola(undefined)).toEqual(VACIA);
  });

  it('a send it cannot read is left out, never the queue', () => {
    const store = memoria();
    store.setItem(
      COLA_KEY,
      JSON.stringify({
        forma: COLA_FORMA,
        envios: [{ tipo: 'recogi', usuario: ANA, reserva: 'r-1', en: T0.toISOString() }, { tipo: 'entrega', usuario: ANA, reserva: 'r-2', en: T0.toISOString() }, { tipo: 'recogi', usuario: ANA, reserva: 'r-3', en: 'ayer' }],
        rechazos: [],
      }),
    );
    expect(leerCola(store).envios.map((e) => e.reserva)).toEqual(['r-1']);
  });

  it('refusals older than a day are dropped when it is written', () => {
    const store = memoria();
    const viejo = new Date(T0.getTime() - RECHAZO_MS).toISOString();
    const escrito = escribirCola(store, { envios: [], rechazos: [{ usuario: ANA, reserva: 'r-1', tipo: 'recogi', falla: 'otra', en: viejo }] }, T0);
    expect(escrito.rechazos).toEqual([]);
  });
});

/** The drain's ports over a queue in memory; `responder` answers each call. */
function puertos(inicial: EstadoDeCola, responder: (llamada: Llamada) => Promise<unknown>, usuario: () => string | null = () => ANA) {
  let estado = inicial;
  const enviadas: Llamada[] = [];
  const llegadas: string[] = [];
  const p: PuertosDeCola = {
    leer: () => estado,
    escribir: (e) => {
      estado = e;
    },
    usuario,
    enviar: (llamada) => {
      enviadas.push(llamada);
      return responder(llamada);
    },
    llego: (envio) => {
      llegadas.push(envio.reserva);
    },
    ahora: () => T0,
  };
  return { p, enviadas, llegadas, estado: () => estado };
}

describe('the drain', () => {
  it('a swipe that lands is drawn into the read, then leaves the queue: drained', async () => {
    const q = puertos(encolar(VACIA, swipe(ANA, 'r-1')), async () => 'recogido');
    const d = await crearDrenaje(q.p).drenar();
    expect(d).toEqual({ stop: 'drained', llegaron: 1, rechazados: 0 });
    expect(q.llegadas).toEqual(['r-1']);
    expect(q.estado().envios).toEqual([]);
    expect(q.enviadas[0].args).toEqual({ p_id: 'r-1', p_at: T0.toISOString() });
  });

  it('no signal: the drain stops, the swipe waits — failed, and the ladder tries again', async () => {
    const q = puertos(encolar(encolar(VACIA, swipe(ANA, 'r-1')), swipe(ANA, 'r-2')), async () => {
      throw new TypeError('Network request failed');
    });
    const d = await crearDrenaje(q.p).drenar();
    expect(d.stop).toBe('failed');
    expect(q.enviadas).toHaveLength(1);
    expect(q.estado().envios).toHaveLength(2);
  });

  it('her sign-in not renewed: the same — nothing dropped', async () => {
    const q = puertos(encolar(VACIA, swipe(ANA, 'r-1')), async () => {
      throw { code: '42501', message: 'permission denied for function confirm_my_pickup' };
    });
    expect((await crearDrenaje(q.p).drenar()).stop).toBe('failed');
    expect(q.estado().envios).toHaveLength(1);
    expect(q.estado().rechazos).toEqual([]);
  });

  it('the database’s last word: it leaves the queue and is drawn on its ticket; the next one still goes', async () => {
    const q = puertos(encolar(encolar(VACIA, swipe(ANA, 'r-1')), swipe(ANA, 'r-2')), async (llamada) => {
      if (llamada.args.p_id === 'r-1') throw { code: 'TD018', message: 'confirm_my_pickup: that reservation is no longer pending' };
      return 'recogido';
    });
    const d = await crearDrenaje(q.p).drenar();
    expect(d).toEqual({ stop: 'drained', llegaron: 1, rechazados: 1 });
    expect(q.estado().envios).toEqual([]);
    expect(q.estado().rechazos).toEqual([{ usuario: ANA, reserva: 'r-1', tipo: 'recogi', falla: 'yaNoPendiente', en: T0.toISOString() }]);
  });

  it('anything else unknown: that one waits, the others go on', async () => {
    const q = puertos(encolar(encolar(VACIA, swipe(ANA, 'r-1')), swipe(ANA, 'r-2')), async (llamada) => {
      if (llamada.args.p_id === 'r-1') throw { code: '57014', message: 'canceling statement' };
      return 'recogido';
    });
    const d = await crearDrenaje(q.p).drenar();
    expect(d).toEqual({ stop: 'failed', llegaron: 1, rechazados: 0 });
    expect(q.estado().envios.map((e) => e.reserva)).toEqual(['r-1']);
  });

  it('⚠️ only her login’s swipes go — another person’s session would sign them', async () => {
    const q = puertos(encolar(encolar(VACIA, swipe(BETO, 'r-9')), swipe(ANA, 'r-1')), async () => 'recogido');
    const d = await crearDrenaje(q.p).drenar();
    expect(d.stop).toBe('drained');
    expect(q.enviadas.map((l) => l.args.p_id)).toEqual(['r-1']);
    expect(q.estado().envios.map((e) => e.usuario)).toEqual([BETO]);
  });

  it('nobody signed in: nothing goes', async () => {
    const q = puertos(encolar(VACIA, swipe(ANA, 'r-1')), async () => 'recogido', () => null);
    expect(await crearDrenaje(q.p).drenar()).toEqual({ stop: 'drained', llegaron: 0, rechazados: 0 });
    expect(q.enviadas).toEqual([]);
  });

  it('⚠️ a new login ends the drain — her next swipe is not sent under his session', async () => {
    let quien = ANA;
    const q = puertos(encolar(encolar(VACIA, swipe(ANA, 'r-1')), swipe(ANA, 'r-2')), async () => {
      quien = BETO;
      return 'recogido';
    }, () => quien);
    await crearDrenaje(q.p).drenar();
    expect(q.enviadas.map((l) => l.args.p_id)).toEqual(['r-1']);
    expect(q.estado().envios.map((e) => e.reserva)).toEqual(['r-2']);
  });

  it('single-flight: a second drain while one runs answers busy and sends nothing', async () => {
    let soltar: () => void = () => {};
    const q = puertos(encolar(VACIA, swipe(ANA, 'r-1')), () => new Promise((resolve) => (soltar = () => resolve('recogido'))));
    const drenaje = crearDrenaje(q.p);
    const primera = drenaje.drenar();
    expect(await drenaje.drenar()).toEqual({ stop: 'busy', llegaron: 0, rechazados: 0 });
    soltar();
    expect((await primera).stop).toBe('drained');
    expect(q.enviadas).toHaveLength(1);
  });
});

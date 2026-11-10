// ============================================================================
// THE QUEUE OF HER HANDOVERS AND THUMBS, BOUND TO THE PHONE. Plan task `10.5b-iv-b`.
// Everything with a right answer is `@/api/cola` (pinned by `test/cola.test.ts`);
// what is left here is the store, a copy of it in memory for the screens, the two
// calls, and the wire to the signal (`@/lib/connectivityMonitor`).
//
// ⚠️ WRITTEN BEFORE THE SCREEN SAYS *ENTREGADO* (`encolarEnvio` is synchronous): a
// phone that dies a second after the tap still has the handover when it wakes.
// ⚠️ ONE DRAIN FOR THE APP (`drenaje`, made once): single-flight means anything only
// if there is one — two would send one handover twice.
// ⚠️ WHAT A LANDED SEND DOES TO THE CACHE is handed in by `@/lib/ColaProvider`, which
// holds the query client (`setAlLlegar`); until it is, a send does not go — the queue
// keeps it, and the order would otherwise come back *por entregar* until the re-read.
// ============================================================================

import { useSyncExternalStore } from 'react';

import { handOverReservation, rateNeighbour } from '@/api/calls';
import {
  crearDrenaje,
  encolar,
  escribirCola,
  leerCola,
  type Drenado,
  type Envio,
  type EstadoDeCola,
  type Nuevo,
} from '@/api/cola';
import { queued } from '@/lib/connectivityMonitor';
import { deviceStore } from '@/lib/store';

let estado: EstadoDeCola | null = null;
const lectores = new Set<() => void>();

/** The queue as the phone holds it — read from the store once, then kept in step with every write. */
function actual(): EstadoDeCola {
  if (estado === null) estado = leerCola(deviceStore());
  return estado;
}

function escribir(siguiente: EstadoDeCola): void {
  estado = escribirCola(deviceStore(), siguiente, new Date());
  for (const lector of lectores) lector();
}

function suscribir(lector: () => void): () => void {
  lectores.add(lector);
  return () => {
    lectores.delete(lector);
  };
}

/** What every screen draws from: the queue now, re-drawn on every change. */
export function useCola(): EstadoDeCola {
  return useSyncExternalStore(suscribir, actual, actual);
}

/** Queue a handover or a thumb — written to the phone before this returns — and send it if there is signal. */
export function encolarEnvio(nuevo: Nuevo): void {
  escribir(encolar(actual(), nuevo));
  queued();
}

let usuario: string | null = null;
let alLlegar: ((envio: Envio, respuesta: unknown) => Promise<void>) | null = null;

/** The login signed in now — the only one whose sends go. Set by `@/lib/ColaProvider`. */
export function setUsuarioDeCola(id: string | null): void {
  usuario = id;
}

/** What a landed send does to the cache — set by `@/lib/ColaProvider` while it is mounted. */
export function setAlLlegar(fn: ((envio: Envio, respuesta: unknown) => Promise<void>) | null): void {
  alLlegar = fn;
}

let drenaje: { drenar(): Promise<Drenado> } | null = null;

/** The app's one drain, as the signal calls it. */
export async function drenarCola(): Promise<{ stop: Drenado['stop']; landed: number }> {
  if (drenaje === null) {
    drenaje = crearDrenaje({
      leer: actual,
      escribir,
      usuario: () => (alLlegar === null ? null : usuario),
      enviar: (llamada) => (llamada.tipo === 'entrega' ? handOverReservation(llamada.args) : rateNeighbour(llamada.args)),
      llego: (envio, respuesta) => alLlegar?.(envio, respuesta),
      ahora: () => new Date(),
    });
  }
  const drenado = await drenaje.drenar();
  return { stop: drenado.stop, landed: drenado.llegaron };
}

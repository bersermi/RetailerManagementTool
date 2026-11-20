// ============================================================================
// THE QUEUE OF HER *YA LO TENGO*, BOUND TO THE PHONE. Plan task `10.9j-ii-a` — Wera
// Cocina's `cocina/src/lib/cola.ts` (`10.5b-iv-b`), cut to one kind. Everything with a
// right answer is `@/api/cola` (pinned by `test/cola.test.ts`); what is left here is the
// store, a copy of it in memory for the screens, the one call, and the wire to the
// signal (`@/lib/connectivityMonitor`).
//
// ⚠️ WRITTEN BEFORE THE SCREEN SAYS *YA LO TIENES* (`encolarRecogi` is synchronous): a
// phone that dies a second after the swipe still has it when it wakes.
// ⚠️ ONE DRAIN FOR THE APP (`drenaje`, made once): single-flight means anything only if
// there is one — two would send one swipe twice.
// ⚠️ WHAT A LANDED SEND DOES TO THE CACHE is handed in by `@/lib/ColaProvider`, which holds
// the query client (`setAlLlegar`); until it is, a send does not go — the queue keeps it, and
// her ticket would otherwise come back as still to collect until the re-read.
// ============================================================================

import { useSyncExternalStore } from 'react';

import { confirmMyPickup } from '@/api/calls';
import { crearDrenaje, encolar, escribirCola, leerCola, type Drenado, type Envio, type EstadoDeCola, type Nuevo } from '@/api/cola';
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

/** Queue her *Ya lo tengo* — written to the phone before this returns — and send it if there is signal. */
export function encolarRecogi(nuevo: Nuevo): void {
  escribir(encolar(actual(), nuevo));
  queued();
}

let usuario: string | null = null;
let alLlegar: ((envio: Envio) => Promise<void>) | null = null;

/** The login signed in now — the only one whose sends go. Set by `@/lib/ColaProvider`. */
export function setUsuarioDeCola(id: string | null): void {
  usuario = id;
}

/** What a landed send does to the cache — set by `@/lib/ColaProvider` while it is mounted. */
export function setAlLlegar(fn: ((envio: Envio) => Promise<void>) | null): void {
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
      enviar: (llamada) => confirmMyPickup(llamada.args),
      llego: (envio) => alLlegar?.(envio),
      ahora: () => new Date(),
    });
  }
  const drenado = await drenaje.drenar();
  return { stop: drenado.stop, landed: drenado.llegaron };
}

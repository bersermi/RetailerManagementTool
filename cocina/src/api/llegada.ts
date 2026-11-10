// ============================================================================
// A QUEUED SEND THAT LANDED, DRAWN INTO THE CACHED READ BEFORE IT LEAVES THE
// QUEUE. Plan task `10.5b-iv-b`. Called by the drain through `@/lib/ColaProvider`
// (`setAlLlegar`); `@/api/cola`'s drain awaits it, then removes the send.
//
// ⚠️⚠️ A READ ALREADY IN FLIGHT IS CANCELLED FIRST (the review of `10.5b-iv-b`):
// `setQueryData` is a manual write, and a fetch that started before the send
// landed still writes its answer after it — the list as it was BEFORE the
// handover. With the send gone from the queue nothing would lay it over that
// list, so the order would read *por entregar* again, and with the signal lost
// before the drain's re-read that wrong list would be saved and survive a
// restart. TanStack's `cancelQueries` reverts such a fetch (5.102.8's
// `onCancel`), and the drain's end re-reads (`@/lib/ColaProvider`'s `onDrain`).
//
// ⚠️ EACH READ KEEPS ITS AGE (`updatedAt`): a manual write is stamped *now*, and
// *Sin señal. Lo que ves se leyó a las …* reads that stamp — a handover landing
// at 14:00 would have said her orders were read at 14:00 when they were read at
// 13:05, and *Ese código no está en tus apartados de las 14:00* would have lied.
//
// It talks to nothing but the cache it is handed; `test/llegada.test.ts` runs it
// against a real TanStack client with a read in flight.
// ============================================================================

import type { QueryClient } from '@tanstack/react-query';

import { apartadosKey, type Pulgar, type Reserva, type SobreElVecino } from '@/api/apartados';
import { reservasConCola, vecinosConCola, type Envio } from '@/api/cola';
import { unir } from '@/lib/apartados';

/** `rateNeighbour`'s answer, read by `@/api/calls` into a `Pulgar`. */
function esPulgar(value: unknown): value is Pulgar {
  return typeof value === 'object' && value !== null && typeof (value as Pulgar).arriba === 'boolean' && (value as Pulgar).dadoEn instanceof Date;
}

export async function dibujarLlegada(client: QueryClient, envio: Envio, respuesta: unknown): Promise<void> {
  await client.cancelQueries({ queryKey: apartadosKey(envio.usuario, envio.cocina) });
  const clave = (lectura: string) => apartadosKey(envio.usuario, envio.cocina, lectura);
  const suEdad = (lectura: string) => ({ updatedAt: client.getQueryState(clave(lectura))?.dataUpdatedAt });
  for (const lectura of ['hoy', 'antes']) {
    client.setQueryData<readonly Reserva[]>(
      clave(lectura),
      (reservas) => (reservas === undefined ? undefined : reservasConCola(reservas, [envio])),
      suEdad(lectura),
    );
  }
  const reservas = unir(client.getQueryData<readonly Reserva[]>(clave('antes')) ?? [], client.getQueryData<readonly Reserva[]>(clave('hoy')) ?? []);
  client.setQueryData<Readonly<Record<string, SobreElVecino>>>(
    clave('vecinos'),
    (vecinos) => {
      if (vecinos === undefined) return undefined;
      const dibujado = vecinosConCola(vecinos, [envio], reservas);
      // The thumb the database kept (`rateNeighbour`'s answer) — its moment the database's, clamped.
      if (envio.tipo !== 'pulgar' || !esPulgar(respuesta)) return dibujado;
      return { ...dibujado, [envio.reserva]: { vecino: dibujado[envio.reserva]?.vecino ?? null, pulgar: respuesta, calificarHasta: null } };
    },
    suEdad('vecinos'),
  );
}

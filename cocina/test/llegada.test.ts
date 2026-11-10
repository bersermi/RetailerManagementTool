import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { apartadosKey, type Reserva, type SobreElVecino } from '@/api/apartados';
import type { Envio } from '@/api/cola';
import { dibujarLlegada } from '@/api/llegada';

// ============================================================================
// A LANDED SEND, DRAWN INTO THE CACHED READ — against a real TanStack client. Plan task
// `10.5b-iv-b`, and two defects its review found (`@/api/llegada`):
//   - a read IN FLIGHT when the send landed wrote the list as it was before the handover
//     over the drawn one — the order back to *por entregar*, saved that way if the signal
//     dropped before the drain's re-read;
//   - the drawing stamped each read *now*, so *Sin señal. Lo que ves se leyó a las …*
//     said her orders were read when a send landed.
// ============================================================================

const T = (min: number) => new Date(Date.UTC(2026, 10, 10, 20, 0) + min * 60_000);

function reserva(id: string, extra: Partial<Reserva> = {}): Reserva {
  return {
    id,
    ofertaId: 'o1',
    codigo: '347',
    dia: '2026-11-10',
    hora: T(30),
    guardadaHasta: T(90),
    creadaEn: T(-60),
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

const ana: SobreElVecino = { vecino: { nombre: 'Ana R.', calificacion: null }, pulgar: null, calificarHasta: null };
const entrega: Envio = { tipo: 'entrega', usuario: 'u1', cocina: 'k1', reserva: 'r1', en: T(10).toISOString(), version: 1 };
const key = (lectura: string) => apartadosKey('u1', 'k1', lectura);

function cliente() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  client.setQueryData(key('hoy'), [reserva('r1')], { updatedAt: T(0).getTime() });
  client.setQueryData(key('antes'), [], { updatedAt: T(0).getTime() });
  client.setQueryData(key('vecinos'), { r1: ana }, { updatedAt: T(0).getTime() });
  return client;
}

describe('a landed send, drawn into the cached read', () => {
  it('⚠️ a read in flight with the list from before the handover is cancelled, and never written over it', async () => {
    const client = cliente();
    let answer: (v: Reserva[]) => void = () => {};
    // The read that started before the send landed: it will answer with the order still pending.
    const observer = new QueryObserver(client, { queryKey: key('hoy'), queryFn: () => new Promise<Reserva[]>((r) => (answer = r)) });
    const unsubscribe = observer.subscribe(() => {});
    void observer.refetch();
    expect(client.getQueryState(key('hoy'))?.fetchStatus).toBe('fetching');

    await dibujarLlegada(client, entrega, 'recogido');
    answer([reserva('r1')]);
    await new Promise((r) => setTimeout(r, 0));

    const [r] = client.getQueryData<Reserva[]>(key('hoy')) as Reserva[];
    expect(r.entregadaEn).toEqual(T(10));
    unsubscribe();
  });

  it('and without the cancel, the same race writes the order back to por entregar (the falsifier of the test above)', async () => {
    const client = cliente();
    let answer: (v: Reserva[]) => void = () => {};
    const observer = new QueryObserver(client, { queryKey: key('hoy'), queryFn: () => new Promise<Reserva[]>((r) => (answer = r)) });
    const unsubscribe = observer.subscribe(() => {});
    void observer.refetch();
    client.setQueryData<Reserva[]>(key('hoy'), (rs) => rs?.map((x) => ({ ...x, entregadaEn: T(10) })));
    answer([reserva('r1')]);
    await new Promise((r) => setTimeout(r, 0));
    expect((client.getQueryData<Reserva[]>(key('hoy')) as Reserva[])[0].entregadaEn).toBeNull();
    unsubscribe();
  });

  it('⚠️ each read keeps its age — what Sin señal says is when her orders were read, not when a send landed', async () => {
    const client = cliente();
    await dibujarLlegada(client, entrega, 'recogido');
    expect(client.getQueryState(key('hoy'))?.dataUpdatedAt).toBe(T(0).getTime());
    expect(client.getQueryState(key('antes'))?.dataUpdatedAt).toBe(T(0).getTime());
    expect(client.getQueryState(key('vecinos'))?.dataUpdatedAt).toBe(T(0).getTime());
  });

  it('a landed handover opens her thumb; a landed thumb is the one the database kept', async () => {
    const client = cliente();
    await dibujarLlegada(client, entrega, 'recogido');
    expect(client.getQueryData<Record<string, SobreElVecino>>(key('vecinos'))?.r1).toEqual({ ...ana, calificarHasta: new Date(T(90).getTime() + 24 * 60 * 60_000) });
    const kept = { arriba: true, etiquetas: ['amable' as const], dadoEn: T(11), cambiarHasta: T(11 + 1440), reloj: false };
    await dibujarLlegada(client, { tipo: 'pulgar', usuario: 'u1', cocina: 'k1', reserva: 'r1', en: T(11).toISOString(), version: 1, arriba: true, etiquetas: ['amable'] }, kept);
    expect(client.getQueryData<Record<string, SobreElVecino>>(key('vecinos'))?.r1).toEqual({ vecino: ana.vecino, pulgar: kept, calificarHasta: null });
  });
});

// ============================================================================
// *APARTADOS* — WHAT HER TICKET AND THE TAB SAY, PURE. Plan task `10.5b-iii-a`, as the
// family-shell page draws stage 2's ticket (the owner's rulings of 2026-11-05: calls 11,
// 12, 15) and `10.5b-ii`'s final design (*La cocina canceló tu apartado*, read though
// nothing sends it yet). `test/apartados.test.ts` pins every case in Mexico City's zone.
//
// ⚠️ THE MOMENTS ARE THE DATABASE'S: `my_reservations` sends her hour, until when it is
// held and `cancel_until` (an hour before her hour, `0079`) — so *Cancelar* turns into *No
// voy a poder ir* at the database's minute, never one counted again here. The state is
// `reservation_state`'s (`0079`, `0080`); a window that ends while she looks moves her
// ticket to *Anteriores* when the list is read again (the hook reads it every minute while
// one is pending).
// ============================================================================

import type { Apartado } from '@/api/apartados';
import type { Kitchen } from '@/api/cocinas';
import { EMPTY_PAGE } from '@/api/pagina';
import { formatMXN } from '@/format/mxn';
import { preguntaDeSuDireccion } from '@/lib/google';
import { DIRECCIONES_URL, comoLlegarUrl, consulta } from '@/lib/paginas';
import { clockOf, dayOf, daysFrom } from '@/lib/ventana';
import { ES } from '@/strings';

/** The tab, in three parts: her tickets, a cancel by the kitchen while its window is open, and the rest. */
export interface Secciones {
  /** Still to collect, the soonest first — each a whole ticket. */
  readonly pendientes: readonly Apartado[];
  /** Cancelled by the kitchen while its window is still open: she must not walk over for nothing. */
  readonly avisos: readonly Apartado[];
  /** Everything else of her last 30 days, the newest first. */
  readonly anteriores: readonly Apartado[];
}

export function seccionesDe(apartados: readonly Apartado[], ahora: Date): Secciones {
  const t = ahora.getTime();
  const pendientes = apartados.filter((a) => a.estado === 'apartado').sort((a, b) => a.hora.getTime() - b.hora.getTime());
  const avisos = apartados.filter((a) => a.estado === 'cancelado_cocina' && a.guardadaHasta.getTime() > t);
  const anteriores = apartados
    .filter((a) => a.estado !== 'apartado' && !avisos.includes(a))
    .sort((a, b) => b.hora.getTime() - a.hora.getTime());
  return { pendientes, avisos, anteriores };
}

/** Whether any reservation is still to collect — the tab then reads the list again every minute. */
export function hayPendientes(apartados: readonly Apartado[] | undefined): boolean {
  return (apartados ?? []).some((a) => a.estado === 'apartado');
}

/** *a las 17:45* — and *a la 1:00*. */
export function aLasDe(hora: Date): string {
  return ES.apartados.aLas(clockOf(hora));
}

/** *Pasa a las 17:45*, *Pasa mañana a las 9:00*, *Pasa el Lun 27 a las 9:00*. */
export function pasaTexto(hora: Date, ahora: Date): string {
  const dias = daysFrom(ahora, hora);
  const aLas = aLasDe(hora);
  if (dias === 0) return ES.apartados.pasa(aLas);
  if (dias === 1) return ES.apartados.pasa(ES.apartados.manana(aLas));
  return ES.apartados.pasa(ES.apartados.elDia(dayOf(hora, ahora), aLas));
}

/** Beside her hour: how long until it, or *ya está lista* once it has come. */
export function faltaTexto(hora: Date, ahora: Date): string {
  const minutos = Math.ceil((hora.getTime() - ahora.getTime()) / 60_000);
  if (minutos <= 0) return ES.apartados.yaEstaLista;
  if (minutos < 60) return ES.apartados.faltanMin(minutos);
  return ES.apartados.faltanHoras(Math.floor(minutos / 60), minutos % 60);
}

/** Under her hour: how it is handed over, and until when the kitchen keeps it. */
export function notaTexto(apartado: Apartado): string {
  const hasta = clockOf(apartado.guardadaHasta);
  return apartado.comer === 'aqui' ? ES.apartados.notaAqui(hasta) : ES.apartados.notaLlevar(hasta);
}

/** What to pay and how — the method she picked, never an account or an amount paid. */
export function pagoTexto(apartado: Apartado): string {
  const total = formatMXN(apartado.totalCentavos);
  if (apartado.pago === 'tarjeta') return ES.apartados.paga.tarjeta(total);
  if (apartado.pago === 'transferencia') return ES.apartados.paga.transferencia(total);
  return apartado.comer === 'aqui' ? ES.apartados.paga.efectivoAqui(total) : ES.apartados.paga.efectivoLlevar(total);
}

/** *Comida corrida · 1 · para llevar* — what she reserved, and how it is handed over. */
export function platoTexto(apartado: Apartado): string {
  const comer = ES.apartados.comer[apartado.comer];
  return apartado.platos.map((plato) => ES.apartados.plato(plato.nombre, plato.cantidad, comer)).join(' · ');
}

/** *Cancelar* while it is before `cancel_until`; after it, *No voy a poder ir*. */
export function puedeCancelar(apartado: Apartado, ahora: Date): boolean {
  return ahora.getTime() < apartado.cancelarHasta.getTime();
}

export function cambioDePlanesTexto(apartado: Apartado, ahora: Date): string {
  return puedeCancelar(apartado, ahora) ? ES.apartados.cancelarHasta(clockOf(apartado.cancelarHasta)) : ES.apartados.noVoy;
}

/** A past reservation's line: *Hoy 17:45 · Entregado*. */
export function anteriorTexto(apartado: Apartado, ahora: Date): string {
  return `${ES.fechas.momento(dayOf(apartado.hora, ahora), clockOf(apartado.hora))} · ${ES.apartados.estado[apartado.estado]}`;
}

/** Why the kitchen cancelled, when it said; `null` for *otro* or none. */
export function razonTexto(apartado: Apartado): string | null {
  if (apartado.razon === null) return null;
  const texto = ES.apartados.razon[apartado.razon];
  return texto === '' ? null : texto;
}

/**
 * *Cómo llegar* from her ticket: the kitchen as the door sends it while it does — her own
 * pin then wins (`comoLlegarUrl`) — else her address as she wrote it. ⚠️ `my_reservations`
 * never sends a point, and Google's copy is never a destination.
 */
export function comoLlegarDelApartado(apartado: Apartado, puerta: Kitchen | undefined): string | null {
  if (puerta !== undefined) return comoLlegarUrl(puerta);
  const destino = preguntaDeSuDireccion(apartado.cocina.direccion);
  return destino === null ? null : `${DIRECCIONES_URL}?${consulta({ api: '1', destination: destino })}`;
}

/**
 * Her reservation's kitchen in the shape the circle draws (`@/ui/Circulo`): the door's own
 * while it sends her, else what `my_reservations` sent — her name, trade, address and page.
 */
export function cocinaDe(apartado: Apartado, puerta: Kitchen | undefined): Kitchen {
  if (puerta !== undefined) return puerta;
  const { cocina } = apartado;
  return {
    id: cocina.id,
    name: cocina.nombre,
    giro: cocina.giro,
    address: cocina.direccion,
    directions: cocina.indicaciones,
    point: null,
    page: { ...EMPTY_PAGE, color: cocina.pagina.color, logo: cocina.pagina.logo },
    offers: [],
    summary: { weekdays: [0, 0, 0, 0, 0, 0, 0], usualHour: null, lastDay: null, repeats: [] },
    pagos: ['efectivo'],
    comeres: ['llevar'],
    minScore: null,
  };
}

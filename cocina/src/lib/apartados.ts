// ============================================================================
// *APARTADOS* — WHAT EACH ORDER SAYS AND WHERE IT GOES, PURE. Plan task `10.5b-iv-a`,
// the owner's final design of 2026-11-10 (the page *Names, Records and Stars*, version
// 5, its table of states) and slice 3's handover (the family-shell page, stage 2):
//   - EACH STATE ONE COLOUR AND ONE ACTION (`marcaDe`): green *Entregar* for what to do
//     now — its hour turning rust 15 minutes before; rust *Calificar* for a plate handed
//     over and not yet rated; rust *No se presentó* and green *Sí pasó* for a plate that
//     *se liberó*; grey for what is over;
//   - *HOY* (`deHoy`): what is still to hand over, her hour first, then what she handed
//     over today and has not rated; *HISTORIAL* (`historial`): what waits for her thumb,
//     the soonest to close first, then *Anteriores*, the newest first; the count on the
//     tab is what waits for her thumb (`porCalificar`);
//   - *HOY*'S HUB: *Lo que sigue* (`loQueSigue`) and *Quedan 4 de 8* (`tomadosDe`);
//   - *ENTREGAR UN APARTADO*: the code typed, found among today's (`buscarCodigo`).
//
// ⚠️ NOTHING HERE IS READ BUT WHAT `@/api/apartados` READ: her kitchen's reservations and
// what `reservation_neighbours` says of each. The state is the database's definition,
// repeated (`estadoDe`); `test/apartados.test.ts` pins every rule against a calendar in
// Mexico City's zone.
// ============================================================================

import {
  DIA_PARA_CALIFICAR_MS,
  diaTexto,
  estadoDe,
  tomado,
  type Estado,
  type Pulgar,
  type Reserva,
  type SobreElVecino,
  type Vecino,
} from '@/api/apartados';
import { formatMXN } from '@/format/mxn';
import { clockOf, dayOf, momentOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { PALETTE } from '@/theme/palette';

/** How long before her hour the hour turns rust — the final design's *en 10 min*. */
export const PRONTO_MS = 15 * 60_000;

/** One order as the screens draw it: the reservation and what is said of who reserved it. */
export interface Orden extends Reserva {
  readonly estado: Estado;
  readonly vecino: Vecino | null;
  readonly pulgar: Pulgar | null;
  /** Until when a first thumb may be given, while it may — the database's moment. */
  readonly calificarHasta: Date | null;
  /** When it was handed over — by her, or by the neighbour's *Ya lo tengo*. */
  readonly entregaEn: Date | null;
}

/**
 * The orders, each with its state now and what the database says of its neighbour. ⚠️ THE DAY AFTER
 * THE WINDOW IS THE CLOCK'S, HERE TOO (`reservation_neighbours`, `0080`), so a line read hours ago
 * never outlives it (the review of `10.5b-iv-a`): from 24 hours after the window her name is gone,
 * and a plate that *se liberó* with no thumb carries the clock's *No se presentó*.
 */
export function ordenesDe(reservas: readonly Reserva[], vecinos: Readonly<Record<string, SobreElVecino>>, now: Date): Orden[] {
  return reservas.map((r) => {
    const sobre = vecinos[r.id];
    const estado = estadoDe(r, now);
    const vence = new Date(r.guardadaHasta.getTime() + DIA_PARA_CALIFICAR_MS);
    const cerrada = now.getTime() >= vence.getTime();
    const reloj: Pulgar | null =
      estado === 'liberado' && cerrada ? { arriba: false, etiquetas: ['no_se_presento'], dadoEn: vence, cambiarHasta: null, reloj: true } : null;
    return {
      ...r,
      estado,
      vecino: cerrada ? null : (sobre?.vecino ?? null),
      pulgar: sobre?.pulgar ?? reloj,
      calificarHasta: sobre?.calificarHasta ?? null,
      entregaEn: r.entregadaEn ?? r.recogidaEn,
    };
  });
}

// ----------------------------------------------------------------------------
// Each state: its mark and its action (the final design's table)
// ----------------------------------------------------------------------------

/**
 * What an order's card shows. ⚠️ THE ACTION GOES WITH THE MARK, never chosen beside it:
 *   porEntregar   green *Por entregar*, green *Entregar*
 *   pronto        the same, its hour rust — 15 minutes or less before it, or after
 *   porCalificar  rust *Por calificar* and a dot, rust *Calificar*
 *   seLibero      grey *Se liberó* and a dot, rust *No se presentó*, green *Sí pasó*
 *   entregado     *Entregado* and its thumb, or none once its day to rate is over
 *   noSePresento  a plate that *se liberó* and was rated so — by her, or by the clock
 *   liberado      a plate that *se liberó* the database says nothing more of
 *   cancelo, noVa, canceladoCocina — grey, no action
 */
export type Marca =
  | 'porEntregar'
  | 'pronto'
  | 'porCalificar'
  | 'seLibero'
  | 'entregado'
  | 'noSePresento'
  | 'liberado'
  | 'cancelo'
  | 'noVa'
  | 'canceladoCocina';

/** Whether a first thumb may still be given — the database said until when, and it has not come. */
function abierta(orden: Orden, now: Date): boolean {
  return orden.pulgar === null && orden.calificarHasta !== null && now.getTime() <= orden.calificarHasta.getTime();
}

/**
 * ⚠️ SHE SWIPED *YA LO TENGO* BEFORE THE COUNTER RECORDED IT (`confirm_my_pickup` takes it while the plate
 * is held): to her kitchen the plate is still to hand over until its window ends — what to charge and
 * *Entregar* stay (the review of `10.5b-iv-a`). The database counts it collected either way.
 */
function marcadaSoloPorElla(orden: Orden, now: Date): boolean {
  return orden.estado === 'recogido' && orden.entregadaEn === null && now.getTime() < orden.guardadaHasta.getTime();
}

export function marcaDe(orden: Orden, now: Date): Marca {
  if (marcadaSoloPorElla(orden, now)) return orden.hora.getTime() - now.getTime() <= PRONTO_MS ? 'pronto' : 'porEntregar';
  switch (orden.estado) {
    case 'apartado':
      return orden.hora.getTime() - now.getTime() <= PRONTO_MS ? 'pronto' : 'porEntregar';
    case 'recogido':
      return abierta(orden, now) ? 'porCalificar' : 'entregado';
    case 'liberado':
      if (orden.pulgar !== null) return 'noSePresento';
      return abierta(orden, now) ? 'seLibero' : 'liberado';
    case 'cancelado':
      return 'cancelo';
    case 'no_va':
      return 'noVa';
    case 'cancelado_cocina':
      return 'canceladoCocina';
  }
}

/** The marks that wait for her thumb — a dot on the card, and the tab's count. */
export const ESPERAN_PULGAR: readonly Marca[] = ['porCalificar', 'seLibero'];

/** The marks still to hand over. */
export const POR_ENTREGAR: readonly Marca[] = ['porEntregar', 'pronto'];

// ----------------------------------------------------------------------------
// Where each order goes
// ----------------------------------------------------------------------------

const porHora = (a: Orden, b: Orden) => a.hora.getTime() - b.hora.getTime() || a.id.localeCompare(b.id);

/** Whether a moment falls on the phone's today. */
function esHoy(at: Date | null, now: Date): boolean {
  return at !== null && diaTexto(at) === diaTexto(now);
}

/**
 * *Apartados · Hoy*: what is still to hand over, her hour first; then what she handed over
 * today and has not rated, the latest last. Nothing else: a plate that *se liberó* waits in
 * *Historial*, first.
 */
export function deHoy(ordenes: readonly Orden[], now: Date): Orden[] {
  const pendientes = ordenes.filter((o) => POR_ENTREGAR.includes(marcaDe(o, now))).sort(porHora);
  const hoyPorCalificar = ordenes
    .filter((o) => marcaDe(o, now) === 'porCalificar' && esHoy(o.entregaEn, now))
    .sort((a, b) => (a.entregaEn?.getTime() ?? 0) - (b.entregaEn?.getTime() ?? 0));
  return [...pendientes, ...hoyPorCalificar];
}

/** *Apartados · Historial*: what waits for her thumb, the soonest to close first; then *Anteriores*, the newest first. */
export interface Historial {
  readonly porCalificar: readonly Orden[];
  readonly anteriores: readonly Orden[];
}

export function historial(ordenes: readonly Orden[], now: Date): Historial {
  const esperan = ordenes
    .filter((o) => ESPERAN_PULGAR.includes(marcaDe(o, now)))
    .sort((a, b) => (a.calificarHasta?.getTime() ?? 0) - (b.calificarHasta?.getTime() ?? 0) || porHora(a, b));
  const anteriores = ordenes
    .filter((o) => {
      const marca = marcaDe(o, now);
      return !ESPERAN_PULGAR.includes(marca) && !POR_ENTREGAR.includes(marca);
    })
    .sort((a, b) => -porHora(a, b));
  return { porCalificar: esperan, anteriores };
}

/** How many wait for her thumb — the count on the tab and on *Historial*. */
export function porCalificar(ordenes: readonly Orden[], now: Date): number {
  return ordenes.filter((o) => ESPERAN_PULGAR.includes(marcaDe(o, now))).length;
}

/** How many are still to hand over. */
export function porEntregar(ordenes: readonly Orden[], now: Date): number {
  return ordenes.filter((o) => POR_ENTREGAR.includes(marcaDe(o, now))).length;
}

/** *Lo que sigue* on *Hoy*: the next order to hand over, and how many more after it. `null` when none. */
export function loQueSigue(ordenes: readonly Orden[], now: Date): { readonly siguiente: Orden; readonly mas: number } | null {
  const pendientes = ordenes.filter((o) => POR_ENTREGAR.includes(marcaDe(o, now))).sort(porHora);
  const [siguiente, ...resto] = pendientes;
  return siguiente === undefined ? null : { siguiente, mas: resto.length };
}

/** How many she handed over today — *Faltan 1 h 40 min · 1 entregado*. */
export function entregadosHoy(ordenes: readonly Orden[], now: Date): number {
  return ordenes.filter((o) => o.estado === 'recogido' && esHoy(o.entregaEn, now)).length;
}

/** How many minutes until her hour: positive ahead, negative after — the card's *en 10 min*. */
export function minutosPara(hora: Date, now: Date): number {
  return Math.round((hora.getTime() - now.getTime()) / 60_000);
}

// ----------------------------------------------------------------------------
// *Quedan 4 de 8* — what is taken of each of today's dishes
// ----------------------------------------------------------------------------

/** The key of one dish of one offer: the offer's id and the dish's line in it. */
export function claveDePlato(ofertaId: string, lineaDeOferta: number): string {
  return `${ofertaId}:${lineaDeOferta}`;
}

/**
 * Every plate taken, by dish (`listing_line_taken`'s definition, `tomado`): reserved and
 * not given back. What is left is what she offers less this — never below zero, though
 * the database never lets it be.
 */
export function tomadosDe(reservas: readonly Reserva[]): ReadonlyMap<string, number> {
  const tomados = new Map<string, number>();
  for (const r of reservas) {
    if (!tomado(r)) continue;
    for (const p of r.platos) {
      const clave = claveDePlato(r.ofertaId, p.lineaDeOferta);
      tomados.set(clave, (tomados.get(clave) ?? 0) + p.cantidad);
    }
  }
  return tomados;
}

// ----------------------------------------------------------------------------
// *Entregar un apartado* — the code typed
// ----------------------------------------------------------------------------

/** How many digits a code has. */
export const DIGITOS = 3;

/**
 * The order with that code among TODAY's — the day she collects, the day a code is
 * unique on (`reservation_code_unique`) — whatever its state: ⚠️ *ENTREGAR* IS ALWAYS
 * RECORDED (ruled 2026-11-10), so a cancelled order or one whose window ended is found
 * too, and the screen says so. `null` when today has no such code.
 */
export function buscarCodigo(ordenes: readonly Orden[], codigo: string, now: Date): Orden | null {
  if (codigo.length !== DIGITOS) return null;
  const hoy = diaTexto(now);
  // ⚠️ TODAY'S, OR ONE STILL TO HAND OVER ON ANOTHER DAY (the review of `10.5b-iv-a`): a window that crosses
  // midnight puts an order said at 23:55 on tomorrow's day, and one at 00:10 on yesterday's. Codes are
  // unique per day only, so the nearest to now wins.
  const candidatas = ordenes.filter(
    (o) => o.codigo === codigo && (o.dia === hoy || POR_ENTREGAR.includes(marcaDe(o, now))),
  );
  candidatas.sort((a, b) => Math.abs(a.hora.getTime() - now.getTime()) - Math.abs(b.hora.getTime() - now.getTime()));
  return candidatas[0] ?? null;
}

/** A key the keypad pressed, applied to what is typed: a digit while there is room, or *Borrar*. */
export function teclear(codigo: string, tecla: string): string {
  if (tecla === 'borrar') return codigo.slice(0, -1);
  if (!/^\d$/.test(tecla) || codigo.length >= DIGITOS) return codigo;
  return codigo + tecla;
}

/** Her score as the card draws it: the share of thumbs up, ROUNDED DOWN, so it never reads above what it is. */
export function porcentajeDe(calificacion: { readonly up: number; readonly total: number }): number {
  return calificacion.total <= 0 ? 0 : Math.floor((calificacion.up * 100) / calificacion.total);
}

/**
 * An order with its handover recorded on this phone, before the re-read — so the card moves
 * the moment she taps (`useEntregar`). The same moment the database keeps, clamped as it
 * clamps: never before the order was made.
 */
export function conEntrega(reservas: readonly Reserva[] | undefined, id: string, at: Date): Reserva[] | undefined {
  if (reservas === undefined) return undefined;
  return reservas.map((r) =>
    r.id !== id || r.entregadaEn !== null
      ? r
      : { ...r, entregadaEn: new Date(Math.max(at.getTime(), r.creadaEn.getTime())) },
  );
}

// ----------------------------------------------------------------------------
// The words and colours of an order — what every card, row and screen composes
// ----------------------------------------------------------------------------

/** What to prepare: *1 × Mole con arroz*, each dish of the order. */
export function queTexto(orden: Reserva): string {
  return orden.platos.map((p) => ES.apartados.platillo(p.cantidad, p.nombre)).join(', ');
}

/** What to charge, short: *Cobra $65 en efectivo*. */
export function cobroCortoTexto(orden: Reserva): string {
  return ES.apartados.cobraCorto[orden.pago](formatMXN(orden.cobroCentavos));
}

/** What to charge, at the counter: *Cobra $65 con tu terminal*. */
export function cobroLargoTexto(orden: Reserva): string {
  return ES.entregar.cobraLargo[orden.pago](formatMXN(orden.cobroCentavos));
}

/** A card's second line: *Empácala · Cobra $65 en efectivo*. */
export function tarjetaTexto(orden: Reserva): string {
  return ES.apartados.junto(ES.apartados.comerCorto[orden.comer], cobroCortoTexto(orden));
}

/** Who reserved: *Ana R.* — or *Sin nombre*. */
export function nombreTexto(vecino: Vecino): string {
  return vecino.nombre ?? ES.apartados.sinNombre;
}

/** Her score: *👍 92%*, or *Nueva en Itacate* before her third thumb. */
export function calificacionTexto(vecino: Vecino): string {
  return vecino.calificacion === null ? ES.apartados.nueva : ES.apartados.porcentaje(porcentajeDe(vecino.calificacion));
}

/** Beside her hour once it is 15 minutes away or less: *en 10 min*; else `null`. */
export function prontoTexto(orden: Orden, now: Date): string | null {
  return marcaDe(orden, now) === 'pronto' ? ES.apartados.en(minutosPara(orden.hora, now)) : null;
}

/** A moment in a sentence: *las 16:00* today, *mañana a las 16:00* another day — never *hoy a las*. */
export function cuandoTexto(at: Date, now: Date): string {
  return ES.apartados.cuando(diaTexto(at) === diaTexto(now) ? null : dayOf(at, now).toLowerCase(), clockOf(at));
}

/** After the handover, on its screen: *Cobraste $65 en efectivo · 14:31*, or *La serviste a las 14:31*. */
export function cobrasteTexto(orden: Orden): string | null {
  if (orden.entregadaEn === null) return null;
  const hora = clockOf(orden.entregadaEn);
  return orden.comer === 'aqui' ? ES.entregar.laServiste(hora) : ES.entregar.cobraste[orden.pago](formatMXN(orden.cobroCentavos), hora);
}

/** A card's line under what to prepare: how and what to charge while it is to hand over; else what became of it. */
export function estadoTexto(orden: Orden, now: Date): string {
  const marca = marcaDe(orden, now);
  if ((marca === 'porCalificar' || marca === 'entregado') && orden.entregaEn !== null) {
    return ES.apartados.entregadoA(clockOf(orden.entregaEn));
  }
  if (marca === 'seLibero' || marca === 'liberado' || marca === 'noSePresento') {
    return ES.apartados.noPaso(dayOf(orden.hora, now), clockOf(orden.hora));
  }
  if (marca === 'cancelo' || marca === 'noVa' || marca === 'canceladoCocina') {
    return ES.apartados.fila([dayOf(orden.hora, now), clockOf(orden.hora)]);
  }
  return tarjetaTexto(orden);
}

/** Her hour on a card: *14:30* today; *Mañana 13:00* another day — a window across midnight, or tomorrow's offer. */
export function horaTexto(hora: Date, now: Date): string {
  return diaTexto(hora) === diaTexto(now) ? clockOf(hora) : momentOf(hora, now);
}

/** *Pasa a las 14:30*, or *Pasa mañana a las 13:00*. */
export function pasaTexto(hora: Date, now: Date): string {
  return diaTexto(hora) === diaTexto(now) ? ES.apartado.pasa(clockOf(hora)) : ES.apartado.pasaDia(dayOf(hora, now).toLowerCase(), clockOf(hora));
}

/**
 * What the order came to, on its own screen: *Cobra $65 en efectivo* while it is to hand over;
 * *Cobraste $65 en efectivo · 14:31* once the counter handed it over; else *Total $65 · efectivo* —
 * never *Cobra* under an order that is over (the review of `10.5b-iv-a`).
 */
export function montoTexto(orden: Orden, now: Date): string {
  if (POR_ENTREGAR.includes(marcaDe(orden, now))) return cobroCortoTexto(orden);
  if (orden.entregadaEn !== null) return cobrasteTexto(orden) ?? cobroCortoTexto(orden);
  return ES.apartado.total(formatMXN(orden.cobroCentavos), ES.loQueSigue.pago[orden.pago]);
}

/** Under a plate that *se liberó*: until when the clock waits for her thumb. `null` when it no longer does. */
export function siNoLoCalificasTexto(orden: Orden, now: Date): string | null {
  if (marcaDe(orden, now) !== 'seLibero' || orden.calificarHasta === null) return null;
  return ES.apartados.siNoLoCalificas(cuandoTexto(orden.calificarHasta, now));
}

/** A mark's word — *Entregado · 👍* once a thumb is on it. */
export function marcaTexto(orden: Orden, now: Date): string {
  const marca = marcaDe(orden, now);
  const palabra = ES.apartados.marcas[marca];
  if (marca === 'entregado' && orden.pulgar !== null) {
    return ES.apartados.junto(palabra, orden.pulgar.arriba ? ES.apartados.pulgares.arriba : ES.apartados.pulgares.abajo);
  }
  return palabra;
}

/** A past order's line: *Ayer · 1 × Mole con arroz · Llegó a tiempo* — never the neighbour's name. */
export function filaTexto(orden: Orden, now: Date): string {
  const etiquetas = orden.pulgar?.etiquetas.filter((e) => e !== 'no_se_presento').map((e) => ES.pulgar.etiquetas[e]) ?? [];
  return ES.apartados.fila([dayOf(orden.hora, now), queTexto(orden), ...etiquetas]);
}

/** Each mark's colours — its ground and its ink — the final design's `.st-*`. */
export function coloresDe(marca: Marca): { readonly fondo: string; readonly tinta: string } {
  switch (marca) {
    case 'porEntregar':
    case 'pronto':
      return { fondo: PALETTE.accionSuave, tinta: PALETTE.accion };
    case 'porCalificar':
      return { fondo: PALETTE.marcaSuave, tinta: PALETTE.marca };
    case 'entregado':
    case 'noSePresento':
      return { fondo: PALETTE.banda, tinta: PALETTE.tinta };
    case 'canceladoCocina':
      return { fondo: PALETTE.errorSuave, tinta: PALETTE.error };
    case 'seLibero':
    case 'liberado':
    case 'cancelo':
    case 'noVa':
      return { fondo: PALETTE.linea, tinta: PALETTE.tintaApagada };
  }
}

/**
 * ⚠️ *SÍ PASÓ* CLEARS A *NO SE PRESENTÓ* THUMB, on the phone as in the database (`0080`'s
 * `hand_over_reservation`: a handover recorded after a no-show thumb deletes it, and the order
 * waits for a thumb again) — drawn at once with the handover, so her thumb's panel never opens on
 * the thumb the database just deleted (found on the emulator).
 */
export function sinNoSePresento(vecinos: Readonly<Record<string, SobreElVecino>>, id: string): Record<string, SobreElVecino> {
  const sobre = vecinos[id];
  if (sobre === undefined || sobre.pulgar === null || !sobre.pulgar.etiquetas.includes('no_se_presento')) return { ...vecinos };
  return { ...vecinos, [id]: { ...sobre, pulgar: null } };
}

/**
 * ⚠️ WHETHER TODAY'S ORDERS CAN CHANGE WITHOUT HER — and so whether they are read every minute
 * (`useApartados`): an offer of hers not taken back and not over (a neighbour may reserve, even
 * before its window opens), or an order still pending (she may cancel). Neither, and nothing
 * arrives until she publishes again, which reads them again itself.
 */
export function vivo(
  listings: readonly { readonly end: Date; readonly withdrawnAt: Date | null }[] | undefined,
  reservasDeHoy: readonly Reserva[] | undefined,
  now: Date,
): boolean {
  const ofertaViva = (listings ?? []).some((l) => l.withdrawnAt === null && l.end.getTime() > now.getTime());
  const pendiente = (reservasDeHoy ?? []).some((r) => estadoDe(r, now) === 'apartado');
  return ofertaViva || pendiente;
}

/**
 * Today's orders as one value — each id and its state — so who reserved each is read again exactly
 * when one arrives, is handed over, is cancelled or its window ends (`useApartados`' `vecinos`).
 */
export function firmaDeHoy(reservas: readonly Reserva[], now: Date): string {
  return reservas
    .map((r) => `${r.id}:${estadoDe(r, now)}`)
    .sort()
    .join(',');
}

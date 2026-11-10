// ============================================================================
// *APARTAR* — WHAT THE DISH'S FOOT AND THE SHEET SAY AND OFFER, PURE. Plan task
// `10.5b-iii-a`, slice 3's design as ruled on 2026-11-05 (the family-shell page, stage 2:
// calls 11, 12, 26–28) and `10.5b-ii`'s final design of 2026-11-10 (the page *Names,
// Records and Stars*, version 5). `test/apartar.test.ts` pins every case.
//
// ⚠️ EVERY RULE HERE IS ONE THE DATABASE ALSO ENFORCES (`reserve_plate`, `0079` and
// `0080`), worked out again so the phone offers only what will be taken — never instead
// of the database, which answers last:
//   HER HOUR      a quarter hour, from the next one until 15 minutes before the window
//                 ends, inside the window (call 11; `date_bin('15 minutes', …)`);
//   HOW SHE EATS  among the dish's ways, *para llevar* first (calls 26, 27); a surprise
//                 bag is always *para llevar* (the line's own check);
//   HOW SHE PAYS  among the kitchen's, cash always and first (call 12);
//   THE TOTAL     the dish, and the *desechable* only when she takes it away (the ruling
//                 that replaced call 28);
//   WHO MAY       the kitchen's setting by score, strictly more, on the exact share, and
//                 fewer than three thumbs always pass (`0080`); how many she may hold —
//                 one until her first pickup, then three — is the database's to count
//                 (`my_standing`'s `limit`).
// ============================================================================

import type { Apartado, Posicion } from '@/api/apartados';
import type { Comer, Dish, Kitchen, Offer, Pago } from '@/api/cocinas';

/** Her hour is a quarter hour (`0079`, call 11). */
export const PASO_MS = 15 * 60_000;
/** …until this long before the window ends. */
export const ANTES_DEL_FIN_MS = 15 * 60_000;
/** A score is shown, and a kitchen's setting applies, from this many thumbs (`0080`). */
export const DESDE_CALIFICACIONES = 3;

/**
 * The hours she may pick: every quarter hour from the next one — never one already
 * gone — and from the window's start, to 15 minutes before it ends. Empty when the
 * window is too close to its end to reserve.
 */
export function horasDe(oferta: Offer, ahora: Date): Date[] {
  const desde = Math.max(ahora.getTime(), oferta.start.getTime());
  const primera = Math.ceil(desde / PASO_MS) * PASO_MS;
  const ultima = oferta.end.getTime() - ANTES_DEL_FIN_MS;
  const horas: Date[] = [];
  for (let t = primera; t <= ultima; t += PASO_MS) horas.push(new Date(t));
  return horas;
}

/** The ways this dish may be eaten, *para llevar* first — a dish that says neither is *para llevar*. */
export function comeresDe(platillo: Dish): Comer[] {
  const comeres: Comer[] = [];
  if (platillo.llevar) comeres.push('llevar');
  if (platillo.aqui) comeres.push('aqui');
  return comeres.length > 0 ? comeres : ['llevar'];
}

/** What she pays, as the sheet shows it before she reserves: the dish, and the *desechable* when she takes it away. */
export function totalDe(
  platillo: Dish,
  oferta: Offer,
  comer: Comer,
): { readonly platillo: number; readonly desechable: number | null; readonly total: number } {
  const desechable = comer === 'llevar' ? oferta.desechableCentavos : null;
  return { platillo: platillo.priceCentavos, desechable, total: platillo.priceCentavos + (desechable ?? 0) };
}

/**
 * Her score as she reads it — a whole per cent, ROUNDED DOWN, so a neighbour a kitchen
 * turns away never reads a number above its bar (*más de 80%* refuses 79.6%, which
 * reads 79%). `null` before her third thumb: *Nueva en Itacate*.
 */
export function porcentajeDe(calificacion: Posicion['calificacion']): number | null {
  if (calificacion === null || calificacion.total < DESDE_CALIFICACIONES) return null;
  return Math.floor((calificacion.up * 100) / calificacion.total);
}

/**
 * Whether this kitchen's setting turns her away: *más de* is strictly more, on the exact
 * share (`up × 100 > min × total`), and fewer than three thumbs always pass — the rule
 * `reserve_plate` refuses with `TD020`. `null` when she may reserve.
 */
export function porCalificacion(
  minScore: number | null,
  calificacion: Posicion['calificacion'],
): { readonly minimo: number; readonly suyo: number } | null {
  if (minScore === null || calificacion === null || calificacion.total < DESDE_CALIFICACIONES) return null;
  if (calificacion.up * 100 > minScore * calificacion.total) return null;
  return { minimo: minScore, suyo: porcentajeDe(calificacion) ?? 0 };
}

/**
 * Whether a reservation she holds is of this very dish: the same kitchen, the same
 * window's end (`held_until` is the offer's `pickup_end`), the same line. `0079`'s
 * `my_reservations` sends no offer id, and these three name one line of one offer.
 */
export function esDeEstePlatillo(apartado: Apartado, cocina: Kitchen, oferta: Offer, platillo: Dish): boolean {
  return (
    apartado.cocina.id === cocina.id &&
    apartado.guardadaHasta.getTime() === oferta.end.getTime() &&
    apartado.platos.some((plato) => plato.lineNo === platillo.lineNo && plato.nombre === platillo.name)
  );
}

/** What the dish page's foot shows. */
export type Pie =
  /** Her reservations or her standing are not read yet. */
  | { readonly kind: 'cargando' }
  /** She holds this very dish: her code is one tap away. */
  | { readonly kind: 'yaLoApartaste'; readonly apartado: Apartado }
  /** The kitchen's setting turns her away — said before she taps. */
  | { readonly kind: 'calificacion'; readonly minimo: number; readonly suyo: number }
  /** She holds as many as she may now. */
  | { readonly kind: 'limite'; readonly limite: number }
  /** Too close to the window's end for any hour. */
  | { readonly kind: 'sinHoras' }
  | { readonly kind: 'apartar' };

/** The foot, in the order she meets it: her own reservation first, then the kitchen's setting, then her limit. */
export function pieDe(input: {
  readonly cocina: Kitchen;
  readonly oferta: Offer;
  readonly platillo: Dish;
  readonly apartados: readonly Apartado[] | undefined;
  readonly posicion: Posicion | undefined;
  readonly ahora: Date;
}): Pie {
  const { cocina, oferta, platillo, apartados, posicion, ahora } = input;
  if (apartados === undefined || posicion === undefined) return { kind: 'cargando' };
  const pendientes = apartados.filter((a) => a.estado === 'apartado');
  const suyo = pendientes.find((a) => esDeEstePlatillo(a, cocina, oferta, platillo));
  if (suyo !== undefined) return { kind: 'yaLoApartaste', apartado: suyo };
  const regla = porCalificacion(cocina.minScore, posicion.calificacion);
  if (regla !== null) return { kind: 'calificacion', ...regla };
  if (Math.max(pendientes.length, posicion.tiene) >= posicion.limite) return { kind: 'limite', limite: posicion.limite };
  if (horasDe(oferta, ahora).length === 0) return { kind: 'sinHoras' };
  return { kind: 'apartar' };
}

/** The sheet's first choices: the first hour, *para llevar* when it can be, and cash. */
export function inicialDe(
  oferta: Offer,
  platillo: Dish,
  ahora: Date,
): { readonly hora: Date | null; readonly comer: Comer; readonly pago: Pago } {
  return { hora: horasDe(oferta, ahora)[0] ?? null, comer: comeresDe(platillo)[0], pago: 'efectivo' };
}

/**
 * An hour she picked that is no longer offered — the clock passed it while the sheet was
 * open — moves to the next one there is, or none.
 */
export function horaVigente(hora: Date | null, horas: readonly Date[]): Date | null {
  if (hora !== null && horas.some((h) => h.getTime() === hora.getTime())) return hora;
  return horas.find((h) => hora === null || h.getTime() > hora.getTime()) ?? horas[0] ?? null;
}

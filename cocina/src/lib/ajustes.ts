// ============================================================================
// WHAT *MI COCINA*'S ROWS SAY OF HER SETTINGS AND HER STARS. Plan task `10.5b-iv-c`.
// State first (ADR-035 §2.8): each row says what is set under its name — *Efectivo ·
// Tarjeta*, *$5 por cada plato para llevar*, *Pueden apartar: todos* — before she
// opens it. Pure, so `test/ajustes.test.ts` pins every line.
// ============================================================================

import type { Ajustes } from '@/api/ajustes';
import type { Calificaciones, Etiqueta } from '@/api/calificaciones';
import { formatMXN } from '@/format/mxn';
import { ES } from '@/strings';

/** *Cómo te pagan*: cash first and always, then what she switched on. */
export function cobroTexto(ajustes: Ajustes): string {
  const c = ES.ajustes.cobro;
  return [c.efectivo, ...(ajustes.tarjeta ? [c.tarjeta] : []), ...(ajustes.transferencia ? [c.transferencia] : [])].join(
    ES.miCocina.separador,
  );
}

/** *Cómo se come*: *para llevar* first, as the door lists them. */
export function comerTexto(ajustes: Ajustes): string {
  const c = ES.ajustes.comer;
  return [...(ajustes.llevar ? [c.llevar] : []), ...(ajustes.aqui ? [c.aqui] : [])].join(ES.miCocina.separador);
}

/** *El desechable*: its price, or that she does not charge for it. */
export function desechableFila(ajustes: Ajustes): string {
  return ajustes.desechableCentavos === null ? ES.miCocina.desechableNo : ES.miCocina.desechableCobras(formatMXN(ajustes.desechableCentavos));
}

/** *Ajustes de apartados*: who may reserve. */
export function quienTexto(ajustes: Ajustes): string {
  const a = ES.ajustes.apartados;
  return ES.miCocina.pueden(ajustes.minScore === null ? a.todosCorto : a.masDeCorto(ajustes.minScore));
}

/** *Tus calificaciones*: from five, the average and how many; else that there are none to show yet. */
export function calificacionesFila(calificaciones: Calificaciones | null): string {
  if (calificaciones === null || calificaciones.kind === 'pocas') return ES.miCocina.calificacionesPocas;
  return ES.miCocina.calificacionesListas(calificaciones.promedio, calificaciones.cuantas);
}

/** Five stars as she reads them on a row: `★★★☆☆`. */
export function estrellasTexto(n: number): string {
  const llenas = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
}

/**
 * ⚠️ `10.9i`: WHAT *REPORTAR* PUTS IN THE OWNER'S CHAT — one of yesterday's ratings exactly as
 * she reads it on the row (its stars, its tags in the row's order) and her kitchen's name, so he
 * finds it without asking. Nothing else exists to send: no order, name or moment ever reaches
 * this screen (`@/api/calificaciones`).
 */
export function reporteTexto(
  rating: { readonly estrellas: number; readonly etiquetas: readonly Etiqueta[] },
  cocina: string,
): string {
  const c = ES.ajustes.calificaciones;
  return c.reportarMensaje(
    estrellasTexto(rating.estrellas),
    rating.etiquetas.map((e) => c.etiqueta[e]).join(ES.miCocina.separador),
    cocina,
  );
}

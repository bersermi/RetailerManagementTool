// ============================================================================
// HOW FAR A KITCHEN IS FROM HER, WORKED OUT ON HER PHONE. Plan task `10.5-iv-a-i`.
//
// ⚠️ HER LOCATION NEVER LEAVES THE PHONE (the owner's ruling of 2026-11-04, night):
// for the pilot the door takes no area and sends every kitchen a neighbour may see,
// so the distance and the order are worked out here, from her point and each
// kitchen's — ADR-035 §2.7. ⚠️ A kitchen's point may be Google's 30-day copy for her
// address, and §2.2 forbids a filter, a sort or a count on it ON THE SERVER only;
// whether Google's terms allow ordering by it on the phone is one of the questions
// to Google's support (the plan's decisions block), and the hard 1.5 and 3 km
// cut-offs wait for that answer (`10.5-iv-b`). So nothing here hides a kitchen.
//
// ⚠️ A STRAIGHT LINE, NOT A WALK: the great-circle distance on the mean Earth, as
// the crow flies — what every app of the proposals page shows as *350 m*.
// ============================================================================

import type { Punto } from '@/api/cocinas';
import { ES } from '@/strings';

/** The mean radius of the Earth, in metres (IUGG). */
const RADIO_M = 6_371_008.8;

/** Metres between two points, along the Earth's surface (haversine). */
export function metrosEntre(a: Punto, b: Punto): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Under a kilometre, shown to the nearest 50 m — the drawing's *350 m*, *400 m*. */
export const PASO_METROS = 50;

/**
 * A distance as she reads it: *350 m* under a kilometre (never *0 m*), *1.2 km*
 * under ten, *12 km* beyond — the decimal a point, as Mexico writes it.
 */
export function distanciaTexto(metros: number): string {
  const redondos = Math.max(PASO_METROS, Math.round(metros / PASO_METROS) * PASO_METROS);
  if (redondos < 1000) return ES.cerca.metros(redondos);
  const decimas = Math.round(metros / 100);
  if (decimas < 100) return ES.cerca.kilometros(decimas % 10 === 0 ? String(decimas / 10) : (decimas / 10).toFixed(1));
  return ES.cerca.kilometros(String(Math.round(metros / 1000)));
}

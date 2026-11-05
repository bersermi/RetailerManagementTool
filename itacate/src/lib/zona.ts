// ============================================================================
// WHERE ITACATE REACHES: WERA COCINA'S SEARCH ZONE. Plan task `10.5-iv-a-i`, the
// owner's ruling of 2026-11-04, night: Itacate's pilot region is Wera Cocina's
// search zone — Mexico City and the State of Mexico.
//
// ⚠️ WERA COCINA'S BOX, COPIED (`cocina/src/lib/google.ts`'s `ZONA_DE_BUSQUEDA`,
// plan `10.4f`): a kitchen can only be registered inside it, so a neighbour
// outside it has no kitchen near her — *Itacate aún no llega a tu zona*. The other
// states come as an update, his word, and change both files: `test/gemelos.test.ts`
// reads Wera Cocina's constant out of its file and holds this one to it.
//
// ⚠️ A BOX ON INEGI'S EXTREMES OF THE STATE, so it also takes in the edges of the
// states around — Pachuca, Cuernavaca, Taxco — as Wera Cocina's search does.
// ============================================================================

import type { Punto } from '@/api/cocinas';

/**
 * ⚠️ WHERE THE SEARCH LOOKS: MEXICO CITY AND THE STATE OF MEXICO — the owner's
 * ruling of 2026-11-02 (`10.4f`; the Valle de México alone before), as
 * `min_lon,min_lat,max_lon,max_lat`: INEGI's extreme coordinates of the State of
 * Mexico (*Aspectos Geográficos*, 2021, cuadro 1.1 — N 20°17'09", S 18°22'01",
 * E 98°35'49", W 100°36'47"), a hundredth of a degree wider each way. Mexico City
 * lies inside it whole.
 */
export const ZONA_DE_BUSQUEDA = '-100.62,18.36,-98.59,20.29';

/** The zone as two corners: south-west and north-east. */
export const RECTANGULO = (() => {
  const [oeste, sur, este, norte] = ZONA_DE_BUSQUEDA.split(',').map(Number);
  return { low: { latitude: sur, longitude: oeste }, high: { latitude: norte, longitude: este } } as const;
})();

/** Is this point inside the zone? */
export function enLaZona({ latitude, longitude }: Punto): boolean {
  return (
    latitude >= RECTANGULO.low.latitude &&
    latitude <= RECTANGULO.high.latitude &&
    longitude >= RECTANGULO.low.longitude &&
    longitude <= RECTANGULO.high.longitude
  );
}

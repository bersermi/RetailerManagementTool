// ============================================================================
// HER ADDRESS AS ONE LINE FOR GOOGLE MAPS — *Cómo llegar*'s destination when she set no
// point. ⚠️ ITACATE'S `preguntaDeSuDireccion` (`itacate/src/lib/google.ts`), COPIED —
// plan task `10.5-v-c-ii` — and held block for block by `test/vecinos.test.ts`. Only the
// line is built here; Wera Cocina's own Google code is `@/lib/google`.
// ============================================================================

import type { Address } from '@/vecinos/cocinas';

/**
 * A kitchen's address as one line — street and number, colonia, city or alcaldía,
 * postcode, as she wrote them in Wera Cocina — or `null` without a street, which
 * Google could only place at a colonia's middle.
 */
export function preguntaDeSuDireccion(direccion: Address): string | null {
  if (direccion.street === '') return null;
  const partes = [
    `${direccion.street} ${direccion.number}`.trim(),
    direccion.colonia,
    direccion.city,
    direccion.postalCode,
  ].filter((parte) => parte !== '');
  return partes.join(', ').replace(/\s+/g, ' ').trim();
}

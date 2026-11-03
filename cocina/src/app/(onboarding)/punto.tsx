import { router } from 'expo-router';
import { useEffect } from 'react';

import { puntoEn, puntoVigente } from '@/api/direccion';
import { samePin, type Pin } from '@/api/place';
import { pasoUno } from '@/api/registro';
import { useBorrador } from '@/lib/borrador';
import { useDondeEsta } from '@/lib/useGoogle';
import { PantallaPunto } from '@/ui/PantallaPunto';

// ============================================================================
// *AJUSTA EL PUNTO*, IN THE SIGN-UP — only if she taps the small map. Plan tasks
// `10.4b-iii-b` and `10.4h` (the owner's ruling of 2026-11-03: the pin is a
// suggestion she never has to touch; her own point, if she sets one, is kept and
// used by every map after).
//
// ⚠️ NOTHING IS WRITTEN HERE: *Listo* puts her point in the draft, beside the
// street and number it belongs to (`puntoEn`), and *Registrar mi cocina* sends it
// with the rest (`@/api/registro`). Without a move of hers the middle is
// Google's, and *Listo* only goes back. The map opens where the small map placed
// her address (`useDondeEsta`, the same answer from the cache).
// ============================================================================
export default function Punto() {
  const { valor: borrador, cambiar, elegido } = useBorrador();
  const pasoListo = pasoUno(borrador) === null;
  const propio = puntoVigente(borrador);
  const donde = useDondeEsta(propio !== null ? null : borrador.address, elegido);

  // Reached without the first step — a restart drops the draft, which is not kept on the phone.
  useEffect(() => {
    if (!pasoListo) router.replace('/registro');
  }, [pasoListo]);

  async function listo(pin: Pin | null): Promise<string | null> {
    if (pin !== null && !samePin(pin, propio)) cambiar({ punto: puntoEn(pin, borrador.address) });
    router.back();
    return null;
  }

  if (!pasoListo) return null;
  return (
    <PantallaPunto
      antetitulo={null}
      pin={propio}
      direccion={borrador.address}
      abreEn={donde.kind === 'punto' ? donde.destino : null}
      busy={false}
      onVolver={() => router.back()}
      onListo={listo}
    />
  );
}

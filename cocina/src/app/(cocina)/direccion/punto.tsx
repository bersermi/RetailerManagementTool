import { router } from 'expo-router';

import { puntoEn, puntoVigente } from '@/api/direccion';
import { useKitchen } from '@/api/hooks';
import { samePin, type Pin } from '@/api/place';
import { useSuDireccion } from '@/lib/borrador';
import { useDondeEsta } from '@/lib/useGoogle';
import { PantallaPunto } from '@/ui/PantallaPunto';

// ============================================================================
// *AJUSTA EL PUNTO*, BEHIND *CAMBIAR DIRECCIÓN* — only if she taps the small map.
// Plan task `10.4h`.
//
// ⚠️ NOTHING IS WRITTEN HERE, as in the sign-up's (`(onboarding)/punto`): *Listo*
// puts her point in the draft, beside the street and number now in the boxes
// (`puntoEn`), and the address screen's *Guardar* sends it with the rest. The map
// opens on her point while it still belongs to them, else where the small map
// placed the address in the boxes (`useDondeEsta`, the same answer from the cache).
// ============================================================================
export default function AjustaElPunto() {
  const kitchen = useKitchen();
  const { valor, cambiar, elegido } = useSuDireccion();
  const propio = puntoVigente(valor);
  const donde = useDondeEsta(propio !== null ? null : valor.address, elegido);

  async function listo(pin: Pin | null): Promise<string | null> {
    if (pin !== null && !samePin(pin, propio)) cambiar({ punto: puntoEn(pin, valor.address) });
    router.back();
    return null;
  }

  return (
    <PantallaPunto
      antetitulo={kitchen?.displayName ?? null}
      pin={propio}
      direccion={valor.address}
      abreEn={donde.kind === 'punto' ? donde.destino : null}
      busy={false}
      onVolver={() => router.back()}
      onListo={listo}
    />
  );
}

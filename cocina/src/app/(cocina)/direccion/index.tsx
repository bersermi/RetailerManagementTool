import { router } from 'expo-router';

import { escrituras } from '@/api/direccion';
import { useKitchen, usePlace, useSaveDireccion } from '@/api/hooks';
import { checkAddress } from '@/api/place';
import { useSuDireccion } from '@/lib/borrador';
import { ES } from '@/strings';
import { PantallaDireccion } from '@/ui/PantallaDireccion';

// ============================================================================
// *CAMBIAR DIRECCIÓN* — HER ADDRESS SCREEN, FROM HER KITCHEN. Plan task `10.4h`
// (the owner's ruling of 2026-11-03, address first). The sign-up's second step
// (`@/ui/PantallaDireccion`) holding what is stored, and *Guardar*.
//
// ⚠️ *GUARDAR* WRITES ONLY WHAT CHANGED, IN ORDER (`@/api/direccion`'s
// `escrituras`): her address (`set_store_address`, the owner's four boxes, as the
// sign-up checks them); her own point — set, or cleared when her street or number
// changed (`clear_store_pin`), so the map follows the new address; her line alone
// (`set_store_directions`) when no point was sent. The first failure stops the
// rest and says why; nothing changed goes back without a write.
// ============================================================================
export default function CambiarDireccion() {
  const kitchen = useKitchen();
  const place = usePlace(kitchen?.id ?? null);
  const { valor, cambiar, elegido, elegir } = useSuDireccion();
  const { save, busy } = useSaveDireccion();

  async function guardar(): Promise<string | null> {
    const here = place.data;
    if (here === undefined || here === null) return ES.api.errors.unknown;
    const issue = checkAddress(valor.address);
    if (issue !== null) return ES.address.issues[issue];
    const lista = escrituras(here, valor);
    if (lista.length === 0) {
      router.back();
      return null;
    }
    const problem = await save(lista);
    if (problem === null) router.back();
    return problem;
  }

  return (
    <PantallaDireccion
      antetitulo={kitchen?.displayName ?? null}
      paso={null}
      valor={valor}
      elegido={elegido}
      onCambio={(next, pick) => {
        cambiar(next);
        if (pick !== undefined) elegir(pick);
      }}
      accion={ES.direccion.guardar}
      busy={busy}
      onAjustar={() => router.push('/direccion/punto')}
      onVolver={() => router.back()}
      onGuardar={guardar}
    />
  );
}

import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useMakeKitchen } from '@/api/hooks';
import { checkAddress, type GooglePoint } from '@/api/place';
import { draftFrom, pasoUno } from '@/api/registro';
import { useBorrador } from '@/lib/borrador';
import { ES } from '@/strings';
import { PantallaDireccion } from '@/ui/PantallaDireccion';

// ============================================================================
// THE SIGN-UP'S LAST STEP: *¿DÓNDE ESTÁ TU COCINA?* AND *REGISTRAR MI COCINA*.
// Plan tasks `10.4b-iii-b` and `10.4h` (the owner's ruling of 2026-11-03, address
// first: her address on a screen of its own, the pin a suggestion she never has
// to touch).
//
// ⚠️ THE KITCHEN IS MADE HERE, WHOLE, AT THE END — the first step's two answers,
// her address, her line of directions and, only if she set one on *Ajusta el
// punto*, her own point — else Google's point for her address, as the small map
// drew it (`10.5-i-b-ii`) — in one go (`@/api/registro`), before her kitchens are
// read again. The guard then takes her to her kitchen (`@/auth/guard`); this
// screen never navigates there itself.
//
// ⚠️ AFTER A SUCCESS THE BUTTON STAYS BUSY until the guard moves her: a second
// tap would be a second kitchen (`onboard_workspace` takes no id from the phone).
// A failure keeps her here with what she gave, and the sentence says why.
// ============================================================================
export default function Donde() {
  const { valor: borrador, cambiar, elegido, elegir } = useBorrador();
  const { make, busy } = useMakeKitchen();
  const [hecho, setHecho] = useState(false);
  const pasoListo = pasoUno(borrador) === null;

  // Reached without the first step — a restart drops the draft, which is not kept on the phone.
  useEffect(() => {
    if (!pasoListo) router.replace('/registro');
  }, [pasoListo]);

  async function registrar(google: GooglePoint | null): Promise<string | null> {
    const issue = checkAddress(borrador.address);
    if (issue !== null) return ES.address.issues[issue];
    const draft = draftFrom(borrador, google);
    if (draft === null) return ES.api.errors.unknown;
    const problem = await make(draft);
    if (problem === null) setHecho(true);
    return problem;
  }

  if (!pasoListo) return null;
  return (
    <PantallaDireccion
      antetitulo={null}
      paso={ES.registro.paso(2)}
      valor={borrador}
      elegido={elegido}
      onCambio={(next, pick) => {
        cambiar(next);
        if (pick !== undefined) elegir(pick);
      }}
      accion={ES.direccion.registrar}
      busy={busy || hecho}
      onAjustar={() => router.push('/punto')}
      onVolver={() => router.back()}
      onGuardar={registrar}
    />
  );
}

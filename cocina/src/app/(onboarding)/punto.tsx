import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useMakeKitchen } from '@/api/hooks';
import type { Pin } from '@/api/place';
import { draftFrom, formIssue } from '@/api/registro';
import { useBorrador } from '@/lib/borrador';
import { ES } from '@/strings';
import { PantallaPunto } from '@/ui/PantallaPunto';

// ============================================================================
// THE SIGN-UP'S LAST STEP: HER KITCHEN ON THE MAP, AND *REGISTRAR MI COCINA*.
// Plan task `10.4b-iii-b`.
//
// ⚠️ THE KITCHEN IS MADE HERE, WHOLE, AT THE END — the form's three answers and
// this screen's pin in one go (`@/api/registro`), before her kitchens are read
// again. The guard then takes her to her kitchen (`@/auth/guard`); this screen
// never navigates there itself.
//
// ⚠️ AFTER A SUCCESS THE BUTTON STAYS BUSY until the guard moves her: a second
// tap would be a second kitchen (`onboard_workspace` takes no id from the phone).
// A failure keeps her here with what she gave, and the sentence says why.
// ============================================================================
export default function Punto() {
  const { borrador, cambiar } = useBorrador();
  const { make, busy } = useMakeKitchen();
  const [hecho, setHecho] = useState(false);
  const formReady = formIssue(borrador) === null;

  // Reached without the form — a restart drops the draft, which is not kept on the phone.
  useEffect(() => {
    if (!formReady) router.replace('/registro');
  }, [formReady]);

  async function registrar(pin: Pin, directions: string): Promise<string | null> {
    const draft = draftFrom({ ...borrador, pin, directions });
    if (draft === null) return ES.mapa.falta;
    const problem = await make(draft);
    if (problem === null) setHecho(true);
    return problem;
  }

  if (!formReady) return null;
  return (
    <PantallaPunto
      antetitulo={ES.registro.titulo}
      pin={borrador.pin}
      direccion={borrador.address}
      directions={borrador.directions}
      accion={ES.mapa.registrar}
      busy={busy || hecho}
      onVolver={() => router.back()}
      onCambio={(pin, directions) => cambiar({ pin, directions })}
      onGuardar={registrar}
    />
  );
}

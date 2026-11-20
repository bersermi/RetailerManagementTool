import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import type { Online } from '@/api/connectivity';
import { useApartados } from '@/api/hooks';
import { abreSuBoleto } from '@/lib/apartados';
import { useSenal } from '@/lib/useSenal';

// ============================================================================
// WITH NO SIGNAL, ITACATE OPENS ON HER TICKET. Plan task `10.9j-ii-a` — the owner's J1 of
// 2026-11-20. Mounted with the tabs (`(vecino)/(tabs)/_layout.tsx`), as `@/lib/Recordatorios`
// is; draws nothing. ⚠️ ONLY WHEN THE APP OPENS WITH NO SIGNAL — the first reading of the app's
// one signal (`@/lib/useSenal`) — and only while her phone keeps a ticket still to collect:
// *Apartados* is pushed over *Cerca*, once a run. A signal lost while she looks at the list
// moves nothing; her ticket is still one tap away, pinned (`@/ui/ApartadoFijado`). Every rule
// is `@/lib/apartados`' `abreSuBoleto`, pinned by `test/apartados.test.ts`.
// ============================================================================

/** Once a run of the app: a second mount of the tabs (a new sign-in) never pushes it again. */
let abierto = false;

export function AbrirBoleto() {
  const senal = useSenal();
  const apartados = useApartados();
  /** The first reading of this run; `undefined` until the signal has been read at all. */
  const primera = useRef<Online | undefined>(undefined);

  useEffect(() => {
    if (primera.current === undefined && senal !== null) primera.current = senal;
    if (!abreSuBoleto(primera.current, apartados.data, abierto)) return;
    abierto = true;
    router.push('/apartados');
  }, [senal, apartados.data]);

  return null;
}

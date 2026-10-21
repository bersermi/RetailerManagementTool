// ============================================================================
// OPENING *CONOCE WERA* BY ITSELF — the half of `@/navigation/recorrido` that
// acts. Called by the two screens a person lands on: Vender (an owner who has
// just opened her shop, an Empleado just let in) and Inicio (everyone else).
//
// ⚠️ AFTER THE ARRIVAL LINE, NOT OVER IT: *Tu tienda está lista* lingers on
// Vender (`Hecho`, `DONE_NOTE_HOLD_MS`), and covering it with a story would
// spend the moment it exists for. The arrival is latched for the screen's life,
// because Vender clears its own copy when the line goes.
//
// ⚠️ A SCREEN THAT LOSES FOCUS CANCELS ITS TIMER, and the phone is marked as
// having seen the story only when the story mounts (`recorrido.tsx`) — so
// walking from Vender to Inicio before it opens hands the moment to Inicio
// rather than losing it, and two tabs can never both open it.
// ============================================================================

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { useSales } from '@/api/hooks';
import { shopAge } from '@/api/month';
import { deviceStore, readKey } from '@/lib/store';
import { abrePorSiSolo } from '@/navigation/recorrido';
import { RECORRIDO_KEY } from '@/offline/ensenar';
import { DONE_NOTE_HOLD_MS } from '@/theme/pulse';

/** Past the arrival line's hold, so it is read before the story covers it. */
const AFTER_ARRIVAL_MS = DONE_NOTE_HOLD_MS + 1_200;
/** Long enough for the screen to be seen first, short enough to read as one moment. */
const SETTLE_MS = 900;

/** Opens the story once, when `abrePorSiSolo` says so, while this screen is in front. */
export function useRecorridoPorSiSolo(arrived: boolean): void {
  const { sales, today } = useSales();
  const age = shopAge(sales.days, today);
  const latched = useRef(false);
  if (arrived) latched.current = true;
  const justArrived = latched.current;

  useFocusEffect(
    useCallback(() => {
      const seen = readKey(deviceStore(), RECORRIDO_KEY) !== null;
      if (!abrePorSiSolo({ seen, arrived: justArrived, salesState: sales.state, shopAge: age })) return undefined;
      const timer = setTimeout(
        () => {
          if (readKey(deviceStore(), RECORRIDO_KEY) !== null) return;
          router.push('/recorrido');
        },
        justArrived ? AFTER_ARRIVAL_MS : SETTLE_MS,
      );
      return () => clearTimeout(timer);
    }, [justArrived, sales.state, age]),
  );
}

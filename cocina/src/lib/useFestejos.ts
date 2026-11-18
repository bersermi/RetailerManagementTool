import { useEffect } from 'react';

import type { Reserva } from '@/api/apartados';
import { cambiarMemoria, hayDe, primerasDe, type Festejo } from '@/lib/empujones';
import { useNota } from '@/lib/NotaProvider';
import { deviceStore } from '@/lib/store';
import { ES } from '@/strings';

// ============================================================================
// HER FIRST RESERVATION AND HER FIRST HANDOVER, CELEBRATED — ONCE, ON THIS PHONE. Plan task
// `10.9a-iii`, the owner's nudges (ruled 2026-11-17): *"one small celebration for each first"* — her
// first offer (`@/app/(cocina)/publicar`), reservation and handover here; the stamp and the
// promotion with their rows. The toast in the green (`festejar`).
//
// ⚠️ CALLED ONCE, FROM THE TABS' LAYOUT, on the reservations it already reads (`useApartadosAlDia`):
// always mounted, so a reservation that arrives while she is on *Mi cocina* or *Entregar* is
// celebrated there. ⚠️ ONLY A FIRST THIS PHONE SAW THE ZERO OF (`@/lib/empujones`' `primerasDe`):
// her history read with none, kept on the phone; a phone that meets her history already holding one
// celebrates nothing. Re-run only when what it counts changes — never on every minute's read.
// ============================================================================

export function useFestejos(kitchenId: string | null, reservas: readonly Reserva[] | undefined): void {
  const { festejar } = useNota();
  const hay = reservas === undefined ? null : hayDe(reservas);
  const apartado = hay?.apartado ?? null;
  const entrega = hay?.entrega ?? null;
  useEffect(() => {
    if (kitchenId === null || apartado === null || entrega === null) return;
    let festejo: Festejo | null = null;
    cambiarMemoria(deviceStore(), kitchenId, (m) => {
      const visto = primerasDe(m, { apartado, entrega });
      festejo = visto.festejo;
      return visto.memoria;
    });
    if (festejo !== null) festejar(ES.festejo[festejo]);
  }, [kitchenId, apartado, entrega, festejar]);
}

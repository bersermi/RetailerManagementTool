import { useEffect } from 'react';

import type { Reserva } from '@/api/apartados';
import type { KitchenCardRow } from '@/api/tarjeta';
import { cambiarMemoria, hayDe, primerSelloDe, primerasDe, type Festejo } from '@/lib/empujones';
import { useNota } from '@/lib/NotaProvider';
import { deviceStore } from '@/lib/store';
import { palabrasDelFestejo } from '@/lib/numeros';
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

// ⚠️ `10.9f`: her first handover's words say her numbers start today when she sees them (`conNumeros`:
// the owner, using them, on a build that carries them — `@/lib/numeros`' `veSusNumeros`).
export function useFestejos(kitchenId: string | null, reservas: readonly Reserva[] | undefined, conNumeros = false): void {
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
    if (festejo !== null) festejar(palabrasDelFestejo(festejo, conNumeros));
  }, [kitchenId, apartado, entrega, festejar, conNumeros]);
}

/**
 * ⚠️ `10.9e-ii`: HER CARD'S FIRST STAMP — *Diste tu primer sello* — once, on this phone, from the counts
 * `kitchen_card` reads (`primerSelloDe`): on *Hoy* and on *Sellar*, whichever reads them first. Re-run only
 * when the counts change.
 */
export function useFestejoDelSello(kitchenId: string | null, card: KitchenCardRow | undefined): void {
  const { festejar } = useNota();
  const cards = card?.cards ?? null;
  const hoy = card?.stamps_today ?? null;
  const premios = card?.rewards_to_give ?? null;
  const puesta = card !== undefined && card.terms !== null;
  useEffect(() => {
    if (kitchenId === null || !puesta || cards === null || hoy === null || premios === null) return;
    let festejar1 = false;
    cambiarMemoria(deviceStore(), kitchenId, (m) => {
      const visto = primerSelloDe(m, { cards, stamps_today: hoy, rewards_to_give: premios });
      festejar1 = visto.festejar;
      return visto.memoria;
    });
    if (festejar1) festejar(ES.tarjeta.primerSello);
  }, [kitchenId, puesta, cards, hoy, premios, festejar]);
}

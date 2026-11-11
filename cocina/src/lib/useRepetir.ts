import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { useAjustes, usePlace, usePublish } from '@/api/hooks';
import type { Kitchen } from '@/api/kitchen';
import { attemptFor, publishArgs, type Attempt, type Listing } from '@/api/listing';
import { nombreDe, planDeRepetir } from '@/lib/hoy';
import { newId } from '@/lib/ids';
import { useNota } from '@/lib/NotaProvider';
import { slotOf } from '@/lib/ventana';
import { ES } from '@/strings';

// ============================================================================
// *REPETIR*, ONE TAP — on *Hoy*'s chips and in *Tus ofertas › Anteriores*. Plan task
// `10.5-v-c-i`, the family-shell page's round 6: *"Repetir publishes in one tap, with
// Deshacer"* — the same offer, today's hours, and *Publicaste otra vez …* with
// *Deshacer* for 8 seconds.
//
// ⚠️ ONE TAP ONLY WHEN THE FORM WOULD HAVE SENT THE SAME THING UNTOUCHED (`@/lib/hoy`'s
// `planDeRepetir`); otherwise the form opens filled in, as *Repetir* did before, and
// nothing is sent until she presses *Publicar*.
// ⚠️⚠️ A RETRY IS THE SAME PUBLICATION, as the form's is (`attemptFor`): the attempt is
// kept per offer, so a tap after *Sin conexión* sends the same id and can never publish
// twice — `publish_listing` answers an id it holds with that publication. A tap while
// one is out does nothing (`busyId`).
// ⚠️ `10.5b-iv-c`: WITH HER KITCHEN'S WAYS (`useAjustes`), so each dish is narrowed to what her
// kitchen offers now, as the form does; while they are unread, a narrowed dish opens the form.
// ============================================================================

export function useRepetir(kitchen: Kitchen | null) {
  const place = usePlace(kitchen?.id ?? null);
  const ajustes = useAjustes(kitchen?.id ?? null);
  const { publish } = usePublish(kitchen?.id ?? null);
  const { avisar, avisarPublicada } = useNota();
  const [busyId, setBusyId] = useState<string | null>(null);
  const intentos = useRef(new Map<string, Attempt>());

  async function repetir(listing: Listing) {
    if (kitchen === null || busyId !== null) return;
    const now = new Date();
    const plan = planDeRepetir(listing, place.data?.id ?? null, now, newId, ajustes.data ?? null);
    if (plan.kind === 'formulario') {
      router.push({ pathname: '/publicar', params: { repetir: listing.id } });
      return;
    }
    const attempt = attemptFor(intentos.current.get(listing.id) ?? null, plan.body, newId);
    intentos.current.set(listing.id, attempt);
    setBusyId(listing.id);
    const problem = await publish(publishArgs(attempt, plan.body));
    setBusyId(null);
    if (problem !== null) {
      avisar(problem);
      return;
    }
    intentos.current.delete(listing.id);
    const cuando = slotOf({ start: new Date(plan.body.p_pickup_start), end: new Date(plan.body.p_pickup_end) }, now);
    avisarPublicada(ES.nota.otraVez(nombreDe(listing), cuando), kitchen.id, attempt.id);
  }

  return { repetir, busyId };
}

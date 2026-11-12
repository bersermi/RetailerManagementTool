import { estrellasDe } from '@/api/calificaciones';
import { useAjustes, useApartados, useCalificaciones } from '@/api/hooks';
import type { Ajustes } from '@/api/ajustes';
import { tomadosDe } from '@/lib/apartados';
import type { Tomados } from '@/lib/comoLaVen';
import type { Estrellas } from '@/vecinos/cocinas';

// ============================================================================
// WHAT HER PREVIEW KNOWS BESIDES HER KITCHEN, HER PLACE, HER PAGE AND HER LIST — plan task
// `10.5b-iv-c`: her settings, her stars and what is taken of each dish, the three parts of the
// door's answer `@/lib/comoLaVen` makes from her own rows (*Así la ven*, *Ver como la ven*, the
// first run's *Ya estás*). Each is `null` until its read answers — the door's own default meanwhile
// — so the preview never waits on them: with no signal it draws what the phone has.
// ============================================================================

export function useLoQueVen(kitchenId: string | null): {
  readonly ajustes: Ajustes | null;
  readonly estrellas: Estrellas | null;
  readonly tomados: Tomados;
} {
  const ajustes = useAjustes(kitchenId);
  const calificaciones = useCalificaciones(kitchenId);
  const apartados = useApartados(kitchenId);
  return {
    ajustes: ajustes.data ?? null,
    estrellas: estrellasDe(calificaciones.data ?? null),
    tomados: apartados.data === undefined ? null : tomadosDe(apartados.data.reservas),
  };
}

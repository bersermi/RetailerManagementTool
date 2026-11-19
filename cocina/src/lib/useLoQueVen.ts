import { estrellasDe } from '@/api/calificaciones';
import { useAjustes, useApartados, useCalificaciones, usePromociones, useServicios } from '@/api/hooks';
import { enLaPuerta } from '@/api/servicios';
import type { Ajustes } from '@/api/ajustes';
import { tomadosDe } from '@/lib/apartados';
import { promocionesVistas, type Tomados } from '@/lib/comoLaVen';
import { seLeen } from '@/lib/promociones';
import type { Estrellas, Promocion, ServicioVisto } from '@/vecinos/cocinas';

// ============================================================================
// WHAT HER PREVIEW KNOWS BESIDES HER KITCHEN, HER PLACE, HER PAGE AND HER LIST — plan task
// `10.5b-iv-c`: her settings, her stars and what is taken of each dish, the three parts of the
// door's answer `@/lib/comoLaVen` makes from her own rows (*Así la ven*, *Ver como la ven*, the
// first run's *Ya estás*). Each is `null` until its read answers — the door's own default meanwhile
// — so the preview never waits on them: with no signal it draws what the phone has. ⚠️ Since `10.9a-i`
// a fourth: what the door says she uses (`features`, `0081`) — none while unread, as the door says of a
// kitchen that chose nothing. ⚠️ Since `10.9g-iii` a fifth: her promotions a neighbour sees now
// (`promocionesVistas`), read only while she uses them (`seLeen`, as *Publicar* reads them) — none meanwhile.
// ============================================================================

export function useLoQueVen(kitchenId: string | null): {
  readonly ajustes: Ajustes | null;
  readonly estrellas: Estrellas | null;
  readonly tomados: Tomados;
  readonly servicios: readonly ServicioVisto[];
  readonly promociones: readonly Promocion[];
} {
  const ajustes = useAjustes(kitchenId);
  const calificaciones = useCalificaciones(kitchenId);
  const apartados = useApartados(kitchenId);
  const servicios = useServicios(kitchenId);
  const usa = seLeen(servicios.data);
  const promociones = usePromociones(kitchenId, { activa: usa });
  return {
    ajustes: ajustes.data ?? null,
    estrellas: estrellasDe(calificaciones.data ?? null),
    tomados: apartados.data === undefined ? null : tomadosDe(apartados.data.reservas),
    servicios: enLaPuerta(servicios.data ?? null),
    // ⚠️ A query switched off still hands its last answer: once she stops using them, none — never a cached band.
    promociones: usa ? promocionesVistas(promociones.data) : [],
  };
}

import type { ComoSeCome } from '@/api/listing';
import { deviceStore, readKey, writeKey, type DeviceStore } from '@/lib/store';

// ============================================================================
// HOW SHE LAST CHOSE A DISH MAY BE EATEN — REMEMBERED ON THIS PHONE, PER KITCHEN. Plan task
// `10.5b-iv-c`, the family-shell page's round 3 (call 26, ruled 2026-11-05): *"The form starts
// with her last choice."* Kept only when the form ASKED — her kitchen offered both ways — so a
// dish published while it offered one way never reads as a choice she made (the one she would
// otherwise be handed back, narrower than she means, the day she switches *Para comer aquí* on).
// Nothing chosen yet: both on (*"What her kitchen allows, all on"*).
//
// ⚠️ `@/lib/puerta`'s way: one key per kitchen in the phone's own store, nothing sent anywhere —
// how she fills her form, not something about her. A store that fails reads as no choice.
// ============================================================================

/** Both on: what her kitchen allows, before she has chosen. */
export const TODAS: ComoSeCome = { llevar: true, aqui: true };

/** The key a kitchen's last choice is kept under. */
export function claveEleccion(kitchenId: string): string {
  return `wera-cocina.publicar.como-se-come.${kitchenId}`;
}

/** Her last choice, read from `store` — `TODAS` when there is none, or it cannot be read, or it chose neither. */
export function eleccionGuardada(store: DeviceStore | undefined, kitchenId: string): ComoSeCome {
  const texto = readKey(store, claveEleccion(kitchenId));
  if (texto === 'llevar') return { llevar: true, aqui: false };
  if (texto === 'aqui') return { llevar: false, aqui: true };
  return TODAS;
}

/**
 * Kept when she publishes and the form asked: the first dish's ways (a bag is always to go, so it
 * is no choice). Called with `null` — her kitchen offered one way, nothing was asked — it keeps nothing.
 */
export function guardarEleccion(store: DeviceStore | undefined, kitchenId: string, eleccion: ComoSeCome | null): void {
  if (eleccion === null || (!eleccion.llevar && !eleccion.aqui)) return;
  writeKey(store, claveEleccion(kitchenId), eleccion.llevar && eleccion.aqui ? 'ambas' : eleccion.llevar ? 'llevar' : 'aqui');
}

/** The phone's own store — what the form reads its first line from and writes after publishing. */
export function eleccionDe(kitchenId: string): ComoSeCome {
  return eleccionGuardada(deviceStore(), kitchenId);
}

export function recordarEleccion(kitchenId: string, eleccion: ComoSeCome | null): void {
  guardarEleccion(deviceStore(), kitchenId, eleccion);
}

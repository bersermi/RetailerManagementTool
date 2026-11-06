import { useState } from 'react';

import { deviceStore, readKey, removeKey, writeKey, type DeviceStore } from '@/lib/store';

// ============================================================================
// *TU PÁGINA* CLOSED ON *HOY* — REMEMBERED ON THIS PHONE, PER KITCHEN. Plan task
// `10.5-v-c-i`, the owner's direction of 2026-11-06 (*"the user should be able to
// dismiss the 'Tu página en Itacate' section in hoy screen"*): a ✕ on its door, with
// *Deshacer*; the checklist stays in *Mi cocina* until it is complete, so closing it
// loses nothing.
//
// ⚠️ ONE KEY PER KITCHEN in the phone's own store (`@/lib/store`, where the session is
// kept): a second kitchen's door is its own, and the next person on this phone gets
// the door back. Nothing is sent anywhere — it is how she arranged her screen, not
// something about her. A store that fails reads as open: the door comes back, never
// a screen that cannot draw.
// ============================================================================

/** The key a kitchen's closed door is kept under. */
export function clavePuerta(kitchenId: string): string {
  return `wera-cocina.hoy.pagina-cerrada.${kitchenId}`;
}

/** Whether she closed it, read from `store`. */
export function puertaCerrada(store: DeviceStore | undefined, kitchenId: string): boolean {
  return readKey(store, clavePuerta(kitchenId)) === '1';
}

/** Close it, or open it again (*Deshacer*). */
export function guardarPuerta(store: DeviceStore | undefined, kitchenId: string, cerrada: boolean): void {
  if (cerrada) writeKey(store, clavePuerta(kitchenId), '1');
  else removeKey(store, clavePuerta(kitchenId));
}

/** Her door's state on *Hoy*, read once per kitchen and written as she changes it. */
export function usePuertaCerrada(kitchenId: string): readonly [boolean, (cerrada: boolean) => void] {
  const [cerrada, setCerrada] = useState(() => puertaCerrada(deviceStore(), kitchenId));
  function cambiar(nueva: boolean) {
    guardarPuerta(deviceStore(), kitchenId, nueva);
    setCerrada(nueva);
  }
  return [cerrada, cambiar] as const;
}

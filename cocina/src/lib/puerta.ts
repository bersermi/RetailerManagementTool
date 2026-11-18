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
//
// ⚠️ `10.9a-iii`: THE DOOR IS GONE (*Tu página · N de 5*, with every count of what she has not done), AND ITS
// KEY NOW ENDS HER PAGE'S QUIET LINE ON *HOY* FOR GOOD (`@/lib/empujones`) — a kitchen that closed the door is
// not asked again.
// ⚠️ `10.9a-ii`: *CUÉNTANOS CÓMO NECESITAS TU MENÚ*, CLOSED WITH ITS ✕ (G45), IS KEPT THE SAME WAY,
// under a key of its own (`'menu'`). Whether her kitchen already told us is the database's, never
// this phone's (`@/lib/loQueUsas`' `cuentanosEnHoy`).
// ============================================================================

/** The lines on *Hoy* she can close: her page's door, and *Cuéntanos*. */
export type Puerta = 'pagina' | 'menu';

/** The key a kitchen's closed line is kept under — her page's door kept its key of `10.5-v-c-i`. */
export function clavePuerta(kitchenId: string, puerta: Puerta = 'pagina'): string {
  return puerta === 'pagina' ? `wera-cocina.hoy.pagina-cerrada.${kitchenId}` : `wera-cocina.hoy.menu-cerrado.${kitchenId}`;
}

/** Whether she closed it, read from `store`. */
export function puertaCerrada(store: DeviceStore | undefined, kitchenId: string, puerta: Puerta = 'pagina'): boolean {
  return readKey(store, clavePuerta(kitchenId, puerta)) === '1';
}

/** Close it, or open it again (*Deshacer*). */
export function guardarPuerta(store: DeviceStore | undefined, kitchenId: string, cerrada: boolean, puerta: Puerta = 'pagina'): void {
  if (cerrada) writeKey(store, clavePuerta(kitchenId, puerta), '1');
  else removeKey(store, clavePuerta(kitchenId, puerta));
}

/** Her line's state on *Hoy*, read once per kitchen and written as she changes it. */
export function usePuertaCerrada(kitchenId: string, puerta: Puerta = 'pagina'): readonly [boolean, (cerrada: boolean) => void] {
  const [cerrada, setCerrada] = useState(() => puertaCerrada(deviceStore(), kitchenId, puerta));
  function cambiar(nueva: boolean) {
    guardarPuerta(deviceStore(), kitchenId, nueva, puerta);
    setCerrada(nueva);
  }
  return [cerrada, cambiar] as const;
}

// ============================================================================
// WHICH DOOR SHE CAME IN BY — `8g`, the owner's ruling of 2026-10-21: *"We will
// do the 2 door version."* The first screen asks whether she is opening a shop
// or was invited; then her account; then only her half.
//
// ⚠️ ON THE PHONE, NOT IN MEMORY. Between the door and her half lie the account
// screen and, for Google, a browser round trip that Android may end by closing
// Wera; the half she lands on must still be hers when it reopens. Nothing here
// is about who she is — a shop-less account on a second phone has no door, and
// the landing then asks the question again.
// ============================================================================
import { readKey, removeKey, writeKey, type DeviceStore } from '@/lib/store';

/** Opening a shop, or joining one she was invited to. */
export type Puerta = 'abrir' | 'invitada';

export const PUERTA_KEY = 'wera.puerta';

/** A door from a route parameter or the store, or `null` for anything else. */
export function puertaOf(value: unknown): Puerta | null {
  return value === 'abrir' || value === 'invitada' ? value : null;
}

export function readPuerta(store: DeviceStore | undefined): Puerta | null {
  return puertaOf(readKey(store, PUERTA_KEY));
}

/** `null` forgets it — *¿Ya tienes cuenta? Entrar* is neither door. */
export function writePuerta(store: DeviceStore | undefined, puerta: Puerta | null): void {
  if (puerta === null) removeKey(store, PUERTA_KEY);
  else writeKey(store, PUERTA_KEY, puerta);
}

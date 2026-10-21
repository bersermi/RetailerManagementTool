// ============================================================================
// THE ONE LINE SAID ON ARRIVAL — `8g`, the owner's rulings of 2026-10-21.
//
// Leaving the landing for the shop is arriving, and `@/auth/guard` sends her
// to Vender for it (an Encargado to Inicio). Vender then says, once, why she
// is there: *Tu tienda está lista* for the owner who has just opened it, *Ya
// estás en Abarrotes Ana* for the Empleado who has just joined. An Encargado
// is told nothing: Inicio, with the shop's name in its band, says it.
//
// ⚠️ ONE SLOT, IN MEMORY, TAKEN ONCE. The gate announces as it redirects and
// Vender takes it when it comes into view, so the line is said in the frame
// she arrives and never again — not on the next visit to the tab, and not on
// the next launch, which is a return and not an arrival.
// ============================================================================
import type { Role } from '@/api/members';
import { ES } from '@/strings';

/** What Vender says once, as the big word of its confirmation. */
export interface Arrival {
  readonly word: string;
}

/** The line for her role in the shop she has just entered, or `null` for none. */
export function arrivalFor(role: Role | null, shopName: string | null): Arrival | null {
  if (role === 'owner') return { word: ES.arrival.opened };
  if (role === 'staff' && shopName !== null && shopName.trim() !== '') {
    return { word: ES.arrival.joined(shopName.trim()) };
  }
  return null;
}

let pending: Arrival | null = null;

/** The gate, as it sends her into the shop. */
export function announceArrival(arrival: Arrival | null): void {
  pending = arrival;
}

/** Vender, as it comes into view: the line once, then `null`. */
export function takeArrival(): Arrival | null {
  const taken = pending;
  pending = null;
  return taken;
}

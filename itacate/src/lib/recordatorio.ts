// ============================================================================
// HER REMINDER, 15 MINUTES BEFORE HER HOUR — WHICH ONES HER PHONE HOLDS, AND WHAT EACH
// SAYS. PURE. Plan task `10.5b-iii-b`, slice 3's design of 2026-11-05 (the family-shell
// page, stage 2: *"The neighbour, 15 minutes before her hour: scheduled by her own phone
// when she reserves. Nothing leaves it."*).
//
// ⚠️ ONE PER RESERVATION STILL TO COLLECT, whose moment has not passed: a plate she gave
// back, collected, or that the kitchen cancelled holds none — her phone is told again each
// time her reservations are read (`@/lib/avisos`, `@/lib/Recordatorios`), so a handover on
// the kitchen's phone takes hers away at the next read. An hour less than 15 minutes away
// has no reminder: she has just chosen it.
// ⚠️ ITS MOMENT IS HER HOUR AS THE DATABASE KEPT IT (`pickup_at`), an instant — never a time
// of day, so a reservation for tomorrow reminds her tomorrow.
// ⚠️ NOTHING LEAVES THE PHONE: no push token is asked for, and no server sends it.
// `test/calificar.test.ts` pins every rule.
// ============================================================================

import type { Apartado } from '@/api/apartados';
import { aLasDe } from '@/lib/apartados';
import { ES } from '@/strings';

/** How long before her hour. */
export const ANTES_MS = 15 * 60_000;

/** Every reminder of hers is scheduled under this — so the phone's other notifications are never touched. */
export const PREFIJO = 'apartado:';

/** Where a tap on one opens: her tickets. */
export const RUTA = '/apartados';

export interface Disparo {
  /** `PREFIJO` and the reservation's id: one per reservation. */
  readonly id: string;
  readonly cuando: Date;
  readonly titulo: string;
  readonly texto: string;
}

/** The reminders her phone should hold now: one per reservation still to collect, 15 minutes before her hour. */
export function disparosDe(apartados: readonly Apartado[], ahora: Date): Disparo[] {
  return apartados
    .filter((a) => a.estado === 'apartado' && a.hora.getTime() - ANTES_MS > ahora.getTime())
    .sort((a, b) => a.hora.getTime() - b.hora.getTime())
    .map((a) => ({
      id: `${PREFIJO}${a.id}`,
      cuando: new Date(a.hora.getTime() - ANTES_MS),
      titulo: ES.recordatorio.titulo(aLasDe(a.hora)),
      texto: ES.recordatorio.texto(a.cocina.nombre, a.codigo),
    }));
}

/** Only what is still ahead when the phone is told — a moment that passed while it waited is dropped. */
export function porVenir(disparos: readonly Disparo[], ahora: number): Disparo[] {
  return disparos.filter((d) => d.cuando.getTime() > ahora);
}

/** Where a tapped notification opens: one of hers opens her tickets; anything else, nothing. */
export function rutaDelToque(id: string): string | null {
  return id.startsWith(PREFIJO) ? RUTA : null;
}

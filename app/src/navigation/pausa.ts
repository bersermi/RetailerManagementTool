import { canWriteCatalog } from '@/api/catalogWrite';
import type { Role } from '@/api/members';

// ============================================================================
// TE LO COMPRO IS PAUSED. Plan task `10.0a`, the owner's ruling of 2026-10-27
// (*"Yes to both"*): hide it with one update over the air, and lift Merma's
// address gate until *Ofrecer* exists — which reverses his `8q` ruling of
// 2026-10-21. One value, read by the three screens that drew it, so pausing it
// was one update and resuming it is one line.
//
// ⚠️⚠️ PAUSED, NOT REMOVED. Every migration, RPC, the photo bucket, the requests
// shops already made and the screens' own code stay; the screens simply do not
// draw it. The answers are here (`R3`), so `app/test/pausa.test.ts` holds BOTH
// states: paused as shipped, and open exactly as it was before.
//
// WHAT IT HIDES: Merma's two doors, the switch between them, the request list
// and the address Merma asked before anything else — so Merma is *Tirar* for
// every role, as it always was for a cashier; Inicio's *Próxima recolección*
// and *Rescatado*; and the tutorial's Te lo compro sentence.
//
// ⚠️ THE TUTORIAL'S MERMA PICTURE IS NOT TIED TO THIS VALUE. Since `10.0a` it is
// a picture of *Tirar*, which is what Merma is while paused; resuming needs a
// new picture of whatever Merma's doors are by then.
//
// ⚠️ WHAT AN UPDATE CANNOT HIDE: the iPhone's camera-permission sentence names
// Te lo compro (`app/app.json`), a native string, so it waits for the major
// update (plan `10.8`); and a phone that installs a store build runs that
// build's own code on its FIRST launch — the update is what it runs from the
// second.
//
// ⚠️ `R9` — WHAT NO CHECK CAN SEE: that the screens obey these answers. The
// suite reads the decisions; whether Merma opens on Tirar, Inicio has no pickup
// card and the tutorial promises no pickup is the owner's phone (the plan's
// status entry for `10.0a` says what to look at).
//
// ⚠️⚠️ AND SINCE `5R-n` A SECOND VALUE, `PROXIMAMENTE` — the owner's ruling of
// 2026-11-17: Merma shows *Te lo compro* and *Ofrecer a las cocinas* as
// *Próximamente*, two grey rows with nothing to tap. **BUILT SWITCHED OFF**: an
// update reaches the 1.0 store builds and the 1.1 build Apple reviews runs its own
// code, and neither may show it; `5R-p` switches it on once both stores approve
// 1.1. `app/test/pausa.test.ts` holds both states.
// ============================================================================

/** Te lo compro in a version of Wera: drawn, or paused. */
export type Estado = 'abierto' | 'pausado';

/** ⚠️ THE ONE VALUE `10.0a` CHANGED — the owner's ruling of 2026-10-27. */
export const TE_LO_COMPRO: Estado = 'pausado';

/**
 * Does Merma draw its two doors, *Tirar* and *Te lo compro*, and the switch
 * between them? Open: for everyone but a cashier, whose Merma has always been
 * Tirar (`8l`) — a role not yet read gets the doors meanwhile, as before.
 * Paused: for nobody. Merma is Tirar.
 */
export function mermaConPuertas(estado: Estado, role: Role | null): boolean {
  return estado === 'abierto' && role !== 'staff';
}

/**
 * Does Merma ask for the store's address before anything else (`8q`, `0069`)?
 * Open: whenever the store has no complete address, whatever her role. Paused:
 * never — the address told Wera where to collect, and nothing collects.
 */
export function mermaPideDireccion(estado: Estado, sinDireccion: boolean): boolean {
  return estado === 'abierto' && sinDireccion;
}

/**
 * Does she see what Te lo compro did — the switch to it, the next pickup on
 * Inicio, *Rescatado*? Open: an owner or an Encargado, whose service it is
 * (`collection_request` answers a cashier with nothing). Paused: nobody.
 */
export function veTeLoCompro(estado: Estado, role: Role | null): boolean {
  return estado === 'abierto' && canWriteCatalog(role);
}

/** Merma's *Próximamente*, in a version of Wera: drawn, or not yet. */
export type Aviso = 'apagado' | 'encendido';

/** ⚠️ THE ONE VALUE `5R-p` CHANGES — off until both stores approve Wera 1.1. */
export const PROXIMAMENTE: Aviso = 'apagado';

/**
 * Does Merma draw *Próximamente* — *Te lo compro* and *Ofrecer a las cocinas*,
 * names only? Switched on, and only while Te lo compro is paused (open, its door
 * is the real thing), for an owner or an Encargado — whose services they would
 * be. ⚠️ NOT FOR AN EMPLEADO, decided on the owner's behalf in `5R-n`: her Merma
 * is her work, and a promise she cannot act on is the app talking past her —
 * the walkthrough's rule (`@/navigation/recorrido`). Nor a role not yet read.
 */
export function mermaProximamente(aviso: Aviso, estado: Estado, role: Role | null): boolean {
  return aviso === 'encendido' && estado === 'pausado' && canWriteCatalog(role);
}

/**
 * Does the tutorial's Merma card add *Wera te lo compra y pasa por él*? Open:
 * unless Wera already knows it cannot reach this store (`8g`). Paused: never —
 * a card promising a pickup nobody makes is the app talking past her.
 */
export function recorridoPrometeTeLoCompro(estado: Estado, sabeQueNoLlega: boolean): boolean {
  return estado === 'abierto' && !sabeQueNoLlega;
}

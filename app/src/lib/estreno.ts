// ============================================================================
// A NEW PHONE'S FIRST OPEN TAKES THE NEWEST UPDATE — plan task `5R-n`, the
// owner's question of 2026-11-17: *"Can't the user get the latest version out
// of the box?"*
//
// ⚠️ WHY IT IS NEEDED: a store build runs ITS OWN code on its first open, and
// the newest update only from the second (`@/navigation/pausa`'s header says
// so). A tester who installed Wera 1.0 from the App Store made his store on the
// code of 2026-10-21 — no walkthrough, *Te lo compro* open — although every
// later fix was published. So on THAT one launch, and only while nobody is
// signed in, the splash waits up to `ESPERA_MAXIMA_MS` for the update expo-updates
// is already looking for (its own check on launch, no second request), and the
// app reopens into it.
//
// ⚠️⚠️ A SHOP IS NEVER MADE TO WAIT: with somebody signed in nothing changes — a
// phone that updates its store build keeps opening as it always did, signal or
// none. And past the limit, with no signal or a slow one, the app opens on its
// own code as before; the download goes on and is used from the next open.
//
// ⚠️ IT WORKS FROM `5R-o`'S BUILDS ON: this file is the code a store build runs
// on its first open, so a 1.0 build cannot run it.
//
// ⚠️ THIS FILE DECIDES; `@/lib/useEstreno` ACTS (`R3`). `app/test/estreno.test.ts`
// reads every answer. Whether a phone really waits, reopens and lands on the new
// code is `R9`'s — the emulator's copy of a build, and his phones in `5R-p`.
// ============================================================================

/** The longest a first open waits for the newest update, from this launch's JavaScript start. */
export const ESPERA_MAXIMA_MS = 5_000;

/** What `pasoDe` is asked, each a value expo-updates or the session already holds. */
export interface Arranque {
  /** expo-updates runs here: a build, not Metro or a web build. */
  readonly activo: boolean;
  /** This launch runs the code inside the build, not a downloaded update. */
  readonly embebido: boolean;
  /** The stored session: not looked for yet, nobody, or somebody signed in. */
  readonly sesion: 'sinLeer' | 'nadie' | 'alguien';
  /** Its own check on launch, or that check's download, is still running. */
  readonly buscando: boolean;
  /** A newer update is downloaded and waits for the app to reopen. */
  readonly lista: boolean;
  /** Milliseconds since this launch's JavaScript started. */
  readonly ms: number;
  /**
   * ⚠️ THE RELOAD WAS ASKED FOR ALREADY. Measured on the emulator (2026-11-17):
   * as expo-updates restarts, it RESETS its state — nothing checking, nothing
   * pending — and a decision read again from that opened the app on the old code
   * for the few hundred milliseconds before the restart, where the welcome's
   * mount spent the once-per-phone opening. Once asked, the answer holds.
   */
  readonly recargando: boolean;
}

/** Open on this code, keep the splash up a moment more, or reopen into the update. */
export type Paso = 'abrir' | 'esperar' | 'recargar';

/**
 * ⚠️ THE ORDER IS THE DESIGN. Anything but a first open on a build's own code
 * opens at once; so does anybody signed in. An update already downloaded is
 * opened even at the limit's edge — the splash is still up; past the limit she
 * is never kept; until the session is read nothing is decided; while the check
 * runs, the splash waits; a check that found nothing, or failed, opens.
 */
export function pasoDe(a: Arranque): Paso {
  if (!a.activo || !a.embebido) return 'abrir';
  if (a.recargando) return 'recargar';
  if (a.sesion === 'alguien') return 'abrir';
  if (a.lista && a.sesion === 'nadie') return 'recargar';
  if (a.ms >= ESPERA_MAXIMA_MS) return 'abrir';
  if (a.sesion === 'sinLeer') return 'esperar';
  if (a.buscando) return 'esperar';
  return 'abrir';
}

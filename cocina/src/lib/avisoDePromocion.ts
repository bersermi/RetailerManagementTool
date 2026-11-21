import { NOTA } from '@/theme/movimiento';
import { ES } from '@/strings';

// ============================================================================
// *AVISAR A QUIENES TE SIGUEN* — WHEN THE ALERT IS SENT, AND WHAT ITS SWITCH SAYS. PURE. Plan task
// `10.9h-ii`, on `0094`'s `alert_promotion` (`10.9h-i`), as the family-shell page draws *Nueva promoción*
// (`promoForm`: *Avisar a quienes te siguen* · *38 vecinos · un solo aviso, al publicarla*, on at first).
//
// ⚠️ AFTER *DESHACER*, NEVER BEFORE IT: `alert_promotion` queues the message at once and the database's job
// sends it within the minute — so an alert asked for as she publishes could reach her neighbours while her
// *Deshacer* is still on screen, for a promotion she then took back (and, one a day, the corrected one would
// wait for tomorrow). It is asked once *Deshacer*'s eight seconds are over, with a margin (`ESPERA_MS`);
// *Deshacer* tapped stops it; *Deshacer* refused (her promotion stands) sends it at once.
// ⚠️ A RETRY IS THE SAME ALERT (`0094`): a failed call — a signal lost — is tried again (`INTENTOS`), never
// shown to her: her promotion is published either way. A refusal (an answer with its code — `22023`, the
// promotion ended meanwhile) is not tried again (`seReintenta`).
// ⚠️ A PHONE CLOSED BEFORE THE WAIT ENDS SENDS NO ALERT — as `10.9h-i` ruled for a signal lost between
// publishing and the alert (its status entry, decision (a)). The promotion is on her page regardless.
// `test/avisoDePromocion.test.ts` drives every path with a fake clock.
// ============================================================================

/** *Deshacer*'s eight seconds and a margin: a tap at its last moment still stops the alert. */
export const ESPERA_MS = NOTA.conDeshacer + 2_000;
/** A failed call is tried this many times in all, this far apart. */
export const INTENTOS = 3;
export const ENTRE_INTENTOS_MS = 20_000;

/** An alert waiting for *Deshacer*'s eight seconds. */
export interface AvisoPendiente {
  /** *Deshacer* tapped: it is not sent — unless `yaMismo` follows. */
  readonly cancelar: () => void;
  /** *Deshacer* refused — her promotion stands: it is sent now. */
  readonly yaMismo: () => void;
}

/** The clock it waits on — the phone's, or a test's. */
export interface Reloj {
  readonly setTimeout: (hacer: () => void, ms: number) => unknown;
  readonly clearTimeout: (id: unknown) => void;
}

/** A database's refusal carries its SQLSTATE; a lost signal carries none — only that one is tried again. */
export function seReintenta(falla: unknown): boolean {
  const code = typeof falla === 'object' && falla !== null ? (falla as { code?: unknown }).code : undefined;
  return !(typeof code === 'string' && code !== '');
}

const DEL_TELEFONO: Reloj = {
  setTimeout: (hacer, ms) => setTimeout(hacer, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

/**
 * Send the alert once *Deshacer*'s time is over — `enviar` is `alert_promotion` for her kitchen and her
 * promotion. Sent once at most: after it started, `cancelar` and `yaMismo` change nothing (a promotion undone
 * by then is dropped by the database before it goes: the alert's gate asks whether it is still shown).
 */
export function avisarDespues(
  enviar: () => Promise<unknown>,
  { espera = ESPERA_MS, intentos = INTENTOS, entre = ENTRE_INTENTOS_MS, reloj = DEL_TELEFONO } = {},
): AvisoPendiente {
  let estado: 'esperando' | 'cancelado' | 'enviado' = 'esperando';
  let reloj1: unknown = null;

  const intentar = (n: number): void => {
    enviar().catch((falla: unknown) => {
      if (n < intentos && seReintenta(falla)) reloj.setTimeout(() => intentar(n + 1), entre);
      else console.warn(`[promociones] the alert was not sent after ${n} tries: ${String(falla)}`);
    });
  };
  const ir = (): void => {
    if (estado === 'enviado') return;
    estado = 'enviado';
    if (reloj1 !== null) reloj.clearTimeout(reloj1);
    intentar(1);
  };

  reloj1 = reloj.setTimeout(() => {
    if (estado === 'esperando') ir();
  }, espera);

  return {
    cancelar: () => {
      if (estado !== 'esperando') return;
      estado = 'cancelado';
      if (reloj1 !== null) reloj.clearTimeout(reloj1);
    },
    yaMismo: () => {
      if (estado === 'cancelado' || estado === 'esperando') ir();
    },
  };
}

/** Under the switch: *38 vecinos · un solo aviso, al publicarla* — the count only from one follower, as *Hoy*'s *Te siguen*. */
export function detalleDelAviso(teSiguen: number | null | undefined): string {
  return typeof teSiguen === 'number' && teSiguen > 0 ? ES.nuevaPromocion.avisarConCuantos(teSiguen) : ES.nuevaPromocion.avisarSinCuantos;
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ENTRE_INTENTOS_MS, ESPERA_MS, INTENTOS, avisarDespues, seReintenta } from '@/lib/avisoDePromocion';
import { NOTA } from '@/theme/movimiento';

// ============================================================================
// *AVISAR A QUIENES TE SIGUEN* — WHEN THE ALERT IS ASKED FOR. Plan task `10.9h-ii`, on `0094`'s
// `alert_promotion`. The phone's own timers, under a fake clock: never inside *Deshacer*'s eight seconds,
// stopped by *Deshacer*, sent at once when *Deshacer* is refused, a lost signal tried again, a refusal not.
// ⚠️ WHAT THIS CANNOT SEE: the toast and the form on a phone (the session's emulator walk), nor whether the
// database sends it to anyone (`supabase/tests/0094_the_services_messages.sql`).
// ============================================================================

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** A refusal as supabase-js hands it over: its SQLSTATE in `code`. A lost signal's `code` is empty. */
const rechazo = (code: string) => Object.assign(new Error('refused'), { code });

describe('the wait', () => {
  it('outlasts Deshacer’s eight seconds, with a margin for a tap at its last moment', () => {
    expect(NOTA.conDeshacer).toBe(8_000);
    expect(ESPERA_MS).toBe(10_000);
    expect(ESPERA_MS).toBeGreaterThan(NOTA.conDeshacer);
  });

  it('nothing is asked while Deshacer is on screen; once, when it is over', async () => {
    const enviar = vi.fn().mockResolvedValue({ offered: true, alerted: true });
    avisarDespues(enviar);
    await vi.advanceTimersByTimeAsync(NOTA.conDeshacer);
    expect(enviar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(ESPERA_MS - NOTA.conDeshacer);
    expect(enviar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(enviar).toHaveBeenCalledTimes(1);
  });
});

describe('Deshacer', () => {
  it('tapped: never asked', async () => {
    const enviar = vi.fn().mockResolvedValue({});
    const aviso = avisarDespues(enviar);
    await vi.advanceTimersByTimeAsync(7_900);
    aviso.cancelar();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(enviar).not.toHaveBeenCalled();
  });

  it('refused — her promotion stands: asked at once, and only once', async () => {
    const enviar = vi.fn().mockResolvedValue({});
    const aviso = avisarDespues(enviar);
    await vi.advanceTimersByTimeAsync(5_000);
    aviso.cancelar();
    await vi.advanceTimersByTimeAsync(3_000);
    aviso.yaMismo();
    await vi.advanceTimersByTimeAsync(0);
    expect(enviar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    aviso.yaMismo();
    aviso.cancelar();
    await vi.advanceTimersByTimeAsync(0);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('sent at once while waiting: the wait’s own turn sends nothing more', async () => {
    const enviar = vi.fn().mockResolvedValue({});
    const aviso = avisarDespues(enviar);
    aviso.yaMismo();
    await vi.advanceTimersByTimeAsync(ESPERA_MS * 3);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('tapped after it was asked: changes nothing here — the database drops it while the promotion is no longer shown', async () => {
    const enviar = vi.fn().mockResolvedValue({});
    const aviso = avisarDespues(enviar);
    await vi.advanceTimersByTimeAsync(ESPERA_MS);
    aviso.cancelar();
    aviso.yaMismo();
    await vi.advanceTimersByTimeAsync(ESPERA_MS);
    expect(enviar).toHaveBeenCalledTimes(1);
  });
});

describe('a failed call', () => {
  it('a lost signal is tried again, apart — a retry is the same alert', async () => {
    const enviar = vi.fn().mockRejectedValueOnce(rechazo('')).mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue({});
    avisarDespues(enviar);
    await vi.advanceTimersByTimeAsync(ESPERA_MS);
    expect(enviar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(ENTRE_INTENTOS_MS - 1);
    expect(enviar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(enviar).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(ENTRE_INTENTOS_MS);
    expect(enviar).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(enviar).toHaveBeenCalledTimes(3);
  });

  it('it gives up after its tries, never shown to her — said in the log', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const enviar = vi.fn().mockRejectedValue(new TypeError('Network request failed'));
    avisarDespues(enviar);
    await vi.advanceTimersByTimeAsync(ESPERA_MS + ENTRE_INTENTOS_MS * 10);
    expect(enviar).toHaveBeenCalledTimes(INTENTOS);
    expect(INTENTOS).toBe(3);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('after 3 tries');
  });

  it('a refusal is not tried again — 22023, the promotion ended meanwhile; 42501, not hers', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const code of ['22023', '42501']) {
      const enviar = vi.fn().mockRejectedValue(rechazo(code));
      avisarDespues(enviar);
      await vi.advanceTimersByTimeAsync(ESPERA_MS + ENTRE_INTENTOS_MS * 10);
      expect(enviar, code).toHaveBeenCalledTimes(1);
    }
  });

  it('what is tried again: no code, or an empty one — never an answer with its code', () => {
    expect(seReintenta(new TypeError('Network request failed'))).toBe(true);
    expect(seReintenta({ message: 'TypeError: Network request failed', code: '' })).toBe(true);
    expect(seReintenta(null)).toBe(true);
    expect(seReintenta('x')).toBe(true);
    expect(seReintenta({ code: '22023' })).toBe(false);
    expect(seReintenta({ code: 'PGRST202' })).toBe(false);
  });
});

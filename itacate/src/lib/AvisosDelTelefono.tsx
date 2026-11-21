import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { countCampaignTap, countNotificationTap, registerPushToken } from '@/api/calls';
import { COCINAS_KEY } from '@/api/cocinas';
import { useAvisos } from '@/api/hooks';
import { registerArgs, type Aviso } from '@/api/push';
import { SIGUIENDO_KEY } from '@/api/siguiendo';
import { TARJETAS_KEY } from '@/api/tarjeta';
import { useAuth } from '@/auth/AuthProvider';
import {
  alCambiarElToken,
  alConcederPermiso,
  alLlegarUnAviso,
  alTocarUnAviso,
  hacerCanales,
  leerCanales,
  leerPermisoDelTelefono,
  plataforma,
  tokenDelTelefono,
} from '@/lib/avisos';
import { esOtroToken, guardarToken, leerToken, queDecir, queLeerOtraVez, reemplaza, type Permiso } from '@/lib/avisosPush';
import { deviceStore } from '@/lib/store';
import { useAlAbrir } from '@/lib/useAlAbrir';

// ============================================================================
// HER PHONE AND THE DATABASE'S MESSAGES, ON EACH OPEN. Plan task `10.5c-iii` (`0092`–`0094`): Wera
// Cocina's `@/lib/useAvisosDelTelefono` (`10.5b-v-ii`), cut to Itacate. Mounted with the tabs, which stay
// while she is signed in (`(vecino)/(tabs)/_layout`), beside her reminders; draws nothing.
//
// ON EACH LAUNCH AND EACH RETURN TO THE FRONT (`useAlAbrir`), once the kinds are read:
//   1. the kinds' Android channels are made (idempotent);
//   2. the database is told this phone's token, whether the phone allows notifications, the channels
//      it holds and those she silenced — and the token it replaces, if it changed.
// ⚠️ IT NEVER ASKS THE PHONE — Itacate asks only when what it is for is on the screen (`@/lib/avisosPush`) — ⚠️ BUT A
// GRANT MADE THERE RUNS ITS STEPS AT ONCE (`@/lib/avisos`' `alConcederPermiso`): Android's dialog is no open, and
// without it the phone stayed unknown to the database until the next one (found on the emulator, this row).
// ⚠️ WITH NO SIGNAL NOTHING HAPPENS: no kinds are read, no channel is made, nothing is sent; the
// next open tries again. A failure is never shown.
// ⚠️ A MESSAGE THAT ARRIVES WHILE THE APP IS IN FRONT reads again at once what it is about — her cards
// (so *¡Ganaste!* celebrates on the screen, `@/lib/Festejos`) or the kitchens; A TAP reads it again too,
// opens what it names (`@/lib/avisosPush`' `destinoDelToque`), and is counted: a campaign's with its
// send's number (`count_campaign_tap` — kept only while she is counted), a service or on-request kind's as
// plus one with nobody (`count_notification_tap`); a promotion's alert carries no send and is counted by
// neither.
// ⚠️ ASKING EXPO FOR THE TOKEN MAKES THE PHONE ANNOUNCE IT (Wera Cocina's emulator, 2026-11-20): only a token
// DIFFERENT from one already announced is a change, and each open's steps run one after another, never
// cancelling each other — a run is dropped only when she has signed out.
// NO CHECK CAN SEE A MESSAGE ARRIVE (ADR-035 §2.11): a phone is the instrument.
// ============================================================================

/** One open's steps: channels, and what the database is told. */
async function decirAlServidor(userId: string, kinds: readonly Aviso[], sigue: () => boolean): Promise<void> {
  const store = deviceStore();
  await hacerCanales(kinds);
  const permiso: Permiso | null = await leerPermisoDelTelefono();
  const nuevo = permiso?.concedido === true ? await tokenDelTelefono() : null;
  const guardado = leerToken(store);
  const decir = queDecir(userId, permiso, nuevo, guardado);
  if (decir === null || !sigue()) return;
  const { channels, silenced } = await leerCanales();
  try {
    await registerPushToken(
      registerArgs(decir.token, plataforma(), decir.allowed, channels, silenced, reemplaza(guardado, userId, decir.token)),
    );
    guardarToken(store, userId, decir.token);
  } catch (falla) {
    console.warn(`[avisos] the database was not told this phone's token: ${String(falla)}`);
  }
}

export function AvisosDelTelefono() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const avisos = useAvisos();
  const abierta = useAlAbrir();
  const queries = useQueryClient();
  const [tokenCambio, setTokenCambio] = useState(0);
  // A permission granted from a screen — the database is told now, not at the next open.
  const [concedido, setConcedido] = useState(0);
  // Whose phone it is now — `null` once she signed out, so a run still in flight tells nothing.
  const quien = useRef<string | null>(userId);
  const cola = useRef<Promise<void>>(Promise.resolve());
  const ultimoAnunciado = useRef<string | null>(null);
  // The kinds as last read — a tap on a promotion kind with no send is counted by nothing.
  const kinds = useRef<readonly Aviso[]>([]);
  kinds.current = avisos.data ?? kinds.current;

  useEffect(() => {
    quien.current = userId;
    return () => {
      quien.current = null;
    };
  }, [userId]);

  useEffect(() => {
    if (userId === null || avisos.data === undefined) return;
    const kinds = avisos.data;
    cola.current = cola.current.then(() => decirAlServidor(userId, kinds, () => quien.current === userId)).catch(() => {});
  }, [userId, avisos.data, abierta, tokenCambio, concedido]);

  useEffect(() => alConcederPermiso(() => setConcedido((n) => n + 1)), []);

  useEffect(() => {
    if (userId === null) return;
    const leerOtraVez = (abre: string | null) => {
      const que = queLeerOtraVez(abre);
      if (que === 'tarjetas') void queries.invalidateQueries({ queryKey: TARJETAS_KEY });
      if (que === 'cocinas') {
        void queries.invalidateQueries({ queryKey: COCINAS_KEY });
        void queries.invalidateQueries({ queryKey: SIGUIENDO_KEY });
      }
    };
    const dejarDeOir = alLlegarUnAviso(leerOtraVez);
    const dejarDeTocar = alTocarUnAviso((destino, kind, envio) => {
      if (destino !== null) {
        leerOtraVez(destino.pathname === '/cocina/[id]' ? 'cocina' : null);
        router.navigate(destino as Parameters<typeof router.navigate>[0]);
      }
      if (envio !== null) countCampaignTap(envio).catch(() => {});
      else if (kinds.current.find((a) => a.kind === kind)?.clase !== 'promocion') countNotificationTap(kind).catch(() => {});
    });
    // ⚠️ Only a token different from one already announced: our own fetch announces the same one.
    const dejarElToken = alCambiarElToken((anunciado) => {
      const antes = ultimoAnunciado.current;
      ultimoAnunciado.current = anunciado;
      if (esOtroToken(antes, anunciado)) setTokenCambio((n) => n + 1);
    });
    return () => {
      dejarDeOir();
      dejarDeTocar();
      dejarElToken();
    };
  }, [userId, queries]);

  return null;
}

/** What the phone says of notifications, read again on each open — for *Notificaciones*' switches. */
export function usePermisoDeAvisos(): { readonly permiso: Permiso | null; readonly leerOtraVez: () => void } {
  const abierta = useAlAbrir();
  const [permiso, setPermiso] = useState<Permiso | null>(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let vivo = true;
    void leerPermisoDelTelefono().then((p) => {
      if (vivo) setPermiso(p);
    });
    return () => {
      vivo = false;
    };
  }, [abierta, vez]);
  return { permiso, leerOtraVez: () => setVez((n) => n + 1) };
}

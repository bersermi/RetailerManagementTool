import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { APARTADOS_KEY } from '@/api/apartados';
import { countNotificationTap, registerPushToken } from '@/api/calls';
import { useAvisos } from '@/api/hooks';
import { registerArgs } from '@/api/push';
import { useAuth } from '@/auth/AuthProvider';
import {
  alCambiarElToken,
  alLlegarUnAviso,
  alTocarUnAviso,
  hacerCanales,
  leerCanales,
  leerPermisoDelTelefono,
  mostrarAvisosEnFrente,
  pedirPermisoParaAvisos,
  plataforma,
  tokenDelTelefono,
} from '@/lib/avisos';
import { esOtroToken, guardarToken, hayQuePreguntar, leerToken, PREGUNTADO_KEY, queDecir, reemplaza, type Permiso } from '@/lib/avisosPush';
import { deviceStore, readKey, writeKey } from '@/lib/store';
import { useAlAbrir } from '@/lib/useGoogle';

// ============================================================================
// HER PHONE AND HER KITCHEN'S MESSAGES, ON EACH OPEN. Plan task `10.5b-v-ii` (call 14; `0092`).
// Mounted in the tabs' layout, which stays while she is signed in to a kitchen.
//
// ON EACH LAUNCH AND EACH RETURN TO THE FRONT (`useAlAbrir`), once the kinds are read:
//   1. the kinds' Android channels are made (idempotent);
//   2. ONCE, after her kitchen's first publication, the phone is asked (`hayQuePreguntar`);
//   3. the database is told this phone's token, whether the phone allows notifications, the
//      channels it holds and those she silenced — and the token it replaces, if it changed.
// ⚠️ WITH NO SIGNAL NOTHING HAPPENS: no kinds are read, no channel is made, nothing is sent; the
// next open tries again. A failure is never shown — *Apartados* always shows everything.
// ⚠️ WHILE THE APP IS IN FRONT a message is shown (SDK 57 drops it otherwise) and her reservations
// are read again at once; A TAP reads them again too, opens what its kind says (*Apartados*; since `10.9h-ii` the
// nudge's *Publicar*, `@/lib/avisosPush`' `RUTAS`) and adds one to the kind's count,
// nobody kept.
// ⚠️ MEASURED ON THE EMULATOR WHILE THIS ROW WAS BUILT: ASKING EXPO FOR THE TOKEN MAKES THE PHONE ANNOUNCE
// ITS TOKEN (`@/lib/avisos`' `alCambiarElToken` hears it), so a listener that re-ran this hook on every announcement
// re-ran it on its own fetch, and the first version cancelled each run before it registered — a loop, and
// no token ever reached the database. Now (1) only a token DIFFERENT from one already announced counts as
// a change, and (2) each open's steps run one after another, never cancelling each other; a run is
// dropped only when she has signed out (the login it was for is no longer the one here).
// NO CHECK CAN SEE A MESSAGE ARRIVE (ADR-035 §2.11): a phone is the instrument.
// ============================================================================

/** One open's steps: channels, the one question, and what the database is told. */
async function decirAlServidor(
  userId: string,
  kinds: Parameters<typeof hacerCanales>[0],
  publicoAlgunaVez: boolean,
  sigue: () => boolean,
): Promise<void> {
  const store = deviceStore();
  await hacerCanales(kinds);
  let permiso: Permiso | null = await leerPermisoDelTelefono();
  if (hayQuePreguntar(publicoAlgunaVez, readKey(store, PREGUNTADO_KEY) !== null, permiso)) {
    writeKey(store, PREGUNTADO_KEY, '1');
    await pedirPermisoParaAvisos(kinds);
    permiso = await leerPermisoDelTelefono();
  }
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

export function useAvisosDelTelefono(publicoAlgunaVez: boolean): void {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const avisos = useAvisos();
  const abierta = useAlAbrir();
  const queries = useQueryClient();
  const [tokenCambio, setTokenCambio] = useState(0);
  // Whose phone it is now — `null` once she signed out, so a run still in flight tells nothing.
  const quien = useRef<string | null>(userId);
  const cola = useRef<Promise<void>>(Promise.resolve());
  const ultimoAnunciado = useRef<string | null>(null);

  useEffect(() => {
    quien.current = userId;
    return () => {
      quien.current = null;
    };
  }, [userId]);

  useEffect(() => {
    if (userId === null || avisos.data === undefined) return;
    const kinds = avisos.data;
    cola.current = cola.current
      .then(() => decirAlServidor(userId, kinds, publicoAlgunaVez, () => quien.current === userId))
      .catch(() => {});
  }, [userId, avisos.data, abierta, publicoAlgunaVez, tokenCambio]);

  useEffect(() => {
    if (userId === null) return;
    const dejarDeMostrar = mostrarAvisosEnFrente();
    const dejarDeOir = alLlegarUnAviso(() => {
      void queries.invalidateQueries({ queryKey: APARTADOS_KEY });
    });
    // ⚠️ A tap reads her reservations again too: on a phone whose app was gone, the copy kept on it is from
    // before the message — measured on the emulator, the new plate took half a minute to appear.
    const dejarDeTocar = alTocarUnAviso((ruta, kind) => {
      void queries.invalidateQueries({ queryKey: APARTADOS_KEY });
      router.navigate(ruta);
      countNotificationTap(kind).catch(() => {});
    });
    // ⚠️ Only a token different from one already announced: our own fetch announces the same one.
    const dejarElToken = alCambiarElToken((anunciado) => {
      const antes = ultimoAnunciado.current;
      ultimoAnunciado.current = anunciado;
      if (esOtroToken(antes, anunciado)) setTokenCambio((n) => n + 1);
    });
    return () => {
      dejarDeMostrar();
      dejarDeOir();
      dejarDeTocar();
      dejarElToken();
    };
  }, [userId, queries]);
}

/** What the phone says of notifications, read again on each open — for *Mi cocina*'s switch. */
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

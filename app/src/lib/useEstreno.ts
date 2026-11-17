// ============================================================================
// A FIRST OPEN WAITS FOR THE NEWEST UPDATE — the half of `@/lib/estreno` that
// acts, plan task `5R-n`. Called once, by the root layout, inside the session's
// provider: until it answers `true` no screen is mounted and the splash stays
// up (`@/lib/splash`'s `holdSplashForUpdate`, armed by the root layout's module
// before the first render on exactly the launches that may wait).
//
// ⚠️ IT ASKS THE SERVER NOTHING. expo-updates checks for an update by itself on
// every launch and downloads what it finds (`app.json`'s defaults); `useUpdates`
// reports that check, and this only waits on it — so a first open makes no
// request a later open does not make.
//
// ⚠️ ONCE IT HAS OPENED, IT NEVER REOPENS: an update that arrives while she is
// looking at the screen waits for the next launch, as every update always has.
//
// ⚠️⚠️ THE SPLASH ON SUCH A LAUNCH: `esperaConElSplash` holds it with no safety of
// its own, and `holdSplash` (`@/lib/splash`, unchanged — Wera Cocina's copy is
// held to it byte for byte) is called when the wait ends, so the screen that then
// mounts gets the usual `SPLASH_SAFETY_MS` and the welcome lets go once its cow is
// in. ⚠️ THE WAIT ENDS BY ITSELF, a second past its limit, whatever this hook did:
// a splash that never lets go is an app that never opens.
// ============================================================================

import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { ESPERA_MAXIMA_MS, pasoDe, type Paso } from '@/lib/estreno';
import { holdSplash } from '@/lib/splash';
import { PALETTE } from '@/theme/palette';

/** When this launch's JavaScript started, near enough: this module is read before the first render. */
const ARRANCO = Date.now();
/** A reload asked for and not come by then never will: open on this code. */
const RECARGA_MAXIMA_MS = 3_000;

/** May this launch wait at all? A build's own code, with expo-updates running. Read before the first render. */
export function puedeEsperar(): boolean {
  return Updates.isEnabled && Updates.isEmbeddedLaunch && !__DEV__;
}

/** In place of `holdSplash`, before the first render of a launch that may wait. */
export function esperaConElSplash(): void {
  void SplashScreen.preventAutoHideAsync().catch(() => {});
  setTimeout(holdSplash, ESPERA_MAXIMA_MS + 1_000);
}

/** `true` once the app may open — at once on every launch but a first open with nobody signed in. */
export function useEstreno(): boolean {
  const { session, ready } = useAuth();
  const estado = Updates.useUpdates();
  const [, otraVez] = useState(0);
  const abierto = useRef(!puedeEsperar());

  const paso: Paso = abierto.current
    ? 'abrir'
    : pasoDe({
        activo: Updates.isEnabled && !__DEV__,
        embebido: Updates.isEmbeddedLaunch,
        sesion: !ready ? 'sinLeer' : session === null ? 'nadie' : 'alguien',
        buscando: estado.isStartupProcedureRunning || estado.isChecking || estado.isDownloading,
        lista: estado.isUpdatePending,
        ms: Date.now() - ARRANCO,
      });
  if (paso === 'abrir') abierto.current = true;

  useEffect(() => {
    if (paso === 'abrir') {
      holdSplash();
      return undefined;
    }
    if (paso === 'recargar') {
      // ⚠️ THE RELOAD'S OWN SCREEN IS THE SPLASH'S GROUND with no spinner: if the
      // native splash is gone by then, the moment between the two codes is the
      // same cream, never expo-updates' white page with a wheel.
      // A reload refused, or one that never comes, opens on this code — as any
      // launch without the wait — rather than leaving her on an empty screen.
      const abrir = () => {
        abierto.current = true;
        otraVez((n) => n + 1);
      };
      const nunca = setTimeout(abrir, RECARGA_MAXIMA_MS);
      void Updates.reloadAsync({
        reloadScreenOptions: { backgroundColor: PALETTE.fondo, spinner: { enabled: false } },
      }).catch(abrir);
      return () => clearTimeout(nunca);
    }
    // Asked again at the limit, whatever expo-updates says meanwhile.
    const timer = setTimeout(() => otraVez((n) => n + 1), Math.max(0, ESPERA_MAXIMA_MS - (Date.now() - ARRANCO)) + 50);
    return () => clearTimeout(timer);
  }, [paso]);

  return paso === 'abrir';
}

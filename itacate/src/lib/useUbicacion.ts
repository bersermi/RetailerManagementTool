// ============================================================================
// ASKING HER PHONE WHERE SHE IS — ONLY WHILE THE APP IS OPEN. Plan task
// `10.5-iv-a-i`. Every decision about the answer is `@/lib/ubicacion`'s, pure; this
// file only asks `expo-location`, which was in this app's first build (`10.2a`).
//
// ⚠️ THE RULINGS IT CARRIES OUT: on opening, the last known location, then a fresh
// one; while the app is open, a watch that sorts the list again as she walks
// (`CADA_METROS`); and the whole question again when she pulls the list or the app
// comes back to the front — her answer in Settings included. ⚠️ HER LOCATION NEVER
// LEAVES THE PHONE: it is handed to the list and to nothing else (the owner's
// ruling of 2026-11-04, night).
//
// ⚠️ THE PERMISSION IS ASKED FOR ONCE — only while the phone has never been asked.
// A neighbour who said no is not asked again at every return; she has her postal
// code, and *Usar mi ubicación* under its box (`usarUbicacion`, `@/lib/ubicacion`'s
// `comoPedirla`): it asks again where the phone still allows it, else opens Itacate's
// page in Settings. ⚠️ A REQUEST THAT FAILS IS NOT A *NO*: found on the emulator, a
// phone whose permission screen was frozen answered *denied* with no dialog shown —
// a call that throws reads as *not found*, and the button asks again.
//
// ⚠️ NEVER GOOGLE'S *LOCATION ACCURACY* PROMPT (`mayShowUserSettingsDialog: false`):
// Android's default answers a balanced fix with Google Play's dialog asking her to let
// Google *"periodically process information about device sensors and wireless
// signals"* — seen twice on the emulator, once per call. The list needs a fix to
// about 50 m, which her GPS gives; that consent is not Itacate's to ask for.
// ⚠️ AND SO *HIGH* ACCURACY, NOT *BALANCED*: on Android a balanced request is served
// by Google's network location, which that same prompt turns on — without it no GPS
// runs, and on the emulator the walk to another city never reached the list (its
// GPS kept the first fix). High asks the GPS, with or without Google's; it costs
// battery only while the app is open, and the watch reports every 50 m at most.
//
// ⚠️ THE WATCH STOPS IN THE BACKGROUND: `app.json` blocks background location on
// Android and carries no *always* sentence on an iPhone, and the watch is removed
// whenever the app leaves the front. NO CHECK CAN SEE ANY OF THIS (ADR-035 §2.11):
// the phone is its instrument. (The clock the list reads, `useAhora`, is a module of
// its own since `10.5-iv-a-ii`: the two pages read it and must not import this one.)
// ============================================================================

import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import {
  CADA_METROS,
  CADA_MS,
  ESPERA_MS,
  ULTIMA_VALE_MS,
  comoPedirla,
  permisoDe,
  type DondeEstoy,
} from '@/lib/ubicacion';

/** A promise that gives up after `ms`. */
function conPlazo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const reloj = setTimeout(() => reject(new Error('sin respuesta')), ms);
    promesa.then(
      (valor) => {
        clearTimeout(reloj);
        resolve(valor);
      },
      (falla: unknown) => {
        clearTimeout(reloj);
        reject(falla instanceof Error ? falla : new Error(String(falla)));
      },
    );
  });
}

export function useDondeEstoy(): {
  readonly donde: DondeEstoy;
  readonly otraVez: () => void;
  readonly usarUbicacion: () => void;
} {
  const [donde, setDonde] = useState<DondeEstoy>({ kind: 'buscando' });
  const [vuelta, setVuelta] = useState(0);
  const [enFrente, setEnFrente] = useState(AppState.currentState !== 'background');
  const [puedePreguntar, setPuedePreguntar] = useState(true);
  const otraVez = useCallback(() => setVuelta((n) => n + 1), []);

  /** *Usar mi ubicación*: ask again where the phone allows it, else her app's page in Settings. */
  const usarUbicacion = useCallback(() => {
    if (donde.kind !== 'sin-permiso' && donde.kind !== 'aproximada' && donde.kind !== 'sin-ubicacion') return;
    const como = comoPedirla(donde.kind, puedePreguntar);
    if (como === 'ajustes') {
      void Linking.openSettings();
      return;
    }
    if (como === 'otra-vez') {
      otraVez();
      return;
    }
    void Location.requestForegroundPermissionsAsync()
      .catch((falla: unknown) => console.warn(`[ubicacion] the request failed: ${String(falla)}`))
      .finally(otraVez);
  }, [donde.kind, puedePreguntar, otraVez]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        setEnFrente(true);
        setVuelta((n) => n + 1);
      } else if (estado === 'background') {
        setEnFrente(false);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enFrente) return;
    let vivo = true;
    let reloj: Location.LocationSubscription | null = null;
    const aqui = (posicion: Location.LocationObject) => {
      if (vivo) setDonde({ kind: 'aqui', punto: { latitude: posicion.coords.latitude, longitude: posicion.coords.longitude } });
    };

    void (async () => {
      const noSe = (falla: unknown) => {
        console.warn(`[ubicacion] the phone could not be asked: ${String(falla)}`);
        return null;
      };
      let permiso = await Location.getForegroundPermissionsAsync().catch(noSe);
      if (permiso !== null && !permiso.granted && permiso.status === 'undetermined') {
        permiso = await Location.requestForegroundPermissionsAsync().catch(noSe);
      }
      if (!vivo) return;
      if (permiso === null) return setDonde({ kind: 'sin-ubicacion' });
      setPuedePreguntar(permiso.canAskAgain);
      const cual = permisoDe(permiso);
      if (cual === 'negada') return setDonde({ kind: 'sin-permiso' });
      if (cual === 'aproximada') return setDonde({ kind: 'aproximada' });
      if (!(await Location.hasServicesEnabledAsync().catch(() => false))) {
        if (vivo) setDonde({ kind: 'sin-ubicacion' });
        return;
      }
      const ultima = await Location.getLastKnownPositionAsync({ maxAge: ULTIMA_VALE_MS }).catch(() => null);
      if (ultima !== null) aqui(ultima);
      const fresca = await conPlazo(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: false }),
        ESPERA_MS,
      ).catch(() => null);
      if (!vivo) return;
      if (fresca !== null) aqui(fresca);
      else if (ultima === null) setDonde((antes) => (antes.kind === 'aqui' ? antes : { kind: 'sin-ubicacion' }));
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: CADA_METROS, timeInterval: CADA_MS, mayShowUserSettingsDialog: false },
        aqui,
      ).catch(() => null);
      if (vivo) reloj = sub;
      else sub?.remove();
    })();

    return () => {
      vivo = false;
      reloj?.remove();
    };
  }, [vuelta, enFrente]);

  return { donde, otraVez, usarUbicacion };
}

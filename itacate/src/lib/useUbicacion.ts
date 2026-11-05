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
// code, and Settings.
//
// ⚠️ THE WATCH STOPS IN THE BACKGROUND: `app.json` blocks background location on
// Android and carries no *always* sentence on an iPhone, and the watch is removed
// whenever the app leaves the front. NO CHECK CAN SEE ANY OF THIS (ADR-035 §2.11):
// the phone is its instrument.
// ============================================================================

import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  CADA_METROS,
  CADA_MS,
  ESPERA_MS,
  ULTIMA_VALE_MS,
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

export function useDondeEstoy(): { readonly donde: DondeEstoy; readonly otraVez: () => void } {
  const [donde, setDonde] = useState<DondeEstoy>({ kind: 'buscando' });
  const [vuelta, setVuelta] = useState(0);
  const [enFrente, setEnFrente] = useState(AppState.currentState !== 'background');
  const otraVez = useCallback(() => setVuelta((n) => n + 1), []);

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
      let permiso = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (permiso !== null && !permiso.granted && permiso.status === 'undetermined') {
        permiso = await Location.requestForegroundPermissionsAsync().catch(() => null);
      }
      if (!vivo) return;
      const cual = permiso === null ? 'negada' : permisoDe(permiso);
      if (cual === 'negada') return setDonde({ kind: 'sin-permiso' });
      if (cual === 'aproximada') return setDonde({ kind: 'aproximada' });
      if (!(await Location.hasServicesEnabledAsync().catch(() => false))) {
        if (vivo) setDonde({ kind: 'sin-ubicacion' });
        return;
      }
      const ultima = await Location.getLastKnownPositionAsync({ maxAge: ULTIMA_VALE_MS }).catch(() => null);
      if (ultima !== null) aqui(ultima);
      const fresca = await conPlazo(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        ESPERA_MS,
      ).catch(() => null);
      if (!vivo) return;
      if (fresca !== null) aqui(fresca);
      else if (ultima === null) setDonde((antes) => (antes.kind === 'aqui' ? antes : { kind: 'sin-ubicacion' }));
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: CADA_METROS, timeInterval: CADA_MS },
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

  return { donde, otraVez };
}

/** The time, read again every `ms` while the screen is up — a window that ends drops from the list on its own. */
export function useAhora(ms: number): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), ms);
    return () => clearInterval(reloj);
  }, [ms]);
  return ahora;
}

// ============================================================================
// ITACATE'S QUESTIONS TO GOOGLE, OVER HTTP. Plan task `10.5-iv-a-i`. Every value
// sent and every answer read is `@/lib/google`'s, pure and pinned; this file only
// sends and waits — Wera Cocina's `@/lib/useGoogle`, cut to Geocoding.
//
// ⚠️ THE KEY COMES FROM THE CONFIG'S `extra` (`app.config.ts`), as Wera Cocina's
// does: the Android key is the one Google's map already reads from EAS's
// environment (`GOOGLE_MAPS_ANDROID_API_KEY`), the iPhone's `GOOGLE_MAPS_IOS_API_KEY`
// — a second variable for either would be a second home for one value. Expo writes
// the config into every update it publishes, so `ship-an-update.sh --app itacate`
// refuses to publish while EAS lacks either (`test/support.test.ts`), and neither
// enters the runtime (`fingerprint.config.js` drops `extra.google`), so the update
// reaches the build already in the field. A build with no key asks nothing: a
// kitchen with no point then shows no distance, and a postal code cannot be placed.
//
// ⚠️⚠️ NOTHING IS KEPT: TanStack's cache lives in memory and dies with the app —
// Itacate persists no read — and each answer is this neighbour's alone (Service
// Specific Terms §6.3.2). A kitchen's address is asked once while the app is open,
// however often the list is sorted again; her postal code is never cached at all.
// ============================================================================

import { useMutation, useQueries } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';

import type { Kitchen, Punto } from '@/api/cocinas';
import {
  LIMITE_MS,
  cabecerasDeLaApp,
  claveDe,
  preguntaDeSuDireccion,
  respuestaDeGeocoding,
  urlDeGeocodificar,
  urlDelCodigoPostal,
  type Respuesta,
} from '@/lib/google';

/** The two keys `app.config.ts` writes into the config. */
interface Claves {
  readonly android?: unknown;
  readonly ios?: unknown;
}

const CLAVES = ((Constants.expoConfig?.extra ?? {}) as { google?: Claves }).google ?? {};

/** This phone's key, or `null` — then nothing is asked of Google. */
export const CLAVE: string | null = claveDe(Platform.OS === 'ios' ? CLAVES.ios : CLAVES.android);

const APP = cabecerasDeLaApp(Platform.OS);

/** The prefix every kitchen's place is cached under, in memory. */
export const DONDE_KEY = ['itacate', 'donde'] as const;

/**
 * One request to Google, given up after `LIMITE_MS`. `null` is no signal — or no
 * answer in time. ⚠️ A QUESTION DROPPED BY TANSTACK (`signal`) rethrows, so it is
 * dropped silently — Wera Cocina's `pedir`.
 */
async function pedir(url: string, signal?: AbortSignal): Promise<{ status: number; body: unknown } | null> {
  const controller = new AbortController();
  const seguir = () => controller.abort();
  signal?.addEventListener('abort', seguir);
  const timer = setTimeout(() => controller.abort(), LIMITE_MS);
  try {
    const response = await fetch(url, { headers: APP, signal: controller.signal });
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch (failure) {
    if (signal?.aborted === true) throw failure;
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', seguir);
  }
}

async function geocodificar(url: string, signal?: AbortSignal): Promise<Respuesta> {
  const r = await pedir(url, signal);
  return r === null ? { kind: 'sin-senal' } : respuestaDeGeocoding(r.status, r.body);
}

/**
 * Where each kitchen with no point is: its address, asked of Google ONCE while the
 * app is open — the answer kept in memory for this neighbour alone — so its distance
 * can be shown. ⚠️ NO SIGNAL IS NOT AN ANSWER: it is thrown, so the next pull or
 * return to the front asks again; Google's own refusal is kept until the app closes,
 * so a refused key is not asked every time the list is sorted.
 */
export function usePuntosBuscados(cocinas: readonly Kitchen[] | undefined): ReadonlyMap<string, Punto> {
  const porBuscar = useMemo(
    () =>
      (cocinas ?? []).flatMap((cocina) => {
        if (cocina.point !== null) return [];
        const pregunta = preguntaDeSuDireccion(cocina.address);
        return pregunta === null ? [] : [{ id: cocina.id, pregunta }];
      }),
    [cocinas],
  );
  // TanStack runs `combine` again only when it or an answer changes, so the map is
  // the same object between answers and the list is not sorted for nothing.
  const combinar = useCallback(
    (respuestas: readonly { readonly data?: Respuesta }[]): ReadonlyMap<string, Punto> => {
      const mapa = new Map<string, Punto>();
      respuestas.forEach((r, i) => {
        if (r.data?.kind === 'punto' && porBuscar[i] !== undefined) mapa.set(porBuscar[i].id, r.data.punto);
      });
      return mapa;
    },
    [porBuscar],
  );
  return useQueries({
    queries: porBuscar.map(({ pregunta }) => ({
      queryKey: [...DONDE_KEY, pregunta],
      queryFn: async ({ signal }: { signal: AbortSignal }): Promise<Respuesta> => {
        const respuesta = await geocodificar(urlDeGeocodificar(pregunta, CLAVE ?? ''), signal);
        if (respuesta.kind === 'sin-senal') throw new Error('Network request failed: Google');
        return respuesta;
      },
      enabled: CLAVE !== null,
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
    })),
    combine: combinar,
  });
}

/**
 * Her postal code, placed by Google — asked when she presses *Buscar*, never
 * cached. `buscar` answers what came back; `buscando` covers the question.
 */
export function useCodigoPostal() {
  const mutation = useMutation({
    mutationFn: (cp: string): Promise<Respuesta> =>
      CLAVE === null ? Promise.resolve({ kind: 'falla' }) : geocodificar(urlDelCodigoPostal(cp, CLAVE)),
  });
  return { buscar: mutation.mutateAsync, buscando: mutation.isPending };
}

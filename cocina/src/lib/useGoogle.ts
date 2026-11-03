// ============================================================================
// THE QUESTIONS TO GOOGLE, OVER HTTP, AND THE HOOKS THE MAP AND THE FORM ASK
// THEM THROUGH. Plan tasks `10.4g-i` and `10.4h` (the small map: where Google
// places her address, looked up live). Every value sent and every answer read is
// `@/lib/google`'s, pure and pinned; this file only sends and waits.
//
// ⚠️ THE KEYS COME FROM THE CONFIG'S `extra` (`app.config.ts`), NOT `EXPO_PUBLIC_`:
// the Android key is the one Google's map already reads from EAS's environment
// (`GOOGLE_MAPS_ANDROID_API_KEY`), and the iPhone's is `GOOGLE_MAPS_IOS_API_KEY` —
// a second variable for either would be a second home for one value. Expo writes
// the config into the build and into every update it publishes, so
// `ship-an-update.sh --app cocina` refuses to publish while EAS lacks either
// (`test/support.test.ts`), and neither enters the runtime
// (`fingerprint.config.js`). Each phone sends its own, with its own app's headers.
//
// ⚠️ ONE SESSION PER SEARCH (`useSesion`): the token every suggestion of one
// search carries, made at its first question and dropped by the details of her
// pick, which end it.
//
// ⚠️ NOTHING HERE IS KEPT: TanStack's cache lives in memory and dies with the app
// (this app persists nothing), and an answer reaches only the map's flight, her
// boxes when she picks it, and the card (`@/lib/google`'s header).
// ============================================================================

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { sameAddress, type AddressForm, type Pin } from '@/api/place';
import {
  CAMPOS_DE_DETALLES,
  LIMITE_MS,
  PAUSA_DEL_MAPA_MS,
  PAUSA_MS,
  SUGERENCIAS_URL,
  cabecerasDeLaApp,
  calleDeGeocoding,
  claveDe,
  cuerpoDeSugerencias,
  destinoDeGeocoding,
  lugarDe,
  preguntaConSuDireccion,
  preguntaDeDireccion,
  sugerenciasDe,
  urlDeDetalles,
  urlDeGeocodificar,
  urlDeLaCalle,
  type Destino,
  type Lugar,
  type ResultadoDeDestino,
  type ResultadoDeSugerencias,
  type Sugerencia,
  type Sugerencias,
} from '@/lib/google';
import { newId } from '@/lib/ids';
import { ES_AQUI_PAUSA_MS } from '@/lib/mapa';

/** The two keys `app.config.ts` writes into the config. */
interface Claves {
  readonly android?: unknown;
  readonly ios?: unknown;
}

const CLAVES = ((Constants.expoConfig?.extra ?? {}) as { google?: Claves }).google ?? {};

/** This phone's key, or `null` — then no search box is drawn, nothing is asked, and the card shows her address alone. */
export const CLAVE: string | null = claveDe(Platform.OS === 'ios' ? CLAVES.ios : CLAVES.android);

const APP = cabecerasDeLaApp(Platform.OS);

/** The prefix every search is cached under, in memory. */
export const BUSCAR_KEY = ['cocina', 'buscar'] as const;

/** How long an answer to the same words is reused. */
const VIGENCIA_MS = 5 * 60_000;

/**
 * One request to Google, given up after `LIMITE_MS`. `null` is no signal — or no
 * answer in time. ⚠️ A QUESTION REPLACED BY A NEWER ONE IS ABORTED BY TANSTACK
 * (`signal`) and that failure is rethrown, so it is dropped silently.
 */
async function pedir(url: string, init: RequestInit, signal?: AbortSignal): Promise<{ status: number; body: unknown } | null> {
  const controller = new AbortController();
  const seguir = () => controller.abort();
  signal?.addEventListener('abort', seguir);
  const timer = setTimeout(() => controller.abort(), LIMITE_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
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

/** Google's suggestions for what she typed, in her session. */
export async function sugerir(pregunta: string, sesion: string, signal?: AbortSignal): Promise<ResultadoDeSugerencias> {
  if (CLAVE === null) return { kind: 'falla' };
  const r = await pedir(
    SUGERENCIAS_URL,
    {
      method: 'POST',
      headers: { ...APP, 'X-Goog-Api-Key': CLAVE, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpoDeSugerencias(pregunta, sesion)),
    },
    signal,
  );
  return r === null ? { kind: 'sin-senal' } : sugerenciasDe(r.status, r.body);
}

/**
 * The details of the suggestion she picked, which end her session: where the
 * map flies and her five boxes — the parts Google does not name keep what she
 * typed (`escrita`). `sin-senal` when Google could not be reached; `null` when it
 * refused or answered no point.
 */
export async function detallar(sugerencia: Sugerencia, sesion: string, escrita: AddressForm): Promise<Lugar | 'sin-senal' | null> {
  if (CLAVE === null) return null;
  const r = await pedir(urlDeDetalles(sugerencia.id, sesion), {
    headers: { ...APP, 'X-Goog-Api-Key': CLAVE, 'X-Goog-FieldMask': CAMPOS_DE_DETALLES },
  });
  return r === null ? 'sin-senal' : lugarDe(r.status, r.body, sugerencia, escrita);
}

/** An address to Geocoding: where the map flies. */
export async function geocodificar(pregunta: string, signal?: AbortSignal): Promise<ResultadoDeDestino> {
  if (CLAVE === null) return { kind: 'falla' };
  const r = await pedir(urlDeGeocodificar(pregunta, CLAVE), { headers: APP }, signal);
  return r === null ? { kind: 'sin-senal' } : destinoDeGeocoding(r.status, r.body);
}

/** The street Google names under a point, or `null`. */
export async function calleEn(punto: Pin, signal?: AbortSignal): Promise<string | null> {
  if (CLAVE === null) return null;
  const r = await pedir(urlDeLaCalle(punto, CLAVE), { headers: APP }, signal);
  return r === null ? null : calleDeGeocoding(r.status, r.body);
}

/** A value that settles `ms` after it last changed — what she typed, once she pauses. */
export function useAsentado<T>(value: T, ms: number): T {
  const [asentado, setAsentado] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setAsentado(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return asentado;
}

/** One search's session: its token, made at its first question, and its end. */
export interface Sesion {
  readonly token: () => string;
  readonly cerrar: () => void;
}

/** ⚠️ ONE SESSION PER SEARCH: every suggestion she is offered for one address shares a token, and her pick ends it. */
export function useSesion(): Sesion {
  const token = useRef<string | null>(null);
  return useMemo(
    () => ({
      token: () => (token.current ??= newId()),
      cerrar: () => {
        token.current = null;
      },
    }),
    [],
  );
}

/**
 * Google's suggestions for what she is typing: nothing until `MIN_LETRAS`, asked
 * `PAUSA_MS` after her last keystroke — with the colonia and city of `direccion`
 * when she typed none — and the last list kept on screen while the next one comes.
 * Never retried: she is still typing.
 */
export function useSugerencias(texto: string, direccion: AddressForm | null, sesion: Sesion): Sugerencias {
  const ahora = preguntaConSuDireccion(texto, direccion);
  const pregunta = useAsentado(ahora, PAUSA_MS);
  const { data } = useQuery({
    queryKey: [...BUSCAR_KEY, 'sugerencias', pregunta],
    queryFn: ({ signal }) => sugerir(pregunta as string, sesion.token(), signal),
    enabled: pregunta !== null && CLAVE !== null,
    placeholderData: keepPreviousData,
    staleTime: VIGENCIA_MS,
    gcTime: 10 * 60_000,
    retry: false,
  });
  if (ahora === null || CLAVE === null) return { kind: 'nada' };
  return data ?? { kind: 'buscando' };
}

/**
 * The one answer the map opens on: the address she typed in the step before,
 * asked once while she has no pin. `null` until it answers, and when nothing is
 * found: the map then stays on the city.
 */
export function useApertura(direccion: AddressForm | null): Destino | null {
  const pregunta = direccion === null ? null : preguntaDeDireccion(direccion);
  const { data } = useQuery({
    queryKey: [...BUSCAR_KEY, 'apertura', pregunta],
    queryFn: ({ signal }) => geocodificar(pregunta as string, signal),
    enabled: pregunta !== null && CLAVE !== null,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
  });
  return data?.kind === 'destino' ? data.destino : null;
}

/** Where Google places her address, for the small map — or why it shows no point. */
export type DondeEsta =
  | { readonly kind: 'punto'; readonly destino: Destino }
  /** Her address is not whole yet (`checkAddress`, the owner's four): nothing is asked. */
  | { readonly kind: 'incompleta' }
  | { readonly kind: 'buscando' }
  /** Google found nothing inside the zone. */
  | { readonly kind: 'ninguna' }
  | { readonly kind: 'sin-senal' }
  /** Google refused, or this build has no key for its phone. */
  | { readonly kind: 'falla' };

/**
 * ⚠️⚠️ WHERE GOOGLE PLACES HER ADDRESS, FOR THE SMALL MAP (`10.4h`, the owner's
 * ruling of 2026-11-03: address first) — LOOKED UP LIVE, NEVER KEPT: the point of
 * the suggestion she picked while her boxes still read as it filled them (nothing
 * asked: its details carried it), else her four parts to Geocoding once her boxes
 * have rested (`PAUSA_DEL_MAPA_MS`) — the full map's opening question, so *Ajusta
 * el punto* opens on the same answer from the cache (`useApertura`). While a new
 * question is out the last point stays. `null`: nothing to ask — she has her own
 * point, which is drawn instead.
 */
export function useDondeEsta(direccion: AddressForm | null, elegido: Lugar | null): DondeEsta {
  const delElegido = elegido !== null && direccion !== null && sameAddress(direccion, elegido.direccion) ? elegido : null;
  const asentada = useAsentado(delElegido === null ? direccion : null, PAUSA_DEL_MAPA_MS);
  const pregunta = asentada === null ? null : preguntaDeDireccion(asentada);
  const { data } = useQuery({
    queryKey: [...BUSCAR_KEY, 'apertura', pregunta],
    queryFn: ({ signal }) => geocodificar(pregunta as string, signal),
    enabled: pregunta !== null && CLAVE !== null,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
  });
  if (delElegido !== null) return { kind: 'punto', destino: delElegido };
  if (direccion === null || preguntaDeDireccion(direccion) === null) return { kind: 'incompleta' };
  if (CLAVE === null) return { kind: 'falla' };
  if (data === undefined) return { kind: 'buscando' };
  return data.kind === 'destino' ? { kind: 'punto', destino: data.destino } : data;
}

/** *Buscar* — the keyboard's search key, on what she typed: *nada* until she presses it. */
export function useBuscar(pregunta: string | null): ResultadoDeDestino | { readonly kind: 'nada' } | { readonly kind: 'buscando' } {
  const { data } = useQuery({
    queryKey: [...BUSCAR_KEY, 'buscar', pregunta],
    queryFn: ({ signal }) => geocodificar(pregunta as string, signal),
    enabled: pregunta !== null && CLAVE !== null,
    staleTime: VIGENCIA_MS,
    gcTime: 10 * 60_000,
    retry: false,
  });
  if (pregunta === null) return { kind: 'nada' };
  return data ?? { kind: 'buscando' };
}

/**
 * ⚠️ THE STREET GOOGLE NAMES UNDER HER PIN, for the card: asked once her pin has
 * settled (`ES_AQUI_PAUSA_MS`), and only while she has a pin and gave a street —
 * there is nothing to compare otherwise. `null` while out, when Google names none
 * and when it fails: the card then warns of nothing.
 */
export function useCalleBajoElPin(pin: Pin | null, suCalle: string | null): string | null {
  const ahora = pin === null || suCalle === null || CLAVE === null ? null : `${pin.latitude.toFixed(6)},${pin.longitude.toFixed(6)}`;
  const punto = useAsentado(ahora, ES_AQUI_PAUSA_MS);
  const { data } = useQuery({
    queryKey: [...BUSCAR_KEY, 'calle', punto],
    queryFn: ({ signal }) => {
      const [latitude, longitude] = (punto as string).split(',').map(Number);
      return calleEn({ latitude, longitude }, signal);
    },
    enabled: punto !== null,
    staleTime: VIGENCIA_MS,
    gcTime: 10 * 60_000,
    retry: false,
  });
  return ahora === null || punto !== ahora ? null : (data ?? null);
}

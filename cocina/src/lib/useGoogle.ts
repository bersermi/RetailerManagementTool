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
// ⚠️ TANSTACK'S CACHE LIVES IN MEMORY AND DIES WITH THE APP (this app persists
// nothing). An answer reaches the map's flight, her boxes when she picks it, the
// card — and, ⚠️⚠️ SINCE `10.5-i-b-ii`, where Google places her address is KEPT as
// Google's 30-day copy (the owner's ruling of 2026-11-04, night): the address
// screen hands it to her save (`DondeEsta`'s `google`), and her kitchen's stored
// copy is drawn, asked again a week on and kept again (`useDondeEstaSuCocina`).
// Only the point and the ID of the place she picked — never what Google names.
// ============================================================================

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useSaveGooglePoint } from '@/api/hooks';
import {
  checkAddress,
  googlePointDue,
  sameAddress,
  setGooglePointArgs,
  type AddressForm,
  type GooglePoint,
  type Pin,
  type Place,
} from '@/api/place';
import {
  CAMPOS_DEL_REFRESCO,
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
  destinoGuardado,
  lugarDe,
  preguntaConSuDireccion,
  preguntaDeDireccion,
  preguntaDeRefresco,
  suLugarDe,
  sugerenciasDe,
  urlDeDetalles,
  urlDeGeocodificar,
  urlDeLaCalle,
  urlDeSuLugar,
  type Destino,
  type Lugar,
  type PreguntaDeRefresco,
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
  | {
      readonly kind: 'punto';
      readonly destino: Destino;
      /** ⚠️ What is kept of it (`10.5-i-b-ii`): the point drawn, and Google's ID for the place she picked. */
      readonly google: GooglePoint;
    }
  /** Her address is not whole yet (`checkAddress`, the owner's four): nothing is asked. */
  | { readonly kind: 'incompleta' }
  | { readonly kind: 'buscando' }
  /** Google found nothing inside the zone. */
  | { readonly kind: 'ninguna' }
  | { readonly kind: 'sin-senal' }
  /** Google refused, or this build has no key for its phone. */
  | { readonly kind: 'falla' };

/**
 * ⚠️⚠️ WHERE GOOGLE PLACES HER ADDRESS, FOR THE ADDRESS SCREEN'S SMALL MAP (`10.4h`,
 * the owner's ruling of 2026-11-03: address first): the point of the place she
 * picked while her boxes still read as it filled them (nothing asked: its details
 * carried it) — or, behind *Cambiar dirección*, her kitchen's stored copy while the
 * boxes read as stored (`lugarGuardado`) — else her four parts to Geocoding once
 * her boxes have rested (`PAUSA_DEL_MAPA_MS`) — the full map's opening question, so
 * *Ajusta el punto* opens on the same answer from the cache (`useApertura`). While a
 * new question is out the last point stays. ⚠️ `10.5-i-b-ii`: its `google` is what
 * her save keeps — the point drawn, with the ID of the place she picked; Geocoding's
 * answer keeps none. `null` `direccion`: nothing to ask — she has her own point,
 * which is drawn instead.
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
  if (delElegido !== null) {
    return { kind: 'punto', destino: delElegido, google: { pin: delElegido.punto, placeId: delElegido.placeId } };
  }
  if (direccion === null || preguntaDeDireccion(direccion) === null) return { kind: 'incompleta' };
  if (CLAVE === null) return { kind: 'falla' };
  if (data === undefined) return { kind: 'buscando' };
  return data.kind === 'destino' ? { kind: 'punto', destino: data.destino, google: { pin: data.destino.punto, placeId: null } } : data;
}

/**
 * The moment, taken when the screen opens and again each time the app comes back
 * to the front — the ruling's *when the app opens*. ⚠️ ITS OWN SIGNAL: her
 * kitchen's screen stays mounted for days behind the phone's other apps, and a
 * read that comes back unchanged draws nothing again.
 */
export function useAlAbrir(): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAhora(Date.now());
    });
    return () => sub.remove();
  }, []);
  return ahora;
}

/**
 * How long a refresh's answer stands for the same copy, in ms — a point found (whose
 * write, if it failed, is tried again after it) or Google finding none. ⚠️ No signal
 * or a refusal stands for nothing: asked again at the next open, so the small map's
 * *El mapa se verá cuando vuelva la señal* comes true.
 */
const REFRESCO_VIGENCIA_MS = 60 * 60_000;

/**
 * The refresh's one question — or two: Place Details for the place she picked and,
 * when Google no longer knows it, her address through Geocoding, whose answer keeps
 * no ID. Answers where to draw her kitchen and what to keep of it.
 */
async function refrescar(pregunta: PreguntaDeRefresco, signal?: AbortSignal): Promise<DondeEsta> {
  if (CLAVE === null) return { kind: 'falla' };
  if (pregunta.kind === 'lugar') {
    const r = await pedir(
      urlDeSuLugar(pregunta.placeId),
      { headers: { ...APP, 'X-Goog-Api-Key': CLAVE, 'X-Goog-FieldMask': CAMPOS_DEL_REFRESCO } },
      signal,
    );
    if (r === null) return { kind: 'sin-senal' };
    const suyo = suLugarDe(r.status, r.body, pregunta.placeId);
    if (suyo.kind === 'punto') return { kind: 'punto', destino: destinoGuardado(suyo.google), google: suyo.google };
    if (suyo.kind !== 'perdido') return suyo;
  }
  const g = await geocodificar(pregunta.direccion, signal);
  return g.kind === 'destino' ? { kind: 'punto', destino: g.destino, google: { pin: g.destino.punto, placeId: null } } : g;
}

/**
 * ⚠️⚠️ WHERE HER KITCHEN IS DRAWN WHILE SHE HAS NO PIN OF HER OWN — her kitchen's
 * screen's small map, and where *Ajustar punto* opens (`10.5-i-b-ii`, the owner's
 * ruling of 2026-11-04, night): **the copy of Google's point the database keeps**,
 * and nothing asked of Google while it is under `GOOGLE_REFRESH_DAYS` old — so the
 * app no longer asks Google each time it runs (`10.4h`'s decision (f), reversed).
 * Once the copy is older, or there is none, ONE question goes to Google
 * (`preguntaDeRefresco`), the old copy drawn meanwhile, and its answer is drawn and
 * KEPT IN THE SAME STEP THAT ASKED (`set_google_point`, through `useSaveGooglePoint`)
 * — so an answer held in memory is never later written as fresh. Keyed on the copy
 * it replaces: once a new one is kept, the next refresh is a new question. Nothing
 * on screen says so, and a failure says nothing: the next open asks again. "Opens"
 * is its launch and each return to the front (`useAlAbrir`). With no place yet, her
 * address not whole, or her own pin — which is drawn instead — nothing is asked.
 */
export function useDondeEstaSuCocina(place: Place | null | undefined): DondeEsta {
  const save = useSaveGooglePoint();
  const ahora = useAlAbrir();
  const suya = place === undefined || place === null || place.pin !== null || checkAddress(place.address) !== null ? null : place;
  const guardado = suya?.google ?? null;
  const pregunta = suya !== null && googlePointDue(guardado, ahora) ? preguntaDeRefresco(guardado?.placeId ?? null, suya.address) : null;
  const lugarId = suya?.id ?? null;
  const { data } = useQuery({
    queryKey: [...BUSCAR_KEY, 'su-cocina', lugarId, guardado?.at ?? null, pregunta],
    queryFn: async ({ signal }) => {
      const r = await refrescar(pregunta as PreguntaDeRefresco, signal);
      if (r.kind === 'punto') save(setGooglePointArgs(lugarId as string, r.google));
      return r;
    },
    enabled: pregunta !== null && lugarId !== null && CLAVE !== null,
    staleTime: (query) => (query.state.data?.kind === 'punto' || query.state.data?.kind === 'ninguna' ? REFRESCO_VIGENCIA_MS : 0),
    gcTime: 10 * 60_000,
    retry: false,
  });
  if (suya === null) return { kind: 'incompleta' };
  if (pregunta !== null && data?.kind === 'punto') return data;
  if (guardado !== null) return { kind: 'punto', destino: destinoGuardado(guardado), google: guardado };
  if (CLAVE === null) return { kind: 'falla' };
  return data ?? { kind: 'buscando' };
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

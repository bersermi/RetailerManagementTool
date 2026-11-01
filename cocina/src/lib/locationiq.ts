// ============================================================================
// THE FOURTH ENVIRONMENT VALUE THE BUNDLE READS, AND THE QUESTIONS SENT WITH IT.
// Plan task `10.4c`.
//
// ⚠️ `EXPO_PUBLIC_LOCATIONIQ_TOKEN` IS THIS PROJECT'S OWN VARIABLE ON EAS
// (`preview` and `production`, *Sensitive*, set 2026-10-31) and the gitignored
// `cocina/.env.local` on this Mac — never this public repository. It is an API
// token made to sit inside an app (LocationIQ's `pk.` kind): anyone who opens the
// bundle can read it, and the worst they can do is spend the free plan's 5,000 a
// day, after which LocationIQ answers 429 and the box says it cannot search —
// she still taps her kitchen on the map. Unset, no box is drawn, and
// `ship-an-update.sh --app cocina` refuses to publish (`test/support.test.ts`).
// The member expression is written out in full: Expo inlines nothing else, and
// Metro writes it into the bundle, not the config, so the runtime does not move.
//
// ⚠️ NOTHING HERE IS KEPT: TanStack's cache lives in memory and dies with the app
// (this app persists nothing), and what an answer says reaches only the map
// (`@/lib/buscar`'s header).
// ============================================================================

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { AddressForm } from '@/api/place';
import {
  LIMITE_MS,
  PAUSA_MS,
  SUGERENCIAS,
  preguntaConColonia,
  preguntaDeDireccion,
  resultadoDe,
  sinNumero,
  tokenOf,
  urlDeBusqueda,
  type Respuesta,
  type Resultado,
} from '@/lib/buscar';

export const LOCATIONIQ_TOKEN: string | null = tokenOf(process.env.EXPO_PUBLIC_LOCATIONIQ_TOKEN);

/** The prefix every search is cached under, in memory. */
const BUSCAR_KEY = ['cocina', 'buscar'] as const;

/** How long the second question waits after the first: the free plan answers two a second. */
export const ENTRE_PREGUNTAS_MS = 500;

/**
 * One question to LocationIQ — and, when it finds nothing and ends in a house
 * number, the same question without it (`sinNumero`, measured 2026-10-31).
 * ⚠️ A QUESTION REPLACED BY A NEWER ONE IS ABORTED BY TANSTACK (`signal`) and that
 * failure is rethrown, so it is dropped silently; any other failure to reach
 * LocationIQ — her signal, or no answer in `LIMITE_MS` — is *sin señal*.
 */
export async function preguntar(pregunta: string, signal?: AbortSignal, limite: number = SUGERENCIAS): Promise<Resultado> {
  const primero = await una(pregunta, signal, limite);
  const otra = sinNumero(pregunta);
  if (primero.kind !== 'ninguna' || otra === null) return primero;
  await esperar(ENTRE_PREGUNTAS_MS, signal);
  return una(otra, signal, limite);
}

/** Waits, unless the question is replaced first — then fails as replaced. */
function esperar(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(new Error('aborted'));
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const parar = () => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    };
    timer = setTimeout(() => {
      signal?.removeEventListener('abort', parar);
      resolve();
    }, ms);
    signal?.addEventListener('abort', parar, { once: true });
  });
}

async function una(pregunta: string, signal: AbortSignal | undefined, limite: number): Promise<Resultado> {
  if (LOCATIONIQ_TOKEN === null) return { kind: 'falla' };
  const controller = new AbortController();
  const seguir = () => controller.abort();
  signal?.addEventListener('abort', seguir);
  const timer = setTimeout(() => controller.abort(), LIMITE_MS);
  try {
    const response = await fetch(urlDeBusqueda(pregunta, LOCATIONIQ_TOKEN, limite), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const body: unknown = await response.json().catch(() => null);
    return resultadoDe(response.status, body);
  } catch (failure) {
    if (signal?.aborted === true) throw failure;
    return { kind: 'sin-senal' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', seguir);
  }
}

/** A value that settles `ms` after it last changed — what she typed, once she pauses. */
function useAsentado<T>(value: T, ms: number): T {
  const [asentado, setAsentado] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setAsentado(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return asentado;
}

/** What the box shows under it. */
export type Sugerencias =
  | { readonly kind: 'nada' }
  | { readonly kind: 'buscando' }
  | Resultado;

/**
 * The suggestions for what she is typing: nothing until `MIN_LETRAS`, asked
 * `PAUSA_MS` after her last keystroke — with her colonia when she typed none —
 * and the last list kept on screen while the next one comes. Never retried: she
 * is still typing.
 */
export function useSugerencias(texto: string, colonia: string): Sugerencias {
  const ahora = preguntaConColonia(texto, colonia);
  const pregunta = useAsentado(ahora, PAUSA_MS);
  const { data } = useQuery({
    queryKey: [...BUSCAR_KEY, 'sugerencias', pregunta],
    queryFn: ({ signal }) => preguntar(pregunta as string, signal),
    enabled: pregunta !== null && LOCATIONIQ_TOKEN !== null,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
  });
  if (ahora === null || LOCATIONIQ_TOKEN === null) return { kind: 'nada' };
  return data ?? { kind: 'buscando' };
}

/**
 * The one answer the map opens on: the address she typed, asked once, while
 * she has no pin. `null` until it answers, and when it finds nothing — the map
 * then stays on the city, as before this row.
 */
export function useApertura(direccion: AddressForm | null): Respuesta | null {
  const pregunta = direccion === null ? null : preguntaDeDireccion(direccion);
  const { data } = useQuery({
    queryKey: [...BUSCAR_KEY, 'apertura', pregunta],
    queryFn: ({ signal }) => preguntar(pregunta as string, signal, 1),
    enabled: pregunta !== null && LOCATIONIQ_TOKEN !== null,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
  });
  return data?.kind === 'respuestas' ? (data.respuestas[0] ?? null) : null;
}

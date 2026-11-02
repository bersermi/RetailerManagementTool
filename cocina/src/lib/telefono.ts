// ============================================================================
// THE PHONE'S OWN SEARCH, AND THE TWO QUESTIONS IT ANSWERS. Plan task `10.4d`,
// the owner's ruling of 2026-11-01: Wera Cocina's release build asks the phone's
// own geocoder — Google's on Android, Apple's on an iPhone — for the search that
// opens the map near her kitchen and for the box's *Buscar*. The suggestions
// while she types stay LocationIQ's (`@/lib/locationiq`), and LocationIQ answers
// when the phone finds nothing.
//
// ⚠️ THE GEOCODER IS THIS APP'S OWN MODULE (`cocina/modules/geocodificador`), NOT
// `expo-location`: that one's Android geocoder refuses without the location
// permission this app blocks and never asks for (`LocationModule.kt`, 57.0.20,
// read 2026-11-02). Android's and Apple's own geocoders need none — measured
// 2026-11-02: Google's answered sixty questions in a build of this app that
// declares no location permission. Nothing here reads where the phone is.
//
// ⚠️ A BUILD WITHOUT THE MODULE ASKS LOCATIONIQ, AS BEFORE THIS ROW: the module
// is read with `requireOptionalNativeModule`, and every build made before `10.4d`
// lacks it. (Its runtime differs, so no update reaches one; the fallback is for
// a build nobody expected.)
//
// ⚠️ NOTHING HERE IS KEPT: TanStack's cache lives in memory and dies with the app,
// and an answer reaches only the map's flight (`@/lib/buscar`'s header) — Apple's
// licence and Google's terms forbid keeping theirs.
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo';

import type { AddressForm } from '@/api/place';
import {
  CAJA_DEL_VALLE,
  LIMITE_MS,
  RESPUESTAS_DEL_TELEFONO,
  preguntaDeDireccion,
  preguntaParaElTelefono,
  primeroElTelefono,
  resultadoDelTelefono,
  type Respuesta,
  type Resultado,
} from '@/lib/buscar';
import { BUSCAR_KEY, LOCATIONIQ_TOKEN, preguntar, type Sugerencias } from '@/lib/locationiq';

/** The module's one function: the question, the box (south, west, north, east), how many answers. */
interface Geocodificador {
  buscar(pregunta: string, caja: readonly number[], limite: number): Promise<unknown>;
}

const GEOCODIFICADOR = requireOptionalNativeModule<Geocodificador>('Geocodificador');

const FALLA: Resultado = { kind: 'falla' };

/**
 * One question to the phone's own geocoder. Nothing found is *ninguna*; no answer
 * in `LIMITE_MS`, or any failure, is *falla* — and then LocationIQ is asked
 * (`primeroElTelefono`). A question replaced meanwhile is dropped by TanStack.
 */
export async function preguntarAlTelefono(pregunta: string): Promise<Resultado> {
  if (GEOCODIFICADOR === null) return FALLA;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<'tarde'>((resolve) => {
    timer = setTimeout(() => resolve('tarde'), LIMITE_MS);
  });
  try {
    const filas = await Promise.race([GEOCODIFICADOR.buscar(pregunta, CAJA_DEL_VALLE, RESPUESTAS_DEL_TELEFONO), limite]);
    return filas === 'tarde' ? FALLA : resultadoDelTelefono(filas);
  } catch {
    return FALLA;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The one answer the map opens on: the address she typed in the step before,
 * asked once while she has no pin — the phone first, LocationIQ when it finds
 * nothing. `null` until it answers, and when nothing is found: the map then
 * stays on the city, as before `10.4c`.
 */
export function useApertura(direccion: AddressForm | null): Respuesta | null {
  const alTelefono = direccion === null ? null : preguntaParaElTelefono(direccion);
  const aLocationiq = direccion === null ? null : preguntaDeDireccion(direccion);
  const { data } = useQuery({
    queryKey: [...BUSCAR_KEY, 'apertura', alTelefono],
    queryFn: ({ signal }) =>
      primeroElTelefono(
        () => preguntarAlTelefono(alTelefono as string),
        () => (aLocationiq === null || LOCATIONIQ_TOKEN === null ? Promise.resolve(FALLA) : preguntar(aLocationiq, signal, 1)),
      ),
    enabled: alTelefono !== null,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
  });
  return data?.kind === 'respuestas' ? (data.respuestas[0] ?? null) : null;
}

/**
 * *Buscar* — the keyboard's search key, on what she typed (with her colonia when
 * she typed none, as the suggestions are asked): the phone first, LocationIQ when
 * it finds nothing. *Nada* until she presses it.
 */
export function useBuscar(pregunta: string | null): Sugerencias {
  const { data } = useQuery({
    queryKey: [...BUSCAR_KEY, 'buscar', pregunta],
    queryFn: ({ signal }) =>
      primeroElTelefono(
        () => preguntarAlTelefono(pregunta as string),
        () => (LOCATIONIQ_TOKEN === null ? Promise.resolve(FALLA) : preguntar(pregunta as string, signal)),
      ),
    enabled: pregunta !== null,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
  });
  if (pregunta === null) return { kind: 'nada' };
  return data ?? { kind: 'buscando' };
}

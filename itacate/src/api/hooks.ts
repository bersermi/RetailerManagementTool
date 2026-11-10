// ============================================================================
// HOW A SCREEN REACHES THE DATABASE. Plan tasks `10.5-iii-b` (her way out),
// `10.5-iv-a-i` (the kitchens close to her, and their photos), `10.5-iv-a-ii`
// (the trades' names, for a kitchen's page) and `10.5b-iii-a` (her reservations).
//
// ⚠️ A SCREEN NEVER CALLS `@/api/calls` ITSELF — Wera's R12, as in Wera Cocina
// (`cocina/src/api/hooks.ts`, whose two deletion hooks these are, copied): a
// hook here owns the query key, when the read may run, and what it means. Every
// read waits for the stored session to be looked for and needs a login: a read
// sent with no session asks the database as nobody, and nothing is readable
// without an account (ADR-035 §2.7).
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import {
  OWNERS_KEY,
  businessesThatGo,
  deleteErrorMessage,
  ownersKey,
  type Business,
  type DeleteArgs,
} from '@/api/account';
import {
  APARTADOS_KEY,
  POSICION_KEY,
  apartadosKey,
  fallaDe,
  posicionKey,
  type Apartado,
  type Eleccion,
  type Falla,
  type Posicion,
} from '@/api/apartados';
import {
  accountOwners,
  cancelMyReservation,
  confirmMyPickup,
  deleteMyAccount,
  giveMyYes,
  kitchenGiros,
  myReservations,
  myStanding,
  onOfferNow,
  photoRequest,
  reservePlate,
  revokeApple,
} from '@/api/calls';
import { COCINAS_KEY, cocinasKey, girosKey, type Giro, type Kitchen } from '@/api/cocinas';
import { hayPendientes, pendientesDe } from '@/lib/apartados';
import { FILE_OF, isPicturePath, type PhotoSize } from '@/api/fotos';
import { releaseStep } from '@/auth/apple';
import { useAuth } from '@/auth/AuthProvider';

/**
 * ⚠️ `10.5-iv-a-i`: EVERY KITCHEN A NEIGHBOUR MAY SEE, through the one door (`0078`).
 * Keyed on the login, as every read here. Read again when she pulls the list, and
 * when the app comes back to the front once the answer is a minute old
 * (`@/api/QueryProvider`'s focus and `staleTime`). In memory only: Itacate keeps no
 * read on the phone's disk.
 */
export function useCocinas() {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery<Kitchen[]>({
    queryKey: cocinasKey(userId),
    queryFn: onOfferNow,
    enabled: ready && userId !== null,
  });
}

/** An hour, Wera Cocina's: the trades change when the owner edits a row in the dashboard, not by the minute. */
const GIROS_STALE_MS = 60 * 60_000;

/**
 * ⚠️ `10.5-iv-a-ii`: THE KITCHENS' TRADES' NAMES (`kitchen_giros()`, `0072`) — what a
 * kitchen's page says under her name. Wera Cocina's `useKitchenGiros`, keyed on the
 * login as every read here; in memory only. `undefined` until it answers, and her
 * page then simply leaves the line out.
 */
export function useGiros() {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery<Giro[]>({
    queryKey: girosKey(userId),
    queryFn: kitchenGiros,
    enabled: ready && userId !== null,
    staleTime: GIROS_STALE_MS,
  });
}

/**
 * The source `expo-image` draws one of a kitchen's pictures from: Storage's private
 * door with her own token — Wera Cocina's `useFotoSource`, cut to pictures already
 * saved. `null` — her default shows — with no picture, no session, or a path that
 * is not in that kitchen's own folder (`isPicturePath`, `0076`'s rule), which is
 * never asked for. ⚠️ The cache key is the path and the file, never the token: a
 * renewed session still finds the picture on disk, and a saved path never changes.
 */
export function useFotoSource(
  path: string | null,
  kitchenId: string,
  size: PhotoSize,
): { readonly uri: string; readonly headers: Record<string, string>; readonly cacheKey: string } | null {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  if (path === null || token === null || !isPicturePath(path, kitchenId)) return null;
  const request = photoRequest(path, size, token);
  return { uri: request.uri, headers: request.headers, cacheKey: `${path}/${FILE_OF[size]}` };
}

/**
 * Every business that goes with her account when it is deleted (`0073`): those
 * she is the only active owner of, kitchen or shop — none, for a neighbour.
 * `null` while the read is out, which the screen reads as *not known yet*.
 *
 * ⚠️ `staleTime: 0`: a kitchen made in Wera Cocina a minute ago must be on the
 * list the moment the deletion opens. Keyed on the login, Wera Cocina's rule.
 */
export function useBusinessesThatGo(): readonly Business[] | null {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  const { data } = useQuery({
    queryKey: ownersKey(userId),
    queryFn: accountOwners,
    enabled: ready && userId !== null,
    staleTime: 0,
  });
  return businessesThatGo(data, userId);
}

/**
 * Deleting her own account — Wera Cocina's `useDeleteMyAccount`, which is Wera's
 * (`5R-c`, `5R-k`, `10.4b-i`). Returns a Spanish sentence or `null`. On success
 * the session is ended through `useAuth().signOut`, the one log-out path, and
 * the guard sends her to the way in; nothing of hers is kept on this phone
 * (Itacate caches no read to disk, and every key carries the login).
 *
 * ⚠️⚠️ A LOGIN WITH AN APPLE LINK STOPS AT APPLE'S SHEET FIRST, and
 * `releaseStep` (`@/auth/apple`) is every decision about what its answer means:
 * closing it is backing out — nothing deleted, `null`, no message. Everything
 * else ends in the deletion. ⚠️ APPLE IS TOLD BEFORE THE ACCOUNT GOES, because
 * the function reads whose Apple link it is, and after the deletion there is no
 * login to read it from.
 *
 * ⚠️ `busy` COVERS THE SHEET TOO: the mutation is not pending while Apple's
 * sheet is up, and a second tap then would open a second one.
 */
export function useDeleteMyAccount() {
  const { signOut, askAppleAgain } = useAuth();
  const queries = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const mutation = useMutation({
    mutationFn: (args: DeleteArgs) => deleteMyAccount(args),
  });

  async function remove(args: DeleteArgs): Promise<string | null> {
    setLeaving(true);
    try {
      const step = releaseStep(await askAppleAgain());
      if (step.kind === 'stop') return null;
      if (step.kind === 'revoke') {
        await revokeApple(step.code).catch((thrown: unknown) => {
          console.warn(`[api] apple was not told about a deletion: ${String(thrown)}`);
        });
      }
      try {
        await mutation.mutateAsync(args);
      } catch (thrown) {
        // ⚠️ A refusal can mean the list of what goes is stale
        // (`deleteErrorMessage` says so), so it is read again.
        void queries.invalidateQueries({ queryKey: OWNERS_KEY });
        return deleteErrorMessage(thrown);
      }
      await signOut();
      return null;
    } finally {
      setLeaving(false);
    }
  }

  return { remove, busy: mutation.isPending || leaving };
}

// ----------------------------------------------------------------------------
// Her reservations — `10.5b-iii-a`
// ----------------------------------------------------------------------------

/** While a reservation is still to collect, the tab reads hers again this often: a handover, or a window that ends. */
const PENDIENTE_CADA_MS = 60_000;

/**
 * ⚠️ `10.5b-iii-a`: HERS — every reservation still to collect and her last 30 days
 * (`my_reservations`, `0079`). Keyed on the login, in memory only. Read again every
 * minute while one is pending — the fonda's *Entregar*, or a window that ends, changes it
 * from the other phone — and when the app comes back to the front.
 *
 * ⚠️ WHEN WHAT IS STILL TO COLLECT CHANGES, HER STANDING IS READ AGAIN: a handover typed on
 * the kitchen's phone raises her limit from one to three and frees what she holds, and
 * nothing of hers was written to say so — without it a dish's foot kept *Ya tienes un
 * apartado* after she had collected it (found by the review of `10.5b-iii-a`).
 */
export function useApartados() {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  const queries = useQueryClient();
  const query = useQuery<Apartado[]>({
    queryKey: apartadosKey(userId),
    queryFn: myReservations,
    enabled: ready && userId !== null,
    refetchInterval: (q) => (hayPendientes(q.state.data) ? PENDIENTE_CADA_MS : false),
  });
  const pendientes = query.data === undefined ? null : pendientesDe(query.data);
  const antes = useRef<string | null>(null);
  useEffect(() => {
    if (pendientes === null) return;
    if (antes.current !== null && antes.current !== pendientes) void queries.invalidateQueries({ queryKey: POSICION_KEY });
    antes.current = pendientes;
  }, [pendientes, queries]);
  return query;
}

/**
 * ⚠️ `10.5b-iii-a`: HER STANDING (`my_standing`, `0080`) — her yes, her score, each label's
 * count, how many she may hold. Keyed on the login, in memory only.
 */
export function usePosicion() {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery<Posicion>({
    queryKey: posicionKey(userId),
    queryFn: myStanding,
    enabled: ready && userId !== null,
  });
}

/**
 * After any write of hers, what it moved is read again: her reservations, her standing,
 * and the door — a plate she takes or gives back moves the kitchen's *Quedan*.
 */
function useLeerOtraVez() {
  const queries = useQueryClient();
  return () =>
    Promise.all([
      queries.invalidateQueries({ queryKey: APARTADOS_KEY }),
      queries.invalidateQueries({ queryKey: POSICION_KEY }),
      queries.invalidateQueries({ queryKey: COCINAS_KEY }),
    ]).then(() => undefined);
}

/** What a write answers a screen: done, or why not — a key of `ES.apartar.fallas`. */
export type Resultado<T> = { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly falla: Falla };

/**
 * ⚠️ `10.5b-iii-a`: RESERVING — one plate, at her hour, by her method (`reserve_plate`).
 * The choice carries the phone's id, so a second tap after a lost answer is the same
 * reservation. Whatever the answer, what it moved is read again — a refusal too, since
 * it can mean the list or her standing was stale (`TD015`, `TD016`).
 */
export function useApartar() {
  const leerOtraVez = useLeerOtraVez();
  const mutation = useMutation({ mutationFn: (eleccion: Eleccion) => reservePlate(eleccion) });
  async function apartar(eleccion: Eleccion): Promise<Resultado<{ readonly id: string; readonly codigo: string }>> {
    try {
      const valor = await mutation.mutateAsync(eleccion);
      return { ok: true, valor };
    } catch (thrown) {
      return { ok: false, falla: fallaDe(thrown) };
    } finally {
      void leerOtraVez();
    }
  }
  return { apartar, busy: mutation.isPending };
}

/**
 * ⚠️ `10.5b-iii-a`: HER EXPRESS YES, once, before her first reservation (`give_my_yes`,
 * `0080`). Her standing is read again, so the sheet moves on to her hour.
 */
export function useDarMiSi() {
  const queries = useQueryClient();
  const mutation = useMutation({ mutationFn: giveMyYes });
  async function darSi(): Promise<Resultado<null>> {
    try {
      await mutation.mutateAsync();
      await queries.invalidateQueries({ queryKey: POSICION_KEY });
      return { ok: true, valor: null };
    } catch (thrown) {
      return { ok: false, falla: fallaDe(thrown) };
    }
  }
  return { darSi, busy: mutation.isPending };
}

/** ⚠️ `10.5b-iii-a`: *Cancelar* or *No voy a poder ir* — the plate goes back to the kitchen's offer (`0079`). */
export function useCancelarApartado() {
  const leerOtraVez = useLeerOtraVez();
  const mutation = useMutation({ mutationFn: (id: string) => cancelMyReservation(id) });
  async function cancelar(id: string): Promise<Resultado<null>> {
    try {
      await mutation.mutateAsync(id);
      return { ok: true, valor: null };
    } catch (thrown) {
      return { ok: false, falla: fallaDe(thrown) };
    } finally {
      void leerOtraVez();
    }
  }
  return { cancelar, busy: mutation.isPending };
}

/** ⚠️ `10.5b-iii-a`: *Ya lo tengo* — her side of *Recogí* (`confirm_my_pickup`, `0079`). */
export function useYaLoTengo() {
  const leerOtraVez = useLeerOtraVez();
  const mutation = useMutation({ mutationFn: (id: string) => confirmMyPickup(id) });
  async function confirmar(id: string): Promise<Resultado<null>> {
    try {
      await mutation.mutateAsync(id);
      return { ok: true, valor: null };
    } catch (thrown) {
      return { ok: false, falla: fallaDe(thrown) };
    } finally {
      void leerOtraVez();
    }
  }
  return { confirmar, busy: mutation.isPending };
}

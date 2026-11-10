// ============================================================================
// HOW A SCREEN REACHES THE DATABASE. Plan tasks `10.4b-iii-a` (her kitchens),
// `10.4b-iii-b` (making one; her trade, her address and her pin),
// `10.4b-iii-c` (her way out), `10.4b-iv-a` (what she publishes), `10.4h`
// (address first: her address screen's writes, and her trade's door of its own),
// `10.5-ii` (her page in Itacate, and a photo per dish), `10.5-iii-c` (her
// kitchen deleted alone), `10.5-i-b-ii` (Google's point for her address, kept
// again when its 30-day copy is a week old), `10.5b-iv-a` (her kitchen's
// reservations, the handover and the fonda's thumb) and `10.5b-iv-b` (those
// reads kept on the phone, and the handover and the thumb queued).
//
// ⚠️ A SCREEN NEVER CALLS `@/api/calls` ITSELF — Wera's R12: a hook here owns
// the query key, when the read may run, and what it means. Every read waits for
// the stored session to be looked for and needs a login: a read sent with no
// session asks the database as nobody, and nothing is readable without an
// account (ADR-035 §2.7).
//
// ⚠️ A WRITE NEVER WAITS ON THE RE-READ IT TRIGGERS (`void invalidateQueries`):
// for a query with no data, TanStack hands back the in-flight fetch, and a write
// that landed would look stuck for as long as that read takes (Wera, `8g`).
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  OWNERS_KEY,
  businessesThatGo,
  deleteErrorMessage,
  deleteKitchenErrorMessage,
  ownersKey,
  type Business,
  type DeleteArgs,
  type DeleteBusinessArgs,
} from '@/api/account';
import {
  HISTORIAL_FRESCO_MS,
  NO_SE_PRESENTO,
  apartadosKey,
  desdeDeHoy,
  desdeDia,
  diaTexto,
  type Falla,
  type Reserva,
  type SobreElVecino,
} from '@/api/apartados';
import {
  accountOwners,
  deleteMyAccount,
  deleteMyBusiness,
  direccionCalls,
  firstPlace,
  kitchenGiros,
  kitchenCalls,
  kitchenPage,
  myKitchens,
  myListings,
  myReservations,
  photoRequest,
  publishListing,
  reservationNeighbours,
  revokeApple,
  setKitchenGiro,
  setKitchenPage,
  setPlaceGooglePoint,
  setPlacePin,
  uploadPictures,
  withdrawListing,
} from '@/api/calls';
import { deLaCocina, rechazoDe, reservasConCola, vecinosConCola, type Envio } from '@/api/cola';
import { guardarSuDireccion, type Escritura } from '@/api/direccion';
import { apiErrorMessage } from '@/api/errors';
import { FILE_OF, porSubir, type Foto, type FotoNueva, type PhotoSize } from '@/api/fotos';
import {
  GIROS_KEY,
  KITCHENS_KEY,
  kitchensKey,
  membershipFrom,
  openKitchen,
  type Kitchen,
  type Membership,
} from '@/api/kitchen';
import {
  LISTINGS_KEY,
  listingFrom,
  listingsKey,
  withListing,
  withWithdrawn,
  type Listing,
  type PublishArgs,
} from '@/api/listing';
import {
  PAGES_KEY,
  pageKey,
  pagePatch,
  setPageArgs,
  type Page,
  type PageDraft,
} from '@/api/pagina';
import { PLACES_KEY, placeKey, type SetGooglePointArgs, type SetStorePinArgs } from '@/api/place';
import { makeKitchen, withKitchen, type Draft } from '@/api/registro';
import { useAuth } from '@/auth/AuthProvider';
import { releaseStep } from '@/auth/apple';
import { firmaDeHoy, unir, vivo } from '@/lib/apartados';
import { encolarEnvio, useCola } from '@/lib/cola';
import { useAhora } from '@/lib/useAhora';
import { useSenal } from '@/lib/useSenal';

/** Her kitchens, keyed on the login (`kitchensKey`). */
export function useMyKitchens() {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: kitchensKey(userId),
    queryFn: myKitchens,
    enabled: ready && userId !== null,
  });
}

/** Where a signed-in person stands — `unknown` until the read has answered. */
export function useMembership(): Membership {
  return membershipFrom(useMyKitchens().data);
}

/** The kitchen this app opens, once there is one. */
export function useKitchen(): Kitchen | null {
  return openKitchen(useMyKitchens().data);
}

/** An hour: the trades change when the owner edits a row in the dashboard, not by the minute. */
const GIROS_STALE_MS = 60 * 60_000;

/** The kitchens' trades — the same list for every login, read once she is signed in. */
export function useKitchenGiros() {
  const { session, ready } = useAuth();
  return useQuery({
    queryKey: GIROS_KEY,
    queryFn: kitchenGiros,
    enabled: ready && session !== null,
    staleTime: GIROS_STALE_MS,
  });
}

/** Her kitchen's place: its address, its pin, its line of directions. */
export function usePlace(kitchenId: string | null) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: placeKey(userId, kitchenId),
    queryFn: () => firstPlace(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null,
  });
}

/**
 * Makes her kitchen from the two sign-up screens (`@/api/registro`). `make`
 * answers `null`, or the sentence to show — only when the kitchen itself was
 * not made.
 *
 * ⚠️ ON SUCCESS THE KITCHEN GOES INTO HER LIST AT ONCE (`withKitchen`), so the
 * guard takes her to it without waiting on a re-read. ⚠️ ON SETTLED, NOT ONLY ON
 * SUCCESS, HER KITCHENS ARE READ AGAIN: a reply lost after the kitchen was made
 * fails here while the kitchen exists — re-read, the guard finds it and takes
 * her there, instead of her tapping *Registrar* again and making a second one
 * (`onboard_workspace` takes no id from the phone).
 */
export function useMakeKitchen() {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: (draft: Draft) => makeKitchen(draft, kitchenCalls),
    onSuccess: (made, draft) => {
      queries.setQueryData<Kitchen[]>(kitchensKey(userId), (kitchens) => withKitchen(kitchens, made, draft));
    },
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: PLACES_KEY });
      void queries.invalidateQueries({ queryKey: KITCHENS_KEY });
    },
  });

  async function make(draft: Draft): Promise<string | null> {
    try {
      await mutation.mutateAsync(draft);
      return null;
    } catch (thrown) {
      return apiErrorMessage(thrown);
    }
  }

  return { make, busy: mutation.isPending };
}

/**
 * Her own point, set on *Ajusta el punto* from her kitchen's screen (`10.4h`).
 * ⚠️ THE ARGUMENTS CARRY HER STORED LINE OF DIRECTIONS: `set_store_pin` writes the
 * line with the pin on every call, so a pin sent alone would erase it.
 */
export function useSavePin() {
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: (args: SetStorePinArgs) => setPlacePin(args),
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: PLACES_KEY });
    },
  });

  async function save(args: SetStorePinArgs): Promise<string | null> {
    try {
      await mutation.mutateAsync(args);
      return null;
    } catch (thrown) {
      return apiErrorMessage(thrown);
    }
  }

  return { save, busy: mutation.isPending };
}

/**
 * ⚠️ `10.5-i-b-ii`: HER KITCHEN'S COPY OF GOOGLE'S POINT, KEPT AGAIN — the refresh
 * her kitchen's screen makes (`useDondeEstaSuCocina`) when the copy is a week old, which
 * hands in the arguments (`setGooglePointArgs`). Fire and forget, with nothing on
 * screen: on success her place is read again, so the new copy is what draws and the
 * next refresh is a week away; a failure is only logged — the next open asks again.
 */
export function useSaveGooglePoint(): (args: SetGooglePointArgs) => void {
  const queries = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: (args: SetGooglePointArgs) => setPlaceGooglePoint(args),
    onSuccess: () => {
      void queries.invalidateQueries({ queryKey: PLACES_KEY });
    },
    onError: (thrown) => {
      console.warn(`[api] Google's point for her address was not kept: ${String(thrown)}`);
    },
  });
  return mutate;
}

/**
 * Her address screen's *Guardar* (`10.4h`): the writes `@/api/direccion`'s
 * `escrituras` chose — her address, her point set or cleared, her line — one after
 * the other, the first failure stopping the rest. `null`, or the sentence to show.
 */
export function useSaveDireccion() {
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: (lista: readonly Escritura[]) => guardarSuDireccion(lista, direccionCalls),
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: PLACES_KEY });
    },
  });

  async function save(lista: readonly Escritura[]): Promise<string | null> {
    try {
      await mutation.mutateAsync(lista);
      return null;
    } catch (thrown) {
      return apiErrorMessage(thrown);
    }
  }

  return { save, busy: mutation.isPending };
}

/** Her trade, changed or given from her kitchen's screen — its own door since `10.4h`. */
export function useSaveGiro() {
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { kitchenId: string; giro: string }) => setKitchenGiro(input.kitchenId, input.giro),
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: KITCHENS_KEY });
    },
  });

  async function save(input: { kitchenId: string; giro: string }): Promise<string | null> {
    try {
      await mutation.mutateAsync(input);
      return null;
    } catch (thrown) {
      return apiErrorMessage(thrown);
    }
  }

  return { save, busy: mutation.isPending };
}

/**
 * Her publications at the open kitchen (`10.4b-iv-a`): her list, and what
 * *Repetir* starts from. Keyed on the login and the kitchen, Cocina's rule.
 */
export function useListings(kitchenId: string | null) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: listingsKey(userId, kitchenId),
    queryFn: () => myListings(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null,
  });
}

/**
 * Publishing (`publish_listing`). `publish` answers `null`, or the sentence to
 * show. ⚠️ THE MADE ONE GOES INTO HER LIST AT ONCE (`withListing`), so her
 * kitchen's screen shows it the moment she is back on it. ⚠️ ON SETTLED, NOT
 * ONLY ON SUCCESS, HER LIST IS READ AGAIN: a reply lost after the database wrote
 * it fails here while the publication exists, and the re-read shows it — and a
 * retry under the same id (`attemptFor`) is that publication, never a second.
 */
export function usePublish(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    // ⚠️ `10.5-ii`: THE PHOTOS GO UP FIRST — each under the path made when it was
    // taken, the one its line sends — so a dish never names a file that is not
    // there; a failed upload publishes nothing, and a retry finds what went up.
    mutationFn: async (input: { args: PublishArgs; fotos: readonly FotoNueva[] }) => {
      await uploadPictures(input.fotos);
      return publishListing(input.args);
    },
    onSuccess: (_id, input) => {
      queries.setQueryData<Listing[]>(listingsKey(userId, kitchenId), (listings) => withListing(listings, listingFrom(input.args)));
    },
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: LISTINGS_KEY });
    },
  });

  async function publish(args: PublishArgs, fotos: readonly FotoNueva[] = []): Promise<string | null> {
    try {
      await mutation.mutateAsync({ args, fotos });
      return null;
    } catch (thrown) {
      return apiErrorMessage(thrown);
    }
  }

  return { publish, busy: mutation.isPending };
}

/**
 * Her page in Itacate (`10.5-ii`, `0076`): the open kitchen's, or every slot's
 * default when she has never saved one. Keyed on the login and the kitchen.
 */
export function usePage(kitchenId: string | null) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: pageKey(userId, kitchenId),
    queryFn: () => kitchenPage(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null,
  });
}

/**
 * *Guardar* on her page: the pictures she took go up first, then
 * `set_kitchen_page` is sent ONLY WHAT CHANGED (`pagePatch`) — nothing at all
 * when nothing did. `save` answers `null`, or the sentence to show. The page it
 * answers with is drawn at once, and the page is read again either way.
 */
export function useSavePage(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: async (input: { kitchenId: string; saved: Page; draft: PageDraft }): Promise<Page> => {
      const patch = pagePatch(input.saved, input.draft);
      if (Object.keys(patch).length === 0) return input.saved;
      await uploadPictures(porSubir([input.draft.cover, input.draft.logo]));
      return setKitchenPage(setPageArgs(input.kitchenId, patch));
    },
    onSuccess: (page) => {
      queries.setQueryData<Page>(pageKey(userId, kitchenId), page);
    },
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: PAGES_KEY });
    },
  });

  async function save(input: { kitchenId: string; saved: Page; draft: PageDraft }): Promise<string | null> {
    try {
      await mutation.mutateAsync(input);
      return null;
    } catch (thrown) {
      return apiErrorMessage(thrown);
    }
  }

  return { save, busy: mutation.isPending };
}

/**
 * ⚠️ `10.5-ii`: WHAT A PICTURE IS DRAWN FROM — the file on this phone for one just
 * taken; Storage's private door with her token for one saved (`photoRequest`);
 * `null` for none, and the slot's default shows. ⚠️ NOT A QUERY: `expo-image`
 * keeps each file on disk under its path, which a new picture never reuses, so
 * a kept file is never stale; with no signal, a picture never seen is the default.
 */
export function useFotoSource(
  foto: Foto,
  size: PhotoSize,
): { readonly uri: string; readonly headers?: Record<string, string>; readonly cacheKey?: string } | null {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  if (foto.kind === 'ninguna') return null;
  if (foto.kind === 'nueva') {
    const file = foto.archivos.find((archivo) => archivo.name === FILE_OF[size]);
    return file === undefined ? null : { uri: file.uri };
  }
  if (token === null) return null;
  const request = photoRequest(foto.path, size, token);
  return { uri: request.uri, headers: request.headers, cacheKey: `${foto.path}/${FILE_OF[size]}` };
}

/**
 * Withdrawing one (`withdraw_listing`). `withdraw` answers `null`, or the
 * sentence to show; `busyId` is the one being withdrawn. Drawn withdrawn at once
 * on success (`withWithdrawn`), and the list read again either way.
 */
export function useWithdraw(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: (id: string) => withdrawListing({ p_id: id }),
    onSuccess: (_none, id) => {
      queries.setQueryData<Listing[]>(listingsKey(userId, kitchenId), (listings) => withWithdrawn(listings, id, new Date()));
    },
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: LISTINGS_KEY });
    },
  });

  async function withdraw(id: string): Promise<string | null> {
    try {
      await mutation.mutateAsync(id);
      return null;
    } catch (thrown) {
      return apiErrorMessage(thrown);
    }
  }

  return { withdraw, busyId: mutation.isPending ? (mutation.variables ?? null) : null };
}

/**
 * ⚠️ `10.5-v-c-i`: *DESHACER* — an offer just published, taken down again
 * (`withdraw_listing`, as *Ya se terminó*). The kitchen travels WITH the call, not with
 * the hook: the toast that offers it lives at the root (`@/lib/NotaProvider`) and
 * outlives the screen that published, so it cannot borrow that screen's hook.
 * `quitar` answers `null`, or the sentence to show; the list is drawn withdrawn at once
 * and read again either way.
 */
export function useQuitarPublicada(): (kitchenId: string, id: string) => Promise<string | null> {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: (input: { kitchenId: string; id: string }) => withdrawListing({ p_id: input.id }),
    onSuccess: (_none, input) => {
      queries.setQueryData<Listing[]>(listingsKey(userId, input.kitchenId), (listings) =>
        withWithdrawn(listings, input.id, new Date()),
      );
    },
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: LISTINGS_KEY });
    },
  });

  const { mutateAsync } = mutation;
  return useCallback(
    async (kitchenId: string, id: string): Promise<string | null> => {
      try {
        await mutateAsync({ kitchenId, id });
        return null;
      } catch (thrown) {
        return apiErrorMessage(thrown);
      }
    },
    [mutateAsync],
  );
}

/**
 * Every business that goes with her account when it is deleted (`10.4b-iii-c`,
 * `0073`): those she is the only active owner of, kitchen or shop. `null` while
 * the read is out, which the screen reads as *not known yet*.
 *
 * ⚠️ `staleTime: 0`: a kitchen made on another phone a minute ago must be on the
 * list the moment the deletion opens. Keyed on the login, Cocina's rule.
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
 * Deleting her own account — Wera's `useDeleteMyAccount` (`5R-c`, `5R-k`,
 * `10.4b-i`). Returns a Spanish sentence or `null`. On success the session is
 * ended through `useAuth().signOut`, the one log-out path, and the guard sends
 * her to the way in; nothing of hers is kept on this phone (Cocina caches no
 * read to disk, and every key carries the login).
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

/**
 * Deleting ONE kitchen and keeping her account (`10.5-iii-c`, `0077`). Returns a
 * Spanish sentence or `null`. Nothing is asked of Apple and nobody is signed out:
 * the login stays, in the three apps.
 *
 * ⚠️ ON SUCCESS THE KITCHEN LEAVES HER LIST AT ONCE (`setQueryData`), so the guard
 * sends her where a kitchen is made — or to her other kitchen, the next-made —
 * without waiting for the re-read that follows. ⚠️ ON A REFUSAL HER KITCHENS ARE
 * READ AGAIN TOO: `TD012` is also what a kitchen already deleted answers, when the
 * first answer was lost on the way back, and the guard moves her if it is gone.
 */
export function useDeleteKitchen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: (args: DeleteBusinessArgs) => deleteMyBusiness(args),
  });

  async function remove(args: DeleteBusinessArgs): Promise<string | null> {
    try {
      await mutation.mutateAsync(args);
    } catch (thrown) {
      void queries.invalidateQueries({ queryKey: KITCHENS_KEY });
      void queries.invalidateQueries({ queryKey: OWNERS_KEY });
      return deleteKitchenErrorMessage(thrown);
    }
    queries.setQueryData<Kitchen[]>(kitchensKey(userId), (kitchens) =>
      kitchens?.filter((kitchen) => kitchen.id !== args.p_workspace_id),
    );
    void queries.invalidateQueries({ queryKey: KITCHENS_KEY });
    void queries.invalidateQueries({ queryKey: OWNERS_KEY });
    return null;
  }

  return { remove, busy: mutation.isPending };
}

// ----------------------------------------------------------------------------
// `10.5b-iv-a` — her kitchen's reservations, the handover and the fonda's thumb;
// `10.5b-iv-b` — kept on the phone, and both writes queued
// ----------------------------------------------------------------------------

/** What *Apartados* is drawn from: her kitchen's reservations and what is said of each one's neighbour. */
export interface Apartados {
  readonly reservas: readonly Reserva[];
  readonly vecinos: Readonly<Record<string, SobreElVecino>>;
}

/**
 * ⚠️ TODAY'S ORDERS ARE READ AGAIN EVERY MINUTE WHILE SOMETHING CAN CHANGE (`vivo`) AND THE APP IS IN
 * FRONT: nothing tells her phone a neighbour reserved (the fonda's notification is `10.5b-v`'s), so the
 * list is how she learns it. TanStack stops the interval while the app is in the background
 * (`@/api/QueryProvider`'s `focusManager`), and while there is no signal (`onlineManager`).
 */
export const APARTADOS_CADA_MS = 60_000;

/** What a screen reads of her reservations: one query's shape, three reads and her queue underneath. */
export interface LecturaDeApartados {
  /** The reads with what waits in her queue laid over them (`@/api/cola`). */
  readonly data: Apartados | undefined;
  readonly isError: boolean;
  readonly isFetching: boolean;
  readonly isRefetching: boolean;
  readonly refetch: () => Promise<unknown>;
  /** When today's orders were last read — what *Sin señal* says (ADR-035 §2.6: visible staleness). */
  readonly leidoEn: Date | null;
  /** The signal says there is none (`@/lib/connectivityMonitor`); `false` while unknown. */
  readonly sinSenal: boolean;
  /** What waits in her queue for this kitchen, in its order. */
  readonly porEnviar: readonly Envio[];
  /** The database's last word on a send about this order, while it is drawn (a day). */
  readonly rechazoDe: (reservaId: string) => Falla | null;
}

/**
 * `10.5b-iv-a`: her kitchen's reservations and `reservation_neighbours`' line on each, as THREE reads
 * (`HISTORIAL_FRESCO_MS`'s reason — her data is paid by her): TODAY's and later's (`hoy`); the 30 days
 * before today (`antes`) when the app opens and every 30 minutes; who reserved each (`vecinos`).
 *
 * ⚠️⚠️ `10.5b-iv-b`: ALL THREE ARE KEPT ON THE PHONE (`@/api/persist`), SO THEIR KEYS NO LONGER CARRY
 * THE DAY OR TODAY'S ORDERS: a key with the day finds nothing on a new morning with no signal, and one
 * per state of today's orders grows on the phone for ever. The two lists are joined by id, today's read
 * winning (`unir`) — across midnight the one holds what the other has not been asked for yet.
 * ⚠️ WHEN THEY ARE READ AGAIN IS `useApartadosAlDia`'s, called ONCE, by the tabs' layout.
 * ⚠️ HER QUEUE IS LAID OVER THEM (`reservasConCola`, `vecinosConCola`): what she handed over or rated
 * shows at once, with signal or without, and after a restart.
 */
export function useApartados(kitchenId: string | null): LecturaDeApartados {
  return useLecturas(kitchenId, false);
}

/**
 * ⚠️ THE SAME READ, AND THE ONE PLACE ITS TIMING LIVES — call it ONCE, from what is always mounted
 * (the tabs' layout): every minute while `vivo`; both lists again when the day turns; who reserved
 * each again whenever today's orders change (`firmaDeHoy`). ⚠️ THE TWO "AGAIN"S ARE `refetch()`
 * FROM AN EFFECT, and a `refetch()` cancels a read in flight and sends a new one (TanStack 5.102.8's
 * `cancelRefetch`): from every screen that reads, a new day or a new order would be asked once per
 * screen. The minute is here too, for one home — TanStack would merge it anyway (each answer re-arms
 * every screen's interval, so they fire together; measured 2026-11-10 at the local gateway, one read
 * of today's orders a minute with three screens up, with the interval on one reader or on all three).
 */
export function useApartadosAlDia(kitchenId: string | null): LecturaDeApartados {
  return useLecturas(kitchenId, true);
}

function useLecturas(kitchenId: string | null, alDia: boolean): LecturaDeApartados {
  const client = useQueryClient();
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  const ahora = useAhora(APARTADOS_CADA_MS);
  const dia = diaTexto(ahora);
  const enabled = ready && userId !== null && kitchenId !== null;
  const listings = useListings(kitchenId);
  const hoy = useQuery({
    queryKey: apartadosKey(userId, kitchenId, 'hoy'),
    queryFn: () => {
      const leido = client.getQueryState(apartadosKey(userId, kitchenId, 'antes'))?.dataUpdatedAt ?? 0;
      return myReservations(kitchenId as string, desdeDeHoy(leido > 0 ? new Date(leido) : null, new Date()));
    },
    enabled,
    refetchInterval: alDia ? (query) => (vivo(listings.data, query.state.data, new Date()) ? APARTADOS_CADA_MS : false) : undefined,
  });
  const antes = useQuery({
    queryKey: apartadosKey(userId, kitchenId, 'antes'),
    queryFn: () => {
      const now = new Date();
      return myReservations(kitchenId as string, desdeDia(now), diaTexto(now));
    },
    enabled,
    staleTime: HISTORIAL_FRESCO_MS,
  });
  const vecinos = useQuery({
    queryKey: apartadosKey(userId, kitchenId, 'vecinos'),
    queryFn: () => reservationNeighbours(kitchenId as string),
    enabled,
    staleTime: HISTORIAL_FRESCO_MS,
  });

  const { refetch: refetchHoy } = hoy;
  const { refetch: refetchAntes } = antes;
  const { refetch: refetchVecinos } = vecinos;

  // ⚠️ A LIST READ ON ANOTHER DAY IS ASKED AGAIN — when the day turns with the app open, and on a launch the
  // morning after (the review of `10.5b-iv-b`: a launch at 00:10 found the history fresh for 30 minutes and
  // never asked it, and yesterday was in neither list). Until the history is read, today's reaches back to
  // its day (`desdeDeHoy`). A read that fails leaves its moment as it was, so nothing loops.
  const leidoHoy = hoy.dataUpdatedAt;
  const leidoAntes = antes.dataUpdatedAt;
  useEffect(() => {
    if (!alDia) return;
    if (leidoAntes > 0 && diaTexto(new Date(leidoAntes)) !== dia) void refetchAntes();
    if (leidoHoy > 0 && diaTexto(new Date(leidoHoy)) !== dia) void refetchHoy();
  }, [alDia, dia, leidoHoy, leidoAntes, refetchHoy, refetchAntes]);

  // ⚠️ TODAY'S ORDERS CHANGED (one more, one cancelled, one handed over, a window over): who reserved each, again.
  const firma = hoy.data === undefined ? null : firmaDeHoy(hoy.data, ahora);
  const firmaVista = useRef<string | null>(null);
  useEffect(() => {
    if (!alDia || firma === null) return;
    const antesVista = firmaVista.current;
    firmaVista.current = firma;
    if (antesVista !== null && antesVista !== firma) void refetchVecinos();
  }, [alDia, firma, refetchVecinos]);

  const cola = useCola();
  const senal = useSenal();
  const porEnviar = useMemo(() => deLaCocina(cola, userId, kitchenId), [cola, userId, kitchenId]);
  const data = useMemo(() => {
    if (hoy.data === undefined || antes.data === undefined || vecinos.data === undefined) return undefined;
    const reservas = reservasConCola(unir(antes.data, hoy.data), porEnviar);
    return { reservas, vecinos: vecinosConCola(vecinos.data, porEnviar, reservas) };
  }, [hoy.data, antes.data, vecinos.data, porEnviar]);
  const refetch = useCallback(
    () => Promise.all([refetchHoy(), refetchAntes(), refetchVecinos()]),
    [refetchHoy, refetchAntes, refetchVecinos],
  );
  const rechazoDeOrden = useCallback(
    (reservaId: string) => rechazoDe(cola, userId, reservaId, new Date())?.falla ?? null,
    [cola, userId],
  );
  return {
    data,
    isError: hoy.isError || antes.isError || vecinos.isError,
    isFetching: hoy.isFetching || antes.isFetching || vecinos.isFetching,
    isRefetching: hoy.isRefetching || antes.isRefetching,
    refetch,
    leidoEn: hoy.dataUpdatedAt > 0 ? new Date(hoy.dataUpdatedAt) : null,
    sinSenal: senal === false,
    porEnviar,
    rechazoDe: rechazoDeOrden,
  };
}

/**
 * *Ya cobré y lo entregué*, *Ya la serví* — and *Sí pasó* (`hand_over_reservation`). ⚠️ `10.5b-iv-b`:
 * QUEUED, NEVER AWAITED (`@/api/cola`) — written to the phone with the moment she tapped, drawn at once
 * as handed over, and sent now or when the signal returns. A refusal comes back on the order
 * (`rechazoDe`), never as a wait at the counter.
 */
export function useEntregar(kitchenId: string | null) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const entregar = useCallback(
    (id: string) => {
      if (userId === null || kitchenId === null) return;
      encolarEnvio({ tipo: 'entrega', usuario: userId, cocina: kitchenId, reserva: id, en: new Date() });
    },
    [userId, kitchenId],
  );
  return { entregar };
}

/** A thumb as she gives it: up or down with her labels, or *No se presentó* on a plate that *se liberó*. */
export type PulgarNuevo = { readonly arriba: boolean; readonly etiquetas: readonly string[] } | 'noSePresento';

/**
 * The fonda's thumb (`rate_neighbour`). ⚠️ `10.5b-iv-b`: QUEUED, as the handover — and after it: the
 * queue never sends a thumb ahead of its order's handover, and a second thumb before the first went
 * replaces it, keeping its moment (`@/api/cola`'s `encolar`).
 */
export function useCalificarVecino(kitchenId: string | null) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const calificar = useCallback(
    (id: string, pulgar: PulgarNuevo) => {
      if (userId === null || kitchenId === null) return;
      const base = { tipo: 'pulgar' as const, usuario: userId, cocina: kitchenId, reserva: id, en: new Date() };
      encolarEnvio(
        pulgar === 'noSePresento'
          ? { ...base, arriba: false, etiquetas: [NO_SE_PRESENTO] }
          : { ...base, arriba: pulgar.arriba, etiquetas: pulgar.etiquetas },
      );
    },
    [userId, kitchenId],
  );
  return { calificar };
}

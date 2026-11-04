// ============================================================================
// HOW A SCREEN REACHES THE DATABASE. Plan tasks `10.4b-iii-a` (her kitchens),
// `10.4b-iii-b` (making one; her trade, her address and her pin),
// `10.4b-iii-c` (her way out), `10.4b-iv-a` (what she publishes), `10.4h`
// (address first: her address screen's writes, and her trade's door of its own),
// `10.5-ii` (her page in Itacate, and a photo per dish) and `10.5-iii-c` (her
// kitchen deleted alone).
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
import { useState } from 'react';

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
  photoRequest,
  publishListing,
  revokeApple,
  setKitchenGiro,
  setKitchenPage,
  setPlacePin,
  uploadPictures,
  withdrawListing,
} from '@/api/calls';
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
import { PLACES_KEY, placeKey, type SetStorePinArgs } from '@/api/place';
import { makeKitchen, withKitchen, type Draft } from '@/api/registro';
import { useAuth } from '@/auth/AuthProvider';
import { releaseStep } from '@/auth/apple';

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

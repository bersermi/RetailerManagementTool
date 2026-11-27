// ============================================================================
// HOW A SCREEN REACHES THE DATABASE. Plan tasks `10.4b-iii-a` (her kitchens),
// `10.4b-iii-b` (making one; her trade, her address and her pin),
// `10.4b-iii-c` (her way out), `10.4b-iv-a` (what she publishes), `10.4h`
// (address first: her address screen's writes, and her trade's door of its own),
// `10.5-ii` (her page in Itacate, and a photo per dish), `10.5-iii-c` (her
// kitchen deleted alone), `10.5-i-b-ii` (Google's point for her address, kept
// again when its 30-day copy is a week old), `10.5b-iv-a` (her kitchen's
// reservations, the handover and the fonda's thumb), `10.5b-iv-b` (those
// reads kept on the phone, and the handover and the thumb queued), `10.5b-iv-c`
// (her settings, her stars, − and +, and the database asked before Apple), `10.9a-i`
// (what her kitchen uses), `10.9a-ii` (her choices and *Cuéntanos*, written), `10.9b-ii`
// (her role, who works at her kitchen, *Quitar a …* and *Salir de esta cocina*) and `10.9e-ii`
// (the loyalty card: its terms, closing it, its counts, this phone's key and a scan).
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

import { AJUSTES_KEY, ajustesCon, ajustesKey, type Ajustes, type AjustesPatch } from '@/api/ajustes';
import {
  OWNERS_KEY,
  PLATE_PENDING_CODE,
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
  fallaDe,
  type Falla,
  type Reserva,
  type SobreElVecino,
} from '@/api/apartados';
import { CALIFICACIONES_FRESCAS_MS, calificacionesKey } from '@/api/calificaciones';
import {
  EQUIPO_KEY,
  ROL_KEY,
  equipoKey,
  esDuena,
  quitarErrorMessage,
  rolKey,
  salirErrorMessage,
  sinPersona,
  type MemberRow,
  type Rol,
} from '@/api/equipo';
import { codigoErrorMessage, codigoKey, esRechazoDelCodigo } from '@/api/invitar';
import { SERVICIOS_KEY, serviciosKey, type Estado, type LoQueUsa, type Servicio } from '@/api/servicios';
import { seguidoresKey } from '@/api/seguidores';
import { NUMEROS_KEY, numerosKey } from '@/api/numeros';
import {
  PROMOCIONES_KEY,
  avisoOfrecidoKey,
  promocionesKey,
  promotionArgs,
  type CreateArgs,
  type PromotionsRow,
} from '@/api/promociones';
import {
  TARJETA_KEY,
  codeArgs,
  rewardArgs,
  stampArgs,
  tarjetaKey,
  termsArgs,
  type CardRow,
  type DiasSinVenir,
  type KitchenCardRow,
} from '@/api/tarjeta';
import { selloKey } from '@/api/sello';
import { AVISOS_KEY, CONSENTIMIENTO_KEY, avisosKey, consentimientoKey, type Aviso, type Consentimiento } from '@/api/push';
import {
  accountOwners,
  deleteMyAccount,
  deleteMyBusiness,
  direccionCalls,
  firstPlace,
  kitchenAjustes,
  kitchenGiros,
  kitchenCalls,
  kitchenTeam,
  inviteHelper,
  joinWithCode,
  kitchenOfCode,
  leaveKitchen,
  myRole,
  setMemberActive,
  kitchenPage,
  myKitchenFeatures,
  myKitchenRatings,
  myKitchens,
  myListings,
  myReservations,
  photoRequest,
  plateStillPending,
  publishListing,
  reservationNeighbours,
  revokeApple,
  sendMenuRequest,
  setKitchenAjustes,
  setKitchenFeatures,
  setKitchenGiro,
  setKitchenPage,
  setListingQuantity,
  setPlaceGooglePoint,
  setPlacePin,
  uploadPictures,
  deletePictures,
  withdrawListing,
  kitchenFollowers,
  kitchenNumbers,
  cardOfCode,
  closeCard,
  giveReward,
  giveStamp,
  kitchenCard,
  kitchenSealKeys,
  registerKitchenKey,
  setCardTerms,
  createPromotion,
  endPromotion,
  kitchenPromotions,
  undoPromotion,
  promotionAlertOffered,
  alertPromotion,
  myNotificationKinds,
  setNotificationSwitch,
  myConsent,
  setMyConsent,
} from '@/api/calls';
import { deLaCocina, rechazoDe, reservasConCola, vecinosConCola, type Envio } from '@/api/cola';
import { guardarSuDireccion, type Escritura } from '@/api/direccion';
import { apiErrorMessage } from '@/api/errors';
import { FILE_OF, isPicturePath, porSubir, type Foto, type FotoNueva, type PhotoSize } from '@/api/fotos';
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
  cantidadErrorMessage,
  cantidadPedida,
  esApartado,
  listingFrom,
  listingsKey,
  setQuantityArgs,
  withCantidad,
  withListing,
  withWithdrawn,
  type Listing,
  type PublishArgs,
} from '@/api/listing';
import {
  PAGES_KEY,
  pageKey,
  pagePatch,
  picturesToDelete,
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
import { guardarLlave, leerLlave, type Llave } from '@/lib/llave';
import { escaneoId, momentoDeLaLlamada, tarjetaErrorMessage, type Escaneo } from '@/lib/tarjeta';
import { deviceStore } from '@/lib/store';
import { servicioErrorMessage } from '@/lib/loQueUsas';
import { noSeUne, promocionErrorMessage } from '@/lib/promociones';
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
      // ⚠️ `10.9g-ii`: the promotion it joined cannot take it (`TD031`) — said so, and her promotions read again.
      if (noSeUne(thrown)) {
        void queries.invalidateQueries({ queryKey: PROMOCIONES_KEY });
        return promocionErrorMessage(thrown);
      }
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
 * ⚠️ `10.9i-ii`: ONCE IT LANDS, THE COVER OR LOGO IT REPLACED OR REMOVED IS DELETED
 * (`picturesToDelete`, `deletePictures`) — after the save, never before, and not
 * waited on: her screen closes on the save alone.
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
    onSuccess: (page, input) => {
      queries.setQueryData<Page>(pageKey(userId, kitchenId), page);
      void deletePictures(picturesToDelete(input.saved, page));
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

  /**
   * ⚠️ `10.5b-iv-c`: `pendientesEn` — every business that goes with her account
   * (`@/api/account`'s `pendingIds`). THE DATABASE IS ASKED FIRST whether a plate is still to
   * hand over at one of them (`TD014`'s own rule), so a deletion it would refuse never opens
   * Apple's sheet nor takes her off Apple's list. A read that fails (no signal) says nothing:
   * the deletion goes on, and the database still answers last.
   */
  async function remove(args: DeleteArgs, pendientesEn: readonly string[] = []): Promise<string | null> {
    setLeaving(true);
    try {
      const pendiente = await plateStillPending(pendientesEn, new Date()).catch(() => false);
      if (pendiente) return deleteErrorMessage({ code: PLATE_PENDING_CODE });
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
// `10.5b-iv-c` — her settings, her stars, and − and +
// ----------------------------------------------------------------------------

/** Her kitchen's settings (`@/api/ajustes`): the open kitchen's, or the defaults when she has no row. */
export function useAjustes(kitchenId: string | null) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ajustesKey(userId, kitchenId),
    queryFn: () => kitchenAjustes(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null,
  });
}

/**
 * One setting saved — a switch, an option, the *desechable*'s price — through her page's one door,
 * the key she changed and nothing else. ⚠️ DRAWN AT ONCE (`ajustesCon`) and PUT BACK when the door
 * refuses or the signal fails, with the sentence to show; the row the door answers is drawn then,
 * and her settings are read again either way. ⚠️ ONE AT A TIME (`busy`): a switch tapped twice
 * would send two requests whose answers can cross, and the last to land would win.
 */
export function useGuardarAjuste(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const key = ajustesKey(userId, kitchenId);
  const mutation = useMutation({
    mutationFn: (patch: AjustesPatch) => setKitchenAjustes(kitchenId as string, patch),
    onMutate: async (patch) => {
      await queries.cancelQueries({ queryKey: key });
      const antes = queries.getQueryData<Ajustes>(key);
      if (antes !== undefined) queries.setQueryData<Ajustes>(key, ajustesCon(antes, patch));
      return { antes };
    },
    onError: (_thrown, _patch, context) => {
      if (context?.antes !== undefined) queries.setQueryData<Ajustes>(key, context.antes);
    },
    onSuccess: (guardados) => {
      queries.setQueryData<Ajustes>(key, guardados);
    },
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: AJUSTES_KEY });
    },
  });

  async function guardar(patch: AjustesPatch): Promise<string | null> {
    if (kitchenId === null || mutation.isPending) return null;
    try {
      await mutation.mutateAsync(patch);
      return null;
    } catch (thrown) {
      return apiErrorMessage(thrown);
    }
  }

  return { guardar, busy: mutation.isPending };
}

/** Her stars (`my_kitchen_ratings`): the day after, from five, never who. Read again at most every half hour. */
export function useCalificaciones(kitchenId: string | null) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: calificacionesKey(userId, kitchenId),
    queryFn: () => myKitchenRatings(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null,
    staleTime: CALIFICACIONES_FRESCAS_MS,
  });
}

/**
 * `10.9a-i`: what her kitchen uses (`my_kitchen_features`) — her choices, what Wera offers, Próximamente.
 * Read when a screen that draws it mounts — the first run's third step, *Lo que usas* and *Hoy*'s foot
 * (`10.9a-ii`) — and written by the two hooks below.
 */
export function useServicios(kitchenId: string | null) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: serviciosKey(userId, kitchenId),
    queryFn: () => myKitchenFeatures(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null,
  });
}

/**
 * `10.9a-ii`: her choices written — the first run's *Seguir* (every feature it showed, in one call),
 * *Activar* and *Me interesa* (one). ⚠️ NOT DRAWN BEFORE IT LANDS: a choice turns a tile on her *Hoy*
 * and, for the card and promotions, a word on her page in Itacate, so the screen waits with its
 * button busy and draws the database's answer (`set_kitchen_features` answers the read whole).
 * ⚠️ `TD024` — Wera switched it off while she looked — is said in words (`servicioErrorMessage`)
 * and her kitchen's choices are read again, so the feature leaves the screen. ONE AT A TIME.
 */
export function useElegirServicios(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: (choices: Readonly<Partial<Record<Servicio, Estado>>>) => setKitchenFeatures(kitchenId as string, choices),
    onSuccess: (loQueUsa) => {
      queries.setQueryData<LoQueUsa>(serviciosKey(userId, kitchenId), loQueUsa);
      // ⚠️ `10.9g-iii`: her *off* ends her running promotions (`0087`'s trigger) — read again, so no preview keeps them.
      void queries.invalidateQueries({ queryKey: PROMOCIONES_KEY });
    },
    onError: () => {
      void queries.invalidateQueries({ queryKey: SERVICIOS_KEY });
    },
  });

  async function elegir(choices: Readonly<Partial<Record<Servicio, Estado>>>): Promise<string | null> {
    if (kitchenId === null || mutation.isPending) return null;
    try {
      await mutation.mutateAsync(choices);
      return null;
    } catch (thrown) {
      return servicioErrorMessage(thrown);
    }
  }

  return { elegir, busy: mutation.isPending };
}

/**
 * `10.9a-ii`: *Cuéntanos cómo necesitas tu menú* sent (`send_menu_request`). What she wrote stays in
 * the database; the answer's `menu_requests` takes the line off *Hoy* on every phone of her kitchen.
 */
export function useContarMenu(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: (texto: string) => sendMenuRequest(kitchenId as string, texto),
    onSuccess: (loQueUsa) => {
      queries.setQueryData<LoQueUsa>(serviciosKey(userId, kitchenId), loQueUsa);
    },
  });

  async function enviar(texto: string): Promise<string | null> {
    if (kitchenId === null || mutation.isPending) return null;
    try {
      await mutation.mutateAsync(texto);
      return null;
    } catch (thrown) {
      return apiErrorMessage(thrown);
    }
  }

  return { enviar, busy: mutation.isPending };
}

/**
 * − and + on *Tus ofertas* (`set_listing_quantity`). `cambiar` moves one plate from where her
 * last tap left it — never below what is taken (`cantidadPedida`) — draws it at once
 * (`withCantidad`) and sends it. ⚠️ ONE SEND AT A TIME PER DISH, THE LAST TAP WINS: three quick
 * taps of + are three requests whose answers could land in any order, so while one is out the
 * next tap only moves what is wanted (`deseados`, counted from synchronously, so no tap is lost
 * to a render not yet made), and the loop sends it once the first has answered — the database
 * ends where her finger ended. ⚠️ A READ OF HER LIST IN FLIGHT IS CANCELLED BEFORE THE DRAWING:
 * it would land after it with the count from before the tap. On a refusal (`TD019`: someone
 * reserved meanwhile) the sentence is that dish's, and her list is read again either way.
 */
export function useCantidades(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const deseados = useRef(new Map<string, number>());
  const enviando = useRef(new Set<string>());
  const [ocupadas, setOcupadas] = useState<ReadonlySet<string>>(() => new Set());
  const [problemas, setProblemas] = useState<Readonly<Record<string, string>>>({});

  const cambiar = useCallback(
    (listingId: string, lineNo: number, paso: 1 | -1, count: number, taken: number) => {
      const clave = `${listingId}:${lineNo}`;
      const deseado = cantidadPedida(deseados.current.get(clave) ?? count, taken, paso);
      if (deseado === null) return;
      deseados.current.set(clave, deseado);
      const key = listingsKey(userId, kitchenId);
      setProblemas((now) => {
        if (!(clave in now)) return now;
        const { [clave]: _quitado, ...resto } = now;
        return resto;
      });
      void (async () => {
        await queries.cancelQueries({ queryKey: key });
        queries.setQueryData<Listing[]>(key, (listings) => withCantidad(listings, listingId, lineNo, deseados.current.get(clave) ?? deseado));
        if (enviando.current.has(clave)) return;
        enviando.current.add(clave);
        setOcupadas((now) => new Set(now).add(clave));
        try {
          let enviado: number | undefined;
          while (deseados.current.get(clave) !== enviado) {
            enviado = deseados.current.get(clave) as number;
            await setListingQuantity(setQuantityArgs(listingId, lineNo, enviado));
          }
        } catch (thrown) {
          setProblemas((now) => ({ ...now, [clave]: cantidadErrorMessage(thrown) }));
          // ⚠️ Someone reserved meanwhile (`TD019`): what is taken changed, and the phone's copy is up to a
          // minute old — read today's orders again now, or *quedan* says one more than there is (seen on the emulator).
          if (esApartado(thrown)) void queries.invalidateQueries({ queryKey: apartadosKey(userId, kitchenId, 'hoy') });
        } finally {
          deseados.current.delete(clave);
          enviando.current.delete(clave);
          setOcupadas((now) => {
            const sin = new Set(now);
            sin.delete(clave);
            return sin;
          });
          void queries.invalidateQueries({ queryKey: LISTINGS_KEY });
        }
      })();
    },
    [queries, userId, kitchenId],
  );

  return { cambiar, ocupadas, problemas };
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

// ----------------------------------------------------------------------------
// `10.9b-ii` — her role, who works at her kitchen, *Quitar a …*, *Salir de esta cocina*
// ----------------------------------------------------------------------------

/**
 * Her role at the open kitchen (`my_role`) — `undefined` until read, `null` once she is no active
 * member. ⚠️ KEPT ON THE PHONE (`@/api/persist`), so a helper's *Hoy* opened with no signal never
 * draws the owner's parts, nor an owner's loses hers. Read again as her kitchens are: on every
 * return to the front, a minute on.
 */
export function useSuRol(kitchenId: string | null) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery<Rol | null>({
    queryKey: rolKey(userId, kitchenId),
    queryFn: () => myRole(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null,
  });
}

/**
 * ⚠️ A HELPER REMOVED OR GONE IS READ AS NO KITCHEN: when the database answers that she is no
 * longer at this kitchen (`null`), her kitchens are read again — the walls leave it out — and the
 * guard sends her where a kitchen is made. ONE READER, in the tabs' layout (always mounted), so
 * one re-read: from every screen it would go out once per screen and cancel the one before.
 */
export function useSiYaNoEstaAqui(kitchenId: string | null): void {
  const rol = useSuRol(kitchenId).data;
  const queries = useQueryClient();
  useEffect(() => {
    if (kitchenId !== null && rol === null) void queries.invalidateQueries({ queryKey: KITCHENS_KEY });
  }, [kitchenId, rol, queries]);
}

/**
 * *Quién trabaja aquí* — the open kitchen's active memberships, read on the OWNER's phone alone
 * (`rol`): a helper's phone never asks for her colleagues. Not kept on the phone.
 */
export function useEquipo(kitchenId: string | null, rol: Rol | null | undefined) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: equipoKey(userId, kitchenId),
    queryFn: () => kitchenTeam(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null && esDuena(rol),
  });
}

/**
 * *Quitar a …* — the owner ends a helper's membership; her phone loses the kitchen on its next
 * read. Answers `null`, or the sentence to show. ⚠️ DRAWN GONE ONLY ONCE IT LANDED: a refusal must
 * not show her gone. `deshacer` puts her back (*Deshacer*, 8 seconds), answering the same way.
 * Either way the list is read again.
 */
export function useQuitar(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const selfId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: (input: { userId: string; activo: boolean }) =>
      setMemberActive({ kitchenId: kitchenId as string, userId: input.userId }, input.activo),
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: EQUIPO_KEY });
    },
  });

  async function cambiar(userId: string, activo: boolean): Promise<string | null> {
    if (kitchenId === null) return null;
    try {
      await mutation.mutateAsync({ userId, activo });
    } catch (thrown) {
      return quitarErrorMessage(thrown);
    }
    if (!activo) queries.setQueryData<MemberRow[]>(equipoKey(selfId, kitchenId), (rows) => sinPersona(rows, userId));
    return null;
  }

  return {
    quitar: (userId: string) => cambiar(userId, false),
    deshacer: (userId: string) => cambiar(userId, true),
    busy: mutation.isPending,
  };
}

/**
 * *Salir de esta cocina* (`leave_kitchen`) — a helper ends her own membership. Answers `null`, or
 * the sentence to show. ⚠️ ON SUCCESS THE KITCHEN LEAVES HER LIST AT ONCE (`setQueryData`, as
 * *Eliminar esta cocina* does), so the guard sends her where a kitchen is made without waiting for
 * the re-read. ⚠️ ON A REFUSAL HER KITCHENS ARE READ AGAIN TOO: an owner removed her meanwhile
 * (`42501`), and the guard moves her if the kitchen is gone.
 */
export function useSalirDeLaCocina(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({ mutationFn: (id: string) => leaveKitchen(id) });

  async function salir(): Promise<string | null> {
    if (kitchenId === null || mutation.isPending) return null;
    try {
      await mutation.mutateAsync(kitchenId);
    } catch (thrown) {
      void queries.invalidateQueries({ queryKey: KITCHENS_KEY });
      return salirErrorMessage(thrown);
    }
    queries.setQueryData<Kitchen[]>(kitchensKey(userId), (kitchens) => kitchens?.filter((kitchen) => kitchen.id !== kitchenId));
    void queries.invalidateQueries({ queryKey: KITCHENS_KEY });
    void queries.invalidateQueries({ queryKey: OWNERS_KEY });
    return null;
  }

  return { salir, busy: mutation.isPending };
}

// ----------------------------------------------------------------------------
// `10.9b-iii` — a helper's code: *Invitar a alguien*, *Unirme a …*, joining
// ----------------------------------------------------------------------------

/**
 * *Invitar a alguien* — the owner asks for a code, each time her sheet opens (`invite_helper`): a
 * code for ONE person, so a second helper gets a second code, and an earlier one keeps its 24 hours.
 * Online only: a code is the database's, and nothing is queued. `problema` is the sentence to show.
 */
export function useInvitar(kitchenId: string | null) {
  const mutation = useMutation({ mutationFn: (id: string) => inviteHelper(id) });
  const { mutate, reset } = mutation;
  const pedir = useCallback(() => {
    if (kitchenId !== null) mutate(kitchenId);
  }, [kitchenId, mutate]);
  return {
    pedir,
    olvidar: reset,
    invitacion: mutation.data ?? null,
    problema: mutation.isError ? apiErrorMessage(mutation.error) : null,
    busy: mutation.isPending,
  };
}

/**
 * The kitchen a code she typed would join (`kitchen_of_code`), asked once the code is whole
 * (`codigo` not `null`). ⚠️ THE DATABASE'S REFUSAL IS ITS LAST WORD on that code — `TD005`, `TD003`,
 * `22023` are never retried; a dead link is, as every read is. Not kept on the phone.
 */
export function useCocinaDelCodigo(codigo: string | null) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: codigoKey(userId, codigo),
    queryFn: () => kitchenOfCode(codigo as string),
    enabled: ready && userId !== null && codigo !== null,
    retry: (failures, error) => failures < 2 && !esRechazoDelCodigo(error),
  });
}

/**
 * *Unirme a Fonda Doña Mari* — joining with the code (`redeem_invite`): her helper's membership, at
 * once. Answers `null`, or the sentence to show. ⚠️ ON SUCCESS THE KITCHEN GOES INTO HER LIST AT
 * ONCE, so the guard takes her to *Hoy* without waiting for the re-read (`useMakeKitchen`'s rule);
 * ⚠️ ON SETTLED, NOT ONLY ON SUCCESS, HER KITCHENS ARE READ AGAIN: a reply lost after she joined
 * fails here while she is in — the re-read finds the kitchen and the guard moves her, and a second
 * tap would be her own code, which answers the same (`redeem_invite` is idempotent for her).
 */
export function useUnirme() {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: (codigo: string) => joinWithCode(codigo),
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: KITCHENS_KEY });
      void queries.invalidateQueries({ queryKey: ROL_KEY });
    },
  });

  async function unirme(codigo: string): Promise<string | null> {
    if (mutation.isPending) return null;
    try {
      const unida = await mutation.mutateAsync(codigo);
      queries.setQueryData<Kitchen[]>(kitchensKey(userId), (kitchens) => [
        ...(kitchens ?? []).filter((kitchen) => kitchen.id !== unida.kitchenId),
        { id: unida.kitchenId, displayName: unida.nombre, giroPrincipal: null },
      ]);
      return null;
    } catch (thrown) {
      return codigoErrorMessage(thrown);
    }
  }

  return { unirme, busy: mutation.isPending };
}

// ----------------------------------------------------------------------------
// `10.9d-ii` — *Te siguen N*
// ----------------------------------------------------------------------------

/**
 * ⚠️ `10.9d-ii`: HOW MANY NEIGHBOURS FOLLOW HER KITCHEN (`kitchen_followers`, `0084`; G22) — on the
 * day's card on *Hoy* and before *Eliminar esta cocina*. Any member reads it, her helpers too. Keyed on
 * the login and the kitchen; ⚠️ NOT on the phone's disk (`@/api/persist`'s list is unchanged): with no
 * signal the card simply leaves the line out, and a count read days ago is never shown as today's.
 * ⚠️ `10.9h-ii`: also under *Avisar a quienes te siguen* on *Nueva promoción* — asked there only while it is offered
 * (`activa`).
 */
export function useSeguidores(kitchenId: string | null, { activa = true }: { activa?: boolean } = {}) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: seguidoresKey(userId, kitchenId),
    queryFn: () => kitchenFollowers(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null && activa,
  });
}

// ----------------------------------------------------------------------------
// `10.9f` — her numbers (`0086`)
// ----------------------------------------------------------------------------

/**
 * ⚠️ *TUS NÚMEROS* (`kitchen_numbers`, `0086`; G24–G27) — its screen and its tile on *Hoy*. THE OWNER'S: asked
 * only on her phone (`activa`: she is the owner, she uses them and this build carries them), never a helper's.
 * Keyed on the login and the kitchen; ⚠️ NOT on the phone's disk (`@/api/persist`'s list is unchanged): a count
 * read on another day is not today's. With no signal the read PAUSES (online mode) — the tile and the screen read
 * `fetchStatus === 'paused'` as a read that could not be made and say so.
 */
export function useNumeros(kitchenId: string | null, { activa = true }: { activa?: boolean } = {}) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: numerosKey(userId, kitchenId),
    queryFn: () => kitchenNumbers(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null && activa,
  });
}

// ----------------------------------------------------------------------------
// `10.9g-ii` — promotions (`0087`)
// ----------------------------------------------------------------------------

/**
 * ⚠️ HER KITCHEN'S PROMOTIONS (`kitchen_promotions`, `0087`) — *Promociones*, its tile on *Hoy* and *¿Es parte de una
 * promoción?* in *Publicar*. Any member (a helper publishes). ⚠️ ASKED ONLY WHILE SHE USES THEM (`activa`:
 * `@/lib/promociones`' `seLeen`) — with her choice off none runs, so there is nothing to ask. Keyed on the login and
 * the kitchen; not on the phone's disk. With no signal the read PAUSES (online mode): the tile and the screen say they
 * could not read them (`fetchStatus === 'paused'`), as her numbers' do.
 */
export function usePromociones(kitchenId: string | null, { activa = true }: { activa?: boolean } = {}) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: promocionesKey(userId, kitchenId),
    queryFn: () => kitchenPromotions(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null && activa,
  });
}

/**
 * ⚠️ `10.9h-ii`: WHETHER *NUEVA PROMOCIÓN* OFFERS *AVISAR A QUIENES TE SIGUEN* (`promotion_alert_offered`, `0094`) — the
 * kind `promocion_cocina` on, dark until his product analyst rules. Asked only on the form (`activa`: she is the owner).
 * Keyed on the login and the kitchen; ⚠️ NOT on the phone's disk: an answer read on another day is not today's, and a
 * read that failed or waits offers nothing (`data !== true`) — the form never draws a switch the database would not honour.
 */
export function useAvisoOfrecido(kitchenId: string | null, { activa = true }: { activa?: boolean } = {}) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: avisoOfrecidoKey(userId, kitchenId),
    queryFn: () => promotionAlertOffered(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null && activa,
  });
}

/** What a press of *Publicar promoción* answers: her list as the database left it, or the sentence to show. */
export type Creada = { readonly row: PromotionsRow; readonly problema: null } | { readonly row: null; readonly problema: string };

/**
 * *Publicar promoción* (`create_promotion`) — the owner's. ⚠️ ITS PHOTO GOES UP FIRST, under the path made when it
 * was taken, so a retry sends the same one; a failed upload makes nothing. ⚠️ A RETRY UNDER THE SAME ID IS THE SAME
 * PROMOTION (the form keeps the id while nothing changes). ⚠️ NOT DRAWN BEFORE IT LANDS: her list is the database's
 * answer, and her choices are read again (making one turns them `on`).
 */
export function useCrearPromocion(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: async (input: { args: CreateArgs; fotos: readonly FotoNueva[] }) => {
      await uploadPictures(input.fotos);
      return createPromotion(input.args);
    },
    onSuccess: (row) => {
      queries.setQueryData<PromotionsRow>(promocionesKey(userId, kitchenId), row);
    },
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: PROMOCIONES_KEY });
      void queries.invalidateQueries({ queryKey: SERVICIOS_KEY });
    },
  });

  async function crear(args: CreateArgs, fotos: readonly FotoNueva[]): Promise<Creada> {
    if (kitchenId === null) return { row: null, problema: apiErrorMessage(null) };
    try {
      return { row: await mutation.mutateAsync({ args, fotos }), problema: null };
    } catch (thrown) {
      return { row: null, problema: promocionErrorMessage(thrown) };
    }
  }

  return { crear, busy: mutation.isPending };
}

/** *Terminarla hoy* (`end_promotion`) — the owner's, at once. Her list is the database's answer. */
export function useTerminarPromocion(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: (id: string) => endPromotion(promotionArgs(kitchenId as string, id)),
    onSuccess: (row) => {
      queries.setQueryData<PromotionsRow>(promocionesKey(userId, kitchenId), row);
    },
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: PROMOCIONES_KEY });
    },
  });

  async function terminar(id: string): Promise<string | null> {
    if (kitchenId === null || mutation.isPending) return null;
    try {
      await mutation.mutateAsync(id);
      return null;
    } catch (thrown) {
      return promocionErrorMessage(thrown);
    }
  }

  return { terminar, busy: mutation.isPending };
}

/**
 * *Deshacer* after *Publicar promoción* (`undo_promotion`, within two minutes; `TD032` after). ⚠️ THE KITCHEN, THE
 * ID AND ITS PHOTO TRAVEL WITH THE CALL and nothing here belongs to a screen: the toast lives at the root
 * (`@/lib/NotaProvider`) and outlives the form that made it — so a plain call, its answer written into her list.
 * ⚠️ `10.9i-ii`: ONCE THE PROMOTION IS GONE FROM HER LIST, ITS PHOTO IS DELETED (`deletePictures`) — nothing names it
 * any more; not waited on.
 */
export function useDeshacerPromocion(): (kitchenId: string, id: string, foto: string | null) => Promise<string | null> {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  return useCallback(
    async (kitchenId: string, id: string, foto: string | null): Promise<string | null> => {
      try {
        const row = await undoPromotion(promotionArgs(kitchenId, id));
        queries.setQueryData<PromotionsRow>(promocionesKey(userId, kitchenId), row);
        if (foto !== null && !row.promotions.some((p) => p.id === id)) void deletePictures([foto]);
        return null;
      } catch (thrown) {
        return promocionErrorMessage(thrown);
      } finally {
        void queries.invalidateQueries({ queryKey: PROMOCIONES_KEY });
      }
    },
    [queries, userId],
  );
}

/**
 * ⚠️ `10.9h-ii`: *AVISAR A QUIENES TE SIGUEN* (`alert_promotion`, `0094`) — the owner's, once; a retry is the same alert.
 * A plain call with the kitchen and the id, never a screen's mutation: it is made after *Deshacer*'s eight seconds
 * (`@/lib/avisoDePromocion`), when the form is long gone. Nothing cached changes — the database never says how many.
 */
export function useAnunciarPromocion(): (kitchenId: string, id: string) => Promise<unknown> {
  return useCallback((kitchenId: string, id: string) => alertPromotion(promotionArgs(kitchenId, id)), []);
}

// ----------------------------------------------------------------------------
// `10.9e-ii` — the loyalty card in Wera Cocina (`0085`)
// ----------------------------------------------------------------------------

/** How often *Sellar* reads its lines while it is up: a neighbour scanning her code shows within seconds. */
export const SELLAR_CADA_MS = 5_000;

/**
 * ⚠️ HER KITCHEN'S CARD (`kitchen_card`) — the card's screen, *Hoy*'s tile, *Sellar*'s lines, and the
 * warning before *Eliminar esta cocina*. Any member. ⚠️ KEPT ON THE PHONE (`@/api/persist`): with no
 * signal *Hoy* still draws the tile, which is the door to *Sellar*, whose code works with none.
 * ⚠️ ASKED ONLY WHILE WERA OFFERS THE CARD (`activa`): before its switch is on there is nothing to read.
 * *Sellar* reads it every five seconds while up (`vivo`); every other screen when it mounts.
 */
/** How often her kitchen's sealing secrets are read again: a new one is made only when someone stops working there. */
const LLAVES_DE_SELLO_CADA_MS = 30 * 60_000;

/**
 * ⚠️ `10.9j-ii-b`: HER KITCHEN'S SEALING SECRETS (`kitchen_seal_keys`, `0088`; J2) — what checks a neighbour's
 * ticket on this phone with no signal. Read with her kitchen's first read (the tabs' layout mounts it), again
 * every half hour and when the app comes back, and KEPT ON THE PHONE (`@/api/persist`'s list) until *Cerrar
 * sesión*. ⚠️ A version past its day is never used (`revisarSello`), whatever the copy says.
 */
export function useLlavesDeSello(kitchenId: string | null) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: selloKey(userId, kitchenId),
    queryFn: () => kitchenSealKeys(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null,
    staleTime: LLAVES_DE_SELLO_CADA_MS,
    refetchInterval: LLAVES_DE_SELLO_CADA_MS,
  });
}

export function useTarjeta(kitchenId: string | null, { activa = true, vivo = false }: { activa?: boolean; vivo?: boolean } = {}) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: tarjetaKey(userId, kitchenId),
    queryFn: () => kitchenCard(kitchenId as string),
    enabled: ready && userId !== null && kitchenId !== null && activa,
    refetchInterval: vivo ? SELLAR_CADA_MS : false,
  });
}

/**
 * *Activar* and *Guardar* on the setup (`set_card_terms`) — the owner's. ⚠️ NOT DRAWN BEFORE IT LANDS:
 * the terms are what her neighbours start on, so the button waits and the database's answer is drawn.
 * It also turns her choice of the card on, so her choices are read again.
 */
export function useGuardarTerminos(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: (t: { premio: string; sellos: number; dias: DiasSinVenir; condicion: string | null }) =>
      setCardTerms(termsArgs(kitchenId as string, t.premio.trim(), t.sellos, t.dias, t.condicion)),
    onSuccess: (card) => {
      queries.setQueryData<KitchenCardRow>(tarjetaKey(userId, kitchenId), card);
      void queries.invalidateQueries({ queryKey: SERVICIOS_KEY });
    },
  });

  async function guardar(t: { premio: string; sellos: number; dias: DiasSinVenir; condicion: string | null }): Promise<string | null> {
    if (kitchenId === null || mutation.isPending) return null;
    try {
      await mutation.mutateAsync(t);
      return null;
    } catch (thrown) {
      return tarjetaErrorMessage(thrown, 'terminos');
    }
  }

  return { guardar, busy: mutation.isPending };
}

/** *Cerrar la tarjeta* (`close_card`) — the owner's; her choice turns off, so her choices are read again. */
export function useCerrarTarjeta(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: () => closeCard(kitchenId as string),
    onSuccess: (card) => {
      queries.setQueryData<KitchenCardRow>(tarjetaKey(userId, kitchenId), card);
      void queries.invalidateQueries({ queryKey: SERVICIOS_KEY });
    },
  });

  async function cerrar(): Promise<string | null> {
    if (kitchenId === null || mutation.isPending) return null;
    try {
      await mutation.mutateAsync();
      return null;
    } catch (thrown) {
      return tarjetaErrorMessage(thrown, 'terminos');
    }
  }

  return { cerrar, busy: mutation.isPending };
}

/** What *Sellar* knows of this phone's key. */
export type EstadoDeLlave =
  | { readonly tipo: 'lista'; readonly llave: Llave }
  | { readonly tipo: 'preparando' }
  | { readonly tipo: 'sinSenal' }
  | { readonly tipo: 'fallo'; readonly problema: string };

/**
 * ⚠️ THIS PHONE'S *SELLAR* KEY (`@/lib/llave`): read from the phone; ASKED ONCE (`register_kitchen_key`)
 * when there is none and there is signal — never on each open, which would drop her other phones'
 * codes. With no signal and no key, *Sellar* says so and scanning her customer still works.
 * ⚠️ A KEY THE DATABASE NO LONGER HOLDS — she was removed and invited again, or a fourth phone dropped it —
 * shows a code that fits nothing: `renovar` asks for a new one, on her tap (*Pedir un código nuevo*).
 * ⚠️ ONE "STILL HERE" FOR THE SCREEN, NOT ONE PER RUN (the review of `10.9e-ii`): a signal that came back while
 * the first ask was out re-ran the effect, and that run's answer was dropped — the key kept, never shown.
 */
export function useLlaveSellar(kitchenId: string | null): { estado: EstadoDeLlave; reintentar: () => void; renovar: () => void; renovando: boolean } {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const senal = useSenal();
  const [llave, setLlave] = useState<Llave | null>(() =>
    userId === null || kitchenId === null ? null : leerLlave(deviceStore(), userId, kitchenId),
  );
  const [problema, setProblema] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [renovando, setRenovando] = useState(false);
  const pidiendo = useRef(false);
  const aqui = useRef(true);
  useEffect(() => {
    aqui.current = true;
    return () => {
      aqui.current = false;
    };
  }, []);

  const pedir = useCallback(
    (nueva: boolean) => {
      if (userId === null || kitchenId === null || pidiendo.current) return;
      pidiendo.current = true;
      setProblema(null);
      if (nueva) setRenovando(true);
      void registerKitchenKey(kitchenId)
        .then((row) => {
          const guardada = guardarLlave(deviceStore(), userId, kitchenId, row);
          if (aqui.current) setLlave(guardada);
        })
        .catch((thrown: unknown) => {
          if (aqui.current) setProblema(fallaDe(thrown) === 'sinSenal' ? 'sinSenal' : tarjetaErrorMessage(thrown));
        })
        .finally(() => {
          pidiendo.current = false;
          if (aqui.current) setRenovando(false);
        });
    },
    [userId, kitchenId],
  );

  useEffect(() => {
    if (userId === null || kitchenId === null) return;
    const kept = leerLlave(deviceStore(), userId, kitchenId);
    if (kept !== null) {
      setLlave(kept);
      return;
    }
    if (senal === false) return;
    pedir(false);
  }, [userId, kitchenId, senal, intento, pedir]);

  const estado: EstadoDeLlave =
    llave !== null
      ? { tipo: 'lista', llave }
      : problema === 'sinSenal' || (problema === null && senal === false)
        ? { tipo: 'sinSenal' }
        : problema !== null
          ? { tipo: 'fallo', problema }
          : { tipo: 'preparando' };
  return { estado, reintentar: () => setIntento((n) => n + 1), renovar: () => pedir(true), renovando };
}

/** What a scan's call came back with: her card, or — with no signal — kept on the phone (or already), or a sentence. */
export type Respuesta =
  | { readonly tipo: 'tarjeta'; readonly card: CardRow }
  | { readonly tipo: 'enCola' }
  | { readonly tipo: 'yaEnCola' }
  | { readonly tipo: 'sinSenal' }
  | { readonly tipo: 'ocupado' }
  | { readonly tipo: 'problema'; readonly problema: string };

/**
 * ⚠️ A SCAN OF HER CODE — whose it is (`card_of_code`), *Dar sello* (`give_stamp`), *Entregar premio*
 * (`give_reward`) — each checked at the scan's moment: by the database's clock within a minute of it, by the
 * scan's own moment after (`momentoDeLaLlamada`), so a stamp given a minute after the camera read her code
 * still fits it and a phone whose clock is off does not miss. ⚠️ WITH SIGNAL THE SCREEN WAITS FOR THE ANSWER: what it says is what the kitchen
 * tells her at the counter (*ganó*, *ya tiene su sello de hoy*). ⚠️ WITH NONE — the signal said so, or
 * the call failed for want of it — a stamp or a reward goes to her queue (`@/api/cola`) and is sent with
 * that moment when the signal returns; who she is cannot be read then. Her card's counts are read again
 * after every answer. One call at a time.
 */
export function useEscaneo(kitchenId: string | null) {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const senal = useSenal();
  const [busy, setBusy] = useState(false);
  const enCurso = useRef(false);

  const cola = useCola();
  async function llamar(enviar: () => Promise<CardRow>, encolar: { id: string; hacer: () => void } | null): Promise<Respuesta> {
    if (kitchenId === null || userId === null || enCurso.current) return { tipo: 'ocupado' };
    const sinSenal = (): Respuesta => {
      if (encolar === null) return { tipo: 'sinSenal' };
      // ⚠️ The same scan already on this phone: it goes once — and a reward is NOT handed over again.
      if (cola.envios.some((e) => e.usuario === userId && e.reserva === encolar.id)) return { tipo: 'yaEnCola' };
      encolar.hacer();
      return { tipo: 'enCola' };
    };
    if (senal === false) return sinSenal();
    enCurso.current = true;
    setBusy(true);
    try {
      const card = await enviar();
      void queries.invalidateQueries({ queryKey: TARJETA_KEY });
      // ⚠️ `10.9f`: a stamp is a visit in her numbers.
      void queries.invalidateQueries({ queryKey: NUMEROS_KEY });
      return { tipo: 'tarjeta', card };
    } catch (thrown) {
      if (fallaDe(thrown) === 'sinSenal') return sinSenal();
      return { tipo: 'problema', problema: tarjetaErrorMessage(thrown) };
    } finally {
      enCurso.current = false;
      setBusy(false);
    }
  }

  const base = (e: Escaneo) => ({ usuario: userId as string, cocina: kitchenId as string, reserva: escaneoId(e), en: e.en });

  return {
    busy,
    /** Whose code it is, and her card here — with no signal, nothing to read. */
    buscar: (e: Escaneo) => llamar(() => cardOfCode(codeArgs(kitchenId as string, e.code, e.key)), null),
    darSello: (e: Escaneo) =>
      llamar(() => giveStamp(stampArgs(kitchenId as string, e.code, e.key, momentoDeLaLlamada(e, new Date()))), {
        id: escaneoId(e),
        hacer: () => encolarEnvio({ tipo: 'sello', ...base(e), codigo: e.code, llave: e.key }),
      }),
    darPremio: (e: Escaneo, premio: string) =>
      llamar(() => giveReward(rewardArgs(kitchenId as string, e.code, premio, e.key, momentoDeLaLlamada(e, new Date()))), {
        id: escaneoId({ ...e, premio }),
        hacer: () => encolarEnvio({ tipo: 'premio', ...base({ ...e, premio }), codigo: e.code, llave: e.key, premio }),
      }),
  };
}

/**
 * ⚠️ `10.9e-ii`: HER LOGO AS A DATA URI, for the counter poster — `expo-print`'s WebView sends no token, so
 * the picture is fetched here with hers (Storage's private door, `photoRequest`) and written into the
 * HTML. `null` when she has none, or it could not be read: the poster then wears her initials. Not kept.
 */
export function useLogoDelCartel(kitchenId: string | null, logo: string | null) {
  const { session, ready } = useAuth();
  const token = session?.access_token ?? null;
  return useQuery({
    queryKey: ['cocina', 'logo-del-cartel', kitchenId ?? '', logo ?? ''],
    enabled: ready && token !== null && kitchenId !== null,
    staleTime: Infinity,
    queryFn: async (): Promise<string | null> => {
      if (logo === null || token === null || kitchenId === null || !isPicturePath(logo, kitchenId)) return null;
      try {
        const request = photoRequest(logo, 'grande', token);
        const answer = await fetch(request.uri, { headers: request.headers });
        if (!answer.ok) return null;
        const blob = await answer.blob();
        return await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          // Her pictures are JPEGs (`@/api/fotos`); a blob with no type reads as octet-stream, which a WebView will not draw.
          reader.onloadend = () =>
            resolve(typeof reader.result === 'string' ? reader.result.replace(/^data:application\/octet-stream;/, 'data:image/jpeg;') : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    },
  });
}

// ----------------------------------------------------------------------------
// `10.5b-v-ii` — her phone's messages from the server (`0092`)
// ----------------------------------------------------------------------------

/**
 * ⚠️ THE KINDS OF MESSAGE AND HER SWITCH FOR EACH (`my_notification_kinds`, `0092`): what the phone makes its
 * channels from (`@/lib/useAvisosDelTelefono`) and *Mi cocina* draws its switches from. Keyed on the login — her
 * switch is hers on every phone. ⚠️ NOT on the phone's disk: with no signal nothing is drawn and no channel made.
 */
export function useAvisos() {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: avisosKey(userId),
    queryFn: () => myNotificationKinds(),
    enabled: ready && userId !== null,
    staleTime: 60 * 60_000,
  });
}

/** Her switch for one kind (`set_notification_switch`): the answer is her kinds as now held. */
export function useCambiarAviso() {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: ({ kind, on }: { readonly kind: string; readonly on: boolean }) => setNotificationSwitch(kind, on),
    onSuccess: (avisos: readonly Aviso[]) => {
      queries.setQueryData<readonly Aviso[]>(avisosKey(userId), avisos);
    },
    onError: () => {
      void queries.invalidateQueries({ queryKey: AVISOS_KEY });
    },
  });

  /** `true` once saved; `false` when it could not be — her switch is drawn as the database holds it. */
  async function cambiar(kind: string, on: boolean): Promise<boolean> {
    if (mutation.isPending) return false;
    try {
      await mutation.mutateAsync({ kind, on });
      return true;
    } catch {
      return false;
    }
  }

  return { cambiar, busy: mutation.isPending };
}

// ----------------------------------------------------------------------------
// `10.5c-iii` — her answer to *Novedades de Wera Cocina* (`0093`)
// ----------------------------------------------------------------------------

/**
 * ⚠️ HER ANSWERS TO *NOVEDADES* (`my_consent`, `0093`): whether the sheet is still to ask after a handover, and
 * *Dijiste que sí el …* in *Mi cocina*. Keyed on the login. ⚠️ NOT on the phone's disk (`@/api/persist` keeps her
 * kitchen's counter, not her answers).
 */
export function useConsentimiento() {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: consentimientoKey(userId),
    queryFn: () => myConsent(),
    enabled: ready && userId !== null,
    staleTime: 60 * 60_000,
  });
}

/**
 * ⚠️ HER YES OR NO TO *NOVEDADES* ON THE SHEET'S WORDS (`set_my_consent`, `0093`). The answer is written into her
 * answers at once, and her kinds are read again — a promotion kind's switch is her answer. `false` when it was not
 * kept: no signal, or words the analyst has not approved (22023 — only his test accounts are shown the sheet before then).
 */
export function useResponderOfertas() {
  const queries = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const mutation = useMutation({
    mutationFn: (si: boolean) => setMyConsent(si),
    onSuccess: (respuesta: Consentimiento) => {
      queries.setQueryData<Consentimiento>(consentimientoKey(userId), respuesta);
    },
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: AVISOS_KEY });
      void queries.invalidateQueries({ queryKey: CONSENTIMIENTO_KEY });
    },
  });

  async function responder(si: boolean): Promise<boolean> {
    if (mutation.isPending) return false;
    try {
      await mutation.mutateAsync(si);
      return true;
    } catch {
      return false;
    }
  }

  return { responder, busy: mutation.isPending };
}

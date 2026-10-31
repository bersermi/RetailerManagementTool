// ============================================================================
// HOW A SCREEN REACHES THE DATABASE. Plan tasks `10.4b-iii-a` (her kitchens),
// `10.4b-iii-b` (making one; her trade, her address and her pin) and
// `10.4b-iii-c` (her way out).
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
  ownersKey,
  type Business,
  type DeleteArgs,
} from '@/api/account';
import {
  accountOwners,
  deleteMyAccount,
  firstPlace,
  kitchenGiros,
  kitchenCalls,
  myKitchens,
  revokeApple,
  setKitchenGiro,
  setPlaceAddress,
  setPlacePin,
} from '@/api/calls';
import { apiErrorMessage } from '@/api/errors';
import {
  GIROS_KEY,
  KITCHENS_KEY,
  kitchensKey,
  membershipFrom,
  openKitchen,
  type Kitchen,
  type Membership,
} from '@/api/kitchen';
import { PLACES_KEY, placeKey, setStoreAddressArgs, type AddressForm, type SetStorePinArgs } from '@/api/place';
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

/** Her pin and its line, moved or given from her kitchen's screen. */
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
 * Her trade and her address, changed or completed from her kitchen's screen.
 * `null` for either leaves it as it is. ⚠️ THE TRADE FIRST: when the address
 * then fails, the trade is saved and the re-read shows it.
 */
export function useSaveDatos() {
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: {
      kitchenId: string;
      placeId: string | null;
      giro: string | null;
      address: AddressForm | null;
    }) => {
      if (input.giro !== null) await setKitchenGiro(input.kitchenId, input.giro);
      if (input.address !== null && input.placeId !== null) {
        await setPlaceAddress(setStoreAddressArgs(input.placeId, input.address));
      }
    },
    onSettled: () => {
      void queries.invalidateQueries({ queryKey: KITCHENS_KEY });
      void queries.invalidateQueries({ queryKey: PLACES_KEY });
    },
  });

  async function save(input: {
    kitchenId: string;
    placeId: string | null;
    giro: string | null;
    address: AddressForm | null;
  }): Promise<string | null> {
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

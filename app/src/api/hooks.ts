// ============================================================================
// THE TWO THINGS A SCREEN IS ALLOWED TO ASK ABOUT A SHOP. Plan task 5b-i.
//
// One read and one write, both over `@/api/calls`, both through TanStack Query.
// A screen calls these; nothing anywhere calls `calls.ts` directly, and nothing
// at all calls `supabase` (ADR-035 §2.11).
//
// ⚠️ THE READ IS ALSO A NAVIGATION INPUT, WHICH IS WHY `useMembership` EXISTS
// SEPARATELY. `guard.ts` decides where a signed-in person with no shop belongs;
// it takes `Membership` as a value and knows nothing about queries. This hook is
// the adapter between the two, and the decision it makes — "not back yet" is
// `unknown` and never `none` — is `membershipFrom`'s, in a file the suite reads.
//
// ⚠️ THE QUERY IS DISABLED WHEN THERE IS NO SESSION, and that is not an
// optimisation. `workspace_select` is `id in (select public.my_workspaces())`
// and `my_workspaces()` reads `auth.uid()`, so an anonymous read does not fail
// — IT SUCCEEDS AND RETURNS ZERO ROWS. Running it signed out would therefore
// cache a truthful-looking "belongs to no shop" against the next person to sign
// in on this phone.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/AuthProvider';
import { apiErrorMessage } from '@/api/errors';
import { myWorkspaces, onboardWorkspace } from '@/api/calls';
import {
  MY_WORKSPACES_KEY,
  membershipFrom,
  type Membership,
  type OnboardInput,
  type Workspace,
} from '@/api/workspace';

/** The shops this person belongs to, or nothing while there is no session. */
export function useMyWorkspaces() {
  const { session, ready } = useAuth();
  return useQuery({
    queryKey: MY_WORKSPACES_KEY,
    queryFn: myWorkspaces,
    enabled: ready && session !== null,
  });
}

/** Where a signed-in person stands. See `membershipFrom` for why `unknown` is. */
export function useMembership(): Membership {
  const { data } = useMyWorkspaces();
  return membershipFrom(data);
}

/** The shop itself, once there is one. `5b-ii` reads `code` off this. */
export function useWorkspace(): Workspace | null {
  const { data } = useMyWorkspaces();
  return data === undefined || data.length === 0 ? null : data[0];
}

/**
 * Creating the shop.
 *
 * ⚠️ IT INVALIDATES THE READ AND NAVIGATES NOWHERE. The screen does not know
 * where a person with a shop belongs — `guard.ts` does, and it will send them to
 * Inicio the moment the membership read comes back `member`. A `router.replace`
 * here would be a second opinion about navigation, competing with the first one
 * in the same frame.
 *
 * ⚠️ AND IT RETURNS A SPANISH SENTENCE OR `null`, the shape `AuthProvider`
 * established: the screen is never handed a PostgREST error to have an opinion
 * about, because there would then be as many opinions as there are screens.
 */
export function useOnboardWorkspace() {
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: onboardWorkspace,
    onSuccess: async () => {
      await queries.invalidateQueries({ queryKey: MY_WORKSPACES_KEY });
    },
  });

  async function create(input: OnboardInput): Promise<string | null> {
    try {
      await mutation.mutateAsync(input);
      return null;
    } catch (thrown) {
      return apiErrorMessage(thrown);
    }
  }

  return { create, busy: mutation.isPending };
}

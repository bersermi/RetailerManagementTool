// ============================================================================
// HOW A SCREEN REACHES THE DATABASE. Plan task `10.4b-iii-a`.
//
// ⚠️ A SCREEN NEVER CALLS `@/api/calls` ITSELF — Wera's R12: a hook here owns
// the query key, when the read may run, and what it means. Every read waits for
// the stored session to be looked for and needs a login: a read sent with no
// session asks the database as nobody, and nothing is readable without an
// account (ADR-035 §2.7).
// ============================================================================

import { useQuery } from '@tanstack/react-query';

import { myKitchens } from '@/api/calls';
import { kitchensKey, membershipFrom, openKitchen, type Kitchen, type Membership } from '@/api/kitchen';
import { useAuth } from '@/auth/AuthProvider';

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

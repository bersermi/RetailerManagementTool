import { Stack } from 'expo-router';

import { BorradorProvider } from '@/lib/borrador';

// ============================================================================
// THE SIGN-UP'S TWO SCREENS, AS ONE STACK. Plan task `10.4b-iii-b`.
//
// ⚠️ ITS OWN STACK, SO IT LEAVES AS ONE: when her kitchen is made the guard
// replaces the whole group with her kitchen (`@/auth/guard`), and the phone's
// back from her kitchen then leaves the app — never a step back into a sign-up
// that is finished. Inside it, back steps from the map to the form. ⚠️ THE DRAFT
// LIVES HERE (`@/lib/borrador`), for as long as the group does.
// ============================================================================
export default function OnboardingLayout() {
  return (
    <BorradorProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </BorradorProvider>
  );
}

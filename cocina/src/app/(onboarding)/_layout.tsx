import { Stack } from 'expo-router';

import { BorradorProvider } from '@/lib/borrador';

// ============================================================================
// THE SIGN-UP'S SCREENS, AS ONE STACK. Plan tasks `10.4b-iii-b` and `10.4h`
// (her kitchen, `/registro`; her address, `/donde`; her own point, `/punto`).
//
// ⚠️ ITS OWN STACK, SO IT LEAVES AS ONE: when her kitchen is made the guard
// replaces the whole group with her kitchen (`@/auth/guard`), and the phone's
// back from her kitchen then leaves the app — never a step back into a sign-up
// that is finished. Inside it, back steps one screen at a time. ⚠️ THE DRAFT
// LIVES HERE (`@/lib/borrador`), for as long as the group does.
// ============================================================================
export default function OnboardingLayout() {
  return (
    <BorradorProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </BorradorProvider>
  );
}

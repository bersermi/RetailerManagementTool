import { Stack } from 'expo-router';

import { DensityProvider } from '@/theme/DensityProvider';

// The root, and it does two things: it puts C3.18's density scale in reach of
// every screen, and it hands navigation to the tab shell.
//
// ⚠️ THE STACK'S HEADER IS OFF BECAUSE THE TABS CARRY THEIR OWN. A group like
// `(tabs)` is a screen as far as the Stack is concerned, so leaving both on
// stacks two headers — the outer one showing the group's name, which is not a
// word in this app's vocabulary.
export default function RootLayout() {
  return (
    <DensityProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </DensityProvider>
  );
}

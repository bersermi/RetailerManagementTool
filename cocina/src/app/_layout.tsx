import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// The root of Wera Cocina. Plan task `10.2a`: one screen, no session yet.
export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

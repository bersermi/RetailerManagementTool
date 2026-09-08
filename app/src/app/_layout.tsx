import { Stack } from 'expo-router';

// The shell, and deliberately nothing else. 5a-i ships the workspace and the
// workflow that watches it; the tab navigation this becomes — icons plus the
// Spanish word, always (C12.1) — is 5a-ii's, and the density scale it has to
// respect (C3.18) does not exist yet.
export default function RootLayout() {
  return <Stack />;
}

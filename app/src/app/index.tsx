import { Text, View } from 'react-native';

import { placeholderTotal } from '@/wiring';

// ⚠️ NOT A SCREEN, AND NOT THE START OF ONE. This renders one number so that the
// app has a route at all. Every screen in this project is specified in
// docs/PLAN.md under step 5 and none of them is this; 5a-ii replaces it.
//
// The number is computed by @tienda/money rather than typed in, because the
// thing 5a-i actually delivers is the wiring — a fourth workspace that resolves
// the money package the same way the Vitest suite does. See src/wiring.ts.
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{placeholderTotal()}</Text>
    </View>
  );
}

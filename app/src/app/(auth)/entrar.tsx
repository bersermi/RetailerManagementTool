import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';

// ============================================================================
// THE WAY IN THAT NEEDS NO DEEP LINK (C1.4). Plan task 5a-iii-a.
//
// Email and password, and the same two fields do both jobs — an `Entrar` button
// and a `Crear cuenta` one, rather than two screens with a link between them.
//
// ⚠️ EVERY SIZE COMES FROM THE SCALE AND EVERY WORD FROM `ES`. C3.18 and
// §2.11's one-strings-file row. A literal `fontSize: 16` here is a screen with
// one density that does not say so — and this is the first screen an elder
// shopkeeper ever sees.
//
// ⚠️ GOOGLE IS NOT HERE YET, AND ITS BUTTON IS 5a-iii-b's. The seam is
// deliberate: everything on this screen works with the browser closed, and the
// network's only job is the final request.
// ============================================================================
export default function Entrar() {
  const { scale } = useDensity();
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // ⚠️ THE MESSAGE IS CLEARED WHEN THE NEXT ATTEMPT STARTS, NOT WHEN A FIELD
  // CHANGES. A message that disappears on the first keystroke is a message a
  // slow reader never finishes, and the people this is built for read slowly.
  async function attempt(action: (email: string, password: string) => Promise<string | null>) {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      setProblem(await action(email, password));
    } finally {
      setBusy(false);
    }
  }

  const field = {
    fontSize: scale.bodySize,
    minHeight: scale.tapTarget,
    borderWidth: 1,
    borderRadius: scale.space / 2,
    paddingHorizontal: scale.space,
  } as const;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scale.space * 2,
        gap: scale.rowGap,
      }}
    >
      <Text style={{ fontSize: scale.moneySize, fontWeight: '700', marginBottom: scale.space }}>
        {ES.auth.title}
      </Text>

      <Text style={{ fontSize: scale.bodySize }}>{ES.auth.emailLabel}</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        editable={!busy}
        style={field}
      />

      <Text style={{ fontSize: scale.bodySize }}>{ES.auth.passwordLabel}</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        secureTextEntry
        editable={!busy}
        style={field}
      />

      {problem !== null && (
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600' }}>{problem}</Text>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void attempt(signIn)}
        style={{
          minHeight: scale.tapTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: scale.space / 2,
          borderWidth: 2,
          marginTop: scale.space,
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700' }}>{ES.auth.signIn}</Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void attempt(signUp)}
        style={{
          minHeight: scale.tapTarget,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: scale.bodySize }}>{ES.auth.signUp}</Text>
      </Pressable>
    </View>
  );
}

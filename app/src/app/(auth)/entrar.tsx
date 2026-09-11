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
// ⚠️ GOOGLE ARRIVED IN 5a-iii-b, AND IT IS THE ONE CONTROL ON THIS SCREEN THAT
// LEAVES THE APP. Its whole failure mode — the browser opens and never comes
// back — is handled in `@/auth/oauth`; what this screen owes it is the same
// `busy` discipline as the other two buttons, so a second tap cannot start a
// second round trip while the first is still out.
//
// ⚠️ AND A CANCELLED ROUND TRIP SHOWS NOTHING. `signInWithGoogle` returns
// `null` when the person closed the browser, which this screen already treats
// as "no message" — the same code path as success, deliberately, because from
// the screen's point of view nothing went wrong.
//
// ⚠️ FACEBOOK IS NOT HERE AND IS NOT AN OVERSIGHT — deferred to `5i` by the
// owner on 2026-09-11. It is one more button on this screen and a `linkIdentity`
// path that is not.
// ============================================================================
export default function Entrar() {
  const { scale } = useDensity();
  const { signIn, signUp, signInWithGoogle } = useAuth();

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

  // The same discipline, for the button that takes the fields with it.
  async function attemptGoogle() {
    await attempt(() => signInWithGoogle());
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

      {/* C1.4's second provider. Below the email path because the email path is
          the one that works with no signal worth the name, and the pilot store
          loses its connection routinely. */}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void attemptGoogle()}
        style={{
          minHeight: scale.tapTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: scale.space / 2,
          borderWidth: 1,
          marginTop: scale.space,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600' }}>{ES.auth.google}</Text>
      </Pressable>
    </View>
  );
}

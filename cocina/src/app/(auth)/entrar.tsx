import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AVISO_URL } from '@/auth/aviso';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { Casilla } from '@/ui/Casilla';
import { Formulario } from '@/ui/Formulario';

// ============================================================================
// THE WAY IN. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S *ENTRAR*, ITS TWO HALVES AND ITS RULINGS (`app/src/app/(auth)/
// entrar.tsx`, plans `5a-iii-a`, `5b.7`, `5R-d-iii`, `5R-k`, `8g`): Google and
// Apple first — one tap, no typing — with the aviso's line under them, because a
// provider makes an account without passing the box below (the owner,
// 2026-10-12); then the email: *Crear cuenta* asks the name in two boxes and the
// aviso's tick (2026-09-18 and 2026-10-10), *Entrar* asks the address and the
// password and nothing else. Every word is Wera's.
//
// ⚠️⚠️ ONE DIFFERENCE, DECIDED HERE: IT OPENS ON *CREAR CUENTA*. Wera's opens on
// *Entrar* unless a door sent her (`8g`): Wera asks first whether she opens a
// shop or was invited, and those doors are somebody new. Cocina has no doors —
// its first screen is this one, and almost everyone who reaches it is a new
// fonda. Typing an address and a password into *Entrar* with no account answers
// *"El correo o la contraseña no son correctos"*, which tells her nothing true;
// into *Crear cuenta* with an account, *"Ese correo ya tiene una cuenta. Entra
// con tu contraseña"*, which tells her what to do. A link swaps the halves.
//
// ⚠️ APPLE'S BUTTON IS APPLE'S: its words in the phone's language, its colours,
// and on an iPhone only. It has no `disabled`, so `busy` stops touches around it.
// ⚠️ NO *¿Olvidaste tu contraseña?* YET: Wera's opens WhatsApp to the owner, and
// this project's environment has no number (plan `10.4b-iv-b`).
// ⚠️ NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): what it calls is pinned
// behind it (`@/auth/credentials`, `@/auth/oauth`, `@/auth/apple`), and that it
// looks right is the owner's phone.
// ============================================================================
export default function Entrar() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle, appleAvailable, signInWithApple } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // The name's two boxes keep what was typed across a switch of halves.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [creating, setCreating] = useState(true);
  // Unticked until she ticks it.
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const surnameBox = useRef<TextInput>(null);
  const emailBox = useRef<TextInput>(null);
  const passwordBox = useRef<TextInput>(null);

  // The message is cleared when the next attempt starts, not on a keystroke: a
  // slow reader must be able to finish it.
  async function attempt(action: () => Promise<string | null>) {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      setProblem(await action());
    } finally {
      setBusy(false);
    }
  }

  function switchHalf() {
    if (busy) return;
    setProblem(null);
    setCreating(!creating);
  }

  // A failure to open says nothing: the likely one is a second tap on an open page.
  function openAviso() {
    if (busy) return;
    WebBrowser.openBrowserAsync(AVISO_URL).catch(() => {});
  }

  // The password's own key: on *Entrar* it is the button; on *Crear cuenta* the
  // aviso's box still waits under it.
  function passwordDone() {
    if (creating) Keyboard.dismiss();
    else void attempt(() => signIn(email, password));
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={creating ? ES.auth.titleSignUp : ES.auth.titleSignIn} antetitulo={ES.nombre} />
      <Formulario
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 2,
          paddingTop: SIZE.space * 2,
          paddingBottom: SIZE.space * 2 + insets.bottom,
          gap: SIZE.space,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.auth.google}
          disabled={busy}
          onPress={() => void attempt(() => signInWithGoogle())}
          style={{
            minHeight: SIZE.tapTarget,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SIZE.rowGap,
            borderRadius: SIZE.space * 0.75,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            backgroundColor: PALETTE.superficie,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <MaterialCommunityIcons name="google" size={SIZE.iconSize} color={PALETTE.tinta} />
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{ES.auth.google}</Text>
        </Pressable>

        {appleAvailable && (
          <View pointerEvents={busy ? 'none' : 'auto'} style={{ opacity: busy ? 0.6 : 1 }}>
            <AppleAuthenticationButton
              buttonType={AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={SIZE.space * 0.75}
              onPress={() => void attempt(() => signInWithApple())}
              style={{ width: '100%', height: SIZE.tapTarget }}
            />
          </View>
        )}

        <Pressable accessibilityRole="link" disabled={busy} onPress={openAviso} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
            {ES.auth.avisoGoogleLead}
            <Text style={{ textDecorationLine: 'underline', fontWeight: '600', color: PALETTE.tinta }}>
              {ES.auth.aviso}
            </Text>
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space, marginTop: SIZE.rowGap }}>
          <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: PALETTE.linea }} />
          <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.auth.orEmail}</Text>
          <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: PALETTE.linea }} />
        </View>

        {creating && (
          <View style={{ flexDirection: 'row', gap: SIZE.space }}>
            <Campo
              grows
              label={ES.auth.nameLabel}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="given-name"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => surnameBox.current?.focus()}
              editable={!busy}
            />
            <Campo
              grows
              ref={surnameBox}
              label={ES.auth.surnameLabel}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="family-name"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => emailBox.current?.focus()}
              editable={!busy}
            />
          </View>
        )}

        <Campo
          ref={emailBox}
          label={ES.auth.emailLabel}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordBox.current?.focus()}
          editable={!busy}
        />

        <Campo
          ref={passwordBox}
          label={ES.auth.passwordLabel}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={creating ? 'new-password' : 'current-password'}
          secureTextEntry
          mostrable
          returnKeyType={creating ? 'done' : 'go'}
          onSubmitEditing={passwordDone}
          editable={!busy}
        />

        {creating && (
          <Casilla
            ticked={accepted}
            onToggle={() => setAccepted(!accepted)}
            label={`${ES.auth.avisoAcceptLead}${ES.auth.aviso}`}
            disabled={busy}
          >
            <Text style={{ fontSize: SIZE.bodySize, flexShrink: 1, color: PALETTE.tinta }}>
              {ES.auth.avisoAcceptLead}
              <Text accessibilityRole="link" onPress={openAviso} style={{ textDecorationLine: 'underline', fontWeight: '600' }}>
                {ES.auth.aviso}
              </Text>
            </Text>
          </Casilla>
        )}

        {problem !== null && (
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
        )}

        <BotonLleno
          variante="principal"
          label={creating ? ES.auth.signUp : ES.auth.signIn}
          busy={busy}
          onPress={() =>
            void attempt(() =>
              creating ? signUp(email, password, firstName, lastName, accepted) : signIn(email, password),
            )
          }
        />

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={switchHalf}
          style={{ minHeight: SIZE.tapTarget, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}
        >
          <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
            {creating ? ES.auth.yaTengo : ES.auth.toSignUp}
            {creating && <Text style={{ fontWeight: '700', color: PALETTE.accion }}>{ES.auth.entrar}</Text>}
          </Text>
        </Pressable>
      </Formulario>
    </View>
  );
}

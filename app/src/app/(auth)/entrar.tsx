import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from 'expo-apple-authentication';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { Keyboard, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AVISO_URL } from '@/auth/aviso';
import { puertaOf } from '@/auth/puerta';
import { forgotPasswordUrl } from '@/auth/support';
import { SUPPORT_WHATSAPP } from '@/lib/supportWhatsapp';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { Casilla } from '@/ui/Casilla';

// ============================================================================
// THE WAY IN THAT NEEDS NO DEEP LINK (C1.4). Plan task 5a-iii-a, and the screen
// grew a second half at 5b.7.
//
// Email and password, on ONE screen rather than two with a link between them.
//
// ⚠️⚠️ AND AS OF 5b.7 THAT ONE SCREEN HAS TWO HALVES. It used to be two buttons
// over one pair of fields; the owner asked on 2026-09-18 for `Nombre` and
// `Apellido` at sign-up, and the plan row is explicit that they appear THERE
// AND NEVER ON SIGN-IN — *"nobody types their name to come back"*. Two boxes a
// returning shopkeeper has to know to leave empty is exactly the book-keeping
// the owner's own rule refuses to hand her, so `creating` decides which half is
// on screen and the two name fields exist only in one of them.
//
// ⚠️ THE DEFAULT IS `Entrar`, AND IT IS THE FREQUENCY ARGUMENT. A person
// creates an account once and comes back every morning for a year. The switch
// is `ES.auth.toSignUp` / `toSignIn` — copy written at 5a-iii-a for a shape
// that never shipped, and which this task finally gave a reader.
//
// ⚠️ GOOGLE SITS OUTSIDE BOTH HALVES because it IS both: the provider creates
// the account on first use and signs in afterwards, and it never sees these
// fields at all. There is no name form to put a rule on — it hands over one
// string, an account with no surname is legitimate, and the correction is an
// editable own-name field on Ajustes (`5b.8`), never a screen between the
// button and the shop.
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
//
// ⚠️ `5R-h`'S LINK LEAVES THE APP TOO, AND IT IS NOT A RESET. It opens WhatsApp
// to the owner, who sets a new password by hand — his ruling, 2026-10-09. It
// is on the sign-in half only (a person creating an account has nothing to
// forget) and absent on a build without his number.
//
// ⚠️ `5R-d-iii`: THE AVISO DE PRIVACIDAD, IN THE TWO PLACES AN ACCOUNT IS MADE.
// The sign-up half ends in a box, *"Acepto el Aviso de privacidad"*, that must
// be ticked before `Crear cuenta` makes anything (the owner, 2026-10-10). Google
// makes an account without passing that half, so a line under its button says
// *"Al continuar, aceptas el Aviso de privacidad"* (the owner, 2026-10-12: no
// second box). Both open the page in `@/auth/aviso`.
//
// ⚠️ AND SO THE SCREEN SCROLLS. The sign-up half grew two rows, and at the large
// density on a small phone the column is taller than the screen; a centred
// `View` would cut the title and the Google line off with no way to reach them.
// The `ScrollView` centres exactly as before whenever everything fits, and its
// padding is the device's own insets, so a column that does scroll starts below
// the status bar and ends above the home indicator (measured on an Android at a
// crowded display size: without them the title sat under the clock).
// ⚠️ `keyboardShouldPersistTaps="handled"` is what keeps one tap on the button
// one tap: without it, a tap with the keyboard up only closes the keyboard.
//
// ⚠️⚠️ `8g`, THE OWNER'S RULINGS OF 2026-10-21: THE SCREEN AFTER A DOOR. The
// welcome (`(auth)/hola`) asks first whether she opens a shop or was invited,
// and sends her here with that door (`?puerta=`): the band says which, and the
// screen opens on the sign-up half, because a door is somebody new. Without a
// door — *¿Ya tienes cuenta? Entrar* — it opens on the sign-in half. Google and
// Apple come FIRST now, over the 5a-iii-b order (email first, as the path that
// works on the weakest signal): they are one tap and no typing, which is the
// drawing he approved. Regular sizes and Wera's styling (his note): the band,
// soft boxes, the filled button, and each box's own key leads to the next —
// the walk counted seven keyboard closes on the way to a first sale.
//
// ⚠️⚠️ `5R-k`: APPLE'S BUTTON, ON AN iPHONE ONLY, AND IT IS THE ONE CONTROL ON
// THIS SCREEN THIS APP DOES NOT DRAW. Apple's guideline 4.8 asks for it beside
// Google (the owner, 2026-10-10). It is the system's own button, so its words
// are Apple's, in the PHONE's language and not from `ES`: Apple approves three
// titles and *Entrar con Apple* is not one of them. `CONTINUE` because, like
// Google, it both makes the account and comes back to it — and the aviso's
// line under the two buttons already begins *Al continuar*. Its colours are
// Apple's too (`R11` has nothing to say about a control it cannot style): the
// outlined one, so it sits as Google's peer rather than above *Entrar*.
// ⚠️ IT HAS NO `disabled`, so `busy` is a wrapper that stops touches.
// ⚠️ WHETHER IT LOOKS RIGHT IS NOT CHECKED BY ANYTHING (`R9`): no workflow
// compiles the native app. The owner's iPhone is the instrument.
// ============================================================================
export default function Entrar() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle, appleAvailable, signInWithApple } = useAuth();
  const puerta = puertaOf(useLocalSearchParams<{ puerta?: string }>().puerta);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // 5b.7's two fields. ⚠️ THEY KEEP THEIR CONTENTS ACROSS A SWITCH BACK AND
  // FORTH — a person who taps the wrong link and returns has not lost typing.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // ⚠️ `8g`: A DOOR IS SOMEBODY NEW, so it opens on the sign-up half; with no
  // door it is *Entrar*, the frequency argument above.
  const [creating, setCreating] = useState(puerta !== null);
  // `5R-d-iii`. ⚠️ IT STARTS UNTICKED AND ONLY THE PERSON TICKS IT — a box that
  // arrived ticked would be the app agreeing on their behalf. It survives a
  // switch to the other half and back, like the names, because they ticked it.
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const surnameBox = useRef<TextInput>(null);
  const emailBox = useRef<TextInput>(null);
  const passwordBox = useRef<TextInput>(null);

  // ⚠️ THE MESSAGE IS CLEARED WHEN THE NEXT ATTEMPT STARTS, NOT WHEN A FIELD
  // CHANGES. A message that disappears on the first keystroke is a message a
  // slow reader never finishes, and the people this is built for read slowly.
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

  // ⚠️ THE TWO HALVES SEND DIFFERENT THINGS, AND THAT IS THE WHOLE POINT OF THE
  // SPLIT: `signIn` never receives a name, so nothing on that path can refuse
  // one. 5b.7.
  async function attemptSignIn() {
    await attempt(() => signIn(email, password));
  }

  async function attemptSignUp() {
    await attempt(() => signUp(email, password, firstName, lastName, accepted));
  }

  // The same discipline, for the buttons that belong to neither half.
  async function attemptGoogle() {
    await attempt(() => signInWithGoogle());
  }

  async function attemptApple() {
    await attempt(() => signInWithApple());
  }

  // ⚠️ SWITCHING HALVES CLEARS THE MESSAGE. A refusal that named a field the
  // other half does not have — `Escribe tu apellido` above an `Entrar` button —
  // is this app telling a shopkeeper about its own internal state.
  function switchHalf() {
    if (busy) return;
    setProblem(null);
    setCreating(!creating);
  }

  // ⚠️ A FAILURE TO OPEN SAYS NOTHING. The likely one is a second tap while the
  // page is already up, and the person can see the page; there is nothing a
  // sentence on this screen could add.
  function openAviso() {
    if (busy) return;
    WebBrowser.openBrowserAsync(AVISO_URL).catch(() => {});
  }

  // Back to the doors — the welcome, or the screen that sent her here.
  function back() {
    if (busy) return;
    if (router.canGoBack()) router.back();
    else router.replace('/hola');
  }

  // ⚠️ THE PASSWORD'S OWN KEY: on *Entrar* it is the button; on the sign-up half
  // it closes the keyboard, because the aviso's box still waits under it.
  function passwordDone() {
    if (creating) Keyboard.dismiss();
    else void attemptSignIn();
  }

  const supportNumber = SUPPORT_WHATSAPP;

  const link = (label: string, onPress: () => void, strong: string | null = null) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={{ minHeight: scale.tapTarget, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}
    >
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
        {label}
        {strong !== null && <Text style={{ fontWeight: '700', color: PALETTE.accion }}>{strong}</Text>}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda
        titulo={creating ? ES.cuenta.title : ES.cuenta.signInTitle}
        antetitulo={puerta === null ? null : ES.cuenta.door[puerta]}
        volver={{ label: ES.cuenta.back, onPress: back }}
      />
      {/* ⚠️ `keyboardShouldPersistTaps="handled"` is what keeps one tap on the
          button one tap: without it, a tap with the keyboard up only closes the
          keyboard. The padding is the device's own inset at the bottom, so the
          last line ends above the home indicator. */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: scale.space * 2,
          paddingTop: scale.space * 2,
          paddingBottom: scale.space * 2 + insets.bottom,
          gap: scale.space,
        }}
      >
        {/* C1.4's second provider, and Apple's beside it: the account without
            typing. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.auth.google}
          disabled={busy}
          onPress={() => void attemptGoogle()}
          style={{
            minHeight: scale.tapTarget,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scale.rowGap,
            borderRadius: scale.space * 0.75,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            backgroundColor: PALETTE.superficie,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <MaterialCommunityIcons name="google" size={scale.iconSize} color={PALETTE.tinta} />
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{ES.auth.google}</Text>
        </Pressable>

        {/* 5R-k. Under the other provider and as tall as it, on a phone that
            has the sheet. The header says why its words and colours are not ours. */}
        {appleAvailable && (
          <View pointerEvents={busy ? 'none' : 'auto'} style={{ opacity: busy ? 0.6 : 1 }}>
            <AppleAuthenticationButton
              buttonType={AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={scale.space * 0.75}
              onPress={() => void attemptApple()}
              style={{ width: '100%', height: scale.tapTarget }}
            />
          </View>
        )}

        {/* 5R-d-iii, the owner's ruling of 2026-10-12. Directly under the buttons
            it speaks for: a provider makes an account without the box below. */}
        <Pressable accessibilityRole="link" disabled={busy} onPress={openAviso} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
            {ES.auth.avisoGoogleLead}
            <Text style={{ textDecorationLine: 'underline', fontWeight: '600', color: PALETTE.tinta }}>
              {ES.auth.aviso}
            </Text>
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.space, marginTop: scale.rowGap }}>
          <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: PALETTE.linea }} />
          <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.cuenta.orEmail}</Text>
          <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: PALETTE.linea }} />
        </View>

        {/* ⚠️ 5b.7's TWO BOXES, ONLY ON THE SIGN-UP HALF, side by side. Both are
            required (the owner, the day he asked for them); the reason it is
            two boxes and not one is in `@/auth/credentials`. */}
        {creating && (
          <View style={{ flexDirection: 'row', gap: scale.space }}>
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
          returnKeyType={creating ? 'done' : 'go'}
          onSubmitEditing={passwordDone}
          editable={!busy}
        />

        {/* 5R-d-iii. The last thing before the button, so a refusal for it is
            the last one `checkSignUp` gives. The words inside open the page; a
            tap anywhere else on the row ticks the box. */}
        {creating && (
          <Casilla
            ticked={accepted}
            onToggle={() => setAccepted(!accepted)}
            label={`${ES.auth.avisoAcceptLead}${ES.auth.aviso}`}
            disabled={busy}
          >
            <Text style={{ fontSize: scale.bodySize, flexShrink: 1, color: PALETTE.tinta }}>
              {ES.auth.avisoAcceptLead}
              <Text
                accessibilityRole="link"
                onPress={openAviso}
                style={{ textDecorationLine: 'underline', fontWeight: '600' }}
              >
                {ES.auth.aviso}
              </Text>
            </Text>
          </Casilla>
        )}

        {problem !== null && (
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
        )}

        <BotonLleno
          variante="principal"
          label={creating ? ES.auth.signUp : ES.auth.signIn}
          busy={busy}
          onPress={() => void (creating ? attemptSignUp() : attemptSignIn())}
        />

        {/* 5R-h. Under the button it rescues, and only where there is a
            password to have forgotten. */}
        {!creating &&
          supportNumber !== null &&
          link(ES.auth.forgotPassword, () => void Linking.openURL(forgotPasswordUrl(supportNumber, email)))}

        {/* And the way to the other half. */}
        {creating
          ? link(`${ES.hola.yaTengo} `, switchHalf, ES.hola.entrar)
          : link(ES.auth.toSignUp, switchHalf)}
      </ScrollView>
    </View>
  );
}

import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';

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
// ============================================================================
export default function Entrar() {
  const { scale } = useDensity();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // 5b.7's two fields. ⚠️ THEY KEEP THEIR CONTENTS ACROSS A SWITCH BACK AND
  // FORTH — a person who taps the wrong link and returns has not lost typing.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

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
    await attempt(() => signUp(email, password, firstName, lastName));
  }

  // The same discipline, for the button that belongs to neither half.
  async function attemptGoogle() {
    await attempt(() => signInWithGoogle());
  }

  // ⚠️ SWITCHING HALVES CLEARS THE MESSAGE. A refusal that named a field the
  // other half does not have — `Escribe tu apellido` above an `Entrar` button —
  // is this app telling a shopkeeper about its own internal state.
  function switchHalf() {
    if (busy) return;
    setProblem(null);
    setCreating(!creating);
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
        autoComplete={creating ? 'new-password' : 'current-password'}
        secureTextEntry
        editable={!busy}
        style={field}
      />

      {/* ⚠️ 5b.7's TWO BOXES, AND THEY ARE RENDERED ONLY ON THE SIGN-UP HALF.
          Both are required — the owner ruled it the day he asked for them — and
          the requirement is TWO FIELDS rather than a rule about spaces in one.
          The reason, and the name that breaks every split anyone would write,
          is in `@/auth/credentials`. ⚠️ It is NOT restated here, because R4's
          comment-stripper does not read JSX comments and would report this file
          for the sentence explaining what it gets right — see R4's stated
          misses in docs/CONVENTIONS.md.

          ⚠️ THEY SIT BELOW THE SHARED FIELDS ON PURPOSE. The address and the
          password stay exactly where a returning person's eye already expects
          them, and `checkSignUp` refuses in this same top-to-bottom order, so
          the first message a person reads names the topmost empty box. */}
      {creating && (
        <>
          <Text style={{ fontSize: scale.bodySize }}>{ES.auth.nameLabel}</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="given-name"
            editable={!busy}
            style={field}
          />

          <Text style={{ fontSize: scale.bodySize }}>{ES.auth.surnameLabel}</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="family-name"
            editable={!busy}
            style={field}
          />
        </>
      )}

      {problem !== null && (
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600' }}>{problem}</Text>
      )}

      {/* The half in force, as one button. */}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void (creating ? attemptSignUp() : attemptSignIn())}
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
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700' }}>
            {creating ? ES.auth.signUp : ES.auth.signIn}
          </Text>
        )}
      </Pressable>

      {/* And the way to the other half. */}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={switchHalf}
        style={{
          minHeight: scale.tapTarget,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: scale.bodySize }}>
          {creating ? ES.auth.toSignIn : ES.auth.toSignUp}
        </Text>
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

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useOnboardWorkspace, useRedeemInvite } from '@/api/hooks';
import { checkCredential } from '@/api/redeem';
import { checkShopName } from '@/api/workspace';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// THE NO-WORKSPACE LANDING. Plan task 5b-i.
//
// Where a signed-in person who belongs to no shop is sent, by `@/auth/guard`.
// Two questions and a button, and the second question is C1.7.
//
// ⚠️ THE IVA QUESTION IS THE REASON THIS SCREEN IS NOT A TEXT FIELD AND A
// SUBMIT. ADR-035 §2.8: shelf prices in Mexican retail include IVA and supplier
// invoices break it out; capturing both raw overstates margin by up to the tax
// rate, "consistently, plausibly, invisibly". `prices_include_tax` decides how
// every recorder splits net from tax for the life of the shop, and NOTHING
// LATER ASKS AGAIN — so this one tap is the only chance the ledger gets.
//
// ⚠️ IT DEFAULTS TO YES, WHICH IS WHAT THE COLUMN DEFAULTS TO AND WHAT ALMOST
// EVERY SHOP IS. `workspace.prices_include_tax` is `default true` (`0001`), and
// the revenue ruling of 2026-09-14 rests on it. A default that matches the
// common case is also the one a person who does not read the question gets
// right by not answering it.
//
// ⚠️ AND IT ASKS FOR ONE NAME, NOT TWO. `onboard_workspace` names the first
// location after the shop when it is passed no location name — measured against
// the applied schema, not assumed — so a one-store shop is never asked what the
// building is called as well. A second store is `location`'s own flow.
//
// ⚠️⚠️ 5b-ii-b-2 GAVE IT A SECOND HALF, AND THE TWO HALVES ARE FOR DIFFERENT
// PEOPLE. Everything above is for the person who is STARTING a shop. Below the
// rule is the person who was INVITED to one — she has a code in a WhatsApp
// message and no interest whatever in the IVA question. Both land here, because
// `guard.ts` has exactly one answer for "signed in, belongs to no shop", and
// neither of them can be asked which kind of person she is before she has told
// us.
//
// ⚠️ THE ORDER IS CREATE-THEN-JOIN AND IT IS A JUDGEMENT, NOT AN ACCIDENT. The
// first launch of this app in a shop is always the owner creating it; a joiner
// arrives afterwards, knows she was invited, and is looking for somewhere to put
// a code — which a section headed *"¿Te invitaron a una tienda?"* is. Reversing
// it would put a box she cannot fill in front of every founding owner. ⚠️ NO
// CHECK CAN SEE THIS EITHER (`R9`) — it is the owner's phone, and it is one
// `<View>` move if he reads it the other way.
//
// ⚠️ ONE BOX AND NOT TWO, which is the `P2` decision of the `5b-ii-b` sizing and
// is the only thing on this screen that would be expensive to change later: an
// invite token and the shop's join code are the same alphabet and differ only in
// LENGTH, and the person holding one was not told which she has. `@/api/redeem`
// decides, and `5b-iii` adds the second destination without adding a second box.
//
// ⚠️ NO CHECK IN THIS REPOSITORY CAN SEE THIS FILE. §2.11 refuses suites over
// rendering, so what is asserted lives behind it: `checkShopName` and
// `onboardArgs` in `@/api/workspace`, `checkCredential` and `redeemArgs` in
// `@/api/redeem`, the redirect in `@/auth/guard`, and the two round trips
// themselves in `docs/checks/5b-i-api-contract.sh` and
// `docs/checks/5b-ii-b-2-redeem-contract.sh`. That this screen wires them
// together is the owner's own phone.
// ============================================================================
export default function Bienvenida() {
  const { scale } = useDensity();
  const { create, busy } = useOnboardWorkspace();

  const { redeem, busy: joining } = useRedeemInvite();

  const [name, setName] = useState('');
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  const [credential, setCredential] = useState('');
  const [joinProblem, setJoinProblem] = useState<string | null>(null);

  // The same discipline as the way in: the message is cleared when the next
  // attempt starts, not when a field changes. A message that disappears on the
  // first keystroke is one a slow reader never finishes.
  async function submit() {
    if (busy) return;
    setProblem(null);
    const checked = checkShopName(name);
    if (!checked.ok) {
      setProblem(checked.message);
      return;
    }
    // ⚠️ IT NAVIGATES NOWHERE ON SUCCESS. The guard sends them to Inicio the
    // moment the membership read comes back — see `@/api/hooks`.
    setProblem(await create({ displayName: checked.displayName, pricesIncludeTax }));
  }

  // The joining half. ⚠️ IT NAVIGATES NOWHERE EITHER, and here that is the whole
  // mechanism: `useRedeemInvite` invalidates the membership read, it comes back
  // `member`, and `guard.ts` moves her to Inicio. A second opinion on this screen
  // would race the first.
  //
  // ⚠️ AND A SECOND TAP IS NOT GUARDED AGAINST BEYOND `busy`, deliberately:
  // `0028` answers the same caller's second redemption `already_redeemed` rather
  // than an error, which is the ordinary case on a connection the pilot store
  // loses routinely. The success path is identical.
  async function join() {
    if (joining) return;
    setJoinProblem(null);
    const issue = checkCredential(credential);
    if (issue !== null) {
      setJoinProblem(ES.join.issues[issue]);
      return;
    }
    setJoinProblem(await redeem(credential));
  }

  const choice = (selected: boolean) =>
    ({
      minHeight: scale.tapTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scale.space,
      borderRadius: scale.space / 2,
      borderWidth: selected ? 3 : 1,
      opacity: busy ? 0.5 : 1,
      flex: 1,
    }) as const;

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: scale.space * 2,
        paddingVertical: scale.space * 2,
        gap: scale.rowGap,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: scale.titleSize, fontWeight: '700', marginBottom: scale.space }}>
        {ES.onboarding.title}
      </Text>

      <Text style={{ fontSize: scale.bodySize }}>{ES.onboarding.nameLabel}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!busy}
        style={{
          fontSize: scale.bodySize,
          minHeight: scale.tapTarget,
          borderWidth: 1,
          borderRadius: scale.space / 2,
          paddingHorizontal: scale.space,
        }}
      />

      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', marginTop: scale.space }}>
        {ES.onboarding.ivaQuestion}
      </Text>
      <Text style={{ fontSize: scale.bodySize }}>{ES.onboarding.ivaHint}</Text>

      <View style={{ flexDirection: 'row', gap: scale.rowGap }}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: pricesIncludeTax }}
          disabled={busy}
          onPress={() => setPricesIncludeTax(true)}
          style={choice(pricesIncludeTax)}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: pricesIncludeTax ? '700' : '400' }}>
            {ES.onboarding.ivaYes}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: !pricesIncludeTax }}
          disabled={busy}
          onPress={() => setPricesIncludeTax(false)}
          style={choice(!pricesIncludeTax)}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: !pricesIncludeTax ? '700' : '400' }}>
            {ES.onboarding.ivaNo}
          </Text>
        </Pressable>
      </View>

      {problem !== null && (
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600' }}>{problem}</Text>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void submit()}
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
            {ES.onboarding.create}
          </Text>
        )}
      </Pressable>

      {/* ⚠️ THE RULE IS THE ONLY THING SAYING THESE ARE TWO DIFFERENT ERRANDS.
          Without it the code box reads as a third question about the shop being
          created, which is the one reading that would make a joiner fill in the
          name field first. */}
      <View
        style={{
          // ⚠️ A BORDER AND NOT A `height: 1` BOX. `R6` refuses a literal size on
          // anything a person LOOKS at — elder mode has to be able to change it —
          // and a hairline is structure: the same shape the Ajustes header draws
          // its rule with, and the one the gate reads as structure rather than as
          // a size somebody hard-coded.
          borderBottomWidth: 1,
          borderBottomColor: PALETTE.linea,
          marginTop: scale.space * 2,
        }}
      />

      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', marginTop: scale.space }}>
        {ES.join.section}
      </Text>
      <Text style={{ fontSize: scale.bodySize }}>{ES.join.hint}</Text>

      <Text style={{ fontSize: scale.bodySize }}>{ES.join.label}</Text>
      <TextInput
        value={credential}
        onChangeText={setCredential}
        // ⚠️ `characters` AND `autoCorrect` OFF, because the alphabet is
        // Crockford base32 and a keyboard that helpfully capitalises the first
        // letter and lower-cases the rest is a keyboard fighting the normaliser.
        // The normaliser would win — `normalizeCredential` upper-cases anyway —
        // but she would be watching her own code change as she typed it.
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        editable={!joining}
        style={{
          fontSize: scale.bodySize,
          minHeight: scale.tapTarget,
          borderWidth: 1,
          borderRadius: scale.space / 2,
          paddingHorizontal: scale.space,
        }}
      />

      {joinProblem !== null && (
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600' }}>{joinProblem}</Text>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={joining}
        onPress={() => void join()}
        style={{
          minHeight: scale.tapTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: scale.space / 2,
          borderWidth: 2,
          opacity: joining ? 0.5 : 1,
        }}
      >
        {joining ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700' }}>{ES.join.submit}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

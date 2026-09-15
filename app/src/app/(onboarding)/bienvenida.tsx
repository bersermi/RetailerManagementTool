import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useOnboardWorkspace } from '@/api/hooks';
import { checkShopName } from '@/api/workspace';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';

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
// ⚠️ NO CHECK IN THIS REPOSITORY CAN SEE THIS FILE. §2.11 refuses suites over
// rendering, so what is asserted lives behind it: `checkShopName` and
// `onboardArgs` in `@/api/workspace`, the redirect in `@/auth/guard`, and the
// round trip itself in `docs/checks/5b-i-api-contract.sh`. That this screen
// wires the three together is the owner's own phone.
// ============================================================================
export default function Bienvenida() {
  const { scale } = useDensity();
  const { create, busy } = useOnboardWorkspace();

  const [name, setName] = useState('');
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

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
    </ScrollView>
  );
}

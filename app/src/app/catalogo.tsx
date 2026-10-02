import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useImportCatalog, useStarterCatalog } from '@/api/hooks';
import { choiceFrom, importCount, offeredGroups, toggled } from '@/api/starterCatalog';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { SelectorCatalogo } from '@/ui/SelectorCatalogo';

// ============================================================================
// AGREGAR DEL CATÁLOGO. Plan task `9d`: the same import the onboarding screen
// offers, for a shop that already exists — opened from Productos by a manager
// or the owner (`import_catalog` refuses a cashier, and Productos draws the
// entry for those two only).
//
// ⚠️ IT OFFERS ONLY WHAT THE SHOP DOES NOT HOLD. `@/api/starterCatalog` drops
// every product already imported or already named in the shop, so a second
// visit after importing Pollería shows the other giros and nothing twice.
//
// ⚠️ ON SUCCESS IT GOES BACK, AND PRODUCTOS IS THE CONFIRMATION: the import
// invalidates `CATALOG_KEY`, so the list she returns to already holds the new
// rows. A sentence here saying so would be a second copy of what the list shows.
//
// ⚠️ R9: the look of the list — and whether *Volver* after a long untick
// session should ask before throwing the choice away — is the owner's phone.
// ============================================================================
export default function Catalogo() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const starter = useStarterCatalog();
  const { add, busy } = useImportCatalog();

  const [giros, setGiros] = useState<ReadonlySet<string>>(new Set());
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [problem, setProblem] = useState<string | null>(null);

  const groups =
    starter.template === null ? [] : offeredGroups(starter.template, giros, starter.holding);
  const count = importCount(groups, excluded);

  async function bring() {
    if (busy) return;
    setProblem(null);
    const choice = choiceFrom(starter.template, giros, excluded, starter.holding);
    if (choice === null || count === 0) {
      setProblem(ES.starter.none);
      return;
    }
    const { error } = await add(choice);
    if (error !== null) {
      setProblem(error);
      return;
    }
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <View
        style={{
          backgroundColor: PALETTE.banda,
          paddingTop: insets.top + scale.space,
          paddingBottom: scale.space,
          paddingHorizontal: scale.space,
          borderBottomWidth: 1,
          borderBottomColor: PALETTE.linea,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: scale.space,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}
        >
          {ES.starter.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={{
            minHeight: scale.tapTarget,
            minWidth: scale.tapTarget,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
            {ES.catalog.back}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: scale.space,
          paddingBottom: scale.space * 2 + insets.bottom,
          gap: scale.rowGap,
        }}
      >
        {starter.template !== null ? (
          <SelectorCatalogo
            template={starter.template}
            holding={starter.holding}
            chosen={giros}
            excluded={excluded}
            onToggleGiro={(code) => setGiros((now) => toggled(now, code))}
            onToggleProduct={(code) => setExcluded((now) => toggled(now, code))}
          />
        ) : (
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
            {starter.failed !== null ? ES.starter.needsSignal : ES.starter.loading}
          </Text>
        )}

        {problem !== null && (
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
            {problem}
          </Text>
        )}

        {giros.size > 0 && (
          <View style={{ marginTop: scale.space }}>
            <BotonLleno label={ES.starter.add(count)} onPress={() => void bring()} busy={busy} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

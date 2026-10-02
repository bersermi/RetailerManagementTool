// ============================================================================
// THE STARTER-CATALOG PICKER. Plan task `9d`, the owner's ruling of 2026-10-01:
// choose giros, then an untick list, then import.
//
// Drawn by two files, which is why it is here (`R14`): the onboarding screen,
// where it is the third question before *Crear mi tienda*, and `catalogo.tsx`,
// opened from Productos to bring more later.
//
// ⚠️ IT DECIDES NOTHING (`R3`). Which giros are offered, what each would bring,
// how the list groups and what is already in the shop are all
// `@/api/starterCatalog`'s; this file draws what those functions return and
// hands every tap back to the screen that holds the two sets.
//
// ⚠️ EVERY PRODUCT STARTS TICKED, AND THE SET THE SCREEN HOLDS IS WHAT WAS
// UNTICKED — see `@/api/starterCatalog`'s header. ⚠️ AND THE RULE ABOUT WHAT
// CANNOT BE UNDONE IS SAID ABOVE THE LIST (`ES.starter.hint`), not after the tap.
//
// ⚠️ R9: how the list reads at a glance — 24 rows under one family header, the
// tick's size against the elder density, whether a pill reads as chosen — is
// the owner's phone to judge, and no check here can see it.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import {
  giroChoices,
  offeredGroups,
  type ShopHolding,
  type Template,
} from '@/api/starterCatalog';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function SelectorCatalogo({
  template,
  holding,
  chosen,
  excluded,
  onToggleGiro,
  onToggleProduct,
}: {
  template: Template;
  holding: ShopHolding;
  chosen: ReadonlySet<string>;
  excluded: ReadonlySet<string>;
  onToggleGiro: (code: string) => void;
  onToggleProduct: (code: string) => void;
}) {
  const { scale } = useDensity();
  const giros = giroChoices(template, holding);
  const groups = offeredGroups(template, chosen, holding);

  if (giros.length === 0) {
    return (
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
        {ES.starter.nothingLeft}
      </Text>
    );
  }

  return (
    <View style={{ gap: scale.rowGap }}>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
        {ES.starter.question}
      </Text>
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
        {ES.starter.hint}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap }}>
        {giros.map((giro) => {
          const on = chosen.has(giro.code);
          return (
            <Pressable
              key={giro.code}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${giro.label}, ${ES.starter.count(giro.count)}`}
              onPress={() => onToggleGiro(giro.code)}
              style={{
                minHeight: scale.tapTarget,
                justifyContent: 'center',
                paddingHorizontal: scale.space,
                borderRadius: scale.rowGap,
                borderWidth: 1,
                borderColor: on ? PALETTE.accion : PALETTE.linea,
                backgroundColor: on ? PALETTE.accionSuave : PALETTE.superficie,
              }}
            >
              <Text
                style={{
                  fontSize: scale.bodySize,
                  fontWeight: on ? '700' : '600',
                  color: on ? PALETTE.accion : PALETTE.tintaApagada,
                }}
              >
                {giro.label}
              </Text>
              <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
                {ES.starter.count(giro.count)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {groups.map((group) => (
        <View key={group.code} style={{ gap: scale.rowGap / 2 }}>
          <Text
            style={{
              fontSize: scale.smallSize,
              fontWeight: '700',
              color: PALETTE.tintaApagada,
              marginTop: scale.rowGap,
            }}
          >
            {`${group.name} · ${ES.starter.count(group.products.length)}`}
          </Text>
          {group.products.map((product) => {
            const ticked = !excluded.has(product.code);
            return (
              <Pressable
                key={product.code}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: ticked }}
                accessibilityLabel={product.name}
                onPress={() => onToggleProduct(product.code)}
                style={{
                  minHeight: scale.tapTarget,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scale.rowGap,
                }}
              >
                <MaterialCommunityIcons
                  name={ticked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={scale.iconSize}
                  color={ticked ? PALETTE.accion : PALETTE.tintaApagada}
                />
                <Text
                  style={{
                    fontSize: scale.bodySize,
                    color: ticked ? PALETTE.tinta : PALETTE.tintaApagada,
                  }}
                >
                  {product.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

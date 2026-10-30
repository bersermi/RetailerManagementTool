// ============================================================================
// THE BUSINESSES THAT GO WITH AN ACCOUNT, AND A BOX FOR EACH ONE'S NAME —
// `10.4b-i`, the owner's ruling of 2026-10-29: when deleting an account would
// delete more than the shop open here (her kitchen in Wera Cocina, or a business
// that is not this shop), the screen names every one and she types each one's
// name. Drawn by Ajustes and by the welcome screen — where a kitchen's owner
// lands, since Wera opens shops only (`0072`).
//
// ⚠️ IT DECIDES NOTHING. Which businesses, in what order, what each box is
// labelled and whether they match are `@/api/account`'s; `children` is what a
// screen draws between the list and the boxes (Ajustes: who loses access to the
// shop open there, and the export).
// ============================================================================
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { typedLabel, type Business, type Typed } from '@/api/account';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { Campo } from '@/ui/Campo';

export function NegociosQueSeBorran({
  businesses,
  typed,
  onType,
  editable,
  children,
}: {
  businesses: readonly Business[];
  typed: Typed;
  onType: (id: string, text: string) => void;
  editable: boolean;
  children?: ReactNode;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap }}>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta }}>
        {ES.account.businessesWarning(businesses.length)}
      </Text>
      <View>
        {businesses.map((business) => (
          <Text key={business.id} style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
            {`• ${ES.account.businessLine(business.name, business.kind)}`}
          </Text>
        ))}
      </View>
      {children}
      {businesses.map((business) => (
        <Campo
          key={business.id}
          label={typedLabel(business)}
          value={typed[business.id] ?? ''}
          onChangeText={(text) => onType(business.id, text)}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
        />
      ))}
    </View>
  );
}

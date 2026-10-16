// ============================================================================
// THE STORE'S ADDRESS, AS FIVE BOXES — street, number, colonia, city, código
// postal. Plan task `8k` (`0058`), the owner's ruling of 2026-10-16: *"at least
// Street, number, ciudad and Código Postal"*; the colonia is offered and may
// stay empty.
//
// ⚠️ `R14`: TWO FILES DRAW IT FROM THE DAY IT EXISTS — the shop form, where it
// is asked when a shop is created, and Ajustes, where an existing shop gives it
// (every shop made before `0058` has none). One form, so the two cannot ask
// differently. ⚠️ It decides nothing: `checkAddress` (`@/api/collection`) says
// what is missing, and the screen says it.
//
// ⚠️ THE CÓDIGO POSTAL TAKES DIGITS AND STOPS AT FIVE — the number pad, and
// `maxLength`. A leading zero is part of it (CDMX's start with 0).
// ============================================================================

import { Text, TextInput, View } from 'react-native';

import type { AddressForm } from '@/api/collection';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function Direccion({
  value,
  onChange,
  editable = true,
}: {
  value: AddressForm;
  onChange: (next: AddressForm) => void;
  editable?: boolean;
}) {
  const { scale } = useDensity();
  const field = (
    key: keyof AddressForm,
    label: string,
    extra: { keyboardType?: 'default' | 'number-pad'; maxLength?: number; autoCapitalize?: 'words' | 'none' } = {},
  ) => (
    <View key={key} style={{ gap: scale.rowGap / 2 }}>
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{label}</Text>
      <TextInput
        value={value[key]}
        onChangeText={(text) => onChange({ ...value, [key]: text })}
        editable={editable}
        autoCorrect={false}
        autoCapitalize={extra.autoCapitalize ?? 'words'}
        keyboardType={extra.keyboardType ?? 'default'}
        maxLength={extra.maxLength}
        accessibilityLabel={label}
        style={{
          fontSize: scale.bodySize,
          minHeight: scale.tapTarget,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          borderRadius: scale.space / 2,
          paddingHorizontal: scale.space,
          backgroundColor: PALETTE.superficie,
          color: PALETTE.tinta,
        }}
      />
    </View>
  );

  return (
    <View style={{ gap: scale.rowGap }}>
      {field('street', ES.address.street)}
      {field('number', ES.address.number, { autoCapitalize: 'none' })}
      {field('colonia', ES.address.colonia)}
      {field('city', ES.address.city)}
      {field('postalCode', ES.address.postalCode, { keyboardType: 'number-pad', maxLength: 5 })}
    </View>
  );
}

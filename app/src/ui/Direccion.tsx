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
//
// ⚠️ `8g`, 2026-10-22 — THE KEYBOARD, AT THE OWNER'S ASK (*"a keyboard … that has
// a tick or 'ok' symbol to confirm … and hide"*): each box's key moves to the
// next (*Siguiente*), the last one's is ✓; and the postal code's number pad,
// which has no key of its own on an iPhone, carries *Listo* (`TecladoListo`).
// ============================================================================

import { useRef } from 'react';
import { Text, TextInput, View } from 'react-native';

import type { AddressForm } from '@/api/collection';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { TecladoListo } from '@/ui/TecladoListo';

/** The postal code's pad and its *Listo* bar meet by this string (`InputAccessoryView`). */
const PAD_ID = 'wera.address.pad';

const ORDER: readonly (keyof AddressForm)[] = ['street', 'number', 'colonia', 'city', 'postalCode'];

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
  const boxes = useRef<Partial<Record<keyof AddressForm, TextInput | null>>>({});
  const field = (
    key: keyof AddressForm,
    label: string,
    extra: { keyboardType?: 'default' | 'number-pad'; maxLength?: number; autoCapitalize?: 'words' | 'none' } = {},
  ) => {
    const next = ORDER[ORDER.indexOf(key) + 1];
    return (
      <View key={key} style={{ gap: scale.rowGap / 2 }}>
        <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{label}</Text>
        <TextInput
          ref={(box) => {
            boxes.current[key] = box;
          }}
          value={value[key]}
          onChangeText={(text) => onChange({ ...value, [key]: text })}
          editable={editable}
          autoCorrect={false}
          autoCapitalize={extra.autoCapitalize ?? 'words'}
          keyboardType={extra.keyboardType ?? 'default'}
          maxLength={extra.maxLength}
          accessibilityLabel={label}
          returnKeyType={next === undefined ? 'done' : 'next'}
          submitBehavior={next === undefined ? 'blurAndSubmit' : 'submit'}
          onSubmitEditing={() => (next === undefined ? undefined : boxes.current[next]?.focus())}
          inputAccessoryViewID={extra.keyboardType === 'number-pad' ? PAD_ID : undefined}
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
  };

  return (
    <View style={{ gap: scale.rowGap }}>
      {field('street', ES.address.street)}
      {field('number', ES.address.number, { autoCapitalize: 'none' })}
      {field('colonia', ES.address.colonia)}
      {field('city', ES.address.city)}
      {field('postalCode', ES.address.postalCode, { keyboardType: 'number-pad', maxLength: 5 })}
      <TecladoListo padId={PAD_ID} label={ES.address.done} />
    </View>
  );
}

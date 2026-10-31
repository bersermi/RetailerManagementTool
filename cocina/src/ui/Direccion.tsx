// ============================================================================
// HER KITCHEN'S ADDRESS, AS FIVE BOXES — street, number, colonia, city, código
// postal. Plan task `10.4b-iii-b`.
//
// ⚠️ WERA'S `Direccion`, COPIED (`app/src/ui/Direccion.tsx`, plan `8k`, the
// owner's ruling of 2026-10-16: *"at least Street, number, ciudad and Código
// Postal"*; the colonia is offered and may stay empty), at Wera's normal size and
// in `Campo`'s boxes. It decides nothing: `checkAddress` (`@/api/place`) says
// what is missing, and the screen says it. Drawn by the sign-up form and by
// *Giro y dirección*.
//
// ⚠️ THE CÓDIGO POSTAL TAKES DIGITS AND STOPS AT FIVE — the number pad and
// `maxLength`; a leading zero is part of it (CDMX's start with 0). Each box's key
// moves to the next, the last one's is ✓, and on an iPhone the pad carries
// *Listo* (`TecladoListo`) — Wera's `8g`, at the owner's ask.
// ============================================================================

import { useRef } from 'react';
import { TextInput, View } from 'react-native';

import type { AddressForm } from '@/api/place';
import { ES } from '@/strings';
import { SIZE } from '@/theme/palette';
import { Campo } from '@/ui/Campo';
import { TecladoListo } from '@/ui/TecladoListo';

/** The postal code's pad and its *Listo* bar meet by this string (`InputAccessoryView`). */
const PAD_ID = 'cocina.address.pad';

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
  const boxes = useRef<Partial<Record<keyof AddressForm, TextInput | null>>>({});
  const field = (
    key: keyof AddressForm,
    label: string,
    extra: { keyboardType?: 'default' | 'number-pad'; maxLength?: number; autoCapitalize?: 'words' | 'none' } = {},
  ) => {
    const next = ORDER[ORDER.indexOf(key) + 1];
    return (
      <Campo
        key={key}
        ref={(box) => {
          boxes.current[key] = box;
        }}
        label={label}
        value={value[key]}
        onChangeText={(text) => onChange({ ...value, [key]: text })}
        editable={editable}
        autoCorrect={false}
        autoCapitalize={extra.autoCapitalize ?? 'words'}
        keyboardType={extra.keyboardType ?? 'default'}
        maxLength={extra.maxLength}
        returnKeyType={next === undefined ? 'done' : 'next'}
        submitBehavior={next === undefined ? 'blurAndSubmit' : 'submit'}
        onSubmitEditing={() => (next === undefined ? undefined : boxes.current[next]?.focus())}
        inputAccessoryViewID={extra.keyboardType === 'number-pad' ? PAD_ID : undefined}
      />
    );
  };

  return (
    <View style={{ gap: SIZE.space }}>
      {field('street', ES.address.street)}
      {field('number', ES.address.number, { autoCapitalize: 'none' })}
      {field('colonia', ES.address.colonia)}
      {field('city', ES.address.city)}
      {field('postalCode', ES.address.postalCode, { keyboardType: 'number-pad', maxLength: 5 })}
      <TecladoListo padId={PAD_ID} label={ES.address.done} />
    </View>
  );
}

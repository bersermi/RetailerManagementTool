// ============================================================================
// THE TWO DOORS — `8g`, the owner's ruling of 2026-10-21: *"We will do the 2
// door version."* Opening a shop, or joining one she was invited to, and a
// quiet way back in under them. No sentence under either door: the icon and
// the words say it (his rule since Proveedores: *"better for things to be
// intuitive"*).
//
// Drawn on the welcome (`(auth)/hola`) and on the landing, for a signed-in
// account that came by neither door (a second phone).
// ============================================================================
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

type Icono = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Puertas({
  onAbrir,
  onInvitada,
  onEntrar = null,
}: {
  onAbrir: () => void;
  onInvitada: () => void;
  /** *¿Ya tienes cuenta? Entrar* — absent once she is signed in. */
  onEntrar?: (() => void) | null;
}) {
  const { scale } = useDensity();

  const puerta = (label: string, icon: Icono, lleno: boolean, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: scale.tapTarget + scale.space + scale.rowGap,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.space,
        paddingHorizontal: scale.space + scale.rowGap,
        borderRadius: scale.space + scale.rowGap / 2,
        borderWidth: 1.5,
        borderColor: PALETTE.accion,
        backgroundColor: lleno ? PALETTE.accion : PALETTE.superficie,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <MaterialCommunityIcons name={icon} size={scale.iconSize} color={lleno ? PALETTE.superficie : PALETTE.accion} />
      <Text
        style={{
          flex: 1,
          fontSize: scale.bodySize + scale.rowGap / 4,
          fontWeight: '700',
          color: lleno ? PALETTE.superficie : PALETTE.accion,
        }}
      >
        {label}
      </Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={scale.iconSize}
        color={lleno ? PALETTE.superficie : PALETTE.accion}
      />
    </Pressable>
  );

  return (
    <View style={{ gap: scale.space }}>
      {puerta(ES.hola.abrir, 'storefront-outline', true, onAbrir)}
      {puerta(ES.hola.invitada, 'key-outline', false, onInvitada)}
      {onEntrar !== null && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.hola.yaTengo} ${ES.hola.entrar}`}
          onPress={onEntrar}
          style={{ minHeight: scale.tapTarget, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
            {`${ES.hola.yaTengo} `}
            <Text style={{ fontWeight: '700', color: PALETTE.accion }}>{ES.hola.entrar}</Text>
          </Text>
        </Pressable>
      )}
    </View>
  );
}

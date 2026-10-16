// ============================================================================
// THE SQUARE A PRODUCT'S PICTURE SITS IN — and, until it has one, its initials
// (C8.14: a finished state, never *pending photo*). `8g`, the owner's row B.
//
// ⚠️ `R14`: VENDER DREW IT FIRST (2026-10-15) AND COMPRAR'S CARD IS THE SECOND
// FILE, ROUND 4 OF `8g` (2026-10-16). Moved byte-for-byte; the sizes did not
// drift because there was only one copy.
//
// ⚠️ `ground` AND `ink` ARE A DECIDED DIFFERENCE (`R16`): Comprar is blue — the
// owner's ruling on the card grid of 2026-10-16 — so its tiles are `compraSuave`
// with `compra` initials. Everything else about the square is one answer.
//
// ⚠️ HIDDEN FROM THE SCREEN READER: the name beside it already says it.
// ============================================================================

import { Text, View } from 'react-native';

import { initials } from '@/api/catalog';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function Retrato({
  name,
  small = false,
  ground = PALETTE.retrato,
  ink = PALETTE.tintaApagada,
}: {
  name: string;
  /** `tapTarget` square — a card, a sheet's heading — rather than the row's. */
  small?: boolean;
  ground?: string;
  ink?: string;
}) {
  const { scale } = useDensity();
  const side = small ? scale.tapTarget : scale.retratoSize;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: side,
        height: side,
        borderRadius: small ? scale.space : scale.space * 1.5,
        backgroundColor: ground,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: small ? scale.bodySize : scale.titleSize,
          fontWeight: '700',
          color: ink,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

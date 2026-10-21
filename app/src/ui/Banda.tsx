// ============================================================================
// THE FIRST DAY'S BAND — `8g`, the owner's note of 2026-10-21: *"Make the
// overall interface more beautiful … You can use regular sizes and more
// beautiful styling."* The cream band every other screen opens with, for the
// screens before a shop exists: the account, Tu tienda, Entrar a la tienda.
//
// A way back on top, then a line in the brand's ink saying which door she came
// in by, then the title. It sits under the status bar, so nothing she scrolls
// runs under the clock (the walk found Tu tienda's text there).
// ============================================================================
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDensity } from '@/theme/DensityProvider';
import { TITULO } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';
import { Rotulo } from '@/ui/Rotulo';

export function Banda({
  titulo,
  antetitulo = null,
  volver = null,
}: {
  titulo: string;
  /** Which door, in the brand's ink above the title. */
  antetitulo?: string | null;
  volver?: { readonly label: string; readonly onPress: () => void } | null;
}) {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: PALETTE.banda,
        paddingTop: insets.top + scale.rowGap,
        paddingBottom: scale.space + scale.rowGap,
        paddingHorizontal: scale.space * 2,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
        gap: scale.rowGap / 2,
      }}
    >
      {volver !== null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={volver.label}
          onPress={volver.onPress}
          style={{ minHeight: scale.tapTarget, justifyContent: 'center', alignSelf: 'flex-start' }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
            {`‹ ${volver.label}`}
          </Text>
        </Pressable>
      ) : (
        <View style={{ height: scale.space }} />
      )}
      {antetitulo !== null && <Rotulo text={antetitulo} ink={PALETTE.marca} />}
      <Text style={{ fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}>{titulo}</Text>
    </View>
  );
}

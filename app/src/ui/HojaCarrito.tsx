// ============================================================================
// THE CARRITO SHEET — the frame all three counters open over their list: the
// veil, the fixed card, its heading with `Cerrar`, the lines, and the foot.
//
// ⚠️⚠️ `R14`, AND THE OWNER ASKED FOR IT BY NAME. Vender, Comprar and Desperdicio
// each drew this frame and they had drifted: round 1 of `8g` (2026-10-15) gave
// Vender's heading the titles' face and a count, and its foot the Total, and the
// other two kept the plain heading. His words on 2026-10-16, building Comprar:
// *"make sure the geometries in common are the same."* One frame now; what each
// counter puts IN it stays the counter's.
//
// ⚠️⚠️ A FIXED HEIGHT, RULED 2026-09-24 — *"let's just make the height of the
// carrito fixed."* The reason is muscle memory: `Vaciar carrito` and the slide
// are in the SAME PLACE on every basket.
//
// ⚠️ THE VELO CLOSES IT (ruled 2026-09-24), and Android's hardware back does too.
//
// ⚠️⚠️ `padding` ON BOTH PLATFORMS SINCE ROUND 4. It was `undefined` on Android,
// the defect round 1 recorded and left: a `Modal` is a window of its own that
// Expo's `resize` does not shorten, so the number pad covered the foot. The price
// sheet learned the same thing first (`8g`, 2026-10-15).
//
// ⚠️ `over` IS DRAWN INSIDE THE `Modal`, AFTER THE CARD — the emptying question
// and Vender's price sheet. A sibling of the `Modal` would be behind it, and a
// second `Modal` over this one is two iOS presentations animating against each
// other.
// ============================================================================

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { TITULO } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';
import { Velo } from '@/ui/Velo';

export function HojaCarrito({
  open,
  onClose,
  lines,
  detail = null,
  children,
  foot,
  over = null,
}: {
  open: boolean;
  onClose: () => void;
  /** How many products are in it — the line under the title. */
  lines: number;
  /** Said before the count, *Don Chuy · 3 productos*: Comprar's provider. */
  detail?: string | null;
  /** The lines — a `FlatList` with `flex: 1`. */
  children: ReactNode;
  /** The foot's contents, or `null` for an empty basket. */
  foot: ReactNode;
  over?: ReactNode;
}) {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const count = ES.counter.lines(lines);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Velo label={ES.counter.cart.close} onPress={onClose} />
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View
            style={{
              height: '72%',
              borderTopLeftRadius: scale.space,
              borderTopRightRadius: scale.space,
              backgroundColor: PALETTE.fondo,
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: scale.space,
                paddingVertical: scale.space,
                borderBottomWidth: 1,
                borderBottomColor: PALETTE.linea,
              }}
            >
              <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
                <Text style={{ fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}>
                  {ES.counter.cart.title}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
                  {detail === null ? count : ES.counter.cart.withDetail(detail, count)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ES.counter.cart.close}
                onPress={onClose}
                style={{ minHeight: scale.tapTarget, justifyContent: 'center', paddingHorizontal: scale.rowGap }}
              >
                <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
                  {ES.counter.cart.close}
                </Text>
              </Pressable>
            </View>

            {children}

            {foot === null ? null : (
              <View
                style={{
                  gap: scale.space,
                  paddingHorizontal: scale.space,
                  paddingVertical: scale.space,
                  borderTopWidth: 1,
                  borderTopColor: PALETTE.linea,
                  backgroundColor: PALETTE.banda,
                }}
              >
                {foot}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>

        {over}
      </View>
    </Modal>
  );
}

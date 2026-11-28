// ============================================================================
// LOS PASILLOS — the counter's aisles, as names. Plan tasks `14.2` (drawn on
// Vender) and `14.3` (moved here as Comprar draws them a second time, `R14`).
// The owner's call 3 of 2026-11-27: *Todo* first, then every family the shop
// sells in, in the day's order (call 6); one tap filters the grid, chosen again
// it is *Todo*. Productos keeps its photo squares: on a counter a row of photos
// would take a row of products off the screen, and seven plain names read at once.
//
// ⚠️ `tono` IS THE ONE DIFFERENCE BETWEEN THE COUNTERS (`R16`): each keeps its
// colour (call 1) — Vender's green, Comprar's blue — and nothing else here differs.
//
// ⚠️ WHAT A TAP DOES TO THE SEARCH IS THE SCREEN'S (call 13): an aisle chosen
// empties the box. This strip only says which aisle was chosen.
// ============================================================================

import type { RefObject } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import type { Aisle } from '@/api/productPage';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { ESQUINA } from '@/theme/density';
import { PALETTE } from '@/theme/palette';

export function Pasillos({
  aisles,
  chosen,
  onChoose,
  strip,
  tono,
}: {
  aisles: readonly Aisle[];
  /** The family id chosen, or `null` for *Todo*. */
  chosen: string | null;
  onChoose: (familyId: string | null) => void;
  /** So the screen can bring the strip back to its start after a sale. */
  strip: RefObject<ScrollView | null>;
  /** The counter's colour: a chosen aisle is filled in it. */
  tono: string;
}) {
  const { scale } = useDensity();
  if (aisles.length < 2) return null;
  return (
    <ScrollView
      ref={strip}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      // ⚠️ NEITHER GROW NOR SHRINK — Productos' measurement of 2026-10-17.
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ gap: scale.rowGap, paddingHorizontal: scale.space, paddingBottom: scale.rowGap }}
    >
      <Pasillo name={ES.products.all} on={chosen === null} tono={tono} onPress={() => onChoose(null)} />
      {aisles.map((one) => (
        <Pasillo
          key={one.familyId}
          name={one.name}
          on={chosen === one.familyId}
          tono={tono}
          onPress={() => onChoose(chosen === one.familyId ? null : one.familyId)}
        />
      ))}
    </ScrollView>
  );
}

/**
 * One aisle's name. ⚠️ Chosen, it is FILLED in the counter's colour and its word
 * goes bold — a change of shape and weight as well as of hue (`R11`).
 */
function Pasillo({ name, on, tono, onPress }: { name: string; on: boolean; tono: string; onPress: () => void }) {
  const { scale } = useDensity();
  const alto = scale.tapTarget * 0.75;
  const slop = (scale.tapTarget - alto) / 2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected: on }}
      // ⚠️ 48 POINTS TO A THUMB: three quarters drawn, the rest in the slop.
      hitSlop={{ top: slop, bottom: slop }}
      onPress={onPress}
      style={{
        minHeight: alto,
        justifyContent: 'center',
        paddingHorizontal: scale.space,
        borderRadius: ESQUINA.chip,
        borderWidth: 1,
        borderColor: on ? tono : PALETTE.linea,
        backgroundColor: on ? tono : PALETTE.superficie,
      }}
    >
      <Text
        numberOfLines={1}
        style={{ fontSize: scale.smallSize, fontWeight: on ? '800' : '600', color: on ? PALETTE.superficie : PALETTE.tinta }}
      >
        {name}
      </Text>
    </Pressable>
  );
}

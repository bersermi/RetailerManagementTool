// ============================================================================
// LA BALDOSA — ONE PRODUCT ON THE COUNTER, AND IT IS THE WHOLE CONTROL. Plan
// tasks `14.2` (drawn on Vender) and `14.3` (moved here as Comprar draws it a
// second time, `R14`). The owner's calls 2 and 4 of 2026-11-27; it replaced
// *B · Mostrador*'s row of 2026-10-15 on Vender and round 4's card on Comprar.
// The photo (its initials until there is one), the price as `11.2`'s tag on it,
// the name under it in the phone's own face.
//
// ⚠️⚠️ C3.3 STILL HOLDS: THE TAP IS THE LINE. What a tap and a long press do is
// the counter's (`@/cart/vitrina`): on Vender a tap adds one piece or bunch or
// opens the pad on a weighed product; on Comprar every tap opens the pad, because
// a delivery always has a cost. There is no detail screen behind a tile — a tap
// that navigated away mid-sale would lose the counter's place.
//
// ⚠️⚠️ IN THE BASKET, THE FOOT OF THE PHOTO IS ITS QUANTITY, AND THE TILE ITSELF
// IS THE `+`. The page drew `−`, the quantity and `+` on the foot; a tile is about
// 117 points wide at *Normal*, and two 48-point buttons leave the quantity 21 —
// *12 manojo* does not fit, and a button under 48 points is the target the shop's
// eyes and thumbs were promised never to get. So `−` keeps its 48 points where the
// counter draws one (Vender, on a count) and the `+` is the tap she already used.
// The foot covers the tag, as on the page: what she is selling is what matters
// once it is in the basket, and the bar holds the total.
//
// ⚠️ THE AMBER LINE IS A BAND ACROSS THE TOP OF THE PHOTO — never a line under the
// name, which would make that tile's row taller than the others and move every
// row below it under her thumb. With `alarma` the tile's ground goes amber too,
// and the hue never travels alone (`R11`): the band is a sentence.
//
// ⚠️ WHAT DIFFERS BETWEEN THE COUNTERS IS A PROP (`R16`): the colour (call 1),
// the tag's figure (the shelf price, or this provider's last cost), whether there
// is a `−`, and Comprar's line under the name (*Anterior · hace 3 días*,
// *Primera vez*). Nothing here reads the basket or decides a rule.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image, Pressable, Text, View } from 'react-native';

import type { CatalogEntry } from '@/api/catalog';
import { formatMXN } from '@/format/mxn';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { ESQUINA } from '@/theme/density';
import { PALETTE } from '@/theme/palette';
import { Foto } from '@/ui/Foto';

/** The tag on a tile: a figure per unit, or `null` for none yet (Vender's *Sin precio*). */
interface EtiquetaDeBaldosa {
  readonly centavos: number | null;
  /** The unit it is per, as a word — *kg*, *manojo*. */
  readonly per: string;
}

export function Baldosa({
  entry,
  etiqueta,
  cantidad,
  onMenos,
  menosLabel = '',
  banda,
  alarma,
  nota,
  tono,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  entry: CatalogEntry;
  /** The tag while the product is not in the basket; `null` draws none. */
  etiqueta: EtiquetaDeBaldosa | null;
  /** The foot's words while it is in the basket — *3 manojo* — or `''` when it is not. */
  cantidad: string;
  /** Takes one away; `null` draws no `−`. */
  onMenos: (() => void) | null;
  /** The `−` to a screen reader. */
  menosLabel?: string;
  /** The amber band's sentence, or `''`. */
  banda: string;
  /** The tile's ground goes amber — always with a `banda`. */
  alarma: boolean;
  /**
   * The line under the name, on a counter that draws one (Comprar). `undefined`:
   * this counter's tiles have none. `texto: null`: this tile has nothing to say,
   * and the line is still held, so every row of the grid is one height.
   */
  nota?: { readonly texto: string | null; readonly tinta: string };
  /** The counter's colour: the foot and the basket's outline. */
  tono: string;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
}) {
  const { scale } = useDensity();
  const counted = cantidad !== '';
  const foot = scale.tapTarget * 0.75;
  const linea = scale.bodySize * 1.25;
  const lineaNota = scale.smallSize * 1.3;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: ESQUINA.hoja,
        overflow: 'hidden',
        backgroundColor: alarma ? PALETTE.atencionSuave : PALETTE.superficie,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          height: scale.retratoSize,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: PALETTE.retrato,
        }}
      >
        <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tintaApagada }}>
          {entry.initials}
        </Text>
        {/* ⚠️ THE LARGE FILE, as Productos' mosaic: a tile is too wide for
            160 px to stay sharp — standing whole on white. */}
        <Foto picture={entry.picture} size="large" fit="contain" />

        {banda === '' ? null : (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              paddingHorizontal: scale.rowGap / 2,
              paddingVertical: scale.rowGap / 4,
              backgroundColor: PALETTE.atencionSuave,
            }}
          >
            {/* ⚠️ SHRUNK TO FIT, NEVER CUT: on a 393-point iPhone *Más de lo
                habitual* read *Más de lo habi…* (seen on the Simulator). */}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.atencion }}
            >
              {banda}
            </Text>
          </View>
        )}

        {counted ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: foot,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: tono,
            }}
          >
            {onMenos === null ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={menosLabel}
                // ⚠️ 48 POINTS TALL TO A THUMB: the foot is three quarters of a
                // target, and the slop above it is the rest.
                hitSlop={{ top: scale.tapTarget - foot }}
                onPress={onMenos}
                style={({ pressed }) => ({
                  width: scale.tapTarget,
                  height: foot,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRightWidth: 1,
                  borderRightColor: PALETTE.superficie,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialCommunityIcons name="minus" size={scale.iconSize} color={PALETTE.superficie} />
              </Pressable>
            )}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={{
                flex: 1,
                textAlign: 'center',
                paddingHorizontal: scale.rowGap / 2,
                fontSize: scale.smallSize,
                fontWeight: '700',
                color: PALETTE.superficie,
              }}
            >
              {cantidad}
            </Text>
          </View>
        ) : etiqueta === null ? null : (
          <View style={{ position: 'absolute', left: scale.rowGap / 2, bottom: scale.rowGap / 2 }}>
            <Etiqueta etiqueta={etiqueta} />
          </View>
        )}
      </View>

      <Text
        numberOfLines={2}
        style={{
          // ⚠️ TWO LINES HELD EVEN WHEN THE NAME NEEDS ONE, so every row of the
          // grid is the same height and a scroll lands where the thumb expects.
          minHeight: linea * 2,
          lineHeight: linea,
          paddingHorizontal: scale.rowGap,
          paddingTop: scale.rowGap / 2,
          // ⚠️ The gap under the name is the note's when there is one.
          ...(nota === undefined ? { marginBottom: scale.rowGap } : {}),
          fontSize: scale.bodySize,
          fontWeight: '600',
          color: PALETTE.tinta,
        }}
      >
        {entry.name}
      </Text>

      {nota === undefined ? null : (
        // ⚠️ ONE LINE, HELD ON EVERY TILE AND SHRUNK RATHER THAN WRAPPED: a
        // second line on one tile would make its row taller than the rest.
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{
            minHeight: lineaNota,
            lineHeight: lineaNota,
            paddingHorizontal: scale.rowGap,
            marginBottom: scale.rowGap,
            fontSize: scale.smallSize,
            fontWeight: '600',
            color: nota.tinta,
          }}
        >
          {nota.texto ?? ' '}
        </Text>
      )}

      {/* ⚠️ IN THE BASKET, OUTLINED — drawn over the tile, so it moves nothing. */}
      {counted ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: ESQUINA.hoja,
            borderWidth: 2,
            borderColor: tono,
          }}
        />
      ) : null}
    </Pressable>
  );
}

/** The point of `11.2`'s tag — `brand/mostrador/objetos/punta-etiqueta.svg`, rendered. */
const PUNTA = require('@/marca/mostrador/punta-etiqueta.png') as number;

/**
 * ⚠️ `11.2`'S *ETIQUETA*, ON A TILE (`brand/mostrador/objetos.json`'s recipe): a
 * piece of the counter's paper with its point and string hole — the point
 * picture tinted `fondo`, half as wide as it is tall, then the figure on `fondo`,
 * one point under the picture so no seam shows. The figure in the phone's own
 * face (prices in lists stay in it), never without its unit (C3.10). A product
 * with no price says so in grey — on a new shop's first day that is nearly every
 * tile, and a counter of amber tags is a shop that looks unfinished.
 */
function Etiqueta({ etiqueta }: { etiqueta: EtiquetaDeBaldosa }) {
  const { scale } = useDensity();
  const alto = scale.smallSize * 1.6;
  const priced = etiqueta.centavos !== null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'stretch', height: alto }}
    >
      <Image source={PUNTA} tintColor={PALETTE.fondo} style={{ height: alto, aspectRatio: 0.5 }} />
      <View
        style={{
          marginLeft: -1,
          flexDirection: 'row',
          alignItems: 'baseline',
          alignSelf: 'stretch',
          paddingTop: scale.rowGap / 4,
          paddingLeft: scale.rowGap / 4,
          paddingRight: scale.rowGap,
          backgroundColor: PALETTE.fondo,
          borderTopRightRadius: ESQUINA.etiqueta,
          borderBottomRightRadius: ESQUINA.etiqueta,
        }}
      >
        <Text
          style={{
            fontSize: scale.smallSize,
            fontWeight: priced ? '700' : '600',
            color: priced ? PALETTE.tinta : PALETTE.tintaApagada,
            fontVariant: ['tabular-nums'],
          }}
        >
          {etiqueta.centavos === null ? ES.sell.unpriced : formatMXN(etiqueta.centavos)}
        </Text>
        {priced ? (
          <Text style={{ fontSize: scale.smallSize * 0.8, fontWeight: '600', color: PALETTE.tintaApagada }}>
            {`${ES.catalog.per}${etiqueta.per}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

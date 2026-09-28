// ============================================================================
// A SMALL LINE CHART — TIME ACROSS, PRICE UP, ONE COLOUR PER LINE. Plan task
// `7b`, and `R14`: `costos/[id].tsx` drew it first (one line per provider,
// `5g-iii`) and `precios/[id].tsx` is the second file to need it (one line per
// side of the ledger).
//
// ⚠️ EXTRACTED BYTE-FOR-BYTE, SO THERE WAS NO DRIFT TO SETTLE (`R16`). What
// differed between the two callers is DECIDED — which lines, in which colours,
// and the two axis labels — and it is the props. The height (`PLOT_ROWS`), the
// dot, the stroke and the card are the ones `Costos` shipped, and nothing a
// shopkeeper sees on `Costos` changed.
//
// ⚠️ THE ARITHMETIC IS NOT HERE. A caller hands in points already placed in a
// unit box, origin bottom-left (`plotted` in `@/api/costs`, `plottedPrices` in
// `@/api/prices`), where a suite reads them; this file multiplies by pixels it
// has measured and decides nothing (`R3`).
//
// ⚠️ NO SVG — `react-native-svg` would be a native module and a device build on
// a project no workflow compiles ([[no-ci-compiles-the-native-app]]). A segment
// is a 2 pt `View` rotated about its left edge; a dot is a small round one.
//
// ⚠️ `R9`: whether a 160 pt plot reads as a line or a smear is the owner's
// phone's to say, not this file's.
// ============================================================================

import { useState } from 'react';
import { type LayoutChangeEvent, View, Text } from 'react-native';

import type { Plot } from '@/api/costs';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

/** How tall the plot is, before density. ⚠️ `scale.space` multiples, never a literal (`R6`). */
const PLOT_ROWS = 8;

/** One line to draw: a stable key, its points in a unit box, and its colour. Not exported (`R15`). */
interface GraficaLine {
  readonly key: string;
  readonly dots: readonly Plot[];
  /** A colour out of `@/theme/palette` — `serieColour(hue)` (`R11`). */
  readonly colour: string;
}

/**
 * The picture: a line per series, time across, price up.
 *
 * ⚠️ THE PLOT IS A CARD LIKE EVERY OTHER SURFACE IN THIS APP — `superficie` on
 * `fondo`, a `linea` border, `overflow: 'hidden'` so a rotated segment cannot
 * escape it. ⚠️ `overflow` is load-bearing and not tidiness: a segment is a
 * rotated rectangle whose corners reach outside the box it connects points in.
 *
 * ⚠️ THE AXIS LABELS ARE OUTSIDE THE CARD, on its right, high above low. Inside
 * they would sit on top of a line on exactly the products whose prices are
 * highest and lowest. `highLabel === ''` draws no axis at all.
 *
 * ⚠️ NOTHING IS DRAWN UNTIL THE WIDTH IS KNOWN: a plot drawn at a guessed width
 * and then corrected is a chart that leaps on first paint.
 */
export function Grafica({
  lines,
  highLabel,
  lowLabel,
}: {
  lines: readonly GraficaLine[];
  highLabel: string;
  lowLabel: string;
}) {
  const { scale } = useDensity();
  const [width, setWidth] = useState(0);
  const height = scale.space * PLOT_ROWS;
  const dot = scale.rowGap;

  const measure = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View style={{ flexDirection: 'row', gap: scale.rowGap, alignItems: 'stretch' }}>
      <View
        onLayout={measure}
        style={{
          flex: 1,
          height,
          backgroundColor: PALETTE.superficie,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          borderRadius: scale.space / 2,
          overflow: 'hidden',
        }}
      >
        {width === 0
          ? null
          : lines.map((one) => (
              <Linea
                key={one.key}
                dots={one.dots}
                colour={one.colour}
                width={width}
                height={height}
                dot={dot}
              />
            ))}
      </View>
      {highLabel === '' ? null : (
        <View style={{ height, justifyContent: 'space-between' }}>
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
            {highLabel}
          </Text>
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
            {lowLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * One line's dots and the runs between them — private to this file (`R15`).
 *
 * ⚠️⚠️ THE Y FLIP HAPPENS HERE, ONCE — AND AS OF 2026-09-25 *HERE* IS THE ONLY
 * PLACE IT HAPPENS. `plotted` answers in the coordinates a PERSON means — origin
 * bottom-left, `y` rising with price — and React Native measures `top` downwards.
 * So each `y` becomes `1 - y` on this line, and never in `plotted`: flipping
 * there would force whichever renderer wanted the human orientation to undo it,
 * which is the same bug with more steps. ⚠️ `@/export/costsPdf` used to make the
 * same subtraction on its own line; `5g-iii-a` removed that renderer when the
 * owner turned the shared document into a table, so this screen is now the only
 * thing in the app that draws this chart at all.
 *
 * ⚠️ `atan2` AND NOT `atan(dy / dx)`: two deliveries at the identical instant
 * give `dx === 0`, and `atan` of infinity is a right angle drawn by accident.
 * `atan2(0, 0)` is `0` and a zero-length segment is invisible, which is the
 * correct picture of two points in one place.
 *
 * ⚠️ `transform` AND `opacity` ONLY, which is §2.11's motion rule applying to a
 * STATIC transform as well as to an animated one — a rotation runs on the
 * compositor and costs nothing per frame, and there is no frame here anyway.
 * ⚠️ **There is deliberately no entrance animation on this chart.** §2.11 allows
 * one staggered reveal per screen; a plot whose lines drew themselves in would
 * be the second, and the one thing a shopkeeper wants from this screen is the
 * shape, immediately.
 *
 * ⚠️ THE SEGMENT LOOP STARTS AT 1, so a one-point series connects nothing — which
 * is `CostsState`'s `single` and `unlinked` expressed as geometry rather than as
 * a branch.
 */
function Linea({
  dots,
  colour,
  width,
  height,
  dot,
}: {
  dots: readonly Plot[];
  colour: string;
  width: number;
  height: number;
  dot: number;
}) {
  const stroke = 2;
  const px = (x: number) => x * (width - dot) + dot / 2;
  const py = (y: number) => (1 - y) * (height - dot) + dot / 2;

  const parts = [];
  for (let i = 1; i < dots.length; i += 1) {
    const from = dots[i - 1] as Plot;
    const to = dots[i] as Plot;
    const x1 = px(from.x);
    const y1 = py(from.y);
    const dx = px(to.x) - x1;
    const dy = py(to.y) - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;
    parts.push(
      <View
        key={`s${i}`}
        style={{
          position: 'absolute',
          left: x1,
          top: y1 - stroke / 2,
          width: length,
          height: stroke,
          backgroundColor: colour,
          // ⚠️ THE ORIGIN IS THE LEFT EDGE AND RN ROTATES ABOUT THE CENTRE, so
          // the segment is shifted half its length left, rotated, and shifted
          // back — which is what `transformOrigin` would express if React Native
          // supported it on every version this app targets.
          transform: [
            { translateX: -length / 2 },
            { rotate: angle },
            { translateX: length / 2 },
          ],
        }}
      />,
    );
  }
  for (let i = 0; i < dots.length; i += 1) {
    const one = dots[i] as Plot;
    parts.push(
      <View
        key={`d${i}`}
        style={{
          position: 'absolute',
          left: px(one.x) - dot / 2,
          top: py(one.y) - dot / 2,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: colour,
        }}
      />,
    );
  }
  return <>{parts}</>;
}

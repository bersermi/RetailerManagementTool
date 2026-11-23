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
//
// ⚠️⚠️ `5R-t` (2026-11-23), ITS ANSWER FOR `Costos`: *"the data points are
// overlapping and not easy to read at all"*. Five things a caller may now ask
// for, each off unless asked, so Precios draws exactly as it did: the period's
// first day and *Hoy* under the plot; small dots on a line with many; each
// line's last point drawn larger; a guide where a finger is, reported back as a
// fraction of the plot (`onTouch`) for the caller to read; and a sentence in an
// empty plot. Still `View`s, and still no animation: Costos now hands in about
// thirty points a line, not every delivery.
// ============================================================================

import { useRef, useState } from 'react';
import { type LayoutChangeEvent, PanResponder, View, Text } from 'react-native';

import type { Plot } from '@/api/costs';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

/** How tall the plot is, before density. ⚠️ `scale.space` multiples, never a literal (`R6`). */
const PLOT_ROWS = 8;

/** `5R-t`: a line behind the one she picked — still there, clearly behind. */
const FADED = 0.2;

/** `5R-t`: a line with more points than this draws them small, so they do not touch. */
const MANY = 16;

/** The finger's guide: a hairline as thick as a line's stroke (`Linea`'s `stroke`). */
const GUIDE = 2;

/** One line to draw: a stable key, its points in a unit box, and its colour. Not exported (`R15`). */
interface GraficaLine {
  readonly key: string;
  readonly dots: readonly Plot[];
  /** A colour out of `@/theme/palette` — `serieColour(hue)` (`R11`). */
  readonly colour: string;
  /**
   * ⚠️ `5R-t`: drawn behind and faded, because she picked another provider in
   * *Cuánto ha cambiado*. At once, no animation — a fade is cheap, a moving
   * layout is what §2.11 keeps off the low-end Androids.
   */
  readonly faded?: boolean;
}

/** `5R-t`'s options — each off unless a caller asks. */
interface GraficaExtras {
  /** Under the plot's left and right edges: the period's first day and *Hoy*. */
  readonly fromLabel?: string;
  readonly toLabel?: string;
  /** Each line's last point drawn larger, ringed: where she is now. */
  readonly endpoint?: boolean;
  /** A vertical guide at this fraction of the plot, or none. */
  readonly guide?: number | null;
  /** Where a finger on the plot is, as a fraction (0 to 1) — `null` when it lifts or a scroll takes it. */
  readonly onTouch?: (x: number | null) => void;
  /** Said in the middle of a plot with nothing to draw. */
  readonly empty?: string;
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
  fromLabel,
  toLabel,
  endpoint = false,
  guide = null,
  onTouch,
  empty,
}: {
  lines: readonly GraficaLine[];
  highLabel: string;
  lowLabel: string;
} & GraficaExtras) {
  const { scale } = useDensity();
  const [width, setWidth] = useState(0);
  const height = scale.space * PLOT_ROWS;
  const dot = scale.rowGap;
  // ⚠️ `5R-t`: the room kept at the plot's edges — a ringed last point is wider than a dot.
  const margin = endpoint ? dot * 1.6 : dot;
  const plot = useRef<View>(null);

  // ⚠️ A `PanResponder` keeps the handlers of its first render
  // ([[a-panresponder-keeps-its-first-handlers]]): it reads these refs.
  const touch = useRef(onTouch);
  touch.current = onTouch;
  const geometry = useRef({ across: 0, edge: 0, originX: 0 });
  geometry.current.across = width;
  geometry.current.edge = margin;
  const report = (pageX: number): void => {
    const g = geometry.current;
    if (g.across <= g.edge) return;
    const x = (pageX - g.originX - g.edge / 2) / (g.across - g.edge);
    touch.current?.(Math.min(1, Math.max(0, x)));
  };
  const finger = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => touch.current !== undefined,
      onMoveShouldSetPanResponder: (_e, g) => touch.current !== undefined && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (e) => {
        const pageX = e.nativeEvent.pageX;
        plot.current?.measure((_x, _y, _w, _h, originX) => {
          geometry.current.originX = originX;
          report(pageX);
        });
      },
      onPanResponderMove: (e) => report(e.nativeEvent.pageX),
      onPanResponderRelease: () => touch.current?.(null),
      onPanResponderTerminate: () => touch.current?.(null),
      // ⚠️ A finger moving up or down is the screen's scroll, not the chart's.
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;

  const measure = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
    plot.current?.measure((_x, _y, _w, _h, originX) => {
      geometry.current.originX = originX;
    });
  };
  const drawsNothing = lines.every((one) => one.dots.length === 0);
  // ⚠️ One dot size for the whole chart: a line with many points makes every line's dots small.
  const crowded = endpoint && lines.some((one) => one.dots.length > MANY);

  return (
    <View style={{ flexDirection: 'row', gap: scale.rowGap, alignItems: 'flex-start' }}>
      <View style={{ flex: 1, gap: scale.rowGap / 2 }}>
      <View
        ref={plot}
        onLayout={measure}
        {...(onTouch === undefined ? {} : finger.panHandlers)}
        style={{
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
          : // ⚠️ The faded lines first, so the picked one is drawn over them.
            [...lines.filter((one) => one.faded === true), ...lines.filter((one) => one.faded !== true)].map((one) => (
              <View
                key={one.key}
                pointerEvents="none"
                style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: one.faded === true ? FADED : 1 }}
              >
                <Linea
                  dots={one.dots}
                  colour={one.colour}
                  width={width}
                  height={height}
                  dot={crowded ? dot * 0.55 : dot}
                  margin={margin}
                  last={endpoint}
                />
              </View>
            ))}
        {width === 0 || guide === null ? null : (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: guide * (width - margin) + margin / 2 - GUIDE / 2,
              width: GUIDE,
              backgroundColor: PALETTE.tinta,
              opacity: 0.35,
            }}
          />
        )}
        {empty !== undefined && drawsNothing ? (
          <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale.space }}>
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{empty}</Text>
          </View>
        ) : null}
      </View>
      {fromLabel === undefined && toLabel === undefined ? null : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: scale.rowGap }}>
          <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{fromLabel ?? ''}</Text>
          <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{toLabel ?? ''}</Text>
        </View>
      )}
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
  margin = dot,
  last = false,
}: {
  dots: readonly Plot[];
  colour: string;
  width: number;
  height: number;
  dot: number;
  /** The room kept at each edge, so a point never touches the card's border — `dot` unless asked. */
  margin?: number;
  /** `5R-t`: the last point drawn larger, ringed in the sheet's colour. */
  last?: boolean;
}) {
  const stroke = 2;
  const px = (x: number) => x * (width - margin) + margin / 2;
  const py = (y: number) => (1 - y) * (height - margin) + margin / 2;

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
    const big = last && i === dots.length - 1;
    const size = big ? margin : dot;
    parts.push(
      <View
        key={`d${i}`}
        style={{
          position: 'absolute',
          left: px(one.x) - size / 2,
          top: py(one.y) - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colour,
          borderWidth: big ? 2 : 0,
          borderColor: PALETTE.superficie,
        }}
      />,
    );
  }
  return <>{parts}</>;
}

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isoDay, priceLabel } from '@/api/catalog';
import {
  COST_WINDOWS,
  anyDash,
  changeLine,
  changePoints,
  chartFromLabel,
  chartWindowFor,
  costChanges,
  costChart,
  costsLine,
  costsSpin,
  matrixOf,
  nearestStop,
  periodLabel,
  picksProvider,
  pricesAt,
  showsChanges,
  type CostChange,
  type CostSeries,
  type CostWindow,
  type Costs,
  type CostsLineInput,
} from '@/api/costs';
import { useCatalog, useCosts } from '@/api/hooks';
import { costsHtml } from '@/export/costsPdf';
import { shareHtmlAsPdf, type ShareOutcome } from '@/export/share';
import { useOnline } from '@/offline/useOnline';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE, serieColour } from '@/theme/palette';
import { TITULO } from '@/theme/letra';
import { Grafica } from '@/ui/Grafica';
import { Separador } from '@/ui/Separador';
import { BotonLleno } from '@/ui/BotonLleno';
import { Vacio } from '@/ui/Vacio';

// ============================================================================
// COSTOS — WHAT EACH PROVIDER HAS CHARGED FOR ONE PRODUCT, THROUGH TIME. Plan
// task `5g-iii`, and the screen behind the button `5d-iii` drew dead on La
// Familia for ten days by a ruling rather than by inertia.
//
// ⚠️⚠️ THE OWNER SPECIFIED IT IN ONE SENTENCE AND IT ASKED FOR MORE THAN THE
// QUESTION OFFERED: *"I'm picturing a small Costos History, that shows a small
// line chart with the time and the price that each provider (colors) is charging
// you for that product. As a collapsable you can get the matrix that shows this
// data. You can share the 'view' as a PDF."* The brief had offered last-price-
// paid, a per-provider comparison, or a trailing series — and had recommended
// DEFERRING the third. **He took the third and folded the second into it.**
//
// ⚠️⚠️ SO THE THIN AND EMPTY STATES ARE MOST OF THIS SCREEN'S REAL WORK, AND THAT
// WAS WRITTEN INTO THE PLAN ROW BEFORE A LINE OF THIS FILE EXISTED. He did not
// dispute that a chart over three deliveries says very little; he decided the
// screen is worth having anyway, which is his call. What that obliges is that
// *very little* is drawn honestly rather than dressed up: one delivery is a DOT
// and never a flat line, several deliveries from several providers are DOTS and
// never a line between two suppliers, and a price this phone cannot denominate
// is `unknown` rather than a chart of nothing. `CostsState` in `@/api/costs`
// holds all five and `app/test/api-costs.test.ts` reads them.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE CHART IS DRAWN FROM `View`s AND THERE IS NO SVG IN THIS APP
// ----------------------------------------------------------------------------
// ⚠️ **AND SINCE `7b` (2026-09-28) IT IS DRAWN BY `@/ui/Grafica`, NOT HERE** —
// `precios/[id].tsx` became the second file to draw it (`R14`), and it moved
// byte-for-byte. The paragraphs below still describe it; they describe it there.
// `react-native-svg` is not a dependency and adding one to draw five lines would
// be a native module plus a device build, on a project where no workflow
// compiles the app at all ([[no-ci-compiles-the-native-app]]). §2.11's
// components row is the same argument made about kits: *"No Tamagui, no
// gluestack … a general kit is fought, then worked around, then partially
// abandoned."*
//
// So a segment is a 2 pt `View` rotated about its left edge, and a dot is a
// small round one. ⚠️ **The arithmetic is NOT here** — `costChart` (`@/api/costs`;
// `plotted` until `5R-t` drew one period at a time) answers in fractions of a unit box and this file multiplies by pixels it has
// measured. That is the `R3`/`R9` line drawn where it belongs: a y-axis that
// silently clipped the highest price would still draw a perfectly plausible
// line, and nothing on a screen can see that, so the arithmetic lives where a
// suite reads it.
//
// ⚠️ THE WIDTH IS MEASURED AND NOT ASSUMED. `onLayout` is what tells this screen
// how wide the plot actually is at *Letra grande* on a 390 pt phone, and until
// it fires the plot draws nothing rather than drawing at a guessed width and
// jumping. A chart that leaps on first paint is the layout shift §2.11's motion
// row exists to avoid, arriving through geometry instead of animation.
//
// ⚠️⚠️ AND THE Y AXIS DOES NOT START AT ZERO, WHICH IS THE ONE THING ABOUT THIS
// PICTURE THAT COULD MISLEAD HER. Purchase prices for one product cluster —
// `$17.50`, `$18.00`, `$18.20` — so a zero-based axis draws three deliveries as
// one flat line and the screen says nothing at all; a range-based axis
// exaggerates instead. **The fix is the two labels beside the plot**, high and
// low, in pesos: a reader who can see the whole picture spans seventy centavos
// cannot be misled by its steepness. `plotted`'s header records the trade.
//
// ----------------------------------------------------------------------------
// ⚠️ ONE COLOUR PER PROVIDER, AND THE COLOUR IS NEVER THE ONLY THING SAYING SO
// ----------------------------------------------------------------------------
// §2.11: *"No state is ever announced by colour ALONE — always colour and a
// word."* The users are old, the shop is bright, and two of the pilot's four
// phones are low-end Android. `SERIE` in `@/theme/palette` measures what its
// five colours can and cannot do: every one clears WCAG's 3:1 non-text floor on
// every ground, and they separate from each other by **hue and not by
// brightness** — 1.19:1 at worst, which is two identical greys to a monochrome
// reader.
//
// So the legend pairs every colour with the provider's NAME, and the collapsible
// matrix is the same rows with no colour in it at all. ⚠️ **That second half is
// not a concession to the rule — it is what the owner asked for**, and it
// happens to be the complete reading for somebody who cannot use hue.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11
// ----------------------------------------------------------------------------
// Whether a 160 pt plot is a *small line chart* or a smear; whether five lines
// in a shop's worth of suppliers reads as information or as spaghetti; whether
// the matrix's columns are scrollable in a way a thumb discovers; whether a PDF
// rendered by a web view on a five-year-old Android is *nice*. ⚠️⚠️ **AND THAT
// LAST ONE IS NOT HYPOTHETICAL — IT IS THE ONE THIS SCREEN ALREADY GOT WRONG.**
// `5g-iii` shipped a chart inside the shared document with twenty-two green
// assertions over it, and the owner's answer from his own phone was *"The Chart
// doesn't survive the Web view."* `5g-iii-a` made the document a table.
// **The instrument is the owner's phone.** The half that is checkable —
// every price, every date, every state, the geometry and the whole document —
// is in `@/api/costs` and `@/export/costsPdf` on purpose, and
// `docs/checks/5g-iii-costs-contract.sh` puts the read in front of a real
// database.
// ============================================================================

export default function Costos() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  // ⚠️ THE VARIANT IS THE PATH, WHICH IS WHAT THIS SCREEN IS ABOUT. §2.9
  // measures price over time PER VARIANT and the owner said *"for that
  // product"* — and a family mixes base units, which
  // `product_purchases_daily`'s own comment calls *"money over a meaningless
  // total"*. La Familia passes the marked row and passes nothing else.
  const { id } = useLocalSearchParams<{ id: string }>();
  const costs = useCosts(id ?? null);

  // ⚠️ THE PRODUCT'S NAME COMES OFF THE CATALOG THIS PHONE ALREADY HOLDS, the
  // read `useCosts` also leans on — so the banda names the product with no
  // request of its own. `''` while it is out, and the banda then shows the
  // module word rather than an empty bar.
  const { entries } = useCatalog();
  const entry = entries.find((one) => one.id === id);
  const name = entry?.name ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda title={name === '' ? ES.costs.title : name} />
      <ScrollView
        contentContainerStyle={{
          padding: scale.space,
          gap: scale.space,
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
      >
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {ES.costs.subtitle}
        </Text>
        <Cuerpo costs={costs} title={name === '' ? ES.costs.title : name} priceUnit={entry?.priceUnit ?? ''} />
      </ScrollView>
    </View>
  );
}

/** The product's own name, and the way back to the family you came from. */
function Banda({ title }: { title: string }) {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: PALETTE.banda,
        paddingTop: insets.top + scale.space,
        paddingBottom: scale.space,
        paddingHorizontal: scale.space,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale.space,
      }}
    >
      {/* ⚠️ THE PRODUCT'S NAME AND NOT THE WORD *Costos*, which is La Familia's
          own rule one screen back: this banda is the only place the product is
          named, and a heading saying *Costos* over a chart of tomato prices is a
          label where a name belongs. The module word is the fallback. */}
      <Text
        numberOfLines={1}
        style={{ flex: 1, fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}
      >
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={{
          minHeight: scale.tapTarget,
          minWidth: scale.tapTarget,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
          {ES.costs.back}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Which of the five things this screen is looking at, drawn.
 *
 * ⚠️⚠️ `unknown` IS A SPINNER AND NOT AN EMPTY STATE, which is the distinction
 * `takingsFrom`, `memoryState` and `familyLineKey` each make in their own words:
 * *not back yet* must never render as *there is nothing*. On this screen getting
 * it wrong would tell a shopkeeper she has never bought a product she buys every
 * week, on a phone that simply has no signal — and the pilot store is offline
 * half the day.
 *
 * ⚠️ A FAILED READ IS THE SAME SPINNER PLUS A SENTENCE, and the sentence is
 * `ES.api`'s, not one invented here. `useCosts` reports the failure separately
 * for exactly that: `data === undefined` after a failure is indistinguishable
 * from one in flight, and a screen that could not tell would spin for ever.
 *
 * ⚠️⚠️ AND WITH NO SIGNAL THERE IS NO SPINNER AT ALL — `8g`, 2026-10-20, the
 * offline report's round 3 (the owner's *"Do all the fixes"*). Offline the read is
 * PAUSED, so the spinner turned until she found a signal and then said *Intenta
 * de nuevo*; now it is *Se ve cuando haya señal* alone (`costsSpin`), and the
 * chart arrives by itself. A chart already read is drawn whatever a refresh said.
 */
function Cuerpo({
  costs,
  title,
  priceUnit,
}: {
  costs: CostsLineInput;
  title: string;
  priceUnit: string;
}) {
  const { scale } = useDensity();
  const online = useOnline();
  const line = costsLine(costs.state, costs.failed, online);
  // ⚠️ `5R-t`: the provider she picked in *Cuánto ha cambiado* — `null` is *Todos*.
  // A pick whose provider is no longer on the screen (a delivery voided) is *Todos*.
  const [picked, setPicked] = useState<string | null>(null);
  // ⚠️ `5R-t`: the chart's period — `null` until she picks one, and then
  // `chartWindowFor`'s — and the period a finger on the chart is reading.
  const [period, setPeriod] = useState<CostWindow | null>(null);
  const [reading, setReading] = useState<string | null>(null);

  if (costs.state === 'unknown') {
    if (!costsSpin(costs.state, online)) return <Vacio line={line} />;
    return (
      <View style={{ padding: scale.space * 2, alignItems: 'center', gap: scale.rowGap }}>
        <ActivityIndicator color={PALETTE.accion} />
        {/* ⚠️ THE SENTENCE IS CHOSEN IN `@/api/costs`, NOT HERE (`R12`) —
            `costsLine` answers `''` for a read that is merely still out, and this
            renders nothing for it. */}
        {line === '' ? null : (
          <Text
            style={{
              fontSize: scale.bodySize,
              color: PALETTE.tintaApagada,
              textAlign: 'center',
            }}
          >
            {line}
          </Text>
        )}
      </View>
    );
  }

  if (costs.state === 'nothing') return <Vacio line={line} />;

  const shown = picked !== null && costs.series.some((one) => one.providerId === picked) ? picked : null;
  // ⚠️ TODAY IS READ HERE, `Compartir`'s rule (`R3`): the arithmetic takes it as an argument.
  const today = isoDay(new Date());
  const window = period ?? chartWindowFor(costs, today);
  const chart = costChart(costs, window, today, priceUnit);
  const guide = reading === null ? null : (chart.stops.find((stop) => stop.day === reading)?.x ?? null);

  return (
    <View style={{ gap: scale.space }}>
      {showsChanges(costs) ? (
        <CuantoCambio
          costs={costs}
          priceUnit={priceUnit}
          picked={shown}
          onPick={(id) => {
            setPicked(id);
            setReading(null);
          }}
          chosen={window}
          today={today}
        />
      ) : null}
      {showsChanges(costs) ? (
        <Periodos
          chosen={window}
          onPick={(w) => {
            setPeriod(w);
            setReading(null);
          }}
        />
      ) : null}
      <Grafica
        lines={chart.lines.map((one) => ({
          key: one.providerId,
          dots: one.points,
          colour: serieColour(one.hue),
          faded: shown !== null && one.providerId !== shown,
        }))}
        highLabel={chart.highLabel}
        lowLabel={chart.lowLabel}
        fromLabel={chartFromLabel(chart)}
        toLabel={ES.costs.chart.today}
        endpoint
        guide={guide}
        onTouch={(x) => setReading(x === null ? null : (nearestStop(chart, x, shown)?.day ?? null))}
        empty={ES.costs.chart.empty}
      />
      <Leyenda
        series={costs.series}
        picked={shown}
        reading={
          reading === null
            ? null
            : { label: periodLabel(reading, chart.grain), prices: pricesAt(chart, reading), priceUnit }
        }
      />
      {costs.state === 'single' || costs.state === 'unlinked' ? <Nota line={line} /> : null}
      <Tabla costs={costs} />
      <Compartir costs={costs} title={title} />
    </View>
  );
}

/**
 * *CUÁNTO HA CAMBIADO* — `5R-t`, drawn with the owner on 2026-11-23: *"In the
 * Costos section, someone should be able to see easily how much a given product
 * has increased in price on a 15 day, 1 month, 3 month, 6 month and 1 year
 * basis. Nominal and percentage."* Five rows, pesos and percent, over the chart —
 * the answer before the detail. Every figure, every dash and every window is
 * `@/api/costs`' (`costChanges`, `changeLine`), read by `app/test/api-costs.test.ts`;
 * what is left here is where it sits and whether a thumb finds the buttons (`R9`).
 *
 * ⚠️ *TODOS* FIRST AND PICKED WHEN THE SCREEN OPENS: what she pays, whoever sold
 * it. A button per provider — his ask, *"she switches the suppliers to see the
 * numbers from each one"* — only when more than one has delivered; picking one
 * reads its deliveries alone and fades the other lines on the chart (his idea:
 * *"one shaded when she clicks over the other"*). The picked button is FILLED and
 * the rest outlined, so which one is picked never rests on a colour (§2.11).
 *
 * ⚠️ TODAY IS READ HERE, `Compartir`'s rule (`R3`): the arithmetic takes the date
 * as an argument so the suite can hold it still.
 */
function CuantoCambio({
  costs,
  priceUnit,
  picked,
  onPick,
  chosen,
  today,
}: {
  costs: Costs;
  priceUnit: string;
  picked: string | null;
  onPick: (providerId: string | null) => void;
  /** The chart's period: its row is marked, so the rows and the chart read as one. */
  chosen: CostWindow;
  today: string;
}) {
  const { scale } = useDensity();
  const rows = costChanges(changePoints(costs, picked), today);
  return (
    <View
      style={{
        gap: scale.rowGap,
        padding: scale.space,
        backgroundColor: PALETTE.superficie,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        borderRadius: scale.space / 2,
      }}
    >
      <Text style={{ fontSize: scale.bodySize * 1.1, fontWeight: '700', color: PALETTE.tinta }}>
        {ES.costs.change.title(ES.numbers.descubre.perUnit(priceUnit))}
      </Text>
      {picksProvider(costs) ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap / 2 }}>
          <Escoger label={ES.costs.change.all} on={picked === null} onPress={() => onPick(null)} />
          {costs.series.map((one) => (
            <Escoger
              key={one.providerId}
              label={one.name}
              swatch={serieColour(one.hue)}
              on={picked === one.providerId}
              onPress={() => onPick(one.providerId)}
            />
          ))}
        </View>
      ) : null}
      <View>
        {rows.map((row) => (
          <Fila key={row.window} change={row} on={row.window === chosen} />
        ))}
      </View>
      {anyDash(rows) ? (
        <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.costs.change.dash}</Text>
      ) : null}
    </View>
  );
}

/**
 * The chart's five periods, as buttons over it — `5R-t`, the owner's *"easy to
 * interact at the different timescales"*. The same buttons as the suppliers',
 * the same words as the rows'.
 */
function Periodos({ chosen, onPick }: { chosen: CostWindow; onPick: (w: CostWindow) => void }) {
  const { scale } = useDensity();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap / 2 }}>
      {COST_WINDOWS.map((w) => (
        <Escoger key={w} label={ES.costs.change.window[w]} on={w === chosen} onPress={() => onPick(w)} />
      ))}
    </View>
  );
}

/** One provider's button, or *Todos*: filled when picked, outlined when not — never colour alone. */
function Escoger({
  label,
  swatch,
  on,
  onPress,
}: {
  label: string;
  swatch?: string;
  on: boolean;
  onPress: () => void;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: scale.tapTarget,
        maxWidth: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap / 2,
        paddingHorizontal: scale.rowGap,
        borderRadius: scale.tapTarget / 2,
        borderWidth: 1,
        borderColor: on ? PALETTE.compra : PALETTE.linea,
        backgroundColor: on ? PALETTE.compra : PALETTE.superficie,
      }}
    >
      {swatch === undefined ? null : (
        <View
          style={{
            width: scale.rowGap,
            height: scale.rowGap,
            borderRadius: scale.rowGap / 4,
            backgroundColor: swatch,
            borderWidth: on ? 1 : 0,
            borderColor: PALETTE.superficie,
          }}
        />
      )}
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontSize: scale.bodySize,
          fontWeight: on ? '700' : '600',
          color: on ? PALETTE.superficie : PALETTE.tinta,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** One window: its name, then the pesos and the percent — or *Sin cambio*, or the dash in both. */
function Fila({ change, on }: { change: CostChange; on: boolean }) {
  const { scale } = useDensity();
  const line = changeLine(change);
  const quiet = change.centavos === null || line.same;
  const figure = {
    minWidth: scale.tapTarget * 1.5,
    textAlign: 'right' as const,
    fontSize: scale.bodySize,
    fontVariant: ['tabular-nums' as const],
    color: quiet ? PALETTE.tintaApagada : PALETTE.tinta,
  };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        minHeight: scale.rowHeight * 0.75,
        borderTopWidth: change.window === 'd15' ? 0 : 1,
        borderTopColor: PALETTE.linea,
        // ⚠️ The chart's period, marked by a band AND a bolder name — never the band alone.
        marginHorizontal: -scale.rowGap / 2,
        paddingHorizontal: scale.rowGap / 2,
        borderRadius: on ? scale.rowGap / 2 : 0,
        backgroundColor: on ? PALETTE.banda : 'transparent',
      }}
    >
      <Text style={{ flex: 1, fontSize: scale.bodySize, fontWeight: on ? '700' : '400', color: PALETTE.tinta }}>
        {ES.costs.change.window[change.window]}
      </Text>
      {line.same ? (
        <Text style={figure}>{line.pesos}</Text>
      ) : (
        <>
          <Text style={{ ...figure, fontWeight: quiet ? '400' : '700' }}>{line.pesos}</Text>
          <Text style={figure}>{line.percent}</Text>
        </>
      )}
    </View>
  );
}

/** A quiet sentence under the plot — never an alarm, and never `atencion`. */
function Nota({ line }: { line: string }) {
  const { scale } = useDensity();
  return (
    <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{line}</Text>
  );
}

/**
 * Which colour is which supplier — the half of *never colour alone* that lives
 * on the chart itself.
 *
 * ⚠️ THE SWATCH IS A SQUARE WITH A RADIUS AND NOT A LINE OF THE SERIES' OWN
 * COLOUR, because a 2 pt line at `Letra normal` is below the size at which these
 * hues are separable at all. The swatch is `scale.rowGap` on a side, which grows
 * with the density mode like everything else (`R6`).
 *
 * ⚠️ `Genérico` IS MARKED AND NOT RENAMED. It keeps its own name — *"Genérico is
 * fine, that means we don't have a Provider for that purchase"* (2026-09-24) —
 * and gains one quiet word beside it, because a market run and a supplier
 * relationship are different kinds of line and the owner said he wants to see it
 * here: *"You can also look at it in Costos if there are records."*
 */
function Leyenda({
  series,
  picked,
  reading,
}: {
  series: readonly CostSeries[];
  picked: string | null;
  /**
   * ⚠️ `5R-t`: while a finger is on the chart, the period it stands on and each
   * supplier's price there — a dash where that supplier has none. `null`: each
   * supplier's last price, as always.
   */
  reading: { label: string; prices: ReadonlyMap<string, number | null>; priceUnit: string } | null;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap / 2 }}>
      {reading === null ? null : (
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{reading.label}</Text>
      )}
      {series.map((one) => (
        <View
          key={one.providerId}
          // ⚠️ `5R-t`: a provider behind the one she picked fades with its line.
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: scale.rowGap,
            opacity: picked !== null && one.providerId !== picked ? 0.4 : 1,
          }}
        >
          <View
            style={{
              width: scale.rowGap,
              height: scale.rowGap,
              borderRadius: scale.rowGap / 4,
              backgroundColor: serieColour(one.hue),
            }}
          />
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: scale.bodySize, color: PALETTE.tinta, fontWeight: '600' }}
          >
            {one.name}
            {one.isGeneric ? (
              <Text style={{ fontWeight: '400', color: PALETTE.tintaApagada }}>
                {`  ${ES.costs.generic}`}
              </Text>
            ) : null}
          </Text>
          {/* ⚠️ THE LATEST PRICE BESIDE THE NAME, WHICH IS THE ONE NUMBER THE
              BRIEF'S OPTION (a) WOULD HAVE BEEN ON ITS OWN. He took the series
              instead — and *what are they charging me now* is still the question
              she opens this screen with, so it is answered in words next to the
              line rather than left to be read off a chart. */}
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta, fontVariant: ['tabular-nums'] }}>
            {reading === null
              ? (one.latest?.price ?? ES.catalog.noPrice)
              : priceLabel(reading.prices.get(one.providerId) ?? null, reading.priceUnit)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The collapsible matrix: *"As a collapsable you can get the matrix that shows
 * this data."*
 *
 * ⚠️⚠️ IT IS SHUT BY DEFAULT AND THAT IS HIS WORD — *a collapsable* — rather than
 * a guess about screen space. The chart is what the screen is for; the table is
 * what somebody reaches for when they distrust the chart or want to read a
 * figure off it exactly.
 *
 * ⚠️ IT SCROLLS SIDEWAYS AND THE PROVIDER COLUMN DOES NOT PIN, which is a named
 * limitation rather than an oversight: a pinned first column in React Native is
 * two synchronised `ScrollView`s, and a shop with more than a handful of
 * delivery days has a follow-up rather than a clever component. **What a phone
 * does with twelve columns is an `R9` reading**, and the PDF is the answer for a
 * long history.
 *
 * ⚠️⚠️ AND WHAT THE PDF DOES WITH TWELVE COLUMNS IS NOT WHAT THIS COMMENT SAID
 * UNTIL 2026-09-25 — *"the whole table is laid out at A4 width"* was wrong twice.
 * `expo-print` renders at **612 × 792, US Letter at 72 PPI**, which is 564 px of
 * page after the margins; and `5g-iii-a` cuts the days into blocks of six so no
 * table runs off it. **Two media, two answers, one set of rows** — a phone
 * scrolls sideways because it can, and paper repeats the stub because it
 * cannot.
 *
 * ⚠️ A CELL WITH NO DELIVERY IS C3.12's DASH AND NEVER `$0.00`. *A gap is not a
 * zero* — `0032` says it about a day spine, `0008` says it about an absent
 * pairing, and a `$0.00` in this grid would say a supplier gave the shop
 * something free.
 *
 * ⚠️ NO ANIMATION ON THE OPEN. §2.11 allows one staggered entrance per screen
 * and a height animation is a LAYOUT animation, which that row bans outright for
 * the two low-end Androids in C1.1.
 */
function Tabla({ costs }: { costs: Costs }) {
  const { scale } = useDensity();
  const [open, setOpen] = useState(false);
  const rows = matrixOf(costs);

  return (
    <View style={{ gap: scale.rowGap }}>
      <BotonLleno
        hug
        label={open ? ES.costs.hideMatrix : ES.costs.showMatrix}
        onPress={() => setOpen(!open)}
      />

      {!open ? null : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={{
            borderWidth: 1,
            borderColor: PALETTE.linea,
            borderRadius: scale.space / 2,
            backgroundColor: PALETTE.superficie,
          }}
        >
          <View>
            <View style={{ flexDirection: 'row', backgroundColor: PALETTE.banda }}>
              <Celda text={ES.costs.providerColumn} head />
              {costs.days.map((day) => (
                <Celda key={day} text={day} head />
              ))}
            </View>
            {rows.map((row) => (
              <View key={row.providerId}>
                <Separador />
                <View style={{ flexDirection: 'row' }}>
                  <Celda text={row.name} />
                  {row.cells.map((cell) => (
                    <Celda key={cell.day} text={cell.price ?? ES.catalog.noPrice} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/** One cell. ⚠️ A fixed width so the columns line up across rows without a grid. */
function Celda({ text, head = false }: { text: string; head?: boolean }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        minWidth: scale.tapTarget * 2,
        minHeight: scale.rowHeight,
        justifyContent: 'center',
        paddingHorizontal: scale.rowGap,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: scale.bodySize,
          fontWeight: head ? '600' : '400',
          color: PALETTE.tinta,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

/**
 * The export: *"You can share the 'view' as a PDF."*
 *
 * ⚠️⚠️ IT IS THE FIRST THING THIS APP HAS EVER PRODUCED THAT LEAVES THE PHONE AS
 * A FILE, and the document itself is built by `@/export/costsPdf` — which is
 * PURE, returns a string, and is read by `app/test/costs-pdf.test.ts`. That
 * split is what moves most of a *rendering on a device* deliverable back inside
 * this repository's reach; what is left outside is two native calls in
 * `@/export/share`.
 *
 * ⚠️ THE THREE OUTCOMES ARE THREE DIFFERENT SENTENCES BECAUSE SHE CAN ACT ON
 * THEM DIFFERENTLY. *Shared* says nothing at all — the share sheet was the
 * feedback. *Unavailable* is permanent and points her at the table below.
 * *Failed* is worth another tap. ⚠️ **No `error_code` and no *avísanos***: §2.8
 * fences the dead-letter receipt to Inicio, and this is not a failed write —
 * nothing was lost and the rows are still on the screen behind the message.
 *
 * ⚠️ THE CONTROL IS DISABLED WHILE THE FILE IS BEING MADE AND SAYS SO. On a
 * low-end Android a web view rendering a US Letter page is not instant, and a second
 * tap would start a second render.
 *
 * ⚠️ `new Date()` IS READ HERE AND PASSED IN, which is `R3` observed at the
 * boundary rather than avoided: `costsHtml` takes the date as an argument so the
 * suite can hold it still, and the one caller that needs today's date is a
 * handler on a screen no suite loads.
 */
function Compartir({ costs, title }: { costs: Costs; title: string }) {
  const { scale } = useDensity();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);

  const go = async () => {
    setBusy(true);
    setOutcome(null);
    const madeOn = new Date().toISOString().slice(0, 10);
    const result = await shareHtmlAsPdf(costsHtml(costs, title, madeOn), ES.costs.fileTitle);
    setOutcome(result);
    setBusy(false);
  };

  return (
    <View style={{ gap: scale.rowGap }}>
      <BotonLleno
        hug
        busy={busy}
        label={busy ? ES.costs.sharing : ES.costs.share}
        onPress={go}
      />
      {outcome === 'unavailable' ? <Nota line={ES.costs.cannotShare} /> : null}
      {outcome === 'failed' ? <Nota line={ES.costs.shareFailed} /> : null}
    </View>
  );
}

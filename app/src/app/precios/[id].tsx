import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog, usePrices } from '@/api/hooks';
import {
  SIDES,
  WINDOWS,
  plottedPrices,
  pricesLine,
  type Prices,
  type Side,
  type SidePrices,
} from '@/api/prices';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE, serieColour } from '@/theme/palette';
import { Grafica } from '@/ui/Grafica';
import { Vacio } from '@/ui/Vacio';

// ============================================================================
// PRECIOS — HOW ONE PRODUCT'S PRICES HAVE MOVED, BOTH SIDES OF THE LEDGER. Plan
// task `7b`, ADR-035 §2.9's second question.
//
// ⚠️ REACHED BY TAPPING A PRODUCT ON NÚMEROS — a row of the per-product table —
// and by nothing else. The forty-first ruling (2026-09-28): *one chart, both
// lines with IVA*. So the gap between the lines is sale price less purchase
// price per unit, tax on both — and the same delivery reads ~16% higher here
// than on `Costos`, which shows the invoice net. The screen says so in words.
//
// ⚠️ THE COLOURS ARE `SERIE`'s FIRST TWO, AND THE WORD IS ALWAYS BESIDE THEM
// (§2.11: never colour alone). Venta is hue 0 and Compra hue 1 on every product,
// so the colours mean the same thing every time this screen opens.
//
// ⚠️ THE CARDS CARRY NO COLOUR AT ALL: a rising sale price is good news and a
// rising purchase price is bad news, so green-for-up would be wrong for one side
// of every pair. Words — *Sube*, *Baja*, *Sin cambio* — or C3.12's dash, which a
// sentence under the cards explains.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11
// ----------------------------------------------------------------------------
// Whether two lines on a 160 pt plot read as a margin or as a tangle; whether
// six cards of mostly dashes in the pilot's first months read as *not yet* or as
// *broken*; whether *con IVA* on a purchase price confuses someone who has just
// typed the net into Comprar. **The instrument is the owner's phone.** Every
// figure, window, percentage and point position is in `@/api/prices`, where
// `app/test/api-prices.test.ts` reads it, and `docs/checks/7b-prices-contract.sh`
// puts the read in front of a real database.
// ============================================================================

export default function Precios() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const prices = usePrices(id ?? null);

  // The product's name comes off the catalog this phone already holds — the
  // read `usePrices` leans on too, so the banda costs no request of its own.
  const { entries } = useCatalog();
  const name = entries.find((one) => one.id === id)?.name ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda title={name === '' ? ES.prices.title : name} />
      <ScrollView
        contentContainerStyle={{
          padding: scale.space,
          gap: scale.space,
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
      >
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {ES.prices.subtitle}
        </Text>
        <Cuerpo prices={prices} />
      </ScrollView>
    </View>
  );
}

/** The product's own name, and the way back to Números. */
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
      <Text
        numberOfLines={1}
        style={{ flex: 1, fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}
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
          {ES.prices.back}
        </Text>
      </Pressable>
    </View>
  );
}

/** The line's colour — Venta first, Compra second, on every product. */
function colourOf(side: Side): string {
  return serieColour(SIDES.indexOf(side));
}

/**
 * Which of the three states this screen is in, drawn.
 *
 * ⚠️ `unknown` IS A SPINNER AND NOT AN EMPTY STATE — *not back yet* must never
 * read as *never sold*, on a phone that is offline half the day.
 */
function Cuerpo({ prices }: { prices: ReturnType<typeof usePrices> }) {
  const { scale } = useDensity();
  const line = pricesLine(prices.state, prices.failed);

  if (prices.state === 'unknown' || prices.failed !== null) {
    return (
      <View style={{ padding: scale.space * 2, alignItems: 'center', gap: scale.rowGap }}>
        <ActivityIndicator color={PALETTE.accion} />
        {line === '' ? null : (
          <Text
            style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}
          >
            {line}
          </Text>
        )}
      </View>
    );
  }

  if (prices.state === 'nothing') return <Vacio line={line} />;

  const dots = plottedPrices(prices);
  return (
    <View style={{ gap: scale.space }}>
      <View style={{ gap: scale.rowGap / 2 }}>
        <Grafica
          lines={SIDES.map((side) => ({ key: side, dots: dots[side], colour: colourOf(side) }))}
          highLabel={prices.highLabel}
          lowLabel={prices.lowLabel}
        />
        {prices.fromLabel === '' ? null : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: scale.tabLabelSize, color: PALETTE.tintaApagada }}>
              {ES.prices.from(prices.fromLabel)}
            </Text>
            <Text style={{ fontSize: scale.tabLabelSize, color: PALETTE.tintaApagada }}>
              {ES.prices.to(prices.toLabel)}
            </Text>
          </View>
        )}
      </View>
      <View style={{ gap: scale.rowGap / 2 }}>
        {SIDES.map((side) => (
          <Leyenda key={side} one={prices.sides[side]} />
        ))}
      </View>
      <Tarjetas prices={prices} />
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
        {ES.prices.dash}
      </Text>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
        {ES.prices.costsNote}
      </Text>
    </View>
  );
}

/** A small square of the line's colour — the swatch `Costos`' legend draws. */
function Muestra({ side }: { side: Side }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        width: scale.rowGap,
        height: scale.rowGap,
        borderRadius: scale.rowGap / 4,
        backgroundColor: colourOf(side),
      }}
    />
  );
}

/**
 * One side's word, its latest price and the day it was charged.
 *
 * ⚠️ THE LATEST PRICE IS SAID IN WORDS beside the line — *what am I charging
 * now* is the question somebody opens this with, and it should not be read off
 * a chart.
 */
function Leyenda({ one }: { one: SidePrices }) {
  const { scale } = useDensity();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap }}>
      <Muestra side={one.side} />
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
        {ES.prices.side[one.side]}
      </Text>
      {one.latest === null ? (
        <Text style={{ flex: 1, fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {ES.prices.noSide[one.side]}
        </Text>
      ) : (
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
            {one.latestPrice}
          </Text>
          <Text style={{ fontSize: scale.tabLabelSize, color: PALETTE.tintaApagada }}>
            {ES.prices.lastOn(one.latestDay)}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Área 9's six cards — este mes, 1, 3, 6 y 9 meses, en el año — each with both
 * sides' change. Two to a row at *Letra normal*; they wrap at *Letra grande*.
 */
function Tarjetas({ prices }: { prices: Prices }) {
  const { scale } = useDensity();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap }}>
      {WINDOWS.map((window) => (
        <View
          key={window}
          style={{
            flexGrow: 1,
            flexBasis: scale.space * 9,
            padding: scale.rowGap,
            gap: scale.rowGap / 2,
            backgroundColor: PALETTE.superficie,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            borderRadius: scale.space / 2,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
            {ES.prices.window[window]}
          </Text>
          {SIDES.map((side) => (
            <View
              key={side}
              style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap / 2 }}
            >
              <Muestra side={side} />
              <Text style={{ fontSize: scale.tabLabelSize, color: PALETTE.tintaApagada }}>
                {ES.prices.side[side]}
              </Text>
              <Text
                style={{
                  flex: 1,
                  textAlign: 'right',
                  fontSize: scale.bodySize,
                  fontWeight: '600',
                  color: PALETTE.tinta,
                }}
              >
                {prices.sides[side].changes[window]}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

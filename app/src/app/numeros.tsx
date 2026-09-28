import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSales } from '@/api/hooks';
import {
  GROUPINGS,
  PERIODS,
  barsOf,
  bucketOf,
  periodTitle,
  reportOf,
  salesLine,
  type Bar,
  type Grouping,
  type Period,
  type Report,
} from '@/api/sales';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { Interruptor } from '@/ui/Interruptor';
import { Separador } from '@/ui/Separador';
import { Vacio } from '@/ui/Vacio';

// ============================================================================
// NÚMEROS — WHAT AM I SELLING, AND WHAT DID IT BRING IN. Plan task `7a`, the
// first of ADR-035 §2.9's three questions.
//
// Área 9, 2026-09-14, in the owner's words: *"charts and tables about their
// transactions … it doesn't have to be very robust nor sophisticated for
// now."* So: a Día / Semana / Mes switch, a bar per period of gross revenue, and
// under it the table for the period tapped — per product or per family, the
// quantity in each product's own unit and what it brought in.
//
// ⚠️ EVERY ROLE REACHES IT — RULED 2026-09-28, the §2.7 matrix's reading over
// §2.8's *"Manager+"*. A cashier sees her own stores' sales because RLS scopes
// the view, and this screen asks nothing about who is holding the phone.
//
// ⚠️ STATE IS THREE KEYS AND NOTHING ELSE: the period, the grouping, and which
// bar is picked. The bar is `null` until tapped, meaning *the period happening
// now*, so a screen left open over midnight moves with the day instead of
// staying on yesterday — and switching the period forgets the pick, because a
// week's first day is not a month's.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11
// ----------------------------------------------------------------------------
// Whether fourteen bars across a phone read as a fortnight or as a comb; whether
// the tapped bar is findable with a thumb; whether *Semana* is the right switch
// to open on; whether a table of forty products wants a *ver más*. **The
// instrument is the owner's phone.** Every figure, every bucket, every unit and
// every sentence is in `@/api/sales`, where `app/test/api-sales.test.ts` reads
// them, and `docs/checks/7a-sales-contract.sh` puts the read in front of a real
// database.
// ============================================================================

/** How tall the bars are, before density. ⚠️ `scale.space` multiples, never a literal (`R6`). */
const PLOT_ROWS = 7;

export default function Numeros() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const { sales, failed, today, entries, factors } = useSales();

  // ⚠️ `semana` FIRST, AND IT IS A CHOICE: Inicio already carries today's
  // takings, so *Día* opening here would repeat the one number the shopkeeper
  // saw on the way in. A week is the shortest period Inicio cannot answer.
  const [period, setPeriod] = useState<Period>('semana');
  const [grouping, setGrouping] = useState<Grouping>('producto');
  const [picked, setPicked] = useState<string | null>(null);

  const start = picked ?? bucketOf(today, period);
  const line = salesLine(sales.state, failed);

  function pickPeriod(next: Period): void {
    setPeriod(next);
    setPicked(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda />
      <ScrollView
        contentContainerStyle={{
          padding: scale.space,
          gap: scale.space,
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
      >
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {ES.numbers.subtitle}
        </Text>
        <Interruptor
          options={PERIODS}
          labels={ES.numbers.period}
          picked={period}
          onPick={pickPeriod}
        />
        {sales.state === 'unknown' && failed === null ? (
          <View style={{ padding: scale.space * 2, alignItems: 'center' }}>
            <ActivityIndicator color={PALETTE.accion} />
          </View>
        ) : line !== '' ? (
          <Vacio line={line} />
        ) : (
          <>
            <Barras
              bars={barsOf(sales.days, period, today)}
              picked={start}
              onPick={setPicked}
            />
            <Tabla
              title={periodTitle(start, period, today)}
              report={reportOf(sales.days, period, start, grouping, entries, factors)}
              grouping={grouping}
              onGroup={setGrouping}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** The module's word, and the way back to wherever you came from. */
function Banda() {
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
        {ES.numbers.title}
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
          {ES.numbers.back}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * One bar per period, oldest on the left, and a tap picks the period the table
 * describes.
 *
 * ⚠️ THE PICKED BAR IS SAID THREE WAYS — a darker fill, a bold label and
 * `accessibilityState` — never by colour alone (§2.11). ⚠️ THE BARS ARE FLEX
 * COLUMNS WITH A HEIGHT IN POINTS, so nothing is measured and nothing leaps on
 * first paint — the trap `costos/[id].tsx`'s header records about its plot.
 * ⚠️ A PERIOD WITH NO SALES STILL HAS A BAR TO TAP — a sliver of `linea` — so
 * *nothing that day* is something she can pick and read rather than a gap.
 */
function Barras({
  bars,
  picked,
  onPick,
}: {
  bars: readonly Bar[];
  picked: string;
  onPick: (start: string) => void;
}) {
  const { scale } = useDensity();
  const height = scale.space * PLOT_ROWS;
  return (
    <View style={{ flexDirection: 'row', gap: scale.rowGap / 2, alignItems: 'flex-end' }}>
      {bars.map((bar) => {
        const on = bar.start === picked;
        return (
          <Pressable
            key={bar.start}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={bar.label}
            onPress={() => onPick(bar.start)}
            style={{ flex: 1, alignItems: 'stretch', gap: scale.rowGap / 2 }}
          >
            <View style={{ height, justifyContent: 'flex-end' }}>
              <View
                style={{
                  height: Math.max(1, Math.round(bar.share * height)),
                  borderRadius: scale.rowGap / 2,
                  backgroundColor:
                    bar.share === 0 ? PALETTE.linea : on ? PALETTE.accion : PALETTE.accionSuave,
                  borderWidth: on ? 0 : 1,
                  borderColor: PALETTE.linea,
                }}
              />
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontSize: scale.tabLabelSize,
                textAlign: 'center',
                fontWeight: on ? '700' : '400',
                color: on ? PALETTE.accion : PALETTE.tintaApagada,
              }}
            >
              {bar.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The period's total, and what made it up.
 *
 * ⚠️ THE TOTAL IS A HEADER AND NOT THE PRODUCT — §2.9: *"Totals remain as a
 * header strip for reassurance; they are not the product."* The rows are.
 */
function Tabla({
  title,
  report,
  grouping,
  onGroup,
}: {
  title: string;
  report: Report;
  grouping: Grouping;
  onGroup: (grouping: Grouping) => void;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap }}>
      <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}>
        {title}
      </Text>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {ES.numbers.total}
        </Text>
        <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: PALETTE.tinta }}>
          {report.total}
        </Text>
      </View>
      <Interruptor
        options={GROUPINGS}
        labels={ES.numbers.grouping}
        picked={grouping}
        onPick={onGroup}
      />
      {report.rows.length === 0 ? (
        <Vacio line={ES.numbers.emptyPeriod} />
      ) : (
        <View
          style={{
            backgroundColor: PALETTE.superficie,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            borderRadius: scale.space / 2,
          }}
        >
          {report.rows.map((row, index) => (
            <View key={row.key}>
              {index === 0 ? null : <Separador />}
              <View
                style={{
                  minHeight: scale.rowHeight,
                  paddingHorizontal: scale.space,
                  paddingVertical: scale.rowGap,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scale.space,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
                    {row.name}
                  </Text>
                  <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
                    {row.quantity}
                  </Text>
                </View>
                <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
                  {row.amount}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

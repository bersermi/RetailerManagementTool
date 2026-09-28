import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMonthExport, useSales } from '@/api/hooks';
import {
  exportFileName,
  exportLine,
  isLatestMonth,
  monthOf,
  monthShift,
  monthTitle,
} from '@/api/monthExport';
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
  type ReportRow,
} from '@/api/sales';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { monthCsv, monthHtml } from '@/export/monthFile';
import { shareCsv, shareHtmlAsPdf, type ShareOutcome } from '@/export/share';
import { Boton } from '@/ui/Boton';
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
              opens={(key) => grouping === 'producto' && entries.some((one) => one.id === key)}
            />
          </>
        )}
        <Descarga today={today} />
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
  opens,
}: {
  title: string;
  report: Report;
  grouping: Grouping;
  onGroup: (grouping: Grouping) => void;
  /** Whether a row is a door into `Precios` — see `Fila`. */
  opens: (key: string) => boolean;
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
              <Fila row={row} opens={opens(row.key)} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * One row of the table — and, per product, the door into `Precios` (`7b`).
 *
 * ⚠️⚠️ A DOOR ONLY WHERE THE ANSWER EXISTS. Per FAMILY there is no price to
 * show: a family mixes kilos and pieces, and `0032`'s own comment calls a price
 * across them *"money over a meaningless total"*. And a product the catalog no
 * longer lists has no price UNIT on this phone, so `Precios` could not say
 * *por kilo* or *por pieza* — its sales still count here, and its row is simply
 * not a door. ⚠️ So the row is drawn identically either way except for the
 * chevron, which is the one thing that says *this opens*.
 */
function Fila({ row, opens }: { row: ReportRow; opens: boolean }) {
  const { scale } = useDensity();
  const body = (
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
      {opens ? (
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {ES.numbers.opens}
        </Text>
      ) : null}
    </View>
  );
  if (!opens) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={ES.numbers.opensHint}
      onPress={() => router.push({ pathname: '/precios/[id]', params: { id: row.key } })}
    >
      {body}
    </Pressable>
  );
}

/**
 * THE MONTH, AS A FILE — plan task `7d`. A month picker of its own and two
 * buttons, one per format.
 *
 * ⚠️ NOT DRAWN AT ALL FOR A CASHIER (ruled 2026-09-28): `0033` hands her zero
 * rows, and a control that can only produce an empty file is a control she
 * should not be shown. `allowed` is `canExport` in `@/api/monthExport`.
 *
 * ⚠️ OUTSIDE THE SALES STATE, ON PURPOSE. A shop with no sales in six months can
 * still have deliveries and write-offs to hand over, so the section is drawn
 * whether the chart above it is a spinner, a sentence or bars.
 *
 * ⚠️ THE PICKER STARTS ON THE CURRENT MONTH AND STOPS THERE — a month that has
 * not begun has nothing in it. It is its own state and not the chart's bar,
 * which is the owner's ruling (a separate picker).
 *
 * ⚠️ THE ROWS ARE READ ON THE TAP AND NOT BEFORE — see `useMonthExport`.
 */
function Descarga({ today }: { today: string }) {
  const { scale } = useDensity();
  const { allowed, members, fetch } = useMonthExport();
  const [month, setMonth] = useState(() => monthOf(today));
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null);
  const [note, setNote] = useState('');

  if (!allowed) return null;
  const latest = isLatestMonth(month, today);

  function step(by: number): void {
    if (busy !== null) return;
    setMonth((current) => monthShift(current, by));
    setNote('');
  }

  async function go(format: 'csv' | 'pdf'): Promise<void> {
    if (busy !== null) return;
    setBusy(format);
    setNote('');
    const got = await fetch(month);
    const line = exportLine(got.state, got.failed, month);
    if (line !== '') {
      setNote(line);
      setBusy(null);
      return;
    }
    // ⚠️ `new Date()` IS READ HERE AND PASSED IN — `R3` at the boundary, the
    // arrangement `Compartir` on `costos/[id].tsx` uses.
    const madeOn = new Date().toISOString().slice(0, 10);
    const outcome: ShareOutcome =
      format === 'csv'
        ? await shareCsv(
            monthCsv(got.lines, members),
            exportFileName(month, 'csv'),
            ES.monthExport.shareTitle,
          )
        : await shareHtmlAsPdf(monthHtml(got.lines, month, madeOn), ES.monthExport.shareTitle);
    if (outcome === 'unavailable') setNote(ES.monthExport.cannotShare);
    if (outcome === 'failed') setNote(ES.monthExport.failed);
    setBusy(null);
  }

  return (
    <View style={{ gap: scale.rowGap, marginTop: scale.space }}>
      <Separador />
      <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}>
        {ES.monthExport.heading}
      </Text>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
        {ES.monthExport.subtitle}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.space }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.monthExport.previous}
          onPress={() => step(-1)}
          style={{ minHeight: scale.tapTarget, minWidth: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.accion }}>
            {ES.monthExport.previousMark}
          </Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: scale.bodySize,
            fontWeight: '700',
            color: PALETTE.tinta,
          }}
        >
          {monthTitle(month)}
        </Text>
        {/* ⚠️ The forward mark is DRAWN at the latest month, and muted, so the row
            does not shift sideways when it appears — but it does nothing. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.monthExport.next}
          accessibilityState={{ disabled: latest }}
          disabled={latest}
          onPress={() => step(1)}
          style={{ minHeight: scale.tapTarget, minWidth: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text
            style={{
              fontSize: scale.titleSize,
              fontWeight: '700',
              color: latest ? PALETTE.linea : PALETTE.accion,
            }}
          >
            {ES.monthExport.nextMark}
          </Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: scale.rowGap }}>
        <Boton
          inRow
          label={busy === 'csv' ? ES.monthExport.preparing : ES.monthExport.csv}
          tone={busy === null ? PALETTE.accion : PALETTE.tintaApagada}
          onPress={() => void go('csv')}
        />
        <Boton
          inRow
          label={busy === 'pdf' ? ES.monthExport.preparing : ES.monthExport.pdf}
          tone={busy === null ? PALETTE.accion : PALETTE.tintaApagada}
          onPress={() => void go('pdf')}
        />
      </View>
      {note === '' ? null : <Vacio line={note} />}
    </View>
  );
}

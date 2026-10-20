import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shownAmount } from '@/api/documents';
import { useMonthExport, useMonthReport, usePurchasePrices, useSaleHours, useSales } from '@/api/hooks';
import {
  FIRST_WEEK_DAYS,
  bestDay,
  compareLine,
  dayWords,
  hoursLine,
  monthSales,
  purchasesLine,
  quincenaLine,
  quincenaOf,
  quincenaWay,
  quincenaWhen,
  risesOf,
  shopAge,
  wasteAmount,
  yearOf,
  type BestDay,
  type Hours,
  type Quincena,
  type Rises,
  type Ticket,
  type Year,
} from '@/api/month';
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
  SALES_MONTHS,
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
import { reasonLabel } from '@/api/waste';
import { useBackStaysHere } from '@/navigation/salida';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { TITULO } from '@/theme/letra';
import { monthCsv, monthHtml } from '@/export/monthFile';
import { shareCsv, shareHtmlAsPdf, type ShareOutcome } from '@/export/share';
import { Boton } from '@/ui/Boton';
import { Interruptor } from '@/ui/Interruptor';
import { Rotulo } from '@/ui/Rotulo';
import { Separador } from '@/ui/Separador';
import { Vacio } from '@/ui/Vacio';

// ============================================================================
// NÚMEROS — WHAT AM I SELLING, AND WHAT DID IT BRING IN. Plan task `7a`, the
// first of ADR-035 §2.9's three questions — and since `8g` (2026-10-20) a
// CENTRE that says it first.
//
// Área 9, 2026-09-14, in the owner's words: *"charts and tables about their
// transactions … it doesn't have to be very robust nor sophisticated for
// now."* And 2026-10-20, over the canvas: *"numbers that are clean and helpful
// yes, but also appealing and that encourage users to see their numbers from
// the very first moment … the basics for them to check their monthly report of
// sales, purchases and waste but also something to nourish the curiosity"*.
//
// So the screen opens on the CENTRE: *Tu mes* in the three counters' colours
// (what was sold, bought and thrown away, against last month in pesos and
// words), a new shop's first week, *Descubre* (what her own numbers say, with
// what it is for), and what opens as her history grows. *Vendiste* opens the
// sales page that was the whole screen until then — the period switch, a bar
// per period, the table — unchanged. Every figure is in `@/api/month` and
// `@/api/sales`; this file draws.
//
// ⚠️ EVERY ROLE REACHES IT — RULED 2026-09-28, the §2.7 matrix's reading over
// §2.8's *"Manager+"*, and again 2026-10-20: the same Números for everyone. RLS
// scopes what a cashier reads; nothing here asks who is holding the phone.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11
// ----------------------------------------------------------------------------
// Whether the three colours read as three answers or as decoration; whether a
// card that slides sideways is found by a thumb; whether *De 7 a 9 de la noche*
// feels like news or like a lecture. **The instrument is the owner's phone.**
// `app/test/numeros-mes.test.ts` reads every figure and every sentence, and
// `docs/checks/8g-numeros-contract.sh` puts the new reads in front of a real
// database.
// ============================================================================

/** How tall the bars are, before density. ⚠️ `scale.space` multiples, never a literal (`R6`). */
const PLOT_ROWS = 7;

/** A discovery card's bars, shorter than the sales page's. */
const CARD_PLOT_ROWS = 5;

type Pagina = 'centro' | 'ventas';

export default function Numeros() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const { sales, failed, today, entries, factors } = useSales();

  const [pagina, setPagina] = useState<Pagina>('centro');
  const [month, setMonth] = useState(() => monthOf(today));
  // ⚠️ `semana` FIRST on the sales page, and it is a choice: Inicio already
  // carries today's takings. Opened from *Vendiste*, it opens on THAT month.
  const [period, setPeriod] = useState<Period>('semana');
  const [grouping, setGrouping] = useState<Grouping>('producto');
  const [picked, setPicked] = useState<string | null>(null);

  // ⚠️ ANDROID'S BACK BUTTON (AND THE iPHONE'S SWIPE) LEAVE THE SALES PAGE FOR
  // THE CENTRE, as the band's *Volver* does. ⚠️⚠️ `usePreventRemove` AND NOT A
  // `BackHandler` since `8g`'s review (2026-10-20): a handler stayed armed while
  // *Precios* sat on top, so back on *Precios* did nothing visible — it reset
  // this page underneath. This only intercepts THIS screen being closed.
  useBackStaysHere(pagina === 'ventas', () => setPagina('centro'));

  function openSales(): void {
    setPeriod('mes');
    setPicked(month);
    setPagina('ventas');
  }

  function pickPeriod(next: Period): void {
    setPeriod(next);
    setPicked(null);
  }

  const start = picked ?? bucketOf(today, period);
  const line = salesLine(sales.state, failed);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda
        title={pagina === 'ventas' ? ES.numbers.salesTitle : ES.numbers.title}
        onBack={pagina === 'ventas' ? () => setPagina('centro') : () => router.back()}
      />
      <ScrollView
        contentContainerStyle={{
          padding: scale.space,
          gap: scale.space,
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
      >
        {pagina === 'centro' ? (
          <Centro
            month={month}
            onMonth={setMonth}
            today={today}
            ready={sales.state !== 'unknown' || failed !== null}
            line={line}
            days={sales.days}
            entries={entries}
            factors={factors}
            onSales={openSales}
          />
        ) : (
          <>
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * THE CENTRE — the month, a new shop's first week, the discoveries, and what is
 * still to open. ⚠️ Its own component so the month's reads start only when it
 * is on screen, not while the sales page is.
 */
function Centro({
  month,
  onMonth,
  today,
  ready,
  line,
  days,
  entries,
  factors,
  onSales,
}: {
  month: string;
  onMonth: (month: string) => void;
  today: string;
  ready: boolean;
  line: string;
  days: Parameters<typeof monthSales>[0];
  entries: Parameters<typeof risesOf>[1];
  factors: Parameters<typeof risesOf>[2];
  onSales: () => void;
}) {
  const { scale } = useDensity();
  const age = shopAge(days, today);
  const current = isLatestMonth(month, today);
  const { hours, ticket } = useSaleHours();
  const day = bestDay(days, today);
  const quincena = quincenaOf(days, today);
  const { rows: bought } = usePurchasePrices();
  const rises = risesOf(bought, entries, factors);
  const year = yearOf(days, today);
  // ⚠️ ONE ORDER FOR BOTH LISTS — what opens first is drawn first, so a card
  // moves from *Se abren pronto* to *Descubre* without changing its place.
  const discoveries: React.ReactNode[] = [];
  const locked: { key: string; title: string; when: string; have: number; need: number }[] = [];
  if (hours !== null && !hours.locked) discoveries.push(<Horas key="hours" hours={hours} />);
  else if (hours !== null) {
    locked.push({ key: 'hours', title: ES.numbers.pronto.hours, when: ES.numbers.pronto.hoursWhen(hours.need - hours.have), ...hours });
  }
  if (ticket !== null && !ticket.locked) discoveries.push(<Cliente key="ticket" ticket={ticket} />);
  else if (ticket !== null) {
    locked.push({ key: 'ticket', title: ES.numbers.pronto.ticket, when: ES.numbers.pronto.hoursWhen(ticket.need - ticket.have), ...ticket });
  }
  if (day !== null && !day.locked) discoveries.push(<MejorDia key="day" day={day} />);
  else if (day !== null) {
    locked.push({ key: 'day', title: ES.numbers.pronto.day, when: ES.numbers.pronto.dayWhen(day.need - day.have), ...day });
  }
  if (!quincena.locked) discoveries.push(<EfectoQuincena key="quincena" quincena={quincena} />);
  else if (age !== null) {
    locked.push({ key: 'quincena', title: ES.numbers.pronto.quincena, when: quincenaWhen(quincena, today), ...quincena });
  }
  if (rises !== null && !rises.locked) discoveries.push(<Subio key="rises" rises={rises} />);
  else if (rises !== null) {
    locked.push({ key: 'rises', title: ES.numbers.pronto.rises, when: ES.numbers.pronto.risesWhen(rises.need - rises.have), ...rises });
  }
  if (!year.locked) discoveries.push(<Cuadritos key="year" year={year} />);
  else if (age !== null) {
    locked.push({ key: 'year', title: ES.numbers.pronto.year, when: ES.numbers.pronto.dayWhen(year.need - year.have), ...year });
  }

  return (
    <View style={{ gap: scale.space }}>
      <MesNav month={month} today={today} onMonth={onMonth} />
      {current && age !== null && age <= FIRST_WEEK_DAYS ? <PrimeraSemana age={age} /> : null}
      <TuMes month={month} today={today} ready={ready} line={line} days={days} onSales={onSales} />
      {discoveries.length === 0 ? null : <Descubre>{discoveries}</Descubre>}
      {locked.length === 0 ? null : (
        <View style={{ gap: scale.rowGap }}>
          <Rotulo text={ES.numbers.pronto.title} ink={PALETTE.atencion} />
          {locked.map((one) => (
            <Bloqueada key={one.key} title={one.title} when={one.when} have={one.have} need={one.need} />
          ))}
        </View>
      )}
      <Descarga month={month} />
    </View>
  );
}

/** ‹ Octubre 2026 › — six months back, as far as the sales read reaches, and never ahead. */
function MesNav({ month, today, onMonth }: { month: string; today: string; onMonth: (m: string) => void }) {
  const { scale } = useDensity();
  const first = monthShift(monthOf(today), -(SALES_MONTHS - 1));
  const canBack = month > first;
  const canForward = !isLatestMonth(month, today);
  const arrow = (label: string, glyph: string, on: boolean, by: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !on }}
      disabled={!on}
      onPress={() => onMonth(monthShift(month, by))}
      style={{ minHeight: scale.tapTarget, minWidth: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
    >
      <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: on ? PALETTE.accion : PALETTE.linea }}>
        {glyph}
      </Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {arrow(ES.numbers.mes.previousMonth, ES.monthExport.previousMark, canBack, -1)}
      <Text style={{ flex: 1, textAlign: 'center', fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}>
        {monthTitle(month).charAt(0).toUpperCase() + monthTitle(month).slice(1)}
      </Text>
      {arrow(ES.numbers.mes.nextMonth, ES.monthExport.nextMark, canForward, 1)}
    </View>
  );
}

/** ⚠️ `8g`: a new shop's first week — the days with Wera, as seven dots. */
function PrimeraSemana({ age }: { age: number }) {
  const { scale } = useDensity();
  return (
    <Tarjeta>
      <Rotulo text={ES.numbers.firstWeek.title} ink={PALETTE.accion} />
      <Text style={{ fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}>
        {ES.numbers.firstWeek.days(age)}
      </Text>
      <View style={{ flexDirection: 'row', gap: scale.rowGap / 2 }}>
        {Array.from({ length: FIRST_WEEK_DAYS }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: scale.rowGap,
              borderRadius: scale.rowGap / 2,
              backgroundColor: i < age ? PALETTE.accion : PALETTE.accionSuave,
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{ES.numbers.firstWeek.encourage}</Text>
    </Tarjeta>
  );
}

/**
 * TU MES — sold, bought, thrown away, each in its counter's colour.
 *
 * ⚠️ ONLY *VENDISTE* IS A DOOR in round 1: it opens the sales page on this
 * month. A delivery list and a write-off list for a whole month are later rounds;
 * a chevron that opened a seven-day list would be a door to the wrong room.
 */
function TuMes({
  month,
  today,
  ready,
  line,
  days,
  onSales,
}: {
  month: string;
  today: string;
  ready: boolean;
  line: string;
  days: Parameters<typeof monthSales>[0];
  onSales: () => void;
}) {
  const { scale } = useDensity();
  const { purchases, waste, failed } = useMonthReport(month);
  const sold = monthSales(days, month, today);
  const compare = compareLine(sold);
  const down = sold.compare !== null && sold.compare.centavos < 0;
  return (
    <Tarjeta>
      <Rotulo text={ES.numbers.mes.title} />
      <Bloque
        label={ES.numbers.mes.sold}
        ink={PALETTE.accion}
        soft={PALETTE.accionSuave}
        amount={!ready ? null : line !== '' && line !== ES.numbers.nothing ? ES.documents.noFigure : shownAmount(sold.centavos)}
        line={line !== '' && line !== ES.numbers.nothing ? line : compare}
        icon={compare === '' || sold.compare?.centavos === 0 ? null : down ? 'arrow-down' : 'arrow-up'}
        lineInk={down ? PALETTE.tintaApagada : PALETTE.accion}
        onPress={onSales}
      />
      <Bloque
        label={ES.numbers.mes.bought}
        ink={PALETTE.compra}
        soft={PALETTE.compraSuave}
        amount={failed !== null ? ES.documents.noFigure : purchases === null ? null : shownAmount(purchases.centavos)}
        line={failed !== null ? ES.numbers.mes.unreadable : purchases === null ? '' : purchasesLine(purchases)}
        lineInk={PALETTE.compra}
      />
      <Bloque
        label={ES.numbers.mes.thrown}
        ink={PALETTE.desperdicio}
        soft={PALETTE.desperdicioSuave}
        amount={failed !== null ? ES.documents.noFigure : waste === null ? null : wasteAmount(waste)}
        line={
          failed !== null
            ? ES.numbers.mes.unreadable
            : waste === null || waste.topReason === null
              ? ''
              : ES.numbers.mes.topReason(reasonLabel(waste.topReason))
        }
        lineInk={PALETTE.desperdicio}
      />
    </Tarjeta>
  );
}

/** One of the month's three answers. `amount` is `null` while it is being read. */
function Bloque({
  label,
  ink,
  soft,
  amount,
  line,
  lineInk,
  icon = null,
  onPress,
}: {
  label: string;
  ink: string;
  soft: string;
  amount: string | null;
  line: string;
  lineInk: string;
  icon?: 'arrow-up' | 'arrow-down' | null;
  onPress?: () => void;
}) {
  const { scale } = useDensity();
  const body = (
    <View
      style={{
        backgroundColor: soft,
        borderRadius: scale.space * 0.75,
        paddingHorizontal: scale.space,
        paddingVertical: scale.rowGap,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.space,
      }}
    >
      <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
        <Rotulo text={label} ink={ink} />
        {amount === null ? (
          <ActivityIndicator color={ink} style={{ alignSelf: 'flex-start' }} />
        ) : (
          <Text style={{ fontSize: scale.moneySize * 1.3, ...TITULO, color: PALETTE.tinta }}>{amount}</Text>
        )}
        {line === '' ? null : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap / 4 }}>
            {icon === null ? null : <MaterialCommunityIcons name={icon} size={scale.iconSize * 0.7} color={lineInk} />}
            <Text style={{ flex: 1, fontSize: scale.smallSize, fontWeight: '600', color: lineInk }}>{line}</Text>
          </View>
        )}
      </View>
      {onPress === undefined ? null : (
        <MaterialCommunityIcons name="chevron-right" size={scale.iconSize} color={ink} />
      )}
    </View>
  );
  if (onPress === undefined) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityHint={ES.numbers.mes.opensHint} onPress={onPress}>
      {body}
    </Pressable>
  );
}

/**
 * DESCUBRE — one card at a time, slid sideways, the next one peeking so a thumb
 * knows there is more.
 */
function Descubre({ children }: { children: React.ReactNode }) {
  const { scale } = useDensity();
  const width = useCardWidth();
  return (
    <View style={{ gap: scale.rowGap }}>
      <Rotulo text={ES.numbers.descubre.title} />
      {/* ⚠️ IT SNAPS TO A CARD, so a swipe lands on one whole card and never
          leaves the next half-read off the edge — measured on the emulator. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={width + scale.rowGap}
        snapToAlignment="start"
        disableIntervalMomentum
        // ⚠️ EACH CARD KEEPS ITS OWN HEIGHT: stretched to the tallest (round 3's
        // list of what went up), the short ones read as half-empty.
        contentContainerStyle={{ gap: scale.rowGap, alignItems: 'flex-start' }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** A discovery's width: the screen less its margins and a peek of the next card. */
function useCardWidth(): number {
  const { scale } = useDensity();
  const { width } = useWindowDimensions();
  return width - scale.space * 4;
}

/** A discovery's frame. */
function Hallazgo({ title, big, children, tip }: { title: string; big: string; children: React.ReactNode; tip: string }) {
  const { scale } = useDensity();
  const width = useCardWidth();
  return (
    <View
      style={{
        width,
        backgroundColor: PALETTE.superficie,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        borderRadius: scale.space * 0.875,
        padding: scale.space,
        gap: scale.rowGap,
      }}
    >
      <Rotulo text={title} ink={PALETTE.accion} />
      <Text style={{ fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}>{big}</Text>
      {children}
      <View style={{ flexDirection: 'row', gap: scale.rowGap / 2, borderTopWidth: 1, borderTopColor: PALETTE.linea, paddingTop: scale.rowGap }}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={scale.iconSize * 0.8} color={PALETTE.accion} />
        <Text style={{ flex: 1, fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{tip}</Text>
      </View>
    </View>
  );
}

/** ¿A qué hora vendes más? — the hours that sold, the best two darker. */
function Horas({ hours }: { hours: Hours }) {
  const { scale } = useDensity();
  const most = Math.max(1, ...hours.bars.map((b) => b.centavos));
  return (
    <Hallazgo title={ES.numbers.descubre.hoursTitle} big={hoursLine(hours.from)} tip={ES.numbers.descubre.hoursTip(hours.from)}>
      <Columnas
        values={hours.bars.map((b) => ({
          key: String(b.hour),
          share: b.centavos / most,
          on: b.hour === hours.from || b.hour === hours.from + 1,
          label: b.hour % 3 === 0 ? String(b.hour % 12 === 0 ? 12 : b.hour % 12) : '',
        }))}
      />
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.numbers.descubre.hoursBasis}</Text>
    </Hallazgo>
  );
}

/** Tu mejor día — the week's seven averages, the best darker. */
function MejorDia({ day }: { day: BestDay }) {
  const { scale } = useDensity();
  const name = (i: number) => ES.dates.weekdays[i] ?? '';
  const most = Math.max(1, ...day.averages.map((a) => a ?? 0));
  // Monday first, as a shopkeeper's week runs.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <Hallazgo title={ES.numbers.descubre.dayTitle} big={ES.numbers.descubre.dayBig(name(day.best))} tip={ES.numbers.descubre.dayTip(name(day.best))}>
      <Columnas
        values={order.map((i) => ({
          key: String(i),
          share: (day.averages[i] ?? 0) / most,
          on: i === day.best,
          label: name(i).slice(0, 3),
        }))}
      />
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
        {ES.numbers.descubre.dayDetail(
          name(day.best),
          shownAmount(day.bestCentavos),
          name(day.worst),
          shownAmount(day.worstCentavos),
        )}
      </Text>
    </Hallazgo>
  );
}

/** Cada cliente te deja — the last two weeks' average sale, against the two before. */
function Cliente({ ticket }: { ticket: Ticket }) {
  const { scale } = useDensity();
  const most = Math.max(1, ticket.centavos, ticket.before ?? 0);
  const rows: { label: string; centavos: number; on: boolean }[] = [
    { label: ES.numbers.descubre.ticketNow, centavos: ticket.centavos, on: true },
  ];
  if (ticket.before !== null) rows.push({ label: ES.numbers.descubre.ticketBefore, centavos: ticket.before, on: false });
  return (
    <Hallazgo
      title={ES.numbers.descubre.ticketTitle}
      big={ES.numbers.descubre.ticketBig(shownAmount(ticket.centavos))}
      tip={ES.numbers.descubre.ticketTip}
    >
      {rows.map((row) => (
        <View key={row.label} style={{ gap: scale.rowGap / 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: scale.rowGap }}>
            <Text style={{ fontSize: scale.smallSize, color: row.on ? PALETTE.tinta : PALETTE.tintaApagada, fontWeight: row.on ? '700' : '400' }}>
              {row.label}
            </Text>
            <Text style={{ fontSize: scale.smallSize, color: row.on ? PALETTE.tinta : PALETTE.tintaApagada, fontWeight: row.on ? '700' : '400' }}>
              {shownAmount(row.centavos)}
            </Text>
          </View>
          {/* ⚠️ NO TRACK BEHIND THE BAR: on the card's white, a pale bar over a
              beige track read as one bar — measured on the emulator. */}
          <View
            style={{
              width: `${Math.round((row.centavos / most) * 100)}%`,
              height: scale.rowGap,
              borderRadius: scale.rowGap / 2,
              backgroundColor: row.on ? PALETTE.accion : PALETTE.accionSuave,
            }}
          />
        </View>
      ))}
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
        {ES.numbers.descubre.ticketDetail(ticket.sales, shownAmount(ticket.biggest))}
      </Text>
    </Hallazgo>
  );
}

/** Lo que más subió de precio — her own deliveries, the most first, each opening its prices. */
function Subio({ rises }: { rises: Rises }) {
  const { scale } = useDensity();
  const top = rises.top[0];
  if (top === undefined) {
    return (
      <Hallazgo title={ES.numbers.descubre.risesTitle} big={ES.numbers.descubre.risesNone} tip={ES.numbers.descubre.risesNoneTip}>
        <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
          {ES.numbers.descubre.risesNoneDetail(dayWords(rises.since))}
        </Text>
      </Hallazgo>
    );
  }
  const per = (unit: string) => ES.numbers.descubre.perUnit(unit);
  const open = (id: string) => router.push({ pathname: '/precios/[id]', params: { id } });
  return (
    <Hallazgo
      title={ES.numbers.descubre.risesTitle}
      big={ES.numbers.descubre.risesBig(top.name, shownAmount(top.to - top.from), per(top.priceUnit))}
      tip={ES.numbers.descubre.risesTip}
    >
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
        {ES.numbers.descubre.risesDetail(shownAmount(top.from), shownAmount(top.to), dayWords(top.since))}
      </Text>
      {rises.top.slice(1).map((rise) => (
        <Pressable
          key={rise.variantId}
          accessibilityRole="button"
          onPress={() => open(rise.variantId)}
          style={{ minHeight: scale.tapTarget, flexDirection: 'row', alignItems: 'center', gap: scale.rowGap, borderTopWidth: 1, borderTopColor: PALETTE.linea }}
        >
          <Text numberOfLines={1} style={{ flex: 1, fontSize: scale.bodySize, color: PALETTE.tinta }}>{rise.name}</Text>
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
            {ES.numbers.descubre.risesMore(shownAmount(rise.to - rise.from), per(rise.priceUnit))}
          </Text>
        </Pressable>
      ))}
      <Pressable accessibilityRole="button" onPress={() => open(top.variantId)} style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}>
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.accion }}>
          {`${ES.numbers.descubre.risesOpen} ›`}
        </Text>
      </Pressable>
    </Hallazgo>
  );
}

/**
 * Tu año en cuadritos — a column per week, a square per day, darker the more it
 * sold. ⚠️ THE SQUARE'S SIDE IS THE CARD'S WIDTH SHARED BY THE WEEKS, capped at
 * a line's height so a young shop's few weeks are not drawn as tiles.
 */
function Cuadritos({ year }: { year: Year }) {
  const { scale } = useDensity();
  const width = useCardWidth() - scale.space * 2;
  const gap = Math.max(1, Math.floor(scale.rowGap / 4));
  const columns = year.weeks.length;
  const side = Math.max(2, Math.min(scale.space, Math.floor((width - gap * (columns - 1)) / columns)));
  const shade = [0, 0.3, 0.55, 0.8, 1];
  return (
    <Hallazgo title={ES.numbers.descubre.yearTitle} big={ES.numbers.descubre.yearBig} tip={ES.numbers.descubre.yearTip}>
      <View style={{ height: scale.smallSize * 1.4 }}>
        {year.months.map((m) => (
          <Text
            key={`${m.column}-${m.name}`}
            style={{ position: 'absolute', left: m.column * (side + gap), fontSize: scale.tabLabelSize, color: PALETTE.tintaApagada }}
          >
            {m.name}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap }}>
        {year.weeks.map((week, w) => (
          <View key={w} style={{ gap }}>
            {week.map((cell, d) => (
              <View
                key={d}
                style={{
                  width: side,
                  height: side,
                  borderRadius: side / 4,
                  backgroundColor: cell === null ? 'transparent' : cell === 0 ? PALETTE.linea : PALETTE.accion,
                  opacity: cell === null || cell === 0 ? 1 : shade[cell],
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.numbers.descubre.yearDetail}</Text>
    </Hallazgo>
  );
}

/** El efecto quincena — each date's average, the quincena's darker. */
function EfectoQuincena({ quincena }: { quincena: Quincena }) {
  const { scale } = useDensity();
  const way = quincenaWay(quincena);
  const most = Math.max(1, ...quincena.byDate.map((a) => a ?? 0));
  return (
    <Hallazgo title={ES.numbers.descubre.quincenaTitle} big={quincenaLine(quincena)} tip={ES.numbers.descubre.quincenaTip(way)}>
      <Columnas
        values={quincena.byDate.map((a, i) => ({
          key: String(i + 1),
          share: (a ?? 0) / most,
          on: i === 0 || i === 14 || i === 15 || i >= 29,
          label: '',
        }))}
        axis={ES.numbers.descubre.quincenaAxis}
      />
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
        {ES.numbers.descubre.quincenaDetail(shownAmount(quincena.quincenaCentavos), shownAmount(quincena.otherCentavos))}
      </Text>
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.numbers.descubre.quincenaBasis}</Text>
    </Hallazgo>
  );
}

/**
 * A row of bars that are only looked at — the sales page's `Barras` taps.
 * ⚠️ `axis` replaces the per-bar labels where the bars are too narrow to hold
 * one (the quincena's 31 dates): a few words spread under the whole row.
 */
function Columnas({
  values,
  axis,
}: {
  values: readonly { key: string; share: number; on: boolean; label: string }[];
  axis?: readonly string[];
}) {
  const { scale } = useDensity();
  const height = scale.space * CARD_PLOT_ROWS;
  return (
    <View style={{ gap: scale.rowGap / 4 }}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: scale.rowGap / 4 }}>
        {values.map((v) => (
          <View
            key={v.key}
            style={{
              flex: 1,
              height: Math.max(1, Math.round(v.share * height)),
              borderRadius: scale.rowGap / 3,
              backgroundColor: v.share === 0 ? PALETTE.linea : v.on ? PALETTE.accion : PALETTE.accionSuave,
            }}
          />
        ))}
      </View>
      {axis === undefined ? (
        <View style={{ flexDirection: 'row', gap: scale.rowGap / 4 }}>
          {values.map((v) => (
            <Text
              key={v.key}
              numberOfLines={1}
              style={{ flex: 1, textAlign: 'center', fontSize: scale.tabLabelSize, color: v.on ? PALETTE.accion : PALETTE.tintaApagada, fontWeight: v.on ? '700' : '400' }}
            >
              {v.label}
            </Text>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {axis.map((word) => (
            <Text key={word} style={{ fontSize: scale.tabLabelSize, fontWeight: '700', color: PALETTE.accion }}>
              {word}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

/** What opens as her history grows — in amber, with how far there is to go. */
function Bloqueada({ title, when, have, need }: { title: string; when: string; have: number; need: number }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        backgroundColor: PALETTE.atencionSuave,
        borderRadius: scale.space * 0.875,
        padding: scale.space,
        gap: scale.rowGap,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap }}>
        <MaterialCommunityIcons name="lock-outline" size={scale.iconSize} color={PALETTE.atencion} />
        <Text style={{ flex: 1, fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{title}</Text>
      </View>
      <View style={{ height: scale.rowGap, borderRadius: scale.rowGap / 2, backgroundColor: PALETTE.superficie }}>
        <View
          style={{
            width: `${Math.round((Math.min(have, need) / need) * 100)}%`,
            height: scale.rowGap,
            borderRadius: scale.rowGap / 2,
            backgroundColor: PALETTE.atencion,
          }}
        />
      </View>
      <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}>{when}</Text>
    </View>
  );
}

/** Inicio's card: white, a hairline and round corners. */
function Tarjeta({ children }: { children: React.ReactNode }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        backgroundColor: PALETTE.superficie,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        borderRadius: scale.space * 0.875,
        padding: scale.space,
        gap: scale.rowGap,
      }}
    >
      {children}
    </View>
  );
}

/** The page's word, and the way back — to the centre from the sales page, else out. */
function Banda({ title, onBack }: { title: string; onBack: () => void }) {
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
        style={{ flex: 1, fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}
      >
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
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
 * THE MONTH, AS A FILE — plan task `7d`. Two buttons, one per format, for the
 * month the centre is showing.
 *
 * ⚠️ `8g` (2026-10-20): IT FOLLOWS THE CENTRE'S MONTH and lost its own picker —
 * one month on the screen, not two that can disagree.
 * ⚠️ NOT DRAWN AT ALL FOR A CASHIER (ruled 2026-09-28): `0033` hands her zero
 * rows, and a control that can only produce an empty file is a control she
 * should not be shown. `allowed` is `canExport` in `@/api/monthExport`.
 * ⚠️ THE ROWS ARE READ ON THE TAP AND NOT BEFORE — see `useMonthExport`.
 */
function Descarga({ month }: { month: string }) {
  const { scale } = useDensity();
  const { allowed, members, fetch } = useMonthExport();
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null);
  const [note, setNote] = useState('');

  // A note about one month is not a note about the next.
  useEffect(() => setNote(''), [month]);

  if (!allowed) return null;

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
    <Tarjeta>
      <Rotulo text={ES.numbers.mes.download} />
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
        {ES.monthExport.subtitle}
      </Text>
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
    </Tarjeta>
  );
}

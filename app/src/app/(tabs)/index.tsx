import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';

import { formatSlot, nextPickup, minutesUntil, untilLabel } from '@/api/collection';
import { canWriteCatalog } from '@/api/catalogWrite';
import { latestSales, type FeedRow } from '@/api/documents';
import {
  useCollectionRequests,
  useDocuments,
  useFreshAfterWrites,
  useMyRole,
  usePendingRequests,
  useSales,
  useToday,
} from '@/api/hooks';
import {
  bestSameWeekday,
  isStreakMilestone,
  lastSevenDays,
  salesStreak,
} from '@/api/sales';
import { showsTakings, takingsLine } from '@/api/today';
import { formatMXN } from '@/format/mxn';
import { INICIO_BLOCKS, doorsOfShape, type InicioBlock, type InicioDoor } from '@/navigation/inicio';
import { DeadLetterBanner } from '@/offline/DeadLetterBanner';
import { deviceStore, readKey, writeKey } from '@/lib/store';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { TITULO } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';
import { Hecho } from '@/ui/Hecho';

// ============================================================================
// INICIO — §2.8's Home row, redrawn by `8g` from the owner's playable page of
// 2026-10-16 (https://claude.ai/artifact/1VsjkoLH1TYznbWvDHc8TG). His words: *"I
// need to increase the engagement with the app … make my Inicio screen more
// 'adictive'"* — and then the hooks he left switched on.
//
// ⚠️⚠️ WHAT IS HERE IS HIS SET AND NOTHING ELSE: the total that ROLLS when a sale
// lands with a `+$45` that floats; *tu mejor viernes*, with confetti when it
// falls; *la racha*, celebrated at 7, 30 and 100 days; option B's three coloured
// doors; *lo último en vivo*; the next Te lo compro pickup; and every other room
// in *Más*. He switched OFF the ring against a normal day, the hour-by-hour
// bars, the line counting what waits for signal, the figures on the doors, the
// estimated profit and the waste trend. ⚠️ *Ahorro en compras* and *Rescatado*
// are his too and join when they can: the first needs a read of the purchase
// history, the second his ruling on what Wera paid (the decisions block).
//
// ⚠️ THE ORDER IS THE TABLE'S, `INICIO_BLOCKS` in `@/navigation/inicio`, read by
// `app/test/inicio.test.ts`: the banner, then *Hoy* — state before anything
// tappable — then the rest.
//
// ⚠️ EVERY NUMBER IS A READ THE APP ALREADY MAKES. The record and the streak are
// Números' six months of days (`useSales`), the figure is `useToday`, the feed
// is Lo último's documents, the pickup is Te lo compro's requests. What has a
// right answer is a pure function in `@/api/sales`, `@/api/documents` and
// `@/api/collection` (`R3`); this file draws and moves.
//
// ⚠️ MOTION IS `transform` AND `opacity` ONLY, ON THE NATIVE DRIVER (§2.11), and
// none of it plays when the phone asks for reduced motion.
// ============================================================================

/** The device's `HH:MM` — the shop's own clock. */
function clockNow(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** The phone's own *reduce motion*, read once and followed. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (live) setReduce(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/** Is Inicio the screen in front of her? A tab stays mounted behind the others. */
function useFocused(): boolean {
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused;
}

/**
 * ⚠️ THE LAST VALUE SHE SAW, WHILE INICIO IS BEHIND ANOTHER TAB. A sale rung up
 * on Vender lands while Inicio is mounted but hidden; drawn at once, the total
 * would roll where nobody looks. Held, it rolls the moment she comes back.
 */
function useHeldWhileHidden<T>(value: T, focused: boolean): T {
  const held = useRef(value);
  if (focused) held.current = value;
  return held.current;
}

/** The key under which the last streak celebrated is kept, so a milestone fires once. */
const CELEBRATED_KEY = 'tienda.inicio.racha';

export default function Inicio() {
  const { scale } = useDensity();
  // ⚠️ THE TOTAL ROLLS ONLY IF IT IS RE-READ WHEN A SALE LANDS — see the hook.
  useFreshAfterWrites();
  const focused = useFocused();
  const [burst, setBurst] = useState(0);
  const [cheer, setCheer] = useState<string | null>(null);
  const celebrate = useCallback((word: string) => {
    setBurst((n) => n + 1);
    setCheer(word);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <ScrollView contentContainerStyle={{ padding: scale.space, gap: scale.space }}>
        {/* ⚠️ THE ORDER IS THE TABLE'S AND NOT THIS FILE'S — see the header. */}
        {INICIO_BLOCKS.map((block) => (
          <Bloque key={block} block={block} focused={focused} onCelebrate={celebrate} />
        ))}
      </ScrollView>
      <Confeti burst={burst} />
      <Hecho shown={cheer !== null} word={cheer ?? ''} onDone={() => setCheer(null)} />
    </View>
  );
}

/** One band of the screen. The `switch` is exhaustive by `InicioBlock`. */
function Bloque({
  block,
  focused,
  onCelebrate,
}: {
  block: InicioBlock;
  focused: boolean;
  onCelebrate: (word: string) => void;
}) {
  switch (block) {
    case 'aviso':
      return <DeadLetterBanner />;
    case 'hoy':
      return <Hoy focused={focused} onCelebrate={onCelebrate} />;
    case 'racha':
      return <Racha onCelebrate={onCelebrate} />;
    case 'puertas':
      return <Puertas />;
    case 'ultimo':
      return <Ultimo focused={focused} />;
    case 'recoleccion':
      return <Recoleccion />;
    case 'mas':
      return <Mas />;
  }
}

/**
 * *Hoy* — the takings, the count, and the bar against the best day with today's
 * weekday. ⚠️ THE FIGURE IS WITHHELD RATHER THAN SHRUNK when a row would not
 * read (`@/api/today`), and then nothing rolls.
 */
function Hoy({ focused, onCelebrate }: { focused: boolean; onCelebrate: (word: string) => void }) {
  const { scale } = useDensity();
  const reduce = useReduceMotion();
  const takings = useToday();
  const { sales, today } = useSales();
  const best = bestSameWeekday(sales.days, today);
  const shown = showsTakings(takings);
  const gross = useHeldWhileHidden(shown ? takings.grossCentavos : null, focused);
  const weekday = weekdayOf(today);

  // ⚠️ THE MOMENTS ARE READ ON THE CHANGE, never on the first value: opening the
  // app on a day already past the record is no news.
  const previous = useRef<number | null>(null);
  const [gain, setGain] = useState<{ amount: number; n: number } | null>(null);
  useEffect(() => {
    const before = previous.current;
    previous.current = gross;
    if (gross === null || before === null || gross <= before) return;
    setGain((g) => ({ amount: gross - before, n: (g?.n ?? 0) + 1 }));
    if (best !== null && before <= best && gross > best) onCelebrate(ES.home.record.toast(weekday));
  }, [gross, best, weekday, onCelebrate]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ES.home.today} ${gross === null ? ES.home.noFigure : formatMXN(gross)}. ${ES.home.seeNumbers}`}
      onPress={() => router.push('/numeros')}
      style={{
        gap: scale.rowGap / 2,
        padding: scale.space,
        borderRadius: scale.space,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Rotulo text={ES.home.today} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.home.seeNumbers}</Text>
          <MaterialCommunityIcons name="chevron-right" size={scale.iconSize * 0.8} color={PALETTE.accion} />
        </View>
      </View>
      <View>
        {gross === null ? (
          <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: PALETTE.tinta }}>{ES.home.noFigure}</Text>
        ) : (
          <Rodillo text={formatMXN(gross)} reduce={reduce} />
        )}
        {gain === null || reduce ? null : <Flota key={gain.n} amount={gain.amount} />}
      </View>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
        {takingsLine(takings.loading, takings.failed, takings)}
      </Text>
      {best === null || gross === null ? null : <Marca gross={gross} best={best} weekday={weekday} reduce={reduce} />}
    </Pressable>
  );
}

function weekdayOf(day: string): string {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(day);
  if (match === null) return '';
  const at = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return ES.dates.weekdays[at.getUTCDay()] ?? '';
}

/**
 * ⚠️ THE ROLLING TOTAL — each digit a column of 0–9 behind a window one line
 * tall, moved by `translateY` on the native driver. A digit keeps its place by
 * its distance from the RIGHT, so `$999` becoming `$1,004` rolls the units and
 * slides in the thousands rather than re-drawing the lot.
 */
function Rodillo({ text, reduce }: { text: string; reduce: boolean }) {
  const { scale } = useDensity();
  const line = Math.round(scale.moneySize * 1.2);
  const chars = [...text];
  return (
    <View style={{ flexDirection: 'row', height: line, overflow: 'hidden' }} accessibilityLabel={text}>
      {chars.map((ch, i) => {
        const fromRight = chars.length - i;
        return /[0-9]/.test(ch) ? (
          <Digito key={`d${fromRight}`} digit={Number(ch)} line={line} reduce={reduce} />
        ) : (
          <Text
            key={`c${fromRight}`}
            style={{ fontSize: scale.moneySize, lineHeight: line, height: line, fontWeight: '700', color: PALETTE.tinta, includeFontPadding: false }}
          >
            {ch}
          </Text>
        );
      })}
    </View>
  );
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function Digito({ digit, line, reduce }: { digit: number; line: number; reduce: boolean }) {
  const { scale } = useDensity();
  const y = useRef(new Animated.Value(-digit * line)).current;
  // ⚠️ STARTED IN AN EFFECT, NEVER IN A HANDLER — on the native driver that is
  // motion versus silence (`8g`'s Hecho learned it).
  useEffect(() => {
    if (reduce) {
      y.setValue(-digit * line);
      return;
    }
    const run = Animated.timing(y, {
      toValue: -digit * line,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [digit, line, reduce, y]);
  return (
    <View style={{ height: line, overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        {DIGITS.map((d) => (
          <Text
            key={d}
            style={{
              fontSize: scale.moneySize,
              lineHeight: line,
              height: line,
              fontWeight: '700',
              color: PALETTE.tinta,
              fontVariant: ['tabular-nums'],
              includeFontPadding: false,
            }}
          >
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

/** The green `+$45` that rises over the total and fades — once per sale that lands. */
function Flota({ amount }: { amount: number }) {
  const { scale } = useDensity();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.timing(t, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [t]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        paddingHorizontal: scale.rowGap,
        paddingVertical: scale.rowGap / 4,
        borderRadius: scale.space,
        backgroundColor: PALETTE.accion,
        opacity: t.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [scale.space * 1.5, -scale.space] }) }],
      }}
    >
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.superficie }}>{`+${formatMXN(amount)}`}</Text>
    </Animated.View>
  );
}

/**
 * *Tu mejor viernes* — a bar that fills towards the record, and the words.
 * ⚠️ THE FILL IS A `translateX` OF A FULL-WIDTH BAR, measured once laid out —
 * width is layout, and §2.11 animates transform and opacity only.
 */
function Marca({ gross, best, weekday, reduce }: { gross: number; best: number; weekday: string; reduce: boolean }) {
  const { scale } = useDensity();
  const [width, setWidth] = useState(0);
  const share = Math.min(1, gross / best);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (width === 0) return;
    const to = -width * (1 - share);
    if (reduce) {
      x.setValue(to);
      return;
    }
    const run = Animated.timing(x, { toValue: to, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [share, width, reduce, x]);
  const broken = gross > best;
  return (
    <View style={{ gap: scale.rowGap / 2, marginTop: scale.rowGap / 2 }}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: scale.rowGap, borderRadius: scale.rowGap, overflow: 'hidden', backgroundColor: PALETTE.accionSuave }}
      >
        <Animated.View
          style={{
            height: '100%',
            borderRadius: scale.rowGap,
            backgroundColor: broken ? PALETTE.marca : PALETTE.accion,
            // ⚠️ HIDDEN UNTIL MEASURED: a bar drawn full before its width is known
            // would flash the record as already beaten.
            opacity: width === 0 ? 0 : 1,
            transform: [{ translateX: x }],
          }}
        />
      </View>
      <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: broken ? PALETTE.marca : PALETTE.accion }}>
        {broken
          ? ES.home.record.broken(weekday, formatMXN(best))
          : ES.home.record.best(weekday, formatMXN(best), formatMXN(best - gross))}
      </Text>
    </View>
  );
}

/**
 * *La racha* — days in a row selling with Wera, the last seven drawn, and a
 * celebration at 7, 30 and 100. ⚠️ A MILESTONE FIRES ONCE: the streak last
 * celebrated is kept on the phone, so reopening the app does not cheer again.
 */
function Racha({ onCelebrate }: { onCelebrate: (word: string) => void }) {
  const { scale } = useDensity();
  const takings = useToday();
  const { sales, today } = useSales();
  const soldToday = takings.count > 0;
  const streak = salesStreak(sales.days, today, soldToday);
  const week = lastSevenDays(sales.days, today, soldToday);

  useEffect(() => {
    if (!isStreakMilestone(streak)) return;
    const store = deviceStore();
    if (readKey(store, CELEBRATED_KEY) === String(streak)) return;
    writeKey(store, CELEBRATED_KEY, String(streak));
    onCelebrate(ES.home.streak.milestone(streak));
  }, [streak, onCelebrate]);

  if (streak === 0) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        padding: scale.space,
        borderRadius: scale.space,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.banda,
      }}
    >
      <MaterialCommunityIcons name="fire" size={scale.iconSize * 1.2} color={PALETTE.marca} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.marca }}>{ES.home.streak.days(streak)}</Text>
        <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.home.streak.sub}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: scale.rowGap / 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {week.map((sold, i) => (
          <View
            key={i}
            style={{
              width: scale.rowGap,
              height: scale.rowGap * 2,
              borderRadius: scale.rowGap / 4,
              backgroundColor: sold ? PALETTE.marca : PALETTE.linea,
              opacity: sold && i < week.length - 1 ? 0.55 : 1,
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** Option B's three coloured doors — each module in its own colour (`8g`). */
function Puertas() {
  const { scale } = useDensity();
  const ground: Readonly<Record<string, string>> = {
    vender: PALETTE.accion,
    comprar: PALETTE.compra,
    desperdicio: PALETTE.desperdicio,
  };
  return (
    <View style={{ flexDirection: 'row', gap: scale.rowGap }}>
      {doorsOfShape('tarjeta').map((door) => (
        <Pressable
          key={door.key}
          accessibilityRole="button"
          accessibilityLabel={door.label}
          // ⚠️ `navigate` AND NOT `push` FOR A TAB: pushing would stack a second
          // copy of a screen the bar already owns.
          onPress={() => {
            if (door.route !== null) router.navigate(door.route);
          }}
          style={{
            flex: 1,
            minHeight: scale.rowHeight * 1.4,
            alignItems: 'center',
            justifyContent: 'center',
            gap: scale.rowGap / 2,
            paddingVertical: scale.space,
            borderRadius: scale.space,
            backgroundColor: ground[door.key] ?? PALETTE.accion,
          }}
        >
          <MaterialCommunityIcons name={door.icon} size={scale.iconSize} color={PALETTE.superficie} />
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.superficie }}>
            {door.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * *Lo último, en vivo* — the three newest sales; a new one slides in at the top.
 * *Ver todo* opens Lo último itself.
 */
function Ultimo({ focused }: { focused: boolean }) {
  const { scale } = useDensity();
  const { documents } = useDocuments('sale');
  const rows = useHeldWhileHidden(latestSales(documents), focused);
  // ⚠️ WHAT WAS ON SCREEN WHEN IT OPENED DOES NOT SLIDE — only a sale that
  // arrives while she is looking.
  const seen = useRef<Set<string> | null>(null);
  if (seen.current === null && rows.length > 0) seen.current = new Set(rows.map((r) => r.id));
  return (
    <View style={{ padding: scale.space, borderRadius: scale.space, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ES.documents.title}. ${ES.home.feed.seeAll}`}
        onPress={() => router.push('/documentos')}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: scale.tapTarget * 0.75 }}
      >
        <Rotulo text={ES.documents.title} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.home.feed.seeAll}</Text>
          <MaterialCommunityIcons name="chevron-right" size={scale.iconSize * 0.8} color={PALETTE.accion} />
        </View>
      </Pressable>
      {rows.length === 0 ? (
        <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.home.feed.none}</Text>
      ) : (
        rows.map((row, i) => {
          const fresh = seen.current !== null && !seen.current.has(row.id);
          if (fresh) seen.current?.add(row.id);
          return <Renglon key={row.id} row={row} first={i === 0} fresh={fresh} />;
        })
      )}
    </View>
  );
}

function Renglon({ row, first, fresh }: { row: FeedRow; first: boolean; fresh: boolean }) {
  const { scale } = useDensity();
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(fresh ? 0 : 1)).current;
  useEffect(() => {
    if (!fresh || reduce) {
      t.setValue(1);
      return;
    }
    const run = Animated.timing(t, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [fresh, reduce, t]);
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: scale.rowGap,
        paddingVertical: scale.rowGap / 2,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: PALETTE.linea,
        opacity: t,
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-scale.space, 0] }) }],
      }}
    >
      <Text numberOfLines={1} style={{ flex: 1, fontSize: scale.bodySize, color: PALETTE.tinta }}>
        <Text style={{ color: PALETTE.tintaApagada }}>{`${row.time}  `}</Text>
        {row.title}
      </Text>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
        {row.grossCentavos === null ? ES.home.noFigure : formatMXN(row.grossCentavos)}
      </Text>
    </Animated.View>
  );
}

/**
 * *Próxima recolección* — only while a Te lo compro pickup is still to come,
 * and only for an owner or a manager (Te lo compro is theirs; `collection_request`
 * answers a cashier with nothing). Tapping it opens Desperdicio.
 */
function Recoleccion() {
  const { scale } = useDensity();
  const role = useMyRole();
  const { data } = useCollectionRequests();
  if (!canWriteCatalog(role) || data === undefined) return null;
  const today = isoToday();
  const clock = clockNow();
  const next = nextPickup(data, today, clock);
  if (next === null) return null;
  const minutes = minutesUntil(next.day, next.from, today, clock) ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.navigate('/desperdicio')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        padding: scale.space,
        borderRadius: scale.space,
        borderWidth: 1,
        borderColor: PALETTE.desperdicioSuave,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <MaterialCommunityIcons name="truck-outline" size={scale.iconSize * 1.2} color={PALETTE.desperdicio} />
      <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
        <Rotulo text={ES.home.pickup.title} ink={PALETTE.desperdicio} />
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.desperdicio }}>
          {ES.home.pickup.line(formatSlot(next.day, next.from, today), untilLabel(minutes))}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={scale.iconSize} color={PALETTE.desperdicio} />
    </Pressable>
  );
}

function isoToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * *Más* — every other room, three to a row, each with its glyph and its word
 * (C12.1). Solicitudes is the owner's alone and carries the count waiting.
 */
function Mas() {
  const { scale } = useDensity();
  const role = useMyRole();
  const queue = usePendingRequests();
  const doors = doorsOfShape('mas').filter((d) => !d.ownerOnly || (role === 'owner' && queue.visible));
  const rows: (InicioDoor | null)[][] = [];
  for (let i = 0; i < doors.length; i += 3) {
    const row: (InicioDoor | null)[] = doors.slice(i, i + 3);
    while (row.length < 3) row.push(null);
    rows.push(row);
  }
  return (
    <View style={{ gap: scale.rowGap }}>
      <Rotulo text={ES.home.more} />
      {rows.map((row) => (
        <View key={row[0]?.key ?? ''} style={{ flexDirection: 'row', gap: scale.rowGap }}>
          {row.map((door, i) =>
            door === null ? (
              <View key={`hueco-${i}`} style={{ flex: 1 }} />
            ) : (
              <Pressable
                key={door.key}
                accessibilityRole="button"
                accessibilityLabel={door.label}
                onPress={() => {
                  if (door.route !== null) router.push(door.route);
                }}
                style={{
                  flex: 1,
                  minHeight: scale.rowHeight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: scale.rowGap / 2,
                  padding: scale.rowGap,
                  borderRadius: scale.space,
                  borderWidth: 1,
                  borderColor: PALETTE.linea,
                  backgroundColor: PALETTE.superficie,
                }}
              >
                <MaterialCommunityIcons name={door.icon} size={scale.iconSize} color={PALETTE.tintaApagada} />
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.tinta }}>
                  {door.label}
                </Text>
                {door.key === 'solicitudes' && queue.count > 0 ? <Insignia count={queue.count} /> : null}
              </Pressable>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

/** The count waiting, as a pill — `atencionSuave` under `atencion` (`palette.test.ts`). */
function Insignia({ count }: { count: number }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        position: 'absolute',
        top: scale.rowGap / 2,
        right: scale.rowGap / 2,
        minWidth: scale.iconSize,
        paddingHorizontal: scale.rowGap / 2,
        borderRadius: scale.iconSize,
        backgroundColor: PALETTE.atencionSuave,
        borderWidth: 1,
        borderColor: PALETTE.atencion,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.atencion }}>{String(count)}</Text>
    </View>
  );
}

/** A small heading over a band — `HOY`, `LO ÚLTIMO`, `MÁS`. */
function Rotulo({ text, ink = PALETTE.tintaApagada }: { text: string; ink?: string }) {
  const { scale } = useDensity();
  return (
    <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: ink, textTransform: 'uppercase', letterSpacing: scale.rowGap / 8 }}>
      {text}
    </Text>
  );
}

/**
 * ⚠️ THE CONFETTI — the record falling, a streak milestone. Pieces in the
 * palette's own colours, each moved by one shared value on the native driver;
 * `burst` changing is what fires it, and nothing plays under reduced motion.
 */
function Confeti({ burst }: { burst: number }) {
  const { scale } = useDensity();
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  const pieces = useRef(
    Array.from({ length: 36 }, (_, i) => ({
      dx: (Math.cos(i * 2.4) * 0.5 + (i % 2 === 0 ? 0.25 : -0.25)) * 340,
      up: 120 + ((i * 37) % 160),
      fall: 420 + ((i * 53) % 260),
      spin: ((i % 5) - 2) * 360,
      color: [PALETTE.accion, PALETTE.compra, PALETTE.desperdicio, PALETTE.marca, PALETTE.atencion][i % 5] ?? PALETTE.accion,
    })),
  ).current;
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (burst === 0 || reduce) return;
    setLive(true);
    t.setValue(0);
    const run = Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true });
    run.start(({ finished }) => {
      if (finished) setLive(false);
    });
    return () => run.stop();
  }, [burst, reduce, t]);
  if (!live) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center' }}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: scale.rowHeight * 2,
            width: scale.rowGap,
            height: scale.rowGap / 2,
            borderRadius: scale.rowGap / 8,
            backgroundColor: p.color,
            opacity: t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, -p.up, p.fall] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

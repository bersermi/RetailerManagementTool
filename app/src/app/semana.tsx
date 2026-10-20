import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isoDay } from '@/api/catalog';
import { shownAmount } from '@/api/documents';
import { useSaleHours, useSales, useWeekWaste } from '@/api/hooks';
import {
  WEEK_SEEN_KEY,
  lastWeek,
  mondayOf,
  thrownWords,
  weekCompare,
  weekRange,
  weekStory,
  weekWaits,
} from '@/api/semana';
import { deviceStore, writeKey } from '@/lib/store';
import { useOnline } from '@/offline/useOnline';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { TITULO } from '@/theme/letra';
import { Rotulo } from '@/ui/Rotulo';

// ============================================================================
// TU SEMANA — last week as four cards, swiped like a story. Plan task `8g`,
// round 4 of Números; the figures are `@/api/semana`'s, and why the fourth card
// is not the canvas's is written there.
//
// Opened from Inicio's *Tu semana está lista* (Monday to Wednesday), which goes
// away once this phone has opened it: opening it is what records the week as
// seen (`WEEK_SEEN_KEY`, a phone's and never the shop's — `@/lib/store`).
//
// ⚠️⚠️ WHAT NO CHECK CAN SEE — `R9`: whether a story that swipes reads as a
// gift or as homework, and whether a thumb finds the next card. The instrument
// is the owner's phone.
//
// ⚠️⚠️ WITH NO SIGNAL (`8g`, 2026-10-20, the offline report's round 3 — the
// owner's *"Do all the fixes"*): the week's write-offs are a read of their own,
// and offline the fourth card said *No se tiró nada* about a week nobody had
// asked. It says *Se ve cuando haya señal* until the read answers, and so does
// the story with no six months to tell (`thrownWords`, `weekWaits`).
// ============================================================================

const CARDS = 4;

export default function Semana() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const today = isoDay(new Date());
  const { from, to } = lastWeek(today);
  const { sales, entries, factors } = useSales();
  const { rows } = useSaleHours();
  const waste = useWeekWaste(from, to);
  const story = weekStory(sales.days, rows, waste, entries, factors, today);
  const online = useOnline();
  const thrown = thrownWords(story?.thrown ?? null, waste !== null, online);
  const [page, setPage] = useState(0);
  const pager = useRef<ScrollView>(null);

  // ⚠️ OPENING IT IS SEEING IT: Inicio stops offering this week's.
  useEffect(() => {
    writeKey(deviceStore(), WEEK_SEEN_KEY, mondayOf(today));
  }, [today]);

  function go(next: number): void {
    const to = Math.max(0, Math.min(CARDS - 1, next));
    pager.current?.scrollTo({ x: to * width, animated: true });
    setPage(to);
  }

  const purple = page === CARDS - 1;
  const ground = purple && story?.thrown ? PALETTE.desperdicio : PALETTE.accion;

  return (
    <View style={{ flex: 1, backgroundColor: ground, paddingTop: insets.top + scale.space, paddingBottom: insets.bottom + scale.space }}>
      <View style={{ flexDirection: 'row', gap: scale.rowGap / 2, paddingHorizontal: scale.space }}>
        {Array.from({ length: CARDS }, (_, i) => (
          <View
            key={i}
            style={{ flex: 1, height: scale.rowGap / 3, borderRadius: scale.rowGap, backgroundColor: PALETTE.superficie, opacity: i <= page ? 1 : 0.35 }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: scale.space }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.numbers.semana.close}
          onPress={() => router.back()}
          style={{ minHeight: scale.tapTarget, minWidth: scale.tapTarget, alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="close" size={scale.iconSize} color={PALETTE.superficie} />
        </Pressable>
      </View>
      {story === null ? (
        weekWaits(sales.state, online) ? (
          <View style={{ paddingHorizontal: scale.space * 1.5, paddingTop: scale.space * 2 }}>
            <Grande>{ES.offline.whenSignal}</Grande>
          </View>
        ) : null
      ) : (
        <ScrollView
          ref={pager}
          horizontal
          // ⚠️ SNAPPED, NOT `pagingEnabled`: on the emulator a paging pager
          // dropped one swipe in three, and Descubre's snapping drops none.
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="start"
          disableIntervalMomentum
          // ⚠️ THE PAGER FILLS WHAT IS LEFT, and each card is the screen's width
          // at the pager's full height: without it the cards had no height and a
          // swipe below their text landed on nothing — measured on the emulator.
          style={{ flex: 1 }}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          <Pagina width={width} onBack={() => go(0)} onNext={() => go(1)}>
            <Rotulo text={ES.numbers.semana.title(weekRange(story.from, story.to))} ink={PALETTE.superficie} />
            <Grande>{ES.numbers.semana.sold}</Grande>
            <Enorme>{shownAmount(story.centavos)}</Enorme>
            {story.compare === null ? null : <Nota>{weekCompare(story)}</Nota>}
          </Pagina>
          <Pagina width={width} onBack={() => go(0)} onNext={() => go(2)}>
            <Rotulo text={ES.numbers.semana.bestTitle} ink={PALETTE.superficie} />
            <Enorme>{ES.numbers.semana.bestBig(dayName(story.best.day))}</Enorme>
            <Nota>{ES.numbers.semana.bestDetail(shownAmount(story.best.centavos), story.best.sales)}</Nota>
            {story.best.record ? <Nota>{ES.numbers.semana.bestRecord(dayName(story.best.day))}</Nota> : null}
          </Pagina>
          <Pagina width={width} onBack={() => go(1)} onNext={() => go(3)}>
            <Rotulo text={ES.numbers.semana.starTitle} ink={PALETTE.superficie} />
            {story.star === null ? null : (
              <>
                <Enorme>{story.star.name}</Enorme>
                <Nota>{story.star.quantity}</Nota>
              </>
            )}
          </Pagina>
          <Pagina width={width} onBack={() => go(2)} onNext={() => go(3)}>
            <Rotulo text={ES.numbers.semana.thrownTitle} ink={PALETTE.superficie} />
            <Grande>{thrown.big}</Grande>
            {thrown.tip === '' ? null : <Nota>{thrown.tip}</Nota>}
            <View style={{ flex: 1 }} />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/numeros')}
              style={{
                minHeight: scale.tapTarget,
                borderRadius: scale.space * 0.75,
                backgroundColor: PALETTE.superficie,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: ground }}>{ES.numbers.semana.open}</Text>
            </Pressable>
          </Pagina>
        </ScrollView>
      )}
    </View>
  );
}

function dayName(day: string): string {
  return ES.dates.weekdays[new Date(`${day}T00:00:00Z`).getUTCDay()] ?? '';
}

/**
 * One card. ⚠️ A TAP MOVES IT, the way a phone's stories do: the left third goes
 * back, the rest goes on — because on the emulator one swipe in three did not
 * take, whichever way the pager snapped, and a tap always did. A swipe still works.
 */
function Pagina({
  width,
  onBack,
  onNext,
  children,
}: {
  width: number;
  onBack: () => void;
  onNext: () => void;
  children: React.ReactNode;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      onPress={(e) => (e.nativeEvent.locationX < width / 3 ? onBack() : onNext())}
      style={{ width, paddingHorizontal: scale.space * 1.5, paddingTop: scale.space * 2, gap: scale.space }}
    >
      {children}
    </Pressable>
  );
}

function Enorme({ children }: { children: React.ReactNode }) {
  const { scale } = useDensity();
  return <Text style={{ fontSize: scale.titleSize * 2, ...TITULO, color: PALETTE.superficie }}>{children}</Text>;
}

function Grande({ children }: { children: React.ReactNode }) {
  const { scale } = useDensity();
  return <Text style={{ fontSize: scale.titleSize * 1.3, ...TITULO, color: PALETTE.superficie }}>{children}</Text>;
}

function Nota({ children }: { children: React.ReactNode }) {
  const { scale } = useDensity();
  return <Text style={{ fontSize: scale.bodySize, color: PALETTE.superficie }}>{children}</Text>;
}


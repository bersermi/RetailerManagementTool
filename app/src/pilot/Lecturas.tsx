// ============================================================================
// THE OWNER'S PANEL — §5's numbers against their budgets. Plan task `5P-a`.
//
// ⚠️⚠️ NO SHOPKEEPER EVER SEES THIS, AND THAT IS THE DECISION MAKER'S RULING OF
// 2026-09-28 (42): the capture screens do not change; the owner opens this by a
// long press on Ajustes' title, on a pilot build, and nobody else can. It
// reads the readings back from the server (ruling 43), so the owner's own
// phone shows every phone in the shop — he never has to take Rosa's.
//
// It decides nothing: `@/pilot/readings`' `summaryOf` says what each number is
// and whether it is inside its budget, and `@/api/pilot` says which rows are
// *today*. A measure with no readings says so rather than drawing green.
// ============================================================================

import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePilotReadings } from '@/api/hooks';
import { todayRows } from '@/api/pilot';
import { PILOT_BUILD } from '@/lib/pilotFlag';
import { SCREENS, summaryOf, tenthsText, type Measure, type ScreenSummary } from '@/pilot/readings';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { Interruptor } from '@/ui/Interruptor';

type Period = 'hoy' | 'semana';
const PERIODS: readonly Period[] = ['hoy', 'semana'];

export function Lecturas({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('hoy');
  const { rows, failed } = usePilotReadings(open);

  const shown = rows === null ? null : period === 'hoy' ? todayRows(rows, new Date()) : rows;

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: scale.space,
            backgroundColor: PALETTE.banda,
            borderBottomWidth: 1,
            borderBottomColor: PALETTE.linea,
          }}
        >
          <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}>
            {ES.pilot.title}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={{ minHeight: scale.tapTarget, minWidth: scale.tapTarget, justifyContent: 'center', alignItems: 'flex-end' }}
          >
            <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
              {ES.pilot.close}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: scale.space,
            gap: scale.space,
            paddingBottom: scale.space * 2 + insets.bottom,
          }}
        >
          {PILOT_BUILD !== null && (
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
              {ES.pilot.build(PILOT_BUILD)}
            </Text>
          )}
          <Interruptor options={PERIODS} labels={ES.pilot.period} picked={period} onPick={setPeriod} />
          {failed !== null ? (
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>{ES.api.errors[failed]}</Text>
          ) : shown === null ? (
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{ES.pilot.loading}</Text>
          ) : (
            SCREENS.map((screen) => <Bloque key={screen} summary={summaryOf(shown, screen)} />)
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Bloque({ summary }: { summary: ScreenSummary }) {
  const { scale } = useDensity();
  const { gaveUp, passedThrough, committed, rateTenths } = summary.abandonment;
  return (
    <View
      style={{
        gap: scale.rowGap,
        padding: scale.space,
        borderRadius: scale.rowGap,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
        {ES.pilot.screen[summary.screen]}
      </Text>
      {summary.measures.map((measure) => (
        <Linea key={measure.kind} measure={measure} />
      ))}
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta }}>
        {ES.pilot.gaveUp(gaveUp, gaveUp + committed, rateTenths === null ? '—' : tenthsText(rateTenths))}
      </Text>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
        {ES.pilot.passedThrough(passedThrough)}
      </Text>
    </View>
  );
}

function Linea({ measure }: { measure: Measure }) {
  const { scale } = useDensity();
  const colour =
    measure.verdict === 'over' ? PALETTE.error : measure.verdict === 'within' ? PALETTE.accion : PALETTE.tintaApagada;
  return (
    <View style={{ gap: scale.rowGap / 2 }}>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
        {ES.pilot.measure[measure.kind]}
        {'  '}
        <Text style={{ color: colour }}>{ES.pilot.verdict[measure.verdict]}</Text>
      </Text>
      {measure.value !== null && (
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {measure.kind === 'taps'
            ? ES.pilot.count(measure.value, measure.ceiling, measure.n)
            : ES.pilot.ms(measure.value, measure.ceiling, measure.n)}
        </Text>
      )}
    </View>
  );
}

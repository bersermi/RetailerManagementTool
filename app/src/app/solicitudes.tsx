import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePendingRequests } from '@/api/hooks';
import { linesOf, type PendingRequest } from '@/api/approvals';
import { formatWaiting } from '@/format/date';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// SOLICITUDES — WHO IS WAITING TO BE LET IN. Plan task `5b-iii-d-1`, and the
// app's SECOND non-tab surface.
//
// ⚠️⚠️ IT IS DELIBERATELY HALF A LOOP AND IT SAYS SO ON THE SCREEN. The owner
// can see who is waiting and cannot yet admit her: `approve_request` and the
// location picker `D8` refuses to leave empty are `5b-iii-d-2`. That is the
// shape `5b-iii-b`, `5b.8-i` and `5b.8-iii-a` each shipped, and it is what keeps
// a sitting reviewable — but a shopkeeper must never be left to work out that a
// missing button is where the app is rather than something broken, so
// `ES.approvals.notYet` is on the card. It is deleted by the task that ships the
// act, exactly as `(tabs)/index.tsx`'s two temporary blocks were.
//
// ⚠️ A SHEET, AND FOR `ajustes`'S REASON: you come back to where you were. It is
// reached from a row in the body of Inicio, it is at the ROOT and in NO GROUP —
// so `groupOf()` calls it `null` and `redirectFor` leaves a member exactly where
// they are — and `presentation: 'modal'` in `_layout.tsx` is the whole of that
// claim. ⚠️ It is NOT added to `RESTORABLE_ROUTES`: C1.3 reopens the screen a
// person was WORKING on, and a modal over Inicio is not that. An allow-list is
// what makes that a decision rather than an oversight.
//
// ⚠️⚠️ THE TWO LINES OF AN ENTRY ARE NOT DECIDED HERE. `linesOf` in
// `@/api/approvals` is where the owner's ruling of 2026-09-19 lives — the EMAIL
// as the header, the NAME beneath it — because §2.11 keeps rendering out of
// scope and a ruling spelled only in JSX is one no instrument in this repository
// can see. This file draws what that function returns, in the order it returns
// it.
//
// ⚠️ NOTHING HERE DECIDES WHO MAY LOOK. `usePendingRequests` returns `visible`,
// and the bell on Inicio is what is absent for a manager — so this screen is
// reached only by somebody who may see it. The empty state it renders is
// therefore "nobody is waiting" and never "this is not yours", which are the two
// things `0037`'s decision 2 makes identical on the wire.
// ============================================================================

export default function Solicitudes() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const queue = usePendingRequests();

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda />

      <ScrollView
        contentContainerStyle={{
          padding: scale.space,
          gap: scale.space * 1.5,
          // The device's own bottom inset, so the last entry is not under the
          // home indicator on the iPhones the pilot uses (C1.1).
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
      >
        <Tarjeta>
          {queue.loading ? (
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
              {ES.approvals.loading}
            </Text>
          ) : queue.entries.length === 0 ? (
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
              {ES.approvals.empty}
            </Text>
          ) : (
            queue.entries.map((entry) => <Solicitud key={entry.requestId} entry={entry} />)
          )}
        </Tarjeta>

        {/* ⚠️ ONLY WHERE THERE IS SOMETHING TO BE UNABLE TO DO. Telling an owner
            with an empty queue that he cannot approve anybody is an apology for
            a button that would have nothing to act on. */}
        {!queue.loading && queue.entries.length > 0 && (
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
            {ES.approvals.notYet}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

/** The sheet's own header, `ajustes`' shape: the room's name and the way out. */
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
      <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}>
        {ES.approvals.title}
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
          {ES.approvals.close}
        </Text>
      </Pressable>
    </View>
  );
}

/** A card on `superficie`. `ajustes`' `Section` without a title, because the
 *  banda already says what this room is and a second heading would repeat it. */
function Tarjeta({ children }: { children: ReactNode }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        backgroundColor: PALETTE.superficie,
        borderRadius: scale.space,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        padding: scale.space,
        gap: scale.space,
      }}
    >
      {children}
    </View>
  );
}

/**
 * One person waiting.
 *
 * ⚠️⚠️ THE EMAIL IS THE HEADER AND THE NAME IS THE SUBTITLE — the owner's ruling
 * of 2026-09-19, and the INVERSE of the roster one screen over, where the name
 * is the title. On the roster you already know everybody; here you are matching
 * a stranger against an address somebody read out to you, so the address is the
 * thing being verified. The order comes out of `linesOf`, which is where the
 * ruling is pinned by a test rather than by this comment.
 *
 * ⚠️ THE SUBTITLE IS OMITTED ENTIRELY WHEN THERE IS NO NAME, never drawn as a
 * dash or an explanation. `0034` admits an account whose provider sent no name
 * and `0037` hands back NULL for it; the entry is then an address with nothing
 * under it, which is the identity ladder's own floor. It is ours to absorb.
 *
 * ⚠️ THE EMAIL IS AT `bodySize` AND NOT AT `moneySize`. The join code and the
 * invite token are at `moneySize` because they are read ALOUD at arm's length; an
 * address is read with the eyes, against a phone the person asking is holding,
 * and an address at 30pt wraps to three lines in elder mode.
 *
 * ⚠️ AND THE WAITING LINE IS OMITTED WHEN THE TIMESTAMP CANNOT BE READ, the rule
 * `Emitido` already follows for an expiry: `formatWaiting` returns `null` rather
 * than a sentence with `NaN` in it.
 */
function Solicitud({ entry }: { entry: PendingRequest }) {
  const { scale } = useDensity();
  const lines = linesOf(entry);
  const waiting = formatWaiting(entry.requestedAt);

  return (
    <View style={{ gap: scale.rowGap / 2, minHeight: scale.rowHeight, justifyContent: 'center' }}>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
        {lines.header}
      </Text>

      {lines.subtitle !== null && (
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {lines.subtitle}
        </Text>
      )}

      {/* C12.1 — the icon NEVER appears without its word, and the word here is
          the whole of what she asked for. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap }}>
        <MaterialCommunityIcons
          name="account-clock-outline"
          size={scale.iconSize}
          color={PALETTE.atencion}
        />
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.atencion }}>
          {ES.approvals.askedFor(ES.members.roles[entry.role])}
        </Text>
      </View>

      {waiting !== null && (
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{waiting}</Text>
      )}
    </View>
  );
}

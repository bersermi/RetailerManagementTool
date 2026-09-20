import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApproveRequest, useLocations, usePendingRequests } from '@/api/hooks';
import {
  checkApproval,
  linesOf,
  type ApprovalIssueKey,
  type PendingRequest,
} from '@/api/approvals';
import { locationsRequired, resolveLocations, type LocationOption } from '@/api/invites';
import { formatWaiting } from '@/format/date';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// SOLICITUDES — WHO IS WAITING TO BE LET IN. Plan task `5b-iii-d-1`, and the
// app's SECOND non-tab surface.
//
// ⚠️⚠️ THE LOOP CLOSES HERE AS OF `5b-iii-d-2`, AND `ES.approvals.notYet` IS
// GONE WITH IT. `5b-iii-d-1` shipped this screen able only to LOOK, and said so
// on the card, because a shopkeeper must never be left to work out that a
// missing button is where the app is rather than something broken. The button
// exists now, so that sentence would be a lie — its own comment said this task
// would delete it, and this is that task.
//
// ⚠️⚠️ AND THE ONE THING ON THIS SCREEN NO INSTRUMENT IN THIS REPOSITORY CAN
// SEE IS THE PICKER REFUSING TO BE EMPTY (`D8`). §2.11 keeps rendering out of
// scope, so nothing here would go red if `Aprobar` quietly sent `[]` for a
// staff member — and the person who pays is HER: she is inside the shop, every
// write she makes is refused by RLS with no message, and she has no way to find
// out why. That is why the refusal is a pure function in `@/api/approvals`
// (`checkApproval`, which `app/test/api-approvals.test.ts` reads) and why the
// server keeps its own copy (`0029:407`, driven by
// `docs/checks/5b-iii-d-2-approve-contract.sh`). This file only renders it.
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
  const locations = useLocations();
  const { admit, busy } = useApproveRequest();

  // ⚠️⚠️ ONE ROW IS OPEN AT A TIME, AND THE STATE LIVES HERE RATHER THAN IN THE
  // ROW FOR THAT REASON. Two half-filled pickers on one screen is two answers to
  // one question, and the one that gets sent is whichever button was tapped
  // last — which a person cannot see. An id and not a boolean, so the state
  // names WHICH person is being let in.
  const [openId, setOpenId] = useState<string | null>(null);
  const [locationIds, setLocationIds] = useState<readonly string[]>([]);
  const [issue, setIssue] = useState<ApprovalIssueKey | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  function close() {
    setOpenId(null);
    setLocationIds([]);
    setIssue(null);
    setFailure(null);
  }

  function open(entry: PendingRequest) {
    close();
    setOpenId(entry.requestId);
  }

  async function confirm(entry: PendingRequest) {
    // ⚠️ `resolveLocations` FIRST AND `checkApproval` SECOND, in that order and
    // not the other way round. In a one-store shop the picker is never drawn
    // and the store is filled in here — so checking the raw ticks would refuse
    // an approval the shopkeeper was never asked a question about. It is the
    // order `Invitar` already submits in, for the same reason.
    const draft = {
      entry,
      locationIds: resolveLocations({ role: entry.role, locationIds }, locations.options),
    };
    const problem = checkApproval(draft, { locationCount: locations.options.length });
    setIssue(problem);
    setFailure(null);
    if (problem !== null) return;

    const result = await admit(draft);
    if (result.approved === null) {
      setFailure(result.error);
      return;
    }
    // ⚠️ NO SUCCESS SENTENCE, AND THE REASON IS THAT THE SCREEN ANSWERS ITSELF.
    // `useApproveRequest` invalidates the queue, so the row she just approved
    // LEAVES the list and the badge counts down — which is a better answer than
    // a message, and it is `useRedeemInvite`'s recorded rule about a sentence
    // rendered on a screen that is already gone.
    close();
  }

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
            queue.entries.map((entry) => (
              <Solicitud
                key={entry.requestId}
                entry={entry}
                options={locations.options}
                chosen={locationIds}
                open={openId === entry.requestId}
                busy={busy}
                issue={openId === entry.requestId ? issue : null}
                failure={openId === entry.requestId ? failure : null}
                onOpen={() => open(entry)}
                onCancel={close}
                onConfirm={() => void confirm(entry)}
                onToggle={(id) =>
                  setLocationIds((current) =>
                    current.includes(id)
                      ? current.filter((other) => other !== id)
                      : [...current, id],
                  )
                }
              />
            ))
          )}
        </Tarjeta>
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
function Solicitud({
  entry,
  options,
  chosen,
  open,
  busy,
  issue,
  failure,
  onOpen,
  onCancel,
  onConfirm,
  onToggle,
}: {
  entry: PendingRequest;
  options: readonly LocationOption[];
  chosen: readonly string[];
  open: boolean;
  busy: boolean;
  issue: ApprovalIssueKey | null;
  failure: string | null;
  onOpen: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onToggle: (id: string) => void;
}) {
  const { scale } = useDensity();
  const lines = linesOf(entry);
  const waiting = formatWaiting(entry.requestedAt);

  // ⚠️⚠️ THE PICKER IS DRAWN FOR A STAFF REQUEST IN A SHOP WITH MORE THAN ONE
  // STORE, AND THOSE TWO CONDITIONS ARE NOT THE SAME RULE WEARING ONE HAT.
  // `locationsRequired` is `0029`'s decision 7 — the ROW's role, so a manager is
  // never asked because `0029:434` discards the answer. The `> 1` is C1.5 and
  // the owner's standing tie-break: both pilot shops have exactly one store, so
  // nothing is asked and `resolveLocations` fills it in.
  const asking = locationsRequired(entry.role) && options.length > 1;

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

      {/* ⚠️⚠️ TWO TAPS AND NOT ONE, AND IT IS THE ONE PLACE THIS SCREEN ADDS A
          HUMAN STEP ON PURPOSE. The owner's standing tie-break is the option
          that adds none — which is why a one-store shop is never asked WHICH
          store — but this is not a question with no right answer, it is a guard
          against the wrong row. Admitting somebody is a `workspace_member` row
          and there is no `Quitar` yet, so a mis-tap in elder mode is a stranger
          inside the shop with nothing in this app able to put her out. ⚠️ AND
          IT IS ONE BEHAVIOUR RATHER THAN TWO: without it, a manager request
          would approve on the first tap and a staff request would open a
          picker, which is a button that means different things on rows that
          look alike. */}
      {!open ? (
        <Boton icon="account-check" label={ES.approvals.approve} onPress={onOpen} />
      ) : (
        <View style={{ gap: scale.rowGap }}>
          {asking && (
            <View style={{ gap: scale.rowGap / 2 }}>
              <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
                {ES.approvals.locationLabel}
              </Text>
              {options.map((option) => (
                <Opcion
                  key={option.id}
                  chosen={chosen.includes(option.id)}
                  title={option.name}
                  onPress={() => onToggle(option.id)}
                />
              ))}
            </View>
          )}

          {/* ⚠️ ONE SLOT FOR BOTH KINDS OF REFUSAL — this row's own and the
              database's — which is `Invitar`'s rule: two slots is a screen that
              can show two contradictory reasons at once, and the second one is
              always the stale one. */}
          {(issue !== null || failure !== null) && (
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>
              {issue !== null ? ES.approvals.issues[issue] : failure}
            </Text>
          )}

          <Boton
            icon="check"
            label={busy ? ES.approvals.working : ES.approvals.confirm}
            busy={busy}
            onPress={onConfirm}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onCancel}
            style={{ minHeight: scale.tapTarget, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
              {ES.approvals.cancel}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** A filled control with its word beside its icon (C12.1). `ajustes`' `Boton`,
 *  which is local to that file for the reason every component here is: §2.11
 *  puts rendering out of scope, so a shared component library is a thing no
 *  suite could check and no screen asked for yet. */
function Boton({
  icon,
  label,
  onPress,
  busy = false,
}: {
  icon: 'account-check' | 'check';
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={{
        minHeight: scale.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale.rowGap,
        paddingHorizontal: scale.space,
        borderRadius: scale.space / 2,
        backgroundColor: PALETTE.accionSuave,
        borderWidth: 1,
        borderColor: PALETTE.accion,
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color={PALETTE.accion} />
      ) : (
        <MaterialCommunityIcons name={icon} size={scale.iconSize} color={PALETTE.accion} />
      )}
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * One store, ticked or not.
 *
 * ⚠️ THE CHOSEN ONE IS ANNOUNCED THREE WAYS — ground, border and a filled tick —
 * which is the palette's rule and `ajustes`' `Opcion`: no state on this app is
 * ever carried by colour alone. `R9` cannot see it, so it is written down here.
 */
function Opcion({
  chosen,
  title,
  onPress,
}: {
  chosen: boolean;
  title: string;
  onPress: () => void;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: scale.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        paddingHorizontal: scale.space,
        paddingVertical: scale.rowGap / 2,
        borderRadius: scale.space / 2,
        borderWidth: chosen ? 2 : 1,
        borderColor: chosen ? PALETTE.accion : PALETTE.linea,
        backgroundColor: chosen ? PALETTE.accionSuave : PALETTE.superficie,
      }}
    >
      <MaterialCommunityIcons
        name={chosen ? 'check-circle' : 'circle-outline'}
        size={scale.iconSize}
        color={chosen ? PALETTE.accion : PALETTE.tintaApagada}
      />
      <Text
        style={{
          flex: 1,
          fontSize: scale.bodySize,
          fontWeight: chosen ? '700' : '400',
          color: PALETTE.tinta,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

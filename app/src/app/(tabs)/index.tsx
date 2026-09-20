import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { usePendingRequests } from '@/api/hooks';
import { formatMXN } from '@/format/mxn';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { placeholderGrossCentavos } from '@/wiring';

// ============================================================================
// ⚠️ STILL NOT INICIO. §2.8's Inicio is today's takings, today's count, and
// anything expiring within 48 hours — none of which exists yet, because none of
// it has a query behind it in this app. Área 13 added the module cards. All of
// that is `5d`.
//
// ⚠️⚠️ THE TWO TEMPORARY BLOCKS `5a-ii` PUT HERE ARE GONE, AND THIS IS THE TASK
// THAT WAS NAMED TO DELETE THEM. Both said so in their own comments — *"whoever
// builds Ajustes deletes this block"* — and both are now on a surface that is
// not going anywhere:
//
//   * the density switch, which `5a-iii-b` refused to persist while it lived
//     here, because *"persisting it behind a placeholder switch would put the
//     write in the file that gets deleted"*. It is persisted now (`5b-ii-a`).
//   * `Cerrar sesión`, which was here so that `5a-iv` could DEMONSTRATE C1.4 —
//     the only way to tell a session that survived from one that was never
//     asked for is to end one deliberately and be asked again.
//
// ⚠️ THE LOG-OUT IS STILL REACHABLE IN TWO TAPS, and that matters to a dated
// obligation rather than to a preference: the `5a-iv-d` day-8 and day-30
// readings both end by signing out, and a control that had moved somewhere
// unreachable would have broken the instrument rather than the app.
//
// WHAT IS LEFT HERE: the money formatter at whatever size the mode says — the
// one thing `5a-ii` could only claim on a machine and can be LOOKED AT on a
// phone — the way into Ajustes, and as of `5b-iii-d-1` the BELL.
//
// ⚠️⚠️ THE BELL IS IN THE BODY AND NOT IN THE NAVIGATOR'S HEADER, AND THIS FILE
// ALREADY RECORDED WHY BEFORE IT EXISTED. `Ajustes` below refused a `headerRight`
// icon on the ground that C12.1 forbids an icon with no word beside it and a
// header corner has no room for one. C11.8 asks for a notifications icon and a
// badge; the same sentence applies to it, so it lands here as a row with its
// word on it. ⚠️ `5d` builds §2.8's real Inicio — state at the top, module cards
// below — and places both of these properly; neither is where it ends up.
//
// ⚠️ THE BELL IS ABSENT FOR EVERYBODY BUT AN OWNER, and that absence is the whole
// fence. `0037` answers a non-owner with an empty list rather than a refusal
// (its decision 2), so "you may not see this" and "nobody is waiting" are the
// same answer on the wire — `usePendingRequests` decides which BEFORE the call,
// and a manager is shown no control rather than an empty room.
// ============================================================================

export default function Inicio() {
  const { scale } = useDensity();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: PALETTE.fondo,
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale.space * 2,
      }}
    >
      <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: PALETTE.tinta }}>
        {formatMXN(placeholderGrossCentavos())}
      </Text>

      <Solicitudes />
      <Ajustes />
    </View>
  );
}

/**
 * THE ONE ROW SHAPE THIS SCREEN REPEATS — an icon, its word, and whatever the
 * caller wants on the right.
 *
 * ⚠️ IT IS A COMPONENT RATHER THAN A SECOND COPY OF THE SAME TWELVE STYLE LINES.
 * `5b-iii-d-1` added the second door on this screen, and the cheap move was to
 * paste the first one — which is the stale-duplicate defect this repository has
 * recorded seven times, in its smallest form: two rows that drift apart the
 * first time one of them is restyled.
 *
 * ⚠️ `router.push` AND NOT `replace` FOR BOTH: a sheet you come back from is the
 * whole reason §2.8 made these sheets.
 */
function Fila({
  icon,
  label,
  onPress,
  right,
}: {
  icon: 'bell-outline' | 'cog-outline';
  label: string;
  onPress: () => void;
  right?: ReactNode;
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
        paddingHorizontal: scale.space * 1.5,
        borderRadius: scale.space / 2,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      {/* C12.1 — the icon NEVER appears without its word. */}
      <MaterialCommunityIcons name={icon} size={scale.iconSize} color={PALETTE.tinta} />
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta }}>{label}</Text>
      {right}
    </Pressable>
  );
}

/**
 * THE BELL — C11.8, and the count behind it. Plan task `5b-iii-d-1`.
 *
 * ⚠️⚠️ ABSENT ENTIRELY FOR ANYBODY WHO IS NOT AN OWNER, which is `useRoster`'s
 * `visible` rule and is the fence itself rather than a decoration on one. See
 * this file's header: the empty list `0037` hands a manager is indistinguishable
 * from the empty list an owner sees on a quiet day, so the two are told apart
 * before the call and never after it.
 *
 * ⚠️ AN OWNER WITH AN EMPTY QUEUE STILL GETS THE ROW, WITH NO BADGE ON IT. That
 * is the same distinction one line down: the badge reports a COUNT and its
 * absence means zero, while the row's absence means the queue is not yours. A
 * door that vanished when the room was empty would also be a door nobody could
 * find to check.
 *
 * ⚠️ AND IT IS NOT HIDDEN WHILE THE READ IS OUT. `loading` is true for a moment
 * on every open; a row that appeared a beat late would be a control that moves
 * under a thumb already travelling towards Ajustes.
 */
function Solicitudes() {
  const queue = usePendingRequests();
  if (!queue.visible) return null;
  return (
    <Fila
      icon="bell-outline"
      label={ES.approvals.bell}
      onPress={() => router.push('/solicitudes')}
      right={queue.count > 0 ? <Insignia count={queue.count} /> : undefined}
    />
  );
}

/**
 * The count, as a pill.
 *
 * ⚠️ `atencionSuave` UNDER `atencion` IS A PAIR `app/test/palette.test.ts`
 * ALREADY CLEARS AT 4.5:1, which is why it is this pair and not white on a
 * filled circle — that combination is in no ground/ink table and nothing in this
 * repository would have measured it.
 *
 * ⚠️⚠️ AND THE NUMBER IS NOT THE ONLY THING SAYING SOMETHING IS WAITING. The
 * palette's own header records that `accion` and `atencion` are one man in
 * twelve's red-green pair at nearly equal luminance, so state is never carried
 * by colour alone here: the row already says `Solicitudes`, and the pill adds a
 * digit. A dot with no number would have been colour on its own.
 *
 * ⚠️ IT IS SIZED FROM THE SCALE LIKE EVERYTHING ELSE (`R6`), so elder mode gets a
 * bigger pill rather than a 12 pt one beside a 20 pt word.
 */
function Insignia({ count }: { count: number }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        minWidth: scale.iconSize,
        paddingHorizontal: scale.rowGap / 2,
        paddingVertical: scale.rowGap / 4,
        borderRadius: scale.iconSize,
        backgroundColor: PALETTE.atencionSuave,
        borderWidth: 1,
        borderColor: PALETTE.atencion,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.atencion }}>
        {String(count)}
      </Text>
    </View>
  );
}

/**
 * The way into the sheet.
 *
 * ⚠️⚠️ IT IS A BUTTON IN THE MIDDLE OF A PLACEHOLDER, AND THAT IS NOT WHERE IT
 * ENDS UP. §2.8's Inicio — as amended by área 13 — puts state at the top and the
 * module cards below it, and Ajustes belongs with the rows to Productos and
 * Proveedores rather than alone in the centre of an empty screen. `5d` builds
 * that screen and places this properly. ⚠️ THE ALTERNATIVE WAS A HEADER ICON,
 * refused because the tab shell's header is react-navigation's and a
 * `headerRight` here would be the first navigation option this app sets for
 * decoration — and C12.1 forbids an icon with no word beside it, which a header
 * corner has no room for. ⚠️ THAT REFUSAL IS WHY THE BELL IS IN THE BODY TOO —
 * see this file's header.
 */
function Ajustes() {
  return (
    <Fila icon="cog-outline" label={ES.settings.title} onPress={() => router.push('/ajustes')} />
  );
}

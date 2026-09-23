import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePendingRequests, useToday } from '@/api/hooks';
import { showsTakings, takingsLine } from '@/api/today';
import { formatMXN } from '@/format/mxn';
import {
  INICIO_BLOCKS,
  doorsOfShape,
  isOpen,
  type InicioBlock,
  type InicioDoor,
} from '@/navigation/inicio';
import { bannerRoom } from '@/offline/deadLetters';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// INICIO — §2.8's Home row, finally the screen it describes. Plan task
// `5d-iv-b`, and the last child of `5d`.
//
// ⚠️⚠️ THE THREE TEMPORARY BLOCKS ARE GONE, AND ALL THREE NAMED THIS TASK IN
// THEIR OWN COMMENTS. The Productos door `5d-ii` put here a task early, the
// bell `5b-iii-d-1` left floating in the body, and the Ajustes button sitting
// alone in the centre of an empty screen. That is the arrangement `5a-ii`'s two
// temporary blocks used before `5b-ii-a` deleted them — comment included,
// because the one that is not written down is the one that becomes permanent.
// ⚠️ THE PLACEHOLDER FIGURE WENT WITH THEM: `placeholderGrossCentavos()`
// rendered **$11.60** out of `packages/money/cases.json` at the top of this
// screen, which is a test fixture presented to a shopkeeper as her takings. It
// was on the owner's own phone this morning. The number here now comes from
// `sale`.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ STATE COMES FIRST, AND THAT IS THE ONE PROHIBITION §2.8 KEPT.
// ----------------------------------------------------------------------------
// The Home row was amended on 2026-09-17 to allow the module cards — the
// original sentence refused a nav panel here as *"redundant"* — and the
// amendment kept half of it deliberately: the takings and the count sit ABOVE
// ANYTHING TAPPABLE, so Inicio informs before it navigates. ⚠️ The order is not
// written in this file's JSX. It is `INICIO_BLOCKS` in `@/navigation/inicio`,
// rendered by a `.map`, because §2.11 refuses suites over layout and an order
// written as a sequence of children is a deliverable NO CHECK HERE CAN SEE —
// moving the cards above the figure would ship green. `app/test/inicio.test.ts`
// reads the table. The same trade `tabs.ts` made for C12.1.
//
// ⚠️ THE 48-HOUR EXPIRY BLOCK §2.8 ASKS FOR IS NOT HERE, AND IT IS WITHDRAWN
// RATHER THAN DEFERRED — ruled by the owner 2026-09-22, *"let's drop it for the
// pilot then."* It had a data path and the pilot fills none of it: `0018`'s
// tier 2 needs `track_expiry`, which C8.9's four-field create never turns on,
// and `7e` was rewritten to DERIVE shelf life from records the shop already
// produces. An always-empty panel is the thing the ruling refused, so this
// screen draws none.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE ROOM AT THE TOP IS FOR THE DEAD-LETTER BANNER, WHICH THIS FILE DOES
// NOT MOUNT AND CANNOT SEE.
// ----------------------------------------------------------------------------
// `DeadLetterBanner` is mounted at the ROOT and is absolutely positioned, so it
// draws OVER whatever is at the top of the screen underneath it — and as of the
// ruling of 2026-09-22 (*"let's keep it Home Only"*) the one screen underneath
// it is this one. What this row owes is therefore ROOM: `bannerRoom` in
// `@/offline/deadLetters` owns the arithmetic, so the banner's height has ONE
// home rather than two that drift apart by hiding the takings.
//
// ⚠️ AND THE SCROLL IS WHAT MAKES THAT ROOM A FLOOR RATHER THAN A PROMISE. The
// banner's pill is three lines of `bodySize` text and nothing outside a running
// renderer knows how tall that is; in `Letra grande` the cards and rows do not
// fit one screen either. So the content scrolls, and the worst case is a short
// drag rather than a number hidden under a strip.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11, and on this
// screen it is nearly everything.
// ----------------------------------------------------------------------------
// **The owner's phone is the whole instrument.** Nothing here will say whether
// the takings figure reads across a counter, whether three cards and two rows
// fit above the tab bar in `Letra grande`, whether the dead Proveedores row
// looks unfinished or looks honest, or whether the room at the top reads as
// deliberate or as a gap. ⚠️ ONE QUESTION IS ROUTED RATHER THAN ASKED BLIND:
// nothing in this app writes a sale until `5f`, so the figure is **$0.00 and 0
// ventas on every phone**. *Does a zero at the top of Inicio read as a quiet
// morning or as a broken app?* is a `5f` question — asking it today would be
// the `5c-iv-b` mistake the ruling of 2026-09-22 named.
//
// ⚠️ IT SHIPS NO MIGRATION. Every column behind the figure has been applied
// since `0003`.
// ============================================================================

export default function Inicio() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: PALETTE.fondo }}
      contentContainerStyle={{
        // ⚠️ THE BANNER'S ROOM. Reserved whether or not a banner is up — see
        // `bannerRoom`, which says why a gap that appears is worse than a gap
        // that was always there.
        paddingTop: bannerRoom(scale, insets.top),
        paddingHorizontal: scale.space,
        paddingBottom: scale.space * 2,
        gap: scale.space * 1.5,
      }}
    >
      {/* ⚠️ THE ORDER IS THE TABLE'S AND NOT THIS FILE'S — see the header. */}
      {INICIO_BLOCKS.map((block) => (
        <Bloque key={block} block={block} />
      ))}
    </ScrollView>
  );
}

/** One band of the screen. The `switch` is exhaustive by `InicioBlock`. */
function Bloque({ block }: { block: InicioBlock }) {
  switch (block) {
    case 'estado':
      return <Estado />;
    case 'tarjetas':
      return <Tarjetas />;
    case 'filas':
      return <Filas />;
    case 'cierre':
      return <Cierre />;
  }
}

/**
 * WHAT THE SHOP TOOK TODAY — the first thing on the screen, and the only thing
 * on it that is not tappable.
 *
 * ⚠️⚠️ IT DECIDES NEITHER NUMBER. `@/api/today` owns which rows are today's,
 * what a void does to the count, whether the figure may be shown at all and
 * what the line underneath says; `app/test/api-today.test.ts` reads all four and
 * `docs/checks/5d-iv-a-takings-contract.sh` drives them past a real PostgREST.
 * This draws what `useToday` returns.
 *
 * ⚠️ THE FIGURE IS WITHHELD RATHER THAN SHRUNK, and `ES.home.noFigure` is what
 * stands in its place — C3.12's character, on C3.12's reasoning and under its
 * own key: a confident `$0.00` on a phone that could not reach the database is
 * a number a shopkeeper would carry to her till.
 *
 * ⚠️ IT WILL LAG THE TILL BY WHATEVER THE QUEUE IS HOLDING. This is a SERVER
 * read; a sale rung up offline waits in the device's outbox (`5c`). That is not
 * a defect and it is `5f`'s question — see `useToday`.
 */
function Estado() {
  const { scale } = useDensity();
  const takings = useToday();

  return (
    <View style={{ gap: scale.rowGap / 2 }}>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{ES.home.today}</Text>
      <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: PALETTE.tinta }}>
        {showsTakings(takings) ? formatMXN(takings.grossCentavos) : ES.home.noFigure}
      </Text>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
        {takingsLine(takings.loading, takings.failed, takings)}
      </Text>
    </View>
  );
}

/**
 * THE THREE WORK MODULES, AS LARGE CARDS — §2.8's own word.
 *
 * ⚠️ THEY GO WHERE THE TABS GO, AND THE REDUNDANCY IS PAID FOR ON PURPOSE. The
 * amendment of 2026-09-17 says so in one line: it buys a fifth and sixth
 * destination — Productos and Proveedores — that otherwise have no home, because
 * C12.1 caps the tab bar at four.
 *
 * ⚠️ `router.navigate` AND NOT `push` FOR A TAB. Pushing would stack a second
 * copy of a screen the bar already owns, and the way back from Vender is the
 * tab bar rather than a back gesture. The rows below still `push`, because
 * Productos is somewhere you GO.
 */
function Tarjetas() {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap }}>
      {doorsOfShape('tarjeta').map((door) => (
        <Tarjeta key={door.key} door={door} />
      ))}
    </View>
  );
}

function Tarjeta({ door }: { door: InicioDoor }) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={door.label}
      onPress={() => {
        if (door.route !== null) router.navigate(door.route);
      }}
      style={{
        // ⚠️ `rowHeight` AND NOT `tapTarget` — this is C3.18's *taller rows*
        // token, and a card §2.8 calls large should be visibly bigger than the
        // rows under it rather than merely tappable.
        minHeight: scale.rowHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.space,
        paddingHorizontal: scale.space * 1.5,
        paddingVertical: scale.space,
        borderRadius: scale.space,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        // ⚠️ `accionSuave`, WHOSE ONE JOB IS *the resting fill of an action, so
        // it reads as tappable at rest* — the same role `5d-iii` put under the
        // initials tile. These three cards are what the shop DOES all day.
        backgroundColor: PALETTE.accionSuave,
      }}
    >
      {/* C12.1 — the icon NEVER appears without its word. */}
      <MaterialCommunityIcons name={door.icon} size={scale.iconSize} color={PALETTE.accion} />
      <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}>
        {door.label}
      </Text>
    </Pressable>
  );
}

/**
 * THE TWO ROOMS THE TAB BAR HAD NO SPACE FOR — §2.8's rows, and the fifth and
 * sixth destinations the amendment bought.
 *
 * ⚠️⚠️ PROVEEDORES IS DRAWN AND IS DRAWN DEAD. `6b` builds the screen behind
 * it; until then the row is here because a shopkeeper should see what is coming,
 * and it carries `ES.home.notYet` because a door that looks live and opens onto
 * nothing is worse than one that is obviously not built. That is `5d-iii`'s
 * ruling applied to a door rather than to a button, and `ES.approvals.notYet`
 * before it — both deleted by the task that makes the thing work.
 */
function Filas() {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap }}>
      {doorsOfShape('fila').map((door) => (
        <View key={door.key} style={{ gap: scale.rowGap / 2 }}>
          <Fila
            icon={door.icon}
            label={door.label}
            open={isOpen(door)}
            onPress={() => {
              if (door.route !== null) router.push(door.route);
            }}
          />
          {isOpen(door) ? null : (
            <Text
              style={{
                fontSize: scale.bodySize,
                color: PALETTE.tintaApagada,
                paddingHorizontal: scale.space * 1.5,
              }}
            >
              {ES.home.notYet}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * THE BELL AND AJUSTES, PLACED AT LAST — and *at last* is both of its meanings.
 * Neither was where it ends up: the bell sat in the body because `5b-iii-d-1`
 * had nowhere better, and Ajustes was a button alone in the centre of a
 * placeholder.
 *
 * ⚠️ THEY ARE LAST AND NOT FIRST BECAUSE NEITHER IS WORK. §2.8 puts state at
 * the top and the doors below it; approving somebody and changing the text size
 * are things you do between customers, on the screen you open between
 * customers.
 */
function Cierre() {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap }}>
      <Solicitudes />
      <Fila
        icon="cog-outline"
        label={ES.settings.title}
        open
        onPress={() => router.push('/ajustes')}
      />
    </View>
  );
}

/**
 * THE ONE ROW SHAPE THIS SCREEN REPEATS — an icon, its word, and whatever the
 * caller wants on the right.
 *
 * ⚠️ IT IS A COMPONENT RATHER THAN A SECOND COPY OF THE SAME TWELVE STYLE
 * LINES. `5b-iii-d-1` added the second door on this screen and the cheap move
 * was to paste the first one, which is the stale-duplicate defect in its
 * smallest form: two rows that drift apart the first time one is restyled.
 * `5d-iv-b` added the third and fourth without touching it.
 *
 * ⚠️⚠️ `open` IS WHAT A DEAD DOOR LOOKS LIKE, AND IT IS NOT COLOUR ALONE. The
 * ink drops to `tintaApagada` AND `accessibilityState` says disabled AND the
 * sentence under it says so in Spanish — three signals, because the palette's
 * own header records that `accion` and `atencion` are one man in twelve's
 * red-green pair, so state is never carried by colour by itself here.
 */
function Fila({
  icon,
  label,
  open,
  onPress,
  right,
}: {
  icon: InicioDoor['icon'] | 'bell-outline' | 'cog-outline';
  label: string;
  open: boolean;
  onPress: () => void;
  right?: ReactNode;
}) {
  const { scale } = useDensity();
  const ink = open ? PALETTE.tinta : PALETTE.tintaApagada;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !open }}
      disabled={!open}
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
      <MaterialCommunityIcons name={icon} size={scale.iconSize} color={ink} />
      <Text style={{ fontSize: scale.bodySize, color: ink }}>{label}</Text>
      {right}
    </Pressable>
  );
}

/**
 * THE BELL — C11.8, and the count behind it. Plan task `5b-iii-d-1`.
 *
 * ⚠️⚠️ ABSENT ENTIRELY FOR ANYBODY WHO IS NOT AN OWNER, which is `useRoster`'s
 * `visible` rule and is the fence itself rather than a decoration on one.
 * `0037` answers a non-owner with an empty list rather than a refusal (its
 * decision 2), so *"you may not see this"* and *"nobody is waiting"* are the
 * same answer on the wire — `usePendingRequests` decides which BEFORE the call,
 * and a manager is shown no control rather than an empty room.
 *
 * ⚠️ AN OWNER WITH AN EMPTY QUEUE STILL GETS THE ROW, WITH NO BADGE ON IT. The
 * badge reports a COUNT and its absence means zero, while the row's absence
 * means the queue is not yours. A door that vanished when the room was empty
 * would also be a door nobody could find to check.
 *
 * ⚠️ AND IT IS NOT HIDDEN WHILE THE READ IS OUT. `loading` is true for a moment
 * on every open; a row that appeared a beat late would be a control that moves
 * under a thumb already travelling towards Ajustes.
 *
 * ⚠️ IT IS IN THE BODY AND NOT IN THE NAVIGATOR'S HEADER, and this screen has
 * recorded why since before it was a screen: C12.1 forbids an icon with no word
 * beside it, and a header corner has no room for one.
 */
function Solicitudes() {
  const queue = usePendingRequests();
  if (!queue.visible) return null;
  return (
    <Fila
      icon="bell-outline"
      label={ES.approvals.bell}
      open
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

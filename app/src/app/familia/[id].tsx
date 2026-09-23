import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog, useMyRole } from '@/api/hooks';
import { familyLine, familyView, type CatalogEntry } from '@/api/catalog';
import { canWriteCatalog } from '@/api/catalogWrite';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// LA FAMILIA — THE ONE SURFACE IN THIS APP WHERE THE FAMILY/VARIANT STRUCTURE
// IS VISIBLE AT ALL. Plan task `5d-iii`, and the app's fourth non-tab surface.
//
// ⚠️⚠️ IT IS REACHED BY TAPPING A VARIANT, WHICH IS THE OWNER'S OWN CORRECTION
// OF AN INTERVIEW ANSWER. C8.13 was drawn as a grid of family tiles opening
// into a family; on 2026-09-15 he made Productos VARIANT-FIRST, and the half
// of the constraint that survived untouched is this screen — the family with
// its variants at sight, each with its price, plus `Agregar Variante`,
// `Costos` and `Editar`. Everywhere else this app is flat on purpose (C3.1).
//
// ⚠️⚠️ THE TAPPED VARIANT IS MARKED AND CARRIES NO LEGEND — área 13, ruling 4,
// in the owner's words: *"the preselected variant shows no legend."* So the
// mark is a GREEN LEFT RULE AND A HEAVIER NAME, never a word like
// *seleccionado*. That is also the one aesthetic rule direction C left behind
// when B was chosen — no state is announced by colour ALONE — satisfied here
// as colour AND a border, because the word is what the ruling forbade.
// ⚠️ A screen reader is told in the one way that is not a legend:
// `accessibilityState.selected`, which a person who cannot see the rule needs
// and a person who can never hears.
//
// ⚠️⚠️ TWO OF THE THREE AFFORDANCES WORK AS OF `5e-iii-b`, AND ONE IS STILL
// DRAWN PLAINLY DEAD. `Agregar Variante` is C8.12's SECOND door into `Agregar`
// and the one where the family question is not asked at all — it pushes
// `/producto/nuevo?familia=<this family>`, and the form attaches the new variant
// here without offering a choice, which is the constraint in the owner's own
// words. ⚠️⚠️ WITH ONE EXIT, ADDED 2026-09-23: if he picks a unit this family
// cannot hold, the form RELEASES the family and the family question comes back —
// because *no question asked* has stopped being true, and hiding the field would
// hide the one thing that changed. C8.5 is why (one family, one kind of
// measurement) and nothing in the database enforces it. ⚠️⚠️ It is **absent for a cashier**: all three of these WRITE,
// `product_variant_insert` and `product_family_insert` are both
// `has_role(…, 'manager')` in `0002`, and the refusal is a bare `42501` with no
// sentence of its own, so `canWriteCatalog` keeps the control off her screen
// entirely rather than letting it look live ([[shift-cover-is-a-reassignment]]).
//
// ⚠️ `Costos` STAYS A `View` AND STAYS DEAD, by a ruling rather than by inertia:
// *"leave Costos dead until `5g`"* (2026-09-22), because nothing writes a
// purchase until Comprar exists and a costs view built now would show an empty
// list on every product in the shop, for ever. ⚠️ Deleting it was refused for
// `5d-iv-b`'s Proveedores reason — an affordance a shop has seen and then seen
// vanish reads as an app getting smaller.
//
// ⚠️⚠️ AND `ES.family.notYet` HAS NOW BEEN REWORDED TWICE RATHER THAN DELETED,
// WHICH IS THE HALF A ONE-LINE CHANGE KEEPS MISSING. At `5d-iii` it said *"solo
// puedes ver; todavía no se puede agregar ni editar"* — three dead buttons; at
// `5e-ii` it dropped *agregar*; here it drops *editar*, because a sentence that
// names a control which works is false while still rendering green. `5g` deletes
// what is left of it.
//
// ⚠️⚠️ THE VARIANT ROWS ARE PRESSABLE AS OF `5e-iii-b`, AND `5d-iii` SAID THIS IS
// THE DAY THEY WOULD BE. That header wrote: the selection is a record of where
// you came from and nothing consumes it yet, so *the day `Editar` acts on a
// variant is the day moving the mark means something*. `Editar` now does, so a
// tap moves the mark and the mark is what the button opens. ⚠️ A row still does
// not NAVIGATE — pressing it changes which product the controls below are about,
// which is why it keeps `accessibilityState.selected` and gains no chevron.
//
// ⚠️⚠️ AND `Editar` IS ABSENT WHEN NOTHING IS MARKED, WHICH IS NOT A THIRD
// VISUAL STATE BUT THE ABSENCE OF AN UNANSWERABLE QUESTION. Every real door into
// this screen passes `?variante` (Productos is the only one), so a family opened
// with no mark is a deep link — and *edit which one?* has no answer until he
// taps a row, at which point the control appears beside the one he tapped.
//
// ⚠️ IT DECIDES NOTHING ABOUT THE CATALOG, AND IT PERFORMS NO READ OF ITS OWN.
// `useCatalog()` is the same one round trip Productos already made and
// TanStack Query already holds, filtered to one `family_id` by `familyView` in
// `@/api/catalog` — so opening a family works with no signal, which is the
// ordinary condition in the pilot store. A `?family_id=eq.…` read here would
// be a screen that works at the counter and spins in the stockroom.
//
// ⚠️ A PUSHED SCREEN AND NOT A SHEET, like Productos and for its reason: you
// went INTO it, so the control says *Volver* and the root `Stack` draws no
// header of its own. ⚠️ It is at the ROOT and in NO GROUP, so `groupOf()`
// calls it `null` and `redirectFor` leaves a member exactly where they are.
// ⚠️ NOT in `RESTORABLE_ROUTES`: C1.3 reopens the screen a person was WORKING
// on, and reading a product is not work — the same call Productos made.
//
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11, and on this
// screen it is nearly all of it. Nothing here will ever say whether the mark
// reads as *this is the one you tapped* rather than as an alert, whether a row
// that highlights under a thumb and goes nowhere reads as a selection or as a
// link that failed, whether ONE amber price among six reads as *price this* or
// as *something is broken*, whether two live buttons beside one dead one reads
// as a step forward or as a row that is half finished, or whether a family of
// six variants fits above the fold at *Letra grande*. **The instrument is the
// owner's phone.** The half that is checkable — which variants belong, which one
// is marked, what an empty screen says — is in `@/api/catalog` on purpose.
// ============================================================================

export default function Familia() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  // ⚠️ THE FAMILY IS THE PATH AND THE VARIANT IS A QUERY PARAMETER, WHICH IS
  // WHAT EACH ONE IS. The family is the thing this screen shows; the tapped
  // variant only marks a row in it — and a link that lost the parameter still
  // opens the right family, with nothing marked.
  const { id, variante } = useLocalSearchParams<{ id: string; variante?: string }>();
  const { loading, entries, failed } = useCatalog();

  // ⚠️⚠️ THE ROUTE SEEDS THE MARK AND THE THUMB MOVES IT, AND `null` IS WHAT
  // KEEPS THOSE TWO FROM FIGHTING. `useState(variante)` alone would ignore a
  // later parameter and an effect that synced it would undo a tap on the next
  // render — `nuevo.tsx`'s recorded trap about its own prefill. `null` means
  // *he has not tapped*, so the link's answer stands until he gives one.
  const [tapped, setTapped] = useState<string | null>(null);
  const family = familyView(entries, id, tapped ?? variante);
  const mayWrite = canWriteCatalog(useMyRole());

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda title={family.title} />

      <ScrollView
        // ⚠️ A `ScrollView` AND NOT A `FlatList`, WHICH IS THE OPPOSITE CALL
        // FROM PRODUCTOS AND THE SAME ARGUMENT. There the list is ~100 rows on
        // two low-end Androids (C8.3, C1.1) and virtualising is the difference
        // between a scroll and a stutter; a family is a handful of sizes of one
        // product, and the three affordances below have to scroll WITH them
        // rather than float over them — which still holds now that two of the
        // three are live: a button that floated would cover a variant's price.
        contentContainerStyle={{
          padding: scale.space,
          gap: scale.space,
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
      >
        {family.variants.length === 0 ? (
          <Vacio line={familyLine(loading, failed)} />
        ) : (
          <View
            style={{
              borderWidth: 1,
              borderColor: PALETTE.linea,
              borderRadius: scale.space / 2,
              backgroundColor: PALETTE.superficie,
              overflow: 'hidden',
            }}
          >
            {family.variants.map((entry, index) => (
              <View key={entry.id}>
                {index === 0 ? null : (
                  <View style={{ borderBottomWidth: 1, borderBottomColor: PALETTE.linea }} />
                )}
                <Variante
                  entry={entry}
                  selected={entry.id === family.selectedId}
                  mayWrite={mayWrite}
                  onPress={() => setTapped(entry.id)}
                />
              </View>
            ))}
          </View>
        )}

        <Acciones familyId={id} variantId={family.selectedId} mayWrite={mayWrite} />
      </ScrollView>
    </View>
  );
}

/** The family's own name, and the way back to the list you came from. */
function Banda({ title }: { title: string }) {
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
      {/* ⚠️ THE FAMILY'S NAME AND NOT THE WORD *Familia*: this banda is the
          only place the family is named at all, and a heading that said
          *Familia* over a list of cheeses would be a label where a name
          belongs. `familyTitle` is what falls back when there is no name. */}
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: scale.titleSize,
          fontWeight: '700',
          color: PALETTE.tinta,
        }}
      >
        {title}
      </Text>
      <Volver />
    </View>
  );
}

/** ⚠️ *Volver* and never *Cerrar* — Productos' own control, one screen down. */
function Volver() {
  const { scale } = useDensity();
  return (
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
        {ES.family.back}
      </Text>
    </Pressable>
  );
}

/**
 * One variant of the family: its name, its price, and the mark if it is the
 * one that was tapped.
 *
 * ⚠️⚠️ NO LEGEND ON THE MARKED ROW (área 13, ruling 4). No *seleccionado*, no
 * tick, no badge — a green rule down its edge and a heavier name, which is
 * colour AND a border and therefore still obeys the one rule direction C left
 * behind: no state is ever announced by colour alone.
 *
 * ⚠️ NO INITIALS TILE, AND PRODUCTOS KEEPS ITS OWN. C8.14's two letters stand
 * in for a PHOTO in a list of different products; a family is one product in
 * several sizes, so six identical tiles down one screen would be six copies of
 * a picture nobody needs — and the tile is what makes a row look tappable
 * there, which these rows are not.
 *
 * ⚠️⚠️ THE MISSING PRICE IS AMBER AS OF `5e-iii-b`, AND ONLY FOR SOMEBODY WHO
 * CAN ACT ON IT. `5d-iii` drew it in `tintaApagada` and wrote *look at this again
 * when `5e` lands*; `5e-ii` looked and left it, because `Agregar` could CREATE a
 * priceless product and nothing anywhere could yet PRICE one. This task is where
 * that stopped being true: `Editar` is on this screen, so C3.17's *the fix is one
 * tap away* is literally the case — one tap of the control below.
 *
 * ⚠️⚠️ AND IT IS `tintaApagada` FOR A CASHIER, WHICH IS THE OWNER'S RULING OF
 * 2026-09-23 IN ITS SECOND HALF. *"Leave the fence as is"* keeps `price_list`
 * manager-and-above, so *the fix is one tap away* is true **for the people who
 * can make the tap** — and a cashier shown an alarm she can never silence is a
 * colour that means *act* where there is no act, which is how a role acquires a
 * second job. §2.11 fences `atencion` to C3.17 alone, so this is now that colour's
 * only use in the app and it has a rule rather than a guess.
 *
 * ⚠️ PRODUCTOS KEEPS THE QUIET DASH, DELIBERATELY AND NOT BY OVERSIGHT. Nothing
 * on that screen sets a price — it is two taps away through this one — and C8.2
 * has the owner seeding the catalog DELIBERATELY SHORT, so a flat list of ~100
 * products would open amber on most of its rows for the pilot's first week. An
 * alarm on a hundred rows is the alarm nobody can silence, one screen out.
 * ⚠️ `R9`: whether one amber row among six reads as *price this* rather than as
 * *something is broken* is the owner's phone's question, not a check's.
 */
function Variante({
  entry,
  selected,
  mayWrite,
  onPress,
}: {
  entry: CatalogEntry;
  selected: boolean;
  mayWrite: boolean;
  onPress: () => void;
}) {
  const { scale } = useDensity();
  // ⚠️⚠️ AMBER ONLY WHEN THERE IS SOMETHING TO DO AND SOMEBODY WHO MAY DO IT.
  // See this function's header: C3.17's *the fix is one tap away* is true of a
  // manager standing on this screen and false of a cashier on any screen.
  const missing = entry.centavos === null;
  const alarm = missing && mayWrite;
  return (
    <Pressable
      accessible
      // ⚠️ THE ONE WAY THE MARK IS SPOKEN. A legend is a word on the screen and
      // the ruling forbids it; this is the state a screen reader announces and
      // nobody else hears, which is what a person who cannot see the green rule
      // needs to know she opened the product she tapped.
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[entry.name, entry.price].filter((part) => part !== '').join('. ')}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        minHeight: scale.rowHeight,
        paddingVertical: scale.rowGap,
        paddingHorizontal: scale.space,
        backgroundColor: PALETTE.superficie,
        // ⚠️ THE WIDTH IS CONSTANT AND THE COLOUR IS WHAT CHANGES. A rule that
        // appeared only on the marked row would shove its name three pixels
        // sideways — the one row on the screen that then does not line up with
        // the others, which reads as a rendering fault rather than a mark.
        borderLeftWidth: 3,
        borderLeftColor: selected ? PALETTE.accion : PALETTE.superficie,
      }}
    >
      <Text
        numberOfLines={2}
        style={{
          flex: 1,
          fontSize: scale.bodySize,
          fontWeight: selected ? '700' : '500',
          color: PALETTE.tinta,
        }}
      >
        {entry.name}
      </Text>
      <Text
        style={{
          fontSize: scale.bodySize,
          fontWeight: '600',
          color: alarm ? PALETTE.atencion : missing ? PALETTE.tintaApagada : PALETTE.tinta,
        }}
      >
        {entry.price}
      </Text>
    </Pressable>
  );
}

/**
 * `Agregar Variante`, `Editar` and `Costos` — the three affordances C8.13 puts
 * with the family. As of `5e-iii-b` two of them work and one does not, and the
 * difference is drawn rather than explained.
 *
 * ⚠️⚠️ THE LIVE ONES ARE `Pressable`s IN THE ACTION COLOUR AND THE DEAD ONE IS A
 * `View` IN `tintaApagada`. `accion` and `accionSuave` mean *this is tappable at
 * rest*, which is exactly the claim `Costos` must not make; and a dead one is a
 * `View` and not a disabled `Pressable` because there is no handler to attach and
 * therefore no press path to wire up wrong later. ⚠️ The role and the disabled
 * state are what a screen reader needs, and it gets both.
 *
 * ⚠️⚠️ AND BOTH LIVE ONES ARE ABSENT ALTOGETHER FOR A CASHIER — never disabled
 * for her, which would be a third visual state on one row. `canWriteCatalog` is
 * `0002`'s own predicate, and it covers the UPDATE policies as well as the INSERT
 * ones: the owner ruled *"leave the fence as is"* on 2026-09-23, so
 * `product_variant_update` and both `price_list` write policies stay
 * manager-and-above. ⚠️⚠️ ON AN UPDATE HER REFUSAL WOULD NOT EVEN BE A REFUSAL —
 * a `using` clause hides the row and PostgREST answers 200 with `[]` — so a live
 * `Editar` for her is the silent-failure shape [[shift-cover-is-a-reassignment]]
 * records, arriving through a success code.
 *
 * ⚠️ `role === null` — the membership read still out — is fenced out WITH her, so
 * the controls fade in when the answer lands rather than being snatched away.
 *
 * ⚠️ `Agregar Variante` CARRIES THE FAMILY AND `Editar` CARRIES THE VARIANT,
 * WHICH IS WHAT EACH ONE IS ABOUT. C8.12: from inside an opened family the new
 * variant belongs to that family, *no question asked*. An edit is about one
 * product, and the one it is about is the marked row.
 *
 * ⚠️⚠️ `Editar` IS ABSENT WHEN NOTHING IS MARKED rather than disabled: *edit
 * which one?* has no answer, and every real door into this screen passes the
 * variant. See this file's header.
 */
function Acciones({
  familyId,
  variantId,
  mayWrite,
}: {
  familyId: string;
  variantId: string | null;
  mayWrite: boolean;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap }}>
        {mayWrite && (
          <Accion
            label={ES.family.addVariant}
            onPress={() =>
              router.push({ pathname: '/producto/nuevo', params: { familia: familyId } })
            }
          />
        )}
        {mayWrite && variantId !== null && (
          <Accion
            label={ES.family.edit}
            onPress={() =>
              router.push({ pathname: '/producto/[id]', params: { id: variantId } })
            }
          />
        )}
        <View
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          style={{
            minHeight: scale.tapTarget,
            justifyContent: 'center',
            paddingHorizontal: scale.space,
            borderRadius: scale.space / 2,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            backgroundColor: PALETTE.fondo,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tintaApagada }}>
            {ES.family.costs}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
        {ES.family.notYet}
      </Text>
    </View>
  );
}

/** One of the controls that works. ⚠️ A word and never a glyph alone (C12.1). */
function Accion({ label, onPress }: { label: string; onPress: () => void }) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: scale.tapTarget,
        justifyContent: 'center',
        paddingHorizontal: scale.space,
        borderRadius: scale.space / 2,
        borderWidth: 1,
        borderColor: PALETTE.accion,
        backgroundColor: PALETTE.accionSuave,
      }}
    >
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * An empty family screen, and the two things it can mean.
 *
 * ⚠️⚠️ THREE STATES AS OF 2026-09-22, NOT TWO — a FAILED read is its own fact,
 * and on this screen it is the sharpest of the three: telling a shopkeeper the
 * product in her hand is gone, because the app could not ask, is worse than
 * either of the others. `familyLine` puts failure ahead of both.
 *
 * ⚠️⚠️ *THE READ HAS NOT LANDED* IS NOT *THIS PRODUCT IS GONE*. This screen is
 * opened by tapping a row, so on a cold start with no signal the catalog is
 * briefly empty — and a screen that said *ya no está en el catálogo* then
 * would be telling a shopkeeper her product had been deleted while she is
 * holding it. The choice is `familyLineKey`'s, in `@/api/catalog`, where
 * `app/test/api-catalog.test.ts` reads it (`R3`, `R4`).
 */
function Vacio({ line }: { line: string }) {
  // ⚠️ A SENTENCE AND NOT THE FAILURE KEY — `R12`: a route may not import
  // `@/api/errors`, the module that decides what a failure means. `familyLine`
  // is called where the hook's result already is, one function up.
  const { scale } = useDensity();
  return (
    <View style={{ padding: scale.space * 2, alignItems: 'center' }}>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
        {line}
      </Text>
    </View>
  );
}

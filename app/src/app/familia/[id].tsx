import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog } from '@/api/hooks';
import { familyLine, familyView, type CatalogEntry } from '@/api/catalog';
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
// ⚠️⚠️ THE THREE AFFORDANCES ARE DRAWN AND THEY ARE PLAINLY DEAD. Every one of
// them WRITES — `product_variant_insert` and `product_family_insert` are both
// `has_role(…, 'manager')` in `0002` — and `5d` is the catalog being READ.
// They are `View`s and not disabled `Pressable`s: there is no handler to
// attach, so there is no press path to wire up wrong later. `ES.family.notYet`
// is the sentence that keeps them from reading as broken, and `5e` deletes it
// exactly as `5b-iii-d-2` deleted `ES.approvals.notYet`.
//
// ⚠️ AND THE VARIANT ROWS HERE ARE NOT PRESSABLE EITHER, for the same reason
// one task along: the selection is a record of where you came from, and
// NOTHING CONSUMES IT YET. The day `Costos` and `Editar` act on a variant is
// the day moving the mark means something; until then a row that highlighted
// under a thumb and changed nothing is the control this whole step refuses.
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
// reads as *this is the one you tapped* rather than as an alert, whether three
// dead buttons look deliberate rather than broken, or whether a family of six
// variants fits above the fold at *Letra grande*. **The instrument is the
// owner's phone.** The half that is checkable — which variants belong, which
// one is marked, what an empty screen says — is in `@/api/catalog` on purpose.
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
  const family = familyView(entries, id, variante);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda title={family.title} />

      <ScrollView
        // ⚠️ A `ScrollView` AND NOT A `FlatList`, WHICH IS THE OPPOSITE CALL
        // FROM PRODUCTOS AND THE SAME ARGUMENT. There the list is ~100 rows on
        // two low-end Androids (C8.3, C1.1) and virtualising is the difference
        // between a scroll and a stutter; a family is a handful of sizes of one
        // product, and the three affordances below have to scroll WITH them
        // rather than float over them.
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
                <Variante entry={entry} selected={entry.id === family.selectedId} />
              </View>
            ))}
          </View>
        )}

        <Acciones />
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
 * ⚠️ THE MISSING PRICE IS A DASH IN `tintaApagada` AND NEVER AMBER, which is
 * Productos' call and its reason: `atencion`'s one job is C3.17, a missing
 * price BLOCKING a sale where the fix is one tap away. Nothing on this screen
 * can set a price yet — `Editar` is `5e` — so amber here is an alarm nobody
 * can silence. ⚠️ Look at this one again when `5e` lands.
 */
function Variante({ entry, selected }: { entry: CatalogEntry; selected: boolean }) {
  const { scale } = useDensity();
  return (
    <View
      accessible
      // ⚠️ THE ONE WAY THE MARK IS SPOKEN. A legend is a word on the screen and
      // the ruling forbids it; this is the state a screen reader announces and
      // nobody else hears, which is what a person who cannot see the green rule
      // needs to know she opened the product she tapped.
      accessibilityState={{ selected }}
      accessibilityLabel={[entry.name, entry.price].filter((part) => part !== '').join('. ')}
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
          color: entry.centavos === null ? PALETTE.tintaApagada : PALETTE.tinta,
        }}
      >
        {entry.price}
      </Text>
    </View>
  );
}

/**
 * `Agregar Variante`, `Costos` and `Editar` — the three affordances C8.13 puts
 * with the family, and every one of them is inert.
 *
 * ⚠️⚠️ THEY ARE DRAWN DEAD RATHER THAN LEFT OUT, WHICH IS A CHOICE AND NOT A
 * PLACEHOLDER. All three WRITE, and `5d` is the catalog being read; `5e` is
 * the task that builds them. Leaving them out would hide where the work lands;
 * drawing them live would be a control that refuses silently — and a
 * shopkeeper who taps *Editar* and gets nothing concludes her phone is broken.
 * The sentence underneath is what makes the difference, and `5e` deletes it.
 *
 * ⚠️ THEY BORROW NO ACTION COLOUR. `accion` and `accionSuave` mean *this is
 * tappable at rest*, which is exactly the claim these must not make, so they
 * are `tintaApagada` on the screen's own ground inside a `linea` border. The
 * same argument the initials tile made about its ground one screen down.
 *
 * ⚠️ AND THEY ARE `View`s, NOT DISABLED `Pressable`s. There is no handler to
 * attach and therefore no press path to wire up wrong; the role and the
 * disabled state are what a screen reader needs, and it gets both.
 */
function Acciones() {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap }}>
        {[ES.family.addVariant, ES.family.costs, ES.family.edit].map((word) => (
          <View
            key={word}
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
              {word}
            </Text>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
        {ES.family.notYet}
      </Text>
    </View>
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

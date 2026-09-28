import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { initials } from '@/api/catalog';
import { useMyRole, useProviders } from '@/api/hooks';
import {
  canWriteProviders,
  providerLine,
  providerRows,
  type ProviderRowView,
} from '@/api/providerDirectory';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { Buscador } from '@/ui/Buscador';
import { Destello } from '@/ui/Destello';
import { Separador } from '@/ui/Separador';
import { Vacio } from '@/ui/Vacio';

// ============================================================================
// PROVEEDORES — WHO THIS SHOP BUYS FROM. Plan task `6b`, and the screen behind
// the one door on Inicio that has been drawn DEAD since `5d-iv-b` shipped it.
//
// ⚠️⚠️ IT DRAWS COMPRAR'S OWN PROVIDER READ AND NOT A DIRECTORY QUERY OF ITS OWN,
// which is the one structural decision on this screen and is
// `@/api/providerDirectory`'s header at length. `useProviders(null)` is the read
// the delivery picker already makes, so this directory and that picker cannot
// disagree about which suppliers exist — and opening Proveedores after Comprar
// costs no round trip at all.
//
// ⚠️ THE CONSEQUENCE, SAID HERE BECAUSE IT IS WHAT A PERSON WILL NOTICE FIRST: a
// row carries a NAME and nothing else. The phone and the contact are on the
// detail screen, because `PROVIDER_COLUMNS` deliberately does not ask for them and
// `docs/checks/5g-i-purchase-contract.sh` asserts by name that they never reach a
// phone through Comprar's read. Putting a number on the row means amending that
// check. ✅ RULED 2026-09-28 by the owner: the row stays a name.
//
// ⚠️⚠️ THE SEARCH IS THE WAY A SUPPLIER GETS CREATED, AND THERE IS NO `Agregar`
// BUTTON — the owner's ruling of 2026-09-23 about Productos, applied here rather
// than re-decided. His words were *"this allows us to discard partially duplicate
// product creation"*, and a supplier directory has the same failure in a worse
// form: `provider_name_unique` is on `normalized_name`, so *Bodega Centro* and
// *Bodega del Centro* are two rows Postgres accepts happily and
// `provider_price_memory` then splits down the middle — two prefills for one
// supplier, each holding half of what was paid. **He types the name, he is shown
// every supplier he already has under it, and only then does the typed name become
// a row with *Crear Nuevo Proveedor* under it.**
//
// ⚠️ THE ROWS ARE `providerRows`' AND THE FENCE IS IN IT (`R3`). A cashier gets a
// list with no create row — `provider_insert` is `has_role(…, 'manager')` in
// `0002` — but she is NOT kept off this screen: `provider_select` admits every
// member of the shop, and a directory is a thing you look something up in. See
// `canWriteProviders`, which is the applied policy and nothing more.
//
// ⚠️⚠️ AND A SUPPLIER JUST CREATED COMES BACK INTO SIGHT AND BLINKS — the
// `?nuevo=` arrangement `productos.tsx` established and the owner asked for in his
// own words (*"an intermitent animation… don't [add] any other indicator like a
// line or anything"*), so there is no rule, no badge and no colour on that row.
// ⚠️ The blink itself is `@/ui/Destello` as of this task: this screen is the
// SECOND file to draw it, which is what `R14` waits for.
//
// ⚠️ IT DECIDES NOTHING ABOUT THE SUPPLIERS. Which ones exist, in what order, what
// a typed search matches and whether the create row appears are all in
// `@/api/providers` and `@/api/providerDirectory`, where
// `app/test/api-provider-directory.test.ts` reads them and
// `docs/checks/6b-provider-directory-contract.sh` drives them against a real
// database.
//
// ⚠️ NOT IN `RESTORABLE_ROUTES`, deliberately — `productos.tsx`'s call and its
// reason: C1.3 reopens the screen a person was WORKING on, and looking up a
// supplier's number is not work.
//
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11. Whether a list of
// bare names reads as a directory or as an unfinished screen; whether the generic
// row's line under it explains itself or just adds noise; whether a shop with
// three suppliers wants a search box at all. **The instrument is the owner's
// phone**, and those questions are in this task's row in `docs/PLAN.md`.
// ============================================================================

export default function Proveedores() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  const [typed, setTyped] = useState('');
  // ⚠️ `useProviders(null)` — the NULL IS THE WHOLE ARGUMENT. Passing a provider
  // id would make this screen read that supplier's price memory, which is a
  // manager-only view it has no use for and would put every price this shop has
  // paid onto a screen that draws none of them.
  const { loading, providers, failed } = useProviders(null);
  const mayCreate = canWriteProviders(useMyRole());

  // ⚠️ THE SUPPLIER JUST CREATED ARRIVES AS A ROUTE PARAMETER, not as state this
  // screen kept: it was unmounted-or-not while the form was open, and a variable
  // here would be empty on the path where the form replaced it.
  const { nuevo } = useLocalSearchParams<{ nuevo?: string }>();

  const rows = providerRows(providers, typed, mayCreate);
  const list = useRef<FlatList<ProviderRowView>>(null);
  const box = useRef<TextInput>(null);

  // ⚠️⚠️ THE SEARCH BOX IS CLEARED AND BLURRED FIRST, AND WITHOUT THIS THE BLINK
  // IS POINTLESS — `productos.tsx`'s measured fix, twice over. `router.dismissTo`
  // pops back to the Proveedores ALREADY IN THE STACK, so `typed` survives, and
  // the word he typed to reach the create row is a word the supplier he just made
  // MATCHES: he would land on a filtered list of exactly one row. ⚠️ And the box
  // is BLURRED rather than the keyboard merely dismissed, because this component
  // stayed mounted under the pushed form with its `TextInput` still focused —
  // dismissing a keyboard whose input is still focused is a keyboard that comes
  // back.
  useEffect(() => {
    if (nuevo === undefined) return;
    setTyped('');
    box.current?.blur();
    Keyboard.dismiss();
  }, [nuevo]);

  // ⚠️⚠️ THE SCROLL WAITS FOR THE ROW TO EXIST. The create invalidates
  // `PROVIDERS_KEY`, so on the frame this screen comes back the new supplier is
  // usually NOT in `providers` yet — a `scrollToIndex` fired then throws on an
  // out-of-range index. ⚠️ It also waits for the box to be EMPTY, or it would
  // scroll to the row's position in the filtered list and then the list would
  // change underneath it.
  const scrolled = useRef<string | null>(null);
  const at =
    nuevo === undefined
      ? -1
      : rows.findIndex((row) => row.kind === 'provider' && row.provider.id === nuevo);
  useEffect(() => {
    if (nuevo === undefined || typed !== '' || at < 0 || scrolled.current === nuevo) return;
    scrolled.current = nuevo;
    list.current?.scrollToIndex({ index: at, viewPosition: 0.5, animated: true });
  }, [nuevo, typed, at]);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda />
      <Buscador value={typed} onChange={setTyped} box={box} placeholder={ES.providers.search} />

      <FlatList
        ref={list}
        // ⚠️ A `FlatList` AND NOT A `ScrollView`, for `productos.tsx`'s reason
        // rather than by habit: C1.1 puts two LOW-END ANDROIDS among the pilot's
        // phones, and a `ScrollView` mounts every row at once. A shop's supplier
        // list is shorter than its catalog — but *shorter today* is a fact about
        // the pilot seed, not about the component.
        data={rows}
        keyExtractor={(row) => (row.kind === 'create' ? 'crear' : row.provider.id)}
        renderItem={({ item }) =>
          item.kind === 'create' ? (
            <Crear name={item.name} />
          ) : (
            <Fila
              id={item.provider.id}
              name={item.provider.name}
              generic={item.provider.isGeneric}
              nuevo={item.provider.id === nuevo}
            />
          )
        }
        ItemSeparatorComponent={Separador}
        ListEmptyComponent={<Vacio line={providerLine(loading, typed, failed)} />}
        // ⚠️ THE ROWS ARE A FIXED HEIGHT TO THE VIRTUALISER'S EYE, which is what
        // lets `scrollToIndex` reach a row it has not drawn yet;
        // `onScrollToIndexFailed` is the belt to that braces.
        onScrollToIndexFailed={({ index }) => {
          list.current?.scrollToOffset({ offset: index * scale.rowHeight, animated: true });
        }}
        contentContainerStyle={{ paddingBottom: scale.space * 2 + insets.bottom }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

/** The room's name and the way back. `productos.tsx`'s `Banda`, one word over. */
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
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: scale.titleSize,
          fontWeight: '700',
          color: PALETTE.tinta,
        }}
      >
        {ES.providers.title}
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
          {ES.providers.back}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * One supplier: two letters, the name, and the way into her detail.
 *
 * ⚠️⚠️ EVERY ROW IS PRESSABLE INCLUDING FOR A CASHIER, which is where this parts
 * company with `producto/[id]`. That screen is a FORM and `canWriteCatalog` keeps
 * her off it entirely; this one is a directory whose detail is a thing you LOOK at,
 * and `provider_select` admits her. The controls on the detail are what her role
 * decides, not whether she may arrive.
 *
 * ⚠️ THE GENERIC ROW IS PRESSABLE TOO. Its name is editable by a manager —
 * `provider_protect_generic` refuses only a DELETE and a demotion — and the
 * question *what is this Genérico thing* is answered on the detail screen, which is
 * where somebody who does not know will tap.
 *
 * ⚠️ THE AFFORDANCE IS THE INITIALS TILE'S GROUND AND NOT A CHEVRON —
 * `productos.tsx`'s `Iniciales` and its argument: `accionSuave`'s one job is *the
 * resting fill of an action*, and a chevron would be an icon with no word beside
 * it, which C12.1 refuses outright.
 */
function Fila({
  id,
  name,
  generic,
  nuevo,
}: {
  id: string;
  name: string;
  generic: boolean;
  nuevo: boolean;
}) {
  const { scale } = useDensity();
  return (
    <Destello on={nuevo}>
      <Pressable
        // ⚠️ THE WHOLE ROW IS ONE THING TO A SCREEN READER, in the order a person
        // reads it: the supplier, then what she is for if anything needs saying.
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          generic ? `${name}. ${ES.providers.genericNote}` : name
        }
        onPress={() => router.push({ pathname: '/proveedor/[id]', params: { id } })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: scale.rowGap,
          minHeight: scale.rowHeight,
          paddingVertical: scale.rowGap,
          paddingHorizontal: scale.space,
          backgroundColor: PALETTE.superficie,
        }}
      >
        <Iniciales text={initials(name)} />

        <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}
          >
            {name}
          </Text>
          {/* ⚠️⚠️ THE ONLY SECOND LINE ON THIS SCREEN, AND IT IS ON THE ONE ROW
              WHOSE NAME DOES NOT EXPLAIN ITSELF. `0039` seeds the row as
              *Genérico* and F6 makes it Comprar's default — so without this it
              reads as a supplier somebody named badly, and a manager's first
              instinct would be to rename it. */}
          {generic ? (
            <Text
              numberOfLines={1}
              style={{ fontSize: scale.bodySize * 0.85, color: PALETTE.tintaApagada }}
            >
              {ES.providers.genericNote}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Destello>
  );
}

/**
 * The door to making a supplier, and it is a ROW rather than a button — the
 * owner's ruling of 2026-09-23 applied to this table.
 *
 * ⚠️ IT ONLY EXISTS WHEN THE SEARCH FOUND NOTHING, AND `providerRows` IS WHAT
 * DECIDES THAT (`R3`). While anything matched, he was reading the suppliers he
 * already has — which is the whole of *"discard partially duplicate"* creation.
 *
 * ⚠️ IT WEARS THE SUPPLIER ROW'S SHAPE — the same tile, the same height, the typed
 * name where a supplier's name goes — because that is the claim: *this is what the
 * supplier would be.* The legend underneath keeps it from reading as one the shop
 * already has.
 *
 * ⚠️ NO ICON WITHOUT A WORD (C12.1). The plus glyph sits beside *Crear Nuevo
 * Proveedor*, never alone.
 */
function Crear({ name }: { name: string }) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${ES.providers.create.row}. ${name}`}
      onPress={() => {
        // ⚠️ THE KEYBOARD GOES BEFORE THE FORM ARRIVES — `productos.tsx`'s
        // cause-side half: this screen stays mounted under the pushed form, and
        // leaving its search box focused is what brings the keyboard back when the
        // form pops off again.
        Keyboard.dismiss();
        router.push({ pathname: '/proveedor/nuevo', params: { nombre: name } });
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        minHeight: scale.rowHeight,
        paddingVertical: scale.rowGap,
        paddingHorizontal: scale.space,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: scale.tapTarget,
          height: scale.tapTarget,
          borderRadius: scale.space / 2,
          borderWidth: 1,
          borderColor: PALETTE.accion,
          backgroundColor: PALETTE.accionSuave,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name="plus" size={scale.iconSize} color={PALETTE.accion} />
      </View>

      <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}
        >
          {name}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: scale.bodySize * 0.85, fontWeight: '600', color: PALETTE.accion }}
        >
          {ES.providers.create.row}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Two letters for a supplier with no picture — `initials` is `@/api/catalog`'s
 * and is imported rather than re-written, because two answers to *what are this
 * name's two letters* is one answer too many.
 *
 * ⚠️ IT IS NOT IN `src/ui/` YET AND THAT IS `R14` BEING OBEYED RATHER THAN A
 * DUPLICATE LEFT LYING. `productos.tsx` has the other drawing, so this is the
 * SECOND — which makes it extractable — but the two differ in a way nobody has
 * decided: that one is a product and this one is a person, and the owner has never
 * been shown either. **`R16`: the difference nobody decided becomes a DECISION,
 * and settling it by making the ground a prop would move the drift rather than end
 * it.** It is named here with its count so the next `src/ui/` row can settle it:
 * TWO drawings, two files, identical markup.
 */
function Iniciales({ text }: { text: string }) {
  const { scale } = useDensity();
  const side = scale.tapTarget;
  return (
    <View
      // ⚠️ HIDDEN FROM THE SCREEN READER: the row's own label already says the
      // supplier's name, and these two letters are that name abbreviated.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: side,
        height: side,
        borderRadius: scale.space / 2,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.accionSuave,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
        {text}
      </Text>
    </View>
  );
}

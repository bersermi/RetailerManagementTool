import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog, useEditProduct, useMyRole, useWorkspace } from '@/api/hooks';
import { catalogLine, isoDay } from '@/api/catalog';
import { canWriteCatalog } from '@/api/catalogWrite';
import {
  checkEdit,
  editLine,
  editPlan,
  editTouches,
  packSizeOf,
  taxPercentOf,
  type EditIssue,
  type VariantEdit,
} from '@/api/catalogEdit';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// EDITAR — EVERYTHING THE FOUR-FIELD CREATE FORM PUSHED BEHIND IT. Plan task
// `5e-iii-b`, and the second half of a split whose first half (`5e-iii-a`) is
// the contract with Postgres this screen draws a box around.
//
// ⚠️⚠️ IT DECIDES NOTHING ABOUT THE WRITE, WHICH IS THE WHOLE POINT OF THE
// SPLIT. `editPlan` is what one tap owes, `EDIT_ORDER` is which order it goes
// in, `checkEdit` is what stops it, `editLine` is what a refusal becomes,
// `priceChange`'s three branches are the dated window, and `canWriteCatalog` is
// the fence. Every one of them is in `@/api/catalogEdit`, where
// `app/test/api-catalog-edit.test.ts` reads them and
// `docs/checks/5e-iii-a-catalog-edit-contract.sh` drives them against a real
// database (`R3`). A price branch re-derived in this file's JSX is the seam the
// split exists to keep.
//
// ⚠️⚠️ EVERY BOX STARTS EMPTY EXCEPT THE NAME, AND THAT IS THE OWNER'S RULING OF
// 2026-09-23 APPLIED TO AN EDIT. *A proposal must not look like a decision
// already made* — and on a form that CHANGES things a prefilled box is worse
// than a proposal: leaving it alone would look identical to setting it, and
// `variantSettings` would send the column back on a save made for a different
// field entirely. So an empty box means **leave it**, the figure the shop holds
// today is printed BESIDE the box, and nothing on this form can rewrite a value
// nobody typed. ⚠️ The name is the exception and is not one: `name` is `not
// null`, so there is no *leave it empty* state for a filled box to be confused
// with, and a rename is exactly an edit of the text that is there.
//
// ⚠️⚠️ THE TWO FIGURES ARE READ FOR THIS VARIANT RATHER THAN DEFAULTED.
// Without `VARIANT_EDIT_COLUMNS` the IVA box would be blind — safe, because an
// untouched box sends nothing, and useless, because a shopkeeper cannot decide
// to leave alone a figure he cannot see. The catalog read carries neither
// column and is paid for over ~100 products on every load of Productos (C8.3),
// so this is a second read for ONE variant — `PRICE_EDIT_COLUMNS`' own
// argument.
//
// ⚠️⚠️ `enforce_stock` IS NOT DRAWN AND THAT IS C8.8, A HARD PILOT CONSTRAINT
// RATHER THAN AN OMISSION. C8.6 guarantees permanent drift in both directions,
// and this is the one screen in the pilot that would ever have been tempted to
// offer the switch. It is in no column list in `@/api/catalogEdit` either, which
// is what makes it a control this file cannot draw by accident.
//
// ⚠️ THE UNIT AND THE FAMILY ARE NOT ON THIS FORM, AND NEITHER IS AN OVERSIGHT.
// The unit is written into four `not null` columns by C8.10's fan-out AND is
// what `price_per_base` was divided by — changing it is a re-pricing of every
// row in `price_list` for this variant, which no row in the plan asks for.
// Moving a variant between families is the same shape one level up. Both are
// creates today: a product in the wrong family or the wrong unit is retired and
// made again, which is two taps and no silent re-arithmetic.
//
// ⚠️⚠️ THE FENCE IS DRAWN AND NOT DISCOVERED, AND HERE THAT MATTERS MORE THAN IT
// DID ON `Agregar`. `product_variant_update`, `price_list_update` and
// `price_list_insert` are all `has_role(…, 'manager')` in `0002`, and the owner
// ruled on 2026-09-23 — *"leave the fence as is"* — so that stays true. ⚠️ On
// an UPDATE a cashier is not REFUSED, she is INVISIBLE: a `using` clause hides
// the row, PostgREST answers 200 with `[]`, and only `.single()` turns that into
// something an app can act on. `canWriteCatalog` keeps her off this screen
// entirely, which is `5e-ii`'s treatment of the create control applied to the
// edit one ([[shift-cover-is-a-reassignment]]).
//
// ⚠️⚠️ RETIRING IS `is_active` FALSE AND NEVER A DELETE — `0002` gives neither
// catalog table a delete policy at all. It gets a confirmation where `Quitar`
// was ruled not to (2026-09-17): a basket line is re-added in two taps, and a
// product retired by a mis-tap looks exactly like a deletion to the person who
// made it.
//
// ⚠️⚠️ AND IT IS ONE-WAY BY DESIGN AS OF THE OWNER'S RULING OF 2026-09-23, NOT BY
// OMISSION. He described the act in his own words — a shopkeeper deletes a product
// he made, it **leaves the catalog and stays in the transactions and the history** —
// which is exactly what `is_active` false does, and he asked for no way back. So
// `ES.catalog.edit.retireOnce` states that rather than apologising for it, and the
// question parked here on 2026-09-23 is answered and closed.
//
// ⚠️⚠️ WHAT THE SAME RULING WILL CHANGE HERE, AND WHY IT CHANGES NOTHING YET:
// **a product from a prebuilt catalog cannot be deleted at all**, so this control
// is ABSENT for those rows rather than confirmed — the `canWriteCatalog` treatment
// applied to a row instead of to a role. ⚠️ Nothing in the database can tell one
// today: `product_variant` and `product_family` carry no origin column, and **no
// migration seeds a catalog anywhere**, so every product in every shop is one
// somebody made and every one of them is deletable. **Drawing the fence now would
// be a control with no rows to apply to**, which is the scaffolding `5d` spent a
// step deleting. `6c` is the row that owns it.
//
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11, and on this
// screen it is everything that is left. Nothing here will ever say whether
// *Actual: $35.00 / kg* beside an empty box reads as *this is what it is now*
// rather than as a value that failed to load, whether four fields and a retire
// control on one form is one screen too dense at *Letra grande*, whether the
// confirmation's two sentences are read before the tap, or whether going back to
// La Familia is confirmation enough or wants the blink `Agregar` got.
// **The instrument is the owner's phone**, and those questions are in this
// task's row in `docs/PLAN.md`.
// ============================================================================

export default function EditarProducto() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useMyRole();
  const workspace = useWorkspace();
  const { loading, entries, failed, locationId } = useCatalog();
  const { prices, settings, factors, edit, save, busy } = useEditProduct(id ?? null);

  const entry = entries.find((row) => row.id === id);

  // ⚠️⚠️ `null` MEANS *HE HAS NOT TYPED*, AND IT IS WHAT LETS THE BOX BE SEEDED
  // BY A READ THAT HAS NOT LANDED YET. `useState(entry?.name)` would stick at the
  // empty string for ever on a cold open, and an effect that pushed the name back
  // in would undo his editing on the next render — the trap `nuevo.tsx` records
  // about its own prefill, in the one shape that screen could not hit.
  const [typedName, setTypedName] = useState<string | null>(null);
  const name = typedName ?? entry?.name ?? '';

  const [pricePesos, setPricePesos] = useState('');
  const [taxPercent, setTaxPercent] = useState('');
  const [packSize, setPackSize] = useState('');
  const [issue, setIssue] = useState<EditIssue | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const working = saving || busy;

  // ⚠️⚠️ THE FENCE, AND IT RENDERS NOTHING RATHER THAN A SENTENCE — `nuevo.tsx`'s
  // call and its reason. A cashier is never shown the control that gets here, so
  // reaching this line means a demotion mid-shift or a deep link, and the honest
  // answer to both is that this screen does not exist for her. ⚠️ `role === null`
  // is *not known yet* and is fenced out with her, so the form appears when the
  // membership read lands rather than being snatched away after it.
  if (!canWriteCatalog(role) || workspace === null) return null;

  async function submit() {
    if (workspace === null || entry === undefined) return;
    const form: VariantEdit = { name, taxPercent, packSize };
    const problem = checkEdit(entry.id, form, pricePesos, entries, factors, entry.priceUnit);
    setIssue(problem);
    setFailure(null);
    if (problem !== null) return;

    const plan = editPlan(
      {
        workspaceId: workspace.id,
        variantId: entry.id,
        name: entry.name,
        priceUnit: entry.priceUnit,
        locationId,
        factors,
        // ⚠️ AT THE TAP AND NOT AT THE RENDER. A form left open across midnight
        // would otherwise close a row at yesterday and open one starting
        // yesterday, which `price_list_no_overlap` refuses against a row somebody
        // else opened today.
        today: isoDay(new Date()),
      },
      form,
      pricePesos,
      prices,
    );

    // ⚠️⚠️ A SAVE THAT CHANGES NOTHING MAKES NO ROUND TRIP AND STILL LEAVES.
    // `editTouches` is the decision (`R3`); what is here is that *he read it and
    // tapped Guardar* is a legitimate way to close this screen, not an error.
    if (!editTouches(plan)) {
      Keyboard.dismiss();
      router.back();
      return;
    }

    setSaving(true);
    const outcome = await save(plan);
    setSaving(false);
    if (!outcome.ok) {
      setFailure(editLine(outcome));
      return;
    }
    // ⚠️ THE KEYBOARD GOES BEFORE THE SCREEN DOES — `nuevo.tsx`'s ruling of
    // 2026-09-23, and the same cause: a keyboard that survives the navigation
    // covers the bottom of the screen he is sent back to.
    Keyboard.dismiss();
    // ⚠️⚠️ BACK TO LA FAMILIA, WHICH IS WHERE HE CAME FROM AND WHERE THE CHANGE
    // IS VISIBLE. `Agregar` pops to Productos because a NEW product's place in
    // the alphabet is the confirmation; an edit changes a row he was already
    // looking at, one screen back, with its new name and its new price on it.
    // ⚠️ `R9`: whether that is confirmation enough, or wants the blink `Agregar`
    // got, is a question for the owner's phone and is in this task's row.
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda subtitle={entry?.name ?? ''} />

      <ScrollView
        contentContainerStyle={{
          padding: scale.space,
          gap: scale.space,
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {entry === undefined ? (
          // ⚠️⚠️ *THE READ HAS NOT LANDED* IS NOT *THIS PRODUCT IS GONE*, which
          // is `familyLineKey`'s argument one screen back and is sharper here:
          // this form is reached by tapping a product, so a cold open with the
          // link out must not tell a shopkeeper the thing in his hand was
          // deleted. `catalogLine` puts a FAILED read ahead of both.
          <Aviso line={catalogLine(loading, '', failed)} />
        ) : (
          <>
            <Campo label={ES.catalog.edit.nameLabel}>
              <Caja>
                <TextInput
                  value={name}
                  onChangeText={setTypedName}
                  placeholder={ES.catalog.edit.nameHint}
                  placeholderTextColor={PALETTE.tintaApagada}
                  // ⚠️ SENTENCES, NOT WORDS — `nuevo.tsx`'s call: a product name
                  // is `Pechuga sin hueso`.
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  editable={!working}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  accessibilityLabel={ES.catalog.edit.nameLabel}
                  style={{
                    flex: 1,
                    minHeight: scale.tapTarget,
                    fontSize: scale.bodySize,
                    color: PALETTE.tinta,
                  }}
                />
              </Caja>
            </Campo>

            <Campo label={ES.catalog.edit.priceLabel}>
              <Caja>
                <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>$</Text>
                <TextInput
                  value={pricePesos}
                  onChangeText={setPricePesos}
                  placeholder={ES.catalog.edit.priceHint}
                  placeholderTextColor={PALETTE.tintaApagada}
                  // ⚠️ A DECIMAL PAD AND NOT A NUMERIC ONE: C12.2 puts the point
                  // in `35.50`, and a keyboard with no point is a shopkeeper who
                  // cannot type half a peso. `parsePesos` is still what reads it.
                  keyboardType="decimal-pad"
                  editable={!working}
                  inputAccessoryViewID={PAD_ID}
                  accessibilityLabel={ES.catalog.edit.priceLabel}
                  style={{
                    flex: 1,
                    minHeight: scale.tapTarget,
                    fontSize: scale.moneySize,
                    color: PALETTE.tinta,
                  }}
                />
                {/* ⚠️ WHAT THE PRICE IS PER, IN C3.10's OWN SEPARATOR. A price
                    box with no unit beside it is the one figure in this app a
                    shopkeeper could read two ways. */}
                <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
                  {`${ES.catalog.per} ${entry.priceUnit}`}
                </Text>
              </Caja>
              {/* ⚠️⚠️ THE FIGURE THE SHOP HOLDS TODAY, BESIDE THE BOX AND NEVER
                  IN IT. `entry.price` is C3.10's rendered sentence — the same
                  `$35.00 / kg` Productos shows — or C3.12's dash, and the dash
                  is a legitimate state rather than a missing read. */}
              <Actual value={entry.price} />
              {/* ⚠️ THE NO-PRICE SENTENCE IS THE CREATE FORM'S, and it is still
                  true here: nothing on this form removes a price, so the only way
                  to leave this screen priceless is to arrive priceless and leave
                  the box alone. C3.12's consequence — Vender will stop and ask —
                  is what the shopkeeper cannot see from here. */}
              {entry.centavos === null ? <Nota line={ES.catalog.notice.noPrice} /> : null}
              <Nota line={ES.catalog.edit.priceKeep} />
            </Campo>

            <Campo label={ES.catalog.edit.taxLabel}>
              <Caja>
                <TextInput
                  value={taxPercent}
                  onChangeText={setTaxPercent}
                  placeholder={ES.catalog.edit.taxHint}
                  placeholderTextColor={PALETTE.tintaApagada}
                  keyboardType="decimal-pad"
                  editable={!working}
                  inputAccessoryViewID={PAD_ID}
                  accessibilityLabel={ES.catalog.edit.taxLabel}
                  style={{
                    flex: 1,
                    minHeight: scale.tapTarget,
                    fontSize: scale.bodySize,
                    color: PALETTE.tinta,
                  }}
                />
                <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>%</Text>
              </Caja>
              {/* ⚠️ `taxPercentOf` IS THE MODULE'S INVERSE OF `parseTaxRate`
                  (`R3`) — `0.1600` is shown as `16`, because the column is a rate
                  and the box is a percentage, and confusing them is a sixteen-fold
                  error in the ledger. */}
              <Actual value={settings === null ? '' : `${taxPercentOf(settings.tax_rate)}%`} />
            </Campo>

            <Campo label={ES.catalog.edit.packLabel}>
              <Caja>
                <TextInput
                  value={packSize}
                  onChangeText={setPackSize}
                  placeholder={ES.catalog.edit.packHint}
                  placeholderTextColor={PALETTE.tintaApagada}
                  keyboardType="decimal-pad"
                  editable={!working}
                  inputAccessoryViewID={PAD_ID}
                  accessibilityLabel={ES.catalog.edit.packLabel}
                  style={{
                    flex: 1,
                    minHeight: scale.tapTarget,
                    fontSize: scale.bodySize,
                    color: PALETTE.tinta,
                  }}
                />
              </Caja>
              <Actual value={settings === null ? '' : packSizeOf(settings.pack_size)} />
            </Campo>

            {/* ⚠️ ONE PLACE FOR BOTH KINDS OF REFUSAL — the form's own and the
                database's, which is `Agregar`'s arrangement and `Invitar`'s
                before it. Two slots would let the screen show two contradictory
                reasons at once, and the second is always the stale one. */}
            {(issue !== null || failure !== null) && (
              <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>
                {issue !== null ? ES.catalog.editIssues[issue] : failure}
              </Text>
            )}

            <Boton
              label={working ? ES.catalog.edit.working : ES.catalog.edit.submit}
              busy={working}
              onPress={() => void submit()}
            />

            {/* ⚠️⚠️ THE RETIRE CONTROL IS NOT DRAWN, AND ITS ABSENCE IS THE
                OWNER'S CORRECTION OF 2026-09-23 RATHER THAN AN OMISSION.
                His rule: *a shopkeeper may delete only the products HE CREATED*;
                a product that came with the catalog is not his to remove.
                ⚠️⚠️ NOTHING IN THE DATABASE RECORDS WHERE A ROW CAME FROM —
                `product_family` and `product_variant` carry no origin column —
                so this screen **cannot tell one from the other**, and it was
                offering the control on every product in the shop. He found it
                on his phone, which is `R9` doing exactly what it is for.
                ⚠️ DRAWN ON NONE IS THE HONEST STATE WHILE IT CANNOT TELL, and it
                is `canWriteCatalog`'s argument applied to a ROW instead of a role:
                plainly absent beats looking live and doing the wrong thing. It
                costs him deleting products he really did make, which is the price
                of not deleting ones he did not. ⚠️ `6c` mints the marker, fences
                it in the database, and brings this control back on his own rows
                only. `ES.catalog.edit.retire*` is kept for it. */}
          </>
        )}
      </ScrollView>

      {/* ⚠️ MOUNTED ONCE AND OUTSIDE THE SCROLL VIEW, `nuevo.tsx`'s call:
          `InputAccessoryView` renders into the keyboard rather than into the
          layout, so where it sits in the tree does not matter — but mounting it
          inside the conditional branch would take the bar away exactly while the
          catalog read is out. ⚠️ THREE BOXES SHARE IT HERE and one did there:
          every `decimal-pad` on this form draws no return key, so all three point
          at the same `nativeID`. */}
      <TecladoListo />
    </View>
  );
}

/**
 * The id tying the three number pads to their accessory bar.
 *
 * ⚠️ A CONSTANT AND NOT A LITERAL AT FOUR CALL SITES, for `PRICE_PAD_ID`'s
 * recorded reason: `InputAccessoryView` matches an input to a bar by STRING
 * EQUALITY, so two spellings is a bar that renders and never appears.
 */
const PAD_ID = 'wera.edit.pad';

/**
 * *Listo*, above the number pads — the keyboards in this app with no return key.
 *
 * ⚠️ iOS ONLY, AND THE `Platform` CHECK IS THE HONEST HALF OF THE RULING RATHER
 * THAN A GAP IN IT — `nuevo.tsx`'s own note: `InputAccessoryView` does not exist
 * on Android in React Native, and Android's keyboard draws a dismiss control the
 * platform owns. ⚠️ `R9`: both platforms need asking.
 */
function TecladoListo() {
  const { scale } = useDensity();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={PAD_ID}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: scale.space,
          borderTopWidth: 1,
          borderTopColor: PALETTE.linea,
          backgroundColor: PALETTE.banda,
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => Keyboard.dismiss()}
          style={{
            minHeight: scale.tapTarget,
            paddingHorizontal: scale.space,
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.accion }}>
            {ES.catalog.edit.done}
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

/**
 * The room's name, the product under it, and the way out.
 *
 * ⚠️ THE PRODUCT'S NAME IS A SUBTITLE AND NOT THE TITLE. *Editar producto* says
 * what this screen is for; a banda showing only `Pechuga` would be the same
 * heading La Familia draws one screen back, over a completely different screen.
 * ⚠️ *Cancelar*, not *Volver* — this screen holds typing that will be thrown
 * away, which is `ES.catalog.create.cancel`'s recorded argument.
 */
function Banda({ subtitle }: { subtitle: string }) {
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
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}
        >
          {ES.catalog.edit.title}
        </Text>
        {subtitle === '' ? null : (
          <Text
            numberOfLines={1}
            style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}
          >
            {subtitle}
          </Text>
        )}
      </View>
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
          {ES.catalog.edit.cancel}
        </Text>
      </Pressable>
    </View>
  );
}

/** A labelled field. `nuevo.tsx`'s own `Campo`, and `5h.5` is where they meet. */
function Campo({ label, children }: { label: string; children: ReactNode }) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap / 2 }}>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tintaApagada }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

/** The box a value is typed into. One border, one ground, one row. */
function Caja({ children }: { children: ReactNode }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        paddingHorizontal: scale.space,
        borderRadius: scale.space / 2,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      {children}
    </View>
  );
}

/** A quiet line under a field — never a refusal, which is `PALETTE.error`. */
function Nota({ line }: { line: string }) {
  const { scale } = useDensity();
  return <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{line}</Text>;
}

/**
 * What the shop holds today, printed beside the box that would change it.
 *
 * ⚠️⚠️ IT IS THE HALF THAT MAKES AN EMPTY BOX HONEST. *Leave it alone* is only a
 * choice if the shopkeeper can see what he is leaving alone — and it is drawn as
 * a LABELLED FACT (*Actual: 16%*) rather than as a placeholder, because a bare
 * figure in hint ink inside the box is exactly the thing the owner ruled against
 * on 2026-09-23: indistinguishable from a value somebody typed.
 *
 * ⚠️ AN EMPTY VALUE DRAWS NOTHING RATHER THAN *Actual:*. The settings read can
 * still be in flight, and a label with nothing after it reads as a figure that
 * failed to load — which is worse than a line that is not there yet.
 */
function Actual({ value }: { value: string }) {
  const { scale } = useDensity();
  if (value === '' || value === '%') return null;
  return (
    <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
      {`${ES.catalog.edit.current}: ${value}`}
    </Text>
  );
}

/** The catalog is not here yet, could not be asked, or no longer holds this. */
function Aviso({ line }: { line: string }) {
  const { scale } = useDensity();
  return (
    <View style={{ padding: scale.space * 2, alignItems: 'center' }}>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
        {line}
      </Text>
    </View>
  );
}

/** `Invitar`'s button. ⚠️ A tick and a word, never a glyph alone (C12.1). */
function Boton({
  label,
  onPress,
  busy = false,
}: {
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
        <MaterialCommunityIcons name="check" size={scale.iconSize} color={PALETTE.accion} />
      )}
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
        {label}
      </Text>
    </Pressable>
  );
}

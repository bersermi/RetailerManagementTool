import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog, useEditProduct, useMyRole, useProductPhotoSave, useWorkspace } from '@/api/hooks';
import { catalogLine, isoDay } from '@/api/catalog';
import { canWriteCatalog } from '@/api/catalogWrite';
import {
  activePatch,
  canRetireProduct,
  catalogEditErrorMessage,
  checkEdit,
  editLine,
  editPlan,
  editTouches,
  familyPatch,
  type EditIssue,
  type VariantEdit,
} from '@/api/catalogEdit';
import { imagePatch } from '@/api/photos';
import { aislesFor } from '@/api/productPage';
import { takeProductPhoto, type ProductPhoto } from '@/capture/photo';
import { newWriteId } from '@/lib/ids';
import { ES } from '@/strings';
import { Boton } from '@/ui/Boton';
import { BotonLleno } from '@/ui/BotonLleno';
import { CampoFoto } from '@/ui/CampoFoto';
import { RetiroProducto } from '@/ui/RetiroProducto';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { TITULO } from '@/theme/letra';

// ============================================================================
// ⚠️⚠️ `8g`, THE OWNER'S RULINGS OF 2026-10-17, AND THIS HEADER PREDATES THEM:
// the price, IVA and pieces-per-pack boxes are GONE (the price is changed on the
// product's page, `ficha/[id]`, with what it would earn); a product from Wera's
// catalog keeps its name; and the shop's own product can change aisle. What the
// notes below say about those three boxes is history.
//
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
  const { prices, settings, factors, units, edit, save, busy } = useEditProduct(id ?? null);

  const entry = entries.find((row) => row.id === id);

  // ⚠️⚠️ `null` MEANS *HE HAS NOT TYPED*, AND IT IS WHAT LETS THE BOX BE SEEDED
  // BY A READ THAT HAS NOT LANDED YET. `useState(entry?.name)` would stick at the
  // empty string for ever on a cold open, and an effect that pushed the name back
  // in would undo his editing on the next render — the trap `nuevo.tsx` records
  // about its own prefill, in the one shape that screen could not hit.
  const [typedName, setTypedName] = useState<string | null>(null);
  const name = typedName ?? entry?.name ?? '';

  // ⚠️ `8g`, THE OWNER'S RULINGS OF 2026-10-17: no price here (it is changed on
  // the product's page), no IVA and no pieces per pack — *"We will not use IVA
  // input for now"*, *"Piezas por paquete doesn't make sense either"* — and the
  // aisle, for the shop's own product filed in the wrong one.
  const [aisle, setAisle] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [issue, setIssue] = useState<EditIssue | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /**
   * ⚠️ THE CONFIRMATION IS A PIECE OF SCREEN STATE AND NOT A NAVIGATION, which is
   * `proveedor/[id]`'s shape: a retire is one act on the row already open, and a
   * route for it would put a back button on a question that has two answers.
   */
  const [asking, setAsking] = useState(false);
  // ⚠️ `8o`: THE SHOP'S OWN PRODUCT TAKES A PHOTO, A NEW ONE, OR NONE — the
  // canvas's *Tomar otra foto* and *Quitar foto*. Nothing goes up until Guardar.
  const [taken, setTaken] = useState<{ readonly photo: ProductPhoto; readonly fileId: string } | null>(null);
  const [removed, setRemoved] = useState(false);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const photos = useProductPhotoSave();

  const working = saving || busy || photos.busy;
  // ⚠️ `8g`: A PRODUCT FROM WERA'S CATALOG KEEPS ITS NAME — *"users won't be able
  // to edit the name on default products"*. Its page offers no Editar at all; this
  // is the deep link's answer, read off the row itself as well as the list.
  const locked = settings?.is_prebuilt === true || entry?.prebuilt === true;
  const choices = entry === undefined ? [] : aislesFor(entries, entry, units);
  const chosenAisle = choices.find((one) => one.familyId === (aisle ?? entry?.familyId));

  // ⚠️⚠️ THE FENCE, AND IT RENDERS NOTHING RATHER THAN A SENTENCE — `nuevo.tsx`'s
  // call and its reason. A cashier is never shown the control that gets here, so
  // reaching this line means a demotion mid-shift or a deep link, and the honest
  // answer to both is that this screen does not exist for her. ⚠️ `role === null`
  // is *not known yet* and is fenced out with her, so the form appears when the
  // membership read lands rather than being snatched away after it.
  if (!canWriteCatalog(role) || workspace === null) return null;

  async function addPhoto() {
    setPhotoNote(null);
    const outcome = await takeProductPhoto();
    if (outcome.kind === 'taken') {
      setTaken({ photo: outcome.photo, fileId: newWriteId() });
      setRemoved(false);
    } else if (outcome.kind === 'denied') setPhotoNote(ES.products.photo.denied);
    else if (outcome.kind === 'failed') setPhotoNote(ES.products.photo.cameraFailed);
  }

  async function submit() {
    if (workspace === null || entry === undefined) return;
    const form: VariantEdit = { name: locked ? entry.name : name, taxPercent: '', packSize: '' };
    const problem = checkEdit(entry.id, form, '', entries, factors, entry.priceUnit);
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
      '',
      prices,
    );
    const move = familyPatch(entry.familyId, aisle);

    // ⚠️ `8o`: a photo taken, or one taken off. Only the shop's own product has
    // this form at all (`locked`), and `0063` refuses either on Wera's.
    const unphoto = removed && taken === null && entry.picture !== null;

    // ⚠️⚠️ A SAVE THAT CHANGES NOTHING MAKES NO ROUND TRIP AND STILL LEAVES.
    // `editTouches` is the decision (`R3`); what is here is that *he read it and
    // tapped Guardar* is a legitimate way to close this screen, not an error.
    if (!editTouches(plan) && move === null && taken === null && !unphoto) {
      Keyboard.dismiss();
      router.back();
      return;
    }

    setSaving(true);
    const outcome = await save(plan);
    if (!outcome.ok) {
      setSaving(false);
      setFailure(editLine(outcome));
      return;
    }
    // ⚠️ THE MOVE AFTER THE RENAME, AND ON ITS OWN: a rename refused `23505`
    // stops above, before the product changes aisle under a name he is about to
    // abandon — `EDIT_ORDER`'s argument, one step further.
    if (move !== null) {
      try {
        await edit(move);
      } catch (thrown) {
        setSaving(false);
        setFailure(catalogEditErrorMessage(thrown));
        return;
      }
    }
    // ⚠️ `8o`: THE PHOTO LAST, after the name and the aisle it belongs with. A
    // second Guardar after a failed upload finds those two already saved, so it
    // only sends the photo again — to the same path, named when it was taken.
    if (taken !== null) {
      const sent = await photos.save(workspace.id, entry.id, taken.photo, taken.fileId);
      if (!sent) {
        setSaving(false);
        setFailure(ES.products.photo.failed);
        return;
      }
    } else if (unphoto) {
      try {
        await edit(imagePatch(null));
      } catch (thrown) {
        setSaving(false);
        setFailure(catalogEditErrorMessage(thrown));
        return;
      }
    }
    setSaving(false);
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

  /**
   * RETIRING THE PRODUCT — `is_active` false, and never a DELETE.
   *
   * ⚠️⚠️ IT DOES NOT GO THROUGH `save`, AND THAT IS THE DIFFERENCE BETWEEN THIS AND
   * EVERY OTHER WRITE ON THIS SCREEN. `save` walks `EDIT_ORDER` — name, settings,
   * price — and a retirement is none of the three: it must not be able to carry a
   * half-typed rename or an unfinished price along with it. `edit` is the one-patch
   * door `useEditProduct` already exposed for `ActivePatch`, applied and tested
   * since `5e-iii-a` and **never once called until this row**.
   *
   * ⚠️ SO THE REFUSAL IS `catalogEditErrorMessage` DIRECTLY AND NOT `editLine`.
   * `editLine` names WHICH STEP of a plan failed, and there is no plan here.
   */
  async function retire() {
    if (entry === undefined) return;
    setFailure(null);
    setSaving(true);
    try {
      await edit(activePatch(false));
    } catch (thrown) {
      setSaving(false);
      // ⚠️⚠️ THE ONE SENTENCE THIS PATH CAN PRODUCE THAT NOTHING ELSE CAN IS
      // `23001` — `0042`'s trigger, arriving as an HTTP 400. It means the read
      // under this screen went stale and the row is not his after all.
      setFailure(catalogEditErrorMessage(thrown));
      return;
    }
    setSaving(false);
    setAsking(false);
    Keyboard.dismiss();
    // ⚠️⚠️ BACK TO LA FAMILIA, AND THE PRODUCT IS GONE FROM IT — `catalogFrom` drops
    // `is_active` false, so the empty row he was looking at IS the confirmation.
    // That is `proveedor/[id]`'s argument and the same one an edit makes one
    // function up.
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
            {locked ? null : (
              <Campo label={ES.products.photo.label}>
                <CampoFoto
                  name={name}
                  takenUri={taken?.photo.thumb.uri ?? null}
                  current={removed ? null : entry.picture}
                  busy={working}
                  note={photoNote}
                  onTake={() => void addPhoto()}
                  onRemove={() => {
                    setTaken(null);
                    setRemoved(true);
                  }}
                />
              </Campo>
            )}

            <Campo label={ES.catalog.edit.nameLabel}>
              <Caja>
                {locked ? (
                  <Text style={{ flex: 1, fontSize: scale.bodySize, color: PALETTE.tinta, paddingVertical: scale.rowGap }}>
                    {entry.name}
                  </Text>
                ) : (
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
                )}
              </Caja>
            </Campo>

            {locked ? null : (
              <Campo label={ES.products.aisleLabel}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setChoosing((open) => !open)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: scale.tapTarget,
                    paddingHorizontal: scale.space,
                    borderRadius: scale.space,
                    borderWidth: 1,
                    borderColor: PALETTE.linea,
                    backgroundColor: PALETTE.superficie,
                  }}
                >
                  <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta }}>{chosenAisle?.name ?? entry.familyName}</Text>
                  <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>{ES.products.aisleChange}</Text>
                </Pressable>
                {choosing ? (
                  <View style={{ gap: scale.rowGap / 2 }}>
                    <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.products.aisleAsk}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap / 2 }}>
                      {choices.map((one) => {
                        const on = one.familyId === (aisle ?? entry.familyId);
                        return (
                          <Pressable
                            key={one.familyId}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            onPress={() => {
                              setAisle(one.familyId);
                              setChoosing(false);
                            }}
                            style={{
                              minHeight: scale.tapTarget * 0.8,
                              justifyContent: 'center',
                              paddingHorizontal: scale.space,
                              borderRadius: scale.tapTarget,
                              borderWidth: 1,
                              borderColor: on ? PALETTE.accion : PALETTE.linea,
                              backgroundColor: on ? PALETTE.accion : PALETTE.superficie,
                            }}
                          >
                            <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: on ? PALETTE.superficie : PALETTE.tinta }}>
                              {one.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </Campo>
            )}

            {/* ⚠️ ONE PLACE FOR BOTH KINDS OF REFUSAL — the form's own and the
                database's, which is `Agregar`'s arrangement and `Invitar`'s
                before it. Two slots would let the screen show two contradictory
                reasons at once, and the second is always the stale one. */}
            {(issue !== null || failure !== null) && (
              <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>
                {issue !== null ? ES.catalog.editIssues[issue] : failure}
              </Text>
            )}

            <Guardar
              label={working ? ES.catalog.edit.working : ES.catalog.edit.submit}
              busy={working}
              onPress={() => void submit()}
            />

            {/* ⚠️⚠️ THE RETIRE CONTROL IS BACK AS OF `6c`, 2026-09-27, AND IT IS
                DRAWN ON HIS OWN ROWS ONLY — which is the whole of what `0042`
                bought. It was drawn on NOTHING from 2026-09-23 to 2026-09-27: the
                owner's rule is *a shopkeeper may delete only the products HE
                CREATED*, the database recorded no origin, and so this screen could
                not tell one kind of row from the other. He found it offering the
                control on every product in his shop, on his phone, which is `R9`
                doing exactly what it is for.
                ⚠️⚠️ `canRetireProduct` IS THE DECISION AND IT IS NOT HERE (`R3`) —
                two reasons the control can be absent, kept as two things, and
                `app/test/api-catalog-edit.test.ts` is what pins them.
                ⚠️ `canWriteCatalog(role)` IS ALREADY TRUE ON THIS LINE, because the
                guard above returns null for a cashier. It is passed anyway and it
                is not decoration: the day that guard is softened to show her a
                read-only form, the row fence is still standing rather than
                silently gone.
                ⚠️⚠️ AND A PREBUILT ROW GETS NO SENTENCE, NO DISABLED BUTTON AND NO
                EXPLANATION. Plainly absent is what he asked for in as many words —
                *"why am I still seeing the button for the already existing
                products?"* — and where a row came from is ours to know
                ([[users-dont-do-bookkeeping]]). The only place `ES.catalog.errors.notYours`
                can ever appear is the stale-read window inside `retire`. */}
            {canRetireProduct(settings, canWriteCatalog(role)) ? (
              <Boton
                label={ES.catalog.edit.retire}
                tone={PALETTE.error}
                onPress={() => {
                  Keyboard.dismiss();
                  setFailure(null);
                  setAsking(true);
                }}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      <RetiroProducto
        asking={asking}
        working={working}
        failed={failure}
        onConfirm={() => void retire()}
        onCancel={() => setAsking(false)}
      />

    </View>
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
          style={{ fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}
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

/**
 * The filled button. ⚠️ A tick and a word, never a glyph alone (C12.1).
 *
 * ⚠️⚠️ NAMED `Guardar` SINCE `6c` AND IT USED TO BE `Boton`, WHICH IS A RENAME WITH A
 * REASON RATHER THAN A TIDY-UP: this file now imports the OUTLINE `Boton` from
 * `@/ui/Boton` for the retire control, and two different buttons under one name in
 * one file is a typecheck error at best and the wrong shape on screen at worst.
 * ⚠️ `proveedor/[id].tsx` reached the identical arrangement on 2026-09-27 and picked
 * the identical name, so this is the second file to agree rather than a new spelling.
 * ⚠️ IT IS STILL NOT EXTRACTED — the filled button is one of the three shapes `5h.5`
 * left in place on purpose, because it decides what a shopkeeper sees on six-plus
 * screens at once.
 */
function Guardar(props: { label: string; onPress: () => void; busy?: boolean }) {
  return <BotonLleno icon="check" {...props} />;
}

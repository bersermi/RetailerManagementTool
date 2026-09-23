import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
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

import { useCatalog, useCreateProduct, useMyRole, useWorkspace } from '@/api/hooks';
import { catalogLine } from '@/api/catalog';
import {
  FAMILY_MIRROR,
  canWriteCatalog,
  checkProduct,
  chooseFamily,
  chooseUnit,
  createLine,
  familyUnit,
  noPriceNoticeKey,
  resolveFamily,
  retryDraft,
  searchFamilies,
  unitOrder,
  type FamilyChoice,
  type ProductIssue,
} from '@/api/catalogWrite';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { bannerSequence } from '@/theme/pulse';

// ============================================================================
// AGREGAR — THE SHORTEST FORM THAT PRODUCES A USABLE PRODUCT. Plan task `5e-ii`,
// REWORKED 2026-09-23 on the owner's ruling after he held the first version on
// his own phone.
//
// ⚠️⚠️ ONE SENTENCE EXPLAINS EVERY CHANGE HE ASKED FOR: *a proposal must not look
// like a decision already made.* He said it about the family box and the price
// box in the same breath, and the `Agregar` button was the same mistake one
// screen over. So all three fields now carry a HINT — `tintaApagada`, not the
// field's value — and nothing is saved from a hint.
//
// ⚠️⚠️ THE FAMILY MIRRORS THE PRODUCT AND NO LONGER MATCHES BEHIND HIS BACK.
// `suggestFamily` used to attach `Pierna de pollo` to an existing `Pollo`; that
// is deleted. The default is the typed name itself, and finding the existing
// family is something he DOES — which is the third of the three scenarios he
// ranked, in his order:
//
//   1. he takes the mirrored family, and the shop gains a family of one;
//   2. he types the new family he wants;
//   3. he realises `Pollo` is already there and picks it out of the search.
//
// ⚠️⚠️ THE UNIT AND THE FAMILY POLICE EACH OTHER, WHICH IS C8.5 MADE VISIBLE.
// Picking an existing family preselects its unit; picking a unit that family
// cannot hold RELEASES the family back to the mirror and says why, in a banner
// that fades. **Nothing in the database enforces this** —
// `product_variant_units_same_dimension_trg` (`0002:204`) counts dimensions
// across the four unit columns of one row, and C8.10's fan-out makes that one by
// construction — so this form is the only thing that keeps *one family, one kind
// of measurement* true. ⚠️ The previous version kept it by NARROWING the picker,
// and the owner replaced that with a rule he can see: six options quietly missing
// is the app having decided again.
//
// ⚠️ FOUR FIELDS AND NOTHING ELSE (C8.9). No tax rate, no pack size, no store, no
// photo, no expiry — `5e-iii` owns the first two, `location_id` is null by the
// decision `5e-i` recorded, `enforce_stock` is on NO pilot screen at all (C8.8),
// and the owner ruled out expiry capture entirely on 2026-09-22.
//
// ⚠️⚠️ IT DECIDES NOTHING. `canWriteCatalog` is the fence, `resolveFamily` is
// which family answer wins, `searchFamilies` ranks scenario 3, `chooseFamily` and
// `chooseUnit` are the rule above, `familyUnit` is the preselect, `unitOrder` is
// the picker's order, and `checkProduct` / `noPriceNoticeKey` / `createLine` /
// `retryDraft` were already `5e-i`'s. `R3`: a rule written into this file is a
// rule no check in this repository will ever see, and
// `app/test/api-catalog-write.test.ts` reads every one of them.
//
// ⚠️⚠️ TWO ENTRY POINTS, AND BOTH NOW ARRIVE WITH SOMETHING FILLED IN. From
// Productos it is `?nombre=<what he typed into the search>` — the create row is
// the only door there since `Agregar` was removed, and the name he typed is the
// name he meant, so re-typing it would be the app forgetting on purpose. From
// inside an opened family it is `?familia=<id>`, and **no family question is
// asked** (C8.12) — unless the unit releases it, which is the one case where the
// question has to come back because the answer stopped being true.
//
// ⚠️ THE THIRD DOOR C8.12 NAMES — the Comprar/Vender `...` quick action — is
// still ROUTED to `5f` and `5g`, which build the screens it would open from.
//
// ⚠️⚠️ ON SUCCESS IT GOES BACK TO THE CATALOG AND THE NEW PRODUCT BLINKS THERE.
// `router.dismissTo` pops back to the Productos already in the stack with
// `?nuevo=<variant id>`, so the confirmation is *seeing the product in the list,
// in its alphabetical place*, rather than a sentence on a form. The owner asked
// for exactly that and for nothing else — *"don't [add] any other indicator like
// a line or anything"* — which is why the two sentences the first version showed
// after a save are gone.
//
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11, and on this screen
// it is the whole of the design. Nothing here will ever say whether a hint reads
// as a hint, whether the family search finds what he means, whether the released
// banner is legible before it fades, or whether the blink on the far side reads as
// *this is the one you just made*. **The instrument is the owner's phone**, and the
// questions it is asked are in this task's row in `docs/PLAN.md` before it ships.
// ============================================================================

export default function NuevoProducto() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  // ⚠️ BOTH DOORS ARRIVE AS PARAMETERS. `nombre` is what he typed into the search
  // on Productos; `familia` is the family he was standing in. A link that lost
  // either still opens a working form, which is the failure worth having.
  const { nombre, familia } = useLocalSearchParams<{ nombre?: string; familia?: string }>();
  const role = useMyRole();
  const workspace = useWorkspace();
  const { loading, entries, failed } = useCatalog();
  const { create, busy, factors, units } = useCreateProduct();

  // ⚠️ THE PREFILL IS THE INITIAL STATE AND NOT A SYNCED VALUE. He can edit the
  // name; an effect that pushed the parameter back in would undo his editing on
  // the next render.
  const [name, setName] = useState(nombre ?? '');
  const [pricePesos, setPricePesos] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [family, setFamily] = useState<FamilyChoice>(
    familia === undefined ? FAMILY_MIRROR : { kind: 'chosen', id: familia, name: '' },
  );
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [issue, setIssue] = useState<ProductIssue | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // ⚠️ THE BANNER'S OPACITY IS THE ONLY ANIMATED THING ON THIS SCREEN, and its
  // timing is `@/theme/pulse`'s rather than this file's (`R3`).
  const banner = useRef(new Animated.Value(0)).current;
  const [released, setReleased] = useState(false);


  // ⚠️⚠️ THE FIXED FAMILY'S NAME IS LOOKED UP AND ITS ID IS NOT. `familyId` is
  // what the insert needs and what the route supplied; the name is only ever
  // rendered, so a family the read has not reached yet shows no word and still
  // attaches to the right row.
  const known = searchFamilies(entries, '');
  const choice: FamilyChoice =
    family.kind === 'chosen' && family.name === ''
      ? { kind: 'chosen', id: family.id, name: known.find((f) => f.id === family.id)?.name ?? '' }
      : family;

  const resolved = resolveFamily(choice, name);
  const codes = unitOrder(units);
  const draft = { name, ...resolved, unitCode, pricePesos };
  const notice = noPriceNoticeKey(draft, entries, factors);

  // ⚠️ THE FAMILY QUESTION IS NOT ASKED WHEN HE CAME FROM A FAMILY — C8.12, in
  // its own words. ⚠️⚠️ IT COMES BACK IF THE UNIT RELEASED THE FAMILY, and that is
  // the only honest answer: the family he was standing in can no longer hold this
  // product, so *no question asked* has stopped being true and hiding the field
  // would hide the one thing that changed.
  const askFamily = familia === undefined || choice.kind !== 'chosen';

  // ⚠️⚠️ THE FENCE, AND IT RENDERS NOTHING RATHER THAN A SENTENCE. A cashier is
  // never shown the create row that gets here, so reaching this line means a
  // demotion mid-shift or a deep link, and the honest answer to both is that this
  // screen does not exist for her. ⚠️ `role === null` is "not known" and is fenced
  // out with her (`roleOf`), so the form appears when the membership read lands
  // rather than being snatched away after it.
  if (!canWriteCatalog(role) || workspace === null) return null;

  // ⚠️⚠️ THE ANIMATION STARTS IN AN EFFECT AND NOT IN THE HANDLER, AND THAT IS THE
  // BUG THE OWNER FOUND: *"the banner is not displaying."* `flashReleased` used to
  // call `setReleased(true)` and `Animated.sequence(...).start()` in the same tick —
  // so the native driver was handed an opacity to animate on a view **that React had
  // not mounted yet**, because the `{released && …}` branch only renders on the next
  // commit. A native-driver animation against a node that does not exist is dropped
  // silently: no warning, no throw, no banner. ⚠️ Running it in an effect keyed on
  // `released` means the view is on screen before the first frame is asked for.
  useEffect(() => {
    if (!released) return;
    banner.setValue(0);
    const run = Animated.sequence(
      bannerSequence().map((step) => Animated.timing(banner, { ...step, useNativeDriver: true })),
    );
    run.start(({ finished }) => {
      if (finished) setReleased(false);
    });
    return () => run.stop();
  }, [released, banner]);

  // ⚠️⚠️ CLOSING THE KEYBOARD CLOSES THE FAMILY LIST — ruled 2026-09-23: *"if the
  // keyboard is not open either we have picked the option we wanted or we are
  // sticking with the suggestion."* The list is a thing you are typing INTO, so a
  // dismissed keyboard is the end of that question either way.
  //
  // ⚠️ A TAP ON AN OPTION DOES NOT GO THROUGH HERE, and that is why this is safe
  // rather than a race: `keyboardShouldPersistTaps="handled"` on the ScrollView
  // means tapping a row does not dismiss the keyboard, so `pickFamily` closes both
  // itself. This fires only when he dismisses it deliberately — *Listo*, a swipe, or
  // the system control.
  useEffect(() => {
    const hidden = Keyboard.addListener('keyboardDidHide', () => setPicking(false));
    return () => hidden.remove();
  }, []);

  function pickUnit(code: string) {
    const outcome = chooseUnit(choice, code, entries, units);
    setFamily(outcome.family);
    setUnitCode(outcome.unitCode);
    if (outcome.released) setReleased(true);
  }

  function pickFamily(option: { readonly id: string; readonly name: string }) {
    const outcome = chooseFamily(option, unitCode, entries, units);
    setFamily(outcome.family);
    setUnitCode(outcome.unitCode);
    setPicking(false);
    setQuery('');
    // ⚠️ THE KEYBOARD GOES WITH THE LIST. He has answered the family question, and
    // the next field is a row of chips that needs no keyboard at all.
    Keyboard.dismiss();
  }

  async function submit() {
    if (workspace === null) return;
    const problem = checkProduct(draft, entries, factors);
    setIssue(problem);
    setFailure(null);
    if (problem !== null) return;

    const outcome = await create(workspace.id, draft);
    if (!outcome.ok) {
      setFailure(createLine(outcome));
      // ⚠️⚠️ THE FAMILY THE FIRST ATTEMPT CREATED IS CARRIED FORWARD, AND
      // `retryDraft` IS WHAT DECIDES SO. Without it the next tap asks Postgres to
      // create a family it made thirty seconds earlier and is refused `23505` — a
      // shopkeeper told he already has a product he has never managed to save.
      const next = retryDraft(draft, outcome);
      if (next.familyId !== null) {
        setFamily({ kind: 'chosen', id: next.familyId, name: next.familyName });
      }
      return;
    }
    // ⚠️ THE KEYBOARD GOES BEFORE THE SCREEN DOES — ruled 2026-09-23. A keyboard
    // that survives the navigation covers the bottom of the catalog he was sent
    // there to look at, and the row that blinks may be under it.
    Keyboard.dismiss();
    // ⚠️⚠️ THE CONFIRMATION IS ON THE OTHER SCREEN, WHICH IS THE OWNER'S RULING.
    // `dismissTo` pops back to the Productos already in the stack rather than
    // pushing a second copy of it, and `?nuevo=` is what makes that list scroll
    // the new product into sight and blink it.
    //
    // ⚠️⚠️ AND IT CARRIES ONLY THE NEW PRODUCT. A released family used to travel with
    // it too, so Productos could show the sentence again and keep it up — and the
    // owner had that removed on 2026-09-23, the same day it was added: it appeared
    // when nothing had been released. **The banner now lives only on this screen, for
    // one second, where the thing it describes actually happens.**
    router.dismissTo({ pathname: '/productos', params: { nuevo: outcome.variantId } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda />

      <ScrollView
        contentContainerStyle={{
          padding: scale.space,
          gap: scale.space,
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {loading || failed !== null ? (
          // ⚠️⚠️ THE FORM WAITS FOR THE CATALOG RATHER THAN OPENING WITHOUT IT,
          // and that is correctness. The family search, the duplicate courtesy and
          // the unit preselect are all answered out of the rows `useCatalog`
          // holds. ⚠️ An EMPTY catalog is not this state and must not be — that is
          // C8.2's shop on its first morning.
          <Aviso line={catalogLine(loading, '', failed)} />
        ) : (
          <>
            <Campo label={ES.catalog.create.nameLabel}>
              <Caja>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={ES.catalog.create.nameHint}
                  placeholderTextColor={PALETTE.tintaApagada}
                  // ⚠️ SENTENCES, NOT WORDS: a product name is `Pechuga sin
                  // hueso`, so the first letter is capitalised and the rest are
                  // not — the opposite call from the search box one screen down,
                  // which folds case on both sides anyway.
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  editable={!busy}
                  // ⚠️ THE RETURN KEY SAYS *Listo* AND CLOSES THE KEYBOARD — ruled
                  // 2026-09-23. This form is confirmed by a button on the screen, so
                  // the return key has no job of its own; `onSubmitEditing` is what
                  // makes the word true rather than decorative.
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  accessibilityLabel={ES.catalog.create.nameLabel}
                  style={{
                    flex: 1,
                    minHeight: scale.tapTarget,
                    fontSize: scale.bodySize,
                    color: PALETTE.tinta,
                  }}
                />
              </Caja>
            </Campo>

            {askFamily && (
              <Campo label={ES.catalog.create.familyLabel}>
                {picking ? (
                  <Buscar
                    query={query}
                    onQuery={setQuery}
                    options={searchFamilies(entries, query)}
                    chosenId={choice.kind === 'chosen' ? choice.id : null}
                    busy={busy}
                    onPick={pickFamily}
                    onCreate={() => {
                      setFamily({ kind: 'new', name: query });
                      setPicking(false);
                    }}
                    onMirror={() => {
                      setFamily(FAMILY_MIRROR);
                      setPicking(false);
                      setQuery('');
                    }}
                  />
                ) : (
                  <Espejo
                    text={resolved.familyName}
                    /* ⚠️ A MIRROR IS A HINT AND A CHOICE IS A VALUE, AND THE INK
                       IS THE ONLY THING THAT SAYS SO. That is the owner's
                       correction: an untouched family must not read as decided. */
                    hint={choice.kind === 'mirror'}
                    busy={busy}
                    onOpen={() => {
                      setQuery('');
                      setPicking(true);
                    }}
                  />
                )}
              </Campo>
            )}

            <Campo label={ES.catalog.create.unitLabel}>
              <Unidades codes={codes} chosen={unitCode} busy={busy} onPress={pickUnit} />
              {/* ⚠️⚠️ THE BANNER, AND IT FIRES ONLY WHEN THE FAMILY WAS ACTUALLY
                  LET GO — `chooseUnit` decides, not this file. It fades on its
                  own; nothing dismisses it and nothing is blocked while it is up. */}
              {released && (
                <Animated.View style={{ opacity: banner }}>
                  <Nota line={ES.catalog.create.unitReleased} />
                </Animated.View>
              )}
            </Campo>

            <Campo label={ES.catalog.create.priceLabel}>
              <Caja>
                <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>$</Text>
                <TextInput
                  value={pricePesos}
                  onChangeText={setPricePesos}
                  placeholder={ES.catalog.create.priceHint}
                  placeholderTextColor={PALETTE.tintaApagada}
                  // ⚠️ A DECIMAL PAD AND NOT A NUMERIC ONE: C12.2 puts the point
                  // in `35.50` and a keyboard with no point is a shopkeeper who
                  // cannot type half a peso. `parsePesos` is still what reads it —
                  // a pad is a convenience, never a validator.
                  keyboardType="decimal-pad"
                  editable={!busy}
                  // ⚠️⚠️ THIS IS THE ONE BOX `returnKeyType` CANNOT REACH.
                  // `decimal-pad` draws NO return key on either platform — and it is
                  // not optional here, because C12.2 puts the point in `35.50` and a
                  // pad without one is a shopkeeper who cannot type half a peso. On
                  // iOS the accessory bar below carries *Listo*; on Android the
                  // system's own dismiss control does the job, which is why the id is
                  // undefined there rather than pointing at a bar that cannot render.
                  inputAccessoryViewID={PRICE_PAD_ID}
                  accessibilityLabel={ES.catalog.create.priceLabel}
                  style={{
                    flex: 1,
                    minHeight: scale.tapTarget,
                    fontSize: scale.moneySize,
                    color: PALETTE.tinta,
                  }}
                />
                {/* ⚠️ WHAT THE PRICE IS PER, IN C3.10's OWN SEPARATOR — the
                    `$35.00 / kg` the catalog read already renders. A price box
                    with no unit beside it is the one figure in this app a
                    shopkeeper could read two ways. */}
                {unitCode === '' ? null : (
                  <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
                    {`${ES.catalog.per} ${unitCode}`}
                  </Text>
                )}
              </Caja>
              {/* ⚠️⚠️ THE NO-PRICE LINE, REWORDED BY THE OWNER ON 2026-09-23, AND
                  WHEN IT APPEARS IS STILL `noPriceNoticeKey`'s DECISION AND NOT
                  THIS FILE'S. It stays quiet until the rest of the draft is one
                  the database would accept, and it goes the moment the box has
                  something in it — which is what he asked for and was already
                  true. */}
              {notice === null ? null : <Nota line={ES.catalog.notice[notice]} />}
            </Campo>

            {/* ⚠️ ONE PLACE FOR BOTH KINDS OF REFUSAL — the form's own and the
                database's, which is `Invitar`'s arrangement one sheet over. Two
                slots would let the screen show two contradictory reasons at once,
                and the second is always the stale one. */}
            {(issue !== null || failure !== null) && (
              <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>
                {issue !== null ? ES.catalog.issues[issue] : failure}
              </Text>
            )}

            <Boton
              label={busy ? ES.catalog.create.working : ES.catalog.create.submit}
              busy={busy}
              onPress={() => void submit()}
            />
          </>
        )}
      </ScrollView>

      {/* ⚠️ MOUNTED ONCE AND OUTSIDE THE SCROLL VIEW. `InputAccessoryView` renders
          into the keyboard rather than into the layout, so where it sits in the tree
          does not matter — but mounting it inside the conditional branch would mean
          the bar disappearing while the catalog read is out, which is the one moment
          the price box cannot be reached anyway. */}
      <TecladoListo />
    </View>
  );
}

/**
 * The id tying the price box to its accessory bar.
 *
 * ⚠️ IT IS A CONSTANT AND NOT A LITERAL AT TWO CALL SITES, because `InputAccessoryView`
 * matches a `TextInput` to a bar by STRING EQUALITY — two spellings is a bar that
 * renders and never appears, with nothing to say why.
 */
const PRICE_PAD_ID = 'wera.price.pad';

/**
 * *Listo*, above the number pad — the only keyboard in this app with no return key.
 *
 * ⚠️⚠️ iOS ONLY, AND THE `Platform` CHECK IS THE HONEST HALF OF THE RULING RATHER
 * THAN A GAP IN IT. `InputAccessoryView` does not exist on Android in React Native;
 * Android's own keyboard draws a dismiss control the platform owns, so the shopkeeper
 * has a way off the pad on both of C1.1's kinds of phone — by two different routes,
 * which is worth knowing when he reports one and not the other.
 *
 * ⚠️ `R9`: nothing in this repository can see whether this bar appears, whether it
 * sits where a thumb expects it, or whether Android's control is discoverable at all.
 * **The instrument is the owner's phone**, and both platforms need asking, which is
 * `R10`'s lesson about `formatToParts` applied to a control instead of to an API.
 */
function TecladoListo() {
  const { scale } = useDensity();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={PRICE_PAD_ID}>
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
            {ES.catalog.create.done}
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

/** The room's name and the way out. ⚠️ *Cancelar*, not *Volver* — see `ES`. */
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
        style={{ flex: 1, fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}
      >
        {ES.catalog.create.title}
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
          {ES.catalog.create.cancel}
        </Text>
      </Pressable>
    </View>
  );
}

/** A labelled field. `Invitar`'s own `Campo`, and `5h.5` is where the two meet. */
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

/** The catalog is not here yet, or could not be asked. */
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
 * The family, collapsed — scenario 1, and the owner's correction in one prop.
 *
 * ⚠️⚠️ `hint` IS THE WHOLE POINT. When the family is mirroring the product's name
 * nothing has been chosen, so the text is `tintaApagada` — the same ink as the
 * placeholder in every other box on this screen — and it reads as *this is what
 * it will be called* rather than as *this is the family*. The moment he picks or
 * types one it becomes `tinta` and his. The first version drew a matched family in
 * full ink, and he said it *"looks as a decision already made"*.
 *
 * ⚠️ `Cambiar` IS A WORD AND NOT A CHEVRON (C12.1), and it is the gesture C8.11
 * asks for.
 */
function Espejo({
  text,
  hint,
  busy,
  onOpen,
}: {
  text: string;
  hint: boolean;
  busy: boolean;
  onOpen: () => void;
}) {
  const { scale } = useDensity();
  const empty = text === '';
  return (
    <Caja>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          minHeight: scale.tapTarget,
          paddingVertical: scale.rowGap,
          fontSize: scale.bodySize,
          fontWeight: hint || empty ? '400' : '600',
          color: hint || empty ? PALETTE.tintaApagada : PALETTE.tinta,
        }}
      >
        {empty ? ES.catalog.create.familyHint : text}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onOpen}
        style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
          {ES.catalog.create.familyChange}
        </Text>
      </Pressable>
    </Caja>
  );
}

/**
 * The family search — the owner's *"improved search on existing Families while
 * still allowing the user to create a new Family"*, in his own order.
 *
 * ⚠️⚠️ THE ORDER OF THE THREE BLOCKS IS THE HIERARCHY HE RANKED, AND IT IS NOT
 * ALPHABETICAL OR ARBITRARY. The box he types into comes first (scenario 2, *"user
 * types the new family he wants to create"*), with *Crear esta familia* attached
 * to it; the families the shop already has come under it (scenario 3, *"user
 * realizes there's an existing family"*); and the way back to the mirror
 * (scenario 1) sits last, because it is the state he arrived in and the one he
 * needs a control for least.
 *
 * ⚠️ `searchFamilies` RANKS THE LIST AND THIS COMPONENT DOES NOT (`R3`). Putting
 * `Pollo` above `Pollo rostizado` is the whole value of the search and it has a
 * right answer a node suite can read.
 *
 * ⚠️ *Crear esta familia* IS HIDDEN WHEN THE BOX IS EMPTY, because a family with
 * no name is `familyMissing` and offering it would be offering a refusal.
 */
function Buscar({
  query,
  onQuery,
  options,
  chosenId,
  busy,
  onPick,
  onCreate,
  onMirror,
}: {
  query: string;
  onQuery: (text: string) => void;
  options: readonly { readonly id: string; readonly name: string }[];
  chosenId: string | null;
  busy: boolean;
  onPick: (option: { readonly id: string; readonly name: string }) => void;
  onCreate: () => void;
  onMirror: () => void;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap }}>
      <Caja>
        <MaterialCommunityIcons name="magnify" size={scale.iconSize} color={PALETTE.tintaApagada} />
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder={ES.catalog.create.familySearch}
          placeholderTextColor={PALETTE.tintaApagada}
          autoCapitalize="sentences"
          autoCorrect={false}
          autoFocus
          editable={!busy}
          // ⚠️ *Listo* CLOSES THE KEYBOARD AND THEREFORE CLOSES THIS LIST — the
          // ruling's two halves meeting in one control: a dismissed keyboard means
          // the family question is answered, either by a row he tapped or by the
          // mirror he left alone.
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel={ES.catalog.create.familySearch}
          style={{
            flex: 1,
            minHeight: scale.tapTarget,
            fontSize: scale.bodySize,
            color: PALETTE.tinta,
          }}
        />
      </Caja>

      {query.trim() !== '' && (
        <Opcion chosen={false} icon="plus" label={ES.catalog.create.familyCreate} sub={query.trim()} onPress={onCreate} />
      )}

      {options.length > 0 && <Nota line={ES.catalog.create.familyExisting} />}
      {options.map((option) => (
        <Opcion
          key={option.id}
          chosen={option.id === chosenId}
          label={option.name}
          onPress={() => onPick(option)}
        />
      ))}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onMirror}
        style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
          {ES.catalog.create.familyMirror}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * One choice in a list of them.
 *
 * ⚠️ THREE SIGNALS FOR THE CHOSEN ONE — ground, border and a filled tick — which
 * is the palette's rule and not decoration: `accion` and `atencion` are 1.18:1
 * apart in luminance, so a state carried by hue alone is a state one man in twelve
 * cannot see. `R9` cannot look at this, which is why it is written here.
 */
function Opcion({
  chosen,
  label,
  sub,
  icon,
  onPress,
}: {
  chosen: boolean;
  label: string;
  sub?: string;
  icon?: 'plus';
  onPress: () => void;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      accessibilityLabel={sub === undefined ? label : `${label}. ${sub}`}
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
        name={icon === 'plus' ? 'plus' : chosen ? 'check-circle' : 'circle-outline'}
        size={scale.iconSize}
        color={chosen || icon === 'plus' ? PALETTE.accion : PALETTE.tintaApagada}
      />
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: scale.bodySize,
            fontWeight: chosen ? '700' : '400',
            color: PALETTE.tinta,
          }}
        >
          {label}
        </Text>
        {sub === undefined ? null : (
          <Text
            numberOfLines={1}
            style={{ fontSize: scale.bodySize * 0.85, fontWeight: '600', color: PALETTE.tinta }}
          >
            {sub}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/**
 * The one unit question C8.10 asks — all ten of them, always.
 *
 * ⚠️⚠️ ALL TEN, WHICH REVERSES WHAT THIS SCREEN DID YESTERDAY. The first version
 * narrowed the list to the chosen family's dimension; the owner replaced that with
 * a rule he can SEE — pick anything, and a unit the family cannot hold releases
 * the family and says why. `chooseUnit` is where that lives.
 *
 * ⚠️ ONE QUESTION AND FOUR COLUMNS. `product_variant` demands
 * `base_unit_code`, `purchase_unit_code`, `sell_unit_code` and `price_unit_code`
 * all `not null`; `unitColumns` fans the one answer into all four, and a
 * shopkeeper is never asked four times.
 *
 * ⚠️ THE CODES ARE THE DATABASE'S WORDS AND ARE NOT TRANSLATED — `kg`, `250g`,
 * `pza`, the same strings `@/api/catalog` renders in `$35.00 / kg`. They are not
 * in `ES` because they are not this app's words to choose; they are `0001`'s ten
 * rows, and a second spelling here is the drift `R4` prevents, applied to data.
 *
 * ⚠️ WRAPPING RATHER THAN SCROLLING, because a horizontal list hides its own far
 * end: ten chips at *Letra grande* take three rows, and rows a person can see beat
 * one row with something off the side of it.
 */
function Unidades({
  codes,
  chosen,
  busy,
  onPress,
}: {
  codes: readonly string[];
  chosen: string;
  busy: boolean;
  onPress: (code: string) => void;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap }}>
      {codes.map((code) => {
        const isChosen = code === chosen;
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: isChosen }}
            accessibilityLabel={code}
            disabled={busy}
            onPress={() => onPress(code)}
            style={{
              minHeight: scale.tapTarget,
              minWidth: scale.tapTarget,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: scale.space,
              borderRadius: scale.space / 2,
              borderWidth: isChosen ? 2 : 1,
              borderColor: isChosen ? PALETTE.accion : PALETTE.linea,
              backgroundColor: isChosen ? PALETTE.accionSuave : PALETTE.superficie,
            }}
          >
            <Text
              style={{
                fontSize: scale.bodySize,
                fontWeight: isChosen ? '700' : '500',
                color: isChosen ? PALETTE.accion : PALETTE.tinta,
              }}
            >
              {code}
            </Text>
          </Pressable>
        );
      })}
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

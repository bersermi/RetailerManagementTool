import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog, useCreateProduct, useMyRole, useWorkspace } from '@/api/hooks';
import { catalogLine } from '@/api/catalog';
import {
  FAMILY_SUGGESTED,
  canWriteCatalog,
  checkProduct,
  familiesFrom,
  noPriceNoticeKey,
  resolveFamily,
  retryDraft,
  savedLine,
  unitChoice,
  unitOptions,
  createLine,
  type FamilyChoice,
  type ProductIssue,
} from '@/api/catalogWrite';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// AGREGAR — THE SHORTEST FORM THAT PRODUCES A USABLE PRODUCT. Plan task `5e-ii`,
// the app's FIFTH non-tab surface, and the first screen in this app that WRITES
// something the shop sells.
//
// ⚠️⚠️ IT IS PILOT-CRITICAL RATHER THAN A CONVENIENCE, AND C8.2 IS WHY. The
// owner builds the pilot catalog himself (C8.1) but builds it DELIBERATELY
// INCOMPLETE — *"to encourage him to create some on his own"* — so the first
// product this shop ever makes is made on this screen, by a shopkeeper, with
// nobody watching. A form that is nearly right here is a catalog that is wrong
// for the rest of the pilot.
//
// ⚠️ FOUR FIELDS AND NOTHING ELSE (C8.9): a name, a family, one unit, one
// price. `tax_rate` and `pack_size` are `5e-iii`'s and are never guessed at a
// till; `enforce_stock` is on NO pilot screen at all (C8.8 — C8.6 guarantees
// permanent drift, and turning it on breaks the pollería at the counter); the
// price is SHOP-WIDE by the decision `5e-i` recorded; and there is no expiry
// date, because the owner ruled on 2026-09-22 that the pilot captures none.
//
// ⚠️⚠️ IT DECIDES NOTHING, WHICH IS THE SEAM `5e`'s SPLIT WAS MADE ON — and
// drawing it moved five decisions into `@/api/catalogWrite` rather than keeping
// any here. `canWriteCatalog` is the fence, `resolveFamily` is which family
// answer wins, `unitOptions` and `unitChoice` are C8.5, `savedLine` is what a
// successful create says, and `checkProduct` / `noPriceNoticeKey` / `createLine`
// / `retryDraft` were already that child's. `R3`: a rule written into this file
// is a rule no check in this repository will ever see, and
// `app/test/api-catalog-write.test.ts` reads every one of them.
//
// ⚠️⚠️ THE FENCE IS DRAWN RATHER THAN DISCOVERED, AND THIS SCREEN IS THE SECOND
// HALF OF THAT. `canWriteCatalog` keeps the OPENING controls off a cashier's
// Productos and off her family screen; this file's own guard is what handles the
// case those cannot — a manager demoted while the form was already open, and a
// deep link. ⚠️ It renders NOTHING rather than a refusal: the three INSERT
// policies answer a bare `42501` with no sentence of its own, and a control that
// looks live and refuses silently is what [[shift-cover-is-a-reassignment]]
// records and what `5d-iii` already chose against for these same three buttons.
//
// ⚠️⚠️ TWO ENTRY POINTS, AND THE FAMILY BEHAVES DIFFERENTLY IN ONE OF THEM —
// C8.12, exactly. From Productos: type the name, get a family SUGGESTION,
// override it by a gesture (C8.11). From inside an opened family, with
// `?familia=<id>`: the variant belongs to that family and **no family question
// is asked at all**. ⚠️ The third door C8.12 names — the Comprar/Vender `...`
// quick action — is ROUTED to `5f` and `5g`, which build the screens it would
// open from; a door with no room behind it is the scaffolding `5d` spent a step
// deleting.
//
// ⚠️ THE FORM STAYS OPEN AFTER A SUCCESSFUL SAVE and keeps the family and the
// unit, which is a decision and not an oversight: C8.2's shopkeeper adds
// `Pechuga`, `Pierna` and `Muslo` in one sitting, all `Pollo`, all in kilos, and
// returning to Productos each time is a tap per product spent getting back
// ([[prefer-the-option-that-adds-no-human-step]]). What it costs is seeing the
// row appear in the list, and the saved product's NAME above
// `ES.catalog.create.saved` is what pays for it.
//
// ⚠️⚠️ NOT IN `RESTORABLE_ROUTES`, AND HERE THAT IS SHARPER THAN ON THE TWO
// SCREENS BEFORE IT. C1.3 reopens the screen a person was WORKING on, and this
// is the only one so far where that argument could be made — but a half-typed
// product restored on the next launch is a form claiming to remember state it
// never stored, and nothing on this screen survives the app closing.
//
// ⚠️ A PUSHED SCREEN AND NOT A SHEET, like Productos and La Familia, with its
// own `banda` because the root `Stack` draws no header. ⚠️ At the ROOT and in NO
// group, so `groupOf()` calls it `null` and `redirectFor` leaves a member where
// they are.
//
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11, and on this
// screen it is the whole of the design. Nothing here will ever say whether the
// suggested family reads as a proposal rather than a decision already taken,
// whether `Cambiar` is findable, whether the no-price line is quiet enough to
// live under a field or loud enough to be read, whether five unit chips fit on
// one line at *Letra grande*, or whether staying on the form after a save reads
// as *saved* or as *nothing happened*. **The instrument is the owner's phone**,
// and the questions it is asked are written into this task's row in
// `docs/PLAN.md` before this ships.
// ============================================================================

export default function NuevoProducto() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  // ⚠️ THE FAMILY IS A QUERY PARAMETER AND ITS ABSENCE IS THE OTHER ENTRY POINT.
  // C8.12's two doors are one route: `?familia=<id>` is *from inside an opened
  // family*, and no parameter is *from Productos*. A link that lost it asks the
  // family question, which is the failure worth having.
  const { familia } = useLocalSearchParams<{ familia?: string }>();
  const role = useMyRole();
  const workspace = useWorkspace();
  const { loading, entries, failed } = useCatalog();
  const { create, busy, factors, units } = useCreateProduct();

  const [name, setName] = useState('');
  const [pricePesos, setPricePesos] = useState('');
  const [chosenUnit, setChosenUnit] = useState('');
  const [family, setFamily] = useState<FamilyChoice>(FAMILY_SUGGESTED);
  const [picking, setPicking] = useState(false);
  const [issue, setIssue] = useState<ProductIssue | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ readonly name: string; readonly line: string } | null>(null);

  const families = familiesFrom(entries);
  // ⚠️ THE FIXED FAMILY'S NAME IS LOOKED UP AND ITS ID IS NOT. `familyId` is
  // what the insert needs and what the route supplied; the name is only ever
  // rendered, so a family the read has not reached yet shows no word and still
  // attaches to the right row.
  const fixed = familia === undefined ? null : familia;
  const choice: FamilyChoice =
    fixed === null
      ? family
      : { kind: 'chosen', id: fixed, name: families.find((f) => f.id === fixed)?.name ?? '' };

  const resolved = resolveFamily(choice, entries, name);
  const options = unitOptions(units, entries, resolved.familyId);
  const unitCode = unitChoice(options, chosenUnit);
  const draft = { name, ...resolved, unitCode, pricePesos };
  const notice = noPriceNoticeKey(draft, entries, factors);

  // ⚠️⚠️ THE FENCE, AND IT RENDERS NOTHING RATHER THAN A SENTENCE. See the
  // header: a cashier is never shown the control that gets here, so reaching
  // this line means a demotion mid-shift or a deep link, and the honest answer
  // to both is that this screen does not exist for her. ⚠️ `role === null` is
  // "not known" and is fenced out with her (`roleOf`), so the form appears when
  // the membership read lands rather than being snatched away after it.
  if (!canWriteCatalog(role) || workspace === null) return null;

  async function submit() {
    if (workspace === null) return;
    const problem = checkProduct(draft, entries, factors);
    setIssue(problem);
    setFailure(null);
    setSaved(null);
    if (problem !== null) return;

    const outcome = await create(workspace.id, draft);
    if (!outcome.ok) {
      setFailure(createLine(outcome));
      // ⚠️⚠️ THE FAMILY THE FIRST ATTEMPT CREATED IS CARRIED FORWARD, AND
      // `retryDraft` IS WHAT DECIDES SO. Without it the next tap asks Postgres
      // to create a family it made thirty seconds earlier and is refused
      // `23505` — a shopkeeper told she already has a product she has never
      // managed to save. This is that module's answer mirrored into the form's
      // own state, not a second opinion about it.
      const next = retryDraft(draft, outcome);
      if (next.familyId !== null) {
        setFamily({ kind: 'chosen', id: next.familyId, name: next.familyName });
      }
      return;
    }
    // ⚠️ THE NAME AND THE UNIT SURVIVE DIFFERENTLY: the product's name and its
    // price are cleared because the next product has its own, and the family and
    // the unit are kept because the next product almost certainly shares them.
    setSaved({ name: draft.name.trim(), line: savedLine(outcome) });
    setName('');
    setPricePesos('');
    setIssue(null);
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
          // and that is correctness. Every family question on this screen is
          // answered out of the rows `useCatalog` holds — the suggestion, the
          // list to override with, the duplicate courtesy and the units C8.5
          // allows — so a form drawn on an empty read would propose a NEW family
          // for a product whose family this shop already has, and offer all ten
          // units inside a family measured in kilos. ⚠️ An EMPTY catalog is not
          // this state and must not be: that is C8.2's shop on its first
          // morning, and adding the first product is exactly what it is for.
          <Aviso line={catalogLine(loading, '', failed)} />
        ) : (
          <>
            <Campo label={ES.catalog.create.nameLabel}>
              <Caja>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={ES.catalog.create.namePlaceholder}
                  placeholderTextColor={PALETTE.tintaApagada}
                  // ⚠️ SENTENCES, NOT WORDS: a product name is `Pechuga sin
                  // hueso`, so the first letter is capitalised and the rest are
                  // not — the opposite call from the search box one screen down,
                  // which folds case on both sides anyway.
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  editable={!busy}
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

            {/* ⚠️ NO FAMILY QUESTION FROM INSIDE A FAMILY — C8.12, in its own
                words: *"the new variant belongs to that family, no question
                asked."* The banda already names the family she came from. */}
            {fixed === null && (
              <Campo label={ES.catalog.create.familyLabel}>
                <Familia
                  resolvedId={resolved.familyId}
                  resolvedName={resolved.familyName}
                  creating={resolved.familyId === null && resolved.familyName !== ''}
                  picking={picking}
                  families={families}
                  typed={choice.kind === 'new' ? choice.name : ''}
                  busy={busy}
                  onOpen={() => setPicking(true)}
                  onChoose={(option) => {
                    setFamily({ kind: 'chosen', id: option.id, name: option.name });
                    setPicking(false);
                  }}
                  onType={(text) => setFamily({ kind: 'new', name: text })}
                  onSuggested={() => {
                    setFamily(FAMILY_SUGGESTED);
                    setPicking(false);
                  }}
                />
              </Campo>
            )}

            <Campo label={ES.catalog.create.unitLabel}>
              <Unidades
                options={options}
                chosen={unitCode}
                busy={busy}
                onPress={setChosenUnit}
              />
              {/* ⚠️ THE LIST IS SHORTER INSIDE A FAMILY AND THE SCREEN SAYS SO.
                  C8.5 holds every variant of a family to one dimension and
                  `unitOptions` is the only thing that keeps it, so six missing
                  options need a reason on screen rather than a puzzle. */}
              {resolved.familyId !== null && options.length < units.length && (
                <Nota line={ES.catalog.create.unitFamily} />
              )}
            </Campo>

            <Campo label={ES.catalog.create.priceLabel}>
              <Caja>
                <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>$</Text>
                <TextInput
                  value={pricePesos}
                  onChangeText={setPricePesos}
                  placeholder={ES.catalog.create.pricePlaceholder}
                  placeholderTextColor={PALETTE.tintaApagada}
                  // ⚠️ A DECIMAL PAD AND NOT A NUMERIC ONE: C12.2 puts the point
                  // in `35.50` and a keyboard with no point is a shopkeeper who
                  // cannot type half a peso. `parsePesos` is still what reads it
                  // — a pad is a convenience, never a validator.
                  keyboardType="decimal-pad"
                  editable={!busy}
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
              {/* ⚠️⚠️ THE NO-PRICE LINE, AND WHEN IT APPEARS IS `noPriceNoticeKey`'s
                  DECISION AND NOT THIS FILE'S. The owner ruled on 2026-09-22 that
                  a product may be created with none and that the surface is a LINE
                  with no extra tap — never a confirmation he dismisses. It stays
                  quiet until the rest of the draft is one the database would
                  accept, because the box starts empty and a notice keyed on
                  emptiness alone would be on screen before a character is typed. */}
              {notice === null ? null : <Nota line={ES.catalog.notice[notice]} />}
            </Campo>

            {/* ⚠️ ONE PLACE FOR BOTH KINDS OF REFUSAL — the form's own and the
                database's, which is `Invitar`'s arrangement one sheet over. Two
                slots would let the screen show two contradictory reasons at
                once, and the second is always the stale one. */}
            {(issue !== null || failure !== null) && (
              <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>
                {issue !== null ? ES.catalog.issues[issue] : failure}
              </Text>
            )}

            <Boton
              icon="check"
              label={busy ? ES.catalog.create.working : ES.catalog.create.submit}
              busy={busy}
              onPress={() => void submit()}
            />

            {saved === null ? null : <Guardado name={saved.name} line={saved.line} />}
          </>
        )}
      </ScrollView>
    </View>
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
      <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}>
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
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
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
  return (
    <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{line}</Text>
  );
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
 * C8.11 — the family SUGGESTED from the typed name, and overridable by a
 * gesture.
 *
 * ⚠️⚠️ THE SUGGESTION IS SHOWN AS A PROPOSAL AND NOT AS A CHOSEN VALUE, which
 * is the one thing about this control that could be wrong in a way a shopkeeper
 * pays for. She is typing a product; the family under it moves as she types; and
 * if it reads as settled she will not look at it. `Cambiar` beside it is what
 * says it is hers to move — a WORD, because C12.1 refuses an icon with nothing
 * next to it.
 *
 * ⚠️ AND IT SAYS WHICH OF TWO THINGS WILL HAPPEN. Attaching to `Pollo` changes
 * nothing about the shop; creating `Pollo` adds a row she will see for ever, so
 * `ES.catalog.create.familyNew` is under it in that case and not in the other.
 *
 * ⚠️ NOTHING HERE DECIDES WHICH FAMILY WINS — `resolveFamily` does, and this
 * control is handed the answer (`R3`). What it holds is a keystroke and whether
 * the list is open.
 */
function Familia({
  resolvedId,
  resolvedName,
  creating,
  picking,
  families,
  typed,
  busy,
  onOpen,
  onChoose,
  onType,
  onSuggested,
}: {
  resolvedId: string | null;
  resolvedName: string;
  creating: boolean;
  picking: boolean;
  families: readonly { readonly id: string; readonly name: string }[];
  typed: string;
  busy: boolean;
  onOpen: () => void;
  onChoose: (option: { readonly id: string; readonly name: string }) => void;
  onType: (text: string) => void;
  onSuggested: () => void;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap }}>
      {!picking && (
        <Caja>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              minHeight: scale.tapTarget,
              paddingVertical: scale.rowGap,
              fontSize: scale.bodySize,
              fontWeight: '600',
              color: resolvedName === '' ? PALETTE.tintaApagada : PALETTE.tinta,
            }}
          >
            {resolvedName === '' ? ES.catalog.create.familyOwnPlaceholder : resolvedName}
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
      )}

      {picking && (
        <View style={{ gap: scale.rowGap }}>
          <Nota line={ES.catalog.create.familyPick} />
          {families.map((option) => (
            <Opcion
              key={option.id}
              chosen={option.id === resolvedId}
              label={option.name}
              onPress={() => onChoose(option)}
            />
          ))}
          <Nota line={ES.catalog.create.familyOwn} />
          <Caja>
            <TextInput
              value={typed}
              onChangeText={onType}
              placeholder={ES.catalog.create.familyOwnPlaceholder}
              placeholderTextColor={PALETTE.tintaApagada}
              autoCapitalize="sentences"
              autoCorrect={false}
              editable={!busy}
              accessibilityLabel={ES.catalog.create.familyOwn}
              style={{
                flex: 1,
                minHeight: scale.tapTarget,
                fontSize: scale.bodySize,
                color: PALETTE.tinta,
              }}
            />
          </Caja>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onSuggested}
            style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
              {ES.catalog.create.familySuggested}
            </Text>
          </Pressable>
        </View>
      )}

      {creating && <Nota line={ES.catalog.create.familyNew} />}
    </View>
  );
}

/**
 * One choice, ticked or not. `Invitar`'s `Opcion` without the subtitle.
 *
 * ⚠️ THREE SIGNALS FOR THE CHOSEN ONE — ground, border and a filled tick — which
 * is the palette's rule and not decoration: `accion` and `atencion` are 1.18:1
 * apart in luminance, so a state carried by hue alone is a state one man in
 * twelve cannot see. `R9` cannot look at this, which is why it is written here.
 */
function Opcion({
  chosen,
  label,
  onPress,
}: {
  chosen: boolean;
  label: string;
  onPress: () => void;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      onPress={onPress}
      style={{
        minHeight: scale.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        paddingHorizontal: scale.space,
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
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The one unit question C8.10 asks, out of the units C8.5 allows.
 *
 * ⚠️⚠️ ONE QUESTION AND FOUR COLUMNS. `product_variant` demands
 * `base_unit_code`, `purchase_unit_code`, `sell_unit_code` and
 * `price_unit_code` all `not null`; `unitColumns` fans the one answer into all
 * four, and a shopkeeper is never asked four times.
 *
 * ⚠️ THE CODES ARE THE DATABASE'S WORDS AND ARE NOT TRANSLATED — `kg`, `250g`,
 * `pza`, the same strings `@/api/catalog` already renders in `$35.00 / kg`. They
 * are not in `ES` because they are not this app's words to choose; they are
 * `0001`'s ten rows, and a second spelling of them here is the drift `R4` exists
 * to prevent applied to data rather than to prose.
 *
 * ⚠️ WRAPPING RATHER THAN SCROLLING, because a horizontal list hides its own
 * far end: five chips at *Letra grande* take two rows, and two rows a person can
 * see beat one row with something off the side of it.
 */
function Unidades({
  options,
  chosen,
  busy,
  onPress,
}: {
  options: readonly string[];
  chosen: string;
  busy: boolean;
  onPress: (code: string) => void;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap }}>
      {options.map((code) => {
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

/** `Invitar`'s button, one icon narrower. */
function Boton({
  icon,
  label,
  onPress,
  busy = false,
}: {
  icon: 'check';
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
 * What just landed, and it is the only confirmation this form gives.
 *
 * ⚠️⚠️ THE PRODUCT'S NAME IS THE POINT AND THE SENTENCE IS THE CONTEXT. The
 * form stays open and the name box is cleared, so without the name here a
 * shopkeeper adding six products in a row has no way to tell the sixth
 * confirmation from the fifth. `savedLine` chooses between the two sentences,
 * out of `CreateSucceeded.priced` — a product saved wearing C3.12's dash is a
 * different event from one saved with a price, and `5e-i` put that flag on the
 * outcome for exactly this line.
 *
 * ⚠️ `accionSuave` AND NOT `atencionSuave`, INCLUDING FOR THE PRICELESS CASE.
 * Nothing went wrong: the owner ruled on 2026-09-22 that a product may be
 * created with no price, so amber here would be an alarm about a thing he chose.
 * ⚠️ And the state is not carried by the colour: `ES.catalog.create.savedLabel`
 * is the word beside it, which is the rule direction C left behind.
 *
 * ⚠️ NO ANIMATION. §2.11's motion rule allows `transform` and `opacity` only
 * (C1.1 puts two low-end Androids in the pilot), and the owner's confirmation
 * animation is `5f`'s deliverable on the sale — a second, different one invented
 * here would be the pattern decided by whichever screen shipped first.
 */
function Guardado({ name, line }: { name: string; line: string }) {
  const { scale } = useDensity();
  return (
    <View
      accessible
      accessibilityLabel={`${ES.catalog.create.savedLabel}. ${name}. ${line}`}
      style={{
        gap: scale.rowGap / 2,
        padding: scale.space,
        borderRadius: scale.space / 2,
        borderWidth: 1,
        borderColor: PALETTE.accion,
        backgroundColor: PALETTE.accionSuave,
      }}
    >
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
        {ES.catalog.create.savedLabel}
      </Text>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
        {name}
      </Text>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta }}>{line}</Text>
    </View>
  );
}

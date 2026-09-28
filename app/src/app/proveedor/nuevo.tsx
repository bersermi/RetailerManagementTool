import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateProvider, useMyRole, useProviders, useWorkspace } from '@/api/hooks';
import {
  canWriteProviders,
  checkProvider,
  issueLine,
  providerInsert,
  providerWriteErrorMessage,
  type ProviderDraft,
  type ProviderIssue,
} from '@/api/providerDirectory';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { TecladoListo } from '@/ui/TecladoListo';

// ============================================================================
// NUEVO PROVEEDOR — the form behind the create row on Proveedores. Plan task
// `6b`, and the second write this app makes into a table a shopkeeper curates.
//
// ⚠️⚠️ ONE ROW, ONE ROUND TRIP, AND THAT IS WHY THIS SCREEN IS SHORTER THAN
// `producto/nuevo.tsx` BY SIX HUNDRED LINES. That form writes a family, a variant
// and a price over three calls with no transaction between them, so most of it is
// about which half landed. `provider` is one flat table: the insert either
// happened or it did not, and there is no partial state to have a sentence for.
//
// ⚠️ THE ONLY DOOR IN IS THE CREATE ROW, AND IT ARRIVES WITH THE NAME ALREADY IN
// THE BOX — `?nombre=<what he typed into the search>`. That is the owner's ruling
// of 2026-09-23 carried through: the word he typed to reach this screen is the
// name he meant, so asking for it again would be the app forgetting on purpose.
//
// ⚠️⚠️ THE PREFILLED NAME IS A VALUE AND THE OTHER THREE BOXES HOLD HINTS, AND THE
// DIFFERENCE IS THE RULING OF THAT SAME DAY. *"Look as a decision already made"*
// was his complaint about a family the form had matched for him and a price box
// that looked answered — **but a name he typed himself is not a decision the app
// made**, so it is `tinta` and his from the first frame. Nothing else is filled in
// from anything.
//
// ⚠️⚠️ THREE OF THE FOUR FIELDS ARE OPTIONAL AND THE FORM SAYS SO ON EACH ONE.
// `0002` makes `contact_name`, `phone` and `address_line1` nullable; only `name` is
// `not null`, and it also carries `provider_name_not_blank`. The alternative to
// saying *Opcional* is a shopkeeper inventing a phone number to get past a box —
// and a made-up number in a directory is worse than an empty one, because it looks
// like something you can ring.
//
// ⚠️ THE FENCE RENDERS NOTHING RATHER THAN A SENTENCE — `producto/nuevo.tsx`'s call
// and its reason. A cashier is never shown the row that gets here, so reaching this
// line means a demotion mid-shift or a deep link, and the honest answer to both is
// that this screen does not exist for her. ⚠️ `role === null` is *not known yet*
// and is fenced out with her, so the form appears when the membership read lands
// rather than being snatched away after it.
//
// ⚠️⚠️ ON SUCCESS IT GOES BACK TO PROVEEDORES AND THE NEW SUPPLIER BLINKS THERE.
// `router.dismissTo` pops back to the list already in the stack with
// `?nuevo=<provider id>`, so the confirmation is *seeing her in the directory*
// rather than a sentence on a form that is about to close — the owner's ruling, and
// he asked for nothing else beside it.
//
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11: whether four boxes
// on one screen is one too many at *Letra grande*, whether *Opcional* three times
// reads as permission or as noise, and whether a `phone-pad` is the right keyboard
// for a Mexican number somebody writes with spaces. **The instrument is the owner's
// phone**, and those questions are in this task's row in `docs/PLAN.md`.
// ============================================================================

export default function NuevoProveedor() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  const { nombre } = useLocalSearchParams<{ nombre?: string }>();
  const role = useMyRole();
  const workspace = useWorkspace();
  // ⚠️ THE EXISTING SUPPLIERS ARE READ SO `checkProvider` CAN REFUSE A DUPLICATE
  // BEFORE THE ROUND TRIP. It is the same `PROVIDERS_KEY` the list screen drew
  // from, so arriving here costs nothing — and the local answer is deliberately
  // incomplete: see `checkProvider`, and `ES.providers.errors.duplicate`, which is
  // the same sentence arriving from the database.
  const { providers } = useProviders(null);
  const { create, busy } = useCreateProvider();

  // ⚠️ THE NAME IS SEEDED FROM THE PARAMETER ONCE, IN THE INITIALISER, AND NEVER
  // PUSHED BACK IN BY AN EFFECT. An effect that re-applied `nombre` would undo his
  // editing on the next render — the trap `producto/nuevo.tsx` records.
  // ⚠️⚠️ AND IT IS A TAB-FREE SCREEN, so `useState(() => …)`'s staleness problem
  // ([[tab-screens-keep-stale-mount-state]]) does not apply: this route is pushed
  // and unmounted, not a tab kept alive under another one.
  const [draft, setDraft] = useState<ProviderDraft>(() => ({
    name: nombre ?? '',
    contact: '',
    phone: '',
    address: '',
  }));
  const [issue, setIssue] = useState<ProviderIssue | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const working = saving || busy;

  if (!canWriteProviders(role) || workspace === null) return null;

  function field(key: keyof ProviderDraft) {
    return (text: string) => setDraft((held) => ({ ...held, [key]: text }));
  }

  async function submit() {
    if (workspace === null) return;
    const problem = checkProvider(draft, providers);
    setIssue(problem);
    setFailure(null);
    if (problem !== null) return;

    setSaving(true);
    let id: string;
    try {
      id = await create(providerInsert(draft, workspace.id));
    } catch (thrown) {
      setSaving(false);
      setFailure(providerWriteErrorMessage(thrown));
      return;
    }
    setSaving(false);
    // ⚠️ THE KEYBOARD GOES BEFORE THE SCREEN DOES — the ruling of 2026-09-23 and
    // its measured cause: a keyboard that survives the navigation covers the
    // bottom of the list he is sent back to, and the row that blinks may be under
    // it.
    Keyboard.dismiss();
    router.dismissTo({ pathname: '/proveedores', params: { nuevo: id } });
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
        <Campo label={ES.providers.fields.nameLabel}>
          <Caja>
            <TextInput
              value={draft.name}
              onChangeText={field('name')}
              placeholder={ES.providers.fields.nameHint}
              placeholderTextColor={PALETTE.tintaApagada}
              // ⚠️ SENTENCES AND NOT WORDS — a supplier is `Bodega del Centro`,
              // and `words` would capitalise `Del`.
              autoCapitalize="sentences"
              autoCorrect={false}
              editable={!working}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel={ES.providers.fields.nameLabel}
              style={{
                flex: 1,
                minHeight: scale.tapTarget,
                fontSize: scale.bodySize,
                color: PALETTE.tinta,
              }}
            />
          </Caja>
        </Campo>

        <Campo label={ES.providers.fields.contactLabel}>
          <Caja>
            <TextInput
              value={draft.contact}
              onChangeText={field('contact')}
              placeholder={ES.providers.fields.contactHint}
              placeholderTextColor={PALETTE.tintaApagada}
              // ⚠️ `words` HERE AND `sentences` ABOVE: this box holds a PERSON's
              // name, where every word is capitalised, and the one above holds a
              // business's, where they are not.
              autoCapitalize="words"
              autoCorrect={false}
              editable={!working}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel={ES.providers.fields.contactLabel}
              style={{
                flex: 1,
                minHeight: scale.tapTarget,
                fontSize: scale.bodySize,
                color: PALETTE.tinta,
              }}
            />
          </Caja>
          <Nota line={ES.providers.fields.optional} />
        </Campo>

        <Campo label={ES.providers.fields.phoneLabel}>
          <Caja>
            <TextInput
              value={draft.phone}
              onChangeText={field('phone')}
              placeholder={ES.providers.fields.phoneHint}
              placeholderTextColor={PALETTE.tintaApagada}
              // ⚠️⚠️ `phone-pad` AND NOT `number-pad`, AND THE COLUMN IS `text`
              // RATHER THAN A NUMBER FOR THE SAME REASON: a Mexican number is
              // written with spaces and sometimes a `+52`, and `number-pad` has
              // neither. ⚠️ NOTHING PARSES OR REFORMATS IT — this app stores what
              // she wrote, because a directory's job is to be dialled by a person
              // and a reformatter that guessed wrong would make it undiallable.
              keyboardType="phone-pad"
              editable={!working}
              // ⚠️ `phone-pad` DRAWS NO RETURN KEY ON iOS, which is what
              // `TecladoListo` is for — `returnKeyType` here would be ignored.
              inputAccessoryViewID={PAD_ID}
              accessibilityLabel={ES.providers.fields.phoneLabel}
              style={{
                flex: 1,
                minHeight: scale.tapTarget,
                fontSize: scale.bodySize,
                color: PALETTE.tinta,
              }}
            />
          </Caja>
          <Nota line={ES.providers.fields.optional} />
        </Campo>

        <Campo label={ES.providers.fields.addressLabel}>
          <Caja>
            <TextInput
              value={draft.address}
              onChangeText={field('address')}
              placeholder={ES.providers.fields.addressHint}
              placeholderTextColor={PALETTE.tintaApagada}
              autoCapitalize="sentences"
              autoCorrect={false}
              editable={!working}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel={ES.providers.fields.addressLabel}
              style={{
                flex: 1,
                minHeight: scale.tapTarget,
                fontSize: scale.bodySize,
                color: PALETTE.tinta,
              }}
            />
          </Caja>
          <Nota line={ES.providers.fields.optional} />
        </Campo>

        {/* ⚠️ ONE PLACE FOR BOTH KINDS OF REFUSAL — the form's own and the
            database's, `producto/[id].tsx`'s arrangement. Two slots would let the
            screen show two contradictory reasons at once, and the second is
            always the stale one. */}
        {(issue !== null || failure !== null) && (
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.error }}>
            {issue !== null ? issueLine(issue) : failure}
          </Text>
        )}

        <Guardar
          label={working ? ES.providers.create.working : ES.providers.create.submit}
          busy={working}
          onPress={() => void submit()}
        />
      </ScrollView>

      {/* ⚠️ MOUNTED ONCE AND OUTSIDE THE SCROLL VIEW — `producto/nuevo.tsx`'s call:
          `InputAccessoryView` renders into the keyboard rather than into the
          layout, so where it sits in the tree does not matter. ONE box shares it
          here, the phone. */}
      <TecladoListo padId={PAD_ID} label={ES.providers.create.done} />
    </View>
  );
}

/**
 * The id tying the phone pad to its accessory bar.
 *
 * ⚠️ A CONSTANT AND NOT A LITERAL AT TWO CALL SITES, for `PRICE_PAD_ID`'s recorded
 * reason: `InputAccessoryView` matches an input to a bar by STRING EQUALITY, so
 * two spellings is a bar that renders and never appears.
 */
const PAD_ID = 'wera.provider.new.pad';

/** The room's name and the way out. ⚠️ *Cancelar*, not *Volver*: this screen holds
 *  typing that will be thrown away. */
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
        {ES.providers.create.title}
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
          {ES.providers.create.cancel}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * A labelled field.
 *
 * ⚠️ IT IS THE THIRD `Campo` IN THIS APP AND IT IS **NOT** IN `src/ui/` — `R14`
 * being obeyed rather than a duplicate left lying. `producto/nuevo.tsx` and
 * `producto/[id].tsx` have the other two, and `5h.5`'s rule is that the difference
 * between the copies becomes a PROP while the difference nobody decided becomes a
 * DECISION. These three are byte-identical today, which makes this one extractable
 * — and `5h.5` also left three shapes un-extracted ON PURPOSE with their counts on
 * the page, because each decides what a shopkeeper sees on several screens at once.
 * **THREE drawings, three files, identical markup**: named here with its count so
 * the next `src/ui/` row can settle it rather than re-measure it.
 */
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

/** The box a value is typed into. One border, one ground, one row. ⚠️ `Campo`'s
 *  count applies to this too: THREE drawings, three files, identical markup. */
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

/** The filled button. ⚠️ A tick and a word, never a glyph alone (C12.1). ⚠️ It is
 *  one of the NINE drawings `5h.5` left un-extracted on purpose — see that row. */
function Guardar({
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

import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Keyboard, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shownAmount } from '@/api/documents';
import {
  useCatalog,
  useEditProvider,
  useMyRole,
  useProviderDetail,
  useProviders,
  useSupplierHeads,
  useSupplierLines,
  useUnitFactors,
} from '@/api/hooks';
import {
  activityOf,
  agoWords,
  broughtOf,
  callUrl,
  chatUrl,
  monthFigure,
  supplierPageLine,
  type Brought,
} from '@/api/providerPage';
import {
  canRetire,
  canWriteProviders,
  checkProvider,
  draftOf,
  issueLine,
  providerPatch,
  providerWriteErrorMessage,
  retirePatch,
  type ProviderDetail,
  type ProviderDraft,
  type ProviderIssue,
} from '@/api/providerDirectory';
import { useBackStaysHere } from '@/navigation/salida';
import { useOnline } from '@/offline/useOnline';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { TITULO } from '@/theme/letra';
import { Boton } from '@/ui/Boton';
import { BotonLleno } from '@/ui/BotonLleno';
import { Formulario } from '@/ui/Formulario';
import { Frase } from '@/ui/Frase';
import { TecladoListo } from '@/ui/TecladoListo';
import { Pregunta } from '@/ui/Pregunta';
import { Velo } from '@/ui/Velo';

// ============================================================================
// ONE SUPPLIER — WHAT WE KNOW ABOUT HER, AND THE TWO THINGS THAT CHANGE IT.
// Plan task `6b`, reached by tapping a row on Proveedores.
//
// ⚠️⚠️ SINCE `8g` (2026-10-20, his option A) IT OPENS ON HER PAGE (`Ficha`):
// *Llamar*, *WhatsApp* and *Editar* in one row, this month's deliveries, and what
// she brings with the last price and its move — figures from `@/api/providerPage`.
// The form below is now a MODE behind *Editar*, not the screen; what follows
// describes that form and still holds for it.
//
// ⚠️⚠️ THIS SCREEN EXISTS FOR A CASHIER TOO, WHICH IS WHERE IT PARTS COMPANY WITH
// `producto/[id].tsx`. That one is a FORM and `canWriteCatalog` keeps her off it
// entirely; this one is the only place in the app a supplier's PHONE NUMBER is
// written down, and `provider_select` in `0002` admits every member of the shop.
// The predicate follows the applied policy and never leads it — `canReadMemory`'s
// own rule, and the direction the owner has been moving in (`0040`, 2026-09-25:
// *"Empleada should be able to see the both the purchase records and the
// prices"*).
//
// ⚠️⚠️ SO FOR HER IT IS A PAGE AND NOT A FORM, AND THE DIFFERENCE IS DRAWN RATHER
// THAN DISCOVERED. `provider_update` is `has_role(…, 'manager')`, and on an UPDATE
// a cashier is not REFUSED — she is INVISIBLE: the `using` clause hides the row,
// PostgREST answers **200 with `[]`**, and only `.select().single()` turns that
// into something an app can act on ([[rls-update-refusal-is-a-200]]). A form that
// looked editable and silently saved nothing is the worst of the three states, so
// `canWriteProviders` draws boxes for a manager and plain lines for her.
//
// ⚠️⚠️ AND THE CONTACT DETAILS REACHING HER PHONE IS A DECISION TAKEN ON THE
// OWNER'S BEHALF, and ✅ RULED 2026-09-28 — it stands. RLS already grants it; what this
// screen decides is whether the app exercises the grant. Reversing it is one
// predicate here — no migration, no data.
//
// ⚠️⚠️ THERE IS NO *Eliminar* AND THERE CANNOT BE ONE. `0002` gives `provider` no
// DELETE policy at all, and `provider_protect_generic` additionally raises
// `restrict_violation` on the generic row. The control says *Quitar proveedor* and
// it is `is_active` false — `producto/[id]`'s treatment of the identical absence —
// and `ES.providers.edit.retireOnce` says the two halves separately: she leaves the
// delivery picker, and every purchase already recorded against her stays.
//
// ⚠️⚠️ IT IS ONE-WAY AND THERE IS NO *Reactivar*, WHICH IS THE OWNER'S RULING OF
// 2026-09-23 APPLIED RATHER THAN A GAP — *a retired product leaves the catalog and
// stays in the transactions and the history*, and he asked for no way back.
// **Whether a SUPPLIER deserves the same answer is a real question and it is
// parked**: a seasonal supplier is a thing a shop stops and restarts. Reversing it
// costs a control and one filter, not a migration.
//
// ⚠️ IT GETS A CONFIRMATION AND `Guardar cambios` DOES NOT — `producto/[id]`'s
// rule: a rename is re-typed in two taps, and a supplier removed by a mis-tap
// looks exactly like a deletion to the person who made it.
//
// ⚠️⚠️ THE GENERIC ROW IS THE ONE THIS SCREEN MUST NOT LET GO, AND THE DATABASE
// WILL NOT STOP IT. `provider_protect_generic` refuses a DELETE and a demotion and
// **stops there** — nothing prevents `is_active` false. `canRetire` is the whole
// fence, and `docs/checks/6b-provider-directory-contract.sh` measures that the
// database really would have allowed it, because a fence that exists only in a
// client is a fence worth having written down. ⚠️ Its NAME is still editable: a
// shop may well prefer *Mercado* to *Genérico*, and `0039` seeding a word is not
// the same as the word being ours.
//
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, §2.11. Whether a
// read-only page and an editable form should look as similar as these two do;
// whether *Quitar proveedor* under four boxes is too close to *Guardar cambios*
// for a thumb; whether the generic row's page explains what it is without saying
// so twice. **The instrument is the owner's phone**, and those questions are in
// this task's row in `docs/PLAN.md`.
// ============================================================================

export default function Proveedor() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useMyRole();
  const mayWrite = canWriteProviders(role);
  const { loading, provider, failed } = useProviderDetail(id ?? null);
  // ⚠️ THE LIST IS READ SO `checkProvider` CAN REFUSE A RENAME ONTO A SUPPLIER THE
  // SHOP ALREADY HAS, before the round trip. Same `PROVIDERS_KEY` the directory
  // drew from, so arriving here costs nothing.
  const { providers } = useProviders(null);
  const { save, busy } = useEditProvider(id ?? null);
  // ⚠️ `8g` (2026-10-20): the page opens on the supplier — her month, what she
  // brings — and the form is behind *Editar*, the owner's *"make Editar more
  // accesible"*: one tap from the top of the page, beside *Llamar*.
  const [editing, setEditing] = useState(false);
  // ⚠️ `8g`'s review (2026-10-20): back in *Editar* — Android's button, the
  // iPhone's swipe or *Cancelar* — returns to her page, and asks first when
  // something was typed. It used to close the supplier and drop the typing.
  const [leaving, setLeaving] = useState(false);
  const backToPage = () => {
    Keyboard.dismiss();
    setTyped(null);
    setIssue(null);
    setFailure(null);
    setLeaving(false);
    setEditing(false);
  };
  const askOrBack = () => (typed !== null ? setLeaving(true) : backToPage());
  useBackStaysHere(editing, askOrBack);
  const { heads, reversals, today } = useSupplierHeads();
  const { lines } = useSupplierLines(id ?? null);
  const { entries } = useCatalog();
  const factors = useUnitFactors();
  const activity = id === undefined ? undefined : activityOf(heads, reversals, today).get(id);
  const brought = broughtOf(lines, entries, factors);
  // ⚠️ `8g`'s round 3: with no signal, a read that never arrived says *Se ve
  // cuando haya señal* — never *Cargando proveedores…* for ever, nor *Nada este
  // mes* about a supplier who came this week (`@/api/providerPage`).
  const online = useOnline();
  const month = monthFigure(heads !== null && reversals !== null, activity, online, shownAmount);

  // ⚠️⚠️ `null` MEANS *SHE HAS NOT TYPED*, AND IT IS WHAT LETS THE BOXES BE SEEDED
  // BY A READ THAT HAS NOT LANDED YET. `useState(draftOf(provider))` would stick at
  // the empty form for ever on a cold open, and an effect that pushed the values
  // back in would undo her editing on the next render — the trap
  // `producto/[id].tsx` records, in the shape where all four boxes have it.
  const [typed, setTyped] = useState<ProviderDraft | null>(null);
  const draft: ProviderDraft =
    typed ?? (provider === null ? { name: '', contact: '', phone: '', address: '' } : draftOf(provider));

  const [issue, setIssue] = useState<ProviderIssue | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // ⚠️ THE CONFIRMATION IS A BOOLEAN AND NOT A `Retiring` OBJECT, because there is
  // exactly one thing on this screen to confirm. `documentos.tsx` carries a shape
  // because its box asks about one of two acts on one of two lists.
  const [asking, setAsking] = useState(false);

  const working = saving || busy;

  function field(key: keyof ProviderDraft) {
    return (text: string) => setTyped((held) => ({ ...(held ?? draft), [key]: text }));
  }

  async function submit() {
    if (provider === null) return;
    const problem = checkProvider(draft, providers, provider.id);
    setIssue(problem);
    setFailure(null);
    if (problem !== null) return;

    const patch = providerPatch(provider, draft);
    // ⚠️⚠️ A SAVE THAT CHANGES NOTHING MAKES NO ROUND TRIP AND SAYS SO RATHER THAN
    // LEAVING. `producto/[id]` pops back silently on the same gesture — that is
    // right there, because the change is visible on the screen behind it. Here
    // there is nothing behind but a list of names, so a silent pop would be
    // indistinguishable from a save that failed. ⚠️ `providerPatch` is what decides
    // *nothing moved* (`R3`), and an empty `{}` PATCH would still bump `updated_at`
    // through `provider_set_updated_at` — a write recorded against a shopkeeper who
    // changed her mind.
    if (patch === null) {
      setFailure(ES.providers.edit.nothing);
      return;
    }

    setSaving(true);
    try {
      await save(patch);
    } catch (thrown) {
      setSaving(false);
      setFailure(providerWriteErrorMessage(thrown));
      return;
    }
    setSaving(false);
    // ⚠️ THE KEYBOARD GOES BEFORE THE SCREEN DOES — the ruling of 2026-09-23 and
    // its measured cause.
    Keyboard.dismiss();
    // ⚠️ `8g`: BACK TO HER PAGE, which now shows what was saved — the form was a
    // mode of it, not a screen of its own. `useEditProvider` invalidated the read.
    setTyped(null);
    setEditing(false);
  }

  async function retire() {
    if (provider === null) return;
    setFailure(null);
    setSaving(true);
    try {
      await save(retirePatch());
    } catch (thrown) {
      setSaving(false);
      setFailure(providerWriteErrorMessage(thrown));
      return;
    }
    setSaving(false);
    setAsking(false);
    Keyboard.dismiss();
    // ⚠️ THE SUPPLIER IS GONE FROM THE LIST THIS RETURNS TO, because
    // `providersFrom` drops `is_active` false — which is the confirmation, and it is
    // the same one retiring a product gives. ⚠️ `dismissTo` AND NOT `back()`
    // since `8g`'s review: *Quitar* is pressed inside *Editar*, where a back is
    // held to return to her page (`useBackStaysHere`); a `POP_TO` passes.
    router.dismissTo('/proveedores');
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda
        title={editing ? ES.providers.edit.title : (provider?.name ?? '')}
        subtitle={editing ? (provider?.name ?? '') : ''}
        back={editing ? ES.providers.edit.cancel : ES.providers.back}
        onBack={editing ? askOrBack : () => router.back()}
      />

      <Formulario
        contentContainerStyle={{
          padding: scale.space,
          gap: scale.space,
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {provider === null ? (
          // ⚠️⚠️ THREE FACTS AND ONE LINE, AND THE ORDER MATTERS — and since `8g`'s
          // round 3 a fourth ahead of them, no signal. `supplierPageLine` holds the
          // order and says why.
          <Aviso line={supplierPageLine(loading, failed, online)} />
        ) : !editing ? (
          <Ficha
            provider={provider}
            mayWrite={mayWrite}
            onEdit={() => setEditing(true)}
            month={month}
            deliveries={activity?.monthDeliveries ?? 0}
            lastDay={activity?.lastDay ?? null}
            today={today}
            brought={brought}
          />
        ) : (
          <>
            {/* ⚠️ THE ONE LINE THE GENERIC ROW GETS, AND IT IS THE SAME SENTENCE THE
                LIST DRAWS UNDER IT — `ES.providers.genericNote`, spelled once
                (`R4`). A shop that arrived here wondering what that row is for
                should get the same answer in both places.
                ⚠️⚠️ AND THE ROW'S SEEDED NAME IS DELIBERATELY NOT QUOTED IN THIS
                COMMENT: the conventions gate recognises Spanish by an accented
                character inside a quoted string, `code()` strips only lines that
                OPEN with a comment marker, and a JSX comment quoting the word turns
                `R4` red ([[jsx-comments-are-code-to-the-gate]]). The header above
                names it, on a line that starts with `//`. */}
            {provider.isGeneric ? <Nota line={ES.providers.genericNote} /> : null}

            <Dato
              label={ES.providers.fields.nameLabel}
              value={draft.name}
              hint={ES.providers.fields.nameHint}
              onChange={field('name')}
              editable={mayWrite && !working}
              mayWrite={mayWrite}
              autoCapitalize="sentences"
            />
            <Dato
              label={ES.providers.fields.contactLabel}
              value={draft.contact}
              hint={ES.providers.fields.contactHint}
              onChange={field('contact')}
              editable={mayWrite && !working}
              mayWrite={mayWrite}
              autoCapitalize="words"
              optional
            />
            <Dato
              label={ES.providers.fields.phoneLabel}
              value={draft.phone}
              hint={ES.providers.fields.phoneHint}
              onChange={field('phone')}
              editable={mayWrite && !working}
              mayWrite={mayWrite}
              // ⚠️ `phone-pad` DRAWS NO RETURN KEY ON iOS, which is what
              // `TecladoListo` below is for.
              pad={PAD_ID}
              optional
            />
            <Dato
              label={ES.providers.fields.addressLabel}
              value={draft.address}
              hint={ES.providers.fields.addressHint}
              onChange={field('address')}
              editable={mayWrite && !working}
              mayWrite={mayWrite}
              autoCapitalize="sentences"
              optional
            />

            {/* ⚠️ ONE PLACE FOR BOTH KINDS OF REFUSAL AND FOR *nothing changed*,
                which is not a refusal at all — `producto/[id]`'s single slot, and
                the reason is that two slots let the screen show two contradictory
                reasons at once. */}
            {(issue !== null || failure !== null) && (
              <Text
                style={{
                  fontSize: scale.bodySize,
                  // ⚠️ *No cambiaste nada* IS NOT AN ERROR AND IS NOT DRAWN AS ONE.
                  // `PALETTE.error` on a sentence that describes a legitimate
                  // gesture teaches a shopkeeper to fear a control that works.
                  color:
                    failure === ES.providers.edit.nothing
                      ? PALETTE.tintaApagada
                      : PALETTE.error,
                }}
              >
                {issue !== null ? issueLine(issue) : failure}
              </Text>
            )}

            {/* ⚠️⚠️ BOTH CONTROLS ARE ABSENT FOR A CASHIER RATHER THAN DISABLED —
                `catalogRows`' argument and [[shift-cover-is-a-reassignment]]'s
                shape: plainly absent beats looking live and refusing silently, and
                an RLS UPDATE refusal here IS silent. */}
            {mayWrite ? (
              <Guardar
                label={working ? ES.providers.edit.working : ES.providers.edit.submit}
                busy={working}
                onPress={() => void submit()}
              />
            ) : null}

            {/* ⚠️ THREE REASONS THIS CONTROL CAN BE MISSING, KEPT AS THREE THINGS IN
                `canRetire`: she may not write, this is the generic row, or the
                supplier is already retired. */}
            {canRetire(provider, mayWrite) ? (
              <Boton
                label={ES.providers.edit.retire}
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
      </Formulario>

      <Pregunta
        shown={leaving}
        title={ES.leave.unsaved.title}
        body={ES.leave.unsaved.body}
        keep={ES.leave.unsaved.keep}
        go={ES.leave.unsaved.go}
        onKeep={() => setLeaving(false)}
        onGo={backToPage}
      />

      <Confirmacion
        asking={asking}
        working={working}
        failed={failure}
        onConfirm={() => void retire()}
        onCancel={() => setAsking(false)}
      />

      {/* ⚠️ MOUNTED ONCE AND OUTSIDE THE SCROLL VIEW — `producto/[id]`'s call. ONE
          box shares it here, the phone. */}
      <TecladoListo padId={PAD_ID} label={ES.providers.edit.done} />
    </View>
  );
}

/**
 * HER PAGE — who she is, the three things to do, this month, and what she brings.
 * ⚠️ NO SENTENCE EXPLAINS ANY OF IT, the owner's ruling of 2026-10-20 (*"better
 * for things to be intuitive"*). ⚠️ *Editar* is a button of the first row, and
 * absent — never disabled — for a cashier, the form's own fence.
 */
function Ficha({
  provider,
  mayWrite,
  onEdit,
  month,
  deliveries,
  lastDay,
  today,
  brought,
}: {
  provider: ProviderDetail;
  mayWrite: boolean;
  onEdit: () => void;
  /** *Este mes*'s figure, already words — `monthFigure`'s answer. */
  month: string;
  deliveries: number;
  lastDay: string | null;
  today: string;
  brought: readonly Brought[] | null;
}) {
  const { scale } = useDensity();
  const call = callUrl(provider.phone);
  const chat = chatUrl(provider.phone);
  const who = [provider.contact, provider.phone].filter((x) => x !== '').join(' · ');
  return (
    <>
      {provider.isGeneric ? <Nota line={ES.providers.genericNote} /> : null}
      {who === '' && provider.address === '' ? null : (
        <View style={{ gap: scale.rowGap / 4 }}>
          {who === '' ? null : <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta }}>{who}</Text>}
          {provider.address === '' ? null : (
            <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{provider.address}</Text>
          )}
        </View>
      )}
      {call === null && chat === null && !mayWrite ? null : (
        <View style={{ flexDirection: 'row', gap: scale.rowGap }}>
          {call === null ? null : (
            <Boton label={ES.providers.page.call} tone={PALETTE.accion} lleno inRow onPress={() => void Linking.openURL(call)} />
          )}
          {chat === null ? null : (
            <Boton label={ES.providers.page.chat} tone={PALETTE.accion} inRow onPress={() => void Linking.openURL(chat)} />
          )}
          {mayWrite ? <Boton label={ES.providers.page.edit} tone={PALETTE.accion} inRow onPress={onEdit} /> : null}
        </View>
      )}
      <View
        style={{
          backgroundColor: PALETTE.compraSuave,
          borderRadius: scale.space * 0.875,
          padding: scale.space,
          gap: scale.rowGap / 2,
        }}
      >
        <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.compra, textTransform: 'uppercase', letterSpacing: scale.rowGap / 8 }}>
          {ES.providers.page.month}
        </Text>
        <Text style={{ fontSize: scale.titleSize * 1.2, ...TITULO, color: PALETTE.tinta }}>
          {month}
        </Text>
        {lastDay === null ? null : (
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.compra }}>
            {deliveries === 0
              ? ES.providers.page.lastVisit(agoWords(lastDay, today))
              : ES.providers.page.monthLine(deliveries, agoWords(lastDay, today))}
          </Text>
        )}
      </View>
      {brought === null || brought.length === 0 ? null : (
        <View
          style={{
            backgroundColor: PALETTE.superficie,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            borderRadius: scale.space * 0.875,
            paddingHorizontal: scale.space,
            paddingTop: scale.space,
          }}
        >
          <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.tintaApagada, textTransform: 'uppercase', letterSpacing: scale.rowGap / 8 }}>
            {ES.providers.page.brought}
          </Text>
          {brought.map((one, i) => (
            <Pressable
              key={one.variantId}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/costos/[id]', params: { id: one.variantId } })}
              style={{
                minHeight: scale.rowHeight,
                flexDirection: 'row',
                alignItems: 'center',
                gap: scale.rowGap,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: PALETTE.linea,
              }}
            >
              <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
                <Text numberOfLines={1} style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
                  {one.name}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
                  {ES.providers.page.broughtLast(shownAmount(one.last), ES.numbers.descubre.perUnit(one.priceUnit))}
                </Text>
              </View>
              {one.change === null ? null : (
                <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
                  {ES.providers.page.change(one.change, shownAmount(Math.abs(one.change)))}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

/** The id tying the phone pad to its accessory bar. ⚠️ Matched by STRING
 *  EQUALITY, so two spellings is a bar that renders and never appears. */
const PAD_ID = 'wera.provider.edit.pad';

/**
 * The room's name, the supplier under it, and the way out.
 *
 * ⚠️ SINCE `8g` (2026-10-20) THE WORD FOLLOWS THE MODE, NOT THE ROLE: her page
 * says *Volver* to everyone, and the form behind *Editar* says *Cancelar*, which
 * returns to her page. What follows is the earlier argument, kept for its reason.
 *
 * ⚠️⚠️ THE WORD ON THE WAY OUT DEPENDED ON THE ROLE, AND THAT WAS THE ONE PLACE THE
 * FENCE CHANGED A WORD RATHER THAN HIDING A CONTROL. *Cancelar* is what you say to
 * typing that will be thrown away; a cashier has nothing to throw away, so for her
 * it is *Volver* — the word the directory itself uses. A screen that told her to
 * cancel something she could not do would be describing a form she never had.
 *
 * ⚠️ THE TITLE IS `edit.title` FOR BOTH, WHICH IS LESS TIDY AND IS DELIBERATE: a
 * separate *Proveedor* heading for her would be a second spelling of one room, and
 * the reason she is here at all is the same reason a manager is.
 */
function Banda({
  title,
  subtitle,
  back,
  onBack,
}: {
  title: string;
  subtitle: string;
  back: string;
  onBack: () => void;
}) {
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
          {title}
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
        onPress={onBack}
        style={{
          minHeight: scale.tapTarget,
          minWidth: scale.tapTarget,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
          {back}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * One thing we know about this supplier — a BOX for a manager, a LINE for
 * everybody else.
 *
 * ⚠️⚠️ ONE COMPONENT AND NOT TWO, WHICH IS THE WHOLE POINT. Two components would
 * be two answers to *which four things does this screen show, and in what order* —
 * and the day somebody adds a fifth column, one of the two would not get it. The
 * role picks the markup INSIDE one list of four.
 *
 * ⚠️ AN EMPTY VALUE READS AS `ES.providers.fields.blank` AND NEVER AS A GAP. C3.12's
 * dash pointed at a contact instead of a price: *nothing here* and *not loaded yet*
 * must look different, and this component is only rendered once the read has
 * landed, so the dash can safely mean the first.
 *
 * ⚠️ *Opcional* IS DRAWN ONLY WHERE THE BOX IS. It is an instruction to somebody
 * about to type, and a page that cannot be typed into does not need permission not
 * to.
 */
function Dato({
  label,
  value,
  hint,
  onChange,
  editable,
  mayWrite,
  autoCapitalize = 'none',
  pad,
  optional = false,
}: {
  label: string;
  value: string;
  hint: string;
  onChange: (text: string) => void;
  editable: boolean;
  mayWrite: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  pad?: string;
  optional?: boolean;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap / 2 }}>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tintaApagada }}>
        {label}
      </Text>

      {mayWrite ? (
        <>
          <Caja>
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder={hint}
              placeholderTextColor={PALETTE.tintaApagada}
              autoCapitalize={autoCapitalize}
              autoCorrect={false}
              editable={editable}
              keyboardType={pad === undefined ? 'default' : 'phone-pad'}
              inputAccessoryViewID={pad}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel={label}
              style={{
                flex: 1,
                minHeight: scale.tapTarget,
                fontSize: scale.bodySize,
                color: PALETTE.tinta,
              }}
            />
          </Caja>
          {optional ? <Nota line={ES.providers.fields.optional} /> : null}
        </>
      ) : (
        <Text
          accessibilityLabel={`${label}. ${value === '' ? ES.providers.fields.blank : value}`}
          style={{
            fontSize: scale.bodySize,
            minHeight: scale.tapTarget,
            // ⚠️ THE DASH IS QUIET INK AND THE VALUE IS NOT, so a supplier with no
            // phone number does not read as a phone number that failed to load.
            color: value === '' ? PALETTE.tintaApagada : PALETTE.tinta,
          }}
        >
          {value === '' ? ES.providers.fields.blank : value}
        </Text>
      )}
    </View>
  );
}

/** The box a value is typed into. ⚠️ `nuevo.tsx`'s `Caja` — FOUR drawings across
 *  four files now, identical markup, and still not in `src/ui/` for `R16`'s
 *  reason: see that file's `Campo`. */
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

/** A quiet line — never a refusal, which is `PALETTE.error`. */
function Nota({ line }: { line: string }) {
  const { scale } = useDensity();
  return <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>{line}</Text>;
}

/** The read is not here yet, could not be asked, or no longer holds this. */
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

/** The filled button. ⚠️ A tick and a word, never a glyph alone (C12.1). */
function Guardar(props: { label: string; onPress: () => void; busy?: boolean }) {
  return <BotonLleno icon="check" {...props} />;
}

/**
 * *¿Quitar este proveedor?* — the one thing on this screen that is confirmed.
 *
 * ⚠️ `documentos.tsx`'s `Confirmacion`, with the two-act question collapsed to one:
 * this box asks about a single act on a single row, so it takes a boolean where
 * that one takes a shape. ⚠️ It has ONE caller and stays in its route, which is
 * `R14`'s corollary — `5h.5` left the same component where it was for the same
 * reason.
 *
 * ⚠️⚠️ TWO SENTENCES AND NOT ONE, BECAUSE *se quitará* ALONE IS THE SENTENCE A
 * SHOPKEEPER READS AS *my purchase history is gone*. `retireAsk` is the question
 * and `retireOnce` is the two halves — what goes, and what stays — said separately.
 *
 * ⚠️ THE FAILURE REPLACES THE QUESTION RATHER THAN SITTING UNDER IT, so the box is
 * never asking and refusing at the same time. `documentos.tsx` made the same trade.
 */
function Confirmacion({
  asking,
  working,
  failed,
  onConfirm,
  onCancel,
}: {
  asking: boolean;
  working: boolean;
  failed: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { scale } = useDensity();
  if (!asking) return null;

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Velo />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: scale.space * 2,
        }}
      >
        <View
          style={{
            width: '100%',
            borderRadius: scale.space,
            backgroundColor: PALETTE.fondo,
            padding: scale.space * 1.5,
            gap: scale.space,
          }}
        >
          {working ? (
            <>
              <ActivityIndicator color={PALETTE.accion} />
              <Frase text={ES.providers.edit.retireWorking} />
            </>
          ) : failed !== null ? (
            <>
              <Frase text={failed} />
              <Boton
                label={ES.providers.edit.retireKeep}
                tone={PALETTE.accion}
                onPress={onCancel}
              />
            </>
          ) : (
            <>
              <Frase text={ES.providers.edit.retireAsk} />
              <Frase text={ES.providers.edit.retireOnce} />
              <View style={{ gap: scale.rowGap }}>
                <Boton
                  label={ES.providers.edit.retireConfirm}
                  tone={PALETTE.error}
                  onPress={onConfirm}
                />
                <Boton
                  label={ES.providers.edit.retireKeep}
                  tone={PALETTE.tintaApagada}
                  onPress={onCancel}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
